import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import { SIZES } from "@/data/types";
import { FEED_TIGHT_DASH } from "./feed-range";
import {
  GUIDE_HEIGHTS,
  GUIDE_HEIGHT_STORAGE_KEY,
  heightName,
  parseGuideHeight,
  sizeGuide,
  sizesForHeight,
} from "./feed-size-guide";

/** The fixture's own moment: Số 05 selling (11–25/09). */
const OPEN = new Date("2026-09-20T18:50:00+07:00");
/** Số 05 closed on 25/09: only the fixed line sells. */
const CLOSED = new Date("2026-09-28T19:02:00+07:00");

describe("Bảng size: the heights", () => {
  it("offers the mock's seven, 1m55 to 1m85", () => {
    expect(GUIDE_HEIGHTS.map(heightName)).toEqual(["1m55", "1m60", "1m65", "1m70", "1m75", "1m80", "1m85"]);
  });

  it("picks the sizes whose height column takes a height in, two where sizes meet", () => {
    expect(sizesForHeight(155)).toEqual(["S"]);
    expect(sizesForHeight(165)).toEqual(["S", "M"]);
    expect(sizesForHeight(170)).toEqual(["M", "L"]);
    expect(sizesForHeight(175)).toEqual(["L"]);
    expect(sizesForHeight(180)).toEqual(["L", "XL"]);
    expect(sizesForHeight(185)).toEqual(["XL"]);
    expect(sizesForHeight(150)).toEqual([]);
  });

  it("remembers a height only while it is one of the chips", () => {
    expect(GUIDE_HEIGHT_STORAGE_KEY).toBe("brand.height");
    expect(parseGuideHeight("175")).toBe(175);
    expect(parseGuideHeight("176")).toBeNull();
    expect(parseGuideHeight("1m75")).toBeNull();
    expect(parseGuideHeight("")).toBeNull();
    expect(parseGuideHeight(null)).toBeNull();
  });
});

describe("Bảng size: the charts", () => {
  const open = sizeGuide(C, OPEN);

  it("measures the tops by fit, as the product page's sheet does", () => {
    expect(open.tops.map((t) => t.title)).toEqual(["Áo oversize", "Áo regular"]);
    expect(open.tops.map((t) => t.id)).toEqual(["OVERSIZE", "REGULAR"]);
    const [over, regular] = open.tops;
    expect(over!.head).toEqual(["Ngang ngực", "Dài áo", "Ngang vai", "Hợp chiều cao"]);
    expect(over!.rows.map((r) => r.size)).toEqual([...SIZES]);
    expect(over!.rows[0]!.cells).toEqual(["54", "68", "50", `1m55${FEED_TIGHT_DASH}1m65`]);
    expect(regular!.rows[0]!.cells).toEqual(["51", "65", "47", `1m55${FEED_TIGHT_DASH}1m65`]);
    expect(over!.caption).toBe("Áo oversize, số đo mô phỏng, cm");
  });

  it("measures the trousers by length, shorts on their own, a half centimetre the Vietnamese way", () => {
    expect(open.pants.map((t) => [t.id, t.title])).toEqual([
      ["long", "Quần dài"],
      ["short", "Quần short"],
    ]);
    const [long, short] = open.pants;
    expect(long!.head).toEqual(["Vòng eo", "Vòng mông", "Dài quần", "Ngang đùi", "Hợp chiều cao"]);
    expect(long!.rows.map((r) => r.cells.slice(0, 4))).toEqual([
      ["70", "96", "98", "30"],
      ["74", "100", "100", "31,5"],
      ["78", "104", "102", "33"],
      ["82", "108", "104", "34,5"],
    ]);
    expect(short!.rows[1]!.cells).toEqual(["74", "102", "48", "33,5", `1m63${FEED_TIGHT_DASH}1m72`]);
  });

  it("names under each chart the styles on sale in it, as the mock does while Số 05 sells", () => {
    expect(open.tops.map((t) => t.names.join(", "))).toEqual([
      "KHÓI, BỤI, NGUỘI, SƯƠNG, THAN, CÁT, HOODIE TRƠN, ÁO KHOÁC DÙ",
      "NẮNG, GIÓ, ÁO THUN TRƠN, ÁO THUN TAY DÀI, GILE PHAO, SƠ MI OXFORD",
    ]);
    expect(open.pants.map((t) => t.names.join(", "))).toEqual(["ĐÁ, QUẦN KAKI", "QUẦN SHORT NỈ"]);
  });

  it("keeps the charts once Số 05 has closed, with only the fixed line's names", () => {
    const closed = sizeGuide(C, CLOSED);
    expect(closed.tops.map((t) => t.names.join(", "))).toEqual([
      "HOODIE TRƠN, ÁO KHOÁC DÙ",
      "ÁO THUN TRƠN, ÁO THUN TAY DÀI, GILE PHAO, SƠ MI OXFORD",
    ]);
    expect(closed.pants.map((t) => t.names.join(", "))).toEqual(["QUẦN KAKI", "QUẦN SHORT NỈ"]);
  });
});
