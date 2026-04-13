// @ts-nocheck
// IMPORTANT: Deploy this function with --no-verify-jwt so Stripe can call it without a Supabase token:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Required secrets (set via: supabase secrets set KEY=value):
//   STRIPE_SECRET_KEY        — from Stripe Dashboard → Developers → API keys
//   STRIPE_WEBHOOK_SECRET    — from Stripe Dashboard → Webhooks → signing secret (whsec_...)
//   SUPABASE_SERVICE_ROLE_KEY — auto-available in edge functions, no manual setup needed
//
// Webhook endpoint to register in Stripe Dashboard:
//   https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
//
// Events to enable in Stripe Dashboard:
//   - checkout.session.completed
//   - customer.subscription.updated
//   - customer.subscription.deleted

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Maps a Stripe price ID to a TruckPay subscription tier
const PRICE_TO_TIER: Record<string, 'pro' | 'owner'> = {
  'price_1TLainDDJ9hkmBpwH8pF7LXu': 'pro',    // Pro Monthly
  'price_1TLaiqDDJ9hkmBpw2EEWTeIv': 'pro',    // Pro Annual
  'price_1TLaitDDJ9hkmBpwG40JiG5d': 'owner',  // Owner-Op Monthly
  'price_1TLaiwDDJ9hkmBpwZ1jI886S': 'owner',  // Owner-Op Annual
};

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!webhookSecret || !stripeKey) {
    console.error('Missing Stripe environment variables');
    return new Response('Server misconfigured', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Use service role key — webhook writes bypass RLS
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) {
          console.error('checkout.session.completed: missing user_id in metadata');
          break;
        }

        // Fetch full subscription details from Stripe
        const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = stripeSub.items.data[0].price.id;
        const tier = PRICE_TO_TIER[priceId] ?? 'pro';

        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            tier,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            start_date: new Date(stripeSub.current_period_start * 1000).toISOString(),
            end_date: new Date(stripeSub.current_period_end * 1000).toISOString(),
            trial_used: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        console.log(`Activated ${tier} for user ${userId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const userId = stripeSub.metadata?.user_id;
        if (!userId) {
          console.error('customer.subscription.updated: missing user_id in metadata');
          break;
        }

        const priceId = stripeSub.items.data[0].price.id;
        const tier = PRICE_TO_TIER[priceId] ?? 'pro';
        const isActive = stripeSub.status === 'active' || stripeSub.status === 'trialing';

        await supabase.from('subscriptions').update({
          tier: isActive ? tier : 'free',
          end_date: new Date(stripeSub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', stripeSub.id);

        console.log(`Updated subscription ${stripeSub.id} → ${isActive ? tier : 'free'}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;

        await supabase.from('subscriptions').update({
          tier: 'free',
          end_date: null,
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', stripeSub.id);

        console.log(`Cancelled subscription ${stripeSub.id} → reverted to free`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    // Return 200 anyway — Stripe retries on non-2xx, and we don't want infinite retries
    // for errors that are our fault (bad data, etc.)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
