import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { differenceInCalendarDays, startOfWeek } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface WeeklyForecastCardProps {
  user: any;
  userProfile: any;
  weekStart: Date;
  weekEnd: Date;
  currentGross: number;
  currentDriverPay: number;
  loadCount: number;
  fixedDeductionsWeeklyTotal: number;
  totalWeeklyDeductions?: number;
  totalExtraDeductions?: number;
}

const WeeklyForecastCard = ({
  user,
  userProfile,
  weekStart,
  weekEnd,
  currentGross,
  currentDriverPay,
  loadCount,
  fixedDeductionsWeeklyTotal,
  totalWeeklyDeductions = 0,
  totalExtraDeductions = 0,
}: WeeklyForecastCardProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState<string>(() => {
    return localStorage.getItem('truckpay_weekly_goal') || '';
  });
  const [historicalAvg, setHistoricalAvg] = useState<number | null>(null);
  const [variableExpenseRatio, setVariableExpenseRatio] = useState<number>(0);

  const today = new Date();
  const daysElapsed = Math.max(1, differenceInCalendarDays(today, weekStart) + 1);
  const daysRemaining = Math.max(0, differenceInCalendarDays(weekEnd, today));
  const dailyRate = currentGross / daysElapsed;
  const projectedGross = currentGross + dailyRate * daysRemaining;

  // Current week variable expenses (fuel, tolls, maintenance, etc.)
  const currentWeekVariableExpenses = totalWeeklyDeductions + totalExtraDeductions;

  // Estimate remaining variable expenses based on historical ratio
  const projectedVariableExpenses = projectedGross > 0
    ? currentWeekVariableExpenses + (projectedGross - currentGross) * variableExpenseRatio
    : currentWeekVariableExpenses;

  const companyDeduction = (userProfile?.companyDeduction || 0) / 100;
  const projectedDriverPay = projectedGross * (1 - companyDeduction);
  const projectedNet = projectedDriverPay - fixedDeductionsWeeklyTotal - projectedVariableExpenses;

  const confidence = daysElapsed >= 5 ? 'HIGH' : daysElapsed >= 3 ? 'MODERATE' : 'LOW';
  const confidenceColor =
    confidence === 'HIGH' ? 'text-green-600' : confidence === 'MODERATE' ? 'text-yellow-600' : 'text-red-500';

  const vsAvg =
    historicalAvg && historicalAvg > 0
      ? ((projectedGross - historicalAvg) / historicalAvg) * 100
      : null;

  const goal = parseFloat(weeklyGoal);
  const isOnTrack = goal > 0 && projectedNet >= goal;
  const avgDriverPayPerLoad = loadCount > 0 ? currentDriverPay / loadCount : 0;
  const remainingNetNeeded = goal - projectedNet;
  const loadsNeeded =
    goal > 0 && !isOnTrack && avgDriverPayPerLoad > 0
      ? Math.ceil(remainingNetNeeded / avgDriverPayPerLoad)
      : null;

  useEffect(() => {
    if (!user) return;
    const fetchHistorical = async () => {
      // Fetch all loads before this week
      const { data: loadData } = await supabase
        .from('load_reports')
        .select('rate, date_added')
        .eq('user_id', user.id)
        .lt('date_added', weekStart.toISOString());

      if (!loadData || loadData.length === 0) return;

      // Group loads by week and calculate gross per week
      const weekMap: Record<string, number> = {};
      loadData.forEach((load) => {
        const d = new Date(load.date_added);
        const ws = startOfWeek(d, { weekStartsOn: 0 });
        const wk = ws.toISOString().split('T')[0];
        weekMap[wk] = (weekMap[wk] || 0) + load.rate;
      });

      const weeks = Object.keys(weekMap);
      if (weeks.length > 0) {
        const weeksArray = Object.values(weekMap);
        setHistoricalAvg(weeksArray.reduce((a, b) => a + b, 0) / weeksArray.length);

        // Fetch variable expenses for the same weeks to learn the ratio
        const { data: expenseData } = await supabase
          .from('weekly_deductions')
          .select('week_start, amount')
          .eq('user_id', user.id)
          .in('week_start', weeks);

        const { data: extraExpenseData } = await supabase
          .from('weekly_extra_deductions')
          .select('week_start, amount')
          .eq('user_id', user.id)
          .in('week_start', weeks);

        // Sum expenses per week
        const weekExpenses: Record<string, number> = {};
        if (expenseData) {
          expenseData.forEach(exp => {
            weekExpenses[exp.week_start] = (weekExpenses[exp.week_start] || 0) + exp.amount;
          });
        }
        if (extraExpenseData) {
          extraExpenseData.forEach(exp => {
            weekExpenses[exp.week_start] = (weekExpenses[exp.week_start] || 0) + exp.amount;
          });
        }

        // Calculate average expense-to-gross ratio (only from weeks with data)
        let totalExpenses = 0;
        let totalGrossWithExpenses = 0;
        weeks.forEach(week => {
          const expenses = weekExpenses[week] || 0;
          const gross = weekMap[week];
          if (gross > 0) {
            totalExpenses += expenses;
            totalGrossWithExpenses += gross;
          }
        });

        if (totalGrossWithExpenses > 0) {
          const ratio = totalExpenses / totalGrossWithExpenses;
          // Cap ratio at reasonable max (e.g., 50% — expenses shouldn't exceed half of gross)
          setVariableExpenseRatio(Math.min(ratio, 0.5));
        }
      }
    };
    fetchHistorical();
  }, [user, weekStart]);

  const saveGoal = (val: string) => {
    setWeeklyGoal(val);
    localStorage.setItem('truckpay_weekly_goal', val);
  };

  return (
    <Card className="brutal-border brutal-shadow bg-background">
      <CardHeader className="cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <CardTitle className="mobile-text-xl brutal-text font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <TrendingUp className="mobile-icon text-primary" />
            This Week's Forecast
          </span>
          <span className="flex items-center gap-2">
            <span className={`brutal-mono text-xs ${confidenceColor}`}>{confidence}</span>
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </span>
        </CardTitle>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="brutal-border p-3 bg-primary/5">
              <p className="brutal-mono text-xs text-muted-foreground">Projected Gross</p>
              <p className="brutal-text text-lg font-bold text-primary">${formatCurrency(projectedGross)}</p>
            </div>
            <div className="brutal-border p-3 bg-success/5">
              <p className="brutal-mono text-xs text-muted-foreground">Projected Take-Home</p>
              <p className="brutal-text text-lg font-bold text-green-700">${formatCurrency(Math.max(0, projectedNet))}</p>
            </div>
            <div className="brutal-border p-3 bg-accent/10 col-span-2 sm:col-span-1">
              <p className="brutal-mono text-xs text-muted-foreground">Days Left</p>
              <p className="brutal-text text-lg font-bold">{daysRemaining}</p>
            </div>
          </div>

          {/* Expense breakdown */}
          <div className="text-xs brutal-mono text-muted-foreground space-y-1">
            <p>• Fixed costs: ${formatCurrency(fixedDeductionsWeeklyTotal)}</p>
            <p>• Variable expenses: ${formatCurrency(Math.round(projectedVariableExpenses * 100) / 100)}</p>
            <p className="text-foreground font-semibold">Total deductions: ${formatCurrency(fixedDeductionsWeeklyTotal + Math.round(projectedVariableExpenses * 100) / 100)}</p>
          </div>

          {vsAvg !== null && (
            <div className={`brutal-border p-3 flex items-center gap-2 ${vsAvg >= 0 ? 'bg-success/5' : 'bg-destructive/5'}`}>
              {vsAvg >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className="brutal-mono text-sm">
                {vsAvg >= 0 ? '+' : ''}{vsAvg.toFixed(1)}% vs your average week
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="brutal-mono text-xs text-muted-foreground">Weekly Take-Home Goal</label>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              <Input
                type="number"
                placeholder="e.g. 3000"
                value={weeklyGoal}
                onChange={(e) => saveGoal(e.target.value)}
                className="brutal-border h-9 text-sm"
              />
            </div>
            {goal > 0 && (
              <div className="space-y-1">
                <div className="h-2 brutal-border bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (projectedNet / goal) * 100).toFixed(1)}%` }}
                  />
                </div>
                <p className="brutal-mono text-xs text-muted-foreground">
                  ${formatCurrency(projectedNet)} projected net of ${formatCurrency(goal)} goal
                </p>
                {isOnTrack && (
                  <p className="brutal-mono text-xs font-bold text-green-600">
                    ✓ ON TRACK — projected net exceeds your goal
                  </p>
                )}
                {!isOnTrack && loadsNeeded !== null && loadsNeeded > 0 && (
                  <p className="brutal-mono text-xs text-muted-foreground">
                    You need ~{loadsNeeded} more load{loadsNeeded !== 1 ? 's' : ''} at your current average to hit your goal
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default WeeklyForecastCard;
