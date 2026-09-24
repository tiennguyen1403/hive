// The proposal (colourway B, icons 20 px), put into the running storefront
// (next start, :3200) at capture time: proposal.css plus three DOM moves.
// Nothing in the app changes. Four logo sizes are shot side by side; the rest
// of the board uses SIZE (the size option under review).
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = createRequire("D:/Code/e-commerce/package.json")("@playwright/test");
const HERE = __dirname;
const OUT = HERE;
const CSS = fs.readFileSync(path.join(HERE, "proposal.css"), "utf8");
const LOCKUP = fs.readFileSync(path.join(HERE, "../logo/hive-lockup.svg"), "utf8").replace(/<title>.*?<\/title>\n?/, "");

// Logo size options: desktop / phone height of the lockup, and a scale on the
// wordmark alone (1 = the logo's own proportions: letters 0.52 of the mark).
const SIZES = {
  s32: { d: 32, m: 30, k: 1 }, // as first shown
  s36: { d: 36, m: 32, k: 1 },
  s40: { d: 40, m: 32, k: 1 }, // the phone stops at 32: at 360 px a 34 px logo already eats the bar's right padding
  w20: { d: 32, m: 30, k: 20 / (0.52 * 32) }, // letters 20 px on a 32 px mark
};
const SIZE = process.env.SIZE || "s40";

function lockup(k) {
  if (k === 1) return LOCKUP;
  const right = 740 + (1675.99 - 740) * k;
  return LOCKUP.replace(/viewBox="[^"]+"/, `viewBox="-500 -500 ${(right + 500).toFixed(2)} 1000"`)
    .replace(/(<path fill="#171410" d="M840[^"]+"\/>)/, `<g transform="translate(740 0) scale(${k.toFixed(4)}) translate(-740 0)">$1</g>`);
}

async function dress(page, { size = SIZE, state = "open", no = "05", icons20 = true } = {}) {
  const z = SIZES[size];
  let css = CSS + `\nhtml .s .nav3{--lk:${z.m}px}\n@media (min-width:900px){html .s .nav3{--lk:${z.d}px}}\n`;
  if (!icons20) css += "html .s .nav3 .ib .ic{width:18px;height:18px;font-size:18px}\n";
  await page.addStyleTag({ content: css });
  await page.evaluate(({ svg, state, no }) => {
    const nav = document.querySelector(".nav3 .in");
    nav.querySelector(".wm").innerHTML = svg;
    const tag = nav.querySelector(".itag");
    const links = nav.querySelector(".links");
    const issueLink = links.querySelector("a"); // the "Số 05" link the plate replaces
    if (issueLink && issueLink.classList.contains("on")) {
      tag.classList.add("on");
      tag.setAttribute("aria-current", "page");
    }
    if (issueLink) issueLink.remove();
    nav.insertBefore(tag, links); // logo · plate · families · icons
    tag.classList.remove("soon", "shut");
    if (state !== "open") tag.classList.add(state);
    const text = [...tag.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (text) text.textContent = "Số " + no;
  }, { svg: lockup(z.k), state, no });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
}

const measure = (page) => page.evaluate(() => {
  const r = (el) => el.getBoundingClientRect();
  const bar = document.querySelector(".nav3 .in");
  const wm = document.querySelector(".nav3 .wm svg");
  const tag = document.querySelector(".nav3 .itag");
  const links = document.querySelector(".nav3 .links");
  const icons = document.querySelector(".nav3 .icons");
  const vis = getComputedStyle(links).display !== "none";
  return {
    logoW: +r(wm).width.toFixed(1), logoH: +r(wm).height.toFixed(1),
    overflow: bar.scrollWidth - bar.clientWidth,
    roomRight: +(r(icons).left - (vis ? r(links).right : r(tag).right) - (vis ? 0 : 10)).toFixed(1),
    bagRight: +r(document.querySelector('.nav3 .icons .ib:last-child')).right.toFixed(1),
  };
});

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const facts = {};
  const open = async (w, h, mobile, url, bag = false) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    if (bag) {
      await ctx.addInitScript(() => {
        localStorage.setItem("brand.wishlist", JSON.stringify({ v: 1, ids: ["khoi", "bui"] }));
        localStorage.setItem("brand.cart", JSON.stringify({ v: 1, lines: [{ productId: "khoi", color: "black", size: "M", qty: 2 }] }));
      });
    }
    const page = await ctx.newPage();
    await page.goto("http://127.0.0.1:3200" + url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    return { ctx, page };
  };
  const bar = async (page, w, file) => {
    const h = Math.ceil((await page.locator(".nav3").boundingBox()).height);
    await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: w, height: h } });
  };
  const only = process.env.ONLY || "all";

  if (only === "all" || only === "sizes") {
    for (const size of Object.keys(SIZES)) {
      for (const [w, h, mobile] of [[1280, 400, false], [390, 400, true], [360, 400, true]]) {
        const { ctx, page } = await open(w, h, mobile, "/");
        await dress(page, { size });
        facts[size + "-" + w] = await measure(page);
        await bar(page, w, "size-" + size + "-" + w + ".png");
        await ctx.close();
      }
    }
    // Icons, 18 against 20, with something saved and something in the bag.
    for (const icons20 of [false, true]) {
      const { ctx, page } = await open(1280, 400, false, "/", true);
      await dress(page, { size: "s32", icons20 });
      const b = await page.locator(".nav3 .icons").boundingBox();
      await page.screenshot({ path: path.join(OUT, "icons-" + (icons20 ? 20 : 18) + ".png"), clip: { x: b.x - 16, y: 0, width: b.width + 32, height: 64 } });
      await ctx.close();
    }
  }

  if (only === "all" || only === "board") {
    // The reference set, at SIZE.
    for (const [w, h, mobile] of [[1280, 800, false], [390, 844, true], [360, 780, true], [900, 700, false], [1440, 860, false]]) {
      const { ctx, page } = await open(w, h, mobile, "/", true);
      await dress(page);
      facts[w] = await measure(page);
      if (w === 1280 || w === 390) await page.screenshot({ path: path.join(OUT, "home-" + w + ".jpg"), type: "jpeg", quality: 90 });
      await bar(page, w, "bar-" + w + ".png");
      await ctx.close();
    }
    for (const st of ["open", "soon", "shut", "on", "hover", "focus"]) {
      const { ctx, page } = await open(1280, 400, false, st === "on" ? "/products" : "/");
      await dress(page, { state: st === "soon" || st === "shut" ? st : "open", no: st === "soon" ? "06" : "05" });
      const tag = page.locator(".nav3 .itag");
      if (st === "hover") await tag.hover();
      if (st === "focus") {
        await page.evaluate(() => document.documentElement.removeAttribute("data-pointer"));
        await page.evaluate(() => document.querySelector(".nav3 .itag").focus());
      }
      await page.waitForTimeout(250);
      const b = await tag.boundingBox();
      await page.screenshot({ path: path.join(OUT, "plate-" + st + ".png"), clip: { x: b.x - 20, y: 0, width: b.width + 40, height: 64 } });
      await ctx.close();
    }
    {
      const { ctx, page } = await open(1280, 400, false, "/products?family=TEE");
      await dress(page);
      const t = await page.locator(".nav3 .itag").boundingBox();
      const l = await page.locator(".nav3 .links").boundingBox();
      await page.screenshot({ path: path.join(OUT, "bar-family-mid.png"), clip: { x: t.x - 20, y: 0, width: l.x + l.width - t.x + 40, height: 65 } });
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(HERE, "facts-" + only + ".json"), JSON.stringify(facts, null, 1));
  console.log(JSON.stringify(facts));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
