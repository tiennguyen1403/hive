"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminTop } from "@/components/admin/AdminTop";
import { CancelOrderModal } from "@/components/admin/CancelOrderModal";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { useSim } from "@/components/admin/SimContext";
import { ActionMenu, Cb, ChipMenu, Stabs, TableFoot } from "@/components/admin/Table3";
import { useAdminCols } from "@/components/admin/useAdminCols";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { byId } from "@/data/catalog";
import { customerById } from "@/data/customers";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import { ORDERS } from "@/data/orders";
import type { Order, OrderState } from "@/data/types";
import { needsAction, recentOrders } from "@/lib/admin-metrics";
import { orderItemsLabel, orderNote } from "@/lib/admin-rows";
import { hrefWith, pageOf, paginate, perPageOf, type Query } from "@/lib/admin-url";
import { simOrders } from "@/lib/admin-sim";
import { effectiveOrder } from "@/lib/customer-orders";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { LEX, issueNo } from "@/lib/lexicon";
import { plainVnd } from "@/lib/money";
import { PAYMENT_LABEL, STATE_LABEL } from "@/lib/order-labels";
import { orderTotalVnd } from "@/lib/orders";
import { initialsOf } from "@/lib/initials";
import { formatPhone } from "@/lib/phone";

const PATH = "/admin/orders";

/** The tabs, in the order an order passes through them. */
const TABS: Array<{ value: OrderState | null; label: string }> = [
  { value: null, label: "Tất cả" },
  { value: "AWAITING_TRANSFER", label: STATE_LABEL.AWAITING_TRANSFER.text },
  { value: "PAID", label: STATE_LABEL.PAID.text },
  { value: "SHIPPING", label: STATE_LABEL.SHIPPING.text },
  { value: "DELIVERED", label: STATE_LABEL.DELIVERED.text },
  { value: "CANCELLED", label: STATE_LABEL.CANCELLED.text },
];

const PAY_OPTIONS = [
  { value: null, label: "Tất cả" },
  { value: "BANK_TRANSFER", label: PAYMENT_LABEL.BANK_TRANSFER },
  { value: "COD", label: PAYMENT_LABEL.COD },
  { value: "CARD", label: PAYMENT_LABEL.CARD },
];

/** The optional columns, and the two the mock leaves ticked. */
const COLS = [
  { key: "items", label: "Món" },
  { key: "payment", label: "Thanh toán" },
  { key: "address", label: "Địa chỉ" },
  { key: "promo", label: "Mã giảm giá" },
];
const COLS_DEFAULT = ["items", "payment"];

/**
 * Every order in the book, and the five things the shop can do to one.
 *
 * `data/orders.ts` is explicit that its rows are a recent SAMPLE rather than
 * the full ledger — the line under the title says the same thing, because a
 * table that looks complete IS a claim that it is.
 *
 * EVERY FILTER IS IN THE ADDRESS (QĐ-8): the tab, the search, the payment
 * method, the issue, the page and the rows per page. Which columns are drawn
 * is the one thing that is not, because that is a preference of the person
 * rather than a description of the screen (`useAdminCols`).
 *
 * Status is read through `effectiveStatus` before anything else: an unpaid
 * transfer past its twelve-hour deadline is Đã huỷ here, in its tab count,
 * and in the sidebar's badge, whether or not anybody wrote it down.
 */
export function AdminOrdersScreen({ nowIso, query }: { nowIso: string; query: Query }) {
  const { sim, run, runMany, say } = useSim();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [picked, setPicked] = useState<string[]>([]);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const { cols, toggle } = useAdminCols(COLS_DEFAULT);

  const orders = simOrders(ORDERS, sim).map((o) => effectiveOrder(o, now));
  const all = useMemo(() => recentOrders(orders, orders.length), [orders]);

  // ── the filters, all of them read off the address ──────────────────────
  const tab = (query.state as OrderState | undefined) ?? null;
  const pay = query.pay ?? null;
  const dropNo = query.drop ? Number(query.drop) : null;
  const customer = query.customer ?? null;
  const text = (query.q ?? "").trim().toLocaleLowerCase("vi");

  const issues = useMemo(
    () => [...new Set(ORDERS.map(issueOfOrder))].sort((a, b) => b - a),
    [],
  );

  const matches = (o: Order) => {
    if (pay && o.payment !== pay) return false;
    if (dropNo !== null && issueOfOrder(o) !== dropNo) return false;
    if (customer && String(o.customerId) !== customer) return false;
    if (!text) return true;
    const person = customerById.get(o.customerId);
    return [String(o.code), person?.name, person?.phone, person?.email]
      .filter(Boolean)
      .some((v) => v!.toLocaleLowerCase("vi").includes(text));
  };

  const filtered = all.filter(matches);
  const shown = tab ? filtered.filter((o) => o.status.state === tab) : filtered;
  const page = paginate(shown, pageOf(query.page), perPageOf(query.per));
  const waiting = needsAction(all).length;

  // A code ticked on page 1 that the filter then hides must not stay in the
  // selection: the bulk bar would count rows nobody can see.
  const visible = new Set(page.rows.map((o) => String(o.code)));
  useEffect(() => {
    setPicked((p) => p.filter((c) => visible.has(c)));
    // The selection resets when the page or the filter does, which is
    // exactly when `query` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.state, query.page, query.per, query.pay, query.drop, query.q]);

  const chosen = page.rows.filter((o) => picked.includes(String(o.code)));
  const headState: boolean | "mixed" =
    picked.length === 0 ? false : picked.length === page.rows.length ? true : "mixed";

  const csvRows = (list: Order[]) => [
    ["Mã đơn", "Khách", "Điện thoại", "Thời gian", "Món", "Giá trị (VND)", "Thanh toán", "Trạng thái"],
    ...list.map((o) => [
      String(o.code),
      customerById.get(o.customerId)?.name ?? "—",
      o.shipTo.phone,
      `${dayMonth(o.placedAt)} ${clockLabel(o.placedAt)}`,
      orderItemsLabel(o),
      orderTotalVnd(o),
      PAYMENT_LABEL[o.payment],
      STATE_LABEL[o.status.state].text,
    ]),
  ];

  /** The orders the shop could print a slip for right now. */
  const readyToPack = all
    .filter((o) => o.status.state === "PAID")
    .map((o) => String(o.code));

  return (
    <>
      <AdminTop
        title="Đơn hàng"
        sub={`${ORDERS.length} đơn trong dữ liệu mẫu · ${waiting} cần xử lý`}
      >
        <ExportCsvButton label="Tải CSV" filename="don-hang.csv" rows={csvRows(shown)} />
        {readyToPack.length > 0 && (
          <ButtonLink
            tone="sm"
            icon="printer"
            href={`/admin/slips?codes=${readyToPack.join(",")}`}
          >
            In phiếu giao
          </ButtonLink>
        )}
      </AdminTop>

      <div className="dt3">
        <Stabs
          label="Trạng thái"
          param="state"
          active={tab}
          path={PATH}
          query={query}
          tabs={TABS.map((t) => ({
            value: t.value,
            label: t.label,
            count: t.value ? filtered.filter((o) => o.status.state === t.value).length : filtered.length,
          }))}
        />

        {picked.length > 0 ? (
          <div className="bar bulk">
            <b>{picked.length} đơn đã chọn</b>
            <Button
              tone="ink sm"
              icon="check"
              onClick={() => {
                /* Only an unpaid transfer can be confirmed. The button does
                   not disappear when the selection holds none — it says
                   which rows it would have applied to, because a control
                   that vanishes as rows are ticked is harder to read than
                   one that explains itself. */
                const unpaid = chosen.filter((o) => o.status.state === "AWAITING_TRANSFER");
                if (unpaid.length === 0) {
                  return say(
                    "Chỉ đơn chờ chuyển khoản mới đánh dấu được — chưa chọn đơn nào như vậy",
                  );
                }
                runMany(
                  unpaid.map((o) => ({ kind: "ORDER_PAID" as const, code: String(o.code) })),
                  `${unpaid.length} đơn → đã thanh toán · ghi nhật ký`,
                );
                setPicked([]);
              }}
            >
              Đã nhận tiền
            </Button>
            <ButtonLink
              tone="ink sm"
              icon="printer"
              href={`/admin/slips?codes=${picked.join(",")}`}
            >
              In phiếu giao
            </ButtonLink>
            <Button tone="ink sm" icon="x" onClick={() => setPicked([])}>
              Bỏ chọn
            </Button>
          </div>
        ) : (
          <div className="bar tools">
            <SearchBox
              value={query.q ?? ""}
              placeholder="Tìm mã đơn, tên, số điện thoại"
              label="Tìm đơn"
              onSubmit={(v) => router.replace(hrefWith(PATH, query, { q: v || null, page: null }))}
            />
            <ChipMenu
              label="Thanh toán"
              icon="filter"
              active={pay}
              options={PAY_OPTIONS}
              hrefFor={(v) => hrefWith(PATH, query, { pay: v, page: null })}
              {...(pay ? { note: PAYMENT_LABEL[pay as keyof typeof PAYMENT_LABEL] } : {})}
            />
            <ChipMenu
              label={LEX.t}
              active={dropNo === null ? null : String(dropNo)}
              options={[
                { value: null, label: "Tất cả" },
                ...issues.map((n) => ({ value: String(n), label: `${LEX.t} ${issueNo(n)}` })),
              ]}
              hrefFor={(v) => hrefWith(PATH, query, { drop: v, page: null })}
              {...(dropNo !== null ? { note: issueNo(dropNo) } : {})}
            />
            <span className="fill" />
            <ChipMenu
              label="Cột"
              icon="columns"
              active={cols}
              options={COLS.map((c) => ({ value: c.key, label: c.label }))}
              onPick={(v) => v && toggle(v)}
            />
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <Cb
                  checked={headState}
                  label="Chọn tất cả"
                  onToggle={() =>
                    setPicked(
                      picked.length === page.rows.length
                        ? []
                        : page.rows.map((o) => String(o.code)),
                    )
                  }
                />
              </th>
              <th>Mã đơn</th>
              <th>Khách</th>
              <th>Thời gian</th>
              {cols.includes("items") && <th>Món</th>}
              <th className="right">Giá trị</th>
              {cols.includes("payment") && <th>Thanh toán</th>}
              {cols.includes("address") && <th>Địa chỉ</th>}
              {cols.includes("promo") && <th>Mã giảm giá</th>}
              <th>Trạng thái</th>
              <th style={{ width: 44 }}>
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((o) => {
              const code = String(o.code);
              const person = customerById.get(o.customerId);
              const s = STATE_LABEL[o.status.state];
              const note = orderNote(o, now);
              const on = picked.includes(code);
              return (
                <tr
                  key={code}
                  className={[on ? "on" : "", o.status.state === "CANCELLED" ? "paused" : ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td>
                    <Cb
                      checked={on}
                      label={`Chọn ${code}`}
                      onToggle={() =>
                        setPicked((p) => (on ? p.filter((c) => c !== code) : [...p, code]))
                      }
                    />
                  </td>
                  <td>
                    <Link href={`/admin/orders/${code}`}>{code}</Link>
                  </td>
                  <td className="nw">
                    <span className="avatar" aria-hidden="true">
                      {initialsOf(person?.name ?? "?")}
                    </span>
                    {person?.name ?? "—"}
                    <span className="sub" style={{ paddingLeft: 36 }}>
                      {formatPhone(o.shipTo.phone)}
                    </span>
                  </td>
                  <td className="nw">
                    {dayMonth(o.placedAt)} · {clockLabel(o.placedAt)}
                  </td>
                  {cols.includes("items") && <td>{orderItemsLabel(o)}</td>}
                  <td className="right">{plainVnd(orderTotalVnd(o))}</td>
                  {cols.includes("payment") && <td>{paymentCell(o)}</td>}
                  {cols.includes("address") && <td>{addressCell(o)}</td>}
                  {cols.includes("promo") && <td>{o.promo ?? "—"}</td>}
                  <td>
                    <Badge tone={s.tone}>{s.text}</Badge>
                    {o.status.state === "CANCELLED" && (
                      <span className="sub">{o.status.reason}</span>
                    )}
                    {note && (
                      <span className={note.late ? "sub late" : "sub"}>{note.text}</span>
                    )}
                  </td>
                  <td>
                    <ActionMenu
                      label={`Thao tác ${code}`}
                      items={[
                        { label: "Mở chi tiết", icon: "eye", href: `/admin/orders/${code}` },
                        ...(o.status.state === "AWAITING_TRANSFER"
                          ? [
                              {
                                label: "Đã nhận tiền",
                                icon: "check" as const,
                                onRun: () =>
                                  run(
                                    { kind: "ORDER_PAID", code },
                                    `${code} → đã thanh toán · ghi nhật ký`,
                                  ),
                              },
                            ]
                          : []),
                        {
                          label: "In phiếu giao",
                          icon: "printer",
                          href: `/admin/slips?codes=${code}`,
                        },
                        {
                          label: "Gửi lại xác nhận",
                          icon: "send",
                          onRun: () => {
                            const email = person?.email ?? "—";
                            run(
                              { kind: "ORDER_CONFIRMATION_RESENT", code, email },
                              `Đã ghi nhật ký: gửi lại xác nhận ${code} tới ${email} (chưa có máy chủ gửi)`,
                            );
                          },
                        },
                        ...(o.status.state === "CANCELLED" || o.status.state === "DELIVERED"
                          ? []
                          : [
                              {
                                label: "Huỷ đơn",
                                icon: "x" as const,
                                danger: true,
                                rule: true,
                                onRun: () => setCancelling(o),
                              },
                            ]),
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {page.total === 0 ? (
          <p className="none">Không có đơn nào khớp.</p>
        ) : (
          <TableFoot page={page} unit="đơn" path={PATH} query={query} />
        )}
      </div>

      <CancelOrderModal
        order={cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={(reason, note) => {
          if (!cancelling) return;
          run(
            { kind: "ORDER_CANCELLED", code: String(cancelling.code), reason, note },
            `${cancelling.code} đã huỷ · lý do: ${reason.toLocaleLowerCase("vi")}`,
          );
          setCancelling(null);
        }}
      />
    </>
  );
}

/** Which issue an order belongs to — the issue its first line was cut for. */
function issueOfOrder(o: Order): number {
  const first = o.lines[0];
  return (first && byId.get(first.productId)?.dropNo) ?? 0;
}

/**
 * The payment column: how it is being paid, and where that stands.
 *
 * COD says "thu khi giao" and NOT the surcharge the mock printed beside it.
 * `COD_SURCHARGE_VND` is real (`lib/shipping.ts`) but it is not in this
 * order's stored total, so printing "+15.000" next to a Giá trị column that
 * does not contain it would put two different totals on one row.
 */
function paymentCell(o: Order) {
  const label = PAYMENT_LABEL[o.payment];
  if (o.payment === "COD") {
    return (
      <>
        {label}
        <span className="sub">thu khi giao</span>
      </>
    );
  }
  if (o.payment === "CARD") {
    return (
      <>
        {label}
        <span className="sub">chưa thu tiền · chưa nối cổng</span>
      </>
    );
  }
  return (
    <>
      {label}
      {o.status.state === "AWAITING_TRANSFER" && (
        <span className="sub">
          hạn {clockLabel(o.status.dueAt)} · {dayMonth(o.status.dueAt)}
        </span>
      )}
      {o.status.state === "PAID" && (
        <span className="sub">
          nhận {clockLabel(o.status.paidAt)} · {dayMonth(o.status.paidAt)}
        </span>
      )}
    </>
  );
}

function addressCell(o: Order) {
  const ward = findWard(o.shipTo.provinceCode, o.shipTo.wardCode);
  const province = findProvince(o.shipTo.provinceCode);
  return (
    <>
      {o.shipTo.line}
      <span className="sub">
        {[ward && wardLabel(ward), province && provinceLabel(province)].filter(Boolean).join(", ")}
      </span>
    </>
  );
}

/**
 * The table's search box.
 *
 * It writes `?q=` rather than filtering in React state, because the result IS
 * what the screen is showing (QĐ-8). Typed locally and pushed after a pause,
 * so the caret never jumps while somebody is still typing; Enter sends it at
 * once for anybody who does not want to wait.
 */
function SearchBox({
  value,
  placeholder,
  label,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  label: string;
  onSubmit: (v: string) => void;
}) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (text === value) return;
    const id = window.setTimeout(() => onSubmit(text.trim()), 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <input
      className="inp"
      type="search"
      placeholder={placeholder}
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit(text.trim());
      }}
    />
  );
}

export { SearchBox };
