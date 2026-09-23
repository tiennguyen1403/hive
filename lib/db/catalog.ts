import "server-only";

import { connection } from "next/server";
import { cache } from "react";
import { buildCatalog, type Catalog, type CatalogInput } from "@/lib/catalog";
import { parseCatalogSnapshot } from "./catalog-snapshot";
import { getSupabase } from "./server";

/**
 * The one door between the app and wherever the catalogue lives.
 *
 * Every server render goes through `loadCatalog()`; nothing else in `app/`
 * imports `data/catalog.ts`. Slice B0a answered from the fixture, slice B0b
 * answers from Postgres — the signature did not move, so no caller changed.
 *
 * `import "server-only"` is what keeps the promise enforceable: the body holds
 * a database URL now, so a Client Component importing this module fails the
 * build instead of shipping the connection to the browser. Next implements the
 * marker at the compiler level, so no package is installed
 * (`node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`,
 * "Preventing environment poisoning").
 */

/**
 * One round trip, once per request.
 *
 * `React.cache` is not an optimisation here, it is a correctness fix:
 * `generateMetadata` and the page body both call this, and `/products` and
 * `/so/[no]` call it twice per render. Without the cache each of those is a
 * separate query, and two of them could disagree with each other mid-drop.
 * (`01-getting-started/06-fetching-data.md`, "Reusing data with React.cache":
 * "Multiple components can then call the function within the same request
 * while sharing one result".)
 *
 * `connection()` marks the read as request-time. Without it Next is entitled
 * to run this during `next build` — which would mean a build that needs a live
 * database and a shop whose stock figures were frozen at deploy time
 * (`03-api-reference/04-functions/connection.md`: "prerendering stops here").
 *
 * The whole catalogue arrives as one `jsonb` document from `catalog_snapshot()`
 * rather than as five selects the client would have to join. Twenty-one styles
 * over five tables is small enough to pay for in one go and simple enough to
 * check on arrival (`./catalog-snapshot.ts`).
 */
export const loadCatalog = cache(async (): Promise<Catalog> => {
  await connection();

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("catalog_snapshot");
  if (error) throw new Error(`catalog_snapshot failed: ${error.message}`);

  return buildCatalog(parseCatalogSnapshot(data));
});

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
