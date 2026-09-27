"use client";

import Link from "next/link";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Drop } from "@/data/types";
import { teasersIn } from "@/lib/catalog";
import { dayMonth } from "@/lib/datetime";
import { dropState, issueHref } from "@/lib/drop";
import { TEASER_NOTE, dateParts, homeMoment, issueFacts, lineIssue } from "@/lib/feed-home";
import { issueLabel } from "@/lib/lexicon";
import { RemindButton, Teasers } from "../FeedBlocks";
import { FeedClock } from "../FeedClock";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow, useNowMs } from "../now";
import { cx, useReveal } from "../useReveal";

/*
 * Sắp mở, the home page's third tab: the launch calendar (`home.js`: `cal`,
 * `calRow`). Every issue, newest first — the next one as a big date row with
 * its countdown, its silhouettes and Nhắc tôi; the open one with its clock and
 * what is left; the closed ones with what sold. With nothing announced, a calm
 * "Chưa có Số mới" first, and a way to what sells.
 */

function CalDate({ iso }: { iso: string }) {
  const p = dateParts(iso);
  return (
    <div className="cal-date">
      <p className="cal-dd">{p.dd}</p>
      <p className="cal-mm disp">Thg {p.mm}</p>
    </div>
  );
}

function CalRow({ drop, lineNo }: { drop: Drop; lineNo: number | undefined }) {
  const catalog = useCatalog();
  const now = useNow();
  const nowMs = useNowMs();
  const { ref, shown } = useReveal<HTMLElement>();
  const state = dropState(drop, now);
  const f = issueFacts(catalog, drop);
  const head = (chip: React.ReactNode) => (
    <div className="cal-head">
      <h3 className="cal-no disp" id={`cal-${drop.no}`}>
        {issueLabel(drop.no)}
      </h3>
      {chip}
    </div>
  );

  if (state === "UPCOMING") {
    const p = dateParts(drop.opensAt);
    const teasers = teasersIn(catalog, drop.no);
    return (
      <article ref={ref} className={cx("cal-row is-next rv", shown && "in")} aria-labelledby={`cal-${drop.no}`}>
        <CalDate iso={drop.opensAt} />
        <div className="cal-body">
          {head(<span className="chip-line">SẮP MỞ</span>)}
          <p className="cal-when">
            Mở{" "}
            <b>
              {p.time} {p.dow}
            </b>
          </p>
          <p className="cal-cd">
            <span className="cd-label">Mở sau</span>
            <FeedClock until={drop.opensAt} now={nowMs} tag="span" />
          </p>
        </div>
        {teasers.length > 0 && <Teasers teasers={teasers} />}
        <div className="cal-act">
          <p className="soon-note">{TEASER_NOTE}</p>
          <RemindButton no={drop.no} />
        </div>
      </article>
    );
  }

  if (state === "OPEN") {
    return (
      <article ref={ref} className={cx("cal-row rv", shown && "in")} aria-labelledby={`cal-${drop.no}`}>
        <CalDate iso={drop.opensAt} />
        <div className="cal-body">
          {head(
            <span className="chip-live">
              <span className="dot" aria-hidden="true" />
              ĐANG MỞ
            </span>,
          )}
          <p className="cal-when">
            Đến {dayMonth(drop.closesAt)}, còn{" "}
            <b>
              {f.left}/{f.cut}
            </b>{" "}
            chiếc
          </p>
          <p className="cal-cd">
            <span className="cd-label">Đóng sau</span>
            <FeedClock until={drop.closesAt} now={nowMs} tag="span" />
          </p>
          {f.styles > 0 && (
            <a className="pill cal-go" href={`/?line=${drop.no}#cua-hang`}>
              Xem {f.styles} mẫu
              <FeedIcon name="arrow-right" />
            </a>
          )}
        </div>
      </article>
    );
  }

  // Closed. The issue the shop's issue line shows opens the shop's grid on it (`products.html?dong=so-05` in the
  // mock); an older one has its own page and its names here.
  const here = drop.no === lineNo;
  return (
    <article ref={ref} className={cx("cal-row rv", shown && "in")} aria-labelledby={`cal-${drop.no}`}>
      <CalDate iso={drop.opensAt} />
      <div className="cal-body">
        {head(<span className="chip-tag">Đã đóng</span>)}
        <p className="cal-when">
          Đóng {dayMonth(drop.closesAt)},{" "}
          <b>
            {f.sold}/{f.cut}
          </b>{" "}
          đã bán
        </p>
        {!here && f.names && <p className="cal-names">{f.names}</p>}
        {f.styles > 0 &&
          (here ? (
            <Link className="pill cal-go" href={`/products?line=${drop.no}`}>
              Xem lại {f.styles} mẫu
              <FeedIcon name="arrow-right" />
            </Link>
          ) : (
            <Link className="pill cal-go" href={issueHref(drop.no)}>
              Xem lại {f.styles} mẫu
              <FeedIcon name="arrow-right" />
            </Link>
          ))}
      </div>
    </article>
  );
}

function CalEmpty() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cx("cal-empty rv", shown && "in")}>
      <FeedIcon name="calendar-blank" className="cal-empty-ic" />
      <p className="cal-empty-title">Chưa có Số mới</p>
      <a className="btn btn-line" href="/?line=fixed#cua-hang">
        Xem Cố định
      </a>
    </div>
  );
}

/** The Sắp mở tab. */
export function HomeCalendar() {
  const catalog = useCatalog();
  const now = useNow();
  const order = [...catalog.drops].sort((a, b) => b.no - a.no);
  const announced = order.some((d) => dropState(d, now) === "UPCOMING");
  const lineNo = lineIssue(homeMoment(catalog, now))?.no;
  return (
    <div className="cal">
      {!announced && <CalEmpty />}
      {order.map((d) => (
        <CalRow key={d.no} drop={d} lineNo={lineNo} />
      ))}
    </div>
  );
}
