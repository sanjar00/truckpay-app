
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Trash2, Edit, Save, X, MoreHorizontal, ChevronDown, ChevronUp, Loader2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { calculateDriverPay } from '@/lib/loadReportsUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useZipLookup } from '@/hooks/useZipLookup';

function getProfitabilityGrade(grossRate: number, miles: number) {
  if (!miles || miles <= 0) return null;
  const rpm = grossRate / miles;
  if (rpm >= 2.50) return { score: 'A', label: 'EXCELLENT', color: 'bg-green-600 text-white', rpm };
  if (rpm >= 2.00) return { score: 'B', label: 'GOOD', color: 'bg-blue-600 text-white', rpm };
  if (rpm >= 1.50) return { score: 'C', label: 'AVERAGE', color: 'bg-yellow-500 text-black', rpm };
  return { score: 'D', label: 'POOR', color: 'bg-red-600 text-white', rpm };
}

const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateFromDB = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

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
  deadheadMiles?: number;
  detentionAmount?: number;
  notes?: string;
  pickupZip?: string;
  deliveryZip?: string;
  pickupCityState?: string;
  deliveryCityState?: string;
  estimatedMiles?: number;
}

interface LoadCardProps {
  load: Load;
  onDelete: (id: string) => void;
  onEdit?: (id: string, updatedLoad: Partial<Load>) => void;
  isEditing?: boolean;
  setIsEditing?: (editing: boolean) => void;
  estimatedMiles?: number;
  userProfile?: any;
}

const LoadCard = ({ load, onDelete, onEdit, isEditing, setIsEditing, estimatedMiles, userProfile }: LoadCardProps) => {
  const isCompanyDriver = userProfile?.driverType === 'company-driver';
  // Use load's own estimatedMiles if available, fall back to prop
  const milesForGrade = load.estimatedMiles || estimatedMiles;
  // Grade is always based on gross rate per mile (load value, not driver cut)
  const grade = milesForGrade ? getProfitabilityGrade(load.rate, milesForGrade) : null;

  const [editData, setEditData] = useState({
    rate: load.rate.toString(),
    companyDeduction: load.companyDeduction.toString(),
    pickupDate: load.pickupDate ? parseDateFromDB(load.pickupDate) : undefined as Date | undefined,
    deliveryDate: load.deliveryDate ? parseDateFromDB(load.deliveryDate) : undefined as Date | undefined,
    deadheadMiles: load.deadheadMiles?.toString() || '',
    detentionAmount: load.detentionAmount?.toString() || '',
    notes: load.notes || '',
    pickupZip: load.pickupZip || '',
    deliveryZip: load.deliveryZip || '',
    estimatedMiles: load.estimatedMiles?.toString() || '',
  });

  const [pickupCalendarOpen, setPickupCalendarOpen] = useState(false);
  const [deliveryCalendarOpen, setDeliveryCalendarOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const zip = useZipLookup();

  // Pre-populate zip lookup state when entering edit mode
  useEffect(() => {
    if (isEditing && load.pickupZip && load.deliveryZip) {
      zip.preload(
        load.pickupCityState ? { cityState: load.pickupCityState, lat: 0, lng: 0 } : null,
        load.deliveryCityState ? { cityState: load.deliveryCityState, lat: 0, lng: 0 } : null,
        load.estimatedMiles ?? null
      );
    }
  }, [isEditing]);

  const handlePickupZipChange = (value: string) => {
    setEditData(prev => ({ ...prev, pickupZip: value }));
    if (value.length === 5) {
      zip.lookupPickupZip(value);
    }
  };

  const handleDeliveryZipChange = (value: string) => {
    setEditData(prev => ({ ...prev, deliveryZip: value }));
    if (value.length === 5) {
      zip.lookupDeliveryZip(value);
    }
  };

  const handleSave = () => {
    if (onEdit) {
      const resolvedMiles = zip.estimatedMiles ?? (editData.estimatedMiles ? parseInt(editData.estimatedMiles) : undefined);
      const detentionAmount = editData.detentionAmount ? parseFloat(editData.detentionAmount) : undefined;
      const driverPay = calculateDriverPay(parseFloat(editData.rate), userProfile, resolvedMiles, detentionAmount);
      onEdit(load.id, {
        rate: parseFloat(editData.rate),
        companyDeduction: parseFloat(editData.companyDeduction),
        driverPay,
        locationFrom: zip.pickupInfo?.cityState || load.locationFrom,
        locationTo: zip.deliveryInfo?.cityState || load.locationTo,
        pickupDate: editData.pickupDate ? formatDateForDB(editData.pickupDate) : undefined,
        deliveryDate: editData.deliveryDate ? formatDateForDB(editData.deliveryDate) : undefined,
        deadheadMiles: editData.deadheadMiles ? parseFloat(editData.deadheadMiles) : undefined,
        detentionAmount: editData.detentionAmount ? parseFloat(editData.detentionAmount) : undefined,
        notes: editData.notes || undefined,
        pickupZip: editData.pickupZip || undefined,
        deliveryZip: editData.deliveryZip || undefined,
        pickupCityState: zip.pickupInfo?.cityState || load.pickupCityState,
        deliveryCityState: zip.deliveryInfo?.cityState || load.deliveryCityState,
        estimatedMiles: resolvedMiles,
      });
    }
  };

  const handleCancel = () => {
    setEditData({
      rate: load.rate.toString(),
      companyDeduction: load.companyDeduction.toString(),
      pickupDate: load.pickupDate ? parseDateFromDB(load.pickupDate) : undefined,
      deliveryDate: load.deliveryDate ? parseDateFromDB(load.deliveryDate) : undefined,
      deadheadMiles: load.deadheadMiles?.toString() || '',
      detentionAmount: load.detentionAmount?.toString() || '',
      notes: load.notes || '',
      pickupZip: load.pickupZip || '',
      deliveryZip: load.deliveryZip || '',
      estimatedMiles: load.estimatedMiles?.toString() || '',
    });
    setShowOptional(false);
    zip.reset();
    if (setIsEditing) setIsEditing(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      return format(new Date(year, month - 1, day), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  if (isEditing) {
    return (
      <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Pickup ZIP */}
            <div>
              <label className="text-sm font-medium mb-1 block">Pickup ZIP Code</label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="e.g. 60601"
                value={editData.pickupZip}
                onChange={(e) => handlePickupZipChange(e.target.value)}
                className="h-10"
              />
              {zip.loadingPickup && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Looking up...
                </p>
              )}
              {zip.pickupError && <p className="text-xs text-red-600 mt-1">{zip.pickupError}</p>}
              {zip.pickupInfo && (
                <p className="text-xs text-green-700 font-semibold mt-1">{zip.pickupInfo.cityState}</p>
              )}
              {!zip.pickupInfo && load.pickupCityState && (
                <p className="text-xs text-muted-foreground mt-1">{load.pickupCityState}</p>
              )}
            </div>

            {/* Delivery ZIP */}
            <div>
              <label className="text-sm font-medium mb-1 block">Delivery ZIP Code</label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="e.g. 77001"
                value={editData.deliveryZip}
                onChange={(e) => handleDeliveryZipChange(e.target.value)}
                className="h-10"
              />
              {zip.loadingDelivery && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Looking up...
                </p>
              )}
              {zip.deliveryError && <p className="text-xs text-red-600 mt-1">{zip.deliveryError}</p>}
              {zip.deliveryInfo && (
                <p className="text-xs text-green-700 font-semibold mt-1">{zip.deliveryInfo.cityState}</p>
              )}
              {!zip.deliveryInfo && load.deliveryCityState && (
                <p className="text-xs text-muted-foreground mt-1">{load.deliveryCityState}</p>
              )}
            </div>

            {/* Estimated Miles */}
            <div>
              <label className="text-sm font-medium mb-1 block">Estimated Miles</label>
              {zip.loadingDistance ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Calculating...
                </p>
              ) : (
                <Input
                  type="number"
                  placeholder="Miles"
                  value={zip.estimatedMiles ?? editData.estimatedMiles}
                  onChange={(e) => setEditData(prev => ({ ...prev, estimatedMiles: e.target.value }))}
                  className="h-10"
                />
              )}
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Pickup Date</label>
                <Popover open={pickupCalendarOpen} onOpenChange={setPickupCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !editData.pickupDate && "text-muted-foreground")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {editData.pickupDate ? format(editData.pickupDate, "PPP") : "Select pickup date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editData.pickupDate}
                      onSelect={(date) => { setEditData(prev => ({ ...prev, pickupDate: date })); setPickupCalendarOpen(false); }}
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
                      className={cn("w-full justify-start text-left font-normal", !editData.deliveryDate && "text-muted-foreground")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {editData.deliveryDate ? format(editData.deliveryDate, "PPP") : "Select delivery date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editData.deliveryDate}
                      onSelect={(date) => { setEditData(prev => ({ ...prev, deliveryDate: date })); setDeliveryCalendarOpen(false); }}
                      disabled={(date) => editData.pickupDate ? date < editData.pickupDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Rate and Deduction */}
            <div className={`grid grid-cols-1 gap-4 ${!isCompanyDriver ? 'md:grid-cols-2' : ''}`}>
              <div>
                <label className="text-sm font-medium mb-1 block">Load Rate ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editData.rate}
                  onChange={(e) => setEditData(prev => ({ ...prev, rate: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              {!isCompanyDriver && (
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
              )}
            </div>

            {/* More Details Toggle */}
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2"
            >
              {showOptional ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showOptional ? 'Hide Details' : 'More Details'}
            </button>

            {showOptional && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Detention Pay ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.detentionAmount}
                    onChange={(e) => setEditData(prev => ({ ...prev, detentionAmount: e.target.value }))}
                    placeholder="0.00"
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">Added when you wait more than 2 hours at pickup/dropoff</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Input
                    placeholder="Any additional notes..."
                    value={editData.notes}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    className="h-10"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                disabled={!editData.rate || (!isCompanyDriver && !editData.companyDeduction) || !editData.pickupZip || !editData.deliveryZip}
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // View mode
  const pickupLabel = load.pickupZip
    ? `${load.pickupZip}${load.pickupCityState ? ` · ${load.pickupCityState}` : ''}`
    : load.locationFrom;
  const deliveryLabel = load.deliveryZip
    ? `${load.deliveryZip}${load.deliveryCityState ? ` · ${load.deliveryCityState}` : ''}`
    : load.locationTo;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-tight">{pickupLabel}</p>
                <p className="text-xs text-gray-400 my-0.5">↓</p>
                <p className="font-medium text-sm leading-tight">{deliveryLabel}</p>
              </div>
              {grade && (
                <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${grade.color}`}>
                  {grade.score} · ${grade.rpm.toFixed(2)}/mi
                </span>
              )}
            </div>

            {load.estimatedMiles && (
              <p className="text-xs text-muted-foreground mb-2">{load.estimatedMiles.toLocaleString()} miles</p>
            )}

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
                <p className="text-gray-600 text-xs">Driver Pay</p>
                <p className="font-bold text-lg text-green-700">${formatCurrency(load.driverPay)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs">Load Rate</p>
                <p className="font-semibold text-gray-600">${formatCurrency(load.rate)}</p>
                {load.detentionAmount && (
                  <p className="text-gray-500 text-xs mt-1">+ ${formatCurrency(load.detentionAmount)} detention</p>
                )}
              </div>
              {!isCompanyDriver ? (
                <div>
                  <p className="text-gray-600 text-xs">Co. Cut</p>
                  <p className="font-semibold text-red-500">{load.companyDeduction}%</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 text-xs">Pay Basis</p>
                  <p className="font-semibold text-gray-600">
                    {userProfile?.companyPayType === 'per_mile'
                      ? `$${userProfile.companyPayRate}/mi`
                      : `${userProfile?.companyPayRate}%`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="hidden sm:flex gap-2">
              {onEdit && setIsEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onDelete(load.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="sm:hidden relative">
              <Button onClick={() => setShowMobileMenu(!showMobileMenu)} variant="ghost" size="sm" className="p-1">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              {showMobileMenu && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                  {onEdit && setIsEditing && (
                    <button
                      onClick={() => { setIsEditing(true); setShowMobileMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                  )}
                  <button
                    onClick={() => { onDelete(load.id); setShowMobileMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoadCard;
