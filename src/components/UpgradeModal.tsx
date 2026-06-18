
import { useState } from 'react';
import { X, Star, Zap, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSubscription, BillingCycle, SubscriptionTier } from '@/hooks/useSubscription';

interface UpgradeModalProps {
  featureName: string;
  requiredTier: 'pro' | 'owner';
  onClose: () => void;
  onSuccess?: (tier: SubscriptionTier, isTrial: boolean) => void;
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  ifta: 'IFTA Fuel Tax Reports',
  perdiem: 'Per Diem Tax Calculator',
  ytd: 'Year-to-Date Dashboard',
  fullHistory: 'Full Load History',
  export: 'CSV/PDF Export',
  receipts: 'AI Receipt Scanner',
  forecast: 'Weekly Pay Forecast',
  dispatcher: 'Dispatcher Contact Book',
  laneAnalytics: 'Lane Performance Analytics',
  annualGoal: 'Annual Income Goal Tracking',
  multiTruck: 'Multi-Truck Management',
};

// Bi-weekly = charged every 2 weeks. Annual is billed once a year and works out
// to two months free versus paying bi-weekly all year.
const PRICES = {
  pro:   { biweekly: '$15', annual: '$300' },
  owner: { biweekly: '$30', annual: '$600' },
};

const UpgradeModal = ({ featureName, requiredTier, onClose }: UpgradeModalProps) => {
  const { upgradeTo, isInFreePeriod, freeAccessEndDate } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const featureLabel = FEATURE_DESCRIPTIONS[featureName] || featureName;

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setLoadingTier(tier);
    await upgradeTo(tier, billingCycle);
    setLoadingTier(null);
  };

  const cycleSuffix = billingCycle === 'biweekly' ? '/2 wks' : '/yr';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3">
      <div
        className="w-full max-w-lg brutal-border bg-background brutal-shadow-xl"
        style={{ maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground flex items-center justify-between" style={{ padding: '10px 16px' }}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="brutal-text text-base">UPGRADE REQUIRED</span>
          </div>
          <button onClick={onClose} className="hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ padding: '16px 20px 12px' }}>
          {/* Feature name block */}
          <div className="text-center" style={{ marginBottom: '12px' }}>
            <p className="brutal-mono text-xs text-muted-foreground" style={{ marginBottom: '2px' }}>TO ACCESS</p>
            <p className="brutal-text text-xl font-bold text-accent" style={{ lineHeight: 1.2 }}>{featureLabel}</p>
            <p className="brutal-mono text-xs text-muted-foreground" style={{ marginTop: '2px' }}>
              requires {requiredTier === 'owner' ? 'Owner-Operator' : 'Pro'} plan
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div className="flex items-center justify-start" style={{ marginBottom: '12px' }}>
            <div className="brutal-border inline-flex rounded overflow-hidden">
              <button
                className={`px-4 py-1.5 brutal-mono text-xs font-bold transition-colors ${billingCycle === 'annual' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'}`}
                onClick={() => setBillingCycle('annual')}
              >
                ANNUAL
              </button>
              <button
                className={`px-4 py-1.5 brutal-mono text-xs font-bold transition-colors ${billingCycle === 'biweekly' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'}`}
                onClick={() => setBillingCycle('biweekly')}
              >
                BI-WEEKLY
              </button>
            </div>
            {billingCycle === 'annual' && (
              <span className="ml-2 brutal-mono text-xs text-green-600 font-bold">2 MONTHS FREE</span>
            )}
          </div>

          {/* Tier Cards — always 2-column */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', alignItems: 'stretch' }}>
            {/* Pro */}
            <Card className={`brutal-border brutal-shadow ${requiredTier === 'pro' ? 'border-accent bg-accent/10' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
              <CardContent style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className="flex items-center gap-1" style={{ marginBottom: '4px' }}>
                  <Zap className="w-3.5 h-3.5 text-accent" />
                  <p className="brutal-text text-base font-bold">PRO</p>
                </div>
                <p className="brutal-text text-xl font-bold" style={{ lineHeight: 1.1 }}>
                  {billingCycle === 'annual' ? PRICES.pro.annual : PRICES.pro.biweekly}
                  <span className="brutal-mono font-normal" style={{ fontSize: '11px' }}>{cycleSuffix}</span>
                </p>
                {billingCycle === 'annual' && (
                  <p className="brutal-mono text-green-600 font-bold" style={{ fontSize: '10px', marginBottom: '6px' }}>
                    2 months free
                  </p>
                )}
                <ul className="brutal-mono text-muted-foreground" style={{ fontSize: '12px', lineHeight: 1.5, marginTop: '6px', listStyle: 'none', padding: 0, flex: 1 }}>
                  <li>✓ Full load history</li>
                  <li>✓ IFTA reports</li>
                  <li>✓ Per Diem tracker</li>
                  <li>✓ AI receipt scanner</li>
                </ul>
                <Button
                  className="w-full brutal-border bg-accent hover:bg-accent text-accent-foreground brutal-hover brutal-text"
                  style={{ fontSize: '12px', height: '36px', marginTop: '10px' }}
                  disabled={loadingTier !== null}
                  onClick={() => handleUpgrade('pro')}
                >
                  {loadingTier === 'pro' ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />REDIRECTING...</>
                  ) : 'CHOOSE PRO'}
                </Button>
              </CardContent>
            </Card>

            {/* Owner-Op */}
            <Card className={`brutal-border brutal-shadow ${requiredTier === 'owner' ? 'border-accent bg-accent/10' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
              <CardContent style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className="flex items-center gap-1" style={{ marginBottom: '4px' }}>
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  <p className="brutal-text text-base font-bold">OWNER-OP</p>
                </div>
                <p className="brutal-text text-xl font-bold" style={{ lineHeight: 1.1 }}>
                  {billingCycle === 'annual' ? PRICES.owner.annual : PRICES.owner.biweekly}
                  <span className="brutal-mono font-normal" style={{ fontSize: '11px' }}>{cycleSuffix}</span>
                </p>
                {billingCycle === 'annual' && (
                  <p className="brutal-mono text-green-600 font-bold" style={{ fontSize: '10px', marginBottom: '6px' }}>
                    2 months free
                  </p>
                )}
                <ul className="brutal-mono text-muted-foreground" style={{ fontSize: '12px', lineHeight: 1.5, marginTop: '6px', listStyle: 'none', padding: 0, flex: 1 }}>
                  <li>✓ Everything in Pro</li>
                  <li>✓ Dispatcher book</li>
                  <li>✓ Lane analytics</li>
                  <li>✓ Annual goal tracking</li>
                </ul>
                <Button
                  className="w-full brutal-border bg-primary hover:bg-primary text-primary-foreground brutal-hover brutal-text"
                  style={{ fontSize: '12px', height: '36px', marginTop: '10px' }}
                  disabled={loadingTier !== null}
                  onClick={() => handleUpgrade('owner')}
                >
                  {loadingTier === 'owner' ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />REDIRECTING...</>
                  ) : 'CHOOSE OWNER-OP'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Delayed-activation reassurance while still on the free window */}
          {isInFreePeriod && freeAccessEndDate && (
            <p className="brutal-mono text-center text-foreground" style={{ fontSize: '11px', marginBottom: '6px' }}>
              You won't be charged until your free access ends on{' '}
              <strong>{freeAccessEndDate.toLocaleDateString()}</strong>. Keep everything until then.
            </p>
          )}

          <p className="brutal-mono text-center text-muted-foreground" style={{ fontSize: '10px' }}>
            Payments processed securely by Stripe. Cancel any time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
