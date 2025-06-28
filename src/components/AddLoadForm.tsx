
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
            onValueChange={(value) => setNewLoad({ ...newLoad, locationFrom: value })}
            placeholder="Select origin state..."
          />
        </div>

        {/* Location To */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            To State
          </Label>
          <LocationCombobox
            value={newLoad.locationTo}
            onValueChange={(value) => setNewLoad({ ...newLoad, locationTo: value })}
            placeholder="Select destination state..."
          />
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
                }}
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
                }}
                initialFocus
                disabled={(date) => 
                  newLoad.pickupDate ? date < newLoad.pickupDate : false
                }
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
            placeholder="1200.00"
            step="0.01"
            value={newLoad.rate}
            onChange={(e) => setNewLoad({ ...newLoad, rate: e.target.value })}
            className="h-12"
          />
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
            className="h-12"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={onAddLoad}
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={loading || !newLoad.rate || !newLoad.companyDeduction || !newLoad.locationFrom || !newLoad.locationTo}
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