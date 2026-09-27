/*
 * Cart ("Giỏ"): rows with a quantity stepper capped at the stock left, remove with undo, and the lines that cannot
 * be bought any more (the size has gone, or Số 05 has closed) in the error red with their fix. The summary counts
 * what can be bought; "Thanh toán" stays inactive while a line needs fixing. ?cart=full|small|soldout|empty loads
 * a demo basket (shared/data.js).
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const cart = F.cart;
  const el = document.querySelector("[data-cartp]");
  const bar = document.querySelector("[data-paybar]");
  const key = (i) => `${i.slug}|${i.color}|${i.size}`;

  // What is wrong with a line, if anything: closed (Số 05 over), gone (size sold out since), short (fewer left).
  function problem(L) {
    if (!L.style) return "missing";
    if (F.closedStyle(L.style)) return "closed";
    if (L.gone) return "gone";
    if (L.short) return "short";
    return null;
  }

  function row(item) {
    const L = H.line(item);
    const s = L.style;
    const p = problem(L);
    const href = F.url("product.html?m=" + s.slug);
    const k = key(item);
    const canSwap = p === "gone" && F.canBuy(s);
    let msg = "";
    if (p === "closed") msg = `Số 05 đã đóng. Xoá để thanh toán.`;
    if (p === "gone") msg = `Hết size ${L.size}. ${canSwap ? "Đổi size" : "Xoá"} để thanh toán.`;
    if (p === "short") msg = `Chỉ còn ${L.left}. Giảm số lượng để thanh toán.`;
    const low = !p && !L.fixed && L.left <= 3;
    const stepper = p === "closed" || p === "gone" ? "" : `<div class="step" role="group" aria-label="Số lượng ${F.esc(s.name)}">
        <button type="button" data-qty="-1" data-k="${k}" aria-label="Bớt một"${L.qty <= 1 ? " disabled" : ""}>${F.icon("minus")}</button>
        <output aria-live="polite">${L.qty}</output>
        <button type="button" data-qty="1" data-k="${k}" aria-label="Thêm một"${L.qty >= L.left ? " disabled" : ""}>${F.icon("plus")}</button>
      </div>${low ? `<span class="cline-left">Còn ${L.left}</span>` : ""}`;
    return `<article class="cline${p ? " has-problem is-" + p : ""}" data-row="${k}">
      <a class="cline-img${L.fixed ? " flat" : ""}" href="${href}" tabindex="-1" aria-hidden="true"><img src="${L.image}" width="88" height="110" alt="" loading="lazy" decoding="async"></a>
      <div class="cline-body">
        <div class="cline-top">
          <h2 class="cline-name disp"><a href="${href}">${F.esc(s.name)}</a></h2>
          <p class="cline-price">${H.vnd(L.total)}</p>
        </div>
        <p class="cline-meta">${F.esc(L.colorLabel)} · Size ${L.size}${L.qty > 1 ? ` · ${H.vnd(L.price)} một chiếc` : ""}</p>
        ${msg ? `<p class="cline-err" id="err-${k.replace(/\W/g, "")}">${F.icon("warning-circle")}<span>${msg}</span></p>` : ""}
        <div class="cline-acts">
          ${stepper}
          ${canSwap ? `<button class="pill pill-err" type="button" data-swap="${k}">Chọn size khác</button>` : ""}
          <button class="cline-rm" type="button" data-rm="${k}" aria-label="Xoá ${F.esc(s.name)}, ${F.esc(L.colorLabel.toLowerCase())}, size ${L.size}">${F.icon("trash")}<span>Xoá</span></button>
        </div>
      </div>
    </article>`;
  }

  function render(focusSel) {
    const items = cart.items().filter((i) => H.find(i.slug));
    const n = items.reduce((a, i) => a + i.qty, 0);
    F.paintCart();
    if (!items.length) {
      bar.hidden = true;
      document.body.classList.remove("has-paybar");
      el.innerHTML = `<div class="cart-head"><h1 class="page-title disp">Giỏ</h1></div>
        <div class="empty-state">
          <span class="empty-ic">${F.icon("bag")}</span>
          <p class="empty-title">Giỏ trống</p>
          <a class="btn btn-blue" href="${F.url("products.html")}">Xem Cửa hàng</a>
        </div>`;
      return;
    }
    const ok = items.filter((i) => !problem(H.line(i)));
    const blocked = items.length - ok.length;
    const c = H.checkout(ok, { delivery: "STANDARD" });
    const pct = Math.min(1, c.subtotal / H.DELIVERY[0].freeFrom);
    const pay = (cls, withTotal) => {
      const label = withTotal ? `Thanh toán <span class="price">· ${H.vnd(c.total)}</span>` : "Thanh toán";
      return blocked || !ok.length
        ? `<button class="btn btn-blue ${cls}" type="button" disabled aria-describedby="cart-block">${label}</button>`
        : `<a class="btn btn-blue ${cls}" href="${F.url("checkout.html")}">${label}</a>`;
    };
    el.innerHTML = `<div class="cart-head">
        <h1 class="page-title disp">Giỏ</h1>
        <p class="cart-count">${n} món</p>
      </div>
      <div class="cart-grid">
        <section class="cart-lines" aria-label="Các món trong giỏ">${items.map(row).join("")}</section>
        <aside class="csum" aria-labelledby="sum-title">
          <h2 class="csum-title" id="sum-title">Tóm tắt</h2>
          <dl class="facts">
            <div><dt>Tạm tính</dt><dd>${H.vnd(c.subtotal)}</dd></div>
            <div><dt>Giao hàng</dt><dd>${c.shipping ? H.vnd(c.shipping) : "Miễn phí"}</dd></div>
            <div><dt>Dự kiến nhận</dt><dd>${H.deliveryWindow("STANDARD")}</dd></div>
          </dl>
          ${c.toFree > 0 && c.subtotal > 0 ? `<div class="free">
            <p>Thêm <b>${H.vnd(c.toFree)}</b> để được miễn phí giao</p>
            <div class="free-bar" aria-hidden="true"><i style="transform:scaleX(${pct.toFixed(3)})"></i></div>
          </div>` : ""}
          <div class="csum-total"><span>Tổng</span><b>${H.vnd(c.total)}</b></div>
          ${pay("only-desk csum-pay", false)}
          <p class="vh" id="cart-block">${blocked ? "Còn món cần xử lý trong giỏ" : ""}</p>
        </aside>
      </div>`;
    bar.hidden = false;
    document.body.classList.add("has-paybar");
    bar.innerHTML = pay("", true);
    if (focusSel) {
      const f = el.querySelector(focusSel) || el.querySelector(".cline-rm") || el.querySelector("h1");
      if (f) f.focus({ preventScroll: true });
    }
  }

  const find = (k) => cart.items().find((i) => key(i) === k);

  el.addEventListener("click", (e) => {
    const q = e.target.closest("[data-qty]");
    if (q && !q.disabled) {
      const it = find(q.dataset.k);
      if (!it) return;
      const left = H.stockOf(it.slug, it.color, it.size);
      const next = Math.max(1, Math.min(left, it.qty + Number(q.dataset.qty)));
      cart.setQty(it.slug, it.color, it.size, next);
      const sel = `[data-qty="${q.dataset.qty}"][data-k="${q.dataset.k}"]`;
      render(sel);
      const again = el.querySelector(sel);
      if (again && again.disabled) { const other = el.querySelector(`[data-k="${q.dataset.k}"]:not([disabled])`); if (other) other.focus(); }
      return;
    }
    const rm = e.target.closest("[data-rm]");
    if (rm) {
      const before = cart.items();
      const it = find(rm.dataset.rm);
      if (!it) return;
      const s = H.find(it.slug);
      cart.remove(it.slug, it.color, it.size);
      render(".cline-rm");
      F.toast(`Đã xoá ${s.name}`, {
        label: "Hoàn tác",
        run() {
          cart.clear();
          before.forEach((b) => { cart.add(b.slug, b.color, b.size); if (b.qty > 1) cart.setQty(b.slug, b.color, b.size, b.qty); });
          render(`[data-rm="${key(it)}"]`);
        },
      });
      return;
    }
    const sw = e.target.closest("[data-swap]");
    if (sw) {
      const it = find(sw.dataset.swap);
      if (!it) return;
      F.openBuy(it.slug, sw, {
        color: it.color,
        swap: {
          done(color, size) {
            const s = H.find(it.slug);
            const left = H.stockOf(it.slug, color, size);
            const same = (i) => i.slug === it.slug && i.color === color && i.size === size;
            const there = cart.items().find(same);
            // Rebuild the basket in order: the swapped line takes the old line's place (or merges into an equal one).
            const next = cart.items().filter((i) => !same(i)).map((i) => (key(i) === key(it)
              ? { slug: it.slug, color, size, qty: Math.min(left, it.qty + (there ? there.qty : 0)) } : i));
            cart.clear();
            next.forEach((i) => { cart.add(i.slug, i.color, i.size); if (i.qty > 1) cart.setQty(i.slug, i.color, i.size, i.qty); });
            render(`[data-rm="${it.slug}|${color}|${size}"]`);
            F.toast(`Đã đổi ${s.name} sang size ${size}`);
          },
        },
      });
    }
  });

  render();
  F.boot();
})();
