/*
 * HIVE style exploration: the shared mock data.
 *
 * Copied on 26/09/2026 from data/catalog.ts, data/colors.ts, data/size-chart.ts,
 * lib/shipping.ts and the garment briefs in tasks/anh-san-pham-prompt.md.
 * Feed (the direction the user kept on 27/09/2026) reads this file and never edits it; round 2 added the buying flow,
 * round 3 the account (the demo shopper, their orders, inbox, saved styles and reminders).
 *
 * All figures are the demo's simulated data (no real sales exist, PRODUCT.md).
 * Photos are the AI-made Issue 05 frames (packshot + on-model "look" per colour).
 * Issues 03, 04 and 06 have no photos of their own: show them without photos,
 * or use the flat silhouettes in shared/flats for Issue 06, never another style's photo.
 *
 * Paths are relative to a page one level down, e.g. prototype/explore/feed/home.html.
 */
(function () {
  "use strict";

  // The shop's three moments, picked with ?state= on any page (round 2, 27/09/2026). Same rule as the running app
  // (lib/drop.ts featuredDrop): an open issue if there is one, else the next announced one, else the last closed one.
  //   open      Issue 05 selling, four days to close (the default)
  //   upcoming  Issue 05 closed on 25/09, Issue 06 announced, opens in two days
  //   closed    between two issues: Issue 05 closed three days ago, nothing announced yet (Issue 06 is hidden)
  //   quiet     the same gap ten days after the close (round 4, user 27/09: past 7 days the fixed line leads the
  //             Bảng tin tab and Issue 05 joins the closed list; Issue 06 is hidden)
  const QUERY = (() => {
    try { return new URLSearchParams(window.location.search); } catch (e) { return new URLSearchParams(""); }
  })();
  const MODES = {
    open: "2026-09-21T19:02:00+07:00",
    upcoming: "2026-09-30T19:02:00+07:00",
    closed: "2026-09-28T19:02:00+07:00",
    quiet: "2026-10-05T19:02:00+07:00",
  };
  const MODE = MODES[QUERY.get("state")] ? QUERY.get("state") : "open";

  // Issue 06 exists only once announced: not in the gap between two issues.
  const GAP = MODE === "closed" || MODE === "quiet";

  // The mock's clock. Pages count down from this instant plus the time elapsed since the page loaded.
  const NOW = MODES[MODE];

  const stateAt = (i) => {
    const t = Date.parse(NOW);
    if (t < Date.parse(i.opensAt)) return "UPCOMING";
    return t >= Date.parse(i.closesAt) ? "CLOSED" : "OPEN";
  };
  const ISSUES = [
    { no: 3, opensAt: "2026-03-06T20:00:00+07:00", closesAt: "2026-03-20T20:00:00+07:00" },
    { no: 4, opensAt: "2026-06-05T20:00:00+07:00", closesAt: "2026-06-19T20:00:00+07:00" },
    { no: 5, opensAt: "2026-09-11T20:00:00+07:00", closesAt: "2026-09-25T20:00:00+07:00" },
    { no: 6, opensAt: "2026-10-02T20:00:00+07:00", closesAt: "2026-10-16T20:00:00+07:00" },
  ]
    .filter((i) => !(GAP && i.no === 6))
    .map((i) => Object.assign(i, { state: stateAt(i) }));

  const COLORS = {
    black: { label: "Đen", hex: "#1C1C1C" },
    cream: { label: "Kem", hex: "#E6DFD1" },
    grey: { label: "Xám", hex: "#8C8C8C" },
    moss: { label: "Rêu", hex: "#4A5240" },
    brown: { label: "Nâu", hex: "#5C4536" },
    white: { label: "Trắng", hex: "#F2F1ED" },
    navy: { label: "Xanh than", hex: "#2B3A52" },
  };

  const FAMILIES = {
    TEE: "Áo thun",
    HOODIE: "Hoodie",
    JACKET: "Khoác",
    SHIRT: "Sơ mi",
    PANTS: "Quần",
    VEST: "Gile",
  };

  const FITS = { OVERSIZE: "Oversize", REGULAR: "Regular" };

  const SIZES = ["S", "M", "L", "XL"];

  // Issue 05. Photos: shots/<slug>-<colour>.webp is the packshot on grey paper (1200x1500, 4:5),
  // shots/<slug>-<colour>-look.webp the same colour worn by a Vietnamese model in Saigon (1200x1500).
  const ISSUE_05 = [
    {
      slug: "khoi", name: "KHÓI", kind: "Áo thun oversize", family: "TEE",
      material: "Cotton 250gsm", fit: "OVERSIZE", price: 390000, cut: 35, print: null,
      colors: ["black", "cream"],
      stock: { black: { S: 3, M: 4, L: 2, XL: 1 }, cream: { S: 2, M: 2, L: 2, XL: 1 } },
      details: [
        "Vai rơi, thân rộng",
        "Tay ngắn rộng, dài tới trên khuỷu",
        "Cổ bo gân 2,5 cm",
        "In lụa dải khói halftone chéo từ gấu lên ngực",
      ],
    },
    {
      slug: "bui", name: "BỤI", kind: "Áo hoodie", family: "HOODIE",
      material: "Nỉ bông 380gsm", fit: "OVERSIZE", price: 890000, cut: 18, print: "Bản đồ mòn",
      colors: ["black", "grey"],
      stock: { black: { S: 0, M: 0, L: 1, XL: 0 }, grey: { S: 0, M: 0, L: 0, XL: 1 } },
      details: [
        "Mũ hai lớp đứng quanh cổ",
        "Dây rút dẹt, đầu kim loại",
        "Túi kangaroo",
        "Bo tay và gấu bản rộng",
        "In \"Bản đồ mòn\" ở ngực trên",
      ],
    },
    {
      slug: "nguoi", name: "NGUỘI", kind: "Áo hoodie in", family: "HOODIE",
      material: "Nỉ bông 380gsm", fit: "OVERSIZE", price: 1290000, cut: 12, print: "Dư nhiệt",
      colors: ["black"],
      stock: { black: { S: 1, M: 2, L: 1, XL: 1 } },
      details: [
        "Mũ hai lớp đứng quanh cổ",
        "Dây rút dẹt, đầu kim loại",
        "Túi kangaroo",
        "In \"Dư nhiệt\" ngang ngực trên",
      ],
    },
    {
      slug: "nang", name: "NẮNG", kind: "Áo thun", family: "TEE",
      material: "Cotton 220gsm", fit: "REGULAR", price: 450000, cut: 26, print: "Mảng nắng",
      colors: ["white", "cream", "moss"],
      stock: {
        white: { S: 1, M: 2, L: 1, XL: 1 },
        cream: { S: 1, M: 1, L: 1, XL: 1 },
        moss: { S: 1, M: 1, L: 1, XL: 0 },
      },
      details: [
        "Vai tra đúng đường vai",
        "Tay ngắn tới giữa bắp tay",
        "Cổ bo gân 1,5 cm",
        "In \"Mảng nắng\" ở ngực",
      ],
    },
    {
      slug: "suong", name: "SƯƠNG", kind: "Áo khoác dù", family: "JACKET",
      material: "Dù chống nước 2 lớp", fit: "OVERSIZE", price: 1450000, cut: 8, print: "Lớp sương",
      colors: ["black", "moss"],
      stock: { black: { S: 0, M: 1, L: 0, XL: 1 }, moss: { S: 0, M: 0, L: 1, XL: 0 } },
      details: [
        "Khoá kéo toàn thân dưới nẹp bấm",
        "Cổ đứng, mũ gắn liền",
        "Hai túi khoá kéo",
        "Đai dán chỉnh cổ tay",
        "Gấu dây rút có khoá chặn",
        "In \"Lớp sương\" ở vai và ngực",
      ],
    },
    {
      slug: "muoi", name: "MUỐI", kind: "Quần jogger", family: "PANTS",
      material: "Nỉ da cá 320gsm", fit: "REGULAR", price: 690000, cut: 14, print: "Kết tinh",
      colors: ["black", "grey"],
      stock: { black: { S: 0, M: 0, L: 0, XL: 0 }, grey: { S: 0, M: 0, L: 0, XL: 0 } },
      details: [
        "Cạp chun bọc, có dây rút",
        "Túi hai bên sườn",
        "Ống thuôn, bo gấu",
        "In \"Kết tinh\" dọc ống trái",
      ],
    },
    {
      slug: "than", name: "THAN", kind: "Áo khoác bomber", family: "JACKET",
      material: "Dù chần bông", fit: "OVERSIZE", price: 1350000, cut: 10, print: "Mạch than",
      colors: ["black", "navy"],
      stock: { black: { S: 1, M: 1, L: 1, XL: 0 }, navy: { S: 0, M: 1, L: 1, XL: 1 } },
      details: [
        "Chần ngang, mỗi đường cách 5 cm",
        "Cổ, tay và gấu bo gân",
        "Khoá kéo toàn thân",
        "Hai túi mổ xéo",
        "In \"Mạch than\" ở ngực trái",
      ],
    },
    {
      slug: "cat", name: "CÁT", kind: "Áo thun tay lỡ", family: "TEE",
      material: "Cotton 240gsm", fit: "OVERSIZE", price: 420000, cut: 31, print: "Vân xói",
      colors: ["cream", "white", "brown"],
      stock: {
        cream: { S: 2, M: 2, L: 2, XL: 1 },
        white: { S: 1, M: 2, L: 1, XL: 1 },
        brown: { S: 1, M: 1, L: 1, XL: 0 },
      },
      details: [
        "Vai rơi sâu, thân rộng và dài",
        "Tay rộng, dài tới khuỷu",
        "Cổ bo gân 2 cm",
        "In \"Vân xói\" ở thân trên",
      ],
    },
    {
      slug: "gio", name: "GIÓ", kind: "Áo sơ mi dệt", family: "SHIRT",
      material: "Kate lụa", fit: "REGULAR", price: 750000, cut: 15, print: "Luồng cắt",
      colors: ["white", "navy"],
      stock: { white: { S: 1, M: 2, L: 1, XL: 0 }, navy: { S: 1, M: 1, L: 1, XL: 0 } },
      details: [
        "Cổ đức, nẹp cúc cùng màu",
        "Túi ốp ngực trái",
        "Tay dài, măng séc một cúc",
        "Gấu lượn",
        "In \"Luồng cắt\" ở thân phải",
      ],
    },
    {
      slug: "da", name: "ĐÁ", kind: "Quần cargo", family: "PANTS",
      material: "Kaki 320gsm", fit: "REGULAR", price: 980000, cut: 12, print: "Mặt cắt",
      colors: ["moss", "black"],
      stock: { moss: { S: 0, M: 1, L: 1, XL: 1 }, black: { S: 1, M: 1, L: 1, XL: 0 } },
      details: [
        "Đỉa quần, khoá kéo và cúc",
        "Túi chéo phía trước",
        "Túi hộp có nắp hai bên đùi",
        "In \"Mặt cắt\" ở ống phải",
      ],
    },
  ];

  // Issue 06, not open yet. Price and quantity are announced at opening, so the data has none.
  // Since 08/10/2026 Issue 06 is "Independent Editions", four printed tees (the user's choice; the app's
  // data/catalog.ts). The app shows each one's own photo on the teaser card, four in a row from 1200px; the mock
  // keeps the flat silhouette (shared/flats/<shape>-black.png), as it has no copy of the app's photos.
  // Empty in the "closed" mode: between two issues nothing has been announced yet.
  const ISSUE_06 = GAP ? [] : [
    { slug: "out-of-character", name: "OUT OF CHARACTER", kind: "Áo thun in", family: "TEE", flat: "../shared/flats/tee-black.png" },
    { slug: "still-in-motion", name: "STILL IN MOTION", kind: "Áo thun in", family: "TEE", flat: "../shared/flats/tee-black.png" },
    { slug: "midnight-unedited", name: "MIDNIGHT, UNEDITED", kind: "Áo thun in", family: "TEE", flat: "../shared/flats/tee-black.png" },
    { slug: "for-reference-only", name: "FOR REFERENCE ONLY", kind: "Áo thun in", family: "TEE", flat: "../shared/flats/tee-black.png" },
  ];

  // Closed issues: every piece sold. No photos of their own.
  // colors: from data/catalog.ts, for the swatches of closed issues (they have no photos).
  const PAST = [
    { issue: 4, slug: "reu", name: "RÊU", kind: "Áo khoác phao", family: "JACKET", material: "Dù chần lông vũ", fit: "OVERSIZE", price: 1500000, cut: 30, colors: ["moss"] },
    { issue: 4, slug: "tro", name: "TRO", kind: "Áo hoodie zip", family: "HOODIE", material: "Nỉ bông 400gsm", fit: "OVERSIZE", price: 950000, cut: 40, colors: ["grey", "black"] },
    { issue: 4, slug: "song", name: "SÓNG", kind: "Áo thun in lưng", family: "TEE", material: "Cotton 250gsm", fit: "OVERSIZE", price: 430000, cut: 50, colors: ["white"] },
    { issue: 4, slug: "vo", name: "VỎ", kind: "Áo gile", family: "VEST", material: "Dù 2 lớp", fit: "REGULAR", price: 820000, cut: 25, colors: ["black", "cream"] },
    { issue: 4, slug: "mua", name: "MƯA", kind: "Áo khoác dù dài", family: "JACKET", material: "Dù chống nước", fit: "OVERSIZE", price: 1420000, cut: 20, colors: ["black"] },
    { issue: 4, slug: "kho", name: "KHÔ", kind: "Quần short", family: "PANTS", material: "Kaki 280gsm", fit: "REGULAR", price: 520000, cut: 35, colors: ["cream", "moss"] },
    { issue: 3, slug: "dat", name: "ĐẤT", kind: "Quần jogger nỉ", family: "PANTS", material: "Nỉ da cá 320gsm", fit: "REGULAR", price: 680000, cut: 45, colors: ["brown", "black"] },
    { issue: 3, slug: "lua", name: "LỬA", kind: "Áo thun tay dài", family: "TEE", material: "Cotton 240gsm", fit: "REGULAR", price: 480000, cut: 55, colors: ["black", "white"] },
    { issue: 3, slug: "bao", name: "BÃO", kind: "Áo hoodie cổ lọ", family: "HOODIE", material: "Nỉ bông 380gsm", fit: "OVERSIZE", price: 910000, cut: 38, colors: ["grey"] },
    { issue: 3, slug: "men", name: "MEN", kind: "Áo thun nhuộm", family: "TEE", material: "Cotton 250gsm", fit: "OVERSIZE", price: 460000, cut: 42, colors: ["cream"] },
    { issue: 3, slug: "voi", name: "VÔI", kind: "Áo khoác gió", family: "JACKET", material: "Dù 1 lớp", fit: "REGULAR", price: 790000, cut: 28, colors: ["white", "grey"] },
  ];

  // The fixed line ("Cố định"): sold at any time, restocked size by size, no cut count.
  // Pictured by flat drawings on a light plate (shared/flats/<shape>-<colour>.png, 1040x1300, 4:5).
  const FIXED = [
    { slug: "ao-thun-tron", name: "ÁO THUN TRƠN", kind: "Áo thun", family: "TEE", material: "Cotton 220gsm", fit: "REGULAR", price: 400000, shape: "tee",
      colors: ["white", "black", "grey"],
      stock: { white: { S: 10, M: 14, L: 11, XL: 6 }, black: { S: 8, M: 12, L: 9, XL: 5 }, grey: { S: 6, M: 9, L: 7, XL: 4 } } },
    { slug: "ao-thun-tay-dai", name: "ÁO THUN TAY DÀI", kind: "Áo thun tay dài", family: "TEE", material: "Cotton 220gsm", fit: "REGULAR", price: 450000, shape: "longsleeve",
      colors: ["black", "white"],
      stock: { black: { S: 5, M: 8, L: 6, XL: 3 }, white: { S: 6, M: 7, L: 5, XL: 3 } } },
    { slug: "hoodie-tron", name: "HOODIE TRƠN", kind: "Áo hoodie", family: "HOODIE", material: "Nỉ bông 340gsm", fit: "OVERSIZE", price: 750000, shape: "hoodie",
      colors: ["grey", "black", "cream"],
      stock: { grey: { S: 5, M: 0, L: 4, XL: 2 }, black: { S: 4, M: 0, L: 6, XL: 3 }, cream: { S: 3, M: 0, L: 2, XL: 2 } } },
    { slug: "ao-khoac-du", name: "ÁO KHOÁC DÙ", kind: "Áo khoác dù", family: "JACKET", material: "Dù 1 lớp", fit: "OVERSIZE", price: 850000, shape: "jacket",
      colors: ["black", "navy"],
      stock: { black: { S: 3, M: 5, L: 4, XL: 3 }, navy: { S: 3, M: 4, L: 3, XL: 3 } } },
    { slug: "gile-phao", name: "GILE PHAO", kind: "Áo gile phao", family: "VEST", material: "Dù chần bông", fit: "REGULAR", price: 750000, shape: "vest",
      colors: ["black"],
      stock: { black: { S: 3, M: 5, L: 5, XL: 2 } } },
    { slug: "so-mi-oxford", name: "SƠ MI OXFORD", kind: "Áo sơ mi oxford", family: "SHIRT", material: "Cotton oxford", fit: "REGULAR", price: 590000, shape: "shirt",
      colors: ["white", "navy"],
      stock: { white: { S: 4, M: 7, L: 6, XL: 3 }, navy: { S: 3, M: 5, L: 4, XL: 3 } } },
    { slug: "quan-kaki", name: "QUẦN KAKI", kind: "Quần kaki", family: "PANTS", material: "Kaki 280gsm", fit: "REGULAR", price: 650000, shape: "trousers",
      colors: ["cream", "black"],
      stock: { cream: { S: 3, M: 5, L: 4, XL: 3 }, black: { S: 4, M: 7, L: 6, XL: 3 } } },
    { slug: "quan-short-ni", name: "QUẦN SHORT NỈ", kind: "Quần short nỉ", family: "PANTS", material: "Nỉ da cá 300gsm", fit: "REGULAR", price: 450000, shape: "shorts",
      colors: ["grey", "black"],
      stock: { grey: { S: 5, M: 6, L: 5, XL: 0 }, black: { S: 6, M: 9, L: 7, XL: 0 } } },
  ];

  // What the shop really enforces. Each direction may word these its own way; the facts stay.
  const FACTS = {
    cover: "Mười mẫu. Cắt một lần. Hết là hết.",
    rules: [
      { title: "Cắt đúng một lần", body: "Mỗi mẫu cắt từ khổ vải đã đặt. Không may thêm giữa số." },
      { title: "Có giờ mở, giờ đóng", body: "Mở theo lịch công bố trước. Đóng khi hết hàng hoặc hết giờ." },
      { title: "Số còn lại là số thật", body: "Còn bao nhiêu chiếc hiện ngay trên lưới." },
      { title: "Một dải size cho tất cả", body: "Không chia nam nữ. Chọn theo form và số đo." },
    ],
    teaser: "Giá và số lượng công bố lúc mở.",
  };

  // Delivery and payment, from lib/shipping.ts.
  const SHIPPING = {
    standard: { label: "Giao tiêu chuẩn", days: "2-4 ngày", fee: 30000 },
    express: { label: "Giao nhanh nội thành TP.HCM", days: "24 giờ", fee: 45000 },
    freeFrom: 1000000,
    codSurcharge: 15000,
    returnDays: 7,
    payments: ["Chuyển khoản", "Thẻ", "COD"],
  };

  // The footer's help links in the running app.
  const HELP = ["Câu hỏi thường gặp", "Đổi trả 7 ngày", "Tra cứu đơn", "Bảng số đo", "Liên hệ"];

  // ------------------------------------------------------------------ helpers

  const loadedAt = Date.now();
  const nowMs = () => Date.parse(NOW) + (Date.now() - loadedAt);

  function vnd(n) {
    return n.toLocaleString("vi-VN").replace(/,/g, ".") + "₫";
  }

  function leftIn(style, color) {
    const s = style.stock && style.stock[color];
    return s ? SIZES.reduce((a, k) => a + (s[k] || 0), 0) : 0;
  }

  function left(style) {
    return (style.colors || []).reduce((a, c) => a + leftIn(style, c), 0);
  }

  // [{ size: "S", n: 0 }, ...] for one colour.
  function sizes(style, color) {
    const s = (style.stock && style.stock[color]) || {};
    return SIZES.map((size) => ({ size, n: s[size] || 0 }));
  }

  // Sizes gone in every colour, e.g. ["S"] for SƯƠNG.
  function sizesGone(style) {
    return SIZES.filter((k) => (style.colors || []).every((c) => ((style.stock[c] || {})[k] || 0) === 0));
  }

  const isSoldOut = (style) => left(style) === 0;
  // The running app flags a style as running low at three pieces or fewer.
  const isLow = (style) => left(style) > 0 && left(style) <= 3;

  function photos(style, color) {
    return {
      pack: "../shared/shots/" + style.slug + "-" + color + ".webp",
      look: "../shared/shots/" + style.slug + "-" + color + "-look.webp",
    };
  }

  function flat(style, color) {
    return "../shared/flats/" + style.shape + "-" + color + ".png";
  }

  function issue(no) {
    return ISSUES.find((i) => i.no === no);
  }

  // { cut, left, sold } over an issue's styles.
  function totals(no) {
    const list = no === 5 ? ISSUE_05 : PAST.filter((p) => p.issue === no);
    const cut = list.reduce((a, s) => a + s.cut, 0);
    const l = no === 5 ? list.reduce((a, s) => a + left(s), 0) : 0;
    return { cut, left: l, sold: cut - l, styles: list.length };
  }

  // Time left until an ISO instant, measured on the mock clock: { d, h, m, s, ms }.
  function until(iso) {
    const ms = Math.max(0, Date.parse(iso) - nowMs());
    const s = Math.floor(ms / 1000);
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, ms };
  }

  const pad = (n) => String(n).padStart(2, "0");

  // "20:00 thứ Sáu 25/09"
  function when(iso) {
    const d = new Date(Date.parse(iso) + 7 * 3600 * 1000);
    const days = ["Chủ nhật", "thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy"];
    return pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + " " + days[d.getUTCDay()] + " " +
      pad(d.getUTCDate()) + "/" + pad(d.getUTCMonth() + 1);
  }

  // "25/09"
  function day(iso) {
    const d = new Date(Date.parse(iso) + 7 * 3600 * 1000);
    return pad(d.getUTCDate()) + "/" + pad(d.getUTCMonth() + 1);
  }

  // Simulated measurements in cm (the running app labels them "số đo mô phỏng").
  function sizeChart(fit) {
    const shift = fit === "OVERSIZE" ? 0 : -1;
    const heights = { S: "1m55-1m65", M: "1m63-1m72", L: "1m70-1m80", XL: "1m78-1m88" };
    return SIZES.map((size, i) => {
      const step = i + shift;
      return { size, chest: 54 + step * 3, length: 68 + step * 3, shoulder: 50 + step * 3, height: heights[size] };
    });
  }

  // Trousers, simulated too (user, 27/09): waist and hip around, length from the waistband, thigh across.
  // Shorts (QUẦN SHORT NỈ, KHÔ) have their own length. Heights as the tops, so one height picks both charts.
  const isShorts = (style) => !!style && (style.shape === "shorts" || /short/i.test(style.kind || ""));
  function pantsChart(style) {
    const heights = { S: "1m55-1m65", M: "1m63-1m72", L: "1m70-1m80", XL: "1m78-1m88" };
    const short = isShorts(style);
    return SIZES.map((size, i) => ({
      size,
      waist: 70 + i * 4,
      hip: (short ? 98 : 96) + i * 4,
      length: short ? 46 + i * 2 : 98 + i * 2,
      thigh: (short ? 32 : 30) + i * 1.5,
      height: heights[size],
    }));
  }

  function find(slug) {
    return ISSUE_05.find((s) => s.slug === slug) || FIXED.find((s) => s.slug === slug) || null;
  }

  // ---------------------------------------------------------------- round 2: the buying flow (27/09/2026)

  // Demo baskets, picked with ?cart= on any page; a page that reads the cart gets this basket instead of storage.
  //   full     over the free-delivery line: SƯƠNG rêu L, KHÓI đen M x2, ÁO THUN TRƠN trắng L
  //   small    under it: CÁT kem M (so the distance to free delivery shows)
  //   soldout  one line whose size has just gone (BỤI đen M, 0 left) next to one still available
  //   empty    nothing
  const DEMO_CARTS = {
    full: [
      { slug: "suong", color: "moss", size: "L", qty: 1 },
      { slug: "khoi", color: "black", size: "M", qty: 2 },
      { slug: "ao-thun-tron", color: "white", size: "L", qty: 1 },
    ],
    small: [{ slug: "cat", color: "cream", size: "M", qty: 1 }],
    soldout: [
      { slug: "bui", color: "black", size: "M", qty: 1 },
      { slug: "nguoi", color: "black", size: "M", qty: 1 },
    ],
    empty: [],
  };

  // A per-direction cart kept in localStorage. Storage can throw or be empty; the page must still work.
  // ?cart=<preset> overwrites it with a demo basket on every load that carries the parameter.
  function cart(scope) {
    const key = "hive-explore-cart-" + scope;
    const read = () => {
      try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { return []; }
    };
    const write = (items) => {
      try { localStorage.setItem(key, JSON.stringify(items)); } catch (e) { /* ignore */ }
    };
    const preset = QUERY.get("cart");
    if (preset && DEMO_CARTS[preset]) write(DEMO_CARTS[preset].map((i) => Object.assign({}, i)));
    const total = (items) => items.reduce((a, i) => a + i.qty, 0);
    return {
      items: read,
      count: () => total(read()),
      add(slug, color, size) {
        const items = read();
        const hit = items.find((i) => i.slug === slug && i.color === color && i.size === size);
        if (hit) hit.qty += 1; else items.push({ slug, color, size, qty: 1 });
        write(items);
        return total(items);
      },
      setQty(slug, color, size, qty) {
        const items = read().map((i) => (i.slug === slug && i.color === color && i.size === size ? Object.assign(i, { qty }) : i));
        write(items.filter((i) => i.qty > 0));
        return total(read());
      },
      remove(slug, color, size) {
        write(read().filter((i) => !(i.slug === slug && i.color === color && i.size === size)));
        return total(read());
      },
      clear: () => write([]),
    };
  }

  function stockOf(slug, color, size) {
    const st = find(slug);
    return st && st.stock && st.stock[color] ? st.stock[color][size] || 0 : 0;
  }

  // Everything a cart or checkout row prints about one line. "gone" is true when its size has run out since it was
  // added; "short" when fewer are left than the line asks for.
  function line(item) {
    const style = find(item.slug);
    const left = stockOf(item.slug, item.color, item.size);
    const fixed = !!(style && style.shape);
    return {
      style, fixed, qty: item.qty, size: item.size, color: item.color,
      colorLabel: (COLORS[item.color] || {}).label || item.color,
      price: style ? style.price : 0,
      total: style ? style.price * item.qty : 0,
      left, gone: left === 0, short: left > 0 && left < item.qty,
      image: style ? (fixed ? flat(style, item.color) : photos(style, item.color).pack) : "",
    };
  }

  // Delivery, payment and promotion rules as lib/shipping.ts, lib/orders.ts, data/promotions.ts and the running
  // checkout screen state them. Notes are the app's facts; each direction words them in its own voice.
  const EXPRESS_PROVINCE = "29"; // TP. Hồ Chí Minh
  const DELIVERY = [
    { method: "STANDARD", label: "Giao tiêu chuẩn", days: "2-4 ngày", lead: [2, 4], fee: 30000, freeFrom: 1000000 },
    { method: "EXPRESS", label: "Giao nhanh nội thành", days: "24 giờ", lead: [1, 1], fee: 45000, onlyIn: EXPRESS_PROVINCE,
      note: "Chỉ nội thành TP. Hồ Chí Minh, trong giờ hành chính" },
  ];
  const PAYMENTS = [
    { method: "BANK_TRANSFER", label: "Chuyển khoản", holdHours: 12,
      note: "Giữ hàng 12 giờ kể từ khi đặt. Nội dung chuyển khoản hiện ở màn xác nhận." },
    { method: "COD", label: "Thanh toán khi nhận (COD)", fee: 15000, note: "Kiểm hàng trước khi trả." },
    { method: "CARD", label: "Thẻ (nội địa, Visa)", holdHours: 12, byTransfer: true,
      note: "Cổng thẻ đang chuẩn bị. Đơn trả bằng chuyển khoản, giữ hàng 12 giờ." },
  ];
  const PROMOS = [
    { code: "DOT05", kind: "PERCENT", percent: 10, max: 150000, min: 500000, until: "2026-09-25T20:00:00+07:00" },
    { code: "CHAOBAN", kind: "AMOUNT", amount: 50000, min: 400000, until: "2026-09-25T20:00:00+07:00" },
    { code: "FREESHIP", kind: "FREE_SHIPPING", min: 800000, until: "2026-09-25T20:00:00+07:00" },
    { code: "VIP20", kind: "PERCENT", percent: 20, max: 300000, min: 2000000, until: "2026-09-25T20:00:00+07:00", exhausted: true },
    { code: "DOT04", kind: "AMOUNT", amount: 100000, min: 600000, until: "2026-06-19T20:00:00+07:00" },
  ];

  function deliveryAvailable(method, province) {
    const d = DELIVERY.find((x) => x.method === method);
    return !!d && (!d.onlyIn || d.onlyIn === province);
  }

  function shippingFee(method, subtotal) {
    const d = DELIVERY.find((x) => x.method === method) || DELIVERY[0];
    return d.freeFrom && subtotal >= d.freeFrom ? 0 : d.fee;
  }

  // { ok, code, discount, freeShipping } or { ok: false, error } for a code typed at checkout.
  function promo(code, subtotal) {
    const p = PROMOS.find((x) => x.code === String(code || "").trim().toUpperCase());
    if (!p) return { ok: false, error: "Mã không tồn tại" };
    if (nowMs() >= Date.parse(p.until)) return { ok: false, error: "Mã đã hết hạn" };
    if (p.exhausted) return { ok: false, error: "Mã đã hết lượt dùng" };
    if (subtotal < p.min) return { ok: false, error: "Đơn từ " + vnd(p.min) + " mới dùng được mã này" };
    if (p.kind === "PERCENT") return { ok: true, code: p.code, discount: Math.min(p.max, Math.round((subtotal * p.percent) / 100)) };
    if (p.kind === "AMOUNT") return { ok: true, code: p.code, discount: p.amount };
    return { ok: true, code: p.code, discount: 0, freeShipping: true };
  }

  // { subtotal, shipping, cod, discount, total, promo, toFree } for a basket.
  function checkout(items, opts) {
    const o = opts || {};
    const subtotal = items.reduce((a, i) => a + line(i).total, 0);
    const pr = o.promo ? promo(o.promo, subtotal) : null;
    const shipping = shippingFee(o.delivery || "STANDARD", subtotal);
    let discount = pr && pr.ok ? pr.discount : 0;
    if (pr && pr.ok && pr.freeShipping) discount = shipping;
    const cod = o.payment === "COD" ? 15000 : 0;
    return {
      subtotal, shipping, cod, discount,
      total: Math.max(0, subtotal + shipping + cod - discount),
      promo: pr,
      toFree: Math.max(0, 1000000 - subtotal),
    };
  }

  // "23/09 - 25/09" (or "22/09" for a one-day service), counted from an order placed now.
  function deliveryWindow(method) {
    const d = DELIVERY.find((x) => x.method === method) || DELIVERY[0];
    const at = (n) => day(new Date(nowMs() + n * 86400000).toISOString());
    return d.lead[0] === d.lead[1] ? at(d.lead[0]) : at(d.lead[0]) + " - " + at(d.lead[1]);
  }

  // The order a mock checkout places. The running app numbers orders DH-1494 and up; the bank memo drops the dash.
  const ORDER = { code: "DH-1507", memo: "DH1507" };
  function holdUntil(hours) {
    return new Date(nowMs() + (hours || 12) * 3600000).toISOString();
  }

  // Accent-insensitive search over names, types, materials and families: Issue 05 and the fixed line.
  const fold = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
  function search(q) {
    const words = fold(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return ISSUE_05.concat(FIXED).filter((st) => {
      const hay = fold([st.name, st.kind, st.material, FAMILIES[st.family], FITS[st.fit], st.print].join(" "));
      return words.every((w) => hay.includes(w));
    });
  }
  const SUGGEST = ["hoodie", "áo khoác", "quần", "oversize", "cotton"];

  // Keeps ?state= on an internal link, so a shopper moving between pages stays in the same moment.
  function keep(href) {
    if (MODE === "open") return href;
    return href + (href.indexOf("?") >= 0 ? "&" : "?") + "state=" + MODE;
  }

  // The issue the home page leads with, as lib/drop.ts featuredDrop picks it.
  function featured() {
    const byNo = ISSUES.slice().sort((a, b) => a.no - b.no);
    const i = byNo.find((x) => x.state === "OPEN") || byNo.find((x) => x.state === "UPCOMING") || byNo[byNo.length - 1];
    return { issue: i, state: i.state, previous: byNo[byNo.indexOf(i) - 1] || null };
  }

  // ---------------------------------------------------------------- round 3: the account (27/09/2026)

  // Signed in by default; ?auth=out shows every account page as a signed-out visitor sees it.
  const AUTH = QUERY.get("auth") === "out" ? "out" : "in";

  // The demo shopper. The same person the Feed checkout fills in (?fill=1), so an order placed there is theirs.
  const ACCOUNT = {
    name: "Trần Minh Khoa",
    phone: "0938 571 204",
    email: "minhkhoa@email.com",
    joinedAt: "2026-03-08T21:14:00+07:00",
    // "Size của tôi": optional; a product page may start on these sizes when they are in stock.
    sizes: { top: "L", bottom: "M" },
  };

  // Two-tier addresses (shared/regions.js codes): 70101063 is Phường Sài Gòn, 70125111 Phường Gò Vấp, both in 29.
  const ADDRESSES = [
    { id: "a1", label: "Nhà", recipient: "Trần Minh Khoa", phone: "0938 571 204", street: "12 Nguyễn Huệ",
      province: "29", ward: "70101063", isDefault: true },
    { id: "a2", label: "Công ty", recipient: "Trần Minh Khoa", phone: "0938 571 204", street: "155/3 Lê Văn Thọ",
      province: "29", ward: "70125111", isDefault: false },
  ];

  // Any style by slug, closed issues included (find() only knows what can still be bought).
  function findAny(slug) {
    return find(slug) || PAST.find((s) => s.slug === slug) || ISSUE_06.find((s) => s.slug === slug) || null;
  }

  // The shopper's orders. `issue` is the issue an order was placed in, null for a fixed-line-only order; a line's own
  // group comes from lineGroup(), so DH-1507 (Issue 05 plus ÁO THUN TRƠN) is both "Số 05" and "Cố định".
  // Each one is a timeline; what it shows is its last event at or before the mock's clock,
  // so the same order reads "chờ chuyển khoản" in the open moment and "đã giao" a week later (?state=closed).
  // States follow data/types.ts OrderStatus: AWAITING_TRANSFER, RECEIVED (COD, before the call), PAID, SHIPPING,
  // DELIVERED, CANCELLED. A transfer not paid within 12 hours cancels itself ("Quá hạn chuyển khoản").
  // Lines carry the price paid at the time, not today's price.
  const ORDERS = [
    { code: "DH-1507", issue: 5, placedAt: "2026-09-21T19:02:00+07:00", payment: "BANK_TRANSFER", delivery: "STANDARD",
      address: "a1", promo: null,
      lines: [
        { slug: "suong", color: "moss", size: "L", qty: 1, unitPrice: 1450000 },
        { slug: "khoi", color: "black", size: "M", qty: 2, unitPrice: 390000 },
        { slug: "ao-thun-tron", color: "white", size: "L", qty: 1, unitPrice: 400000 },
      ],
      events: [
        { state: "PAID", at: "2026-09-21T20:14:00+07:00" },
        { state: "SHIPPING", at: "2026-09-23T08:30:00+07:00", tracking: "VD-8850-2231" },
        { state: "DELIVERED", at: "2026-09-25T15:20:00+07:00" },
      ] },
    { code: "DH-1502", issue: 5, placedAt: "2026-09-19T19:50:00+07:00", payment: "BANK_TRANSFER", delivery: "STANDARD",
      address: "a2", promo: "DOT05",
      lines: [
        { slug: "than", color: "black", size: "L", qty: 1, unitPrice: 1350000 },
        { slug: "cat", color: "cream", size: "M", qty: 1, unitPrice: 420000 },
      ],
      events: [
        { state: "PAID", at: "2026-09-19T20:05:00+07:00" },
        { state: "SHIPPING", at: "2026-09-22T09:10:00+07:00", tracking: "VD-8849-1120" },
        { state: "DELIVERED", at: "2026-09-24T11:05:00+07:00" },
      ] },
    { code: "DH-1499", issue: 5, placedAt: "2026-09-14T10:20:00+07:00", payment: "COD", delivery: "STANDARD",
      address: "a1", promo: "DOT05",
      lines: [
        { slug: "gio", color: "white", size: "M", qty: 1, unitPrice: 750000 },
        { slug: "khoi", color: "black", size: "L", qty: 1, unitPrice: 390000 },
      ],
      events: [
        { state: "RECEIVED", at: "2026-09-14T11:05:00+07:00" },
        { state: "SHIPPING", at: "2026-09-18T07:15:00+07:00", tracking: "VD-8842-1907" },
        { state: "DELIVERED", at: "2026-09-22T14:40:00+07:00" },
      ] },
    { code: "DH-1496", issue: 5, placedAt: "2026-09-11T21:40:00+07:00", payment: "BANK_TRANSFER", delivery: "STANDARD",
      address: "a1", promo: "DOT05",
      lines: [{ slug: "nguoi", color: "black", size: "M", qty: 1, unitPrice: 1290000 }],
      events: [
        { state: "PAID", at: "2026-09-11T21:52:00+07:00" },
        { state: "SHIPPING", at: "2026-09-13T08:20:00+07:00", tracking: "VD-8831-0413" },
        { state: "DELIVERED", at: "2026-09-16T10:02:00+07:00" },
      ] },
    { code: "DH-1402", issue: null, placedAt: "2026-07-20T21:10:00+07:00", payment: "COD", delivery: "STANDARD",
      address: "a1", promo: null,
      lines: [
        { slug: "quan-kaki", color: "cream", size: "M", qty: 1, unitPrice: 650000 },
        { slug: "ao-thun-tay-dai", color: "black", size: "L", qty: 1, unitPrice: 450000 },
      ],
      events: [
        { state: "RECEIVED", at: "2026-07-21T09:30:00+07:00" },
        { state: "SHIPPING", at: "2026-07-22T08:00:00+07:00", tracking: "VD-8012-0722" },
        { state: "DELIVERED", at: "2026-07-24T16:45:00+07:00" },
      ] },
    { code: "DH-1310", issue: 4, placedAt: "2026-06-06T20:15:00+07:00", payment: "BANK_TRANSFER", delivery: "STANDARD",
      address: "a1", promo: "DOT04",
      lines: [{ slug: "reu", color: "moss", size: "M", qty: 1, unitPrice: 1500000 }],
      events: [] },
    { code: "DH-1210", issue: 3, placedAt: "2026-03-09T20:30:00+07:00", payment: "BANK_TRANSFER", delivery: "STANDARD",
      address: "a1", promo: null,
      lines: [
        { slug: "lua", color: "black", size: "M", qty: 1, unitPrice: 480000 },
        { slug: "bao", color: "grey", size: "L", qty: 1, unitPrice: 910000 },
      ],
      events: [
        { state: "PAID", at: "2026-03-09T20:41:00+07:00" },
        { state: "SHIPPING", at: "2026-03-11T09:00:00+07:00", tracking: "VD-7710-0311" },
        { state: "DELIVERED", at: "2026-03-14T10:05:00+07:00" },
      ] },
  ];

  const ORDER_STATES = {
    AWAITING_TRANSFER: "Chờ chuyển khoản",
    RECEIVED: "Chờ xác nhận",
    PAID: "Đã thanh toán",
    SHIPPING: "Đang giao",
    DELIVERED: "Đã giao",
    CANCELLED: "Đã huỷ",
  };

  // Card orders pay by transfer while the card gateway is not connected (user, 27/09).
  const paysByTransfer = (o) => o.payment === "BANK_TRANSFER" || o.payment === "CARD";

  // { state, at, label, ... } for an order at the mock's clock, or null when it was placed after it.
  function orderStatus(o) {
    const t = nowMs();
    const placed = Date.parse(o.placedAt);
    if (t < placed) return null;
    const past = o.events.filter((e) => Date.parse(e.at) <= t);
    const paid = o.events.find((e) => e.state === "PAID" || e.state === "RECEIVED");
    const due = new Date(placed + 12 * 3600000).toISOString();
    if (paysByTransfer(o) && (!paid || Date.parse(paid.at) > Date.parse(due)) && t >= Date.parse(due)) {
      return { state: "CANCELLED", at: due, reason: "Quá hạn chuyển khoản", label: ORDER_STATES.CANCELLED };
    }
    const last = past[past.length - 1];
    if (!last) {
      return paysByTransfer(o)
        ? { state: "AWAITING_TRANSFER", at: o.placedAt, dueAt: due, label: ORDER_STATES.AWAITING_TRANSFER }
        : { state: "RECEIVED", at: o.placedAt, label: ORDER_STATES.RECEIVED };
    }
    const shipped = past.find((e) => e.state === "SHIPPING");
    return Object.assign({}, last, { label: ORDER_STATES[last.state], tracking: shipped && shipped.tracking });
  }

  // The events an order has reached, oldest first, starting with the order itself; for a detail page's timeline.
  function orderTimeline(o) {
    const st = orderStatus(o);
    if (!st) return [];
    const t = nowMs();
    const steps = [{ state: "PLACED", at: o.placedAt }].concat(o.events.filter((e) => Date.parse(e.at) <= t));
    if (st.state === "CANCELLED") return [steps[0], { state: "CANCELLED", at: st.at, reason: st.reason }];
    return steps;
  }

  // What a closed or past promotion took off when the order was placed (promo() judges codes typed today).
  function promoOff(code, subtotal, shipping) {
    const p = PROMOS.find((x) => x.code === code);
    if (!p || subtotal < p.min) return 0;
    if (p.kind === "PERCENT") return Math.min(p.max, Math.round((subtotal * p.percent) / 100));
    if (p.kind === "AMOUNT") return p.amount;
    return shipping;
  }

  // { subtotal, shipping, cod, discount, total, units } of an order as it was placed.
  function orderTotals(o) {
    const subtotal = o.lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
    const shipping = shippingFee(o.delivery, subtotal);
    const cod = o.payment === "COD" ? 15000 : 0;
    const discount = o.promo ? promoOff(o.promo, subtotal, shipping) : 0;
    return {
      subtotal, shipping, cod, discount, total: Math.max(0, subtotal + shipping + cod - discount),
      units: o.lines.reduce((a, l) => a + l.qty, 0),
    };
  }

  // One order line with what a row prints; closed-issue styles have no photo (image is "").
  function orderLine(l) {
    const style = findAny(l.slug);
    const fixed = !!(style && style.shape);
    const i05 = !!ISSUE_05.find((s) => s.slug === l.slug);
    return {
      style, fixed, qty: l.qty, size: l.size, color: l.color,
      colorLabel: (COLORS[l.color] || {}).label || l.color,
      unitPrice: l.unitPrice, total: l.unitPrice * l.qty,
      image: fixed ? flat(style, l.color) : i05 ? photos(style, l.color).pack : "",
    };
  }

  // The orders that exist at the mock's clock, newest first. ?orders=none shows the empty list.
  function orders() {
    if (QUERY.get("orders") === "none") return [];
    return ORDERS.filter((o) => orderStatus(o)).sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
  }
  // The group a style belongs to: its issue number, or "fixed" for the fixed line (Cố định).
  function lineGroup(slug) {
    if (FIXED.find((s) => s.slug === slug)) return "fixed";
    if (ISSUE_05.find((s) => s.slug === slug)) return 5;
    if (ISSUE_06.find((s) => s.slug === slug)) return 6;
    const past = PAST.find((s) => s.slug === slug);
    return past ? past.issue : null;
  }
  // Every group an order touches, issues first (newest first), then "fixed": [5, "fixed"] for DH-1507.
  function orderGroups(o) {
    const g = Array.from(new Set(o.lines.map((l) => lineGroup(l.slug)).filter((x) => x !== null)));
    return g.filter((x) => x !== "fixed").sort((a, b) => b - a).concat(g.includes("fixed") ? ["fixed"] : []);
  }

  // The orders list's three filters (user, 27/09): Đang xử lý (waiting for money, a call or the courier), Đã giao,
  // Đã huỷ.
  const ORDER_PHASES = { active: "Đang xử lý", delivered: "Đã giao", cancelled: "Đã huỷ" };
  function orderPhase(o) {
    const st = orderStatus(o);
    if (!st) return null;
    return st.state === "DELIVERED" ? "delivered" : st.state === "CANCELLED" ? "cancelled" : "active";
  }

  // What a return pays back (user, 27/09: exactly what the shopper paid for those pieces). The order's code comes
  // off each line in proportion to its price, to the đồng, the last line taking the rounding so the shares add up to
  // the discount. picks: [{ i: line index, qty }]. Delivery and the COD fee come back only when the whole order goes
  // back for a reason that is the shop's fault (user, 27/09: SHOP_FAULT); a partial return keeps them, since the rest
  // of the order used that delivery. Returns { amount, goods, fees, full, lines: [{ i, qty, paid, share }] }.
  const SHOP_FAULT = ["Khác với ảnh", "Lỗi may hoặc in", "Giao nhầm món"];
  function refundOf(o, picks, reason) {
    const t = orderTotals(o);
    const p = o.promo ? PROMOS.find((x) => x.code === o.promo) : null;
    const off = p && p.kind !== "FREE_SHIPPING" ? t.discount : 0;
    const shares = [];
    let given = 0;
    o.lines.forEach((l, i) => {
      const last = i === o.lines.length - 1;
      const share = last ? off - given : Math.round((off * l.unitPrice * l.qty) / t.subtotal);
      given += share;
      shares.push(share);
    });
    const lines = (picks || []).map((pk) => {
      const l = o.lines[pk.i];
      const qty = Math.min(pk.qty || l.qty, l.qty);
      const share = Math.round((shares[pk.i] * qty) / l.qty);
      return { i: pk.i, qty, paid: l.unitPrice * qty - share, share };
    });
    const goods = lines.reduce((a, x) => a + x.paid, 0);
    const full = o.lines.every((l, i) => lines.filter((x) => x.i === i).reduce((a, x) => a + x.qty, 0) >= l.qty);
    const fees = full && SHOP_FAULT.includes(reason) ? t.total - (t.subtotal - off) : 0;
    return { amount: goods + fees, goods, fees, full, lines };
  }

  const findOrder = (code) => ORDERS.find((o) => o.code === String(code || "").trim().toUpperCase()) || null;

  // Returns and exchanges: within 7 days of delivery (SHIPPING.returnDays), unworn, tags on (user, 27/09: kept).
  // An exchange takes a size still in stock, closed issue or not; past the 7 days, or with no size left, there is none.
  // The shop pays the delivery back, refunds by transfer to the shopper's bank account and answers within 1 to 3 days
  // by notification and email (user, 27/09).
  const RETURN_REASONS = ["Không vừa size", "Khác với ảnh", "Lỗi may hoặc in", "Giao nhầm món", "Đổi ý"];
  function returnUntil(o) {
    const st = orderStatus(o);
    if (!st || st.state !== "DELIVERED") return null;
    return new Date(Date.parse(st.at) + SHIPPING.returnDays * 86400000).toISOString();
  }
  const canReturn = (o) => { const u = returnUntil(o); return !!u && nowMs() < Date.parse(u); };
  const RETURNS = { shipBackBy: "shop", refundTo: "bank", answerDays: [1, 3], answerBy: ["inbox", "email"] };

  // Liên hệ (user, 27/09): a message lands in the back office's Tin nhắn, tied to its order when a code is given; the
  // shop answers within 24 hours to the email or phone the shopper left.
  const CONTACT = { lands: "admin", answerHours: 24 };

  // The account's inbox. An item exists once the mock's clock has passed it; unread while less than two days old.
  //   kind: order | drop | reminder | wishlist | promo
  const NOTIFICATIONS = [
    { kind: "order", at: "2026-09-21T19:02:00+07:00", title: "DH-1507 chờ chuyển khoản", body: "Hạn 07:02 thứ Ba 22/09", href: "order.html?id=DH-1507" },
    { kind: "order", at: "2026-09-21T20:14:00+07:00", title: "Đã nhận tiền DH-1507", body: "", href: "order.html?id=DH-1507" },
    { kind: "order", at: "2026-09-19T20:05:00+07:00", title: "Đã nhận tiền DH-1502", body: "", href: "order.html?id=DH-1502" },
    { kind: "wishlist", at: "2026-09-20T09:30:00+07:00", title: "BỤI đen còn 1 chiếc", body: "Size L", href: "product.html?m=bui&c=black" },
    { kind: "order", at: "2026-09-18T07:15:00+07:00", title: "DH-1499 đang giao", body: "Mã vận đơn VD-8842-1907", href: "order.html?id=DH-1499" },
    { kind: "order", at: "2026-09-16T10:02:00+07:00", title: "DH-1496 đã giao", body: "Đổi trả tới 23/09", href: "order.html?id=DH-1496" },
    { kind: "drop", at: "2026-09-11T20:00:00+07:00", title: "Số 05 đã mở", body: "10 mẫu, 181 chiếc", href: "products.html" },
    { kind: "order", at: "2026-09-22T14:40:00+07:00", title: "DH-1499 đã giao", body: "Đổi trả tới 29/09", href: "order.html?id=DH-1499" },
    { kind: "drop", at: "2026-09-23T20:00:00+07:00", title: "Số 05 còn 2 ngày", body: "Đóng 20:00 thứ Sáu 25/09", href: "products.html" },
    { kind: "drop", at: "2026-09-25T20:00:00+07:00", title: "Số 05 đã đóng", body: "108/181 chiếc đã bán", href: "archive.html" },
    { kind: "promo", at: "2026-09-24T09:00:00+07:00", title: "Mã DOT05 sắp hết hạn", body: "20:00 thứ Sáu 25/09", href: "products.html" },
    { kind: "drop", at: "2026-09-18T12:00:00+07:00", title: "Số 06 công bố 4 mẫu", body: "Mở 20:00 thứ Sáu 02/10", href: "home.html#sap-mo", issue: 6 },
    { kind: "reminder", at: "2026-09-30T19:00:00+07:00", title: "Số 06 mở sau 2 ngày", body: "20:00 thứ Sáu 02/10", href: "home.html#sap-mo", issue: 6 },
  ];
  function notifications() {
    if (QUERY.get("inbox") === "empty") return [];
    const t = nowMs();
    return NOTIFICATIONS
      .filter((n) => Date.parse(n.at) <= t && (!n.issue || ISSUES.find((i) => i.no === n.issue)))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .map((n) => Object.assign({}, n, { unread: t - Date.parse(n.at) < 2 * 86400000 }));
  }

  // Saved styles (Yêu thích): one sold out (MUỐI xám), one fixed-line piece. ?favs=none shows the empty list.
  const FAVORITES = [
    { slug: "bui", color: "black" },
    { slug: "than", color: "navy" },
    { slug: "muoi", color: "grey" },
    { slug: "hoodie-tron", color: "grey" },
  ];
  // Reminders the shopper turned on (Nhắc tôi): Issue 06, by app notification and email.
  const REMINDERS = [{ issue: 6, channels: ["push", "email"], setAt: "2026-09-18T12:00:00+07:00" }];

  // Order lookup without an account (tra cứu đơn): the code and the phone number the order was placed with.
  function lookup(code, phone) {
    const o = findOrder(code);
    const digits = (s) => String(s || "").replace(/\D/g, "");
    if (!o || !orderStatus(o)) return { ok: false, error: "Không có đơn nào mang mã này" };
    if (digits(phone) !== digits(ACCOUNT.phone)) return { ok: false, error: "Số điện thoại không khớp với đơn" };
    return { ok: true, order: o };
  }

  window.HIVE = {
    NOW, MODE, GAP, LEAD_DAYS: 7, ISSUES, COLORS, FAMILIES, FITS, SIZES,
    ISSUE_05, ISSUE_06, PAST, FIXED, FACTS, SHIPPING, HELP,
    vnd, left, leftIn, sizes, sizesGone, isSoldOut, isLow, photos, flat, issue, totals,
    until, pad, when, day, sizeChart, find, cart, nowMs,
    DEMO_CARTS, stockOf, line, DELIVERY, PAYMENTS, PROMOS, EXPRESS_PROVINCE, deliveryAvailable, shippingFee, promo,
    checkout, deliveryWindow, ORDER, holdUntil, search, SUGGEST, keep, featured, fold,
    AUTH, ACCOUNT, ADDRESSES, findAny, ORDERS, ORDER_STATES, orderStatus, orderTimeline, orderTotals, orderLine, orders,
    findOrder, RETURN_REASONS, returnUntil, canReturn, notifications, FAVORITES, REMINDERS, lookup,
    paysByTransfer, lineGroup, orderGroups, ORDER_PHASES, orderPhase, refundOf, SHOP_FAULT, RETURNS, CONTACT, isShorts,
    pantsChart,
  };
})();
