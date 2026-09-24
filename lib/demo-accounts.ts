import { CUSTOMERS } from "@/data/customers";
import { DEMO_ADMIN } from "./demo-admin";

/**
 * The nine SHARED accounts of the public demo (slice B4b).
 *
 * The sign-in screen prints their email and their password, "Đăng nhập thử"
 * and "Vào quản trị thử" sign in with them in one press — so a stranger who
 * changed one of those passwords would lock every later visitor out of the
 * button, until somebody fixed it by hand in the Supabase dashboard. Two
 * guards close that (brief B4b §2.1):
 *
 *   · `changePassword` refuses a session whose email is one of these, before
 *     it asks Supabase anything (`lib/actions/auth.ts`);
 *   · the daily reset (`/api/reset`) tries each of the nine with
 *     `DEMO_PASSWORD` and sets back the ones it no longer opens
 *     (`lib/db/demo-accounts.ts`, deciding with `demoPasswordState` below);
 *     `npm run seed:users` sets all nine back regardless
 *     (`scripts/seed-users.ts`).
 *
 * Nothing else about the accounts is fenced off: they order, cancel, keep
 * addresses and run the back office like anybody, and the reset puts that
 * back too.
 *
 * Read from the fixture and from `lib/demo-admin.ts`, never typed again here:
 * the account `seed:users` creates and the one this guards are the same list.
 */
export const DEMO_EMAILS: readonly string[] = [
  ...CUSTOMERS.map((c) => c.email),
  DEMO_ADMIN.email,
];

const KNOWN = new Set(DEMO_EMAILS.map((e) => e.toLowerCase()));

/**
 * Whether this is one of the nine — compared the way Supabase Auth stores an
 * email (lower case), after trimming. An empty address is nobody's.
 */
export function isDemoEmail(email: string): boolean {
  const key = email.trim().toLowerCase();
  return key !== "" && KNOWN.has(key);
}

/**
 * What one probe sign-in with `DEMO_PASSWORD` says about a shared account —
 * the daily reset's question (`restoreDemoPasswords`, `lib/db/demo-accounts.ts`):
 *
 *   · `ok`       it opened: nothing to set back;
 *   · `restore`  Auth answered `invalid_credentials` ("Login credentials or
 *                grant type not recognized"): the password is not the demo
 *                one any more — or the account is gone — so it is set back;
 *   · `unknown`  anything else — too many requests, a timeout, the network,
 *                an unconfirmed address — says nothing about the password, so
 *                nothing is touched.
 *
 * Only a password that really moved is set back, because setting one ends
 * every session of the account, the same password included (measured on the
 * local stack, 24/09/2026): setting all nine every evening would sign out
 * whoever happens to be using a demo account when the cron fires.
 *
 * By the error's CODE, never its message — "Always use `error.code` and
 * `error.name` to identify errors, not string matching on error messages"
 * (https://supabase.com/docs/guides/auth/debugging/error-codes). The code is
 * one of auth-js's own `ErrorCode` values, and a wrong password answers it
 * with status 400 (measured on GoTrue v2.197.0, the hosted project's version).
 * A request that never got an answer carries no code, and is `unknown`.
 */
export type DemoPasswordState = "ok" | "restore" | "unknown";

export function demoPasswordState(error: { code?: string | undefined } | null): DemoPasswordState {
  if (error === null) return "ok";
  return error.code === "invalid_credentials" ? "restore" : "unknown";
}

/**
 * What "Đổi mật khẩu" answers on a shared account (B4b §2.7), under "Mật khẩu
 * hiện tại": why not, and what to do instead.
 */
export const DEMO_ACCOUNT_PASSWORD_LOCKED =
  "Tài khoản thử dùng chung nên không đổi được mật khẩu. Tạo tài khoản riêng để thử việc này.";
