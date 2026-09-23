import type { Metadata } from "next";
import { AddressFormScreen } from "@/components/account/AddressFormScreen";
import type { ProvinceOption } from "@/components/checkout/CheckoutScreen";
import { provinceLabel, provincesByName } from "@/data/regions";

export const metadata: Metadata = {
  title: "Thêm địa chỉ",
  // An account page is personal and renders client-side behind a session
  // check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * The 34 provinces are flattened here so `data/regions.ts` — and the 218KB
 * of communes it imports — never reaches the client. Same as checkout.
 */
export default async function AddressFormPage(
  props: PageProps<"/account/addresses/new">,
) {
  const sp = await props.searchParams;
  const edit = Array.isArray(sp.edit) ? sp.edit[0] : sp.edit;
  const provinces: ProvinceOption[] = provincesByName().map((p) => ({
    code: p.code,
    label: provinceLabel(p),
  }));
  return <AddressFormScreen provinces={provinces} {...(edit ? { editId: edit } : {})} />;
}
