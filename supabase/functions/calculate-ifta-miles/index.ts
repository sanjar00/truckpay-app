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

// Reverse geocode a single lat/lng point → US state abbreviation (or null)
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
    // ignore individual failures
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

    // 1. Get the driving route with full polyline
    const directionsRes = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(pickupZip)}&destination=${encodeURIComponent(deliveryZip)}&mode=driving&key=${apiKey}`
    );
    const directions = await directionsRes.json();

    if (directions.status !== 'OK' || !directions.routes?.length) {
      return new Response(
        JSON.stringify({ error: 'Could not get route: ' + (directions.status || 'unknown') }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Decode overview polyline into lat/lng points
    const encoded: string = directions.routes[0].overview_polyline.points;
    const points = decodePolyline(encoded);

    if (points.length < 2) {
      return new Response(JSON.stringify({ error: 'Route polyline too short' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Sample ~40 evenly spaced points (cap at 40 to limit geocoding costs)
    const targetSamples = Math.min(40, points.length);
    const interval = Math.max(1, Math.floor(points.length / targetSamples));
    const sampled: [number, number][] = [];
    for (let i = 0; i < points.length; i += interval) sampled.push(points[i]);
    // Always include the final destination point
    const lastPoint = points[points.length - 1];
    if (sampled[sampled.length - 1] !== lastPoint) sampled.push(lastPoint);

    // 4. Reverse geocode all sampled points concurrently (batched to respect rate limits)
    const batchSize = 10;
    const stateForPoint: (string | null)[] = [];
    for (let i = 0; i < sampled.length; i += batchSize) {
      const batch = sampled.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(([lat, lng]) => getStateForPoint(lat, lng, apiKey))
      );
      stateForPoint.push(...results);
    }

    // 5. Accumulate Haversine distances between consecutive sampled points by state
    const stateMilesMap: Record<string, number> = {};
    for (let i = 0; i < sampled.length - 1; i++) {
      const state = stateForPoint[i];
      if (!state) continue;
      const dist = haversine(sampled[i][0], sampled[i][1], sampled[i + 1][0], sampled[i + 1][1]);
      stateMilesMap[state] = (stateMilesMap[state] || 0) + dist;
    }

    // 6. Build result: filter out sub-1-mile noise, round, sort by most miles
    const stateMiles = Object.entries(stateMilesMap)
      .filter(([, miles]) => miles >= 1)
      .map(([state, miles]) => ({ state, miles: Math.round(miles) }))
      .sort((a, b) => b.miles - a.miles);

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
