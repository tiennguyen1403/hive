/**
 * The two switches on the account screen, and the only thing this build can
 * honestly do with them.
 *
 * There is no server and no mail sender, so a preference cannot be ACTED ON
 * — it can only be KEPT. Same shape as `reminder.ts`, and for the same
 * reason: the screen says out loud that the choice lives in this browser
 * until there is somewhere else to put it, and the switch really does
 * remember it across reloads and across tabs.
 *
 * Both keys are named after what the shopper asked for, not after a channel
 * nobody has built.
 */

import { SIZES, type Size } from "@/data/types";

export const PREFS_STORAGE_KEY = "brand.prefs";
const SCHEMA_VERSION = 1;

export interface Prefs {
  /** Tell me when a new drop opens. */
  dropOpen: boolean;
  /** Tell me when something on my list is nearly gone. */
  savedLow: boolean;
  /**
   * Email me when an order changes state — added at v3 slice 4.
   *
   * KEPT, not acted on, and the row that offers it says so: "Gửi thư cần máy
   * chủ, đang chuẩn bị." It is here rather than invented at sign-up time
   * because the consent box on the sign-up form is the same answer, and two
   * places recording one choice in two keys is how they end up disagreeing.
   */
  emailOnStatus: boolean;
  /**
   * Which sources the notifications screen counts. Both are about what the
   * screen SHOWS, so unlike `emailOnStatus` they take effect immediately —
   * `lib/notifications.ts` reads them and leaves the source out.
   */
  notifOrders: boolean;
  notifPromo: boolean;
  /**
   * The size a product page preselects — "Size ghi nhớ", added at v3 slice 2.
   *
   * NOT a switch: it is a value, and the only one of the three that changes
   * what a screen shows rather than what a screen would send. It lives here
   * because it answers the same question as the other two ("what has this
   * device asked for") and because one key is one place to clear.
   *
   * `null` means nothing is remembered, which is the honest default — a shop
   * that guesses a size is a shop that adds the wrong one to a cart.
   */
  size: Size | null;
}

/** The booleans. `size` is set through `setSizePref` instead. */
export type PrefKey = "dropOpen" | "savedLow" | "emailOnStatus" | "notifOrders" | "notifPromo";

/** Every boolean key, so a reader can loop them without listing them again. */
export const PREF_KEYS: PrefKey[] = [
  "dropOpen",
  "savedLow",
  "emailOnStatus",
  "notifOrders",
  "notifPromo",
];

/**
 * Drop alerts on, stock alerts off.
 *
 * Not arbitrary: the sign-up form has carried `wantsDropAlerts: true` since
 * Phase 4, and two screens offering the same choice with opposite defaults
 * is the kind of disagreement nobody notices until it is confusing.
 *
 * The two notification sources added at v3 slice 4 follow the same reading.
 * An order changing state is about something the shopper is already waiting
 * for, so it is on; a code five days from expiring is a nudge nobody asked
 * for, so it is off until they do.
 */
export const DEFAULT_PREFS: Prefs = {
  dropOpen: true,
  savedLow: false,
  emailOnStatus: true,
  notifOrders: true,
  notifPromo: false,
  size: null,
};

export function setPref(prefs: Prefs, key: PrefKey, on: boolean): Prefs {
  return { ...prefs, [key]: on };
}

/**
 * Remember a size, or forget the one that was remembered.
 *
 * Passing the size that is already stored is how the switch turns itself
 * off, so the caller never has to know which of the two it is doing.
 */
export function setSizePref(prefs: Prefs, size: Size | null): Prefs {
  return { ...prefs, size };
}

// ─────────────────────────────────────────────────────────────── storage
export function serializePrefs(prefs: Prefs): string {
  return JSON.stringify({ v: SCHEMA_VERSION, prefs });
}

/**
 * Read them back. Never throws and never returns junk — what is in storage
 * came from another tab, an older build, or devtools.
 *
 * A record missing one of the two keys keeps the default for that key
 * rather than being thrown away whole: a switch added later must not wipe
 * the answer somebody already gave to the other one.
 */
export function parsePrefs(raw: string | null): Prefs {
  if (!raw) return DEFAULT_PREFS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFS;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    (parsed as { v?: unknown }).v !== SCHEMA_VERSION
  ) {
    return DEFAULT_PREFS;
  }

  const stored = (parsed as { prefs?: unknown }).prefs;
  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) {
    return DEFAULT_PREFS;
  }

  const read = (key: PrefKey): boolean => {
    const v = (stored as Record<string, unknown>)[key];
    return typeof v === "boolean" ? v : DEFAULT_PREFS[key];
  };
  const booleans = Object.fromEntries(PREF_KEYS.map((k) => [k, read(k)])) as Record<
    PrefKey,
    boolean
  >;

  // A size from storage is checked against the list it has to come from,
  // like every other value read from outside the program: a stale "XXL" from
  // an older catalog would otherwise preselect a row that is not on screen.
  const rawSize = (stored as Record<string, unknown>).size;
  const size = (SIZES as readonly string[]).includes(rawSize as string)
    ? (rawSize as Size)
    : null;

  return { ...booleans, size };
}
