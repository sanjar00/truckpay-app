import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, DollarSign, Info, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { format, startOfYear, subWeeks, parseISO, isWithinInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { getUserWeekStart, getUserWeekEnd } from '@/lib/weeklyPeriodUtils';

const IRS_RATE_FULL = 80.00;
const IRS_RATE_PARTIAL = 59.50; // 80 * 0.75

interface Load {
  pickupDate?: string;
  deliveryDate?: string;
  locationFrom: string;
  locationTo: string;
  rate: number;
}

interface PerDiemResult {
  fullDays: number;
  partialDays: number;
  totalDeduction: number;
  estimatedTaxSavings: number;
}

function calculatePerDiem(loads: Load[]): PerDiemResult {
  const fullDatesSet = new Set<string>();
  const partialDatesSet = new Set<string>();

  loads.forEach((load) => {
    if (!load.pickupDate || !load.deliveryDate) return;
    const pickup = new Date(load.pickupDate + 'T00:00:00');
    const delivery = new Date(load.deliveryDate + 'T00:00:00');

    partialDatesSet.add(load.pickupDate);
    partialDatesSet.add(load.deliveryDate);

    const current = new Date(pickup);
    current.setDate(current.getDate() + 1);
    while (current < delivery) {
      fullDatesSet.add(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  });

  // Full days that are also partial = partial wins (remove from full)
  partialDatesSet.forEach((d) => fullDatesSet.delete(d));

  const fullDays = fullDatesSet.size;
  const partialDays = partialDatesSet.size;
  const totalDeduction = fullDays * IRS_RATE_FULL + partialDays * IRS_RATE_PARTIAL;
  const estimatedTaxSavings = totalDeduction * 0.25;

  return { fullDays, partialDays, totalDeduction, estimatedTaxSavings };
}

interface PerDiemCalculatorProps {
  onBack: () => void;
  userProfile: any;
}

const PerDiemCalculator = ({ onBack, userProfile }: PerDiemCalculatorProps) => {
  const { user } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('ytd');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();

  const getDateRange = () => {
    const today = new Date();
    const currentWeekStart = getUserWeekStart(today, userProfile);
    switch (periodFilter) {
      case 'ytd':
        return { start: startOfYear(today), end: today };
      case 'last4':
        return {
          start: getUserWeekStart(subWeeks(currentWeekStart, 3), userProfile),
          end: getUserWeekEnd(currentWeekStart, userProfile),
        };
      case 'custom':
        if (customDateRange?.from && customDateRange?.to) {
          return { start: customDateRange.from, end: customDateRange.to };
        }
        return { start: startOfYear(today), end: today };
      default:
        return { start: startOfYear(today), end: today };
    }
  };

  const { start: dateStart, end: dateEnd } = getDateRange();

  useEffect(() => {
    if (!user) return;
    const fetchLoads = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('load_reports')
          .select('pickup_date, delivery_date, location_from, location_to, rate')
          .eq('user_id', user.id);
        if (error) throw error;
        if (data) {
          setLoads(
            data.map((l) => ({
              pickupDate: l.pickup_date,
              deliveryDate: l.delivery_date,
              locationFrom: l.location_from,
              locationTo: l.location_to,
              rate: l.rate,
            }))
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLoads();
  }, [user]);

  const filteredLoads = loads.filter((load) => {
    if (!load.pickupDate) return false;
    const d = parseISO(load.pickupDate);
    return isWithinInterval(d, { start: dateStart, end: dateEnd });
  });

  const result = calculatePerDiem(filteredLoads);
  const totalDays = result.fullDays + result.partialDays;

  const handleExport = () => {
    const lines = [
      'TRUCKPAY - PER DIEM REPORT',
      `Period: ${format(dateStart, 'MMM dd, yyyy')} - ${format(dateEnd, 'MMM dd, yyyy')}`,
      `Generated: ${format(new Date(), 'MMM dd, yyyy')}`,
      '',
      `Full Days Away: ${result.fullDays} × $${IRS_RATE_FULL} = $${(result.fullDays * IRS_RATE_FULL).toFixed(2)}`,
      `Partial Days: ${result.partialDays} × $${IRS_RATE_PARTIAL} = $${(result.partialDays * IRS_RATE_PARTIAL).toFixed(2)}`,
      `Total Per Diem Deduction: $${formatCurrency(result.totalDeduction)}`,
      `Estimated Tax Savings (25% bracket): $${formatCurrency(result.estimatedTaxSavings)}`,
      '',
      'Based on IRS Publication 463. Consult a tax professional before filing.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'per-diem-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background brutal-grid p-3 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="brutal-border brutal-shadow brutal-hover">
            <ArrowLeft className="mobile-icon" />
          </Button>
          <div>
            <h1 className="brutal-text text-2xl sm:text-3xl font-bold">PER DIEM TRACKER</h1>
            <p className="brutal-mono text-sm text-muted-foreground">IRS MEAL & INCIDENTAL DEDUCTION</p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="brutal-border brutal-shadow bg-accent/10">
          <CardContent className="p-4 flex gap-3">
            <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <p className="brutal-mono text-xs text-foreground">
              IRS allows <strong>$80/day</strong> (full day) or <strong>$59.50/day</strong> (partial day, 75%) for days
              away from home on business. Auto-calculated from your load pickup/delivery dates.
            </p>
          </CardContent>
        </Card>

        {/* Period Filter */}
        <Card className="brutal-border brutal-shadow bg-background">
          <CardHeader className="pb-3">
            <CardTitle className="brutal-text text-lg font-bold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              PERIOD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="brutal-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ytd">YEAR TO DATE</SelectItem>
                <SelectItem value="last4">LAST 4 WEEKS</SelectItem>
                <SelectItem value="custom">CUSTOM RANGE</SelectItem>
              </SelectContent>
            </Select>
            {periodFilter === 'custom' && (
              <DatePickerWithRange date={customDateRange} setDate={setCustomDateRange} />
            )}
            <p className="brutal-mono text-xs text-muted-foreground">
              {format(dateStart, 'MMM dd, yyyy')} — {format(dateEnd, 'MMM dd, yyyy')} · {filteredLoads.length} loads
            </p>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <Card className="brutal-border brutal-shadow">
            <CardContent className="p-8 text-center">
              <p className="brutal-text text-xl animate-pulse">CALCULATING...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="brutal-border brutal-shadow bg-background">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="brutal-mono text-xs text-muted-foreground">TOTAL DAYS AWAY</p>
                  <p className="brutal-text text-3xl font-bold">{totalDays}</p>
                </CardContent>
              </Card>
              <Card className="brutal-border brutal-shadow bg-background">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <p className="brutal-mono text-xs text-muted-foreground">FULL / PARTIAL</p>
                  <p className="brutal-text text-2xl font-bold">
                    {result.fullDays}
                    <span className="text-muted-foreground text-lg"> / </span>
                    {result.partialDays}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Deduction Card */}
            <Card className="brutal-border brutal-shadow-lg bg-success/10">
              <CardContent className="p-6 text-center">
                <DollarSign className="w-10 h-10 mx-auto mb-3 text-green-700" />
                <p className="brutal-mono text-sm text-muted-foreground mb-1">TOTAL PER DIEM DEDUCTION</p>
                <p className="brutal-text text-4xl font-bold text-green-700">${formatCurrency(result.totalDeduction)}</p>
                <div className="mt-4 brutal-border p-3 bg-background">
                  <p className="brutal-mono text-xs text-muted-foreground">EST. TAX SAVINGS (25% BRACKET)</p>
                  <p className="brutal-text text-2xl font-bold text-primary">
                    ${formatCurrency(result.estimatedTaxSavings)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown */}
            <Card className="brutal-border brutal-shadow bg-background">
              <CardHeader className="pb-3">
                <CardTitle className="brutal-text text-lg font-bold">BREAKDOWN</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center brutal-border p-3">
                  <div>
                    <p className="brutal-text text-sm font-bold">FULL DAYS</p>
                    <p className="brutal-mono text-xs text-muted-foreground">{result.fullDays} × $80.00/day</p>
                  </div>
                  <p className="brutal-text text-lg font-bold">${formatCurrency(result.fullDays * IRS_RATE_FULL)}</p>
                </div>
                <div className="flex justify-between items-center brutal-border p-3">
                  <div>
                    <p className="brutal-text text-sm font-bold">PARTIAL DAYS</p>
                    <p className="brutal-mono text-xs text-muted-foreground">{result.partialDays} × $59.50/day</p>
                  </div>
                  <p className="brutal-text text-lg font-bold">${formatCurrency(result.partialDays * IRS_RATE_PARTIAL)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Export */}
            <Button
              onClick={handleExport}
              className="w-full brutal-border bg-secondary hover:bg-secondary text-secondary-foreground brutal-shadow brutal-hover brutal-active brutal-text"
              disabled={result.totalDeduction === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              EXPORT PER DIEM REPORT
            </Button>

            {/* Disclaimer */}
            <Card className="brutal-border bg-muted/30">
              <CardContent className="p-4">
                <p className="brutal-mono text-xs text-muted-foreground">
                  ⚠️ Based on IRS Publication 463 (2025 rates). Days calculated from load pickup/delivery dates.
                  Consult a qualified tax professional before filing. Rates may vary based on travel location.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PerDiemCalculator;
