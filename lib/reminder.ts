import type { Drop } from "@/data/types";
import { clockDayLabel } from "./datetime";
import { dropState } from "./drop";
import { demoNow } from "./clock";

/**
 * "Nhắc tôi khi mở", on a build with no server to send anything from.
 *
 * There is no backend and no push channel, so a reminder cannot be delivered
 * — it can only be KEPT. This module holds the honest half of the promise:
 * the choice is remembered on this device, and the next time the shopper
 * opens the home page inside the window, the page itself says so.
 *
 * That is why `reminderNotice` exists at all. Without it the button would
 * store a number nobody ever reads back, which is a dead button wearing a
 * pressed state (DESIGN.md §9 rule 3).
 *
 * Every function takes `now` explicitly, like `lib/drop.ts`: the whole point
 * is a time window, and a window that cannot be tested at its two edges is a
 * window nobody has checked.
 */

export const REMINDER_STORAGE_KEY = "brand.reminder";
const SCHEMA_VERSION = 1;

/**
 * How early the notice appears. Two hours, the figure the teaser has always
 * printed — kept here so the copy and the behaviour cannot drift apart.
 */
export const REMINDER_LEAD_MS = 2 * 60 * 60 * 1000;

/** Drop numbers this device asked to be reminded about. */
export type Reminders = number[];

export function hasReminder(list: Reminders, no: number): boolean {
  return list.includes(no);
}

/**
 * Sorted and deduplicated, so two devices that pressed the same buttons
 * store the same text and a list that arrived doubled leaves clean.
 */
export function toggleReminder(list: Reminders, no: number): Reminders {
  const without = [...new Set(list)].filter((v) => v !== no);
  return list.includes(no) ? without : [...without, no].sort((a, b) => a - b);
}

// ─────────────────────────────────────────────────────────────── storage
export function serializeReminders(list: Reminders): string {
  return JSON.stringify({ v: SCHEMA_VERSION, drops: list });
}

export function parseReminders(raw: string | null): Reminders {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    (parsed as { v?: unknown }).v !== SCHEMA_VERSION
  ) {
    return [];
  }

  const drops = (parsed as { drops?: unknown }).drops;
  if (!Array.isArray(drops)) return [];

  const seen = new Set<number>();
  const out: Reminders = [];
  for (const v of drops) {
    if (typeof v !== "number" || !Number.isFinite(v) || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.sort((a, b) => a - b);
}

// ──────────────────────────────────────────────────── the band on the home
export interface ReminderNotice {
  drop: Drop;
  /** Only two states can produce a notice; a closed drop is over. */
  state: "UPCOMING" | "OPEN";
  /** Shown as-is. */
  text: string;
  /** Shown as-is. */
  linkText: string;
  href: string;
}

/**
 * The line at the top of the home page for someone who asked to be reminded.
 *
 * It appears in the last two hours before the drop opens and stays up for as
 * long as the drop is selling. Once the window shuts the notice goes with it
 * — a reminder about a drop nobody can buy from is noise, and the previous-
 * drop line below the grid already says what happened.
 *
 * The lowest-numbered match wins. Drops never overlap, so at most one is
 * open and at most one is within two hours of opening; ordering only decides
 * the freak case where a device asked about both.
 */
export function reminderNotice(
  drops: readonly Drop[],
  list: Reminders,
  now: Date = demoNow(),
): ReminderNotice | undefined {
  const asked = drops
    .filter((d) => hasReminder(list, d.no))
    .sort((a, b) => a.no - b.no);

  for (const drop of asked) {
    const state = dropState(drop, now);
    const no = String(drop.no).padStart(2, "0");

    if (state === "OPEN") {
      return {
        drop,
        state,
        text: `Số ${no} đã mở — bạn đã đặt nhắc`,
        linkText: `xem số ${no}`,
        href: "/products",
      };
    }

    if (
      state === "UPCOMING" &&
      Date.parse(drop.opensAt) - now.getTime() <= REMINDER_LEAD_MS
    ) {
      return {
        drop,
        state,
        // The weekday comes with it, as everywhere else that prints an
        // opening or a closing: the cover, the footer's calendar and this
        // band are three readings of one instant and must not word it
        // three ways.
        text: `Số ${no} mở lúc ${clockDayLabel(drop.opensAt)} — bạn đã đặt nhắc`,
        linkText: `xem số ${no}`,
        href: `/?drop=${drop.no}`,
      };
    }
  }

  return undefined;
}
