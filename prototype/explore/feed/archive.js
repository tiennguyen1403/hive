/*
 * Các Số đã đóng: every closed issue, newest first, each with its dates, what it sold and its styles.
 * Số 05 joins once it has closed (?state=upcoming|closed) and wears one of its own photos; Số 04 and Số 03 have no
 * photos, so they are set in type: the number large, the names as a wall, each with its colour chips when the data
 * carries colours. While something is live (Số 05 open, or Số 06 announced) a strip at the top leads to it.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const el = document.querySelector("[data-arc]");
  const styles = (no) => (no === 5 ? H.ISSUE_05 : H.PAST.filter((p) => p.issue === no));

  // A style's colours as chips, named for screen readers. Nothing is drawn when the data has no colours.
  function chips(s) {
    const cs = (s.colors || []).filter((c) => H.COLORS[c]);
    if (!cs.length) return "";
    return `<span class="b-chips">${cs.map((c) => `<i class="b-chip" style="background:${H.COLORS[c].hex}" aria-hidden="true"></i>`).join("")}<span class="vh">${cs.map((c) => H.COLORS[c].label).join(", ")}</span></span>`;
  }

  function now() {
    if (F.LIVE) {
      const i = F.I5;
      return `<a class="b-now" href="${F.esc(F.url("products.html?dong=so-05"))}">
        <span class="chip-live"><span class="dot" aria-hidden="true"></span>ĐANG MỞ</span>
        <span class="b-now-no disp">${F.issueLabel(i.no)}</span>
        <span>Đóng sau <span class="cd-big" data-until="${i.closesAt}" role="timer">${F.cdHTML(i.closesAt)}</span></span>${F.icon("arrow-right")}
      </a>`;
    }
    if (F.NEXT) {
      const n = F.NEXT;
      return `<a class="b-now" href="${F.esc(F.url("home.html#sap-mo"))}">
        <span class="chip-line">SẮP MỞ</span>
        <span class="b-now-no disp">${F.issueLabel(n.no)}</span>
        <span>Mở sau <span class="cd-big" data-until="${n.opensAt}" role="timer">${F.cdHTML(n.opensAt)}</span></span>${F.icon("arrow-right")}
      </a>`;
    }
    return "";
  }

  function block(i) {
    const t = H.totals(i.no);
    const list = styles(i.no);
    const href = F.esc(F.url("issue.html?no=" + i.no));
    const meta = `<p class="b-issue-meta"><span>${H.day(i.opensAt)} - ${H.day(i.closesAt)}</span><span><b>${t.sold}/${t.cut}</b> đã bán</span></p>`;
    const go = `<span class="b-go" aria-hidden="true">Xem ${t.styles} mẫu${F.icon("arrow-right")}</span>`;
    const title = `<h2 class="b-issue-no disp" id="arc-${i.no}"><a href="${href}">${F.issueLabel(i.no)}</a></h2>`;
    if (i.no === 5) {
      const s = H.find("khoi");
      return `<article class="b-issue is-photo rv" aria-labelledby="arc-${i.no}">
        <div class="b-issue-media">${F.img(s, "black", "look", { lazy: false, cls: "" })}</div>
        <div class="b-issue-body">
          <div>${title}${meta}</div>
          <div>
            <ul class="b-names">${list.map((x) => `<li class="b-name"><span class="disp">${F.esc(x.name)}</span></li>`).join("")}</ul>
            ${go}
          </div>
        </div>
      </article>`;
    }
    return `<article class="b-issue rv" aria-labelledby="arc-${i.no}">
      <div class="b-issue-lead">${title}${meta}</div>
      <div class="b-issue-side">
        <ul class="b-names">${list.map((x) => `<li class="b-name"><span class="disp">${F.esc(x.name)}</span>${chips(x)}</li>`).join("")}</ul>
        ${go}
      </div>
    </article>`;
  }

  el.innerHTML = `<div class="b-head"><h1 class="b-title disp">Các Số đã đóng</h1></div>
    ${now()}
    <div class="b-arc">${F.CLOSED.map(block).join("")}</div>`;

  // The phone bar shows the title once the page's own has scrolled away.
  const bar = document.querySelector(".mbar");
  if (bar && "IntersectionObserver" in window) {
    bar.classList.add("title-late");
    new IntersectionObserver(([en]) => bar.classList.toggle("title-on", !en.isIntersecting), { rootMargin: "-56px 0px 0px 0px" })
      .observe(el.querySelector(".b-title"));
  }

  F.boot();
})();
