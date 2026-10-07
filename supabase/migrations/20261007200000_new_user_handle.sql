-- ──────────────────── a new account's handle comes only from the sample
--
-- Slice B19, two findings of the v6 sweep, both about `handle_new_user()`, the
-- trigger that writes a new account's `public.profiles` row.
--
-- F9: THE HANDLE. A profile that carries a `handle` is the sample's: slice B17
-- neither masks it in the back office nor deletes it with the daily reset
-- (`real_accounts()`, `20261007010000_real_accounts.sql`). Until now the
-- trigger read that handle from `raw_user_meta_data` — the `data` of a
-- sign-up, which anybody calling `/auth/v1/signup` with the publishable key
-- writes as they please. The key is not in the app's bundle today, but a rule
-- about who is real should not lean on that. So:
--
--   · the handle is read from `raw_app_meta_data`, which only the service role
--     writes ("raw_app_meta_data … cannot be updated by the user",
--     https://supabase.com/docs/guides/database/postgres/row-level-security) —
--     `scripts/seed-users.ts` puts it there from this slice on;
--   · and only a handle of the sample is taken: one of `seed_customers.handle`
--     (the eight shoppers' `c-…`) or the manager's `a-quanly`, which lives in
--     `lib/demo-admin.ts` and nowhere in SQL, so it is written out here — the
--     two must agree, and `lib/db/new-user-handle.dbtest.ts` fails when they
--     do not (the manager's profile must carry `DEMO_ADMIN.handle`);
--   · and only one no profile carries yet: `profiles.handle` is unique, and a
--     second account with the same handle would make the INSERT raise.
--
-- Anything else is dropped to null, quietly: the trigger must never raise, or
-- the INSERT into auth.users fails and the visitor reads "sign-up is broken".
--
-- TWO MOMENTS, MEASURED. `auth.admin.createUser` writes the `app_metadata` it
-- is given AFTER it inserts the row, in the same request: on the local stack
-- (GoTrue v2.197.0, 07/10/2026) the manager's account came out of
-- `seed:users` with `raw_app_meta_data ->> 'handle'` = 'a-quanly' and a
-- profile without it, when only the insert trigger read the handle. (The eight
-- shoppers did not show it: `reset_demo()` gives them their handles itself,
-- matching `seed_customers` by e-mail; the manager is not in that table.) So
-- the insert trigger reads it in case it is already there, and a second
-- trigger, after an update that changes `raw_app_meta_data ->> 'handle'`,
-- gives it to a profile that has none — by the same rules, never replacing a
-- handle a profile already carries.
--
-- F17: THE NAME. Hồ sơ refuses a name longer than 60 characters (`NAME_MAX`,
-- `update_my_profile`), so an account whose name arrived longer — Google sends
-- whatever the person typed there — could not save Hồ sơ at all, not even a
-- new phone number. Each candidate is now trimmed, cut to 60 characters
-- (`left` counts characters, as `char_length` and `NAME_MAX` do) and trimmed
-- again, so a cut that lands after a space leaves none at the end. The
-- profiles already too long are cut the same way, once, below.
--
-- Everything else is as `20261007120000_google_names.sql` left it: the name
-- from `name`, then `full_name`, then the part of the address before the @,
-- then 'Khách'; the phone only when it is ten digits starting with 0.
-- `create or replace` keeps the trigger pointing at the function, and the
-- function's owner and grants as they were.
--
-- Sources: https://supabase.com/docs/guides/auth/managing-user-data (a
-- `security definer` trigger on `auth.users`, `set search_path = ''`),
-- https://supabase.com/docs/reference/javascript/auth-admin-createuser
-- (`app_metadata` is set with the service role),
-- https://www.postgresql.org/docs/current/functions-string.html (`btrim`,
-- `left`, `char_length`, `split_part`).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_name   text := coalesce(
    nullif(btrim(left(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), 60)), ''),
    nullif(btrim(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 60)), '')
  );
  local_part  text := nullif(btrim(left(btrim(split_part(coalesce(new.email, ''), '@', 1)), 60)), '');
  meta_phone  text := coalesce(new.raw_user_meta_data ->> 'phone', '');
  meta_handle text := nullif(btrim(coalesce(new.raw_app_meta_data ->> 'handle', '')), '');
begin
  if meta_handle is not null and not (
       (meta_handle = 'a-quanly'
        or exists (select 1 from public.seed_customers c where c.handle = meta_handle))
       and not exists (select 1 from public.profiles p where p.handle = meta_handle)
     ) then
    meta_handle := null;
  end if;

  insert into public.profiles (id, handle, name, email, phone)
  values (
    new.id,
    meta_handle,
    coalesce(meta_name, local_part, 'Khách'),
    coalesce(new.email, ''),
    case when meta_phone ~ '^0[0-9]{9}$' then meta_phone else '' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─────────────────── the handle that arrives after the row (see above)
-- Same rules as the insert trigger's, and the same promise: it never raises —
-- a handle that is not the sample's, or that another profile holds, is simply
-- not given. `security definer` with `set search_path = ''` for the same
-- reason as `handle_new_user()`: no API role may write `profiles.handle`.
create or replace function public.handle_user_app_meta_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_handle text := nullif(btrim(coalesce(new.raw_app_meta_data ->> 'handle', '')), '');
begin
  if meta_handle is not null
     and (meta_handle = 'a-quanly'
          or exists (select 1 from public.seed_customers c where c.handle = meta_handle))
     and not exists (select 1 from public.profiles p where p.handle = meta_handle) then
    update public.profiles set handle = meta_handle where id = new.id and handle is null;
  end if;
  return new;
end;
$$;

-- No grant to restate: a function that returns `trigger` cannot be called
-- through the API, as `handle_new_user()` and `handle_user_email_change()`
-- before it.
create trigger on_auth_user_app_meta_changed
  after update of raw_app_meta_data on auth.users
  for each row
  when ((new.raw_app_meta_data ->> 'handle') is distinct from (old.raw_app_meta_data ->> 'handle'))
  execute function public.handle_user_app_meta_change();

-- ─────────────────────────── the names that arrived too long, cut once
-- Same cut as the trigger's. `profiles.name` keeps `length(trim(name)) > 0`:
-- a name that passed it starts with something that is not a space, and the
-- cut keeps that character.
update public.profiles
   set name = btrim(left(btrim(name), 60))
 where char_length(name) > 60;
