import type { Metadata } from "next";
import { CheckoutView, type CheckoutPrefill, type ProvinceName } from "@/components/feed/checkout/CheckoutView";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { PROVINCES, findWard, wardLabel } from "@/data/regions";
import type { Address } from "@/data/types";
import { listAddresses } from "@/lib/db/addresses";
import { loadMe } from "@/lib/db/profiles";
import type { Me } from "@/lib/me";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Thanh toán" };

/**
 * Checkout, round v4 "Feed" (slice 2): the approved mock's
 * `prototype/explore/feed/checkout.html` (`CheckoutView`). No tab bar and no
 * footer, as in the mock: on the phone its own bar goes back to the basket and
 * the "Đặt hàng" bar holds the bottom; from 900px the top bar carries only the
 * page's name and the way back to the basket.
 *
 * Read here, on the server:
 * · the 34 provinces, as `{ code, name }` in the official order the mock's
 *   picker lists — `data/regions.ts` and its 3,321 communes stay here; the
 *   communes come from `/api/wards`, one province at a time;
 * · for a signed-in shopper, what the form starts with (the mock's
 *   `?fill=1`): the default address of the account's book (Postgres, slice
 *   B1), with its commune's name, and the account's e-mail.
 */
export default async function CheckoutPage() {
  const [me, book] = await Promise.all([loadMe(), listAddresses()]);
  const provinces: ProvinceName[] = PROVINCES.map((p) => ({ code: p.code, name: p.name }));

  return (
    <FeedFrame
      page="checkout"
      tabbar={false}
      foot="none"
      mbar={{ title: "Thanh toán", back: "/cart", label: "Về giỏ", hard: true }}
    >
      <CheckoutView provinces={provinces} prefill={me ? prefillOf(me, book) : null} />
    </FeedFrame>
  );
}

/**
 * The account's default address (the first when none is marked), its phone
 * written the way people read one ("0938 571 204"), and the account's e-mail;
 * the account's own name and phone when the book is empty.
 */
function prefillOf(me: Me, book: Address[]): CheckoutPrefill {
  const home = book.find((a) => a.isDefault) ?? book[0];
  const ward = home ? findWard(home.provinceCode, home.wardCode) : undefined;
  const phone = home?.phone || me.phone;
  return {
    name: home?.recipient || me.name,
    phone: phone ? formatPhone(phone).replace(/ /g, " ") : "",
    email: me.email,
    provinceCode: home?.provinceCode ?? "",
    wardCode: ward ? ward.code : "",
    wardLabel: ward ? wardLabel(ward) : "",
    street: home?.line ?? "",
  };
}
