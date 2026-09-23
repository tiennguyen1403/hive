import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import type { Me } from "@/lib/me";
import { toMe } from "./account-dto";
import { getSupabase } from "./server";
import { getSession } from "./session";

/**
 * The signed-in account's own row, or nothing.
 *
 * The `eq(id, …)` is belt AND braces: the `profiles: read own` policy already
 * means this select can only ever see one row, and the filter says so at the
 * call site too. Row level security is the thing that enforces it; a reader of
 * this file should not have to go and check.
 *
 * Cached for the request (`React.cache`) because the root layout, the account
 * layout and several screens all want the same name in the same render.
 */
export const loadMe = cache(async (): Promise<Me | null> => {
  const session = await getSession();
  if (!session) return null;

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, name, email, phone, joined_at")
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !data) return null;
  return toMe(data);
});

/**
 * The same, for a screen that cannot render without one.
 *
 * A session with no profile row behind it is not a signed-in visitor as far
 * as the account screens are concerned, so it takes the same detour — and the
 * detour keeps the path, so signing in comes back here.
 */
export async function requireMe(nextPath: string): Promise<Me> {
  const me = await loadMe();
  if (!me) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  return me;
}
