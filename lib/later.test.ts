import { describe, it, expect } from "vitest";
import {
  addLater,
  hasLater,
  laterKey,
  parseLater,
  removeLater,
  resolveLater,
  serializeLater,
  type LaterLine,
} from "./later";
import { productId } from "@/data/types";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";

const KHOI: LaterLine = { productId: productId("p-khoi"), size: "M", color: "black" };
const KHOI_L: LaterLine = { productId: productId("p-khoi"), size: "L", color: "black" };
const NANG: LaterLine = { productId: productId("p-nang"), size: "M", color: "white" };
/** BỤI black: only L is left, so M is the sold-out case. */
const BUI_M: LaterLine = { productId: productId("p-bui"), size: "M", color: "black" };

describe("laterKey", () => {
  it("is the choice, not the count — style, colour and size", () => {
    expect(laterKey(KHOI)).toBe("p-khoi:black:M");
  });

  it("tells two sizes of the same colourway apart", () => {
    expect(laterKey(KHOI)).not.toBe(laterKey(KHOI_L));
  });
});

describe("addLater", () => {
  it("puts the newest first", () => {
    expect(addLater([KHOI], NANG)).toEqual([NANG, KHOI]);
  });

  it("does not list the same choice twice", () => {
    const twice = addLater(addLater([], KHOI), KHOI);
    expect(twice).toHaveLength(1);
  });

  it("keeps a different size of the same style as its own row", () => {
    expect(addLater([KHOI], KHOI_L)).toHaveLength(2);
  });

  it("does not mutate the list it was given", () => {
    const before = [KHOI];
    addLater(before, NANG);
    expect(before).toEqual([KHOI]);
  });
});

describe("removeLater / hasLater", () => {
  it("removes by key", () => {
    expect(removeLater([KHOI, NANG], laterKey(KHOI))).toEqual([NANG]);
  });

  it("reports whether a choice is already put aside", () => {
    expect(hasLater([KHOI], laterKey(KHOI))).toBe(true);
    expect(hasLater([KHOI], laterKey(NANG))).toBe(false);
  });
});

describe("resolveLater", () => {
  it("joins each line to its style and reads the stock now", () => {
    const r = resolveLater(FIXTURE_CATALOG, [KHOI]);
    expect(r.items[0]!.product.name).toBe("KHÓI");
    // black M is cut at 4 in data/catalog.ts
    expect(r.items[0]!.available).toBe(4);
  });

  it("keeps a sold-out size, with zero on it", () => {
    const r = resolveLater(FIXTURE_CATALOG, [BUI_M]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.available).toBe(0);
  });

  it("drops a line whose style has left the catalog", () => {
    const r = resolveLater(FIXTURE_CATALOG, [{ ...KHOI, productId: productId("p-khong-co") }]);
    expect(r.items).toHaveLength(0);
    expect(r.unknown).toHaveLength(1);
  });
});

describe("storage", () => {
  it("round-trips", () => {
    expect(parseLater(serializeLater([KHOI, NANG]))).toEqual([KHOI, NANG]);
  });

  it("returns an empty list for junk rather than throwing", () => {
    expect(parseLater(null)).toEqual([]);
    expect(parseLater("{")).toEqual([]);
    expect(parseLater("[]")).toEqual([]);
  });

  it("drops a payload written by another schema version", () => {
    expect(parseLater(JSON.stringify({ v: 99, lines: [KHOI] }))).toEqual([]);
  });

  it("drops a line with a colour or size this build does not know", () => {
    const raw = JSON.stringify({
      v: 1,
      lines: [{ productId: "p-khoi", color: "neon", size: "M" }, KHOI],
    });
    expect(parseLater(raw)).toEqual([KHOI]);
  });

  it("deduplicates on the way in", () => {
    const raw = JSON.stringify({ v: 1, lines: [KHOI, KHOI] });
    expect(parseLater(raw)).toHaveLength(1);
  });
});
