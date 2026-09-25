import { PAYMENT_LABEL } from "./order-labels";
import { clockLabel, dayMonthYear } from "./datetime";
import { totalRowLabel, type TrackedOrder } from "./lookup";
import { vnd } from "./money";
import { formatPhone } from "./phone";

/**
 * The printable bill of an order — every field derived, none typed.
 *
 * It exists as a module rather than as markup because a receipt is a set of
 * FACTS about one order, and the screen that prints it should not be the
 * place that decides what a line of it says. Assembling it here also makes
 * the one thing worth pinning testable: the money on paper is the money on
 * screen, down to the same `vnd` formatting.
 *
 * What it is NOT: a hoá đơn giá trị gia tăng. There is no legal name and no
 * tax number for this shop yet — the footer says so too — so the sheet says
 * what it is instead of dressing up as something it cannot be (DESIGN.md §9
 * rule 2).
 */

export interface InvoiceLine {
  /** Shown as-is. */
  name: string;
  /** "Áo thun oversize · Đen · M". */
  detail: string;
  qty: number;
  unitPriceVnd: number;
  lineTotalVnd: number;
}

export interface InvoiceRow {
  label: string;
  value: string;
}

export interface Invoice {
  /** The wordmark, the same one the nav and the footer carry — HIVE (QĐ-28). */
  brand: string;
  title: string;
  code: string;
  /** "20:30 · 16/09/2026" — with the year, because a bill is reopened later. */
  placedAtLabel: string;
  recipient: string;
  phoneLabel: string;
  addressLine: string;
  /** What was typed for the courier, or "" when nothing was. */
  note: string;
  lines: InvoiceLine[];
  units: number;
  /** Subtotal, delivery, handling and discount — only the ones that apply. */
  rows: InvoiceRow[];
  /** "Đã thanh toán" · "Cần thanh toán" · "Tổng đơn". */
  totalLabel: string;
  totalVnd: number;
  paymentLabel: string;
  /** "Đã thanh toán" · "Chưa thu tiền" · "Đã huỷ" — the money, in three words. */
  paidLabel: string;
  trackingCode?: string;
  disclaimer: string;
}

const DISCLAIMER = "Bản in dành cho người mua, không phải hoá đơn giá trị gia tăng.";

/** Has the money arrived, is it still owed, or is the order over. */
function paidLabelOf(o: TrackedOrder): string {
  if (o.paid) return "Đã thanh toán";
  if (o.state === "CANCELLED") return "Đã huỷ";
  return "Chưa thu tiền";
}

export function invoiceOf(o: TrackedOrder): Invoice {
  const rows: InvoiceRow[] = [{ label: "Tạm tính", value: vnd(o.subtotalVnd) }];
  rows.push({
    label: "Phí giao",
    value: o.shippingFeeVnd === 0 ? "Miễn phí" : vnd(o.shippingFeeVnd),
  });
  if (o.codFeeVnd > 0) rows.push({ label: "Phí thu hộ", value: vnd(o.codFeeVnd) });
  if (o.discountVnd > 0) {
    rows.push({
      label: o.promo ? `Giảm giá · ${o.promo}` : "Giảm giá",
      value: `−${vnd(o.discountVnd)}`,
    });
  }

  return {
    brand: "HIVE",
    title: "Hoá đơn",
    code: o.code,
    placedAtLabel: `${clockLabel(o.placedAt)} · ${dayMonthYear(o.placedAt)}`,
    recipient: o.recipient,
    phoneLabel: formatPhone(o.phone),
    addressLine: o.addressLine,
    note: o.note,
    lines: o.lines.map((l) => ({
      name: l.name,
      detail: [l.kind, l.colorLabel, l.size].filter(Boolean).join(" · "),
      qty: l.qty,
      unitPriceVnd: l.unitPriceVnd,
      lineTotalVnd: l.unitPriceVnd * l.qty,
    })),
    units: o.units,
    rows,
    totalLabel: totalRowLabel(o.state),
    totalVnd: o.totalVnd,
    paymentLabel: PAYMENT_LABEL[o.payment],
    paidLabel: paidLabelOf(o),
    ...(o.trackingCode ? { trackingCode: o.trackingCode } : {}),
    disclaimer: DISCLAIMER,
  };
}
