import { describe, it, expect } from "vitest";
import { isOrderCode, normaliseOrderCode, phoneDigits, trackHref } from "./lookup";

describe("normaliseOrderCode", () => {
  it("upper-cases and trims", () => {
    expect(normaliseOrderCode(" dh-2425 ")).toBe("DH-2425");
  });

  it("adds the prefix to a code typed as digits only", () => {
    expect(normaliseOrderCode("2425")).toBe("DH-2425");
  });

  it("puts the dash back when it was left out", () => {
    expect(normaliseOrderCode("dh2425")).toBe("DH-2425");
  });

  it("returns empty for empty", () => {
    expect(normaliseOrderCode("   ")).toBe("");
  });
});

describe("phoneDigits", () => {
  it("reads the same number written four ways", () => {
    for (const written of ["0908221447", "0908 221 447", "0908.221.447", "+84908221447"]) {
      expect(phoneDigits(written)).toBe("0908221447");
    }
  });

  it("refuses something that is not a ten-digit mobile", () => {
    expect(phoneDigits("12345")).toBe("");
    expect(phoneDigits("")).toBe("");
  });
});

describe("isOrderCode", () => {
  it("accepts a code the database issues, four digits or more", () => {
    expect(isOrderCode("DH-2432")).toBe(true);
    expect(isOrderCode("DH-12345")).toBe(true);
  });

  it("refuses anything else, so the question is never sent", () => {
    for (const bad of ["", "2432", "dh-2432", "DH-243", "DH-2432 ", "DH-24a2", "DH--2432"]) {
      expect(isOrderCode(bad), bad).toBe(false);
    }
  });

  it("agrees with normaliseOrderCode on what a shopper types", () => {
    expect(isOrderCode(normaliseOrderCode("dh2432"))).toBe(true);
    expect(isOrderCode(normaliseOrderCode(" 2432 "))).toBe(true);
  });
});

describe("trackHref", () => {
  it("carries the code alone, as the app reads it — never the phone (slice B19)", () => {
    expect(trackHref("dh2425")).toBe("/track?code=DH-2425");
  });

  it("leaves the phone out when there is none", () => {
    expect(trackHref("DH-2425")).toBe("/track?code=DH-2425");
  });
});
