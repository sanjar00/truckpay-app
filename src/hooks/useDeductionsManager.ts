import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExtraDeduction } from '@/types/LoadReports';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Хук управляет:
 *  • фикс/нефикс списаниями за неделю (weekly_deductions);
 *  • кастомными списаниями (weekly_extra_deductions);
 *  • суммами и CRUD-операциями.
 *
 * @param user      – объект текущего пользователя Supabase
 * @param weekStart – дата начала недели (Sunday 00:00)
 */
export const useDeductionsManager = (user: any, weekStart: Date) => {
  /** ---------- State ---------- */
  const [weeklyDeductions, setWeeklyDeductions] = useState<Record<string, string>>({});
  const [extraDeductionTypes, setExtraDeductionTypes] = useState<ExtraDeduction[]>([]);
  const queryClient = useQueryClient();

  /** ---------- Helpers ---------- */
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  /** ---------- Fetchers ---------- */
  useQuery({
    queryKey: ['weekly_deductions', user?.id, weekStartStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_deductions')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr);

      if (error) throw error;

      const map: Record<string, string> = {};
      data.forEach(d => {
        map[d.deduction_type] = d.amount.toString();
      });
      return map;
    },
    enabled: !!user?.id,
    onSuccess: data => setWeeklyDeductions(data)
  });

  useQuery({
    queryKey: ['weekly_extra_deductions', user?.id, weekStartStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_extra_deductions')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr);

      if (error) throw error;

      return data.map(item => ({
        id: item.id.toString(),
        name: item.name ?? item.deduction_type,
        amount: item.amount.toString(),
        dateAdded: item.date_added ?? item.created_at ?? item.updated_at,
      }));
    },
    enabled: !!user?.id,
    onSuccess: data => setExtraDeductionTypes(data)
  });

  /** ---------- Persistence ---------- */
  const saveWeeklyDeductionMutation = useMutation({
    mutationFn: async ({ type, amount }: { type: string; amount: string }) => {
      if (!user) return;
      if (!amount || parseFloat(amount) === 0) {
        await supabase
          .from('weekly_deductions')
          .delete()
          .eq('user_id', user.id)
          .eq('week_start', weekStartStr)
          .eq('deduction_type', type);
      } else {
        await supabase
          .from('weekly_deductions')
          .upsert(
            {
              user_id: user.id,
              week_start: weekStartStr,
              deduction_type: type,
              amount: parseFloat(amount),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,week_start,deduction_type' },
          );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['weekly_deductions', user?.id, weekStartStr]);
    }
  });

  const saveExtraDeductionMutation = useMutation({
    mutationFn: async (deduction: ExtraDeduction) => {
      if (!user) return false;

      if (deduction.id.includes('_')) {
        const { data, error } = await supabase
          .from('weekly_extra_deductions')
          .insert({
            user_id: user.id,
            week_start: weekStartStr,
            name: deduction.name,
            amount: parseFloat(deduction.amount),
            date_added: deduction.dateAdded || new Date().toISOString(),
          })
          .select();

        if (error) throw error;
        if (data && data[0]) {
          setExtraDeductionTypes(prev =>
            prev.map(item => (item.id === deduction.id ? { ...deduction, id: data[0].id.toString() } : item)),
          );
        }
      } else {
        await supabase
          .from('weekly_extra_deductions')
          .update({
            name: deduction.name,
            amount: parseFloat(deduction.amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', parseInt(deduction.id))
          .eq('user_id', user.id);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['weekly_extra_deductions', user?.id, weekStartStr]);
    },
    onError: () => false
  });

  const deleteExtraDeductionMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user || id.includes('_')) return;
      await supabase
        .from('weekly_extra_deductions')
        .delete()
        .eq('id', parseInt(id))
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['weekly_extra_deductions', user?.id, weekStartStr]);
    }
  });

  /** ---------- Handlers (для UI) ---------- */
  const handleWeeklyDeductionChange = async (type: string, amount: string) => {
    setWeeklyDeductions(prev => ({ ...prev, [type]: amount }));
    await saveWeeklyDeductionMutation.mutateAsync({ type, amount });
  };

  const handleAddExtraDeduction = async (name: string, amount: string, date?: string) => {
    const tempId = `temp_${Date.now()}`;
    const newExtra: ExtraDeduction = {
      id: tempId,
      name,
      amount,
      dateAdded: date || new Date().toISOString(),
    };

    setExtraDeductionTypes(prev => [...prev, newExtra]);

    const success = await saveExtraDeductionMutation.mutateAsync(newExtra);
    if (!success) {
      setExtraDeductionTypes(prev => prev.filter(item => item.id !== tempId));
    }
    return success;
  };

  const handleRemoveExtraDeduction = async (id: string) => {
    setExtraDeductionTypes(prev => prev.filter(item => item.id !== id));
    await deleteExtraDeductionMutation.mutateAsync(id);
  };

  const handleEditExtraDeduction = async (id: string, name: string, amount: string) => {
    const existing = extraDeductionTypes.find(item => item.id === id);
    const updated: ExtraDeduction = { id, name, amount, dateAdded: existing?.dateAdded };
    const success = await saveExtraDeductionMutation.mutateAsync(updated);
    if (success) {
      setExtraDeductionTypes(prev => prev.map(item => (item.id === id ? updated : item)));
    }
    return success;
  };

  /** Добавить кастомное списание из списка предопределённых типов 👇 */
  const handleAddDeductionFromType = async (type: string, amount: string, date?: string) => {
    if (!amount || parseFloat(amount) <= 0) return false;
    return handleAddExtraDeduction(type, amount, date);
  };

  /** ---------- Totals ---------- */
  const totalWeeklyDeductions = Object.values(weeklyDeductions).reduce(
    (sum, a) => sum + (parseFloat(a) || 0),
    0,
  );
  const totalExtraDeductions = extraDeductionTypes.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0,
  );

  /** ---------- Public API ---------- */
  return {
    weeklyDeductions,
    extraDeductionTypes,
    totalWeeklyDeductions,
    totalExtraDeductions,
    setWeeklyDeductions,          // на случай ручных манипуляций в UI
    setExtraDeductionTypes,
    handleWeeklyDeductionChange,
    handleAddExtraDeduction,
    handleRemoveExtraDeduction,
    handleEditExtraDeduction,
    handleAddDeductionFromType,
  };
};
