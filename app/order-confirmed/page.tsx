import type { Metadata } from "next";
import { OrderConfirmed } from "@/components/checkout/OrderConfirmed";
import { featuredDrop } from "@/lib/drop";

export const metadata: Metadata = {
  title: "Đã nhận đơn",
  // The receipt is personal and lives only in this browser. Nothing here
  // belongs in a search index.
  robots: { index: false, follow: false },
};

export default function OrderConfirmedPage() {
  const { drop } = featuredDrop(undefined);
  return <OrderConfirmed dropNo={drop.no} />;
}
