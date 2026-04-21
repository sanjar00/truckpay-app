// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

// Parse "123 Main St, Chicago, IL 60601, USA" → "Chicago, IL"
function parseCityState(address: string): string {
  if (!address) return '';
  const match = address.match(/([A-Za-z .'\-]+),\s*([A-Z]{2})\b/);
  return match ? `${match[1].trim()}, ${match[2]}` : address;
}

// ─── Legacy single-pair path (unchanged behavior for A→B loads) ─────────────

async function handleSinglePair(
  pickupZip: string,
  deliveryZip: string,
  apiKey: string,
): Promise<Response> {
  // Geocode pickup ZIP
  let pickupGeoData: any;
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${pickupZip}&components=country:US&language=en&key=${apiKey}`,
    );
    pickupGeoData = await r.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to geocode pickup ZIP: ' + String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (pickupGeoData.status !== 'OK' || !pickupGeoData.results?.length) {
    return new Response(JSON.stringify({ error: 'Pickup ZIP not found: ' + (pickupGeoData.status || 'unknown') }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Geocode delivery ZIP
  let deliveryGeoData: any;
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${deliveryZip}&components=country:US&language=en&key=${apiKey}`,
    );
    deliveryGeoData = await r.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to geocode delivery ZIP: ' + String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (deliveryGeoData.status !== 'OK' || !deliveryGeoData.results?.length) {
    return new Response(JSON.stringify({ error: 'Delivery ZIP not found: ' + (deliveryGeoData.status || 'unknown') }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const pickupResult = pickupGeoData.results[0];
  const deliveryResult = deliveryGeoData.results[0];

  const pickupLat = pickupResult.geometry.location.lat;
  const pickupLng = pickupResult.geometry.location.lng;
  const deliveryLat = deliveryResult.geometry.location.lat;
  const deliveryLng = deliveryResult.geometry.location.lng;

  // Extract city and state from pickup
  const pickupComponents = pickupResult.address_components as Array<{ long_name: string; short_name: string; types: string[] }>;
  const pickupCity =
    pickupComponents.find(c => c.types.includes('locality'))?.long_name ||
    pickupComponents.find(c => c.types.includes('sublocality'))?.long_name ||
    '';
  const pickupState = pickupComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';
  const pickupCityState = pickupCity && pickupState ? `${pickupCity}, ${pickupState}` : pickupState || '';

  // Extract city and state from delivery
  const deliveryComponents = deliveryResult.address_components as Array<{ long_name: string; short_name: string; types: string[] }>;
  const deliveryCity =
    deliveryComponents.find(c => c.types.includes('locality'))?.long_name ||
    deliveryComponents.find(c => c.types.includes('sublocality'))?.long_name ||
    '';
  const deliveryState = deliveryComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';
  const deliveryCityState = deliveryCity && deliveryState ? `${deliveryCity}, ${deliveryState}` : deliveryState || '';

  // Get driving distance
  let distanceData: any;
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${deliveryLat},${deliveryLng}&mode=driving&units=imperial&key=${apiKey}`,
    );
    distanceData = await r.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to get distance: ' + String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const element = distanceData.rows?.[0]?.elements?.[0];
  if (element?.status !== 'OK') {
    return new Response(JSON.stringify({ error: 'Could not calculate distance: ' + (element?.status || 'unknown') }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const miles = Math.round(element.distance.value / 1609.344);

  return new Response(JSON.stringify({
    pickupCityState,
    deliveryCityState,
    miles,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── New multi-stop path (Directions API with waypoints, ONE request) ───────

async function handleMultiStop(stops: string[], apiKey: string): Promise<Response> {
  const trimmed = stops.map(s => String(s || '').trim());

  if (trimmed.length < 2) {
    return new Response(JSON.stringify({ error: 'At least 2 stops required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  for (const z of trimmed) {
    if (!/^\d{5}$/.test(z)) {
      return new Response(JSON.stringify({ error: `Invalid ZIP: ${z}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const origin = trimmed[0];
  const destination = trimmed[trimmed.length - 1];
  const waypoints = trimmed.slice(1, -1);

  const params = new URLSearchParams({
    origin,
    destination,
    mode: 'driving',
    language: 'en',
    key: apiKey,
  });
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }

  let directions: any;
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`);
    directions = await r.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to get route: ' + String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (directions.status !== 'OK' || !directions.routes?.length) {
    console.error('Directions API error:', JSON.stringify({ status: directions.status, error_message: directions.error_message }));
    return new Response(
      JSON.stringify({
        error: 'Could not get route: ' + (directions.status || 'unknown'),
        detail: directions.error_message || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const legs = directions.routes[0].legs as Array<{
    distance?: { value: number };
    start_address?: string;
    end_address?: string;
  }>;

  const legMiles = legs.map(leg => Math.round((leg.distance?.value ?? 0) / 1609.344));
  const totalMiles = legMiles.reduce((a, b) => a + b, 0);

  // cityStates for all N stops (origin + waypoints + destination)
  const cityStates: string[] = [];
  cityStates.push(parseCityState(legs[0]?.start_address || ''));
  for (const leg of legs) {
    cityStates.push(parseCityState(leg.end_address || ''));
  }

  // Per-leg detail (miles between each consecutive pair of stops)
  const legDetails = legs.map((leg, i) => {
    const fromZip = i === 0 ? origin : waypoints[i - 1];
    const toZip = i === legs.length - 1 ? destination : waypoints[i];
    return {
      fromZip,
      toZip,
      fromCityState: parseCityState(leg.start_address || ''),
      toCityState: parseCityState(leg.end_address || ''),
      miles: legMiles[i],
    };
  });

  return new Response(
    JSON.stringify({
      totalMiles,
      legs: legDetails,
      cityStates,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ─── Entry point ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // NEW: multi-stop payload { stops: [zip, zip, zip, …] }
    if (Array.isArray(body?.stops)) {
      return await handleMultiStop(body.stops, apiKey);
    }

    // LEGACY: single-pair payload { pickupZip, deliveryZip } — unchanged behavior
    const { pickupZip, deliveryZip } = body || {};
    if (!pickupZip || !deliveryZip) {
      return new Response(JSON.stringify({ error: 'pickupZip and deliveryZip are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return await handleSinglePair(pickupZip, deliveryZip, apiKey);
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
