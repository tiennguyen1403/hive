/* Styles that sell all the time, drawn over static snapshots of the running
   store (snap.cjs). The snapshot is the store as it is; this file is the
   proposal. It restores the untouched page and re-draws on every change, so
   the board can flip an option without reloading the frame.

   Round 2 (25/09/2026). The user, on round 1: no bar link, no home section
   and no description for these styles — "chỉ cần thể hiện nó như là các mẫu
   khác thôi" — and an issue should be "một filter trong product list hoặc
   một page riêng cho số đó". So `/products` becomes every style on sale, and
   an issue is either its own page or a filter in that list.

   Options, from the query string and then from the board by postMessage:
     so    = page | filter     an issue as its own page (/so/5) or as a filter in /products
     view  = all | issue       (products) every style, or the issue's own view
     tag   = 1 | 0             a small "Số 05" plate on the photo of a style that belongs to an issue
     sell  = menu | line       (admin-new) the field's menu open, or "no issue" chosen
     tab   = line | so         (admin-products) which tab is open
     mark  = 1 | 0             outline what is new
     at    = a selector to scroll to on the first draw */
(() => {
  "use strict";

  const COLORS = {
    black: ["Đen", "#1C1C1C"], cream: ["Kem", "#E6DFD1"], grey: ["Xám", "#8C8C8C"],
    moss: ["Rêu", "#4A5240"], brown: ["Nâu", "#5C4536"], white: ["Trắng", "#F2F1ED"],
    navy: ["Xanh than", "#2B3A52"],
  };
  const COLOR_ORDER = ["black", "cream", "moss", "white", "grey", "navy", "brown"];
  const SIZES = ["S", "M", "L", "XL"];
  const FAMS = ["TEE", "HOODIE", "JACKET", "VEST", "SHIRT", "PANTS"];
  const FAM = { TEE: "Áo thun", HOODIE: "Hoodie", JACKET: "Khoác", VEST: "Gile", SHIRT: "Sơ mi", PANTS: "Quần" };
  const ISSUE = { no: 5, label: "Số 05", styles: 10 };
  /** What the back office calls a style that belongs to no issue. */
  const NO_ISSUE = "Không theo số";
  const ALWAYS = "Bán liên tục";

  // The eight proposed styles: plain basics in the six families, S–XL, named
  // from the hive (the issues are named from weather and earth). Stock is per
  // colour, S M L XL; the first colour is the card's photo. KÉN has run out
  // of M in every colour and ĐÀN of XL, so the board shows those states too.
  const LINE = [
    { slug: "sap", n: "SÁP", kind: "Áo thun", fam: "TEE", mat: "Cotton 220gsm", fit: "REGULAR", p: 400000,
      c: ["white", "black", "grey"], shape: "tee", st: { white: [10, 14, 11, 6], black: [8, 12, 9, 5], grey: [6, 9, 7, 4] } },
    { slug: "mat", n: "MẬT", kind: "Áo thun tay dài", fam: "TEE", mat: "Cotton 220gsm", fit: "REGULAR", p: 450000,
      c: ["black", "white"], shape: "longsleeve", st: { black: [5, 8, 6, 3], white: [6, 7, 5, 3] } },
    { slug: "ken", n: "KÉN", kind: "Áo hoodie", fam: "HOODIE", mat: "Nỉ bông 340gsm", fit: "OVERSIZE", p: 750000,
      c: ["grey", "black", "cream"], shape: "hoodie", st: { grey: [5, 0, 4, 2], black: [4, 0, 6, 3], cream: [3, 0, 2, 2] } },
    { slug: "canh", n: "CÁNH", kind: "Áo khoác dù", fam: "JACKET", mat: "Dù 1 lớp", fit: "OVERSIZE", p: 850000,
      c: ["black", "navy"], shape: "jacket", st: { black: [3, 5, 4, 2], navy: [2, 4, 3, 2] } },
    { slug: "nhong", n: "NHỘNG", kind: "Áo gile phao", fam: "VEST", mat: "Dù chần bông", fit: "REGULAR", p: 750000,
      c: ["black"], shape: "vest", st: { black: [3, 5, 5, 2] } },
    { slug: "phan", n: "PHẤN", kind: "Áo sơ mi oxford", fam: "SHIRT", mat: "Cotton oxford", fit: "REGULAR", p: 590000,
      c: ["white", "navy"], shape: "shirt", st: { white: [4, 7, 6, 3], navy: [3, 5, 4, 2] } },
    { slug: "tho", n: "THỢ", kind: "Quần kaki", fam: "PANTS", mat: "Kaki 280gsm", fit: "REGULAR", p: 650000,
      c: ["cream", "black"], shape: "trousers", st: { cream: [3, 5, 4, 2], black: [4, 7, 6, 3] } },
    { slug: "dan", n: "ĐÀN", kind: "Quần short nỉ", fam: "PANTS", mat: "Nỉ da cá 300gsm", fit: "REGULAR", p: 450000,
      c: ["grey", "black"], shape: "shorts", st: { grey: [5, 6, 5, 0], black: [6, 9, 7, 0] } },
  ];
  const bySlug = Object.fromEntries(LINE.map((s) => [s.slug, s]));

  // "Theo loại" once it counts everything on sale: the issue's ten and the
  // eight. `img` reuses the row photo the snapshot already has; `flat` draws.
  const INDEX_ALL = [
    { fam: "TEE", n: 5, d: "oversize, cơ bản, tay lỡ và tay dài", from: 390000, img: "TEE" },
    { fam: "HOODIE", n: 3, d: "trơn và in", from: 750000, img: "HOODIE" },
    { fam: "JACKET", n: 3, d: "dù và bomber", from: 850000, img: "JACKET" },
    { fam: "VEST", n: 1, d: "gile phao", from: 750000, flat: "nhong" },
    { fam: "SHIRT", n: 2, d: "sơ mi dệt và oxford", from: 590000, img: "SHIRT" },
    { fam: "PANTS", n: 4, d: "jogger, cargo, kaki và short", from: 450000, img: "PANTS" },
  ];
  // Between two issues only the eight are on sale.
  const INDEX_GAP = [
    { fam: "TEE", n: 2, d: "cơ bản và tay dài", from: 400000, flat: "sap" },
    { fam: "HOODIE", n: 1, d: "trơn", from: 750000, flat: "ken" },
    { fam: "JACKET", n: 1, d: "dù", from: 850000, flat: "canh" },
    { fam: "VEST", n: 1, d: "gile phao", from: 750000, flat: "nhong" },
    { fam: "SHIRT", n: 1, d: "oxford", from: 590000, flat: "phan" },
    { fam: "PANTS", n: 2, d: "kaki và short", from: 450000, flat: "tho" },
  ];

  // ── garment flats: a stand-in drawing on the plate until the photo exists.
  // 200 × 250 is the store's 4:5. `d` is the outline, `x` the seams, `o` the
  // buttons and snaps.
  const FLATS = {
    tee: {
      d: "M80 46Q100 62 120 46L144 54L176 96L158 108L142 86L142 206L58 206L58 86L42 108L24 96L56 54Z",
      x: ["M84 50Q100 60 116 50", "M171 90L153 102", "M29 90L47 102", "M58 198L142 198"],
    },
    longsleeve: {
      d: "M80 46Q100 62 120 46L144 54L186 196L166 202L142 96L142 206L58 206L58 96L34 202L14 196L56 54Z",
      x: ["M84 50Q100 60 116 50", "M183 185L163 191", "M17 185L37 191", "M58 198L142 198", "M142 60L142 96", "M58 60L58 96"],
    },
    hoodie: {
      back: "M70 60C64 18 136 18 130 60Z",
      d: "M74 54Q100 72 126 54L154 62L192 200L170 206L148 106L150 212L50 212L52 106L30 206L8 200L46 62Z",
      x: ["M80 56C80 30 120 30 120 56", "M93 68L91 94", "M107 68L109 94", "M68 156L132 156L140 190L60 190Z", "M50 202L150 202", "M189 189L167 195", "M11 189L33 195"],
    },
    jacket: {
      d: "M74 44L100 56L126 44L154 54L190 200L168 206L148 102L148 212L52 212L52 102L32 206L10 200L46 54Z",
      x: ["M74 44L86 70L100 56L114 70L126 44", "M100 56L100 212", "M62 158L84 148", "M138 158L116 148", "M52 204L148 204", "M187 190L165 196", "M13 190L35 196"],
      o: [[100, 86], [100, 114], [100, 142], [100, 170], [100, 198]],
    },
    vest: {
      d: "M76 36L124 36L126 52L148 60Q138 88 146 112L146 208L54 208L54 112Q62 88 52 60L74 52Z",
      x: ["M74 52L126 52", "M100 36L100 208", "M58 86L142 86", "M54 112L146 112", "M54 138L146 138", "M54 164L146 164", "M54 190L146 190"],
    },
    shirt: {
      d: "M78 46L100 58L122 46L146 54L182 194L162 200L142 100L142 208Q100 218 58 208L58 100L38 200L18 194L54 54Z",
      x: ["M78 46L90 72L100 58L110 72L122 46", "M100 58L100 212", "M110 92L130 92L130 114L110 114Z", "M179 182L159 188", "M21 182L41 188"],
      o: [[100, 80], [100, 104], [100, 128], [100, 152], [100, 176], [100, 200]],
    },
    trousers: {
      d: "M58 28L142 28L142 40L150 232L108 232L100 100L92 232L50 232L58 40Z",
      x: ["M58 40L142 40", "M100 40L100 92", "M64 44L78 70", "M136 44L122 70", "M51 224L91 224", "M109 224L149 224", "M86 28L86 40", "M114 28L114 40"],
      o: [[100, 34]],
    },
    shorts: {
      d: "M54 66L146 66L146 78L156 172L108 178L100 120L92 178L44 172L54 78Z",
      x: ["M54 78L146 78", "M96 80L92 100", "M104 80L108 100", "M60 82L72 106", "M140 82L128 106", "M45 164L91 169", "M109 169L155 164"],
    },
  };

  function lum(hex) {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  function flat(shape, color) {
    const f = FLATS[shape];
    const hex = COLORS[color][1];
    const dark = lum(hex) < 0.35;
    const edge = dark ? "none" : "rgba(23,20,16,.34)";
    const seam = dark ? "rgba(255,255,255,.2)" : "rgba(23,20,16,.26)";
    const back = f.back
      ? `<path d="${f.back}" fill="${hex}" stroke="${dark ? "rgba(0,0,0,.25)" : edge}" stroke-width="1.2" stroke-linejoin="round"/>`
      : "";
    return (
      `<svg class="flat" viewBox="0 0 200 250" aria-hidden="true">${back}` +
      `<path d="${f.d}" fill="${hex}" stroke="${edge}" stroke-width="1.2" stroke-linejoin="round"/>` +
      f.x.map((p) => `<path d="${p}" fill="none" stroke="${seam}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`).join("") +
      (f.o || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="${seam}"/>`).join("") +
      `</svg>`
    );
  }

  // ── small helpers
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const h = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  const vnd = (n) => n.toLocaleString("vi-VN").replace(/,/g, ".") + "₫";
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const onHand = (s) => sum(Object.values(s.st).map(sum));
  const outSizes = (s) => SIZES.filter((z, i) => s.c.every((c) => s.st[c][i] === 0));
  const lower = (k) => k.charAt(0).toLocaleLowerCase("vi") + k.slice(1);
  const nw = (el) => (el && el.setAttribute("data-new", ""), el);

  // The board (line.html) loads this file for the data and the flats only.
  window.LINE_DATA = { COLORS, SIZES, FAM, LINE, ISSUE, flat, vnd, onHand, outSizes };
  const snap = document.documentElement.dataset.snap;
  if (!snap) return;

  const BAG =
    '<svg class="ic ic sm" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="--il:0.1354;--ir:0.1354"><path d="M7.5 7.67V6.7c0-2.25 1.81-4.46 4.06-4.67a4.5 4.5 0 0 1 4.94 4.48v1.38M9 22h6c4.02 0 4.74-1.61 4.95-3.57l.75-6C20.97 9.99 20.27 8 16 8H8c-4.27 0-4.97 1.99-4.7 4.43l.75 6C4.26 20.39 4.98 22 9 22Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15.495 12h.01M8.495 12h.008" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  const TICK =
    '<svg viewBox="7.75 9.17 8.5 5.66" fill="none" aria-hidden="true"><path d="m7.75 12 2.83 2.83 5.67-5.66" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

  // ── a card for a style that sells all the time: the store's own `.card3`,
  // and the same count line every other card prints.
  function card(s, { kind = false } = {}) {
    const out = outSizes(s);
    const here = SIZES.filter((z) => !out.includes(z));
    const left = onHand(s);
    const count = `<span${left <= 3 ? ' class="low"' : ""}>còn ${left}</span>`;
    const rest = kind
      ? `<span>· ${lower(s.kind)}</span>`
      : out.length
        ? `<span>· hết ${out.map((z) => `<s>${z}</s>`).join(" ")}</span>`
        : `<span>· ${here.join(" ")}</span>`;
    return h(
      `<div class="card3" data-always><div class="imgbox"><a class="img ph" href="/products/${s.slug}">${flat(s.shape, s.c[0])}<span class="tag">chờ ảnh</span></a></div>` +
        `<a class="meta" href="/products/${s.slug}"><span class="toc"><span class="n">${s.n}</span><span class="ld" aria-hidden="true"></span><span class="p">${vnd(s.p)}</span></span>` +
        `<span class="ct">${count}${rest}</span></a>` +
        `<div class="act"><button type="button" class="addbtn3">${BAG}Thêm vào giỏ</button></div></div>`,
    );
  }

  // A style in an issue carries the issue's plate on its photo (when asked).
  function tagIssueCards(root = document) {
    if (OPTS.tag !== "1") return;
    for (const c of $$(".card3:not([data-always])", root)) {
      const box = $(".imgbox", c);
      if (box && !$(".sotag", box)) box.append(nw(h(`<span class="sotag">${ISSUE.label}</span>`)));
    }
  }

  // The countdown is drawn in the browser; a snapshot has only its "00".
  function clock(el, digits) {
    if (!el) return;
    $$("b", el).forEach((b, i) => {
      b.classList.remove("wait");
      b.textContent = digits[i];
    });
  }

  // ── "Theo loại", counting everything on sale
  function indexRows(rows, photos) {
    return rows
      .map((r) => {
        const thumb = r.flat
          ? `<span class="ithumb">${flat(bySlug[r.flat].shape, bySlug[r.flat].c[0])}</span>`
          : photos[r.img] || "";
        return (
          `<a class="row" href="/products?family=${r.fam}">${thumb}<span><span class="n">${FAM[r.fam]}</span>` +
          `<span class="d">${r.n} mẫu · ${r.d}</span></span><span class="p">${r.n > 1 ? "từ " : ""}${vnd(r.from)}</span></a>`
        );
      })
      .join("");
  }

  function home() {
    const clocks = $$(".cover .clock");
    clock(clocks[0], ["04", "19", "10"]);
    clock(clocks[1], ["11", "19", "10"]);
    const index = $(".index");
    if (!index) return;
    const photos = {};
    for (const row of $$("a.row", index)) {
      const fam = new URLSearchParams(row.getAttribute("href").split("?")[1]).get("family");
      photos[fam] = $("img", row)?.outerHTML || "";
    }
    index.innerHTML = indexRows(INDEX_ALL, photos);
    const sec = nw(index.closest("section"));
    $(".hd .meta", sec).textContent = "đang bán";
    $(".hd", sec).append(h(`<a class="more" href="/products">Xem tất cả 18 mẫu</a>`));
  }

  // Between two issues: Số 05 has closed, Số 06 has not opened. The snapshot
  // is the store's own page for Số 06 while Số 05 still sells, so the parts
  // that say Số 05 is open are put right here.
  function homeGap() {
    $(".nav3 .itag")?.remove(); // the plate shows only while an issue sells (slice 10)
    clock($(".cover .clock"), ["05", "19", "10"]);
    $("main .wrap3")?.prepend(
      nw(
        h(
          `<section class="sec" aria-labelledby="h-fam"><div class="hd"><h2 id="h-fam">Theo loại</h2>` +
            `<span class="meta">đang bán</span><a class="more" href="/products">Xem tất cả 8 mẫu</a></div>` +
            `<div class="index">${indexRows(INDEX_GAP, {})}</div></section>`,
        ),
      ),
    );
    const past = $("p.past");
    if (past) past.innerHTML = '<span>Số 05 · đã đóng 29/09 · 172 / 181 đã bán</span><a class="lnk" href="/so/5">Xem lại</a>';
    const cal = $$(".foot3 .cal li");
    if (cal.length === 3) {
      cal[0].remove();
      cal[2].innerHTML = '<a href="/so/5"><b>Số 05 · đã đóng</b><span class="st">29/09 · 172 / 181 đã bán · xem lại</span></a>';
    }
  }

  // ── the list
  function facets(list) {
    const f = {};
    const add = (k) => (f[k] = (f[k] || 0) + 1);
    for (const s of list) {
      add("family=" + s.fam);
      add("fit=" + s.fit);
      SIZES.forEach((z, i) => s.c.some((c) => s.st[c][i] > 0) && add("size=" + z));
      s.c.forEach((c) => add("color=" + c));
      add(s.p < 500000 ? "price=lo" : s.p <= 1000000 ? "price=mid" : "price=hi");
    }
    return f;
  }
  function keyOf(href) {
    const q = new URLSearchParams(href.split("?")[1] || "");
    for (const k of ["family", "fit", "size", "color"]) if (q.has(k)) return `${k}=${q.get(k)}`;
    if (q.has("max") && !q.has("min")) return "price=lo";
    if (q.has("min") && q.has("max")) return "price=mid";
    if (q.has("min")) return "price=hi";
    return null;
  }
  const chip = (href, label, n, dot, on) =>
    `<a class="chip3${on ? " on" : ""}" href="${href}">${dot ? `<i class="dot" style="background:${dot}" aria-hidden="true"></i>` : ""}${label}<span class="cnt">${n}</span></a>`;

  // The rail with the eight's counts added to the issue's.
  function railAll(f) {
    for (const grp of $$(".rail3 .grp")) {
      const title = $("h4", grp).textContent.trim();
      const opts = $(".opts", grp);
      const had = {};
      for (const a of $$("a.chip3", opts)) had[keyOf(a.getAttribute("href"))] = +($(".cnt", a)?.textContent || 0);
      const n = (k) => (had[k] || 0) + (f[k] || 0);
      let html = "";
      if (title === "Loại") html = FAMS.filter((x) => n("family=" + x)).map((x) => chip(`/products?family=${x}`, FAM[x], n("family=" + x))).join("");
      else if (title === "Form") html = ["OVERSIZE", "REGULAR"].map((x) => chip(`/products?fit=${x}`, x === "OVERSIZE" ? "Oversize" : "Regular", n("fit=" + x))).join("");
      else if (title === "Còn size") html = SIZES.map((z) => chip(`/products?size=${z}`, z, n("size=" + z))).join("");
      else if (title === "Màu") html = COLOR_ORDER.filter((c) => n("color=" + c)).map((c) => chip(`/products?color=${c}`, COLORS[c][0], n("color=" + c), COLORS[c][1])).join("");
      else if (title === "Khoảng giá") {
        html = [["price=lo", "/products?max=499999", "Dưới 500k"], ["price=mid", "/products?min=500000&max=1000000", "500k – 1tr"], ["price=hi", "/products?min=1000001", "Trên 1tr"]]
          .filter(([k]) => n(k)).map(([k, href, label]) => chip(href, label, n(k))).join("");
        const foot = $(".foot", grp);
        if (foot) foot.textContent = `Từ ${vnd(390000)} đến ${vnd(1450000)}`;
      }
      if (html) opts.innerHTML = html;
    }
  }

  function quickAll(f) {
    const box = $(".chips3");
    if (!box) return;
    const had = {};
    for (const b of $$("button.chip3", box)) had[b.textContent.replace(/\d+$/, "").trim()] = +($(".cnt", b)?.textContent || 0);
    const n = (k, t) => (had[t] || 0) + (f[k] || 0);
    const filterBtn = $$("button.chip3", box)[0].outerHTML;
    const b = (label, cnt, dot) =>
      `<button type="button" class="chip3" aria-pressed="false">${dot ? `<i class="dot" style="background:${dot}" aria-hidden="true"></i>` : ""}${label}<span class="cnt">${cnt}</span></button>`;
    box.innerHTML =
      filterBtn +
      b("Oversize", n("fit=OVERSIZE", "Oversize")) +
      b("Regular", n("fit=REGULAR", "Regular")) +
      b("Còn size S", n("size=S", "Còn size S")) +
      b("Còn size M", n("size=M", "Còn size M")) +
      b("Đen", n("color=black", "Đen"), COLORS.black[1]) +
      b("Dưới 500k", n("price=lo", "Dưới 500k"));
  }

  // The issue as a filter: a group at the head of the rail, a chip after "Lọc".
  function issueFilter(on) {
    const rail = $(".rail3");
    if (rail) {
      rail.prepend(
        nw(h(`<div class="grp"><h4>Số</h4><div class="opts">${chip(`/products?so=${ISSUE.no}`, ISSUE.label, ISSUE.styles, null, on)}</div></div>`)),
      );
    }
    const box = $(".chips3");
    const first = box && $("button.chip3", box);
    first?.after(
      nw(h(`<button type="button" class="chip3${on ? " on" : ""}" aria-pressed="${on}">${ISSUE.label}<span class="cnt">${ISSUE.styles}</span></button>`)),
    );
  }

  function products() {
    if (OPTS.view === "issue") {
      // As its own page (/so/5) the issue is today's list, word for word.
      // As a filter it is the same view, reached from the rail.
      if (OPTS.so === "filter") issueFilter(true);
      return;
    }
    const plate = $(".nav3 .itag");
    plate?.classList.remove("on");
    plate?.removeAttribute("aria-current");
    document.title = "Tất cả mẫu · HIVE";
    const big = nw($(".lhead h1.big"));
    big.textContent = "Tất cả mẫu";
    nw($(".lhead .row1 .meta")).textContent = `${ISSUE.styles + LINE.length} mẫu đang bán`;

    const f = facets(LINE);
    const nav3 = $(".tabs3");
    const had = {};
    $$("a", nav3).forEach((a) => (had[keyOf(a.getAttribute("href")) || "all"] = +($(".cnt", a)?.textContent || 0)));
    nav3.innerHTML =
      `<a class="on" aria-current="page" href="/products">Tất cả<span class="cnt">${(had.all || 0) + LINE.length}</span></a>` +
      FAMS.filter((x) => (had["family=" + x] || 0) + (f["family=" + x] || 0))
        .map((x) => `<a class="" href="/products?family=${x}">${FAM[x]}<span class="cnt">${(had["family=" + x] || 0) + (f["family=" + x] || 0)}</span></a>`)
        .join("");
    nw(nav3);
    railAll(f);
    quickAll(f);
    if (OPTS.so === "filter") issueFilter(false);

    const grid = $(".listing3 .grid3");
    tagIssueCards(grid);
    grid.append(...LINE.map((s) => nw(card(s))));
    const bar = $(".listbar > span");
    if (bar) bar.textContent = `Hiện ${ISSUE.styles + LINE.length} / ${ISSUE.styles + LINE.length} mẫu`;
  }

  // A style that sells all the time, on its own page: no issue in the
  // breadcrumb, no clock, no "chiếc đã cắt".
  function product() {
    const s = bySlug.sap;
    const first = s.c[0];
    document.title = `${s.n} · HIVE`;

    const crumbs = $(".crumbs");
    const firstLink = $("a", crumbs);
    firstLink?.nextElementSibling?.remove(); // its "/"
    firstLink?.remove();
    $("b", crumbs).textContent = s.n;
    nw(crumbs);

    const gal = $(".gal");
    gal.setAttribute("aria-label", `Ảnh ${s.n}, ${s.c.length} tấm`);
    gal.innerHTML = s.c.map((c) => `<figure class="ph">${flat(s.shape, c)}<span class="tag">chờ ảnh</span></figure>`).join("");
    const galbar = $(".galbar");
    if (galbar) {
      galbar.innerHTML =
        `<span><span class="cur">1</span> / ${s.c.length}</span>` +
        `<span class="dots" aria-hidden="true">${s.c.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</span>`;
    }

    $(".ticket .kick")?.remove();
    $(".ticket h1").textContent = s.n;
    $(".ticket .kind").textContent = `${s.kind} · ${s.mat}`;
    $(".ticket .price").textContent = vnd(s.p);
    nw($(".ticket .stock")).innerHTML = `<b>Còn ${onHand(s)}</b> chiếc`;

    const [colorFld, sizeFld] = $$(".ticket .fld");
    $(".lbl span", colorFld).textContent = `${COLORS[first][0]} · còn ${sum(s.st[first])}`;
    $(".sw", colorFld).innerHTML = s.c
      .map((c) => {
        const n = sum(s.st[c]);
        return (
          `<button type="button" aria-pressed="${c === first}" aria-label="Màu ${COLORS[c][0]}, còn ${n}">` +
          `<i style="background:${COLORS[c][1]}" aria-hidden="true"></i><span>${COLORS[c][0]} ${n}</span></button>`
        );
      })
      .join("");
    const mk = $(".sizes .mk", sizeFld)?.outerHTML || "";
    $(".sizes tbody", sizeFld).innerHTML = SIZES.map((z, i) => {
      const n = s.st[first][i];
      return (
        `<tr><td><button type="button" aria-pressed="false"><b>${z}</b><span class="ld" aria-hidden="true"></span>` +
        `<span class="left${n <= 2 ? " low" : ""}">còn ${n}</span>${mk}</button></td></tr>`
      );
    }).join("");
    $(".sizes", sizeFld).setAttribute("aria-label", `Chọn size ${s.n}`);

    const rows = $$(".info3 .r");
    $("dd", rows[0]).textContent = s.mat;
    $("dd", rows[1]).innerHTML = "Regular<span>đúng size thường ngày</span>";

    // "Cùng loại": the tees on sale, whichever kind of style they are.
    const rel = $("#h-rel")?.closest("section");
    if (rel) {
      nw($("#h-rel", rel)).textContent = "Cùng loại";
      $(".hd .meta", rel).textContent = "áo thun, cùng tầm giá";
      const more = $(".more", rel);
      more.textContent = "Xem tất cả áo thun";
      more.setAttribute("href", "/products?family=TEE");
      const cards = $$(".card3", rel);
      const byName = Object.fromEntries(cards.map((c) => [$(".n", c).textContent.trim(), c]));
      const khoi = byName["NẮNG"].cloneNode(true);
      $(".n", khoi).textContent = "KHÓI";
      $(".p", khoi).textContent = vnd(390000);
      $(".ct", khoi).innerHTML = "<span>còn 17</span><span>· áo thun oversize</span>";
      const img = $("img", khoi);
      img.setAttribute("src", "../../v2/img/khoi.webp");
      img.setAttribute("alt", "KHÓI — màu Đen");
      $$("a", khoi).forEach((a) => a.setAttribute("href", "/products/khoi"));
      $(".grid3", rel).replaceChildren(khoi, byName["NẮNG"], byName["CÁT"], card(bySlug.mat, { kind: true }));
      tagIssueCards(rel);
    }
    const who = $(".buybar3 .who");
    if (who) who.innerHTML = `<b>${s.n}</b><span>${vnd(s.p)} · chưa chọn size</span>`;
  }

  function adminProducts() {
    nw($(".top .sub")).textContent =
      `29 mẫu · 3 số và ${LINE.length} mẫu ${ALWAYS.toLocaleLowerCase("vi")} · 18 đang bán · tồn kho theo size và màu`;
    const stabs = $(".stabs");
    const first = $("a", stabs);
    const tab = nw(h(`<a href="/admin/products?always=1">${ALWAYS}<span class="cnt">${LINE.length}</span></a>`));
    first.after(tab);
    if (OPTS.tab !== "line") return;

    first.classList.remove("on");
    first.removeAttribute("aria-current");
    tab.classList.add("on");
    tab.setAttribute("aria-current", "page");
    const chips = $$(".bar.tools a.chip3");
    if (chips[0]) chips[0].innerHTML = 'Sắp hết<span class="cnt">0</span>';
    if (chips[1]) chips[1].innerHTML = 'Hết<span class="cnt">0</span>';
    const menu = $("tbody .rowmenu")?.outerHTML || "";
    $("tbody").innerHTML = LINE.map((s) => {
      const out = outSizes(s);
      return (
        `<tr><td class="nw"><span class="athumb">${flat(s.shape, s.c[0])}</span><b class="nm">${s.n}</b></td>` +
        `<td>${s.kind} · ${s.fit === "OVERSIZE" ? "oversize" : "regular"}</td><td class="right">${vnd(s.p).replace("₫", "")}</td>` +
        `<td>${s.c.map((c) => COLORS[c][0]).join(" · ")}</td>` +
        `<td><div class="cellmeter" data-new><span>còn ${onHand(s)}</span><a class="add" href="#">Nhập thêm</a></div></td>` +
        `<td>${out.length ? out.join(" · ") : "—"}</td><td><span class="badge ok"><i></i>Đang bán</span></td><td>${menu.replace(/KHÓI/g, s.n)}</td></tr>`
      );
    }).join("");
    const foot = nw($(".dt3 > .foot"));
    if (foot) {
      foot.innerHTML =
        `<span>${LINE.length} mẫu · ${sum(LINE.map(onHand))} trên kệ · mẫu ${ALWAYS.toLocaleLowerCase("vi")} không có số cắt: ` +
        "hết size nào nhập thêm size đó</span>";
    }
  }

  function adminNew() {
    const field = $$(".field3").find((f) => $(".lbl", f)?.textContent.trim() === "Số");
    if (!field) return;
    const wrap = $(".selwrap", field);
    const help = $(".help", field);
    if (OPTS.sell === "line") {
      nw($(".selbtn .t", field)).textContent = `${NO_ISSUE} · ${ALWAYS.toLocaleLowerCase("vi")}`;
      nw(help).textContent = "Lên kệ ngay khi lưu, không có giờ đóng. Hết size thì nhập thêm ở trang sửa mẫu.";
      nw($(".top .sub")).textContent =
        "Mẫu không theo số không có số cắt: tồn kho điền ở đây là hàng lên kệ lúc đầu, hết thì nhập thêm. " +
        "Mẫu thuộc một Số vẫn cắt một lần.";
      const cut = $$(".panel3 h2").find((x) => x.textContent.startsWith("Số lượng sẽ cắt"));
      if (cut) {
        cut.firstChild.textContent = "Tồn kho ban đầu";
        nw(cut);
      }
      const colorLbl = $$(".lbl").find((x) => x.textContent.trim() === "Màu sẽ cắt");
      if (colorLbl) nw(colorLbl).textContent = "Màu bán";
      return;
    }
    wrap.classList.add("open");
    wrap.append(
      h(
        `<div class="menu3" role="menu" aria-label="Số">` +
          `<button type="button" role="menuitemradio" aria-checked="false"><span class="mk"></span><span>Số 05 · đang bán</span><em class="tally">lên kệ ngay</em></button>` +
          `<button type="button" role="menuitemradio" aria-checked="true" class="ticked"><span class="mk">${TICK}</span><span>Số 06 · sắp mở</span><em class="tally">lên kệ 20:00 06/10</em></button>` +
          `<button type="button" role="menuitemradio" aria-checked="false" data-active data-new><span class="mk"></span><span>${NO_ISSUE}</span><em class="tally">${ALWAYS.toLocaleLowerCase("vi")}</em></button>` +
          `</div>`,
      ),
    );
  }

  const PAGES = { home, "home-gap": homeGap, products, product, "admin-products": adminProducts, "admin-new": adminNew };

  // ── options, first draw, re-draws
  const q = new URLSearchParams(location.search);
  const OPTS = {
    so: q.get("so") || "page",
    view: q.get("view") || "all",
    tag: q.get("tag") || "1",
    sell: q.get("sell") || "menu",
    tab: q.get("tab") || "line",
    mark: q.get("mark") || "1",
  };
  const ORIGINAL = document.body.innerHTML;
  const TITLE = document.title;

  function draw() {
    const y = window.scrollY;
    document.body.innerHTML = ORIGINAL;
    document.title = TITLE;
    document.documentElement.dataset.mark = OPTS.mark;
    // Every photo loads at once: the frames are scrolled by hand, not by a
    // shopper, and a lazy photo in a scaled frame never learns it is on screen.
    $$("img[loading=lazy]").forEach((i) => i.setAttribute("loading", "eager"));
    PAGES[snap]?.();
    window.scrollTo(0, y);
  }

  // A snapshot is a picture of the store: nothing in it goes anywhere.
  document.addEventListener("click", (e) => {
    if (e.target.closest("a, button")) e.preventDefault();
  }, true);
  document.addEventListener("submit", (e) => e.preventDefault(), true);

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.kind !== "line-opts") return;
    Object.assign(OPTS, e.data.opts);
    draw();
    if (e.data.at) jump(e.data.at);
  });

  function jump(sel) {
    const el = document.querySelector(sel);
    if (!el) return;
    window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 88));
  }

  draw();
  if (q.get("at")) jump(q.get("at"));
})();
