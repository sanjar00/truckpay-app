import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExtraDeduction } from '@/types/LoadReports';
import { useOfflineSync } from '@/hooks/useOfflineSync';

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
  const [isLoading, setIsLoading] = useState(false);

  const { isOnline, queueAction, setCachedData, getCachedData } = useOfflineSync({
    saveWeeklyDeduction: async (payload: any) => {
      if (payload.delete) {
        await supabase
          .from('weekly_deductions')
          .delete()
          .eq('user_id', payload.user_id)
          .eq('week_start', payload.week_start)
          .eq('deduction_type', payload.deduction_type);
      } else {
        await supabase
          .from('weekly_deductions')
          .upsert(
            {
              user_id: payload.user_id,
              week_start: payload.week_start,
              deduction_type: payload.deduction_type,
              amount: payload.amount,
              updated_at: payload.updated_at,
            },
            { onConflict: 'user_id,week_start,deduction_type' },
          );
      }
    },
    saveExtraDeduction: async (payload: any) => {
      const d = payload.deduction as ExtraDeduction;
      if (d.id && !d.id.includes('_')) {
        await supabase
          .from('weekly_extra_deductions')
          .update({
            name: d.name,
            amount: parseFloat(d.amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', parseInt(d.id))
          .eq('user_id', payload.user_id);
      } else {
        await supabase
          .from('weekly_extra_deductions')
          .insert({
            user_id: payload.user_id,
            week_start: payload.week_start,
            name: d.name,
            amount: parseFloat(d.amount),
            date_added: d.dateAdded || new Date().toISOString(),
          });
      }
    },
    deleteExtraDeduction: async (payload: any) => {
      await supabase
        .from('weekly_extra_deductions')
        .delete()
        .eq('id', parseInt(payload.id))
        .eq('user_id', payload.user_id);
    }
  });

  /** ---------- Helpers ---------- */
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Separate abort controllers for each fetch operation
  const weeklyAbortControllerRef = useRef<AbortController | null>(null);
  const extraAbortControllerRef = useRef<AbortController | null>(null);

  /** ---------- Fetchers ---------- */
  const fetchWeeklyDeductions = async () => {
    if (!user || isLoading) return;

    try {
      weeklyAbortControllerRef.current?.abort();
      weeklyAbortControllerRef.current = new AbortController();
      setIsLoading(true);

      const { data, error } = await supabase
        .from('weekly_deductions')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr)
        .abortSignal(weeklyAbortControllerRef.current.signal);

      if (error) throw error;

      if (data) {
        const map: Record<string, string> = {};
        data.forEach(d => {
          map[d.deduction_type] = d.amount.toString();
        });
        setWeeklyDeductions(map);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('fetchWeeklyDeductions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExtraDeductions = async () => {
    if (!user || isLoading) return;

    try {
      extraAbortControllerRef.current?.abort();
      extraAbortControllerRef.current = new AbortController();
      setIsLoading(true);

      const { data, error } = await supabase
        .from('weekly_extra_deductions')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr)
        .abortSignal(extraAbortControllerRef.current.signal);

      if (error) throw error;

      if (data) {
        const extras = data.map(item => ({
          id: item.id.toString(),
          name: item.name ?? item.deduction_type,
          amount: item.amount.toString(),
          dateAdded: item.date_added ?? item.created_at ?? item.updated_at,
        }));
        setExtraDeductionTypes(extras);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('fetchExtraDeductions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllDeductions = async () => {
    if (!user) return;
    if (!isOnline) {
      const cached = getCachedData('deductions', { weekly: {}, extra: [] });
      setWeeklyDeductions(cached.weekly);
      setExtraDeductionTypes(cached.extra);
      return;
    }
    await fetchWeeklyDeductions();
    await fetchExtraDeductions();
  };

  /** ---------- Persistence ---------- */
  const saveWeeklyDeduction = async (type: string, amount: string) => {
    if (!user) return;

    if (!isOnline) {
      await queueAction({
        type: 'saveWeeklyDeduction',
        payload: {
          user_id: user.id,
          week_start: weekStartStr,
          deduction_type: type,
          amount: parseFloat(amount),
          updated_at: new Date().toISOString(),
          delete: !amount || parseFloat(amount) === 0
        }
      });
      return;
    }

    try {
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
    } catch (err) {
      console.error('saveWeeklyDeduction:', err);
    }
  };

  const saveExtraDeduction = async (deduction: ExtraDeduction) => {
    if (!user) return false;

    if (!isOnline) {
      await queueAction({
        type: 'saveExtraDeduction',
        payload: { deduction, user_id: user.id, week_start: weekStartStr }
      });
      return true;
    }

    try {
      if (deduction.id.includes('_')) {
        /* ---------- INSERT ---------- */
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
        /* ---------- UPDATE ---------- */
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
    } catch (err) {
      console.error('saveExtraDeduction:', err);
      return false;
    }
  };

  const deleteExtraDeduction = async (id: string) => {
    if (!user || id.includes('_')) return; // temp-ID — запись ещё не создана

    if (!isOnline) {
      await queueAction({ type: 'deleteExtraDeduction', payload: { id, user_id: user.id } });
      return;
    }

    try {
      await supabase
        .from('weekly_extra_deductions')
        .delete()
        .eq('id', parseInt(id))
        .eq('user_id', user.id);
    } catch (err) {
      console.error('deleteExtraDeduction:', err);
    }
  };

  /** ---------- Handlers (для UI) ---------- */
  const handleWeeklyDeductionChange = async (type: string, amount: string) => {
    setWeeklyDeductions(prev => ({ ...prev, [type]: amount }));
    await saveWeeklyDeduction(type, amount);
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

    const success = await saveExtraDeduction(newExtra);
    if (!success) {
      setExtraDeductionTypes(prev => prev.filter(item => item.id !== tempId));
    }
    return success;
  };

  const handleRemoveExtraDeduction = async (id: string) => {
    setExtraDeductionTypes(prev => prev.filter(item => item.id !== id));
    await deleteExtraDeduction(id);
  };

  const handleEditExtraDeduction = async (id: string, name: string, amount: string) => {
    const existing = extraDeductionTypes.find(item => item.id === id);
    const updated: ExtraDeduction = { id, name, amount, dateAdded: existing?.dateAdded };
    const success = await saveExtraDeduction(updated);
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

  /** ---------- Effects ---------- */
  useEffect(() => {
    if (!user?.id) return;

    /* debounce, чтобы не дёргать БД при каждом клике Prev/Next Week */
    fetchTimeoutRef.current && clearTimeout(fetchTimeoutRef.current);
    // Delay fetching to avoid rapid consecutive database queries
    fetchTimeoutRef.current = setTimeout(() => {
      void fetchAllDeductions();
    }, 400);

    return () => {
      fetchTimeoutRef.current && clearTimeout(fetchTimeoutRef.current);
      weeklyAbortControllerRef.current?.abort();
      extraAbortControllerRef.current?.abort();
    };
  }, [user?.id, weekStartStr]);                                       // <-- реагируем на смену недели

  useEffect(() => {
    setCachedData('deductions', { weekly: weeklyDeductions, extra: extraDeductionTypes });
  }, [weeklyDeductions, extraDeductionTypes, setCachedData]);

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
