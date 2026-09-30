import { describe, expect, it } from "vitest";
import { parseStamp, stampOf } from "./promo-form";

/**
 * The discount-code form's instants (round v5 slice 3): written as
 * "20:00 11/09/2026", read back strictly, in Vietnamese wall-clock time.
 */
describe("stampOf", () => {
  it("writes an instant as the hour, then the day", () => {
    expect(stampOf("2026-09-11T20:00:00+07:00")).toBe("20:00 11/09/2026");
    expect(stampOf("2026-10-05T07:05:00+07:00")).toBe("07:05 05/10/2026");
  });
});

describe("parseStamp", () => {
  it("reads the form's own format back to an instant in +07:00", () => {
    expect(parseStamp("20:00 11/09/2026")).toBe("2026-09-11T20:00:00+07:00");
    expect(parseStamp("7:05 05/10/2026")).toBe("2026-10-05T07:05:00+07:00");
  });

  it("forgives the spaces around and between the two parts", () => {
    expect(parseStamp("  20:00   11/09/2026 ")).toBe("2026-09-11T20:00:00+07:00");
  });

  it("round-trips what stampOf wrote", () => {
    const iso = "2026-09-21T20:00:00+07:00";
    expect(parseStamp(stampOf(iso))).toBe(iso);
  });

  it("refuses a half-typed or impossible moment rather than guessing", () => {
    expect(parseStamp("")).toBeNull();
    expect(parseStamp("20:00")).toBeNull();
    expect(parseStamp("11/09/2026")).toBeNull();
    expect(parseStamp("24:00 11/09/2026")).toBeNull();
    expect(parseStamp("20:60 11/09/2026")).toBeNull();
    expect(parseStamp("20:00 31/02/2026")).toBeNull();
    expect(parseStamp("20:00 11/13/2026")).toBeNull();
    // The day and the month take two digits, as the form writes them.
    expect(parseStamp("20:00 1/9/2026")).toBeNull();
    expect(parseStamp("20:00 11-09-2026")).toBeNull();
  });
});
