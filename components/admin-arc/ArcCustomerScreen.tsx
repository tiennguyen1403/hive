"use client";

import { ShoppingBag } from "lucide-react";
import { useId, useMemo } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import { customerKey, type AdminCustomerDetail } from "@/lib/admin-customers";
import type { AdminOrder } from "@/lib/admin-orders";
import { customerFacts, issueOf, issuesLabel, type CustomerFacts } from "@/lib/customer-tags";
import { currentIssueNo } from "@/lib/current-issue";
import { clockLabel, dayMonth, dayMonthYear } from "@/lib/datetime";
import { LEX, issueNo } from "@/lib/lexicon";
import { plainVnd, vnd } from "@/lib/money";
import { STATE_LABEL } from "@/lib/order-labels";
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
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const ids = { orders: useId(), contact: useId(), address: useId(), tag: useId() };

  // "mới" is read against the current issue (slice 5a): the one selling, else
  // the one that closed last, as on the table and an order's customer panel;
  // 0, a catalogue without issues, is none.
  const facts = customerFacts(catalog, orders, currentIssueNo(catalog, now) || null, now);
  const home = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];
  const province = home ? findProvince(home.provinceCode) : undefined;
  const ward = home ? findWard(home.provinceCode, home.wardCode) : undefined;

  return (
    <div className={page.page}>
      <div className={page.masthead}>
        <Breadcrumb
          ariaLabel="Đường dẫn"
          items={[{ label: "Khách hàng", href: "/admin/customers" }, { label: customer.name }]}
        />
        <header className={page.header}>
          <div className={page.headRow}>
            <div className={page.titleRow}>
              <h1 className={page.title}>{customer.name}</h1>
              {facts.tag && (
                <Badge tone={TAG_TONE[facts.tag.tone]} size="sm">
                  {facts.tag.label}
                </Badge>
              )}
            </div>
            <div className={page.actions}>
              <Badge size="sm">Dữ liệu mẫu</Badge>
              <ArcButtonLink
                variant="secondary"
                size="sm"
                href={`/admin/orders?customer=${customerKey(customer)}`}
              >
                <ShoppingBag {...ICON} />
                Đơn của khách
              </ArcButtonLink>
            </div>
          </div>
          <p className={page.sub}>
            {facts.orders.length} đơn · {vnd(facts.spentVnd)} · đã mua {issuesLabel(facts.issues)} · tham
            gia {dayMonthYear(customer.joinedAt)}
          </p>
        </header>
      </div>

      <div className={styles.kpis}>
        <ArcKpi label="Đơn đã đặt" value={String(facts.orders.length)}>
          {facts.booked.length} đơn đã thanh toán · {facts.orders.length - facts.booked.length} đơn huỷ
          hoặc đang chờ
        </ArcKpi>
        <ArcKpi label="Tổng chi" value={`${plainVnd(facts.spentVnd)}₫`}>
          chỉ tính đơn đã thanh toán, chưa trừ hoàn tiền
        </ArcKpi>
        <ArcKpi label="Đã mua" value={`${facts.issues.length} ${LEX.tl}`}>
          {facts.issues.length > 0
            ? `${issuesLabel(facts.issues)}${facts.streak > 1 ? ` · dài nhất ${facts.streak} ${LEX.tl} liên tiếp` : ""}`
            : "chưa có đơn đã thanh toán"}
        </ArcKpi>
        <ArcKpi label="Đơn gần nhất" value={facts.last ? dayMonth(facts.last.placedAt) : "—"}>
          {facts.last
            ? `${facts.last.code} · ${STATE_LABEL[facts.last.status.state].text.toLocaleLowerCase("vi")}`
            : "chưa đặt đơn nào"}
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
                  Đơn đã đặt
                </h2>
                <p className={panel.panelSub}>{facts.orders.length} đơn</p>
              </div>
            </div>
            {facts.orders.length === 0 ? (
              <p className={styles.none}>Chưa đặt đơn nào.</p>
            ) : (
              <table className={panel.lines}>
                <thead>
                  <tr>
                    <th scope="col">Mã đơn</th>
                    <th scope="col">Thời gian</th>
                    <th scope="col">{LEX.t}</th>
                    <th scope="col" className={panel.num}>
                      Giá trị
                    </th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {facts.orders.map((o) => {
                    const s = STATE_LABEL[o.status.state];
                    return (
                      <tr key={o.code}>
                        <td>
                          <CodeCell code={String(o.code)} />
                        </td>
                        <td className={panel.nowrap}>
                          {dayMonth(o.placedAt)} · {clockLabel(o.placedAt)}
                        </td>
                        {/* Empty for an order of fixed styles only (slice B5). */}
                        <td>{issueCell(issueOf(catalog, o))}</td>
                        <td className={panel.num}>{plainVnd(orderTotalVnd(o))}</td>
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
                Liên hệ
              </h2>
            </div>
            <div className={panel.who}>
              <Avatar name={monogramName(customer.name)} size="md" aria-hidden="true" />
              <p className={panel.whoName}>{customer.name}</p>
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
                    Địa chỉ mặc định
                  </h2>
                  <p className={panel.panelSub}>{home.label}</p>
                </div>
              </div>
              <div className={panel.address}>
                <p>
                  <strong>{home.recipient}</strong> · {formatPhone(home.phone)}
                </p>
                <p>
                  {home.line}
                  {ward ? `, ${wardLabel(ward)}` : ""}
                  {province ? `, ${provinceLabel(province)}` : ""}
                </p>
              </div>
              {customer.addresses.length > 1 && (
                <p className={panel.fine}>Sổ địa chỉ của khách có {customer.addresses.length} địa chỉ.</p>
              )}
            </section>
          )}

          <section className={panel.panel} aria-labelledby={ids.tag}>
            <div className={panel.panelHead}>
              <h2 id={ids.tag} className={panel.panelTitle}>
                Nhãn
              </h2>
            </div>
            {facts.tag ? (
              <p className={styles.tagLine}>
                <Badge tone={TAG_TONE[facts.tag.tone]} size="sm">
                  {facts.tag.label}
                </Badge>
                <span>— {reasonFor(facts.tag.key, facts)}</span>
              </p>
            ) : (
              <p className={styles.none}>
                Chưa đủ để gắn nhãn nào: cần ≥ 2 đơn đã thanh toán, hoặc đơn đầu trong {LEX.tl} đang bán.
              </p>
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

/** Why this person carries this label, in the numbers it was read from (v3's words). */
function reasonFor(key: string, facts: CustomerFacts): string {
  if (key === "loyal") {
    return `mua ở ${facts.streak} ${LEX.tl} liên tiếp (${issuesLabel(facts.issues)})`;
  }
  if (key === "returning") return `${facts.booked.length} đơn đã thanh toán`;
  return `đơn đầu là ${facts.booked[0]?.code ?? "—"}, trong ${LEX.tl} đang bán`;
}
