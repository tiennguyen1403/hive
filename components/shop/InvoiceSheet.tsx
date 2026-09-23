import { Fragment } from "react";
import type { Invoice } from "@/lib/invoice";
import { vnd } from "@/lib/money";

/**
 * The bill, on paper.
 *
 * Off screen at every width (`.invoice` is `display:none`) and the only
 * thing left on the page inside `@media print`, so "Tải hoá đơn" is one
 * `window.print()` and the shopper's own dialog — which is also where "Save
 * as PDF" lives on every desktop platform. No PDF writer is shipped, and a
 * button that opened a blank tab would be the dead button DESIGN.md §9 rules
 * out.
 *
 * Every field comes from `lib/invoice.ts`, which derives the lot from the
 * order. Nothing on this sheet is typed here.
 */
export function InvoiceSheet({ invoice }: { invoice: Invoice }) {
  return (
    <div className="invoice">
      <div className="ihd">
        <span className="wm">{invoice.brand}</span>
        <span className="code">
          {invoice.title} {invoice.code}
        </span>
      </div>

      <dl className="kvs">
        <dt>Ngày đặt</dt>
        <dd>{invoice.placedAtLabel}</dd>
        <dt>Người nhận</dt>
        <dd>
          {invoice.recipient} · {invoice.phoneLabel}
        </dd>
        <dt>Địa chỉ</dt>
        <dd>{invoice.addressLine}</dd>
        {invoice.note && (
          <>
            <dt>Ghi chú</dt>
            <dd>{invoice.note}</dd>
          </>
        )}
        <dt>Thanh toán</dt>
        <dd>
          {invoice.paymentLabel} · {invoice.paidLabel}
        </dd>
        {invoice.trackingCode && (
          <>
            <dt>Mã vận đơn</dt>
            <dd>{invoice.trackingCode}</dd>
          </>
        )}
      </dl>

      <table>
        <thead>
          <tr>
            <th>Mẫu</th>
            <th className="right">SL</th>
            <th className="right">Đơn giá</th>
            <th className="right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l) => (
            <tr key={`${l.name}-${l.detail}`}>
              <td>
                <b>{l.name}</b>
                <span className="sub">{l.detail}</span>
              </td>
              <td className="right">{l.qty}</td>
              <td className="right">{vnd(l.unitPriceVnd)}</td>
              <td className="right">{vnd(l.lineTotalVnd)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="isum">
        {invoice.rows.map((r) => (
          <Fragment key={r.label}>
            <div className="r">
              <span>{r.label}</span>
              <span>{r.value}</span>
            </div>
          </Fragment>
        ))}
        <div className="r total">
          <span>{invoice.totalLabel}</span>
          <span>{vnd(invoice.totalVnd)}</span>
        </div>
      </div>

      <div className="ifoot">
        <span>{invoice.units} món</span>
        <span>{invoice.disclaimer}</span>
      </div>
    </div>
  );
}
