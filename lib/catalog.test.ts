import { describe, it, expect } from "vitest";
import { buildCatalog, teasersIn } from "./catalog";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { CATALOG, DROPS, TEASERS } from "@/data/catalog";
import { PROMOTIONS } from "@/data/promotions";
import { productId, promoCode } from "@/data/types";

/**
 * `buildCatalog` is the hinge of the whole data path: every rule in `lib/`
 * now reads its catalogue through this value, so an index that drops a row
 * would take a name off a cart line or a price off a listing without any
 * screen looking broken.
 *
 * These pin the indexing, the order and the derived issue number against the
 * fixture — the same fixture `data/catalog.test.ts` pins figure by figure.
 */

describe("buildCatalog · the indexes", () => {
  it("indexes every product by id and by slug", () => {
    expect(FIXTURE_CATALOG.byId.size).toBe(CATALOG.length);
    expect(FIXTURE_CATALOG.bySlug.size).toBe(CATALOG.length);
    for (const p of CATALOG) {
      expect(FIXTURE_CATALOG.byId.get(p.id)).toBe(p);
      expect(FIXTURE_CATALOG.bySlug.get(p.slug)).toBe(p);
    }
  });

  it("finds the open drop's first style both ways", () => {
    const khoi = FIXTURE_CATALOG.bySlug.get("khoi");
    expect(khoi?.name).toBe("KHÓI");
    expect(FIXTURE_CATALOG.byId.get(productId("p-khoi"))).toBe(khoi);
  });

  it("indexes every drop by its number", () => {
    expect(FIXTURE_CATALOG.dropByNo.size).toBe(DROPS.length);
    for (const d of DROPS) expect(FIXTURE_CATALOG.dropByNo.get(d.no)).toBe(d);
    expect(FIXTURE_CATALOG.dropByNo.get(5)?.opensAt).toBe("2026-09-11T20:00:00+07:00");
  });

  it("indexes every promotion by its code", () => {
    expect(FIXTURE_CATALOG.promoByCode.size).toBe(PROMOTIONS.length);
    for (const p of PROMOTIONS) expect(FIXTURE_CATALOG.promoByCode.get(p.code)).toBe(p);
    expect(FIXTURE_CATALOG.promoByCode.get(promoCode("DOT05"))?.kind).toBe("PERCENT");
  });

  it("returns undefined for an id, slug, issue or code that is not there", () => {
    expect(FIXTURE_CATALOG.byId.get(productId("p-nothing"))).toBeUndefined();
    expect(FIXTURE_CATALOG.bySlug.get("nothing")).toBeUndefined();
    expect(FIXTURE_CATALOG.dropByNo.get(99)).toBeUndefined();
    expect(FIXTURE_CATALOG.promoByCode.get(promoCode("NOPE"))).toBeUndefined();
  });
});

describe("buildCatalog · what it does not touch", () => {
  it("keeps the products in the order they arrived — that order is the 'Mới nhất' sort", () => {
    expect(FIXTURE_CATALOG.products.map((p) => p.slug)).toEqual(CATALOG.map((p) => p.slug));
  });

  it("carries the four lists through unchanged", () => {
    expect(FIXTURE_CATALOG.products).toEqual(CATALOG);
    expect(FIXTURE_CATALOG.drops).toEqual(DROPS);
    expect(FIXTURE_CATALOG.teasers).toEqual(TEASERS);
    expect(FIXTURE_CATALOG.promotions).toEqual(PROMOTIONS);
  });

  it("builds a fresh value every call rather than caching one", () => {
    const again = buildCatalog({
      products: CATALOG,
      drops: DROPS,
      teasers: TEASERS,
      promotions: PROMOTIONS,
    });
    expect(again).not.toBe(FIXTURE_CATALOG);
    expect(again.byId).not.toBe(FIXTURE_CATALOG.byId);
    expect(again.currentDropNo).toBe(FIXTURE_CATALOG.currentDropNo);
  });
});

describe("currentDropNo · derived, not stored", () => {
  it("is the fixture's open issue", () => {
    expect(FIXTURE_CATALOG.currentDropNo).toBe(5);
  });

  it("is the highest issue number that actually holds a style", () => {
    // Số 06 exists as a drop record with two teasers and no product yet, so
    // "highest drop" and "highest issue with stock in it" are not the same
    // number — this is the one the shop means by "current".
    expect(Math.max(...DROPS.map((d) => d.no))).toBe(6);
    expect(Math.max(...CATALOG.map((p) => p.dropNo))).toBe(5);
  });

  it("is 0 for an empty catalogue rather than -Infinity", () => {
    const empty = buildCatalog({ products: [], drops: [], teasers: [], promotions: [] });
    expect(empty.currentDropNo).toBe(0);
    expect(empty.byId.size).toBe(0);
  });
});

describe("teasersIn", () => {
  it("lists the styles announced for the issue that has not opened", () => {
    const t = teasersIn(FIXTURE_CATALOG, 6);
    expect(t).toHaveLength(2);
    expect(t.map((x) => x.slug)).toEqual(["soi", "ngoi"]);
  });

  it("has nothing to tease for an issue already on sale", () => {
    expect(teasersIn(FIXTURE_CATALOG, 5)).toEqual([]);
  });
});
