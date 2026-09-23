/**
 * Borrowed photography, and the one place it is borrowed from.
 *
 * PRODUCT.md is explicit: this project has no product photography. Every
 * image on every screen is an Unsplash stand-in. Two consequences are built
 * into this file rather than left to remember:
 *
 * · Every URL is built here, so the day real photos arrive the swap is one
 *   function, not thirty screens.
 * · The open drop needs 21 photo sets (one per colourway) and the borrowed
 *   library has 18 usable frames, so three appear twice across the grid.
 *   That repetition is a mark of the placeholder, not of the design.
 *
 * REAL PHOTOS (slice B3c). A photo the back office uploads is an object in
 * the `product-photos` bucket named `up/<32 hex>.webp` (or `.jpg`), and the
 * app serves it from its own origin — `/photos/<key>`, a route that streams
 * it from the bucket (`app/photos/[...key]/route.ts`). So an uploaded key and
 * a borrowed one travel the same way: a `photoKeys` entry, turned into a URL
 * here and handed to `next/image`, and the browser still never talks to
 * Supabase. The two kinds tell themselves apart by shape (`isUploadedKey`).
 *
 * Pure and free of `server-only`: the storefront's client components build
 * their image URLs with it.
 */

const UNSPLASH = "https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w={w}&q={q}";

/** Photo id per key. Keys are the catalog's `photoKeys`. */
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
 */
export function photoUrl(key: string, width: number, quality = 70): string {
  if (isUploadedKey(key)) return `/photos/${key}`;
  const id = PHOTO_IDS[key] ?? PHOTO_IDS.hero!;
  return UNSPLASH.replace("{id}", id)
    .replace("{w}", String(width))
    .replace("{q}", String(quality));
}

export const PHOTO_KEYS = Object.keys(PHOTO_IDS);

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
