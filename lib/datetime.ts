/**
 * Reading a timestamp back out as the wall-clock time it was written in.
 *
 * Every instant in this codebase is an ISO string carrying +07:00, and every
 * screen that prints one means Vietnamese local time: "đóng lúc 20:00", not
 * "đóng at whatever o'clock the server thinks it is". Going through `Date`
 * and its local getters would hand back 13:00 on a UTC host and 22:00 in
 * Tokyo, so the shop would announce a different closing time depending on
 * where it was deployed — and a drop model is a promise about a clock.
 *
 * `Intl.DateTimeFormat` with a fixed `timeZone` would also work, but it is
 * the same gamble `lib/money.ts` already refused: a runtime shipping partial
 * ICU silently falls back to the default locale and format. Pulling the
 * fields out of the text costs one regex and cannot drift.
 */

interface Parts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

function partsOf(iso: string): Parts | null {
  const m = ISO.exec(iso);
  if (!m) return null;
  return { year: m[1]!, month: m[2]!, day: m[3]!, hour: m[4]!, minute: m[5]! };
}

/** `"20:00"`. Empty string when the input is not a timestamp. */
export function clockLabel(iso: string): string {
  const p = partsOf(iso);
  return p ? `${p.hour}:${p.minute}` : "";
}

/** `"25/09"`. */
export function dayMonth(iso: string): string {
  const p = partsOf(iso);
  return p ? `${p.day}/${p.month}` : "";
}

/** `"25/09/2026"`. */
export function dayMonthYear(iso: string): string {
  const p = partsOf(iso);
  return p ? `${p.day}/${p.month}/${p.year}` : "";
}

/** `"06:50 ngày 21/09"` — a moment on the clock AND on the calendar. */
export function dateTimeLabel(iso: string): string {
  const p = partsOf(iso);
  return p ? `${p.hour}:${p.minute} ngày ${p.day}/${p.month}` : "";
}

/** `"20:00 ngày 02/10"` — how the upcoming-drop screen announces an opening. */
export function openingLabel(iso: string): string {
  return dateTimeLabel(iso);
}

// ────────────────────────────────────────── which day of the week that is
/**
 * The seven days, as this language writes them.
 *
 * `Chủ nhật` is capitalised and the other six are not — it is a name, they
 * are an ordinal ("day two", "day three") — and the cover sets them inside a
 * sentence: "Đóng 20:00 thứ Sáu 25/09".
 */
const WEEKDAYS = [
  "Chủ nhật",
  "thứ Hai",
  "thứ Ba",
  "thứ Tư",
  "thứ Năm",
  "thứ Sáu",
  "thứ Bảy",
] as const;

/**
 * `"thứ Sáu"` — the day of the week a timestamp falls on.
 *
 * Counted, not formatted. `Intl.DateTimeFormat(…, { weekday: "long" })` is
 * the same gamble the top of this file already refused: on a runtime with
 * partial ICU it falls back to the default locale and prints "Friday" on a
 * Vietnamese storefront. The index comes from `Date.UTC` over the three
 * fields already parsed out of the +07:00 text — a UTC midnight on the
 * Vietnamese calendar date, which cannot be nudged into the day before by
 * the zone the server happens to run in.
 */
export function weekdayLabel(iso: string): string {
  const p = partsOf(iso);
  if (!p) return "";
  const index = new Date(
    Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)),
  ).getUTCDay();
  return WEEKDAYS[index] ?? "";
}

/**
 * `"20:00 thứ Sáu 25/09"` — the instant an issue cover announces.
 *
 * A drop is a promise about a clock, and "25/09" alone makes a shopper count
 * days on their fingers. The weekday is the unit people actually plan in.
 */
export function clockDayLabel(iso: string): string {
  const p = partsOf(iso);
  if (!p) return "";
  return `${p.hour}:${p.minute} ${weekdayLabel(iso)} ${p.day}/${p.month}`;
}

/** `"23:00 · 19/09"` — the closed band's right-hand side. */
export function closedAtLabel(iso: string): string {
  const p = partsOf(iso);
  return p ? `${p.hour}:${p.minute} · ${p.day}/${p.month}` : "";
}

/**
 * `"22/09 – 24/09"`, or `"21/09"` when the window is a single day.
 *
 * The short form of a delivery window, for the rows that quote it inside a
 * sentence — the cart summary and the delivery choices. The year is left off
 * because those rows are read while choosing, and a window that closes four
 * days from now does not need one. The receipt keeps `rangeLabel` below,
 * which carries the year, because a receipt is read again months later.
 */
export function shortRangeLabel(fromIso: string, toIso: string): string {
  const a = dayMonth(fromIso);
  const b = dayMonth(toIso);
  if (!a || !b) return "";
  return a === b ? a : `${a}${DASH}${b}`;
}

/**
 * ` – ` with NO-BREAK SPACES around it, and a WORD JOINER (U+2060) after
 * the dash.
 *
 * A window is one value. Let a line break fall on either side of the dash
 * and a shopper reads "22/09" at the end of one line and "– 24/09" at the
 * start of the next, which looks like two dates rather than a range. Both
 * of these strings are rendered inside running sentences, so the wrapping
 * is real and not hypothetical.
 *
 * The no-break space alone did not hold the far side: UAX #14 (LB12a) lets
 * a line break before a no-break space that follows a dash, and the en
 * dash is one. Measured at 390 on the order receipt: "nhận 20/09 –" over
 * "22/09" (v3 slice 13). The joiner forbids a break on both of its sides;
 * `styleInList` in lib/lexicon.ts holds a style's name the same way.
 */
const DASH = "\u00A0–\u2060\u00A0";

// ───────────────────────────────────────────────────── typing a date in
/**
 * A day as this country writes it, in a box the design system drew.
 *
 * NOT `<input type="date">`. Chrome renders that with its own calendar
 * button and formats it in the BROWSER's language — an American `09/21/2026`
 * in the middle of a Vietnamese back office — and DESIGN.md §6 is explicit
 * that this app draws the surfaces the browser would otherwise style for it.
 * A masked text box costs three small functions, all of them tested.
 */

/** Digits as they arrive → `21/09/2026`. Anything past eight is dropped. */
export function dayInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** `2026-09-21` → `21/09/2026`, for putting a stored day back in the box. */
export function dayFromIsoDay(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/**
 * `21/09/2026` → `2026-09-21`, or null when that is not a day.
 *
 * Rejects 31/02 rather than rolling it forward into March: a form that
 * silently moves the date somebody typed is worse than one that says no.
 */
export function isoDayFromInput(raw: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1) return null;
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > lastDay) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * `"1 ngày 11 giờ trước"` — how long ago, in the two units that matter.
 *
 * The back office reads this beside a timestamp, never instead of one: the
 * stamp says WHEN, this says HOW LONG, and the second is what decides
 * whether an order is late. Same two-unit rule as the drop countdown
 * (`closesInLabel`), and it floors at zero rather than counting a future
 * instant backwards.
 */
export function sinceLabel(iso: string, now: Date): string {
  const ms = Math.max(0, now.getTime() - Date.parse(iso));
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} ngày ${hours % 24} giờ trước`;
  if (hours > 0) return `${hours} giờ ${minutes % 60} phút trước`;
  if (minutes > 0) return `${minutes} phút trước`;
  return "vừa xong";
}

/** `"21/09 – 23/09/2026"` — an estimated delivery window. */
export function rangeLabel(fromIso: string, toIso: string): string {
  const a = dayMonth(fromIso);
  const b = dayMonthYear(toIso);
  return a && b ? `${a}${DASH}${b}` : "";
}

/**
 * A `Date` written as the Vietnamese wall clock, with the offset spelled out.
 *
 * `toISOString()` would normalise to UTC and the formatters above, which read
 * the literal text, would then print an hour that is seven off. Everything
 * stored in this codebase carries +07:00 for exactly that reason.
 */
export function toVnIso(d: Date): string {
  const VN_OFFSET_MINUTES = 7 * 60;
  const local = new Date(d.getTime() + (VN_OFFSET_MINUTES + d.getTimezoneOffset()) * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}` +
    `T${pad(local.getHours())}:${pad(local.getMinutes())}:00+07:00`
  );
}

/**
 * Same instant, `hours` later.
 *
 * The bank-transfer hold is twelve hours from the minute the order is placed,
 * so this one crosses midnight on purpose — `addDaysIso` would round it to a
 * date and lose the deadline's whole point.
 */
export function addHoursIso(iso: string, hours: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return toVnIso(new Date(t + hours * 3_600_000));
}

/** Same instant, `days` later. Used for delivery estimates, never for state. */
export function addDaysIso(iso: string, days: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return toVnIso(new Date(t + days * 86_400_000));
}
