-- ─────────── when each colour last sold, and when a teaser was announced
--
-- Slice B12. Round v4's "Thông báo" inbox is the Feed mock's
-- (`prototype/explore/feed/notifications.js`, over `NOTIFICATIONS` in
-- `prototype/explore/shared/data.js`), and every line of it carries a real
-- moment. The app builds that inbox from its own data, where orders, issues,
-- codes and reminders have their moments already (`moments` since slice B10,
-- `opensAt`, `closesAt`, `endsAt`). Two kinds of line had none:
--
--   · "BỤI đen còn 1 chiếc" — a saved style running low — is dated by the
--     last time that colour sold. `catalog_last_sold()` answers, for each
--     colour of every style the caller may see, when the most recent order
--     still in force that took a piece of it was placed: not a cancelled
--     order, and not a transfer past its hold, which every screen already
--     reads as cancelled (`effectiveStatus`, `lib/customer-orders.ts`). A
--     colour nobody has bought has no moment. The catalogue carries it as
--     `lastSoldAt`, beside `stock` and `soldOutAt`: one instant per colour,
--     null when there is none, and nothing else about any order — no code, no
--     quantity, no buyer. Nothing is stored: it is read off the orders every
--     time, as `sold` is read off the shelf.
--
--   · "Số 06 công bố: SỎI và NGÓI" is dated by when the teasers were
--     announced: `teasers.announced_at`, and its mirror in `seed_teasers`.
--     A teaser the back office adds is announced the moment it is added
--     (`admin_add_teaser` v3: its `p_now`, the app's clock, which its log line
--     already records). The sample teasers carry the fixture's value, authored
--     by the mock's own offset — announced fourteen days and eight hours
--     before the issue opens (`data/catalog.ts`) — and `reset_demo` (v10)
--     moves it with every other instant. The catalogue carries it as
--     `announcedAt`, null when unknown. No fixture value changes.
--
-- WHO SEES WHAT. `catalog_snapshot()` stays `security invoker`: the catalogue
-- is read with the reader's own rights, as before. The orders it now dates
-- colours by are not the reader's to read — `anon` has no grant on them, and a
-- shopper reads only their own — so the dating is a `security definer`
-- function of its own. It answers (style, colour, instant) and nothing more,
-- and only for the styles `catalog_snapshot()` itself shows the caller: a
-- fixed style, one whose issue has opened, or any for the manager. `anon` and
-- `authenticated` may call it, because the snapshot runs as them; called on
-- its own, it answers nothing the catalogue does not print.
--
-- Sources: https://supabase.com/docs/guides/database/functions (with `security
-- definer` "you *must* set the `search_path`"; `revoke execute on function …
-- from public`), https://supabase.com/docs/guides/database/postgres/row-level-security
-- ("Once RLS is enabled, no data is accessible through the API when using a
-- publishable key, until you create policies"),
-- https://www.postgresql.org/docs/17/queries-with.html ("specifying
-- `MATERIALIZED` to force separate calculation of the `WITH` query"),
-- https://www.postgresql.org/docs/17/functions-aggregate.html
-- (`jsonb_object_agg`: "Values can be null, but keys cannot"),
-- https://www.postgresql.org/docs/17/sql-createfunction.html (on replace, "the
-- ownership and permissions of the function do not change").

-- ─────────────────────────────────────────────────────────────── the rows
-- Null for a teaser nobody recorded a moment for: a row from before this
-- migration, until the seed is loaded again and the demo reset.
alter table public.teasers
  add column announced_at timestamptz null;

-- The seed mirror the demo resets from, the same way (a `like … including all`
-- copy is decoupled from its original once created).
alter table public.seed_teasers
  add column announced_at timestamptz null;

-- ────────────────────────────────────────── when each colour last sold
-- One row per (style, colour) that has sold, for the styles the caller may
-- see. `now()` decides whether a transfer's hold has run out, as it decides
-- in `catalog_snapshot()` whether an issue has opened: the database's clock
-- is the real one since slice B3a, and the app's `effectiveStatus` reads the
-- same deadline the same way (a hold is over from its `due_at` on).
create or replace function public.catalog_last_sold()
returns table (product_id text, color public.color_key, sold_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.product_id, l.color, max(o.placed_at)
    from public.order_lines l
    join public.orders o on o.code = l.order_code
    join public.products p on p.id = l.product_id
   where o.state <> 'CANCELLED'
     and not (o.state = 'AWAITING_TRANSFER' and o.due_at <= now())
     and (p.drop_no is null
          or (select public.is_admin())
          or exists (
               select 1 from public.drops d
                where d.no = p.drop_no
                  and d.opens_at <= now()
             ))
   group by l.product_id, l.color;
$$;

-- Supabase's default privileges hand EXECUTE on a new function in `public` to
-- the API roles; this one states who may call it. The two client roles, since
-- `catalog_snapshot()` runs as them and calls it.
revoke execute on function public.catalog_last_sold() from public;
grant  execute on function public.catalog_last_sold() to anon, authenticated;

-- ───────────────────────────────────────────────── the teasers (v3)
-- Replaces v2 in `20260924040000_photos.sql`. One change: the teaser is
-- written with `announced_at`, the `p_now` the log line below is stamped with.
-- The rest is v2 character for character.
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

  if not public.photo_key_ok(v_photo) then
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

  insert into public.teasers (slug, name, kind, family, drop_no, photo_key, position, announced_at)
  select v_slug, v_name, v_garment, v_family::public.product_family, p_drop_no, v_photo,
         coalesce(max(t.position), -1) + 1, p_now
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

revoke execute on function public.admin_add_teaser(text, text, text, text, integer, text, timestamptz) from public, anon;
grant  execute on function public.admin_add_teaser(text, text, text, text, integer, text, timestamptz) to authenticated;

-- ─────────────────────────────────────────────────────── reset_demo, v10
-- Replaces v9 in `20260930110000_address_undo_window.sql`. One change: each
-- sample teaser's `announced_at` is copied from the seed, moved by the same
-- delta as every other instant, so the announcement keeps its fourteen days
-- and eight hours before the opening whatever day the demo is anchored on. A
-- seed row with none stays null. The rest is v9 character for character.
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

  insert into public.teasers (slug, name, kind, family, drop_no, photo_key, position, announced_at)
  select slug, name, kind, family, drop_no, photo_key, position, announced_at + delta
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

-- ──────────────────────────────────────────── the catalogue as JSON (v6)
-- Replaces v5 in `20260927100000_product_details.sql`. Two additions, and who
-- is shown which style is unchanged:
--
--   · every style carries `lastSoldAt`: an object with one key per colour it
--     comes in, whose value is when that colour last sold, or null — read off
--     `catalog_last_sold()` once per call (`sold`, materialised), never
--     stored;
--   · every teaser carries `announcedAt`, or null.
--
-- Every instant is written like every other one in this document: the
-- Vietnamese wall clock with `+07:00` spelled out.
create or replace function public.catalog_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with sold as materialized (
    select s.product_id, s.color, s.sold_at from public.catalog_last_sold() s
  )
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
          ), '{}'::jsonb),
          'details', to_jsonb(p.details),
          'lastSoldAt', coalesce((
            select jsonb_object_agg(
                     pc.color::text,
                     to_char(s.sold_at at time zone 'Asia/Ho_Chi_Minh',
                             'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'))
              from public.product_colors pc
              left join sold s on s.product_id = pc.product_id and s.color = pc.color
             where pc.product_id = p.id
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
          'photoKey', t.photo_key,
          'announcedAt', to_char(t.announced_at at time zone 'Asia/Ho_Chi_Minh',
                                 'YYYY-MM-DD"T"HH24:MI:SS"+07:00"')
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
