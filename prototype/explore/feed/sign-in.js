/*
 * Đăng nhập (sign-in.html): email and password, as in the running app; Google is being prepared. Tạo tài khoản
 * (?mode=up) and Quên mật khẩu (?mode=forgot, which ends on "sent"). ?errors=1 shows each mode after a failed try.
 * After signing in, the shopper returns to ?next= (where they came from), signed in.
 * The fields, their rules and the Đăng nhập form live in account.js (ACC.si*), shared with Tôi's inline form.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const A = window.ACC;
  const H = F.H;
  const el = document.querySelector("[data-si]");
  const q = new URLSearchParams(location.search);
  const MODES = { in: "Đăng nhập", up: "Tạo tài khoản", forgot: "Quên mật khẩu" };
  let mode = MODES[q.get("mode")] ? q.get("mode") : "in";
  const errors = q.get("errors") === "1";
  const next = q.get("next") || "account.html";
  const P = H.ACCOUNT;

  // A link to another mode of this page, keeping next= and the moment (signed-out state included).
  const modeHref = (m) => {
    const p = new URLSearchParams(location.search);
    if (m === "in") p.delete("mode"); else p.set("mode", m);
    p.delete("errors");
    const s = p.toString();
    return "sign-in.html" + (s ? "?" + s : "");
  };

  const input = A.siField;
  const pass = A.siPass;
  const google = `<p class="si-or">hoặc</p>
    <button class="btn btn-line si-google" type="button" disabled aria-describedby="g-soon">${F.icon("google-logo")}Tiếp tục với Google<span class="tag-soon" id="g-soon">Đang chuẩn bị</span></button>`;

  function body() {
    if (mode === "up") {
      return `<form class="si-form" novalidate data-si-form>
          ${input("name", "Họ và tên", 'autocomplete="name"', errors ? "" : "")}
          ${input("email", "Email", 'type="email" autocomplete="email"', errors ? P.email : "")}
          ${pass("Mật khẩu", "new-password")}
          <button class="btn btn-blue" type="submit">Tạo tài khoản</button>
        </form>
        ${google}
        <a class="link si-switch" href="${F.url(modeHref("in"))}">Đã có tài khoản? Đăng nhập</a>`;
    }
    if (mode === "forgot") {
      return `<form class="si-form" novalidate data-si-form>
          ${input("email", "Email đã đăng ký", 'type="email" autocomplete="email"', errors ? "minhkhoa@email" : "")}
          <button class="btn btn-blue" type="submit">Gửi liên kết</button>
        </form>
        <a class="link si-switch" href="${F.url(modeHref("in"))}">Về đăng nhập</a>`;
    }
    return `${A.signInForm({ errors, forgot: F.url(modeHref("forgot")) })}
      ${google}
      <a class="link si-switch" href="${F.url(modeHref("up"))}">Chưa có tài khoản? Tạo tài khoản</a>`;
  }

  function sent(email) {
    return `<div class="si-sent" role="status">
        <p class="si-sent-line">${F.okTitle("Đã gửi liên kết đặt lại mật khẩu tới")} <b>${F.esc(email)}</b></p>
        <button class="link" type="button" data-resend>Gửi lại</button>
        <a class="btn btn-line" href="${F.url(modeHref("in"))}">Về đăng nhập</a>
      </div>`;
  }

  function render() {
    document.title = MODES[mode] + " | HIVE";
    const bar = document.querySelector(".mbar-title");
    if (bar) bar.textContent = MODES[mode];
    el.innerHTML = `<div class="si">
        <h1 class="si-title disp">${MODES[mode]}</h1>
        ${body()}
      </div>
      <figure class="si-art"><img src="../shared/shots/suong-black-look.webp" width="1200" height="1500" alt="Người mặc SƯƠNG màu đen" loading="lazy" decoding="async"></figure>`;
    // A wrong password clears the field and says so above the form; a new account or a reset shows each field.
    if (errors && mode !== "in") A.siCheck(el.querySelector("[data-si-form]"), true, mode);
    A.revealTitleOn(el.querySelector(".si-title"));
  }

  // ---------------------------------------------------------------- validation (ACC.siCheck), then where each mode goes
  A.siWire(el, () => mode, (form) => {
    if (mode === "forgot") {
      const email = form.email.value.trim();
      el.querySelector(".si").innerHTML = `<h1 class="si-title disp">${MODES.forgot}</h1>${sent(email)}`;
      el.querySelector("[data-resend]").focus();
      return;
    }
    F.signIn(next);
  });

  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-resend]")) F.toast("Đã gửi lại liên kết");
  });

  render();
  F.boot();
})();
