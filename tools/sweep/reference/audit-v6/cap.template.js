async (page) => {
  // Audit v6 capture: each state at each width, VI then EN back to back on the same data and clock.
  // Per (state, width, lang): a screenshot, the lines of every text block (keyed by a DOM path that ignores
  // the EN-only `span[lang]` wrappers), the Vietnamese left on an EN page, horizontal overflow, scroll boxes
  // that overflow (admin tables), the title. The config below is written in by gen.py.
  /*CONFIG*/
  const ORIGIN = "http://127.0.0.1:3200";
  const OUT = CONFIG.out;
  const ctx = page.context();
  let current = "";
  const consoleErrors = [];
  const foreign = [];
  const onConsole = (m) => {
    if (m.type() === "error") consoleErrors.push({ at: current, text: m.text().slice(0, 300) });
  };
  const onPageError = (e) => consoleErrors.push({ at: current, text: "pageerror: " + String(e).slice(0, 300) });
  const onRequest = (r) => {
    const u = r.url();
    if (!u.startsWith(ORIGIN) && !u.startsWith("data:") && !u.startsWith("blob:")) foreign.push({ at: current, url: u.slice(0, 160) });
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  ctx.on("request", onRequest);

  let ipSeq = 0;
  const freshIp = async () => {
    ipSeq += 1;
    await ctx.setExtraHTTPHeaders({ "x-forwarded-for": `10.${CONFIG.ipBase}.${Math.floor(ipSeq / 250)}.${ipSeq % 250}` });
  };
  await page.emulateMedia({ reducedMotion: "reduce" });
  // A phone has overlay scrollbars: below 600px the classic 15px bar of desktop Chrome on Windows would lay the page
  // out at 375 instead of 390. Hidden there (CDP), kept from 600 up as a desktop browser draws it.
  const cdp = await ctx.newCDPSession(page);
  const phoneBars = async (w) => cdp.send("Emulation.setScrollbarsHidden", { hidden: w < 600 }).catch(() => {});

  // Sessions, by the sign-in page's own demo buttons.
  const sessions = {};
  const authOnly = async () => (await ctx.cookies()).filter((c) => c.name !== "hive-lang" && c.name !== "inbox_read");
  const needed = new Set(CONFIG.states.map((s) => s.who || "shopper").filter((w) => w !== "guest"));
  for (const who of needed) {
    await freshIp();
    await ctx.clearCookies();
    await ctx.addCookies([{ name: "hive-lang", value: "vi", url: ORIGIN }]);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(ORIGIN + "/sign-in", { waitUntil: "load" });
    if (who === "shopper") {
      await page.getByRole("button", { name: "Đăng nhập thử" }).click();
      await page.waitForURL("**/account", { timeout: 20000 });
    } else if (who === "admin") {
      await page.getByRole("button", { name: "Vào quản trị thử" }).click();
      await page.waitForURL("**/admin", { timeout: 20000 });
    } else {
      // Another demo account, by the form, with the password the sign-in page itself prints.
      const password = ((await page.locator(".si-demo-lines p").nth(2).locator("b").textContent()) ?? "").trim();
      await page.locator(".si-form input[name=email]").fill(CONFIG.accounts[who]);
      await page.locator(".si-form input[name=password]").fill(password);
      await page.locator(".si-form button[type=submit]").first().click();
      await page.waitForURL("**/account", { timeout: 20000 });
    }
    sessions[who] = await authOnly();
  }
  // The device's own state: a fixed basket (as the sweep), nothing else.
  await page.goto(ORIGIN + "/sign-in", { waitUntil: "load" });
  await page.evaluate((cart) => {
    localStorage.clear();
    sessionStorage.clear();
    if (cart) localStorage.setItem("brand.cart", cart);
  }, CONFIG.cart ?? null);
  await ctx.setExtraHTTPHeaders({});

  const as = async (who, lang) => {
    await ctx.clearCookies();
    await ctx.addCookies([...(who === "guest" ? [] : sessions[who] ?? []), { name: "hive-lang", value: lang, url: ORIGIN }]);
  };
  const settle = async (ms = 500) => {
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(ms);
  };

  // ── measurements, inside the page ─────────────────────────────────────────
  const measure = () =>
    page.evaluate(() => {
      const isLangSpan = (e) => e.tagName === "SPAN" && e.hasAttribute("lang");
      const keyOf = (el) => {
        const parts = [];
        for (let e = el; e && e !== document.body; e = e.parentElement) {
          if (isLangSpan(e)) continue;
          const p = e.parentElement;
          let idx = 0;
          let n = 0;
          if (p) {
            for (const s of p.children) {
              if (isLangSpan(s)) continue;
              if (s.tagName === e.tagName) {
                n += 1;
                if (s === e) idx = n;
              }
            }
          }
          parts.push(e.tagName.toLowerCase() + (n > 1 ? `:${idx}` : ""));
        }
        return parts.reverse().join(">");
      };
      const hiddenUp = (el) => {
        for (let q = el; q; q = q.parentElement) {
          const cs = getComputedStyle(q);
          if (cs.display === "none" || cs.visibility === "hidden") return true;
          if (q.hasAttribute("hidden")) return true;
        }
        return false;
      };
      const INLINE = new Set(["inline", "contents"]);
      const textNodesOf = (el) => {
        const out = [];
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (!n.nodeValue.trim()) continue;
          const pe = n.parentElement;
          if (!pe || pe.closest("script,style,noscript,svg,.sr-only,[aria-hidden='true']")) continue;
          out.push(n);
        }
        return out;
      };
      // Leaf blocks: a non-inline box with text of its own, and no non-inline descendant that carries text.
      const blocks = [];
      const all = document.body.querySelectorAll("*");
      const hasTextBlockChild = new Set();
      const candidates = [];
      for (const el of all) {
        if (el.closest("script,style,noscript,svg,.sr-only,[aria-hidden='true'],template")) continue;
        const cs = getComputedStyle(el);
        if (INLINE.has(cs.display) || cs.display === "none") continue;
        const txt = el.textContent.replace(/\s+/g, " ").trim();
        if (!txt) continue;
        candidates.push(el);
      }
      const cset = new Set(candidates);
      for (const el of candidates) {
        for (let p = el.parentElement; p; p = p.parentElement) {
          if (cset.has(p)) hasTextBlockChild.add(p);
        }
      }
      for (const el of candidates) {
        if (hasTextBlockChild.has(el)) continue;
        if (hiddenUp(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const tops = [];
        for (const n of textNodesOf(el)) {
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const q of range.getClientRects()) if (q.width > 0.5 && q.height > 0) tops.push(q.top + q.height / 2);
        }
        if (!tops.length) continue;
        tops.sort((a, b) => a - b);
        let lines = 1;
        for (let i = 1; i < tops.length; i++) if (tops[i] - tops[i - 1] > 4) lines += 1;
        const cs = getComputedStyle(el);
        const cutX = el.scrollWidth > el.clientWidth + 1 && /hidden|clip/.test(cs.overflowX);
        const cutY = el.scrollHeight > el.clientHeight + 1 && /hidden|clip/.test(cs.overflowY);
        const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        blocks.push({
          k: keyOf(el),
          tag: el.tagName.toLowerCase() + cls,
          lines,
          w: Math.round(r.width),
          x: Math.round(r.left),
          y: Math.round(r.top + scrollY),
          t: el.textContent.replace(/\s+/g, " ").trim().slice(0, 90),
          cut: cutX || cutY ? (cutX ? "x" : "") + (cutY ? "y" : "") : undefined,
        });
      }
      // Scroll boxes that overflow (an admin table wider than its card), at the real viewport.
      const scrollers = [];
      for (const el of all) {
        const cs = getComputedStyle(el);
        if (!/auto|scroll/.test(cs.overflowX)) continue;
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 200) {
          const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "";
          scrollers.push({ el: el.tagName.toLowerCase() + (cls ? "." + cls : ""), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
        }
      }
      return {
        blocks,
        scrollers,
        overflow: document.documentElement.scrollWidth > innerWidth + 1 ? document.documentElement.scrollWidth : 0,
        title: document.title,
        lang: document.documentElement.lang,
        height: document.documentElement.scrollHeight,
      };
    });

  const scan = () =>
    page.evaluate(() => {
      const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
      const LOAN = /\b(VD|Form)\b|\boversize\b/;
      const hidden = (el) => {
        for (let q = el; q; q = q.parentElement) {
          if (q.hidden || q.tagName === "TEMPLATE") return true;
          if (getComputedStyle(q).display === "none") return true;
        }
        return false;
      };
      const langOf = (el) => el.closest("[lang]")?.getAttribute("lang") ?? "";
      const text = [];
      const attrs = [];
      const loan = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const el = n.parentElement;
        if (!el || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
        const x = n.textContent.replace(/\s+/g, " ").trim();
        if (!x) continue;
        if (hidden(el)) continue;
        if (langOf(el) === "vi") continue;
        const where = typeof el.className === "string" && el.className ? el.className.split(" ")[0] : el.tagName.toLowerCase();
        if (VI.test(x)) text.push({ text: x.slice(0, 140), where });
        if (LOAN.test(x)) loan.push({ text: x.slice(0, 140), where });
      }
      for (const el of document.body.querySelectorAll("[alt],[aria-label],[placeholder],[title]")) {
        if (hidden(el)) continue;
        for (const a of ["alt", "aria-label", "placeholder", "title"]) {
          const v = el.getAttribute(a);
          if (v && VI.test(v)) attrs.push({ attr: a, value: v.slice(0, 140), langVi: langOf(el) === "vi" });
        }
      }
      for (const el of document.body.querySelectorAll("input:not([type=hidden]):not([type=radio]):not([type=checkbox]),textarea")) {
        if (hidden(el)) continue;
        const v = el.value;
        if (v && VI.test(v)) attrs.push({ attr: "value", value: v.slice(0, 140), langVi: langOf(el) === "vi" });
      }
      return { text, attrs, loan };
    });

  // ── named actions for overlay states ──────────────────────────────────────
  const ACTS = {
    /*ACTS*/
  };

  const results = [];
  const states = CONFIG.states;
  for (const st of states) {
    const widths = st.widths ?? CONFIG.widths;
    for (const [w, h] of widths) {
      for (const lang of st.langs ?? CONFIG.langs) {
        const name = `${st.name}-${w}`;
        current = `${lang} ${name}`;
        const entry = { state: st.name, route: st.route, width: w, lang };
        try {
          await as(st.who || "shopper", lang);
          if (st.extraCookies) await ctx.addCookies(st.extraCookies);
          if (st.spoof) await freshIp();
          await page.setViewportSize({ width: w, height: h });
          await phoneBars(w);
          await page.goto("about:blank");
          let resp = await page.goto(ORIGIN + st.route, { waitUntil: "load" });
          if (st.cart !== undefined) {
            // This state's own basket, on the device, then the page again.
            await page.evaluate((c) => {
              if (c === null) localStorage.removeItem("brand.cart");
              else localStorage.setItem("brand.cart", JSON.stringify({ v: 1, lines: c }));
              localStorage.removeItem("brand.promo");
            }, st.cart);
            resp = await page.reload({ waitUntil: "load" });
          }
          entry.status = resp ? resp.status() : null;
          entry.landedOn = page.url().replace(ORIGIN, "");
          if (st.wait) await page.locator(st.wait).first().waitFor({ timeout: 15000 });
          await settle(st.settle ?? 500);
          if (st.act) {
            const T = (vi, en) => (lang === "en" ? en : vi);
            await ACTS[st.act]({ page, T, lang, w });
            await page.waitForTimeout(st.after ?? 500);
          }
          if (st.scrollTo) {
            await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), st.scrollTo);
            await page.waitForTimeout(400);
          }
          const m = await measure();
          Object.assign(entry, { title: m.title, htmlLang: m.lang, overflow: m.overflow, scrollers: m.scrollers, height: m.height });
          if (CONFIG.blocks !== false) entry.blocks = m.blocks;
          if (lang === "en") entry.scan = await scan();
          if (CONFIG.shots !== false) {
            await page.mouse.move(0, 0);
            if (st.overlay) {
              await page.screenshot({ path: `${OUT}/${lang}/${name}.png` });
            } else {
              // A viewport as tall as the page (E3a's way): every lazy image is in view and loads, the fixed bars sit
              // at the bottom instead of over the content. Measured above at the real viewport.
              let ph = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), 14000);
              await page.setViewportSize({ width: w, height: Math.max(ph, h) });
              await page.waitForTimeout(300);
              const ph2 = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), 14000);
              if (ph2 > ph) await page.setViewportSize({ width: w, height: ph2 });
              await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 10000 }).catch(() => {});
              await page.waitForTimeout(400);
              await page.screenshot({ path: `${OUT}/${lang}/${name}.png` });
              await page.setViewportSize({ width: w, height: h });
            }
          }
        } catch (e) {
          entry.error = String(e).slice(0, 300);
        }
        await page.keyboard.press("Escape").catch(() => {});
        results.push(entry);
      }
    }
  }
  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  ctx.off("request", onRequest);
  await ctx.setExtraHTTPHeaders({});
  await cdp.send("Emulation.setScrollbarsHidden", { hidden: false }).catch(() => {});
  await cdp.detach().catch(() => {});
  await page.setViewportSize({ width: 390, height: 844 });
  return JSON.stringify({ label: CONFIG.label, results, consoleErrors, foreign });
}
