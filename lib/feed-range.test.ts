import { describe, expect, it } from "vitest";
import { FEED_DASH, FEED_TIGHT_DASH, feedDayRange, feedRange, feedTight, feedTightRange } from "./feed-range";

const NBSP = "\u00a0";
const WJ = "\u2060";

describe("a Feed range", () => {
  it("is a hyphen-minus, never an en or em dash", () => {
    for (const s of [FEED_DASH, FEED_TIGHT_DASH, feedRange("11/09", "25/09"), feedTight("2\u20134 ngày"), feedTight("2\u20144")]) {
      expect(s).toContain("-");
      expect(s).not.toMatch(/[\u2013\u2014]/u);
    }
  });

  it("holds a spaced range together: a no-break space before, a word joiner and a no-break space after", () => {
    expect(FEED_DASH).toBe(`${NBSP}-${WJ}${NBSP}`);
    expect(feedRange("11/09", "25/09")).toBe(`11/09${NBSP}-${WJ}${NBSP}25/09`);
    // No ordinary space is left for a line to break at.
    expect(feedRange("11/09", "25/09")).not.toMatch(/ /);
  });

  it("holds a tight range together with a word joiner each side", () => {
    expect(FEED_TIGHT_DASH).toBe(`${WJ}-${WJ}`);
    expect(feedTightRange("1m55", "1m65")).toBe(`1m55${WJ}-${WJ}1m65`);
  });

  it("prints one day once, and the end there is when the other is missing", () => {
    expect(feedRange("25/09", "25/09")).toBe("25/09");
    expect(feedRange("", "25/09")).toBe("25/09");
    expect(feedRange("11/09", "")).toBe("11/09");
  });

  it("reads two instants as the days they fall on, as `dayMonth` reads a +07:00 timestamp", () => {
    expect(feedDayRange("2026-09-11T20:00:00+07:00", "2026-09-25T20:00:00+07:00")).toBe(`11/09${FEED_DASH}25/09`);
    expect(feedDayRange("2026-09-25T20:00:00+07:00", "2026-09-25T23:00:00+07:00")).toBe("25/09");
  });

  it("sets a range between two numbers tight, whatever dash it came with, and leaves the rest alone", () => {
    expect(feedTight("2–4 ngày")).toBe(`2${WJ}-${WJ}4 ngày`);
    expect(feedTight("2 - 4 ngày")).toBe(`2${WJ}-${WJ}4 ngày`);
    expect(feedTight("24 giờ")).toBe("24 giờ");
    expect(feedTight("Giao nhanh nội thành TP.HCM")).toBe("Giao nhanh nội thành TP.HCM");
    expect(feedTight("1.000.000₫")).toBe("1.000.000₫");
  });
});
