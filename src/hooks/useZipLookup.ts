import { useState, useCallback, useRef } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface ZipInfo {
  cityState: string;
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

  const pickupZipRef = useRef<string>('');
  const deliveryZipRef = useRef<string>('');

  const callEdgeFunction = useCallback(async (pickupZip: string, deliveryZip: string) => {
    if (!pickupZip || !deliveryZip) return;

    setState(prev => ({ ...prev, loadingDistance: true }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/driving-distance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          pickupZip,
          deliveryZip,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (data.error) {
        setState(prev => ({
          ...prev,
          pickupError: data.error.includes('Pickup') ? data.error : null,
          deliveryError: data.error.includes('Delivery') ? data.error : null,
          loadingDistance: false,
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        pickupInfo: { cityState: data.pickupCityState, lat: 0, lng: 0 },
        deliveryInfo: { cityState: data.deliveryCityState, lat: 0, lng: 0 },
        estimatedMiles: data.miles,
        loadingDistance: false,
        pickupError: null,
        deliveryError: null,
      }));
    } catch (err: any) {
      const errorMsg = err?.name === 'AbortError' ? 'Request timed out' : 'Error looking up ZIPs';
      setState(prev => ({ ...prev, loadingDistance: false, pickupError: errorMsg }));
    }
  }, []);

  const lookupPickupZip = useCallback(async (zip: string) => {
    const trimmed = zip.trim();
    if (!/^\d{5}$/.test(trimmed)) {
      setState(prev => ({
        ...prev,
        pickupInfo: null,
        estimatedMiles: null,
        pickupError: trimmed.length > 0 ? 'Enter a valid 5-digit ZIP' : null,
      }));
      pickupZipRef.current = '';
      return null;
    }

    pickupZipRef.current = trimmed;
    setState(prev => ({ ...prev, loadingPickup: true, pickupError: null }));

    // Call edge function if both zips are now available
    if (deliveryZipRef.current) {
      await callEdgeFunction(trimmed, deliveryZipRef.current);
    }

    setState(prev => ({ ...prev, loadingPickup: false }));
    return { cityState: '', lat: 0, lng: 0 };
  }, [callEdgeFunction]);

  const lookupDeliveryZip = useCallback(async (zip: string) => {
    const trimmed = zip.trim();
    if (!/^\d{5}$/.test(trimmed)) {
      setState(prev => ({
        ...prev,
        deliveryInfo: null,
        estimatedMiles: null,
        deliveryError: trimmed.length > 0 ? 'Enter a valid 5-digit ZIP' : null,
      }));
      deliveryZipRef.current = '';
      return null;
    }

    deliveryZipRef.current = trimmed;
    setState(prev => ({ ...prev, loadingDelivery: true, deliveryError: null }));

    // Call edge function if both zips are now available
    if (pickupZipRef.current) {
      await callEdgeFunction(pickupZipRef.current, trimmed);
    }

    setState(prev => ({ ...prev, loadingDelivery: false }));
    return { cityState: '', lat: 0, lng: 0 };
  }, [callEdgeFunction]);

  const reset = useCallback(() => {
    pickupZipRef.current = '';
    deliveryZipRef.current = '';
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

  const preload = useCallback((pickupInfo: ZipInfo | null, deliveryInfo: ZipInfo | null, miles: number | null) => {
    setState(prev => ({
      ...prev,
      pickupInfo,
      deliveryInfo,
      estimatedMiles: miles,
    }));
  }, []);

  /**
   * Multi-stop lookup. Takes an ordered array of 5-digit ZIP strings
   * (origin, waypoint, waypoint, …, destination) and returns the full
   * route in ONE edge-function request (uses Google Directions API with
   * waypoints under the hood).
   *
   * Does not touch the existing pickup/delivery state — consumers manage
   * their own multi-stop state. Returns null on any failure.
   */
  const resolveStops = useCallback(async (zips: string[]): Promise<{
    totalMiles: number;
    cityStates: string[];
    legs: Array<{ fromZip: string; toZip: string; fromCityState: string; toCityState: string; miles: number }>;
  } | null> => {
    const cleaned = (zips || []).map(z => String(z || '').trim());
    if (cleaned.length < 2) return null;
    for (const z of cleaned) {
      if (!/^\d{5}$/.test(z)) return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/driving-distance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ stops: cleaned }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (data.error || typeof data.totalMiles !== 'number') {
        return null;
      }

      return {
        totalMiles: data.totalMiles,
        cityStates: Array.isArray(data.cityStates) ? data.cityStates : [],
        legs: Array.isArray(data.legs) ? data.legs : [],
      };
    } catch {
      return null;
    }
  }, []);

  return {
    ...state,
    lookupPickupZip,
    lookupDeliveryZip,
    reset,
    preload,
    resolveStops,
  };
}
