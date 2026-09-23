"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Countdown } from "@/components/shop/Countdown";
import { CopyButton } from "@/components/shop/CopyButton";
import { InvoiceSheet } from "@/components/shop/InvoiceSheet";
import { cancelOrderAction } from "@/lib/actions/orders";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { invoiceOf } from "@/lib/invoice";
import { totalRowLabel, type TrackedOrder } from "@/lib/lookup";
import { countWord, vnd } from "@/lib/money";
import { STATE_LABEL, PAYMENT_LABEL } from "@/lib/order-labels";
import { canCancel } from "@/lib/order-rows";
import { formatPhone } from "@/lib/phone";
import { photoUrl } from "@/lib/photos";
import { deliveryShortLabel } from "@/lib/shipping";
import { CancelOrderSheet } from "./CancelOrderSheet";
import { demoNowMs } from "@/lib/clock";

interface OrderDetailScreenProps {
  order: TrackedOrder;
  /** The transfer deadline, when one is still owed. */
  dueAt?: string;
  /** What the money does on an order that was called off. */
  refund?: string | null;
  /** The sentence to show once "Huỷ đơn" has been answered, either way. */
  onDone: (message: string) => void;
}

/**
 * One order, opened UNDER the list it was opened from.
 *
 * Not a page of its own: the shopper came from a list of four rows and the
 * next thing they do is usually look at another one, so the list stays on
 * screen and the row they opened is marked. "Đóng chi tiết" goes back to
 * `/account/orders`, which is the same list without this section.
 *
 * CANCELLING IS A WRITE TO THE SHOP'S DATABASE since slice B2
 * (`cancelOrderAction` → `cancel_order()`): the order is marked "khách huỷ",
 * its pieces go back on the shelf in the same transaction, and the list, the
 * rail and the product page all read the result. The database decides
 * whether this account may cancel this order; the button only decides
 * whether to be drawn.
 *
 * It is offered only where nobody has been paid — a transfer inside its
 * hold, or a COD/card order the shop has not handled. Past that the screen
 * says who to ask instead of drawing a button that would lie.
 */
export function OrderDetailScreen({ order, dueAt, refund, onDone }: OrderDetailScreenProps) {
  const [sheet, setSheet] = useState(false);
  const [cancelling, startCancel] = useTransition();
  const amountRef = useRef<HTMLElement>(null);
  const refRef = useRef<HTMLElement>(null);
  const trackingRef = useRef<HTMLElement>(null);

  const label = STATE_LABEL[order.state];
  const overdue = dueAt !== undefined && demoNowMs() >= Date.parse(dueAt);
  const waiting = order.state === "AWAITING_TRANSFER" && dueAt !== undefined && !overdue;

  /**
   * The action answers with a value either way; on success it also refreshes
   * every account screen in the same response (`revalidatePath`), so the
   * order below already reads "Đã huỷ" when the sheet closes.
   */
  function cancel() {
    if (cancelling) return;
    startCancel(async () => {
      const result = await cancelOrderAction(order.code);
      startCancel(() => {
        setSheet(false);
        onDone(
          result.ok
            ? `Đã huỷ ${order.code} · ${countWord(order.units)} chiếc về kệ`
            : result.message,
        );
      });
    });
  }

  return (
    <section className="sec anchor" id={order.code} aria-labelledby={`h-${order.code}`}>
      <div className="hd">
        <h2 id={`h-${order.code}`}>{order.code}</h2>
        <span className="meta">
          {clockLabel(order.placedAt)} · {dayMonth(order.placedAt)} ·{" "}
          {label.text.toLowerCase()}
        </span>
        <Link className="more" href="/account/orders">
          Đóng chi tiết
        </Link>
      </div>

      {order.state === "AWAITING_TRANSFER" && dueAt !== undefined && (
        <div className="deadline" style={{ marginTop: 0 }}>
          <div className="lh">
            Giữ hàng tới {clockLabel(dueAt)} · {dayMonth(dueAt)}
          </div>
          {waiting ? (
            <Countdown until={dueAt} to="hạn chuyển khoản" over="Đã quá giờ giữ hàng" />
          ) : (
            <p className="late">Đã quá giờ giữ hàng · đơn huỷ</p>
          )}
          {/* The two runs of text the copy buttons below point at. When the
              clipboard refuses, `CopyButton` selects the real thing on
              screen rather than claiming a copy that did not happen. */}
          <p>
            Chuyển khoản <b ref={amountRef}>{vnd(order.totalVnd)}</b> với nội dung{" "}
            <b ref={refRef}>{order.code}</b>. Quá giờ, đơn tự huỷ và{" "}
            {countWord(order.units)} chiếc này về kệ.
          </p>
          <p className="copies">
            <CopyButton
              value={String(order.totalVnd)}
              selectRef={amountRef}
              label="Chép số tiền"
            />
            <CopyButton value={order.code} selectRef={refRef} label="Chép nội dung" />
          </p>
        </div>
      )}

      <div className="two3" style={{ marginTop: 16 }}>
        <div>
          <div className="panel3">
            <h3>Hành trình</h3>
            <div className="tl3">
              {order.steps.map((s) => (
                <div className={`m ${s.state}`} key={s.title}>
                  <b>{s.title}</b>
                  {(s.detail || s.state === "todo") && (
                    <span>{s.detail ?? "Chưa tới"}</span>
                  )}
                </div>
              ))}
            </div>
            {refund && <p className="fine3">{refund}</p>}
          </div>
        </div>

        <aside>
          <div className="panel3">
            <h3>{order.units} món</h3>
            {order.lines.map((l, i) => (
              <div className={i === 0 ? "ol first" : "ol"} key={`${l.name}-${l.size}-${i}`}>
                <span className="thumb">
                  <Image src={photoUrl(l.photoKey, 120, 60)} alt="" width={120} height={150} />
                </span>
                <span className="g">
                  <b>{l.name}</b>
                  <span>
                    {l.colorLabel} · {l.size} · ×{l.qty}
                  </span>
                </span>
                <span className="p">{vnd(l.unitPriceVnd * l.qty)}</span>
              </div>
            ))}
            <div className="sum3">
              {order.discountVnd > 0 && (
                <div className="r">
                  <span>Giảm giá{order.promo ? ` · ${order.promo}` : ""}</span>
                  <span>−{vnd(order.discountVnd)}</span>
                </div>
              )}
              <div className="r">
                <span>Phí giao</span>
                <span>
                  {order.shippingFeeVnd === 0 ? "Miễn phí" : vnd(order.shippingFeeVnd)}
                </span>
              </div>
              {order.codFeeVnd > 0 && (
                <div className="r">
                  <span>Phí thu hộ</span>
                  <span>{vnd(order.codFeeVnd)}</span>
                </div>
              )}
              <div className="r total">
                <span>{totalRowLabel(order.state)}</span>
                <b>{vnd(order.totalVnd)}</b>
              </div>
            </div>
          </div>

          <div className="panel3" style={{ marginTop: 16 }}>
            <h3>Giao tới</h3>
            <dl className="kvs">
              <dt>Người nhận</dt>
              <dd>
                {order.recipient} · <span className="nw">{formatPhone(order.phone)}</span>
              </dd>
              <dt>Địa chỉ</dt>
              <dd>{order.addressLine}</dd>
              <dt>Cách giao</dt>
              <dd>
                {deliveryShortLabel(order.delivery)}
                {order.shippingFeeVnd === 0 ? " · miễn phí" : ""}
              </dd>
              <dt>Thanh toán</dt>
              <dd>{PAYMENT_LABEL[order.payment]}</dd>
              {order.trackingCode && (
                <>
                  <dt>Mã vận đơn</dt>
                  <dd>
                    {/* The service the shop handed it to, when the handover
                        recorded one (slice B3a). */}
                    {order.carrier && <span className="muted">{order.carrier} · </span>}
                    <b ref={trackingRef}>{order.trackingCode}</b>
                    <CopyButton value={order.trackingCode} selectRef={trackingRef} />
                  </dd>
                </>
              )}
              {order.note && (
                <>
                  <dt>Ghi chú</dt>
                  <dd className="muted">{order.note}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="acts3">
            {/* A real action: the browser's own print dialog, where "Save as
                PDF" lives. `@media print` leaves only `.invoice` on the page. */}
            <Button tone="ink wide" icon="printer" onClick={() => window.print()}>
              Tải hoá đơn
            </Button>

            {canCancel(order.state) ? (
              <Button tone="quiet" icon="trash" onClick={() => setSheet(true)}>
                Huỷ đơn này
              </Button>
            ) : (
              order.state !== "CANCELLED" && (
                <p className="fine3" style={{ marginTop: 0 }}>
                  {order.paid ? "Đơn đã thanh toán" : "Đơn đang trên đường"}: liên hệ cửa
                  hàng để huỷ.{" "}
                  <Link className="lnk" href="/contact">
                    Liên hệ
                  </Link>
                </p>
              )
            )}
          </div>

          <p className="fine3">
            {/* The hold is the shop's own promise, said once more where the
                cancel button is, so nobody has to scroll back up for it. */}
            {canCancel(order.state)
              ? "Huỷ được vì đơn chưa thanh toán. Hàng về kệ ngay, không hoàn tác."
              : order.state === "CANCELLED"
                ? "Đơn đã huỷ. Hàng đã về kệ."
                : null}
          </p>
        </aside>
      </div>

      <CancelOrderSheet
        code={order.code}
        units={order.units}
        open={sheet}
        pending={cancelling}
        onClose={() => setSheet(false)}
        onConfirm={cancel}
      />

      {/* The sheet that goes to paper, and nothing else on it. */}
      <InvoiceSheet invoice={invoiceOf(order)} />
    </section>
  );
}
