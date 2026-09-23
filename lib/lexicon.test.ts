import { describe, it, expect } from "vitest";
import { CATALOG } from "@/data/catalog";
import { LEX, issueLabel, issueNo, kindInSentence } from "./lexicon";

describe("the lexicon", () => {
  it("matches the table in the approved mock", () => {
    // Copied from `prototype/v3/v3.js`, `LEX.so`. If the mock and the app
    // ever say different words, one of the two screens a reviewer compares
    // is lying — so the table is pinned rather than trusted.
    expect(LEX).toEqual({
      t: "Số",
      tl: "số",
      tu: "SỐ",
      cal: "Lịch ra số",
      adm: "Các số",
      in: "Trong số này",
      inl: "trong số này",
      next: "Số kế tiếp",
      prev: "Số trước",
    });
  });

  it("pads the number to two digits, because they are read in a column", () => {
    expect(issueLabel(5)).toBe("Số 05");
    expect(issueLabel(12)).toBe("Số 12");
    expect(issueNo(5)).toBe("05");
  });
});

describe("kindInSentence", () => {
  it("lowers the first letter so a kind can stand inside a clause", () => {
    // The card's count line: "còn 17 · áo thun oversize".
    expect(kindInSentence("Áo thun oversize")).toBe("áo thun oversize");
    expect(kindInSentence("Quần jogger")).toBe("quần jogger");
  });

  it("touches nothing but the first letter", () => {
    expect(kindInSentence("Áo sơ mi Dệt")).toBe("áo sơ mi Dệt");
    expect(kindInSentence("")).toBe("");
  });

  it("handles every kind the catalog carries", () => {
    for (const p of CATALOG) {
      const out = kindInSentence(p.kind);
      expect(out).toHaveLength(p.kind.length);
      expect(out.slice(1)).toBe(p.kind.slice(1));
    }
  });
});
