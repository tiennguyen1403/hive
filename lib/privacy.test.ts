import { describe, expect, it } from "vitest";
import { PRIVACY_UPDATED_AT, PRIVACY_UPDATED_DAY, privacyUpdated } from "./privacy";

describe("the day /privacy was last changed (round v6 slice P)", () => {
  it("is an instant on the Vietnamese clock, as every instant in this codebase", () => {
    expect(PRIVACY_UPDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\+07:00$/);
    expect(PRIVACY_UPDATED_DAY).toBe(PRIVACY_UPDATED_AT.slice(0, 10));
    expect(PRIVACY_UPDATED_DAY).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("prints the day by each language's rule: 08/10/2026, and the glossary's British 8 Oct 2026", () => {
    expect(privacyUpdated("vi")).toBe("08/10/2026");
    expect(privacyUpdated()).toBe(privacyUpdated("vi"));
    // No leading zero in English; the day, its month and the year held together by no-break spaces.
    expect(privacyUpdated("en")).toBe("8 Oct 2026");
  });

  it("reads the constant, never a date typed beside it", () => {
    const [year, month, day] = PRIVACY_UPDATED_DAY.split("-");
    expect(privacyUpdated("vi")).toBe(`${day}/${month}/${year}`);
    expect(privacyUpdated("en").endsWith(` ${year}`)).toBe(true);
    expect(privacyUpdated("en").startsWith(`${Number(day)} `)).toBe(true);
  });
});
