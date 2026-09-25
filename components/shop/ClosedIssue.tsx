import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import type { Drop } from "@/data/types";
import type { Catalog } from "@/lib/catalog";
import { closedAtLabel } from "@/lib/datetime";
import { dropCalendar, issueHref } from "@/lib/drop";
import { dropSummary, productsInDrop } from "@/lib/inventory";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";
import { styleCountLabel } from "@/lib/money";
import { photoUrl } from "@/lib/photos";

/**
 * The parts of an issue's cover that BOTH the home page and the archive
 * page draw.
 *
 * They were local to `app/page.tsx` until v3 slice 4, when a closed issue
 * got a page of its own (`/so/[no]`). Two copies of a cover is two covers
 * that drift; this is one, imported by both. Server components — nothing
 * here needs the browser.
 */

/**
 * The photograph the cover is printed on. One picture, borrowed like every
 * other one here (`lib/photos.ts`), square on the phone and a full column
 * from 900px.
 *
 * `fill`, not width/height: the photo has to take the height the LABEL
 * decides, not the other way round. The parent is positioned, which is what
 * `fill` needs.
 *
 * Decorative: everything it could tell a reader is written on the label
 * beside it, so alt text would only repeat the headline.
 */
export function CoverPhoto({ photoKey, priority }: { photoKey: string; priority?: boolean }) {
  return (
    <div className="photo">
      <Image
        src={photoUrl(photoKey, 1600, 72)}
        alt=""
        fill
        // 390 phone: the full width. From 900px: seven of the twelve columns
        // of a page that stops growing at 1280.
        sizes="(min-width: 900px) 747px, 100vw"
        {...(priority ? { priority: true } : {})}
      />
    </div>
  );
}

/** "SỐ 05" — the masthead, set as the issue's own lettering. */
export function IssueNumber({ no }: { no: number }) {
  return (
    <div className="issue">
      <span className="k">{LEX.tu}</span>
      <span className="num">{issueNo(no)}</span>
    </div>
  );
}

/**
 * An issue that is over. Same frame as the one selling, drained of colour.
 *
 * Only what the record says: how many styles, how many units were cut, how
 * many went. No sell-out time on the cover, no "bán hết" unless the shelf
 * really is empty, and no button that pretends the window is still open.
 */
export function ClosedCover({
  catalog,
  drop,
  previous,
  headingId = "cover-t",
  priority,
}: {
  catalog: Catalog;
  drop: Drop;
  /** The issue before this one, for "Về số 03". */
  previous?: Drop | undefined;
  headingId?: string;
  priority?: boolean;
}) {
  const summary = dropSummary(catalog, drop.no);
  const forward = forwardIssue(catalog, drop);
  // An issue that is over is a record of ITS OWN styles, so the cover is one
  // of them — the first in the catalog — rather than the shop's standing
  // hero, which belongs to whichever issue is selling now.
  const cover = productsInDrop(catalog, drop.no)[0]?.photoKeys[0] ?? "hero";

  return (
    <section className="cover shut" aria-labelledby={headingId}>
      <CoverPhoto photoKey={cover} {...(priority ? { priority: true } : {})} />
      <div className="face">
        <IssueNumber no={drop.no} />
        <p className="state">
          <Badge tone="shut">Đã đóng</Badge>
          <span className="tnum">
            Mở {closedAtLabel(drop.opensAt)} · đóng {closedAtLabel(drop.closesAt)}
          </span>
        </p>
        {/* "108 / 181" is one figure: no-break spaces either side of the
            slash, or the line broke after "108 /" (v3 slice 13). */}
        <h1 className="disp t" id={headingId}>
          {capitalise(styleCountLabel(summary.styles))}.{" "}
          {`${summary.soldUnits}\u00a0/\u00a0${summary.cutUnits}`} chiếc đã bán.
        </h1>
        <p className="lead">
          Bản ghi của {LEX.tl} {issueNo(drop.no)}: mẫu nào, cắt bao nhiêu, hết lúc nào.
          Không mua được nữa; mẫu có thể quay lại ở một {LEX.tl} sau, cũng có thể không.
        </p>
        <div className="cta">
          {forward &&
            (forward.href.startsWith("#") ? (
              <a className="btn" href={forward.href}>
                {forward.label}
              </a>
            ) : (
              <ButtonLink href={forward.href}>{forward.label}</ButtonLink>
            ))}
          {previous && (
            <Link className="btn quiet" href={issueHref(previous.no)}>
              Về {LEX.tl} {issueNo(previous.no)}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Where the closed cover's one honey button goes.
 *
 * "Xem số 05 đang bán" is only true while 05 is open, so the label is read
 * off the clock like everything else; with nothing selling, the next thing
 * worth a tap is the issue about to open, which is on the home page. When
 * neither exists there is nowhere honest to send anyone, and the button is
 * not drawn.
 */
function forwardIssue(
  catalog: Catalog,
  drop: Drop,
): { href: string; label: string } | undefined {
  const cal = dropCalendar(catalog);
  if (cal.open && cal.open.no !== drop.no) {
    // The issue's own page (v3 slice 11); `/products` mixes in the fixed styles.
    return { href: issueHref(cal.open.no), label: `Xem ${LEX.tl} ${issueNo(cal.open.no)} đang bán` };
  }
  if (cal.upcoming) {
    return { href: "/#next", label: `${issueLabel(cal.upcoming.no)} sắp mở` };
  }
  return undefined;
}

/** Every style of an issue that is over, and how much of each cut went. */
export function ClosedContents({ catalog, drop }: { catalog: Catalog; drop: Drop }) {
  const products = productsInDrop(catalog, drop.no);
  const summary = dropSummary(catalog, drop.no);

  return (
    <section className="sec" aria-labelledby="h-all">
      <div className="hd">
        <h2 id="h-all">
          {capitalise(styleCountLabel(summary.styles))} của {LEX.tl} {issueNo(drop.no)}
        </h2>
        <span className="meta">
          {summary.onHand === 0
            ? "tất cả đã hết"
            : `${summary.soldUnits} / ${summary.cutUnits} đã bán`}
        </span>
      </div>
      <div className="grid3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} closed />
        ))}
      </div>
    </section>
  );
}

/**
 * The four rules this build actually enforces.
 *
 * A definition list: no icons, no cards, because four boxes of
 * icon-plus-heading-plus-text is a page scaffold pretending to be content.
 * Shared by the home page (where the cover's quiet button points at it) and
 * `/about` (where it is the only thing on the page that is not prose).
 */
export function FourRules({ anchor = false }: { anchor?: boolean }) {
  return (
    <section
      className={anchor ? "sec anchor" : "sec"}
      {...(anchor ? { id: "rules" } : {})}
      aria-labelledby="h-rules"
    >
      <div className="hd">
        <h2 id="h-rules">Bốn quy tắc</h2>
        <span className="meta">áp dụng cho mọi {LEX.tl}</span>
      </div>
      <div className="rules">
        <div className="r">
          <b>Cắt đúng một lần</b>
          <span>Mỗi mẫu cắt từ khổ vải đã đặt. Không may thêm giữa {LEX.tl}.</span>
        </div>
        <div className="r">
          <b>Có giờ mở, giờ đóng</b>
          <span>Mở theo lịch công bố trước. Đóng khi hết hàng hoặc hết giờ.</span>
        </div>
        <div className="r">
          <b>Số còn lại là số thật</b>
          <span>Còn bao nhiêu chiếc hiện ngay trên lưới, không đợi bấm vào mới biết.</span>
        </div>
        <div className="r">
          <b>Một dải size cho tất cả</b>
          <span>Không chia nam nữ. Chọn theo form và số đo.</span>
        </div>
      </div>
    </section>
  );
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
