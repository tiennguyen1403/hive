import { AccountNav } from "@/components/feed/account/AccountNav";
import { OrderMissing } from "@/components/feed/account/OrderMissing";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { loadMe } from "@/lib/db/profiles";
import { picker } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

/**
 * An order the account cannot see (round v4 slice 3b): the one the page asked
 * `notFound()` for — one that does not exist, or somebody else's, the same
 * nothing (QĐ-16). The mock's "Không tìm thấy đơn DH-…" in the account frame,
 * exactly as the page drew it before, now with the HTTP 404 behind it: the
 * page throws before anything streams, so the status can still be set
 * (`03-api-reference/03-file-conventions/loading.md`, "Status Codes"). In the
 * page's language since round v6 slice E3a.
 */
export default async function OrderNotFound() {
  const [me, locale] = await Promise.all([loadMe(), getLocale()]);
  return (
    <FeedFrame
      page="order"
      foot="lite"
      mainClass="acc-layout"
      mbar={{ title: picker(locale)({ vi: "Đơn hàng", en: "Orders" }), back: "/account/orders" }}
    >
      <AccountNav on="orders" signedIn={me !== null} locale={locale} />
      <div className="acc-main">
        <OrderMissing />
      </div>
    </FeedFrame>
  );
}
