import { dayMonth } from "./datetime";
import type { Locale } from "./i18n";

/**
 * A range as the Feed screens print it (round v4): the mock's hyphen-minus,
 * never an en or em dash — the user keeps those out of the copy — and never
 * broken across two lines, the rule `lib/datetime.ts`'s DASH keeps for the v3
 * screens (which keep their en dash until they are replaced).
 *
 * Two shapes, as the mock writes them:
 * · spaced, between two dates: "11/09 - 25/09" — a no-break space before the
 *   hyphen, then a WORD JOINER and a no-break space after it. The no-break
 *   space alone does not hold the far side (UAX #14 LB12a lets a line break
 *   before a no-break space that follows a hyphen); the joiner forbids it;
 * · tight, between two numbers: "2-4 ngày", "1m55-1m65" — a WORD JOINER each
 *   side of the hyphen, since a line may otherwise break after it (LB21).
 */
export const FEED_DASH = "\u00a0-\u2060\u00a0";
export const FEED_TIGHT_DASH = "\u2060-\u2060";

/** "11/09 - 25/09"; one value when the two ends are the same; the one there is when the other is missing. */
export function feedRange(from: string, to: string): string {
  if (!from || !to) return from || to;
  return from === to ? from : `${from}${FEED_DASH}${to}`;
}

/**
 * Two instants as the days they fall on: "11/09 - 25/09" (Vietnamese wall
 * clock, `dayMonth`); in English "11 Sep - 25 Sep" (round v6 slice E1).
 */
export function feedDayRange(fromIso: string, toIso: string, locale: Locale = "vi"): string {
  return feedRange(dayMonth(fromIso, locale), dayMonth(toIso, locale));
}

/** "1m55-1m65": two values joined tight. */
export function feedTightRange(from: string, to: string): string {
  return `${from}${FEED_TIGHT_DASH}${to}`;
}

/**
 * The same text with every range between two numbers set the Feed's way:
 * "2–4 ngày" (a label `lib/shipping.ts` writes, and stores as an order's
 * carrier, so it is converted here rather than changed there)
 * becomes "2-4 ngày", tight. Anything else is left as it is.
 */
export function feedTight(text: string): string {
  return text.replace(/(\d)\s*[\u2013\u2014-]\s*(\d)/gu, `$1${FEED_TIGHT_DASH}$2`);
}
