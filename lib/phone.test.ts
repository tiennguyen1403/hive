import { describe, it, expect } from "vitest";
import { PHONE_GAP, formatPhone } from "./phone";
import { normalisePhone } from "./checkout-form";
import { CUSTOMERS } from "@/data/customers";

describe("formatPhone", () => {
  it("separates the groups with a NO-BREAK space, so a number never wraps", () => {
    // A phone number is one token written with gaps in it. Broken over two
    // lines in a 390px address row it stops being readable back, which is
    // the only thing a delivery number is for. U+00A0, not U+0020.
    expect(PHONE_GAP).toBe("\u00A0");
    expect(formatPhone("0912345678")).not.toContain(" ");
    expect(formatPhone("0912345678").split("\u00A0")).toEqual(["0912", "345", "678"]);
  });

  it("prints a ten-digit Vietnamese mobile as 4-3-3", () => {
    expect(formatPhone("0912345678")).toBe("0912\u00A0345\u00A0678");
    expect(formatPhone("0908221447")).toBe("0908\u00A0221\u00A0447");
  });

  it("is idempotent — a number already grouped comes back unchanged", () => {
    expect(formatPhone("0912 345 678")).toBe("0912\u00A0345\u00A0678");
  });

  it("accepts every separator people actually type", () => {
    expect(formatPhone("0912.345.678")).toBe("0912\u00A0345\u00A0678");
    expect(formatPhone("0912-345-678")).toBe("0912\u00A0345\u00A0678");
    expect(formatPhone(" 0912345678 ")).toBe("0912\u00A0345\u00A0678");
  });

  it("reads the country code as the same number", () => {
    expect(formatPhone("+84912345678")).toBe("0912\u00A0345\u00A0678");
    expect(formatPhone("84912345678")).toBe("0912\u00A0345\u00A0678");
  });

  it("groups other lengths four-then-threes, never leaving a lone digit", () => {
    // Eleven digits — the old-style numbers — come out 4-3-4, not 4-3-3-1.
    expect(formatPhone("01234567890")).toBe("0123\u00A0456\u00A07890");
    expect(formatPhone("012345678")).toBe("0123\u00A0456\u00A078");
    expect(formatPhone("01234567")).toBe("0123\u00A04567");
    expect(formatPhone("0123")).toBe("0123");
    expect(formatPhone("012")).toBe("012");
  });

  it("leaves anything that is not a number alone rather than mangling it", () => {
    expect(formatPhone("091 234 56ab")).toBe("091 234 56ab");
    expect(formatPhone("")).toBe("");
    expect(formatPhone("   ")).toBe("");
  });

  it("renders every stored customer number the way the fixtures spell it", () => {
    // The fixtures already write them grouped. Normalising and formatting
    // has to be a round trip, or the account screen would print a number
    // that differs from the one in the data — the same digits in the same
    // groups, with the ordinary spaces swapped for no-break ones.
    for (const c of CUSTOMERS) {
      expect(formatPhone(normalisePhone(c.phone))).toBe(c.phone.split(" ").join(PHONE_GAP));
    }
  });
});
