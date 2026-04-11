// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Geocode pickup ZIP
    let pickupGeoRes: Response;
    let pickupGeoData: any;
    try {
      pickupGeoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${pickupZip}&components=country:US&language=en&key=${apiKey}`
      );
      pickupGeoData = await pickupGeoRes.json();
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
    let deliveryGeoRes: Response;
    let deliveryGeoData: any;
    try {
      deliveryGeoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${deliveryZip}&components=country:US&language=en&key=${apiKey}`
      );
      deliveryGeoData = await deliveryGeoRes.json();
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
      const distanceRes = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLat},${pickupLng}&destinations=${deliveryLat},${deliveryLng}&mode=driving&units=imperial&key=${apiKey}`
      );
      distanceData = await distanceRes.json();
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
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
