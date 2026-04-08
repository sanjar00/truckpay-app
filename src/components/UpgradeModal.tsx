import { X, Star, Zap, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradeModalProps {
  featureName: string;
  requiredTier: 'pro' | 'owner';
  onClose: () => void;
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  ifta: 'IFTA Fuel Tax Reports',
  perdiem: 'Per Diem Tax Calculator',
  ytd: 'Year-to-Date Dashboard',
  fullHistory: 'Full Load History',
  export: 'CSV/PDF Export',
  receipts: 'Photo Receipt Attachments',
  forecast: 'Weekly Pay Forecast',
  dispatcher: 'Dispatcher Contact Book',
  laneAnalytics: 'Lane Performance Analytics',
  annualGoal: 'Annual Income Goal Tracking',
  multiTruck: 'Multi-Truck Management',
};

const UpgradeModal = ({ featureName, requiredTier, onClose }: UpgradeModalProps) => {
  const { subscription, upgradeTo, startTrial } = useSubscription();
  const featureLabel = FEATURE_DESCRIPTIONS[featureName] || featureName;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg brutal-border bg-background brutal-shadow-xl">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            <span className="brutal-text text-lg">UPGRADE REQUIRED</span>
          </div>
          <button onClick={onClose} className="hover:opacity-80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <p className="brutal-mono text-sm text-muted-foreground mb-1">TO ACCESS</p>
            <p className="brutal-text text-2xl font-bold text-accent">{featureLabel}</p>
            <p className="brutal-mono text-sm text-muted-foreground mt-2">
              requires {requiredTier === 'owner' ? 'Owner-Operator' : 'Pro'} plan
            </p>
          </div>

          {/* Tier Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pro */}
            <Card className={`brutal-border brutal-shadow ${requiredTier === 'pro' ? 'border-accent bg-accent/10' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-accent" />
                  <p className="brutal-text text-lg font-bold">PRO</p>
                </div>
                <p className="brutal-text text-2xl font-bold mb-1">$14.99<span className="brutal-mono text-sm font-normal">/mo</span></p>
                <ul className="brutal-mono text-xs space-y-1 text-muted-foreground mb-4">
                  <li>✓ Full load history</li>
                  <li>✓ IFTA reports</li>
                  <li>✓ Per Diem tracker</li>
                  <li>✓ CSV/PDF export</li>
                  <li>✓ YTD dashboard</li>
                  <li>✓ Receipt photos</li>
                </ul>
                <Button
                  className="w-full brutal-border bg-accent hover:bg-accent text-accent-foreground brutal-hover brutal-text text-sm"
                  onClick={() => { upgradeTo('pro'); onClose(); }}
                >
                  UPGRADE TO PRO
                </Button>
              </CardContent>
            </Card>

            {/* Owner-Op */}
            <Card className={`brutal-border brutal-shadow ${requiredTier === 'owner' ? 'border-accent bg-accent/10' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <p className="brutal-text text-lg font-bold">OWNER-OP</p>
                </div>
                <p className="brutal-text text-2xl font-bold mb-1">$29.99<span className="brutal-mono text-sm font-normal">/mo</span></p>
                <ul className="brutal-mono text-xs space-y-1 text-muted-foreground mb-4">
                  <li>✓ Everything in Pro</li>
                  <li>✓ Dispatcher contact book</li>
                  <li>✓ Lane analytics</li>
                  <li>✓ Annual goal tracking</li>
                  <li>✓ Priority support</li>
                </ul>
                <Button
                  className="w-full brutal-border bg-primary hover:bg-primary text-primary-foreground brutal-hover brutal-text text-sm"
                  onClick={() => { upgradeTo('owner'); onClose(); }}
                >
                  UPGRADE TO OWNER-OP
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Trial CTA */}
          {!subscription.trialUsed && (
            <div className="text-center">
              <Button
                variant="outline"
                className="brutal-border brutal-hover brutal-text text-sm"
                onClick={() => { startTrial(); onClose(); }}
              >
                START 7-DAY FREE TRIAL (PRO)
              </Button>
              <p className="brutal-mono text-xs text-muted-foreground mt-2">No payment required to start trial</p>
            </div>
          )}

          <p className="brutal-mono text-xs text-center text-muted-foreground">
            Stripe integration coming soon. Upgrades saved locally for now.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
