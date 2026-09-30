import type { PromoKind } from "./catalog-admin";
import { clockLabel, dayMonthYear, isoDayFromInput } from "./datetime";

/**
 * The pure parts of the discount-code form: the draft it hands the Server
 * Actions, and the way it writes and reads an instant.
 *
 * Moved out of v3's `PromoFormSheet` (`components/admin/PromoFormSheet.tsx`)
 * word for word when the form moved to Arc (round v5 slice 3), so the Arc
 * drawer does not import a v3 sheet and its chrome. The v3 file keeps its own
 * copy until the clean-up slice retires it.
 */

/** What the form sends: `addPromo` and `editPromo` read it (`readPromoDraft`, lib/catalog-admin.ts). */
export interface PromoDraft {
  code: string;
  promoKind: PromoKind;
  percent: number;
  amountVnd: number;
  maxDiscountVnd: number;
  minOrderVnd: number;
  usageLimit: number | null;
  startsAt: string;
  endsAt: string;
}

/** `"20:00 11/09/2026"`: an instant as this form writes it. */
export function stampOf(iso: string): string {
  return `${clockLabel(iso)} ${dayMonthYear(iso)}`;
}

/**
 * The same string read back, or null while it is unfinished.
 *
 * Strict on purpose: a half-typed date that silently parsed would set a code
 * running on a day nobody chose. The hour is required because a code that
 * starts "on the 11th" starts at some particular minute, and 00:00 is a
 * guess the form would be making on the shop's behalf.
 */
export function parseStamp(raw: string): string | null {
  const m = /^(\d{1,2}):(\d{2})\s+(\d{1,2}\/\d{1,2}\/\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const day = isoDayFromInput(m[3]!);
  if (!day) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return `${day}T${String(hour).padStart(2, "0")}:${m[2]}:00+07:00`;
}
