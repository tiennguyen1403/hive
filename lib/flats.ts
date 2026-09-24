import { COLORS } from "@/data/colors";
import type { ColorKey } from "@/data/types";

/**
 * FLATS — the stand-in picture of a fixed style until its photograph exists
 * (v3 slice 11).
 *
 * The eight fixed styles (slice B5) have no photos yet; the user is making
 * them, and the photo slice will swap them in. Until then each colourway is
 * the garment's flat drawing on the plate, exactly as the approved board
 * draws it: the outlines are copied from the constant `FLATS` and the
 * painting from the function `flat()` in `prototype/v3/line/line-mock.js`
 * (round 4, approved 25/09/2026), in the board's 200 × 250 frame — the
 * shop's 4:5. Borrowing Unsplash frames instead would repeat photos across
 * the grid and show garments that are not the style.
 *
 * The shop never draws these at run time. `scripts/flats.ts` renders each
 * key to `public/flats/<shape>-<colour>.png` once, and `photoUrl` serves the
 * file like any other photo, so `next/image`, the card, the gallery and the
 * cart treat a flat exactly as they treat a photograph — and the day the
 * photos land, the key changes and nothing else does.
 *
 * `lib/flats.test.ts` holds the outlines to the board's file, character for
 * character.
 */

export const FLAT_SHAPES = [
  "tee",
  "longsleeve",
  "hoodie",
  "jacket",
  "vest",
  "shirt",
  "trousers",
  "shorts",
] as const;
export type FlatShape = (typeof FLAT_SHAPES)[number];

/**
 * The colourways that exist as files: the eight fixed styles', seventeen in
 * all, in catalogue order. A key names one: `flat-tee-white`. Any other
 * `flat-…` key is unknown and falls back like any unknown photo key.
 */
export const FLATS_MADE: Readonly<Record<FlatShape, readonly ColorKey[]>> = {
  tee: ["white", "black", "grey"],
  longsleeve: ["black", "white"],
  hoodie: ["grey", "black", "cream"],
  jacket: ["black", "navy"],
  vest: ["black"],
  shirt: ["white", "navy"],
  trousers: ["cream", "black"],
  shorts: ["grey", "black"],
};

export interface Flat {
  shape: FlatShape;
  color: ColorKey;
}

/** `flat-tee-white`, the photo key a fixed style's colourway carries. */
export function flatKey(shape: FlatShape, color: ColorKey): string {
  return `flat-${shape}-${color}`;
}

/** Every key there is a file for. */
export const FLAT_KEYS: readonly string[] = FLAT_SHAPES.flatMap((shape) =>
  FLATS_MADE[shape].map((color) => flatKey(shape, color)),
);

const KNOWN = new Set(FLAT_KEYS);

/** Whether a photo key names one of the seventeen drawings. */
export function isFlatKey(key: string): boolean {
  return KNOWN.has(key);
}

/** The drawing a known key names, or null. */
export function flatOf(key: string): Flat | null {
  if (!KNOWN.has(key)) return null;
  const [, shape, color] = key.split("-") as [string, FlatShape, ColorKey];
  return { shape, color };
}

/** `/flats/tee-white.png` — where `scripts/flats.ts` writes a known key. */
export function flatPath(key: string): string | null {
  const f = flatOf(key);
  return f ? `/flats/${f.shape}-${f.color}.png` : null;
}

// ───────────────────────────────────────────────────────────── the drawing
/**
 * The plate a flat is drawn on: the value of `--plate` in `app/globals.css`,
 * written here because a raster cannot read a stylesheet (the same reason
 * `lib/brand/palette.ts` spells the brand's colours out). The test holds the
 * two together.
 */
export const PLATE = "#f4efe6";

/** The board's frame: 200 × 250, the shop's 4:5. */
export const FLAT_VIEWBOX = { width: 200, height: 250 } as const;

interface Outline {
  /** The garment's outline. */
  d: string;
  /** Behind it — a hood standing up. */
  back?: string;
  /** The seams. */
  x: readonly string[];
  /** Buttons and snaps. */
  o?: readonly (readonly [number, number])[];
}

/** Copied from `FLATS` in `prototype/v3/line/line-mock.js`, unchanged. */
export const FLATS: Readonly<Record<FlatShape, Outline>> = {
  tee: {
    d: "M80 46Q100 62 120 46L144 54L176 96L158 108L142 86L142 206L58 206L58 86L42 108L24 96L56 54Z",
    x: ["M84 50Q100 60 116 50", "M171 90L153 102", "M29 90L47 102", "M58 198L142 198"],
  },
  longsleeve: {
    d: "M80 46Q100 62 120 46L144 54L186 196L166 202L142 96L142 206L58 206L58 96L34 202L14 196L56 54Z",
    x: ["M84 50Q100 60 116 50", "M183 185L163 191", "M17 185L37 191", "M58 198L142 198", "M142 60L142 96", "M58 60L58 96"],
  },
  hoodie: {
    back: "M70 60C64 18 136 18 130 60Z",
    d: "M74 54Q100 72 126 54L154 62L192 200L170 206L148 106L150 212L50 212L52 106L30 206L8 200L46 62Z",
    x: ["M80 56C80 30 120 30 120 56", "M93 68L91 94", "M107 68L109 94", "M68 156L132 156L140 190L60 190Z", "M50 202L150 202", "M189 189L167 195", "M11 189L33 195"],
  },
  jacket: {
    d: "M74 44L100 56L126 44L154 54L190 200L168 206L148 102L148 212L52 212L52 102L32 206L10 200L46 54Z",
    x: ["M74 44L86 70L100 56L114 70L126 44", "M100 56L100 212", "M62 158L84 148", "M138 158L116 148", "M52 204L148 204", "M187 190L165 196", "M13 190L35 196"],
    o: [[100, 86], [100, 114], [100, 142], [100, 170], [100, 198]],
  },
  vest: {
    d: "M76 36L124 36L126 52L148 60Q138 88 146 112L146 208L54 208L54 112Q62 88 52 60L74 52Z",
    x: ["M74 52L126 52", "M100 36L100 208", "M58 86L142 86", "M54 112L146 112", "M54 138L146 138", "M54 164L146 164", "M54 190L146 190"],
  },
  shirt: {
    d: "M78 46L100 58L122 46L146 54L182 194L162 200L142 100L142 208Q100 218 58 208L58 100L38 200L18 194L54 54Z",
    x: ["M78 46L90 72L100 58L110 72L122 46", "M100 58L100 212", "M110 92L130 92L130 114L110 114Z", "M179 182L159 188", "M21 182L41 188"],
    o: [[100, 80], [100, 104], [100, 128], [100, 152], [100, 176], [100, 200]],
  },
  trousers: {
    d: "M58 28L142 28L142 40L150 232L108 232L100 100L92 232L50 232L58 40Z",
    x: ["M58 40L142 40", "M100 40L100 92", "M64 44L78 70", "M136 44L122 70", "M51 224L91 224", "M109 224L149 224", "M86 28L86 40", "M114 28L114 40"],
    o: [[100, 34]],
  },
  shorts: {
    d: "M54 66L146 66L146 78L156 172L108 178L100 120L92 178L44 172L54 78Z",
    x: ["M54 78L146 78", "M96 80L92 100", "M104 80L108 100", "M60 82L72 106", "M140 82L128 106", "M45 164L91 169", "M109 169L155 164"],
  },
};

/** The board's `lum()`: relative luminance of a `#rrggbb`, without the sRGB curve. */
export function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * How the board paints a flat in a colour: a dark cloth has no outline and
 * light seams, a light cloth an ink outline and ink seams.
 */
export function flatInk(color: ColorKey): { fill: string; dark: boolean; edge: string; seam: string; backEdge: string } {
  const fill = COLORS[color].hex;
  const dark = lum(fill) < 0.35;
  const edge = dark ? "none" : "rgba(23,20,16,.34)";
  return {
    fill,
    dark,
    edge,
    seam: dark ? "rgba(255,255,255,.2)" : "rgba(23,20,16,.26)",
    backEdge: dark ? "rgba(0,0,0,.25)" : edge,
  };
}

/**
 * The board's `flat()`: one garment in one colour, as SVG in the 200 × 250
 * frame. `plate` lays the plate under it, which the file needs and the board
 * leaves to the card's background.
 */
export function flatSvg(shape: FlatShape, color: ColorKey, opts: { plate?: string } = {}): string {
  const f = FLATS[shape];
  const ink = flatInk(color);
  const { width, height } = FLAT_VIEWBOX;
  const plate = opts.plate ? `<rect width="${width}" height="${height}" fill="${opts.plate}"/>` : "";
  const back = f.back
    ? `<path d="${f.back}" fill="${ink.fill}" stroke="${ink.backEdge}" stroke-width="1.2" stroke-linejoin="round"/>`
    : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">${plate}${back}` +
    `<path d="${f.d}" fill="${ink.fill}" stroke="${ink.edge}" stroke-width="1.2" stroke-linejoin="round"/>` +
    f.x
      .map(
        (p) =>
          `<path d="${p}" fill="none" stroke="${ink.seam}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`,
      )
      .join("") +
    (f.o ?? []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="${ink.seam}"/>`).join("") +
    `</svg>`
  );
}
