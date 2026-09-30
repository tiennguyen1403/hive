/**
 * The logo's own colours, for the pictures drawn outside CSS: the favicon, the
 * phone icons (`scripts/brand-assets.ts`) and the share image
 * (`lib/brand/share-image.ts`).
 *
 * They are the same values as the design tokens — `--brand`, `--ink` /
 * `--stage` and `--stage-ink` in `app/globals.css` — but a logo does not
 * follow a theme, so they are written out here, not read from a stylesheet
 * no image can see.
 */

/** The v3 logo's disc (the wait veil at rest, before it repaints itself for a Feed screen); no longer in any picture since round v4. */
export const HONEY = "#eba400";
/** The bee on the disc. */
export const INK = "#171410";
/** The black cloth an issue is made of: the share image's ground. Same value as `INK`. */
export const CLOTH = "#171410";
/** The wordmark and the cover line on the cloth. */
export const WHITE = "#ffffff";

/**
 * The logo in black and white (QĐ-33, round v4 "Feed"): the same mark M2 and
 * wordmark W3, no honey, so the Feed's blue is the one accent on the screen.
 * The colour rule, from the variants already drawn in `prototype/name/logo/`:
 *
 *   · on a light ground (`hive-mark-black.svg`, `hive-wordmark.svg`): the
 *     honey disc turns ink, the ink bee on it turns white, the name is ink;
 *   · on a dark ground (`hive-mark-negative.svg`, `hive-wordmark-white.svg`):
 *     the disc is white, the bee ink, the name white — an ink disc on a dark
 *     block would all but vanish (1.02:1 on the Feed's ink #111214).
 *
 * The favicon, the phone icons (`scripts/brand-assets.ts`), `FeedLogo`, the
 * wait veil over a Feed screen and — since round v4 slice 1a — the share
 * image (`LOCKUP_ON_DARK`, `lib/brand/lockup.ts`) draw from here. `HONEY`
 * stays for the wait veil's resting mark.
 */
export const MONO = {
  light: { disc: INK, bee: WHITE, name: INK },
  dark: { disc: WHITE, bee: INK, name: WHITE },
} as const;
