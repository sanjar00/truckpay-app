// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decode a Google Maps encoded polyline into lat/lng pairs
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// Haversine distance in miles between two lat/lng points
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Reverse geocode a lat/lng → US state abbreviation (or null)
async function getStateForPoint(lat: number, lng: number, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const data = await res.json();
    for (const result of data.results || []) {
      const comp = result.address_components?.find(
        (c: { types: string[]; short_name: string }) => c.types.includes('administrative_area_level_1')
      );
      if (comp) return comp.short_name;
    }
  } catch {
    // ignore individual point failures — segment will be skipped
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pickupZip, deliveryZip } = await req.json();

    if (!pickupZip || !deliveryZip) {
      return new Response(JSON.stringify({ error: 'pickupZip and deliveryZip are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 1: Get the driving route with full overview polyline ──────────────
    const directionsRes = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(pickupZip)}&destination=${encodeURIComponent(deliveryZip)}&mode=driving&key=${apiKey}`
    );
    const directions = await directionsRes.json();

    if (directions.status !== 'OK' || !directions.routes?.length) {
      // Log the full Google response to Supabase edge function logs for easier debugging
      console.error('Directions API error:', JSON.stringify({ status: directions.status, error_message: directions.error_message }));
      return new Response(
        JSON.stringify({ error: 'Could not get route: ' + (directions.status || 'unknown'), detail: directions.error_message || null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 2: Decode polyline into all lat/lng points ────────────────────────
    const encoded: string = directions.routes[0].overview_polyline.points;
    const points = decodePolyline(encoded);

    if (points.length < 2) {
      return new Response(JSON.stringify({ error: 'Route polyline too short' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 3: Walk all consecutive point pairs and compute cumulative distance.
    //           Sample a point every SAMPLE_INTERVAL miles so that:
    //           - Short routes get enough samples to catch all states
    //           - Long routes are capped at ~50 samples to limit geocoding cost
    //           - Every state that spans ≥10 miles of the route is captured
    // ─────────────────────────────────────────────────────────────────────────────

    // First pass: compute total route distance so we can set the interval
    let totalDist = 0;
    for (let i = 1; i < points.length; i++) {
      totalDist += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    }

    // Dynamic interval: at least 10 miles, at most totalDist/50 (caps at 50 samples)
    const SAMPLE_INTERVAL = Math.max(10, totalDist / 50);

    // Second pass: collect sample points at each interval boundary
    interface Sample { point: [number, number]; cumDist: number }
    const samples: Sample[] = [];
    let cumDist = 0;
    let lastSampleCumDist = 0;
    samples.push({ point: points[0], cumDist: 0 });

    for (let i = 1; i < points.length; i++) {
      cumDist += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
      if (cumDist - lastSampleCumDist >= SAMPLE_INTERVAL) {
        samples.push({ point: points[i], cumDist });
        lastSampleCumDist = cumDist;
      }
    }

    // Always include the destination endpoint
    const lastPoint = points[points.length - 1];
    if (samples[samples.length - 1].point !== lastPoint) {
      samples.push({ point: lastPoint, cumDist: totalDist });
    }

    // ── Step 4: Reverse geocode all sample points concurrently (batched) ───────
    const batchSize = 10;
    const states: (string | null)[] = [];
    for (let i = 0; i < samples.length; i += batchSize) {
      const batch = samples.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(({ point: [lat, lng] }) => getStateForPoint(lat, lng, apiKey))
      );
      states.push(...results);
    }

    // ── Step 5: Accumulate miles per state ─────────────────────────────────────
    //
    //  For each segment [sample i → sample i+1]:
    //    • Same state → full segment distance goes to that state
    //    • Different states → split at midpoint (50/50).
    //      With a ~10–20 mi interval, the max error at any crossing is ~5–10 mi.
    //
    const stateMilesMap: Record<string, number> = {};

    for (let i = 0; i < samples.length - 1; i++) {
      const stateA = states[i];
      const stateB = states[i + 1];
      const segmentDist = samples[i + 1].cumDist - samples[i].cumDist;

      if (!stateA && !stateB) continue; // both unknown — skip

      if (stateA === stateB || !stateB) {
        // Same state, or destination state unknown — whole segment to stateA
        if (stateA) stateMilesMap[stateA] = (stateMilesMap[stateA] || 0) + segmentDist;
      } else if (!stateA) {
        // Origin state unknown — whole segment to stateB
        stateMilesMap[stateB] = (stateMilesMap[stateB] || 0) + segmentDist;
      } else {
        // State boundary crossed — split at midpoint
        const half = segmentDist / 2;
        stateMilesMap[stateA] = (stateMilesMap[stateA] || 0) + half;
        stateMilesMap[stateB] = (stateMilesMap[stateB] || 0) + half;
      }
    }

    // ── Step 6: Build and return result ───────────────────────────────────────
    const stateMiles = Object.entries(stateMilesMap)
      .filter(([, miles]) => miles >= 1)          // drop sub-1-mile noise
      .map(([state, miles]) => ({ state, miles: Math.round(miles) }))
      .sort((a, b) => b.miles - a.miles);          // most miles first

    return new Response(JSON.stringify({ stateMiles }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('calculate-ifta-miles error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
