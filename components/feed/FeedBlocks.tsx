"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Drop, Product, Teaser } from "@/data/types";
import { teasersIn } from "@/lib/catalog";
import { issueHref } from "@/lib/drop";
import { PICTURE, teaserPicture } from "@/lib/feed";
import { TEASER_NOTE, dateParts, issueFacts } from "@/lib/feed-home";
import { issueLabel, kindInSentence } from "@/lib/lexicon";
import { MiniCard } from "./FeedCards";
import { FeedClock } from "./FeedClock";
import { FeedIcon } from "./icon/FeedIcon";
import { useNowMs } from "./now";
import { useKeep } from "./useKeep";
import { cx, useReveal } from "./useReveal";

/*
 * The Feed's blocks between the cards (`feed.js`: `rail`, `soon`, `teasers`,
 * `remindBtn`, `closedRows`): a rail of small cards, the next issue, the
 * reminder, the closed issues.
 */

/** A link a block leads on with: a place on this page (the home's tabs) is a plain anchor, anywhere else a Next link. */
export interface BlockLink {
  href: string;
  label: string;
}

function isHere(href: string): boolean {
  return href.startsWith("#") || href.startsWith("?") || href.startsWith("/?") || href.startsWith("/#");
}

export function BlockAnchor({ link, className, children }: { link: BlockLink; className: string; children?: React.ReactNode }) {
  const body = children ?? link.label;
  return isHere(link.href) ? (
    <a className={className} href={link.href}>
      {body}
    </a>
  ) : (
    <Link className={className} href={link.href}>
      {body}
    </Link>
  );
}

interface RailProps {
  id: string;
  title: string;
  /** "Đã đóng", a tag beside the title. */
  chip?: string;
  /** The line under the title. */
  sub?: React.ReactNode;
  more?: BlockLink;
  items: readonly Product[];
  className?: string;
}

/** A horizontal list that snaps; from 900px two arrows page through it. */
export function Rail({ id, title, chip, sub, more, items, className }: RailProps) {
  const { ref, shown } = useReveal<HTMLElement>();
  const track = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: false });

  useEffect(() => {
    const t = track.current;
    if (!t) return;
    const paint = () => {
      const max = t.scrollWidth - t.clientWidth - 2;
      setEnds({ start: t.scrollLeft <= 2, end: t.scrollLeft >= max });
    };
    paint();
    t.addEventListener("scroll", paint, { passive: true });
    window.addEventListener("resize", paint);
    return () => {
      t.removeEventListener("scroll", paint);
      window.removeEventListener("resize", paint);
    };
  }, []);

  function page(dir: 1 | -1) {
    const t = track.current;
    if (!t) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    t.scrollBy({ left: dir * t.clientWidth * 0.8, behavior: still ? "auto" : "smooth" });
  }

  return (
    <section ref={ref} className={cx("rail rv", shown && "in", className)} aria-labelledby={id}>
      <div className="rail-head">
        <div className="rail-titles">
          <h2 className="rail-title disp" id={id}>
            {title}
            {chip && (
              <>
                {" "}
                <span className="chip-tag">{chip}</span>
              </>
            )}
          </h2>
          {sub && <p className="rail-sub">{sub}</p>}
        </div>
        <div className="rail-side">
          {more && <BlockAnchor link={more} className="link" />}
          <div className="rail-nav">
            <button className="ib" type="button" aria-label="Xem mẫu trước" disabled={ends.start} onClick={() => page(-1)}>
              <FeedIcon name="caret-left" />
            </button>
            <button className="ib" type="button" aria-label="Xem mẫu sau" disabled={ends.end} onClick={() => page(1)}>
              <FeedIcon name="caret-right" />
            </button>
          </div>
        </div>
      </div>
      <div className="rail-track" ref={track}>
        {items.map((p) => (
          <MiniCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

/** The next issue's styles as their garments' silhouettes: no photo, no price (`feed.js`: `teasers`). */
export function Teasers({ teasers }: { teasers: readonly Teaser[] }) {
  return (
    <div className="teasers">
      {teasers.map((t) => (
        <figure className="teaser" key={t.slug}>
          <div className="teaser-plate">
            <Image
              src={teaserPicture(t)}
              width={PICTURE.width}
              height={PICTURE.height}
              sizes="(min-width: 900px) 200px, 45vw"
              alt={`${t.name}, ${kindInSentence(t.kind)}`}
            />
          </div>
          <figcaption>
            <p className="teaser-name disp">{t.name}</p>
            <p className="teaser-kind">{t.kind}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/**
 * "Nhắc tôi" / "Đã bật nhắc" (round v4 slice 3b): the reminder is kept on the
 * account (`setReminderAction`), drawn at once and settled by the server's
 * answer (`useKeep`). Signed out it turns nothing on and says so, with a way
 * in: "Đăng nhập để bật nhắc" (`feed.js`: `askSignIn`).
 */
export function RemindButton({ no }: { no: number }) {
  const keep = useKeep();
  const on = keep.hasReminder(no);
  return (
    <button className="btn btn-blue remind" type="button" aria-pressed={on} onClick={() => keep.toggleReminder(no)}>
      <FeedIcon name={on ? "bell-fill" : "bell"} />
      <span>{on ? "Đã bật nhắc" : "Nhắc tôi"}</span>
    </button>
  );
}

/**
 * The next issue: the date block, the countdown to opening, its silhouettes,
 * the line about price, Nhắc tôi. `lead` when it opens the feed (dark, like
 * the open issue's story); otherwise a card between the styles.
 */
export function SoonCard({ drop, lead = false, idSuffix = "" }: { drop: Drop; lead?: boolean; idSuffix?: string }) {
  const catalog = useCatalog();
  const now = useNowMs();
  const { ref, shown } = useReveal<HTMLElement>();
  const p = dateParts(drop.opensAt);
  const id = (lead ? "lead-title" : "soon-title") + idSuffix;
  const teasers = teasersIn(catalog, drop.no);
  return (
    <section ref={ref} className={cx("soon rv", shown && "in", lead && "soon-lead")} aria-labelledby={id}>
      <div className="soon-head">
        <span className="chip-line">SẮP MỞ</span>
        <h2 className="soon-no disp" id={id}>
          {issueLabel(drop.no)}
        </h2>
      </div>
      <p className="date">
        <span className="dd">{p.dd}</span>
        <span className="date-side">
          <span className="mm disp">Thg {p.mm}</span>
          <span className="dow disp">
            {p.dow} {p.time}
          </span>
        </span>
      </p>
      <p className="soon-cd">
        <span className="cd-label">Mở sau</span>
        <FeedClock until={drop.opensAt} now={now} tag="span" />
      </p>
      {teasers.length > 0 && <Teasers teasers={teasers} />}
      <p className="soon-note">{TEASER_NOTE}</p>
      <RemindButton no={drop.no} />
    </section>
  );
}

/**
 * "Đã đóng": one row per closed issue, newest first, each to its own page, and
 * "Xem tất cả" to the archive of them (`home.js`: `closed`; `feed.js`: `closedRows`).
 */
export function ClosedList({ drops }: { drops: readonly Drop[] }) {
  const catalog = useCatalog();
  const { ref, shown } = useReveal<HTMLElement>();
  if (drops.length === 0) return null;
  return (
    <section ref={ref} className={cx("closed rv", shown && "in")} aria-labelledby="closed-title">
      <div className="closed-head">
        <h2 className="closed-title disp" id="closed-title">
          Đã đóng
        </h2>
        <Link className="link" href="/so">
          Xem tất cả
        </Link>
      </div>
      {drops.map((d) => {
        const f = issueFacts(catalog, d);
        return (
          <Link className="closed-row" key={d.no} href={issueHref(d.no)}>
            <h3 className="closed-no disp">{issueLabel(d.no)}</h3>
            <p className="closed-sold">
              {f.sold}/{f.cut} đã bán
            </p>
            <p className="closed-dates">{f.run}</p>
            <p className="closed-names">{f.names}</p>
          </Link>
        );
      })}
    </section>
  );
}
