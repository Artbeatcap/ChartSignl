import { Hono } from 'hono';
import Stripe from 'stripe';
import { supabaseAdmin, getUserFromToken } from '../lib/supabase.js';
const subscriptionRoute = new Hono();

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripePriceId = process.env.STRIPE_PRICE_ID;

if (!stripeSecretKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY not set. Stripe features will not work.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  // Stripe's TS types require the latest API version literal.
  // Using type assertion since TS types may not be updated for newer API versions
  apiVersion: '2025-12-15.clover' as any,
  typescript: true,
}) : null;

// GET /api/subscription/status - Get user's subscription status
subscriptionRoute.get('/status', async (c) => {
  console.log('[SUBSCRIPTION] Route hit - /status');
  console.log('[SUBSCRIPTION] Request details:', {
    method: c.req.method,
    path: c.req.path,
    url: c.req.url,
    hasAuth: !!c.req.header('Authorization')
  });
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

    // Get subscription from Supabase
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching subscription:', error);
      return c.json({
        success: false,
        error: 'Failed to fetch subscription',
      }, 500);
    }

    if (!subscription) {
      return c.json({
        success: true,
        isActive: false,
      });
    }

    // Check if subscription is active
    const now = new Date();
    const periodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end) 
      : subscription.expires_at 
        ? new Date(subscription.expires_at) 
        : null;
    
    const isActive = subscription.status === 'active' && 
      (!periodEnd || periodEnd > now);

    return c.json({
      success: true,
      isActive,
      expiresAt: subscription.current_period_end || subscription.expires_at || undefined,
      currentPeriodStart: subscription.current_period_start || undefined,
      currentPeriodEnd: subscription.current_period_end || undefined,
      platform: subscription.platform,
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
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
      return c.json({
        success: false,
        error: 'Stripe not configured',
      }, 500);
    }

    if (!stripePriceId) {
      return c.json({
        success: false,
        error: 'Stripe price ID not configured',
      }, 500);
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

    // Get user email for Stripe customer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      return c.json({
        success: false,
        error: 'User email not found',
      }, 404);
    }

    // Get or create Stripe customer
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to subscription record
      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          platform: 'web',
          status: 'free',
        }, { onConflict: 'user_id' });
    }

    // Get the base URL for redirects
    const origin = c.req.header('Origin') || c.req.header('Referer') || 'http://localhost:19006';
    const baseUrl = origin.replace(/\/$/, ''); // Remove trailing slash

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/premium?success=true`,
      cancel_url: `${baseUrl}/premium?canceled=true`,
      metadata: {
        userId: userId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    });

    return c.json({
      success: true,
      checkoutUrl: session.url,
    });

  } catch (error) {
    console.error('Create checkout error:', error);
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
        error: 'Stripe webhook not configured',
      }, 500);
    }

    // Get raw body for webhook signature verification
    const body = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({
        success: false,
        error: 'Missing stripe-signature header',
      }, 400);
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return c.json({
        success: false,
        error: 'Invalid signature',
      }, 400);
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId) {
          console.error('No userId in checkout session metadata');
          break;
        }

        // Get subscription details
        const subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription?.id;

        if (!subscriptionId) {
          console.error('No subscription ID in checkout session');
          break;
        }

        const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
        const customerId = typeof subscription.customer === 'string' 
          ? subscription.customer 
          : subscription.customer.id;

        // Update subscription in Supabase
        await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: subscription.status === 'active' ? 'active' : 'free',
            platform: 'web',
            current_period_start: new Date(((subscription as any).current_period_start ?? 0) * 1000).toISOString(),
            current_period_end: new Date(((subscription as any).current_period_end ?? 0) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        // Update profiles.is_pro
        await supabaseAdmin
          .from('profiles')
          .update({ is_pro: subscription.status === 'active' })
          .eq('id', userId);

        console.log(`Subscription activated for user ${userId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          console.error('No userId in subscription metadata');
          break;
        }

        const customerId = typeof subscription.customer === 'string' 
          ? subscription.customer 
          : subscription.customer.id;

        // Determine status
        let status: 'active' | 'cancelled' | 'expired' = 'active';
        if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
          status = 'cancelled';
        } else if (subscription.status === 'unpaid' || subscription.status === 'past_due') {
          status = 'expired';
        }

        // Update subscription in Supabase
        await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status,
            platform: 'web',
            current_period_start: new Date(((subscription as any).current_period_start ?? 0) * 1000).toISOString(),
            current_period_end: new Date(((subscription as any).current_period_end ?? 0) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        // Update profiles.is_pro
        await supabaseAdmin
          .from('profiles')
          .update({ is_pro: status === 'active' })
          .eq('id', userId);

        console.log(`Subscription updated for user ${userId}: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          console.error('No userId in subscription metadata');
          break;
        }

        // Update subscription status to expired
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        // Update profiles.is_pro
        await supabaseAdmin
          .from('profiles')
          .update({ is_pro: false })
          .eq('id', userId);

        console.log(`Subscription deleted for user ${userId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return c.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});

export default subscriptionRoute;
