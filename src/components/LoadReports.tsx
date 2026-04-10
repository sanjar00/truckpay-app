import { useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { isBefore, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddLoadForm from './AddLoadForm';
import LoadCard from './LoadCard';
import WeeklySummary from './WeeklySummary';
import LoadReportsHeader from './LoadReportsHeader';
import LoadSummaryCards from './LoadSummaryCards';
import MileageTracking from './MileageTracking';
import ConfirmationDialog from './ConfirmationDialog';
import { useLoadReports } from '@/hooks/useLoadReports';
import { useDeductionsManager } from '@/hooks/useDeductionsManager';
import { useMileageManager } from '@/hooks/useMileageManager';
import { calculateFixedDeductionsForWeek } from '@/lib/loadReportsUtils';
import { getUserWeekStart } from '@/lib/weeklyPeriodUtils';
import { LoadReportsProps, DeleteConfirmation } from '@/types/LoadReports';
import WeeklyForecastCard from './WeeklyForecastCard';

const LoadReports = ({ onBack, user, userProfile, deductions, onUpgrade }: LoadReportsProps) => {
  const { isFeatureAllowed } = useSubscription();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmation | null>(null);
  const [showAddExtraDeduction, setShowAddExtraDeduction] = useState(false);
  const [newExtraDeduction, setNewExtraDeduction] = useState({ name: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [editingDeduction, setEditingDeduction] = useState<string | null>(null);

  const {
    currentWeek,
    weekStart,
    weekEnd,
    loads,
    currentWeekLoads,
    newLoad,
    showAddForm,
    loading,
    editingLoad,
    availableDeductionTypes,
    setNewLoad,
    setShowAddForm,
    setEditingLoad,
    handleAddLoad,
    handleDeleteLoad: deleteLoad,
    handleEditLoad,
    navigateWeek
  } = useLoadReports(user, userProfile, deductions);

  const {
    weeklyDeductions,
    extraDeductionTypes,
    totalWeeklyDeductions,
    totalExtraDeductions,
    setExtraDeductionTypes,
    handleWeeklyDeductionChange,
    handleAddExtraDeduction: addExtraDeduction,
    handleRemoveExtraDeduction: removeExtraDeduction,
    handleEditExtraDeduction: editExtraDeduction,
    handleAddDeductionFromType
  } = useDeductionsManager(user, weekStart);

  const {
    weeklyMileage,
    handleMileageChange,
    calculateRPM,
    autoFilledFields,
    leaseMilesCost
  } = useMileageManager(user, weekStart, userProfile);

  const handleDeleteLoad = async (id: string) => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm({ type: 'load', id });
      return;
    }
    
    await deleteLoad(id);
    setShowDeleteConfirm(null);
  };

  const handleRemoveExtraDeduction = async (id: string) => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm({ type: 'deduction', id });
      return;
    }
    
    await removeExtraDeduction(id);
    setShowDeleteConfirm(null);
  };

  const handleEditExtraDeduction = async (id: string, name: string, amount: string) => {
    const success = await editExtraDeduction(id, name, amount);
    if (success) {
      setEditingDeduction(null);
    }
  };

  const handleAddExtraDeduction = async () => {
    // Validate both name and amount more thoroughly
    const name = newExtraDeduction.name.trim();
    const amount = newExtraDeduction.amount.trim();
    const date = newExtraDeduction.date;
    
    // Check if name exists and amount is a valid positive number
    if (name && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
      const success = await addExtraDeduction(name, amount, date);

      if (success) {
        setNewExtraDeduction({ name: '', amount: '', date: new Date().toISOString().split('T')[0] });
        setShowAddExtraDeduction(false);
      }
    }
  };

  // Paywall: gate prev-week navigation for free users
  const handleNavigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      const currentWeekStartDay = startOfDay(weekStart);
      const todayWeekStart = startOfDay(getUserWeekStart(new Date(), userProfile));
      if (isBefore(currentWeekStartDay, todayWeekStart) && !isFeatureAllowed('fullHistory')) {
        onUpgrade?.();
        return;
      }
    }
    navigateWeek(direction);
  };

  // Paywall: gate 6th load for free users
  const handleShowAddForm = () => {
    if (!isFeatureAllowed('fullHistory') && currentWeekLoads.length >= 5) {
      onUpgrade?.();
      return;
    }
    setShowAddForm(true);
  };

  const totalGrossPay = currentWeekLoads.reduce((total, load) => total + ((load.rate || 0) + (load.detentionAmount || 0)), 0);
  const totalDriverPay = currentWeekLoads.reduce((total, load) => total + (load.driverPay || 0), 0);
  const totalFixedDeductions = calculateFixedDeductionsForWeek(deductions, weekStart);

  // Only subtract lease miles cost for lease-operator drivers
  const leaseCostDeduction = userProfile?.driverType === 'lease-operator' ? leaseMilesCost : 0;
  const netPay = totalDriverPay - totalWeeklyDeductions - totalExtraDeductions - totalFixedDeductions - leaseCostDeduction;

  // Deadhead miles = total odometer miles − sum of Google Maps load miles
  const totalLoadMiles = currentWeekLoads.reduce((sum, load) => sum + (load.estimatedMiles || 0), 0);
  const loadsWithMiles = currentWeekLoads.filter(l => l.estimatedMiles && l.estimatedMiles > 0).length;
  const deadheadMiles =
    weeklyMileage.totalMiles > 0 && loadsWithMiles > 0
      ? Math.max(0, weeklyMileage.totalMiles - totalLoadMiles)
      : null;

  return (
    <div className="min-h-screen bg-background brutal-grid p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <LoadReportsHeader
          onBack={onBack}
          weekStart={weekStart}
          weekEnd={weekEnd}
          userProfile={userProfile}
          onNavigateWeek={handleNavigateWeek}
        />

        <LoadSummaryCards
          currentWeekLoads={currentWeekLoads}
          totalGrossPay={totalGrossPay}
          netPay={netPay}
          totalDriverPay={totalDriverPay}
          totalWeeklyDeductions={totalWeeklyDeductions}
          totalExtraDeductions={totalExtraDeductions}
          totalFixedDeductions={totalFixedDeductions}
          leaseMilesCost={leaseCostDeduction}
        />

        {/* Add Load Button */}
        <Button
          onClick={handleShowAddForm}
          className="w-full h-16 brutal-border-accent hover:brutal-border-info bg-accent hover:bg-accent text-accent-foreground brutal-hover brutal-active"
          size="lg"
        >
          <Plus className="w-8 h-8 mr-3" />
          <div className="text-left">
            <p className="brutal-text text-xl">Add Load</p>
            <p className="brutal-mono text-sm opacity-80">Record this week's load</p>
          </div>
        </Button>

        <MileageTracking
          weeklyMileage={weeklyMileage}
          onMileageChange={handleMileageChange}
          calculateRPM={() => calculateRPM(totalGrossPay)}
          autoFilledFields={autoFilledFields}
          deadheadMiles={deadheadMiles}
        />

        <WeeklyForecastCard
          user={user}
          userProfile={userProfile}
          weekStart={weekStart}
          weekEnd={weekEnd}
          currentGross={totalGrossPay}
          currentDriverPay={totalDriverPay}
          loadCount={currentWeekLoads.length}
          fixedDeductionsWeeklyTotal={totalFixedDeductions}
          totalWeeklyDeductions={totalWeeklyDeductions}
          totalExtraDeductions={totalExtraDeductions}
        />

        {/* Add/Edit Load Modal */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-h-[90vh] overflow-y-auto brutal-border brutal-shadow-lg">
            <DialogHeader>
              <DialogTitle className="brutal-text text-2xl">
                {editingLoad ? 'Edit Load' : 'New Load'}
              </DialogTitle>
            </DialogHeader>
            <AddLoadForm
              newLoad={newLoad}
              setNewLoad={setNewLoad}
              onAddLoad={handleAddLoad}
              onCancel={() => setShowAddForm(false)}
              loading={loading}
              weekStart={weekStart}
              weekEnd={weekEnd}
              userProfile={userProfile}
            />
          </DialogContent>
        </Dialog>

        {/* Load Cards */}
        {currentWeekLoads.length > 0 ? (
          <div className="space-y-4">
            <h3 className="brutal-text text-xl text-foreground">This Week's Loads ({currentWeekLoads.length})</h3>
            {currentWeekLoads.map((load) => (
              <div key={load.id} className="brutal-border bg-card p-6 brutal-shadow">
                <LoadCard
                  load={load}
                  onDelete={handleDeleteLoad}
                  onEdit={() => {
                    setNewLoad({
                      rate: load.rate.toString(),
                      companyDeduction: load.companyDeduction?.toString() || '',
                      pickupDate: load.pickupDate,
                      deliveryDate: load.deliveryDate,
                      deadheadMiles: load.deadheadMiles?.toString() || '',
                      detentionAmount: load.detentionAmount?.toString() || '',
                      notes: load.notes || '',
                      pickupZip: load.pickupZip || '',
                      deliveryZip: load.deliveryZip || '',
                      pickupCityState: load.pickupCityState || '',
                      deliveryCityState: load.deliveryCityState || '',
                      locationFrom: load.locationFrom || '',
                      locationTo: load.locationTo || '',
                      estimatedMiles: load.estimatedMiles,
                    });
                    setEditingLoad(load.id);
                    setShowAddForm(true);
                  }}
                  estimatedMiles={
                    weeklyMileage.totalMiles > 0 && currentWeekLoads.length > 0
                      ? weeklyMileage.totalMiles / currentWeekLoads.length
                      : undefined
                  }
                  userProfile={userProfile}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="brutal-border bg-muted p-8 brutal-shadow text-center">
            <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="brutal-text text-xl text-muted-foreground">No loads recorded</p>
            <p className="brutal-mono text-sm text-muted-foreground">for this week</p>
          </div>
        )}

        {/* Weekly Summary - Only show when there are loads */}
        {currentWeekLoads.length > 0 && (
          <WeeklySummary 
            weeklyDeductions={weeklyDeductions}
            onWeeklyDeductionChange={handleWeeklyDeductionChange}
            availableDeductionTypes={availableDeductionTypes}
            totalGrossPay={totalGrossPay}
            totalDriverPay={totalDriverPay}
            totalWeeklyDeductions={totalWeeklyDeductions}
            totalFixedDeductions={totalFixedDeductions}
            totalExtraDeductions={totalExtraDeductions}
            leaseMilesCost={leaseCostDeduction}
            netPay={netPay}
            extraDeductionTypes={extraDeductionTypes}
            onAddExtraDeduction={handleAddExtraDeduction}
            onAddDeductionFromType={handleAddDeductionFromType}
            onRemoveExtraDeduction={handleRemoveExtraDeduction}
            onEditExtraDeduction={handleEditExtraDeduction}
            editingDeduction={editingDeduction}
            setEditingDeduction={setEditingDeduction}
            showAddExtraDeduction={showAddExtraDeduction}
            setShowAddExtraDeduction={setShowAddExtraDeduction}
            newExtraDeduction={newExtraDeduction}
            setNewExtraDeduction={setNewExtraDeduction}
            weeklyMileage={weeklyMileage}
          />
        )}

        <ConfirmationDialog 
          showDeleteConfirm={showDeleteConfirm}
          onConfirm={() => {
            if (showDeleteConfirm?.type === 'load') {
              handleDeleteLoad(showDeleteConfirm.id);
            } else {
              handleRemoveExtraDeduction(showDeleteConfirm.id);
            }
          }}
          onCancel={() => setShowDeleteConfirm(null)}
        />
      </div>
    </div>
  );
};

export default LoadReports;