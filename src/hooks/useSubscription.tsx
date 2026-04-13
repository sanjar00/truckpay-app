import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionTier = 'free' | 'pro' | 'owner';

export interface Subscription {
  tier: SubscriptionTier;
  startDate: string | null;
  endDate: string | null;
  trialUsed: boolean;
  earlyAdopter: boolean;
  earlyAdopterBannerDismissed: boolean;
}

const DEFAULT_SUB: Subscription = {
  tier: 'free',
  startDate: null,
  endDate: null,
  trialUsed: false,
  earlyAdopter: false,
  earlyAdopterBannerDismissed: false,
};

export const PRO_FEATURES = ['ifta', 'perdiem', 'ytd', 'fullHistory', 'export', 'receipts', 'forecast'] as const;
export const OWNER_FEATURES = ['dispatcher', 'laneAnalytics', 'annualGoal', 'multiTruck'] as const;

type ProFeature = typeof PRO_FEATURES[number];
type OwnerFeature = typeof OWNER_FEATURES[number];
type AnyFeature = ProFeature | OwnerFeature;

interface SubscriptionContextValue {
  subscription: Subscription;
  loading: boolean;
  isFeatureAllowed: (feature: AnyFeature) => boolean;
  upgradeTo: (tier: SubscriptionTier) => void;
  startTrial: () => void;
  activateEarlyAdopter: () => Promise<void>;
  dismissEarlyAdopterBanner: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUB);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(DEFAULT_SUB);
      setLoading(false);
      return;
    }
    loadSubscription(user.id);
  }, [user?.id]);

  const loadSubscription = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading subscription:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const sub: Subscription = {
          tier: data.tier as SubscriptionTier,
          startDate: data.start_date,
          endDate: data.end_date,
          trialUsed: data.trial_used,
          earlyAdopter: data.early_adopter,
          earlyAdopterBannerDismissed: data.early_adopter_banner_dismissed,
        };

        // Expire non-early-adopter paid subscriptions that have passed their end date
        if (sub.endDate && new Date(sub.endDate) < new Date() && sub.tier !== 'free' && !sub.earlyAdopter) {
          sub.tier = 'free';
          sub.endDate = null;
          await persistToSupabase(userId, sub);
        }

        setSubscription(sub);
      } else {
        // First login — create a default subscription row
        await persistToSupabase(userId, DEFAULT_SUB);
        setSubscription(DEFAULT_SUB);
      }
    } catch (err) {
      console.error('Subscription load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const persistToSupabase = async (userId: string, sub: Subscription) => {
    // TODO: When Stripe is integrated, subscription tier and dates should be updated
    //       via Stripe webhooks (stripe_subscription_id → status → tier mapping) rather
    //       than direct upserts. This upsert is the simulation layer only.
    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          tier: sub.tier,
          start_date: sub.startDate,
          end_date: sub.endDate,
          trial_used: sub.trialUsed,
          early_adopter: sub.earlyAdopter,
          early_adopter_banner_dismissed: sub.earlyAdopterBannerDismissed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error persisting subscription:', error);
    }
  };

  const updateSub = (updates: Partial<Subscription>) => {
    if (!user) return;
    setSubscription((prev) => {
      const next = { ...prev, ...updates };
      persistToSupabase(user.id, next);
      return next;
    });
  };

  const isFeatureAllowed = (feature: AnyFeature): boolean => {
    // Early adopters on free tier get all Pro features for 90 days (checked at load time)
    if (subscription.earlyAdopter && subscription.tier === 'free') {
      if ((PRO_FEATURES as readonly string[]).includes(feature)) return true;
    }
    if (subscription.tier === 'owner') return true;
    if (subscription.tier === 'pro') {
      return (PRO_FEATURES as readonly string[]).includes(feature);
    }
    return false;
  };

  const upgradeTo = (tier: SubscriptionTier) => {
    // TODO: Replace with Stripe Checkout redirect — create a Stripe Checkout session,
    //       redirect the user to Stripe's payment page, then handle the
    //       checkout.session.completed webhook to update the subscriptions table.
    //       For now, simulates a paid upgrade by writing directly to Supabase.
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    updateSub({ tier, startDate: now.toISOString(), endDate: end.toISOString() });
  };

  const startTrial = () => {
    if (subscription.trialUsed) return;
    // TODO: When Stripe is integrated, create a trial subscription via Stripe API
    //       (trial_period_days on the subscription) instead of writing locally.
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    updateSub({ tier: 'pro', startDate: now.toISOString(), endDate: end.toISOString(), trialUsed: true });
  };

  // Checks whether the user has pre-existing load data and, if so, grants 90-day Pro access.
  // Called from Index.tsx after the user profile loads.
  const activateEarlyAdopter = async () => {
    if (!user || subscription.earlyAdopter) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: existingLoads } = await supabase
      .from('load_reports')
      .select('id')
      .eq('user_id', user.id)
      .lt('date_added', today)
      .limit(1);

    if (existingLoads && existingLoads.length > 0) {
      const end = new Date();
      end.setDate(end.getDate() + 90);
      updateSub({
        earlyAdopter: true,
        tier: 'pro',
        startDate: new Date().toISOString(),
        endDate: end.toISOString(),
      });
    }
  };

  const dismissEarlyAdopterBanner = () => {
    updateSub({ earlyAdopterBannerDismissed: true });
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      isFeatureAllowed,
      upgradeTo,
      startTrial,
      activateEarlyAdopter,
      dismissEarlyAdopterBanner,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};
