import type { ColorKey } from "@/data/types";

/**
 * SHOTS — the photographs that ship with the app (v3 slice 14).
 *
 * Every colourway of Số 05 has a packshot: the garment on an invisible
 * mannequin against the studio paper, and beside it a lookbook frame of a
 * model wearing that colour. Both were made with ChatGPT (GPT Image) from the
 * prompts in `tasks/anh-san-pham-prompt.md` and `tasks/lookbook-register.md`,
 * then put into one frame and one paper tone by `scripts/shots.ts`, which
 * writes them to `public/shots/` and embeds that provenance in each file.
 *
 * A colourway names its packshot with the key `shot-<style>-<colour>` in
 * `photoKeys`, `<style>` being the style's stem (`khoi`, not `s05-khoi`).
 * The packshot is the photo of that colour everywhere a photo is shown; the
 * lookbook frame is derived from the same key and only ever appears as the
 * second frame of the product page's gallery. There is no column for it: a
 * colour whose packshot the back office replaces with an upload loses its
 * lookbook frame, which is right — that frame showed the garment it replaced.
 *
 * A teaser's packshot (Số 06, round v6, 08/10/2026) is the same key without
 * the colour — `shot-<stem>`, the stem being its name's segment
 * (`out-of-character`, not `s06-out-of-character`), as a style's is — since a
 * teaser has one photo and no colourways; it has no lookbook frame. Made with
 * Qwen-Image-2.1 rather than ChatGPT, and put into the same frame and paper
 * by the same script, which reads its prompt from the run that made it.
 *
 * Pure and free of `server-only`, like `lib/flats.ts`: the storefront's
 * client components build their image URLs from it. `lib/shots.test.ts`
 * holds the list to the files on disk and to the catalogue.
 */

export interface Shot {
  /** The style's stem, as `data/catalog.ts` writes it: `khoi`; a teaser's, its slug without the issue: `out-of-character`. */
  style: string;
  /** The colourway; absent on a teaser's packshot, which has one photo and no colour. */
  color?: ColorKey;
  /** Whether a lookbook frame is there beside the packshot. */
  look: boolean;
}

/**
 * The photographs there are files for, in catalogue and band order. Every
 * entry has `public/shots/<name>.webp` (`shotName`: `khoi-black`, or a
 * teaser's `out-of-character`); one with `look` also has
 * `public/shots/<name>-look.webp`.
 */
export const SHOTS: readonly Shot[] = [
  // Số 05, 26/09/2026: 21 colourways, a packshot and a lookbook frame each.
  { style: "khoi", color: "black", look: true },
  { style: "khoi", color: "cream", look: true },
  { style: "bui", color: "black", look: true },
  { style: "bui", color: "grey", look: true },
  { style: "nguoi", color: "black", look: true },
  { style: "nang", color: "white", look: true },
  { style: "nang", color: "cream", look: true },
  { style: "nang", color: "moss", look: true },
  { style: "suong", color: "black", look: true },
  { style: "suong", color: "moss", look: true },
  { style: "muoi", color: "black", look: true },
  { style: "muoi", color: "grey", look: true },
  { style: "than", color: "black", look: true },
  { style: "than", color: "navy", look: true },
  { style: "cat", color: "cream", look: true },
  { style: "cat", color: "white", look: true },
  { style: "cat", color: "brown", look: true },
  { style: "gio", color: "white", look: true },
  { style: "gio", color: "navy", look: true },
  { style: "da", color: "moss", look: true },
  { style: "da", color: "black", look: true },
  // Số 06's teasers, 08/10/2026: a packshot each (Qwen-Image-2.1), no colour, no lookbook frame.
  { style: "out-of-character", look: false },
  { style: "still-in-motion", look: false },
  { style: "midnight-unedited", look: false },
  { style: "for-reference-only", look: false },
];

/** `shot-khoi-black`, the photo key a colourway with a packshot carries; `shot-out-of-character`, a teaser's. */
export function shotKey(style: string, color?: ColorKey): string {
  return color === undefined ? `shot-${style}` : `shot-${style}-${color}`;
}

/** Where the files are served from: `public/shots/`. */
export const SHOT_DIR = "/shots";

/** `khoi-black` (a teaser's: `out-of-character`) — the name both files share, before `.webp` or `-look.webp`. */
export function shotName(shot: Shot): string {
  return shot.color === undefined ? shot.style : `${shot.style}-${shot.color}`;
}

const BY_KEY: ReadonlyMap<string, Shot> = new Map(SHOTS.map((s) => [shotKey(s.style, s.color), s]));

/** Every key there is a packshot for. */
export const SHOT_KEYS: readonly string[] = [...BY_KEY.keys()];

/** Whether a photo key names one of the packshots in `public/shots/`. */
export function isShotKey(key: string): boolean {
  return BY_KEY.has(key);
}

/**
 * Whether a photo key names a teaser's own packshot — one without a colour,
 * made for that teaser and for nothing else (round v6). A colourway's
 * packshot is another style's photo, and a teaser wearing one is not shown in it.
 */
export function isTeaserShotKey(key: string): boolean {
  const s = BY_KEY.get(key);
  return s !== undefined && s.color === undefined;
}

/** The photograph a known key names, or null for any other key. */
export function shotOf(key: string): Shot | null {
  return BY_KEY.get(key) ?? null;
}

/** `/shots/khoi-black.webp` — the packshot of a known key, or null. */
export function shotPath(key: string): string | null {
  const s = BY_KEY.get(key);
  return s ? `${SHOT_DIR}/${shotName(s)}.webp` : null;
}

/** `/shots/khoi-black-look.webp` — the lookbook frame of a known key, or null when it has none. */
export function lookPath(key: string): string | null {
  const s = BY_KEY.get(key);
  return s?.look ? `${SHOT_DIR}/${shotName(s)}-look.webp` : null;
}
