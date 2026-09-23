import { Tick } from "@/components/icon/Icon";

/** Shown as-is. The buying flow has four stops and never more. */
export const STEP_LABELS = ["Giỏ", "Địa chỉ", "Thanh toán", "Xong"] as const;

/**
 * Where the shopper is in the buying flow — `.steps3` in the v3 mock.
 *
 * Four circles on one hairline. A step already behind is the issue's own
 * black with a honey tick in it; the one underway is honey with dark ink and
 * a label in 600; the ones ahead are an outline and quiet type. The rule
 * behind them runs from the first circle to the last rather than edge to
 * edge, so it joins the steps instead of underlining the row.
 *
 * The step underway shows its NUMBER, including the last one. "Xong" ticked
 * while the receipt is still being read would say the tick belongs to the
 * page, and the tick here means "behind you".
 *
 * The tick is `<Tick>`, whose viewBox is cropped to the ink. `<Icon
 * name="check">` in the same 28px circle renders a 6px speck.
 */
export function Steps({ at }: { at: number }) {
  const last = STEP_LABELS.length - 1;

  return (
    <div className="steps3">
      {STEP_LABELS.map((label, i) => {
        const state = i < at ? "done" : i === at ? "on" : "todo";
        return (
          <div className={`st ${state}`} key={label}>
            <b aria-hidden="true">{i < at ? <Tick /> : i + 1}</b>
            {label}
          </div>
        );
      })}
      {/* The bar is a picture for anyone who takes it in at a glance. For
          anyone who cannot, one sentence beats four ticks read aloud. */}
      <span className="sr-only">
        Bước {Math.min(at + 1, STEP_LABELS.length)} trên {STEP_LABELS.length}:{" "}
        {STEP_LABELS[Math.min(at, last)]}
      </span>
    </div>
  );
}
