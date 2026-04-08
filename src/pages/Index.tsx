
import { useState, useEffect, useRef } from 'react';
import { Truck, Calculator, Settings, DollarSign, FileText, LogOut, Receipt, Calendar, Map, Lock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getUserWeekStart, getUserWeekEnd } from '@/lib/weeklyPeriodUtils';
import { calculateFixedDeductionsForWeek } from '@/lib/loadReportsUtils';
import LoginPage from '@/components/LoginPage';
import Registration from '@/components/Registration';
import LoadReports from '@/components/LoadReports';
import Deductions from '@/components/Deductions';
import ForecastSummary from '@/components/ForecastSummary';
import SettingsPanel from '@/components/SettingsPanel';
import PersonalExpenses from '@/components/PersonalExpenses';
import PerDiemCalculator from '@/components/PerDiemCalculator';
import IFTAReport from '@/components/IFTAReport';
import UpgradeModal from '@/components/UpgradeModal';

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

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { isFeatureAllowed, subscription, upgradeTo } = useSubscription();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showRegistration, setShowRegistration] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ feature: string; tier: 'pro' | 'owner' } | null>(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loads, setLoads] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [earlyAdopterBannerDismissed, setEarlyAdopterBannerDismissed] = useState(
    () => localStorage.getItem('truckpay_ea_banner_dismissed') === 'true'
  );
  const [weekSnapshot, setWeekSnapshot] = useState<{ loadCount: number; gross: number; expenses: number; net: number; weekStart: Date; weekEnd: Date } | null>(null);

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
        .select('rate, company_deduction, driver_pay')
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

      const gross = (loadsData || []).reduce((sum, l) => sum + (l.rate || 0), 0);
      const driverPay = (loadsData || []).reduce((sum, l) => sum + (l.driver_pay || 0), 0);
      const fixedTotal = calculateFixedDeductionsForWeek(fixedDeductions, weekStart);
      const expenses =
        (weeklyDeductionsData || []).reduce((sum, d) => sum + (d.amount || 0), 0) +
        (extraDeductionsData || []).reduce((sum, d) => sum + (d.amount || 0), 0) +
        fixedTotal;

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
        weeklyPeriodUpdatedAt: data.weekly_period_updated_at
      });
    }

    // Early adopter check: if user has existing loads and is still on free tier
    if (!subscription.earlyAdopter && subscription.tier === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const { data: existingLoads } = await supabase
        .from('load_reports')
        .select('id')
        .eq('user_id', user.id)
        .lt('date_added', today)
        .limit(1);
      if (existingLoads && existingLoads.length > 0) {
        localStorage.setItem('truckpay_early_adopter', 'true');
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 90);
        upgradeTo('pro');
        // Mark early adopter in subscription (upgradeTo sets endDate to 1 month — override)
        const sub = JSON.parse(localStorage.getItem('truckpay_subscription') || '{}');
        sub.earlyAdopter = true;
        sub.endDate = endDate.toISOString();
        localStorage.setItem('truckpay_subscription', JSON.stringify(sub));
      }
    }
  };

  const handleRegistrationComplete = () => {
    setShowRegistration(false);
  };

  const navigateTo = (view: string, feature: 'perdiem' | 'ifta' | 'forecast' | null = null) => {
    if (feature && !isFeatureAllowed(feature)) {
      setUpgradeModal({ feature, tier: 'pro' });
      return;
    }
    setCurrentView(view);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentView('dashboard');
    setUserProfile(null);
    setLoads([]);
    setDeductions([]);
  };

  if (loading) {
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="brutal-border-destructive bg-destructive hover:bg-destructive text-destructive-foreground brutal-shadow brutal-hover brutal-active brutal-text text-xs sm:text-sm"
                    >
                      <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                      <span className="hidden sm:inline">LOGOUT</span>
                      <span className="sm:hidden">OUT</span>
                    </Button>
                  </div>
                </div>

                <p className="brutal-text text-sm text-foreground mb-3">
                  WELCOME, {(userProfile?.name || 'DRIVER').toUpperCase()}!
                </p>

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
                  </div>
                ) : userProfile && (
                  <div className="brutal-border-info bg-accent p-3 brutal-shadow">
                    <p className="brutal-mono text-xs text-accent-foreground opacity-75">This Week</p>
                    <p className="brutal-text text-sm text-accent-foreground mt-1">No loads recorded yet — tap Load Reports to add your first load.</p>
                  </div>
                )}
              </div>

              {/* Early Adopter Banner */}
              {subscription.earlyAdopter && !earlyAdopterBannerDismissed && subscription.endDate && (
                <div className="brutal-border bg-primary/10 p-4 brutal-shadow flex items-center justify-between gap-3">
                  <p className="brutal-mono text-sm text-foreground flex-1">
                    🎉 Early Adopter Bonus: Pro free until {new Date(subscription.endDate).toLocaleDateString()}. Thank you for using TruckPay!
                  </p>
                  <button
                    onClick={() => {
                      setEarlyAdopterBannerDismissed(true);
                      localStorage.setItem('truckpay_ea_banner_dismissed', 'true');
                    }}
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
                    <Lock className="w-4 h-4 absolute top-2 right-2 opacity-60" />
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
                    <Lock className="w-4 h-4 absolute top-2 right-2 opacity-60" />
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
                  TRUCKPAY V2.1
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderCurrentView()}
      {upgradeModal && (
        <UpgradeModal
          featureName={upgradeModal.feature}
          requiredTier={upgradeModal.tier}
          onClose={() => setUpgradeModal(null)}
        />
      )}
    </div>
  );
};

export default Index;