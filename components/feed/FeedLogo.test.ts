import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MONO } from "@/lib/brand/palette";
import { NAV_LOCKUP } from "./FeedLogo";

describe("FeedLogo", () => {
  it("draws the nav lockup exactly as prototype/name/logo/hive-lockup-nav.svg does", () => {
    const svg = readFileSync(join("prototype", "name", "logo", "hive-lockup-nav.svg"), "utf8");
    const [figure, wordmark] = [...svg.matchAll(/<path fill="#[0-9a-f]{6}" d="([^"]+)"/g)].map((m) => m[1]);
    expect(NAV_LOCKUP.viewBox).toBe(svg.match(/viewBox="([^"]+)"/)?.[1]);
    expect(NAV_LOCKUP.figure).toBe(figure);
    expect(NAV_LOCKUP.wordmark).toBe(wordmark);
  });

  it("is the same drawing the v3 bar wears, so the two logos cannot drift apart", () => {
    const nav = readFileSync(join("components", "shop", "NavLogo.tsx"), "utf8");
    expect(nav).toContain(`viewBox="${NAV_LOCKUP.viewBox}"`);
    expect(nav).toContain(NAV_LOCKUP.figure);
    expect(nav).toContain(NAV_LOCKUP.wordmark);
  });

  it("paints both tones from the black-and-white palette, never honey", () => {
    const src = readFileSync(join("components", "feed", "FeedLogo.tsx"), "utf8");
    expect(src).not.toMatch(/#[0-9a-fA-F]{6}/);
    expect(Object.keys(MONO)).toEqual(["light", "dark"]);
  });
});
