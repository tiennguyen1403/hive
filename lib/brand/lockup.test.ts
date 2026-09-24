import { describe, expect, it } from "vitest";
import { lockup } from "./lockup";
import { MARK_FIGURE, NAME_RIGHT, WORDMARK } from "./logo";

/** The x of each ".NN" glyph, as the lockup writes it. */
const pens = (no: string) => [...lockup(no).inner.matchAll(/translate\(([\d.]+) 260\)/g)].map((m) => m[1]);

/**
 * The numbers below were read off the approved board itself —
 * `prototype/name/share.html?og=o2&no=NN`, the viewBox and the glyph
 * transforms of the lockup its `lockupSVG()` drew, in Chrome, 25/09/2026 —
 * not recomputed with the rule under test.
 */
describe("the HIVE lockup", () => {
  it("composes .05 where the board composes it", () => {
    expect(pens("05")).toEqual(["1703.63", "1834.92", "2076.47"]);
    expect(lockup("05").width).toBe(2808.39);
  });

  it("follows the digit set's kerning, as the board does for .24 and .74", () => {
    expect(pens("24")).toEqual(["1703.63", "1834.92", "2061.38"]);
    expect(lockup("24").width).toBe(2804.74);
    expect(pens("74")).toEqual(["1703.63", "1834.92", "2035.13"]);
    expect(lockup("74").width).toBe(2778.49);
  });

  it("takes the width of each issue's own digits", () => {
    expect(lockup("06").width).toBe(2801.37);
    expect(lockup("12").width).toBe(2691.39);
  });

  it("without a number ends where the wordmark ends, like hive-lockup.svg", () => {
    expect(lockup("").width).toBe(Number((NAME_RIGHT + 500).toFixed(2)));
    expect(lockup("").width).toBe(2175.99);
    expect(lockup("").inner).not.toContain("<g ");
  });

  it("draws the mark in honey and ink, the name in the colour asked for, the number in honey", () => {
    const { inner } = lockup("05", "#ffffff");
    expect(inner).toContain(`<circle r="500" fill="#eba400"/><path fill="#171410" d="${MARK_FIGURE}"/>`);
    expect(inner).toContain(`<path fill="#ffffff" d="${WORDMARK}"/>`);
    expect(inner).toContain(`<g fill="#eba400"><path transform="translate(1703.63 260) scale(0.26)"`);
  });

  it("refuses a character the digit set does not hold", () => {
    expect(() => lockup("0A")).toThrow(/no "A"/);
  });
});
