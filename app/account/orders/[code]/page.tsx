import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountNav } from "@/components/feed/account/AccountNav";
import { LookupForm } from "@/components/feed/account/LookupForm";
import { OrderView } from "@/components/feed/account/OrderView";
import { OutCard } from "@/components/feed/account/OutCard";
import { FeedFrame } from "@/components/feed/FeedFrame";
import { feedAddressLine } from "@/data/regions";
import { demoNowMs } from "@/lib/clock";
import { effectiveOrder } from "@/lib/customer-orders";
import { findMyOrder } from "@/lib/db/orders";
import { loadMe } from "@/lib/db/profiles";
import { picker, type Pair } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { isOrderCode } from "@/lib/lookup";
import { SITE_DESCRIPTION_TEXT } from "@/lib/site";

const NO_INDEX = { index: false, follow: false } as const;

/** "Đơn hàng": signed out, the tab's title and the phone bar's; "Orders" in English (round v6 slice E3a). */
const ORDERS: Pair = { vi: "Đơn hàng", en: "Orders" };

/** The code as the page reads it: the mock upper-cases what the address carries (`order.js`). */
const codeOf = (raw: string) => raw.trim().toUpperCase();

/**
 * The tab's title as the mock sets it: the order's code, "Không tìm thấy đơn",
 * or "Đơn hàng" signed out; in the page's language since round v6 slice E3a
 * ("Order not found", "Orders"), with the site's description in it — the link
 * card keeps the layout's Vietnamese one (QĐ-40).
 */
export async function generateMetadata(props: PageProps<"/account/orders/[code]">): Promise<Metadata> {
  const [{ code }, locale] = await Promise.all([props.params, getLocale()]);
  const t = picker(locale);
  const description = t(SITE_DESCRIPTION_TEXT);
  if (!(await loadMe())) return { title: t(ORDERS), description, robots: NO_INDEX };
  const found = await findMyOrder(codeOf(code));
  return {
    title: found ? found.code : t({ vi: "Không tìm thấy đơn", en: "Order not found" }),
    description,
    robots: NO_INDEX,
  };
}

/**
 * One order, round v4 "Feed" (slice 3a): the approved mock's
 * `prototype/explore/feed/order.html` (`OrderView`), in the account frame
 * ("Đơn hàng" lit in the menu); on the phone its bar goes back to the list and
 * shows the code once the big one has scrolled away.
 *
 * WHO may see it is decided here, on the server, before anything renders:
 * `findMyOrder` looks in the account's own list, so somebody else's order, an
 * order that does not exist and a string that is not a code all come back as
 * the same nothing — and the page says the same "Không tìm thấy đơn DH-…" for
 * each (QĐ-16), in the frame, with the ways on, as the mock does. Since slice
 * 3b that answer is a real HTTP 404: `notFound()`, before anything streams,
 * and the segment's `not-found.tsx` draws the same words. Signed out, the page
 * asks to sign in to see that order and offers the guest lookup with the code
 * typed in.
 *
 * The status is judged against the clock here (`effectiveOrder`), at the
 * instant the frame draws with; the address line is built here because the
 * commune list stays on the server. `params` is a promise in Next 16.
 */
export default async function OrderPage(props: PageProps<"/account/orders/[code]">) {
  const [{ code: raw }, locale] = await Promise.all([props.params, getLocale()]);
  const code = codeOf(raw);
  const now = demoNowMs();
  const me = await loadMe();
  const t = picker(locale);

  if (!me) {
    return (
      <FeedFrame
        page="order"
        foot="lite"
        footSkip={["/track"]}
        mainClass="acc-layout"
        now={now}
        mbar={{ title: t(ORDERS), back: "/account/orders" }}
      >
        <AccountNav on="orders" signedIn={false} locale={locale} />
        <div className="acc-main">
          <h1 className="sr-only">{t({ vi: `Đơn ${code}`, en: `Order ${code}` })}</h1>
          <OutCard
            title={
              code
                ? t({ vi: `Đăng nhập để xem đơn ${code}`, en: `Sign in to see order ${code}` })
                : t({ vi: "Đăng nhập để xem đơn", en: "Sign in to see your orders" })
            }
            id="out-order"
            here={`/account/orders/${encodeURIComponent(code)}`}
            locale={locale}
          />
          <LookupForm id="od" code={isOrderCode(code) ? code : ""} />
        </div>
      </FeedFrame>
    );
  }

  const found = await findMyOrder(code);
  if (!found) notFound();

  const order = effectiveOrder(found, new Date(now));
  return (
    <FeedFrame
      page="order"
      foot="lite"
      mainClass="acc-layout"
      now={now}
      mbar={{ title: order.code, back: "/account/orders", watch: "[data-ui='feed'] .od-hero" }}
    >
      <AccountNav on="orders" signedIn locale={locale} />
      <div className="acc-main">
        <OrderView order={order} addressLine={feedAddressLine(order.shipTo)} />
      </div>
    </FeedFrame>
  );
}
