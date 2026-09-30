import { describe, it, expect } from "vitest";
import { CATALOG } from "@/data/catalog";
import {
  ABOUT_LEAD,
  FIXED_WORD,
  FOUR_RULES,
  FOUR_RULES_SCOPE,
  LEX,
  issueCode,
  issueLabel,
  issueNo,
  kindInSentence,
  styleInList,
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

  it("gives /about the words it has carried since v3, Số capitalised where it names an issue (round v4 slice 4b)", () => {
    expect(ABOUT_LEAD).toBe(
      "HIVE bán streetwear unisex theo Số: mỗi Số mở đúng giờ, mỗi mẫu trong Số cắt đúng một lần, hết là hết.",
    );
    expect(FOUR_RULES_SCOPE).toBe("áp dụng cho mọi Số");
    expect(FOUR_RULES).toEqual([
      { title: "Cắt đúng một lần", body: "Mỗi mẫu cắt từ khổ vải đã đặt. Không may thêm giữa Số." },
      { title: "Có giờ mở, giờ đóng", body: "Mở theo lịch công bố trước. Đóng khi hết hàng hoặc hết giờ." },
      { title: "Số còn lại là số thật", body: "Còn bao nhiêu chiếc hiện ngay trên lưới, không đợi bấm vào mới biết." },
      { title: "Một dải size cho tất cả", body: "Không chia nam nữ. Chọn theo form và số đo." },
    ]);
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
 * v3 slice 13: in a LIST of styles each entry is one unbreakable unit, so
 * the line breaks at the list's commas and never inside a name ("S05 –" over
 * "THAN") or between a name and its count ("KHÓI" over "×1").
 */
describe("styleInList", () => {
  const codes = (s: string) => [...s].map((c) => c.codePointAt(0)!.toString(16));

  it("holds an issue's style together, code, dash and name", () => {
    const entry = styleInList(styleName("THAN", 5));
    // No ordinary space anywhere in it: U+00A0 before the dash; after it a
    // word joiner, then U+00A0 — a no-break space alone still lets a line
    // break after a dash (UAX #14, LB12a).
    expect(entry).toBe("S05\u00a0–\u2060\u00a0THAN");
    expect(codes(entry).slice(0, 7)).toEqual(["53", "30", "35", "a0", "2013", "2060", "a0"]);
  });

  it("joins the count to the name with a no-break space", () => {
    expect(styleInList(styleName("KHÓI", 5), 1)).toBe("S05\u00a0–\u2060\u00a0KHÓI\u00a0×1");
    expect(styleInList("ÁO THUN TRƠN", 2)).toBe("ÁO THUN TRƠN\u00a0×2");
  });

  it("lets a fixed style's longer name still wrap between its words", () => {
    const entry = styleInList("ÁO THUN TAY DÀI", 1);
    expect(entry.split(" ")).toEqual(["ÁO", "THUN", "TAY", "DÀI\u00a0×1"]);
  });

  it("leaves the name a style shows on its own untouched", () => {
    // DESIGN.md §3: standing alone, a long name may wrap after the dash.
    expect(styleName("KHÓI", 5)).toBe("S05\u00a0– KHÓI");
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
