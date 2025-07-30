import { Truck, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Load } from '@/types/LoadReports';

interface LoadSummaryCardsProps {
  currentWeekLoads: Load[];
  totalGrossPay: number;
}

const LoadSummaryCards = ({ currentWeekLoads, totalGrossPay }: LoadSummaryCardsProps) => {
  return (
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
  );
};

export default LoadSummaryCards;