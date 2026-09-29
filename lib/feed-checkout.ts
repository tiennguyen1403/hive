import type { DeliveryMethod, PaymentMethod, Promotion } from "@/data/types";
import type { Catalog } from "./catalog";
import { demoNow } from "./clock";
import { feedDayRange, feedTight } from "./feed-range";
import { phoneDigits } from "./lookup";
import { vnd } from "./money";
import { TRANSFER_HOLD_HOURS } from "./orders";
import { checkPromoCode, normalisePromoCode } from "./promotions";
import { COD_SURCHARGE_VND, DELIVERY_OPTIONS, deliveryWindow, type CheckoutTotals } from "./shipping";

/**
 * What the Feed's buying screens print (round v4 slice 2): the approved mock's
 * words (`prototype/explore/feed/checkout.js`, `cart.js`, `confirmed.js`) over
 * the app's own rules — the delivery services and their fees
 * (`lib/shipping.ts`), the transfer hold (`lib/orders.ts`), the codes
 * (`lib/promotions.ts`). Pure, and safe for the browser: nothing here reaches
 * `data/regions.ts` and its 3,321 communes.
 */

// ─────────────────────────────────────────────────────────── delivery

const capitalise = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("vi") + s.slice(1) : s);

/** One delivery choice as the mock's selection card prints it. */
export interface FeedDelivery {
  method: DeliveryMethod;
  /** "Giao tiêu chuẩn", "Giao nhanh nội thành". */
  title: string;
  /** "2-4 ngày", "24 giờ": the mock's hyphen, held tight. */
  days: string;
  /** Express only: "Chỉ nội thành TP. Hồ Chí Minh, trong giờ hành chính". */
  note: string | null;
}

/**
 * The two services, from `DELIVERY_OPTIONS`: its label ("Giao tiêu chuẩn · 2–4
 * ngày", which a handover also stores as the order's carrier, so it is split
 * here rather than changed there) gives the title and the days; express adds
 * where and when it runs. The standard service carries no note, as in the mock.
 */
export const FEED_DELIVERY: readonly FeedDelivery[] = DELIVERY_OPTIONS.map((o) => {
  const [title = o.label, days = ""] = o.label.split(" · ");
  const note = o.method === "EXPRESS" ? `${capitalise(o.note)}${o.when ? `, ${o.when}` : ""}` : null;
  return { method: o.method, title, days: feedTight(days), note };
});

export function feedDelivery(method: DeliveryMethod): FeedDelivery {
  return FEED_DELIVERY.find((d) => d.method === method) ?? FEED_DELIVERY[0]!;
}

/** "29/09 - 01/10", or "28/09" for a one-day service: the window counted from `fromIso`. */
export function feedDeliveryWindow(method: DeliveryMethod, fromIso: string): string {
  const w = deliveryWindow(method, fromIso);
  return feedDayRange(w.fromIso, w.toIso);
}

/** The card's second line: "2-4 ngày · dự kiến 29/09 - 01/10". */
export function deliverySub(method: DeliveryMethod, fromIso: string): string {
  return `${feedDelivery(method).days} · dự kiến ${feedDeliveryWindow(method, fromIso)}`;
}

/** Express, once a province it does not reach is chosen. */
export function expressOffNote(provinceName: string): string {
  return `Không giao nhanh tới ${provinceName}`;
}

/** The toast when a new province ends express: it moved to the standard service by itself. */
export function expressSwitchNote(expressProvinceName: string): string {
  return `Giao nhanh chỉ trong ${expressProvinceName}, đã chuyển sang giao tiêu chuẩn`;
}

// ─────────────────────────────────────────────────────────── payment

/** One way to pay as the mock's selection card prints it: the title, the consequence, a surcharge. */
export interface FeedPayment {
  method: PaymentMethod;
  title: string;
  note: string;
  /** "+15.000₫" on COD, nothing otherwise. */
  price: string | null;
}

/**
 * The three ways, in the mock's order. A card pays by transfer while no card
 * gateway is connected (slice B7, `paysByTransfer`); the transfer card above it
 * already states the hold, so the card's note keeps only what differs (the
 * mock's `PAY_NOTE`). "nhận (COD)" holds together, as at v3 slice 13.
 */
export const FEED_PAYMENTS: readonly FeedPayment[] = [
  {
    method: "BANK_TRANSFER",
    title: "Chuyển khoản",
    note: `Giữ hàng ${TRANSFER_HOLD_HOURS} giờ kể từ khi đặt. Nội dung chuyển khoản hiện ở màn xác nhận.`,
    price: null,
  },
  { method: "COD", title: "Thanh toán khi nhận (COD)", note: "Kiểm hàng trước khi trả.", price: `+${vnd(COD_SURCHARGE_VND)}` },
  { method: "CARD", title: "Thẻ (nội địa, Visa)", note: "Tạm thời trả bằng chuyển khoản.", price: null },
];

// ─────────────────────────────────────────────────────────── the form

/** The fields the mock checks, by the mock's names. */
export type FeedField = "name" | "phone" | "email" | "province" | "ward" | "street";

export interface FeedContact {
  name: string;
  phone: string;
  email: string;
  provinceCode: string;
  wardCode: string;
  street: string;
}

/** The fields in the order the page shows them: the first wrong one takes the focus. */
export const FEED_FIELDS: readonly FeedField[] = ["name", "phone", "email", "province", "ward", "street"];

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/**
 * What is wrong with the form, field by field, in the mock's words
 * (`checkout.js`: `rules`). The rules are the app's: a phone number is read the
 * way `normalisePhone` reads one (spaces, dots, dashes, +84). The e-mail is
 * "tuỳ chọn", as in the mock: none is fine, and one that is typed must look
 * like an address ("Email chưa đúng"). `place_order()` stores none as NULL
 * since slice B8.
 */
export function feedFormErrors(c: FeedContact): Partial<Record<FeedField, string>> {
  const e: Partial<Record<FeedField, string>> = {};
  if (c.name.trim().length < 2) e.name = "Nhập họ và tên";
  const phone = c.phone.trim();
  if (!phone) e.phone = "Nhập số điện thoại";
  else if (!phoneDigits(phone)) e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
  const email = c.email.trim();
  if (email && !looksLikeEmail(email)) e.email = "Email chưa đúng";
  if (!c.provinceCode) e.province = "Chọn tỉnh / thành";
  else if (!c.wardCode) e.ward = "Chọn phường / xã";
  if (!c.street.trim()) e.street = "Nhập số nhà, đường";
  return e;
}

/** The first field that is wrong, in the page's order. */
export function firstWrong(errors: Partial<Record<FeedField, string>>): FeedField | undefined {
  return FEED_FIELDS.find((f) => errors[f]);
}

// ─────────────────────────────────────────────────────────── the code

export type FeedPromoCheck = { ok: true; promo: Promotion } | { ok: false; message: string };

/**
 * A typed code, judged by the app's rules (`checkPromoCode`: window, uses,
 * pause, minimum) and refused in the mock's words: "Nhập mã giảm giá", "Mã
 * không tồn tại", "Mã đã hết hạn", "Mã đã hết lượt dùng", "Đơn từ 500.000₫ mới
 * dùng được mã này". Two refusals the mock has no words for take the app's,
 * shaped the same way: a code not started yet, and a code the shop paused.
 */
export function feedPromoCheck(catalog: Catalog, raw: string, subtotalVnd: number, now: Date = demoNow()): FeedPromoCheck {
  const check = checkPromoCode(catalog, raw, subtotalVnd, now);
  if (check.ok) return check;
  const code = normalisePromoCode(raw);
  if (!code) return { ok: false, message: "Nhập mã giảm giá" };
  const promo = catalog.promoByCode.get(code as never);
  if (!promo) return { ok: false, message: "Mã không tồn tại" };
  const t = now.getTime();
  if (t < Date.parse(promo.startsAt)) return { ok: false, message: "Mã chưa tới ngày dùng được" };
  if (t >= Date.parse(promo.endsAt)) return { ok: false, message: "Mã đã hết hạn" };
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) return { ok: false, message: "Mã đã hết lượt dùng" };
  if (promo.paused) return { ok: false, message: "Mã đang tạm dừng" };
  if (promo.minOrderVnd !== undefined && subtotalVnd < promo.minOrderVnd) {
    return { ok: false, message: `Đơn từ ${vnd(promo.minOrderVnd)} mới dùng được mã này` };
  }
  return { ok: false, message: check.message };
}

// ─────────────────────────────────────────────────────────── the money

export interface FeedRow {
  label: string;
  value: string;
}

/**
 * The summary's lines above "Tổng" (`checkout.js`: `paintAll`): the goods,
 * the delivery ("Miễn phí" when nothing), the COD surcharge when paying so,
 * and the code — what it takes off, or "Miễn phí giao" for a free-delivery
 * code on a basket that already travels free.
 */
export function checkoutRows(t: CheckoutTotals, promoCode: string | null): FeedRow[] {
  const rows: FeedRow[] = [
    { label: "Tạm tính", value: vnd(t.subtotalVnd) },
    { label: "Giao hàng", value: t.shippingFeeVnd ? vnd(t.shippingFeeVnd) : "Miễn phí" },
  ];
  if (t.codFeeVnd) rows.push({ label: "Phụ phí COD", value: `+${vnd(t.codFeeVnd)}` });
  if (promoCode) rows.push({ label: `Mã ${promoCode}`, value: t.discountVnd ? `-${vnd(t.discountVnd)}` : "Miễn phí giao" });
  return rows;
}

/**
 * A sentence of the app's own (a refusal from `placeOrderAction`) in the
 * Feed's punctuation: the Feed writes no long dash, so "Một món vừa hết — mở
 * giỏ…" becomes "Một món vừa hết. Mở giỏ…".
 */
export function feedSentence(text: string): string {
  return text.replace(/\s+[–—]\s+(\S)/gu, (_, c: string) => `. ${c.toLocaleUpperCase("vi")}`);
}
