import type {
  Drop,
  Product,
  ProductId,
  PromoCode,
  Promotion,
  Teaser,
} from "@/data/types";
import { issueCode } from "./lexicon";

/**
 * The catalogue as a VALUE.
 *
 * Every rule in `lib/` used to reach for `@/data/catalog` by name, which made
 * the fixture a hard dependency of forty files: one `import` per module, each
 * one a place that would have to change the day the catalogue comes out of a
 * database instead. So the catalogue became an argument — `catalog: Catalog`,
 * always the first parameter — and the fixture became one of its possible
 * sources rather than the only one (`data/fixture-catalog.ts` today,
 * `lib/db/catalog.ts` reading Postgres tomorrow).
 *
 * `Catalog` is the shape the rules want: the four lists as they arrived, plus
 * the indexes every other module used to build for itself. `CatalogInput` is
 * the shape that travels — plain arrays only, because a `Map` cannot cross
 * the server → client boundary (React serialises props, and a Map is not in
 * that set). The client rebuilds the indexes with `buildCatalog`.
 */

export interface CatalogInput {
  /** Order matters: it is the "newest" sort key (`lib/catalog-query.ts`). */
  products: Product[];
  drops: Drop[];
  teasers: Teaser[];
  promotions: Promotion[];
}

export interface Catalog {
  readonly products: readonly Product[];
  readonly drops: readonly Drop[];
  readonly teasers: readonly Teaser[];
  readonly promotions: readonly Promotion[];
  readonly byId: ReadonlyMap<ProductId, Product>;
  readonly bySlug: ReadonlyMap<string, Product>;
  readonly dropByNo: ReadonlyMap<number, Drop>;
  readonly promoByCode: ReadonlyMap<PromoCode, Promotion>;
  /** Highest dropNo that has at least one product. Fixture: 5. */
  readonly currentDropNo: number;
}

/**
 * Index the four lists. Pure, eager, and no module-level cache.
 *
 * `products` keeps the order it arrived in — the listing's "Mới nhất" sort
 * reads that order and nothing else, so re-sorting here would quietly change
 * what the shop shows first.
 *
 * `currentDropNo` is DERIVED rather than carried: it is the highest issue
 * number that actually has a style in it. A stored constant is a constant
 * somebody forgets to bump, which on a model where the issue is the whole
 * product is the worst kind of stale. A fixed style (slice B5) has no issue
 * and does not count.
 */
export function buildCatalog(input: CatalogInput): Catalog {
  const products = input.products;
  let currentDropNo = 0;
  for (const p of products) {
    if (p.dropNo !== null && p.dropNo > currentDropNo) currentDropNo = p.dropNo;
  }

  return {
    products,
    drops: input.drops,
    teasers: input.teasers,
    promotions: input.promotions,
    byId: new Map(products.map((p) => [p.id, p])),
    bySlug: new Map(products.map((p) => [p.slug, p])),
    dropByNo: new Map(input.drops.map((d) => [d.no, d])),
    promoByCode: new Map(input.promotions.map((p) => [p.code, p])),
    currentDropNo,
  };
}

/** The styles announced for an issue that has not opened yet. */
export function teasersIn(catalog: Catalog, dropNo: number): Teaser[] {
  return catalog.teasers.filter((t) => t.dropNo === dropNo);
}

/**
 * The style an address from before slice B5 meant, when it can only be one.
 *
 * Until 25/09/2026 an issue's style was published at `/products/khoi`; since
 * then its address carries its issue, `/products/s05-khoi`, because a name can
 * come back in a later issue. A link saved before the change still arrives
 * with the bare segment. It is answered with the style whose address is that
 * segment behind ITS OWN issue's code — and only when exactly one style
 * answers: two issues with a KHÓI each would make the old address ambiguous,
 * and guessing between them is worse than a 404.
 *
 * Never for a segment some style is published under today — the page looks
 * that up first — and never a fixed style, whose address has no prefix.
 */
export function legacySlugTarget(catalog: Catalog, slug: string): Product | undefined {
  const hits = catalog.products.filter(
    (p) => p.dropNo !== null && p.slug === `${issueCode(p.dropNo).toLowerCase()}-${slug}`,
  );
  return hits.length === 1 ? hits[0] : undefined;
}
