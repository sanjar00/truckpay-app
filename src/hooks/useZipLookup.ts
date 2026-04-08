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
      const url = `${SUPABASE_URL}/functions/v1/driving-distance`;
      console.log('Calling edge function:', url);
      console.log('With ZIPs:', { pickupZip, deliveryZip });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          pickupZip,
          deliveryZip,
        }),
      });

      console.log('Edge function response status:', res.status);
      const data = await res.json();
      console.log('Edge function response data:', data);

      if (data.error) {
        console.log('Error from edge function:', data.error);
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
    } catch (err) {
      setState(prev => ({ ...prev, loadingDistance: false, pickupError: 'Error looking up ZIPs' }));
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

  return {
    ...state,
    lookupPickupZip,
    lookupDeliveryZip,
    reset,
    preload,
  };
}
