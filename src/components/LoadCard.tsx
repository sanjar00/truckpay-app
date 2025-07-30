
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Trash2, Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import LocationCombobox from './LocationCombobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Load {
  id: string;
  rate: number;
  companyDeduction: number;
  driverPay: number;
  locationFrom: string;
  locationTo: string;
  pickupDate?: string;
  deliveryDate?: string;
  dateAdded: string;
  weekPeriod: string;
}

interface LoadCardProps {
  load: Load;
  onDelete: (id: string) => void;
  onEdit?: (id: string, updatedLoad: Partial<Load>) => void;
  isEditing?: boolean;
  setIsEditing?: (editing: boolean) => void;
}

const LoadCard = ({ load, onDelete, onEdit, isEditing, setIsEditing }: LoadCardProps) => {
  const [editData, setEditData] = useState({
    rate: load.rate.toString(),
    companyDeduction: load.companyDeduction.toString(),
    locationFrom: load.locationFrom,
    locationTo: load.locationTo,
    pickupDate: load.pickupDate ? new Date(load.pickupDate) : undefined,
    deliveryDate: load.deliveryDate ? new Date(load.deliveryDate) : undefined
  });
  const [pickupCalendarOpen, setPickupCalendarOpen] = useState(false);
  const [deliveryCalendarOpen, setDeliveryCalendarOpen] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const handleSave = () => {
    if (onEdit) {
      const driverPay = parseFloat(editData.rate) * (1 - parseFloat(editData.companyDeduction) / 100);
      onEdit(load.id, {
        rate: parseFloat(editData.rate),
        companyDeduction: parseFloat(editData.companyDeduction),
        driverPay,
        locationFrom: editData.locationFrom,
        locationTo: editData.locationTo,
        pickupDate: editData.pickupDate?.toISOString().split('T')[0],
        deliveryDate: editData.deliveryDate?.toISOString().split('T')[0]
      });
    }
  };

  const handleCancel = () => {
    setEditData({
      rate: load.rate.toString(),
      companyDeduction: load.companyDeduction.toString(),
      locationFrom: load.locationFrom,
      locationTo: load.locationTo,
      pickupDate: load.pickupDate ? new Date(load.pickupDate) : undefined,
      deliveryDate: load.deliveryDate ? new Date(load.deliveryDate) : undefined
    });
    if (setIsEditing) setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Location Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">From State</label>
                <LocationCombobox
                  value={editData.locationFrom}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, locationFrom: value }))}
                  placeholder="Select origin state..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">To State</label>
                <LocationCombobox
                  value={editData.locationTo}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, locationTo: value }))}
                  placeholder="Select destination state..."
                />
              </div>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Pickup Date</label>
                <Popover open={pickupCalendarOpen} onOpenChange={setPickupCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editData.pickupDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {editData.pickupDate ? format(editData.pickupDate, "PPP") : "Select pickup date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editData.pickupDate}
                      onSelect={(date) => {
                        setEditData(prev => ({ ...prev, pickupDate: date }));
                        setPickupCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Delivery Date</label>
                <Popover open={deliveryCalendarOpen} onOpenChange={setDeliveryCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editData.deliveryDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {editData.deliveryDate ? format(editData.deliveryDate, "PPP") : "Select delivery date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editData.deliveryDate}
                      onSelect={(date) => {
                        setEditData(prev => ({ ...prev, deliveryDate: date }));
                        setDeliveryCalendarOpen(false);
                      }}
                      disabled={(date) => {
                        // Only disable dates before pickup date if pickup is selected
                        if (editData.pickupDate && date < editData.pickupDate) {
                          return true;
                        }
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Rate and Deduction Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Load Rate ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editData.rate}
                  onChange={(e) => setEditData(prev => ({ ...prev, rate: e.target.value }))}
                  placeholder="1200.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Company Deduction (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editData.companyDeduction}
                  onChange={(e) => setEditData(prev => ({ ...prev, companyDeduction: e.target.value }))}
                  placeholder="25.00"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                disabled={!editData.rate || !editData.companyDeduction || !editData.locationFrom || !editData.locationTo}
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{load.locationFrom} → {load.locationTo}</span>
            </div>
            
            {/* Date Information */}
            <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Pickup: {formatDate(load.pickupDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Delivery: {formatDate(load.deliveryDate)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Load Rate</p>
                <p className="font-semibold text-green-600">${formatCurrency(load.rate)}</p>
              </div>
              <div>
                <p className="text-gray-600">Deduction</p>
                <p className="font-semibold text-red-600">{load.companyDeduction}%</p>
              </div>
              <div>
                <p className="text-gray-600">Driver Pay</p>
                <p className="font-semibold text-blue-600">${formatCurrency(load.driverPay)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {onEdit && setIsEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(load.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoadCard;