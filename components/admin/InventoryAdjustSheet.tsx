"use client";

import { useEffect, useState } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon } from "@/components/icon/Icon";
import { Select } from "@/components/ui/Select";
import { COLORS } from "@/data/catalog";
import { SIZES, type ColorKey, type Product, type Size } from "@/data/types";
import type { InventoryCell } from "@/lib/admin-sim";
import {
  ADJUST_REASONS,
  canRaise,
  cellValue,
  changedCells,
  colorTotal,
  deltaLabel,
  draftOf,
  draftTotal,
  saveBlocker,
  withCell,
  type StockDraft,
} from "@/lib/inventory-adjust";
import { onHandOf } from "@/lib/inventory";

const REASON_OPTIONS = ADJUST_REASONS.map((r) => ({ value: r, label: r }));

/**
 * "Điều chỉnh tồn kho" — the shelf, size by colour, with a reason.
 *
 * The grid is COLOUR × SIZE because that is the shape the catalogue really
 * stores (`Stock` in `data/types.ts`): a grid that could only say "hết XL"
 * would be unable to edit what the shop keeps, and the shopper's size sheet
 * already says "hết XL màu đen".
 *
 * THE CUT IS THE CEILING, and the refusal lands on the button that was
 * pressed rather than on a save three fields away. An issue is cut once and
 * never restocked; if the shelf could hold more than was cut, "108 / 181 đã
 * bán" and the shopper's "còn 2" would both start lying. Every rule here is
 * in `lib/inventory-adjust.ts` and tested without a DOM.
 *
 * The save button is DISABLED and says the job that is left — "Chưa có thay
 * đổi", "Chọn lý do" — rather than being hidden or silently doing nothing
 * (DESIGN.md §9 rule 3).
 */
export function InventoryAdjustSheet({
  product,
  onClose,
  onSave,
  onBlocked,
}: {
  /** The style being adjusted, or null when the sheet is shut. */
  product: Product | null;
  onClose: () => void;
  onSave: (cells: InventoryCell[], reason: string, ref: string, note: string) => void;
  /** Called when a raise is refused, so the screen can say why in a toast. */
  onBlocked: (message: string) => void;
}) {
  const [draft, setDraft] = useState<StockDraft>({});
  const [reason, setReason] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!product) return;
    setDraft(draftOf(product));
    setReason(null);
    setRef("");
    setNote("");
  }, [product]);

  if (!product) {
    return <AdminSheet open={false} onClose={onClose} title="" footer={null} />;
  }

  const changed = changedCells(product, draft);
  const blocker = saveBlocker(product, draft, reason);
  const total = draftTotal(product, draft);
  const delta = total - onHandTotal(product);

  function step(color: ColorKey, size: Size, by: number) {
    if (!product) return;
    if (by > 0 && !canRaise(product, draft)) {
      return onBlocked(`Không vượt số đã cắt: ${product.cutUnits}`);
    }
    setDraft((d) => withCell(d, color, size, cellValue(d, color, size) + by));
  }

  function type(color: ColorKey, size: Size, raw: string) {
    if (!product) return;
    const wanted = Math.max(0, Number(raw.replace(/\D/g, "")) || 0);
    const others = total - cellValue(draft, color, size);
    if (others + wanted > product.cutUnits) {
      onBlocked(`Không vượt số đã cắt: ${product.cutUnits}`);
      return setDraft((d) => withCell(d, color, size, product.cutUnits - others));
    }
    setDraft((d) => withCell(d, color, size, wanted));
  }

  return (
    <AdminSheet
      open
      onClose={onClose}
      wide
      title={`Điều chỉnh tồn kho · ${product.name}`}
      sub={
        <>
          Số đang là số còn trên kệ; đã bán là số đã cắt trừ số này. Chỉnh khi kiểm kê lệch, hàng
          trả về, hoặc hư hỏng. Không phải cách để “may thêm”: tăng quá {product.cutUnits} chiếc đã
          cắt thì bị chặn.
        </>
      }
      footer={
        <>
          <Button tone="ink sm" icon="back" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            tone="sm"
            {...(blocker ? {} : { icon: "check" as const })}
            disabled={blocker !== null}
            onClick={() => {
              if (blocker || !reason) return;
              onSave(changed, reason, ref.trim(), note.trim());
            }}
          >
            {blocker ?? "Lưu điều chỉnh"}
          </Button>
        </>
      }
    >
      <table className="invgrid">
        <thead>
          <tr>
            <th>Màu</th>
            {SIZES.map((s) => (
              <th key={s}>{s}</th>
            ))}
            <th>Cộng</th>
          </tr>
        </thead>
        <tbody>
          {product.colors.map((color) => {
            const rowTotal = colorTotal(product, draft, color);
            const rowWas = SIZES.reduce((n, s) => n + onHandOf(product, color, s), 0);
            return (
              <tr key={color}>
                <td>
                  <i
                    className="swatch"
                    style={{ background: COLORS[color].hex }}
                    aria-hidden="true"
                  />
                  {COLORS[color].label}
                </td>
                {SIZES.map((size) => {
                  const was = onHandOf(product, color, size);
                  const now = cellValue(draft, color, size);
                  const moved = now !== was;
                  return (
                    <td key={size}>
                      <span className={moved ? "cell changed" : "cell"}>
                        <button
                          type="button"
                          aria-label={`Bớt ${COLORS[color].label} ${size}`}
                          disabled={now === 0}
                          onClick={() => step(color, size, -1)}
                        >
                          <Icon name="minus" />
                        </button>
                        <input
                          inputMode="numeric"
                          aria-label={`${COLORS[color].label} ${size}`}
                          value={now}
                          onChange={(e) => type(color, size, e.target.value)}
                        />
                        <button
                          type="button"
                          aria-label={`Thêm ${COLORS[color].label} ${size}`}
                          onClick={() => step(color, size, 1)}
                        >
                          <Icon name="plus" />
                        </button>
                      </span>
                      {moved && (
                        <div className="delta">
                          {deltaLabel({ color, size, before: was, after: now }, reason, ref)}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td>
                  <b>{rowTotal}</b>{" "}
                  {rowTotal !== rowWas && (
                    <span className="delta">
                      ({rowTotal > rowWas ? "+" : ""}
                      {rowTotal - rowWas})
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="fgrid">
        <Field3 label="Lý do">
          {({ id }) => (
            <Select
              id={id}
              options={REASON_OPTIONS}
              value={reason}
              placeholder="Chọn lý do"
              onChange={setReason}
            />
          )}
        </Field3>
        <Field3 label={<>Tham chiếu <span className="opt">· đơn, biên bản</span></>}>
          {({ id }) => (
            <input
              id={id}
              className="inp"
              placeholder="VD: DH-2419"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
          )}
        </Field3>
      </div>
      <Field3 label={<>Ghi chú <span className="opt">· không bắt buộc</span></>}>
        {({ id }) => (
          <input
            id={id}
            className="inp"
            placeholder="VD: khách trả size L, còn nguyên tag"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field3>
      <p className="fine3">
        Trên kệ sau khi lưu: <b>{total}</b> / {product.cutUnits} đã cắt
        {delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""} · {changed.length} ô đổi.
      </p>
    </AdminSheet>
  );
}

function onHandTotal(p: Product): number {
  return p.colors.reduce(
    (n, c) => n + SIZES.reduce((m, s) => m + onHandOf(p, c, s), 0),
    0,
  );
}
