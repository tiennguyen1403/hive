"use client";

import { Check, Columns3, Download, Eye, MoreHorizontal, Printer, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Catalog } from "@/lib/catalog";
import type { Order, OrderState, PaymentMethod } from "@/data/types";
import { cancelOrderAdmin, markPaid } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/state";
import { needsAction, recentOrders } from "@/lib/admin-metrics";
import { canCancel, nextMove, type AdminOrder } from "@/lib/admin-orders";
import { orderItemsLabel, orderItemsLang } from "@/lib/admin-rows";
import { hrefWith, pageOf, paginate, patched, PER_PAGE_CHOICES, perPageOf, type Query } from "@/lib/admin-url";
import { downloadCsv } from "@/lib/csv";
import { effectiveOrder } from "@/lib/customer-orders";
import { issueOf } from "@/lib/customer-tags";
import { picker, plural, type Locale, type Pair } from "@/lib/i18n";
import { issueLabel, lexicon } from "@/lib/lexicon";
import { plainVnd } from "@/lib/money";
import { adminPaymentLabel, stateTabLabel } from "@/lib/order-labels";
import { orderTotalVnd } from "@/lib/orders";
import { ordersCsvName, ordersCsvRows } from "@/lib/orders-csv";
import { Badge } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import { Checkbox } from "@/registry/components/checkbox/checkbox";
import { DropdownMenu, type DropdownItem } from "@/registry/components/dropdown-menu/dropdown-menu";
import {
  FilterMenu,
  FilterToolbar,
  type FilterChip,
  type FilterField,
  type FilterOption,
} from "@/registry/components/filter-toolbar/filter-toolbar";
import { Pagination } from "@/registry/components/pagination/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/components/popover/popover";
import SegmentedControl from "@/registry/components/segmented-control/segmented-control";
import {
  SortableDataTable,
  type DataColumn,
} from "@/registry/components/sortable-data-table/sortable-data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/components/tabs/tabs";
import { ArcButtonLink } from "./ArcButtonLink";
import { ArcCancelOrderDialog } from "./ArcCancelOrderDialog";
import {
  AddressCell,
  AmountCell,
  CodeCell,
  CustomerCell,
  ItemsCell,
  PaymentCell,
  PlacedCell,
  StatusCell,
} from "./ArcOrderCells";
import styles from "./ArcOrdersScreen.module.css";
import { ArcSearchBox } from "./ArcSearchBox";
import { useAdminCols } from "./useAdminCols";
import { useArcToast } from "./useArcToast";

const PATH = "/admin/orders";

/** The Tabs value of "Tất cả": a tab needs a string, the address needs no `state`. */
const ALL = "all";

/**
 * The tabs, in the order an order passes through them (v3), named in the page's
 * language: the glossary's states (`stateTabLabel`), the waiting one "Chờ
 * thanh toán" / "Awaiting payment" since slice B18 — it holds the transfers
 * and the card orders waiting for their money alike.
 */
const TAB_STATES: Array<OrderState | null> = [
  null,
  "AWAITING_TRANSFER",
  // A COD order checkout took, waiting on the shop, and a card order taken
  // before slice B7, when card orders were RECEIVED.
  "RECEIVED",
  "PAID",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];

/** "Tất cả": every tab but the states'. */
const ALL_WORD: Pair = { vi: "Tất cả", en: "All" };

/** "Thanh toán" in the Add filter menu: v3's three methods, in v3's order, the glossary's words. */
function payOptions(locale: Locale): FilterOption[] {
  return (["BANK_TRANSFER", "COD", "CARD"] as PaymentMethod[]).map((value) => ({
    value,
    label: adminPaymentLabel(value, locale),
  }));
}

/** The optional columns, and the two v3 leaves ticked. */
const COLS: Array<{ key: string; label: Pair }> = [
  { key: "items", label: { vi: "Món", en: "Items" } },
  { key: "payment", label: { vi: "Thanh toán", en: "Payment" } },
  { key: "address", label: { vi: "Địa chỉ", en: "Address" } },
  { key: "promo", label: { vi: "Mã giảm giá", en: "Discount code" } },
];

/** "Thanh toán", the payment column and filter; "Mã giảm giá", the code column. */
const PAYMENT_WORD: Pair = { vi: "Thanh toán", en: "Payment" };
const COLS_DEFAULT = ["items", "payment"];

const PER_OPTIONS = PER_PAGE_CHOICES.map((n) => ({ value: String(n), label: String(n) }));

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** One row of the table: the order, keyed by its code. */
type Row = { code: string; total: number; order: AdminOrder };

/**
 * The order book in the Arc frame (round v5 slice 0), in place of the v3
 * `AdminOrdersScreen`, which it follows rule for rule: the same book
 * (`admin_orders()` through `listAllOrders`), read through `effectiveOrder`
 * so a transfer past its twelve hours is Đã huỷ everywhere; the same counts,
 * moves and sentences.
 *
 * EVERY FILTER IS IN THE ADDRESS (QĐ-8): the tab, the search, the payment
 * method, the issue, the page and the rows per page. A change shows at once
 * (`useOptimistic`) and the address follows in a transition, so the server
 * render that arrives agrees with what is already on screen. The tab replaces
 * the address, as the brief asks; the rest push, as v3's links did. Which
 * columns are drawn stays on the device (`useAdminCols`), a preference of the
 * person rather than a description of the screen.
 *
 * Selection is by checkbox only: a click in a row follows the order's link or
 * selects its phone number (`selectOnRowClick={false}`, registry/PATCHES.md).
 * The columns keep the browser's automatic layout (`holdWidths={false}`): a
 * held, fixed layout squeezed v3's columns into mid-word breaks. The cells keep
 * v3's one-line rules on v3's 12px of padding (`density="compact"`), so the
 * default columns fit the card at 1280; with an optional column on, or at
 * 1180, the table scrolls inside its card.
 *
 * In the page's language since round v6 slice E4 (`useLocale()`): every word,
 * the tabs and filters in the glossary's terms, the amounts the English way
 * ("1,272,000"), the file "orders.csv" (`lib/orders-csv.ts`). The address and
 * the values the filters send do not change with it.
 */
export function ArcOrdersScreen({
  orders: book,
  nowIso,
  query,
}: {
  /** The order book, from the database (`admin_orders()`). */
  orders: AdminOrder[];
  nowIso: string;
  query: Query;
}) {
  const catalog = useCatalog();
  const locale = useLocale();
  const t = picker(locale);
  /** "Số" in the issue filter: "Drop" in English (the glossary). */
  const issueWord = lexicon(locale).t;
  const say = useArcToast();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [picked, setPicked] = useState<string[]>([]);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [pending, startAction] = useTransition();
  /** The screen, to find the tab that is open. */
  const root = useRef<HTMLDivElement>(null);
  /** Each row's menu, by order code, so the cancel dialog can hand focus back to its trigger. */
  const menus = useRef(new Map<string, HTMLElement>());
  /** The menu trigger that opened the cancel dialog. */
  const opener = useRef<HTMLElement | null>(null);
  const [, startNavigation] = useTransition();
  const [view, setView] = useOptimistic(query);
  const { cols, toggle } = useAdminCols(COLS_DEFAULT);

  const orders = useMemo(() => book.map((o) => effectiveOrder(o, now)), [book, now]);
  const all = useMemo(() => recentOrders(orders, orders.length), [orders]);

  /**
   * Run one Server Action and say what the server answered. The action
   * revalidates the area, so the table in its response is already the new
   * one. After an `await` the transition has to be restated
   * (react.dev/reference/react/useTransition).
   */
  function act(call: () => Promise<ActionState>, after?: () => void) {
    if (pending) return;
    startAction(async () => {
      const result = await call();
      startAction(() => {
        if (result.ok) after?.();
        say(result.message ?? result.errors.form ?? "", result.ok ? "ok" : "error");
      });
    });
  }

  /** Change the address: shown now, confirmed by the server render that follows. */
  function go(patch: Record<string, string | number | null>, mode: "push" | "replace" = "push") {
    const next = patched(view, patch);
    startNavigation(() => {
      setView(next);
      router[mode](hrefWith(PATH, next), { scroll: false });
    });
  }

  // ── the filters, all of them read off the address ──────────────────────
  const tab = (view.state as OrderState | undefined) ?? null;
  const pay = (view.pay as PaymentMethod | undefined) ?? null;
  const dropNo = view.drop ? Number(view.drop) : null;
  const customer = view.customer ?? null;
  const text = (view.q ?? "").trim().toLocaleLowerCase("vi");

  const issues = useMemo(
    () =>
      [...new Set(book.map((o) => issueOfOrder(catalog, o)))]
        // An order of fixed styles only (slice B5) belongs to no issue.
        .filter((n): n is number => n !== undefined)
        .sort((a, b) => b - a),
    [catalog, book],
  );

  const matches = (o: AdminOrder) => {
    if (pay && o.payment !== pay) return false;
    if (dropNo !== null && issueOfOrder(catalog, o) !== dropNo) return false;
    // `?customer=` is the account's key: its fixture handle, or its uuid.
    if (customer && o.owner?.handle !== customer && o.owner?.id !== customer) return false;
    if (!text) return true;
    return [
      String(o.code),
      o.owner?.name,
      o.owner?.phone,
      o.owner?.email,
      // An order placed signed out has no account: its own name and number.
      o.shipTo.recipient,
      o.shipTo.phone,
    ]
      .filter(Boolean)
      .some((v) => v!.toLocaleLowerCase("vi").includes(text));
  };

  const filtered = all.filter(matches);
  const shown = tab ? filtered.filter((o) => o.status.state === tab) : filtered;
  const page = paginate(shown, pageOf(view.page), perPageOf(view.per));
  const waiting = needsAction(all).length;

  // A code ticked on page 1 that the filter then hides must not stay in the
  // selection: the bulk bar would count rows nobody can see.
  const visible = new Set(page.rows.map((o) => String(o.code)));
  useEffect(() => {
    setPicked((p) => p.filter((c) => visible.has(c)));
    // The selection resets when the page or the filter does, which is
    // exactly when the address changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.state, view.page, view.per, view.pay, view.drop, view.q]);

  const chosen = page.rows.filter((o) => picked.includes(String(o.code)));


  /** The orders the shop could print a slip for right now. */
  const readyToPack = all.filter((o) => o.status.state === "PAID").map((o) => String(o.code));

  // ── the filter chips: Thanh toán and Số, each with its own key ─────────
  const chips = useMemo<FilterChip[]>(
    () => [
      ...(pay ? [{ id: "pay", label: picker(locale)(PAYMENT_WORD), value: adminPaymentLabel(pay, locale) }] : []),
      ...(dropNo !== null ? [{ id: "drop", label: issueWord, value: issueLabel(dropNo, locale) }] : []),
    ],
    [pay, dropNo, locale, issueWord],
  );
  const fields = useMemo<FilterField[]>(
    () => [
      { id: "pay", label: picker(locale)(PAYMENT_WORD), options: payOptions(locale) },
      {
        id: "drop",
        label: issueWord,
        options: issues.map((n) => ({ value: String(n), label: issueLabel(n, locale) })),
      },
    ],
    [issues, locale, issueWord],
  );

  /** The menu hands back the label it showed; the address wants the value behind it. */
  function addFilter(chip: FilterChip, field: FilterField) {
    const option = field.options
      .map((o) => (typeof o === "string" ? { value: o } : o))
      .find((o) => (o.label ?? o.value) === chip.value);
    if (option) go({ [field.id]: option.value, page: null });
  }

  // The chips' box leaves the row with its last chip. Arc hands focus to the
  // "Thêm bộ lọc" trigger inside its own toolbar, which this row does not
  // use, so a keyboard user who removed the last chip is handed to the
  // standalone menu's trigger instead of to the page.
  const menuSlot = useRef<HTMLDivElement>(null);
  const chipsSlot = useRef<HTMLDivElement>(null);
  const refocusMenu = useRef(false);
  function dropFilters(patch: Record<string, null>) {
    const left = chips.filter((c) => !(c.id in patch));
    if (left.length === 0 && chipsSlot.current?.contains(document.activeElement)) refocusMenu.current = true;
    go({ ...patch, page: null });
  }
  useEffect(() => {
    if (!refocusMenu.current || chips.length > 0) return;
    refocusMenu.current = false;
    menuSlot.current?.querySelector<HTMLElement>("[data-filter-trigger]")?.focus();
  }, [chips.length]);

  // Built on every render, like v3's table: the cells read `now`, the pending
  // move and the row menu's callbacks. Arc holds the column widths by the
  // columns' keys, which only change when "Cột" does.
  const columnList: Array<DataColumn<Row> | false> = [
    { key: "code", label: t({ vi: "Mã đơn", en: "Order" }), render: (_v, r) => <CodeCell code={r.code} /> },
    { key: "customer", label: t({ vi: "Khách", en: "Customer" }), render: (_v, r) => <CustomerCell order={r.order} /> },
    { key: "placedAt", label: t({ vi: "Thời gian", en: "Placed" }), render: (_v, r) => <PlacedCell order={r.order} /> },
    cols.includes("items") && {
      key: "items",
      label: t(COLS[0]!.label),
      render: (_v, r) => (
        <ItemsCell label={orderItemsLabel(catalog, r.order, locale)} lang={orderItemsLang(catalog, r.order, locale)} />
      ),
    },
    {
      key: "total",
      label: t({ vi: "Giá trị", en: "Total" }),
      numeric: true,
      render: (_v, r) => <AmountCell text={plainVnd(r.total, locale)} />,
    },
    cols.includes("payment") && {
      key: "payment",
      label: t(COLS[1]!.label),
      render: (_v, r) => <PaymentCell order={r.order} />,
    },
    cols.includes("address") && {
      key: "address",
      label: t(COLS[2]!.label),
      render: (_v, r) => <AddressCell order={r.order} />,
    },
    cols.includes("promo") && {
      key: "promo",
      label: t(COLS[3]!.label),
      render: (_v, r) => <ItemsCell label={r.order.promo ?? "—"} />,
    },
    {
      key: "status",
      label: t({ vi: "Trạng thái", en: "Status" }),
      render: (_v, r) => <StatusCell order={r.order} now={now} />,
    },
    // v3 names this column for assistive tech only; each menu names its order.
    // 60: the 36px trigger and the compact cell's 12px either side.
    { key: "actions", label: "", width: 60, render: (_v, r) => rowMenu(r.order) },
  ];
  // v3 does not sort: the book is paged in the server's order, and a sort in
  // the browser would only ever sort one page.
  const columns = columnList
    .filter((c): c is DataColumn<Row> => c !== false)
    .map((c) => ({ ...c, sortable: false }));

  function rowMenu(o: AdminOrder) {
    const code = String(o.code);
    const items: DropdownItem[] = [
      {
        label: t({ vi: "Mở chi tiết", en: "Open details" }),
        icon: <Eye {...ICON} />,
        onSelect: () => router.push(`/admin/orders/${code}`),
      },
      ...(nextMove(o, now) === "MARK_PAID"
        ? [
            {
              label: t({ vi: "Đã nhận tiền", en: "Mark as paid" }),
              icon: <Check {...ICON} />,
              onSelect: () => act(() => markPaid([code])),
            },
          ]
        : []),
      {
        label: t({ vi: "In phiếu giao", en: "Print delivery slip" }),
        icon: <Printer {...ICON} />,
        onSelect: () => router.push(`/admin/slips?codes=${code}`),
      },
      // No "Gửi lại xác nhận" here: no mail server is connected, so it could
      // only pretend. The order's own screen draws it disabled and says why.
      ...(canCancel(o, now)
        ? [
            {
              label: t({ vi: "Huỷ đơn", en: "Cancel order" }),
              icon: <X {...ICON} />,
              destructive: true,
              separatorBefore: true,
              onSelect: () => {
                opener.current = menus.current.get(code)?.querySelector("button") ?? null;
                setCancelling(o);
              },
            },
          ]
        : []),
    ];
    return (
      <span
        className={styles.rowMenu}
        ref={(el) => {
          if (el) menus.current.set(code, el);
          else menus.current.delete(code);
        }}
      >
        <DropdownMenu
          iconOnly
          label={t({ vi: `Thao tác ${code}`, en: `Actions for ${code}` })}
          icon={<MoreHorizontal {...ICON} />}
          items={items}
        />
      </span>
    );
  }

  /**
   * Radix hands focus back only to a `DialogTrigger`, and the cancel dialog
   * opens from a row menu (slice 5b, as the issues and the styles do). Back
   * to that menu; when its row has left the table (a cancelled order leaves
   * the tab of the orders waiting), to the tab that is open instead of to
   * the top of the page.
   */
  function returnFocus(event: Event) {
    const back = opener.current?.isConnected
      ? opener.current
      : (root.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ?? null);
    if (!back) return;
    event.preventDefault();
    back.focus();
  }

  const rows = page.rows.map<Row>((o) => ({ code: String(o.code), total: orderTotalVnd(o), order: o }));

  const table = (
    <>
      <div className={styles.book}>
        <SortableDataTable
          rows={rows}
          columns={columns}
          rowKey="code"
          caption={t({ vi: "Đơn hàng", en: "Orders" })}
          emptyMessage={t({ vi: "Không có đơn nào khớp.", en: "No orders match." })}
          selectable
          holdWidths={false}
          density="compact"
          selectOnRowClick={false}
          showCount={false}
          selectedKeys={picked}
          onSelectionChange={setPicked}
          rowAttributes={(r) => ({
            "data-cancelled": r.order.status.state === "CANCELLED" ? "" : undefined,
          })}
        />
      </div>
      {page.total > 0 && (
        <div className={styles.foot}>
          <p className={styles.shown}>
            {t<React.ReactNode>({
              vi: (
                <>
                  Hiện {page.rows.length} / {page.total} đơn
                </>
              ),
              en: `Showing ${page.rows.length} of ${plural(page.total, "order", "orders")}`,
            })}
          </p>
          <SegmentedControl
            label={t({ vi: "Số dòng mỗi trang", en: "Rows per page" })}
            options={PER_OPTIONS}
            value={String(perPageOf(view.per))}
            onValueChange={(v) => go({ per: v, page: null })}
          />
          {page.pages > 1 && (
            <div className={styles.pages}>
              <Pagination
                page={page.page}
                pageCount={page.pages}
                onPageChange={(n) => go({ page: n === 1 ? null : n })}
              />
            </div>
          )}
        </div>
      )}
    </>
  );

  const bulk = picked.length > 0;

  return (
    <div className={styles.page} ref={root}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{t({ vi: "Đơn hàng", en: "Orders" })}</h1>
          <p className={styles.sub}>
            {t<React.ReactNode>({ vi: <>{waiting} cần xử lý</>, en: `${waiting} to process` })}
          </p>
        </div>
        <div className={styles.actions}>
          <Badge size="sm">{t({ vi: "Dữ liệu mẫu", en: "Demo data" })}</Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadCsv(ordersCsvName(locale), ordersCsvRows(catalog, shown, locale))}
          >
            <Download {...ICON} />
            {t({ vi: "Tải CSV", en: "Download CSV" })}
          </Button>
          {readyToPack.length > 0 && (
            <ArcButtonLink
              variant="secondary"
              size="sm"
              href={`/admin/slips?codes=${readyToPack.join(",")}`}
            >
              <Printer {...ICON} />
              {t({ vi: "In phiếu giao", en: "Print delivery slips" })}
            </ArcButtonLink>
          )}
        </div>
      </header>

      <Tabs
        value={tab ?? ALL}
        onValueChange={(v) => go({ state: v === ALL ? null : v, page: null }, "replace")}
      >
        <TabsList aria-label={t({ vi: "Trạng thái", en: "Status" })}>
          {TAB_STATES.map((state) => (
            <TabsTrigger key={state ?? ALL} value={state ?? ALL}>
              {state ? stateTabLabel(state, locale) : t(ALL_WORD)}{" "}
              <span className={styles.tabCount}>
                {state ? filtered.filter((o) => o.status.state === state).length : filtered.length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className={styles.toolbarSlot}>
          <div className={styles.toolbar} inert={bulk || undefined}>
            <div className={styles.search}>
              <ArcSearchBox
                label={t({ vi: "Tìm đơn", en: "Search orders" })}
                placeholder={t({ vi: "Tìm mã đơn, tên, số điện thoại", en: "Search order code, name, phone" })}
                value={view.q ?? ""}
                onSubmit={(v) => go({ q: v || null, page: null }, "replace")}
              />
            </div>
            <div className={styles.menuSlot} ref={menuSlot}>
              <FilterMenu fields={fields} active={chips} onSelect={addFilter} align="start" />
            </div>
            {/* The chips and "Xoá hết" only once a filter is on: an empty box
                beside the search read as a second field. */}
            {chips.length > 0 && (
              <div className={styles.chips} ref={chipsSlot}>
                <FilterToolbar
                  filters={chips}
                  onRemove={(id) => dropFilters({ [id]: null })}
                  onClearAll={() => dropFilters({ pay: null, drop: null })}
                />
              </div>
            )}
            <div className={styles.columnsSlot}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Columns3 {...ICON} />
                    {t({ vi: "Cột", en: "Columns" })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" aria-label={t({ vi: "Cột", en: "Columns" })} className={styles.columns}>
                  {COLS.map((c) => (
                    <Checkbox
                      key={c.key}
                      label={t(c.label)}
                      checked={cols.includes(c.key)}
                      onCheckedChange={() => toggle(c.key)}
                    />
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {bulk && (
            <div className={styles.bulk}>
              <p className={styles.bulkCount}>
                {t<React.ReactNode>({
                  vi: <>{picked.length} đơn đã chọn</>,
                  en: `${plural(picked.length, "order", "orders")} selected`,
                })}
              </p>
              <Button
                variant="secondary"
                size="sm"
                loading={pending}
                onClick={() => {
                  /* Only an order whose money is still to come can be
                     confirmed: a transfer inside its hold, a card order taken
                     (`nextMove`). The button stays when the selection holds
                     none and says which rows it would have applied to. */
                  const unpaid = chosen.filter((o) => nextMove(o, now) === "MARK_PAID");
                  if (unpaid.length === 0) {
                    return say(
                      t({
                        vi: "Chỉ đơn đang chờ tiền mới đánh dấu được. Chưa chọn đơn nào như vậy",
                        en: "Only orders awaiting payment can be marked as paid, and none of these are",
                      }),
                      "error",
                    );
                  }
                  act(
                    () => markPaid(unpaid.map((o) => String(o.code))),
                    () => setPicked([]),
                  );
                }}
              >
                {pending ? null : <Check {...ICON} />}
                {pending ? t({ vi: "Đang lưu…", en: "Saving…" }) : t({ vi: "Đã nhận tiền", en: "Mark as paid" })}
              </Button>
              <ArcButtonLink
                variant="secondary"
                size="sm"
                href={`/admin/slips?codes=${picked.join(",")}`}
              >
                <Printer {...ICON} />
                {t({ vi: "In phiếu giao", en: "Print delivery slips" })}
              </ArcButtonLink>
              <Button variant="ghost" size="sm" onClick={() => setPicked([])}>
                <X {...ICON} />
                {t({ vi: "Bỏ chọn", en: "Clear selection" })}
              </Button>
            </div>
          )}
        </div>

        {TAB_STATES.map((state) => (
          <TabsContent key={state ?? ALL} value={state ?? ALL}>
            {table}
          </TabsContent>
        ))}
      </Tabs>

      <ArcCancelOrderDialog
        order={cancelling}
        pending={pending}
        onCloseAutoFocus={returnFocus}
        onClose={() => setCancelling(null)}
        onConfirm={(reason, note) => {
          if (!cancelling) return;
          const code = String(cancelling.code);
          act(
            () => cancelOrderAdmin(code, reason, note),
            () => setCancelling(null),
          );
        }}
      />
    </div>
  );
}

/**
 * Which issue an order belongs to: the issue its first line was cut for, or
 * since slice B5 the first line that was cut for one (`issueOf`); none for an
 * order of fixed styles only.
 */
function issueOfOrder(catalog: Catalog, o: Order): number | undefined {
  return issueOf(catalog, o);
}
