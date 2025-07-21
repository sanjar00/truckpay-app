
import { DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface Deduction {
  id: string;
  type: string;
  amount: number;
  isFixed: boolean; // Keep this as isFixed for frontend consistency
  isCustomType?: boolean;
  dateAdded?: string;
}

interface DeductionsSummaryProps {
  deductions: Deduction[];
}

const DeductionsSummary = ({ deductions }: DeductionsSummaryProps) => {
  const fixedDeductions = deductions.filter(d => d.isFixed); // Keep as isFixed since we map it
  const totalDeductions = fixedDeductions.reduce((total, deduction) => total + deduction.amount, 0);

  return (
    <>
      {/* Summary Card */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-4 text-center">
          <DollarSign className="w-8 h-8 text-orange-600 mx-auto mb-2" />
          <p className="text-sm text-orange-700">Total Weekly Deductions</p>
          <p className="text-2xl font-bold text-orange-900">${formatCurrency(totalDeductions)}</p>
          <p className="text-xs text-orange-600 mt-1">{fixedDeductions.length} recurring deductions</p>
        </CardContent>
      </Card>

      {/* Fixed Deductions Info */}
      {fixedDeductions.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-green-900 mb-2">Recurring Deductions</h3>
            <p className="text-sm text-green-700 mb-2">
              These deductions will auto-fill in future forecasts:
            </p>
            <div className="space-y-1">
              {fixedDeductions.map((deduction) => (
                <div key={deduction.id} className="flex justify-between text-sm">
                  <span className="text-green-700">{deduction.type}</span>
                  <span className="font-medium text-green-900">${formatCurrency(deduction.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default DeductionsSummary;