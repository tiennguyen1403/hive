-- ───────────────────────────────────── the accounts that are not the sample's
--
-- Slice B17 (QĐ-45): the daily reset deletes every account that is not part
-- of the sample, with all of its data. Until now `reset_demo()` emptied the
-- orders and the log every evening and kept every account — an address, the
-- sizes, the saved styles and the reminders of whoever signed up stayed for
-- good, and the app has no way to delete an account (QĐ-45, the inventory of
-- 06/10). From this slice nobody's own account outlives the day: whoever signs
-- in again (with Google, from slice B16) simply gets a new one.
--
-- The deletion itself goes through Supabase Auth's admin API
-- (`auth.admin.deleteUser`, `lib/db/demo-accounts.ts#deleteRealAccounts`),
-- called by the cron (`app/api/reset/route.ts`) after `reset_demo()`.
-- Deleting the user removes its `auth.users` row; every table of this app
-- that holds an account's data hangs off `public.profiles`, which cascades
-- from it — `addresses`, `favorites`, `reminders`, `account_settings`,
-- `removed_addresses` (`on delete cascade`), and `orders.profile_id` is set
-- null (the orders themselves are already gone with the reset).
--
-- This file adds the one thing the API does not: WHICH accounts. An account
-- belongs to the sample when its profile carries a handle — the eight demo
-- shoppers' `c-…` and the manager's `a-quanly`, given when
-- `scripts/seed-users.ts` creates them (the shoppers' put back by every
-- `reset_demo()`), and nobody can write one through the API (`profiles` has no
-- update policy or grant since `20260929120000_account_state.sql`). The app checks
-- every row against the nine fixed demo e-mails as well
-- (`lib/demo-accounts.ts#accountsToDelete`) and never deletes one of them.
--
-- `security definer`, because the service role may not read `auth.users`
-- (measured on the local stack: `has_table_privilege('service_role',
-- 'auth.users', 'select')` is false), and it is the only role allowed to call
-- it: the list names every real account, and only the cron that deletes them
-- has any business reading it. Through a function rather than a read of
-- `profiles` with the secret key, because `lib/db/service.ts` promises its
-- client never touches a table directly.
--
-- Sources: https://supabase.com/docs/guides/database/functions (`security
-- definer` with `set search_path = ''`; revoking execute from public, anon
-- and authenticated), https://supabase.com/docs/guides/auth/managing-user-data
-- ("Deleting users": the admin API "removes the row from `auth.users`"),
-- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser,
-- https://www.postgresql.org/docs/current/sql-createfunction.html (`stable`,
-- `returns table`).

create or replace function public.real_accounts()
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  -- No profile at all reads as no handle: an account the screens do not know
  -- is not one of the sample's either.
  select u.id, coalesce(u.email, '')
    from auth.users u
    left join public.profiles p on p.id = u.id
   where p.handle is null
   order by u.created_at, u.id;
$$;

revoke execute on function public.real_accounts() from public, anon, authenticated;
grant  execute on function public.real_accounts() to service_role;
