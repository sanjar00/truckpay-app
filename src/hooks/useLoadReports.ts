import { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, isWithinInterval, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getUserWeekStart, getUserWeekEnd } from '@/lib/weeklyPeriodUtils';
import { calculateDriverPay, sumStopSideEffects } from '@/lib/loadReportsUtils';
import { Load, LoadStop, NewLoad, NewLoadStop, WeeklyMileage, ExtraDeduction } from '@/types/LoadReports';

// Helper function to format dates without timezone issues
const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useLoadReports = (user: any, userProfile: any, deductions: any[]) => {
  const [currentWeek, setCurrentWeek] = useState(getUserWeekStart(new Date(), userProfile));
  const [allDeductionTypes, setAllDeductionTypes] = useState<string[]>([]);
  const [weeklyDeductions, setWeeklyDeductions] = useState<Record<string, string>>({});
  const [newLoad, setNewLoad] = useState<NewLoad>({
    rate: '',
    companyDeduction: userProfile?.companyDeduction || '',
    locationFrom: '',
    locationTo: '',
    pickupDate: new Date(),
    deliveryDate: new Date(),
    stops: [],
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loads, setLoads] = useState<Load[]>([]);
  const [extraDeductionTypes, setExtraDeductionTypes] = useState<ExtraDeduction[]>([]);
  const [showAddExtraDeduction, setShowAddExtraDeduction] = useState(false);
  const [newExtraDeduction, setNewExtraDeduction] = useState({ name: '', amount: '' });
  const [editingLoad, setEditingLoad] = useState<string | null>(null);
  const [editingDeduction, setEditingDeduction] = useState<string | null>(null);
  const [weeklyMileage, setWeeklyMileage] = useState<WeeklyMileage>({
    startMileage: '',
    endMileage: '',
    totalMiles: 0
  });

  const weekStart = getUserWeekStart(currentWeek, userProfile);
  const weekEnd = getUserWeekEnd(currentWeek, userProfile);

  const fetchAllDeductionTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('deductions')
        .select('type')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const uniqueTypes = [...new Set(data.map(d => d.type))];
      setAllDeductionTypes(uniqueTypes);
    } catch (error) {
      console.error('Error fetching deduction types:', error);
    }
  };

  const fetchLoads = async () => {
    if (!user) return;

    try {
      // Nested select pulls intermediate stops (load_stops) in one round-trip.
      // For single-stop loads, load_stops is simply an empty array.
      const { data, error } = await supabase
        .from('load_reports')
        .select('*, load_stops(*)')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error fetching loads:', error);
        return;
      }

      if (data) {
        const formattedLoads: Load[] = data.map((load: any) => {
          const rawStops: any[] = Array.isArray(load.load_stops) ? load.load_stops : [];
          const stops: LoadStop[] = rawStops
            .slice()
            .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
            .map(s => ({
              id: s.id,
              sequence: s.sequence,
              stopType: s.stop_type,
              zip: s.zip ?? undefined,
              cityState: s.city_state ?? undefined,
              scheduledAt: s.scheduled_at ?? undefined,
              detentionAmount: s.detention_amount ?? 0,
              stopOffFee: s.stop_off_fee ?? 0,
              legMiles: s.leg_miles ?? undefined,
              notes: s.notes ?? undefined,
            }));

          return {
            id: load.id,
            rate: load.rate,
            companyDeduction: load.company_deduction,
            driverPay: load.driver_pay,
            locationFrom: load.location_from,
            locationTo: load.location_to,
            pickupDate: load.pickup_date,
            deliveryDate: load.delivery_date,
            dateAdded: load.date_added,
            weekPeriod: load.week_period,
            deadheadMiles: load.deadhead_miles,
            detentionAmount: load.detention_amount,
            notes: load.notes,
            pickupZip: load.pickup_zip,
            deliveryZip: load.delivery_zip,
            pickupCityState: load.pickup_city_state,
            deliveryCityState: load.delivery_city_state,
            estimatedMiles: load.estimated_miles,
            stopCount: load.stop_count ?? 2,
            totalStopOffFees: load.total_stop_off_fees ?? 0,
            stops,
          };
        });

        setLoads(formattedLoads);
      }
    } catch (error) {
      console.error('Error fetching loads:', error);
    }
  };

  const handleAddLoad = async (overrides: Partial<NewLoad> = {}) => {
    const load = { ...newLoad, ...overrides };
    if (load.rate && load.pickupZip && load.deliveryZip && user) {
      setLoading(true);

      try {
        const pickupDate =
          load.pickupDate instanceof Date
            ? load.pickupDate
            : load.pickupDate
              ? new Date(load.pickupDate as unknown as string)
              : undefined;
        const deliveryDate =
          load.deliveryDate instanceof Date
            ? load.deliveryDate
            : load.deliveryDate
              ? new Date(load.deliveryDate as unknown as string)
              : undefined;

        const parsedCompanyDeduction =
          load.companyDeduction !== ''
            ? parseFloat(load.companyDeduction)
            : parseFloat(String(userProfile?.companyDeduction || 0));
        const companyDeduction = Number.isNaN(parsedCompanyDeduction) ? 0 : parsedCompanyDeduction;

        // Intermediate stops (may be empty for single-stop A→B loads).
        const intermediateStops: NewLoadStop[] = Array.isArray(load.stops) ? load.stops : [];

        // Per-stop detention and stop-off fees roll into the driver pay calculation.
        const stopSideEffects = sumStopSideEffects(intermediateStops);
        const headerDetention = load.detentionAmount ? parseFloat(load.detentionAmount) : 0;
        const totalDetention = (Number.isNaN(headerDetention) ? 0 : headerDetention) + stopSideEffects.detention;

        const driverPay = calculateDriverPay(
          parseFloat(load.rate),
          userProfile,
          load.estimatedMiles,
          totalDetention,
          companyDeduction,
          stopSideEffects.stopOffFees,
        );
        const weekPeriod = `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
        const loadDate = weekStart.toISOString().split('T')[0];
        const stopCount = 2 + intermediateStops.length;
        const payload = {
          rate: parseFloat(load.rate),
          company_deduction: companyDeduction,
          driver_pay: driverPay,
          location_from: load.locationFrom || load.pickupCityState || load.pickupZip || '',
          location_to: load.locationTo || load.deliveryCityState || load.deliveryZip || '',
          pickup_date: pickupDate ? formatDateForDB(pickupDate) : null,
          delivery_date: deliveryDate ? formatDateForDB(deliveryDate) : null,
          date_added: loadDate,
          week_period: weekPeriod,
          deadhead_miles: load.deadheadMiles ? parseFloat(load.deadheadMiles) : null,
          detention_amount: headerDetention ? headerDetention : null,
          notes: load.notes || null,
          pickup_zip: load.pickupZip || null,
          delivery_zip: load.deliveryZip || null,
          pickup_city_state: load.pickupCityState || null,
          delivery_city_state: load.deliveryCityState || null,
          estimated_miles: load.estimatedMiles ?? null,
          stop_count: stopCount,
          total_stop_off_fees: stopSideEffects.stopOffFees,
        };

        const query = editingLoad
          ? supabase
              .from('load_reports')
              .update(payload)
              .eq('id', editingLoad)
              .eq('user_id', user.id)
          : supabase
              .from('load_reports')
              .insert({
                user_id: user.id,
                ...payload,
              });

        const { data, error } = await query.select().single();

        if (error) {
          console.error(`Error ${editingLoad ? 'updating' : 'adding'} load:`, error);
          return;
        }

        if (data) {
          // ── Stops write: delete-then-insert for simplicity. For single-stop
          //    loads (empty intermediateStops) this still correctly clears any
          //    stale rows from a prior multi-stop edit. Failures here are logged
          //    but do NOT roll back the load_reports row — the header is the
          //    source of truth and is the main thing the user sees.
          const loadId = data.id as string;
          if (editingLoad) {
            const { error: delErr } = await supabase
              .from('load_stops')
              .delete()
              .eq('load_id', loadId)
              .eq('user_id', user.id);
            if (delErr) console.error('Error clearing old stops:', delErr);
          }

          let savedStops: LoadStop[] = [];
          if (intermediateStops.length > 0) {
            const stopsPayload = intermediateStops.map((s, idx) => ({
              load_id: loadId,
              user_id: user.id,
              sequence: idx + 2, // positions 2..N-1 (origin=1, destination=N)
              stop_type: s.stopType,
              zip: s.zip || null,
              city_state: s.cityState || null,
              scheduled_at: s.scheduledAt ? s.scheduledAt.toISOString() : null,
              detention_amount: s.detentionAmount ? parseFloat(s.detentionAmount) : 0,
              stop_off_fee: s.stopOffFee ? parseFloat(s.stopOffFee) : 0,
              leg_miles: s.legMiles ?? null,
              notes: s.notes || null,
            }));
            const { data: stopsData, error: stopsErr } = await supabase
              .from('load_stops')
              .insert(stopsPayload)
              .select();
            if (stopsErr) {
              console.error('Error saving load stops:', stopsErr);
            } else if (stopsData) {
              savedStops = stopsData
                .slice()
                .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0))
                .map((s: any) => ({
                  id: s.id,
                  sequence: s.sequence,
                  stopType: s.stop_type,
                  zip: s.zip ?? undefined,
                  cityState: s.city_state ?? undefined,
                  scheduledAt: s.scheduled_at ?? undefined,
                  detentionAmount: s.detention_amount ?? 0,
                  stopOffFee: s.stop_off_fee ?? 0,
                  legMiles: s.leg_miles ?? undefined,
                  notes: s.notes ?? undefined,
                }));
            }
          }

          const normalizedLoad: Load = {
            id: data.id,
            rate: data.rate,
            companyDeduction: data.company_deduction,
            driverPay: data.driver_pay,
            locationFrom: data.location_from,
            locationTo: data.location_to,
            pickupDate: data.pickup_date,
            deliveryDate: data.delivery_date,
            dateAdded: data.date_added,
            weekPeriod: data.week_period,
            deadheadMiles: data.deadhead_miles,
            detentionAmount: data.detention_amount,
            notes: data.notes,
            pickupZip: data.pickup_zip,
            deliveryZip: data.delivery_zip,
            pickupCityState: data.pickup_city_state,
            deliveryCityState: data.delivery_city_state,
            estimatedMiles: data.estimated_miles,
            stopCount: data.stop_count ?? 2,
            totalStopOffFees: data.total_stop_off_fees ?? 0,
            stops: savedStops,
          };

          if (editingLoad) {
            setLoads(prev => prev.map(existing => (existing.id === editingLoad ? normalizedLoad : existing)));
          } else {
            setLoads(prev => [...prev, normalizedLoad]);
          }

          setNewLoad({
            rate: '',
            companyDeduction: userProfile?.companyDeduction || '',
            locationFrom: '',
            locationTo: '',
            pickupDate: new Date(),
            deliveryDate: new Date(),
            deadheadMiles: '',
            detentionAmount: '',
            notes: '',
            pickupZip: '',
            deliveryZip: '',
            pickupCityState: '',
            deliveryCityState: '',
            estimatedMiles: undefined,
            stops: [],
          });
          setShowAddForm(false);
          setEditingLoad(null);
        }
      } catch (error) {
        console.error('Error saving load:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteLoad = async (id: string) => {
    try {
      const { error } = await supabase
        .from('load_reports')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting load:', error);
        return;
      }

      setLoads(prev => prev.filter(load => load.id !== id));
    } catch (error) {
      console.error('Error deleting load:', error);
    }
  };

  const handleEditLoad = async (id: string, updatedLoad: Partial<Load>) => {
    try {
      const { error } = await supabase
        .from('load_reports')
        .update({
          rate: updatedLoad.rate,
          company_deduction: updatedLoad.companyDeduction,
          driver_pay: updatedLoad.driverPay,
          location_from: updatedLoad.locationFrom,
          location_to: updatedLoad.locationTo,
          pickup_date: updatedLoad.pickupDate,
          delivery_date: updatedLoad.deliveryDate,
          deadhead_miles: updatedLoad.deadheadMiles ?? null,
          detention_amount: updatedLoad.detentionAmount ?? null,
          notes: updatedLoad.notes ?? null,
          pickup_zip: updatedLoad.pickupZip ?? null,
          delivery_zip: updatedLoad.deliveryZip ?? null,
          pickup_city_state: updatedLoad.pickupCityState ?? null,
          delivery_city_state: updatedLoad.deliveryCityState ?? null,
          estimated_miles: updatedLoad.estimatedMiles ?? null,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating load:', error);
        return;
      }

      setLoads(prev => prev.map(load => 
        load.id === id ? { ...load, ...updatedLoad } : load
      ));
      setEditingLoad(null);
    } catch (error) {
      console.error('Error updating load:', error);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  // Fetch all deduction types from database
  useEffect(() => {
    if (user) {
      fetchAllDeductionTypes();
    }
  }, [user]);

  // Fetch loads and weekly deductions when week changes
  useEffect(() => {
    if (user) {
      fetchLoads();
    }
  }, [user, currentWeek]);

  const currentWeekLoads = loads
    .filter(load => {
      if (!load.dateAdded) return false;
      const loadDate = typeof load.dateAdded === 'string' ? parseISO(load.dateAdded) : load.dateAdded;
      const isInWeek = isWithinInterval(loadDate, { start: weekStart, end: weekEnd });
      return isInWeek;
    })
    .sort((a, b) => {
      // Sort by pickup date with latest dates on top
      if (!a.pickupDate && !b.pickupDate) return 0;
      if (!a.pickupDate) return 1; // Loads without pickup date go to bottom
      if (!b.pickupDate) return -1; // Loads without pickup date go to bottom
      
      const dateA = new Date(a.pickupDate);
      const dateB = new Date(b.pickupDate);
      return dateB.getTime() - dateA.getTime(); // Latest dates first
    });

  const availableDeductionTypes = allDeductionTypes.filter(type => {
    const fixedDeduction = deductions?.find(d => d.type === type && d.isFixed);
    return !fixedDeduction;
  });

  return {
    // State
    currentWeek,
    weekStart,
    weekEnd,
    loads,
    currentWeekLoads,
    newLoad,
    showAddForm,
    loading,
    editingLoad,
    availableDeductionTypes,
    weeklyMileage,
    extraDeductionTypes,
    showAddExtraDeduction,
    newExtraDeduction,
    editingDeduction,
    weeklyDeductions,
    
    // Setters
    setNewLoad,
    setShowAddForm,
    setEditingLoad,
    setWeeklyMileage,
    setExtraDeductionTypes,
    setShowAddExtraDeduction,
    setNewExtraDeduction,
    setEditingDeduction,
    setWeeklyDeductions,
    
    // Actions
    handleAddLoad,
    handleDeleteLoad,
    handleEditLoad,
    navigateWeek
  };
};
