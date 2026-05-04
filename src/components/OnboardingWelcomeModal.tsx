import { X } from 'lucide-react';

interface OnboardingWelcomeModalProps {
  onStart: () => void;
  onSkip: () => void;
}

const OnboardingWelcomeModal = ({ onStart, onSkip }: OnboardingWelcomeModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm brutal-border bg-card brutal-shadow-xl p-5" style={{ borderRadius: '8px' }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="brutal-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">Welcome to TruckPay</p>
            <h2 className="brutal-text text-2xl text-foreground leading-tight">Drive smart. Earn more.</h2>
          </div>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Close welcome"
            className="brutal-border bg-background brutal-shadow p-2 min-w-11 min-h-11 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="brutal-mono text-sm text-muted-foreground leading-relaxed mb-5">
          Track your loads, truck expenses, mileage, and weekly take-home in one place.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="brutal-border bg-background brutal-shadow brutal-mono text-sm font-bold uppercase min-h-12"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onStart}
            className="brutal-border brutal-shadow brutal-mono text-sm font-bold uppercase min-h-12"
            style={{ background: '#f0a500', color: '#1a1a2e' }}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWelcomeModal;
