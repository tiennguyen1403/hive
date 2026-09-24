import type { Catalog } from "./catalog";
import { closedAtLabel } from "./datetime";
import type { Drop, DropState } from "@/data/types";
import { demoNow } from "./clock";

/**
 * A drop's state is never stored — it is read off the clock. A stored flag is
 * a flag someone forgets to flip, and on a model where the window closing is
 * the whole point, a stale flag is the worst possible bug.
 *
 * Every function here takes `now` explicitly. That keeps them pure, makes the
 * boundary cases testable, and stops a server render and a client render from
 * disagreeing about what time it is.
 */

export function dropState(drop: Drop, now: Date = demoNow()): DropState {
  const t = now.getTime();
  if (t < Date.parse(drop.opensAt)) return "UPCOMING";
  // Open-inclusive, close-exclusive: the same rule as a shop door. A shopper
  // arriving exactly on the opening second gets in; on the closing second
  // they do not.
  if (t >= Date.parse(drop.closesAt)) return "CLOSED";
  return "OPEN";
}

export function getDrop(catalog: Catalog, no: number): Drop | undefined {
  return catalog.dropByNo.get(no);
}

export function currentDrop(catalog: Catalog): Drop {
  const d = getDrop(catalog, catalog.currentDropNo);
  if (!d) throw new Error(`no drop record for ${catalog.currentDropNo}`);
  return d;
}

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function timeLeft(closesAt: string, now: Date = demoNow()): TimeLeft {
  // Floor at zero rather than going negative: once it is over it is over, and
  // a countdown that starts counting up is a bug the shopper can see.
  const totalMs = Math.max(0, Date.parse(closesAt) - now.getTime());
  const s = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor(s / 3600) % 24,
    minutes: Math.floor(s / 60) % 60,
    seconds: s % 60,
    totalMs,
  };
}

/**
 * The band's countdown line. Shows two units at most, and only the two that
 * matter at that distance: days and hours when there is over a day left,
 * hours and minutes inside a day, minutes alone in the last hour. Scarcity is
 * information the shopper acts on, so it is stated plainly, not padded with
 * zeros they have to read past.
 */
export function closesInLabel(closesAt: string, now: Date = demoNow()): string {
  const { days, hours, minutes, totalMs } = timeLeft(closesAt, now);
  if (totalMs === 0) return "đã đóng";
  if (days > 0) return `đóng sau ${days} ngày ${hours} giờ`;
  if (hours > 0) return `đóng sau ${hours} giờ ${minutes} phút`;
  return `đóng sau ${minutes} phút`;
}

/** Shown before a drop opens. Same shape, other direction. */
export function opensInLabel(opensAt: string, now: Date = demoNow()): string {
  const { days, hours, minutes, totalMs } = timeLeft(opensAt, now);
  if (totalMs === 0) return "đang mở";
  if (days > 0) return `mở sau ${days} ngày ${hours} giờ`;
  if (hours > 0) return `mở sau ${hours} giờ ${minutes} phút`;
  return `mở sau ${minutes} phút`;
}

// ────────────────────────────────────────────────── which drop the page shows
export interface FeaturedDrop {
  drop: Drop;
  state: DropState;
  /** The one before it, for "Số 04 đã đóng · xem lại". */
  previous: Drop | undefined;
}

/**
 * Pick the drop the home page is about.
 *
 * `requestedNo` comes from `?drop=` and chooses WHICH drop — never what state
 * to draw it in. The state stays derived from the clock below, so a closed
 * drop cannot be made to look open by editing a URL, and the page cannot be
 * left showing "đang mở" because nobody flipped a flag.
 *
 * With nothing requested the order is: the one selling now, else the one
 * about to open, else the last one that ran. The gap between two drops is not
 * a dead shop — it is the moment the next countdown is the most useful thing
 * on the page.
 */
export function featuredDrop(
  catalog: Catalog,
  requestedNo: number | undefined,
  now: Date = demoNow(),
): FeaturedDrop {
  const byNo = [...catalog.drops].sort((a, b) => a.no - b.no);

  const asked =
    requestedNo !== undefined ? byNo.find((d) => d.no === requestedNo) : undefined;

  const drop =
    asked ??
    byNo.find((d) => dropState(d, now) === "OPEN") ??
    byNo.find((d) => dropState(d, now) === "UPCOMING") ??
    byNo[byNo.length - 1]!;

  const at = byNo.findIndex((d) => d.no === drop.no);
  return { drop, state: dropState(drop, now), previous: byNo[at - 1] };
}

/**
 * The line under the home page's grid, about the drop before this one.
 *
 * It used to read "Số 05 đã đóng · xem lại" unconditionally (L4). When the
 * page is showing the UPCOMING drop, the one before it is the drop selling
 * right now — so the page was announcing that the open shop had shut. The
 * state is derived here, from the clock, and the screen prints what it is
 * handed.
 */
export interface PreviousDropNote {
  drop: Drop;
  state: DropState;
  /** "đang mở" · "đã đóng" · "chưa mở". Shown as-is. */
  status: string;
  /** "đóng sau 5 ngày 1 giờ" while it is still running; "" once it is over. */
  countdown: string;
  /** "xem số 05" · "xem lại". Shown as-is. */
  linkText: string;
}

export function previousDropNote(
  previous: Drop | undefined,
  now: Date = demoNow(),
): PreviousDropNote | undefined {
  if (!previous) return undefined;

  const state = dropState(previous, now);
  const no = String(previous.no).padStart(2, "0");

  // "xem lại" only makes sense for something that is over. A drop that is
  // still selling gets a link that says where it goes.
  if (state === "CLOSED") {
    return { drop: previous, state, status: "đã đóng", countdown: "", linkText: "xem lại" };
  }
  return {
    drop: previous,
    state,
    status: state === "OPEN" ? "đang mở" : "chưa mở",
    countdown:
      state === "OPEN"
        ? closesInLabel(previous.closesAt, now)
        : opensInLabel(previous.opensAt, now),
    linkText: `xem số ${no}`,
  };
}

/**
 * The three drops the footer's calendar names: the one selling now, the one
 * about to open, and the last one that ran.
 *
 * Any of the three can be absent — between the last drop of the year and the
 * next there is no open one — and the footer leaves that row out rather than
 * printing a drop that does not exist.
 */
export interface DropCalendar {
  open: Drop | undefined;
  upcoming: Drop | undefined;
  closed: Drop | undefined;
}

export function dropCalendar(catalog: Catalog, now: Date = demoNow()): DropCalendar {
  const byNo = [...catalog.drops].sort((a, b) => a.no - b.no);
  const closed = byNo.filter((d) => dropState(d, now) === "CLOSED");

  return {
    open: byNo.find((d) => dropState(d, now) === "OPEN"),
    // The NEXT one to open, not any of them: drops never overlap, so the
    // lowest number still ahead is the one with a date worth printing.
    upcoming: byNo.find((d) => dropState(d, now) === "UPCOMING"),
    // The most recent one to shut, which is the one "xem lại" should reach.
    closed: closed[closed.length - 1],
  };
}

// ─────────────────────────────────────────────── where an issue lives (v3 slice 11)
/**
 * `/so/5` — an issue's own page, and the one address every "the whole issue"
 * link leads to: the nav's plate, the cover's button, "Xem cả 10 mẫu", the
 * product page's trail, the footer's calendar. While the issue sells it is
 * the issue's listing; once it closes, its record; before it opens the page
 * sends the shopper on to the teaser. `/products` is every style on sale,
 * both kinds, and belongs to no issue.
 */
export function issueHref(no: number): string {
  return `/so/${no}`;
}

/**
 * Where a screen's way back into the shop goes: the issue selling now, to
 * its own page — "Xem số 05", "Về số 05" — or, when no issue is selling,
 * every style on sale, "Xem tất cả mẫu". `issueNo` is the open issue for the
 * screens that name it, null when there is none.
 */
export function wayToShop(
  catalog: Catalog,
  now: Date = demoNow(),
): { href: string; issueNo: number | null } {
  const open = dropCalendar(catalog, now).open;
  return open ? { href: issueHref(open.no), issueNo: open.no } : { href: "/products", issueNo: null };
}

/**
 * The right-hand side of the drop band, for whichever state it is in.
 *
 * It lives here and not beside the component because BOTH sides need it: the
 * server renders the first frame with it, and the client ticks with it. A
 * copy exported from the `"use client"` module cannot be called from a
 * server component at all — the server throws rather than falling back.
 */
export function dropBandLabel(
  drop: Drop,
  state: DropState,
  now: Date = demoNow(),
): string {
  if (state === "UPCOMING") return opensInLabel(drop.opensAt, now);
  if (state === "OPEN") return closesInLabel(drop.closesAt, now);
  return closedAtLabel(drop.closesAt);
}
