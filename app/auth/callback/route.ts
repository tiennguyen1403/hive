import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { callbackPlan } from "@/lib/auth-redirect";
import { getSupabase } from "@/lib/db/server";

/**
 * The end of "Tiếp tục với Google" (slice B16, QĐ-41): Supabase Auth sends the
 * visitor here once Google has answered, with `?code=…` and the `next` the
 * Server Action put in `redirectTo` (`lib/actions/auth.ts#googleSignIn`).
 *
 * The code is traded for a session on the SERVER, with the PKCE verifier the
 * action left in a cookie — so a code that leaks out of the address bar is
 * worth nothing without the browser that started the round trip
 * (https://supabase.com/docs/guides/auth/social-login/auth-google, the
 * `app/auth/callback/route.ts` of the server-side flow). The trade writes the
 * session cookies through `getSupabase()`'s cookie methods, and Next adds
 * every cookie set with `cookies()` to the redirect it answers with
 * (`node_modules/next/dist/server/route-modules/app-route/module.js`,
 * `appendMutableCookies` on both the returned and the thrown-redirect path).
 *
 * What it decides is `callbackPlan` (`lib/auth-redirect.ts`): signed in → the
 * path the shopper was headed for, or `/` when `next` is anything but a path
 * of this app; Google's "Huỷ", a missing code, a trade Supabase refuses (an
 * expired code, a verifier left in another browser) → back to "Đăng nhập"
 * with `?error=google`, `next` kept. Without a verifier cookie the trade does
 * not even leave the server: auth-js answers "code verifier missing" first.
 *
 * GET only, and dynamic by nature — it reads the request's address and writes
 * cookies (`node_modules/next/dist/docs/01-app/01-getting-started/
 * 15-route-handlers.md`: "Route Handlers are not cached by default"). `redirect`
 * answers 307 with a relative `Location`, the path `callbackPlan` already
 * checked (`03-api-reference/04-functions/redirect.md`, `route.md` "Redirects").
 * `proxy.ts` passes the address through untouched: it carries no `lang`, and
 * the session refresh before it finds no session to refresh.
 */
export async function GET(request: NextRequest): Promise<never> {
  const plan = callbackPlan(request.nextUrl.searchParams);
  if (plan.kind === "fail") {
    const said = request.nextUrl.searchParams.get("error_code") ?? request.nextUrl.searchParams.get("error");
    if (said) console.error("auth callback: Supabase sent back", said.slice(0, 80));
    redirect(plan.failed);
  }

  const supabase = await getSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(plan.code);
  if (error) {
    console.error("auth callback: the code was not traded for a session:", error.code ?? error.message);
    redirect(plan.failed);
  }

  redirect(plan.next);
}
