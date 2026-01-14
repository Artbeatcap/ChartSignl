-- Migration: Update profiles table for new onboarding flow
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS experience_level text 
  CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stress_reducer text 
  CHECK (stress_reducer IN ('clearer_levels', 'faster_analysis', 'confidence', 'less_screen_time'));

-- Step 2: Update trading_style constraint to new simplified options
-- First, migrate existing values
UPDATE public.profiles 
SET trading_style = 'day' 
WHERE trading_style = 'scalper';

UPDATE public.profiles 
SET trading_style = 'position' 
WHERE trading_style = 'long_term';

-- Step 3: Drop old constraint and add new one
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_trading_style_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_trading_style_check 
  CHECK (trading_style IN ('day', 'swing', 'position'));

-- Step 4: Remove deprecated columns (optional - run after confirming migration works)
-- Uncomment these lines when ready to clean up:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS instruments;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS pain_points;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS goals;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS commitment;

-- Step 5: Create index for analytics queries (optional)
CREATE INDEX IF NOT EXISTS idx_profiles_stress_reducer 
  ON public.profiles(stress_reducer);

CREATE INDEX IF NOT EXISTS idx_profiles_experience_level 
  ON public.profiles(experience_level);

-- Verify changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

