import { Truck, DollarSign, Navigation } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Load } from '@/types/LoadReports';

interface LoadSummaryCardsProps {
  currentWeekLoads: Load[];
  totalGrossPay: number;
  netPay?: number;
  weeklyMileage?: { totalMiles: number };
}

const LoadSummaryCards = ({ currentWeekLoads, totalGrossPay, netPay = 0, weeklyMileage }: LoadSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="brutal-border-info bg-info p-6 brutal-shadow text-center">
        <Truck className="w-10 h-10 text-info-foreground mx-auto mb-3" />
        <p className="brutal-mono text-sm text-info-foreground">Loads This Week</p>
        <p className="brutal-text text-3xl text-info-foreground">{currentWeekLoads.length}</p>
        <p className="brutal-mono text-xs text-info-foreground opacity-80">THIS WEEK</p>
      </div>

      <div className="brutal-border-info bg-info p-6 brutal-shadow text-center">
        <DollarSign className="w-12 h-12 text-info-foreground mx-auto mb-4" />
        <p className="brutal-mono text-sm text-info-foreground mb-2">Total Earned</p>
        <p className="brutal-text text-3xl text-info-foreground">${formatCurrency(totalGrossPay)}</p>
        <p className="brutal-mono text-xs text-info-foreground mt-2">{currentWeekLoads.length} loads this week</p>
      </div>

      <div className="brutal-border-success bg-success p-6 brutal-shadow text-center">
        <DollarSign className="w-12 h-12 text-success-foreground mx-auto mb-4" />
        <p className="brutal-mono text-sm text-success-foreground mb-2">Take-Home</p>
        <p className="brutal-text text-3xl text-success-foreground">${formatCurrency(netPay)}</p>
        <p className="brutal-mono text-xs text-success-foreground mt-2">After all deductions</p>
      </div>

      {weeklyMileage && (
        <div className="brutal-border-accent bg-accent p-6 brutal-shadow text-center">
          <Navigation className="w-12 h-12 text-accent-foreground mx-auto mb-4" />
          <p className="brutal-mono text-sm text-accent-foreground mb-2">Miles This Week</p>
          <p className="brutal-text text-3xl text-accent-foreground">{weeklyMileage.totalMiles.toLocaleString()}</p>
          <p className="brutal-mono text-xs text-accent-foreground mt-2">Total miles</p>
        </div>
      )}
    </div>
  );
};

export default LoadSummaryCards;