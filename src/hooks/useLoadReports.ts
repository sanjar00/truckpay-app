import { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, isWithinInterval, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getUserWeekStart, getUserWeekEnd } from '@/lib/weeklyPeriodUtils';
import { Load, NewLoad, WeeklyMileage, ExtraDeduction } from '@/types/LoadReports';
import { useOfflineSync } from '@/hooks/useOfflineSync';

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
    pickupDate: undefined,
    deliveryDate: undefined
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

  const { isOnline, queueAction, setCachedData, getCachedData } = useOfflineSync({
    addLoad: async (payload: any) => {
      await supabase.from('load_reports').insert(payload);
    },
    deleteLoad: async (payload: any) => {
      await supabase
        .from('load_reports')
        .delete()
        .eq('id', payload.id)
        .eq('user_id', payload.user_id);
    },
    editLoad: async (payload: any) => {
      await supabase
        .from('load_reports')
        .update(payload.updates)
        .eq('id', payload.id)
        .eq('user_id', payload.user_id);
    }
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
      const { data, error } = await supabase
        .from('load_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error fetching loads:', error);
        return;
      }

      if (data) {
        const formattedLoads = data.map(load => ({
          id: load.id,
          rate: load.rate,
          companyDeduction: load.company_deduction,
          driverPay: load.driver_pay,
          locationFrom: load.location_from,
          locationTo: load.location_to,
          pickupDate: load.pickup_date,
          deliveryDate: load.delivery_date,
          dateAdded: load.date_added,
          weekPeriod: load.week_period
        }));

        setLoads(formattedLoads);
        setCachedData('loadReports', formattedLoads);
      }
    } catch (error) {
      console.error('Error fetching loads:', error);
    }
  };

  const handleAddLoad = async () => {
    if (newLoad.rate && newLoad.companyDeduction && newLoad.locationFrom && newLoad.locationTo && user) {
      setLoading(true);

      try {
        const driverPay = parseFloat(newLoad.rate) * (1 - parseFloat(newLoad.companyDeduction) / 100);
        const weekPeriod = `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
        const loadDate = weekStart.toISOString().split('T')[0];

        const payload = {
          user_id: user.id,
          rate: parseFloat(newLoad.rate),
          company_deduction: parseFloat(newLoad.companyDeduction),
          driver_pay: driverPay,
          location_from: newLoad.locationFrom,
          location_to: newLoad.locationTo,
          pickup_date: newLoad.pickupDate ? formatDateForDB(newLoad.pickupDate) : null,
          delivery_date: newLoad.deliveryDate ? formatDateForDB(newLoad.deliveryDate) : null,
          date_added: loadDate,
          week_period: weekPeriod
        };

        const result = await queueAction({ type: 'addLoad', payload });

        const newLoadEntry = result
          ? {
              id: result[0]?.id || result.id,
              rate: result[0]?.rate ?? payload.rate,
              companyDeduction: result[0]?.company_deduction ?? payload.company_deduction,
              driverPay: result[0]?.driver_pay ?? payload.driver_pay,
              locationFrom: result[0]?.location_from ?? payload.location_from,
              locationTo: result[0]?.location_to ?? payload.location_to,
              pickupDate: result[0]?.pickup_date ?? payload.pickup_date,
              deliveryDate: result[0]?.delivery_date ?? payload.delivery_date,
              dateAdded: result[0]?.date_added ?? payload.date_added,
              weekPeriod: result[0]?.week_period ?? payload.week_period
            }
          : {
              id: `temp_${Date.now()}`,
              rate: payload.rate,
              companyDeduction: payload.company_deduction,
              driverPay: payload.driver_pay,
              locationFrom: payload.location_from,
              locationTo: payload.location_to,
              pickupDate: payload.pickup_date,
              deliveryDate: payload.delivery_date,
              dateAdded: payload.date_added,
              weekPeriod: payload.week_period
            };

        setLoads(prev => {
          const updated = [...prev, newLoadEntry];
          setCachedData('loadReports', updated);
          return updated;
        });

        setNewLoad({
          rate: '',
          companyDeduction: userProfile?.companyDeduction || '',
          locationFrom: '',
          locationTo: '',
          pickupDate: undefined,
          deliveryDate: undefined
        });
        setShowAddForm(false);
      } catch (error) {
        console.error('Error adding load:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteLoad = async (id: string) => {
    try {
      await queueAction({ type: 'deleteLoad', payload: { id, user_id: user.id } });
      setLoads(prev => {
        const updated = prev.filter(load => load.id !== id);
        setCachedData('loadReports', updated);
        return updated;
      });
    } catch (error) {
      console.error('Error deleting load:', error);
    }
  };

  const handleEditLoad = async (id: string, updatedLoad: Partial<Load>) => {
    try {
      await queueAction({ type: 'editLoad', payload: { id, user_id: user.id, updates: {
        rate: updatedLoad.rate,
        company_deduction: updatedLoad.companyDeduction,
        driver_pay: updatedLoad.driverPay,
        location_from: updatedLoad.locationFrom,
        location_to: updatedLoad.locationTo,
        pickup_date: updatedLoad.pickupDate,
        delivery_date: updatedLoad.deliveryDate
      } } });

      setLoads(prev => {
        const updated = prev.map(load =>
          load.id === id ? { ...load, ...updatedLoad } : load
        );
        setCachedData('loadReports', updated);
        return updated;
      });
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

  useEffect(() => {
    setWeeklyMileage(
      getCachedData('weeklyMileage', { startMileage: '', endMileage: '', totalMiles: 0 })
    );
  }, [getCachedData]);

  useEffect(() => {
    setCachedData('weeklyMileage', weeklyMileage);
  }, [weeklyMileage, setCachedData]);

  // Fetch all deduction types from database
  useEffect(() => {
    if (user) {
      fetchAllDeductionTypes();
    }
  }, [user]);

  // Fetch loads when week or connectivity changes
  useEffect(() => {
    if (user) {
      if (isOnline) {
        void fetchLoads();
      } else {
        setLoads(getCachedData('loadReports', []));
      }
    }
  }, [user, currentWeek, isOnline, getCachedData]);

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