/*
 * Hỏi đáp: a search over the questions, then short answers grouped as the shopper meets them: đặt hàng,
 * thanh toán, giao hàng, đổi trả (#doi-tra), size, tài khoản. Every figure in an answer is read from the data, and
 * one answer follows the clock (when the next issue opens); delivery gives the rule only, since checkout shows the
 * dates. A policy the shop has not settled is not answered here (it goes to the open questions). No figure is printed
 * in two answers. The page ends with the way to write to the shop. Search is accent-insensitive, opens the answers it
 * finds and marks the words; ?q=cod opens a search.
 */
(function () {
  "use strict";

  const F = window.FEED;
  const H = F.H;
  const el = document.querySelector("[data-help]");
  const S = H.SHIPPING;
  const pay = (m) => H.PAYMENTS.find((p) => p.method === m);
  const TR = pay("BANK_TRANSFER");
  const COD = pay("COD");
  const CARD = pay("CARD");
  const STD = H.DELIVERY.find((d) => d.method === "STANDARD");
  const EXP = H.DELIVERY.find((d) => d.method === "EXPRESS");
  const R = H.RETURNS;
  const go = (href, label) => ({ href, label });
  const list = (arr) => arr.map((x, i) => (i ? F.low1(x) : x)).join(", ");
  // "a hoặc b", "a, b, hoặc c": a list inside a sentence ("hoặc", never "hay", the user's rule of 07/10/2026).
  const anyOf = (arr) =>
    arr.length > 2 ? `${arr.slice(0, -1).join(", ")}, hoặc ${arr[arr.length - 1]}`
    : arr.length === 2 ? `${arr[0]} hoặc ${arr[1]}`
    : arr.join("");

  // ---------------------------------------------------------------- the answers (facts only)
  function nextIssue() {
    if (F.NEXT) {
      const p = F.parts(F.NEXT.opensAt);
      return { a: `<b>${F.issueLabel(F.NEXT.no)}</b> mở lúc <b>${p.time} ${p.dow} ${p.dd}/${p.mm}</b>.`, go: go("home.html#sap-mo", "Xem Sắp mở") };
    }
    return { a: "Chưa có Số mới.", go: go("notifications.html#cai-dat", "Bật báo Số mới") };
  }

  const GROUPS = [
    { id: "dat-hang", title: "Đặt hàng", items: [
      { q: "Mua có cần tài khoản không?", a: "Không cần. Có tài khoản thì mọi đơn nằm ở mục Đơn hàng." },
      Object.assign({ q: "Khi nào có Số mới?" }, nextIssue()),
      { q: "Hết size thì có về lại không?", a: "Mẫu trong một Số cắt một lần, hết là hết. Dòng Cố định về thêm theo từng size.", go: go("products.html?dong=co-dinh", "Xem Cố định") },
      { q: "Huỷ đơn thế nào?", a: "Ở trang đơn: đơn chuyển khoản huỷ được tới khi trả tiền, đơn COD tới khi cửa hàng gọi xác nhận. Đơn chuyển khoản hết hạn giữ hàng mà chưa trả thì tự huỷ." },
      { q: "Dùng mã giảm giá ở đâu?", a: "Nhập ở mục Mã giảm giá khi thanh toán." },
    ] },
    { id: "thanh-toan", title: "Thanh toán", items: [
      { q: "Có những cách thanh toán nào?", a: `${list(H.PAYMENTS.map((p) => p.label))}.` },
      { q: "Chuyển khoản thế nào?", a: `${TR.note} Số tài khoản và tên ngân hàng đang chuẩn bị.` },
      { q: "COD có mất thêm phí không?", a: `Có, thêm <b>${H.vnd(COD.fee)}</b>. Cửa hàng gọi xác nhận trước khi giao. ${COD.note}` },
      { q: "Trả bằng thẻ được chưa?", a: `${CARD.note.split(".")[0]}. Đơn chọn thẻ trả bằng chuyển khoản, cùng hạn giữ hàng.` },
    ] },
    { id: "giao-hang", title: "Giao hàng", items: [
      { q: "Giao tới đâu?", a: `${STD.label} tới mọi tỉnh thành. Giao nhanh ${F.low1(EXP.note)}.` },
      { q: "Phí giao hàng bao nhiêu?", a: `${STD.label} <b>${H.vnd(STD.fee)}</b>, miễn phí cho đơn từ <b>${H.vnd(STD.freeFrom)}</b>. Giao nhanh <b>${H.vnd(EXP.fee)}</b>.` },
      { q: "Bao lâu thì nhận được hàng?", a: `${STD.label} ${STD.lead[0]} đến ${STD.lead[1]} ngày, giao nhanh trong ${EXP.days}.` },
      { q: "Theo dõi đơn ở đâu?", a: "Mã vận đơn hiện ở trang đơn khi hàng đang giao. Không có tài khoản thì tra bằng mã đơn và số điện thoại đặt hàng.", go: go("track.html", "Tra cứu đơn") },
    ] },
    { id: "doi-tra", title: "Đổi trả", items: [
      { q: "Đổi trả trong bao lâu?", a: `Trong <b>${S.returnDays} ngày</b> kể từ khi nhận hàng. Hàng chưa mặc, còn nhãn.` },
      { q: "Gửi yêu cầu đổi trả thế nào?", a: `Mở đơn đã giao ở mục Đơn hàng, chọn Đổi trả. Cửa hàng trả lời trong <b>${R.answerDays.join(" đến ")} ngày</b> qua ${R.answerBy.map((b) => (b === "inbox" ? "Thông báo" : b)).join(" và ")}.`, go: go("orders.html", "Xem Đơn hàng") },
      { q: "Ai trả phí gửi hàng về?", a: R.shipBackBy === "shop" ? "Cửa hàng trả." : "Bạn trả." },
      { q: "Hoàn tiền thế nào?", a: `Chuyển khoản vào tài khoản ngân hàng của bạn, đúng số đã trả cho những món trả lại: giá món trừ phần mã giảm giá. Trả cả đơn vì ${anyOf(H.SHOP_FAULT.map(F.low1))} thì hoàn cả phí giao hàng và phụ phí COD.` },
      { q: "Đổi sang size khác được không?", a: "Được, trong hạn đổi trả, sang size cùng màu còn hàng, kể cả khi Số đã đóng." },
      { q: "Lý do nào được đổi trả?", a: `${list(H.RETURN_REASONS)}. Lỗi may hoặc in và giao nhầm món cần ít nhất một ảnh.` },
    ] },
    { id: "size", title: "Size", items: [
      { q: "Chọn size thế nào?", a: `Số đo áo theo form ${Object.values(H.FITS).map((f) => f.toLowerCase()).join(", ")}, quần dài và quần short đều ở Bảng size.`, go: go("size-guide.html", "Xem Bảng size") },
      { q: "Size có chia nam nữ không?", a: `Không. Một dải size ${H.SIZES[0]} đến ${H.SIZES[H.SIZES.length - 1]} cho tất cả.` },
      { q: "Lưu size của mình ở đâu?", a: "Ở Hồ sơ, mục Size của tôi. Trang sản phẩm chọn sẵn size này khi còn hàng.", go: go("profile.html#size", "Mở Size của tôi") },
    ] },
    { id: "tai-khoan", title: "Tài khoản", items: [
      { q: "Đăng nhập bằng gì?", a: "Email và mật khẩu. Đăng nhập bằng Google đang chuẩn bị." },
      { q: "Quên mật khẩu thì sao?", a: "Chọn Quên mật khẩu ở trang đăng nhập, liên kết đặt lại gửi về email.", go: go("sign-in.html?mode=forgot", "Quên mật khẩu") },
      { q: "Đổi email ở đâu?", a: "Ở Hồ sơ. Email mới dùng được sau khi xác nhận qua liên kết gửi tới email đó.", go: go("profile.html", "Mở Hồ sơ") },
      { q: "Nhắc mở bán gửi qua đâu?", a: "Qua thông báo trong app và email. Bật hoặc tắt ở mục Thông báo.", go: go("notifications.html", "Mở Thông báo") },
    ] },
  ];

  // ---------------------------------------------------------------- search
  const strip = (html) => html.replace(/<[^>]+>/g, "");
  const words = (q) => H.fold(q).split(/\s+/).filter(Boolean);
  const hay = (it) => H.fold([it.q, strip(it.a), it.go ? it.go.label : ""].join(" "));
  const hits = (it, w) => w.every((x) => hay(it).includes(x));

  // One folded character per character of the text, so a match in folded text maps back onto the original.
  const foldCh = (c) => { const f = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase(); return f.length === 1 ? f : c.toLowerCase(); };
  function mark(root, w) {
    if (!w.length) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((t) => {
      const text = t.nodeValue;
      let folded = "";
      for (let i = 0; i < text.length; i++) folded += foldCh(text[i]);
      const spans = [];
      w.forEach((x) => { let at = folded.indexOf(x); while (at >= 0) { spans.push([at, at + x.length]); at = folded.indexOf(x, at + x.length); } });
      if (!spans.length) return;
      spans.sort((a, b) => a[0] - b[0]);
      const merged = [];
      spans.forEach((s) => { const last = merged[merged.length - 1]; if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]); else merged.push(s.slice()); });
      const frag = document.createDocumentFragment();
      let pos = 0;
      merged.forEach(([a, b]) => {
        if (a > pos) frag.append(text.slice(pos, a));
        const m = document.createElement("mark");
        m.className = "b-hit";
        m.textContent = text.slice(a, b);
        frag.append(m);
        pos = b;
      });
      if (pos < text.length) frag.append(text.slice(pos));
      t.replaceWith(frag);
    });
  }

  // ---------------------------------------------------------------- markup
  const qa = (g, it, i, open) => `<details class="b-qa" id="q-${g.id}-${i}"${open ? " open" : ""}>
      <summary><span class="b-qa-q">${F.esc(it.q)}</span>${F.icon("plus")}</summary>
      <div class="b-qa-a"><p>${it.a}</p>${it.go ? `<a class="link" href="${F.esc(F.url(it.go.href))}">${it.go.label}${F.icon("arrow-right")}</a>` : ""}</div>
    </details>`;

  el.innerHTML = `<div class="b-head"><h1 class="b-title disp">Hỏi đáp</h1></div>
    <div class="b-help-top">
      <form class="sform" role="search" data-hform>
        ${F.icon("magnifying-glass")}
        <input id="hq" name="q" type="search" autocomplete="off" enterkeyhint="search" spellcheck="false" placeholder="Tìm câu hỏi" aria-label="Tìm câu hỏi" aria-controls="help-body">
        <button class="sclear" type="button" data-hclear aria-label="Xoá chữ" hidden>${F.icon("x")}</button>
      </form>
    </div>
    <div class="b-help">
      <nav class="chips b-cats" aria-label="Nhóm câu hỏi" data-cats>${GROUPS.map((g) => `<a class="chip" href="#${g.id}">${g.title}</a>`).join("")}</nav>
      <div class="b-help-body" id="help-body" data-hbody></div>
      <section class="b-help-more" aria-labelledby="h-more">
        <h2 class="sect-title" id="h-more">Không thấy câu cần tìm?</h2>
        <a class="btn btn-blue" href="${F.esc(F.url("contact.html"))}">${F.icon("chat-circle-text")}Gửi tin nhắn</a>
      </section>
    </div>`;

  const input = el.querySelector("#hq");
  const clear = el.querySelector("[data-hclear]");
  const body = el.querySelector("[data-hbody]");

  function render(opts) {
    const o = Object.assign({ write: false, openGroup: null }, opts);
    const q = input.value.trim();
    const w = words(q);
    clear.hidden = !input.value;
    el.querySelector(".b-help").classList.toggle("is-search", w.length > 0);
    const groups = GROUPS.map((g) => ({ g, items: g.items.map((it, i) => ({ it, i })).filter((x) => !w.length || hits(x.it, w)) }))
      .filter((x) => x.items.length);
    body.innerHTML = groups.length
      ? groups.map(({ g, items }) => `<section class="b-qgroup" id="${g.id}" aria-labelledby="h-${g.id}">
          <h2 class="b-qgroup-title disp" id="h-${g.id}">${g.title}</h2>
          ${items.map(({ it, i }) => qa(g, it, i, w.length > 0 || o.openGroup === g.id)).join("")}
        </section>`).join("")
      : `<div class="b-help-none"><p class="snone-line" aria-live="polite">Không có câu nào khớp “${F.esc(q)}”</p>
          <button class="btn btn-line" type="button" data-hclear>Xoá tìm</button></div>`;
    if (groups.length) body.querySelectorAll(".b-qa").forEach((qa) => mark(qa, w));
    if (o.write) {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (F.MODE !== "open") p.set("state", F.MODE);
      if (!F.signedIn) p.set("auth", "out");
      const s = p.toString();
      history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + (q ? "" : location.hash));
    }
  }

  let timer = 0;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => render({ write: true }), 120); });
  el.querySelector("[data-hform]").addEventListener("submit", (e) => { e.preventDefault(); clearTimeout(timer); render({ write: true }); input.blur(); });
  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-hclear]")) { input.value = ""; render({ write: true }); input.focus(); }
  });

  // A group named in the address (#doi-tra) opens with all its answers.
  function openHash() {
    const id = location.hash.slice(1);
    if (!GROUPS.some((g) => g.id === id)) return;
    if (input.value) { input.value = ""; }
    render({ openGroup: id, write: false });
    const t = document.getElementById(id);
    if (t) t.scrollIntoView({ block: "start" });
  }
  addEventListener("hashchange", openHash);

  // The phone bar shows the title once the page's own has scrolled away.
  const bar = document.querySelector(".mbar");
  if (bar && "IntersectionObserver" in window) {
    bar.classList.add("title-late");
    new IntersectionObserver(([en]) => bar.classList.toggle("title-on", !en.isIntersecting), { rootMargin: "-56px 0px 0px 0px" })
      .observe(el.querySelector(".b-title"));
  }

  input.value = new URLSearchParams(location.search).get("q") || "";
  render();
  F.boot();
  if (location.hash && !input.value) openHash();
})();
