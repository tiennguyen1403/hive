import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";
import { styleInList, styleName } from "./lexicon";
import { formatPhone } from "./phone";

describe("toCsv", () => {
  it("joins cells with commas and rows with CRLF", () => {
    // CRLF, not LF: RFC 4180, and Excel is the tool these files are opened in.
    expect(toCsv([["a", "b"], ["c", "d"]])).toBe("a,b\r\nc,d");
  });

  it("writes numbers raw, so a spreadsheet receives numbers", () => {
    // Formatting here would hand Excel the string "1.290.000₫" and it would
    // be unsummable, which defeats the point of exporting at all.
    expect(toCsv([["Doanh thu"], [1_290_000]])).toBe("Doanh thu\r\n1290000");
  });

  it("quotes a cell containing a comma", () => {
    expect(toCsv([["KHÓI, BỤI"]])).toBe('"KHÓI, BỤI"');
  });

  it("quotes a cell containing a newline", () => {
    expect(toCsv([["hai\ndòng"]])).toBe('"hai\ndòng"');
  });

  it("doubles a quote inside a quoted cell", () => {
    expect(toCsv([['nói "xin chào"']])).toBe('"nói ""xin chào"""');
  });

  it("leaves an ordinary cell unquoted", () => {
    expect(toCsv([["KHÓI"]])).toBe("KHÓI");
  });

  it("keeps an empty row as an empty line rather than dropping it", () => {
    expect(toCsv([["a"], [], ["b"]])).toBe("a\r\n\r\nb");
  });

  it("returns an empty string for no rows at all", () => {
    expect(toCsv([])).toBe("");
  });

  it("writes a style list with plain spaces and no word joiner (v3 slice 13)", () => {
    // On screen the entry is held together with U+00A0 and U+2060; in a
    // spreadsheet those would only break a search typed with a space bar.
    const entry = styleInList(styleName("KHÓI", 5), 1);
    expect(entry).toContain("\u2060");
    expect(toCsv([[entry]])).toBe("S05 – KHÓI ×1");
  });

  it("writes a phone number with plain spaces", () => {
    const phone = formatPhone("0912345678");
    expect(phone).toContain("\u00a0");
    expect(toCsv([[phone]])).toBe("0912 345 678");
  });
});
