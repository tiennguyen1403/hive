"use client";

import { Copy, Download, MoreHorizontal, Pause, Pencil, Play, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
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
import { promoKindLabel, promoState, promoValueLabel, type PromoState } from "@/lib/admin-rows";
import { hrefWith, patched, type Query } from "@/lib/admin-url";
import { downloadCsv } from "@/lib/csv";
import { clockLabel, dayMonth, dayMonthYear } from "@/lib/datetime";
import { dropState } from "@/lib/drop";
import { picker, type Locale, type Pair } from "@/lib/i18n";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { Badge, type BadgeTone } from "@/registry/components/badge/badge";
import { Button } from "@/registry/components/button/button";
import { DropdownMenu, type DropdownItem } from "@/registry/components/dropdown-menu/dropdown-menu";
import {
  SortableDataTable,
  type DataColumn,
} from "@/registry/components/sortable-data-table/sortable-data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/components/tabs/tabs";
import { ArcMeter } from "./ArcMeter";
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
const STANDING: Record<PromoState, { label: Pair; tone: BadgeTone }> = {
  LIVE: { label: { vi: "Đang chạy", en: "Active" }, tone: "success" },
  UPCOMING: { label: { vi: "Sắp chạy", en: "Scheduled" }, tone: "info" },
  PAUSED: { label: { vi: "Tạm dừng", en: "Paused" }, tone: "neutral" },
  ENDED: { label: { vi: "Hết hạn", en: "Expired" }, tone: "neutral" },
  USED_UP: { label: { vi: "Hết lượt", en: "Used up" }, tone: "danger" },
};

const TABS: Array<{ value: PromoState | null; label: Pair }> = [
  { value: null, label: { vi: "Tất cả", en: "All" } },
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
  // The page's language (round v6 slice E5). The codes themselves are typed, and printed as typed.
  const locale = useLocale();
  const t = picker(locale);
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
          label: t({ vi: `${LEX.tl} ${issueNo(nextIssue.no)}`, en: issueLabel(nextIssue.no, "en") }),
        }
      : {
          code: `${p.code}-2`,
          startsAt: p.startsAt,
          endsAt: p.endsAt,
          label: t({ vi: "cùng khoảng thời gian", en: "the same dates" }),
        };

  const csvRows = [
    t({
      vi: ["Mã", "Loại", "Giảm", "Điều kiện", "Bắt đầu", "Kết thúc", "Đã dùng", "Giới hạn", "Trạng thái"],
      en: ["Code", "Type", "Discount", "Condition", "Starts", "Ends", "Used", "Limit", "Status"],
    }),
    ...rows.map(({ promo, standing }) => [
      String(promo.code),
      promoKindLabel(promo.kind, locale),
      promoValueLabel(promo, locale),
      promo.minOrderVnd ? t({ vi: `Đơn từ ${promo.minOrderVnd}`, en: `Orders from ${promo.minOrderVnd}` }) : "—",
      dayMonthYear(promo.startsAt, locale),
      dayMonthYear(promo.endsAt, locale),
      promo.usedCount,
      promo.usageLimit ?? t({ vi: "không giới hạn", en: "no limit" }),
      t(STANDING[standing].label),
    ]),
  ];

  const taken = rows.map((r) => String(r.promo.code));

  function rowMenu(p: Promotion, standing: PromoState) {
    const code = String(p.code);
    const edit = () => openForm(p, menus.current.get(code)?.querySelector("button") ?? null);
    const items: DropdownItem[] = [
      { label: t({ vi: "Sửa", en: "Edit" }), icon: <Pencil {...ICON} />, onSelect: edit },
      ...(p.usageLimit !== null
        ? [
            {
              label: t({ vi: `Nâng giới hạn thêm ${RAISE_BY}`, en: `Raise limit by ${RAISE_BY}` }),
              icon: <Plus {...ICON} />,
              onSelect: () => act(() => raisePromoLimit(code, p.usageLimit! + RAISE_BY)),
            },
          ]
        : []),
      // v3: a copy is made from the code's own form, whose "Nhân bản thành …"
      // names the copy and its window before anything is written.
      { label: t({ vi: "Nhân bản", en: "Duplicate" }), icon: <Copy {...ICON} />, onSelect: edit },
      p.paused
        ? {
            label: t({ vi: "Tiếp tục", en: "Resume" }),
            icon: <Play {...ICON} />,
            onSelect: () => act(() => pausePromo(code, false)),
          }
        : {
            label: t({ vi: "Tạm dừng", en: "Pause" }),
            icon: <Pause {...ICON} />,
            onSelect: () => act(() => pausePromo(code, true)),
          },
      ...(standing === "LIVE"
        ? [
            {
              label: t({ vi: "Kết thúc sớm", en: "End early" }),
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
        <DropdownMenu
          iconOnly
          label={t({ vi: `Thao tác ${code}`, en: `Actions for ${code}` })}
          icon={<MoreHorizontal {...ICON} />}
          items={items}
        />
      </span>
    );
  }

  const columnList: DataColumn<Row>[] = [
    { key: "code", label: t({ vi: "Mã", en: "Code" }), render: (_v, r) => <span className={styles.code}>{r.code}</span> },
    {
      key: "value",
      label: t({ vi: "Giảm", en: "Discount" }),
      render: (_v, r) => <span className={book.text}>{promoValueLabel(r.promo, locale)}</span>,
    },
    {
      key: "condition",
      label: t({ vi: "Điều kiện", en: "Condition" }),
      render: (_v, r) => (
        <span className={book.text}>
          {r.promo.minOrderVnd
            ? t({ vi: `Đơn từ ${vnd(r.promo.minOrderVnd)}`, en: `Orders from ${vnd(r.promo.minOrderVnd, "en")}` })
            : t({ vi: "Không điều kiện", en: "No minimum" })}
        </span>
      ),
    },
    {
      key: "window",
      label: t({ vi: "Hiệu lực", en: "Valid" }),
      render: (_v, r) => <span className={`${book.nowrap} ${book.num}`}>{windowLabel(r.promo, locale)}</span>,
    },
    { key: "uses", label: t({ vi: "Lượt", en: "Uses" }), render: (_v, r) => <UsesCell promo={r.promo} locale={locale} /> },
    {
      key: "standing",
      label: t({ vi: "Trạng thái", en: "Status" }),
      render: (_v, r) => (
        <Badge tone={STANDING[r.standing].tone} size="sm">
          {t(STANDING[r.standing].label)}
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
        caption={t({ vi: "Mã giảm giá", en: "Discount codes" })}
        emptyMessage={t({ vi: "Không có mã nào trong nhóm này.", en: "No codes in this group." })}
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
          <h1 className={page.title}>{t({ vi: "Mã giảm giá", en: "Discount codes" })}</h1>
          <div className={page.actions}>
            <Badge size="sm">{t({ vi: "Dữ liệu mẫu", en: "Demo data" })}</Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadCsv(t({ vi: "ma-giam-gia.csv", en: "discount-codes.csv" }), csvRows)}
            >
              <Download {...ICON} />
              {t({ vi: "Tải CSV", en: "Download CSV" })}
            </Button>
            <Button variant="primary" size="sm" onClick={(e) => openForm(null, e.currentTarget)}>
              <Plus {...ICON} />
              {t({ vi: "Tạo mã", en: "Create code" })}
            </Button>
          </div>
        </div>
      </header>

      <Tabs value={tab ?? ALL} onValueChange={(v) => go({ state: v === ALL ? null : v })}>
        <TabsList aria-label={t({ vi: "Trạng thái", en: "Status" })}>
          {TABS.map((x) => (
            <TabsTrigger key={x.value ?? ALL} value={x.value ?? ALL}>
              {t(x.label)}{" "}
              <span className={book.tabCount}>{x.value ? counts(x.value) : rows.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((x) => (
          <TabsContent key={x.value ?? ALL} value={x.value ?? ALL}>
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
            ? `${t(STANDING[promoState(editing, now)].label)} · ${editing.usedCount}${
                editing.usageLimit === null ? "" : ` / ${editing.usageLimit}`
              } ${t({ vi: "lượt", en: editing.usedCount === 1 && editing.usageLimit === null ? "use" : "uses" })}`
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
 * How much of its cap a code has spent: the 4px bar (`ArcMeter`) and "đã
 * dùng / giới hạn", the bar in the accent and the whole track in ink once it
 * is full, as the overview's sellers read (slice 2). A code without a cap has
 * nothing to fill: "N · không giới hạn", as v3.
 */
function UsesCell({ promo: p, locale }: { promo: Promotion; locale: Locale }) {
  if (p.usageLimit === null || p.usageLimit === 0) {
    return (
      <span className={`${book.nowrap} ${book.num}`}>
        {picker(locale)<React.ReactNode>({
          vi: <>{p.usedCount} · không giới hạn</>,
          en: <>{p.usedCount} · no limit</>,
        })}
      </span>
    );
  }
  const percent = Math.min(100, Math.round((p.usedCount / p.usageLimit) * 100));
  return (
    <span className={styles.uses}>
      <ArcMeter percent={percent} reading={percent >= 100 ? "gone" : undefined} className={styles.usesBar} />
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
function windowLabel(p: Promotion, locale: Locale): string {
  const sameDay = p.startsAt.slice(0, 10) === p.endsAt.slice(0, 10);
  return sameDay
    ? `${dayMonth(p.startsAt, locale)} ${clockLabel(p.startsAt)} → ${clockLabel(p.endsAt)}`
    : `${dayMonth(p.startsAt, locale)} → ${dayMonth(p.endsAt, locale)}`;
}
