import { describe, it, expect } from "vitest";
import { CATALOG } from "@/data/catalog";
import {
  FIXED_WORD,
  LEX,
  issueCode,
  issueLabel,
  issueNo,
  kindInSentence,
  plateLabel,
  styleName,
  stylePrefix,
} from "./lexicon";

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
 * Slice B5: an issue's style wears its issue as a code in front of its name
 * ("S05 – KHÓI"); a fixed style belongs to no issue and wears its name alone.
 * Made at display time — the stored name is never touched.
 */
describe("issueCode", () => {
  it("is S and the two-digit number", () => {
    expect(issueCode(5)).toBe("S05");
    expect(issueCode(12)).toBe("S12");
  });
});

describe("styleName", () => {
  it("puts the issue's code in front of the name", () => {
    expect(styleName("KHÓI", 5)).toBe("S05 – KHÓI");
    expect(styleName("SỎI", 6)).toBe("S06 – SỎI");
    expect(styleName("GIÓ", 12)).toBe("S12 – GIÓ");
  });

  it("keeps the code and the dash together, and lets the name wrap after it", () => {
    const shown = styleName("KHÓI", 5);
    // U+00A0 between the code and the en dash, U+0020 after the dash.
    const prefix = [...shown.slice(0, 6)].map((c) => c.codePointAt(0)!.toString(16));
    expect(prefix).toEqual(["53", "30", "35", "a0", "2013", "20"]);
    expect(shown.slice(6)).toBe("KHÓI");
    expect(shown).not.toContain("-");
  });

  it("leaves a fixed style's name exactly as it is", () => {
    expect(styleName("ÁO THUN TRƠN", null)).toBe("ÁO THUN TRƠN");
  });
});

/**
 * v3 slice 12: the back office's name field shows the issue's part of the
 * name as a fixed segment in front of what is typed. It is the shown name's
 * own head, character for character, so the two can never disagree.
 */
describe("stylePrefix", () => {
  it("is the code and the dash, held together by a no-break space", () => {
    expect([...stylePrefix(6)].map((c) => c.codePointAt(0)!.toString(16))).toEqual([
      "53",
      "30",
      "36",
      "a0",
      "2013",
    ]);
  });

  it("is exactly how the shown name begins, then one ordinary space", () => {
    for (const no of [3, 5, 6, 12]) {
      expect(styleName("KHÓI", no)).toBe(`${stylePrefix(no)} KHÓI`);
    }
  });
});

describe("FIXED_WORD", () => {
  it("is the board's word for a style of no issue", () => {
    // `FIXED` in prototype/v3/line/line-mock.js, round 4 (approved 25/09).
    expect(FIXED_WORD).toBe("Cố định");
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
