"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Order } from "@/data/types";
import { pictureOf } from "@/lib/feed";
import {
  confirmLines,
  confirmNext,
  confirmRows,
  confirmShipRows,
  confirmSteps,
  confirmTransfer,
  followLink,
  type ConfirmLine,
} from "@/lib/feed-order";
import { picker, plural } from "@/lib/i18n";
import { isFixed } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { orderTotalVnd, orderUnits } from "@/lib/orders";
import { FeedClock } from "../FeedClock";
import { FeedCopy } from "../FeedCopy";
import { FeedOkTitle } from "../FeedOkTitle";
import { FeedIcon } from "../icon/FeedIcon";
import { useNowMs } from "../now";
import { cx } from "../useReveal";

interface OrderConfirmedViewProps {
  /**
   * The order, read on the server — through the session for the account's own
   * order, through the httpOnly receipt cookie for a guest's
   * (`lib/db/orders.ts#loadReceipt`) — with the status the clock says it is in.
   */
  order: Order;
  /** "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh": built on the server, where the communes are. */
  addressLine: string;
  /** The order is in the signed-in account's list, so "Xem đơn" can open it there. */
  inAccount: boolean;
}

/**
 * The order confirmed, round v4 "Feed" (slice 2): the approved mock's
 * `order-confirmed.html` and `confirmed.js`, over the order the database just
 * placed (`lib/feed-order.ts`).
 *
 * · "Đã đặt hàng" with the check on its line, "Mã đơn", and what happens next.
 * · A transfer — a card order too, which pays by transfer while no gateway is
 *   connected (slice B7) — gets "Chuyển khoản": the amount and the memo, each
 *   to copy; the account row that says it is being prepared, and the QR's
 *   place, empty until there is a real bank account; then "Giữ hàng", the
 *   12-hour hold counting down to its deadline.
 * · COD gets its one line — the shop calls before delivery — and no block of
 *   its own (the user's call).
 * · "Trạng thái", "Giao hàng", "Tóm tắt" as the order was priced, then
 *   "Tiếp tục mua" and "Xem đơn" — or "Tra cứu đơn" for an order that is not
 *   in the signed-in account.
 *
 * In the page's language since round v6 slice E2 ("Order placed"): the
 * recipient and the address keep their Vietnamese, marked `lang="vi"`.
 */
export function OrderConfirmedView({ order, addressLine, inAccount }: OrderConfirmedViewProps) {
  const catalog = useCatalog();
  const locale = useLocale();
  const t = picker(locale);
  const now = useNowMs();
  const amount = useRef<HTMLElement>(null);
  const memo = useRef<HTMLElement>(null);

  const transfer = confirmTransfer(order, locale);
  const steps = confirmSteps(order, locale);
  const lines = confirmLines(catalog, order, locale);
  const follow = followLink(order, inAccount, locale);
  const amountWord = t({ vi: "Số tiền", en: "Amount" });
  const memoWord = t({ vi: "Nội dung", en: "Reference" });
  const units = orderUnits(order);

  return (
    <div className="okp">
      <div className="ok-hero">
        <h1 className="ok-title disp">
          <FeedOkTitle text={t({ vi: "Đã đặt hàng", en: "Order placed" })} />
        </h1>
        <p className="ok-code">
          {t<React.ReactNode>({
            vi: (
              <>
                Mã đơn <b>{order.code}</b>
              </>
            ),
            en: (
              <>
                Order code <b>{order.code}</b>
              </>
            ),
          })}
        </p>
        <p className="ok-next">{confirmNext(order, locale)}</p>
      </div>

      <div className="ok-grid">
        <div className="ok-main">
          {transfer && (
            <>
              <section className="paycard" aria-labelledby="h-pay">
                <h2 className="sect-title" id="h-pay">
                  {t({ vi: "Chuyển khoản", en: "Bank transfer" })}
                </h2>
                <div className="copyrow">
                  <span className="copy-k">{amountWord}</span>
                  <b className="copy-v" ref={amount}>
                    {vnd(transfer.amountVnd, locale)}
                  </b>
                  <FeedCopy value={String(transfer.amountVnd)} what={amountWord} target={amount} />
                </div>
                <div className="copyrow">
                  <span className="copy-k">{memoWord}</span>
                  <b className="copy-v" ref={memo}>
                    {transfer.memo}
                  </b>
                  <FeedCopy value={transfer.memo} what={memoWord} target={memo} />
                </div>
                <div className="copyrow is-pending">
                  <span className="copy-k">{t({ vi: "Tài khoản", en: "Account" })}</span>
                  <span className="copy-v">
                    {t({
                      vi: "Số tài khoản và tên ngân hàng đang chuẩn bị",
                      en: "Account number and bank name coming soon",
                    })}
                  </span>
                </div>
                <div
                  className="qr-slot"
                  role="img"
                  aria-label={t({
                    vi: "Chỗ của mã QR nhận tiền, hiện khi có tài khoản ngân hàng thật",
                    en: "Space for the payment QR code, shown once there is a real bank account",
                  })}
                >
                  <b>{t({ vi: "Mã QR nhận tiền", en: "Payment QR code" })}</b>
                  <span>{t({ vi: "Hiện khi có tài khoản ngân hàng thật", en: "Shown once there is a real bank account" })}</span>
                </div>
              </section>
              <section className="hold" aria-labelledby="h-hold">
                <h2 className="sect-title" id="h-hold">
                  {t({ vi: "Giữ hàng", en: "Reserved" })}
                </h2>
                <p className="hold-cd">
                  <FeedClock until={transfer.dueAt} now={now} tag="span" />
                </p>
                <p className="hold-until">
                  {t<React.ReactNode>({
                    vi: (
                      <>
                        tới <b>{transfer.until}</b>
                      </>
                    ),
                    en: (
                      <>
                        until <b>{transfer.until}</b>
                      </>
                    ),
                  })}
                </p>
                <p className="hold-note">{transfer.note}</p>
              </section>
            </>
          )}

          <section className="track" aria-labelledby="h-track">
            <h2 className="sect-title" id="h-track">
              {t({ vi: "Trạng thái", en: "Status" })}
            </h2>
            <ol className="track-list">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className={s.state === "done" ? "is-done" : s.state === "now" ? "is-now" : undefined}
                  aria-current={s.state === "now" ? "step" : undefined}
                >
                  <span className="track-dot">{s.state === "done" && <FeedIcon name="check" />}</span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="okship" aria-labelledby="h-ship">
            <h2 className="sect-title" id="h-ship">
              {t({ vi: "Giao hàng", en: "Delivery" })}
            </h2>
            <dl className="facts">
              {confirmShipRows(order, addressLine, locale).map((r, i) => (
                <div key={i}>
                  <dt>{r.label}</dt>
                  <dd lang={r.lang}>{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="ok-side">
          <section className="co-sum oksum" aria-labelledby="h-sum">
            <div className="co-sec-head">
              <h2 className="sect-title" id="h-sum">
                {t({ vi: "Tóm tắt", en: "Summary" })}
              </h2>
              <span className="co-count">{t<React.ReactNode>({ vi: <>{units} món</>, en: plural(units, "item", "items") })}</span>
            </div>
            <ul className="co-items">
              {lines.map((l) => (
                <SummaryLine key={l.key} l={l} />
              ))}
            </ul>
            <dl className="facts co-lines">
              {confirmRows(order, locale).map((r, i) => (
                <div key={i}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
            <div className="csum-total">
              <span>{t({ vi: "Tổng", en: "Total" })}</span>
              <b>{vnd(orderTotalVnd(order), locale)}</b>
            </div>
          </section>
          <div className="ok-acts">
            <Link className="btn btn-blue" href="/">
              {t({ vi: "Tiếp tục mua", en: "Continue shopping" })}
            </Link>
            <Link className="btn btn-line" href={follow.href}>
              {follow.label}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One piece of the order: the packshot, the bare name, colour, size and count, what it was sold for. */
function SummaryLine({ l }: { l: ConfirmLine }) {
  const locale = useLocale();
  const p = l.product;
  return (
    <li className="co-item">
      <span className={cx("co-thumb", p && isFixed(p) && "flat")}>
        {p && <Image src={pictureOf(p, l.color, "pack").src} width={48} height={60} alt="" />}
      </span>
      <span className="co-item-main">
        <span className="co-item-name disp" lang={l.nameLang}>
          {l.name}
        </span>
        <span className="co-item-meta">
          {l.colorLabel} · Size {l.size}
          {l.qty > 1 && ` · ×${l.qty}`}
        </span>
      </span>
      <span className="co-item-price">{vnd(l.totalVnd, locale)}</span>
    </li>
  );
}

/**
 * `/order-confirmed` with no order number: nothing to confirm. Every receipt
 * has its own address (`/order-confirmed/<code>`, where checkout lands), so
 * this one is reached by an old link; it offers the lookup, which finds any
 * order by its code and phone number.
 */
export function OrderConfirmedEmpty() {
  const t = picker(useLocale());
  return (
    <div className="okp">
      <div className="empty-state">
        <span className="empty-ic">
          <FeedIcon name="receipt" />
        </span>
        <h1 className="empty-title">{t({ vi: "Chưa có đơn nào vừa đặt", en: "No order placed just now" })}</h1>
        <Link className="btn btn-blue" href="/track">
          {t({ vi: "Tra cứu đơn", en: "Track an order" })}
        </Link>
      </div>
    </div>
  );
}
