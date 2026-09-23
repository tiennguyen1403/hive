-- ─────────────────────────────────────────────────── catalogue admin schema
--
-- Slice B3b: the back office stops being a simulation for the CATALOGUE too.
-- Until this file an adjusted shelf, a new issue, a moved closing hour, a
-- teaser, a discount code and an edited style lived in one browser
-- (`brand.adminSim`) and the shop never heard about any of them. From here
-- each is a function with a guard, writing Postgres and one row of
-- `public.events` in the same transaction — the same shape slice B3a gave the
-- orders:
--
--   1. `NOT_ADMIN` unless the caller's token carries the admin role, before
--      anything is read;
--   2. `BAD_INPUT` for a `p_now` far from the real clock (`assert_now`) and
--      for anything the forms could not have sent;
--   3. `NOT_FOUND` when the thing acted on does not exist;
--   4. `NOT_ALLOWED` when the guard refuses the move in the state it is in;
--   5. `STALE` when a shelf changed under the form (`admin_adjust_stock`);
--   6. the write, and exactly one event.
--
-- Two things become facts the database keeps rather than numbers a browser
-- remembered:
--
--   · `promotions.paused` — a code the shop stopped without touching its
--     dates. Checkout refuses it (`place_order` → `PROMO_INVALID`) until it
--     is resumed.
--   · `products.sold_out_at` is LIVE: `place_order` stamps it when the last
--     piece of a style goes, and anything that puts pieces back on the shelf
--     — a cancellation, a released hold, an adjustment — clears it.
--
-- Lock order, extended from slice B2's "orders, cells, code": every writer
-- takes order rows first, then stock cells (sorted), then a promotion row,
-- then product rows (sorted). No function here takes them in any other order.
--
-- Sources: https://supabase.com/docs/guides/database/functions (security
-- definer, `set search_path = ''`, revoking execute from public and anon),
-- https://supabase.com/docs/guides/database/postgres/row-level-security,
-- https://www.postgresql.org/docs/current/functions-json.html (jsonb
-- operators and `jsonb_array_elements`),
-- https://www.postgresql.org/docs/current/sql-createtable.html ("Changes to
-- the original table will not be applied to the new table" — hence the
-- second `alter table` below), https://www.postgresql.org/docs/current/sql-expressions.html
-- ("The order of evaluation of subexpressions is not defined" — hence a type
-- check and the cast that depends on it are never in one condition),
-- https://www.postgresql.org/docs/current/explicit-locking.html.

-- ──────────────────────────────────────────────────────────── paused codes
-- `seed_promotions` was made `like public.promotions` and a LIKE copy is
-- "completely decoupled after creation", so the mirror gets the column too.
-- The fixture pauses nothing: the generator writes `false`.
alter table public.promotions
  add column paused boolean not null default false;
alter table public.seed_promotions
  add column paused boolean not null default false;

-- ─────────────────────────────────────────────────────── the log's new kinds
-- The closed set of `kind` grows by ten, and each new kind names what it is
-- about in its own column, the way every `ORDER_` event names its order: a
-- style for the shelf and the style edits, a code for the six code moves, an
-- issue for the issue moves and the teasers.
alter table public.events drop constraint events_kind_check;
alter table public.events add constraint events_kind_check check (kind in (
  'ORDER_PLACED',
  'ORDER_PAID',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED',
  'ORDER_CANCELLED_BY_CUSTOMER',
  'ORDER_EXPIRED',
  'ORDER_NOTE',
  'ORDER_ADDRESS_EDITED',
  'DEMO_RESET',
  'INVENTORY_ADJUSTED',
  'PRODUCT_EDITED',
  'DROP_ADDED',
  'DROP_SCHEDULED',
  'TEASER_ADDED',
  'PROMO_ADDED',
  'PROMO_EDITED',
  'PROMO_PAUSED',
  'PROMO_LIMIT_RAISED',
  'PROMO_ENDED'
));
alter table public.events add constraint events_product_check
  check ((kind in ('INVENTORY_ADJUSTED', 'PRODUCT_EDITED')) = (product_id is not null));
alter table public.events add constraint events_promo_check
  check ((left(kind, 6) = 'PROMO_') = (promo_code is not null));
alter table public.events add constraint events_drop_check
  check ((kind in ('DROP_ADDED', 'DROP_SCHEDULED', 'TEASER_ADDED')) = (drop_no is not null));

-- ─────────────────────────────────────────────────────────── small helpers
-- INTERNAL, all four: every API grant is revoked, and only the definer
-- functions below — which run as their owner — call them.

-- An instant as every payload in the log writes it: the Vietnamese wall clock
-- with the offset spelled out, the way `catalog_snapshot()` and `order_json()`
-- write theirs (`lib/datetime.ts` reads the text, not the instant).
create or replace function public.vn_iso(p_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(p_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD"T"HH24:MI:SS"+07:00"');
$$;

-- The other direction, for an instant that arrived inside a jsonb document:
-- only the one shape the app writes (`toVnIso`, `parseStamp`), and null for
-- anything else — a malformed date is a bad request, not a crash.
create or replace function public.parse_vn_iso(p_text text)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_text is null
     or p_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+07:00$' then
    return null;
  end if;
  return p_text::timestamptz;
exception
  when others then
    return null;
end;
$$;

-- A count or an amount inside a jsonb document: absent or null is null; a
-- whole, non-negative number that fits an integer is that number; anything
-- else is `BAD_INPUT`.
create or replace function public.json_count(p_value jsonb)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v numeric;
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_value) is distinct from 'number' then
    raise exception using message = 'BAD_INPUT';
  end if;
  v := (p_value #>> '{}')::numeric;
  if v <> trunc(v) or v < 0 or v > 2147483647 then
    raise exception using message = 'BAD_INPUT';
  end if;
  return v::integer;
end;
$$;

-- "Sold out" as a fact the shop keeps, kept true for the styles a write just
-- touched: stamped `p_now` when nothing is left and it was not stamped yet,
-- cleared when something is back on the shelf. The product rows are locked
-- first, in id order, and the totals read in a SECOND statement — so two
-- orders taking the last two pieces of one style at once cannot both see a
-- piece still there: the second waits, then reads the first's commit.
create or replace function public.sync_sold_out(p_product_ids text[], p_now timestamptz)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_product_ids is null or cardinality(p_product_ids) = 0 then
    return;
  end if;

  perform 1
     from public.products p
    where p.id = any (p_product_ids)
    order by p.id
      for update;

  update public.products p
     set sold_out_at = case when t.total = 0 then p_now else null end
    from (
      select sc.product_id, sum(sc.on_hand) as total
        from public.stock_cells sc
       where sc.product_id = any (p_product_ids)
       group by sc.product_id
    ) t
   where p.id = t.product_id
     and ((t.total = 0 and p.sold_out_at is null)
       or (t.total > 0 and p.sold_out_at is not null));
end;
$$;

revoke execute on function public.vn_iso(timestamptz) from public, anon, authenticated;
revoke execute on function public.parse_vn_iso(text) from public, anon, authenticated;
revoke execute on function public.json_count(jsonb) from public, anon, authenticated;
revoke execute on function public.sync_sold_out(text[], timestamptz) from public, anon, authenticated;

-- ──────────────────────────────────────────── the catalogue as JSON (v2)
-- Replaces the version in `20260923083130_catalog.sql`. The only change: each
-- code says whether the shop has paused it.
create or replace function public.catalog_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'slug', p.slug,
          'name', p.name,
          'kind', p.kind,
          'family', p.family::text,
          'material', p.material,
          'fit', p.fit::text,
          'priceVnd', p.price_vnd,
          'cutUnits', p.cut_units,
          'dropNo', p.drop_no,
          'soldOutAt', to_char(p.sold_out_at at time zone 'Asia/Ho_Chi_Minh',
                               'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'),
          'colors', coalesce((
            select jsonb_agg(pc.color::text order by pc.position)
            from public.product_colors pc where pc.product_id = p.id
          ), '[]'::jsonb),
          'photoKeys', coalesce((
            select jsonb_agg(pc.photo_key order by pc.position)
            from public.product_colors pc where pc.product_id = p.id
          ), '[]'::jsonb),
          'stock', coalesce((
            select jsonb_object_agg(g.color, g.sizes)
            from (
              select sc.color::text as color,
                     jsonb_object_agg(sc.size::text, sc.on_hand) as sizes
              from public.stock_cells sc
              where sc.product_id = p.id
              group by sc.color
            ) g
          ), '{}'::jsonb)
        ) order by p.position
      )
      from public.products p
    ), '[]'::jsonb),
    'drops', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'no', d.no,
          'opensAt', to_char(d.opens_at at time zone 'Asia/Ho_Chi_Minh',
                             'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'),
          'closesAt', to_char(d.closes_at at time zone 'Asia/Ho_Chi_Minh',
                              'YYYY-MM-DD"T"HH24:MI:SS"+07:00"')
        ) order by d.no
      )
      from public.drops d
    ), '[]'::jsonb),
    'teasers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'slug', t.slug,
          'name', t.name,
          'kind', t.kind,
          'family', t.family::text,
          'dropNo', t.drop_no,
          'photoKey', t.photo_key
        ) order by t.position
      )
      from public.teasers t
    ), '[]'::jsonb),
    'promotions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'code', m.code,
          'kind', m.kind::text,
          'percent', m.percent,
          'maxDiscountVnd', m.max_discount_vnd,
          'amountVnd', m.amount_vnd,
          'startsAt', to_char(m.starts_at at time zone 'Asia/Ho_Chi_Minh',
                              'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'),
          'endsAt', to_char(m.ends_at at time zone 'Asia/Ho_Chi_Minh',
                            'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'),
          'usageLimit', m.usage_limit,
          'usedCount', m.used_count,
          'minOrderVnd', m.min_order_vnd,
          'paused', m.paused
        ) order by m.position
      )
      from public.promotions m
    ), '[]'::jsonb)
  );
$$;

-- (grants unchanged: anon and authenticated may read the catalogue)

-- ─────────────────────────────────────── the clock's housekeeping (v3)
-- Replaces the version in `20260924001000_admin.sql`: same locks, same
-- events, and a released hold now also un-stamps "sold out" on the styles it
-- put back on the shelf.
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

  perform public.sync_sold_out(
    array(select distinct l.product_id from public.order_lines l where l.order_code = any (v_codes)),
    p_now
  );

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

-- (grants unchanged: every API role stays revoked)

-- ─────────────────────────────────────────────────────── placing one (v3)
-- Replaces the version in `20260924001000_admin.sql`. Two changes: a paused
-- code is refused with the same `PROMO_INVALID` as one that is over, and the
-- style whose last piece this order takes is stamped sold out at `p_now`.
-- Everything else is unchanged.
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

    -- Unknown, paused by the shop, not started, over, used up, or under its
    -- minimum: the checkout screen refuses all six with a reason before the
    -- button is ever pressed (`lib/promotions.ts#checkPromoCode`), so
    -- reaching one here means the code changed between the page and the
    -- order.
    if not found then
      raise exception using message = 'PROMO_INVALID';
    end if;
    if v_offer.paused
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

  -- The last piece of a style just went: that is the moment it sold out.
  perform public.sync_sold_out(v_pids, p_now);

  -- The shopper placed it: the account's email when signed in, the one typed
  -- at checkout when not.
  insert into public.events (at, actor_role, actor, kind, order_code)
  values (p_now, 'customer', coalesce(nullif(v_account, ''), v_email), 'ORDER_PLACED', v_code);

  return jsonb_build_object('code', v_code, 'accessKey', v_key);
end;
$$;

-- (grants unchanged: anon and authenticated may place an order)

-- ───────────────────────────────────────────────────── cancelling one (v3)
-- Replaces the version in `20260924001000_admin.sql`: the pieces going back
-- un-stamp "sold out" on their styles. Everything else is unchanged.
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

  perform public.sync_sold_out(
    array(select distinct l.product_id from public.order_lines l where l.order_code = p_code),
    p_now
  );

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

-- (grants unchanged: authenticated only)

-- ──────────────────────────────────────────────── the shop cancels (v2)
-- Replaces the version in `20260924001000_admin.sql`: the pieces going back
-- un-stamp "sold out" on their styles. Everything else is unchanged.
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

  perform public.sync_sold_out(
    array(select distinct l.product_id from public.order_lines l where l.order_code = p_code),
    p_now
  );

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

-- (grants unchanged: authenticated only, the body asks for the role)

-- ─────────────────────────────────────────────────────────────── the shelf
-- "Điều chỉnh tồn kho": several cells of one style, with a reason, as ONE
-- decision and one event.
--
--   · every cell names a colour the style comes in and a size, once;
--   · `before` is what the form was showing. Every cell of the style is
--     locked (sorted, the fixed order) and each `before` must still be the
--     shelf's own number — somebody else's change in between is `STALE`,
--     never silently overwritten;
--   · `after` is a whole number of pieces, never negative, and different
--     from `before` — an adjustment moves something;
--   · THE CUT IS THE CEILING. An issue is cut once and never restocked; a
--     shelf holding more than was cut would make every "đã bán" figure
--     downstream (`cut − on hand`) lie, so the total after the write may not
--     exceed `cut_units` (`lib/inventory-adjust.ts#saveBlocker` refuses the
--     same thing on the button);
--   · the reason is one of the sheet's four, or "Sửa mẫu" — the product
--     form's grid saves through here too (`lib/inventory-adjust.ts`,
--     `STOCK_REASONS`).
--
-- Afterwards "sold out" follows the shelf: stamped `p_now` when the style has
-- nothing left, cleared when pieces came back.
create or replace function public.admin_adjust_stock(
  p_product_id text,
  p_cells      jsonb,
  p_reason     text,
  p_ref        text,
  p_note       text,
  p_now        timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reasons   constant text[] := array['Hàng trả về', 'Kiểm kê lệch', 'Hư hỏng', 'Khác', 'Sửa mẫu'];
  -- Seven colours by four sizes: a grid can hold no more cells than that.
  max_cells constant integer := 28;
  v_reason  text := btrim(coalesce(p_reason, ''));
  v_ref     text := btrim(coalesce(p_ref, ''));
  v_note    text := btrim(coalesce(p_note, ''));
  v_item    jsonb;
  v_color   text;
  v_size    text;
  v_before_n numeric;
  v_after_n  numeric;
  v_colors  public.color_key[] := '{}';
  v_sizes   public.garment_size[] := '{}';
  v_before  integer[] := '{}';
  v_after   integer[] := '{}';
  v_cut     integer;
  v_on_hand integer;
  v_total   integer;
  v_delta   integer := 0;
  v_cells   jsonb := '[]'::jsonb;
  i         integer;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_cells is null or jsonb_typeof(p_cells) is distinct from 'array' then
    raise exception using message = 'BAD_INPUT';
  end if;
  if jsonb_array_length(p_cells) = 0 or jsonb_array_length(p_cells) > max_cells
     or not (v_reason = any (reasons))
     or length(v_ref) > 200 or length(v_note) > 500 then
    raise exception using message = 'BAD_INPUT';
  end if;

  for v_item in select value from jsonb_array_elements(p_cells) loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or jsonb_typeof(v_item -> 'color') is distinct from 'string'
       or jsonb_typeof(v_item -> 'size') is distinct from 'string'
       or jsonb_typeof(v_item -> 'before') is distinct from 'number'
       or jsonb_typeof(v_item -> 'after') is distinct from 'number' then
      raise exception using message = 'BAD_INPUT';
    end if;

    v_color    := v_item ->> 'color';
    v_size     := v_item ->> 'size';
    v_before_n := (v_item ->> 'before')::numeric;
    v_after_n  := (v_item ->> 'after')::numeric;

    if not (v_color = any (enum_range(null::public.color_key)::text[]))
       or not (v_size = any (enum_range(null::public.garment_size)::text[]))
       or v_before_n <> trunc(v_before_n) or v_before_n < 0 or v_before_n > 100000
       or v_after_n <> trunc(v_after_n) or v_after_n < 0 or v_after_n > 100000
       or v_after_n = v_before_n then
      raise exception using message = 'BAD_INPUT';
    end if;

    -- One decision per cell: the grid never sends a cell twice.
    if exists (
      select 1 from unnest(v_colors, v_sizes) as c (col, sz)
       where c.col = v_color::public.color_key
         and c.sz = v_size::public.garment_size
    ) then
      raise exception using message = 'BAD_INPUT';
    end if;

    v_colors := v_colors || v_color::public.color_key;
    v_sizes  := v_sizes || v_size::public.garment_size;
    v_before := v_before || v_before_n::integer;
    v_after  := v_after || v_after_n::integer;
  end loop;

  -- The cut never moves, so reading it needs no lock.
  select p.cut_units into v_cut from public.products p where p.id = p_product_id;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  -- Every cell of the style, in the fixed order: the total below has to be
  -- the style's real total, not one another writer is halfway through.
  perform 1
     from public.stock_cells sc
    where sc.product_id = p_product_id
    order by sc.product_id, sc.color, sc.size
      for update;

  for i in 1 .. cardinality(v_colors) loop
    select sc.on_hand into v_on_hand
      from public.stock_cells sc
     where sc.product_id = p_product_id
       and sc.color = v_colors[i]
       and sc.size = v_sizes[i];
    -- No cell: a colour this style does not come in.
    if not found then
      raise exception using message = 'BAD_INPUT';
    end if;
    if v_on_hand <> v_before[i] then
      raise exception using message = 'STALE';
    end if;
  end loop;

  for i in 1 .. cardinality(v_colors) loop
    update public.stock_cells
       set on_hand = v_after[i]
     where product_id = p_product_id
       and color = v_colors[i]
       and size = v_sizes[i];

    v_delta := v_delta + (v_after[i] - v_before[i]);
    v_cells := v_cells || jsonb_build_array(jsonb_build_object(
      'color', v_colors[i]::text,
      'size', v_sizes[i]::text,
      'before', v_before[i],
      'after', v_after[i]
    ));
  end loop;

  select coalesce(sum(sc.on_hand), 0)::integer into v_total
    from public.stock_cells sc where sc.product_id = p_product_id;
  if v_total > v_cut then
    raise exception using message = 'BAD_INPUT';
  end if;

  perform public.sync_sold_out(array[p_product_id], p_now);

  insert into public.events (at, actor_role, actor, kind, product_id, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'INVENTORY_ADJUSTED', p_product_id,
    jsonb_build_object(
      'cells', v_cells,
      'reason', v_reason,
      'ref', v_ref,
      'note', v_note,
      'delta', v_delta
    )
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────── the issues
-- A new issue is the NEXT number, never another one: `nextDropNo` in the
-- back office offers exactly `max + 1`, and a second tab that offered the
-- same number a moment later is told it has been taken. The table is locked
-- for the few statements that read the maximum and write the row, so two
-- presses cannot both win.
create or replace function public.admin_add_drop(
  p_no        integer,
  p_opens_at  timestamptz,
  p_closes_at timestamptz,
  p_now       timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next integer;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_no is null or p_no <= 0 or p_opens_at is null or p_closes_at is null
     or p_closes_at <= p_opens_at then
    raise exception using message = 'BAD_INPUT';
  end if;

  lock table public.drops in share row exclusive mode;

  select coalesce(max(d.no), 0) + 1 into v_next from public.drops d;
  if p_no <> v_next then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  insert into public.drops (no, opens_at, closes_at) values (p_no, p_opens_at, p_closes_at);

  insert into public.events (at, actor_role, actor, kind, drop_no, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'DROP_ADDED', p_no,
    jsonb_build_object('opensAt', public.vn_iso(p_opens_at), 'closesAt', public.vn_iso(p_closes_at))
  );
end;
$$;

-- An issue's two instants, moved — any issue, in any state. "Đóng sớm" is
-- this with `p_closes_at = p_now`, not a function of its own and not a
-- fourth state: the state is derived from these two instants and nothing else
-- (`lib/drop.ts#dropState`). The event keeps both pairs.
create or replace function public.admin_schedule_drop(
  p_no        integer,
  p_opens_at  timestamptz,
  p_closes_at timestamptz,
  p_now       timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_drop record;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_no is null or p_opens_at is null or p_closes_at is null
     or p_closes_at <= p_opens_at then
    raise exception using message = 'BAD_INPUT';
  end if;

  select d.opens_at, d.closes_at into v_drop
    from public.drops d where d.no = p_no for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  update public.drops
     set opens_at  = p_opens_at,
         closes_at = p_closes_at
   where no = p_no;

  insert into public.events (at, actor_role, actor, kind, drop_no, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'DROP_SCHEDULED', p_no,
    jsonb_build_object(
      'before', jsonb_build_object(
        'opensAt', public.vn_iso(v_drop.opens_at),
        'closesAt', public.vn_iso(v_drop.closes_at)
      ),
      'after', jsonb_build_object(
        'opensAt', public.vn_iso(p_opens_at),
        'closesAt', public.vn_iso(p_closes_at)
      )
    )
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────── the teasers
-- A style announced for an issue: a name, a kind and a borrowed photo, and
-- NOTHING ELSE — no price and no cut, which are published at the hour the
-- issue opens (`Teaser` in `data/types.ts`). The photo has to be one the
-- catalogue already borrows: there is no product photography (PRODUCT.md),
-- and a key nobody can resolve is a broken image on the home page. The slug
-- is the app's (`lib/teasers.ts#teaserSlug`), checked here for shape and for
-- being new; the new teaser goes last.
create or replace function public.admin_add_teaser(
  p_slug      text,
  p_name      text,
  p_garment   text,
  p_family    text,
  p_drop_no   integer,
  p_photo_key text,
  p_now       timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug    text := btrim(coalesce(p_slug, ''));
  v_name    text := btrim(coalesce(p_name, ''));
  v_garment text := btrim(coalesce(p_garment, ''));
  v_family  text := btrim(coalesce(p_family, ''));
  v_photo   text := btrim(coalesce(p_photo_key, ''));
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if v_slug !~ '^[a-z0-9-]+$' or length(v_slug) > 80
     or v_name = '' or length(v_name) > 40
     or v_garment = '' or length(v_garment) > 80
     or not (v_family = any (enum_range(null::public.product_family)::text[]))
     or p_drop_no is null
     or v_photo = '' then
    raise exception using message = 'BAD_INPUT';
  end if;

  if not exists (select 1 from public.product_colors pc where pc.photo_key = v_photo)
     and not exists (select 1 from public.teasers t where t.photo_key = v_photo) then
    raise exception using message = 'BAD_INPUT';
  end if;

  perform 1 from public.drops d where d.no = p_drop_no;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  lock table public.teasers in share row exclusive mode;

  if exists (select 1 from public.teasers t where t.slug = v_slug) then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  insert into public.teasers (slug, name, kind, family, drop_no, photo_key, position)
  select v_slug, v_name, v_garment, v_family::public.product_family, p_drop_no, v_photo,
         coalesce(max(t.position), -1) + 1
    from public.teasers t;

  insert into public.events (at, actor_role, actor, kind, drop_no, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'TEASER_ADDED', p_drop_no,
    jsonb_build_object(
      'slug', v_slug,
      'name', v_name,
      'garment', v_garment,
      'family', v_family,
      'photoKey', v_photo
    )
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────── the codes
-- The terms of a code, read the way the table's own check constraint reads
-- them: a PERCENT code has a percentage (1–100) and maybe a cap, and no
-- amount; an AMOUNT code has an amount and neither of the other two; free
-- shipping has none of the three. The minimum order and the cap are "none"
-- when absent, null or 0; the usage limit is null for unlimited and otherwise
-- at least 1. Both instants in the app's own shape, the end after the start.
--
-- Returns the terms normalised — the one shape both the table write and the
-- log's `before` / `after` use — or raises `BAD_INPUT`. INTERNAL.
create or replace function public.read_promo_terms(p_terms jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_kind    text;
  v_percent integer;
  v_cap     integer;
  v_amount  integer;
  v_min     integer;
  v_limit   integer;
  v_starts  timestamptz;
  v_ends    timestamptz;
begin
  if p_terms is null or jsonb_typeof(p_terms) is distinct from 'object' then
    raise exception using message = 'BAD_INPUT';
  end if;

  v_kind := p_terms ->> 'kind';
  if v_kind is null or not (v_kind = any (enum_range(null::public.promo_kind)::text[])) then
    raise exception using message = 'BAD_INPUT';
  end if;

  v_percent := public.json_count(p_terms -> 'percent');
  v_cap     := nullif(public.json_count(p_terms -> 'maxDiscountVnd'), 0);
  v_amount  := public.json_count(p_terms -> 'amountVnd');
  v_min     := nullif(public.json_count(p_terms -> 'minOrderVnd'), 0);
  v_limit   := public.json_count(p_terms -> 'usageLimit');
  v_starts  := public.parse_vn_iso(p_terms ->> 'startsAt');
  v_ends    := public.parse_vn_iso(p_terms ->> 'endsAt');

  if v_starts is null or v_ends is null or v_ends <= v_starts
     or (v_limit is not null and v_limit < 1) then
    raise exception using message = 'BAD_INPUT';
  end if;

  if v_kind = 'PERCENT' then
    if v_percent is null or v_percent < 1 or v_percent > 100 or v_amount is not null then
      raise exception using message = 'BAD_INPUT';
    end if;
  elsif v_kind = 'AMOUNT' then
    if v_amount is null or v_amount < 1 or v_percent is not null or v_cap is not null then
      raise exception using message = 'BAD_INPUT';
    end if;
  else
    if v_percent is not null or v_amount is not null or v_cap is not null then
      raise exception using message = 'BAD_INPUT';
    end if;
  end if;

  return jsonb_build_object(
    'kind', v_kind,
    'percent', v_percent,
    'maxDiscountVnd', v_cap,
    'amountVnd', v_amount,
    'minOrderVnd', v_min,
    'usageLimit', v_limit,
    'startsAt', public.vn_iso(v_starts),
    'endsAt', public.vn_iso(v_ends)
  );
end;
$$;

revoke execute on function public.read_promo_terms(jsonb) from public, anon, authenticated;

-- A new code: upper case, no whitespace, not taken, with nothing redeemed
-- against it and not paused. It goes last in the list.
create or replace function public.admin_add_promo(p_terms jsonb, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code  text;
  v_terms jsonb;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  v_terms := public.read_promo_terms(p_terms);
  v_code := p_terms ->> 'code';
  if v_code is null or v_code = '' or length(v_code) > 40
     or v_code <> upper(v_code) or v_code ~ '\s' then
    raise exception using message = 'BAD_INPUT';
  end if;

  lock table public.promotions in share row exclusive mode;

  if exists (select 1 from public.promotions m where m.code = v_code) then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  insert into public.promotions (
    code, kind, percent, max_discount_vnd, amount_vnd,
    starts_at, ends_at, usage_limit, used_count, min_order_vnd, position, paused
  )
  select
    v_code,
    (v_terms ->> 'kind')::public.promo_kind,
    (v_terms ->> 'percent')::integer,
    (v_terms ->> 'maxDiscountVnd')::integer,
    (v_terms ->> 'amountVnd')::integer,
    (v_terms ->> 'startsAt')::timestamptz,
    (v_terms ->> 'endsAt')::timestamptz,
    (v_terms ->> 'usageLimit')::integer,
    0,
    (v_terms ->> 'minOrderVnd')::integer,
    coalesce(max(m.position), -1) + 1,
    false
  from public.promotions m;

  insert into public.events (at, actor_role, actor, kind, promo_code, payload)
  values (p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'PROMO_ADDED', v_code, v_terms);
end;
$$;

-- New terms for a code that exists. THE CODE DOES NOT CHANGE: orders carry
-- it (`orders.promo_code` references it), so a renamed code would be a
-- different code wearing an old one's history — "nhân bản" is how the back
-- office makes a new one from an old one. What the code has already done
-- (`used_count`) and whether it is paused are not terms and stay as they are.
create or replace function public.admin_edit_promo(p_code text, p_terms jsonb, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_terms  jsonb;
  v_row    public.promotions%rowtype;
  v_before jsonb;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  v_terms := public.read_promo_terms(p_terms);
  if p_terms ? 'code' and (p_terms ->> 'code') is distinct from p_code then
    raise exception using message = 'BAD_INPUT';
  end if;

  select * into v_row from public.promotions m where m.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  v_before := jsonb_build_object(
    'kind', v_row.kind::text,
    'percent', v_row.percent,
    'maxDiscountVnd', v_row.max_discount_vnd,
    'amountVnd', v_row.amount_vnd,
    'minOrderVnd', v_row.min_order_vnd,
    'usageLimit', v_row.usage_limit,
    'startsAt', public.vn_iso(v_row.starts_at),
    'endsAt', public.vn_iso(v_row.ends_at)
  );
  -- Nothing to save is not a save.
  if v_before = v_terms then
    raise exception using message = 'BAD_INPUT';
  end if;

  update public.promotions
     set kind             = (v_terms ->> 'kind')::public.promo_kind,
         percent          = (v_terms ->> 'percent')::integer,
         max_discount_vnd = (v_terms ->> 'maxDiscountVnd')::integer,
         amount_vnd       = (v_terms ->> 'amountVnd')::integer,
         min_order_vnd    = (v_terms ->> 'minOrderVnd')::integer,
         usage_limit      = (v_terms ->> 'usageLimit')::integer,
         starts_at        = (v_terms ->> 'startsAt')::timestamptz,
         ends_at          = (v_terms ->> 'endsAt')::timestamptz
   where code = p_code;

  insert into public.events (at, actor_role, actor, kind, promo_code, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'PROMO_EDITED', p_code,
    jsonb_build_object('before', v_before, 'after', v_terms)
  );
end;
$$;

-- Stopped, or started again, without touching the dates: pausing and ending
-- are different promises — one can be taken back — and burying the
-- difference in `ends_at` would make "Tiếp tục" impossible to say. Pausing a
-- paused code (or resuming a running one) is a stale screen: `NOT_ALLOWED`.
create or replace function public.admin_pause_promo(p_code text, p_paused boolean, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paused boolean;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_paused is null then
    raise exception using message = 'BAD_INPUT';
  end if;

  select m.paused into v_paused from public.promotions m where m.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;
  if v_paused = p_paused then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  update public.promotions set paused = p_paused where code = p_code;

  insert into public.events (at, actor_role, actor, kind, promo_code, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'PROMO_PAUSED', p_code,
    jsonb_build_object('paused', p_paused)
  );
end;
$$;

-- More uses: the new limit must be above the one the code has — or the code
-- had none. A limit that did not go up is somebody else's raise already
-- applied, or a stale screen: `NOT_ALLOWED`.
create or replace function public.admin_raise_promo_limit(p_code text, p_after integer, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_after is null or p_after < 1 then
    raise exception using message = 'BAD_INPUT';
  end if;

  select m.usage_limit into v_limit from public.promotions m where m.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;
  if v_limit is not null and p_after <= v_limit then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  update public.promotions set usage_limit = p_after where code = p_code;

  insert into public.events (at, actor_role, actor, kind, promo_code, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'PROMO_LIMIT_RAISED', p_code,
    jsonb_build_object('before', v_limit, 'after', p_after)
  );
end;
$$;

-- Over now: the closing instant moves to `p_now`, the same mechanism as an
-- issue's early close — never a state flag nobody can derive. Only a code
-- inside its window can be ended early: one that is over already has nothing
-- to end, and one that has not started would close before it opened.
create or replace function public.admin_end_promo(p_code text, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  select m.starts_at, m.ends_at into v_row
    from public.promotions m where m.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;
  if not (v_row.starts_at < p_now and v_row.ends_at > p_now) then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  update public.promotions set ends_at = p_now where code = p_code;

  insert into public.events (at, actor_role, actor, kind, promo_code, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'PROMO_ENDED', p_code,
    jsonb_build_object('before', public.vn_iso(v_row.ends_at), 'after', public.vn_iso(p_now))
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────── the styles
-- "Sửa mẫu": some of a style's own fields — its name, its kind, the segment
-- in its address, its price, its material, its fit, its issue. NOT the cut:
-- an issue is cut once ("cắt một lần"), and a back office that could change
-- `cut_units` could make every sold figure say anything. Nor the colours and
-- photos, which the approved form has no controls for.
--
-- The kind decides the family where the catalogue can say which: a style
-- moved to a kind that every other style of that kind files under one family
-- follows it there, so the family tabs and the kind line never disagree (the
-- teaser form reads a kind's family the same way, `familyOf`). A kind nobody
-- else uses leaves the family as it was.
--
-- Orders are untouched by any of it: a line carries the style's id and the
-- price AT THE TIME, so a new price or a new address segment changes no
-- receipt. The event keeps only what changed, before and after.
create or replace function public.admin_update_product(p_id text, p_patch jsonb, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed constant text[] := array['name', 'kind', 'slug', 'priceVnd', 'material', 'fit', 'dropNo'];
  v_p        public.products%rowtype;
  v_name     text;
  v_kind     text;
  v_family   public.product_family;
  v_families public.product_family[];
  v_slug     text;
  v_price    integer;
  v_material text;
  v_fit      public.product_fit;
  v_drop     integer;
  v_before   jsonb := '{}'::jsonb;
  v_after    jsonb := '{}'::jsonb;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_patch is null or jsonb_typeof(p_patch) is distinct from 'object' then
    raise exception using message = 'BAD_INPUT';
  end if;
  if not exists (select 1 from jsonb_object_keys(p_patch))
     or exists (select 1 from jsonb_object_keys(p_patch) k where not (k = any (allowed))) then
    raise exception using message = 'BAD_INPUT';
  end if;

  select * into v_p from public.products p where p.id = p_id for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  v_name     := v_p.name;
  v_kind     := v_p.kind;
  v_family   := v_p.family;
  v_slug     := v_p.slug;
  v_price    := v_p.price_vnd;
  v_material := v_p.material;
  v_fit      := v_p.fit;
  v_drop     := v_p.drop_no;

  if p_patch ? 'name' then
    if jsonb_typeof(p_patch -> 'name') is distinct from 'string' then
      raise exception using message = 'BAD_INPUT';
    end if;
    v_name := btrim(p_patch ->> 'name');
    if v_name = '' or length(v_name) > 40 then
      raise exception using message = 'BAD_INPUT';
    end if;
  end if;

  if p_patch ? 'kind' then
    if jsonb_typeof(p_patch -> 'kind') is distinct from 'string' then
      raise exception using message = 'BAD_INPUT';
    end if;
    v_kind := btrim(p_patch ->> 'kind');
    if v_kind = '' or length(v_kind) > 80 then
      raise exception using message = 'BAD_INPUT';
    end if;
  end if;

  if p_patch ? 'slug' then
    if jsonb_typeof(p_patch -> 'slug') is distinct from 'string' then
      raise exception using message = 'BAD_INPUT';
    end if;
    v_slug := btrim(p_patch ->> 'slug');
    if v_slug !~ '^[a-z0-9-]+$' or length(v_slug) > 80 then
      raise exception using message = 'BAD_INPUT';
    end if;
  end if;

  if p_patch ? 'priceVnd' then
    v_price := public.json_count(p_patch -> 'priceVnd');
    if v_price is null or v_price < 1 then
      raise exception using message = 'BAD_INPUT';
    end if;
  end if;

  if p_patch ? 'material' then
    if jsonb_typeof(p_patch -> 'material') is distinct from 'string' then
      raise exception using message = 'BAD_INPUT';
    end if;
    v_material := btrim(p_patch ->> 'material');
    if v_material = '' or length(v_material) > 200 then
      raise exception using message = 'BAD_INPUT';
    end if;
  end if;

  if p_patch ? 'fit' then
    if jsonb_typeof(p_patch -> 'fit') is distinct from 'string'
       or not ((p_patch ->> 'fit') = any (enum_range(null::public.product_fit)::text[])) then
      raise exception using message = 'BAD_INPUT';
    end if;
    v_fit := (p_patch ->> 'fit')::public.product_fit;
  end if;

  if p_patch ? 'dropNo' then
    v_drop := public.json_count(p_patch -> 'dropNo');
    if v_drop is null or not exists (select 1 from public.drops d where d.no = v_drop) then
      raise exception using message = 'BAD_INPUT';
    end if;
  end if;

  -- The family follows the kind, where the rest of the catalogue can say it.
  if v_kind is distinct from v_p.kind then
    select array_agg(distinct p.family) into v_families
      from public.products p
     where p.kind = v_kind
       and p.id <> p_id;
    if cardinality(v_families) = 1 then
      v_family := v_families[1];
    end if;
  end if;

  -- An address segment belongs to one style.
  if v_slug is distinct from v_p.slug
     and exists (select 1 from public.products p where p.slug = v_slug and p.id <> p_id) then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  if v_name is distinct from v_p.name then
    v_before := v_before || jsonb_build_object('name', v_p.name);
    v_after  := v_after || jsonb_build_object('name', v_name);
  end if;
  if v_kind is distinct from v_p.kind then
    v_before := v_before || jsonb_build_object('kind', v_p.kind);
    v_after  := v_after || jsonb_build_object('kind', v_kind);
  end if;
  if v_family is distinct from v_p.family then
    v_before := v_before || jsonb_build_object('family', v_p.family::text);
    v_after  := v_after || jsonb_build_object('family', v_family::text);
  end if;
  if v_slug is distinct from v_p.slug then
    v_before := v_before || jsonb_build_object('slug', v_p.slug);
    v_after  := v_after || jsonb_build_object('slug', v_slug);
  end if;
  if v_price is distinct from v_p.price_vnd then
    v_before := v_before || jsonb_build_object('priceVnd', v_p.price_vnd);
    v_after  := v_after || jsonb_build_object('priceVnd', v_price);
  end if;
  if v_material is distinct from v_p.material then
    v_before := v_before || jsonb_build_object('material', v_p.material);
    v_after  := v_after || jsonb_build_object('material', v_material);
  end if;
  if v_fit is distinct from v_p.fit then
    v_before := v_before || jsonb_build_object('fit', v_p.fit::text);
    v_after  := v_after || jsonb_build_object('fit', v_fit::text);
  end if;
  if v_drop is distinct from v_p.drop_no then
    v_before := v_before || jsonb_build_object('dropNo', v_p.drop_no);
    v_after  := v_after || jsonb_build_object('dropNo', v_drop);
  end if;

  -- Nothing to save is not a save.
  if v_before = '{}'::jsonb then
    raise exception using message = 'BAD_INPUT';
  end if;

  begin
    update public.products
       set name      = v_name,
           kind      = v_kind,
           family    = v_family,
           slug      = v_slug,
           price_vnd = v_price,
           material  = v_material,
           fit       = v_fit,
           drop_no   = v_drop
     where id = p_id;
  exception
    -- Two tabs giving two styles one segment at the same moment: the second
    -- is told it is taken, the same answer the check above gives.
    when unique_violation then
      raise exception using message = 'NOT_ALLOWED';
  end;

  insert into public.events (at, actor_role, actor, kind, product_id, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'PRODUCT_EDITED', p_id,
    jsonb_build_object('before', v_before, 'after', v_after)
  );
end;
$$;

-- ───────────────────────────────────────────────────────────────── grants
-- Every new `admin_*` asks for the role in its body, so `authenticated` may
-- call them all; `anon` may call none.
revoke execute on function public.admin_adjust_stock(text, jsonb, text, text, text, timestamptz) from public, anon;
grant  execute on function public.admin_adjust_stock(text, jsonb, text, text, text, timestamptz) to authenticated;

revoke execute on function public.admin_add_drop(integer, timestamptz, timestamptz, timestamptz) from public, anon;
grant  execute on function public.admin_add_drop(integer, timestamptz, timestamptz, timestamptz) to authenticated;

revoke execute on function public.admin_schedule_drop(integer, timestamptz, timestamptz, timestamptz) from public, anon;
grant  execute on function public.admin_schedule_drop(integer, timestamptz, timestamptz, timestamptz) to authenticated;

revoke execute on function public.admin_add_teaser(text, text, text, text, integer, text, timestamptz) from public, anon;
grant  execute on function public.admin_add_teaser(text, text, text, text, integer, text, timestamptz) to authenticated;

revoke execute on function public.admin_add_promo(jsonb, timestamptz) from public, anon;
grant  execute on function public.admin_add_promo(jsonb, timestamptz) to authenticated;

revoke execute on function public.admin_edit_promo(text, jsonb, timestamptz) from public, anon;
grant  execute on function public.admin_edit_promo(text, jsonb, timestamptz) to authenticated;

revoke execute on function public.admin_pause_promo(text, boolean, timestamptz) from public, anon;
grant  execute on function public.admin_pause_promo(text, boolean, timestamptz) to authenticated;

revoke execute on function public.admin_raise_promo_limit(text, integer, timestamptz) from public, anon;
grant  execute on function public.admin_raise_promo_limit(text, integer, timestamptz) to authenticated;

revoke execute on function public.admin_end_promo(text, timestamptz) from public, anon;
grant  execute on function public.admin_end_promo(text, timestamptz) to authenticated;

revoke execute on function public.admin_update_product(text, jsonb, timestamptz) from public, anon;
grant  execute on function public.admin_update_product(text, jsonb, timestamptz) to authenticated;

-- ───────────────────────────────────────────────────────── reset_demo, v5
-- Replaces version 4 from `20260924001000_admin.sql`. One change: the codes
-- come back with their `paused` flag from the seed (never paused), so a code
-- paused in the back office is running again after a reset. Everything the
-- catalogue writes above — a new issue, a teaser, a code, a moved hour, an
-- edited style, an adjusted shelf — was already undone by the truncate at the
-- top: the live catalogue is rebuilt from the `seed_*` mirrors every time.
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
    starts_at, ends_at, usage_limit, used_count, min_order_vnd, position, paused
  )
  select
    code, kind, percent, max_discount_vnd, amount_vnd,
    starts_at + delta, ends_at + delta, usage_limit, used_count, min_order_vnd, position, paused
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
