/*
 * Full-page stills that match what a shopper sees, shared by the board generators.
 *
 * Chrome's full-page capture has four traps this works around (all met on 26/09/2026):
 *   - lazy images painted blank: every image is made eager and decoded first;
 *   - a bar fixed to the bottom of the screen painted across the middle: it is parked at the end of the document,
 *     at the same distance from the bottom edge (a buy bar stacked above a tab bar stays above it);
 *   - a decorative backdrop fixed to the screen covering only the first screen: it is stretched over the document
 *     (hidden overlays are left alone: a hidden sheet stretched and translated doubled a page once);
 *   - no more than 16,384 device pixels per image: the density drops for very long pages.
 */
const path = require("path");

async function prepare(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.8) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight, h = document.documentElement.scrollHeight;
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      const decorative = el.getAttribute("aria-hidden") === "true" || cs.pointerEvents === "none";
      if (decorative && r.width >= vw * 0.9 && r.height >= vh * 0.9) {
        el.style.setProperty("position", "absolute", "important");
        el.style.setProperty("top", "0", "important");
        el.style.setProperty("bottom", "auto", "important");
        el.style.setProperty("height", h + "px", "important");
        continue;
      }
      // A bar anchored to the bottom of the screen (a buy bar, or one stacked above a tab bar) keeps its distance
      // from the bottom edge, measured on the first screen, but at the end of the document.
      if (r.height > 0 && r.height <= vh * 0.4 && r.top >= vh / 2 && r.bottom <= vh + 2) {
        const want = h - (vh - r.top);
        el.style.setProperty("position", "absolute", "important");
        el.style.setProperty("top", want + "px", "important");
        el.style.setProperty("bottom", "auto", "important");
        const got = el.getBoundingClientRect().top + window.scrollY;
        if (Math.abs(got - want) > 1) el.style.setProperty("top", (2 * want - got) + "px", "important");
      }
    }
  });
  await page.evaluate(async () => {
    for (const i of document.images) i.loading = "eager";
    await Promise.all([...document.images].map((i) => (i.complete ? Promise.resolve() : new Promise((r) => {
      i.addEventListener("load", r, { once: true });
      i.addEventListener("error", r, { once: true });
      setTimeout(r, 8000);
    }))));
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(700);
}

// Captures http://127.0.0.1:<port>/explore/<dir>/<spec> ("cart?cart=full") as a JPEG at <file>.
async function still(browser, { port = 3100, dir, spec, width, file }) {
  const mobile = width < 600;
  let scale = mobile ? 2 : 1;
  const [name, query] = spec.split("?");
  for (let attempt = 0; attempt < 2; attempt++) {
    const context = await browser.newContext({
      viewport: { width, height: mobile ? 844 : 800 }, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile,
      locale: "vi-VN", reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/explore/${dir}/${name}.html?${query ? query + "&" : ""}x=${Date.now()}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    if (height * scale > 16000 && attempt === 0) {
      scale = Math.max(1, Math.floor((16000 / height) * 100) / 100);
      await context.close();
      continue;
    }
    await prepare(page);
    await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 82 });
    await context.close();
    return;
  }
}

const slug = (spec) => spec.replace(/[?&=]+/g, "_").replace(/_+$/, "");

module.exports = { prepare, still, slug, path };
