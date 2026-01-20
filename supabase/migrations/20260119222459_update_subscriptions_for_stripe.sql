-- Update subscriptions table for hybrid subscription system (RevenueCat + Stripe)
-- Run this in the Supabase SQL Editor

-- Add new columns for Stripe integration
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS revenuecat_subscriber_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Update status constraint to include 'expired'
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('free', 'active', 'cancelled', 'expired'));

-- Update platform constraint to be more specific
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_platform_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_platform_check 
  CHECK (platform IN ('web', 'ios', 'android') OR platform IS NULL);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id 
  ON public.subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id 
  ON public.subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_subscriber_id 
  ON public.subscriptions(revenuecat_subscriber_id);

-- Add comment for documentation
COMMENT ON TABLE public.subscriptions IS 'Stores subscription information for both RevenueCat (mobile) and Stripe (web) platforms';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe subscription ID for web subscriptions';
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'Stripe customer ID for web subscriptions';
COMMENT ON COLUMN public.subscriptions.revenuecat_subscriber_id IS 'RevenueCat subscriber ID for mobile subscriptions';
COMMENT ON COLUMN public.subscriptions.current_period_start IS 'Start of current billing period';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'End of current billing period';
