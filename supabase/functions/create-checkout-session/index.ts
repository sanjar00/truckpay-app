// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Price IDs for each plan/billing cycle combination.
// Bi-weekly = charged every 2 weeks ($15 Pro / $30 Owner). Annual = $300 / $600.
const PRICE_IDS = {
  pro: {
    biweekly: 'price_1TjbA0DDJ9hkmBpwXxBFh2wR',  // $15 / 2 weeks
    annual:   'price_1TjbA9DDJ9hkmBpwBnCVMIOU',  // $300 / year
  },
  owner: {
    biweekly: 'price_1TjbACDDJ9hkmBpwt1rRJlG8',  // $30 / 2 weeks
    annual:   'price_1TjbAEDDJ9hkmBpw8Vyi5x74',  // $600 / year
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the caller via their Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { tier, billingCycle, successUrl, cancelUrl } = await req.json();

    const priceId = PRICE_IDS[tier]?.[billingCycle];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Invalid tier or billingCycle: ${tier}/${billingCycle}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    // Look up existing Stripe customer from our subscriptions table
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, end_date')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId: string;
    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Delayed activation: if the user is still inside their 90-day free window,
    // the paid plan should not start billing until that free access expires.
    // Stripe's trial_end does exactly this — the card is collected now but the
    // first charge happens at the free-usage expiration date. Stripe requires
    // trial_end to be at least ~48h out, so only apply it when there's room.
    const subscriptionData: Record<string, unknown> = { metadata: { user_id: user.id } };
    if (existingSub?.end_date) {
      const trialEndSec = Math.floor(new Date(existingSub.end_date).getTime() / 1000);
      const minTrialEnd = Math.floor(Date.now() / 1000) + 49 * 60 * 60; // 49h safety margin
      if (trialEndSec > minTrialEnd) {
        subscriptionData.trial_end = trialEndSec;
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.get('origin') || 'https://truckpay.app'}/dashboard?checkout=success`,
      cancel_url: cancelUrl || `${req.headers.get('origin') || 'https://truckpay.app'}/dashboard`,
      // Pass user_id in both places — session metadata for checkout.session.completed,
      // subscription metadata for subscription update/delete events
      metadata: { user_id: user.id },
      subscription_data: subscriptionData,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
