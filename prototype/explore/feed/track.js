/*
 * Tra cứu đơn: an order looked up without an account, by its code and the phone number it was placed with
 * (HIVE.lookup). The result speaks the order page's language (ACC from account.js): the code, what it was bought from
 * (its issues, the fixed line), the four steps as Feed's story bars, then what the shopper can do from here (the hold
 * and what to transfer while unpaid, card orders included; the call before a COD delivery; the waybill while it
 * travels; the return window once delivered; the reason once cancelled), what is in it and the totals. The address and the actions that need the account stay on the order page:
 * one link opens it, or signs in first.
 * One column holds the page: as wide as the phone, centred on desktop (narrow for the form, wider for the order). The
 * form folds away behind the result, the order's code becomes the heading on screen (the h1 stays for assistive
 * tech) and "Tra đơn khác" brings the form back. A lookup waits on the shop for a moment: the button says so; on the
 * phone grey blocks also hold the result's place under the form, while on desktop the order simply takes the form's
 * place (fading in where motion is on), so nothing below it moves.
 * States: ?code=DH-1499&phone=0938571204 (found), a code that does not exist, a phone that does not match.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const A = window.ACC;
  const H = F.H;
  const q = new URLSearchParams(location.search);
  const el = document.querySelector("[data-track]");
  const bar = document.querySelector(".mbar");
  const st = { code: q.get("code") || "", phone: q.get("phone") || "", order: null, errors: {}, busy: false };

  const norm = (code) => String(code || "").trim().toUpperCase().replace(/^DH(\d)/, "DH-$1");
  const digits = (s) => String(s || "").replace(/\D/g, "");

  // ---------------------------------------------------------------- the lookup (the account pages' rules and words)
  function validate() {
    const e = {};
    const c = String(st.code || "").trim().toUpperCase();
    if (!c) e.code = "Nhập mã đơn";
    else if (!/^DH-?\d{3,6}$/.test(c)) e.code = "Mã đơn có dạng DH-1499";
    if (!String(st.phone || "").trim()) e.phone = "Nhập số điện thoại";
    else if (!/^0\d{9}$/.test(digits(st.phone))) e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
    return e;
  }

  function run() {
    st.errors = validate();
    st.order = null;
    if (Object.keys(st.errors).length) return;
    const r = H.lookup(norm(st.code), st.phone);
    if (r.ok) { st.order = r.order; return; }
    // The lookup says what did not match; the message goes under that field.
    st.errors[/điện thoại/i.test(r.error) ? "phone" : "code"] = r.error;
  }

  // ---------------------------------------------------------------- the result
  const copyRow = (label, shown, value, id) => `<div class="copyrow">
      <span class="copy-k">${label}</span><b class="copy-v" id="${id}">${F.esc(shown)}</b>
      <button class="copy" type="button" data-copy="${F.esc(value)}" data-target="${id}" aria-label="Chép ${label.toLowerCase()}">${F.icon("copy")}<span data-copy-label>Chép</span></button>
    </div>`;

  // What the shopper can do from here without the account.
  function act(o, s, t) {
    if (s.state === "AWAITING_TRANSFER") {
      const memo = o.code.replace("-", "");
      return `<section class="od-act" aria-label="Chuyển khoản">
        <p class="od-hold"><span class="cd-big" data-until="${s.dueAt}" role="timer" aria-label="Thời gian giữ hàng còn lại">${F.cdHTML(s.dueAt)}</span></p>
        <p class="od-act-line">Giữ hàng tới <b>${H.when(s.dueAt)}</b>. Quá giờ, đơn tự huỷ và ${t.units} chiếc về kệ.</p>
        <div class="od-pay">
          ${copyRow("Số tiền", H.vnd(t.total), String(t.total), "v-amount")}
          ${copyRow("Nội dung", memo, memo, "v-memo")}
          <div class="copyrow is-pending"><span class="copy-k">Tài khoản</span><span class="copy-v">Số tài khoản và tên ngân hàng đang chuẩn bị</span></div>
        </div>
      </section>`;
    }
    if (s.state === "RECEIVED") {
      return `<section class="od-act" aria-label="Xác nhận đơn"><p class="od-act-line">Cửa hàng gọi <b>${F.esc(st.phone)}</b> để xác nhận trước khi giao.</p></section>`;
    }
    if (s.state === "SHIPPING" && s.tracking) {
      return `<section class="od-act" aria-label="Vận đơn">${copyRow("Mã vận đơn", s.tracking, s.tracking, "v-track")}</section>`;
    }
    if (s.state === "DELIVERED" && A.canReturn(o)) {
      return `<section class="od-act" aria-label="Đổi trả"><p class="od-act-line">Đổi trả tới <b>${H.day(H.returnUntil(o))}</b></p></section>`;
    }
    if (s.state === "CANCELLED") return `<p class="od-why">${F.icon("x")}<span>${F.esc(s.reason)}. Hàng đã về kệ.</span></p>`;
    return "";
  }

  // What the order was bought from: its issues and the fixed line (HIVE.orderGroups). An order of fixed-line pieces
  // only (DH-1402) belongs to no issue, so it carries no Số chip.
  const groups = (o) => H.orderGroups(o).map((g) => `<span class="chip-tag">${g === "fixed" ? "Cố định" : F.issueLabel(g)}</span>`).join("");

  function result(o) {
    const s = A.status(o);
    const t = H.orderTotals(o);
    const page = "order.html?id=" + o.code;
    const go = F.signedIn
      ? `<a class="btn btn-line" href="${F.esc(F.url(page))}">Xem trang đơn</a>`
      : `<a class="btn btn-line" href="${F.esc(F.url("sign-in.html?next=" + encodeURIComponent(page)))}">Đăng nhập để xem trang đơn</a>`;
    // Unpaid by transfer, the amount is already in the panel above with its copy button.
    const sum = s.state === "AWAITING_TRANSFER" ? "" : `<section class="acc-sec" aria-labelledby="h-sum">
        <div class="acc-sec-head"><h3 class="acc-sec-title" id="h-sum">Tóm tắt</h3></div>${A.totals(o)}</section>`;
    return `<div class="b-res">
      <div class="b-res-head">
        <h2 class="od-code disp" tabindex="-1">${o.code}</h2>
        <button class="link" type="button" data-again>Tra đơn khác</button>
      </div>
      <div class="od-meta">${groups(o)}</div>
      <div class="od-steps">${A.steps(o, s)}</div>
      ${act(o, s, t)}
      <section class="acc-sec" aria-labelledby="h-items">
        <div class="acc-sec-head"><h3 class="acc-sec-title" id="h-items">${t.units} món</h3></div>${A.items(o)}
      </section>
      ${sum}
      <div class="b-res-go">${go}</div>
    </div>`;
  }

  // ---------------------------------------------------------------- the form
  const field = (id, label, attrs) => `<label class="field${st.errors[id] ? " is-error" : ""}" data-f="${id}">
      <span class="lbl">${label}</span>
      <input id="f-${id}" name="${id}" ${attrs} aria-describedby="e-${id}"${st.errors[id] ? ' aria-invalid="true"' : ""} value="${F.esc(st[id])}">
      <span class="err" id="e-${id}"${st.errors[id] ? "" : " hidden"}>${st.errors[id] ? `${F.icon("warning-circle")}<span>${F.esc(st.errors[id])}</span>` : ""}</span>
    </label>`;

  function alt() {
    if (F.signedIn) return `<p class="b-trk-alt"><a class="link" href="${F.esc(F.url("orders.html"))}">${F.icon("package")}Đơn hàng của bạn</a></p>`;
    return `<p class="b-trk-alt">Có tài khoản? <a class="link" href="${F.esc(F.url(F.signInHref()))}">Đăng nhập</a></p>`;
  }

  // The phone bar shows the title once the page's own has scrolled away (or while a result stands in its place).
  let io = null;
  let watched = null;
  function watchTitle(hero, has) {
    if (!bar) return;
    bar.classList.add("title-late");
    if (!("IntersectionObserver" in window)) { bar.classList.add("title-on"); return; }
    io = io || new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.target === watched) bar.classList.toggle("title-on", !!st.order || !en.isIntersecting);
    }), { rootMargin: "-56px 0px 0px 0px" });
    if (watched) io.unobserve(watched);
    watched = hero;
    if (hero) io.observe(hero);
    if (has) bar.classList.add("title-on");
  }

  function render(focus) {
    const has = !!st.order;
    el.innerHTML = `<div class="b-head${has ? " b-head-quiet" : ""}"><h1 class="b-title disp">Tra cứu đơn</h1></div>
      <div class="b-trk${has ? " has-result" : ""}${st.busy ? " is-busy" : ""}">
        <div class="b-trk-side">
          <form class="b-trk-form" novalidate data-form>
            ${field("code", "Mã đơn", 'autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next" placeholder="VD: DH-1499"')}
            ${field("phone", "Số điện thoại đặt hàng", 'type="tel" inputmode="tel" autocomplete="tel" enterkeyhint="search"')}
            <button class="btn btn-blue" type="submit"${st.busy ? ' aria-busy="true"' : ""}>${st.busy ? "Đang tra cứu" : "Tra cứu"}</button>
          </form>
          ${has ? "" : alt()}
        </div>
        <div class="b-trk-main" data-result aria-live="polite">${st.busy ? '<div class="b-skel" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' : has ? result(st.order) : ""}</div>
      </div>`;
    watchTitle(el.querySelector(".b-title"), has);
    F.tick();
    if (focus === "result") {
      // Only an order that has just arrived fades in (desktop, motion on); one opened from a link is simply there.
      const r = el.querySelector(".b-res");
      if (r) r.classList.add("is-fresh");
      const h = el.querySelector(".od-code");
      if (h) h.focus();
    }
    if (focus === "error") { const f = el.querySelector('[aria-invalid="true"]'); if (f) f.focus(); }
    if (focus === "code") { const f = el.querySelector("#f-code"); if (f) f.focus(); }
  }

  function writeUrl() {
    const p = new URLSearchParams();
    if (st.order) { p.set("code", st.order.code); p.set("phone", digits(st.phone)); }
    if (F.MODE !== "open") p.set("state", F.MODE);
    if (!F.signedIn) p.set("auth", "out");
    const s = p.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
  }

  el.addEventListener("submit", (e) => {
    e.preventDefault();
    if (st.busy) return;
    const form = e.target;
    st.code = form.code.value;
    st.phone = form.phone.value;
    st.errors = validate();
    if (Object.keys(st.errors).length) { st.order = null; render("error"); return; }
    st.busy = true;
    render();
    setTimeout(() => {
      st.busy = false;
      run();
      writeUrl();
      render(st.order ? "result" : "error");
    }, 450);
  });

  // An error clears as soon as its field is edited.
  el.addEventListener("input", (e) => {
    const k = e.target.name;
    if (!k || !st.errors[k]) return;
    st[k] = e.target.value;
    delete st.errors[k];
    el.querySelector(`[data-f="${k}"]`).classList.remove("is-error");
    e.target.removeAttribute("aria-invalid");
    const err = el.querySelector("#e-" + k);
    err.hidden = true;
    err.innerHTML = "";
  });

  el.addEventListener("click", (e) => {
    const c = e.target.closest("[data-copy]");
    if (c) { F.copy(c, c.dataset.copy, document.getElementById(c.dataset.target)); return; }
    if (e.target.closest("[data-again]")) {
      st.order = null;
      st.code = "";
      st.phone = "";
      writeUrl();
      render("code");
    }
  });

  // A link that carries the code and the phone looks the order up at once.
  if (st.code || st.phone) run();
  render();
  F.boot();
})();
