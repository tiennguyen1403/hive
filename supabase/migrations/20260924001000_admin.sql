-- ──────────────────────────────────────────────────────────── admin schema
--
-- Slice B3a: the back office stops being a simulation for everything that
-- happens to an ORDER. Until this file every admin button wrote into
-- `localStorage` (`brand.adminSim`) and the shop never heard about it; from
-- here a payment, a handover, a delivery, a cancellation, a note and an
-- address change are rows in Postgres that the shopper's own screens read.
--
-- Four things arrive together, because none of them is useful alone:
--
--   · a ROLE. `public.is_admin()` reads `app_metadata.role` out of the
--     caller's JWT. `app_metadata` is written only with the service role —
--     "raw_app_meta_data — cannot be updated by the user, so it's a good
--     place to store authorization data"
--     (https://supabase.com/docs/guides/database/postgres/row-level-security)
--     — and it travels in every access token, so no Custom Access Token Hook
--     has to be configured locally AND on the hosted project (a deliberate
--     departure from tasks/backend.md §6.5, decided in the B3a brief).
--   · the TRANSITIONS. Six `admin_*` functions, each with a fixed guard: an
--     order moves only along the edges the guard names, or the call fails
--     with `NOT_ALLOWED`. No role the API hands out may update `orders`
--     directly — the functions are the rules, exactly as in slice B2.
--   · the LOG. `public.events` is append-only and is the only record of what
--     happened: every function that writes an order writes its event in the
--     same transaction, so the log cannot miss a step the data took.
--   · the REAL CLOCK. `demo_anchor()` is the most recent 18:50 in Vietnam;
--     `reset_demo(demo_anchor())` shifts the sample data onto it by a whole
--     number of days, so every hour and minute in `data/` survives, every
--     recorded moment lies in the past and every deadline in the future.
--
-- Sources: https://supabase.com/docs/guides/database/postgres/row-level-security
-- (auth.jwt(), app_metadata, `to` clauses, wrapping functions in select),
-- https://supabase.com/docs/guides/database/functions (security definer,
-- `set search_path = ''`, revoking execute from public and anon),
-- https://www.postgresql.org/docs/current/explicit-locking.html (row locks
-- taken in one fixed order).

-- ───────────────────────────────────────────────────────────── the role
-- `security invoker` (the default): it reads the caller's own token and
-- nothing else. `coalesce(…, false)`: no token, no claim, no admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- The read policies below call it as the querying role, so `authenticated`
-- needs EXECUTE; `anon` never reaches a policy that asks.
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated, service_role;

-- ──────────────────────────────────────────────────────────── the anchor
-- The most recent 18:50 on a Vietnamese wall clock, at or before `p_at`.
--
-- 18:50 because that is the minute the fixture was frozen at (QĐ-24,
-- `2026-09-20 18:50+07`): shifting the sample data from that anchor to this
-- one moves it by a whole number of days, so "19:50", "08:05", "20:00" all
-- keep their hour and minute. `data/orders.test.ts` pins that every recorded
-- moment in the fixture is at or before its anchor and every deadline more
-- than a day after it — which is what makes "the past is past and the
-- deadlines are ahead" true for a whole day after every reset.
--
-- Vietnam has no daylight saving time, so `date + time` read back in
-- 'Asia/Ho_Chi_Minh' is exactly one instant.
create or replace function public.demo_anchor(p_at timestamptz default now())
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (
    (
      (p_at at time zone 'Asia/Ho_Chi_Minh')::date
      - case when (p_at at time zone 'Asia/Ho_Chi_Minh')::time < time '18:50' then 1 else 0 end
    ) + time '18:50'
  ) at time zone 'Asia/Ho_Chi_Minh';
$$;

revoke execute on function public.demo_anchor(timestamptz) from public, anon;
grant  execute on function public.demo_anchor(timestamptz) to authenticated, service_role;

-- ────────────────────────────────────────────────── the business clock
-- Every function that writes takes "now" from the app (`p_now`), so a test
-- can ask "and twelve hours later?" without waiting twelve hours. Since the
-- app's clock is the real one (slice B3a), a caller holding the publishable
-- key has no business sending any other instant: more than five minutes
-- away from the database's own clock is a bad request.
--
-- The service role — scripts and the database tests — is exempt, and so is a
-- direct database session (the seed, `psql`), which carries no JWT at all:
-- `auth.role()` is null there, and both are trusted by construction.
--
-- INTERNAL: every API grant is revoked; only the definer functions below,
-- which run as its owner, call it.
create or replace function public.assert_now(p_now timestamptz)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_now is null then
    raise exception using message = 'BAD_INPUT';
  end if;
  if coalesce(auth.role(), 'service_role') <> 'service_role'
     and abs(extract(epoch from (p_now - now()))) > 300 then
    raise exception using message = 'BAD_INPUT';
  end if;
end;
$$;

revoke execute on function public.assert_now(timestamptz) from public, anon, authenticated;

-- ────────────────────────────────────────────────────── the courier's name
-- Typed at handover from the delivery services the shop sells
-- (`lib/shipping.ts`): no shipping partner has been signed, so there is no
-- list of couriers to choose from. Optional, like `OrderStatus.carrier`: the
-- sample orders were handed over before anybody recorded one.
--
-- `seed_orders` does not get the column. It is a mirror of the fixture, and
-- the fixture has no courier to mirror; `reset_demo()` names its columns.
alter table public.orders
  add column carrier text null
  check (carrier is null or length(btrim(carrier)) between 1 and 80);

-- ─────────────────────────────────────────────────────────────── the log
-- One row per thing that happened. `kind` is a closed set, like every enum in
-- `data/types.ts`: a new kind costs a migration (slice B3b adds the stock,
-- issue and code kinds). The payload carries the fields of the matching
-- `SimAction` from before this slice, camelCase, plus `from` — the state an
-- order left — wherever more than one state could have led there.
--
-- `actor` is the email of whoever acted (an admin, or the shopper), and
-- empty for the system — the twelve-hour clock, a reset run by a script.
--
-- No foreign key to `orders`: a log outlives what it describes, and
-- `reset_demo()` empties both anyway.
create table public.events (
  id         bigint generated always as identity primary key,
  at         timestamptz not null,
  actor_role text not null check (actor_role in ('admin', 'customer', 'system')),
  actor      text not null default '',
  kind       text not null check (kind in (
    'ORDER_PLACED',
    'ORDER_PAID',
    'ORDER_SHIPPED',
    'ORDER_DELIVERED',
    'ORDER_CANCELLED',
    'ORDER_CANCELLED_BY_CUSTOMER',
    'ORDER_EXPIRED',
    'ORDER_NOTE',
    'ORDER_ADDRESS_EDITED',
    'DEMO_RESET'
  )),
  order_code text null check (order_code is null or order_code ~ '^DH-[0-9]{4,}$'),
  product_id text null,
  promo_code text null,
  drop_no    integer null,
  payload    jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  -- Every order event names its order, and nothing else claims one.
  check ((left(kind, 6) = 'ORDER_') = (order_code is not null))
);

-- The log screen reads newest first; an order's notes read by code.
create index events_at    on public.events (at desc, id desc);
create index events_order on public.events (order_code);

-- APPEND-ONLY, enforced where it cannot be forgotten: no role — not even the
-- service role — may change or remove a row once written. `reset_demo()`
-- empties the table with TRUNCATE, which fires no row trigger.
create or replace function public.events_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using message = 'APPEND_ONLY';
end;
$$;

revoke execute on function public.events_append_only() from public, anon, authenticated;

create trigger events_append_only
  before update or delete on public.events
  for each row execute function public.events_append_only();

-- ──────────────────────────────────────────────────────────────────── RLS
-- An admin reads every order, every line, every profile, every address and
-- the whole log; nobody else reads the log at all. Permissive policies are
-- OR-ed, so a shopper's own "read own" policies keep working beside these.
-- No write policy for anyone: writes are the functions below.
alter table public.events enable row level security;

create policy "events: admin reads" on public.events
  for select to authenticated using ((select public.is_admin()));

create policy "orders: admin reads all" on public.orders
  for select to authenticated using ((select public.is_admin()));

create policy "order lines: admin reads all" on public.order_lines
  for select to authenticated using ((select public.is_admin()));

create policy "profiles: admin reads all" on public.profiles
  for select to authenticated using ((select public.is_admin()));

create policy "addresses: admin reads all" on public.addresses
  for select to authenticated using ((select public.is_admin()));

-- A new table in `public` comes with every privilege granted to the API
-- roles. The log keeps SELECT for `authenticated` (the policy narrows it to
-- admins) and loses every write, TRUNCATE included.
revoke all on public.events from anon;
revoke insert, update, delete, truncate, references, trigger on public.events from authenticated;

-- ───────────────────────────────────────────────── one order, as JSON (v2)
-- Replaces the version in `20260923170000_orders.sql`. The only change: a
-- shipped order names its courier, when one was recorded at handover.
create or replace function public.order_json(p_code text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'code', o.code,
    'customerId', coalesce(o.customer_handle, ''),
    'lines', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'productId', l.product_id,
          'size', l.size::text,
          'color', l.color::text,
          'qty', l.qty,
          'unitPriceVnd', l.unit_price_vnd
        ) order by l.position
      )
      from public.order_lines l
      where l.order_code = o.code
    ), '[]'::jsonb),
    'status', case o.state
      when 'AWAITING_TRANSFER' then jsonb_build_object(
        'state', 'AWAITING_TRANSFER',
        'dueAt', to_char(o.due_at at time zone 'Asia/Ho_Chi_Minh',
                         'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'))
      when 'RECEIVED' then jsonb_build_object('state', 'RECEIVED')
      when 'PAID' then jsonb_build_object(
        'state', 'PAID',
        'paidAt', to_char(o.paid_at at time zone 'Asia/Ho_Chi_Minh',
                          'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'))
      when 'SHIPPING' then jsonb_build_object(
        'state', 'SHIPPING',
        'shippedAt', to_char(o.shipped_at at time zone 'Asia/Ho_Chi_Minh',
                             'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'),
        'trackingCode', o.tracking_code)
        || case when o.carrier is null then '{}'::jsonb
                else jsonb_build_object('carrier', o.carrier) end
      when 'DELIVERED' then jsonb_build_object(
        'state', 'DELIVERED',
        'deliveredAt', to_char(o.delivered_at at time zone 'Asia/Ho_Chi_Minh',
                               'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'))
      when 'CANCELLED' then jsonb_build_object(
        'state', 'CANCELLED',
        'cancelledAt', to_char(o.cancelled_at at time zone 'Asia/Ho_Chi_Minh',
                               'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'),
        'reason', o.cancel_reason)
    end,
    'payment', o.payment::text,
    'shippingFeeVnd', o.shipping_fee_vnd,
    'codFeeVnd', o.cod_fee_vnd,
    'discountVnd', o.discount_vnd,
    'shipTo', jsonb_build_object(
      'recipient', o.recipient,
      'phone', o.phone,
      'line', o.line,
      'provinceCode', o.province_code,
      'wardCode', o.ward_code
    ),
    'placedAt', to_char(o.placed_at at time zone 'Asia/Ho_Chi_Minh',
                        'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'),
    'promo', o.promo_code,
    'email', o.email,
    'note', o.note,
    'delivery', o.delivery::text
  )
  from public.orders o
  where o.code = p_code;
$$;

-- ─────────────────────────────────────────── every order, for the admin
-- The back office's one read of the order book: each order in the same JSON
-- every other reader gets (`order_json`), beside the account it belongs to —
-- the uuid, which `order_json` deliberately never carries, plus the fields
-- the tables print. `security invoker`: the admin read policies above are
-- what let it see every row, and the explicit check says so out loud.
create or replace function public.admin_orders()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'order', public.order_json(o.code),
        'owner', case when p.id is null then null else jsonb_build_object(
          'id', p.id,
          'handle', p.handle,
          'name', p.name,
          'email', p.email,
          'phone', p.phone,
          'joinedAt', to_char(p.joined_at at time zone 'Asia/Ho_Chi_Minh',
                              'YYYY-MM-DD"T"HH24:MI:SS"+07:00"')
        ) end
      )
      order by o.placed_at desc, o.code desc
    )
    from public.orders o
    left join public.profiles p on p.id = o.profile_id
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.admin_orders() from public, anon;
grant  execute on function public.admin_orders() to authenticated;

-- ─────────────────────────────────────── the clock's housekeeping (v2)
-- Replaces the version in `20260923170000_orders.sql`: same locks in the
-- same order, and now each released hold also writes its `ORDER_EXPIRED`
-- event, stamped with the DEADLINE — that is when the pieces went back,
-- however long after the fact the sweep ran. Both callers (`place_order`,
-- `expire_transfers`) go through here, so neither can release a hold
-- without logging it.
create or replace function public.expire_and_lock(
  p_now    timestamptz,
  p_pids   text[],
  p_colors public.color_key[],
  p_sizes  public.garment_size[]
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_codes text[];
begin
  select coalesce(array_agg(s.code order by s.code), '{}')
    into v_codes
    from (
      select o.code
        from public.orders o
       where o.state = 'AWAITING_TRANSFER'
         and o.due_at <= p_now
       order by o.code
         for update
    ) s;

  perform 1
     from public.stock_cells sc
    where exists (
            select 1 from public.order_lines l
             where l.order_code = any (v_codes)
               and l.product_id = sc.product_id
               and l.color = sc.color
               and l.size = sc.size
          )
       or exists (
            select 1 from unnest(p_pids, p_colors, p_sizes) as c (pid, col, sz)
             where c.pid = sc.product_id
               and c.col = sc.color
               and c.sz = sc.size
          )
    order by sc.product_id, sc.color, sc.size
      for update;

  if cardinality(v_codes) = 0 then
    return 0;
  end if;

  update public.stock_cells sc
     set on_hand = sc.on_hand + x.qty
    from (
      select l.product_id, l.color, l.size, sum(l.qty)::integer as qty
        from public.order_lines l
       where l.order_code = any (v_codes)
       group by l.product_id, l.color, l.size
    ) x
   where sc.product_id = x.product_id
     and sc.color = x.color
     and sc.size = x.size;

  update public.orders o
     set state         = 'CANCELLED',
         cancelled_at  = o.due_at,
         cancel_reason = 'quá hạn chuyển khoản'
   where o.code = any (v_codes);

  insert into public.events (at, actor_role, actor, kind, order_code)
  select o.cancelled_at, 'system', '', 'ORDER_EXPIRED', o.code
    from public.orders o
   where o.code = any (v_codes)
   order by o.cancelled_at, o.code;

  return cardinality(v_codes);
end;
$$;

-- (grants unchanged: every API role stays revoked, as in B2)

-- ─────────────────────────────────────────────── the sweep on its own (v2)
create or replace function public.expire_transfers(p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_now(p_now);
  return public.expire_and_lock(p_now, '{}', '{}', '{}');
end;
$$;

-- ─────────────────────────────────────────────────────── placing one (v2)
-- Replaces the version in `20260923170000_orders.sql`. Two changes, both at
-- the edges: `p_now` has to be the real clock for anybody but the service
-- role (`assert_now`), and the order writes its `ORDER_PLACED` event in the
-- same transaction as the order itself. Everything between is unchanged.
create or replace function public.place_order(p_input jsonb, p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- `lib/order-payload.ts#MAX_UNITS_PER_ORDER`, the Server Action's own cap.
  max_units  constant integer := 20;
  -- `lib/shipping.ts`: STANDARD_FEE_VND, EXPRESS_FEE_VND,
  -- FREE_SHIPPING_FROM_VND, COD_SURCHARGE_VND, EXPRESS_PROVINCE_CODE.
  standard_fee   constant integer := 30000;
  express_fee    constant integer := 45000;
  free_from      constant integer := 1000000;
  cod_surcharge  constant integer := 15000;
  express_region constant text    := '29';
  -- `lib/orders.ts#TRANSFER_HOLD_HOURS`.
  hold constant interval := interval '12 hours';

  v_uid       uuid := (select auth.uid());
  v_profile   uuid;
  v_handle    text;
  v_account   text;
  v_lines     jsonb;
  v_item      jsonb;
  v_pid       text;
  v_color     text;
  v_size      text;
  v_qty       numeric;
  v_pids      text[] := '{}';
  v_colors    public.color_key[] := '{}';
  v_sizes     public.garment_size[] := '{}';
  v_qtys      integer[] := '{}';
  v_prices    integer[] := '{}';
  v_units     integer := 0;
  v_recipient text;
  v_phone     text;
  v_email     text;
  v_province  text;
  v_ward      text;
  v_line      text;
  v_note      text;
  v_delivery  public.delivery_method;
  v_payment   public.payment_method;
  v_promo     text;
  v_cell      record;
  v_offer     public.promotions%rowtype;
  v_subtotal  integer := 0;
  v_shipping  integer;
  v_cod       integer;
  v_discount  integer := 0;
  v_seq       bigint;
  v_code      text;
  v_key       uuid;
  i           integer;
begin
  -- ── the shape of the request, and the clock it claims
  if p_now is null or p_input is null or jsonb_typeof(p_input) is distinct from 'object' then
    raise exception using message = 'BAD_INPUT';
  end if;
  perform public.assert_now(p_now);

  v_lines := p_input -> 'lines';
  if jsonb_typeof(v_lines) is distinct from 'array' or jsonb_array_length(v_lines) = 0 then
    raise exception using message = 'EMPTY_ORDER';
  end if;
  -- Every line carries at least one piece, so more lines than the cap on
  -- pieces is already a bad request — and refusing it here keeps the loop
  -- below from being handed ten thousand of them.
  if jsonb_array_length(v_lines) > max_units then
    raise exception using message = 'BAD_INPUT';
  end if;

  for v_item in select value from jsonb_array_elements(v_lines) loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or jsonb_typeof(v_item -> 'productId') is distinct from 'string'
       or jsonb_typeof(v_item -> 'color') is distinct from 'string'
       or jsonb_typeof(v_item -> 'size') is distinct from 'string'
       or jsonb_typeof(v_item -> 'qty') is distinct from 'number' then
      raise exception using message = 'BAD_INPUT';
    end if;

    v_pid   := v_item ->> 'productId';
    v_color := v_item ->> 'color';
    v_size  := v_item ->> 'size';
    v_qty   := (v_item ->> 'qty')::numeric;

    if not (v_color = any (enum_range(null::public.color_key)::text[]))
       or not (v_size = any (enum_range(null::public.garment_size)::text[]))
       or v_qty <> trunc(v_qty) or v_qty < 1 or v_qty > max_units then
      raise exception using message = 'BAD_INPUT';
    end if;

    -- The cart merges a choice into one line (`lib/cart.ts#lineKey`), so the
    -- same cell twice is a request that did not come from it.
    if exists (
      select 1 from unnest(v_pids, v_colors, v_sizes) as c (pid, col, sz)
       where c.pid = v_pid
         and c.col = v_color::public.color_key
         and c.sz = v_size::public.garment_size
    ) then
      raise exception using message = 'BAD_INPUT';
    end if;

    v_pids   := v_pids || v_pid;
    v_colors := v_colors || v_color::public.color_key;
    v_sizes  := v_sizes || v_size::public.garment_size;
    v_qtys   := v_qtys || v_qty::integer;
    v_units  := v_units + v_qty::integer;
  end loop;

  if v_units > max_units then
    raise exception using message = 'BAD_INPUT';
  end if;

  -- ── who it goes to, and how
  v_recipient := btrim(coalesce(p_input ->> 'recipient', ''));
  v_phone     := coalesce(p_input ->> 'phone', '');
  v_email     := btrim(coalesce(p_input ->> 'email', ''));
  v_province  := coalesce(p_input ->> 'provinceCode', '');
  v_ward      := coalesce(p_input ->> 'wardCode', '');
  v_line      := btrim(coalesce(p_input ->> 'line', ''));
  v_note      := btrim(coalesce(p_input ->> 'note', ''));

  -- The same two patterns as slice B1's columns and `lib/checkout-form.ts`:
  -- ten digits starting with 0, and the light email shape (`looksLikeEmail`).
  -- Whether the ward belongs to the province is not something this database
  -- knows — `data/regions.ts` is not in it — so the Server Action's
  -- `findWard` is the check for that.
  if v_recipient = '' or v_line = '' or v_province = '' or v_ward = ''
     or v_phone !~ '^0[0-9]{9}$'
     or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'
     or length(v_note) > 500
     or not (coalesce(p_input ->> 'delivery', '') = any (enum_range(null::public.delivery_method)::text[]))
     or not (coalesce(p_input ->> 'payment', '') = any (enum_range(null::public.payment_method)::text[])) then
    raise exception using message = 'BAD_INPUT';
  end if;

  v_delivery := (p_input ->> 'delivery')::public.delivery_method;
  v_payment  := (p_input ->> 'payment')::public.payment_method;

  -- Express is a same-city courier run (`isDeliveryAvailable`).
  if v_delivery = 'EXPRESS' and v_province <> express_region then
    raise exception using message = 'BAD_INPUT';
  end if;

  -- ── the clock's housekeeping, and every lock this order needs, in order
  perform public.expire_and_lock(p_now, v_pids, v_colors, v_sizes);

  -- ── each line against the shelf and the calendar
  -- Sold out is reported ahead of a closed issue, the same precedence
  -- `lib/cart.ts#resolveCart` uses: it is the more useful sentence.
  for i in 1 .. cardinality(v_pids) loop
    select sc.on_hand, p.price_vnd, p.sold_out_at, d.opens_at, d.closes_at
      into v_cell
      from public.stock_cells sc
      join public.products p on p.id = sc.product_id
      join public.drops d on d.no = p.drop_no
     where sc.product_id = v_pids[i]
       and sc.color = v_colors[i]
       and sc.size = v_sizes[i];

    -- No cell means no such style, or not in that colour.
    if not found then
      raise exception using message = 'BAD_INPUT';
    end if;

    if v_cell.sold_out_at is not null or v_cell.on_hand < v_qtys[i] then
      raise exception using message = 'OUT_OF_STOCK';
    end if;

    -- Open-inclusive, close-exclusive, like `lib/drop.ts#dropState`.
    if p_now < v_cell.opens_at or p_now >= v_cell.closes_at then
      raise exception using message = 'DROP_CLOSED';
    end if;

    v_prices   := v_prices || v_cell.price_vnd;
    v_subtotal := v_subtotal + v_cell.price_vnd * v_qtys[i];
  end loop;

  -- ── the money, by the rules of lib/shipping.ts
  -- Free delivery is a threshold on the standard service only.
  v_shipping := case
    when v_delivery = 'EXPRESS' then express_fee
    when v_subtotal >= free_from then 0
    else standard_fee
  end;
  v_cod := case when v_payment = 'COD' then cod_surcharge else 0 end;

  -- ── the code, if one was given
  -- Normalised the way `normalisePromoCode` does: no whitespace, upper case.
  v_promo := nullif(upper(regexp_replace(coalesce(p_input ->> 'promoCode', ''), '\s', '', 'g')), '');

  if v_promo is not null then
    -- Locked last, after the stock: the fixed order is orders, cells, code.
    select * into v_offer from public.promotions m where m.code = v_promo for update;

    -- Unknown, not started, over, used up, or under its minimum: the
    -- checkout screen refuses all five with a reason before the button is
    -- ever pressed (`lib/promotions.ts#checkPromoCode`), so reaching one here
    -- means the code changed between the page and the order.
    if not found
       or p_now < v_offer.starts_at
       or p_now >= v_offer.ends_at
       or (v_offer.usage_limit is not null and v_offer.used_count >= v_offer.usage_limit)
       or (v_offer.min_order_vnd is not null and v_subtotal < v_offer.min_order_vnd) then
      raise exception using message = 'PROMO_INVALID';
    end if;

    -- `promoDiscountVnd`: a percentage comes off the goods (floored, capped,
    -- never more than the goods), an amount never exceeds the goods, and free
    -- shipping is worth exactly the delivery fee this order carries. The
    -- product is taken in bigint: twenty pieces at 1.500.000₫ times 100 does
    -- not fit in an integer.
    v_discount := case v_offer.kind
      when 'PERCENT' then least(
        case
          when v_offer.max_discount_vnd is not null
            then least(((v_subtotal::bigint * v_offer.percent) / 100)::integer, v_offer.max_discount_vnd)
          else ((v_subtotal::bigint * v_offer.percent) / 100)::integer
        end,
        v_subtotal)
      when 'AMOUNT' then least(v_offer.amount_vnd, v_subtotal)
      when 'FREE_SHIPPING' then v_shipping
    end;

    -- A code that has been spent stays spent, even if the order is later
    -- cancelled (`cancel_order` does not give the use back).
    update public.promotions set used_count = used_count + 1 where code = v_promo;
  end if;

  -- ── the number, the owner, the order
  -- `lpad` to four digits, and past 9999 simply the digits: `lpad` alone
  -- would TRUNCATE 12345 to '1234'.
  v_seq  := nextval('public.order_seq');
  v_code := 'DH-' || lpad(v_seq::text, greatest(4, length(v_seq::text)), '0');

  -- A session with no profile row behind it is no account the screens know,
  -- so the order is filed the way a guest's is.
  if v_uid is not null then
    select p.id, p.handle, p.email into v_profile, v_handle, v_account
      from public.profiles p where p.id = v_uid;
  end if;

  insert into public.orders (
    code, profile_id, customer_handle, email, recipient, phone, line,
    province_code, ward_code, note, delivery, payment,
    shipping_fee_vnd, cod_fee_vnd, discount_vnd, promo_code,
    placed_at, state, due_at
  )
  values (
    v_code, v_profile, v_handle, v_email, v_recipient, v_phone, v_line,
    v_province, v_ward, v_note, v_delivery, v_payment,
    v_shipping, v_cod, v_discount, v_promo,
    p_now,
    case when v_payment = 'BANK_TRANSFER' then 'AWAITING_TRANSFER' else 'RECEIVED' end::public.order_state,
    case when v_payment = 'BANK_TRANSFER' then p_now + hold end
  )
  returning access_key into v_key;

  for i in 1 .. cardinality(v_pids) loop
    update public.stock_cells
       set on_hand = on_hand - v_qtys[i]
     where product_id = v_pids[i]
       and color = v_colors[i]
       and size = v_sizes[i];

    insert into public.order_lines (order_code, position, product_id, color, size, qty, unit_price_vnd)
    values (v_code, i - 1, v_pids[i], v_colors[i], v_sizes[i], v_qtys[i], v_prices[i]);
  end loop;

  -- The shopper placed it: the account's email when signed in, the one typed
  -- at checkout when not.
  insert into public.events (at, actor_role, actor, kind, order_code)
  values (p_now, 'customer', coalesce(nullif(v_account, ''), v_email), 'ORDER_PLACED', v_code);

  return jsonb_build_object('code', v_code, 'accessKey', v_key);
end;
$$;

-- ───────────────────────────────────────────────────── cancelling one (v2)
-- Replaces the version in `20260923170000_orders.sql`: the clock check, and
-- the `ORDER_CANCELLED_BY_CUSTOMER` event, carrying the state it left.
create or replace function public.cancel_order(p_code text, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_order record;
begin
  perform public.assert_now(p_now);
  if v_uid is null then
    raise exception using message = 'NOT_OWNER';
  end if;

  -- The order row first, then its cells in the fixed order — the same
  -- sequence every other writer follows.
  select o.code, o.profile_id, o.state, o.due_at
    into v_order
    from public.orders o
   where o.code = p_code
     for update;

  if not found or v_order.profile_id is distinct from v_uid then
    raise exception using message = 'NOT_OWNER';
  end if;

  if not (v_order.state = 'RECEIVED'
          or (v_order.state = 'AWAITING_TRANSFER' and v_order.due_at > p_now)) then
    raise exception using message = 'NOT_CANCELLABLE';
  end if;

  perform 1
     from public.stock_cells sc
    where exists (
            select 1 from public.order_lines l
             where l.order_code = p_code
               and l.product_id = sc.product_id
               and l.color = sc.color
               and l.size = sc.size
          )
    order by sc.product_id, sc.color, sc.size
      for update;

  update public.stock_cells sc
     set on_hand = sc.on_hand + x.qty
    from (
      select l.product_id, l.color, l.size, sum(l.qty)::integer as qty
        from public.order_lines l
       where l.order_code = p_code
       group by l.product_id, l.color, l.size
    ) x
   where sc.product_id = x.product_id
     and sc.color = x.color
     and sc.size = x.size;

  update public.orders
     set state         = 'CANCELLED',
         cancelled_at  = p_now,
         cancel_reason = 'khách huỷ'
   where code = p_code;

  insert into public.events (at, actor_role, actor, kind, order_code, payload)
  values (
    p_now, 'customer', coalesce(auth.jwt() ->> 'email', ''),
    'ORDER_CANCELLED_BY_CUSTOMER', p_code,
    jsonb_build_object('from', v_order.state::text)
  );
end;
$$;

-- ────────────────────────────────────────────────── the admin's six moves
-- Each one, in this order:
--
--   1. `NOT_ADMIN` unless the caller's token carries the admin role — before
--      anything else is read, so a shopper learns nothing about an order;
--   2. `BAD_INPUT` for a missing or far-off `p_now` (`assert_now`) and for
--      anything the form could not have sent;
--   3. the order row, locked (`NOT_FOUND` when there is none);
--   4. the guard: the state the order is in must be one this move starts
--      from, or `NOT_ALLOWED`. A transfer whose twelve hours have run out
--      counts as expired here exactly as `effectiveStatus()` reads it on
--      every screen — the sweep may not have caught up with it yet, but it
--      is no longer the shop's to confirm, ship, re-address or cancel;
--   5. the write and its event, in the same transaction.
--
-- `actor` is the admin's email, from the same token.

-- Money arrived: a transfer inside its hold, or a card / COD order the shop
-- has taken.
create or replace function public.admin_mark_paid(p_code text, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  select o.state, o.due_at into v_order
    from public.orders o where o.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  if not (v_order.state = 'RECEIVED'
          or (v_order.state = 'AWAITING_TRANSFER' and v_order.due_at > p_now)) then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  update public.orders set state = 'PAID', paid_at = p_now where code = p_code;

  insert into public.events (at, actor_role, actor, kind, order_code, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'ORDER_PAID', p_code,
    jsonb_build_object('from', v_order.state::text)
  );
end;
$$;

-- Handed to the courier: a paid order, or a COD order — which is paid AT the
-- door, so it leaves straight from RECEIVED. A card order with nothing
-- received does not leave. `p_note` is the line for the shopper typed on the
-- handover form; when there is one it becomes a note on the order.
create or replace function public.admin_hand_over(
  p_code          text,
  p_carrier       text,
  p_tracking_code text,
  p_note          text,
  p_now           timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_carrier  text := btrim(coalesce(p_carrier, ''));
  v_tracking text := upper(btrim(coalesce(p_tracking_code, '')));
  v_note     text := btrim(coalesce(p_note, ''));
  v_actor    text := coalesce(auth.jwt() ->> 'email', '');
  v_order    record;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  -- A number the shopper can read back off a label: letters, digits, dots
  -- and dashes, as couriers print them.
  if v_carrier = '' or length(v_carrier) > 80
     or v_tracking = '' or length(v_tracking) > 40
     or v_tracking !~ '^[A-Z0-9][A-Z0-9.-]*$'
     or length(v_note) > 500 then
    raise exception using message = 'BAD_INPUT';
  end if;

  select o.state, o.payment into v_order
    from public.orders o where o.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  if not (v_order.state = 'PAID'
          or (v_order.state = 'RECEIVED' and v_order.payment = 'COD')) then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  update public.orders
     set state         = 'SHIPPING',
         shipped_at    = p_now,
         tracking_code = v_tracking,
         carrier       = v_carrier
   where code = p_code;

  insert into public.events (at, actor_role, actor, kind, order_code, payload)
  values (
    p_now, 'admin', v_actor, 'ORDER_SHIPPED', p_code,
    jsonb_build_object('from', v_order.state::text, 'carrier', v_carrier, 'trackingCode', v_tracking)
  );

  if v_note <> '' then
    insert into public.events (at, actor_role, actor, kind, order_code, payload)
    values (
      p_now, 'admin', v_actor, 'ORDER_NOTE', p_code,
      jsonb_build_object('text', 'Ghi chú khi bàn giao: ' || v_note)
    );
  end if;
end;
$$;

-- The parcel arrived. No courier reports it (none is connected), so the shop
-- records it by hand — the step the approved mock had no button for.
create or replace function public.admin_mark_delivered(p_code text, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state public.order_state;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  select o.state into v_state from public.orders o where o.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  if v_state <> 'SHIPPING' then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  update public.orders set state = 'DELIVERED', delivered_at = p_now where code = p_code;

  insert into public.events (at, actor_role, actor, kind, order_code)
  values (p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'ORDER_DELIVERED', p_code);
end;
$$;

-- Called off by the shop, with the reason the shopper is shown. Anything not
-- yet handed over can be — and because it has not left, its pieces go back
-- on the shelf in the same transaction, the same rule `cancel_order()`
-- applies for the shopper. The use of a discount code is not given back (a
-- code that has been spent stays spent). A paid order is refunded by hand:
-- no payment gateway is connected.
create or replace function public.admin_cancel_order(
  p_code   text,
  p_reason text,
  p_note   text,
  p_now    timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
  v_note   text := btrim(coalesce(p_note, ''));
  v_order  record;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if v_reason = '' or length(v_reason) > 100 or length(v_note) > 500 then
    raise exception using message = 'BAD_INPUT';
  end if;

  -- The order row first, then its cells in the fixed order.
  select o.state, o.due_at into v_order
    from public.orders o where o.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  if not (v_order.state in ('RECEIVED', 'PAID')
          or (v_order.state = 'AWAITING_TRANSFER' and v_order.due_at > p_now)) then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  perform 1
     from public.stock_cells sc
    where exists (
            select 1 from public.order_lines l
             where l.order_code = p_code
               and l.product_id = sc.product_id
               and l.color = sc.color
               and l.size = sc.size
          )
    order by sc.product_id, sc.color, sc.size
      for update;

  update public.stock_cells sc
     set on_hand = sc.on_hand + x.qty
    from (
      select l.product_id, l.color, l.size, sum(l.qty)::integer as qty
        from public.order_lines l
       where l.order_code = p_code
       group by l.product_id, l.color, l.size
    ) x
   where sc.product_id = x.product_id
     and sc.color = x.color
     and sc.size = x.size;

  update public.orders
     set state         = 'CANCELLED',
         cancelled_at  = p_now,
         cancel_reason = v_reason
   where code = p_code;

  insert into public.events (at, actor_role, actor, kind, order_code, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'ORDER_CANCELLED', p_code,
    jsonb_build_object('from', v_order.state::text, 'reason', v_reason, 'note', v_note)
  );
end;
$$;

-- An internal note. Nothing about the order changes; the note IS the event.
create or replace function public.admin_note_order(p_code text, p_text text, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text := btrim(coalesce(p_text, ''));
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if v_text = '' or length(v_text) > 500 then
    raise exception using message = 'BAD_INPUT';
  end if;

  perform 1 from public.orders o where o.code = p_code;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  insert into public.events (at, actor_role, actor, kind, order_code, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'ORDER_NOTE', p_code,
    jsonb_build_object('text', v_text)
  );
end;
$$;

-- A new delivery address, before the parcel leaves. The frozen copy on the
-- order is REPLACED — the table, the slip and the courier must all read one
-- address — and the event keeps both, with the reason the form requires.
-- Checked the way `place_order()` checks one: somebody to hand it to, ten
-- digits, a street line. Whether the ward is in the province is the Server
-- Action's check (`data/regions.ts` is not in this database).
create or replace function public.admin_edit_address(
  p_code    text,
  p_ship_to jsonb,
  p_reason  text,
  p_now     timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient text;
  v_phone     text;
  v_line      text;
  v_province  text;
  v_ward      text;
  v_reason    text := btrim(coalesce(p_reason, ''));
  v_order     record;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_ship_to is null or jsonb_typeof(p_ship_to) is distinct from 'object' then
    raise exception using message = 'BAD_INPUT';
  end if;

  v_recipient := btrim(coalesce(p_ship_to ->> 'recipient', ''));
  v_phone     := coalesce(p_ship_to ->> 'phone', '');
  v_line      := btrim(coalesce(p_ship_to ->> 'line', ''));
  v_province  := btrim(coalesce(p_ship_to ->> 'provinceCode', ''));
  v_ward      := btrim(coalesce(p_ship_to ->> 'wardCode', ''));

  if v_recipient = '' or length(v_recipient) > 100
     or v_phone !~ '^0[0-9]{9}$'
     or v_line = '' or length(v_line) > 200
     or v_province = '' or v_ward = ''
     or v_reason = '' or length(v_reason) > 200 then
    raise exception using message = 'BAD_INPUT';
  end if;

  select o.state, o.due_at, o.recipient, o.phone, o.line, o.province_code, o.ward_code
    into v_order
    from public.orders o where o.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  if not (v_order.state in ('RECEIVED', 'PAID')
          or (v_order.state = 'AWAITING_TRANSFER' and v_order.due_at > p_now)) then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  update public.orders
     set recipient     = v_recipient,
         phone         = v_phone,
         line          = v_line,
         province_code = v_province,
         ward_code     = v_ward
   where code = p_code;

  insert into public.events (at, actor_role, actor, kind, order_code, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'ORDER_ADDRESS_EDITED', p_code,
    jsonb_build_object(
      'before', jsonb_build_object(
        'recipient', v_order.recipient,
        'phone', v_order.phone,
        'line', v_order.line,
        'provinceCode', v_order.province_code,
        'wardCode', v_order.ward_code
      ),
      'after', jsonb_build_object(
        'recipient', v_recipient,
        'phone', v_phone,
        'line', v_line,
        'provinceCode', v_province,
        'wardCode', v_ward
      ),
      'reason', v_reason
    )
  );
end;
$$;

-- ───────────────────────────────────────────────────────────────── grants
-- The body of every `admin_*` asks for the role itself, so `authenticated`
-- may call them all; `anon` may call none.
revoke execute on function public.admin_mark_paid(text, timestamptz) from public, anon;
grant  execute on function public.admin_mark_paid(text, timestamptz) to authenticated;

revoke execute on function public.admin_hand_over(text, text, text, text, timestamptz) from public, anon;
grant  execute on function public.admin_hand_over(text, text, text, text, timestamptz) to authenticated;

revoke execute on function public.admin_mark_delivered(text, timestamptz) from public, anon;
grant  execute on function public.admin_mark_delivered(text, timestamptz) to authenticated;

revoke execute on function public.admin_cancel_order(text, text, text, timestamptz) from public, anon;
grant  execute on function public.admin_cancel_order(text, text, text, timestamptz) to authenticated;

revoke execute on function public.admin_note_order(text, text, timestamptz) from public, anon;
grant  execute on function public.admin_note_order(text, text, timestamptz) to authenticated;

revoke execute on function public.admin_edit_address(text, jsonb, text, timestamptz) from public, anon;
grant  execute on function public.admin_edit_address(text, jsonb, text, timestamptz) to authenticated;

-- ───────────────────────────────────────────────────────── reset_demo, v4
-- Replaces version 3 from `20260923170000_orders.sql`. Everything v3 rebuilt
-- it still rebuilds, the same way; what is new:
--
--   · WHO. Still `security definer`, now callable by `authenticated` too —
--     the back office's "Đặt lại dữ liệu mẫu" button — but the body refuses
--     anybody who is neither the service role nor an admin (`NOT_ADMIN`). A
--     direct database session (the seed, `psql`) carries no token at all and
--     is trusted, like the service role.
--   · THE LOG. Emptied, then filled with one event for every moment the 24
--     sample orders record, by the rules the activity log used to derive
--     them with (`lib/activity-log.ts#fromFixtures` before this slice): a
--     transfer that matched is the system's doing, a handover the shop's, a
--     delivery the system's; a cancellation is the system's when the reason
--     is the twelve-hour hold, the shopper's when it is theirs, the shop's
--     otherwise. Each at its recorded moment plus the same delta as
--     everything else. Last, one `DEMO_RESET` at the real `now()`: the
--     system's when a script or the seed ran it, the admin's (with their
--     email) when the button did.
--
-- `p_anchor` null still means the fixture's own anchor (the database tests
-- compare against `data/` and pass it explicitly); the app, the seed and
-- `npm run seed:users` pass `demo_anchor()`. Stock and `used_count` still
-- come from the seed untouched. Still idempotent: run twice with one anchor,
-- the rows are the same — ids included, the log restarts its numbering —
-- except the `DEMO_RESET` instant and every order's `access_key`.
create or replace function public.reset_demo(p_anchor timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fixture_anchor constant timestamptz := '2026-09-20 18:50:00+07'::timestamptz;
  anchor constant timestamptz := coalesce(p_anchor, fixture_anchor);
  delta constant interval := coalesce(p_anchor, fixture_anchor) - fixture_anchor;
  by_admin constant boolean := public.is_admin();
  c record;
  uid uuid;
  last_pos integer;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' and not by_admin then
    raise exception using message = 'NOT_ADMIN';
  end if;

  -- One statement, so the foreign keys between these eight do not object.
  truncate table
    public.order_lines,
    public.orders,
    public.stock_cells,
    public.product_colors,
    public.products,
    public.teasers,
    public.promotions,
    public.drops;

  insert into public.drops (no, opens_at, closes_at)
  select no, opens_at + delta, closes_at + delta
  from public.seed_drops
  order by no;

  insert into public.products (
    id, slug, name, kind, family, material, fit,
    price_vnd, cut_units, drop_no, sold_out_at, position
  )
  select
    id, slug, name, kind, family, material, fit,
    price_vnd, cut_units, drop_no, sold_out_at + delta, position
  from public.seed_products
  order by position;

  insert into public.product_colors (product_id, color, position, photo_key)
  select product_id, color, position, photo_key
  from public.seed_product_colors
  order by product_id, position;

  insert into public.stock_cells (product_id, color, size, on_hand)
  select product_id, color, size, on_hand
  from public.seed_stock_cells
  order by product_id, color, size;

  insert into public.teasers (slug, name, kind, family, drop_no, photo_key, position)
  select slug, name, kind, family, drop_no, photo_key, position
  from public.seed_teasers
  order by position;

  insert into public.promotions (
    code, kind, percent, max_discount_vnd, amount_vnd,
    starts_at, ends_at, usage_limit, used_count, min_order_vnd, position
  )
  select
    code, kind, percent, max_discount_vnd, amount_vnd,
    starts_at + delta, ends_at + delta, usage_limit, used_count, min_order_vnd, position
  from public.seed_promotions
  order by position;

  -- ── the demo accounts, for whichever of them exist
  for c in select * from public.seed_customers order by handle loop
    select u.id into uid from auth.users u where lower(u.email) = lower(c.email) limit 1;
    continue when uid is null;

    -- A handle is unique. If a previous run gave it to a user that has since
    -- gone, let go of it rather than failing on the index.
    update public.profiles set handle = null where handle = c.handle and id <> uid;

    insert into public.profiles (id, handle, name, email, phone, joined_at)
    values (uid, c.handle, c.name, c.email, c.phone, c.joined_at + delta)
    on conflict (id) do update
      set handle    = excluded.handle,
          name      = excluded.name,
          email     = excluded.email,
          phone     = excluded.phone,
          joined_at = excluded.joined_at;

    -- Clear first: the fixture's own default is about to be written at its
    -- position, and two rows claiming the flag mid-statement would trip
    -- `addresses_one_default`.
    update public.addresses set is_default = false where profile_id = uid and is_default;

    insert into public.addresses (
      profile_id, position, recipient, phone, line,
      province_code, ward_code, label, is_default
    )
    select
      uid, a.position, a.recipient, a.phone, a.line,
      a.province_code, a.ward_code, a.label, a.is_default
    from public.seed_addresses a
    where a.handle = c.handle
    order by a.position
    on conflict (profile_id, position) do update
      set recipient     = excluded.recipient,
          phone         = excluded.phone,
          line          = excluded.line,
          province_code = excluded.province_code,
          ward_code     = excluded.ward_code,
          label         = excluded.label,
          is_default    = excluded.is_default;

    -- Anything the demo account added by hand sits past the fixture's last
    -- position and goes, so a reset really is a reset.
    select max(a.position) into last_pos from public.seed_addresses a where a.handle = c.handle;
    delete from public.addresses
     where profile_id = uid and position > coalesce(last_pos, -1);
  end loop;

  -- ── the sample orders, after the accounts they belong to
  insert into public.orders (
    code, profile_id, customer_handle, email, recipient, phone, line,
    province_code, ward_code, note, delivery, payment,
    shipping_fee_vnd, cod_fee_vnd, discount_vnd, promo_code,
    placed_at, state, due_at, paid_at, shipped_at, tracking_code,
    delivered_at, cancelled_at, cancel_reason
  )
  select
    s.code,
    (select p.id from public.profiles p where p.handle = s.customer_handle),
    s.customer_handle, s.email, s.recipient, s.phone, s.line,
    s.province_code, s.ward_code, s.note, s.delivery, s.payment,
    s.shipping_fee_vnd, s.cod_fee_vnd, s.discount_vnd, s.promo_code,
    s.placed_at + delta, s.state, s.due_at + delta, s.paid_at + delta,
    s.shipped_at + delta, s.tracking_code,
    s.delivered_at + delta, s.cancelled_at + delta, s.cancel_reason
  from public.seed_orders s
  order by s.code;

  insert into public.order_lines (order_code, position, product_id, color, size, qty, unit_price_vnd)
  select order_code, position, product_id, color, size, qty, unit_price_vnd
  from public.seed_order_lines
  order by order_code, position;

  -- The next number is the one after the last sample order. Read off the
  -- seed rather than typed, so a fixture that grows keeps numbering right.
  perform setval(
    'public.order_seq',
    coalesce((select max(substring(s.code from 4)::bigint) from public.seed_orders s), 2431)
  );

  -- ── the log: what the sample orders record, then this reset
  truncate table public.events restart identity;

  insert into public.events (at, actor_role, actor, kind, order_code, payload)
  select m.at, m.actor_role, m.actor, m.kind, m.code, m.payload
  from (
    -- Only a TRANSFER matches: a card or COD order reaches PAID some other
    -- way, and naming the wrong mechanism is worse than silence.
    select s.paid_at + delta as at, 'system' as actor_role, '' as actor,
           'ORDER_PAID' as kind, s.code,
           jsonb_build_object('from', 'AWAITING_TRANSFER') as payload
      from public.seed_orders s
     where s.state = 'PAID' and s.payment = 'BANK_TRANSFER'
    union all
    -- Handed over by the shop. The sample recorded no courier's name.
    select s.shipped_at + delta, 'admin', '', 'ORDER_SHIPPED', s.code,
           jsonb_build_object(
             'from', case when s.payment = 'COD' then 'RECEIVED' else 'PAID' end,
             'trackingCode', s.tracking_code)
      from public.seed_orders s
     where s.state = 'SHIPPING'
    union all
    select s.delivered_at + delta, 'system', '', 'ORDER_DELIVERED', s.code, '{}'::jsonb
      from public.seed_orders s
     where s.state = 'DELIVERED'
    union all
    select s.cancelled_at + delta,
           case lower(s.cancel_reason)
             when 'quá hạn chuyển khoản' then 'system'
             when 'khách huỷ' then 'customer'
             else 'admin'
           end,
           case when lower(s.cancel_reason) = 'khách huỷ' then s.email else '' end,
           case lower(s.cancel_reason)
             when 'quá hạn chuyển khoản' then 'ORDER_EXPIRED'
             when 'khách huỷ' then 'ORDER_CANCELLED_BY_CUSTOMER'
             else 'ORDER_CANCELLED'
           end,
           s.code,
           case when lower(s.cancel_reason) in ('quá hạn chuyển khoản', 'khách huỷ')
             then '{}'::jsonb
             else jsonb_build_object('reason', s.cancel_reason, 'note', '')
           end
      from public.seed_orders s
     where s.state = 'CANCELLED'
  ) m
  order by m.at, m.code;

  insert into public.events (at, actor_role, actor, kind, payload)
  values (
    now(),
    case when by_admin then 'admin' else 'system' end,
    case when by_admin then coalesce(auth.jwt() ->> 'email', '') else '' end,
    'DEMO_RESET',
    jsonb_build_object(
      'anchor', to_char(anchor at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD"T"HH24:MI:SS"+07:00"')
    )
  );
end;
$$;

revoke execute on function public.reset_demo(timestamptz) from public, anon;
grant  execute on function public.reset_demo(timestamptz) to authenticated, service_role;
