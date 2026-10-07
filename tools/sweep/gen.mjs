#!/usr/bin/env node
/**
 * The sweep generator (round v6, tooling slice T1).
 *
 * Picks routes and layers from `manifest.mjs`, writes them into `template.js`'s
 * slot, and saves one `playwright cli run-code` script per language. `run-code`
 * takes no arguments, so a selection has to live inside the script itself.
 *
 *   npm run sweep:gen                                  the full sweep, vi and en
 *   npm run sweep:gen -- --zone=admin --lang=en        the back office, English
 *   npm run sweep:gen -- --route=/track --tag=account  some routes, and a group
 *   npm run sweep:gen -- --overlay=admin-reset-sheet   one layer, no page
 *   npm run sweep:gen -- --width=900,1199 --zone=shop  other widths
 *   npm run sweep:gen -- --impact=.playwright-cli/impact.json
 *                                                      what `npm run impact` found
 *   npm run sweep:gen -- --legacy                      rewrite tools/layout-sweep.js
 *
 * Options: --zone=all|shop|admin, --route=<path|name|prefix*> (repeat or comma),
 * --tag=<tag>, --overlay=<name>, --width=<px,…>, --lang=vi|en|both,
 * --label=<name>, --shots=<dir>, --out=<file> (one language only).
 *
 * Routes and tags add up; the zone narrows. Picking a route picks all its
 * layers. The back office is never swept under 1180px (`ADMIN_MIN_WIDTH`).
 * Each script writes its shots to `.playwright-cli/sweep/<label>-<lang>/` and
 * returns JSON that `diff.mjs` compares with `tools/sweep/baseline-<lang>.json`.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ADMIN_MIN_WIDTH,
  OVERLAYS,
  ROUTES,
  VOLATILE,
  heightOf,
  routeOf,
  overlayOf,
} from "./manifest.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "..", "..");
const TEMPLATE = join(HERE, "template.js");
export const LEGACY = join(ROOT, "tools", "layout-sweep.js");
export const LEGACY_SHOTS = ".playwright-cli/shots";

const LANGS = ["vi", "en"];
const byNumber = (a, b) => a - b;

/** `"/account/*"` matches the route and everything under it; anything else must be a path or a name. */
function matchesRoute(route, pattern) {
  if (pattern.endsWith("*")) {
    const stem = pattern.slice(0, -1).replace(/\/$/, "");
    return route.path === stem || route.path.startsWith(`${stem}/`) || route.path.startsWith(`${stem}?`);
  }
  return route.path === pattern || route.name === pattern;
}

/** The widths an entry of `zone` is swept at, out of `wanted`. */
function allowedWidths(zone, wanted) {
  const out = zone === "admin" ? wanted.filter((w) => w >= ADMIN_MIN_WIDTH) : [...wanted];
  return [...new Set(out)].sort(byNumber);
}

/**
 * The selection, before any language: the pages and layers to visit, each with
 * its widths. Throws on a route, a tag or a layer the manifest does not know,
 * so a typo cannot pass for an empty run.
 *
 * @param {{ zone?: string, routes?: string[], tags?: string[], overlays?: string[], widths?: number[] | null,
 *   impact?: any }} [filter]
 */
export function select(filter = {}) {
  const zone = filter.zone ?? "all";
  if (!["all", "shop", "admin"].includes(zone)) throw new Error(`unknown zone "${zone}" (all, shop, admin)`);
  const inZone = (z) => zone === "all" || zone === z;
  const pages = new Map(); // route path → Set of widths
  const layers = new Map(); // overlay name → Set of widths
  const add = (map, key, widths) => {
    if (!map.has(key)) map.set(key, new Set());
    for (const w of widths) map.get(key).add(w);
  };

  if (filter.impact) {
    // What `tools/impact.mjs` printed: its routes and its controls, each at its own widths, and its layers.
    const from = (obj) => Object.entries(obj ?? {});
    for (const [path, widths] of [...from(filter.impact.routes), ...from(filter.impact.controls)]) {
      const route = routeOf(path);
      if (!route) throw new Error(`impact names a route the manifest does not have: ${path}`);
      if (inZone(route.zone)) add(pages, route.path, filter.widths ?? widths);
    }
    for (const [name, widths] of from(filter.impact.overlays)) {
      const layer = overlayOf(name);
      if (!layer) throw new Error(`impact names a layer the manifest does not have: ${name}`);
      if (inZone(layer.zone)) add(layers, layer.name, filter.widths ?? widths);
    }
    // Picking a route picks all its layers, the control pages' too, at the route's widths.
    for (const [path, widths] of pages) {
      for (const name of routeOf(path).overlays) add(layers, name, filter.widths ?? [...widths]);
    }
  } else {
    const routes = filter.routes ?? [];
    const tags = filter.tags ?? [];
    const named = filter.overlays ?? [];
    for (const p of routes) if (!ROUTES.some((r) => matchesRoute(r, p))) throw new Error(`no route matches "${p}"`);
    for (const t of tags) if (!ROUTES.some((r) => r.tags.includes(t))) throw new Error(`no route has the tag "${t}"`);
    for (const n of named) if (!overlayOf(n)) throw new Error(`no layer is called "${n}"`);
    const everything = routes.length === 0 && tags.length === 0 && named.length === 0;
    for (const r of ROUTES) {
      if (!inZone(r.zone)) continue;
      if (!everything && !routes.some((p) => matchesRoute(r, p)) && !tags.some((t) => r.tags.includes(t))) continue;
      add(pages, r.path, filter.widths ?? r.widths);
      // Picking a route picks all its layers: shut, they measure like a page that has none.
      for (const name of r.overlays) add(layers, name, filter.widths ?? overlayOf(name).widths);
    }
    for (const n of named) {
      const layer = overlayOf(n);
      if (inZone(layer.zone)) add(layers, layer.name, filter.widths ?? layer.widths);
    }
  }

  // The manifest's order, one width after the other: the order the full sweep has always kept.
  const expand = (items, zoneOf, widthsOf) => {
    const rows = [];
    items.forEach((item, index) => {
      for (const width of allowedWidths(zoneOf(item), widthsOf(item))) rows.push({ item, width, index });
    });
    return rows.sort((a, b) => a.width - b.width || a.index - b.index);
  };
  const pickedRoutes = ROUTES.filter((r) => pages.has(r.path));
  const pickedLayers = OVERLAYS.filter((o) => layers.has(o.name));
  const pageRows = expand(pickedRoutes, (r) => r.zone, (r) => [...pages.get(r.path)]);
  const layerRows = expand(pickedLayers, (o) => o.zone, (o) => [...layers.get(o.name)]);
  const pageEntry = ({ item, width }) => ({ route: item.path, width, name: `${item.name}-${width}`, zone: item.zone });
  const layerEntry = ({ item, width }) => ({
    route: item.path,
    width,
    name: `${item.name}-${width}`,
    zone: item.zone,
    open: item.open,
  });
  const entries = {
    shopPages: pageRows.filter((r) => r.item.zone === "shop").map(pageEntry),
    shopOverlays: layerRows.filter((r) => r.item.zone === "shop").map(layerEntry),
    adminPages: pageRows.filter((r) => r.item.zone === "admin").map(pageEntry),
    adminOverlays: layerRows.filter((r) => r.item.zone === "admin").map(layerEntry),
  };
  const full =
    !filter.impact &&
    zone === "all" &&
    !filter.widths &&
    !(filter.routes ?? []).length &&
    !(filter.tags ?? []).length &&
    !(filter.overlays ?? []).length;
  return { ...entries, full };
}

/** The names a selection will produce, in visit order. */
export function entryNames(selection) {
  return [...selection.shopPages, ...selection.shopOverlays, ...selection.adminPages, ...selection.adminOverlays].map(
    (e) => e.name,
  );
}

// ──────────────────────────────────────────────────────────── the script

/**
 * JavaScript source for a value: JSON for data, the source text for a function (a layer's `open`). The functions
 * only ever use their one argument, so their text runs the same inside the script as in the manifest.
 */
function source(value, indent = "  ") {
  if (typeof value === "function") {
    // The manifest's indentation, moved to where the function now sits. An `open` holds no multi-line string, so
    // shifting whole lines changes nothing it does.
    const [first, ...rest] = value.toString().replace(/\r\n/g, "\n").split("\n");
    const depth = Math.min(...rest.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    return [first, ...rest.map((l) => (l.trim() ? indent + l.slice(depth) : ""))].join("\n");
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((v) => typeof v !== "object" || v === null)) return JSON.stringify(value);
    const inner = indent + "  ";
    return `[\n${value.map((v) => inner + source(v, inner)).join(",\n")},\n${indent}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined);
    if (keys.length === 0) return "{}";
    const flat = keys.every((k) => typeof value[k] !== "object" && typeof value[k] !== "function");
    if (flat) return `{ ${keys.map((k) => `${JSON.stringify(k)}: ${JSON.stringify(value[k])}`).join(", ")} }`;
    const inner = indent + "  ";
    return `{\n${keys.map((k) => `${inner}${JSON.stringify(k)}: ${source(value[k], inner)}`).join(",\n")},\n${indent}}`;
  }
  return JSON.stringify(value);
}

/**
 * The script for one language.
 *
 * @param {ReturnType<typeof select>} selection
 * @param {{ lang: string, label: string, shots: string, filter?: object, command?: string }} opts
 */
export function render(selection, { lang, label, shots, filter = {}, command = "" }) {
  if (!LANGS.includes(lang)) throw new Error(`unknown language "${lang}" (vi, en)`);
  const strip = (rows) => rows.map(({ zone, ...rest }) => rest);
  const widths = new Set([1280]);
  for (const e of [...selection.shopPages, ...selection.shopOverlays, ...selection.adminPages, ...selection.adminOverlays]) {
    widths.add(e.width);
  }
  const heights = {};
  for (const w of [...widths].sort(byNumber)) heights[w] = heightOf(w);
  const plan = {
    lang,
    shots,
    heights,
    volatile: [...VOLATILE],
    scope: {
      label,
      lang,
      full: selection.full,
      zone: filter.zone ?? "all",
      routes: filter.routes ?? [],
      tags: filter.tags ?? [],
      overlays: filter.overlays ?? [],
      widths: filter.widths ?? null,
      impact: filter.impactFile ?? null,
      entries: entryNames(selection).length,
    },
    shopPages: strip(selection.shopPages),
    shopOverlays: strip(selection.shopOverlays),
    adminPages: strip(selection.adminPages),
    adminOverlays: strip(selection.adminOverlays),
  };
  const template = readFileSync(TEMPLATE, "utf8").replace(/\r\n/g, "\n");
  const slot = "  /*PLAN*/\n";
  if (!template.includes(slot)) throw new Error("template.js has lost its /*PLAN*/ slot");
  const body = template.replace(slot, `  const PLAN = ${source(plan, "  ")};\n`);
  const header = [
    "// GENERATED by tools/sweep/gen.mjs from tools/sweep/template.js and tools/sweep/manifest.mjs. Do not edit:",
    "// change the manifest or the template, then generate again.",
    `// Selection "${label}", ${lang}: ${entryNames(selection).length} entries.${command ? ` ${command}` : ""}`,
    "",
  ].join("\n");
  return header + body;
}

/** The full sweep's Vietnamese pass as `tools/layout-sweep.js` has always been: shots in `.playwright-cli/shots`. */
export function renderLegacy() {
  return render(select({ zone: "all" }), {
    lang: "vi",
    label: "all",
    shots: LEGACY_SHOTS,
    filter: { zone: "all" },
    command: "Rewrite with `npm run sweep:gen -- --legacy`.",
  });
}

// ────────────────────────────────────────────────────────────── the CLI

/**
 * Git Bash rewrites an argument that starts with `/` into a Windows path (`/track` → `C:/Program Files/Git/track`).
 * No route starts with a drive letter, so such a value is turned back. `MSYS_NO_PATHCONV=1` avoids it at the source.
 */
export function unmangle(value) {
  const m = value.match(/^[A-Za-z]:[\\/].*?[\\/]Git([\\/].*)$/);
  return m ? m[1].replace(/\\/g, "/") : value;
}

/** `--key=value`, `--key value` and repeated keys; commas split lists. */
export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = unmangle(argv[i]);
    if (!arg.startsWith("--")) throw new Error(`unexpected argument "${arg}"`);
    let [key, value] = arg.slice(2).split(/=(.*)/s, 2);
    if (value === undefined) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        value = next;
        i += 1;
      } else value = "true";
    }
    (out[key] ??= []).push(...value.split(",").map((v) => unmangle(v.trim())).filter(Boolean));
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  const one = (key) => args[key]?.at(-1);
  if (one("legacy") === "true") {
    writeFileSync(LEGACY, renderLegacy());
    console.log(`wrote ${relative(ROOT, LEGACY)} (the full sweep, vi, shots in ${LEGACY_SHOTS})`);
    return;
  }
  const impactFile = one("impact");
  const filter = {
    zone: one("zone") ?? "all",
    routes: args.route ?? [],
    tags: args.tag ?? [],
    overlays: args.overlay ?? [],
    widths: args.width ? args.width.map(Number) : null,
    impact: impactFile ? JSON.parse(readFileSync(resolve(ROOT, impactFile), "utf8").replace(/^[^{]*/, "")) : null,
    impactFile: impactFile ?? null,
  };
  if (filter.widths?.some((w) => !Number.isInteger(w) || w < 200)) throw new Error(`bad --width ${args.width}`);
  const selection = select(filter);
  const names = entryNames(selection);
  if (names.length === 0) throw new Error("the selection is empty");
  const langs = (one("lang") ?? (filter.impact?.langs ? filter.impact.langs.join(",") : "both"))
    .split(",")
    .flatMap((l) => (l === "both" ? LANGS : [l]));
  const label = one("label") ?? (selection.full ? "all" : filter.impact ? "impact" : filter.zone !== "all" && !filter.routes.length && !filter.tags.length && !filter.overlays.length ? filter.zone : "custom");
  if (one("out") && langs.length > 1) throw new Error("--out names one file: give --lang=vi or --lang=en with it");
  for (const lang of langs) {
    const shots = one("shots") ?? `.playwright-cli/sweep/${label}-${lang}`;
    const out = resolve(ROOT, one("out") ?? `.playwright-cli/sweep-${label}-${lang}.js`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, render(selection, { lang, label, shots, filter }));
    const rel = relative(ROOT, out).replace(/\\/g, "/");
    const json = rel.replace(/\.js$/, ".json");
    console.log(`wrote ${rel}: ${names.length} entries (${selection.shopPages.length} shop pages, ${selection.shopOverlays.length} shop layers, ${selection.adminPages.length} admin pages, ${selection.adminOverlays.length} admin layers), shots in ${shots}`);
    console.log(`  run:  npx playwright cli --raw run-code --filename=${rel} > ${json}`);
    console.log(`  diff: npm run sweep:diff -- ${json}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(`sweep:gen: ${e.message}`);
    process.exit(2);
  }
}
