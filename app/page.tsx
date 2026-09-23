import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import {
  ClosedContents,
  ClosedCover,
  CoverPhoto,
  FourRules,
  IssueNumber,
  capitalise,
} from "@/components/shop/ClosedIssue";
import { Countdown } from "@/components/shop/Countdown";
import { RemindButton } from "@/components/shop/RemindButton";
import { ReminderBand } from "@/components/shop/ReminderBand";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DROPS, teasersIn } from "@/data/catalog";
import { FAMILY_SHORT_LABELS, type Drop, type Product } from "@/data/types";
import { clockDayLabel, closedAtLabel, dayMonth } from "@/lib/datetime";
import { dropCalendar, dropState, featuredDrop, previousDropNote } from "@/lib/drop";
import {
  LOW_STOCK_AT,
  dropSummary,
  familyGroupsIn,
  lowStockIn,
  onHand,
  productsInDrop,
  soldOutSizes,
} from "@/lib/inventory";
import { HOME_COVER, LEX, issueLabel, issueNo } from "@/lib/lexicon";
import { styleCountLabel, vnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";

/**
 * The home page — an issue of a magazine, in the three states it can be in.
 *
 * THE COVER answers four things before a thumb moves: which issue, is it
 * open, how long is left, and one way in. Everything under it is the table
 * of contents — the six styles, the families as rows, the four rules the
 * shop runs on — and then the next issue, which is the cover again, quieter,
 * before it opens.
 *
 * Which issue is shown comes from `?drop=`; what state it is drawn in comes
 * from the clock, via `featuredDrop`. Keeping those two apart is the point:
 * "Số 04 · đã đóng · xem lại" has to lead somewhere, but no URL should be
 * able to make a shut issue look open.
 *
 * The closed state is the one that lives longest — between issues, this IS
 * the shop. It gets the same care as the open one.
 *
 * Every figure below is arithmetic over `data/catalog.ts` through `lib/`:
 * the style count and its word, "73 / 181 còn", the two styles in the "Còn
 * ít" list and the sizes they have run out of, what tells one family's
 * styles from another's, "200 / 200 đã bán". The only typed sentence is the
 * cover's headline, which lives in `lib/lexicon.ts` for exactly that reason.
 */
export default async function HomePage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const asked = Number(Array.isArray(sp.drop) ? sp.drop[0] : sp.drop);
  const requested = Number.isFinite(asked) ? asked : undefined;

  // A closed issue has a page of its own since v3 slice 4 — a record needs
  // an address, not a query string on the shop's front door. `?drop=` is
  // kept working because it is in browser histories and in printed links.
  if (requested !== undefined) {
    const one = DROPS.find((d) => d.no === requested);
    if (!one) notFound();
    if (dropState(one) === "CLOSED") redirect(`/so/${one.no}`);
  }

  const { drop, state, previous } = featuredDrop(requested);

  // The issue standing at the end of the page is always the next one to
  // OPEN, not the next one by number: read from a closed issue, "số kế
  // tiếp" by number is the one selling right now, and this block is only
  // ever about something that has not opened yet. When that issue is the
  // one being read it is already the cover, so the page does not repeat it.
  const upcoming = dropCalendar().upcoming;
  const teaser = upcoming && upcoming.no !== drop.no ? upcoming : undefined;

  return (
    <ShopFrame>
      {/* What the "Đặt nhắc giờ mở" button is for, and the only thing that
          keeps it from being a dead control: in the two hours before a
          remembered issue opens, and for as long as it then sells, the page
          says so. Client-only — the answer depends on this device and on
          the current minute. */}
      <ReminderBand />

      {state === "OPEN" && <OpenCover drop={drop} />}
      {state === "UPCOMING" && <NextIssue drop={drop} first />}
      {state === "CLOSED" && <ClosedCover drop={drop} previous={previous} />}

      <div className="wrap3">
        {state === "OPEN" && (
          <>
            <IssueContents drop={drop} />
            <FamilyIndex drop={drop} />
          </>
        )}
        {state === "CLOSED" && <ClosedContents drop={drop} />}
        <FourRules anchor />
      </div>

      {teaser && <NextIssue drop={teaser} />}

      <PastIssue previous={previous} />
    </ShopFrame>
  );
}

// ────────────────────────────────────────────────────────── the cover parts

/**
 * The issue that is selling: what it is, when it shuts, how long that is,
 * one sentence, one way in, and the styles that are nearly gone.
 */
function OpenCover({ drop }: { drop: Drop }) {
  const products = productsInDrop(drop.no);
  const low = lowStockIn(drop.no);

  return (
    <section className="cover open" aria-labelledby="cover-t">
      <CoverPhoto photoKey="hero" priority />
      <div className="face">
        <IssueNumber no={drop.no} />
        <p className="state">
          <Badge tone="ok">Đang bán</Badge>
          <span className="tnum">Đóng {clockDayLabel(drop.closesAt)}</span>
        </p>
        <Countdown until={drop.closesAt} to="khi đóng" over="đã đóng" />

        {/* The one typed sentence on the page, and it lives in one place so
            that settling the wording is a two-string edit. */}
        <h1 className="disp t" id="cover-t">
          {HOME_COVER.headline}
        </h1>
        <p className="lead">{HOME_COVER.lead}</p>

        <div className="cta">
          <ButtonLink href="/products">Xem {styleCountLabel(products.length)}</ButtonLink>
          {/* A plain anchor: the target is on the page already open, and the
              browser's own same-document navigation is what should handle
              it. */}
          <a className="btn quiet" href="#rules">
            Bốn quy tắc
          </a>
        </div>

        {low.length > 0 && <LowStock products={low} />}
      </div>
    </section>
  );
}

/**
 * The styles with almost nothing left, as a table of contents.
 *
 * It carries the two scarcity facts PRODUCT.md counts as content rather than
 * warning: how many are left, and which sizes have already gone. Both are
 * read off the stock table; neither is stored. The whole block disappears
 * when no style is that close to the end — a "Còn ít" heading over a list of
 * comfortable numbers teaches a shopper to ignore it.
 */
function LowStock({ products }: { products: Product[] }) {
  return (
    <div className="lows">
      <div className="lh">
        <span className="n">Còn ít</span>
        <span>dưới {LOW_STOCK_AT + 1} chiếc</span>
      </div>
      {products.map((p) => (
        <LowRow key={p.id} product={p} />
      ))}
    </div>
  );
}

function LowRow({ product }: { product: Product }) {
  const gone = soldOutSizes(product);

  return (
    <Link className="tocrow" href={`/products/${product.slug}`}>
      <span className="n">{product.name}</span>
      <span className="d">
        <span className="low">còn {onHand(product)}</span>
        {gone.length > 0 && (
          <>
            {" · hết "}
            {gone.map((z, i) => (
              <span key={z}>
                {i > 0 && " "}
                <s>{z}</s>
              </span>
            ))}
          </>
        )}
      </span>
      <span className="ld" aria-hidden="true" />
      <span className="p">{vnd(product.priceVnd)}</span>
    </Link>
  );
}

// ───────────────────────────────────────────────────── the contents, open

/**
 * "Trong số này" — six styles of the ten, with the count first.
 *
 * Six and not ten: a grid of ten on a phone is a scroll, not a shop window,
 * and the whole issue is one tap away in the heading. The order is the
 * catalog's, which is the order the issue was laid out in.
 */
function IssueContents({ drop }: { drop: Drop }) {
  const products = productsInDrop(drop.no);
  const summary = dropSummary(drop.no);

  return (
    <section className="sec" aria-labelledby="h-in">
      <div className="hd">
        <h2 id="h-in">{LEX.in}</h2>
        <span className="meta">
          {summary.styles} mẫu · {summary.onHand} / {summary.cutUnits} còn
        </span>
        <Link className="more" href="/products">
          Xem cả {summary.styles} mẫu
        </Link>
      </div>
      <div className="grid3">
        {products.slice(0, 6).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

/**
 * "Theo loại" — the families as rows of an index, not as tiles.
 *
 * A row can carry what a tile cannot: how many styles, what tells them
 * apart, and what the cheapest one costs. All three are derived
 * (`familyGroupsIn`), so the line cannot claim a cut the issue does not
 * contain. The photo is the family's first style — no photography of a
 * CATEGORY exists, and standing one garment in for the group is the most
 * the fixtures can honestly supply.
 */
function FamilyIndex({ drop }: { drop: Drop }) {
  const families = familyGroupsIn(drop.no);
  if (families.length === 0) return null;

  return (
    <section className="sec" aria-labelledby="h-fam">
      <div className="hd">
        <h2 id="h-fam">Theo loại</h2>
        <span className="meta">{LEX.inl}</span>
      </div>
      <div className="index">
        {families.map((g) => (
          <Link className="row" key={g.family} href={`/products?family=${g.family}`}>
            {/* `loading="eager"`, and deliberately NOT `priority`. These are
                five 48×60 thumbnails sitting just under the fold of a long
                home page, and each one is the row's evidence — the line says
                "3 mẫu · oversize, cơ bản và tay lỡ" and the photo is what
                that looks like. Lazily loaded they were still blank when the
                page was captured, and blank is what a shopper scrolling fast
                sees too. `priority` would preload them and take the cover
                photo's place as the one LCP candidate; eager only means "do
                not wait for the viewport". */}
            <Image
              src={photoUrl(g.lead.photoKeys[0]!, 220)}
              alt=""
              width={48}
              height={60}
              loading="eager"
            />
            <span>
              <span className="n">{FAMILY_SHORT_LABELS[g.family]}</span>
              <span className="d">
                {g.styles} mẫu · {g.kinds}
              </span>
            </span>
            <span className="p">
              {g.styles > 1 ? `từ ${vnd(g.fromVnd)}` : vnd(g.fromVnd)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────── what is next

/**
 * The next issue: the same cover, before it opens.
 *
 * The teased styles are already in the fixtures and are deliberately NOT
 * products — no price, no stock, because neither has been published. The
 * block says so in as many words, and the only control on it is the one
 * thing a browser alone can keep: a reminder on this device.
 *
 * `first` is for the state where nothing is selling: then this IS the cover,
 * standing at the top of the page instead of at the end of it.
 */
function NextIssue({ drop, first = false }: { drop: Drop; first?: boolean }) {
  const teasers = teasersIn(drop.no);

  return (
    <section
      className={first ? "cover soon first" : "cover soon"}
      id="next"
      aria-labelledby="next-t"
    >
      {teasers.length > 0 && (
        <div className="photo">
          {teasers.map((t) => (
            <figure key={t.slug}>
              <Image src={photoUrl(t.photoKey, 520)} alt="" width={520} height={650} />
              <Badge tone="info">Chưa mở</Badge>
              <figcaption>
                <b>{t.name}</b>
                {t.kind} · giá công bố khi mở
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <div className="face">
        <IssueNumber no={drop.no} />
        <p className="state">
          <Badge tone="info">Sắp mở</Badge>
          <span className="tnum">Mở {clockDayLabel(drop.opensAt)}</span>
        </p>
        <Countdown until={drop.opensAt} to="giờ mở" over="đang mở" />
        {/* Standing at the top of the page this line IS the page's heading;
            standing at the end of one it is a section inside it. Same size
            either way — the level says where it sits in the document, not
            how loud it is. */}
        <Line first={first} className="disp t" id="next-t">
          {teasers.length > 0
            ? `${capitalise(styleCountLabel(teasers.length))} đã hé lộ.`
            : "Chưa hé lộ mẫu nào."}{" "}
          Giá và số lượng công bố đúng lúc mở.
        </Line>
        <div className="cta">
          <RemindButton drop={drop} tone="ghost" />
        </div>
        {/* The mock promised a message two hours ahead. Nothing in this
            build can send one, so the note says what really happens — and
            `ReminderBand` is what does it. */}
        <p className="remind">
          Nhắc lưu trên thiết bị này. Trang chủ hiện lại khi còn 2 giờ tới giờ mở.
        </p>
      </div>
    </section>
  );
}

/**
 * The one line that admits the shop has a neighbour in time — "Số 04 · đã
 * đóng 19/06 · 200 / 200 đã bán · Xem lại".
 *
 * Which of the two states it is in comes from `previousDropNote`, not from
 * here (L4): this line used to say "đã đóng" unconditionally, so a visitor
 * reading the issue that has not opened yet was told the shop that was open
 * right then had shut.
 */
function PastIssue({ previous }: { previous: Drop | undefined }) {
  const note = previousDropNote(previous);
  if (!note) return null;

  const summary = dropSummary(note.drop.no);

  return (
    <div className="wrap3">
      <p className="past">
        <span>
          {issueLabel(note.drop.no)} · {note.status}
          {note.state === "CLOSED"
            ? ` ${dayMonth(note.drop.closesAt)} · ${summary.soldUnits} / ${summary.cutUnits} đã bán`
            : ` · ${note.countdown}`}
        </span>
        {/* A closed issue goes to its own record; one still selling, or
            still to open, goes back to the shop floor it belongs to. */}
        <Link
          className="lnk"
          href={note.state === "CLOSED" ? `/so/${note.drop.no}` : "/products"}
        >
          {capitalise(note.linkText)}
        </Link>
      </p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────── helpers

/** `<h1>` when this block opens the page, `<h2>` when it closes one. */
function Line({
  first,
  ...rest
}: {
  first: boolean;
  className: string;
  id: string;
  children: React.ReactNode;
}) {
  return first ? <h1 {...rest} /> : <h2 {...rest} />;
}
