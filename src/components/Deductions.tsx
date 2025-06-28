
import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DeductionsSummary from './DeductionsSummary';
import { formatCurrency } from '@/lib/utils';

const Deductions = ({ onBack, deductions, setDeductions }: DeductionsProps) => {
  const { user } = useAuth();
  const [fixedDeductions, setFixedDeductions] = useState({});
  const [newDeductionType, setNewDeductionType] = useState('');
  const [customDeductionTypes, setCustomDeductionTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingFixAction, setPendingFixAction] = useState<{type: string, checked: boolean} | null>(null);

  // Fetch deductions from Supabase on component mount
  useEffect(() => {
    if (user) {
      fetchDeductions();
    }
  }, [user]);

  const fetchDeductions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('deductions')
        .select('*')
        .eq('user_id', user.id)
        // ✅ Remove the is_fixed filter to fetch all deductions
        .order('created_at', { ascending: false });
  
      if (error) {
        console.error('Error fetching deductions:', error);
        return;
      }
  
      if (data) {
        const mappedDeductions = data.map(deduction => ({
          id: deduction.id,
          type: deduction.type,
          amount: deduction.amount,
          isFixed: deduction.is_fixed,
          isCustomType: deduction.is_custom_type,
          dateAdded: deduction.date_added
        }));
        setDeductions(mappedDeductions);
      }
    } catch (error) {
      console.error('Error fetching deductions:', error);
    }
  };

  const handleFixedToggle = async (type, checked) => {
    if (!checked) {
      // If unchecking, update is_fixed to false instead of deleting
      const existingDeduction = deductions.find(d => d.type === type && d.isFixed);
      if (existingDeduction && user) {
        try {
          const { error } = await supabase
            .from('deductions')
            .update({ is_fixed: false })  // ✅ Update instead of delete
            .eq('id', existingDeduction.id)
            .eq('user_id', user.id);
          
          if (!error) {
            // Update local state to reflect the change
            setDeductions(prev => prev.map(d => 
              d.id === existingDeduction.id 
                ? { ...d, isFixed: false }
                : d
            ));
            setFixedDeductions(prev => ({
              ...prev,
              [type]: undefined
            }));
          }
        } catch (error) {
          console.error('Error updating fixed deduction:', error);
        }
      } else {
        // Just update local state if no database record
        setFixedDeductions(prev => ({
          ...prev,
          [type]: undefined
        }));
      }
    } else {
      // If checking, enable the deduction
      setFixedDeductions(prev => ({
        ...prev,
        [type]: { enabled: true, amount: '' }
      }));
    }
  };

  const handleFixedToggleWithConfirmation = (type: string, checked: boolean) => {
    if (checked) {
      // Show confirmation dialog when marking as fixed
      setPendingFixAction({ type, checked });
    } else {
      // Directly handle unchecking without confirmation
      handleFixedToggle(type, checked);
    }
  };

  const confirmFixedToggle = () => {
    if (pendingFixAction) {
      handleFixedToggle(pendingFixAction.type, pendingFixAction.checked);
      setPendingFixAction(null);
    }
  };

  const handleAmountChange = (type, amount) => {
    setFixedDeductions(prev => ({
      ...prev,
      [type]: { ...prev[type], amount }
    }));
  };

  const handleSaveFixedDeduction = async (type) => {
    const deductionData = fixedDeductions[type];
    if (deductionData && deductionData.amount && user) {
      setLoading(true);
      
      try {
        // Check if deduction already exists
        const existingDeduction = deductions.find(d => d.type === type && d.isFixed);
        
        if (existingDeduction) {
          // Update existing deduction
          const { error } = await supabase
            .from('deductions')
            .update({
              amount: parseFloat(deductionData.amount),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingDeduction.id)
            .eq('user_id', user.id);

          if (error) {
            console.error('Error updating deduction:', error);
            return;
          }
        } else {
          // Insert new deduction
          const { data, error } = await supabase
            .from('deductions')
            .insert({
              user_id: user.id,
              type: type,
              amount: parseFloat(deductionData.amount),
              is_fixed: true,
              is_custom_type: customDeductionTypes.includes(type)
            })
            .select()
            .single();

          if (error) {
            console.error('Error saving deduction:', error);
            return;
          }
        }

        // Refresh deductions from database
        await fetchDeductions();
        
        // Clear the form
        setFixedDeductions(prev => ({
          ...prev,
          [type]: { enabled: true, amount: '' }
        }));
        
      } catch (error) {
        console.error('Error saving deduction:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddCustomType = async () => {
    if (newDeductionType.trim() && !allDeductionTypes.includes(newDeductionType.trim()) && user) {
      setLoading(true);
      
      try {
        // Add directly to deductions table as non-fixed
        const { data, error } = await supabase
          .from('deductions')
          .insert({
            user_id: user.id,
            type: newDeductionType.trim(),
            amount: 0, // Default amount
            is_fixed: false, // Not fixed by default
            is_custom_type: true
          })
          .select()
          .single();

        if (error) {
          console.error('Error adding custom deduction type:', error);
          return;
        }

        if (data) {
          // Add to local state
          const newDeduction = {
            id: data.id,
            type: data.type,
            amount: data.amount,
            isFixed: data.is_fixed,
            isCustomType: data.is_custom_type,
            dateAdded: data.date_added
          };
          setDeductions(prev => [...prev, newDeduction]);
        }

        setNewDeductionType('');
        
      } catch (error) {
        console.error('Error adding custom deduction type:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteDeduction = async (id) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('deductions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting deduction:', error);
        return;
      }

      // Update local state
      setDeductions(prev => prev.filter(deduction => deduction.id !== id));
    } catch (error) {
      console.error('Error deleting deduction:', error);
    }
  };

  // Add this new function to fetch removed predefined types
  const fetchRemovedPredefinedTypes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('removed_predefined_types')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error fetching removed predefined types:', error);
        return;
      }

      if (data && data.removed_predefined_types) {
        setRemovedPredefinedTypes(data.removed_predefined_types);
      }
    } catch (error) {
      console.error('Error fetching removed predefined types:', error);
    }
  };

  // Update the handleRemovePredefinedType function to persist to database
  const handleRemovePredefinedType = async (type: string) => {
    const newRemovedTypes = [...removedPredefinedTypes, type];
    setRemovedPredefinedTypes(newRemovedTypes);
    
    if (!user) return;
    
    try {
      // First, try to update existing record
      const { data: existingData, error: fetchError } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking user preferences:', fetchError);
        return;
      }

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('user_preferences')
          .update({ removed_predefined_types: newRemovedTypes })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating removed predefined types:', error);
        }
      } else {
        // Create new record
        const { error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            removed_predefined_types: newRemovedTypes
          });

        if (error) {
          console.error('Error saving removed predefined types:', error);
        }
      }
    } catch (error) {
      console.error('Error persisting removed predefined types:', error);
    }
  };

  const customTypesFromDeductions = deductions
    .filter(d => d.isCustomType)
    .map(d => d.type)
    .filter((type, index, self) => self.indexOf(type) === index); // Remove duplicates
  
  // Only use custom deduction types - no predefined types
  const allDeductionTypes = [...customTypesFromDeductions];

  return (
    <div className="min-h-screen bg-background brutal-grid p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="brutal-border bg-card p-6 brutal-shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="brutal-border-accent bg-accent text-accent-foreground"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              BACK
            </Button>
            <div>
              <h1 className="brutal-text text-3xl text-foreground">DEDUCTIONS</h1>
              <p className="brutal-mono text-sm text-muted-foreground">EXPENSE_MANAGEMENT_SYSTEM</p>
            </div>
          </div>
        </div>

        <DeductionsSummary deductions={deductions} />

        {/* Fixed Deductions Setup - Only show if there are deduction types available */}
        {allDeductionTypes.length > 0 && (
          <div className="brutal-border-warning bg-warning p-6 brutal-shadow-lg">
            <div className="mb-6">
              <h2 className="brutal-text text-2xl text-info-foreground mb-2">
                DEDUCTION_TYPES
              </h2>
              <p className="brutal-mono text-sm text-info-foreground opacity-80">
                SET_RECURRING_WEEKLY_AMOUNTS
              </p>
            </div>
            
            <div className="space-y-4">
              {allDeductionTypes.map((type) => {
                const isFixed = fixedDeductions[type]?.enabled;
                const existingDeduction = deductions.find(d => d.type === type && d.isFixed);
                // Remove the isPredefined line completely
                // const isPredefined = predefinedDeductionTypes.includes(type);
                
                return (
                  <div key={type} className="brutal-border bg-background p-4 brutal-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Label 
                        htmlFor={`fix-${type}`} 
                        className="brutal-text text-lg font-bold flex-1"
                      >
                        {type.toUpperCase()}
                      </Label>
                      <div className="flex items-center gap-3">
                        <AlertDialog open={pendingFixAction?.type === type} onOpenChange={(open) => !open && setPendingFixAction(null)}>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`fix-${type}`} className="brutal-mono text-sm font-medium">
                              FIX
                            </Label>
                            <Checkbox
                              id={`fix-${type}`}
                              checked={isFixed || !!existingDeduction}
                              onCheckedChange={(checked) => handleFixedToggleWithConfirmation(type, checked)}
                              className="brutal-border w-5 h-5"
                            />
                          </div>
                          <AlertDialogContent className="brutal-border bg-card brutal-shadow-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="brutal-text text-xl text-foreground">
                                CONFIRM_FIXED_DEDUCTION
                              </AlertDialogTitle>
                              <AlertDialogDescription className="brutal-mono text-sm text-muted-foreground">
                                This function implements this deduction type to each week with the inputted amount. 
                                The deduction will be automatically applied to all future weekly calculations.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="brutal-border bg-background text-foreground">
                                CANCEL
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={confirmFixedToggle}
                                className="brutal-border-success bg-success text-success-foreground"
                              >
                                CONFIRM
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        {/* Delete button - simplified since all types are now custom */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // All types are custom now, so just delete all instances
                            const customDeductions = deductions.filter(d => d.type === type);
                            customDeductions.forEach(d => handleDeleteDeduction(d.id));
                          }}
                          className="brutal-border-destructive bg-destructive hover:bg-destructive text-destructive-foreground brutal-shadow"
                          title="Delete custom type"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {(isFixed || existingDeduction) && (
                      <div className="space-y-3">
                        <Label 
                          htmlFor={`amount-${type}`}
                          className="brutal-mono text-sm font-medium"
                        >
                          WEEKLY_AMOUNT_($)
                        </Label>
                        <div className="flex gap-3">
                          <Input
                            id={`amount-${type}`}
                            type="number"
                            placeholder="150.00"
                            step="0.01"
                            min="0"
                            value={existingDeduction ? existingDeduction.amount : (fixedDeductions[type]?.amount || '')}
                            onChange={(e) => handleAmountChange(type, e.target.value)}
                            className="brutal-border bg-background text-lg font-bold flex-1"
                          />
                          <Button
                            onClick={() => handleSaveFixedDeduction(type)}
                            disabled={!fixedDeductions[type]?.amount}
                            className="brutal-border-success bg-success text-success-foreground brutal-shadow"
                          >
                            <span className="brutal-text">SAVE</span>
                          </Button>
                        </div>
                        {existingDeduction && (
                          <div className="brutal-border-success bg-success/10 p-3 brutal-shadow">
                            <p className="brutal-mono text-sm text-success font-bold">
                              ✓ FIXED_AT_${existingDeduction.amount.toFixed(2)}/WEEK
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Custom Deduction Type */}
        <div className="brutal-border-accent bg-accent p-6 brutal-shadow-lg">
          <h2 className="brutal-text text-2xl text-accent-foreground mb-4">
            ADD_NEW_DEDUCTION_TYPE
          </h2>
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="ENTER_NAME"
              value={newDeductionType}
              onChange={(e) => setNewDeductionType(e.target.value)}
              className="brutal-border bg-background text-lg font-bold flex-1"
            />
            <Button
              onClick={handleAddCustomType}
              disabled={!newDeductionType.trim()}
              className="brutal-border-primary bg-primary text-primary-foreground brutal-shadow-lg brutal-hover"
            >
              <Plus className="w-6 h-6 mr-2" />
              <span className="brutal-text">ADD_TYPE</span>
            </Button>
          </div>
        </div>

        {/* Current Fixed Deductions List */}
        {deductions.filter(d => d.isFixed).length > 0 && (
          <div className="brutal-border-success bg-success p-6 brutal-shadow-lg">
            <h2 className="brutal-text text-2xl text-success-foreground mb-4">
              CURRENT_FIXED_DEDUCTIONS
            </h2>
            <div className="space-y-4">
              {deductions.filter(d => d.isFixed).map((deduction) => (
                <div key={deduction.id} className="brutal-border bg-success/10 p-4 brutal-shadow flex items-center justify-between">
                  <div>
                    <p className="brutal-mono text-sm text-success-foreground">{deduction.type.toUpperCase().replace(/ /g, '_')}</p>
                    <p className="brutal-text text-lg text-success-foreground">✓ FIXED_AT_${formatCurrency(deduction.amount)}/WEEK</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDeduction(deduction.id)}
                    className="brutal-border-destructive bg-destructive hover:bg-destructive text-destructive-foreground brutal-shadow"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Deductions;
