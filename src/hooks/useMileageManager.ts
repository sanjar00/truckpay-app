import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyMileage } from '@/types/LoadReports';

export const useMileageManager = (user: any, weekStart: Date) => {
  const [weeklyMileage, setWeeklyMileage] = useState<WeeklyMileage>({
    startMileage: '',
    endMileage: '',
    totalMiles: 0
  });
  const [autoFilledFields, setAutoFilledFields] = useState({ startMileage: false, endMileage: false });
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
        let startMileage = data.start_mileage?.toString() || '';
        let endMileage = data.end_mileage?.toString() || '';
        let startAutoFilled = false;
        let endAutoFilled = false;

        // Auto-fill: If start mileage is empty, try to get it from previous week's end mileage
        if (!startMileage && user) {
          const prevWeekStart = new Date(weekStart);
          prevWeekStart.setDate(prevWeekStart.getDate() - 7);
          const prevWeekStartDate = prevWeekStart.toISOString().split('T')[0];

          const { data: prevWeekData } = await supabase
            .from('weekly_mileage')
            .select('end_mileage')
            .eq('user_id', user.id)
            .eq('week_start', prevWeekStartDate)
            .maybeSingle();

          if (prevWeekData?.end_mileage) {
            startMileage = prevWeekData.end_mileage.toString();
            startAutoFilled = true;
          }
        }

        // Auto-fill: If end mileage is empty, try to get it from next week's start mileage
        if (!endMileage && user) {
          const nextWeekStart = new Date(weekStart);
          nextWeekStart.setDate(nextWeekStart.getDate() + 7);
          const nextWeekStartDate = nextWeekStart.toISOString().split('T')[0];

          const { data: nextWeekData } = await supabase
            .from('weekly_mileage')
            .select('start_mileage')
            .eq('user_id', user.id)
            .eq('week_start', nextWeekStartDate)
            .maybeSingle();

          if (nextWeekData?.start_mileage) {
            endMileage = nextWeekData.start_mileage.toString();
            endAutoFilled = true;
          }
        }

        // Compute safe totalMiles: only if both values are positive and difference is valid
        const start = parseInt(startMileage) || 0;
        const end = parseInt(endMileage) || 0;
        const rawTotal = (start > 0 && end > 0) ? Math.max(0, end - start) : 0;
        const safeTotalMiles = rawTotal > 15000 ? 0 : rawTotal;

        setWeeklyMileage({
          startMileage: startMileage,
          endMileage: endMileage,
          totalMiles: safeTotalMiles
        });
        setAutoFilledFields({
          startMileage: startAutoFilled,
          endMileage: endAutoFilled
        });
      } else if (!data) {
        // No data for this week - try to auto-fill both fields
        if (user) {
          const prevWeekStart = new Date(weekStart);
          prevWeekStart.setDate(prevWeekStart.getDate() - 7);
          const prevWeekStartDate = prevWeekStart.toISOString().split('T')[0];

          const nextWeekStart = new Date(weekStart);
          nextWeekStart.setDate(nextWeekStart.getDate() + 7);
          const nextWeekStartDate = nextWeekStart.toISOString().split('T')[0];

          const { data: prevWeekData } = await supabase
            .from('weekly_mileage')
            .select('end_mileage')
            .eq('user_id', user.id)
            .eq('week_start', prevWeekStartDate)
            .maybeSingle();

          const { data: nextWeekData } = await supabase
            .from('weekly_mileage')
            .select('start_mileage')
            .eq('user_id', user.id)
            .eq('week_start', nextWeekStartDate)
            .maybeSingle();

          const autoFilledStart = prevWeekData?.end_mileage?.toString() || '';
          const autoFilledEnd = nextWeekData?.start_mileage?.toString() || '';

          setWeeklyMileage({
            startMileage: autoFilledStart,
            endMileage: autoFilledEnd,
            totalMiles: 0
          });
          setAutoFilledFields({
            startMileage: !!autoFilledStart,
            endMileage: !!autoFilledEnd
          });
        } else {
          setWeeklyMileage({
            startMileage: '',
            endMileage: '',
            totalMiles: 0
          });
          setAutoFilledFields({
            startMileage: false,
            endMileage: false
          });
        }
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
    const rawTotal = Math.max(0, end - start);
    newMileage.totalMiles = rawTotal > 15000 ? 0 : rawTotal;
    
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
    calculateRPM,
    autoFilledFields
  };
};