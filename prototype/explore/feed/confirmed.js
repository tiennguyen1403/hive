/*
 * Order confirmed: DH-1507. ?pay=transfer (default) | cod | card picks the variant.
 * Transfer: the amount and the memo, each copyable; the account and bank are being prepared, so the QR is an empty
 * slot that says so; the 12-hour hold ticks down to its deadline. Card pays by transfer while the gateway is not
 * connected (HIVE.paysByTransfer), so it gets the same screen. COD states its own next step.
 * The order placed at checkout is read back from this device; opened directly, the page shows the demo basket.
 * (Round 2 named this file order.js; round 3 gave that name to the order page.)
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const q = new URLSearchParams(location.search);
  const el = document.querySelector("[data-okp]");
  const PAY = { transfer: "BANK_TRANSFER", cod: "COD", card: "CARD" };
  const key = PAY[q.get("pay")] ? q.get("pay") : "transfer";
  const payment = PAY[key];
  const byTransfer = H.paysByTransfer({ payment });

  // The screen means "just placed": the bag is empty from here on.
  F.cart.clear();
  const saved = F.store("order", null).get();
  const now = H.nowMs();
  const order = saved && Array.isArray(saved.items) && saved.items.length ? saved : {
    code: H.ORDER.code,
    // Opened directly: the demo basket, keeping only what the current moment could have sold.
    items: H.DEMO_CARTS.full.filter((i) => F.canBuy(H.find(i.slug))),
    delivery: "STANDARD",
    promo: null,
    contact: { name: "Trần Minh Khoa", phone: "0938 571 204", email: "" },
    address: { province: "TP. Hồ Chí Minh", ward: "Phường Sài Gòn", street: "12 Nguyễn Huệ" },
    placedAt: H.nowMs(),
  };
  const items = order.items.filter((i) => H.find(i.slug));
  const c = H.checkout(items, { delivery: order.delivery, payment, promo: order.promo });
  const pieces = items.reduce((a, i) => a + i.qty, 0);
  const placed = order.placedAt <= now && order.placedAt > now - 12 * 3600000 ? order.placedAt : now;
  const deadline = new Date(placed + 12 * 3600000).toISOString();
  const d = H.DELIVERY.find((x) => x.method === order.delivery) || H.DELIVERY[0];

  const NEXT = {
    transfer: "Chuyển khoản trong 12 giờ để giữ hàng.",
    cod: "Cửa hàng gọi xác nhận trước khi giao.",
  };
  const STEPS = {
    transfer: ["Đã đặt", "Chờ chuyển khoản", "Đang giao", "Đã giao"],
    cod: ["Đã đặt", "Gọi xác nhận", "Đang giao", "Đã giao"],
  };
  const flow = byTransfer ? "transfer" : "cod";

  const copyRow = (label, shown, value, id) => `<div class="copyrow">
      <span class="copy-k">${label}</span>
      <b class="copy-v" id="${id}">${shown}</b>
      <button class="copy" type="button" data-copy="${F.esc(value)}" data-target="${id}" aria-label="Chép ${label.toLowerCase()}">${F.icon("copy")}<span data-copy-label>Chép</span></button>
    </div>`;

  function payCard() {
    if (byTransfer) {
      return `<section class="paycard" aria-labelledby="h-pay">
        <h2 class="sect-title" id="h-pay">Chuyển khoản</h2>
        ${copyRow("Số tiền", H.vnd(c.total), String(c.total), "v-amount")}
        ${copyRow("Nội dung", H.ORDER.memo, H.ORDER.memo, "v-memo")}
        <div class="copyrow is-pending">
          <span class="copy-k">Tài khoản</span>
          <span class="copy-v">Số tài khoản và tên ngân hàng đang chuẩn bị</span>
        </div>
        <div class="qr-slot" role="img" aria-label="Chỗ của mã QR nhận tiền, hiện khi có tài khoản ngân hàng thật">
          <b>Mã QR nhận tiền</b><span>Hiện khi có tài khoản ngân hàng thật</span>
        </div>
      </section>
      <section class="hold" aria-labelledby="h-hold">
        <h2 class="sect-title" id="h-hold">Giữ hàng</h2>
        <p class="hold-cd"><span class="cd-big" data-until="${deadline}" role="timer">${F.cdHTML(deadline)}</span></p>
        <p class="hold-until">tới <b>${H.when(deadline)}</b></p>
        <p class="hold-note">Quá giờ, đơn tự huỷ và ${pieces} chiếc về kệ.</p>
      </section>`;
    }
    // COD: the next step is the line under the title; the amount is the summary's total.
    return "";
  }

  const track = `<section class="track" aria-labelledby="h-track">
      <h2 class="sect-title" id="h-track">Trạng thái</h2>
      <ol class="track-list">${STEPS[flow].map((s, i) => `<li class="${i === 0 ? "is-done" : i === 1 ? "is-now" : ""}"${i === 1 ? ' aria-current="step"' : ""}>
        <span class="track-dot">${i === 0 ? F.icon("check") : ""}</span><span>${s}</span></li>`).join("")}</ol>
    </section>`;

  const ship = `<section class="okship" aria-labelledby="h-ship">
      <h2 class="sect-title" id="h-ship">Giao hàng</h2>
      <dl class="facts">
        <div><dt>${F.esc(d.label)}</dt><dd>dự kiến ${H.deliveryWindow(d.method)}</dd></div>
        <div><dt>Người nhận</dt><dd>${F.esc(order.contact.name)}, ${F.esc(order.contact.phone)}</dd></div>
        <div><dt>Địa chỉ</dt><dd>${F.esc(order.address.street)}, ${F.esc(order.address.ward)}, ${F.esc(order.address.province)}</dd></div>
      </dl>
    </section>`;

  const rows = [["Tạm tính", H.vnd(c.subtotal)], ["Giao hàng", c.shipping ? H.vnd(c.shipping) : "Miễn phí"]];
  if (c.cod) rows.push(["Phụ phí COD", "+" + H.vnd(c.cod)]);
  if (c.discount) rows.push([`Mã ${c.promo.code}`, "-" + H.vnd(c.discount)]);
  const summary = `<section class="co-sum oksum" aria-labelledby="h-sum">
      <div class="co-sec-head"><h2 class="sect-title" id="h-sum">Tóm tắt</h2><span class="co-count">${pieces} món</span></div>
      <ul class="co-items">${items.map((i) => {
        const L = H.line(i);
        return `<li class="co-item">
          <span class="co-thumb${L.fixed ? " flat" : ""}"><img src="${L.image}" width="48" height="60" alt="" loading="lazy" decoding="async"></span>
          <span class="co-item-main"><span class="co-item-name disp">${F.esc(L.style.name)}</span>
            <span class="co-item-meta">${F.esc(L.colorLabel)} · Size ${L.size}${L.qty > 1 ? ` · ×${L.qty}` : ""}</span></span>
          <span class="co-item-price">${H.vnd(L.total)}</span>
        </li>`;
      }).join("")}</ul>
      <dl class="facts co-lines">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <div class="csum-total"><span>Tổng</span><b>${H.vnd(c.total)}</b></div>
    </section>`;

  // Round 3: the order now has its own page (signed in), or the guest lookup (signed out).
  const digits = String(order.contact.phone || "").replace(/\D/g, "");
  const follow = F.signedIn
    ? `<a class="btn btn-line" href="${F.url("order.html?id=" + order.code)}">Xem đơn</a>`
    : `<a class="btn btn-line" href="${F.url("track.html?code=" + order.code + (digits ? "&phone=" + digits : ""))}">Tra cứu đơn</a>`;

  el.innerHTML = `<div class="ok-hero">
      <h1 class="ok-title disp">${F.okTitle("Đã đặt hàng")}</h1>
      <p class="ok-code">Mã đơn <b>${F.esc(order.code)}</b></p>
      <p class="ok-next">${NEXT[flow]}</p>
    </div>
    <div class="ok-grid">
      <div class="ok-main">${payCard()}${track}${ship}</div>
      <div class="ok-side">${summary}
        <div class="ok-acts">
          <a class="btn btn-blue" href="${F.url("home.html")}">Tiếp tục mua</a>
          ${follow}
        </div>
      </div>
    </div>`;

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]");
    if (b) F.copy(b, b.dataset.copy, document.getElementById(b.dataset.target));
  });

  F.boot();
})();
