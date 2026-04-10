import { useState } from 'react';
import { DollarSign, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Load } from '@/types/LoadReports';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LoadSummaryCardsProps {
  currentWeekLoads: Load[];
  totalGrossPay: number;
  netPay?: number;
  totalDriverPay?: number;
  totalWeeklyDeductions?: number;
  totalExtraDeductions?: number;
  totalFixedDeductions?: number;
  leaseMilesCost?: number;
}

const LoadSummaryCards = ({
  currentWeekLoads,
  totalGrossPay,
  netPay = 0,
  totalDriverPay = 0,
  totalWeeklyDeductions = 0,
  totalExtraDeductions = 0,
  totalFixedDeductions = 0,
  leaseMilesCost = 0,
}: LoadSummaryCardsProps) => {
  const [showPayBreakdown, setShowPayBreakdown] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="brutal-border-info bg-info p-6 brutal-shadow text-center">
          <DollarSign className="w-12 h-12 text-info-foreground mx-auto mb-4" />
          <p className="brutal-mono text-sm text-info-foreground mb-2">Total Earned</p>
          <p className="brutal-text text-3xl text-info-foreground">${formatCurrency(totalGrossPay)}</p>
          <p className="brutal-mono text-xs text-info-foreground mt-2">{currentWeekLoads.length} loads this week</p>
        </div>

        <div className="brutal-border-success bg-success p-6 brutal-shadow text-center relative">
          <button
            onClick={() => setShowPayBreakdown(true)}
            className="absolute top-3 right-3 text-success-foreground hover:opacity-70 transition-opacity"
            title="View pay breakdown"
          >
            <Info className="w-5 h-5" />
          </button>
          <DollarSign className="w-12 h-12 text-success-foreground mx-auto mb-4" />
          <p className="brutal-mono text-sm text-success-foreground mb-2">Take-Home</p>
          <p className="brutal-text text-3xl text-success-foreground">${formatCurrency(netPay)}</p>
          <p className="brutal-mono text-xs text-success-foreground mt-2">After all deductions</p>
        </div>
      </div>

      {/* Pay Breakdown Modal */}
      <Dialog open={showPayBreakdown} onOpenChange={setShowPayBreakdown}>
        <DialogContent className="brutal-border brutal-shadow-lg">
          <DialogHeader>
            <DialogTitle className="brutal-text text-2xl">Pay Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 brutal-mono text-sm text-foreground">
            <div className="flex justify-between">
              <span>Total Earned:</span>
              <span>${formatCurrency(totalGrossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span>After Company Cut:</span>
              <span>${formatCurrency(totalDriverPay)}</span>
            </div>
            {totalWeeklyDeductions > 0 && (
              <div className="flex justify-between">
                <span>Fuel & Expenses:</span>
                <span>-${formatCurrency(totalWeeklyDeductions)}</span>
              </div>
            )}
            {totalExtraDeductions > 0 && (
              <div className="flex justify-between">
                <span>Other Expenses:</span>
                <span>-${formatCurrency(totalExtraDeductions)}</span>
              </div>
            )}
            {totalFixedDeductions > 0 && (
              <div className="flex justify-between">
                <span>Weekly Fixed Costs:</span>
                <span>-${formatCurrency(totalFixedDeductions)}</span>
              </div>
            )}
            {leaseMilesCost > 0 && (
              <div className="flex justify-between">
                <span>Lease Miles Cost:</span>
                <span>-${formatCurrency(leaseMilesCost)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 font-bold text-base">
              <span>Take-Home:</span>
              <span>${formatCurrency(netPay)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LoadSummaryCards;