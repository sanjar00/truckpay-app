import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Truck, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AddLoadForm from './AddLoadForm';
import LoadCard from './LoadCard';
import WeeklySummary from './WeeklySummary';
import { formatCurrency } from '@/lib/utils';

// Define Load interface
interface Load {
  id: string;
  rate: number;
  companyDeduction: number;
  driverPay: number;
  locationFrom: string;
  locationTo: string;
  pickupDate?: string;
  deliveryDate?: string;
  dateAdded: string;
  weekPeriod: string;
}

interface LoadReportsProps {
  onBack: () => void;
  user: any;
  userProfile: any;
  deductions: any[];
}

const LoadReports = ({ onBack, user, userProfile, deductions }: LoadReportsProps) => {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [allDeductionTypes, setAllDeductionTypes] = useState<string[]>([]);
  const [weeklyDeductions, setWeeklyDeductions] = useState<Record<string, string>>({});
  const [newLoad, setNewLoad] = useState({
    rate: '',
    companyDeduction: userProfile?.companyDeduction || '',
    locationFrom: '',
    locationTo: '',
    pickupDate: undefined as Date | undefined,
    deliveryDate: undefined as Date | undefined
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loads, setLoads] = useState<Load[]>([]);
  const [extraDeductionTypes, setExtraDeductionTypes] = useState<Array<{id: string, name: string, amount: string}>>([]);
  const [showAddExtraDeduction, setShowAddExtraDeduction] = useState(false);
  const [newExtraDeduction, setNewExtraDeduction] = useState({ name: '', amount: '' });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });

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
      fetchWeeklyDeductions();
      fetchExtraDeductions();
    }
  }, [user, currentWeek]);

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

  const availableDeductionTypes = allDeductionTypes.filter(type => {
    const fixedDeduction = deductions?.find(d => d.type === type && d.isFixed);
    return !fixedDeduction;
  });

  const currentWeekLoads = loads.filter(load => {
    if (!load.dateAdded) return false;
    const loadDate = typeof load.dateAdded === 'string' ? parseISO(load.dateAdded) : load.dateAdded;
    const isInWeek = isWithinInterval(loadDate, { start: weekStart, end: weekEnd });
    console.log('Load date:', loadDate, 'Week range:', weekStart, 'to', weekEnd, 'In week:', isInWeek);
    return isInWeek;
  });

  const fetchLoads = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching loads for user:', user.id);
      
      const { data, error } = await supabase
        .from('load_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      console.log('Database query result:', { data, error });

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
        
        console.log('Formatted loads:', formattedLoads);
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

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
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
          amount: item.amount.toString()
        }));
        setExtraDeductionTypes(extraDeductions);
      }
    } catch (error) {
      console.error('Error fetching extra deductions:', error);
    }
  };
  
  const saveExtraDeduction = async (deduction: {id: string, name: string, amount: string}) => {
    if (!user) return;
    
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
          // Update the local state to reflect the failed save
          setExtraDeductionTypes(prev => prev.filter(item => item.id !== deduction.id));
          return false;
        }
        
        // Update the local state with the actual database ID
        if (data && data[0]) {
          setExtraDeductionTypes(prev => 
            prev.map(item => 
              item.id === deduction.id 
                ? { ...item, id: data[0].id.toString() }
                : item
            )
          );
        }
        
        console.log('Extra deduction saved successfully:', data);
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
        
        console.log('Extra deduction updated successfully');
        return true;
      }
    } catch (error) {
      console.error('Error saving extra deduction:', error);
      // Remove the failed entry from local state
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

  const handleAddExtraDeduction = async () => {
    if (newExtraDeduction.name.trim() && newExtraDeduction.amount.trim()) {
      const newExtra = {
        id: Date.now().toString(),
        name: newExtraDeduction.name.trim(),
        amount: newExtraDeduction.amount
      };
      setExtraDeductionTypes(prev => [...prev, newExtra]);
      setNewExtraDeduction({ name: '', amount: '' });
      setShowAddExtraDeduction(false);
      
      await saveExtraDeduction(newExtra);
    }
  };

  const handleRemoveExtraDeduction = async (id: string) => {
    setExtraDeductionTypes(prev => prev.filter(item => item.id !== id));
    await deleteExtraDeduction(id);
  };

  // Calculate fixed deductions for the current week
  const calculateFixedDeductionsForWeek = (weekStartDate: Date) => {
    if (!deductions) return 0;
    
    const weekStartString = weekStartDate.toISOString().split('T')[0];
    
    // Group deductions by type
    const deductionsByType = deductions
      .filter(d => d.isFixed)
      .reduce((acc, deduction) => {
        if (!acc[deduction.type]) {
          acc[deduction.type] = [];
        }
        acc[deduction.type].push(deduction);
        return acc;
      }, {} as Record<string, typeof deductions>);
    
    let totalFixedDeductions = 0;
    
    // For each deduction type, find the amount that was effective for this week
    Object.values(deductionsByType).forEach(typeDeductions => {
      // Get all deductions for this type that were effective on or before this week
      const applicableDeductions = typeDeductions
        .filter(d => (d.dateAdded || d.created_at) <= weekStartString)
        .sort((a, b) => (b.dateAdded || b.created_at).localeCompare(a.dateAdded || a.created_at));
      
      // Use the most recent amount that was effective for this week
      if (applicableDeductions.length > 0) {
        totalFixedDeductions += applicableDeductions[0].amount;
      }
    });
    
    return totalFixedDeductions;
  };

  const totalGrossPay = currentWeekLoads.reduce((total, load) => total + (load.rate || 0), 0);
  const totalDriverPay = currentWeekLoads.reduce((total, load) => total + (load.driverPay || 0), 0);
  
  const handleAddDeductionFromType = async (type: string, amount: string) => {
    if (amount && parseFloat(amount) > 0) {
      const newExtra = {
        id: `${type}_${Date.now()}`,
        name: type,
        amount: amount
      };
      setExtraDeductionTypes(prev => [...prev, newExtra]);
      const success = await saveExtraDeduction(newExtra);
      if (!success) {
        console.error('Failed to save deduction:', newExtra);
        // The saveExtraDeduction function already removes it from state on failure
      }
    }
  };

  const totalWeeklyDeductions = Object.values(weeklyDeductions).reduce((total, amount) => {
    return total + (parseFloat(amount) || 0);
  }, 0);
  
  const totalExtraDeductions = extraDeductionTypes.reduce((total, extra) => {
    return total + (parseFloat(extra.amount) || 0);
  }, 0);
  
  const totalFixedDeductions = calculateFixedDeductionsForWeek(weekStart);
  const netPay = totalDriverPay - totalWeeklyDeductions - totalExtraDeductions - totalFixedDeductions;

  return (
    <div className="min-h-screen bg-background brutal-grid p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="brutal-border bg-card p-6 brutal-shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="brutal-border brutal-shadow mobile-h mobile-w brutal-hover"
            >
              <ArrowLeft className="mobile-icon" />
            </Button>
            <div>
              <h1 className="brutal-text text-3xl text-foreground">LOAD REPORTS</h1>
              <p className="brutal-mono text-sm text-muted-foreground">WEEK_MANAGEMENT_SYSTEM</p>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="brutal-border-info bg-info p-4 sm:p-6 brutal-shadow">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateWeek('prev')}
              className="brutal-border bg-background text-foreground w-full sm:w-auto"
            >
              ← PREV_WEEK
            </Button>
            <div className="text-center flex-1">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Calendar className="w-6 h-6 text-info-foreground" />
                <span className="brutal-text text-lg sm:text-xl text-info-foreground">CURRENT_WEEK</span>
              </div>
              <p className="brutal-mono text-sm text-info-foreground">
                {format(weekStart, 'MMM_dd')} - {format(weekEnd, 'MMM_dd,_yyyy')}
              </p>
              <p className="brutal-mono text-xs text-info-foreground opacity-80">(SUNDAY_TO_SATURDAY)</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateWeek('next')}
              className="brutal-border bg-background text-foreground w-full sm:w-auto"
            >
              NEXT_WEEK →
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-6">
          <div className="brutal-border-info bg-info p-6 brutal-shadow text-center">
            <Truck className="w-10 h-10 text-info-foreground mx-auto mb-3" />
            <p className="brutal-mono text-sm text-info-foreground">TOTAL_LOADS</p>
            <p className="brutal-text text-3xl text-info-foreground">{currentWeekLoads.length}</p>
            <p className="brutal-mono text-xs text-info-foreground opacity-80">THIS_WEEK</p>
          </div>
          
          <div className="brutal-border-info bg-info p-6 brutal-shadow text-center">
            <DollarSign className="w-12 h-12 text-info-foreground mx-auto mb-4" />
            <p className="brutal-mono text-sm text-info-foreground mb-2">GROSS_PAY</p>
            <p className="brutal-text text-3xl text-info-foreground">${formatCurrency(totalGrossPay)}</p>
            <p className="brutal-mono text-xs text-info-foreground mt-2">{currentWeekLoads.length}_LOADS_THIS_WEEK</p>
          </div>
        </div>

        {/* Add New Load Button */}
        <Button 
          onClick={() => setShowAddForm(true)}
          className="w-full h-16 brutal-border-accent hover:brutal-border-info bg-accent hover:bg-accent text-accent-foreground brutal-hover brutal-active"
          size="lg"
        >
          <Plus className="w-8 h-8 mr-3" />
          <div className="text-left">
            <p className="brutal-text text-xl">ADD_NEW_LOAD</p>
            <p className="brutal-mono text-sm opacity-80">RECORD_LOAD_DATA</p>
          </div>
        </Button>

        {/* Add Load Form */}
        {showAddForm && (
          <div className="brutal-border-secondary bg-secondary p-6 brutal-shadow-lg">
            <h3 className="brutal-text text-xl text-secondary-foreground mb-4">NEW_LOAD_ENTRY</h3>
            <AddLoadForm 
              newLoad={newLoad}
              setNewLoad={setNewLoad}
              onAddLoad={handleAddLoad}
              onCancel={() => setShowAddForm(false)}
              loading={loading}
              weekStart={weekStart}
              weekEnd={weekEnd}
            />
          </div>
        )}

        {/* Load Cards */}
        {currentWeekLoads.length > 0 ? (
          <div className="space-y-4">
            <h3 className="brutal-text text-xl text-foreground">WEEK_LOADS ({currentWeekLoads.length})</h3>
            {currentWeekLoads.map((load) => (
              <div key={load.id} className="brutal-border bg-card p-6 brutal-shadow">
                <LoadCard 
                  load={load} 
                  onDelete={handleDeleteLoad}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="brutal-border bg-muted p-8 brutal-shadow text-center">
            <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="brutal-text text-xl text-muted-foreground">NO_LOADS_RECORDED</p>
            <p className="brutal-mono text-sm text-muted-foreground">FOR_THIS_WEEK</p>
          </div>
        )}

        {/* Weekly Summary - Only show when there are loads */}
        {currentWeekLoads.length > 0 && (
          <WeeklySummary 
            weeklyDeductions={weeklyDeductions}
            onWeeklyDeductionChange={handleWeeklyDeductionChange}
            availableDeductionTypes={availableDeductionTypes}
            fixedDeductions={deductions?.filter(d => d.isFixed) || []}
            totalGrossPay={totalGrossPay}
            totalDriverPay={totalDriverPay}
            totalWeeklyDeductions={totalWeeklyDeductions}
            totalFixedDeductions={totalFixedDeductions}
            totalExtraDeductions={totalExtraDeductions}
            netPay={netPay}
            extraDeductionTypes={extraDeductionTypes}
            onAddExtraDeduction={handleAddExtraDeduction}
            onAddDeductionFromType={handleAddDeductionFromType}
            onRemoveExtraDeduction={handleRemoveExtraDeduction}
            showAddExtraDeduction={showAddExtraDeduction}
            setShowAddExtraDeduction={setShowAddExtraDeduction}
            newExtraDeduction={newExtraDeduction}
            setNewExtraDeduction={setNewExtraDeduction}
          />
        )}
      </div>
    </div>
  );
};

export default LoadReports;