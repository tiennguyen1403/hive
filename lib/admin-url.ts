/**
 * The back office's filters live in the ADDRESS BAR (QĐ-8).
 *
 * A tab, a chip, a page number and a search term are all part of what the
 * screen is showing, so they belong where Back, a reload and a copied link
 * can all find them. That decision is old; what this module adds is the one
 * place the hrefs are built, because a table has four of them at once and
 * hand-rolling `?state=…&pay=…&page=…` per control is how a chip ends up
 * silently dropping the tab somebody was on.
 *
 * Pure, so the rules are tested without a router.
 */

/** A query string flattened to its first value per key. */
export type Query = Record<string, string | undefined>;

/** Next hands a page `string | string[] | undefined`; take the first. */
export function queryOf(sp: Record<string, string | string[] | undefined>): Query {
  const q: Query = {};
  for (const [key, value] of Object.entries(sp)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined && first !== "") q[key] = first;
  }
  return q;
}

/**
 * The same address with some keys changed.
 *
 * `null` REMOVES a key rather than writing an empty one, so "Tất cả" gives
 * back a clean `/admin/orders` instead of `/admin/orders?state=`. Keys come
 * out sorted, so the same view always has the same address and the browser
 * treats two renders of it as one page.
 */
export function hrefWith(
  path: string,
  current: Query,
  patch: Record<string, string | number | null | undefined> = {},
): string {
  const next: Query = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") delete next[key];
    else next[key] = String(value);
  }
  const pairs = Object.entries(next)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  if (pairs.length === 0) return path;
  const search = pairs
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
    .join("&");
  return `${path}?${search}`;
}

/** `?page=` as a 1-based page number. Anything else is page 1. */
export function pageOf(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** The sizes the "N dòng mỗi trang" chip offers. */
export const PER_PAGE_CHOICES = [10, 25, 50] as const;
export type PerPage = (typeof PER_PAGE_CHOICES)[number];

export function perPageOf(raw: string | undefined): PerPage {
  const n = Number(raw);
  return (PER_PAGE_CHOICES as readonly number[]).includes(n) ? (n as PerPage) : 10;
}

export interface Paged<T> {
  rows: T[];
  page: number;
  pages: number;
  /** Where the page starts in the whole list, 1-based, for "Hiện 1–10 / 24". */
  from: number;
  to: number;
  total: number;
}

/**
 * One page of a list.
 *
 * A page number past the end lands on the LAST page rather than on an empty
 * table: the usual way to get there is deleting a filter's worth of rows
 * while `?page=3` is still in the address, and an empty screen would read as
 * "nothing matches" when in fact plenty does.
 */
export function paginate<T>(rows: T[], page: number, per: number): Paged<T> {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / per));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * per;
  return {
    rows: rows.slice(start, start + per),
    page: current,
    pages,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(total, start + per),
    total,
  };
}
