
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Trash2, Edit, Save, X, MoreHorizontal, ChevronDown, ChevronUp, Loader2, DollarSign, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { calculateDriverPay } from '@/lib/loadReportsUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useZipLookup } from '@/hooks/useZipLookup';
import { LoadStop } from '@/types/LoadReports';

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
  stopCount?: number;
  totalStopOffFees?: number;
  stops?: LoadStop[];
}

interface LoadCardProps {
  load: Load;
  onDelete: (id: string) => void;
  onEdit?: () => void;
  estimatedMiles?: number;
  userProfile?: any;
}

const LoadCard = ({ load, onDelete, onEdit, estimatedMiles, userProfile }: LoadCardProps) => {
  const isCompanyDriver = userProfile?.driverType === 'company-driver';
  // Use load's own estimatedMiles if available, fall back to prop
  const milesForGrade = load.estimatedMiles || estimatedMiles;
  // Grade is always based on gross rate per mile (load value, not driver cut)
  const grade = milesForGrade ? getProfitabilityGrade(load.rate, milesForGrade) : null;

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [stopsExpanded, setStopsExpanded] = useState(false);

  const hasIntermediateStops = (load.stops?.length ?? 0) > 0;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      return format(new Date(year, month - 1, day), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };


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
                {hasIntermediateStops ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setStopsExpanded(s => !s)}
                      className="text-[11px] text-blue-600 my-0.5 brutal-mono font-semibold hover:underline flex items-center gap-1"
                    >
                      ↓ {load.stops!.length} intermediate stop{load.stops!.length === 1 ? '' : 's'}
                      {stopsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {stopsExpanded && (
                      <div className="my-1 ml-1 pl-2 border-l-2 border-gray-200 space-y-1">
                        {load.stops!.map((s) => (
                          <div key={s.id || s.sequence} className="flex items-start gap-1.5">
                            <Circle className="w-2.5 h-2.5 text-gray-400 mt-1 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs leading-tight">
                                <span className="brutal-mono text-[10px] font-bold text-gray-500 mr-1">
                                  {s.stopType === 'pickup' ? 'P/U' : 'DEL'}
                                </span>
                                {s.zip ? `${s.zip}${s.cityState ? ` · ${s.cityState}` : ''}` : (s.cityState || '—')}
                              </p>
                              {(!!s.stopOffFee || !!s.detentionAmount) && (
                                <p className="text-[10px] text-muted-foreground">
                                  {s.stopOffFee ? `+$${formatCurrency(s.stopOffFee)} stop-off` : ''}
                                  {s.stopOffFee && s.detentionAmount ? ' · ' : ''}
                                  {s.detentionAmount ? `+$${formatCurrency(s.detentionAmount)} detention` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-400 my-0.5">↓</p>
                )}
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
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={onEdit} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
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
                  {onEdit && (
                    <button
                      onClick={() => { onEdit(); setShowMobileMenu(false); }}
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
