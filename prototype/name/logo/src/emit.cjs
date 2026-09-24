// Write the final logo files from final.json (built by final.cjs).
const fs = require("node:fs");
const path = require("node:path");
const HERE = __dirname;
const LOGO = "D:/Code/e-commerce/prototype/name/logo";
const r = JSON.parse(fs.readFileSync(path.join(HERE, "final.json"), "utf8"));
const HONEY = "#eba400", INK = "#171410", WHITE = "#ffffff";
const figure = fs.readFileSync(path.join(LOGO, "v2/mark-m2.svg"), "utf8").match(/<path fill="#171410" d="([^"]+)"/)[1];
const NAME = 650, NUM = 520, TRACK = 13, BASE = 260, UPM = 2000;
const f2 = (v) => String(+v.toFixed(2));

const svg = (vb, label, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f2).join(" ")}" role="img" aria-label="${label}">\n<title>${label}</title>\n${body}\n</svg>\n`;
const mark = (disc, fig) => `<circle r="500" fill="${disc}"/>\n<path fill="${fig}" d="${figure}"/>`;

// Any issue number, composed from the digit set exactly as the board's text was laid out.
function number(no) {
  let x = r.numberStart, out = [];
  const chars = "." + no, s = NUM / UPM;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i], gl = r.glyphs[ch];
    out.push(`<path transform="translate(${f2(x)} ${BASE}) scale(${s})" d="${gl.d}"/>`);
    const k = i + 1 < chars.length ? (r.kerns[ch + chars[i + 1]] || 0) : 0;
    x += (gl.adv + k) * s + TRACK;
  }
  return out.join("");
}

const [nx0, ny0, nx1, ny1] = r.nameB;
const numRight = r.numberB[2];
const files = {
  "hive-mark.svg": svg([-500, -500, 1000, 1000], "HIVE", mark(HONEY, INK)),
  "hive-mark-black.svg": svg([-500, -500, 1000, 1000], "HIVE", mark(INK, WHITE)),
  "hive-mark-negative.svg": svg([-500, -500, 1000, 1000], "HIVE", mark(WHITE, INK)),
  "hive-mark-knockout.svg": svg([-500, -500, 1000, 1000], "HIVE", `<path fill="${INK}" d="${r.knockout}"/>`),
  "hive-wordmark.svg": svg([nx0, ny0, nx1 - nx0, ny1 - ny0], "HIVE", `<path fill="${INK}" d="${r.name}"/>`),
  "hive-wordmark-white.svg": svg([nx0, ny0, nx1 - nx0, ny1 - ny0], "HIVE", `<path fill="${WHITE}" d="${r.name}"/>`),
  "hive-lockup.svg": svg([-500, -500, nx1 + 500, 1000], "HIVE", `${mark(HONEY, INK)}\n<path fill="${INK}" d="${r.name}"/>`),
  "hive-lockup-white.svg": svg([-500, -500, nx1 + 500, 1000], "HIVE", `${mark(HONEY, INK)}\n<path fill="${WHITE}" d="${r.name}"/>`),
  "hive-lockup-05.svg": svg([-500, -500, numRight + 500, 1000], "HIVE.05", `${mark(HONEY, INK)}\n<path fill="${INK}" d="${r.name}"/>\n<path fill="${HONEY}" d="${r.number}"/>`),
  "hive-lockup-05-white.svg": svg([-500, -500, numRight + 500, 1000], "HIVE.05", `${mark(HONEY, INK)}\n<path fill="${WHITE}" d="${r.name}"/>\n<path fill="${HONEY}" d="${r.number}"/>`),
};

// The digit specimen: the dot and 0-9 as the lockup sets them, starting at x 0.
{
  const shift = r.numberStart;
  let x = 0, parts = [];
  const s = NUM / UPM, chars = ".0123456789";
  for (let i = 0; i < chars.length; i++) {
    const gl = r.glyphs[chars[i]];
    parts.push(`<path transform="translate(${f2(x)} ${BASE}) scale(${s})" d="${gl.d}"/>`);
    const k = i + 1 < chars.length ? (r.kerns[chars[i] + chars[i + 1]] || 0) : 0;
    x += (gl.adv + k) * s + TRACK;
  }
  files["hive-digits.svg"] = svg([0, -170, x - TRACK, 440], ".0123456789", `<g fill="${HONEY}">${parts.join("")}</g>`);
}

// The number system for the app: glyphs in font units (pen at 0,0 on the baseline, y down).
files["hive-number.json"] = JSON.stringify({
  about: "HIVE lockup number '.NN' — Big Shoulders Stencil Display 700 (OFL) outlines. Lockup units: the mark's disc has radius 500, centre (0,0), y down.",
  compose: "x = start; for each char of '.' + NN: draw glyph d at translate(x, baseline) scale(scale); x += (adv + kern[pair]) * scale + tracking",
  start: +r.numberStart.toFixed(3), baseline: BASE, scale: NUM / UPM, tracking: TRACK, color: HONEY,
  nameRight: nx1, glyphs: r.glyphs, kern: r.kerns,
}, null, 1) + "\n";

for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(LOGO, name), body);
// Check the composer against the lockup's own ".05".
const composed = number("05");
fs.writeFileSync(path.join(HERE, "composed-06.svg"), svg([-500, -500, 2900, 1000], "HIVE.06", `${mark(HONEY, INK)}\n<path fill="${INK}" d="${r.name}"/>\n<g fill="${HONEY}">${number("06")}</g>`));
fs.writeFileSync(path.join(HERE, "composed-05.svg"), svg([-500, -500, numRight + 500, 1000], "HIVE.05", `${mark(HONEY, INK)}\n<path fill="${INK}" d="${r.name}"/>\n<g fill="${HONEY}">${composed}</g>`));
console.log(Object.keys(files).map((k) => `${k} ${fs.statSync(path.join(LOGO, k)).size}`).join("\n"));
console.log("kern pairs:", JSON.stringify(r.kerns));
