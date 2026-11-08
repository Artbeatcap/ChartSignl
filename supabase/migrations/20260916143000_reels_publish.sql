-- Reels publish ledger + private storage bucket.
-- RLS on. Backend uses service_role.

create table if not exists public.reels_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  day_et date not null,
  ticker text,
  caption text not null,
  posting_mode text not null check (posting_mode in ('confirm', 'auto')),
  publisher text not null check (publisher in ('postiz', 'graph', 'none')),
  posted boolean not null default false,
  video_url text,
  provider_id text
);

create unique index if not exists reels_posts_day_et_posted
  on public.reels_posts (day_et)
  where posted;

alter table public.reels_posts enable row level security;
revoke all on table public.reels_posts from anon, authenticated;
grant all on table public.reels_posts to service_role;

insert into storage.buckets (id, name, public)
values ('reels', 'reels', false)
on conflict (id) do update set public = excluded.public;

-- No storage policies for anon/authenticated. Service role uploads; Graph
-- fetches a signed URL issued at publish time.
