/**
 * The session cookie's flags (slice B16), for both places that build a
 * Supabase client with cookies: `getSupabase()` (`lib/db/server.ts`) and
 * `proxy.ts`. Pure, without `import "server-only"`, so a test can read it.
 *
 * `@supabase/ssr` writes `sb-<ref>-auth-token` with its defaults unless told
 * otherwise — `path: "/"`, `sameSite: "lax"`, `httpOnly: false`, 400 days
 * (`DEFAULT_COOKIE_OPTIONS`, `@supabase/ssr@0.12.7`) — and spreads
 * `cookieOptions` over them for every cookie it sets or clears: the session,
 * its chunks, the PKCE verifiers of a Google round trip
 * (`applyServerStorage`). The default leaves the cookie readable by script,
 * which this project has no use for: the browser never talks to Supabase
 * (QĐ-25), so no script of the page needs the token, and a cookie script can
 * read is a token a script injected into the page could carry off.
 *
 * · `httpOnly` always. Nothing of the page reads the cookie: the only cookie a
 *   component touches is `inbox_read` (`components/feed/inbox.tsx`).
 * · `secure` when the visitor came over https — the deployed demo, where
 *   Vercel says so in `x-forwarded-proto` — and not on a developer's
 *   `http://localhost:3200`, where a Secure cookie is not what the request
 *   asked for. Next fills the header itself off Vercel
 *   (`node_modules/next/dist/server/base-server.js`).
 *
 * `name` is deliberately absent: `@supabase/ssr` takes `cookieOptions.name` as
 * the storage key, and the default `sb-<ref>-auth-token` is the one every
 * existing session is stored under.
 *
 * Sources: `createServerClient`'s `cookieOptions?: CookieOptionsWithName` and
 * `applyServerStorage` in `node_modules/@supabase/ssr/dist/main/`
 * (`createServerClient.d.ts`, `cookies.js`); `node_modules/next/dist/docs/
 * 01-app/03-api-reference/04-functions/cookies.md` ("`httpOnly`: Restricts
 * the cookie to HTTP requests, preventing client-side access"; "`secure`:
 * Ensures the cookie is sent only over HTTPS connections").
 */
export interface SessionCookieOptions {
  httpOnly: true;
  secure: boolean;
}

/** The flags for a request whose `x-forwarded-proto` is `forwardedProto` (first value counts, as a proxy chain appends). */
export function sessionCookieOptions(forwardedProto: string | null | undefined): SessionCookieOptions {
  const proto = (forwardedProto ?? "").split(",")[0]!.trim().toLowerCase();
  return { httpOnly: true, secure: proto === "https" };
}
