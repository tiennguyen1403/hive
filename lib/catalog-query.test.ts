import { describe, it, expect } from "vitest";
import { fold, foldName, styleNameHas } from "./catalog-query";
import { productsInDrop, productsOnSale } from "./inventory";
import { styleName } from "./lexicon";
import { CATALOG } from "@/data/catalog";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { FAMILY_LABELS } from "@/data/types";

const DROP5 = productsInDrop(FIXTURE_CATALOG, 5);

describe("fold", () => {
  it("drops the tone marks a shopper will not type", () => {
    expect(fold("Áo khoác dù")).toBe("ao khoac du");
    expect(fold("NGUỘI")).toBe("nguoi");
  });

  it("folds đ to d — different job from sorting, where đ is its own letter", () => {
    // `compareByName` in data/regions.ts keeps đ after d because that is the
    // alphabet. A search box is not an alphabet: someone typing "du" on a
    // keyboard without đ still means "dù".
    expect(fold("Đen")).toBe("den");
    expect(fold("ĐỎ")).toBe("do");
  });

  it("collapses case and outer whitespace", () => {
    expect(fold("  HoOdIe ")).toBe("hoodie");
  });
});

describe("family labels", () => {
  it("gives every family a label that is a prefix of its kinds", () => {
    // That is WHY searching a family label returns that family, so it is
    // worth pinning rather than leaving as a happy accident of how the
    // fixtures are worded. It already earned its keep: it caught "Áo gile"
    // filed under "Áo khoác".
    for (const p of CATALOG) {
      expect(fold(p.kind).startsWith(fold(FAMILY_LABELS[p.family]))).toBe(true);
    }
  });
});

// ───────────────────────────────────── the issue's code in the name (v3 slice 11)
describe("foldName · a name as it is typed", () => {
  it("folds like fold, and reads a run of spaces and dashes as one space", () => {
    // The shown name carries a no-break space and an en dash nobody types.
    expect(foldName(styleName("KHÓI", 5))).toBe("s05 khoi");
    expect(foldName("S05 - KHÓI")).toBe("s05 khoi");
    expect(foldName("  s05   khoi ")).toBe("s05 khoi");
    expect(foldName("s05-khoi")).toBe("s05 khoi");
    expect(foldName("–")).toBe("");
  });
});

describe("styleNameHas · by the issue's code", () => {
  const ON_SALE = productsOnSale(FIXTURE_CATALOG, new Date("2026-09-20T18:50:00+07:00"));
  const slugs = (q: string) => ON_SALE.filter((p) => styleNameHas(p, q)).map((p) => p.slug);

  it("finds every style of the issue by its code alone", () => {
    expect(slugs("s05")).toEqual(DROP5.map((p) => p.slug));
    expect(slugs("S05")).toEqual(DROP5.map((p) => p.slug));
  });

  it("finds one style by its code and name, however they are typed or pasted", () => {
    for (const q of ["S05 KHÓI", "s05 khoi", "S05 – KHÓI", "s05-khoi", styleName("KHÓI", 5)]) {
      expect(slugs(q), q).toEqual(["s05-khoi"]);
    }
  });

  it("still finds by the bare name, and a fixed style by its own name only", () => {
    expect(slugs("khoi")).toEqual(["s05-khoi"]);
    expect(slugs("ao thun tron")).toEqual(["ao-thun-tron"]);
    expect(styleNameHas(FIXTURE_CATALOG.bySlug.get("ao-thun-tron")!, "s05")).toBe(false);
  });

  it("finds nothing for a code that is not on sale, nor for a dash alone", () => {
    expect(slugs("s04")).toEqual([]);
    expect(slugs("–")).toEqual([]);
  });
});
