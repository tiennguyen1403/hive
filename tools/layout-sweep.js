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

  // Every screen a shopper or the back office reaches. The internal pages that
  // were never in it — the hydration probe `/hyd` and the kit page `/system` —
  // went at round v4 slice 5.
  const ROUTES = [
    "/",
    "/products",
    "/products/s05-khoi",
    // slice B5: a fixed style's page
    "/products/ao-thun-tron",
    "/search?q=khoi",
    "/cart",
    "/checkout",
    "/order-confirmed",
    // slice 3 of v3: the public lookup page, with a fixture order so the result state renders
    // (since v4 slice 4a the screen looks the order up once on mount, so the form shows first)
    "/track?code=DH-2425&phone=0908221447",
    "/track",
    // v4 slice 4a: the app-wide 404, from an unknown path and from an issue that does not exist
    "/khong-co-trang-nay",
    "/so/999",
    // v4 slice 4b: Hỏi đáp (plain and searching), the size guide, the two kept pages, and /returns, which leads to Hỏi đáp
    "/faq",
    "/faq?q=cod",
    "/size-guide",
    "/about",
    "/contact",
    "/returns",
    "/so/4",
    "/so/5",
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
      const CONTROLS = 'button, [role="button"], a[href], summary, .chip, .btn, .sz';
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

  // The admin is desktop-only by design (`ArcAdminFrame.module.css`, `min-width: 1180px`), so its
  // routes join the sweep at the desktop width and skip the phone width.
  const ADMIN_ROUTES = [
    "/admin",
    "/admin/orders",
    "/admin/orders/DH-2429",
    "/admin/orders/DH-2430",
    "/admin/orders/DH-2418",
    "/admin/drops",
    "/admin/drops/05",
    "/admin/promotions",
    "/admin/products",
    // v3 slice 12: Cố định is the first tab; an issue is ?drop=N
    "/admin/products?drop=5",
    "/admin/products/new",
    "/admin/products/p-khoi",
    "/admin/products/p-ao-thun-tron",
    "/admin/customers",
    "/admin/customers/c-minhanh",
    "/admin/slips?codes=DH-2429",
    "/admin/slips?codes=DH-2429,DH-2428,DH-2423,DH-2426",
    "/admin/slips?codes=DH-9999",
    // slice 5 of v3: the activity log
    "/admin/log",
    // round v5 slice 2: the overview's ranges and the log's filters, on Arc
    "/admin?days=7",
    "/admin?days=30",
    "/admin/log?kind=order",
    "/admin/log?today=1",
    "/admin/log?q=zzz",
    // round v5 slice 3: the customers and the codes, on Arc
    "/admin/customers?group=loyal",
    "/admin/customers?q=zzz",
    "/admin/customers/c-namle",
    "/admin/promotions?state=ENDED",
    "/admin/promotions?state=PAUSED",
    // round v5 slice 4: the issues on Arc, a closed one, one not open, one that does not exist
    "/admin/drops/04",
    "/admin/drops/06",
    "/admin/drops/99",
    // round v5 slice 5a: the styles on Arc, each kind of tab, empty states
    "/admin/products?drop=6",
    "/admin/products?drop=4",
    "/admin/products?fixed=1&gone=1",
    "/admin/products?drop=5&q=zzz",
    "/admin/products?drop=99",
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


  // Overlays: a menu that is shut measures like a page that has none. Since v4
  // slice 3a the address form is a sheet on /account/addresses (`?add=1` opens
  // it), and the province picker opens over the sheet.
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    const entry = { route: "/account/addresses?add=1#province", width, name: `account-addresses-add-province-${width}` };
    try {
      const response = await page.goto(ORIGIN + "/account/addresses?add=1", { waitUntil: "load" });
      entry.status = response ? response.status() : null;
      entry.landedOn = "/account/addresses?add=1";
      await page.locator("#f-province").click();
      await page.waitForTimeout(450);
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
      await page.getByRole("dialog").getByRole("combobox", { name: "Lý do" }).click();
    }],
    ["/admin/orders/DH-2429#handover", "admin-order-handover-1280", async () => {
      await page.getByRole("button", { name: "Bàn giao" }).click();
    }],
    ["/admin/orders/DH-2429#carrier", "admin-order-carrier-select-1280", async () => {
      await page.getByRole("button", { name: "Bàn giao" }).click();
      await page.waitForTimeout(300);
      await page.getByRole("combobox", { name: "Hình thức giao" }).click();
    }],
    ["/admin/orders/DH-2431#address", "admin-order-address-form-1280", async () => {
      await page.getByRole("button", { name: "Sửa" }).click();
    }],
    ["/admin/orders/DH-2431#province", "admin-order-address-province-1280", async () => {
      await page.getByRole("button", { name: "Sửa" }).click();
      await page.waitForTimeout(300);
      await page.getByRole("combobox", { name: "Tỉnh / thành" }).click();
    }],
    ["/admin/orders/DH-2431#ward", "admin-order-address-ward-1280", async () => {
      await page.getByRole("button", { name: "Sửa" }).click();
      await page.waitForTimeout(300);
      await page.getByRole("combobox", { name: "Phường / xã" }).click();
    }],
    ["/admin/orders#rowmenu", "admin-orders-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác DH-2431" }).click();
    }],
    ["/admin#reset", "admin-reset-sheet-1280", async () => {
      await page.locator("aside").getByRole("button", { name: "Đặt lại dữ liệu mẫu" }).click();
    }],
    // round v5 slice 2: the overview's day table, the log's filter menu at both steps
    ["/admin#days", "admin-overview-day-table-1280", async () => {
      await page.getByText("Xem dạng bảng").click();
    }],
    ["/admin/log#filter", "admin-log-filter-fields-1280", async () => {
      await page.getByRole("button", { name: "Thêm bộ lọc" }).click();
    }],
    ["/admin/log#filter-values", "admin-log-filter-values-1280", async () => {
      await page.getByRole("button", { name: "Thêm bộ lọc" }).click();
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: /Loại thao tác/ }).click();
    }],
    // slice B3b: the sheets and menus that now write to the database

    // v3 slice 12: the default tab is Cố định; an issue's style is named with its code
    ["/admin/products#rowmenu", "admin-products-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác HOODIE TRƠN", exact: true }).click();
    }],
    ["/admin/products#restock", "admin-products-restock-sheet-1280", async () => {
      await page.getByRole("button", { name: "Thao tác HOODIE TRƠN", exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: "Nhập thêm" }).click();
      await page.waitForTimeout(350);
      await page.getByRole("dialog").getByLabel(/^Nhập thêm Xám M,/).fill("4");
    }],
    ["/admin/products?drop=5#rowmenu", "admin-products-so05-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác S05\u00a0\u2013 KHÓI", exact: true }).click();
    }],
    ["/admin/products?drop=5#adjust", "admin-products-adjust-sheet-1280", async () => {
      await page.getByRole("button", { name: "Thao tác S05\u00a0\u2013 KHÓI", exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: "Điều chỉnh tồn kho" }).click();
      await page.waitForTimeout(350);
      // round v5 slice 5a: Arc Select, by role and label.
      await page.getByRole("dialog").getByRole("combobox", { name: "Lý do" }).click();
    }],
    // round v5 slice 5a: the filter menu at both steps, the drawers in use
    ["/admin/products?drop=5#filter", "admin-products-filter-fields-1280", async () => {
      await page.getByRole("button", { name: "Thêm bộ lọc" }).click();
    }],
    ["/admin/products?drop=5#filter-values", "admin-products-filter-values-1280", async () => {
      await page.getByRole("button", { name: "Thêm bộ lọc" }).click();
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: /Loại/ }).click();
    }],
    ["/admin/products?drop=5#adjust-ready", "admin-products-adjust-ready-1280", async () => {
      await page.getByRole("button", { name: "Thao tác S05 – KHÓI", exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: "Điều chỉnh tồn kho" }).click();
      await page.waitForTimeout(500);
      await page.getByRole("dialog").getByRole("button", { name: "Bớt Đen M" }).click();
      await page.getByRole("dialog").getByRole("combobox", { name: "Lý do" }).click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: "Hư hỏng" }).click();
    }],
    ["/admin/products#adjust-fixed", "admin-products-adjust-fixed-1280", async () => {
      await page.getByRole("button", { name: "Thao tác HOODIE TRƠN", exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: "Điều chỉnh tồn kho" }).click();
    }],
    ["/admin/drops#rowmenu", "admin-drops-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác Số 05", exact: true }).click();
    }],
    ["/admin/drops#create", "admin-drops-create-sheet-1280", async () => {
      // round v5 slice 4: the Arc heading has no v3 `.top`; the page's own "Tạo số".
      await page.getByRole("button", { name: "Tạo số" }).first().click();
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
      await page.waitForTimeout(700);
      // round v5 slice 4: Arc's Select, found by its role and label, not v3's `.field3 button.selbtn`.
      await page.getByRole("dialog").getByRole("combobox", { name: "Loại" }).click();
    }],
    // round v5 slice 4: the other states of the three Arc dialogs
    ["/admin/drops#create-backwards", "admin-drops-create-backwards-1280", async () => {
      await page.getByRole("button", { name: "Tạo số" }).first().click();
      await page.waitForTimeout(700);
      await page.getByRole("dialog").getByLabel("Đóng lúc 20:00 ngày").fill("01/10/2026");
    }],
    ["/admin/drops/05#close-detail", "admin-drops-close-detail-1280", async () => {
      await page.locator("#detail").getByRole("button", { name: "Đóng sớm" }).click();
    }],
    ["/admin/drops/05#teaser-ready", "admin-drops-teaser-ready-1280", async () => {
      await page.getByRole("button", { name: "Thêm mẫu hé lộ" }).click();
      await page.waitForTimeout(700);
      await page.getByRole("dialog").getByLabel("Tên mẫu").fill("SỎI");
      await page.getByRole("dialog").getByRole("combobox", { name: "Loại" }).click();
      await page.waitForTimeout(400);
      await page.getByRole("option", { name: "Áo khoác dù", exact: true }).click();
      await page.waitForTimeout(300);
      await page.getByRole("dialog").getByRole("radio", { name: "Ảnh tro" }).click();
    }],
    ["/admin/drops/04#rowmenu", "admin-drops-04-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác Số 04", exact: true }).click();
    }],
    ["/admin/promotions#rowmenu", "admin-promotions-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác DOT05", exact: true }).click();
    }],
    // round v5 slice 3: the same passes for the Arc screens
    ["/admin/promotions#create-arc", "admin-promotions-create-drawer-1280", async () => {
      await page.getByRole("button", { name: "Tạo mã" }).click();
      await page.waitForTimeout(700);
      await page.getByRole("dialog").getByRole("combobox", { name: "Loại" }).click();
    }],
    ["/admin/promotions#edit-arc", "admin-promotions-edit-drawer-1280", async () => {
      await page.getByRole("button", { name: "Thao tác DOT05", exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("menuitem", { name: "Sửa", exact: true }).click();
    }],
    ["/admin/promotions#error-arc", "admin-promotions-create-error-1280", async () => {
      await page.getByRole("button", { name: "Tạo mã" }).click();
      await page.waitForTimeout(700);
      await page.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();
    }],
    ["/admin/customers#rowmenu", "admin-customers-row-menu-1280", async () => {
      await page.getByRole("button", { name: "Thao tác Trần Minh Anh", exact: true }).click();
    }],
    // round v5 slice 5b: the style form is Arc's. Its fields are found by
    // role and label, not by v3's `.field3`, `button.selbtn`, `.colorpick`,
    // `.cslot` and `.sheetwrap`.
    ["/admin/products/new#issue-menu", "admin-product-new-issue-menu-1280", async () => {
      await page.getByRole("combobox", { name: "Số", exact: true }).click();
    }],
    ["/admin/products/new#fixed", "admin-product-new-fixed-1280", async () => {
      await page.getByRole("combobox", { name: "Số", exact: true }).click();
      await page.waitForTimeout(250);
      await page.getByRole("option", { name: "Cố định" }).click();
    }],
    ["/admin/products/p-khoi#kind", "admin-product-form-kind-menu-1280", async () => {
      await page.getByRole("combobox", { name: "Loại" }).click();
    }],
    // v3 slice 7: the crop dialog after a picked file, and the borrowed-photo grid open
    ["/admin/products/new#crop", "admin-product-new-crop-sheet-1280", async () => {
      await page.getByRole("group", { name: "Màu sẽ cắt" }).getByRole("button", { name: "Đen", exact: true }).click();
      await page.getByLabel("Chọn tệp cho Đen").setInputFiles("tools/fixtures/soi-den.png");
      await page.getByRole("dialog").getByRole("group", { name: /^Khung cắt/ }).waitFor({ state: "visible", timeout: 8000 });
    }],
    ["/admin/products/new#photopick", "admin-product-new-photopick-1280", async () => {
      await page.getByRole("group", { name: "Màu sẽ cắt" }).getByRole("button", { name: "Đen", exact: true }).click();
      await page.getByRole("button", { name: "Mượn tạm" }).first().click();
    }],
    ["/admin/products/p-khoi#photopick", "admin-product-edit-photopick-1280", async () => {
      await page.getByRole("button", { name: "Mượn tạm" }).first().click();
    }],
    // round v5 slice 5b: three colours with their rows and grid, a fixed style's loan grid
    ["/admin/products/new#colours", "admin-product-new-colours-1280", async () => {
      for (const c of ["Đen", "Trắng", "Xám"]) {
        await page.getByRole("group", { name: "Màu sẽ cắt" }).getByRole("button", { name: c, exact: true }).click();
      }
    }],
    ["/admin/products/p-ao-thun-tron#photopick", "admin-product-fixed-photopick-1280", async () => {
      await page.getByRole("button", { name: "Đổi ảnh mượn" }).first().click();
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
