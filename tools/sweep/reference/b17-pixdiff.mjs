// Slice B17: before/after on sample-only data, every admin route, both languages.
// Writes .playwright-cli/b17-pixdiff.json; prints a one-line summary per class.
import { readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("D:/Code/e-commerce/package.json");
const sharp = require("sharp");

const DIR = "D:/Code/e-commerce/.playwright-cli/shots/backend/b17/compare";
const names = readdirSync(DIR).filter((f) => f.startsWith("before-")).map((f) => f.slice("before-".length));
const out = [];
for (const n of names) {
  const a = await sharp(`${DIR}/before-${n}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(`${DIR}/after-${n}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = Math.min(a.info.width, b.info.width);
  const H = Math.min(a.info.height, b.info.height);
  let diff = 0;
  const bands = new Map();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * a.info.width + x) * 4;
      const j = (y * b.info.width + x) * 4;
      if (a.data[i] !== b.data[j] || a.data[i + 1] !== b.data[j + 1] || a.data[i + 2] !== b.data[j + 2]) {
        diff++;
        const band = Math.floor(y / 20) * 20;
        const r = bands.get(band) || { x0: x, x1: x, n: 0 };
        r.x0 = Math.min(r.x0, x);
        r.x1 = Math.max(r.x1, x);
        r.n++;
        bands.set(band, r);
      }
    }
  out.push({
    name: n,
    sameSize: a.info.width === b.info.width && a.info.height === b.info.height,
    size: `${a.info.width}x${a.info.height} / ${b.info.width}x${b.info.height}`,
    diff,
    bands: [...bands].map(([y, r]) => `y${y}-${y + 19} x${r.x0}-${r.x1} (${r.n})`),
  });
}
writeFileSync("D:/Code/e-commerce/.playwright-cli/b17-pixdiff.json", JSON.stringify(out, null, 1));
const identical = out.filter((o) => o.sameSize && o.diff === 0).length;
const differ = out.filter((o) => !o.sameSize || o.diff > 0);
console.log(`pairs ${out.length}, identical ${identical}, differ ${differ.length}`);
for (const d of differ) console.log(`${d.name}: ${d.size}, ${d.diff}px, ${d.bands.slice(0, 4).join("; ")}${d.bands.length > 4 ? ` (+${d.bands.length - 4} bands)` : ""}`);
