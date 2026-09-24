// Round 2: four versions of the HIVE mark from one parameterised construction.
// M0 = the redraw as committed (c55d11f); M1-M3 = refinements the user asked to compare.
// Geometry as in build.cjs: disc radius 500, origin at the centre, y downward;
// shapes are drawn in the measured frame, then scaled to the round frame (SX, SY)
// before any gap is cut, so every gap is a true, even offset.
const { createRequire } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = createRequire("D:/Code/e-commerce/package.json")("@playwright/test");

const HERE = __dirname;
const OUT = "D:/Code/e-commerce/prototype/name/logo/v2";
fs.mkdirSync(OUT, { recursive: true });

const SX = 115.5 / 117.55;
const SY = 115.5 / 113.63;
const HONEY = "#eba400", INK = "#171410";

// Pre-scale bevel that lands on exactly 30° after the round-frame scaling.
const BEVEL_30 = (Math.atan(Math.tan(Math.PI / 6) * (SX / SY)) * 180) / Math.PI;

const V = {
  m0: { bevelDeg: 30, gWing: 40, gThorax: 40, curveD: 0, belly: { top: 58, band: 62, gap: 44, stH: 86, stHalf: 53 }, antW: 21, antTo: [-92, -254], neck: false, root: false },
  m1: { bevelDeg: BEVEL_30, gWing: 42, gThorax: 42, curveD: -6, belly: { top: 16 + 42 / SY, band: 62, gap: 42 / SY, stH: 86, stHalf: 53 }, antW: 26, antTo: [-92, -254], neck: false, root: false },
  // one angle for the whole mark: the stems' ends run parallel to the wings (19.29° pre-scale = 19.9° drawn)
  m2: { bevelDeg: 19.29, gWing: 42, gThorax: 42, curveD: -6, belly: { top: 16 + 42 / SY, band: 62, gap: 42 / SY, stH: 86, stHalf: 53 }, antW: 26, antTo: [-92, -254], neck: false, root: false },
  // built for 16-32 px: wider honey gaps, heavier antennae, a shorter belly so it still fits
  m3: { bevelDeg: BEVEL_30, gWing: 56, gThorax: 56, curveD: 8, belly: { top: 16 + 56 / SY, band: 56, gap: 56 / SY, stH: 76, stHalf: 50 }, antW: 32, antTo: [-88, -248], neck: false, root: false },
};

const BASE = {
  R: 500,
  stem: { inner: 172, outer: 320, innerY: 375 },
  wing: {
    O: [-75, -62], deg: 19.29,
    d: [["M", -40, 0], ["L", 282, 0], ["C", 312, 0, 332, 22, 330, 52], ["C", 322, 95, 215, 160, 150, 160], ["C", 120, 160, 60, 110, -40, 32], ["Z"]],
  },
  head: { cy: -145, rx: 84.5, ry: 64 },
  thorax: { cy: -44, a: 72, b: 60, k: 0.85 },
  antenna: { from: [-38, -200], ctrl: [-58, -238] },
  abdomen: { rx: 113, ry: 124 },
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: path.join(HERE, "lib/paper-core.min.js") });

  const out = {};
  for (const [id, v] of Object.entries(V)) {
    out[id] = await page.evaluate(({ B, v, SX, SY }) => {
      paper.setup(new paper.Size(2000, 2000));
      const Pt = (x, y) => new paper.Point(x, y);
      const poly = (pts) => new paper.Path({ segments: pts.map(([x, y]) => Pt(x, y)), closed: true, insert: false });
      const O0 = Pt(0, 0);

      function offset(p, d) {
        const pts = [];
        const outward = (pt, n) => (p.contains(pt.add(n.multiply(0.6))) ? n.multiply(-1) : n);
        const curves = p.curves;
        for (let i = 0; i < curves.length; i++) {
          const c = curves[i], L = c.length, steps = Math.max(2, Math.ceil(L / 1.5));
          for (let j = 0; j < steps; j++) {
            const t = c.getTimeAt((L * j) / steps), q = c.getPointAtTime(t);
            pts.push(q.add(outward(q, c.getNormalAtTime(t)).multiply(d)));
          }
          const next = curves[(i + 1) % curves.length], jp = c.getPointAtTime(1);
          const n1 = outward(jp, c.getNormalAtTime(1)), n2 = outward(jp, next.getNormalAtTime(0));
          let da = n2.angle - n1.angle;
          while (da > 180) da -= 360;
          while (da < -180) da += 360;
          const k = Math.ceil(Math.abs(da) / 2);
          for (let m = 0; m <= k; m++) {
            const a = ((n1.angle + (da * m) / Math.max(k, 1)) * Math.PI) / 180;
            pts.push(jp.add(Pt(Math.cos(a), Math.sin(a)).multiply(d)));
          }
        }
        const o = new paper.Path({ segments: pts, closed: true, insert: false });
        o.simplify(0.35);
        return o;
      }

      // stems, bar
      const st = B.stem, dy = (st.outer - st.inner) * Math.tan((v.bevelDeg * Math.PI) / 180);
      const stem = (m) => poly([[m * st.inner, -st.innerY], [m * st.outer, -st.innerY + dy], [m * st.outer, st.innerY - dy], [m * st.inner, st.innerY]]);
      const stemL = stem(-1), stemR = stem(1);

      // wings
      const th = (B.wing.deg * Math.PI) / 180, eu = Pt(-Math.cos(th), -Math.sin(th)), ev = Pt(-Math.sin(th), Math.cos(th));
      const O = Pt(B.wing.O[0], B.wing.O[1]);
      const wing = (mirror) => {
        const w = new paper.Path({ insert: false });
        const f = (u, vv) => { const q = O.add(eu.multiply(u)).add(ev.multiply(vv)); return mirror ? Pt(-q.x, q.y) : q; };
        for (const c of B.wing.d) {
          if (c[0] === "M") w.moveTo(f(c[1], c[2]));
          else if (c[0] === "L") w.lineTo(f(c[1], c[2]));
          else if (c[0] === "C") w.cubicCurveTo(f(c[1], c[2]), f(c[3], c[4]), f(c[5], c[6]));
          else w.closePath();
        }
        return w;
      };
      const wingL = wing(false), wingR = wing(true);

      const head = new paper.Path.Ellipse({ center: [0, B.head.cy], radius: [B.head.rx, B.head.ry], insert: false });
      const T = B.thorax, ka = T.k * T.a, kb = T.k * T.b;
      const thorax = new paper.Path({ insert: false });
      thorax.moveTo(Pt(T.a, T.cy));
      thorax.cubicCurveTo(Pt(T.a, T.cy + kb), Pt(ka, T.cy + T.b), Pt(0, T.cy + T.b));
      thorax.cubicCurveTo(Pt(-ka, T.cy + T.b), Pt(-T.a, T.cy + kb), Pt(-T.a, T.cy));
      thorax.cubicCurveTo(Pt(-T.a, T.cy - kb), Pt(-ka, T.cy - T.b), Pt(0, T.cy - T.b));
      thorax.cubicCurveTo(Pt(ka, T.cy - T.b), Pt(T.a, T.cy - kb), Pt(T.a, T.cy));
      thorax.closePath();

      function antenna(mirror) {
        const s = mirror ? -1 : 1, A = B.antenna;
        const p0 = Pt(s * A.from[0], A.from[1]), c = Pt(s * A.ctrl[0], A.ctrl[1]), p2 = Pt(s * v.antTo[0], v.antTo[1]);
        const q = (t) => p0.multiply((1 - t) * (1 - t)).add(c.multiply(2 * (1 - t) * t)).add(p2.multiply(t * t));
        const dq = (t) => c.subtract(p0).multiply(2 * (1 - t)).add(p2.subtract(c).multiply(2 * t));
        const hw = v.antW / 2, N = 40, left = [], right = [];
        for (let i = 0; i <= N; i++) {
          const t = i / N, pt = q(t), tg = dq(t).normalize(), n = Pt(-tg.y, tg.x);
          left.push(pt.add(n.multiply(hw)));
          right.push(pt.subtract(n.multiply(hw)));
        }
        const capE = [], capS = [], tE = dq(1).normalize(), tS = dq(0).normalize();
        for (let i = 1; i < 18; i++) {
          const a = Math.PI * (i / 18);
          capE.push(p2.add(Pt(-tE.y, tE.x).multiply(Math.cos(a) * hw)).add(tE.multiply(Math.sin(a) * hw)));
          capS.push(p0.subtract(Pt(-tS.y, tS.x).multiply(Math.cos(a) * hw)).subtract(tS.multiply(Math.sin(a) * hw)));
        }
        const o = new paper.Path({ segments: [...left, ...capE, ...right.reverse(), ...capS], closed: true, insert: false });
        o.simplify(0.25);
        return o;
      }
      const antL = antenna(false), antR = antenna(true);

      const bl = v.belly;
      const b1 = [bl.top, bl.top + bl.band], b2 = [bl.top + bl.band + bl.gap, bl.top + 2 * bl.band + bl.gap];
      const cy = (b1[0] + b2[1]) / 2;
      const ell = new paper.Path.Ellipse({ center: [0, cy], radius: [B.abdomen.rx, B.abdomen.ry], insert: false });
      const band = ([y0, y1]) => ell.intersect(poly([[-200, y0], [200, y0], [200, y1], [-200, y1]]));
      const band1 = band(b1), band2 = band(b2);
      const sTop = b2[1] + bl.gap;
      const sting = poly([[-bl.stHalf, sTop], [bl.stHalf, sTop], [0, sTop + bl.stH]]);

      // the round frame
      for (const s of [stemL, stemR, wingL, wingR, head, thorax, antL, antR, band1, band2, sting]) s.scale(SX, SY, O0);

      // fillets: the neck between head and thorax, and the notch under each wing root
      const sidePoint = (shape, y, side) => {
        const line = new paper.Path.Line({ from: [-700, y], to: [700, y], insert: false });
        const pts = shape.getIntersections(line).map((i) => i.point).filter((p) => Math.sign(p.x) === side);
        pts.sort((a, b) => side * (b.x - a.x));
        return pts[0];
      };
      const tangentDown = (shape, p) => { let t = shape.getNearestLocation(p).tangent; if (t.y < 0) t = t.multiply(-1); return t; };
      let extra = null;
      if (v.neck) {
        for (const side of [-1, 1]) {
          const A = sidePoint(head, -120, side), Bp = sidePoint(thorax, -95, side);
          if (!A || !Bp) continue;
          const tA = tangentDown(head, A), tB = tangentDown(thorax, Bp), k = A.getDistance(Bp) * 0.5;
          const f = new paper.Path({ insert: false });
          f.moveTo(A);
          f.cubicCurveTo(A.add(tA.multiply(k)), Bp.subtract(tB.multiply(k)), Bp);
          f.lineTo(Pt(0, Bp.y));
          f.lineTo(Pt(0, A.y));
          f.closePath();
          extra = extra ? extra.unite(f) : f;
        }
      }
      if (v.root) {
        for (const [w, side] of [[wingL, -1], [wingR, 1]]) {
          // where the wing's lower edge meets the thorax side, bridge it with a concave curve
          const col = new paper.Path.Line({ from: [side * 92, -300], to: [side * 92, 300], insert: false });
          const hits = w.getIntersections(col).map((i) => i.point).sort((a, b) => b.y - a.y);
          const A = hits[0];
          const Bp = sidePoint(thorax, 6, side);
          if (!A || !Bp) continue;
          let tA = w.getNearestLocation(A).tangent;
          if (Math.sign(tA.x) !== -side) tA = tA.multiply(-1); // heading toward the body
          const tB = tangentDown(thorax, Bp), k = A.getDistance(Bp) * 0.55;
          const f = new paper.Path({ insert: false });
          f.moveTo(A);
          f.cubicCurveTo(A.add(tA.multiply(k)), Bp.subtract(tB.multiply(k)), Bp);
          f.lineTo(Pt(side * 30, 0));
          f.lineTo(Pt(side * 30, A.y - 10));
          f.closePath();
          extra = extra ? extra.unite(f) : f;
        }
      }

      // the crossbar corners beside the belly, with the measured inner curve moved by curveD
      const d = v.curveD, dyTop = (v.belly.top - 58) * SY, land = 165 + dyTop + 2 * d;
      const cut = (m) => {
        const c = new paper.Path({ insert: false });
        c.moveTo(Pt(m * (-121 - d), -60));
        c.lineTo(Pt(m * (-121 - d), 40 + dyTop));
        c.cubicCurveTo(Pt(m * (-145.8 - d), 77.4 + dyTop), Pt(m * -169, 140 + dyTop + 2 * d), Pt(m * -169, land));
        c.lineTo(Pt(m * -169, 460));
        c.lineTo(Pt(0, 460));
        c.lineTo(Pt(0, -60));
        c.closePath();
        return c;
      };
      const barTop = -30 * SY, barBottom = land + 15;
      const bar = poly([[-172 * SX, barTop], [172 * SX, barTop], [172 * SX, barBottom], [-172 * SX, barBottom]]);
      const H = stemL.unite(stemR).unite(bar.subtract(cut(1)).subtract(cut(-1)));

      let bee = wingL.unite(wingR).unite(head).unite(thorax).unite(antL).unite(antR).unite(band1).unite(band2).unite(sting);
      if (extra) bee = bee.unite(extra);
      const K = offset(wingL, v.gWing).unite(offset(wingR, v.gWing)).unite(offset(thorax, v.gThorax));
      const figure = H.subtract(K).unite(bee);
      figure.reorient(true, true);
      return figure.pathData;
    }, { B: BASE, v, SX, SY });
  }
  await browser.close();

  const r2 = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 100) / 100));
  for (const [id, d] of Object.entries(out)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000" role="img" aria-label="HIVE">\n<title>HIVE</title>\n<circle r="500" fill="${HONEY}"/>\n<path fill="${INK}" d="${r2(d)}"/>\n</svg>\n`;
    fs.writeFileSync(path.join(OUT, `mark-${id}.svg`), svg);
    console.log(`mark-${id}.svg`, svg.length);
  }
})().catch((e) => { console.error("gen failed:", e && e.stack ? e.stack : e); process.exit(1); });
