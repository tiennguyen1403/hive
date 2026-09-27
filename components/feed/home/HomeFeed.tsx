"use client";

import Image from "next/image";
import Link from "next/link";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Drop, Product } from "@/data/types";
import { clockDayLabel, dayMonth } from "@/lib/datetime";
import { PICTURE, pictureAlt, pictureOf, type PictureKind } from "@/lib/feed";
import {
  coverLines,
  fixedLead,
  homeMoment,
  issueFacts,
  storyPicture,
  type StoryPicture,
} from "@/lib/feed-home";
import { isFixed, productsInDrop } from "@/lib/inventory";
import { HOME_COVER, issueLabel } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { ClosedList, Rail, SoonCard } from "../FeedBlocks";
import { FeedCard, styleHref } from "../FeedCards";
import { FeedClock } from "../FeedClock";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow, useNowMs } from "../now";

/*
 * Bảng tin, the home page's first tab (`home.js`: `renderFeed`). What leads
 * it follows the shop's moment (`homeMoment`, `lib/feed-home.ts`):
 *   open      the open issue's story, its styles as the feed's own frames,
 *             and between them the next issue and the fixed line's rail;
 *             then the closed issues (the styles are the feed's frames, so
 *             no rail repeats them);
 *   upcoming  the next issue's launch card, the fixed line's rail, the issue
 *             that just closed as a rail, the older issues;
 *   recap     between two issues, for seven days after the close: a recap of
 *             the issue that closed, the fixed line's rail, the older ones;
 *   quiet     after that the fixed line leads in the feed's own frames, and
 *             every closed issue follows, the last one first.
 * Bảng tin never shows the Cửa hàng tab's grid, and no style shows twice.
 * The phone and the desktop order the open and quiet feeds differently; the
 * page carries both and the stylesheet shows the one for the width.
 */

/** The story's photo: the lookbook frame edge to edge, the page's first image. */
function StoryImage({ pic }: { pic: StoryPicture }) {
  const p = pictureOf(pic.product, pic.color, pic.look ? "look" : "pack");
  return (
    <div className="story-media">
      <Image
        src={p.src}
        width={PICTURE.width}
        height={PICTURE.height}
        sizes="(min-width: 900px) 540px, 100vw"
        loading="eager"
        fetchPriority="high"
        alt={pictureAlt(pic.product, pic.color, p.look)}
      />
    </div>
  );
}

/** The open issue's cover: the live chip, the cover line, the clock, what is left, the way in. */
function StoryOpen({ issue }: { issue: Drop }) {
  const catalog = useCatalog();
  const now = useNowMs();
  const f = issueFacts(catalog, issue);
  const pic = storyPicture(catalog, issue.no);
  return (
    <a className="story" href={`/?line=${issue.no}#cua-hang`}>
      {pic && <StoryImage pic={pic} />}
      <div className="story-panel">
        <div className="story-top">
          <span className="chip-live">
            <span className="dot" aria-hidden="true" />
            ĐANG MỞ
          </span>
          <span className="story-no">{issueLabel(issue.no).toUpperCase()}</span>
        </div>
        <div className="story-body">
          <p className="cover disp">
            {coverLines(HOME_COVER.headline).map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <div className="story-close">
            <div className="story-cd">
              <p className="cd-label">Đóng sau</p>
              <FeedClock until={issue.closesAt} now={now} />
              <p className="cd-label">{clockDayLabel(issue.closesAt)}</p>
            </div>
            <div className="story-stats">
              <p className="cd-label">Còn lại</p>
              <p className="cd-big">
                {f.left}/{f.cut}
              </p>
              <p className="cd-label">chiếc</p>
            </div>
            <span className="story-go">
              Xem {f.styles} mẫu
              <FeedIcon name="arrow-right" />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

/**
 * Between two issues: the one that just closed, its photo, and the way back to its styles — the shop's grid on its
 * line, as the mock leads to `products.html?dong=so-05`.
 */
function StoryClosed({ issue }: { issue: Drop }) {
  const catalog = useCatalog();
  const f = issueFacts(catalog, issue);
  const pic = storyPicture(catalog, issue.no);
  return (
    <Link className="story story-past" href={`/products?line=${issue.no}`}>
      {pic && <StoryImage pic={pic} />}
      <div className="story-panel">
        <div className="story-top">
          <span className="story-no">{issueLabel(issue.no).toUpperCase()}</span>
        </div>
        <div className="story-body">
          <p className="cover disp">
            <span>Đã đóng</span>
            <span>{dayMonth(issue.closesAt)}.</span>
          </p>
          <div className="story-close">
            <div className="story-cd">
              <p className="cd-label">Đã bán</p>
              <p className="cd-big">
                {f.sold}/{f.cut}
              </p>
              <p className="cd-label">Mở {dayMonth(issue.opensAt)}</p>
            </div>
            <span className="story-go">
              Xem lại {f.styles} mẫu
              <FeedIcon name="arrow-right" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * The fixed line leads the quiet gap: its first piece at story size under the
 * line's name, the way the cover sits on NGUỘI; the frame opens the piece, the
 * button opens the Cửa hàng tab on the line.
 */
function StoryFixed({ lead, count }: { lead: { product: Product; color: Product["colors"][number] }; count: number }) {
  const s = lead.product;
  const p = pictureOf(s, lead.color, "pack");
  return (
    <article className="story story-fixed" aria-labelledby="lead-fixed">
      <div className="story-media">
        <Image
          src={p.src}
          width={PICTURE.width}
          height={PICTURE.height}
          sizes="(min-width: 900px) 540px, 70vw"
          loading="eager"
          fetchPriority="high"
          alt={pictureAlt(s, lead.color, false)}
        />
      </div>
      <div className="story-panel">
        <div className="story-top">
          <span className="chip-line">ĐANG BÁN</span>
        </div>
        <div className="story-body">
          <h2 className="cover disp" id="lead-fixed">
            <span>Cố định</span>
          </h2>
          <div className="story-close">
            <div className="story-piece">
              <h3 className="story-piece-name disp">
                <Link href={styleHref(s)}>{s.name}</Link>
              </h3>
              <p className="story-piece-meta">
                {s.kind} · <b>{vnd(s.priceVnd)}</b>
              </p>
            </div>
            <a className="story-go" href="/?line=fixed#cua-hang">
              Xem {count} mẫu
              <FeedIcon name="arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

/** The fixed line's rail: its styles, and the shop's grid on the line (`products.html?dong=co-dinh` in the mock). */
function FixedRail({ idSuffix = "" }: { idSuffix?: string }) {
  const catalog = useCatalog();
  const fixed = catalog.products.filter((p) => isFixed(p));
  if (fixed.length === 0) return null;
  return (
    <Rail
      id={`rail-fixed${idSuffix}`}
      title="Cố định"
      more={{ href: "/products?line=fixed", label: "Xem tất cả" }}
      items={fixed}
    />
  );
}

/** The issue that just closed, as a rail: its run, what sold, the way back to its styles on the shop's grid. */
function PastRail({ issue }: { issue: Drop }) {
  const catalog = useCatalog();
  const f = issueFacts(catalog, issue);
  const styles = productsInDrop(catalog, issue.no);
  if (styles.length === 0) return null;
  return (
    <Rail
      id="rail-past"
      className="rail-past"
      title={issueLabel(issue.no)}
      chip="Đã đóng"
      sub={
        <>
          {f.run} ·{" "}
          <b>
            {f.sold}/{f.cut} đã bán
          </b>
        </>
      }
      more={{ href: `/products?line=${issue.no}`, label: "Xem lại" }}
      items={styles}
    />
  );
}

/** NGUỘI's look is the story, so the feed counts the story as its first frame: then packshot, look, packshot… */
const kindAt = (i: number): PictureKind => (i % 2 === 0 ? "pack" : "look");

/** Desktop rows of three; a card across two columns counts as two. */
function Row({ children }: { children: React.ReactNode }) {
  return <div className="row wrap">{children}</div>;
}

/** The rows the desktop feed ends with, in threes, after the mock's patterned ones. */
function restRows(items: readonly Product[], card: (p: Product, i: number) => React.ReactNode, from: number) {
  const rows: React.ReactNode[] = [];
  for (let i = from; i < items.length; i += 3) {
    rows.push(<Row key={`r${i}`}>{items.slice(i, i + 3).map((p, k) => card(p, i + k))}</Row>);
  }
  return rows;
}

function OpenFeed({ issue, next }: { issue: Drop; next: Drop | undefined }) {
  const catalog = useCatalog();
  const S = productsInDrop(catalog, issue.no);

  // Phone: the frames one after another, the next issue after the fourth and the fixed line after the seventh.
  const phone: React.ReactNode[] = [];
  S.forEach((s, i) => {
    phone.push(<FeedCard key={s.id} product={s} kind={kindAt(i)} />);
    if (i === 3 && next) phone.push(<SoonCard key="soon" drop={next} />);
    if (i === 6) phone.push(<FixedRail key="rail" />);
  });
  if (next && S.length <= 3) phone.push(<SoonCard key="soon" drop={next} />);
  if (S.length <= 6) phone.push(<FixedRail key="rail" />);

  // Desktop: rows of three where the middle rows carry one card across two columns, picture beside words; the two
  // wide cards face each other across the next issue's card, and the fixed line's rail comes before the last row.
  const c = (i: number, o: { wide?: boolean; flip?: boolean; kind?: PictureKind } = {}) => {
    const s = S[i];
    return s ? <FeedCard key={s.id} product={s} kind={o.kind ?? kindAt(i)} wide={o.wide ?? false} flip={o.flip ?? false} /> : null;
  };
  const desk = (
    <>
      <Row>
        {c(0)}
        {c(1)}
        {c(2)}
      </Row>
      {S.length > 3 && (
        <Row>
          {c(3, { wide: true, kind: "look" })}
          {c(4)}
        </Row>
      )}
      {next && <SoonCard drop={next} idSuffix="-dk" />}
      {S.length > 5 && (
        <Row>
          {c(5)}
          {c(6, { wide: true, flip: true, kind: "look" })}
        </Row>
      )}
      <FixedRail idSuffix="-dk" />
      {restRows(S, (s, i) => <FeedCard key={s.id} product={s} kind={kindAt(i)} />, 7)}
    </>
  );

  return (
    <>
      <div className="feed-ph">{phone}</div>
      <div className="feed-dk">{desk}</div>
    </>
  );
}

function QuietFeed() {
  const catalog = useCatalog();
  const lead = fixedLead(catalog);
  const fixed = catalog.products.filter((p) => isFixed(p));
  const rest = lead ? fixed.filter((p) => p.id !== lead.product.id) : fixed;
  const c = (i: number, o: { wide?: boolean; flip?: boolean } = {}) => {
    const s = rest[i];
    return s ? <FeedCard key={s.id} product={s} kind="pack" h="h3" wide={o.wide ?? false} flip={o.flip ?? false} /> : null;
  };
  return (
    <>
      {lead && <StoryFixed lead={lead} count={fixed.length} />}
      <div className="feed-ph">
        {rest.map((s) => (
          <FeedCard key={s.id} product={s} kind="pack" h="h3" />
        ))}
      </div>
      <div className="feed-dk">
        <Row>
          {c(0)}
          {c(1)}
          {c(2)}
        </Row>
        {rest.length > 3 && (
          <Row>
            {c(3, { wide: true })}
            {c(4)}
          </Row>
        )}
        {rest.length > 5 && (
          <Row>
            {c(5)}
            {c(6, { wide: true, flip: true })}
          </Row>
        )}
        {restRows(rest, (s) => <FeedCard key={s.id} product={s} kind="pack" h="h3" />, 7)}
      </div>
    </>
  );
}

/** The Bảng tin tab. */
export function HomeFeed() {
  const catalog = useCatalog();
  const now = useNow();
  const m = homeMoment(catalog, now);

  return (
    <div className="feed">
      {m.kind === "open" && (
        <>
          <StoryOpen issue={m.issue} />
          <OpenFeed issue={m.issue} next={m.next} />
        </>
      )}
      {m.kind === "upcoming" && (
        <>
          <SoonCard drop={m.next} lead />
          <FixedRail />
          {m.last && <PastRail issue={m.last} />}
        </>
      )}
      {m.kind === "recap" && (
        <>
          <StoryClosed issue={m.last} />
          <FixedRail />
        </>
      )}
      {m.kind === "quiet" && <QuietFeed />}
      <ClosedList drops={m.closed} />
    </div>
  );
}
