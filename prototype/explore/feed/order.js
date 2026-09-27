/*
 * One order (order.html?id=DH-1507). Its state is a timeline in Feed's story bars; under it, what the shopper can do
 * now, and only that:
 *   chờ chuyển khoản  the hold ticking, the amount and the memo to copy, the account being prepared, the QR slot; huỷ
 *   chờ xác nhận      (COD) the call before delivery; huỷ
 *   đang giao         the tracking code to copy
 *   đã giao           đổi trả while the window is open, mua lại for what is still sold
 *   đã huỷ            why, and mua lại
 * A return request sent from return.html (this device) shows here with what happens next.
 * Then the pieces, the totals as paid, delivery and payment. Unknown id: not found. ?auth=out: the way in.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const A = window.ACC;
  const H = F.H;
  const el = document.querySelector("[data-order]");
  const q = new URLSearchParams(location.search);
  const code = (q.get("id") || "").trim().toUpperCase();
  const o = H.findOrder(code);
  const st0 = o && A.status(o);

  // ---------------------------------------------------------------- not found, signed out
  if (!F.signedIn) {
    el.innerHTML = `<h1 class="vh">Đơn ${F.esc(code)}</h1>` +
      A.signedOut({ title: code ? "Đăng nhập để xem đơn " + code : "Đăng nhập để xem đơn", perks: false, id: "out-order" }) +
      A.lookupForm("od", o ? code : "");
    document.querySelector("[data-foot]").dataset.footSkip = "track.html";
    F.boot();
    return;
  }
  if (!o || !st0) {
    document.title = "Không tìm thấy đơn | HIVE";
    el.innerHTML = `<div class="nf">
        <h1 class="nf-title disp">Không tìm thấy đơn${code ? " " + F.esc(code) : ""}</h1>
        <div class="nf-acts">
          <a class="btn btn-blue" href="${F.url("orders.html")}">Xem đơn hàng</a>
          <a class="btn btn-line" href="${F.url("track.html")}">Tra cứu đơn</a>
        </div>
      </div>`;
    F.boot();
    return;
  }

  document.title = `${o.code} | HIVE`;
  const barTitle = document.querySelector(".mbar-title");
  if (barTitle) barTitle.textContent = o.code;

  const PAY_LABEL = Object.fromEntries(H.PAYMENTS.map((p) => [p.method, p.label]));
  const t = H.orderTotals(o);

  // ---------------------------------------------------------------- what the shopper can do now
  function holdCard(st) {
    return `<section class="od-act" id="pay" aria-label="Chuyển khoản">
      <p class="od-hold"><span class="cd-big" data-until="${st.dueAt}" role="timer" aria-label="Thời gian giữ hàng còn lại">${F.cdHTML(st.dueAt)}</span></p>
      <p class="od-act-line">Giữ hàng tới <b>${H.when(st.dueAt)}</b>. Quá giờ, đơn tự huỷ và ${t.units} chiếc về kệ.</p>
      <div class="od-pay">
        ${copyRow("Số tiền", H.vnd(t.total), String(t.total), "v-amount")}
        ${copyRow("Nội dung", o.code.replace("-", ""), o.code.replace("-", ""), "v-memo")}
        <div class="copyrow is-pending"><span class="copy-k">Tài khoản</span><span class="copy-v">Số tài khoản và tên ngân hàng đang chuẩn bị</span></div>
        <div class="qr-slot" role="img" aria-label="Chỗ của mã QR nhận tiền, hiện khi có tài khoản ngân hàng thật">
          <b>Mã QR nhận tiền</b><span>Hiện khi có tài khoản ngân hàng thật</span>
        </div>
      </div>
      <button class="btn btn-line od-cancel" type="button" data-cancel>Huỷ đơn</button>
    </section>`;
  }

  function copyRow(label, shown, value, id) {
    return `<div class="copyrow"><span class="copy-k">${label}</span><b class="copy-v" id="${id}">${shown}</b>
      <button class="copy" type="button" data-copy="${F.esc(value)}" data-target="${id}" aria-label="Chép ${label.toLowerCase()}">${F.icon("copy")}<span data-copy-label>Chép</span></button></div>`;
  }

  function requestCard(req) {
    // The pieces by name (the order's items are listed right below, so no pictures here).
    const pieces = req.items.map((it) => {
      const s = H.findAny(it.slug);
      return `${s ? s.name : it.slug} ${(H.COLORS[it.color] || {}).label.toLowerCase()} ${it.size}${it.qty > 1 ? " ×" + it.qty : ""}`;
    }).join(", ");
    const what = req.resolution === "exchange"
      ? `Đổi sang size ${req.items.map((i) => i.toSize).filter(Boolean).join(", ")}`
      : "Hoàn tiền" + (req.amount ? ` <b>${H.vnd(req.amount)}</b>` : "");
    const steps = [
      { label: "Đã gửi", at: req.sentAt, cls: "is-done" },
      { label: "Cửa hàng xem", at: null, cls: "is-now" },
      { label: "Gửi hàng về", at: null, cls: "" },
      { label: req.resolution === "exchange" ? "Đổi size" : "Hoàn tiền", at: null, cls: "" },
    ];
    return `<section class="od-act" aria-labelledby="h-rq">
      <h2 class="od-act-title" id="h-rq">Yêu cầu đổi trả ${F.esc(req.code)}</h2>
      <dl class="facts rq-facts">
        <div><dt>Món</dt><dd>${F.esc(pieces)}</dd></div>
        <div><dt>Lý do</dt><dd>${F.esc(req.reason)}</dd></div>
        <div><dt>Xử lý</dt><dd>${what}</dd></div>
      </dl>
      <ol class="osteps rq-steps" aria-label="Tiến trình đổi trả">${steps.map((s) =>
        `<li class="ostep ${s.cls}"${s.cls === "is-now" ? ' aria-current="step"' : ""}><div class="ostep-bar" aria-hidden="true"><i></i></div>
          <p class="ostep-label">${s.label}</p>${s.at ? `<p class="ostep-at">${A.at(s.at)}</p>` : ""}</li>`).join("")}</ol>
    </section>`;
  }

  function actions(st) {
    const again = A.buyAgain(o);
    const againBtn = again.length ? `<button class="btn btn-blue" type="button" data-again>${F.icon("arrows-clockwise")}Mua lại</button>` : "";
    if (st.state === "AWAITING_TRANSFER") return holdCard(st);
    if (st.state === "RECEIVED") {
      return `<section class="od-act" aria-label="Xác nhận đơn">
        <p class="od-act-line">Cửa hàng gọi <b>${F.esc(H.ACCOUNT.phone)}</b> để xác nhận trước khi giao.</p>
        <button class="btn btn-line od-cancel" type="button" data-cancel>Huỷ đơn</button>
      </section>`;
    }
    if (st.state === "SHIPPING" && st.tracking) {
      return `<section class="od-act" aria-label="Vận đơn">${copyRow("Mã vận đơn", F.esc(st.tracking), st.tracking, "v-track")}</section>`;
    }
    if (st.state === "DELIVERED") {
      const req = A.returnOf(o.code);
      if (req) return requestCard(req) + (againBtn ? `<div class="od-again">${againBtn}</div>` : "");
      const ret = A.canReturn(o)
        ? `<a class="btn btn-line" href="${F.url("return.html?id=" + o.code)}">${F.icon("arrow-u-up-left")}Đổi trả tới ${H.day(H.returnUntil(o))}</a>` : "";
      if (!ret && !againBtn) return "";
      return `<div class="od-btns">${ret}${againBtn}</div>`;
    }
    if (st.state === "CANCELLED") {
      return `<p class="od-why">${F.icon("x")}<span>${F.esc(st.reason)}. Hàng đã về kệ.</span></p>` + (againBtn ? `<div class="od-again">${againBtn}</div>` : "");
    }
    return "";
  }

  // ---------------------------------------------------------------- the page
  function render() {
    const st = A.status(o);
    // The order's address as it was placed (the address book may have changed since; the order does not).
    const a = H.ADDRESSES.find((x) => x.id === o.address) || null;
    el.innerHTML = `<div class="od">
      <section class="od-hero" data-hero>
        <h1 class="od-code disp">${o.code}</h1>
        <div class="od-meta">${H.orderGroups(o).map((g) => `<span class="chip-tag">${A.groupLabel(g)}</span>`).join("")}</div>
      </section>
      <div class="od-left">
        <div class="od-steps">${A.steps(o, st)}</div>
        ${actions(st)}
        <section class="acc-sec" aria-labelledby="h-items">
          <div class="acc-sec-head"><h2 class="acc-sec-title" id="h-items">${t.units} món</h2></div>
          ${A.items(o)}
        </section>
      </div>
      <div class="od-right">
        <section class="acc-sec od-sum" aria-labelledby="h-sum">
          <div class="acc-sec-head"><h2 class="acc-sec-title" id="h-sum">Tóm tắt</h2></div>
          ${A.totals(o)}
        </section>
        <section class="acc-sec" aria-labelledby="h-ship">
          <div class="acc-sec-head"><h2 class="acc-sec-title" id="h-ship">Giao tới</h2></div>
          <dl class="facts od-facts">
            ${a ? `<div><dt>Người nhận</dt><dd>${F.esc(a.recipient)}, ${F.esc(a.phone)}</dd></div>
            <div><dt>Địa chỉ</dt><dd>${F.esc(A.addrLine(a))}</dd></div>` : ""}
            <div><dt>Cách giao</dt><dd>${F.esc((H.DELIVERY.find((d) => d.method === o.delivery) || H.DELIVERY[0]).label)}</dd></div>
            <div><dt>Thanh toán</dt><dd>${F.esc(PAY_LABEL[o.payment] || "")}</dd></div>
          </dl>
        </section>
      </div>
    </div>`;
    A.revealTitleOn(el.querySelector("[data-hero]"));
    F.tick();
  }

  // ---------------------------------------------------------------- cancel (confirm sheet), copy, buy again
  const sheet = F.makeSheet("sheet-cancel", "cancel-title");
  function openCancel(opener) {
    sheet.innerHTML = `<div class="sheet-panel">
      <div class="grab" aria-hidden="true"></div>
      <div class="sh-head plain"><h2 class="sh-title" id="cancel-title">Huỷ đơn ${o.code}?</h2>
        <button class="sh-x" type="button" data-close aria-label="Đóng">${F.icon("x")}</button></div>
      <p class="cancel-line">${t.units} chiếc về kệ ngay, không hoàn tác.</p>
      <div class="stack">
        <button class="btn btn-blue" type="button" data-close data-autofocus>Giữ đơn</button>
        <button class="btn btn-line" type="button" data-cancel-yes>Huỷ đơn</button>
      </div>
    </div>`;
    sheet.querySelector("[data-cancel-yes]").onclick = () => {
      F.closeSheet(sheet, () => {
        A.cancelOrder(o.code);
        render();
        F.toast(`Đã huỷ ${o.code}`);
        scrollTo(0, 0);
        const h = el.querySelector(".od-code");
        if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      });
    };
    F.openSheet(sheet, opener);
  }

  el.addEventListener("click", (e) => {
    const c = e.target.closest("[data-cancel]");
    if (c) { openCancel(c); return; }
    const cp = e.target.closest("[data-copy]");
    if (cp) { F.copy(cp, cp.dataset.copy, document.getElementById(cp.dataset.target)); return; }
    if (e.target.closest("[data-again]")) {
      A.buyAgain(o).forEach((l) => {
        F.cart.add(l.slug, l.color, l.size);
        const left = H.stockOf(l.slug, l.color, l.size);
        const now = F.cart.items().find((i) => i.slug === l.slug && i.color === l.color && i.size === l.size);
        if (now && l.qty > 1) F.cart.setQty(l.slug, l.color, l.size, Math.min(left, now.qty - 1 + l.qty));
      });
      location.href = F.url("cart.html");
    }
  });

  render();
  F.boot();
})();
