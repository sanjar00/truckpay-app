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

        {/* 90-day free Pro highlight */}
        <div
          className="brutal-border p-4 mb-4"
          style={{ background: '#f0a500', borderRadius: '6px' }}
        >
          <p className="brutal-text text-3xl font-extrabold leading-none" style={{ color: '#1a1a2e' }}>
            90 DAYS FREE
          </p>
          <p className="brutal-mono text-sm font-bold mt-1" style={{ color: '#1a1a2e' }}>
            Full Pro access — on us. 🎉
          </p>
          <p className="brutal-mono text-xs mt-2" style={{ color: '#1a1a2e' }}>
            IFTA reports, Per Diem, AI receipt scanner, full history & more. No card needed to start.
          </p>
        </div>

        <p className="brutal-mono text-sm text-muted-foreground leading-relaxed mb-5">
          Track your loads, truck expenses, mileage, and weekly take-home in one place.
        </p>

        <div>
          <button
            type="button"
            onClick={onStart}
            className="w-full brutal-border brutal-shadow brutal-mono text-sm font-bold uppercase min-h-12"
            style={{ background: '#1a1a2e', color: '#f0a500' }}
          >
            Start My 90 Days Free
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWelcomeModal;
