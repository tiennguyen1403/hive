import { safeNext } from "./actions/state";
import { signHref } from "./feed-sign-in";

/**
 * Where "Tiếp tục với Google" leaves from and comes back to (slice B16, QĐ-41):
 * the parts with no I/O, so they can be tested without a request.
 *
 * The browser only ever NAVIGATES (QĐ-25, QĐ-41): the Server Action
 * `googleSignIn` (`lib/actions/auth.ts`) answers with a redirect to Supabase
 * Auth's `/auth/v1/authorize`, Supabase sends the visitor on to Google and
 * back to its own `/auth/v1/callback`, and that one redirects to this app's
 * `/auth/callback` (`app/auth/callback/route.ts`), where the server trades
 * the code for a session. The PKCE verifier that makes the code worthless to
 * anybody else rides in a cookie the action set.
 *
 * Sources: https://supabase.com/docs/guides/auth/social-login/auth-google
 * (the server-side flow: `signInWithOAuth` with `redirectTo`, then
 * `exchangeCodeForSession` in a route handler) and
 * https://supabase.com/docs/guides/auth/redirect-urls (the allow list that
 * `redirectTo` is checked against).
 */

/** The app's half of the round trip: the Route Handler that trades the code for a session. */
export const AUTH_CALLBACK_PATH = "/auth/callback";

/**
 * The flag `/sign-in` reads to print "Chưa đăng nhập được bằng Google." above
 * its form: `/sign-in?next=…&error=google`. One value, because the callback
 * says one thing whatever went wrong — a press on "Huỷ" at Google, a code
 * that would not trade, a verifier left in another browser.
 */
export const SIGN_IN_ERROR_PARAM = "error";
export const GOOGLE_ERROR = "google";

/**
 * A host as the `Host` header carries it: a name of letters, digits, dots and
 * hyphens, or a bracketed IPv6 address, and an optional port. Nothing that
 * could end the authority early (`/`, `?`, `#`, `@`, a space).
 */
const HOST = /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|\[[0-9a-f:.]+\])(?::\d{1,5})?$/i;

/**
 * The origin the visitor is on, from the request's forwarded host and proto —
 * so a Vercel preview URL comes back to itself rather than to the production
 * one, and a local `next start` to `http://localhost:3200` or
 * `http://127.0.0.1:3200`, whichever the browser typed (the PKCE cookie lives
 * on that host and no other).
 *
 * `x-forwarded-host` and `x-forwarded-proto` are always there: Vercel sets them,
 * and off Vercel Next's own server fills them from the `Host` header and the
 * socket when a request carries none
 * (`node_modules/next/dist/server/base-server.js`, `x-forwarded-host ??= host`,
 * `x-forwarded-proto ??= isHttps ? 'https' : 'http'`). The first value of each
 * counts, as a proxy chain appends. Anything that is not a plain host, or a
 * scheme other than http and https, is refused (`null`): the value goes into a
 * URL, and a request may carry whatever headers it likes. Supabase checks the
 * URL against its allow list again, so a host the project does not list is
 * sent to the Site URL instead (measured on the local stack, 07/10/2026).
 */
export function requestOrigin(get: (name: string) => string | null): string | null {
  const first = (name: string) => (get(name) ?? "").split(",")[0]!.trim();
  const host = first("x-forwarded-host") || first("host");
  const proto = first("x-forwarded-proto").toLowerCase();
  if (!HOST.test(host)) return null;
  if (proto !== "http" && proto !== "https") return null;
  return `${proto}://${host}`;
}

/** Supabase's `redirectTo`: this origin's callback, carrying where the shopper was headed. */
export function googleCallbackUrl(origin: string, next: string): string {
  return `${origin}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}`;
}

/** Back to "Đăng nhập", still headed where the shopper was, with the line that Google did not sign anybody in. */
export function googleFailedHref(next: string): string {
  const back = signHref("in", next);
  return `${back}${back.includes("?") ? "&" : "?"}${SIGN_IN_ERROR_PARAM}=${GOOGLE_ERROR}`;
}

/**
 * What `/auth/callback` does with the address Supabase sent the visitor to:
 *
 *   · a `code` and no `error` → trade it, then go to `next` (a path of this
 *     app's own by the one rule every redirect of the app follows, `safeNext`;
 *     `/` when it is anything else);
 *   · anything else — Google's "Huỷ" (`error=access_denied`, measured: Supabase
 *     passes `error`, `error_description` and the `next` it was given), a
 *     missing code — → back to "Đăng nhập" with the flag, `next` kept.
 *
 * `failed` is also where to go when the trade itself is refused.
 */
export type CallbackPlan =
  | { kind: "exchange"; code: string; next: string; failed: string }
  | { kind: "fail"; failed: string };

export function callbackPlan(params: URLSearchParams): CallbackPlan {
  const next = safeNext(params.get("next"), "/");
  const failed = googleFailedHref(next);
  const code = params.get("code");
  if (!code || params.has("error")) return { kind: "fail", failed };
  return { kind: "exchange", code, next, failed };
}
