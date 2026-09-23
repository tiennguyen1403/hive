/**
 * The published back-office account (slice B3a).
 *
 * This is a public portfolio demo: the sign-in screen prints this email and
 * the demo password, and "Vào quản trị thử" signs in with them in one press —
 * a back office nobody can open is a back office nobody can look at. The
 * password is NOT here: it comes from `DEMO_PASSWORD` in the environment, the
 * same one the eight demo shoppers share, because a password in a committed
 * file is a habit worth not forming even when the password is public.
 *
 * WHAT MAKES IT AN ADMIN is not anything in this file. `scripts/seed-users.ts`
 * creates the user with `app_metadata: { role: "admin" }`, which only the
 * service role can write and which rides in every access token; Postgres reads
 * it back with `public.is_admin()`. Knowing this email grants nothing.
 *
 * `handle` is the profile's handle, like the demo shoppers' `c-…` ones, so the
 * account is recognisable in `public.profiles` — the back office's customer
 * list leaves it out (`lib/admin-customers.ts`): the shop's own manager is not
 * one of its customers.
 */
export const DEMO_ADMIN = {
  email: "quanly@email.com",
  /** Shown as-is, in the back office's sidebar. */
  name: "Quản lý cửa hàng",
  handle: "a-quanly",
} as const;
