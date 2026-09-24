import { createHash } from "node:crypto";
import { HOME_COVER } from "@/lib/lexicon";
import { lockup } from "./lockup";
import { CLOTH, HONEY, WHITE } from "./palette";
import { SHARE_HEADLINE_PATH, SHARE_HEADLINE_SOURCE } from "./share-headline";

/**
 * Share image O2 (QĐ-31, `prototype/name/share.html?og=o2`): the picture a
 * link card shows when someone pastes the shop's address into Messenger,
 * Zalo, Facebook or X. On the black cloth of an issue: the lockup `HIVE.NN`,
 * a honey seam, and the cover line in two lines. No photo, no closing time,
 * no stock figure — the apps keep the picture they scraped for as long as
 * they like, so it says only what stays true: which issue, and the rule.
 *
 * It is ONE SVG document, drawn by `app/opengraph-image.tsx` through
 * `next/og`: the logo and the cover line are outlines, so nothing is set in
 * a font at request time and nothing is fetched.
 *
 * Every length is the board's `.o2` rule, written there in `--u`, one
 * 1200th of the frame — which at the image's own 1200 px is one pixel.
 */

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

/**
 * What the picture shows, for the card's `og:image:alt`. The number is not
 * in it: the text is fixed when the page is built, the number follows the
 * issue on the home page's cover.
 */
export const SHARE_IMAGE_ALT = `Logo HIVE kèm số của Số hiện tại, trên nền đen; bên dưới là câu “${HOME_COVER.headline}”`;

/** `.o2 .lk`: centred, 140 from the top, 170 tall — the mark's disc is 170 across. */
const LOCKUP = { top: 140, height: 170 };

/**
 * `.o2 .seam`: a 3px dashed rule from 480 to 720, 366 from the top. Chrome
 * draws a dashed border of 3px as dashes of twice the width with gaps of
 * one width, then stretches the gaps so both ends are a dash — measured on
 * the board: 27 dashes, 6 on and 3 off.
 */
const SEAM = { left: 480, right: 720, top: 366, width: 3 };

function seam(): string {
  const { left, right, top, width } = SEAM;
  const dash = 2 * width;
  const n = Math.floor((right - left + width) / (dash + width));
  const step = (right - left - dash) / (n - 1);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += `<rect x="${Number((left + i * step).toFixed(3))}" y="${top}" width="${dash}" height="${width}"/>`;
  }
  return out;
}

/** The fingerprint `scripts/brand-assets.ts` records for the sentence it drew. */
export function headlineSource(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// The cover line is drawn from `HOME_COVER.headline` by the asset script,
// not typed here. Drawing yesterday's sentence on every shared link would be
// the one way this image could say something untrue, so a changed sentence
// stops the build (and every test that imports this) until the outlines are
// drawn again.
if (headlineSource(HOME_COVER.headline) !== SHARE_HEADLINE_SOURCE) {
  throw new Error(
    "HOME_COVER.headline has changed since the share image's outlines were drawn: run `npx tsx scripts/brand-assets.ts`.",
  );
}

/**
 * The share image for issue `no` ("05"), as an SVG document of 1200 × 630.
 * The lockup is placed as the board places it: 170 tall, its centre on the
 * image's centre line.
 */
export function shareImageSvg(no: string): string {
  const { width, height } = SHARE_IMAGE_SIZE;
  const mark = lockup(no, WHITE);
  const scale = LOCKUP.height / 1000;
  const left = Number((width / 2 - (mark.width * scale) / 2).toFixed(3));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${CLOTH}"/>` +
    `<g transform="translate(${left} ${LOCKUP.top}) scale(${scale}) translate(500 500)">${mark.inner}</g>` +
    `<g fill="${HONEY}">${seam()}</g>` +
    `<path fill="${WHITE}" d="${SHARE_HEADLINE_PATH}"/>` +
    `</svg>`
  );
}
