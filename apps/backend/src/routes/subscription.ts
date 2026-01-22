import { Hono } from 'hono';
import Stripe from 'stripe';
import { supabaseAdmin, getUserFromToken } from '../lib/supabase.js';

const subscriptionRoute = new Hono();

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripePriceId = process.env.STRIPE_PRICE_ID;
const webUrl = process.env.WEB_URL || 'https://chartsignl.com';

if (!stripeSecretKey) {
  console.warn('[Subscription] STRIPE_SECRET_KEY not set - Stripe features will be disabled');
} else if (stripeSecretKey.startsWith('pk_')) {
  console.error('[Subscription] ERROR: STRIPE_SECRET_KEY appears to be a publishable key (starts with pk_). Please use a secret key (starts with sk_).');
}

const stripe = stripeSecretKey && stripeSecretKey.startsWith('sk_') ? new Stripe(stripeSecretKey, {
  // Keep in sync with installed Stripe typings
  apiVersion: '2025-12-15.clover',
}) : null;

// GET /api/subscription/status - Get subscription status
subscriptionRoute.get('/status', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Missing authorization token',
      }, 401);
    }

    const token = authHeader.slice(7);
    const userId = await getUserFromToken(token);

    if (!userId) {
      return c.json({
        success: false,
        error: 'Invalid authorization token',
      }, 401);
    }

    type SubscriptionRow = {
      status: string | null;
      platform: string | null;
      expires_at?: string | null;
      current_period_end?: string | null;
      current_period_start?: string | null;
    };

    // Query Supabase subscriptions table
    // Try to select new columns first, fallback to old schema if migration not run
    let subscription: SubscriptionRow | null = null;
    let error: any;
    
    try {
      const result = await supabaseAdmin
        .from('subscriptions')
        .select('status, platform, current_period_end, expires_at')
        .eq('user_id', userId)
        .maybeSingle();
      subscription = result.data as SubscriptionRow | null;
      error = result.error;
    } catch (err: any) {
      // If new columns don't exist, try with old schema
      if (err.message?.includes('does not exist') || err.code === '42703') {
        console.log('[Subscription] New columns not found, using old schema');
        const result = await supabaseAdmin
          .from('subscriptions')
          .select('status, platform, expires_at')
          .eq('user_id', userId)
          .maybeSingle();
        subscription = result.data as SubscriptionRow | null;
        error = result.error;
      } else {
        throw err;
      }
    }

    if (error) {
      console.error('[Subscription] Error querying subscription:', error);
      return c.json({
        success: false,
        error: 'Failed to get subscription status',
      }, 500);
    }

    // Determine if user is pro
    const isPro = subscription?.status === 'active';
    // Handle both old schema (expires_at) and new schema (current_period_end)
    const expiresAt = subscription?.current_period_end 
      ? new Date(subscription.current_period_end)
      : subscription?.expires_at 
        ? new Date(subscription.expires_at)
        : null;

    return c.json({
      success: true,
      isPro,
      expiresAt: expiresAt?.toISOString() || null,
      platform: subscription?.platform || null,
    });

  } catch (error) {
    console.error('[Subscription] Get status error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});

// POST /api/subscription/create-checkout - Create Stripe checkout session
subscriptionRoute.post('/create-checkout', async (c) => {
  try {
    if (!stripe) {
      console.error('[Subscription] Stripe not initialized. Check STRIPE_SECRET_KEY environment variable.');
      return c.json({
        success: false,
        error: 'Stripe is not configured. Please check server configuration.',
      }, 500);
    }
    
    if (!stripePriceId) {
      console.error('[Subscription] STRIPE_PRICE_ID not set');
      return c.json({
        success: false,
        error: 'Stripe price ID is not configured',
      }, 500);
    }
    
    // Validate that it's a price ID, not a product ID
    if (stripePriceId.startsWith('prod_')) {
      console.error('[Subscription] ERROR: STRIPE_PRICE_ID appears to be a product ID (starts with prod_). Please use a price ID (starts with price_).');
      return c.json({
        success: false,
        error: 'Invalid Stripe Price ID. You provided a product ID instead of a price ID. Price IDs start with "price_". Please check your STRIPE_PRICE_ID environment variable.',
      }, 500);
    }
    
    if (!stripePriceId.startsWith('price_')) {
      console.warn('[Subscription] WARNING: STRIPE_PRICE_ID does not start with "price_". This may be incorrect.');
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Missing authorization token',
      }, 401);
    }

    const token = authHeader.slice(7);
    const userId = await getUserFromToken(token);

    if (!userId) {
      return c.json({
        success: false,
        error: 'Invalid authorization token',
      }, 401);
    }

    // Get user email from Supabase
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError) {
      console.error('[Subscription] Error getting user:', userError);
      return c.json({
        success: false,
        error: 'Failed to get user information',
      }, 500);
    }
    
    if (!userData?.user?.email) {
      console.error('[Subscription] User email not found for userId:', userId);
      return c.json({
        success: false,
        error: 'User email not found',
      }, 500);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: userData.user.email,
      client_reference_id: userId,
      mode: 'subscription',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${webUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webUrl}/premium`, // Return to premium page when cancelled
      metadata: {
        userId,
      },
    });

    console.log('[Subscription] Created checkout session:', session.id);

    return c.json({
      success: true,
      checkoutUrl: session.url,
    });

  } catch (error) {
    console.error('[Subscription] Create checkout error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});

// POST /api/subscription/webhook - Handle Stripe webhooks
subscriptionRoute.post('/webhook', async (c) => {
  try {
    if (!stripe || !stripeWebhookSecret) {
      return c.json({
        success: false,
        error: 'Stripe webhook secret not configured',
      }, 500);
    }

    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({
        success: false,
        error: 'Missing stripe-signature header',
      }, 400);
    }

    // Get raw body for webhook verification
    // Note: For Stripe webhooks, we need the raw body as a string
    // Hono's req.raw gives us access to the underlying request
    const rawRequest = c.req.raw;
    const body = await rawRequest.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error('[Subscription] Webhook signature verification failed:', err.message);
      return c.json({
        success: false,
        error: 'Invalid signature',
      }, 400);
    }

    console.log('[Subscription] Webhook event received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;

        if (!userId) {
          console.error('[Subscription] No userId in checkout session');
          break;
        }

        // Get subscription details
        const subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription?.id;

        const customerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;

        if (!subscriptionId) {
          console.error('[Subscription] No subscription ID in checkout session');
          break;
        }

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as Stripe.Subscription;
        const subscriptionItem = subscription.items?.data?.[0];

        // Insert/update subscription in Supabase
        const { error: upsertError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId || null,
            status: subscription.status === 'active' ? 'active' : 'cancelled',
            platform: 'web',
            current_period_start: subscriptionItem?.current_period_start
              ? new Date(subscriptionItem.current_period_start * 1000).toISOString()
              : null,
            current_period_end: subscriptionItem?.current_period_end
              ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (upsertError) {
          console.error('[Subscription] Error upserting subscription:', upsertError);
        } else {
          console.log('[Subscription] Subscription created/updated for user:', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionItem = subscription.items?.data?.[0];
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

        if (!customerId) {
          console.error('[Subscription] No customer ID in subscription update');
          break;
        }

        // Find user by Stripe customer ID
        const { data: subscriptionData } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!subscriptionData) {
          console.error('[Subscription] No subscription found for customer:', customerId);
          break;
        }

        // Update subscription status
        const status = subscription.status === 'active' ? 'active' : 'cancelled';
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status,
            current_period_start: subscriptionItem?.current_period_start
              ? new Date(subscriptionItem.current_period_start * 1000).toISOString()
              : null,
            current_period_end: subscriptionItem?.current_period_end
              ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('[Subscription] Error updating subscription:', updateError);
        } else {
          console.log('[Subscription] Subscription updated for user:', subscriptionData.user_id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Update subscription status to cancelled
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('[Subscription] Error cancelling subscription:', updateError);
        } else {
          console.log('[Subscription] Subscription cancelled:', subscription.id);
        }
        break;
      }

      default:
        console.log('[Subscription] Unhandled event type:', event.type);
    }

    return c.json({ received: true });

  } catch (error) {
    console.error('[Subscription] Webhook error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});

export default subscriptionRoute;
