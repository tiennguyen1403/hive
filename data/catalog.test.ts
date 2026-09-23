import { describe, it, expect } from "vitest";
import { CATALOG, DROPS, CURRENT_DROP_NO } from "./catalog";
import { COLORS } from "./colors";
import { FIXTURE_CATALOG } from "./fixture-catalog";
import { COLOR_KEYS, SIZES } from "./types";
import { onHand, soldUnits, dropSummary, dropRevenueVnd } from "@/lib/inventory";

/**
 * The numbers on the right-hand side of these assertions come from the
 * approved prototype (`prototype/src/mocklib.py`), read out of the running
 * module rather than retyped. They are the contract: the React build has to
 * show the same figures the mock was signed off on.
 */
const PROTOTYPE_DROP_5 = [
  // slug,    priceVnd,  cutUnits, onHand, sold
  ["khoi", 390_000, 35, 17, 18],
  ["bui", 890_000, 18, 2, 16],
  ["nguoi", 1_290_000, 12, 5, 7],
  ["nang", 450_000, 26, 12, 14],
  ["suong", 1_450_000, 8, 3, 5],
  ["muoi", 690_000, 14, 0, 14],
  ["than", 1_350_000, 10, 6, 4],
  ["cat", 420_000, 31, 15, 16],
  ["gio", 750_000, 15, 7, 8],
  ["da", 980_000, 12, 6, 6],
] as const;

describe("catalog identity", () => {
  it("gives every product a distinct id", () => {
    const ids = CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(CATALOG.length);
  });

  it("gives every product a distinct slug, since the slug is the URL", () => {
    const slugs = CATALOG.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(CATALOG.length);
  });

  it("keeps BÃO, MEN and VÔI apart from BỤI, NẮNG and SƯƠNG", () => {
    // The prototype reused the image keys `bui`, `nang` and `suong` for three
    // drop-3 products. Harmless while they only picked a photo; a collision
    // the moment they become ids. This is the regression guard.
    const byName = (name: string) => CATALOG.filter((p) => p.name === name);
    for (const name of ["BÃO", "MEN", "VÔI", "BỤI", "NẮNG", "SƯƠNG"]) {
      expect(byName(name), `expected exactly one ${name}`).toHaveLength(1);
    }
    const reused = ["BÃO", "BỤI", "MEN", "NẮNG", "VÔI", "SƯƠNG"].map(
      (n) => byName(n)[0]!.id,
    );
    expect(new Set(reused).size).toBe(6);
  });
});

describe("stock is size × colour", () => {
  it("carries every listed colour, with all four sizes spelled out", () => {
    for (const p of CATALOG) {
      for (const c of p.colors) {
        const perSize = p.stock[c];
        expect(perSize, `${p.slug} is missing stock for ${c}`).toBeDefined();
        for (const s of SIZES) {
          expect(
            typeof perSize![s],
            `${p.slug}/${c}/${s} must be written out, zero included`,
          ).toBe("number");
        }
      }
    }
  });

  it("carries no stock for a colour the product does not come in", () => {
    for (const p of CATALOG) {
      for (const c of COLOR_KEYS) {
        if (!p.colors.includes(c)) {
          expect(p.stock[c], `${p.slug} has stray stock for ${c}`).toBeUndefined();
        }
      }
    }
  });

  it("never holds a negative count", () => {
    for (const p of CATALOG) {
      for (const perSize of Object.values(p.stock)) {
        for (const s of SIZES) expect(perSize[s]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("never holds more on hand than was cut", () => {
    for (const p of CATALOG) {
      expect(onHand(p), `${p.slug} holds more than it cut`).toBeLessThanOrEqual(
        p.cutUnits,
      );
    }
  });
});

describe("drop 5 matches the approved prototype", () => {
  it.each(PROTOTYPE_DROP_5)(
    "%s: price, cut, on hand and sold all line up",
    (slug, priceVnd, cutUnits, expectedOnHand, expectedSold) => {
      const p = CATALOG.find((x) => x.slug === slug);
      expect(p, `no product with slug ${slug}`).toBeDefined();
      expect(p!.priceVnd).toBe(priceVnd);
      expect(p!.cutUnits).toBe(cutUnits);
      expect(onHand(p!)).toBe(expectedOnHand);
      expect(soldUnits(p!)).toBe(expectedSold);
    },
  );

  it("totals ten styles, 181 cut, 108 sold, 73 left", () => {
    expect(dropSummary(FIXTURE_CATALOG, CURRENT_DROP_NO)).toEqual({
      styles: 10,
      cutUnits: 181,
      soldUnits: 108,
      onHand: 73,
    });
  });

  it("earns 77.500.000₫, derived rather than typed in", () => {
    expect(dropRevenueVnd(FIXTURE_CATALOG, 5)).toBe(77_500_000);
  });

  it("carries the closed drops forward unchanged", () => {
    expect(dropRevenueVnd(FIXTURE_CATALOG, 4)).toBe(171_600_000);
    expect(dropRevenueVnd(FIXTURE_CATALOG, 3)).toBe(133_020_000);
  });
});

describe("photography placeholders", () => {
  it("needs one photo set per colour — 21 for the open drop", () => {
    const open = CATALOG.filter((p) => p.dropNo === CURRENT_DROP_NO);
    const sets = open.reduce((n, p) => n + p.colors.length, 0);
    expect(sets).toBe(21);
  });

  it("hands every colour a stand-in photo until real ones exist", () => {
    for (const p of CATALOG) {
      expect(p.photoKeys, `${p.slug} photo count`).toHaveLength(p.colors.length);
    }
  });
});

describe("colour vocabulary", () => {
  it("describes every key the catalog uses", () => {
    const used = new Set(CATALOG.flatMap((p) => p.colors));
    for (const key of used) {
      expect(COLORS[key], `no colour defined for ${key}`).toBeDefined();
      expect(COLORS[key].hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(COLORS[key].label.length).toBeGreaterThan(0);
    }
  });
});

describe("drops", () => {
  it("closes every drop after it opens", () => {
    for (const d of DROPS) {
      expect(Date.parse(d.closesAt)).toBeGreaterThan(Date.parse(d.opensAt));
    }
  });

  it("has a record for every drop the catalog references", () => {
    const referenced = new Set(CATALOG.map((p) => p.dropNo));
    for (const no of referenced) {
      expect(DROPS.find((d) => d.no === no), `no drop ${no}`).toBeDefined();
    }
  });
});

describe("the hour a style ran out", () => {
  // `soldOutAt` is the shop's own record, the way `cutUnits` is: the order
  // fixtures are a recent SAMPLE and cannot prove when the last unit of a
  // closed issue went (`lib/sold-out-times.ts`).
  const stamped = CATALOG.filter((p) => p.soldOutAt !== undefined);

  it("is only ever set on a style with nothing left", () => {
    for (const p of stamped) expect(onHand(p)).toBe(0);
  });

  it("falls inside its own issue's window", () => {
    for (const p of stamped) {
      const drop = DROPS.find((d) => d.no === p.dropNo)!;
      const at = Date.parse(p.soldOutAt!);
      expect(at).toBeGreaterThan(Date.parse(drop.opensAt));
      expect(at).toBeLessThanOrEqual(Date.parse(drop.closesAt));
    }
  });

  it("covers every style of both closed issues", () => {
    for (const no of [3, 4]) {
      const styles = CATALOG.filter((p) => p.dropNo === no);
      expect(styles.length).toBeGreaterThan(0);
      expect(styles.every((p) => p.soldOutAt !== undefined)).toBe(true);
    }
  });

  it("leaves the open issue alone — nothing there has run out for good", () => {
    expect(CATALOG.filter((p) => p.dropNo === 5 && p.soldOutAt !== undefined)).toEqual([]);
  });

  it("closes each issue with one style going at the closing hour", () => {
    for (const no of [3, 4]) {
      const drop = DROPS.find((d) => d.no === no)!;
      const atClose = CATALOG.filter(
        (p) => p.dropNo === no && p.soldOutAt === drop.closesAt,
      );
      expect(atClose).toHaveLength(1);
    }
  });
});
