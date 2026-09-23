import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ClosedContents, ClosedCover } from "@/components/shop/ClosedIssue";
import { ShopFrame } from "@/components/shop/ShopFrame";
import type { Drop } from "@/data/types";
import type { Catalog } from "@/lib/catalog";
import { loadCatalog } from "@/lib/db/catalog";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { dropState } from "@/lib/drop";
import { dropSummary, productsInDrop } from "@/lib/inventory";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";
import { kindInSentence } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { ORDERS } from "@/data/orders";
import { soldOutTimes, type SoldOutRow } from "@/lib/sold-out-times";

/**
 * "Sổ tay các số" — one closed issue, as a page of its own.
 *
 * It exists because a closed issue is a RECORD, and a record needs an
 * address. Until v3 slice 4 it was `/?drop=4`, a query string on the home
 * page — which made it unlinkable in a sentence, impossible to title, and
 * indistinguishable from the shop's front door. Every "xem lại" in the app
 * now points here, and `/?drop=N` for a closed N redirects.
 *
 * ONLY a closed issue. The one selling now has `/products`, and the one
 * about to open is the teaser at the foot of the home page; drawing either
 * of them in the archive's grammar would say they are over.
 */
export async function generateMetadata(
  props: PageProps<"/so/[no]">,
): Promise<Metadata> {
  const catalog = await loadCatalog();
  const drop = await askedDrop(catalog, props);
  if (!drop) return { title: "Không tìm thấy số" };
  return {
    title: `${issueLabel(drop.no)} · đã đóng`,
    description: `Bản ghi của ${LEX.tl} ${issueNo(drop.no)}: mẫu nào, cắt bao nhiêu, hết lúc nào.`,
  };
}

async function askedDrop(
  catalog: Catalog,
  props: PageProps<"/so/[no]">,
): Promise<Drop | undefined> {
  const { no } = await props.params;
  const asked = Number(no);
  return Number.isFinite(asked) ? catalog.dropByNo.get(asked) : undefined;
}

export default async function IssuePage(props: PageProps<"/so/[no]">) {
  const catalog = await loadCatalog();
  const drop = await askedDrop(catalog, props);
  if (!drop) notFound();

  // The state is read off the clock, never off the URL — the same rule the
  // home page follows. An issue that is still selling belongs on the shop
  // floor, and one that has not opened belongs to the teaser.
  const state = dropState(drop);
  if (state === "OPEN") redirect("/products");
  if (state === "UPCOMING") redirect("/#next");

  const byNo = [...catalog.drops].sort((a, b) => a.no - b.no);
  const previous = byNo.filter((d) => d.no < drop.no && dropState(d) === "CLOSED").pop();
  const closed = byNo.filter((d) => dropState(d) === "CLOSED").sort((a, b) => b.no - a.no);

  const rows = soldOutTimes(productsInDrop(catalog, drop.no), ORDERS, drop.closesAt);

  return (
    <ShopFrame>
      <ClosedCover catalog={catalog} drop={drop} previous={previous} priority />

      <div className="wrap3">
        <SoldOutTable rows={rows} />
        <ClosedContents catalog={catalog} drop={drop} />
        <PastIssues catalog={catalog} closed={closed} current={drop.no} />
      </div>
    </ShopFrame>
  );
}

/**
 * "Hết lúc nào" — when each style ran out (`lib/sold-out-times.ts`).
 *
 * Two sources, in that module's order: the orders that paid for it where
 * they can prove it, otherwise the shop's own record on the style. The
 * column is still ALLOWED to be empty — a style with neither prints "—" and
 * the line under the table appears to say why. Filling it with plausible
 * hours would be inventing the record this page exists to show (DESIGN.md
 * §9 rule 1).
 */
function SoldOutTable({ rows }: { rows: SoldOutRow[] }) {
  const missing = rows.filter((r) => r.soldOutAt === undefined).length;

  return (
    <section className="sec" aria-labelledby="h-solds">
      <div className="hd">
        <h2 id="h-solds">Hết lúc nào</h2>
        <span className="meta">theo sổ cửa hàng · dữ liệu mô phỏng</span>
      </div>

      <div className="solds">
        <div className="r hrow">
          <span>Mẫu</span>
          <span>Đã bán</span>
          <span>Hết lúc</span>
        </div>
        {rows.map((row) => (
          <div className="r" key={row.product.id}>
            <span>
              <b>{row.product.name}</b>{" "}
              <span>
                · {kindInSentence(row.product.kind)} · {vnd(row.product.priceVnd)}
              </span>
            </span>
            <span>
              {row.soldUnits} / {row.cutUnits}
            </span>
            <span>
              {row.soldOutAt ? (
                <>
                  {clockLabel(row.soldOutAt)} · {dayMonth(row.soldOutAt)}
                  {row.atClose ? " · giờ đóng" : ""}
                </>
              ) : (
                <span className="none">—</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {missing > 0 && (
        <p className="fine3">
          {missing === rows.length ? "Chưa mẫu nào" : `${missing} mẫu chưa`} có mốc “hết
          lúc”: sổ cửa hàng chưa ghi, và dữ liệu đơn mẫu chỉ là một phần của sổ bán nên
          không suy ra được. Không đủ dữ liệu thì để trống, không điền giờ nghe hợp lý.
        </p>
      )}
    </section>
  );
}

/** The line that says which issues are in the archive, and where the next one is. */
function PastIssues({
  catalog,
  closed,
  current,
}: {
  catalog: Catalog;
  closed: Drop[];
  current: number;
}) {
  const others = closed.filter((d) => d.no !== current);

  return (
    <p className="past">
      <span>
        Các {LEX.tl} đã đóng:{" "}
        {closed.map((d, i) => (
          <span key={d.no}>
            {i > 0 && " · "}
            {d.no === current ? <b>{issueNo(d.no)}</b> : issueNo(d.no)}
          </span>
        ))}
      </span>
      {others.map((d) => {
        const summary = dropSummary(catalog, d.no);
        return (
          <Link className="lnk" key={d.no} href={`/so/${d.no}`}>
            {issueLabel(d.no)} · {summary.styles} mẫu · {dayMonth(d.closesAt)}
          </Link>
        );
      })}
    </p>
  );
}
