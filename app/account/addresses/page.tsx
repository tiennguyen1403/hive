import type { Metadata } from "next";
import { AddressesScreen } from "@/components/account/AddressesScreen";
import { listAddresses } from "@/lib/db/addresses";
import { requireMe } from "@/lib/db/profiles";

export const metadata: Metadata = {
  title: "Sổ địa chỉ",
  // An account page is personal and is rendered behind a server-side
  // session check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * The book itself is read here and handed down finished. `listAddresses()`
 * is wrapped in `React.cache`, so the account layout above — which needs the
 * count for the rail — and this page share one query.
 */
export default async function AddressesPage() {
  await requireMe("/account/addresses");
  const addresses = await listAddresses();
  return <AddressesScreen addresses={addresses} />;
}
