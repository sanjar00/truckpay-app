import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface GuidedOnboardingHintProps {
  target: string;
  title: string;
  body: string;
  placement?: Placement;
  stepLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const GAP = 14;
const CARD_WIDTH = 280;
const EDGE = 12;
const MOBILE_BOTTOM_SAFE = 88;

const GuidedOnboardingHint = ({
  target,
  title,
  body,
  placement = 'bottom',
  stepLabel,
  actionLabel,
  onAction,
}: GuidedOnboardingHintProps) => {
  const cloudRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cloudSize, setCloudSize] = useState({ width: CARD_WIDTH, height: 136 });

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

  useLayoutEffect(() => {
    if (!cloudRef.current) return;
    const box = cloudRef.current.getBoundingClientRect();
    setCloudSize({ width: box.width || CARD_WIDTH, height: box.height || 136 });
  }, [title, body, stepLabel, actionLabel, rect]);

  const style = useMemo<CSSProperties>(() => {
    if (!rect) return { left: 16, top: 96, width: CARD_WIDTH };

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 640;
    const width = isMobile ? Math.min(320, viewportWidth - EDGE * 2) : CARD_WIDTH;
    const height = cloudSize.height;
    const bottomLimit = viewportHeight - (isMobile ? MOBILE_BOTTOM_SAFE : EDGE);
    const maxLeft = viewportWidth - width - EDGE;
    const maxTop = Math.max(EDGE, bottomLimit - height);
    const centeredLeft = rect.left + rect.width / 2 - width / 2;
    const clampLeft = (value: number) => Math.max(EDGE, Math.min(maxLeft, value));
    const clampTop = (value: number) => Math.max(EDGE, Math.min(maxTop, value));

    const candidates: Record<Placement, { left: number; top: number }> = {
      top: { left: clampLeft(centeredLeft), top: clampTop(rect.top - height - GAP) },
      bottom: { left: clampLeft(centeredLeft), top: clampTop(rect.bottom + GAP) },
      left: { left: clampLeft(rect.left - width - GAP), top: clampTop(rect.top + rect.height / 2 - height / 2) },
      right: { left: clampLeft(rect.right + GAP), top: clampTop(rect.top + rect.height / 2 - height / 2) },
    };

    const targetBox = {
      left: rect.left - 6,
      right: rect.right + 6,
      top: rect.top - 6,
      bottom: rect.bottom + 6,
    };

    const overlapsTarget = (candidate: { left: number; top: number }) => {
      const candidateBox = {
        left: candidate.left,
        right: candidate.left + width,
        top: candidate.top,
        bottom: candidate.top + height,
      };
      return !(
        candidateBox.right < targetBox.left ||
        candidateBox.left > targetBox.right ||
        candidateBox.bottom < targetBox.top ||
        candidateBox.top > targetBox.bottom
      );
    };

    const order: Placement[] = isMobile
      ? [placement, 'top', 'bottom', 'right', 'left']
      : [placement, 'right', 'left', 'top', 'bottom'];
    const chosen = order.map(p => candidates[p]).find(candidate => !overlapsTarget(candidate)) || candidates[placement];

    return {
      left: chosen.left,
      top: chosen.top,
      width,
    };
  }, [cloudSize.height, placement, rect]);

  return (
    <>
      <div className="onboarding-veil" aria-hidden="true" />
      <div
        ref={cloudRef}
        className={`onboarding-cloud onboarding-cloud-${placement}`}
        style={style}
        role="status"
        aria-live="polite"
      >
        {stepLabel && <p className="brutal-mono onboarding-step-label">{stepLabel}</p>}
        <h3 className="brutal-text onboarding-cloud-title">{title}</h3>
        <p className="brutal-mono onboarding-cloud-body">{body}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="onboarding-cloud-action brutal-mono"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </>
  );
};

export default GuidedOnboardingHint;
