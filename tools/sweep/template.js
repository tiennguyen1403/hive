/**
 * Layout sweep — the separate visual pass QĐ-14 requires.
 *
 * Behavioural tests and "zero horizontal overflow" do not imply "the grid
 * looks like a grid". This walks the routes of `tools/sweep/manifest.mjs`,
 * screenshots each one, opens each layer, and runs seven detectors that only
 * a real viewport can answer.
 *
 * THIS FILE IS THE TEMPLATE. `tools/sweep/gen.mjs` writes the selection into
 * the slot below and saves a runnable copy (`.playwright-cli/sweep-<label>-<lang>.js`,
 * and `tools/layout-sweep.js` for the full Vietnamese pass). Edit the routes in
 * the manifest and the detectors here, never in a generated copy.
 *
 * Run a copy through the CLI session so the browser stays visible:
 *
 *   npx playwright cli --raw run-code --filename=.playwright-cli/sweep-all-vi.js \
 *     > .playwright-cli/sweep-all-vi.json
 *
 * The file must hold exactly one function expression — `run-code` wraps it in
 * parentheses and evaluates it, so no import/require here, and no URL class.
 */
async (page) => {
  const ORIGIN = "http://127.0.0.1:3200";
  /*PLAN*/
  // The language of this run (round v6, QD-40). The cookie is set after the
  // sign-in reset below, and the words the sweep clicks by follow it through `T`.
  const LANG = PLAN.lang;
  const T = (vi, en) => (LANG === "en" ? en : vi);
  const SHOTS = PLAN.shots;

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

  // Every console error, with the entry that was on screen when it came.
  let current = "sign-in";
  const consoleErrors = [];
  const onConsole = (m) => {
    if (m.type() === "error") consoleErrors.push({ at: current, url: page.url(), text: m.text() });
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
  await page.context().addCookies([{ name: "hive-lang", value: LANG, url: ORIGIN }]);
  await page.goto(ORIGIN + "/sign-in");
  await page.getByRole("button", { name: T("Đăng nhập thử", "Try a demo account") }).click();
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
      // An element under a `display: none` ancestor draws nothing, whatever its
      // own display says: getComputedStyle still answers "inline" for an `<a>`
      // there. Round v6 tooling slice: all 72 findings of the B18 baseline were
      // `.acc-item` links in `.acc-nav`, which is `display: none` below 900px.
      const hiddenAbove = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          if (getComputedStyle(p).display === "none") return true;
        }
        return false;
      };
      for (const { selector, wants } of blockOnly) {
        let nodes;
        try {
          nodes = document.querySelectorAll(selector);
        } catch {
          continue; // selector the CSSOM accepts but querySelectorAll will not
        }
        for (const el of nodes) {
          const display = getComputedStyle(el).display;
          if ((display === "inline" || display === "inline flow") && !hiddenAbove(el)) {
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
      //    The size choice is `label.size` (56px, 48 on Hồ sơ), the control a
      //    thumb presses; `.sz` is only the letter inside it, and measuring the
      //    letter reported twelve 10–22px "targets" per run (tooling slice T1).
      const TARGETS = 'button, [role="button"], a[href], summary, .chip, .btn, .size';
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
        for (const el of document.querySelectorAll(TARGETS)) {
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

  // The boxes, in the shot's own pixels, of what changes with the clock alone
  // (`manifest.mjs`, VOLATILE): `pixdiff.mjs --regions` leaves them out.
  const volatile = {};
  const boxes = (name, fullPage) =>
    page
      .evaluate(
        ({ selectors, fullPage }) => {
          const out = [];
          for (const el of document.querySelectorAll(selectors.join(","))) {
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) continue;
            const x = r.left + (fullPage ? scrollX : 0);
            const y = r.top + (fullPage ? scrollY : 0);
            out.push([Math.floor(x), Math.floor(y), Math.ceil(r.width + (x % 1)), Math.ceil(r.height + (y % 1))]);
          }
          return out;
        },
        { selectors: PLAN.volatile, fullPage },
      )
      .then((list) => {
        if (list.length) volatile[name] = list;
      })
      .catch(() => {});

  const results = [];
  const visited = [];
  const record = (entry) => {
    results.push(entry);
    visited.push({
      name: entry.name,
      route: entry.route,
      width: entry.width,
      status: entry.status ?? null,
      landedOn: entry.landedOn ?? null,
      ...(entry.error ? { error: entry.error } : {}),
    });
  };
  let viewportWidth = 0;
  const size = async (width) => {
    if (width === viewportWidth) return;
    await page.setViewportSize({ width, height: PLAN.heights[width] });
    viewportWidth = width;
  };

  // The shop's pages, one width after the other.
  for (const { route, width, name } of PLAN.shopPages) {
    current = name;
    await size(width);
    const entry = { route, width, name };
    try {
      const response = await page.goto(ORIGIN + route, { waitUntil: "load" });
      entry.status = response ? response.status() : null;
      entry.landedOn = pathOf(page.url());
      await page.waitForTimeout(250); // let layout and any client render settle
      await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
      await boxes(name, true);
      entry.findings = await probe(width);
    } catch (e) {
      entry.error = String(e).slice(0, 200);
    }
    record(entry);
  }

  // The shop's layers: a menu that is shut measures like a page that has none.
  // Since v4 slice 3a the address form is a sheet on /account/addresses
  // (`?add=1` opens it), and the province picker opens over the sheet.
  for (const { route, width, name, open } of PLAN.shopOverlays) {
    current = name;
    await size(width);
    const entry = { route, width, name };
    try {
      const response = await page.goto(ORIGIN + route.split("#")[0], { waitUntil: "load" });
      entry.status = response ? response.status() : null;
      entry.landedOn = route.split("#")[0];
      await open({ page, T, LANG });
      await page.waitForTimeout(450);
      await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
      await boxes(name, false);
      entry.findings = await probe(width);
    } catch (e) {
      entry.error = String(e).slice(0, 200);
    }
    record(entry);
  }

  const visit = async (route, width, name, open) => {
    current = name;
    await size(width);
    const entry = { route, width, name };
    try {
      const response = await page.goto(ORIGIN + route.split("#")[0], { waitUntil: "load" });
      entry.status = response ? response.status() : null;
      entry.landedOn = pathOf(page.url());
      await page.waitForTimeout(250);
      if (open) {
        await open({ page, T, LANG });
        await page.waitForTimeout(450);
      }
      await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: !open });
      await boxes(name, !open);
      entry.findings = await probe(width);
    } catch (e) {
      entry.error = String(e).slice(0, 200);
    }
    record(entry);
  };

  // The back office, as the demo manager ("Vào quản trị thử"), desktop only.
  if (PLAN.adminPages.length || PLAN.adminOverlays.length) {
    current = "admin-sign-in";
    await page.setViewportSize({ width: 1280, height: 800 });
    viewportWidth = 1280;
    await page.goto(ORIGIN + "/sign-in");
    await page.getByRole("button", { name: T("Vào quản trị thử", "Try the admin") }).click();
    await page.waitForURL(ORIGIN + "/admin", { timeout: 20000 });
    for (const { route, width, name } of PLAN.adminPages) await visit(route, width, name);
    for (const { route, width, name, open } of PLAN.adminOverlays) await visit(route, width, name, open);
  }

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
    // Since tooling slice T1: what this run covered, in visit order, so `tools/sweep/diff.mjs` can tell a route
    // that lost its findings from a route this run never opened; the clock's boxes per shot; the selection.
    visited,
    volatile,
    scope: PLAN.scope,
  };
}
