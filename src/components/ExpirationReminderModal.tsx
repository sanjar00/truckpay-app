import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

interface ExpirationReminderModalProps {
  /** Opens the plan/upgrade modal. */
  onGetPlan: () => void;
}

// Days-before-expiry buckets. Each fires once, escalating in urgency.
const THRESHOLDS = [15, 10, 5, 1] as const;
type Threshold = (typeof THRESHOLDS)[number];

const COPY: Record<Threshold, {
  urgent: boolean;
  title: string;
  body: string;
}> = {
  15: {
    urgent: false,
    title: '15 days of free Pro left',
    body: 'Your 90-day free access is winding down. Lock in a plan to keep IFTA, Per Diem, and your full history.',
  },
  10: {
    urgent: false,
    title: '10 days of free Pro left',
    body: 'Pick a plan now so nothing stops when your free access ends. You won’t be charged until then.',
  },
  5: {
    urgent: true,
    title: 'Only 5 days left!',
    body: 'Choose a plan now or you’ll lose Pro features — IFTA, Per Diem, AI scanner, and full load history.',
  },
  1: {
    urgent: true,
    title: '1 day left — act now',
    body: 'Tomorrow your free access ends. Without a plan you lose access to your reports and history. Keep your data — get a plan today.',
  },
};

const ExpirationReminderModal = ({ onGetPlan }: ExpirationReminderModalProps) => {
  const { user } = useAuth();
  const { isInFreePeriod, daysUntilFreeExpiry, freeAccessEndDate } = useSubscription();
  const [shown, setShown] = useState<number[] | null>(null); // null = not loaded yet
  const [active, setActive] = useState<Threshold | null>(null);

  // Load which reminders this user has already seen.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('subscription_reminders')
      .select('threshold')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error loading reminders:', error);
          setShown([]);
          return;
        }
        setShown((data || []).map((r: { threshold: number }) => r.threshold));
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Decide which (if any) reminder to show: the most urgent crossed-but-unseen threshold.
  useEffect(() => {
    if (shown === null) return;
    if (!isInFreePeriod || daysUntilFreeExpiry == null) return;
    const due = THRESHOLDS.filter((t) => daysUntilFreeExpiry <= t && !shown.includes(t));
    if (due.length === 0) return;
    setActive(Math.min(...due) as Threshold);
  }, [shown, isInFreePeriod, daysUntilFreeExpiry]);

  if (!active) return null;

  const copy = COPY[active];

  // Record this threshold as seen so it won't reappear, then run the action.
  const recordAndClose = async (after?: () => void) => {
    const threshold = active;
    setActive(null);
    setShown((prev) => (prev ? [...prev, threshold] : [threshold]));
    if (user) {
      const { error } = await supabase
        .from('subscription_reminders')
        .insert({ user_id: user.id, threshold });
      // Unique-constraint violations are fine (already recorded elsewhere).
      if (error && error.code !== '23505') console.error('Error recording reminder:', error);
    }
    after?.();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm brutal-border bg-card brutal-shadow-xl" style={{ borderRadius: '8px', overflow: 'hidden' }}>
        {/* Header — red when urgent */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: copy.urgent ? '#c0392b' : '#1a1a2e', color: copy.urgent ? '#ffffff' : '#f0a500' }}
        >
          {copy.urgent ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          <span className="brutal-text text-sm font-bold uppercase tracking-wide flex-1">
            {copy.urgent ? 'Free Access Ending' : 'Heads Up'}
          </span>
          <button onClick={() => recordAndClose()} className="hover:opacity-80" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <h2 className="brutal-text text-xl text-foreground leading-tight mb-2">{copy.title}</h2>
          <p className="brutal-mono text-sm text-muted-foreground leading-relaxed mb-2">{copy.body}</p>
          {freeAccessEndDate && (
            <p className="brutal-mono text-xs text-muted-foreground mb-4">
              Free access ends {freeAccessEndDate.toLocaleDateString()}.
            </p>
          )}

          <button
            type="button"
            onClick={() => recordAndClose(onGetPlan)}
            className="w-full brutal-border brutal-shadow brutal-mono text-sm font-bold uppercase min-h-12 mb-2"
            style={{ background: '#f0a500', color: '#1a1a2e' }}
          >
            Get a Plan
          </button>
          <button
            type="button"
            onClick={() => recordAndClose()}
            className="w-full brutal-mono text-xs text-muted-foreground hover:text-foreground min-h-9"
          >
            {copy.urgent ? 'Remind me later' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpirationReminderModal;
