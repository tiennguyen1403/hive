import type { Catalog } from "./catalog";
import type { Promotion } from "@/data/types";
import { picker, type Locale } from "./i18n";
import { vnd } from "./money";
import { demoNow } from "./clock";

/**
 * Discount codes, as rules rather than as a text field.
 *
 * Every code here is a real row of the catalogue it is handed: its window, its
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
 * give up on this one. Since slice B3b a fifth: the shop PAUSED the code
 * (`Promotion.paused`) — its dates are fine and it may come back, so it is
 * neither "hết hạn" nor "hết lượt", and `place_order()` refuses it the same
 * way. The dates and the cap are read first, as in the back office's
 * `promoState`: a code that is over is over, paused or not.
 *
 * Its refusals in both languages since round v6 slice E2.
 */
export function checkPromoCode(
  catalog: Catalog,
  raw: string,
  subtotalVnd: number,
  now: Date = demoNow(),
  locale: Locale = "vi",
): PromoCheck {
  const say = picker(locale);
  const code = normalisePromoCode(raw);
  if (!code) {
    return { ok: false, message: say({ vi: "Nhập mã giảm giá trước khi áp dụng.", en: "Enter a discount code before applying it." }) };
  }

  const promo = catalog.promoByCode.get(code as never);
  if (!promo) return { ok: false, message: say({ vi: `Không có mã ${code}.`, en: `There is no code ${code}.` }) };

  const t = now.getTime();
  if (t < Date.parse(promo.startsAt)) {
    return { ok: false, message: say({ vi: `Mã ${code} chưa tới ngày dùng được.`, en: `Code ${code} isn't active yet.` }) };
  }
  if (t >= Date.parse(promo.endsAt)) {
    return { ok: false, message: say({ vi: `Mã ${code} đã hết hạn.`, en: `Code ${code} has expired.` }) };
  }
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return { ok: false, message: say({ vi: `Mã ${code} đã hết lượt dùng.`, en: `Code ${code} has been used up.` }) };
  }
  if (promo.paused) {
    return { ok: false, message: say({ vi: `Mã ${code} đang tạm dừng.`, en: `Code ${code} is paused.` }) };
  }
  if (promo.minOrderVnd !== undefined && subtotalVnd < promo.minOrderVnd) {
    return {
      ok: false,
      message: say({
        vi: `Mã ${code} cần đơn từ ${vnd(promo.minOrderVnd)}.`,
        en: `Code ${code} needs an order from ${vnd(promo.minOrderVnd, "en")}.`,
      }),
    };
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
 * An expired code, an exhausted one and one the shop has paused are all
 * simply absent. The admin table is where those states have to be told
 * apart (`promoState` in `admin-rows.ts`); to a shopper they are the same
 * non-event.
 */
export function livePromotions(catalog: Catalog, now: Date = demoNow()): Promotion[] {
  const t = now.getTime();
  return catalog.promotions.filter(
    (p) =>
      !p.paused &&
      t >= Date.parse(p.startsAt) &&
      t < Date.parse(p.endsAt) &&
      (p.usageLimit === null || p.usedCount < p.usageLimit),
  );
}

/**
 * The promotion a stored code still stands for, or nothing.
 *
 * Re-checked rather than trusted: the code was written down when the basket
 * held something else, and both the basket and the calendar move.
 */
export function appliedPromo(
  catalog: Catalog,
  code: string | null,
  subtotalVnd: number,
  now: Date = demoNow(),
): Promotion | undefined {
  if (!code) return undefined;
  const check = checkPromoCode(catalog, code, subtotalVnd, now);
  return check.ok ? check.promo : undefined;
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
