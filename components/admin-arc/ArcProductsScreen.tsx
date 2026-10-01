"use client";

import {
  ArrowLeftRight,
  Download,
  ExternalLink,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { BadgeTone as V3BadgeTone } from "@/components/ui/Badge";
import { COLORS } from "@/data/colors";
import { SIZES, type DropState, type Product, type ProductId, type Teaser } from "@/data/types";
import { adjustStock, restockProduct } from "@/lib/actions/catalog-admin";
import {
  fixedCounts,
  fixedRows,
  fixedStatus,
  lowNote,
  productsTab,
  stylesLine,
  type FixedStatus,
} from "@/lib/admin-products";
import { hrefWith, type Query } from "@/lib/admin-url";
import { RESTOCK_STALE_MESSAGE } from "@/lib/catalog-admin";
import { styleNameHas } from "@/lib/catalog-query";
import { downloadCsv } from "@/lib/csv";
import { dropState } from "@/lib/drop";
import {
  LOW_STOCK_AT,
  isFixed,
  isIssueStyle,
  isRunningLow,
  isSoldOut,
  onHand,
  productsInDrop,
  soldOutSizes,
  type IssueStyle,
} from "@/lib/inventory";
import type { InventoryCell } from "@/lib/inventory-adjust";
import { FIXED_WORD, LEX, issueNo, styleName } from "@/lib/lexicon";
import { plainVnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";
import { PRODUCTS_CSV_NAME, productsCsvRows } from "@/lib/products-csv";
import type { RestockCell } from "@/lib/restock";
import { Badge } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import { DropdownMenu, type DropdownItem } from "@/registry/components/dropdown-menu/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/components/tabs/tabs";
import { ArcButtonLink } from "./ArcButtonLink";
import { TONE } from "./ArcOrderCells";
import panel from "./ArcOrderScreen.module.css";
import book from "./ArcOrdersScreen.module.css";
import overview from "./ArcOverviewScreen.module.css";
import page from "./ArcPage.module.css";
import styles from "./ArcProductsScreen.module.css";
import { ArcSearchBox } from "./ArcSearchBox";
import { ArcAdjustDrawer, ArcRestockDrawer } from "./ArcStockDrawer";
import { useArcToast } from "./useArcToast";

const PATH = "/admin/products";

/** The value the Cố định tab stands for in the tab row; it writes `?fixed=1`. */
const FIXED_TAB = "fixed";

/** The one field of "Thêm bộ lọc", and its chip's label (v3's `ChipMenu` "Loại"). */
const KIND = "Loại";

/**
 * The stock segment: v3's two toggle chips "Sắp hết N" and "Hết N" as one
 * choice among three views (brief v5 slice 5a, §2). Nothing is lost: on an
 * issue's tab no style is both, and on Cố định an empty shelf already counts
 * as running low, so both on read as "Hết" alone. The address keeps v3's
 * keys, `low=1` and `gone=1`, one at a time.
 */
type Stock = "all" | "low" | "gone";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** One row of the styles table, keyed by the style's id. */
type Row = { id: string; product: Product };

/** One row of an issue that has only been announced. */
type TeaserRow = { slug: string; teaser: Teaser };

/** A fixed style's badge, v3's words in v3's tones, through `TONE`. */
const FIXED_BADGE: Record<FixedStatus, { text: string; tone: V3BadgeTone }> = {
  OUT: { text: "Hết", tone: "shut" },
  LOW: { text: "Sắp hết", tone: "hot" },
  OK: { text: "Đang bán", tone: "ok" },
};

/** The address with some keys changed: `hrefWith`'s rule, as a query. */
function patched(current: Query, patch: Record<string, string | number | null>): Query {
  const next: Query = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") delete next[key];
    else next[key] = String(value);
  }
  return next;
}

/**
 * Every style the shop sells, the fixed ones then the issues, in the Arc
 * frame (round v5 slice 5a): v3's `ProductsTable`
 * (`components/admin/ProductsTable.tsx`) rule for rule and word for word,
 * drawn with Arc's parts, the order book's tabs and table (slice 0), the
 * log's toolbar (slice 2) and the overview's bar (slice 2).
 *
 * The first tab is "Cố định", the styles that belong to no issue, and it is
 * the one a bare `/admin/products` opens (`?fixed=1` names it); a fixed style
 * running low comes first, wears "Sắp hết" and a line in the danger colour
 * under its stock, and the tab carries a dot so it is seen from any other
 * tab. Then the issues: the one selling first, then the newest down. An issue
 * with nothing cut yet shows what it has announced. The rules are
 * `lib/admin-products.ts` and `lib/inventory.ts`, the functions the shop
 * reads, over the catalogue the database holds.
 *
 * EVERY FILTER IS IN THE ADDRESS (QĐ-8): the tab (`?fixed=1`, `?drop=N`), the
 * kind, the stock segment (`?low=1`, `?gone=1`) and the search. A change
 * shows at once (`useOptimistic`) and the address follows in a transition:
 * the tab and the search replace it, as on the other Arc tables; the kind and
 * the segment push, as v3's links did.
 *
 * The two stock drawers write to the database (`adjustStock`,
 * `restockProduct` → `admin_adjust_stock()`), and the answer arrives with the
 * table already redrawn. Each hands focus back, when it shuts, to the row
 * menu that opened it.
 */
export function ArcProductsScreen({ nowIso, query }: { nowIso: string; query: Query }) {
  const catalog = useCatalog();
  const say = useArcToast();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [view, setView] = useOptimistic(query);
  const [, startNavigation] = useTransition();
  const [saving, startSaving] = useTransition();

  // Each drawer keeps what it shows while it slides out; `open` alone shuts it.
  const [adjusting, setAdjusting] = useState<{ product: Product; opening: number } | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  // The restock drawer reads its style from the catalogue by id, so the
  // numbers it shows are always the catalogue's, after a refresh too (v3).
  const [restocking, setRestocking] = useState<{ id: ProductId; opening: number } | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);

  /** The screen, to find the tab that is open. */
  const root = useRef<HTMLDivElement>(null);
  /** What opened the drawer now open, for focus to go back to. */
  const opener = useRef<HTMLElement | null>(null);
  /** Each row's menu, by style, so a drawer opened from it can hand focus back to its trigger. */
  const menus = useRef(new Map<string, HTMLElement>());

  /** Change the address: shown now, confirmed by the server render that follows. */
  function go(patch: Record<string, string | number | null>, mode: "push" | "replace" = "push") {
    const next = patched(view, patch);
    startNavigation(() => {
      setView(next);
      router[mode](hrefWith(PATH, next), { scroll: false });
    });
  }

  const products = catalog.products;
  const drops = catalog.drops;
  const teasers = catalog.teasers;

  const selling = drops.find((d) => dropState(d, now) === "OPEN")?.no;

  /**
   * Issues with something to show: styles cut, or styles announced. The issue
   * that is SELLING comes first, then the rest newest down. The table of
   * issues is a calendar and reads in date order; this row is a place to
   * work, and the work is in the open one.
   */
  const issueTabs = drops
    .filter(
      (d) => productsInDrop(catalog, d.no, products).length > 0 || teasers.some((t) => t.dropNo === d.no),
    )
    .sort((a, b) => (b.no === selling ? 1 : 0) - (a.no === selling ? 1 : 0) || b.no - a.no)
    .map((d) => ({
      no: d.no,
      styles: productsInDrop(catalog, d.no, products).length,
      teasers: teasers.filter((t) => t.dropNo === d.no).length,
    }));

  const fixed = products.filter(isFixed);
  const fixedTally = fixedCounts(fixed);

  const tab = productsTab(view);
  const dropNo = tab.fixed ? null : tab.no;
  const kind = view.kind ?? null;
  const stock: Stock = view.gone === "1" ? "gone" : view.low === "1" ? "low" : "all";
  const text = (view.q ?? "").trim();

  const inIssue = dropNo === null ? [] : productsInDrop(catalog, dropNo, products);
  const inTab: Product[] = tab.fixed ? fixed : inIssue;
  const kinds = [...new Set(inTab.map((p) => p.kind))].sort((a, b) => a.localeCompare(b, "vi"));

  /** "Sắp hết" by each tab's own rule: a fixed style's cells, an issue's last three. */
  const isLow = (p: Product) => (tab.fixed ? isRunningLow(p) : onHand(p) > 0 && onHand(p) <= LOW_STOCK_AT);

  const ordered: Product[] = tab.fixed
    ? fixedRows(fixed)
    : [...inIssue].sort((a, b) => (b.cutUnits ?? 0) - (a.cutUnits ?? 0) || a.name.localeCompare(b.name, "vi"));
  const rows = ordered
    .filter((p) => (kind ? p.kind === kind : true))
    .filter((p) => (stock === "low" ? isLow(p) : stock === "gone" ? isSoldOut(p) : true))
    // The name as it is shown: "s05", "khoi" and "S05 – KHÓI" all find KHÓI.
    .filter((p) => (text ? styleNameHas(p, text) : true));

  const lowCount = tab.fixed ? fixedTally.low : inIssue.filter(isLow).length;
  const goneCount = tab.fixed ? fixedTally.out : inIssue.filter(isSoldOut).length;
  const cut = inIssue.reduce((n, p) => n + (p.cutUnits ?? 0), 0);
  const left = inIssue.reduce((n, p) => n + onHand(p), 0);

  const issueTeasers = dropNo === null ? [] : teasers.filter((t) => t.dropNo === dropNo);
  const issue = drops.find((d) => d.no === dropNo);
  const issueState: DropState = issue ? dropState(issue, now) : "CLOSED";

  const lowLabel = `${fixedTally.low} mẫu sắp hết`;
  const tabValue = tab.fixed ? FIXED_TAB : String(tab.no);
  const tabLabel = tab.fixed ? FIXED_WORD : `${LEX.t} ${issueNo(tab.no)}`;
  const tabValues = [FIXED_TAB, ...issueTabs.map((t) => String(t.no))];

  // ── "Thêm bộ lọc": one field, the kinds of this tab with their counts ───
  const fields: FilterField[] = [
    {
      id: "kind",
      label: KIND,
      options: kinds.map((k) => ({ value: k, label: k, hint: inTab.filter((p) => p.kind === k).length })),
    },
  ];
  // Held by identity: Arc's toolbar compares the list it is given with the
  // last one to announce what changed.
  const chips = useMemo<FilterChip[]>(
    () => (kind ? [{ id: "kind", label: KIND, value: kind }] : []),
    [kind],
  );

  /** The menu hands back the label it showed, which is the kind itself. */
  function addFilter(chip: FilterChip) {
    const picked = kinds.find((k) => k === chip.value);
    if (picked) go({ kind: picked });
  }

  // The chip's box leaves the row with the chip. Arc hands focus to the
  // "Thêm bộ lọc" trigger inside its own toolbar, which this row does not
  // use, so a keyboard user who removed the chip is handed to the standalone
  // menu's trigger instead of to the page (the log's rule, slice 2).
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

  const stockSegments = [
    { value: "all", label: "Tất cả" },
    { value: "low", label: "Sắp hết", accessory: <span className={styles.segmentCount}>{lowCount}</span> },
    { value: "gone", label: "Hết", accessory: <span className={styles.segmentCount}>{goneCount}</span> },
  ];

  // ── the drawers ──────────────────────────────────────────────────────────
  /** The trigger of a style's row menu. */
  function menuOf(id: string): HTMLElement | null {
    return menus.current.get(id)?.querySelector("button") ?? null;
  }

  function openAdjust(p: Product) {
    opener.current = menuOf(String(p.id));
    setAdjusting((a) => ({ product: p, opening: (a?.opening ?? 0) + 1 }));
    setAdjustOpen(true);
  }

  function openRestock(p: Product) {
    opener.current = menuOf(String(p.id));
    setRestocking((r) => ({ id: p.id, opening: (r?.opening ?? 0) + 1 }));
    setRestockOpen(true);
  }

  /**
   * Radix hands focus back only to a `DrawerTrigger`, and these drawers are
   * opened from row menus. Back to the menu that opened it; when its row has
   * left the table (a restock that lifted a style out of "Sắp hết"), to the
   * tab that is open instead of to the top of the page.
   */
  function returnFocus(event: Event) {
    const back = opener.current?.isConnected
      ? opener.current
      : (root.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ?? null);
    if (!back) return;
    event.preventDefault();
    back.focus();
  }

  /**
   * "Lưu điều chỉnh" → `admin_adjust_stock()`. The drawer stays open on a
   * refusal: a shelf that moved elsewhere (`STALE`) says so and nothing is
   * written. After an `await` the transition has to be restated
   * (react.dev/reference/react/useTransition).
   */
  function saveAdjust(cells: InventoryCell[], reason: string, ref: string, note: string) {
    if (!adjusting || saving) return;
    const id = String(adjusting.product.id);
    startSaving(async () => {
      const result = await adjustStock(id, cells, reason, ref, note);
      startSaving(() => {
        if (result.ok) setAdjustOpen(false);
        say(result.message ?? result.errors.form ?? "", result.ok ? "ok" : "error");
      });
    });
  }

  /**
   * "Nhập thêm N chiếc" → `admin_adjust_stock()` with the reason "Nhập
   * thêm". A shelf that moved elsewhere: the drawer stays open and reads the
   * numbers again, so the next press adds to what is there (v3).
   */
  function saveRestock(cells: RestockCell[], note: string) {
    if (!restocking || saving) return;
    const id = String(restocking.id);
    startSaving(async () => {
      const result = await restockProduct(id, cells, note);
      startSaving(() => {
        if (result.ok) setRestockOpen(false);
        say(result.message ?? result.errors.form ?? "", result.ok ? "ok" : "error");
        if (!result.ok && result.errors.form === RESTOCK_STALE_MESSAGE) router.refresh();
      });
    });
  }

  // ── the table ────────────────────────────────────────────────────────────
  function rowMenu(p: Product) {
    const id = String(p.id);
    const items: DropdownItem[] = [
      // First on every fixed style, whatever its stock (the board, round 4).
      ...(isFixed(p)
        ? [{ label: "Nhập thêm", icon: <PackagePlus {...ICON} />, onSelect: () => openRestock(p) }]
        : []),
      {
        label: "Sửa mẫu",
        icon: <Pencil {...ICON} />,
        onSelect: () => router.push(`/admin/products/${p.id}`),
      },
      { label: "Điều chỉnh tồn kho", icon: <ArrowLeftRight {...ICON} />, onSelect: () => openAdjust(p) },
      {
        // Leaving the back office: a tab of its own, as v3's link was.
        label: "Xem ở cửa hàng",
        icon: <ExternalLink {...ICON} />,
        onSelect: () => window.open(`/products/${p.slug}`, "_blank", "noreferrer"),
      },
    ];
    return (
      <span
        className={styles.menu}
        ref={(el) => {
          if (el) menus.current.set(id, el);
          else menus.current.delete(id);
        }}
      >
        <DropdownMenu
          iconOnly
          label={`Thao tác ${styleName(p.name, p.dropNo)}`}
          icon={<MoreHorizontal {...ICON} />}
          items={items}
        />
      </span>
    );
  }

  const columnList: DataColumn<Row>[] = [
    {
      key: "name",
      label: "Mẫu",
      render: (_v, r) => (
        <StyleCell photoKey={r.product.photoKeys[0]!} name={styleName(r.product.name, r.product.dropNo)} />
      ),
    },
    { key: "kind", label: "Loại · form", render: (_v, r) => <span className={book.text}>{kindAndFit(r.product)}</span> },
    {
      key: "price",
      label: "Giá",
      numeric: true,
      render: (_v, r) => <span className={book.nowrap}>{plainVnd(r.product.priceVnd)}</span>,
    },
    { key: "colours", label: "Màu", render: (_v, r) => <span className={book.text}>{colourList(r.product)}</span> },
    {
      key: "stock",
      label: "Tồn kho",
      render: (_v, r) =>
        isIssueStyle(r.product) ? <IssueStock p={r.product} /> : <FixedStock p={r.product} />,
    },
    {
      key: "out",
      label: "Size hết",
      render: (_v, r) => {
        // A fixed style missing a size has something to bring back: said in
        // the danger colour, as v3's `.hotsize`.
        const hot = isFixed(r.product) && soldOutSizes(r.product).length > 0;
        return <span className={hot ? `${book.nowrap} ${styles.hot}` : book.nowrap}>{goneSizes(r.product)}</span>;
      },
    },
    {
      key: "state",
      label: "Trạng thái",
      render: (_v, r) => {
        const s = isIssueStyle(r.product)
          ? issueStanding(r.product, issueState)
          : FIXED_BADGE[fixedStatus(r.product)];
        return (
          <Badge tone={TONE[s.tone]} size="sm">
            {s.text}
          </Badge>
        );
      },
    },
    // v3 names this column for assistive tech only; each menu names its style.
    // 60: the 36px trigger and the compact cell's 12px either side.
    { key: "actions", label: "", width: 60, render: (_v, r) => rowMenu(r.product) },
  ];
  // v3 does not sort: fixed styles running low first, an issue's by its cut.
  const columns = columnList.map((c) => ({ ...c, sortable: false }));

  const body =
    tab.fixed || inIssue.length > 0 ? (
      <div>
        <div className={styles.table}>
          <SortableDataTable
            rows={rows.map<Row>((product) => ({ id: String(product.id), product }))}
            columns={columns}
            rowKey="id"
            caption={tabLabel}
            emptyMessage={inTab.length === 0 ? "Chưa có mẫu nào." : "Không có mẫu nào khớp."}
            holdWidths={false}
            density="compact"
            showCount={false}
          />
        </div>
        {/* The issue's line, under its table only when the table has rows (v3). */}
        {inIssue.length > 0 && rows.length > 0 && (
          <div className={book.foot}>
            <p className={book.shown}>
              {inIssue.length} mẫu · {cut} đã cắt · {left} còn · tồn kho là số còn trên kệ, đã bán là đã cắt
              trừ tồn kho
            </p>
          </div>
        )}
      </div>
    ) : (
      <TeaserTable teasers={issueTeasers} caption={tabLabel} />
    );

  return (
    <div className={page.page} ref={root}>
      <header className={page.header}>
        <div className={page.headRow}>
          <h1 className={page.title}>Mẫu</h1>
          <div className={page.actions}>
            <Badge size="sm">Dữ liệu mẫu</Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadCsv(PRODUCTS_CSV_NAME, productsCsvRows(catalog))}
            >
              <Download {...ICON} />
              Tải CSV
            </Button>
            {/* The form is in the Arc frame too since slice 5b: the frame stays on the way. */}
            <ArcButtonLink variant="primary" size="sm" href="/admin/products/new">
              <Plus {...ICON} />
              Thêm mẫu
            </ArcButtonLink>
          </div>
        </div>
        <p className={page.sub}>{stylesLine(catalog, now)}</p>
      </header>

      <Tabs
        value={tabValue}
        onValueChange={(v) =>
          go(
            v === FIXED_TAB
              ? { fixed: "1", drop: null, page: null }
              : { drop: v, fixed: null, page: null },
            "replace",
          )
        }
      >
        <TabsList aria-label={`${FIXED_WORD} và các ${LEX.tl}`}>
          <TabsTrigger value={FIXED_TAB}>
            {FIXED_WORD} <span className={book.tabCount}>{fixed.length}</span>
            {/* Seen from any tab: there is restocking to do. */}
            {fixedTally.low > 0 && (
              <span className={styles.lowDot} role="img" aria-label={lowLabel} title={lowLabel} />
            )}
          </TabsTrigger>
          {issueTabs.map((t) => (
            <TabsTrigger key={t.no} value={String(t.no)}>
              {`${LEX.t} ${issueNo(t.no)}${t.styles === 0 && t.teasers > 0 ? " · hé lộ" : ""}`}{" "}
              <span className={book.tabCount}>{t.styles || t.teasers}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* The search, "Thêm bộ lọc", the chip while a kind is on, and the
            stock segment at the far end, as on the log. Only where there are
            styles to filter: an announced issue has nothing they would act on
            (DESIGN.md §9 rule 3). */}
        {inTab.length > 0 && (
          <div className={styles.toolbar}>
            <div className={styles.search}>
              <ArcSearchBox
                label="Tìm mẫu"
                placeholder="Tìm tên mẫu"
                value={view.q ?? ""}
                onSubmit={(v) => go({ q: v || null }, "replace")}
              />
            </div>
            <div className={styles.menuSlot} ref={menuSlot}>
              <FilterMenu fields={fields} active={chips} onSelect={addFilter} align="start" />
            </div>
            {chips.length > 0 && (
              <div className={styles.chips} ref={chipsSlot}>
                <FilterToolbar filters={chips} onRemove={dropKind} onClearAll={dropKind} />
              </div>
            )}
            <div className={styles.stockSlot}>
              <SegmentedControl
                label="Tồn kho"
                options={stockSegments}
                value={stock}
                onValueChange={(v) => go({ low: v === "low" ? "1" : null, gone: v === "gone" ? "1" : null })}
              />
            </div>
          </div>
        )}

        {tabValues.map((v) => (
          <TabsContent key={v} value={v}>
            {body}
          </TabsContent>
        ))}
        {/* An issue the address names that has no tab (nothing cut, nothing
            announced, or no such issue) still says so, as in v3. */}
        {!tabValues.includes(tabValue) && <div className={styles.untabbed}>{body}</div>}
      </Tabs>

      <ArcAdjustDrawer
        open={adjustOpen}
        pending={saving}
        opening={adjusting?.opening ?? 0}
        product={adjusting?.product ?? null}
        onClose={() => {
          if (!saving) setAdjustOpen(false);
        }}
        onCloseAutoFocus={returnFocus}
        onBlocked={(message) => say(message, "error")}
        onSave={saveAdjust}
      />

      <ArcRestockDrawer
        open={restockOpen}
        pending={saving}
        opening={restocking?.opening ?? 0}
        product={restocking ? (catalog.byId.get(restocking.id) ?? null) : null}
        onClose={() => {
          if (!saving) setRestockOpen(false);
        }}
        onCloseAutoFocus={returnFocus}
        onRestock={saveRestock}
      />
    </div>
  );
}

/** "Áo hoodie · oversize". */
function kindAndFit(p: Product): string {
  return `${p.kind} · ${p.fit === "OVERSIZE" ? "oversize" : "regular"}`;
}

/** The size column: the sizes gone in every colour, "tất cả", or a dash. */
function goneSizes(p: Product): string {
  const out = soldOutSizes(p);
  return out.length === SIZES.length ? "tất cả" : out.join(" · ") || "—";
}

/**
 * "Trắng · Xanh than": each colour's name one block (no-break spaces inside
 * it), the " · " between two colours the place a line may break. The table
 * broke "Xanh" over "than" (v3 slice 13).
 */
function colourList(p: Product): string {
  return p.colors.map((c) => COLORS[c].label.replace(/ /g, " ")).join(" · ");
}

/** An issue's style, in v3's words and v3's tones (`TONE` reads them as Arc's). */
function issueStanding(p: IssueStyle, state: DropState): { text: string; tone: V3BadgeTone } {
  const left = onHand(p);
  if (left === 0) return { text: "Hết", tone: "shut" };
  if (state === "UPCOMING") return { text: "Sắp mở", tone: "info" };
  if (state !== "OPEN") return { text: "Đã đóng", tone: "shut" };
  if (left <= LOW_STOCK_AT) return { text: "Sắp hết", tone: "hot" };
  return { text: "Đang bán", tone: "ok" };
}

/** A style's photo, 36×45 with the zone's 6px corner, and its name at 500 on one line. */
function StyleCell({ photoKey, name }: { photoKey: string; name: string }) {
  return (
    <span className={styles.style}>
      <Image className={panel.thumb} src={photoUrl(photoKey, 120)} alt="" width={36} height={45} />
      <span className={styles.name}>{name}</span>
    </span>
  );
}

/**
 * What is left of an issue's cut: the overview's 4px bar in its three
 * readings (accent; the danger colour at `LOW_STOCK_AT` or fewer; the whole
 * track in ink once it is gone) beside "còn 17 / 35" or "hết · 0 / 14". The
 * count is a box of one width on every row, flush right, so the bars start
 * and end at the same x down the column, as the codes' "Lượt" (slice 3).
 */
function IssueStock({ p }: { p: IssueStyle }) {
  const left = onHand(p);
  const percent = p.cutUnits === 0 ? 0 : Math.round((left / p.cutUnits) * 100);
  const reading = left === 0 ? "gone" : left <= LOW_STOCK_AT ? "hot" : undefined;
  return (
    <span className={styles.stock}>
      <span className={`${overview.bar} ${styles.stockBar}`} data-state={reading} aria-hidden="true">
        <span className={overview.barFill} style={{ width: `${percent}%` }} />
      </span>
      <span className={styles.stockCount}>
        {left === 0 ? "hết · 0" : `còn ${left}`} / {p.cutUnits}
      </span>
    </span>
  );
}

/**
 * A fixed style: no cut to measure against, so no bar. What is on the shelf,
 * and under it, in the danger colour, which sizes need bringing back
 * (`lowNote`).
 */
function FixedStock({ p }: { p: Product }) {
  const note = lowNote(p);
  return (
    <span className={book.stack}>
      <span className={book.nowrap}>còn {onHand(p)}</span>
      {note && <span className={styles.lowNote}>{note}</span>}
    </span>
  );
}

/**
 * An issue that has been announced but not cut: v3's five columns. No price,
 * no stock and no menu: a teaser carries a name, a kind and a borrowed photo,
 * and the two missing numbers are published at the hour the issue opens.
 */
function TeaserTable({ teasers, caption }: { teasers: Teaser[]; caption: string }) {
  const columnList: DataColumn<TeaserRow>[] = [
    {
      key: "name",
      label: "Mẫu",
      render: (_v, r) => <StyleCell photoKey={r.teaser.photoKey} name={styleName(r.teaser.name, r.teaser.dropNo)} />,
    },
    { key: "kind", label: "Loại", render: (_v, r) => <span className={book.text}>{r.teaser.kind}</span> },
    { key: "price", label: "Giá", numeric: true, render: () => <span className={book.nowrap}>công bố khi mở</span> },
    { key: "stock", label: "Tồn kho", render: () => <span className={book.nowrap}>chưa cắt</span> },
    {
      key: "state",
      label: "Trạng thái",
      render: () => (
        <Badge tone="info" size="sm">
          Hé lộ
        </Badge>
      ),
    },
  ];
  const columns = columnList.map((c) => ({ ...c, sortable: false }));
  return (
    <div className={styles.table}>
      <SortableDataTable
        rows={teasers.map<TeaserRow>((teaser) => ({ slug: teaser.slug, teaser }))}
        columns={columns}
        rowKey="slug"
        caption={caption}
        emptyMessage={`${LEX.t} này chưa có mẫu nào.`}
        holdWidths={false}
        density="compact"
        showCount={false}
      />
    </div>
  );
}
