/*
 * Copies one Fontsource stylesheet and its woff2 files into a direction's fonts/ folder,
 * keeping only the latin, latin-ext and vietnamese subsets, so pages never load a font over the network.
 *
 *   node prototype/explore/tools/fetch-font.cjs <package> <css> <dest-dir>
 *
 * Examples:
 *   node prototype/explore/tools/fetch-font.cjs @fontsource/mona-sans 400.css prototype/explore/feed/fonts
 *   node prototype/explore/tools/fetch-font.cjs @fontsource-variable/mona-sans wdth.css prototype/explore/feed/fonts
 *
 * Static packages name their sheets by weight ("400.css", "700-italic.css"). Variable packages offer
 * "index.css" (weight axis), "wdth.css" / "wdth-italic.css" (width and weight), "opsz.css", "full.css" and so on;
 * the package's page on jsdelivr lists them.
 *
 * Writes <dest-dir>/<package-name>-<css> with url() pointing at the local files. Link that file from the page.
 */
const fs = require("fs");
const path = require("path");

const [pkg, css, dest] = process.argv.slice(2);
if (!pkg || !css || !dest) {
  console.error("usage: node prototype/explore/tools/fetch-font.cjs <package> <css> <dest-dir>");
  process.exit(2);
}
const base = `https://cdn.jsdelivr.net/npm/${pkg}@5/`;
const KEEP = /-(latin|latin-ext|vietnamese)-/;

(async () => {
  const res = await fetch(base + css);
  if (!res.ok) throw new Error(`${res.status} for ${base + css}`);
  const text = await res.text();
  const blocks = text.split(/(?=\/\* )/).filter((b) => b.includes("@font-face"));
  const kept = blocks.filter((b) => {
    const m = b.match(/url\(\.\/files\/([^)]+\.woff2)\)/);
    return m && KEEP.test(m[1]);
  });
  if (!kept.length) throw new Error("no latin/latin-ext/vietnamese blocks in " + css);
  fs.mkdirSync(dest, { recursive: true });
  const out = [];
  for (const block of kept) {
    const file = block.match(/url\(\.\/files\/([^)]+\.woff2)\)/)[1];
    const target = path.join(dest, file);
    if (!fs.existsSync(target)) {
      const r = await fetch(base + "files/" + file);
      if (!r.ok) throw new Error(`${r.status} for ${file}`);
      fs.writeFileSync(target, Buffer.from(await r.arrayBuffer()));
    }
    // Drop the woff fallback that static sheets list after the woff2.
    out.push(block.replace(/url\(\.\/files\/([^)]+\.woff2)\)/, "url(./$1)").replace(/,\s*url\(\.\/files\/[^)]+\.woff\)\s*format\('woff'\)/, ""));
  }
  const name = pkg.split("/").pop() + "-" + css;
  fs.writeFileSync(path.join(dest, name), out.join("\n"));
  const vi = kept.some((b) => /-vietnamese-/.test(b));
  console.log(`${name}: ${kept.length} faces${vi ? " incl. vietnamese" : "  WARNING: no vietnamese subset"}`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
