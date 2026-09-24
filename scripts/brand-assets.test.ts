import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SHARE_HEADLINE_SOURCE } from "@/lib/brand/share-headline";
import { headlineSource as imageHeadlineSource } from "@/lib/brand/share-image";
import { HOME_COVER } from "@/lib/lexicon";
import {
  BOARD_FILE,
  OUT,
  P2_SCALE,
  SAFE_RADIUS,
  figureReach,
  headlineLines,
  headlineSource,
  maskableScale,
  packIco,
  readF2Grid,
  readIco,
  readLogo,
  renderLogoModule,
} from "./brand-assets";

const PNG_SIGNATURE = "89504e470d0a1a0a";

/** Width, height, colour type and text chunks of a PNG, read from its bytes. */
function png(bytes: Buffer) {
  expect(bytes.subarray(0, 8).toString("hex")).toBe(PNG_SIGNATURE);
  const text: string[] = [];
  for (let p = 8; p < bytes.length; ) {
    const length = bytes.readUInt32BE(p);
    const type = bytes.toString("ascii", p + 4, p + 8);
    if (type === "tEXt") text.push(bytes.toString("utf8", p + 8, p + 8 + length).split("\0")[0]!);
    p += 12 + length;
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colourType: bytes[25], text };
}

/**
 * The anti-drift catches, as `scripts/gen-seed.test.ts` does for the seed:
 * a generated file nobody checks is a file that quietly stops matching its
 * source. These need no browser: they compare text with text and read the
 * committed files' headers.
 */
describe("what the script generated", () => {
  it("lib/brand/logo.ts is exactly what the logo files in prototype/name/logo/ give", () => {
    expect(readFileSync(OUT.logo, "utf8"), "run `npx tsx scripts/brand-assets.ts`").toBe(renderLogoModule(readLogo()));
  });

  it("lib/brand/share-headline.ts was drawn from HOME_COVER.headline as it reads now", () => {
    expect(SHARE_HEADLINE_SOURCE, "run `npx tsx scripts/brand-assets.ts`").toBe(headlineSource(HOME_COVER.headline));
    // The script and the share image fingerprint the sentence the same way.
    expect(imageHeadlineSource(HOME_COVER.headline)).toBe(headlineSource(HOME_COVER.headline));
  });

  it("app/favicon.ico holds 16, 32 and 48 px PNG frames, each carrying its provenance", () => {
    const frames = readIco(readFileSync(OUT.favicon));
    expect(frames.map((f) => f.size)).toEqual([16, 32, 48]);
    for (const f of frames) {
      const img = png(f.data);
      expect([img.width, img.height]).toEqual([f.size, f.size]);
      expect(img.text).toContain("impeccable:prompt");
    }
  });

  it("the phone icons are opaque squares of the right size, each carrying its provenance", () => {
    const files: [string, number][] = [
      [OUT.appleIcon, 180],
      [OUT.icon(192), 192],
      [OUT.icon(512), 512],
      [OUT.maskable(192), 192],
      [OUT.maskable(512), 512],
    ];
    for (const [file, size] of files) {
      const img = png(readFileSync(file));
      expect([img.width, img.height], file).toEqual([size, size]);
      // Colour type 2: RGB, no alpha channel at all.
      expect(img.colourType, file).toBe(2);
      expect(img.text, file).toContain("impeccable:prompt");
    }
  });
});

describe("the sources it reads", () => {
  it("finds the 16 px master F2 on the board: sixteen rows of sixteen, the bee in rows 3 to 13", () => {
    const grid = readF2Grid(readFileSync(BOARD_FILE, "utf8"));
    expect(grid).toHaveLength(16);
    expect(grid.every((row) => /^[.#]{16}$/.test(row))).toBe(true);
    const inked = grid.map((row, y) => (row.includes("#") ? y : -1)).filter((y) => y >= 0);
    expect([inked[0], inked.at(-1)]).toEqual([3, 13]);
  });

  it("refuses a grid that is no longer 16 × 16", () => {
    expect(() => readF2Grid(`f2: [ "....", "...." ]`)).toThrow(/16 × 16/);
  });
});

describe("headlineLines", () => {
  it("puts every sentence but the last on the first line, as the O2 board breaks it", () => {
    expect(headlineLines("Một. Hai. Ba.")).toEqual(["Một. Hai.", "Ba."]);
  });

  it("keeps one sentence on one line", () => {
    expect(headlineLines("Một câu thôi.")).toEqual(["Một câu thôi."]);
  });

  it("loses nothing of the cover line", () => {
    const lines = headlineLines(HOME_COVER.headline);
    expect(lines).toHaveLength(2);
    expect(lines.join(" ")).toBe(HOME_COVER.headline);
  });
});

describe("the maskable phone icon", () => {
  const reach = figureReach(readLogo().figure);

  it("measures the bee to the outer corners of the H's feet", () => {
    // (±314.42, ±328.52) in hive-mark.svg.
    expect(reach).toBeCloseTo(Math.hypot(314.42, 328.52), 2);
  });

  it("would lose those corners at P2's own scale", () => {
    expect(reach * P2_SCALE).toBeGreaterThan(SAFE_RADIUS);
  });

  it("shrinks the bee just enough to stay inside the 80% circle", () => {
    const scale = maskableScale(reach);
    expect(scale).toBe(0.879);
    expect(reach * scale).toBeLessThanOrEqual(SAFE_RADIUS);
    expect(reach * (scale + 0.001)).toBeGreaterThan(SAFE_RADIUS);
  });

  it("measures vertices, and curves where they bulge past their ends", () => {
    expect(figureReach("M-3,-4h6v8h-6z")).toBe(5);
    // Ends 10 from the centre, the middle of the arch 15.
    expect(figureReach("M-10,0C-10,20 10,20 10,0")).toBeCloseTo(15, 6);
    expect(figureReach("M-10,0c0,20 20,20 20,0")).toBeCloseTo(15, 6);
    expect(() => figureReach("M0,0a1,1 0 0 1 2,2")).toThrow(/"a"/);
  });
});

describe("packIco", () => {
  it("writes a directory that reads back to the same frames", () => {
    const a = Buffer.from("first");
    const b = Buffer.from("second, longer");
    const ico = packIco([
      { size: 16, png: a },
      { size: 256, png: b },
    ]);
    expect(ico.readUInt16LE(2)).toBe(1);
    const frames = readIco(ico);
    expect(frames.map((f) => f.size)).toEqual([16, 256]);
    expect(frames.map((f) => f.data.toString())).toEqual(["first", "second, longer"]);
  });
});
