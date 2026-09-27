/*
 * HIVE style exploration, direction 3 "Feed", round 3: what the account pages share.
 * Loads after ../shared/data.js and feed.js (and ../shared/regions.js where addresses are named).
 *
 * Local state, on this device: the profile's edits, the address book, orders the shopper cancelled, return requests.
 * Renderers any page may reuse (track.html shows an order in the same language):
 *   ACC.status(o)            HIVE.orderStatus plus a cancel made on this device
 *   ACC.statusChip(st)       the state in words with its icon
 *   ACC.steps(o, st, opts)    the four steps as Feed's story bars; opts.mini drops the labels
 *   ACC.tile(line, opts)     a line's photo, flat drawing, or, for a closed issue's style, its name in type
 *   ACC.ticket(o, opts)      an order as a card for lists (opts.groups: what it was bought from, named above the code)
 *   ACC.groupLabel(g)        a group of HIVE.orderGroups in words: "Số 05", "Cố định"
 *   ACC.phase(o)             HIVE.ORDER_PHASES' key for ACC.status (a cancel made on this device counts)
 *   ACC.items(o) / ACC.totals(o) / ACC.addrLine(a) / ACC.signedOut(opts) / ACC.lookupForm()
 *   ACC.signedOutHome(opts)  Tôi on desktop, signed out: the sign-in form beside what an account holds, the lookup
 *   ACC.siField / siPass / siCheck / siWire / signInForm   the sign-in form's fields, rules and wiring, shared by
 *                            sign-in.html and Tôi's inline form so the two never drift apart
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const esc = F.esc;
  const icon = F.icon;
  const regions = () => window.HIVE_REGIONS || null;

  const stores = {
    profile: F.store("profile", null),
    addresses: F.store("addresses", null),
    cancelled: F.store("cancelled", {}),
    returns: F.store("returns", {}),
  };

  // ---------------------------------------------------------------- time and money in the app's words
  // "19:02 21/09"
  const at = (iso) => { const p = F.parts(iso); return p.time + " " + p.dd + "/" + p.mm; };

  // ---------------------------------------------------------------- profile
  function profile() {
    const saved = stores.profile.get() || {};
    return Object.assign({}, H.ACCOUNT, saved, { sizes: Object.assign({}, H.ACCOUNT.sizes, saved.sizes || {}) });
  }
  const saveProfile = (p) => stores.profile.set(p);

  // ---------------------------------------------------------------- addresses
  function addresses() {
    const a = stores.addresses.get();
    return Array.isArray(a) ? a : H.ADDRESSES.map((x) => Object.assign({}, x));
  }
  const saveAddresses = (list) => stores.addresses.set(list);
  const defaultAddress = () => { const l = addresses(); return l.find((a) => a.isDefault) || l[0] || null; };
  function provinceName(code) {
    const R = regions();
    const p = R && R.provinces.find((x) => x.code === code);
    return p ? p.name : "";
  }
  function wardName(pcode, wcode) {
    const R = regions();
    const w = R && (R.wards[pcode] || []).find((x) => x[0] === wcode);
    return w ? w[2] + " " + w[1] : "";
  }
  const addrLine = (a) => [a.street, wardName(a.province, a.ward), provinceName(a.province)].filter(Boolean).join(", ");
  const addrById = (id) => addresses().find((a) => a.id === id) || H.ADDRESSES.find((a) => a.id === id) || null;

  // ---------------------------------------------------------------- orders
  // The data's timeline, plus a cancel the shopper made here while the order was still unpaid.
  function status(o) {
    const st = H.orderStatus(o);
    if (!st) return st;
    // The mock's clock restarts at every page load, so a cancel counts from the moment's own clock (base), and
    // shows at the minute it was made (at). A cancel made in a later moment does not reach back into an earlier one.
    const c = stores.cancelled.get()[o.code];
    const cx = typeof c === "string" ? { at: c, base: c } : c;
    if (cx && Date.parse(cx.base) <= H.nowMs()) return { state: "CANCELLED", at: cx.at, reason: "Bạn đã huỷ", label: H.ORDER_STATES.CANCELLED, byYou: true };
    return st;
  }
  const canCancel = (st) => !!st && (st.state === "AWAITING_TRANSFER" || st.state === "RECEIVED");
  // The orders list's filters: the phase from the status the shopper sees, the group an order's lines belong to.
  function phase(o) {
    const st = status(o);
    if (!st) return null;
    return st.state === "DELIVERED" ? "delivered" : st.state === "CANCELLED" ? "cancelled" : "active";
  }
  const groupLabel = (g) => (g === "fixed" ? "Cố định" : F.issueLabel(g));
  function cancelOrder(code) {
    const m = stores.cancelled.get();
    m[code] = { at: new Date(H.nowMs()).toISOString(), base: H.NOW };
    stores.cancelled.set(m);
  }
  const returnOf = (code) => stores.returns.get()[code] || null;
  function saveReturn(code, req) {
    const m = stores.returns.get();
    m[code] = req;
    stores.returns.set(m);
  }
  const canReturn = (o) => { const st = status(o); return !!st && st.state === "DELIVERED" && H.canReturn(o); };

  // What can be bought again today from an order: styles still on sale, in the colour and size bought, if left.
  function buyAgain(o) {
    return o.lines.filter((l) => {
      const s = H.find(l.slug);
      return s && F.canBuy(s) && H.stockOf(l.slug, l.color, l.size) > 0;
    });
  }

  // ---------------------------------------------------------------- labels
  const ST_ICON = {
    AWAITING_TRANSFER: "hourglass-medium", RECEIVED: "hourglass-medium", PAID: "check-circle",
    SHIPPING: "truck", DELIVERED: "package", CANCELLED: "x",
  };
  const statusChip = (st) =>
    `<span class="st-chip${st.state === "AWAITING_TRANSFER" ? " is-act" : ""}">${icon(ST_ICON[st.state])}${esc(st.label)}</span>`;

  // The four steps: Đặt hàng, Thanh toán (Xác nhận for COD), Gửi hàng, Đã giao.
  function stepModel(o, st) {
    const tl = H.orderTimeline(o);
    const ev = (s) => (tl.find((e) => e.state === s) || {}).at || null;
    const cod = o.payment === "COD";
    const shipped = ev("SHIPPING");
    const delivered = ev("DELIVERED");
    const paid = ev("PAID");
    const received = ev("RECEIVED");
    if (st.state === "CANCELLED") {
      return [
        { label: "Đặt hàng", at: o.placedAt, cls: "is-done" },
        { label: "Đã huỷ", at: st.at, cls: "is-off" },
        { label: "Gửi hàng", at: null, cls: "is-off" },
        { label: "Đã giao", at: null, cls: "is-off" },
      ];
    }
    const steps = [
      { label: "Đặt hàng", at: o.placedAt, done: true },
      { label: cod ? "Xác nhận" : "Thanh toán", at: cod ? received : paid, done: cod ? !!(received || shipped) : !!paid },
      { label: "Gửi hàng", at: shipped, done: !!shipped },
      { label: "Đã giao", at: delivered, done: !!delivered },
    ];
    let now = false;
    return steps.map((s) => {
      if (s.done) return Object.assign(s, { cls: "is-done" });
      if (!now) { now = true; return Object.assign(s, { cls: "is-now" }); }
      return Object.assign(s, { cls: "" });
    });
  }
  function steps(o, st, opts) {
    const mini = opts && opts.mini;
    return `<ol class="osteps${mini ? " is-mini" : ""}"${mini ? ' aria-hidden="true"' : ' aria-label="Hành trình"'}>${stepModel(o, st).map((s) =>
      `<li class="ostep ${s.cls}"${s.cls === "is-now" ? ' aria-current="step"' : ""}><div class="ostep-bar" aria-hidden="true"><i></i></div>
        <p class="ostep-label">${esc(s.label)}</p>${s.at ? `<p class="ostep-at">${at(s.at)}</p>` : ""}</li>`).join("")}</ol>`;
  }

  // ---------------------------------------------------------------- item tiles
  function tile(l, opts) {
    // named: false where the name is printed beside the tile (a row): a closed issue's style then shows its colour only.
    const o = Object.assign({ size: "", alt: false, qty: true, named: true }, opts);
    const L = H.orderLine(l);
    const name = L.style ? L.style.name : l.slug;
    const qty = o.qty && l.qty > 1 ? `<span class="tile-qty">×${l.qty}</span>` : "";
    const label = `${name}, ${L.colorLabel.toLowerCase()}, size ${l.size}${l.qty > 1 ? ", " + l.qty + " chiếc" : ""}`;
    const cls = "tile" + (o.size ? " " + o.size : "");
    if (L.image) {
      return `<span class="${cls}${L.fixed ? " flat" : ""}"><img src="${L.image}" width="120" height="150" loading="lazy" decoding="async" alt="${o.alt ? esc(label) : ""}">${qty}</span>`;
    }
    const hex = (H.COLORS[l.color] || {}).hex || "#8C8C8C";
    if (!o.named) return `<span class="${cls} swatch-tile" style="background:${hex}"${o.alt ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'}>${qty}</span>`;
    return `<span class="${cls} type"${o.alt ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'}><span class="tile-dot" style="background:${hex}"></span><span class="tile-name">${esc(name)}</span>${qty}</span>`;
  }

  // ---------------------------------------------------------------- an order as a card
  function ticket(o, opts) {
    const groups = (opts && opts.groups) || [];
    const st = status(o);
    const t = H.orderTotals(o);
    const req = returnOf(o.code);
    let note = "";
    if (st.state === "AWAITING_TRANSFER") note = `Giữ hàng còn <b class="num" data-until="${st.dueAt}" role="timer">${F.cdHTML(st.dueAt)}</b>`;
    else if (st.state === "CANCELLED") note = esc(st.reason);
    else if (st.state === "SHIPPING" && st.tracking) note = `Mã vận đơn <b>${esc(st.tracking)}</b>`;
    else if (req) note = `Yêu cầu đổi trả <b>${esc(req.code)}</b>`;
    else if (canReturn(o)) note = `Đổi trả tới <b>${H.day(H.returnUntil(o))}</b>`;
    const shown = o.lines.slice(0, 4);
    return `<article class="ticket${st.state === "CANCELLED" ? " is-cancelled" : ""}"><a class="ticket-a" href="${F.url("order.html?id=" + o.code)}">
      <div class="ticket-top">
        ${groups.length ? `<p class="ticket-grp">${groups.map(groupLabel).join(" · ")}</p>` : ""}
        <h3 class="ticket-code disp">${o.code}</h3>
        <p class="ticket-total">${H.vnd(t.total)}</p>
      </div>
      <div class="ticket-mid">${statusChip(st)}${note ? `<span class="ticket-note">${note}</span>` : ""}</div>
      <div class="ticket-foot">
        <div class="tiles">${shown.map((l) => tile(l, { alt: true })).join("")}</div>
        <p class="ticket-date">Đặt ${H.day(o.placedAt)}</p>
      </div>
    </a></article>`;
  }

  function items(o) {
    return `<ul class="od-items">${o.lines.map((l) => {
      const L = H.orderLine(l);
      const s = L.style;
      const href = H.find(l.slug) ? F.url("product.html?m=" + l.slug) : null;
      const name = s ? s.name : l.slug;
      const inner = `${tile(l, { size: "lg", qty: false, named: false })}
        <div><p class="od-item-name disp">${esc(name)}</p>
          <p class="od-item-meta">${esc(L.colorLabel)} · Size ${l.size}${l.qty > 1 ? ` · ×${l.qty}` : ""}</p></div>
        <p class="od-item-price">${H.vnd(L.total)}</p>`;
      return href ? `<li><a class="od-item od-item-a" href="${href}">${inner}</a></li>` : `<li class="od-item">${inner}</li>`;
    }).join("")}</ul>`;
  }

  function totals(o) {
    const t = H.orderTotals(o);
    const rows = [["Tạm tính", H.vnd(t.subtotal)], ["Giao hàng", t.shipping ? H.vnd(t.shipping) : "Miễn phí"]];
    if (t.cod) rows.push(["Phụ phí COD", "+" + H.vnd(t.cod)]);
    if (t.discount) rows.push(["Mã " + o.promo, "-" + H.vnd(t.discount)]);
    return `<dl class="facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <div class="csum-total"><span>Tổng</span><b>${H.vnd(t.total)}</b></div>`;
  }

  // ---------------------------------------------------------------- signed out
  function signInLinks() {
    const back = F.signInHref();
    return {
      in: F.url(back),
      up: F.url(back.replace("sign-in.html?", "sign-in.html?mode=up&")),
    };
  }

  // What an account holds (labels only).
  const perks = () => `<ul class="out-perks">
        <li class="out-perk">${icon("package")}<span>Đơn hàng</span></li>
        <li class="out-perk">${icon("heart")}<span>Yêu thích</span></li>
        <li class="out-perk">${icon("bell")}<span>Nhắc giờ mở</span></li>
      </ul>`;

  // A way in, and what an account holds, in the dark card of the Tôi page (the phone). Every other page shows it
  // without the perks; on desktop that card becomes a banner (account.css).
  function signedOut(opts) {
    const o = Object.assign({ title: "Tôi", perks: true, id: "out-title" }, opts);
    const l = signInLinks();
    return `<section class="out-card on-dark${o.perks ? " has-perks" : ""}" aria-labelledby="${o.id}">
      <h2 class="out-title disp" id="${o.id}">${esc(o.title)}</h2>
      ${o.perks ? perks() : ""}
      <div class="out-acts">
        <a class="btn btn-blue" href="${l.in}">Đăng nhập</a>
        <a class="btn btn-line" href="${l.up}">Tạo tài khoản</a>
      </div>
    </section>`;
  }

  // ---------------------------------------------------------------- the sign-in form (sign-in.html and Tôi on desktop)
  // px prefixes the ids a page may already use.
  const siField = (name, label, attrs, value, px) => `<label class="field" data-f="${name}"><span class="lbl">${label}</span>
    <input name="${name}" aria-describedby="${px || ""}e-${name}" ${attrs}${value ? ` value="${esc(value)}"` : ""}>
    <span class="err" id="${px || ""}e-${name}" hidden></span></label>`;
  // The show/hide button may not sit inside a <label>: the text names the input through aria-labelledby.
  const siPass = (label, ac, px) => {
    const p = px || "";
    return `<div class="field" data-f="password"><span class="lbl" id="${p}l-password">${label}</span>
    <span class="si-pass"><input name="password" type="password" autocomplete="${ac}" aria-labelledby="${p}l-password" aria-describedby="${p}e-password">
      <button class="si-eye" type="button" data-eye aria-label="Hiện mật khẩu" aria-pressed="false">${icon("eye")}</button></span>
    <span class="err" id="${p}e-password" hidden></span></div>`;
  };
  const SI_RULES = {
    name: (v) => (v.length >= 2 ? "" : "Nhập họ và tên"),
    email: (v) => (!v ? "Nhập email" : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Email chưa đúng"),
    password: (v, mode) => (mode === "up" ? (v.length >= 8 ? "" : "Mật khẩu từ 8 ký tự") : v ? "" : "Nhập mật khẩu"),
  };
  // Marks every field (show) and returns the first that is wrong.
  function siCheck(form, show, mode) {
    let first = null;
    Array.from(form.querySelectorAll("[name]")).forEach((i) => {
      const rule = SI_RULES[i.name];
      if (!rule) return;
      let msg = rule(i.value.trim(), mode);
      // Tạo tài khoản with an email that already has one: the demo shopper's.
      if (!msg && mode === "up" && i.name === "email" && i.value.trim().toLowerCase() === H.ACCOUNT.email) msg = "Email này đã có tài khoản";
      if (!show) return;
      const box = i.closest("[data-f]");
      const err = box.querySelector(".err");
      box.classList.toggle("is-error", !!msg);
      err.hidden = !msg;
      err.innerHTML = msg ? `${icon("warning-circle")}<span>${msg}</span>` : "";
      if (msg) { i.setAttribute("aria-invalid", "true"); if (!first) first = i; } else i.removeAttribute("aria-invalid");
    });
    return first;
  }
  // Submit checks every field and hands a valid form to done(form); once a field shows an error, typing re-checks.
  function siWire(root, getMode, done) {
    root.addEventListener("submit", (e) => {
      const form = e.target.closest("[data-si-form]");
      if (!form) return;
      e.preventDefault();
      const fe = form.querySelector(".si-formerr");
      if (fe) fe.remove();
      const first = siCheck(form, true, getMode());
      if (first) { first.focus(); return; }
      done(form);
    });
    root.addEventListener("input", (e) => {
      const f = e.target.closest("[data-si-form]");
      if (f && f.querySelector(".is-error")) siCheck(f, true, getMode());
    });
  }
  // The password's show/hide, wherever the form is.
  document.addEventListener("click", (e) => {
    const eye = e.target.closest("[data-eye]");
    if (!eye) return;
    const i = eye.parentElement.querySelector("input");
    const on = i.type === "password";
    i.type = on ? "text" : "password";
    eye.setAttribute("aria-pressed", String(on));
    eye.setAttribute("aria-label", on ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    eye.innerHTML = icon(on ? "eye-slash" : "eye");
  });
  // The Đăng nhập form. errors: the state after a failed try (as sign-in.html?errors=1). row: the button and the
  // forgotten-password link on one line (Tôi on desktop) instead of the link above the button (sign-in.html).
  function signInForm(o) {
    const forgot = `<a class="link si-forgot" href="${o.forgot}">Quên mật khẩu?</a>`;
    const submit = `<button class="btn btn-blue" type="submit">Đăng nhập</button>`;
    return `<form class="si-form" novalidate data-si-form>
        ${o.errors ? `<p class="si-formerr" role="alert">${icon("warning-circle")}<span>Email hoặc mật khẩu chưa đúng</span></p>` : ""}
        ${siField("email", "Email", 'type="email" autocomplete="email"', o.errors ? H.ACCOUNT.email : "", o.px)}
        ${siPass("Mật khẩu", "current-password", o.px)}
        ${o.row ? `<div class="si-row">${submit}${forgot}</div>` : forgot + "\n        " + submit}
      </form>`;
  }

  // Tôi on desktop, signed out: two columns. Left, signing in right here (the same form as sign-in.html); right, the
  // dark card with the way to make an account, then the guest lookup. No perks here: the menu beside already lists
  // Đơn hàng and Yêu thích (the phone, which has no menu, keeps them).
  function signedOutHome(opts) {
    const o = Object.assign({ errors: false }, opts);
    const l = signInLinks();
    return `<div class="out-home">
      <section class="out-in" aria-labelledby="out-in-title">
        <h2 class="out-head disp" id="out-in-title">Đã có tài khoản</h2>
        ${signInForm({ px: "me-", errors: o.errors, row: true, forgot: F.url("sign-in.html?mode=forgot") })}
      </section>
      <div class="out-side">
        <section class="out-up on-dark" aria-labelledby="out-up-title">
          <h2 class="out-head disp" id="out-up-title">Chưa có tài khoản</h2>
          <a class="btn btn-light out-up-go" href="${l.up}">Tạo tài khoản</a>
        </section>
        ${lookupForm("me")}
      </div>
    </div>`;
  }

  // Tra cứu đơn without an account; the result opens on track.html.
  function lookupForm(id, code) {
    const k = id || "lk";
    return `<section class="lookup" aria-labelledby="${k}-title">
      <h2 class="acc-sec-title" id="${k}-title">Tra cứu đơn</h2>
      <form class="lookup-form" action="track.html" data-lookup novalidate>
        <label class="field" data-f="${k}-code"><span class="lbl">Mã đơn</span>
          <input name="code" id="${k}-code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="VD: DH-1499" aria-describedby="e-${k}-code"${code ? ` value="${esc(code)}"` : ""}>
          <span class="err" id="e-${k}-code" hidden></span></label>
        <label class="field" data-f="${k}-phone"><span class="lbl">Số điện thoại đặt hàng</span>
          <input name="phone" id="${k}-phone" type="tel" inputmode="tel" autocomplete="tel" aria-describedby="e-${k}-phone">
          <span class="err" id="e-${k}-phone" hidden></span></label>
        <button class="btn btn-line" type="submit">Tra cứu</button>
      </form>
    </section>`;
  }

  // Inline errors under a field (the checkout's look).
  function fieldError(form, name, msg) {
    const input = form.querySelector(`[name="${name}"]`);
    const box = input.closest(".field");
    const err = box.querySelector(".err");
    box.classList.toggle("is-error", !!msg);
    err.hidden = !msg;
    err.innerHTML = msg ? `${icon("warning-circle")}<span>${esc(msg)}</span>` : "";
    if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    return msg ? input : null;
  }

  document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-lookup]");
    if (!form) return;
    e.preventDefault();
    const code = form.code.value.trim().toUpperCase();
    const phone = form.phone.value.trim();
    const a = fieldError(form, "code", code ? (/^DH-?\d{3,6}$/.test(code) ? "" : "Mã đơn có dạng DH-1499") : "Nhập mã đơn");
    const b = fieldError(form, "phone", phone ? (/^0\d{9}$/.test(phone.replace(/\D/g, "")) ? "" : "Số điện thoại gồm 10 số, bắt đầu bằng 0") : "Nhập số điện thoại");
    const first = a || b;
    if (first) { first.focus(); return; }
    location.href = F.url(`track.html?code=${encodeURIComponent(code.replace(/^DH(\d)/, "DH-$1"))}&phone=${encodeURIComponent(phone.replace(/\D/g, ""))}`);
  });

  // The hero leaves the screen: the phone bar shows the page's title (set by data-title-reveal).
  function revealTitleOn(hero) {
    const bar = document.querySelector(".mbar");
    if (!bar || !hero || !("IntersectionObserver" in window)) return;
    bar.classList.add("title-late");
    new IntersectionObserver(([en]) => bar.classList.toggle("title-on", !en.isIntersecting), { rootMargin: "-56px 0px 0px 0px" }).observe(hero);
  }

  window.ACC = {
    at, profile, saveProfile, addresses, saveAddresses, defaultAddress, provinceName, wardName, addrLine, addrById,
    status, canCancel, cancelOrder, returnOf, saveReturn, canReturn, buyAgain, phase, groupLabel,
    statusChip, steps, stepModel, tile, ticket, items, totals, signedOut, lookupForm, fieldError, signInLinks, revealTitleOn,
    signedOutHome, signInForm, siField, siPass, siCheck, siWire,
  };
})();
