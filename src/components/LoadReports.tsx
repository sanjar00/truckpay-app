
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
  // Fix: Remove duplicate state declarations and use consistent week start
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

  // Fix: Use consistent week start configuration
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
      fetchExtraDeductions(); // Add this line
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

  // Fetch weekly deductions for current week
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

  // Save weekly deduction to database
  const saveWeeklyDeduction = async (type: string, amount: string) => {
    if (!user) return;
    
    try {
      const weekStartDate = weekStart.toISOString().split('T')[0];
      
      if (!amount || parseFloat(amount) === 0) {
        // Delete if amount is 0 or empty
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
        // Upsert the deduction
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

  // Handle weekly deduction changes with auto-save
  const handleWeeklyDeductionChange = async (type: string, amount: string) => {
    setWeeklyDeductions(prev => ({
      ...prev,
      [type]: amount
    }));
    
    // Auto-save after a short delay (debounced)
    clearTimeout((window as any).deductionSaveTimeout);
    (window as any).deductionSaveTimeout = setTimeout(() => {
      saveWeeklyDeduction(type, amount);
    }, 1000); // Save 1 second after user stops typing
  };

  // Get deduction types that are not marked as fixed
  const availableDeductionTypes = allDeductionTypes.filter(type => {
    const fixedDeduction = deductions?.find(d => d.type === type && d.isFixed);
    return !fixedDeduction;
  });

  // Filter loads for current week - client-side filtering only
  const currentWeekLoads = loads.filter(load => {
    if (!load.dateAdded) return false;
    const loadDate = typeof load.dateAdded === 'string' ? parseISO(load.dateAdded) : load.dateAdded;
    const isInWeek = isWithinInterval(loadDate, { start: weekStart, end: weekEnd });
    console.log('Load date:', loadDate, 'Week range:', weekStart, 'to', weekEnd, 'In week:', isInWeek);
    return isInWeek;
  });

  // Fixed fetchLoads function - remove database date filtering to avoid conflicts
  const fetchLoads = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching loads for user:', user.id);
      
      // Remove date filtering from database query - let client-side handle it
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
        
        // Use date-only format to match database structure
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

  // Add function to handle extra deduction types
  // Add these functions after the existing saveWeeklyDeduction function (around line 150)
  
  // Fetch extra deductions for current week
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
  
  // Save extra deduction to database
  const saveExtraDeduction = async (deduction: {id: string, name: string, amount: string}) => {
    if (!user) return;
    
    try {
      const weekStartDate = weekStart.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('weekly_extra_deductions')
        .upsert({
          id: parseInt(deduction.id),
          user_id: user.id,
          week_start: weekStartDate,
          name: deduction.name,
          amount: parseFloat(deduction.amount),
          updated_at: new Date().toISOString()
        });
  
      if (error) {
        console.error('Error saving extra deduction:', error);
      }
    } catch (error) {
      console.error('Error saving extra deduction:', error);
    }
  };
  
  // Delete extra deduction from database
  const deleteExtraDeduction = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('weekly_extra_deductions')
        .delete()
        .eq('id', parseInt(id))
        .eq('user_id', user.id);
  
      if (error) {
        console.error('Error deleting extra deduction:', error);
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
      
      // Save to database
      await saveExtraDeduction(newExtra);
    }
  };

  const handleRemoveExtraDeduction = async (id: string) => {
    setExtraDeductionTypes(prev => prev.filter(item => item.id !== id));
    
    // Delete from database
    await deleteExtraDeduction(id);
  };

  // Calculate weekly summary totals
  const totalGrossPay = currentWeekLoads.reduce((total, load) => total + (load.rate || 0), 0);
  const totalDriverPay = currentWeekLoads.reduce((total, load) => total + (load.driverPay || 0), 0);
  
  // Fix: Calculate total weekly deductions (variable amounts)
  const totalWeeklyDeductions = Object.values(weeklyDeductions).reduce((total, amount) => {
    return total + (parseFloat(amount) || 0);
  }, 0);
  
  // Fix: Calculate total extra deductions
  const totalExtraDeductions = extraDeductionTypes.reduce((total, extra) => {
    return total + (parseFloat(extra.amount) || 0);
  }, 0);
  
  // Calculate total fixed deductions
  const totalFixedDeductions = deductions
    ?.filter(d => d.isFixed)
    .reduce((total, deduction) => total + (deduction.amount || 0), 0) || 0;
  
  // Calculate net pay after both weekly and fixed deductions
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
              className="brutal-border-accent bg-accent text-accent-foreground"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              BACK
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
            <p className="brutal-mono text-sm text-info-foreground mb-2">TOTAL_DRIVER_PAY</p>
            <p className="brutal-text text-3xl text-info-foreground">${formatCurrency(totalDriverPay)}</p>
            <p className="brutal-mono text-xs text-info-foreground mt-2">{currentWeekLoads.length}_LOADS_THIS_WEEK</p>
          </div>
        </div>

        {/* Add New Load Button */}
        <Button 
          onClick={() => setShowAddForm(true)}
          className="w-full h-16 brutal-border-accent hover: brutal-border-info bg-accent hover:bg-accent text-accent-foreground brutal-hover brutal-active"
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
            totalDriverPay={totalDriverPay}
            totalWeeklyDeductions={totalWeeklyDeductions}
            totalFixedDeductions={totalFixedDeductions}
            totalExtraDeductions={totalExtraDeductions}
            netPay={netPay}
            extraDeductionTypes={extraDeductionTypes}
            onAddExtraDeduction={handleAddExtraDeduction}
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