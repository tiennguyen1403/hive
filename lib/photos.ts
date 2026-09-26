/**
 * Every photo's URL, whatever kind of photo it is — the one place they are
 * built, so a new kind of photo is one branch here and not thirty screens.
 *
 * FOUR KINDS OF KEY, told apart by shape and by the lists that name them:
 *
 * · an UPLOAD (`up/<hex>.webp`), the back office's own photo — below;
 * · a SHOT (`shot-khoi-black`), a photograph that ships with the app — below;
 * · a FLAT (`flat-tee-white`), a fixed style's drawing — below;
 * · anything else is a BORROWED Unsplash frame (`PHOTO_IDS`), standing in
 *   where no photograph of the style exists yet: Số 03 and 04, the teasers
 *   of Số 06, and the cover of the home page. A borrowed frame is never the
 *   garment it stands for, and the back office says so ("mượn tạm").
 *
 * SHOTS (v3 slice 14). Số 05 has its own photographs: a packshot for every
 * colourway and a lookbook frame beside each, in `public/shots/`, made with
 * ChatGPT and put into one frame and one paper by `scripts/shots.ts`
 * (`lib/shots.ts` lists them). The packshot is the colour's photo wherever a
 * photo is shown; the lookbook frame is reached only through `lookbookUrl`,
 * which the product page's gallery alone calls. A `shot-…` key with no file
 * falls back to the hero frame, like any key this file does not know.
 *
 * UPLOADS (slice B3c). A photo the back office uploads is an object in
 * the `product-photos` bucket named `up/<32 hex>.webp` (or `.jpg`), and the
 * app serves it from its own origin — `/photos/<key>`, a route that streams
 * it from the bucket (`app/photos/[...key]/route.ts`). So an uploaded key and
 * a borrowed one travel the same way: a `photoKeys` entry, turned into a URL
 * here and handed to `next/image`, and the browser still never talks to
 * Supabase. The two kinds tell themselves apart by shape (`isUploadedKey`).
 *
 * FLATS (v3 slice 11). The eight fixed styles have no photos yet; each of
 * their colourways carries a `flat-<shape>-<colour>` key, and the shop serves
 * the garment's flat drawing for it from its own `public/flats/` — seventeen
 * PNG files drawn by `scripts/flats.ts` from `lib/flats.ts`. They are not in
 * `PHOTO_IDS`: the back office's list of borrowed frames (`PHOTO_KEYS`) and
 * the teaser sheet stay as they are until the back-office slice decides.
 *
 * Pure and free of `server-only`: the storefront's client components build
 * their image URLs with it.
 */

import { flatPath } from "./flats";
import { isShotKey, lookPath, shotPath } from "./shots";

const UNSPLASH = "https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w={w}&q={q}";

/** Unsplash photo id per borrowed key. */
const PHOTO_IDS: Record<string, string> = {
  hero: "1593278641722-49b1047ede21",
  khoi: "1503341338985-c0477be52513",
  bui: "1620799140188-3b2a02fd9a77",
  nguoi: "1680292783974-a9a336c10366",
  nang: "1503341504253-dff4815485f1",
  suong: "1564557287817-3785e38ec1f5",
  muoi: "1601063476271-a159c71ab0b3",
  than: "1508216310976-c518daae0cdc",
  cat: "1578768079052-aa76e52ff62e",
  gio: "1615397587950-3cbb55f95b77",
  da: "1542406775-ade58c52d2e4",
  reu: "1611817757591-c3f345024273",
  tro: "1614214191247-5b2d3a734f1b",
  song: "1688111421205-a0a85415b224",
  vo: "1565978771542-0db9ab9ad3de",
  mua: "1633292750937-120a94f5c2bb",
  kho: "1542327534-59a1fe8daf73",
  dat: "1632682582909-2b3a2581eef7",
  lua: "1561151593-7059b6b4ff57",
};

/**
 * The URL of a photo, for `next/image`.
 *
 * An uploaded key is a path of this app, `/photos/up/<hex>.webp`: `next/image`
 * optimises a local path itself (`/_next/image?url=%2Fphotos%2F…&w=…`), so the
 * width and quality asked for here do not apply to it — the optimiser picks
 * its own width per screen, and the object in the bucket is already cropped
 * and shrunk by the browser that uploaded it. A borrowed key is an Unsplash
 * URL asking for that width and quality, as before; an unknown one falls back
 * to the hero frame.
 *
 * A shot's key is a file of this app, `/shots/khoi-black.webp` — its
 * packshot — and a flat's key one too, `/flats/tee-white.png`; `next/image`
 * optimises both like an upload. Only the files that exist (`isShotKey`,
 * `isFlatKey`); any other `shot-…` or `flat-…` key is unknown and falls back.
 */
export function photoUrl(key: string, width: number, quality = 70): string {
  if (isUploadedKey(key)) return `/photos/${key}`;
  const shot = shotPath(key);
  if (shot) return shot;
  const flat = flatPath(key);
  if (flat) return flat;
  const id = PHOTO_IDS[key] ?? PHOTO_IDS.hero!;
  return UNSPLASH.replace("{id}", id)
    .replace("{w}", String(width))
    .replace("{q}", String(quality));
}

export const PHOTO_KEYS = Object.keys(PHOTO_IDS);

/**
 * The lookbook frame that goes with a colour's photo — `/shots/khoi-black-look.webp`
 * — or null when the key has none: a borrowed frame, a flat, an upload (a
 * colour whose packshot was replaced has lost the frame that showed it), a
 * shot made without one. Derived from the key; there is no column for it.
 */
export function lookbookUrl(key: string): string | null {
  return lookPath(key);
}

/**
 * Whether a key is a photograph of the style itself — one the back office
 * uploaded, or one that ships with the app (`shot-…`) — rather than a
 * borrowed stand-in or a drawing. The back office calls both "ảnh thật".
 * Whether a file is in the bucket is a different question: `isUploadedKey`.
 */
export function isRealPhotoKey(key: string): boolean {
  return isUploadedKey(key) || isShotKey(key);
}

// ─────────────────────────────────────────────────────────── uploaded photos
/**
 * The shape of an uploaded photo's key: `up/`, 32 lower-case hex digits (a
 * random UUID without its dashes) and the extension of what was stored. The
 * same pattern is in `public.photo_key_ok()`, the route that serves it and the
 * Server Action that names it — the key is random, so an object never changes
 * under a URL and may be cached for good.
 */
export const UPLOAD_KEY_RE = /^up\/[0-9a-f]{32}\.(webp|jpg)$/;

/** Whether a photo key names an upload rather than a borrowed frame. */
export function isUploadedKey(key: unknown): key is string {
  return typeof key === "string" && UPLOAD_KEY_RE.test(key);
}

/**
 * The largest file the Server Action takes — 1,5 MB, which the bucket's own
 * `file_size_limit` repeats (1 572 864 bytes). The browser crops to 4:5 and
 * shrinks to at most 1 200 × 1 500 before sending, which lands far below it.
 */
export const MAX_UPLOAD_BYTES = 1_572_864;

/** The two formats a photo may arrive in, and the extension each is stored under. */
export const UPLOAD_TYPES = { "image/webp": "webp", "image/jpeg": "jpg" } as const;

export type UploadType = keyof typeof UPLOAD_TYPES;

/** The type an extension was stored as — what the photo route answers with. */
export function uploadTypeOf(key: string): UploadType {
  return key.endsWith(".jpg") ? "image/jpeg" : "image/webp";
}

/**
 * What the first bytes of a file say it is, whatever it was called: a WebP
 * file is a RIFF container whose form type is `WEBP` (bytes 0–3 `RIFF`, 8–11
 * `WEBP`), a JPEG starts with `FF D8 FF`. Null for anything else — a PNG, a
 * renamed text file, an empty file.
 */
export function sniffImageType(bytes: Uint8Array): UploadType | null {
  const at = (i: number, ...expected: number[]) => expected.every((b, k) => bytes[i + k] === b);
  if (bytes.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) {
    return "image/webp";
  }
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  return null;
}

/**
 * Why a file cannot be stored, or null when it can: not empty, not over
 * 1,5 MB, declared as WebP or JPEG, and its first bytes agreeing with what it
 * was declared as. The declared type is the browser's word; the bytes are the
 * file's own.
 */
export function uploadProblem(
  declaredType: string,
  size: number,
  head: Uint8Array,
): "EMPTY" | "TOO_BIG" | "NOT_AN_IMAGE" | null {
  if (size <= 0) return "EMPTY";
  if (size > MAX_UPLOAD_BYTES) return "TOO_BIG";
  if (!(declaredType in UPLOAD_TYPES)) return "NOT_AN_IMAGE";
  return sniffImageType(head) === declaredType ? null : "NOT_AN_IMAGE";
}

/** `up/<hex>.<ext>` for a random id — `crypto.randomUUID()` in the action. */
export function uploadKey(uuid: string, type: UploadType): string {
  return `up/${uuid.replace(/-/g, "").toLowerCase()}.${UPLOAD_TYPES[type]}`;
}
