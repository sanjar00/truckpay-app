import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionTier = 'free' | 'pro' | 'owner';
// Billing cycles offered at checkout: bi-weekly (every 2 weeks) or annual.
export type BillingCycle = 'biweekly' | 'annual';

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
  activateEarlyAdopter: () => Promise<void>;
  dismissEarlyAdopterBanner: () => void;
  openCustomerPortal: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  // ── Free-usage window helpers (drive the welcome + expiry reminder modals) ──
  /** True while the user is on their 90-day free Pro window and hasn't subscribed yet. */
  isInFreePeriod: boolean;
  /** Date the 90-day free access ends (null if not on free access). */
  freeAccessEndDate: Date | null;
  /** Whole days remaining in the free window (null if not applicable, 0 if expired). */
  daysUntilFreeExpiry: number | null;
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

  // Read-only load. The subscription row is created and maintained server-side:
  // a signup trigger grants the 90-day free Pro window, and the Stripe webhook
  // owns all paid-tier changes. The client never writes tier/dates/stripe ids.
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
        setSubscription({
          tier: data.tier as SubscriptionTier,
          startDate: data.start_date,
          endDate: data.end_date,
          trialUsed: data.trial_used,
          earlyAdopter: data.early_adopter,
          earlyAdopterBannerDismissed: data.early_adopter_banner_dismissed,
          stripeCustomerId: data.stripe_customer_id ?? null,
          stripeSubscriptionId: data.stripe_subscription_id ?? null,
        });
      } else {
        // Should not happen (the signup trigger always creates a row), but fall
        // back to a safe Free default rather than trying to write from the client.
        setSubscription(DEFAULT_SUB);
      }
    } catch (err) {
      console.error('Subscription load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isFeatureAllowed = (feature: AnyFeature): boolean => {
    const now = new Date();
    const expired = subscription.endDate && new Date(subscription.endDate) < now;

    // Early adopters get all Pro features during their 90-day free window.
    if (subscription.earlyAdopter && !expired) {
      if ((PRO_FEATURES as readonly string[]).includes(feature)) return true;
    }

    // Stripe-managed subscriptions: trust the tier, no end-date enforcement here
    // (webhook handles cancellation/renewal server-side)
    if (subscription.stripeSubscriptionId) {
      if (subscription.tier === 'owner') return true;
      if (subscription.tier === 'pro') return (PRO_FEATURES as readonly string[]).includes(feature);
    }

    // Manually-set/expired subscriptions: enforce end date
    if (expired) return false;

    if (subscription.tier === 'owner') return true;
    if (subscription.tier === 'pro') {
      return (PRO_FEATURES as readonly string[]).includes(feature);
    }
    return false;
  };

  // ── Free-usage window derived state ────────────────────────────────────────
  // "Free period" = on the early-adopter 90-day grant and not yet a paying
  // Stripe subscriber. Once they subscribe (stripeSubscriptionId set), the
  // reminders stop even though earlyAdopter may still be true during the trial.
  const freeAccessEndDate =
    subscription.earlyAdopter && !subscription.stripeSubscriptionId && subscription.endDate
      ? new Date(subscription.endDate)
      : null;

  const daysUntilFreeExpiry = freeAccessEndDate
    ? Math.max(0, Math.ceil((freeAccessEndDate.getTime() - Date.now()) / 86_400_000))
    : null;

  const isInFreePeriod = !!freeAccessEndDate && freeAccessEndDate.getTime() > Date.now();

  // Redirects the user to Stripe Checkout for the chosen plan/cycle.
  // If they're still inside the free window, create-checkout-session sets a
  // trial_end so billing only begins when the free access expires.
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

  // The 90-day free Pro grant is now applied server-side at signup, so this is a
  // no-op kept for call-site compatibility.
  const activateEarlyAdopter = async () => {
    return;
  };

  // Banner dismissal is the only subscription mutation a client may perform.
  // It goes through a SECURITY DEFINER RPC (the table itself is read-only to clients).
  const dismissEarlyAdopterBanner = () => {
    setSubscription((prev) => ({ ...prev, earlyAdopterBannerDismissed: true }));
    supabase.rpc('dismiss_early_adopter_banner').then(({ error }) => {
      if (error) console.error('Error dismissing early adopter banner:', error);
    });
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
      activateEarlyAdopter,
      dismissEarlyAdopterBanner,
      openCustomerPortal,
      refreshSubscription,
      isInFreePeriod,
      freeAccessEndDate,
      daysUntilFreeExpiry,
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
