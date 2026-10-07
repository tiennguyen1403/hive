"use client";

import { ShoppingBag } from "lucide-react";
import { useId, useMemo } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import { customerKey, type AdminCustomerDetail } from "@/lib/admin-customers";
import { storedLang } from "@/lib/admin-text";
import type { AdminOrder } from "@/lib/admin-orders";
import { customerFacts, issueOf, issuesLabel, tagReason, untaggedReason } from "@/lib/customer-tags";
import { currentIssueNo } from "@/lib/current-issue";
import { clockLabel, dayMonth, dayMonthYear } from "@/lib/datetime";
import { addressLabelText } from "@/lib/feed-account";
import { picker, plural } from "@/lib/i18n";
import { LEX, issueNo, lexicon } from "@/lib/lexicon";
import { plainVnd, vnd } from "@/lib/money";
import { orderStateLabel } from "@/lib/order-labels";
import { orderTotalVnd } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { Avatar } from "@/registry/components/avatar/avatar";
import { Badge } from "@/registry/components/badge/badge";
import { Breadcrumb } from "@/registry/components/breadcrumb/breadcrumb";
import { ArcButtonLink } from "./ArcButtonLink";
import styles from "./ArcCustomerScreen.module.css";
import { ArcKpi } from "./ArcKpi";
import { CodeCell, monogramName, TAG_TONE, TONE } from "./ArcOrderCells";
import panel from "./ArcOrderScreen.module.css";
import page from "./ArcPage.module.css";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * One customer in the Arc frame (round v5 slice 3): v3's `CustomerScreen`
 * (`components/admin/CustomerScreen.tsx`) figure for figure and word for
 * word, drawn with Arc's parts, the order page's panels (slice 1) and the
 * overview's figures (slice 2).
 *
 * What is here is derived from the person's orders and nothing else: the
 * label (`lib/customer-tags.ts`), which issues they have bought in, what they
 * have spent, and every order they placed. "Đơn" counts everything they
 * placed, cancelled included, because this is a record of who ordered what;
 * "Tổng chi" counts only money that arrived. The two deliberately disagree,
 * and the figure's own line says why.
 *
 * The person is a row of `public.profiles` (a demo shopper or somebody who
 * signed up), their address book is theirs in the database, and the orders
 * are theirs by account (slice B3a).
 *
 * In the page's language since round v6 slice E4 (`useLocale()`): the label and
 * why it holds, the figures the English way, the address book's name for the
 * address ("Home", slice E3a). The name, the address and the email are printed
 * as stored; the name and the address said in Vietnamese on an English page.
 */
export function ArcCustomerScreen({
  customer,
  orders,
  nowIso,
}: {
  customer: AdminCustomerDetail;
  /** Every order this account placed, from the database. */
  orders: AdminOrder[];
  nowIso: string;
}) {
  const catalog = useCatalog();
  const locale = useLocale();
  const t = picker(locale);
  /** The customer's name on an English page, said in Vietnamese when it is; the address always is (QĐ-40). */
  const own = storedLang(customer.name, locale);
  const place = locale === "en" ? ("vi" as const) : undefined;
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const ids = { orders: useId(), contact: useId(), address: useId(), tag: useId() };

  // "mới" is read against the current issue (slice 5a): the one selling, else
  // the one that closed last, as on the table and an order's customer panel;
  // 0, a catalogue without issues, is none. The label's line names the same
  // issue (slice 5b, `tagReason`).
  const current = currentIssueNo(catalog, now) || null;
  const facts = customerFacts(catalog, orders, current, now, locale);
  const home = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];
  const province = home ? findProvince(home.provinceCode) : undefined;
  const ward = home ? findWard(home.provinceCode, home.wardCode) : undefined;

  return (
    <div className={page.page}>
      <div className={page.masthead}>
        <Breadcrumb
          ariaLabel={t({ vi: "Đường dẫn", en: "Breadcrumb" })}
          items={[
            { label: t({ vi: "Khách hàng", en: "Customers" }), href: "/admin/customers" },
            // The name as stored, said in Vietnamese on an English page (Arc's `lang`, registry/PATCHES.md).
            { label: customer.name, lang: own },
          ]}
        />
        <header className={page.header}>
          <div className={page.headRow}>
            <div className={page.titleRow}>
              <h1 className={page.title} lang={own}>
                {customer.name}
              </h1>
              {facts.tag && (
                <Badge tone={TAG_TONE[facts.tag.tone]} size="sm">
                  {facts.tag.label}
                </Badge>
              )}
            </div>
            <div className={page.actions}>
              <Badge size="sm">{t({ vi: "Dữ liệu mẫu", en: "Demo data" })}</Badge>
              <ArcButtonLink
                variant="secondary"
                size="sm"
                href={`/admin/orders?customer=${customerKey(customer)}`}
              >
                <ShoppingBag {...ICON} />
                {t({ vi: "Đơn của khách", en: "Customer's orders" })}
              </ArcButtonLink>
            </div>
          </div>
          <p className={page.sub}>
            {t<React.ReactNode>({
              vi: (
                <>
                  {facts.orders.length} đơn · {vnd(facts.spentVnd)} · đã mua {issuesLabel(facts.issues)} · tham
                  gia {dayMonthYear(customer.joinedAt)}
                </>
              ),
              en: `${plural(facts.orders.length, "order", "orders")} · ${vnd(facts.spentVnd, locale)} · bought in ${issuesLabel(facts.issues, locale)} · joined ${dayMonthYear(customer.joinedAt, locale)}`,
            })}
          </p>
        </header>
      </div>

      <div className={styles.kpis}>
        <ArcKpi label={t({ vi: "Đơn đã đặt", en: "Orders placed" })} value={String(facts.orders.length)}>
          {t<React.ReactNode>({
            vi: (
              <>
                {facts.booked.length} đơn đã thanh toán · {facts.orders.length - facts.booked.length} đơn huỷ
                hoặc đang chờ
              </>
            ),
            en: `${facts.booked.length} paid · ${facts.orders.length - facts.booked.length} cancelled or pending`,
          })}
        </ArcKpi>
        <ArcKpi label={t({ vi: "Tổng chi", en: "Total spent" })} value={`${plainVnd(facts.spentVnd, locale)}₫`}>
          {t({ vi: "chỉ tính đơn đã thanh toán, chưa trừ hoàn tiền", en: "paid orders only, before refunds" })}
        </ArcKpi>
        <ArcKpi
          label={t({ vi: "Đã mua", en: "Bought in" })}
          value={t({ vi: `${facts.issues.length} ${LEX.tl}`, en: plural(facts.issues.length, "drop", "drops") })}
        >
          {facts.issues.length > 0
            ? t({
                vi: `${issuesLabel(facts.issues)}${facts.streak > 1 ? ` · dài nhất ${facts.streak} ${LEX.tl} liên tiếp` : ""}`,
                en: `${issuesLabel(facts.issues, locale)}${facts.streak > 1 ? ` · ${facts.streak} in a row` : ""}`,
              })
            : t({ vi: "chưa có đơn đã thanh toán", en: "no paid orders yet" })}
        </ArcKpi>
        <ArcKpi
          label={t({ vi: "Đơn gần nhất", en: "Latest order" })}
          value={facts.last ? dayMonth(facts.last.placedAt, locale) : "—"}
        >
          {facts.last
            ? t({
                vi: `${facts.last.code} · ${orderStateLabel(facts.last, "vi").text.toLocaleLowerCase("vi")}`,
                en: `${facts.last.code} · ${orderStateLabel(facts.last, "en").text.toLocaleLowerCase("en")}`,
              })
            : t({ vi: "chưa đặt đơn nào", en: "no orders yet" })}
        </ArcKpi>
      </div>

      {/* Two columns, as in v3: the orders on the left, who they are on the
          right, about 380px. Tab follows the columns. */}
      <div className={styles.split}>
        <div className={styles.column}>
          <section className={panel.panel} aria-labelledby={ids.orders}>
            <div className={panel.panelHead}>
              <div className={panel.panelHeading}>
                <h2 id={ids.orders} className={panel.panelTitle}>
                  {t({ vi: "Đơn đã đặt", en: "Orders placed" })}
                </h2>
                <p className={panel.panelSub}>
                  {t<React.ReactNode>({
                    vi: <>{facts.orders.length} đơn</>,
                    en: plural(facts.orders.length, "order", "orders"),
                  })}
                </p>
              </div>
            </div>
            {facts.orders.length === 0 ? (
              <p className={styles.none}>{t({ vi: "Chưa đặt đơn nào.", en: "No orders yet." })}</p>
            ) : (
              <table className={panel.lines}>
                <thead>
                  <tr>
                    <th scope="col">{t({ vi: "Mã đơn", en: "Order" })}</th>
                    <th scope="col">{t({ vi: "Thời gian", en: "Placed" })}</th>
                    <th scope="col">{lexicon(locale).t}</th>
                    <th scope="col" className={panel.num}>
                      {t({ vi: "Giá trị", en: "Total" })}
                    </th>
                    <th scope="col">{t({ vi: "Trạng thái", en: "Status" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {facts.orders.map((o) => {
                    const s = orderStateLabel(o, locale);
                    return (
                      <tr key={o.code}>
                        <td>
                          <CodeCell code={String(o.code)} />
                        </td>
                        <td className={panel.nowrap}>
                          {dayMonth(o.placedAt, locale)} · {clockLabel(o.placedAt)}
                        </td>
                        {/* Empty for an order of fixed styles only (slice B5). */}
                        <td>{issueCell(issueOf(catalog, o))}</td>
                        <td className={panel.num}>{plainVnd(orderTotalVnd(o), locale)}</td>
                        <td>
                          <Badge tone={TONE[s.tone]} size="sm">
                            {s.text}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div className={styles.column}>
          <section className={panel.panel} aria-labelledby={ids.contact}>
            <div className={panel.panelHead}>
              <h2 id={ids.contact} className={panel.panelTitle}>
                {t({ vi: "Liên hệ", en: "Contact" })}
              </h2>
            </div>
            <div className={panel.who}>
              <Avatar name={monogramName(customer.name)} size="md" aria-hidden="true" lang={own} />
              <p className={panel.whoName} lang={own}>
                {customer.name}
              </p>
              <p className={panel.whoFacts}>
                {/* A sign-up gives no number (the form does not ask). */}
                {customer.phone ? `${formatPhone(customer.phone)} · ` : ""}
                {customer.email}
              </p>
            </div>
          </section>

          {home && (
            <section className={panel.panel} aria-labelledby={ids.address}>
              <div className={panel.panelHead}>
                <div className={panel.panelHeading}>
                  <h2 id={ids.address} className={panel.panelTitle}>
                    {t({ vi: "Địa chỉ mặc định", en: "Default address" })}
                  </h2>
                  <p className={panel.panelSub}>{addressLabelText(home.label, locale)}</p>
                </div>
              </div>
              <div className={panel.address}>
                <p>
                  <strong lang={storedLang(home.recipient, locale)}>{home.recipient}</strong> · {formatPhone(home.phone)}
                </p>
                <p lang={place}>
                  {home.line}
                  {ward ? `, ${wardLabel(ward)}` : ""}
                  {province ? `, ${provinceLabel(province)}` : ""}
                </p>
              </div>
              {customer.addresses.length > 1 && (
                <p className={panel.fine}>
                  {t<React.ReactNode>({
                    vi: <>Sổ địa chỉ của khách có {customer.addresses.length} địa chỉ.</>,
                    en: `The customer's address book has ${plural(customer.addresses.length, "address", "addresses")}.`,
                  })}
                </p>
              )}
            </section>
          )}

          <section className={panel.panel} aria-labelledby={ids.tag}>
            <div className={panel.panelHead}>
              <h2 id={ids.tag} className={panel.panelTitle}>
                {t({ vi: "Nhãn", en: "Label" })}
              </h2>
            </div>
            {facts.tag ? (
              <p className={styles.tagLine}>
                <Badge tone={TAG_TONE[facts.tag.tone]} size="sm">
                  {facts.tag.label}
                </Badge>
                <span>— {tagReason(facts.tag.key, facts, current, locale)}</span>
              </p>
            ) : (
              <p className={styles.none}>{untaggedReason(current, locale)}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** An order's issue, two digits, or nothing for an order of fixed styles only (slice B5). */
function issueCell(no: number | undefined): string {
  return no === undefined ? "" : issueNo(no);
}
