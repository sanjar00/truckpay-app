import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Download, Info, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { format, getQuarter, getYear, startOfQuarter, endOfQuarter, parseISO, isWithinInterval } from 'date-fns';

// IFTA 2025 diesel tax rates (cents per gallon) by state
const IFTA_RATES_2025: Record<string, number> = {
  AL: 0.29, AZ: 0.27, AR: 0.285, CA: 0.61, CO: 0.205, CT: 0.44,
  DE: 0.22, FL: 0.363, GA: 0.326, ID: 0.32, IL: 0.467, IN: 0.55,
  IA: 0.325, KS: 0.26, KY: 0.268, LA: 0.20, ME: 0.312, MD: 0.427,
  MA: 0.24, MI: 0.272, MN: 0.285, MS: 0.18, MO: 0.17, MT: 0.2775,
  NE: 0.348, NV: 0.27, NH: 0.222, NJ: 0.489, NM: 0.21, NY: 0.1755,
  NC: 0.385, ND: 0.23, OH: 0.47, OK: 0.19, OR: 0.38, PA: 0.741,
  RI: 0.37, SC: 0.26, SD: 0.28, TN: 0.274, TX: 0.20, UT: 0.319,
  VT: 0.308, VA: 0.262, WA: 0.494, WV: 0.357, WI: 0.309, WY: 0.24,
};

const US_STATES = Object.keys(IFTA_RATES_2025).sort();

interface StateMilesEntry { state: string; miles: number }
interface FuelPurchaseEntry { state: string; gallons: number; pricePerGallon: number; amount: number }
interface LoadData {
  id: string;
  pickupDate?: string;
  locationFrom: string;
  locationTo: string;
  statesMiles?: StateMilesEntry[];
  fuelPurchases?: FuelPurchaseEntry[];
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

const IFTAReport = ({ onBack }: IFTAReportProps) => {
  const { user } = useAuth();
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(String(getYear(today)));
  const [selectedQuarter, setSelectedQuarter] = useState(String(getQuarter(today)));
  const [loads, setLoads] = useState<LoadData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);

  // Temp state for editing a load's IFTA data
  const [editStatesMiles, setEditStatesMiles] = useState<StateMilesEntry[]>([]);
  const [editFuelPurchases, setEditFuelPurchases] = useState<FuelPurchaseEntry[]>([]);

  const quarterStart = startOfQuarter(new Date(Number(selectedYear), (Number(selectedQuarter) - 1) * 3, 1));
  const quarterEnd = endOfQuarter(quarterStart);

  useEffect(() => {
    if (!user) return;
    const fetchLoads = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('load_reports')
          .select('id, pickup_date, location_from, location_to, states_miles, fuel_purchases')
          .eq('user_id', user.id);
        if (error) throw error;
        if (data) {
          setLoads(
            data.map((l) => ({
              id: l.id,
              pickupDate: l.pickup_date,
              locationFrom: l.location_from,
              locationTo: l.location_to,
              statesMiles: l.states_miles as StateMilesEntry[] | undefined,
              fuelPurchases: l.fuel_purchases as FuelPurchaseEntry[] | undefined,
            }))
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

  // Aggregate IFTA data
  const stateAgg: Record<string, IFTARowData> = {};
  filteredLoads.forEach((load) => {
    (load.statesMiles || []).forEach(({ state, miles }) => {
      if (!stateAgg[state]) stateAgg[state] = { state, milesDriven: 0, fuelGallons: 0, taxRate: IFTA_RATES_2025[state] || 0, taxDue: 0 };
      stateAgg[state].milesDriven += miles;
    });
    (load.fuelPurchases || []).forEach(({ state, gallons }) => {
      if (!stateAgg[state]) stateAgg[state] = { state, milesDriven: 0, fuelGallons: 0, taxRate: IFTA_RATES_2025[state] || 0, taxDue: 0 };
      stateAgg[state].fuelGallons += gallons;
    });
  });

  // Calculate tax due per state
  const totalMiles = Object.values(stateAgg).reduce((s, r) => s + r.milesDriven, 0);
  const totalGallons = Object.values(stateAgg).reduce((s, r) => s + r.fuelGallons, 0);
  const fleetMPG = totalGallons > 0 && totalMiles > 0 ? totalMiles / totalGallons : 6; // default 6 mpg

  const rows = Object.values(stateAgg).map((row) => {
    const taxableMiles = row.milesDriven;
    const gallonsConsumed = taxableMiles / fleetMPG;
    const taxDue = (gallonsConsumed - row.fuelGallons) * row.taxRate;
    return { ...row, taxDue };
  }).sort((a, b) => a.state.localeCompare(b.state));

  const totalTaxDue = rows.reduce((s, r) => s + r.taxDue, 0);

  const startEditLoad = (load: LoadData) => {
    setEditingLoadId(load.id);
    setEditStatesMiles(load.statesMiles ? [...load.statesMiles] : [{ state: 'TX', miles: 0 }]);
    setEditFuelPurchases(load.fuelPurchases ? [...load.fuelPurchases] : []);
  };

  const saveLoadIFTA = async (loadId: string) => {
    try {
      const { error } = await supabase
        .from('load_reports')
        .update({
          states_miles: editStatesMiles as any,
          fuel_purchases: editFuelPurchases as any,
        })
        .eq('id', loadId)
        .eq('user_id', user!.id);
      if (error) throw error;
      setLoads((prev) =>
        prev.map((l) =>
          l.id === loadId
            ? { ...l, statesMiles: editStatesMiles, fuelPurchases: editFuelPurchases }
            : l
        )
      );
      setEditingLoadId(null);
    } catch (e) {
      console.error(e);
    }
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
        (r) =>
          `${r.state} | ${r.milesDriven.toLocaleString()} | ${r.fuelGallons.toFixed(1)} | $${r.taxRate.toFixed(4)} | $${r.taxDue.toFixed(2)}`
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
              IFTA requires reporting miles driven and fuel purchased per state each quarter. Add state miles &amp; fuel
              data to each load below, then export the quarterly report.
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
                    <SelectItem value="1">Q1 (JAN–MAR)</SelectItem>
                    <SelectItem value="2">Q2 (APR–JUN)</SelectItem>
                    <SelectItem value="3">Q3 (JUL–SEP)</SelectItem>
                    <SelectItem value="4">Q4 (OCT–DEC)</SelectItem>
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
                          {row.taxDue > 0 ? '+' : ''}{row.taxDue >= 0 ? '' : '-'}${Math.abs(row.taxDue).toFixed(2)}
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

        {/* Load-by-load IFTA data entry */}
        {filteredLoads.length > 0 && (
          <Card className="brutal-border brutal-shadow bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="brutal-text text-lg font-bold">LOAD DATA — ADD STATE MILES & FUEL</CardTitle>
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
                      className="brutal-border brutal-hover text-xs"
                      onClick={() => editingLoadId === load.id ? setEditingLoadId(null) : startEditLoad(load)}
                    >
                      {editingLoadId === load.id ? 'CANCEL' : 'EDIT'}
                    </Button>
                  </div>

                  {editingLoadId === load.id ? (
                    <div className="space-y-3 mt-3">
                      {/* State Miles */}
                      <div>
                        <p className="brutal-mono text-xs font-bold mb-1">STATE MILES</p>
                        {editStatesMiles.map((sm, idx) => (
                          <div key={idx} className="flex gap-2 mb-1">
                            <Select value={sm.state} onValueChange={(v) => setEditStatesMiles(prev => prev.map((x, i) => i === idx ? { ...x, state: v } : x))}>
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
                              onChange={(e) => setEditStatesMiles(prev => prev.map((x, i) => i === idx ? { ...x, miles: Number(e.target.value) } : x))}
                              className="brutal-border h-8 text-xs w-24"
                            />
                            <Button size="sm" variant="ghost" onClick={() => setEditStatesMiles(prev => prev.filter((_, i) => i !== idx))} className="h-8 px-2">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" className="brutal-border text-xs h-7" onClick={() => setEditStatesMiles(prev => [...prev, { state: 'TX', miles: 0 }])}>
                          <Plus className="w-3 h-3 mr-1" /> ADD STATE
                        </Button>
                      </div>

                      {/* Fuel Purchases */}
                      <div>
                        <p className="brutal-mono text-xs font-bold mb-1">FUEL PURCHASES</p>
                        {editFuelPurchases.map((fp, idx) => (
                          <div key={idx} className="flex gap-2 mb-1 flex-wrap">
                            <Select value={fp.state} onValueChange={(v) => setEditFuelPurchases(prev => prev.map((x, i) => i === idx ? { ...x, state: v } : x))}>
                              <SelectTrigger className="brutal-border w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input type="number" placeholder="gallons" value={fp.gallons || ''} onChange={(e) => setEditFuelPurchases(prev => prev.map((x, i) => i === idx ? { ...x, gallons: Number(e.target.value) } : x))} className="brutal-border h-8 text-xs w-20" />
                            <Input type="number" placeholder="$/gal" step="0.01" value={fp.pricePerGallon || ''} onChange={(e) => setEditFuelPurchases(prev => prev.map((x, i) => i === idx ? { ...x, pricePerGallon: Number(e.target.value), amount: Number(e.target.value) * fp.gallons } : x))} className="brutal-border h-8 text-xs w-20" />
                            <Button size="sm" variant="ghost" onClick={() => setEditFuelPurchases(prev => prev.filter((_, i) => i !== idx))} className="h-8 px-2">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" className="brutal-border text-xs h-7" onClick={() => setEditFuelPurchases(prev => [...prev, { state: 'TX', gallons: 0, pricePerGallon: 0, amount: 0 }])}>
                          <Plus className="w-3 h-3 mr-1" /> ADD FUEL
                        </Button>
                      </div>

                      <Button size="sm" className="brutal-border bg-primary text-primary-foreground brutal-hover text-xs" onClick={() => saveLoadIFTA(load.id)}>
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
          <Button onClick={handleExport} className="w-full brutal-border bg-secondary text-secondary-foreground brutal-shadow brutal-hover brutal-text">
            <Download className="w-4 h-4 mr-2" />
            EXPORT IFTA REPORT
          </Button>
        )}

        <Card className="brutal-border bg-muted/30">
          <CardContent className="p-4">
            <p className="brutal-mono text-xs text-muted-foreground">
              ⚠️ This is an estimate using 2025 diesel rates. Rates change quarterly. Verify with official IFTA rates
              before filing. Consult a licensed tax professional or accountant for final filing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IFTAReport;
