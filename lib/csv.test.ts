import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

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
});
