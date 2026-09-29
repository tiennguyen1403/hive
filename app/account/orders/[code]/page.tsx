import type { Metadata } from "next";
import Link from "next/link";
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
import { isOrderCode } from "@/lib/lookup";

const NO_INDEX = { index: false, follow: false } as const;

/** The code as the page reads it: the mock upper-cases what the address carries (`order.js`). */
const codeOf = (raw: string) => raw.trim().toUpperCase();

/** The tab's title as the mock sets it: the order's code, "Không tìm thấy đơn", or "Đơn hàng" signed out. */
export async function generateMetadata(props: PageProps<"/account/orders/[code]">): Promise<Metadata> {
  const { code } = await props.params;
  if (!(await loadMe())) return { title: "Đơn hàng", robots: NO_INDEX };
  const found = await findMyOrder(codeOf(code));
  return { title: found ? found.code : "Không tìm thấy đơn", robots: NO_INDEX };
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
 * each (QĐ-16), in the frame, with the ways on, as the mock does. Signed out,
 * the page asks to sign in to see that order and offers the guest lookup with
 * the code typed in.
 *
 * The status is judged against the clock here (`effectiveOrder`), at the
 * instant the frame draws with; the address line is built here because the
 * commune list stays on the server. `params` is a promise in Next 16.
 */
export default async function OrderPage(props: PageProps<"/account/orders/[code]">) {
  const { code: raw } = await props.params;
  const code = codeOf(raw);
  const now = demoNowMs();
  const me = await loadMe();

  if (!me) {
    return (
      <FeedFrame
        page="order"
        foot="lite"
        footSkip={["/track"]}
        mainClass="acc-layout"
        now={now}
        mbar={{ title: "Đơn hàng", back: "/account/orders" }}
      >
        <AccountNav on="orders" signedIn={false} />
        <div className="acc-main">
          <h1 className="sr-only">Đơn {code}</h1>
          <OutCard
            title={code ? `Đăng nhập để xem đơn ${code}` : "Đăng nhập để xem đơn"}
            id="out-order"
            here={`/account/orders/${encodeURIComponent(code)}`}
          />
          <LookupForm id="od" code={isOrderCode(code) ? code : ""} />
        </div>
      </FeedFrame>
    );
  }

  const found = await findMyOrder(code);
  if (!found) {
    return (
      <FeedFrame page="order" foot="lite" mainClass="acc-layout" now={now} mbar={{ title: "Đơn hàng", back: "/account/orders" }}>
        <AccountNav on="orders" signedIn />
        <div className="acc-main">
          <div className="nf">
            <h1 className="nf-title disp">Không tìm thấy đơn{code ? ` ${code}` : ""}</h1>
            <div className="nf-acts">
              <Link className="btn btn-blue" href="/account/orders">
                Xem đơn hàng
              </Link>
              <Link className="btn btn-line" href="/track">
                Tra cứu đơn
              </Link>
            </div>
          </div>
        </div>
      </FeedFrame>
    );
  }

  const order = effectiveOrder(found, new Date(now));
  return (
    <FeedFrame
      page="order"
      foot="lite"
      mainClass="acc-layout"
      now={now}
      mbar={{ title: order.code, back: "/account/orders", watch: "[data-ui='feed'] .od-hero" }}
    >
      <AccountNav on="orders" signedIn />
      <div className="acc-main">
        <OrderView order={order} addressLine={feedAddressLine(order.shipTo)} />
      </div>
    </FeedFrame>
  );
}
