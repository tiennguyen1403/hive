import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FEED_ICON_NAMES, FEED_ICON_PATHS } from "./paths";

describe("the Feed icon set", () => {
  it("has 69 glyphs, each named once and each with a path", () => {
    expect(FEED_ICON_NAMES).toHaveLength(69);
    expect(new Set(FEED_ICON_NAMES).size).toBe(FEED_ICON_NAMES.length);
    expect(Object.keys(FEED_ICON_PATHS).sort()).toEqual([...FEED_ICON_NAMES].sort());
    for (const n of FEED_ICON_NAMES) expect(FEED_ICON_PATHS[n], n).toMatch(/^M[\d.,\-A-Za-z ]+Z$/);
  });

  it("holds every glyph the mock's chrome and sheets name", () => {
    // `feed.js` draws these on every page: the tab bar in both weights, the
    // bars' icon buttons, the sheets' close and ticks, the stock line's fire.
    const chrome = [
      "house", "house-fill", "magnifying-glass", "magnifying-glass-fill", "heart", "heart-fill",
      "bag", "bag-fill", "user", "user-fill", "bell", "bell-fill", "fire-fill", "x", "caret-left",
      "caret-right", "caret-down", "sliders-horizontal", "check", "check-circle-fill", "plus", "ruler",
    ];
    for (const n of chrome) expect(FEED_ICON_NAMES as readonly string[], n).toContain(n);
  });

  it("ships Phosphor's MIT licence beside the data", () => {
    const licence = readFileSync(join("components", "feed", "icon", "LICENSE"), "utf8");
    expect(licence).toContain("MIT License");
    expect(licence).toContain("Phosphor Icons");
    expect(licence).toContain("THE SOFTWARE IS PROVIDED \"AS IS\"");
  });
});
