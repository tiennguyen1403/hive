async (page) => {
  // Audit v6, DB phase 1. Writes two card orders through the UI, as the brief asks (§2 "đơn thẻ …"):
  //  A: a foreign guest in English, from `?lang=en` to "Place order" (the brief's journey, steps 1-2), shot at each step;
  //  B: the demo shopper, then cancelled on its own order page ("Huỷ đơn").
  // The browser may not follow the redirect to Stripe (loopback only): the order exists, waiting, all the same.
  const ORIGIN = "http://127.0.0.1:3200";
  const OUT = ".playwright-cli/audit-v6/shots/journey";
  const ctx = page.context();
  const cdp = await ctx.newCDPSession(page);
  const out = { steps: [], consoleErrors: [], foreignBlocked: [] };
  page.on("console", (m) => { if (m.type() === "error") out.consoleErrors.push({ url: page.url().replace(ORIGIN, ""), text: m.text().slice(0, 200) }); });
  ctx.on("request", (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith("data:")) out.foreignBlocked.push(u.slice(0, 60)); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await cdp.send("Emulation.setScrollbarsHidden", { hidden: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const shot = async (name) => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    out.steps.push({ name, url: page.url().replace(ORIGIN, ""), lang: await page.evaluate(() => document.documentElement.lang) });
  };

  // ── A: the foreign guest ──
  await ctx.clearCookies();
  await ctx.setExtraHTTPHeaders({ "x-forwarded-for": "10.121.0.1" });
  await page.goto("about:blank");
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  const first = await page.goto(ORIGIN + "/?lang=en", { waitUntil: "load" });
  out.entry = { status: first ? first.status() : null, landed: page.url().replace(ORIGIN, ""), cookie: (await ctx.cookies()).find((c) => c.name === "hive-lang")?.value ?? null };
  await page.evaluate(() => localStorage.clear());
  await page.waitForTimeout(800);
  await shot("j1-home-en-390");
  // the story's own call to action, then the first style
  await page.locator("[data-ui='feed'] .story-go").first().click();
  await page.waitForTimeout(1500);
  await shot("j2-shop-en-390");
  await page.goto(ORIGIN + "/products/s05-khoi", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await shot("j3-pdp-en-390");
  await page.locator("[data-ui='feed'] .buybar .btn:visible").first().click();
  const sheet = page.locator("dialog[open]").last();
  await sheet.waitFor();
  await sheet.locator(".size input:not(:disabled)").first().check({ force: true });
  await page.waitForTimeout(300);
  await shot("j4-size-sheet-en-390");
  await sheet.locator(".sh-cta").click();
  await page.locator("dialog[open] #added-title").waitFor({ timeout: 10000 });
  await shot("j5-added-en-390");
  await page.goto(ORIGIN + "/cart", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await shot("j6-bag-en-390");
  await page.goto(ORIGIN + "/checkout", { waitUntil: "load" });
  await page.locator("#co-form").waitFor();
  await page.locator("#f-name").fill("Alex Carter");
  await page.locator("#f-phone").fill("0900000001");
  await page.locator("#f-province").click();
  let pick = page.locator("dialog[open]").last();
  await pick.locator(".pick-opt").first().waitFor();
  await pick.locator(".pick-search input").fill("Hồ Chí Minh");
  await pick.locator(".pick-opt", { hasText: "Hồ Chí Minh" }).first().click();
  await page.waitForTimeout(600);
  await page.locator("#f-ward").click();
  pick = page.locator("dialog[open]").last();
  await pick.locator(".pick-opt").first().waitFor();
  await pick.locator(".pick-opt").first().click();
  await page.waitForTimeout(600);
  await page.locator("#f-street").fill("12 Nguyễn Huệ");
  await page.locator("input[name=payment][value=CARD]").check({ force: true });
  await page.waitForTimeout(500);
  await shot("j7-checkout-card-en-390");
  const toStripe = page.waitForRequest((r) => r.url().startsWith("https://checkout.stripe.com/"), { timeout: 30000 });
  await page.locator("#co-form button[type=submit]:visible").first().click();
  out.stripeRequested = await toStripe.then(() => true).catch(() => false);
  await page.waitForTimeout(2500);
  out.afterPlace = page.url().replace(ORIGIN, "");
  await shot("j8-after-place-en-390");
  const guest = (await ctx.cookies()).find((c) => c.name === "guest_orders");
  out.guestCookie = guest ? { name: guest.name, value: guest.value, url: ORIGIN, httpOnly: true } : null;
  out.codeA = guest ? guest.value.split("~")[0].split(":")[0] : null;
  if (out.codeA) {
    await page.goto(ORIGIN + "/order-confirmed/" + out.codeA, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    await shot("j9-invoice-pending-en-390");
  }

  // ── B: the demo shopper, card, then cancelled on the order page ──
  await ctx.clearCookies();
  await ctx.setExtraHTTPHeaders({ "x-forwarded-for": "10.121.0.2" });
  await ctx.addCookies([{ name: "hive-lang", value: "vi", url: ORIGIN }]);
  await page.goto(ORIGIN + "/sign-in");
  await page.getByRole("button", { name: "Đăng nhập thử" }).click();
  await page.waitForURL("**/account", { timeout: 20000 });
  await page.evaluate(() => localStorage.setItem("brand.cart", JSON.stringify({ v: 1, lines: [{ productId: "p-khoi", size: "L", color: "black", qty: 1 }] })));
  await page.goto(ORIGIN + "/checkout", { waitUntil: "load" });
  await page.locator("input[name=payment][value=CARD]").waitFor({ state: "attached", timeout: 20000 });
  await page.locator("input[name=payment][value=CARD]").check({ force: true });
  const toStripe2 = page.waitForRequest((r) => r.url().startsWith("https://checkout.stripe.com/"), { timeout: 30000 });
  await page.locator("#co-form button[type=submit]:visible").first().click();
  out.stripeRequested2 = await toStripe2.then(() => true).catch(() => false);
  await page.waitForTimeout(2500);
  await page.goto(ORIGIN + "/account/orders", { waitUntil: "load" });
  out.codeB = (await page.locator(".ticket-code").first().innerText()).trim();
  out.shopperCookies = (await ctx.cookies()).filter((c) => c.name !== "hive-lang" && c.name !== "inbox_read");
  // B waiting, on its own page, before the cancel
  await page.goto(ORIGIN + "/account/orders/" + out.codeB, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  await shot("k1-order-card-pending-vi-390");
  await page.locator(".od-cancel").first().click();
  await page.locator("dialog[open] .cancel-line").waitFor();
  await shot("k2-cancel-sheet-vi-390");
  const done = page.waitForResponse((r) => r.request().method() === "POST" && r.url().startsWith(ORIGIN), { timeout: 20000 });
  await page.locator("dialog[open] button.btn-line").last().click();
  await done.catch(() => {});
  await page.waitForTimeout(2500);
  await shot("k3-order-card-cancelled-vi-390");
  await ctx.setExtraHTTPHeaders({});
  await cdp.send("Emulation.setScrollbarsHidden", { hidden: false });
  await cdp.detach();
  return JSON.stringify(out);
}
