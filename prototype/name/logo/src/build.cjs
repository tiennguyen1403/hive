// Redraw the HIVE mark and wordmark as clean vectors from measured geometry.
//
// Units: the disc has radius 500 and its centre is the origin, y downward.
// Every number below was measured on the ChatGPT board (measure.py and the
// row/column scans), then made symmetric; nothing is eyeballed.
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = createRequire("D:/Code/e-commerce/package.json")("@playwright/test");

const HERE = __dirname;
const OUT = "D:/Code/e-commerce/prototype/name/logo";
fs.mkdirSync(OUT, { recursive: true });

// The hero mark on the board is drawn 3.3% squashed (disc 235.1 x 227.25 px while
// every other disc on the board is round), so the measured shapes are scaled
// back to a round frame before the gaps are cut: x * 0.9826, y * 1.0165.
const SX = 115.5 / 117.55;
const SY = 115.5 / 113.63;
const P = {
  R: 500,
  honey: "#eba400",
  ink: "#171410",
  // H stems: inner edge ±172, outer ±320, inner corners at y ±375, ends cut at 30°
  // (measured 28° top, 32° bottom on an AI drawing; made one angle).
  stem: { inner: 172, outer: 320, innerY: 375, bevelDeg: 30 },
  // The H's crossbar; only its corners beside the belly stay visible.
  bar: { top: -30, bottom: 175 },
  // Honey gaps cut into the H around the bee.
  gapWing: 40,
  gapBody: 48,
  gapThorax: 40,
  // Left wing, drawn in a frame whose u axis runs along the straight top edge
  // (19.29° above horizontal, toward the tip) from O, v perpendicular downward.
  wing: {
    O: [-75, -62],
    deg: 19.29,
    // local path: M, then L/C commands in (u, v)
    d: [
      ["M", -40, 0],
      ["L", 282, 0],
      ["C", 312, 0, 332, 22, 330, 52],
      ["C", 322, 95, 215, 160, 150, 160],
      ["C", 120, 160, 60, 110, -40, 32],
      ["Z"],
    ],
  },
  head: { cy: -145, rx: 84.5, ry: 64 },
  thorax: { cy: -44, a: 72, b: 60, k: 0.85 },
  antenna: { from: [-38, -200], ctrl: [-58, -238], to: [-92, -254], width: 21 },
  abdomen: { cy: 142, rx: 113, ry: 124, bands: [[58, 120], [164, 226]] },
  stinger: { top: 270, half: 53, tip: 356 },
};

// Wordmark, measured in board pixels (cap height 106) and mapped into the
// mark's units: x' = (x - 358.5) * s, y' = (y - 190.5) * s, s = 1000 / 235.
const S = 1000 / 235;
const mx = (x) => (x - 358.5) * S;
const my = (y) => (y - 190.5) * S;
const WORD = {
  H: { stems: [[499, 535], [562, 597]], bar: [168, 198] },
  I: [610, 646],
  V: { outer: [[653, 131], [757, 131], [725.5, 237], [684.5, 237]], counter: [[690, 131], [720, 131], [705, 194]] },
  E: { stem: [765, 800], right: 837, arms: [[131, 160], [169.5, 198.5], [208, 237]] },
  cap: [131, 237],
  dot: { cx: 864.5, cy: 219.5, r: 17.5 },
  digits: { text: "05", lefts: [888, 962], height: 86, baseline: 237 },
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: path.join(HERE, "lib/paper-core.min.js") });
  await page.addScriptTag({ path: path.join(HERE, "lib/opentype.min.js") });
  const barlow = fs.readFileSync(path.join(HERE, "fonts/Barlow-Black.ttf")).toString("base64");

  const result = await page.evaluate(({ P, WORD, S, barlow, SX, SY }) => {
    const mx = (x) => (x - 358.5) * S;
    const my = (y) => (y - 190.5) * S;
    paper.setup(new paper.Size(4000, 2000));
    const Pt = (x, y) => new paper.Point(x, y);
    const poly = (pts) => new paper.Path({ segments: pts.map(([x, y]) => Pt(x, y)), closed: true, insert: false });

    // ── offset of a convex closed path by d, with round joins at corners
    function offset(p, d) {
      const pts = [];
      const outward = (pt, n) => (p.contains(pt.add(n.multiply(0.6))) ? n.multiply(-1) : n);
      const curves = p.curves;
      for (let i = 0; i < curves.length; i++) {
        const c = curves[i];
        const L = c.length;
        const steps = Math.max(2, Math.ceil(L / 1.5));
        for (let j = 0; j < steps; j++) {
          const t = c.getTimeAt((L * j) / steps);
          const q = c.getPointAtTime(t);
          pts.push(q.add(outward(q, c.getNormalAtTime(t)).multiply(d)));
        }
        const next = curves[(i + 1) % curves.length];
        const jp = c.getPointAtTime(1);
        const n1 = outward(jp, c.getNormalAtTime(1));
        const n2 = outward(jp, next.getNormalAtTime(0));
        let da = n2.angle - n1.angle;
        while (da > 180) da -= 360;
        while (da < -180) da += 360;
        const k = Math.ceil(Math.abs(da) / 2);
        for (let m = 0; m <= k; m++) {
          const a = ((n1.angle + (da * m) / Math.max(k, 1)) * Math.PI) / 180;
          pts.push(jp.add(Pt(Math.cos(a), Math.sin(a)).multiply(d)));
        }
      }
      const out = new paper.Path({ segments: pts, closed: true, insert: false });
      out.simplify(0.35);
      return out;
    }

    // ── the H
    const st = P.stem;
    const dy = (st.outer - st.inner) * Math.tan((st.bevelDeg * Math.PI) / 180);
    const stemL = poly([[-st.inner, -st.innerY], [-st.outer, -st.innerY + dy], [-st.outer, st.innerY - dy], [-st.inner, st.innerY]]);
    const stemR = poly([[st.inner, -st.innerY], [st.outer, -st.innerY + dy], [st.outer, st.innerY - dy], [st.inner, st.innerY]]);
    const bar = poly([[-st.inner, P.bar.top], [st.inner, P.bar.top], [st.inner, P.bar.bottom], [-st.inner, P.bar.bottom]]);
    let H = stemL.unite(bar).unite(stemR);

    // ── the bee
    const th = (P.wing.deg * Math.PI) / 180;
    const eu = Pt(-Math.cos(th), -Math.sin(th));
    const ev = Pt(-Math.sin(th), Math.cos(th));
    const O = Pt(P.wing.O[0], P.wing.O[1]);
    const W = (u, v) => O.add(eu.multiply(u)).add(ev.multiply(v));
    function wingPath(mirror) {
      const w = new paper.Path({ insert: false });
      const f = (u, v) => { const q = W(u, v); return mirror ? Pt(-q.x, q.y) : q; };
      for (const cmd of P.wing.d) {
        if (cmd[0] === "M") w.moveTo(f(cmd[1], cmd[2]));
        else if (cmd[0] === "L") w.lineTo(f(cmd[1], cmd[2]));
        else if (cmd[0] === "C") w.cubicCurveTo(f(cmd[1], cmd[2]), f(cmd[3], cmd[4]), f(cmd[5], cmd[6]));
        else if (cmd[0] === "Z") w.closePath();
      }
      return w;
    }
    const wingL = wingPath(false);
    const wingR = wingPath(true);

    const head = new paper.Path.Ellipse({ center: [0, P.head.cy], radius: [P.head.rx, P.head.ry], insert: false });

    const T = P.thorax, ka = T.k * T.a, kb = T.k * T.b;
    const thorax = new paper.Path({ insert: false });
    thorax.moveTo(Pt(T.a, T.cy));
    thorax.cubicCurveTo(Pt(T.a, T.cy + kb), Pt(ka, T.cy + T.b), Pt(0, T.cy + T.b));
    thorax.cubicCurveTo(Pt(-ka, T.cy + T.b), Pt(-T.a, T.cy + kb), Pt(-T.a, T.cy));
    thorax.cubicCurveTo(Pt(-T.a, T.cy - kb), Pt(-ka, T.cy - T.b), Pt(0, T.cy - T.b));
    thorax.cubicCurveTo(Pt(ka, T.cy - T.b), Pt(T.a, T.cy - kb), Pt(T.a, T.cy));
    thorax.closePath();

    // antenna: a round-capped stroke along a quadratic, outlined
    function antenna(mirror) {
      const A = P.antenna, s = mirror ? -1 : 1;
      const p0 = Pt(s * A.from[0], A.from[1]), c = Pt(s * A.ctrl[0], A.ctrl[1]), p2 = Pt(s * A.to[0], A.to[1]);
      const q = (t) => p0.multiply((1 - t) * (1 - t)).add(c.multiply(2 * (1 - t) * t)).add(p2.multiply(t * t));
      const dq = (t) => c.subtract(p0).multiply(2 * (1 - t)).add(p2.subtract(c).multiply(2 * t));
      const hw = A.width / 2, N = 40, left = [], right = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, pt = q(t), tg = dq(t).normalize(), n = Pt(-tg.y, tg.x);
        left.push(pt.add(n.multiply(hw)));
        right.push(pt.subtract(n.multiply(hw)));
      }
      const capEnd = [], capStart = [];
      const tEnd = dq(1).normalize(), tStart = dq(0).normalize();
      for (let i = 1; i < 18; i++) {
        const a = Math.PI * (i / 18);
        const nE = Pt(-tEnd.y, tEnd.x);
        capEnd.push(p2.add(nE.multiply(Math.cos(a) * hw)).add(tEnd.multiply(Math.sin(a) * hw)));
        const nS = Pt(-tStart.y, tStart.x);
        capStart.push(p0.subtract(nS.multiply(Math.cos(a) * hw)).subtract(tStart.multiply(Math.sin(a) * hw)));
      }
      const pts = [...left, ...capEnd, ...right.reverse(), ...capStart];
      const out = new paper.Path({ segments: pts, closed: true, insert: false });
      out.simplify(0.25);
      return out;
    }
    const antL = antenna(false), antR = antenna(true);

    const Ab = P.abdomen;
    const ell = new paper.Path.Ellipse({ center: [0, Ab.cy], radius: [Ab.rx, Ab.ry], insert: false });
    const band = ([y0, y1]) => ell.intersect(poly([[-200, y0], [200, y0], [200, y1], [-200, y1]]));
    const band1 = band(Ab.bands[0]);
    const band2 = band(Ab.bands[1]);
    const belly = band([Ab.bands[0][0], Ab.bands[1][1]]);
    const sting = poly([[-P.stinger.half, P.stinger.top], [P.stinger.half, P.stinger.top], [0, P.stinger.tip]]);

    const O0 = new paper.Point(0, 0);
    for (const shape of [stemL, stemR, bar, wingL, wingR, head, thorax, antL, antR, band1, band2, belly, sting]) shape.scale(SX, SY, O0);
    // The crossbar shows only as the two corners beside the belly. Their inner
    // edge is the curve measured on the board (11 points, fit within 2 units),
    // arriving vertical on the stem line so no step is left where it lands.
    const cut = (m) => {
      const c = new paper.Path({ insert: false });
      c.moveTo(Pt(m * -121, -60));
      c.lineTo(Pt(m * -121, 40));
      c.cubicCurveTo(Pt(m * -145.8, 77.4), Pt(m * -169, 140), Pt(m * -169, 165));
      c.lineTo(Pt(m * -169, 420));
      c.lineTo(Pt(0, 420));
      c.lineTo(Pt(0, -60));
      c.closePath();
      return c;
    };
    H = stemL.unite(stemR).unite(bar.subtract(cut(1)).subtract(cut(-1)));
    let bee = wingL.unite(wingR).unite(head).unite(thorax).unite(antL).unite(antR).unite(band1).unite(band2).unite(sting);

    // ── the honey gaps: the bee's outline, cut into the H
    const K = offset(wingL, P.gapWing).unite(offset(wingR, P.gapWing)).unite(offset(thorax, P.gapThorax));
    const figure = H.subtract(K).unite(bee);
    figure.reorient(true, true);

    const disc = new paper.Path.Circle({ center: [0, 0], radius: P.R, insert: false });
    const knockout = disc.subtract(figure);

    // ── wordmark HIVE
    const rect = (x0, y0, x1, y1) => poly([[mx(x0), my(y0)], [mx(x1), my(y0)], [mx(x1), my(y1)], [mx(x0), my(y1)]]);
    const [c0, c1] = WORD.cap;
    let hive = rect(WORD.H.stems[0][0], c0, WORD.H.stems[0][1], c1)
      .unite(rect(WORD.H.stems[1][0], c0, WORD.H.stems[1][1], c1))
      .unite(rect(WORD.H.stems[0][1] - 1, WORD.H.bar[0], WORD.H.stems[1][0] + 1, WORD.H.bar[1]));
    hive = hive.unite(rect(WORD.I[0], c0, WORD.I[1], c1));
    const vOuter = poly(WORD.V.outer.map(([x, y]) => [mx(x), my(y)]));
    const vCounter = poly(WORD.V.counter.map(([x, y]) => [mx(x), my(y)]));
    hive = hive.unite(vOuter.subtract(vCounter));
    let E = rect(WORD.E.stem[0], c0, WORD.E.stem[1], c1);
    for (const [a0, a1] of WORD.E.arms) E = E.unite(rect(WORD.E.stem[1] - 1, a0, WORD.E.right, a1));
    hive = hive.unite(E);
    const lift = -(my(WORD.cap[0]) + my(WORD.cap[1])) / 2;
    hive.translate(new paper.Point(0, lift));

    // ── ".05" in Barlow Black, placed on the measured left edges
    const bin = Uint8Array.from(atob(barlow), (c) => c.charCodeAt(0));
    const font = opentype.parse(bin.buffer);
    const unit = font.unitsPerEm;
    const g0 = font.charToGlyph("0");
    const bb0 = g0.getBoundingBox();
    const size = (WORD.digits.height * S) / ((bb0.y2 - bb0.y1) / unit);
    const digits = [];
    WORD.digits.text.split("").forEach((ch, i) => {
      const g = font.charToGlyph(ch);
      const bb = g.getBoundingBox();
      const x = mx(WORD.digits.lefts[i]) - (bb.x1 / unit) * size;
      const gp = g.getPath(x, my(WORD.digits.baseline) + lift, size);
      digits.push(gp.toPathData(2));
    });
    const dot = new paper.Path.Circle({ center: [mx(WORD.dot.cx), my(WORD.dot.cy) + lift], radius: WORD.dot.r * S, insert: false });

    return {
      figure: figure.pathData,
      knockout: knockout.pathData,
      hive: hive.pathData,
      dot: dot.pathData,
      digits,
      hiveBounds: [hive.bounds.x, hive.bounds.y, hive.bounds.width, hive.bounds.height],
      lockupRight: Math.max(hive.bounds.right, dot.bounds.right, ...digits.map((d) => new paper.CompoundPath(d).bounds.right)),
    };
  }, { P, WORD, S, barlow, SX, SY });

  const r2 = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 100) / 100));
  const fig = r2(result.figure), ko = r2(result.knockout), hive = r2(result.hive), dot = r2(result.dot);
  const digits = result.digits.map(r2);
  const svg = (vb, body, title) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${title}">\n<title>${title}</title>\n${body}\n</svg>\n`;

  const files = {
    "hive-mark.svg": svg("-500 -500 1000 1000", `<circle r="500" fill="${P.honey}"/>\n<path fill="${P.ink}" d="${fig}"/>`, "HIVE"),
    "hive-mark-black.svg": svg("-500 -500 1000 1000", `<circle r="500" fill="${P.ink}"/>\n<path fill="#ffffff" d="${fig}"/>`, "HIVE"),
    "hive-mark-negative.svg": svg("-500 -500 1000 1000", `<circle r="500" fill="#ffffff"/>\n<path fill="${P.ink}" d="${fig}"/>`, "HIVE"),
    "hive-mark-knockout.svg": svg("-500 -500 1000 1000", `<path fill="${P.ink}" d="${ko}"/>`, "HIVE"),
    "hive-wordmark.svg": (() => {
      const [x, y, w, h] = result.hiveBounds;
      return svg(`${(x).toFixed(1)} ${(y).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`, `<path fill="${P.ink}" d="${hive}"/>`, "HIVE");
    })(),
    "hive-lockup.svg": svg(
      `-500 -500 ${Math.ceil(result.lockupRight + 500)} 1000`,
      `<circle r="500" fill="${P.honey}"/>\n<path fill="${P.ink}" d="${fig}"/>\n<path fill="${P.ink}" d="${hive}"/>\n<path fill="${P.honey}" d="${dot}"/>\n<path fill="${P.honey}" d="${digits.join(" ")}"/>`,
      "HIVE.05",
    ),
  };
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT, name), content);
    console.log(name, content.length, "bytes");
  }
  await browser.close();
})().catch((e) => {
  console.error("build failed:", e && e.stack ? e.stack : e);
  process.exit(1);
});
