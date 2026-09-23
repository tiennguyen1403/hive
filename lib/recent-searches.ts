import { fold } from "./catalog-query";

/**
 * "Tìm gần đây · trên thiết bị này".
 *
 * There is no server and no account behind this — nothing is sent anywhere.
 * The list is what THIS browser typed into the search box, kept in its own
 * storage, and the heading on screen says exactly that. It is the same shape
 * as `lib/reminder.ts`: pure functions here, storage and React in
 * `components/shop/recent-searches.ts`.
 *
 * Newest first, because the thing you just looked for is the thing you are
 * most likely to look for again — and because a list that only ever grows at
 * the end pushes the useful end off the edge of a scrolling chip row.
 */

export const RECENT_SEARCH_STORAGE_KEY = "brand.searches";
const SCHEMA_VERSION = 1;

/**
 * Eight. Long enough that yesterday's search is still there, short enough
 * that the row never becomes a second screen of its own — the chips wrap, so
 * an uncapped list would push the results off a phone.
 */
export const RECENT_SEARCH_CAP = 8;

/** Terms as they were typed, newest first. */
export type RecentSearches = string[];

/**
 * Put a term at the front, and take the old copy of it away.
 *
 * Matching is done on the FOLDED form, so "Khói", "khoi" and "  KHOI " are
 * one entry rather than three — a shopper who retypes the same word with
 * different accents has not searched for something new. What gets stored is
 * the newest spelling, because that is the one they just chose to type.
 *
 * `hits` is how many styles the search actually found, and a search that
 * found NOTHING is not remembered. The row is offered as a shortcut back to
 * something; a chip that replays "zzzz" and lands on the empty state again
 * is the same dead end twice, and it pushes a term that did work off the
 * end of the list to get there.
 */
export function rememberSearch(
  list: RecentSearches,
  term: string,
  hits: number,
): RecentSearches {
  const trimmed = term.trim();
  if (!trimmed || hits <= 0) return list;

  const key = fold(trimmed);
  const without = list.filter((t) => fold(t) !== key);
  return [trimmed, ...without].slice(0, RECENT_SEARCH_CAP);
}

// ─────────────────────────────────────────────────────────────────── storage
export function serializeSearches(list: RecentSearches): string {
  return JSON.stringify({ v: SCHEMA_VERSION, terms: list });
}

/**
 * Read the list back, treating whatever is in storage as input from a
 * stranger: another tab, an older build, or someone typing into devtools.
 * Anything that is not a non-empty string is dropped rather than rendered.
 */
export function parseSearches(raw: string | null): RecentSearches {
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

  const terms = (parsed as { terms?: unknown }).terms;
  if (!Array.isArray(terms)) return [];

  const seen = new Set<string>();
  const out: RecentSearches = [];
  for (const t of terms) {
    if (typeof t !== "string") continue;
    const trimmed = t.trim();
    if (!trimmed) continue;
    const key = fold(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length === RECENT_SEARCH_CAP) break;
  }
  return out;
}
