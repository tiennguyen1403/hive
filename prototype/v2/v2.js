/* v2.js — the mock's runtime. Draws the shared chrome (nav, footer, admin
   sidebar), turns <svg data-i> placeholders into Iconsax glyphs, ticks the
   countdowns from a FROZEN clock, and gives the proposed interactions just
   enough behaviour to be judged: sheets, tabs, toggles, the sticky buy bar,
   and the admin's simulated actions with their toast.

   The clock is frozen at 20/09/2026 18:50 (+07:00), the day the fixture
   data describes, and advances from page load. Every figure on every screen
   was derived from the real fixtures through vitest (see index.html). */
(function () {
  "use strict";

  // ── frozen clock ──────────────────────────────────────────────────────
  var FROZEN = Date.parse("2026-09-20T18:50:00+07:00");
  var loadedAt = Date.now();
  function now() { return FROZEN + (Date.now() - loadedAt); }
  window.V2NOW = now;

  var DROP5_CLOSES = "2026-09-25T20:00:00+07:00";
  var DROP6_OPENS = "2026-10-02T20:00:00+07:00";

  // ── icons ─────────────────────────────────────────────────────────────
  var I = window.ICONS || { LINEAR: {}, BULK: {}, INK: {}, INK_DUO: {} };
  function ink(name, bulk) {
    var t = (bulk ? I.INK_DUO : I.INK)[name] || [2, 20];
    return "--il:" + (t[0] / 24).toFixed(4) + ";--ir:" + ((24 - t[0] - t[1]) / 24).toFixed(4);
  }
  function iconHtml(name, opts) {
    opts = opts || {};
    var bulk = !!opts.bulk;
    var cls = "ic" + (bulk ? " duo" : "") + (opts.cls ? " " + opts.cls : "");
    var body = bulk ? I.BULK[name] : I.LINEAR[name];
    if (!body) body = I.LINEAR.info || "";
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="' +
      ink(name, bulk) + '">' + body + "</svg>";
  }
  function tickHtml(cls) {
    return '<svg class="' + (cls || "") + '" viewBox="7.75 9.17 8.5 5.66" fill="none" aria-hidden="true">' +
      (I.LINEAR.check || "") + "</svg>";
  }
  window.iconHtml = iconHtml;
  function hydrateIcons(root) {
    (root || document).querySelectorAll("svg[data-i]").forEach(function (el) {
      var name = el.getAttribute("data-i");
      var bulk = el.hasAttribute("data-bulk");
      if (name === "tick") {
        el.setAttribute("viewBox", "7.75 9.17 8.5 5.66");
        el.innerHTML = I.LINEAR.check || "";
      } else {
        el.setAttribute("viewBox", "0 0 24 24");
        el.innerHTML = (bulk ? I.BULK[name] : I.LINEAR[name]) || I.LINEAR.info || "";
        el.style.cssText += ";" + ink(name, bulk);
        if (bulk) el.classList.add("duo");
      }
      el.setAttribute("fill", "none");
      el.setAttribute("aria-hidden", "true");
      if (!el.classList.contains("ic") && !el.hasAttribute("data-raw")) el.classList.add("ic");
    });
  }

  // ── time helpers (mirrors lib/drop.ts + lib/datetime.ts) ──────────────
  function parts(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60, total: ms };
  }
  function label(verb, until) {
    var p = parts(Date.parse(until) - now());
    if (p.total <= 0) return verb === "mở" ? "đang mở" : "đã đóng";
    if (p.d > 0) return verb + " sau " + p.d + " ngày " + p.h + " giờ";
    if (p.h > 0) return verb + " sau " + p.h + " giờ " + p.m + " phút";
    return verb + " sau " + p.m + " phút";
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function tickCountdowns() {
    document.querySelectorAll("[data-until]").forEach(function (el) {
      var until = el.getAttribute("data-until");
      var kind = el.getAttribute("data-fmt") || "label";
      if (kind === "label") {
        el.textContent = label(el.getAttribute("data-verb") || "đóng", until);
      } else if (kind === "boxes") {
        var p = parts(Date.parse(until) - now());
        el.querySelectorAll("[data-u]").forEach(function (u) {
          var k = u.getAttribute("data-u");
          u.textContent = pad2(k === "d" ? p.d : k === "h" ? p.h : k === "m" ? p.m : p.s);
        });
      }
    });
  }

  // ── chrome: shop nav ──────────────────────────────────────────────────
  function navHtml(o) {
    var cart = o.cart ? parseInt(o.cart, 10) : 0;
    var wish = o.wish ? parseInt(o.wish, 10) : 0;
    var state = o.drop || "open"; // open | soon
    var pill = state === "soon"
      ? '<a class="dpill soon" href="home-states.html"><i></i><b>Đợt 06</b><span class="cd" data-until="' + DROP6_OPENS + '" data-verb="mở">mở sau 12 ngày 1 giờ</span></a>'
      : '<a class="dpill" href="products.html"><i></i><b>Đợt 05</b><span class="cd" data-until="' + DROP5_CLOSES + '" data-verb="đóng">đóng sau 5 ngày 1 giờ</span></a>';
    var fam = [["TEE", "Áo thun"], ["HOODIE", "Hoodie"], ["JACKET", "Khoác"], ["SHIRT", "Sơ mi"], ["PANTS", "Quần"]];
    var links = '<nav class="links" aria-label="Danh mục">' +
      '<a class="dropln' + (o.active === "products" ? " on" : "") + '" href="products.html"><i></i>Đợt 05</a>' +
      fam.map(function (f) { return '<a href="products.html?family=' + f[0] + '"' + (o.active === f[0] ? ' class="on"' : "") + ">" + f[1] + "</a>"; }).join("") +
      "</nav>";
    return '<a class="wm nm" href="home.html">BRAND</a>' + links + pill +
      '<div class="icons">' +
      '<a class="ib" href="search.html" aria-label="Tìm kiếm">' + iconHtml("search") + "</a>" +
      '<a class="ib" href="account.html#wishlist" aria-label="Yêu thích' + (wish ? ", " + wish + " mẫu" : "") + '">' + iconHtml("heart", { bulk: wish > 0 }) + (wish ? "<b>" + wish + "</b>" : "") + "</a>" +
      '<a class="ib" href="account.html" aria-label="Tài khoản">' + iconHtml("user", { bulk: o.signed !== "no" }) + "</a>" +
      '<a class="ib" href="cart.html" aria-label="Giỏ hàng' + (cart ? ", " + cart + " món" : ", đang trống") + '">' + iconHtml("bag", { bulk: cart > 0 }) + (cart ? "<b>" + cart + "</b>" : "") + "</a>" +
      "</div>";
  }

  // ── chrome: shop footer ───────────────────────────────────────────────
  function footerHtml() {
    return '<div class="cols">' +
      '<div><h4>Lịch đợt</h4><ul class="cal">' +
      '<li><a href="products.html"><span><b>Đợt 05 · đang mở</b><span class="st on" data-until="' + DROP5_CLOSES + '" data-verb="đóng">đóng sau 5 ngày 1 giờ</span></span></a></li>' +
      '<li><a href="home-states.html"><span><b>Đợt 06 · sắp mở</b><span class="st">20:00 ngày 02/10 · 2 mẫu hé lộ</span></span></a></li>' +
      '<li><a href="home-states.html#closed"><span><b>Đợt 04 · đã đóng</b><span class="st">19/06 · xem lại 6 mẫu</span></span></a></li>' +
      "</ul></div>" +
      '<div><h4>Hỗ trợ</h4><ul>' +
      '<li><a href="#">Câu hỏi thường gặp</a></li><li><a href="#">Đổi trả · 7 ngày</a></li>' +
      '<li><a href="account-orders.html">Theo dõi đơn</a></li><li><a href="product.html#size">Bảng size</a></li>' +
      '<li><a href="#">Liên hệ</a></li></ul></div>' +
      '<div><h4>Giao & thanh toán</h4><ul>' +
      '<li><span>Giao 2–4 ngày · 30.000₫</span></li><li><span>Miễn phí từ 1.000.000₫</span></li>' +
      '<li><span>Nhanh nội thành TP.HCM · 24 giờ</span></li><li><span>Chuyển khoản · COD · Thẻ</span></li></ul></div>' +
      '<div><h4>Về BRAND</h4><ul><li><a href="#">Giới thiệu · cách chúng tôi bán</a></li></ul>' +
      '<div class="needwrite" style="margin-top:8px"><span class="lb">' + iconHtml("edit") + 'CHỜ NGƯỜI VIẾT</span>' +
      '<p><b>Kênh liên hệ & mạng xã hội.</b> Email, Instagram, giờ làm việc — chưa chốt nên chỗ này để trống.</p></div></div>' +
      "</div>" +
      '<div class="base"><span class="wm nm">BRAND</span><span>Streetwear unisex · bán theo đợt, cắt một lần</span>' +
      '<span style="margin-left:auto">Tên pháp nhân · MST — chờ chốt</span></div>';
  }

  // ── chrome: admin sidebar ─────────────────────────────────────────────
  function adminNavHtml(active) {
    var L = [["dashboard", "admin-dashboard.html", "Tổng quan", "chart"], ["drops", "admin-drops.html", "Đợt bán", "calendar"],
      ["products", "#", "Sản phẩm", "box"], ["orders", "admin-orders.html", "Đơn hàng", "bag"],
      ["customers", "#", "Khách hàng", "people"], ["promotions", "admin-promotions.html", "Khuyến mãi", "tag"]];
    var changes = parseInt(localStorage.getItem("v2.sim.count") || "0", 10);
    return '<span class="wm nm">BRAND</span>' + L.map(function (l) {
      var on = l[0] === active;
      return '<a href="' + l[1] + '"' + (on ? ' class="on" aria-current="page"' : "") + ">" + iconHtml(l[3], { bulk: on, cls: "sm" }) + l[2] + "</a>";
    }).join("") +
      '<div class="simbar"><span class="badge warn"><i></i>chế độ mô phỏng</span>' +
      'Mọi thao tác lưu trên trình duyệt này, không có máy chủ. <b data-simcount>' + changes + '</b> thay đổi trong phiên.<br>' +
      '<button type="button" class="lnk" data-simreset>Đặt lại dữ liệu mẫu</button></div>';
  }

  // ── toast + simulated actions ─────────────────────────────────────────
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = iconHtml("confirm") + "<span>" + msg + "</span>";
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }
  window.toast = toast;
  function bumpSim() {
    var n = parseInt(localStorage.getItem("v2.sim.count") || "0", 10) + 1;
    localStorage.setItem("v2.sim.count", String(n));
    document.querySelectorAll("[data-simcount]").forEach(function (el) { el.textContent = String(n); });
  }

  // ── layers: sheets & modals ───────────────────────────────────────────
  function openLayer(sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    el.hidden = false;
    document.body.style.overflow = "hidden";
    var panel = el.querySelector(".sheetbody, .modal");
    if (panel) { panel.setAttribute("tabindex", "-1"); panel.focus(); }
  }
  function closeLayer(el) {
    el.hidden = true;
    if (!document.querySelector(".sheetwrap:not([hidden]), .modalwrap:not([hidden])")) document.body.style.overflow = "";
  }
  window.openLayer = openLayer;

  // ── wire-up ───────────────────────────────────────────────────────────
  function ready() {
    // pointer-vs-keyboard, same as app/layout.tsx
    var de = document.documentElement;
    de.setAttribute("data-pointer", "");
    addEventListener("pointerdown", function () { de.setAttribute("data-pointer", ""); }, true);
    addEventListener("keydown", function (e) { if (e.key === "Tab") de.removeAttribute("data-pointer"); }, true);

    var nav = document.querySelector("[data-nav]");
    if (nav) nav.innerHTML = navHtml({ active: nav.getAttribute("data-active"), cart: nav.getAttribute("data-cart"), wish: nav.getAttribute("data-wish"), drop: nav.getAttribute("data-drop"), signed: nav.getAttribute("data-signed") });
    var foot = document.querySelector("[data-footer]");
    if (foot) foot.innerHTML = footerHtml();
    var anav = document.querySelector("[data-adminnav]");
    if (anav) anav.innerHTML = adminNavHtml(anav.getAttribute("data-active"));

    hydrateIcons(document);
    tickCountdowns();
    setInterval(tickCountdowns, 1000);

    // layers
    document.addEventListener("click", function (e) {
      var opener = e.target.closest("[data-open]");
      if (opener) { e.preventDefault(); openLayer(opener.getAttribute("data-open")); return; }
      var closer = e.target.closest("[data-close], .scrim");
      if (closer) {
        var wrap = closer.closest(".sheetwrap, .modalwrap");
        if (wrap) { e.preventDefault(); closeLayer(wrap); return; }
      }
      // tabs (visual only)
      var tab = e.target.closest("[role=tablist] > *, .stabs > button, .seg > button");
      if (tab && !tab.hasAttribute("data-nolink")) {
        var group = tab.parentElement;
        group.querySelectorAll(".on, [aria-selected=true]").forEach(function (t) { t.classList.remove("on"); t.setAttribute("aria-selected", "false"); });
        tab.classList.add("on"); tab.setAttribute("aria-selected", "true");
        if (tab.tagName === "A" && tab.getAttribute("href") === "#") e.preventDefault();
      }
      // toggles
      var sw = e.target.closest(".switch");
      if (sw) { sw.setAttribute("aria-checked", sw.getAttribute("aria-checked") === "true" ? "false" : "true"); toast("Đã lưu trên thiết bị này"); }
      // chips & swatches & size cells that toggle
      var chip = e.target.closest("[data-toggle]");
      if (chip) { e.preventDefault(); chip.classList.toggle("on"); if (chip.hasAttribute("aria-pressed")) chip.setAttribute("aria-pressed", chip.classList.contains("on") ? "true" : "false"); }
      var radio = e.target.closest("[role=radio]");
      if (radio) {
        var g = radio.closest("[role=radiogroup]") || radio.parentElement;
        g.querySelectorAll("[role=radio]").forEach(function (r) { r.setAttribute("aria-checked", "false"); var d = r.querySelector(".radio"); if (d) d.classList.remove("on"); });
        radio.setAttribute("aria-checked", "true"); var dd = radio.querySelector(".radio"); if (dd) dd.classList.add("on");
      }
      var cb = e.target.closest("[role=checkbox]");
      if (cb && !cb.classList.contains("switch")) {
        var on = cb.getAttribute("aria-checked") !== "true";
        cb.setAttribute("aria-checked", on ? "true" : "false");
        var box = cb.querySelector(".box"); if (box) box.classList.toggle("on", on);
        var tr = cb.closest("tr"); if (tr) tr.classList.toggle("on", on);
        if (cb.hasAttribute("data-bulk")) refreshBulk();
      }
      // simulated actions, and plain show/hide switches (a form that
      // appears in place of a strip, an address form behind a row)
      var sim = e.target.closest("[data-sim], [data-show], [data-hide]");
      if (sim) {
        e.preventDefault();
        if (sim.hasAttribute("data-sim")) {
          bumpSim();
          toast(sim.getAttribute("data-sim") || "Đã ghi nhận · lưu trên trình duyệt này");
          var wrap2 = sim.closest(".modalwrap, .sheetwrap");
          if (wrap2) closeLayer(wrap2);
        }
        var target = sim.getAttribute("data-done");
        if (target) { var row = document.querySelector(target); if (row) row.classList.add("done"); }
        var show = sim.getAttribute("data-show");
        if (show) document.querySelectorAll(show).forEach(function (el) { el.hidden = false; });
        var hide = sim.getAttribute("data-hide");
        if (hide) document.querySelectorAll(hide).forEach(function (el) { el.hidden = true; });
      }
      var reset = e.target.closest("[data-simreset]");
      if (reset) { localStorage.setItem("v2.sim.count", "0"); document.querySelectorAll("[data-simcount]").forEach(function (el) { el.textContent = "0"; }); toast("Đã đặt lại về dữ liệu mẫu"); }
      // menus anchored to a button
      var mb = e.target.closest("[data-menu]");
      if (mb) {
        e.preventDefault();
        var m = document.querySelector(mb.getAttribute("data-menu"));
        if (!m) return;
        var openNow = !m.hidden;
        document.querySelectorAll(".menu").forEach(function (x) { x.hidden = true; });
        document.querySelectorAll("[data-menu]").forEach(function (x) { x.setAttribute("aria-expanded", "false"); });
        if (openNow) return;
        var r = mb.getBoundingClientRect();
        m.hidden = false;
        m.style.top = (r.bottom + 4) + "px";
        var left = r.left;
        if (left + m.offsetWidth > window.innerWidth - 12) left = r.right - m.offsetWidth;
        m.style.left = left + "px";
        mb.setAttribute("aria-expanded", "true");
        return;
      }
      if (!e.target.closest(".menu")) {
        document.querySelectorAll(".menu:not([hidden])").forEach(function (x) { x.hidden = true; });
        document.querySelectorAll("[data-menu]").forEach(function (x) { x.setAttribute("aria-expanded", "false"); });
      }
      var copy = e.target.closest("[data-copy]");
      if (copy) { e.preventDefault(); try { navigator.clipboard.writeText(copy.getAttribute("data-copy")); } catch (_) {} toast("Đã chép " + copy.getAttribute("data-copy")); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var open = document.querySelector(".sheetwrap:not([hidden]), .modalwrap:not([hidden])");
      if (open) closeLayer(open);
      document.querySelectorAll(".menu:not([hidden])").forEach(function (x) { x.hidden = true; });
    });
    window.addEventListener("scroll", function () {
      document.querySelectorAll(".menu:not([hidden])").forEach(function (x) { x.hidden = true; });
    }, { passive: true });

    // bulk bar in tables
    function refreshBulk() {
      document.querySelectorAll(".dt").forEach(function (dt) {
        var n = dt.querySelectorAll("tbody [role=checkbox][aria-checked=true]").length;
        var tools = dt.querySelector(".bar.tools"), bulk = dt.querySelector(".bar.bulk");
        if (!tools || !bulk) return;
        tools.hidden = n > 0; bulk.hidden = n === 0;
        var c = bulk.querySelector(".cnt"); if (c) c.textContent = n + " " + (bulk.getAttribute("data-unit") || "dòng") + " đã chọn";
        var head = dt.querySelector("thead [role=checkbox]");
        if (head) { var all = dt.querySelectorAll("tbody [role=checkbox]").length; head.setAttribute("aria-checked", n === 0 ? "false" : n === all ? "true" : "mixed"); }
      });
    }
    document.querySelectorAll("thead [role=checkbox]").forEach(function (h) {
      h.addEventListener("click", function () {
        var dt = h.closest(".dt"); var on = h.getAttribute("aria-checked") === "true";
        dt.querySelectorAll("tbody [role=checkbox]").forEach(function (c) { c.setAttribute("aria-checked", on ? "true" : "false"); var tr = c.closest("tr"); if (tr) tr.classList.toggle("on", on); });
        refreshBulk();
      });
    });

    // sticky buy bar: shown only once the real button has scrolled away
    // A scroll listener, not IntersectionObserver: the observer only fires
    // when the button crosses the viewport edge, and a fast flick can carry
    // it from "below" to "above" without ever crossing.
    var cta = document.getElementById("buy-cta"), bar = document.querySelector(".buybar");
    if (cta && bar) {
      var ticking = false;
      var check = function () {
        ticking = false;
        var gone = cta.getBoundingClientRect().bottom < 0;
        bar.classList.toggle("show", gone);
        bar.setAttribute("aria-hidden", gone ? "false" : "true");
      };
      window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
      check();
    }
    // details that open on wide screens
    if (matchMedia("(min-width:900px)").matches) document.querySelectorAll("details.autoopen").forEach(function (d) { d.open = true; });
    // hash-open a layer (index links like product.html#size)
    if (location.hash === "#size") openLayer("#sizeguide");
    if (location.hash === "#filter") openLayer("#filtersheet");
    if (location.hash === "#sizesheet") openLayer("#sizesheet");
    // family query on the listing marks the tab
    var fam = new URLSearchParams(location.search).get("family");
    if (fam) { var t = document.querySelector('[data-fam="' + fam + '"]'); if (t) { t.parentElement.querySelectorAll(".on").forEach(function (x) { x.classList.remove("on"); }); t.classList.add("on"); } }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
