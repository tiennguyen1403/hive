import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ARC_ENGLISH, ARC_ENGLISH_SIDE } from "./arc-english-strings";

/**
 * The patches Arc needs to live in this app (round v5 slice 0,
 * registry/PATCHES.md), held in place. A re-install of an Arc item overwrites
 * its files with the originals; these checks are what turns red when that
 * happens, before a screen does.
 */

const FOUNDATION = join("registry", "foundation.css");
const COMPONENTS = join("registry", "components");
const ZONE = ':has([data-ui="admin"])';

interface Rule {
  /** The enclosing at-rules, outermost first: `@supports (…)`. */
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
      mark = i + 1;
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

/** A token's value, following `var(--x)` through the same block. */
function resolve(props: Map<string, string>, name: string): string {
  let value = props.get(name) ?? "";
  for (let hops = 0; hops < 5; hops++) {
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    if (!ref) break;
    value = props.get(ref[1]!) ?? "";
  }
  return value;
}

/**
 * The relative luminance of a grey written `oklch(L% 0 0)`. With no chroma,
 * OKLab's L maps to linear sRGB as L³ on every channel, so that is the
 * luminance too.
 */
function greyLuminance(value: string): number {
  const m = value.match(/^oklch\(\s*([\d.]+)%\s+0\s+0\s*\)$/);
  if (!m) throw new Error(`not a grey in oklch: ${value}`);
  return (Number(m[1]) / 100) ** 3;
}

/** WCAG's contrast ratio of two luminances. */
function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Every file under a folder, as paths. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("registry/foundation.css", () => {
  const css = readFileSync(FOUNDATION, "utf8");
  const all = rules(css);
  const light = all.find((r) => r.selector === `:root${ZONE}` && r.at.length === 0);

  it("scopes every style rule to a page with an Arc zone, at-rules included", () => {
    expect(all.length).toBeGreaterThan(30);
    for (const rule of all) {
      for (const selector of rule.selector.split(",")) {
        expect(selector, `${rule.at.join(" ")} ${rule.selector}`).toContain(ZONE);
      }
    }
    // The chart palette lives inside `@supports`: it is scoped too.
    expect(all.some((r) => r.at.some((a) => a.startsWith("@supports")))).toBe(true);
  });

  it("no longer removes every outline", () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/outline\s*:\s*none\s*!important/);
  });

  it("gives the light block a focus ring the keyboard can see", () => {
    expect(light).toBeDefined();
    const ring = customProps(light!.body).get("--focus-ring");
    expect(ring).toBeDefined();
    expect(ring).not.toBe("transparent");
  });

  it("turns the ring off while the pointer drives, on the app's data-pointer switch", () => {
    const pointer = all.find((r) => r.selector === `html[data-pointer]${ZONE}`);
    expect(pointer).toBeDefined();
    expect(customProps(pointer!.body).get("--focus-ring")).toBe("transparent");
  });

  it("sets both of Arc's type roles in Mona Sans", () => {
    const props = customProps(light!.body);
    expect(props.get("--font-display")).toBe("var(--font-mona)");
    expect(props.get("--font-body")).toBe("var(--font-mona)");
  });

  it("keeps the muted text at Arc's own 4.5:1 on both light grounds (slice 1)", () => {
    // Arc ships `var(--neutral-7)`, 59%: about 4.1:1 on white (skill-accessibility.md asks 4.5:1).
    const props = customProps(light!.body);
    const muted = greyLuminance(resolve(props, "--text-muted"));
    for (const ground of ["--surface", "--surface-muted"]) {
      expect(contrast(muted, greyLuminance(resolve(props, ground))), ground).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gives the layers portalled to <body> the zone's face and ink", () => {
    const body = all.find((r) => r.selector === `:root${ZONE} body`);
    expect(body).toBeDefined();
    expect(body!.body).toMatch(/font-family\s*:\s*var\(--font-body\)/);
    expect(body!.body).toMatch(/color\s*:\s*var\(--foreground\)/);
  });
});

describe("registry/components (patches a re-install would drop, slices 2 and 3)", () => {
  it("keeps the search field's clear button a pointer, as every other Arc button is", () => {
    const css = readFileSync(join(COMPONENTS, "search-field", "search-field.module.css"), "utf8");
    const pointer = rules(css).find(
      (r) => r.selector === ".shell button" && /cursor\s*:\s*pointer/.test(r.body),
    );
    expect(pointer).toBeDefined();
  });

  it("lets the bar chart format its value axis apart from its headline (formatTick)", () => {
    const source = readFileSync(join(COMPONENTS, "bar-chart", "bar-chart.tsx"), "utf8");
    // Round v6 slice E0: the defaults are set in the body, by the page's language, so the axis's
    // default is written `formatTickProp ?? formatValue` rather than as a default parameter.
    expect(source).toContain("formatTick = formatTickProp ?? formatValue");
    expect(source).toContain("format={formatTick}");
    expect(source).toContain("`TB ${formatTick(");
  });

  it("gives the drawer's close button the dialog's keyboard ring (slice 3, QĐ-39)", () => {
    const ring = (id: string) =>
      rules(readFileSync(join(COMPONENTS, id, `${id}.module.css`), "utf8")).find(
        (r) => r.selector === ".close:focus-visible",
      );
    const drawer = ring("drawer");
    expect(drawer).toBeDefined();
    expect(drawer!.body).toMatch(/outline\s*:\s*3px solid var\(--focus-ring\)/);
    // The same ring as the dialog's own close button, so the two overlays agree.
    expect(drawer!.body.replace(/\s+/g, "")).toBe(ring("dialog")!.body.replace(/\s+/g, ""));
  });

  it("rings the select's trigger with the zone's keyboard ring, keeping its accent border (slice 3, QĐ-39)", () => {
    const css = readFileSync(join(COMPONENTS, "select", "select.module.css"), "utf8");
    const focus = rules(css).find((r) => r.selector === ".trigger:focus-visible");
    expect(focus).toBeDefined();
    const body = focus!.body.replace(/\s+/g, " ");
    expect(body).toMatch(/outline\s*:\s*2px solid var\(--focus-ring\)/);
    expect(body).toMatch(/outline-offset\s*:\s*2px/);
    expect(body).toMatch(/border-color\s*:\s*var\(--accent\)/);
    // Arc shipped a 10% halo, `--accent-subtle`, too faint to find the field by.
    expect(body).not.toContain("--accent-subtle");
  });

  it("lets a select option carry a note at its row's end, outside the item text (slice 4)", () => {
    const source = readFileSync(join(COMPONENTS, "select", "select.tsx"), "utf8");
    // The option type takes an optional note.
    expect(source).toMatch(/options:\s*\{[^}]*\bnote\?:\s*string[^}]*\}\[\]/);
    // Drawn after the item text and before the tick, and only when there is one: without a
    // note the row is Arc's own. Outside ItemText, so the trigger and the value Radix reads
    // to assistive tech carry the label alone.
    const item = source.slice(source.indexOf("<SelectPrimitive.Item "), source.indexOf("</SelectPrimitive.Item>"));
    const text = item.indexOf("</SelectPrimitive.ItemText>");
    const note = item.indexOf("{option.note ? <span className={styles.note}>{option.note}</span> : null}");
    const tick = item.indexOf("<SelectPrimitive.ItemIndicator");
    expect(text).toBeGreaterThan(-1);
    expect(note).toBeGreaterThan(text);
    expect(tick).toBeGreaterThan(note);
    // The note's look: the row's end, the secondary ink.
    const css = readFileSync(join(COMPONENTS, "select", "select.module.css"), "utf8");
    const rule = rules(css).find((r) => r.selector === ".note");
    expect(rule).toBeDefined();
    expect(rule!.body).toMatch(/margin-left\s*:\s*auto/);
    expect(rule!.body).toMatch(/color\s*:\s*var\(--text-secondary\)/);
  });
});

describe("registry/components (the input's prefix, slice 5b)", () => {
  // `prefix` is also an HTML attribute (RDFa) in React's types, so a
  // re-install that drops the patch still type-checks: the style form's "S06 –"
  // would vanish into an attribute nobody reads. These checks catch it.
  const source = readFileSync(join(COMPONENTS, "input", "input.tsx"), "utf8");
  const css = rules(readFileSync(join(COMPONENTS, "input", "input.module.css"), "utf8"));

  it("takes a prefix, a string, and keeps it off the <input>", () => {
    expect(source).toMatch(/prefix\?:\s*string;/);
    expect(source).toContain("hideLabel = false, prefix, ...props");
  });

  it("gives the segment an id and describes the input by it, before its hint and its error", () => {
    expect(source).toContain("const prefixId = prefix ? `${controlId}-prefix` : undefined;");
    expect(source).toContain('[props["aria-describedby"], prefixId, hintId, errorId]');
    expect(source).toContain("<span id={prefixId} className={styles.prefix}");
  });

  it("draws Arc's own field when there is no prefix", () => {
    expect(source).toMatch(/\{prefix \? <span className=\{styles\.affix\}>[\s\S]*?\{input\}<\/span> : input\}/);
  });

  it("sets the segment on the muted ground, ruled off from the typing, and rings the frame", () => {
    const prefix = css.find((r) => r.selector === ".prefix");
    expect(prefix).toBeDefined();
    expect(prefix!.body).toMatch(/background\s*:\s*var\(--surface-muted\)/);
    expect(prefix!.body).toMatch(/border-right\s*:\s*1px solid var\(--border\)/);
    const frame = css.find((r) => r.selector === ".affix");
    expect(frame).toBeDefined();
    expect(frame!.body).toMatch(/border\s*:\s*1px solid var\(--border-strong\)/);
    // The keyboard ring moves to the frame (QĐ-39); the input inside draws none.
    const ring = css.find((r) => r.selector === ".affix:has(> .input:focus-visible)");
    expect(ring).toBeDefined();
    expect(ring!.body).toMatch(/box-shadow\s*:\s*0 0 0 3px var\(--focus-ring\)/);
    const inner = css.find((r) => r.selector === ".affix > .input:focus-visible");
    expect(inner!.body).toMatch(/box-shadow\s*:\s*none/);
  });
});

describe("the app's pointer switch, beside Arc's buttons (slice 3)", () => {
  it("marks the pointer only on a trusted pointerdown: Motion fakes one when Enter presses a button", () => {
    const layout = readFileSync(join("app", "layout.tsx"), "utf8");
    const listener = layout.match(/addEventListener\('pointerdown',[^\n]*/);
    expect(listener).not.toBeNull();
    expect(listener![0]).toContain("e.isTrusted");
  });
});

describe("registry/components (Vietnamese)", () => {
  const files = filesUnder(COMPONENTS).filter((f) => /\.tsx?$/.test(f));

  it("finds the installed components", () => {
    expect(files.length).toBeGreaterThanOrEqual(16);
  });

  it.each(ARC_ENGLISH)("has no $text left in $file", ({ file, text }) => {
    const source = readFileSync(join(COMPONENTS, file), "utf8");
    expect(source).not.toContain(text);
  });

  it("has none of Arc's English strings in any component file", () => {
    const hits = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return ARC_ENGLISH.filter(({ text }) => source.includes(text)).map(({ text }) => `${file}: ${text}`);
    });
    expect(hits).toEqual([]);
  });
});

describe("registry/components (both languages, round v6 slice E0)", () => {
  const patched = [...new Set(ARC_ENGLISH.map(({ file }) => file))];

  it("reads the page's language in every component patched for it", () => {
    for (const file of patched) {
      const source = readFileSync(join(COMPONENTS, file), "utf8");
      expect(source, file).toContain('import { useLocale } from "@/components/i18n/LocaleContext";');
      expect(source, file).toMatch(/useLocale\(\)/);
    }
  });

  it.each(ARC_ENGLISH_SIDE)("says Arc's own $text in $file, in English", ({ file, text }) => {
    const source = readFileSync(join(COMPONENTS, file), "utf8");
    expect(source).toContain(text);
  });

  it("lets a segmented control's option carry its own lang, on its button", () => {
    const source = readFileSync(join(COMPONENTS, "segmented-control", "segmented-control.tsx"), "utf8");
    expect(source).toMatch(/lang\?: string;/);
    expect(source).toContain("lang={option.lang}");
  });
});
