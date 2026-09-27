/*
 * Home: three tabs (Bảng tin, Cửa hàng, Sắp mở) switched in place, with the hash kept in step. The first two tabs
 * were once called Khám phá and Đang bán, so #kham-pha and #dang-ban still open them.
 * What leads Bảng tin follows the shop's moment (?state=):
 *   open      the open issue's story, the ten styles, and between them the upcoming card and the fixed line's rail,
 *             then the closed issues (the ten styles are the feed's own frames, so no rail repeats them)
 *   upcoming  Số 06's launch card, the fixed line's rail, Số 05 closed, the older issues
 *   between two issues (HIVE.GAP; ?state=closed, ?state=quiet), by the clock, not by the moment's name:
 *             for LEAD_DAYS after Số 05 closed (the return window), a Số 05 recap that opens the closed issue, the fixed
 *             line's rail, the older issues; after that the fixed line leads in the feed's own frames (its first piece
 *             at story size under the line's name, the others as cards) and Số 05 tops the closed list
 * Once Số 05 has closed, the Cửa hàng tab opens on the fixed line's grid, so Bảng tin never shows that grid.
 * Phone and desktop get their own order of blocks.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const S = H.ISSUE_05;
  const TABS = ["bang-tin", "cua-hang", "sap-mo"];
  const ALIAS = { "kham-pha": "bang-tin", "dang-ban": "cua-hang" };
  const tabOf = (hash) => { const h = hash.replace(/^#/, ""); return ALIAS[h] || h; };
  const T5 = H.totals(5);

  // NGUỘI's look is the story, so the feed counts the story as its first frame:
  // styles then alternate packshot, look, packshot...
  const kindAt = (i) => (i % 2 === 0 ? "pack" : "look");

  // ---------------------------------------------------------------- leads
  function storyOpen() {
    const o = F.I5;
    const s = H.find("nguoi");
    return `<a class="story" href="#cua-hang">
      <div class="story-media">${F.img(s, s.colors[0], "look", { lazy: false, high: true, cls: "" })}</div>
      <div class="story-panel">
        <div class="story-top">
          <span class="chip-live"><span class="dot" aria-hidden="true"></span>ĐANG MỞ</span>
          <span class="story-no">${F.issueLabel(o.no).toUpperCase()}</span>
        </div>
        <div class="story-body">
          <p class="cover disp"><span>Cắt 1 lần.</span><span>Không tái bản.</span></p>
          <div class="story-close">
            <div class="story-cd">
              <p class="cd-label">Đóng sau</p>
              <p class="cd-big" data-until="${o.closesAt}" role="timer">${F.cdHTML(o.closesAt)}</p>
              <p class="cd-label">${H.when(o.closesAt)}</p>
            </div>
            <div class="story-stats">
              <p class="cd-label">Còn lại</p>
              <p class="cd-big">${T5.left}/${T5.cut}</p>
              <p class="cd-label">chiếc</p>
            </div>
            <span class="story-go">Xem ${T5.styles} mẫu${F.icon("arrow-right")}</span>
          </div>
        </div>
      </div>
    </a>`;
  }

  // Between two issues: Số 05 closed, its look photo, and a way back into its ten styles.
  function storyClosed() {
    const o = F.I5;
    const s = H.find("nguoi");
    return `<a class="story story-past" href="${F.url("products.html?dong=so-05")}">
      <div class="story-media">${F.img(s, s.colors[0], "look", { lazy: false, high: true, cls: "" })}</div>
      <div class="story-panel">
        <div class="story-top">
          <span class="story-no">${F.issueLabel(o.no).toUpperCase()}</span>
        </div>
        <div class="story-body">
          <p class="cover disp"><span>Đã đóng</span><span>${H.day(o.closesAt)}.</span></p>
          <div class="story-close">
            <div class="story-cd">
              <p class="cd-label">Đã bán</p>
              <p class="cd-big">${T5.sold}/${T5.cut}</p>
              <p class="cd-label">Mở ${H.day(o.opensAt)}</p>
            </div>
            <span class="story-go">Xem lại ${T5.styles} mẫu${F.icon("arrow-right")}</span>
          </div>
        </div>
      </div>
    </a>`;
  }

  // The fixed line leads the quiet gap: its first piece at story size under the line's name and status, the way the
  // cover sits on NGUỘI. The drawing reads at that size only when it is solid, so the piece shows in black when it has
  // it. The frame opens the piece; the button opens the Cửa hàng tab, which lists the line.
  function storyFixed() {
    const s = H.FIXED[0];
    const color = s.colors.includes("black") && H.leftIn(s, "black") > 0 ? "black" : F.firstColor(s);
    return `<article class="story story-fixed" aria-labelledby="lead-fixed">
      <div class="story-media">${F.img(s, color, "pack", { lazy: false, high: true, cls: "" })}</div>
      <div class="story-panel">
        <div class="story-top"><span class="chip-line">ĐANG BÁN</span></div>
        <div class="story-body">
          <h2 class="cover disp" id="lead-fixed"><span>Cố định</span></h2>
          <div class="story-close">
            <div class="story-piece">
              <h3 class="story-piece-name disp"><a href="${F.url("product.html?m=" + s.slug + "&c=" + color)}">${F.esc(s.name)}</a></h3>
              <p class="story-piece-meta">${F.esc(s.kind)} · <b>${H.vnd(s.price)}</b></p>
            </div>
            <a class="story-go" href="#cua-hang">Xem ${H.FIXED.length} mẫu${F.icon("arrow-right")}</a>
          </div>
        </div>
      </div>
    </article>`;
  }

  // ---------------------------------------------------------------- blocks
  const railFixed = () => F.rail({ id: "rail-fixed", title: "Cố định", more: "products.html?dong=co-dinh", items: H.FIXED });
  const railPast5 = () => F.rail({
    id: "rail-past5", cls: "rail-past", title: F.issueLabel(5), chip: "Đã đóng",
    sub: `${H.day(F.I5.opensAt)} - ${H.day(F.I5.closesAt)} · <b>${T5.sold}/${T5.cut} đã bán</b>`,
    more: "products.html?dong=so-05", moreLabel: "Xem lại", items: S,
  });
  const closed = (list) => `<section class="closed rv" aria-labelledby="closed-title">
      <div class="closed-head"><h2 class="closed-title disp" id="closed-title">Đã đóng</h2>
        <a class="link" href="${F.url("archive.html")}">Xem tất cả</a></div>${F.closedRows(list)}</section>`;

  // Phone: the ten frames in runs of four, three and three, Số 06 and the fixed line between them.
  function feedOpenPhone() {
    const out = [storyOpen()];
    S.forEach((s, i) => {
      out.push(F.card(s, { kind: kindAt(i), lazy: i > 0 }));
      if (i === 3) out.push(F.soon(false));
      if (i === 6) out.push(railFixed());
    });
    out.push(closed());
    return out.join("");
  }

  // Desktop: rows of three where the middle rows carry one card across two columns, image beside text. The two wide
  // cards face each other across the Số 06 card; the fixed line's rail sits before the last row.
  function feedOpenDesk() {
    const c = (i, o) => F.card(S[i], Object.assign({ kind: kindAt(i), lazy: i > 2 }, o));
    const row = (cards) => `<div class="row wrap">${cards.join("")}</div>`;
    return [
      storyOpen(),
      row([c(0), c(1), c(2)]),
      row([c(3, { wide: true, kind: "look" }), c(4)]),
      F.soon(false),
      row([c(5), c(6, { wide: true, flip: true, kind: "look" })]),
      railFixed(),
      row([c(7), c(8), c(9)]),
      closed(),
    ].join("");
  }

  // Số 05 leads the gap while it can still come back: LEAD_DAYS after its close, the length of the return window.
  const recent = () => H.nowMs() - Date.parse(F.I5.closesAt) < H.LEAD_DAYS * 864e5;

  // The quiet gap: the fixed line's lead, then its other pieces as feed frames (desktop: the open feed's rows), then
  // every closed issue with Số 05 first. No piece shows twice.
  function feedQuiet() {
    const rest = H.FIXED.slice(1);
    const c = (i, o) => F.card(rest[i], Object.assign({ kind: "pack", lazy: i > 2, h: "h3" }, o));
    let frames;
    if (F.desk.matches) {
      const row = (cards) => `<div class="row wrap">${cards.join("")}</div>`;
      frames = [row([c(0), c(1), c(2)]), row([c(3, { wide: true }), c(4)]), row([c(5), c(6, { wide: true, flip: true })])].join("");
    } else {
      frames = rest.map((s, i) => c(i, { lazy: i > 0 })).join("");
    }
    return [storyFixed(), frames, closed(F.CLOSED)].join("");
  }

  function feedMoment() {
    if (!H.GAP) return [F.soon(true), railFixed(), railPast5(), closed()].join("");
    if (recent()) return [storyClosed(), railFixed(), closed()].join("");
    return feedQuiet();
  }

  const feedEl = document.querySelector("[data-feed]");
  function renderFeed() {
    if (F.LIVE) feedEl.innerHTML = F.desk.matches ? feedOpenDesk() : feedOpenPhone();
    else feedEl.innerHTML = feedMoment();
    F.paintFavs();
    F.paintReminders();
    F.wireRails(feedEl);
    F.reveal(feedEl);
  }

  // ---------------------------------------------------------------- Sắp mở: the launch calendar
  function calRow(i) {
    const p = F.parts(i.opensAt);
    const t = H.totals(i.no);
    const date = `<div class="cal-date"><p class="cal-dd">${p.dd}</p><p class="cal-mm disp">Thg ${p.mm}</p></div>`;
    const head = (chip) => `<div class="cal-head"><h3 class="cal-no disp" id="cal-${i.no}">${F.issueLabel(i.no)}</h3>${chip}</div>`;
    if (i.state === "UPCOMING") {
      return `<article class="cal-row is-next rv" aria-labelledby="cal-${i.no}">
        ${date}
        <div class="cal-body">
          ${head('<span class="chip-line">SẮP MỞ</span>')}
          <p class="cal-when">Mở <b>${p.time} ${p.dow}</b></p>
          <p class="cal-cd"><span class="cd-label">Mở sau</span><span class="cd-big" data-until="${i.opensAt}" role="timer">${F.cdHTML(i.opensAt)}</span></p>
        </div>
        ${F.teasers()}
        <div class="cal-act"><p class="soon-note">${F.esc(H.FACTS.teaser)}</p>${F.remindBtn(i.no)}</div>
      </article>`;
    }
    if (i.state === "OPEN") {
      return `<article class="cal-row rv" aria-labelledby="cal-${i.no}">
        ${date}
        <div class="cal-body">
          ${head('<span class="chip-live"><span class="dot" aria-hidden="true"></span>ĐANG MỞ</span>')}
          <p class="cal-when">Đến ${H.day(i.closesAt)}, còn <b>${t.left}/${t.cut}</b> chiếc</p>
          <p class="cal-cd"><span class="cd-label">Đóng sau</span><span class="cd-big" data-until="${i.closesAt}" role="timer">${F.cdHTML(i.closesAt)}</span></p>
          <a class="pill cal-go" href="#cua-hang">Xem ${t.styles} mẫu${F.icon("arrow-right")}</a>
        </div>
      </article>`;
    }
    const names = i.no === 5 ? "" : H.PAST.filter((x) => x.issue === i.no).map((x) => x.name).join(", ");
    return `<article class="cal-row rv" aria-labelledby="cal-${i.no}">
      ${date}
      <div class="cal-body">
        ${head('<span class="chip-tag">Đã đóng</span>')}
        <p class="cal-when">Đóng ${H.day(i.closesAt)}, <b>${t.sold}/${t.cut}</b> đã bán</p>
        ${names ? `<p class="cal-names">${names}</p><a class="pill cal-go" href="${F.url("issue.html?no=" + i.no)}">Xem lại ${t.styles} mẫu${F.icon("arrow-right")}</a>`
          : `<a class="pill cal-go" href="${F.url("products.html?dong=so-05")}">Xem lại ${t.styles} mẫu${F.icon("arrow-right")}</a>`}
      </div>
    </article>`;
  }

  function cal() {
    const order = H.ISSUES.slice().sort((a, b) => b.no - a.no);
    const rows = order.map(calRow).join("");
    if (F.NEXT) return rows;
    // Nothing announced: a calm empty state first, with a way to what sells.
    return `<div class="cal-empty rv">
        ${F.icon("calendar-blank", "cal-empty-ic")}
        <p class="cal-empty-title">Chưa có Số mới</p>
        <a class="btn btn-line" href="#cua-hang">Xem Cố định</a>
      </div>${rows}`;
  }

  // ---------------------------------------------------------------- tabs
  const tablist = document.querySelector('[role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const ink = tablist.querySelector(".tabs-ink");
  const panels = Object.fromEntries(TABS.map((id) => [id, document.getElementById("panel-" + id)]));
  const scrolls = {};
  let current = null;
  const built = { shop: false, cal: false };

  function moveInk(animate) {
    const tab = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    if (!tab) return;
    const label = tab.querySelector("span");
    const lr = label.getBoundingClientRect();
    const tr = tablist.getBoundingClientRect();
    if (!animate) ink.style.transition = "none";
    const w = lr.width + 12;
    ink.style.transform = `translateX(${Math.round(lr.left - tr.left - 6)}px) scaleX(${(w / 100).toFixed(4)})`;
    if (!animate) { void ink.offsetWidth; ink.style.transition = ""; }
  }

  function build(id) {
    if (id === "cua-hang" && !built.shop) {
      F.shop(document.querySelector("[data-shop]"), { lines: F.shopLines(false), sort: false, h: "h3" });
      built.shop = true;
    }
    if (id === "sap-mo" && !built.cal) {
      document.querySelector("[data-cal]").innerHTML = cal();
      F.paintReminders();
      F.tick();
      built.cal = true;
    }
  }

  function show(id, opts) {
    const o = Object.assign({ focus: false, write: true }, opts);
    if (!TABS.includes(id)) return;
    if (id === current) { if (o.focus) tabs[TABS.indexOf(id)].focus(); return; }
    const first = current === null;
    if (current) scrolls[current] = scrollY;
    build(id);
    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    TABS.forEach((k) => { panels[k].hidden = k !== id; });
    const p = panels[id];
    p.classList.remove("enter");
    if (!first) { void p.offsetWidth; p.classList.add("enter"); }
    current = id;
    moveInk(!first);
    if (o.write && location.hash !== "#" + id) history.replaceState(null, "", location.pathname + location.search + "#" + id);
    if (!first) scrollTo(0, scrolls[id] || 0);
    F.reveal(p);
    F.wireRails(p);
    if (o.focus) tabs[TABS.indexOf(id)].focus();
  }

  tablist.addEventListener("click", (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t) show(t.dataset.tab);
  });
  tablist.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") j = 0;
    if (e.key === "End") j = tabs.length - 1;
    if (j === null) return;
    e.preventDefault();
    show(TABS[j], { focus: true });
  });
  // An old hash is rewritten to its new name; a hash that names no tab leaves the page as it is.
  addEventListener("hashchange", () => {
    const id = tabOf(location.hash) || "bang-tin";
    if (!TABS.includes(id)) return;
    if (location.hash && location.hash.slice(1) !== id) history.replaceState(null, "", location.pathname + location.search + "#" + id);
    show(id, { write: false });
  });
  addEventListener("resize", () => moveInk(false));
  document.fonts && document.fonts.ready.then(() => moveInk(false));

  // ---------------------------------------------------------------- boot
  renderFeed();
  F.desk.addEventListener("change", () => { renderFeed(); moveInk(false); });
  F.boot();
  const start = tabOf(location.hash);
  show(TABS.includes(start) ? start : "bang-tin", { write: TABS.includes(start) });
})();
