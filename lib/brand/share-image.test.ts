import { describe, expect, it } from "vitest";
import { HOME_COVER } from "@/lib/lexicon";
import { SHARE_HEADLINE_PATH, SHARE_HEADLINE_SOURCE } from "./share-headline";
import { SHARE_IMAGE_ALT, SHARE_IMAGE_SIZE, headlineSource, shareImageSvg } from "./share-image";

describe("the share image's cover line", () => {
  /**
   * The anti-drift catch. The outlines are drawn from `HOME_COVER.headline`
   * by `scripts/brand-assets.ts`; change the sentence without running it and
   * every shared link would still show the old one. (Importing
   * `./share-image` already throws in that case; this names the fix.)
   */
  it("was drawn from HOME_COVER.headline as it reads now", () => {
    expect(SHARE_HEADLINE_SOURCE, "run `npx tsx scripts/brand-assets.ts`").toBe(headlineSource(HOME_COVER.headline));
  });

  it("is outlines, not text: nothing in the picture waits on a font", () => {
    expect(SHARE_HEADLINE_PATH).toMatch(/^M[\d. MLQCZ-]+Z$/);
    expect(shareImageSvg("05")).not.toContain("<text");
  });
});

describe("shareImageSvg", () => {
  const svg = shareImageSvg("05");

  it("is 1200 × 630 on the black cloth", () => {
    expect(SHARE_IMAGE_SIZE).toEqual({ width: 1200, height: 630 });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1200" height="630" viewBox="0 0 1200 630">/);
    expect(svg).toContain(`<rect width="1200" height="630" fill="#171410"/>`);
  });

  it("centres the lockup 140 from the top, 170 tall, as .o2 .lk places it", () => {
    // HIVE.05 is 2808.39 units wide: 477.426 px at 0.17, so it starts at 600 − 238.713.
    expect(svg).toContain(`<g transform="translate(361.287 140) scale(0.17) translate(500 500)">`);
  });

  it("stitches the seam as Chrome draws the board's 3px dashed rule: 27 dashes, 6 on and 3 off, 480 to 720", () => {
    const dashes = [...svg.matchAll(/<rect x="([\d.]+)" y="366" width="6" height="3"\/>/g)].map((m) => Number(m[1]));
    expect(dashes).toHaveLength(27);
    expect(dashes[0]).toBe(480);
    expect(dashes.at(-1)! + 6).toBe(720);
    expect(dashes.every((x, i) => x === 480 + 9 * i)).toBe(true);
  });

  it("prints the cover line in white", () => {
    expect(svg).toContain(`<path fill="#ffffff" d="${SHARE_HEADLINE_PATH}"/>`);
  });

  it("changes only the lockup from one issue to the next", () => {
    const next = shareImageSvg("06");
    expect(next).not.toBe(svg);
    expect(next).toContain(`<g transform="translate(361.884 140) scale(0.17) translate(500 500)">`);
    const withoutLockup = (s: string) => s.replace(/<g transform="translate\([^"]+">.*?<\/g><\/g>/, "");
    expect(withoutLockup(next)).toBe(withoutLockup(svg));
  });

  it("describes itself in Vietnamese, the cover line included", () => {
    expect(SHARE_IMAGE_ALT).toContain(HOME_COVER.headline);
    expect(SHARE_IMAGE_ALT.startsWith("Logo HIVE kèm số của Số hiện tại")).toBe(true);
  });
});
