-- Add Stripe-specific columns to the subscriptions table.
-- stripe_customer_id  — Stripe Customer object ID (cus_xxx), stored after first checkout.
-- stripe_subscription_id — Stripe Subscription object ID (sub_xxx), stored by webhook after payment.
-- Both are set by the stripe-webhook edge function; never written from the frontend.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
