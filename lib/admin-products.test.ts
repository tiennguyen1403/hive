import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { productId, type Product } from "@/data/types";
import {
  fixedCounts,
  fixedRows,
  fixedStatus,
  lowNote,
  productsTab,
  stylesLine,
} from "./admin-products";
import { isFixed } from "./inventory";

const catalog = FIXTURE_CATALOG;
const bySlug = (slug: string) => catalog.bySlug.get(slug)!;
const fixed = catalog.products.filter(isFixed);

/** A fixed style with its shelf replaced, colour by colour, S → XL. */
function shelf(base: Product, rows: Record<string, [number, number, number, number]>): Product {
  const stock: Product["stock"] = {};
  for (const [color, [S, M, L, XL]] of Object.entries(rows)) stock[color as keyof Product["stock"]] = { S, M, L, XL };
  return { ...base, id: productId(`${base.id}-x`), colors: Object.keys(rows) as Product["colors"], stock };
}

describe("lowNote · the red line under a fixed style's stock (v3 slice 12)", () => {
  it("reads the board's three styles running low, size by size", () => {
    // grey 5·0·4·2, black 4·0·6·3, cream 3·0·2·2: M is gone in every colour,
    // L and XL are down to two in one of them.
    expect(lowNote(bySlug("hoodie-tron"))).toBe("M hết · L còn 2 · XL còn 2");
    expect(lowNote(bySlug("gile-phao"))).toBe("XL còn 2");
    expect(lowNote(bySlug("quan-short-ni"))).toBe("XL hết");
  });

  it("says nothing for a style with every cell above two", () => {
    expect(lowNote(bySlug("ao-thun-tron"))).toBeNull();
    expect(lowNote(bySlug("ao-khoac-du"))).toBeNull();
  });

  it("names a size by the fewest left in any one colour", () => {
    const tee = bySlug("ao-thun-tron");
    expect(lowNote(shelf(tee, { white: [9, 1, 9, 9], black: [9, 2, 9, 9] }))).toBe("M còn 1");
    // One colour gone, another still holding plenty: the size is not "hết",
    // and the fewest left in it is none (the brief's rule, to the letter).
    expect(lowNote(shelf(tee, { white: [9, 9, 0, 9], black: [9, 9, 7, 9] }))).toBe("L còn 0");
  });

  it("is only for a fixed style: an issue's style has its own rule", () => {
    expect(lowNote(catalog.byId.get(productId("p-khoi"))!)).toBeNull();
  });
});

describe("fixedStatus · the badge", () => {
  it("is low when any cell is at two or fewer, out when the shelf is empty", () => {
    expect(fixedStatus(bySlug("hoodie-tron"))).toBe("LOW");
    expect(fixedStatus(bySlug("ao-thun-tron"))).toBe("OK");
    const empty = shelf(bySlug("gile-phao"), { black: [0, 0, 0, 0] });
    expect(fixedStatus(empty)).toBe("OUT");
  });
});

describe("fixedRows · the order of the Cố định tab", () => {
  it("puts the styles running low first, each group in catalogue order", () => {
    expect(fixedRows(fixed).map((p) => p.slug)).toEqual([
      "hoodie-tron",
      "gile-phao",
      "quan-short-ni",
      "ao-thun-tron",
      "ao-thun-tay-dai",
      "ao-khoac-du",
      "so-mi-oxford",
      "quan-kaki",
    ]);
  });

  it("puts an empty shelf with the low ones, in its own place by position", () => {
    const empty = shelf(bySlug("ao-thun-tay-dai"), { black: [0, 0, 0, 0] });
    const list = fixed.map((p) => (p.slug === "ao-thun-tay-dai" ? empty : p));
    expect(fixedRows(list).map((p) => p.slug).slice(0, 4)).toEqual([
      "ao-thun-tay-dai",
      "hoodie-tron",
      "gile-phao",
      "quan-short-ni",
    ]);
  });

  it("leaves the list it was given alone", () => {
    const before = fixed.map((p) => p.slug);
    fixedRows(fixed);
    expect(fixed.map((p) => p.slug)).toEqual(before);
  });
});

describe("fixedCounts · the chips", () => {
  it("counts running low by the fixed rule and out by an empty shelf", () => {
    expect(fixedCounts(fixed)).toEqual({ low: 3, out: 0 });
    const empty = shelf(bySlug("ao-thun-tay-dai"), { black: [0, 0, 0, 0] });
    expect(fixedCounts([...fixed, empty])).toEqual({ low: 4, out: 1 });
  });
});

describe("productsTab · which tab the address opens", () => {
  it("opens Cố định with no parameter, and with ?fixed=1", () => {
    expect(productsTab({})).toEqual({ fixed: true });
    expect(productsTab({ fixed: "1" })).toEqual({ fixed: true });
    expect(productsTab({ fixed: "1", drop: "5" })).toEqual({ fixed: true });
  });

  it("opens an issue with ?drop=N", () => {
    expect(productsTab({ drop: "5" })).toEqual({ fixed: false, no: 5 });
    expect(productsTab({ drop: "05" })).toEqual({ fixed: false, no: 5 });
  });

  it("reads a number that is not an issue number as no parameter at all", () => {
    for (const drop of ["0", "-1", "2.5", "abc", ""]) {
      expect(productsTab({ drop }), drop).toEqual({ fixed: true });
    }
  });
});

describe("stylesLine · the line under the heading", () => {
  it("counts every style, then every style on sale", () => {
    // Số 05 open: its ten, sold out included, and the eight fixed.
    const open = new Date("2026-09-20T18:50:00+07:00");
    expect(stylesLine(catalog, open)).toBe("29 mẫu · 18 đang bán · tồn kho theo size và màu");
    // Between two issues only the fixed ones sell.
    const gap = new Date("2026-09-28T12:00:00+07:00");
    expect(stylesLine(catalog, gap)).toBe("29 mẫu · 8 đang bán · tồn kho theo size và màu");
  });
});
