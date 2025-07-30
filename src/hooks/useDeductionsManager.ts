import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExtraDeduction } from '@/types/LoadReports';

export const useDeductionsManager = (user: any, weekStart: Date) => {
  const [weeklyDeductions, setWeeklyDeductions] = useState<Record<string, string>>({});
  const [extraDeductionTypes, setExtraDeductionTypes] = useState<ExtraDeduction[]>([]);

  const fetchWeeklyDeductions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('weekly_deductions')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching weekly deductions:', error);
        return;
      }

      if (data) {
        const deductionsMap: Record<string, string> = {};
        data.forEach(deduction => {
          deductionsMap[deduction.deduction_type] = deduction.amount.toString();
        });
        setWeeklyDeductions(deductionsMap);
      }
    } catch (error) {
      console.error('Error fetching weekly deductions:', error);
    }
  };

  const saveWeeklyDeduction = async (type: string, amount: string) => {
    if (!user) return;
    
    try {
      const weekStartDate = weekStart.toISOString().split('T')[0];
      
      if (!amount || parseFloat(amount) === 0) {
        const { error } = await supabase
          .from('weekly_deductions')
          .delete()
          .eq('user_id', user.id)
          .eq('week_start', weekStartDate)
          .eq('deduction_type', type);
          
        if (error) {
          console.error('Error deleting weekly deduction:', error);
        }
      } else {
        const { error } = await supabase
          .from('weekly_deductions')
          .upsert({
            user_id: user.id,
            week_start: weekStartDate,
            deduction_type: type,
            amount: parseFloat(amount),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,week_start,deduction_type'
          });

        if (error) {
          console.error('Error saving weekly deduction:', error);
        }
      }
    } catch (error) {
      console.error('Error saving weekly deduction:', error);
    }
  };

  const handleWeeklyDeductionChange = async (type: string, amount: string) => {
    setWeeklyDeductions(prev => ({
      ...prev,
      [type]: amount
    }));
    
    clearTimeout((window as any).deductionSaveTimeout);
    (window as any).deductionSaveTimeout = setTimeout(() => {
      saveWeeklyDeduction(type, amount);
    }, 1000);
  };

  const fetchExtraDeductions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('weekly_extra_deductions')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart.toISOString().split('T')[0]);
  
      if (error) {
        console.error('Error fetching extra deductions:', error);
        return;
      }
  
      if (data) {
        const extraDeductions = data.map(item => ({
          id: item.id.toString(),
          name: item.name,
          amount: item.amount.toString(),
          dateAdded: item.updated_at
        }));
        setExtraDeductionTypes(extraDeductions);
      }
    } catch (error) {
      console.error('Error fetching extra deductions:', error);
    }
  };
  
  const saveExtraDeduction = async (deduction: ExtraDeduction) => {
    if (!user) return false;
    
    try {
      const weekStartDate = weekStart.toISOString().split('T')[0];
      
      if (deduction.id.includes('_')) {
        // Insert new deduction
        const { data, error } = await supabase
          .from('weekly_extra_deductions')
          .insert({
            user_id: user.id,
            week_start: weekStartDate,
            name: deduction.name,
            amount: parseFloat(deduction.amount),
            updated_at: new Date().toISOString()
          })
          .select();
      
        if (error) {
          console.error('Error saving extra deduction:', error);
          setExtraDeductionTypes(prev => prev.filter(item => item.id !== deduction.id));
          return false;
        }
        
        if (data && data[0]) {
          setExtraDeductionTypes(prev => 
            prev.map(item => 
              item.id === deduction.id 
                ? { ...item, id: data[0].id.toString() }
                : item
            )
          );
        }
        
        return true;
      } else {
        // Update existing deduction
        const { error } = await supabase
          .from('weekly_extra_deductions')
          .update({
            name: deduction.name,
            amount: parseFloat(deduction.amount),
            updated_at: new Date().toISOString()
          })
          .eq('id', parseInt(deduction.id))
          .eq('user_id', user.id);
  
        if (error) {
          console.error('Error updating extra deduction:', error);
          return false;
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error saving extra deduction:', error);
      setExtraDeductionTypes(prev => prev.filter(item => item.id !== deduction.id));
      return false;
    }
  };
  
  const deleteExtraDeduction = async (id: string) => {
    if (!user) return;
    
    try {
      if (!id.includes('_')) {
        const { error } = await supabase
          .from('weekly_extra_deductions')
          .delete()
          .eq('id', parseInt(id))
          .eq('user_id', user.id);
  
        if (error) {
          console.error('Error deleting extra deduction:', error);
        }
      }
    } catch (error) {
      console.error('Error deleting extra deduction:', error);
    }
  };

  const handleAddExtraDeduction = async (newExtraDeduction: { name: string; amount: string }) => {
    if (newExtraDeduction.name.trim() && newExtraDeduction.amount.trim()) {
      const tempId = `temp_${Date.now()}`;
      const newExtra: ExtraDeduction = {
        id: tempId,
        name: newExtraDeduction.name.trim(),
        amount: newExtraDeduction.amount,
        dateAdded: new Date().toISOString()
      };
      
      setExtraDeductionTypes(prev => [...prev, newExtra]);
      
      try {
        const success = await saveExtraDeduction(newExtra);
        
        if (!success) {
          setExtraDeductionTypes(prev => prev.filter(item => item.id !== newExtra.id));
          console.error('Failed to save custom deduction. Please try again.');
        }
        
        return success;
      } catch (error) {
        setExtraDeductionTypes(prev => prev.filter(item => item.id !== tempId));
        console.error('Error saving custom deduction:', error);
        return false;
      }
    }
    return false;
  };

  const handleRemoveExtraDeduction = async (id: string) => {
    setExtraDeductionTypes(prev => prev.filter(item => item.id !== id));
    await deleteExtraDeduction(id);
  };

  const handleEditExtraDeduction = async (id: string, name: string, amount: string) => {
    const updatedDeduction: ExtraDeduction = { id, name, amount };
    const success = await saveExtraDeduction(updatedDeduction);
    if (success) {
      setExtraDeductionTypes(prev => 
        prev.map(item => item.id === id ? updatedDeduction : item)
      );
    }
    return success;
  };

  const handleAddDeductionFromType = async (type: string, amount: string) => {
    if (amount && parseFloat(amount) > 0) {
      const newExtra: ExtraDeduction = {
        id: `${type}_${Date.now()}`,
        name: type,
        amount: amount,
        dateAdded: new Date().toISOString()
      };
      setExtraDeductionTypes(prev => [...prev, newExtra]);
      const success = await saveExtraDeduction(newExtra);
      if (!success) {
        console.error('Failed to save deduction:', newExtra);
      }
    }
  };

  useEffect(() => {
    if (user) {
      // Stagger the requests to prevent overwhelming the API
      setTimeout(() => fetchWeeklyDeductions(), 100);
      setTimeout(() => fetchExtraDeductions(), 200);
    }
  }, [user, weekStart]);

  const totalWeeklyDeductions = Object.values(weeklyDeductions).reduce((total, amount) => {
    return total + (parseFloat(amount) || 0);
  }, 0);
  
  const totalExtraDeductions = extraDeductionTypes.reduce((total, extra) => {
    return total + (parseFloat(extra.amount) || 0);
  }, 0);

  return {
    weeklyDeductions,
    extraDeductionTypes,
    totalWeeklyDeductions,
    totalExtraDeductions,
    setWeeklyDeductions,
    setExtraDeductionTypes,
    handleWeeklyDeductionChange,
    handleAddExtraDeduction,
    handleRemoveExtraDeduction,
    handleEditExtraDeduction,
    handleAddDeductionFromType
  };
};