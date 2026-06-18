import { supabase } from '@/integrations/supabase/client';
import { getUserWeekStart } from '@/lib/weeklyPeriodUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Fuel → IFTA routing
//
// When a driver scans a FUEL receipt, we want to drop the fuel purchase into the
// IFTA report of the specific load it belongs to. A load "owns" a fuel stop when
// the receipt date falls inside the load's [pickup_date … delivery_date] window
// AND the fuel was bought in a state the load's route passes through.
//
// Recording is "both" (per product decision):
//   1) a weekly truck deduction (so it lowers take-home like any fuel cost), and
//   2) a mirror entry in load_reports.fuel_purchases (so it shows up in IFTA).
// IFTA fuel_purchases does NOT affect take-home, so this is a mirror, not a
// double count.
// ─────────────────────────────────────────────────────────────────────────────

export interface FuelReceipt {
  state?: string;
  gallons?: string;
  pricePerGallon?: string;
  amount?: string;
  date?: string;        // YYYY-MM-DD
  merchant?: string;
}

export interface CandidateLoad {
  id: string;
  pickupDate: string | null;
  deliveryDate: string | null;
  pickupZip: string | null;
  deliveryZip: string | null;
  pickupCityState: string | null;
  deliveryCityState: string | null;
  locationFrom: string;
  locationTo: string;
  estimatedMiles: number | null;
  statesMiles: any[] | null;
  fuelPurchases: any[] | null;
  stops: { zip: string | null; cityState: string | null; sequence: number }[];
}

export type FuelMatchResult =
  | { status: 'matched'; load: CandidateLoad; candidates: CandidateLoad[] }
  | { status: 'ambiguous'; candidates: CandidateLoad[] }
  | { status: 'none'; candidates: CandidateLoad[] };

// Parse "Chicago, IL" → "IL"
export function extractStateCode(cityState?: string | null): string | null {
  if (!cityState) return null;
  const m = cityState.match(/,\s*([A-Z]{2})\b/);
  return m ? m[1] : null;
}

export function isFuelReceipt(r: { category?: string; gallons?: string; amount?: string }): boolean {
  if ((r.category || '').toUpperCase() !== 'FUEL') return false;
  // Need at least an amount to be worth mirroring into IFTA.
  return !!(r.amount && parseFloat(r.amount) > 0);
}

function normalizeLoad(row: any): CandidateLoad {
  const rawStops = Array.isArray(row.load_stops) ? row.load_stops : [];
  const stops = rawStops
    .map((s: any) => ({ zip: s.zip ?? null, cityState: s.city_state ?? null, sequence: s.sequence ?? 0 }))
    .sort((a: any, b: any) => a.sequence - b.sequence);
  return {
    id: row.id,
    pickupDate: row.pickup_date ?? null,
    deliveryDate: row.delivery_date ?? null,
    pickupZip: row.pickup_zip ?? null,
    deliveryZip: row.delivery_zip ?? null,
    pickupCityState: row.pickup_city_state ?? null,
    deliveryCityState: row.delivery_city_state ?? null,
    locationFrom: row.location_from ?? '',
    locationTo: row.location_to ?? '',
    estimatedMiles: row.estimated_miles ?? null,
    statesMiles: Array.isArray(row.states_miles) ? row.states_miles : null,
    fuelPurchases: Array.isArray(row.fuel_purchases) ? row.fuel_purchases : null,
    stops,
  };
}

const LOAD_COLUMNS =
  'id, pickup_date, delivery_date, pickup_zip, delivery_zip, pickup_city_state, delivery_city_state, location_from, location_to, estimated_miles, states_miles, fuel_purchases, load_stops(zip, city_state, sequence)';

// Loads whose [pickup_date … delivery_date] window contains the receipt date
// (also covers single-day loads where delivery_date is null).
async function fetchLoadsCoveringDate(userId: string, dateStr: string): Promise<CandidateLoad[]> {
  const { data, error } = await supabase
    .from('load_reports')
    .select(LOAD_COLUMNS)
    .eq('user_id', userId)
    .or(
      `and(pickup_date.lte.${dateStr},delivery_date.gte.${dateStr}),and(pickup_date.eq.${dateStr},delivery_date.is.null)`,
    );
  if (error) {
    console.error('fetchLoadsCoveringDate error:', error);
    return [];
  }
  return (data || []).map(normalizeLoad);
}

// Loads near the receipt date (± windowDays on pickup_date) — used to populate
// the manual picker when there's no clean date-range match.
async function fetchNearbyLoads(userId: string, dateStr: string, windowDays = 10): Promise<CandidateLoad[]> {
  const base = new Date(dateStr + 'T00:00:00');
  const min = new Date(base); min.setDate(min.getDate() - windowDays);
  const max = new Date(base); max.setDate(max.getDate() + windowDays);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('load_reports')
    .select(LOAD_COLUMNS)
    .eq('user_id', userId)
    .gte('pickup_date', fmt(min))
    .lte('pickup_date', fmt(max))
    .order('pickup_date', { ascending: false });
  if (error) {
    console.error('fetchNearbyLoads error:', error);
    return [];
  }
  return (data || []).map(normalizeLoad);
}

// The set of US state codes a load's route touches. Uses already-computed IFTA
// state miles and the origin/destination/stop states; when `deep` is set and the
// load has ZIPs, also pulls full pass-through states from the routing edge
// function (catches states only crossed mid-route, e.g. AL on a GA→TX haul).
async function routeStatesForLoad(load: CandidateLoad, deep: boolean): Promise<Set<string>> {
  const states = new Set<string>();
  for (const sm of load.statesMiles || []) {
    if (sm?.state) states.add(String(sm.state).toUpperCase());
  }
  const og = extractStateCode(load.pickupCityState); if (og) states.add(og);
  const de = extractStateCode(load.deliveryCityState); if (de) states.add(de);
  for (const s of load.stops) { const st = extractStateCode(s.cityState); if (st) states.add(st); }

  if (deep && load.pickupZip && load.deliveryZip) {
    try {
      const zips = [load.pickupZip, ...load.stops.map(s => s.zip).filter((z): z is string => !!z), load.deliveryZip];
      const body = zips.length > 2 ? { stops: zips } : { pickupZip: load.pickupZip, deliveryZip: load.deliveryZip };
      const { data } = await supabase.functions.invoke('calculate-ifta-miles', { body });
      for (const sm of data?.stateMiles || []) {
        if (sm?.state) states.add(String(sm.state).toUpperCase());
      }
    } catch (e) {
      // Best-effort — fall back to the endpoint/stop states we already have.
      console.error('routeStatesForLoad deep lookup failed:', e);
    }
  }
  return states;
}

// Decide which load a scanned fuel receipt belongs to.
export async function matchFuelReceipt(userId: string, receipt: FuelReceipt): Promise<FuelMatchResult> {
  const dateStr = receipt.date;
  if (!dateStr) {
    return { status: 'none', candidates: [] };
  }

  const covering = await fetchLoadsCoveringDate(userId, dateStr);

  if (covering.length === 0) {
    const nearby = await fetchNearbyLoads(userId, dateStr);
    return { status: 'none', candidates: nearby };
  }

  if (covering.length === 1) {
    return { status: 'matched', load: covering[0], candidates: covering };
  }

  // Multiple loads on that date — disambiguate by the fuel's state, using full
  // pass-through route states.
  const recState = (receipt.state || '').toUpperCase();
  if (recState) {
    const matched: CandidateLoad[] = [];
    for (const load of covering) {
      const states = await routeStatesForLoad(load, true);
      if (states.has(recState)) matched.push(load);
    }
    if (matched.length === 1) return { status: 'matched', load: matched[0], candidates: covering };
    if (matched.length > 1) return { status: 'ambiguous', candidates: matched };
  }

  return { status: 'ambiguous', candidates: covering };
}

// Append the scanned purchase to a load's IFTA fuel_purchases array.
export async function mirrorFuelIntoLoad(
  userId: string,
  load: CandidateLoad,
  receipt: FuelReceipt,
): Promise<{ error: any }> {
  const entry = {
    state: (receipt.state || '').toUpperCase(),
    gallons: receipt.gallons ? parseFloat(receipt.gallons) : 0,
    pricePerGallon: receipt.pricePerGallon ? parseFloat(receipt.pricePerGallon) : 0,
    amount: receipt.amount ? parseFloat(receipt.amount) : 0,
    date: receipt.date || null,
    source: 'scan',
  };
  const next = [...(load.fuelPurchases || []), entry];
  const { error } = await supabase
    .from('load_reports')
    .update({ fuel_purchases: next as any })
    .eq('id', load.id)
    .eq('user_id', userId);
  return { error };
}

// Record the fuel cost as a weekly truck deduction (so it lowers take-home),
// keyed to the week of the receipt date.
export async function recordFuelWeeklyDeduction(
  userId: string,
  receipt: FuelReceipt,
  userProfile: any,
): Promise<{ error: any }> {
  const receiptDate = receipt.date ? new Date(receipt.date + 'T00:00:00') : new Date();
  const weekStart = getUserWeekStart(receiptDate, userProfile);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const name = receipt.merchant ? `Fuel - ${receipt.merchant}` : 'Fuel';
  const { error } = await supabase.from('weekly_extra_deductions').insert({
    user_id: userId,
    week_start: weekStartStr,
    name,
    amount: receipt.amount ? parseFloat(receipt.amount) : 0,
    date_added: receipt.date ? new Date(receipt.date + 'T00:00:00').toISOString() : new Date().toISOString(),
  });
  return { error };
}

// Convenience: do both sides of the "both" recording for a chosen load.
export async function attachFuelToLoad(
  userId: string,
  load: CandidateLoad,
  receipt: FuelReceipt,
  userProfile: any,
): Promise<{ error: any }> {
  const mirror = await mirrorFuelIntoLoad(userId, load, receipt);
  if (mirror.error) return mirror;
  return recordFuelWeeklyDeduction(userId, receipt, userProfile);
}

export function loadLabel(load: CandidateLoad): string {
  const from = load.locationFrom || load.pickupCityState || load.pickupZip || '?';
  const to = load.locationTo || load.deliveryCityState || load.deliveryZip || '?';
  return `${from} → ${to}`;
}
