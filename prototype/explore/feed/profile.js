/*
 * Hồ sơ (profile.html): name, phone, email (a new email waits for its confirmation link, and says so), Size của tôi
 * (áo, quần), the password in a sheet, the notification settings on notifications.html, sign out. Deleting the account
 * is being prepared, as in the running app. Edits are kept on this device. &errors=1 shows a submit with errors.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const A = window.ACC;
  const H = F.H;
  const el = document.querySelector("[data-profile]");
  const q = new URLSearchParams(location.search);

  const head = `<h1 class="acc-h1 disp" data-hero>Hồ sơ</h1>`;
  if (!F.signedIn) {
    el.innerHTML = head + A.signedOut({ title: "Đăng nhập để sửa hồ sơ", perks: false, id: "out-pf" });
    A.revealTitleOn(el.querySelector("[data-hero]"));
    F.boot();
    return;
  }

  const p = A.profile();
  const errors = q.get("errors") === "1";
  const shown = errors ? { name: "", phone: "0901 2345", email: "khoa@" } : { name: p.name, phone: p.phone, email: p.email };

  const field = (name, label, value, attrs, opt) => `<label class="field" data-f="${name}"><span class="lbl">${label}${opt ? ` <span class="opt">${opt}</span>` : ""}</span>
    <input name="${name}" value="${F.esc(value)}" aria-describedby="e-${name}${name === "email" ? " n-email" : ""}" ${attrs || ""}>
    <span class="err" id="e-${name}" hidden></span>
    ${name === "email" ? '<span class="pf-note" id="n-email" hidden></span>' : ""}</label>`;

  const sizeRow = (key, label, ic) => `<div class="pf-size-row">
      <div class="pf-size-head"><p class="pf-size-label" id="sz-${key}">${F.icon(ic)}${label}</p>
        <button class="link pf-clear" type="button" data-clear-size="${key}"${p.sizes[key] ? "" : " hidden"}>Bỏ chọn</button></div>
      <div class="sizes" role="radiogroup" aria-labelledby="sz-${key}">${H.SIZES.map((z) => `<label class="size"><input type="radio" name="size-${key}" value="${z}"${p.sizes[key] === z ? " checked" : ""}><span class="sz">${z}</span></label>`).join("")}</div>
    </div>`;

  el.innerHTML = head + `<div class="pf">
      <section class="pf-sec" aria-labelledby="pf-info">
        <h2 class="acc-sec-title" id="pf-info">Thông tin</h2>
        <form class="pf-form" novalidate data-pf-form>
          ${field("name", "Họ và tên", shown.name, 'autocomplete="name"')}
          ${field("phone", "Số điện thoại", shown.phone, 'type="tel" inputmode="tel" autocomplete="tel"')}
          ${field("email", "Email", shown.email, 'type="email" autocomplete="email"')}
          <button class="btn btn-blue pf-save" type="submit">Lưu</button>
        </form>
      </section>
      <section class="pf-sec" id="size" aria-labelledby="pf-size">
        <h2 class="acc-sec-title" id="pf-size">Size của tôi</h2>
        <div class="pf-size">${sizeRow("top", "Áo", "t-shirt")}${sizeRow("bottom", "Quần", "pants")}</div>
      </section>
      <section class="pf-sec" aria-labelledby="pf-more">
        <h2 class="vh" id="pf-more">Khác</h2>
        <div class="me-rows">
          <button class="me-row" type="button" data-password>${F.icon("lock-simple")}<span>Đổi mật khẩu</span>${F.icon("caret-right")}</button>
          <a class="me-row" href="${F.url("notifications.html#cai-dat")}">${F.icon("bell")}<span>Cài đặt thông báo</span>${F.icon("caret-right")}</a>
          <button class="me-row pf-out" type="button" data-sign-out>${F.icon("sign-out")}<span>Đăng xuất</span></button>
        </div>
        <div class="me-rows pf-danger">
          <div class="me-row" aria-disabled="true">${F.icon("trash")}<span>Xoá tài khoản</span><span class="me-row-sub">Đang chuẩn bị</span></div>
        </div>
      </section>
    </div>`;
  A.revealTitleOn(el.querySelector("[data-hero]"));

  // ---------------------------------------------------------------- the details form
  const form = el.querySelector("[data-pf-form]");
  const rules = {
    name: (v) => (v.length >= 2 ? "" : "Nhập họ và tên"),
    phone: (v) => (!v ? "Nhập số điện thoại" : /^[\d\s.]+$/.test(v) && /^0\d{9}$/.test(v.replace(/\D/g, "")) ? "" : "Số điện thoại gồm 10 số, bắt đầu bằng 0"),
    email: (v) => (!v ? "Nhập email" : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Email chưa đúng"),
  };
  let submitted = errors;
  function validate() {
    let first = null;
    Object.keys(rules).forEach((k) => {
      const msg = submitted ? rules[k](form[k].value.trim()) : "";
      const box = form.querySelector(`[data-f="${k}"]`);
      const err = box.querySelector(".err");
      box.classList.toggle("is-error", !!msg);
      err.hidden = !msg;
      err.innerHTML = msg ? `${F.icon("warning-circle")}<span>${msg}</span>` : "";
      if (msg) { form[k].setAttribute("aria-invalid", "true"); if (!first) first = form[k]; } else form[k].removeAttribute("aria-invalid");
    });
    return first;
  }
  // A new email is not the account's email until its link is opened.
  function paintEmailNote() {
    const note = form.querySelector("#n-email");
    const v = form.email.value.trim();
    const changed = v && v !== A.profile().email && !rules.email(v);
    note.hidden = !changed;
    note.innerHTML = changed ? `${F.icon("envelope-simple")}<span>Liên kết xác nhận gửi tới ${F.esc(v)}. Email cũ dùng tới khi xác nhận.</span>` : "";
  }
  form.addEventListener("input", () => { if (submitted) validate(); paintEmailNote(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitted = true;
    const first = validate();
    if (first) { first.focus(); return; }
    const cur = A.profile();
    const email = form.email.value.trim();
    A.saveProfile(Object.assign({}, cur, { name: form.name.value.trim(), phone: form.phone.value.trim(), sizes: cur.sizes }));
    paintEmailNote();
    F.toast(email !== cur.email ? "Đã lưu. Mở liên kết trong email mới để đổi email" : "Đã lưu hồ sơ");
  });
  if (errors) validate();

  // ---------------------------------------------------------------- Size của tôi: saved as soon as it is picked
  function saveSize(key, value) {
    const cur = A.profile();
    A.saveProfile(Object.assign({}, cur, { sizes: Object.assign({}, cur.sizes, { [key]: value }) }));
    el.querySelector(`[data-clear-size="${key}"]`).hidden = !value;
  }
  el.addEventListener("change", (e) => {
    const t = e.target;
    if (!t.name || !t.name.startsWith("size-")) return;
    const key = t.name.slice(5);
    saveSize(key, t.value);
    F.toast(`Size ${key === "top" ? "áo" : "quần"}: ${t.value}`);
  });
  el.addEventListener("click", (e) => {
    const c = e.target.closest("[data-clear-size]");
    if (!c) return;
    const key = c.dataset.clearSize;
    el.querySelectorAll(`input[name="size-${key}"]`).forEach((i) => { i.checked = false; });
    saveSize(key, null);
    el.querySelector(`input[name="size-${key}"]`).focus();
    F.toast(`Đã bỏ size ${key === "top" ? "áo" : "quần"}`);
  });

  // ---------------------------------------------------------------- password in a sheet
  const sheet = F.makeSheet("sheet-pw", "pw-title");
  function openPassword(opener) {
    // The show/hide button may not sit inside a <label>: the text names the input through aria-labelledby.
    const pf = (name, label, ac) => `<div class="field" data-f="${name}"><span class="lbl" id="l-pw-${name}">${label}</span>
      <span class="si-pass"><input name="${name}" type="password" autocomplete="${ac}" aria-labelledby="l-pw-${name}" aria-describedby="e-${name}">
        <button class="si-eye" type="button" data-eye aria-label="Hiện mật khẩu" aria-pressed="false">${F.icon("eye")}</button></span>
      <span class="err" id="e-${name}" hidden></span></div>`;
    sheet.innerHTML = `<div class="sheet-panel">
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head plain"><h2 class="sh-title" id="pw-title">Đổi mật khẩu</h2>
        <button class="sh-x" type="button" data-close aria-label="Đóng">${F.icon("x")}</button></div>
      <form class="sheet-form" novalidate data-pw-form>
        ${pf("current", "Mật khẩu hiện tại", "current-password")}
        ${pf("next", "Mật khẩu mới", "new-password")}
        ${pf("again", "Nhập lại mật khẩu mới", "new-password")}
        <button class="btn btn-blue" type="submit">Đổi mật khẩu</button>
      </form>
    </div>`;
    F.openSheet(sheet, opener);
    sheet.querySelector('[name="current"]').focus();
  }
  sheet.addEventListener("click", (e) => {
    const eye = e.target.closest("[data-eye]");
    if (!eye) return;
    const input = eye.parentElement.querySelector("input");
    const on = input.type === "password";
    input.type = on ? "text" : "password";
    eye.setAttribute("aria-pressed", String(on));
    eye.setAttribute("aria-label", on ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    eye.innerHTML = F.icon(on ? "eye-slash" : "eye");
  });
  sheet.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const v = (n) => f[n].value;
    const errs = {
      current: v("current") ? "" : "Nhập mật khẩu hiện tại",
      next: v("next").length >= 8 ? "" : "Mật khẩu mới từ 8 ký tự",
      again: v("again") && v("again") === v("next") ? "" : "Hai mật khẩu mới chưa khớp",
    };
    let first = null;
    Object.keys(errs).forEach((k) => {
      const box = f.querySelector(`[data-f="${k}"]`);
      const err = box.querySelector(".err");
      box.classList.toggle("is-error", !!errs[k]);
      err.hidden = !errs[k];
      err.innerHTML = errs[k] ? `${F.icon("warning-circle")}<span>${errs[k]}</span>` : "";
      if (errs[k]) { f[k].setAttribute("aria-invalid", "true"); if (!first) first = f[k]; } else f[k].removeAttribute("aria-invalid");
    });
    if (first) { first.focus(); return; }
    F.closeSheet(sheet, () => F.toast("Đã đổi mật khẩu"));
  });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-password]");
    if (b) openPassword(b);
  });

  if (location.hash === "#size") {
    const s = document.getElementById("size");
    if (s) requestAnimationFrame(() => s.scrollIntoView({ block: "start" }));
  }
  F.boot();
})();
