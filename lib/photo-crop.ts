/**
 * The crop frame of the style form (v3 slice 7, QĐ-27): a 4:5 region of a
 * photo the manager picked, chosen by dragging a frame over it.
 *
 * Every number here is in the photo's OWN pixels (its natural width and
 * height), never in screen pixels: the sheet divides a pointer's movement by
 * the scale it drew the photo at before it calls these, so the same drag
 * means the same region whatever size the sheet happens to be.
 *
 * The arithmetic is copied from the approved mock (`prototype/v3/
 * product-crop.js`, round 7b): the frame keeps 4:5, is at least 200 pixels
 * wide (or the whole photo when the photo is smaller), never leaves the
 * photo, and a corner handle keeps the OPPOSITE corner where it is while the
 * larger of the two pulls decides the size. Pure, so the sheet and the tests
 * agree on what a drag does.
 */

/** A region of a photo, in its own pixels. `h` is always `w × 1,25`. */
export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Height over width: every photo on the shop is 4:5. */
export const CROP_RATIO = 1.25;

/** The narrowest frame the sheet allows, unless the photo itself is narrower. */
export const MIN_CROP_WIDTH = 200;

/**
 * The widest photo the browser sends: 1 200 × 1 500. The product page never
 * draws a photo wider than this, and it keeps a WebP well under the 1,5 MB
 * the upload takes.
 */
export const MAX_OUTPUT_WIDTH = 1_200;

/** Narrower than this, the photo is blurred on the product page — the sheet says so. */
export const SHARP_WIDTH = 800;

/** One arrow press moves the frame this far; with Shift, `NUDGE_FAR`. */
export const NUDGE = 8;
export const NUDGE_FAR = 40;

/** `+` grows the frame by 5 %; `−` shrinks it by the same factor. */
export const ZOOM_STEP = 1.05;

/** The four corners a frame can be pulled by. */
export type Handle = "nw" | "ne" | "sw" | "se";

export function isHandle(value: unknown): value is Handle {
  return value === "nw" || value === "ne" || value === "sw" || value === "se";
}

/** The largest 4:5 frame the photo holds, centred — where the sheet opens. */
export function defaultCrop(nw: number, nh: number): Crop {
  const w = Math.min(nw, nh / CROP_RATIO);
  const h = w * CROP_RATIO;
  return { x: (nw - w) / 2, y: (nh - h) / 2, w, h };
}

/**
 * A frame put back inside the rules: 4:5, no narrower than 200 pixels (or
 * the whole photo), no wider than the photo allows, and wholly on it.
 */
export function clampCrop(c: Crop, nw: number, nh: number): Crop {
  const largest = Math.min(nw, nh / CROP_RATIO);
  const smallest = Math.min(MIN_CROP_WIDTH, largest);
  const w = Math.max(smallest, Math.min(c.w, largest));
  const h = w * CROP_RATIO;
  return {
    x: Math.max(0, Math.min(c.x, nw - w)),
    y: Math.max(0, Math.min(c.y, nh - h)),
    w,
    h,
  };
}

/** The frame dragged by its middle: the same size, moved, stopped at the edges. */
export function moveCrop(start: Crop, dx: number, dy: number, nw: number, nh: number): Crop {
  return clampCrop({ ...start, x: start.x + dx, y: start.y + dy }, nw, nh);
}

/**
 * The frame pulled by one corner. The opposite corner stays put; of the two
 * pulls — across, and down scaled to a width — the larger decides the new
 * width, so a diagonal drag does what the hand meant. The frame can grow only
 * as far as the photo goes on the handle's side, and not below 200 pixels
 * unless that is all the room there is.
 */
export function resizeFromHandle(
  start: Crop,
  handle: Handle,
  dx: number,
  dy: number,
  nw: number,
  nh: number,
): Crop {
  const sx = handle === "ne" || handle === "se" ? 1 : -1;
  const sy = handle === "sw" || handle === "se" ? 1 : -1;
  const across = sx * dx;
  const down = (sy * dy) / CROP_RATIO;
  const pull = Math.abs(across) >= Math.abs(down) ? across : down;
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  const room = Math.min(sx > 0 ? nw - start.x : right, (sy > 0 ? nh - start.y : bottom) / CROP_RATIO);
  const w = Math.max(Math.min(MIN_CROP_WIDTH, room), Math.min(start.w + pull, room));
  const h = w * CROP_RATIO;
  return clampCrop(
    { x: sx > 0 ? start.x : right - w, y: sy > 0 ? start.y : bottom - h, w, h },
    nw,
    nh,
  );
}

/**
 * What a key does to the frame: the arrows move it 8 pixels (40 with Shift),
 * `+` (or `=`, the same key unshifted) grows it 5 %, `-` shrinks it. Null for
 * any other key, so the sheet leaves that key alone.
 */
export function keyCrop(c: Crop, key: string, shift: boolean, nw: number, nh: number): Crop | null {
  const step = shift ? NUDGE_FAR : NUDGE;
  let next: Crop;
  switch (key) {
    case "ArrowLeft":
      next = { ...c, x: c.x - step };
      break;
    case "ArrowRight":
      next = { ...c, x: c.x + step };
      break;
    case "ArrowUp":
      next = { ...c, y: c.y - step };
      break;
    case "ArrowDown":
      next = { ...c, y: c.y + step };
      break;
    case "+":
    case "=":
      next = { ...c, w: c.w * ZOOM_STEP, h: c.w * ZOOM_STEP * CROP_RATIO };
      break;
    case "-":
      next = { ...c, w: c.w / ZOOM_STEP, h: (c.w / ZOOM_STEP) * CROP_RATIO };
      break;
    default:
      return null;
  }
  return clampCrop(next, nw, nh);
}

/**
 * The size the browser encodes the region at: its own width up to 1 200, and
 * 4:5 of that, both whole pixels — "lưu 1.200×1.500".
 */
export function outputSize(c: Pick<Crop, "w">): { w: number; h: number } {
  const w = Math.min(MAX_OUTPUT_WIDTH, Math.round(c.w));
  return { w, h: Math.round(w * CROP_RATIO) };
}

/** Whether the region is narrower than a sharp product photo needs. */
export function isSoft(c: Pick<Crop, "w">): boolean {
  return c.w < SHARP_WIDTH;
}

/** `1860.4` → `"1.860"`: whole pixels, grouped the Vietnamese way. */
function grouped(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** `"1.860×2.325"` — a width and a height as the form prints them. */
export function dims(w: number, h: number): string {
  return `${grouped(w)}×${grouped(h)}`;
}

/** Whether two frames are the same region. */
export function sameCrop(a: Crop, b: Crop): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/**
 * How to show only the region inside a 4:5 box `boxHeight` pixels tall: the
 * whole photo as a background `size` pixels wide, shifted by `x`, `y`. The
 * thumbnail on the colour row and the preview in the sheet both draw this —
 * the mock's `cropStyle`.
 */
export function previewBox(
  c: Crop,
  nw: number,
  boxHeight: number,
): { size: number; x: number; y: number } {
  const k = boxHeight / c.h;
  return { size: nw * k, x: -c.x * k, y: -c.y * k };
}
