"use client";

import { Copy, Download, MoreHorizontal, Pause, Pencil, Play, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Promotion } from "@/data/types";
import {
  addPromo,
  editPromo,
  endPromo,
  pausePromo,
  raisePromoLimit,
} from "@/lib/actions/catalog-admin";
import type { ActionState } from "@/lib/actions/state";
import { PROMO_KIND_LABEL, promoState, promoValueLabel, type PromoState } from "@/lib/admin-rows";
import { hrefWith, type Query } from "@/lib/admin-url";
import { downloadCsv } from "@/lib/csv";
import { clockLabel, dayMonth, dayMonthYear } from "@/lib/datetime";
import { dropState } from "@/lib/drop";
import { LEX, issueNo } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { Badge, type BadgeTone } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import { DropdownMenu, type DropdownItem } from "@/registry/components/dropdown-menu/dropdown-menu";
import {
  SortableDataTable,
  type DataColumn,
} from "@/registry/components/sortable-data-table/sortable-data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/components/tabs/tabs";
import book from "./ArcOrdersScreen.module.css";
import page from "./ArcPage.module.css";
import { ArcPromoDrawer, type PromoCopy } from "./ArcPromoDrawer";
import styles from "./ArcPromotionsScreen.module.css";
import { useArcToast } from "./useArcToast";

const PATH = "/admin/promotions";

/** How many uses "Nâng giới hạn" adds. One decision, one number (v3). */
const RAISE_BY = 50;

/** The Tabs value of "Tất cả": a tab needs a string, the address needs no `state`. */
const ALL = "all";

/** What a code is doing, in v3's words, with Arc's tones (brief v5 slice 3, §3.4). */
const STANDING: Record<PromoState, { label: string; tone: BadgeTone }> = {
  LIVE: { label: "Đang chạy", tone: "success" },
  UPCOMING: { label: "Sắp chạy", tone: "info" },
  PAUSED: { label: "Tạm dừng", tone: "neutral" },
  ENDED: { label: "Hết hạn", tone: "neutral" },
  USED_UP: { label: "Hết lượt", tone: "danger" },
};

const TABS: Array<{ value: PromoState | null; label: string }> = [
  { value: null, label: "Tất cả" },
  { value: "LIVE", label: STANDING.LIVE.label },
  { value: "UPCOMING", label: STANDING.UPCOMING.label },
  { value: "PAUSED", label: STANDING.PAUSED.label },
  { value: "ENDED", label: STANDING.ENDED.label },
  { value: "USED_UP", label: STANDING.USED_UP.label },
];

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** One row of the table: the code, keyed by itself, and what it is doing now. */
type Row = { code: string; promo: Promotion; standing: PromoState };

/** The form: which code it holds (none for a new one), and which opening this is. */
type Form = { promo: Promotion | null; opening: number };

/** The address with some keys changed: `hrefWith`'s rule, as a query. */
function patched(current: Query, patch: Record<string, string | null>): Query {
  const next: Query = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") delete next[key];
    else next[key] = value;
  }
  return next;
}

/**
 * The discount codes, and the six things an operator does to one, in the Arc
 * frame (round v5 slice 3): v3's `AdminPromotionsScreen`
 * (`components/admin/AdminPromotionsScreen.tsx`) rule for rule and word for
 * word, drawn with Arc's parts and the order book's table (slice 0).
 *
 * Which of the five things a code is doing is `promoState`
 * (`lib/admin-rows.ts`): pausing is the only one not read off the clock, and
 * it shows over what would otherwise be "Đang chạy". Everything else falls
 * out of the window and the cap, so ending a run early needs no flag: the
 * closing hour moves and the row follows. A code that is neither running nor
 * about to steps back to the secondary ink, as a cancelled order does in the
 * book.
 *
 * EVERY ACTION WRITES THE DATABASE (slice B3b): "Tạo mã" and "Nhân bản" are
 * `admin_add_promo()`, "Sửa" is `admin_edit_promo()`, and "Tạm dừng" /
 * "Tiếp tục", "Nâng giới hạn" and "Kết thúc sớm" each have their own
 * function. Each answers with v3's sentence in the toast, and the action
 * revalidates, so the table in its response is already the new one.
 *
 * The status tab is in the address (QĐ-8, v3's `?state=`): shown at once,
 * then the address follows in a transition, as the order book's tabs do.
 */
export function ArcPromotionsScreen({ nowIso, query }: { nowIso: string; query: Query }) {
  const catalog = useCatalog();
  const say = useArcToast();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [pending, startAction] = useTransition();
  const [, startNavigation] = useTransition();
  const [view, setView] = useOptimistic(query);
  // The form stays filled while the drawer slides out; `open` alone shuts it.
  const [form, setForm] = useState<Form | null>(null);
  const [open, setOpen] = useState(false);
  /** What opened the drawer, for focus to go back to. */
  const opener = useRef<HTMLElement | null>(null);
  /** Each row's menu, by code, so "Sửa" can hand focus back to the menu that asked. */
  const menus = useRef(new Map<string, HTMLElement>());

  /**
   * Run one Server Action and say what the server answered. The action
   * revalidates everything, so the response that answers it already carries
   * the new table. After an `await` the transition has to be restated
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
  function go(patch: Record<string, string | null>) {
    const next = patched(view, patch);
    startNavigation(() => {
      setView(next);
      router.replace(hrefWith(PATH, next), { scroll: false });
    });
  }

  function openForm(promo: Promotion | null, from: HTMLElement | null) {
    opener.current = from;
    setForm((f) => ({ promo, opening: (f?.opening ?? 0) + 1 }));
    setOpen(true);
  }

  const rows = catalog.promotions.map((promo) => ({ promo, standing: promoState(promo, now) }));
  const tab = (view.state as PromoState | undefined) ?? null;
  const shown = tab ? rows.filter((r) => r.standing === tab) : rows;
  const counts = (s: PromoState) => rows.filter((r) => r.standing === s).length;

  /** The issue a copy of a code would run with: the next one not yet open. */
  const nextIssue = [...catalog.drops]
    .sort((a, b) => a.no - b.no)
    .find((d) => dropState(d, now) === "UPCOMING");

  const duplicateOf = (p: Promotion): PromoCopy =>
    nextIssue
      ? {
          code: `SO${issueNo(nextIssue.no)}`,
          startsAt: nextIssue.opensAt,
          endsAt: nextIssue.closesAt,
          label: `${LEX.tl} ${issueNo(nextIssue.no)}`,
        }
      : {
          code: `${p.code}-2`,
          startsAt: p.startsAt,
          endsAt: p.endsAt,
          label: "cùng khoảng thời gian",
        };

  const csvRows = [
    ["Mã", "Loại", "Giảm", "Điều kiện", "Bắt đầu", "Kết thúc", "Đã dùng", "Giới hạn", "Trạng thái"],
    ...rows.map(({ promo, standing }) => [
      String(promo.code),
      PROMO_KIND_LABEL[promo.kind],
      promoValueLabel(promo),
      promo.minOrderVnd ? `Đơn từ ${promo.minOrderVnd}` : "—",
      dayMonthYear(promo.startsAt),
      dayMonthYear(promo.endsAt),
      promo.usedCount,
      promo.usageLimit ?? "không giới hạn",
      STANDING[standing].label,
    ]),
  ];

  const taken = rows.map((r) => String(r.promo.code));

  function rowMenu(p: Promotion, standing: PromoState) {
    const code = String(p.code);
    const edit = () => openForm(p, menus.current.get(code)?.querySelector("button") ?? null);
    const items: DropdownItem[] = [
      { label: "Sửa", icon: <Pencil {...ICON} />, onSelect: edit },
      ...(p.usageLimit !== null
        ? [
            {
              label: `Nâng giới hạn thêm ${RAISE_BY}`,
              icon: <Plus {...ICON} />,
              onSelect: () => act(() => raisePromoLimit(code, p.usageLimit! + RAISE_BY)),
            },
          ]
        : []),
      // v3: a copy is made from the code's own form, whose "Nhân bản thành …"
      // names the copy and its window before anything is written.
      { label: "Nhân bản", icon: <Copy {...ICON} />, onSelect: edit },
      p.paused
        ? { label: "Tiếp tục", icon: <Play {...ICON} />, onSelect: () => act(() => pausePromo(code, false)) }
        : { label: "Tạm dừng", icon: <Pause {...ICON} />, onSelect: () => act(() => pausePromo(code, true)) },
      ...(standing === "LIVE"
        ? [
            {
              label: "Kết thúc sớm",
              icon: <X {...ICON} />,
              destructive: true,
              separatorBefore: true,
              onSelect: () => act(() => endPromo(code)),
            },
          ]
        : []),
    ];
    return (
      <span
        className={styles.menu}
        ref={(el) => {
          if (el) menus.current.set(code, el);
          else menus.current.delete(code);
        }}
      >
        <DropdownMenu iconOnly label={`Thao tác ${code}`} icon={<MoreHorizontal {...ICON} />} items={items} />
      </span>
    );
  }

  const columnList: DataColumn<Row>[] = [
    { key: "code", label: "Mã", render: (_v, r) => <span className={styles.code}>{r.code}</span> },
    {
      key: "value",
      label: "Giảm",
      render: (_v, r) => <span className={book.text}>{promoValueLabel(r.promo)}</span>,
    },
    {
      key: "condition",
      label: "Điều kiện",
      render: (_v, r) => (
        <span className={book.text}>
          {r.promo.minOrderVnd ? `Đơn từ ${vnd(r.promo.minOrderVnd)}` : "Không điều kiện"}
        </span>
      ),
    },
    {
      key: "window",
      label: "Hiệu lực",
      render: (_v, r) => <span className={`${book.nowrap} ${book.num}`}>{windowLabel(r.promo)}</span>,
    },
    { key: "uses", label: "Lượt", render: (_v, r) => <UsesCell promo={r.promo} /> },
    {
      key: "standing",
      label: "Trạng thái",
      render: (_v, r) => (
        <Badge tone={STANDING[r.standing].tone} size="sm">
          {STANDING[r.standing].label}
        </Badge>
      ),
    },
    // v3 names this column for assistive tech only; each menu names its code.
    // 60: the 36px trigger and the compact cell's 12px either side.
    { key: "actions", label: "", width: 60, render: (_v, r) => rowMenu(r.promo, r.standing) },
  ];
  // v3 does not sort: the codes are in the order the shop holds them.
  const columns = columnList.map((c) => ({ ...c, sortable: false }));

  const tableRows = shown.map<Row>(({ promo, standing }) => ({ code: String(promo.code), promo, standing }));

  const table = (
    <div className={styles.book}>
      <SortableDataTable
        rows={tableRows}
        columns={columns}
        rowKey="code"
        caption="Mã giảm giá"
        emptyMessage="Không có mã nào trong nhóm này."
        holdWidths={false}
        density="compact"
        showCount={false}
        rowAttributes={(r) => ({
          "data-inactive": r.standing === "LIVE" || r.standing === "UPCOMING" ? undefined : "",
        })}
      />
    </div>
  );

  const editing = form?.promo ?? null;

  return (
    <div className={page.page}>
      <header className={page.header}>
        <div className={page.headRow}>
          <h1 className={page.title}>Mã giảm giá</h1>
          <div className={page.actions}>
            <Badge size="sm">Dữ liệu mẫu</Badge>
            <Button variant="secondary" size="sm" onClick={() => downloadCsv("ma-giam-gia.csv", csvRows)}>
              <Download {...ICON} />
              Tải CSV
            </Button>
            <Button variant="primary" size="sm" onClick={(e) => openForm(null, e.currentTarget)}>
              <Plus {...ICON} />
              Tạo mã
            </Button>
          </div>
        </div>
      </header>

      <Tabs value={tab ?? ALL} onValueChange={(v) => go({ state: v === ALL ? null : v })}>
        <TabsList aria-label="Trạng thái">
          {TABS.map((t) => (
            <TabsTrigger key={t.value ?? ALL} value={t.value ?? ALL}>
              {t.label}{" "}
              <span className={book.tabCount}>{t.value ? counts(t.value) : rows.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.value ?? ALL} value={t.value ?? ALL}>
            {table}
          </TabsContent>
        ))}
      </Tabs>

      <ArcPromoDrawer
        key={form?.opening ?? 0}
        open={open}
        pending={pending}
        promo={editing}
        standing={
          editing
            ? `${STANDING[promoState(editing, now)].label} · ${editing.usedCount}${
                editing.usageLimit === null ? "" : ` / ${editing.usageLimit}`
              } lượt`
            : undefined
        }
        taken={taken}
        duplicate={editing ? duplicateOf(editing) : undefined}
        opener={opener}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        onSave={(d) =>
          editing
            ? act(
                () => editPromo(String(editing.code), d),
                () => setOpen(false),
              )
            : act(
                () => addPromo(d),
                () => setOpen(false),
              )
        }
        onDuplicate={
          editing
            ? (d) =>
                act(
                  () => addPromo(d, String(editing.code)),
                  () => setOpen(false),
                )
            : undefined
        }
      />
    </div>
  );
}

/**
 * How much of its cap a code has spent: a 4px bar and "đã dùng / giới hạn",
 * the bar in the accent and the whole track in ink once it is full, as the
 * overview's sellers read (slice 2). A code without a cap has nothing to fill:
 * "N · không giới hạn", as v3.
 */
function UsesCell({ promo: p }: { promo: Promotion }) {
  if (p.usageLimit === null || p.usageLimit === 0) {
    return <span className={`${book.nowrap} ${book.num}`}>{p.usedCount} · không giới hạn</span>;
  }
  const percent = Math.min(100, Math.round((p.usedCount / p.usageLimit) * 100));
  return (
    <span className={styles.uses}>
      <span className={styles.meter} data-full={percent >= 100 ? "" : undefined} aria-hidden="true">
        <span className={styles.meterFill} style={{ width: `${percent}%` }} />
      </span>
      <span className={styles.usesCount}>
        {p.usedCount} / {p.usageLimit}
      </span>
    </span>
  );
}

/**
 * "11/09 → 25/09", or the hours when a code lives inside one day (v3): a
 * two-hour opening promotion and a fortnight-long one are different offers,
 * and printing both as "11/09 → 11/09" would hide the one that matters.
 */
function windowLabel(p: Promotion): string {
  const sameDay = p.startsAt.slice(0, 10) === p.endsAt.slice(0, 10);
  return sameDay
    ? `${dayMonth(p.startsAt)} ${clockLabel(p.startsAt)} → ${clockLabel(p.endsAt)}`
    : `${dayMonth(p.startsAt)} → ${dayMonth(p.endsAt)}`;
}
