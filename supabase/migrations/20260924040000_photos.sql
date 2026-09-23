-- ───────────────────────────────────────────────────── product photos
--
-- Slice B3c: a style can be CREATED from the back office, and a style's
-- photos can be real. Until this file the catalogue had exactly the
-- twenty-one styles the seed wrote, each colour standing in with a borrowed
-- Unsplash frame (PRODUCT.md: no product photography exists), and the form
-- at `/admin/products/new` said "đang chuẩn bị".
--
--   · a BUCKET, `product-photos`: public to read, written only with the
--     service role. A photo the manager uploads is an object named
--     `up/<32 hex>.webp` (or `.jpg`); the app serves it from its own origin
--     (`/photos/<key>`), so the browser still never talks to Supabase. A
--     borrowed photo keeps its short key (`khoi`, `reu`, …), and
--     `product_colors.photo_key` holds either kind;
--   · ONE RULE for "is this a photo", `photo_key_ok()`, shared by the new
--     style, the photo swap and the teasers;
--   · three moves, each a function with a guard and one event, the shape of
--     every `admin_*` since slice B3a: `admin_add_product` (a new style, its
--     colours in band order, one photo per colour, the cut per colour and
--     size), `admin_set_product_photo` (one colour's photo, returning the
--     key it replaced so the app can tidy the bucket) and
--     `admin_reorder_colors` (the band order — never adding or removing a
--     colour: colours are fixed when the cloth is cut, QĐ-27);
--   · the shop does not show a style of an issue that has not opened:
--     `catalog_snapshot()` leaves it out for everybody but the manager, so its
--     page is a 404 and checkout never sees it until the hour it opens;
--   · a new issue may not overlap another one (`admin_add_drop`, v2).
--
-- Deleting objects is NOT done here: the bucket refuses a direct DELETE on
-- `storage.objects` ("Use the Storage API instead", `storage.protect_delete`),
-- so the app removes a replaced upload, and "Đặt lại dữ liệu mẫu" empties
-- `up/`, through the Storage API with the service role.
--
-- Sources: https://supabase.com/docs/guides/storage/buckets/fundamentals
-- ("When a bucket is designated as 'Public,' it effectively bypasses access
-- controls for both retrieving and serving files … Access control is still
-- enforced for other types of operations including uploading, deleting"),
-- https://supabase.com/docs/guides/storage/buckets/creating-buckets (the
-- bucket as a row of `storage.buckets`),
-- https://supabase.com/docs/guides/storage/security/access-control ("Service
-- keys entirely bypass RLS policies"),
-- https://supabase.com/docs/guides/database/functions (security definer,
-- `set search_path = ''`, revoking execute from public and anon),
-- https://www.postgresql.org/docs/current/sql-createfunction.html ("the
-- ownership and permissions of the function do not change" on replace).

-- ─────────────────────────────────────────────────────────────── the bucket
-- 1 572 864 bytes is 1,5 MB, what the Server Action accepts; the two types
-- are what the browser's encoder produces (WebP, JPEG where WebP is missing).
-- No policy on `storage.objects` for `anon` or `authenticated`: row level
-- security is on there with no policy at all, so the Storage API refuses
-- every upload, overwrite, delete and listing but the service role's. Reading
-- is the bucket's `public` flag, which serves an object by its exact name and
-- lists nothing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 1572864, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────── the role
-- `catalog_snapshot()` below asks `is_admin()` as whoever reads the
-- catalogue — a visitor with no session included — and a `security invoker`
-- function needs EXECUTE on what it calls. Harmless to hand out: it reads the
-- caller's own token and nothing else, so a visitor learns "false".
grant execute on function public.is_admin() to anon;

-- ─────────────────────────────────────────────────────── the log's new kinds
-- Three more, all about one style, so all three name it in `product_id`.
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
  'PRODUCT_ADDED',
  'PRODUCT_PHOTO_SET',
  'PRODUCT_COLORS_REORDERED',
  'DROP_ADDED',
  'DROP_SCHEDULED',
  'TEASER_ADDED',
  'PROMO_ADDED',
  'PROMO_EDITED',
  'PROMO_PAUSED',
  'PROMO_LIMIT_RAISED',
  'PROMO_ENDED'
));
alter table public.events drop constraint events_product_check;
alter table public.events add constraint events_product_check
  check ((kind in (
    'INVENTORY_ADJUSTED',
    'PRODUCT_EDITED',
    'PRODUCT_ADDED',
    'PRODUCT_PHOTO_SET',
    'PRODUCT_COLORS_REORDERED'
  )) = (product_id is not null));

-- ───────────────────────────────────────────────────── is this a photo?
-- One of two things, and nothing else:
--
--   · a BORROWED key the catalogue already knows — on a style or a teaser,
--     live or in the seed the demo resets from. The seed counts so that a
--     borrowed frame the shop stopped using on every live row can still be
--     picked again (the library is the eighteen frames `lib/photos.ts` maps);
--   · an UPLOADED key, `up/` + 32 hex + `.webp` or `.jpg` — the shape the
--     Server Action names its objects with — that is an object in the bucket
--     right now. A key of that shape is never taken on trust: an upload that
--     was purged by a reset, or never happened, is not a photo.
--
-- INTERNAL: every API grant is revoked; only the definer functions below,
-- which run as their owner, call it. The owner may read `storage.objects`
-- (row level security there has no policy, and the owner bypasses it).
create or replace function public.photo_key_ok(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_key is null or p_key = '' then false
    when p_key ~ '^up/[0-9a-f]{32}\.(webp|jpg)$' then exists (
      select 1
        from storage.objects o
       where o.bucket_id = 'product-photos'
         and o.name = p_key
    )
    else exists (select 1 from public.product_colors pc where pc.photo_key = p_key)
      or exists (select 1 from public.teasers t where t.photo_key = p_key)
      or exists (select 1 from public.seed_product_colors s where s.photo_key = p_key)
      or exists (select 1 from public.seed_teasers s where s.photo_key = p_key)
  end;
$$;

revoke execute on function public.photo_key_ok(text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────── the teasers (v2)
-- Replaces the version in `20260924020000_catalog_admin.sql`. The only
-- change: the photo is checked by `photo_key_ok()`. For a borrowed key that
-- is the old rule (a key a style or a teaser already uses) plus the seed's
-- own keys; a photo that is not one is still `BAD_INPUT`, as before.
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

-- (grants unchanged: authenticated only, the body asks for the role)

-- ─────────────────────────────────────────────────────────── the issues (v2)
-- Replaces the version in `20260924020000_catalog_admin.sql`. One change: a
-- new issue may not share a single instant with another one. The shop runs
-- one issue at a time — the calendar in the footer, "the one selling now",
-- is written on that promise (`lib/drop.ts#dropCalendar`: "drops never
-- overlap") — and a Số 07 proposed a week out could open before Số 06 did.
-- Two windows overlap when each opens before the other closes (open-
-- inclusive, close-exclusive, like `dropState`), so an issue opening the very
-- instant the previous one closes is fine. The refusal is `NOT_ALLOWED`,
-- naming the issue in the way in its DETAIL, so the screen can say which.
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
  v_next  integer;
  v_clash integer;
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

  select d.no into v_clash
    from public.drops d
   where d.opens_at < p_closes_at
     and d.closes_at > p_opens_at
   order by d.no
   limit 1;
  if found then
    raise exception using message = 'NOT_ALLOWED', detail = v_clash::text;
  end if;

  insert into public.drops (no, opens_at, closes_at) values (p_no, p_opens_at, p_closes_at);

  insert into public.events (at, actor_role, actor, kind, drop_no, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'DROP_ADDED', p_no,
    jsonb_build_object('opensAt', public.vn_iso(p_opens_at), 'closesAt', public.vn_iso(p_closes_at))
  );
end;
$$;

-- (grants unchanged: authenticated only, the body asks for the role)

-- ─────────────────────────────────────────────────────────── a new style
-- "Tạo mẫu": everything the style is, in one document, written in one go.
--
--   `p_input` = { name, kind, family, fit, slug, priceVnd, material, dropNo,
--                 colors: [{ color, photoKey }],            -- band order
--                 cells:  { <color>: { S, M, L, XL } } }    -- pieces to cut
--
--   · the style's own fields, as `admin_update_product` bounds them, with the
--     price between 1.000 ₫ and 99.999.999 ₫ and the address segment 2–40
--     characters of a–z, 0–9 and dashes, starting with a letter or a digit;
--   · the family is the one the catalogue already files that kind under —
--     a kind no style wears yet is a new kind, which is not this function's
--     business (`BAD_INPUT`);
--   · one to seven colours, each once, each with a photo (`PHOTO_MISSING`,
--     naming the colour in DETAIL) that is a photo (`PHOTO_UNKNOWN`, same);
--     no colours at all is `NO_COLORS`;
--   · the cut: all four sizes of every colour, 0 to 999 pieces each, and at
--     least one piece per colour (`COLOR_EMPTY`, naming it). `cut_units` IS
--     the sum — an issue is cut once, so this is every piece that will ever
--     exist of it — and all of it starts on the shelf;
--   · the issue exists (`NOT_FOUND`) and has not closed (`DROP_CLOSED`): a
--     style can join an issue that is selling or one that has not opened —
--     and `catalog_snapshot()` keeps the latter off the shop until it does;
--   · the address segment is nobody's, as a segment or as the id it makes,
--     `p-<slug>` (`NOT_ALLOWED`).
--
-- The style goes last in the catalogue order (`position` = max + 1), not sold
-- out, with exactly one event. Returns the new id.
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
  v_drop     := public.json_count(p_input -> 'dropNo');

  if v_name = '' or length(v_name) > 40
     or v_kind = '' or length(v_kind) > 80
     or not (v_family = any (enum_range(null::public.product_family)::text[]))
     or not (v_fit = any (enum_range(null::public.product_fit)::text[]))
     or v_slug !~ '^[a-z0-9][a-z0-9-]{1,39}$'
     or v_material = '' or length(v_material) > 200
     or v_price is null or v_price < min_price or v_price > max_price
     or v_drop is null then
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

  -- ── the cut, colour by colour
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

  -- ── the issue: there, and still taking styles
  select d.closes_at into v_closes from public.drops d where d.no = v_drop;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;
  if v_closes <= p_now then
    raise exception using message = 'DROP_CLOSED';
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
    v_fit::public.product_fit, v_price, v_cut, v_drop, null,
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
      'dropNo', v_drop,
      'colors', to_jsonb(v_keys::text[]),
      'cutUnits', v_cut,
      'uploaded', v_uploaded,
      'borrowed', v_borrowed
    )
  );

  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────── one colour's photo
-- A borrowed frame for a real photo, or one real photo for another. Returns
-- the key it replaced: when that was an upload nothing else uses any more,
-- the Server Action removes the object from the bucket afterwards (the
-- bucket cannot be emptied from SQL, and a failed removal must not undo a
-- photo that is already on the shop).
--
-- The colour's row is locked, so two swaps of one colour queue up; the same
-- key again is nothing to save (`BAD_INPUT`).
create or replace function public.admin_set_product_photo(
  p_id        text,
  p_color     public.color_key,
  p_photo_key text,
  p_now       timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_photo  text := btrim(coalesce(p_photo_key, ''));
  v_before text;
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_id is null or p_color is null or v_photo = '' then
    raise exception using message = 'BAD_INPUT';
  end if;

  select pc.photo_key into v_before
    from public.product_colors pc
   where pc.product_id = p_id
     and pc.color = p_color
     for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  -- Nothing to save is not a save.
  if v_before = v_photo then
    raise exception using message = 'BAD_INPUT';
  end if;

  if not public.photo_key_ok(v_photo) then
    raise exception using message = 'PHOTO_UNKNOWN', detail = p_color::text;
  end if;

  update public.product_colors
     set photo_key = v_photo
   where product_id = p_id
     and color = p_color;

  insert into public.events (at, actor_role, actor, kind, product_id, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'PRODUCT_PHOTO_SET', p_id,
    jsonb_build_object('id', p_id, 'color', p_color::text, 'before', v_before, 'after', v_photo)
  );

  return v_before;
end;
$$;

-- ─────────────────────────────────────────────────────── the band order
-- The same colours in another order — never one more or one less: which
-- colours a style comes in was decided when the cloth was cut (QĐ-27). The
-- first colour is the one the shop leads with (the card, the listing).
--
-- Every row of the style is locked (sorted by colour, the one order used
-- here), then renumbered in two passes — first to negatives, then to the new
-- order — because `unique (product_id, position)` is checked row by row and a
-- swap written in one pass would collide with itself.
create or replace function public.admin_reorder_colors(
  p_id     text,
  p_colors public.color_key[],
  p_now    timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.color_key[];
begin
  if not public.is_admin() then
    raise exception using message = 'NOT_ADMIN';
  end if;
  perform public.assert_now(p_now);

  if p_id is null or p_colors is null or cardinality(p_colors) = 0
     or array_position(p_colors, null) is not null then
    raise exception using message = 'BAD_INPUT';
  end if;

  perform 1
     from public.product_colors pc
    where pc.product_id = p_id
    order by pc.color
      for update;

  select array_agg(pc.color order by pc.position) into v_before
    from public.product_colors pc
   where pc.product_id = p_id;
  if v_before is null then
    raise exception using message = 'NOT_FOUND';
  end if;

  -- A permutation of exactly the colours the style has.
  if cardinality(p_colors) <> cardinality(v_before)
     or (select count(distinct c) from unnest(p_colors) as c) <> cardinality(p_colors)
     or not (p_colors <@ v_before) then
    raise exception using message = 'BAD_INPUT';
  end if;

  -- The order it already has is nothing to save.
  if p_colors = v_before then
    raise exception using message = 'BAD_INPUT';
  end if;

  update public.product_colors
     set position = -1 - position
   where product_id = p_id;

  update public.product_colors pc
     set position = o.ord - 1
    from unnest(p_colors) with ordinality as o (color, ord)
   where pc.product_id = p_id
     and pc.color = o.color;

  insert into public.events (at, actor_role, actor, kind, product_id, payload)
  values (
    p_now, 'admin', coalesce(auth.jwt() ->> 'email', ''), 'PRODUCT_COLORS_REORDERED', p_id,
    jsonb_build_object('id', p_id, 'before', to_jsonb(v_before::text[]), 'after', to_jsonb(p_colors::text[]))
  );
end;
$$;

-- ──────────────────────────────────────────── the catalogue as JSON (v3)
-- Replaces the version in `20260924020000_catalog_admin.sql`. One change: a
-- style of an issue that has not opened yet is left out — for everybody but
-- the manager, who has to see what is coming to prepare it. The shop
-- promises "Giá và số lượng công bố đúng lúc mở", so its product page is a
-- 404 until then, and no cart can hold it. The clock is Postgres's own
-- (`now()`, the real one since slice B3a), not the app's: the rule lives with
-- the data, and `place_order` still refuses a style of an issue that is not
-- open (`DROP_CLOSED`) whatever a screen showed. Teasers are unchanged:
-- they are how an issue that has not opened is announced.
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
      where (select public.is_admin())
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

-- (grants unchanged: anon and authenticated may read the catalogue)

-- ───────────────────────────────────────────────────────────────── grants
-- The three new `admin_*` ask for the role in their body, so `authenticated`
-- may call them; `anon` may call none.
revoke execute on function public.admin_add_product(jsonb, timestamptz) from public, anon;
grant  execute on function public.admin_add_product(jsonb, timestamptz) to authenticated;

revoke execute on function public.admin_set_product_photo(text, public.color_key, text, timestamptz) from public, anon;
grant  execute on function public.admin_set_product_photo(text, public.color_key, text, timestamptz) to authenticated;

revoke execute on function public.admin_reorder_colors(text, public.color_key[], timestamptz) from public, anon;
grant  execute on function public.admin_reorder_colors(text, public.color_key[], timestamptz) to authenticated;
