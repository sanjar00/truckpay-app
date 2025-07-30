import { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, isWithinInterval, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getUserWeekStart, getUserWeekEnd } from '@/lib/weeklyPeriodUtils';
import { Load, NewLoad, WeeklyMileage, ExtraDeduction } from '@/types/LoadReports';

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
        
        const { data, error } = await supabase
          .from('load_reports')
          .insert({
            user_id: user.id,
            rate: parseFloat(newLoad.rate),
            company_deduction: parseFloat(newLoad.companyDeduction),
            driver_pay: driverPay,
            location_from: newLoad.locationFrom,
            location_to: newLoad.locationTo,
            pickup_date: newLoad.pickupDate ? newLoad.pickupDate.toISOString().split('T')[0] : null,
            delivery_date: newLoad.deliveryDate ? newLoad.deliveryDate.toISOString().split('T')[0] : null,
            date_added: loadDate,
            week_period: weekPeriod
          })
          .select()
          .single();

        if (error) {
          console.error('Error adding load:', error);
          return;
        }

        if (data) {
          const newLoadEntry = {
            id: data.id,
            rate: data.rate,
            companyDeduction: data.company_deduction,
            driverPay: data.driver_pay,
            locationFrom: data.location_from,
            locationTo: data.location_to,
            pickupDate: data.pickup_date,
            deliveryDate: data.delivery_date,
            dateAdded: data.date_added,
            weekPeriod: data.week_period
          };
          
          setLoads(prev => [...prev, newLoadEntry]);
          setNewLoad({ 
            rate: '', 
            companyDeduction: userProfile?.companyDeduction || '',
            locationFrom: '',
            locationTo: '',
            pickupDate: undefined,
            deliveryDate: undefined
          });
          setShowAddForm(false);
        }
      } catch (error) {
        console.error('Error adding load:', error);
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
          delivery_date: updatedLoad.deliveryDate
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

  const currentWeekLoads = loads.filter(load => {
    if (!load.dateAdded) return false;
    const loadDate = typeof load.dateAdded === 'string' ? parseISO(load.dateAdded) : load.dateAdded;
    const isInWeek = isWithinInterval(loadDate, { start: weekStart, end: weekEnd });
    return isInWeek;
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