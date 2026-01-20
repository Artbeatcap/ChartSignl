-- Free analyses: 3 per week (reset each ISO week, Monday 00:00 UTC)
-- Add week boundary so free_analyses_used can be reset when a new week starts.

ALTER TABLE public.usage_counters
  ADD COLUMN IF NOT EXISTS free_analyses_week_start TIMESTAMPTZ;

COMMENT ON COLUMN public.usage_counters.free_analyses_week_start IS 'Start of the ISO week (Monday 00:00 UTC) for the current free_analyses_used period; when this is before the current week, free_analyses_used is effectively 0.';
