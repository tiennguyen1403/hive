import type { Metadata } from "next";
import { WishlistScreen } from "@/components/account/WishlistScreen";
import { featuredDrop } from "@/lib/drop";

export const metadata: Metadata = {
  title: "Đã lưu",
  // The list lives in one browser and belongs to whoever is holding the
  // phone. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

export default function Page() {
  const { drop } = featuredDrop(undefined);
  return <WishlistScreen currentDropNo={drop.no} />;
}
