
import React from 'react';
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
  extraDeductionTypes: Array<{id: string, name: string, amount: string}>;
  onAddExtraDeduction: () => void;
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
            <Input
              type="number"
              placeholder="0.00"
              value={weeklyDeductions[type] || ''}
              onChange={(e) => onWeeklyDeductionChange(type, e.target.value)}
              className="brutal-border bg-input"
            />
          </div>
        ))}
        
        {/* Add Extra Button */}
        <Button 
          onClick={() => setShowAddExtraDeduction(!showAddExtraDeduction)}
          variant="secondary"
          className="w-full brutal-border-secondary bg-secondary text-secondary-foreground"
        >
          <Plus className="w-5 h-5 mr-2" />
          ADD_EXTRA
        </Button>
      </div>

      {/* Extra Deductions */}
      {extraDeductionTypes.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="brutal-text text-lg text-foreground">EXTRA_DEDUCTIONS</h3>
          {extraDeductionTypes.map((extra) => (
            <div key={extra.id} className="brutal-border-destructive bg-destructive/10 p-4 brutal-shadow flex items-center justify-between">
              <div>
                <p className="brutal-mono text-sm text-foreground">{extra.name.toUpperCase()}</p>
                <p className="brutal-text text-lg text-foreground">${extra.amount}</p>
              </div>
              <Button 
                onClick={() => onRemoveExtraDeduction(extra.id)}
                variant="destructive"
                size="sm"
              >
                REMOVE
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Extra Deduction Form */}
      {showAddExtraDeduction && (
        <div className="brutal-border-accent bg-accent/10 p-6 brutal-shadow mb-6">
          <h4 className="brutal-text text-lg text-foreground mb-4">ADD_EXTRA_DEDUCTION</h4>
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
      <div className="brutal-border-success bg-success p-6 brutal-shadow-lg">
        <h3 className="brutal-text text-lg sm:text-xl text-success-foreground mb-4">
          <span className="hidden sm:inline">NET_PAY_(AFTER_ALL_DEDUCTIONS)</span>
          <span className="sm:hidden">NET_PAY</span>
        </h3>
        <p className="brutal-text text-3xl sm:text-4xl text-success-foreground mb-4">${formatCurrency(netPay)}</p>
        
        {(totalDriverPay > 0 || totalWeeklyDeductions > 0 || totalFixedDeductions > 0 || totalExtraDeductions > 0) && (
          <div className="brutal-border bg-success-foreground/10 p-4 brutal-shadow">
            <div className="space-y-2 brutal-mono text-sm text-success-foreground">
              <div className="flex justify-between">
                <span>DRIVER_PAY:</span>
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
                  <span>EXTRA_DEDUCTIONS:</span>
                  <span>-${formatCurrency(totalExtraDeductions)}</span>
                </div>
              )}
              {totalFixedDeductions > 0 && (
                <div className="flex justify-between">
                  <span>FIXED_DEDUCTIONS:</span>
                  <span>-${formatCurrency(totalFixedDeductions)}</span>
                </div>
              )}
              <hr className="border-success-foreground/30" />
              <div className="flex justify-between brutal-text text-lg">
                <span>NET_PAY:</span>
                <span>${formatCurrency(netPay)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklySummary;