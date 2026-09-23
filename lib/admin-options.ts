import type { Catalog } from "./catalog";
import type { SelectOption } from "@/components/ui/Select";
import { dropState } from "./drop";
import { demoNow } from "./clock";

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

/** Newest drop first, each saying what it is doing right now. */
export function dropOptions(catalog: Catalog, now: Date = demoNow()): SelectOption[] {
  return [...catalog.drops]
    .sort((a, b) => b.no - a.no)
    .map((d) => ({
      value: String(d.no),
      label: `Số ${String(d.no).padStart(2, "0")}`,
      note: STATE_NOTE[dropState(d, now)],
    }));
}
