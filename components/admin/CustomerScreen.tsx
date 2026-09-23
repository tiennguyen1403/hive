"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AdminTop } from "@/components/admin/AdminTop";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { useCatalog } from "@/components/shop/CatalogContext";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import { customerKey, type AdminCustomerDetail } from "@/lib/admin-customers";
import type { AdminOrder } from "@/lib/admin-orders";
import { customerFacts, issueOf, issuesLabel } from "@/lib/customer-tags";
import { clockLabel, dayMonth, dayMonthYear } from "@/lib/datetime";
import { dropState } from "@/lib/drop";
import { initialsOf } from "@/lib/initials";
import { LEX, issueNo } from "@/lib/lexicon";
import { plainVnd, vnd } from "@/lib/money";
import { STATE_LABEL } from "@/lib/order-labels";
import { orderTotalVnd } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";

/**
 * One customer.
 *
 * The mock badged this person "Đã đặt nhắc số 06". Nothing in the fixtures
 * records a reminder sign-up, so that badge could only be invented and it is
 * gone. What is here instead is derived from their orders and nothing else:
 * the label (`lib/customer-tags.ts`), which issues they have bought in, what
 * they have spent, and every order they placed.
 *
 * "Đơn" counts everything they placed, cancelled included — this is a record
 * of who ordered what. "Tổng chi" counts only money that arrived. The two
 * columns deliberately disagree, and the screen says why.
 *
 * Since slice B3a the person is a row of `public.profiles` (a demo shopper or
 * somebody who signed up), their address book is theirs in the database, and
 * the orders are theirs by account.
 */
export function CustomerScreen({
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

  const openIssue = catalog.drops.find((d) => dropState(d, now) === "OPEN")?.no ?? null;
  const facts = customerFacts(catalog, orders, openIssue, now);
  const home = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];
  const province = home ? findProvince(home.provinceCode) : undefined;
  const ward = home ? findWard(home.provinceCode, home.wardCode) : undefined;

  return (
    <>
      <AdminTop
        crumb={{ label: "Khách hàng", href: "/admin/customers", here: customer.name }}
        title={customer.name}
        badge={
          facts.tag ? (
            <span className={`ctag ${facts.tag.tone}`.trim()}>{facts.tag.label}</span>
          ) : undefined
        }
        sub={
          <span>
            {facts.orders.length} đơn · {vnd(facts.spentVnd)} · đã mua{" "}
            {issuesLabel(facts.issues)} · tham gia {dayMonthYear(customer.joinedAt)}
          </span>
        }
      >
        <ButtonLink tone="ink sm" icon="bag" href={`/admin/orders?customer=${customerKey(customer)}`}>
          Đơn của khách
        </ButtonLink>
      </AdminTop>

      <div className="kpis3">
        <div className="kpi3">
          <span className="k">Đơn đã đặt</span>
          <b>{facts.orders.length}</b>
          {facts.booked.length} đơn đã thanh toán · {facts.orders.length - facts.booked.length} đơn
          huỷ hoặc đang chờ
        </div>
        <div className="kpi3">
          <span className="k">Tổng chi</span>
          <b>{plainVnd(facts.spentVnd)}₫</b>
          chỉ tính đơn đã thanh toán, chưa trừ hoàn tiền
        </div>
        <div className="kpi3">
          <span className="k">Đã mua</span>
          <b>
            {facts.issues.length} {LEX.tl}
          </b>
          {facts.issues.length > 0
            ? `${issuesLabel(facts.issues)}${facts.streak > 1 ? ` · dài nhất ${facts.streak} ${LEX.tl} liên tiếp` : ""}`
            : "chưa có đơn đã thanh toán"}
        </div>
        <div className="kpi3">
          <span className="k">Đơn gần nhất</span>
          <b>{facts.last ? dayMonth(facts.last.placedAt) : "—"}</b>
          {facts.last
            ? `${facts.last.code} · ${STATE_LABEL[facts.last.status.state].text.toLocaleLowerCase("vi")}`
            : "chưa đặt đơn nào"}
        </div>
      </div>

      <div className="split3">
        <section className="panel3">
          <h2>
            Đơn đã đặt<span className="meta">{facts.orders.length} đơn</span>
          </h2>
          {facts.orders.length === 0 ? (
            <p className="none">Chưa đặt đơn nào.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Thời gian</th>
                  <th>{LEX.t}</th>
                  <th className="right">Giá trị</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {facts.orders.map((o) => {
                  const s = STATE_LABEL[o.status.state];
                  return (
                    <tr key={o.code}>
                      <td>
                        <Link href={`/admin/orders/${o.code}`}>{o.code}</Link>
                      </td>
                      <td className="nw">
                        {dayMonth(o.placedAt)} · {clockLabel(o.placedAt)}
                      </td>
                      <td>{issueNo(issueOf(catalog, o) ?? 0)}</td>
                      <td className="right">{plainVnd(orderTotalVnd(o))}</td>
                      <td>
                        <Badge tone={s.tone}>{s.text}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <div>
          <section className="panel3">
            <h2>Liên hệ</h2>
            <div className="bd ctagrow">
              <span className="avatar" aria-hidden="true">
                {initialsOf(customer.name)}
              </span>
              <b>{customer.name}</b>
              <span className="sub">
                {/* A sign-up gives no number (the form does not ask). */}
                {customer.phone ? `${formatPhone(customer.phone)} · ` : ""}
                {customer.email}
              </span>
            </div>
          </section>

          {home && (
            <section className="panel3" style={{ marginTop: 16 }}>
              <h2>
                Địa chỉ mặc định<span className="meta">{home.label}</span>
              </h2>
              <div className="bd">
                <div className="addrblock">
                  <b>{home.recipient}</b> · {formatPhone(home.phone)}
                  <br />
                  {home.line}
                  {ward ? `, ${wardLabel(ward)}` : ""}
                  {province ? `, ${provinceLabel(province)}` : ""}
                </div>
                {customer.addresses.length > 1 && (
                  <p className="fine3">
                    Sổ địa chỉ của khách có {customer.addresses.length} địa chỉ.
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="panel3" style={{ marginTop: 16 }}>
            <h2>
              Nhãn<span className="meta">suy từ đơn, không gõ tay</span>
            </h2>
            <div className="bd">
              {facts.tag ? (
                <p>
                  <span className={`ctag ${facts.tag.tone}`.trim()}>{facts.tag.label}</span>{" "}
                  — {reasonFor(facts.tag.key, facts)}
                </p>
              ) : (
                <p className="fine3" style={{ marginTop: 0 }}>
                  Chưa đủ để gắn nhãn nào: cần ≥ 2 đơn đã thanh toán, hoặc đơn đầu trong {LEX.tl}{" "}
                  đang bán.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/** Why this person carries this label, in the numbers it was read from. */
function reasonFor(key: string, facts: ReturnType<typeof customerFacts>): string {
  if (key === "loyal") {
    return `mua ở ${facts.streak} ${LEX.tl} liên tiếp (${issuesLabel(facts.issues)})`;
  }
  if (key === "returning") return `${facts.booked.length} đơn đã thanh toán`;
  return `đơn đầu là ${facts.booked[0]?.code ?? "—"}, trong ${LEX.tl} đang bán`;
}
