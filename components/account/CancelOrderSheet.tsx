"use client";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { countWord } from "@/lib/money";

function capitalise(s: string): string {
  return s.charAt(0).toLocaleUpperCase("vi") + s.slice(1);
}

/**
 * "Huỷ đơn này?" — the one irreversible thing a shopper can do here.
 *
 * A sheet rather than a `confirm()`: there is no native dialog anywhere in
 * this app (DESIGN.md §6), and this one has to say what cancelling DOES —
 * the pieces go back on the shelf immediately, and nothing undoes it.
 *
 * The two buttons are not a matched pair on purpose. Keeping the order is
 * the quiet way out and carries the ink outline; cancelling is the honey
 * button, because it is what this sheet was opened to do. Both say what they
 * do rather than "Có" and "Không".
 */
export function CancelOrderSheet({
  code,
  units,
  open,
  onClose,
  onConfirm,
}: {
  code: string;
  units: number;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label={`Huỷ đơn ${code}`}>
      <div className="grab" />
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "var(--fw-display)",
          fontSize: "var(--fs-h2)",
          letterSpacing: "var(--ls-display)",
        }}
      >
        Huỷ đơn {code}?
      </h2>
      {/* `countWord` writes the number as a word mid-sentence ("hai chiếc"),
          and this is the start of one. */}
      <p className="fine3">{capitalise(countWord(units))} chiếc về kệ ngay. Không hoàn tác.</p>
      <div className="acts3">
        <Button tone="ink wide" icon="back" onClick={onClose}>
          Giữ đơn
        </Button>
        <Button tone="wide" icon="trash" onClick={onConfirm}>
          Huỷ đơn
        </Button>
      </div>
    </Sheet>
  );
}
