import { format } from 'date-fns';
import type { TablesInsert } from '@/integrations/supabase/types';

// Format a Date as YYYY-MM-DD using LOCAL parts (no timezone shift). IFTA /
// Per Diem parse pickup_date directly, so this must stay local-calendar based.
export const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDate = (d: unknown): Date | undefined =>
  d instanceof Date ? d : d ? new Date(d as string) : undefined;

export interface BuildLoadRowArgs {
  load: any;                    // merged NewLoad (form state + overrides)
  driverPay: number;
  companyDeduction: number;
  headerDetention: number;
  stopOffFees: number;
  intermediateStopCount: number;
  weekStart: Date;
  weekEnd: Date;
}

/**
 * Canonical `load_reports` row, shared by BOTH add-load entry points
 * (the Load Reports page hook and the home / bottom-bar modal) so the two can
 * never drift apart again. Does NOT include `user_id` — callers add it on insert.
 */
export const buildLoadReportRow = (a: BuildLoadRowArgs): Omit<TablesInsert<'load_reports'>, 'user_id'> => {
  const pickupDate = toDate(a.load.pickupDate);
  const deliveryDate = toDate(a.load.deliveryDate);
  return {
    rate: parseFloat(a.load.rate),
    company_deduction: a.companyDeduction,
    driver_pay: a.driverPay,
    location_from: a.load.locationFrom || a.load.pickupCityState || a.load.pickupZip || '',
    location_to: a.load.locationTo || a.load.deliveryCityState || a.load.deliveryZip || '',
    pickup_date: pickupDate ? formatDateForDB(pickupDate) : null,
    delivery_date: deliveryDate ? formatDateForDB(deliveryDate) : null,
    // Loads are filtered by date_added; keep the existing toISOString() behavior.
    date_added: a.weekStart.toISOString().split('T')[0],
    week_period: `${format(a.weekStart, 'MMM dd')} - ${format(a.weekEnd, 'MMM dd, yyyy')}`,
    deadhead_miles: a.load.deadheadMiles ? parseFloat(a.load.deadheadMiles) : null,
    detention_amount: a.headerDetention ? a.headerDetention : null,
    notes: a.load.notes || null,
    pickup_zip: a.load.pickupZip || null,
    delivery_zip: a.load.deliveryZip || null,
    pickup_city_state: a.load.pickupCityState || null,
    delivery_city_state: a.load.deliveryCityState || null,
    estimated_miles: a.load.estimatedMiles ?? null,
    stop_count: 2 + a.intermediateStopCount,
    total_stop_off_fees: a.stopOffFees,
  };
};

/** Canonical `load_stops` rows for a load's intermediate stops (sequence 2..N-1). */
export const buildStopRows = (loadId: string, userId: string, stops: any[]): TablesInsert<'load_stops'>[] =>
  (stops || []).map((s, idx) => ({
    load_id: loadId,
    user_id: userId,
    sequence: idx + 2,
    stop_type: s.stopType,
    zip: s.zip || null,
    city_state: s.cityState || null,
    scheduled_at: s.scheduledAt ? new Date(s.scheduledAt).toISOString() : null,
    detention_amount: s.detentionAmount ? parseFloat(s.detentionAmount) : 0,
    stop_off_fee: s.stopOffFee ? parseFloat(s.stopOffFee) : 0,
    leg_miles: s.legMiles ?? null,
    notes: s.notes || null,
  }));
