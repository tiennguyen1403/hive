"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { CUSTOMERS } from "@/data/customers";
import { takeRate } from "@/lib/db/rate-limit";
import { getSupabase, supabaseEnv } from "@/lib/db/server";
import { getSession } from "@/lib/db/session";
import { DEMO_ACCOUNT_PASSWORD_LOCKED, isDemoEmail } from "@/lib/demo-accounts";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { PASSWORD_WRONG, passwordSheetErrors } from "@/lib/feed-me";
import { EMAIL_TAKEN, SIGN_IN_WRONG, signErrors } from "@/lib/feed-sign-in";
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
 * the form ran (`lib/feed-sign-in.ts` for signing in and up since round v4
 * slice 3a, `lib/feed-me.ts` for a new password since slice 3b), and asks who
 * is signed in for itself.
 *
 * The browser never talks to Supabase (QĐ-25): the client is built here, on
 * the server, and the only thing that crosses back is an `ActionState`.
 *
 * SLICE B4B, the public demo's guards:
 *
 *   · every call that reaches Supabase Auth with a password first spends a
 *     token of the visitor's own rate limit (`lib/db/rate-limit.ts`): ten
 *     sign-ins per five minutes across the three sign-in buttons, three
 *     sign-ups an hour, five password changes per ten minutes. The token goes
 *     immediately before the Auth call, so a form the rules refuse costs
 *     nothing. Supabase Auth's own limit is per IP address too, and every
 *     call here comes from this server's address — one visitor hammering the
 *     form would otherwise use it up for everybody;
 *   · the nine shared accounts never change password (`lib/demo-accounts.ts`).
 */

/**
 * ONE sentence for a refused sign-in, whichever of the two was wrong (QĐ-15):
 * "Không có tài khoản với email này" and "sai mật khẩu" are two answers, and
 * the difference between them is a way to find out which addresses are
 * registered. The words are the Feed mock's (round v4 slice 3a), shown above
 * the form (`lib/feed-sign-in.ts`).
 */
const SIGN_IN_FAILED = SIGN_IN_WRONG;

/**
 * A sign-up the auth server refused for a reason other than a taken address,
 * or that came back without a session. The app's own words, kept (the mock
 * draws no such state).
 */
const SIGN_UP_FAILED = "Không tạo được tài khoản với email này.";

const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

/** The mock's field errors, as an `ActionState` — or nothing when every field passes. */
function fieldErrors(errors: Record<string, string | undefined>): ActionState | null {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(errors)) if (message) out[key] = message;
  return Object.keys(out).length > 0 ? { errors: out } : null;
}

// ──────────────────────────────────────────────────────────────── sign in
export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = field(form, "email").trim().toLowerCase();
  const password = field(form, "password");
  const next = safeNext(field(form, "next"));

  // The form checks itself before it sends (`signErrors`); a request that did
  // not gets the same answers here.
  const wrong = fieldErrors(signErrors("in", { email, password }));
  if (wrong) return wrong;

  const pace = await takeRate("sign_in");
  if (!pace.ok) return { errors: { form: pace.message } };

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

  const pace = await takeRate("sign_in");
  if (!pace.ok) return { errors: { form: pace.message } };

  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: CUSTOMERS[0]!.email,
    password,
  });
  if (error) return { errors: { form: SIGN_IN_FAILED } };

  redirect(safeNext(field(form, "next")));
}

/**
 * "Vào quản trị thử": the published back-office account, in one press (slice
 * B3a).
 *
 * The same reasoning as `demoSignIn`: the sign-in screen prints this email and
 * the password, so the button is a shortcut past typing them, not a back door
 * — what makes the account a manager is `app_metadata.role`, which only the
 * service role can write (`scripts/seed-users.ts`). It lands on the back
 * office, or on the admin page that sent the visitor here.
 */
export async function demoAdminSignIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return { errors: { form: SIGN_IN_FAILED } };

  const pace = await takeRate("sign_in");
  if (!pace.ok) return { errors: { form: pace.message } };

  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_ADMIN.email, password });
  if (error) return { errors: { form: SIGN_IN_FAILED } };

  const next = safeNext(field(form, "next"), "/admin");
  redirect(next === "/admin" || next.startsWith("/admin/") ? next : "/admin");
}

// ──────────────────────────────────────────────────────────────── sign up
/**
 * "Tạo tài khoản" (round v4 slice 3a): a name, an email, a password — the
 * Feed mock's form, checked by the mock's rules (`signErrors("up")`): a name
 * of two characters, an address of the usual shape, a password of eight. The
 * v3 rule "có cả chữ và số" is gone, as the mock asks for the length alone;
 * Supabase Auth still refuses anything under eight
 * (`supabase/config.toml`, `minimum_password_length`). The v3 form's "báo khi
 * mở Số mới" box is gone with its screen, so nothing else is read.
 *
 * An address that already has an account is SAID, under its field — "Email
 * này đã có tài khoản", the mock's words — where QĐ-15 used to keep it quiet
 * (a conflict with the old rule, reported for the user to confirm). With
 * confirmations off, GoTrue refuses it as `user_already_exists` (measured on
 * the local stack, 29/09/2026); with them on it would answer a user without
 * identities, which reads the same here.
 *
 * Signed up, the shopper lands where they were headed (`next`), as after
 * signing in.
 */
export async function signUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  const name = field(form, "name").trim();
  const email = field(form, "email").trim().toLowerCase();
  const password = field(form, "password");
  const next = safeNext(field(form, "next"));

  const wrong = fieldErrors(signErrors("up", { name, email, password }));
  if (wrong) return wrong;

  const pace = await takeRate("sign_up");
  if (!pace.ok) return { errors: { form: pace.message } };

  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the `handle_new_user()` trigger, which writes `public.profiles`.
    // No handle: a real sign-up is not one of the eight demo accounts.
    options: { data: { name, phone: "" } },
  });

  const taken =
    error?.code === "user_already_exists" ||
    (!error && data.user !== null && Array.isArray(data.user.identities) && data.user.identities.length === 0);
  if (taken) return { errors: { email: EMAIL_TAKEN } };

  // Confirmations are off, so a successful sign-up comes back with a session.
  if (error || !data.session) return { errors: { form: SIGN_UP_FAILED } };

  redirect(next);
}

// ─────────────────────────────────────────────────────────────── sign out
/**
 * "Đăng xuất". A form may say where to land in a hidden `next` field — the
 * Feed's account pages send `/account`, where the mock's `signOut()` lands
 * (round v4 slice 3b: Tôi, signed out, with its way back in). Without one it
 * lands on the home page, as before: the back office's bar and the v3 rail
 * send none. Only a path of this app's own (`safeNext`).
 */
export async function signOut(form?: FormData): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect(safeNext(form ? field(form, "next") : "", "/"));
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

/**
 * "Đổi mật khẩu", Hồ sơ's sheet since round v4 slice 3b: the mock's three
 * fields (`current`, `next`, `again`) and its rules and words
 * (`lib/feed-me.ts#passwordSheetErrors`) — a new password of eight
 * characters, typed twice. The v3 rules "có cả chữ và số" (the user accepted
 * the eight-character rule on 29/09) and "khác mật khẩu cũ" (the mock does
 * not ask it; a conflict with the old rule, reported) are gone. Supabase Auth
 * still refuses anything under eight (`minimum_password_length`).
 *
 * What is about one field says so under it (the current password the auth
 * server refused); what is about the whole account says so above the fields
 * (`form`): a shared demo account's lock (B4b), the rate limit, a server that
 * would not change it.
 */
export async function changePassword(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const draft = {
    current: field(form, "current"),
    next: field(form, "next"),
    again: field(form, "again"),
  };

  const wrong = fieldErrors(passwordSheetErrors(draft));
  if (wrong) return wrong;

  const session = await getSession();
  if (!session) redirect("/sign-in?next=%2Faccount%2Fprofile");

  // Slice B4b: a shared demo account's password is printed on the sign-in
  // screen and has to keep opening it for the next visitor. Refused before
  // the current password is even tried, so no Auth call is made for it.
  if (isDemoEmail(session.email)) {
    return { errors: { form: DEMO_ACCOUNT_PASSWORD_LOCKED } };
  }

  const pace = await takeRate("password");
  if (!pace.ok) return { errors: { form: pace.message } };

  if (!(await passwordIsCurrent(session.email, draft.current))) {
    return { errors: { current: PASSWORD_WRONG } };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.auth.updateUser({ password: draft.next });
  if (error) {
    return { errors: { form: "Chưa đổi được mật khẩu. Thử lại sau ít phút." } };
  }

  return { errors: {}, ok: true };
}
