import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The Feed zone (round v4, slice 0). Every Feed token and every Feed rule is
 * declared under `[data-ui="feed"]`, so that the back office — which never
 * carries the attribute — does not change by a pixel. These checks are what
 * kept that true while slices 1 to 4 ported the rest of the mock, and keep
 * it true: a rule that forgets the zone, a Feed rule that reads a v3 token,
 * a token that takes a v3 name, a value that drifts from the mock.
 */

const FEED_DIR = join("app", "styles", "feed");
const GLOBALS = join("app", "globals.css");
const MOCK = join("prototype", "explore", "feed", "feed.css");
const ZONE = '[data-ui="feed"]';

interface Rule {
  /** The enclosing at-rules, outermost first: `@media (min-width: 900px)`. */
  at: string[];
  selector: string;
  body: string;
}

/** The style rules of a stylesheet, comments stripped, with the at-rules around each. */
function rules(css: string): Rule[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Rule[] = [];
  const stack: { kind: "at" | "rule"; prelude: string; start: number }[] = [];
  let mark = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") {
      const prelude = src.slice(mark, i).trim();
      stack.push({ kind: prelude.startsWith("@") ? "at" : "rule", prelude, start: i + 1 });
      mark = i + 1;
    } else if (ch === "}") {
      const open = stack.pop();
      if (open?.kind === "rule") {
        const at = stack.filter((s) => s.kind === "at").map((s) => s.prelude);
        if (!at.some((a) => a.startsWith("@keyframes"))) {
          out.push({ at, selector: open.prelude, body: src.slice(open.start, i) });
        }
      }
      mark = i + 1;
    } else if (ch === ";" && (stack.length === 0 || stack.at(-1)!.kind === "at")) {
      mark = i + 1; // an at-statement (`@import …;`) ends here
    }
  }
  return out;
}

/** `--name: value` pairs of a declaration block. */
function customProps(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const decl of body.split(";")) {
    const m = decl.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (m) out.set(m[1]!, m[2]!);
  }
  return out;
}

/** A value as the mock and the app may each write it: hex in either case, spaces collapsed. */
const norm = (v: string) => v.replace(/\s+/g, " ").replace(/#[0-9a-fA-F]{3,8}\b/g, (h) => h.toLowerCase()).trim();

const feedFiles = readdirSync(FEED_DIR).filter((f) => f.endsWith(".css"));
const feedRules = feedFiles.flatMap((f) => rules(readFileSync(join(FEED_DIR, f), "utf8")).map((r) => ({ ...r, file: f })));
const globals = readFileSync(GLOBALS, "utf8");
const zoneTokens = new Map<string, string>();
const zoneDesktop = new Map<string, string>();
for (const r of rules(globals)) {
  if (r.selector !== ZONE) continue;
  const target = r.at.some((a) => a.includes("min-width: 900px")) ? zoneDesktop : zoneTokens;
  for (const [k, v] of customProps(r.body)) target.set(k, v);
}

describe("the Feed stylesheets stay inside the zone", () => {
  it("finds the four files and their rules", () => {
    // `account.css` since slice 3a, the mock's stylesheet of the same name.
    expect(feedFiles.sort()).toEqual(["account.css", "feed.css", "flow.css", "more.css"]);
    expect(feedRules.length).toBeGreaterThan(80);
  });

  it("scopes every selector of every rule to [data-ui=\"feed\"]", () => {
    // Three ways in: the zone itself; the zone while the keyboard drives
    // (`html[data-pointer]`); and, since slice 1a, the document while it holds
    // a zone — `html:has([data-ui="feed"] …)`, for the mock's rules that only
    // make sense on <html> and <body> (the scroll padding under the sticky
    // bar, the page lock while a sheet is open). None of the three can match
    // on a screen that carries no Feed zone.
    const loose: string[] = [];
    for (const r of feedRules) {
      for (const part of r.selector.split(",").map((s) => s.trim())) {
        const scoped =
          part.startsWith(ZONE) ||
          part.startsWith(`html[data-pointer] ${ZONE}`) ||
          part.startsWith(`html:has(${ZONE}`);
        if (!scoped) loose.push(`${r.file}: ${part}`);
      }
    }
    expect(loose).toEqual([]);
  });

  it("never wears a v3 layer name that v3 styles without .s, so no v3 rule can land on a Feed element", () => {
    // `.sheetwrap`, `.menu3`, `.toast` and `.veil` are styled bare in
    // `styles/sheet.css` and `styles/admin.css`; the mock's own `.toast`
    // (flow.css) would pick all of those rules up.
    const taken = /\.(sheetwrap|menu3|toast|veil)(?![\w-])/;
    expect(feedRules.filter((r) => taken.test(r.selector)).map((r) => `${r.file}: ${r.selector}`)).toEqual([]);
  });

  it("reads only Feed tokens, never a v3 one (`var(--ink)` inside the zone is still v3's ink)", () => {
    const foreign: string[] = [];
    for (const r of feedRules) {
      for (const m of r.body.matchAll(/var\((--[\w-]+)/g)) {
        const name = m[1]!;
        if (!name.startsWith("--f-")) foreign.push(`${r.file}: ${r.selector} → ${name}`);
      }
    }
    expect(foreign).toEqual([]);
  });

  it("reads no token the zone does not declare", () => {
    // `--f-sw` is not a token: the sheet writes it on <html> while one is
    // open (the classic scrollbar's width, as the mock's `--sw`), and only
    // the rule on <body> reads it, with a fallback. Nor is `--f-n` (slice 1b):
    // a closed issue's plate carries its name's letter count inline (the
    // mock's `--n`), and the one rule that sizes the name reads it, with a fallback.
    const RUNTIME = new Set(["--f-sw", "--f-n"]);
    const missing = new Set<string>();
    for (const r of feedRules) {
      for (const m of r.body.matchAll(/var\((--f-[\w-]+)/g)) {
        if (!zoneTokens.has(m[1]!) && !RUNTIME.has(m[1]!)) missing.add(m[1]!);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("gives every control under 44px an overlay reaching 46, the project's rule the user kept over the mock's 44", () => {
    // DESIGN.md §5: the probe (elementFromPoint) stops a pixel inside each
    // edge, so an overlay of exactly 44 reads short; v3 aims at 46. The mock
    // writes `inset:-4px 0` on 36px controls; a ported overlay must reach 46.
    const px = (v: string) => (v.trim() === "0" ? 0 : Number(v.trim().match(/^(-?[\d.]+)px$/)?.[1] ?? NaN));
    const heightOf = (selector: string) => {
      for (const r of feedRules) {
        if (!r.selector.split(",").map((s) => s.trim()).includes(selector)) continue;
        const h = r.body.match(/(?:^|;)\s*height:\s*([\d.]+)px/)?.[1];
        if (h) return Number(h);
      }
      return undefined;
    };
    const short: string[] = [];
    let checked = 0;
    for (const r of feedRules) {
      const inset = r.body.match(/(?:^|;)\s*inset:\s*([^;]+)/)?.[1];
      if (!inset) continue;
      // An overlay draws nothing. An `::after` with a border, a background or
      // an animation is a picture on a small thing — the live chip's pulsing
      // ring round its 8px dot (slice 1a) — not a way of reaching a control.
      if (/(?:^|;)\s*(border|background|animation)\s*:/.test(r.body)) continue;
      for (const part of r.selector.split(",").map((s) => s.trim()).filter((s) => s.endsWith("::after"))) {
        const control = part.slice(0, -"::after".length);
        const h = heightOf(control);
        if (h === undefined || h >= 44) continue;
        const v = inset.trim().split(/\s+/).map(px);
        const reach = h - v[0]! - (v[2] ?? v[0]!);
        checked++;
        if (!(reach >= 46)) short.push(`${r.file}: ${part} reaches ${reach}px`);
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(short).toEqual([]);
  });

  it("draws the selection and the caret in Feed's colours, the project's rule the user kept", () => {
    const zone = feedRules.find((r) => r.selector === ZONE && /caret-color/.test(r.body));
    expect(zone?.body).toMatch(/caret-color:\s*var\(--f-blue\)/);
    const selection = feedRules.find((r) => r.selector.includes("::selection"));
    expect(selection?.body).toMatch(/background:\s*var\(--f-select\)/);
    expect(selection?.body).toMatch(/color:\s*var\(--f-ink\)/);
    expect(zoneTokens.get("--f-select")).toBe("color-mix(in srgb, var(--f-blue) 24%, var(--f-white))");
  });

  it("loads after every v3 file, from globals.css, in the order the mock's account pages load them", () => {
    const imports = [...globals.matchAll(/@import "\.\/styles\/([\w/.-]+)"/g)].map((m) => m[1]);
    const feed = imports.filter((i) => i!.startsWith("feed/"));
    expect(feed).toEqual(["feed/feed.css", "feed/flow.css", "feed/account.css", "feed/more.css"]);
    // Every v3 file comes before them (since slice 5 the last is `interaction.css`).
    expect(imports.length).toBeGreaterThan(feed.length);
    expect(imports.slice(-feed.length)).toEqual(feed);
  });
});

describe("the Feed tokens", () => {
  const mockRoot = new Map<string, string>();
  const mockDesktop = new Map<string, string>();
  for (const r of rules(readFileSync(MOCK, "utf8"))) {
    if (r.selector !== ":root") continue;
    const target = r.at.some((a) => a.includes("min-width: 900px")) ? mockDesktop : mockRoot;
    for (const [k, v] of customProps(r.body)) target.set(k, v);
  }

  it("carry every token of the mock's :root under a --f- name, with the mock's value", () => {
    expect(mockRoot.size).toBe(20);
    for (const [name, value] of mockRoot) {
      const mine = zoneTokens.get(`--f-${name.slice(2)}`);
      expect(mine, name).toBeDefined();
      if (name === "--font") {
        // The family itself is next/font's (`--font-mona`); the fallbacks are the mock's.
        expect(mine!.startsWith("var(--font-mona),"), name).toBe(true);
        expect(norm(mine!.slice(mine!.indexOf(",") + 1)), name).toBe(norm(value.slice(value.indexOf(",") + 1)));
      } else {
        expect(norm(mine!), name).toBe(norm(value));
      }
    }
  });

  it("widen the gutter from 900px as the mock does", () => {
    expect([...mockDesktop]).toEqual([["--g", "32px"]]);
    expect([...zoneDesktop]).toEqual([["--f-g", "32px"]]);
  });

  it("name only the hex literals the mock's own rules write, and the four radii of its shape rule", () => {
    const mockCss = readFileSync(MOCK, "utf8");
    const extra: Record<string, string> = { "--f-bg3": "#E4E6EA", "--f-blue2": "#0F37D6", "--f-grab": "#D5D7DC" };
    for (const [token, hex] of Object.entries(extra)) {
      expect(norm(zoneTokens.get(token)!), token).toBe(norm(hex));
      expect(mockCss, token).toContain(hex);
    }
    expect(zoneTokens.get("--f-white")).toBe("#ffffff");
    expect(mockCss).toMatch(/color: #fff;/);
    expect(zoneTokens.get("--f-r-pill")).toBe("999px");
    expect(zoneTokens.get("--f-r-card")).toBe("16px");
    expect(zoneTokens.get("--f-r-sheet")).toBe("20px");
    expect(zoneTokens.get("--f-r-thumb")).toBe("10px");
  });

  it("take no name the v3 layer uses, and every one starts with --f-", () => {
    // Every custom property globals.css declares outside the zone's blocks:
    // `@theme`, the `:root` aliases and their 900px step.
    const outside = globals.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\[data-ui="feed"\]\s*\{[^}]*\}/g, "");
    const v3 = new Set([...outside.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!));
    for (const name of zoneTokens.keys()) {
      expect(name.startsWith("--f-"), name).toBe(true);
      expect(v3.has(name), name).toBe(false);
    }
    expect(v3.has("--ink") && v3.has("--color-ink") && v3.has("--bg")).toBe(true);
  });
});
