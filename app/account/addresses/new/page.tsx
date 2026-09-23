import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddressFormScreen } from "@/components/account/AddressFormScreen";
import type { ProvinceOption } from "@/components/checkout/CheckoutScreen";
import { provinceLabel, provincesByName } from "@/data/regions";
import { findAddress } from "@/lib/db/addresses";
import { requireMe } from "@/lib/db/profiles";

export const metadata: Metadata = {
  title: "Thêm địa chỉ",
  // An account page is personal and is rendered behind a server-side
  // session check. Nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

/**
 * The 34 provinces are flattened here so `data/regions.ts` — and the 218KB
 * of communes it imports — never reaches the client. Same as checkout.
 *
 * `?edit=` is fetched here too, and row level security is what decides
 * whether it exists: an id belonging to somebody else comes back as nothing
 * and turns into a 404, which is the same answer as a made-up id (QĐ-16).
 */
export default async function AddressFormPage(
  props: PageProps<"/account/addresses/new">,
) {
  const me = await requireMe("/account/addresses/new");
  const sp = await props.searchParams;
  const edit = Array.isArray(sp.edit) ? sp.edit[0] : sp.edit;

  const existing = edit ? await findAddress(edit) : null;
  if (edit && !existing) notFound();

  const provinces: ProvinceOption[] = provincesByName().map((p) => ({
    code: p.code,
    label: provinceLabel(p),
  }));

  return (
    <AddressFormScreen
      provinces={provinces}
      {...(existing
        ? {
            editing: {
              id: String(existing.id),
              recipient: existing.recipient,
              phone: existing.phone,
              provinceCode: existing.provinceCode,
              wardCode: existing.wardCode,
              line: existing.line,
              label: existing.label,
              isDefault: existing.isDefault,
            },
          }
        : { seed: { recipient: me.name, phone: me.phone } })}
    />
  );
}
