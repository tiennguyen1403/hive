import { describe, it, expect } from "vitest";
import {
  addDaysIso,
  addHoursIso,
  clockDayLabel,
  clockLabel,
  dateTimeLabel,
  dayMonth,
  dayMonthYear,
  openingLabel,
  rangeLabel,
  dayFromIsoDay,
  dayInput,
  isoDayFromInput,
  shortRangeLabel,
  sinceLabel,
  weekdayLabel,
} from "./datetime";

const CLOSE_5 = "2026-09-25T20:00:00+07:00";

describe("reading a timestamp without a timezone shifting it", () => {
  it("reads the wall clock the fixture was written in", () => {
    expect(clockLabel(CLOSE_5)).toBe("20:00");
  });

  it("reads the date the fixture was written in", () => {
    expect(dayMonth(CLOSE_5)).toBe("25/09");
    expect(dayMonthYear(CLOSE_5)).toBe("25/09/2026");
  });

  it("does not drift when the machine running it sits in another zone", () => {
    // Every timestamp in this codebase is written in +07:00 and is meant to
    // be read as Vietnamese wall-clock time. "new Date(...).getHours()" would
    // hand back 13:00 on a UTC box and 22:00 in Tokyo — the shop would print
    // a different closing time depending on where the server happened to run.
    const asDate = new Date(CLOSE_5);
    const localHour = String(asDate.getHours()).padStart(2, "0");
    expect(clockLabel(CLOSE_5)).toBe("20:00");
    if (localHour !== "20") expect(clockLabel(CLOSE_5)).not.toBe(`${localHour}:00`);
  });

  it("pads a single-digit day, month and hour", () => {
    expect(dayMonth("2026-03-06T09:05:00+07:00")).toBe("06/03");
    expect(clockLabel("2026-03-06T09:05:00+07:00")).toBe("09:05");
  });

  it("says so plainly rather than guessing when the text is not a timestamp", () => {
    expect(clockLabel("hôm nào đó")).toBe("");
    expect(dayMonth("")).toBe("");
  });
});

describe("weekdayLabel · the day of the week a cover announces", () => {
  it("names the day the two issues in the fixtures turn on", () => {
    // Both instants are printed on the home page's cover, and the approved
    // mock (`prototype/v3/home.html`) says "thứ Sáu" for each.
    expect(weekdayLabel(CLOSE_5)).toBe("thứ Sáu");
    expect(weekdayLabel("2026-10-02T20:00:00+07:00")).toBe("thứ Sáu");
  });

  it("walks the whole week, Sunday first", () => {
    // 2026-09-20 is a Sunday. Seven consecutive days, so an off-by-one in
    // the index would land somewhere in here rather than hiding.
    const week = [
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ].map((d) => weekdayLabel(`${d}T20:00:00+07:00`));
    expect(week).toEqual([
      "Chủ nhật",
      "thứ Hai",
      "thứ Ba",
      "thứ Tư",
      "thứ Năm",
      "thứ Sáu",
      "thứ Bảy",
    ]);
  });

  it("reads the Vietnamese calendar day, not the host's", () => {
    // A +07:00 instant just after midnight is still the day before in UTC.
    // Going through `new Date().getDay()` would hand back Thursday here.
    expect(weekdayLabel("2026-09-25T00:30:00+07:00")).toBe("thứ Sáu");
  });

  it("says nothing rather than guessing when the text is not a timestamp", () => {
    expect(weekdayLabel("thứ mấy nhỉ")).toBe("");
    expect(clockDayLabel("")).toBe("");
  });
});

describe("clockDayLabel", () => {
  it("reads the way the cover announces an opening and a closing", () => {
    expect(clockDayLabel(CLOSE_5)).toBe("20:00 thứ Sáu 25/09");
    expect(clockDayLabel("2026-10-02T20:00:00+07:00")).toBe("20:00 thứ Sáu 02/10");
  });
});

describe("openingLabel", () => {
  it("reads the way the upcoming-drop screen says it", () => {
    expect(openingLabel("2026-10-02T20:00:00+07:00")).toBe("20:00 ngày 02/10");
  });
});

describe("rangeLabel", () => {
  it("joins two dates for an estimated delivery window", () => {
    expect(rangeLabel("2026-09-21T00:00:00+07:00", "2026-09-23T00:00:00+07:00")).toBe(
      "21/09\u00A0–\u2060\u00A023/09/2026",
    );
  });
});

describe("addDaysIso", () => {
  it("moves the date forward and keeps the Vietnamese wall clock", () => {
    expect(addDaysIso("2026-09-20T20:00:00+07:00", 2)).toBe("2026-09-22T20:00:00+07:00");
  });

  it("rolls over the end of a month", () => {
    expect(dayMonth(addDaysIso("2026-09-29T09:00:00+07:00", 4))).toBe("03/10");
  });

  it("builds the delivery window the confirmation screen prints", () => {
    const placed = "2026-09-20T15:30:00+07:00";
    expect(rangeLabel(addDaysIso(placed, 2), addDaysIso(placed, 4))).toBe(
      "22/09\u00A0–\u2060\u00A024/09/2026",
    );
  });

  it("hands back what it was given rather than inventing a date", () => {
    expect(addDaysIso("không phải ngày", 2)).toBe("không phải ngày");
  });
});

describe("dateTimeLabel", () => {
  it("reads the way the confirmation prints a deadline", () => {
    expect(dateTimeLabel("2026-09-21T06:50:00+07:00")).toBe("06:50 ngày 21/09");
  });

  it("is the same sentence the opening announcement uses", () => {
    // One format, two callers. If they ever drift apart it should be a
    // decision, not an accident of two copies of the same template.
    expect(dateTimeLabel("2026-10-02T20:00:00+07:00")).toBe(
      openingLabel("2026-10-02T20:00:00+07:00"),
    );
  });
});

describe("shortRangeLabel", () => {
  it("holds the range together with NO-BREAK spaces around the dash", () => {
    // Let a line break fall beside the dash and "22/09" ends one line while
    // "– 24/09" starts the next, which reads as two dates rather than a
    // window. Both range helpers are printed inside running sentences.
    const r = shortRangeLabel("2026-09-22T18:50:00+07:00", "2026-09-24T18:50:00+07:00");
    expect(r).not.toContain(" ");
    expect(r).toContain("\u00A0–\u2060\u00A0");
    // …and the joiner after the dash, because a no-break space that follows
    // a dash still allows a break before it (UAX #14, LB12a): measured,
    // "20/09 –" over "22/09" on the receipt at 390 (v3 slice 13).
    expect([...r].map((c) => c.codePointAt(0)!.toString(16))).toEqual([
      "32", "32", "2f", "30", "39", "a0", "2013", "2060", "a0", "32", "34", "2f", "30", "39",
    ]);
    expect(rangeLabel("2026-09-21T00:00:00+07:00", "2026-09-23T00:00:00+07:00")).toContain(
      "\u00A0–\u2060\u00A0",
    );
  });

  it("joins the two ends of a delivery window, no year", () => {
    expect(
      shortRangeLabel("2026-09-22T18:50:00+07:00", "2026-09-24T18:50:00+07:00"),
    ).toBe("22/09\u00A0–\u2060\u00A024/09");
  });

  it("prints one date when the window is a single day", () => {
    // Express is "trong 24 giờ". "21/09 – 21/09" reads as a range that is
    // somehow both ends of nothing.
    expect(
      shortRangeLabel("2026-09-21T18:50:00+07:00", "2026-09-21T18:50:00+07:00"),
    ).toBe("21/09");
  });

  it("says nothing rather than half a range", () => {
    expect(shortRangeLabel("hôm nào đó", "2026-09-24T00:00:00+07:00")).toBe("");
  });
});

describe("addHoursIso", () => {
  it("moves the clock forward inside the same day", () => {
    expect(addHoursIso("2026-09-20T06:50:00+07:00", 12)).toBe(
      "2026-09-20T18:50:00+07:00",
    );
  });

  it("crosses midnight, which is the whole point of the 12-hour hold", () => {
    expect(addHoursIso("2026-09-20T18:50:00+07:00", 12)).toBe(
      "2026-09-21T06:50:00+07:00",
    );
  });

  it("hands back what it was given rather than inventing a time", () => {
    expect(addHoursIso("không phải giờ", 12)).toBe("không phải giờ");
  });
});

describe("sinceLabel", () => {
  const now = new Date("2026-09-20T18:50:00+07:00");

  it("reads days and hours once it is over a day old", () => {
    expect(sinceLabel("2026-09-19T07:52:00+07:00", now)).toBe("1 ngày 10 giờ trước");
  });

  it("drops to hours and minutes inside a day", () => {
    expect(sinceLabel("2026-09-20T09:43:00+07:00", now)).toBe("9 giờ 7 phút trước");
  });

  it("uses minutes alone in the first hour, and says so when there is nothing to say", () => {
    expect(sinceLabel("2026-09-20T18:38:00+07:00", now)).toBe("12 phút trước");
    expect(sinceLabel("2026-09-20T18:50:00+07:00", now)).toBe("vừa xong");
  });

  it("does not count a future stamp backwards", () => {
    // A clock that is behind must not print "đã 3 giờ trước" about something
    // that has not happened.
    expect(sinceLabel("2026-09-21T09:00:00+07:00", now)).toBe("vừa xong");
  });
});

describe("typing a date", () => {
  it("masks digits into the Vietnamese order as they are typed", () => {
    expect(dayInput("2")).toBe("2");
    expect(dayInput("21")).toBe("21");
    expect(dayInput("2109")).toBe("21/09");
    expect(dayInput("21092026")).toBe("21/09/2026");
  });

  it("ignores everything that is not a digit, and stops at eight", () => {
    expect(dayInput("21/09/2026")).toBe("21/09/2026");
    expect(dayInput("21-09-2026999")).toBe("21/09/2026");
  });

  it("round-trips a stored day", () => {
    expect(dayFromIsoDay("2026-09-21")).toBe("21/09/2026");
    expect(isoDayFromInput(dayFromIsoDay("2026-09-21"))).toBe("2026-09-21");
  });

  it("refuses a day that does not exist rather than rolling it forward", () => {
    // 31/02 quietly becoming 03/03 is how a drop opens on the wrong day.
    expect(isoDayFromInput("31/02/2026")).toBeNull();
    expect(isoDayFromInput("00/09/2026")).toBeNull();
    expect(isoDayFromInput("21/13/2026")).toBeNull();
    expect(isoDayFromInput("21/09")).toBeNull();
    expect(isoDayFromInput("")).toBeNull();
  });

  it("accepts the leap day in a leap year and not otherwise", () => {
    expect(isoDayFromInput("29/02/2028")).toBe("2028-02-29");
    expect(isoDayFromInput("29/02/2026")).toBeNull();
  });
});
