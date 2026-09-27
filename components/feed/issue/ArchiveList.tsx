"use client";

import Image from "next/image";
import Link from "next/link";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Drop } from "@/data/types";
import { PICTURE, pictureAlt, pictureOf } from "@/lib/feed";
import { issueFacts } from "@/lib/feed-home";
import { archivePicture, closedIssues, issueHasPhotos, issueNow } from "@/lib/feed-issue";
import { productsInDrop } from "@/lib/inventory";
import { issueLabel } from "@/lib/lexicon";
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
 */
export function ArchiveList() {
  const catalog = useCatalog();
  const now = useNow();
  const closed = closedIssues(catalog, now);
  return (
    <>
      <div className="b-head">
        <h1 className="b-title disp">Các Số đã đóng</h1>
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
  return (
    <h2 className="b-issue-no disp" id={`arc-${drop.no}`}>
      <Link href={`/so/${drop.no}`}>{issueLabel(drop.no)}</Link>
    </h2>
  );
}

function IssueMeta({ drop }: { drop: Drop }) {
  const catalog = useCatalog();
  const f = issueFacts(catalog, drop);
  return (
    <p className="b-issue-meta">
      <span>{f.run}</span>
      <span>
        <b>
          {f.sold}/{f.cut}
        </b>{" "}
        đã bán
      </span>
    </p>
  );
}

/** "Xem 6 mẫu →": what the entry's link does, said once, for the eye (the link is the number). */
function Go({ n }: { n: number }) {
  return (
    <span className="b-go" aria-hidden="true">
      Xem {n} mẫu
      <FeedIcon name="arrow-right" />
    </span>
  );
}

function PhotoIssue({ drop }: { drop: Drop }) {
  const catalog = useCatalog();
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
            alt={pictureAlt(pic.product, pic.color, shot.look)}
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
                <span className="disp">{x.name}</span>
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
              <span className="disp">{x.name}</span>
              <ColorChips colors={x.colors} />
            </li>
          ))}
        </ul>
        <Go n={list.length} />
      </div>
    </article>
  );
}
