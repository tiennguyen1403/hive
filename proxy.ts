import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/db/server";
import {
  chooseLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_OPTIONS,
  LOCALE_PARAM,
  parseLocale,
  withoutParam,
} from "@/lib/i18n";
import { PATH_HEADER } from "@/lib/request-path";

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
 *
 * ONE thing more since slice B3b, and it is not a decision either: the path
 * the visitor asked for travels upstream as the request header `x-pathname`
 * (`lib/request-path.ts`), because a layout is not handed its
 * page's address and the admin layout's sign-in detour has to come back to
 * the page that was asked for. The documented way to pass a value from the
 * proxy to the render is a request header set through
 * `NextResponse.next({ request: { headers } })` — NOT `NextResponse.next({
 * headers })`, which would send it to the browser instead
 * (`03-api-reference/03-file-conventions/proxy.md`, "Setting Headers"). The
 * headers are copied again after a cookie refresh, so the refreshed cookies
 * travel with it. `set` overwrites whatever a client sent under that name.
 *
 * AND THE LANGUAGE, since round v6 slice E0 (QĐ-40). Two cases, neither a
 * decision about who may see what:
 *
 * · `?lang=vi` or `?lang=en` on a GET (or HEAD) writes the `hive-lang` cookie
 *   and redirects, 307, to the same address without `lang` — every other
 *   parameter kept as written (`withoutParam`), since filters and pages live
 *   in the address (QĐ-8). An unknown value is dropped from the address and
 *   writes nothing. This returns BEFORE the Supabase client exists: a
 *   redirect renders nothing, the request it leads to refreshes the session,
 *   and nothing ever stands between the client and `getClaims()`.
 * · A request with no valid cookie whose `Accept-Language` decides the
 *   language (`chooseLocale`): the cookie goes onto the REQUEST before the
 *   first `forward()` — so this very render, and the response `setAll` may
 *   rebuild, read it — and onto the RESPONSE once `getClaims()` is done, since
 *   `setAll` replaces the response object and would drop it if it were set
 *   earlier. No header, no cookie: the render falls back to Vietnamese and
 *   nothing is written, so a link preview's bot gets the Vietnamese page.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  if ((request.method === "GET" || request.method === "HEAD") && searchParams.has(LOCALE_PARAM)) {
    // The rest of the query is kept as the proxy is handed it. Next has already re-serialised it by then (measured
    // 01/10: `?q=a%20b&z=c%2Bd` reaches `nextUrl.search` as `?q=a+b&z=c%2Bd`), so a space may come back as `+`, which
    // reads as the same space; every value stays what it was.
    const target = new URL(
      request.nextUrl.pathname + withoutParam(request.nextUrl.search, LOCALE_PARAM),
      request.nextUrl.origin,
    );
    const redirect = NextResponse.redirect(target, 307);
    const forced = parseLocale(searchParams.get(LOCALE_PARAM));
    if (forced) redirect.cookies.set(LOCALE_COOKIE, forced, LOCALE_COOKIE_OPTIONS);
    return redirect;
  }

  const language = chooseLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });
  const firstVisit = language.from === "header" ? language.locale : null;
  if (firstVisit) request.cookies.set(LOCALE_COOKIE, firstVisit);

  const asked = request.nextUrl.pathname + request.nextUrl.search;
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set(PATH_HEADER, asked);
    return NextResponse.next({ request: { headers } });
  };

  let response = forward();

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
        response = forward();
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Nothing between the client above and this line — see the note about
  // single-use refresh tokens.
  await supabase.auth.getClaims();

  if (firstVisit) response.cookies.set(LOCALE_COOKIE, firstVisit, LOCALE_COOKIE_OPTIONS);
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
   *
   * Since slice B5 the metadata routes are left out too — the share images,
   * the manifest and the icons (`opengraph-image`, `twitter-image`,
   * `manifest.webmanifest`, `icon`, `apple-icon`, `favicon.ico`): a crawler or
   * a browser fetches them with no session to refresh, and the Next guide's
   * own negative matcher leaves its metadata files out the same way
   * (`03-api-reference/03-file-conventions/proxy.md`, "Negative matching").
   * `lib/proxy-matcher.test.ts` pins which paths still pass through.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/wards|opengraph-image|twitter-image|manifest.webmanifest|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
