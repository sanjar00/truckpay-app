import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, Download, Info, Plus, Trash2, MapPin, Camera, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, getQuarter, getYear, startOfQuarter, endOfQuarter, parseISO, isWithinInterval } from 'date-fns';

// Hardcoded 2025 rates kept as fallback if the DB table is unavailable
const IFTA_RATES_FALLBACK: Record<string, number> = {
  AL: 0.29, AZ: 0.27, AR: 0.285, CA: 0.61, CO: 0.205, CT: 0.44,
  DE: 0.22, FL: 0.363, GA: 0.326, ID: 0.32, IL: 0.467, IN: 0.55,
  IA: 0.325, KS: 0.26, KY: 0.268, LA: 0.20, ME: 0.312, MD: 0.427,
  MA: 0.24, MI: 0.272, MN: 0.285, MS: 0.18, MO: 0.17, MT: 0.2775,
  NE: 0.348, NV: 0.27, NH: 0.222, NJ: 0.489, NM: 0.21, NY: 0.1755,
  NC: 0.385, ND: 0.23, OH: 0.47, OK: 0.19, OR: 0.38, PA: 0.741,
  RI: 0.37, SC: 0.26, SD: 0.28, TN: 0.274, TX: 0.20, UT: 0.319,
  VT: 0.308, VA: 0.262, WA: 0.494, WV: 0.357, WI: 0.309, WY: 0.24,
};

const US_STATES = Object.keys(IFTA_RATES_FALLBACK).sort();

interface StateMilesEntry { state: string; miles: number }
interface FuelPurchaseEntry { state: string; gallons: number; pricePerGallon: number; amount: number }
interface ScannedFuelData {
  state: string;
  gallons: number;
  pricePerGallon: number;
  amount: number;
  date: string | null;
}

interface LoadStopLite {
  sequence: number;
  stopType: 'pickup' | 'delivery';
  zip?: string;
  cityState?: string;
}

interface LoadData {
  id: string;
  pickupDate?: string;
  locationFrom: string;
  locationTo: string;
  pickupZip?: string;
  deliveryZip?: string;
  pickupCityState?: string;
  deliveryCityState?: string;
  estimatedMiles?: number;
  statesMiles?: StateMilesEntry[];
  fuelPurchases?: FuelPurchaseEntry[];
  // Intermediate stops (sequence 2..N-1). Empty/undefined for single-stop loads.
  stops?: LoadStopLite[];
}

interface IFTARowData {
  state: string;
  milesDriven: number;
  fuelGallons: number;
  taxRate: number;
  taxDue: number;
}

interface IFTAReportProps {
  onBack: () => void;
}

// Extract 2-letter state abbreviation from "City, ST" format
function extractState(cityState?: string): string | null {
  if (!cityState) return null;
  const match = cityState.match(/,\s*([A-Z]{2})$/);
  return match ? match[1] : null;
}

// Compress image: resize to maxPx on longest side, JPEG at given quality
async function compressImage(file: File, maxPx: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx; }
        else { width = Math.round((width * maxPx) / height); height = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const IFTAReport = ({ onBack }: IFTAReportProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const today = new Date();

  const [selectedYear, setSelectedYear] = useState(String(getYear(today)));
  const [selectedQuarter, setSelectedQuarter] = useState(String(getQuarter(today)));
  const [loads, setLoads] = useState<LoadData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [editStatesMiles, setEditStatesMiles] = useState<StateMilesEntry[]>([]);
  const [editFuelPurchases, setEditFuelPurchases] = useState<FuelPurchaseEntry[]>([]);

  // Option B: live rates from DB, fall back to hardcoded
  const [iftaRates, setIftaRates] = useState<Record<string, number>>(IFTA_RATES_FALLBACK);

  // Enhancement A: auto-calculating state miles
  const [calculatingMiles, setCalculatingMiles] = useState(false);

  // Enhancement C: fuel receipt scanner
  const fuelScanInputRef = useRef<HTMLInputElement>(null);
  const [scanningFuel, setScanningFuel] = useState(false);
  const [scannedFuelData, setScannedFuelData] = useState<ScannedFuelData | null>(null);

  const quarterStart = startOfQuarter(new Date(Number(selectedYear), (Number(selectedQuarter) - 1) * 3, 1));
  const quarterEnd = endOfQuarter(quarterStart);

  // Option B: fetch rates from ifta_rates table whenever quarter/year changes
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data } = await supabase
          .from('ifta_rates')
          .select('state, rate')
          .eq('year', Number(selectedYear))
          .eq('quarter', Number(selectedQuarter));
        if (data && data.length > 0) {
          const rateMap: Record<string, number> = {};
          data.forEach(({ state, rate }: { state: string; rate: number }) => {
            rateMap[state] = Number(rate);
          });
          setIftaRates(rateMap);
        } else {
          setIftaRates(IFTA_RATES_FALLBACK);
        }
      } catch {
        setIftaRates(IFTA_RATES_FALLBACK);
      }
    };
    fetchRates();
  }, [selectedYear, selectedQuarter]);

  // Fetch loads
  useEffect(() => {
    if (!user) return;
    const fetchLoads = async () => {
      setLoading(true);
      try {
        // Also fetch load_stops (intermediate stops) so auto-calculate can
        // build the correct multi-stop route when a load has them.
        const { data, error } = await supabase
          .from('load_reports')
          .select('id, pickup_date, location_from, location_to, pickup_zip, delivery_zip, pickup_city_state, delivery_city_state, estimated_miles, states_miles, fuel_purchases, load_stops(sequence, stop_type, zip, city_state)')
          .eq('user_id', user.id);
        if (error) throw error;
        if (data) {
          setLoads(
            data.map((l: any) => {
              const rawStops = Array.isArray(l.load_stops) ? l.load_stops : [];
              const stops: LoadStopLite[] = rawStops
                .map((s: any) => ({
                  sequence: s.sequence,
                  stopType: s.stop_type,
                  zip: s.zip ?? undefined,
                  cityState: s.city_state ?? undefined,
                }))
                .sort((a: LoadStopLite, b: LoadStopLite) => a.sequence - b.sequence);
              return {
                id: l.id,
                pickupDate: l.pickup_date,
                locationFrom: l.location_from,
                locationTo: l.location_to,
                pickupZip: l.pickup_zip,
                deliveryZip: l.delivery_zip,
                pickupCityState: l.pickup_city_state,
                deliveryCityState: l.delivery_city_state,
                estimatedMiles: l.estimated_miles,
                statesMiles: l.states_miles as StateMilesEntry[] | undefined,
                fuelPurchases: l.fuel_purchases as FuelPurchaseEntry[] | undefined,
                stops: stops.length > 0 ? stops : undefined,
              };
            })
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLoads();
  }, [user]);

  const filteredLoads = loads.filter((l) => {
    if (!l.pickupDate) return false;
    const d = parseISO(l.pickupDate);
    return isWithinInterval(d, { start: quarterStart, end: quarterEnd });
  });

  // Aggregate IFTA data across all filtered loads
  const stateAgg: Record<string, IFTARowData> = {};
  filteredLoads.forEach((load) => {
    (load.statesMiles || []).forEach(({ state, miles }) => {
      if (!stateAgg[state]) stateAgg[state] = { state, milesDriven: 0, fuelGallons: 0, taxRate: iftaRates[state] || 0, taxDue: 0 };
      stateAgg[state].milesDriven += miles;
    });
    (load.fuelPurchases || []).forEach(({ state, gallons }) => {
      if (!stateAgg[state]) stateAgg[state] = { state, milesDriven: 0, fuelGallons: 0, taxRate: iftaRates[state] || 0, taxDue: 0 };
      stateAgg[state].fuelGallons += gallons;
    });
  });

  const totalMiles = Object.values(stateAgg).reduce((s, r) => s + r.milesDriven, 0);
  const totalGallons = Object.values(stateAgg).reduce((s, r) => s + r.fuelGallons, 0);
  const fleetMPG = totalGallons > 0 && totalMiles > 0 ? totalMiles / totalGallons : 6;

  const rows = Object.values(stateAgg).map((row) => {
    const gallonsConsumed = row.milesDriven / fleetMPG;
    const taxDue = (gallonsConsumed - row.fuelGallons) * row.taxRate;
    return { ...row, taxDue };
  }).sort((a, b) => a.state.localeCompare(b.state));

  const totalTaxDue = rows.reduce((s, r) => s + r.taxDue, 0);

  // Enhancement D: pre-fill state miles from pickup/delivery city_state when no data yet
  const startEditLoad = (load: LoadData) => {
    setEditingLoadId(load.id);
    setScannedFuelData(null);

    if (load.statesMiles && load.statesMiles.length > 0) {
      setEditStatesMiles([...load.statesMiles]);
    } else {
      const pickupState = extractState(load.pickupCityState);
      const deliveryState = extractState(load.deliveryCityState);
      const totalMilesForLoad = load.estimatedMiles || 0;

      if (pickupState && deliveryState && pickupState !== deliveryState) {
        // Pre-fill origin and destination states with 0 miles.
        // Mileage intentionally left at 0 — use Auto-calculate or enter manually.
        // A 50/50 split would be wrong for multi-state routes (e.g. IL→MO→AR→TX).
        setEditStatesMiles([
          { state: pickupState, miles: 0 },
          { state: deliveryState, miles: 0 },
        ]);
      } else if (pickupState) {
        // Same-state load — full estimated miles go to that state
        setEditStatesMiles([{ state: pickupState, miles: totalMilesForLoad }]);
      } else {
        setEditStatesMiles([{ state: 'TX', miles: 0 }]);
      }
    }

    setEditFuelPurchases(load.fuelPurchases ? [...load.fuelPurchases] : []);
  };

  const cancelEdit = () => {
    setEditingLoadId(null);
    setScannedFuelData(null);
  };

  const saveLoadIFTA = async (loadId: string) => {
    try {
      const { error } = await supabase
        .from('load_reports')
        .update({ states_miles: editStatesMiles as any, fuel_purchases: editFuelPurchases as any })
        .eq('id', loadId)
        .eq('user_id', user!.id);
      if (error) throw error;
      setLoads((prev) =>
        prev.map((l) =>
          l.id === loadId ? { ...l, statesMiles: editStatesMiles, fuelPurchases: editFuelPurchases } : l
        )
      );
      setEditingLoadId(null);
      setScannedFuelData(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Enhancement A: call the calculate-ifta-miles edge function.
  // If the load has intermediate stops, send them all as an ordered list so the
  // edge function routes through every waypoint; otherwise use the legacy
  // single-pair shape. Either path returns the same { stateMiles } result.
  const calculateStateMiles = async (load: LoadData) => {
    if (!load.pickupZip || !load.deliveryZip) return;
    setCalculatingMiles(true);
    try {
      const hasIntermediate = (load.stops?.length ?? 0) > 0;
      const body = hasIntermediate
        ? {
            stops: [
              load.pickupZip,
              ...load.stops!.map((s) => s.zip).filter((z): z is string => !!z),
              load.deliveryZip,
            ],
          }
        : { pickupZip: load.pickupZip, deliveryZip: load.deliveryZip };

      const { data, error } = await supabase.functions.invoke('calculate-ifta-miles', {
        body,
      });
      if (error) throw new Error(error.message || String(error));
      // Edge function returns { error } with HTTP 200 when a Google API call fails
      if (data?.error) throw new Error(data.error + (data.detail ? ` — ${data.detail}` : ''));
      if (data?.stateMiles?.length) {
        setEditStatesMiles(data.stateMiles);
        toast({ title: `${data.stateMiles.length} states calculated`, description: data.stateMiles.map((s: any) => `${s.state}: ${s.miles}mi`).join(' · ') });
      } else {
        toast({ title: 'No route data returned', description: 'Could not determine state miles for this route.', variant: 'destructive' });
      }
    } catch (e: any) {
      console.error('calculate-ifta-miles error:', e);
      toast({ title: 'Auto-calculate failed', description: e?.message || 'Unknown error. Check Supabase edge function logs.', variant: 'destructive' });
    } finally {
      setCalculatingMiles(false);
    }
  };

  // Enhancement C: scan a fuel receipt image
  const handleFuelScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setScanningFuel(true);
    setScannedFuelData(null);
    try {
      const dataUrl = await compressImage(file, 1024, 0.8);
      const base64 = dataUrl.split(',')[1];
      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: { imageBase64: base64, mode: 'fuel' },
      });
      if (error) throw error;
      setScannedFuelData({
        state: data.state || 'TX',
        gallons: data.gallons || 0,
        pricePerGallon: data.pricePerGallon || 0,
        amount: data.amount || 0,
        date: data.date || null,
      });
    } catch (e) {
      console.error('fuel scan error:', e);
    } finally {
      setScanningFuel(false);
    }
  };

  const confirmScannedFuel = () => {
    if (!scannedFuelData) return;
    setEditFuelPurchases((prev) => [
      ...prev,
      {
        state: scannedFuelData.state,
        gallons: scannedFuelData.gallons,
        pricePerGallon: scannedFuelData.pricePerGallon,
        amount: scannedFuelData.amount,
      },
    ]);
    setScannedFuelData(null);
  };

  const handleExport = () => {
    const lines = [
      'IFTA QUARTERLY REPORT - TRUCKPAY',
      `Quarter: Q${selectedQuarter} ${selectedYear}`,
      `Period: ${format(quarterStart, 'MMM dd, yyyy')} - ${format(quarterEnd, 'MMM dd, yyyy')}`,
      `Generated: ${format(new Date(), 'MMM dd, yyyy')}`,
      '',
      'State | Miles Driven | Fuel Purchased (gal) | Tax Rate | Tax Due/Credit',
      ...rows.map(
        (r) => `${r.state} | ${r.milesDriven.toLocaleString()} | ${r.fuelGallons.toFixed(1)} | $${r.taxRate.toFixed(4)} | $${r.taxDue.toFixed(2)}`
      ),
      '',
      `TOTAL TAX ${totalTaxDue >= 0 ? 'DUE' : 'CREDIT'}: $${Math.abs(totalTaxDue).toFixed(2)}`,
      '',
      'DISCLAIMER: This is an estimate. Verify with official IFTA rates before filing.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ifta-q${selectedQuarter}-${selectedYear}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 4 }, (_, i) => String(getYear(today) - i));

  return (
    <div className="min-h-screen bg-background brutal-grid p-3 sm:p-6">
      {/* Hidden file input for fuel receipt scanner */}
      <input
        ref={fuelScanInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFuelScanFile}
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="brutal-border brutal-shadow brutal-hover">
            <ArrowLeft className="mobile-icon" />
          </Button>
          <div>
            <h1 className="brutal-text text-2xl sm:text-3xl font-bold">IFTA FUEL TAX REPORT</h1>
            <p className="brutal-mono text-sm text-muted-foreground">If you drive across state lines, you're required to file this tax report every 3 months.</p>
          </div>
        </div>

        {/* Info */}
        <Card className="brutal-border brutal-shadow bg-accent/10">
          <CardContent className="p-4 flex gap-3">
            <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <p className="brutal-mono text-xs">
              IFTA requires reporting miles driven and fuel purchased per state each quarter.
              Use <strong>Auto-calculate</strong> to fill in state miles automatically from your load's route,
              or tap <strong>Edit</strong> to enter them manually. Add fuel receipts by tapping
              <strong> Scan Receipt</strong> or entering gallons manually.
            </p>
          </CardContent>
        </Card>

        {/* Quarter Selector */}
        <Card className="brutal-border brutal-shadow bg-background">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="brutal-mono text-xs text-muted-foreground mb-2 block">QUARTER</label>
                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                  <SelectTrigger className="brutal-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (Jan–Mar)</SelectItem>
                    <SelectItem value="2">Q2 (Apr–Jun)</SelectItem>
                    <SelectItem value="3">Q3 (Jul–Sep)</SelectItem>
                    <SelectItem value="4">Q4 (Oct–Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="brutal-mono text-xs text-muted-foreground mb-2 block">YEAR</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="brutal-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="brutal-mono text-xs text-muted-foreground mt-3">
              {format(quarterStart, 'MMM dd, yyyy')} — {format(quarterEnd, 'MMM dd, yyyy')} · {filteredLoads.length} loads
            </p>
          </CardContent>
        </Card>

        {/* IFTA Summary Table */}
        {rows.length > 0 && (
          <Card className="brutal-border brutal-shadow bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="brutal-text text-lg font-bold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                TAX SUMMARY BY STATE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full brutal-mono text-xs">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="p-2 text-left">STATE</th>
                      <th className="p-2 text-right">MILES</th>
                      <th className="p-2 text-right">FUEL (gal)</th>
                      <th className="p-2 text-right">RATE</th>
                      <th className="p-2 text-right">TAX DUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.state} className={`brutal-border-b ${row.taxDue > 0 ? 'bg-destructive/5' : 'bg-success/5'}`}>
                        <td className="p-2 font-bold">{row.state}</td>
                        <td className="p-2 text-right">{row.milesDriven.toLocaleString()}</td>
                        <td className="p-2 text-right">{row.fuelGallons.toFixed(1)}</td>
                        <td className="p-2 text-right">${row.taxRate.toFixed(4)}</td>
                        <td className={`p-2 text-right font-bold ${row.taxDue > 0 ? 'text-destructive' : 'text-green-700'}`}>
                          {row.taxDue > 0 ? '+' : ''}{row.taxDue < 0 ? '-' : ''}${Math.abs(row.taxDue).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-primary text-primary-foreground font-bold">
                      <td className="p-2" colSpan={4}>TOTAL</td>
                      <td className={`p-2 text-right text-lg ${totalTaxDue > 0 ? 'text-red-200' : 'text-green-200'}`}>
                        {totalTaxDue > 0 ? 'DUE: ' : 'CREDIT: '}${Math.abs(totalTaxDue).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Load-by-load data entry */}
        {filteredLoads.length > 0 && (
          <Card className="brutal-border brutal-shadow bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="brutal-text text-lg font-bold">LOAD DATA — STATE MILES & FUEL</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredLoads.map((load) => (
                <div key={load.id} className="brutal-border p-3 bg-muted/20">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <p className="brutal-text text-sm font-bold">{load.locationFrom} → {load.locationTo}</p>
                      <p className="brutal-mono text-xs text-muted-foreground">{load.pickupDate}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="brutal-border brutal-hover text-xs flex-shrink-0"
                      onClick={() => editingLoadId === load.id ? cancelEdit() : startEditLoad(load)}
                    >
                      {editingLoadId === load.id ? 'CANCEL' : 'EDIT'}
                    </Button>
                  </div>

                  {editingLoadId === load.id ? (
                    <div className="space-y-4 mt-3">

                      {/* State Miles */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="brutal-mono text-xs font-bold">STATE MILES</p>
                          {/* Enhancement A: auto-calculate button — only if load has ZIPs */}
                          {load.pickupZip && load.deliveryZip && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="brutal-border text-xs h-7 gap-1"
                              onClick={() => calculateStateMiles(load)}
                              disabled={calculatingMiles}
                            >
                              {calculatingMiles
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <MapPin className="w-3 h-3" />}
                              {calculatingMiles ? 'Calculating...' : 'Auto-calculate'}
                            </Button>
                          )}
                        </div>

                        {editStatesMiles.map((sm, idx) => (
                          <div key={idx} className="flex gap-2 mb-1">
                            <Select
                              value={sm.state}
                              onValueChange={(v) => setEditStatesMiles((prev) => prev.map((x, i) => i === idx ? { ...x, state: v } : x))}
                            >
                              <SelectTrigger className="brutal-border w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              placeholder="miles"
                              value={sm.miles || ''}
                              onChange={(e) => setEditStatesMiles((prev) => prev.map((x, i) => i === idx ? { ...x, miles: Number(e.target.value) } : x))}
                              className="brutal-border h-8 text-xs w-24"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditStatesMiles((prev) => prev.filter((_, i) => i !== idx))}
                              className="h-8 px-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}

                        <Button
                          size="sm"
                          variant="outline"
                          className="brutal-border text-xs h-7"
                          onClick={() => setEditStatesMiles((prev) => [...prev, { state: 'TX', miles: 0 }])}
                        >
                          <Plus className="w-3 h-3 mr-1" /> ADD STATE
                        </Button>
                      </div>

                      {/* Fuel Purchases */}
                      <div>
                        <p className="brutal-mono text-xs font-bold mb-2">FUEL PURCHASES</p>

                        {editFuelPurchases.map((fp, idx) => (
                          <div key={idx} className="flex gap-2 mb-1 flex-wrap">
                            <Select
                              value={fp.state}
                              onValueChange={(v) => setEditFuelPurchases((prev) => prev.map((x, i) => i === idx ? { ...x, state: v } : x))}
                            >
                              <SelectTrigger className="brutal-border w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              placeholder="gallons"
                              value={fp.gallons || ''}
                              onChange={(e) => setEditFuelPurchases((prev) => prev.map((x, i) => i === idx ? { ...x, gallons: Number(e.target.value) } : x))}
                              className="brutal-border h-8 text-xs w-20"
                            />
                            <Input
                              type="number"
                              placeholder="$/gal"
                              step="0.01"
                              value={fp.pricePerGallon || ''}
                              onChange={(e) => setEditFuelPurchases((prev) => prev.map((x, i) => i === idx ? { ...x, pricePerGallon: Number(e.target.value), amount: Number(e.target.value) * fp.gallons } : x))}
                              className="brutal-border h-8 text-xs w-20"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditFuelPurchases((prev) => prev.filter((_, i) => i !== idx))}
                              className="h-8 px-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="brutal-border text-xs h-7"
                            onClick={() => setEditFuelPurchases((prev) => [...prev, { state: 'TX', gallons: 0, pricePerGallon: 0, amount: 0 }])}
                          >
                            <Plus className="w-3 h-3 mr-1" /> ADD FUEL
                          </Button>

                          {/* Enhancement C: scan fuel receipt */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="brutal-border text-xs h-7 gap-1"
                            onClick={() => fuelScanInputRef.current?.click()}
                            disabled={scanningFuel}
                          >
                            {scanningFuel
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Camera className="w-3 h-3" />}
                            {scanningFuel ? 'Scanning...' : 'Scan Receipt'}
                          </Button>
                        </div>

                        {/* Scanned fuel data confirmation card */}
                        {scannedFuelData && (
                          <div className="mt-3 p-3 bg-accent/10 brutal-border rounded space-y-2">
                            <p className="brutal-mono text-xs font-bold">RECEIPT SCANNED — REVIEW & CONFIRM</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 brutal-mono text-xs items-center">
                              <span className="text-muted-foreground">State</span>
                              <Select
                                value={scannedFuelData.state}
                                onValueChange={(v) => setScannedFuelData((prev) => prev ? { ...prev, state: v } : prev)}
                              >
                                <SelectTrigger className="brutal-border h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>

                              <span className="text-muted-foreground">Gallons</span>
                              <Input
                                type="number"
                                value={scannedFuelData.gallons || ''}
                                onChange={(e) => setScannedFuelData((prev) => prev ? { ...prev, gallons: Number(e.target.value) } : prev)}
                                className="brutal-border h-7 text-xs"
                              />

                              <span className="text-muted-foreground">Price / gal</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={scannedFuelData.pricePerGallon || ''}
                                onChange={(e) => setScannedFuelData((prev) => prev ? { ...prev, pricePerGallon: Number(e.target.value) } : prev)}
                                className="brutal-border h-7 text-xs"
                              />

                              <span className="text-muted-foreground">Total paid</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={scannedFuelData.amount || ''}
                                onChange={(e) => setScannedFuelData((prev) => prev ? { ...prev, amount: Number(e.target.value) } : prev)}
                                className="brutal-border h-7 text-xs"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                className="brutal-border bg-primary text-primary-foreground brutal-hover text-xs h-7 gap-1"
                                onClick={confirmScannedFuel}
                              >
                                <Check className="w-3 h-3" /> Add to Load
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 gap-1"
                                onClick={() => setScannedFuelData(null)}
                              >
                                <X className="w-3 h-3" /> Discard
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="brutal-border bg-primary text-primary-foreground brutal-hover text-xs"
                        onClick={() => saveLoadIFTA(load.id)}
                      >
                        SAVE
                      </Button>
                    </div>
                  ) : (
                    <div className="brutal-mono text-xs text-muted-foreground">
                      {load.statesMiles && load.statesMiles.length > 0
                        ? load.statesMiles.map((sm) => `${sm.state}: ${sm.miles}mi`).join(' · ')
                        : 'No state miles entered'}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {filteredLoads.length === 0 && !loading && (
          <Card className="brutal-border brutal-shadow bg-muted/20">
            <CardContent className="p-8 text-center">
              <p className="brutal-text text-xl text-muted-foreground">NO LOADS IN Q{selectedQuarter} {selectedYear}</p>
            </CardContent>
          </Card>
        )}

        {rows.length > 0 && (
          <Button
            onClick={handleExport}
            className="w-full brutal-border bg-secondary text-secondary-foreground brutal-shadow brutal-hover brutal-text"
          >
            <Download className="w-4 h-4 mr-2" />
            EXPORT IFTA REPORT
          </Button>
        )}

        <Card className="brutal-border bg-muted/30">
          <CardContent className="p-4">
            <p className="brutal-mono text-xs text-muted-foreground">
              ⚠️ This is an estimate using {selectedYear} Q{selectedQuarter} diesel rates. Rates change quarterly.
              Verify with official IFTA rates before filing. Consult a licensed tax professional for final filing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IFTAReport;
