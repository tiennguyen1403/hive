import type { Metadata } from "next";
import { WishlistScreen } from "@/components/account/WishlistScreen";

export const metadata: Metadata = {
  title: "Đã lưu",
  // The list lives in one browser and belongs to whoever is holding the
  // phone. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * The screen reads the catalogue from its provider, and the way back into
 * the shop from the clock (`wayToShop`, v3 slice 11), so the page hands it
 * nothing.
 */
export default function Page() {
  return <WishlistScreen />;
}
