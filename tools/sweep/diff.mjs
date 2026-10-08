#!/usr/bin/env node
/**
 * A sweep against its baseline, route by route (round v6, tooling slice T1).
 *
 *   npm run sweep:diff -- .playwright-cli/sweep-admin-en.json
 *   npm run sweep:diff -- run.json --baseline tools/sweep/baseline-en.json
 *   npm run sweep:diff -- run.json --json            the comparison as JSON
 *   npm run sweep:promote -- run.json                the run becomes the baseline for the entries it covered
 *
 * The baseline is `tools/sweep/baseline-<lang>.json`, the language read from
 * the run's own `scope`. Entries are matched by name (`account-orders-DH-2430-390`),
 * and only those the run visited are compared, so a partial run reads as
 * partial, not as a hundred lost routes. For each it compares the seven
 * detectors' findings, the status, where the page landed (a redirect), an
 * error, and the console errors seen while it was on screen. It prints:
 *
 *   new       visited now, not in the baseline (a new route, a new width)
 *   missing   in the baseline and should have been visited: the run was full,
 *             or the manifest no longer has the route
 *   changed   findings gained or lost, another status, another landing,
 *             another error, other console errors
 *
 * Exit 0 when nothing differs, 1 when something does, 2 on a usage error.
 *
 * Promotion (README, "luật thăng mốc"): once a slice is approved, its run
 * replaces the baseline for exactly the entries it visited, findings and
 * shots alike, and nothing else.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { entryNames, select } from "./gen.mjs";
import { OVERLAYS, ROUTES } from "./manifest.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");

export const DETECTORS = [
  "inlineBox",
  "ratioSpread",
  "loneButton",
  "arrowCursor",
  "clipped",
  "smallTarget",
  "tinyText",
  "horizontalOverflow",
];

/** A sweep's JSON, whatever the CLI printed before it. */
export function loadRun(file) {
  const raw = readFileSync(file, "utf8");
  const at = raw.indexOf("{");
  if (at === -1) throw new Error(`${file} holds no JSON`);
  return JSON.parse(raw.slice(at));
}

const pathPart = (route) => route.split("?")[0].split("#")[0];

/** Every entry of a run by name: what it visited, its findings, and the console errors seen on it. */
export function entriesOf(run) {
  const map = new Map();
  const ensure = (name, route, width) => {
    if (!map.has(name)) map.set(name, { name, route, width, status: null, landedOn: null, error: null, findings: null, console: [] });
    return map.get(name);
  };
  for (const v of run.visited ?? []) {
    const e = ensure(v.name, v.route, v.width);
    e.status = v.status ?? null;
    e.landedOn = v.landedOn ?? null;
    e.error = v.error ?? null;
  }
  for (const r of run.results ?? []) {
    const e = ensure(r.name, r.route, r.width);
    e.findings = r.findings ?? null;
    if (r.error) e.error = r.error;
    if (e.status === null && r.status !== undefined) e.status = r.status;
    if (e.landedOn === null && r.landedOn !== undefined) e.landedOn = r.landedOn;
  }
  // Console errors carry the entry on screen (`at`) since tooling slice T1; an older run only has the URL, which is
  // matched to every entry with that path.
  for (const c of run.consoleErrors ?? []) {
    if (c.at && map.has(c.at)) map.get(c.at).console.push(c.text);
    else if (!c.at) {
      const path = (c.url ?? "").replace(/^https?:\/\/[^/]+/, "").split("?")[0].split("#")[0] || "/";
      for (const e of map.values()) if (pathPart(e.route) === path) e.console.push(c.text);
    }
  }
  return map;
}

/** The findings as `detector → [canonical item]`, empty detectors dropped. */
function findingItems(findings) {
  const out = {};
  for (const d of DETECTORS) {
    const v = findings?.[d];
    const items = Array.isArray(v) ? v.map((x) => JSON.stringify(x)) : v ? [JSON.stringify(v)] : [];
    if (items.length) out[d] = items;
  }
  return out;
}

/** What `b` has that `a` has not, counting repeats (a multiset difference). */
function minus(a, b) {
  const left = new Map();
  for (const x of b) left.set(x, (left.get(x) ?? 0) + 1);
  const out = [];
  for (const x of a) {
    const n = left.get(x) ?? 0;
    if (n > 0) left.set(x, n - 1);
    else out.push(x);
  }
  return out;
}

const countOf = (findings) => Object.values(findingItems(findings)).reduce((n, v) => n + v.length, 0);

/** Is the route or layer behind an entry still in the manifest? */
function inManifest(entry) {
  return ROUTES.some((r) => r.path === entry.route) || OVERLAYS.some((o) => o.path === entry.route);
}

/**
 * The comparison.
 *
 * @param {any} base the baseline's JSON
 * @param {any} run the run's JSON
 */
export function diffRuns(base, run) {
  const warnings = [];
  if (!base.visited) warnings.push("the baseline has no `visited` list (made before tooling slice T1): new and missing entries cannot be told");
  if (!run.visited) warnings.push("the run has no `visited` list (made before tooling slice T1): only entries with findings are compared");
  const B = entriesOf(base);
  const R = entriesOf(run);
  const full = Boolean(run.scope?.full);
  /** @type {any[]} */
  const added = [];
  /** @type {any[]} */
  const missing = [];
  /** @type {any[]} */
  const changed = [];
  let same = 0;
  let outside = 0;

  for (const [name, r] of R) {
    const b = B.get(name);
    if (!b) {
      if (base.visited) added.push({ name, route: r.route, width: r.width, status: r.status, landedOn: r.landedOn, error: r.error, findings: findingItems(r.findings), console: r.console });
      continue;
    }
    const fb = findingItems(b.findings);
    const fr = findingItems(r.findings);
    const gained = {};
    const lost = {};
    for (const d of DETECTORS) {
      const plus = minus(fr[d] ?? [], fb[d] ?? []);
      const less = minus(fb[d] ?? [], fr[d] ?? []);
      if (plus.length) gained[d] = plus;
      if (less.length) lost[d] = less;
    }
    /** @type {Record<string, any>} */
    const change = { name, route: r.route, width: r.width };
    if (Object.keys(gained).length) change.gained = gained;
    if (Object.keys(lost).length) change.lost = lost;
    if (b.status !== r.status && b.status !== null && r.status !== null) change.status = [b.status, r.status];
    if (b.landedOn !== r.landedOn && b.landedOn !== null && r.landedOn !== null) change.landedOn = [b.landedOn, r.landedOn];
    if ((b.error ?? null) !== (r.error ?? null)) change.error = [b.error ?? null, r.error ?? null];
    const consolePlus = minus(r.console, b.console);
    const consoleLess = minus(b.console, r.console);
    if (consolePlus.length || consoleLess.length) change.console = { gained: consolePlus, lost: consoleLess };
    if (Object.keys(change).length > 3) changed.push(change);
    else same += 1;
  }
  for (const [name, b] of B) {
    if (R.has(name)) continue;
    if (!run.visited) continue;
    if (full || !inManifest(b)) missing.push({ name, route: b.route, width: b.width, why: full ? "not visited by a full run" : "no longer in the manifest" });
    else outside += 1;
  }
  const foreignPlus = [...new Set(run.foreign ?? [])].filter((u) => !(base.foreign ?? []).includes(u));
  const foreignLess = [...new Set(base.foreign ?? [])].filter((u) => !(run.foreign ?? []).includes(u));
  return {
    run: { label: run.scope?.label ?? null, lang: run.scope?.lang ?? null, full, entries: R.size },
    baseline: { label: base.scope?.label ?? null, lang: base.scope?.lang ?? null, entries: B.size },
    compared: same + changed.length,
    same,
    changed,
    added,
    missing,
    outside,
    foreign: { gained: foreignPlus, lost: foreignLess },
    warnings,
    differs: changed.length > 0 || added.length > 0 || missing.length > 0 || foreignPlus.length > 0 || foreignLess.length > 0,
  };
}

/** The comparison in words, for a terminal and a report. */
export function formatDiff(d, { runFile = "run", baseFile = "baseline" } = {}) {
  const lines = [];
  lines.push(
    `sweep:diff ${runFile} (${d.run.label ?? "?"}, ${d.run.lang ?? "?"}, ${d.run.entries} entries) vs ${baseFile} (${d.baseline.label ?? "?"}, ${d.baseline.lang ?? "?"}, ${d.baseline.entries} entries)`,
  );
  for (const w of d.warnings) lines.push(`  warning: ${w}`);
  lines.push(
    `compared ${d.compared}: ${d.same} same, ${d.changed.length} changed; ${d.added.length} new, ${d.missing.length} missing; ${d.outside} baseline entries outside this run`,
  );
  const item = (s) => {
    const x = JSON.parse(s);
    return typeof x === "object" && x ? Object.values(x).join(" | ") : String(x);
  };
  for (const a of d.added) {
    const n = Object.values(a.findings).reduce((k, v) => k + v.length, 0);
    const by = Object.entries(a.findings).map(([k, v]) => `${k} ${v.length}`).join(", ");
    lines.push(`  + new      ${a.name}: status ${a.status}, ${n} findings${by ? ` (${by})` : ""}${a.error ? `, ERROR ${a.error}` : ""}${a.console.length ? `, ${a.console.length} console errors` : ""}`);
    for (const [k, v] of Object.entries(a.findings)) for (const s of v) lines.push(`      ${k}: ${item(s)}`);
  }
  for (const m of d.missing) lines.push(`  - missing  ${m.name} (${m.why})`);
  for (const c of d.changed) {
    lines.push(`  ~ changed  ${c.name}`);
    for (const [k, v] of Object.entries(c.gained ?? {})) for (const s of v) lines.push(`      + ${k}: ${item(s)}`);
    for (const [k, v] of Object.entries(c.lost ?? {})) for (const s of v) lines.push(`      - ${k}: ${item(s)}`);
    if (c.status) lines.push(`      status ${c.status[0]} -> ${c.status[1]}`);
    if (c.landedOn) lines.push(`      landed on ${c.landedOn[0]} -> ${c.landedOn[1]}`);
    if (c.error) lines.push(`      error ${c.error[0] ?? "none"} -> ${c.error[1] ?? "none"}`);
    for (const t of c.console?.gained ?? []) lines.push(`      + console: ${t.slice(0, 160)}`);
    for (const t of c.console?.lost ?? []) lines.push(`      - console: ${t.slice(0, 160)}`);
  }
  for (const u of d.foreign.gained) lines.push(`  + request leaving 3200: ${u}`);
  for (const u of d.foreign.lost) lines.push(`  - request leaving 3200: ${u}`);
  lines.push(d.differs ? "DIFFERENT" : "NO DIFFERENCE");
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────── promotion

/**
 * The baseline after an approved slice: every entry the run visited replaces the baseline's entry of the same name
 * (or joins it), with its findings, landing, console errors and clock boxes; the other entries stay as they were.
 * The totals are counted again from the result.
 *
 * `allowed`, when given, is the set of entry names the full sweep visits (`entryNames(select({ zone: "all" }))`):
 * an entry outside it — a band edge such as 1199 or 1200 that `impact` added for one slice — is checked by that
 * slice's run but never joins the baseline, so the baseline stays exactly the full sweep (`gen.test.ts` pins that).
 *
 * @param {any} base
 * @param {any} run
 * @param {Set<string> | null} [allowed]
 */
export function promote(base, run, allowed = null) {
  const names = new Set((run.visited ?? []).map((v) => v.name).filter((n) => !allowed || allowed.has(n)));
  if (names.size === 0) throw new Error("the run has no `visited` entry to promote");
  const visited = (base.visited ?? []).map((v) => (names.has(v.name) ? run.visited.find((x) => x.name === v.name) : v));
  for (const v of run.visited) if (names.has(v.name) && !visited.some((x) => x.name === v.name)) visited.push(v);
  const results = [
    ...(base.results ?? []).filter((r) => !names.has(r.name)),
    ...(run.results ?? []).filter((r) => names.has(r.name)),
  ];
  const order = new Map(visited.map((v, i) => [v.name, i]));
  results.sort((a, b) => (order.get(a.name) ?? 1e9) - (order.get(b.name) ?? 1e9));
  const consoleErrors = [
    ...(base.consoleErrors ?? []).filter((c) => !names.has(c.at)),
    ...(run.consoleErrors ?? []).filter((c) => names.has(c.at)),
  ];
  const volatile = { ...(base.volatile ?? {}) };
  for (const n of names) delete volatile[n];
  for (const [n, boxes] of Object.entries(run.volatile ?? {})) if (names.has(n)) volatile[n] = boxes;
  const byDetector = Object.fromEntries(DETECTORS.map((d) => [d, 0]));
  let totalFindings = 0;
  for (const r of results) {
    for (const d of DETECTORS) {
      const v = r.findings?.[d];
      const n = Array.isArray(v) ? v.length : v ? 1 : 0;
      byDetector[d] += n;
      totalFindings += n;
    }
  }
  const redirected = visited
    .filter((v) => v.landedOn && v.landedOn !== pathPart(v.route))
    .map((v) => `${v.route} -> ${v.landedOn}`);
  const promoted = [...(base.scope?.promoted ?? []), { label: run.scope?.label ?? null, entries: names.size }];
  return {
    ...base,
    routes: visited.length,
    totalFindings,
    byDetector,
    consoleErrors,
    foreign: [...new Set([...(base.foreign ?? []), ...(run.foreign ?? [])])],
    redirected,
    results,
    visited,
    volatile,
    scope: { ...(base.scope ?? {}), promoted },
  };
}

// ────────────────────────────────────────────────────────────── the CLI

function main(argv) {
  const files = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json" || a === "--promote") opts[a.slice(2)] = true;
    else if (a.startsWith("--baseline")) opts.baseline = a.includes("=") ? a.split("=")[1] : argv[++i];
    else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
    else files.push(a);
  }
  if (files.length !== 1) throw new Error("usage: diff.mjs <run.json> [--baseline <file>] [--json | --promote]");
  const runFile = resolve(ROOT, files[0]);
  const run = loadRun(runFile);
  const lang = run.scope?.lang;
  const baseFile = resolve(ROOT, opts.baseline ?? join("tools", "sweep", `baseline-${lang ?? "vi"}.json`));
  if (!opts.baseline && !lang) throw new Error("the run names no language (`scope.lang`): give --baseline");
  const base = loadRun(baseFile);
  const rel = (f) => relative(ROOT, f).replace(/\\/g, "/");
  if (opts.promote) {
    const allowed = new Set(entryNames(select({ zone: "all" })));
    const next = promote(base, run, allowed);
    writeFileSync(baseFile, JSON.stringify(next, null, 1) + "\n");
    // The shots follow the findings: the run's shot of each promoted entry replaces the baseline's.
    const promoted = run.visited.filter((v) => allowed.has(v.name));
    const skipped = run.visited.length - promoted.length;
    let copied = 0;
    if (run.shots && base.shots) {
      mkdirSync(resolve(ROOT, base.shots), { recursive: true });
      for (const v of promoted) {
        const from = resolve(ROOT, run.shots, `${v.name}.png`);
        if (existsSync(from)) {
          copyFileSync(from, resolve(ROOT, base.shots, `${v.name}.png`));
          copied += 1;
        }
      }
    }
    console.log(
      `promoted ${promoted.length} entries of ${rel(runFile)} into ${rel(baseFile)}; ${copied} shots copied into ${base.shots}` +
        (skipped ? `; ${skipped} entries outside the full sweep (slice-only widths) left out` : ""),
    );
    return 0;
  }
  const d = diffRuns(base, run);
  console.log(opts.json ? JSON.stringify(d, null, 1) : formatDiff(d, { runFile: rel(runFile), baseFile: rel(baseFile) }));
  return d.differs ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(`sweep:diff: ${e.message}`);
    process.exitCode = 2;
  }
}
