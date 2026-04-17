
import { useState, useEffect, useRef } from 'react';
import { Truck, Calculator, Settings, DollarSign, FileText, Receipt, Calendar, Map, Lock, Info, MoreHorizontal, Plus, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddLoadForm from '@/components/AddLoadForm';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getUserWeekStart, getUserWeekEnd } from '@/lib/weeklyPeriodUtils';
import { calculateFixedDeductionsForWeek } from '@/lib/loadReportsUtils';
import LoginPage from '@/components/LoginPage';
import Registration from '@/components/Registration';
import ResetPasswordPage from '@/components/ResetPasswordPage';
import LoadReports from '@/components/LoadReports';
import Deductions from '@/components/Deductions';
import ForecastSummary from '@/components/ForecastSummary';
import SettingsPanel from '@/components/SettingsPanel';
import PersonalExpenses from '@/components/PersonalExpenses';
import PerDiemCalculator from '@/components/PerDiemCalculator';
import IFTAReport from '@/components/IFTAReport';
import UpgradeModal from '@/components/UpgradeModal';
import SubscriptionSuccessModal from '@/components/SubscriptionSuccessModal';
import ReceiptScanner from '@/components/ReceiptScanner';
import { SubscriptionTier } from '@/hooks/useSubscription';

const SnapshotTooltip = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-accent-foreground opacity-50 hover:opacity-100 focus:opacity-100 transition-opacity ml-1"
        aria-label="More info"
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-foreground text-background text-xs rounded px-2 py-1.5 shadow-lg z-50 leading-snug pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
        </div>
      )}
    </div>
  );
};

const ALLOWED_LOCAL_KEYS = new Set(['truckpay_weekly_goal', 'truckpay_annual_goal']);

const Index = () => {
  const { user, loading, signOut, isPasswordRecovery, isSocialAuth } = useAuth();
  const { isFeatureAllowed, subscription, loading: subscriptionLoading, activateEarlyAdopter, dismissEarlyAdopterBanner, refreshSubscription } = useSubscription();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showRegistration, setShowRegistration] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ feature: string; tier: 'pro' | 'owner' } | null>(null);
  const [successModal, setSuccessModal] = useState<{ tier: SubscriptionTier; isTrial: boolean } | null>(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loads, setLoads] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [weekSnapshot, setWeekSnapshot] = useState<{ loadCount: number; gross: number; expenses: number; net: number; weekStart: Date; weekEnd: Date } | null>(null);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showAddLoadModal, setShowAddLoadModal] = useState(false);
  const [newLoad, setNewLoad] = useState({ rate: '', companyDeduction: '', pickupDate: new Date() as Date | undefined, deliveryDate: new Date() as Date | undefined, deadheadMiles: '', detentionAmount: '', notes: '', pickupZip: '', deliveryZip: '', pickupCityState: '', deliveryCityState: '', locationFrom: '', locationTo: '', estimatedMiles: undefined as any });
  const [loadingAddLoad, setLoadingAddLoad] = useState(false);
  const [showScanDestPicker, setShowScanDestPicker] = useState(false);
  const [showHomeReceiptScanner, setShowHomeReceiptScanner] = useState(false);
  const [scanDestination, setScanDestination] = useState<'personal' | 'work' | null>(null);

  // Remove any stale/sensitive truckpay_* keys that should not be in localStorage
  useEffect(() => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('truckpay_') && !ALLOWED_LOCAL_KEYS.has(k))
      .forEach(k => localStorage.removeItem(k));
  }, []);

  // Detect return from Stripe Checkout and refresh subscription
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      const tierParam = params.get('tier') as SubscriptionTier | null;
      window.history.replaceState({}, '', window.location.pathname);
      if (user) refreshSubscription();
      setSuccessModal({ tier: tierParam ?? 'pro', isTrial: false });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchDeductions();
    }
  }, [user]);

  useEffect(() => {
    if (user && userProfile) {
      fetchWeekSnapshot(deductions);
    }
  }, [user, userProfile, deductions]);

  const fetchDeductions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('deductions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_fixed', true);
      
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

  const fetchWeekSnapshot = async (fixedDeductions: any[] = []) => {
    if (!user || !userProfile) return;
    const now = new Date();
    const weekStart = getUserWeekStart(now, userProfile);
    const weekEnd = getUserWeekEnd(now, userProfile);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    try {
      const { data: loadsData } = await supabase
        .from('load_reports')
        .select('rate, company_deduction, driver_pay, detention_amount')
        .eq('user_id', user.id)
        .gte('date_added', weekStartStr)
        .lte('date_added', weekEndStr);

      const { data: weeklyDeductionsData } = await supabase
        .from('weekly_deductions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr);

      const { data: extraDeductionsData } = await supabase
        .from('weekly_extra_deductions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr);

      let leaseMilesCost = 0;
      // Only fetch lease miles cost for lease-operator drivers
      if (userProfile?.driverType === 'lease-operator') {
        try {
          // Fetch lease miles cost from weekly_mileage table
          const { data: mileageData, error } = await (supabase as any)
            .from('weekly_mileage')
            .select('lease_miles_cost')
            .eq('user_id', user.id)
            .eq('week_start', weekStartStr)
            .maybeSingle();

          if (!error && mileageData?.lease_miles_cost) {
            leaseMilesCost = mileageData.lease_miles_cost;
          }
        } catch {
          // If weekly_mileage query fails, just skip lease cost
        }
      }

      const gross = (loadsData || []).reduce((sum, l) => sum + ((l.rate || 0) + (l.detention_amount || 0)), 0);
      const driverPay = (loadsData || []).reduce((sum, l) => sum + (l.driver_pay || 0), 0);
      const fixedTotal = calculateFixedDeductionsForWeek(fixedDeductions, weekStart);
      const expenses =
        (weeklyDeductionsData || []).reduce((sum, d) => sum + (d.amount || 0), 0) +
        (extraDeductionsData || []).reduce((sum, d) => sum + (d.amount || 0), 0) +
        fixedTotal +
        leaseMilesCost;

      setWeekSnapshot({
        loadCount: (loadsData || []).length,
        gross,
        expenses,
        net: driverPay - expenses,
        weekStart,
        weekEnd,
      });
    } catch {
      // non-critical — snapshot stays null
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setUserProfile({
        name: data.full_name,
        phone: data.phone,
        email: user.email,
        driverType: data.driver_type,
        companyDeduction: data.company_deduction,
        weeklyPeriod: data.weekly_period || 'sunday',
        weeklyPeriodUpdatedAt: data.weekly_period_updated_at,
        leaseRatePerMile: data.lease_rate_per_mile ?? null,
        companyPayType: data.company_pay_type ?? null,
        companyPayRate: data.company_pay_rate ?? null,
      });
    }

    // Early adopter check: grant 90-day Pro if user has pre-existing load data
    await activateEarlyAdopter();
  };

  const handleRegistrationComplete = () => {
    setShowRegistration(false);
    fetchUserProfile();
  };

  const navigateTo = (view: string, feature: 'perdiem' | 'ifta' | 'forecast' | null = null) => {
    if (feature && !isFeatureAllowed(feature)) {
      setUpgradeModal({ feature, tier: 'pro' });
      return;
    }
    setCurrentView(view);
  };

  const clearLocalUserData = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('truckpay_'))
      .forEach(k => localStorage.removeItem(k)); // wipe everything including goals on logout
  };

  const handleLogout = async () => {
    clearLocalUserData();
    await signOut();
    setCurrentView('dashboard');
    setUserProfile(null);
    setLoads([]);
    setDeductions([]);
  };

  const handleAddLoadFromHome = async () => {
    setLoadingAddLoad(true);
    try {
      // Validate minimum required fields
      const rate = parseFloat(newLoad.rate);
      if (!newLoad.rate || isNaN(rate) || rate <= 0) {
        alert('Please enter a valid load rate');
        setLoadingAddLoad(false);
        return;
      }

      if (!userProfile) {
        setLoadingAddLoad(false);
        return;
      }

      const companyDed = newLoad.companyDeduction ? parseFloat(newLoad.companyDeduction) : 0;
      const driverPayAmount = rate * (1 - companyDed / 100) + (parseFloat(newLoad.detentionAmount) || 0);

      const weekStart = getUserWeekStart(new Date(), userProfile);
      const weekEnd = getUserWeekEnd(new Date(), userProfile);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { error } = await supabase
        .from('load_reports')
        .insert([
          {
            user_id: user?.id,
            rate: rate,
            company_deduction: companyDed,
            driver_pay: driverPayAmount,
            location_from: newLoad.locationFrom || '',
            location_to: newLoad.locationTo || '',
            pickup_date: newLoad.pickupDate,
            delivery_date: newLoad.deliveryDate,
            date_added: weekStartStr,
            week_period: weekStartStr,
            deadhead_miles: newLoad.deadheadMiles ? parseInt(newLoad.deadheadMiles) : null,
            detention_amount: newLoad.detentionAmount ? parseFloat(newLoad.detentionAmount) : 0,
            notes: newLoad.notes || '',
            pickup_zip: newLoad.pickupZip || '',
            delivery_zip: newLoad.deliveryZip || '',
            pickup_city_state: newLoad.pickupCityState || '',
            delivery_city_state: newLoad.deliveryCityState || '',
            estimated_miles: newLoad.estimatedMiles || null,
          }
        ]);

      if (error) {
        alert('Error adding load. Please try again.');
        console.error('Error:', error);
      } else {
        // Reset form and close modal
        setNewLoad({ rate: '', companyDeduction: '', pickupDate: new Date(), deliveryDate: new Date(), deadheadMiles: '', detentionAmount: '', notes: '', pickupZip: '', deliveryZip: '', pickupCityState: '', deliveryCityState: '', locationFrom: '', locationTo: '', estimatedMiles: undefined });
        setShowAddLoadModal(false);
        // Refresh week snapshot
        fetchWeekSnapshot(deductions);
      }
    } catch (error) {
      console.error('Error adding load:', error);
      alert('Error adding load. Please try again.');
    } finally {
      setLoadingAddLoad(false);
    }
  };

  const handleHomeReceiptConfirm = async (scannedReceipts: any[]) => {
    setShowHomeReceiptScanner(false);
    if (!user || scannedReceipts.length === 0) return;

    if (scanDestination === 'personal') {
      // Save to personal_expenses via supabase — mirror PersonalExpenses logic
      for (const receipt of scannedReceipts) {
        // Find or create expense type
        const { data: existing } = await supabase
          .from('personal_expense_types')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', receipt.category)
          .maybeSingle();

        let typeId = existing?.id;
        if (!typeId) {
          const { data: created } = await supabase
            .from('personal_expense_types')
            .insert({ user_id: user.id, name: receipt.category })
            .select('id')
            .single();
          typeId = created?.id;
        }
        if (!typeId) continue;

        await supabase.from('personal_expenses').insert({
          user_id: user.id,
          expense_type_id: typeId,
          amount: parseFloat(receipt.amount) || 0,
          note: receipt.merchant || receipt.notes || '',
          date: receipt.date || new Date().toISOString().split('T')[0],
        });
      }
    } else if (scanDestination === 'work') {
      // Save to weekly_extra_deductions under the correct week based on receipt date
      for (const receipt of scannedReceipts) {
        const receiptDate = receipt.date ? new Date(receipt.date + 'T00:00:00') : new Date();
        const weekStartForReceipt = getUserWeekStart(receiptDate, userProfile);
        const weekStartStr = weekStartForReceipt.toISOString().split('T')[0];

        await supabase.from('weekly_extra_deductions').insert({
          user_id: user.id,
          week_start: weekStartStr,
          name: receipt.category || receipt.merchant || 'Expense',
          amount: parseFloat(receipt.amount) || 0,
          date_added: receipt.date ? new Date(receipt.date + 'T00:00:00').toISOString() : new Date().toISOString(),
        });
      }
      fetchWeekSnapshot(deductions);
    }

    setScanDestination(null);
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background brutal-grid flex items-center justify-center">
        <div className="text-center">
          <div className="brutal-border bg-secondary p-8 brutal-shadow-lg">
            <Truck className="w-16 h-16 text-foreground mx-auto mb-4 animate-pulse" />
            <p className="brutal-text text-2xl">LOADING...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isPasswordRecovery) {
    return <ResetPasswordPage onDone={() => {}} />;
  }

  if (!user) {
    if (showRegistration) {
      return (
        <Registration
          onComplete={handleRegistrationComplete}
          onBackToLogin={() => setShowRegistration(false)}
        />
      );
    }

    return <LoginPage onShowRegistration={() => setShowRegistration(true)} />;
  }

  // Social auth user who hasn't completed their profile yet (trigger created a stub row, but driver_type is missing)
  if (isSocialAuth && !loading && (!userProfile || !userProfile.driverType)) {
    const meta = user.user_metadata ?? {};
    const prefill = {
      fullName: meta.full_name || meta.name || '',
      email: user.email || '',
    };
    return (
      <Registration
        onComplete={handleRegistrationComplete}
        onBackToLogin={handleLogout}
        prefillData={prefill}
        isSocialAuth={true}
      />
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'loads':
        return (
          <LoadReports
            user={user}
            userProfile={userProfile}
            onBack={() => setCurrentView('dashboard')}
            deductions={deductions}
            onUpgrade={() => setUpgradeModal({ feature: 'fullHistory', tier: 'pro' })}
          />
        );
      case 'deductions':
        return (
          <Deductions
            deductions={deductions}
            setDeductions={setDeductions}
            onBack={() => setCurrentView('dashboard')}
            onUpgrade={() => setUpgradeModal({ feature: 'AI Receipt Scanner', tier: 'pro' })}
          />
        );
      case 'forecast':
        return (
          <ForecastSummary 
            onBack={() => setCurrentView('dashboard')}
            deductions={deductions}
            userProfile={userProfile}
          />
        );
      case 'expenses':
        return (
          <PersonalExpenses
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'perdiem':
        return (
          <PerDiemCalculator
            onBack={() => setCurrentView('dashboard')}
            userProfile={userProfile}
          />
        );
      case 'ifta':
        return (
          <IFTAReport
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'settings':
        return (
          <SettingsPanel
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            onBack={() => setCurrentView('dashboard')}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <div className="bg-background brutal-grid p-3 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Header */}
              <div className="brutal-border bg-card p-4 brutal-shadow-xl">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="TruckPay Logo"
                      className="w-10 h-10 sm:w-14 sm:h-14 object-contain brutal-shadow"
                    />
                    <div>
                      <h1 className="brutal-text text-2xl sm:text-3xl text-foreground">TRUCKPAY</h1>
                      <p className="brutal-text text-sm text-accent">DRIVE SMART. EARN MORE.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentView('settings')}
                      variant="outline"
                      size="sm"
                      className="brutal-border-secondary bg-secondary hover:bg-secondary text-secondary-foreground brutal-shadow brutal-hover brutal-active"
                    >
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>
                </div>

                {/* Weekly Snapshot */}
                {weekSnapshot ? (
                  <div className="brutal-border-info bg-accent p-3 brutal-shadow">
                    <p className="brutal-mono text-xs text-accent-foreground mb-2 uppercase">
                      This Week ({format(weekSnapshot.weekStart, 'MMM d')}–{format(weekSnapshot.weekEnd, 'MMM d')})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <div className="flex items-center">
                          <p className="brutal-mono text-xs text-accent-foreground opacity-75">Loads</p>
                          <SnapshotTooltip text="Total loads recorded this week." />
                        </div>
                        <p className="brutal-text text-xl text-accent-foreground">{weekSnapshot.loadCount}</p>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="brutal-mono text-xs text-accent-foreground opacity-75">Earned</p>
                          <SnapshotTooltip text="Sum of all load rates before any deductions." />
                        </div>
                        <p className="brutal-text text-xl text-accent-foreground">${weekSnapshot.gross.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="brutal-mono text-xs text-accent-foreground opacity-75">Expenses</p>
                          <SnapshotTooltip text="Fuel, tolls, and other costs added this week, plus your weekly fixed costs (e.g. insurance)." />
                        </div>
                        <p className="brutal-text text-xl text-accent-foreground">${weekSnapshot.expenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="brutal-mono text-xs text-accent-foreground opacity-75">Take-Home</p>
                          <SnapshotTooltip text="Your driver pay (after company cut) minus all expenses this week." />
                        </div>
                        <p className={`brutal-text text-xl ${weekSnapshot.net >= 0 ? 'text-accent-foreground' : 'text-destructive'}`}>
                          ${weekSnapshot.net.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                    {/* Weekly goal progress bar */}
                    {(() => {
                      const weeklyGoal = parseFloat(localStorage.getItem('truckpay_weekly_goal') || '0');
                      if (weeklyGoal > 0) {
                        const pct = Math.min(100, Math.round((weekSnapshot.net / weeklyGoal) * 100));
                        return (
                          <div className="mt-3 pt-3 border-t border-accent-foreground/20">
                            <div className="flex justify-between items-center mb-1">
                              <p className="brutal-mono text-xs text-accent-foreground opacity-75">Weekly Goal</p>
                              <p className="brutal-mono text-xs text-accent-foreground font-bold">{pct}%</p>
                            </div>
                            <div className="h-2 bg-accent-foreground/20 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-400' : 'bg-amber-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="brutal-mono text-xs text-accent-foreground opacity-60 mt-1">
                              ${weekSnapshot.net.toLocaleString('en-US', { maximumFractionDigits: 0 })} of ${weeklyGoal.toLocaleString('en-US', { maximumFractionDigits: 0 })} goal
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-3 pt-3 border-t border-accent-foreground/20">
                          <button
                            onClick={() => setCurrentView('settings')}
                            className="brutal-mono text-xs text-accent-foreground opacity-60 hover:opacity-100 transition-opacity underline"
                          >
                            Set a weekly goal →
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ) : userProfile && (
                  <div className="brutal-border-info bg-accent p-3 brutal-shadow">
                    <p className="brutal-mono text-xs text-accent-foreground opacity-75">This Week</p>
                    <p className="brutal-text text-sm text-accent-foreground mt-1">No loads recorded yet — tap Load Reports to add your first load.</p>
                  </div>
                )}

                {/* New user onboarding callout when 0 loads this week */}
                {weekSnapshot && weekSnapshot.loadCount === 0 && (
                  <div className="brutal-border bg-card p-4 brutal-shadow flex items-center justify-between gap-3">
                    <p className="brutal-mono text-sm text-foreground">Add your first load to get started</p>
                    <button
                      onClick={() => setShowAddLoadModal(true)}
                      className="brutal-border font-extrabold uppercase tracking-wide text-xs px-3 py-2 brutal-shadow brutal-hover flex-shrink-0"
                      style={{ background: '#f0a500', color: '#1a1a2e', border: '2px solid #1a1a2e', borderRadius: '4px' }}
                    >
                      + Add Load
                    </button>
                  </div>
                )}
              </div>

              {/* Scan Receipt with AI */}
              {isFeatureAllowed('receipts') && (
                <button
                  onClick={() => setShowScanDestPicker(true)}
                  className="w-full brutal-border bg-card p-4 brutal-shadow flex items-center gap-3 brutal-hover"
                  style={{ borderRadius: '4px' }}
                >
                  <Camera className="w-5 h-5 flex-shrink-0" style={{ color: '#1a1a2e' }} />
                  <div className="text-left">
                    <p className="brutal-text text-sm" style={{ color: '#1a1a2e' }}>SCAN RECEIPT WITH AI</p>
                    <p className="brutal-mono text-xs text-muted-foreground">Auto-fill expenses from a photo</p>
                  </div>
                </button>
              )}

              {/* Early Adopter Banner */}
              {subscription.earlyAdopter && !subscription.earlyAdopterBannerDismissed && subscription.endDate && (
                <div className="brutal-border bg-primary/10 p-4 brutal-shadow flex items-center justify-between gap-3">
                  <p className="brutal-mono text-sm text-foreground flex-1">
                    🎉 Early Adopter Bonus: Pro free until {new Date(subscription.endDate).toLocaleDateString()}. Thank you for using TruckPay!
                  </p>
                  <button
                    onClick={dismissEarlyAdopterBanner}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Main Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Button 
                  onClick={() => setCurrentView('loads')}
                  className="h-24 sm:h-32 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active p-4 sm:p-6 flex flex-col items-start justify-center"
                >
                  <FileText className="w-6 h-6 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
                  <div className="text-left">
                    <p className="brutal-text text-sm sm:text-xl mb-1">LOAD REPORTS</p>
                    <p className="brutal-mono text-xs sm:text-sm opacity-80 mobile-text-wrap">MANAGE LOADS</p>
                  </div>
                </Button>

                <Button 
                  onClick={() => setCurrentView('deductions')}
                  className="h-24 sm:h-32 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active p-4 sm:p-6 flex flex-col items-start justify-center"
                >
                  <Calculator className="w-6 h-6 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
                  <div className="text-left">
                    <p className="brutal-text text-sm sm:text-xl mb-1">DEDUCTIONS</p>
                    <p className="brutal-mono text-xs sm:text-sm opacity-80 mobile-text-wrap">TRUCK EXPENSES</p>
                  </div>
                </Button>

                <Button
                  onClick={() => navigateTo('forecast', 'forecast')}
                  className="h-24 sm:h-32 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active p-4 sm:p-6 flex flex-col items-start justify-center"
                >
                  <DollarSign className="w-6 h-6 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
                  <div className="text-left">
                    <p className="brutal-text text-sm sm:text-xl mb-1">SUMMARY</p>
                    <p className="brutal-mono text-xs sm:text-sm opacity-80 mobile-text-wrap">EARNINGS BREAKDOWN</p>
                  </div>
                </Button>

                <Button
                  onClick={() => setCurrentView('expenses')}
                  className="h-24 sm:h-32 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active p-4 sm:p-6 flex flex-col items-start justify-center"
                >
                  <Receipt className="w-6 h-6 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
                  <div className="text-left">
                    <p className="brutal-text text-sm sm:text-xl mb-1">PERSONAL EXPENSES</p>
                    <p className="brutal-mono text-xs sm:text-sm opacity-80 mobile-text-wrap">TRACK EXPENSES</p>
                  </div>
                </Button>

                <Button
                  onClick={() => navigateTo('perdiem', 'perdiem')}
                  className="h-24 sm:h-32 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active p-4 sm:p-6 flex flex-col items-start justify-center relative"
                >
                  {!isFeatureAllowed('perdiem') && (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <span className="brutal-mono text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: '#f0a500', color: '#1a1a2e', fontSize: '10px', lineHeight: 1 }}>PRO</span>
                      <Lock className="w-3 h-3 opacity-60" />
                    </div>
                  )}
                  <Calendar className="w-6 h-6 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
                  <div className="text-left">
                    <p className="brutal-text text-sm sm:text-xl mb-1">PER DIEM</p>
                    <p className="brutal-mono text-xs sm:text-sm opacity-80 mobile-text-wrap">IRS MEAL DEDUCTION</p>
                  </div>
                </Button>

                <Button
                  onClick={() => navigateTo('ifta', 'ifta')}
                  className="h-24 sm:h-32 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active p-4 sm:p-6 flex flex-col items-start justify-center relative"
                >
                  {!isFeatureAllowed('ifta') && (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <span className="brutal-mono text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: '#f0a500', color: '#1a1a2e', fontSize: '10px', lineHeight: 1 }}>PRO</span>
                      <Lock className="w-3 h-3 opacity-60" />
                    </div>
                  )}
                  <Map className="w-6 h-6 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
                  <div className="text-left">
                    <p className="brutal-text text-sm sm:text-xl mb-1">IFTA REPORT</p>
                    <p className="brutal-mono text-xs sm:text-sm opacity-80 mobile-text-wrap">FUEL TAX FILING</p>
                  </div>
                </Button>
              </div>

              {/* Footer */}
              <div className="brutal-border bg-muted p-3 sm:p-6 brutal-shadow text-center">
                <p className="brutal-mono text-xs sm:text-sm text-muted-foreground mobile-text-wrap">
                  TRUCKPAY V2.3
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  const TAB_VIEWS = ['dashboard', 'loads', 'deductions', 'forecast', 'expenses', 'perdiem', 'ifta', 'settings'];
  const showTabBar = TAB_VIEWS.includes(currentView);

  const moreItems = [
    { label: 'Personal Expenses', icon: Receipt, view: 'expenses', feature: null },
    { label: 'Per Diem', icon: Calendar, view: 'perdiem', feature: 'perdiem' as const },
    { label: 'IFTA Report', icon: Map, view: 'ifta', feature: 'ifta' as const },
    { label: 'Settings', icon: Settings, view: 'settings', feature: null },
  ];

  const moreActive = ['expenses', 'perdiem', 'ifta', 'settings'].includes(currentView);

  return (
    <div className="min-h-screen bg-background">
      {/* Page content — add bottom padding when tab bar is visible */}
      <div className={showTabBar ? 'md:pb-0 pb-20' : ''}>
        {renderCurrentView()}
      </div>

      {/* Bottom Tab Bar — mobile only */}
      {showTabBar && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t-2 border-foreground brutal-shadow-lg flex items-stretch h-16">
          {/* Loads */}
          <button
            onClick={() => { setShowMoreSheet(false); setCurrentView('loads'); }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              currentView === 'loads' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="brutal-mono text-xs">Loads</span>
          </button>

          {/* Expenses (Deductions) */}
          <button
            onClick={() => { setShowMoreSheet(false); setCurrentView('deductions'); }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              currentView === 'deductions' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span className="brutal-mono text-xs">Expenses</span>
          </button>

          {/* Add Load — Center */}
          <button
            onClick={() => setShowAddLoadModal(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="w-6 h-6" />
            <span className="brutal-mono text-xs">Add Load</span>
          </button>

          {/* Summary */}
          <button
            onClick={() => {
              setShowMoreSheet(false);
              if (!isFeatureAllowed('forecast')) {
                setUpgradeModal({ feature: 'Earnings Summary', tier: 'pro' });
                return;
              }
              setCurrentView('forecast');
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              currentView === 'forecast' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span className="brutal-mono text-xs">Summary</span>
          </button>

          {/* More */}
          <button
            onClick={() => setShowMoreSheet(v => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              moreActive || showMoreSheet ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="brutal-mono text-xs">More</span>
          </button>
        </nav>
      )}

      {/* More Sheet — mobile only */}
      {showMoreSheet && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/40"
            onClick={() => setShowMoreSheet(false)}
          />
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-card border-t-2 border-foreground brutal-shadow-lg p-4 space-y-2">
            {moreItems.map(({ label, icon: Icon, view, feature }) => (
              <button
                key={view}
                onClick={() => {
                  setShowMoreSheet(false);
                  if (feature && !isFeatureAllowed(feature)) {
                    setUpgradeModal({ feature: label, tier: 'pro' });
                    return;
                  }
                  setCurrentView(view);
                }}
                className={`w-full flex items-center gap-3 p-3 brutal-border brutal-shadow text-left transition-colors ${
                  currentView === view ? 'bg-accent text-accent-foreground' : 'bg-background hover:bg-muted text-foreground'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="brutal-text text-sm">{label}</span>
                {feature && !isFeatureAllowed(feature) && (
                  <Lock className="w-3.5 h-3.5 ml-auto opacity-50" />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {upgradeModal && (
        <UpgradeModal
          featureName={upgradeModal.feature}
          requiredTier={upgradeModal.tier}
          onClose={() => setUpgradeModal(null)}
          onSuccess={(tier, isTrial) => { setUpgradeModal(null); setSuccessModal({ tier, isTrial }); }}
        />
      )}

      {successModal && (
        <SubscriptionSuccessModal
          tier={successModal.tier}
          isTrial={successModal.isTrial}
          onClose={() => setSuccessModal(null)}
        />
      )}

      {/* Scan Receipt — destination picker */}
      {showScanDestPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="brutal-border bg-background brutal-shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="brutal-text text-xl">WHERE IS THIS RECEIPT FOR?</h2>
              <button onClick={() => setShowScanDestPicker(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <p className="brutal-mono text-xs text-muted-foreground">Choose where to save the scanned expense</p>
            <button
              className="w-full brutal-border p-4 text-left brutal-shadow brutal-hover flex flex-col gap-1"
              onClick={() => { setScanDestination('personal'); setShowScanDestPicker(false); setShowHomeReceiptScanner(true); }}
            >
              <span className="brutal-text text-base">Personal Expense</span>
              <span className="brutal-mono text-xs text-muted-foreground">Food, clothing, personal items, etc.</span>
            </button>
            <button
              className="w-full brutal-border p-4 text-left brutal-shadow brutal-hover flex flex-col gap-1"
              onClick={() => { setScanDestination('work'); setShowScanDestPicker(false); setShowHomeReceiptScanner(true); }}
            >
              <span className="brutal-text text-base">Truck / Work Expense</span>
              <span className="brutal-mono text-xs text-muted-foreground">Fuel, tolls, maintenance — added to Load Reports week</span>
            </button>
          </div>
        </div>
      )}

      {/* Scan Receipt — scanner (shown after destination chosen) */}
      {showHomeReceiptScanner && (
        <ReceiptScanner
          onClose={() => { setShowHomeReceiptScanner(false); setScanDestination(null); }}
          onConfirm={handleHomeReceiptConfirm}
        />
      )}

      {/* Add Load Modal */}
      <Dialog open={showAddLoadModal} onOpenChange={setShowAddLoadModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto brutal-border brutal-shadow-lg">
          <DialogHeader>
            <DialogTitle className="brutal-text text-2xl">New Load</DialogTitle>
          </DialogHeader>
          <AddLoadForm
            newLoad={newLoad}
            setNewLoad={setNewLoad}
            onAddLoad={handleAddLoadFromHome}
            onCancel={() => setShowAddLoadModal(false)}
            loading={loadingAddLoad}
            weekStart={userProfile ? getUserWeekStart(new Date(), userProfile) : new Date()}
            weekEnd={userProfile ? getUserWeekEnd(new Date(), userProfile) : new Date()}
            userProfile={userProfile}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;