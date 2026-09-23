/**
 * THE CLOCK — what "bây giờ" means in this build: the real one.
 *
 * Until slice B3a this module ran the QĐ-24 demo clock: the date pinned to
 * 20–21/09/2026 and only the time of day real, because the sample data in
 * `data/` is a snapshot taken on the evening of 20/09 and on the real clock
 * it decayed — within three days both unpaid transfers were past their
 * deadline and the "Chờ chuyển khoản" screens had nothing left to show.
 *
 * The data moves now, not the clock. Everything lives in Postgres, and
 * `reset_demo(demo_anchor())` re-anchors the sample on the most recent 18:50
 * in Vietnam each time it runs — the seed, `npm run seed:users`, the back
 * office's "Đặt lại dữ liệu mẫu", and (slice B4) a daily cron just after
 * 18:50. The shift is a whole number of days, so every hour and minute in
 * `data/` survives; `data/orders.test.ts` pins that every recorded moment is
 * at or before the fixture's anchor and every deadline a day or more after it,
 * so after a reset the past really is past and the deadlines really are ahead
 * — on real dates.
 *
 * `demoNow()` keeps its name because two hundred call sites read it and
 * because it is still the ONE reader of the wall clock: a screen, a Server
 * Action and a test that all ask here agree with each other by construction.
 *
 * `new Date()` IS BANNED OUTSIDE THIS FILE. `lib/clock.test.ts` sweeps
 * `lib/`, `components/` and `app/` for it, because one missed call is a
 * screen quietly reading a different clock from the one beside it.
 */

/**
 * The instant the sample data was frozen at (QĐ-24): 18:50 on 20/09/2026.
 *
 * Not "now" any more — the anchor the fixture's own dates are written
 * against. `reset_demo(p_anchor)` shifts everything by `p_anchor − this`, and
 * the tests that compare the database with `data/` reset onto exactly this
 * instant.
 */
export const DEMO_ANCHOR = "2026-09-20T18:50:00+07:00";

/** "Bây giờ". The real wall clock, read here and nowhere else. */
export function demoNow(): Date {
  return new Date();
}

/** The same instant as milliseconds, for the few places that compare numbers. */
export function demoNowMs(): number {
  return demoNow().getTime();
}
