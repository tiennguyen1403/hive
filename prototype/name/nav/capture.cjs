// The proposal, put into the running storefront (next start, :3200) at capture
// time: proposal.css plus three DOM moves. Nothing in the app changes.
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = createRequire("D:/Code/e-commerce/package.json")("@playwright/test");
const HERE = __dirname;
const OUT = "D:/Code/e-commerce/prototype/name/nav";
fs.mkdirSync(OUT, { recursive: true });
const CSS = fs.readFileSync(path.join(HERE, "proposal.css"), "utf8");
const LOCKUP = fs.readFileSync("D:/Code/e-commerce/prototype/name/logo/hive-lockup.svg", "utf8").replace(/<title>.*?<\/title>\n?/, "");

async function dress(page, { cloth = false, state = "open", no = "05" } = {}) {
  await page.addStyleTag({ content: CSS });
  await page.evaluate(({ LOCKUP, cloth, state, no }) => {
    const nav = document.querySelector(".nav3 .in");
    nav.querySelector(".wm").innerHTML = LOCKUP;
    const tag = nav.querySelector(".itag");
    const links = nav.querySelector(".links");
    const issueLink = links.querySelector("a"); // the "Số 05" link the plate replaces
    if (issueLink && issueLink.classList.contains("on")) {
      tag.classList.add("on");
      tag.setAttribute("aria-current", "page");
    }
    if (issueLink) issueLink.remove();
    nav.insertBefore(tag, links); // logo · plate · families · icons
    tag.classList.toggle("cloth", cloth);
    tag.classList.remove("soon", "shut");
    if (state !== "open") tag.classList.add(state);
    const text = [...tag.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (text) text.textContent = "Số " + no;
  }, { LOCKUP, cloth, state, no });
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
  const mid = vis ? (r(tag).left + r(links).right) / 2 : null;
  return {
    logoW: +r(wm).width.toFixed(1), plateW: +r(tag).width.toFixed(1), plateH: +r(tag).height.toFixed(1),
    overflow: bar.scrollWidth - bar.clientWidth,
    roomLeft: vis ? +(r(tag).left - r(wm).right).toFixed(1) : +(r(tag).left - r(wm).right).toFixed(1),
    roomRight: +(r(icons).left - (vis ? r(links).right : r(tag).right)).toFixed(1),
    middleOffCentre: vis ? +(mid - (r(bar).left + r(bar).right) / 2).toFixed(1) : null,
  };
});

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const facts = {};
  const open = async (w, h, mobile, url) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto("http://127.0.0.1:3200" + url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    return { ctx, page, errs };
  };
  const bar = async (page, w, file) => {
    const h = Math.ceil((await page.locator(".nav3").boundingBox()).height);
    await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: w, height: h } });
  };

  // Home, first viewport and bar, both colourways, five widths.
  for (const [w, h, mobile] of [[1280, 800, false], [390, 844, true], [360, 780, true], [900, 700, false], [1440, 860, false]]) {
    for (const cloth of [false, true]) {
      const k = w + "-" + (cloth ? "b" : "a");
      const { ctx, page, errs } = await open(w, h, mobile, "/");
      await dress(page, { cloth });
      facts[k] = await measure(page);
      if (w === 1280 || w === 390) await page.screenshot({ path: path.join(OUT, "home-" + k + ".jpg"), type: "jpeg", quality: 90 });
      await bar(page, w, "bar-" + k + ".png");
      if (errs.length) facts[k].errors = errs;
      await ctx.close();
    }
  }
  // The plate close up at 1280: open, soon, shut, whole issue (on), hover, keyboard focus.
  for (const cloth of [false, true]) {
    for (const st of ["open", "soon", "shut", "on", "hover", "focus"]) {
      const { ctx, page } = await open(1280, 400, false, st === "on" ? "/products" : "/");
      await dress(page, { cloth, state: st === "soon" || st === "shut" ? st : "open", no: st === "soon" ? "06" : "05" });
      const tag = page.locator(".nav3 .itag");
      if (st === "hover") await tag.hover();
      if (st === "focus") {
        await page.evaluate(() => document.documentElement.removeAttribute("data-pointer"));
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.evaluate(() => document.querySelector(".nav3 .itag").focus());
      }
      await page.waitForTimeout(250);
      const b = await tag.boundingBox();
      await page.screenshot({ path: path.join(OUT, "plate-" + (cloth ? "b" : "a") + "-" + st + ".png"), clip: { x: b.x - 26, y: 0, width: b.width + 52, height: 64 } });
      await ctx.close();
    }
  }
  // A family chosen: the families keep their honey underline.
  for (const cloth of [false, true]) {
    const { ctx, page } = await open(1280, 400, false, "/products?family=TEE");
    await dress(page, { cloth });
    await bar(page, 1280, "bar-family-" + (cloth ? "b" : "a") + ".png");
    await ctx.close();
  }
  fs.writeFileSync(path.join(HERE, "facts.json"), JSON.stringify(facts, null, 1));
  console.log(JSON.stringify(facts, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
