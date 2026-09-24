import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { FIXED_CHOICE, dropOptions, kindOptions } from "./admin-options";

/** Inside issue 05's window: 05 selling, 06 not open, 03 and 04 closed. */
const NOW = new Date("2026-09-20T18:50:00+07:00");

describe("dropOptions · the issue menu of the style form", () => {
  it("lists every issue newest first, each saying what it is doing", () => {
    expect(dropOptions(FIXTURE_CATALOG, NOW)).toEqual([
      { value: "6", label: "Số 06 · sắp mở" },
      { value: "5", label: "Số 05 · đang mở" },
      { value: "4", label: "Số 04 · đã đóng" },
      { value: "3", label: "Số 03 · đã đóng" },
    ]);
  });

  it("offers a new style only the issues that take one, then Cố định last, with no note (v3 slice 12)", () => {
    expect(dropOptions(FIXTURE_CATALOG, NOW, { hideClosed: true, withFixed: true })).toEqual([
      { value: "6", label: "Số 06 · sắp mở" },
      { value: "5", label: "Số 05 · đang mở" },
      { value: FIXED_CHOICE, label: "Cố định" },
    ]);
  });

  it("never offers Cố định unless asked: an edited style keeps its kind", () => {
    expect(dropOptions(FIXTURE_CATALOG, NOW).some((o) => o.value === FIXED_CHOICE)).toBe(false);
    // Not a number, so nothing can read it as an issue.
    expect(Number.isNaN(Number(FIXED_CHOICE))).toBe(true);
  });
});

describe("kindOptions", () => {
  it("keeps the fixed styles' kinds in the menu, beside the issues' (answer F.4)", () => {
    const kinds = kindOptions(FIXTURE_CATALOG).map((o) => o.value);
    expect(kinds).toContain("Áo gile phao");
    expect(kinds).toContain("Quần kaki");
    expect(kinds).toContain("Áo thun oversize");
  });
});
