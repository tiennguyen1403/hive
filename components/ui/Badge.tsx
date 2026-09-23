/**
 * The tones a badge can carry, in the v3 family ("vải đen", chosen 22/09/2026
 * from three families on `prototype/v3/badges.html`).
 *
 * They are named for the STATE, not for the colour, because the colours moved
 * once already and will again:
 *
 * · `ok`    a live state — đang bán, đã thanh toán, đã xác nhận, đã giao.
 *           Black cloth with honey thread: the same material as the issue
 *           cover and the stamp in the nav, so the shop has one badge.
 * · `info`  something on its way — sắp mở, đang giao.
 * · `hot`   an alert worth a red — còn 2, hết lượt, sắp hết.
 * · `warn`  waiting on somebody — chờ chuyển khoản. Unbleached cloth.
 * · `shut`  over — đã đóng, đã huỷ, đã kết thúc. Unbleached cloth, quiet ink.
 * · `flat`  not a state at all: an identity label (a saved address's name,
 *           "lưu trên thiết bị này"). Pale honey, no dot.
 * · `""`    the neutral one, same cloth as `warn`.
 */
export type BadgeTone = "" | "ok" | "hot" | "warn" | "info" | "shut" | "flat";

/**
 * A status pill.
 *
 * The dot is not decoration: it is the second channel. Colour alone cannot
 * carry a state — PRODUCT.md's accessibility floor says so, and a red and a
 * green pill are the same pill to a good share of readers. The word inside
 * does the work; the dot and the tone reinforce it.
 *
 * Family B is a SOLID label with no border, 24px tall, 11px/700 upper case
 * tracked .08em. A badge is small; at that size a 1px border in the state
 * colour is the first thing to disappear on a photo or on black cloth, which
 * is what retired family A.
 */
export function Badge({
  children,
  tone = "",
  dot = true,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  return (
    <span className={["badge", tone].filter(Boolean).join(" ")}>
      {dot && <i />}
      {children}
    </span>
  );
}
