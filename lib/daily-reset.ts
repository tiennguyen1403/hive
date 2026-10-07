/**
 * When the demo resets itself every day (slice B4; since slice B17 the reset
 * also deletes every account that is not part of the sample, QĐ-45): the hour
 * Vercel Cron calls `/api/reset`, as `vercel.json` schedules it, `0 12 * * *`.
 * Vercel reads a schedule in UTC only. Why that hour is written beside the
 * route (`app/api/reset/route.ts`, "WHY THE SCHEDULE"), since `vercel.json`
 * cannot hold a comment.
 *
 * `vercel.json` stays the schedule Vercel obeys; this is what a screen prints
 * it from (`/privacy`, round v6 slice P), and `daily-reset.test.ts` fails the
 * day the two disagree.
 */
export const DAILY_RESET_UTC_HOUR = 12;

/** Vietnam keeps UTC+7 all year, no daylight saving: every instant in this codebase carries +07:00. */
const VIETNAM_UTC_OFFSET_HOURS = 7;

/** "19:00"-style, a whole hour on a 24-hour clock. */
const wholeHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

/**
 * The hour a daily job scheduled at `utcHour` lands in, on the Vietnamese
 * clock: 12 gives "19:00" to "20:00". On the Hobby plan Vercel may invoke a
 * daily job "at any point within the specified hour", so only the hour is a
 * promise and a screen states the whole of it.
 */
export function vietnamHourWindow(utcHour: number): { from: string; to: string } {
  const from = (((utcHour + VIETNAM_UTC_OFFSET_HOURS) % 24) + 24) % 24;
  return { from: wholeHour(from), to: wholeHour((from + 1) % 24) };
}

/** The daily reset's hour on the Vietnamese clock: "19:00" to "20:00". */
export function dailyResetWindow(): { from: string; to: string } {
  return vietnamHourWindow(DAILY_RESET_UTC_HOUR);
}
