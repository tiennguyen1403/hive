-- ─────────────────────── the order lookup says what did not match
--
-- Slice B11. Round v4's lookup screen is the Feed mock's
-- (`prototype/explore/feed/track.js`, and `lookup` in `shared/data.js`). When
-- a code and a phone number find nothing, it says which of the two is wrong,
-- under that field: "Không có đơn nào mang mã này" under the code, "Số điện
-- thoại không khớp với đơn" under the number. The user chose that on 30/09,
-- for this screen only, over QĐ-16's one sentence for both. `track_order()`
-- cannot say which — it answers the order or null — so:
--
--   · `lookup_order(code, phone)` is a new door beside it. It answers FOUND
--     with the order, or NO_ORDER (no order carries this code), or
--     PHONE_MISMATCH (one does, with another number on it).
--
--   · FOUND hands out only what the lookup screen prints for somebody who is
--     not signed in: the code, when it was placed, the status and the moments
--     of the steps passed, how it is paid, the pieces, the fees, the discount
--     and its code. Nothing of where the parcel goes — no recipient, no
--     address, no phone, no e-mail, no note, no owner, no delivery service, no
--     courier: "The address and the actions that need the account stay on the
--     order page" (`track.js`). The keys are LISTED from `order_json()`, not
--     stripped from it, so a key that joins that document later does not
--     reach a stranger by default.
--
--   · Telling the two misses apart tells a stranger which codes exist. The
--     price of it is a limit: a new rate bucket, `lookup`, ten lookups per ten
--     minutes per visitor (`lib/rate-limit.ts`), which the app spends before
--     it asks this function (`lib/db/order-lookup.ts`). It is declared the way
--     `keep` was (`20260929120000_account_state.sql`): the check on
--     `rate_hits.bucket` and the list inside `take_rate()` gain the name.
--
--   · `track_order()` is NOT touched. The deploy puts the database up before
--     the code, and the code that is still running then — the v3 `/track`
--     page — calls it exactly as it did.
--
-- WHO MAY CALL IT. `anon` and `authenticated`, like `track_order()`: the
-- lookup is for somebody without an account, or signed in to another one.
-- `security definer`, because neither role may read `orders` (row level
-- security, and `anon` has no grant on the table at all); the function decides
-- what leaves before anything does, and runs `order_json()` as its owner, as
-- `track_order()` does. No table gains a policy or a grant.
--
-- The app reads the code and the number the way it always has
-- (`normaliseOrderCode`, `phoneDigits` in `lib/lookup.ts`) and sends exact
-- strings, `DH-2425` and `0908221447`, so this compares them as they are. A
-- null code finds no order; a null number matches none.
--
-- Sources: https://supabase.com/docs/guides/database/functions (with `security
-- definer` "you *must* set the `search_path`"; `revoke execute on function …
-- from public`), https://supabase.com/docs/guides/database/postgres/row-level-security
-- ("Once RLS is enabled, no data is accessible through the API when using a
-- publishable key, until you create policies"),
-- https://www.postgresql.org/docs/17/functions-json.html (`jsonb - text`:
-- "Deletes a key (and its value) from a JSON object").

-- ───────────────────────────────────────────────────────── lookup_order
create or replace function public.lookup_order(p_code text, p_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_order jsonb;
begin
  select o.phone
    into v_phone
    from public.orders o
   where o.code = p_code;

  if not found then
    return jsonb_build_object('outcome', 'NO_ORDER');
  end if;

  if v_phone is distinct from p_phone then
    return jsonb_build_object('outcome', 'PHONE_MISMATCH');
  end if;

  v_order := public.order_json(p_code);

  -- What the lookup screen prints, key by key. The courier the handover may
  -- have recorded rides inside SHIPPING's status and is not printed there, so
  -- it goes; the tracking code stays.
  return jsonb_build_object(
    'outcome', 'FOUND',
    'order', jsonb_build_object(
      'code',           v_order -> 'code',
      'placedAt',       v_order -> 'placedAt',
      'status',         (v_order -> 'status') - 'carrier',
      'moments',        v_order -> 'moments',
      'payment',        v_order -> 'payment',
      'lines',          v_order -> 'lines',
      'shippingFeeVnd', v_order -> 'shippingFeeVnd',
      'codFeeVnd',      v_order -> 'codFeeVnd',
      'discountVnd',    v_order -> 'discountVnd',
      'promo',          v_order -> 'promo'
    )
  );
end;
$$;

-- Supabase's default privileges hand EXECUTE on a new function in `public` to
-- the API roles; this one states who may call it, as `track_order()` does.
revoke execute on function public.lookup_order(text, text) from public;
grant  execute on function public.lookup_order(text, text) to anon, authenticated;

-- ─────────────────────────────────────────── the lookup's own limit
-- A bucket name is written in three places that must agree
-- (`20260924150000_rate_limits.sql`): `RATE_BUCKETS` in `lib/rate-limit.ts`,
-- the check on `rate_hits.bucket`, and the list `take_rate()` refuses anything
-- outside. The two SQL ones gain the thirteenth name here;
-- `lib/db/rate-limit.dbtest.ts` spends a token of every bucket the app knows,
-- so a name missing from either fails it. No row is rewritten: the new check
-- only widens the old one.

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
  'reset'
));

-- Replaces the B9 version in `20260929120000_account_state.sql`; the one
-- change is `lookup` in the list. Same signature, so its owner and its grants
-- stay as they were (restated below all the same, as every replaced function
-- in this project is).
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
