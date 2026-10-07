#!/usr/bin/env node
/**
 * Two folders of shots, pixel by pixel (round v6, tooling slice T1; port of slice B17's `b17-pixdiff.mjs`).
 *
 *   npm run pixdiff -- <before-dir> <after-dir>                      every PNG in both
 *   npm run pixdiff -- <before> <after> home-390.png cart-1280.png   these names
 *   npm run pixdiff -- <before> <after> --list=names.txt             names in a file, one per line
 *   npm run pixdiff -- <before> <after> --regions=tools/sweep/baseline-vi.json --regions=run.json
 *                                         leave out what the sweeps marked as clock (`volatile`)
 *   npm run pixdiff -- <before> <after> --ignore="home-*.png:0,560,390,40"
 *                                         leave out a box (x,y,w,h) on the names matching a pattern
 *   npm run pixdiff -- <before> <after> --out=.playwright-cli/pixdiff.json
 *   npm run pixdiff -- <before> <after> --tolerance=0.1
 *                                         a pair whose share is at most 0.1% counts as "within", not "different"
 *
 * For each pair: the share of pixels that differ (of the area both images cover, boxes left out), and the 20px
 * bands where they do, with the columns each band spans. A size change is reported as such. Exit 0 when every
 * pair is identical, 1 when one is not, 2 on a usage error.
 *
 * A box from `--regions` comes from the sweep that took the shot: the DOM's own place for each countdown
 * (`manifest.mjs`, VOLATILE), widened by `--pad` (4px by default) so a digit that changes width stays inside.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

/** `*` and `?` as in a shell. */
export function globToRegExp(glob) {
  return new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
}

/** `pattern:x,y,w,h` → `{ test, box }`. */
export function parseIgnore(spec) {
  const at = spec.lastIndexOf(":");
  if (at <= 0) throw new Error(`--ignore wants pattern:x,y,w,h, got "${spec}"`);
  const box = spec.slice(at + 1).split(",").map(Number);
  if (box.length !== 4 || box.some((n) => !Number.isFinite(n))) throw new Error(`--ignore box must be x,y,w,h: "${spec}"`);
  const re = globToRegExp(spec.slice(0, at));
  return { test: (name) => re.test(name) || re.test(name.replace(/\.png$/, "")), box };
}

/** The clock's boxes of a sweep's JSON, by shot name (`home-390.png`). */
export function regionsFrom(sweepJson) {
  const out = new Map();
  for (const [name, boxes] of Object.entries(sweepJson.volatile ?? {})) out.set(`${name}.png`, boxes);
  return out;
}

/**
 * Compare two decoded images (RGBA, `{ data, width, height }`), leaving out `boxes`.
 *
 * @param {{ data: Uint8Array | Buffer, width: number, height: number }} a
 * @param {{ data: Uint8Array | Buffer, width: number, height: number }} b
 * @param {number[][]} boxes [x, y, w, h] in the images' pixels
 * @param {number} band band height
 */
export function compareImages(a, b, boxes = [], band = 20) {
  const W = Math.min(a.width, b.width);
  const H = Math.min(a.height, b.height);
  const skip = (x, y) => boxes.some(([bx, by, bw, bh]) => x >= bx && x < bx + bw && y >= by && y < by + bh);
  let diff = 0;
  let skipped = 0;
  const bands = new Map();
  for (let y = 0; y < H; y++) {
    const rowBoxes = boxes.filter(([, by, , bh]) => y >= by && y < by + bh);
    for (let x = 0; x < W; x++) {
      if (rowBoxes.length && skip(x, y)) {
        skipped++;
        continue;
      }
      const i = (y * a.width + x) * 4;
      const j = (y * b.width + x) * 4;
      if (a.data[i] !== b.data[j] || a.data[i + 1] !== b.data[j + 1] || a.data[i + 2] !== b.data[j + 2] || a.data[i + 3] !== b.data[j + 3]) {
        diff++;
        const top = Math.floor(y / band) * band;
        const r = bands.get(top) ?? { x0: x, x1: x, n: 0 };
        r.x0 = Math.min(r.x0, x);
        r.x1 = Math.max(r.x1, x);
        r.n++;
        bands.set(top, r);
      }
    }
  }
  const area = W * H - skipped;
  const sameSize = a.width === b.width && a.height === b.height;
  return {
    sameSize,
    size: `${a.width}x${a.height} / ${b.width}x${b.height}`,
    diff,
    percent: area > 0 ? Number(((diff / area) * 100).toFixed(4)) : 0,
    ignored: skipped,
    bands: [...bands].sort((p, q) => p[0] - q[0]).map(([y, r]) => ({ y0: y, y1: y + band - 1, x0: r.x0, x1: r.x1, n: r.n })),
  };
}

async function decode(file) {
  const sharp = require("sharp");
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * Every pair, compared.
 *
 * @param {{ dirA: string, dirB: string, names?: string[], ignores?: ReturnType<typeof parseIgnore>[],
 *   regions?: Map<string, number[][]>[], pad?: number, band?: number, tolerance?: number }} opts
 */
export async function pixdiff({ dirA, dirB, names, ignores = [], regions = [], pad = 4, band = 20, tolerance = 0 }) {
  const pngs = (dir) => new Set(readdirSync(dir).filter((f) => f.endsWith(".png")));
  const inA = pngs(dirA);
  const inB = pngs(dirB);
  const list = names?.length ? names.map((n) => (n.endsWith(".png") ? n : `${n}.png`)) : [...inA].filter((n) => inB.has(n)).sort();
  const onlyA = names?.length ? [] : [...inA].filter((n) => !inB.has(n)).sort();
  const onlyB = names?.length ? [] : [...inB].filter((n) => !inA.has(n)).sort();
  const pairs = [];
  const missing = [];
  for (const name of list) {
    const fa = join(dirA, name);
    const fb = join(dirB, name);
    if (!existsSync(fa) || !existsSync(fb)) {
      missing.push({ name, in: existsSync(fa) ? "before only" : existsSync(fb) ? "after only" : "neither" });
      continue;
    }
    const boxes = [];
    for (const ig of ignores) if (ig.test(name)) boxes.push(ig.box);
    for (const map of regions) for (const [x, y, w, h] of map.get(name) ?? []) boxes.push([x - pad, y - pad, w + 2 * pad, h + 2 * pad]);
    const result = compareImages(await decode(fa), await decode(fb), boxes, band);
    pairs.push({ name, ...result, boxes: boxes.length });
  }
  const identical = pairs.filter((p) => p.sameSize && p.diff === 0).length;
  const within = pairs.filter((p) => p.sameSize && p.diff > 0 && p.percent <= tolerance).length;
  return { dirA, dirB, tolerance, pairs, identical, within, differ: pairs.length - identical - within, missing, onlyA, onlyB };
}

/** The comparison in words. */
export function formatPixdiff(r) {
  const lines = [
    `pixdiff ${r.dirA} vs ${r.dirB}: pairs ${r.pairs.length}, identical ${r.identical}${r.tolerance ? `, within ${r.tolerance}% ${r.within}` : ""}, differ ${r.differ}`,
  ];
  for (const m of r.missing) lines.push(`  ? ${m.name}: ${m.in}`);
  if (r.onlyA.length) lines.push(`  only in the first folder (${r.onlyA.length}): ${r.onlyA.slice(0, 8).join(", ")}${r.onlyA.length > 8 ? " …" : ""}`);
  if (r.onlyB.length) lines.push(`  only in the second folder (${r.onlyB.length}): ${r.onlyB.slice(0, 8).join(", ")}${r.onlyB.length > 8 ? " …" : ""}`);
  for (const p of r.pairs) {
    if (p.sameSize && p.diff === 0) continue;
    const bands = p.bands.map((b) => `y${b.y0}-${b.y1} x${b.x0}-${b.x1} (${b.n})`);
    const mark = p.sameSize && p.percent <= (r.tolerance ?? 0) ? "≈" : "≠";
    lines.push(
      `  ${mark} ${p.name}: ${p.sameSize ? p.size.split(" / ")[0] : `size ${p.size}`}, ${p.diff}px = ${p.percent}%${p.boxes ? `, ${p.boxes} boxes left out` : ""}; ${bands.slice(0, 6).join("; ")}${bands.length > 6 ? ` (+${bands.length - 6} bands)` : ""}`,
    );
  }
  const total = r.pairs.reduce((n, p) => n + p.diff, 0);
  const verdict =
    r.differ > 0 || r.missing.length > 0 ? "DIFFERENT" : r.within > 0 ? `WITHIN ${r.tolerance}% (${total}px in ${r.within} pairs)` : `IDENTICAL (0%, ${total}px)`;
  lines.push(verdict);
  return lines.join("\n");
}

async function main(argv) {
  const pos = [];
  const ignores = [];
  const regions = [];
  let out = null;
  let pad = 4;
  let band = 20;
  let tolerance = 0;
  const names = [];
  for (const a of argv) {
    if (a.startsWith("--ignore=")) ignores.push(parseIgnore(a.slice(9)));
    else if (a.startsWith("--regions=")) {
      const raw = readFileSync(resolve(a.slice(10)), "utf8");
      regions.push(regionsFrom(JSON.parse(raw.slice(raw.indexOf("{")))));
    } else if (a.startsWith("--list=")) names.push(...readFileSync(resolve(a.slice(7)), "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
    else if (a.startsWith("--out=")) out = a.slice(6);
    else if (a.startsWith("--pad=")) pad = Number(a.slice(6));
    else if (a.startsWith("--band=")) band = Number(a.slice(7));
    else if (a.startsWith("--tolerance=")) tolerance = Number(a.slice(12));
    else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
    else pos.push(a);
  }
  if (pos.length < 2) throw new Error("usage: pixdiff.mjs <dir-a> <dir-b> [names…] [--list=f] [--ignore=pat:x,y,w,h] [--regions=sweep.json] [--out=f]");
  const [dirA, dirB, ...rest] = pos;
  names.push(...rest.map((n) => basename(n)));
  const result = await pixdiff({ dirA, dirB, names, ignores, regions, pad, band, tolerance });
  if (out) writeFileSync(resolve(out), JSON.stringify(result, null, 1) + "\n");
  console.log(formatPixdiff(result));
  return result.differ === 0 && result.missing.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (e) => {
      console.error(`pixdiff: ${e.message}`);
      process.exitCode = 2;
    },
  );
}
