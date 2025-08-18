
import { useState } from 'react';
import { DollarSign, Percent, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import LocationCombobox from './LocationCombobox';
import { loadSchema } from '@/lib/validation';
import { toast } from '@/components/ui/use-toast';

interface NewLoad {
  rate: string;
  companyDeduction: string;
  locationFrom: string;
  locationTo: string;
  pickupDate?: Date;
  deliveryDate?: Date;
}

interface AddLoadFormProps {
  newLoad: NewLoad;
  setNewLoad: (load: NewLoad) => void;
  onAddLoad: () => void;
  onCancel: () => void;
  loading: boolean;
  weekStart: Date;
  weekEnd: Date;
}

const AddLoadForm = ({ 
  newLoad, 
  setNewLoad, 
  onAddLoad, 
  onCancel, 
  loading, 
  weekStart, 
  weekEnd 
}: AddLoadFormProps) => {
  const [pickupCalendarOpen, setPickupCalendarOpen] = useState(false);
  const [deliveryCalendarOpen, setDeliveryCalendarOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: keyof NewLoad) => {
    const result = loadSchema.safeParse(newLoad);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const message = fieldErrors[field]?.[0] || '';
      setErrors((prev) => ({ ...prev, [field]: message }));
      if (message) {
        toast({ title: 'Validation Error', description: message });
      }
    } else {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = () => {
    const result = loadSchema.safeParse(newLoad);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        rate: fieldErrors.rate?.[0] || '',
        companyDeduction: fieldErrors.companyDeduction?.[0] || '',
        locationFrom: fieldErrors.locationFrom?.[0] || '',
        locationTo: fieldErrors.locationTo?.[0] || '',
        pickupDate: fieldErrors.pickupDate?.[0] || '',
        deliveryDate: fieldErrors.deliveryDate?.[0] || '',
      });
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before submitting.',
      });
      return;
    }
    onAddLoad();
  };

  const isValid = loadSchema.safeParse(newLoad).success;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add New Load</CardTitle>
        <p className="text-sm text-gray-600">
          Adding to week: {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location From */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            From State
          </Label>
          <LocationCombobox
            value={newLoad.locationFrom}
            onValueChange={(value) => {
              setNewLoad({ ...newLoad, locationFrom: value });
              validateField('locationFrom');
            }}
            placeholder="Select origin state..."
          />
          {errors.locationFrom && (
            <p className="text-red-500 text-sm">{errors.locationFrom}</p>
          )}
        </div>

        {/* Location To */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            To State
          </Label>
          <LocationCombobox
            value={newLoad.locationTo}
            onValueChange={(value) => {
              setNewLoad({ ...newLoad, locationTo: value });
              validateField('locationTo');
            }}
            placeholder="Select destination state..."
          />
          {errors.locationTo && (
            <p className="text-red-500 text-sm">{errors.locationTo}</p>
          )}
        </div>

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
                {newLoad.pickupDate ? format(newLoad.pickupDate, "PPP") : "Select pickup date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newLoad.pickupDate}
                onSelect={(date) => {
                  setNewLoad({ ...newLoad, pickupDate: date });
                  setPickupCalendarOpen(false);
                  validateField('pickupDate');
                }}
                disabled={(date) =>
                  date < weekStart || date > weekEnd
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.pickupDate && (
            <p className="text-red-500 text-sm">{errors.pickupDate}</p>
          )}
        </div>

        {/* Delivery Date - Remove future date restriction */}
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
                {newLoad.deliveryDate ? format(newLoad.deliveryDate, "PPP") : "Select delivery date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newLoad.deliveryDate}
                onSelect={(date) => {
                  setNewLoad({ ...newLoad, deliveryDate: date });
                  setDeliveryCalendarOpen(false);
                  validateField('deliveryDate');
                }}
                initialFocus
                disabled={(date) => {
                  // Only disable dates before pickup date if pickup is selected
                  // Remove the weekly period restriction for delivery dates
                  if (newLoad.pickupDate && date < newLoad.pickupDate) {
                    return true;
                  }
                  return false;
                }}
              />
            </PopoverContent>
          </Popover>
          {errors.deliveryDate && (
            <p className="text-red-500 text-sm">{errors.deliveryDate}</p>
          )}
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
            placeholder="1200.00"
            step="0.01"
            value={newLoad.rate}
            onChange={(e) => setNewLoad({ ...newLoad, rate: e.target.value })}
            onBlur={() => validateField('rate')}
            className="h-12"
          />
          {errors.rate && (
            <p className="text-red-500 text-sm">{errors.rate}</p>
          )}
        </div>

        {/* Company Deduction */}
        <div className="space-y-2">
          <Label htmlFor="companyDeduction" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Company Deduction (%)
          </Label>
          <Input
            id="companyDeduction"
            type="number"
            placeholder="25.00"
            step="0.01"
            min="0"
            max="100"
            value={newLoad.companyDeduction}
            onChange={(e) => setNewLoad({ ...newLoad, companyDeduction: e.target.value })}
            onBlur={() => validateField('companyDeduction')}
            className="h-12"
          />
          {errors.companyDeduction && (
            <p className="text-red-500 text-sm">{errors.companyDeduction}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={loading || !isValid}
          >
            {loading ? 'Adding...' : 'Add Load'}
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