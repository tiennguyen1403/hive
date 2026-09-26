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
 * Pure and free of `server-only`, like `lib/flats.ts`: the storefront's
 * client components build their image URLs from it. `lib/shots.test.ts`
 * holds the list to the files on disk and to the catalogue.
 */

export interface Shot {
  /** The style's stem, as `data/catalog.ts` writes it: `khoi`. */
  style: string;
  color: ColorKey;
  /** Whether a lookbook frame is there beside the packshot. */
  look: boolean;
}

/**
 * The photographs there are files for, in catalogue and band order. Every
 * entry has `public/shots/<style>-<colour>.webp`; one with `look` also has
 * `public/shots/<style>-<colour>-look.webp`.
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
];

/** `shot-khoi-black`, the photo key a colourway with a packshot carries. */
export function shotKey(style: string, color: ColorKey): string {
  return `shot-${style}-${color}`;
}

/** Where the files are served from: `public/shots/`. */
export const SHOT_DIR = "/shots";

/** `khoi-black` — the name both files share, before `.webp` or `-look.webp`. */
export function shotName(shot: Shot): string {
  return `${shot.style}-${shot.color}`;
}

const BY_KEY: ReadonlyMap<string, Shot> = new Map(SHOTS.map((s) => [shotKey(s.style, s.color), s]));

/** Every key there is a packshot for. */
export const SHOT_KEYS: readonly string[] = [...BY_KEY.keys()];

/** Whether a photo key names one of the packshots in `public/shots/`. */
export function isShotKey(key: string): boolean {
  return BY_KEY.has(key);
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
