/*
 * Puts several screenshots side by side in one PNG, each scaled to the same width, for quick review.
 *
 *   node prototype/explore/tools/strip.cjs <out.png> <image> [<image> ...] [--w 390]
 */
const fs = require("fs");
const path = require("path");
const { withBrowser } = require("./browser.cjs");

const args = process.argv.slice(2);
const wi = args.indexOf("--w");
const w = wi >= 0 ? Number(args[wi + 1]) : 390;
const files = args.filter((a, i) => !a.startsWith("--") && !(wi >= 0 && i === wi + 1));
const [out, ...images] = files;

withBrowser(async (browser) => {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const cells = images.map((f) => {
    const b64 = fs.readFileSync(f).toString("base64");
    return `<figure style="margin:0;width:${w}px;flex:none"><img src="data:image/png;base64,${b64}" style="width:${w}px;display:block">
      <figcaption style="font:12px Arial;color:#eee;padding:4px 0">${path.basename(f)}</figcaption></figure>`;
  }).join("");
  await page.setContent(`<body style="margin:0;background:#444;display:flex;gap:10px;padding:10px;width:max-content;align-items:flex-start">${cells}</body>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, fullPage: true });
  console.log(out);
}).catch((e) => { console.error(e); process.exit(1); });
