import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getSupabase } from "./server";

/**
 * Who is asking, decided on the server, once per request.
 *
 * This is the `verifySession()` of the Next guide
 * (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`, "Creating
 * a Data Access Layer"): one place that answers "is there a session, and
 * whose", wrapped in `React.cache` so a layout, a page and three actions in
 * the same render do not each ask the auth server.
 *
 * `getClaims()` and never `getSession()`. Supabase is explicit about the
 * difference: "Never trust `supabase.auth.getSession()` inside server code
 * such as Proxy. It reads the session out of the cookie without revalidating
 * it", while `getClaims()` verifies the token's signature on every call
 * (https://supabase.com/docs/guides/auth/server-side/nextjs). A cookie is
 * something the browser can write.
 */
export interface SessionInfo {
  /** `auth.users.id`, the primary key `profiles` and `addresses` hang off. */
  userId: string;
  /** The auth email, which is what a re-authentication has to sign in with. */
  email: string;
  /**
   * Slice B3a: `app_metadata.role` from the verified token — "admin" for the
   * shop's manager, "customer" for everybody else. `app_metadata` is written
   * only with the service role ("raw_app_meta_data — cannot be updated by the
   * user, so it's a good place to store authorization data",
   * https://supabase.com/docs/guides/database/postgres/row-level-security),
   * and Postgres reads the very same claim in `public.is_admin()`, so the app
   * and the database cannot disagree about who is one.
   */
  role: "admin" | "customer";
}

export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const supabase = await getSupabase();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;

  const { sub, email, app_metadata } = data.claims;
  if (typeof sub !== "string" || sub === "") return null;

  return {
    userId: sub,
    email: typeof email === "string" ? email : "",
    role: app_metadata?.role === "admin" ? "admin" : "customer",
  };
});

/**
 * The same question, for a screen that has no answer without one.
 *
 * The detour carries where to come back to, so signing in lands on the page
 * that asked rather than on the account overview. `redirect` throws a
 * framework-handled control-flow exception, so nothing after it runs — which
 * is why the return type can promise a session
 * (`03-api-reference/04-functions/redirect.md`).
 */
export async function requireSession(nextPath: string): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  return session;
}

/**
 * The back office's door, asked by the admin layout, by EVERY admin page and
 * by EVERY admin Server Action — the Next guide is explicit that a layout is
 * not a boundary ("Due to Partial Rendering, be cautious when doing checks in
 * Layouts as these don't re-render on navigation") and that "a page-level
 * authentication check does not extend to the Server Actions defined within
 * it" (`02-guides/authentication.md`, `02-guides/data-security.md`). The
 * `admin_*` functions in Postgres ask a fourth time.
 *
 * Nobody signed in: off to sign in, and back here afterwards. Signed in but
 * not the manager: 404 — the back office is not a place a shopper is told
 * exists (QĐ-16, applied to the admin area). Both `redirect` and `notFound`
 * throw, so the return type can promise an admin session.
 */
export async function requireAdmin(nextPath: string): Promise<SessionInfo> {
  const session = await requireSession(nextPath);
  if (session.role !== "admin") notFound();
  return session;
}
