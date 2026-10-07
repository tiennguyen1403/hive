-- ─────────────────────────────────────────── card payments on Stripe
--
-- Slice B18 (QĐ-42, QĐ-46): a card order pays on Stripe's hosted Checkout
-- page, in TEST MODE ONLY — a sandbox, test keys, never real money. Until this
-- file a card order paid by bank transfer (slice B7,
-- `20260927120000_card_pays_by_transfer.sql`).
--
-- THE STATE MACHINE DOES NOT CHANGE. A card order is still placed
-- AWAITING_TRANSFER with the twelve-hour hold (`place_order()`, untouched) and
-- still becomes PAID; what changes is WHO says it was paid. Not the shop: the
-- server asks Stripe, when the shopper comes back from the payment page and
-- again whenever one order's own page is drawn (no webhook, QĐ-46), and
-- records what Stripe answered through `card_mark_paid()` below.
--
-- What this file adds or replaces:
--
--   · two columns on `orders`: the Checkout Session the order last opened,
--     and the payment intent once Stripe says it is paid. Only a card order
--     carries either. No API role may write them — every write to `orders`
--     was revoked from `anon` and `authenticated` in B2, and stays so — and the
--     back office reads them through `admin_orders()` (v2). `order_json()` does
--     NOT carry them: it is the shape the public lookup hands to anybody with
--     a code and a phone number, and a shopper's screen needs neither id;
--   · `card_session()`, `card_checkout_opened()`, `card_mark_paid()`: the three
--     moves the server makes with the service role, which only `service_role`
--     may call;
--   · `expire_and_lock()` v4: a card order whose hold ran out is cancelled as
--     "quá hạn thanh toán", a transfer as before;
--   · `admin_mark_paid()` v2: refuses a card order — card money is confirmed
--     by Stripe, never by hand (the main session, brief B18). The back office
--     draws no "Đã nhận tiền" for one (`lib/admin-orders.ts#nextMove`), and
--     the guard says the same thing to a request that skips the screen;
--   · `admin_orders()` v2: each card order says whether it opened a Stripe
--     page and, once paid there, its payment intent.
--
-- `seed_orders` gets neither column, as with `carrier` in
-- `20260924001000_admin.sql`: the fixture has no Stripe session to mirror, and
-- `reset_demo()` names the columns it copies.
--
-- Sources: https://supabase.com/docs/guides/database/functions ("When you use
-- `security definer`, you must set the `search_path`", and revoking EXECUTE
-- from `public` and `anon`), https://docs.stripe.com/api/checkout/sessions/create
-- (the response's `"id": "cs_test_…"` and `payment_intent`; a test session the
-- sandbox made on 07/10/2026 had the same `cs_test_` shape).

-- ──────────────────────────────────────────────────────────────── columns
-- A session id as Stripe's test mode writes it, `cs_test_` and letters and
-- digits; a live session id (`cs_live_…`) is refused on purpose — this demo
-- runs on test keys only (QĐ-42), and `lib/stripe.ts` refuses any other key
-- before a request is made. A payment intent is `pi_…` in either mode.
alter table public.orders
  add column stripe_session_id text null
    check (
      stripe_session_id is null
      or (stripe_session_id ~ '^cs_test_[A-Za-z0-9]+$' and length(stripe_session_id) <= 255)
    ),
  add column stripe_payment_intent text null
    check (
      stripe_payment_intent is null
      or (stripe_payment_intent ~ '^pi_[A-Za-z0-9]+$' and length(stripe_payment_intent) <= 255)
    ),
  add constraint orders_stripe_only_card
    check (payment = 'CARD' or (stripe_session_id is null and stripe_payment_intent is null));

-- ─────────────────────────────────────── the clock's housekeeping (v4)
-- Replaces v3 in `20260924020000_catalog_admin.sql`: same locks in the same
-- order, same events, same "sold out" un-stamping. One change: the reason. A
-- card order's hold ran out without a card payment, so it is "quá hạn thanh
-- toán"; a transfer's is "quá hạn chuyển khoản", as before. `effectiveStatus()`
-- (`lib/customer-orders.ts`) reads an unswept hold with the same two words.
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
         cancel_reason = case o.payment
                           when 'CARD' then 'quá hạn thanh toán'
                           else 'quá hạn chuyển khoản'
                         end
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

-- ────────────────────────────────────────────── confirming money (v2)
-- Replaces the version in `20260924001000_admin.sql`. One change: a card
-- order is refused, whatever its state. Its money is Stripe's to confirm
-- (`card_mark_paid()`), and a manager marking it paid by hand would be the
-- screen inventing a card payment.
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

  select o.state, o.due_at, o.payment into v_order
    from public.orders o where o.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  if v_order.payment = 'CARD' then
    raise exception using message = 'NOT_ALLOWED';
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

-- (grants unchanged: `authenticated`, which `is_admin()` then narrows)

-- ───────────────────────────────────── every order, for the admin (v2)
-- Replaces the version in `20260924001000_admin.sql`. One addition beside
-- `order` and `owner`: `card`, for a card order only (null otherwise) —
-- `checkout`, whether the order ever opened a Stripe page, and
-- `paymentIntent`, Stripe's reference once it was paid there. The order page
-- and the CSV print "Thẻ · Stripe" and the reference from these; a card order
-- of the sample, paid before any gateway existed, has neither, and the screens
-- keep calling it plain "Thẻ" (DESIGN.md §9 rule 1). The session id itself
-- stays in the database: no screen prints it.
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
        ) end,
        'card', case when o.payment = 'CARD' then jsonb_build_object(
          'checkout', o.stripe_session_id is not null,
          'paymentIntent', o.stripe_payment_intent
        ) end
      )
      order by o.placed_at desc, o.code desc
    )
    from public.orders o
    left join public.profiles p on p.id = o.profile_id
  ), '[]'::jsonb);
end;
$$;

-- (grants unchanged: `authenticated`, refused inside unless an admin)

-- ──────────────────────────────────────────── the server's three moves
-- Each is called by the app's server with the service role
-- (`lib/db/card-payments.ts`), after the page or the action has decided the
-- visitor may see the order (the account's own, the guest's receipt cookie,
-- the lookup's code and phone, the back office). None trusts its caller with
-- more than an id: the state, the hold and the money are read here.

-- The session the order last opened, or null — for a card order only. Read
-- before a new session is made (the old one is expired if still open) and
-- when an order's page asks Stripe again.
create or replace function public.card_session(p_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select o.stripe_session_id
    from public.orders o
   where o.code = p_code
     and o.payment = 'CARD';
$$;

-- A Stripe page was opened for the order: keep its session id. Only a card
-- order still inside its hold — the page would sell nothing otherwise.
create or replace function public.card_checkout_opened(p_code text, p_session_id text, p_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
begin
  perform public.assert_now(p_now);
  if p_session_id is null
     or p_session_id !~ '^cs_test_[A-Za-z0-9]+$'
     or length(p_session_id) > 255 then
    raise exception using message = 'BAD_INPUT';
  end if;

  select o.payment, o.state, o.due_at into v_order
    from public.orders o where o.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  if v_order.payment <> 'CARD'
     or v_order.state <> 'AWAITING_TRANSFER'
     or v_order.due_at <= p_now then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  update public.orders set stripe_session_id = p_session_id where code = p_code;
end;
$$;

-- Stripe says a session of this order is paid (the server has already checked
-- the session's own order code, amount, currency and `payment_status`):
-- record it. Answers what it found:
--
--   · 'PAID'          the order was waiting, inside its hold: now PAID, with
--                     the session and the payment intent, and an
--                     `ORDER_PAID` event by the system — as when the manager
--                     confirms a transfer, with `via: 'STRIPE'` so the log and
--                     the notes say Stripe and not a matched transfer;
--   · 'ALREADY_PAID'  paid, on its way or delivered already: nothing to do,
--                     however often the same return URL is opened (idempotent);
--   · 'CANCELLED'     called off before the money came — by the shopper, the
--                     shop, or the hold running out (released first, below, as
--                     at the top of every `place_order()`). Never revived: its
--                     pieces may be sold already. One system note per payment
--                     intent tells the shop to refund it by hand on Stripe
--                     (no refund is automatic, QĐ-46).
--
-- The amount is checked again here against the order's own lines and fees, so
-- a caller that got the arithmetic wrong cannot mark the order paid. A card
-- order left RECEIVED from before slice B7 never opened a Stripe page:
-- `NOT_ALLOWED`, as for any order that is not a card order.
create or replace function public.card_mark_paid(
  p_code           text,
  p_session_id     text,
  p_payment_intent text,
  p_amount_vnd     integer,
  p_now            timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_total integer;
begin
  perform public.assert_now(p_now);
  if p_session_id is null
     or p_session_id !~ '^cs_test_[A-Za-z0-9]+$'
     or length(p_session_id) > 255
     or p_payment_intent is null
     or p_payment_intent !~ '^pi_[A-Za-z0-9]+$'
     or length(p_payment_intent) > 255
     or p_amount_vnd is null then
    raise exception using message = 'BAD_INPUT';
  end if;

  -- A hold that has run out goes back on the shelf first, exactly as the
  -- sweep would do it, so an order paid after its deadline is read as what it
  -- is: cancelled, "quá hạn thanh toán".
  perform public.expire_and_lock(p_now, '{}', '{}', '{}');

  select o.payment, o.state into v_order
    from public.orders o where o.code = p_code for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;
  if v_order.payment <> 'CARD' then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  select (coalesce(sum(l.unit_price_vnd::bigint * l.qty), 0)
          + o.shipping_fee_vnd + o.cod_fee_vnd - o.discount_vnd)::integer
    into v_total
    from public.orders o
    left join public.order_lines l on l.order_code = o.code
   where o.code = p_code
   group by o.code, o.shipping_fee_vnd, o.cod_fee_vnd, o.discount_vnd;
  if v_total <> p_amount_vnd then
    raise exception using message = 'BAD_INPUT';
  end if;

  if v_order.state in ('PAID', 'SHIPPING', 'DELIVERED') then
    return 'ALREADY_PAID';
  end if;

  if v_order.state = 'CANCELLED' then
    if not exists (
      select 1 from public.events e
       where e.order_code = p_code
         and e.kind = 'ORDER_NOTE'
         and e.payload ->> 'paymentIntent' = p_payment_intent
    ) then
      insert into public.events (at, actor_role, actor, kind, order_code, payload)
      values (
        p_now, 'system', '', 'ORDER_NOTE', p_code,
        jsonb_build_object(
          'text', 'Stripe nhận tiền sau khi đơn đã huỷ · ' || p_payment_intent || ' · hoàn tiền tay trên Stripe',
          'via', 'STRIPE',
          'paymentIntent', p_payment_intent
        )
      );
    end if;
    return 'CANCELLED';
  end if;

  if v_order.state <> 'AWAITING_TRANSFER' then
    raise exception using message = 'NOT_ALLOWED';
  end if;

  update public.orders
     set state                 = 'PAID',
         paid_at               = p_now,
         stripe_session_id     = p_session_id,
         stripe_payment_intent = p_payment_intent
   where code = p_code;

  insert into public.events (at, actor_role, actor, kind, order_code, payload)
  values (
    p_now, 'system', '', 'ORDER_PAID', p_code,
    jsonb_build_object('from', 'AWAITING_TRANSFER', 'via', 'STRIPE', 'paymentIntent', p_payment_intent)
  );
  return 'PAID';
end;
$$;

-- ──────────────────────────────────────────────────────────────── grants
-- Supabase hands EXECUTE on every new function in `public` to `anon` and
-- `authenticated`; these three are the server's alone.
revoke execute on function public.card_session(text) from public, anon, authenticated;
grant  execute on function public.card_session(text) to service_role;

revoke execute on function public.card_checkout_opened(text, text, timestamptz) from public, anon, authenticated;
grant  execute on function public.card_checkout_opened(text, text, timestamptz) to service_role;

revoke execute on function public.card_mark_paid(text, text, text, integer, timestamptz) from public, anon, authenticated;
grant  execute on function public.card_mark_paid(text, text, text, integer, timestamptz) to service_role;
