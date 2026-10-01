"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, LOCALE_PARAM, parseLocale } from "@/lib/i18n";

/**
 * Switch the language (round v6 slice E0): the `hive-lang` cookie, set to the
 * `lang` field of the form, and nothing else.
 *
 * Nothing else is needed for the screen to follow. "When you set or delete a
 * cookie in a Server Action, Next.js re-renders the current page and its
 * layouts on the server so the UI reflects the new cookie value … Client
 * state is preserved for re-rendered components"
 * (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`,
 * "Cookies"), in the same round trip as the action
 * (`02-guides/server-actions.md`, "A single response carries data and UI").
 * So no `refresh()`, no `revalidatePath()`, no `redirect()`: the root layout
 * reads the new cookie (`getLocale()`), hands it to `LocaleProvider`, and the
 * page is redrawn in place — the basket, a half-typed form, an open menu stay
 * as they were.
 *
 * Without script the shop's switch is still a plain form posting here, and
 * the page that answers the POST is drawn in the new language.
 *
 * A public endpoint like every Server Action: it only ever writes one of the
 * two languages, so anything else posted to it is ignored. No session is
 * involved, so there is nothing to authorise.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const locale = parseLocale(formData.get(LOCALE_PARAM));
  if (!locale) return;
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
}
