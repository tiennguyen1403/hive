import { ISSUE_NUMBER, MARK_FIGURE, NAME_RIGHT, WORDMARK } from "./logo";
import { HONEY, INK, WHITE } from "./palette";

/** A lockup ready to be placed: its inner markup and the width of its viewBox, both in logo units. */
export interface Lockup {
  /** `-500 -500 width 1000`: the mark's disc has radius 500 and its centre at (0, 0). */
  width: number;
  /** The disc, the bee, the wordmark and (with an issue) the ".NN", as SVG markup. */
  inner: string;
}

/**
 * The HIVE lockup, with ".NN" for an issue or without one: the board's
 * `lockupSVG()` (`prototype/name/share.html`), statement for statement, so
 * the share image and the approved board place every glyph at the same x.
 *
 * The number is composed by the logo's own rule (`hive-number.json`, copied
 * into `./logo.ts`): each character of "." + NN at `translate(x, baseline)
 * scale(scale)`, then x moves on by the glyph's advance, the pair's kerning
 * and the tracking. The x is written to two decimals, as the board writes
 * it. The lockup ends where the last glyph's advance ends.
 *
 * `no` is the issue as it is printed, two digits ("05"); an empty string
 * gives the lockup without a number. A character the digit set does not
 * hold is refused rather than skipped: a share image with a hole in its
 * number would say the wrong issue.
 */
export function lockup(no: string, nameFill: string = WHITE): Lockup {
  let right = NAME_RIGHT;
  let parts = "";
  if (no) {
    const N = ISSUE_NUMBER;
    const chars = "." + no;
    let x = N.start;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!;
      const glyph = N.glyphs[ch];
      if (!glyph) throw new Error(`the lockup's digit set has no "${ch}" (issue "${no}")`);
      parts += `<path transform="translate(${x.toFixed(2)} ${N.baseline}) scale(${N.scale})" d="${glyph.d}"/>`;
      right = x + glyph.adv * N.scale;
      x += (glyph.adv + (N.kern[ch + (chars[i + 1] ?? "")] ?? 0)) * N.scale + N.tracking;
    }
  }
  return {
    width: Number((right + 500).toFixed(2)),
    inner:
      `<circle r="500" fill="${HONEY}"/><path fill="${INK}" d="${MARK_FIGURE}"/>` +
      `<path fill="${nameFill}" d="${WORDMARK}"/>` +
      (parts ? `<g fill="${HONEY}">${parts}</g>` : ""),
  };
}
