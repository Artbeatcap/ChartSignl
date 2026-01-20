-- LevelSignal Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Extends Supabase auth.users with app-specific data
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  email text not null,
  display_name text,
  
  -- Trading preferences from onboarding
  trading_style text check (trading_style in ('scalper', 'day', 'swing', 'position', 'long_term')),
  instruments text[] default '{}',
  pain_points text[] default '{}',
  goals text[] default '{}',
  commitment text,
  
  -- Subscription status
  is_pro boolean default false,
  pro_expires_at timestamptz,
  
  -- Onboarding completion
  onboarding_completed boolean default false
);

-- Index for faster lookups
create index idx_profiles_email on public.profiles(email);

-- ============================================
-- USAGE COUNTERS TABLE
-- ============================================
-- Tracks free tier usage
create table public.usage_counters (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  free_analyses_used integer default 0 not null,
  free_analyses_week_start timestamptz,
  last_analysis_at timestamptz,
  monthly_analyses integer default 0,
  month_start date default date_trunc('month', now())::date
);

-- ============================================
-- CHART ANALYSES TABLE
-- ============================================
-- Stores all chart analysis results
create table public.chart_analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  
  -- Image reference
  image_url text not null,
  image_path text, -- Storage path for cleanup
  
  -- Extracted metadata
  symbol text,
  timeframe text,
  
  -- Full analysis JSON
  analysis_json jsonb not null,
  
  -- Denormalized for list views
  headline text,
  trend_type text,
  level_count integer default 0
);

-- Indexes for common queries
create index idx_chart_analyses_user_id on public.chart_analyses(user_id);
create index idx_chart_analyses_created_at on public.chart_analyses(created_at desc);
create index idx_chart_analyses_symbol on public.chart_analyses(symbol);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.usage_counters enable row level security;
alter table public.chart_analyses enable row level security;

-- Profiles: users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Usage counters: users can only read their own usage
create policy "Users can view own usage"
  on public.usage_counters for select
  using (auth.uid() = user_id);

-- Chart analyses: users can only access their own analyses
create policy "Users can view own analyses"
  on public.chart_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own analyses"
  on public.chart_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own analyses"
  on public.chart_analyses for delete
  using (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  
  insert into public.usage_counters (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update timestamp trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- Reset monthly counter on new month
create or replace function public.check_and_reset_monthly_counter()
returns trigger as $$
begin
  if new.month_start < date_trunc('month', now())::date then
    new.monthly_analyses := 0;
    new.month_start := date_trunc('month', now())::date;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger reset_monthly_counter
  before update on public.usage_counters
  for each row execute procedure public.check_and_reset_monthly_counter();

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Run this in Supabase Dashboard > Storage > Create new bucket

-- Bucket name: chart_uploads
-- Public: Yes (for serving images)
-- File size limit: 10MB
-- Allowed mime types: image/png, image/jpeg, image/webp

-- Storage policies (add via Dashboard or SQL):
-- INSERT: authenticated users can upload
-- SELECT: public can read
-- DELETE: users can delete their own files

-- Storage policy SQL (run after creating bucket):
/*
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check (bucket_id = 'chart_uploads' and auth.role() = 'authenticated');

create policy "Public can view chart uploads"
  on storage.objects for select
  using (bucket_id = 'chart_uploads');

create policy "Users can delete own uploads"
  on storage.objects for delete
  using (bucket_id = 'chart_uploads' and auth.uid()::text = (storage.foldername(name))[1]);
*/

-- ============================================
-- HELPFUL QUERIES
-- ============================================

-- Get user's analysis history with pagination
-- select 
--   id, 
--   created_at, 
--   image_url, 
--   symbol, 
--   timeframe, 
--   headline
-- from public.chart_analyses
-- where user_id = $1
-- order by created_at desc
-- limit $2 offset $3;

-- Check if user can analyze (free tier)
-- select 
--   uc.free_analyses_used,
--   p.is_pro,
--   case 
--     when p.is_pro then true
--     when uc.free_analyses_used < 3 then true
--     else false
--   end as can_analyze
-- from public.profiles p
-- join public.usage_counters uc on uc.user_id = p.id
-- where p.id = $1;
