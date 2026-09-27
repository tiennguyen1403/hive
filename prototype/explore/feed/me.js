/*
 * Tôi (account.html): the shopper's home in the app.
 * Who they are; the order that needs them now (a transfer's 12-hour hold ticking in the drop countdown's face, or a
 * COD order waiting for the call), with the parcel on its way beside it; when nothing is running, the return window
 * that closes soonest. Then tiles with their own things in them: saved styles with live stock, the reminder as a
 * date block, Size của tôi, the default address, help. Signed out (?auth=out): a way in, and the guest order lookup;
 * on desktop the way in is the sign-in form itself (the same as sign-in.html, ACC.si*), beside what an account holds,
 * and signing in there stays on Tôi. ?errors=1 shows that form after a failed try.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const A = window.ACC;
  const H = F.H;
  const el = document.querySelector("[data-me]");

  // "03/2026" for the month the account was made.
  function monthYear(iso) {
    const d = new Date(Date.parse(iso) + 7 * 3600 * 1000);
    return H.pad(d.getUTCMonth() + 1) + "/" + d.getUTCFullYear();
  }

  // ---------------------------------------------------------------- signed out
  if (!F.signedIn) {
    const errors = new URLSearchParams(location.search).get("errors") === "1";
    const paint = () => {
      el.innerHTML = `<h1 class="vh">Tôi</h1>
      ${F.desk.matches ? A.signedOutHome({ errors }) : `${A.signedOut({ title: "Tôi" })}
      ${A.lookupForm("me")}`}`;
    };
    paint();
    F.desk.addEventListener("change", paint);
    A.siWire(el, () => "in", () => F.signIn("account.html"));
    document.querySelector("[data-foot]").dataset.footSkip = "track.html";
    document.body.classList.add("is-out");
    F.boot();
    return;
  }

  const p = A.profile();

  // ---------------------------------------------------------------- the order that needs them now
  const all = H.orders().map((o) => ({ o, st: A.status(o) }));
  const byState = (s) => all.filter((x) => x.st.state === s);
  const primary = byState("AWAITING_TRANSFER")[0] || byState("RECEIVED")[0] || null;
  const moving = byState("SHIPPING")[0] || byState("PAID")[0] || null;
  const returnable = all
    .filter((x) => A.canReturn(x.o) && !A.returnOf(x.o.code))
    .sort((a, b) => Date.parse(H.returnUntil(a.o)) - Date.parse(H.returnUntil(b.o)))[0] || null;

  function nowCard(x) {
    const { o, st } = x;
    const t = H.orderTotals(o);
    const href = F.url("order.html?id=" + o.code);
    const tiles = `<div class="tiles">${o.lines.map((l) => A.tile(l, { alt: true })).join("")}</div>`;
    if (st.state === "AWAITING_TRANSFER") {
      return `<article class="now on-dark" aria-label="${o.code}, ${F.esc(st.label.toLowerCase())}">
        <div class="now-top"><p class="now-code disp"><a href="${href}">${o.code}</a></p><p class="now-total">${H.vnd(t.total)}</p></div>
        <p class="now-cd" data-until="${st.dueAt}" role="timer" aria-label="Thời gian giữ hàng còn lại">${F.cdHTML(st.dueAt)}</p>
        <p class="now-when">Giữ hàng tới <b>${H.when(st.dueAt)}</b></p>
        <div class="now-foot">${tiles}<a class="btn btn-light now-cta" href="${href}#pay">Chuyển khoản</a></div>
      </article>`;
    }
    return `<article class="now on-dark" aria-labelledby="now-${o.code}">
      <div class="now-top"><p class="now-code disp" id="now-${o.code}"><a href="${href}">${o.code}</a></p>${A.statusChip(st)}</div>
      <p class="now-when is-first">Cửa hàng gọi xác nhận trước khi giao</p>
      <div class="now-foot">${tiles}<p class="now-total">${H.vnd(t.total)}</p></div>
    </article>`;
  }

  // The same parts as the hold card: the code and the total, the state, the pieces.
  const pieces = (o) => `<div class="tiles">${o.lines.map((l) => A.tile(l, { alt: true })).join("")}</div>`;
  function movingCard(x) {
    const { o, st } = x;
    return `<article class="soon-card" aria-labelledby="mv-${o.code}">
      <div class="soon-card-top"><p class="ticket-code disp" id="mv-${o.code}"><a href="${F.url("order.html?id=" + o.code)}">${o.code}</a></p><p class="now-total">${H.vnd(H.orderTotals(o).total)}</p></div>
      ${A.steps(o, st)}
      <div class="soon-card-foot">${pieces(o)}${st.tracking ? `<p class="soon-card-line">Mã vận đơn <b>${F.esc(st.tracking)}</b></p>` : ""}</div>
    </article>`;
  }

  function returnCard(x) {
    const { o, st } = x;
    return `<article class="soon-card" aria-labelledby="rt-${o.code}">
      <div class="soon-card-top"><p class="ticket-code disp" id="rt-${o.code}"><a href="${F.url("order.html?id=" + o.code)}">${o.code}</a></p>${A.statusChip(st)}</div>
      <div class="soon-card-foot">${pieces(o)}<a class="pill" href="${F.url("return.html?id=" + o.code)}">${F.icon("arrow-u-up-left")}Đổi trả tới ${H.day(H.returnUntil(o))}</a></div>
    </article>`;
  }

  let now = "";
  if (!all.length) {
    now = `<div class="none-card">Chưa có đơn nào</div>`;
  } else if (primary || moving) {
    now = `<div class="me-now">${primary ? nowCard(primary) : ""}${moving ? movingCard(moving) : ""}</div>`;
  } else if (returnable) {
    now = `<div class="me-now">${returnCard(returnable)}</div>`;
  } else {
    now = `<div class="none-card">Không có đơn đang xử lý</div>`;
  }

  // ---------------------------------------------------------------- tiles
  function favTile() {
    const favs = F.favorites.list();
    const href = F.url("favorites.html");
    if (!favs.length) {
      return `<a class="bt bt-fav-tile bt-link" href="${href}"><span class="bt-label">${F.icon("heart")}Yêu thích</span>
        <span class="bt-sub">Chưa lưu mẫu nào</span>${F.icon("caret-right", "bt-go")}</a>`;
    }
    const shown = favs.slice(0, 4);
    const thumbs = shown.map((f) => {
      const s = H.findAny(f.slug);
      const fixed = !!s.shape;
      const color = f.color || (s.colors ? s.colors[0] : "black");
      const sold = !fixed && s.stock && H.leftIn(s, color) === 0;
      const src = fixed ? H.flat(s, color) : s.stock ? H.photos(s, color).pack : "";
      return `<span class="bt-fav${fixed ? " flat" : ""}${sold ? " is-sold" : ""}">${src ? `<img src="${src}" width="120" height="150" loading="lazy" decoding="async" alt="${F.esc(s.name)}, ${F.esc(F.colorName(color).toLowerCase())}">` : ""}${sold ? '<span class="bt-fav-stamp">ĐÃ HẾT</span>' : ""}</span>`;
    }).join("");
    // The one stock fact worth a glance: a saved style running out while its issue is open.
    const alert = shown.map((f) => {
      const s = H.find(f.slug);
      if (!s || F.isFixed(s) || !F.LIVE) return null;
      const color = f.color || F.firstColor(s);
      const n = H.leftIn(s, color);
      return n > 0 && n <= 3 ? { s, color, n } : null;
    }).filter(Boolean).sort((a, b) => a.n - b.n)[0];
    return `<a class="bt bt-fav-tile bt-link" href="${href}">
      <span class="bt-label">${F.icon("heart")}Yêu thích</span>${F.icon("caret-right", "bt-go")}
      <span class="bt-fav-row">${thumbs}</span>
      ${alert ? `<span class="bt-fav-note"><span class="stock is-low"><b>${F.icon("fire-fill")}${F.esc(alert.s.name)} ${F.esc(F.colorName(alert.color).toLowerCase())} còn ${alert.n}</b></span></span>` : ""}
    </a>`;
  }

  function remindTile() {
    const r = F.reminders.list()[0];
    const href = F.url("notifications.html");
    if (!r) {
      return `<a class="bt bt-rem bt-link" href="${href}"><span class="bt-label">${F.icon("bell")}Nhắc</span>${F.icon("caret-right", "bt-go")}
        <span class="bt-sub">${F.NEXT ? "Chưa bật nhắc" : "Chưa có Số mới"}</span></a>`;
    }
    const i = H.issue(r.issue);
    const pt = F.parts(i.opensAt);
    const ch = r.channels.map((c) => (c === "push" ? "app" : "email")).join(" và ");
    return `<a class="bt bt-rem is-dark bt-link" href="${href}">
      <span class="bt-label">${F.icon("bell-fill")}Nhắc ${F.issueLabel(r.issue)}</span>${F.icon("caret-right", "bt-go")}
      <span class="bt-date"><span class="bt-dd">${pt.dd}</span><span class="bt-mm disp">Thg ${pt.mm}</span></span>
      <span class="bt-sub">${pt.time} ${pt.dow}, qua ${ch}</span>
    </a>`;
  }

  function sizeTile() {
    return `<a class="bt bt-size-tile bt-link" href="${F.url("profile.html#size")}">
      <span class="bt-label">Size của tôi</span>${F.icon("caret-right", "bt-go")}
      <span class="bt-sizes">
        <span class="bt-size">${F.icon("t-shirt")}<b>${F.esc(p.sizes.top || "-")}</b><span>Áo</span></span>
        <span class="bt-size">${F.icon("pants")}<b>${F.esc(p.sizes.bottom || "-")}</b><span>Quần</span></span>
      </span>
    </a>`;
  }

  function addressTile() {
    const a = A.defaultAddress();
    const href = F.url("addresses.html");
    if (!a) {
      return `<a class="bt bt-addr bt-link" href="${href}"><span class="bt-label">${F.icon("map-pin")}Địa chỉ</span>
        <span class="bt-sub">Chưa có địa chỉ</span>${F.icon("caret-right", "bt-go")}</a>`;
    }
    return `<a class="bt bt-addr bt-link" href="${href}">
      <span class="bt-label">${F.icon("map-pin")}Giao tới</span>${F.icon("caret-right", "bt-go")}
      <span class="bt-addr-name disp">${F.esc(a.label)}</span>
      <span class="bt-addr-line">${F.esc(A.addrLine(a))}</span>
    </a>`;
  }

  // ---------------------------------------------------------------- page
  el.innerHTML = `
    <section class="me-id" aria-labelledby="me-name">
      <h1 class="me-name disp" id="me-name">${F.esc(p.name)}</h1>
      <p class="me-meta">${F.esc(p.email)} · Thành viên từ ${monthYear(H.ACCOUNT.joinedAt)}</p>
      <a class="pill me-edit" href="${F.url("profile.html")}">${F.icon("pencil-simple")}Sửa hồ sơ</a>
    </section>
    <section class="acc-sec" aria-labelledby="me-orders">
      <div class="acc-sec-head"><h2 class="acc-sec-title" id="me-orders">Đơn hàng</h2>
        ${all.length ? `<a class="link" href="${F.url("orders.html")}">Xem tất cả</a>` : `<a class="link" href="${F.url("products.html")}">Xem Cửa hàng</a>`}</div>
      ${now}
    </section>
    <section class="acc-sec" aria-label="Của tôi">
      <div class="bento">${favTile()}${remindTile()}${sizeTile()}${addressTile()}</div>
    </section>
    <button class="btn btn-line sign-out" type="button" data-sign-out>${F.icon("sign-out")}Đăng xuất</button>`;

  F.boot();
})();
