"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { AdminTop } from "@/components/admin/AdminTop";
import { useAdminToast } from "@/components/admin/AdminToast";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { InventoryAdjustSheet } from "@/components/admin/InventoryAdjustSheet";
import { SearchBox } from "@/components/admin/AdminOrdersScreen";
import { ActionMenu, ChipMenu, Stabs, ToggleChip } from "@/components/admin/Table3";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { COLORS } from "@/data/colors";
import { useCatalog } from "@/components/shop/CatalogContext";
import { SIZES, type Product, type Teaser } from "@/data/types";
import { adjustStock } from "@/lib/actions/catalog-admin";
import { hrefWith, type Query } from "@/lib/admin-url";
import { dropState } from "@/lib/drop";
import {
  LOW_STOCK_AT,
  isSoldOut,
  onHand,
  productsInDrop,
  soldOutSizes,
  soldUnits,
} from "@/lib/inventory";
import { LEX, issueNo } from "@/lib/lexicon";
import { plainVnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";

const PATH = "/admin/products";

/**
 * Every style the shop has cut, issue by issue.
 *
 * "Đang bán", "Hết" and "Đã đóng" are three states and not two: selling out
 * and running out of time both stop the sale, but they are different facts
 * and the shop acts on them differently. Collapsing them would hide the
 * second case entirely.
 *
 * The figures come from `lib/inventory` — the same functions the shop reads —
 * over the catalogue the database holds, so a stock adjustment saved in the
 * sheet below (`adjustStock` → `admin_adjust_stock()`, slice B3b) shows here,
 * on the issue's KPIs, on the overview and on the shop's own product page in
 * the response that answers the save.
 */
export function ProductsTable({ nowIso, query }: { nowIso: string; query: Query }) {
  const catalog = useCatalog();
  const say = useAdminToast();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
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
  const tabs = drops
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

  const dropNo = query.drop ? Number(query.drop) : openIssue;
  const kind = query.kind ?? null;
  const lowOnly = query.low === "1";
  const goneOnly = query.gone === "1";
  const text = (query.q ?? "").trim().toLocaleLowerCase("vi");

  const inIssue = productsInDrop(catalog, dropNo, products);
  const kinds = [...new Set(inIssue.map((p) => p.kind))].sort((a, b) => a.localeCompare(b, "vi"));

  const rows = inIssue
    .filter((p) => (kind ? p.kind === kind : true))
    .filter((p) => (lowOnly ? onHand(p) > 0 && onHand(p) <= LOW_STOCK_AT : true))
    .filter((p) => (goneOnly ? isSoldOut(p) : true))
    .filter((p) => (text ? p.name.toLocaleLowerCase("vi").includes(text) : true))
    .sort((a, b) => b.cutUnits - a.cutUnits || a.name.localeCompare(b.name, "vi"));

  const lowCount = inIssue.filter((p) => onHand(p) > 0 && onHand(p) <= LOW_STOCK_AT).length;
  const goneCount = inIssue.filter(isSoldOut).length;
  const cut = inIssue.reduce((n, p) => n + p.cutUnits, 0);
  const left = inIssue.reduce((n, p) => n + onHand(p), 0);
  const selling = drops
    .filter((d) => dropState(d, now) === "OPEN")
    .reduce((n, d) => n + productsInDrop(catalog, d.no, products).length, 0);

  const issueTeasers = teasers.filter((t) => t.dropNo === dropNo);
  const state = drops.find((d) => d.no === dropNo);
  const issueState = state ? dropState(state, now) : "CLOSED";

  const csvRows = [
    ["Mẫu", "Loại", "Form", LEX.t, "Giá (VND)", "Màu", "Đã cắt", "Đã bán", "Còn", "Size hết"],
    ...products.map((p) => [
      p.name,
      p.kind,
      p.fit === "OVERSIZE" ? "oversize" : "regular",
      issueNo(p.dropNo),
      p.priceVnd,
      p.colors.map((c) => COLORS[c].label).join(" · "),
      p.cutUnits,
      soldUnits(p),
      onHand(p),
      soldOutSizes(p).join(" · ") || "—",
    ]),
  ];

  return (
    <>
      <AdminTop
        title="Mẫu"
        sub={`${products.length} mẫu qua ${drops.filter((d) => productsInDrop(catalog, d.no, products).length > 0).length} ${LEX.tl} · ${selling} đang bán · tồn kho theo size và màu`}
      >
        <ExportCsvButton label="Tải CSV" filename="mau.csv" rows={csvRows} />
        <ButtonLink tone="sm" icon="plus" href="/admin/products/new">
          Thêm mẫu
        </ButtonLink>
      </AdminTop>

      <div className="dt3">
        <Stabs
          label={LEX.t}
          param="drop"
          active={String(dropNo)}
          path={PATH}
          query={query}
          tabs={tabs.map((t) => ({
            value: String(t.no),
            label: `${LEX.t} ${issueNo(t.no)}${t.styles === 0 && t.teasers > 0 ? " · hé lộ" : ""}`,
            count: t.styles || t.teasers,
          }))}
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
            {...(kind ? { note: String(inIssue.filter((p) => p.kind === kind).length) } : {})}
          />
          <ToggleChip
            label={`Sắp hết`}
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

        {inIssue.length === 0 ? (
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
              {rows.map((p) => {
                const remaining = onHand(p);
                const percent = p.cutUnits === 0 ? 0 : Math.round((remaining / p.cutUnits) * 100);
                const out = soldOutSizes(p);
                return (
                  <tr key={p.id}>
                    <td className="nw">
                      <Image
                        className="th"
                        src={photoUrl(p.photoKeys[0]!, 120)}
                        alt=""
                        width={36}
                        height={45}
                      />
                      <b className="nm">{p.name}</b>
                    </td>
                    <td>
                      {p.kind} · {p.fit === "OVERSIZE" ? "oversize" : "regular"}
                    </td>
                    <td className="right">{plainVnd(p.priceVnd)}</td>
                    <td>{p.colors.map((c) => COLORS[c].label).join(" · ")}</td>
                    <td>
                      <div className="cellmeter">
                        <div
                          className={
                            remaining === 0
                              ? "meter gone"
                              : remaining <= LOW_STOCK_AT
                                ? "meter hot"
                                : "meter"
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
                    <td>{out.length === SIZES.length ? "tất cả" : out.join(" · ") || "—"}</td>
                    <td>
                      <Badge
                        tone={
                          remaining === 0
                            ? "shut"
                            : issueState !== "OPEN"
                              ? "shut"
                              : remaining <= LOW_STOCK_AT
                                ? "hot"
                                : "ok"
                        }
                      >
                        {remaining === 0
                          ? "Hết"
                          : issueState !== "OPEN"
                            ? "Đã đóng"
                            : remaining <= LOW_STOCK_AT
                              ? "Sắp hết"
                              : "Đang bán"}
                      </Badge>
                    </td>
                    <td>
                      <ActionMenu
                        label={`Thao tác ${p.name}`}
                        items={[
                          {
                            label: "Sửa mẫu",
                            icon: "edit",
                            href: `/admin/products/${p.id}`,
                          },
                          {
                            label: "Điều chỉnh tồn kho",
                            icon: "swap",
                            onRun: () => setAdjusting(p),
                          },
                          {
                            label: "Xem ở cửa hàng",
                            icon: "eye",
                            href: `/products/${p.slug}`,
                            newTab: true,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {inIssue.length > 0 && rows.length === 0 ? (
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
        onBlocked={say}
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
              say(result.message ?? result.errors.form ?? "");
            });
          });
        }}
      />
    </>
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
              <b className="nm">{t.name}</b>
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
