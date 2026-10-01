import { cookies } from "next/headers";
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
