import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATALOG } from "@/data/catalog";
import { COLORS } from "@/data/colors";
import {
  FLATS,
  FLATS_MADE,
  FLAT_KEYS,
  FLAT_SHAPES,
  PLATE,
  flatInk,
  flatKey,
  flatOf,
  flatPath,
  flatSvg,
  isFlatKey,
} from "./flats";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BOARD = readFileSync(join(ROOT, "prototype/v3/line/line-mock.js"), "utf8");

/**
 * One `const NAME = …;` block of the board's script, source text. The board
 * is an IIFE that touches the DOM, so it cannot be imported; its constants
 * and its `flat()` are pure and can be lifted out as they are written.
 */
function boardSource(start: string, end: string): string {
  const from = BOARD.indexOf(start);
  expect(from, `the board no longer has ${start}`).toBeGreaterThan(-1);
  const to = BOARD.indexOf(end, from);
  expect(to, `the board's ${start} no longer ends with ${JSON.stringify(end)}`).toBeGreaterThan(from);
  return BOARD.slice(from, to + end.length);
}

/** The board's own `flat(shape, color)`, with its `COLORS`, `lum` and `FLATS`. */
function boardFlat(): (shape: string, color: string) => string {
  const src = [
    boardSource("const COLORS = {", "};"),
    boardSource("const FLATS = {", "\n  };"),
    boardSource("function lum(hex) {", "\n  }"),
    boardSource("function flat(shape, color) {", "\n  }"),
  ].join("\n");
  return new Function(`${src}\nreturn flat;`)() as (shape: string, color: string) => string;
}

/** An SVG's children, whatever its opening tag says. */
const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

describe("the drawings are the board's", () => {
  it("has the board's eight shapes, outlines copied character for character", () => {
    const board = new Function(`${boardSource("const FLATS = {", "\n  };")}\nreturn FLATS;`)() as unknown;
    expect(FLAT_SHAPES).toEqual(["tee", "longsleeve", "hoodie", "jacket", "vest", "shirt", "trousers", "shorts"]);
    expect(JSON.parse(JSON.stringify(FLATS))).toEqual(board);
  });

  it("paints every shape in every colour exactly as the board's flat() does", () => {
    const flat = boardFlat();
    for (const shape of FLAT_SHAPES) {
      for (const color of Object.keys(COLORS) as (keyof typeof COLORS)[]) {
        expect(inner(flatSvg(shape, color)), `${shape} ${color}`).toBe(inner(flat(shape, color)));
      }
    }
  });

  it("the board's colours are the shop's", () => {
    const board = new Function(`${boardSource("const COLORS = {", "};")}\nreturn COLORS;`)() as Record<
      string,
      [string, string]
    >;
    for (const [key, [label, hex]] of Object.entries(board)) {
      expect(COLORS[key as keyof typeof COLORS]).toMatchObject({ label, hex });
    }
  });

  it("outlines a light cloth in ink and leaves a dark one without, as the board does", () => {
    expect(flatInk("white")).toMatchObject({ dark: false, edge: "rgba(23,20,16,.34)" });
    expect(flatInk("cream")).toMatchObject({ dark: false, edge: "rgba(23,20,16,.34)" });
    expect(flatInk("grey")).toMatchObject({ dark: false, seam: "rgba(23,20,16,.26)" });
    for (const c of ["black", "navy", "moss", "brown"] as const) {
      expect(flatInk(c), c).toMatchObject({ dark: true, edge: "none", seam: "rgba(255,255,255,.2)" });
    }
  });

  it("draws in the board's 200 × 250 frame, the plate under it when asked", () => {
    const svg = flatSvg("tee", "white", { plate: PLATE });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 200 250"/);
    expect(svg).toContain(`<rect width="200" height="250" fill="${PLATE}"/>`);
    expect(flatSvg("tee", "white")).not.toContain("<rect");
  });

  it("lays the plate the shop's own --plate token gives", () => {
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(new RegExp(`--color-plate:\\s*${PLATE}`, "i"));
  });
});

describe("the seventeen keys", () => {
  it("are the eight fixed styles' colourways, in catalogue order", () => {
    const named = CATALOG.flatMap((p) => p.photoKeys).filter((k) => k.startsWith("flat-"));
    expect(FLAT_KEYS).toEqual(named);
    expect(FLAT_KEYS).toHaveLength(17);
    expect(Object.values(FLATS_MADE).flat()).toHaveLength(17);
  });

  it("read back to their shape and colour, and to a file of the app", () => {
    expect(flatKey("tee", "white")).toBe("flat-tee-white");
    expect(flatOf("flat-longsleeve-black")).toEqual({ shape: "longsleeve", color: "black" });
    expect(flatPath("flat-shorts-grey")).toBe("/flats/shorts-grey.png");
  });

  it("know nothing else", () => {
    for (const key of ["flat-tee-moss", "flat-cape-black", "flat-tee", "hero", "khoi", ""]) {
      expect(isFlatKey(key), key).toBe(false);
      expect(flatOf(key), key).toBeNull();
      expect(flatPath(key), key).toBeNull();
    }
  });
});

describe("the files scripts/flats.ts wrote", () => {
  const PNG_SIGNATURE = "89504e470d0a1a0a";

  /** Width, height and text chunks of a PNG, read from its bytes. */
  function png(bytes: Buffer) {
    expect(bytes.subarray(0, 8).toString("hex")).toBe(PNG_SIGNATURE);
    const text: string[] = [];
    for (let p = 8; p < bytes.length; ) {
      const length = bytes.readUInt32BE(p);
      const type = bytes.toString("ascii", p + 4, p + 8);
      if (type === "tEXt" || type === "iTXt") text.push(bytes.toString("utf8", p + 8, p + 8 + length).split("\0")[0]!);
      p += 12 + length;
    }
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), text };
  }

  it("holds one 1040 × 1300 PNG per key, each carrying its provenance", () => {
    for (const key of FLAT_KEYS) {
      const file = join(ROOT, "public", flatPath(key)!);
      expect(existsSync(file), `${file} — run \`npx tsx scripts/flats.ts\``).toBe(true);
      const img = png(readFileSync(file));
      expect([img.width, img.height], file).toEqual([1040, 1300]);
      expect(img.text, file).toContain("impeccable:prompt");
    }
  });
});
