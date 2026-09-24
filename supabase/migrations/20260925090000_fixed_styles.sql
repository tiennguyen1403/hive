-- ──────────────────────────────────────────────────────────── fixed styles
--
-- Slice B5: beside the issues — each cut once, and over when it is over — the
-- shop sells FIXED styles: basics that belong to no issue, are on sale at any
-- hour, and have a size brought back when it runs out. A fixed style is a row
-- of `products` like any other; what makes it fixed is two nulls:
--
--   · `drop_no` null — it belongs to no issue, so no window opens or shuts on
--     it: the catalogue always carries it and checkout never asks the clock;
--   · `cut_units` null — it was never cut once, so nothing caps its shelf and
--     "sold" is not `cut − on hand` for it.
--
-- The two are null together or not at all, and only an issue's style can be
-- stamped sold out: a fixed style whose shelf is empty is "tạm hết", not
-- over. An issue's style keeps every rule it had.
--
-- What this file replaces, each function keeping `security definer` (or
-- `security invoker` where it was), `set search_path = ''` and its grants:
--
--   · `sync_sold_out`        — v1 in `20260924020000_catalog_admin.sql`;
--   · `catalog_snapshot`     — v3 in `20260924040000_photos.sql`;
--   · `place_order`          — v3 in `20260924020000_catalog_admin.sql`;
--   · `admin_adjust_stock`   — v1 in `20260924020000_catalog_admin.sql`;
--   · `admin_add_product`    — v1 in `20260924040000_photos.sql`;
--   · `admin_update_product` — v1 in `20260924020000_catalog_admin.sql`.
--
-- `reset_demo` (v5, `20260924020000_catalog_admin.sql`) is NOT replaced: it
-- rebuilds `products` from `seed_products` with an `insert … select` that
-- copies a null `drop_no` and `cut_units` as they are, and `sold_out_at +
-- delta` stays null. `lib/db/fixed-styles.dbtest.ts` measures it.
--
-- Sources: https://supabase.com/docs/guides/database/functions (security
-- definer, `set search_path = ''`, grants),
-- https://www.postgresql.org/docs/current/ddl-constraints.html ("a check
-- constraint is satisfied if the check expression evaluates to true or the
-- null value" — so `check (cut_units > 0)` already lets a null through, and
-- a null `drop_no` satisfies its foreign key),
-- https://www.postgresql.org/docs/current/sql-createtable.html (a `LIKE` copy
-- is "completely decoupled after creation" — hence every change twice),
-- https://www.postgresql.org/docs/current/sql-createfunction.html ("the
-- ownership and permissions of the function do not change" on replace).

-- ─────────────────────────────────────────────────────────────── the rows
alter table public.products
  alter column drop_no drop not null,
  alter column cut_units drop not null;
alter table public.products
  add constraint products_issue_has_cut check ((drop_no is null) = (cut_units is null)),
  add constraint products_sold_out_in_issue check (drop_no is not null or sold_out_at is null);

-- The seed mirror the demo resets from, the same way.
alter table public.seed_products
  alter column drop_no drop not null,
  alter column cut_units drop not null;
alter table public.seed_products
  add constraint seed_products_issue_has_cut check ((drop_no is null) = (cut_units is null)),
  add constraint seed_products_sold_out_in_issue check (drop_no is not null or sold_out_at is null);

-- ───────────────────────────────────────────── "sold out" (v2, internal)
-- Replaces v1 in `20260924020000_catalog_admin.sql`. One change: only an
-- issue's style is stamped or cleared. A fixed style never runs out for good
-- — its empty shelf is "tạm hết" and a restock brings it back — so its
-- `sold_out_at` stays null whatever its shelf holds (and the table refuses
-- anything else). The rows are still locked in id order first, fixed ones
-- included, so the lock order every writer follows does not change.
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
     and p.drop_no is not null
     and ((t.total = 0 and p.sold_out_at is null)
       or (t.total > 0 and p.sold_out_at is not null));
end;
$$;

revoke execute on function public.sync_sold_out(text[], timestamptz) from public, anon, authenticated;

-- ──────────────────────────────────────────── the catalogue as JSON (v4)
-- Replaces v3 in `20260924040000_photos.sql`. One change: a fixed style is
-- always in it, for everybody — it belongs to no issue, so no opening hour
-- keeps it off the shop — with `dropNo` and `cutUnits` written out as null.
-- A style of an issue that has not opened is still left out for everybody
-- but the manager.
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
      where p.drop_no is null
         or (select public.is_admin())
         or exists (
              select 1 from public.drops d
               where d.no = p.drop_no
                 and d.opens_at <= now()
            )
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

grant execute on function public.catalog_snapshot() to anon, authenticated;

-- ─────────────────────────────────────────────────────── placing one (v4)
-- Replaces v3 in `20260924020000_catalog_admin.sql`. One change: the issue's
-- window is asked only of an issue's style. A line of a fixed style joins no
-- issue (`left join`) and is sold at any `p_now` — its shelf is checked like
-- every other (`OUT_OF_STOCK`). Everything else, every other refusal
-- included, is unchanged.
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
    select sc.on_hand, p.price_vnd, p.sold_out_at, p.drop_no, d.opens_at, d.closes_at
      into v_cell
      from public.stock_cells sc
      join public.products p on p.id = sc.product_id
      left join public.drops d on d.no = p.drop_no
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

    -- Open-inclusive, close-exclusive, like `lib/drop.ts#dropState` — for an
    -- issue's style. A fixed style belongs to no issue and sells at any hour.
    if v_cell.drop_no is not null
       and (p_now < v_cell.opens_at or p_now >= v_cell.closes_at) then
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

  -- The last piece of an issue's style just went: that is the moment it sold
  -- out. A fixed style is never stamped (`sync_sold_out`, v2).
  perform public.sync_sold_out(v_pids, p_now);

  -- The shopper placed it: the account's email when signed in, the one typed
  -- at checkout when not.
  insert into public.events (at, actor_role, actor, kind, order_code)
  values (p_now, 'customer', coalesce(nullif(v_account, ''), v_email), 'ORDER_PLACED', v_code);

  return jsonb_build_object('code', v_code, 'accessKey', v_key);
end;
$$;

revoke execute on function public.place_order(jsonb, timestamptz) from public;
grant  execute on function public.place_order(jsonb, timestamptz) to anon, authenticated;

-- ─────────────────────────────────────────────────────────── the shelf (v2)
-- Replaces v1 in `20260924020000_catalog_admin.sql`. Three changes:
--
--   · a sixth reason, "Nhập thêm" — pieces brought back onto a FIXED style's
--     shelf, the one move an issue's style can never make. It is refused
--     (`BAD_INPUT`) for an issue's style, and unless EVERY cell it sends goes
--     up (`after > before`);
--   · the cut is the ceiling only where there is a cut: a fixed style has
--     none, so its shelf may hold any number, whatever the reason;
--   · (through `sync_sold_out`, v2) a fixed style is never stamped sold out.
--
-- The event is still one `INVENTORY_ADJUSTED` with the reason in its payload.
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
  reasons   constant text[] := array['Hàng trả về', 'Kiểm kê lệch', 'Hư hỏng', 'Khác', 'Sửa mẫu', 'Nhập thêm'];
  -- `lib/inventory-adjust.ts#RESTOCK_REASON`: a fixed style's shelf, upward only.
  restock   constant text := 'Nhập thêm';
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
  v_drop    integer;
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

    -- A restock only ever adds: every cell it names goes up.
    if v_reason = restock and v_after_n < v_before_n then
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

  -- The cut never moves, and neither does whether there is one — a style
  -- cannot cross between an issue and fixed (`admin_update_product`, v2) —
  -- so reading them needs no lock.
  select p.cut_units, p.drop_no into v_cut, v_drop from public.products p where p.id = p_product_id;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  -- An issue's style is never restocked: that is the model.
  if v_reason = restock and v_drop is not null then
    raise exception using message = 'BAD_INPUT';
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

  -- THE CUT IS THE CEILING — where there is a cut. A fixed style has none.
  select coalesce(sum(sc.on_hand), 0)::integer into v_total
    from public.stock_cells sc where sc.product_id = p_product_id;
  if v_cut is not null and v_total > v_cut then
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

revoke execute on function public.admin_adjust_stock(text, jsonb, text, text, text, timestamptz) from public, anon;
grant  execute on function public.admin_adjust_stock(text, jsonb, text, text, text, timestamptz) to authenticated;

-- ─────────────────────────────────────────────────────── a new style (v2)
-- Replaces v1 in `20260924040000_photos.sql`. One change: `dropNo: null` —
-- written out, not left out — is a FIXED style. It joins no issue, so there
-- is no issue to find (`NOT_FOUND`) or to have closed (`DROP_CLOSED`); its
-- grid is the stock it opens with, every colour still at least one piece
-- (`COLOR_EMPTY`), and `cut_units` stays null. Its event carries `dropNo`
-- and `cutUnits` null, as the row does. An issue's style is unchanged:
-- `cut_units` is the sum of its grid.
create or replace function public.admin_add_product(p_input jsonb, p_now timestamptz)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_colors constant integer := 7;
  max_cell   constant integer := 999;
  min_price  constant integer := 1000;
  max_price  constant integer := 99999999;
  v_name     text;
  v_kind     text;
  v_family   text;
  v_fit      text;
  v_slug     text;
  v_material text;
  v_price    integer;
  v_drop     integer;
  v_fixed    boolean;
  v_closes   timestamptz;
  v_families public.product_family[];
  v_colors   jsonb;
  v_cells    jsonb;
  v_grid     jsonb;
  v_item     jsonb;
  v_color    text;
  v_keys     public.color_key[] := '{}';
  v_photos   text[] := '{}';
  v_size     text;
  v_n        integer;
  v_row      integer;
  v_cut      integer := 0;
  v_uploaded integer := 0;
  v_borrowed integer := 0;
  v_id       text;
  i          integer;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_input is null or jsonb_typeof(p_input) is distinct from 'object' then
    raise exception using message = 'BAD_INPUT';
  end if;

  -- ── the style's own fields
  if jsonb_typeof(p_input -> 'name') is distinct from 'string'
     or jsonb_typeof(p_input -> 'kind') is distinct from 'string'
     or jsonb_typeof(p_input -> 'family') is distinct from 'string'
     or jsonb_typeof(p_input -> 'fit') is distinct from 'string'
     or jsonb_typeof(p_input -> 'slug') is distinct from 'string'
     or jsonb_typeof(p_input -> 'material') is distinct from 'string' then
    raise exception using message = 'BAD_INPUT';
  end if;

  v_name     := btrim(p_input ->> 'name');
  v_kind     := btrim(p_input ->> 'kind');
  v_family   := p_input ->> 'family';
  v_fit      := p_input ->> 'fit';
  v_slug     := p_input ->> 'slug';
  v_material := btrim(p_input ->> 'material');
  v_price    := public.json_count(p_input -> 'priceVnd');
  -- A fixed style is `"dropNo": null`, written out; a missing key is a form
  -- that forgot the field, not a choice.
  v_fixed    := coalesce(jsonb_typeof(p_input -> 'dropNo') = 'null', false);
  v_drop     := public.json_count(p_input -> 'dropNo');

  if v_name = '' or length(v_name) > 40
     or v_kind = '' or length(v_kind) > 80
     or not (v_family = any (enum_range(null::public.product_family)::text[]))
     or not (v_fit = any (enum_range(null::public.product_fit)::text[]))
     or v_slug !~ '^[a-z0-9][a-z0-9-]{1,39}$'
     or v_material = '' or length(v_material) > 200
     or v_price is null or v_price < min_price or v_price > max_price
     or (v_drop is null and not v_fixed) then
    raise exception using message = 'BAD_INPUT';
  end if;

  -- The family the catalogue files this kind under (checked apart from the
  -- enum test above: the order conditions are evaluated in is not defined).
  select array_agg(distinct p.family) into v_families
    from public.products p
   where p.kind = v_kind;
  if v_families is null or not (v_family::public.product_family = any (v_families)) then
    raise exception using message = 'BAD_INPUT';
  end if;

  -- ── the colours, in band order
  v_colors := p_input -> 'colors';
  if jsonb_typeof(v_colors) is distinct from 'array' then
    raise exception using message = 'BAD_INPUT';
  end if;
  if jsonb_array_length(v_colors) = 0 then
    raise exception using message = 'NO_COLORS';
  end if;
  if jsonb_array_length(v_colors) > max_colors then
    raise exception using message = 'BAD_INPUT';
  end if;

  for v_item in
    select e.value from jsonb_array_elements(v_colors) with ordinality as e (value, ord) order by e.ord
  loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or jsonb_typeof(v_item -> 'color') is distinct from 'string' then
      raise exception using message = 'BAD_INPUT';
    end if;
    v_color := v_item ->> 'color';
    if not (v_color = any (enum_range(null::public.color_key)::text[])) then
      raise exception using message = 'BAD_INPUT';
    end if;
    if v_color::public.color_key = any (v_keys) then
      raise exception using message = 'BAD_INPUT';
    end if;
    -- A missing photo is read below, after the cut: the form asks for the
    -- numbers first and the photos last, and so does this.
    if (v_item -> 'photoKey') is not null
       and jsonb_typeof(v_item -> 'photoKey') not in ('string', 'null') then
      raise exception using message = 'BAD_INPUT';
    end if;
    v_keys   := v_keys || v_color::public.color_key;
    v_photos := v_photos || btrim(coalesce(v_item ->> 'photoKey', ''));
  end loop;

  -- ── the cut (for a fixed style: the opening stock), colour by colour
  v_cells := p_input -> 'cells';
  if jsonb_typeof(v_cells) is distinct from 'object' then
    raise exception using message = 'BAD_INPUT';
  end if;
  if exists (
    select 1 from jsonb_object_keys(v_cells) k where not (k = any (v_keys::text[]))
  ) then
    raise exception using message = 'BAD_INPUT';
  end if;

  for i in 1 .. cardinality(v_keys) loop
    v_grid := v_cells -> (v_keys[i]::text);
    if v_grid is null or jsonb_typeof(v_grid) = 'null' then
      raise exception using message = 'COLOR_EMPTY', detail = v_keys[i]::text;
    end if;
    if jsonb_typeof(v_grid) is distinct from 'object'
       or exists (
         select 1 from jsonb_object_keys(v_grid) k
          where not (k = any (enum_range(null::public.garment_size)::text[]))
       ) then
      raise exception using message = 'BAD_INPUT';
    end if;

    v_row := 0;
    foreach v_size in array enum_range(null::public.garment_size)::text[] loop
      v_n := public.json_count(v_grid -> v_size);
      if v_n is null or v_n > max_cell then
        raise exception using message = 'BAD_INPUT';
      end if;
      v_row := v_row + v_n;
    end loop;

    if v_row = 0 then
      raise exception using message = 'COLOR_EMPTY', detail = v_keys[i]::text;
    end if;
    v_cut := v_cut + v_row;
  end loop;

  -- ── a photo for every colour
  for i in 1 .. cardinality(v_keys) loop
    if v_photos[i] = '' then
      raise exception using message = 'PHOTO_MISSING', detail = v_keys[i]::text;
    end if;
  end loop;

  -- ── the issue: there, and still taking styles — an issue's style only
  if not v_fixed then
    select d.closes_at into v_closes from public.drops d where d.no = v_drop;
    if not found then
      raise exception using message = 'NOT_FOUND';
    end if;
    if v_closes <= p_now then
      raise exception using message = 'DROP_CLOSED';
    end if;
  end if;

  -- ── every photo is a photo
  for i in 1 .. cardinality(v_keys) loop
    if not public.photo_key_ok(v_photos[i]) then
      raise exception using message = 'PHOTO_UNKNOWN', detail = v_keys[i]::text;
    end if;
    if v_photos[i] ~ '^up/' then
      v_uploaded := v_uploaded + 1;
    else
      v_borrowed := v_borrowed + 1;
    end if;
  end loop;

  -- ── the address segment, and the id it makes, are nobody's yet
  -- The table is locked for the few statements that read the last position
  -- and write the row, so two presses cannot both take one segment or one
  -- position.
  lock table public.products in share row exclusive mode;

  v_id := 'p-' || v_slug;
  if exists (select 1 from public.products p where p.slug = v_slug or p.id = v_id) then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  insert into public.products (
    id, slug, name, kind, family, material, fit,
    price_vnd, cut_units, drop_no, sold_out_at, position
  )
  select
    v_id, v_slug, v_name, v_kind, v_family::public.product_family, v_material,
    v_fit::public.product_fit, v_price,
    case when v_fixed then null else v_cut end,
    case when v_fixed then null else v_drop end,
    null,
    coalesce(max(p.position), -1) + 1
  from public.products p;

  -- Band order is the index, as the seed writes it (`scripts/gen-seed.ts`).
  insert into public.product_colors (product_id, color, position, photo_key)
  select v_id, c.color, c.ord - 1, c.photo
    from unnest(v_keys, v_photos) with ordinality as c (color, photo, ord);

  insert into public.stock_cells (product_id, color, size, on_hand)
  select v_id, k.color, s.size, public.json_count(v_cells -> (k.color::text) -> (s.size::text))
    from unnest(v_keys) as k (color)
   cross join unnest(enum_range(null::public.garment_size)) as s (size);

  insert into public.events (at, actor_role, actor, kind, product_id, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'PRODUCT_ADDED', v_id,
    jsonb_build_object(
      'id', v_id,
      'name', v_name,
      'slug', v_slug,
      'dropNo', case when v_fixed then null else v_drop end,
      'colors', to_jsonb(v_keys::text[]),
      'cutUnits', case when v_fixed then null else v_cut end,
      'uploaded', v_uploaded,
      'borrowed', v_borrowed
    )
  );

  return v_id;
end;
$$;

revoke execute on function public.admin_add_product(jsonb, timestamptz) from public, anon;
grant  execute on function public.admin_add_product(jsonb, timestamptz) to authenticated;

-- ───────────────────────────────────────────────────── editing a style (v2)
-- Replaces v1 in `20260924020000_catalog_admin.sql`. One change: a style
-- keeps its kind for good. An issue's style may still move to another issue
-- (the old rule: the issue exists); a fixed style may not join one, and an
-- issue's style may not become fixed — either crossing is `BAD_INPUT`. A
-- patch naming `dropNo: null` for a fixed style is no change at all.
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
    if jsonb_typeof(p_patch -> 'dropNo') = 'null' then
      -- "No issue": true of a fixed style, never to be made true of an
      -- issue's style.
      if v_p.drop_no is not null then
        raise exception using message = 'BAD_INPUT';
      end if;
    else
      v_drop := public.json_count(p_patch -> 'dropNo');
      -- A fixed style joins no issue; an issue's style moves only to an
      -- issue that exists.
      if v_p.drop_no is null
         or v_drop is null
         or not exists (select 1 from public.drops d where d.no = v_drop) then
        raise exception using message = 'BAD_INPUT';
      end if;
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

revoke execute on function public.admin_update_product(text, jsonb, timestamptz) from public, anon;
grant  execute on function public.admin_update_product(text, jsonb, timestamptz) to authenticated;
