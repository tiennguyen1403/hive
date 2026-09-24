-- ─────────────────────────────────────────────────────────── rate limits
--
-- Slice B4b: the public demo stops being something one stranger can spoil
-- for everybody else. The sweep of 24/09 found no limit anywhere — an order
-- is at most twenty pieces, but orders were unlimited, so the shelf could be
-- bought empty in a minute; a photo is at most 1,5 MB, but photos were
-- unlimited, into a 1 GB bucket; sign-in could be hammered until Supabase
-- Auth's own per-IP limit closed the door for every visitor at once.
--
-- The count lives HERE, not in the app: a Vercel function keeps nothing
-- between requests, so a counter in memory would start from zero on every
-- cold start. One table and two functions, all three for the service role
-- only — the app reaches them through `getServiceSupabase()`
-- (`lib/db/rate-limit.ts`), and the rules (which bucket, what limit, what
-- window) are the app's (`lib/rate-limit.ts`), passed in on every call.
--
--   · `rate_hits`: one row per bucket, per visitor, per window, holding how
--     many tokens the visitor has spent in it. The visitor is an HMAC of the
--     address (`subjectOf`), never the address itself; `everyone` is the
--     subject of a limit shared by all visitors.
--   · `take_rate()`: spend `p_cost` tokens, or refuse. Refusing spends
--     nothing. Answers 0 when the tokens were spent, else how many seconds
--     are left of the window.
--   · `tidy_rate_hits()`: forget windows long over, and — after the bucket of
--     photos has been emptied — the photo count, which the daily reset and
--     "Đặt lại dữ liệu mẫu" call.
--
-- FIXED WINDOWS, aligned on the epoch: a ten-minute bucket counts 10:00–10:10,
-- 10:10–10:20, … for everybody. Simple, one row per window, and exact under
-- concurrency (see `take_rate`). The price is a burst of twice the limit
-- across a window boundary, which a demo can afford.
--
-- Sources: https://www.postgresql.org/docs/17/sql-insert.html ("ON CONFLICT
-- DO UPDATE guarantees an atomic INSERT or UPDATE outcome … even under high
-- concurrency"; "if a row was locked but not updated because an ON CONFLICT
-- DO UPDATE ... WHERE clause condition was not satisfied, the row will not be
-- returned"; INSERT, UPDATE and SELECT privileges it needs),
-- https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-BIN
-- (`date_bin`), https://supabase.com/docs/guides/database/postgres/row-level-security
-- ("no data is accessible through the API when using a publishable key, until
-- you create policies"; the service role "has the bypassrls attribute";
-- revoke the grants from both client roles),
-- https://supabase.com/docs/guides/database/functions (`set search_path = ''`,
-- revoking execute from public and anon).

-- ─────────────────────────────────────────────────────────────── the table
-- The eleven bucket names are `RATE_BUCKETS` in `lib/rate-limit.ts`, and
-- `take_rate()` below lists them once more: three lists that must agree,
-- which `lib/db/rate-limit.dbtest.ts` checks by spending one token of every
-- bucket the app knows.
create table public.rate_hits (
  bucket       text        not null check (bucket in (
    'order_place',
    'order_units',
    'sign_in',
    'sign_up',
    'password',
    'account',
    'admin',
    'admin_create',
    'upload',
    'upload_global',
    'reset'
  )),
  -- 32 hex characters of HMAC, or `everyone`.
  subject      text        not null check (length(subject) between 1 and 64),
  -- The start of the window: `date_bin(window, now, epoch)`.
  window_start timestamptz not null,
  hits         integer     not null check (hits >= 0),
  primary key (bucket, subject, window_start)
);

-- Row level security on, and NO policy: nobody holding the publishable key —
-- signed in or not — reads or writes a row. A new table in `public` comes with
-- every privilege granted to the three API roles, and a policy would not take
-- those back, so they go; the service role (which bypasses row level
-- security) keeps exactly what the two functions below do with it: read,
-- insert, update, delete. No truncate, no references, no trigger.
alter table public.rate_hits enable row level security;

revoke all on public.rate_hits from anon, authenticated, service_role;
grant select, insert, update, delete on public.rate_hits to service_role;

-- ──────────────────────────────────────────────────────────── spend tokens
-- `p_cost` tokens of `p_bucket` for `p_subject`, at most `p_limit` in a
-- window of `p_window_seconds`, at `p_now` (the database's own clock unless a
-- test names another instant, to cross into the next window without waiting).
--
--   · 0         the tokens are spent: go ahead;
--   · n > 0     refused: n seconds are left of the window (at least 1), and
--               nothing was written.
--
-- A cost above the whole limit can never fit and is refused without a write.
-- Otherwise ONE statement decides: insert the window's row with the cost, or,
-- when the row is there, add the cost only while the sum stays within the
-- limit. Postgres takes the row lock before it evaluates that condition, so
-- two visitors racing for the last token are serialised on the row and the
-- second one sees the first one's sum — exactly one of them gets it. A row
-- whose condition fails is locked but neither updated nor returned, which is
-- how "refused" is read back.
--
-- A bad argument — a cost or a limit below 1, a window outside one second to
-- one day, an unknown bucket, an empty or overlong subject — is `BAD_INPUT`
-- (SQLSTATE P0001), the convention of every function since slice B2.
--
-- `security invoker` (the default): it runs as its caller, and the only
-- caller with EXECUTE is the service role, which holds the table privileges
-- above. The empty `search_path` is kept anyway, so every name is qualified.
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
       'sign_in',
       'sign_up',
       'password',
       'account',
       'admin',
       'admin_create',
       'upload',
       'upload_global',
       'reset'
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

-- ──────────────────────────────────────────────────────────────── tidy up
-- Forget every window that started more than two days before `p_now` — the
-- longest window is a day, so such a window is certainly over — and every row
-- of the buckets named in `p_clear`, whatever its window. Answers how many
-- rows went.
--
-- `p_clear` is for the photo bucket: `upload_global` counts photos stored
-- today so the 1 GB bucket cannot fill, and once "Đặt lại dữ liệu mẫu" or the
-- daily reset has emptied the bucket, that count describes photos that no
-- longer exist. A name that is not a bucket matches no row.
create or replace function public.tidy_rate_hits(
  p_now   timestamptz default now(),
  p_clear text[]      default '{}'
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_gone integer;
begin
  if p_now is null then
    raise exception using message = 'BAD_INPUT';
  end if;

  delete from public.rate_hits r
   where r.window_start < p_now - interval '2 days'
      or r.bucket = any (coalesce(p_clear, '{}'::text[]));

  get diagnostics v_gone = row_count;
  return v_gone;
end;
$$;

revoke execute on function public.tidy_rate_hits(timestamptz, text[])
  from public, anon, authenticated;
grant  execute on function public.tidy_rate_hits(timestamptz, text[])
  to service_role;
