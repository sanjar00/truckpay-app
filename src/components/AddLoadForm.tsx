
import { useState } from 'react';
import { DollarSign, Percent, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
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
  deadheadMiles?: string;
  dispatcherName?: string;
  dispatcherCompany?: string;
  dispatcherPhone?: string;
  brokerName?: string;
  brokerCompany?: string;
  bolNumber?: string;
  notes?: string;
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
  const [showOptional, setShowOptional] = useState(false);

  const driverPayPreview = newLoad.rate && newLoad.companyDeduction
    ? (parseFloat(newLoad.rate) * (1 - parseFloat(newLoad.companyDeduction) / 100)).toFixed(2)
    : null;

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
                disabled={(date) => 
                  date < weekStart || date > weekEnd
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
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
          {driverPayPreview && (
            <p className="text-xs text-green-700 font-semibold brutal-mono">
              DRIVER PAY: ${driverPayPreview}
            </p>
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
            className="h-12"
          />
        </div>

        {/* Optional Fields Toggle */}
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center gap-2 brutal-mono text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2"
        >
          {showOptional ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showOptional ? 'HIDE OPTIONAL FIELDS' : 'SHOW OPTIONAL FIELDS (deadhead, dispatcher, BOL...)'}
        </button>

        {showOptional && (
          <div className="space-y-4 border-t pt-4">
            {/* Deadhead Miles */}
            <div className="space-y-2">
              <Label className="text-sm">Deadhead Miles (empty miles to pickup)</Label>
              <Input
                type="number"
                placeholder="e.g. 45"
                value={newLoad.deadheadMiles || ''}
                onChange={(e) => setNewLoad({ ...newLoad, deadheadMiles: e.target.value })}
                className="h-10"
              />
            </div>

            {/* Dispatcher */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Dispatcher</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Name" value={newLoad.dispatcherName || ''} onChange={(e) => setNewLoad({ ...newLoad, dispatcherName: e.target.value })} className="h-10" />
                <Input placeholder="Company" value={newLoad.dispatcherCompany || ''} onChange={(e) => setNewLoad({ ...newLoad, dispatcherCompany: e.target.value })} className="h-10" />
                <Input placeholder="Phone" type="tel" value={newLoad.dispatcherPhone || ''} onChange={(e) => setNewLoad({ ...newLoad, dispatcherPhone: e.target.value })} className="h-10" />
              </div>
            </div>

            {/* Broker */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Broker</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="Broker Name" value={newLoad.brokerName || ''} onChange={(e) => setNewLoad({ ...newLoad, brokerName: e.target.value })} className="h-10" />
                <Input placeholder="Broker Company" value={newLoad.brokerCompany || ''} onChange={(e) => setNewLoad({ ...newLoad, brokerCompany: e.target.value })} className="h-10" />
              </div>
            </div>

            {/* BOL & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-sm">BOL Number</Label>
                <Input placeholder="Bill of Lading #" value={newLoad.bolNumber || ''} onChange={(e) => setNewLoad({ ...newLoad, bolNumber: e.target.value })} className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Notes</Label>
                <Input placeholder="Notes..." value={newLoad.notes || ''} onChange={(e) => setNewLoad({ ...newLoad, notes: e.target.value })} className="h-10" />
              </div>
            </div>
          </div>
        )}

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