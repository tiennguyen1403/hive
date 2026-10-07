import { dayMonthYear } from "./datetime";
import type { Locale } from "./i18n";

/**
 * The privacy page `/privacy` (round v6 slice P): the day its words were last
 * changed, which its closing line prints ("Cập nhật 07/10/2026." / "Updated
 * 7 Oct 2026."). Google's consent screen links to the page (QĐ-41), so the
 * day is a promise about the text: change it whenever the words change.
 *
 * 07/10/2026, the day the page went up to the demo (the main session). An
 * instant at midnight in Vietnam, as every instant in this codebase carries
 * +07:00, so `lib/datetime.ts` reads the date off the text and no server's
 * zone moves it.
 */
export const PRIVACY_UPDATED_AT = "2026-10-07T00:00:00+07:00";

/** The same day as `<time dateTime>` takes it: "2026-10-07". */
export const PRIVACY_UPDATED_DAY = PRIVACY_UPDATED_AT.slice(0, 10);

/**
 * The day in the page's language: "07/10/2026"; in English "7 Oct 2026", the
 * glossary's British date, held together by no-break spaces (`dayMonthYear`).
 */
export function privacyUpdated(locale: Locale = "vi"): string {
  return dayMonthYear(PRIVACY_UPDATED_AT, locale);
}
