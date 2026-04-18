import { useState, useMemo } from 'react';
import {
  Truck,
  FileText,
  Calculator,
  Camera,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingCarouselProps {
  userId: string;
  userName?: string;
  driverType?: 'owner-operator' | 'lease-operator' | 'company-driver' | string | null;
  onComplete: () => void;
}

type Slide = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  highlights?: { label: string; value: string; tone?: 'green' | 'red' | 'amber' | 'blue' }[];
};

const TONE_COLORS: Record<string, { bg: string; fg: string }> = {
  green: { bg: '#2d6a2d', fg: '#ffffff' },
  red: { bg: '#c0392b', fg: '#ffffff' },
  amber: { bg: '#f0a500', fg: '#1a1a2e' },
  blue: { bg: '#4a90d9', fg: '#ffffff' },
};

const OnboardingCarousel = ({ userId, userName, driverType, onComplete }: OnboardingCarouselProps) => {
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const firstName = (userName || '').trim().split(/\s+/)[0] || 'Driver';

  const payExplanation = useMemo<React.ReactNode>(() => {
    switch (driverType) {
      case 'owner-operator':
        return (
          <>
            As an <strong>Owner-Operator</strong>, TruckPay subtracts your company&rsquo;s cut from each load&rsquo;s gross,
            adds detention pay, then tracks every fuel, toll, and fixed weekly cost against it.
          </>
        );
      case 'lease-operator':
        return (
          <>
            As a <strong>Lease-Operator</strong>, TruckPay handles your company cut <em>and</em> your lease cost per mile &mdash;
            so your weekly take-home is accurate without manual math.
          </>
        );
      case 'company-driver':
        return (
          <>
            As a <strong>Company Driver</strong>, TruckPay calculates your pay from miles or a percentage of gross &mdash;
            whichever your carrier uses &mdash; and tracks your personal expenses.
          </>
        );
      default:
        return (
          <>TruckPay calculates your weekly take-home automatically based on your driver type and pay structure.</>
        );
    }
  }, [driverType]);

  const slides = useMemo<Slide[]>(() => [
    {
      icon: Truck,
      eyebrow: 'Welcome',
      title: `Welcome aboard, ${firstName}`,
      body: (
        <>
          TruckPay is the simplest way for truck drivers to track loads, expenses, and real weekly take-home.
          We&rsquo;ll show you the 6 things that matter in about 60 seconds.
        </>
      ),
      highlights: [
        { label: 'Loads', value: '+$5,700', tone: 'green' },
        { label: 'Expenses', value: '-$1,240', tone: 'red' },
        { label: 'Take-Home', value: '$4,460', tone: 'amber' },
      ],
    },
    {
      icon: FileText,
      eyebrow: 'Step 1',
      title: 'Add your loads',
      body: (
        <>
          Enter a pickup and delivery ZIP &mdash; we auto-fill city, state, and estimated miles using Google Maps.
          Add your load rate, and TruckPay calculates your driver pay instantly.
          {' '}{payExplanation}
        </>
      ),
      highlights: [
        { label: 'Pickup ZIP', value: '60607', tone: 'blue' },
        { label: 'Delivery ZIP', value: '75201', tone: 'blue' },
        { label: 'Est. Miles', value: '925', tone: 'amber' },
      ],
    },
    {
      icon: Calculator,
      eyebrow: 'Step 2',
      title: 'Truck expenses vs. personal',
      body: (
        <>
          <strong>Deductions</strong> are truck costs &mdash; fuel, tolls, maintenance, insurance.
          These reduce your weekly take-home.
          <br /><br />
          <strong>Personal Expenses</strong> are your own costs &mdash; meals, lodging, anything else.
          Tracked separately so your truck P&amp;L stays clean.
        </>
      ),
      highlights: [
        { label: 'Fuel', value: '$820', tone: 'red' },
        { label: 'Tolls', value: '$95', tone: 'red' },
        { label: 'Personal', value: 'separate', tone: 'blue' },
      ],
    },
    {
      icon: Camera,
      eyebrow: 'Step 3',
      title: 'Snap a receipt — we do the rest',
      body: (
        <>
          Take a photo of any receipt and our AI reads the merchant, category, amount, and date.
          Review, tap confirm, done. Works for fuel, tolls, meals, parts &mdash; anything.
          <br /><br />
          <em style={{ opacity: 0.75 }}>Available on Pro &mdash; start a free 7-day trial anytime.</em>
        </>
      ),
      highlights: [
        { label: 'Merchant', value: 'Pilot #245', tone: 'blue' },
        { label: 'Category', value: 'FUEL', tone: 'amber' },
        { label: 'Amount', value: '$412.80', tone: 'green' },
      ],
    },
    {
      icon: TrendingUp,
      eyebrow: 'Step 4',
      title: 'Know your week before it ends',
      body: (
        <>
          The Weekly Forecast projects your gross and take-home based on your current pace.
          Set a weekly goal in Settings and see a live progress bar on your home screen.
          <br /><br />
          Deeper insights &mdash; lane performance, year-to-date, CSV export &mdash; live in the Summary tab.
        </>
      ),
      highlights: [
        { label: 'On Pace', value: '$7,200', tone: 'green' },
        { label: 'Goal', value: '$7,500', tone: 'amber' },
        { label: 'Confidence', value: 'High', tone: 'blue' },
      ],
    },
    {
      icon: Calendar,
      eyebrow: 'Step 5',
      title: 'Taxes, simplified',
      body: (
        <>
          <strong>Per Diem</strong> auto-calculates your IRS meal deduction from the days you were on the road.
          <br /><br />
          <strong>IFTA Report</strong> breaks your miles down by state so filing quarterly fuel tax is a 2-minute job &mdash; not a weekend.
        </>
      ),
      highlights: [
        { label: 'Per Diem', value: 'IRS 2025', tone: 'green' },
        { label: 'IFTA', value: '48 states', tone: 'blue' },
        { label: 'Quarterly', value: 'Auto', tone: 'amber' },
      ],
    },
    {
      icon: Sparkles,
      eyebrow: "You're ready",
      title: "Let's add your first load",
      body: (
        <>
          That&rsquo;s it. Your Free plan covers the current week with up to 5 loads.
          Pro unlocks full history, Per Diem, IFTA, AI Receipt Scanner, and the Weekly Forecast &mdash;
          start a free trial anytime from the home screen.
          <br /><br />
          <strong>Drive smart. Earn more.</strong>
        </>
      ),
    },
  ], [firstName, payExplanation]);

  const total = slides.length;
  const slide = slides[index];
  const Icon = slide.icon;
  const isLast = index === total - 1;
  const isFirst = index === 0;

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ onboarded: true }).eq('id', userId);
    } catch {
      // Non-blocking: user still proceeds into the app.
    }
    setSaving(false);
    onComplete();
  };

  const handleNext = () => {
    if (isLast) {
      finish();
    } else {
      setIndex((i) => Math.min(total - 1, i + 1));
    }
  };

  const handleBack = () => {
    if (!isFirst) setIndex((i) => Math.max(0, i - 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(26, 26, 46, 0.92)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="w-full max-w-md brutal-border bg-background brutal-shadow-xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh', borderRadius: '8px' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: '#1a1a2e', color: '#f0a500', borderBottom: '2px solid #1a1a2e' }}
        >
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="TruckPay" className="w-7 h-7 object-contain" />
            <span className="brutal-mono text-xs font-bold uppercase tracking-widest">
              Getting Started
            </span>
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label="Skip onboarding"
            className="opacity-80 hover:opacity-100 transition-opacity"
            style={{ color: '#f0a500' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to step ${i + 1}`}
                className="flex-1 h-1.5 rounded-full transition-all"
                style={{
                  background: i <= index ? '#f0a500' : '#e5e5e5',
                  outline: 'none',
                }}
              />
            ))}
          </div>
          <p className="brutal-mono text-[10px] mt-2 uppercase tracking-widest" style={{ color: '#6b6b7a' }}>
            {slide.eyebrow} &middot; {index + 1} of {total}
          </p>
        </div>

        <div className="px-5 pt-4 pb-5 overflow-y-auto flex-1">
          <div
            className="brutal-border flex items-center justify-center mb-4"
            style={{
              width: 64,
              height: 64,
              background: '#f0a500',
              color: '#1a1a2e',
              borderRadius: '8px',
            }}
          >
            <Icon className="w-8 h-8" />
          </div>

          <h2
            id="onboarding-title"
            className="brutal-text text-2xl mb-3"
            style={{ color: '#1a1a2e', lineHeight: 1.15 }}
          >
            {slide.title}
          </h2>

          <div
            className="text-sm leading-relaxed"
            style={{ color: '#1a1a2e', opacity: 0.88 }}
          >
            {slide.body}
          </div>

          {slide.highlights && slide.highlights.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {slide.highlights.map((h, i) => {
                const tone = TONE_COLORS[h.tone || 'amber'];
                return (
                  <div
                    key={i}
                    className="brutal-border p-2 text-center"
                    style={{ background: tone.bg, color: tone.fg, borderRadius: '4px' }}
                  >
                    <p
                      className="brutal-mono uppercase"
                      style={{ fontSize: 9, letterSpacing: '1px', opacity: 0.85 }}
                    >
                      {h.label}
                    </p>
                    <p className="brutal-text" style={{ fontSize: 14, marginTop: 2 }}>
                      {h.value}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="px-4 py-3 flex items-center justify-between gap-2"
          style={{ borderTop: '2px solid #1a1a2e', background: '#f7f7f5' }}
        >
          <button
            type="button"
            onClick={handleBack}
            disabled={isFirst}
            className="brutal-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1 px-3 py-2 transition-opacity"
            style={{
              color: '#1a1a2e',
              opacity: isFirst ? 0.3 : 1,
              cursor: isFirst ? 'default' : 'pointer',
            }}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {!isLast && (
            <button
              type="button"
              onClick={finish}
              className="brutal-mono text-xs font-bold uppercase tracking-wider px-3 py-2"
              style={{ color: '#1a1a2e', opacity: 0.55 }}
            >
              Skip
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="brutal-border font-extrabold uppercase tracking-wider flex items-center gap-1 px-4 py-2 brutal-shadow brutal-hover"
            style={{
              background: '#f0a500',
              color: '#1a1a2e',
              border: '2px solid #1a1a2e',
              borderRadius: '4px',
              fontSize: 12,
              minHeight: 44,
            }}
          >
            {isLast ? (
              <>
                <Check className="w-4 h-4" /> Let&rsquo;s go
              </>
            ) : (
              <>
                Next <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingCarousel;
