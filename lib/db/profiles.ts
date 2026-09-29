import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import type { Me } from "@/lib/me";
import { keepFailureOf, type Written } from "@/lib/my-state";
import { toMe } from "./account-dto";
import { toProfileAnswer } from "./my-state-dto";
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

/**
 * Hồ sơ's "Lưu" (slice B9): the signed-in account's name and phone, and
 * nothing else — `update_my_profile()` is the only way a shopper changes
 * their row since the direct update was closed
 * (`20260929120000_account_state.sql`), so the e-mail and the handle cannot
 * move through here or around it.
 *
 * `name` arrives trimmed and `phone` as its ten digits
 * (`lib/my-state.ts#profilePhone`); the function checks both again. Answers
 * with what was stored.
 */
export async function updateMyProfile(
  name: string,
  phone: string,
): Promise<Written<{ name: string; phone: string }>> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("update_my_profile", { p_name: name, p_phone: phone });
  if (error) {
    const failure = keepFailureOf(error);
    if (failure === "UNAVAILABLE") console.error("update_my_profile:", error.message);
    return { ok: false, failure };
  }
  try {
    return { ok: true, value: toProfileAnswer(data) };
  } catch (e) {
    console.error("update_my_profile:", e instanceof Error ? e.message : e);
    return { ok: false, failure: "UNAVAILABLE" };
  }
}
