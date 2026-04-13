import { useState } from 'react';
import { ArrowLeft, User, Phone, Mail, Users, Percent, Save, Download, Upload, Trash2, DollarSign, LogOut, Lock, Zap, Star, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar } from 'lucide-react';
import { useSubscription, BillingCycle, SubscriptionTier } from '@/hooks/useSubscription';

const SettingsPanel = ({ userProfile, setUserProfile, onBack, onLogout }) => {
  const [formData, setFormData] = useState({ ...userProfile });
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAccountToo, setDeleteAccountToo] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { subscription, upgradeTo, openCustomerPortal } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [upgradingTier, setUpgradingTier] = useState<SubscriptionTier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setUpgradingTier(tier);
    await upgradeTo(tier, billingCycle);
    setUpgradingTier(null);
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    await openCustomerPortal();
    setPortalLoading(false);
  };

  const PRICES = {
    pro:   { monthly: '$14.99', annual: '$9.99', annualTotal: '$119.88' },
    owner: { monthly: '$29.99', annual: '$19.99', annualTotal: '$239.88' },
  };

  const currentTier = subscription.tier;
  const isEarlyAdopter = subscription.earlyAdopter;
  const isTrial = subscription.trialUsed && currentTier === 'pro' && subscription.endDate && new Date(subscription.endDate) > new Date();
  const hasStripeSubscription = !!subscription.stripeSubscriptionId;

  const [annualGoal, setAnnualGoal] = useState(() => localStorage.getItem('truckpay_annual_goal') || '');
  const [weeklyGoalSetting, setWeeklyGoalSetting] = useState(() => localStorage.getItem('truckpay_weekly_goal') || '');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const storageUsedMB = (() => {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += (localStorage.getItem(key) || '').length * 2;
        }
      }
      return (total / 1024 / 1024).toFixed(2);
    } catch {
      return '0.00';
    }
  })();
  const storagePercent = Math.min(100, Math.round((parseFloat(storageUsedMB) / 5) * 100));

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Check if email has changed
      const emailChanged = formData.email !== userProfile.email;
      
      // Check if weekly period has changed
      const weeklyPeriodChanged = formData.weeklyPeriod !== userProfile.weeklyPeriod;
      
      // Update profile data in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.name,
          phone: formData.phone,
          driver_type: formData.driverType,
          company_deduction: parseFloat(formData.companyDeduction) || 0,
          weekly_period: formData.weeklyPeriod,
          weekly_period_updated_at: weeklyPeriodChanged ? new Date().toISOString() : undefined,
          lease_rate_per_mile: formData.leaseRatePerMile ? parseFloat(formData.leaseRatePerMile) : null,
          company_pay_type: formData.companyPayType || null,
          company_pay_rate: formData.companyPayRate ? parseFloat(formData.companyPayRate) : null,
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Handle email change if needed
      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (emailError) {
          throw emailError;
        }

        toast({
          title: "Email change initiated",
          description: "Please check your new email for a confirmation link to complete the email change.",
          duration: 5000,
        });
      }

      // Update local state
      setUserProfile(formData);
      setHasChanges(false);
      
      toast({
        title: "Settings saved",
        description: weeklyPeriodChanged 
          ? "Profile updated. New weekly period will apply to future weeks starting from next week."
          : emailChanged 
          ? "Profile updated. Please confirm your new email address."
          : "Your profile has been updated successfully.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving settings",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ ...userProfile });
    setHasChanges(false);
  };

  const handleExportData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Fetch all user data
      const [profileResponse, loadReportsResponse, deductionsResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('load_reports').select('*').eq('user_id', user.id),
        supabase.from('deductions').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        profile: profileResponse.data,
        loadReports: loadReportsResponse.data || [],
        deductions: deductionsResponse.data || [],
        exportDate: new Date().toISOString(),
        version: '1.2.0'
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truckpay-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported successfully",
        description: "Your data has been downloaded as a JSON file.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        setIsLoading(true);
        const text = await file.text();
        const importData = JSON.parse(text);

        // Validate data structure
        if (!importData.profile || !Array.isArray(importData.loadReports) || !Array.isArray(importData.deductions)) {
          throw new Error('Invalid data format');
        }

        // Import load reports
        if (importData.loadReports.length > 0) {
          const loadReportsToInsert = importData.loadReports.map(report => {
            const { id, ...reportWithoutId } = report; // Remove the original id
            return {
              ...reportWithoutId,
              user_id: user.id
            };
          });
          
          const { error: loadError } = await supabase
            .from('load_reports')
            .insert(loadReportsToInsert); // Use insert instead of upsert
          
          if (loadError) throw loadError;
        }

        // Import deductions
        if (importData.deductions.length > 0) {
          const deductionsToInsert = importData.deductions.map(deduction => {
            const { id, ...deductionWithoutId } = deduction; // Remove the original id
            return {
              ...deductionWithoutId,
              user_id: user.id
            };
          });
          
          const { error: deductionError } = await supabase
            .from('deductions')
            .insert(deductionsToInsert); // Use insert instead of upsert
          
          if (deductionError) throw deductionError;
        }

        toast({
          title: "Data imported successfully",
          description: `Imported ${importData.loadReports.length} load reports and ${importData.deductions.length} deductions.`,
          duration: 5000,
        });
      } catch (error) {
        console.error('Error importing data:', error);
        toast({
          title: "Import failed",
          description: error.message || "Failed to import data. Please check the file format.",
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    };
    input.click();
  };

  const handleClearData = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteChoice = (includeAccount) => {
    setDeleteAccountToo(includeAccount);
    setShowDeleteConfirm(false);
    setShowFinalConfirm(true);
  };

  const handleFinalDelete = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Delete load reports and deductions
      await Promise.all([
        supabase.from('load_reports').delete().eq('user_id', user.id),
        supabase.from('deductions').delete().eq('user_id', user.id)
      ]);

      if (deleteAccountToo) {
        // Delete profile first
        await supabase.from('profiles').delete().eq('id', user.id);
        
        // Delete the actual user account via RPC (requires a delete_user function in Supabase)
        const { error: userDeleteError } = await supabase.rpc('delete_user');

        if (userDeleteError) {
          throw new Error('Failed to delete account. Please contact support at dev@saaz.site.');
        }
        
        // Sign out after successful deletion
        await supabase.auth.signOut();
        
        toast({
          title: "Account deleted",
          description: "Your account and all data have been permanently deleted.",
          duration: 5000,
        });
      } else {
        toast({
          title: "Data cleared",
          description: "All your load reports and deductions have been deleted.",
          duration: 5000,
        });
      }
      
      setShowFinalConfirm(false);
    } catch (error) {
      console.error('Error deleting data:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete data. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Your password has been changed successfully.", duration: 3000 });
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  return (
    <div className="min-h-screen bg-background brutal-grid p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="brutal-border brutal-shadow h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl brutal-text font-bold truncate">
              SETTINGS
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              Manage your profile and preferences
            </p>
          </div>
        </div>

        {/* Profile Settings Card */}
        <div className="brutal-border brutal-shadow-lg p-6 bg-background mb-8">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-xl brutal-text font-bold">
              PROFILE INFORMATION
            </h2>
          </div>
          
          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-sm brutal-text font-medium">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="h-12 brutal-border text-sm"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm brutal-text font-medium">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="h-12 brutal-border text-sm"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm brutal-text font-medium">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="h-12 brutal-border text-sm"
              />
              {formData.email !== userProfile.email && (
                <p className="text-xs text-warning">
                  ⚠️ Changing your email will require confirmation via the new email address.
                </p>
              )}
            </div>

            {/* Driver Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm brutal-text font-medium">
                <Users className="h-4 w-4" />
                Driver Type
              </Label>
              <Select
                value={formData.driverType || ''}
                onValueChange={(value) => handleInputChange('driverType', value)}
              >
                <SelectTrigger className="h-12 brutal-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="brutal-border">
                  <SelectItem value="owner-operator">Owner-Operator (own truck)</SelectItem>
                  <SelectItem value="lease-operator">Lease-Operator (leasing company truck)</SelectItem>
                  <SelectItem value="company-driver">Company Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Owner-Operator: company deduction % */}
            {formData.driverType === 'owner-operator' && (
              <div className="space-y-2">
                <Label htmlFor="companyDeduction" className="flex items-center gap-2 text-sm brutal-text font-medium">
                  <Percent className="h-4 w-4" />
                  Company Deduction Rate (%)
                </Label>
                <Input
                  id="companyDeduction"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.companyDeduction || ''}
                  onChange={(e) => handleInputChange('companyDeduction', e.target.value)}
                  className="h-12 brutal-border text-sm"
                />
                <p className="text-xs text-muted-foreground">Percentage the company takes from each load.</p>
              </div>
            )}

            {/* Lease-Operator: company deduction % + rate per mile */}
            {formData.driverType === 'lease-operator' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyDeductionLease" className="flex items-center gap-2 text-sm brutal-text font-medium">
                    <Percent className="h-4 w-4" />
                    Company Deduction Rate (%)
                  </Label>
                  <Input
                    id="companyDeductionLease"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.companyDeduction || ''}
                    onChange={(e) => handleInputChange('companyDeduction', e.target.value)}
                    className="h-12 brutal-border text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Percentage the company takes from each load.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseRatePerMile" className="flex items-center gap-2 text-sm brutal-text font-medium">
                    <DollarSign className="h-4 w-4" />
                    Lease Rate Per Mile
                  </Label>
                  <Input
                    id="leaseRatePerMile"
                    type="number"
                    placeholder="e.g. 0.13"
                    min="0"
                    step="0.01"
                    value={formData.leaseRatePerMile || ''}
                    onChange={(e) => handleInputChange('leaseRatePerMile', e.target.value)}
                    className="h-12 brutal-border text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Dollar amount you pay per mile driven (loaded or empty).</p>
                </div>
              </>
            )}

            {/* Company Driver: pay type + rate */}
            {formData.driverType === 'company-driver' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm brutal-text font-medium">
                    <DollarSign className="h-4 w-4" />
                    How are you paid?
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleInputChange('companyPayType', 'per_mile')}
                      className={`h-12 brutal-border text-sm font-semibold transition-colors ${
                        formData.companyPayType === 'per_mile'
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      $ per Mile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('companyPayType', 'percentage')}
                      className={`h-12 brutal-border text-sm font-semibold transition-colors ${
                        formData.companyPayType === 'percentage'
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      % of Gross
                    </button>
                  </div>
                </div>

                {formData.companyPayType === 'per_mile' && (
                  <div className="space-y-2">
                    <Label htmlFor="companyPayRate" className="flex items-center gap-2 text-sm brutal-text font-medium">
                      <DollarSign className="h-4 w-4" />
                      Rate Per Mile
                    </Label>
                    <Input
                      id="companyPayRate"
                      type="number"
                      placeholder="e.g. 0.55"
                      min="0"
                      step="0.01"
                      value={formData.companyPayRate || ''}
                      onChange={(e) => handleInputChange('companyPayRate', e.target.value)}
                      className="h-12 brutal-border text-sm"
                    />
                  </div>
                )}

                {formData.companyPayType === 'percentage' && (
                  <div className="space-y-2">
                    <Label htmlFor="companyPayRate" className="flex items-center gap-2 text-sm brutal-text font-medium">
                      <Percent className="h-4 w-4" />
                      Your Share of Gross (%)
                    </Label>
                    <Input
                      id="companyPayRate"
                      type="number"
                      placeholder="e.g. 30"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.companyPayRate || ''}
                      onChange={(e) => handleInputChange('companyPayRate', e.target.value)}
                      className="h-12 brutal-border text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Add Weekly Period Setting after Company Deduction Rate */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Weekly Period
              </Label>
              <Select 
                value={formData.weeklyPeriod || 'sunday'} 
                onValueChange={(value) => handleInputChange('weeklyPeriod', value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select your weekly period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday to Saturday</SelectItem>
                  <SelectItem value="monday">Monday to Sunday</SelectItem>
                  <SelectItem value="tuesday">Tuesday to Monday</SelectItem>
                  <SelectItem value="wednesday">Wednesday to Tuesday</SelectItem>
                  <SelectItem value="thursday">Thursday to Wednesday</SelectItem>
                  <SelectItem value="friday">Friday to Thursday</SelectItem>
                  <SelectItem value="saturday">Saturday to Friday</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Changes to weekly period will be effective from today and won't affect historical data.
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Plan */}
        <div className="brutal-border brutal-shadow-lg p-6 bg-background mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-xl brutal-text font-bold">SUBSCRIPTION PLAN</h2>
          </div>

          {/* Current plan badge */}
          <div className="mb-5">
            {currentTier === 'free' && !isEarlyAdopter && (
              <p className="brutal-mono text-sm text-muted-foreground">
                You are on the <span className="font-bold text-foreground">Free</span> plan.
              </p>
            )}
            {currentTier === 'pro' && isEarlyAdopter && (
              <p className="brutal-mono text-sm text-green-700 font-bold">
                Early Adopter — Pro free until{' '}
                {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
              </p>
            )}
            {currentTier === 'pro' && !isEarlyAdopter && isTrial && (
              <p className="brutal-mono text-sm text-amber-700 font-bold">
                Pro Trial — expires{' '}
                {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
              </p>
            )}
            {currentTier === 'pro' && !isEarlyAdopter && !isTrial && hasStripeSubscription && (
              <p className="brutal-mono text-sm text-green-700 font-bold">Active Pro subscription</p>
            )}
            {currentTier === 'owner' && hasStripeSubscription && (
              <p className="brutal-mono text-sm text-green-700 font-bold">Active Owner-Operator subscription</p>
            )}
          </div>

          {/* Billing toggle */}
          <div className="flex items-center gap-3 mb-5">
            <div className="brutal-border inline-flex rounded overflow-hidden">
              <button
                className={`px-4 py-2 brutal-mono text-xs font-bold transition-colors ${billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'}`}
                onClick={() => setBillingCycle('monthly')}
              >
                MONTHLY
              </button>
              <button
                className={`px-4 py-2 brutal-mono text-xs font-bold transition-colors ${billingCycle === 'annual' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'}`}
                onClick={() => setBillingCycle('annual')}
              >
                ANNUAL
              </button>
            </div>
            {billingCycle === 'annual' && (
              <span className="brutal-mono text-xs text-green-600 font-bold">SAVE ~33%</span>
            )}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Free */}
            <div className={`brutal-border p-4 ${currentTier === 'free' ? 'border-accent bg-accent/5' : 'bg-muted/20'}`}>
              <p className="brutal-text text-base font-bold mb-1">FREE</p>
              <p className="brutal-text text-2xl font-bold mb-3">$0<span className="brutal-mono text-sm font-normal">/mo</span></p>
              <ul className="brutal-mono text-xs space-y-1 text-muted-foreground mb-4">
                <li>✓ Current week only</li>
                <li>✓ Up to 5 loads/week</li>
                <li>✗ History &amp; reports</li>
                <li>✗ IFTA &amp; Per Diem</li>
                <li>✗ Export</li>
              </ul>
              {currentTier === 'free' ? (
                <div className="w-full h-10 brutal-border bg-muted/30 flex items-center justify-center">
                  <span className="brutal-mono text-xs font-bold text-muted-foreground">CURRENT PLAN</span>
                </div>
              ) : (
                <div className="w-full h-10 brutal-border bg-muted/30 flex items-center justify-center">
                  <span className="brutal-mono text-xs text-muted-foreground">Included</span>
                </div>
              )}
            </div>

            {/* Pro */}
            <div className={`brutal-border p-4 ${currentTier === 'pro' ? 'border-accent bg-accent/10' : 'bg-background'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-accent" />
                <p className="brutal-text text-base font-bold">PRO</p>
              </div>
              <p className="brutal-text text-2xl font-bold mb-0">
                {billingCycle === 'annual' ? PRICES.pro.annual : PRICES.pro.monthly}
                <span className="brutal-mono text-sm font-normal">/mo</span>
              </p>
              {billingCycle === 'annual' && (
                <p className="brutal-mono text-xs text-muted-foreground mb-2">Billed {PRICES.pro.annualTotal}/yr</p>
              )}
              <ul className="brutal-mono text-xs space-y-1 text-muted-foreground mb-4 mt-2">
                <li>✓ Full load history</li>
                <li>✓ IFTA reports</li>
                <li>✓ Per Diem tracker</li>
                <li>✓ CSV/PDF export</li>
                <li>✓ AI receipt scanner</li>
              </ul>
              {currentTier === 'pro' ? (
                hasStripeSubscription ? (
                  <Button
                    className="w-full brutal-border bg-muted/30 hover:bg-muted/50 text-foreground brutal-text text-xs h-10"
                    disabled={portalLoading || upgradingTier !== null}
                    onClick={handleManageSubscription}
                  >
                    {portalLoading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Loading...</> : 'MANAGE PLAN'}
                  </Button>
                ) : (
                  <div className="w-full h-10 brutal-border bg-accent/20 flex items-center justify-center">
                    <span className="brutal-mono text-xs font-bold text-accent">CURRENT PLAN</span>
                  </div>
                )
              ) : currentTier === 'owner' ? (
                <div className="w-full h-10 brutal-border bg-muted/20 flex items-center justify-center">
                  <span className="brutal-mono text-xs text-muted-foreground">Included in Owner-Op</span>
                </div>
              ) : (
                <Button
                  className="w-full brutal-border bg-accent hover:bg-accent/90 text-accent-foreground brutal-text text-xs h-10"
                  disabled={upgradingTier !== null || portalLoading}
                  onClick={() => handleUpgrade('pro')}
                >
                  {upgradingTier === 'pro' ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />REDIRECTING...</> : 'UPGRADE TO PRO'}
                </Button>
              )}
            </div>

            {/* Owner-Op */}
            <div className={`brutal-border p-4 ${currentTier === 'owner' ? 'border-accent bg-accent/10' : 'bg-background'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <p className="brutal-text text-base font-bold">OWNER-OP</p>
              </div>
              <p className="brutal-text text-2xl font-bold mb-0">
                {billingCycle === 'annual' ? PRICES.owner.annual : PRICES.owner.monthly}
                <span className="brutal-mono text-sm font-normal">/mo</span>
              </p>
              {billingCycle === 'annual' && (
                <p className="brutal-mono text-xs text-muted-foreground mb-2">Billed {PRICES.owner.annualTotal}/yr</p>
              )}
              <ul className="brutal-mono text-xs space-y-1 text-muted-foreground mb-4 mt-2">
                <li>✓ Everything in Pro</li>
                <li>✓ Dispatcher book</li>
                <li>✓ Lane analytics</li>
                <li>✓ Annual goal tracking</li>
                <li>✓ Priority support</li>
              </ul>
              {currentTier === 'owner' ? (
                hasStripeSubscription ? (
                  <Button
                    className="w-full brutal-border bg-muted/30 hover:bg-muted/50 text-foreground brutal-text text-xs h-10"
                    disabled={portalLoading || upgradingTier !== null}
                    onClick={handleManageSubscription}
                  >
                    {portalLoading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Loading...</> : 'MANAGE PLAN'}
                  </Button>
                ) : (
                  <div className="w-full h-10 brutal-border bg-accent/20 flex items-center justify-center">
                    <span className="brutal-mono text-xs font-bold text-accent">CURRENT PLAN</span>
                  </div>
                )
              ) : (
                <Button
                  className="w-full brutal-border bg-primary hover:bg-primary/90 text-primary-foreground brutal-text text-xs h-10"
                  disabled={upgradingTier !== null || portalLoading}
                  onClick={() => handleUpgrade('owner')}
                >
                  {upgradingTier === 'owner' ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />REDIRECTING...</> : 'UPGRADE TO OWNER-OP'}
                </Button>
              )}
            </div>
          </div>

          <p className="brutal-mono text-xs text-center text-muted-foreground mt-4">
            Payments processed securely by Stripe. Cancel any time.
          </p>
        </div>

        {/* Income Goals */}
        <div className="brutal-border brutal-shadow-lg p-6 bg-success/5 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl brutal-text font-bold">INCOME GOALS</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="brutal-mono text-sm mb-2 block">ANNUAL INCOME GOAL ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 120000"
                value={annualGoal}
                onChange={e => {
                  setAnnualGoal(e.target.value);
                  localStorage.setItem('truckpay_annual_goal', e.target.value);
                  // Auto-calculate weekly
                  const weekly = e.target.value ? String(Math.round(parseFloat(e.target.value) / 52)) : '';
                  setWeeklyGoalSetting(weekly);
                  localStorage.setItem('truckpay_weekly_goal', weekly);
                }}
                className="brutal-border h-11"
              />
            </div>
            <div>
              <Label className="brutal-mono text-sm mb-2 block">WEEKLY INCOME GOAL ($)</Label>
              <Input
                type="number"
                placeholder="Auto-calculated from annual"
                value={weeklyGoalSetting}
                onChange={e => {
                  setWeeklyGoalSetting(e.target.value);
                  localStorage.setItem('truckpay_weekly_goal', e.target.value);
                }}
                className="brutal-border h-11"
              />
              {annualGoal && (
                <p className="brutal-mono text-xs text-muted-foreground mt-1">
                  Auto-calculated: ${Math.round(parseFloat(annualGoal) / 52).toLocaleString()}/week
                </p>
              )}
            </div>
          </div>
        </div>


        {/* Storage Usage */}
        <div className="brutal-border brutal-shadow-lg p-6 bg-muted/20 mb-8">
          <h2 className="text-xl brutal-text font-bold mb-4">DATA MANAGEMENT</h2>
          <div className="space-y-2">
            <div className="flex justify-between brutal-mono text-sm">
              <span>STORAGE USED</span>
              <span>{storageUsedMB} MB / ~5 MB</span>
            </div>
            <div className="h-3 brutal-border bg-muted">
              <div
                className={`h-full transition-all ${storagePercent >= 80 ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            {storagePercent >= 80 && (
              <p className="brutal-mono text-xs text-destructive font-bold">
                ⚠ Storage almost full — export your data or clear old receipts
              </p>
            )}
          </div>
        </div>

        {/* Save/Reset Buttons */}
        {hasChanges && (
          <div className="flex gap-4 mb-8">
            <Button 
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 h-12 brutal-border brutal-shadow bg-success hover:bg-success/90 text-base font-bold"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="flex-1 h-12 brutal-border brutal-shadow text-base font-bold"
            >
              Reset
            </Button>
          </div>
        )}

        {/* App Information Card */}
        <div className="brutal-border brutal-shadow-lg p-6 bg-muted/50 mb-8">
          <h2 className="text-xl brutal-text font-bold mb-6">
            APP INFORMATION
          </h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex justify-between items-center">
              <span className="font-medium">Version:</span>
              <span>2.2.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Last Updated:</span>
              <span>April 2026</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Support:</span>
              <a 
                href="mailto:dev@saaz.site" 
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                dev@saaz.site
              </a>
            </div>
          </div>
        </div>

        {/* Data Management Card */}
        <div className="brutal-border brutal-shadow-lg p-6 bg-background mb-8">
          <h2 className="text-xl brutal-text font-bold text-destructive mb-4">
            DATA MANAGEMENT
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Manage your app data and account settings. These actions cannot be undone.
          </p>
          <div className="space-y-4">
            <Button 
              onClick={handleExportData}
              disabled={isLoading}
              className="w-full h-12 brutal-border brutal-shadow text-success border-success hover:bg-success/10 text-sm font-bold"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export My Data
            </Button>
            <Button 
              onClick={handleImportData}
              disabled={isLoading}
              className="w-full h-12 brutal-border brutal-shadow text-info border-info hover:bg-info/10 text-sm font-bold"
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
            <Button
              onClick={handleClearData}
              disabled={isLoading}
              className="w-full h-12 brutal-border brutal-shadow text-destructive border-destructive hover:bg-destructive/10 text-sm font-bold"
              variant="outline"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </div>

        {/* Change Password */}
        <div className="brutal-border brutal-shadow-lg p-6 bg-background mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-xl brutal-text font-bold">CHANGE PASSWORD</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm brutal-text font-medium">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="brutal-border h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm brutal-text font-medium">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="brutal-border h-11"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword || !confirmPassword}
              className="w-full h-12 brutal-border brutal-shadow bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold"
            >
              <Lock className="h-4 w-4 mr-2" />
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </div>

        {/* Logout */}
        <div className="brutal-border brutal-shadow-lg p-6 bg-background mb-8">
          <Button
            onClick={onLogout}
            className="w-full h-12 brutal-border brutal-shadow bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-bold"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background brutal-border brutal-shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Delete Account?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Do you want to delete your account as well, or just clear your data?
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={() => handleDeleteChoice(false)}
                className="flex-1 brutal-border brutal-shadow"
                variant="outline"
              >
                Keep Account
              </Button>
              <Button 
                onClick={() => handleDeleteChoice(true)}
                className="flex-1 brutal-border brutal-shadow bg-destructive hover:bg-destructive/90"
              >
                Delete Account
              </Button>
            </div>
            <Button 
              onClick={() => setShowDeleteConfirm(false)}
              className="w-full mt-4 brutal-border brutal-shadow"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Final Confirmation Dialog */}
      {showFinalConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background brutal-border brutal-shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-destructive">Final Confirmation</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {deleteAccountToo 
                ? "This will permanently delete your account and all data. This action cannot be undone."
                : "This will permanently delete all your load reports and deductions. This action cannot be undone."
              }
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={() => setShowFinalConfirm(false)}
                className="flex-1 brutal-border brutal-shadow"
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleFinalDelete}
                disabled={isLoading}
                className="flex-1 brutal-border brutal-shadow bg-destructive hover:bg-destructive/90"
              >
                {isLoading ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;