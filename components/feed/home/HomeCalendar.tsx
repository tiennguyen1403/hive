"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Drop } from "@/data/types";
import { teasersIn } from "@/lib/catalog";
import { dayMonth } from "@/lib/datetime";
import { dropState, issueHref } from "@/lib/drop";
import { TEASER_NOTE_TEXT, dateParts, homeMoment, issueFacts, lineIssue } from "@/lib/feed-home";
import { picker, plural, type Pair } from "@/lib/i18n";
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
 * "Chưa có Số mới" first, and a way to what sells. In both languages since
 * round v6 slice E1; a Vietnamese side that sets figures inside its words
 * stays the JSX it always was, its parts apart (`FeedCards.tsx` says why).
 */

/** "Xem 8 mẫu"; in English "View 8 styles". */
const viewStyles = (n: number): Pair<React.ReactNode> => ({ vi: <>Xem {n} mẫu</>, en: `View ${plural(n, "style", "styles")}` });

function CalDate({ iso }: { iso: string }) {
  const locale = useLocale();
  const p = dateParts(iso, locale);
  return (
    <div className="cal-date">
      <p className="cal-dd">{p.dd}</p>
      <p className="cal-mm disp">{picker(locale)<React.ReactNode>({ vi: <>Thg {p.mm}</>, en: p.mm })}</p>
    </div>
  );
}

function CalRow({ drop, lineNo }: { drop: Drop; lineNo: number | undefined }) {
  const catalog = useCatalog();
  const now = useNow();
  const nowMs = useNowMs();
  const locale = useLocale();
  const t = picker(locale);
  const { ref, shown } = useReveal<HTMLElement>();
  const state = dropState(drop, now);
  const f = issueFacts(catalog, drop, locale);
  const head = (chip: React.ReactNode) => (
    <div className="cal-head">
      <h3 className="cal-no disp" id={`cal-${drop.no}`}>
        {issueLabel(drop.no, locale)}
      </h3>
      {chip}
    </div>
  );

  if (state === "UPCOMING") {
    const p = dateParts(drop.opensAt, locale);
    const teasers = teasersIn(catalog, drop.no);
    return (
      <article ref={ref} className={cx("cal-row is-next rv", shown && "in")} aria-labelledby={`cal-${drop.no}`}>
        <CalDate iso={drop.opensAt} />
        <div className="cal-body">
          {head(<span className="chip-line">{t({ vi: "SẮP MỞ", en: "COMING SOON" })}</span>)}
          <p className="cal-when">
            {t({
              vi: (
                <>
                  Mở{" "}
                  <b>
                    {p.time} {p.dow}
                  </b>
                </>
              ),
              en: (
                <>
                  Opens <b>{`${p.dow} ${p.time}`}</b>
                </>
              ),
            })}
          </p>
          <p className="cal-cd">
            <span className="cd-label">{t({ vi: "Mở sau", en: "Opens in" })}</span>
            <FeedClock until={drop.opensAt} now={nowMs} tag="span" />
          </p>
        </div>
        {teasers.length > 0 && <Teasers teasers={teasers} />}
        <div className="cal-act">
          <p className="soon-note">{t(TEASER_NOTE_TEXT)}</p>
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
              {t({ vi: "ĐANG MỞ", en: "LIVE" })}
            </span>,
          )}
          <p className="cal-when">
            {t({
              vi: (
                <>
                  Đến {dayMonth(drop.closesAt)}, còn{" "}
                  <b>
                    {f.left}/{f.cut}
                  </b>{" "}
                  chiếc
                </>
              ),
              en: (
                <>
                  Until {dayMonth(drop.closesAt, "en")},{" "}
                  <b>
                    {f.left}/{f.cut}
                  </b>{" "}
                  left
                </>
              ),
            })}
          </p>
          <p className="cal-cd">
            <span className="cd-label">{t({ vi: "Đóng sau", en: "Closes in" })}</span>
            <FeedClock until={drop.closesAt} now={nowMs} tag="span" />
          </p>
          {f.styles > 0 && (
            <a className="pill cal-go" href={`/?line=${drop.no}#cua-hang`}>
              {t(viewStyles(f.styles))}
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
  const revisit = t<React.ReactNode>({ vi: <>Xem lại {f.styles} mẫu</>, en: `Revisit ${plural(f.styles, "style", "styles")}` });
  return (
    <article ref={ref} className={cx("cal-row rv", shown && "in")} aria-labelledby={`cal-${drop.no}`}>
      <CalDate iso={drop.opensAt} />
      <div className="cal-body">
        {head(<span className="chip-tag">{t({ vi: "Đã đóng", en: "Closed" })}</span>)}
        <p className="cal-when">
          {t({
            vi: (
              <>
                Đóng {dayMonth(drop.closesAt)},{" "}
                <b>
                  {f.sold}/{f.cut}
                </b>{" "}
                đã bán
              </>
            ),
            en: (
              <>
                Closed {dayMonth(drop.closesAt, "en")},{" "}
                <b>
                  {f.sold}/{f.cut}
                </b>{" "}
                sold
              </>
            ),
          })}
        </p>
        {!here && f.names && (
          <p className="cal-names" lang={f.namesLang}>
            {f.names}
          </p>
        )}
        {f.styles > 0 &&
          (here ? (
            <Link className="pill cal-go" href={`/products?line=${drop.no}`}>
              {revisit}
              <FeedIcon name="arrow-right" />
            </Link>
          ) : (
            <Link className="pill cal-go" href={issueHref(drop.no)}>
              {revisit}
              <FeedIcon name="arrow-right" />
            </Link>
          ))}
      </div>
    </article>
  );
}

function CalEmpty() {
  const t = picker(useLocale());
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cx("cal-empty rv", shown && "in")}>
      <FeedIcon name="calendar-blank" className="cal-empty-ic" />
      <p className="cal-empty-title">{t({ vi: "Chưa có Số mới", en: "No new drop yet" })}</p>
      <a className="btn btn-line" href="/?line=fixed#cua-hang">
        {t({ vi: "Xem Cố định", en: "View Basics" })}
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
