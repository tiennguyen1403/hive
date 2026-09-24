/**
 * The fixed styles' stand-in photos: each colourway's flat drawing on the
 * plate, as a file (v3 slice 11).
 *
 * WHAT IT WRITES
 *   public/flats/<shape>-<colour>.png   one per key in `FLAT_KEYS` (seventeen:
 *                                       the eight fixed styles' colourways),
 *                                       1040 × 1300 — the shop's 4:5 at the
 *                                       size its largest frame asks for
 *
 * WHERE FROM
 *   lib/flats.ts — the outlines (`FLATS`) and the painting (`flatSvg`), copied
 *     from the approved board `prototype/v3/line/line-mock.js` (round 4,
 *     25/09/2026) and held to it by `lib/flats.test.ts`; the plate is
 *     `--plate` (`PLATE`), the colours are `data/colors.ts`
 *
 * HOW
 *   Chrome through Playwright (a devDependency), as `scripts/brand-assets.ts`
 *   draws the brand's files: the SVG inline in a page of exactly the file's
 *   size, and the page's pixels. The board's 200 × 250 frame scales to
 *   1040 × 1300, so the garment sits in the file where it sits on the board's
 *   card. No text. A fresh page per file: `brand-assets.ts` measured one
 *   pixel drifting a level between runs when one page was reused.
 *
 *   Provenance: every PNG carries an `impeccable:prompt` text chunk written
 *   by `impeccable embed-prompt`, naming this script, `lib/flats.ts` and the
 *   board.
 *
 * WHEN TO RUN IT
 *   After `lib/flats.ts` or the fixed styles' colourways change;
 *   `lib/flats.test.ts` fails until the files match the keys. Running it
 *   again writes the same bytes.
 *
 *     npx tsx scripts/flats.ts        (needs Google Chrome installed)
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Browser } from "@playwright/test";
import { COLORS } from "@/data/colors";
import { FLAT_KEYS, PLATE, flatOf, flatPath, flatSvg, type Flat } from "@/lib/flats";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The file's size: 4:5, above the 760 px the product page's gallery asks a photo for (`ProductView`). */
export const SIZE = { width: 1040, height: 1300 } as const;

/** The page that is photographed: the drawing at the file's size, and nothing else. */
export function flatPage(f: Flat): string {
  return (
    `<!doctype html><html><head><meta charset="utf-8"><style>` +
    `html,body{margin:0;padding:0;background:${PLATE}}` +
    `svg{display:block;width:${SIZE.width}px;height:${SIZE.height}px}` +
    `</style></head><body>${flatSvg(f.shape, f.color, { plate: PLATE })}</body></html>`
  );
}

async function draw(browser: Browser, f: Flat): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { ...SIZE }, deviceScaleFactor: 1 });
  try {
    await page.setContent(flatPage(f));
    return await page.screenshot({ clip: { x: 0, y: 0, ...SIZE } });
  } finally {
    await page.close();
  }
}

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

export function provenance(f: Flat): string {
  const c = COLORS[f.color];
  return (
    `HIVE stand-in photo for a fixed style: the ${f.shape} flat in ${c.label} (${c.hex}) on the plate ${PLATE}, ` +
    `${SIZE.width} x ${SIZE.height}, no text. Nguồn: lib/flats.ts + scripts/flats.ts, hình phẳng của mock ` +
    `prototype/v3/line (FLATS and flat() in line-mock.js, round 4 approved 25/09/2026); drawn in Chrome (Playwright). ` +
    `Replaced when the style's photographs exist.`
  );
}

async function main(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const written: { file: string; png: Buffer; prompt: string }[] = [];
  try {
    for (const key of FLAT_KEYS) {
      const f = flatOf(key)!;
      written.push({ file: join(ROOT, "public", flatPath(key)!), png: await draw(browser, f), prompt: provenance(f) });
    }
  } finally {
    await browser.close();
  }

  for (const w of written) {
    mkdirSync(dirname(w.file), { recursive: true });
    writeFileSync(w.file, w.png);
    embedProvenance(w.file, w.prompt);
    const bytes = readFileSync(w.file);
    const sha = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
    console.log(`${w.file.slice(ROOT.length + 1).replace(/\\/g, "/")}  ${bytes.length} bytes  sha256 ${sha}`);
  }
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
