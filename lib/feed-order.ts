import { COLORS } from "@/data/colors";
import type { Order, Product, Size } from "@/data/types";
import type { Catalog } from "./catalog";
import { clockDayLabel } from "./datetime";
import { feedDelivery, feedDeliveryWindow, type FeedRow } from "./feed-checkout";
import { trackHref } from "./lookup";
import { vnd } from "./money";
import { STATE_LABEL } from "./order-labels";
import {
  TRANSFER_HOLD_HOURS,
  orderSubtotalVnd,
  orderTotalVnd,
  orderUnits,
  paysByTransfer,
  transferReference,
} from "./orders";
import { formatPhone } from "./phone";

/**
 * The Feed's order confirmation (round v4 slice 2): the approved mock's
 * `confirmed.js` over one order the database placed. Pure; the screen is
 * `components/feed/order/OrderConfirmedView.tsx`.
 *
 * The mock shows the moment just after checkout: a transfer waiting (a card
 * too, which pays by transfer, `paysByTransfer`) or a COD order waiting for
 * the shop's call. A receipt can be reopened later, when the order has moved
 * on; the title "Đã đặt hàng" stays true, and the line under it and the
 * status follow the order instead of repeating a request that no longer
 * applies.
 */

/** Which of the mock's two screens: the transfer's (a card's too) or COD's. */
export type ConfirmFlow = "transfer" | "cod";

export function confirmFlow(o: Pick<Order, "payment">): ConfirmFlow {
  return paysByTransfer(o.payment) ? "transfer" : "cod";
}

/** The mock's four steps of each flow (`confirmed.js`: `STEPS`). */
export const CONFIRM_STEPS: Readonly<Record<ConfirmFlow, readonly string[]>> = {
  transfer: ["Đã đặt", "Chờ chuyển khoản", "Đang giao", "Đã giao"],
  cod: ["Đã đặt", "Gọi xác nhận", "Đang giao", "Đã giao"],
};

export type StepState = "done" | "now" | "todo";

export interface ConfirmStep {
  label: string;
  state: StepState;
}

/**
 * "Trạng thái": the flow's four steps, lit to where the order is. Just placed
 * — the mock's state — the first is done and the second is now (the transfer
 * awaited, the call awaited). Paid: the second is done too; on its way: the
 * third is now; delivered: all four done. A cancelled order does not show the
 * steps it will never reach: it was placed, and it is cancelled.
 */
export function confirmSteps(o: Order): ConfirmStep[] {
  const labels = CONFIRM_STEPS[confirmFlow(o)];
  const lit = (done: number, now: number | null): ConfirmStep[] =>
    labels.map((label, i) => ({ label, state: i < done ? "done" : i === now ? "now" : "todo" }));
  switch (o.status.state) {
    case "AWAITING_TRANSFER":
    case "RECEIVED":
      return lit(1, 1);
    case "PAID":
      return lit(2, null);
    case "SHIPPING":
      return lit(2, 2);
    case "DELIVERED":
      return lit(4, null);
    case "CANCELLED":
      return [
        { label: labels[0]!, state: "done" },
        { label: STATE_LABEL.CANCELLED.text, state: "now" },
      ];
  }
}

const capitalise = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("vi") + s.slice(1) : s);

/**
 * The one line under "Mã đơn": what happens next (`confirmed.js`: `NEXT`) —
 * transfer within the hold, or the shop's call before delivery. A card order
 * taken before slice B7 waits in RECEIVED and pays by transfer (the checkout's
 * words). Reopened later: the state in its own words, or, cancelled, why and
 * that the pieces went back (the Feed's order page, `order.js`).
 */
export function confirmNext(o: Order): string {
  switch (o.status.state) {
    case "AWAITING_TRANSFER":
      return `Chuyển khoản trong ${TRANSFER_HOLD_HOURS} giờ để giữ hàng.`;
    case "RECEIVED":
      return o.payment === "COD" ? "Cửa hàng gọi xác nhận trước khi giao." : "Tạm thời trả bằng chuyển khoản.";
    case "PAID":
    case "SHIPPING":
    case "DELIVERED":
      return `${STATE_LABEL[o.status.state].text}.`;
    case "CANCELLED":
      return `${capitalise(o.status.reason)}. Hàng đã về kệ.`;
  }
}

/** The transfer block and the hold, while the transfer is awaited. */
export interface ConfirmTransfer {
  amountVnd: number;
  /** The bank memo: the order code without its dash ("DH1507"), `transferReference`. */
  memo: string;
  dueAt: string;
  /** "07:02 thứ Ba 22/09". */
  until: string;
  /** "Quá giờ, đơn tự huỷ và 4 chiếc về kệ." */
  note: string;
}

export function confirmTransfer(o: Order): ConfirmTransfer | null {
  if (o.status.state !== "AWAITING_TRANSFER") return null;
  return {
    amountVnd: orderTotalVnd(o),
    memo: transferReference(o.code),
    dueAt: o.status.dueAt,
    until: clockDayLabel(o.status.dueAt),
    note: `Quá giờ, đơn tự huỷ và ${orderUnits(o)} chiếc về kệ.`,
  };
}

/**
 * "Giao hàng": the service and its window counted from when the order was
 * placed (a receipt reopened days later keeps the window it promised), the
 * recipient, the address. The address line is built on the server, where the
 * communes are.
 */
export function confirmShipRows(o: Order, addressLine: string): FeedRow[] {
  return [
    { label: feedDelivery(o.delivery).title, value: `dự kiến ${feedDeliveryWindow(o.delivery, o.placedAt)}` },
    { label: "Người nhận", value: `${o.shipTo.recipient}, ${formatPhone(o.shipTo.phone)}` },
    { label: "Địa chỉ", value: addressLine },
  ];
}

/** "Tóm tắt" above "Tổng", as the order was priced: the code's line only when it took something off. */
export function confirmRows(o: Order): FeedRow[] {
  const rows: FeedRow[] = [
    { label: "Tạm tính", value: vnd(orderSubtotalVnd(o)) },
    { label: "Giao hàng", value: o.shippingFeeVnd ? vnd(o.shippingFeeVnd) : "Miễn phí" },
  ];
  if (o.codFeeVnd) rows.push({ label: "Phụ phí COD", value: `+${vnd(o.codFeeVnd)}` });
  if (o.discountVnd && o.promo) rows.push({ label: `Mã ${o.promo}`, value: `-${vnd(o.discountVnd)}` });
  return rows;
}

/** One line of the order as the summary prints it: the style by its bare name, at the price it was sold for. */
export interface ConfirmLine {
  key: string;
  product: Product | undefined;
  name: string;
  colorLabel: string;
  color: Order["lines"][number]["color"];
  size: Size;
  qty: number;
  totalVnd: number;
}

export function confirmLines(catalog: Catalog, o: Order): ConfirmLine[] {
  return o.lines.map((l, i) => {
    const product = catalog.byId.get(l.productId);
    return {
      key: `${l.productId}:${l.color}:${l.size}:${i}`,
      product,
      name: product?.name ?? "—",
      colorLabel: COLORS[l.color].label,
      color: l.color,
      size: l.size,
      qty: l.qty,
      totalVnd: l.unitPriceVnd * l.qty,
    };
  });
}

/**
 * The second button: the order's own page for an order in the signed-in
 * account, the lookup by code and phone otherwise — an order placed signed
 * out is not in the account's list, whoever is signed in now.
 */
export function followLink(o: Order, inAccount: boolean): { label: string; href: string } {
  return inAccount
    ? { label: "Xem đơn", href: `/account/orders/${o.code}` }
    : { label: "Tra cứu đơn", href: trackHref(o.code, o.shipTo.phone) };
}
