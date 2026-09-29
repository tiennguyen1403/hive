-- ─────────────────────────────────── what an account keeps, on the account
--
-- Slice B9. Round v4's account pages are the Feed mock's
-- (`prototype/explore/feed/`: account, favorites, profile, notifications),
-- and four things there belong to the shopper who is signed in rather than
-- to the browser they happen to hold. The user settled it on 27/09: saving a
-- style needs an account ("yêu thích bắt buộc đăng nhập"), and Feed keeps
-- these per account. Until now all four lived in `localStorage`
-- (`lib/wishlist.ts`, `lib/reminder.ts`, `lib/prefs.ts`). This file is the
-- server half of the move; no screen reads it yet — UI slice 3b wires it.
--
--   · FAVOURITES, `public.favorites`: one row per style (the primary key),
--     the colour it was saved in and the moment it was saved. The list reads
--     newest first, the way the mock adds to the front of it.
--   · REMINDERS, `public.reminders`: one row per issue ("Nhắc tôi"), set only
--     while the issue has not opened, cleared at any time. No channel is
--     stored: the in-app line is the only channel there is (QĐ-35, no e-mail).
--   · SIZE CỦA TÔI and the four NOTIFICATION SWITCHES,
--     `public.account_settings`: one row per account, written on its first
--     change. An account without one reads the defaults — no size, all four
--     switches on (`notifications.js`, `prefs()`).
--   · the PROFILE: its owner may change the name and the phone number, and
--     only those, through one function. The e-mail stays read-only (QĐ-35)
--     and so does the handle.
--
-- THE KEEP WRITES' OWN RATE LIMIT. A new bucket, `keep`, at the end of this
-- file: the six keep writes spend it instead of sharing `account` with the
-- address book (review of B9, 29/09).
--
-- ONE READ. `my_state()` hands the signed-in account all of it in one JSON
-- document — favourites, the reminders of issues still to open, the two sizes
-- and the four switches — or NULL for nobody. Every write below answers with
-- the same document, so a screen can draw what the database now holds from
-- the reply instead of reading again.
--
-- WHO MAY TOUCH WHAT. Row level security on all six new tables. An account
-- READS its own rows (a select policy per live table) and WRITES them only
-- through the `security definer` functions below, which take the owner from
-- `auth.uid()` and never from an argument — no role the API hands out may
-- insert, update or delete a row directly, so every rule a function checks is
-- a rule that holds. Nothing here is open to `anon`. The seed mirrors are
-- reachable by nobody. The back office reads none of it: unlike profiles and
-- addresses, a shopper's saved styles and switches are nobody's business but
-- theirs (the brief: "mỗi tài khoản chỉ đọc và ghi dòng của mình").
--
-- WHY `seq`, NOT `saved_at`, DECIDES THE ORDER. The four styles the first
-- demo account starts with (`data/customers.ts`, from the mock's FAVORITES)
-- carry no moment: the mock never recorded one, and a date written into the
-- seed would be a date nobody saved anything on (DESIGN.md §9, rule 1). So
-- theirs is NULL — "saved, moment unknown", the reading `lib/wishlist.ts`
-- already gives an entry without a stamp — and the order comes from `seq`, a
-- number drawn from `favorites_seq` every time a style is saved: higher is
-- newer. The reset draws the seed's rows last one first, so the first style
-- the fixture lists is the newest of them, and every later save is newer
-- still.
--
-- WHY "BỎ LƯU" KEEPS THE ROW. "Hoàn tác" has to put a style back exactly
-- where it was. So unsaving does not delete: it stamps `removed_at`, every
-- reader skips a stamped row, and undoing clears the stamp — the row returns
-- with its own `seq`, colour and moment, and nothing the browser sends decides
-- where it lands. Saving a style whose row is stamped is a new save: a fresh
-- `seq` (the top of the list), the colour asked for, now. One row per style
-- either way.
--
-- WHAT A FAVOURITE POINTS AT. A colour of a style — `(product_id, color)` →
-- `product_colors`, the pair `stock_cells` hangs off — so "the colour must be
-- one of the style's" is the database's own rule, not only the function's. A
-- reminder points at its issue. Both go with what they point at and with
-- their account (`on delete cascade`).
--
-- THE RESET (v7). `reset_demo` rebuilds the catalogue with TRUNCATE, which
-- refuses a table another table references unless both are emptied in the
-- same command. So favourites and reminders join the command — copied aside
-- first and put back once the catalogue is in again: an account somebody made
-- themselves keeps what it saved, exactly as the reset leaves its address
-- book alone. Only what points at something the reset did not bring back (a
-- style, a colour or an issue the back office added) does not return. The
-- eight demo accounts are then put back to the seed, as their addresses are:
-- the first one to the mock's demo shopper (four saved styles, a reminder for
-- Số 06, áo L and quần M), the other seven to nothing saved; all eight to the
-- four switches on.
--
-- Sources: https://supabase.com/docs/guides/database/postgres/row-level-security
-- ("Wrap functions in a select statement", `to authenticated`, "Add an index on
-- every column your policies filter on"),
-- https://supabase.com/docs/guides/database/functions (`security definer`,
-- "you must set the search_path", revoking execute from public and anon),
-- https://www.postgresql.org/docs/current/sql-truncate.html ("TRUNCATE cannot
-- be used on a table that has foreign-key references from other tables,
-- unless all such tables are also truncated in the same command"),
-- https://www.postgresql.org/docs/current/functions-array.html (`unnest`),
-- https://www.postgresql.org/docs/current/sql-insert.html (`ON CONFLICT … DO
-- UPDATE … WHERE`: "Only rows for which this expression returns true will be
-- updated"), https://www.postgresql.org/docs/current/functions-matching.html
-- (`[[:space:]]`, `regexp_replace`) and
-- https://www.postgresql.org/docs/current/sql-createfunction.html ("the
-- ownership and permissions of the function do not change" on replace).

-- ─────────────────────────────────────────────────────────────── the tables
-- Higher is newer. Drawn on every save, and by the reset for the seed's rows.
create sequence public.favorites_seq as bigint;

create table public.favorites (
  profile_id uuid             not null references public.profiles (id) on delete cascade,
  product_id text             not null,
  color      public.color_key not null,
  -- NULL for a row the seed wrote: the fixture holds no moment (see above).
  saved_at   timestamptz      null,
  seq        bigint           not null default nextval('public.favorites_seq'),
  -- Set by "Bỏ lưu", cleared by "Hoàn tác" and by saving again.
  removed_at timestamptz      null,
  primary key (profile_id, product_id),
  foreign key (product_id, color)
    references public.product_colors (product_id, color) on delete cascade
);

alter sequence public.favorites_seq owned by public.favorites.seq;

-- The primary key already leads with `profile_id`, the column the policy
-- filters on; this one serves the cascade from `product_colors`.
create index favorites_product_color on public.favorites (product_id, color);

create table public.reminders (
  profile_id uuid    not null references public.profiles (id) on delete cascade,
  drop_no    integer not null references public.drops (no) on delete cascade,
  primary key (profile_id, drop_no)
);

create index reminders_drop on public.reminders (drop_no);

-- The defaults ARE the answer for an account that never changed anything:
-- `my_state()` reads a missing row as exactly these.
create table public.account_settings (
  profile_id      uuid                primary key references public.profiles (id) on delete cascade,
  size_top        public.garment_size null,
  size_bottom     public.garment_size null,
  notify_order    boolean             not null default true,
  notify_drop     boolean             not null default true,
  notify_wishlist boolean             not null default true,
  notify_promo    boolean             not null default true
);

-- ────────────────────────────────────────────────────────── seed mirrors
-- Keyed by handle, like `seed_addresses`: the fixture predates every auth
-- user. `position` is the fixture's own order, 0 the newest.
create table public.seed_favorites (
  handle     text             not null references public.seed_customers (handle) on delete cascade,
  position   integer          not null check (position >= 0),
  product_id text             not null,
  color      public.color_key not null,
  primary key (handle, position),
  unique (handle, product_id)
);

create table public.seed_reminders (
  handle  text    not null references public.seed_customers (handle) on delete cascade,
  drop_no integer not null check (drop_no > 0),
  primary key (handle, drop_no)
);

-- One row per demo account that starts with anything but the defaults.
create table public.seed_account_settings (
  handle          text                primary key references public.seed_customers (handle) on delete cascade,
  size_top        public.garment_size null,
  size_bottom     public.garment_size null,
  notify_order    boolean             not null,
  notify_drop     boolean             not null,
  notify_wishlist boolean             not null,
  notify_promo    boolean             not null
);

-- ──────────────────────────────────────────────────────────────────── RLS
alter table public.favorites             enable row level security;
alter table public.reminders             enable row level security;
alter table public.account_settings      enable row level security;
alter table public.seed_favorites        enable row level security;
alter table public.seed_reminders        enable row level security;
alter table public.seed_account_settings enable row level security;

-- Read own, nothing else. No write policy for anybody: writes are the
-- functions below, which run as their owner.
create policy "favorites: read own" on public.favorites
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "reminders: read own" on public.reminders
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "account settings: read own" on public.account_settings
  for select to authenticated using (profile_id = (select auth.uid()));

-- A new table in `public` comes with every privilege granted to the API
-- roles. `authenticated` keeps SELECT (the policies narrow it to the owner)
-- and loses everything else; `anon` loses everything; the mirrors are
-- internal. The sequence is only ever drawn by the functions.
revoke all on public.favorites        from anon, authenticated;
revoke all on public.reminders        from anon, authenticated;
revoke all on public.account_settings from anon, authenticated;
grant select on public.favorites        to authenticated;
grant select on public.reminders        to authenticated;
grant select on public.account_settings to authenticated;

revoke all on public.seed_favorites        from anon, authenticated;
revoke all on public.seed_reminders        from anon, authenticated;
revoke all on public.seed_account_settings from anon, authenticated;

revoke all on sequence public.favorites_seq from anon, authenticated;

-- ──────────────────────────────────────────── the profile: name and phone only
-- Until this slice an account could update its own profile row directly
-- ("profiles: update own", `20260923124500_accounts.sql`) — every column of
-- it, the e-mail and the handle included — and nothing in the app used that
-- door. The e-mail is read-only (QĐ-35): it follows the auth user through
-- `handle_user_email_change()`, and the handle is what ties a demo account to
-- its sample. So the door closes, and `update_my_profile()` below is the only
-- way a shopper changes their row: the name and the phone, checked. The
-- trigger and the reset run as the definer and are not affected.
drop policy "profiles: update own" on public.profiles;
revoke update on public.profiles from authenticated;

-- ──────────────────────────────────────────────────────────── the one read
-- Everything the signed-in account keeps, as `MyState` in `data/types.ts`:
--
--   { "favorites": [{ "productId", "color", "savedAt" }],  newest first
--     "reminders": [6],                                   issues still to open
--     "sizes":     { "top": "L" | null, "bottom": "M" | null },
--     "notify":    { "order", "drop", "wishlist", "promo" } }
--
-- or NULL when nobody is signed in. `security invoker`: it reads through the
-- same "read own" policies the API does, and names the owner as well.
--
-- A favourite is listed only while its style is one the caller can see, by
-- the rule `catalog_snapshot()` shows styles by (fixed, or its issue has
-- opened; the manager sees all) — a screen is never handed an id the
-- catalogue it holds cannot resolve. `savedAt` is written like every other
-- instant the app reads, `+07:00` on the wall clock, or null.
create or replace function public.my_state()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select case when (select auth.uid()) is null then null else jsonb_build_object(
    'favorites', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'productId', f.product_id,
          'color', f.color::text,
          'savedAt', to_char(f.saved_at at time zone 'Asia/Ho_Chi_Minh',
                             'YYYY-MM-DD"T"HH24:MI:SS"+07:00"')
        ) order by f.seq desc
      )
      from public.favorites f
      join public.products p on p.id = f.product_id
      where f.profile_id = (select auth.uid())
        and f.removed_at is null
        and (p.drop_no is null
             or (select public.is_admin())
             or exists (
                  select 1 from public.drops d
                   where d.no = p.drop_no
                     and d.opens_at <= now()
                ))
    ), '[]'::jsonb),
    'reminders', coalesce((
      select jsonb_agg(r.drop_no order by r.drop_no)
      from public.reminders r
      join public.drops d on d.no = r.drop_no
      where r.profile_id = (select auth.uid())
        and d.opens_at > now()
    ), '[]'::jsonb),
    'sizes', jsonb_build_object(
      'top', s.size_top::text,
      'bottom', s.size_bottom::text
    ),
    'notify', jsonb_build_object(
      'order', coalesce(s.notify_order, true),
      'drop', coalesce(s.notify_drop, true),
      'wishlist', coalesce(s.notify_wishlist, true),
      'promo', coalesce(s.notify_promo, true)
    )
  ) end
  from (select 1) as one
  left join public.account_settings s on s.profile_id = (select auth.uid());
$$;

revoke execute on function public.my_state() from public, anon;
grant  execute on function public.my_state() to authenticated;

-- ──────────────────────────────────────────────────────────── the writes
-- Each one: the owner is `auth.uid()` (none → SIGNED_OUT), the input is
-- checked (wrong → BAD_INPUT), and the answer is `my_state()` after the
-- change. Refusals are raised with the code as the message, the way
-- `place_order()` raises its own, so `lib/db/my-state.ts` can name them.

-- "Lưu": the style, in the colour asked for — or, with none, the colour the
-- mock's `firstColor` picks: the first in band order with anything left, else
-- the first. The style must be one the caller can see (the rule above); a
-- closed issue's style and a fixed style both can be saved. Saving what is
-- already saved changes nothing, not even its colour or its place; saving a
-- style unsaved a moment ago is a new save, at the top.
create or replace function public.save_favorite(p_product_id text, p_color text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid     uuid := (select auth.uid());
  v_color public.color_key;
begin
  if uid is null then
    raise exception using message = 'SIGNED_OUT';
  end if;

  if p_product_id is null or not exists (
    select 1 from public.products p
     where p.id = p_product_id
       and (p.drop_no is null
            or public.is_admin()
            or exists (
                 select 1 from public.drops d
                  where d.no = p.drop_no
                    and d.opens_at <= now()
               ))
  ) then
    raise exception using message = 'BAD_INPUT';
  end if;

  if p_color is null then
    select pc.color into v_color
      from public.product_colors pc
     where pc.product_id = p_product_id
     order by exists (
                select 1 from public.stock_cells sc
                 where sc.product_id = pc.product_id
                   and sc.color = pc.color
                   and sc.on_hand > 0
              ) desc,
              pc.position
     limit 1;
  else
    select pc.color into v_color
      from public.product_colors pc
     where pc.product_id = p_product_id
       and pc.color::text = p_color;
  end if;

  if v_color is null then
    raise exception using message = 'BAD_INPUT';
  end if;

  insert into public.favorites as f (profile_id, product_id, color, saved_at)
  values (uid, p_product_id, v_color, now())
  on conflict (profile_id, product_id) do update
    set color      = excluded.color,
        saved_at   = excluded.saved_at,
        seq        = nextval('public.favorites_seq'),
        removed_at = null
    where f.removed_at is not null;

  return public.my_state();
end;
$$;

-- "Bỏ lưu": stamps the row and answers with it, so the screen can offer
-- "Hoàn tác". Unsaving what is not saved changes nothing and answers
-- `removed: null`.
--
--   { "removed": { "productId", "color", "savedAt" } | null, "state": my_state() }
create or replace function public.unsave_favorite(p_product_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := (select auth.uid());
  gone jsonb;
begin
  if uid is null then
    raise exception using message = 'SIGNED_OUT';
  end if;
  if p_product_id is null then
    raise exception using message = 'BAD_INPUT';
  end if;

  update public.favorites f
     set removed_at = now()
   where f.profile_id = uid
     and f.product_id = p_product_id
     and f.removed_at is null
  returning jsonb_build_object(
    'productId', f.product_id,
    'color', f.color::text,
    'savedAt', to_char(f.saved_at at time zone 'Asia/Ho_Chi_Minh',
                       'YYYY-MM-DD"T"HH24:MI:SS"+07:00"')
  ) into gone;

  return jsonb_build_object('removed', gone, 'state', public.my_state());
end;
$$;

-- "Hoàn tác": clears the stamp, and the row is back where it was. A style
-- that is saved already (saved again, or undone twice) changes nothing; one
-- this account has no row for at all is NOT_FOUND — a reset of a demo
-- account in between, for instance.
create or replace function public.restore_favorite(p_product_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception using message = 'SIGNED_OUT';
  end if;
  if p_product_id is null then
    raise exception using message = 'BAD_INPUT';
  end if;

  update public.favorites f
     set removed_at = null
   where f.profile_id = uid
     and f.product_id = p_product_id
     and f.removed_at is not null;

  if not found and not exists (
    select 1 from public.favorites f
     where f.profile_id = uid and f.product_id = p_product_id
  ) then
    raise exception using message = 'NOT_FOUND';
  end if;

  return public.my_state();
end;
$$;

-- "Nhắc tôi" on and off. On only while the issue has not opened — an issue
-- that has opened, or one that does not exist, is NOT_UPCOMING. Off at any
-- time, whether or not it was on.
create or replace function public.set_reminder(p_drop_no integer, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception using message = 'SIGNED_OUT';
  end if;
  if p_drop_no is null or p_on is null then
    raise exception using message = 'BAD_INPUT';
  end if;

  if p_on then
    if not exists (
      select 1 from public.drops d
       where d.no = p_drop_no
         and d.opens_at > now()
    ) then
      raise exception using message = 'NOT_UPCOMING';
    end if;

    insert into public.reminders (profile_id, drop_no)
    values (uid, p_drop_no)
    on conflict (profile_id, drop_no) do nothing;
  else
    delete from public.reminders r
     where r.profile_id = uid
       and r.drop_no = p_drop_no;
  end if;

  return public.my_state();
end;
$$;

-- "Size của tôi": 'top' (áo) or 'bottom' (quần), one of the four sizes — or
-- none (NULL, the default) to forget it ("Bỏ chọn"). The other slot is left
-- as it was.
create or replace function public.set_my_size(p_slot text, p_size text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception using message = 'SIGNED_OUT';
  end if;
  if p_slot is null or p_slot not in ('top', 'bottom') then
    raise exception using message = 'BAD_INPUT';
  end if;
  if p_size is not null and not exists (
    select 1 from unnest(enum_range(null::public.garment_size)) as z (size)
     where z.size::text = p_size
  ) then
    raise exception using message = 'BAD_INPUT';
  end if;

  insert into public.account_settings (profile_id) values (uid)
  on conflict (profile_id) do nothing;

  update public.account_settings s
     set size_top    = case when p_slot = 'top'    then p_size::public.garment_size else s.size_top end,
         size_bottom = case when p_slot = 'bottom' then p_size::public.garment_size else s.size_bottom end
   where s.profile_id = uid;

  return public.my_state();
end;
$$;

-- One of the four switches, by the mock's key (`notifications.js`, PREFS).
create or replace function public.set_my_notify(p_key text, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception using message = 'SIGNED_OUT';
  end if;
  if p_key is null or p_key not in ('order', 'drop', 'wishlist', 'promo') or p_on is null then
    raise exception using message = 'BAD_INPUT';
  end if;

  insert into public.account_settings (profile_id) values (uid)
  on conflict (profile_id) do nothing;

  update public.account_settings s
     set notify_order    = case when p_key = 'order'    then p_on else s.notify_order end,
         notify_drop     = case when p_key = 'drop'     then p_on else s.notify_drop end,
         notify_wishlist = case when p_key = 'wishlist' then p_on else s.notify_wishlist end,
         notify_promo    = case when p_key = 'promo'    then p_on else s.notify_promo end
   where s.profile_id = uid;

  return public.my_state();
end;
$$;

-- "Lưu" on Hồ sơ: the name and the phone, by the mock's rules
-- (`profile.js`), which `lib/my-state.ts#validateProfile` applies first:
--
--   · the name, trimmed, from 2 characters — and at most 60
--     (`lib/my-state.ts#NAME_MAX`), a ceiling the mock does not have;
--   · the phone: digits, spaces and dots only, and ten digits starting with
--     0 once the spaces and dots are gone — stored as those ten digits.
--
-- Nothing else on the row moves: not the e-mail, not the handle. Answers
-- `{ "name", "phone" }` as stored.
create or replace function public.update_my_profile(p_name text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := (select auth.uid());
  name_max constant integer := 60;
  v_name   text := regexp_replace(coalesce(p_name, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  v_raw    text := regexp_replace(coalesce(p_phone, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  v_phone  text;
  done     jsonb;
begin
  if uid is null then
    raise exception using message = 'SIGNED_OUT';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > name_max then
    raise exception using message = 'BAD_INPUT';
  end if;

  v_phone := regexp_replace(v_raw, '[[:space:].]', '', 'g');
  if v_raw !~ '^[0-9[:space:].]+$' or v_phone !~ '^0[0-9]{9}$' then
    raise exception using message = 'BAD_INPUT';
  end if;

  update public.profiles p
     set name  = v_name,
         phone = v_phone
   where p.id = uid
  returning jsonb_build_object('name', p.name, 'phone', p.phone) into done;

  if done is null then
    raise exception using message = 'NOT_FOUND';
  end if;

  return done;
end;
$$;

revoke execute on function public.save_favorite(text, text)      from public, anon;
revoke execute on function public.unsave_favorite(text)          from public, anon;
revoke execute on function public.restore_favorite(text)         from public, anon;
revoke execute on function public.set_reminder(integer, boolean) from public, anon;
revoke execute on function public.set_my_size(text, text)        from public, anon;
revoke execute on function public.set_my_notify(text, boolean)   from public, anon;
revoke execute on function public.update_my_profile(text, text)  from public, anon;
grant  execute on function public.save_favorite(text, text)      to authenticated;
grant  execute on function public.unsave_favorite(text)          to authenticated;
grant  execute on function public.restore_favorite(text)         to authenticated;
grant  execute on function public.set_reminder(integer, boolean) to authenticated;
grant  execute on function public.set_my_size(text, text)        to authenticated;
grant  execute on function public.set_my_notify(text, boolean)   to authenticated;
grant  execute on function public.update_my_profile(text, text)  to authenticated;

-- ───────────────────────────────────────────────────────── reset_demo, v7
-- Replaces v6 in `20260927100000_product_details.sql`. Three additions, and
-- the rest is v6 character for character:
--
--   · favourites and reminders are copied aside before the catalogue is
--     emptied, join the TRUNCATE (they reference `product_colors` and
--     `drops`), and come back once the catalogue is in again — those that
--     still point at something;
--   · each demo account's favourites, reminders and settings are then put
--     back to the seed, stamped rows included — the first style the fixture
--     lists drawn last, so it is the newest;
--   · an account that is not a demo one keeps all three, as it keeps its
--     address book.
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

-- ──────────────────────────────────────────── the keep writes' own limit
-- The six keep writes (`lib/actions/my-state.ts`: a heart, its undo, "Nhắc
-- tôi", a size, a switch) spend a bucket of their own, `keep` — 120 per ten
-- minutes per visitor (`lib/rate-limit.ts`, RATE_RULES) — and NOT `account`:
-- thirty per ten minutes shared with the address book and "Huỷ đơn" is a
-- budget a shopper tapping hearts down the feed, or a few shoppers behind one
-- NAT, would run dry, and the address book would start refusing with it.
-- Hồ sơ's "Lưu" (`updateProfileAction`) stays on `account`.
--
-- A bucket name is written in three places that must agree
-- (`20260924150000_rate_limits.sql`): `RATE_BUCKETS` in `lib/rate-limit.ts`,
-- the check on `rate_hits.bucket`, and the list `take_rate()` refuses
-- anything outside. The two SQL ones gain the twelfth name here;
-- `lib/db/rate-limit.dbtest.ts` spends a token of every bucket the app knows,
-- so a name missing from either fails it. No row is rewritten: the new check
-- only widens the old one.

alter table public.rate_hits drop constraint rate_hits_bucket_check;
alter table public.rate_hits add constraint rate_hits_bucket_check check (bucket in (
  'order_place',
  'order_units',
  'sign_in',
  'sign_up',
  'password',
  'account',
  'keep',
  'admin',
  'admin_create',
  'upload',
  'upload_global',
  'reset'
));

-- Replaces the B4b version; the one change is `keep` in the list. Same
-- signature, so its owner and its grants stay as they were (restated below
-- all the same, as every replaced function in this project is).
create or replace function public.take_rate(
  p_bucket         text,
  p_subject        text,
  p_cost           integer,
  p_limit          integer,
  p_window_seconds integer,
  p_now            timestamptz default now()
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_window interval;
  v_start  timestamptz;
  v_wait   integer;
  v_hits   integer;
begin
  if p_bucket is null
     or not (p_bucket = any (array[
       'order_place',
       'order_units',
       'sign_in',
       'sign_up',
       'password',
       'account',
       'keep',
       'admin',
       'admin_create',
       'upload',
       'upload_global',
       'reset'
     ]))
     or p_subject is null or length(p_subject) not between 1 and 64
     or p_cost is null or p_cost < 1
     or p_limit is null or p_limit < 1
     or p_window_seconds is null or p_window_seconds not between 1 and 86400
     or p_now is null then
    raise exception using message = 'BAD_INPUT';
  end if;

  v_window := make_interval(secs => p_window_seconds);
  -- The start of the window `p_now` falls in, counted from the epoch.
  v_start := date_bin(v_window, p_now, to_timestamp(0));
  -- Seconds to its end, rounded up: a refusal never says "0".
  v_wait := greatest(1, ceil(extract(epoch from (v_start + v_window - p_now)))::integer);

  if p_cost > p_limit then
    return v_wait;
  end if;

  insert into public.rate_hits as r (bucket, subject, window_start, hits)
  values (p_bucket, p_subject, v_start, p_cost)
  on conflict (bucket, subject, window_start) do update
     set hits = r.hits + excluded.hits
   where r.hits + excluded.hits <= p_limit
  returning r.hits into v_hits;

  if v_hits is null then
    return v_wait;
  end if;
  return 0;
end;
$$;

revoke execute on function public.take_rate(text, text, integer, integer, integer, timestamptz)
  from public, anon, authenticated;
grant  execute on function public.take_rate(text, text, integer, integer, integer, timestamptz)
  to service_role;
