import { useState, useCallback, useRef } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface ZipInfo {
  cityState: string;  // e.g. "Chicago, IL"
  lat: number;
  lng: number;
}

interface ZipLookupState {
  pickupInfo: ZipInfo | null;
  deliveryInfo: ZipInfo | null;
  estimatedMiles: number | null;
  loadingPickup: boolean;
  loadingDelivery: boolean;
  loadingDistance: boolean;
  pickupError: string | null;
  deliveryError: string | null;
}

// Cache to avoid duplicate API calls for same zip
const zipCache: Record<string, ZipInfo | null> = {};

async function geocodeZip(zip: string): Promise<ZipInfo | null> {
  const trimmed = zip.trim();
  if (!/^\d{5}$/.test(trimmed)) return null;

  if (trimmed in zipCache) return zipCache[trimmed];

  try {
    console.log('GOOGLE_MAPS_API_KEY:', GOOGLE_MAPS_API_KEY ? 'present' : 'MISSING');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${trimmed}&components=country:US&language=en&key=${GOOGLE_MAPS_API_KEY}`;
    console.log('Geocoding URL:', url);
    const res = await fetch(url);
    const data = await res.json();

    console.log('Geocoding response:', data);
    if (data.status !== 'OK' || !data.results?.length) {
      zipCache[trimmed] = null;
      return null;
    }

    const result = data.results[0];
    const components = result.address_components as Array<{ long_name: string; short_name: string; types: string[] }>;

    const city =
      components.find(c => c.types.includes('locality'))?.long_name ||
      components.find(c => c.types.includes('sublocality'))?.long_name ||
      components.find(c => c.types.includes('administrative_area_level_3'))?.long_name ||
      '';
    const state =
      components.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';

    const cityState = city && state ? `${city}, ${state}` : state || '';
    const { lat, lng } = result.geometry.location;

    const info: ZipInfo = { cityState, lat, lng };
    zipCache[trimmed] = info;
    return info;
  } catch {
    return null;
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function getDrivingMiles(origin: ZipInfo, destination: ZipInfo): Promise<number | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/driving-distance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        originLat: origin.lat,
        originLng: origin.lng,
        destLat: destination.lat,
        destLng: destination.lng,
      }),
    });
    const data = await res.json();
    return data.miles ?? null;
  } catch {
    return null;
  }
}

export function useZipLookup() {
  const [state, setState] = useState<ZipLookupState>({
    pickupInfo: null,
    deliveryInfo: null,
    estimatedMiles: null,
    loadingPickup: false,
    loadingDelivery: false,
    loadingDistance: false,
    pickupError: null,
    deliveryError: null,
  });

  // Refs always hold the latest resolved info — no stale closure issues
  const pickupInfoRef = useRef<ZipInfo | null>(null);
  const deliveryInfoRef = useRef<ZipInfo | null>(null);

  const fetchDistance = useCallback(async (pickup: ZipInfo, delivery: ZipInfo) => {
    setState(prev => ({ ...prev, loadingDistance: true }));
    const miles = await getDrivingMiles(pickup, delivery);
    setState(prev => ({ ...prev, estimatedMiles: miles, loadingDistance: false }));
    return miles;
  }, []);

  const lookupPickupZip = useCallback(async (zip: string) => {
    if (!/^\d{5}$/.test(zip.trim())) {
      setState(prev => ({ ...prev, pickupInfo: null, estimatedMiles: null, pickupError: zip.trim().length > 0 ? 'Enter a valid 5-digit ZIP' : null }));
      pickupInfoRef.current = null;
      return null;
    }
    setState(prev => ({ ...prev, loadingPickup: true, pickupError: null }));
    const info = await geocodeZip(zip);
    if (!info) {
      setState(prev => ({ ...prev, loadingPickup: false, pickupInfo: null, pickupError: 'ZIP not found' }));
      pickupInfoRef.current = null;
      return null;
    }
    pickupInfoRef.current = info;
    setState(prev => ({ ...prev, loadingPickup: false, pickupInfo: info }));
    // Use ref to get latest delivery info — avoids stale closure
    if (deliveryInfoRef.current) {
      await fetchDistance(info, deliveryInfoRef.current);
    }
    return info;
  }, [fetchDistance]);

  const lookupDeliveryZip = useCallback(async (zip: string) => {
    if (!/^\d{5}$/.test(zip.trim())) {
      setState(prev => ({ ...prev, deliveryInfo: null, estimatedMiles: null, deliveryError: zip.trim().length > 0 ? 'Enter a valid 5-digit ZIP' : null }));
      deliveryInfoRef.current = null;
      return null;
    }
    setState(prev => ({ ...prev, loadingDelivery: true, deliveryError: null }));
    const info = await geocodeZip(zip);
    if (!info) {
      setState(prev => ({ ...prev, loadingDelivery: false, deliveryInfo: null, deliveryError: 'ZIP not found' }));
      deliveryInfoRef.current = null;
      return null;
    }
    deliveryInfoRef.current = info;
    setState(prev => ({ ...prev, loadingDelivery: false, deliveryInfo: info }));
    // Use ref to get latest pickup info — avoids stale closure
    if (pickupInfoRef.current) {
      await fetchDistance(pickupInfoRef.current, info);
    }
    return info;
  }, [fetchDistance]);

  const reset = useCallback(() => {
    pickupInfoRef.current = null;
    deliveryInfoRef.current = null;
    setState({
      pickupInfo: null,
      deliveryInfo: null,
      estimatedMiles: null,
      loadingPickup: false,
      loadingDelivery: false,
      loadingDistance: false,
      pickupError: null,
      deliveryError: null,
    });
  }, []);

  // Pre-populate from saved data (when editing an existing load)
  const preload = useCallback((pickupInfo: ZipInfo | null, deliveryInfo: ZipInfo | null, miles: number | null) => {
    pickupInfoRef.current = pickupInfo;
    deliveryInfoRef.current = deliveryInfo;
    setState(prev => ({
      ...prev,
      pickupInfo,
      deliveryInfo,
      estimatedMiles: miles,
    }));
  }, []);

  return {
    ...state,
    lookupPickupZip,
    lookupDeliveryZip,
    reset,
    preload,
  };
}
