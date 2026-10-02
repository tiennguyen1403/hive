import { pick, type Locale, type Pair } from "./i18n";

/**
 * The return and exchange rules the user settled on 27/09/2026 (round 4 of
 * the Feed mock, `prototype/explore/feed/BRIEF.md`, "Settled by the user"),
 * as the mock's data layer states them (`prototype/explore/shared/data.js`:
 * `RETURN_REASONS`, `SHOP_FAULT`, `RETURNS`; `feed/return.js`:
 * `PHOTO_REASONS`). The window itself is `RETURN_WINDOW_DAYS` in
 * `lib/shipping.ts`, beside the other terms of an order.
 *
 * Hỏi đáp prints these (round v4 slice 4b, `lib/feed-help.ts`); the request
 * flow that will use them comes after a round of the back office's mock
 * (QĐ-34). They live here, as data, so the page that states a rule and the
 * flow that applies it read the same list.
 */

/** Why a piece goes back, in the order the mock offers them. */
export const RETURN_REASONS = ["Không vừa size", "Khác với ảnh", "Lỗi may hoặc in", "Giao nhầm món", "Đổi ý"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

/**
 * Each reason in both languages (round v6 slice E3b): the Vietnamese is the
 * reason itself, the value the request flow will store, so `RETURN_REASONS`
 * keeps it; the English is how a screen prints it, the way a return form
 * offers a choice. "Đổi ý" is "Change of mind", as the shopper's cancel
 * reason "Khách đổi ý" reads in English (`lib/feed-account.ts`).
 */
const RETURN_REASON_TEXT: Readonly<Record<ReturnReason, Pair>> = {
  "Không vừa size": { vi: "Không vừa size", en: "Doesn't fit" },
  "Khác với ảnh": { vi: "Khác với ảnh", en: "Not as pictured" },
  "Lỗi may hoặc in": { vi: "Lỗi may hoặc in", en: "Sewing or print fault" },
  "Giao nhầm món": { vi: "Giao nhầm món", en: "Wrong item sent" },
  "Đổi ý": { vi: "Đổi ý", en: "Change of mind" },
};

/** A reason as a screen prints it, in one language: in Vietnamese the reason as it is. */
export function returnReasonLabel(reason: ReturnReason, locale: Locale = "vi"): string {
  return pick(RETURN_REASON_TEXT[reason], locale);
}

/**
 * The reasons that are the shop's fault: a whole order sent back for one of
 * them gets its delivery and its COD fee back too; a partial return keeps
 * them, since the rest of the order used that delivery (the user, 27/09).
 */
export const SHOP_FAULT: readonly ReturnReason[] = ["Khác với ảnh", "Lỗi may hoặc in", "Giao nhầm món"];

/** The reasons a request has to show: at least one photo. */
export const PHOTO_REASONS: readonly ReturnReason[] = ["Lỗi may hoặc in", "Giao nhầm món"];

/**
 * How a return is settled (the user, 27/09): the shop pays the way back; the
 * refund is a transfer to the shopper's bank account; the shop answers within
 * one to three days. The mock answers by notification and email; the app has
 * no email (QĐ-35), so the answer comes in Thông báo alone.
 */
export const RETURNS = {
  shipBackBy: "shop",
  refundTo: "bank",
  answerDays: [1, 3],
  answerBy: ["inbox"],
} as const satisfies {
  shipBackBy: "shop" | "shopper";
  refundTo: "bank";
  answerDays: readonly [number, number];
  answerBy: readonly "inbox"[];
};
