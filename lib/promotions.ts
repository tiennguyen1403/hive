import { PROMOTIONS, promoByCode } from "@/data/promotions";
import type { Promotion } from "@/data/types";
import { dayMonth } from "./datetime";
import { vnd } from "./money";
import { promoDiscountVnd } from "./orders";
import { demoNow } from "./clock";

/**
 * Discount codes, as rules rather than as a text field.
 *
 * Every code here is a real row of `data/promotions.ts`: its window, its
 * usage cap and its minimum order are the ones the admin screen shows. A
 * code that cannot be used is REFUSED WITH THE REASON, because "mã không
 * hợp lệ" leaves the shopper retyping a code that was never going to work.
 *
 * The code itself travels with the cart (`CART_PROMO_STORAGE_KEY`) rather
 * than in the URL: it is applied on the cart screen and has to survive both
 * the walk to checkout and a reload. Only the code is stored — the rule is
 * looked up again on every render, so a promotion that expires between two
 * page loads stops applying instead of being remembered as a discount.
 */

export const CART_PROMO_STORAGE_KEY = "brand.promo";
const SCHEMA_VERSION = 1;

export type PromoCheck =
  | { ok: true; promo: Promotion }
  /** Shown under the field, in the error tone, naming the problem. */
  | { ok: false; message: string };

/**
 * Judge a typed code against the fixtures and the basket in front of it.
 *
 * Four different refusals, because the shopper's next move differs each
 * time: retype it, use another code, come back with a bigger basket, or
 * give up on this one.
 */
export function checkPromoCode(
  raw: string,
  subtotalVnd: number,
  now: Date = demoNow(),
): PromoCheck {
  const code = normalisePromoCode(raw);
  if (!code) return { ok: false, message: "Nhập mã giảm giá trước khi áp dụng." };

  const promo = promoByCode.get(code as never);
  if (!promo) return { ok: false, message: `Không có mã ${code}.` };

  const t = now.getTime();
  if (t < Date.parse(promo.startsAt)) {
    return { ok: false, message: `Mã ${code} chưa tới ngày dùng được.` };
  }
  if (t >= Date.parse(promo.endsAt)) {
    return { ok: false, message: `Mã ${code} đã hết hạn.` };
  }
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return { ok: false, message: `Mã ${code} đã hết lượt dùng.` };
  }
  if (promo.minOrderVnd !== undefined && subtotalVnd < promo.minOrderVnd) {
    return { ok: false, message: `Mã ${code} cần đơn từ ${vnd(promo.minOrderVnd)}.` };
  }

  return { ok: true, promo };
}

/** Upper case, no spaces — codes are printed that way and typed every way. */
export function normalisePromoCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

// ───────────────────────────────────────── the codes worth printing today
/**
 * Every code a shopper could actually use right now.
 *
 * Inside its window AND with uses left. Deliberately NOT filtered by a
 * basket: the account screen lists codes before there is a basket, and the
 * minimum order is printed beside each one instead of being used to hide it.
 * `checkPromoCode` applies the same two rules plus that minimum, so nothing
 * listed here can be refused for a reason this list could have seen.
 *
 * An expired code and an exhausted one are both simply absent. The admin
 * table is where those two states have to be told apart (`promoState` in
 * `admin-rows.ts`); to a shopper they are the same non-event.
 */
export function livePromotions(now: Date = demoNow()): Promotion[] {
  const t = now.getTime();
  return PROMOTIONS.filter(
    (p) =>
      t >= Date.parse(p.startsAt) &&
      t < Date.parse(p.endsAt) &&
      (p.usageLimit === null || p.usedCount < p.usageLimit),
  );
}

/**
 * What the code takes off, as a sentence — "Giảm 10%, tối đa 150.000₫".
 *
 * Shopper-facing, and therefore not `promoValueLabel` from `admin-rows.ts`:
 * that one is a table cell ("10% · tối đa 150.000₫") written for somebody
 * scanning a column of them.
 */
export function promoOfferLabel(p: Promotion): string {
  if (p.kind === "PERCENT") {
    return p.maxDiscountVnd
      ? `Giảm ${p.percent}%, tối đa ${vnd(p.maxDiscountVnd)}`
      : `Giảm ${p.percent}%`;
  }
  if (p.kind === "AMOUNT") return `Giảm ${vnd(p.amountVnd)}`;
  return "Miễn phí giao tiêu chuẩn";
}

/**
 * The conditions, in the order somebody checks them: can I use it on this
 * basket, and is there any left.
 */
export function promoTermsLabel(p: Promotion): string {
  const parts: string[] = [];
  if (p.minOrderVnd !== undefined) parts.push(`Đơn từ ${vnd(p.minOrderVnd)}`);
  parts.push(
    p.usageLimit === null
      ? "không giới hạn lượt"
      : `còn ${p.usageLimit - p.usedCount} lượt`,
  );
  return parts.join(" · ");
}

/**
 * "tới 25/09" — how long the listed codes last.
 *
 * The LAST day any of them is still good, read off the codes themselves
 * rather than off the drop: a promotion's window is its own field and the
 * two are free to differ.
 *
 * The winning promotion's OWN string is what gets formatted. Going back
 * through `Date` would hand `dayMonth` a UTC timestamp, and everything this
 * app prints is the +07:00 wall clock — an evening deadline would come out
 * a day early (`datetime.ts` says why it reads the text and not the clock).
 */
export function promoWindowLabel(list: Promotion[]): string {
  const last = list.reduce<Promotion | undefined>(
    (best, p) => (!best || Date.parse(p.endsAt) > Date.parse(best.endsAt) ? p : best),
    undefined,
  );
  return last ? `tới ${dayMonth(last.endsAt)}` : "";
}

/**
 * The promotion a stored code still stands for, or nothing.
 *
 * Re-checked rather than trusted: the code was written down when the basket
 * held something else, and both the basket and the calendar move.
 */
export function appliedPromo(
  code: string | null,
  subtotalVnd: number,
  now: Date = demoNow(),
): Promotion | undefined {
  if (!code) return undefined;
  const check = checkPromoCode(code, subtotalVnd, now);
  return check.ok ? check.promo : undefined;
}

/**
 * "Mã CHAOBAN đã áp dụng · −50.000₫" — the toast, with the amount this
 * basket actually gets rather than the headline on the code.
 *
 * Free shipping is quoted as the fee it removes, which is why the shipping
 * charge has to be passed in: on an order already over the free-delivery
 * line, FREESHIP is worth nothing and says so.
 */
export function promoAppliedMessage(
  promo: Promotion,
  subtotalVnd: number,
  shippingFeeVnd: number,
): string {
  const off = promoDiscountVnd(promo, subtotalVnd, shippingFeeVnd);
  return off > 0
    ? `Mã ${promo.code} đã áp dụng · −${vnd(off)}`
    : `Mã ${promo.code} đã áp dụng · đơn này không giảm thêm`;
}

// ─────────────────────────────────────────────────────────────── persistence
export function serializePromoCode(code: string | null): string {
  return JSON.stringify({ v: SCHEMA_VERSION, code });
}

/**
 * Read the stored code back. Never throws and never returns junk: whatever
 * is in storage came from another tab, an older build, or devtools.
 */
export function parsePromoCode(raw: string | null): string | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    (parsed as { v?: unknown }).v !== SCHEMA_VERSION
  ) {
    return null;
  }

  const code = (parsed as { code?: unknown }).code;
  if (typeof code !== "string") return null;
  return normalisePromoCode(code) || null;
}
