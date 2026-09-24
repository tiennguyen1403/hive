// Static snapshots of the running store (next start, :3200) for the board of
// the year-round line (prototype/v3/line.html). Each page is the server's own
// HTML with the scripts taken out, its two stylesheets and their fonts copied
// next to it, and every photo pointed at the local copies in prototype/v2/img.
// The proposal is NOT in these files: line-mock.js draws it over them, so a
// re-shot never loses the mock and the mock never edits the store's markup.
//
// Run: node prototype/v3/line/snap.cjs   (the store must be up on 3200)
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = createRequire("D:/Code/e-commerce/package.json")("@playwright/test");

const BASE = "http://127.0.0.1:3200";
const OUT = __dirname;
const PAGES = [
  { url: "/", key: "home" },
  { url: "/?drop=6", key: "home-gap" },
  { url: "/products", key: "products" },
  { url: "/products/khoi", key: "product" },
  { url: "/admin/products", key: "admin-products", admin: true },
  { url: "/admin/products/new", key: "admin-new", admin: true },
];

// Unsplash id → the key it stands in for (lib/photos.ts), so a photo lands on
// its local copy in prototype/v2/img instead of the network.
const PHOTO_IDS = {
  hero: "1593278641722-49b1047ede21", khoi: "1503341338985-c0477be52513",
  bui: "1620799140188-3b2a02fd9a77", nguoi: "1680292783974-a9a336c10366",
  nang: "1503341504253-dff4815485f1", suong: "1564557287817-3785e38ec1f5",
  muoi: "1601063476271-a159c71ab0b3", than: "1508216310976-c518daae0cdc",
  cat: "1578768079052-aa76e52ff62e", gio: "1615397587950-3cbb55f95b77",
  da: "1542406775-ade58c52d2e4", reu: "1611817757591-c3f345024273",
  tro: "1614214191247-5b2d3a734f1b", song: "1688111421205-a0a85415b224",
  vo: "1565978771542-0db9ab9ad3de", mua: "1633292750937-120a94f5c2bb",
  kho: "1542327534-59a1fe8daf73", dat: "1632682582909-2b3a2581eef7",
  lua: "1561151593-7059b6b4ff57",
};
const KEY_OF = Object.fromEntries(Object.entries(PHOTO_IDS).map(([k, id]) => [id, k]));

function localPhoto(tag) {
  const m = tag.match(/photo-([0-9a-f]+-[0-9a-f]+)/);
  const key = m && KEY_OF[m[1]];
  if (!key) return null;
  // The cover is drawn 747 px wide on a monitor; everything else is a card.
  return `../../v2/img/${key}${key === "hero" ? "-lg" : ""}.webp`;
}

function clean(html, key) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(/<script\b[^>]*\/>/g, "")
    .replace(/<link\b[^>]*rel="(?:preload|modulepreload|icon|apple-touch-icon|manifest)"[^>]*\/?>/g, "")
    .replace(/<link\b[^>]*href="\/_next\/static\/chunks\/([^"]+\.css)"[^>]*\/?>/g,
      '<link rel="stylesheet" href="app/$1"/>')
    .replace(/<img\b[^>]*>/g, (tag) => {
      const src = localPhoto(tag);
      if (!src) return tag;
      return tag
        .replace(/\s(?:srcSet|srcset|sizes)="[^"]*"/g, "")
        .replace(/\ssrc="[^"]*"/, ` src="${src}"`);
    })
    .replace(/<html\b/, `<html data-snap="${key}"`)
    .replace("</head>", '<link rel="stylesheet" href="line-mock.css"/><script src="line-mock.js" defer></script></head>');
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // The back office is behind the demo sign-in; "Vào quản trị thử" is the
  // public one-press door (lib/demo-admin.ts). Local database only.
  await page.goto(BASE + "/sign-in?next=%2Fadmin");
  await page.getByRole("button", { name: "Vào quản trị thử" }).click();
  await page.waitForURL(/\/admin/, { timeout: 20000 });

  const sheets = new Set();
  for (const p of PAGES) {
    const res = await ctx.request.get(BASE + p.url);
    if (!res.ok()) throw new Error(`${p.url}: ${res.status()}`);
    const html = await res.text();
    for (const m of html.matchAll(/\/_next\/static\/chunks\/([^"]+\.css)/g)) sheets.add(m[1]);
    fs.writeFileSync(path.join(OUT, `${p.key}.html`), clean(html, p.key));
    console.log("page", p.url, "→", `${p.key}.html`);
  }

  // The sheets name their fonts `url(../media/…)`, relative to
  // /_next/static/chunks/ — so beside app/ they belong in media/.
  fs.mkdirSync(path.join(OUT, "app"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "media"), { recursive: true });
  for (const name of sheets) {
    const css = await (await ctx.request.get(`${BASE}/_next/static/chunks/${name}`)).text();
    const fonts = [...css.matchAll(/url\(\.\.\/media\/([^)]+)\)/g)].map((m) => m[1]);
    for (const f of new Set(fonts)) {
      const body = await (await ctx.request.get(`${BASE}/_next/static/media/${f}`)).body();
      fs.writeFileSync(path.join(OUT, "media", f), body);
    }
    fs.writeFileSync(path.join(OUT, "app", name), css);
    console.log("sheet", name, "fonts", new Set(fonts).size);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
