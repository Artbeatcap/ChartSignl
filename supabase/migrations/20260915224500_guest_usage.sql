-- Guest analyze quota + landing mid-page newsletter source
-- RLS enabled with ZERO policies. Backend uses service_role and bypasses RLS.

create table if not exists public.guest_usage (
  id uuid primary key default gen_random_uuid(),
  guest_key uuid not null,
  ip_hash text not null,
  last_used_at timestamptz not null default now(),
  used_count integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_guest_usage_guest_key
  on public.guest_usage (guest_key);

create index if not exists idx_guest_usage_ip_hash
  on public.guest_usage (ip_hash);

create index if not exists idx_guest_usage_last_used_at
  on public.guest_usage (last_used_at desc);

alter table public.guest_usage enable row level security;

revoke all on table public.guest_usage from anon, authenticated;
grant all on table public.guest_usage to service_role;

alter type public.subscriber_source add value if not exists 'landing_mid';
