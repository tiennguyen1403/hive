/*
 * Yêu thích: a watch list. Each saved style shows the colour it was saved in, that colour's live stock (BỤI đen
 * "Còn 1", MUỐI xám under the ĐÃ HẾT stamp, HOODIE TRƠN xám with M gone) and its four sizes: a size still there is a
 * button that opens the size sheet on this colour and this size, so adding takes one more tap; a size that has gone
 * is struck through. Once Số 05 has closed its styles stay saved but cannot be bought. The filled heart removes, with
 * an undo.
 * States: ?favs=none (nothing saved), ?auth=out (signed out: an invitation to sign in), ?state= (the moment).
 * The list itself is FEED.favorites (the chrome's shared state), so hearts elsewhere and this page agree.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const el = document.querySelector("[data-favs]");
  let focusAfter = null;

  // The saved colour's stock, in the listing's words. The size buttons show which sizes are left, so no "Hết S M" here;
  // a sold-out style has no line either: its stamp says it once.
  function stock(s, color) {
    const left = H.leftIn(s, color);
    if (!left) return H.isSoldOut(s) ? "" : `<p class="stock b-fc-stock"><span>Hết màu ${F.colorName(color).toLowerCase()}</span></p>`;
    if (F.isFixed(s)) return "";
    if (!F.LIVE) return `<p class="stock b-fc-stock"><span>Đã đóng ${H.day(F.I5.closesAt)}</span></p>`;
    if (left <= 3) return `<p class="stock b-fc-stock is-low"><b>${F.icon("fire-fill")}Còn ${left}</b></p>`;
    return `<p class="stock b-fc-stock"><span>Còn ${left}</span></p>`;
  }

  // The four sizes of the saved colour: the quick add.
  function sizes(s, color) {
    if (!F.canBuy(s) || !H.leftIn(s, color)) return "";
    return `<div class="b-fc-sizes" role="group" aria-label="Thêm ${F.esc(s.name)} màu ${F.colorName(color).toLowerCase()}, chọn size">${H.sizes(s, color).map(({ size, n }) => n
      ? `<button class="b-sz" type="button" data-quick="${s.slug}" data-color="${color}" data-size="${size}" aria-label="Size ${size}${n <= 2 ? ", còn " + n : ""}">${size}</button>`
      : `<button class="b-sz" type="button" disabled aria-label="Size ${size}, hết">${size}</button>`).join("")}</div>`;
  }

  const unsave = (slug, name) =>
    `<button class="fav b-fc-fav" type="button" data-unsave="${slug}" aria-label="Bỏ lưu ${F.esc(name)}">${F.icon("heart-fill")}</button>`;

  function card(f, i) {
    const s = H.find(f.slug);
    if (!s) {
      // A style from an older issue: no photo, no stock, nothing to buy.
      const p = H.findAny(f.slug);
      return `<article class="b-fc is-closed rv" data-slug="${p.slug}">
        <div class="b-fc-media"><p class="b-type" aria-hidden="true">${F.esc(p.name)}</p></div>
        <div class="b-fc-body">
          <h2 class="b-fc-name disp">${F.esc(p.name)}</h2>
          <p class="b-fc-meta">${F.esc(p.kind)}</p>
          <p class="b-fc-price">${H.vnd(p.price)}</p>
        </div>
        ${unsave(p.slug, p.name)}
      </article>`;
    }
    const color = f.color && s.colors.includes(f.color) ? f.color : F.firstColor(s);
    const fixed = F.isFixed(s);
    const sold = F.soldOut(s);
    const href = F.esc(F.url(`product.html?m=${s.slug}&c=${color}`));
    return `<article class="b-fc rv${fixed ? " is-flat" : ""}${sold ? " is-sold" : ""}${F.closedStyle(s) ? " is-closed" : ""}" data-slug="${s.slug}">
      <a class="b-fc-media" href="${href}" tabindex="-1" aria-hidden="true">${F.img(s, color, "pack", { lazy: i > 2 })}${sold ? '<span class="plate">ĐÃ HẾT</span>' : ""}</a>
      <div class="b-fc-body">
        <h2 class="b-fc-name disp"><a href="${href}">${F.esc(s.name)}</a></h2>
        <p class="b-fc-meta">${F.colorName(color)} · ${F.esc(s.kind)}</p>
        <p class="b-fc-price">${H.vnd(s.price)}</p>
        ${stock(s, color)}
        ${sizes(s, color)}
      </div>
      ${unsave(s.slug, s.name)}
    </article>`;
  }

  // Signed out: the account pages' way in (ACC.signedOut), never someone's list.
  const gate = () => `<div class="b-head"><h1 class="b-title disp">Yêu thích</h1></div>
      <div class="b-gatewrap">${window.ACC.signedOut({ title: "Đăng nhập để xem mẫu đã lưu", perks: false, id: "out-favs" })}</div>`;

  function render() {
    if (!F.signedIn) { el.innerHTML = gate(); return; }
    const list = F.favorites.list();
    const head = `<div class="b-head"><h1 class="b-title disp" tabindex="-1">Yêu thích</h1>${list.length ? `<p class="b-count">${list.length} mẫu</p>` : ""}</div>`;
    if (!list.length) {
      el.innerHTML = head + `<div class="empty-state b-empty">
          <span class="empty-ic">${F.icon("heart")}</span>
          <p class="empty-title">Chưa lưu mẫu nào</p>
          <a class="btn btn-blue" href="${F.esc(F.url("products.html"))}">Xem Cửa hàng</a>
        </div>`;
    } else {
      el.innerHTML = head + `<section class="b-fcs" aria-label="Mẫu đã lưu">${list.map(card).join("")}</section>`;
    }
    F.reveal(el);
    if (focusAfter) {
      const t = el.querySelector(focusAfter) || el.querySelector(".b-title");
      if (t) t.focus({ preventScroll: true });
      focusAfter = null;
    }
  }

  function remove(slug, btn) {
    const before = F.favorites.list();
    const at = before.findIndex((f) => f.slug === slug);
    const s = H.findAny(slug);
    const next = before[at + 1] || before[at - 1];
    const done = () => {
      focusAfter = next ? `[data-unsave="${next.slug}"]` : ".b-title";
      F.favorites.remove(slug);
      F.toast(`Đã bỏ lưu ${s.name}`, {
        label: "Hoàn tác",
        run() { focusAfter = `[data-unsave="${slug}"]`; F.favorites.save(before); },
      });
    };
    const cardEl = btn.closest(".b-fc");
    if (F.motion() && cardEl) { cardEl.classList.add("b-out"); setTimeout(done, 200); } else done();
  }

  el.addEventListener("click", (e) => {
    const q = e.target.closest("[data-quick]");
    if (q) {
      F.openBuy(q.dataset.quick, q, { color: q.dataset.color, size: q.dataset.size });
      return;
    }
    const u = e.target.closest("[data-unsave]");
    if (u) remove(u.dataset.unsave, u);
  });

  addEventListener("feed:change", (e) => { if (e.detail === "favorites" || e.detail === "storage") render(); });

  render();
  F.boot();
})();
