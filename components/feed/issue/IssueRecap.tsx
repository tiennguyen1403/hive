"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { IssueStyle } from "@/lib/inventory";
import { fitLabel } from "@/lib/catalog-query";
import { clockDayLabel } from "@/lib/datetime";
import { PICTURE, pictureAlt, pictureOf } from "@/lib/feed";
import { issueFacts } from "@/lib/feed-home";
import { closedIssues, closedNeighbours, issueHasPhotos, issueNow } from "@/lib/feed-issue";
import { picker, plural } from "@/lib/i18n";
import { isFixed, productsInDrop, soldUnits } from "@/lib/inventory";
import { issueLabel, lexicon } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { nameLang, productText } from "@/lib/product-text";
import { styleHref } from "../FeedCards";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow } from "../now";
import { cx, useReveal } from "../useReveal";
import { ColorChips, NextNow } from "./IssueParts";

/**
 * One closed issue, `/so/N` (round v4, slice 1b): the approved mock's
 * `issue.html` and `issue.js` — the number large, "Đã đóng", its run and what
 * it sold; then every style with what that style sold; then what is live now
 * and the closed issues either side.
 *
 * An issue with photographs of its own (Số 05) shows each style worn, in the
 * colour it led with, and leads to the style's page. One without (Số 03 and
 * 04, whose frames are borrowed) sets each name as the picture on a plate,
 * with its colours as chips — never another issue's photos.
 *
 * In both languages since round v6 slice E1 (an issue is a Drop; its styles
 * keep their Vietnamese names, marked `lang="vi"` on an English page).
 */
export function IssueRecap({ no }: { no: number }) {
  const catalog = useCatalog();
  const now = useNow();
  const locale = useLocale();
  const t = picker(locale);
  const lex = lexicon(locale);
  const drop = catalog.dropByNo.get(no);
  if (!drop) return null;
  const f = issueFacts(catalog, drop, locale);
  const styles = productsInDrop(catalog, no);
  const photos = issueHasPhotos(catalog, no);
  const { older, newer } = closedNeighbours(closedIssues(catalog, now), no);
  const pn = (older ? 1 : 0) + (newer ? 1 : 0);
  const live = issueNow(catalog, now);
  const liveStyles = live.kind === "live" ? productsInDrop(catalog, live.drop.no).length : 0;
  const fixed = catalog.products.filter((p) => isFixed(p)).length;
  const odd = styles.length % 2 === 1;

  return (
    <>
      <section className="b-hero" aria-labelledby="iss-no">
        <span className="chip-tag">{t({ vi: "Đã đóng", en: "Closed" })}</span>
        <h1 className="b-hero-no disp" id="iss-no">
          {issueLabel(no, locale)}
        </h1>
        <p className="b-hero-meta">
          <span>{f.run}</span>
          <span>
            <b>
              {f.sold}/{f.cut}
            </b>{" "}
            {t({ vi: "đã bán", en: "sold" })}
          </span>
        </p>
      </section>

      <section
        className={cx("b-tiles", `n-${styles.length}`, odd && "is-odd")}
        aria-label={t({
          vi: `${f.styles} mẫu của ${issueLabel(no)}`,
          en: `${plural(f.styles, "style", "styles")} in ${issueLabel(no, "en")}`,
        })}
      >
        {styles.map((s, i) =>
          photos ? (
            <LookTile key={s.id} product={s} lazy={i > 3} wide={odd && i === 0} />
          ) : (
            <TypeTile key={s.id} product={s} />
          ),
        )}
      </section>

      <div className={`b-next pn-${pn}`}>
        <NextNow
          live={live}
          opens={live.kind === "next" ? clockDayLabel(live.drop.opensAt, locale) : ""}
          styles={liveStyles}
          fixed={fixed}
        />
        {pn > 0 && (
          <nav className={`b-pn n-${pn}`} aria-label={t({ vi: "Các Số đã đóng khác", en: "Other closed drops" })}>
            {older && (
              <Link className="is-prev" href={`/so/${older.no}`}>
                <small>
                  <FeedIcon name="caret-left" />
                  {lex.prev}
                </small>
                <span className="disp">{issueLabel(older.no, locale)}</span>
              </Link>
            )}
            {newer && (
              <Link className="is-next" href={`/so/${newer.no}`}>
                <small>
                  {t({ vi: "Số sau", en: "Next drop" })}
                  <FeedIcon name="caret-right" />
                </small>
                <span className="disp">{issueLabel(newer.no, locale)}</span>
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}

/** A style of an issue with photos: worn, in the colour it led with, and the way to its page (`lookTile`). */
function LookTile({ product: s, lazy, wide }: { product: IssueStyle; lazy: boolean; wide: boolean }) {
  const locale = useLocale();
  const { ref, shown } = useReveal<HTMLElement>();
  const color = s.colors[0]!;
  const pic = pictureOf(s, color, "look");
  const text = productText(s, locale);
  return (
    <article ref={ref} className={cx("b-tile rv", shown && "in")}>
      <Link className="b-tile-link" href={styleHref(s)}>
        <div className="b-tile-media">
          <Image
            src={pic.src}
            width={PICTURE.width}
            height={PICTURE.height}
            sizes={wide ? "(min-width: 900px) 260px, 100vw" : "(min-width: 900px) 260px, 50vw"}
            loading={lazy ? "lazy" : "eager"}
            alt={pictureAlt(s, color, pic.look, locale)}
          />
        </div>
        <div className="b-tile-body">
          <h2 className="b-tile-name disp" lang={nameLang(s, locale)}>
            {text.name}
          </h2>
          <p className="b-tile-meta">{text.kind}</p>
          <p className="b-tile-row">
            <span className="b-tile-price">{vnd(s.priceVnd, locale)}</span>
            <span className="b-tile-sold">
              <b>
                {soldUnits(s)}/{s.cutUnits}
              </b>{" "}
              {picker(locale)({ vi: "đã bán", en: "sold" })}
            </span>
          </p>
        </div>
      </Link>
    </article>
  );
}

/** A style of an issue without photos: its name is the picture, sized to the plate by its letter count (`typeTile`). */
function TypeTile({ product: s }: { product: IssueStyle }) {
  const locale = useLocale();
  const { ref, shown } = useReveal<HTMLElement>();
  const text = productText(s, locale);
  return (
    <article ref={ref} className={cx("b-tile rv", shown && "in")}>
      <div className="b-tile-plate">
        <div className="b-tile-top">
          <p className="b-tile-kind">{text.kind}</p>
          <ColorChips colors={s.colors} />
        </div>
        <h2
          className="b-tile-big disp"
          lang={nameLang(s, locale)}
          style={{ "--f-n": [...text.name].length } as React.CSSProperties}
        >
          {text.name}
        </h2>
      </div>
      <div className="b-tile-body">
        <p className="b-tile-meta">
          {text.material} · {fitLabel(s.fit, locale)}
        </p>
        <p className="b-tile-row">
          <span className="b-tile-price">{vnd(s.priceVnd, locale)}</span>
          <span className="b-tile-sold">
            <b>
              {soldUnits(s)}/{s.cutUnits}
            </b>{" "}
            {picker(locale)({ vi: "đã bán", en: "sold" })}
          </span>
        </p>
      </div>
    </article>
  );
}
