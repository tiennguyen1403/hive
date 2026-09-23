"use client";

import Image from "next/image";
import { useRef } from "react";
import { Icon } from "@/components/icon/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { Countdown } from "@/components/shop/Countdown";
import { CopyButton } from "@/components/shop/CopyButton";
import { Empty } from "@/components/shop/Empty";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { Steps } from "@/components/shop/Steps";
import { useSession } from "@/components/account/SessionContext";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { LEX, issueNo } from "@/lib/lexicon";
import { trackHref } from "@/lib/lookup";
import { countWord, vnd } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/order-labels";
import { formatPhone } from "@/lib/phone";
import { photoUrl } from "@/lib/photos";
import { usePlacedOrders } from "@/components/shop/placed-order";
import {
  TRANSFER_HOLD_HOURS,
  transferDeadlineIso,
  type PlacedOrder,
} from "@/lib/placed-order";
import { deliveryShortLabel, deliveryWindowLabel } from "@/lib/shipping";

interface OrderConfirmedProps {
  /** Which issue the "Về số NN" link goes back to. */
  dropNo: number;
}

/**
 * The receipt.
 *
 * The order is the newest one on this DEVICE, where checkout put it. It is a
 * frozen copy, so nothing here is looked up in the catalog again: a receipt
 * that changes when the shop's prices do is not a receipt.
 *
 * What the page says next depends on how it is being paid for, and every
 * branch says something TRUE:
 *
 * · a transfer gets the hold on the goods as a countdown on the issue's own
 *   black cloth, the amount and the reference to copy, and an empty account
 *   row — there is no bank account for this shop yet, so the row says that
 *   rather than showing a made-up number;
 * · cash on delivery gets the sentence about the call before the courier
 *   comes, and no bank block at all;
 * · a card gets the plain admission that no gateway is connected, because
 *   the alternative is a screen implying money changed hands.
 *
 * Neither QR slot draws a code. One cannot exist until there is an account;
 * the other needs an encoder this build does not carry. The lookup slot
 * prints the real link and a way to copy it, so the frame is a working thing
 * rather than a promise.
 */
export function OrderConfirmed({ dropNo }: OrderConfirmedProps) {
  const { orders, ready } = usePlacedOrders();
  const order = orders[0] ?? null;
  const { me } = useSession();
  const codeRef = useRef<HTMLElement>(null);
  const amountRef = useRef<HTMLElement>(null);
  const refRef = useRef<HTMLElement>(null);
  const linkRef = useRef<HTMLElement>(null);

  if (!ready) {
    return (
      <ShopFrame>
        <div className="wrap3">
          <div className="pghead">
            <h1>Đã nhận đơn</h1>
            <span className="meta">đang mở đơn…</span>
          </div>
        </div>
      </ShopFrame>
    );
  }

  if (!order) {
    return (
      <ShopFrame>
        <div className="wrap3">
          <Steps at={3} />
          <Empty
            icon="doc"
            title="Chưa có đơn nào vừa đặt"
            text="Trang này hiện đơn vừa đặt trên thiết bị này. Mở trên thiết bị khác, hoặc sau khi xoá dữ liệu trình duyệt, thì không còn."
            action={
              <ButtonLink icon="grid" href="/products">
                Về {LEX.tl} {issueNo(dropNo)}
              </ButtonLink>
            }
          />
        </div>
      </ShopFrame>
    );
  }

  const transfer = order.payment === "BANK_TRANSFER";
  const units = order.lines.reduce((n, l) => n + l.qty, 0);
  const deadline = transferDeadlineIso(order.placedAt);
  const lookup = trackHref(order.code, order.phone);

  return (
    <ShopFrame>
      <div className="wrap3">
        <Steps at={3} />

        <div className="two3">
          <div>
            <div className="done3">
              <h1 className="big">{headline(order.payment)}</h1>
              <p className="code">
                Mã đơn <b ref={codeRef}>{order.code}</b>
                <CopyButton value={order.code} selectRef={codeRef} />
              </p>

              {transfer && (
                <div className="deadline">
                  <div className="lh">
                    Giữ hàng tới {clockLabel(deadline)} · {dayMonth(deadline)}
                  </div>
                  <Countdown
                    mode="hms"
                    until={deadline}
                    to="hạn chuyển khoản"
                    over="Đã quá giờ giữ hàng"
                  />
                  <p>
                    Quá giờ, đơn tự huỷ và {countWord(units)} chiếc này về kệ cho người
                    sau. Đã chuyển thì đơn đổi sang “đã thanh toán” khi cửa hàng nhận
                    được tiền.
                  </p>
                </div>
              )}
            </div>

            {transfer && (
              <>
                <dl className="bank" aria-label="Nội dung chuyển khoản">
                  <div className="r">
                    <dt>Số tiền</dt>
                    <dd>
                      <b ref={amountRef}>{vnd(order.totalVnd)}</b>
                    </dd>
                    <dd>
                      <CopyButton value={String(order.totalVnd)} selectRef={amountRef} />
                    </dd>
                  </div>
                  <div className="r">
                    <dt>Nội dung</dt>
                    <dd>
                      <b ref={refRef}>{order.code}</b>{" "}
                      <span className="muted">· ghi đúng mã để tự khớp</span>
                    </dd>
                    <dd>
                      <CopyButton value={order.code} selectRef={refRef} />
                    </dd>
                  </div>
                  <div className="r">
                    <dt>Tài khoản</dt>
                    <dd>
                      <span className="muted">
                        Số tài khoản và tên ngân hàng đang chuẩn bị
                      </span>
                    </dd>
                    <dd />
                  </div>
                </dl>
                <p className="fine3">
                  Không chép tự động được thì chọn đoạn trên rồi chép tay.
                </p>
              </>
            )}

            <div className="qrrow">
              {transfer && (
                <div className="qrph">
                  <div className="cells" aria-hidden="true" />
                  <div>
                    <b>Mã QR nhận tiền</b>
                    Hiện khi có tài khoản ngân hàng thật. Quét là điền sẵn số tiền và
                    nội dung.
                  </div>
                </div>
              )}
              <div className="qrph">
                <div className="cells" aria-hidden="true" />
                <div>
                  <b>Mã QR tra cứu đơn</b>
                  Sinh từ liên kết tra cứu — đang chuẩn bị. Liên kết:
                  <span className="link" ref={linkRef}>
                    {lookup}
                  </span>
                  <CopyButton value={lookup} selectRef={linkRef} label="Chép liên kết" />
                </div>
              </div>
            </div>
          </div>

          <aside className="aside3">
            <div className="panel3">
              <h3>
                Đơn gồm {units} món
                <span className="meta">
                  đặt {clockLabel(order.placedAt)} · {dayMonth(order.placedAt)}
                </span>
              </h3>
              {order.lines.map((l, i) => (
                <div
                  className={i === 0 ? "ol first" : "ol"}
                  key={`${l.slug}-${l.colorLabel}-${l.size}`}
                >
                  <span className="thumb">
                    <Image
                      src={photoUrl(l.photoKey, 120, 60)}
                      alt=""
                      width={120}
                      height={150}
                    />
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
                  <span>Tổng</span>
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
                  {deliveryShortLabel(order.delivery)} · nhận{" "}
                  {deliveryWindowLabel(order.delivery, order.placedAt)}
                </dd>
                <dt>Ghi chú</dt>
                <dd className="muted">{order.note || "không có"}</dd>
                <dt>Thanh toán</dt>
                <dd>{PAYMENT_LABEL[order.payment]}</dd>
              </dl>
            </div>

            <div className="acts3">
              {me ? (
                <ButtonLink tone="wide" icon="box" href={`/account/orders/${order.code}`}>
                  Xem đơn trong tài khoản
                </ButtonLink>
              ) : (
                <ButtonLink tone="wide" icon="truck" href={lookup}>
                  Xem hành trình đơn
                </ButtonLink>
              )}
              <ButtonLink
                tone="ink wide"
                icon="search"
                href={trackHref(order.code)}
              >
                Tra cứu đơn không cần đăng nhập
              </ButtonLink>
              <ButtonLink tone="quiet" icon="grid" href="/products">
                Về {LEX.tl} {issueNo(dropNo)}
              </ButtonLink>
            </div>

            {/* No server takes an order and no server sends mail. Both are
                said here, in the words that are true — "đã gửi" would be the
                one sentence on this screen nobody could check. */}
            <p className="note3" style={{ marginTop: 14 }}>
              <Icon name="info" className="ic sm" />
              <span>
                {me
                  ? `Đơn lưu trên thiết bị này và hiện trong “Đơn hàng” của tài khoản. `
                  : `Đơn lưu trên thiết bị này. Tra cứu lại bằng mã đơn và số điện thoại đã đặt. `}
                Xác nhận qua email tới {order.email}: đang chuẩn bị, chưa có máy chủ gửi
                thư.
              </span>
            </p>
          </aside>
        </div>
      </div>
    </ShopFrame>
  );
}

/**
 * The first line of the page, and the only thing on it that is not a figure.
 *
 * Each says what has to happen next rather than congratulating anybody: the
 * order is taken, and what it is waiting for differs by method.
 */
function headline(payment: PlacedOrder["payment"]): string {
  if (payment === "COD") return "Đã nhận đơn. Cửa hàng gọi xác nhận trước khi giao.";
  if (payment === "CARD") return "Đã nhận đơn. Chưa thu tiền cho tới khi có cổng thẻ.";
  return `Đã nhận đơn. Chuyển khoản trong ${TRANSFER_HOLD_HOURS} giờ để giữ hàng.`;
}
