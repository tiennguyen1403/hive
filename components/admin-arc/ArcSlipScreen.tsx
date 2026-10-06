"use client";

import { FileText, Printer, ShoppingBag } from "lucide-react";
import { FeedLogo } from "@/components/feed/FeedLogo";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS, colorLabel } from "@/data/colors";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import { isPaidFor, type AdminOrder } from "@/lib/admin-orders";
import { storedLang } from "@/lib/admin-text";
import { carrierLabel } from "@/lib/carrier";
import { issueOf } from "@/lib/customer-tags";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { picker, plural } from "@/lib/i18n";
import { LEX, issueLabel, issueNo, styleName } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { orderTotalVnd, orderUnits } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { nameLang, productText } from "@/lib/product-text";
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
 *
 * In the page's language since round v6 slice E4, on screen and on paper: the
 * glossary's "Delivery slip", each style by `productText` with the English
 * code, the carrier by `carrierLabel`, the amounts the English way. The
 * recipient, the address, the phone number and the customer's note are printed
 * as stored, said in Vietnamese on an English page.
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
  const locale = useLocale();
  const t = picker(locale);
  /** A Vietnamese name or place on an English page. */
  const own = locale === "en" ? ("vi" as const) : undefined;
  const count = orders.length;

  return (
    <div className={page.page}>
      <div className={page.masthead}>
        <Breadcrumb
          ariaLabel={t({ vi: "Đường dẫn", en: "Breadcrumb" })}
          items={[
            { label: t({ vi: "Đơn hàng", en: "Orders" }), href: "/admin/orders" },
            { label: t({ vi: "Phiếu giao", en: count > 1 ? "Delivery slips" : "Delivery slip" }) },
          ]}
        />
        <header className={page.header}>
          <div className={page.headRow}>
            <h1 className={page.title}>
              {count > 1
                ? t({ vi: `Phiếu giao · ${count} đơn`, en: `Delivery slips · ${count} orders` })
                : t({ vi: "Phiếu giao", en: "Delivery slip" })}
            </h1>
            <div className={page.actions}>
              <Badge size="sm">{t({ vi: "Dữ liệu mẫu", en: "Demo data" })}</Badge>
              {count > 0 && (
                <Button variant="primary" size="sm" onClick={() => window.print()}>
                  <Printer {...ICON} />
                  {t<React.ReactNode>({
                    vi: <>In {count > 1 ? `${count} phiếu` : "phiếu"}</>,
                    en: count > 1 ? `Print ${count} slips` : "Print slip",
                  })}
                </Button>
              )}
            </div>
          </div>
          {count > 0 && (
            <p className={page.sub}>
              {t<React.ReactNode>({
                vi: (
                  <>
                    {orders.map((o) => o.code).join(" · ")} · {count} phiếu
                  </>
                ),
                en: `${orders.map((o) => o.code).join(" · ")} · ${plural(count, "slip", "slips")}`,
              })}
            </p>
          )}
        </header>
      </div>

      {count === 0 ? (
        <EmptyState
          icon={<FileText size={24} strokeWidth={1.75} aria-hidden="true" />}
          title={t({ vi: "Không có đơn nào để in", en: "No orders to print" })}
          description={t({
            vi: "Địa chỉ này in phiếu cho những mã đơn được chọn ở danh sách đơn hàng.",
            en: "This page prints slips for the orders chosen in the order list.",
          })}
          action={
            <ArcButtonLink variant="secondary" size="md" href="/admin/orders">
              <ShoppingBag {...ICON} />
              {t({ vi: "Xem danh sách đơn", en: "View the orders" })}
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
                    <p className={styles.label}>{t({ vi: "Người nhận", en: "Recipient" })}</p>
                    <p>
                      <strong lang={storedLang(o.shipTo.recipient, locale)}>{o.shipTo.recipient}</strong> · {formatPhone(o.shipTo.phone)}
                    </p>
                    <p lang={own}>
                      {o.shipTo.line}
                      {ward ? `, ${wardLabel(ward)}` : ""}
                      {province ? `, ${provinceLabel(province)}` : ""}
                    </p>
                    <p className={styles.muted}>{carrierLabel(carrier ?? delivery.label, locale)}</p>
                    {edited &&
                      (locale === "vi" ? (
                        <p className={styles.muted}>Địa chỉ đã sửa · {edited}</p>
                      ) : (
                        <p className={styles.muted}>
                          Address changed · <span lang={storedLang(edited, locale)}>{edited}</span>
                        </p>
                      ))}
                    {o.note &&
                      (locale === "vi" ? (
                        <p className={styles.muted}>Ghi chú của khách: {o.note}</p>
                      ) : (
                        <p className={styles.muted}>
                          Customer&rsquo;s note: <span lang={storedLang(o.note, locale)}>{o.note}</span>
                        </p>
                      ))}
                  </div>
                  <div className={styles.qr}>
                    <span className={styles.qrBox} aria-hidden="true" />
                    {/* "· chờ" stays on the word before it (v3 slice 13). */}
                    <span className={styles.qrText}>{t({ vi: "QR tra cứu đơn · chờ", en: "Order lookup QR · pending" })}</span>
                  </div>
                </div>

                <table className={styles.lines}>
                  <tbody>
                    {o.lines.map((l, i) => {
                      const p = catalog.byId.get(l.productId);
                      const words = p ? productText(p, locale) : null;
                      return (
                        <tr key={`${l.productId}-${l.size}-${l.color}-${i}`}>
                          <td>
                            <strong lang={p ? nameLang(p, locale) : undefined}>
                              {p && words ? styleName(words.name, p.dropNo, locale) : "—"}
                            </strong> · {words?.kind ?? ""}
                          </td>
                          <td className={styles.nowrap}>
                            {locale === "vi" ? COLORS[l.color].label : colorLabel(l.color, locale)} · {l.size}
                          </td>
                          <td className={styles.qty}>×{l.qty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className={styles.total}>
                  <span>
                    {locale === "vi" ? (
                      <>
                        {orderUnits(o)} chiếc ·{" "}
                        {cod ? "thu khi giao" : isPaidFor(o) ? "đã thanh toán" : "chưa thanh toán"}
                      </>
                    ) : (
                      `${plural(orderUnits(o), "unit", "units")} · ${
                        cod ? "collect on delivery" : isPaidFor(o) ? "paid" : "not paid"
                      }`
                    )}
                  </span>
                  <strong>{vnd(orderTotalVnd(o), locale)}</strong>
                </div>

                {cod && (
                  <div className={styles.cod}>
                    <span>{t({ vi: "Thu hộ khi giao", en: "Cash to collect" })}</span>
                    <span>{vnd(collect, locale)}</span>
                  </div>
                )}

                {locale === "vi" ? (
                  <p className={styles.foot}>
                    Mã vận đơn: {tracking ?? "chờ bàn giao"}
                    {/* An order of fixed styles only (slice B5) belongs to no issue. */}
                    {issue !== undefined ? ` · ${LEX.t} ${issueNo(issue)}` : ""} · in {clockLabel(nowIso)} ·{" "}
                    {dayMonth(nowIso)}
                  </p>
                ) : (
                  <p className={styles.foot}>
                    Tracking no.: {tracking ?? "awaiting handover"}
                    {issue !== undefined ? ` · ${issueLabel(issue, locale)}` : ""} · printed {clockLabel(nowIso)} ·{" "}
                    {dayMonth(nowIso, locale)}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
