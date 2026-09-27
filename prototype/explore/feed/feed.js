/*
 * HIVE style exploration, direction 3 "Feed": what every page shares.
 * The shop's moment (?state=), the app chrome (top bar, bottom tab bar), chrome state (cart badge, hearts,
 * reminders, the inbox badge), the ticking clock, bottom sheets (size, added, size guide, sort, pickers), the toast,
 * the card renderers and the listing. Every fact comes from window.HIVE; every internal link keeps ?state= and,
 * while signed out, ?auth=out.
 *
 * THE CHROME CONTRACT (for every page, including the ones this file does not own)
 *   <body data-page="<name>" data-title="<phone bar title>" data-back="<page to go back to>">
 *   <header class="top"></header>                       filled here: brand, the three shop tabs, the icons
 *   <nav class="tabbar" aria-label="Điều hướng chính"></nav>   filled here; omit it on screens that hide the tab bar
 *   <aside class="acc-nav" data-acc-nav></aside>        optional: the account menu, shown on desktop (see .acc-layout)
 *   <footer class="foot" data-foot></footer>            filled at FEED.boot(); data-foot-skip="track.html" drops a help
 *                                                       link the page already carries (set it before boot)
 *   Scripts: ../shared/data.js, feed.js, then the page's own script, which calls FEED.boot() once its markup is in.
 *   - Tab roots (home, products, cart, favorites, account) show the brand bar on the phone. Any other page with a
 *     data-title gets a phone bar (back arrow and the title) unless it brings its own .mbar; data-close="x" shows
 *     a close cross instead of the arrow.
 *   - The tab bar marks the page's tab: Yêu thích for favorites, Tôi for the account pages, help and tracking.
 *   - Links: FEED.url("page.html?x=1") keeps the moment and the signed-out state; links written without it get it on
 *     click anyway. FEED.signedIn is false with ?auth=out; FEED.signIn(next) and FEED.signOut() move between them.
 *   - Shared state: FEED.favorites (list, has, add, remove), FEED.reminders (list, has, toggle, setChannels),
 *     FEED.inbox (list, unreadCount, markRead, markAllRead). Each fires a "feed:change" event on window.
 */
(function () {
  "use strict";

  const H = window.HIVE;
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const desk = matchMedia("(min-width: 900px)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const motion = () => !reduced.matches;
  root.classList.toggle("motion", motion());
  reduced.addEventListener("change", () => root.classList.toggle("motion", motion()));

  // Keyboard-only focus ring: a pointer sets data-mouse, Tab clears it.
  addEventListener("pointerdown", () => root.setAttribute("data-mouse", ""), true);
  addEventListener("keydown", (e) => { if (e.key === "Tab") root.removeAttribute("data-mouse"); }, true);

  // ---------------------------------------------------------------- links: every internal link keeps the moment
  const PAGES = /^(home|products|product|search|cart|checkout|order-confirmed|sign-in|account|orders|order|return|addresses|profile|favorites|notifications|track|archive|issue|help|size-guide|contact|404)\.html/;
  const signedIn = H.AUTH !== "out";
  const addParam = (path, kv) => path + (path.indexOf("?") >= 0 ? "&" : "?") + kv;
  function url(p) {
    const i = p.indexOf("#");
    let path = i < 0 ? p : p.slice(0, i);
    if (!/[?&]state=/.test(path)) path = H.keep(path);
    if (!signedIn && !/[?&]auth=/.test(path)) path = addParam(path, "auth=out");
    return path + (i < 0 ? "" : p.slice(i));
  }
  // The same link for the other side of the sign-in: drops ?auth=out, keeps the moment.
  const withoutAuth = (u) => u.replace(/([?&])auth=out(&|$)/, (m, a, b) => (b ? a : "")).replace(/[?&]$/, "");
  function signIn(next) {
    let n = withoutAuth(next || "account.html");
    const k = n.split("#");
    if (!/[?&]state=/.test(k[0])) n = H.keep(k[0]) + (k[1] ? "#" + k[1] : "");
    location.href = n;
  }
  function signOut() { location.href = addParam(H.keep("account.html"), "auth=out"); }
  // A sign-in link that brings the shopper back here afterwards.
  const signInHref = () => "sign-in.html?next=" + encodeURIComponent(withoutAuth(location.pathname.split("/").pop() + location.search + location.hash));
  // Screens that do not exist in this mock are href="#": tapping does nothing.
  // Any internal link a renderer wrote without the moment gets it at the last moment.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    const h = a.getAttribute("href");
    if (h === "#") { e.preventDefault(); return; }
    if (PAGES.test(h)) a.setAttribute("href", url(h));
  }, true);

  // ---------------------------------------------------------------- small helpers
  // This direction's renames of the running app's labels (listed in direction.json).
  const WORDS = { "Bảng số đo": "Bảng size", "Câu hỏi thường gặp": "Hỏi đáp" };
  const HELP_HREF = {
    "Câu hỏi thường gặp": "help.html", "Đổi trả 7 ngày": "help.html#doi-tra", "Tra cứu đơn": "track.html",
    "Bảng số đo": "size-guide.html", "Liên hệ": "contact.html",
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (n, cls) => `<span class="i i-${n}${cls ? " " + cls : ""}" aria-hidden="true"></span>`;
  const low1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const colorName = (c) => H.COLORS[c].label;
  const isFixed = (s) => !!s.shape;
  const issueLabel = (no) => "Số " + H.pad(no);
  // A success header's words with the check on their first line (feed.css .ok-mark). The check and the first word
  // never part, so a title that wraps keeps its check. Plain text in, markup out.
  function okTitle(text) {
    const t = String(text);
    const cut = t.indexOf(" ");
    const first = cut < 0 ? t : t.slice(0, cut);
    return `<span class="ok-lead">${icon("check-circle-fill", "ok-mark")}${esc(first)}</span>${cut < 0 ? "" : esc(t.slice(cut))}`;
  }

  // ---------------------------------------------------------------- the shop's moment
  const MODE = H.MODE;
  const I5 = H.issue(5);
  const LIVE = I5.state === "OPEN";                                   // Số 05 is selling
  const NEXT = H.ISSUES.find((i) => i.state === "UPCOMING") || null;  // Số 06 when announced
  const CLOSED = H.ISSUES.filter((i) => i.state === "CLOSED").sort((a, b) => b.no - a.no);
  const OLDER = CLOSED.filter((i) => i.no !== 5);                    // Số 04, Số 03
  const lineOf = (s) => (isFixed(s) ? "Cố định" : issueLabel(5));
  const soldOut = (s) => !isFixed(s) && H.isSoldOut(s);
  const closedStyle = (s) => !isFixed(s) && !LIVE;                    // a Số 05 style once Số 05 has closed
  const canBuy = (s) => (isFixed(s) ? H.left(s) > 0 : LIVE && !H.isSoldOut(s));
  const firstColor = (s) => s.colors.find((c) => H.leftIn(s, c) > 0) || s.colors[0];
  const soldOf = (s) => s.cut - H.left(s);

  // "20:00 thứ Sáu 02/10" -> { time, dow, dd, mm }
  function parts(iso) {
    const bits = H.when(iso).split(" ");
    const time = bits.shift();
    const [dd, mm] = bits.pop().split("/");
    return { time, dow: bits.join(" "), dd, mm };
  }

  function countdown(iso) {
    const u = H.until(iso);
    return (u.d ? u.d + " ngày " : "") + H.pad(u.h) + ":" + H.pad(u.m) + ":" + H.pad(u.s);
  }

  // The clock's digits sit in 1ch cells, so proportional figures tick without the line jittering.
  const cells = (t) => t.replace(/\d/g, (d) => `<span class="dg">${d}</span>`);
  const cdHTML = (iso) => cells(countdown(iso));

  // ---------------------------------------------------------------- per-direction storage (can throw or be empty)
  function store(name, fallback) {
    const key = "hive-explore-" + name + "-feed";
    return {
      get() {
        try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
      },
      set(v) {
        try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage off: state lives for this view only */ }
      },
      raw() {
        try { return localStorage.getItem(key); } catch (e) { return null; }
      },
    };
  }
  const cart = H.cart("feed");
  const Q = new URLSearchParams(location.search);
  const change = (what) => dispatchEvent(new CustomEvent("feed:change", { detail: what }));

  // Saved styles, [{ slug, color }]. A first visit starts from the demo shopper's list; signed out there is none.
  // ?favs=none shows the empty list for this view only (nothing is written).
  const favStore = store("fav", null);
  let favMemory = Q.get("favs") === "none" ? [] : null;
  const favorites = {
    list() {
      if (!signedIn) return [];
      if (favMemory) return favMemory.slice();
      const raw = favStore.get();
      if (!Array.isArray(raw)) return H.FAVORITES.map((f) => Object.assign({}, f));
      return raw.map((f) => (typeof f === "string" ? { slug: f, color: null } : f)).filter((f) => H.findAny(f.slug));
    },
    has(slug) { return favorites.list().some((f) => f.slug === slug); },
    save(list) { if (favMemory) favMemory = list; else favStore.set(list); paintFavs(); change("favorites"); },
    add(slug, color) {
      const st = H.findAny(slug);
      if (!st || favorites.has(slug)) return;
      favorites.save([{ slug, color: color || (st.colors ? firstColor(st) : null) }].concat(favorites.list()));
    },
    remove(slug) { favorites.save(favorites.list().filter((f) => f.slug !== slug)); },
  };

  // Reminders the shopper turned on, [{ issue, channels }]; the demo shopper starts with Số 06 by app and email.
  const remStore = store("remind", null);
  const reminders = {
    list() {
      if (!signedIn) return [];
      const raw = remStore.get();
      const all = Array.isArray(raw)
        ? raw.map((r) => (typeof r === "number" ? { issue: r, channels: ["push", "email"] } : r))
        : H.REMINDERS.map((r) => ({ issue: r.issue, channels: r.channels.slice() }));
      return all.filter((r) => H.ISSUES.some((i) => i.no === r.issue && i.state === "UPCOMING"));
    },
    has(no) { return reminders.list().some((r) => r.issue === no); },
    save(list) { remStore.set(list); paintReminders(); change("reminders"); },
    toggle(no) {
      const l = reminders.list();
      reminders.save(reminders.has(no) ? l.filter((r) => r.issue !== no) : l.concat([{ issue: no, channels: ["push", "email"] }]));
    },
    setChannels(no, channels) {
      reminders.save(reminders.list().map((r) => (r.issue === no ? { issue: no, channels: channels.slice() } : r)));
    },
  };

  // The inbox: HIVE.notifications() plus what was read on this device.
  const readStore = store("read", []);
  const nkey = (n) => n.at + "|" + n.title;
  const inbox = {
    list() {
      if (!signedIn) return [];
      const read = new Set(readStore.get());
      return H.notifications().map((n) => Object.assign({}, n, { key: nkey(n), unread: n.unread && !read.has(nkey(n)) }));
    },
    unreadCount() { return inbox.list().filter((n) => n.unread).length; },
    markRead(key) { readStore.set(Array.from(new Set(readStore.get().concat([key])))); paintBell(); change("inbox"); },
    markAllRead() { readStore.set(Array.from(new Set(readStore.get().concat(inbox.list().map((n) => n.key))))); paintBell(); change("inbox"); },
  };

  // ---------------------------------------------------------------- app chrome
  const MARK = '<svg class="mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14" fill="#111214"/><g fill="#fff" transform="translate(32 32) skewX(-10) translate(-32 -32)"><rect x="19.5" y="15" width="9" height="34"/><rect x="35.5" y="15" width="9" height="34"/><rect x="27" y="28.5" width="10" height="7.5"/></g></svg>';
  const PAGE = document.body.dataset.page || "home";
  const TAB_OF = {
    home: "home", products: "home", archive: "home", issue: "home", search: "search", cart: "cart", favorites: "fav",
    account: "me", orders: "me", order: "me", return: "me", addresses: "me", profile: "me", "sign-in": "me",
    notifications: "me", track: "me", help: "me", "size-guide": "me", contact: "me",
  };
  const ROOTS = { home: 1, products: 1, cart: 1, favorites: 1, account: 1 };
  // The account menu (desktop). Order detail and returns sit under Đơn hàng.
  const ACC_NAV = [
    ["account", "account.html", "user", "Tôi"],
    ["orders", "orders.html", "package", "Đơn hàng"],
    ["favorites", "favorites.html", "heart", "Yêu thích"],
    ["notifications", "notifications.html", "bell", "Thông báo"],
    ["addresses", "addresses.html", "map-pin", "Địa chỉ"],
    ["profile", "profile.html", "identification-card", "Hồ sơ"],
  ];
  const ACC_OF = { order: "orders", return: "orders" };
  const FILLED = { user: 1, package: 1, heart: 1, bell: 1 };

  function renderChrome() {
    const cur = (p) => (PAGE === p ? ' aria-current="page"' : "");
    const meTab = TAB_OF[PAGE] === "me" && PAGE !== "notifications";
    const top = document.querySelector("header.top");
    // On the phone the bottom tab bar carries Giỏ with its count; the header bag is then for desktop only.
    const hasTabbar = !!document.querySelector("nav.tabbar");
    if (top) {
      top.dataset.top = ROOTS[PAGE] ? "brand" : PAGE;
      let mid;
      if (PAGE === "home") {
        mid = `<div class="tabs" role="tablist" aria-label="Trang chủ">
          <button class="tab" type="button" role="tab" id="tab-bang-tin" data-tab="bang-tin" aria-controls="panel-bang-tin" aria-selected="true"><span>Bảng tin</span></button>
          <button class="tab" type="button" role="tab" id="tab-cua-hang" data-tab="cua-hang" aria-controls="panel-cua-hang" aria-selected="false" tabindex="-1"><span>Cửa hàng</span></button>
          <button class="tab" type="button" role="tab" id="tab-sap-mo" data-tab="sap-mo" aria-controls="panel-sap-mo" aria-selected="false" tabindex="-1"><span>Sắp mở</span></button>
          <span class="tabs-ink" aria-hidden="true"></span>
        </div>`;
      } else if (PAGE === "checkout") {
        mid = '<p class="top-title">Thanh toán</p>';
      } else {
        const cur = PAGE === "products" ? ' aria-current="page"' : "";
        mid = `<nav class="tabs links" aria-label="Trang chủ">
          <a class="tab" href="${url("home.html#bang-tin")}"><span>Bảng tin</span></a>
          <a class="tab" href="${url("products.html")}"${cur}><span>Cửa hàng</span></a>
          <a class="tab" href="${url("home.html#sap-mo")}"><span>Sắp mở</span></a>
        </nav>`;
      }
      const acts = PAGE === "checkout"
        ? `<a class="top-back" href="${url("cart.html")}" data-cart-link>${icon("bag")}<span>Giỏ</span><span class="badge" data-cart-count hidden></span></a>`
        : `<a class="ib only-desk" href="${url("search.html")}" aria-label="Tìm"${cur("search")}>${icon(PAGE === "search" ? "magnifying-glass-fill" : "magnifying-glass")}</a>
          <a class="ib" href="${url("notifications.html")}" data-bell aria-label="Thông báo"${cur("notifications")}>${icon(PAGE === "notifications" ? "bell-fill" : "bell")}<span class="badge" data-bell-count hidden></span></a>
          <a class="ib only-desk" href="${url("favorites.html")}" aria-label="Yêu thích"${cur("favorites")}>${icon(PAGE === "favorites" ? "heart-fill" : "heart")}</a>
          <a class="ib${hasTabbar ? " only-desk" : ""}" href="${url("cart.html")}" data-cart-link${cur("cart")}>${icon(PAGE === "cart" ? "bag-fill" : "bag")}<span class="badge" data-cart-count hidden></span></a>
          <a class="ib only-desk" href="${url("account.html")}" aria-label="Tôi"${meTab ? ' aria-current="true"' : ""}>${icon(meTab ? "user-fill" : "user")}</a>`;
      top.innerHTML = `<div class="top-in">
        <a class="brand" href="${url("home.html")}" aria-label="HIVE, trang chủ">${MARK}<span class="word">HIVE</span></a>
        ${mid}
        <div class="acts">${acts}</div>
      </div>`;
    }
    const bar = document.querySelector("nav.tabbar");
    if (bar) {
      const on = TAB_OF[PAGE];
      const tb = (key, href, ic, label, extra) => {
        const cur = on === key;
        return `<a class="tb" href="${href}"${cur ? ' aria-current="page"' : ""}${extra || ""}>${icon(cur ? ic + "-fill" : ic)}${key === "cart" ? '<span class="badge" data-cart-count hidden></span>' : ""}<span>${label}</span></a>`;
      };
      bar.innerHTML = tb("home", url("home.html"), "house", "Trang chủ") +
        tb("search", url("search.html"), "magnifying-glass", "Tìm") +
        tb("fav", url("favorites.html"), "heart", "Yêu thích") +
        tb("cart", url("cart.html"), "bag", "Giỏ", " data-cart-link") +
        tb("me", url("account.html"), "user", "Tôi");
    }
    renderMbar(top);
    renderAccNav();
    // Static links in the page's own markup (the product page's back link, for one).
    document.querySelectorAll("a[href]").forEach((a) => {
      const h = a.getAttribute("href");
      if (PAGES.test(h)) a.setAttribute("href", url(h));
    });
  }

  // A pushed screen's bar on the phone: back (or close) and the title, from data-title and data-back.
  function renderMbar(top) {
    const b = document.body.dataset;
    if (!b.title || ROOTS[PAGE] || document.querySelector(".mbar, .pbar, .sbar")) return;
    const x = b.close === "x";
    const bar = document.createElement("div");
    bar.className = "mbar";
    bar.innerHTML = `<a class="ib" href="${url(b.back || "home.html")}" data-mbar-back aria-label="${x ? "Đóng" : "Quay lại"}">${icon(x ? "x" : "caret-left")}</a>
      <p class="mbar-title">${esc(b.title)}</p><div class="mbar-acts" data-mbar-acts></div>`;
    if (top) top.after(bar); else document.body.prepend(bar);
    bar.querySelector("[data-mbar-back]").addEventListener("click", (e) => {
      try {
        if (!b.backHard && document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) {
          e.preventDefault();
          history.back();
        }
      } catch (_) { /* keep the link */ }
    });
  }

  // The account menu, desktop only (a left column inside .acc-layout).
  function renderAccNav() {
    const el = document.querySelector("[data-acc-nav]");
    if (!el) return;
    const on = ACC_OF[PAGE] || PAGE;
    el.innerHTML = `<nav class="acc-menu" aria-label="Tài khoản">${ACC_NAV.map(([key, href, ic, label]) =>
      `<a class="acc-item" href="${url(href)}"${on === key ? ' aria-current="page"' : ""}>${icon(on === key && FILLED[ic] ? ic + "-fill" : ic)}<span>${label}</span></a>`).join("")}</nav>
      ${signedIn ? `<button class="acc-item acc-out" type="button" data-sign-out>${icon("sign-out")}<span>Đăng xuất</span></button>` : ""}`;
    // Signed out, the page itself offers the way in (the sign-in form on Tôi, the banner elsewhere), so the menu does not.
  }

  // Signed out: an action that needs the account says so, with a way in.
  function askSignIn(text) {
    toast(text, { label: "Đăng nhập", run() { location.href = url(signInHref()); } });
  }

  // ---------------------------------------------------------------- chrome state
  function paintBell() {
    const n = inbox.unreadCount();
    document.querySelectorAll("[data-bell-count]").forEach((b) => {
      b.textContent = n > 99 ? "99+" : String(n);
      b.hidden = n === 0;
    });
    document.querySelectorAll("[data-bell]").forEach((a) => {
      a.setAttribute("aria-label", n ? `Thông báo, ${n} chưa đọc` : "Thông báo");
    });
  }

  function paintCart() {
    const n = cart.count();
    document.querySelectorAll("[data-cart-count]").forEach((b) => {
      b.textContent = n > 99 ? "99+" : String(n);
      b.hidden = n === 0;
    });
    document.querySelectorAll("[data-cart-link]").forEach((a) => {
      a.setAttribute("aria-label", n ? `Giỏ, ${n} món` : "Giỏ, đang trống");
    });
  }

  function bumpBag() {
    if (!motion()) return;
    document.querySelectorAll("[data-cart-link] .i").forEach((i) => {
      i.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }], { duration: 420, easing: "cubic-bezier(.2,.9,.2,1.05)" });
    });
  }

  function paintFavs() {
    const set = new Set(favorites.list().map((f) => f.slug));
    document.querySelectorAll("[data-fav]").forEach((b) => b.setAttribute("aria-pressed", String(set.has(b.dataset.fav))));
  }

  function paintReminders() {
    document.querySelectorAll("[data-remind]").forEach((b) => {
      const on = reminders.has(Number(b.dataset.remind));
      b.setAttribute("aria-pressed", String(on));
      const label = b.querySelector("[data-remind-label]");
      if (label) label.textContent = on ? "Đã bật nhắc" : "Nhắc tôi";
    });
  }

  document.addEventListener("click", (e) => {
    const f = e.target.closest("[data-fav]");
    if (f) {
      e.preventDefault();
      if (!signedIn) { askSignIn("Đăng nhập để lưu mẫu"); return; }
      const slug = f.dataset.fav;
      if (favorites.has(slug)) favorites.remove(slug);
      else {
        favorites.add(slug);
        if (motion()) { f.classList.remove("pop"); void f.offsetWidth; f.classList.add("pop"); }
      }
      return;
    }
    const r = e.target.closest("[data-remind]");
    if (r) {
      if (!signedIn) { askSignIn("Đăng nhập để bật nhắc"); return; }
      reminders.toggle(Number(r.dataset.remind));
      return;
    }
    if (e.target.closest("[data-sign-out]")) { signOut(); return; }
    const b = e.target.closest("[data-buy]");
    if (b) { openBuy(b.dataset.buy, b); return; }
    const g = e.target.closest("[data-rail]");
    if (g) {
      const track = g.closest(".rail").querySelector(".rail-track");
      const dir = g.dataset.rail === "next" ? 1 : -1;
      track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: motion() ? "smooth" : "auto" });
    }
  });

  // ---------------------------------------------------------------- the clock (seconds tick)
  function tick() {
    document.querySelectorAll("[data-until]").forEach((el) => {
      const t = countdown(el.dataset.until);
      if (el.dataset.t !== t) { el.dataset.t = t; el.innerHTML = cells(t); }
    });
  }
  let clock = false;
  function startClock() {
    tick();
    if (clock) return;
    clock = true;
    setTimeout(() => { tick(); setInterval(tick, 1000); }, 1000 - (H.nowMs() % 1000));
  }

  // ---------------------------------------------------------------- reveal on scroll
  let io = null;
  function reveal(scope) {
    const els = (scope || document).querySelectorAll(".rv:not(.in)");
    if (!motion() || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    io = io || new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    els.forEach((el) => io.observe(el));
  }

  // ---------------------------------------------------------------- rails: arrow state on desktop
  function wireRails(scope) {
    (scope || document).querySelectorAll(".rail").forEach((rail) => {
      const track = rail.querySelector(".rail-track");
      const [prev, next] = rail.querySelectorAll("[data-rail]");
      if (!track || !prev || track.dataset.wired) return;
      track.dataset.wired = "1";
      const paint = () => {
        const max = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max;
      };
      track.addEventListener("scroll", paint, { passive: true });
      addEventListener("resize", paint);
      paint();
    });
  }

  // ---------------------------------------------------------------- toast (one at a time, never traps)
  let toastEl = null;
  let toastTimer = 0;
  function toast(text, action) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.append(toastEl);
    }
    clearTimeout(toastTimer);
    toastEl.innerHTML = `<span>${esc(text)}</span>` + (action ? `<button type="button" class="toast-act">${esc(action.label)}</button>` : "");
    if (action) toastEl.querySelector("button").onclick = () => { hide(); action.run(); };
    toastEl.classList.add("on");
    function hide() { toastEl.classList.remove("on"); }
    toastTimer = setTimeout(hide, 5000);
  }

  // Copy with a confirmation on the button; select the text when the clipboard is not reachable.
  async function copy(btn, value, target) {
    let ok = false;
    try { await navigator.clipboard.writeText(value); ok = true; } catch (e) {
      try {
        const t = document.createElement("textarea");
        t.value = value; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
        document.body.append(t); t.select(); ok = document.execCommand("copy"); t.remove();
      } catch (_) { ok = false; }
    }
    const label = btn.querySelector("[data-copy-label]");
    if (ok) {
      btn.classList.add("done");
      if (label) label.textContent = "Đã chép";
      setTimeout(() => { btn.classList.remove("done"); if (label) label.textContent = "Chép"; }, 2200);
    } else if (target) {
      const r = document.createRange(); r.selectNodeContents(target);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }
    return ok;
  }

  // ---------------------------------------------------------------- renderers
  function alt(s, color, kind) {
    const c = low1(colorName(color));
    if (isFixed(s)) return `${s.name}, ${low1(s.kind)} màu ${c}`;
    return kind === "look" ? `Người mặc ${s.name} màu ${c}` : `${s.name}, ${low1(s.kind)} màu ${c}`;
  }

  function src(s, color, kind) {
    if (isFixed(s)) return H.flat(s, color);
    const p = H.photos(s, color);
    return kind === "look" ? p.look : p.pack;
  }

  function img(s, color, kind, opts) {
    const o = Object.assign({ lazy: true, cls: "shot", high: false }, opts);
    const [w, h] = isFixed(s) ? [1040, 1300] : [1200, 1500];
    return `<img class="${o.cls}" src="${src(s, color, kind)}" width="${w}" height="${h}" alt="${esc(alt(s, color, kind))}"` +
      (o.lazy ? ' loading="lazy" decoding="async"' : "") + (o.high ? ' fetchpriority="high"' : "") + ">";
  }

  const favBtn = (s) =>
    `<button class="fav" type="button" data-fav="${s.slug}" aria-pressed="false" aria-label="Yêu thích ${esc(s.name)}">${icon("heart")}</button>`;
  const plate = '<span class="plate">ĐÃ HẾT</span>';

  // One line of stock facts: "Còn 2 · Hết S M", fire when low, "Đã đóng" once the issue closed.
  // A sold-out style has no line: the ĐÃ HẾT stamp on its picture says it once.
  function stockLine(s, cls, opts) {
    const c = cls ? " " + cls : "";
    if (opts && opts.sold && closedStyle(s) && !H.isSoldOut(s)) return `<p class="stock${c}"><span>${soldOf(s)}/${s.cut} đã bán</span></p>`;
    const gone = H.sizesGone(s);
    const goneTxt = gone.length ? `<span class="gone">Hết ${gone.join(" ")}</span>` : "";
    if (isFixed(s)) return `<p class="stock${c}">${goneTxt || "<span>Đủ size</span>"}</p>`;
    if (H.isSoldOut(s)) return "";
    if (!LIVE) return `<p class="stock${c}"><span>Đã đóng ${H.day(I5.closesAt)}</span></p>`;
    const n = H.left(s);
    if (H.isLow(s)) return `<p class="stock is-low${c}"><b>${icon("fire-fill")}Còn ${n}</b>${goneTxt}</p>`;
    return `<p class="stock${c}"><span>Còn ${n}</span>${goneTxt}</p>`;
  }

  // A style in the feed: full-bleed picture, then the name big and the facts small.
  function card(s, opts) {
    const o = Object.assign({ kind: "look", wide: false, flip: false, lazy: true, h: "h2" }, opts);
    const color = firstColor(s);
    const sold = soldOut(s);
    const extra = o.wide ? `<div class="card-extra">
        ${s.details ? `<ul class="details">${s.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
        <p class="card-colors">Màu <b>${s.colors.map(colorName).join(", ")}</b></p>
      </div>` : "";
    return `<article class="card rv${o.wide ? " wide" : ""}${o.flip ? " flip" : ""}${isFixed(s) ? " card-flat" : ""}${sold ? " is-sold" : ""}">
      <div class="card-media">${img(s, color, o.kind, { lazy: o.lazy })}${sold ? plate : ""}${favBtn(s)}</div>
      <div class="card-body">
        <${o.h} class="card-name disp"><a href="${url("product.html?m=" + s.slug)}">${esc(s.name)}</a></${o.h}>
        <p class="card-meta">${esc(s.kind)} · ${esc(s.material)}</p>
        <p class="card-price">${H.vnd(s.price)}</p>
        ${stockLine(s, "card-stock")}
        ${canBuy(s) ? `<button class="pill card-act" type="button" data-buy="${s.slug}" aria-label="Chọn size ${esc(s.name)}">Chọn size</button>` : ""}
        ${extra}
      </div>
    </article>`;
  }

  // A compact card for grids (listing, Cửa hàng tab, search results).
  function gcard(s, opts) {
    const o = Object.assign({ showLine: false, lazy: true, h: "h3", soldCount: false }, opts);
    const color = firstColor(s);
    const fixed = isFixed(s);
    const sold = soldOut(s);
    const meta = (o.showLine ? lineOf(s) + " · " : "") + (fixed ? s.material : s.kind);
    return `<article class="gcard rv${fixed ? " gcard-flat" : ""}${sold ? " is-sold" : ""}${closedStyle(s) ? " is-closed" : ""}">
      <a class="gcard-link" href="${url("product.html?m=" + s.slug)}">
        <div class="gcard-media">${img(s, color, "pack", { lazy: o.lazy })}${sold ? plate : ""}</div>
        <div class="gcard-body">
          <${o.h} class="gcard-name disp">${esc(s.name)}</${o.h}>
          <p class="gcard-meta">${esc(meta)}</p>
          <p class="gcard-price">${H.vnd(s.price)}</p>
          ${stockLine(s, "gcard-stock", { sold: o.soldCount })}
        </div>
      </a>
      ${favBtn(s)}
      ${canBuy(s) ? `<button class="gcard-add" type="button" data-buy="${s.slug}" aria-label="Chọn size ${esc(s.name)}">${icon("plus")}</button>` : ""}
    </article>`;
  }

  // A small card inside a rail.
  function mini(s) {
    const color = firstColor(s);
    const fixed = isFixed(s);
    const sold = soldOut(s);
    let st = "";
    if (!fixed && LIVE && H.isLow(s)) st = `<p class="stock is-low"><b>${icon("fire-fill")}Còn ${H.left(s)}</b></p>`;
    return `<a class="mini${fixed ? " mini-flat" : ""}${sold ? " is-sold" : ""}" href="${url("product.html?m=" + s.slug)}">
      <div class="mini-media">${img(s, color, "pack")}${sold ? plate : ""}</div>
      <p class="mini-name disp">${esc(s.name)}</p>
      <p class="mini-price">${H.vnd(s.price)}</p>${st}
    </a>`;
  }

  function rail(o) {
    return `<section class="rail rv${o.cls ? " " + o.cls : ""}" aria-labelledby="${o.id}">
      <div class="rail-head">
        <div class="rail-titles">
          <h2 class="rail-title disp" id="${o.id}">${esc(o.title)}${o.chip ? ` <span class="chip-tag">${esc(o.chip)}</span>` : ""}</h2>
          ${o.sub ? `<p class="rail-sub">${o.sub}</p>` : ""}
        </div>
        <div class="rail-side">
          ${o.more ? `<a class="link" href="${url(o.more)}">${esc(o.moreLabel || "Xem tất cả")}</a>` : ""}
          <div class="rail-nav">
            <button class="ib" type="button" data-rail="prev" aria-label="Xem mẫu trước">${icon("caret-left")}</button>
            <button class="ib" type="button" data-rail="next" aria-label="Xem mẫu sau">${icon("caret-right")}</button>
          </div>
        </div>
      </div>
      <div class="rail-track">${o.items.map(mini).join("")}</div>
    </section>`;
  }

  // Issue 06's silhouettes: the flat drawings on Surface 2. No price, no photo.
  function teasers() {
    return `<div class="teasers">${H.ISSUE_06.map((t) => `<figure class="teaser">
        <div class="teaser-plate"><img src="${t.flat}" width="1040" height="1300" loading="lazy" decoding="async" alt="${esc(t.name)}, ${esc(low1(t.kind))}"></div>
        <figcaption><p class="teaser-name disp">${esc(t.name)}</p><p class="teaser-kind">${esc(t.kind)}</p></figcaption>
      </figure>`).join("")}</div>`;
  }

  const remindBtn = (no, cls) =>
    `<button class="btn btn-blue remind${cls ? " " + cls : ""}" type="button" data-remind="${no}" aria-pressed="false">${icon("bell")}<span data-remind-label>Nhắc tôi</span></button>`;

  // The upcoming issue: date block, countdown, silhouettes, the announcement line, Nhắc tôi.
  // lead: it opens the feed (dark, like the open issue's story); otherwise a card between the styles.
  function soon(lead) {
    const n = NEXT;
    if (!n) return "";
    const p = parts(n.opensAt);
    const id = lead ? "lead-title" : "soon-title";
    return `<section class="soon rv${lead ? " soon-lead" : ""}" aria-labelledby="${id}">
      <div class="soon-head"><span class="chip-line">SẮP MỞ</span><h2 class="soon-no disp" id="${id}">${issueLabel(n.no)}</h2></div>
      <p class="date"><span class="dd">${p.dd}</span><span class="date-side"><span class="mm disp">Thg ${p.mm}</span><span class="dow disp">${p.dow} ${p.time}</span></span></p>
      <p class="soon-cd"><span class="cd-label">Mở sau</span><span class="cd-big" data-until="${n.opensAt}" role="timer">${cdHTML(n.opensAt)}</span></p>
      ${teasers()}
      <p class="soon-note">${esc(H.FACTS.teaser)}</p>
      ${remindBtn(n.no)}
    </section>`;
  }

  function closedRows(list) {
    return (list || OLDER).map((i) => {
      const t = H.totals(i.no);
      const names = i.no === 5 ? H.ISSUE_05.map((s) => s.name).join(", ") : H.PAST.filter((p) => p.issue === i.no).map((p) => p.name).join(", ");
      return `<a class="closed-row" href="${url("issue.html?no=" + i.no)}">
        <h3 class="closed-no disp">${issueLabel(i.no)}</h3>
        <p class="closed-sold">${t.sold}/${t.cut} đã bán</p>
        <p class="closed-dates">${H.day(i.opensAt)} - ${H.day(i.closesAt)}</p>
        <p class="closed-names">${names}</p>
      </a>`;
    }).join("");
  }

  // lite: the mark and Trợ giúp only, for screens that already carry the delivery and payment facts.
  // skip: help links the page itself already offers (e.g. "track.html" where the lookup form is on the page). An entry
  // with a hash ("help.html#doi-tra") drops that one link; without one ("help.html") every link to that page.
  const skipped = (href, skip) => (skip || []).some((x) => x === href || (!x.includes("#") && x === href.split(/[?#]/)[0]));
  function footer(lite, skip) {
    const S = H.SHIPPING;
    const row = (k, v) => `<li><span>${k}</span>${v ? `<b>${v}</b>` : ""}</li>`;
    return `<div class="foot-in">
      <div class="foot-brand">${MARK}<span class="word">HIVE</span></div>
      <nav aria-labelledby="foot-help"><h2 id="foot-help">Trợ giúp</h2>
        <ul class="foot-links">${H.HELP.filter((h) => !skipped(HELP_HREF[h] || "help.html", skip)).map((h) => `<li><a href="${url(HELP_HREF[h] || "help.html")}">${esc(WORDS[h] || h)}</a></li>`).join("")}</ul></nav>
      ${lite ? "" : `<div><h2>Giao hàng</h2><ul class="foot-facts">
        ${row(`${S.standard.label}, ${S.standard.days}`, H.vnd(S.standard.fee))}
        ${row(`${S.express.label}, ${S.express.days}`, H.vnd(S.express.fee))}
        ${row("Miễn phí giao từ", H.vnd(S.freeFrom))}
      </ul></div>
      <div><h2>Thanh toán</h2><ul class="foot-facts">
        ${S.payments.map((p) => row(p, p === "COD" ? "+" + H.vnd(S.codSurcharge) : "")).join("")}
      </ul></div>`}
    </div>`;
  }

  // Colour thumbnails and size pills, as native radio groups.
  function swatches(s, current, name, opts) {
    const o = Object.assign({ counts: true }, opts);
    return s.colors.map((c) => {
      const n = H.leftIn(s, c);
      const tag = isFixed(s) || !o.counts ? "" : `<span class="swatch-left">${n ? "Còn " + n : "Hết"}</span>`;
      return `<label class="swatch"><input type="radio" name="${name}" value="${c}"${c === current ? " checked" : ""}>
        <span class="swatch-img${isFixed(s) ? " flat" : ""}"><img src="${src(s, c, "pack")}" width="64" height="80" alt="" loading="lazy" decoding="async"></span>
        <span class="swatch-name">${colorName(c)}</span>${tag}</label>`;
    }).join("");
  }

  function sizeOpts(s, color, current, name, opts) {
    const o = Object.assign({ except: null }, opts);
    return H.sizes(s, color).map(({ size, n }) => {
      const out = n === 0;
      const note = out ? "<small>Hết</small>" : n <= 2 ? `<small>Còn ${n}</small>` : "";
      return `<label class="size"><input type="radio" name="${name}" value="${size}"${out ? " disabled" : ""}${size === current && !out ? " checked" : ""}><span class="sz">${size}</span>${note}</label>`;
    }).join("");
  }

  // Size của tôi: the account's sizes with the Hồ sơ edits made on this device; top for tops, bottom for trousers.
  // Signed out there is none. The size row's label reads "Size của tôi" while that size is the one chosen.
  const sizeLabel = (size, mine) => (size && size === mine ? "Size của tôi" : "Size");
  function mySize(s) {
    if (!signedIn || !s) return null;
    const saved = store("profile", null).get() || {};
    const sizes = Object.assign({}, H.ACCOUNT.sizes, saved.sizes || {});
    return (s.family === "PANTS" ? sizes.bottom : sizes.top) || null;
  }

  const hasSize = (s, color, size) => !!size && H.sizes(s, color).some((x) => x.size === size && x.n > 0);

  // ---------------------------------------------------------------- sheets (native <dialog>, springing up from the bottom)
  function makeSheet(id, labelId, cls) {
    const d = document.createElement("dialog");
    d.className = "sheet" + (cls ? " " + cls : "");
    d.id = id;
    d.setAttribute("aria-labelledby", labelId);
    document.body.append(d);
    d.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(d); });
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-close]")) closeSheet(d);
    });
    d.addEventListener("close", () => {
      d.classList.remove("closing");
      const o = d._back;
      d._back = null;
      if (o && o.isConnected) o.focus({ preventScroll: true });
      if (d._after) { const f = d._after; d._after = null; f(); }
    });
    return d;
  }

  function openSheet(d, back) {
    if (d.open) return;
    d._back = back || null;
    d.classList.remove("closing");
    // Locking the page removes a classic scrollbar; keep its width so nothing shifts sideways.
    if (!document.querySelector("dialog[open]")) root.style.setProperty("--sw", Math.max(0, innerWidth - root.clientWidth) + "px");
    d.showModal();
    const first = d.querySelector("[data-autofocus], input:checked");
    if (first) first.focus({ preventScroll: true });
  }

  function closeSheet(d, after) {
    if (!d.open) { if (after) after(); return; }
    if (after) d._after = after;
    if (d.classList.contains("closing")) return;
    if (!motion()) { d.close(); return; }
    d.classList.add("closing");
    setTimeout(() => d.close(), 210);
  }

  let sheets = null;
  function ensureSheets() {
    if (sheets) return sheets;
    sheets = {
      buy: makeSheet("sheet-buy", "buy-title"),
      added: makeSheet("sheet-added", "added-title"),
      guide: makeSheet("sheet-guide", "guide-title"),
      sort: makeSheet("sheet-sort", "sort-title"),
      pick: makeSheet("sheet-pick", "pick-title", "picker"),
    };
    wireBuy(sheets.buy);
    return sheets;
  }

  // Quick add: colour, size, add. Also opened by the product page's buy bar, and by the cart to swap a size
  // that has gone (preset.swap = { size, qty, done }).
  let buy = null;
  // Every quick add (feed cards, the Cửa hàng grid, search, Yêu thích, the product page's bar) starts on Size của tôi
  // when that size is left in the colour shown; the basket's swap keeps its own line's size.
  function openBuy(slug, opener, preset) {
    const s = H.find(slug);
    if (!s || !canBuy(s)) return;
    const p = preset || {};
    const color = p.color && s.colors.includes(p.color) && H.leftIn(s, p.color) > 0 ? p.color : firstColor(s);
    const mine = p.swap ? null : mySize(s);
    const size = hasSize(s, color, p.size) ? p.size : hasSize(s, color, mine) ? mine : null;
    buy = { s, color, size, mine, opener, onPick: p.onPick || null, swap: p.swap || null };
    const d = ensureSheets().buy;
    d.innerHTML = `<div class="sheet-panel">
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head">
        <img class="sh-thumb" data-buy-thumb src="${src(s, color, "pack")}" width="56" height="70" alt="">
        <div><h2 class="sh-name disp" id="buy-title">${esc(s.name)}</h2><p class="sh-sub">${esc(s.kind)} · <b>${H.vnd(s.price)}</b></p></div>
        <button class="sh-x" type="button" data-close aria-label="Đóng">${icon("x")}</button>
      </div>
      <div class="sh-block">
        <p class="sh-label">Màu <span data-buy-color>${colorName(color)}</span></p>
        <div class="swatches" role="radiogroup" aria-label="Màu">${swatches(s, color, "buy-color")}</div>
      </div>
      <div class="sh-block">
        <div class="sh-label"><span class="sh-label-t" data-buy-size-label>${sizeLabel(buy.size, buy.mine)}</span> <button class="link" type="button" data-guide>${icon("ruler")}Bảng size</button></div>
        <div class="sizes" role="radiogroup" aria-label="Size" data-buy-sizes>${sizeOpts(s, color, buy.size, "buy-size")}</div>
      </div>
      <button class="btn btn-blue sh-cta" type="button" data-add></button>
    </div>`;
    paintBuyCta();
    openSheet(d, opener);
  }

  function paintBuyCta() {
    const btn = sheets.buy.querySelector("[data-add]");
    const ok = hasSize(buy.s, buy.color, buy.size);
    btn.disabled = !ok;
    if (buy.swap) btn.innerHTML = ok ? `Đổi sang ${colorName(buy.color).toLowerCase()}, size ${buy.size}` : "Chọn size";
    else btn.innerHTML = ok ? `${icon("bag")}Thêm vào giỏ <span class="price">· ${H.vnd(buy.s.price)}</span>` : "Chọn size";
  }

  function wireBuy(d) {
    d.addEventListener("change", (e) => {
      const t = e.target;
      if (!buy) return;
      if (t.name === "buy-color") {
        buy.color = t.value;
        if (!hasSize(buy.s, buy.color, buy.size)) buy.size = hasSize(buy.s, buy.color, buy.mine) ? buy.mine : null;
        d.querySelector("[data-buy-color]").textContent = colorName(buy.color);
        d.querySelector("[data-buy-thumb]").src = src(buy.s, buy.color, "pack");
        d.querySelector("[data-buy-sizes]").innerHTML = sizeOpts(buy.s, buy.color, buy.size, "buy-size");
      }
      if (t.name === "buy-size") buy.size = t.value;
      d.querySelector("[data-buy-size-label]").textContent = sizeLabel(buy.size, buy.mine);
      paintBuyCta();
      if (buy.onPick) buy.onPick({ color: buy.color, size: buy.size });
    });
    d.addEventListener("click", (e) => {
      if (e.target.closest("[data-guide]")) { openGuide(buy.s, buy.size, e.target.closest("[data-guide]")); return; }
      if (e.target.closest("[data-add]") && hasSize(buy.s, buy.color, buy.size)) {
        const { s, color, size, opener, swap } = buy;
        if (swap) { closeSheet(d, () => swap.done(color, size)); return; }
        closeSheet(d, () => addToCart(s, color, size, opener));
      }
    });
  }

  function addToCart(s, color, size, back) {
    cart.add(s.slug, color, size);
    paintCart();
    bumpBag();
    const d = ensureSheets().added;
    d.innerHTML = `<div class="sheet-panel">
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head plain">
        <div class="ok-head">${icon("check-circle-fill")}<h2 class="sh-title" id="added-title">Đã thêm vào giỏ</h2></div>
        <button class="sh-x" type="button" data-close aria-label="Đóng">${icon("x")}</button>
      </div>
      <div class="added">
        <img src="${src(s, color, "pack")}" width="72" height="90" alt="${esc(alt(s, color, "pack"))}">
        <div><p class="added-name disp">${esc(s.name)}</p><p class="added-meta">${colorName(color)} · Size ${size}</p><p class="added-price">${H.vnd(s.price)}</p></div>
      </div>
      <div class="stack">
        <a class="btn btn-blue" href="${url("cart.html")}" data-autofocus>Xem giỏ</a>
        <button class="btn btn-line" type="button" data-close>Tiếp tục xem</button>
      </div>
    </div>`;
    d.classList.toggle("at-bag", desk.matches);
    openSheet(d, back);
  }

  // Tops by fit (HIVE.sizeChart); trousers by length (HIVE.pantsChart: long, or shorts with their own lengths).
  function openGuide(s, size, back) {
    const d = ensureSheets().guide;
    const pants = s.family === "PANTS";
    const num = (n) => (typeof n === "number" ? n.toLocaleString("vi-VN") : n);
    const cols = pants
      ? [["Vòng eo", "waist"], ["Vòng mông", "hip"], ["Dài quần", "length"], ["Ngang đùi", "thigh"], ["Hợp chiều cao", "height"]]
      : [["Ngang ngực", "chest"], ["Dài áo", "length"], ["Ngang vai", "shoulder"], ["Hợp chiều cao", "height"]];
    const rows = pants ? H.pantsChart(s) : H.sizeChart(s.fit);
    const kind = pants ? (H.isShorts(s) ? "Quần short" : "Quần dài") : "Form " + H.FITS[s.fit];
    d.innerHTML = `<div class="sheet-panel">
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head plain">
        <div><h2 class="sh-title" id="guide-title">Bảng size</h2><p class="sh-sub">${kind} · Số đo mô phỏng, cm</p></div>
        <button class="sh-x" type="button" data-close aria-label="Đóng">${icon("x")}</button>
      </div>
      <table class="fit-table${pants ? " is-pants" : ""}">
        <thead><tr><th scope="col">Size</th>${cols.map(([t]) => `<th scope="col">${t}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((r) => `<tr${r.size === size ? ' class="on"' : ""}><td>${r.size}</td>${cols.map(([, k]) => `<td>${num(r[k])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      <p class="fit-note">${pants ? "Sai số ±1 cm." : "Đo phẳng, sai số ±1 cm."}</p>
    </div>`;
    openSheet(d, back);
  }

  // A searchable list in a sheet (tỉnh / thành, phường / xã): items [{ value, label }], onPick(item).
  function openPicker(o, opener) {
    const d = ensureSheets().pick;
    const items = o.items;
    d.innerHTML = `<div class="sheet-panel">
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head plain">
        <div><h2 class="sh-title" id="pick-title">${esc(o.title)}</h2>${o.sub ? `<p class="sh-sub">${esc(o.sub)}</p>` : ""}</div>
        <button class="sh-x" type="button" data-close aria-label="Đóng">${icon("x")}</button>
      </div>
      <div class="pick-search">${icon("magnifying-glass")}<input type="search"${fine.matches ? " data-autofocus" : ""} autocomplete="off" enterkeyhint="search"
        placeholder="${esc(o.placeholder)}" aria-label="${esc(o.placeholder)}" aria-controls="pick-list"></div>
      <ul class="pick-list" id="pick-list" role="listbox" aria-labelledby="pick-title"></ul>
      <p class="pick-empty" hidden>Không có kết quả</p>
    </div>`;
    const input = d.querySelector("input");
    const list = d.querySelector(".pick-list");
    const empty = d.querySelector(".pick-empty");
    const paint = () => {
      const q = H.fold(input.value);
      const hits = q ? items.filter((it) => H.fold(it.label).includes(q)) : items;
      list.innerHTML = hits.map((it) => `<li class="pick-opt" role="option" tabindex="-1" data-value="${esc(it.value)}" aria-selected="${it.value === o.value}">
        <span>${esc(it.label)}</span>${icon("check")}</li>`).join("");
      empty.hidden = hits.length > 0;
    };
    paint();
    input.addEventListener("input", paint);
    const pick = (li) => {
      const it = items.find((x) => x.value === li.dataset.value);
      closeSheet(d, () => o.onPick(it));
    };
    list.onclick = (e) => { const li = e.target.closest("[role=option]"); if (li) pick(li); };
    d.onkeydown = (e) => {
      const opts = [...list.querySelectorAll("[role=option]")];
      const i = opts.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); (opts[i + 1] || opts[0] || input).focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); (i <= 0 ? input : opts[i - 1]).focus(); }
      else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); pick(opts[i]); }
      else if (e.key === "Enter" && document.activeElement === input && opts.length === 1) { e.preventDefault(); pick(opts[0]); }
    };
    openSheet(d, opener);
    // Touch: no keyboard over half the list on open; focus rests on the current choice (or the first row).
    const cur = list.querySelector('[aria-selected="true"]');
    if (cur) cur.scrollIntoView({ block: "center" });
    if (!fine.matches) (cur || list.querySelector("[role=option]") || input).focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- the shop: line switch, type chips, sort, grid
  // While Số 05 is open it leads; once it has closed, the fixed line is what sells and Số 05 stays viewable, closed.
  const LINES = { all: "Tất cả", "05": issueLabel(5), fixed: "Cố định" };
  const SORTS = { new: "Mới nhất", asc: "Giá tăng dần", desc: "Giá giảm dần" };
  const itemsOf = (line) => (line === "05" ? H.ISSUE_05 : line === "fixed" ? H.FIXED : H.ISSUE_05.concat(H.FIXED));
  const shopLines = (withAll) => (LIVE ? (withAll ? ["all", "05", "fixed"] : ["05", "fixed"]) : ["fixed", "05"]);

  function closedStatus() {
    const t = H.totals(5);
    return `<p class="line-status"><span class="chip-tag">Đã đóng</span><span>${H.day(I5.opensAt)} - ${H.day(I5.closesAt)}</span><b>${t.sold}/${t.cut} đã bán</b></p>`;
  }

  function shop(el, options) {
    const o = Object.assign({ lines: shopLines(false), sort: false, title: "", h: "h3", state: {}, onChange: null }, options);
    const st = Object.assign({ line: o.lines[0], fam: "ALL", sort: "new" }, o.state);
    if (!o.lines.includes(st.line)) st.line = o.lines[0];
    if (st.fam !== "ALL" && !H.FAMILIES[st.fam]) st.fam = "ALL";
    if (!SORTS[st.sort]) st.sort = "new";
    const fams = [["ALL", "Mọi loại"]].concat(Object.entries(H.FAMILIES));

    el.innerHTML = `<div class="shop-top">
        ${o.title ? `<h1 class="page-title disp">${esc(o.title)}</h1>` : ""}
        <div class="seg" role="group" aria-label="Dòng hàng">${o.lines.map((l) => `<button class="seg-btn" type="button" data-line="${l}" aria-pressed="false">${LINES[l]}</button>`).join("")}</div>
      </div>
      <div class="chips" role="group" aria-label="Loại">${fams.map(([k, v]) => `<button class="chip" type="button" data-fam="${k}" aria-pressed="false">${esc(v)}</button>`).join("")}</div>
      <div data-status></div>
      ${o.sort ? `<div class="shop-bar"><p class="count" data-count aria-live="polite"></p>
        <button class="chip sort-btn" type="button" data-sort-open aria-haspopup="dialog">${icon("sliders-horizontal")}<span data-sort-label></span>${icon("caret-down")}</button></div>` : ""}
      <div class="grid" data-grid></div>`;

    const grid = el.querySelector("[data-grid]");

    function paint() {
      el.querySelectorAll("[data-line]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.line === st.line)));
      el.querySelectorAll("[data-fam]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fam === st.fam)));
      el.querySelector("[data-status]").innerHTML = st.line === "05" && !LIVE ? closedStatus() : "";
      let list = itemsOf(st.line).filter((s) => st.fam === "ALL" || s.family === st.fam);
      if (st.sort === "asc") list = list.slice().sort((a, b) => a.price - b.price);
      if (st.sort === "desc") list = list.slice().sort((a, b) => b.price - a.price);
      const count = el.querySelector("[data-count]");
      if (count) count.textContent = `${list.length} mẫu`;
      const sl = el.querySelector("[data-sort-label]");
      if (sl) { sl.textContent = SORTS[st.sort]; sl.parentElement.setAttribute("aria-label", "Sắp xếp: " + SORTS[st.sort]); }
      if (list.length) {
        grid.innerHTML = list.map((s, i) => gcard(s, { showLine: st.line === "all", lazy: i > 3, h: o.h, soldCount: st.line === "05" && !LIVE })).join("");
      } else {
        const fam = H.FAMILIES[st.fam];
        const other = o.lines.find((l) => l !== st.line && l !== "all" && itemsOf(l).some((s) => s.family === st.fam));
        grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><p>${LINES[st.line]} không có ${esc(fam)}</p>` +
          (other ? `<button class="btn btn-line" type="button" data-line-go="${other}">Xem ${esc(fam)} ở ${LINES[other]}</button>` : "") + "</div>";
      }
      paintFavs();
      reveal(grid);
      if (o.onChange) o.onChange(Object.assign({}, st));
    }

    el.addEventListener("click", (e) => {
      const l = e.target.closest("[data-line]");
      if (l) { st.line = l.dataset.line; paint(); return; }
      const f = e.target.closest("[data-fam]");
      if (f) { st.fam = f.dataset.fam; paint(); return; }
      const g = e.target.closest("[data-line-go]");
      if (g) { st.line = g.dataset.lineGo; paint(); return; }
      const so = e.target.closest("[data-sort-open]");
      if (so) openSort(so);
    });

    function openSort(opener) {
      const d = ensureSheets().sort;
      d.innerHTML = `<div class="sheet-panel">
        <div class="grab" aria-hidden="true"></div>
        <div class="sh-head plain"><h2 class="sh-title" id="sort-title">Sắp xếp</h2>
          <button class="sh-x" type="button" data-close aria-label="Đóng">${icon("x")}</button></div>
        <div class="sort-list" role="radiogroup" aria-labelledby="sort-title">${Object.entries(SORTS).map(([k, v]) =>
          `<button class="sort-opt" type="button" role="radio" aria-checked="${k === st.sort}" data-sort="${k}"${k === st.sort ? " data-autofocus" : ""}>${v}${icon("check")}</button>`).join("")}</div>
      </div>`;
      d.onclick = (e) => {
        const b = e.target.closest("[data-sort]");
        if (!b) return;
        st.sort = b.dataset.sort;
        d.querySelectorAll("[data-sort]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
        closeSheet(d);
        paint();
      };
      d.onkeydown = (e) => {
        if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
        const opts = [...d.querySelectorAll("[data-sort]")];
        const i = opts.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        opts[(i + (e.key === "ArrowDown" ? 1 : opts.length - 1)) % opts.length].focus();
      };
      if (desk.matches) {
        const r = opener.getBoundingClientRect();
        d.classList.add("drop");
        d.style.top = Math.round(r.bottom + 8) + "px";
        d.style.left = Math.round(Math.max(16, r.right - 280)) + "px";
      } else {
        d.classList.remove("drop");
        d.style.top = d.style.left = "";
      }
      openSheet(d, opener);
    }

    paint();
    return { state: st, paint };
  }

  // ---------------------------------------------------------------- boot
  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    ensureSheets();
    paintCart();
    paintFavs();
    paintReminders();
    startClock();
    reveal();
    wireRails();
    paintBell();
    const foot = document.querySelector("[data-foot]");
    if (foot) foot.innerHTML = footer(foot.dataset.foot === "lite", (foot.dataset.footSkip || "").split(" ").filter(Boolean));
    addEventListener("storage", () => { paintCart(); paintFavs(); paintReminders(); paintBell(); change("storage"); });
  }

  renderChrome();

  window.FEED = {
    H, esc, icon, low1, colorName, isFixed, soldOut, closedStyle, canBuy, soldOf, firstColor, lineOf, issueLabel,
    parts, countdown, cdHTML, cells, url, store, cart,
    signedIn, signIn, signOut, signInHref, withoutAuth, addParam, askSignIn, favorites, reminders, inbox, paintBell,
    MODE, I5, LIVE, NEXT, CLOSED, OLDER, MARK, desk, motion, PAGE, mySize, sizeLabel, okTitle,
    img, src, alt, stockLine, card, gcard, mini, rail, soon, teasers, remindBtn, closedRows, footer, closedStatus,
    swatches, sizeOpts, hasSize, shopLines,
    openBuy, openGuide, openPicker, addToCart, openSheet, closeSheet, makeSheet, toast, copy,
    shop, reveal, wireRails, paintFavs, paintReminders, paintCart, bumpBag, tick, boot,
  };
})();
