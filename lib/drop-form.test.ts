import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { buildCatalog } from "./catalog";
import {
  atDropHour,
  closingAfter,
  dayValue,
  dropHour,
  dropLengthDays,
  shiftDays,
  span,
  spanDays,
} from "./drop-form";

/**
 * The issue form's pure parts (round v5 slice 4), moved from v3's
 * `DropFormModal`: the shop's hour and an issue's length read off the issues
 * that exist, and the two day boxes, typed `dd/mm/yyyy`.
 */

/** The fixture's catalogue with other issues in it. */
function withDrops(drops: { no: number; opensAt: string; closesAt: string }[]) {
  return buildCatalog({
    products: [...FIXTURE_CATALOG.products],
    drops,
    teasers: [...FIXTURE_CATALOG.teasers],
    promotions: [...FIXTURE_CATALOG.promotions],
  });
}

describe("dropHour", () => {
  it("is the hour the issues open at, 20:00 in the fixture", () => {
    expect(dropHour(FIXTURE_CATALOG)).toBe("20:00");
  });

  it("follows the last issue when the shop changes its hour", () => {
    const catalog = withDrops([
      { no: 5, opensAt: "2026-09-11T20:00:00+07:00", closesAt: "2026-09-25T20:00:00+07:00" },
      { no: 6, opensAt: "2026-10-02T19:30:00+07:00", closesAt: "2026-10-16T19:30:00+07:00" },
    ]);
    expect(dropHour(catalog)).toBe("19:30");
  });

  it("falls back to 20:00 when there is no issue to read", () => {
    expect(dropHour(withDrops([]))).toBe("20:00");
  });
});

describe("dropLengthDays", () => {
  it("is how long the last issue ran, fourteen days in the fixture", () => {
    expect(dropLengthDays(FIXTURE_CATALOG)).toBe(14);
  });

  it("follows the last issue, and is fourteen with none", () => {
    const catalog = withDrops([
      { no: 7, opensAt: "2026-11-01T20:00:00+07:00", closesAt: "2026-11-11T20:00:00+07:00" },
    ]);
    expect(dropLengthDays(catalog)).toBe(10);
    expect(dropLengthDays(withDrops([]))).toBe(14);
  });
});

describe("atDropHour", () => {
  it("puts a day at the shop's hour, in the shape everything stores", () => {
    expect(atDropHour(FIXTURE_CATALOG, "2026-11-06")).toBe("2026-11-06T20:00:00+07:00");
  });
});

describe("dayValue", () => {
  it("writes an instant as the day the box shows", () => {
    expect(dayValue("2026-09-21T20:00:00+07:00")).toBe("21/09/2026");
    expect(dayValue("2026-10-05T20:00:00+07:00")).toBe("05/10/2026");
  });
});

describe("shiftDays", () => {
  it("adds days to a typed day, across a month and a year", () => {
    expect(shiftDays("21/09/2026", 14)).toBe("05/10/2026");
    expect(shiftDays("25/12/2026", 14)).toBe("08/01/2027");
    expect(shiftDays("12/10/2026", 0)).toBe("12/10/2026");
  });

  it("leaves a day that is not one as it was typed", () => {
    expect(shiftDays("21/09", 14)).toBe("21/09");
    expect(shiftDays("31/02/2026", 14)).toBe("31/02/2026");
    expect(shiftDays("", 14)).toBe("");
  });
});

describe("span", () => {
  it("reads both boxes as days", () => {
    expect(span("12/10/2026", "26/10/2026")).toEqual({ from: "2026-10-12", to: "2026-10-26" });
  });

  it("is null while either box is unfinished or not a day", () => {
    expect(span("12/10/2026", "26/10")).toBeNull();
    expect(span("", "26/10/2026")).toBeNull();
    expect(span("31/02/2026", "26/10/2026")).toBeNull();
  });

  it("does not order the two: a closing day before the opening one still reads", () => {
    expect(span("26/10/2026", "12/10/2026")).toEqual({ from: "2026-10-26", to: "2026-10-12" });
  });
});

describe("closingAfter", () => {
  it("fills an empty closing day with the opening day plus an issue's length", () => {
    expect(closingAfter("12/10/2026", "", 14)).toBe("26/10/2026");
  });

  it("moves a closing day that is not after the new opening one", () => {
    expect(closingAfter("30/10/2026", "26/10/2026", 14)).toBe("13/11/2026");
    expect(closingAfter("26/10/2026", "26/10/2026", 14)).toBe("09/11/2026");
  });

  it("keeps a closing day that is still after the opening one", () => {
    expect(closingAfter("12/10/2026", "30/10/2026", 14)).toBe("30/10/2026");
  });

  it("changes nothing while the opening day is unfinished", () => {
    expect(closingAfter("12/10", "26/10/2026", 14)).toBe("26/10/2026");
    expect(closingAfter("12/10", "", 14)).toBe("");
  });
});

describe("spanDays", () => {
  it("counts the days a window runs", () => {
    expect(spanDays({ from: "2026-10-12", to: "2026-10-26" })).toBe(14);
    expect(spanDays({ from: "2026-12-25", to: "2027-01-08" })).toBe(14);
  });
});
