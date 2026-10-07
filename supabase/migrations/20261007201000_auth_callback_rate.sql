-- ─────────────────────────── a limit for the end of the Google round trip
--
-- Slice B19, finding F16 of the v6 sweep. `/auth/callback`
-- (`app/auth/callback/route.ts`) trades whatever `?code=` it is handed for a
-- session: each request is one call to Supabase Auth's `/token`, made from the
-- server's address. Somebody sending codes that cannot trade would spend, from
-- Vercel's address, the rate limit Supabase Auth keeps for everybody, and
-- nobody could sign in with Google meanwhile.
--
-- So the callback spends a token of a new bucket, `auth_callback` — ten per
-- five minutes per visitor (`RATE_RULES.auth_callback`, `lib/rate-limit.ts`)
-- — before it asks Auth anything, and a visitor out of tokens goes back to
-- "Đăng nhập" with the same line as any other failed Google sign-in. It is
-- declared the way `lookup` was (`20260930150000_order_lookup.sql`): a bucket
-- name is written in three places that must agree — `RATE_BUCKETS`, the check
-- on `rate_hits.bucket`, and the list `take_rate()` refuses anything outside
-- — and the two SQL ones gain the fourteenth name here.
-- `lib/db/rate-limit.dbtest.ts` spends a token of every bucket the app knows,
-- so a name missing from either fails it. No row is rewritten: the new check
-- only widens the old one.
--
-- Sources: https://supabase.com/docs/guides/database/functions (`revoke
-- execute on function … from public`),
-- https://www.postgresql.org/docs/current/sql-altertable.html (dropping and
-- adding a check constraint).

alter table public.rate_hits drop constraint rate_hits_bucket_check;
alter table public.rate_hits add constraint rate_hits_bucket_check check (bucket in (
  'order_place',
  'order_units',
  'lookup',
  'sign_in',
  'sign_up',
  'password',
  'account',
  'keep',
  'admin',
  'admin_create',
  'upload',
  'upload_global',
  'reset',
  'auth_callback'
));

-- Replaces the B11 version in `20260930150000_order_lookup.sql`; the one
-- change is `auth_callback` in the list. Same signature, so its owner and its
-- grants stay as they were (restated below all the same, as every replaced
-- function in this project is).
create or replace function public.take_rate(
  p_bucket         text,
  p_subject        text,
  p_cost           integer,
  p_limit          integer,
  p_window_seconds integer,
  p_now            timestamptz default now()
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_window interval;
  v_start  timestamptz;
  v_wait   integer;
  v_hits   integer;
begin
  if p_bucket is null
     or not (p_bucket = any (array[
       'order_place',
       'order_units',
       'lookup',
       'sign_in',
       'sign_up',
       'password',
       'account',
       'keep',
       'admin',
       'admin_create',
       'upload',
       'upload_global',
       'reset',
       'auth_callback'
     ]))
     or p_subject is null or length(p_subject) not between 1 and 64
     or p_cost is null or p_cost < 1
     or p_limit is null or p_limit < 1
     or p_window_seconds is null or p_window_seconds not between 1 and 86400
     or p_now is null then
    raise exception using message = 'BAD_INPUT';
  end if;

  v_window := make_interval(secs => p_window_seconds);
  -- The start of the window `p_now` falls in, counted from the epoch.
  v_start := date_bin(v_window, p_now, to_timestamp(0));
  -- Seconds to its end, rounded up: a refusal never says "0".
  v_wait := greatest(1, ceil(extract(epoch from (v_start + v_window - p_now)))::integer);

  if p_cost > p_limit then
    return v_wait;
  end if;

  insert into public.rate_hits as r (bucket, subject, window_start, hits)
  values (p_bucket, p_subject, v_start, p_cost)
  on conflict (bucket, subject, window_start) do update
     set hits = r.hits + excluded.hits
   where r.hits + excluded.hits <= p_limit
  returning r.hits into v_hits;

  if v_hits is null then
    return v_wait;
  end if;
  return 0;
end;
$$;

revoke execute on function public.take_rate(text, text, integer, integer, integer, timestamptz)
  from public, anon, authenticated;
grant  execute on function public.take_rate(text, text, integer, integer, integer, timestamptz)
  to service_role;
