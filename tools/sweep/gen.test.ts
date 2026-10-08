import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGACY, entryNames, parseArgs, render, renderLegacy, select, unmangle } from "./gen.mjs";
import { CONTROLS, OVERLAYS, ROUTES, allEntryNames, overlayOf, routeOf, slugOf } from "./manifest.mjs";

/**
 * The sweep's single list and the scripts made from it. The full selection must stay the sweep
 * `tools/layout-sweep.js` was on 07/10/2026 (151 entries, the same names in the same order), and the copy of it in
 * `tools/layout-sweep.js` must stay the generator's own output, so the two can never list different routes.
 */

/** The page Next renders for a path: a static folder first, then `[param]`, then `[...param]`; else the 404. */
function pageFor(path: string): string {
  const segments = path.split("?")[0].split("/").filter(Boolean);
  let dir = "app";
  for (const seg of segments) {
    const entries = readdirSync(dir).filter((e) => statSync(join(dir, e)).isDirectory());
    const next = entries.find((e) => e === seg) ?? entries.find((e) => /^\[[^.]+\]$/.test(e)) ?? entries.find((e) => /^\[\.\.\..+\]$/.test(e));
    if (!next) return "app/not-found.tsx";
    dir = join(dir, next);
  }
  return existsSync(join(dir, "page.tsx")) ? `${dir.replace(/\\/g, "/")}/page.tsx` : "app/not-found.tsx";
}

describe("the manifest", () => {
  it("holds the 36 routes of the shop and the 37 of the back office, and 43 layers", () => {
    expect(ROUTES.filter((r) => r.zone === "shop")).toHaveLength(36);
    expect(ROUTES.filter((r) => r.zone === "admin")).toHaveLength(37);
    expect(OVERLAYS).toHaveLength(43);
  });

  it("gives every route and every layer a name of its own", () => {
    const names = [...ROUTES.map((r) => r.name), ...OVERLAYS.map((o) => o.name)];
    expect(new Set(names).size).toBe(names.length);
    for (const r of ROUTES) expect(r.name).toBe(slugOf(r.path));
  });

  it("hangs every layer on a route it knows, and lists each layer under its route", () => {
    for (const o of OVERLAYS) {
      const route = routeOf(o.route);
      expect(route, o.name).not.toBeNull();
      expect(route!.overlays).toContain(o.name);
      expect(o.path.split("#")[0].split("?")[0].startsWith(o.route.split("?")[0].replace(/\/DH-\d+$/, ""))).toBe(true);
      expect(typeof o.open).toBe("function");
    }
  });

  it("names files that exist, the first being the page Next renders for the path", () => {
    for (const r of ROUTES) {
      for (const c of r.components) expect(existsSync(c), `${r.path}: ${c}`).toBe(true);
      expect(r.components[0], r.path).toBe(pageFor(r.path));
    }
    for (const o of OVERLAYS) for (const c of o.components) expect(existsSync(c), `${o.name}: ${c}`).toBe(true);
  });

  it("keeps the control pages among its routes, tagged, at widths the full sweep shoots", () => {
    for (const c of CONTROLS) {
      const r = routeOf(c.path);
      expect(r, c.path).not.toBeNull();
      expect(r!.tags).toContain("control");
      // The brief's widths (the back office at 1280 only), inside the route's own.
      for (const w of c.widths) expect(r!.widths, c.path).toContain(w);
    }
  });

  it("lets a layer's `open` use only its argument, since its text runs inside the browser", () => {
    for (const o of OVERLAYS) {
      const src = o.open.toString();
      expect(src, o.name).toMatch(/^async \(\{ [\w, ]+ \}\) =>/);
      // No name from the manifest module, no Node global.
      expect(src, o.name).not.toMatch(/\b(ROUTES|OVERLAYS|ORIGIN|SHOP_WIDTHS|ADMIN_WIDTHS|require|process|import)\b/);
    }
  });
});

describe("select", () => {
  it("picks the full sweep: 232 entries, the shop one width after the other, then the back office at 1280 and 1440", () => {
    const all = select({ zone: "all" });
    const names = entryNames(all);
    expect(all.full).toBe(true);
    // The 151 of `tools/layout-sweep.js` on 07/10/2026, the receipt at both widths and every admin entry at 1440
    // since 08/10: 36 shop routes × 2 + 2 shop layers + (37 admin routes + 42 admin layers) × 2.
    expect(names).toHaveLength(232);
    expect(names.slice(0, 3)).toEqual(["home-390", "products-390", "products-s05-khoi-390"]);
    expect(names.slice(7, 10)).toEqual(["order-confirmed-390", "order-confirmed-DH-2430-390", "track-code-DH-2425&phone-0908221447-390"]);
    expect(names[36]).toBe("home-1280");
    expect(names.slice(72, 74)).toEqual(["account-addresses-add-province-390", "account-addresses-add-province-1280"]);
    expect([names[74], names[111]]).toEqual(["admin-1280", "admin-1440"]);
    expect([names[148], names[190]]).toEqual(["admin-order-more-menu-1280", "admin-order-more-menu-1440"]);
    expect(names.at(-1)).toBe("admin-product-fixed-photopick-1440");
    expect([...names].sort()).toEqual([...allEntryNames()].sort());
  });

  it("selects exactly the entries of both baselines, no more and no fewer", () => {
    // The full selection is what an end-of-round sweep shoots, and the baselines must hold one entry for each, so
    // that a slice's run of any route and width has its twin. By name, not by order: a promoted entry joins the end
    // of a baseline (`diff.mjs`, promote).
    const full = [...entryNames(select({ zone: "all" }))].sort();
    for (const lang of ["vi", "en"]) {
      const baseline = JSON.parse(readFileSync(`tools/sweep/baseline-${lang}.json`, "utf8"));
      expect(baseline.visited.map((v: { name: string }) => v.name).sort(), lang).toEqual(full);
    }
  });

  it("picks a zone, a route with its layers, a tag, a prefix, a layer alone", () => {
    expect(entryNames(select({ zone: "admin" }))).toHaveLength(158);
    expect(entryNames(select({ zone: "shop" }))).toHaveLength(74);
    const layers = ["more-menu", "cancel-sheet", "handover", "carrier-select", "address-form", "address-province", "address-ward"];
    expect(entryNames(select({ routes: ["/admin/orders/DH-2429"] }))).toEqual([
      "admin-orders-DH-2429-1280",
      "admin-orders-DH-2429-1440",
      ...layers.map((l) => `admin-order-${l}-1280`),
      ...layers.map((l) => `admin-order-${l}-1440`),
    ]);
    expect(entryNames(select({ tags: ["lookup"] }))).toEqual([
      "track-code-DH-2425&phone-0908221447-390",
      "track-390",
      "track-code-DH-2425&phone-0908221447-1280",
      "track-1280",
    ]);
    expect(entryNames(select({ routes: ["/account/orders*"] }))).toHaveLength(8);
    expect(entryNames(select({ overlays: ["admin-reset-sheet"] }))).toEqual(["admin-reset-sheet-1280", "admin-reset-sheet-1440"]);
  });

  it("takes other widths, and never sweeps the back office under 1180px", () => {
    const s = select({ routes: ["/checkout", "/admin"], widths: [900, 1100, 1440] });
    expect(entryNames(s)).toEqual([
      "checkout-900",
      "checkout-1100",
      "checkout-1440",
      "admin-1440",
      "admin-reset-sheet-1440",
      "admin-overview-day-table-1440",
    ]);
  });

  it("refuses a route, a tag or a layer it does not know", () => {
    expect(() => select({ routes: ["/nope"] })).toThrow(/no route matches/);
    expect(() => select({ tags: ["nope"] })).toThrow(/no route has the tag/);
    expect(() => select({ overlays: ["nope"] })).toThrow(/no layer/);
    expect(() => select({ zone: "everything" })).toThrow(/unknown zone/);
  });

  it("reads what impact printed: its routes, its controls and every layer of both, at their widths", () => {
    const s = select({
      impact: {
        routes: { "/account/orders/DH-2430": [899, 900, 1199] },
        overlays: { "admin-order-address-form": [1280, 1440] },
        controls: { "/admin/orders": [1280] },
      },
    });
    expect(entryNames(s)).toEqual([
      "account-orders-DH-2430-899",
      "account-orders-DH-2430-900",
      "account-orders-DH-2430-1199",
      "admin-orders-1280",
      "admin-order-address-form-1280",
      "admin-orders-row-menu-1280",
      "admin-order-address-form-1440",
    ]);
    expect(() => select({ impact: { routes: { "/nope": [390] } } })).toThrow(/does not have/);
  });
});

describe("the scripts", () => {
  it("writes a script run-code can evaluate: one function expression", () => {
    const script = render(select({ routes: ["/cart"] }), { lang: "en", label: "t", shots: ".playwright-cli/sweep/t-en" });
    expect(script).not.toMatch(/\/\*PLAN\*\//);
    expect(script.trimEnd().endsWith("}")).toBe(true);
    // Compiles without running: `run-code` wraps the file in parentheses the same way.
    expect(() => new Function(`return (${script})`)).not.toThrow();
    expect(script).toContain('"lang": "en"');
    expect(script).toContain('"shots": ".playwright-cli/sweep/t-en"');
  });

  it("copies each layer's open function into the script", () => {
    const script = render(select({ overlays: ["admin-reset-sheet"] }), { lang: "vi", label: "t", shots: "s" });
    expect(script).toContain('"open": async ({ page, T }) => {');
    expect(script).toContain("Đặt lại dữ liệu mẫu");
  });

  it("keeps tools/layout-sweep.js equal to the full Vietnamese script (npm run sweep:gen -- --legacy)", () => {
    expect(readFileSync(LEGACY, "utf8").replace(/\r\n/g, "\n")).toBe(renderLegacy());
  });
});

describe("the command line", () => {
  it("reads repeated and comma-separated options", () => {
    expect(parseArgs(["--route=/cart,/checkout", "--route", "/faq", "--lang=en", "--legacy"])).toEqual({
      route: ["/cart", "/checkout", "/faq"],
      lang: ["en"],
      legacy: ["true"],
    });
  });

  it("turns back a path Git Bash rewrote", () => {
    expect(unmangle("C:/Program Files/Git/track")).toBe("/track");
    expect(unmangle("/track")).toBe("/track");
    expect(overlayOf("admin-reset-sheet-1280")?.name).toBe("admin-reset-sheet");
  });
});
