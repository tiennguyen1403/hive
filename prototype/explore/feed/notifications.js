/*
 * Thông báo: the inbox (FEED.inbox over HIVE.notifications()), grouped Hôm nay / Tuần này / Trước đó, newest first.
 * Unread items sit on an ink icon with a bold title (two cues that are not a colour) until opened or until
 * "Đánh dấu đã đọc". Each item opens its target. Beside it (below it on the phone): the reminder the shopper set
 * for the next issue, with its channels as switches (turning the last one off turns the reminder off, with an
 * undo), and what the shopper wants to hear about: orders, a new issue, saved styles running low, a code about to
 * expire. "Trong app" is a line in this inbox (user, 27/09): nothing here asks the browser for push permission.
 * States: ?inbox=empty, ?auth=out (signed out: an invitation to sign in), ?state= (the inbox follows the clock).
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const el = document.querySelector("[data-notif]");
  const acts = document.querySelector("[data-mbar-acts]");   // the phone bar's right side, from the chrome
  const KIND = { order: "package", drop: "calendar-star", reminder: "alarm", wishlist: "heart", promo: "ticket" };
  const GROUPS = ["Hôm nay", "Tuần này", "Trước đó"];
  const DAY = 86400000;
  const prefStore = F.store("notify", null);
  const PREFS = [["order", "Đơn hàng", "package"], ["drop", "Số mới", "calendar-star"], ["wishlist", "Mẫu đã lưu sắp hết", "heart"], ["promo", "Mã sắp hết hạn", "ticket"]];
  let quiet = false;
  let focusAfter = null;

  // ---------------------------------------------------------------- the inbox
  const vnDay = (ms) => H.day(new Date(ms).toISOString());
  function groupOf(n) {
    const t = Date.parse(n.at);
    const now = H.nowMs();
    if (vnDay(t) === vnDay(now)) return 0;
    return now - t < 7 * DAY ? 1 : 2;
  }
  // Today's items show the hour, older ones the day.
  const timeOf = (n, g) => (g === 0 ? H.when(n.at).split(" ")[0] : H.day(n.at));

  const row = (n, g) => `<li><a class="b-nrow${n.unread ? " is-unread" : ""}" href="${F.esc(F.url(n.href))}" data-key="${F.esc(n.key)}">
      <span class="b-nic">${F.icon(KIND[n.kind] || "bell")}</span>
      <span class="b-nmain"><span class="b-ntitle">${F.esc(n.title)}</span>${n.body ? `<span class="b-nbody">${F.esc(n.body)}</span>` : ""}</span>
      <span class="b-ntime">${timeOf(n, g)}</span>${n.unread ? '<span class="vh">, chưa đọc</span>' : ""}
    </a></li>`;

  function inboxHTML(list) {
    if (!list.length) {
      return `<div class="empty-state b-empty"><span class="empty-ic">${F.icon("bell")}</span><p class="empty-title">Chưa có thông báo</p></div>`;
    }
    const by = [[], [], []];
    list.forEach((n) => by[groupOf(n)].push(n));
    return by.map((items, g) => (items.length ? `<section class="b-ngroup" aria-labelledby="ng-${g}">
        <h2 class="b-ngroup-title" id="ng-${g}">${GROUPS[g]}</h2>
        <ul>${items.map((n) => row(n, g)).join("")}</ul>
      </section>` : "")).join("");
  }

  const readAll = (cls) => `<button class="link${cls ? " " + cls : ""}" type="button" data-read-all>${F.icon("checks")}Đánh dấu đã đọc</button>`;

  // ---------------------------------------------------------------- settings rows (the whole row is the switch)
  const setRow = (attr, key, label, ic, on, sub) => `<button class="b-setrow" type="button" role="switch" aria-checked="${on}" ${attr}="${key}">
      ${F.icon(ic)}<span class="b-setrow-label">${label}${sub ? `<small>${F.esc(sub)}</small>` : ""}</span><span class="b-switch" aria-hidden="true"></span>
    </button>`;

  // The next issue's reminder: when it opens, the countdown, and the channels it comes by.
  function remHTML() {
    const n = F.NEXT;
    if (!n) return '<p class="b-quiet">Chưa có Số mới</p>';
    // The announcement in the inbox carries the opening time; the card counts down to it (screen readers get the time).
    const r = F.reminders.list().find((x) => x.issue === n.no);
    const head = `<p class="b-rem-no disp">${F.issueLabel(n.no)}</p>
      <p class="b-rem-cd"><span class="cd-label">Mở sau</span><span class="cd-big" data-until="${n.opensAt}" role="timer" aria-label="Mở ${F.esc(H.when(n.opensAt))}">${F.cdHTML(n.opensAt)}</span></p>`;
    if (!r) return `<div class="b-rem">${head}${F.remindBtn(n.no)}</div>`;
    const on = (c) => r.channels.includes(c);
    return `<div class="b-rem">${head}
      <div class="b-set" role="group" aria-label="Nhắc ${F.issueLabel(n.no)} qua">
        ${setRow("data-ch", "push", "Trong app", "device-mobile", on("push"))}
        ${setRow("data-ch", "email", "Email", "envelope-simple", on("email"), H.ACCOUNT.email)}
      </div>
    </div>`;
  }

  const prefs = () => Object.assign({ order: true, drop: true, wishlist: true, promo: true }, prefStore.get() || {});
  const prefsHTML = () => {
    const p = prefs();
    return `<div class="b-set" role="group" aria-labelledby="h-prefs">${PREFS.map(([k, label, ic]) => setRow("data-pref", k, label, ic, p[k])).join("")}</div>`;
  };

  // ---------------------------------------------------------------- the phone bar shows the title once the page's own has gone
  const bar = document.querySelector(".mbar");
  let io = null;
  let watched = null;
  function watchTitle(hero) {
    if (!bar || !("IntersectionObserver" in window)) return;
    bar.classList.add("title-late");
    io = io || new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.target === watched) bar.classList.toggle("title-on", !en.isIntersecting);
    }), { rootMargin: "-56px 0px 0px 0px" });
    if (watched) io.unobserve(watched);
    watched = hero;
    if (hero) io.observe(hero);
  }

  // ---------------------------------------------------------------- render
  function render() {
    if (!F.signedIn) {
      // Signed out: the account pages' way in (ACC.signedOut), never someone's inbox.
      el.innerHTML = `<div class="b-head"><h1 class="b-title disp">Thông báo</h1></div>
        <div class="b-gatewrap">${window.ACC.signedOut({ title: "Đăng nhập để xem thông báo", perks: false, id: "out-notif" })}</div>`;
      if (acts) acts.innerHTML = "";
      watchTitle(el.querySelector(".b-title"));
      return;
    }
    const list = F.inbox.list();
    const unread = list.some((n) => n.unread);
    el.innerHTML = `<div class="b-head"><h1 class="b-title disp" tabindex="-1">Thông báo</h1>${unread ? readAll("b-desk-only") : ""}</div>
      <div class="b-notif">
        <section class="b-inbox" aria-label="Hộp thư">${inboxHTML(list)}</section>
        <div class="b-nside">
          <section class="b-sec" aria-labelledby="h-rem"><h2 class="sect-title" id="h-rem">Nhắc mở bán</h2>${remHTML()}</section>
          <section class="b-sec" id="cai-dat" aria-labelledby="h-prefs"><h2 class="sect-title" id="h-prefs">Nhận thông báo về</h2>${prefsHTML()}</section>
        </div>
      </div>`;
    if (acts) acts.innerHTML = unread ? readAll("") : "";
    watchTitle(el.querySelector(".b-title"));
    F.paintReminders();
    F.tick();
    if (focusAfter) {
      const t = el.querySelector(focusAfter) || el.querySelector("h1");
      if (t) t.focus({ preventScroll: true });
      focusAfter = null;
    }
  }

  // ---------------------------------------------------------------- actions
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-read-all]")) {
      focusAfter = "h1";
      F.inbox.markAllRead();
    }
  });

  el.addEventListener("click", (e) => {
    const a = e.target.closest("[data-key]");
    if (a) {
      // Opening an item reads it; the page is about to leave, so it is not drawn again.
      quiet = true;
      F.inbox.markRead(a.dataset.key);
      quiet = false;
      return;
    }
    if (e.target.closest("[data-remind]")) { focusAfter = '[data-ch="push"]'; return; }  // the chrome turns it on
    const ch = e.target.closest("[data-ch]");
    if (ch && F.NEXT) {
      const no = F.NEXT.no;
      const r = F.reminders.list().find((x) => x.issue === no);
      if (!r) return;
      const c = ch.dataset.ch;
      const next = r.channels.includes(c) ? r.channels.filter((x) => x !== c) : r.channels.concat([c]);
      if (next.length) {
        focusAfter = `[data-ch="${c}"]`;
        F.reminders.setChannels(no, next);
        return;
      }
      // The last channel off: the reminder goes, and can come back as it was.
      const before = r.channels.slice();
      focusAfter = "[data-remind]";
      F.reminders.toggle(no);
      F.toast(`Đã tắt nhắc ${F.issueLabel(no)}`, {
        label: "Hoàn tác",
        run() {
          focusAfter = `[data-ch="${c}"]`;
          F.reminders.toggle(no);
          F.reminders.setChannels(no, before);
        },
      });
      return;
    }
    const p = e.target.closest("[data-pref]");
    if (p) {
      const all = prefs();
      all[p.dataset.pref] = !all[p.dataset.pref];
      prefStore.set(all);
      p.setAttribute("aria-checked", String(all[p.dataset.pref]));
    }
  });

  addEventListener("feed:change", (e) => {
    if (quiet) return;
    if (["inbox", "reminders", "storage"].includes(e.detail)) render();
  });

  render();
  F.boot();
})();
