-- ────────────────────────────────────────────────────────── accounts schema
--
-- Slice B1: the simulated sign-in of QĐ-15 becomes Supabase Auth, and the two
-- things an account owns — a profile and an address book — move from
-- `data/customers.ts` plus `localStorage` into Postgres behind row level
-- security.
--
-- `auth.users` stays Supabase's. This file adds the storefront's own side of
-- the 1–1: `public.profiles`, keyed by the same uuid, filled by a trigger when
-- a user is created. Only the primary key is referenced, because every other
-- column of `auth.users` is Supabase-managed and may change
-- (https://supabase.com/docs/guides/auth/managing-user-data).
--
-- The seed mirrors work the way the catalogue's do: `seed_customers` and
-- `seed_addresses` hold the fixture, and `reset_demo()` — replaced at the
-- bottom of this file — copies them onto whichever demo users exist. A handle
-- with no user yet is skipped rather than being an error, because the users
-- are created by a script (`npm run seed:users`) that runs after `db reset`.

-- ─────────────────────────────────────────────────────────────── the tables
-- `handle` is the fixture id ('c-minhanh'). It is what still ties a demo
-- account to the sample orders in `data/orders.ts`, which are keyed by it and
-- do not move to the database until slice B2. A real sign-up has none, and a
-- real sign-up therefore has no sample orders — an empty list, honestly.
--
-- `email` is a COPY of the auth email, kept in sync by the triggers below. It
-- is here so an admin list can be read in one query instead of joining a
-- schema the API cannot see.
create table public.profiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  handle    text unique,
  name      text not null check (length(trim(name)) > 0),
  email     text not null,
  phone     text not null check (phone ~ '^0[0-9]{9}$' or phone = ''),
  joined_at timestamptz not null default now()
);

-- Two tiers, not three: Vietnam abolished the district level on 1/7/2025, so
-- an address is a line, a ward and a province (`data/regions.ts`).
--
-- `position` is the order the book is shown in, and it is also what makes a
-- re-seed idempotent: `reset_demo()` upserts on (profile_id, position), so the
-- same fixture address keeps the same id across resets.
create table public.addresses (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  recipient     text not null check (length(trim(recipient)) > 0),
  phone         text not null check (phone ~ '^0[0-9]{9}$'),
  line          text not null check (length(trim(line)) > 0),
  province_code text not null,
  ward_code     text not null,
  label         text not null check (label in ('Nhà', 'Công ty', 'Khác')),
  is_default    boolean not null default false,
  position      integer not null check (position >= 0),
  unique (profile_id, position)
);

-- One default per book, enforced by the database rather than by whoever wrote
-- the last update. A partial unique index is the standard way to say
-- "at most one row where this flag is true".
create unique index addresses_one_default on public.addresses (profile_id) where is_default;
create index addresses_profile on public.addresses (profile_id);

-- ────────────────────────────────────────────────────────── seed mirrors
-- Keyed by handle, not by uuid: the fixture predates every auth user, and the
-- users are created later by `scripts/seed-users.ts`.
create table public.seed_customers (
  handle    text primary key,
  name      text not null,
  email     text not null unique,
  phone     text not null,
  joined_at timestamptz not null
);

create table public.seed_addresses (
  handle        text not null references public.seed_customers (handle) on delete cascade,
  position      integer not null,
  recipient     text not null,
  phone         text not null,
  line          text not null,
  province_code text not null,
  ward_code     text not null,
  label         text not null,
  is_default    boolean not null,
  primary key (handle, position)
);

-- ──────────────────────────────────────────────────────────────────── RLS
alter table public.profiles       enable row level security;
alter table public.addresses      enable row level security;
alter table public.seed_customers enable row level security;
alter table public.seed_addresses enable row level security;

-- Every policy names its role and wraps `auth.uid()` in a select, both on the
-- advice of https://supabase.com/docs/guides/database/postgres/row-level-security
-- ("Always add a `to` clause", "Wrap functions in a select statement"). There
-- is deliberately no policy for `anon`: a profile and a home address are not a
-- catalogue.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- No insert policy: rows arrive through the trigger on auth.users, which runs
-- as the definer. No delete policy: deleting the auth user takes the profile
-- with it (`on delete cascade`), and nothing else may.

create policy "addresses: read own" on public.addresses
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "addresses: insert own" on public.addresses
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "addresses: update own" on public.addresses
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
create policy "addresses: delete own" on public.addresses
  for delete to authenticated using (profile_id = (select auth.uid()));

-- Adding a policy does not remove a grant, and a fresh Supabase project grants
-- the API roles everything on new tables in `public`. The seed mirrors are
-- internal; `anon` has no business in either live table either.
revoke all on public.profiles       from anon;
revoke all on public.addresses      from anon;
revoke all on public.seed_customers from anon, authenticated;
revoke all on public.seed_addresses from anon, authenticated;

-- ─────────────────────────────────────────────────── a profile per new user
-- The pattern from https://supabase.com/docs/guides/auth/managing-user-data:
-- a `security definer` trigger on `auth.users`, with `set search_path = ''` so
-- the body cannot be redirected by a caller's search_path — hence `public.` on
-- every relation.
--
-- It must never raise. A trigger that throws makes the INSERT into auth.users
-- fail, which the visitor reads as "sign-up is broken". So the two fields that
-- carry a constraint are made safe here rather than trusted: a name falls back
-- to the local part of the email (derived from real data, not invented), and a
-- phone that is not ten digits starting with zero is stored as the empty
-- string the column explicitly allows.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_name  text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
  meta_phone text := coalesce(new.raw_user_meta_data ->> 'phone', '');
  meta_handle text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'handle', '')), '');
begin
  insert into public.profiles (id, handle, name, email, phone)
  values (
    new.id,
    meta_handle,
    coalesce(meta_name, split_part(coalesce(new.email, ''), '@', 1), 'Khách'),
    coalesce(new.email, ''),
    case when meta_phone ~ '^0[0-9]{9}$' then meta_phone else '' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The copy has to follow the original, or an admin list would show an address
-- the shopper stopped using.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function public.handle_user_email_change();

-- ─────────────────────────────────────────────────── address book, atomically
-- Three writes that cannot be done in one statement without either a race or a
-- transient violation of `addresses_one_default`. They are `security invoker`,
-- so row level security still applies inside them — the function is there for
-- atomicity, not to get around a policy — and each one also filters on
-- `(select auth.uid())` itself, so a caller cannot reach another book by
-- passing somebody else's id.

-- Clear, then set. A single `set is_default = (id = p_id)` would flip two rows
-- inside one statement and can trip the partial unique index on the way.
create or replace function public.set_default_address(p_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid  uuid := (select auth.uid());
  owns boolean;
begin
  if uid is null then return false; end if;

  select exists (select 1 from public.addresses where id = p_id and profile_id = uid)
    into owns;
  if not owns then return false; end if;

  update public.addresses set is_default = false
   where profile_id = uid and is_default and id <> p_id;
  update public.addresses set is_default = true
   where profile_id = uid and id = p_id;
  return true;
end;
$$;

-- Appends at the end of the book. The first address a shopper saves is the
-- default whether they asked for it or not: a book of one with nothing marked
-- would leave checkout with nothing to prefill.
create or replace function public.add_address(
  p_recipient     text,
  p_phone         text,
  p_line          text,
  p_province_code text,
  p_ward_code     text,
  p_label         text,
  p_default       boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid      uuid := (select auth.uid());
  next_pos integer;
  empty    boolean;
  new_id   uuid;
begin
  if uid is null then return null; end if;

  select coalesce(max(position) + 1, 0), count(*) = 0
    into next_pos, empty
    from public.addresses where profile_id = uid;

  if p_default or empty then
    update public.addresses set is_default = false where profile_id = uid and is_default;
  end if;

  insert into public.addresses (
    profile_id, recipient, phone, line, province_code, ward_code, label, is_default, position
  )
  values (
    uid, p_recipient, p_phone, p_line, p_province_code, p_ward_code, p_label,
    p_default or empty, next_pos
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Editing may also promote the row to default, which is the same clear-then-set
-- as above; demoting the only default is refused, because a book with none is
-- a checkout with nothing prefilled.
create or replace function public.update_address(
  p_id            uuid,
  p_recipient     text,
  p_phone         text,
  p_line          text,
  p_province_code text,
  p_ward_code     text,
  p_label         text,
  p_default       boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid  uuid := (select auth.uid());
  was  boolean;
  sole boolean;
begin
  if uid is null then return false; end if;

  select is_default into was from public.addresses where id = p_id and profile_id = uid;
  if was is null then return false; end if;

  select count(*) = 1 into sole from public.addresses where profile_id = uid;

  if p_default and not was then
    update public.addresses set is_default = false where profile_id = uid and is_default;
  end if;

  update public.addresses
     set recipient     = p_recipient,
         phone         = p_phone,
         line          = p_line,
         province_code = p_province_code,
         ward_code     = p_ward_code,
         label         = p_label,
         is_default    = p_default or (was and sole)
   where id = p_id and profile_id = uid;

  -- Unticking "mặc định" on the current default leaves the book without one,
  -- so the earliest remaining address takes over.
  if was and not p_default and not sole then
    update public.addresses set is_default = true
     where id = (select id from public.addresses
                  where profile_id = uid and id <> p_id
                  order by position limit 1);
  end if;

  return true;
end;
$$;

-- Deleting the default promotes the next one, for the same reason.
create or replace function public.remove_address(p_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid  uuid := (select auth.uid());
  was  boolean;
  heir uuid;
begin
  if uid is null then return false; end if;

  select is_default into was from public.addresses where id = p_id and profile_id = uid;
  if was is null then return false; end if;

  delete from public.addresses where id = p_id and profile_id = uid;

  if was then
    select id into heir from public.addresses
     where profile_id = uid order by position limit 1;
    if heir is not null then
      update public.addresses set is_default = true where id = heir;
    end if;
  end if;

  return true;
end;
$$;

revoke execute on function public.set_default_address(uuid) from public, anon;
revoke execute on function public.remove_address(uuid)      from public, anon;
revoke execute on function public.add_address(text, text, text, text, text, text, boolean)
  from public, anon;
revoke execute on function public.update_address(uuid, text, text, text, text, text, text, boolean)
  from public, anon;
grant execute on function public.set_default_address(uuid) to authenticated;
grant execute on function public.remove_address(uuid)      to authenticated;
grant execute on function public.add_address(text, text, text, text, text, text, boolean)
  to authenticated;
grant execute on function public.update_address(uuid, text, text, text, text, text, text, boolean)
  to authenticated;

-- ───────────────────────────────────────────────────────── reset_demo, v2
-- Replaces the catalogue-only version from `20260923083130_catalog.sql`. The
-- catalogue half is unchanged; what is new is the tail, which puts the eight
-- demo accounts back to the fixture — but only for handles that already have
-- an auth user, because `supabase db reset` runs before `npm run seed:users`
-- and a missing demo account is not an error.
--
-- Still `security definer` (it truncates tables nobody may write to and reads
-- `auth.users`), still `set search_path = ''`, still idempotent: the address
-- upsert is keyed on (profile_id, position), so running it twice leaves the
-- same rows with the same ids.
create or replace function public.reset_demo(p_anchor timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fixture_anchor constant timestamptz := '2026-09-20 18:50:00+07'::timestamptz;
  delta constant interval := coalesce(p_anchor, fixture_anchor) - fixture_anchor;
  c record;
  uid uuid;
  last_pos integer;
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
end;
$$;

revoke execute on function public.reset_demo(timestamptz) from public, anon, authenticated;
grant  execute on function public.reset_demo(timestamptz) to service_role;
