import type { OrderState, PaymentMethod } from "@/data/types";

/**
 * The tone a status label carries, named for the STATE and not for a colour,
 * because the colours have moved before (v3's badge family, 22/09/2026; Arc's
 * badge since round v5):
 *
 * · `ok`    a live state — đang bán, đã thanh toán, đã giao.
 * · `info`  something on its way — sắp mở, đang giao.
 * · `hot`   an alert worth a red — sắp hết, hết lượt.
 * · `warn`  waiting on somebody — chờ chuyển khoản.
 * · `shut`  over — đã đóng, đã huỷ, hết.
 * · `flat`  not a state at all: an identity label.
 * · `""`    the neutral one.
 *
 * The back office draws them with Arc's `Badge`: `TONE`
 * (`components/admin-arc/ArcOrderCells.tsx`) turns each into an Arc tone.
 * Until round v5 slice 6 this type was v3's `BadgeTone`, beside its `Badge`.
 */
export type StatusTone = "" | "ok" | "hot" | "warn" | "info" | "shut" | "flat";

/**
 * Wire value → what a person reads, and the tone that carries it.
 *
 * In `lib`, not beside a screen, for a reason that has already bitten once:
 * these used to be exported from `OrdersScreen.tsx`, which is `"use client"`.
 * The admin dashboard and the admin order list both render on the SERVER,
 * and importing a value across that line throws at request time while the
 * build stays silent. `order-labels.test.ts` pins it.
 *
 * The tone is a second channel, never the only one. Every state says its
 * name, so a badge read without colour still reports the state — which is
 * PRODUCT.md's accessibility floor, and also just how a list gets scanned.
 */
export const STATE_LABEL: Record<OrderState, { text: string; tone: StatusTone }> = {
  AWAITING_TRANSFER: { text: "Chờ chuyển khoản", tone: "warn" },
  // Taken, and waiting for nothing but the shop — a COD order, or a card
  // order from before slice B7 (a card pays by transfer since). "Đã
  // nhận đơn" and not "Đã thanh toán": no money has moved, and `PAID` on that
  // row would be the screen inventing a payment. Until slice B2 only an order
  // kept in the browser could be in this state, so it had a map of its own
  // (`ROW_STATE_LABEL`); the database issues it now, and one map is enough.
  RECEIVED: { text: "Đã nhận đơn", tone: "ok" },
  PAID: { text: "Đã thanh toán", tone: "ok" },
  SHIPPING: { text: "Đang giao", tone: "info" },
  DELIVERED: { text: "Đã giao", tone: "ok" },
  // Cancelled is an ENDED state, not an alert: the red family is kept for
  // the two things a shopper can still act on (stock running out, a code out
  // of uses). Family B, 22/09/2026.
  CANCELLED: { text: "Đã huỷ", tone: "shut" },
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Thẻ",
  COD: "COD",
};
