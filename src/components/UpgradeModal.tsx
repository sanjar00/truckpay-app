
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

const PRICES = {
  pro:   { monthly: '$14.99', annual: '$9.99', annualTotal: '$119.88' },
  owner: { monthly: '$29.99', annual: '$19.99', annualTotal: '$239.88' },
};

const UpgradeModal = ({ featureName, requiredTier, onClose, onSuccess }: UpgradeModalProps) => {
  const { subscription, upgradeTo, startTrial } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const featureLabel = FEATURE_DESCRIPTIONS[featureName] || featureName;

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setLoadingTier(tier);
    await upgradeTo(tier, billingCycle);
    setLoadingTier(null);
  };

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
          <div className="flex items-center justify-center" style={{ marginBottom: '12px' }}>
            <div className="brutal-border inline-flex rounded overflow-hidden">
              <button
                className={`px-4 py-1.5 brutal-mono text-xs font-bold transition-colors ${billingCycle === 'annual' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'}`}
                onClick={() => setBillingCycle('annual')}
              >
                ANNUAL
              </button>
              <button
                className={`px-4 py-1.5 brutal-mono text-xs font-bold transition-colors ${billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'}`}
                onClick={() => setBillingCycle('monthly')}
              >
                MONTHLY
              </button>
            </div>
            {billingCycle === 'annual' && (
              <span className="ml-2 brutal-mono text-xs text-green-600 font-bold">SAVE ~33%</span>
            )}
          </div>

          {/* Tier Cards — always 2-column */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {/* Pro */}
            <Card className={`brutal-border brutal-shadow ${requiredTier === 'pro' ? 'border-accent bg-accent/10' : ''}`}>
              <CardContent style={{ padding: '12px 14px' }}>
                <div className="flex items-center gap-1" style={{ marginBottom: '4px' }}>
                  <Zap className="w-3.5 h-3.5 text-accent" />
                  <p className="brutal-text text-base font-bold">PRO</p>
                </div>
                <p className="brutal-text text-xl font-bold" style={{ lineHeight: 1.1 }}>
                  {billingCycle === 'annual' ? PRICES.pro.annual : PRICES.pro.monthly}
                  <span className="brutal-mono font-normal" style={{ fontSize: '11px' }}>/mo</span>
                </p>
                {billingCycle === 'annual' && (
                  <p className="brutal-mono text-muted-foreground" style={{ fontSize: '10px', marginBottom: '6px' }}>
                    {PRICES.pro.annualTotal} billed annually
                  </p>
                )}
                <ul className="brutal-mono text-muted-foreground" style={{ fontSize: '12px', lineHeight: 1.5, marginBottom: '10px', marginTop: '6px', listStyle: 'none', padding: 0 }}>
                  <li>✓ Full load history</li>
                  <li>✓ IFTA reports</li>
                  <li>✓ Per Diem tracker</li>
                  <li>✓ AI receipt scanner</li>
                </ul>
                <Button
                  className="w-full brutal-border bg-accent hover:bg-accent text-accent-foreground brutal-hover brutal-text"
                  style={{ fontSize: '12px', height: '36px' }}
                  disabled={loadingTier !== null}
                  onClick={() => handleUpgrade('pro')}
                >
                  {loadingTier === 'pro' ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />REDIRECTING...</>
                  ) : 'UPGRADE TO PRO'}
                </Button>
              </CardContent>
            </Card>

            {/* Owner-Op */}
            <Card className={`brutal-border brutal-shadow ${requiredTier === 'owner' ? 'border-accent bg-accent/10' : ''}`}>
              <CardContent style={{ padding: '12px 14px' }}>
                <div className="flex items-center gap-1" style={{ marginBottom: '4px' }}>
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  <p className="brutal-text text-base font-bold">OWNER-OP</p>
                </div>
                <p className="brutal-text text-xl font-bold" style={{ lineHeight: 1.1 }}>
                  {billingCycle === 'annual' ? PRICES.owner.annual : PRICES.owner.monthly}
                  <span className="brutal-mono font-normal" style={{ fontSize: '11px' }}>/mo</span>
                </p>
                {billingCycle === 'annual' && (
                  <p className="brutal-mono text-muted-foreground" style={{ fontSize: '10px', marginBottom: '6px' }}>
                    {PRICES.owner.annualTotal} billed annually
                  </p>
                )}
                <ul className="brutal-mono text-muted-foreground" style={{ fontSize: '12px', lineHeight: 1.5, marginBottom: '10px', marginTop: '6px', listStyle: 'none', padding: 0 }}>
                  <li>✓ Everything in Pro</li>
                  <li>✓ Dispatcher book</li>
                  <li>✓ Lane analytics</li>
                  <li>✓ Annual goal tracking</li>
                </ul>
                <Button
                  className="w-full brutal-border bg-primary hover:bg-primary text-primary-foreground brutal-hover brutal-text"
                  style={{ fontSize: '12px', height: '36px' }}
                  disabled={loadingTier !== null}
                  onClick={() => handleUpgrade('owner')}
                >
                  {loadingTier === 'owner' ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />REDIRECTING...</>
                  ) : 'UPGRADE TO OWNER-OP'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Trial CTA */}
          {!subscription.trialUsed && (
            <div style={{ marginBottom: '8px' }}>
              <Button
                className="brutal-border font-extrabold uppercase tracking-wide w-full"
                style={{ background: '#f0a500', color: '#1a1a2e', border: '2px solid #1a1a2e', fontSize: '13px', height: '44px' }}
                disabled={loadingTier !== null}
                onClick={() => { startTrial(); onClose(); onSuccess?.('pro', true); }}
              >
                START 7-DAY FREE TRIAL (PRO)
              </Button>
              <p className="brutal-mono text-xs text-muted-foreground text-center" style={{ marginTop: '4px' }}>No payment required to start trial</p>
            </div>
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
