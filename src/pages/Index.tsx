
import { useState, useEffect } from 'react';
import { Truck, Calculator, Settings, DollarSign, FileText, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LoginPage from '@/components/LoginPage';
import Registration from '@/components/Registration';
import LoadReports from '@/components/LoadReports';
import Deductions from '@/components/Deductions';
import ForecastSummary from '@/components/ForecastSummary';
import SettingsPanel from '@/components/SettingsPanel';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showRegistration, setShowRegistration] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loads, setLoads] = useState([]);
  const [deductions, setDeductions] = useState([]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
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

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (data) {
      setUserProfile({
        name: data.full_name,
        phone: data.phone,
        email: user.email,
        driverType: data.driver_type,
        companyDeduction: data.company_deduction
      });
    }
  };

  const handleRegistrationComplete = () => {
    setShowRegistration(false);
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
          />
        );
      case 'deductions':
        return (
          <Deductions 
            deductions={deductions}
            setDeductions={setDeductions}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'forecast':
        return (
          <ForecastSummary 
            onBack={() => setCurrentView('dashboard')}
            deductions={deductions}
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
          <div className="min-h-screen bg-background brutal-grid p-3 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8">
              {/* Header */}
              <div className="brutal-border bg-card p-4 sm:p-8 brutal-shadow-xl">
                <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-4">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="brutal-border-accent bg-accent p-2 sm:p-4 brutal-shadow">
                      <Truck className="w-8 h-8 sm:w-12 sm:h-12 text-accent-foreground" />
                    </div>
                    <div>
                      <h1 className="brutal-text text-2xl sm:text-4xl text-foreground">TRUCKPAY</h1>
                      <h2 className="brutal-text text-lg sm:text-2xl text-accent">DRIVE SMART. EARN MORE.</h2>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLogout}
                    className="brutal-border-destructive bg-destructive hover:bg-destructive text-destructive-foreground brutal-shadow brutal-hover brutal-active brutal-text text-xs sm:text-sm"
                  >
                    <LogOut className="w-4 h-4 sm:w-6 sm:h-6 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">LOGOUT</span>
                    <span className="sm:hidden">OUT</span>
                  </Button>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <p className="brutal-text text-base sm:text-xl text-foreground mobile-truncate">
                    WELCOME, {(userProfile?.name || 'DRIVER').toUpperCase()}!
                  </p>
                  {userProfile && (
                    <div className="brutal-border-info bg-accent p-3 sm:p-6 brutal-shadow">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="brutal-mono text-xs sm:text-sm text-accent-foreground">TYPE:</p>
                          <p className="brutal-text text-sm sm:text-lg text-accent-foreground mobile-truncate">{userProfile.driverType?.toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="brutal-mono text-xs sm:text-sm text-accent-foreground">COMPANY DEDUCTION:</p>
                          <p className="brutal-text text-sm sm:text-lg text-accent-foreground">{userProfile.companyDeduction}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
                    <p className="brutal-mono text-xs sm:text-sm opacity-80 mobile-text-wrap">TRACK EXPENSES</p>
                  </div>
                </Button>

                <Button 
                  onClick={() => setCurrentView('forecast')}
                  className="h-24 sm:h-32 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active p-4 sm:p-6 flex flex-col items-start justify-center"
                >
                  <DollarSign className="w-6 h-6 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
                  <div className="text-left">
                    <p className="brutal-text text-sm sm:text-xl mb-1">SUMMARY</p>
                    <p className="brutal-mono text-xs sm:text-sm opacity-80 mobile-text-wrap">EARNINGS BREAKDOWN</p>
                  </div>
                </Button>

                <Button 
                  onClick={() => setCurrentView('settings')}
                  className="h-24 sm:h-32 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active p-4 sm:p-6 flex flex-col items-start justify-center"
                >
                  <Settings className="w-6 h-6 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
                  <div className="text-left">
                    <p className="brutal-text text-sm sm:text-xl mb-1">SETTINGS</p>
                    <p className="brutal-mono text-xs sm:text-sm opacity-80 mobile-text-wrap">CONFIGURE</p>
                  </div>
                </Button>
              </div>

              {/* Footer */}
              <div className="brutal-border bg-muted p-3 sm:p-6 brutal-shadow text-center">
                <p className="brutal-mono text-xs sm:text-sm text-muted-foreground mobile-text-wrap">
                  TRUCKPAY V1.0
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
    </div>
  );
};

export default Index;