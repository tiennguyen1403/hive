"use client";

import Image from "next/image";
import Link from "next/link";
import { useMe } from "@/components/account/MeContext";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { colorLabel } from "@/data/colors";
import type { AddressLabel, Order } from "@/data/types";
import { dayMonth } from "@/lib/datetime";
import { addressLabelText, feedStateLabel } from "@/lib/feed-account";
import {
  EMPTY_MY_STATE,
  SIZE_SLOT_TEXT,
  favAlert,
  favThumbs,
  meNow,
  memberSince,
  remindTile,
  savedStyles,
  type MeNow,
  type SavedStyle,
} from "@/lib/feed-me";
import { confirmTransfer } from "@/lib/feed-order";
import { picker } from "@/lib/i18n";
import type { Me } from "@/lib/me";
import { vnd } from "@/lib/money";
import { orderTotalVnd } from "@/lib/orders";
import { productText } from "@/lib/product-text";
import { FeedClock } from "../FeedClock";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow, useNowMs } from "../now";
import { useKeep } from "../useKeep";
import { cx } from "../useReveal";
import { OrderSteps, StatusChip, Tile } from "./OrderBits";
import { SignOutForm } from "./SignOut";

/** The default address (or the first one), as Tôi's tile prints it; the line is built on the server. */
export interface MeAddress {
  /** "Nhà", "Công ty", "Khác", as the book stores it; printed through `addressLabelText`. */
  label: AddressLabel;
  /** "24 Nguyễn Thị Minh Khai, Phường Sài Gòn, TP. Hồ Chí Minh". */
  line: string;
}

interface MeViewProps {
  /** Who is signed in, from the server; the root layout's `me` wins once it is newer (Hồ sơ's "Lưu"). */
  me: Me;
  /** The account's orders, newest first, each in the state the clock says it is in (read on the server). */
  orders: Order[];
  address: MeAddress | null;
}

/**
 * Tôi, signed in (round v4 slice 3b): the approved mock's `account.html` and
 * `me.js`. Who they are; "Đơn hàng" — the order that needs them now (a
 * transfer's hold ticking in the countdown's face, a card order's too, or a
 * COD order waiting for the call) beside the parcel on its way, else the
 * return window that closes soonest (to Hỏi đáp's return group until the
 * request flow exists, QĐ-34, slice 4b), else a quiet line; then four tiles
 * with their own things in them — the saved styles with their live stock,
 * the reminder as a date block, Size của tôi, the default address — and
 * "Đăng xuất" on the phone (from 900px the menu beside carries it, and "Sửa
 * hồ sơ" is Hồ sơ's item).
 *
 * The saved styles, the reminder and the sizes are the account's as the
 * screen keeps them (`MyStateContext`), so a heart pressed a moment ago on
 * another page is already here.
 *
 * In the page's language since round v6 slice E3a ("Member since", "Orders",
 * "Saved", "My sizes", "Deliver to", "Sign out"). The name, the e-mail and the
 * address keep their own words, marked `lang="vi"` on an English page; the
 * address's name ("Nhà") is printed through `addressLabelText` ("Home").
 */
export function MeView({ me, orders, address }: MeViewProps) {
  const who = useMe() ?? me;
  const catalog = useCatalog();
  const locale = useLocale();
  const t = picker(locale);
  const now = useNow();
  const keep = useKeep();
  const state = keep.state ?? EMPTY_MY_STATE;
  const saved = savedStyles(catalog, state.favorites);
  const own = locale === "en" ? ("vi" as const) : undefined;

  return (
    <>
      <section className="me-id" aria-labelledby="me-name">
        <h1 className="me-name disp" id="me-name" lang={own}>
          {who.name}
        </h1>
        <p className="me-meta">
          {t<React.ReactNode>({
            vi: (
              <>
                {who.email} · Thành viên từ {memberSince(who.joinedAt)}
              </>
            ),
            en: (
              <>
                <span lang="vi">{who.email}</span> · Member since {memberSince(who.joinedAt, "en")}
              </>
            ),
          })}
        </p>
        <Link className="pill me-edit" href="/account/profile">
          <FeedIcon name="pencil-simple" />
          {t({ vi: "Sửa hồ sơ", en: "Edit profile" })}
        </Link>
      </section>

      <section className="acc-sec" aria-labelledby="me-orders">
        <div className="acc-sec-head">
          <h2 className="acc-sec-title" id="me-orders">
            {t({ vi: "Đơn hàng", en: "Orders" })}
          </h2>
          {orders.length > 0 ? (
            <Link className="link" href="/account/orders">
              {t({ vi: "Xem tất cả", en: "View all" })}
            </Link>
          ) : (
            <Link className="link" href="/products">
              {t({ vi: "Xem Cửa hàng", en: "Go to Shop" })}
            </Link>
          )}
        </div>
        <OrdersNow now={meNow(orders, now)} />
      </section>

      <section className="acc-sec" aria-label={t({ vi: "Của tôi", en: "My things" })}>
        <div className="bento">
          <FavTile saved={saved} alert={favAlert(catalog, saved, now, locale)} />
          <RemindTileView reminders={state.reminders} />
          <Link className="bt bt-size-tile bt-link" href="/account/profile#size">
            <span className="bt-label">{t({ vi: "Size của tôi", en: "My sizes" })}</span>
            <FeedIcon name="caret-right" className="bt-go" />
            <span className="bt-sizes">
              <span className="bt-size">
                <FeedIcon name="t-shirt" />
                <b>{state.sizes.top ?? "-"}</b>
                <span>{t(SIZE_SLOT_TEXT.top)}</span>
              </span>
              <span className="bt-size">
                <FeedIcon name="pants" />
                <b>{state.sizes.bottom ?? "-"}</b>
                <span>{t(SIZE_SLOT_TEXT.bottom)}</span>
              </span>
            </span>
          </Link>
          {address ? (
            <Link className="bt bt-addr bt-link" href="/account/addresses">
              <span className="bt-label">
                <FeedIcon name="map-pin" />
                {t({ vi: "Giao tới", en: "Deliver to" })}
              </span>
              <FeedIcon name="caret-right" className="bt-go" />
              <span className="bt-addr-name disp">{addressLabelText(address.label, locale)}</span>
              <span className="bt-addr-line" lang={own}>
                {address.line}
              </span>
            </Link>
          ) : (
            <Link className="bt bt-addr bt-link" href="/account/addresses">
              <span className="bt-label">
                <FeedIcon name="map-pin" />
                {t({ vi: "Địa chỉ", en: "Addresses" })}
              </span>
              <span className="bt-sub">{t({ vi: "Chưa có địa chỉ", en: "No addresses yet" })}</span>
              <FeedIcon name="caret-right" className="bt-go" />
            </Link>
          )}
        </div>
      </section>

      <SignOutForm id="me-signout" />
      <button className="btn btn-line sign-out" type="submit" form="me-signout">
        <FeedIcon name="sign-out" />
        {t({ vi: "Đăng xuất", en: "Sign out" })}
      </button>
    </>
  );
}

/** "Đơn hàng" under its heading: the cards, or the line that says there is nothing to do. */
function OrdersNow({ now: n }: { now: MeNow }) {
  const t = picker(useLocale());
  if (n.kind === "none") return <div className="none-card">{t({ vi: "Chưa có đơn nào", en: "No orders yet" })}</div>;
  if (n.kind === "quiet") return <div className="none-card">{t({ vi: "Không có đơn đang xử lý", en: "No ongoing orders" })}</div>;
  if (n.kind === "return") {
    return (
      <div className="me-now">
        <ReturnCard order={n.order} until={n.until} />
      </div>
    );
  }
  return (
    <div className="me-now">
      {n.primary && <NowCard order={n.primary} />}
      {n.moving && <MovingCard order={n.moving} />}
    </div>
  );
}

/** An order's pieces as tiles, each named for a screen reader. */
function Pieces({ order }: { order: Order }) {
  const catalog = useCatalog();
  return (
    <div className="tiles">
      {order.lines.map((l, i) => (
        <Tile key={`${l.productId}:${l.color}:${l.size}:${i}`} line={l} product={catalog.byId.get(l.productId)} alt />
      ))}
    </div>
  );
}

const orderHref = (o: Order) => `/account/orders/${o.code}`;

/**
 * The order that needs the shopper, on ink (`nowCard`): a transfer awaited —
 * a card order's too, since B7 — with its hold ticking, "Giữ hàng tới …", the
 * pieces and "Chuyển khoản" to the order's payment block; a COD order before
 * the shop's call with its state and the total. The code's link covers the
 * card; the button stands above it.
 */
function NowCard({ order: o }: { order: Order }) {
  const nowMs = useNowMs();
  const locale = useLocale();
  const t = picker(locale);
  const transfer = confirmTransfer(o, locale);
  if (transfer) {
    return (
      <article
        className="now on-dark"
        aria-label={`${o.code}, ${feedStateLabel("AWAITING_TRANSFER", locale).toLocaleLowerCase(locale)}`}
      >
        <div className="now-top">
          <p className="now-code disp">
            <Link href={orderHref(o)}>{o.code}</Link>
          </p>
          <p className="now-total">{vnd(orderTotalVnd(o), locale)}</p>
        </div>
        <FeedClock
          until={transfer.dueAt}
          now={nowMs}
          tag="p"
          className="now-cd"
          label={t({ vi: "Thời gian giữ hàng còn lại", en: "Reservation time left" })}
        />
        <p className="now-when">
          {t<React.ReactNode>({
            vi: (
              <>
                Giữ hàng tới <b>{transfer.until}</b>
              </>
            ),
            en: (
              <>
                Reserved until <b>{transfer.until}</b>
              </>
            ),
          })}
        </p>
        <div className="now-foot">
          <Pieces order={o} />
          <Link className="btn btn-light now-cta" href={`${orderHref(o)}#pay`}>
            {t({ vi: "Chuyển khoản", en: "Bank transfer" })}
          </Link>
        </div>
      </article>
    );
  }
  return (
    <article className="now on-dark" aria-labelledby={`now-${o.code}`}>
      <div className="now-top">
        <p className="now-code disp" id={`now-${o.code}`}>
          <Link href={orderHref(o)}>{o.code}</Link>
        </p>
        <StatusChip state={o.status.state} />
      </div>
      <p className="now-when is-first">
        {t({ vi: "Cửa hàng gọi xác nhận trước khi giao", en: "The shop will call to confirm before delivery" })}
      </p>
      <div className="now-foot">
        <Pieces order={o} />
        <p className="now-total">{vnd(orderTotalVnd(o), locale)}</p>
      </div>
    </article>
  );
}

/** The parcel on its way (`movingCard`): the code and the total, the journey, the pieces and the tracking code. */
function MovingCard({ order: o }: { order: Order }) {
  const locale = useLocale();
  const tracking = o.status.state === "SHIPPING" ? o.status.trackingCode : "";
  return (
    <article className="soon-card" aria-labelledby={`mv-${o.code}`}>
      <div className="soon-card-top">
        <p className="ticket-code disp" id={`mv-${o.code}`}>
          <Link href={orderHref(o)}>{o.code}</Link>
        </p>
        <p className="now-total">{vnd(orderTotalVnd(o), locale)}</p>
      </div>
      <OrderSteps order={o} />
      <div className="soon-card-foot">
        <Pieces order={o} />
        {tracking && (
          <p className="soon-card-line">
            {picker(locale)<React.ReactNode>({
              vi: (
                <>
                  Mã vận đơn <b>{tracking}</b>
                </>
              ),
              en: (
                <>
                  Tracking no. <b>{tracking}</b>
                </>
              ),
            })}
          </p>
        )}
      </div>
    </article>
  );
}

/** Nothing running: the delivered order whose return window closes soonest (`returnCard`), to Hỏi đáp's return group (QĐ-34). */
function ReturnCard({ order: o, until }: { order: Order; until: string }) {
  const locale = useLocale();
  return (
    <article className="soon-card" aria-labelledby={`rt-${o.code}`}>
      <div className="soon-card-top">
        <p className="ticket-code disp" id={`rt-${o.code}`}>
          <Link href={orderHref(o)}>{o.code}</Link>
        </p>
        <StatusChip state={o.status.state} />
      </div>
      <div className="soon-card-foot">
        <Pieces order={o} />
        <Link className="pill" href="/faq#doi-tra">
          <FeedIcon name="arrow-u-up-left" />
          {picker(locale)<React.ReactNode>({
            vi: <>Đổi trả tới {dayMonth(until)}</>,
            en: `Returns until ${dayMonth(until, "en")}`,
          })}
        </Link>
      </div>
    </article>
  );
}

/**
 * The saved styles (`favTile`): four pictures of the colours saved, ĐÃ HẾT on
 * a colour with nothing left, and the one stock fact worth a glance — a saved
 * colour running out while its issue sells. Empty: "Chưa lưu mẫu nào". In
 * English "Saved", "SOLD OUT", "Nothing saved yet".
 */
function FavTile({ saved, alert }: { saved: SavedStyle[]; alert: string | null }) {
  const locale = useLocale();
  const tr = picker(locale);
  const label = tr({ vi: "Yêu thích", en: "Saved" });
  if (saved.length === 0) {
    return (
      <Link className="bt bt-fav-tile bt-link" href="/account/wishlist">
        <span className="bt-label">
          <FeedIcon name="heart" />
          {label}
        </span>
        <span className="bt-sub">{tr({ vi: "Chưa lưu mẫu nào", en: "Nothing saved yet" })}</span>
        <FeedIcon name="caret-right" className="bt-go" />
      </Link>
    );
  }
  return (
    <Link className="bt bt-fav-tile bt-link" href="/account/wishlist">
      <span className="bt-label">
        <FeedIcon name="heart" />
        {label}
      </span>
      <FeedIcon name="caret-right" className="bt-go" />
      <span className="bt-fav-row">
        {favThumbs(saved).map((t) => (
          <span className={cx("bt-fav", t.flat && "flat", t.sold && "is-sold")} key={t.product.id}>
            {t.src && (
              <Image
                src={t.src}
                width={120}
                height={150}
                sizes="(min-width: 900px) 104px, 80px"
                alt={`${productText(t.product, locale).name}, ${colorLabel(t.color, locale).toLocaleLowerCase(locale)}`}
              />
            )}
            {t.sold && <span className="bt-fav-stamp">{tr({ vi: "ĐÃ HẾT", en: "SOLD OUT" })}</span>}
          </span>
        ))}
      </span>
      {alert && (
        <span className="bt-fav-note">
          <span className="stock is-low">
            <b>
              <FeedIcon name="fire-fill" />
              {alert}
            </b>
          </span>
        </span>
      )}
    </Link>
  );
}

/**
 * The reminder (`remindTile`): on ink, "Nhắc Số 06", the date block and
 * "20:00 thứ Sáu, qua app" — the app is the one channel there is (QĐ-35); or
 * "Chưa bật nhắc", or "Chưa có Số mới" when no issue is announced.
 */
function RemindTileView({ reminders }: { reminders: readonly number[] }) {
  const catalog = useCatalog();
  const now = useNow();
  const locale = useLocale();
  const t = picker(locale);
  const r = remindTile(catalog, reminders, now, locale);
  if (r.kind === "none") {
    return (
      <Link className="bt bt-rem bt-link" href="/account/notifications">
        <span className="bt-label">
          <FeedIcon name="bell" />
          {t({ vi: "Nhắc", en: "Reminder" })}
        </span>
        <FeedIcon name="caret-right" className="bt-go" />
        <span className="bt-sub">{r.text}</span>
      </Link>
    );
  }
  return (
    <Link className="bt bt-rem is-dark bt-link" href="/account/notifications">
      <span className="bt-label">
        <FeedIcon name="bell-fill" />
        {r.title}
      </span>
      <FeedIcon name="caret-right" className="bt-go" />
      <span className="bt-date">
        <span className="bt-dd">{r.dd}</span>
        <span className="bt-mm disp">{t<React.ReactNode>({ vi: <>Thg {r.mm}</>, en: r.mm })}</span>
      </span>
      <span className="bt-sub">{r.line}</span>
    </Link>
  );
}
