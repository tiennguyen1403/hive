"use client";

import { ArrowLeft, Check, PackagePlus } from "lucide-react";
import { useId, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { COLORS, colorLabel } from "@/data/colors";
import { SIZES, type ColorKey, type Product, type Size } from "@/data/types";
import { stepCell, typeCell } from "@/lib/adjust-cell";
import { MAX_RESTOCK_PER_CELL } from "@/lib/catalog-admin";
import { picker, plural, type Locale } from "@/lib/i18n";
import { onHand, onHandByColor, onHandOf } from "@/lib/inventory";
import {
  ADJUST_REASONS,
  cellValue,
  changedCells,
  colorTotal,
  deltaLabel,
  draftOf,
  draftTotal,
  saveBlocker,
  stockReasonLabel,
  type InventoryCell,
  type StockDraft,
} from "@/lib/inventory-adjust";
import { styleName } from "@/lib/lexicon";
import { productText } from "@/lib/product-text";
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
import { Button } from "@/registry/components/button/button";
import { Drawer, DrawerContent } from "@/registry/components/drawer/drawer";
import { Input } from "@/registry/components/input/input";
import { Select } from "@/registry/components/select/select";
import { ArcCountField } from "./ArcCountField";
import promo from "./ArcPromoDrawer.module.css";
import styles from "./ArcStockDrawer.module.css";
import { keepOpenForToasts } from "./arc-toasts";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** The four reasons the sheet offers (`ADJUST_REASONS`), in v3's order. */
/**
 * The four reasons as the menu offers them: the value is the stored
 * Vietnamese whatever the page's language (the database checks it and the log
 * keeps it), the label is the page's (round v6 slice E5, `stockReasonLabel`).
 */
const reasonOptions = (locale: Locale) => ADJUST_REASONS.map((r) => ({ value: r, label: stockReasonLabel(r, locale) }));

/** "Điều chỉnh tồn kho · S05 – KHÓI": the style as the shop prints it in the page's language. */
const drawerName = (product: Product, locale: Locale) =>
  styleName(productText(product, locale).name, product.dropNo, locale);

/**
 * The shelf of one style, colour by size, in an Arc `Drawer` from the right,
 * 680px as the discount form (round v5 slice 5a). v3's `InventoryAdjustSheet`
 * (`components/admin/InventoryAdjustSheet.tsx`) in its two modes, rule for
 * rule and word for word, each mode its own drawer here:
 *
 *   · "Điều chỉnh tồn kho" corrects the shelf with a reason, on any style;
 *   · "Nhập thêm" brings pieces back onto a fixed style's shelf.
 *
 * Both are long forms beside the table (a grid, then fields), which is what
 * Arc gives a `drawer` (brief, §2). The grid is COLOUR × SIZE because that is
 * the shape the catalogue stores (`Stock` in `data/types.ts`). Every rule is
 * pure and tested in `lib/`: `lib/inventory-adjust.ts` and
 * `lib/adjust-cell.ts` for the first mode, `lib/restock.ts` for the second;
 * these drawers are their shell.
 *
 * The confirm is disabled, without an icon, and says the job that is left
 * ("Chưa có thay đổi", "Chọn lý do", "Nhập số cần thêm") rather than being
 * hidden (DESIGN.md §9 rule 3). While the save is on its way the drawer
 * cannot be closed and the confirm shows Arc's spinner with "Đang lưu…". A
 * refusal from the server is the screen's toast; the drawer stays open.
 */

interface DrawerBase {
  open: boolean;
  /** The save is on its way to the server. */
  pending: boolean;
  /** Which opening this is: the form starts again each time the drawer opens. */
  opening: number;
  onClose: () => void;
  /** Where focus goes when the drawer shuts: the row menu that opened it. */
  onCloseAutoFocus: (event: Event) => void;
}

/**
 * "Điều chỉnh tồn kho · S05 – KHÓI". THE CUT IS THE CEILING of an issue's
 * style, said once under the title ("Tăng quá 35 chiếc đã cắt thì bị chặn.")
 * and again, in a toast, at the cell that would pass it; a fixed style has no
 * cut and its drawer no line. The style is the one the row had when the
 * drawer opened, as in v3: a shelf moved elsewhere in the meantime is the
 * server's refusal to say.
 */
export function ArcAdjustDrawer({
  open,
  pending,
  opening,
  product,
  onClose,
  onCloseAutoFocus,
  onSave,
  onBlocked,
}: DrawerBase & {
  /** Kept while the drawer slides out, so its title does not change on the way. */
  product: Product | null;
  onSave: (cells: InventoryCell[], reason: string, ref: string, note: string) => void;
  /** A raise the cut refuses, for the screen to say in a toast. */
  onBlocked: (message: string) => void;
}) {
  const locale = useLocale();
  const t = picker(locale);
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DrawerContent
        onInteractOutside={keepOpenForToasts}
        onCloseAutoFocus={onCloseAutoFocus}
        className={promo.drawer}
        title={
          product
            ? t({
                vi: `Điều chỉnh tồn kho · ${styleName(product.name, product.dropNo)}`,
                en: `Adjust stock · ${drawerName(product, "en")}`,
              })
            : ""
        }
        // The ceiling is the one line left (v3 slice 13). A fixed style (slice
        // B5) has no cut and so no ceiling: its drawer has no line at all.
        description={
          product?.cutUnits != null
            ? t({
                vi: `Tăng quá ${product.cutUnits} chiếc đã cắt thì bị chặn.`,
                en: `Raising stock past the ${product.cutUnits} pieces cut is blocked.`,
              })
            : undefined
        }
      >
        {product && (
          <AdjustForm
            key={opening}
            product={product}
            pending={pending}
            onCancel={onClose}
            onSave={onSave}
            onBlocked={onBlocked}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** The grid, the three fields, the line of totals and the two buttons. Mounted each time the drawer opens. */
function AdjustForm({
  product,
  pending,
  onCancel,
  onSave,
  onBlocked,
}: {
  product: Product;
  pending: boolean;
  onCancel: () => void;
  onSave: (cells: InventoryCell[], reason: string, ref: string, note: string) => void;
  onBlocked: (message: string) => void;
}) {
  const id = useId();
  const locale = useLocale();
  const t = picker(locale);
  const [draft, setDraft] = useState<StockDraft>(() => draftOf(product));
  // The stored reason (Vietnamese), whatever the menu shows.
  const [reason, setReason] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");

  const changed = changedCells(product, draft);
  const blocker = saveBlocker(product, draft, reason, locale);
  const ready = blocker === null;
  const total = draftTotal(product, draft);
  const delta = total - onHand(product);

  /** A press or a typed number, through the cell's rule; a refusal is said in a toast. */
  function move(next: { draft: StockDraft; refused: string | null }) {
    if (next.refused) onBlocked(next.refused);
    setDraft(next.draft);
  }

  return (
    <div className={styles.form}>
      <table className={styles.grid}>
        <GridHead />
        <tbody>
          {product.colors.map((color) => {
            const label = colorLabel(color, locale);
            const rowTotal = colorTotal(product, draft, color);
            const rowWas = onHandByColor(product, color);
            return (
              <tr key={color}>
                <ColourCell color={color} />
                {SIZES.map((size) => {
                  const was = onHandOf(product, color, size);
                  const now = cellValue(draft, color, size);
                  const moved = now !== was;
                  const lineId = `${id}-${color}-${size}`;
                  return (
                    <td key={size}>
                      <span className={styles.cell}>
                        <ArcCountField
                          label={`${label} ${size}`}
                          decrementLabel={t({ vi: `Bớt ${label} ${size}`, en: `Decrease ${label} ${size}` })}
                          incrementLabel={t({ vi: `Thêm ${label} ${size}`, en: `Increase ${label} ${size}` })}
                          value={now}
                          changed={moved}
                          canDecrement={now > 0}
                          describedBy={moved ? lineId : undefined}
                          onStep={(by) => move(stepCell(product, draft, color, size, by, locale))}
                          onType={(raw) => move(typeCell(product, draft, color, size, raw, locale))}
                        />
                        {moved && (
                          <span id={lineId} className={styles.delta}>
                            {deltaLabel({ color, size, before: was, after: now }, reason, ref, locale)}
                          </span>
                        )}
                      </span>
                    </td>
                  );
                })}
                <SumCell total={rowTotal} change={rowTotal - rowWas} />
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.fields}>
        <Select
          label={t({ vi: "Lý do", en: "Reason" })}
          placeholder={t({ vi: "Chọn lý do", en: "Choose a reason" })}
          options={reasonOptions(locale)}
          value={reason ?? ""}
          onValueChange={setReason}
        />
        <Input
          label={t({ vi: "Tham chiếu · đơn, biên bản", en: "Reference · order, report" })}
          placeholder={t({ vi: "VD: DH-2419", en: "e.g. DH-2419" })}
          autoComplete="off"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
        />
        <div className={styles.wide}>
          <Input
            label={t({ vi: "Ghi chú · không bắt buộc", en: "Note · optional" })}
            placeholder={t({ vi: "VD: khách trả size L, còn nguyên tag", en: "e.g. customer returned an L, tags still on" })}
            autoComplete="off"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <p className={styles.total}>
        {t<React.ReactNode>({
          vi: (
            <>
              Trên kệ sau khi lưu: <b>{total}</b>
              {product.cutUnits === null ? "" : ` / ${product.cutUnits} đã cắt`}
              {delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""} · {changed.length} ô đổi.
            </>
          ),
          en: (
            <>
              On the shelf after saving: <b>{total}</b>
              {product.cutUnits === null ? "" : ` / ${product.cutUnits} cut`}
              {delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""} · {plural(changed.length, "cell", "cells")}{" "}
              changed.
            </>
          ),
        })}
      </p>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
          {pending ? null : <ArrowLeft {...ICON} />}
          {t({ vi: "Huỷ", en: "Cancel" })}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!ready}
          loading={pending}
          onClick={() => {
            if (!ready || !reason || pending) return;
            onSave(changed, reason, ref.trim(), note.trim());
          }}
        >
          {ready && !pending ? <Check {...ICON} /> : null}
          {pending ? t({ vi: "Đang lưu…", en: "Saving…" }) : (blocker ?? t({ vi: "Lưu điều chỉnh", en: "Save adjustment" }))}
        </Button>
      </div>
    </div>
  );
}

/**
 * "Nhập thêm · ÁO THUN TRƠN": pieces brought back onto a FIXED style's shelf
 * (v3 slice 12). Each cell says what is on the shelf now, in the danger colour
 * at two or fewer (the line the table flags), and holds how many to ADD, 0 to
 * 999, starting at 0. No reason to choose: the reason is the mode. No line of
 * totals: the confirm ("Nhập thêm 14 chiếc") and the "Cộng" column already
 * say what is added, and the user wants no count said twice.
 *
 * The style is read from the catalogue by id on every render, so when a save
 * comes back "stale" and the screen refreshes, the grid shows the shelf as it
 * now is, and the pieces typed stay, added to that.
 */
export function ArcRestockDrawer({
  open,
  pending,
  opening,
  product,
  onClose,
  onCloseAutoFocus,
  onRestock,
}: DrawerBase & {
  product: Product | null;
  onRestock: (cells: RestockCell[], note: string) => void;
}) {
  const locale = useLocale();
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DrawerContent
        onInteractOutside={keepOpenForToasts}
        onCloseAutoFocus={onCloseAutoFocus}
        className={promo.drawer}
        title={
          product
            ? picker(locale)({
                vi: `Nhập thêm · ${styleName(product.name, product.dropNo)}`,
                en: `Restock · ${drawerName(product, "en")}`,
              })
            : ""
        }
      >
        {product && (
          <RestockForm
            key={opening}
            product={product}
            pending={pending}
            onCancel={onClose}
            onRestock={onRestock}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** The grid, the note and the two buttons. Mounted each time the drawer opens, so it opens empty. */
function RestockForm({
  product,
  pending,
  onCancel,
  onRestock,
}: {
  product: Product;
  pending: boolean;
  onCancel: () => void;
  onRestock: (cells: RestockCell[], note: string) => void;
}) {
  const locale = useLocale();
  const t = picker(locale);
  const [draft, setDraft] = useState<RestockDraft>({});
  const [note, setNote] = useState("");

  const cells = restockCells(product, draft);
  const button = restockButton(restockTotal(product, draft), locale);

  const set = (color: ColorKey, size: Size, value: number) => setDraft((d) => withAdd(d, color, size, value));

  return (
    <div className={styles.form}>
      <table className={styles.grid}>
        <GridHead />
        <tbody>
          {product.colors.map((color) => {
            const label = colorLabel(color, locale);
            const rowWas = onHandByColor(product, color);
            const rowAdds = colorAdds(product, draft, color);
            return (
              <tr key={color}>
                <ColourCell color={color} />
                {SIZES.map((size) => {
                  const left = onHandOf(product, color, size);
                  const add = addOf(draft, color, size);
                  return (
                    <td key={size}>
                      <span className={styles.cell}>
                        <span className={styles.left} data-thin={isThin(left) ? "" : undefined}>
                          {t<React.ReactNode>({ vi: <>còn {left}</>, en: <>{left} left</> })}
                        </span>
                        <ArcCountField
                          label={t({
                            vi: `Nhập thêm ${label} ${size}, đang còn ${left}`,
                            en: `Restock ${label} ${size}, ${left} left now`,
                          })}
                          decrementLabel={t({ vi: `Bớt ${label} ${size}`, en: `Decrease ${label} ${size}` })}
                          incrementLabel={t({ vi: `Thêm ${label} ${size}`, en: `Increase ${label} ${size}` })}
                          value={add}
                          changed={add > 0}
                          canDecrement={add > 0}
                          canIncrement={add < MAX_RESTOCK_PER_CELL}
                          onStep={(by) => set(color, size, add + by)}
                          onType={(raw) => set(color, size, readAdd(raw))}
                        />
                      </span>
                    </td>
                  );
                })}
                <SumCell total={rowWas + rowAdds} change={rowAdds} />
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.fields}>
        <div className={styles.wide}>
          <Input
            label={t({ vi: "Ghi chú · không bắt buộc", en: "Note · optional" })}
            placeholder={t({ vi: "VD: về lại size M", en: "e.g. size M back in" })}
            autoComplete="off"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
          {pending ? null : <ArrowLeft {...ICON} />}
          {t({ vi: "Huỷ", en: "Cancel" })}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!button.ready}
          loading={pending}
          onClick={() => {
            if (!button.ready || pending) return;
            onRestock(cells, note.trim());
          }}
        >
          {button.ready && !pending ? <PackagePlus {...ICON} /> : null}
          {pending ? t({ vi: "Đang lưu…", en: "Saving…" }) : button.label}
        </Button>
      </div>
    </div>
  );
}

/** "Màu · S · M · L · XL · Cộng", the grid's columns. */
function GridHead() {
  const t = picker(useLocale());
  return (
    <thead>
      <tr>
        <th scope="col">{t({ vi: "Màu", en: "Colour" })}</th>
        {SIZES.map((s) => (
          <th key={s} scope="col">
            {s}
          </th>
        ))}
        <th scope="col">{t({ vi: "Cộng", en: "Total" })}</th>
      </tr>
    </thead>
  );
}

/**
 * The colour of a row: its swatch, 12px round, and its name. The swatch's
 * fill is the colour itself, a fact of the catalogue (`COLORS`), not a token;
 * a hairline keeps a pale one (Kem, Trắng) visible on the white drawer.
 */
function ColourCell({ color }: { color: ColorKey }) {
  const locale = useLocale();
  return (
    <th scope="row">
      <span className={styles.colour}>
        <span className={styles.swatch} style={{ background: COLORS[color].hex }} aria-hidden="true" />
        {colorLabel(color, locale)}
      </span>
    </th>
  );
}

/** "Cộng": the row's total at 500, and "(+N)" when the row moved. */
function SumCell({ total, change }: { total: number; change: number }) {
  return (
    <td className={styles.sum}>
      <b>{total}</b>
      {change !== 0 && <span className={styles.change}> ({change > 0 ? "+" : ""}{change})</span>}
    </td>
  );
}
