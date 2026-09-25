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
import { FAMILY_SHORT_LABELS, type Drop, type Product } from "@/data/types";
import { teasersIn, type Catalog } from "@/lib/catalog";
import { loadCatalog } from "@/lib/db/catalog";
import { clockDayLabel, closedAtLabel, dayMonth } from "@/lib/datetime";
import { dropCalendar, dropState, featuredDrop, issueHref, previousDropNote } from "@/lib/drop";
import {
  LOW_STOCK_AT,
  dropSummary,
  familyGroupsOf,
  lowStockIn,
  onHand,
  productsInDrop,
  productsOnSale,
  showcaseOnSale,
  soldOutSizes,
} from "@/lib/inventory";
import { HOME_COVER, LEX, issueLabel, issueNo, styleName } from "@/lib/lexicon";
import { styleCountLabel, vnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";

/**
 * The home page — an issue of a magazine, in the three states it can be in.
 *
 * THE COVER answers four things before a thumb moves: which issue, is it
 * open, how long is left, and one way in. Everything under it is the table
 * of contents — the issue's six styles, six more on sale ("Đang bán", the
 * fixed styles, v3 slice 11), the families as rows, the four rules the
 * shop runs on — and then the next issue, which is the cover again, quieter,
 * before it opens. Between two issues the next one is the cover, and
 * "Đang bán" comes straight under it.
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
  const catalog = await loadCatalog();

  // A closed issue has a page of its own since v3 slice 4 — a record needs
  // an address, not a query string on the shop's front door. `?drop=` is
  // kept working because it is in browser histories and in printed links.
  if (requested !== undefined) {
    const one = catalog.dropByNo.get(requested);
    if (!one) notFound();
    if (dropState(one) === "CLOSED") redirect(`/so/${one.no}`);
  }

  const { drop, state, previous } = featuredDrop(catalog, requested);

  // The issue standing at the end of the page is always the next one to
  // OPEN, not the next one by number: read from a closed issue, "số kế
  // tiếp" by number is the one selling right now, and this block is only
  // ever about something that has not opened yet. When that issue is the
  // one being read it is already the cover, so the page does not repeat it.
  const upcoming = dropCalendar(catalog).upcoming;
  const teaser = upcoming && upcoming.no !== drop.no ? upcoming : undefined;

  return (
    <ShopFrame>
      {/* What the "Đặt nhắc giờ mở" button is for, and the only thing that
          keeps it from being a dead control: in the two hours before a
          remembered issue opens, and for as long as it then sells, the page
          says so. Client-only — the answer depends on this device and on
          the current minute. */}
      <ReminderBand />

      {state === "OPEN" && <OpenCover catalog={catalog} drop={drop} />}
      {state === "UPCOMING" && <NextIssue catalog={catalog} drop={drop} first />}
      {state === "CLOSED" && (
        <ClosedCover catalog={catalog} drop={drop} previous={previous} />
      )}

      <div className="wrap3">
        {/* What else is on sale comes after the issue's own six while one
            sells, and straight under the cover between two issues — the
            fixed styles sell either way (v3 slice 11). */}
        {state === "OPEN" && <IssueContents catalog={catalog} drop={drop} />}
        <OnSale catalog={catalog} />
        <FamilyIndex catalog={catalog} />
        {state === "CLOSED" && <ClosedContents catalog={catalog} drop={drop} />}
        <FourRules anchor />
      </div>

      {teaser && <NextIssue catalog={catalog} drop={teaser} />}

      <PastIssue catalog={catalog} previous={previous} />
    </ShopFrame>
  );
}

// ────────────────────────────────────────────────────────── the cover parts

/**
 * The issue that is selling: what it is, when it shuts, how long that is,
 * one sentence, one way in, and the styles that are nearly gone.
 */
function OpenCover({ catalog, drop }: { catalog: Catalog; drop: Drop }) {
  const products = productsInDrop(catalog, drop.no);
  const low = lowStockIn(catalog, drop.no);

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
          {/* The whole issue, on its own page (v3 slice 11). */}
          <ButtonLink href={issueHref(drop.no)}>Xem {styleCountLabel(products.length)}</ButtonLink>
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
      <span className="n">{styleName(product.name, product.dropNo)}</span>
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
function IssueContents({ catalog, drop }: { catalog: Catalog; drop: Drop }) {
  const products = productsInDrop(catalog, drop.no);
  const summary = dropSummary(catalog, drop.no);

  return (
    <section className="sec" aria-labelledby="h-in">
      <div className="hd">
        <h2 id="h-in">{LEX.in}</h2>
        <span className="meta">
          {summary.styles} mẫu · {summary.onHand} / {summary.cutUnits} còn
        </span>
        <Link className="more" href={issueHref(drop.no)}>
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
 * "Đang bán" — six more styles on sale, and the way to all of them (v3
 * slice 11).
 *
 * The same section while an issue sells and between two: the fixed styles
 * sell at any hour, and the user asked for a list of styles on the home
 * page in both states. The six are `showcaseOnSale`'s — none of the open
 * issue's, which stand above under "Trong số này", none with an empty shelf,
 * one per family first. The link counts everything `/products` lists.
 */
function OnSale({ catalog }: { catalog: Catalog }) {
  const six = showcaseOnSale(catalog);
  if (six.length === 0) return null;

  return (
    <section className="sec" aria-labelledby="h-sale">
      <div className="hd">
        <h2 id="h-sale">Đang bán</h2>
        <Link className="more" href="/products">
          Xem tất cả {productsOnSale(catalog).length} mẫu
        </Link>
      </div>
      <div className="grid3">
        {six.map((p) => (
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
 * (`familyGroupsOf`), so the line cannot claim a style the shop does not
 * sell. Since v3 slice 11 it counts everything on sale — the open issue's
 * styles and the fixed ones, or the fixed ones alone between two issues —
 * and "Đang bán" above carries the way to all of them. The photo is the
 * family's first style on sale — no photography of a CATEGORY exists, and
 * standing one garment in for the group is the most the fixtures can
 * honestly supply.
 */
function FamilyIndex({ catalog }: { catalog: Catalog }) {
  const families = familyGroupsOf(productsOnSale(catalog));
  if (families.length === 0) return null;

  return (
    <section className="sec" aria-labelledby="h-fam">
      <div className="hd">
        <h2 id="h-fam">Theo loại</h2>
        <span className="meta">đang bán</span>
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
function NextIssue({
  catalog,
  drop,
  first = false,
}: {
  catalog: Catalog;
  drop: Drop;
  first?: boolean;
}) {
  const teasers = teasersIn(catalog, drop.no);

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
              {/* "khi mở" held together: "mở" alone on the caption's last
                  line at 390 (v3 slice 13). */}
              <figcaption>
                <b>{styleName(t.name, t.dropNo)}</b>
                {t.kind} · giá công bố khi{"\u00a0"}mở
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
        {/* The note under the button that explained what a reminder does
            went at v3 slice 13 (the user's copy review): the toast the
            button raises says it, and `ReminderBand` does it. */}
        <div className="cta">
          <RemindButton drop={drop} tone="ghost" />
        </div>
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
function PastIssue({
  catalog,
  previous,
}: {
  catalog: Catalog;
  previous: Drop | undefined;
}) {
  const note = previousDropNote(previous);
  if (!note) return null;

  const summary = dropSummary(catalog, note.drop.no);

  return (
    <div className="wrap3">
      <p className="past">
        <span>
          {issueLabel(note.drop.no)} · {note.status}
          {note.state === "CLOSED"
            ? ` ${dayMonth(note.drop.closesAt)} · ${summary.soldUnits} / ${summary.cutUnits} đã bán`
            : ` · ${note.countdown}`}
        </span>
        {/* The issue's own page, in whichever state it is: its record once
            it has closed, its listing while it sells (v3 slice 11). */}
        <Link className="lnk" href={issueHref(note.drop.no)}>
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
