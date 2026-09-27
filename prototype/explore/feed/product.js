/*
 * Product page. ?m=<slug> picks the style (default "suong"); every Issue 05 slug works, and so do the fixed line's.
 * The gallery is a story frame on every screen: one photo at a time with a segment per photo; tap a half, swipe, or
 * use the arrow keys (desktop adds a previous and a next button). No autoplay.
 * Phone: the buy bar in place of the tab bar, the size sheet. Desktop: the frame sized to the window beside the
 * buying block, sticky.
 * Signed in, the page starts on Size của tôi when that size is left in the chosen colour; signed out, on no size.
 * ?frames=N (up to 8) repeats the colour's photos into N frames, to check the frame with a longer gallery.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const q = new URLSearchParams(location.search);
  const s = H.find(q.get("m") || "suong") || H.find("suong");
  const fixed = F.isFixed(s);
  const sold = F.soldOut(s);
  const closed = F.closedStyle(s);   // a Số 05 style once Số 05 has closed: viewable, not buyable
  const buyable = F.canBuy(s);
  const base = fixed ? ["pack"] : ["pack", "look"];
  const want = Math.min(8, parseInt(q.get("frames"), 10) || 0);
  const kinds = want > base.length ? Array.from({ length: want }, (_, i) => base[i % base.length]) : base;
  const many = kinds.length > 1;
  // &c= (from Yêu thích and Thông báo) opens on that colour when the style has it; otherwise the first in stock.
  const askedColor = q.get("c");
  const color0 = s.colors.includes(askedColor) ? askedColor : F.firstColor(s);
  const mine = F.mySize(s);
  const myPick = (c) => (buyable && F.hasSize(s, c, mine) ? mine : null);
  const st = { color: color0, size: myPick(color0), frame: 0 };

  document.title = `${s.name} | HIVE`;

  // ---------------------------------------------------------------- markup
  const frames = () => kinds.map((k, i) =>
    `<figure class="frame${fixed ? " flat" : ""}">${F.img(s, st.color, k, { lazy: i > 1, high: i === 0 })}</figure>`).join("");
  const progress = () => kinds.map((_, i) => `<i${i <= st.frame ? ' class="on"' : ""}></i>`).join("");

  function stockMain() {
    if (fixed) {
      const gone = H.sizesGone(s);
      return `<p class="stock pstock"><span>${gone.length ? "Hết " + gone.join(" ") : "Đủ size"}</span></p>`;
    }
    if (sold) return `<p class="stock pstock"><b>${s.cut}/${s.cut} đã bán</b></p>`;
    if (closed) return `<p class="stock pstock"><b>${F.soldOf(s)}/${s.cut} đã bán</b></p>`;
    const low = H.isLow(s);
    return `<p class="stock pstock${low ? " is-low" : ""}"><b>${low ? F.icon("fire-fill") : ""}Còn ${H.left(s)}</b><span>/ ${s.cut} chiếc đã cắt</span></p>`;
  }

  function sections() {
    const S = H.SHIPPING;
    const spec = [["Chất liệu", s.material], ["Form", H.FITS[s.fit]]];
    if (s.print) spec.push(["Hình in", s.print]);
    const ship = [
      [`${S.standard.label}, ${S.standard.days}`, H.vnd(S.standard.fee)],
      [`${S.express.label}, ${S.express.days}`, H.vnd(S.express.fee)],
      ["Miễn phí giao từ", H.vnd(S.freeFrom)],
      ["Phụ phí COD", H.vnd(S.codSurcharge)],
      ["Đổi trả", S.returnDays + " ngày", "help.html#doi-tra"],
      ["Thanh toán", S.payments.join(", ")],
    ];
    // A row with an href is a link across the whole row (the value carries a quiet arrow).
    const dl = (rows) => `<dl class="facts">${rows.map(([k, v, href]) => href
      ? `<div class="facts-go"><dt>${F.esc(k)}</dt><dd><a href="${F.url(href)}" aria-label="${F.esc(k + " " + v)}">${F.esc(v)}${F.icon("caret-right")}</a></dd></div>`
      : `<div><dt>${F.esc(k)}</dt><dd>${F.esc(v)}</dd></div>`).join("")}</dl>`;
    return (s.details ? `<section class="sect" aria-labelledby="h-detail"><h2 class="sect-title" id="h-detail">Chi tiết</h2>
        <ul class="details">${s.details.map((d) => `<li>${F.esc(d)}</li>`).join("")}</ul></section>` : "") +
      `<section class="sect" aria-labelledby="h-spec"><h2 class="sect-title" id="h-spec">Thông số</h2>${dl(spec)}</section>
      <section class="sect" aria-labelledby="h-ship"><h2 class="sect-title" id="h-ship">Giao hàng và đổi trả</h2>${dl(ship)}</section>`;
  }

  const others = (fixed ? H.FIXED : H.ISSUE_05).filter((x) => x !== s);
  const line = F.lineOf(s);
  const lineHref = F.url(fixed ? "products.html?dong=co-dinh" : "products.html?dong=so-05");

  const main = document.querySelector("[data-pdp]");
  main.innerHTML = `
    <nav class="crumbs" aria-label="Đường dẫn"><a href="${F.url("products.html")}">Cửa hàng</a><span aria-hidden="true">/</span><a href="${lineHref}">${line}</a><span aria-hidden="true">/</span><span aria-current="page">${F.esc(s.name)}</span></nav>
    <section class="gal${sold ? " is-sold" : ""}${many ? "" : " one"}" aria-label="Ảnh ${F.esc(s.name)}">
      <div class="gal-track"${many ? ' tabindex="0" aria-describedby="gal-count"' : ""}>${frames()}</div>
      ${many ? `<div class="prog" aria-hidden="true">${progress()}</div>
      <button class="gal-btn gal-prev" type="button" data-step="-1" aria-label="Ảnh trước">${F.icon("caret-left")}</button>
      <button class="gal-btn gal-next" type="button" data-step="1" aria-label="Ảnh sau">${F.icon("caret-right")}</button>` : ""}
      ${sold ? '<span class="plate">ĐÃ HẾT</span>' : ""}
      ${many ? '<p class="vh" id="gal-count" aria-live="polite"></p>' : ""}
    </section>
    <div class="pinfo-col"><div class="pinfo">
      <div class="pinfo-tags"><span class="chip-tag">${line}</span>${closed ? '<span class="chip-line">ĐÃ ĐÓNG</span>' : ""}</div>
      <h1 class="pname disp">${F.esc(s.name)}</h1>
      <p class="pkind">${F.esc(s.kind)}</p>
      <p class="pprice">${H.vnd(s.price)}</p>
      ${stockMain()}
      <div class="pblock">
        <p class="sh-label">Màu <span data-color-name>${F.colorName(st.color)}</span></p>
        <div class="swatches" role="radiogroup" aria-label="Màu">${F.swatches(s, st.color, "p-color", { counts: !closed })}</div>
      </div>
      <div class="pblock" data-size-block${closed ? " hidden" : ""}>
        <div class="sh-label"><span class="sh-label-t" data-size-label>${F.sizeLabel(st.size, mine)}</span> <button class="link" type="button" data-guide>${F.icon("ruler")}Bảng size</button></div>
        <div class="sizes" role="radiogroup" aria-label="Size" data-sizes>${F.sizeOpts(s, st.color, st.size, "p-size")}</div>
        <p class="size-hint" data-size-hint aria-live="polite"></p>
      </div>
      <div class="padd"><button class="btn btn-blue" type="button" data-cta>Chọn size</button></div>
    </div></div>
    <div class="psects">${sections()}</div>
    <div class="sect rail-sect">${F.rail({ id: "rail-more", title: "Cùng " + line, more: fixed ? "products.html?dong=co-dinh" : "products.html?dong=so-05", items: others })}</div>`;

  // The phone's top controls carry this style's name and heart.
  document.querySelector("[data-pbar-title]").textContent = s.name;
  const pfav = document.querySelector("[data-pbar-fav]");
  pfav.dataset.fav = s.slug;
  pfav.setAttribute("aria-label", "Yêu thích " + s.name);

  const gal = main.querySelector(".gal");
  const track = main.querySelector(".gal-track");
  const prog = main.querySelector(".prog");
  const count = main.querySelector("#gal-count");
  const steps = [...main.querySelectorAll(".gal-btn")];

  // ---------------------------------------------------------------- gallery: tap a half, swipe, arrow keys, the buttons
  function paintFrame() {
    if (!many) return;
    const last = kinds.length - 1;
    prog.querySelectorAll("i").forEach((el, i) => el.classList.toggle("on", i <= st.frame));
    count.textContent = `Ảnh ${st.frame + 1} trên ${kinds.length}, màu ${F.colorName(st.color).toLowerCase()}`;
    steps.forEach((b) => {
      const off = Number(b.dataset.step) < 0 ? st.frame === 0 : st.frame === last;
      // A button that goes away under the keyboard hands its focus to the frame, which takes the arrow keys.
      if (off && document.activeElement === b) track.focus({ preventScroll: true });
      b.disabled = off;
    });
    // The next photo loads before it is asked for.
    const next = track.querySelectorAll("img")[st.frame + 1];
    if (next && next.loading === "lazy") next.loading = "eager";
  }
  function go(i) {
    const j = Math.max(0, Math.min(kinds.length - 1, i));
    track.scrollTo({ left: j * track.clientWidth, behavior: F.motion() ? "smooth" : "auto" });
    if (j !== st.frame) { st.frame = j; paintFrame(); }
  }
  if (many) {
    track.addEventListener("scroll", () => {
      const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (i !== st.frame) { st.frame = i; paintFrame(); }
    }, { passive: true });
    track.addEventListener("click", (e) => {
      const r = track.getBoundingClientRect();
      go(e.clientX - r.left < r.width / 2 ? st.frame - 1 : st.frame + 1);
    });
    track.addEventListener("keydown", (e) => {
      const to = { ArrowRight: st.frame + 1, ArrowLeft: st.frame - 1, Home: 0, End: kinds.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      go(to);
    });
    gal.addEventListener("click", (e) => {
      const b = e.target.closest(".gal-btn");
      if (b && !b.disabled) go(st.frame + Number(b.dataset.step));
    });
    // The frame changes width with the window (and between the phone and desktop layouts): stay on the same photo.
    if ("ResizeObserver" in window) new ResizeObserver(() => { track.scrollLeft = st.frame * track.clientWidth; }).observe(track);
  }

  // ---------------------------------------------------------------- colour, size, buy
  function paintCta() {
    const ok = F.hasSize(s, st.color, st.size);
    document.querySelectorAll("[data-cta]").forEach((b) => {
      if (sold) { b.disabled = true; b.textContent = "Đã hết"; return; }
      if (!buyable) { b.disabled = true; b.textContent = "Số 05 đã đóng"; return; }
      b.disabled = false;
      b.dataset.mode = ok ? "add" : "pick";
      b.innerHTML = ok ? `${F.icon("bag")}Thêm vào giỏ <span class="price">· ${H.vnd(s.price)}</span>` : "Chọn size";
    });
  }

  function setColor(c) {
    if (c === st.color || !s.colors.includes(c)) return;
    st.color = c;
    if (!F.hasSize(s, c, st.size)) st.size = myPick(c);
    main.querySelectorAll('input[name="p-color"]').forEach((i) => { i.checked = i.value === c; });
    main.querySelector("[data-color-name]").textContent = F.colorName(c);
    track.innerHTML = frames();
    track.scrollLeft = 0;
    st.frame = 0;
    paintFrame();
    main.querySelector("[data-sizes]").innerHTML = F.sizeOpts(s, c, st.size, "p-size");
    main.querySelector("[data-size-label]").textContent = F.sizeLabel(st.size, mine);
    paintCta();
  }

  function setSize(z) {
    st.size = F.hasSize(s, st.color, z) ? z : null;
    if (st.size) {
      main.querySelector("[data-size-block]").classList.remove("need");
      main.querySelector("[data-size-hint]").textContent = "";
    }
    main.querySelectorAll('input[name="p-size"]').forEach((i) => { i.checked = i.value === st.size; });
    main.querySelector("[data-size-label]").textContent = F.sizeLabel(st.size, mine);
    paintCta();
  }

  main.addEventListener("change", (e) => {
    if (e.target.name === "p-color") setColor(e.target.value);
    if (e.target.name === "p-size") setSize(e.target.value);
  });
  main.addEventListener("click", (e) => {
    const g = e.target.closest("[data-guide]");
    if (g) F.openGuide(s, st.size, g);
  });

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cta]");
    if (!b || b.disabled) return;
    if (b.dataset.mode === "add") { F.addToCart(s, st.color, st.size, b); return; }
    if (F.desk.matches) {
      // The sizes sit right above the button on desktop: take the shopper there and nudge them.
      const first = main.querySelector('input[name="p-size"]:not(:disabled)');
      if (first) first.focus({ preventScroll: true });
      const block = main.querySelector("[data-size-block]");
      block.scrollIntoView({ block: "nearest", behavior: F.motion() ? "smooth" : "auto" });
      block.classList.add("need");
      main.querySelector("[data-size-hint]").textContent = "Chọn size để thêm vào giỏ";
      if (F.motion()) {
        main.querySelector("[data-sizes]").animate(
          [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }],
          { duration: 360, easing: "ease-out" });
      }
      return;
    }
    F.openBuy(s.slug, b, {
      color: st.color,
      size: st.size,
      onPick: (p) => { setColor(p.color); setSize(p.size); },
    });
  });

  // Back: return to where the shopper came from inside this mock, else home.
  document.querySelector("[data-back]").addEventListener("click", (e) => {
    try {
      if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    } catch (_) { /* keep the link */ }
  });

  // The phone's top controls turn into a solid bar once the gallery has scrolled away.
  const pbar = document.querySelector("[data-pbar]");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => pbar.classList.toggle("solid", !en.isIntersecting), { rootMargin: "-60px 0px 0px 0px" })
      .observe(main.querySelector(".gal"));
  }

  paintFrame();
  paintCta();
  F.boot();
})();
