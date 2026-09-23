import "server-only";

import { redirect } from "next/navigation";
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
}

export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const supabase = await getSupabase();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;

  const { sub, email } = data.claims;
  if (typeof sub !== "string" || sub === "") return null;

  return { userId: sub, email: typeof email === "string" ? email : "" };
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
