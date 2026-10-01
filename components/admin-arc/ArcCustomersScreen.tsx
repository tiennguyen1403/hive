"use client";

import { Copy, Download, MoreHorizontal, ShoppingBag, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useTransition } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import { customerKey, customerRows, type AdminCustomer, type CustomerRow } from "@/lib/admin-customers";
import type { AdminOrder } from "@/lib/admin-orders";
import { hrefWith, pageOf, paginate, patched, PER_PAGE_CHOICES, perPageOf, type Query } from "@/lib/admin-url";
import { downloadCsv } from "@/lib/csv";
import { currentIssueNo } from "@/lib/current-issue";
import {
  customerGroup,
  inGroup,
  issuesLabel,
  type CustomerFacts,
  type CustomerGroup,
} from "@/lib/customer-tags";
import { dayMonth } from "@/lib/datetime";
import { LEX, issueNo } from "@/lib/lexicon";
import { plainVnd } from "@/lib/money";
import { STATE_LABEL } from "@/lib/order-labels";
import { formatPhone } from "@/lib/phone";
import { Avatar } from "@/registry/components/avatar/avatar";
import { Badge } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import { DropdownMenu } from "@/registry/components/dropdown-menu/dropdown-menu";
import { Pagination } from "@/registry/components/pagination/pagination";
import SegmentedControl from "@/registry/components/segmented-control/segmented-control";
import {
  SortableDataTable,
  type DataColumn,
} from "@/registry/components/sortable-data-table/sortable-data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/components/tabs/tabs";
import styles from "./ArcCustomersScreen.module.css";
import { CodeCell, monogramName, TAG_TONE } from "./ArcOrderCells";
import book from "./ArcOrdersScreen.module.css";
import page from "./ArcPage.module.css";
import { ArcSearchBox } from "./ArcSearchBox";
import { useArcToast } from "./useArcToast";

const PATH = "/admin/customers";

const PER_OPTIONS = PER_PAGE_CHOICES.map((n) => ({ value: String(n), label: String(n) }));

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** One row of the table: the account and what its orders say, keyed by the account's id. */
type Row = { id: string; customer: AdminCustomer; facts: CustomerFacts };

/**
 * Who has bought, and what the orders say about them, in the Arc frame (round
 * v5 slice 3): v3's `CustomersTable` (`components/admin/CustomersTable.tsx`)
 * rule for rule and word for word, drawn with Arc's parts and the order
 * book's table (slice 0).
 *
 * THE LABEL IS DERIVED (`lib/customer-tags.ts`): nothing records loyalty, so
 * "thân thiết", "quay lại" and "mới" are the user's three thresholds applied
 * to the person's own paid orders. Nothing here is a segment or a score. The
 * rows are the database's accounts, the eight demo shoppers and everybody who
 * signed up, each matched to its orders by account (`lib/admin-customers.ts`).
 *
 * EVERY FILTER IS IN THE ADDRESS (QĐ-8): the group (`?group=`, v3's key), the
 * search, the page and the rows per page. A change shows at once
 * (`useOptimistic`) and the address follows in a transition. The group and
 * the search replace the address, as the order book's tab and search do; the
 * page and the rows per page push, as v3's links did.
 */
export function ArcCustomersScreen({
  customers,
  orders,
  nowIso,
  query,
}: {
  customers: AdminCustomer[];
  /** The order book, from the database (`admin_orders()`). */
  orders: AdminOrder[];
  nowIso: string;
  query: Query;
}) {
  const catalog = useCatalog();
  const say = useArcToast();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [, startNavigation] = useTransition();
  const [view, setView] = useOptimistic(query);

  /** Change the address: shown now, confirmed by the server render that follows. */
  function go(patch: Record<string, string | number | null>, mode: "push" | "replace" = "push") {
    const next = patched(view, patch);
    startNavigation(() => {
      setView(next);
      router[mode](hrefWith(PATH, next), { scroll: false });
    });
  }

  // "mới" and its tab are read against the current issue (slice 5a): the one
  // selling, else the one that closed last, as on the overview and an order's
  // customer panel; 0, a catalogue without issues, is none.
  const current = currentIssueNo(catalog, now) || null;
  const all = useMemo<CustomerRow[]>(
    () => customerRows(catalog, customers, orders, current, now),
    [catalog, customers, orders, current, now],
  );

  const group = customerGroup(view.group);
  const text = (view.q ?? "").trim().toLocaleLowerCase("vi");
  const matches = ({ customer }: CustomerRow) =>
    !text ||
    [customer.name, customer.phone, customer.email].some((v) =>
      v.toLocaleLowerCase("vi").includes(text),
    );

  const filtered = all.filter(matches);
  const shown = filtered.filter((r) => inGroup(group, r.facts));
  const paged = paginate(shown, pageOf(view.page), perPageOf(view.per));

  const count = (g: CustomerGroup) => filtered.filter((r) => inGroup(g, r.facts)).length;

  /** v3's five groups, in v3's order, with v3's names. "Tất cả" is the address with no `group`. */
  const tabs: Array<{ value: CustomerGroup; label: string }> = [
    { value: "all", label: "Tất cả" },
    { value: "loyal", label: "Thân thiết" },
    { value: "returning", label: "Quay lại" },
    { value: "new", label: current ? `Mới trong ${LEX.tl} ${issueNo(current)}` : "Mới" },
    { value: "pending", label: "Có đơn chờ" },
  ];

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
      say(`Trình duyệt không cho chép tự động — email là ${email}`, "error");
    }
  }

  function rowMenu(customer: AdminCustomer) {
    const key = customerKey(customer);
    return (
      <DropdownMenu
        iconOnly
        label={`Thao tác ${customer.name}`}
        icon={<MoreHorizontal {...ICON} />}
        items={[
          {
            label: "Hồ sơ",
            icon: <User {...ICON} />,
            onSelect: () => router.push(`/admin/customers/${key}`),
          },
          {
            label: "Đơn của khách",
            icon: <ShoppingBag {...ICON} />,
            onSelect: () => router.push(`/admin/orders?customer=${key}`),
          },
          {
            label: "Chép email",
            icon: <Copy {...ICON} />,
            onSelect: () => void copyEmail(customer.email),
          },
        ]}
      />
    );
  }

  const columnList: DataColumn<Row>[] = [
    { key: "customer", label: "Khách", render: (_v, r) => <WhoCell customer={r.customer} /> },
    { key: "contact", label: "Liên hệ", render: (_v, r) => <ContactCell customer={r.customer} /> },
    { key: "orders", label: "Đơn", numeric: true, render: (_v, r) => r.facts.orders.length },
    {
      key: "spent",
      label: "Tổng chi",
      numeric: true,
      render: (_v, r) => <span className={book.nowrap}>{plainVnd(r.facts.spentVnd)}</span>,
    },
    {
      key: "issues",
      label: "Đã mua",
      render: (_v, r) => <span className={book.nowrap}>{issuesLabel(r.facts.issues)}</span>,
    },
    {
      key: "tag",
      label: "Nhãn",
      render: (_v, r) =>
        r.facts.tag ? (
          <Badge tone={TAG_TONE[r.facts.tag.tone]} size="sm">
            {r.facts.tag.label}
          </Badge>
        ) : (
          "—"
        ),
    },
    { key: "last", label: "Đơn gần nhất", render: (_v, r) => <LastOrderCell facts={r.facts} /> },
    // v3 names this column for assistive tech only; each menu names its customer.
    // 60: the 36px trigger and the compact cell's 12px either side.
    { key: "actions", label: "", width: 60, render: (_v, r) => rowMenu(r.customer) },
  ];
  // v3 does not sort: the list is in the order it was read, oldest account
  // first, and a sort in the browser would only ever sort one page.
  const columns = columnList.map((c) => ({ ...c, sortable: false }));

  const rows = paged.rows.map<Row>(({ customer, facts }) => ({ id: customer.id, customer, facts }));

  const table = (
    <>
      <SortableDataTable
        rows={rows}
        columns={columns}
        rowKey="id"
        caption="Khách hàng"
        emptyMessage="Không có khách nào khớp."
        holdWidths={false}
        density="compact"
        showCount={false}
      />
      {paged.total > 0 && (
        <div className={book.foot}>
          <p className={book.shown}>
            Hiện {paged.rows.length} / {paged.total} khách · tổng chi tính từ đơn đã thanh toán, chưa
            trừ hoàn tiền
          </p>
          <SegmentedControl
            label="Số dòng mỗi trang"
            options={PER_OPTIONS}
            value={String(perPageOf(view.per))}
            onValueChange={(v) => go({ per: v, page: null })}
          />
          {paged.pages > 1 && (
            <div className={book.pages}>
              <Pagination
                page={paged.page}
                pageCount={paged.pages}
                onPageChange={(n) => go({ page: n === 1 ? null : n })}
              />
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className={page.page}>
      <header className={page.header}>
        <div className={page.headRow}>
          <h1 className={page.title}>Khách hàng</h1>
          <div className={page.actions}>
            <Badge size="sm">Dữ liệu mẫu</Badge>
            <Button variant="secondary" size="sm" onClick={() => downloadCsv("khach-hang.csv", csvRows)}>
              <Download {...ICON} />
              Tải CSV
            </Button>
          </div>
        </div>
      </header>

      <Tabs
        value={group}
        onValueChange={(v) => go({ group: v === "all" ? null : v, page: null }, "replace")}
      >
        <TabsList aria-label="Nhóm">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label} <span className={book.tabCount}>{count(t.value)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className={book.toolbarSlot}>
          <div className={book.toolbar}>
            <div className={book.search}>
              <ArcSearchBox
                label="Tìm khách"
                placeholder="Tìm tên, số điện thoại, email"
                value={view.q ?? ""}
                onSubmit={(v) => go({ q: v || null, page: null }, "replace")}
              />
            </div>
          </div>
        </div>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            {table}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** The monogram and the name, the row's key: 500, on one line. */
function WhoCell({ customer }: { customer: AdminCustomer }) {
  return (
    <span className={book.who}>
      <Avatar name={monogramName(customer.name)} size="sm" aria-hidden="true" />
      <span className={styles.name}>{customer.name}</span>
    </span>
  );
}

/** The number, and the email under it. A sign-up gives no number: the form does not ask. */
function ContactCell({ customer }: { customer: AdminCustomer }) {
  return (
    <span className={book.stack}>
      {customer.phone && <span className={book.nowrap}>{formatPhone(customer.phone)}</span>}
      <span className={`${book.line} ${book.nowrap}`}>{customer.email}</span>
    </span>
  );
}

/** "20/09 · DH-2431" with the state it is in under it, or nothing yet. */
function LastOrderCell({ facts }: { facts: CustomerFacts }) {
  if (!facts.last) return <>—</>;
  const s = STATE_LABEL[facts.last.status.state];
  return (
    <span className={book.stack}>
      <span className={`${book.nowrap} ${book.num}`}>
        {dayMonth(facts.last.placedAt)} · <CodeCell code={String(facts.last.code)} />
      </span>
      <span className={`${book.line} ${book.nowrap}`}>{s.text}</span>
    </span>
  );
}
