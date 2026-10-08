import { describe, expect, it } from "vitest";
import { diffRuns, formatDiff, promote } from "./diff.mjs";

/**
 * `tools/sweep/diff.mjs`: a run against its baseline, entry by entry. The runs below are shaped as the sweep
 * returns them (`template.js`): `visited` for every entry, `results` only for the entries with findings or an
 * error, `consoleErrors` with the entry on screen.
 */

type Findings = Record<string, unknown>;
const EMPTY: Findings = { inlineBox: [], ratioSpread: [], loneButton: [], arrowCursor: [], clipped: [], smallTarget: [], tinyText: [], horizontalOverflow: null };
const tiny = (el: string) => ({ el, size: 10 });
const visit = (name: string, route: string, width: number, landedOn = route.split("?")[0].split("#")[0]) => ({ name, route, width, status: 200, landedOn });

function sweep(opts: { full?: boolean; visited: ReturnType<typeof visit>[]; findings?: Record<string, Findings>; console?: { at: string; text: string }[]; foreign?: string[] }) {
  const results = Object.entries(opts.findings ?? {}).map(([name, f]) => {
    const v = opts.visited.find((x) => x.name === name)!;
    return { route: v.route, width: v.width, name, status: 200, landedOn: v.landedOn, findings: { ...EMPTY, ...f } };
  });
  return {
    routes: opts.visited.length,
    consoleErrors: (opts.console ?? []).map((c) => ({ ...c, url: "http://127.0.0.1:3200/x" })),
    foreign: opts.foreign ?? [],
    redirected: [],
    results,
    visited: opts.visited,
    volatile: {},
    scope: { label: opts.full ? "baseline" : "slice", lang: "vi", full: Boolean(opts.full) },
  };
}

const BASE = sweep({
  full: true,
  visited: [visit("home-390", "/", 390), visit("cart-390", "/cart", 390), visit("admin-orders-1280", "/admin/orders", 1280), visit("so-999-390", "/so/999", 390)],
  findings: { "admin-orders-1280": { tinyText: [tiny('span "NV"'), tiny('span "TA"')] } },
  console: [{ at: "so-999-390", text: "Failed to load resource: 404" }],
});

describe("diffRuns", () => {
  it("finds no difference when a partial run matches the baseline on what it visited", () => {
    const run = sweep({
      visited: [visit("admin-orders-1280", "/admin/orders", 1280)],
      findings: { "admin-orders-1280": { tinyText: [tiny('span "NV"'), tiny('span "TA"')] } },
    });
    const d = diffRuns(BASE, run);
    expect(d.differs).toBe(false);
    expect([d.compared, d.same, d.outside]).toEqual([1, 1, 3]);
    expect(d.missing).toEqual([]);
    expect(formatDiff(d)).toMatch(/NO DIFFERENCE$/);
  });

  it("names a finding gained and a finding lost on the same entry", () => {
    const run = sweep({
      visited: [visit("admin-orders-1280", "/admin/orders", 1280), visit("cart-390", "/cart", 390)],
      findings: {
        "admin-orders-1280": { tinyText: [tiny('span "NV"')] },
        "cart-390": { smallTarget: [{ el: 'a.chip "Đổi"', layoutBox: "40x36", hitArea: "40x46", short: "w:4px" }] },
      },
    });
    const d = diffRuns(BASE, run);
    expect(d.differs).toBe(true);
    expect(d.changed.map((c: { name: string }) => c.name).sort()).toEqual(["admin-orders-1280", "cart-390"]);
    const admin = d.changed.find((c: { name: string }) => c.name === "admin-orders-1280");
    expect(admin.lost).toEqual({ tinyText: [JSON.stringify(tiny('span "TA"'))] });
    expect(admin.gained).toBeUndefined();
    const cart = d.changed.find((c: { name: string }) => c.name === "cart-390");
    expect(Object.keys(cart.gained)).toEqual(["smallTarget"]);
    expect(formatDiff(d)).toContain("+ smallTarget: a.chip");
  });

  it("counts repeats: two equal findings where the baseline had one is one gained", () => {
    const run = sweep({
      visited: [visit("admin-orders-1280", "/admin/orders", 1280)],
      findings: { "admin-orders-1280": { tinyText: [tiny('span "NV"'), tiny('span "TA"'), tiny('span "TA"')] } },
    });
    expect(diffRuns(BASE, run).changed[0].gained).toEqual({ tinyText: [JSON.stringify(tiny('span "TA"'))] });
  });

  it("reports a new entry, and an entry a full run left out as missing", () => {
    const run = sweep({
      full: true,
      visited: [visit("home-390", "/", 390), visit("cart-390", "/cart", 390), visit("so-999-390", "/so/999", 390), visit("admin-orders-1440", "/admin/orders", 1440)],
      findings: { "admin-orders-1440": { tinyText: [tiny('span "NV"')] } },
      console: [{ at: "so-999-390", text: "Failed to load resource: 404" }],
    });
    const d = diffRuns(BASE, run);
    expect(d.added.map((a: { name: string }) => a.name)).toEqual(["admin-orders-1440"]);
    expect(d.added[0].findings).toEqual({ tinyText: [JSON.stringify(tiny('span "NV"'))] });
    expect(d.missing).toEqual([{ name: "admin-orders-1280", route: "/admin/orders", width: 1280, why: "not visited by a full run" }]);
  });

  it("reads a partial run's gap as outside its scope, unless the manifest no longer has the route", () => {
    const base = sweep({ full: true, visited: [visit("cart-390", "/cart", 390), visit("gone-390", "/no-such-route", 390)] });
    const run = sweep({ visited: [visit("home-390", "/", 390)] });
    const d = diffRuns(base, run);
    expect(d.outside).toBe(1);
    expect(d.missing).toEqual([{ name: "gone-390", route: "/no-such-route", width: 390, why: "no longer in the manifest" }]);
  });

  it("compares the landing, the status and the console errors of each entry", () => {
    const run = sweep({
      visited: [{ ...visit("cart-390", "/cart", 390, "/sign-in"), status: 307 }, visit("so-999-390", "/so/999", 390)],
      console: [{ at: "cart-390", text: "TypeError: x is undefined" }],
    });
    const d = diffRuns(BASE, run);
    const cart = d.changed.find((c: { name: string }) => c.name === "cart-390");
    expect(cart.landedOn).toEqual(["/cart", "/sign-in"]);
    expect(cart.status).toEqual([200, 307]);
    expect(cart.console).toEqual({ gained: ["TypeError: x is undefined"], lost: [] });
    const nf = d.changed.find((c: { name: string }) => c.name === "so-999-390");
    expect(nf.console).toEqual({ gained: [], lost: ["Failed to load resource: 404"] });
  });

  it("reports a request that newly leaves the preview server", () => {
    const run = sweep({ visited: [visit("home-390", "/", 390)], foreign: ["https://fonts.googleapis.com/css2"] });
    const d = diffRuns(BASE, run);
    expect(d.foreign.gained).toEqual(["https://fonts.googleapis.com/css2"]);
    expect(d.differs).toBe(true);
  });
});

describe("promote", () => {
  it("replaces exactly the entries the run visited, and counts the totals again", () => {
    const run = sweep({
      visited: [visit("admin-orders-1280", "/admin/orders", 1280), visit("admin-orders-1440", "/admin/orders", 1440)],
      findings: { "admin-orders-1440": { tinyText: [tiny('span "NV"')] } },
    });
    const next = promote(BASE, run);
    expect(next.visited.map((v: { name: string }) => v.name)).toEqual(["home-390", "cart-390", "admin-orders-1280", "so-999-390", "admin-orders-1440"]);
    expect(next.results.map((r: { name: string }) => r.name)).toEqual(["admin-orders-1440"]);
    expect(next.totalFindings).toBe(1);
    expect(next.byDetector.tinyText).toBe(1);
    expect(next.consoleErrors).toEqual(BASE.consoleErrors);
    expect(next.scope.promoted).toEqual([{ label: "slice", entries: 2 }]);
    // After promotion the same run compares clean.
    expect(diffRuns(next, run).differs).toBe(false);
  });

  it("leaves out an entry the full sweep never visits (a slice-only band edge), so the baseline stays the full sweep", () => {
    const run = sweep({
      visited: [visit("admin-orders-1280", "/admin/orders", 1280), visit("home-1199", "/", 1199)],
      findings: { "home-1199": { tinyText: [tiny('span "NV"')] } },
    });
    const allowed = new Set(BASE.visited.map((v: { name: string }) => v.name));
    const next = promote(BASE, run, allowed);
    expect(next.visited.map((v: { name: string }) => v.name)).toEqual(["home-390", "cart-390", "admin-orders-1280", "so-999-390"]);
    expect(next.results.map((r: { name: string }) => r.name)).not.toContain("home-1199");
    expect(next.totalFindings).toBe(0);
    expect(next.scope.promoted.at(-1)).toEqual({ label: "slice", entries: 1 });
  });
});
