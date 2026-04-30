import { useEffect, useMemo, useState, type CSSProperties } from 'react';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface GuidedOnboardingHintProps {
  target: string;
  title: string;
  body: string;
  placement?: Placement;
  stepLabel?: string;
}

const GAP = 14;
const CARD_WIDTH = 280;

const GuidedOnboardingHint = ({
  target,
  title,
  body,
  placement = 'bottom',
  stepLabel,
}: GuidedOnboardingHintProps) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => {
      const element = document.querySelector<HTMLElement>(`[data-onboarding="${target}"]`);
      if (!element) {
        setRect(null);
        return;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setRect(element.getBoundingClientRect());
    };

    const frame = window.requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [target]);

  const style = useMemo<CSSProperties>(() => {
    if (!rect) return { left: 16, top: 96, width: CARD_WIDTH };

    const maxLeft = window.innerWidth - CARD_WIDTH - 12;
    const centeredLeft = rect.left + rect.width / 2 - CARD_WIDTH / 2;
    const left = Math.max(12, Math.min(maxLeft, centeredLeft));

    if (placement === 'top') {
      return {
        left,
        top: Math.max(12, rect.top - 138 - GAP),
        width: CARD_WIDTH,
      };
    }

    if (placement === 'left') {
      return {
        left: Math.max(12, rect.left - CARD_WIDTH - GAP),
        top: Math.max(12, rect.top + rect.height / 2 - 70),
        width: CARD_WIDTH,
      };
    }

    if (placement === 'right') {
      return {
        left: Math.min(maxLeft, rect.right + GAP),
        top: Math.max(12, rect.top + rect.height / 2 - 70),
        width: CARD_WIDTH,
      };
    }

    return {
      left,
      top: Math.min(window.innerHeight - 148, rect.bottom + GAP),
      width: CARD_WIDTH,
    };
  }, [placement, rect]);

  return (
    <>
      <div className="onboarding-veil" aria-hidden="true" />
      <div
        className={`onboarding-cloud onboarding-cloud-${placement}`}
        style={style}
        role="status"
        aria-live="polite"
      >
        {stepLabel && <p className="brutal-mono onboarding-step-label">{stepLabel}</p>}
        <h3 className="brutal-text onboarding-cloud-title">{title}</h3>
        <p className="brutal-mono onboarding-cloud-body">{body}</p>
      </div>
    </>
  );
};

export default GuidedOnboardingHint;
