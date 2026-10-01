"use client";

import { BookOpen, Calendar, Clock, Download, Eye, MoreHorizontal, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition, type Ref } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import { SIZES, type Drop, type Product, type Teaser } from "@/data/types";
import { addDrop, addTeaser, closeDropNow, scheduleDrop } from "@/lib/actions/catalog-admin";
import type { ActionState } from "@/lib/actions/state";
import { stockAlerts } from "@/lib/admin-metrics";
import type { AdminOrder } from "@/lib/admin-orders";
import { dropRows, type DropRow } from "@/lib/admin-rows";
import { teasersIn } from "@/lib/catalog";
import { nextDropNo, proposedWindow } from "@/lib/catalog-admin";
import { downloadCsv } from "@/lib/csv";
import { clockLabel, dayMonth, dayMonthYear } from "@/lib/datetime";
import { closesInLabel, dropState, opensInLabel } from "@/lib/drop";
import {
  LOW_STOCK_AT,
  dropRevenueVnd,
  dropSummary,
  isSoldOut,
  onHand,
  productsInDrop,
  soldOutSizes,
  soldUnits,
  type IssueStyle,
} from "@/lib/inventory";
import { issueCsvName, issueCsvRows } from "@/lib/issue-csv";
import { LEX, issueLabel, issueNo, styleInList, styleName } from "@/lib/lexicon";
import { compactVnd, plainVnd, vnd } from "@/lib/money";
import { orderTotalVnd } from "@/lib/orders";
import { photoUrl } from "@/lib/photos";
import { soldOutTimes } from "@/lib/sold-out-times";
import type { TeaserDraft } from "@/lib/teaser-form";
import { Badge } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import { DropdownMenu, type DropdownItem } from "@/registry/components/dropdown-menu/dropdown-menu";
import {
  SortableDataTable,
  type DataColumn,
} from "@/registry/components/sortable-data-table/sortable-data-table";
import { ArcButtonLink } from "./ArcButtonLink";
import { ArcCloseDropDialog, type CloseTarget } from "./ArcCloseDropDialog";
import { ArcDropFormDialog, type DropFormTarget } from "./ArcDropFormDialog";
import styles from "./ArcDropsScreen.module.css";
import { ArcKpi } from "./ArcKpi";
import { ArcMeter } from "./ArcMeter";
import panel from "./ArcOrderScreen.module.css";
import book from "./ArcOrdersScreen.module.css";
import page from "./ArcPage.module.css";
import { ArcTeaserDialog } from "./ArcTeaserDialog";
import { ISSUE_STATE } from "./arc-issue-state";
import { useArcToast } from "./useArcToast";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * " · " between the entries a figure lists. The space before the dot is a
 * no-break one: a separator ends the line it is on and never starts the next
 * (v3 slice 13).
 */
const SEP = "\u00a0· ";

/**
 * Inside one entry every space is a no-break one ("S04 – SÓNG · hết 16/06",
 * "S05 – SƯƠNG còn 3"), so a list breaks only between its entries and an
 * entry is never split over two lines. The row of figures leaves each card
 * room for the widest entry (`.kpis`, a container query, in the module).
 */
const HOLD = "\u00a0";
const HOLD_SEP = "\u00a0·\u00a0";

/** Where an issue opens under the table: its number, padded, as the shop writes it. */
function detailHref(no: number): string {
  return `/admin/drops/${issueNo(no)}#detail`;
}

/** An issue's own address, `/admin/drops/05`: what `usePathname` reads once it is open. */
function issuePath(no: number): string {
  return `/admin/drops/${issueNo(no)}`;
}

/**
 * A switch to another issue under way, noted just before the address
 * changes: which issue, and whether its number or its row menu asked.
 *
 * `/admin/drops` and each `/admin/drops/NN` are route segments of their own,
 * so a switch renders a new screen, and the link or menu that had focus goes
 * with the old one: the browser drops focus to `<body>`. The new screen reads
 * this once, on mount, puts focus on the same control of its own table, and
 * forgets it. Module state on purpose, because it has to outlive the screen
 * that noted it. It is noted only when the address will change (the issue
 * already open does not render a new screen), honoured only for the issue it
 * names, only while focus is on `<body>` and only for a few seconds, so a
 * first load, or arriving from another screen, never has focus taken.
 */
let switching: { no: number; from: "link" | "menu"; at: number } | null = null;

/** How long a switch may take to land and still count as the one noted. */
const SWITCH_MS = 10_000;

/** One row of the issues table, keyed by a string so no column reads as a number. */
type IssueRow = { key: string; row: DropRow; drop: Drop };

/** One row of an issue's styles. */
type StyleRow = { id: string; product: IssueStyle };

/**
 * Every issue the shop has run, and one of them open underneath, in the Arc
 * frame (round v5 slice 4): v3's `AdminDropsScreen`
 * (`components/admin/AdminDropsScreen.tsx`) rule for rule and word for word,
 * drawn with Arc's parts, the order book's table (slice 0), the overview's
 * figures and bars (slice 2) and the codes' row menu (slice 3).
 *
 * The detail sits BELOW the table rather than on a screen of its own, so the
 * row somebody clicked stays in view while they read it; `/admin/drops/[no]`
 * is the same screen with another issue open, and `/admin/drops` opens the
 * one selling, else the newest. The open issue's row wears the tint Arc gives
 * a selected row, and its number says `aria-current`.
 *
 * Every figure is derived, through `lib/`, from the catalogue and the order
 * book the database holds, so this table cannot drift from what the shop
 * shows. THE STATE IS NEVER STORED: it is read off the two instants and the
 * clock (`lib/drop.ts`), which is why "Đóng sớm" is a closing hour moved to
 * now rather than a fourth state.
 *
 * Every button writes Postgres (slice B3b): "Tạo số" is `admin_add_drop()`,
 * "Sửa giờ" and "Đóng sớm" are `admin_schedule_drop()`, "Thêm mẫu hé lộ" is
 * `admin_add_teaser()`. Each answers with v3's sentence in the toast, and the
 * action revalidates, so the answer arrives with the table and the detail
 * already redrawn. "Sửa giờ" is offered on every issue, whatever its state,
 * as in v3: it is also how an issue closed early opens again.
 *
 * The three dialogs are Arc's `Dialog`, in the middle of the screen as v3's
 * sheets were at this width (brief §2). Each hands focus back, when it shuts,
 * to the button or the row menu that opened it.
 */
export function ArcDropsScreen({
  no,
  nowIso,
  orders,
}: {
  /** The issue asked for in the address, or null for `/admin/drops`. */
  no: number | null;
  nowIso: string;
  /** The order book, from the database: an issue's order count and sold-out hours are read off it. */
  orders: AdminOrder[];
}) {
  const catalog = useCatalog();
  const say = useArcToast();
  const router = useRouter();
  const pathname = usePathname();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [pending, startAction] = useTransition();

  // Each dialog keeps what it shows while it animates out; `open` alone shuts it.
  const [form, setForm] = useState<(DropFormTarget & { opening: number }) | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [closing, setClosing] = useState<CloseTarget | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [teasing, setTeasing] = useState<{ no: number; opening: number } | null>(null);
  const [teaseOpen, setTeaseOpen] = useState(false);

  /** What opened the dialog now open, for focus to go back to. */
  const opener = useRef<HTMLElement | null>(null);
  /** The detail's "Tải CSV số này": where focus goes when its "Đóng sớm" has gone with the issue it closed. */
  const fallback = useRef<HTMLButtonElement>(null);
  /** Each row's menu, by issue, so a dialog opened from it can hand focus back to its trigger. */
  const menus = useRef(new Map<number, HTMLElement>());
  /** Each row's number, by issue, for focus to land on after a switch. */
  const links = useRef(new Map<number, HTMLAnchorElement>());

  /**
   * Run one Server Action and say what the server answered. The action
   * revalidates everything, so the response that answers it already carries
   * the new table. After an `await` the transition has to be restated
   * (react.dev/reference/react/useTransition).
   */
  function act(call: () => Promise<ActionState>, after: () => void) {
    if (pending) return;
    startAction(async () => {
      const result = await call();
      startAction(() => {
        if (result.ok) after();
        say(result.message ?? result.errors.form ?? "", result.ok ? "ok" : "error");
      });
    });
  }

  /**
   * Radix hands focus back only to a `DialogTrigger`, and these dialogs are
   * opened from buttons and from row menus. Back to the one that opened it;
   * when that has gone ("Đóng sớm" leaves the detail once the issue is
   * closed), to the detail's first action instead of to the top of the page.
   */
  function returnFocus(event: Event) {
    const back = opener.current?.isConnected
      ? opener.current
      : fallback.current?.isConnected
        ? fallback.current
        : null;
    if (!back) return;
    event.preventDefault();
    back.focus();
  }

  /** The trigger of an issue's row menu, which opened the dialog asked for from it. */
  function menuOf(issue: number): HTMLElement | null {
    return menus.current.get(issue)?.querySelector("button") ?? null;
  }

  /** Note a switch before the address changes, when it will change (see `switching`). */
  function noteSwitch(issue: number, from: "link" | "menu") {
    if (pathname !== issuePath(issue)) switching = { no: issue, from, at: performance.now() };
  }

  function openForm(target: DropFormTarget, from: HTMLElement | null) {
    opener.current = from;
    setForm((f) => ({ ...target, opening: (f?.opening ?? 0) + 1 }));
    setFormOpen(true);
  }

  function openClose(drop: Drop, from: HTMLElement | null) {
    opener.current = from;
    setClosing({
      no: drop.no,
      closesAt: drop.closesAt,
      onHand: dropSummary(catalog, drop.no, catalog.products).onHand,
    });
    setCloseOpen(true);
  }

  function openTease(issue: number, from: HTMLElement | null) {
    opener.current = from;
    setTeasing((t) => ({ no: issue, opening: (t?.opening ?? 0) + 1 }));
    setTeaseOpen(true);
  }

  function downloadIssue(issue: number) {
    downloadCsv(issueCsvName(issue), issueCsvRows(catalog, issue, catalog.products));
  }

  // Newest number first, the order the table reads in.
  const drops = [...catalog.drops].sort((a, b) => b.no - a.no);
  const rows = dropRows(catalog, drops, now);
  const newNo = nextDropNo(drops);
  // Slice B3c: the day after the last issue closes, at its hour, for 14 days.
  const proposal = proposedWindow(drops, now);

  /** Which issue is open below: the one asked for, else the one selling, else the newest. */
  const openNo =
    no ??
    drops.find((d) => dropState(d, now) === "OPEN")?.no ??
    drops[0]?.no ??
    null;
  const drop = drops.find((d) => d.no === openNo);

  // The screen a switch rendered: focus back on the number or the menu that
  // asked for it, once (see `switching`).
  useEffect(() => {
    const wanted = switching;
    switching = null;
    if (!wanted || wanted.no !== openNo || performance.now() - wanted.at > SWITCH_MS) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    (wanted.from === "menu" ? menuOf(wanted.no) : (links.current.get(wanted.no) ?? null))?.focus();
    // On mount only: a later render of this screen is not a switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function rowMenu(row: DropRow, issue: Drop) {
    const items: DropdownItem[] = [
      {
        label: "Mở chi tiết",
        icon: <Eye {...ICON} />,
        onSelect: () => {
          noteSwitch(row.no, "menu");
          router.push(detailHref(row.no), { scroll: false });
        },
      },
      { label: "Tải CSV", icon: <Download {...ICON} />, onSelect: () => downloadIssue(row.no) },
      {
        label: "Sửa giờ",
        icon: <Calendar {...ICON} />,
        onSelect: () =>
          openForm(
            { mode: "edit", no: row.no, opensAt: issue.opensAt, closesAt: issue.closesAt },
            menuOf(row.no),
          ),
      },
      // The one that changes the shop at once goes last, set apart, as "Kết
      // thúc sớm" does on the codes (slice 3). Only an issue selling can close.
      ...(row.state === "OPEN"
        ? [
            {
              label: "Đóng sớm",
              icon: <Clock {...ICON} />,
              destructive: true,
              separatorBefore: true,
              onSelect: () => openClose(issue, menuOf(row.no)),
            },
          ]
        : []),
    ];
    return (
      <span
        className={styles.menu}
        ref={(el) => {
          if (el) menus.current.set(row.no, el);
          else menus.current.delete(row.no);
        }}
      >
        <DropdownMenu
          iconOnly
          label={`Thao tác ${issueLabel(row.no)}`}
          icon={<MoreHorizontal {...ICON} />}
          items={items}
        />
      </span>
    );
  }

  const columnList: DataColumn<IssueRow>[] = [
    {
      key: "no",
      label: LEX.t,
      render: (_v, x) => (
        <Link
          ref={(el) => {
            if (el) links.current.set(x.row.no, el);
            else links.current.delete(x.row.no);
          }}
          href={detailHref(x.row.no)}
          scroll={false}
          className={book.code}
          aria-current={x.row.no === openNo ? "true" : undefined}
          onClick={(e) => {
            // A click Next follows in this tab, not one that opens another tab.
            if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
              noteSwitch(x.row.no, "link");
            }
          }}
        >
          {issueNo(x.row.no)}
        </Link>
      ),
    },
    {
      key: "state",
      label: "Trạng thái",
      render: (_v, x) => (
        <Badge tone={ISSUE_STATE[x.row.state].tone} size="sm">
          {ISSUE_STATE[x.row.state].text}
        </Badge>
      ),
    },
    {
      key: "opens",
      label: "Mở",
      render: (_v, x) => (
        <span className={`${book.nowrap} ${book.num}`}>
          {clockLabel(x.drop.opensAt)} · {dayMonth(x.drop.opensAt)}
        </span>
      ),
    },
    {
      key: "closes",
      label: "Đóng",
      render: (_v, x) => (
        <span className={`${book.nowrap} ${book.num}`}>
          {clockLabel(x.drop.closesAt)} · {dayMonth(x.drop.closesAt)}
        </span>
      ),
    },
    {
      key: "styles",
      label: "Mẫu",
      numeric: true,
      // An issue before it opens holds no style yet: what is being teased, or nothing.
      render: (_v, x) => (
        <span className={book.nowrap}>
          {x.row.styles > 0 ? x.row.styles : x.row.teasers > 0 ? `${x.row.teasers} hé lộ` : "—"}
        </span>
      ),
    },
    {
      key: "cut",
      label: "Đã cắt",
      numeric: true,
      render: (_v, x) => (x.row.cutUnits > 0 ? x.row.cutUnits : "—"),
    },
    {
      key: "sold",
      label: "Đã bán",
      numeric: true,
      render: (_v, x) => (
        <span className={book.nowrap}>
          {x.row.cutUnits > 0
            ? `${x.row.soldUnits} · ${Math.round((x.row.soldUnits / x.row.cutUnits) * 100)}%`
            : "—"}
        </span>
      ),
    },
    {
      key: "revenue",
      label: "Doanh thu",
      numeric: true,
      render: (_v, x) => (
        <span className={book.nowrap}>{x.row.revenueVnd > 0 ? plainVnd(x.row.revenueVnd) : "—"}</span>
      ),
    },
    // v3 names this column for assistive tech only; each menu names its issue.
    // 60: the 36px trigger and the compact cell's 12px either side.
    { key: "actions", label: "", width: 60, render: (_v, x) => rowMenu(x.row, x.drop) },
  ];
  // v3 does not sort: the issues read newest first.
  const columns = columnList.map((c) => ({ ...c, sortable: false }));

  const tableRows = rows.map<IssueRow>((row) => ({
    key: String(row.no),
    row,
    drop: drops.find((d) => d.no === row.no)!,
  }));

  return (
    <div className={page.page}>
      <header className={page.header}>
        <div className={page.headRow}>
          <h1 className={page.title}>{LEX.adm}</h1>
          <div className={page.actions}>
            <Badge size="sm">Dữ liệu mẫu</Badge>
            <Button
              variant="primary"
              size="sm"
              onClick={(e) =>
                openForm(
                  { mode: "create", no: newNo, opensAt: proposal.opensAt, closesAt: proposal.closesAt },
                  e.currentTarget,
                )
              }
            >
              <Plus {...ICON} />
              {`Tạo ${LEX.tl}`}
            </Button>
          </div>
        </div>
      </header>

      <div className={styles.issues}>
        <SortableDataTable
          rows={tableRows}
          columns={columns}
          rowKey="key"
          caption={LEX.adm}
          holdWidths={false}
          density="compact"
          showCount={false}
          rowAttributes={(x) => ({ "data-open": x.row.no === openNo ? "" : undefined })}
        />
      </div>

      {drop && (
        <IssueDetail
          drop={drop}
          now={now}
          orders={orders}
          products={catalog.products}
          teasers={teasersIn(catalog, drop.no + 1)}
          canTease={catalog.dropByNo.has(drop.no + 1)}
          csvRef={fallback}
          onDownload={() => downloadIssue(drop.no)}
          onClose={(from) => openClose(drop, from)}
          onTease={(from) => openTease(drop.no + 1, from)}
        />
      )}

      <ArcDropFormDialog
        open={formOpen}
        pending={pending}
        target={form}
        opening={form?.opening ?? 0}
        onCloseAutoFocus={returnFocus}
        onClose={() => {
          if (!pending) setFormOpen(false);
        }}
        onConfirm={(opensAt, closesAt) => {
          if (!form) return;
          const issue = form.no;
          act(
            () =>
              form.mode === "create"
                ? addDrop(issue, opensAt, closesAt)
                : scheduleDrop(issue, opensAt, closesAt),
            () => setFormOpen(false),
          );
        }}
      />

      <ArcCloseDropDialog
        open={closeOpen}
        pending={pending}
        target={closing}
        onCloseAutoFocus={returnFocus}
        onClose={() => {
          if (!pending) setCloseOpen(false);
        }}
        onConfirm={() => {
          if (!closing) return;
          const issue = closing.no;
          act(
            () => closeDropNow(issue),
            () => setCloseOpen(false),
          );
        }}
      />

      <ArcTeaserDialog
        open={teaseOpen}
        pending={pending}
        no={teasing?.no ?? 0}
        opening={teasing?.opening ?? 0}
        onCloseAutoFocus={returnFocus}
        onClose={() => {
          if (!pending) setTeaseOpen(false);
        }}
        onConfirm={(draft: TeaserDraft) =>
          act(
            () => addTeaser(draft),
            () => setTeaseOpen(false),
          )
        }
      />
    </div>
  );
}

/**
 * One issue under the table it was chosen from: its state, five figures, its
 * styles one by one, and what the next issue has announced so far (v3's
 * `IssueDetail`, figure for figure and word for word).
 */
function IssueDetail({
  drop,
  now,
  orders,
  products,
  teasers,
  canTease,
  csvRef,
  onDownload,
  onClose,
  onTease,
}: {
  drop: Drop;
  now: Date;
  orders: AdminOrder[];
  products: readonly Product[];
  /** The next issue's teasers. */
  teasers: Teaser[];
  /**
   * The next issue exists, so a teaser can be announced for it. When it does
   * not, "Thêm mẫu hé lộ" would be a button the database refuses: it is not
   * drawn (DESIGN.md §9 rule 3).
   */
  canTease: boolean;
  csvRef: Ref<HTMLButtonElement>;
  onDownload: () => void;
  onClose: (from: HTMLElement) => void;
  onTease: (from: HTMLElement) => void;
}) {
  const catalog = useCatalog();
  const ids = { detail: useId(), teasers: useId() };
  const no = drop.no;
  const state = dropState(drop, now);
  const summary = dropSummary(catalog, no, products);
  const styleList = productsInDrop(catalog, no, products).sort(
    (a, b) => soldUnits(b) - soldUnits(a) || a.name.localeCompare(b.name, "vi"),
  );
  const revenue = dropRevenueVnd(catalog, no, products);
  const soldPercent =
    summary.cutUnits === 0 ? 0 : Math.round((summary.soldUnits / summary.cutUnits) * 100);
  const alerts = stockAlerts(catalog, no, products);
  const gone = alerts.filter((a) => a.left === 0);
  const low = alerts.filter((a) => a.left > 0);
  /**
   * The orders in the book that carry a style from this issue. The book is
   * the sample's recent orders plus whatever the demo's visitors ordered, not
   * the ledger the units sold imply, so this count and the revenue beside it
   * come from different places on purpose, and each figure says which (v3).
   */
  const issueOrders = orders.filter((o) =>
    o.lines.some((l) => products.find((p) => p.id === l.productId)?.dropNo === no),
  );
  const booked = issueOrders.filter((o) => ["PAID", "SHIPPING", "DELIVERED"].includes(o.status.state));
  const averageVnd =
    booked.length === 0
      ? 0
      : Math.round(booked.reduce((n, o) => n + orderTotalVnd(o), 0) / booked.length);
  // When the shelf emptied, preferring what the orders can prove over what
  // the shop wrote down, and printing nothing when neither can say.
  const soldOut = soldOutTimes(styleList, orders, drop.closesAt).filter((r) => isSoldOut(r.product));

  const styleColumns: DataColumn<StyleRow>[] = [
    {
      key: "name",
      label: "Mẫu",
      render: (_v, x) => <span className={styles.name}>{styleName(x.product.name, x.product.dropNo)}</span>,
    },
    { key: "kind", label: "Loại", render: (_v, x) => <span className={book.text}>{x.product.kind}</span> },
    {
      key: "price",
      label: "Giá",
      numeric: true,
      render: (_v, x) => <span className={book.nowrap}>{plainVnd(x.product.priceVnd)}</span>,
    },
    { key: "cut", label: "Đã cắt", numeric: true, render: (_v, x) => x.product.cutUnits },
    { key: "sold", label: "Đã bán / còn", render: (_v, x) => <SoldCell product={x.product} /> },
    {
      key: "out",
      label: "Size hết",
      render: (_v, x) => {
        const out = soldOutSizes(x.product);
        return (
          <span className={book.nowrap}>{out.length === SIZES.length ? "tất cả" : out.join(" · ") || "—"}</span>
        );
      },
    },
    {
      key: "revenue",
      label: "Doanh thu",
      numeric: true,
      render: (_v, x) => (
        <span className={book.nowrap}>{plainVnd(x.product.priceVnd * soldUnits(x.product))}</span>
      ),
    },
  ];
  // v3 does not sort: best sellers first, then by name.
  const columns = styleColumns.map((c) => ({ ...c, sortable: false }));

  return (
    <section id="detail" className={styles.detail} aria-labelledby={ids.detail}>
      <div className={styles.detailHead}>
        <div className={styles.detailHeading}>
          <h2 id={ids.detail} className={styles.detailTitle}>
            {issueLabel(no)}
          </h2>
          <p className={styles.detailState}>
            {state === "OPEN"
              ? `đang bán · ${closesInLabel(drop.closesAt, now).replace("đóng sau ", "")}`
              : state === "UPCOMING"
                ? opensInLabel(drop.opensAt, now)
                : `đã đóng ${dayMonthYear(drop.closesAt)}`}
          </p>
        </div>
        <div className={page.actions}>
          <Button ref={csvRef} variant="secondary" size="sm" onClick={onDownload}>
            <Download {...ICON} />
            {`Tải CSV ${LEX.tl} này`}
          </Button>
          {state === "OPEN" && (
            <Button variant="secondary" size="sm" onClick={(e) => onClose(e.currentTarget)}>
              <Clock {...ICON} />
              Đóng sớm
            </Button>
          )}
          {state === "CLOSED" && (
            <ArcButtonLink variant="secondary" size="sm" href={`/so/${no}`}>
              <BookOpen {...ICON} />
              {`Xem sổ ${LEX.tl} ${issueNo(no)}`}
            </ArcButtonLink>
          )}
        </div>
      </div>

      {summary.styles === 0 ? (
        <div className={panel.panel}>
          <p className={styles.none}>{LEX.t} này chưa có mẫu nào.</p>
        </div>
      ) : (
        <>
          {/* The row of figures is a container: it picks five across or two
              rows from its own width (`.kpis` in the module). */}
          <div className={styles.kpis}>
            <div className={styles.kpiGrid}>
              <ArcKpi aligned label="Doanh thu" value={compactVnd(revenue)}>
                {vnd(revenue)} · theo giá niêm yết
              </ArcKpi>
              <ArcKpi aligned label="Đơn trong dữ liệu mẫu" value={String(issueOrders.length)}>
                {booked.length > 0
                  ? `trung bình ${vnd(averageVnd)} mỗi đơn đã thanh toán`
                  : "chưa có đơn đã thanh toán nào"}
              </ArcKpi>
              <ArcKpi aligned label="Đã bán" value={`${summary.soldUnits} / ${summary.cutUnits}`} meter={soldPercent}>
                {soldPercent}% · còn {summary.onHand}
              </ArcKpi>
              <ArcKpi aligned label="Hết hàng" value={`${gone.length} / ${summary.styles}`}>
                {soldOut.length > 0
                  ? soldOut
                      .map(
                        // One entry, held together (`HOLD`): the name
                        // (`styleInList`, v3 slice 13) and when it ran out.
                        (r) =>
                          `${styleInList(styleName(r.product.name, r.product.dropNo))}${r.soldOutAt ? `${HOLD_SEP}hết${HOLD}${dayMonth(r.soldOutAt)}` : ""}`,
                      )
                      .join(SEP)
                  : "chưa mẫu nào bán hết"}
              </ArcKpi>
              <ArcKpi aligned label={`Còn dưới ${LOW_STOCK_AT + 1} chiếc`} value={`${low.length} mẫu`}>
                {low.length > 0
                  ? low
                      .map((a) => `${styleInList(styleName(a.product.name, a.product.dropNo))}${HOLD}còn${HOLD}${a.left}`)
                      .join(SEP)
                  : "chưa mẫu nào xuống thấp"}
              </ArcKpi>
            </div>
          </div>

          {/* The table and its foot line, one block: the line sits 16px under
              the table, as the customers' does (slice 3). */}
          <div>
            <SortableDataTable
              rows={styleList.map<StyleRow>((product) => ({ id: product.id, product }))}
              columns={columns}
              rowKey="id"
              caption={issueLabel(no)}
              holdWidths={false}
              density="compact"
              showCount={false}
            />
            <div className={book.foot}>
              <p className={book.shown}>
                {summary.styles} mẫu · {summary.cutUnits} đã cắt · {summary.soldUnits} đã bán · doanh thu theo
                giá niêm yết, chưa trừ mã giảm giá
              </p>
            </div>
          </div>

          {/* A part of this issue's detail, so one level under its heading. */}
          <section className={panel.panel} aria-labelledby={ids.teasers}>
            <div className={panel.panelHead}>
              <h3 id={ids.teasers} className={panel.panelTitle}>
                {issueLabel(no + 1)} · mẫu hé lộ
              </h3>
              {canTease && (
                <Button variant="secondary" size="sm" onClick={(e) => onTease(e.currentTarget)}>
                  <Plus {...ICON} />
                  Thêm mẫu hé lộ
                </Button>
              )}
            </div>
            {teasers.length === 0 ? (
              <p className={styles.none}>
                Chưa hé lộ mẫu nào cho {LEX.tl} {issueNo(no + 1)}.
              </p>
            ) : (
              <ul className={styles.teasers}>
                {teasers.map((t) => (
                  <li className={styles.teaser} key={t.slug}>
                    <Image className={panel.thumb} src={photoUrl(t.photoKey, 120)} alt="" width={36} height={45} />
                    <span className={styles.teaserText}>
                      <span className={styles.teaserName}>{styleName(t.name, t.dropNo)}</span>
                      <span className={styles.teaserKind}>{t.kind} · giá công bố khi mở</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}

/**
 * How much of a style has gone: the 4px bar (`ArcMeter`) in its three
 * readings (accent while it sells, `--danger` from 85% sold, the whole track
 * in ink once it is gone; slice 2's "Bán chạy"), beside "18 · còn 17" or "14 · hết".
 * The count is a box of one width on every row, flush right, so the bars start
 * and end at the same x down the column, as the codes' "Lượt" (slice 3).
 */
function SoldCell({ product }: { product: IssueStyle }) {
  const sold = soldUnits(product);
  const left = onHand(product);
  const percent = product.cutUnits === 0 ? 0 : Math.round((sold / product.cutUnits) * 100);
  const reading = left === 0 ? "gone" : percent >= 85 ? "hot" : undefined;
  return (
    <span className={styles.sold}>
      <ArcMeter percent={percent} reading={reading} className={styles.soldBar} />
      <span className={styles.soldCount}>
        {sold} · {left === 0 ? "hết" : `còn ${left}`}
      </span>
    </span>
  );
}
