import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { productId, type Product, type Teaser } from "@/data/types";
import {
  canBuy,
  defaultLine,
  firstColor,
  isGone,
  isLive,
  isOver,
  lineLabel,
  lineOfStyle,
  lineStyles,
  otherLineWith,
  parseShopState,
  pictureAlt,
  pictureOf,
  shopLines,
  shopList,
  shopQuery,
  sizeNote,
  sizeRowLabel,
  sizesIn,
  startSize,
  stockFacts,
  swatchNote,
  teaserPicture,
} from "./feed";

const C = FIXTURE_CATALOG;
const style = (stem: string): Product => {
  const p = C.byId.get(productId(`p-${stem}`));
  if (!p) throw new Error(`no fixture style ${stem}`);
  return p;
};
/** The fixture's four issues: Số 05 sells 11/09 20:00 → 25/09 20:00, Số 06 opens 02/10. */
const OPEN = new Date("2026-09-21T19:02:00+07:00");
const AFTER = new Date("2026-09-28T19:02:00+07:00");
const BEFORE_06 = new Date("2026-09-30T19:02:00+07:00");

describe("a style's state, asked of its own issue", () => {
  it("is live while its issue sells, over once it shuts; a fixed style is neither", () => {
    expect(isLive(C, style("khoi"), OPEN)).toBe(true);
    expect(isOver(C, style("khoi"), OPEN)).toBe(false);
    expect(isLive(C, style("khoi"), AFTER)).toBe(false);
    expect(isOver(C, style("khoi"), AFTER)).toBe(true);
    expect(isLive(C, style("ao-thun-tron"), OPEN)).toBe(false);
    expect(isOver(C, style("ao-thun-tron"), AFTER)).toBe(false);
  });

  it("stamps ĐÃ HẾT on a sold-out issue style only, never on a fixed one", () => {
    expect(isGone(style("muoi"))).toBe(true);
    expect(isGone(style("khoi"))).toBe(false);
    const empty: Product = { ...style("ao-thun-tron"), stock: { white: { S: 0, M: 0, L: 0, XL: 0 }, black: { S: 0, M: 0, L: 0, XL: 0 }, grey: { S: 0, M: 0, L: 0, XL: 0 } } };
    expect(isGone(empty)).toBe(false);
  });

  it("offers the quick add while the issue sells and the style lasts, and on a fixed style with anything left", () => {
    expect(canBuy(C, style("khoi"), OPEN)).toBe(true);
    expect(canBuy(C, style("muoi"), OPEN)).toBe(false);
    expect(canBuy(C, style("khoi"), AFTER)).toBe(false);
    expect(canBuy(C, style("ao-thun-tron"), AFTER)).toBe(true);
  });

  it("shows first the first colour with anything left", () => {
    expect(firstColor(style("khoi"))).toBe("black");
    // SƯƠNG: black has 2, moss 1 — black first; MUỐI has nothing anywhere, so its first colour.
    expect(firstColor(style("suong"))).toBe("black");
    expect(firstColor(style("muoi"))).toBe("black");
    const bui = { ...style("bui"), stock: { black: { S: 0, M: 0, L: 0, XL: 0 }, grey: { S: 0, M: 0, L: 0, XL: 1 } } };
    expect(firstColor(bui)).toBe("grey");
  });
});

describe("the stock line (feed.js stockLine)", () => {
  it("counts what is left, with the fire at three or fewer, and the sizes gone in every colour", () => {
    expect(stockFacts(C, style("khoi"), OPEN)).toEqual({ kind: "left", n: 17, low: false, gone: [] });
    expect(stockFacts(C, style("bui"), OPEN)).toEqual({ kind: "left", n: 2, low: true, gone: ["S", "M"] });
    expect(stockFacts(C, style("suong"), OPEN)).toEqual({ kind: "left", n: 3, low: true, gone: ["S"] });
    expect(stockFacts(C, style("gio"), OPEN)).toEqual({ kind: "left", n: 7, low: false, gone: ["XL"] });
  });

  it("prints nothing for a sold-out style: the stamp says it once", () => {
    expect(stockFacts(C, style("muoi"), OPEN)).toBeNull();
    expect(stockFacts(C, style("muoi"), AFTER, { soldCount: true })).toBeNull();
  });

  it("says when the issue shut, or — where the grid asks — how much of the cut went", () => {
    expect(stockFacts(C, style("khoi"), AFTER)).toEqual({ kind: "closed", day: "25/09" });
    expect(stockFacts(C, style("khoi"), AFTER, { soldCount: true })).toEqual({ kind: "sold", sold: 18, cut: 35 });
    // While the issue sells the count is what is left, whatever the grid asks.
    expect(stockFacts(C, style("khoi"), OPEN, { soldCount: true })).toEqual({ kind: "left", n: 17, low: false, gone: [] });
  });

  it("gives a fixed style its sizes, never a figure", () => {
    expect(stockFacts(C, style("ao-thun-tron"), OPEN)).toEqual({ kind: "fixed", gone: [] });
    expect(stockFacts(C, style("hoodie-tron"), AFTER)).toEqual({ kind: "fixed", gone: ["M"] });
  });
});

describe("pictures", () => {
  it("shows a colour's packshot, or its lookbook frame when asked and there is one", () => {
    expect(pictureOf(style("nguoi"), "black", "pack")).toEqual({ src: "/shots/nguoi-black.webp", look: false });
    expect(pictureOf(style("nguoi"), "black", "look")).toEqual({ src: "/shots/nguoi-black-look.webp", look: true });
    expect(pictureOf(style("cat"), "white", "pack").src).toBe("/shots/cat-white.webp");
  });

  it("falls back to the packshot where a colour has no lookbook frame (a fixed style's drawing)", () => {
    expect(pictureOf(style("ao-thun-tron"), "black", "look")).toEqual({ src: "/flats/tee-black.png", look: false });
  });

  it("names the picture as the mock does", () => {
    expect(pictureAlt(style("nguoi"), "black", true)).toBe("Người mặc NGUỘI màu đen");
    expect(pictureAlt(style("khoi"), "cream", false)).toBe("KHÓI, áo thun oversize màu kem");
    expect(pictureAlt(style("than"), "navy", false)).toBe("THAN, áo khoác bomber màu xanh than");
  });

  it("draws a teaser as its garment's flat silhouette, never another style's photo", () => {
    const t = (family: Teaser["family"]): Teaser => ({ slug: "x", name: "X", kind: "Áo", family, dropNo: 6, photoKey: "suong" });
    expect(teaserPicture(t("JACKET"))).toBe("/flats/jacket-black.png");
    expect(teaserPicture(t("HOODIE"))).toBe("/flats/hoodie-black.png");
    expect(teaserPicture(t("PANTS"))).toBe("/flats/trousers-black.png");
    // No black shirt drawing exists: its first colour.
    expect(teaserPicture(t("SHIRT"))).toBe("/flats/shirt-white.png");
  });
});

describe("the quick add", () => {
  it("lists the four sizes of a colour with what is left", () => {
    expect(sizesIn(style("suong"), "black")).toEqual([
      { size: "S", n: 0 },
      { size: "M", n: 1 },
      { size: "L", n: 0 },
      { size: "XL", n: 1 },
    ]);
  });

  it("notes a size as gone or nearly gone", () => {
    expect([0, 1, 2, 3, 9].map(sizeNote)).toEqual(["Hết", "Còn 1", "Còn 2", null, null]);
  });

  it("counts under a colour for an issue's style only", () => {
    expect(swatchNote(style("khoi"), "black")).toBe("Còn 10");
    expect(swatchNote(style("muoi"), "grey")).toBe("Hết");
    expect(swatchNote(style("ao-thun-tron"), "white")).toBeNull();
  });

  it("starts on the remembered size only while that colour still has it", () => {
    expect(startSize(style("khoi"), "black", "M")).toBe("M");
    expect(startSize(style("suong"), "black", "S")).toBeNull();
    expect(startSize(style("khoi"), "black", null)).toBeNull();
  });

  it("calls the row “Size của tôi” while the remembered size is the one chosen", () => {
    expect(sizeRowLabel("M", "M")).toBe("Size của tôi");
    expect(sizeRowLabel("L", "M")).toBe("Size");
    expect(sizeRowLabel(null, null)).toBe("Size");
  });
});

describe("the shop grid", () => {
  const five = C.dropByNo.get(5)!;

  it("leads with the issue while it sells, with the fixed line once it has shut", () => {
    expect(shopLines(five, true, false)).toEqual([5, "fixed"]);
    expect(shopLines(five, true, true)).toEqual(["all", 5, "fixed"]);
    expect(shopLines(five, false, false)).toEqual(["fixed", 5]);
    expect(shopLines(undefined, false, true)).toEqual(["fixed"]);
    expect(defaultLine(["all", 5, "fixed"])).toBe(5);
    expect(defaultLine(["fixed", 5])).toBe("fixed");
  });

  it("names the lines and a style's line", () => {
    expect([lineLabel("all"), lineLabel(5), lineLabel("fixed")]).toEqual(["Tất cả", "Số 05", "Cố định"]);
    expect(lineOfStyle(style("khoi"))).toBe("Số 05");
    expect(lineOfStyle(style("ao-thun-tron"))).toBe("Cố định");
  });

  it("reads the state from the URL, refusing anything it does not know", () => {
    const lines = [5, "fixed"] as const;
    expect(parseShopState({}, [...lines])).toEqual({ line: 5, family: "ALL", sort: "newest" });
    expect(parseShopState({ line: "fixed", family: "HOODIE", sort: "price-asc" }, [...lines])).toEqual({
      line: "fixed",
      family: "HOODIE",
      sort: "price-asc",
    });
    expect(parseShopState({ line: "4", family: "HAT", sort: "cheap" }, [...lines])).toEqual({
      line: 5,
      family: "ALL",
      sort: "newest",
    });
    expect(parseShopState({ line: "all" }, [...lines]).line).toBe(5);
    expect(parseShopState({ line: ["5", "fixed"] }, ["fixed", 5]).line).toBe(5);
  });

  it("writes the state back without its defaults", () => {
    expect(shopQuery({ line: 5, family: "ALL", sort: "newest" }, [5, "fixed"])).toBe("");
    expect(shopQuery({ line: "fixed", family: "TEE", sort: "newest" }, [5, "fixed"])).toBe("line=fixed&family=TEE");
    expect(shopQuery({ line: 5, family: "ALL", sort: "price-desc" }, ["fixed", 5])).toBe("line=5&sort=price-desc");
  });

  it("lists a line's styles in catalogue order", () => {
    expect(lineStyles(C, [5, "fixed"], 5).map((p) => p.name)).toEqual([
      "KHÓI", "BỤI", "NGUỘI", "NẮNG", "SƯƠNG", "MUỐI", "THAN", "CÁT", "GIÓ", "ĐÁ",
    ]);
    expect(lineStyles(C, [5, "fixed"], "fixed")).toHaveLength(8);
    expect(lineStyles(C, ["all", 5, "fixed"], "all")).toHaveLength(18);
  });

  it("narrows to a family and orders by price", () => {
    const hoodies = shopList(C, [5, "fixed"], { line: 5, family: "HOODIE", sort: "newest" });
    expect(hoodies.map((p) => p.name)).toEqual(["BỤI", "NGUỘI"]);
    const cheap = shopList(C, [5, "fixed"], { line: "fixed", family: "ALL", sort: "price-asc" });
    expect(cheap.map((p) => p.priceVnd)).toEqual([...cheap.map((p) => p.priceVnd)].sort((a, b) => a - b));
    const dear = shopList(C, [5, "fixed"], { line: 5, family: "ALL", sort: "price-desc" });
    expect(dear[0]!.name).toBe("SƯƠNG");
  });

  it("points an empty grid at another line that has the family", () => {
    expect(shopList(C, [5, "fixed"], { line: 5, family: "VEST", sort: "newest" })).toEqual([]);
    expect(otherLineWith(C, [5, "fixed"], { line: 5, family: "VEST", sort: "newest" })).toBe("fixed");
    expect(otherLineWith(C, [5, "fixed"], { line: "fixed", family: "VEST", sort: "newest" })).toBeUndefined();
  });
});
