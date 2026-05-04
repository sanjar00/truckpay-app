
import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Percent,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  MapPin,
  Loader2,
  Plus,
  Circle,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useZipLookup } from '@/hooks/useZipLookup';
import { NewLoad, NewLoadStop } from '@/types/LoadReports';
import { calculateDriverPay, sumStopSideEffects } from '@/lib/loadReportsUtils';

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
  /** If false, tapping "+ Add destination" calls onUpgrade instead of adding a stop. */
  canUseMultiStop?: boolean;
  /** Called when a gated action (like adding an intermediate stop) is blocked. */
  onUpgrade?: () => void;
  onboardingStep?: string | null;
  onOnboardingEvent?: (event: string) => void;
}

// Generate a lightweight client-side id for new stop rows (React list key only).
const tempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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
  canUseMultiStop = true,
  onUpgrade,
  onboardingStep,
  onOnboardingEvent,
}: AddLoadFormProps) => {
  const [pickupCalendarOpen, setPickupCalendarOpen] = useState(false);
  const [deliveryCalendarOpen, setDeliveryCalendarOpen] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});

  const zip = useZipLookup();

  const isCompanyDriver = userProfile?.driverType === 'company-driver';
  const stops: NewLoadStop[] = newLoad.stops ?? [];
  const hasStops = stops.length > 0;

  // ── Multi-stop miles + city-state state ───────────────────────────────────
  // When there are no stops, we rely entirely on useZipLookup (unchanged A→B behavior).
  // When there are stops, we maintain our own state populated by resolveStops().
  const [multiStopMiles, setMultiStopMiles] = useState<number | null>(null);
  const [multiStopLoading, setMultiStopLoading] = useState(false);
  const [multiStopError, setMultiStopError] = useState<string | null>(null);

  const allStopsHaveValidZip = useMemo(() => {
    if (!hasStops) return false;
    if (!/^\d{5}$/.test(String(newLoad.pickupZip || '').trim())) return false;
    if (!/^\d{5}$/.test(String(newLoad.deliveryZip || '').trim())) return false;
    for (const s of stops) {
      if (!/^\d{5}$/.test(String(s.zip || '').trim())) return false;
    }
    return true;
  }, [hasStops, stops, newLoad.pickupZip, newLoad.deliveryZip]);

  // Trigger multi-waypoint lookup whenever every stop has a valid ZIP.
  useEffect(() => {
    if (!hasStops) {
      setMultiStopMiles(null);
      setMultiStopError(null);
      return;
    }
    if (!allStopsHaveValidZip) return;

    const zips = [
      String(newLoad.pickupZip).trim(),
      ...stops.map(s => String(s.zip).trim()),
      String(newLoad.deliveryZip).trim(),
    ];

    let cancelled = false;
    setMultiStopLoading(true);
    setMultiStopError(null);

    zip.resolveStops(zips).then(result => {
      if (cancelled) return;
      setMultiStopLoading(false);
      if (!result) {
        setMultiStopError('Could not calculate route');
        setMultiStopMiles(null);
        return;
      }
      setMultiStopMiles(result.totalMiles);
      // Auto-fill city/state on the origin, each stop, and the destination if empty.
      const [originCS, ...rest] = result.cityStates;
      const destCS = rest.pop() || '';
      const legMiles = result.legs.map(l => l.miles);

      setNewLoad({
        ...newLoad,
        pickupCityState: newLoad.pickupCityState || originCS || '',
        deliveryCityState: newLoad.deliveryCityState || destCS || '',
        estimatedMiles: result.totalMiles,
        stops: stops.map((s, i) => ({
          ...s,
          cityState: s.cityState || rest[i] || '',
          legMiles: legMiles[i + 0], // leg i is the segment arriving AT stop i (origin→stop1 = leg 0)
        })),
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStopsHaveValidZip, hasStops, stops.map(s => s.zip).join('|'), newLoad.pickupZip, newLoad.deliveryZip]);

  // ── Pay preview ───────────────────────────────────────────────────────────
  const stopSideEffects = sumStopSideEffects(stops);
  const effectiveMiles = hasStops
    ? (multiStopMiles ?? newLoad.estimatedMiles)
    : (zip.estimatedMiles ?? newLoad.estimatedMiles);
  const headerDetention = newLoad.detentionAmount ? parseFloat(newLoad.detentionAmount) : 0;
  const totalDetention = (Number.isNaN(headerDetention) ? 0 : headerDetention) + stopSideEffects.detention;

  const driverPayPreview = newLoad.rate
    ? calculateDriverPay(
        parseFloat(newLoad.rate),
        userProfile,
        effectiveMiles,
        totalDetention,
        newLoad.companyDeduction !== '' ? parseFloat(newLoad.companyDeduction) : undefined,
        stopSideEffects.stopOffFees,
      ).toFixed(2)
    : null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePickupZipChange = (value: string) => {
    setNewLoad({ ...newLoad, pickupZip: value, pickupCityState: '', estimatedMiles: undefined });
    if (!hasStops && value.length === 5) {
      zip.lookupPickupZip(value);
    }
  };

  const handleDeliveryZipChange = (value: string) => {
    setNewLoad({ ...newLoad, deliveryZip: value, deliveryCityState: '', estimatedMiles: undefined });
    if (!hasStops && value.length === 5) {
      zip.lookupDeliveryZip(value);
    }
  };

  const handleAddStop = () => {
    if (!canUseMultiStop) {
      onUpgrade?.();
      return;
    }
    const id = tempId();
    const nextStops: NewLoadStop[] = [
      ...stops,
      {
        tempId: id,
        stopType: 'delivery', // most common multi-stop case = 1 pickup, 2+ drops
        zip: '',
        cityState: '',
        detentionAmount: '',
        stopOffFee: '',
      },
    ];
    setNewLoad({ ...newLoad, stops: nextStops });
    setExpandedStops(prev => ({ ...prev, [id]: false }));
  };

  const updateStop = (index: number, patch: Partial<NewLoadStop>) => {
    const next = stops.map((s, i) => (i === index ? { ...s, ...patch } : s));
    setNewLoad({ ...newLoad, stops: next });
  };

  const removeStop = (index: number) => {
    const next = stops.filter((_, i) => i !== index);
    setNewLoad({ ...newLoad, stops: next });
  };

  const moveStop = (index: number, direction: -1 | 1) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= stops.length) return;
    const next = stops.slice();
    [next[index], next[newIdx]] = [next[newIdx], next[index]];
    setNewLoad({ ...newLoad, stops: next });
  };

  const handleAddLoad = () => {
    onOnboardingEvent?.('load-added');

    // When no intermediate stops, submit exactly as before — single-stop flow unchanged.
    if (!hasStops) {
      onAddLoad({
        pickupCityState: zip.pickupInfo?.cityState || newLoad.pickupCityState,
        deliveryCityState: zip.deliveryInfo?.cityState || newLoad.deliveryCityState,
        locationFrom: zip.pickupInfo?.cityState || newLoad.locationFrom,
        locationTo: zip.deliveryInfo?.cityState || newLoad.locationTo,
        estimatedMiles: zip.estimatedMiles ?? newLoad.estimatedMiles,
      });
      return;
    }

    // Multi-stop: city/state already auto-filled by the resolveStops effect above.
    onAddLoad({
      pickupCityState: newLoad.pickupCityState,
      deliveryCityState: newLoad.deliveryCityState,
      locationFrom: newLoad.pickupCityState || newLoad.locationFrom,
      locationTo: newLoad.deliveryCityState || newLoad.locationTo,
      estimatedMiles: multiStopMiles ?? newLoad.estimatedMiles,
      stops,
    });
  };

  // Connector line between stop rows (simple visual).
  const StopConnector = () => (
    <div className="flex justify-center py-1" aria-hidden>
      <div className="flex flex-col gap-[3px]">
        <div className="w-[3px] h-[3px] rounded-full bg-gray-400" />
        <div className="w-[3px] h-[3px] rounded-full bg-gray-400" />
        <div className="w-[3px] h-[3px] rounded-full bg-gray-400" />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{isEditing ? 'Edit Load' : 'Add New Load'}</CardTitle>
        <p className="text-sm text-gray-600">
          {isEditing ? 'Editing load in week:' : 'Adding to week:'} {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* ── Pickup ZIP (origin) ── */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Circle className="w-3 h-3 text-gray-600" />
            Pickup ZIP Code
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="e.g. 60601"
            value={newLoad.pickupZip || ''}
            onChange={(e) => handlePickupZipChange(e.target.value)}
            onBlur={(e) => {
              if (/^\d{5}$/.test(e.target.value.trim())) onOnboardingEvent?.('pickup-entered');
            }}
            data-onboarding="load-pickup-zip"
            className={`h-12 ${onboardingStep === 'load-pickup-zip' ? 'onboarding-target' : ''}`}
          />
          {!hasStops && zip.loadingPickup && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Looking up ZIP...
            </p>
          )}
          {!hasStops && zip.pickupError && (
            <p className="text-xs text-red-600">{zip.pickupError}</p>
          )}
          {!hasStops && zip.pickupInfo && (
            <p className="text-xs text-green-700 font-semibold brutal-mono">
              {zip.pickupInfo.cityState}
            </p>
          )}
          {hasStops && newLoad.pickupCityState && (
            <p className="text-xs text-green-700 font-semibold brutal-mono">
              {newLoad.pickupCityState}
            </p>
          )}
        </div>

        {/* ── Intermediate stops ── */}
        {hasStops && <StopConnector />}
        {stops.map((stop, index) => {
          const expanded = !!expandedStops[stop.tempId];
          const stopTitleIdx = index + 2; // 1 = origin; this is position stopTitleIdx
          return (
            <div key={stop.tempId}>
              <div className="rounded-md border-2 border-gray-300 p-3 space-y-2 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-gray-600" />
                    <span className="brutal-mono text-xs text-gray-600 font-semibold">
                      STOP {stopTitleIdx}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateStop(index, { stopType: stop.stopType === 'pickup' ? 'delivery' : 'pickup' })}
                      className="brutal-mono text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{
                        background: stop.stopType === 'pickup' ? '#e8f5e9' : '#fdf0e0',
                        color: '#1a1a2e',
                        border: '1px solid #1a1a2e',
                      }}
                    >
                      {stop.stopType === 'pickup' ? 'PICKUP' : 'DELIVERY'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => moveStop(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => moveStop(index, 1)}
                      disabled={index === stops.length - 1}
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeStop(index)}
                      aria-label="Remove stop"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="Stop ZIP"
                  value={stop.zip || ''}
                  onChange={(e) => updateStop(index, { zip: e.target.value, cityState: '' })}
                  className="h-11"
                />
                {stop.cityState && (
                  <p className="text-xs text-green-700 font-semibold brutal-mono">
                    {stop.cityState}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setExpandedStops(prev => ({ ...prev, [stop.tempId]: !expanded }))}
                  className="flex items-center gap-1 brutal-mono text-[11px] text-muted-foreground hover:text-foreground w-full pt-1"
                >
                  {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {expanded ? 'Hide Details' : 'Date / Detention / Stop-Off Fee'}
                </button>

                {expanded && (
                  <div className="space-y-2 pt-2 border-t">
                    <div>
                      <Label className="text-xs brutal-mono">Scheduled Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full h-10 justify-start text-left font-normal mt-1',
                              !stop.scheduledAt && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {stop.scheduledAt ? format(stop.scheduledAt, 'MMM d, yyyy') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={stop.scheduledAt}
                            onSelect={(d) => updateStop(index, { scheduledAt: d })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className="text-xs brutal-mono">Detention Pay ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="$0.00"
                        value={stop.detentionAmount || ''}
                        onChange={(e) => updateStop(index, { detentionAmount: e.target.value })}
                        className="h-10 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs brutal-mono">Stop-Off Fee ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="$0.00"
                        value={stop.stopOffFee || ''}
                        onChange={(e) => updateStop(index, { stopOffFee: e.target.value })}
                        className="h-10 mt-1"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Broker-paid charge for this extra stop</p>
                    </div>
                  </div>
                )}
              </div>
              <StopConnector />
            </div>
          );
        })}

        {/* ── Delivery ZIP (final destination) ── */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            {hasStops ? 'Final Delivery ZIP' : 'Delivery ZIP Code'}
          </Label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="e.g. 77001"
            value={newLoad.deliveryZip || ''}
            onChange={(e) => handleDeliveryZipChange(e.target.value)}
            onBlur={(e) => {
              if (/^\d{5}$/.test(e.target.value.trim())) onOnboardingEvent?.('delivery-entered');
            }}
            data-onboarding="load-delivery-zip"
            className={`h-12 ${onboardingStep === 'load-delivery-zip' ? 'onboarding-target' : ''}`}
          />
          {!hasStops && zip.loadingDelivery && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Looking up ZIP...
            </p>
          )}
          {!hasStops && zip.deliveryError && (
            <p className="text-xs text-red-600">{zip.deliveryError}</p>
          )}
          {!hasStops && zip.deliveryInfo && (
            <p className="text-xs text-green-700 font-semibold brutal-mono">
              {zip.deliveryInfo.cityState}
            </p>
          )}
          {hasStops && newLoad.deliveryCityState && (
            <p className="text-xs text-green-700 font-semibold brutal-mono">
              {newLoad.deliveryCityState}
            </p>
          )}
        </div>

        {/* ── "+ Add destination" button (Pro-gated) ── */}
        <button
          type="button"
          onClick={handleAddStop}
          className="w-full flex items-center gap-2 justify-center py-3 rounded-md border-2 border-dashed border-gray-300 hover:border-gray-500 hover:bg-gray-50 brutal-mono text-xs font-bold text-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          ADD DESTINATION
          {!canUseMultiStop && (
            <span className="brutal-mono text-[9px] px-1.5 py-0.5 rounded ml-1"
              style={{ background: '#f0a500', color: '#1a1a2e' }}>
              PRO
            </span>
          )}
        </button>

        {/* ── Estimated Miles (auto-filled) ── */}
        {(hasStops ? allStopsHaveValidZip : (zip.pickupInfo && zip.deliveryInfo)) && (
          <div className="space-y-2">
            <Label className="text-sm">Estimated Miles</Label>
            {(hasStops ? multiStopLoading : zip.loadingDistance) ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Calculating distance...
              </p>
            ) : (
              <Input
                type="number"
                placeholder="Miles"
                value={(hasStops ? multiStopMiles : zip.estimatedMiles) ?? newLoad.estimatedMiles ?? ''}
                onChange={(e) => setNewLoad({ ...newLoad, estimatedMiles: e.target.value ? parseInt(e.target.value) : undefined })}
                className="h-10"
              />
            )}
            {multiStopError && hasStops && (
              <p className="text-xs text-red-600">{multiStopError}</p>
            )}
            {(hasStops ? multiStopMiles != null : zip.estimatedMiles != null) && (
              <p className="text-xs text-muted-foreground">
                {hasStops ? `Sum of ${stops.length + 1} legs via Google Maps — editable` : 'Auto-filled via Google Maps — you can edit if needed'}
              </p>
            )}
          </div>
        )}

        {/* ── Pickup Date ── */}
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
                  'w-full h-12 justify-start text-left font-normal',
                  !newLoad.pickupDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newLoad.pickupDate ? format(newLoad.pickupDate, 'MMM d, yyyy') : format(new Date(), 'MMM d, yyyy')}
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
                disabled={(date) => date < weekStart || date > weekEnd}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* ── Delivery Date ── */}
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
                  'w-full h-12 justify-start text-left font-normal',
                  !newLoad.deliveryDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newLoad.deliveryDate ? format(newLoad.deliveryDate, 'MMM d, yyyy') : format(new Date(), 'MMM d, yyyy')}
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

        {/* ── Load Rate ── */}
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
            onBlur={(e) => {
              if (Number(e.target.value) > 0) onOnboardingEvent?.('rate-entered');
            }}
            data-onboarding="load-rate"
            className={`h-12 ${onboardingStep === 'load-rate' ? 'onboarding-target' : ''}`}
          />
          {driverPayPreview && (
            <p className="text-xs text-green-700 font-semibold brutal-mono">
              DRIVER PAY: ${driverPayPreview}
              {hasStops && stopSideEffects.stopOffFees > 0 && (
                <span className="text-muted-foreground font-normal"> (+ ${stopSideEffects.stopOffFees.toFixed(2)} stop-off)</span>
              )}
            </p>
          )}
        </div>

        {/* ── Optional Fields Toggle ── */}
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
              <p className="text-xs text-muted-foreground">
                Added when you wait more than 2 hours at pickup/dropoff
                {hasStops && ' (use per-stop detention above for each intermediate stop)'}
              </p>
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

        {/* ── Action Buttons ── */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleAddLoad}
            data-onboarding="load-submit"
            className={`flex-1 brutal-border font-extrabold uppercase tracking-wide ${
              onboardingStep === 'load-submit' ? 'onboarding-target' : ''
            }`}
            style={{ background: '#f0a500', color: '#1a1a2e', border: '2px solid #1a1a2e' }}
            disabled={
              loading ||
              !newLoad.rate ||
              !newLoad.pickupZip ||
              !newLoad.deliveryZip ||
              (hasStops && !allStopsHaveValidZip)
            }
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
