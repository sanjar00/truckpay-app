
import { useState } from 'react';
import { User, Phone, Mail, Percent, Users, ArrowLeft, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface RegistrationProps {
  onComplete: () => void;
  onBackToLogin: () => void;
  prefillData?: { fullName?: string; email?: string };
  isSocialAuth?: boolean;
}

const Registration = ({ onComplete, onBackToLogin, prefillData, isSocialAuth = false }: RegistrationProps) => {
  const [formData, setFormData] = useState({
    fullName: prefillData?.fullName || '',
    phone: '',
    email: prefillData?.email || '',
    password: '',
    driverType: '',
    companyDeduction: '',
    weeklyPeriod: 'sunday',
    leaseRatePerMile: '',
    companyPayType: '',
    companyPayRate: '',
  });
  const [loading, setLoading] = useState(false);
  const { signUp, completeSocialProfile } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required base fields
    const passwordRequired = !isSocialAuth;
    if (!formData.fullName || !formData.email || (passwordRequired && !formData.password) || !formData.driverType || !formData.weeklyPeriod) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (formData.driverType === 'lease-operator' && (!formData.companyDeduction || !formData.leaseRatePerMile)) {
      toast({ title: "Missing fields", description: "Please enter your company deduction rate and lease rate per mile.", variant: "destructive" });
      return;
    }
    if (formData.driverType === 'company-driver' && (!formData.companyPayType || !formData.companyPayRate)) {
      toast({ title: "Missing fields", description: "Please select how you're paid and enter the rate.", variant: "destructive" });
      return;
    }
    if (formData.driverType === 'owner-operator' && !formData.companyDeduction) {
      toast({ title: "Missing fields", description: "Please enter your company deduction rate.", variant: "destructive" });
      return;
    }

    setLoading(true);

    if (isSocialAuth) {
      const { error } = await completeSocialProfile({
        full_name: formData.fullName,
        phone: formData.phone,
        driver_type: formData.driverType,
        company_deduction: formData.companyDeduction || '0',
        weekly_period: formData.weeklyPeriod,
        lease_rate_per_mile: formData.leaseRatePerMile || null,
        company_pay_type: formData.companyPayType || null,
        company_pay_rate: formData.companyPayRate || null,
      });
      if (error) {
        toast({ title: "Failed to save profile", description: error.message, variant: "destructive" });
      } else {
        onComplete();
      }
    } else {
      const { error } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        phone: formData.phone,
        driver_type: formData.driverType,
        company_deduction: formData.companyDeduction || '0',
        weekly_period: formData.weeklyPeriod,
        lease_rate_per_mile: formData.leaseRatePerMile || null,
        company_pay_type: formData.companyPayType || null,
        company_pay_rate: formData.companyPayRate || null,
      });
      if (error) {
        toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Registration successful!",
          description: "Please check your email to verify your account, then return to login.",
        });
        onComplete();
      }
    }

    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center justify-center gap-2 mb-4">
            <img 
              src="/logo.png" 
              alt="TruckPay Logo" 
              className="w-20 h-20 object-contain brutal-shadow"
            />
            <CardTitle className="text-2xl brutal-text text-accent">TruckPay</CardTitle>
          </div>
          <p className="text-gray-600">
            {isSocialAuth ? 'Complete Your Driver Profile' : 'Create Your Driver Account'}
          </p>
          {isSocialAuth && (
            <p className="text-sm text-gray-500 mt-1">Your account is linked. Just fill in your driving details.</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name *
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                required
                className="h-12"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="h-12"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                readOnly={isSocialAuth}
                className={`h-12 ${isSocialAuth ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Password — hidden for social auth */}
            {!isSocialAuth && (
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  className="h-12"
                />
              </div>
            )}

            {/* Driver Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Driver Type *
              </Label>
              <Select value={formData.driverType} onValueChange={(value) => handleInputChange('driverType', value)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select driver type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner-operator">Owner-Operator (own truck)</SelectItem>
                  <SelectItem value="lease-operator">Lease-Operator (leasing company truck)</SelectItem>
                  <SelectItem value="company-driver">Company Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Owner-Operator: company deduction % */}
            {formData.driverType === 'owner-operator' && (
              <div className="space-y-2">
                <Label htmlFor="companyDeduction" className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Company Deduction Rate (%) *
                </Label>
                <Input
                  id="companyDeduction"
                  type="number"
                  placeholder="e.g. 25"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.companyDeduction}
                  onChange={(e) => handleInputChange('companyDeduction', e.target.value)}
                  className="h-12"
                />
                <p className="text-xs text-gray-500">Percentage the company takes from each load.</p>
              </div>
            )}

            {/* Lease-Operator: company deduction % + rate per mile */}
            {formData.driverType === 'lease-operator' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyDeductionLease" className="flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Company Deduction Rate (%) *
                  </Label>
                  <Input
                    id="companyDeductionLease"
                    type="number"
                    placeholder="e.g. 25"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.companyDeduction}
                    onChange={(e) => handleInputChange('companyDeduction', e.target.value)}
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">Percentage the company takes from each load.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaseRatePerMile" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Lease Rate Per Mile *
                  </Label>
                  <Input
                    id="leaseRatePerMile"
                    type="number"
                    placeholder="e.g. 0.13"
                    min="0"
                    step="0.01"
                    value={formData.leaseRatePerMile}
                    onChange={(e) => handleInputChange('leaseRatePerMile', e.target.value)}
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">Dollar amount you pay per mile driven (loaded or empty).</p>
                </div>
              </>
            )}

            {/* Company Driver: pay type + rate */}
            {formData.driverType === 'company-driver' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    How are you paid? *
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
                    <Label htmlFor="companyPayRate" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Rate Per Mile *
                    </Label>
                    <Input
                      id="companyPayRate"
                      type="number"
                      placeholder="e.g. 0.55"
                      min="0"
                      step="0.01"
                      value={formData.companyPayRate}
                      onChange={(e) => handleInputChange('companyPayRate', e.target.value)}
                      className="h-12"
                    />
                  </div>
                )}

                {formData.companyPayType === 'percentage' && (
                  <div className="space-y-2">
                    <Label htmlFor="companyPayRate" className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Your Share of Gross (%) *
                    </Label>
                    <Input
                      id="companyPayRate"
                      type="number"
                      placeholder="e.g. 30"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.companyPayRate}
                      onChange={(e) => handleInputChange('companyPayRate', e.target.value)}
                      className="h-12"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Weekly Period Selection - Add this after Company Deduction Rate */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Weekly Period *
              </Label>
              <Select value={formData.weeklyPeriod} onValueChange={(value) => handleInputChange('weeklyPeriod', value)}>
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
                Choose when your work week starts. For example, if you select Saturday, your week will run from Saturday to Friday.
              </p>
            </div>
            <Button
              type="submit"
              className="w-full h-12 brutal-border bg-info hover:bg-accent text-info-foreground hover:text-accent-foreground brutal-shadow-lg brutal-hover brutal-active"
              disabled={loading}
            >
              {loading
                ? (isSocialAuth ? 'Saving...' : 'Creating Account...')
                : (isSocialAuth ? 'Complete Setup' : 'Create Account')
              }
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={onBackToLogin}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isSocialAuth ? 'Cancel & Sign Out' : 'Back to Login'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Registration;
