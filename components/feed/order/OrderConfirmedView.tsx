"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
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
 */
export function OrderConfirmedView({ order, addressLine, inAccount }: OrderConfirmedViewProps) {
  const catalog = useCatalog();
  const now = useNowMs();
  const amount = useRef<HTMLElement>(null);
  const memo = useRef<HTMLElement>(null);

  const transfer = confirmTransfer(order);
  const steps = confirmSteps(order);
  const lines = confirmLines(catalog, order);
  const follow = followLink(order, inAccount);

  return (
    <div className="okp">
      <div className="ok-hero">
        <h1 className="ok-title disp">
          <FeedOkTitle text="Đã đặt hàng" />
        </h1>
        <p className="ok-code">
          Mã đơn <b>{order.code}</b>
        </p>
        <p className="ok-next">{confirmNext(order)}</p>
      </div>

      <div className="ok-grid">
        <div className="ok-main">
          {transfer && (
            <>
              <section className="paycard" aria-labelledby="h-pay">
                <h2 className="sect-title" id="h-pay">
                  Chuyển khoản
                </h2>
                <div className="copyrow">
                  <span className="copy-k">Số tiền</span>
                  <b className="copy-v" ref={amount}>
                    {vnd(transfer.amountVnd)}
                  </b>
                  <FeedCopy value={String(transfer.amountVnd)} what="Số tiền" target={amount} />
                </div>
                <div className="copyrow">
                  <span className="copy-k">Nội dung</span>
                  <b className="copy-v" ref={memo}>
                    {transfer.memo}
                  </b>
                  <FeedCopy value={transfer.memo} what="Nội dung" target={memo} />
                </div>
                <div className="copyrow is-pending">
                  <span className="copy-k">Tài khoản</span>
                  <span className="copy-v">Số tài khoản và tên ngân hàng đang chuẩn bị</span>
                </div>
                <div className="qr-slot" role="img" aria-label="Chỗ của mã QR nhận tiền, hiện khi có tài khoản ngân hàng thật">
                  <b>Mã QR nhận tiền</b>
                  <span>Hiện khi có tài khoản ngân hàng thật</span>
                </div>
              </section>
              <section className="hold" aria-labelledby="h-hold">
                <h2 className="sect-title" id="h-hold">
                  Giữ hàng
                </h2>
                <p className="hold-cd">
                  <FeedClock until={transfer.dueAt} now={now} tag="span" />
                </p>
                <p className="hold-until">
                  tới <b>{transfer.until}</b>
                </p>
                <p className="hold-note">{transfer.note}</p>
              </section>
            </>
          )}

          <section className="track" aria-labelledby="h-track">
            <h2 className="sect-title" id="h-track">
              Trạng thái
            </h2>
            <ol className="track-list">
              {steps.map((s) => (
                <li
                  key={s.label}
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
              Giao hàng
            </h2>
            <dl className="facts">
              {confirmShipRows(order, addressLine).map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="ok-side">
          <section className="co-sum oksum" aria-labelledby="h-sum">
            <div className="co-sec-head">
              <h2 className="sect-title" id="h-sum">
                Tóm tắt
              </h2>
              <span className="co-count">{orderUnits(order)} món</span>
            </div>
            <ul className="co-items">
              {lines.map((l) => (
                <SummaryLine key={l.key} l={l} />
              ))}
            </ul>
            <dl className="facts co-lines">
              {confirmRows(order).map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
            <div className="csum-total">
              <span>Tổng</span>
              <b>{vnd(orderTotalVnd(order))}</b>
            </div>
          </section>
          <div className="ok-acts">
            <Link className="btn btn-blue" href="/">
              Tiếp tục mua
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
  const p = l.product;
  return (
    <li className="co-item">
      <span className={cx("co-thumb", p && isFixed(p) && "flat")}>
        {p && <Image src={pictureOf(p, l.color, "pack").src} width={48} height={60} alt="" />}
      </span>
      <span className="co-item-main">
        <span className="co-item-name disp">{l.name}</span>
        <span className="co-item-meta">
          {l.colorLabel} · Size {l.size}
          {l.qty > 1 && ` · ×${l.qty}`}
        </span>
      </span>
      <span className="co-item-price">{vnd(l.totalVnd)}</span>
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
  return (
    <div className="okp">
      <div className="empty-state">
        <span className="empty-ic">
          <FeedIcon name="receipt" />
        </span>
        <h1 className="empty-title">Chưa có đơn nào vừa đặt</h1>
        <Link className="btn btn-blue" href="/track">
          Tra cứu đơn
        </Link>
      </div>
    </div>
  );
}
