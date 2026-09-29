import { byId } from "./catalog";
import { customerById } from "./customers";
import { promoByCode } from "./promotions";
import { addDaysIso, addMinutesIso } from "@/lib/datetime";
import { promoDiscountVnd } from "@/lib/orders";
import {
  type ColorKey,
  type CustomerId,
  type Order,
  type OrderLine,
  type OrderMoments,
  type OrderStatus,
  type PaymentMethod,
  type Size,
  customerId,
  orderCode,
  productId,
  promoCode,
} from "./types";

/**
 * Simulated. A RECENT SAMPLE, not the full ledger — twenty-four orders, not
 * the several hundred the catalog's sold figures imply. That distinction is
 * load-bearing: the admin list is headed "đơn gần nhất", and the test suite
 * only checks that no style appears here more often than it ever sold.
 * Presenting these as complete would be inventing a sales history, which
 * PRODUCT.md forbids.
 *
 * Nothing derived is typed in. Line prices come from the catalog and the
 * discount comes from the promotion, both at construction time, so a fixture
 * cannot quietly disagree with the rules checkout will apply. Since slice B10
 * the steps each order passed are made the same way, by the one rule written
 * beside `passedMoments` below.
 */

/** One flat rate across the country in the mock. */
const SHIPPING_VND = 30_000;

/**
 * A line as the list below writes it. The first element is a style's STEM,
 * the part of its id after `p-` (`khoi` for `p-khoi`): since slice B5 an
 * issue's style is published as `s05-khoi`, but its id never moved, and an
 * order line points at the id.
 */
type LineSpec = [stem: string, size: Size, color: ColorKey, qty: number];

// ─────────────────────────────────────────────── the steps an order passed
/**
 * WHEN EACH SAMPLE ORDER WAS PAID AND HANDED OVER (backend slice B10). The
 * Feed order page prints a time under every step already passed, as the mock
 * does for DH-1496, and this sample was first written with its current
 * state's moment only. The earlier ones are authored here — the orders are
 * demo data like everything else in this file (main session, 30/09/2026) — by
 * ONE rule read off the Feed mock's own orders
 * (`prototype/explore/shared/data.js`, ORDERS), so no order's times are typed
 * in one by one:
 *
 *   · PAID 13 MINUTES AFTER IT WAS PLACED: a transfer, or a card order (a
 *     card pays by transfer since slice B7). The mock's four transfers were
 *     paid 11, 12, 15 and 72 minutes after placing (DH-1210, DH-1496,
 *     DH-1502, DH-1507): the median, 13½, written to the minute as every
 *     instant here is. COD pays at the door, so it has no paid step at all.
 *   · HANDED OVER AT 08:25 ON THE SECOND CALENDAR DAY AFTER IT WAS PLACED.
 *     The mock's six hand-overs came 2, 3, 4, 2, 2 and 2 days after placing
 *     (DH-1507, DH-1502, DH-1499, DH-1496, DH-1402, DH-1210), median 2, at
 *     08:30, 09:10, 07:15, 08:20, 08:00 and 09:00, median 08:25.
 *
 * Two sample orders are the mock's own under another number, and keep the
 * mock's offsets from placing instead (`MOCK_TWINS`).
 *
 * Only a step the order has passed gets a moment, and a moment its status
 * already carries is the status's own: a PAID order's payment, a SHIPPING
 * order's hand-over, a DELIVERED order's delivery. Nothing already written
 * moves — not a placing, not a status. `data/orders.test.ts` pins the rule
 * and that every order's steps fall in order, and before the anchor.
 */
const PAID_AFTER_MINUTES = 13;
const HANDED_OVER_DAYS_AFTER = 2;
const HANDED_OVER_AT = "08:25";

/** The mock's orders this sample also has: minutes from placing to the payment and to the hand-over. */
const MOCK_TWINS: Readonly<Record<string, { paid: number; handedOver: number }>> = {
  // DH-1496: placed 21:40 11/09, paid 21:52, handed over 08:20 13/09.
  "DH-2416": { paid: 12, handedOver: 34 * 60 + 40 },
  // DH-1210: placed 20:30 09/03, paid 20:41, handed over 09:00 11/03.
  "DH-2210": { paid: 11, handedOver: 36 * 60 + 30 },
};

function passedMoments(
  code: string,
  placedAt: string,
  status: OrderStatus,
  payment: PaymentMethod,
): OrderMoments | undefined {
  const twin = MOCK_TWINS[code];
  const paidAt = () => addMinutesIso(placedAt, twin ? twin.paid : PAID_AFTER_MINUTES);
  const handedOverAt = () =>
    twin
      ? addMinutesIso(placedAt, twin.handedOver)
      : `${addDaysIso(placedAt, HANDED_OVER_DAYS_AFTER).slice(0, 10)}T${HANDED_OVER_AT}:00+07:00`;
  const paysAhead = payment !== "COD";
  switch (status.state) {
    case "PAID":
      return { paidAt: status.paidAt };
    case "SHIPPING":
      return { ...(paysAhead ? { paidAt: paidAt() } : {}), shippedAt: status.shippedAt };
    case "DELIVERED":
      return {
        ...(paysAhead ? { paidAt: paidAt() } : {}),
        shippedAt: handedOverAt(),
        deliveredAt: status.deliveredAt,
      };
    default:
      // Waiting for money, taken and not yet called, or cancelled: no step the page stamps.
      return undefined;
  }
}

function order(
  code: string,
  who: string,
  placedAt: string,
  status: OrderStatus,
  payment: PaymentMethod,
  specs: LineSpec[],
  promo?: string,
): Order {
  const lines: OrderLine[] = specs.map(([stem, size, color, qty]) => {
    const p = byId.get(productId(`p-${stem}`));
    if (!p) throw new Error(`${code}: no product with id "p-${stem}"`);
    if (!p.colors.includes(color)) {
      throw new Error(`${code}: ${p.name} does not come in ${color}`);
    }
    return { productId: p.id, size, color, qty, unitPriceVnd: p.priceVnd };
  });

  const cid = customerId(who) as CustomerId;
  const customer = customerById.get(cid);
  if (!customer) throw new Error(`${code}: no customer "${who}"`);
  const home = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];
  if (!home) throw new Error(`${code}: ${customer.name} has no address`);

  const subtotal = lines.reduce((n, l) => n + l.unitPriceVnd * l.qty, 0);
  const promotion = promo ? promoByCode.get(promoCode(promo)) : undefined;
  if (promo && !promotion) throw new Error(`${code}: no promotion "${promo}"`);
  const moments = passedMoments(code, placedAt, status, payment);

  return {
    code: orderCode(code),
    customerId: cid,
    lines,
    status,
    payment,
    // Four fields that arrived with slice B2, when an order placed at
    // checkout started living in the same table as these. What the sample
    // can honestly say: the confirmation went to the customer's own address,
    // nobody typed a note, and the parcel went by the one service there was.
    delivery: "STANDARD",
    shippingFeeVnd: SHIPPING_VND,
    // Cash-on-delivery handling applies from B2. The sample orders keep 0 so
    // the figures the back office was reviewed against do not move —
    // including the COD ones, whose handling was never charged to them.
    codFeeVnd: 0,
    discountVnd: promoDiscountVnd(promotion, subtotal, SHIPPING_VND),
    shipTo: {
      recipient: home.recipient,
      phone: home.phone,
      line: home.line,
      provinceCode: home.provinceCode,
      wardCode: home.wardCode,
    },
    email: customer.email,
    note: "",
    placedAt,
    ...(promo ? { promo: promoCode(promo) } : {}),
    ...(moments ? { moments } : {}),
  };
}

const delivered = (at: string): OrderStatus => ({ state: "DELIVERED", deliveredAt: at });
const paid = (at: string): OrderStatus => ({ state: "PAID", paidAt: at });
const shipping = (at: string, code: string): OrderStatus =>
  ({ state: "SHIPPING", shippedAt: at, trackingCode: code });
const awaiting = (at: string): OrderStatus =>
  ({ state: "AWAITING_TRANSFER", dueAt: at });
const cancelled = (at: string, reason: string): OrderStatus =>
  ({ state: "CANCELLED", cancelledAt: at, reason });

export const ORDERS: Order[] = [
  // ── Drop 03, March 2026 ──────────────────────────────────────────────
  order("DH-2210", "c-minhanh", "2026-03-09T20:30:00+07:00",
    delivered("2026-03-14T10:05:00+07:00"), "BANK_TRANSFER",
    [["lua", "M", "black", 1], ["bao", "L", "grey", 1]]),

  order("DH-2211", "c-namle", "2026-03-12T16:20:00+07:00",
    delivered("2026-03-17T15:40:00+07:00"), "COD",
    [["dat", "XL", "brown", 1]]),

  // ── Drop 04, June 2026 ───────────────────────────────────────────────
  // Cancelled, not delivered — the approved "đơn đã huỷ" screen is drawn for
  // this exact code. Twelve hours after it was placed, which is the window
  // the reason names: an order holds stock that long, then releases it.
  order("DH-2310", "c-minhanh", "2026-06-06T20:15:00+07:00",
    cancelled("2026-06-07T08:15:00+07:00", "quá hạn chuyển khoản"), "BANK_TRANSFER",
    [["reu", "M", "moss", 1]], "DOT04"),

  order("DH-2311", "c-namle", "2026-06-08T11:30:00+07:00",
    delivered("2026-06-12T17:12:00+07:00"), "CARD",
    [["tro", "L", "grey", 1], ["song", "M", "white", 1]], "DOT04"),

  // Under DOT04's 1.000.000₫ floor, so the code is on the order and takes
  // nothing off. The case most likely to be rendered wrong.
  order("DH-2312", "c-hapham", "2026-06-10T19:02:00+07:00",
    delivered("2026-06-15T14:08:00+07:00"), "COD",
    [["vo", "M", "black", 1]], "DOT04"),

  order("DH-2313", "c-duyvo", "2026-06-14T08:44:00+07:00",
    cancelled("2026-06-16T08:44:00+07:00", "Quá hạn chuyển khoản"), "BANK_TRANSFER",
    [["kho", "L", "cream", 2]]),

  // ── Drop 05, open ────────────────────────────────────────────────────
  order("DH-2414", "c-vynguyen", "2026-09-11T20:03:00+07:00",
    delivered("2026-09-15T11:20:00+07:00"), "BANK_TRANSFER",
    [["khoi", "M", "black", 1]]),

  order("DH-2415", "c-baodang", "2026-09-11T20:11:00+07:00",
    delivered("2026-09-15T16:45:00+07:00"), "COD",
    [["bui", "L", "black", 1], ["khoi", "S", "cream", 1]], "DOT05"),

  order("DH-2416", "c-minhanh", "2026-09-11T21:40:00+07:00",
    delivered("2026-09-16T10:02:00+07:00"), "BANK_TRANSFER",
    [["nguoi", "M", "black", 1]], "DOT05"),

  order("DH-2417", "c-namle", "2026-09-12T07:55:00+07:00",
    delivered("2026-09-16T13:55:00+07:00"), "CARD",
    [["cat", "M", "cream", 2]], "CHAOBAN"),

  order("DH-2418", "c-tubui", "2026-09-12T12:30:00+07:00",
    cancelled("2026-09-12T18:10:00+07:00", "Khách đổi ý"), "BANK_TRANSFER",
    [["suong", "XL", "black", 1]]),

  order("DH-2419", "c-hapham", "2026-09-12T19:05:00+07:00",
    delivered("2026-09-17T09:18:00+07:00"), "BANK_TRANSFER",
    [["nang", "M", "white", 1], ["cat", "S", "white", 1]], "CHAOBAN"),

  order("DH-2420", "c-duyvo", "2026-09-13T09:12:00+07:00",
    delivered("2026-09-17T15:33:00+07:00"), "COD",
    [["muoi", "L", "black", 1]]),

  order("DH-2421", "c-linhhoang", "2026-09-13T18:44:00+07:00",
    delivered("2026-09-18T11:47:00+07:00"), "CARD",
    [["than", "M", "navy", 1]], "DOT05"),

  // Still on the road. The account screens need one order of each state to
  // exist for the signed-in customer, or three approved screens — the
  // shipping detail, the tracking log, the "1 đơn đang giao" line — have
  // nothing to render.
  order("DH-2422", "c-minhanh", "2026-09-14T10:20:00+07:00",
    shipping("2026-09-18T07:15:00+07:00", "VD-8842-1907"), "BANK_TRANSFER",
    [["gio", "M", "white", 1], ["khoi", "L", "black", 1]], "DOT05"),

  order("DH-2423", "c-vynguyen", "2026-09-14T21:02:00+07:00",
    delivered("2026-09-19T10:41:00+07:00"), "COD",
    [["da", "M", "moss", 1]], "CHAOBAN"),

  order("DH-2424", "c-baodang", "2026-09-15T08:36:00+07:00",
    shipping("2026-09-17T07:30:00+07:00", "VNP-8842190"), "BANK_TRANSFER",
    [["cat", "L", "cream", 1], ["cat", "M", "white", 1]], "FREESHIP"),

  order("DH-2425", "c-namle", "2026-09-15T14:50:00+07:00",
    shipping("2026-09-17T09:15:00+07:00", "VNP-8842204"), "CARD",
    [["khoi", "XL", "cream", 1], ["nang", "L", "moss", 1]], "CHAOBAN"),

  order("DH-2426", "c-tubui", "2026-09-16T11:11:00+07:00",
    shipping("2026-09-18T08:05:00+07:00", "VNP-8842377"), "BANK_TRANSFER",
    [["bui", "XL", "grey", 1]], "FREESHIP"),

  // Percentage runs past DOT05's 150.000₫ cap and stops there.
  order("DH-2427", "c-hapham", "2026-09-17T20:28:00+07:00",
    paid("2026-09-17T20:41:00+07:00"), "BANK_TRANSFER",
    [["nguoi", "L", "black", 1], ["khoi", "M", "cream", 1]], "DOT05"),

  order("DH-2428", "c-duyvo", "2026-09-18T09:40:00+07:00",
    paid("2026-09-18T09:43:00+07:00"), "CARD",
    [["nang", "XL", "cream", 1]], "CHAOBAN"),

  order("DH-2429", "c-linhhoang", "2026-09-18T22:15:00+07:00",
    paid("2026-09-19T07:52:00+07:00"), "BANK_TRANSFER",
    [["muoi", "M", "grey", 2]], "DOT05"),

  order("DH-2430", "c-minhanh", "2026-09-19T19:50:00+07:00",
    awaiting("2026-09-21T19:50:00+07:00"), "BANK_TRANSFER",
    [["suong", "M", "moss", 1], ["than", "L", "black", 1]], "DOT05"),

  order("DH-2431", "c-vynguyen", "2026-09-20T08:05:00+07:00",
    awaiting("2026-09-22T08:05:00+07:00"), "BANK_TRANSFER",
    [["cat", "XL", "brown", 1]], "CHAOBAN"),
];

export const orderByCode = new Map(ORDERS.map((o) => [o.code, o]));

export function ordersOf(id: CustomerId): Order[] {
  return ORDERS.filter((o) => o.customerId === id).sort(
    (a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt),
  );
}
