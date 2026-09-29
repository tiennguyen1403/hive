-- ───────────────────────────── deleted addresses are not kept; sample steps
--
-- Slice B10, after its review (30/09). Two decisions on what
-- `20260930090000_step_moments_address_undo.sql` left open, and one note.
--
--   · DELETED ADDRESSES ARE NOT KEPT. "Hoàn tác" is a toast that lasts
--     seconds (`components/feed/FeedToast.tsx`: five), so `restore_address`
--     v2 puts back only a removal made in the last ten minutes. An older one
--     is not put back, only forgotten — the kept row is taken away either way.
--     And `reset_demo` v9 empties `removed_addresses` for EVERY account, not
--     only the demo ones as v8 did, so nothing a shopper deleted outlives the
--     day: v8's note that "an account somebody made themselves keeps ... its
--     last removal" no longer holds.
--
--   · THE SAMPLE ORDERS' STEPS. The first B10 migration says the sample
--     orders hold their current state's moment only. No longer: the fixture
--     now gives each one the steps it passed (`data/orders.ts`,
--     `passedMoments`, one rule taken from the Feed mock's own orders), the
--     generated seed writes them into `seed_orders.paid_at` and `shipped_at`,
--     and `reset_demo` copies both columns as it always has. Nothing in SQL
--     changes for that.
--
-- Same signatures, so owners and grants stay; restated below all the same.
--
-- Sources: https://www.postgresql.org/docs/current/functions-datetime.html
-- (`now()` is the transaction's start; interval arithmetic) and
-- https://www.postgresql.org/docs/current/sql-truncate.html ("TRUNCATE quickly
-- removes all rows from a set of tables").

-- ─────────────────────────────────────────────── restore_address, v2
-- Replaces v1 in `20260930090000_step_moments_address_undo.sql`. The one
-- change is the window: the kept row is taken back as before, and a row kept
-- longer than ten minutes answers NULL instead of coming back.
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

  -- Past the undo's ten minutes: forgotten just now, not put back.
  if gone.removed_at < now() - interval '10 minutes' then
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

revoke execute on function public.restore_address(uuid) from public, anon;
grant  execute on function public.restore_address(uuid) to authenticated;

-- ───────────────────────────────────────────────────────── reset_demo, v9
-- Replaces v8 in `20260930090000_step_moments_address_undo.sql`. One change:
-- instead of forgetting each demo account's last removal inside its turn, the
-- reset empties `removed_addresses` for everybody, once, before the demo
-- accounts are rebuilt. TRUNCATE takes the table's strongest lock, so a
-- removal still being written finishes first and its row goes with the rest.
-- The rest is v8 character for character.
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

  -- What anybody removed from their address book is forgotten, every
  -- account's: nothing a shopper deleted outlives the day.
  truncate table public.removed_addresses;

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
