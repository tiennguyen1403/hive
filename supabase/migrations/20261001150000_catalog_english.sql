-- ──────────────────────────────────────── the catalogue's words, in English
--
-- Slice B15 of round v6 (QĐ-40): the app speaks Vietnamese and English, the
-- shop and the back office alike. Slice E0 laid the frame — text written in
-- code is translated where it stands, as a `{ vi, en }` pair
-- (`lib/i18n.ts`). The free text the DATABASE holds cannot be translated in
-- code: a style's `name`, `kind`, `material` and construction lines
-- (`details`), and a teaser's `name` and `kind`. Slices E1 to E3 print those
-- in English, so the English has to be in the rows first. (Colours, address
-- labels and order states are fixed labels, translated in code; an order line
-- keeps only its `product_id`, so its words follow the style.)
--
--   · `products` and its mirror `seed_products` gain `name_en`, `kind_en`,
--     `material_en` (text) and `details_en` (text[]); `teasers` and
--     `seed_teasers` gain `name_en` and `kind_en`. Every one may be null, and
--     null means "print the Vietnamese": the issues' styles keep their
--     Vietnamese names (KHÓI, BỤI, SÓNG…), and so do the two teasers, so their
--     `name_en` is null; the eight fixed styles carry an English name. A
--     value, when there is one, is never blank, and a list of lines holds at
--     least one line and no blank one — checked on the live tables and on the
--     mirrors alike, so a bad seed stops at `db reset`, not at the next reset.
--   · `reset_demo` (v11) copies the new columns back from the mirrors.
--   · `catalog_snapshot` (v7) writes `en` on every style and every teaser: an
--     object with one key per English column, its value or null.
--   · `admin_update_product` (v3) forgets the English of exactly the fields an
--     edit changes — see there.
--   · `admin_add_product` (v2) and `admin_add_teaser` (v3) name the columns
--     they write, so a style or a teaser the back office creates has every
--     new column null, and both languages print what was typed. The form has
--     no English field (decided 01/10), and neither function is replaced.
--
-- Nothing else changes: no existing signature or grant, no event payload, no
-- other check. Row level security filters rows, not columns, so "catalog is public"
-- already covers the new columns, and no policy lets the API write them.
--
-- Sources: https://www.postgresql.org/docs/current/sql-altertable.html (a
-- column added without a default is null in every existing row),
-- https://www.postgresql.org/docs/current/sql-createtable.html ("CHECK
-- expressions cannot contain subqueries nor refer to variables other than
-- columns of the current row"; a `LIKE` copy and its original "are completely
-- decoupled after creation is complete" — hence every column twice),
-- https://www.postgresql.org/docs/current/ddl-constraints.html ("a check
-- constraint is satisfied if the check expression evaluates to true or the
-- null value"; "PostgreSQL assumes that CHECK constraints' conditions are
-- immutable"),
-- https://www.postgresql.org/docs/current/functions-comparison.html (`IS
-- DISTINCT FROM`: "if both inputs are null it returns false, and if only one
-- input is null it returns true"),
-- https://www.postgresql.org/docs/current/functions-array.html (`cardinality`
-- "or 0 if the array is empty"),
-- https://supabase.com/docs/guides/database/functions (`security definer`
-- with `set search_path = ''`; `revoke execute on function … from public`),
-- https://supabase.com/docs/guides/database/postgres/row-level-security
-- ("Think of a policy as adding a WHERE clause to every query"),
-- https://www.postgresql.org/docs/current/sql-createfunction.html (on replace,
-- "the ownership and permissions of the function do not change").

-- ──────────────────────────────────────────────────── a list of lines
-- True for a one-dimensional list of at least one line with no line null or
-- blank (`btrim`, as every other text check in this schema); null for null,
-- which a check reads as satisfied. A function because a check may not hold a
-- subquery, and immutable because a check is assumed to be: change what it
-- answers only by dropping the two `details_en` checks below, replacing it
-- and adding them again, so the rows are checked anew (ddl-constraints.html).
create or replace function public.text_lines_ok(p_lines text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select array_ndims(p_lines) = 1
     and cardinality(p_lines) > 0
     and not exists (
           select 1 from unnest(p_lines) as l (line)
            where l.line is null or btrim(l.line) = ''
         );
$$;

-- A check helper, not an endpoint: the API roles may not call it (the
-- service role and the functions' owner still can, which is who writes rows).
revoke execute on function public.text_lines_ok(text[]) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────── the rows
alter table public.products
  add column name_en     text   null,
  add column kind_en     text   null,
  add column material_en text   null,
  add column details_en  text[] null,
  add constraint products_name_en_not_blank     check (name_en is null or btrim(name_en) <> ''),
  add constraint products_kind_en_not_blank     check (kind_en is null or btrim(kind_en) <> ''),
  add constraint products_material_en_not_blank check (material_en is null or btrim(material_en) <> ''),
  add constraint products_details_en_lines      check (details_en is null or public.text_lines_ok(details_en));

-- The seed mirror the demo resets from, the same way.
alter table public.seed_products
  add column name_en     text   null,
  add column kind_en     text   null,
  add column material_en text   null,
  add column details_en  text[] null,
  add constraint seed_products_name_en_not_blank     check (name_en is null or btrim(name_en) <> ''),
  add constraint seed_products_kind_en_not_blank     check (kind_en is null or btrim(kind_en) <> ''),
  add constraint seed_products_material_en_not_blank check (material_en is null or btrim(material_en) <> ''),
  add constraint seed_products_details_en_lines      check (details_en is null or public.text_lines_ok(details_en));

alter table public.teasers
  add column name_en text null,
  add column kind_en text null,
  add constraint teasers_name_en_not_blank check (name_en is null or btrim(name_en) <> ''),
  add constraint teasers_kind_en_not_blank check (kind_en is null or btrim(kind_en) <> '');

alter table public.seed_teasers
  add column name_en text null,
  add column kind_en text null,
  add constraint seed_teasers_name_en_not_blank check (name_en is null or btrim(name_en) <> ''),
  add constraint seed_teasers_kind_en_not_blank check (kind_en is null or btrim(kind_en) <> '');

-- ─────────────────────────────────────────────────────── reset_demo, v11
-- Replaces v10 in `20260930170000_last_sold_announced.sql`. One change: each
-- style's English (`name_en`, `kind_en`, `material_en`, `details_en`) and
-- each teaser's (`name_en`, `kind_en`) are copied from the mirrors with the
-- rest of the row. The inserts name their columns, so without this a reset
-- would leave them null and the English shop would quietly print Vietnamese.
-- The rest is v10 character for character.
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
    price_vnd, cut_units, drop_no, sold_out_at, position, details,
    name_en, kind_en, material_en, details_en
  )
  select
    id, slug, name, kind, family, material, fit,
    price_vnd, cut_units, drop_no, sold_out_at + delta, position, details,
    name_en, kind_en, material_en, details_en
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

  insert into public.teasers (slug, name, kind, family, drop_no, photo_key, position, announced_at, name_en, kind_en)
  select slug, name, kind, family, drop_no, photo_key, position, announced_at + delta, name_en, kind_en
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

-- ──────────────────────────────────────────── the catalogue as JSON (v7)
-- Replaces v6 in `20260930170000_last_sold_announced.sql`. One addition, and
-- who is shown which style is unchanged: every style and every teaser carries
-- `en`, its English — an object with one key per English column (`name`,
-- `kind`, `material`, `details` for a style; `name`, `kind` for a
-- teaser), each the English or null, which the app reads as "print the
-- Vietnamese" (`lib/db/catalog-snapshot.ts`). Null is written out rather than
-- left out, like `soldOutAt` and `announcedAt`. The rest is v6 character for
-- character.
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
          'en', jsonb_build_object(
            'name', p.name_en,
            'kind', p.kind_en,
            'material', p.material_en,
            'details', to_jsonb(p.details_en)
          ),
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
                                 'YYYY-MM-DD"T"HH24:MI:SS"+07:00"'),
          'en', jsonb_build_object(
            'name', t.name_en,
            'kind', t.kind_en
          )
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

-- ──────────────────────────────────────────────── editing a style (v3)
-- Replaces v2 in `20260925090000_fixed_styles.sql`. One change: an edit that
-- changes `name`, `kind` or `material` to a different value sets that
-- field's English (`name_en`, `kind_en`, `material_en`) to null, so the
-- English shop falls back to the words just typed rather than keeping a
-- translation of words that are gone. Each field is compared on its own with
-- `is distinct from` — the comparison the event below already makes — never
-- row against row: a field the edit leaves alone keeps its English.
--
-- Why: a visitor trying the back office renames ÁO THUN TRƠN "PLAIN TEE V2".
-- With this rule the English shop says PLAIN TEE V2, as typed; without it, it
-- would still say PLAIN TEE, and the demo would look broken in front of
-- exactly the person meant to see it work.
--
-- `details_en` is never touched: the patch has no key for `details`, so no
-- edit changes them and their English stays theirs. The rest is v2 character
-- for character — the checks, the event and its payload (the Vietnamese
-- fields only, as before) — save the `update`, realigned, and its comment.
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
    -- A field's English goes when the field itself changes, and only then.
    update public.products
       set name        = v_name,
           name_en     = case when v_name is distinct from v_p.name then null else name_en end,
           kind        = v_kind,
           kind_en     = case when v_kind is distinct from v_p.kind then null else kind_en end,
           family      = v_family,
           slug        = v_slug,
           price_vnd   = v_price,
           material    = v_material,
           material_en = case when v_material is distinct from v_p.material then null else material_en end,
           fit         = v_fit,
           drop_no     = v_drop
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
