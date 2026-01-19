-- Subscriptions table for RevenueCat and Stripe integration
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (status IN ('active', 'cancelled', 'expired', 'free')),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  product_id VARCHAR(100),
  -- Stripe fields
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  -- RevenueCat fields
  revenuecat_subscriber_id TEXT,
  -- Subscription period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add Stripe fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_subscription_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_customer_id TEXT;
  END IF;
  -- Add RevenueCat field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'revenuecat_subscriber_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN revenuecat_subscriber_id TEXT;
  END IF;
  -- Add period fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'current_period_start') THEN
    ALTER TABLE public.subscriptions ADD COLUMN current_period_start TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'current_period_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN current_period_end TIMESTAMPTZ;
  END IF;
  -- Update status constraint if needed
  BEGIN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check 
      CHECK (status IN ('active', 'cancelled', 'expired', 'free'));
  EXCEPTION WHEN OTHERS THEN
    -- Constraint might not exist or already be correct
    NULL;
  END;
  -- Update platform constraint if needed
  BEGIN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_platform_check;
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_platform_check 
      CHECK (platform IN ('web', 'ios', 'android'));
  EXCEPTION WHEN OTHERS THEN
    -- Constraint might not exist or already be correct
    NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscription" 
  ON public.subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" 
  ON public.subscriptions FOR ALL 
  USING (auth.role() = 'service_role');

-- Allow authenticated users to upsert their own subscription
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.update_subscription_updated_at();


