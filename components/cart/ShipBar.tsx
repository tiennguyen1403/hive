import { vnd } from "@/lib/money";
import {
  EXPRESS_FEE_VND,
  FREE_SHIPPING_FROM_VND,
  deliveryOption,
} from "@/lib/shipping";

/**
 * How far this basket is from free delivery, in đồng and as a length.
 *
 * The threshold is `lib/shipping.ts`'s and is promised on the product page
 * already; the only new thing here is the subtraction. Saying "mua thêm
 * 610.000₫" rather than "đơn từ 1.000.000₫" is the difference between a
 * policy and an instruction — and the bar is a second reading of the same
 * number, never the only place it exists.
 *
 * Once the basket is over the line the bar does not congratulate anybody: it
 * states the rule it just applied, and then the ONE thing that rule does not
 * cover. Express is a same-city courier run and is charged whatever the
 * basket is worth — better said here than discovered at the delivery step.
 *
 * `aria-hidden` on the bar: the sentence above it says both figures, and a
 * meter that announces itself is the same fact read twice.
 */
export function ShipBar({ subtotalVnd }: { subtotalVnd: number }) {
  const gapVnd = FREE_SHIPPING_FROM_VND - subtotalVnd;
  const reached = gapVnd <= 0;
  const pct = Math.max(
    0,
    Math.min(100, Math.round((subtotalVnd / FREE_SHIPPING_FROM_VND) * 100)),
  );
  // "chỉ nội thành TP. Hồ Chí Minh" is the courier's own note in
  // `DELIVERY_OPTIONS`; here it is the subject of a sentence rather than a
  // condition on a row, so the "chỉ" comes off. Derived and not retyped:
  // the city belongs to the shipping module, not to this paragraph.
  const where = deliveryOption("EXPRESS").note.replace(/^chỉ\s+/, "");

  return (
    <div className={reached ? "shipbar3 ok" : "shipbar3"}>
      {reached ? (
        <>
          <b>Đơn từ {vnd(FREE_SHIPPING_FROM_VND)}: miễn phí giao tiêu chuẩn.</b> Giao
          nhanh {where} vẫn tính {vnd(EXPRESS_FEE_VND)}.
        </>
      ) : (
        <>
          Mua thêm <b>{vnd(gapVnd)}</b> nữa để được miễn phí giao (đơn từ{" "}
          {vnd(FREE_SHIPPING_FROM_VND)}).
        </>
      )}
      <div className="bar" aria-hidden="true">
        <i style={{ width: `${reached ? 100 : pct}%` }} />
      </div>
    </div>
  );
}
