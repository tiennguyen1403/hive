"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { AdminTop } from "@/components/admin/AdminTop";
import { useAdminToast } from "@/components/admin/AdminToast";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { InventoryAdjustSheet } from "@/components/admin/InventoryAdjustSheet";
import { SearchBox } from "@/components/admin/AdminOrdersScreen";
import { ActionMenu, ChipMenu, Stabs, ToggleChip, type ActionItem } from "@/components/admin/Table3";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { COLORS } from "@/data/colors";
import { useCatalog } from "@/components/shop/CatalogContext";
import { SIZES, type DropState, type Product, type ProductId, type Teaser } from "@/data/types";
import { adjustStock, restockProduct } from "@/lib/actions/catalog-admin";
import {
  fixedCounts,
  fixedRows,
  fixedStatus,
  lowNote,
  productsTab,
  stylesLine,
} from "@/lib/admin-products";
import { hrefWith, type Query } from "@/lib/admin-url";
import { RESTOCK_STALE_MESSAGE } from "@/lib/catalog-admin";
import { styleNameHas } from "@/lib/catalog-query";
import { dropState } from "@/lib/drop";
import {
  LOW_STOCK_AT,
  type IssueStyle,
  isFixed,
  isIssueStyle,
  isRunningLow,
  isSoldOut,
  onHand,
  productsInDrop,
  soldOutSizes,
  soldUnits,
} from "@/lib/inventory";
import { FIXED_WORD, LEX, issueNo, styleName } from "@/lib/lexicon";
import { plainVnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";

const PATH = "/admin/products";

/** The value the Cố định tab stands for in the tab row; it writes `?fixed=1`. */
const FIXED_TAB = "fixed";

/**
 * Every style the shop sells — the fixed ones, then the issues.
 *
 * v3 slice 12 (the fixed-styles board, round 4, approved 25/09/2026): the
 * first tab is "Cố định", the styles that belong to no issue, and it is the
 * one a bare `/admin/products` opens (`?fixed=1` names it). A fixed style
 * running low — a colour in a size down to two or fewer — comes first, wears
 * "Sắp hết" and a red line under its stock saying which sizes, and the tab
 * carries a red dot so the manager sees it from any other tab. "Nhập thêm",
 * first in the ⋯ menu of every fixed style, opens the stock sheet in its
 * restock mode. The rules are `lib/admin-products.ts`.
 *
 * An issue's tab is what it was. "Đang bán", "Hết" and "Đã đóng" are three
 * states and not two: selling out and running out of time both stop the
 * sale, but they are different facts and the shop acts on them differently.
 *
 * The figures come from `lib/inventory` — the same functions the shop reads —
 * over the catalogue the database holds, so a stock move saved in a sheet
 * below (`adjustStock`, `restockProduct` → `admin_adjust_stock()`) shows here,
 * on the issue's KPIs, on the overview and on the shop's own product page in
 * the response that answers the save.
 */
export function ProductsTable({ nowIso, query }: { nowIso: string; query: Query }) {
  const catalog = useCatalog();
  const say = useAdminToast();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  // The restock sheet reads its style from the catalogue by id, so the
  // numbers it shows are always the catalogue's — after a refresh too.
  const [restockId, setRestockId] = useState<ProductId | null>(null);
  const [saving, startSaving] = useTransition();

  const products = catalog.products;
  const drops = catalog.drops;
  const teasers = catalog.teasers;

  const openIssue = drops.find((d) => dropState(d, now) === "OPEN")?.no ?? drops[0]?.no ?? 0;

  /**
   * Issues with something to show: styles cut, or styles announced.
   *
   * The issue that is SELLING comes first, then the rest newest down. The
   * table of issues is a calendar and reads in date order; this row is a
   * place to work, and the work is in the open one.
   */
  const issueTabs = drops
    .filter(
      (d) =>
        productsInDrop(catalog, d.no, products).length > 0 ||
        teasers.some((t) => t.dropNo === d.no),
    )
    .sort((a, b) => (b.no === openIssue ? 1 : 0) - (a.no === openIssue ? 1 : 0) || b.no - a.no)
    .map((d) => ({
      no: d.no,
      styles: productsInDrop(catalog, d.no, products).length,
      teasers: teasers.filter((t) => t.dropNo === d.no).length,
    }));

  const fixed = products.filter(isFixed);
  const fixedTally = fixedCounts(fixed);

  const tab = productsTab(query);
  const dropNo = tab.fixed ? null : tab.no;
  const kind = query.kind ?? null;
  const lowOnly = query.low === "1";
  const goneOnly = query.gone === "1";
  const text = (query.q ?? "").trim();

  const inIssue = dropNo === null ? [] : productsInDrop(catalog, dropNo, products);
  const inTab: Product[] = tab.fixed ? fixed : inIssue;
  const kinds = [...new Set(inTab.map((p) => p.kind))].sort((a, b) => a.localeCompare(b, "vi"));

  /** "Sắp hết" by each tab's own rule: a fixed style's cells, an issue's last three. */
  const isLow = (p: Product) =>
    tab.fixed ? isRunningLow(p) : onHand(p) > 0 && onHand(p) <= LOW_STOCK_AT;

  const ordered: Product[] = tab.fixed
    ? fixedRows(fixed)
    : [...inIssue].sort((a, b) => b.cutUnits - a.cutUnits || a.name.localeCompare(b.name, "vi"));
  const rows = ordered
    .filter((p) => (kind ? p.kind === kind : true))
    .filter((p) => (lowOnly ? isLow(p) : true))
    .filter((p) => (goneOnly ? isSoldOut(p) : true))
    // The name as it is shown: "s05", "khoi" and "S05 – KHÓI" all find KHÓI.
    .filter((p) => (text ? styleNameHas(p, text) : true));

  const lowCount = tab.fixed ? fixedTally.low : inIssue.filter(isLow).length;
  const goneCount = tab.fixed ? fixedTally.out : inIssue.filter(isSoldOut).length;
  const cut = inIssue.reduce((n, p) => n + p.cutUnits, 0);
  const left = inIssue.reduce((n, p) => n + onHand(p), 0);

  const issueTeasers = dropNo === null ? [] : teasers.filter((t) => t.dropNo === dropNo);
  const state = drops.find((d) => d.no === dropNo);
  const issueState: DropState = state ? dropState(state, now) : "CLOSED";

  const csvRows = [
    ["Mẫu", "Loại", "Form", LEX.t, "Giá (VND)", "Màu", "Đã cắt", "Đã bán", "Còn", "Size hết"],
    ...products.map((p) => [
      styleName(p.name, p.dropNo),
      p.kind,
      p.fit === "OVERSIZE" ? "oversize" : "regular",
      // A fixed style (slice B5) has no issue, no cut and so no "đã bán":
      // those cells are left empty rather than filled with a guess.
      p.dropNo === null ? "" : issueNo(p.dropNo),
      p.priceVnd,
      p.colors.map((c) => COLORS[c].label).join(" · "),
      p.cutUnits ?? "",
      isIssueStyle(p) ? soldUnits(p) : "",
      onHand(p),
      soldOutSizes(p).join(" · ") || "—",
    ]),
  ];

  const lowLabel = `${fixedTally.low} mẫu sắp hết`;

  return (
    <>
      <AdminTop title="Mẫu" sub={stylesLine(catalog, now)}>
        <ExportCsvButton label="Tải CSV" filename="mau.csv" rows={csvRows} />
        <ButtonLink tone="sm" icon="plus" href="/admin/products/new">
          Thêm mẫu
        </ButtonLink>
      </AdminTop>

      <div className="dt3">
        <Stabs
          label={`${FIXED_WORD} và các ${LEX.tl}`}
          param="drop"
          active={tab.fixed ? FIXED_TAB : String(dropNo)}
          path={PATH}
          query={query}
          tabs={[
            {
              value: FIXED_TAB,
              label: FIXED_WORD,
              count: fixed.length,
              href: hrefWith(PATH, query, { fixed: "1", drop: null, page: null }),
              // Seen from any tab: there is restocking to do.
              after:
                fixedTally.low > 0 ? (
                  <i className="lowdot" role="img" aria-label={lowLabel} title={lowLabel} />
                ) : null,
            },
            ...issueTabs.map((t) => ({
              value: String(t.no),
              label: `${LEX.t} ${issueNo(t.no)}${t.styles === 0 && t.teasers > 0 ? " · hé lộ" : ""}`,
              count: t.styles || t.teasers,
              href: hrefWith(PATH, query, { drop: t.no, fixed: null, page: null }),
            })),
          ]}
        />
        <div className="bar tools">
          <SearchBox
            value={query.q ?? ""}
            placeholder="Tìm tên mẫu"
            label="Tìm mẫu"
            onSubmit={(v) => router.replace(hrefWith(PATH, query, { q: v || null }))}
          />
          <ChipMenu
            label="Loại"
            active={kind}
            options={[
              { value: null, label: "Tất cả" },
              ...kinds.map((k) => ({ value: k, label: k })),
            ]}
            hrefFor={(v) => hrefWith(PATH, query, { kind: v })}
            {...(kind ? { note: String(inTab.filter((p) => p.kind === kind).length) } : {})}
          />
          <ToggleChip
            label="Sắp hết"
            count={lowCount}
            on={lowOnly}
            href={hrefWith(PATH, query, { low: lowOnly ? null : "1" })}
          />
          <ToggleChip
            label="Hết"
            count={goneCount}
            on={goneOnly}
            href={hrefWith(PATH, query, { gone: goneOnly ? null : "1" })}
          />
        </div>

        {tab.fixed && fixed.length === 0 ? (
          <p className="none">Chưa có mẫu nào.</p>
        ) : !tab.fixed && inIssue.length === 0 ? (
          <TeaserRows teasers={issueTeasers} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mẫu</th>
                <th>Loại · form</th>
                <th className="right">Giá</th>
                <th>Màu</th>
                <th>Tồn kho</th>
                <th>Size hết</th>
                <th>Trạng thái</th>
                <th style={{ width: 44 }}>
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) =>
                isIssueStyle(p) ? (
                  <IssueRow
                    key={p.id}
                    p={p}
                    issueState={issueState}
                    onAdjust={() => setAdjusting(p)}
                  />
                ) : (
                  <FixedRow
                    key={p.id}
                    p={p}
                    onRestock={() => setRestockId(p.id)}
                    onAdjust={() => setAdjusting(p)}
                  />
                ),
              )}
            </tbody>
          </table>
        )}

        {inTab.length > 0 && rows.length === 0 ? (
          <p className="none">Không có mẫu nào khớp.</p>
        ) : inIssue.length > 0 ? (
          <div className="foot">
            <span>
              {inIssue.length} mẫu · {cut} đã cắt · {left} còn · tồn kho là số còn trên kệ, đã bán
              là đã cắt trừ tồn kho
            </span>
          </div>
        ) : null}
      </div>

      <InventoryAdjustSheet
        product={adjusting}
        pending={saving}
        onClose={() => {
          if (!saving) setAdjusting(null);
        }}
        onBlocked={(message) => say(message, "error")}
        onSave={(cells, reason, ref, note) => {
          if (!adjusting || saving) return;
          const id = String(adjusting.id);
          // The sheet stays open on a refusal — a shelf that moved elsewhere
          // (`STALE`) says so and nothing is written. After an `await` the
          // transition has to be restated (react.dev/reference/react/useTransition).
          startSaving(async () => {
            const result = await adjustStock(id, cells, reason, ref, note);
            startSaving(() => {
              if (result.ok) setAdjusting(null);
              say(result.message ?? result.errors.form ?? "", result.ok ? "ok" : "error");
            });
          });
        }}
      />

      <InventoryAdjustSheet
        mode="restock"
        product={restockId ? (catalog.byId.get(restockId) ?? null) : null}
        pending={saving}
        onClose={() => {
          if (!saving) setRestockId(null);
        }}
        onRestock={(cells, note) => {
          if (!restockId || saving) return;
          const id = String(restockId);
          startSaving(async () => {
            const result = await restockProduct(id, cells, note);
            startSaving(() => {
              if (result.ok) setRestockId(null);
              say(result.message ?? result.errors.form ?? "", result.ok ? "ok" : "error");
              // A shelf that moved elsewhere: the sheet stays open and reads
              // the numbers again, so the next press adds to what is there.
              if (!result.ok && result.errors.form === RESTOCK_STALE_MESSAGE) router.refresh();
            });
          });
        }}
      />
    </>
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

/** A style's photo and its name as the back office shows it. */
function StyleCell({ p }: { p: Product }) {
  return (
    <td className="nw">
      <Image className="th" src={photoUrl(p.photoKeys[0]!, 120)} alt="" width={36} height={45} />
      <b className="nm">{styleName(p.name, p.dropNo)}</b>
    </td>
  );
}

/** One style of an issue: cut once, the bar is what is left of the cut. */
function IssueRow({
  p,
  issueState,
  onAdjust,
}: {
  p: IssueStyle;
  issueState: DropState;
  onAdjust: () => void;
}) {
  const remaining = onHand(p);
  const percent = p.cutUnits === 0 ? 0 : Math.round((remaining / p.cutUnits) * 100);
  const name = styleName(p.name, p.dropNo);
  return (
    <tr>
      <StyleCell p={p} />
      <td>{kindAndFit(p)}</td>
      <td className="right">{plainVnd(p.priceVnd)}</td>
      <td>{colourList(p)}</td>
      <td>
        <div className="cellmeter">
          <div
            className={
              remaining === 0 ? "meter gone" : remaining <= LOW_STOCK_AT ? "meter hot" : "meter"
            }
            aria-hidden="true"
          >
            <i style={{ width: `${percent}%` }} />
          </div>
          <span>
            {remaining === 0 ? "hết · 0" : `còn ${remaining}`} / {p.cutUnits}
          </span>
        </div>
      </td>
      <td>{goneSizes(p)}</td>
      <td>
        <Badge
          tone={
            remaining === 0
              ? "shut"
              : issueState === "UPCOMING"
                ? "info"
                : issueState !== "OPEN"
                  ? "shut"
                  : remaining <= LOW_STOCK_AT
                    ? "hot"
                    : "ok"
          }
        >
          {remaining === 0
            ? "Hết"
            : issueState === "UPCOMING"
              ? "Sắp mở"
              : issueState !== "OPEN"
                ? "Đã đóng"
                : remaining <= LOW_STOCK_AT
                  ? "Sắp hết"
                  : "Đang bán"}
        </Badge>
      </td>
      <td>
        <ActionMenu
          label={`Thao tác ${name}`}
          items={[
            { label: "Sửa mẫu", icon: "edit", href: `/admin/products/${p.id}` },
            { label: "Điều chỉnh tồn kho", icon: "swap", onRun: onAdjust },
            { label: "Xem ở cửa hàng", icon: "eye", href: `/products/${p.slug}`, newTab: true },
          ]}
        />
      </td>
    </tr>
  );
}

/**
 * "Trắng · Xanh than": each colour's name one block (no-break spaces inside
 * it), the " · " between two colours the place a line may break. The table
 * broke "Xanh" over "than" (v3 slice 13).
 */
function colourList(p: Product): string {
  return p.colors.map((c) => COLORS[c].label.replace(/ /g, "\u00a0")).join(" · ");
}

const FIXED_BADGE = {
  OUT: { tone: "shut", text: "Hết" },
  LOW: { tone: "hot", text: "Sắp hết" },
  OK: { tone: "ok", text: "Đang bán" },
} as const;

/**
 * One fixed style: no cut to measure against, so no bar — what is on the
 * shelf, and under it in red which sizes need bringing back (`lowNote`). Its
 * ⋯ menu opens with "Nhập thêm", whatever its stock (the board, round 4).
 */
function FixedRow({
  p,
  onRestock,
  onAdjust,
}: {
  p: Product;
  onRestock: () => void;
  onAdjust: () => void;
}) {
  const note = lowNote(p);
  const badge = FIXED_BADGE[fixedStatus(p)];
  const out = soldOutSizes(p);
  const items: ActionItem[] = [
    { label: "Nhập thêm", icon: "box", onRun: onRestock },
    { label: "Sửa mẫu", icon: "edit", href: `/admin/products/${p.id}` },
    { label: "Điều chỉnh tồn kho", icon: "swap", onRun: onAdjust },
    { label: "Xem ở cửa hàng", icon: "eye", href: `/products/${p.slug}`, newTab: true },
  ];
  return (
    <tr>
      <StyleCell p={p} />
      <td>{kindAndFit(p)}</td>
      <td className="right">{plainVnd(p.priceVnd)}</td>
      <td>{colourList(p)}</td>
      <td>
        <div className="stockcell">
          <span>còn {onHand(p)}</span>
          {note && <span className="lownote">{note}</span>}
        </div>
      </td>
      <td className={out.length > 0 ? "hotsize" : undefined}>{goneSizes(p)}</td>
      <td>
        <Badge tone={badge.tone}>{badge.text}</Badge>
      </td>
      <td>
        <ActionMenu label={`Thao tác ${styleName(p.name, p.dropNo)}`} items={items} />
      </td>
    </tr>
  );
}

/**
 * An issue that has been announced but not cut.
 *
 * No price, no stock and no adjust action — a teaser carries a name, a kind
 * and a borrowed photo, and the two missing numbers are published at the
 * hour the issue opens (`Teaser` in `data/types.ts`).
 */
function TeaserRows({ teasers }: { teasers: Teaser[] }) {
  if (teasers.length === 0) {
    return <p className="none">{LEX.t} này chưa có mẫu nào.</p>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Mẫu</th>
          <th>Loại</th>
          <th className="right">Giá</th>
          <th>Tồn kho</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {teasers.map((t) => (
          <tr key={t.slug}>
            <td className="nw">
              <Image
                className="th"
                src={photoUrl(t.photoKey, 120)}
                alt=""
                width={36}
                height={45}
              />
              <b className="nm">{styleName(t.name, t.dropNo)}</b>
            </td>
            <td>{t.kind}</td>
            <td className="right">công bố khi mở</td>
            <td>chưa cắt</td>
            <td>
              <Badge tone="info">Hé lộ</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
