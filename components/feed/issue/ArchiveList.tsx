"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Drop } from "@/data/types";
import { PICTURE, pictureAlt, pictureOf } from "@/lib/feed";
import { issueFacts } from "@/lib/feed-home";
import { ARCHIVE_TITLE, archivePicture, closedIssues, issueHasPhotos, issueNow } from "@/lib/feed-issue";
import { picker, plural } from "@/lib/i18n";
import { productsInDrop } from "@/lib/inventory";
import { issueLabel } from "@/lib/lexicon";
import { nameLang, productText } from "@/lib/product-text";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow } from "../now";
import { cx, useReveal } from "../useReveal";
import { ColorChips, NowStrip } from "./IssueParts";

/**
 * "Các Số đã đóng", `/so` (round v4, slice 1b): the approved mock's
 * `archive.html` and `archive.js` — every closed issue, the newest first,
 * each with its run, what it sold, its styles by name and the way to its page.
 * While something is live — an issue selling, or one announced — a strip at
 * the top leads to it.
 *
 * An issue with photographs of its own wears one (Số 05, once it has closed:
 * KHÓI, black, worn); one without (Số 04, Số 03) is set in type — the number
 * large, the names as a wall, each with its colour chips.
 *
 * In both languages since round v6 slice E1 ("Closed drops"; the names keep
 * `lang="vi"` on an English page).
 */
export function ArchiveList() {
  const catalog = useCatalog();
  const now = useNow();
  const t = picker(useLocale());
  const closed = closedIssues(catalog, now);
  return (
    <>
      <div className="b-head">
        <h1 className="b-title disp">{t(ARCHIVE_TITLE)}</h1>
      </div>
      <NowStrip live={issueNow(catalog, now)} />
      <div className="b-arc">
        {closed.map((d) => (issueHasPhotos(catalog, d.no) ? <PhotoIssue key={d.no} drop={d} /> : <TypeIssue key={d.no} drop={d} />))}
      </div>
    </>
  );
}

/** The issue's number, the link to its page, stretched over the whole entry. */
function IssueTitle({ drop }: { drop: Drop }) {
  const locale = useLocale();
  return (
    <h2 className="b-issue-no disp" id={`arc-${drop.no}`}>
      <Link href={`/so/${drop.no}`}>{issueLabel(drop.no, locale)}</Link>
    </h2>
  );
}

function IssueMeta({ drop }: { drop: Drop }) {
  const catalog = useCatalog();
  const locale = useLocale();
  const f = issueFacts(catalog, drop, locale);
  return (
    <p className="b-issue-meta">
      <span>{f.run}</span>
      <span>
        <b>
          {f.sold}/{f.cut}
        </b>{" "}
        {picker(locale)({ vi: "đã bán", en: "sold" })}
      </span>
    </p>
  );
}

/**
 * "Xem 6 mẫu →": what the entry's link does, said once, for the eye (the link is the number). In English "View 6
 * styles". The Vietnamese as the JSX it always was, its parts apart (`FeedCards.tsx` says why).
 */
function Go({ n }: { n: number }) {
  const t = picker(useLocale());
  return (
    <span className="b-go" aria-hidden="true">
      {t<React.ReactNode>({ vi: <>Xem {n} mẫu</>, en: `View ${plural(n, "style", "styles")}` })}
      <FeedIcon name="arrow-right" />
    </span>
  );
}

function PhotoIssue({ drop }: { drop: Drop }) {
  const catalog = useCatalog();
  const locale = useLocale();
  const { ref, shown } = useReveal<HTMLElement>();
  const list = productsInDrop(catalog, drop.no);
  const pic = archivePicture(catalog, drop.no);
  const shot = pic ? pictureOf(pic.product, pic.color, "look") : undefined;
  return (
    <article ref={ref} className={cx("b-issue is-photo rv", shown && "in")} aria-labelledby={`arc-${drop.no}`}>
      {pic && shot && (
        <div className="b-issue-media">
          <Image
            src={shot.src}
            width={PICTURE.width}
            height={PICTURE.height}
            sizes="(min-width: 900px) 520px, 100vw"
            loading="eager"
            alt={pictureAlt(pic.product, pic.color, shot.look, locale)}
          />
        </div>
      )}
      <div className="b-issue-body">
        <div>
          <IssueTitle drop={drop} />
          <IssueMeta drop={drop} />
        </div>
        <div>
          <ul className="b-names">
            {list.map((x) => (
              <li className="b-name" key={x.id}>
                <span className="disp" lang={nameLang(x, locale)}>
                  {productText(x, locale).name}
                </span>
              </li>
            ))}
          </ul>
          <Go n={list.length} />
        </div>
      </div>
    </article>
  );
}

function TypeIssue({ drop }: { drop: Drop }) {
  const catalog = useCatalog();
  const locale = useLocale();
  const { ref, shown } = useReveal<HTMLElement>();
  const list = productsInDrop(catalog, drop.no);
  return (
    <article ref={ref} className={cx("b-issue rv", shown && "in")} aria-labelledby={`arc-${drop.no}`}>
      <div className="b-issue-lead">
        <IssueTitle drop={drop} />
        <IssueMeta drop={drop} />
      </div>
      <div className="b-issue-side">
        <ul className="b-names">
          {list.map((x) => (
            <li className="b-name" key={x.id}>
              <span className="disp" lang={nameLang(x, locale)}>
                {productText(x, locale).name}
              </span>
              <ColorChips colors={x.colors} />
            </li>
          ))}
        </ul>
        <Go n={list.length} />
      </div>
    </article>
  );
}
