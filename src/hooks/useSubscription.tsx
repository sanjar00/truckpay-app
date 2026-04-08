import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SubscriptionTier = 'free' | 'pro' | 'owner';

export interface Subscription {
  tier: SubscriptionTier;
  startDate: string | null;
  endDate: string | null;
  trialUsed: boolean;
  earlyAdopter: boolean;
}

const DEFAULT_SUB: Subscription = {
  tier: 'free',
  startDate: null,
  endDate: null,
  trialUsed: false,
  earlyAdopter: false,
};

export const PRO_FEATURES = ['ifta', 'perdiem', 'ytd', 'fullHistory', 'export', 'receipts', 'forecast'] as const;
export const OWNER_FEATURES = ['dispatcher', 'laneAnalytics', 'annualGoal', 'multiTruck'] as const;

type ProFeature = typeof PRO_FEATURES[number];
type OwnerFeature = typeof OWNER_FEATURES[number];
type AnyFeature = ProFeature | OwnerFeature;

interface SubscriptionContextValue {
  subscription: Subscription;
  isFeatureAllowed: (feature: AnyFeature) => boolean;
  upgradeTo: (tier: SubscriptionTier) => void;
  startTrial: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [subscription, setSubscription] = useState<Subscription>(() => {
    try {
      const stored = localStorage.getItem('truckpay_subscription');
      return stored ? JSON.parse(stored) : DEFAULT_SUB;
    } catch {
      return DEFAULT_SUB;
    }
  });

  // Check early adopter status (has data before today)
  useEffect(() => {
    const hasOldData = localStorage.getItem('truckpay_early_adopter') === 'true';
    if (hasOldData && !subscription.earlyAdopter) {
      updateSub({ earlyAdopter: true });
    }
  }, []);

  // Check if trial or subscription is still active
  useEffect(() => {
    if (subscription.endDate) {
      const end = new Date(subscription.endDate);
      if (end < new Date() && subscription.tier !== 'free') {
        updateSub({ tier: 'free', endDate: null });
      }
    }
  }, []);

  const updateSub = (updates: Partial<Subscription>) => {
    setSubscription((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('truckpay_subscription', JSON.stringify(next));
      return next;
    });
  };

  const isFeatureAllowed = (feature: AnyFeature): boolean => {
    // Early adopter: Pro free for 90 days from adoption
    if (subscription.earlyAdopter && subscription.tier === 'free') {
      // Treat as pro
      if ((PRO_FEATURES as readonly string[]).includes(feature)) return true;
    }
    if (subscription.tier === 'owner') return true;
    if (subscription.tier === 'pro') {
      return (PRO_FEATURES as readonly string[]).includes(feature);
    }
    return false;
  };

  const upgradeTo = (tier: SubscriptionTier) => {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    updateSub({ tier, startDate: now.toISOString(), endDate: end.toISOString() });
  };

  const startTrial = () => {
    if (subscription.trialUsed) return;
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    updateSub({ tier: 'pro', startDate: now.toISOString(), endDate: end.toISOString(), trialUsed: true });
  };

  return (
    <SubscriptionContext.Provider value={{ subscription, isFeatureAllowed, upgradeTo, startTrial }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
