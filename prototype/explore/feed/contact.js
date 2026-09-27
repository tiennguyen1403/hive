/*
 * Liên hệ: a message to the shop. Name, email or phone (where the reply goes), the order it is about (optional; a
 * signed-in shopper picks from their recent orders), the message. Errors show under each field after a send; a send
 * waits on the shop for a moment, then says in one line when and where the reply comes (HIVE.CONTACT: within its
 * hours, to the email or phone entered). Where the message lands in the back office is not the shopper's business. The shop has no public phone, email or social
 * account yet: that is an empty slot, never a made-up number.
 * States: ?errors=1 (sent with errors), ?sent=1 (sent).
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const q = new URLSearchParams(location.search);
  const el = document.querySelector("[data-contact]");
  const sentTo = F.store("contact-sent", null);
  const st = { name: "", reach: "", order: "", msg: "", errors: {}, sent: q.get("sent") === "1", busy: false };
  if (F.signedIn) { st.name = H.ACCOUNT.name; st.reach = H.ACCOUNT.email; }

  const digits = (s) => String(s || "").replace(/\D/g, "");
  function validate() {
    const e = {};
    if (st.name.trim().length < 2) e.name = "Nhập họ và tên";
    const r = st.reach.trim();
    if (!r) e.reach = "Nhập email hoặc số điện thoại";
    else if (r.includes("@") ? !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r) : !(/^[\d\s.]+$/.test(r) && /^0\d{9}$/.test(digits(r)))) {
      e.reach = "Email hoặc số điện thoại chưa đúng";
    }
    const o = st.order.trim();
    if (o && !/^DH-?\d{3,6}$/i.test(o)) e.order = "Mã đơn có dạng DH-1499";
    if (!st.msg.trim()) e.msg = "Nhập tin nhắn";
    return e;
  }

  // The demo of a send that went wrong: the checkout's way of showing it.
  if (q.get("errors") === "1") {
    Object.assign(st, { name: "", reach: "khoa@", order: "1499", msg: "" });
    st.errors = validate();
  }

  // ---------------------------------------------------------------- markup
  const err = (k) => `<span class="err" id="e-${k}"${st.errors[k] ? "" : " hidden"}>${st.errors[k] ? `${F.icon("warning-circle")}<span>${F.esc(st.errors[k])}</span>` : ""}</span>`;
  const bad = (k) => (st.errors[k] ? ' aria-invalid="true"' : "");
  const box = (k) => `field${st.errors[k] ? " is-error" : ""}`;

  function orderChips() {
    if (!F.signedIn) return "";
    const recent = H.orders().slice(0, 3);
    if (!recent.length) return "";
    return `<div class="b-ochips" role="group" aria-label="Đơn gần đây">${recent.map((o) =>
      `<button class="schip" type="button" data-oc="${o.code}" aria-pressed="${st.order.trim().toUpperCase() === o.code}">${o.code}</button>`).join("")}</div>`;
  }

  function form() {
    return `<form class="b-cform" novalidate data-cform>
      <label class="${box("name")}" data-f="name"><span class="lbl">Họ và tên</span>
        <input id="f-name" name="name" autocomplete="name" aria-describedby="e-name"${bad("name")} value="${F.esc(st.name)}">${err("name")}</label>
      <label class="${box("reach")}" data-f="reach"><span class="lbl">Email hoặc số điện thoại</span>
        <input id="f-reach" name="reach" autocomplete="email" inputmode="email" spellcheck="false" aria-describedby="e-reach"${bad("reach")} value="${F.esc(st.reach)}">${err("reach")}</label>
      <div class="${box("order")}" data-f="order">
        <label class="b-lblwrap"><span class="lbl">Mã đơn <span class="opt">tuỳ chọn</span></span>
          <input id="f-order" name="order" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="VD: DH-1499" aria-describedby="e-order"${bad("order")} value="${F.esc(st.order)}"></label>
        ${err("order")}${orderChips()}</div>
      <label class="${box("msg")}" data-f="msg"><span class="lbl">Tin nhắn</span>
        <textarea id="f-msg" name="msg" rows="5" aria-describedby="e-msg"${bad("msg")}>${F.esc(st.msg)}</textarea>${err("msg")}</label>
      <button class="btn btn-blue" type="submit"${st.busy ? ' aria-busy="true"' : ""}>${st.busy ? "Đang gửi" : `${F.icon("paper-plane-tilt")}Gửi`}</button>
    </form>`;
  }

  function sent() {
    const to = sentTo.get() || (F.signedIn ? H.ACCOUNT.email : "");
    return `<div class="b-sent" tabindex="-1" data-sent>
      <h2 class="ok-title disp">${F.okTitle("Đã gửi")}</h2>
      <p class="b-sent-to">Trả lời trong ${H.CONTACT.answerHours} giờ tới ${to ? `<b>${F.esc(to)}</b>` : "email hoặc số điện thoại bạn để lại"}</p>
      <div class="b-sent-acts">
        <a class="btn btn-blue" href="${F.esc(F.url("home.html"))}">Tiếp tục mua</a>
        <button class="btn btn-line" type="button" data-again>Gửi tin khác</button>
      </div>
    </div>`;
  }

  const side = () => `<aside class="b-cside" aria-label="Kênh khác">
      <div class="b-slot" role="note"><b>Số điện thoại và email cửa hàng</b><span>Đang chuẩn bị</span></div>
    </aside>`;

  el.innerHTML = `<div class="b-head"><h1 class="b-title disp">Liên hệ</h1></div><div class="b-contact" data-cbody></div>`;
  const body = el.querySelector("[data-cbody]");

  function render(focus) {
    body.innerHTML = (st.sent ? sent() : form()) + side();
    if (focus === "sent") { const s = el.querySelector("[data-sent]"); if (s) s.focus(); }
    if (focus === "error") { const f = el.querySelector('[aria-invalid="true"]'); if (f) f.focus(); }
    if (focus === "name") { const f = el.querySelector("#f-name"); if (f) f.focus(); }
  }

  function writeUrl() {
    const p = new URLSearchParams();
    if (st.sent) p.set("sent", "1");
    if (F.MODE !== "open") p.set("state", F.MODE);
    if (!F.signedIn) p.set("auth", "out");
    const s = p.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
  }

  // ---------------------------------------------------------------- actions
  el.addEventListener("submit", (e) => {
    e.preventDefault();
    if (st.busy) return;
    const f = e.target;
    Object.assign(st, { name: f.name.value, reach: f.reach.value, order: f.order.value, msg: f.msg.value });
    st.errors = validate();
    if (Object.keys(st.errors).length) { render("error"); return; }
    st.busy = true;
    render();
    setTimeout(() => {
      st.busy = false;
      st.sent = true;
      sentTo.set(st.reach.trim());
      writeUrl();
      render("sent");
    }, 500);
  });

  // An error clears as soon as its field is edited; the order chips follow the field.
  el.addEventListener("input", (e) => {
    const k = e.target.name;
    if (!k) return;
    st[k] = e.target.value;
    if (k === "order") el.querySelectorAll("[data-oc]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.oc === e.target.value.trim().toUpperCase())));
    if (!st.errors[k]) return;
    delete st.errors[k];
    el.querySelector(`[data-f="${k}"]`).classList.remove("is-error");
    e.target.removeAttribute("aria-invalid");
    const m = el.querySelector("#e-" + k);
    m.hidden = true;
    m.innerHTML = "";
  });

  el.addEventListener("click", (e) => {
    const c = e.target.closest("[data-oc]");
    if (c) {
      const input = el.querySelector("#f-order");
      const on = c.getAttribute("aria-pressed") === "true";
      input.value = on ? "" : c.dataset.oc;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (e.target.closest("[data-again]")) {
      st.sent = false;
      st.order = "";
      st.msg = "";
      st.errors = {};
      writeUrl();
      render("name");
    }
  });

  // The phone bar shows the title once the page's own has scrolled away.
  const bar = document.querySelector(".mbar");
  render();
  if (bar && "IntersectionObserver" in window) {
    bar.classList.add("title-late");
    new IntersectionObserver(([en]) => bar.classList.toggle("title-on", !en.isIntersecting), { rootMargin: "-56px 0px 0px 0px" })
      .observe(el.querySelector(".b-title"));
  }
  F.boot();
})();
