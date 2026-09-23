import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/db/server";

/**
 * Keeping the session alive, and nothing else.
 *
 * `proxy.ts` is what Next 16 renamed `middleware.ts` to; it runs on the
 * Node.js runtime and the `runtime` segment option is not available here
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`:
 * "Proxy defaults to using the Node.js runtime … Setting the `runtime` config
 * option in Proxy will throw an error").
 *
 * It does ONE thing: rebuild the Supabase session cookie so an access token
 * that expired between two page views is refreshed before the page renders.
 * Supabase's own note is blunt about why the call cannot be skipped — "IMPORTANT:
 * If you remove getClaims() and you use server-side rendering with the Supabase
 * client, your users may be randomly logged out"
 * (https://supabase.com/docs/guides/auth/server-side/nextjs) — and about why
 * nothing may sit between the client and that call: a refresh token is
 * single-use, so an early return in the middle leaves the browser holding a
 * token the server has already spent.
 *
 * It does NOT decide who may see what. Proxy runs on every route including
 * prefetches, so the Next guide is explicit that a check here is an OPTIMISTIC
 * one and "should not be your only line of defense … The majority of security
 * checks should be performed as close as possible to your data source"
 * (`02-guides/authentication.md`). This project therefore does not redirect
 * here at all: every `/account/*` page asks `requireMe()` itself, every Server
 * Action asks `requireSession()` itself, and row level security asks a third
 * time in Postgres. A redirect in the proxy would add a fourth answer that
 * could disagree with the other three.
 *
 * The cookie dance below is the documented one, kept verbatim in shape: write
 * the refreshed cookies onto BOTH the request (so the render that follows sees
 * them) and the response (so the browser stores them), and return that exact
 * response object.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Nothing between the client above and this line — see the note about
  // single-use refresh tokens.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  /**
   * Everything a person navigates to, and nothing a machine fetches.
   *
   * Without a matcher the proxy runs on static files and optimised images too,
   * which would put an auth round trip in front of every CSS file. `/api/wards`
   * is excluded for the same reason: it is the commune list the address forms
   * page in, it carries no session, and it is requested once per province.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/wards|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
