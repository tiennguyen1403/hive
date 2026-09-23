import { describe, it, expect } from "vitest";
import { initialsOf } from "./initials";
import { CUSTOMERS } from "@/data/customers";

describe("initialsOf", () => {
  it("takes the first letter of the first word and of the last", () => {
    expect(initialsOf("Trần Minh Anh")).toBe("TA");
    expect(initialsOf("Lê Hoàng Nam")).toBe("LN");
  });

  it("gives two letters, never one — that gap was L10", () => {
    // The account rail said "TA" and the admin customer list said "A" for the
    // same person. Both call this now, so both say the same thing.
    for (const c of CUSTOMERS) expect(initialsOf(c.name)).toHaveLength(2);
  });

  it("keeps the diacritics that a Vietnamese name carries", () => {
    expect(initialsOf("Đặng Quốc Bảo")).toBe("ĐB");
    expect(initialsOf("Võ Đức Duy")).toBe("VD");
  });

  it("returns one letter for a one-word name rather than doubling it", () => {
    expect(initialsOf("Minh")).toBe("M");
  });

  it("survives the shapes a stored name can actually take", () => {
    expect(initialsOf("  Phạm   Thu   Hà  ")).toBe("PH");
    expect(initialsOf("")).toBe("");
    expect(initialsOf("   ")).toBe("");
  });
});
