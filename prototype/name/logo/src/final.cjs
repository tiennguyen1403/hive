// The final HIVE logo (QĐ-29 mark M2 + QĐ-30 wordmark W3): canonical mark files, the wordmark
// and the digit set as clean outlines, and the lockups — built from the same rules the round-3
// board rendered, then checked pixel by pixel against Chrome's own rendering of that board.
//
// Units everywhere: the mark's disc has radius 500 and its centre at (0, 0); y points down.
// Lockup rules (round 3, measured): mark edge → H's pen origin 0.24 D; cap height 0.52 D, the cap
// band centred on the mark; letter-spacing 0.02 em of the name; ".NN" at 0.8 of the name's size,
// same baseline, same absolute letter-spacing (CSS inherits the computed length).
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = createRequire("D:/Code/e-commerce/package.json")("@playwright/test");

const HERE = __dirname;
const LOGO = "D:/Code/e-commerce/prototype/name/logo";
const VF = "D:/Code/e-commerce/prototype/name/fonts/BigShouldersStencilDisplay-VF.ttf";
const STATIC = path.join(HERE, "bss-700.ttf");            // instance.py: wght 700 cut from VF
const HONEY = "#eba400", INK = "#171410", WHITE = "#ffffff";

const D = 1000, GAP = 0.24 * D, CAP = 0.52 * D;
const UPM = 2000, CAP_EM = 1600 / 2000;                     // OS/2 sCapHeight 1600 on a 2000 em
const NAME = CAP / CAP_EM, NUM = 0.8 * NAME, TRACK = 0.02 * NAME, BASE = CAP / 2, X0 = D / 2 + GAP;

const figure = fs.readFileSync(path.join(LOGO, "v2/mark-m2.svg"), "utf8").match(/<path fill="#171410" d="([^"]+)"/)[1];

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 2400, height: 1200 } });
  await page.setContent("<!doctype html><html><body style='margin:0'></body></html>");
  await page.addScriptTag({ path: path.join(HERE, "lib/paper-core.min.js") });
  await page.addScriptTag({ path: path.join(HERE, "lib/opentype.min.js") });
  await page.addStyleTag({ content: `@font-face{font-family:"BSSVF";src:url(data:font/ttf;base64,${fs.readFileSync(VF).toString("base64")}) format("truetype");font-weight:100 900}` });

  const r = await page.evaluate(async ({ fontB64, figure, NAME, NUM, TRACK, BASE, X0, UPM }) => {
    // 1. Chrome's own layout of the board's text, at 1 px = 1 unit.
    await document.fonts.load('700 100px "BSSVF"');
    const host = document.createElement("div");
    host.style.cssText = `position:absolute;left:0;top:0;font:700 ${NAME}px/1 BSSVF;letter-spacing:${TRACK}px;white-space:nowrap;font-kerning:normal`;
    host.innerHTML = `HIVE<span style="font-size:${NUM}px">.05</span>`;
    document.body.append(host);
    const pens = [];
    for (const node of [host.firstChild, host.querySelector("span").firstChild]) {
      for (let i = 0; i < node.length; i++) {
        const rg = document.createRange(); rg.setStart(node, i); rg.setEnd(node, i + 1);
        pens.push(rg.getClientRects()[0].left - host.getBoundingClientRect().left);
      }
    }

    // 2. The same layout from the font file: advances + GPOS kerning + tracking.
    const bin = Uint8Array.from(atob(fontB64), (c) => c.charCodeAt(0)).buffer;
    const font = opentype.parse(bin);
    const g = (ch) => font.charToGlyph(ch);
    const kern = (a, b) => font.getKerningValue(g(a), g(b));
    const text = "HIVE.05", sizes = [NAME, NAME, NAME, NAME, NUM, NUM, NUM];
    const calc = [0];
    for (let i = 1; i < text.length; i++) {
      const s = sizes[i - 1] / UPM;
      const k = sizes[i] === sizes[i - 1] ? kern(text[i - 1], text[i]) * s : 0;   // no kerning across the size change
      calc.push(calc[i - 1] + g(text[i - 1]).advanceWidth * s + TRACK + k);
    }
    const penDiff = Math.max(...pens.map((p, i) => Math.abs(p - calc[i])));

    // 3. Outlines, overlaps resolved (the variable font keeps overlapping contours).
    paper.setup(new paper.Size(4000, 2000));
    const clean = (d) => {
      const p = new paper.CompoundPath({ pathData: d, insert: false });
      return p.resolveCrossings().reorient(true, true);
    };
    const place = (ch, x, size) => clean(g(ch).getPath(x, BASE, size).toPathData(4));
    const unite = (items) => items.reduce((a, b) => a.unite(b, { insert: false }));
    const name = unite([..."HIVE"].map((ch, i) => place(ch, X0 + pens[i], NAME)));
    const number = unite([..."."].concat([..."05"]).map((ch, i) => place(ch, X0 + pens[4 + i], NUM)));

    // 4. The digit set, in font units with the pen at (0, 0) on the baseline, for composing any issue number.
    const glyphs = {};
    for (const ch of ".0123456789") {
      const p = clean(g(ch).getPath(0, 0, UPM).toPathData(4));
      glyphs[ch] = { adv: g(ch).advanceWidth, d: p.pathData };
    }
    const kerns = {};
    for (const a of ".0123456789") for (const b of "0123456789") { const k = kern(a, b); if (k) kerns[a + b] = k; }

    // 5. The mark and its one-colour knockout.
    const disc = new paper.Path.Circle({ center: [0, 0], radius: 500, insert: false });
    const fig = new paper.CompoundPath({ pathData: figure, insert: false });
    const knockout = disc.subtract(fig, { insert: false });

    const b = (p) => { const r = p.bounds; return [r.left, r.top, r.right, r.bottom].map((v) => +v.toFixed(2)); };
    const r2 = (p) => p.pathData.replace(/-?\d+\.\d+/g, (n) => String(+(+n).toFixed(2)));
    return { pens, calc, penDiff, name: r2(name), nameB: b(name), number: r2(number), numberB: b(number), glyphs, kerns,
      knockout: r2(knockout), numberStart: X0 + pens[4] };
  }, { fontB64: fs.readFileSync(STATIC).toString("base64"), figure, NAME, NUM, TRACK, BASE, X0, UPM });

  console.log("pen x (Chrome):", r.pens.map((v) => v.toFixed(2)).join(" "));
  console.log("pen x (font):  ", r.calc.map((v) => v.toFixed(2)).join(" "), " max diff", r.penDiff.toFixed(3));
  console.log("name bounds", r.nameB, "number bounds", r.numberB, "kern pairs among digits:", Object.keys(r.kerns).length);
  fs.writeFileSync(path.join(HERE, "final.json"), JSON.stringify(r));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
