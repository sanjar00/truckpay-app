import { useState } from 'react';
import { ArrowLeft, User, Phone, Mail, Users, Percent, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const SettingsPanel = ({ userProfile, setUserProfile, onBack }) => {
  const [formData, setFormData] = useState({ ...userProfile });
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setUserProfile(formData);
    setHasChanges(false);
    toast({
      title: "Settings saved",
      description: "Your profile has been updated successfully.",
      duration: 3000,
    });
  };

  const handleReset = () => {
    setFormData({ ...userProfile });
    setHasChanges(false);
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
                value={formData.name}
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
                value={formData.phone}
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
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="h-12 brutal-border text-sm"
              />
            </div>

            {/* Driver Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm brutal-text font-medium">
                <Users className="h-4 w-4" />
                Driver Type
              </Label>
              <Select 
                value={formData.driverType} 
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
                value={formData.companyDeduction}
                onChange={(e) => handleInputChange('companyDeduction', e.target.value)}
                className="h-12 brutal-border text-sm"
              />
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
              className="flex-1 h-12 brutal-border brutal-shadow bg-success hover:bg-success/90 text-base font-bold"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              variant="outline"
              onClick={handleReset}
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
              <span className="text-xs">dev@saaz.site</span>
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
              variant="outline" 
              className="w-full h-12 brutal-border brutal-shadow text-warning border-warning hover:bg-warning/10 text-sm font-bold"
            >
              Export My Data
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 brutal-border brutal-shadow text-destructive border-destructive hover:bg-destructive/10 text-sm font-bold"
            >
              Clear All Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;