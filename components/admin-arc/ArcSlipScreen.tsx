"use client";

import { FileText, Printer, ShoppingBag } from "lucide-react";
import { FeedLogo } from "@/components/feed/FeedLogo";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS } from "@/data/colors";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import { isPaidFor, type AdminOrder } from "@/lib/admin-orders";
import { issueOf } from "@/lib/customer-tags";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { LEX, issueNo, styleName } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { orderTotalVnd, orderUnits } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { COD_SURCHARGE_VND, deliveryOption, EXPRESS_FEE_VND } from "@/lib/shipping";
import { Badge } from "@/registry/components/badge/badge";
import { Breadcrumb } from "@/registry/components/breadcrumb/breadcrumb";
import { Button } from "@/registry/components/button/button";
import { EmptyState } from "@/registry/components/empty-state/empty-state";
import { ArcButtonLink } from "./ArcButtonLink";
import page from "./ArcPage.module.css";
import styles from "./ArcSlipScreen.module.css";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * "In phiếu giao": a real document, on real paper, in the Arc frame (round
 * v5 slice 1). v3's `SlipScreen` (`components/admin/SlipScreen.tsx`) line for
 * line and word for word.
 *
 * A ROUTE rather than a dialog, so it can be opened for one order or a whole
 * selection, linked to and reloaded. On paper the sidebar, the heading strip
 * and the toasts go (`ArcAdminFrame.module.css`, `ArcPage.module.css`), and
 * two slips share an A4 sheet.
 *
 * The orders are the database's, chosen on the server
 * (`app/admin/slips/page.tsx`): the address printed is the one the parcel
 * carries, with the reason beside an address the shop edited, and the
 * shopper's note for the courier is on the slip where the courier reads it.
 * COD is stated in full, surcharge included, because it is what the courier
 * collects (`lib/shipping.ts`). The QR slot is empty and says so.
 */
export function ArcSlipScreen({
  orders,
  editReasons,
  nowIso,
}: {
  /** The orders to print, already chosen: the ticked codes, or every paid order. */
  orders: AdminOrder[];
  /** Why an order's address was last edited, by code, for the ones that were. */
  editReasons: Record<string, string>;
  nowIso: string;
}) {
  const catalog = useCatalog();
  const count = orders.length;

  return (
    <div className={page.page}>
      <div className={page.masthead}>
        <Breadcrumb
          ariaLabel="Đường dẫn"
          items={[{ label: "Đơn hàng", href: "/admin/orders" }, { label: "Phiếu giao" }]}
        />
        <header className={page.header}>
          <div className={page.headRow}>
            <h1 className={page.title}>{count > 1 ? `Phiếu giao · ${count} đơn` : "Phiếu giao"}</h1>
            <div className={page.actions}>
              <Badge size="sm">Dữ liệu mẫu</Badge>
              {count > 0 && (
                <Button variant="primary" size="sm" onClick={() => window.print()}>
                  <Printer {...ICON} />
                  In {count > 1 ? `${count} phiếu` : "phiếu"}
                </Button>
              )}
            </div>
          </div>
          {count > 0 && (
            <p className={page.sub}>
              {orders.map((o) => o.code).join(" · ")} · {count} phiếu
            </p>
          )}
        </header>
      </div>

      {count === 0 ? (
        <EmptyState
          icon={<FileText size={24} strokeWidth={1.75} aria-hidden="true" />}
          title="Không có đơn nào để in"
          description="Địa chỉ này in phiếu cho những mã đơn được chọn ở danh sách đơn hàng."
          action={
            <ArcButtonLink variant="secondary" size="md" href="/admin/orders">
              <ShoppingBag {...ICON} />
              Xem danh sách đơn
            </ArcButtonLink>
          }
        />
      ) : (
        <div className={styles.slips}>
          {orders.map((o) => {
            const code = String(o.code);
            const province = findProvince(o.shipTo.provinceCode);
            const ward = findWard(o.shipTo.provinceCode, o.shipTo.wardCode);
            const tracking = o.status.state === "SHIPPING" ? o.status.trackingCode : null;
            const carrier = o.status.state === "SHIPPING" ? o.status.carrier : undefined;
            const delivery = deliveryOption(o.shippingFeeVnd === EXPRESS_FEE_VND ? "EXPRESS" : "STANDARD");
            const cod = o.payment === "COD";
            const edited = editReasons[code];
            const issue = issueOf(catalog, o);
            // What the courier collects. An order placed since slice B2
            // already carries the COD surcharge in its total; the sample's
            // were never charged it, and the slip adds it as it always did.
            const collect = orderTotalVnd(o) + (o.codFeeVnd > 0 ? 0 : COD_SURCHARGE_VND);
            return (
              <section className={styles.slip} key={code} aria-labelledby={`slip-${code}`}>
                <div className={styles.head}>
                  <span className={styles.brand} role="img" aria-label="HIVE">
                    <FeedLogo tone="light" className={styles.logo} />
                  </span>
                  <h2 id={`slip-${code}`} className={styles.code}>
                    {code}
                  </h2>
                </div>

                <div className={styles.body}>
                  <div className={styles.recipient}>
                    <p className={styles.label}>Người nhận</p>
                    <p>
                      <strong>{o.shipTo.recipient}</strong> · {formatPhone(o.shipTo.phone)}
                    </p>
                    <p>
                      {o.shipTo.line}
                      {ward ? `, ${wardLabel(ward)}` : ""}
                      {province ? `, ${provinceLabel(province)}` : ""}
                    </p>
                    <p className={styles.muted}>{carrier ?? delivery.label}</p>
                    {edited && <p className={styles.muted}>Địa chỉ đã sửa · {edited}</p>}
                    {o.note && <p className={styles.muted}>Ghi chú của khách: {o.note}</p>}
                  </div>
                  <div className={styles.qr}>
                    <span className={styles.qrBox} aria-hidden="true" />
                    {/* "· chờ" stays on the word before it (v3 slice 13). */}
                    <span className={styles.qrText}>{"QR tra cứu đơn · chờ"}</span>
                  </div>
                </div>

                <table className={styles.lines}>
                  <tbody>
                    {o.lines.map((l, i) => {
                      const p = catalog.byId.get(l.productId);
                      return (
                        <tr key={`${l.productId}-${l.size}-${l.color}-${i}`}>
                          <td>
                            <strong>{p ? styleName(p.name, p.dropNo) : "—"}</strong> · {p?.kind ?? ""}
                          </td>
                          <td className={styles.nowrap}>
                            {COLORS[l.color].label} · {l.size}
                          </td>
                          <td className={styles.qty}>×{l.qty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className={styles.total}>
                  <span>
                    {orderUnits(o)} chiếc ·{" "}
                    {cod ? "thu khi giao" : isPaidFor(o) ? "đã thanh toán" : "chưa thanh toán"}
                  </span>
                  <strong>{vnd(orderTotalVnd(o))}</strong>
                </div>

                {cod && (
                  <div className={styles.cod}>
                    <span>Thu hộ khi giao</span>
                    <span>{vnd(collect)}</span>
                  </div>
                )}

                <p className={styles.foot}>
                  Mã vận đơn: {tracking ?? "chờ bàn giao"}
                  {/* An order of fixed styles only (slice B5) belongs to no issue. */}
                  {issue !== undefined ? ` · ${LEX.t} ${issueNo(issue)}` : ""} · in {clockLabel(nowIso)} ·{" "}
                  {dayMonth(nowIso)}
                </p>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
