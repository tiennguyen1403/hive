import { describe, it, expect } from "vitest";
import { CATALOG } from "@/data/catalog";
import { LEX, issueLabel, issueNo, kindInSentence, plateLabel } from "./lexicon";

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

/**
 * The plate in the nav bar prints only "Số 05"; which state the issue is in
 * is carried by the plate's colour. Colour is never the only channel, so the
 * words go into the link's `aria-label` and `title` — one string per state.
 */
describe("plateLabel", () => {
  it("names an issue on sale", () => {
    expect(plateLabel(5, "OPEN")).toBe("Số 05, đang bán");
  });

  it("names an issue that has not opened yet", () => {
    expect(plateLabel(6, "UPCOMING")).toBe("Số 06, sắp mở");
  });

  it("names an issue that has shut", () => {
    expect(plateLabel(5, "CLOSED")).toBe("Số 05, đã đóng");
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
