"use client";

import { useEffect, useState } from "react";
import { timeLeft, type TimeLeft } from "@/lib/drop";
import { demoNow } from "@/lib/clock";

interface CountdownProps {
  /** The instant being counted to — an issue's `opensAt` or `closesAt`. */
  until: string;
  /** What is at the end of it: "khi đóng", "giờ mở". Read by the label. */
  to: string;
  /** What the line says once it gets there: "đã đóng", "đang mở". */
  over: string;
  /**
   * Which three units, and therefore how often it ticks.
   *
   * `dhm` is the issue's clock: days, hours, minutes, once a minute. `hms`
   * is the transfer deadline on the confirmation — twelve hours, where the
   * seconds are the point, so it counts hours, minutes and seconds and ticks
   * once a second.
   */
  mode?: "dhm" | "hms";
}

/**
 * The cover's clock: three numbers and three units, on the cloth itself.
 *
 * v3 took the boxes away. A countdown inside four plates reads as a widget
 * bolted onto the cover; set in the display face straight on the black
 * cloth, at 32px against an 11px unit, it reads as part of the issue's own
 * lettering — which is what it is.
 *
 * Three things it has to get right, two of them learned on the v2 band:
 *
 * 1. **The digits are rendered in the browser only.** A clock printed into
 *    prerendered HTML is wrong the moment that HTML is cached, and React
 *    throws away a tree that disagrees with the markup it hydrates. So the
 *    first frame carries the units and empty numbers — `min-width` in
 *    `home.css` holds their place — and the figures land on mount. The
 *    accessible label is filled in at the same moment, for the same reason:
 *    a duration baked into the server frame would be stale too.
 * 2. **It recomputes from the deadline every tick** rather than decrementing
 *    a number it holds, so a tab that was backgrounded for an hour comes
 *    back correct instead of an hour behind.
 * 3. **It does not change the page under the shopper.** At zero the row
 *    says so and stops; the issue's state is derived server-side from these
 *    same instants and turns over on the next load. A clock that reloaded
 *    the page out from under a half-filled size sheet would be worse than a
 *    minute of staleness.
 *
 * A minute, not a second: nothing here counts seconds, so a per-second timer
 * would be 59 wasted renders on a phone that is trying to stay awake.
 */
export function Countdown({ until, to, over, mode = "dhm" }: CountdownProps) {
  const [left, setLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const tick = () => setLeft(timeLeft(until, demoNow()));
    tick();
    const id = window.setInterval(tick, mode === "hms" ? 1_000 : 60_000);
    return () => window.clearInterval(id);
  }, [until, mode]);

  const done = left !== null && left.totalMs === 0;
  // In `hms` the days fold into the hours: a deadline twenty-six hours away
  // reads "26 giờ", never "1 ngày 2 giờ" with the day nowhere on screen.
  const hours = left ? (mode === "hms" ? left.days * 24 + left.hours : left.hours) : undefined;

  return (
    <div className="clock" role="timer" aria-label={label(left, to, over)}>
      {done ? (
        <span className="over">{over}</span>
      ) : mode === "hms" ? (
        <>
          <Figure value={hours} />
          <span aria-hidden="true">giờ</span>
          <Figure value={left?.minutes} />
          <span aria-hidden="true">phút</span>
          <Figure value={left?.seconds} />
          <span aria-hidden="true">giây</span>
        </>
      ) : (
        <>
          <Figure value={left?.days} />
          <span aria-hidden="true">ngày</span>
          <Figure value={left?.hours} />
          <span aria-hidden="true">giờ</span>
          <Figure value={left?.minutes} />
          <span aria-hidden="true">phút</span>
        </>
      )}
    </div>
  );
}

/**
 * Two digits — and, until the browser has read the clock, two INVISIBLE
 * digits rather than an empty box.
 *
 * The row has to hold its shape across that first frame or the three unit
 * labels slide sideways when the numbers land. Reserving the space with a
 * `min-width` was tried and is wrong: `ch` is the advance of the
 * proportional zero, 11px wider a figure than the tabular one this sets, and
 * at 390px that pushed "phút" onto a line of its own. Two real glyphs cannot
 * mismeasure themselves.
 */
function Figure({ value }: { value: number | undefined }) {
  const waiting = value === undefined;
  return (
    <b className={waiting ? "wait" : undefined} aria-hidden="true">
      {waiting ? "00" : String(value).padStart(2, "0")}
    </b>
  );
}

/**
 * "Còn 5 ngày 1 giờ tới khi đóng" — the whole clock in one sentence.
 *
 * The digits themselves are `aria-hidden` in effect: a reader that announced
 * three numbers and three nouns would say "05 ngày 01 giờ 10 phút" and leave
 * out what any of it is counting to. Two units, the same pair the band uses,
 * and no leading zeros — they are a typographic device, not a value.
 */
function label(left: TimeLeft | null, to: string, over: string): string {
  if (left === null) return `Đếm ngược tới ${to}`;
  if (left.totalMs === 0) return over;
  if (left.days > 0) return `Còn ${left.days} ngày ${left.hours} giờ tới ${to}`;
  if (left.hours > 0) return `Còn ${left.hours} giờ ${left.minutes} phút tới ${to}`;
  return `Còn ${left.minutes} phút tới ${to}`;
}
