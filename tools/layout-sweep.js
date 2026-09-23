/**
 * SLICE B3a COPY of tools/layout-sweep.js (which the agent may not edit):
 * the shop routes as the demo shopper, then the admin routes signed in as
 * the demo manager (a shopper gets 404 there since B3a), the admin overlays
 * this slice added, and every request that leaves 3200.
 *
 * Layout sweep — the separate visual pass QĐ-14 requires.
 *
 * Behavioural tests and "zero horizontal overflow" do not imply "the grid
 * looks like a grid". This walks every route at both widths, screenshots each
 * one, and runs six detectors that only a real viewport can answer.
 *
 * Run it through the CLI session so the browser stays visible:
 *
 *   npx playwright cli --raw run-code --filename=tools/layout-sweep.js \
 *     > .playwright-cli/sweep.json
 *
 * The file must hold exactly one function expression — `run-code` wraps it in
 * parentheses and evaluates it, so no import/require here.
 */
async (page) => {
  const ORIGIN = "http://127.0.0.1:3200";
  const SHOTS = ".playwright-cli/shots";
  const WIDTHS = [390, 1280];

  // `/hyd` is the hydration probe and `/system` is the internal design-system
  // spec; neither is a shopper-facing screen, so neither belongs in the sweep.
  const ROUTES = [
    "/",
    "/products",
    "/products/khoi",
    "/search?q=khoi",
    "/cart",
    "/checkout",
    "/order-confirmed",
    // slice 3 of v3: the public lookup page, with a fixture order so the result state renders
    "/track?code=DH-2425&phone=0908221447",
    "/so/4",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/account",
    "/account/profile",
    "/account/password",
    "/account/orders",
    "/account/notifications",
    "/account/orders/DH-2430",
    "/account/orders/DH-2310",
    "/account/orders/DH-2310/tracking",
    "/account/addresses",
    "/account/addresses/new",
    "/account/wishlist",
  ];

  // Account routes redirect when nobody is signed in, and checkout needs a
  // cart. Slice B1 made the session a real auth cookie, so it is opened by
  // pressing the sign-in screen's own "Đăng nhập thử" rather than by writing
  // a `brand.session` key that no longer exists.
  const SEED = {
    "brand.cart": JSON.stringify({
      v: 1,
      lines: [{ productId: "p-khoi", size: "M", color: "black", qty: 1 }],
    }),
  };

  // `run-code` evaluates this in a sandbox without the global URL class, so
  // the path comes out of the string rather than out of a parser.
  const pathOf = (href) => href.replace(ORIGIN, "").split("?")[0].split("#")[0] || "/";

  const consoleErrors = [];
  const onConsole = (m) => {
    if (m.type() === "error") consoleErrors.push({ url: page.url(), text: m.text() });
  };
  page.on("console", onConsole);
  const foreign = [];
  const onRequest = (r) => {
    if (!r.url().startsWith(ORIGIN)) foreign.push(r.url());
  };
  page.context().on("request", onRequest);

  await page.goto(ORIGIN + "/");
  await page.evaluate((seed) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  }, SEED);
  await page.context().clearCookies();
  await page.goto(ORIGIN + "/sign-in");
  await page.getByRole("button", { name: "Đăng nhập thử" }).click();
  await page.waitForURL("**/account", { timeout: 20000 });

  // Everything below runs inside the page: only a real viewport knows which
  // media query won, what the computed cursor is, and what is actually
  // reachable at a given point.
  const probe = (width) =>
    page.evaluate((viewportWidth) => {
      const out = {
        inlineBox: [],
        ratioSpread: [],
        loneButton: [],
        arrowCursor: [],
        clipped: [],
        smallTarget: [],
        tinyText: [],
        horizontalOverflow: null,
      };
      const MAX = 6; // per detector, per route — enough to act on, not a dump
      const label = (el) => {
        const id = el.id ? `#${el.id}` : "";
        const cls = typeof el.className === "string" && el.className
          ? `.${el.className.trim().split(/\s+/).join(".")}`
          : "";
        const text = (el.textContent || "").trim().slice(0, 24);
        return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ""}`;
      };
      const push = (bucket, entry) => {
        if (bucket.length < MAX) bucket.push(entry);
      };

      // 1. A CSS rule asks for a box only a block can keep, but the element it
      //    lands on is inline. `aspect-ratio` and percentage `width` are then
      //    dropped in silence — this is the bug that shipped mismatched cards.
      const blockOnly = [];
      for (const sheet of document.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin sheet, nothing to read
        }
        // Every CSSStyleRule carries a `cssRules` list since CSS nesting shipped (empty
        // when the rule nests nothing), so "has cssRules" no longer means "is a group".
        // Read the rule's own declarations first, then descend into whatever it nests.
        // The old order skipped every style rule and reported inlineBox:0 for months.
        const walk = (list) => {
          for (const rule of list) {
            if (rule.selectorText && rule.style) {
              const wants =
                (rule.style.aspectRatio && rule.style.aspectRatio !== "auto" && "aspect-ratio") ||
                (rule.style.width && rule.style.width.endsWith("%") && "width:%") ||
                (rule.style.height && rule.style.height !== "auto" && "height");
              if (wants) blockOnly.push({ selector: rule.selectorText, wants });
            }
            if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules);
          }
        };
        walk(rules);
      }
      for (const { selector, wants } of blockOnly) {
        let nodes;
        try {
          nodes = document.querySelectorAll(selector);
        } catch {
          continue; // selector the CSSOM accepts but querySelectorAll will not
        }
        for (const el of nodes) {
          const display = getComputedStyle(el).display;
          if (display === "inline" || display === "inline flow") {
            push(out.inlineBox, { el: label(el), selector, wants, display });
          }
        }
      }

      // 2. Images sitting in the same grid or flex row must share one ratio,
      //    or the row reads as ragged even though nothing overflows.
      //    Only grids and flex ROWS count as a row: the page frame `.s.v2` is
      //    a flex column, and grouping by it once compared the hero photo
      //    with every card on the page (three false positives, slice 0).
      //    Each image belongs to its nearest row only, so an inner grid's
      //    images never leak into the outer container's set.
      const groups = new Map();
      for (const img of document.images) {
        let p = img.parentElement;
        while (p && p !== document.body) {
          const cs = getComputedStyle(p);
          const isRow =
            (cs.display === "grid" || (cs.display === "flex" && cs.flexDirection.startsWith("row"))) &&
            p.children.length > 1;
          if (isRow) {
            if (!groups.has(p)) groups.set(p, []);
            groups.get(p).push(img);
            break;
          }
          p = p.parentElement;
        }
      }
      for (const [box, imgs] of groups) {
        const ratios = imgs
          .map((i) => i.getBoundingClientRect())
          .filter((r) => r.width > 8 && r.height > 8)
          .map((r) => r.width / r.height);
        if (ratios.length < 2) continue;
        const lo = Math.min(...ratios);
        const hi = Math.max(...ratios);
        if (hi / lo > 1.02) {
          push(out.ratioSpread, {
            container: label(box),
            count: ratios.length,
            spread: +(hi / lo).toFixed(3),
            ratios: ratios.map((r) => +r.toFixed(3)),
          });
        }
      }

      // 3. A button alone in its wrapper is meant to fill it. When it does not,
      //    an `<a class="btn">` beside a `<button class="btn">` go out of line.
      //    `div > .btn:only-child{ width:100% }` is a phone rule — on desktop a
      //    1200px-wide call to action would be the bug, so only check phones.
      if (viewportWidth <= 460) {
        for (const btn of document.querySelectorAll(".btn")) {
          const parent = btn.parentElement;
          if (!parent || parent.children.length !== 1) continue;
          const pw = parent.getBoundingClientRect().width;
          const bw = btn.getBoundingClientRect().width;
          const style = getComputedStyle(parent);
          const inner = pw - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          if (inner - bw > 1) {
            push(out.loneButton, { el: label(btn), buttonWidth: +bw.toFixed(1), wrapperWidth: +inner.toFixed(1) });
          }
        }
      }

      // 4. A control that keeps the arrow cursor does not read as pressable.
      //    Disabled controls are exempt — there the arrow is the honest answer.
      const CONTROLS = 'button, [role="button"], a[href], summary, .chip, .btn, .sz, .fct';
      for (const el of document.querySelectorAll(CONTROLS)) {
        if (el.disabled || el.getAttribute("aria-disabled") === "true") continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const cursor = getComputedStyle(el).cursor;
        if (cursor !== "pointer") push(out.arrowCursor, { el: label(el), cursor });
      }

      // 5. Clipped inside an `overflow:hidden` frame. getBoundingClientRect
      //    alone cannot see this — it returns the layout box and says nothing
      //    about an ancestor cutting it — so the rect check is confirmed by
      //    asking what is actually painted at the element's centre.
      for (const el of document.querySelectorAll(CONTROLS)) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        let p = el.parentElement;
        while (p && p !== document.documentElement) {
          const o = getComputedStyle(p);
          // Inside a scroll container (a long menu in an open sheet, a scrolling
          // panel) everything is reachable by scrolling; the locked body above
          // it must not be read as the frame that cuts it. Slice B3b found six
          // such false alarms in the teaser sheet's kind menu.
          if (
            (/auto|scroll/.test(o.overflowY) && p.scrollHeight > p.clientHeight + 1) ||
            (/auto|scroll/.test(o.overflowX) && p.scrollWidth > p.clientWidth + 1)
          ) break;
          // A swipe strip also overflows its box, but you can reach the rest
          // by scrolling — that is the pattern, not the bug. Only an axis that
          // is cut AND cannot be scrolled hides content for good.
          const cutX = /hidden|clip/.test(o.overflowX) && p.scrollWidth <= p.clientWidth + 1;
          const cutY = /hidden|clip/.test(o.overflowY) && p.scrollHeight <= p.clientHeight + 1;
          if (cutX || cutY) {
            const pr = p.getBoundingClientRect();
            const outside =
              (cutX && (r.left < pr.left - 1 || r.right > pr.right + 1)) ||
              (cutY && (r.top < pr.top - 1 || r.bottom > pr.bottom + 1));
            if (outside) {
              const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
              const cy = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
              const hit = document.elementFromPoint(cx, cy);
              const reachable = !!(hit && (hit === el || el.contains(hit) || hit.contains(el)));
              // Reachable means the centre is still painted and hittable; only
              // the edge is trimmed, which is usually intended. Unreachable is
              // the real fault: a control nobody can touch.
              if (!reachable) push(out.clipped, { el: label(el), frame: label(p), axis: cutX ? "x" : "y" });
            }
            break;
          }
          p = p.parentElement;
        }
      }

      // 6. PRODUCT.md sets a 44px floor on phones. QĐ-18: measure what is
      //    actually reachable, including whatever is layered on top — a rect
      //    that is big enough means nothing if something else catches the tap.
      if (viewportWidth <= 460) {
        // Probing the four corners of a 44x44 square demands a square target,
        // which neighbouring items in a row can never give each other. Measure
        // instead how far the element still answers along each axis — that is
        // the hit area a thumb actually gets, `::after` padding included.
        const hits = (el, x, y) => {
          const h = document.elementFromPoint(
            Math.min(Math.max(x, 0), innerWidth - 1),
            Math.min(Math.max(y, 0), innerHeight - 1),
          );
          return !!(h && (h === el || el.contains(h) || h.contains(el)));
        };
        const extent = (el, cx, cy, axis) => {
          let lo = 0;
          let hi = 0;
          for (let d = 1; d <= 30; d++) {
            if (hits(el, axis === "x" ? cx - d : cx, axis === "y" ? cy - d : cy)) lo = d;
            else break;
          }
          for (let d = 1; d <= 30; d++) {
            if (hits(el, axis === "x" ? cx + d : cx, axis === "y" ? cy + d : cy)) hi = d;
            else break;
          }
          return lo + hi;
        };
        for (const el of document.querySelectorAll(CONTROLS)) {
          if (el.disabled) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (r.width >= 44 && r.height >= 44) continue;
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          if (!hits(el, cx, cy)) continue; // covered by something else entirely
          // elementFromPoint stops answering one pixel inside the far edge, so
          // the stepped extent lands 1px short of the real box: an `::after`
          // measured at exactly 44px probes as 43. Add that pixel back before
          // judging, or every control that just meets the floor reads as a miss.
          const hw = extent(el, cx, cy, "x") + 1;
          const hh = extent(el, cx, cy, "y") + 1;
          if (hw < 44 || hh < 44) {
            push(out.smallTarget, {
              el: label(el),
              layoutBox: `${r.width.toFixed(1)}x${r.height.toFixed(1)}`,
              hitArea: `${hw}x${hh}`,
              short: [hw < 44 ? `w:${44 - hw}px` : null, hh < 44 ? `h:${44 - hh}px` : null].filter(Boolean).join(" "),
            });
          }
        }
      }

      // 7. Type floor (QĐ-22): no visible text under 11px anywhere. Walks text
      //    nodes so a size set on an ancestor is caught where it lands.
      {
        const seen = new Set();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (!node.nodeValue.trim()) continue;
          const el = node.parentElement;
          if (!el || seen.has(el)) continue;
          seen.add(el);
          if (el.closest(".sr-only, script, style, sup, sub")) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          const size = parseFloat(cs.fontSize);
          if (size < 11) push(out.tinyText, { el: label(el), size });
        }
      }

      if (document.documentElement.scrollWidth > innerWidth + 1) {
        out.horizontalOverflow = {
          scrollWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
        };
      }
      return out;
    }, width);

  // The admin is desktop-only by design (`.s.adm{min-width:1180px}`), so its
  // routes join the sweep at the desktop width and skip the phone width.
  const ADMIN_ROUTES = [
    "/admin",
    "/admin/orders",
    "/admin/orders/DH-2429",
    "/admin/drops",
    "/admin/drops/05",
    "/admin/promotions",
    "/admin/products",
    "/admin/products/new",
    "/admin/products/p-khoi",
    "/admin/customers",
    "/admin/customers/c-minhanh",
    "/admin/slips?codes=DH-2429",
    // slice 5 of v3: the activity log
    "/admin/log",
  ];

  const results = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    for (const route of ROUTES) {
      const name = (route === "/" ? "home" : route.replace(/[/?=]+/g, "-").replace(/^-/, "")) + `-${width}`;
      const entry = { route, width, name };
      try {
        const response = await page.goto(ORIGIN + route, { waitUntil: "load" });
        entry.status = response ? response.status() : null;
        entry.landedOn = pathOf(page.url());
        await page.waitForTimeout(250); // let layout and any client render settle
        await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
        entry.findings = await probe(width);
      } catch (e) {
        entry.error = String(e).slice(0, 200);
      }
      results.push(entry);
    }
  }


  // Overlays: a menu that is shut measures like a page that has none.
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    const entry = { route: "/account/addresses/new#province", width, name: `account-addresses-new-province-${width}` };
    try {
      const response = await page.goto(ORIGIN + "/account/addresses/new", { waitUntil: "load" });
      entry.status = response ? response.status() : null;
      entry.landedOn = "/account/addresses/new";
      await page.locator(".field3", { hasText: "Tỉnh / thành" }).first().locator("button.selbtn").click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/${entry.name}.png`, fullPage: false });
      entry.findings = await probe(width);
    } catch (e) {
      entry.error = String(e).slice(0, 200);
    }
    results.push(entry);
  }


  const visit = async (route, width, name, open) => {
    const entry = { route, width, name };
    try {
      const response = await page.goto(ORIGIN + route.split("#")[0], { waitUntil: "load" });
      entry.status = response ? response.status() : null;
      entry.landedOn = pathOf(page.url());
      await page.waitForTimeout(250);
      if (open) {
        await open();
        await page.waitForTimeout(450);
      }
      await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: !open });
      entry.findings = await probe(width);
    } catch (e) {
      entry.error = String(e).slice(0, 200);
    }
    results.push(entry);
  };

  // The back office, as the demo manager ("Vào quản trị thử"), desktop only.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(ORIGIN + "/sign-in");
  await page.getByRole("button", { name: "Vào quản trị thử" }).click();
  await page.waitForURL(ORIGIN + "/admin", { timeout: 20000 });
  for (const route of ADMIN_ROUTES) {
    const name = route.replace(/[/?=]+/g, "-").replace(/^-/, "") + "-1280";
    await visit(route, 1280, name);
  }

  // The admin overlays and panels slice B3a wired to the database: shut, they
  // measure like pages that have none.
  const ADMIN_OVERLAYS = [
    ["/admin/orders/DH-2429#more", "admin-order-more-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác khác" }).click();
    }],
    ["/admin/orders/DH-2429#cancel", "admin-order-cancel-sheet-1280", async () => {
      await page.getByRole("button", { name: "Thao tác khác" }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: "Huỷ đơn" }).click();
      await page.waitForTimeout(350);
      await page.locator(".field3", { hasText: "Lý do" }).first().locator("button.selbtn").click();
    }],
    ["/admin/orders/DH-2429#handover", "admin-order-handover-1280", async () => {
      await page.locator(".nextstep").getByRole("button", { name: "Bàn giao" }).click();
    }],
    ["/admin/orders/DH-2431#address", "admin-order-address-form-1280", async () => {
      await page.locator(".panel3 h2", { hasText: "Giao tới" }).getByRole("button", { name: "Sửa" }).click();
    }],
    ["/admin/orders#rowmenu", "admin-orders-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác DH-2431" }).click();
    }],
    ["/admin#reset", "admin-reset-sheet-1280", async () => {
      await page.locator(".simbar").getByRole("button", { name: "Đặt lại dữ liệu mẫu" }).click();
    }],
    // slice B3b: the sheets and menus that now write to the database

    ["/admin/products#rowmenu", "admin-products-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác KHÓI", exact: true }).click();
    }],
    ["/admin/products#adjust", "admin-products-adjust-sheet-1280", async () => {
      await page.getByRole("button", { name: "Thao tác KHÓI", exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: "Điều chỉnh tồn kho" }).click();
      await page.waitForTimeout(350);
      await page.getByRole("dialog").locator(".field3", { hasText: "Lý do" }).first().locator("button.selbtn").click();
    }],
    ["/admin/drops#rowmenu", "admin-drops-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác Số 05", exact: true }).click();
    }],
    ["/admin/drops#create", "admin-drops-create-sheet-1280", async () => {
      await page.locator(".top").getByRole("button", { name: "Tạo số" }).click();
    }],
    ["/admin/drops#edit", "admin-drops-edit-sheet-1280", async () => {
      await page.getByRole("button", { name: "Thao tác Số 06", exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: "Sửa giờ" }).click();
    }],
    ["/admin/drops#close", "admin-drops-close-sheet-1280", async () => {
      await page.getByRole("button", { name: "Thao tác Số 05", exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: "Đóng sớm" }).click();
    }],
    ["/admin/drops/05#teaser", "admin-drops-teaser-sheet-1280", async () => {
      await page.getByRole("button", { name: "Thêm mẫu hé lộ" }).click();
      await page.waitForTimeout(350);
      await page.getByRole("dialog").locator(".field3", { hasText: "Loại" }).first().locator("button.selbtn").click();
    }],
    ["/admin/promotions#rowmenu", "admin-promotions-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác DOT05", exact: true }).click();
    }],
    ["/admin/promotions#create", "admin-promotions-create-sheet-1280", async () => {
      await page.locator(".top").getByRole("button", { name: "Tạo mã" }).click();
      await page.waitForTimeout(350);
      await page.getByRole("dialog").locator(".field3", { hasText: "Loại" }).first().locator("button.selbtn").click();
    }],
    ["/admin/promotions#edit", "admin-promotions-edit-sheet-1280", async () => {
      await page.getByRole("button", { name: "Thao tác DOT05", exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: "Sửa", exact: true }).click();
    }],
    ["/admin/products/p-khoi#kind", "admin-product-form-kind-menu-1280", async () => {
      await page.locator(".field3", { hasText: "Loại" }).first().locator("button.selbtn").click();
    }],
  ];
  for (const [route, name, open] of ADMIN_OVERLAYS) await visit(route, 1280, name, open);

  page.off("console", onConsole);
  page.context().off("request", onRequest);

  const counts = {};
  let total = 0;
  for (const r of results) {
    if (!r.findings) continue;
    for (const [k, v] of Object.entries(r.findings)) {
      const n = Array.isArray(v) ? v.length : v ? 1 : 0;
      counts[k] = (counts[k] || 0) + n;
      total += n;
    }
  }

  return {
    routes: results.length,
    totalFindings: total,
    byDetector: counts,
    consoleErrors,
    foreign,
    redirected: results.filter((r) => r.landedOn && r.landedOn !== r.route.split("?")[0].split("#")[0]).map((r) => `${r.route} -> ${r.landedOn}`),
    results: results.filter((r) => r.error || (r.findings && Object.values(r.findings).some((v) => (Array.isArray(v) ? v.length : v)))),
    shots: SHOTS,
  };
}
