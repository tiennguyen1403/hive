"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * The page's language for Client Components (round v6, QĐ-40).
 *
 * The root layout reads the `hive-lang` cookie on the server (`getLocale()`)
 * and hands it down here, so a client component prints the right language in
 * the first HTML and after hydration alike. When the language is switched,
 * the Server Action's re-render gives the provider the new value and every
 * component below redraws its text in place, keeping its state.
 *
 * One context for the whole app. The back office's frame (`ArcAdminFrame`)
 * provides it again around the Arc zone, and the Arc components patched for
 * the language (`registry/PATCHES.md` §2) read it with `useLocale()`. Outside
 * any provider it answers Vietnamese.
 */
const LocaleCtx = createContext<Locale>("vi");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleCtx.Provider value={locale}>{children}</LocaleCtx.Provider>;
}

/** The page's language: `"vi"` or `"en"`. */
export function useLocale(): Locale {
  return useContext(LocaleCtx);
}
