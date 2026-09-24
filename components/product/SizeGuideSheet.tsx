"use client";

import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/icon/Icon";
import { heightLabel, sizeChart } from "@/data/size-chart";
import type { Product, Size } from "@/data/types";
import { styleName } from "@/lib/lexicon";

interface SizeGuideSheetProps {
  product: Product;
  /** The row to highlight — the size being chosen on the page behind. */
  size: Size | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Garment measurements, in centimetres, per size.
 *
 * The numbers are SIMULATED and the note under the table says so in as many
 * words. PRODUCT.md records that nothing here has been measured; the user
 * settled on 22/09/2026 that the chart ships with simulated figures under a
 * visible label rather than being left out, because the layout has to be
 * judged now and a real spec sheet drops into it without moving a row. They
 * live in `data/size-chart.ts`, beside the catalog, for the same reason.
 *
 * The row for the size currently chosen is filled, so the sheet answers the
 * question it was opened with — "is M going to fit" — rather than handing
 * over a table to search.
 */
export function SizeGuideSheet({ product, size, open, onClose }: SizeGuideSheetProps) {
  const rows = sizeChart(product.fit);
  const fitWord = product.fit === "OVERSIZE" ? "oversize" : "regular";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={`Bảng số đo — ${styleName(product.name, product.dropNo)}`}
    >
      <div className="grab" />

      <div className="fhead">
        <div>
          <h2>Bảng số đo · form {fitWord}</h2>
          <div className="muted">Đo phẳng, đơn vị cm, sai số ±1 cm.</div>
        </div>
        <button type="button" className="x" aria-label="Đóng" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>

      <table className="fit">
        <thead>
          <tr>
            <th>Size</th>
            <th>Ngang ngực</th>
            <th>Dài áo</th>
            <th>Ngang vai</th>
            <th>Hợp chiều cao</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.size} className={r.size === size ? "on" : undefined}>
              <td>{r.size}</td>
              <td>{r.chestFlat}</td>
              <td>{r.length}</td>
              <td>{r.shoulder}</td>
              <td className="nw">{heightLabel(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="note3" style={{ marginTop: 12 }}>
        <Icon name="info" className="ic sm" />
        <span>
          <b>Số đo mô phỏng.</b> Thay bằng số đo thật của xưởng khi có, bố cục không
          đổi. Dòng được tô là size đang chọn.
        </span>
      </p>

      <div className="sact">
        <button type="button" className="btn" onClick={onClose}>
          <Icon name="confirm" className="ic sm" />
          Đóng
        </button>
      </div>
    </Sheet>
  );
}
