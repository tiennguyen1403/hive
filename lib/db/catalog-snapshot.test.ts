import { describe, expect, it } from "vitest";
import { parseCatalogSnapshot } from "./catalog-snapshot";

/**
 * The parser is the border guard between Postgres and `data/types.ts`, so it is
 * tested against a document built here by hand rather than against the real
 * database: these cases are about what happens when the document is WRONG, and
 * a healthy database cannot produce a wrong one on demand. The happy path is
 * proved against the real thing in `catalog.dbtest.ts`.
 */

/** One well-formed document in exactly the shape `catalog_snapshot()` returns. */
const snapshot = () => ({
  products: [
    {
      id: "p-khoi",
      slug: "khoi",
      name: "KHÓI",
      kind: "Áo thun oversize",
      family: "TEE",
      material: "Cotton 250gsm",
      fit: "OVERSIZE",
      priceVnd: 390000,
      cutUnits: 35,
      dropNo: 5,
      soldOutAt: null,
      colors: ["black", "cream"],
      photoKeys: ["khoi", "reu"],
      stock: {
        black: { S: 3, M: 4, L: 2, XL: 1 },
        cream: { S: 2, M: 2, L: 2, XL: 1 },
      },
    },
    {
      id: "p-bao",
      slug: "bao",
      name: "BÃO",
      kind: "Áo hoodie cổ lọ",
      family: "HOODIE",
      material: "Nỉ bông 380gsm",
      fit: "OVERSIZE",
      priceVnd: 910000,
      cutUnits: 38,
      dropNo: 3,
      soldOutAt: "2026-03-11T13:05:00+07:00",
      colors: ["grey"],
      photoKeys: ["bui"],
      stock: { grey: { S: 0, M: 0, L: 0, XL: 0 } },
    },
  ],
  drops: [
    { no: 3, opensAt: "2026-03-06T20:00:00+07:00", closesAt: "2026-03-20T20:00:00+07:00" },
    { no: 5, opensAt: "2026-09-11T20:00:00+07:00", closesAt: "2026-09-25T20:00:00+07:00" },
  ],
  teasers: [
    { slug: "soi", name: "SỎI", kind: "Áo khoác dù", family: "JACKET", dropNo: 6, photoKey: "suong" },
  ],
  promotions: [
    {
      code: "DOT05",
      kind: "PERCENT",
      percent: 10,
      maxDiscountVnd: 150000,
      amountVnd: null,
      startsAt: "2026-09-11T20:00:00+07:00",
      endsAt: "2026-09-25T20:00:00+07:00",
      usageLimit: 200,
      usedCount: 46,
      minOrderVnd: 500000,
      paused: false,
    },
    {
      code: "CHAOBAN",
      kind: "AMOUNT",
      percent: null,
      maxDiscountVnd: null,
      amountVnd: 50000,
      startsAt: "2026-09-11T20:00:00+07:00",
      endsAt: "2026-09-25T20:00:00+07:00",
      usageLimit: null,
      usedCount: 31,
      minOrderVnd: 400000,
      paused: true,
    },
    {
      code: "FREESHIP",
      kind: "FREE_SHIPPING",
      percent: null,
      maxDiscountVnd: null,
      amountVnd: null,
      startsAt: "2026-09-11T20:00:00+07:00",
      endsAt: "2026-09-25T20:00:00+07:00",
      usageLimit: 100,
      usedCount: 18,
      minOrderVnd: 800000,
    },
  ],
});

/** The document with one field broken, for the cases below. */
function broken(mutate: (doc: ReturnType<typeof snapshot>) => void) {
  const doc = snapshot();
  mutate(doc);
  return doc;
}

describe("a well-formed snapshot", () => {
  const input = parseCatalogSnapshot(snapshot());

  it("keeps the order SQL sent, because that order is the 'Mới nhất' sort key", () => {
    expect(input.products.map((p) => p.slug)).toEqual(["khoi", "bao"]);
  });

  it("reads a product back exactly as data/types.ts declares it", () => {
    expect(input.products[0]).toEqual({
      id: "p-khoi",
      slug: "khoi",
      name: "KHÓI",
      kind: "Áo thun oversize",
      family: "TEE",
      material: "Cotton 250gsm",
      fit: "OVERSIZE",
      priceVnd: 390_000,
      colors: ["black", "cream"],
      cutUnits: 35,
      dropNo: 5,
      stock: {
        black: { S: 3, M: 4, L: 2, XL: 1 },
        cream: { S: 2, M: 2, L: 2, XL: 1 },
      },
      photoKeys: ["khoi", "reu"],
    });
  });

  it("reads a fixed style (slice B5): no issue and no cut, both null", () => {
    const doc = snapshot();
    // Written as `catalog_snapshot()` writes a fixed style: both keys, null.
    const fixed = {
      ...doc.products[0]!,
      id: "p-ao-thun-tron",
      slug: "ao-thun-tron",
      name: "ÁO THUN TRƠN",
      cutUnits: null,
      dropNo: null,
      soldOutAt: null,
    };
    doc.products.push(fixed as unknown as (typeof doc.products)[number]);
    const tee = parseCatalogSnapshot(doc).products[2]!;
    expect(tee.dropNo).toBeNull();
    expect(tee.cutUnits).toBeNull();
    expect("soldOutAt" in tee).toBe(false);
  });

  it("leaves soldOutAt absent rather than null when a style has not run out", () => {
    expect("soldOutAt" in input.products[0]!).toBe(false);
    expect(input.products[1]!.soldOutAt).toBe("2026-03-11T13:05:00+07:00");
  });

  it("reads the drops and the teasers", () => {
    expect(input.drops).toEqual([
      { no: 3, opensAt: "2026-03-06T20:00:00+07:00", closesAt: "2026-03-20T20:00:00+07:00" },
      { no: 5, opensAt: "2026-09-11T20:00:00+07:00", closesAt: "2026-09-25T20:00:00+07:00" },
    ]);
    expect(input.teasers).toEqual([
      {
        slug: "soi",
        name: "SỎI",
        kind: "Áo khoác dù",
        family: "JACKET",
        dropNo: 6,
        photoKey: "suong",
      },
    ]);
  });

  it("gives each promotion only the fields its kind allows", () => {
    expect(input.promotions[0]).toEqual({
      code: "DOT05",
      kind: "PERCENT",
      percent: 10,
      maxDiscountVnd: 150_000,
      startsAt: "2026-09-11T20:00:00+07:00",
      endsAt: "2026-09-25T20:00:00+07:00",
      usageLimit: 200,
      usedCount: 46,
      minOrderVnd: 500_000,
    });
    expect(input.promotions[1]).toEqual({
      code: "CHAOBAN",
      kind: "AMOUNT",
      amountVnd: 50_000,
      startsAt: "2026-09-11T20:00:00+07:00",
      endsAt: "2026-09-25T20:00:00+07:00",
      usageLimit: null,
      usedCount: 31,
      minOrderVnd: 400_000,
      paused: true,
    });
    expect(input.promotions[2]).toEqual({
      code: "FREESHIP",
      kind: "FREE_SHIPPING",
      startsAt: "2026-09-11T20:00:00+07:00",
      endsAt: "2026-09-25T20:00:00+07:00",
      usageLimit: 100,
      usedCount: 18,
      minOrderVnd: 800_000,
    });
  });

  it("keeps null usageLimit as null, which is what 'unlimited' means", () => {
    expect(input.promotions[1]!.usageLimit).toBeNull();
  });

  it("keeps paused only when the shop paused the code (slice B3b)", () => {
    // `false` would be a field the fixture does not carry, and the database
    // test compares the two with toEqual.
    expect("paused" in input.promotions[0]!).toBe(false);
    expect(input.promotions[1]!.paused).toBe(true);
    // FREESHIP's document has no `paused` at all — an older snapshot.
    expect("paused" in input.promotions[2]!).toBe(false);
  });
});

describe("a snapshot that is wrong", () => {
  // Every message names the field, because a rename in SQL surfaces here and
  // "undefined is not an object" would not tell anybody which column moved.
  it("refuses a product with no stock", () => {
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          delete (doc.products[0] as { stock?: unknown }).stock;
        }),
      ),
    ).toThrow("products[0].stock is missing");
  });

  it("refuses a colour the style comes in but has no cells for", () => {
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          delete (doc.products[0].stock as { cream?: unknown }).cream;
        }),
      ),
    ).toThrow("products[0].stock.cream is missing");
  });

  it("refuses a size left out of a colour, because zero and missing differ", () => {
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          delete (doc.products[0].stock.black as { XL?: number }).XL;
        }),
      ),
    ).toThrow("products[0].stock.black.XL must be an integer");
  });

  it("refuses stock for a colour the style does not come in", () => {
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          (doc.products[0].stock as Record<string, unknown>).navy = {
            S: 1,
            M: 1,
            L: 1,
            XL: 1,
          };
        }),
      ),
    ).toThrow("products[0].stock.navy is a colour the style does not come in");
  });

  it("refuses a family outside the six", () => {
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          doc.products[0].family = "SCARF";
        }),
      ),
    ).toThrow("products[0].family must be one of TEE, HOODIE, JACKET, VEST, SHIRT, PANTS");
  });

  it("refuses a timestamp that does not carry +07:00", () => {
    // This is the failure that would silently move every clock on the
    // storefront by seven hours: `lib/datetime.ts` reads the offset out of the
    // text, so a UTC string parses fine and prints the wrong hour.
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          doc.drops[0].opensAt = "2026-03-06T13:00:00Z";
        }),
      ),
    ).toThrow("drops[0].opensAt must be an ISO instant ending in +07:00");

    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          doc.products[1].soldOutAt = "2026-03-11 13:05:00+07";
        }),
      ),
    ).toThrow("products[1].soldOutAt must be an ISO instant ending in +07:00");
  });

  it("refuses a photo list that does not match the colour list", () => {
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          doc.products[0].photoKeys = ["khoi"];
        }),
      ),
    ).toThrow("products[0].photoKeys must hold one key per colour (2)");
  });

  it("refuses money that is not an integer", () => {
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          doc.products[0].priceVnd = 390_000.5;
        }),
      ),
    ).toThrow("products[0].priceVnd must be an integer");
  });

  it("refuses a paused flag that is not a boolean", () => {
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          (doc.promotions[1] as { paused?: unknown }).paused = "yes";
        }),
      ),
    ).toThrow("promotions[1].paused must be a boolean");
  });

  it("refuses an issue without a cut, or a cut without an issue", () => {
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          (doc.products[0] as { cutUnits: unknown }).cutUnits = null;
        }),
      ),
    ).toThrow("products[0].cutUnits must be null exactly when dropNo is");
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          (doc.products[0] as { dropNo: unknown }).dropNo = null;
        }),
      ),
    ).toThrow("products[0].cutUnits must be null exactly when dropNo is");
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          delete (doc.products[0] as { dropNo?: unknown }).dropNo;
        }),
      ),
    ).toThrow("products[0].dropNo must be an integer");
  });

  it("refuses a PERCENT promotion with no percent", () => {
    expect(() =>
      parseCatalogSnapshot(
        broken((doc) => {
          doc.promotions[0].percent = null;
        }),
      ),
    ).toThrow("promotions[0].percent must be an integer");
  });

  it("refuses a document that is not the four lists", () => {
    expect(() => parseCatalogSnapshot(null)).toThrow("snapshot must be an object");
    expect(() => parseCatalogSnapshot({ products: [] })).toThrow("drops must be an array");
  });
});
