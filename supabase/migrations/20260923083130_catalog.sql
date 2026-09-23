-- ─────────────────────────────────────────────────────────── catalog schema
--
-- A direct translation of `data/types.ts`, which is the wire format the whole
-- storefront is written against. Column names are snake_case, ids keep the
-- fixture values (`p-khoi`), money is an integer count of đồng, and every
-- instant is `timestamptz`. Nothing derivable is stored: `sold`, `remaining`
-- and a drop's state are still computed in `lib/`.
--
-- The catalogue exists twice. The six LIVE tables are what the app reads and
-- what later slices will write to; the six `seed_*` tables are the pristine
-- copy the demo resets from. `reset_demo()` rebuilds the live side out of the
-- seed side, optionally shifting every instant so the sample data can follow a
-- real clock (QĐ-24 keeps the fixture anchor for now).
--
-- RLS is on from this first migration, on all twelve tables. The live six are
-- readable by anyone because a catalogue is a public thing; nothing here is
-- writable through the API, and the seed six are not reachable at all.

-- ──────────────────────────────────────────────────────────────────── enums
-- Postgres enums rather than check constraints: these five are closed sets in
-- `data/types.ts` too, and a new value should cost a migration.
create type public.product_family as enum ('TEE', 'HOODIE', 'JACKET', 'VEST', 'SHIRT', 'PANTS');
create type public.product_fit    as enum ('OVERSIZE', 'REGULAR');
create type public.color_key      as enum ('black', 'cream', 'grey', 'moss', 'brown', 'white', 'navy');
create type public.garment_size   as enum ('S', 'M', 'L', 'XL');
create type public.promo_kind     as enum ('PERCENT', 'AMOUNT', 'FREE_SHIPPING');

-- ────────────────────────────────────────────────────────────── live tables
-- A selling window. The state is NOT stored — `lib/drop.ts` derives it from
-- these two instants, so a drop cannot sit in the wrong state because someone
-- forgot to flip a flag.
create table public.drops (
  no        integer primary key check (no > 0),
  opens_at  timestamptz not null,
  closes_at timestamptz not null,
  check (closes_at > opens_at)
);

-- `position` is the catalogue order, which is also the "Mới nhất" sort key
-- (`lib/catalog-query.ts` reads the order it is handed and nothing else).
create table public.products (
  id          text primary key check (id ~ '^p-[a-z0-9-]+$'),
  slug        text not null unique,
  name        text not null,
  kind        text not null,
  family      public.product_family not null,
  material    text not null,
  fit         public.product_fit not null,
  price_vnd   integer not null check (price_vnd > 0),
  cut_units   integer not null check (cut_units > 0),
  drop_no     integer not null references public.drops (no),
  sold_out_at timestamptz null,
  position    integer not null unique
);

-- Which colours a style comes in, in band order, and which borrowed photo
-- stands in for each one until real photography exists (PRODUCT.md).
create table public.product_colors (
  product_id text not null references public.products (id) on delete cascade,
  color      public.color_key not null,
  position   integer not null,
  photo_key  text not null,
  primary key (product_id, color),
  unique (product_id, position)
);

-- On-hand units, colour-major. A shopper can switch colour inside the size
-- sheet, so "hết XL" is not true enough — "hết XL màu đen" is.
create table public.stock_cells (
  product_id text not null,
  color      public.color_key not null,
  size       public.garment_size not null,
  on_hand    integer not null check (on_hand >= 0),
  primary key (product_id, color, size),
  foreign key (product_id, color)
    references public.product_colors (product_id, color) on delete cascade
);

-- A style announced for a drop that has not opened. No price and no stock:
-- "Giá và số lượng công bố đúng lúc mở" is what the screen promises.
create table public.teasers (
  slug      text primary key,
  name      text not null,
  kind      text not null,
  family    public.product_family not null,
  drop_no   integer not null references public.drops (no),
  photo_key text not null,
  position  integer not null unique
);

-- The three discount shapes of `data/types.ts` in one table, with a check
-- constraint standing in for the discriminated union: a PERCENT row cannot
-- carry an amount, an AMOUNT row cannot carry a cap.
create table public.promotions (
  code             text primary key check (code = upper(code) and code !~ '\s'),
  kind             public.promo_kind not null,
  percent          integer null check (percent between 1 and 100),
  max_discount_vnd integer null check (max_discount_vnd > 0),
  amount_vnd       integer null check (amount_vnd > 0),
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  usage_limit      integer null check (usage_limit > 0),
  used_count       integer not null default 0 check (used_count >= 0),
  min_order_vnd    integer null check (min_order_vnd > 0),
  position         integer not null unique,
  check (ends_at > starts_at),
  check ((kind = 'PERCENT' and percent is not null and amount_vnd is null)
      or (kind = 'AMOUNT' and amount_vnd is not null and percent is null
          and max_discount_vnd is null)
      or (kind = 'FREE_SHIPPING' and percent is null and amount_vnd is null
          and max_discount_vnd is null))
);

-- ────────────────────────────────────────────────────────────── seed tables
-- One mirror per live table: same columns, same checks, no foreign keys.
-- `like ... including all` copies defaults, not-null, checks and the unique
-- indexes; it never copies foreign keys, which is exactly what is wanted here
-- — the seed side is a flat archive, not a graph to maintain.
create table public.seed_drops          (like public.drops including all);
create table public.seed_products       (like public.products including all);
create table public.seed_product_colors (like public.product_colors including all);
create table public.seed_stock_cells    (like public.stock_cells including all);
create table public.seed_teasers        (like public.teasers including all);
create table public.seed_promotions     (like public.promotions including all);

-- ────────────────────────────────────────────────────────────────────── RLS
-- Every table in `public` is reachable through PostgREST, so every table gets
-- row level security — including the seed mirrors, which get no policy at all
-- and are additionally stripped of the default grants.
alter table public.drops               enable row level security;
alter table public.products            enable row level security;
alter table public.product_colors      enable row level security;
alter table public.stock_cells         enable row level security;
alter table public.teasers             enable row level security;
alter table public.promotions          enable row level security;
alter table public.seed_drops          enable row level security;
alter table public.seed_products       enable row level security;
alter table public.seed_product_colors enable row level security;
alter table public.seed_stock_cells    enable row level security;
alter table public.seed_teasers        enable row level security;
alter table public.seed_promotions     enable row level security;

-- Read-only, and public: the catalogue is what the shop puts in a window.
-- There is deliberately no insert/update/delete policy anywhere in this file;
-- writes arrive in a later slice through SQL functions and the admin role.
create policy "catalog is public" on public.drops
  for select to anon, authenticated using (true);
create policy "catalog is public" on public.products
  for select to anon, authenticated using (true);
create policy "catalog is public" on public.product_colors
  for select to anon, authenticated using (true);
create policy "catalog is public" on public.stock_cells
  for select to anon, authenticated using (true);
create policy "catalog is public" on public.teasers
  for select to anon, authenticated using (true);
create policy "catalog is public" on public.promotions
  for select to anon, authenticated using (true);

-- Adding a policy does not remove a grant, and Supabase grants the API roles
-- everything on new tables in `public` by default. The seed mirrors are
-- internal, so the grant goes.
revoke all on public.seed_drops          from anon, authenticated;
revoke all on public.seed_products       from anon, authenticated;
revoke all on public.seed_product_colors from anon, authenticated;
revoke all on public.seed_stock_cells    from anon, authenticated;
revoke all on public.seed_teasers        from anon, authenticated;
revoke all on public.seed_promotions     from anon, authenticated;

-- ──────────────────────────────────────────────────────────────── functions
-- Rebuilds the live catalog tables from the seed tables, shifting every
-- instant by (p_anchor - fixture anchor). The default keeps the fixture dates,
-- which is what the demo clock in `lib/clock.ts` expects (QĐ-24); passing an
-- anchor is how the sample data will follow a real clock once that clock is
-- back.
--
-- `security definer` because this truncates tables nobody may write to, and
-- `set search_path = ''` because a definer function that trusts the caller's
-- search_path is a privilege escalation waiting to happen — hence the
-- `public.` prefix on every relation below.
create or replace function public.reset_demo(p_anchor timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fixture_anchor constant timestamptz := '2026-09-20 18:50:00+07'::timestamptz;
  delta constant interval := coalesce(p_anchor, fixture_anchor) - fixture_anchor;
begin
  -- One statement, so the foreign keys between these six do not object.
  truncate table
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
end;
$$;

-- Destructive, so nobody reaches it through the API. Later slices call it from
-- an admin action and a daily cron, both of which hold the service role.
revoke execute on function public.reset_demo(timestamptz) from public, anon, authenticated;
grant  execute on function public.reset_demo(timestamptz) to service_role;

-- The whole catalogue in one round trip, already shaped like `data/types.ts`:
-- camelCase keys, colours and photos as parallel arrays in band order, stock
-- as a colour-major object. Twenty-one products over five tables is four joins
-- the client would otherwise pay for on every render.
--
-- Every instant leaves as an ISO string that CARRIES `+07:00`. `lib/datetime.ts`
-- reads the offset out of the text rather than going through `Date`, on purpose
-- — so a timestamp rendered in the session's zone would move every clock on the
-- storefront. `at time zone 'Asia/Ho_Chi_Minh'` pins it regardless of the
-- connection.
--
-- `security invoker`, so the read is subject to the same policies as any other:
-- the function is a convenience, not a back door.
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
          'minOrderVnd', m.min_order_vnd
        ) order by m.position
      )
      from public.promotions m
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.catalog_snapshot() to anon, authenticated;
