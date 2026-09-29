-- ──────────────── each step's moment, and "Hoàn tác" puts an address back
--
-- Slice B10. Round v4's account pages are the Feed mock's, and two things they
-- draw could not be drawn from what the database handed out until now.
--
--   · THE ORDER'S STEPS. The mock prints a time under every step of the
--     journey already passed — placed, paid, handed over, delivered
--     (`prototype/explore/feed/account.js`, `stepModel`). `order_json()` only
--     told the moment of the state an order is IN (`status.paidAt`,
--     `status.shippedAt`, …), so an order on its way had lost when it was
--     paid. The row kept all three all along — `paid_at`, `shipped_at`,
--     `delivered_at`: each move sets its own and none clears another's — so
--     `order_json()` v3 hands them out under a new key, `moments`, each only
--     when the row holds it, and `status` stays exactly the shape it was.
--     Nothing new is stored. The sample orders were written with their
--     current state's moment only (`data/orders.ts`), so a sample delivered
--     order knows its delivery and nothing earlier; no moment is made up for
--     them. COD has no moment for "Xác nhận": the order is RECEIVED as it is
--     placed, and the shop's call is not recorded.
--
--   · "HOÀN TÁC" AFTER "XOÁ" IN THE ADDRESS BOOK. The mock puts the book back
--     exactly as it was (`addresses.js`: `saveAddresses(before)`): the
--     address in its old place, with the default role if it had it. Until now
--     the app added it back as a new address at the end of the book. So
--     `remove_address()` v2 keeps the address it removes aside, in
--     `removed_addresses` — one row per account, the last removal, every
--     column of it — and `restore_address(id)` puts that very row back: its
--     id, its place, its fields, its role. The browser names WHICH address and
--     nothing else; everything that decides where it lands is read from the
--     row the database kept, so a request cannot choose an id, a place or a
--     field its owner could not have typed.
--
-- WHO MAY TOUCH THE KEPT ROW. Nobody through the API: row level security on,
-- no policy at all, every privilege revoked from `anon` and `authenticated`.
-- The two functions are `security definer` and take the owner from
-- `auth.uid()`, never from an argument, and `restore_address` is not `anon`'s
-- to call. `remove_address` was `security invoker` — row level security did
-- the filtering — and becomes a definer because it now writes a table no API
-- role may write; it filters on `auth.uid()` itself, as it always did.
--
-- ONE AT A TIME PER BOOK. Both lock the owner's `profiles` row first
-- (`for no key update`), so a removal and its undo from two tabs run one after
-- the other instead of taking their row locks in opposite orders; the reset
-- writes that row before the book too, so it queues the same way. The lock
-- does not hold up the key-share locks other inserts take on the row.
--
-- THE PLACE. `position` is not compacted when an address goes, so the old
-- place is usually still free. Only an address added since can have taken it
-- (`add_address` appends after the last one left); that one, and any after
-- it, move one down — the last first, because `unique (profile_id, position)`
-- is checked row by row — and the restored address goes back in front of
-- them, where it was.
--
-- THE RESET (v8). `reset_demo` rebuilds a demo account's book from the seed,
-- so what that account removed last is not the reset's to give back: its kept
-- row goes. The rest is v7 character for character. An account somebody made
-- themselves keeps its book, and with it its last removal.
--
-- Sources: https://supabase.com/docs/guides/database/functions (`security
-- definer`, "set search_path = ''", revoking execute from public and anon),
-- https://supabase.com/docs/guides/database/postgres/row-level-security (with
-- row level security on, "no data is accessible through the API when using a
-- publishable key, until you create policies"),
-- https://www.postgresql.org/docs/current/functions-json.html
-- (`jsonb_strip_nulls`: "Deletes all object fields that have null values"),
-- https://www.postgresql.org/docs/current/sql-createtable.html ("When a UNIQUE
-- or PRIMARY KEY constraint is not deferrable, PostgreSQL checks for
-- uniqueness immediately whenever a row is inserted or modified") and
-- https://www.postgresql.org/docs/current/explicit-locking.html (`FOR NO KEY
-- UPDATE` "will not block SELECT FOR KEY SHARE").

-- ───────────────────────────────────────────── one order, as JSON (v3)
-- Replaces v2 in `20260924001000_admin.sql`. The one change is the last key,
-- `moments`: `{ "paidAt", "shippedAt", "deliveredAt" }`, each written like
-- every other instant (`+07:00` on the wall clock) and left out when the row
-- holds none — `{}` for an order that has passed no such step. All four
-- readers (`my_orders`, `track_order`, `receipt_order`, `admin_orders`) call
-- this one, so all four carry it. Same signature: owner and grants stay.
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
    'delivery', o.delivery::text,
    'moments', jsonb_strip_nulls(jsonb_build_object(
      'paidAt', to_char(o.paid_at at time zone 'Asia/Ho_Chi_Minh',
                        'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'),
      'shippedAt', to_char(o.shipped_at at time zone 'Asia/Ho_Chi_Minh',
                           'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'),
      'deliveredAt', to_char(o.delivered_at at time zone 'Asia/Ho_Chi_Minh',
                             'YYYY-MM-DD"T"HH24:MI:SS"+07:00"')
    ))
  )
  from public.orders o
  where o.code = p_code;
$$;

revoke execute on function public.order_json(text) from public, anon;
grant  execute on function public.order_json(text) to authenticated;

-- ─────────────────────────────────────── the address a removal kept aside
-- The account's last removal, whole: its own id and place, every field the
-- book shows, and whether it was the default. One row per account (the key),
-- replaced by the next removal and taken back by the undo. Gone with the
-- account (`on delete cascade`), and a demo account's with the reset.
create table public.removed_addresses (
  profile_id    uuid        primary key references public.profiles (id) on delete cascade,
  address_id    uuid        not null,
  recipient     text        not null check (length(trim(recipient)) > 0),
  phone         text        not null check (phone ~ '^0[0-9]{9}$'),
  line          text        not null check (length(trim(line)) > 0),
  province_code text        not null,
  ward_code     text        not null,
  label         text        not null check (label in ('Nhà', 'Công ty', 'Khác')),
  was_default   boolean     not null,
  position      integer     not null check (position >= 0),
  removed_at    timestamptz not null default now()
);

-- On, and no policy at all: nobody reads or writes it through the API. The
-- functions below run as their owner. A new table in `public` comes with
-- every privilege granted to the API roles, so they go too.
alter table public.removed_addresses enable row level security;
revoke all on public.removed_addresses from anon, authenticated;

-- ──────────────────────────────────────────────── remove_address, v2
-- Replaces the version in `20260923124500_accounts.sql`, which it keeps whole
-- — delete the caller's own address, and when it was the default the earliest
-- left takes the role — and adds the last step: what went is kept aside for
-- "Hoàn tác". Same signature and answer (false for nobody, or for an id that
-- is not the caller's); `security definer` now, for the write above.
create or replace function public.remove_address(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := (select auth.uid());
  gone public.addresses;
  heir uuid;
begin
  if uid is null or p_id is null then
    return false;
  end if;

  -- One removal or undo per book at a time (see the top of this file).
  perform 1 from public.profiles p where p.id = uid for no key update;

  delete from public.addresses a
   where a.id = p_id
     and a.profile_id = uid
  returning * into gone;
  if not found then
    return false;
  end if;

  if gone.is_default then
    select a.id into heir
      from public.addresses a
     where a.profile_id = uid
     order by a.position
     limit 1;
    if heir is not null then
      update public.addresses a set is_default = true where a.id = heir;
    end if;
  end if;

  insert into public.removed_addresses (
    profile_id, address_id, recipient, phone, line,
    province_code, ward_code, label, was_default, position, removed_at
  )
  values (
    uid, gone.id, gone.recipient, gone.phone, gone.line,
    gone.province_code, gone.ward_code, gone.label, gone.is_default, gone.position, now()
  )
  on conflict (profile_id) do update
    set address_id    = excluded.address_id,
        recipient     = excluded.recipient,
        phone         = excluded.phone,
        line          = excluded.line,
        province_code = excluded.province_code,
        ward_code     = excluded.ward_code,
        label         = excluded.label,
        was_default   = excluded.was_default,
        position      = excluded.position,
        removed_at    = excluded.removed_at;

  return true;
end;
$$;

-- ─────────────────────────────────────────────── restore_address
-- "Hoàn tác": the caller's last removal, if it is `p_id`, back in the book as
-- it was — same id, same place, same fields; the default again if it was
-- (whichever address holds the role now lets go of it), or if the book it
-- comes back to is empty, which is `add_address`'s rule for a book of one.
--
-- Answers the id it put back; the id as well when the address is in the book
-- already (undone twice); NULL when there is nothing of this caller's to put
-- back — another account's address, a removal replaced by a later one, a
-- reset in between, nobody signed in.
create or replace function public.restore_address(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid := (select auth.uid());
  gone   public.removed_addresses;
  new_id uuid;
  empty  boolean;
  r      record;
begin
  if uid is null or p_id is null then
    return null;
  end if;

  -- One removal or undo per book at a time (see the top of this file).
  perform 1 from public.profiles p where p.id = uid for no key update;

  if exists (select 1 from public.addresses a where a.id = p_id and a.profile_id = uid) then
    return p_id;
  end if;

  -- Taken back, so it can be put back once.
  delete from public.removed_addresses k
   where k.profile_id = uid
     and k.address_id = p_id
  returning * into gone;
  if not found then
    return null;
  end if;

  -- Its own id, unless another row somehow holds it now: never somebody
  -- else's row, and a new id before no address at all.
  new_id := case
    when exists (select 1 from public.addresses a where a.id = gone.address_id) then gen_random_uuid()
    else gone.address_id
  end;

  -- Its place: free unless an address added since took it; that one and any
  -- after it move one down, the last first.
  if exists (
    select 1 from public.addresses a
     where a.profile_id = uid and a.position = gone.position
  ) then
    for r in
      select a.id from public.addresses a
       where a.profile_id = uid and a.position >= gone.position
       order by a.position desc
    loop
      update public.addresses a set position = a.position + 1 where a.id = r.id;
    end loop;
  end if;

  select count(*) = 0 into empty from public.addresses a where a.profile_id = uid;

  -- Clear, then set: two rows claiming the flag at once would trip
  -- `addresses_one_default`.
  if gone.was_default or empty then
    update public.addresses a set is_default = false where a.profile_id = uid and a.is_default;
  end if;

  insert into public.addresses (
    id, profile_id, recipient, phone, line,
    province_code, ward_code, label, is_default, position
  )
  values (
    new_id, uid, gone.recipient, gone.phone, gone.line,
    gone.province_code, gone.ward_code, gone.label, gone.was_default or empty, gone.position
  );

  return new_id;
end;
$$;

-- Supabase's default privileges hand EXECUTE on a new function in `public` to
-- `anon` and `authenticated`; each states who may call it instead.
revoke execute on function public.remove_address(uuid)  from public, anon;
revoke execute on function public.restore_address(uuid) from public, anon;
grant  execute on function public.remove_address(uuid)  to authenticated;
grant  execute on function public.restore_address(uuid) to authenticated;

-- ───────────────────────────────────────────────────────── reset_demo, v8
-- Replaces v7 in `20260929120000_account_state.sql`. One addition: in each
-- demo account's turn, after its book is back to the seed, the address it
-- removed last is forgotten — the book it came out of is gone, and giving it
-- back would put a second copy of a seed address beside the first. The rest
-- is v7 character for character.
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
  fav record;
  uid uuid;
  last_pos integer;
  kept_favorites public.favorites[];
  kept_reminders public.reminders[];
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' and not by_admin then
    raise exception using message = 'NOT_ADMIN';
  end if;

  -- What every account saved, before the catalogue it points at is emptied.
  -- Writes wait from here to the end of the reset (reads do not): a save that
  -- landed between the copy and the TRUNCATE below would otherwise be lost.
  lock table public.favorites, public.reminders in exclusive mode;
  select coalesce(array_agg(f), '{}') into kept_favorites from public.favorites f;
  select coalesce(array_agg(r), '{}') into kept_reminders from public.reminders r;

  -- One statement, so the foreign keys between these ten do not object.
  truncate table
    public.favorites,
    public.reminders,
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
    price_vnd, cut_units, drop_no, sold_out_at, position, details
  )
  select
    id, slug, name, kind, family, material, fit,
    price_vnd, cut_units, drop_no, sold_out_at + delta, position, details
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

  -- Back, as they were — row, colour, moment, place and stamp — wherever
  -- what they point at came back too.
  insert into public.favorites (profile_id, product_id, color, saved_at, seq, removed_at)
  select k.profile_id, k.product_id, k.color, k.saved_at, k.seq, k.removed_at
    from unnest(kept_favorites) as k
   where exists (
           select 1 from public.product_colors pc
            where pc.product_id = k.product_id
              and pc.color = k.color
         );

  insert into public.reminders (profile_id, drop_no)
  select k.profile_id, k.drop_no
    from unnest(kept_reminders) as k
   where exists (select 1 from public.drops d where d.no = k.drop_no);

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

    -- What it removed last came out of the book just rebuilt: nothing to give back.
    delete from public.removed_addresses where profile_id = uid;

    -- What it keeps, back to the seed. The fixture lists the newest first, so
    -- the rows are drawn last one first: one at a time, each draw after the
    -- one before, and the fixture's first style ends up with the highest
    -- `seq`. No moment — the fixture has none.
    delete from public.favorites where profile_id = uid;
    for fav in
      select sf.product_id, sf.color
        from public.seed_favorites sf
       where sf.handle = c.handle
       order by sf.position desc
    loop
      insert into public.favorites (profile_id, product_id, color, saved_at)
      values (uid, fav.product_id, fav.color, null);
    end loop;

    delete from public.reminders where profile_id = uid;
    insert into public.reminders (profile_id, drop_no)
    select uid, sr.drop_no
      from public.seed_reminders sr
     where sr.handle = c.handle
     order by sr.drop_no;

    -- No seed row: no row, which reads as the defaults.
    delete from public.account_settings where profile_id = uid;
    insert into public.account_settings (
      profile_id, size_top, size_bottom,
      notify_order, notify_drop, notify_wishlist, notify_promo
    )
    select
      uid, sa.size_top, sa.size_bottom,
      sa.notify_order, sa.notify_drop, sa.notify_wishlist, sa.notify_promo
    from public.seed_account_settings sa
    where sa.handle = c.handle;
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
