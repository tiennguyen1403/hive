/*
 * Đơn hàng (orders.html): every order in one list, newest first. Each is a ticket: what it was bought from (the
 * issues, then Cố định), the code in the display face, the total, the state in words with what it needs (the hold
 * ticking, the return deadline, the tracking code, the reason it was cancelled), the pieces as tiles, the date.
 * Two filters, both kept in the URL: the phase (?phase=active|delivered|cancelled, HIVE.ORDER_PHASES) and the group
 * (?group=so-05|so-04|so-03|co-dinh, HIVE.orderGroups: DH-1507 is under Số 05 and under Cố định). A ticket leaves out
 * the group the list is filtered by. A combination with no order says so and clears both filters.
 * ?orders=none shows the empty list; ?auth=out the way in.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const A = window.ACC;
  const H = F.H;
  const el = document.querySelector("[data-orders]");

  const head = `<h1 class="acc-h1 disp" data-hero>Đơn hàng</h1>`;

  if (!F.signedIn) {
    el.innerHTML = head + A.signedOut({ title: "Đăng nhập để xem đơn", perks: false, id: "out-orders" }) + A.lookupForm("orders");
    document.querySelector("[data-foot]").dataset.footSkip = "track.html";
    A.revealTitleOn(el.querySelector("[data-hero]"));
    F.boot();
    return;
  }

  const list = H.orders();
  if (!list.length) {
    el.innerHTML = head + `<div class="empty-state">
        <span class="empty-ic">${F.icon("package")}</span>
        <p class="empty-title">Chưa có đơn nào</p>
        <a class="btn btn-blue" href="${F.url("products.html")}">Xem Cửa hàng</a>
      </div>`;
    A.revealTitleOn(el.querySelector("[data-hero]"));
    F.boot();
    return;
  }

  // The groups these orders touch: the issues, newest first, then the fixed line.
  const slug = (g) => (g === "fixed" ? "co-dinh" : "so-" + H.pad(g));
  const groups = [];
  list.forEach((o) => H.orderGroups(o).forEach((g) => { if (!groups.includes(g)) groups.push(g); }));
  groups.sort((a, b) => (a === "fixed") - (b === "fixed") || b - a);

  const q = new URLSearchParams(location.search);
  const st = {
    phase: H.ORDER_PHASES[q.get("phase")] ? q.get("phase") : "all",
    group: groups.find((g) => slug(g) === q.get("group")) || "all",
  };

  el.innerHTML = head + `<div class="of">
      <div class="seg" role="group" aria-label="Trạng thái">
        <button class="seg-btn" type="button" data-phase="all" aria-pressed="false">Tất cả</button>
        ${Object.entries(H.ORDER_PHASES).map(([k, v]) => `<button class="seg-btn" type="button" data-phase="${k}" aria-pressed="false">${v}</button>`).join("")}
      </div>
      <div class="chips" role="group" aria-label="Dòng hàng">
        <button class="chip" type="button" data-group="all" aria-pressed="false">Mọi dòng hàng</button>
        ${groups.map((g) => `<button class="chip" type="button" data-group="${slug(g)}" aria-pressed="false">${A.groupLabel(g)}</button>`).join("")}
      </div>
    </div>
    <p class="vh" aria-live="polite" data-result></p>
    <div class="og-list" data-list></div>`;

  const listEl = el.querySelector("[data-list]");
  const result = el.querySelector("[data-result]");

  // "Không có đơn đang xử lý ở Số 05"
  function none() {
    return "Không có đơn" + (st.phase === "all" ? "" : " " + H.ORDER_PHASES[st.phase].toLowerCase()) +
      (st.group === "all" ? "" : " ở " + A.groupLabel(st.group));
  }

  function paint(announce) {
    const g = st.group === "all" ? "all" : slug(st.group);
    el.querySelectorAll("[data-phase]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.phase === st.phase)));
    el.querySelectorAll("[data-group]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.group === g)));
    const shown = list.filter((o) => (st.phase === "all" || A.phase(o) === st.phase) &&
      (st.group === "all" || H.orderGroups(o).includes(st.group)));
    listEl.innerHTML = shown.length
      ? shown.map((o) => A.ticket(o, { groups: H.orderGroups(o).filter((x) => x !== st.group) })).join("")
      : `<div class="empty-state of-empty">
          <span class="empty-ic">${F.icon("package")}</span>
          <p class="empty-title">${none()}</p>
          <button class="btn btn-line" type="button" data-clear>Bỏ lọc</button>
        </div>`;
    if (announce) result.textContent = shown.length ? shown.length + " đơn" : none();
    F.tick();
    // The view lives in the URL, beside the moment and the sign-in state.
    const p = new URLSearchParams(location.search);
    if (st.phase === "all") p.delete("phase"); else p.set("phase", st.phase);
    if (g === "all") p.delete("group"); else p.set("group", g);
    const qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  el.addEventListener("click", (e) => {
    const ph = e.target.closest("[data-phase]");
    if (ph) { st.phase = ph.dataset.phase; paint(true); return; }
    const gr = e.target.closest("[data-group]");
    if (gr) { st.group = gr.dataset.group === "all" ? "all" : groups.find((g) => slug(g) === gr.dataset.group); paint(true); return; }
    if (e.target.closest("[data-clear]")) {
      st.phase = "all";
      st.group = "all";
      paint(true);
      el.querySelector('[data-phase="all"]').focus();
    }
  });

  paint(false);
  // A group chip chosen in the URL may sit past the phone's edge: bring it into the row's view.
  const onChip = el.querySelector('.chips [aria-pressed="true"]');
  if (onChip) {
    const row = onChip.parentElement;
    const over = onChip.getBoundingClientRect().right - row.getBoundingClientRect().right + 16;
    if (over > 0) row.scrollLeft += over;
  }
  A.revealTitleOn(el.querySelector("[data-hero]"));
  F.boot();
})();
