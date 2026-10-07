import { describe, expect, it } from "vitest";
import { compareImages, globToRegExp, parseIgnore } from "../pixdiff.mjs";
import { COMMENT, CODE, STRING, TEMPLATE, cssRules, declaredNames, mediaBands, parseModule, scanJs, selectorClasses, widthsOf } from "./source.mjs";

/** The reader under `tools/impact.mjs`, and the pixel comparison under `tools/pixdiff.mjs`. */

describe("scanJs", () => {
  it("tells code, comments, strings and template text apart", () => {
    const src = 'const a = "x"; // note\nconst b = `t${a}u`; /* c */';
    const { kind } = scanJs(src);
    const at = (s: string) => kind[src.indexOf(s)];
    expect(at("const a")).toBe(CODE);
    expect(at('"x"')).toBe(STRING);
    expect(at("// note")).toBe(COMMENT);
    expect(at("t${")).toBe(TEMPLATE);
    expect(kind[src.indexOf("a}u")]).toBe(CODE); // inside `${…}`
    expect(at("u`")).toBe(TEMPLATE);
    expect(at("/* c */")).toBe(COMMENT);
  });

  it("does not read a JSX closing tag as a regex, nor a division as one", () => {
    const src = "const x = <p>a</p>;\nconst y = n / 2; const z = 'q';";
    const { kind } = scanJs(src);
    expect(kind[src.indexOf("p>;")]).toBe(CODE);
    expect(kind[src.indexOf("'q'")]).toBe(STRING);
  });
});

describe("parseModule", () => {
  it("finds the top-level declarations, their exports and what each mentions", () => {
    const mod = parseModule(
      [
        '"use client";',
        'import { a, b as c, type T } from "./x";',
        'import d from "./d";',
        'import * as ns from "./ns";',
        'import type { U } from "./u";',
        "",
        "const LOCAL = a + 1;",
        "",
        "export function useIt(): number {",
        "  return LOCAL + c;",
        "}",
        "",
        "export default function Page() {",
        "  return <Thing value={useIt()} />;",
        "}",
        "",
        "export interface Shape {",
        "  x: number;",
        "}",
        "export { LOCAL as Renamed };",
        'export * from "./all";',
      ].join("\n"),
    );
    expect([...mod.directives]).toEqual(["client"]);
    expect(mod.imports.map((s) => [s.spec, s.default, s.namespace, s.named])).toEqual([
      ["./x", null, null, [{ imported: "a", local: "a" }, { imported: "b", local: "c" }]],
      ["./d", "d", null, []],
      ["./ns", null, "ns", []],
    ]);
    const byName = Object.fromEntries(mod.decls.map((d) => [d.names[0], d]));
    expect(Object.keys(byName)).toEqual(["LOCAL", "useIt", "Page"]);
    expect(byName.LOCAL.exported).toEqual(["Renamed"]);
    expect(byName.useIt.exported).toEqual(["useIt"]);
    expect(byName.Page.exported).toEqual(["default"]);
    expect(byName.useIt.refs.has("LOCAL") && byName.useIt.refs.has("c")).toBe(true);
    expect(byName.Page.refs.has("useIt")).toBe(true);
    expect([byName.useIt.start, byName.useIt.end]).toEqual([9, 12]);
    expect(mod.reexports).toEqual([{ spec: "./all", line: 21, star: true, named: [] }]);
    expect(mod.types.length).toBe(2);
  });

  it("never takes a column-0 line inside a template literal for a declaration (app/layout.tsx's POINTER_PROBE)", () => {
    const mod = parseModule("const PROBE = `\nvar de = document.documentElement;\nfunction x() {}\n`;\n\nexport const NEXT = 1;\n");
    expect(mod.decls.map((d) => d.names)).toEqual([["PROBE"], ["NEXT"]]);
    expect(mod.unparsed).toEqual([]);
  });

  it("reads several declarators and a destructuring, and skips a type annotation's commas", () => {
    expect(declaredNames("const TOP = 12, FILL = .58, MAX_BAR = 28, RADIUS = 4;")).toEqual(["TOP", "FILL", "MAX_BAR", "RADIUS"]);
    expect(declaredNames("const { spring, duration: d, ease = 1 } = motionTokens;")).toEqual(["spring", "d", "ease"]);
    expect(declaredNames("export const X: Record<string, Pair> = { a: 1, b: (x) => x };".replace("export ", ""))).toEqual(["X"]);
    expect(declaredNames("const f: (a: number, b: number) => void = () => {};")).toEqual(["f"]);
    expect(declaredNames("const { a: { b } } = c;")).toBeNull();
  });
});

describe("cssRules, selectorClasses, mediaBands, widthsOf", () => {
  it("places each rule with the at-rules around it", () => {
    const sheet = cssRules('.a { x: 1; }\n/* { not a rule } */\n@media (min-width: 900px) {\n  .b .c:hover { y: 2; }\n}\n');
    expect(sheet.rules.map((r) => [r.at, r.selector])).toEqual([
      [[], ".a"],
      [["@media (min-width: 900px)"], ".b .c:hover"],
    ]);
  });

  it("names the classes outside parentheses, and a :lang() limit", () => {
    expect(selectorClasses('[data-ui="feed"] .od-right .acc-sec:first-child')).toEqual({ classes: ["od-right", "acc-sec"], lang: null });
    expect(selectorClasses('html:has([data-ui="feed"] .sheet.open) body')).toEqual({ classes: [], lang: null });
    expect(selectorClasses('[data-ui="feed"] .size:has(input:disabled)::after')).toEqual({ classes: ["size"], lang: null });
    expect(selectorClasses('[data-ui="feed"]:lang(en) .b-hero-no')).toEqual({ classes: ["b-hero-no"], lang: "en" });
  });

  it("reads the width bands of @media, print and other features", () => {
    expect(mediaBands([])).toBeNull();
    expect(mediaBands(["@media (min-width: 900px) and (max-width: 1199.98px)"])).toEqual([{ lo: 900, hi: 1199.98 }]);
    expect(mediaBands(["@media print"])).toBe("print");
    expect(mediaBands(["@media (prefers-reduced-motion: reduce)"])).toBeNull();
    expect(mediaBands(["@media (min-width: 900px)", "@media (max-width: 999.98px)"])).toEqual([{ lo: 900, hi: 999.98 }]);
    expect(mediaBands(["@media (width < 600px)"])).toEqual([{ lo: null, hi: 599.98 }]);
  });

  it("shoots a band at both edges and a point outside it, and 390 and 1280 without one", () => {
    expect(widthsOf(null)).toEqual([390, 1280]);
    expect(widthsOf("print")).toEqual([]);
    expect(widthsOf([{ lo: 900, hi: 1199.98 }])).toEqual([899, 900, 1199]);
    expect(widthsOf([{ lo: 900, hi: null }])).toEqual([899, 900, 1280]);
    expect(widthsOf([{ lo: null, hi: 599.98 }])).toEqual([390, 599, 600]);
  });
});

describe("pixdiff's comparison", () => {
  const image = (w: number, h: number, paint?: (x: number, y: number) => number) => {
    const data = new Uint8Array(w * h * 4).fill(255);
    if (paint) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[(y * w + x) * 4] = paint(x, y);
    return { data, width: w, height: h };
  };

  it("finds nothing between equal images", () => {
    expect(compareImages(image(40, 60), image(40, 60))).toMatchObject({ sameSize: true, diff: 0, percent: 0, bands: [] });
  });

  it("counts the differing pixels and the 20px bands they sit in", () => {
    const b = image(40, 60, (x, y) => (y === 25 && x >= 10 && x < 20 ? 0 : 255));
    expect(compareImages(image(40, 60), b)).toMatchObject({ diff: 10, percent: Number(((10 / 2400) * 100).toFixed(4)), bands: [{ y0: 20, y1: 39, x0: 10, x1: 19, n: 10 }] });
  });

  it("leaves out a box, and says when the sizes differ", () => {
    const b = image(40, 60, (x, y) => (y === 25 && x >= 10 && x < 20 ? 0 : 255));
    expect(compareImages(image(40, 60), b, [[8, 20, 20, 10]]).diff).toBe(0);
    expect(compareImages(image(40, 60), image(40, 70)).sameSize).toBe(false);
  });

  it("reads an ignore box and a name pattern", () => {
    const ig = parseIgnore("home-*.png:0,560,390,40");
    expect(ig.box).toEqual([0, 560, 390, 40]);
    expect(ig.test("home-390.png") && !ig.test("cart-390.png")).toBe(true);
    expect(globToRegExp("admin-?-1280").test("admin-x-1280")).toBe(true);
    expect(() => parseIgnore("home.png")).toThrow();
  });
});
