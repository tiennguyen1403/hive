/**
 * SLICE B3a COPY of tools/backend-shots.js: OUT is …/b3a/after, the two
 * admin shots are taken as the demo manager ("Vào quản trị thử") because a
 * shopper gets 404 at /admin since B3a, and the two shop overlays are taken
 * first, while the shopper is still signed in.
 *
 * Backend slice acceptance shots (first used for B0a/B0b) — the same sixteen states B0a captured, so the
 * two sets can be laid side by side. Same seeds, same routes, same widths,
 * same full-page/viewport choice per shot.
 */
async (page) => {
  const ORIGIN = "http://127.0.0.1:3200";
  const OUT = ".playwright-cli/shots/backend/b3a/after";

  // Slice B1: the session is an auth cookie, not a `brand.session` key, so it
  // is opened by pressing the sign-in screen's own "Đăng nhập thử".
  const SEED = {
    "brand.cart": JSON.stringify({
      v: 1,
      lines: [{ productId: "p-khoi", size: "M", color: "black", qty: 1 }],
    }),
  };

  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push({ url: page.url(), text: m.text() });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ORIGIN + "/");
  await page.evaluate((seed) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
    // Device storage left behind by an earlier session. `brand.promo` puts a
    // code banner on the cart that has nothing to do with this slice.
    localStorage.removeItem("brand.promo");
  }, SEED);
  await page.context().clearCookies();
  await page.goto(ORIGIN + "/sign-in");
  await page.getByRole("button", { name: "Đăng nhập thử" }).click();
  await page.waitForURL("**/account", { timeout: 20000 });

  // Lazy images only load once they have been near the viewport, so a full-page
  // shot taken without scrolling is a page of grey boxes.
  const settle = async () => {
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(700);
  };

  const shot = async (name, route, width, { fullPage = true, viaAbout = false } = {}) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    // A hash-only navigation from the same URL does not reload, so the overlay
    // shots come in from another page first — the way a shopper following a
    // shared link does.
    if (viaAbout) await page.goto(ORIGIN + "/about", { waitUntil: "load" });
    const response = await page.goto(ORIGIN + route, { waitUntil: "load" });
    await settle();
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
    return { name, route, width, status: response ? response.status() : null };
  };

  const results = [];
  for (const [name, route, width] of [
    ["home-390", "/", 390],
    ["products-390", "/products", 390],
    ["products-khoi-390", "/products/s05-khoi", 390],
    ["search-390", "/search?q=áo", 390],
    ["cart-390", "/cart", 390],
    ["account-390", "/account", 390],
    ["home-1280", "/", 1280],
    ["products-1280", "/products", 1280],
    ["products-khoi-1280", "/products/s05-khoi", 1280],
    ["search-1280", "/search?q=áo", 1280],
    ["cart-1280", "/cart", 1280],
    ["account-1280", "/account", 1280],
  ]) {
    results.push(await shot(name, route, width));
  }

  // The two layered states, viewport-sized because the sheet covers the screen.
  results.push(
    await shot("products-390-filter", "/products#filter", 390, {
      fullPage: false,
      viaAbout: true,
    }),
  );
  results.push(
    await shot("products-khoi-390-size", "/products/s05-khoi#size", 390, {
      fullPage: false,
      viaAbout: true,
    }),
  );

  // The back office, as the demo manager.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ORIGIN + "/sign-in");
  await page.getByRole("button", { name: "Vào quản trị thử" }).click();
  await page.waitForURL(ORIGIN + "/admin", { timeout: 20000 });
  results.push(await shot("admin-1280", "/admin", 1280));
  results.push(await shot("admin-products-1280", "/admin/products", 1280));

  return { shots: results.length, consoleErrors, results };
}
