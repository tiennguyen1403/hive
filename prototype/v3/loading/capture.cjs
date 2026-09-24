// The pages the loading board clicks between, shot from the running store
// (next start, :3200) at their first viewport, plus every visible link that
// leads to another shot page: those become the board's click targets.
// Run: node prototype/v3/loading/capture.cjs   (the store must be up on 3200)
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = createRequire("D:/Code/e-commerce/package.json")("@playwright/test");

const BASE = "http://127.0.0.1:3200";
const OUT = __dirname;
const PAGES = [
  { url: "/", key: "home" },
  { url: "/products", key: "products" },
  { url: "/products?family=TEE", key: "tee" },
  { url: "/products/khoi", key: "khoi" },
];
const DEVICES = [
  { key: "1280", width: 1280, height: 800, mobile: false },
  { key: "390", width: 390, height: 844, mobile: true },
];

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const shots = {};
  for (const d of DEVICES) {
    shots[d.key] = { width: d.width, height: d.height, pages: {} };
    for (const p of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: 2, isMobile: d.mobile, hasTouch: d.mobile });
      const page = await ctx.newPage();
      await page.goto(BASE + p.url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // Every photo in the first viewport has to be on screen before the shot.
      await page.waitForFunction(() => [...document.images].every((i) => i.getBoundingClientRect().top > innerHeight || (i.complete && i.naturalWidth > 0)), null, { timeout: 15000 });
      await page.waitForTimeout(500);
      const facts = await page.evaluate((known) => {
        const nav = document.querySelector(".nav3").getBoundingClientRect();
        const here = location.pathname + location.search;
        const links = [];
        for (const a of document.querySelectorAll("a[href]")) {
          const href = a.getAttribute("href");
          if (!known.includes(href) || href === here) continue;
          const r = a.getBoundingClientRect();
          if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= innerHeight || getComputedStyle(a).visibility === "hidden") continue;
          const label = (a.getAttribute("aria-label") || a.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40);
          links.push({ href, label, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
        }
        return { navBottom: Math.round(nav.bottom), links };
      }, PAGES.map((x) => x.url));
      const file = `${p.key}-${d.key}.jpg`;
      await page.screenshot({ path: path.join(OUT, file), type: "jpeg", quality: 86 });
      shots[d.key].navBottom = facts.navBottom;
      shots[d.key].pages[p.url] = { img: "loading/" + file, links: facts.links };
      console.log(d.key, p.url, "links:", facts.links.map((l) => l.href + " " + l.label).join(" | "));
      await ctx.close();
    }
  }
  // A script, not JSON, so the board also opens straight from disk (file://).
  fs.writeFileSync(path.join(OUT, "shots.js"), "window.LOADING_SHOTS = " + JSON.stringify(shots, null, 1) + ";\n");
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
