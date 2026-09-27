/*
 * The Feed board: prototype/explore/index.html. Feed is the direction the user kept on 27/09/2026 (the other
 * directions were deleted at their request); the board shows its screens row by row, in the order a shopper meets them.
 *
 *   node prototype/explore/tools/board.cjs [--no-shots] [--group mua,tai-khoan,quanh]
 *
 * A screen appears once its page exists. Stills go to _shots/feed/bd-<spec>-<width>.jpg; the board reads
 * feed/direction.json (and feed/direction-b.json, the second builder's renames and questions, until they are merged).
 */
const fs = require("fs");
const path = require("path");
const { withBrowser } = require("./browser.cjs");
const { still, slug } = require("./capture.cjs");

const ROOT = path.resolve(__dirname, "..");
const DIR = "feed";
const args = process.argv.slice(2);
const shots = !args.includes("--no-shots");
const onlyGroups = (() => { const i = args.indexOf("--group"); return i >= 0 ? args[i + 1].split(",") : null; })();

const GROUPS = [
  {
    id: "mua", title: "Luồng mua",
    phone: [
      { spec: "home", label: "Trang chủ, đang mở" },
      { spec: "home?state=upcoming", label: "Trang chủ, sắp mở" },
      { spec: "home?state=closed", label: "Trang chủ, 3 ngày sau khi đóng" },
      { spec: "home?state=quiet", label: "Trang chủ, 10 ngày sau khi đóng" },
      { spec: "search?q=hoodie", label: "Tìm kiếm" },
      { spec: "products", label: "Danh sách" },
      { spec: "product", label: "Trang sản phẩm" },
      { spec: "cart?cart=full", label: "Giỏ" },
      { spec: "cart?cart=soldout", label: "Giỏ, món vừa hết" },
      { spec: "checkout?cart=full&fill=1", label: "Thanh toán" },
      { spec: "checkout?cart=full&errors=1", label: "Thanh toán, báo lỗi" },
      { spec: "order-confirmed", label: "Đặt hàng xong, chuyển khoản" },
      { spec: "order-confirmed?pay=cod", label: "Đặt hàng xong, COD" },
      { spec: "order-confirmed?pay=card", label: "Đặt hàng xong, thẻ" },
    ],
    desk: [
      { spec: "home", label: "Trang chủ" },
      { spec: "product", label: "Trang sản phẩm" },
      { spec: "product?frames=8", label: "Trang sản phẩm, 8 ảnh" },
      { spec: "checkout?cart=full&fill=1", label: "Thanh toán" },
      { spec: "order-confirmed", label: "Đặt hàng xong" },
    ],
  },
  {
    id: "tai-khoan", title: "Tài khoản và đơn hàng",
    phone: [
      { spec: "account", label: "Tôi" },
      { spec: "account?auth=out", label: "Tôi, chưa đăng nhập" },
      { spec: "sign-in", label: "Đăng nhập" },
      { spec: "orders", label: "Đơn hàng" },
      { spec: "orders?group=fixed", label: "Đơn hàng, lọc Cố định" },
      { spec: "orders?phase=active&state=closed", label: "Đơn hàng, lọc không có đơn" },
      { spec: "order?id=DH-1507", label: "Đơn chờ chuyển khoản" },
      { spec: "order?id=DH-1499", label: "Đơn đang giao" },
      { spec: "order?id=DH-1496", label: "Đơn đã giao" },
      { spec: "order?id=DH-1310", label: "Đơn đã huỷ" },
      { spec: "return?id=DH-1496", label: "Đổi trả" },
      { spec: "return?id=DH-1499&state=closed&step=review", label: "Đổi trả, xem lại" },
      { spec: "addresses", label: "Địa chỉ" },
      { spec: "profile", label: "Hồ sơ" },
    ],
    desk: [
      { spec: "account", label: "Tôi" },
      { spec: "account?auth=out", label: "Tôi, chưa đăng nhập" },
      { spec: "order?id=DH-1499", label: "Đơn đang giao" },
      { spec: "orders", label: "Đơn hàng" },
    ],
  },
  {
    id: "quanh", title: "Quanh tài khoản",
    phone: [
      { spec: "favorites", label: "Yêu thích" },
      { spec: "notifications?state=closed", label: "Thông báo" },
      { spec: "track?code=DH-1499&phone=0938571204", label: "Tra cứu đơn" },
      { spec: "archive?state=closed", label: "Các Số đã đóng" },
      { spec: "issue?no=4", label: "Số 04" },
      { spec: "help", label: "Hỏi đáp" },
      { spec: "size-guide", label: "Bảng size" },
      { spec: "contact", label: "Liên hệ" },
      { spec: "contact?sent=1", label: "Liên hệ, đã gửi" },
      { spec: "404", label: "Không tìm thấy" },
    ],
    desk: [
      { spec: "favorites", label: "Yêu thích" },
      { spec: "favorites?auth=out", label: "Yêu thích, chưa đăng nhập" },
      { spec: "track", label: "Tra cứu đơn" },
      { spec: "track?code=DH-1499&phone=0938571204", label: "Tra cứu đơn, đã tra" },
      { spec: "help", label: "Hỏi đáp" },
      { spec: "size-guide", label: "Bảng size" },
      { spec: "archive?state=closed", label: "Các Số đã đóng" },
    ],
  },
];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const readJson = (file) => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, DIR, file), "utf8")); } catch (e) { return null; }
};
const exists = (spec) => fs.existsSync(path.join(ROOT, DIR, spec.split("?")[0] + ".html"));
const shotFile = (spec, w) => `_shots/${DIR}/bd-${slug(spec)}-${w}.jpg`;

function jobsFor(g) {
  return [
    ...g.phone.filter((p) => exists(p.spec)).map((p) => ({ ...p, width: 390 })),
    ...g.desk.filter((p) => exists(p.spec)).map((p) => ({ ...p, width: 1280 })),
  ];
}

function frame(j) {
  const [name, query] = j.spec.split("?");
  const live = `${DIR}/${name}.html${query ? "?" + query : ""}`;
  const cls = j.width < 600 ? "phone" : "desk";
  return `<figure class="${cls}"><figcaption>${esc(j.label)}<a href="${esc(live)}" target="_blank" rel="noopener">Mở bản sống</a></figcaption>
    <div class="screen"><img src="${shotFile(j.spec, j.width)}" alt="${esc(j.label)}" loading="lazy"></div></figure>`;
}

function group(g) {
  const jobs = jobsFor(g);
  if (!jobs.length) return `<section class="grp" id="${g.id}"><h2>${esc(g.title)}</h2><p class="muted">Đang dựng.</p></section>`;
  const phones = jobs.filter((j) => j.width < 600).map(frame).join("");
  const desks = jobs.filter((j) => j.width >= 600).map(frame).join("");
  return `
  <section class="grp" id="${g.id}">
    <h2>${esc(g.title)}</h2>
    <div class="row">${phones}</div>
    ${desks ? `<h3>Trên máy tính</h3><div class="row desk-row">${desks}</div>` : ""}
  </section>`;
}

function page() {
  const dir = readJson("direction.json") || {};
  const more = readJson("direction-b.json") || {};
  const words = [...(dir.words || []), ...(more.words || [])];
  const open = [...(dir.open || []), ...(more.open || [])];
  const pal = (dir.palette || []).slice(0, 12).map((p) => `<li><i style="background:${esc(p.hex)}"></i><span>${esc(p.role)}</span></li>`).join("");
  const nav = GROUPS.map((g) => `<a href="#${g.id}">${esc(g.title)}</a>`).join("") + `<a href="#chot">Cần chốt</a>`;
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HIVE · Feed</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%23222'/%3E%3C/svg%3E">
<style>
  :root { --bg:#ececea; --card:#fafaf9; --ink:#1b1b1b; --ink2:#5c5c58; --line:#d3d3cf; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 "Segoe UI", system-ui, sans-serif; }
  a { color: inherit; }
  header.top { position: sticky; top: 0; z-index: 5; background: var(--bg); border-bottom: 1px solid var(--line); }
  .bar { max-width: 1600px; margin: 0 auto; padding: 10px 24px; display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
  .bar nav { display: flex; gap: 4px; flex-wrap: wrap; }
  .bar nav a { text-decoration: none; padding: 8px 12px; border-radius: 6px; font-size: 14px; }
  .bar nav a:hover { background: #dfdfdc; }
  main { max-width: 1600px; margin: 0 auto; padding: 32px 24px 96px; }
  h1 { font-size: 30px; line-height: 1.2; margin: 0 0 8px; }
  .lead { max-width: 76ch; color: var(--ink2); margin: 0 0 12px; }
  ul.pal { list-style: none; display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 0; margin: 0 0 8px; }
  .pal li { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink2); }
  .pal i { width: 18px; height: 18px; border-radius: 4px; border: 1px solid rgba(0,0,0,.18); }
  .grp { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--line); scroll-margin-top: 64px; }
  h2 { font-size: 24px; margin: 0 0 14px; }
  h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--ink2); margin: 24px 0 10px; }
  .row { display: grid; grid-auto-flow: column; grid-auto-columns: 300px; gap: 14px; overflow-x: auto; padding-bottom: 10px; }
  .desk-row { grid-auto-columns: 640px; }
  figure { margin: 0; }
  figcaption { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; color: var(--ink2); padding: 0 2px 8px; }
  figcaption a { font-weight: 600; color: var(--ink); white-space: nowrap; }
  .screen { background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: auto; }
  .phone .screen { height: 620px; }
  .desk .screen { height: 460px; }
  .screen img { display: block; width: 100%; height: auto; }
  .chot { margin-top: 48px; padding: 24px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; scroll-margin-top: 64px; }
  .chot-in { display: grid; grid-template-columns: 1fr 1.4fr; gap: 28px; }
  .chot h2 { margin-bottom: 12px; }
  table.words { border-collapse: collapse; font-size: 14px; width: 100%; }
  .words th { text-align: left; font-weight: 600; color: var(--ink2); font-size: 12px; padding: 4px 8px 4px 0; }
  .words td { padding: 5px 8px 5px 0; border-top: 1px solid var(--line); }
  ul.open { list-style: none; margin: 0; padding: 0; }
  .open li { font-size: 14px; padding: 4px 0 4px 14px; position: relative; }
  .open li::before { content: ""; position: absolute; left: 0; top: 13px; width: 6px; height: 1px; background: var(--ink2); }
  .muted { color: var(--ink2); }
  @media (max-width: 900px) { .chot-in { grid-template-columns: 1fr; } .desk-row { grid-auto-columns: 86vw; } }
</style>
</head>
<body>
<header class="top"><div class="bar"><strong>HIVE · Feed</strong><nav>${nav}</nav></div></header>
<main>
  <h1>${esc(dir.name || "Feed")}</h1>
  <p class="lead">${esc(dir.idea || "")} Kéo ngang từng hàng để xem hết luồng; bấm "Mở bản sống" để thử.</p>
  <ul class="pal">${pal}</ul>
  ${GROUPS.map(group).join("")}
  <section class="chot" id="chot">
    <div class="chot-in">
      <div><h2>Tên gọi mới</h2>${words.length ? `<table class="words"><thead><tr><th>Đang gọi</th><th>Feed gọi</th></tr></thead><tbody>${words
        .map((w) => `<tr><td>${esc(w.was)}</td><td>${esc(w.now)}</td></tr>`).join("")}</tbody></table>` : '<p class="muted">Giữ nguyên cách gọi của app.</p>'}</div>
      <div><h2>Câu cần chốt</h2>${open.length ? `<ul class="open">${open.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : '<p class="muted">Không có.</p>'}</div>
    </div>
  </section>
</main>
</body>
</html>
`;
}

(async () => {
  const groups = GROUPS.filter((g) => !onlyGroups || onlyGroups.includes(g.id));
  if (shots) {
    await withBrowser(async (browser) => {
      for (const g of groups) {
        const jobs = jobsFor(g);
        for (const j of jobs) {
          await still(browser, { dir: DIR, spec: j.spec, width: j.width, file: path.join(ROOT, shotFile(j.spec, j.width)) });
        }
        console.log("captured", g.id, jobs.length, "stills");
      }
    });
  }
  fs.writeFileSync(path.join(ROOT, "index.html"), page());
  console.log("board written: prototype/explore/index.html");
})().catch((e) => { console.error(e); process.exit(1); });
