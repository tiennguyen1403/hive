"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { startWait } from "@/components/shop/WaitVeil";
import { COLORS } from "@/data/colors";
import type { Order } from "@/data/types";
import { cancelOrderAction } from "@/lib/actions/orders";
import { dayMonth } from "@/lib/datetime";
import {
  buyAgainLines,
  canReturn,
  cancelReasonText,
  deliveryTitle,
  groupLabel,
  linePicture,
  orderGroups,
  paymentTitle,
  returnUntil,
} from "@/lib/feed-account";
import { feedSentence } from "@/lib/feed-checkout";
import { confirmRows, confirmTransfer } from "@/lib/feed-order";
import { vnd } from "@/lib/money";
import { orderTotalVnd, orderUnits } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import type { CancelOrderResult } from "@/lib/order-payload";
import { styleHref } from "../FeedCards";
import { FeedClock } from "../FeedClock";
import { FeedCopy } from "../FeedCopy";
import { FeedSheet } from "../FeedSheet";
import { useFeedToast } from "../FeedToast";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow, useNowMs } from "../now";
import { OrderSteps, Tile } from "./OrderBits";

interface OrderViewProps {
  /** One of the account's orders, with the status the clock says it is in (read on the server). */
  order: Order;
  /** "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh": built on the server, where the communes are. */
  addressLine: string;
}

/**
 * One order (round v4 slice 3a): the approved mock's `order.html` and
 * `order.js`. The code large with the lines it was bought from; the journey
 * as Feed's story bars; under it what the shopper can do now, and only that:
 *
 * · a transfer awaited (a card order's too): the hold ticking, the amount and
 *   the memo to copy, the account being prepared, the QR's place, "Huỷ đơn";
 * · COD before the call: the number the shop will call, "Huỷ đơn";
 * · on its way: the tracking code to copy;
 * · delivered: "Đổi trả tới dd/mm" while the window is open — to the returns
 *   page until the request flow exists (QĐ-34) — and "Mua lại";
 * · cancelled: why, the pieces back on the shelf, and "Mua lại";
 * · paid and waiting to ship: nothing.
 *
 * Then the pieces, the totals as paid, and where it goes; two columns from
 * 900px. "Huỷ đơn" asks in a sheet, calls `cancelOrderAction` — the page
 * re-reads the order in the same response — and says it is done with a
 * toast, the focus back on the code. "Mua lại" puts what is still sold back
 * in the basket, in the colour, size and number bought (the basket clamps to
 * what is left), and opens it.
 */
export function OrderView({ order, addressLine }: OrderViewProps) {
  const catalog = useCatalog();
  const now = useNow();
  const nowMs = useNowMs();
  const toast = useFeedToast();
  const router = useRouter();
  const { add } = useCart();
  const [sheet, setSheet] = useState(false);
  const [cancelling, startCancel] = useTransition();
  const opener = useRef<HTMLButtonElement | null>(null);
  const code = useRef<HTMLHeadingElement>(null);
  const answer = useRef<CancelOrderResult | null>(null);

  const s = order.status;
  const units = orderUnits(order);
  const again = buyAgainLines(catalog, order, now);
  const transfer = confirmTransfer(order);

  function openCancel(e: React.MouseEvent<HTMLButtonElement>) {
    opener.current = e.currentTarget;
    setSheet(true);
  }

  function confirmCancel() {
    if (cancelling) return;
    startCancel(async () => {
      const result = await cancelOrderAction(order.code);
      startCancel(() => {
        answer.current = result;
        setSheet(false);
      });
    });
  }

  // Once the sheet has closed: the answer, and on success the focus on the code at the top (`order.js`).
  function afterSheet() {
    const result = answer.current;
    answer.current = null;
    if (!result) return;
    if (!result.ok) {
      toast(feedSentence(result.message));
      return;
    }
    toast(`Đã huỷ ${order.code}`);
    window.scrollTo(0, 0);
    code.current?.focus({ preventScroll: true });
  }

  function buyAgain() {
    for (const l of again) add({ productId: l.productId, color: l.color, size: l.size, qty: l.qty });
    startWait("/cart");
    router.push("/cart");
  }

  const againBtn =
    again.length > 0 ? (
      <button className="btn btn-blue" type="button" onClick={buyAgain}>
        <FeedIcon name="arrows-clockwise" />
        Mua lại
      </button>
    ) : null;

  let act: React.ReactNode = null;
  if (s.state === "AWAITING_TRANSFER" && transfer) {
    act = (
      <section className="od-act" id="pay" aria-label="Chuyển khoản">
        <p className="od-hold">
          <FeedClock until={transfer.dueAt} now={nowMs} tag="span" label="Thời gian giữ hàng còn lại" />
        </p>
        <p className="od-act-line">
          Giữ hàng tới <b>{transfer.until}</b>. {transfer.note}
        </p>
        <div className="od-pay">
          <CopyRow k="Số tiền" shown={vnd(transfer.amountVnd)} value={String(transfer.amountVnd)} />
          <CopyRow k="Nội dung" shown={transfer.memo} value={transfer.memo} />
          <div className="copyrow is-pending">
            <span className="copy-k">Tài khoản</span>
            <span className="copy-v">Số tài khoản và tên ngân hàng đang chuẩn bị</span>
          </div>
          <div className="qr-slot" role="img" aria-label="Chỗ của mã QR nhận tiền, hiện khi có tài khoản ngân hàng thật">
            <b>Mã QR nhận tiền</b>
            <span>Hiện khi có tài khoản ngân hàng thật</span>
          </div>
        </div>
        <button className="btn btn-line od-cancel" type="button" onClick={openCancel}>
          Huỷ đơn
        </button>
      </section>
    );
  } else if (s.state === "RECEIVED") {
    act = (
      <section className="od-act" aria-label="Xác nhận đơn">
        <p className="od-act-line">
          Cửa hàng gọi <b>{formatPhone(order.shipTo.phone)}</b> để xác nhận trước khi giao.
        </p>
        <button className="btn btn-line od-cancel" type="button" onClick={openCancel}>
          Huỷ đơn
        </button>
      </section>
    );
  } else if (s.state === "SHIPPING" && s.trackingCode) {
    act = (
      <section className="od-act" aria-label="Vận đơn">
        <CopyRow k="Mã vận đơn" shown={s.trackingCode} value={s.trackingCode} />
      </section>
    );
  } else if (s.state === "DELIVERED") {
    const until = returnUntil(order);
    const ret =
      until && canReturn(order, now) ? (
        <Link className="btn btn-line" href="/returns">
          <FeedIcon name="arrow-u-up-left" />
          Đổi trả tới {dayMonth(until)}
        </Link>
      ) : null;
    if (ret || againBtn) {
      act = (
        <div className="od-btns">
          {ret}
          {againBtn}
        </div>
      );
    }
  } else if (s.state === "CANCELLED") {
    act = (
      <>
        <p className="od-why">
          <FeedIcon name="x" />
          <span>{cancelReasonText(s.reason)}. Hàng đã về kệ.</span>
        </p>
        {againBtn && <div className="od-again">{againBtn}</div>}
      </>
    );
  }

  return (
    <div className="od">
      <section className="od-hero" data-hero>
        <h1 className="od-code disp" ref={code} tabIndex={-1}>
          {order.code}
        </h1>
        <div className="od-meta">
          {orderGroups(catalog, order).map((g) => (
            <span className="chip-tag" key={String(g)}>
              {groupLabel(g)}
            </span>
          ))}
        </div>
      </section>

      <div className="od-left">
        <div className="od-steps">
          <OrderSteps order={order} />
        </div>
        {act}
        <section className="acc-sec" aria-labelledby="h-items">
          <div className="acc-sec-head">
            <h2 className="acc-sec-title" id="h-items">
              {units} món
            </h2>
          </div>
          <ul className="od-items">
            {order.lines.map((l, i) => {
              const p = catalog.byId.get(l.productId);
              const inner = (
                <>
                  <Tile line={l} product={p} size="lg" qty={false} named={false} />
                  <div>
                    <p className="od-item-name disp">{p?.name ?? "—"}</p>
                    <p className="od-item-meta">
                      {COLORS[l.color]?.label ?? l.color} · Size {l.size}
                      {l.qty > 1 && ` · ×${l.qty}`}
                    </p>
                  </div>
                  <p className="od-item-price">{vnd(l.unitPriceVnd * l.qty)}</p>
                </>
              );
              const key = `${l.productId}:${l.color}:${l.size}:${i}`;
              // The mock links the styles it draws; a style set in type (its frame only borrowed) is not a link.
              return p && linePicture(p, l.color) ? (
                <li key={key}>
                  <Link className="od-item od-item-a" href={styleHref(p)}>
                    {inner}
                  </Link>
                </li>
              ) : (
                <li key={key} className="od-item">
                  {inner}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="od-right">
        <section className="acc-sec od-sum" aria-labelledby="h-sum">
          <div className="acc-sec-head">
            <h2 className="acc-sec-title" id="h-sum">
              Tóm tắt
            </h2>
          </div>
          <dl className="facts">
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
        <section className="acc-sec" aria-labelledby="h-ship">
          <div className="acc-sec-head">
            <h2 className="acc-sec-title" id="h-ship">
              Giao tới
            </h2>
          </div>
          <dl className="facts od-facts">
            <div>
              <dt>Người nhận</dt>
              <dd>
                {order.shipTo.recipient}, {formatPhone(order.shipTo.phone)}
              </dd>
            </div>
            <div>
              <dt>Địa chỉ</dt>
              <dd>{addressLine}</dd>
            </div>
            <div>
              <dt>Cách giao</dt>
              <dd>{deliveryTitle(order.delivery)}</dd>
            </div>
            <div>
              <dt>Thanh toán</dt>
              <dd>{paymentTitle(order.payment)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <FeedSheet
        open={sheet}
        onClose={() => {
          if (!cancelling) setSheet(false);
        }}
        onClosed={afterSheet}
        labelledBy="cancel-title"
        back={opener.current}
      >
        <div className="sheet-panel">
          <div className="grab" aria-hidden="true" />
          <div className="sh-head plain">
            <h2 className="sh-title" id="cancel-title">
              Huỷ đơn {order.code}?
            </h2>
            <button className="sh-x" type="button" data-close aria-label="Đóng">
              <FeedIcon name="x" />
            </button>
          </div>
          <p className="cancel-line">{units} chiếc về kệ ngay, không hoàn tác.</p>
          <div className="stack">
            <button className="btn btn-blue" type="button" data-close data-autofocus>
              Giữ đơn
            </button>
            <button className="btn btn-line" type="button" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? "Đang huỷ…" : "Huỷ đơn"}
            </button>
          </div>
        </div>
      </FeedSheet>
    </div>
  );
}

/** A value with its copy button (`order.js`: `copyRow`); where the clipboard cannot be reached, the value is selected. */
function CopyRow({ k, shown, value }: { k: string; shown: string; value: string }) {
  const target = useRef<HTMLElement>(null);
  return (
    <div className="copyrow">
      <span className="copy-k">{k}</span>
      <b className="copy-v" ref={target}>
        {shown}
      </b>
      <FeedCopy value={value} what={k} target={target} />
    </div>
  );
}
