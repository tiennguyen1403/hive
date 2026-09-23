/* v3.js — the v3 mock's runtime.

   Draws the shared chrome (nav, footer), hydrates Iconsax placeholders, ticks
   the countdowns from the same FROZEN clock as v2 (18:50 · 20/09/2026, so
   every figure derived from the fixtures for v2 still holds), applies the
   direction and the lexicon chosen on the review board, and gives the
   proposed interactions just enough behaviour to be judged: the size table,
   the size sheet, the sticky buy bar, the gallery counter, switches, toasts.

   Direction, spot colour and lexicon live in localStorage so the board, its
   iframes and any full-screen tab agree; a `storage` event re-applies them
   live. Nothing here is product code. */
(function () {
  "use strict";

  // ── settings shared with the board ────────────────────────────────────
  var LEX = {
    so:    { t: "Số",    tl: "số",    tu: "SỐ",    cal: "Lịch ra số",     adm: "Các số",    in: "Trong số này",    inl: "trong số này",    next: "Số kế tiếp",    prev: "Số trước" },
    phien: { t: "Phiên", tl: "phiên", tu: "PHIÊN", cal: "Lịch phiên",     adm: "Phiên bán", in: "Trong phiên này", inl: "trong phiên này", next: "Phiên kế tiếp", prev: "Phiên trước" },
    tap:   { t: "Tập",   tl: "tập",   tu: "TẬP",   cal: "Lịch phát hành", adm: "Các tập",   in: "Trong tập này",   inl: "trong tập này",   next: "Tập kế tiếp",   prev: "Tập trước" },
    drop:  { t: "Drop",  tl: "drop",  tu: "DROP",  cal: "Lịch drop",      adm: "Drop",      in: "Trong drop này",  inl: "trong drop này",  next: "Drop kế tiếp",  prev: "Drop trước" },
    dot:   { t: "Đợt",   tl: "đợt",   tu: "ĐỢT",   cal: "Lịch đợt",       adm: "Đợt bán",   in: "Trong đợt này",   inl: "trong đợt này",   next: "Đợt kế tiếp",   prev: "Đợt trước" }
  };
  function setting(k, d) { try { return localStorage.getItem("v3." + k) || d; } catch (e) { return d; } }
  // Hero line candidates (22/09/2026): the user finds the original too cocky for a new brand;
  // four lines on trial, chosen on the board and stored as v3.hero. Applied to #cover-t / #cover-lead.
  var HERO = {
    a: { t: "Mười mẫu. Cắt một lần. Hết là hết.", lead: "Mỗi mẫu cắt đúng một lần từ khổ vải đã đặt. Số còn lại của từng mẫu hiện ngay bên dưới. Hết size là hết, không may thêm." },
    b: { t: "Mười mẫu, mỗi mẫu cắt đúng một lần.", lead: "Không may thêm sau khi mở. Số còn lại của từng mẫu hiện ngay bên dưới." },
    c: { t: "Mười mẫu. Cắt một lần. Không may thêm.", lead: "Mỗi mẫu cắt đúng một lần từ khổ vải đã đặt. Số còn lại của từng mẫu hiện ngay bên dưới." },
    d: { t: "Mười mẫu, cắt một lần. Số còn là số thật.", lead: "Mỗi mẫu cắt đúng một lần từ khổ vải đã đặt, không may thêm. Còn bao nhiêu chiếc hiện ngay bên dưới." },
  };
  function applySettings() {
    var de = document.documentElement;
    // Decided 21/09/2026: direction NHÃN, the word "Số", honey everywhere (no per-issue colour).
    var dir = setting("dir", "nhan"), spot = setting("spot", "off"), lex = setting("lex", "so"), type = setting("type", "d"), badge = setting("badge", "b");
    de.setAttribute("data-dir", dir);
    de.setAttribute("data-spot", spot);
    de.setAttribute("data-lex", lex);
    de.setAttribute("data-type", type);
    // the badge board shows all three families side by side and keeps the page-level value at "a"
    if (!(document.body && document.body.hasAttribute("data-badgeboard"))) de.setAttribute("data-badge", badge);
    var hero = HERO[setting("hero", "a")] || HERO.a; de.setAttribute("data-hero", setting("hero", "a"));
    var ht = document.getElementById("cover-t"); if (ht) ht.textContent = hero.t;
    var hl = document.getElementById("cover-lead"); if (hl) hl.textContent = hero.lead;
    var L = LEX[lex] || LEX.so;
    document.querySelectorAll(".tm[data-k]").forEach(function (el) {
      var v = L[el.getAttribute("data-k")];
      if (v !== undefined) el.textContent = v;
    });
    var t = document.body && document.body.getAttribute("data-title");
    if (t) document.title = t.replace(/\{t\}/g, L.t);
  }
  window.V3 = { LEX: LEX, setting: setting, apply: applySettings };
  window.addEventListener("storage", function (e) { if (e.key && e.key.indexOf("v3.") === 0) applySettings(); });

  // ── frozen clock ──────────────────────────────────────────────────────
  var FROZEN = Date.parse("2026-09-20T18:50:00+07:00");
  var loadedAt = Date.now();
  function now() { return FROZEN + (Date.now() - loadedAt); }
  var DROP5_CLOSES = "2026-09-25T20:00:00+07:00";
  var DROP6_OPENS = "2026-10-02T20:00:00+07:00";

  // ── icons ─────────────────────────────────────────────────────────────
  var I = window.ICONS || { LINEAR: {}, BULK: {}, INK: {}, INK_DUO: {} };
  // Optical size: glyphs whose ink is far smaller than the 24-unit frame (plus, minus,
  // the check mark) get a cropped square viewBox so they read at the size of the rest
  // of the set instead of looking like a smaller icon. Same idea as <Tick> in
  // components/icon; the app carries the table in Icon.tsx. Linear only, never bulk.
  var OPTICAL = { plus: [4, 16], minus: [4, 16], check: [6.5, 11] };
  function frame(name, bulk) { return (!bulk && OPTICAL[name]) || [0, 24]; }
  function viewBox(name, bulk) { var b = frame(name, bulk); return b[0] + " " + b[0] + " " + b[1] + " " + b[1]; }
  function ink(name, bulk) {
    var t = (bulk ? I.INK_DUO : I.INK)[name] || [2, 20]; var b = frame(name, bulk);
    return "--il:" + ((t[0] - b[0]) / b[1]).toFixed(4) + ";--ir:" + ((b[0] + b[1] - t[0] - t[1]) / b[1]).toFixed(4);
  }
  function iconHtml(name, opts) {
    opts = opts || {};
    var bulk = !!opts.bulk;
    var cls = "ic" + (bulk ? " duo" : "") + (opts.cls ? " " + opts.cls : "");
    var body = bulk ? I.BULK[name] : I.LINEAR[name];
    if (!body) body = I.LINEAR.info || "";
    return '<svg class="' + cls + '" viewBox="' + viewBox(name, bulk) + '" fill="none" aria-hidden="true" style="' + ink(name, bulk) + '">' + body + "</svg>";
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
        el.setAttribute("viewBox", viewBox(name, bulk));
        el.innerHTML = (bulk ? I.BULK[name] : I.LINEAR[name]) || I.LINEAR.info || "";
        el.style.cssText += ";" + ink(name, bulk);
        if (bulk) el.classList.add("duo");
      }
      el.setAttribute("fill", "none");
      el.setAttribute("aria-hidden", "true");
      if (!el.classList.contains("ic") && !el.hasAttribute("data-raw")) el.classList.add("ic");
    });
  }

  // ── time (mirrors lib/drop.ts) ────────────────────────────────────────
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
      } else {
        var p = parts(Date.parse(until) - now());
        el.querySelectorAll("[data-u]").forEach(function (u) {
          var k = u.getAttribute("data-u");
          u.textContent = pad2(k === "d" ? p.d : k === "h" ? p.h : k === "m" ? p.m : p.s);
        });
      }
    });
  }

  // ── chrome ────────────────────────────────────────────────────────────
  function tm(k, fallback) { return '<span class="tm" data-k="' + k + '">' + fallback + "</span>"; }
  function navHtml(o) {
    var cart = parseInt(o.cart || "0", 10), wish = parseInt(o.wish || "0", 10);
    var soon = o.state === "soon";
    var itag = soon
      ? '<a class="itag soon" href="home.html#next"><i></i>' + tm("t", "Số") + ' 06<span class="cd"> · <span data-until="' + DROP6_OPENS + '" data-verb="mở">mở sau 12 ngày 1 giờ</span></span></a>'
      : '<a class="itag" href="products.html"><i></i>' + tm("t", "Số") + ' 05<span class="cd"> · <span data-until="' + DROP5_CLOSES + '" data-verb="đóng">đóng sau 5 ngày 1 giờ</span></span></a>';
    var fam = [["TEE", "Áo thun"], ["HOODIE", "Hoodie"], ["JACKET", "Khoác"], ["SHIRT", "Sơ mi"], ["PANTS", "Quần"]];
    var links = '<nav class="links" aria-label="Danh mục">' +
      '<a' + (o.active === "products" ? ' class="on"' : "") + ' href="products.html">' + tm("t", "Số") + " 05</a>" +
      fam.map(function (f) { return '<a href="products.html?family=' + f[0] + '"' + (o.active === f[0] ? ' class="on"' : "") + ">" + f[1] + "</a>"; }).join("") +
      "</nav>";
    return '<div class="in"><a class="wm" href="home.html" aria-label="BRAND, trang chủ">BRAND</a>' + links + itag +
      '<div class="icons">' +
      '<a class="ib" href="#" aria-label="Tìm">' + iconHtml("search") + "</a>" +
      '<a class="ib" href="#" aria-label="Đã lưu' + (wish ? ", " + wish + " mẫu" : "") + '">' + iconHtml("heart", { bulk: wish > 0 }) + (wish ? "<b>" + wish + "</b>" : "") + "</a>" +
      '<a class="ib" href="#" aria-label="Tài khoản">' + iconHtml("user") + "</a>" +
      '<a class="ib" href="#" aria-label="Giỏ' + (cart ? ", " + cart + " món" : ", đang trống") + '">' + iconHtml("bag", { bulk: cart > 0 }) + (cart ? "<b>" + cart + "</b>" : "") + "</a>" +
      "</div></div>";
  }
  function footerHtml() {
    return '<div class="in"><div class="cols">' +
      "<div><h4>" + tm("cal", "Lịch ra số") + '</h4><ul class="cal">' +
      '<li><a href="products.html"><b>' + tm("t", "Số") + ' 05 · đang bán</b><span class="st on" data-until="' + DROP5_CLOSES + '" data-verb="đóng">đóng sau 5 ngày 1 giờ</span></a></li>' +
      '<li><a href="home.html#next"><b>' + tm("t", "Số") + ' 06 · sắp mở</b><span class="st">20:00 thứ Sáu 02/10 · 2 mẫu hé lộ</span></a></li>' +
      '<li><a href="#"><b>' + tm("t", "Số") + ' 04 · đã đóng</b><span class="st">19/06 · 30/30 đã bán · xem lại</span></a></li>' +
      "</ul></div>" +
      "<div><h4>Hỗ trợ</h4><ul>" +
      '<li><a href="#">Câu hỏi thường gặp</a></li><li><a href="#">Đổi trả 7 ngày</a></li>' +
      '<li><a href="#">Tra cứu đơn</a></li><li><a href="product.html#fit">Bảng số đo</a></li>' +
      '<li><a href="#">Liên hệ</a></li></ul></div>' +
      "<div><h4>Giao &amp; thanh toán</h4><ul>" +
      "<li><span>Giao 2–4 ngày · 30.000₫</span></li><li><span>Miễn phí từ 1.000.000₫</span></li>" +
      "<li><span>Nội thành TP.HCM 24 giờ · 45.000₫</span></li><li><span>Chuyển khoản · COD · Thẻ</span></li></ul></div>" +
      '<div><h4>Về BRAND</h4><ul><li><a href="#">Giới thiệu</a></li><li><a href="home.html#rules">Bốn quy tắc</a></li></ul>' +
      '<div class="needwrite" style="margin-top:8px"><span class="lb">' + iconHtml("edit", { cls: "sm" }) + "Chờ người viết</span>" +
      "<p><b>Kênh liên hệ và mạng xã hội.</b> Email, Instagram, giờ làm việc chưa chốt nên chỗ này để trống.</p></div></div>" +
      "</div>" +
      '<div class="colophon"><span class="wm">BRAND</span><span>Streetwear unisex. Mỗi ' + tm("tl", "số") + " cắt một lần.</span>" +
      '<span style="margin-left:auto">Tên pháp nhân · MST — chờ chốt</span></div></div>';
  }

  // ── chrome: admin sidebar (the v2 frame, the v3 tokens and words) ─────
  function adminNavHtml(active) {
    var L = [["dashboard", "admin-dashboard.html", "Tổng quan", "chart", ""], ["so", "admin-so.html", "", "calendar", ""],
      ["orders", "admin-orders.html", "Đơn hàng", "bag", "5"], ["products", "admin-products.html", "Mẫu", "box", ""],
      ["customers", "admin-customers.html", "Khách hàng", "people", ""], ["promotions", "admin-promotions.html", "Mã giảm giá", "tag", ""],
      ["log", "admin-log.html", "Nhật ký", "doc", ""]];
    var changes = parseInt(setting("sim.count", "0"), 10);
    return '<span class="wm">BRAND</span><nav aria-label="Khu quản trị">' + L.map(function (l) {
      var on = l[0] === active;
      var label = l[0] === "so" ? tm("adm", "Các số") : l[2];
      return '<a href="' + l[1] + '"' + (on ? ' class="on" aria-current="page"' : "") + ">" + iconHtml(l[3], { cls: "sm" }) + label + (l[4] ? '<span class="cnt">' + l[4] + "</span>" : "") + "</a>";
    }).join("") + "</nav>" +
      '<div class="simbar"><span class="tag3"><i></i>Chế độ mô phỏng</span><br>Thao tác lưu trên trình duyệt này, không có máy chủ. <b data-simcount>' + changes + '</b> thay đổi.<br>' +
      '<button type="button" class="lnk" data-open="#resetsheet">Đặt lại dữ liệu mẫu</button></div>';
  }
  function bumpSim() {
    var n = parseInt(setting("sim.count", "0"), 10) + 1;
    try { localStorage.setItem("v3.sim.count", String(n)); } catch (e) {}
    document.querySelectorAll("[data-simcount]").forEach(function (el) { el.textContent = String(n); });
  }

  // ── toast ─────────────────────────────────────────────────────────────
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

  // ── layers ────────────────────────────────────────────────────────────
  var lastOpener = null;
  function openLayer(sel, opener) {
    var el = document.querySelector(sel);
    if (!el) return;
    lastOpener = opener || document.activeElement;
    el.hidden = false;
    document.body.style.overflow = "hidden";
    var panel = el.querySelector(".panel");
    if (panel) { panel.setAttribute("tabindex", "-1"); panel.focus(); }
  }
  function closeLayer(el) {
    el.hidden = true;
    if (!document.querySelector(".sheetwrap:not([hidden])")) document.body.style.overflow = "";
    if (lastOpener && lastOpener.focus) lastOpener.focus();
  }
  window.openLayer = openLayer;

  // ── tally marks (skin PHIẾU) ──────────────────────────────────────────
  function renderTallies(root) {
    (root || document).querySelectorAll(".tally[data-n]").forEach(function (el) {
      var n = parseInt(el.getAttribute("data-n"), 10);
      if (!(n > 0) || n > 20) { el.remove(); return; }
      var html = "";
      while (n > 0) {
        var k = Math.min(n, 5);
        html += '<span class="g' + (k === 5 ? " x" : "") + '">' + "<i></i>".repeat(k === 5 ? 4 : k) + "</span>";
        n -= k;
      }
      el.innerHTML = html;
      el.setAttribute("aria-hidden", "true");
    });
  }

  // ── size selection: the ticket and the sheet share this ───────────────
  function pickSize(btn) {
    var table = btn.closest(".sizes");
    table.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    btn.setAttribute("aria-pressed", "true");
    var size = btn.getAttribute("data-size");
    var scope = btn.closest("[data-buy]") || document;
    var price = (scope.getAttribute && scope.getAttribute("data-price")) || document.body.getAttribute("data-price") || "";
    var ctas = Array.prototype.slice.call(scope.querySelectorAll("[data-cta]"));
    var lines = Array.prototype.slice.call(scope.querySelectorAll("[data-sizeline]"));
    if (!btn.closest(".sheetwrap")) {
      ctas = ctas.concat(Array.prototype.slice.call(document.querySelectorAll(".buybar3 [data-cta]")));
      lines = lines.concat(Array.prototype.slice.call(document.querySelectorAll(".buybar3 [data-sizeline]")));
    }
    ctas.forEach(function (c) {
      c.disabled = false;
      c.removeAttribute("aria-disabled");
      c.innerHTML = iconHtml("bag", { cls: "sm" }) + "Thêm vào giỏ · " + price;
      c.setAttribute("data-sim", "Đã thêm " + (scope.getAttribute("data-name") || "") + " · size " + size + " vào giỏ");
    });
    lines.forEach(function (s) { s.textContent = "đã chọn " + size; });
    var fit = document.querySelector("#fit tr[data-size='" + size + "']");
    if (fit) { fit.parentElement.querySelectorAll("tr").forEach(function (r) { r.classList.remove("on"); }); fit.classList.add("on"); }
  }

  // ── wire-up ───────────────────────────────────────────────────────────
  function ready() {
    var de = document.documentElement;
    de.setAttribute("data-pointer", "");
    addEventListener("pointerdown", function () { de.setAttribute("data-pointer", ""); }, true);
    addEventListener("keydown", function (e) { if (e.key === "Tab") de.removeAttribute("data-pointer"); }, true);

    var nav = document.querySelector("[data-nav]");
    if (nav) nav.innerHTML = navHtml({ active: nav.getAttribute("data-active"), cart: nav.getAttribute("data-cart"), wish: nav.getAttribute("data-wish"), state: nav.getAttribute("data-state") });
    var foot = document.querySelector("[data-footer]");
    if (foot) foot.innerHTML = footerHtml();
    var anav = document.querySelector("[data-adminnav]");
    if (anav) anav.innerHTML = adminNavHtml(anav.getAttribute("data-active"));

    hydrateIcons(document);
    renderTallies(document);
    applySettings();
    tickCountdowns();
    setInterval(tickCountdowns, 1000);

    document.addEventListener("click", function (e) {
      var opener = e.target.closest("[data-open]");
      if (opener) { e.preventDefault(); openLayer(opener.getAttribute("data-open"), opener); return; }
      var closer = e.target.closest("[data-close], .scrim");
      if (closer) { var wrap = closer.closest(".sheetwrap"); if (wrap) { e.preventDefault(); closeLayer(wrap); return; } }

      var sz = e.target.closest(".sizes button");
      if (sz && !sz.classList.contains("gone") && !e.target.closest(".restock")) { e.preventDefault(); pickSize(sz); return; }

      var sw = e.target.closest(".sw button");
      if (sw) {
        e.preventDefault();
        sw.parentElement.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        sw.setAttribute("aria-pressed", "true");
        var lab = sw.closest(".fld") && sw.closest(".fld").querySelector("[data-colorlabel]");
        if (lab) lab.textContent = sw.getAttribute("data-label") || "";
        return;
      }
      var tab = e.target.closest(".tabs3 a, .seg3 a, .stabs a");
      if (tab && tab.getAttribute("href") === "#") {
        e.preventDefault();
        tab.parentElement.querySelectorAll(".on").forEach(function (t) { t.classList.remove("on"); t.removeAttribute("aria-current"); });
        tab.classList.add("on"); tab.setAttribute("aria-current", "page");
        return;
      }
      var chip = e.target.closest("[data-toggle]");
      if (chip) { e.preventDefault(); chip.classList.toggle("on"); if (chip.hasAttribute("aria-pressed")) chip.setAttribute("aria-pressed", chip.classList.contains("on") ? "true" : "false"); return; }
      var swi = e.target.closest(".switch3");
      if (swi) { var on = swi.getAttribute("aria-checked") !== "true"; swi.setAttribute("aria-checked", on ? "true" : "false"); toast(on ? (swi.getAttribute("data-on") || "Đã lưu trên thiết bị này") : (swi.getAttribute("data-off") || "Đã bỏ")); return; }

      // quantity stepper, capped at what is on the shelf
      var qb = e.target.closest(".qty3 button");
      if (qb) {
        e.preventDefault();
        var inp = qb.parentElement.querySelector("input"); var max = parseInt(inp.getAttribute("max") || "99", 10);
        var v = parseInt(inp.value || "1", 10) + (qb.getAttribute("data-d") === "-" ? -1 : 1);
        if (v < 1) v = 1;
        if (v > max) { v = max; toast(inp.getAttribute("data-maxmsg") || ("Chỉ còn " + max + " chiếc")); }
        inp.value = v; return;
      }
      // radio rows (address, delivery, payment)
      var pick = e.target.closest(".picks3 .pick");
      if (pick && !e.target.closest("a, .lnk, .btn3")) {
        e.preventDefault();
        pick.parentElement.querySelectorAll(".pick").forEach(function (p) { p.setAttribute("aria-checked", "false"); });
        pick.setAttribute("aria-checked", "true");
        var show = pick.getAttribute("data-show"); if (show) document.querySelectorAll(show).forEach(function (x) { x.hidden = false; });
        var hide = pick.getAttribute("data-hide"); if (hide) document.querySelectorAll(hide).forEach(function (x) { x.hidden = true; });
        return;
      }
      // checkboxes: consent, table rows, header select-all
      var cb = e.target.closest("[role=checkbox]");
      if (cb && !cb.classList.contains("switch3")) {
        e.preventDefault();
        var was = cb.getAttribute("aria-checked") === "true";
        if (cb.closest("thead")) {
          var dt = cb.closest(".dt3"); var all = !was;
          dt.querySelectorAll("tbody [role=checkbox]").forEach(function (c) { c.setAttribute("aria-checked", all ? "true" : "false"); var tr = c.closest("tr"); if (tr) tr.classList.toggle("on", all); });
          cb.setAttribute("aria-checked", all ? "true" : "false");
        } else {
          cb.setAttribute("aria-checked", was ? "false" : "true");
          var tr2 = cb.closest("tr"); if (tr2) tr2.classList.toggle("on", !was);
        }
        var dt2 = cb.closest(".dt3");
        if (dt2) {
          var n = dt2.querySelectorAll("tbody [role=checkbox][aria-checked=true]").length;
          var tools = dt2.querySelector(".bar.tools"), bulk = dt2.querySelector(".bar.bulk");
          if (tools && bulk) { tools.hidden = n > 0; bulk.hidden = n === 0; var c2 = bulk.querySelector(".cnt"); if (c2) c2.textContent = n + " " + (bulk.getAttribute("data-unit") || "dòng") + " đã chọn"; }
          var head = dt2.querySelector("thead [role=checkbox]"); if (head) { var total = dt2.querySelectorAll("tbody [role=checkbox]").length; head.setAttribute("aria-checked", n === 0 ? "false" : n === total ? "true" : "mixed"); }
        }
        return;
      }
      // menus anchored to a button (row menus, sort)
      var mb = e.target.closest("[data-menu]");
      if (mb) {
        e.preventDefault();
        var m = document.querySelector(mb.getAttribute("data-menu")); if (!m) return;
        var openNow = !m.hidden;
        document.querySelectorAll(".menu3").forEach(function (x) { x.hidden = true; });
        document.querySelectorAll("[data-menu]").forEach(function (x) { x.setAttribute("aria-expanded", "false"); });
        if (openNow) return;
        var r = mb.getBoundingClientRect();
        m.hidden = false;
        var top = r.bottom + 4; if (top + m.offsetHeight > innerHeight - 8) top = r.top - m.offsetHeight - 4;
        var left = r.left; if (left + m.offsetWidth > innerWidth - 12) left = r.right - m.offsetWidth;
        m.style.top = top + "px"; m.style.left = Math.max(8, left) + "px";
        mb.setAttribute("aria-expanded", "true");
        return;
      }
      if (!e.target.closest(".menu3")) {
        document.querySelectorAll(".menu3:not([hidden])").forEach(function (x) { x.hidden = true; });
        document.querySelectorAll("[data-menu]").forEach(function (x) { x.setAttribute("aria-expanded", "false"); });
      }
      var reset = e.target.closest("[data-simreset]");
      if (reset) { try { localStorage.setItem("v3.sim.count", "0"); } catch (x) {} document.querySelectorAll("[data-simcount]").forEach(function (el) { el.textContent = "0"; }); }

      var sim = e.target.closest("[data-sim], [data-show], [data-hide]");
      if (sim) {
        e.preventDefault();
        if (sim.disabled) return;
        if (sim.hasAttribute("data-sim")) {
          if (sim.closest(".s.adm3, .sheetwrap") && !sim.hasAttribute("data-nocount")) bumpSim();
          var done = sim.getAttribute("data-done"); if (done) document.querySelectorAll(done).forEach(function (x) { x.classList.add("done"); });
          toast(sim.getAttribute("data-sim") || "Đã ghi nhận");
        }
        var w2 = sim.closest(".sheetwrap"); if (w2) closeLayer(w2);
        var show = sim.getAttribute("data-show"); if (show) document.querySelectorAll(show).forEach(function (x) { x.hidden = false; });
        var hide = sim.getAttribute("data-hide"); if (hide) document.querySelectorAll(hide).forEach(function (x) { x.hidden = true; });
        return;
      }
      var copy = e.target.closest("[data-copy]");
      if (copy) { e.preventDefault(); try { navigator.clipboard.writeText(copy.getAttribute("data-copy")); } catch (_) {} toast("Đã chép " + copy.getAttribute("data-copy")); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var open = document.querySelector(".sheetwrap:not([hidden])");
      if (open) closeLayer(open);
      document.querySelectorAll(".menu3:not([hidden])").forEach(function (x) { x.hidden = true; });
    });
    window.addEventListener("scroll", function () { document.querySelectorAll(".menu3:not([hidden])").forEach(function (x) { x.hidden = true; }); }, { passive: true });
    if (matchMedia("(min-width:900px)").matches) document.querySelectorAll("details.autoopen").forEach(function (d) { d.open = true; });

    // sticky buy bar: shown only once the real button has scrolled away (rAF, not IO)
    var cta = document.getElementById("buy-cta"), bar = document.querySelector(".buybar3");
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
    // gallery counter on the phone
    var gal = document.querySelector(".gal"), galbar = document.querySelector(".galbar");
    if (gal && galbar) {
      var upd = function () {
        var i = Math.round(gal.scrollLeft / gal.clientWidth);
        galbar.querySelector(".cur").textContent = String(i + 1);
        galbar.querySelectorAll(".dots i").forEach(function (d, j) { d.classList.toggle("on", j === i); });
      };
      gal.addEventListener("scroll", function () { requestAnimationFrame(upd); }, { passive: true });
    }
    if (location.hash === "#fit") openLayer("#fitsheet");
    if (location.hash === "#sizesheet") openLayer("#sizesheet");
    var fam = new URLSearchParams(location.search).get("family");
    if (fam) { var t = document.querySelector('[data-fam="' + fam + '"]'); if (t) { t.parentElement.querySelectorAll(".on").forEach(function (x) { x.classList.remove("on"); }); t.classList.add("on"); } }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
