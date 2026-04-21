import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionTier = 'free' | 'pro' | 'owner';
export type BillingCycle = 'monthly' | 'annual';

export interface Subscription {
  tier: SubscriptionTier;
  startDate: string | null;
  endDate: string | null;
  trialUsed: boolean;
  earlyAdopter: boolean;
  earlyAdopterBannerDismissed: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

const DEFAULT_SUB: Subscription = {
  tier: 'free',
  startDate: null,
  endDate: null,
  trialUsed: false,
  earlyAdopter: false,
  earlyAdopterBannerDismissed: false,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
};

export const PRO_FEATURES = ['ifta', 'perdiem', 'ytd', 'fullHistory', 'export', 'receipts', 'forecast', 'multiStop'] as const;
export const OWNER_FEATURES = ['dispatcher', 'laneAnalytics', 'annualGoal', 'multiTruck'] as const;

type ProFeature = typeof PRO_FEATURES[number];
type OwnerFeature = typeof OWNER_FEATURES[number];
type AnyFeature = ProFeature | OwnerFeature;

interface SubscriptionContextValue {
  subscription: Subscription;
  loading: boolean;
  isFeatureAllowed: (feature: AnyFeature) => boolean;
  upgradeTo: (tier: SubscriptionTier, billingCycle: BillingCycle) => Promise<void>;
  startTrial: () => void;
  activateEarlyAdopter: () => Promise<void>;
  dismissEarlyAdopterBanner: () => void;
  openCustomerPortal: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
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
          stripeCustomerId: data.stripe_customer_id ?? null,
          stripeSubscriptionId: data.stripe_subscription_id ?? null,
        };

        // Expire non-early-adopter paid subscriptions that have passed their end date
        // (Stripe subscriptions are renewed via webhook, so this handles edge cases only)
        if (sub.endDate && new Date(sub.endDate) < new Date() && sub.tier !== 'free' && !sub.earlyAdopter && !sub.stripeSubscriptionId) {
          sub.tier = 'free';
          sub.endDate = null;
          await persistToSupabase(userId, sub);
        }

        setSubscription(sub);
      } else {
        // First login — grant 90-day Pro early adopter access to all new users
        const end = new Date();
        end.setDate(end.getDate() + 90);
        const newUserSub: Subscription = {
          ...DEFAULT_SUB,
          tier: 'pro',
          earlyAdopter: true,
          startDate: new Date().toISOString(),
          endDate: end.toISOString(),
        };
        await persistToSupabase(userId, newUserSub);
        setSubscription(newUserSub);
      }
    } catch (err) {
      console.error('Subscription load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const persistToSupabase = async (userId: string, sub: Subscription) => {
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
          // stripe_customer_id and stripe_subscription_id are set by the webhook only
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
    const now = new Date();
    const expired = subscription.endDate && new Date(subscription.endDate) < now;

    // Early adopters get all Pro features for 90 days — check expiry at runtime too
    if (subscription.earlyAdopter && !expired) {
      if ((PRO_FEATURES as readonly string[]).includes(feature)) return true;
    }

    // Stripe-managed subscriptions: trust the tier, no end-date enforcement here
    // (webhook handles cancellation/renewal server-side)
    if (subscription.stripeSubscriptionId) {
      if (subscription.tier === 'owner') return true;
      if (subscription.tier === 'pro') return (PRO_FEATURES as readonly string[]).includes(feature);
    }

    // Trial or manually-set subscriptions: enforce end date
    if (expired) return false;

    if (subscription.tier === 'owner') return true;
    if (subscription.tier === 'pro') {
      return (PRO_FEATURES as readonly string[]).includes(feature);
    }
    return false;
  };

  // Redirects the user to Stripe Checkout for the chosen plan/cycle.
  // On successful payment, Stripe fires checkout.session.completed → stripe-webhook
  // edge function updates the subscriptions table → app reloads subscription on return.
  const upgradeTo = async (tier: SubscriptionTier, billingCycle: BillingCycle) => {
    if (!user) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) return;

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        tier,
        billingCycle,
        successUrl: `${window.location.origin}/?checkout=success&tier=${tier}`,
        cancelUrl: window.location.href,
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (error || !data?.url) {
      console.error('Failed to create checkout session:', error);
      return;
    }

    window.location.href = data.url;
  };

  // 7-day free Pro trial — no payment required.
  // Stripe trial subscriptions (trial_period_days) can replace this in a future sprint.
  const startTrial = () => {
    if (subscription.trialUsed) return;
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    updateSub({ tier: 'pro', startDate: now.toISOString(), endDate: end.toISOString(), trialUsed: true });
  };

  // Checks whether the user has pre-existing load data and, if so, grants 90-day Pro access.
  // TODO: Re-enable after testing subscription flow. Currently disabled for testing.
  const activateEarlyAdopter = async () => {
    if (!user || subscription.earlyAdopter) return;
    // TEMPORARILY DISABLED FOR TESTING
    // const today = new Date().toISOString().split('T')[0];
    // const { data: existingLoads } = await supabase
    //   .from('load_reports')
    //   .select('id')
    //   .eq('user_id', user.id)
    //   .lt('date_added', today)
    //   .limit(1);
    //
    // if (existingLoads && existingLoads.length > 0) {
    //   const end = new Date();
    //   end.setDate(end.getDate() + 90);
    //   updateSub({
    //     earlyAdopter: true,
    //     tier: 'pro',
    //     startDate: new Date().toISOString(),
    //     endDate: end.toISOString(),
    //   });
    // }
  };

  const dismissEarlyAdopterBanner = () => {
    updateSub({ earlyAdopterBannerDismissed: true });
  };

  // Redirects to Stripe Customer Portal so the user can manage or cancel their subscription.
  const openCustomerPortal = async () => {
    if (!user) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) return;

    const { data, error } = await supabase.functions.invoke('create-portal-session', {
      body: { returnUrl: window.location.href },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (error || !data?.url) {
      console.error('Failed to open customer portal:', error);
      return;
    }

    window.location.href = data.url;
  };

  // Re-fetches the subscription from Supabase — call this after returning from Stripe Checkout.
  const refreshSubscription = async () => {
    if (!user) return;
    await loadSubscription(user.id);
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
      openCustomerPortal,
      refreshSubscription,
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
