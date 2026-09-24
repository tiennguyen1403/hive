// The share board's copy of the logo, read from the canonical files in ../logo/ so the board never
// drifts from them: the mark's figure, the W3 wordmark, and the digit set with its composing rule.
// Run: node prototype/name/share/build.cjs   → writes share/logo-data.js (a script, so the board also
// opens straight from disk).
const fs = require("node:fs");
const path = require("node:path");
const LOGO = path.join(__dirname, "../logo");
const read = (f) => fs.readFileSync(path.join(LOGO, f), "utf8");

const figure = read("hive-mark.svg").match(/<path fill="#171410" d="([^"]+)"/)[1];
const lockup = read("hive-lockup.svg");
const wordmark = [...lockup.matchAll(/<path fill="#171410" d="([^"]+)"/g)].map((m) => m[1]).find((d) => d !== figure);
const nameRight = Number(lockup.match(/viewBox="-500 -500 ([\d.]+) 1000"/)[1]) - 500;
const number = JSON.parse(read("hive-number.json"));
if (!figure || !wordmark) throw new Error("logo files changed shape: figure or wordmark not found");

const data = { figure, wordmark, nameRight, number: { start: number.start, baseline: number.baseline, scale: number.scale,
  tracking: number.tracking, glyphs: number.glyphs, kern: number.kern } };
fs.writeFileSync(path.join(__dirname, "logo-data.js"), "window.HIVE_LOGO = " + JSON.stringify(data) + ";\n");
console.log("logo-data.js:", figure.length, "+", wordmark.length, "path chars;", Object.keys(number.glyphs).length, "glyphs");
