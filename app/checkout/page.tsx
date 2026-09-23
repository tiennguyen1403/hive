import type { Metadata } from "next";
import { CheckoutScreen, type ProvinceOption } from "@/components/checkout/CheckoutScreen";
import { provinceLabel, provincesByName } from "@/data/regions";
import { listAddresses } from "@/lib/db/addresses";

export const metadata: Metadata = { title: "Thanh toán" };

/**
 * The checkout route.
 *
 * Two things are done here rather than in the browser. The 34 provinces are
 * flattened to `{ code, label }` so `data/regions.ts` — and the 218KB of
 * communes it imports — never crosses into the client bundle; the commune
 * list itself comes from `/api/wards`, one province at a time.
 *
 * And the address book is read, because since slice B1 a signed-in shopper's
 * book is in Postgres and only a server may go there (QĐ-25). A guest gets an
 * empty array and keeps the one in this browser.
 *
 * The discount code no longer arrives in `?promo=`. It rides with the cart
 * (`lib/promotions.ts`), which is where it is applied, and is revalidated
 * against the catalogue on every render of the screen.
 */
export default async function CheckoutPage() {
  const accountAddresses = await listAddresses();
  const provinces: ProvinceOption[] = provincesByName().map((p) => ({
    code: p.code,
    label: provinceLabel(p),
  }));

  return <CheckoutScreen provinces={provinces} accountAddresses={accountAddresses} />;
}
