/*
 * Opens the interactive states of one direction and photographs them, for the main session's review.
 *
 *   node prototype/explore/tools/review.cjs <direction> [--port 3100] [--width 390]
 *
 * Best effort across five different interfaces: controls are found by role and Vietnamese accessible name, and a step
 * that finds nothing is reported as "not found" rather than failing the run. Viewport-only PNGs go to
 * _shots/<dir>/review/, with a log of every step. Motion is left on (the point is to see the states as a shopper does).
 */
const fs = require("fs");
const path = require("path");
const { withBrowser } = require("./browser.cjs");

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const opt = (n, f) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : f; };
const port = Number(opt("port", "3100"));
const width = Number(opt("width", "390"));
const out = path.resolve(__dirname, "../_shots", dir, "review");
fs.mkdirSync(out, { recursive: true });
const log = [];

async function first(page, candidates) {
  for (const c of candidates) {
    const loc = typeof c === "function" ? c(page) : page.getByRole(c.role, { name: c.name });
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < n; i++) {
      const el = loc.nth(i);
      if (await el.isVisible().catch(() => false) && await el.isEnabled().catch(() => false)) return el;
    }
  }
  return null;
}

async function step(page, name, candidates, after = 500) {
  const el = await first(page, candidates);
  if (!el) { log.push(`${name}: not found`); return false; }
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.click({ timeout: 2500 }).catch(async () => {
    // Visually hidden inputs behind styled labels: click them the way a label tap does.
    await el.evaluate((e) => e.click()).catch((e) => log.push(`${name}: click failed ${e.message.split("\n")[0]}`));
  });
  await page.waitForTimeout(after);
  const file = `${String(log.length).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: path.join(out, file) });
  log.push(`${name}: ok -> ${file}`);
  return true;
}

(async () => {
  await withBrowser(async (browser) => {
    const context = await browser.newContext({
      viewport: { width, height: width < 600 ? 844 : 800 }, deviceScaleFactor: width < 600 ? 2 : 1,
      isMobile: width < 600, hasTouch: width < 600, locale: "vi-VN",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const go = async (p) => {
      await page.goto(`http://127.0.0.1:${port}/explore/${dir}/${p}${p.includes("?") ? "&" : "?"}x=${Date.now()}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
    };

    // Home: first screen, the menu, a quick add if the direction has one.
    await go("home.html");
    await page.screenshot({ path: path.join(out, "00-home-first-screen.png") });
    const t0 = await page.evaluate(() => document.body.innerText.match(/\d{2}(?::\d{2}){2,3}/)?.[0] || "");
    await page.waitForTimeout(2100);
    const t1 = await page.evaluate(() => document.body.innerText.match(/\d{2}(?::\d{2}){2,3}/)?.[0] || "");
    log.push(`countdown ticks: ${t0 && t1 && t0 !== t1 ? "yes" : "NO"} (${t0} -> ${t1})`);
    await step(page, "home-menu", [
      { role: "button", name: /^(menu|danh mục)$/i }, { role: "button", name: /menu|danh mục|mở menu/i },
    ]);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await step(page, "home-quick-add", [
      { role: "button", name: /\+\s*giỏ|chọn size|thêm vào (giỏ|túi)/i },
    ], 700);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);

    // Listing: a type filter and the sort control.
    await go("products.html");
    await step(page, "products-filter-hoodie", [
      { role: "button", name: /^hoodie/i }, { role: "tab", name: /^hoodie/i }, { role: "radio", name: /^hoodie/i },
      { role: "checkbox", name: /hoodie/i }, { role: "link", name: /^hoodie/i },
    ]);
    await step(page, "products-sort", [
      { role: "button", name: /sắp xếp|mới nhất|giá/i }, { role: "combobox", name: /sắp xếp|thứ tự|sort|xếp theo|^xếp$/i },
    ]);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);

    // Product: colour, size, add, size guide; then the sold-out style.
    await go("product.html?m=suong");
    await page.screenshot({ path: path.join(out, "10-product-first-screen.png") });
    await step(page, "product-colour-moss", [
      { role: "button", name: /rêu|mos/i }, { role: "radio", name: /rêu|mos/i }, { role: "option", name: /rêu/i },
    ]);
    await step(page, "product-size-L", [
      { role: "button", name: /(^|[\s,])L($|[\s,.:])/ }, { role: "radio", name: /(^|[\s,])L($|[\s,.:])/ },
    ]);
    await step(page, "product-add", [
      { role: "button", name: /thêm vào (giỏ|túi)/i },
    ], 900);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await step(page, "product-size-guide", [
      { role: "button", name: /bảng (số đo|size)|số đo/i }, { role: "link", name: /bảng (số đo|size)|số đo/i },
    ], 700);
    await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await go("product.html?m=muoi");
    await page.screenshot({ path: path.join(out, "20-product-muoi.png") });
    const buyable = await page.getByRole("button", { name: /thêm vào (giỏ|túi)/i }).evaluateAll(
      (els) => els.filter((e) => !e.disabled && e.getAttribute("aria-disabled") !== "true" && e.offsetParent).length).catch(() => 0);
    log.push(`muoi buy buttons enabled: ${buyable}`);
    const cart = await page.evaluate((d) => { try { return localStorage.getItem("hive-explore-cart-" + d); } catch (e) { return "?"; } }, dir);
    log.push(`cart storage: ${cart}`);
    log.push(`errors: ${errors.length ? errors.join(" | ") : "none"}`);
    await context.close();
  });
  fs.writeFileSync(path.join(out, "log.txt"), log.join("\n"));
  console.log(log.join("\n"));
})().catch((e) => { console.error(e); process.exit(1); });
