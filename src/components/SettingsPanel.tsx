import { useState } from 'react';
import { ArrowLeft, User, Phone, Mail, Users, Percent, Save, Download, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar } from 'lucide-react';

const SettingsPanel = ({ userProfile, setUserProfile, onBack }) => {
  const [formData, setFormData] = useState({ ...userProfile });
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAccountToo, setDeleteAccountToo] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();

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
          company_deduction: parseFloat(formData.companyDeduction),
          weekly_period: formData.weeklyPeriod,
          weekly_period_updated_at: weeklyPeriodChanged ? new Date().toISOString() : undefined
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
        supabase.from('profiles').select('*').eq('id', user.id).single(),
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
        
        // Delete the actual user account from Supabase Auth
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          // If admin delete fails, try user delete (requires RLS policies)
          const { error: userDeleteError } = await supabase.rpc('delete_user');
          
          if (userDeleteError) {
            throw new Error('Failed to delete account. Please contact support.');
          }
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
                  <SelectItem value="Solo">Solo Driver</SelectItem>
                  <SelectItem value="Team">Team Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Deduction Rate */}
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
            </div>

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

        {/* Team Settings Card */}
        {formData.driverType === 'Team' && (
          <div className="brutal-border brutal-shadow-lg p-6 bg-info/5 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-5 w-5 text-info" />
              <h2 className="text-xl brutal-text font-bold text-info">
                TEAM SETTINGS
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="brutal-border brutal-shadow p-4 bg-info/10">
                <p className="text-info brutal-text font-medium mb-2 text-sm">
                  🚧 Coming Soon: Team Connection
                </p>
                <p className="text-info text-xs">
                  Connect with your driving partner to share load reports and track combined earnings.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="teammateId" className="text-sm text-info">
                  Teammate Username/ID (Future Feature)
                </Label>
                <Input
                  id="teammateId"
                  type="text"
                  placeholder="teammate_username"
                  disabled
                  className="h-12 brutal-border text-sm bg-info/5"
                />
              </div>
            </div>
          </div>
        )}

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
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Last Updated:</span>
              <span>June 2025</span>
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