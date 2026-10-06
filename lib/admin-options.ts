import type { Catalog } from "./catalog";
import { dropState } from "./drop";
import { demoNow } from "./clock";
import { storedLang } from "./admin-text";
import { picker, plural, type Locale } from "./i18n";
import { FIXED_WORD_TEXT, issueLabel } from "./lexicon";

/**
 * The menus on the product form.
 *
 * Derived, both of them. A hard-coded list of kinds drifts the first time
 * somebody adds a style the menu has never heard of, and a hard-coded list
 * of drops goes stale the moment one opens.
 */

/**
 * One row of a menu: the value sent, the words shown, and an optional note at
 * the row's end ("12 mẫu"). The shape Arc's `Select` takes, with its `note`
 * (round v5 slice 4, `registry/PATCHES.md`). Until slice 6 this type came
 * from v3's `Select`.
 */
export interface SelectOption {
  value: string;
  label: string;
  /** Right-aligned secondary text — a count, a hint. */
  note?: string;
  /**
   * The language of `label` when it is not the page's: `"vi"` for a kind the
   * database keeps in Vietnamese, on an English page (round v6 slice E5, Arc
   * `Select`'s `lang`, `registry/PATCHES.md`).
   */
  lang?: string;
}

/**
 * Every kind the catalogue actually uses, with how many styles wear it. The
 * kind is the one the database keeps, as typed, in either language: the form
 * saves what it shows (brief v6 slice E5, B15's rule); on an English page a
 * Vietnamese one says so (`lang`), and the count is English.
 */
export function kindOptions(catalog: Catalog, locale: Locale = "vi"): SelectOption[] {
  const count = new Map<string, number>();
  for (const p of catalog.products) count.set(p.kind, (count.get(p.kind) ?? 0) + 1);
  const t = picker(locale);
  return [...count]
    .sort((a, b) => a[0].localeCompare(b[0], "vi"))
    .map(([kind, n]) => {
      const option: SelectOption = { value: kind, label: kind, note: t({ vi: `${n} mẫu`, en: plural(n, "style", "styles") }) };
      const lang = storedLang(kind, locale);
      return lang ? { ...option, lang } : option;
    });
}

const STATE_NOTE = {
  OPEN: { vi: "đang mở", en: "live" },
  UPCOMING: { vi: "sắp mở", en: "coming soon" },
  CLOSED: { vi: "đã đóng", en: "closed" },
} as const;

/**
 * The issue menu's value for "Cố định" (v3 slice 12): a new style that
 * belongs to no issue. Not a number, so nothing can read it as an issue; the
 * form sends `dropNo: null` for it (`createProduct`, slice B5).
 */
export const FIXED_CHOICE = "fixed";

/**
 * Newest drop first, each saying what it is doing right now — "Số 06 · sắp
 * mở", in the label itself (v3 slice 7, as the form's mock prints it), so the
 * closed button says it too and not only the open menu.
 *
 * `hideClosed` leaves the closed ones out: a new style cannot join an issue that
 * has closed (`createProduct` refuses with `DROP_CLOSED`), so the new-style
 * form does not offer one. Editing keeps them all — a style already in a
 * closed issue has to be able to show which one.
 *
 * `withFixed` puts "Cố định" last (v3 slice 12), with no note: the new-style
 * form's way to make a style of no issue. Editing never offers it — a style
 * keeps its kind for good (`admin_update_product`, slice B5).
 */
export function dropOptions(
  catalog: Catalog,
  now: Date = demoNow(),
  { hideClosed = false, withFixed = false }: { hideClosed?: boolean; withFixed?: boolean } = {},
  locale: Locale = "vi",
): SelectOption[] {
  const t = picker(locale);
  const issues = [...catalog.drops]
    .sort((a, b) => b.no - a.no)
    .map((d) => ({ d, state: dropState(d, now) }))
    .filter(({ state }) => !hideClosed || state !== "CLOSED")
    .map(({ d, state }) => ({
      value: String(d.no),
      label: t({
        vi: `Số ${String(d.no).padStart(2, "0")} · ${STATE_NOTE[state].vi}`,
        en: `${issueLabel(d.no, "en")} · ${STATE_NOTE[state].en}`,
      }),
    }));
  return withFixed ? [...issues, { value: FIXED_CHOICE, label: t(FIXED_WORD_TEXT) }] : issues;
}
