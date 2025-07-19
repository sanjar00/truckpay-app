
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface WeeklySummaryProps {
  availableDeductionTypes: string[];
  weeklyDeductions: Record<string, string>;
  onWeeklyDeductionChange: (type: string, amount: string) => void;
  extraDeductionTypes: Array<{id: string, name: string, amount: string, dateAdded?: string}>;
  onAddExtraDeduction: () => void;
  onAddDeductionFromType: (type: string, amount: string) => void;
  onRemoveExtraDeduction: (id: string) => void;
  showAddExtraDeduction: boolean;
  setShowAddExtraDeduction: (show: boolean) => void;
  newExtraDeduction: { name: string, amount: string };
  setNewExtraDeduction: (deduction: { name: string, amount: string }) => void;
  totalGrossPay: number;
  totalDriverPay: number;
  totalWeeklyDeductions: number;
  totalExtraDeductions: number;
  totalFixedDeductions: number;
  netPay: number;
}

const WeeklySummary = ({
  availableDeductionTypes,
  weeklyDeductions,
  onWeeklyDeductionChange,
  extraDeductionTypes,
  onAddExtraDeduction,
  onAddDeductionFromType,
  onRemoveExtraDeduction,
  showAddExtraDeduction,
  setShowAddExtraDeduction,
  newExtraDeduction,
  setNewExtraDeduction,
  totalGrossPay,
  totalDriverPay,
  totalWeeklyDeductions,
  totalExtraDeductions,
  totalFixedDeductions,
  netPay
}: WeeklySummaryProps) => {
  const [pendingDeductions, setPendingDeductions] = useState<Record<string, string>>({});

  const handleAddDeduction = async (type: string) => {
    const amount = pendingDeductions[type];
    if (amount && parseFloat(amount) > 0) {
      // Call the parent function to add the deduction
      await onAddDeductionFromType(type, amount);
      
      // Clear the pending amount
      setPendingDeductions(prev => ({ ...prev, [type]: '' }));
    }
  };

  return (
    <div className="brutal-border bg-card p-6 brutal-shadow-lg">
      <h2 className="brutal-text text-2xl text-foreground mb-6">WEEKLY_SUMMARY</h2>
      
      {/* Weekly Deductions */}
      <div className="space-y-4 mb-6">
        <h3 className="brutal-text text-lg text-foreground">WEEKLY_DEDUCTIONS</h3>
        
        {availableDeductionTypes.map((type) => (
          <div key={type} className="brutal-border bg-background p-4 brutal-shadow">
            <Label className="brutal-mono text-sm text-foreground mb-2 block">
              {type.toUpperCase().replace(/ /g, '_')}
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={pendingDeductions[type] || ''}
                onChange={(e) => setPendingDeductions(prev => ({ ...prev, [type]: e.target.value }))}
                className="brutal-border bg-input flex-1"
              />
              <Button 
                onClick={() => handleAddDeduction(type)}
                variant="secondary"
                size="sm"
                className="brutal-border-accent bg-accent text-accent-foreground px-4"
                disabled={!pendingDeductions[type] || parseFloat(pendingDeductions[type]) <= 0}
              >
                <Plus className="w-4 h-4 mr-1" />
                ADD
              </Button>
            </div>
          </div>
        ))}
        
        {/* Add Extra Button */}
        <Button 
          onClick={() => setShowAddExtraDeduction(!showAddExtraDeduction)}
          variant="secondary"
          className="w-full brutal-border-secondary bg-secondary text-secondary-foreground"
        >
          <Plus className="w-5 h-5 mr-2" />
          ADD_CUSTOM_DEDUCTION
        </Button>
      </div>

      {/* Added Deductions Display */}
      {extraDeductionTypes.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="brutal-text text-lg text-foreground">ADDED_DEDUCTIONS_THIS_WEEK</h3>
          <div className="brutal-border bg-background p-4 brutal-shadow">
            {extraDeductionTypes.map((extra) => (
              <div key={extra.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div className="flex items-center gap-4">
                  <span className="brutal-mono text-sm text-foreground">{extra.name.toUpperCase()}</span>
                  <span className="brutal-text text-foreground">${formatCurrency(parseFloat(extra.amount))}</span>
                  <span className="brutal-mono text-xs text-muted-foreground">
                    {extra.dateAdded ? new Date(extra.dateAdded).toLocaleDateString() : new Date().toLocaleDateString()}
                  </span>
                </div>
                <Button 
                  onClick={() => onRemoveExtraDeduction(extra.id)}
                  variant="destructive"
                  size="sm"
                  className="brutal-border-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Extra Deduction Form */}
      {showAddExtraDeduction && (
        <div className="brutal-border-accent bg-accent/10 p-6 brutal-shadow mb-6">
          <h4 className="brutal-text text-lg text-foreground mb-4">ADD_CUSTOM_DEDUCTION</h4>
          <div className="space-y-4">
            <div>
              <Label className="brutal-mono text-sm text-foreground mb-2 block">NAME</Label>
              <Input
                placeholder="DEDUCTION_NAME"
                value={newExtraDeduction.name}
                onChange={(e) => setNewExtraDeduction(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="brutal-mono text-sm text-foreground mb-2 block">AMOUNT</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={newExtraDeduction.amount}
                onChange={(e) => setNewExtraDeduction(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={onAddExtraDeduction}
                variant="success"
                className="flex-1"
              >
                ADD
              </Button>
              <Button 
                onClick={() => setShowAddExtraDeduction(false)}
                variant="outline"
                className="flex-1"
              >
                CANCEL
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gross Pay Tab */}
        <div className="brutal-border-info bg-info p-6 brutal-shadow">
          <h3 className="brutal-text text-lg text-info-foreground mb-2">GROSS_PAY</h3>
          <p className="brutal-text text-3xl text-info-foreground">${formatCurrency(totalGrossPay)}</p>
          <p className="brutal-mono text-xs text-info-foreground opacity-80 mt-2">TOTAL_LOAD_RATES</p>
        </div>

        {/* Net Pay Tab */}
        <div className="brutal-border-success bg-success p-6 brutal-shadow">
          <h3 className="brutal-text text-lg text-success-foreground mb-2">NET_PAY</h3>
          <p className="brutal-text text-3xl text-success-foreground">${formatCurrency(netPay)}</p>
          <p className="brutal-mono text-xs text-success-foreground opacity-80 mt-2">AFTER_ALL_DEDUCTIONS</p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      {(totalDriverPay > 0 || totalWeeklyDeductions > 0 || totalFixedDeductions > 0 || totalExtraDeductions > 0) && (
        <div className="brutal-border bg-background p-4 brutal-shadow mt-6">
          <h4 className="brutal-text text-lg text-foreground mb-4">PAYMENT_BREAKDOWN</h4>
          <div className="space-y-2 brutal-mono text-sm text-foreground">
            <div className="flex justify-between">
              <span>GROSS_PAY:</span>
              <span>${formatCurrency(totalGrossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span>AFTER_COMPANY_CUT:</span>
              <span>${formatCurrency(totalDriverPay)}</span>
            </div>
            {totalWeeklyDeductions > 0 && (
              <div className="flex justify-between">
                <span>WEEKLY_DEDUCTIONS:</span>
                <span>-${formatCurrency(totalWeeklyDeductions)}</span>
              </div>
            )}
            {totalExtraDeductions > 0 && (
              <div className="flex justify-between">
                <span>ADDED_DEDUCTIONS:</span>
                <span>-${formatCurrency(totalExtraDeductions)}</span>
              </div>
            )}
            {totalFixedDeductions > 0 && (
              <div className="flex justify-between">
                <span>FIXED_DEDUCTIONS:</span>
                <span>-${formatCurrency(totalFixedDeductions)}</span>
              </div>
            )}
            <hr className="border-border" />
            <div className="flex justify-between brutal-text text-lg">
              <span>FINAL_NET_PAY:</span>
              <span>${formatCurrency(netPay)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySummary;