import type { Metadata } from "next";
import { WishlistScreen } from "@/components/account/WishlistScreen";
import { loadCatalog } from "@/lib/db/catalog";
import { featuredDrop } from "@/lib/drop";

export const metadata: Metadata = {
  title: "Đã lưu",
  // The list lives in one browser and belongs to whoever is holding the
  // phone. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

export default async function Page() {
  const catalog = await loadCatalog();
  const { drop } = featuredDrop(catalog, undefined);
  return <WishlistScreen currentDropNo={drop.no} />;
}
