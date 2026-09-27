/*
 * Screenshots and form checks for one direction of the style exploration.
 *
 *   node prototype/explore/tools/shoot.cjs <direction> [--port 3100] [--motion] [--pages home,products,product]
 *
 * Needs the mock server: `cd prototype && python serve.py 3100`.
 * Writes PNGs and report.json to prototype/explore/_shots/<direction>/ and prints a summary.
 *
 * Captures: every page at 390 wide (phone, 2x) and at 1280 wide (desktop, 1x), full page.
 * Motion is reduced by default so a still shows the settled state; --motion keeps it.
 *
 * Checks (measured in the browser, not guessed):
 *   overflow   page wider than the viewport
 *   tiny       visible text under 11px (the project's floor for text a shopper reads)
 *   target     at 390, a control smaller than 44px in either direction (inline links in running text flagged separately)
 *   dash       an em dash or en dash in visible text (hyphen only)
 *   contrast   text below WCAG AA against its nearest solid background (images are skipped, so text on photos is not judged)
 *   outline    an element showing an outline at rest (the user wants none outside keyboard focus)
 *   image      an <img> that failed to load
 *   console    errors in the console or failed requests
 */
const path = require("path");
const fs = require("fs");

const { withBrowser } = require("./browser.cjs");

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
if (!dir) {
  console.error("usage: node prototype/explore/tools/shoot.cjs <direction> [--port 3100] [--motion] [--pages a,b]");
  process.exit(2);
}
const opt = (name, fallback) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const port = Number(opt("port", "3100"));
const keepMotion = args.includes("--motion");
const pages = opt("pages", "home,products,product").split(",").filter(Boolean);
const out = path.resolve(__dirname, "../_shots", dir);
fs.mkdirSync(out, { recursive: true });

const WIDTHS = [
  { name: "390", width: 390, height: 844, scale: 2, mobile: true },
  { name: "1280", width: 1280, height: 800, scale: 1, mobile: false },
];

async function check(page, mobile, width) {
  return page.evaluate(([mobile, width]) => {
    const report = { overflow: null, tiny: [], target: [], dash: [], contrast: [], outline: [], image: [] };
    const doc = document.documentElement;
    if (Math.max(doc.scrollWidth, document.body.scrollWidth) > width + 1) report.overflow = { scrollWidth: Math.max(doc.scrollWidth, document.body.scrollWidth), viewport: width };

    const visible = (el) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const label = (el) => {
      const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "";
      return el.tagName.toLowerCase() + cls;
    };
    const snip = (t) => t.replace(/\s+/g, " ").trim().slice(0, 50);

    // Text nodes: size, dashes, contrast.
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const bgOf = (el) => {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage && cs.backgroundImage !== "none") return null; // gradient or image: not judged
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0.95) return c;
        if (n.tagName === "IMG" || n.tagName === "VIDEO" || n.tagName === "CANVAS") return null;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode;
      if (!t.nodeValue.trim()) continue;
      const el = t.parentElement;
      if (!el || seen.has(el) || !visible(el)) continue;
      if (el.closest("script,style,noscript,[aria-hidden='true']")) continue;
      seen.add(el);
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const text = el.innerText || t.nodeValue;
      if (size < 11) report.tiny.push({ el: label(el), size, text: snip(text) });
      if (/[–—]/.test(t.nodeValue)) report.dash.push({ el: label(el), text: snip(t.nodeValue) });
      const fg = parse(cs.color);
      const bg = bgOf(el);
      if (fg && bg && fg.a > 0.2) {
        const mix = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
        const L1 = lum(mix), L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const bold = Number(cs.fontWeight) >= 700;
        const large = size >= 24 || (bold && size >= 18.66);
        const need = large ? 3 : 4.5;
        if (ratio < need) report.contrast.push({ el: label(el), ratio: Math.round(ratio * 100) / 100, need, size, text: snip(text) });
      }
    }

    // Controls.
    const controls = document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=radio],[role=option],label[for]");
    for (const el of controls) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) report.outline.push({ el: label(el), outline: cs.outlineStyle + " " + cs.outlineWidth });
      if (!mobile) continue;
      const r = el.getBoundingClientRect();
      // A pseudo-element can enlarge the hit area; count ::after/::before boxes that are absolutely placed.
      let w = r.width, h = r.height;
      for (const pseudo of ["::after", "::before"]) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content !== "none" && ps.position === "absolute") {
          const inset = (v) => (v === "auto" ? 0 : parseFloat(v) || 0);
          w = Math.max(w, r.width - inset(ps.left) - inset(ps.right));
          h = Math.max(h, r.height - inset(ps.top) - inset(ps.bottom));
        }
      }
      if (w < 44 || h < 44) {
        const inline = !!el.closest("p,li") && cs.display === "inline";
        report.target.push({ el: label(el), w: Math.round(w), h: Math.round(h), inline, text: snip(el.innerText || el.getAttribute("aria-label") || "") });
      }
    }

    for (const img of document.images) {
      if (!img.getAttribute("src")) continue;
      if (!img.complete) report.image.push("not loaded: " + img.getAttribute("src"));
      else if (img.naturalWidth === 0) report.image.push("broken: " + img.getAttribute("src"));
    }
    return report;
  }, [mobile, width]);
}

(async () => {
  const summary = {};
  await withBrowser(async (browser) => {
  for (const w of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      deviceScaleFactor: w.scale,
      isMobile: w.mobile,
      hasTouch: w.mobile,
      locale: "vi-VN",
      reducedMotion: keepMotion ? "no-preference" : "reduce",
    });
    for (const p of pages) {
      const page = await context.newPage();
      const problems = [];
      page.on("console", (m) => { if (m.type() === "error") problems.push("console: " + m.text()); });
      page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
      page.on("requestfailed", (r) => problems.push("requestfailed: " + r.url()));
      page.on("response", (r) => { if (r.status() >= 400) problems.push(r.status() + ": " + r.url()); });
      // A page may carry a query: "cart?cart=full" loads cart.html?cart=full and is saved as cart_cart-full.
      const [pageName, query] = p.split("?");
      const label = p.replace(/[?&=]+/g, "_").replace(/_+$/, "");
      const url = `http://127.0.0.1:${port}/explore/${dir}/${pageName}.html?${query ? query + "&" : ""}x=${Date.now()}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // Walk down the page so lazy images and in-view reveals fire, then come back up.
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      // Chrome's full-page capture can paint lazy images as blank; load and decode every image first.
      await page.evaluate(async () => {
        for (const i of document.images) i.loading = "eager";
        await Promise.all([...document.images].map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); setTimeout(r, 8000); }))));
        await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
      });
      await page.waitForTimeout(900);
      const report = await check(page, w.mobile, w.width);
      report.console = problems;
      const file = path.join(out, `${label}-${w.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      summary[`${label}-${w.name}`] = report;
      await page.close();
    }
    await context.close();
  }
  });
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(summary, null, 1));

  let clean = true;
  for (const [k, r] of Object.entries(summary)) {
    const counts = ["tiny", "target", "dash", "contrast", "outline", "image", "console"]
      .map((key) => [key, (r[key] || []).length])
      .filter(([, n]) => n > 0);
    const bad = counts.length > 0 || r.overflow;
    if (bad) clean = false;
    console.log(`${k.padEnd(24)} ${bad ? "" : "clean"}${r.overflow ? " overflow " + JSON.stringify(r.overflow) : ""} ${counts.map(([a, n]) => a + ":" + n).join(" ")}`);
  }
  console.log(`\nshots and report.json in ${path.relative(process.cwd(), out)}${clean ? "" : "  (details per item in report.json)"}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
