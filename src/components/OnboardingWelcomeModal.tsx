interface OnboardingWelcomeModalProps {
  onStart: () => void;
}

const OnboardingWelcomeModal = ({ onStart }: OnboardingWelcomeModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm brutal-border bg-card brutal-shadow-xl p-5" style={{ borderRadius: '8px' }}>
        <div className="mb-4">
          <p className="brutal-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">Welcome to TruckPay</p>
          <h2 className="brutal-text text-2xl text-foreground leading-tight">Drive smart. Earn more.</h2>
        </div>

        <p className="brutal-mono text-sm text-muted-foreground leading-relaxed mb-5">
          Track your loads, truck expenses, mileage, and weekly take-home in one place.
        </p>

        <div>
          <button
            type="button"
            onClick={onStart}
            className="w-full brutal-border brutal-shadow brutal-mono text-sm font-bold uppercase min-h-12"
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
