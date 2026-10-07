#!/usr/bin/env node
/**
 * What a change can reach (round v6, tooling slice T1): which routes and layers to shoot, at which widths, in
 * which languages, and whether the database tests and a build are due.
 *
 *   npm run impact                         the working tree (and untracked files) against HEAD
 *   npm run impact -- 5a51305~1            the working tree against a commit
 *   npm run impact -- f9ff40d~1 f9ff40d    one commit range, read from git alone
 *   npm run impact -- HEAD~1 HEAD --out=.playwright-cli/impact.json
 *                                          … saved for `npm run sweep:gen -- --impact=<file>`
 *
 * It prints `{ routes, overlays, widths, langs, db, build, controls, actions, unmapped, reasons, … }`:
 * `routes` and `overlays` map each path or layer to its widths; `controls` are the fixed control pages, always
 * there; `actions` are Server Actions the change reaches, with the routes whose forms call them (a sweep never
 * submits a form, so those routes are checked by hand, not shot); `unmapped` are changed app files that reach no
 * route of the manifest.
 *
 * How a file is followed:
 *
 *   - A file in GLOBALS (below) reaches its whole zone.
 *   - A script is read declaration by declaration (`sweep/source.mjs`). The changed lines mark their top-level
 *     declarations; a declaration that mentions a marked name is marked too; an importer is followed only when it
 *     imports a marked export. A page (a route's `components`) that ends up marked selects its route; a file
 *     only a layer draws (a layer's `components`) selects the layer and the walk stops there; a global file
 *     selects its zone and the walk stops there; a `"use server"` module goes under `actions`. Comment-only lines
 *     mark nothing. Whatever the reader cannot place marks the whole file (counted in `fallbacks`).
 *   - A Feed stylesheet (`app/styles/feed/`) is read rule by rule: each changed rule's classes are looked up in
 *     `components/`, `app/` and `lib/`, the declarations holding them are marked and followed as above, and a
 *     selector reaches the routes all its classes reach. A selector without a class outside parentheses
 *     (`[data-ui="feed"] a`, `html:has(…) body`) reaches the whole shop. The widths come from the `@media` around
 *     the rule (`widthsOf`: both edges of the band and a point just outside; 390 and 1280 without one).
 *   - The back office is shot at 1280 and 1440 whatever changed (the brief); the full sweep keeps 1280 only.
 *   - Languages: a changed string that is the `vi:` or `en:` side of a pair (or a `*_VI` / `*_EN` constant)
 *     counts for that language; anything else, CSS included, for both, except a rule limited by `:lang()`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ADMIN_MIN_WIDTH, CONTROLS, OVERLAYS, ROUTES } from "./sweep/manifest.mjs";
import {
  CODE,
  COMMENT,
  REGEX,
  commentOnly,
  cssRules,
  lineStarts,
  mediaBands,
  parseModule,
  scanJs,
  selectorClasses,
  splitSelectors,
  statementAt,
  widthsOf,
} from "./sweep/source.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The widths a slice shoots: the shop's when nothing narrower is known, the back office's always (the brief). */
export const SHOP_DEFAULT_WIDTHS = Object.freeze([390, 1280]);
export const ADMIN_IMPACT_WIDTHS = Object.freeze([1280, 1440]);

const BOTH = Object.freeze(["shop", "admin"]);

/**
 * Files whose change reaches a whole zone, and where the walk stops when it reaches them. The first block is the
 * brief's list (round v6, 07/10/2026, from Fable's reading of the code); the entries marked "added" are files the
 * brief does not name that wrap or precede every route the same way.
 */
export const GLOBALS = Object.freeze([
  // Both zones: the words and the language of every screen, the root layout and its stylesheet.
  { match: "lib/lexicon.ts", zones: BOTH },
  { match: "lib/i18n.ts", zones: BOTH },
  { match: "lib/locale.ts", zones: BOTH },
  { match: /^components\/i18n\//, zones: BOTH },
  { match: "app/globals.css", zones: BOTH },
  { match: "app/layout.tsx", zones: BOTH },
  // Both zones, added: the stylesheets `app/globals.css` imports outside any zone (`.sr-only`, the wait veil, the
  // printed page), the proxy every request passes, the build's own configuration and dependencies.
  { match: /^app\/styles\/[^/]+\.css$/, zones: BOTH },
  { match: "proxy.ts", zones: BOTH },
  { match: /^next\.config\.[cm]?[jt]s$/, zones: BOTH },
  { match: /^package(-lock)?\.json$/, zones: BOTH },
  // The shop: the Feed's chrome (bar, tabs, footer, sheets' host) and the frame every shop page renders in.
  { match: "components/feed/FeedChrome.tsx", zones: ["shop"] },
  { match: "components/feed/FeedFrame.tsx", zones: ["shop"] },
  // The back office: Arc's frame, its sidebar, the page module every screen's header uses.
  { match: /^components\/admin-arc\/ArcAdminFrame\.(tsx|module\.css)$/, zones: ["admin"] },
  { match: /^components\/admin-arc\/ArcSidebar\.(tsx|module\.css)$/, zones: ["admin"] },
  { match: "components/admin-arc/ArcPage.module.css", zones: ["admin"] },
  // The back office, added: the layout that wraps every admin route, and Arc's tokens.
  { match: "app/admin/layout.tsx", zones: ["admin"] },
  { match: "registry/foundation.css", zones: ["admin"] },
]);

/** The zones a global file reaches, or null. */
export function globalZones(file) {
  for (const g of GLOBALS) if (typeof g.match === "string" ? g.match === file : g.match.test(file)) return g.zones;
  return null;
}

/** The brief's database rule: these paths mean `npm run test:db`. Added: `seed-users`, which writes the demo accounts. */
export const DB_PATHS = [/^supabase\//, /^lib\/db\//, /^lib\/actions\//, /^data\//, /^scripts\/gen-seed/, /^scripts\/seed-users/];

/** The brief's build rule (`app/`, `components/`, `lib/`, `registry/`, CSS), and, added, what the build also reads. */
export const BUILD_PATHS = [
  /^app\//,
  /^components\//,
  /^lib\//,
  /^registry\//,
  /\.css$/,
  /^data\//,
  /^public\//,
  /^proxy\.ts$/,
  /^next\.config\./,
  /^package(-lock)?\.json$/,
  /^tsconfig\.json$/,
  /^postcss\.config\./,
];

const CODE_EXT = /\.(tsx?|mjs|jsx?)$/;
const TEST_FILE = /\.(test|dbtest)\.(tsx?|mjs|jsx?)$/;
const APP_DIRS = /^(app|components|lib|data|registry)\//;
const SEARCH_DIRS = /^(app|components|lib)\//;

// ──────────────────────────────────────────────────────────────── trees

/** The files of a tree in memory (tests): `{ path: text }`. */
export function memoryTree(files) {
  return { list: () => Object.keys(files), read: (p) => (p in files ? files[p] : null) };
}

/** The working tree: tracked and untracked files, ignored ones left out. */
export function workingTree(root = ROOT) {
  const list = git(root, ["ls-files", "--cached", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
  return {
    list: () => list,
    read: (p) => {
      const f = resolve(root, p);
      return existsSync(f) ? readFileSync(f, "utf8") : null;
    },
  };
}

/** A git revision, every app file read in one `git cat-file --batch`. */
export function revisionTree(rev, root = ROOT) {
  const list = git(root, ["ls-tree", "-r", "--name-only", rev]).split("\n").filter(Boolean);
  const wanted = list.filter((p) => APP_DIRS.test(p) || !p.includes("/"));
  const cache = new Map();
  const out = execFileSync("git", ["cat-file", "--batch"], {
    cwd: root,
    input: wanted.map((p) => `${rev}:${p}`).join("\n") + "\n",
    maxBuffer: 1 << 30,
  });
  let at = 0;
  for (const p of wanted) {
    const nl = out.indexOf(10, at);
    const head = out.subarray(at, nl).toString("utf8");
    const size = Number(head.split(" ")[2]);
    if (head.endsWith("missing") || Number.isNaN(size)) {
      at = nl + 1;
      continue;
    }
    cache.set(p, out.subarray(nl + 1, nl + 1 + size).toString("utf8"));
    at = nl + 1 + size + 1;
  }
  return {
    list: () => list,
    read: (p) => {
      if (cache.has(p)) return cache.get(p);
      try {
        return git(root, ["show", `${rev}:${p}`]);
      } catch {
        return null;
      }
    },
  };
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 30 });
}

// ──────────────────────────────────────────────────────────────── diffs

/**
 * `git diff -U0` as changes: each file with its removed lines (old numbers) and added lines (new numbers), hunk by
 * hunk.
 *
 * @param {string} text
 * @returns {{ file: string, oldFile?: string, status: string, binary: boolean,
 *   hunks: { removed: { line: number, text: string }[], added: { line: number, text: string }[] }[] }[]}
 */
export function parseDiff(text) {
  const changes = [];
  let cur = null;
  let oldLine = 0;
  let newLine = 0;
  let hunk = null;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    if (raw.startsWith("diff --git ")) {
      const m = raw.match(/^diff --git a\/(.+) b\/(.+)$/);
      cur = { file: m ? m[2] : raw.slice(11), status: "modified", binary: false, hunks: [] };
      changes.push(cur);
      hunk = null;
      continue;
    }
    if (!cur) continue;
    if (raw.startsWith("new file mode")) cur.status = "added";
    else if (raw.startsWith("deleted file mode")) cur.status = "deleted";
    else if (raw.startsWith("Binary files")) cur.binary = true;
    else if (raw.startsWith("--- ") || raw.startsWith("+++ ")) {
      const m = raw.match(/^[-+]{3} [ab]\/(.+)$/);
      if (raw.startsWith("--- ") && m) cur.oldFile = m[1];
      if (raw.startsWith("+++ ") && m) cur.file = m[1];
    } else if (raw.startsWith("@@")) {
      const m = raw.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      oldLine = Number(m[1]);
      newLine = Number(m[3]);
      if (m[2] === "0") oldLine += 1; // `-12,0`: nothing removed, the numbers count from the next line
      if (m[4] === "0") newLine += 1;
      hunk = { removed: [], added: [] };
      cur.hunks.push(hunk);
    } else if (hunk && raw.startsWith("-")) hunk.removed.push({ line: oldLine++, text: raw.slice(1) });
    else if (hunk && raw.startsWith("+")) hunk.added.push({ line: newLine++, text: raw.slice(1) });
  }
  return changes;
}

/** A file that is new: every line added. */
export function addedFile(file, text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  return { file, status: "added", binary: false, hunks: [{ removed: [], added: lines.map((t, i) => ({ line: i + 1, text: t })) }] };
}

// ──────────────────────────────────────────────────────────────── graph

/** The import graph of a tree, by name: who imports what from whom. */
export class Graph {
  constructor(tree) {
    this.tree = tree;
    this.files = tree.list().filter((p) => (APP_DIRS.test(p) || p === "proxy.ts") && !TEST_FILE.test(p));
    this.set = new Set(this.files);
    this.mods = new Map();
    this.fallbacks = 0;
    /** @type {Map<string, { from: string, kind: string, stmt: any }[]>} */
    this.importers = new Map();
    for (const f of this.files) {
      if (!CODE_EXT.test(f)) continue;
      const mod = this.mod(f);
      if (!mod) continue;
      const link = (spec, kind, stmt) => {
        const target = this.resolve(f, spec);
        if (!target) return;
        if (!this.importers.has(target)) this.importers.set(target, []);
        this.importers.get(target).push({ from: f, kind, stmt });
      };
      for (const s of mod.imports) link(s.spec, "import", s);
      for (const s of mod.reexports) link(s.spec, "reexport", s);
      for (const d of mod.decls) for (const spec of d.dynamic) link(spec, "dynamic", { spec, decl: d });
    }
  }

  mod(file) {
    if (!this.mods.has(file)) {
      const text = this.tree.read(file);
      this.mods.set(file, text === null || !CODE_EXT.test(file) ? null : parseModule(text));
    }
    return this.mods.get(file);
  }

  resolve(from, spec) {
    let base;
    if (spec.startsWith("@/")) base = spec.slice(2);
    else if (spec.startsWith(".")) base = posix.normalize(posix.join(posix.dirname(from), spec));
    else return null;
    for (const ext of ["", ".ts", ".tsx", ".mjs", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"]) {
      if (this.set.has(base + ext)) return base + ext;
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────── the walk

const routesByComponent = new Map();
for (const r of ROUTES) for (const c of r.components) routesByComponent.set(c, [...(routesByComponent.get(c) ?? []), r]);
const overlaysByComponent = new Map();
for (const o of OVERLAYS) for (const c of o.components) overlaysByComponent.set(c, [...(overlaysByComponent.get(c) ?? []), o]);

/**
 * Follow marked names through the graph.
 *
 * @param {Graph} graph
 * @param {Map<string, { locals?: Set<string>, exports?: Set<string>, all?: boolean }>} seeds
 * @param {"render" | "action"} mode
 */
export function walk(graph, seeds, mode = "render") {
  const state = new Map();
  const hit = { routes: new Set(), overlays: new Set(), zones: new Set(), actions: new Map(), ends: new Set(), files: new Set() };
  const queue = [];
  const stateOf = (f) => {
    if (!state.has(f)) state.set(f, { locals: new Set(), exports: new Set(), all: false, done: { locals: 0, exports: 0, all: false } });
    return state.get(f);
  };
  const mark = (f, { locals = [], exports = [], all = false }) => {
    const s = stateOf(f);
    for (const l of locals) s.locals.add(l);
    for (const e of exports) s.exports.add(e);
    if (all) s.all = true;
    queue.push(f);
  };
  for (const [f, seed] of seeds) mark(f, { locals: seed.locals ?? [], exports: seed.exports ?? [], all: seed.all ?? false });

  while (queue.length) {
    const file = queue.shift();
    const s = state.get(file);
    if (s.done.locals === s.locals.size && s.done.exports === s.exports.size && s.done.all === s.all) continue;
    s.done = { locals: s.locals.size, exports: s.exports.size, all: s.all };

    // What the file now exports that changed.
    const mod = graph.mod(file);
    const exports = new Set(s.exports);
    let anyDecl = s.all;
    if (mod) {
      const dirty = new Set(s.locals);
      let grew = true;
      const marked = new Set();
      while (grew) {
        grew = false;
        for (const d of mod.decls) {
          if (marked.has(d)) continue;
          if (s.all || d.names.some((n) => dirty.has(n)) || [...d.refs].some((r) => dirty.has(r))) {
            marked.add(d);
            for (const n of d.names) dirty.add(n);
            grew = true;
          }
        }
      }
      if (marked.size) anyDecl = true;
      for (const d of marked) for (const e of d.exported) exports.add(e);
      for (const e of mod.exportList) if (dirty.has(e.local)) exports.add(e.exported);
      if (s.all) exports.add("*");
    } else if (s.all || s.exports.size || s.locals.size) {
      exports.add("*"); // a stylesheet module, a JSON file: everything it gives is changed
      anyDecl = true;
    }
    if (!anyDecl && exports.size === 0) continue;
    hit.files.add(file);

    // Where the walk stops.
    const zones = globalZones(file);
    if (zones) {
      for (const z of zones) hit.zones.add(z);
      continue;
    }
    const layers = overlaysByComponent.get(file);
    if (layers) {
      for (const o of layers) hit.overlays.add(o.name);
      continue;
    }
    const routes = routesByComponent.get(file);
    if (routes) for (const r of routes) hit.routes.add(r.path);
    if (mode === "render" && mod?.directives.has("server")) {
      if (exports.size) hit.actions.set(file, new Set([...(hit.actions.get(file) ?? []), ...exports]));
      continue;
    }
    if (exports.size === 0) continue;

    const importers = graph.importers.get(file) ?? [];
    if (importers.length === 0 && !routes) hit.ends.add(file);
    const all = exports.has("*");
    for (const { from, kind, stmt } of importers) {
      if (kind === "import") {
        const locals = [];
        if (stmt.sideEffect) {
          if (CODE_EXT.test(file)) {
            graph.fallbacks += 1;
            mark(from, { all: true });
          }
          continue;
        }
        if (stmt.default && (all || exports.has("default"))) locals.push(stmt.default);
        if (stmt.namespace) locals.push(stmt.namespace);
        for (const b of stmt.named) if (all || exports.has(b.imported)) locals.push(b.local);
        if (locals.length) mark(from, { locals });
      } else if (kind === "reexport") {
        const out = [];
        if (stmt.star) {
          if (all) {
            graph.fallbacks += 1;
            mark(from, { all: true });
            continue;
          }
          out.push(...exports);
        }
        for (const b of stmt.named) if (all || b.imported === "*" || exports.has(b.imported)) out.push(b.exported);
        if (out.length) mark(from, { exports: out });
      } else if (kind === "dynamic") {
        mark(from, { locals: stmt.decl.names });
      }
    }
  }
  return hit;
}

// ─────────────────────────────────────────────────────── changed lines

/** Is a line all comment (or blank) in its version of the file? */
function scanned(text) {
  const src = text.replace(/\r\n/g, "\n");
  const { kind, literal } = scanJs(src);
  return { text: src, kind, literal, starts: lineStarts(src) };
}

/**
 * The language a changed piece of a line speaks: "vi" or "en" when every changed character sits in a string that
 * is the `vi:` or `en:` side of a pair (or a `*_VI` / `*_EN` constant), "code" otherwise.
 */
function sideOf(info, line, from, to) {
  const at = info.starts[line - 1];
  const sides = new Set();
  let any = false;
  for (let i = at + from; i < at + to; i++) {
    const ch = info.text[i];
    // Space is layout in code and content in a string: "a b" → "a  b" is a change of copy.
    if (ch === undefined || info.kind[i] === COMMENT || (/\s/.test(ch) && (info.kind[i] === CODE || info.kind[i] === REGEX))) continue;
    any = true;
    if (info.kind[i] === CODE || info.kind[i] === REGEX) return "code";
    const open = info.literal[i];
    if (open < 0) return "code";
    const before = info.text.slice(Math.max(0, open - 160), open);
    const pair = before.match(/\b(vi|en)\s*:\s*$/);
    const constant = before.match(/\b[A-Z][A-Z0-9_]*_(VI|EN)\b[^=\n]*=\s*$/);
    if (pair) sides.add(pair[1]);
    else if (constant) sides.add(constant[1].toLowerCase());
    else return "code";
  }
  if (!any) return null;
  return sides.size === 1 ? [...sides][0] : "code";
}

/** The changed span of a line against its partner: what is left after the common start and end. */
function span(a, b) {
  if (b === undefined) {
    const lead = a.match(/^\s*/)[0].length;
    return [lead, a.length];
  }
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  return [p, a.length - s];
}

/**
 * A script's change: the names its non-comment lines mark (in the new version), the languages they speak, and
 * whether the reader had to mark the whole file.
 */
function scriptSeeds(change, graph, baseText) {
  const headText = graph.tree.read(change.file);
  const seed = { locals: new Set(), exports: new Set(), all: false };
  const langs = new Set();
  let touched = false;
  const why = [];
  const head = headText === null ? null : scanned(headText);
  const old = baseText === null || baseText === undefined ? null : scanned(baseText);
  const newMod = headText === null ? null : graph.mod(change.file) ?? parseModule(headText);
  const oldMod = old ? parseModule(old.text) : null;
  const place = (mod, line, side) => {
    const at = statementAt(mod, line);
    if (at.type === "decl") {
      if (side === "new") for (const n of at.decl.names) seed.locals.add(n);
      else {
        for (const n of at.decl.names) if (newMod?.decls.some((d) => d.names.includes(n))) seed.locals.add(n);
      }
      return at.decl.names.join(", ");
    }
    if (at.type === "type") return null;
    if (at.type === "import") {
      if (side === "new") {
        // Only the bindings that are new or now come from elsewhere: `{ a }` → `{ a, b }` marks b, not a. A
        // declaration that starts using b changed lines of its own anyway.
        const s = at.stmt;
        const before = (local) => {
          for (const o of oldMod?.imports ?? []) {
            if (o.default === local) return `${o.spec}#default`;
            if (o.namespace === local) return `${o.spec}#*`;
            const b = o.named.find((x) => x.local === local);
            if (b) return `${o.spec}#${b.imported}`;
          }
          return null;
        };
        const now = [
          [s.default, `${s.spec}#default`],
          [s.namespace, `${s.spec}#*`],
          ...s.named.map((b) => [b.local, `${s.spec}#${b.imported}`]),
        ];
        for (const [local, source] of now) if (local && before(local) !== source) seed.locals.add(local);
        if (s.sideEffect) seed.all = true;
      }
      return "imports";
    }
    if (at.type === "reexport" || at.type === "export") {
      if (side === "new") {
        if (at.type === "export") seed.exports.add(at.stmt.exported);
        else for (const b of at.stmt.named) seed.exports.add(b.exported);
        if (at.type === "reexport" && at.stmt.star) seed.all = true;
      }
      return "exports";
    }
    seed.all = true;
    graph.fallbacks += 1;
    return `whole file (${at.type === "unparsed" ? at.why : "top-level statement"} at line ${line})`;
  };
  for (const h of change.hunks) {
    const paired = h.removed.length === h.added.length;
    h.added.forEach((a, i) => {
      if (!head || commentOnly(head.text, head.kind, head.starts, a.line)) return;
      touched = true;
      const partner = paired ? h.removed[i].text : undefined;
      const [from, to] = span(a.text, partner);
      const side = sideOf(head, a.line, from, to);
      if (side) langs.add(side);
      const where = place(newMod, a.line, "new");
      if (where) why.push(where);
    });
    h.removed.forEach((r, i) => {
      if (!old || commentOnly(old.text, old.kind, old.starts, r.line)) return;
      touched = true;
      const partner = paired ? h.added[i].text : undefined;
      const [from, to] = span(r.text, partner);
      const side = sideOf(old, r.line, from, to);
      if (side) langs.add(side);
      const where = place(oldMod, r.line, "old");
      if (where) why.push(where);
    });
  }
  return { seed, langs, touched, why: [...new Set(why)] };
}

/**
 * A stylesheet's change: the style rules its non-comment lines touch, each with its selector list and `@media`.
 * A line on an at-rule's own prelude touches every rule inside it; a line outside any rule (`@import`,
 * `@keyframes`) touches the whole sheet.
 */
function cssTouched(change, headText, baseText) {
  const touched = [];
  let whole = null;
  for (const [text, side] of [
    [headText, "added"],
    [baseText, "removed"],
  ]) {
    if (text === null || text === undefined) continue;
    const sheet = cssRules(text);
    const starts = lineStarts(sheet.text);
    const lines = change.hunks.flatMap((h) => h[side].map((x) => x.line));
    for (const line of lines) {
      if (commentOnly(sheet.text, sheet.kind, starts, line)) continue;
      const from = starts[line - 1];
      const to = line < starts.length ? starts[line] - 1 : sheet.text.length;
      const inRule = sheet.rules.filter((r) => r.from <= to && r.to >= from);
      if (inRule.length) {
        for (const r of inRule) touched.push(r);
        continue;
      }
      const block = sheet.blocks.find((b) => b.from <= to && b.to >= from);
      if (block && /^@media\b/i.test(block.prelude)) {
        for (const r of sheet.rules) if (r.from >= block.from && r.to <= block.to) touched.push(r);
        continue;
      }
      whole = block ? `${block.prelude.slice(0, 40)} (line ${line})` : `line ${line}, outside any rule`;
    }
  }
  const seen = new Set();
  return { rules: touched.filter((r) => (seen.has(`${r.at.join("|")}${r.selector}`) ? false : seen.add(`${r.at.join("|")}${r.selector}`))), whole };
}

// ───────────────────────────────────────────────────────────── analyze

/**
 * The impact of a set of changes.
 *
 * @param {{ head: { list(): string[], read(p: string): string | null }, base: { read(p: string): string | null },
 *   changes: any[], baseRef?: string | null, headRef?: string | null }} input
 */
export function analyze({ head, base, changes, baseRef = null, headRef = null }) {
  const graph = new Graph(head);
  const routes = new Map(); // path → Set(widths)
  const layers = new Map(); // overlay name → Set(widths)
  const langs = new Set();
  const actions = new Map(); // file → { exports: Set, routes: Set }
  /** @type {string[]} */
  const reasons = [];
  /** @type {{ file: string, why: string }[]} */
  const unmapped = [];
  const uncovered = new Set(); // pages the walk reached that no manifest route renders
  const PAGE = /^app\/(.+\/)?(page|not-found)\.tsx$/;
  const note = (hit) => {
    for (const f of hit?.ends ?? []) if (PAGE.test(f) && !routesByComponent.has(f)) uncovered.add(f);
    return hit;
  };
  let db = false;
  let build = false;

  const addRoute = (path, widths) => {
    const route = ROUTES.find((r) => r.path === path);
    const ws = route.zone === "admin" ? ADMIN_IMPACT_WIDTHS : widths;
    if (!routes.has(path)) routes.set(path, new Set());
    for (const w of ws) routes.get(path).add(w);
  };
  const addLayer = (name, widths) => {
    const layer = OVERLAYS.find((o) => o.name === name);
    const ws = layer.zone === "admin" ? ADMIN_IMPACT_WIDTHS : widths;
    if (!layers.has(name)) layers.set(name, new Set());
    for (const w of ws) layers.get(name).add(w);
  };
  const addZone = (zone, widths) => {
    for (const r of ROUTES) if (r.zone === zone) addRoute(r.path, widths);
  };
  const short = (list, n = 6) => (list.length > n ? `${list.slice(0, n).join(", ")} … (${list.length})` : list.join(", "));

  /** Apply what a walk reached, at `widths`, keeping only `only` zones when given (a stylesheet's boundary). */
  const apply = (hit, widths, only = null) => {
    const keep = (zone) => !only || only.includes(zone);
    for (const z of hit.zones) if (keep(z)) addZone(z, widths);
    for (const p of hit.routes) if (keep(ROUTES.find((r) => r.path === p).zone)) addRoute(p, widths);
    for (const n of hit.overlays) if (keep(OVERLAYS.find((o) => o.name === n).zone)) addLayer(n, widths);
    for (const [file, exps] of hit.actions) {
      if (!actions.has(file)) actions.set(file, { exports: new Set(), routes: new Set() });
      for (const e of exps) actions.get(file).exports.add(e);
    }
  };
  const describe = (hit, only = null) => {
    const keep = (zone) => !only || only.includes(zone);
    const parts = [];
    const zones = [...hit.zones].filter(keep);
    if (zones.length) parts.push(`every ${zones.join(" and ")} route`);
    const rs = [...hit.routes].filter((p) => keep(ROUTES.find((r) => r.path === p).zone));
    if (rs.length) parts.push(`routes ${short(rs)}`);
    const os = [...hit.overlays].filter((n) => keep(OVERLAYS.find((o) => o.name === n).zone));
    if (os.length) parts.push(`layers ${short(os)}`);
    if (hit.actions.size) parts.push(`actions ${[...hit.actions.keys()].join(", ")}`);
    return parts.join("; ") || "nothing a route draws";
  };

  // Class → the walk from the declarations that hold it (cached: a class can sit in many rules).
  const searchable = graph.files.filter((f) => SEARCH_DIRS.test(f) && CODE_EXT.test(f));
  const classCache = new Map();
  const reachOfClass = (cls) => {
    if (classCache.has(cls)) return classCache.get(cls);
    const re = new RegExp(`(?<![\\w-])${cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "g");
    const seeds = new Map();
    for (const f of searchable) {
      const text = head.read(f);
      if (!text || !re.test(text)) continue;
      re.lastIndex = 0;
      const mod = graph.mod(f);
      const starts = lineStarts(text.replace(/\r\n/g, "\n"));
      const seed = { locals: new Set(), all: false };
      for (const m of text.replace(/\r\n/g, "\n").matchAll(re)) {
        let line = 1;
        while (line < starts.length && starts[line] <= m.index) line++;
        const at = statementAt(mod, line);
        if (at.type === "decl") for (const n of at.decl.names) seed.locals.add(n);
        else if (at.type !== "type") seed.all = true;
      }
      if (seed.all || seed.locals.size) seeds.set(f, seed);
    }
    const out = { files: [...seeds.keys()], hit: seeds.size ? note(walk(graph, seeds)) : null };
    classCache.set(cls, out);
    return out;
  };
  const routesOfHit = (hit, zone) => {
    const rs = new Set();
    if (hit.zones.has(zone)) for (const r of ROUTES) if (r.zone === zone) rs.add(r.path);
    for (const p of hit.routes) if (ROUTES.find((r) => r.path === p).zone === zone) rs.add(p);
    return rs;
  };
  const layersOfHit = (hit, routeSet, zone) => {
    const os = new Set([...hit.overlays].filter((n) => OVERLAYS.find((o) => o.name === n).zone === zone));
    for (const o of OVERLAYS) if (routeSet.has(o.route)) os.add(o.name);
    return os;
  };

  for (const change of changes) {
    const file = change.file;
    if (file === "package.json" && change.status === "modified") {
      // Only the npm scripts changed: nothing the app builds or draws.
      try {
        const now = JSON.parse(head.read(file) ?? "{}");
        const was = JSON.parse(base.read(file) ?? "{}");
        const keys = new Set([...Object.keys(now), ...Object.keys(was)]);
        const moved = [...keys].filter((k) => JSON.stringify(now[k]) !== JSON.stringify(was[k]));
        if (moved.length && moved.every((k) => k === "scripts")) {
          reasons.push(`${file}: npm scripts only`);
          continue;
        }
      } catch {
        // not JSON on one side: read it as any other global file below
      }
    }
    if (DB_PATHS.some((re) => re.test(file))) db = true;
    if (TEST_FILE.test(file)) {
      reasons.push(`${file}: a test (npm test${/\.dbtest\./.test(file) ? ", test:db" : ""})`);
      continue;
    }
    if (BUILD_PATHS.some((re) => re.test(file))) build = true;
    const app = APP_DIRS.test(file) || file === "proxy.ts" || globalZones(file);
    if (!app) {
      if (/^supabase\//.test(file)) reasons.push(`${file}: the database (test:db)`);
      else if (/^public\//.test(file)) {
        reasons.push(`${file}: a static file; the pages that show it are not traced`);
        unmapped.push({ file, why: "static file under public/" });
      } else if (/^scripts\//.test(file)) reasons.push(`${file}: a script, not part of the app${/^scripts\/gen-seed/.test(file) ? " (seed: test:db)" : ""}`);
      else reasons.push(`${file}: not app code`);
      continue;
    }
    if (change.binary) {
      reasons.push(`${file}: binary, not read`);
      unmapped.push({ file, why: "binary" });
      continue;
    }
    const headText = head.read(file);
    const baseText = change.status === "added" ? null : base.read(change.oldFile ?? file);
    const zones = globalZones(file);
    const isCss = file.endsWith(".css") && !file.endsWith(".module.css");

    // A global file: its whole zone, at the widths of its changed rules when it is a stylesheet.
    if (zones) {
      let widths = SHOP_DEFAULT_WIDTHS;
      let lang = ["vi", "en"];
      let touched = true;
      if (isCss) {
        const t = cssTouched(change, headText, baseText);
        touched = t.rules.length > 0 || t.whole !== null;
        if (t.rules.length && !t.whole) {
          const ws = new Set();
          for (const r of t.rules) for (const w of widthsOf(mediaBands(r.at))) ws.add(w);
          widths = ws.size ? [...ws].sort((a, b) => a - b) : [];
        }
      } else if (CODE_EXT.test(file)) {
        const s = scriptSeeds(change, graph, baseText);
        touched = s.touched;
        lang = [...s.langs].flatMap((x) => (x === "code" ? ["vi", "en"] : [x]));
      }
      if (!touched) {
        reasons.push(`${file}: comments only`);
        continue;
      }
      for (const l of lang) langs.add(l);
      for (const z of zones) addZone(z, widths);
      reasons.push(`${file}: global (${zones.join(" and ")}), every route of the zone${isCss ? ` at ${widths.join(", ") || "no screen width (print)"}` : ""}`);
      continue;
    }

    // A Feed stylesheet: rule by rule, class by class, the shop only.
    if (isCss && /^app\/styles\/feed\//.test(file)) {
      const t = cssTouched(change, headText, baseText);
      if (t.whole) {
        langs.add("vi").add("en");
        addZone("shop", SHOP_DEFAULT_WIDTHS);
        reasons.push(`${file}: ${t.whole} is not inside a style rule, so every shop route`);
      }
      if (!t.rules.length && !t.whole) {
        reasons.push(`${file}: comments only`);
        continue;
      }
      for (const rule of t.rules) {
        const widths = widthsOf(mediaBands(rule.at));
        const media = rule.at.filter((a) => a.startsWith("@media")).join(" ") || "no @media";
        if (widths.length === 0) {
          reasons.push(`${file}: ${rule.selector.slice(0, 60)} only prints`);
          continue;
        }
        const selectors = splitSelectors(rule.selector);
        const parsed = selectors.map(selectorClasses);
        const ruleLangs = new Set(parsed.map((p) => p.lang ?? "both"));
        for (const l of ruleLangs) (l === "both" ? ["vi", "en"] : [l]).forEach((x) => langs.add(x));
        for (const [i, sel] of parsed.entries()) {
          const label = selectors[i].length > 70 ? `${selectors[i].slice(0, 67)}…` : selectors[i];
          if (sel.classes.length === 0) {
            addZone("shop", widths);
            reasons.push(`${file}: "${label}" (${media}) names no class, so every shop route at ${widths.join(", ")}`);
            continue;
          }
          const reaches = sel.classes.map((c) => ({ c, ...reachOfClass(c) }));
          const found = reaches.filter((x) => x.files.length);
          if (found.length === 0) {
            addZone("shop", widths);
            reasons.push(`${file}: "${label}": no file names ${sel.classes.map((c) => `.${c}`).join(" ")} (built at run time?), so every shop route at ${widths.join(", ")}`);
            continue;
          }
          let rs = null;
          let os = null;
          for (const x of found) {
            const r = x.hit ? routesOfHit(x.hit, "shop") : new Set();
            const o = x.hit ? layersOfHit(x.hit, r, "shop") : new Set();
            rs = rs === null ? r : new Set([...rs].filter((p) => r.has(p)));
            os = os === null ? o : new Set([...os].filter((n) => o.has(n)));
          }
          for (const p of rs) addRoute(p, widths);
          for (const n of os) addLayer(n, widths);
          const what = [rs.size ? `${rs.size} routes (${short([...rs], 4)})` : "", os.size ? `layers ${short([...os], 3)}` : ""].filter(Boolean).join(", ");
          const ends = [...new Set(found.flatMap((x) => [...(x.hit?.ends ?? [])]))].filter((f) => PAGE.test(f));
          const nowhere = ends.length ? `no manifest route; drawn on ${short(ends, 3)}` : "no route draws it";
          if (!what) unmapped.push({ file, why: `"${label}": ${nowhere}` });
          reasons.push(`${file}: "${label}" (${media}) → ${what || nowhere} at ${widths.join(", ")}`);
        }
      }
      continue;
    }

    // Any other stylesheet in the app (a CSS module): its importers, by the graph.
    if (file.endsWith(".css")) {
      const t = cssTouched(change, headText, baseText);
      if (!t.rules.length && !t.whole) {
        reasons.push(`${file}: comments only`);
        continue;
      }
      langs.add("vi").add("en");
      const hit = note(walk(graph, new Map([[file, { all: true }]])));
      const only = /^registry\//.test(file) ? ["admin"] : null;
      apply(hit, SHOP_DEFAULT_WIDTHS, only);
      reasons.push(`${file}: ${describe(hit, only)}`);
      if (!hit.routes.size && !hit.overlays.size && !hit.zones.size) unmapped.push({ file, why: "no route draws what imports it" });
      continue;
    }

    // A script, a JSON file.
    if (!CODE_EXT.test(file) && !file.endsWith(".json")) {
      reasons.push(`${file}: not read`);
      unmapped.push({ file, why: "a kind of file the tool does not read" });
      continue;
    }
    if (change.status === "deleted") {
      reasons.push(`${file}: deleted; its importers changed with it`);
      if (routesByComponent.has(file) || overlaysByComponent.has(file)) unmapped.push({ file, why: "a manifest component was deleted: update tools/sweep/manifest.mjs" });
      continue;
    }
    let seeds;
    let why;
    if (file.endsWith(".json")) {
      seeds = new Map([[file, { all: true }]]);
      langs.add("vi").add("en");
      why = "the whole file";
    } else {
      const s = scriptSeeds(change, graph, baseText);
      if (!s.touched) {
        reasons.push(`${file}: comments only`);
        continue;
      }
      for (const l of s.langs) (l === "code" ? ["vi", "en"] : [l]).forEach((x) => langs.add(x));
      if (!s.seed.all && !s.seed.locals.size && !s.seed.exports.size) {
        reasons.push(`${file}: types only`);
        continue;
      }
      seeds = new Map([[file, s.seed]]);
      why = s.why.join("; ");
    }
    const only = /^registry\//.test(file) ? ["admin"] : null;
    const hit = note(walk(graph, seeds));
    apply(hit, SHOP_DEFAULT_WIDTHS, only);
    if (!hit.files.has(file)) {
      // A new import nobody uses yet, a renamed local: no declaration of the file reads what changed.
      reasons.push(`${file}: ${why}, which no declaration of the file uses`);
      continue;
    }
    reasons.push(`${file}: ${why} → ${describe(hit, only)}`);
    const reached = hit.routes.size || hit.overlays.size || hit.zones.size || hit.actions.size;
    if (!reached) {
      const ends = [...hit.ends].filter((f) => f !== file);
      unmapped.push({
        file,
        why: /\/route\.ts$/.test(file) || /(opengraph|twitter)-image|manifest\.ts$/.test(file) ? "not a page (a route handler or a generated image)" : ends.length ? `reaches ${short(ends, 3)}, which no manifest route renders` : "nothing that imports it uses what changed",
      });
    }
  }

  // Server Actions: the routes whose forms call them, through the same walk.
  for (const [file, entry] of actions) {
    const hit = walk(graph, new Map([[file, { exports: entry.exports }]]), "action");
    for (const z of hit.zones) for (const r of ROUTES) if (r.zone === z) entry.routes.add(r.path);
    for (const p of hit.routes) entry.routes.add(p);
    for (const n of hit.overlays) entry.routes.add(OVERLAYS.find((o) => o.name === n).route);
  }

  // Picking a route picks its layers, at the route's widths.
  for (const o of OVERLAYS) if (routes.has(o.route)) addLayer(o.name, [...routes.get(o.route)]);

  const sorted = (set) => [...set].sort((a, b) => a - b);
  /** @type {Record<string, number[]>} */
  const routeOut = {};
  for (const r of ROUTES) if (routes.has(r.path)) routeOut[r.path] = sorted(routes.get(r.path));
  /** @type {Record<string, number[]>} */
  const layerOut = {};
  for (const o of OVERLAYS) if (layers.has(o.name)) layerOut[o.name] = sorted(layers.get(o.name)).filter((w) => o.zone === "shop" || w >= ADMIN_MIN_WIDTH);
  const widths = { shop: new Set(), admin: new Set() };
  for (const [p, ws] of Object.entries(routeOut)) for (const w of ws) widths[ROUTES.find((r) => r.path === p).zone].add(w);
  for (const [n, ws] of Object.entries(layerOut)) for (const w of ws) widths[OVERLAYS.find((o) => o.name === n).zone].add(w);
  /** @type {Record<string, number[]>} */
  const controls = {};
  for (const c of CONTROLS) controls[c.path] = [...c.widths];
  /** @type {Record<string, { exports: string[], routes: string[] }>} */
  const actionOut = {};
  for (const [file, e] of actions) actionOut[file] = { exports: [...e.exports].sort(), routes: ROUTES.filter((r) => e.routes.has(r.path)).map((r) => r.path) };
  return {
    base: baseRef,
    head: headRef,
    files: changes.length,
    routes: routeOut,
    overlays: layerOut,
    widths: { shop: sorted(widths.shop), admin: sorted(widths.admin) },
    langs: ["vi", "en"].filter((l) => langs.has(l)),
    db,
    build,
    controls,
    actions: actionOut,
    unmapped,
    uncovered: [...uncovered].sort(),
    reasons,
    fallbacks: graph.fallbacks,
  };
}

/** The result as JSON with one line per key, and one per route, layer and reason, to read and to paste. */
export function formatImpact(result) {
  const lines = ["{"];
  const keys = Object.keys(result);
  keys.forEach((k, i) => {
    const v = result[k];
    const comma = i < keys.length - 1 ? "," : "";
    const nested = (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0 && ["routes", "overlays", "controls", "actions"].includes(k)) || (Array.isArray(v) && v.length > 0 && ["unmapped", "uncovered", "reasons"].includes(k));
    if (!nested) {
      lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}${comma}`);
      return;
    }
    if (Array.isArray(v)) {
      lines.push(`  ${JSON.stringify(k)}: [`);
      v.forEach((x, j) => lines.push(`    ${JSON.stringify(x)}${j < v.length - 1 ? "," : ""}`));
      lines.push(`  ]${comma}`);
      return;
    }
    const entries = Object.entries(v);
    lines.push(`  ${JSON.stringify(k)}: {`);
    entries.forEach(([kk, vv], j) => lines.push(`    ${JSON.stringify(kk)}: ${JSON.stringify(vv)}${j < entries.length - 1 ? "," : ""}`));
    lines.push(`  }${comma}`);
  });
  lines.push("}");
  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────── the CLI

function main(argv) {
  const refs = argv.filter((a) => !a.startsWith("--"));
  const out = argv.find((a) => a.startsWith("--out="))?.slice(6) ?? null;
  if (refs.length > 2) throw new Error("usage: impact.mjs [<base> [<head>]] [--out=<file>]");
  const baseRef = refs[0] ?? "HEAD";
  const headRef = refs[1] ?? null;
  const diff = git(ROOT, ["diff", "-U0", "--no-color", "--no-renames", "--no-ext-diff", baseRef, ...(headRef ? [headRef] : [])]);
  const changes = parseDiff(diff);
  const head = headRef ? revisionTree(headRef) : workingTree();
  if (!headRef) {
    // The working tree's new files, which `git diff` does not list.
    const untracked = git(ROOT, ["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
    for (const f of untracked) {
      const text = head.read(f);
      if (text !== null && !changes.some((c) => c.file === f)) changes.push(addedFile(f, text));
    }
  }
  const base = {
    read: (p) => {
      try {
        return git(ROOT, ["show", `${baseRef}:${p}`]);
      } catch {
        return null;
      }
    },
  };
  const result = analyze({ head, base, changes, baseRef, headRef: headRef ?? "working tree" });
  const text = formatImpact(result);
  if (out) writeFileSync(resolve(ROOT, out), text + "\n");
  console.log(text);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    console.error(`impact: ${e.message}`);
    process.exitCode = 2;
  }
}
