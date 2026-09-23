import type { Metadata } from "next";
import { AddressesScreen } from "@/components/account/AddressesScreen";

export const metadata: Metadata = {
  title: "Sổ địa chỉ",
  // An account page is personal and renders client-side behind a session
  // check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

export default function AddressesPage() {
  return <AddressesScreen />;
}
