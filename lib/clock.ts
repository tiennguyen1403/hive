/**
 * QĐ-24 · THE DEMO CLOCK — what "bây giờ" means in this build.
 *
 * Every screen here is driven by a clock: an issue opens and closes, a
 * transfer holds stock for twelve hours, an order is two days late, a code
 * runs out at 20:00. `data/` is a SNAPSHOT taken around 20/09/2026, and the
 * whole v3 mock was reviewed and approved with the clock frozen at
 * `2026-09-20T18:50:00+07:00`. Left on the real clock, the fixtures decay:
 * within three days both unpaid transfers are past their deadline and the
 * "Chờ chuyển khoản" screens have nothing to show; by 25/09 issue 05 is
 * closed and the shop front has no open issue; by 02/10 issue 06 "opens"
 * with two styles that carry no price and no stock.
 *
 * Moving the fixture dates forward only buys days. So the app lives inside
 * the twenty-four hours after the anchor, and every real day replays that
 * same day:
 *
 *   demoNow() = anchor + ((Date.now() − anchor) mod 24h)
 *
 * · THE TIME OF DAY IS THE REAL ONE. The offset inside the day is the real
 *   offset, so a countdown still ticks second by second, "07:52" is still
 *   07:52, and somebody working at 9am sees a 9am shop. Only the DATE is
 *   pinned, to 20 or 21 September 2026.
 * · SERVER AND CLIENT AGREE, because both compute the same pure function of
 *   `Date.now()`. This adds no hydration risk that the real clock did not
 *   already carry: a server render and a client render a few milliseconds
 *   apart differ by a few milliseconds, exactly as before.
 * · THE DAY TURNS OVER AT 18:50 REAL TIME, when the modulo wraps and the
 *   demo date goes back to 20/09. Nothing on screen jumps except the date,
 *   because the time of day is continuous across the wrap.
 *
 * `data/orders.test.ts` pins the two halves this depends on: every recorded
 * instant in the fixtures is at or before the anchor, and every deadline the
 * screens count DOWN to — the unpaid transfers, issue 05's closing hour —
 * is more than twenty-four hours after it. So no state can flip mid-day.
 *
 * ONE KNOWN CONSEQUENCE, accepted. An order placed in the browser is stamped
 * with the demo clock; once the real day turns over, that stamp sits in the
 * future relative to "now" for a while. The device order screens floor their
 * elapsed times at zero (`sinceLabel`), so it reads as "vừa xong" rather
 * than as a negative age.
 *
 * `new Date()` IS BANNED OUTSIDE THIS FILE. `lib/clock.test.ts` sweeps
 * `lib/`, `components/` and `app/` for it, because one missed call is a
 * screen quietly living in a different year from the one beside it.
 */

/** The instant the v3 mock was frozen at, and every screen reviewed against. */
export const DEMO_ANCHOR = "2026-09-20T18:50:00+07:00";

const ANCHOR_MS = Date.parse(DEMO_ANCHOR);
const DAY = 86_400_000;

/**
 * "Bây giờ", as the demo lives it.
 *
 * Pure, and the only reader of the wall clock in the app. `((x % DAY) + DAY)
 * % DAY` rather than `x % DAY`: before the anchor the remainder is negative
 * and the demo would run backwards from it.
 */
export function demoNow(): Date {
  const intoDay = (((Date.now() - ANCHOR_MS) % DAY) + DAY) % DAY;
  return new Date(ANCHOR_MS + intoDay);
}

/** The same instant as milliseconds, for the few places that compare numbers. */
export function demoNowMs(): number {
  return demoNow().getTime();
}

/** The sentence the back office prints about its own clock. */
export const DEMO_CLOCK_NOTE =
  "Đồng hồ mẫu: 20–21/09/2026, giờ trong ngày là giờ thật.";
