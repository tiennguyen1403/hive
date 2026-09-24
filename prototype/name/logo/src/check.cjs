// Pixel checks: (1) the canonical mark equals M2; (2) the knockout equals the black variant;
// (3) each lockup's outlines equal Chrome's rendering of the board's live text; (4) the composer's
// ".05" equals the lockup's; (5) ".06" composed equals Chrome's text ".06".
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = createRequire("D:/Code/e-commerce/package.json")("@playwright/test");
const HERE = __dirname, LOGO = "D:/Code/e-commerce/prototype/name/logo";
const VF = fs.readFileSync("D:/Code/e-commerce/prototype/name/fonts/BigShouldersStencilDisplay-VF.ttf").toString("base64");
const read = (f) => fs.readFileSync(f, "utf8");
const M = 400;   // mark size in px for the comparisons
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 500 } });
  await page.setContent(`<!doctype html><style>@font-face{font-family:BSSVF;src:url(data:font/ttf;base64,${VF}) format("truetype");font-weight:100 900}body{margin:0}</style><body></body>`);
  await page.evaluate(() => document.fonts.load('700 100px "BSSVF"'));
  const diff = (a, b, w, h) => page.evaluate(async ({ a, b, w, h }) => {
    const raster = async (html) => {
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(html);
      await img.decode();
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      return g.getImageData(0, 0, w, h).data;
    };
    const A = await raster(a), B = await raster(b);
    let bad = 0, ink = 0;
    for (let i = 0; i < A.length; i += 4) {
      const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
      if (A[i] + A[i + 1] + A[i + 2] < 700 || B[i] + B[i + 1] + B[i + 2] < 700) ink++;
      if (d > 96) bad++;
    }
    return { bad, ink, share: +(bad / Math.max(ink, 1)).toFixed(5) };
  }, { a, b, w, h });
  const sized = (s, w, h) => s.replace("<svg ", `<svg width="${w}" height="${h}" `);
  const out = {};
  out.markVsM2 = await diff(sized(read(path.join(LOGO, "hive-mark.svg")), 512, 512), sized(read(path.join(LOGO, "v2/mark-m2.svg")), 512, 512), 512, 512);
  const ko = read(path.join(LOGO, "hive-mark-knockout.svg")).replace("<svg ", '<svg style="background:#fff" ');
  out.knockoutVsBlack = await diff(sized(ko, 512, 512), sized(read(path.join(LOGO, "hive-mark-black.svg")), 512, 512), 512, 512);

  // Chrome's live text, laid out like the board, drawn into an SVG foreignObject at the same scale.
  const live = async (label) => {
    const W = Math.ceil(M * 2.9), H = M;
    const html = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="-500 -500 2900 1000">
      <circle r="500" fill="#eba400"/><path fill="#171410" d="${read(path.join(LOGO, "v2/mark-m2.svg")).match(/<path fill="#171410" d="([^"]+)"/)[1]}"/>
      <foreignObject x="740" y="-500" width="2200" height="1000"><div xmlns="http://www.w3.org/1999/xhtml" style="height:1000px;display:flex;align-items:center">
      <span style="font:700 650px/1 BSSVF;letter-spacing:13px;white-space:nowrap;color:#171410;text-box:trim-both cap alphabetic;display:block">HIVE<span style="font-size:520px;color:#eba400">${label}</span></span></div></foreignObject></svg>`;
    return { html, W, H };
  };
  // foreignObject in an <img> cannot use the page's @font-face, so compare in the DOM instead: screenshot both.
  const shoot = async (inner, W, H, file) => {
    await page.setViewportSize({ width: W, height: H });
    await page.evaluate(({ inner }) => { document.body.innerHTML = inner; }, { inner });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(HERE, file), clip: { x: 0, y: 0, width: W, height: H } });
    return fs.readFileSync(path.join(HERE, file)).toString("base64");
  };
  const results = {};
  for (const [label, file] of [[".05", "hive-lockup-05.svg"], [".06", null]]) {
    const { html, W, H } = await live(label);
    const svgFile = file ? read(path.join(LOGO, file)) : read(path.join(HERE, "composed-06.svg"));
    const vbW = +svgFile.match(/viewBox="[^"]*?(\S+) \S+"/)[1];
    const a = await shoot(html, W, H, `live${label}.png`);
    const b = await shoot(svgFile.replace("<svg ", `<svg width="${Math.round(M * vbW / 1000)}" height="${M}" style="display:block" `), W, H, `vector${label}.png`);
    results[label] = await page.evaluate(async ({ a, b, W, H }) => {
      const load = async (b64) => { const i = new Image(); i.src = "data:image/png;base64," + b64; await i.decode(); const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.drawImage(i, 0, 0, W, H); return g.getImageData(0, 0, W, H).data; };
      const A = await load(a), B = await load(b);
      let bad = 0, ink = 0;
      for (let i = 0; i < A.length; i += 4) {
        if (A[i] + A[i + 1] + A[i + 2] < 700 || B[i] + B[i + 1] + B[i + 2] < 700) ink++;
        if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 96) bad++;
      }
      return { bad, ink, share: +(bad / ink).toFixed(5) };
    }, { a, b, W, H });
  }
  out.lockupVsLiveText = results;
  out.composedVsLockup05 = await diff(sized(read(path.join(HERE, "composed-05.svg")), 1113, 400), sized(read(path.join(LOGO, "hive-lockup-05.svg")), 1113, 400), 1113, 400);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
