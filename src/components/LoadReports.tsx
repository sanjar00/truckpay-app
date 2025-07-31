import { useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { LoadReportsProps, DeleteConfirmation } from '@/types/LoadReports';

const LoadReports = ({ onBack, user, userProfile, deductions }: LoadReportsProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmation | null>(null);
  const [showAddExtraDeduction, setShowAddExtraDeduction] = useState(false);
  const [newExtraDeduction, setNewExtraDeduction] = useState({ name: '', amount: '' });
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
    calculateRPM
  } = useMileageManager(user, weekStart);

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
    if (newExtraDeduction.name.trim() && newExtraDeduction.amount.trim()) {
      const success = await addExtraDeduction(newExtraDeduction);
      
      if (success) {
        setNewExtraDeduction({ name: '', amount: '' });
        setShowAddExtraDeduction(false);
      }
    }
  };

  const totalGrossPay = currentWeekLoads.reduce((total, load) => total + (load.rate || 0), 0);
  const totalDriverPay = currentWeekLoads.reduce((total, load) => total + (load.driverPay || 0), 0);
  const totalFixedDeductions = calculateFixedDeductionsForWeek(deductions, weekStart);
  const netPay = totalDriverPay - totalWeeklyDeductions - totalExtraDeductions - totalFixedDeductions;

  return (
    <div className="min-h-screen bg-background brutal-grid p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <LoadReportsHeader 
          onBack={onBack}
          weekStart={weekStart}
          weekEnd={weekEnd}
          userProfile={userProfile}
          onNavigateWeek={navigateWeek}
        />

        <LoadSummaryCards 
          currentWeekLoads={currentWeekLoads}
          totalGrossPay={totalGrossPay}
        />

        <MileageTracking 
          weeklyMileage={weeklyMileage}
          onMileageChange={handleMileageChange}
          calculateRPM={() => calculateRPM(totalGrossPay)}
        />

        {/* Add New Load Button */}
        <Button 
          onClick={() => setShowAddForm(true)}
          className="w-full h-16 brutal-border-accent hover:brutal-border-info bg-accent hover:bg-accent text-accent-foreground brutal-hover brutal-active"
          size="lg"
        >
          <Plus className="w-8 h-8 mr-3" />
          <div className="text-left">
            <p className="brutal-text text-xl">ADD_NEW_LOAD</p>
            <p className="brutal-mono text-sm opacity-80">RECORD_LOAD_DATA</p>
          </div>
        </Button>

        {/* Add Load Form */}
        {showAddForm && (
          <div className="brutal-border-secondary bg-secondary p-6 brutal-shadow-lg">
            <h3 className="brutal-text text-xl text-secondary-foreground mb-4">NEW_LOAD_ENTRY</h3>
            <AddLoadForm 
              newLoad={newLoad}
              setNewLoad={setNewLoad}
              onAddLoad={handleAddLoad}
              onCancel={() => setShowAddForm(false)}
              loading={loading}
              weekStart={weekStart}
              weekEnd={weekEnd}
            />
          </div>
        )}

        {/* Load Cards */}
        {currentWeekLoads.length > 0 ? (
          <div className="space-y-4">
            <h3 className="brutal-text text-xl text-foreground">WEEK_LOADS ({currentWeekLoads.length})</h3>
            {currentWeekLoads.map((load) => (
              <div key={load.id} className="brutal-border bg-card p-6 brutal-shadow">
                <LoadCard 
                  load={load} 
                  onDelete={handleDeleteLoad}
                  onEdit={handleEditLoad}
                  isEditing={editingLoad === load.id}
                  setIsEditing={(editing) => setEditingLoad(editing ? load.id : null)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="brutal-border bg-muted p-8 brutal-shadow text-center">
            <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="brutal-text text-xl text-muted-foreground">NO_LOADS_RECORDED</p>
            <p className="brutal-mono text-sm text-muted-foreground">FOR_THIS_WEEK</p>
          </div>
        )}

        {/* Weekly Summary - Only show when there are loads */}
        {currentWeekLoads.length > 0 && (
          <WeeklySummary 
            weeklyDeductions={weeklyDeductions}
            onWeeklyDeductionChange={handleWeeklyDeductionChange}
            availableDeductionTypes={availableDeductionTypes}
            fixedDeductions={deductions?.filter(d => d.isFixed) || []}
            totalGrossPay={totalGrossPay}
            totalDriverPay={totalDriverPay}
            totalWeeklyDeductions={totalWeeklyDeductions}
            totalFixedDeductions={totalFixedDeductions}
            totalExtraDeductions={totalExtraDeductions}
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