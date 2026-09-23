import { describe, it, expect } from "vitest";
import { GLYPH_NAMES, MARK_NAMES, OPTICAL, frameOf, inkVars, viewBoxOf } from "./Icon";
import {
  ICON_NAMES,
  INK,
  INK_DUO,
  INK_FALLBACK,
  PATHS_BULK,
  PATHS_LINEAR,
  type IconName,
} from "./paths";
import fixture from "./ink.fixture.json";

type Row = [name: IconName, bulk: boolean, il: string, ir: string];
const EXPECTED = fixture as Row[];

/**
 * Names added after the prototype was approved. The mock never drew them, so
 * `ink.fixture.json` has no row to compare them against.
 */
const ADDED_AFTER_MOCK: IconName[] = ["heart-slash"];

describe("the icon set", () => {
  it("has both variants of every name", () => {
    expect(ICON_NAMES).toHaveLength(52);
    for (const n of ICON_NAMES) {
      expect(PATHS_LINEAR[n], `${n} linear`).toBeTruthy();
      expect(PATHS_BULK[n], `${n} bulk`).toBeTruthy();
    }
  });

  it("keeps heart-slash, which the approved mock never drew", () => {
    // The wishlist's unsave button wears it. `prototype/src/icons_iconsax.py`
    // has no HeartSlash in its import map, so regenerating this file from the
    // prototype would drop the glyph and leave that button empty. Extracted
    // from the same iconsax-react@0.0.8 the rest of the set came from, so the
    // stroke and the 24-unit grid match exactly.
    expect(ICON_NAMES).toContain("heart-slash");
    expect(PATHS_LINEAR["heart-slash"]).toContain('stroke-width="1.5"');
    expect(PATHS_BULK["heart-slash"]).toContain('fill="currentColor"');
  });

  it("leaves the stroke on the path, so nothing downstream overrides it", () => {
    for (const n of ICON_NAMES) {
      expect(PATHS_LINEAR[n], `${n}`).toContain("currentColor");
    }
  });

  it("falls back for names with no measurement rather than guessing", () => {
    // 29 of 52 carry a Linear measurement, 36 a Bulk one. The rest measure
    // [2, 20] — the fallback IS their span, so an entry would be noise.
    // What matters is that the lookup never returns undefined.
    expect(Object.keys(INK)).toHaveLength(29);
    expect(Object.keys(INK_DUO)).toHaveLength(36);
    expect(INK_FALLBACK).toEqual([2, 20]);
  });

  it("measures heart-slash only where the slash actually widens it", () => {
    // Linear measured [2, 20] — the fallback exactly, because the stroked
    // heart and the stroked slash end at the same 2/22 bounds. Bulk runs
    // corner to corner and measured [1.25, 21.49], so that one is recorded.
    expect(INK["heart-slash"]).toBeUndefined();
    expect(INK_DUO["heart-slash"]).toEqual([1.25, 21.49]);
  });
});

/**
 * The three Linear glyphs whose frame the v3 round cropped. Their rows in
 * `ink.fixture.json` were measured against the full 24-unit cell, so they
 * are checked below against the v3 mock instead of against the v2 fixture —
 * by name, not by count, so a fourth crop cannot slip past unlisted.
 */
const CROPPED_AT_V3: Array<[IconName, boolean]> = [
  ["plus", false],
  ["minus", false],
  ["check", false],
];

const isCropped = (name: IconName, bulk: boolean) =>
  CROPPED_AT_V3.some(([n, b]) => n === name && b === bulk);

describe("inkVars matches the approved prototype", () => {
  it.each(EXPECTED.filter(([name, bulk]) => !isCropped(name, bulk)))(
    "%s (bulk=%s) emits the same --il/--ir the mock did",
    (name, bulk, il, ir) => {
      // Read straight out of `mocklib.icon()` — these four decimals are the
      // contract. Round them differently and every icon beside a label
      // shifts by a fraction of a pixel.
      expect(inkVars(name, bulk)).toEqual({ "--il": il, "--ir": ir });
    },
  );

  it("names every variant the v3 crop moved, instead of quietly dropping it", () => {
    // Three rows of the fixture are excluded above. Listing them by name is
    // the point: a crop added later without a row here would silently stop
    // being checked against anything.
    expect(CROPPED_AT_V3.map(([n]) => n)).toEqual(Object.keys(OPTICAL));
    for (const [name, bulk] of CROPPED_AT_V3) {
      expect(EXPECTED.some(([n, b]) => n === name && b === bulk)).toBe(true);
    }
  });

  it("covers every variant the approved mock drew, and names the ones it did not", () => {
    // Not a bare count. The fixture is parity with `mocklib.icon()`, and a
    // glyph the mock never had has nothing to be parity WITH — so the gap is
    // listed by name rather than absorbed into a number nobody can check.
    const inFixture = new Set(EXPECTED.map(([name]) => name));
    expect(ICON_NAMES.filter((n) => !inFixture.has(n))).toEqual(ADDED_AFTER_MOCK);
    expect(EXPECTED).toHaveLength((ICON_NAMES.length - ADDED_AFTER_MOCK.length) * 2);
  });
});

describe("the ink span is a real measurement", () => {
  it("never claims ink outside the 24-unit box", () => {
    for (const table of [INK, INK_DUO]) {
      for (const [name, span] of Object.entries(table)) {
        const [x, w] = span!;
        expect(x, `${name} starts left of the box`).toBeGreaterThanOrEqual(0);
        expect(w, `${name} has no width`).toBeGreaterThan(0);
        expect(x + w, `${name} runs past the box`).toBeLessThanOrEqual(24);
      }
    }
  });

  it("gives chev a much narrower span than truck, which is the whole point", () => {
    // 7.1 units against 21.75. Laying these out with `gap` lays out two equal
    // boxes, so without the trim the visible gap differs by nearly 2x.
    const chev = INK.chev!;
    const bag = INK.bag!;
    expect(chev[1]).toBeLessThan(bag[1]);
    expect(Number(inkVars("chev")["--il"])).toBeGreaterThan(
      Number(inkVars("bag")["--il"]),
    );
  });
});

describe("marks are kept out of the glyph set", () => {
  it("excludes every mark from GLYPH_NAMES", () => {
    for (const m of MARK_NAMES) {
      expect(GLYPH_NAMES as readonly string[]).not.toContain(m);
    }
    expect(GLYPH_NAMES).toHaveLength(ICON_NAMES.length - MARK_NAMES.length);
  });

  it("names check, and only check", () => {
    // The measurement behind this is the LONG AXIS of the ink — check 8.5
    // units against a typical 20 — and that needs getBBox(), so the evidence
    // lives on the spec page where it renders live.
    //
    // It deliberately is NOT derived from INK here. INK holds the horizontal
    // span only, and by that measure `back` (7.1) and `chev` (7.1) come out
    // narrower than check (8.5) — yet both are 15.84 tall and read perfectly
    // well. Width alone names the wrong icons, so this pins the decision and
    // leaves the proof where it can actually be seen.
    expect([...MARK_NAMES]).toEqual(["check"]);
  });

  it("keeps the stepper pair matched, so minus is not a mark", () => {
    // minus and plus both run 12 units on their long axis. Calling one of
    // them undersized would leave a + and a - of different weights on the
    // same quantity control.
    expect(GLYPH_NAMES as readonly string[]).toContain("minus");
    expect(GLYPH_NAMES as readonly string[]).toContain("plus");
  });

  it("keeps a check-shaped glyph available for use beside a label", () => {
    // `confirm` is Iconsax TickCircle, drawn on the normal grid — the answer
    // when something genuinely needs a tick next to text.
    expect(GLYPH_NAMES as readonly string[]).toContain("confirm");
  });
});

describe("optical size: the glyphs whose ink is half a frame", () => {
  it("crops exactly the three the v3 mock crops, and only in Linear", () => {
    // `OPTICAL` in `prototype/v3/v3.js`. Bulk is never cropped: those glyphs
    // are filled shapes drawn corner to corner.
    expect(OPTICAL).toEqual({ plus: [4, 16], minus: [4, 16], check: [6.5, 11] });
    expect(frameOf("plus", true)).toEqual([0, 24]);
    expect(frameOf("check", true)).toEqual([0, 24]);
  });

  it("emits the cropped square as the viewBox", () => {
    expect(viewBoxOf("plus")).toBe("4 4 16 16");
    expect(viewBoxOf("minus")).toBe("4 4 16 16");
    expect(viewBoxOf("check")).toBe("6.5 6.5 11 11");
    // Everything else is untouched — this is a table of three, not a policy.
    expect(viewBoxOf("bag")).toBe("0 0 24 24");
    expect(viewBoxOf("plus", true)).toBe("0 0 24 24");
  });

  it("measures the trim against the cropped square, not against 24", () => {
    // plus/minus ink is [6, 12] in the 24 cell; inside the 4/16 crop that
    // leaves 2 units of margin on each side — 0.125 of the new frame, where
    // the old sum was 0.25. Getting this wrong trims margin that is no
    // longer inside the box and pulls the glyph into its label.
    expect(inkVars("plus")).toEqual({ "--il": "0.1250", "--ir": "0.1250" });
    expect(inkVars("minus")).toEqual({ "--il": "0.1250", "--ir": "0.1250" });
    // check ink is [7.75, 8.5]; inside the 6.5/11 crop, 1.25 units each side.
    expect(inkVars("check")).toEqual({ "--il": "0.1136", "--ir": "0.1136" });
  });

  it("leaves the ink of a cropped glyph a much larger share of its box", () => {
    // The whole point, stated as a measurement: plus fills 12/24 = 50% of the
    // full cell and 12/16 = 75% of the cropped one, which is the share a
    // typical glyph (20/24 = 83%) already had.
    const [, fullSize] = frameOf("plus", true);
    const [, cropSize] = frameOf("plus");
    expect(12 / cropSize).toBeGreaterThan(12 / fullSize);
    expect(12 / cropSize).toBeGreaterThan(0.7);
  });
});
