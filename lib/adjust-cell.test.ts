import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { cutRefusal, stepCell, typeCell } from "./adjust-cell";
import { cellValue, draftOf, draftTotal, withCell } from "./inventory-adjust";

/**
 * One cell of "Điều chỉnh tồn kho" (round v5 slice 5a): what − and + and
 * typed digits do to it, v3's `step` and `type` (`InventoryAdjustSheet`)
 * rule for rule, out of the component so they read without a DOM.
 *
 * KHÓI of Số 05: 35 cut; black 3 · 4 · 2 · 1 and cream 2 · 2 · 2 · 1 on the
 * shelf, 17 in all.
 */
const khoi = FIXTURE_CATALOG.products.find((p) => p.name === "KHÓI" && p.dropNo === 5)!;
const hoodie = FIXTURE_CATALOG.products.find((p) => p.name === "HOODIE TRƠN")!;

describe("stepCell", () => {
  const draft = draftOf(khoi);

  it("adds one to the cell while the shelf stays within the cut", () => {
    const next = stepCell(khoi, draft, "black", "S", 1);
    expect(next.refused).toBeNull();
    expect(cellValue(next.draft, "black", "S")).toBe(4);
    expect(draftTotal(khoi, next.draft)).toBe(18);
  });

  it("takes one off, and never below nothing", () => {
    const once = stepCell(khoi, draft, "black", "XL", -1);
    expect(cellValue(once.draft, "black", "XL")).toBe(0);
    const twice = stepCell(khoi, once.draft, "black", "XL", -1);
    expect(twice.refused).toBeNull();
    expect(cellValue(twice.draft, "black", "XL")).toBe(0);
  });

  it("refuses a unit past the cut, in v3's words, and leaves the cell as it was", () => {
    // 35 on the shelf: as many as were cut.
    const full = withCell(draft, "black", "S", 3 + 18);
    expect(draftTotal(khoi, full)).toBe(35);
    const next = stepCell(khoi, full, "cream", "M", 1);
    expect(next.refused).toBe("Không vượt số đã cắt: 35");
    expect(next.draft).toBe(full);
    // Taking one off is never refused.
    expect(stepCell(khoi, full, "cream", "M", -1).refused).toBeNull();
  });

  it("never caps a fixed style, which was never cut", () => {
    let d = draftOf(hoodie);
    for (let i = 0; i < 200; i++) d = stepCell(hoodie, d, hoodie.colors[0]!, "M", 1).draft;
    expect(cellValue(d, hoodie.colors[0]!, "M")).toBe(200);
  });
});

describe("typeCell", () => {
  const draft = draftOf(khoi);

  it("reads the digits typed, and nothing else", () => {
    expect(cellValue(typeCell(khoi, draft, "black", "S", "5").draft, "black", "S")).toBe(5);
    expect(cellValue(typeCell(khoi, draft, "black", "S", "1a2").draft, "black", "S")).toBe(12);
    expect(cellValue(typeCell(khoi, draft, "black", "S", "").draft, "black", "S")).toBe(0);
    expect(cellValue(typeCell(khoi, draft, "black", "S", "-4").draft, "black", "S")).toBe(4);
    expect(typeCell(khoi, draft, "black", "S", "5").refused).toBeNull();
  });

  it("pulls a number past the cut down to what the cut leaves, and says why", () => {
    // The other cells hold 14; 14 + 40 is past 35, so the cell takes 21.
    const next = typeCell(khoi, draft, "black", "S", "40");
    expect(next.refused).toBe("Không vượt số đã cắt: 35");
    expect(cellValue(next.draft, "black", "S")).toBe(21);
    expect(draftTotal(khoi, next.draft)).toBe(35);
  });

  it("takes exactly the cut without a word", () => {
    const next = typeCell(khoi, draft, "black", "S", "21");
    expect(next.refused).toBeNull();
    expect(draftTotal(khoi, next.draft)).toBe(35);
  });

  it("takes any number on a fixed style", () => {
    const next = typeCell(hoodie, draftOf(hoodie), hoodie.colors[0]!, "M", "500");
    expect(next.refused).toBeNull();
    expect(cellValue(next.draft, hoodie.colors[0]!, "M")).toBe(500);
  });
});

describe("cutRefusal", () => {
  it("says the cut, as v3's toast did", () => {
    expect(cutRefusal(35)).toBe("Không vượt số đã cắt: 35");
  });
});
