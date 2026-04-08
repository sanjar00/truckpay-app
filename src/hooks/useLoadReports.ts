import { useState, useEffect } from 'react';
import { format, addWeeks, subWeeks, isWithinInterval, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getUserWeekStart, getUserWeekEnd } from '@/lib/weeklyPeriodUtils';
import { Load, NewLoad, WeeklyMileage, ExtraDeduction } from '@/types/LoadReports';

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
          weekPeriod: load.week_period,
          deadheadMiles: load.deadhead_miles,
          dispatcherName: load.dispatcher_name,
          dispatcherCompany: load.dispatcher_company,
          dispatcherPhone: load.dispatcher_phone,
          brokerName: load.broker_name,
          brokerCompany: load.broker_company,
          bolNumber: load.bol_number,
          notes: load.notes,
          pickupZip: load.pickup_zip,
          deliveryZip: load.delivery_zip,
          pickupCityState: load.pickup_city_state,
          deliveryCityState: load.delivery_city_state,
          estimatedMiles: load.estimated_miles,
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
            location_from: newLoad.locationFrom || newLoad.pickupCityState || newLoad.pickupZip || '',
            location_to: newLoad.locationTo || newLoad.deliveryCityState || newLoad.deliveryZip || '',
            pickup_date: newLoad.pickupDate ? formatDateForDB(newLoad.pickupDate) : null,
            delivery_date: newLoad.deliveryDate ? formatDateForDB(newLoad.deliveryDate) : null,
            date_added: loadDate,
            week_period: weekPeriod,
            deadhead_miles: newLoad.deadheadMiles ? parseInt(newLoad.deadheadMiles) : null,
            dispatcher_name: newLoad.dispatcherName || null,
            dispatcher_company: newLoad.dispatcherCompany || null,
            dispatcher_phone: newLoad.dispatcherPhone || null,
            broker_name: newLoad.brokerName || null,
            broker_company: newLoad.brokerCompany || null,
            bol_number: newLoad.bolNumber || null,
            notes: newLoad.notes || null,
            pickup_zip: newLoad.pickupZip || null,
            delivery_zip: newLoad.deliveryZip || null,
            pickup_city_state: newLoad.pickupCityState || null,
            delivery_city_state: newLoad.deliveryCityState || null,
            estimated_miles: newLoad.estimatedMiles ?? null,
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
            weekPeriod: data.week_period,
            deadheadMiles: data.deadhead_miles,
            dispatcherName: data.dispatcher_name,
            dispatcherCompany: data.dispatcher_company,
            dispatcherPhone: data.dispatcher_phone,
            brokerName: data.broker_name,
            brokerCompany: data.broker_company,
            bolNumber: data.bol_number,
            notes: data.notes,
            pickupZip: data.pickup_zip,
            deliveryZip: data.delivery_zip,
            pickupCityState: data.pickup_city_state,
            deliveryCityState: data.delivery_city_state,
            estimatedMiles: data.estimated_miles,
          };

          setLoads(prev => [...prev, newLoadEntry]);
          setNewLoad({
            rate: '',
            companyDeduction: userProfile?.companyDeduction || '',
            locationFrom: '',
            locationTo: '',
            pickupDate: undefined,
            deliveryDate: undefined,
            deadheadMiles: '',
            dispatcherName: '',
            dispatcherCompany: '',
            dispatcherPhone: '',
            brokerName: '',
            brokerCompany: '',
            bolNumber: '',
            notes: '',
            pickupZip: '',
            deliveryZip: '',
            pickupCityState: '',
            deliveryCityState: '',
            estimatedMiles: undefined,
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
          delivery_date: updatedLoad.deliveryDate,
          deadhead_miles: updatedLoad.deadheadMiles ?? null,
          dispatcher_name: updatedLoad.dispatcherName ?? null,
          dispatcher_company: updatedLoad.dispatcherCompany ?? null,
          dispatcher_phone: updatedLoad.dispatcherPhone ?? null,
          broker_name: updatedLoad.brokerName ?? null,
          broker_company: updatedLoad.brokerCompany ?? null,
          bol_number: updatedLoad.bolNumber ?? null,
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