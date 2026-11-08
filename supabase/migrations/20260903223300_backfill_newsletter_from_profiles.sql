-- Backfill confirmed ChartSignl accounts onto newsletter_subscribers.
-- The auto-subscribe trigger only fires on new profile inserts, so existing
-- accounts were missing from the daily list. Idempotent: never revives
-- unsubscribed / bounced / complained rows.

insert into public.newsletter_subscribers (email, user_id, status, source)
select p.email, p.id, 'subscribed', 'import'
from public.profiles p
inner join auth.users u on u.id = p.id
where p.email is not null
  and trim(p.email) <> ''
  and u.email_confirmed_at is not null
on conflict (email) do update
  set user_id = excluded.user_id
  where public.newsletter_subscribers.status = 'subscribed';
