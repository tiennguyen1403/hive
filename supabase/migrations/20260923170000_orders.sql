-- ─────────────────────────────────────────────────────────── orders schema
--
-- Slice B2: the order moves into Postgres, and with it the one rule a shop
-- cannot fake in a browser — the last piece goes to exactly one buyer.
--
-- Until this file an order lived in two shapes: the sample orders of
-- `data/orders.ts`, and whatever checkout wrote into `localStorage`
-- (`brand.orders`). There is one shape now, `Order` in `data/types.ts`, and
-- one place it is kept. Stock goes DOWN when an order is placed and back UP
-- when one is cancelled, inside the same transaction that writes the order.
--
-- Every write goes through a `security definer` function below; no role the
-- API hands out may insert, update or delete a row of `orders`, `order_lines`,
-- `stock_cells` or `promotions` directly. The functions are the rules.
--
-- BUSINESS TIME IS THE APP'S, NOT POSTGRES'S. Every function that needs "now"
-- takes `p_now` from the Server Action, which passes `toVnIso(demoNow())`
-- (QĐ-24: the demo lives on 20–21/09/2026). Nothing here reads `now()` for a
-- business decision — not the order's timestamp, not the transfer deadline,
-- not whether an issue or a code is open. That is what lets the seed and the
-- screens agree about the date, what lets slice B3 switch to the real clock
-- by changing one function in `lib/clock.ts`, and what lets a test ask "and
-- twelve hours later?" without waiting twelve hours.
--
-- Sources: https://supabase.com/docs/guides/database/functions (definer
-- functions and `set search_path = ''`),
-- https://supabase.com/docs/guides/database/postgres/row-level-security,
-- https://www.postgresql.org/docs/current/explicit-locking.html (row locks and
-- "acquire locks on multiple objects in a consistent order"),
-- https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html
-- (`raise exception using message`, SQLSTATE P0001).

-- ──────────────────────────────────────────────────────────────────── enums
-- The three closed sets of `data/types.ts`, as Postgres enums like the
-- catalogue's five: a new value should cost a migration.
--
-- `RECEIVED` is new in the wire format with this slice: an order the shop
-- has taken and nobody has paid for yet — every COD order, and every card
-- order while no gateway is connected. Calling either `PAID` would be the
-- database claiming money changed hands.
create type public.payment_method  as enum ('BANK_TRANSFER', 'CARD', 'COD');
create type public.delivery_method as enum ('STANDARD', 'EXPRESS');
create type public.order_state     as enum (
  'AWAITING_TRANSFER', 'RECEIVED', 'PAID', 'SHIPPING', 'DELIVERED', 'CANCELLED'
);

-- Order numbers are issued here and only here. The last sample order is
-- DH-2431; `reset_demo()` puts the sequence back to it after every reset.
create sequence public.order_seq start with 2432;

-- ─────────────────────────────────────────────────────────────── the tables
-- One row per order, the status flattened into columns: the check constraint
-- at the bottom is the discriminated union of `OrderStatus` — a shipped order
-- cannot exist without its tracking code, a cancelled one without its reason.
--
-- Nothing derivable is stored. The subtotal and the total are sums over the
-- lines and the three fees, exactly as `lib/orders.ts` computes them; a stored
-- total is a total that can disagree with its own lines.
--
-- `profile_id` is the owner, or null for an order placed signed out.
-- `customer_handle` is the fixture id ('c-minhanh') of a demo account: it is
-- how `reset_demo()` gives the sample orders back to whichever demo users
-- exist, and it is what `order_json()` reports as `customerId`, so the uuid of
-- an account never leaves the database inside an order.
--
-- `access_key` is the guest's receipt: a random uuid handed back once by
-- `place_order()` and kept by the app in an httpOnly cookie. With the code it
-- opens `/order-confirmed/<code>` for whoever placed the order in that
-- browser, and for nobody else.
create table public.orders (
  code             text primary key check (code ~ '^DH-[0-9]{4,}$'),
  profile_id       uuid null references public.profiles (id) on delete set null,
  customer_handle  text null,
  access_key       uuid not null default gen_random_uuid(),
  email            text not null,
  recipient        text not null check (length(trim(recipient)) > 0),
  phone            text not null check (phone ~ '^0[0-9]{9}$'),
  line             text not null check (length(trim(line)) > 0),
  province_code    text not null,
  ward_code        text not null,
  note             text not null default '' check (length(note) <= 500),
  delivery         public.delivery_method not null,
  payment          public.payment_method not null,
  shipping_fee_vnd integer not null check (shipping_fee_vnd >= 0),
  cod_fee_vnd      integer not null check (cod_fee_vnd >= 0),
  discount_vnd     integer not null check (discount_vnd >= 0),
  promo_code       text null references public.promotions (code),
  placed_at        timestamptz not null,
  state            public.order_state not null,
  due_at           timestamptz null,
  paid_at          timestamptz null,
  shipped_at       timestamptz null,
  tracking_code    text null,
  delivered_at     timestamptz null,
  cancelled_at     timestamptz null,
  cancel_reason    text null,
  check (case state
    when 'AWAITING_TRANSFER' then due_at is not null
    when 'RECEIVED'          then true
    when 'PAID'              then paid_at is not null
    when 'SHIPPING'          then shipped_at is not null and tracking_code is not null
    when 'DELIVERED'         then delivered_at is not null
    when 'CANCELLED'         then cancelled_at is not null and cancel_reason is not null
  end)
);

-- `unit_price_vnd` is the price AT THE TIME, copied from `products.price_vnd`
-- inside the transaction that placed the order. A receipt that changes when
-- the shop reprices a style is not a receipt.
create table public.order_lines (
  order_code     text not null references public.orders (code) on delete cascade,
  position       integer not null,
  product_id     text not null references public.products (id),
  color          public.color_key not null,
  size           public.garment_size not null,
  qty            integer not null check (qty >= 1),
  unit_price_vnd integer not null check (unit_price_vnd > 0),
  primary key (order_code, position)
);

-- ────────────────────────────────────────────────────────────── seed mirrors
-- The same flat archive the catalogue and the accounts have: same columns,
-- same checks, no foreign keys (`like … including all` never copies them).
-- The owner is a handle here, never a uuid — the demo users do not exist yet
-- when the seed runs.
create table public.seed_orders      (like public.orders including all);
create table public.seed_order_lines (like public.order_lines including all);

-- "Đơn của tôi", newest first, is the one listing query; the partial index is
-- what `expire_transfers()` walks.
create index orders_profile  on public.orders (profile_id, placed_at desc);
create index orders_awaiting on public.orders (due_at) where state = 'AWAITING_TRANSFER';

-- ──────────────────────────────────────────────────────────────────── RLS
alter table public.orders           enable row level security;
alter table public.order_lines      enable row level security;
alter table public.seed_orders      enable row level security;
alter table public.seed_order_lines enable row level security;

-- A signed-in account reads its own orders and their lines. Nothing else:
-- no policy for `anon` at all, and no insert/update/delete policy for anyone
-- — every write is one of the functions below. `(select auth.uid())` rather
-- than a bare call, and a `to` clause on every policy, on the advice of
-- https://supabase.com/docs/guides/database/postgres/row-level-security.
create policy "orders: read own" on public.orders
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "order lines: read own" on public.order_lines
  for select to authenticated using (
    exists (
      select 1 from public.orders o
       where o.code = order_lines.order_code
         and o.profile_id = (select auth.uid())
    )
  );

-- Adding a policy removes no grant, and Supabase grants the API roles
-- everything on new tables in `public`. An order holds a name, a phone number
-- and a home address: `anon` gets nothing, `authenticated` keeps SELECT (which
-- the policies above then narrow) and loses every write, TRUNCATE included —
-- TRUNCATE is not subject to row level security at all.
revoke all on public.orders, public.order_lines from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.orders, public.order_lines from authenticated;
revoke all on public.seed_orders, public.seed_order_lines from anon, authenticated;
revoke all on sequence public.order_seq from anon, authenticated;

-- ───────────────────────────────────────────────────── one order, as JSON
-- The single shape all three readers get — the signed-in list, the guest's
-- receipt, the public lookup — so one mapper (`lib/db/order-dto.ts`) reads
-- them all. camelCase, `data/types.ts`'s field names, every instant written
-- as the Vietnamese wall clock with its offset spelled out, exactly as
-- `catalog_snapshot()` does: `lib/datetime.ts` reads the offset out of the
-- text, so a UTC string would move every clock on the page by seven hours.
--
-- `security invoker`: called by a signed-in account through the API, it is
-- subject to the read policies above, so somebody else's code simply returns
-- null. Called from inside `track_order()` or `receipt_order()`, it runs as
-- their definer — and those two decide who may see what before they call it.
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

-- The signed-in account's whole list in one round trip, newest first. Also
-- `security invoker`: row level security is what makes it "mine", and the
-- filter on `auth.uid()` only says so out loud.
create or replace function public.my_orders()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(public.order_json(o.code) order by o.placed_at desc, o.code desc),
    '[]'::jsonb
  )
  from public.orders o
  where o.profile_id = (select auth.uid());
$$;

-- ───────────────────────────────────────────── the clock's own housekeeping
-- An unpaid transfer holds its pieces for twelve hours. `effectiveStatus()`
-- in `lib/customer-orders.ts` already reads such an order as cancelled the
-- moment the hold runs out; this is the half that puts the pieces back on the
-- shelf, so the next shopper can buy them.
--
-- INTERNAL. It does two things and they cannot be separated:
--
--   1. lock the holds that have run out (by `p_now`), in code order;
--   2. lock EVERY stock cell the calling transaction is going to write — the
--      cells those holds give back AND the cells the caller is about to sell
--      (`p_pids`/`p_colors`/`p_sizes`, empty for a plain sweep) — in ONE
--      pass, sorted by (product_id, color, size).
--
-- Then it gives the pieces back and marks the orders. Taking every row lock a
-- transaction needs in one fixed order is the standard way to make deadlocks
-- impossible rather than unlikely ("acquire locks on multiple objects in a
-- consistent order", Postgres §13.3.4): order rows first, by code; stock
-- cells next, by key; a promotion row last (`place_order`). Locking the
-- restock and the sale in two separate passes would leave a real, if rare,
-- cycle between two orders whose `p_now` straddle one deadline.
--
-- The moment recorded is the DEADLINE, not "now" — that is when the pieces
-- went back, however long after the fact anybody looks. The reason is the
-- exact string of `OVERDUE_REASON`; `lib/customer-orders.test.ts` pins that
-- the two still match.
--
-- `security invoker` with every API grant revoked: only the two definer
-- functions below can reach it, and they run as its owner.
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

  return cardinality(v_codes);
end;
$$;

-- The sweep on its own: how many holds it just released. Called at the top of
-- every `place_order()` (in the same transaction, through `expire_and_lock`)
-- and once a day by `GET /api/health`. Granted to `anon` because the health
-- route has no session; it only applies the shop's own rule.
create or replace function public.expire_transfers(p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_now is null then
    raise exception using message = 'BAD_INPUT';
  end if;
  return public.expire_and_lock(p_now, '{}', '{}', '{}');
end;
$$;

-- ─────────────────────────────────────────────────────────── placing one
-- One transaction, all or nothing:
--
--   · read and check the input — the Server Action already did, with
--     `validateCheckout()` and the ward list, but this function is reachable
--     by anybody holding the publishable key, so it checks what the database
--     can know for itself;
--   · release the holds that ran out and lock every stock cell it will touch,
--     in the one fixed order (`expire_and_lock`);
--   · check each line: the style exists in that colour, has not sold out,
--     has the units, and its issue is open at `p_now`;
--   · price it FROM THE DATABASE — never from the browser — with exactly the
--     rules of `lib/shipping.ts#checkoutTotals` and
--     `lib/orders.ts#promoDiscountVnd` (`lib/db/orders.dbtest.ts` places the
--     same baskets through both and compares the totals);
--   · lock and spend one use of the code, if there is one;
--   · issue the number, write the order and its lines, take the units off
--     the shelf, and hand back the number and the guest's receipt key.
--
-- Failures are `raise exception using message = '<CODE>'` with one of seven
-- fixed codes. The DAL turns them into a typed `OrderError`, the Server Action
-- into a sentence. Anything else is a bug and surfaces as one.
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
  -- ── the shape of the request
  if p_now is null or p_input is null or jsonb_typeof(p_input) is distinct from 'object' then
    raise exception using message = 'BAD_INPUT';
  end if;

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
    select p.id, p.handle into v_profile, v_handle from public.profiles p where p.id = v_uid;
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

  return jsonb_build_object('code', v_code, 'accessKey', v_key);
end;
$$;

-- ───────────────────────────────────────────────────────── cancelling one
-- The shopper calls off their own unpaid order: a transfer still inside its
-- hold, or a COD / card order nobody has handled. The pieces go back on the
-- shelf in the same transaction; the use of a discount code does not come
-- back (a code that has been spent stays spent).
--
-- Somebody else's order and an order that does not exist are the same
-- answer, `NOT_OWNER` — telling them apart would confirm that a code exists
-- (QĐ-16). The reason is the exact string the screens already print.
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
  if p_now is null then
    raise exception using message = 'BAD_INPUT';
  end if;
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
end;
$$;

-- ────────────────────────────────────────────── reading one without a session
-- Two doors for somebody who is not signed in, both returning the same JSON
-- as `order_json()` and both answering `null` for any miss — a wrong code, a
-- wrong phone number and a wrong key look exactly alike, so neither door can
-- be used to learn that a code exists.

-- `/track`: the code plus the phone number written on the order — QĐ-16 with
-- the number standing in for the session. The app normalises both first
-- (`normaliseOrderCode`, `phoneDigits`), so this compares exact strings.
create or replace function public.track_order(p_code text, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.order_json(o.code)
    from public.orders o
   where o.code = p_code
     and o.phone = p_phone;
$$;

-- `/order-confirmed/<code>` for a guest: the code plus the receipt key the
-- app keeps in an httpOnly cookie.
create or replace function public.receipt_order(p_code text, p_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.order_json(o.code)
    from public.orders o
   where o.code = p_code
     and o.access_key = p_key;
$$;

-- ──────────────────────────────────────────────────────────────── grants
-- Supabase's default privileges hand EXECUTE on every new function in
-- `public` to `anon` and `authenticated`, so each function states who may
-- call it rather than trusting the default.
revoke execute on function public.order_json(text) from public, anon;
grant  execute on function public.order_json(text) to authenticated;

revoke execute on function public.my_orders() from public, anon;
grant  execute on function public.my_orders() to authenticated;

revoke execute on function public.expire_and_lock(timestamptz, text[], public.color_key[], public.garment_size[])
  from public, anon, authenticated;

revoke execute on function public.expire_transfers(timestamptz) from public;
grant  execute on function public.expire_transfers(timestamptz) to anon, authenticated;

revoke execute on function public.place_order(jsonb, timestamptz) from public;
grant  execute on function public.place_order(jsonb, timestamptz) to anon, authenticated;

revoke execute on function public.cancel_order(text, timestamptz) from public, anon;
grant  execute on function public.cancel_order(text, timestamptz) to authenticated;

revoke execute on function public.track_order(text, text) from public;
grant  execute on function public.track_order(text, text) to anon, authenticated;

revoke execute on function public.receipt_order(text, uuid) from public;
grant  execute on function public.receipt_order(text, uuid) to anon, authenticated;

-- ───────────────────────────────────────────────────────── reset_demo, v3
-- Replaces version 2 from `20260923124500_accounts.sql`. The catalogue and
-- the accounts are rebuilt exactly as before; what is new is the tail, which
-- puts the twenty-four sample orders back:
--
--   · every instant shifted by the same delta as the catalogue's;
--   · each order given back to the demo account whose handle it carries, or
--     to nobody while that account does not exist yet (`db reset` runs
--     before `npm run seed:users`);
--   · the order sequence set to the last sample number, so the next order
--     placed is DH-2432 again;
--   · stock and `used_count` untouched — the seed already accounts for the
--     sample orders (`sold = cut_units − Σ on_hand` has always included
--     them), and restoring the orders must not sell those pieces twice.
--
-- Every order gets a fresh `access_key`: a guest's receipt cookie from before
-- a reset opens nothing afterwards, which is what a reset should mean.
--
-- `order_lines` and `orders` join the catalogue's TRUNCATE: they now point
-- at `products` and `promotions`, and Postgres refuses to truncate a table
-- that a table outside the statement references.
create or replace function public.reset_demo(p_anchor timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fixture_anchor constant timestamptz := '2026-09-20 18:50:00+07'::timestamptz;
  delta constant interval := coalesce(p_anchor, fixture_anchor) - fixture_anchor;
  c record;
  uid uuid;
  last_pos integer;
begin
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
end;
$$;

revoke execute on function public.reset_demo(timestamptz) from public, anon, authenticated;
grant  execute on function public.reset_demo(timestamptz) to service_role;
