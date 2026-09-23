import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * No class name in this app may be spelled like a Tailwind utility.
 *
 * The fault this pins, measured on `/cart` at v3 slice 4: the "Áp dụng"
 * button wears `.btn.outline`, and the build had also generated Tailwind's
 * own `.outline{outline-style:…;outline-width:1px}` — because Tailwind v4
 * scans every source file for words that look like utilities, and the scan
 * reaches `prototype/` and the stylesheets themselves. Two rules of equal
 * specificity, decided by source order, so the button drew a 1px outline on
 * top of its own 1px border. The user has asked three times for no outlines
 * anywhere.
 *
 * `app/globals.css` now imports Tailwind's theme and preflight WITHOUT
 * `utilities.css`, so nothing is generated at all — but that is one line
 * somebody could put back. This test is the other half: a class name that
 * collides with a utility is refused whether or not the utilities are being
 * emitted today.
 *
 * Only bare, parameterless names are listed. `bg-fill` or `p-4` could never
 * be mistaken for one of this system's names; `grid`, `grow`, `border` and
 * `table` were all in use here as real class names, and three of them —
 * `.grid`, `.grow`, `.table` — really were being shadowed.
 */
const UTILITY_NAMES = new Set([
  "absolute",
  "block",
  "border",
  "contents",
  "container",
  "filter",
  "fixed",
  "flex",
  "grid",
  "grow",
  "hidden",
  "inline",
  "invisible",
  "isolate",
  "italic",
  "outline",
  "relative",
  "resize",
  "ring",
  "rounded",
  "shadow",
  "shrink",
  "static",
  "sticky",
  "table",
  "transform",
  "transition",
  "truncate",
  "underline",
  "uppercase",
  "visible",
]);

/**
 * Nothing. The two names that were on this list — `grid` and `grow` — were
 * renamed to `.cardgrid` and `.fill` at v3 slice 4 rather than excused, so
 * the exemption list is empty and should stay that way. `sr-only` is not
 * here because it is not a bare utility name and, since slice 4, is defined
 * by this project in `app/styles/base.css`.
 */
const ALLOWED: string[] = [];

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...tsxFiles(path));
    else if (entry.endsWith(".tsx")) out.push(path);
  }
  return out;
}

/**
 * Every literal token inside a `className`.
 *
 * Template holes (`${tone}`) and identifiers are not literals and are not
 * checked — what they resolve to is a string somewhere else in the same
 * sweep, which is where it gets checked.
 */
function classTokens(source: string): string[] {
  const tokens: string[] = [];
  const attr = /className\s*=\s*(?:"([^"]*)"|\{([\s\S]*?)\})/g;

  for (const match of source.matchAll(attr)) {
    const literals =
      match[1] !== undefined
        ? [match[1]]
        : [...(match[2] ?? "").matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)].map(
            (m) => m[1] ?? m[2] ?? m[3] ?? "",
          );

    for (const literal of literals) {
      for (const token of literal.split(/[\s${}]+/)) {
        if (/^[a-zA-Z][\w-]*$/.test(token)) tokens.push(token);
      }
    }
  }
  return tokens;
}

describe("class names never collide with a Tailwind utility", () => {
  const files = [...tsxFiles("app"), ...tsxFiles("components")];

  it("reads every screen in the app", () => {
    // A sweep that silently walked nothing would pass forever.
    expect(files.length).toBeGreaterThan(40);
  });

  it("finds no utility name used as a class name", () => {
    const found: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const token of classTokens(source)) {
        if (UTILITY_NAMES.has(token) && !ALLOWED.includes(token)) {
          found.push(`${file}: ${token}`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it("keeps the exemption list empty", () => {
    expect(ALLOWED).toEqual([]);
  });

  it("would catch one if it came back", () => {
    const sample = `<div className="btn outline" />`;
    expect(classTokens(sample).filter((t) => UTILITY_NAMES.has(t))).toEqual([
      "outline",
    ]);
  });
});
