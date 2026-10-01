"use client";

import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useRef, useTransition } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import {
  LOG_FILTERS,
  diffText,
  inFilter,
  logFilter,
  logHaystack,
  logRows,
  logStamp,
  mergeLogRows,
  scheduleRows,
  withinDays,
  type LogRow,
} from "@/lib/activity-log";
import type { AdminOrder } from "@/lib/admin-orders";
import { hrefWith, patched, type Query } from "@/lib/admin-url";
import { downloadCsv } from "@/lib/csv";
import type { AdminEvent } from "@/lib/db/event-dto";
import { LEX } from "@/lib/lexicon";
import { Badge } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import { EmptyState } from "@/registry/components/empty-state/empty-state";
import {
  FilterMenu,
  FilterToolbar,
  type FilterChip,
  type FilterField,
} from "@/registry/components/filter-toolbar/filter-toolbar";
import SegmentedControl from "@/registry/components/segmented-control/segmented-control";
import {
  SortableDataTable,
  type DataColumn,
} from "@/registry/components/sortable-data-table/sortable-data-table";
import styles from "./ArcLogScreen.module.css";
import page from "./ArcPage.module.css";
import { ArcSearchBox } from "./ArcSearchBox";

const PATH = "/admin/log";

/**
 * How far back "the recent past" reaches on this screen: the segment, its
 * count and the line under the table (v3's `LOG_WINDOW_DAYS`). It is NOT
 * `RETURN_WINDOW_DAYS`, which happens to be seven as well: that one is a
 * promise to a shopper, this one is how much log a shop looks at.
 */
const LOG_WINDOW_DAYS = 7;

/** The one field of "Thêm bộ lọc", and its chip's label (v3's `ChipMenu`). */
const KIND = "Loại thao tác";

/** Its values: v3's menu without "Tất cả", which is the state with no chip. */
const KINDS = LOG_FILTERS.filter((f) => f.value !== "all");

/** The time segments. "Tất cả" is v3's state with neither chip on. */
type Span = "all" | "today" | "week";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** One row of the table: the log's row, keyed by its stable id. */
type Row = { id: string; entry: LogRow };

/** "chờ chuyển khoản → **đã thanh toán** · 1.272.000₫": v3's cell, the state it went to in the heavier weight. */
function Change({ row }: { row: LogRow }) {
  return (
    <span className={styles.change}>
      {row.before && row.after ? (
        <>
          {row.before} → <b>{row.after}</b>
        </>
      ) : (
        row.after && <b>{row.after}</b>
      )}
      {row.tail && (
        <>
          {(row.before || row.after) && " · "}
          {row.tail}
        </>
      )}
    </span>
  );
}

/** The table's columns: v3's five, none sortable (the log is newest first, and that is its order). */
const COLUMNS: DataColumn<Row>[] = [
  {
    key: "at",
    label: "Lúc",
    sortable: false,
    render: (_v, r) => <span className={styles.nowrap}>{logStamp(r.entry.at)}</span>,
  },
  {
    key: "action",
    label: "Thao tác",
    sortable: false,
    render: (_v, r) => (
      <span className={styles.stack}>
        <span className={styles.action}>{r.entry.action}</span>
        {r.entry.detail && <span className={styles.line}>{r.entry.detail}</span>}
      </span>
    ),
  },
  {
    key: "subject",
    label: "Đối tượng",
    sortable: false,
    render: (_v, r) =>
      r.entry.href ? (
        <Link className={styles.link} href={r.entry.href}>
          {r.entry.subject}
        </Link>
      ) : (
        <span className={styles.text}>{r.entry.subject}</span>
      ),
  },
  { key: "change", label: "Trước → sau", sortable: false, render: (_v, r) => <Change row={r.entry} /> },
  {
    key: "author",
    label: "Ai",
    sortable: false,
    render: (_v, r) => <span className={styles.nowrap}>{r.entry.author}</span>,
  },
];

/**
 * "Nhật ký thao tác" in the Arc frame (round v5 slice 2): v3's
 * `ActivityLogScreen` (`components/admin/ActivityLogScreen.tsx`) rule for rule
 * and word for word, drawn with Arc's parts.
 *
 * The record is the `events` table, read by `lib/activity-log.ts` together
 * with what the clock has decided that nobody wrote down yet; that module
 * holds every rule and is tested without a DOM. "Ai" is the hand that acted:
 * "Cửa hàng", "Khách", or "Hệ thống" for the clock and a script, which the
 * line under the table says out loud, as v3 did.
 *
 * EVERY FILTER IS IN THE ADDRESS (QĐ-8): the kind (`?kind=`), the span of
 * time (`?today=1`, `?week=1`) and the search (`?q=`). A change shows at once
 * (`useOptimistic`) and the address follows in a transition; the kind and the
 * span push, as v3's links did, and the search replaces, as v3's did. The
 * filter's own look is the order book's (slice 0): the search first, "Thêm
 * bộ lọc", a chip only while a kind is on. The span is a segmented control at
 * the far end, "Tất cả" being v3's state with neither chip on.
 *
 * No pagination, as in v3: the server reads the newest five hundred events,
 * and the log starts again at every reset.
 */
export function ArcLogScreen({
  events,
  orders,
  nowIso,
  query,
}: {
  /** The log, newest first, from the database. */
  events: AdminEvent[];
  /** The order book, which names each order's customer and contents. */
  orders: AdminOrder[];
  nowIso: string;
  query: Query;
}) {
  const catalog = useCatalog();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [view, setView] = useOptimistic(query);
  const [, startNavigation] = useTransition();

  /** Change the address: shown now, confirmed by the server render that follows. */
  function go(patch: Record<string, string | null>, mode: "push" | "replace" = "push") {
    const next = patched(view, patch);
    startNavigation(() => {
      setView(next);
      router[mode](hrefWith(PATH, next), { scroll: false });
    });
  }

  const all = useMemo(
    () =>
      mergeLogRows(
        logRows(catalog, events, orders, now),
        scheduleRows(catalog, catalog.drops, catalog.products, now),
      ),
    [catalog, events, orders, now],
  );
  const filter = logFilter(view.kind);
  const today = view.today === "1";
  const week = view.week === "1";
  const span: Span = today ? "today" : week ? "week" : "all";
  const text = (view.q ?? "").trim().toLocaleLowerCase("vi");

  const byKind = all.filter((r) => inFilter(filter, r));
  const windowed = today
    ? withinDays(byKind, 1, now)
    : week
      ? withinDays(byKind, LOG_WINDOW_DAYS, now)
      : byKind;
  const rows = text ? windowed.filter((r) => logHaystack(r).includes(text)) : windowed;

  const csvRows = [
    ["Lúc", "Thao tác", "Chi tiết", "Đối tượng", "Trước → sau", "Ai"],
    ...rows.map((r) => [logStamp(r.at), r.action, r.detail ?? "", r.subject, diffText(r), r.author]),
  ];

  // ── "Thêm bộ lọc": one field, the kinds with their counts ──────────────
  const fields = useMemo<FilterField[]>(
    () => [
      {
        id: "kind",
        label: KIND,
        options: KINDS.map((f) => ({
          value: f.value,
          label: f.label,
          hint: all.filter((r) => inFilter(f.value, r)).length,
        })),
      },
    ],
    [all],
  );
  const chips = useMemo<FilterChip[]>(
    () =>
      filter === "all"
        ? []
        : [{ id: "kind", label: KIND, value: LOG_FILTERS.find((f) => f.value === filter)?.label }],
    [filter],
  );

  /** The menu hands back the label it showed; the address wants the value behind it. */
  function addFilter(chip: FilterChip) {
    const kind = KINDS.find((f) => f.label === chip.value);
    if (kind) go({ kind: kind.value });
  }

  // The chip's box leaves the row with the chip. Arc hands focus to the
  // "Thêm bộ lọc" trigger inside its own toolbar, which this row does not
  // use, so a keyboard user who removed the chip is handed to the standalone
  // menu's trigger instead of to the page (the order book's rule, slice 0).
  const menuSlot = useRef<HTMLDivElement>(null);
  const chipsSlot = useRef<HTMLDivElement>(null);
  const refocusMenu = useRef(false);
  function dropKind() {
    if (chipsSlot.current?.contains(document.activeElement)) refocusMenu.current = true;
    go({ kind: null });
  }
  useEffect(() => {
    if (!refocusMenu.current || chips.length > 0) return;
    refocusMenu.current = false;
    menuSlot.current?.querySelector<HTMLElement>("[data-filter-trigger]")?.focus();
  }, [chips.length]);

  const spans = [
    { value: "all", label: "Tất cả" },
    {
      value: "today",
      label: "Hôm nay",
      accessory: <span className={styles.spanCount}>{withinDays(byKind, 1, now).length}</span>,
    },
    {
      value: "week",
      label: `${LOG_WINDOW_DAYS} ngày`,
      accessory: (
        <span className={styles.spanCount}>{withinDays(byKind, LOG_WINDOW_DAYS, now).length}</span>
      ),
    },
  ];

  const tableRows = rows.map<Row>((r) => ({ id: r.id, entry: r }));

  return (
    <div className={page.page}>
      <header className={page.header}>
        <div className={page.headRow}>
          <h1 className={page.title}>Nhật ký thao tác</h1>
          <div className={page.actions}>
            <Badge size="sm">Dữ liệu mẫu</Badge>
            <Button variant="secondary" size="sm" onClick={() => downloadCsv("nhat-ky.csv", csvRows)}>
              <Download {...ICON} />
              Tải CSV
            </Button>
          </div>
        </div>
      </header>

      <div className={styles.list}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <ArcSearchBox
              label="Tìm trong nhật ký"
              placeholder="Tìm mã đơn, mã giảm giá, mẫu"
              value={view.q ?? ""}
              onSubmit={(v) => go({ q: v || null }, "replace")}
            />
          </div>
          <div className={styles.menuSlot} ref={menuSlot}>
            <FilterMenu fields={fields} active={chips} onSelect={addFilter} align="start" />
          </div>
          {/* The chip and "Xoá hết" only while a kind is on: an empty box
              beside the search read as a second field (slice 0). */}
          {chips.length > 0 && (
            <div className={styles.chips} ref={chipsSlot}>
              <FilterToolbar filters={chips} onRemove={dropKind} onClearAll={dropKind} />
            </div>
          )}
          <div className={styles.spanSlot}>
            <SegmentedControl
              label="Khoảng thời gian"
              options={spans}
              value={span}
              onValueChange={(v) =>
                go({ today: v === "today" ? "1" : null, week: v === "week" ? "1" : null })
              }
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={styles.empty}>
            <EmptyState
              icon={<FileText size={24} strokeWidth={1.75} aria-hidden="true" />}
              title="Chưa có thao tác nào"
              description={`Mọi thao tác trên đơn hàng, tồn kho, ${LEX.tl} và mã giảm giá hiện ở đây, kèm việc khách tự làm và việc suy từ đồng hồ và dữ liệu.`}
            />
          </div>
        ) : (
          <>
            <div className={styles.table}>
              <SortableDataTable
                rows={tableRows}
                columns={COLUMNS}
                rowKey="id"
                caption="Nhật ký thao tác"
                density="compact"
                holdWidths={false}
                showCount={false}
              />
            </div>
            <p className={styles.foot}>
              {rows.length} thao tác
              {today ? " hôm nay" : week ? ` trong ${LOG_WINDOW_DAYS} ngày` : ""} · “Hệ thống” là việc
              suy từ đồng hồ và dữ liệu, không ai bấm
            </p>
          </>
        )}
      </div>
    </div>
  );
}
