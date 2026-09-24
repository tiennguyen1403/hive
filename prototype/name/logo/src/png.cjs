// Transparent PNGs from the final SVGs, at exact pixel sizes.
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = createRequire("D:/Code/e-commerce/package.json")("@playwright/test");
const LOGO = "D:/Code/e-commerce/prototype/name/logo", PNG = path.join(LOGO, "png");
const jobs = [];
for (const s of [16, 32, 48, 64, 180, 512, 1024]) jobs.push(["hive-mark.svg", `hive-mark-${s}.png`, s]);
for (const v of ["black", "negative", "knockout"]) jobs.push([`hive-mark-${v}.svg`, `hive-mark-${v}-512.png`, 512]);
jobs.push(["hive-wordmark.svg", "hive-wordmark-800.png", 800], ["hive-wordmark-white.svg", "hive-wordmark-white-800.png", 800]);
for (const l of ["hive-lockup", "hive-lockup-white", "hive-lockup-05", "hive-lockup-05-white"]) jobs.push([`${l}.svg`, `${l}-1640.png`, 1640]);
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [src, out, w] of jobs) {
    const svg = fs.readFileSync(path.join(LOGO, src), "utf8");
    const [, , vw, vh] = svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
    const h = Math.round((w * vh) / vw);
    await page.setViewportSize({ width: w, height: Math.max(h, 1) });
    await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg.replace("<svg ", `<svg width="${w}" height="${h}" `)}`);
    await page.screenshot({ path: path.join(PNG, out), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    console.log(out, `${w}×${h}`, fs.statSync(path.join(PNG, out)).size);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
