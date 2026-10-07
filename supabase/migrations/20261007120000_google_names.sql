-- ───────────────────────────────────── the name of an account made with Google
--
-- Slice B16 (QĐ-41): "Tiếp tục với Google". A Google sign-in creates its
-- `auth.users` row through Supabase Auth, and the `on_auth_user_created`
-- trigger writes its `public.profiles` row like any other — from
-- `raw_user_meta_data`, which for an OAuth sign-in Supabase fills from what
-- the provider said about the person.
--
-- Which key carries the name was NOT measured before this file: there is no
-- Google key on the local stack yet, and the brief of B16 names two
-- candidates, `name` and `full_name`. The version of `handle_new_user()` in
-- `20260923124500_accounts.sql` read `name` alone, so a provider that sent
-- only `full_name` would have named every Google shopper after the part of
-- the address before the @. This version reads `name`, then
-- `full_name`, then that local part — and only then the word 'Khách', which
-- the old one listed too but could never reach (`split_part` answers '' rather
-- than null, and '' broke the `length(trim(name)) > 0` check instead).
--
-- Everything else is exactly as before: `phone` only when it is ten digits
-- starting with zero, `handle` as the metadata gives it (only
-- `scripts/seed-users.ts` gives one), and the rule this trigger is built
-- around — it must never raise, because a trigger that raises makes the
-- INSERT into auth.users fail and the visitor reads "sign-up is broken". Each
-- candidate is trimmed and emptied to null before it is taken, so a name of
-- spaces falls through to the next one rather than into the check.
--
-- The avatar Google sends (`picture`, `avatar_url`) is not read: the shop
-- shows initials for every account and loads nothing from another host.
--
-- `create or replace` keeps the trigger pointing at it and the function's
-- owner and grants as they were.
--
-- Sources: https://supabase.com/docs/guides/auth/managing-user-data (a
-- `security definer` trigger on `auth.users`, `set search_path = ''`),
-- https://www.postgresql.org/docs/current/functions-string.html (`split_part`,
-- `btrim`), https://www.postgresql.org/docs/current/functions-conditional.html
-- (`coalesce`, `nullif`).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_name   text := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  );
  local_part  text := nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), '');
  meta_phone  text := coalesce(new.raw_user_meta_data ->> 'phone', '');
  meta_handle text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'handle', '')), '');
begin
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
