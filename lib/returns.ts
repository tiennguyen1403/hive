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
