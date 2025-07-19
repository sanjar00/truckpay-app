import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Save, X, DollarSign, Calendar, Filter, Calculator, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, subWeeks, addDays } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { DateRange } from 'react-day-picker';
import { getUserWeekStart, getUserWeekEnd } from '../lib/weeklyPeriodUtils';

interface ExpenseType {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

interface Expense {
  id: string;
  expense_type_id: string;
  amount: number;
  note?: string;
  date: string;
  user_id: string;
  created_at: string;
}

interface PersonalExpensesProps {
  onBack: () => void;
}

const PersonalExpenses: React.FC<PersonalExpensesProps> = ({ onBack, userProfile }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Period filter states
  const [periodFilter, setPeriodFilter] = useState<string>('last2');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  
  // Form states
  const [newExpenseTypeName, setNewExpenseTypeName] = useState('');
  const [editingExpenseType, setEditingExpenseType] = useState<string | null>(null);
  const [editExpenseTypeName, setEditExpenseTypeName] = useState('');
  const [newExpenses, setNewExpenses] = useState<{ [key: string]: { amount: string; note: string; date: string } }>({});

  // Calculate date range based on period filter
  const getDateRange = () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (periodFilter) {
      case 'last2':
        startDate = getUserWeekStart(subWeeks(today, 1), userProfile);
        endDate = getUserWeekEnd(today, userProfile);
        break;
      case 'last3':
        startDate = getUserWeekStart(subWeeks(today, 2), userProfile);
        endDate = getUserWeekEnd(today, userProfile);
        break;
      case 'last4':
        startDate = getUserWeekStart(subWeeks(today, 3), userProfile);
        endDate = getUserWeekEnd(today, userProfile);
        break;
      case 'custom':
        if (customDateRange?.from && customDateRange?.to) {
          startDate = customDateRange.from;
          endDate = customDateRange.to;
        } else {
          startDate = getUserWeekStart(today, userProfile);
          endDate = getUserWeekEnd(today, userProfile);
        }
        break;
      default:
        startDate = getUserWeekStart(subWeeks(today, 1), userProfile);
        endDate = getUserWeekEnd(today, userProfile);
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();
  const isValidDateStart = startDate instanceof Date && !isNaN(startDate.getTime());
  const isValidDateEnd = endDate instanceof Date && !isNaN(endDate.getTime());

  // Filter expenses by date range
  const filteredExpenses = expenses.filter(expense => {
    if (!isValidDateStart || !isValidDateEnd) return false;
    const expenseDate = new Date(expense.date);
    return expenseDate >= startDate && expenseDate <= endDate;
  });

  // Calculate number of weeks
  const numberOfWeeks = isValidDateStart && isValidDateEnd 
    ? Math.floor((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    : 1;

  // Calculate totals
  const calculateTotalForType = (typeId: string) => {
    return filteredExpenses
      .filter(expense => expense.expense_type_id === typeId)
      .reduce((total, expense) => total + expense.amount, 0);
  };

  const overallTotal = filteredExpenses.reduce((total, expense) => total + expense.amount, 0);

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  // Fetch expense types
  const fetchExpenseTypes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('expense_types')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching expense types:', error);
        toast({
          title: "Error",
          description: "Failed to load expense types",
          variant: "destructive"
        });
        return;
      }

      setExpenseTypes(data || []);
    } catch (error) {
      console.error('Error fetching expense types:', error);
      toast({
        title: "Error",
        description: "Failed to load expense types",
        variant: "destructive"
      });
    }
  };

  // Fetch expenses
  const fetchExpenses = async () => {
    if (!user || !isValidDateStart || !isValidDateEnd) return;
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching expenses:', error);
        toast({
          title: "Error",
          description: "Failed to load expenses",
          variant: "destructive"
        });
        return;
      }

      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive"
      });
    }
  };

  // Load data on component mount and when period changes
  useEffect(() => {
    if (user) {
      fetchExpenseTypes();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user, periodFilter, customDateRange, startDate, endDate]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (user) {
        await Promise.all([fetchExpenseTypes(), fetchExpenses()]);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Add expense type
  const handleAddExpenseType = async () => {
    if (!user || !newExpenseTypeName.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('expense_types')
        .insert([{ name: newExpenseTypeName.trim(), user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error adding expense type:', error);
        toast({
          title: "Error",
          description: "Failed to add expense type",
          variant: "destructive"
        });
        return;
      }

      setExpenseTypes(prev => [...prev, data]);
      setNewExpenseTypeName('');
      toast({
        title: "Success",
        description: "Expense type added successfully"
      });
    } catch (error) {
      console.error('Error adding expense type:', error);
      toast({
        title: "Error",
        description: "Failed to add expense type",
        variant: "destructive"
      });
    }
  };

  // Update expense type
  const handleUpdateExpenseType = async (id: string, newName: string) => {
    if (!user || !newName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('expense_types')
        .update({ name: newName.trim() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating expense type:', error);
        toast({
          title: "Error",
          description: "Failed to update expense type",
          variant: "destructive"
        });
        return;
      }

      setExpenseTypes(prev => 
        prev.map(type => type.id === id ? { ...type, name: newName.trim() } : type)
      );
      setEditingExpenseType(null);
      setEditExpenseTypeName('');
      toast({
        title: "Success",
        description: "Expense type updated successfully"
      });
    } catch (error) {
      console.error('Error updating expense type:', error);
      toast({
        title: "Error",
        description: "Failed to update expense type",
        variant: "destructive"
      });
    }
  };

  // Delete expense type
  const handleDeleteExpenseType = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('expense_types')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting expense type:', error);
        toast({
          title: "Error",
          description: "Failed to delete expense type",
          variant: "destructive"
        });
        return;
      }

      setExpenseTypes(prev => prev.filter(type => type.id !== id));
      toast({
        title: "Success",
        description: "Expense type deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting expense type:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense type",
        variant: "destructive"
      });
    }
  };

  // Add expense
  const handleAddExpense = async (expenseTypeId: string) => {
    if (!user) return;
    
    const expenseData = newExpenses[expenseTypeId];
    if (!expenseData || !expenseData.amount || !expenseData.date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(expenseData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          expense_type_id: expenseTypeId,
          amount: amount,
          note: expenseData.note || null,
          date: expenseData.date,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding expense:', error);
        toast({
          title: "Error",
          description: "Failed to add expense",
          variant: "destructive"
        });
        return;
      }

      setExpenses(prev => [data, ...prev]);
      setNewExpenses(prev => ({ ...prev, [expenseTypeId]: { amount: '', note: '', date: format(new Date(), 'yyyy-MM-dd') } }));
      toast({
        title: "Success",
        description: "Expense added successfully"
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  };

  // Delete expense
  const handleDeleteExpense = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting expense:', error);
        toast({
          title: "Error",
          description: "Failed to delete expense",
          variant: "destructive"
        });
        return;
      }

      setExpenses(prev => prev.filter(expense => expense.id !== id));
      toast({
        title: "Success",
        description: "Expense deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive"
      });
    }
  };

  // Initialize new expense form for a type
  const initializeNewExpense = (typeId: string) => {
    if (!newExpenses[typeId]) {
      setNewExpenses(prev => ({
        ...prev,
        [typeId]: { amount: '', note: '', date: format(new Date(), 'yyyy-MM-dd') }
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background brutal-grid p-3 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p className="mobile-text-lg text-muted-foreground">Loading personal expenses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background brutal-grid p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                className="brutal-border brutal-shadow mobile-h mobile-w brutal-hover"
            >
                <ArrowLeft className="mobile-icon" />
            </Button>
          </div>
          <h1 className="mobile-text-2xl brutal-text font-bold mb-2">
            PERSONAL EXPENSES
          </h1>
          <p className="mobile-text-sm text-muted-foreground">
            Track your personal expenses by category
          </p>
        </div>
        
        {/* Period Filter */}
        <Card className="brutal-border brutal-shadow bg-background">
          <CardHeader className="pb-4">
            <CardTitle className="mobile-text-xl brutal-text font-bold flex items-center gap-2">
              <Filter className="mobile-icon" />
              PERIOD FILTER
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="brutal-mono text-sm text-foreground mb-2 block">SELECT PERIOD</label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="brutal-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last2">LAST 2 WEEKS</SelectItem>
                    <SelectItem value="last3">LAST 3 WEEKS</SelectItem>
                    <SelectItem value="last4">LAST 4 WEEKS</SelectItem>
                    <SelectItem value="custom">CUSTOM RANGE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {periodFilter === 'custom' && (
                <div>
                  <label className="brutal-mono text-sm text-foreground mb-2 block">DATE RANGE</label>
                  <DatePickerWithRange 
                    date={customDateRange}
                    setDate={setCustomDateRange}
                  />
                </div>
              )}
            </div>            
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="mobile-icon text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="brutal-mono text-sm text-muted-foreground">SELECTED PERIOD:</span>
                </div>
                <p className="brutal-text text-base">
                  {isValidDateStart && isValidDateEnd 
                    ? `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
                    : 'Invalid date range selected'
                  }
                </p>
                <p className="brutal-mono text-xs text-muted-foreground mt-1">
                  {isValidDateStart && isValidDateEnd 
                    ? `${numberOfWeeks} week${numberOfWeeks > 1 ? 's' : ''} • ${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? 's' : ''}`
                    : 'Please select a valid date range'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses Summary */}
        <Card className="brutal-border brutal-shadow-lg bg-destructive/10">
          <CardContent className="p-6 text-center">
            <DollarSign className="mobile-icon-lg mx-auto mb-4 text-destructive" />
            <p className="mobile-text-base text-muted-foreground mb-2">
              TOTAL EXPENSES
            </p>
            <p className="mobile-text-3xl brutal-text font-bold text-destructive mb-4">
              ${formatCurrency(overallTotal)}
            </p>
            <div className="flex items-center justify-center gap-2 mobile-text-sm text-muted-foreground">
              <Calculator className="mobile-icon" />
              <span>
                {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} in selected period
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Add Expense Type */}
        <Card className="brutal-border brutal-shadow bg-background">
          <CardHeader>
            <CardTitle className="mobile-text-xl brutal-text font-bold">
              ADD EXPENSE TYPE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter expense type name (e.g., Grocery, Gas, etc.)"
                value={newExpenseTypeName}
                onChange={(e) => setNewExpenseTypeName(e.target.value)}
                className="brutal-border"
                onKeyPress={(e) => e.key === 'Enter' && handleAddExpenseType()}
              />
              <Button 
                onClick={handleAddExpenseType}
                className="brutal-border brutal-shadow brutal-hover"
                disabled={!newExpenseTypeName.trim()}
              >
                <Plus className="mobile-icon" />
                ADD
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expense Types and Expenses */}
        <div className="space-y-6">
          {expenseTypes.length === 0 ? (
            <Card className="brutal-border brutal-shadow bg-background">
              <CardContent className="p-8 text-center">
                <p className="mobile-text-lg text-muted-foreground mb-4">
                  No expense types found
                </p>
                <p className="mobile-text-sm text-muted-foreground">
                  Add your first expense type above to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            expenseTypes.map((type) => {
              const typeExpenses = filteredExpenses.filter(expense => expense.expense_type_id === type.id);
              const typeTotal = calculateTotalForType(type.id);
              
              return (
                <Card key={type.id} className="brutal-border brutal-shadow bg-background">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {editingExpenseType === type.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editExpenseTypeName}
                              onChange={(e) => setEditExpenseTypeName(e.target.value)}
                              className="brutal-border"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateExpenseType(type.id, editExpenseTypeName);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUpdateExpenseType(type.id, editExpenseTypeName)}
                              className="brutal-border brutal-shadow brutal-hover"
                            >
                              <Save className="mobile-icon" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingExpenseType(null);
                                setEditExpenseTypeName('');
                              }}
                              className="brutal-border brutal-shadow brutal-hover"
                            >
                              <X className="mobile-icon" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <CardTitle className="mobile-text-xl brutal-text font-bold">
                              {type.name.toUpperCase()}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingExpenseType(type.id);
                                  setEditExpenseTypeName(type.name);
                                }}
                                className="brutal-border brutal-shadow brutal-hover"
                              >
                                <Edit className="mobile-icon" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteExpenseType(type.id)}
                                className="brutal-border brutal-shadow brutal-hover"
                              >
                                <Trash2 className="mobile-icon" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="mobile-text-lg brutal-text font-bold text-primary">
                          ${formatCurrency(typeTotal)}
                        </p>
                        <p className="mobile-text-sm text-muted-foreground">
                          {typeExpenses.length} expense{typeExpenses.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add New Expense Form */}
                    <div className="brutal-border brutal-shadow p-4 bg-muted/50">
                      <h4 className="mobile-text-base brutal-text font-medium mb-3">
                        ADD NEW EXPENSE
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="brutal-mono text-xs text-muted-foreground mb-1 block">
                            AMOUNT
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newExpenses[type.id]?.amount || ''}
                            onChange={(e) => {
                              initializeNewExpense(type.id);
                              setNewExpenses(prev => ({
                                ...prev,
                                [type.id]: { ...prev[type.id], amount: e.target.value }
                              }));
                            }}
                            className="brutal-border"
                          />
                        </div>
                        <div>
                          <label className="brutal-mono text-xs text-muted-foreground mb-1 block">
                            DATE
                          </label>
                          <Input
                            type="date"
                            value={newExpenses[type.id]?.date || format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => {
                              initializeNewExpense(type.id);
                              setNewExpenses(prev => ({
                                ...prev,
                                [type.id]: { ...prev[type.id], date: e.target.value }
                              }));
                            }}
                            className="brutal-border"
                          />
                        </div>
                        <div>
                          <label className="brutal-mono text-xs text-muted-foreground mb-1 block">
                            NOTE (OPTIONAL)
                          </label>
                          <Input
                            placeholder="Add a note..."
                            value={newExpenses[type.id]?.note || ''}
                            onChange={(e) => {
                              initializeNewExpense(type.id);
                              setNewExpenses(prev => ({
                                ...prev,
                                [type.id]: { ...prev[type.id], note: e.target.value }
                              }));
                            }}
                            className="brutal-border"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            onClick={() => handleAddExpense(type.id)}
                            className="brutal-border brutal-shadow brutal-hover w-full"
                            disabled={!newExpenses[type.id]?.amount || !newExpenses[type.id]?.date}
                          >
                            <Plus className="mobile-icon" />
                            ADD
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Existing Expenses */}
                    {typeExpenses.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="mobile-text-base brutal-text font-medium">
                          EXPENSES ({typeExpenses.length})
                        </h4>
                        {typeExpenses.map((expense) => (
                          <div key={expense.id} className="brutal-border brutal-shadow p-3 bg-background">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-4">
                                  <span className="mobile-text-lg brutal-text font-bold text-primary">
                                    ${formatCurrency(expense.amount)}
                                  </span>
                                  <span className="mobile-text-sm text-muted-foreground">
                                    {format(new Date(expense.date), 'MMM dd, yyyy')}
                                  </span>
                                </div>
                                {expense.note && (
                                  <p className="mobile-text-sm text-muted-foreground mt-1">
                                    {expense.note}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="brutal-border brutal-shadow brutal-hover"
                              >
                                <Trash2 className="mobile-icon" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="mobile-text-sm text-muted-foreground">
                          No expenses found for the selected period
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalExpenses;