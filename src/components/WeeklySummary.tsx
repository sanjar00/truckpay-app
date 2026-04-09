import React, { useState } from 'react';

const localDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Navigation, Edit, Save, MoreHorizontal, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface WeeklySummaryProps {
  availableDeductionTypes: string[];
  weeklyDeductions: Record<string, string>;
  onWeeklyDeductionChange: (type: string, amount: string) => void;
  extraDeductionTypes: Array<{id: string, name: string, amount: string, dateAdded?: string}>;
  onAddExtraDeduction: () => void;
  onAddDeductionFromType: (type: string, amount: string, date: string) => void;
  onRemoveExtraDeduction: (id: string) => void;
  onEditExtraDeduction?: (id: string, name: string, amount: string) => void;
  editingDeduction?: string | null;
  setEditingDeduction?: (id: string | null) => void;
  showAddExtraDeduction: boolean;
  setShowAddExtraDeduction: (show: boolean) => void;
  newExtraDeduction: { name: string, amount: string, date: string };
  setNewExtraDeduction: (deduction: { name: string, amount: string, date: string }) => void;
  totalGrossPay: number;
  totalDriverPay: number;
  totalWeeklyDeductions: number;
  totalExtraDeductions: number;
  totalFixedDeductions: number;
  netPay: number;
  weeklyMileage?: { totalMiles: number };
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
  netPay,
  weeklyMileage,
  onEditExtraDeduction,
  editingDeduction,
  setEditingDeduction
}: WeeklySummaryProps) => {
  // Restore the pendingDeductions state for input fields
  const todayStr = new Date().toISOString().split('T')[0];
  const [pendingDeductions, setPendingDeductions] = useState<Record<string, { amount: string, date: string }>>({});
  const [editingData, setEditingData] = useState<{name: string, amount: string, date: string}>({name: '', amount: '', date: todayStr});
  const [showMobileMenu, setShowMobileMenu] = useState<string | null>(null);
  const [editDateCalendarOpen, setEditDateCalendarOpen] = useState(false);
  const [pendingDateCalendarOpen, setPendingDateCalendarOpen] = useState<string | null>(null);
  const [newExtraDeductionDateCalendarOpen, setNewExtraDeductionDateCalendarOpen] = useState(false);

  // Fix the handleAddDeduction function
  const handleAddDeduction = async (type: string) => {
    const entry = pendingDeductions[type];
    const amount = entry?.amount;
    const date = entry?.date || new Date().toISOString().split('T')[0];
    if (amount && parseFloat(amount) > 0) {
      // Call the parent function to add the deduction
      await onAddDeductionFromType(type, amount, date);

      // Clear the pending amount and reset date
      setPendingDeductions(prev => ({
        ...prev,
        [type]: { amount: '', date: new Date().toISOString().split('T')[0] }
      }));
    }
  };

  const handleEditDeduction = (deduction: {id: string, name: string, amount: string, dateAdded?: string}) => {
    if (setEditingDeduction) {
      setEditingDeduction(deduction.id);
      const dateStr = deduction.dateAdded ? (deduction.dateAdded.length === 10 ? deduction.dateAdded : localDateStr(new Date(deduction.dateAdded))) : todayStr;
      setEditingData({ name: deduction.name, amount: deduction.amount, date: dateStr });
    }
  };

  const handleSaveEdit = (id: string) => {
    if (onEditExtraDeduction) {
      onEditExtraDeduction(id, editingData.name, editingData.amount);
    }
  };

  const handleCancelEdit = () => {
    if (setEditingDeduction) {
      setEditingDeduction(null);
      setEditingData({ name: '', amount: '', date: todayStr });
    }
  };

  return (
    <div className="brutal-border bg-card p-6 brutal-shadow-lg">
      <h2 className="brutal-text text-2xl text-foreground mb-6">Pay Breakdown</h2>

      {/* Weekly Deductions */}
      <div className="space-y-4 mb-6">
        <h3 className="brutal-text text-lg text-foreground">Fuel & Expenses</h3>
        {/* Display existing weekly deductions */}
        {Object.entries(weeklyDeductions).filter(([type, amount]) => amount && parseFloat(amount) > 0).length > 0 && (
          <div className="space-y-4 mb-6">
            <h4 className="brutal-text text-md text-foreground">Expenses Added</h4>
            <div className="brutal-border bg-background p-4 brutal-shadow">
              {Object.entries(weeklyDeductions)
                .filter(([type, amount]) => amount && parseFloat(amount) > 0)
                .map(([type, amount]) => (
                  <div key={type} className="py-2 border-b border-border last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="brutal-mono text-sm text-foreground">{type}</span>
                        <span className="brutal-text text-foreground">${formatCurrency(parseFloat(amount))}</span>
                      </div>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => onWeeklyDeductionChange(type, e.target.value)}
                          className="w-24"
                        />
                        <Button
                          onClick={() => onWeeklyDeductionChange(type, '0')}
                          variant="destructive"
                          size="sm"
                          className="brutal-border-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
        {/* Add new deduction inputs */}
        {availableDeductionTypes.map((type) => (
          <div key={type} className="brutal-border bg-background p-4 brutal-shadow">
            <Label className="brutal-mono text-sm text-foreground mb-2 block">
              {type}
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                value={pendingDeductions[type]?.amount || ''}
                onChange={(e) =>
                  setPendingDeductions(prev => ({
                    ...prev,
                    [type]: { ...(prev[type] || { date: todayStr }), amount: e.target.value }
                  }))
                }
                className="brutal-border bg-input flex-1"
              />
              <Popover open={pendingDateCalendarOpen === type} onOpenChange={(open) => setPendingDateCalendarOpen(open ? type : null)}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-36 justify-start text-left font-normal",
                      !pendingDeductions[type]?.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pendingDeductions[type]?.date ? format(new Date(pendingDeductions[type].date + 'T00:00:00'), "MMM dd") : format(new Date(todayStr + 'T00:00:00'), "MMM dd")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={pendingDeductions[type]?.date ? new Date(pendingDeductions[type].date + 'T00:00:00') : new Date(todayStr + 'T00:00:00')}
                    onSelect={(date) => {
                      if (date) {
                        const dateStr = localDateStr(date);
                        setPendingDeductions(prev => ({
                          ...prev,
                          [type]: { ...(prev[type] || { amount: '' }), date: dateStr }
                        }));
                        setPendingDateCalendarOpen(null);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button
                onClick={() => handleAddDeduction(type)}
                variant="secondary"
                size="sm"
                className="brutal-border-accent bg-accent text-accent-foreground px-4"
                disabled={!pendingDeductions[type]?.amount || parseFloat(pendingDeductions[type].amount) <= 0}
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
          Add Expense
        </Button>
      </div>

      {/* Add Extra Deduction Form - Moved above the deductions list */}
      {showAddExtraDeduction && (
        <div className="brutal-border-accent bg-accent/10 p-6 brutal-shadow mb-6">
          <h4 className="brutal-text text-lg text-foreground mb-4">Add Expense</h4>
          <div className="space-y-4">
            <div>
              <Label className="brutal-mono text-sm text-foreground mb-2 block">Name</Label>
              <Input
                placeholder="e.g. Truck wash"
                value={newExtraDeduction.name}
                onChange={(e) => setNewExtraDeduction(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="brutal-mono text-sm text-foreground mb-2 block">Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={newExtraDeduction.amount}
                onChange={(e) => setNewExtraDeduction(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label className="brutal-mono text-sm text-foreground mb-2 block">Date</Label>
              <Popover open={newExtraDeductionDateCalendarOpen} onOpenChange={setNewExtraDeductionDateCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newExtraDeduction.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newExtraDeduction.date ? format(new Date(newExtraDeduction.date + 'T00:00:00'), "MMM dd") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newExtraDeduction.date ? new Date(newExtraDeduction.date + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const dateStr = localDateStr(date);
                        setNewExtraDeduction(prev => ({ ...prev, date: dateStr }));
                        setNewExtraDeductionDateCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onAddExtraDeduction}
                variant="success"
                className="flex-1"
                disabled={!newExtraDeduction.name.trim() || !newExtraDeduction.amount.trim() || !newExtraDeduction.date || isNaN(parseFloat(newExtraDeduction.amount)) || parseFloat(newExtraDeduction.amount) <= 0}
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

      {/* Added Deductions Display with Edit Functionality */}
      {extraDeductionTypes.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="brutal-text text-lg text-foreground">Expenses Added</h3>
          <div className="brutal-border bg-background p-4 brutal-shadow">
            {extraDeductionTypes.map((extra) => (
              <div key={extra.id} className="py-2 border-b border-border last:border-b-0">
                {editingDeduction === extra.id ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      value={editingData.name}
                      onChange={(e) => setEditingData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Deduction name"
                      className="flex-1 min-w-[150px]"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={editingData.amount}
                      onChange={(e) => setEditingData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Amount"
                      className="w-24"
                    />
                    <Popover open={editDateCalendarOpen} onOpenChange={setEditDateCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-32 justify-start text-left font-normal",
                            !editingData.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editingData.date ? format(new Date(editingData.date + 'T00:00:00'), "MMM dd") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editingData.date ? new Date(editingData.date + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const dateStr = localDateStr(date);
                              setEditingData(prev => ({ ...prev, date: dateStr }));
                              setEditDateCalendarOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      onClick={() => handleSaveEdit(extra.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="brutal-mono text-sm text-foreground">{String(extra.name || "").toUpperCase()}</span>
                      <span className="brutal-text text-foreground">${formatCurrency(parseFloat(extra.amount))}</span>
                      <span className="brutal-mono text-xs text-muted-foreground">
                        {extra.dateAdded ? format(new Date(extra.dateAdded.length === 10 ? extra.dateAdded + 'T00:00:00' : extra.dateAdded), 'MMM dd') : format(new Date(), 'MMM dd')}
                      </span>
                    </div>
                    
                    {/* Desktop buttons - hidden on mobile */}
                    <div className="hidden sm:flex gap-1">
                      {onEditExtraDeduction && setEditingDeduction && (
                        <Button
                          onClick={() => handleEditDeduction(extra)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        onClick={() => onRemoveExtraDeduction(extra.id)}
                        variant="destructive"
                        size="sm"
                        className="brutal-border-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Mobile 3-dot menu */}
                    <div className="sm:hidden relative">
                      <Button
                        onClick={() => setShowMobileMenu(showMobileMenu === extra.id ? null : extra.id)}
                        variant="ghost"
                        size="sm"
                        className="p-1"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      
                      {/* Mobile dropdown menu */}
                      {showMobileMenu === extra.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                          {onEditExtraDeduction && setEditingDeduction && (
                            <button
                              onClick={() => {
                                handleEditDeduction(extra);
                                setShowMobileMenu(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onRemoveExtraDeduction(extra.id);
                              setShowMobileMenu(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gross Pay Tab */}
        <div className="brutal-border-info bg-info p-6 brutal-shadow">
          <h3 className="brutal-text text-lg text-info-foreground mb-2">Total Earned</h3>
          <p className="brutal-text text-3xl text-info-foreground">${formatCurrency(totalGrossPay)}</p>
          <p className="brutal-mono text-xs text-info-foreground opacity-80 mt-2">Load rates this week</p>
        </div>

        {/* Net Pay Tab */}
        <div className="brutal-border-success bg-success p-6 brutal-shadow">
          <h3 className="brutal-text text-lg text-success-foreground mb-2">Take-Home</h3>
          <p className="brutal-text text-3xl text-success-foreground">${formatCurrency(netPay)}</p>
          <p className="brutal-mono text-xs text-success-foreground opacity-80 mt-2">After all deductions</p>
        </div>

        {/* Mileage Tab */}
        {weeklyMileage && (
          <div className="brutal-border-accent bg-accent p-6 brutal-shadow">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-5 h-5 text-accent-foreground" />
              <h3 className="brutal-text text-lg text-accent-foreground">Miles This Week</h3>
            </div>
            <p className="brutal-text text-3xl text-accent-foreground">{weeklyMileage.totalMiles.toLocaleString()}</p>
            <p className="brutal-mono text-xs text-accent-foreground opacity-80 mt-2">Total miles</p>
          </div>
        )}
      </div>

      {/* Payment Breakdown */}
      <div className="brutal-border bg-background p-4 brutal-shadow mt-6">
        <h4 className="brutal-text text-lg text-foreground mb-4">Pay Breakdown</h4>
        <div className="space-y-2 brutal-mono text-sm text-foreground">
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
          <div className="flex justify-between border-t border-border pt-2 font-bold">
            <span>Take-Home:</span>
            <span>${formatCurrency(netPay)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklySummary;
