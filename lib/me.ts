import type { CustomerId } from "@/data/types";

/**
 * Who is signed in — for real, since slice B1.
 *
 * This replaces `lib/session.ts`, which matched a typed email against the
 * fixture and remembered the answer in `localStorage`. There is an auth
 * server now: the session is a cookie `@supabase/ssr` writes, it is read on
 * the server, and this is the Data Transfer Object the screens get
 * (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`, "Using
 * Data Transfer Objects": hand the UI the fields it needs, not the row).
 *
 * It is deliberately NOT `Customer`. A `Customer` carries its addresses, and
 * those now live in their own table behind row level security — the address
 * screens ask for them, every other screen does not, and a DTO that dragged
 * nine rows along for a name in the corner of a navigation rail would be
 * paying for them on every route.
 */
export interface Me {
  /** The `auth.users` uuid. Primary key of `profiles` as well. */
  id: CustomerId;
  /**
   * The fixture id this demo account stands for — 'c-minhanh' — or null for
   * an account somebody created themselves.
   *
   * Since slice B2 the sample orders live in Postgres and reach the account
   * through `profile_id`; the handle is what `reset_demo()` matched them up
   * by. A real sign-up has no handle and no sample orders, which is the
   * honest answer: an account made a minute ago has not bought anything.
   */
  handle: CustomerId | null;
  /** Shown as-is. */
  name: string;
  email: string;
  /** Ten digits starting with zero, or "" when the account has not given one. */
  phone: string;
  joinedAt: string;
}
