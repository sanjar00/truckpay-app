
import { useState } from 'react';
import { DollarSign, Percent, Calendar as CalendarIcon, ChevronDown, ChevronRight, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useZipLookup } from '@/hooks/useZipLookup';
import { NewLoad } from '@/types/LoadReports';
import { calculateDriverPay } from '@/lib/loadReportsUtils';

interface AddLoadFormProps {
  newLoad: NewLoad;
  setNewLoad: (load: NewLoad) => void;
  onAddLoad: (overrides: Partial<NewLoad>) => void;
  onCancel: () => void;
  loading: boolean;
  isEditing?: boolean;
  weekStart: Date;
  weekEnd: Date;
  userProfile?: any;
}

const AddLoadForm = ({
  newLoad,
  setNewLoad,
  onAddLoad,
  onCancel,
  loading,
  isEditing = false,
  weekStart,
  weekEnd,
  userProfile,
}: AddLoadFormProps) => {
  const [pickupCalendarOpen, setPickupCalendarOpen] = useState(false);
  const [deliveryCalendarOpen, setDeliveryCalendarOpen] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const zip = useZipLookup();

  const isCompanyDriver = userProfile?.driverType === 'company-driver';

  const driverPayPreview = newLoad.rate
    ? calculateDriverPay(
        parseFloat(newLoad.rate),
        userProfile,
        zip.estimatedMiles ?? newLoad.estimatedMiles,
        newLoad.detentionAmount ? parseFloat(newLoad.detentionAmount) : undefined,
        newLoad.companyDeduction !== '' ? parseFloat(newLoad.companyDeduction) : undefined
      ).toFixed(2)
    : null;

  const handlePickupZipChange = (value: string) => {
    setNewLoad({ ...newLoad, pickupZip: value, pickupCityState: '', estimatedMiles: undefined });
    if (value.length === 5) {
      zip.lookupPickupZip(value);
    }
  };

  const handleDeliveryZipChange = (value: string) => {
    setNewLoad({ ...newLoad, deliveryZip: value, deliveryCityState: '', estimatedMiles: undefined });
    if (value.length === 5) {
      zip.lookupDeliveryZip(value);
    }
  };

  // Sync zip lookup results into newLoad then submit
  const handleAddLoad = () => {
    onAddLoad({
      pickupCityState: zip.pickupInfo?.cityState || newLoad.pickupCityState,
      deliveryCityState: zip.deliveryInfo?.cityState || newLoad.deliveryCityState,
      locationFrom: zip.pickupInfo?.cityState || newLoad.locationFrom,
      locationTo: zip.deliveryInfo?.cityState || newLoad.locationTo,
      estimatedMiles: zip.estimatedMiles ?? newLoad.estimatedMiles,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{isEditing ? 'Edit Load' : 'Add New Load'}</CardTitle>
        <p className="text-sm text-gray-600">
          {isEditing ? 'Editing load in week:' : 'Adding to week:'} {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Pickup ZIP */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Pickup ZIP Code
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="e.g. 60601"
            value={newLoad.pickupZip || ''}
            onChange={(e) => handlePickupZipChange(e.target.value)}
            className="h-12"
          />
          {zip.loadingPickup && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Looking up ZIP...
            </p>
          )}
          {zip.pickupError && (
            <p className="text-xs text-red-600">{zip.pickupError}</p>
          )}
          {zip.pickupInfo && (
            <p className="text-xs text-green-700 font-semibold brutal-mono">
              {zip.pickupInfo.cityState}
            </p>
          )}
        </div>

        {/* Delivery ZIP */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Delivery ZIP Code
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="e.g. 77001"
            value={newLoad.deliveryZip || ''}
            onChange={(e) => handleDeliveryZipChange(e.target.value)}
            className="h-12"
          />
          {zip.loadingDelivery && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Looking up ZIP...
            </p>
          )}
          {zip.deliveryError && (
            <p className="text-xs text-red-600">{zip.deliveryError}</p>
          )}
          {zip.deliveryInfo && (
            <p className="text-xs text-green-700 font-semibold brutal-mono">
              {zip.deliveryInfo.cityState}
            </p>
          )}
        </div>

        {/* Estimated Miles (auto-filled, but editable) */}
        {(zip.pickupInfo && zip.deliveryInfo) && (
          <div className="space-y-2">
            <Label className="text-sm">Estimated Miles</Label>
            {zip.loadingDistance ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Calculating distance...
              </p>
            ) : (
              <Input
                type="number"
                placeholder="Miles"
                value={zip.estimatedMiles ?? newLoad.estimatedMiles ?? ''}
                onChange={(e) => setNewLoad({ ...newLoad, estimatedMiles: e.target.value ? parseInt(e.target.value) : undefined })}
                className="h-10"
              />
            )}
            {zip.estimatedMiles != null && !zip.loadingDistance && (
              <p className="text-xs text-muted-foreground">Auto-filled via Google Maps — you can edit if needed</p>
            )}
          </div>
        )}

        {/* Pickup Date */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Pickup Date
          </Label>
          <Popover open={pickupCalendarOpen} onOpenChange={setPickupCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-12 justify-start text-left font-normal",
                  !newLoad.pickupDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newLoad.pickupDate ? format(newLoad.pickupDate, "MMM d, yyyy") : format(new Date(), "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newLoad.pickupDate}
                onSelect={(date) => {
                  setNewLoad({ ...newLoad, pickupDate: date });
                  setPickupCalendarOpen(false);
                }}
                disabled={(date) =>
                  date < weekStart || date > weekEnd
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Delivery Date */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Delivery Date
          </Label>
          <Popover open={deliveryCalendarOpen} onOpenChange={setDeliveryCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-12 justify-start text-left font-normal",
                  !newLoad.deliveryDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newLoad.deliveryDate ? format(newLoad.deliveryDate, "MMM d, yyyy") : format(new Date(), "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newLoad.deliveryDate}
                onSelect={(date) => {
                  setNewLoad({ ...newLoad, deliveryDate: date });
                  setDeliveryCalendarOpen(false);
                }}
                initialFocus
                disabled={(date) => {
                  if (newLoad.pickupDate && date < newLoad.pickupDate) return true;
                  return false;
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Load Rate */}
        <div className="space-y-2">
          <Label htmlFor="loadRate" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Load Rate
          </Label>
          <Input
            id="loadRate"
            type="number"
            placeholder="$0.00"
            step="0.01"
            value={newLoad.rate || ''}
            onChange={(e) => setNewLoad({ ...newLoad, rate: e.target.value })}
            className="h-12"
          />
          {driverPayPreview && (
            <p className="text-xs text-green-700 font-semibold brutal-mono">
              DRIVER PAY: ${driverPayPreview}
            </p>
          )}
        </div>

        {/* Optional Fields Toggle */}
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center gap-2 brutal-mono text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2"
        >
          {showOptional ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {showOptional ? 'Hide Details' : 'More Details'}
        </button>

        {showOptional && (
          <div className="space-y-4 border-t pt-4">
            {/* Company Deduction — hidden for company drivers (their pay is set in profile) */}
            {!isCompanyDriver && (
              <div className="space-y-2">
                <Label htmlFor="companyDeduction" className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Company Deduction (%)
                </Label>
                <Input
                  id="companyDeduction"
                  type="number"
                  placeholder="e.g. 25.00"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newLoad.companyDeduction}
                  onChange={(e) => setNewLoad({ ...newLoad, companyDeduction: e.target.value })}
                  className="h-12"
                />
              </div>
            )}

            {/* Detention Amount */}
            <div className="space-y-2">
              <Label htmlFor="detentionAmount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Detention Pay
              </Label>
              <Input
                id="detentionAmount"
                type="number"
                placeholder="$0.00"
                step="0.01"
                min="0"
                value={newLoad.detentionAmount || ''}
                onChange={(e) => setNewLoad({ ...newLoad, detentionAmount: e.target.value })}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">Added when you wait more than 2 hours at pickup/dropoff</p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Input
                id="notes"
                placeholder="Any additional notes..."
                value={newLoad.notes || ''}
                onChange={(e) => setNewLoad({ ...newLoad, notes: e.target.value })}
                className="h-12"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleAddLoad}
            className="flex-1 brutal-border font-extrabold uppercase tracking-wide"
            style={{ background: '#f0a500', color: '#1a1a2e', border: '2px solid #1a1a2e' }}
            disabled={loading || !newLoad.rate || !newLoad.pickupZip || !newLoad.deliveryZip}
          >
            {loading ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Edit Load' : 'Add Load')}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddLoadForm;
