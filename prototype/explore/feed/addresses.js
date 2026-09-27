/*
 * Địa chỉ (addresses.html): the saved addresses, the default one first and ringed. Add or edit in a sheet with the
 * checkout's two-tier pickers (tỉnh / thành, then phường / xã, both searchable); set default; delete with undo.
 * The book lives on this device. &add=1 opens the add sheet, &edit=a2 the edit sheet for that address.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const A = window.ACC;
  const H = F.H;
  const R = window.HIVE_REGIONS;
  const el = document.querySelector("[data-addresses]");
  const q = new URLSearchParams(location.search);
  const LABELS = ["Nhà", "Công ty", "Khác"];

  const head = `<h1 class="acc-h1 disp" data-hero>Địa chỉ</h1>`;
  if (!F.signedIn) {
    el.innerHTML = head + A.signedOut({ title: "Đăng nhập để lưu địa chỉ", perks: false, id: "out-ad" });
    A.revealTitleOn(el.querySelector("[data-hero]"));
    F.boot();
    return;
  }

  // ---------------------------------------------------------------- list
  function card(a) {
    return `<article class="ad${a.isDefault ? " is-default" : ""}" data-ad="${a.id}" aria-labelledby="ad-${a.id}">
      <div class="ad-top"><h2 class="ad-label disp" id="ad-${a.id}">${F.esc(a.label)}</h2>
        ${a.isDefault ? `<span class="chip-ink">${F.icon("check")}Mặc định</span>` : ""}</div>
      <p class="ad-who">${F.esc(a.recipient)}, ${F.esc(a.phone)}</p>
      <p class="ad-where">${F.esc(A.addrLine(a))}</p>
      <div class="ad-acts">
        <button class="pill" type="button" data-edit="${a.id}" aria-label="Sửa địa chỉ ${F.esc(a.label)}">${F.icon("pencil-simple")}Sửa</button>
        ${a.isDefault ? "" : `<button class="pill" type="button" data-default="${a.id}">Đặt mặc định</button>`}
        <button class="pill" type="button" data-delete="${a.id}" aria-label="Xoá địa chỉ ${F.esc(a.label)}">${F.icon("trash")}Xoá</button>
      </div>
    </article>`;
  }

  function render(focusSel) {
    const list = A.addresses().slice().sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    el.innerHTML = head + (list.length
      ? `<div class="ad-list">${list.map(card).join("")}</div>
         <button class="btn btn-line ad-add" type="button" data-add>${F.icon("plus")}Thêm địa chỉ</button>`
      : `<div class="empty-state">
           <span class="empty-ic">${F.icon("map-pin")}</span>
           <p class="empty-title">Chưa có địa chỉ</p>
           <button class="btn btn-blue" type="button" data-add>Thêm địa chỉ</button>
         </div>`);
    A.revealTitleOn(el.querySelector("[data-hero]"));
    if (focusSel) {
      const f = el.querySelector(focusSel) || el.querySelector("[data-add]");
      if (f) f.focus({ preventScroll: true });
    }
  }

  // ---------------------------------------------------------------- the sheet: add or edit
  const sheet = F.makeSheet("sheet-ad", "ad-title");
  let draft = null;

  function provinceName(code) { const p = R.provinces.find((x) => x.code === code); return p ? p.name : ""; }
  function wardLabel(pc, wc) { const w = (R.wards[pc] || []).find((x) => x[0] === wc); return w ? w[2] + " " + w[1] : ""; }

  function openForm(id, opener, showErrors) {
    const a = id ? A.addresses().find((x) => x.id === id) : null;
    const p = A.profile();
    draft = a ? Object.assign({}, a) : {
      id: null, label: LABELS.find((l) => !A.addresses().some((x) => x.label === l)) || "Khác",
      recipient: p.name, phone: p.phone, street: "", province: null, ward: null, isDefault: !A.addresses().length,
    };
    const field = (name, label, value, attrs) => `<label class="field" data-f="${name}"><span class="lbl">${label}</span>
      <input name="${name}" value="${F.esc(value || "")}" aria-describedby="e-${name}" ${attrs || ""}>
      <span class="err" id="e-${name}" hidden></span></label>`;
    const pick = (name, label) => `<div class="field" data-f="${name}"><span class="lbl" id="l-${name}">${label}</span>
      <button class="pick" type="button" id="f-${name}" data-pick="${name}" aria-haspopup="dialog" aria-labelledby="l-${name} v-${name}" aria-describedby="e-${name}">
        <span class="pick-v" id="v-${name}"></span>${F.icon("caret-down")}</button>
      <span class="err" id="e-${name}" hidden></span></div>`;
    sheet.innerHTML = `<div class="sheet-panel">
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head plain"><h2 class="sh-title" id="ad-title">${a ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h2>
        <button class="sh-x" type="button" data-close aria-label="Đóng">${F.icon("x")}</button></div>
      <form class="sheet-form" novalidate data-ad-form>
        <div class="field"><span class="lbl" id="l-label">Tên địa chỉ</span>
          <div class="lbl-chips" role="radiogroup" aria-labelledby="l-label">${LABELS.map((l) => `<label class="lbl-chip"><input type="radio" name="label" value="${l}"${draft.label === l ? " checked" : ""}>${l}</label>`).join("")}</div></div>
        ${field("recipient", "Người nhận", draft.recipient, 'autocomplete="name"')}
        ${field("phone", "Số điện thoại", draft.phone, 'type="tel" inputmode="tel" autocomplete="tel"')}
        <div class="co-pair">${pick("province", "Tỉnh / thành")}${pick("ward", "Phường / xã")}</div>
        ${field("street", "Số nhà, đường", draft.street, 'autocomplete="address-line1" placeholder="VD: 12 Nguyễn Huệ"')}
        <label class="toggle-row"><span>Đặt làm mặc định</span>
          <span class="switch"><input type="checkbox" name="isDefault"${draft.isDefault ? " checked" : ""}${a && a.isDefault ? " disabled" : ""}></span></label>
        <button class="btn btn-blue" type="submit">Lưu địa chỉ</button>
      </form>
    </div>`;
    paintPicks();
    if (showErrors) check(true);
    F.openSheet(sheet, opener);
  }

  function paintPicks() {
    const pv = sheet.querySelector("#v-province");
    pv.textContent = draft.province ? provinceName(draft.province) : "Chọn tỉnh / thành";
    pv.classList.toggle("is-empty", !draft.province);
    const wb = sheet.querySelector("#f-ward");
    wb.disabled = !draft.province;
    const wv = sheet.querySelector("#v-ward");
    wv.textContent = draft.ward ? wardLabel(draft.province, draft.ward) : draft.province ? "Chọn phường / xã" : "Chọn tỉnh trước";
    wv.classList.toggle("is-empty", !draft.ward);
  }

  function setErr(name, msg) {
    const box = sheet.querySelector(`[data-f="${name}"]`);
    const err = box.querySelector(".err");
    box.classList.toggle("is-error", !!msg);
    err.hidden = !msg;
    err.innerHTML = msg ? `${F.icon("warning-circle")}<span>${msg}</span>` : "";
    const c = name === "province" || name === "ward" ? sheet.querySelector("#f-" + name) : sheet.querySelector(`[name="${name}"]`);
    if (msg) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid");
    return msg ? c : null;
  }

  function check(show) {
    const f = sheet.querySelector("[data-ad-form]");
    const v = (n) => f[n].value.trim();
    const errs = {
      recipient: v("recipient").length >= 2 ? "" : "Nhập tên người nhận",
      phone: /^0\d{9}$/.test(v("phone").replace(/\D/g, "")) && /^[\d\s.]+$/.test(v("phone")) ? "" : v("phone") ? "Số điện thoại gồm 10 số, bắt đầu bằng 0" : "Nhập số điện thoại",
      province: draft.province ? "" : "Chọn tỉnh / thành",
      ward: !draft.province || draft.ward ? "" : "Chọn phường / xã",
      street: v("street") ? "" : "Nhập số nhà, đường",
    };
    let first = null;
    if (show) Object.keys(errs).forEach((k) => { const c = setErr(k, errs[k]); if (!first && c) first = c; });
    return { ok: Object.values(errs).every((x) => !x), first };
  }

  sheet.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pick]");
    if (!p) return;
    if (p.dataset.pick === "province") {
      F.openPicker({
        title: "Tỉnh / thành", placeholder: "Tìm tỉnh / thành", value: draft.province,
        items: R.provinces.map((x) => ({ value: x.code, label: x.name })),
        onPick: (it) => {
          if (it.value !== draft.province) { draft.province = it.value; draft.ward = null; }
          paintPicks();
          if (sheet.querySelector('[data-f="province"]').classList.contains("is-error")) { setErr("province", ""); }
          sheet.querySelector("#f-ward").focus();
        },
      }, p);
    } else if (draft.province) {
      F.openPicker({
        title: "Phường / xã", sub: provinceName(draft.province), placeholder: "Tìm phường / xã", value: draft.ward,
        items: R.wards[draft.province].map((w) => ({ value: w[0], label: w[2] + " " + w[1] })),
        onPick: (it) => {
          draft.ward = it.value;
          paintPicks();
          if (sheet.querySelector('[data-f="ward"]').classList.contains("is-error")) setErr("ward", "");
          sheet.querySelector('[name="street"]').focus();
        },
      }, p);
    }
  });

  sheet.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const r = check(true);
    if (!r.ok) { r.first.focus(); return; }
    const saved = Object.assign({}, draft, {
      label: f.label.value, recipient: f.recipient.value.trim(), phone: f.phone.value.trim(), street: f.street.value.trim(),
      isDefault: f.isDefault.checked || draft.isDefault,
    });
    let list = A.addresses();
    if (!saved.id) {
      saved.id = "a" + (list.reduce((m, a) => Math.max(m, Number(String(a.id).replace(/\D/g, "")) || 0), 0) + 1);
      list.push(saved);
    } else {
      list = list.map((a) => (a.id === saved.id ? saved : a));
    }
    if (saved.isDefault) list = list.map((a) => Object.assign(a, { isDefault: a.id === saved.id }));
    A.saveAddresses(list);
    F.closeSheet(sheet, () => {
      render(`[data-edit="${saved.id}"]`);
      F.toast(draft.id ? "Đã lưu địa chỉ" : "Đã thêm địa chỉ");
    });
  });

  // ---------------------------------------------------------------- list actions
  el.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { openForm(null, add); return; }
    const ed = e.target.closest("[data-edit]");
    if (ed) { openForm(ed.dataset.edit, ed); return; }
    const df = e.target.closest("[data-default]");
    if (df) {
      A.saveAddresses(A.addresses().map((a) => Object.assign(a, { isDefault: a.id === df.dataset.default })));
      const a = A.addresses().find((x) => x.id === df.dataset.default);
      render(`[data-edit="${df.dataset.default}"]`);
      F.toast(`${a.label} là địa chỉ mặc định`);
      return;
    }
    const del = e.target.closest("[data-delete]");
    if (del) {
      const before = A.addresses();
      const gone = before.find((a) => a.id === del.dataset.delete);
      let list = before.filter((a) => a.id !== gone.id).map((a) => Object.assign({}, a));
      if (gone.isDefault && list.length && !list.some((a) => a.isDefault)) list[0].isDefault = true;
      A.saveAddresses(list);
      render("[data-edit]");
      F.toast(`Đã xoá ${gone.label}`, {
        label: "Hoàn tác",
        run() { A.saveAddresses(before); render(`[data-edit="${gone.id}"]`); },
      });
    }
  });

  render();
  if (q.get("add") === "1") openForm(null, el.querySelector("[data-add]"), q.get("errors") === "1");
  else if (q.get("edit") && A.addresses().some((a) => a.id === q.get("edit"))) openForm(q.get("edit"), el.querySelector(`[data-edit="${q.get("edit")}"]`));
  F.boot();
})();
