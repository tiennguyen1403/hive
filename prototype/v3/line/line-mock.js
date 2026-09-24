/* The year-round line, drawn over static snapshots of the running store
   (snap.cjs). The snapshot is the store as it is; this file is the proposal.
   It restores the untouched page and re-draws on every change, so the board
   can flip an option without reloading the frame.

   Options, from the query string and then from the board by postMessage:
     name  = quanh-nam | co-ban | to     what the line is called
     ia    = hai-ke | mot-ke             the listing: two shelves, or one shelf in two groups
     shelf = so | line                   (hai-ke) which shelf the listing shows
     sz    = du | thieu                  (product) every size in, or M gone in black
     sell  = menu | line                 (admin-new) the new field open, or the line chosen
     tab   = so | line                   (admin-products) which tab is open
     mark  = 1 | 0                       outline what is new
     at    = a selector to scroll to on the first draw */
(() => {
  "use strict";

  const NAMES = {
    "quanh-nam": { t: "Quanh năm", url: "/quanh-nam" },
    "co-ban": { t: "Cơ bản", url: "/co-ban" },
    to: { t: "Tổ", url: "/to" },
  };
  const COLORS = {
    black: ["Đen", "#1C1C1C"], cream: ["Kem", "#E6DFD1"], grey: ["Xám", "#8C8C8C"],
    moss: ["Rêu", "#4A5240"], brown: ["Nâu", "#5C4536"], white: ["Trắng", "#F2F1ED"],
    navy: ["Xanh than", "#2B3A52"],
  };
  const COLOR_ORDER = ["black", "cream", "moss", "white", "grey", "navy", "brown"];
  const SIZES = ["S", "M", "L", "XL"];
  const FAMS = ["TEE", "HOODIE", "JACKET", "VEST", "SHIRT", "PANTS"];
  const FAM = { TEE: "Áo thun", HOODIE: "Hoodie", JACKET: "Khoác", VEST: "Gile", SHIRT: "Sơ mi", PANTS: "Quần" };
  const TAGLINE = "không đóng, hết size thì may lại";

  // The eight proposed styles: plain basics in the six families, S–XL, named
  // from the hive (the issues are named from weather and earth). Stock is per
  // colour, S M L XL. KÉN has run out of M in every colour and ĐÀN of XL, so
  // the board shows what "tạm hết" looks like on a card.
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

  const BAG =
    '<svg class="ic ic sm" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="--il:0.1354;--ir:0.1354"><path d="M7.5 7.67V6.7c0-2.25 1.81-4.46 4.06-4.67a4.5 4.5 0 0 1 4.94 4.48v1.38M9 22h6c4.02 0 4.74-1.61 4.95-3.57l.75-6C20.97 9.99 20.27 8 16 8H8c-4.27 0-4.97 1.99-4.7 4.43l.75 6C4.26 20.39 4.98 22 9 22Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15.495 12h.01M8.495 12h.008" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  const CHEV =
    '<svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="transform:rotate(-90deg)"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="1.5" d="M19.92 8.95l-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95"></path></svg>';
  const TICK =
    '<svg viewBox="7.75 9.17 8.5 5.66" fill="none" aria-hidden="true"><path d="m7.75 12 2.83 2.83 5.67-5.66" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

  // ── a card for one style of the line, in the store's own `.card3` markup
  function card(s, { kind = false } = {}) {
    const out = outSizes(s);
    const here = SIZES.filter((z) => !out.includes(z));
    const gone = out.map((z) => `<s>${z}</s>`).join(" ");
    let ct;
    if (here.length === 0) ct = "<span>tạm hết mọi size</span>";
    else if (kind) ct = `<span>${lower(s.kind)}</span>` + (out.length ? `<span>· tạm hết ${gone}</span>` : "");
    else ct = `<span>${here.join(" ")}</span>` + (out.length ? `<span>· tạm hết ${gone}</span>` : "");
    const act = here.length
      ? `<button type="button" class="addbtn3">${BAG}Thêm vào giỏ</button>`
      : `<a class="addbtn3 view" href="/products/${s.slug}">Xem chi tiết</a>`;
    return h(
      `<div class="card3"><div class="imgbox"><a class="img ph" href="/products/${s.slug}">${flat(s.shape, s.c[0])}<span class="tag">chờ ảnh</span></a></div>` +
        `<a class="meta" href="/products/${s.slug}"><span class="toc"><span class="n">${s.n}</span><span class="ld" aria-hidden="true"></span><span class="p">${vnd(s.p)}</span></span>` +
        `<span class="ct">${ct}</span></a><div class="act">${act}</div></div>`,
    );
  }

  // ── the bar: the line leads the families
  function nav(active) {
    const links = $(".nav3 .links");
    if (!links) return;
    links.prepend(h('<span class="lsep" aria-hidden="true"></span>'));
    const a = nw(h(`<a class="ln" href="${NAME.url}">${NAME.t}</a>`));
    if (active) {
      $$("a", links).forEach((x) => (x.classList.remove("on"), x.removeAttribute("aria-current")));
      $(".nav3 .itag")?.classList.remove("on");
      $(".nav3 .itag")?.removeAttribute("aria-current");
      a.classList.add("on");
      a.setAttribute("aria-current", "page");
    }
    links.prepend(a);
  }

  // The countdown is drawn in the browser; a snapshot has only its "00".
  function clock(el, digits) {
    if (!el) return;
    $$("b", el).forEach((b, i) => {
      b.classList.remove("wait");
      b.textContent = digits[i];
    });
  }

  function lineSection(slugs, id) {
    const sec = nw(
      h(
        `<section class="sec" aria-labelledby="${id}"><div class="hd"><h2 id="${id}">${NAME.t}</h2>` +
          `<span class="meta">${LINE.length} mẫu · ${TAGLINE}</span>` +
          `<a class="more" href="${NAME.url}">Xem cả ${LINE.length} mẫu</a></div><div class="grid3 four"></div></section>`,
      ),
    );
    const grid = $(".grid3", sec);
    slugs.forEach((k) => grid.append(card(bySlug[k])));
    return sec;
  }

  function rulesNote() {
    const r = $("#rules .rules");
    if (!r) return;
    r.after(
      nw(
        h(
          `<p class="rnote"><span class="badge flat">${NAME.t}</span>không theo hai quy tắc đầu: không có giờ đóng, ` +
            "hết size nào may lại size đó. Hai quy tắc sau vẫn giữ.</p>",
        ),
      ),
    );
  }

  // ── pages
  function home() {
    const clocks = $$(".cover .clock");
    clock(clocks[0], ["04", "19", "10"]);
    clock(clocks[1], ["11", "19", "10"]);
    nav(false);
    const fam = $(".index")?.closest("section");
    fam?.after(lineSection(["sap", "ken", "tho", "canh"], "h-line"));
    rulesNote();
  }

  // Between two issues: Số 05 has closed, Số 06 has not opened. The snapshot
  // is the store's own page for Số 06 while Số 05 still sells, so the parts
  // that say Số 05 is open are put right here.
  function homeGap() {
    $(".nav3 .itag")?.remove(); // the plate shows only while an issue sells (slice 10)
    nav(false);
    clock($(".cover .clock"), ["05", "19", "10"]);
    $("main .wrap3")?.prepend(lineSection(LINE.map((s) => s.slug), "h-line"));
    rulesNote();
    const past = $("p.past");
    if (past) {
      past.innerHTML = '<span>Số 05 · đã đóng 29/09 · 172 / 181 đã bán</span><a class="lnk" href="/so/5">Xem lại</a>';
    }
    const cal = $$(".foot3 .cal li");
    if (cal.length === 3) {
      cal[0].remove();
      cal[2].innerHTML = '<a href="/so/5"><b>Số 05 · đã đóng</b><span class="st">29/09 · 172 / 181 đã bán · xem lại</span></a>';
    }
  }

  function shelfLink(label, cnt, href, live) {
    return nw(
      h(
        `<a class="shelf" href="${href}">${live ? '<i class="dot" aria-hidden="true"></i>' : ""}${label}` +
          `<span class="cnt">${cnt} mẫu</span>${CHEV}</a>`,
      ),
    );
  }

  // Facets over a set of styles, keyed the way the listing's links are.
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
  const chip = (href, label, n, dot) =>
    `<a class="chip3" href="${href}">${dot ? `<i class="dot" style="background:${dot}" aria-hidden="true"></i>` : ""}${label}<span class="cnt">${n}</span></a>`;

  // The rail, rebuilt for the line alone (`add` = false) or with the line's
  // counts added to the issue's (`add` = true).
  function rail(f, add) {
    for (const grp of $$(".rail3 .grp")) {
      const title = $("h4", grp).textContent.trim();
      const opts = $(".opts", grp);
      const had = {};
      for (const a of $$("a.chip3", opts)) had[keyOf(a.getAttribute("href"))] = +($(".cnt", a)?.textContent || 0);
      const n = (k) => (add ? had[k] || 0 : 0) + (f[k] || 0);
      let html = "";
      if (title === "Loại") html = FAMS.filter((x) => n("family=" + x)).map((x) => chip(`/products?family=${x}`, FAM[x], n("family=" + x))).join("");
      else if (title === "Form") html = ["OVERSIZE", "REGULAR"].filter((x) => n("fit=" + x)).map((x) => chip(`/products?fit=${x}`, x === "OVERSIZE" ? "Oversize" : "Regular", n("fit=" + x))).join("");
      else if (title === "Còn size") html = SIZES.filter((z) => n("size=" + z)).map((z) => chip(`/products?size=${z}`, z, n("size=" + z))).join("");
      else if (title === "Màu") html = COLOR_ORDER.filter((c) => n("color=" + c)).map((c) => chip(`/products?color=${c}`, COLORS[c][0], n("color=" + c), COLORS[c][1])).join("");
      else if (title === "Khoảng giá") {
        html = [["price=lo", "/products?max=499999", "Dưới 500k"], ["price=mid", "/products?min=500000&max=1000000", "500k – 1tr"], ["price=hi", "/products?min=1000001", "Trên 1tr"]]
          .filter(([k]) => n(k)).map(([k, href, label]) => chip(href, label, n(k))).join("");
        const foot = $(".foot", grp);
        if (foot && !add) foot.textContent = `Dòng này từ ${vnd(400000)} đến ${vnd(850000)}`;
        if (foot && add) foot.textContent = `Trang này từ ${vnd(390000)} đến ${vnd(1450000)}`;
      }
      opts.innerHTML = html;
    }
  }

  function quickChips(f, add) {
    const box = $(".chips3");
    if (!box) return;
    const had = {};
    for (const b of $$("button.chip3", box)) {
      const t = b.textContent.replace(/\d+$/, "").trim();
      had[t] = +($(".cnt", b)?.textContent || 0);
    }
    const n = (k, t) => (add ? had[t] || 0 : 0) + (f[k] || 0);
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

  function tabs(counts, total) {
    const nav3 = $(".tabs3");
    if (!nav3) return;
    nav3.innerHTML =
      `<a class="on" aria-current="page" href="${NAME.url}">Tất cả<span class="cnt">${total}</span></a>` +
      FAMS.filter((x) => counts[x]).map((x) => `<a class="" href="/products?family=${x}">${FAM[x]}<span class="cnt">${counts[x]}</span></a>`).join("");
  }

  function products() {
    if (OPTS.ia === "mot-ke") return oneShelf();
    if (OPTS.shelf === "line") return lineShelf();
    nav(false);
    $(".lhead .row1")?.append(shelfLink(NAME.t, LINE.length, NAME.url, false));
  }

  function lineShelf() {
    nav(true);
    document.title = `${NAME.t} · ${LINE.length} mẫu · HIVE`;
    const big = nw($(".lhead h1.big"));
    big.textContent = NAME.t;
    big.classList.add("line");
    $(".lhead .row1 .meta").textContent = `${LINE.length} mẫu · ${TAGLINE}`;
    $(".lhead .row1").append(shelfLink("Số 05 đang bán", 10, "/products", true));
    const f = facets(LINE);
    const byFam = {};
    LINE.forEach((s) => (byFam[s.fam] = (byFam[s.fam] || 0) + 1));
    tabs(byFam, LINE.length);
    rail(f, false);
    quickChips(f, false);
    const grid = $(".listing3 .grid3");
    grid.replaceChildren(...LINE.map((s) => card(s)));
    const bar = $(".listbar > span");
    if (bar) bar.textContent = `Hiện ${LINE.length} / ${LINE.length} mẫu`;
  }

  function oneShelf() {
    nav(false);
    const f = facets(LINE);
    // the family tabs count both groups
    const nav3 = $(".tabs3");
    const had = {};
    $$("a", nav3).forEach((a) => {
      const k = keyOf(a.getAttribute("href"));
      had[k || "all"] = +($(".cnt", a)?.textContent || 0);
    });
    const counts = {};
    FAMS.forEach((x) => (counts[x] = (had["family=" + x] || 0) + (f["family=" + x] || 0)));
    tabs(counts, (had.all || 0) + LINE.length);
    $(".tabs3 a").setAttribute("href", "/products");
    rail(f, true);
    quickChips(f, true);
    const meta = $(".lhead .row1 .meta");
    meta.append(nw(h(`<span> · và ${LINE.length} mẫu ${NAME.t.toLocaleLowerCase("vi")} bên dưới</span>`)));
    const grid = $(".listing3 .grid3");
    const sec = nw(
      h(
        `<section class="sec" aria-labelledby="h-lg"><div class="hd"><h2 id="h-lg">${NAME.t}</h2>` +
          `<span class="meta">${LINE.length} mẫu · ${TAGLINE}</span></div><div class="grid3"></div></section>`,
      ),
    );
    $(".grid3", sec).append(...LINE.map((s) => card(s)));
    grid.after(sec);
    const bar = $(".listbar > span");
    if (bar) bar.textContent = `Hiện ${10 + LINE.length} / ${10 + LINE.length} mẫu`;
  }

  function product() {
    const s = bySlug.sap;
    const st = JSON.parse(JSON.stringify(s.st));
    const short = OPTS.sz === "thieu";
    const first = s.c[0];
    if (short) st[first][1] = 0;
    nav(false);
    document.title = `${s.n} · ${NAME.t} · HIVE`;

    const crumb = $(".crumbs a");
    crumb.textContent = NAME.t;
    crumb.setAttribute("href", NAME.url);
    nw(crumb);
    $(".crumbs b").textContent = s.n;

    const gal = $(".gal");
    gal.setAttribute("aria-label", `Ảnh ${s.n}, ${s.c.length} tấm`);
    gal.innerHTML = s.c.map((c) => `<figure class="ph">${flat(s.shape, c)}<span class="tag">chờ ảnh</span></figure>`).join("");
    const galbar = $(".galbar");
    if (galbar) {
      galbar.innerHTML =
        `<span><span class="cur">1</span> / ${s.c.length}</span>` +
        `<span class="dots" aria-hidden="true">${s.c.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</span>`;
    }

    const kick = nw($(".ticket .kick"));
    kick.innerHTML = `<span class="badge flat">${NAME.t}</span><span>${TAGLINE.replace(", ", " · ")}</span>`;
    $(".ticket h1").textContent = s.n;
    $(".ticket .kind").textContent = `${s.kind} · ${s.mat}`;
    $(".ticket .price").textContent = vnd(s.p);
    const stock = nw($(".ticket .stock"));
    stock.innerHTML = short
      ? `<b>Tạm hết M</b> ở màu ${COLORS[first][0]} <span class="cd">· sẽ may lại, chưa có ngày</span>`
      : `<b>Đủ 4 size</b> ở cả ${s.c.length} màu <span class="cd">· hết size nào may lại size đó</span>`;

    const flds = $$(".ticket .fld");
    const [colorFld, sizeFld] = flds;
    $(".lbl span", colorFld).textContent = `${COLORS[first][0]} · còn ${sum(st[first])}`;
    $(".sw", colorFld).innerHTML = s.c
      .map((c) => {
        const n = sum(st[c]);
        return (
          `<button type="button" aria-pressed="${c === first}" aria-label="Màu ${COLORS[c][0]}, còn ${n}">` +
          `<i style="background:${COLORS[c][1]}" aria-hidden="true"></i><span>${COLORS[c][0]} ${n}</span></button>`
        );
      })
      .join("");
    const mk = $(".sizes .mk", sizeFld)?.outerHTML || "";
    $(".sizes tbody", sizeFld).innerHTML = SIZES.map((z, i) => {
      const n = st[first][i];
      if (n === 0) {
        return (
          `<tr data-new><td><button type="button" class="gone" disabled aria-pressed="false"><b>${z}</b>` +
          `<span class="ld" aria-hidden="true"></span><span class="left">tạm hết</span>${mk}</button></td></tr>`
        );
      }
      return (
        `<tr><td><button type="button" aria-pressed="false"><b>${z}</b><span class="ld" aria-hidden="true"></span>` +
        `<span class="left${n <= 2 ? " low" : ""}">còn ${n}</span>${mk}</button></td></tr>`
      );
    }).join("");
    $(".sizes", sizeFld).setAttribute("aria-label", `Chọn size ${s.n}`);

    const rows = $$(".info3 .r");
    $("dd", rows[0]).textContent = s.mat;
    $("dd", rows[1]).innerHTML = "Regular<span>đúng size thường ngày</span>";

    const rel = $("#h-rel")?.closest("section");
    if (rel) {
      const h2 = nw($("#h-rel", rel));
      h2.textContent = `Cùng dòng ${NAME.t}`;
      const more = $(".more", rel);
      more.textContent = `Xem cả ${LINE.length} mẫu`;
      more.setAttribute("href", NAME.url);
      $(".grid3", rel).replaceChildren(...["mat", "dan", "phan", "ken"].map((k) => card(bySlug[k], { kind: true })));
    }
    const who = $(".buybar3 .who");
    if (who) who.innerHTML = `<b>${s.n}</b><span>${vnd(s.p)} · chưa chọn size</span>`;
  }

  function adminProducts() {
    const sub = nw($(".top .sub"));
    sub.textContent = `29 mẫu · 3 số và dòng ${NAME.t} · 18 đang bán · tồn kho theo size và màu`;
    const stabs = $(".stabs");
    const first = $("a", stabs);
    const tab = nw(h(`<a href="/admin/products?line=1">${NAME.t}<span class="cnt">${LINE.length}</span></a>`));
    first.after(tab);
    if (OPTS.tab !== "line") return;

    first.classList.remove("on");
    first.removeAttribute("aria-current");
    tab.classList.add("on");
    tab.setAttribute("aria-current", "page");
    const chips = $$(".bar.tools a.chip3");
    if (chips[0]) chips[0].innerHTML = 'Sắp hết<span class="cnt">0</span>';
    if (chips[1]) chips[1].innerHTML = 'Tạm hết<span class="cnt">0</span>';
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
        `<span>${LINE.length} mẫu · ${sum(LINE.map(onHand))} trên kệ · mẫu ${NAME.t.toLocaleLowerCase("vi")} không có số cắt: ` +
        "hết size nào nhập thêm size đó</span>";
    }
  }

  function adminNew() {
    const field = $$(".field3").find((f) => $(".lbl", f)?.textContent.trim() === "Số");
    if (!field) return;
    nw($(".lbl", field)).textContent = "Bán trong";
    const wrap = $(".selwrap", field);
    const help = $(".help", field);
    if (OPTS.sell === "line") {
      $(".selbtn .t", field).textContent = `${NAME.t} · bán liên tục`;
      nw(help).textContent = "Lên kệ ngay khi lưu, không có giờ đóng. Hết size thì nhập thêm ở trang sửa mẫu.";
      nw($(".top .sub")).textContent =
        `Mẫu ${NAME.t.toLocaleLowerCase("vi")} không có số cắt: tồn kho điền ở đây là hàng lên kệ lúc đầu, hết thì nhập thêm. ` +
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
        `<div class="menu3" role="menu" aria-label="Bán trong">` +
          `<button type="button" role="menuitemradio" aria-checked="false"><span class="mk"></span><span>Số 05 · đang bán</span><em class="tally">lên kệ ngay</em></button>` +
          `<button type="button" role="menuitemradio" aria-checked="true" class="ticked"><span class="mk">${TICK}</span><span>Số 06 · sắp mở</span><em class="tally">lên kệ 20:00 06/10</em></button>` +
          `<button type="button" role="menuitemradio" aria-checked="false" data-active data-new><span class="mk"></span><span>${NAME.t}</span><em class="tally">không đóng</em></button>` +
          `</div>`,
      ),
    );
  }

  const PAGES = { home, "home-gap": homeGap, products, product, "admin-products": adminProducts, "admin-new": adminNew };

  // The board (line.html) loads this file for the data and the flats only.
  window.LINE_DATA = { NAMES, COLORS, SIZES, FAM, LINE, flat, vnd, onHand, outSizes };
  const snap = document.documentElement.dataset.snap;
  if (!snap) return;

  // ── options, first draw, re-draws
  const q = new URLSearchParams(location.search);
  const OPTS = {
    name: q.get("name") || "quanh-nam",
    ia: q.get("ia") || "hai-ke",
    shelf: q.get("shelf") || "so",
    sz: q.get("sz") || "du",
    sell: q.get("sell") || "menu",
    tab: q.get("tab") || "line",
    mark: q.get("mark") || "1",
  };
  let NAME = NAMES[OPTS.name] || NAMES["quanh-nam"];
  const ORIGINAL = document.body.innerHTML;
  const TITLE = document.title;

  function draw() {
    NAME = NAMES[OPTS.name] || NAMES["quanh-nam"];
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
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo(0, Math.max(0, top));
  }

  draw();
  if (q.get("at")) jump(q.get("at"));
})();
