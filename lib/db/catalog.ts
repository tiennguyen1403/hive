import "server-only";

import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import type { Catalog, CatalogInput } from "@/lib/catalog";

/**
 * The one door between the app and wherever the catalogue lives.
 *
 * Every server render goes through `loadCatalog()`; nothing else in `app/`
 * imports `data/catalog.ts` any more. Slice B0a still answers from the
 * fixture, so behaviour is byte-for-byte what it was. Slice B0b replaces the
 * body with a read through `@supabase/ssr` — the signature does not move, so
 * no caller changes.
 *
 * `import "server-only"` is what keeps that promise enforceable: the day the
 * body holds a database URL, a Client Component that imports this module
 * fails the build instead of shipping the connection to the browser. Next
 * implements the marker at the compiler level, so no package is installed
 * (`node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`,
 * "Preventing environment poisoning").
 *
 * `async` from the start, again so B0b is a body change and not a signature
 * change.
 */
export async function loadCatalog(): Promise<Catalog> {
  return FIXTURE_CATALOG;
}

/**
 * The serialisable half of a catalogue, for the trip to the browser.
 *
 * React serialises props crossing the server → client boundary, and a `Map`
 * is not serialisable — so the provider is handed the four arrays and rebuilds
 * the indexes on the client with `buildCatalog`.
 */
export function catalogInput(catalog: Catalog): CatalogInput {
  return {
    products: [...catalog.products],
    drops: [...catalog.drops],
    teasers: [...catalog.teasers],
    promotions: [...catalog.promotions],
  };
}
