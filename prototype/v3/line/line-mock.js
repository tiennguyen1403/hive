/* Fixed styles ("cố định"), drawn over static snapshots of the running store
   (snap.cjs). The snapshot is the store as it is; this file is the proposal.
   It restores the untouched page and re-draws on every change, so the board
   can flip an option without reloading the frame.

   Round 4 (25/09/2026), the user's calls on round 3:
   · the issue's plate moves to the bottom left of the photo; SOLD OUT stays
     top left, cut down to the plate's size;
   · while an issue is open the home page shows "Đang bán" too, as between
     issues;
   · the product page loses the label row above the colour buttons;
   · the back office's restock goes into the row's ⋯ menu;
   · the add-style form loses its explaining sentences;
   · a fixed style has a plain descriptive name; an issue's style carries its
     issue as a prefix, "S05 – KHÓI".

   Options, from the query string and then from the board by postMessage:
     view  = all | issue       (products) every style, or the issue's own page
     pdp   = fixed | issue     (product) a fixed style's page, or KHÓI's
     sell  = menu | fixed      (admin-new) the field's menu open, or "Cố định" chosen
     pfx   = soft | ink        the prefix in secondary ink, or in the name's own
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
  const NEXT = { no: 6 };
  /** The back office's word for a style that belongs to no issue. */
  const FIXED = "Cố định";
  /** A fixed style is running low when any colour has two or fewer of any size. */
  const LOW_AT = 2;

  /** An issue's style is named after its issue: "S05", then the name. */
  const code = (no) => "S" + String(no).padStart(2, "0");
  const fullName = (no, n) => `${code(no)} – ${n}`;

  // The eight: plain basics in the six families, S–XL, each called what it
  // is. Stock is per colour, S M L XL; the first colour is the card's photo.
  // Three run low (two of them have a size gone), so the back office has
  // something to flag.
  const LINE = [
    { slug: "ao-thun-tron", name: "ÁO THUN TRƠN", kind: "Áo thun", fam: "TEE", mat: "Cotton 220gsm", fit: "REGULAR", p: 400000,
      c: ["white", "black", "grey"], shape: "tee", st: { white: [10, 14, 11, 6], black: [8, 12, 9, 5], grey: [6, 9, 7, 4] } },
    { slug: "ao-thun-tay-dai", name: "ÁO THUN TAY DÀI", kind: "Áo thun tay dài", fam: "TEE", mat: "Cotton 220gsm", fit: "REGULAR", p: 450000,
      c: ["black", "white"], shape: "longsleeve", st: { black: [5, 8, 6, 3], white: [6, 7, 5, 3] } },
    { slug: "hoodie-tron", name: "HOODIE TRƠN", kind: "Áo hoodie", fam: "HOODIE", mat: "Nỉ bông 340gsm", fit: "OVERSIZE", p: 750000,
      c: ["grey", "black", "cream"], shape: "hoodie", st: { grey: [5, 0, 4, 2], black: [4, 0, 6, 3], cream: [3, 0, 2, 2] } },
    { slug: "ao-khoac-du", name: "ÁO KHOÁC DÙ", kind: "Áo khoác dù", fam: "JACKET", mat: "Dù 1 lớp", fit: "OVERSIZE", p: 850000,
      c: ["black", "navy"], shape: "jacket", st: { black: [3, 5, 4, 3], navy: [3, 4, 3, 3] } },
    { slug: "gile-phao", name: "GILE PHAO", kind: "Áo gile phao", fam: "VEST", mat: "Dù chần bông", fit: "REGULAR", p: 750000,
      c: ["black"], shape: "vest", st: { black: [3, 5, 5, 2] } },
    { slug: "so-mi-oxford", name: "SƠ MI OXFORD", kind: "Áo sơ mi oxford", fam: "SHIRT", mat: "Cotton oxford", fit: "REGULAR", p: 590000,
      c: ["white", "navy"], shape: "shirt", st: { white: [4, 7, 6, 3], navy: [3, 5, 4, 3] } },
    { slug: "quan-kaki", name: "QUẦN KAKI", kind: "Quần kaki", fam: "PANTS", mat: "Kaki 280gsm", fit: "REGULAR", p: 650000,
      c: ["cream", "black"], shape: "trousers", st: { cream: [3, 5, 4, 3], black: [4, 7, 6, 3] } },
    { slug: "quan-short-ni", name: "QUẦN SHORT NỈ", kind: "Quần short nỉ", fam: "PANTS", mat: "Nỉ da cá 300gsm", fit: "REGULAR", p: 450000,
      c: ["grey", "black"], shape: "shorts", st: { grey: [5, 6, 5, 0], black: [6, 9, 7, 0] } },
  ];
  const bySlug = Object.fromEntries(LINE.map((s) => [s.slug, s]));
  /** The six the home page shows under "Đang bán". */
  const HOME_SIX = ["ao-thun-tron", "hoodie-tron", "ao-khoac-du", "so-mi-oxford", "quan-kaki", "ao-thun-tay-dai"];

  // Issue styles the board shows by name, as the store has them.
  const ISSUE_SAMPLES = [
    { no: 5, name: "KHÓI", kind: "Áo thun oversize" },
    { no: 5, name: "SƯƠNG", kind: "Áo khoác dù" },
    { no: 5, name: "MUỐI", kind: "Quần jogger" },
    { no: 6, name: "SỎI", kind: "Áo khoác dù" },
    { no: 6, name: "NGÓI", kind: "Áo hoodie in" },
  ];

  // "Theo loại" once it counts everything on sale: the issue's ten and the
  // eight. `img` reuses the row photo the snapshot already has; `flat` draws.
  const INDEX_ALL = [
    { fam: "TEE", n: 5, d: "oversize, cơ bản, tay lỡ và tay dài", from: 390000, img: "TEE" },
    { fam: "HOODIE", n: 3, d: "trơn và in", from: 750000, img: "HOODIE" },
    { fam: "JACKET", n: 3, d: "dù và bomber", from: 850000, img: "JACKET" },
    { fam: "VEST", n: 1, d: "gile phao", from: 750000, flat: "gile-phao" },
    { fam: "SHIRT", n: 2, d: "sơ mi dệt và oxford", from: 590000, img: "SHIRT" },
    { fam: "PANTS", n: 4, d: "jogger, cargo, kaki và short", from: 450000, img: "PANTS" },
  ];
  // Between two issues only the eight are on sale.
  const INDEX_GAP = [
    { fam: "TEE", n: 2, d: "cơ bản và tay dài", from: 400000, flat: "ao-thun-tron" },
    { fam: "HOODIE", n: 1, d: "trơn", from: 750000, flat: "hoodie-tron" },
    { fam: "JACKET", n: 1, d: "dù", from: 850000, flat: "ao-khoac-du" },
    { fam: "VEST", n: 1, d: "gile phao", from: 750000, flat: "gile-phao" },
    { fam: "SHIRT", n: 1, d: "oxford", from: 590000, flat: "so-mi-oxford" },
    { fam: "PANTS", n: 2, d: "kaki và short", from: 450000, flat: "quan-kaki" },
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
  const lowCells = (s) => s.c.flatMap((c) => SIZES.map((z, i) => ({ c, z, n: s.st[c][i] }))).filter((x) => x.n <= LOW_AT);
  const isLow = (s) => lowCells(s).length > 0;
  const nw = (el) => (el && el.setAttribute("data-new", ""), el);

  /** The prefix, as the store would print it: the code and the dash never
      part (a no-break space), the name follows. */
  const pfxHtml = (no) => `<span class="pfx">${code(no)} –</span> `;

  // The board (line.html) loads this file for the data and the flats only.
  window.LINE_DATA = { COLORS, SIZES, FAM, LINE, ISSUE, ISSUE_SAMPLES, code, fullName, pfxHtml, flat, vnd, onHand, outSizes, isLow };
  const snap = document.documentElement.dataset.snap;
  if (!snap) return;

  const BAG =
    '<svg class="ic ic sm" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="--il:0.1354;--ir:0.1354"><path d="M7.5 7.67V6.7c0-2.25 1.81-4.46 4.06-4.67a4.5 4.5 0 0 1 4.94 4.48v1.38M9 22h6c4.02 0 4.74-1.61 4.95-3.57l.75-6C20.97 9.99 20.27 8 16 8H8c-4.27 0-4.97 1.99-4.7 4.43l.75 6C4.26 20.39 4.98 22 9 22Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15.495 12h.01M8.495 12h.008" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  const TICK =
    '<svg viewBox="7.75 9.17 8.5 5.66" fill="none" aria-hidden="true"><path d="m7.75 12 2.83 2.83 5.67-5.66" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  // The row menu's glyphs, as the store's <Icon> renders them (components/icon/paths.ts).
  const ICON = {
    box: '<svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="--il:0.0996;--ir:0.0992"><path d="M3.17 7.44 12 12.55l8.77-5.08M12 21.61v-9.07" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9.93 2.48 4.59 5.45c-1.21.67-2.2 2.35-2.2 3.73v5.65c0 1.38.99 3.06 2.2 3.73l5.34 2.97c1.14.63 3.01.63 4.15 0l5.34-2.97c1.21-.67 2.2-2.35 2.2-3.73V9.18c0-1.38-.99-3.06-2.2-3.73l-5.34-2.97c-1.15-.64-3.01-.64-4.15 0Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17 13.24V9.58L7.51 4.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    edit: '<svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="--il:0.1250;--ir:0.1250"><path d="m13.26 3.6-8.21 8.69c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.41 1.39-.75l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.34-5.29.16Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path><path d="M11.89 5.05a6.126 6.126 0 0 0 5.45 5.15M3 22h18" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    swap: '<svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="--il:0.1458;--ir:0.1458"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-width="1.5" d="M20.5 14.99l-5.01 5.02M3.5 14.99h17M3.5 9.01l5.01-5.02M20.5 9.01h-17"></path></svg>',
    eye: '<svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="--il:0.0925;--ir:0.0921"><path d="M15.58 12c0 1.98-1.6 3.58-3.58 3.58S8.42 13.98 8.42 12s1.6-3.58 3.58-3.58 3.58 1.6 3.58 3.58Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 20.27c3.53 0 6.82-2.08 9.11-5.68.9-1.41.9-3.78 0-5.19-2.29-3.6-5.58-5.68-9.11-5.68-3.53 0-6.82 2.08-9.11 5.68-.9 1.41-.9 3.78 0 5.19 2.29 3.6 5.58 5.68 9.11 5.68Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
  };

  /** Put the issue's code in front of a name the snapshot printed bare. */
  function prefix(el, no) {
    if (!el || $(".pfx", el)) return;
    el.innerHTML = pfxHtml(no) + el.textContent.trim();
  }
  const prefixAll = (sel, no, root = document) => $$(sel, root).forEach((el) => prefix(el, no));

  // ── a card for a fixed style: the store's own `.card3`, with no stock
  // figure — only the sizes, a gone one struck through.
  function card(s) {
    const out = outSizes(s);
    const sizes = SIZES.map((z) => (out.includes(z) ? `<s>${z}</s>` : z)).join(" ");
    return h(
      `<div class="card3" data-fixed><div class="imgbox"><a class="img ph" href="/products/${s.slug}">${flat(s.shape, s.c[0])}<span class="tag">chờ ảnh</span></a></div>` +
        `<a class="meta" href="/products/${s.slug}"><span class="toc"><span class="n">${s.name}</span><span class="ld" aria-hidden="true"></span><span class="p">${vnd(s.p)}</span></span>` +
        `<span class="ct"><span>${sizes}</span></span></a>` +
        `<div class="act"><button type="button" class="addbtn3">${BAG}Thêm vào giỏ</button></div></div>`,
    );
  }

  // A style in an issue wears the issue's plate at the bottom left of its
  // photo — the nav's own plate — wherever it stands among other styles. Not
  // where every style is the issue's: its page, "Trong số này", "Cùng số".
  function plateIssueCards(root = document) {
    for (const c of $$(".card3:not([data-fixed])", root)) {
      const box = $(".imgbox", c);
      if (box && !$(".sotag", box)) box.append(nw(h(`<span class="sotag">${ISSUE.label}</span>`)));
    }
  }

  // SOLD OUT keeps the top left, at the plate's size, on every card.
  const markStamps = () => $$(".card3 .stamp").forEach(nw);

  // The countdown is drawn in the browser; a snapshot has only its "00".
  function clock(el, digits) {
    if (!el) return;
    $$("b", el).forEach((b, i) => {
      b.classList.remove("wait");
      b.textContent = digits[i];
    });
  }

  // ── "Đang bán": six styles on sale that no section above already shows,
  // and the way to all of them. The same section open or between issues.
  function onSaleSection(total) {
    const sec = nw(
      h(
        `<section class="sec" aria-labelledby="h-sale"><div class="hd"><h2 id="h-sale">Đang bán</h2>` +
          `<a class="more" href="/products">Xem tất cả ${total} mẫu</a></div><div class="grid3"></div></section>`,
      ),
    );
    $(".grid3", sec).append(...HOME_SIX.map((k) => card(bySlug[k])));
    return sec;
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

  // An issue is open: its cover, its ten, then what else is on sale, then
  // every family.
  function home() {
    const clocks = $$(".cover .clock");
    clock(clocks[0], ["04", "19", "10"]);
    clock(clocks[1], ["11", "19", "10"]);
    prefixAll(".cover.open .tocrow .n", ISSUE.no);
    prefixAll(".cover.soon figcaption b", NEXT.no);
    const inIssue = $("#h-in")?.closest("section");
    prefixAll(".card3 .toc .n", ISSUE.no, inIssue);
    inIssue?.after(onSaleSection(ISSUE.styles + LINE.length));

    const index = $(".index");
    if (!index) return;
    const photos = {};
    for (const row of $$("a.row", index)) {
      const fam = new URLSearchParams(row.getAttribute("href").split("?")[1]).get("family");
      photos[fam] = $("img", row)?.outerHTML || "";
    }
    index.innerHTML = indexRows(INDEX_ALL, photos);
    $(".hd .meta", index.closest("section")).textContent = "đang bán";
  }

  // Between two issues: Số 05 has closed, Số 06 has not opened. The snapshot
  // is the store's own page for Số 06 while Số 05 still sells, so the parts
  // that say Số 05 is open are put right here.
  function homeGap() {
    $(".nav3 .itag")?.remove(); // the plate shows only while an issue sells (slice 10)
    clock($(".cover .clock"), ["05", "19", "10"]);
    prefixAll(".cover.soon figcaption b", NEXT.no);
    const byFamily = nw(
      h(
        `<section class="sec" aria-labelledby="h-fam"><div class="hd"><h2 id="h-fam">Theo loại</h2>` +
          `<span class="meta">đang bán</span></div><div class="index">${indexRows(INDEX_GAP, {})}</div></section>`,
      ),
    );
    $("main .wrap3")?.prepend(onSaleSection(LINE.length), byFamily);
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
  const chip = (href, label, n, dot) =>
    `<a class="chip3" href="${href}">${dot ? `<i class="dot" style="background:${dot}" aria-hidden="true"></i>` : ""}${label}<span class="cnt">${n}</span></a>`;

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

  function products() {
    const grid = $(".listing3 .grid3");
    prefixAll(".card3 .toc .n", ISSUE.no, grid);
    markStamps();
    // The issue's own page, /so/5: today's list, its names now carrying the code.
    if (OPTS.view === "issue") return;

    const plate = $(".nav3 .itag");
    plate?.classList.remove("on");
    plate?.removeAttribute("aria-current");
    document.title = "Tất cả mẫu · HIVE";
    // No title and no count above the tabs: "Tất cả 18" says both. The page
    // keeps its heading for a screen reader.
    const row1 = $(".lhead .row1");
    row1?.replaceWith(h('<h1 class="sr-only">Tất cả mẫu</h1>'));
    $(".lhead")?.classList.add("bare");

    const f = facets(LINE);
    const nav3 = $(".tabs3");
    const had = {};
    $$("a", nav3).forEach((a) => (had[keyOf(a.getAttribute("href")) || "all"] = +($(".cnt", a)?.textContent || 0)));
    nav3.innerHTML =
      `<a class="on" aria-current="page" href="/products">Tất cả<span class="cnt">${(had.all || 0) + LINE.length}</span></a>` +
      FAMS.filter((x) => (had["family=" + x] || 0) + (f["family=" + x] || 0))
        .map((x) => `<a class="" href="/products?family=${x}">${FAM[x]}<span class="cnt">${(had["family=" + x] || 0) + (f["family=" + x] || 0)}</span></a>`)
        .join("");
    railAll(f);
    quickAll(f);

    plateIssueCards(grid);
    grid.append(...LINE.map((s) => card(s)));
    const bar = $(".listbar > span");
    if (bar) bar.textContent = `Hiện ${ISSUE.styles + LINE.length} / ${ISSUE.styles + LINE.length} mẫu`;
  }

  // ── a style's page. Either kind: no label row above the colour buttons —
  // each button already names its colour (and, in an issue, its count).
  function product() {
    const [colorFld] = $$(".ticket .fld");
    $(".lbl", colorFld)?.remove();
    nw($(".sw", colorFld));
    if (OPTS.pdp === "issue") productIssue();
    else productFixed(colorFld);
  }

  // KHÓI, an issue's style: the page as it is, the name carrying its code.
  function productIssue() {
    const n = "KHÓI";
    document.title = `${fullName(ISSUE.no, n)} · HIVE`;
    prefix($(".crumbs b"), ISSUE.no);
    prefix(nw($(".ticket h1")), ISSUE.no);
    prefix($(".buybar3 .who b"), ISSUE.no);
    $(".gal")?.setAttribute("aria-label", `Ảnh ${fullName(ISSUE.no, n)}, 2 tấm`);
    $(".sizes")?.setAttribute("aria-label", `Chọn size ${fullName(ISSUE.no, n)}`);
    // "Cùng số 05" is all the issue's, so its cards carry no plate.
    prefixAll(".card3 .toc .n", ISSUE.no, $("#h-rel")?.closest("section"));
    markStamps();
  }

  // A fixed style on its own page: no issue in the breadcrumb, no clock, and
  // no stock figure anywhere — the colours and sizes say only what can be had.
  function productFixed(colorFld) {
    const s = bySlug["ao-thun-tron"];
    const first = s.c[0];
    const n = s.name;
    document.title = `${n} · HIVE`;

    const crumbs = $(".crumbs");
    const firstLink = $("a", crumbs);
    firstLink?.nextElementSibling?.remove(); // its "/"
    firstLink?.remove();
    $("b", crumbs).textContent = n;

    const gal = $(".gal");
    gal.setAttribute("aria-label", `Ảnh ${n}, ${s.c.length} tấm`);
    gal.innerHTML = s.c.map((c) => `<figure class="ph">${flat(s.shape, c)}<span class="tag">chờ ảnh</span></figure>`).join("");
    const galbar = $(".galbar");
    if (galbar) {
      galbar.innerHTML =
        `<span><span class="cur">1</span> / ${s.c.length}</span>` +
        `<span class="dots" aria-hidden="true">${s.c.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</span>`;
    }

    $(".ticket .kick")?.remove();
    $(".ticket h1").textContent = n;
    $(".ticket .kind").textContent = `${s.kind} · ${s.mat}`;
    $(".ticket .price").textContent = vnd(s.p);
    $(".ticket .stock")?.remove();

    $(".sw", colorFld).innerHTML = s.c
      .map((c) => (
        `<button type="button" aria-pressed="${c === first}" aria-label="Màu ${COLORS[c][0]}">` +
        `<i style="background:${COLORS[c][1]}" aria-hidden="true"></i><span>${COLORS[c][0]}</span></button>`
      ))
      .join("");
    const sizeFld = $$(".ticket .fld")[1];
    const mk = $(".sizes .mk", sizeFld)?.outerHTML || "";
    $(".sizes tbody", sizeFld).innerHTML = SIZES.map((z, i) => {
      const gone = s.st[first][i] === 0;
      return gone
        ? `<tr><td><button type="button" class="gone" disabled aria-pressed="false"><b>${z}</b><span class="ld" aria-hidden="true"></span><span class="left">đã hết</span>${mk}</button></td></tr>`
        : `<tr><td><button type="button" aria-pressed="false"><b>${z}</b><span class="ld" aria-hidden="true"></span><span class="left"></span>${mk}</button></td></tr>`;
    }).join("");
    $(".sizes", sizeFld).setAttribute("aria-label", `Chọn size ${n}`);

    const rows = $$(".info3 .r");
    $("dd", rows[0]).textContent = s.mat;
    $("dd", rows[1]).innerHTML = "Regular<span>đúng size thường ngày</span>";

    // "Cùng loại": the tees on sale, whichever kind of style they are.
    const rel = $("#h-rel")?.closest("section");
    if (rel) {
      $("#h-rel", rel).textContent = "Cùng loại";
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
      img.setAttribute("alt", `${fullName(ISSUE.no, "KHÓI")}, màu Đen`);
      $$("a", khoi).forEach((a) => a.setAttribute("href", "/products/khoi"));
      $(".grid3", rel).replaceChildren(khoi, byName["NẮNG"], byName["CÁT"], card(bySlug["ao-thun-tay-dai"]));
      prefixAll(".card3:not([data-fixed]) .toc .n", ISSUE.no, rel);
      plateIssueCards(rel);
    }
    const who = $(".buybar3 .who");
    if (who) who.innerHTML = `<b>${n}</b><span>${vnd(s.p)} · chưa chọn size</span>`;
  }

  // ── the back office: "Cố định" is the first tab and the one open. A style
  // running low says so in its status and in red under its stock, and those
  // rows come first. Restocking is in the row's ⋯ menu, shown open on the
  // first of them.
  function adminProducts() {
    $(".top .sub").textContent = "29 mẫu · 18 đang bán · tồn kho theo size và màu";
    const stabs = $(".stabs");
    const first = $("a", stabs);
    first.classList.remove("on");
    first.removeAttribute("aria-current");
    const lowCount = LINE.filter(isLow).length;
    stabs.prepend(
      h(
        `<a class="on" aria-current="page" href="/admin/products?fixed=1">${FIXED}<span class="cnt">${LINE.length}</span>` +
          `<i class="lowdot" title="${lowCount} mẫu sắp hết" aria-label="${lowCount} mẫu sắp hết"></i></a>`,
      ),
    );

    const chips = $$(".bar.tools a.chip3");
    if (chips[0]) chips[0].innerHTML = `Sắp hết<span class="cnt">${lowCount}</span>`;
    if (chips[1]) chips[1].innerHTML = 'Hết<span class="cnt">0</span>';
    const menuBtn = $("tbody .rowmenu")?.outerHTML || "";
    const ordered = [...LINE.filter(isLow), ...LINE.filter((s) => !isLow(s))];
    $("tbody").innerHTML = ordered.map((s) => {
      const out = outSizes(s);
      const low = isLow(s);
      const thin = lowCells(s).filter((x) => x.n > 0);
      const note = low
        ? `<span class="lownote">${SIZES.filter((z) => out.includes(z) || thin.some((x) => x.z === z))
            .map((z) => (out.includes(z) ? `${z} hết` : `${z} còn ${Math.min(...thin.filter((x) => x.z === z).map((x) => x.n))}`))
            .join(" · ")}</span>`
        : "";
      return (
        `<tr><td class="nw"><span class="athumb">${flat(s.shape, s.c[0])}</span><b class="nm">${s.name}</b></td>` +
        `<td>${s.kind} · ${s.fit === "OVERSIZE" ? "oversize" : "regular"}</td><td class="right">${vnd(s.p).replace("₫", "")}</td>` +
        `<td>${s.c.map((c) => COLORS[c][0]).join(" · ")}</td>` +
        `<td><div class="stockcell"><span>còn ${onHand(s)}</span>${note}</div></td>` +
        `<td${out.length ? ' class="hotsize"' : ""}>${out.length ? out.join(" · ") : "—"}</td>` +
        `<td>${low ? '<span class="badge hot"><i></i>Sắp hết</span>' : '<span class="badge ok"><i></i>Đang bán</span>'}</td>` +
        `<td>${menuBtn.replace(/KHÓI/g, s.name)}</td></tr>`
      );
    }).join("");
    $(".dt3 > .foot")?.remove();

    // The first low row's menu, open. The store portals it to <body>.
    const s = ordered[0];
    const btn = $("tbody .rowmenu");
    btn.setAttribute("aria-expanded", "true");
    const menu = h(
      `<div class="menu3 pinned" role="menu" aria-label="Thao tác ${s.name}">` +
        `<button type="button" role="menuitem" data-new>${ICON.box}Nhập thêm</button>` +
        `<a role="menuitem" href="/admin/products/${s.slug}">${ICON.edit}Sửa mẫu</a>` +
        `<button type="button" role="menuitem">${ICON.swap}Điều chỉnh tồn kho</button>` +
        `<a role="menuitem" href="/products/${s.slug}" target="_blank" rel="noreferrer">${ICON.eye}Xem ở cửa hàng</a>` +
        `</div>`,
    );
    document.body.append(menu);
    const place = () => {
      const r = btn.getBoundingClientRect();
      menu.style.top = `${r.bottom + window.scrollY + 4}px`;
      menu.style.left = `${r.right + window.scrollX - menu.offsetWidth}px`;
    };
    place();
    document.fonts?.ready.then(place);
  }

  // ── adding a style: no sentence explains what an issue or a fixed style
  // is. An issue's style shows its code in front of the name field, from the
  // issue chosen; a fixed style has none.
  function adminNew() {
    $(".top .sub")?.remove();
    const fieldOf = (label) => $$(".field3").find((f) => $(".lbl", f)?.textContent.trim() === label);
    const field = fieldOf("Số");
    if (!field) return;
    $(".help", field)?.remove();
    const colorHelp = $$(".panel3 .help").find((x) => x.textContent.includes("Chốt lúc cắt"));
    if (colorHelp) colorHelp.textContent = colorHelp.textContent.replace(/\s*Chốt lúc cắt:[^.]*\./, "").trim();
    const nameInput = $("input", fieldOf("Tên mẫu"));

    if (OPTS.sell === "fixed") {
      nw($(".selbtn .t", field)).textContent = FIXED;
      nameInput.setAttribute("placeholder", "VD: ÁO THUN TRƠN");
      const cut = $$(".panel3 h2").find((x) => x.textContent.startsWith("Số lượng sẽ cắt"));
      if (cut) nw(cut).firstChild.textContent = "Tồn kho";
      const colorLbl = $$(".lbl").find((x) => x.textContent.trim() === "Màu sẽ cắt");
      if (colorLbl) nw(colorLbl).textContent = "Màu";
      return;
    }

    const box = nw(h(`<span class="pfxin"><span class="pfx" id="name-pfx">${code(NEXT.no)} –</span></span>`));
    nameInput.replaceWith(box);
    box.append(nameInput);
    nameInput.setAttribute("aria-describedby", "name-pfx");

    const wrap = $(".selwrap", field);
    wrap.classList.add("open");
    wrap.append(
      h(
        `<div class="menu3" role="menu" aria-label="Số">` +
          `<button type="button" role="menuitemradio" aria-checked="false"><span class="mk"></span><span>Số 05 · đang bán</span></button>` +
          `<button type="button" role="menuitemradio" aria-checked="true" class="ticked"><span class="mk">${TICK}</span><span>Số 06 · sắp mở</span></button>` +
          `<button type="button" role="menuitemradio" aria-checked="false" data-active><span class="mk"></span><span>${FIXED}</span></button>` +
          `</div>`,
      ),
    );
  }

  const PAGES = { home, "home-gap": homeGap, products, product, "admin-products": adminProducts, "admin-new": adminNew };

  // ── options, first draw, re-draws
  const q = new URLSearchParams(location.search);
  const OPTS = {
    view: q.get("view") || "all",
    pdp: q.get("pdp") || "fixed",
    sell: q.get("sell") || "menu",
    pfx: q.get("pfx") || "soft",
    mark: q.get("mark") || "1",
  };
  const ORIGINAL = document.body.innerHTML;
  const TITLE = document.title;

  function draw() {
    const y = window.scrollY;
    document.body.innerHTML = ORIGINAL;
    document.title = TITLE;
    document.documentElement.dataset.mark = OPTS.mark;
    document.documentElement.dataset.pfx = OPTS.pfx;
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
