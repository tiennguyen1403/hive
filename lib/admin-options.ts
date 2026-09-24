import type { Catalog } from "./catalog";
import type { SelectOption } from "@/components/ui/Select";
import { dropState } from "./drop";
import { demoNow } from "./clock";
import { FIXED_WORD } from "./lexicon";

/**
 * The menus on the product form.
 *
 * Derived, both of them. A hard-coded list of kinds drifts the first time
 * somebody adds a style the menu has never heard of, and a hard-coded list
 * of drops goes stale the moment one opens.
 */

/** Every kind the catalogue actually uses, with how many styles wear it. */
export function kindOptions(catalog: Catalog): SelectOption[] {
  const count = new Map<string, number>();
  for (const p of catalog.products) count.set(p.kind, (count.get(p.kind) ?? 0) + 1);
  return [...count]
    .sort((a, b) => a[0].localeCompare(b[0], "vi"))
    .map(([kind, n]) => ({ value: kind, label: kind, note: `${n} mẫu` }));
}

const STATE_NOTE = { OPEN: "đang mở", UPCOMING: "sắp mở", CLOSED: "đã đóng" } as const;

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
): SelectOption[] {
  const issues = [...catalog.drops]
    .sort((a, b) => b.no - a.no)
    .map((d) => ({ d, state: dropState(d, now) }))
    .filter(({ state }) => !hideClosed || state !== "CLOSED")
    .map(({ d, state }) => ({
      value: String(d.no),
      label: `Số ${String(d.no).padStart(2, "0")} · ${STATE_NOTE[state]}`,
    }));
  return withFixed ? [...issues, { value: FIXED_CHOICE, label: FIXED_WORD }] : issues;
}
