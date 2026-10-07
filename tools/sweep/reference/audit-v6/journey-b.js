async (page) => {
  // The foreign visitor's second half, in English: the sign-in page, the Google button (its round trip leaves the
  // allowed origins, so only the first hop is recorded), "Try the admin", the overview, the orders, order A.
  const ORIGIN = "http://127.0.0.1:3200";
  const OUT = ".playwright-cli/audit-v6/shots/journey";
  const CODE_A = "DH-2432";
  const ctx = page.context();
  const cdp = await ctx.newCDPSession(page);
  const out = { steps: [], requests: [], consoleErrors: [] };
  page.on("console", (m) => { if (m.type() === "error") out.consoleErrors.push({ url: page.url().replace(ORIGIN, ""), text: m.text().slice(0, 200) }); });
  const onReq = (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith("data:")) out.requests.push(u.slice(0, 90)); };
  ctx.on("request", onReq);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const shot = async (name, full = false) => {
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
    out.steps.push({ name, url: page.url().replace(ORIGIN, ""), title: await page.title() });
  };
  await ctx.clearCookies();
  await ctx.setExtraHTTPHeaders({ "x-forwarded-for": "10.123.0.1" });
  await ctx.addCookies([{ name: "hive-lang", value: "en", url: ORIGIN }]);
  await cdp.send("Emulation.setScrollbarsHidden", { hidden: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ORIGIN + "/sign-in", { waitUntil: "load" });
  await shot("m1-sign-in-en-390", true);
  // Google: the action answers with a redirect to Supabase Auth, which this browser may not open.
  const google = page.waitForRequest((r) => r.url().includes("/auth/v1/authorize"), { timeout: 15000 }).then((r) => r.url().replace(/client_id=[^&]+/, "client_id=…").slice(0, 160)).catch(() => null);
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  out.googleHop = await google;
  await page.waitForTimeout(1500);
  out.afterGoogle = page.url().slice(0, 120);
  await shot("m2-after-google-en-390");
  // The back office, at a desktop width.
  await cdp.send("Emulation.setScrollbarsHidden", { hidden: false });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ORIGIN + "/sign-in", { waitUntil: "load" });
  await page.getByRole("button", { name: "Try the admin" }).click();
  await page.waitForURL("**/admin", { timeout: 20000 });
  await shot("m3-admin-overview-en-1280");
  await page.getByRole("link", { name: /^Orders/ }).first().click();
  await page.waitForURL("**/admin/orders**", { timeout: 20000 });
  await shot("m4-admin-orders-en-1280");
  const tab = page.getByRole("tab", { name: /Awaiting payment/ });
  if (await tab.count()) {
    await tab.first().click();
    await page.waitForTimeout(1200);
    await shot("m5-admin-orders-awaiting-en-1280");
  }
  await page.goto(ORIGIN + "/admin/orders/" + CODE_A, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  await shot("m6-admin-order-a-en-1280", true);
  out.orderPage = await page.evaluate(() => ({
    h1: document.querySelector("h1")?.textContent?.trim(),
    buttons: [...document.querySelectorAll("main button")].map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim()).filter(Boolean).slice(0, 12),
    text: document.querySelector("main")?.innerText.replace(/\s+/g, " ").slice(0, 900),
  }));
  ctx.off("request", onReq);
  await ctx.setExtraHTTPHeaders({});
  await cdp.detach();
  return JSON.stringify(out);
}
