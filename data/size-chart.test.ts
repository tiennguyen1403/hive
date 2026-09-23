import { describe, it, expect } from "vitest";
import { SIZES } from "./types";
import { heightLabel, sizeChart } from "./size-chart";

describe("sizeChart", () => {
  it("carries every size the catalog sells, in order", () => {
    expect(sizeChart("OVERSIZE").map((r) => r.size)).toEqual([...SIZES]);
    expect(sizeChart("REGULAR").map((r) => r.size)).toEqual([...SIZES]);
  });

  it("matches the approved mock's oversize table", () => {
    expect(sizeChart("OVERSIZE").map((r) => r.chestFlat)).toEqual([54, 57, 60, 63]);
    expect(sizeChart("OVERSIZE").map((r) => r.length)).toEqual([68, 71, 74, 77]);
    expect(sizeChart("OVERSIZE").map((r) => r.shoulder)).toEqual([50, 53, 56, 59]);
  });

  it("puts an oversize exactly one size above a regular", () => {
    // The product page prints "rộng hơn một size so với form thường"; the
    // table has to agree with the sentence.
    const over = sizeChart("OVERSIZE");
    const reg = sizeChart("REGULAR");
    expect(reg[1]!.chestFlat).toBe(over[0]!.chestFlat);
    expect(reg[1]!.length).toBe(over[0]!.length);
    expect(reg[1]!.shoulder).toBe(over[0]!.shoulder);
  });

  it("keeps the wearer's height the same in both fits", () => {
    expect(sizeChart("REGULAR").map(heightLabel)).toEqual(
      sizeChart("OVERSIZE").map(heightLabel),
    );
  });

  it("writes a height range the Vietnamese way, unbroken", () => {
    expect(heightLabel(sizeChart("OVERSIZE")[0]!)).toBe("1m55 – 1m65");
  });
});
