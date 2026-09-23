"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { AdminTop } from "@/components/admin/AdminTop";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { SearchBox } from "@/components/admin/AdminOrdersScreen";
import { useSim } from "@/components/admin/SimContext";
import { ActionMenu, Stabs, TableFoot } from "@/components/admin/Table3";
import { Badge } from "@/components/ui/Badge";
import { CUSTOMERS } from "@/data/customers";
import { DROPS } from "@/data/catalog";
import { ORDERS } from "@/data/orders";
import type { Customer } from "@/data/types";
import { simOrders } from "@/lib/admin-sim";
import { hrefWith, pageOf, paginate, perPageOf, type Query } from "@/lib/admin-url";
import {
  customerFacts,
  customerGroup,
  inGroup,
  issuesLabel,
  tagLegend,
  type CustomerFacts,
} from "@/lib/customer-tags";
import { dayMonth } from "@/lib/datetime";
import { dropState } from "@/lib/drop";
import { initialsOf } from "@/lib/initials";
import { LEX, issueNo } from "@/lib/lexicon";
import { plainVnd } from "@/lib/money";
import { STATE_LABEL } from "@/lib/order-labels";
import { formatPhone } from "@/lib/phone";

const PATH = "/admin/customers";

/**
 * Who has bought, and what the orders say about them.
 *
 * THE LABEL IS DERIVED (`lib/customer-tags.ts`). The mock drew "thân thiết"
 * and "quay lại" on this table; nothing in `data/customers.ts` records
 * loyalty, so a stored field for it would be a number somebody made up
 * (DESIGN.md §9 rule 1). Instead the three thresholds the user settled are
 * applied to the person's own paid orders — and printed beside the search
 * box, so anybody can check the working.
 *
 * Nothing here is aggregated into a "segment" or a score: the fixtures hold
 * no behaviour to score.
 */
export function CustomersTable({ nowIso, query }: { nowIso: string; query: Query }) {
  const { sim, say } = useSim();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const orders = simOrders(ORDERS, sim);
  const openIssue = DROPS.find((d) => dropState(d, now) === "OPEN")?.no ?? null;

  const all = CUSTOMERS.map((c) => ({
    customer: c,
    facts: customerFacts(
      orders.filter((o) => o.customerId === c.id),
      openIssue,
      now,
    ),
  }));

  const group = customerGroup(query.group);
  const text = (query.q ?? "").trim().toLocaleLowerCase("vi");
  const matches = ({ customer }: { customer: Customer }) =>
    !text ||
    [customer.name, customer.phone, customer.email].some((v) =>
      v.toLocaleLowerCase("vi").includes(text),
    );

  const filtered = all.filter(matches);
  const shown = filtered.filter((r) => inGroup(group, r.facts));
  const page = paginate(shown, pageOf(query.page), perPageOf(query.per));

  const count = (g: Parameters<typeof inGroup>[0]) =>
    filtered.filter((r) => inGroup(g, r.facts)).length;

  const csvRows = [
    ["Khách", "Điện thoại", "Email", "Đơn", "Tổng chi (VND)", "Đã mua", "Nhãn", "Đơn gần nhất"],
    ...all.map(({ customer, facts }) => [
      customer.name,
      customer.phone,
      customer.email,
      facts.orders.length,
      facts.spentVnd,
      facts.issues.map((n) => issueNo(n)).join(" · "),
      facts.tag?.label ?? "—",
      facts.last ? String(facts.last.code) : "—",
    ]),
  ];

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      say(`Đã chép ${email}`);
    } catch {
      // An insecure origin or a permission policy refuses. Say what happened
      // rather than claiming a copy that did not take place.
      say(`Trình duyệt không cho chép tự động — email là ${email}`);
    }
  }

  return (
    <>
      <AdminTop
        title="Khách hàng"
        sub={`${CUSTOMERS.length} khách trong dữ liệu mẫu · nhãn suy từ đơn đã thanh toán, không gõ tay`}
      >
        <ExportCsvButton label="Tải CSV" filename="khach-hang.csv" rows={csvRows} />
      </AdminTop>

      <div className="dt3">
        <Stabs
          label="Nhóm"
          param="group"
          active={group === "all" ? null : group}
          path={PATH}
          query={query}
          tabs={[
            { value: null, label: "Tất cả", count: filtered.length },
            { value: "loyal", label: "Thân thiết", count: count("loyal") },
            { value: "returning", label: "Quay lại", count: count("returning") },
            {
              value: "new",
              label: openIssue ? `Mới trong ${LEX.tl} ${issueNo(openIssue)}` : "Mới",
              count: count("new"),
            },
            { value: "pending", label: "Có đơn chờ", count: count("pending") },
          ]}
        />
        <div className="bar tools">
          <SearchBox
            value={query.q ?? ""}
            placeholder="Tìm tên, số điện thoại, email"
            label="Tìm khách"
            onSubmit={(v) => router.replace(hrefWith(PATH, query, { q: v || null, page: null }))}
          />
          <span className="fill" />
          <span className="legend">{tagLegend()}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Khách</th>
              <th>Liên hệ</th>
              <th className="right">Đơn</th>
              <th className="right">Tổng chi</th>
              <th>Đã mua</th>
              <th>Nhãn</th>
              <th>Đơn gần nhất</th>
              <th style={{ width: 44 }}>
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map(({ customer, facts }) => (
              <tr key={customer.id}>
                <td className="nw">
                  <span className="avatar" aria-hidden="true">
                    {initialsOf(customer.name)}
                  </span>
                  <b>{customer.name}</b>
                </td>
                <td className="nw">
                  {formatPhone(customer.phone)}
                  <span className="sub">{customer.email}</span>
                </td>
                <td className="right">{facts.orders.length}</td>
                <td className="right">{plainVnd(facts.spentVnd)}</td>
                <td>{issuesLabel(facts.issues)}</td>
                <td>
                  {facts.tag ? (
                    <span className={`ctag ${facts.tag.tone}`.trim()}>{facts.tag.label}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="nw">
                  <LastOrder facts={facts} />
                </td>
                <td>
                  <ActionMenu
                    label={`Thao tác ${customer.name}`}
                    items={[
                      { label: "Hồ sơ", icon: "user", href: `/admin/customers/${customer.id}` },
                      {
                        label: "Đơn của khách",
                        icon: "bag",
                        href: `/admin/orders?customer=${customer.id}`,
                      },
                      {
                        label: "Chép email",
                        icon: "doc",
                        onRun: () => void copyEmail(customer.email),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {page.total === 0 ? (
          <p className="none">Không có khách nào khớp.</p>
        ) : (
          <TableFoot page={page} unit="khách" path={PATH} query={query}>
            Hiện {page.rows.length} / {page.total} khách · tổng chi tính từ đơn đã thanh toán, chưa
            trừ hoàn tiền
          </TableFoot>
        )}
      </div>
    </>
  );
}

/** "20/09 · DH-2431" with the state it is in, or nothing yet. */
function LastOrder({ facts }: { facts: CustomerFacts }) {
  if (!facts.last) return <>—</>;
  const s = STATE_LABEL[facts.last.status.state];
  return (
    <>
      {dayMonth(facts.last.placedAt)} ·{" "}
      <Link href={`/admin/orders/${facts.last.code}`}>{facts.last.code}</Link>
      <span className="sub">{s.text}</span>
    </>
  );
}
