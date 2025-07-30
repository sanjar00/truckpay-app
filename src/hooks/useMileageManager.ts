import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyMileage } from '@/types/LoadReports';

export const useMileageManager = (user: any, weekStart: Date) => {
  const [weeklyMileage, setWeeklyMileage] = useState<WeeklyMileage>({
    startMileage: '',
    endMileage: '',
    totalMiles: 0
  });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserInputRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWeeklyMileage = async () => {
    if (!user || isLoading) return;
    
    setIsLoading(true);
    try {
      const weekStartDate = weekStart.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('weekly_mileage')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartDate)
        .maybeSingle();

      if (error) {
        console.error('Error fetching weekly mileage:', error);
        return;
      }

      if (data && !isUserInputRef.current) {
        setWeeklyMileage({
          startMileage: data.start_mileage?.toString() || '',
          endMileage: data.end_mileage?.toString() || '',
          totalMiles: data.total_miles || 0
        });
      } else if (!data) {
        setWeeklyMileage({
          startMileage: '',
          endMileage: '',
          totalMiles: 0
        });
      }
    } catch (error) {
      console.error('Error fetching weekly mileage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWeeklyMileage = async (startMileage: string, endMileage: string, totalMiles: number) => {
    if (!user) return;
    
    try {
      const weekStartDate = weekStart.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('weekly_mileage')
        .upsert({
          user_id: user.id,
          week_start: weekStartDate,
          start_mileage: startMileage ? parseInt(startMileage) : null,
          end_mileage: endMileage ? parseInt(endMileage) : null,
          // Remove total_miles since it's a generated column
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,week_start'
        });
  
      if (error) {
        console.error('Error saving weekly mileage:', error);
      }
    } catch (error) {
      console.error('Error saving weekly mileage:', error);
    } finally {
      isUserInputRef.current = false;
    }
  };

  const handleMileageChange = async (field: 'startMileage' | 'endMileage', value: string) => {
    isUserInputRef.current = true;
    const newMileage = { ...weeklyMileage, [field]: value };
    
    // Calculate total miles
    const start = parseInt(newMileage.startMileage) || 0;
    const end = parseInt(newMileage.endMileage) || 0;
    newMileage.totalMiles = Math.max(0, end - start);
    
    setWeeklyMileage(newMileage);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveWeeklyMileage(newMileage.startMileage, newMileage.endMileage, newMileage.totalMiles);
    }, 1000);
  };

  const calculateRPM = (totalGrossPay: number) => {
    if (!weeklyMileage.totalMiles || weeklyMileage.totalMiles === 0) return 0;
    return totalGrossPay / weeklyMileage.totalMiles;
  };

  useEffect(() => {
    if (user) {
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      // Debounce the fetch request
      fetchTimeoutRef.current = setTimeout(() => {
        fetchWeeklyMileage();
      }, 300);
    }
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [user, weekStart]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    weeklyMileage,
    setWeeklyMileage,
    handleMileageChange,
    calculateRPM
  };
};