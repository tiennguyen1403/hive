/*
 * Checkout ("Thanh toán"): one scrolling screen of grouped sections, as a guest. Liên hệ; Địa chỉ in the two tiers
 * the country uses since July 2025 (tỉnh / thành, then phường / xã, both picked in a searchable sheet); Giao hàng
 * (express only inside TP. Hồ Chí Minh); Thanh toán with the consequence of each choice; Mã giảm giá; Tóm tắt;
 * ghi chú. Errors show under each field after a submit. Placing the order goes to order-confirmed.html.
 * Demo states: ?fill=1 (filled and valid, TP. Hồ Chí Minh), ?errors=1 (submitted with errors), ?tinh=<code> (a province).
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const R = window.HIVE_REGIONS;
  const q = new URLSearchParams(location.search);
  const el = document.querySelector("[data-cop]");
  const PAYKEY = { BANK_TRANSFER: "transfer", COD: "cod", CARD: "card" };
  const PAY_IC = { BANK_TRANSFER: "bank", COD: "money", CARD: "credit-card" };
  // Card pays by transfer while the gateway is not connected (HIVE.paysByTransfer); the transfer card above already
  // states the 12-hour hold, so the card's note keeps only what differs.
  const PAY_NOTE = { CARD: "Tạm thời trả bằng chuyển khoản." };
  const HCM = H.EXPRESS_PROVINCE;

  const items = F.cart.items().filter((i) => H.find(i.slug));
  const stuck = items.some((i) => {
    const L = H.line(i);
    return F.closedStyle(L.style) || L.gone || L.short;
  });

  const province = (code) => R.provinces.find((p) => p.code === code) || null;
  const ward = (pcode, wcode) => {
    const w = (R.wards[pcode] || []).find((x) => x[0] === wcode);
    return w ? { code: w[0], name: w[1], prefix: w[2], label: w[2] + " " + w[1] } : null;
  };

  // ---------------------------------------------------------------- nothing to pay for, or a line to fix first
  if (!items.length || stuck) {
    el.innerHTML = `<h1 class="vh">Thanh toán</h1><div class="empty-state">
        <span class="empty-ic">${F.icon(stuck ? "warning-circle" : "bag")}</span>
        <p class="empty-title">${stuck ? "Giỏ còn món đang vướng" : "Chưa có gì để thanh toán"}</p>
        <a class="btn btn-blue" href="${F.url(stuck ? "cart.html" : "products.html")}">${stuck ? "Về giỏ" : "Xem Cửa hàng"}</a>
      </div>`;
    document.body.classList.add("is-empty");
    F.boot();
    return;
  }

  // ---------------------------------------------------------------- state and demo presets
  const st = { delivery: "STANDARD", payment: "BANK_TRANSFER", promo: null, promoError: "", province: null, ward: null, submitted: false };
  const DEMO = { name: "Trần Minh Khoa", phone: "0938 571 204", street: { [HCM]: "12 Nguyễn Huệ", "01": "25 Phan Đình Phùng" }, ward: { [HCM]: "70101063" } };
  const fill = q.get("fill") === "1";
  const errors = q.get("errors") === "1";
  const tinh = province(q.get("tinh") || "") ? q.get("tinh") : null;
  const pre = { name: "", phone: "", email: "", street: "", note: "", promoText: "" };
  if (fill) {
    st.province = tinh || HCM;
    st.ward = DEMO.ward[st.province] || R.wards[st.province][0][0];
    Object.assign(pre, { name: DEMO.name, phone: DEMO.phone, street: DEMO.street[st.province] || DEMO.street[HCM] });
    const p = H.promo("DOT05", H.checkout(items).subtotal);
    if (p.ok) st.promo = "DOT05";
  } else if (tinh) {
    st.province = tinh;
  }
  if (errors) {
    Object.assign(pre, { name: "", phone: "0901 2345", email: "khoa@", street: "", promoText: "VIP20" });
    st.province = null; st.ward = null; st.submitted = true;
    const p = H.promo("VIP20", H.checkout(items).subtotal);
    st.promoError = p.ok ? "" : p.error;
  }

  // ---------------------------------------------------------------- markup
  const field = (id, label, input, opt) => `<label class="field" data-f="${id}">
      <span class="lbl">${label}${opt ? ` <span class="opt">${opt}</span>` : ""}</span>
      ${input}
      <span class="err" id="e-${id}" hidden></span>
    </label>`;
  const pickField = (id, label) => `<div class="field" data-f="${id}">
      <span class="lbl" id="l-${id}">${label}</span>
      <button class="pick" type="button" id="f-${id}" aria-haspopup="dialog" aria-labelledby="l-${id} v-${id}" aria-describedby="e-${id}">
        <span class="pick-v" id="v-${id}"></span>${F.icon("caret-down")}
      </button>
      <span class="err" id="e-${id}" hidden></span>
    </div>`;

  const deliveryCards = H.DELIVERY.map((d) => `<label class="rcard" data-method="${d.method}">
      <input type="radio" name="delivery" value="${d.method}"${d.method === st.delivery ? " checked" : ""}>
      <span class="rcard-ic">${F.icon(d.method === "EXPRESS" ? "lightning" : "truck")}</span>
      <span class="rcard-main">
        <span class="rcard-title">${F.esc(d.label)}</span>
        <span class="rcard-sub">${d.days} · dự kiến ${H.deliveryWindow(d.method)}</span>
        ${d.note ? `<span class="rcard-note" data-note>${F.esc(d.note)}</span>` : ""}
      </span>
      <span class="rcard-price" data-price></span>
    </label>`).join("");

  const paymentCards = H.PAYMENTS.map((p) => `<label class="rcard" data-method="${p.method}">
      <input type="radio" name="payment" value="${p.method}"${p.method === st.payment ? " checked" : ""}>
      <span class="rcard-ic">${F.icon(PAY_IC[p.method])}</span>
      <span class="rcard-main">
        <span class="rcard-title">${F.esc(p.label)}</span>
        <span class="rcard-note">${F.esc(PAY_NOTE[p.method] || p.note)}</span>
      </span>
      ${p.fee ? `<span class="rcard-price">+${H.vnd(p.fee)}</span>` : ""}
    </label>`).join("");

  const lines = items.map((i) => {
    const L = H.line(i);
    return `<li class="co-item">
      <span class="co-thumb${L.fixed ? " flat" : ""}"><img src="${L.image}" width="48" height="60" alt="" loading="lazy" decoding="async"></span>
      <span class="co-item-main"><span class="co-item-name disp">${F.esc(L.style.name)}</span>
        <span class="co-item-meta">${F.esc(L.colorLabel)} · Size ${L.size}${L.qty > 1 ? ` · ×${L.qty}` : ""}</span></span>
      <span class="co-item-price">${H.vnd(L.total)}</span>
    </li>`;
  }).join("");
  const count = items.reduce((a, i) => a + i.qty, 0);

  el.innerHTML = `<h1 class="vh">Thanh toán</h1>
    <form class="co" id="co-form" novalidate>
      <section class="co-sec" data-area="contact" aria-labelledby="h-contact">
        <div class="co-sec-head"><h2 class="sect-title" id="h-contact">Liên hệ</h2><a class="link" href="#">Đăng nhập</a></div>
        ${field("name", "Họ và tên", `<input id="f-name" name="name" autocomplete="name" aria-describedby="e-name" value="${F.esc(pre.name)}">`)}
        ${field("phone", "Số điện thoại", `<input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="10 số, bắt đầu bằng 0" aria-describedby="e-phone" value="${F.esc(pre.phone)}">`)}
        ${field("email", "Email", `<input id="f-email" name="email" type="email" autocomplete="email" aria-describedby="e-email" value="${F.esc(pre.email)}">`, "tuỳ chọn")}
      </section>
      <section class="co-sec" data-area="address" aria-labelledby="h-address">
        <div class="co-sec-head"><h2 class="sect-title" id="h-address">Địa chỉ</h2></div>
        <div class="co-pair">${pickField("province", "Tỉnh / thành")}${pickField("ward", "Phường / xã")}</div>
        ${field("street", "Số nhà, đường", `<input id="f-street" name="street" autocomplete="address-line1" placeholder="VD: 12 Nguyễn Huệ" aria-describedby="e-street" value="${F.esc(pre.street)}">`)}
      </section>
      <section class="co-sec" data-area="delivery" aria-labelledby="h-delivery">
        <div class="co-sec-head"><h2 class="sect-title" id="h-delivery">Giao hàng</h2></div>
        <div class="rcards" role="radiogroup" aria-labelledby="h-delivery">${deliveryCards}</div>
      </section>
      <section class="co-sec" data-area="payment" aria-labelledby="h-payment">
        <div class="co-sec-head"><h2 class="sect-title" id="h-payment">Thanh toán</h2></div>
        <div class="rcards" role="radiogroup" aria-labelledby="h-payment">${paymentCards}</div>
      </section>
      <aside class="co-side" data-area="side" aria-label="Mã giảm giá và tóm tắt đơn">
        <section class="co-sec co-promo" aria-labelledby="h-promo">
          <h2 class="sect-title" id="h-promo">Mã giảm giá</h2>
          <div class="promo" data-promo-form>
            <label class="promo-field"><span class="vh">Mã giảm giá</span>
              <input id="f-promo" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Nhập mã" aria-describedby="e-promo" value="${F.esc(pre.promoText)}"></label>
            <button class="pill promo-go" type="button" data-promo-apply>Áp dụng</button>
          </div>
          <div class="promo-ok" data-promo-ok hidden></div>
          <span class="err" id="e-promo" hidden></span>
        </section>
        <section class="co-sec co-sum" aria-labelledby="h-sum">
          <div class="co-sec-head"><h2 class="sect-title" id="h-sum">Tóm tắt</h2><span class="co-count">${count} món</span></div>
          <ul class="co-items">${lines}</ul>
          <dl class="facts co-lines" data-lines></dl>
          <div class="csum-total"><span>Tổng</span><b data-total></b></div>
          <button class="btn btn-blue only-desk co-place" type="submit" data-place></button>
        </section>
      </aside>
      <section class="co-sec" data-area="note" aria-labelledby="h-note">
        <label class="field field-note">
          <span class="lbl" id="h-note">Ghi chú <span class="opt">tuỳ chọn</span></span>
          <textarea id="f-note" name="note" rows="3" placeholder="Giờ nhận, chỉ đường"></textarea>
        </label>
      </section>
      <div class="orderbar"><button class="btn btn-blue" type="submit" data-place></button></div>
    </form>`;

  const form = el.querySelector("#co-form");
  const $ = (s) => el.querySelector(s);

  // ---------------------------------------------------------------- validation
  const rules = {
    name: () => ($("#f-name").value.trim().length >= 2 ? "" : "Nhập họ và tên"),
    phone: () => {
      const v = $("#f-phone").value.trim();
      if (!v) return "Nhập số điện thoại";
      return /^[\d\s.]+$/.test(v) && /^0\d{9}$/.test(v.replace(/\D/g, "")) ? "" : "Số điện thoại gồm 10 số, bắt đầu bằng 0";
    },
    email: () => {
      const v = $("#f-email").value.trim();
      return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Email chưa đúng";
    },
    province: () => (st.province ? "" : "Chọn tỉnh / thành"),
    ward: () => (!st.province || st.ward ? "" : "Chọn phường / xã"),
    street: () => ($("#f-street").value.trim() ? "" : "Nhập số nhà, đường"),
  };
  const control = (k) => $(k === "province" || k === "ward" ? "#f-" + k : "#f-" + k);

  function paintErrors() {
    let first = null;
    Object.keys(rules).forEach((k) => {
      const msg = st.submitted ? rules[k]() : "";
      const box = $(`[data-f="${k}"]`);
      const err = $("#e-" + k);
      box.classList.toggle("is-error", !!msg);
      err.hidden = !msg;
      err.innerHTML = msg ? `${F.icon("warning-circle")}<span>${msg}</span>` : "";
      const c = control(k);
      if (msg) { c.setAttribute("aria-invalid", "true"); if (!first) first = c; } else c.removeAttribute("aria-invalid");
    });
    return first;
  }

  // ---------------------------------------------------------------- address pickers
  function paintAddress() {
    const p = province(st.province);
    const w = st.province && st.ward ? ward(st.province, st.ward) : null;
    const pv = $("#v-province");
    pv.textContent = p ? p.name : "Chọn tỉnh / thành";
    pv.classList.toggle("is-empty", !p);
    const wb = $("#f-ward");
    wb.disabled = !p;
    const wv = $("#v-ward");
    wv.textContent = w ? w.label : p ? "Chọn phường / xã" : "Chọn tỉnh trước";
    wv.classList.toggle("is-empty", !w);
  }

  function setProvince(code) {
    if (code === st.province) return;
    st.province = code;
    st.ward = null;
    const ex = !H.deliveryAvailable("EXPRESS", code);
    if (ex && st.delivery === "EXPRESS") {
      st.delivery = "STANDARD";
      $('input[name="delivery"][value="STANDARD"]').checked = true;
      F.toast("Giao nhanh chỉ trong TP. Hồ Chí Minh, đã chuyển sang giao tiêu chuẩn");
    }
    paintAddress();
    paintAll();
  }

  $("#f-province").addEventListener("click", (e) => {
    F.openPicker({
      title: "Tỉnh / thành", placeholder: "Tìm tỉnh / thành", value: st.province,
      items: R.provinces.map((p) => ({ value: p.code, label: p.name })),
      onPick: (it) => { setProvince(it.value); $("#f-ward").focus(); },
    }, e.currentTarget);
  });
  $("#f-ward").addEventListener("click", (e) => {
    if (!st.province) return;
    const p = province(st.province);
    F.openPicker({
      title: "Phường / xã", sub: p.name, placeholder: "Tìm phường / xã", value: st.ward,
      items: R.wards[st.province].map((w) => ({ value: w[0], label: w[2] + " " + w[1] })),
      onPick: (it) => { st.ward = it.value; paintAddress(); paintAll(); $("#f-street").focus(); },
    }, e.currentTarget);
  });

  // ---------------------------------------------------------------- promo
  function paintPromo() {
    const c = H.checkout(items, { delivery: st.delivery, payment: st.payment, promo: st.promo });
    const ok = $("[data-promo-ok]");
    const formRow = $("[data-promo-form]");
    const err = $("#e-promo");
    if (st.promo && c.promo && c.promo.ok) {
      ok.hidden = false;
      formRow.hidden = true;
      ok.innerHTML = `${F.icon("check-circle-fill")}<span class="promo-code">${F.esc(c.promo.code)}</span>
        <button class="link" type="button" data-promo-drop>Bỏ mã</button>`;
    } else {
      ok.hidden = true;
      formRow.hidden = false;
    }
    err.hidden = !st.promoError;
    err.innerHTML = st.promoError ? `${F.icon("warning-circle")}<span>${F.esc(st.promoError)}</span>` : "";
    $(".co-promo").classList.toggle("is-error", !!st.promoError);
    if (st.promoError) $("#f-promo").setAttribute("aria-invalid", "true"); else $("#f-promo").removeAttribute("aria-invalid");
  }
  function applyPromo() {
    const code = $("#f-promo").value.trim();
    if (!code) { st.promoError = "Nhập mã giảm giá"; paintPromo(); return; }
    const p = H.promo(code, H.checkout(items).subtotal);
    if (p.ok) { st.promo = p.code; st.promoError = ""; $("#f-promo").value = ""; }
    else { st.promo = null; st.promoError = p.error; }
    paintAll();
    if (p.ok) $("[data-promo-drop]").focus();
  }
  $("[data-promo-apply]").addEventListener("click", applyPromo);
  $("#f-promo").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } });
  $("#f-promo").addEventListener("input", () => { if (st.promoError) { st.promoError = ""; paintPromo(); } });
  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-promo-drop]")) { st.promo = null; paintAll(); $("#f-promo").focus(); }
  });

  // ---------------------------------------------------------------- delivery, payment, totals
  function paintAll() {
    const c = H.checkout(items, { delivery: st.delivery, payment: st.payment, promo: st.promo });
    // Delivery cards: prices and whether express reaches the chosen province.
    el.querySelectorAll('.rcard[data-method="STANDARD"], .rcard[data-method="EXPRESS"]').forEach((card) => {
      const m = card.dataset.method;
      const fee = H.shippingFee(m, c.subtotal);
      const off = !!st.province && !H.deliveryAvailable(m, st.province);
      const input = card.querySelector("input");
      input.disabled = off;
      card.classList.toggle("is-off", off);
      card.querySelector("[data-price]").textContent = off ? "" : fee ? H.vnd(fee) : "Miễn phí";
      const note = card.querySelector("[data-note]");
      if (note) note.textContent = off ? `Không giao nhanh tới ${province(st.province).name}` : H.DELIVERY.find((d) => d.method === m).note;
    });
    const rows = [["Tạm tính", H.vnd(c.subtotal)], ["Giao hàng", c.shipping ? H.vnd(c.shipping) : "Miễn phí"]];
    if (c.cod) rows.push(["Phụ phí COD", "+" + H.vnd(c.cod)]);
    if (c.promo && c.promo.ok) rows.push([`Mã ${c.promo.code}`, c.discount ? "-" + H.vnd(c.discount) : "Miễn phí giao"]);
    $("[data-lines]").innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    $("[data-total]").textContent = H.vnd(c.total);
    el.querySelectorAll("[data-place]").forEach((b) => { b.innerHTML = b.classList.contains("co-place") ? "Đặt hàng" : `Đặt hàng <span class="price">· ${H.vnd(c.total)}</span>`; });
    paintPromo();
    if (st.submitted) paintErrors();
    return c;
  }

  form.addEventListener("change", (e) => {
    if (e.target.name === "delivery") st.delivery = e.target.value;
    if (e.target.name === "payment") st.payment = e.target.value;
    paintAll();
  });
  form.addEventListener("input", (e) => {
    if (st.submitted && ["name", "phone", "email", "street"].includes(e.target.name)) paintErrors();
  });

  // ---------------------------------------------------------------- place the order
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    st.submitted = true;
    const first = paintErrors();
    if (first) {
      first.focus({ preventScroll: true });
      first.scrollIntoView({ block: "center", behavior: F.motion() ? "smooth" : "auto" });
      return;
    }
    const c = paintAll();
    const p = province(st.province);
    const w = ward(st.province, st.ward);
    F.store("order", null).set({
      code: H.ORDER.code, items, delivery: st.delivery, payment: st.payment, promo: c.discount ? st.promo : null,
      contact: { name: $("#f-name").value.trim(), phone: $("#f-phone").value.trim(), email: $("#f-email").value.trim() },
      address: { province: p.name, ward: w.label, street: $("#f-street").value.trim() },
      note: $("#f-note").value.trim(), placedAt: H.nowMs(),
    });
    F.cart.clear();
    location.href = F.url("order-confirmed.html?pay=" + PAYKEY[st.payment]);
  });

  paintAddress();
  paintAll();
  if (errors) paintErrors();
  F.boot();
})();
