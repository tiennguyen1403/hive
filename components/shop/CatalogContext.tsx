"use client";

import { createContext, useContext, useMemo } from "react";
import { buildCatalog, type Catalog, type CatalogInput } from "@/lib/catalog";

const Ctx = createContext<Catalog | null>(null);

/**
 * The catalogue, once, for every Client Component under it.
 *
 * It takes `CatalogInput` and not `Catalog`: props crossing the server →
 * client boundary are serialised by React, and the indexes on a `Catalog` are
 * `Map`s, which do not survive that trip. The server hands over four plain
 * arrays (`catalogInput` in `lib/db/catalog.ts`) and the indexes are rebuilt
 * here.
 *
 * `useMemo` and not a rebuild per render: `buildCatalog` walks the products
 * four times, and the identity of the value matters to everything that keys
 * off `catalog` below.
 *
 * It is not storage. The catalogue is the shop's own data, arriving with the
 * page; the basket and the shortlist are the device's, and those keep living
 * in `localStorage` (DESIGN.md §8).
 */
export function CatalogProvider({
  input,
  children,
}: {
  input: CatalogInput;
  children: React.ReactNode;
}) {
  const catalog = useMemo(() => buildCatalog(input), [input]);
  return <Ctx.Provider value={catalog}>{children}</Ctx.Provider>;
}

export function useCatalog(): Catalog {
  const catalog = useContext(Ctx);
  if (!catalog) {
    throw new Error("useCatalog() needs a <CatalogProvider> above it");
  }
  return catalog;
}
