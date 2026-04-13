-- Create subscriptions table to persist user subscription state in Supabase.
-- Replaces the previous localStorage-only implementation.
-- TODO: When Stripe is integrated, add stripe_customer_id and stripe_subscription_id
--       columns here and update rows via Stripe webhooks instead of direct upserts.

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'owner')),
  start_date timestamptz,
  end_date timestamptz,
  trial_used boolean NOT NULL DEFAULT false,
  early_adopter boolean NOT NULL DEFAULT false,
  early_adopter_banner_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);
