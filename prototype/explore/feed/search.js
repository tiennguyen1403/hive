/*
 * Search: the app's search screen. The field sits at the top (with Huỷ on the phone); without a query it shows
 * the recent searches (removable, kept on this device) and the suggestions; with one, the results in the listing's
 * grid with their count; with none found, one line, the suggestions and a way to Cửa hàng. ?q= opens a query.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const form = document.querySelector("[data-sform]");
  const input = form.querySelector("input");
  const clear = form.querySelector("[data-clear]");
  const body = document.querySelector("[data-sbody]");
  const cancel = document.querySelector("[data-cancel]");

  // Recent searches live on this device. A first visit starts with three real terms from the catalogue.
  const recentStore = F.store("recent", []);
  if (recentStore.raw() === null) recentStore.set(["sương", "cargo", "áo thun tay dài"]);
  const recents = () => recentStore.get().filter((t) => typeof t === "string" && t.trim());
  function remember(term) {
    const t = term.trim();
    if (!t) return;
    const k = H.fold(t);
    recentStore.set([t].concat(recents().filter((x) => H.fold(x) !== k)).slice(0, 8));
  }
  function forget(term) {
    const k = H.fold(term);
    recentStore.set(recents().filter((x) => H.fold(x) !== k));
  }

  const chipsOf = (terms, kind) => terms.map((t) => kind === "recent"
    ? `<span class="rchip"><button class="rchip-go" type="button" data-q="${F.esc(t)}">${F.icon("clock-counter-clockwise")}<span>${F.esc(t)}</span></button><button class="rchip-x" type="button" data-forget="${F.esc(t)}" aria-label="Xoá “${F.esc(t)}” khỏi tìm gần đây">${F.icon("x")}</button></span>`
    : `<button class="schip" type="button" data-q="${F.esc(t)}">${F.esc(t)}</button>`).join("");

  function suggestions(title) {
    return `<section class="ssec" aria-labelledby="s-sug"><h2 class="ssec-title" id="s-sug">${title}</h2>
      <div class="schips">${chipsOf(H.SUGGEST, "suggest")}</div></section>`;
  }

  function idle() {
    const r = recents();
    const selling = F.LIVE ? H.ISSUE_05 : H.FIXED;
    return (r.length ? `<section class="ssec" aria-labelledby="s-recent">
        <div class="ssec-head"><h2 class="ssec-title" id="s-recent">Tìm gần đây</h2><button class="link" type="button" data-forget-all>Xoá hết</button></div>
        <div class="schips">${chipsOf(r, "recent")}</div></section>` : "") +
      suggestions("Gợi ý") +
      F.rail({ id: "s-rail", title: "Cửa hàng", sub: F.LIVE ? F.issueLabel(5) : "Cố định", more: F.LIVE ? "products.html?dong=so-05" : "products.html?dong=co-dinh", items: selling });
  }

  function results(q, hits) {
    return `<div class="sres-head"><p class="count" aria-live="polite"><b>${hits.length} mẫu</b> cho “${F.esc(q)}”</p></div>
      <div class="grid">${hits.map((s, i) => F.gcard(s, { showLine: true, lazy: i > 3, h: "h2" })).join("")}</div>`;
  }

  function none(q) {
    return `<div class="snone">
        <p class="snone-line" aria-live="polite">Không có mẫu nào cho “${F.esc(q)}”</p>
      </div>
      ${suggestions("Thử tìm")}
      <div class="snone-act"><a class="btn btn-line" href="${F.url("products.html")}">Xem Cửa hàng</a></div>`;
  }

  function render(write) {
    const q = input.value.trim();
    clear.hidden = !input.value;
    if (!q) body.innerHTML = idle();
    else {
      const hits = H.search(q);
      body.innerHTML = hits.length ? results(q, hits) : none(q);
    }
    document.title = q ? `${q} | Tìm | HIVE` : "Tìm | HIVE";
    if (write) {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (F.MODE !== "open") p.set("state", F.MODE);
      const s = p.toString();
      history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
    }
    F.paintFavs();
    F.wireRails(body);
    F.reveal(body);
  }

  let timer = 0;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => render(true), 140); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearTimeout(timer);
    remember(input.value);
    render(true);
    input.blur();
  });
  clear.addEventListener("click", () => { input.value = ""; render(true); input.focus(); });

  body.addEventListener("click", (e) => {
    const go = e.target.closest("[data-q]");
    if (go) {
      input.value = go.dataset.q;
      remember(go.dataset.q);
      render(true);
      scrollTo(0, 0);
      return;
    }
    const x = e.target.closest("[data-forget]");
    if (x) {
      forget(x.dataset.forget);
      render(false);
      const next = body.querySelector(".rchip-go") || input;
      next.focus({ preventScroll: true });
      return;
    }
    if (e.target.closest("[data-forget-all]")) { recentStore.set([]); render(false); input.focus({ preventScroll: true }); }
  });

  // Huỷ: back to where the shopper came from inside this mock, else home.
  cancel.addEventListener("click", (e) => {
    try {
      if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    } catch (_) { /* keep the link */ }
  });

  input.value = new URLSearchParams(location.search).get("q") || "";
  render(false);
  F.boot();
})();
