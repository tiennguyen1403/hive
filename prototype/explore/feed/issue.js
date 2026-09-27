/*
 * One issue, by ?no=. A closed issue is a recap: its number large, its dates and what it sold, then every style with
 * what that style sold. Số 05 shows its own on-model photos; Số 04 and Số 03 have none, so each style is its name
 * set on a plate, with its colour chips when the data carries colours. Then the other closed issues and whatever is
 * live now. An issue that is still open or only announced says so and leads there; an unknown number says it is
 * not there. The phone bar is this page's own: its title slides in once the big number has scrolled away.
 * States: ?no=4, ?no=3, ?no=5&state=closed (and ?no=5 while open, ?no=6 while announced).
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const q = new URLSearchParams(location.search);
  const el = document.querySelector("[data-issue]");
  const bar = document.querySelector(".mbar");   // the chrome's phone bar (data-title, data-back)
  const newest = F.CLOSED[0];
  const no = q.has("no") ? Number(q.get("no")) : newest ? newest.no : 0;
  const i = H.ISSUES.find((x) => x.no === no) || null;
  const label = i ? F.issueLabel(i.no) : "Số " + H.pad(no || 0);
  const styles = (n) => (n === 5 ? H.ISSUE_05 : H.PAST.filter((p) => p.issue === n));

  document.title = `${i ? label : "Không tìm thấy"} | HIVE`;
  const barTitle = bar && bar.querySelector(".mbar-title");
  if (barTitle && i) barTitle.textContent = label;

  function chips(s) {
    const cs = (s.colors || []).filter((c) => H.COLORS[c]);
    if (!cs.length) return "";
    return `<span class="b-chips">${cs.map((c) => `<i class="b-chip" style="background:${H.COLORS[c].hex}" aria-hidden="true"></i>`).join("")}<span class="vh">${cs.map((c) => H.COLORS[c].label).join(", ")}</span></span>`;
  }

  // ---------------------------------------------------------------- the styles
  // Số 05: worn, in the colour it led with.
  const lookTile = (s, idx) => `<article class="b-tile rv">
      <a class="b-tile-link" href="${F.esc(F.url("product.html?m=" + s.slug))}">
        <div class="b-tile-media">${F.img(s, s.colors[0], "look", { lazy: idx > 3 })}</div>
        <div class="b-tile-body">
          <h2 class="b-tile-name disp">${F.esc(s.name)}</h2>
          <p class="b-tile-meta">${F.esc(s.kind)}</p>
          <p class="b-tile-row"><span class="b-tile-price">${H.vnd(s.price)}</span><span class="b-tile-sold"><b>${F.soldOf(s)}/${s.cut}</b> đã bán</span></p>
        </div>
      </a>
    </article>`;

  // Số 04, Số 03: no photo, so the name is the picture.
  const typeTile = (p) => `<article class="b-tile rv">
      <div class="b-tile-plate">
        <div class="b-tile-top"><p class="b-tile-kind">${F.esc(p.kind)}</p>${chips(p)}</div>
        <h2 class="b-tile-big disp" style="--n:${[...p.name].length}">${F.esc(p.name)}</h2>
      </div>
      <div class="b-tile-body">
        <p class="b-tile-meta">${F.esc(p.material)} · ${H.FITS[p.fit]}</p>
        <p class="b-tile-row"><span class="b-tile-price">${H.vnd(p.price)}</span><span class="b-tile-sold"><b>${p.cut}/${p.cut}</b> đã bán</span></p>
      </div>
    </article>`;

  // ---------------------------------------------------------------- what comes after the recap
  function live() {
    if (F.LIVE) {
      const t = H.totals(5);
      return `<div class="b-next-now">
        <h2 class="sect-title">${F.issueLabel(5)} đang mở</h2>
        <p class="b-state-cd"><span class="cd-label">Đóng sau</span><span class="cd-big" data-until="${F.I5.closesAt}" role="timer">${F.cdHTML(F.I5.closesAt)}</span></p>
        <a class="btn btn-blue" href="${F.esc(F.url("products.html?dong=so-05"))}">Xem ${t.styles} mẫu</a>
      </div>`;
    }
    if (F.NEXT) {
      const p = F.parts(F.NEXT.opensAt);
      return `<div class="b-next-now">
        <h2 class="sect-title">${F.issueLabel(F.NEXT.no)} mở ${p.time} ${p.dow} ${p.dd}/${p.mm}</h2>
        <p class="b-state-cd"><span class="cd-label">Mở sau</span><span class="cd-big" data-until="${F.NEXT.opensAt}" role="timer">${F.cdHTML(F.NEXT.opensAt)}</span></p>
        ${F.remindBtn(F.NEXT.no)}
      </div>`;
    }
    // Between two issues the fixed line is what sells: named like the other two panels name their issue.
    return `<div class="b-next-now">
      <h2 class="sect-title">Cố định</h2>
      <a class="btn btn-blue" href="${F.esc(F.url("products.html?dong=co-dinh"))}">Xem ${H.FIXED.length} mẫu</a>
    </div>`;
  }

  function others(cur) {
    const list = F.CLOSED.map((x) => x.no);
    const at = list.indexOf(cur);
    const older = at >= 0 ? list[at + 1] : undefined;
    const newer = at > 0 ? list[at - 1] : undefined;
    if (!older && !newer) return "";
    const a = (n, cls, small) => `<a class="${cls}" href="${F.esc(F.url("issue.html?no=" + n))}"><small>${small}</small><span class="disp">${F.issueLabel(n)}</span></a>`;
    return `<nav class="b-pn n-${(older ? 1 : 0) + (newer ? 1 : 0)}" aria-label="Các Số đã đóng khác">
      ${older ? a(older, "is-prev", `${F.icon("caret-left")}Số trước`) : ""}
      ${newer ? a(newer, "is-next", `Số sau${F.icon("caret-right")}`) : ""}
    </nav>`;
  }
  const otherCount = (cur) => {
    const list = F.CLOSED.map((x) => x.no);
    const at = list.indexOf(cur);
    return (at >= 0 && list[at + 1] ? 1 : 0) + (at > 0 ? 1 : 0);
  };

  // ---------------------------------------------------------------- the page
  function recap() {
    const t = H.totals(i.no);
    const list = styles(i.no);
    return `<section class="b-hero" aria-labelledby="iss-no">
        <span class="chip-tag">Đã đóng</span>
        <h1 class="b-hero-no disp" id="iss-no">${label}</h1>
        <p class="b-hero-meta"><span>${H.day(i.opensAt)} - ${H.day(i.closesAt)}</span><span><b>${t.sold}/${t.cut}</b> đã bán</span></p>
      </section>
      <section class="b-tiles n-${list.length}${list.length % 2 ? " is-odd" : ""}" aria-label="${t.styles} mẫu của ${label}">${i.no === 5 ? list.map(lookTile).join("") : list.map(typeTile).join("")}</section>
      <div class="b-next pn-${otherCount(i.no)}">${live()}${others(i.no)}</div>`;
  }

  function open() {
    const t = H.totals(5);
    return `<section class="b-hero" aria-labelledby="iss-no">
        <span class="chip-live"><span class="dot" aria-hidden="true"></span>ĐANG MỞ</span>
        <h1 class="b-hero-no disp" id="iss-no">${label}</h1>
        <p class="b-hero-cd"><span class="cd-label">Đóng sau</span><span class="cd-big" data-until="${i.closesAt}" role="timer">${F.cdHTML(i.closesAt)}</span></p>
        <a class="btn btn-blue" href="${F.esc(F.url("products.html?dong=so-05"))}">Xem ${t.styles} mẫu</a>
      </section>`;
  }

  function upcoming() {
    const p = F.parts(i.opensAt);
    return `<section class="b-hero" aria-labelledby="iss-no">
        <span class="chip-line">SẮP MỞ</span>
        <h1 class="b-hero-no disp" id="iss-no">${label}</h1>
        <p class="b-hero-meta"><span>Mở <b>${p.time} ${p.dow} ${p.dd}/${p.mm}</b></span></p>
        <p class="b-hero-cd"><span class="cd-label">Mở sau</span><span class="cd-big" data-until="${i.opensAt}" role="timer">${F.cdHTML(i.opensAt)}</span></p>
        ${F.remindBtn(i.no)}
      </section>`;
  }

  function missing() {
    return `<h1 class="vh">Không tìm thấy</h1>
      <div class="empty-state">
        <span class="empty-ic">${F.icon("calendar-blank")}</span>
        <p class="empty-title">Không có ${no ? "Số " + H.pad(no) : "Số này"}</p>
        <a class="btn btn-line" href="${F.esc(F.url("archive.html"))}">Xem các Số đã đóng</a>
      </div>`;
  }

  el.innerHTML = !i ? missing() : i.state === "CLOSED" ? recap() : i.state === "OPEN" ? open() : upcoming();

  // The phone bar shows the issue's number once the big one has scrolled away.
  const big = el.querySelector(".b-hero-no");
  if (bar && big && "IntersectionObserver" in window) {
    bar.classList.add("title-late");
    new IntersectionObserver(([en]) => bar.classList.toggle("title-on", !en.isIntersecting), { rootMargin: "-56px 0px 0px 0px" }).observe(big);
  }

  F.boot();
})();
