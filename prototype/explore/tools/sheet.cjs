/*
 * Contact sheets of a whole page: the full-page capture cut into strips laid side by side, so a long phone page can be
 * looked at in one or two images at a readable size.
 *
 *   node prototype/explore/tools/sheet.cjs <direction> <page> [--width 390] [--strip 1400] [--per 4] [--motion] [--query "m=nguoi"]
 *
 * Writes _shots/<dir>/sheets/<page>-<width>-<n>.png (DPR 1).
 */
const fs = require("fs");
const path = require("path");
const { withBrowser } = require("./browser.cjs");

const args = process.argv.slice(2);
const [dir, pageName] = args.filter((a) => !a.startsWith("--"));
const opt = (n, f) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : f; };
const width = Number(opt("width", "390"));
const stripH = Number(opt("strip", width < 600 ? "1400" : "900"));
const per = Number(opt("per", width < 600 ? "4" : "2"));
const query = opt("query", "");
const out = path.resolve(__dirname, "../_shots", dir, "sheets");
fs.mkdirSync(out, { recursive: true });

(async () => {
  await withBrowser(async (browser) => {
    const ctx = await browser.newContext({
      viewport: { width, height: width < 600 ? 844 : 800 }, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600,
      locale: "vi-VN", reducedMotion: args.includes("--motion") ? "no-preference" : "reduce",
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${opt("port", "3100")}/explore/${dir}/${pageName}.html?${query}&x=${Date.now()}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.8) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
    });
      // A decorative backdrop fixed to the screen would cover only the first screen of a full-page capture;
      // for the still, stretch it over the whole document.
      await page.evaluate(() => {
        const vw = window.innerWidth, vh = window.innerHeight, h = document.documentElement.scrollHeight;
        for (const el of document.querySelectorAll("body *")) {
          const cs = getComputedStyle(el);
          if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
          if (el.getAttribute("aria-hidden") !== "true" && cs.pointerEvents !== "none") continue;
          const r = el.getBoundingClientRect();
          if (r.width < vw * 0.9 || r.height < vh * 0.9) continue;
          el.style.setProperty("position", "absolute", "important");
          el.style.setProperty("top", "0", "important");
          el.style.setProperty("bottom", "auto", "important");
          el.style.setProperty("height", h + "px", "important");
        }
      });
      // A bar fixed to the bottom of the screen would be painted across the middle of a full-page capture;
      // for the still, park it at the end of the document instead.
      await page.evaluate(() => {
        const vh = window.innerHeight;
        for (const el of document.querySelectorAll("body *")) {
          const cs = getComputedStyle(el);
          if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
          const r = el.getBoundingClientRect();
          if (r.height === 0 || r.height > vh * 0.4 || r.bottom < vh - 2 || r.top < vh / 2) continue;
          el.style.setProperty("position", "absolute", "important");
          el.style.setProperty("top", (document.documentElement.scrollHeight - r.height) + "px", "important");
          el.style.setProperty("bottom", "auto", "important");
        }
      });
      // Chrome's full-page capture can paint lazy images as blank; load and decode every image first.
      await page.evaluate(async () => {
        for (const i of document.images) i.loading = "eager";
        await Promise.all([...document.images].map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); setTimeout(r, 8000); }))));
        await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
      });
    await page.waitForTimeout(800);
    const png = await page.screenshot({ fullPage: true });
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const strips = Math.ceil(total / stripH);
    const b64 = png.toString("base64");
    const sheetPage = await ctx.newPage();
    await sheetPage.setViewportSize({ width: 800, height: 600 });
    let n = 0;
    for (let s = 0; s < strips; s += per) {
      const count = Math.min(per, strips - s);
      const cols = Array.from({ length: count }, (_, k) => {
        const top = (s + k) * stripH;
        return `<div style="width:${width}px;height:${stripH}px;background:#fff url(data:image/png;base64,${b64}) no-repeat 0 -${top}px;flex:none;position:relative">
          <span style="position:absolute;top:0;right:0;background:#e00;color:#fff;font:11px Arial;padding:1px 4px">${top}px</span></div>`;
      }).join("");
      await sheetPage.setContent(`<body style="margin:0;background:#555;display:flex;gap:12px;padding:12px;width:max-content">${cols}</body>`);
      const file = path.join(out, `${pageName}${query ? "-" + query.replace(/[^a-z0-9]+/gi, "_") : ""}-${width}-${++n}.png`);
      await sheetPage.screenshot({ path: file, fullPage: true });
      console.log(path.relative(process.cwd(), file));
    }
    await ctx.close();
  });
})().catch((e) => { console.error(e); process.exit(1); });
