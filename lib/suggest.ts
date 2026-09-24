import { COLORS } from "@/data/colors";
import {
  COLOR_KEYS,
  FAMILIES,
  FAMILY_LABELS,
  FAMILY_SHORT_LABELS,
  type ColorKey,
  type Family,
  type Fit,
  type Product,
} from "@/data/types";
import {
  EMPTY_QUERY,
  FITS,
  FIT_LABELS,
  foldName,
  isNameSeparator,
  listingHref,
} from "./catalog-query";
import { styleName } from "./lexicon";

/**
 * What the search box offers while a term is being typed.
 *
 * It reads the pool it is handed and nothing else — every style on sale
 * since v3 slice 11, the open issue's and the fixed ones — because there is
 * no server to ask, no query log to rank by, and no index to build: eighteen
 * styles fit in a loop. Everything on screen is therefore a fact the catalog
 * already holds, which is also what keeps it honest (DESIGN.md §9 rule 1).
 *
 * Two groups and a way out:
 * · MẪU — styles whose name, kind, family or colourway carries the term.
 * · LOẠI — the family, the fit or the colour itself, as a filter to open.
 * · the last row is always "Tìm «kh» trong 18 mẫu", so the list never has to
 *   be the answer: pressing Enter is still the way to the full result page.
 *
 * Matching is accent-insensitive through `fold`, because a shopper in a hurry
 * types "khoac" and means "khoác" — and blind to how words are spaced or
 * dashed apart (`foldName`), because a style of an issue is shown as "S05 –
 * KHÓI" and is typed "s05 khoi" (v3 slice 11).
 */

/** Below this many characters the list is noise, so it does not open. */
export const SUGGEST_MIN = 2;
export const MAX_STYLES = 4;
export const MAX_GROUPS = 3;

/** Where the term sits inside the label, so the view can `<mark>` it. */
export type MatchRange = readonly [start: number, end: number];

export interface StyleSuggestion {
  product: Product;
  /**
   * The name as the shop shows it — "S05 – KHÓI" for a style of an issue,
   * the bare name for a fixed one (`styleName`, v3 slice 11). The term is
   * matched against this, so "s05" finds every style of Số 05.
   */
  name: string;
  /**
   * Where the term sits in `name`. Null when the term matched the kind or
   * the colour rather than the name.
   */
  range: MatchRange | null;
}

export interface GroupSuggestion {
  /** `"family:JACKET"` — stable, for React keys and `aria-activedescendant`. */
  id: string;
  /** Shown as-is: "Khoác", "Oversize", "Đen". */
  label: string;
  range: MatchRange | null;
  /** How many styles of the issue are behind it. */
  styles: number;
  /** The cheapest of them — "từ 1.350.000₫". */
  fromVnd: number;
  href: string;
}

export interface Suggestions {
  styles: StyleSuggestion[];
  groups: GroupSuggestion[];
  /**
   * Nothing matched, so `groups` is the three biggest families instead of a
   * list of matches. The view titles that group differently, because
   * offering "Áo thun" as a match for "zzz" would be a lie.
   */
  fallback: boolean;
}

/**
 * Where `term` sits inside `text`, ignoring accents and case.
 *
 * The folded string is built one character at a time and each folded
 * character remembers which original character it came from, so the range
 * that comes back indexes the ORIGINAL text — "KHÓI" highlights `KH`, not the
 * `KH` of some flattened copy that is never on screen. Folding the whole
 * string at once and reusing the index would work today and break the first
 * time a character folds to two, or to none.
 *
 * Spaces and dashes are folded the way `foldName` folds the term: a run of
 * them is one space. "S05 – KHÓI" carries a no-break space and an en dash
 * that nobody types, and "s05 khoi" still marks all of it (v3 slice 11).
 */
export function matchRange(text: string, term: string): MatchRange | null {
  const needle = foldName(term);
  if (!needle) return null;

  let folded = "";
  const at: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    let piece: string;
    if (isNameSeparator(c)) {
      if (folded === "" || folded.endsWith(" ")) continue;
      piece = " ";
    } else {
      piece = foldPiece(c);
    }
    for (let k = 0; k < piece.length; k++) at.push(i);
    folded += piece;
  }

  const found = folded.indexOf(needle);
  if (found === -1) return null;

  const start = at[found] ?? 0;
  const after = at[found + needle.length];
  return [start, after === undefined ? text.length : after];
}

/**
 * `fold` for ONE character.
 *
 * `fold` trims, which is right for a whole term and wrong per character: a
 * space would fold to nothing, "Áo thun" would flatten to "aothun", and
 * someone typing "áo thun" would be told the issue has no t-shirts. Same
 * three substitutions, no trim.
 */
function foldPiece(c: string): string {
  return c
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

/** Does any of these strings carry the term? */
function hits(term: string, ...fields: string[]): boolean {
  return fields.some((f) => matchRange(f, term) !== null);
}

function colorLabelsOf(p: Product): string[] {
  return p.colors.map((c) => COLORS[c].label);
}

export function suggestFor(pool: Product[], rawTerm: string): Suggestions {
  const term = rawTerm.trim();
  if (term.length < SUGGEST_MIN) return { styles: [], groups: [], fallback: false };

  const styles: StyleSuggestion[] = [];
  for (const p of pool) {
    const name = styleName(p.name, p.dropNo);
    const inName = matchRange(name, term);
    const matched =
      inName !== null ||
      hits(
        term,
        p.kind,
        FAMILY_LABELS[p.family],
        FAMILY_SHORT_LABELS[p.family],
        ...colorLabelsOf(p),
      );
    if (matched) styles.push({ product: p, name, range: inName });
    if (styles.length === MAX_STYLES) break;
  }

  const groups = matchingGroups(pool, term);
  if (styles.length === 0 && groups.length === 0) {
    return { styles: [], groups: biggestFamilies(pool), fallback: true };
  }
  return { styles, groups, fallback: false };
}

// ─────────────────────────────────────────────────────── the "Loại" group
interface Candidate {
  id: string;
  label: string;
  /** The long form, for a term like "áo khoác" that the short label drops. */
  alias: string;
  members: Product[];
  href: string;
}

function candidates(pool: Product[]): Candidate[] {
  const out: Candidate[] = [];

  for (const family of FAMILIES) {
    const members = pool.filter((p) => p.family === family);
    if (members.length === 0) continue;
    out.push({
      id: `family:${family}`,
      label: FAMILY_SHORT_LABELS[family],
      alias: FAMILY_LABELS[family],
      members,
      href: hrefFor({ families: [family] }),
    });
  }

  for (const fit of FITS) {
    const members = pool.filter((p) => p.fit === fit);
    if (members.length === 0) continue;
    out.push({
      id: `fit:${fit}`,
      label: FIT_LABELS[fit],
      alias: FIT_LABELS[fit],
      members,
      href: hrefFor({ fits: [fit] }),
    });
  }

  for (const color of COLOR_KEYS) {
    const members = pool.filter((p) => p.colors.includes(color));
    if (members.length === 0) continue;
    out.push({
      id: `color:${color}`,
      label: COLORS[color].label,
      alias: COLORS[color].label,
      members,
      href: hrefFor({ colors: [color] }),
    });
  }

  return out;
}

function hrefFor(part: {
  families?: Family[];
  fits?: Fit[];
  colors?: ColorKey[];
}): string {
  return listingHref("/products", { ...EMPTY_QUERY, ...part });
}

function toSuggestion(c: Candidate, term: string): GroupSuggestion {
  return {
    id: c.id,
    label: c.label,
    range: matchRange(c.label, term),
    styles: c.members.length,
    fromVnd: Math.min(...c.members.map((p) => p.priceVnd)),
    href: c.href,
  };
}

function matchingGroups(pool: Product[], term: string): GroupSuggestion[] {
  return candidates(pool)
    .filter((c) => hits(term, c.label, c.alias))
    // The one with the most behind it first: a row that opens three styles is
    // worth more of the four lines on a phone than one that opens a single
    // style. Ties keep catalog order, so the list does not reshuffle.
    .sort((a, b) => b.members.length - a.members.length)
    .slice(0, MAX_GROUPS)
    .map((c) => toSuggestion(c, term));
}

/**
 * What to offer when the term matched nothing at all.
 *
 * The three families the issue has most of — the largest true statements
 * available about what IS in the shop. Not "did you mean": a guess at the
 * intended word needs a dictionary of the language, and there is none here.
 */
function biggestFamilies(pool: Product[]): GroupSuggestion[] {
  return candidates(pool)
    .filter((c) => c.id.startsWith("family:"))
    .sort((a, b) => b.members.length - a.members.length)
    .slice(0, MAX_GROUPS)
    .map((c) => ({ ...toSuggestion(c, ""), range: null }));
}
