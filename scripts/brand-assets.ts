/**
 * The brand's files, drawn from the approved sources (v3 slice 10, decision
 * QĐ-31: favicon F2, phone icon P2, share image O2).
 *
 * WHAT IT WRITES
 *   app/favicon.ico                  three PNG frames: 16 px is F2, the 16 px
 *                                    master drawn by hand; 32 and 48 px are
 *                                    mark M2 drawn from the vector
 *   app/apple-icon.png               180 × 180, P2: a honey square, the bee in
 *                                    ink at scale(.9), no transparency
 *   public/icons/hive-{192,512}.png  P2 as approved, for the manifest's
 *                                    purpose "any"
 *   public/icons/hive-maskable-{192,512}.png
 *                                    P2 with the bee shrunk into the 80 % safe
 *                                    circle, for purpose "maskable"
 *   lib/brand/logo.ts                the mark's figure, the W3 wordmark and the
 *                                    ".NN" digit set, for the share image
 *   lib/brand/share-headline.ts      `HOME_COVER.headline` as outlines, set the
 *                                    way the O2 board sets it
 *
 * WHERE FROM
 *   prototype/name/logo/hive-mark.svg, hive-lockup.svg, hive-number.json —
 *     the canonical logo (QĐ-29, QĐ-30), read exactly as the board's own copy
 *     is read (`prototype/name/share/build.cjs`)
 *   prototype/name/share.html — the approved board: the 16 px grid
 *     `MASTER16.f2`, the cover line's CSS (`.o2 .hl`) and its @font-face rules
 *   prototype/v3/fonts/unbounded-800-*.woff2 — the faces the board sets the
 *     cover line in
 *
 * HOW
 *   Every raster is drawn by Chrome through Playwright (a devDependency) in
 *   the same way the board's export mode draws it — the favicons on a
 *   canvas (`raster()`), the phone icons as inline SVG (`touchSVG()`) — so a
 *   file here and `share.html?icon=f2&size=16`, `?icon=f1&size=32`,
 *   `?touch=p2&size=180` hold the same pixels.
 *
 *   The cover line becomes outlines because the share image is drawn by
 *   `next/og` (Satori), which reads no woff2, and the only TrueType Unbounded
 *   on hand is the variable font, which Satori would set at its default
 *   weight, 400. So Chrome lays the line out with the board's own CSS
 *   (the board page itself, served from disk through `page.route`), each
 *   character's pen position is read off the layout, and each glyph's outline
 *   comes from the very woff2 file Chrome used for it, read with fontkit — the
 *   copy Next already ships for `next/font` (an internal path of the `next`
 *   package: if a Next upgrade moves it, this script stops with that message
 *   and the committed outlines stay valid). Nothing is fetched at run time.
 *
 *   Provenance: every PNG carries an `impeccable:prompt` text chunk written
 *   by `impeccable embed-prompt`. The tool cannot write into an .ico (it
 *   falls back to a JSON file beside it, which `app/` should not hold), so
 *   the ICO's three frames are embedded one by one BEFORE they are packed,
 *   and this comment is the ICO's own record: F2 from `MASTER16.f2`, M2 from
 *   `hive-mark.svg`, drawn here.
 *
 * WHEN TO RUN IT
 *   After the logo files, the F2 grid or `HOME_COVER.headline` change.
 *   `scripts/brand-assets.test.ts` and `lib/brand/share-image.test.ts` fail
 *   until it has run, and the share image refuses to build with stale
 *   outlines (see `lib/brand/share-image.ts`).
 *
 *     npx tsx scripts/brand-assets.ts        (needs Google Chrome installed)
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Browser, Page } from "@playwright/test";
import { HONEY, INK } from "@/lib/brand/palette";
import { HOME_COVER } from "@/lib/lexicon";

// ───────────────────────────────────────────────────────────────── where

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOGO_DIR = join(ROOT, "prototype/name/logo");
export const BOARD_FILE = join(ROOT, "prototype/name/share.html");

export const OUT = {
  logo: join(ROOT, "lib/brand/logo.ts"),
  headline: join(ROOT, "lib/brand/share-headline.ts"),
  favicon: join(ROOT, "app/favicon.ico"),
  appleIcon: join(ROOT, "app/apple-icon.png"),
  icon: (size: number) => join(ROOT, `public/icons/hive-${size}.png`),
  maskable: (size: number) => join(ROOT, `public/icons/hive-maskable-${size}.png`),
};

/** P2 as approved: the bee at nine tenths of the tile (`touchSVG("p2")` on the board). */
export const P2_SCALE = 0.9;

/**
 * A maskable icon is cropped by the phone to any shape that keeps the circle
 * of 80 % of the tile — so the bee's farthest point may lie 40 % of a side
 * from the centre, 400 of the tile's 1000 units.
 */
export const SAFE_RADIUS = 400;

// ───────────────────────────────────────────────────────────────── the logo

export interface IssueGlyphData {
  adv: number;
  d: string;
}

export interface LogoData {
  figure: string;
  wordmark: string;
  nameRight: number;
  number: {
    start: number;
    baseline: number;
    scale: number;
    tracking: number;
    glyphs: Record<string, IssueGlyphData>;
    kern: Record<string, number>;
  };
}

/**
 * The logo, read from its canonical files the way the board's own copy is
 * read (`prototype/name/share/build.cjs`): the figure is the ink path of the
 * mark, the wordmark is the lockup's other ink path, and the digit set comes
 * with its composing rule from `hive-number.json`.
 */
export function readLogo(dir: string = LOGO_DIR): LogoData {
  const read = (f: string) => readFileSync(join(dir, f), "utf8");
  const figure = read("hive-mark.svg").match(/<path fill="#171410" d="([^"]+)"/)?.[1];
  const lockup = read("hive-lockup.svg");
  const wordmark = [...lockup.matchAll(/<path fill="#171410" d="([^"]+)"/g)]
    .map((m) => m[1])
    .find((d) => d !== figure);
  const width = lockup.match(/viewBox="-500 -500 ([\d.]+) 1000"/)?.[1];
  if (!figure || !wordmark || !width) {
    throw new Error("the logo files changed shape: figure, wordmark or lockup viewBox not found");
  }
  const n = JSON.parse(read("hive-number.json")) as LogoData["number"];
  return {
    figure,
    wordmark,
    nameRight: Number((Number(width) - 500).toFixed(2)),
    number: {
      start: n.start,
      baseline: n.baseline,
      scale: n.scale,
      tracking: n.tracking,
      glyphs: n.glyphs,
      kern: n.kern,
    },
  };
}

/** `lib/brand/logo.ts`, byte for byte. */
export function renderLogoModule(logo: LogoData): string {
  const glyphs = Object.entries(logo.number.glyphs)
    .map(([ch, g]) => `    ${JSON.stringify(ch)}: { adv: ${g.adv}, d: ${JSON.stringify(g.d)} },`)
    .join("\n");
  const kern = Object.entries(logo.number.kern)
    .map(([pair, k]) => `${JSON.stringify(pair)}: ${k}`)
    .join(", ");
  return `// Generated by scripts/brand-assets.ts from prototype/name/logo/ — do not edit by hand.
// Run \`npx tsx scripts/brand-assets.ts\` after the logo files change;
// scripts/brand-assets.test.ts fails until it has run.

/** One glyph of the ".NN" digit set, in font units: the pen at (0, 0) on the baseline, y down. */
export interface IssueGlyph {
  adv: number;
  d: string;
}

/**
 * Mark M2 (QĐ-29): the bee that makes an H, drawn on a disc of radius 500
 * centred on (0, 0), y down (\`hive-mark.svg\`).
 */
export const MARK_FIGURE = ${JSON.stringify(logo.figure)};

/** Wordmark W3 (QĐ-30) in the lockup's units (\`hive-lockup.svg\`). */
export const WORDMARK = ${JSON.stringify(logo.wordmark)};

/** Where the plain lockup ends: its viewBox is \`-500 -500 (NAME_RIGHT + 500) 1000\`. */
export const NAME_RIGHT = ${logo.nameRight};

/**
 * The ".NN" of the lockup (\`hive-number.json\`): Big Shoulders Stencil
 * Display 700 as outlines, and the rule that composes any issue number —
 * x = start; for each character of "." + NN, draw its glyph at
 * translate(x, baseline) scale(scale), then x += (adv + kern[pair]) * scale
 * + tracking.
 */
export const ISSUE_NUMBER: {
  start: number;
  baseline: number;
  scale: number;
  tracking: number;
  glyphs: Readonly<Record<string, IssueGlyph>>;
  kern: Readonly<Record<string, number>>;
} = {
  start: ${logo.number.start},
  baseline: ${logo.number.baseline},
  scale: ${logo.number.scale},
  tracking: ${logo.number.tracking},
  glyphs: {
${glyphs}
  },
  kern: { ${kern} },
};
`;
}

/** The mark alone, exactly as the board's `markSVG()` writes it. */
export function markSvg(figure: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000"><circle r="500" fill="${HONEY}"/><path fill="${INK}" d="${figure}"/></svg>`;
}

/** The phone icon, exactly as the board's `touchSVG("p2")` writes it, the bee at `scale`. */
export function touchSvg(figure: string, scale: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000" role="img" aria-label="Icon P2">` +
    `<rect x="-500" y="-500" width="1000" height="1000" fill="${HONEY}"/><g transform="scale(${scale})"><path fill="${INK}" d="${figure}"/></g></svg>`
  );
}

/**
 * How far the bee reaches from the centre of the mark, in mark units: every
 * vertex and 256 points along every curve of the figure. The path uses M, L,
 * H, V, C and Z (both cases); anything else stops the script rather than
 * being skipped.
 */
export function figureReach(d: string): number {
  const tokens = d.match(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let reach = 0;
  const num = () => {
    const t = tokens[i++];
    if (t === undefined || /[A-Za-z]/.test(t)) throw new Error("figureReach: a number is missing");
    return Number(t);
  };
  const see = (px: number, py: number) => {
    reach = Math.max(reach, Math.hypot(px, py));
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i]!)) cmd = tokens[i++]!;
    const rel = cmd !== cmd.toUpperCase();
    const bx = rel ? x : 0;
    const by = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M":
        x = startX = num() + bx;
        y = startY = num() + by;
        see(x, y);
        cmd = rel ? "l" : "L";
        break;
      case "L":
        x = num() + bx;
        y = num() + by;
        see(x, y);
        break;
      case "H":
        x = num() + bx;
        see(x, y);
        break;
      case "V":
        y = num() + by;
        see(x, y);
        break;
      case "C": {
        const [c1x, c1y, c2x, c2y, ex, ey] = [num() + bx, num() + by, num() + bx, num() + by, num() + bx, num() + by];
        for (let k = 1; k <= 256; k++) {
          const t = k / 256;
          const u = 1 - t;
          see(
            u * u * u * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
            u * u * u * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
          );
        }
        x = ex;
        y = ey;
        break;
      }
      case "Z":
        x = startX;
        y = startY;
        break;
      default:
        throw new Error(`figureReach: path command "${cmd}" is not handled`);
    }
  }
  return reach;
}

/**
 * The largest scale, in thousandths, that keeps the whole bee inside the
 * safe circle. At P2's own .9 the outer corners of the H's feet stick out
 * of it, so the maskable icon is the same drawing, only just smaller.
 */
export function maskableScale(reach: number): number {
  return Math.floor((SAFE_RADIUS / reach) * 1000) / 1000;
}

// ───────────────────────────────────────────────────────────────── the board

/** `MASTER16.f2` from the board's script: sixteen rows of sixteen, "#" is ink. */
export function readF2Grid(boardHtml: string): string[] {
  const block = boardHtml.match(/\bf2:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  const rows = [...block.matchAll(/"([.#]+)"/g)].map((m) => m[1]!);
  if (rows.length !== 16 || rows.some((r) => r.length !== 16)) {
    throw new Error("MASTER16.f2 in prototype/name/share.html is no longer a 16 × 16 grid");
  }
  return rows;
}

export interface BoardFace {
  file: string;
  ranges: [number, number][];
}

/** The board's Unbounded @font-face rules, in the order they are declared. */
export function readBoardFaces(boardHtml: string): BoardFace[] {
  const faces = [
    ...boardHtml.matchAll(
      /@font-face\s*\{[^}]*font-family:\s*"Unbounded"[^}]*src:\s*url\("([^"]+)"\)[^}]*unicode-range:\s*([^;}]+)/g,
    ),
  ].map((m) => ({
    file: resolve(dirname(BOARD_FILE), m[1]!),
    ranges: m[2]!.split(",").map((part): [number, number] => {
      const [a, b] = part.trim().replace(/^U\+/i, "").split("-");
      return [parseInt(a!, 16), parseInt(b ?? a!, 16)];
    }),
  }));
  if (faces.length === 0) throw new Error("no Unbounded @font-face rule found in prototype/name/share.html");
  return faces;
}

/**
 * The cover line in two lines, as the O2 board breaks it: every sentence but
 * the last on the first line, the last one alone below ("Mười mẫu. Cắt một
 * lần." / "Hết là hết."). A single sentence stays on one line.
 */
export function headlineLines(headline: string): string[] {
  const sentences = headline.trim().split(/(?<=[.!?…])\s+/u);
  if (sentences.length < 2) return sentences;
  return [sentences.slice(0, -1).join(" "), sentences[sentences.length - 1]!];
}

/** The fingerprint `lib/brand/share-image.ts` compares with `HOME_COVER.headline`. */
export function headlineSource(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// ───────────────────────────────────────────────────────────────── ICO

/** A Windows icon directory whose images are PNG files, as every browser since 2009 reads it. */
export function packIco(frames: { size: number; png: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + 16 * frames.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(frames.length, 4);
  let offset = head.length;
  frames.forEach((f, i) => {
    const at = 6 + 16 * i;
    head[at] = f.size >= 256 ? 0 : f.size;
    head[at + 1] = f.size >= 256 ? 0 : f.size;
    head[at + 2] = 0;
    head[at + 3] = 0;
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(f.png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += f.png.length;
  });
  return Buffer.concat([head, ...frames.map((f) => f.png)]);
}

/** The frames of an ICO file: the size its directory claims and the image bytes. */
export function readIco(ico: Buffer): { size: number; data: Buffer }[] {
  if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) throw new Error("not an icon file");
  return Array.from({ length: ico.readUInt16LE(4) }, (_, i) => {
    const at = 6 + 16 * i;
    const length = ico.readUInt32LE(at + 8);
    const offset = ico.readUInt32LE(at + 12);
    return { size: ico[at] || 256, data: ico.subarray(offset, offset + length) };
  });
}

// ───────────────────────────────────────────────────────────────── drawing

/** The board's `raster()`: F2's grid on a round honey disc at 16 px, M2 from the vector above that. */
async function drawFavicons(page: Page, figure: string, grid: string[]): Promise<Buffer[]> {
  await page.setContent("<!doctype html><html><body></body></html>");
  const urls = await page.evaluate(
    async ({ mark, grid, honey, ink }) => {
      const img = new Image();
      await new Promise<void>((done, fail) => {
        img.onload = () => done();
        img.onerror = () => fail(new Error("the mark did not load"));
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(mark);
      });
      return [16, 32, 48].map((n) => {
        const c = document.createElement("canvas");
        c.width = c.height = n;
        const ctx = c.getContext("2d")!;
        if (n === 16) {
          ctx.fillStyle = honey;
          ctx.beginPath();
          ctx.arc(8, 8, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = ink;
          grid.forEach((row, y) =>
            [...row].forEach((ch, x) => {
              if (ch === "#") ctx.fillRect(x, y, 1, 1);
            }),
          );
        } else {
          ctx.drawImage(img, 0, 0, n, n);
        }
        return c.toDataURL("image/png");
      });
    },
    { mark: markSvg(figure), grid, honey: HONEY, ink: INK },
  );
  return urls.map((u) => Buffer.from(u.slice(u.indexOf(",") + 1), "base64"));
}

/**
 * The board's export of `touchSVG`: inline SVG in a square box, the box's
 * pixels. Each icon gets a page of its own: drawn one after another in one
 * resized page, the 512 px icon came out with one pixel one level apart
 * from run to run; in a fresh page it is the same every time.
 */
async function drawTouch(browser: Browser, figure: string, size: number, scale: number): Promise<Buffer> {
  const side = Math.max(size, 400);
  const page = await browser.newPage({ viewport: { width: side, height: side }, deviceScaleFactor: 1 });
  try {
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">` +
        `<div style="width:${size}px;height:${size}px">${touchSvg(figure, scale)}</div></body></html>`,
    );
    return await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } });
  } finally {
    await page.close();
  }
}

interface LineLayout {
  text: string;
  baseline: number;
  pens: number[];
}

interface HeadlineLayout {
  fontSize: number;
  letterSpacing: number;
  lines: LineLayout[];
}

/**
 * The board page itself, served from disk, in export mode for O2; its cover
 * line replaced by ours; every character's pen position and each line's
 * baseline read off Chrome's layout, in the 1200 × 630 frame's pixels.
 */
async function layoutHeadline(page: Page, lines: string[]): Promise<HeadlineLayout> {
  const origin = "http://board.test";
  const base = join(ROOT, "prototype");
  await page.route(`${origin}/**`, async (route) => {
    const file = resolve(base, "." + decodeURIComponent(new URL(route.request().url()).pathname));
    if (!file.startsWith(base + sep) || !existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ path: file });
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${origin}/name/share.html?og=o2&no=05`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("#export .o2 .hl") !== null);
  return page.evaluate(async (lines) => {
    const hl = document.querySelector<HTMLElement>("#export .o2 .hl")!;
    const frame = document.querySelector("#export .ogf")!.getBoundingClientRect();
    const kids: Node[] = [];
    lines.forEach((l, i) => {
      if (i) kids.push(document.createElement("br"));
      kids.push(document.createTextNode(l));
    });
    hl.replaceChildren(...kids);
    const all = lines.join(" ");
    await document.fonts.load('800 36px "Unbounded"', all);
    await document.fonts.ready;
    if (!document.fonts.check('800 36px "Unbounded"', all)) throw new Error("Unbounded 800 did not load for every character");
    const style = getComputedStyle(hl);
    const out: { text: string; baseline: number; pens: number[] }[] = [];
    for (const node of [...hl.childNodes].filter((n): n is Text => n.nodeType === Node.TEXT_NODE)) {
      // A box of no size sits on the baseline and moves nothing.
      const marker = document.createElement("span");
      marker.style.cssText = "display:inline-block;width:0;height:0";
      hl.insertBefore(marker, node);
      const baseline = marker.getBoundingClientRect().bottom - frame.top;
      marker.remove();
      const pens: number[] = [];
      for (let i = 0; i < node.data.length; i++) {
        const r = document.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + 1);
        pens.push(r.getClientRects()[0]!.left - frame.left);
      }
      out.push({ text: node.data, baseline, pens });
    }
    return { fontSize: parseFloat(style.fontSize), letterSpacing: parseFloat(style.letterSpacing), lines: out };
  }, lines);
}

// fontkit, as Next ships it for `next/font` (no type declarations; only what is used here).
interface FontkitCommand {
  command: "moveTo" | "lineTo" | "quadraticCurveTo" | "bezierCurveTo" | "closePath";
  args: number[];
}
interface FontkitPath {
  commands: FontkitCommand[];
  transform(a: number, b: number, c: number, d: number, e: number, f: number): FontkitPath;
}
interface FontkitGlyph {
  advanceWidth: number;
  path: FontkitPath;
}
interface FontkitFont {
  unitsPerEm: number;
  hasGlyphForCodePoint(cp: number): boolean;
  glyphForCodePoint(cp: number): FontkitGlyph;
}

function loadFontkit(): (data: Buffer) => FontkitFont {
  try {
    const mod = createRequire(import.meta.url)("next/dist/compiled/@next/font/dist/fontkit") as {
      default: (data: Buffer) => FontkitFont;
    };
    return mod.default;
  } catch (e) {
    throw new Error(
      "fontkit is no longer at next/dist/compiled/@next/font/dist/fontkit — the share image's cover line " +
        "cannot be redrawn with this Next version; the committed lib/brand/share-headline.ts is still valid. " +
        String(e),
    );
  }
}

const fmt = (v: number) => {
  const s = String(Number(v.toFixed(2)));
  return s === "-0" ? "0" : s;
};

function svgPath(commands: FontkitCommand[]): string {
  const letter = { moveTo: "M", lineTo: "L", quadraticCurveTo: "Q", bezierCurveTo: "C", closePath: "Z" } as const;
  return commands.map((c) => letter[c.command] + c.args.map(fmt).join(" ")).join("");
}

/**
 * Each glyph from the face Chrome used for it — the last declared face whose
 * unicode-range holds the character (CSS Fonts 4, "unicode-range") — scaled
 * to the computed font size and set at Chrome's pen position.
 *
 * The baseline is rounded to a whole pixel, because that is where Chrome
 * PAINTS a line of text, whatever fraction its layout gives it. Measured on
 * the board: the second line's layout baseline is 479.75, and glyph by glyph
 * the board's ink sat a quarter pixel lower than outlines set at 479.75, the
 * same distance the first line (438.00) shows none of.
 *
 * The advance check compares Chrome's step from one character to the next
 * with the glyph's own advance plus the letter-spacing: it catches a wrong
 * glyph, while kerning inside a face shows as a small difference.
 */
function outlines(layout: HeadlineLayout, faces: BoardFace[]): { d: string; worstStep: number } {
  const create = loadFontkit();
  const fonts = faces.map((f) => ({ ...f, font: create(readFileSync(f.file)) })).reverse();
  let d = "";
  let worstStep = 0;
  for (const line of layout.lines) {
    const baseline = Math.round(line.baseline);
    const chars = [...line.text];
    chars.forEach((ch, i) => {
      const cp = ch.codePointAt(0)!;
      const face = fonts.find(
        (f) => f.ranges.some(([a, b]) => cp >= a && cp <= b) && f.font.hasGlyphForCodePoint(cp),
      );
      if (!face) throw new Error(`no Unbounded face on the board holds "${ch}"`);
      const glyph = face.font.glyphForCodePoint(cp);
      const s = layout.fontSize / face.font.unitsPerEm;
      const next = line.pens[i + 1];
      if (next !== undefined) {
        worstStep = Math.max(worstStep, Math.abs(next - line.pens[i]! - (glyph.advanceWidth * s + layout.letterSpacing)));
      }
      if (/\s/u.test(ch)) return;
      d += svgPath(glyph.path.transform(s, 0, 0, -s, line.pens[i]!, baseline).commands);
    });
  }
  return { d, worstStep };
}

/** `lib/brand/share-headline.ts`, byte for byte. */
export function renderHeadlineModule(source: string, d: string): string {
  return `// Generated by scripts/brand-assets.ts — do not edit by hand.
// Run \`npx tsx scripts/brand-assets.ts\` after HOME_COVER.headline changes.

/**
 * sha-256 of the sentence the outlines below spell: \`HOME_COVER.headline\`
 * (lib/lexicon.ts) when they were drawn. \`lib/brand/share-image.ts\` refuses
 * to draw with outlines of another sentence.
 */
export const SHARE_HEADLINE_SOURCE = ${JSON.stringify(source)};

/**
 * The cover line of share image O2 (QĐ-31) as outlines: Unbounded 800 at the
 * board's size, broken into two lines as the board breaks it, every glyph at
 * the pen position Chrome gives it on \`prototype/name/share.html?og=o2\` and
 * on the whole-pixel baseline Chrome paints it on. In the share image's own
 * pixels (1200 × 630), filled white on the cloth.
 */
export const SHARE_HEADLINE_PATH = ${JSON.stringify(d)};
`;
}

// ───────────────────────────────────────────────────────────────── provenance

/** Writes the provenance chunk with the project's own tool, the platform binary its launcher would run. */
function embedProvenance(file: string, prompt: string): void {
  const skill = join(ROOT, ".claude/skills/impeccable");
  const os = ({ win32: "windows", darwin: "darwin", linux: "linux" } as Record<string, string>)[process.platform];
  const bin = join(skill, "scripts/bin", `${os}-${process.arch}`, process.platform === "win32" ? "impeccable.exe" : "impeccable");
  const args = ["embed-prompt", file, "--prompt", prompt];
  const env = { ...process.env, IMPECCABLE_SKILL_DIR: skill };
  if (existsSync(bin)) execFileSync(bin, args, { env, stdio: "pipe" });
  else execFileSync("sh", [join(skill, "scripts/impeccable"), ...args], { env, stdio: "pipe" });
}

const SOURCE_NOTE = "decision QD-31, tasks/plan.md; drawn by scripts/brand-assets.ts in Chrome (Playwright)";

// ───────────────────────────────────────────────────────────────── run

async function main(): Promise<void> {
  const logo = readLogo();
  const board = readFileSync(BOARD_FILE, "utf8");
  const grid = readF2Grid(board);
  const faces = readBoardFaces(board);
  const reach = figureReach(logo.figure);
  const maskable = maskableScale(reach);
  const lines = headlineLines(HOME_COVER.headline);

  mkdirSync(dirname(OUT.logo), { recursive: true });
  mkdirSync(dirname(OUT.icon(192)), { recursive: true });
  writeFileSync(OUT.logo, renderLogoModule(logo));

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let favicons: Buffer[];
  const touch: { file: string; png: Buffer; prompt: string }[] = [];
  let layout: HeadlineLayout;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    favicons = await drawFavicons(page, logo.figure, grid);
    const p2 = (size: number, purpose: string, scale: number, why: string) =>
      `HIVE phone icon P2, ${size} x ${size}, opaque (${purpose}): a honey #eba400 square with the bee of mark M2 ` +
      `(prototype/name/logo/hive-mark.svg) in ink #171410 at scale(${scale})${why}; ${SOURCE_NOTE}.`;
    touch.push({ file: OUT.appleIcon, png: await drawTouch(browser, logo.figure, 180, P2_SCALE), prompt: p2(180, "apple-touch-icon", P2_SCALE, "") });
    for (const size of [192, 512]) {
      touch.push({ file: OUT.icon(size), png: await drawTouch(browser, logo.figure, size, P2_SCALE), prompt: p2(size, "manifest purpose any", P2_SCALE, "") });
      touch.push({
        file: OUT.maskable(size),
        png: await drawTouch(browser, logo.figure, size, maskable),
        prompt: p2(size, "manifest purpose maskable", maskable, `, so its farthest point (${reach.toFixed(2)} of 1000 units at scale 1) stays inside the 80% safe circle`),
      });
    }
    layout = await layoutHeadline(page, lines);
  } finally {
    await browser.close();
  }

  // The ICO: each frame carries its provenance before it is packed.
  const tmp = mkdtempSync(join(tmpdir(), "brand-assets-"));
  try {
    const frames = [16, 32, 48].map((size, i) => {
      const file = join(tmp, `favicon-${size}.png`);
      writeFileSync(file, favicons[i]!);
      embedProvenance(
        file,
        size === 16
          ? `HIVE favicon, 16 px frame of app/favicon.ico: F2, the hand-drawn grid MASTER16.f2 from prototype/name/share.html, ink #171410 on an antialiased honey #eba400 disc; ${SOURCE_NOTE}.`
          : `HIVE favicon, ${size} px frame of app/favicon.ico: mark M2 (prototype/name/logo/hive-mark.svg) drawn from the vector on a canvas, as the share board draws it; ${SOURCE_NOTE}.`,
      );
      return { size, png: readFileSync(file) };
    });
    writeFileSync(OUT.favicon, packIco(frames));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  for (const t of touch) {
    writeFileSync(t.file, t.png);
    embedProvenance(t.file, t.prompt);
  }

  const { d, worstStep } = outlines(layout, faces);
  writeFileSync(OUT.headline, renderHeadlineModule(headlineSource(HOME_COVER.headline), d));

  console.log(`logo data        ${OUT.logo}`);
  console.log(`favicon          ${OUT.favicon} (16 F2, 32 and 48 M2)`);
  console.log(`phone icons      apple-icon 180; any 192, 512 at scale ${P2_SCALE}; maskable 192, 512 at scale ${maskable}`);
  console.log(`bee reach        ${reach.toFixed(3)} units at scale 1, ${(reach * maskable).toFixed(3)} at ${maskable} (safe radius ${SAFE_RADIUS})`);
  console.log(`cover line       ${lines.length} line(s), baselines ${layout.lines.map((l) => l.baseline.toFixed(3)).join(" / ")}, ` +
    `font ${layout.fontSize}px, letter-spacing ${layout.letterSpacing}px, worst step vs advance ${worstStep.toFixed(3)} px`);
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
