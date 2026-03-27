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
  fixedDeductionsWeeklyTotal: number;
}

const WeeklyForecastCard = ({
  user,
  userProfile,
  weekStart,
  weekEnd,
  currentGross,
  fixedDeductionsWeeklyTotal,
}: WeeklyForecastCardProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState<string>(() => {
    return localStorage.getItem('truckpay_weekly_goal') || '';
  });
  const [historicalAvg, setHistoricalAvg] = useState<number | null>(null);

  const today = new Date();
  const daysElapsed = Math.max(1, differenceInCalendarDays(today, weekStart) + 1);
  const daysRemaining = Math.max(0, differenceInCalendarDays(weekEnd, today));
  const dailyRate = currentGross / daysElapsed;
  const projectedGross = currentGross + dailyRate * daysRemaining;

  const companyDeduction = (userProfile?.companyDeduction || 0) / 100;
  const projectedDriverPay = projectedGross * (1 - companyDeduction);
  const projectedNet = projectedDriverPay - fixedDeductionsWeeklyTotal;

  const confidence = daysElapsed >= 5 ? 'HIGH' : daysElapsed >= 3 ? 'MODERATE' : 'LOW';
  const confidenceColor =
    confidence === 'HIGH' ? 'text-green-600' : confidence === 'MODERATE' ? 'text-yellow-600' : 'text-red-500';

  const vsAvg =
    historicalAvg && historicalAvg > 0
      ? ((projectedGross - historicalAvg) / historicalAvg) * 100
      : null;

  const goal = parseFloat(weeklyGoal);
  const loadsNeeded =
    goal > 0 && currentGross < goal && daysRemaining > 0
      ? Math.ceil((goal - currentGross) / (dailyRate || 1))
      : null;

  useEffect(() => {
    if (!user) return;
    const fetchHistorical = async () => {
      const { data } = await supabase
        .from('load_reports')
        .select('rate, date_added')
        .eq('user_id', user.id)
        .lt('date_added', weekStart.toISOString());
      if (!data || data.length === 0) return;
      // Group by week and average
      const weekMap: Record<string, number> = {};
      data.forEach((load) => {
        const d = new Date(load.date_added);
        const ws = startOfWeek(d, { weekStartsOn: 0 });
        const wk = ws.toISOString().split('T')[0];
        weekMap[wk] = (weekMap[wk] || 0) + load.rate;
      });
      const weeks = Object.values(weekMap);
      if (weeks.length > 0) {
        setHistoricalAvg(weeks.reduce((a, b) => a + b, 0) / weeks.length);
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
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <CardTitle className="mobile-text-xl brutal-text font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <TrendingUp className="mobile-icon text-primary" />
            AT THIS PACE...
          </span>
          <span className="flex items-center gap-2">
            <span className={`brutal-mono text-xs ${confidenceColor}`}>{confidence} CONFIDENCE</span>
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </span>
        </CardTitle>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="brutal-border p-3 bg-primary/5">
              <p className="brutal-mono text-xs text-muted-foreground">PROJ. GROSS</p>
              <p className="brutal-text text-lg font-bold text-primary">${formatCurrency(projectedGross)}</p>
            </div>
            <div className="brutal-border p-3 bg-success/5">
              <p className="brutal-mono text-xs text-muted-foreground">PROJ. NET</p>
              <p className="brutal-text text-lg font-bold text-green-700">${formatCurrency(projectedNet)}</p>
            </div>
            <div className="brutal-border p-3 bg-accent/10 col-span-2 sm:col-span-1">
              <p className="brutal-mono text-xs text-muted-foreground">DAYS LEFT</p>
              <p className="brutal-text text-lg font-bold">{daysRemaining}</p>
            </div>
          </div>

          {vsAvg !== null && (
            <div className={`brutal-border p-3 flex items-center gap-2 ${vsAvg >= 0 ? 'bg-success/5' : 'bg-destructive/5'}`}>
              {vsAvg >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className="brutal-mono text-sm">
                {vsAvg >= 0 ? '+' : ''}{vsAvg.toFixed(1)}% vs YOUR WEEKLY AVERAGE
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="brutal-mono text-xs text-muted-foreground">WEEKLY GOAL ($)</label>
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
                    style={{ width: `${Math.min(100, (currentGross / goal) * 100).toFixed(1)}%` }}
                  />
                </div>
                <p className="brutal-mono text-xs text-muted-foreground">
                  ${formatCurrency(currentGross)} of ${formatCurrency(goal)} goal
                  {loadsNeeded !== null && ` · ~${loadsNeeded} more load(s) needed`}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default WeeklyForecastCard;
