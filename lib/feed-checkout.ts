import type { DeliveryMethod, PaymentMethod, Promotion } from "@/data/types";
import type { Catalog } from "./catalog";
import { demoNow } from "./clock";
import { daysEn } from "./feed-home";
import { feedDayRange, feedTight } from "./feed-range";
import { picker, type Locale } from "./i18n";
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

/**
 * The two services in English (round v6 slice E2). The footer names express
 * by its city ("Express delivery in HCMC", `lib/feed-home.ts`) because its
 * line has nothing else; on the card the note under the name says where, so
 * the name keeps only what the Vietnamese one says, "nội thành". The days are
 * the label's own figures, their unit in English (`daysEn`).
 *
 * A sentence about where express runs names the city "HCMC", as the footer
 * does (the main session's review of slice E2). The province itself — in its
 * picker, in an address, in "No express delivery to …" — keeps its Vietnamese
 * name (QĐ-40).
 */
const DELIVERY_TITLE_EN: Readonly<Record<DeliveryMethod, string>> = {
  STANDARD: "Standard delivery",
  EXPRESS: "Express city delivery",
};

/** Express's city in an English sentence: "HCMC", the footer's word for it. */
export const EXPRESS_CITY_EN = "HCMC";

const EXPRESS_NOTE_EN = `Central ${EXPRESS_CITY_EN} only, during office hours`;

const FEED_DELIVERY_EN: readonly FeedDelivery[] = DELIVERY_OPTIONS.map((o) => {
  const [, days = ""] = o.label.split(" · ");
  return {
    method: o.method,
    title: DELIVERY_TITLE_EN[o.method],
    days: feedTight(daysEn(days)),
    note: o.method === "EXPRESS" ? EXPRESS_NOTE_EN : null,
  };
});

/** The two services as the cards print them, in one language; `FEED_DELIVERY` is the Vietnamese side. */
export function feedDeliveries(locale: Locale = "vi"): readonly FeedDelivery[] {
  return locale === "en" ? FEED_DELIVERY_EN : FEED_DELIVERY;
}

export function feedDelivery(method: DeliveryMethod, locale: Locale = "vi"): FeedDelivery {
  const list = feedDeliveries(locale);
  return list.find((d) => d.method === method) ?? list[0]!;
}

/** "29/09 - 01/10", or "28/09" for a one-day service: the window counted from `fromIso`; in English "29 Sep - 1 Oct". */
export function feedDeliveryWindow(method: DeliveryMethod, fromIso: string, locale: Locale = "vi"): string {
  const w = deliveryWindow(method, fromIso);
  return feedDayRange(w.fromIso, w.toIso, locale);
}

/** The card's second line: "2-4 ngày · dự kiến 29/09 - 01/10"; in English "2-4 days · expected 29 Sep - 1 Oct". */
export function deliverySub(method: DeliveryMethod, fromIso: string, locale: Locale = "vi"): string {
  const days = feedDelivery(method, locale).days;
  const window = feedDeliveryWindow(method, fromIso, locale);
  return picker(locale)({ vi: `${days} · dự kiến ${window}`, en: `${days} · expected ${window}` });
}

/** Express, once a province it does not reach is chosen. The province keeps its Vietnamese name. */
export function expressOffNote(provinceName: string, locale: Locale = "vi"): string {
  return picker(locale)({ vi: `Không giao nhanh tới ${provinceName}`, en: `No express delivery to ${provinceName}` });
}

/**
 * The toast when a new province ends express: it moved to the standard service
 * by itself. The Vietnamese names the province it is handed; the English says
 * "HCMC" (`EXPRESS_CITY_EN`), as every English sentence about where express
 * runs does.
 */
export function expressSwitchNote(expressProvinceName: string, locale: Locale = "vi"): string {
  return picker(locale)({
    vi: `Giao nhanh chỉ trong ${expressProvinceName}, đã chuyển sang giao tiêu chuẩn`,
    en: `Express only runs in ${EXPRESS_CITY_EN}, so delivery is now standard`,
  });
}

// ─────────────────────────────────────────────────────────── payment

/** One way to pay as the mock's selection card prints it: the title, the consequence, a surcharge. */
export interface FeedPayment {
  method: PaymentMethod;
  title: string;
  note: string;
  /**
   * A third line, the card's alone (slice B18): Stripe's test card number, as
   * the sign-in screen prints the demo accounts. Absent on the other two.
   */
  hint?: string;
  /** "+15.000₫" on COD, nothing otherwise. */
  price: string | null;
}

/**
 * Stripe's test Visa card, "4242 4242 4242 4242"
 * (https://docs.stripe.com/testing), its four groups held together by no-break
 * spaces so the number never breaks across two lines.
 */
export const STRIPE_TEST_CARD = ["4242", "4242", "4242", "4242"].join(" ");

/**
 * The three ways, in the mock's order. A card pays on Stripe's page, in test
 * mode, since slice B18 (QĐ-46): its three lines are the user's words
 * (07/10/2026) — what it takes, where and in which mode it is paid, and the
 * test card to pay with, as the sign-in screen prints the demo accounts (the
 * same exception). The transfer card above it states the hold, which a card
 * order keeps too. "nhận (COD)" holds together, as at v3 slice 13.
 */
export const FEED_PAYMENTS: readonly FeedPayment[] = [
  {
    method: "BANK_TRANSFER",
    title: "Chuyển khoản",
    note: `Giữ hàng ${TRANSFER_HOLD_HOURS} giờ kể từ khi đặt. Nội dung chuyển khoản hiện ở màn xác nhận.`,
    price: null,
  },
  { method: "COD", title: "Thanh toán khi nhận (COD)", note: "Kiểm hàng trước khi trả.", price: `+${vnd(COD_SURCHARGE_VND)}` },
  {
    method: "CARD",
    title: "Thẻ (Visa, Mastercard)",
    note: "Trả trên trang Stripe, chế độ thử.",
    hint: `Thẻ thử ${STRIPE_TEST_CARD}, hạn và CVC bất kỳ.`,
    price: null,
  },
];

/**
 * The three ways in English (round v6 slice E2), by the glossary: "Bank
 * transfer", "Card", and on the checkout "Cash on delivery (COD)" in full,
 * "(COD)" held to the word before it by a no-break space as the Vietnamese
 * title holds it. The card's three lines are the user's English (QĐ-46).
 */
const FEED_PAYMENTS_EN: readonly FeedPayment[] = [
  {
    method: "BANK_TRANSFER",
    title: "Bank transfer",
    note: `Reserved for ${TRANSFER_HOLD_HOURS} hours. Transfer details are on the next screen.`,
    price: null,
  },
  {
    method: "COD",
    title: "Cash on delivery (COD)",
    note: "Check before you pay.",
    price: `+${vnd(COD_SURCHARGE_VND, "en")}`,
  },
  {
    method: "CARD",
    title: "Card (Visa, Mastercard)",
    note: "Pay on Stripe's page, test mode.",
    hint: `Test card ${STRIPE_TEST_CARD}, any expiry and CVC.`,
    price: null,
  },
];

/** The payment cards in one language; `FEED_PAYMENTS` is the Vietnamese side. */
export function feedPayments(locale: Locale = "vi"): readonly FeedPayment[] {
  return locale === "en" ? FEED_PAYMENTS_EN : FEED_PAYMENTS;
}

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
 *
 * In both languages since round v6 slice E2; the phone's two sentences are the
 * lookup's (`LOOKUP_TEXT`), as in Vietnamese.
 */
export function feedFormErrors(c: FeedContact, locale: Locale = "vi"): Partial<Record<FeedField, string>> {
  const t = picker(locale);
  const e: Partial<Record<FeedField, string>> = {};
  if (c.name.trim().length < 2) e.name = t({ vi: "Nhập họ và tên", en: "Enter your full name" });
  const phone = c.phone.trim();
  if (!phone) e.phone = t({ vi: "Nhập số điện thoại", en: "Enter a phone number" });
  else if (!phoneDigits(phone)) {
    e.phone = t({ vi: "Số điện thoại gồm 10 số, bắt đầu bằng 0", en: "Phone numbers have 10 digits, starting with 0" });
  }
  const email = c.email.trim();
  if (email && !looksLikeEmail(email)) e.email = t({ vi: "Email chưa đúng", en: "This email isn't valid" });
  if (!c.provinceCode) e.province = t({ vi: "Chọn tỉnh / thành", en: "Choose province / city" });
  else if (!c.wardCode) e.ward = t({ vi: "Chọn phường / xã", en: "Choose ward / commune" });
  if (!c.street.trim()) e.street = t({ vi: "Nhập số nhà, đường", en: "Enter house number and street" });
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
 * In both languages since round v6 slice E2.
 */
export function feedPromoCheck(
  catalog: Catalog,
  raw: string,
  subtotalVnd: number,
  now: Date = demoNow(),
  locale: Locale = "vi",
): FeedPromoCheck {
  const say = picker(locale);
  const check = checkPromoCode(catalog, raw, subtotalVnd, now, locale);
  if (check.ok) return check;
  const code = normalisePromoCode(raw);
  if (!code) return { ok: false, message: say({ vi: "Nhập mã giảm giá", en: "Enter a discount code" }) };
  const promo = catalog.promoByCode.get(code as never);
  if (!promo) return { ok: false, message: say({ vi: "Mã không tồn tại", en: "This code doesn't exist" }) };
  const t = now.getTime();
  if (t < Date.parse(promo.startsAt)) {
    return { ok: false, message: say({ vi: "Mã chưa tới ngày dùng được", en: "This code isn't active yet" }) };
  }
  if (t >= Date.parse(promo.endsAt)) return { ok: false, message: say({ vi: "Mã đã hết hạn", en: "This code has expired" }) };
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return { ok: false, message: say({ vi: "Mã đã hết lượt dùng", en: "This code has been used up" }) };
  }
  if (promo.paused) return { ok: false, message: say({ vi: "Mã đang tạm dừng", en: "This code is paused" }) };
  if (promo.minOrderVnd !== undefined && subtotalVnd < promo.minOrderVnd) {
    return {
      ok: false,
      message: say({
        vi: `Đơn từ ${vnd(promo.minOrderVnd)} mới dùng được mã này`,
        en: `This code needs an order from ${vnd(promo.minOrderVnd, "en")}`,
      }),
    };
  }
  return { ok: false, message: check.message };
}

// ─────────────────────────────────────────────────────────── the money

export interface FeedRow {
  label: string;
  value: string;
  /** `"vi"` on an English page when the value stays Vietnamese — a recipient, an address (QĐ-40); absent otherwise. */
  lang?: "vi";
}

/**
 * The summary's lines above "Tổng" (`checkout.js`: `paintAll`): the goods,
 * the delivery ("Miễn phí" when nothing), the COD surcharge when paying so,
 * and the code — what it takes off, or "Miễn phí giao" for a free-delivery
 * code on a basket that already travels free. In English (round v6 slice E2)
 * "Subtotal", "Delivery", "COD surcharge", "Code DOT05".
 */
export function checkoutRows(t: CheckoutTotals, promoCode: string | null, locale: Locale = "vi"): FeedRow[] {
  const say = picker(locale);
  const rows: FeedRow[] = [
    { label: say({ vi: "Tạm tính", en: "Subtotal" }), value: vnd(t.subtotalVnd, locale) },
    {
      label: say({ vi: "Giao hàng", en: "Delivery" }),
      value: t.shippingFeeVnd ? vnd(t.shippingFeeVnd, locale) : say({ vi: "Miễn phí", en: "Free" }),
    },
  ];
  if (t.codFeeVnd) rows.push({ label: say({ vi: "Phụ phí COD", en: "COD surcharge" }), value: `+${vnd(t.codFeeVnd, locale)}` });
  if (promoCode) {
    rows.push({
      label: say({ vi: `Mã ${promoCode}`, en: `Code ${promoCode}` }),
      value: t.discountVnd ? `-${vnd(t.discountVnd, locale)}` : say({ vi: "Miễn phí giao", en: "Free delivery" }),
    });
  }
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
