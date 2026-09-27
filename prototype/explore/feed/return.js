/*
 * Đổi trả (return.html?id=DH-1496). Five steps, named by what they do, under Feed's story bars:
 *   Chọn món  the pieces (and how many)
 *   Lý do     one reason; "Lỗi may hoặc in" and "Giao nhầm món" ask for photos
 *   Đổi hay trả  đổi size, while every piece picked has another size left in its colour (closed issue or not; the
 *            7 days are the page's own limit), else the card says why; or hoàn tiền: what was paid for those pieces
 *            (HIVE.refundOf, the price less the code's share, plus delivery and the COD fee when the whole order comes
 *            back for the shop's fault), to the shopper's bank account (bank, number, holder)
 *   Xem lại   everything chosen, that the shop pays the delivery back, the unworn-with-tags check, send
 *   Đã gửi    the request code, when and where the shop answers (HIVE.RETURNS), what happens next
 * The sent request is kept on this device and shows on order.html. &step=pick|reason|resolve|review|sent opens a
 * step (earlier choices are filled in); &reason=1..5 picks a reason. Orders that cannot be returned say why.
 * No courier and no pickup address: the shop has not named them.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const A = window.ACC;
  const H = F.H;
  const el = document.querySelector("[data-return]");
  const q = new URLSearchParams(location.search);
  const code = (q.get("id") || "").trim().toUpperCase();
  const o = H.findOrder(code);
  const STEPS = [
    ["pick", "Chọn món"],
    ["reason", "Lý do"],
    ["resolve", "Đổi hay trả"],
    ["review", "Xem lại"],
    ["sent", "Đã gửi"],
  ];
  const PHOTO_REASONS = ["Lỗi may hoặc in", "Giao nhầm món"];
  // The shopper's bank, by the short names Vietnamese banking apps use. (The shop's own account does not exist yet.)
  const BANKS = ["ABBANK", "ACB", "Agribank", "Bac A Bank", "BIDV", "BVBank", "Eximbank", "HDBank", "Kienlongbank",
    "LPBank", "MB", "MSB", "Nam A Bank", "NCB", "OCB", "PGBank", "PVcomBank", "Sacombank", "Saigonbank", "SeABank",
    "SHB", "Techcombank", "TPBank", "VIB", "VietABank", "Vietbank", "Vietcombank", "VietinBank", "VPBank"];
  const ANSWER_BY = { inbox: "Thông báo", email: "email" };
  const lineKey = (l) => `${l.slug}|${l.color}|${l.size}`;
  const orderHref = () => F.url("order.html?id=" + code);

  // A screen with nothing to fill in: why, and where to go.
  function stop(title, line, acts) {
    document.body.classList.add("no-bar");
    el.innerHTML = `<div class="rt-bar"><div class="rt-bar-row">
        <a class="ib" href="${o ? orderHref() : F.url("orders.html")}" aria-label="Quay lại">${F.icon("caret-left")}</a>
        <p class="rt-bar-title">Đổi trả</p></div></div>
      <div class="rt-main">
        <div class="nf">
          <h1 class="nf-title disp">${title}</h1>
          ${line ? `<p class="nf-line">${line}</p>` : ""}
          <div class="nf-acts">${acts}</div>
        </div>
      </div>`;
    F.boot();
  }

  if (!F.signedIn) {
    document.body.classList.add("no-bar");
    el.innerHTML = `<div class="rt-main"><h1 class="vh">Đổi trả</h1>${A.signedOut({ title: "Đăng nhập để đổi trả", perks: false, id: "out-rt" })}</div>`;
    F.boot();
    return;
  }
  if (!o || !A.status(o)) {
    stop(`Không tìm thấy đơn${code ? " " + F.esc(code) : ""}`, "",
      `<a class="btn btn-blue" href="${F.url("orders.html")}">Xem đơn hàng</a>`);
    return;
  }

  const st = A.status(o);
  const saved = A.returnOf(o.code);
  const help = `<a class="btn btn-line" href="${F.url("help.html#doi-tra")}">Điều kiện đổi trả</a>
    <a class="btn btn-line" href="${F.url("contact.html")}">Liên hệ</a>`;

  if (!saved) {
    if (st.state === "CANCELLED") {
      stop("Đơn đã huỷ", `${o.code}: ${F.esc(st.reason)}.`, `<a class="btn btn-blue" href="${orderHref()}">Xem đơn</a>`);
      return;
    }
    if (st.state !== "DELIVERED") {
      stop("Chưa đổi trả được", `${o.code} chưa giao tới bạn.`, `<a class="btn btn-blue" href="${orderHref()}">Xem đơn</a>`);
      return;
    }
    if (!A.canReturn(o)) {
      const until = H.returnUntil(o);
      stop("Đã quá hạn đổi trả",
        `Hạn là <b>${H.day(until)}</b>, ${H.SHIPPING.returnDays} ngày sau khi giao ${H.day(st.at)}.`, help);
      return;
    }
  }

  document.title = `Đổi trả ${o.code} | HIVE`;
  const until = H.returnUntil(o);

  // ---------------------------------------------------------------- the request being written
  const req = {
    picked: {}, reason: null, photos: [], note: "", resolution: null, toSize: {}, confirm: false,
    // The account a refund goes to; the holder starts as the account's name the way banks print it.
    bank: null, account: "", holder: H.fold(A.profile().name).toUpperCase(),
  };
  const pickedLines = () => o.lines.filter((l) => req.picked[lineKey(l)] > 0);
  const needsPhotos = () => PHOTO_REASONS.includes(req.reason);
  const sizesFor = (l) => H.sizes(H.find(l.slug) || {}, l.color).filter((x) => x.size !== l.size && x.n > 0);
  // An exchange needs another size for every piece picked; the pieces without one say why there is none.
  const noSize = () => pickedLines().filter((l) => !sizesFor(l).length);
  const canExchange = () => pickedLines().length > 0 && !noSize().length;
  const refundOf = () => H.refundOf(o, o.lines.map((l, i) => ({ i, qty: req.picked[lineKey(l)] || 0 })).filter((x) => x.qty > 0), req.reason);
  const refund = () => refundOf().amount;
  const digits = (t) => String(t || "").replace(/\D/g, "");
  // Banks print the holder in capitals without tone marks: "TRAN MINH KHOA".
  const holderOf = () => H.fold(req.holder).toUpperCase();

  // Direct links into a later step get sensible earlier choices, so no step opens half empty.
  const startStep = STEPS.some((s) => s[0] === q.get("step")) ? q.get("step") : "pick";
  const reasonIdx = Number(q.get("reason"));
  if (o.lines.length === 1 || startStep !== "pick") req.picked[lineKey(o.lines[0])] = 1;
  if (reasonIdx >= 1 && reasonIdx <= H.RETURN_REASONS.length) req.reason = H.RETURN_REASONS[reasonIdx - 1];
  const at = STEPS.findIndex((s) => s[0] === startStep);
  if (at >= 2 && !req.reason) req.reason = H.RETURN_REASONS[0];
  if (at >= 2) {
    const l = pickedLines()[0];
    const alt = l && (sizesFor(l).find((x) => x.size === "L") || sizesFor(l)[0]);
    req.resolution = alt ? "exchange" : "refund";
    if (alt && at >= 3) req.toSize[lineKey(l)] = alt.size;
    if (!alt && at >= 3) { req.bank = "Vietcombank"; req.account = "0123456789"; }
  }

  // ---------------------------------------------------------------- step bodies
  function pieceCard(l) {
    const k = lineKey(l);
    const L = H.orderLine(l);
    const n = req.picked[k] || 0;
    const qty = l.qty > 1 && n > 0 ? `<div class="rt-qty step" role="group" aria-label="Số lượng trả ${F.esc(L.style.name)}, đã mua ${l.qty}">
        <button type="button" data-rq="-1" data-k="${k}" aria-label="Bớt một"${n <= 1 ? " disabled" : ""}>${F.icon("minus")}</button>
        <output>${n}</output>
        <button type="button" data-rq="1" data-k="${k}" aria-label="Thêm một"${n >= l.qty ? " disabled" : ""}>${F.icon("plus")}</button>
      </div>` : "";
    return `<div class="rt-piece-wrap"><label class="rcard rt-piece">
      <input type="checkbox" name="piece" value="${k}"${n > 0 ? " checked" : ""}>
      ${A.tile(l, { qty: false, named: false })}
      <span class="rcard-main">
        <span class="rcard-title disp rt-piece-name">${F.esc(L.style.name)}</span>
        <span class="rcard-sub">${F.esc(L.colorLabel)} · Size ${l.size}${l.qty > 1 ? ` · đã mua ${l.qty}` : ""}</span>
      </span>
      <span class="rt-check" aria-hidden="true">${F.icon("check")}</span>
    </label>${qty}</div>`;
  }

  function bodyPick() {
    return `<div class="rt-body" role="group" aria-label="Món muốn đổi trả">${o.lines.map(pieceCard).join("")}</div>`;
  }

  function bodyReason() {
    const photos = needsPhotos() ? `<section class="rt-photos" aria-labelledby="rt-ph">
        <p class="sh-label" id="rt-ph">Ảnh <span>${req.photos.length ? req.photos.length + " ảnh" : "ít nhất 1 ảnh"}</span></p>
        <div class="rt-photo-grid">
          ${req.photos.map((p, i) => `<div class="rt-photo"><img src="${p}" alt="Ảnh ${i + 1}"><button class="rt-photo-x" type="button" data-rm-photo="${i}" aria-label="Bỏ ảnh ${i + 1}">${F.icon("x")}</button></div>`).join("")}
          ${req.photos.length < 4 ? `<label class="rt-add">${F.icon("camera")}<span>Thêm ảnh</span><input type="file" accept="image/*" multiple data-photo aria-label="Thêm ảnh"></label>` : ""}
        </div>
      </section>` : "";
    return `<div class="rt-body rcards" role="radiogroup" aria-label="Lý do">${H.RETURN_REASONS.map((r) => `<label class="rcard rt-reason">
        <input type="radio" name="reason" value="${F.esc(r)}"${req.reason === r ? " checked" : ""}>
        <span class="rcard-main"><span class="rcard-title">${F.esc(r)}</span></span>
      </label>`).join("")}</div>
      ${photos}
      <label class="field rt-notefield"><span class="lbl">Ghi chú <span class="opt">tuỳ chọn</span></span>
        <textarea name="note" rows="3" data-note>${F.esc(req.note)}</textarea></label>`;
  }

  // The account a refund is paid to: the app's picker for the bank (searchable, like Tỉnh / thành), two fields.
  function bankBlock() {
    return `<section class="rt-bank" aria-labelledby="rt-bank-h">
        <p class="sh-label" id="rt-bank-h">Tài khoản nhận tiền</p>
        <div class="field" data-f="bank"><span class="lbl" id="l-bank">Ngân hàng</span>
          <button class="pick" type="button" id="f-bank" data-pick-bank aria-haspopup="dialog" aria-labelledby="l-bank v-bank" aria-describedby="e-bank">
            <span class="pick-v${req.bank ? "" : " is-empty"}" id="v-bank">${F.esc(req.bank || "Chọn ngân hàng")}</span>${F.icon("caret-down")}</button>
          <span class="err" id="e-bank" hidden></span></div>
        <label class="field" data-f="account"><span class="lbl">Số tài khoản</span>
          <input name="account" value="${F.esc(req.account)}" inputmode="numeric" autocomplete="off" spellcheck="false" aria-describedby="e-account">
          <span class="err" id="e-account" hidden></span></label>
        <label class="field" data-f="holder"><span class="lbl">Chủ tài khoản</span>
          <input name="holder" class="rt-holder" value="${F.esc(req.holder)}" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-describedby="e-holder">
          <span class="err" id="e-holder" hidden></span></label>
      </section>`;
  }

  // Each field's problem, or "" (checked when the shopper moves on from Đổi hay trả).
  function bankErrors() {
    const n = digits(req.account);
    return {
      bank: req.bank ? "" : "Chọn ngân hàng",
      account: !n ? "Nhập số tài khoản" : n.length < 6 || n.length > 19 || /[^\d\s.]/.test(req.account) ? "Số tài khoản gồm 6 đến 19 chữ số" : "",
      holder: req.holder.trim() ? "" : "Nhập tên chủ tài khoản",
    };
  }
  function setErr(name, msg) {
    const box = el.querySelector(`[data-f="${name}"]`);
    if (!box) return null;
    const err = box.querySelector(".err");
    const c = name === "bank" ? box.querySelector("#f-bank") : box.querySelector("input");
    box.classList.toggle("is-error", !!msg);
    err.hidden = !msg;
    err.innerHTML = msg ? `${F.icon("warning-circle")}<span>${msg}</span>` : "";
    if (msg) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid");
    return msg ? c : null;
  }

  function bodyResolve() {
    const lines = pickedLines();
    const ok = canExchange();
    if (req.resolution === "exchange" && !ok) req.resolution = null;
    const missing = noSize();
    // "Hết size khác", or the pieces that have none when only some of several are out.
    const why = missing.length === lines.length ? "Hết size khác" : missing.map((l) => H.orderLine(l).style.name).join(", ") + " hết size khác";
    const sizeBlocks = req.resolution === "exchange" && ok ? lines.map((l) => {
      const k = lineKey(l);
      const L = H.orderLine(l);
      return `<div class="rt-sizes"><p class="rt-for">${F.esc(L.style.name)} ${F.esc(L.colorLabel.toLowerCase())}, đang là size ${l.size}</p>
        <div class="sizes" role="radiogroup" aria-label="Size mới cho ${F.esc(L.style.name)}">${H.SIZES.filter((z) => z !== l.size).map((z) => {
          const n = H.stockOf(l.slug, l.color, z);
          return `<label class="size"><input type="radio" name="to-${k}" value="${z}"${n === 0 ? " disabled" : ""}${req.toSize[k] === z && n > 0 ? " checked" : ""}><span class="sz">${z}</span>${n === 0 ? "<small>Hết</small>" : n <= 2 ? `<small>Còn ${n}</small>` : ""}</label>`;
        }).join("")}</div></div>`;
    }).join("") : "";
    return `<div class="rt-body rcards" role="radiogroup" aria-label="Đổi hay trả">
        <label class="rcard${ok ? "" : " is-off"}">
          <input type="radio" name="resolution" value="exchange"${req.resolution === "exchange" && ok ? " checked" : ""}${ok ? "" : " disabled"}>
          <span class="rcard-ic">${F.icon("arrows-clockwise")}</span>
          <span class="rcard-main"><span class="rcard-title">Đổi size</span>${ok ? "" : `<span class="rcard-note">${F.esc(why)}</span>`}</span>
        </label>
        <label class="rcard">
          <input type="radio" name="resolution" value="refund"${req.resolution === "refund" ? " checked" : ""}>
          <span class="rcard-ic">${F.icon("coins")}</span>
          <span class="rcard-main"><span class="rcard-title">Hoàn tiền</span><span class="rcard-sub rt-amount">${H.vnd(refund())}</span></span>
        </label>
      </div>${sizeBlocks}${req.resolution === "refund" ? bankBlock() : ""}`;
  }

  // The fees inside a refund, named in one row: "Gồm phí COD 15.000₫".
  function feesRow() {
    const r = refundOf();
    if (!r.fees) return "";
    const t = H.orderTotals(o);
    const what = [t.shipping ? "phí giao hàng" : "", t.cod ? "phí COD" : ""].filter(Boolean).join(", ");
    return `<div><dt>Gồm ${what}</dt><dd>${H.vnd(r.fees)}</dd></div>`;
  }

  function resolutionText(r) {
    if (r.resolution !== "exchange") return `Hoàn tiền <b>${H.vnd(refund())}</b>`;
    return "Đổi sang size " + pickedLines().map((l) => req.toSize[lineKey(l)]).filter(Boolean).join(", ");
  }

  function bodyReview() {
    const lines = pickedLines();
    return `<div class="rt-review">
        <ul class="od-items">${lines.map((l) => {
          const L = H.orderLine(l);
          const n = req.picked[lineKey(l)];
          return `<li class="od-item">${A.tile(l, { size: "lg", qty: false, named: false })}
            <div><p class="od-item-name disp">${F.esc(L.style.name)}</p><p class="od-item-meta">${F.esc(L.colorLabel)} · Size ${l.size}${n > 1 ? ` · ×${n}` : ""}</p></div></li>`;
        }).join("")}</ul>
        <dl class="facts rt-review-facts">
          <div><dt>Lý do</dt><dd>${F.esc(req.reason)}</dd></div>
          ${req.photos.length ? `<div><dt>Ảnh</dt><dd>${req.photos.length} ảnh</dd></div>` : ""}
          ${req.note ? `<div><dt>Ghi chú</dt><dd>${F.esc(req.note)}</dd></div>` : ""}
          <div><dt>Xử lý</dt><dd>${resolutionText(req)}</dd></div>
          ${req.resolution === "refund" ? feesRow() : ""}
          ${req.resolution === "refund" ? `<div><dt>Tài khoản nhận</dt><dd>${F.esc(req.bank)} ${F.esc(digits(req.account))}<br>${F.esc(holderOf())}</dd></div>` : ""}
          ${H.RETURNS.shipBackBy === "shop" ? "<div><dt>Gửi hàng về</dt><dd>Cửa hàng trả phí</dd></div>" : ""}
        </dl>
        <label class="rt-decl"><input type="checkbox" name="confirm"${req.confirm ? " checked" : ""}>
          <span class="rt-check" aria-hidden="true">${F.icon("check")}</span><span>Hàng chưa mặc, còn nhãn</span></label>
      </div>`;
  }

  function bodySent(r) {
    const [d1, d2] = H.RETURNS.answerDays;
    const by = H.RETURNS.answerBy.map((k) => ANSWER_BY[k] || k).join(" và ");
    const steps = [
      { label: "Đã gửi", at: r.sentAt, cls: "is-done" },
      { label: "Cửa hàng xem", cls: "is-now" },
      { label: "Gửi hàng về", cls: "" },
      { label: r.resolution === "exchange" ? "Đổi size" : "Hoàn tiền", cls: "" },
    ];
    return `<div class="rt-sent">
        <div class="copyrow rt-code-row"><span class="copy-k">Mã yêu cầu</span><b class="copy-v" id="v-rq">${F.esc(r.code)}</b>
          <button class="copy" type="button" data-copy="${F.esc(r.code)}" data-target="v-rq" aria-label="Chép mã yêu cầu">${F.icon("copy")}<span data-copy-label>Chép</span></button></div>
        <p class="rt-answer">${F.icon("bell")}<span>Cửa hàng trả lời trong <b>${d1} đến ${d2} ngày</b>, qua ${by}</span></p>
        <ol class="osteps rt-next" aria-label="Tiếp theo">${steps.map((s) =>
          `<li class="ostep ${s.cls}"${s.cls === "is-now" ? ' aria-current="step"' : ""}><div class="ostep-bar" aria-hidden="true"><i></i></div>
            <p class="ostep-label">${s.label}</p>${s.at ? `<p class="ostep-at">${A.at(s.at)}</p>` : ""}</li>`).join("")}</ol>
      </div>`;
  }

  // ---------------------------------------------------------------- validation per step
  function problem(step) {
    if (step === "pick" && !pickedLines().length) return "Chọn ít nhất một món";
    if (step === "reason") {
      if (!req.reason) return "Chọn lý do";
      if (needsPhotos() && !req.photos.length) return "Thêm ít nhất một ảnh";
    }
    if (step === "resolve") {
      if (!req.resolution) return "Chọn đổi size hoặc hoàn tiền";
      if (req.resolution === "exchange" && pickedLines().some((l) => !req.toSize[lineKey(l)])) return "Chọn size muốn đổi";
    }
    if (step === "review" && !req.confirm) return "Xác nhận hàng chưa mặc, còn nhãn";
    return "";
  }

  // ---------------------------------------------------------------- render
  let cur = startStep;
  let sentReq = null;

  // Desktop: what was chosen in the steps before, while the current step's body does not show it.
  function asideHtml() {
    const lines = pickedLines();
    return `<ul class="od-items rt-aside-items">${lines.map((l) => {
        const L = H.orderLine(l);
        const n = req.picked[lineKey(l)];
        return `<li class="od-item">${A.tile(l, { qty: false, named: false })}<div><p class="od-item-name disp">${F.esc(L.style.name)}</p>
          <p class="od-item-meta">${F.esc(L.colorLabel)} · Size ${l.size}${n > 1 ? ` · ×${n}` : ""}</p></div></li>`;
      }).join("")}</ul>
      ${cur === "resolve" && req.reason ? `<p class="rt-aside-reason">${F.esc(req.reason)}</p>` : ""}`;
  }

  function render(focus) {
    const i = STEPS.findIndex((s) => s[0] === cur);
    const r = cur === "sent" ? sentReq || saved || demoSent() : null;
    const title = cur === "sent" ? "Đã gửi yêu cầu" : STEPS[i][1];
    let body = "";
    if (cur === "pick") body = bodyPick();
    if (cur === "reason") body = bodyReason();
    if (cur === "resolve") body = bodyResolve();
    if (cur === "review") body = bodyReview();
    if (cur === "sent") body = bodySent(r);
    const sub = cur === "pick" ? `Hạn <b>${H.day(until)}</b>` : "";
    const aside = cur === "reason" || cur === "resolve";
    const actLabel = cur === "review" ? "Gửi yêu cầu" : "Tiếp tục";
    document.body.classList.toggle("no-bar", cur === "sent");
    el.innerHTML = `<div class="rt-bar">
        <div class="rt-bar-row">
          <a class="ib" href="${orderHref()}" data-rt-back aria-label="${i === 0 || cur === "sent" ? "Về đơn " + o.code : "Bước trước"}">${F.icon(cur === "sent" ? "x" : "caret-left")}</a>
          <p class="rt-bar-title">Đổi trả <span>${o.code}</span></p>
        </div>
        <div class="rt-prog"${cur === "sent" ? " hidden" : ""} role="progressbar" aria-label="Tiến trình" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${i + 1}" aria-valuetext="${F.esc(STEPS[i][1])}">${STEPS.map((_, j) => `<i class="${j <= i ? "on" : ""}"></i>`).join("")}</div>
      </div>
      <div class="rt-main">
        <h1 class="rt-h1 disp" tabindex="-1">${cur === "sent" ? F.okTitle(title) : title}</h1>
        ${sub ? `<p class="rt-sub">${sub}</p>` : ""}
        <form class="rt-form" novalidate data-rt-form>${body}</form>
        ${cur === "sent"
          ? `<div class="rt-done-acts"><a class="btn btn-blue" href="${orderHref()}">Xem đơn</a></div>`
          : `<div class="rt-actbar"><p class="err" data-rt-err hidden></p><button class="btn btn-blue" type="button" data-rt-next>${actLabel}</button></div>`}
      </div>
      ${aside ? `<aside class="rt-aside" aria-label="Món đổi trả">${asideHtml()}</aside>` : ""}`;
    if (focus) {
      const h = el.querySelector(".rt-h1");
      h.focus({ preventScroll: true });
      scrollTo(0, 0);
    }
    F.tick();
  }

  function demoSent() {
    return {
      code: "DT-" + o.code.replace(/\D/g, ""), sentAt: new Date(H.nowMs()).toISOString(), reason: req.reason || H.RETURN_REASONS[0],
      resolution: req.resolution || "exchange", amount: req.resolution === "refund" ? refund() : null,
      items: pickedLines().map((l) => ({ slug: l.slug, color: l.color, size: l.size, qty: req.picked[lineKey(l)], toSize: req.toSize[lineKey(l)] || null })),
    };
  }

  function go(step, push) {
    cur = step;
    if (push) {
      const p = new URLSearchParams(location.search);
      p.set("step", step);
      history.pushState({ step }, "", "?" + p.toString());
    }
    render(true);
  }

  addEventListener("popstate", () => {
    const s = new URLSearchParams(location.search).get("step") || "pick";
    if (sentReq && s !== "sent") { history.replaceState({ step: "sent" }, "", "?" + new URLSearchParams({ id: code, step: "sent" }).toString()); return; }
    cur = STEPS.some((x) => x[0] === s) ? s : "pick";
    render(true);
  });

  // ---------------------------------------------------------------- events
  el.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "piece") {
      req.picked[t.value] = t.checked ? 1 : 0;
      render(false);
      const again = el.querySelector(`input[name="piece"][value="${t.value}"]`);
      if (again) again.focus({ preventScroll: true });
    } else if (t.name === "reason") {
      req.reason = t.value;
      render(false);
      el.querySelector(`input[name="reason"][value="${CSS.escape(t.value)}"]`).focus({ preventScroll: true });
    } else if (t.name === "resolution") {
      req.resolution = t.value;
      render(false);
      el.querySelector(`input[name="resolution"][value="${t.value}"]`).focus({ preventScroll: true });
    } else if (t.name && t.name.startsWith("to-")) {
      req.toSize[t.name.slice(3)] = t.value;
    } else if (t.name === "holder") {
      // Typed with tone marks (a Vietnamese keyboard adds them): set the way banks print it once the field is left.
      req.holder = holderOf();
      t.value = req.holder;
    } else if (t.name === "confirm") {
      req.confirm = t.checked;
    } else if (t.matches("[data-photo]")) {
      const files = Array.from(t.files || []).slice(0, 4 - req.photos.length);
      files.forEach((f) => req.photos.push(URL.createObjectURL(f)));
      render(false);
      const add = el.querySelector("[data-photo]") || el.querySelector(".rt-photo-x");
      if (add) add.focus({ preventScroll: true });
    }
    const err = el.querySelector("[data-rt-err]");
    if (err && !err.hidden && !problem(cur)) err.hidden = true;
  });
  el.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("[data-note]")) req.note = t.value.trim();
    if (t.name === "account" || t.name === "holder") {
      req[t.name] = t.name === "holder" ? t.value.toUpperCase() : t.value;
      // A field in error clears as soon as it is right.
      if (t.closest(".is-error") && !bankErrors()[t.name]) setErr(t.name, "");
    }
  });

  el.addEventListener("click", (e) => {
    const rq = e.target.closest("[data-rq]");
    if (rq) {
      e.preventDefault();
      const k = rq.dataset.k;
      const l = o.lines.find((x) => lineKey(x) === k);
      req.picked[k] = Math.max(1, Math.min(l.qty, (req.picked[k] || 1) + Number(rq.dataset.rq)));
      render(false);
      const again = el.querySelector(`[data-rq="${rq.dataset.rq}"][data-k="${k}"]`);
      if (again && !again.disabled) again.focus({ preventScroll: true });
      return;
    }
    const rm = e.target.closest("[data-rm-photo]");
    if (rm) { req.photos.splice(Number(rm.dataset.rmPhoto), 1); render(false); return; }
    const cp = e.target.closest("[data-copy]");
    if (cp) { F.copy(cp, cp.dataset.copy, document.getElementById(cp.dataset.target)); return; }
    const pb = e.target.closest("[data-pick-bank]");
    if (pb) {
      F.openPicker({
        title: "Ngân hàng", placeholder: "Tìm ngân hàng", value: req.bank,
        items: BANKS.map((b) => ({ value: b, label: b })),
        onPick: (it) => {
          req.bank = it.value;
          const v = el.querySelector("#v-bank");
          v.textContent = it.value;
          v.classList.remove("is-empty");
          setErr("bank", "");
          el.querySelector('[name="account"]').focus();
        },
      }, pb);
      return;
    }
    const back = e.target.closest("[data-rt-back]");
    if (back) {
      const i = STEPS.findIndex((s) => s[0] === cur);
      if (i > 0 && cur !== "sent") { e.preventDefault(); go(STEPS[i - 1][0], true); }
      return;
    }
    if (e.target.closest("[data-rt-next]")) {
      if (cur === "resolve" && req.resolution === "refund") {
        const errs = bankErrors();
        let first = null;
        Object.keys(errs).forEach((k) => { const c = setErr(k, errs[k]); if (!first && c) first = c; });
        if (first) { first.focus(); return; }
      }
      const msg = problem(cur);
      const err = el.querySelector("[data-rt-err]");
      if (msg) {
        err.hidden = false;
        err.innerHTML = `${F.icon("warning-circle")}<span>${msg}</span>`;
        err.setAttribute("role", "alert");
        return;
      }
      const i = STEPS.findIndex((s) => s[0] === cur);
      if (cur === "review") {
        sentReq = {
          code: "DT-" + o.code.replace(/\D/g, ""), sentAt: new Date(H.nowMs()).toISOString(), reason: req.reason,
          resolution: req.resolution, photos: req.photos.length, note: req.note,
          amount: req.resolution === "refund" ? refund() : null,
          bank: req.resolution === "refund" ? { name: req.bank, account: digits(req.account), holder: holderOf() } : null,
          items: pickedLines().map((l) => ({ slug: l.slug, color: l.color, size: l.size, qty: req.picked[lineKey(l)], toSize: req.toSize[lineKey(l)] || null })),
        };
        A.saveReturn(o.code, sentReq);
        const p = new URLSearchParams(location.search);
        p.set("step", "sent");
        history.replaceState({ step: "sent" }, "", "?" + p.toString());
        cur = "sent";
        render(true);
        return;
      }
      go(STEPS[i + 1][0], true);
    }
  });

  // A request already sent for this order: show it.
  if (saved) { sentReq = saved; cur = "sent"; }
  render(false);
  F.boot();
})();
