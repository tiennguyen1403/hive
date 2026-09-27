import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { HONEY, MONO } from "@/lib/brand/palette";
import { SHARE_HEADLINE_SOURCE } from "@/lib/brand/share-headline";
import { headlineSource as imageHeadlineSource } from "@/lib/brand/share-image";
import { HOME_COVER } from "@/lib/lexicon";
import {
  BOARD_FILE,
  FEED_FONT_CSS,
  HEADLINE_TYPE,
  ICON_COLOURS,
  OUT,
  P2_SCALE,
  SAFE_RADIUS,
  figureReach,
  headlineLines,
  headlineSource,
  headlineText,
  markSvg,
  maskableScale,
  packIco,
  readF2Grid,
  readFeedFaces,
  readIco,
  readLogo,
  renderLogoModule,
  touchSvg,
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

/** Every pixel of a PNG as RGBA. */
async function pixels(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => {
    const i = (y * info.width + x) * 4;
    return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!] as const;
  };
  const all = Array.from({ length: info.width * info.height }, (_, i) => at(i % info.width, Math.floor(i / info.width)));
  return { width: info.width, at, all };
}
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const INK_RGB = rgb(MONO.light.disc);
/** Anything that reads as honey: strong red and green, little blue. */
const honeyish = ([r, g, b, a]: readonly number[]) => a! > 0 && r! > 150 && g! > 100 && b! < 90 && r! - b! > 90;
const white = ([r, g, b, a]: readonly number[]) => a === 255 && r! > 245 && g! > 245 && b! > 245;
const ink = ([r, g, b, a]: readonly number[]) =>
  a === 255 && Math.abs(r! - INK_RGB[0]!) <= 2 && Math.abs(g! - INK_RGB[1]!) <= 2 && Math.abs(b! - INK_RGB[2]!) <= 2;

/**
 * QĐ-33 (round v4): the icons are the logo in black and white — an ink disc
 * or square where the board has honey, the bee white where the board has
 * ink. The honey stays on the share image until its own slice.
 */
describe("the icons in black and white", () => {
  it("take the light logo's colours: an ink ground and a white bee", () => {
    expect(ICON_COLOURS).toEqual({ ground: MONO.light.disc, bee: MONO.light.bee });
    const figure = readLogo().figure;
    expect(markSvg(figure)).toContain(`<circle r="500" fill="#171410"/><path fill="#ffffff" d="${figure}"/>`);
    expect(touchSvg(figure, 0.9)).toContain(`<rect x="-500" y="-500" width="1000" height="1000" fill="#171410"/>`);
    expect(touchSvg(figure, 0.9)).toContain(`<g transform="scale(0.9)"><path fill="#ffffff" d="${figure}"/></g>`);
    expect(markSvg(figure) + touchSvg(figure, 0.9)).not.toContain(HONEY);
  });

  it("the phone icons are an ink square with a white bee, and no honey pixel anywhere", async () => {
    for (const file of [OUT.appleIcon, OUT.icon(192), OUT.icon(512), OUT.maskable(192), OUT.maskable(512)]) {
      const img = await pixels(readFileSync(file));
      const mid = Math.floor(img.width / 2);
      expect(ink(img.at(0, 0)), `${file} corner`).toBe(true);
      expect(ink(img.at(img.width - 1, img.width - 1)), `${file} corner`).toBe(true);
      expect(img.all.some(white), `${file} has the white bee`).toBe(true);
      // The first stripe of the bee's body spans y 58 to 121 of the mark's
      // 1000 units; at scale .9 or .879 its middle falls at 58% of the tile.
      expect(white(img.at(mid, Math.round(img.width * 0.58))), `${file} bee's body`).toBe(true);
      expect(img.all.filter(honeyish), file).toEqual([]);
    }
  });

  it("the favicon's three frames are an ink disc with a white bee, F2's hand-drawn pixels included", async () => {
    const frames = readIco(readFileSync(OUT.favicon));
    const grid = readF2Grid(readFileSync(BOARD_FILE, "utf8"));
    for (const f of frames) {
      const img = await pixels(f.data);
      expect(img.at(0, 0)[3], `${f.size}px corner is outside the disc`).toBe(0);
      expect(ink(img.at(f.size / 2, 2)), `${f.size}px disc above the bee`).toBe(true);
      expect(img.all.some(white), `${f.size}px has the white bee`).toBe(true);
      expect(img.all.filter(honeyish), `${f.size}px`).toEqual([]);
    }
    // At 16px every "#" of MASTER16.f2 is a white pixel, every "." inside the disc is ink.
    const f16 = await pixels(frames[0]!.data);
    grid.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === "#") expect(white(f16.at(x, y)), `F2 (${x}, ${y})`).toBe(true);
      }),
    );
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

  it("sets it in capitals, as the Feed's display type does (round v4 slice 1a)", () => {
    expect(headlineText("Cắt 1 lần. Không tái bản.")).toEqual(["CẮT 1 LẦN.", "KHÔNG TÁI BẢN."]);
  });
});

/**
 * Round v4 slice 1a: the cover line in the Feed's display type — Mona Sans
 * 75% wide, 900, tracked as `.disp` — in O2's own box.
 */
describe("the cover line's type", () => {
  it("is the Feed's display voice in O2's box", () => {
    expect(HEADLINE_TYPE).toEqual({
      family: "Mona Sans Variable",
      wdth: 75,
      wght: 900,
      top: 404,
      size: 36,
      lineHeight: 1.16,
      tracking: -0.004,
    });
    const feedCss = readFileSync("prototype/explore/feed/feed.css", "utf8");
    expect(feedCss).toMatch(/\.disp \{\s*font-stretch: 75%;\s*font-weight: 900;\s*text-transform: uppercase;\s*line-height: 1;\s*letter-spacing: -\.004em;/);
    const board = readFileSync(BOARD_FILE, "utf8");
    expect(board).toContain(".o2 .hl { left: 0; right: 0; top: calc(404 * var(--u)); text-align: center; font-size: calc(36 * var(--u)); line-height: 1.16;");
  });

  it("reads the mock's three upright Mona Sans faces, the Vietnamese one holding the stacked marks", () => {
    const faces = readFeedFaces(readFileSync(FEED_FONT_CSS, "utf8"));
    expect(faces).toHaveLength(3);
    for (const f of faces) expect(existsSync(f.file), f.file).toBe(true);
    const vietnamese = faces.find((f) => f.file.includes("vietnamese"))!;
    expect(vietnamese.ranges).toContainEqual([0x1ea0, 0x1ef9]);
    expect(faces.every((f) => f.file.endsWith("-wdth-normal.woff2"))).toBe(true);
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
