"use client";

import { useEffect, useState } from "react";
import { AdminSheet } from "@/components/admin/AdminSheet";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon } from "@/components/icon/Icon";
import { Select } from "@/components/ui/Select";
import { COLORS } from "@/data/colors";
import { SIZES, type ColorKey, type Product, type Size } from "@/data/types";
import { MAX_RESTOCK_PER_CELL } from "@/lib/catalog-admin";
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
  type InventoryCell,
  type StockDraft,
} from "@/lib/inventory-adjust";
import { onHand, onHandByColor, onHandOf } from "@/lib/inventory";
import { styleName } from "@/lib/lexicon";
import {
  addOf,
  colorAdds,
  isThin,
  readAdd,
  restockButton,
  restockCells,
  restockTotal,
  withAdd,
  type RestockCell,
  type RestockDraft,
} from "@/lib/restock";

const REASON_OPTIONS = ADJUST_REASONS.map((r) => ({ value: r, label: r }));

interface SheetBase {
  /** The style, or null when the sheet is shut. */
  product: Product | null;
  /** The save is on its way to the server. */
  pending?: boolean;
  onClose: () => void;
}

/** "Điều chỉnh tồn kho": the shelf's new numbers, with a reason. */
interface AdjustProps extends SheetBase {
  mode?: "adjust";
  onSave: (cells: InventoryCell[], reason: string, ref: string, note: string) => void;
  /** Called when a raise is refused, so the screen can say why in a toast. */
  onBlocked: (message: string) => void;
}

/** "Nhập thêm" (v3 slice 12): pieces added to a fixed style's shelf. */
interface RestockProps extends SheetBase {
  mode: "restock";
  onRestock: (cells: RestockCell[], note: string) => void;
}

/**
 * The stock sheet — the shelf, size by colour — in two modes.
 *
 * "Điều chỉnh tồn kho" corrects the shelf with a reason; "Nhập thêm" (v3
 * slice 12, from the ⋯ menu of a fixed style) brings pieces back onto it.
 * One sheet, one grid, one look: the second mode is this component, not a
 * sheet of its own (the slice's brief). Every rule of each mode is pure and
 * tested without a DOM — `lib/inventory-adjust.ts` for the first,
 * `lib/restock.ts` for the second — and this is their shell.
 *
 * The grid is COLOUR × SIZE because that is the shape the catalogue really
 * stores (`Stock` in `data/types.ts`): a grid that could only say "hết XL"
 * would be unable to edit what the shop keeps, and the shopper's size sheet
 * already says "hết XL màu đen".
 *
 * The confirm is DISABLED and says the job that is left — "Chưa có thay
 * đổi", "Chọn lý do", "Nhập số cần thêm" — rather than being hidden or
 * silently doing nothing (DESIGN.md §9 rule 3). While the save is on its way
 * to the server it is disabled too and says so.
 */
export function InventoryAdjustSheet(props: AdjustProps | RestockProps) {
  return props.mode === "restock" ? <RestockSheet {...props} /> : <AdjustSheet {...props} />;
}

/**
 * "Điều chỉnh tồn kho" — the shelf's new number in each cell, and why.
 *
 * THE CUT IS THE CEILING of an issue's style, and the refusal lands on the
 * button that was pressed rather than on a save three fields away. An issue
 * is cut once and never restocked; if the shelf could hold more than was cut,
 * "108 / 181 đã bán" and the shopper's "còn 2" would both start lying. A
 * fixed style (slice B5) has no cut, so nothing caps its shelf.
 */
function AdjustSheet({ product, pending = false, onClose, onSave, onBlocked }: AdjustProps) {
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
  const delta = total - onHand(product);

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
    // A fixed style (slice B5) has no cut, so nothing caps its shelf.
    const cut = product.cutUnits;
    if (cut !== null && others + wanted > cut) {
      onBlocked(`Không vượt số đã cắt: ${cut}`);
      return setDraft((d) => withCell(d, color, size, cut - others));
    }
    setDraft((d) => withCell(d, color, size, wanted));
  }

  return (
    <AdminSheet
      open
      onClose={onClose}
      wide
      title={`Điều chỉnh tồn kho · ${styleName(product.name, product.dropNo)}`}
      sub={
        product.cutUnits === null ? (
          // A fixed style (slice B5): no cut, so neither "đã bán" nor the
          // ceiling is true of it.
          <>Số đang là số còn trên kệ. Chỉnh khi kiểm kê lệch, hàng trả về, hoặc hư hỏng.</>
        ) : (
          <>
            Số đang là số còn trên kệ; đã bán là số đã cắt trừ số này. Chỉnh khi kiểm kê lệch, hàng
            trả về, hoặc hư hỏng. Không phải cách để “may thêm”: tăng quá {product.cutUnits} chiếc đã
            cắt thì bị chặn.
          </>
        )
      }
      footer={
        <>
          <Button tone="ink sm" icon="back" disabled={pending} onClick={onClose}>
            Huỷ
          </Button>
          <Button
            tone="sm"
            {...(blocker || pending ? {} : { icon: "check" as const })}
            disabled={blocker !== null || pending}
            onClick={() => {
              if (blocker || !reason || pending) return;
              onSave(changed, reason, ref.trim(), note.trim());
            }}
          >
            {pending ? "Đang lưu…" : (blocker ?? "Lưu điều chỉnh")}
          </Button>
        </>
      }
    >
      <table className="invgrid">
        <GridHead />
        <tbody>
          {product.colors.map((color) => {
            const rowTotal = colorTotal(product, draft, color);
            const rowWas = onHandByColor(product, color);
            return (
              <tr key={color}>
                <ColorCell color={color} />
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
      <NoteField
        value={note}
        onChange={setNote}
        placeholder="VD: khách trả size L, còn nguyên tag"
      />
      <p className="fine3">
        Trên kệ sau khi lưu: <b>{total}</b>
        {product.cutUnits === null ? "" : ` / ${product.cutUnits} đã cắt`}
        {delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""} · {changed.length} ô đổi.
      </p>
    </AdminSheet>
  );
}

/**
 * "Nhập thêm" — pieces brought back onto a FIXED style's shelf (v3 slice 12).
 *
 * The same grid, and each cell says two things: what is on the shelf now —
 * in red at two or fewer, the line the table flags — and a box for how many
 * to ADD, 0 to 999, starting at 0. No reason to choose: the reason is the
 * mode ("Nhập thêm", `admin_adjust_stock()`, slice B5). The note is optional,
 * as in the adjustment. The confirm counts the pieces: "Nhập thêm 14 chiếc".
 * No total line under the note, unlike the adjustment: the confirm and the
 * "Cộng" column already say what is added, and the user wants no count said
 * twice (slice 12 fix).
 *
 * The shelf numbers are the catalogue's, read when the sheet opens: the
 * table hands this sheet its style from the catalogue by id, so when a save
 * comes back `STALE` and the table refreshes the page, the grid shows the
 * shelf as it now is — and the pieces typed stay, added to that.
 */
function RestockSheet({ product, pending = false, onClose, onRestock }: RestockProps) {
  const [draft, setDraft] = useState<RestockDraft>({});
  const [note, setNote] = useState("");

  // Emptied whenever the sheet shuts or opens on another style, so it always
  // opens empty; the same style's numbers read again (a refresh after
  // `STALE`) do not throw away what was typed.
  const openFor = product?.id ?? null;
  useEffect(() => {
    setDraft({});
    setNote("");
  }, [openFor]);

  if (!product) {
    return <AdminSheet open={false} onClose={onClose} title="" footer={null} />;
  }

  const cells = restockCells(product, draft);
  const total = restockTotal(product, draft);
  const button = restockButton(total);

  const set = (color: ColorKey, size: Size, value: number) =>
    setDraft((d) => withAdd(d, color, size, value));

  return (
    <AdminSheet
      open
      onClose={onClose}
      wide
      title={`Nhập thêm · ${styleName(product.name, product.dropNo)}`}
      footer={
        <>
          <Button tone="ink sm" icon="back" disabled={pending} onClick={onClose}>
            Huỷ
          </Button>
          <Button
            tone="sm"
            {...(button.ready && !pending ? { icon: "box" as const } : {})}
            disabled={!button.ready || pending}
            onClick={() => {
              if (!button.ready || pending) return;
              onRestock(cells, note.trim());
            }}
          >
            {pending ? "Đang lưu…" : button.label}
          </Button>
        </>
      }
    >
      <table className="invgrid">
        <GridHead />
        <tbody>
          {product.colors.map((color) => {
            const label = COLORS[color].label;
            const rowWas = onHandByColor(product, color);
            const rowAdds = colorAdds(product, draft, color);
            return (
              <tr key={color}>
                <ColorCell color={color} />
                {SIZES.map((size) => {
                  const left = onHandOf(product, color, size);
                  const add = addOf(draft, color, size);
                  return (
                    <td key={size}>
                      <span className={isThin(left) ? "onhand hot" : "onhand"}>còn {left}</span>
                      <span className={add > 0 ? "cell changed" : "cell"}>
                        <button
                          type="button"
                          aria-label={`Bớt ${label} ${size}`}
                          disabled={add === 0}
                          onClick={() => set(color, size, add - 1)}
                        >
                          <Icon name="minus" />
                        </button>
                        <input
                          inputMode="numeric"
                          aria-label={`Nhập thêm ${label} ${size}, đang còn ${left}`}
                          value={add}
                          onChange={(e) => set(color, size, readAdd(e.target.value))}
                        />
                        <button
                          type="button"
                          aria-label={`Thêm ${label} ${size}`}
                          disabled={add >= MAX_RESTOCK_PER_CELL}
                          onClick={() => set(color, size, add + 1)}
                        >
                          <Icon name="plus" />
                        </button>
                      </span>
                    </td>
                  );
                })}
                <td>
                  <b>{rowWas + rowAdds}</b> {rowAdds > 0 && <span className="delta">(+{rowAdds})</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <NoteField value={note} onChange={setNote} placeholder="VD: về lại size M" />
    </AdminSheet>
  );
}

function GridHead() {
  return (
    <thead>
      <tr>
        <th>Màu</th>
        {SIZES.map((s) => (
          <th key={s}>{s}</th>
        ))}
        <th>Cộng</th>
      </tr>
    </thead>
  );
}

function ColorCell({ color }: { color: ColorKey }) {
  return (
    <td>
      <i className="swatch" style={{ background: COLORS[color].hex }} aria-hidden="true" />
      {COLORS[color].label}
    </td>
  );
}

function NoteField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Field3 label={<>Ghi chú <span className="opt">· không bắt buộc</span></>}>
      {({ id }) => (
        <input
          id={id}
          className="inp"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field3>
  );
}
