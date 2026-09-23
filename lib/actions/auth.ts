"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { CUSTOMERS } from "@/data/customers";
import { validateChangePassword, validateSignUp, type SignUpDraft } from "@/lib/account-form";
import { getSupabase, supabaseEnv } from "@/lib/db/server";
import { getSession } from "@/lib/db/session";
import { safeNext, type ActionState } from "./state";

/**
 * Signing in, signing up, signing out, changing a password.
 *
 * Every one of these is a PUBLIC ENDPOINT. Next says so in as many words —
 * "Server Functions are reachable via direct POST requests, not just through
 * your application's UI. Always verify authentication and authorization inside
 * every Server Function"
 * (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`)
 * — so nothing here trusts a hidden field, a disabled button or a validator
 * that ran in the browser. Each action re-reads the form, re-runs the rules
 * from `lib/account-form.ts`, and asks who is signed in for itself.
 *
 * The browser never talks to Supabase (QĐ-25): the client is built here, on
 * the server, and the only thing that crosses back is an `ActionState`.
 */

/**
 * ONE sentence, whatever went wrong (QĐ-15).
 *
 * "Không có tài khoản với email này" and "sai mật khẩu" are two answers, and
 * the difference between them is a way to find out which addresses are
 * registered. The v2 screen was allowed to name the field because every
 * account was a published fixture; there is a real user table now.
 */
const SIGN_IN_FAILED = "Email hoặc mật khẩu chưa đúng.";

/** Same reasoning on the way in: never confirm that an address is taken. */
const SIGN_UP_FAILED = "Không tạo được tài khoản với email này.";

const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

// ──────────────────────────────────────────────────────────────── sign in
export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = field(form, "email").trim().toLowerCase();
  const password = field(form, "password");
  const next = safeNext(field(form, "next"));

  if (!email || !password) return { errors: { form: SIGN_IN_FAILED } };

  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { errors: { form: SIGN_IN_FAILED } };

  // `redirect` throws a framework-handled control-flow exception, so nothing
  // below it runs (`03-api-reference/04-functions/redirect.md`).
  redirect(next);
}

/**
 * The published demo account, in one press.
 *
 * This is a portfolio demo whose sign-in screen prints the credentials, so
 * the button is a shortcut past typing them rather than a back door: it signs
 * in with exactly the email and password shown above it. The password comes
 * from the environment and not from a committed file, even though it is
 * public — a password in a repository is a habit, not a secret.
 */
export async function demoSignIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return { errors: { form: SIGN_IN_FAILED } };

  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: CUSTOMERS[0]!.email,
    password,
  });
  if (error) return { errors: { form: SIGN_IN_FAILED } };

  redirect(safeNext(field(form, "next")));
}

// ──────────────────────────────────────────────────────────────── sign up
export async function signUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  const draft: SignUpDraft = {
    name: field(form, "name"),
    email: field(form, "email"),
    // The v3 form does not ask for one — "Số điện thoại lấy từ đơn đầu tiên"
    // — so the rule that wants a number cannot block this submit. The screen
    // drops the same key for the same reason.
    phone: "",
    password: field(form, "password"),
    wantsDropAlerts: field(form, "wantsDropAlerts") === "on",
    // Nothing to agree to yet: there is no terms page in this build and the
    // approved form shows no checkbox for one.
    agreed: true,
  };

  const errors: Record<string, string> = {};
  const found = validateSignUp(draft);
  for (const [key, message] of Object.entries(found)) {
    if (key !== "phone" && message) errors[key] = message;
  }
  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: draft.email.trim().toLowerCase(),
    password: draft.password,
    // Read by the `handle_new_user()` trigger, which writes `public.profiles`.
    // No handle: a real sign-up is not one of the eight demo accounts.
    options: { data: { name: draft.name.trim(), phone: "" } },
  });

  // Confirmations are off, so a successful sign-up comes back with a session.
  // No session means either a real failure or an address that already exists —
  // Supabase answers the second case with a user carrying no identities rather
  // than with an error, precisely so the caller cannot tell them apart. Nor
  // does this.
  if (error || !data.session) return { errors: { form: SIGN_UP_FAILED } };

  redirect("/account");
}

// ─────────────────────────────────────────────────────────────── sign out
export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

// ────────────────────────────────────────────────────────── change password
/**
 * Check a password by signing in with it, on a client that keeps nothing.
 *
 * WHY NOT `updateUser({ password, current_password })`: it is in the
 * JavaScript reference, and on this stack it does nothing. `current_password`
 * is only honoured when GoTrue runs with
 * `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD` on (the auth-js
 * type says so on the field itself), and the Supabase CLI config exposes no
 * key for it — the one related switch it does expose,
 * `[auth.email] secure_password_change`, sets
 * `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION`, which is the
 * email-nonce flow and needs an SMTP server this project does not have.
 * Measured on the local stack on 23/09/2026: with the default configuration,
 * `updateUser({ password, current_password: <wrong> })` returned no error and
 * changed the password. So the check is made here, where it cannot be
 * skipped.
 *
 * A throwaway client, NOT the request's own: `signInWithPassword` on the
 * cookie-bound client would swap the visitor's session cookie out mid-form for
 * no reason. This one persists nothing, and the extra session it opens is left
 * to expire rather than revoked — `signOut()` defaults to revoking EVERY
 * session the user has, which would log them out of the page they are standing
 * on.
 */
async function passwordIsCurrent(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;

  const { url, publishableKey } = supabaseEnv();
  const probe = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}

export async function changePassword(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const draft = {
    current: field(form, "current"),
    next: field(form, "next"),
    confirm: field(form, "confirm"),
  };

  const found = validateChangePassword(draft);
  const errors: Record<string, string> = {};
  for (const [key, message] of Object.entries(found)) if (message) errors[key] = message;
  if (Object.keys(errors).length > 0) return { errors };

  const session = await getSession();
  if (!session) redirect("/sign-in?next=%2Faccount%2Fpassword");

  if (!(await passwordIsCurrent(session.email, draft.current))) {
    return { errors: { current: "Mật khẩu hiện tại chưa đúng." } };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.auth.updateUser({ password: draft.next });
  if (error) {
    return { errors: { next: "Chưa đổi được mật khẩu. Thử lại sau ít phút." } };
  }

  return { errors: {}, ok: true };
}
