import { useState } from 'react';
import { X, Info, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubscriptionTier } from '@/hooks/useSubscription';

interface FeatureItem {
  label: string;
  description: string;
}

const PRO_FEATURES: FeatureItem[] = [
  { label: 'Full Load History', description: 'Browse and search every load you have ever entered — no week limit.' },
  { label: 'IFTA Reports', description: 'Generate quarterly fuel tax reports per state, ready for filing.' },
  { label: 'Per Diem Calculator', description: 'Track IRS daily meal deductions (up to $80/day) to reduce your tax bill.' },
  { label: 'CSV / PDF Export', description: 'Download your load and earnings data as a spreadsheet or PDF.' },
  { label: 'Year-to-Date Dashboard', description: 'See your total earnings, expenses, and take-home for the full year at a glance.' },
  { label: 'AI Receipt Scanner', description: 'Snap a photo of any receipt and the app auto-extracts the amount and category.' },
  { label: 'Weekly Pay Forecast', description: 'Predicts your end-of-week gross and take-home based on loads so far.' },
];

const OWNER_EXTRA_FEATURES: FeatureItem[] = [
  { label: 'Dispatcher Contact Book', description: 'Save dispatcher names, companies, and phone numbers linked to your loads.' },
  { label: 'Lane Performance Analytics', description: 'See which routes earn you the most per mile so you can focus on the best lanes.' },
  { label: 'Annual Income Goal Tracking', description: 'Set a yearly income target and track progress toward it with a live progress bar.' },
  { label: 'Multi-Truck Management', description: 'Manage earnings and expenses across multiple trucks from one account.' },
];

interface Props {
  tier: SubscriptionTier;
  isTrial?: boolean;
  onClose: () => void;
}

const FeatureRow = ({ label, description }: FeatureItem) => {
  const [open, setOpen] = useState(false);

  return (
    <li className="flex items-start gap-2">
      <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span>
      <span className="brutal-mono text-sm text-foreground flex-1">{label}</span>
      <div className="relative flex-shrink-0 mt-0.5">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`What is ${label}?`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
        {open && (
          <div className="absolute right-0 bottom-full mb-2 w-56 bg-foreground text-background text-xs rounded px-3 py-2 shadow-lg z-50 leading-snug">
            {description}
            <div className="absolute top-full right-2 border-4 border-transparent border-t-foreground" />
          </div>
        )}
      </div>
    </li>
  );
};

const SubscriptionSuccessModal = ({ tier, isTrial = false, onClose }: Props) => {
  const isOwner = tier === 'owner';

  const title = isTrial
    ? '7-Day Free Trial Started!'
    : isOwner
    ? 'Welcome to Owner-Operator!'
    : 'Welcome to Pro!';

  const subtitle = isTrial
    ? 'You now have full Pro access for 7 days — no payment required. Here\'s what\'s unlocked:'
    : isOwner
    ? 'Your Owner-Operator plan is active. Here\'s everything you can now do:'
    : 'Your Pro plan is active. Here\'s everything you can now do:';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md brutal-border bg-background brutal-shadow-xl">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5" />
            <span className="brutal-text text-lg">CONGRATULATIONS!</span>
          </div>
          <button onClick={onClose} className="hover:opacity-80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="brutal-text text-xl font-bold mb-1">{title}</p>
            <p className="brutal-mono text-xs text-muted-foreground">{subtitle}</p>
          </div>

          {/* Pro features */}
          <div>
            {isOwner && (
              <p className="brutal-mono text-xs font-bold text-muted-foreground uppercase mb-2">Pro Features</p>
            )}
            <ul className="space-y-2.5">
              {PRO_FEATURES.map(f => (
                <FeatureRow key={f.label} {...f} />
              ))}
            </ul>
          </div>

          {/* Owner-Op extras */}
          {isOwner && (
            <div>
              <p className="brutal-mono text-xs font-bold text-muted-foreground uppercase mb-2">Owner-Operator Extras</p>
              <ul className="space-y-2.5">
                {OWNER_EXTRA_FEATURES.map(f => (
                  <FeatureRow key={f.label} {...f} />
                ))}
              </ul>
            </div>
          )}

          <Button
            className="w-full h-12 brutal-border brutal-shadow bg-accent hover:bg-accent/90 text-accent-foreground brutal-text text-base"
            onClick={onClose}
          >
            LET'S ROCK!
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccessModal;
