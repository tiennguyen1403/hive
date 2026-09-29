-- ─────────────────────────────────────────── the e-mail is optional at checkout
--
-- Slice B8. Round v4's checkout is the Feed mock's (`prototype/explore/feed/
-- checkout.js`), and there the e-mail field is marked "tuỳ chọn". No e-mail
-- is sent by this app yet (QĐ-35), and the user settled it on 27/09: an order
-- may be placed without one. The same day took away the terms box the Feed
-- does not have; nothing here ever read `agreed`, so that half of the slice
-- is the Server Action's alone (`lib/order-payload.ts`).
--
-- Two changes:
--
--   · `orders.email` takes NULL: an order placed without an e-mail has none,
--     rather than an empty string that every reader would have to know is
--     "none". The rows already here keep theirs — NO ROW IS REWRITTEN.
--
--   · `place_order` (v6): an e-mail left empty (the key absent, null, "" or
--     blank) is stored as NULL; one that is typed must still have the light
--     shape it always needed (`lib/checkout-form.ts#looksLikeEmail`), and is
--     refused as BAD_INPUT otherwise. Everything else is v5
--     (`20260927120000_card_pays_by_transfer.sql`) character for character.
--
-- WHO PLACED IT, when a guest gave no e-mail. `events.actor` is the e-mail of
-- whoever acted and '' for an actor the log cannot name
-- (`20260924001000_admin.sql`: `actor text not null default ''`, "empty for
-- the system"; every other writer records a caller it cannot name as
-- `coalesce(auth.jwt() ->> 'email', '')`). A guest with no e-mail is such an
-- actor, so the event keeps `actor_role = 'customer'` and writes `actor = ''`.
-- The log screen names its author by the role ("Khách",
-- `lib/activity-log.ts`), never by `actor`, so the row reads like any other
-- shopper's. Not the phone number: that would copy a second piece of personal
-- data into an append-only table and give the column a meaning it has
-- nowhere else. Not NULL: the column is `not null`, and loosening the log's
-- contract for one case is a change this slice does not need. A signed-in
-- shopper who leaves the field empty is still named by the account's e-mail.
--
-- `seed_orders` keeps `email not null`. It is the mirror of `data/orders.ts`,
-- and every sample order there has an e-mail; like `orders.carrier`
-- (`20260924001000_admin.sql`), what the fixture never holds, the mirror
-- need not take.
--
-- Unchanged, because none of them tests the e-mail: `order_json` writes the
-- column as it is (JSON null when there is none, read by
-- `lib/db/order-dto.ts`), and so `my_orders`, `receipt_order`, `track_order`
-- and `admin_orders` hand the null on; `reset_demo` copies the sample's
-- e-mails from `seed_orders`; `track_order` matches the code and the phone.
--
-- Sources: https://www.postgresql.org/docs/current/sql-altertable.html
-- (`ALTER COLUMN … DROP NOT NULL`), https://supabase.com/docs/guides/database/functions
-- (`security definer`, `set search_path = ''`, grants),
-- https://www.postgresql.org/docs/current/sql-createfunction.html ("the
-- ownership and permissions of the function do not change" on replace),
-- https://www.postgresql.org/docs/current/functions-string.html (`btrim`) and
-- https://www.postgresql.org/docs/current/functions-conditional.html (`nullif`,
-- `coalesce`: "returns the first of its arguments that is not null").

-- ─────────────────────────────────────────────────── the column takes none
alter table public.orders alter column email drop not null;

-- ─────────────────────────────────────────────────────── placing one (v6)
-- Replaces v5 in `20260927120000_card_pays_by_transfer.sql`. One change: the
-- e-mail — none is null, one that is typed must look like one, and a guest
-- with none is logged by role alone. Every check, every lock, every price and
-- every other refusal is v5's.
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
  -- Optional since slice B8: none typed — the key absent, null, "" or blank —
  -- is none, and none is NULL.
  v_email     := nullif(btrim(coalesce(p_input ->> 'email', '')), '');
  v_province  := coalesce(p_input ->> 'provinceCode', '');
  v_ward      := coalesce(p_input ->> 'wardCode', '');
  v_line      := btrim(coalesce(p_input ->> 'line', ''));
  v_note      := btrim(coalesce(p_input ->> 'note', ''));

  -- The same two patterns as slice B1's columns and `lib/checkout-form.ts`:
  -- ten digits starting with 0, and the light email shape (`looksLikeEmail`)
  -- for an e-mail that was typed. Whether the ward belongs to the province is
  -- not something this database knows — `data/regions.ts` is not in it — so
  -- the Server Action's `findWard` is the check for that.
  if v_recipient = '' or v_line = '' or v_province = '' or v_ward = ''
     or v_phone !~ '^0[0-9]{9}$'
     or (v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')
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
    -- A transfer waits for its money, holding the pieces for twelve hours,
    -- and so does a card order: no card gateway is connected, so it pays
    -- by transfer (slice B7, `lib/orders.ts#paysByTransfer`). A COD order
    -- is taken as it is and paid at the door.
    case when v_payment in ('BANK_TRANSFER', 'CARD') then 'AWAITING_TRANSFER' else 'RECEIVED' end::public.order_state,
    case when v_payment in ('BANK_TRANSFER', 'CARD') then p_now + hold end
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
  -- at checkout when not — and '' for a guest who typed none (slice B8: the
  -- log's word for an actor it cannot name; the header of this file says why).
  insert into public.events (at, actor_role, actor, kind, order_code)
  values (p_now, 'customer', coalesce(nullif(v_account, ''), v_email, ''), 'ORDER_PLACED', v_code);

  return jsonb_build_object('code', v_code, 'accessKey', v_key);
end;
$$;

revoke execute on function public.place_order(jsonb, timestamptz) from public;
grant  execute on function public.place_order(jsonb, timestamptz) to anon, authenticated;
