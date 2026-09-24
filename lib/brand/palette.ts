/**
 * The logo's own colours, for the pictures drawn outside CSS: the favicon, the
 * phone icons (`scripts/brand-assets.ts`) and the share image
 * (`lib/brand/share-image.ts`).
 *
 * They are the same values as the design tokens — `--brand`, `--ink` /
 * `--stage` and `--stage-ink` in `app/globals.css` — but a logo does not
 * follow a theme, so they are written out here the way `NavLogo` and
 * `WaitVeil` write them, not read from a stylesheet no image can see.
 */

/** The disc of the mark, the ".NN" of the lockup, the seam. */
export const HONEY = "#eba400";
/** The bee on the disc. */
export const INK = "#171410";
/** The black cloth an issue is made of: the share image's ground. Same value as `INK`. */
export const CLOTH = "#171410";
/** The wordmark and the cover line on the cloth. */
export const WHITE = "#ffffff";
