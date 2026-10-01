import type { Catalog } from "./catalog";
import { dayFromIsoDay, isoDayFromInput } from "./datetime";

/**
 * The pure parts of the issue form ("Tạo số", "Sửa giờ"): the shop's own
 * hour, how long an issue runs, and the two days in the boxes.
 *
 * Moved out of v3's `DropFormModal` (`components/admin/DropFormModal.tsx`)
 * word for word when the form moved to Arc (round v5 slice 4), as the code
 * form's parts went to `lib/promo-form.ts` in slice 3, so the Arc dialog
 * imports no v3 sheet and its chrome. The v3 file keeps its own copy until
 * the clean-up slice retires it. `closingAfter` and `spanDays` are v3's two
 * inline rules, named so they can be tested.
 */

/**
 * The hour every issue of this shop opens and closes at.
 *
 * Read off the issues that exist rather than typed here: all four open and
 * close at 20:00, and a form that offered some other hour would be inventing
 * a habit the shop does not have. Change the fixtures and the form follows.
 */
export function dropHour(catalog: Catalog): string {
  const drops = catalog.drops;
  return (drops.at(-1) ?? drops[0])?.opensAt.slice(11, 16) ?? "20:00";
}

/** How long an issue runs, in days, taken from the last one that did. */
export function dropLengthDays(catalog: Catalog): number {
  const last = catalog.drops.at(-1);
  if (!last) return 14;
  return Math.round((Date.parse(last.closesAt) - Date.parse(last.opensAt)) / 86_400_000);
}

/** `2026-11-06` → `2026-11-06T20:00:00+07:00`, the shape everything stores. */
export function atDropHour(catalog: Catalog, day: string): string {
  return `${day}T${dropHour(catalog)}:00+07:00`;
}

/** An instant → the day in the box, `21/09/2026`. */
export function dayValue(iso: string): string {
  return dayFromIsoDay(iso.slice(0, 10));
}

/** `21/09/2026` plus n days, still as typed. Unchanged when the day is not one. */
export function shiftDays(shown: string, delta: number): string {
  const iso = isoDayFromInput(shown);
  if (!iso) return shown;
  return dayFromIsoDay(
    new Date(Date.parse(`${iso}T12:00:00+07:00`) + delta * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
}

/** The two boxes as days (`2026-10-12`), or null while one of them is unfinished. */
export function span(from: string, to: string): { from: string; to: string } | null {
  const a = isoDayFromInput(from);
  const b = isoDayFromInput(to);
  return a && b ? { from: a, to: b } : null;
}

/**
 * The closing box after the opening one changed, v3's rule: when the closing
 * day is empty or not after the new opening day, it moves to the opening day
 * plus the length of an issue; otherwise it stays as typed.
 */
export function closingAfter(from: string, to: string, lengthDays: number): string {
  const a = isoDayFromInput(from);
  const b = isoDayFromInput(to);
  return a && (!b || Date.parse(b) <= Date.parse(a)) ? shiftDays(from, lengthDays) : to;
}

/** How many days a window runs: the " · 14 ngày" of the preview. */
export function spanDays(days: { from: string; to: string }): number {
  return Math.round((Date.parse(days.to) - Date.parse(days.from)) / 86_400_000);
}
