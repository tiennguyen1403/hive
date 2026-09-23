import type { Metadata } from "next";
import { CheckoutScreen, type ProvinceOption } from "@/components/checkout/CheckoutScreen";
import { provinceLabel, provincesByName } from "@/data/regions";

export const metadata: Metadata = { title: "Thanh toán" };

/**
 * The checkout route.
 *
 * One thing is done here rather than in the browser: the 34 provinces are
 * flattened to `{ code, label }` so `data/regions.ts` — and the 218KB of
 * communes it imports — never crosses into the client bundle. The commune
 * list itself comes from `/api/wards`, one province at a time.
 *
 * The discount code no longer arrives in `?promo=`. It rides with the cart
 * (`lib/promotions.ts`), which is where it is applied, and is revalidated
 * against `data/promotions.ts` on every render of the screen.
 */
export default function CheckoutPage() {
  const provinces: ProvinceOption[] = provincesByName().map((p) => ({
    code: p.code,
    label: provinceLabel(p),
  }));

  return <CheckoutScreen provinces={provinces} />;
}
