-- ─────────────────────────────────────────────────── construction lines
--
-- Slice B6: a style carries how it is made — "Vai rơi, thân rộng", "Cổ bo gân
-- 2,5 cm", where its print sits — one line each, in the order the Feed screens
-- print them (`Product.details` in `data/types.ts`). The lines are the
-- garment briefs Số 05's photos were made from; every other style has an
-- empty list.
--
--   · `products.details` and its mirror `seed_products.details`: `text[]`,
--     not null, `'{}'` by default. Every style already in a table takes the
--     default, and the two writers that name their columns keep working as
--     they are: `admin_add_product` (v2) creates a style with no lines, and
--     `admin_update_product` (v2) never touches them;
--   · `reset_demo` (v6) copies the column from the mirror;
--   · `catalog_snapshot` (v5) writes it for every style.
--
-- Nothing else changes. Row level security filters rows, not columns, so the
-- catalogue's "public to read" policy already covers the new column, and no
-- policy lets the API write it: only the seed and the reset do.
--
-- Sources: https://www.postgresql.org/docs/current/sql-altertable.html ("When
-- a column is added with ADD COLUMN and a non-volatile DEFAULT is specified,
-- the default is evaluated at the time of the statement and the result stored
-- in the table's metadata. That value will be used for the column for all
-- existing rows."),
-- https://www.postgresql.org/docs/current/sql-createtable.html (a `LIKE` copy
-- and its original "are completely decoupled after creation is complete" —
-- hence the column twice),
-- https://supabase.com/docs/guides/database/postgres/row-level-security ("Think
-- of a policy as adding a WHERE clause to every query"),
-- https://www.postgresql.org/docs/current/functions-json.html (`to_jsonb`:
-- "Arrays and composites are converted recursively to arrays and objects"),
-- https://supabase.com/docs/guides/database/functions (`security definer`,
-- `set search_path = ''`, grants),
-- https://www.postgresql.org/docs/current/sql-createfunction.html ("the
-- ownership and permissions of the function do not change" on replace).

-- ─────────────────────────────────────────────────────────────── the rows
alter table public.products
  add column details text[] not null default '{}';

-- The seed mirror the demo resets from, the same way.
alter table public.seed_products
  add column details text[] not null default '{}';

-- ───────────────────────────────────────────────────────── reset_demo, v6
-- Replaces version 5 from `20260924020000_catalog_admin.sql`, which
-- `20260925090000_fixed_styles.sql` left in place. One change: `details` is
-- copied from `seed_products` with the rest of each style. The `insert`
-- names its columns, so without it every reset would give every style the
-- column's default and wipe the lines. The rest is v5, character for
-- character.
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

-- ──────────────────────────────────────────── the catalogue as JSON (v5)
-- Replaces v4 in `20260925090000_fixed_styles.sql`. One change: every style
-- carries `details`, its construction lines as a JSON list in their order —
-- `[]` for none, never null, since the column is not null. Who is shown which
-- style is unchanged.
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
          ), '{}'::jsonb),
          'details', to_jsonb(p.details)
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
