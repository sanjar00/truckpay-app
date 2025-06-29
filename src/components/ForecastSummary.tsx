import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, Minus, Calculator, Calendar, Filter, Truck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import LoadCard from './LoadCard';
import { useAuth } from '@/hooks/useAuth';

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

interface Deduction {
  id: string;
  type: string;
  amount: number;
  isFixed: boolean;
  isCustomType?: boolean;
  dateAdded?: string;
}

interface ForecastSummaryProps {
  onBack: () => void;
  deductions: Deduction[];
}

const ForecastSummary = ({ onBack, deductions }: ForecastSummaryProps) => {
  const { user } = useAuth();
  const [periodFilter, setPeriodFilter] = useState('last2');
  const [customDateRange, setCustomDateRange] = useState<{from: Date, to: Date} | undefined>();
  const [loads, setLoads] = useState<Load[]>([]);
  const [weeklyDeductions, setWeeklyDeductions] = useState<Record<string, Record<string, number>>>({});
  const [extraDeductions, setExtraDeductions] = useState<Record<string, Array<{id: string, name: string, amount: number}>>>({});
  const [loading, setLoading] = useState(false);

  // Calculate date range based on filter
  const getDateRange = () => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    
    switch (periodFilter) {
      case 'last2':
        return {
          start: startOfWeek(subWeeks(currentWeekStart, 1), { weekStartsOn: 0 }),
          end: endOfWeek(currentWeekStart, { weekStartsOn: 0 })
        };
      case 'last3':
        return {
          start: startOfWeek(subWeeks(currentWeekStart, 2), { weekStartsOn: 0 }),
          end: endOfWeek(currentWeekStart, { weekStartsOn: 0 })
        };
      case 'last4':
        return {
          start: startOfWeek(subWeeks(currentWeekStart, 3), { weekStartsOn: 0 }),
          end: endOfWeek(currentWeekStart, { weekStartsOn: 0 })
        };
      case 'custom':
        // Add validation for custom date range
        if (customDateRange && customDateRange.from && customDateRange.to) {
          const fromDate = new Date(customDateRange.from);
          const toDate = new Date(customDateRange.to);
          
          // Check if dates are valid
          if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
            return {
              start: startOfWeek(fromDate, { weekStartsOn: 0 }),
              end: endOfWeek(toDate, { weekStartsOn: 0 })
            };
          }
        }
        // Fallback to current week if custom range is invalid
        return {
          start: currentWeekStart,
          end: endOfWeek(currentWeekStart, { weekStartsOn: 0 })
        };
      default:
        return {
          start: currentWeekStart,
          end: endOfWeek(currentWeekStart, { weekStartsOn: 0 })
        };
    }
  };

  const { start: dateStart, end: dateEnd } = getDateRange();

  // Add validation before using dates in format function
  const isValidDateStart = dateStart && !isNaN(dateStart.getTime());
  const isValidDateEnd = dateEnd && !isNaN(dateEnd.getTime());

  // Fetch loads for the selected period
  const fetchLoads = async () => {
    if (!user) return;
    
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Fetch weekly deductions for the selected period
  const fetchWeeklyDeductions = async () => {
    if (!user) return;
    
    try {
      // Get all weeks in the date range
      const weeks = [];
      let currentWeek = startOfWeek(dateStart, { weekStartsOn: 0 });
      while (currentWeek <= dateEnd) {
        weeks.push(currentWeek.toISOString().split('T')[0]);
        currentWeek = startOfWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 0 });
      }

      const { data, error } = await supabase
        .from('weekly_deductions')
        .select('*')
        .eq('user_id', user.id)
        .in('week_start', weeks);

      if (error) {
        console.error('Error fetching weekly deductions:', error);
        return;
      }

      if (data) {
        const deductionsMap: Record<string, Record<string, number>> = {};
        data.forEach(deduction => {
          if (!deductionsMap[deduction.week_start]) {
            deductionsMap[deduction.week_start] = {};
          }
          deductionsMap[deduction.week_start][deduction.deduction_type] = deduction.amount;
        });
        setWeeklyDeductions(deductionsMap);
      }
    } catch (error) {
      console.error('Error fetching weekly deductions:', error);
    }
  };

  // Fetch extra deductions for the selected period
  const fetchExtraDeductions = async () => {
    if (!user) return;
    
    try {
      // Get all weeks in the date range
      const weeks = [];
      let currentWeek = startOfWeek(dateStart, { weekStartsOn: 0 });
      while (currentWeek <= dateEnd) {
        weeks.push(currentWeek.toISOString().split('T')[0]);
        currentWeek = startOfWeek(new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 0 });
      }

      const { data, error } = await supabase
        .from('weekly_extra_deductions')
        .select('*')
        .eq('user_id', user.id)
        .in('week_start', weeks);

      if (error) {
        console.error('Error fetching extra deductions:', error);
        return;
      }

      if (data) {
        const extraMap: Record<string, Array<{id: string, name: string, amount: number}>> = {};
        data.forEach(extra => {
          if (!extraMap[extra.week_start]) {
            extraMap[extra.week_start] = [];
          }
          extraMap[extra.week_start].push({
            id: extra.id.toString(),
            name: extra.name,
            amount: extra.amount
          });
        });
        setExtraDeductions(extraMap);
      }
    } catch (error) {
      console.error('Error fetching extra deductions:', error);
    }
  };

  // Filter loads for the selected period
  const filteredLoads = loads.filter(load => {
    if (!load.dateAdded) return false;
    const loadDate = typeof load.dateAdded === 'string' ? parseISO(load.dateAdded) : load.dateAdded;
    return isWithinInterval(loadDate, { start: dateStart, end: dateEnd });
  });

  // Calculate totals with safety checks
  const totalGrossPay = filteredLoads.reduce((total, load) => {
    const rate = load.rate || 0;
    return total + (isNaN(rate) ? 0 : rate);
  }, 0);
  
  const totalDriverPay = filteredLoads.reduce((total, load) => {
    const driverPay = load.driverPay || 0;
    return total + (isNaN(driverPay) ? 0 : driverPay);
  }, 0);
  
  // Calculate total weekly deductions across all weeks
  const totalWeeklyDeductions = Object.values(weeklyDeductions).reduce((total, weekDeductions) => {
    return total + Object.values(weekDeductions).reduce((weekTotal, amount) => {
      return weekTotal + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, 0);
  
  // Calculate total extra deductions across all weeks
  const totalExtraDeductions = Object.values(extraDeductions).reduce((total, weekExtras) => {
    return total + weekExtras.reduce((weekTotal, extra) => {
      const amount = extra.amount || 0;
      return weekTotal + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, 0);
  
  // Calculate total fixed deductions (multiply by number of weeks)
  const numberOfWeeks = isValidDateStart && isValidDateEnd 
    ? Math.ceil((dateEnd.getTime() - dateStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    : 1; // Default to 1 week if dates are invalid
  const totalFixedDeductions = deductions
    ?.filter(d => d.isFixed)
    .reduce((total, deduction) => {
      const amount = deduction.amount || 0;
      return total + (isNaN(amount) ? 0 : amount);
    }, 0) * numberOfWeeks || 0;
  
  const totalDeductions = (totalWeeklyDeductions || 0) + (totalExtraDeductions || 0) + (totalFixedDeductions || 0);
  const netIncome = (totalDriverPay || 0) - (totalDeductions || 0);
  const netIncomePercentage = totalDriverPay > 0 ? ((netIncome / totalDriverPay) * 100) : 0;

  // Fetch data when period changes
  useEffect(() => {
    if (user) {
      fetchLoads();
      fetchWeeklyDeductions();
      fetchExtraDeductions();
    }
  }, [user, periodFilter, customDateRange]);

  const handleDeleteLoad = async (loadId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('load_reports')
        .delete()
        .eq('id', loadId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting load:', error);
        return;
      }

      // Refresh loads
      fetchLoads();
    } catch (error) {
      console.error('Error deleting load:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background brutal-grid p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="brutal-border brutal-shadow mobile-h mobile-w brutal-hover"
          >
            <ArrowLeft className="mobile-icon" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="mobile-text-2xl brutal-text font-bold mobile-truncate mb-2">
              EARNINGS SUMMARY
            </h1>
            <p className="mobile-text-sm text-muted-foreground mobile-truncate">
              Multi-period income analysis
            </p>
          </div>
        </div>

        {/* Period Filter */}
        <Card className="brutal-border brutal-shadow bg-background">
          <CardHeader className="pb-4">
            <CardTitle className="mobile-text-xl brutal-text font-bold flex items-center gap-2">
              <Filter className="mobile-icon" />
              PERIOD FILTER
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="brutal-mono text-sm text-foreground mb-2 block">SELECT PERIOD</label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="brutal-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last2">LAST 2 WEEKS</SelectItem>
                    <SelectItem value="last3">LAST 3 WEEKS</SelectItem>
                    <SelectItem value="last4">LAST 4 WEEKS</SelectItem>
                    <SelectItem value="custom">CUSTOM RANGE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {periodFilter === 'custom' && (
                <div>
                  <label className="brutal-mono text-sm text-foreground mb-2 block">DATE RANGE</label>
                  <DatePickerWithRange 
                    date={customDateRange}
                    setDate={setCustomDateRange}
                  />
                </div>
              )}
            </div>            
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="mobile-icon text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="brutal-mono text-sm text-muted-foreground">SELECTED PERIOD:</span>
                </div>
                <p className="brutal-text text-base">
                  {isValidDateStart && isValidDateEnd 
                    ? `${format(dateStart, 'MMM dd, yyyy')} - ${format(dateEnd, 'MMM dd, yyyy')}`
                    : 'Invalid date range selected'
                  }
                </p>
                <p className="brutal-mono text-xs text-muted-foreground mt-1">
                  {isValidDateStart && isValidDateEnd 
                    ? `${numberOfWeeks} week${numberOfWeeks > 1 ? 's' : ''} • ${filteredLoads.length} load${filteredLoads.length !== 1 ? 's' : ''}`
                    : 'Please select a valid date range'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Income Highlight Card */}
        <Card className="brutal-border brutal-shadow-lg bg-success/10 mb-8">
          <CardContent className="p-6 text-center">
            <TrendingUp className="mobile-icon-lg mx-auto mb-4 text-success" />
            <p className="mobile-text-base text-muted-foreground mb-2 mobile-text-wrap">
              TOTAL NET INCOME
            </p>
            <p className="mobile-text-3xl brutal-text font-bold text-success mb-4">
              ${formatCurrency(netIncome)}
            </p>
            <div className="flex items-center justify-center gap-2 mobile-text-sm text-muted-foreground">
              <Calculator className="mobile-icon" />
              <span className="mobile-text-wrap">
                {netIncomePercentage.toFixed(1)}% of driver pay retained
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Income Breakdown Section */}
        <Card className="brutal-border brutal-shadow bg-background mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="mobile-text-xl brutal-text font-bold">
              INCOME BREAKDOWN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gross Pay */}
            <div className="brutal-border brutal-shadow p-4 bg-primary/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-4 h-4 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="mobile-text-base brutal-text font-medium mobile-truncate">
                    TOTAL GROSS PAY
                  </span>
                </div>
                <span className="mobile-text-xl brutal-text font-bold text-primary">
                  ${formatCurrency(totalGrossPay)}
                </span>
              </div>
            </div>

            {/* Driver Pay */}
            <div className="brutal-border brutal-shadow p-4 bg-success/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-4 h-4 bg-success rounded-full flex-shrink-0"></div>
                  <span className="mobile-text-base brutal-text font-medium mobile-text-wrap">
                    DRIVER PAY (AFTER COMPANY CUT)
                  </span>
                </div>
                <span className="mobile-text-xl brutal-text font-bold text-success">
                  ${formatCurrency(totalDriverPay)}
                </span>
              </div>
            </div>

            {/* Deductions Breakdown */}
            <div className="space-y-2">
              {totalWeeklyDeductions > 0 && (
                <div className="brutal-border brutal-shadow p-4 bg-warning/5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Minus className="mobile-icon text-warning flex-shrink-0" />
                      <span className="mobile-text-base brutal-text font-medium mobile-truncate">
                        WEEKLY DEDUCTIONS
                      </span>
                    </div>
                    <span className="mobile-text-xl brutal-text font-bold text-warning">
                      -${formatCurrency(totalWeeklyDeductions)}
                    </span>
                  </div>
                </div>
              )}
              
              {totalExtraDeductions > 0 && (
                <div className="brutal-border brutal-shadow p-4 bg-warning/5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Minus className="mobile-icon text-warning flex-shrink-0" />
                      <span className="mobile-text-base brutal-text font-medium mobile-truncate">
                        EXTRA DEDUCTIONS
                      </span>
                    </div>
                    <span className="mobile-text-xl brutal-text font-bold text-warning">
                      -${formatCurrency(totalExtraDeductions)}
                    </span>
                  </div>
                </div>
              )}
              
              {totalFixedDeductions > 0 && (
                <div className="brutal-border brutal-shadow p-4 bg-warning/5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Minus className="mobile-icon text-warning flex-shrink-0" />
                      <span className="mobile-text-base brutal-text font-medium mobile-truncate">
                        FIXED DEDUCTIONS ({numberOfWeeks} weeks)
                      </span>
                    </div>
                    <span className="mobile-text-xl brutal-text font-bold text-warning">
                      -${formatCurrency(totalFixedDeductions)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Net Income */}
            <div className="brutal-border brutal-shadow-lg p-4 bg-success/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <DollarSign className="mobile-icon text-success flex-shrink-0" />
                  <span className="mobile-text-lg brutal-text font-bold mobile-truncate">
                    NET INCOME
                  </span>
                </div>
                <span className="mobile-text-2xl brutal-text font-bold text-success">
                  ${formatCurrency(netIncome)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loads List */}
        {filteredLoads.length > 0 && (
          <Card className="brutal-border brutal-shadow bg-background">
            <CardHeader className="pb-4">
              <CardTitle className="mobile-text-xl brutal-text font-bold flex items-center gap-2">
                <FileText className="mobile-icon" />
                LOADS ({filteredLoads.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredLoads.map((load) => (
                <div key={load.id} className="brutal-border bg-card p-4 brutal-shadow">
                  <LoadCard 
                    load={load} 
                    onDelete={handleDeleteLoad}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {filteredLoads.length === 0 && !loading && (
          <Card className="brutal-border brutal-shadow bg-muted/20">
            <CardContent className="p-8 text-center">
              <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="brutal-text text-xl text-muted-foreground mb-2">NO LOADS FOUND</p>
              <p className="brutal-mono text-sm text-muted-foreground">
                FOR SELECTED PERIOD
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="brutal-border brutal-shadow bg-background">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">
                <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="brutal-text text-xl text-muted-foreground">LOADING...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ForecastSummary;