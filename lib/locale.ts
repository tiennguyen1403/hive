import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale, type Locale } from "./i18n";

/**
 * The language of the request, for Server Components and Server Actions: the
 * `hive-lang` cookie, Vietnamese when there is none or it holds anything else.
 *
 * The cookie is already there on a first visit: when `proxy.ts` decides the
 * language from `Accept-Language`, it writes the cookie onto the request as
 * well as the response, so the very first render reads it here. A request
 * the proxy never sees, or one with no `Accept-Language` (QĐ-40), reads
 * Vietnamese.
 *
 * Inside a Server Action that has just set the cookie (`lib/actions/locale.ts`),
 * the re-render that answers the action reads the new value: "Next.js
 * re-renders the current page and its layouts on the server so the UI
 * reflects the new cookie value"
 * (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`,
 * "Cookies").
 */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return parseLocale(jar.get(LOCALE_COOKIE)?.value) ?? DEFAULT_LOCALE;
}

/**
 * The language a Server Action answers in (round v6 slice E2): `getLocale()`,
 * and Vietnamese when there is no request to read — a test calling the action
 * as a plain function, where `cookies()` throws "`cookies` was called outside
 * a request scope" (`next/dist/server/request/cookies.js`, E251).
 *
 * FOR SERVER ACTIONS ONLY. A page, a layout and `generateMetadata` call
 * `getLocale()`, which catches nothing: while a route is being prerendered,
 * `cookies()` throws (or postpones) to tell Next the route reads the request
 * and must render per request, and "a Request-time API call will also throw an
 * error that should similarly not be caught by the developer"
 * (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
 * unstable_rethrow.md`). Swallowed there, the page would be built once, in
 * Vietnamese, for everybody. An action is never prerendered, so the catch
 * below only ever meets the error of a missing request; and should this be
 * called where Next does throw its signals, `unstable_rethrow` hands them back
 * first ("should be called at the top of the catch block").
 */
export async function getActionLocale(): Promise<Locale> {
  try {
    return await getLocale();
  } catch (error) {
    unstable_rethrow(error);
    return DEFAULT_LOCALE;
  }
}
