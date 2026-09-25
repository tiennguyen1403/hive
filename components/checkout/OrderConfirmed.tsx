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
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Order, OrderState } from "@/data/types";
import { clockLabel, dayMonth } from "@/lib/datetime";
import type { wayToShop } from "@/lib/drop";
import { LEX, issueNo } from "@/lib/lexicon";
import { trackHref, trackedOfOrder } from "@/lib/lookup";
import { countWord, vnd } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/order-labels";
import { TRANSFER_HOLD_HOURS } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { photoUrl } from "@/lib/photos";
import { deliveryShortLabel, deliveryWindowLabel } from "@/lib/shipping";

interface OrderConfirmedProps {
  /**
   * The order, read on the SERVER — through the session for an account's own
   * order, through the httpOnly receipt cookie for a guest's
   * (`lib/db/orders.ts#loadReceipt`). With the status the clock says it is in.
   */
  order: Order;
  /** Built on the server: the commune list it needs never reaches the browser. */
  addressLine: string;
  /**
   * Where the way back into the shop goes (`wayToShop`, read on the server):
   * the issue selling now — "Về số 05", its own page — or, when none is,
   * every style on sale (v3 slice 11).
   */
  way: ShopWay;
  /**
   * The order belongs to the signed-in account, so "Đơn hàng" lists it. False
   * for a guest, and for an order this browser placed signed out and is now
   * reopening signed in — the account's list would not have it.
   */
  inAccount: boolean;
}

/**
 * The receipt.
 *
 * Since slice B2 the order is a row in Postgres: the number was issued by the
 * database, the pieces are already off the shelf, and the money on this page
 * is the money the database priced. Names and photos come from the catalogue;
 * the price of each line is the one recorded at the time, never today's.
 *
 * What the page says next depends on how the order is being paid for, and on
 * where it has got to since — a receipt can be reopened days later — and
 * every branch says something TRUE:
 *
 * · a transfer still being waited on gets the hold as a countdown on the
 *   issue's own black cloth, the amount and the reference to copy, and an
 *   empty account row — there is no bank account for this shop yet, so the
 *   row says that rather than showing a made-up number;
 * · cash on delivery gets the sentence about the call before the courier
 *   comes, and no bank block at all;
 * · a card gets the plain admission that no gateway is connected, because
 *   the alternative is a screen implying money changed hands;
 * · an order that has moved on — paid, on its way, cancelled — says so, and
 *   asks for no transfer.
 *
 * Neither QR slot draws a code. One cannot exist until there is an account;
 * the other needs an encoder this build does not carry. The lookup slot
 * prints the real link and a way to copy it, so the frame is a working thing
 * rather than a promise.
 */
export function OrderConfirmed({ order, addressLine, way, inAccount }: OrderConfirmedProps) {
  const catalog = useCatalog();
  const codeRef = useRef<HTMLElement>(null);
  const amountRef = useRef<HTMLElement>(null);
  const refRef = useRef<HTMLElement>(null);
  const linkRef = useRef<HTMLElement>(null);

  const shown = trackedOfOrder(catalog, order, addressLine);
  const transfer = shown.state === "AWAITING_TRANSFER" && order.status.state === "AWAITING_TRANSFER";
  const deadline = order.status.state === "AWAITING_TRANSFER" ? order.status.dueAt : "";
  const lookup = trackHref(order.code, order.shipTo.phone);

  return (
    <ShopFrame>
      <div className="wrap3">
        <Steps at={3} />

        <div className="two3">
          <div>
            <div className="done3">
              <h1 className="big">{headline(shown.state, order)}</h1>
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
                    Quá giờ, đơn tự huỷ và {countWord(shown.units)} chiếc này về kệ cho người
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
                      <b ref={amountRef}>{vnd(shown.totalVnd)}</b>
                    </dd>
                    <dd>
                      <CopyButton value={String(shown.totalVnd)} selectRef={amountRef} />
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
                  Đang chuẩn bị. Liên kết:
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
                Đơn gồm {shown.units} món
                <span className="meta">
                  đặt {clockLabel(order.placedAt)} · {dayMonth(order.placedAt)}
                </span>
              </h3>
              {shown.lines.map((l, i) => (
                <div className={i === 0 ? "ol first" : "ol"} key={`${l.name}-${l.colorLabel}-${l.size}-${i}`}>
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
                {shown.discountVnd > 0 && (
                  <div className="r">
                    <span>Giảm giá{shown.promo ? ` · ${shown.promo}` : ""}</span>
                    <span>−{vnd(shown.discountVnd)}</span>
                  </div>
                )}
                <div className="r">
                  <span>Phí giao</span>
                  <span>
                    {shown.shippingFeeVnd === 0 ? "Miễn phí" : vnd(shown.shippingFeeVnd)}
                  </span>
                </div>
                {shown.codFeeVnd > 0 && (
                  <div className="r">
                    <span>Phí thu hộ</span>
                    <span>{vnd(shown.codFeeVnd)}</span>
                  </div>
                )}
                <div className="r total">
                  <span>Tổng</span>
                  <b>{vnd(shown.totalVnd)}</b>
                </div>
              </div>
            </div>

            <div className="panel3" style={{ marginTop: 16 }}>
              <h3>Giao tới</h3>
              <dl className="kvs">
                <dt>Người nhận</dt>
                <dd>
                  {shown.recipient} · <span className="nw">{formatPhone(shown.phone)}</span>
                </dd>
                <dt>Địa chỉ</dt>
                <dd>{addressLine}</dd>
                <dt>Cách giao</dt>
                {/* "nhận 20/09 – 22/09" is one block (a no-break space after
                    "nhận"; the range holds itself, lib/datetime.ts): the line
                    breaks at the " · " before it (v3 slice 13). */}
                <dd>
                  {deliveryShortLabel(order.delivery)} · nhận{"\u00a0"}
                  {deliveryWindowLabel(order.delivery, order.placedAt)}
                </dd>
                <dt>Ghi chú</dt>
                <dd className="muted">{order.note || "không có"}</dd>
                <dt>Thanh toán</dt>
                <dd>{PAYMENT_LABEL[order.payment]}</dd>
              </dl>
            </div>

            <div className="acts3">
              {inAccount ? (
                <ButtonLink tone="wide" icon="box" href={`/account/orders/${order.code}`}>
                  Xem đơn trong tài khoản
                </ButtonLink>
              ) : (
                <ButtonLink tone="wide" icon="truck" href={lookup}>
                  Xem hành trình đơn
                </ButtonLink>
              )}
              <ButtonLink tone="ink wide" icon="search" href={trackHref(order.code)}>
                Tra cứu đơn không cần đăng nhập
              </ButtonLink>
              <ButtonLink tone="quiet" icon="grid" href={way.href}>
                {wayBack(way)}
              </ButtonLink>
            </div>

            {/* Where the order can be found again, and the mail that is not
                sent yet — both in the words that are true. "Đã gửi" would be
                the one sentence on this screen nobody could check. */}
            <p className="note3" style={{ marginTop: 14 }}>
              <Icon name="info" className="ic sm" />
              <span>
                {inAccount
                  ? "Đơn nằm trong “Đơn hàng” của tài khoản. "
                  : "Tra cứu lại bằng mã đơn và số điện thoại đã đặt. "}
                Email xác nhận đang chuẩn bị.
              </span>
            </p>
          </aside>
        </div>
      </div>
    </ShopFrame>
  );
}

/**
 * `/order-confirmed` with no number: there is no receipt to show.
 *
 * The page used to open "the newest order on this device"; orders are not
 * kept on the device any more, so the page says where an order can be found
 * instead — the account's list, or the lookup by code and phone number.
 */
export function OrderConfirmedEmpty({ way }: { way: ShopWay }) {
  return (
    <ShopFrame>
      <div className="wrap3">
        <Steps at={3} />
        <Empty
          icon="doc"
          title="Chưa có đơn nào vừa đặt"
          text="Mở lại trong Đơn hàng của tài khoản, hoặc tra cứu bằng mã đơn và số điện thoại."
          action={
            <ButtonLink icon="grid" href={way.href}>
              {wayBack(way)}
            </ButtonLink>
          }
        />
      </div>
    </ShopFrame>
  );
}

/**
 * The first line of the page, and the only thing on it that is not a figure.
 *
 * Each says what has to happen next rather than congratulating anybody: the
 * order is taken, and what it is waiting for differs by method. Reopened
 * later, the line follows the order rather than repeating a request that no
 * longer applies.
 */
function headline(state: OrderState, order: Order): string {
  switch (state) {
    case "AWAITING_TRANSFER":
      return `Đã nhận đơn. Chuyển khoản trong ${TRANSFER_HOLD_HOURS} giờ để giữ hàng.`;
    case "RECEIVED":
      return order.payment === "CARD"
        ? "Đã nhận đơn. Chưa thu tiền cho tới khi có cổng thẻ."
        : "Đã nhận đơn. Cửa hàng gọi xác nhận trước khi giao.";
    case "PAID":
      return "Đã nhận đơn. Đã thanh toán.";
    case "SHIPPING":
      return "Đơn đang giao.";
    case "DELIVERED":
      return "Đơn đã giao.";
    case "CANCELLED":
      return order.status.state === "CANCELLED"
        ? `Đơn đã huỷ — ${order.status.reason}.`
        : "Đơn đã huỷ.";
  }
}

/** Where the page's way back into the shop goes (v3 slice 11). */
type ShopWay = ReturnType<typeof wayToShop>;

/** "Về số 05" while an issue sells; "Xem tất cả mẫu" when none does. */
function wayBack(way: ShopWay): string {
  return way.issueNo !== null ? `Về ${LEX.tl} ${issueNo(way.issueNo)}` : "Xem tất cả mẫu";
}
