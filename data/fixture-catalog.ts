import { buildCatalog, type Catalog } from "@/lib/catalog";
import { CATALOG, DROPS, TEASERS } from "./catalog";
import { PROMOTIONS } from "./promotions";

/**
 * The fixture, as a `Catalog`.
 *
 * One place assembles it, so `data/catalog.ts` and `data/promotions.ts` stay
 * what they are — lists of facts — and everything that wants the catalogue
 * asks for this value instead of importing the lists again. Tests read it
 * directly; the app reads it through `lib/db/catalog.ts`, which is the module
 * that swaps to Postgres.
 */
export const FIXTURE_CATALOG: Catalog = buildCatalog({
  products: CATALOG,
  drops: DROPS,
  teasers: TEASERS,
  promotions: PROMOTIONS,
});
