"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMyState } from "@/components/account/MyStateContext";
import { useCart } from "@/components/cart/CartContext";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { colorLabel } from "@/data/colors";
import type { ColorKey, Product, Size } from "@/data/types";
import { addableOf, qtyInCart } from "@/lib/cart";
import { PICTURE, pictureAlt, pictureOf, sizeOption, sizeRowLabel, sizesIn, startSize, swatchNote } from "@/lib/feed";
import { mySizeOf } from "@/lib/feed-me";
import {
  buyLabel,
  buyState,
  galleryKinds,
  mainStock,
  overIssue,
  pageColor,
  shipRows,
  specRows,
  styleLine,
  type FactRow,
  type MainStock,
} from "@/lib/feed-product";
import { picker, plural, type Pair } from "@/lib/i18n";
import { isFixed } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { nameLang, productText } from "@/lib/product-text";
import { backOrFollow } from "../back";
import { Rail } from "../FeedBlocks";
import { FavButton } from "../FeedCards";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow } from "../now";
import { useQuickAdd } from "../QuickAdd";
import { cx } from "../useReveal";

/** The story frame is the page's width on a phone, the left column from 900px (never past 58% of 1280). */
const FRAME_SIZES = "(min-width: 900px) 720px, 100vw";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = () => window.matchMedia("(min-width: 900px)").matches;

/**
 * One style, round v4 "Feed" (slice 1b): the approved mock's `product.html`
 * and `product.js`.
 *
 * · The story frame of the chosen colour — its packshot, then the colour worn
 *   where there is a lookbook frame — one photo at a time with a segment per
 *   photo. A tap on the left or right half, a swipe, ← → Home End on the
 *   frame; from 900px also "Ảnh trước" / "Ảnh sau". No autoplay.
 * · The buying block: the line's chip, the name, kind, price, the stock line,
 *   the colours with what is left of each, the sizes, "Bảng size" and the
 *   button — on the phone a buy bar in place of the tab bar, which opens the
 *   size sheet until a size is chosen; from 900px a sticky column whose
 *   button, with no size chosen, takes the shopper to the sizes instead.
 * · "Chi tiết" (the construction lines), "Thông số", "Giao hàng và đổi trả",
 *   and the rest of the line as a rail.
 *
 * It starts on "Size của tôi" when that size is left in the colour on screen,
 * and a colour that has no piece of the chosen size lets it go. The colour is
 * the address's (`?color=`) when the style comes in it. Since slice 3b the
 * size is the account's (quần for trousers, áo otherwise; none while signed
 * out), read with the page, so the first HTML already has it chosen; and the
 * heart saves the style on the account in the colour on screen.
 *
 * Slice 2: the basket is counted. A size whose every piece left is in the
 * basket already is struck through like a size that cannot be bought, noted
 * "Đã có trong giỏ", and cannot be chosen; a chosen size that fills up that
 * way lets go, and the button asks for a size again.
 *
 * In both languages since round v6 slice E1: the style's words through
 * `productText` (its name with `lang="vi"` when it is a Vietnamese one), the
 * facts and the buttons by the glossary. A switch of language keeps the
 * colour, the size and the photo on show.
 */
export function ProductPage({ slug, asked }: { slug: string; asked?: string }) {
  const catalog = useCatalog();
  const p = catalog.bySlug.get(slug);
  if (!p) return null;
  return <ProductView product={p} asked={asked} />;
}

function ProductView({ product: p, asked }: { product: Product; asked: string | undefined }) {
  const catalog = useCatalog();
  const now = useNow();
  const locale = useLocale();
  const t = picker(locale);
  const quick = useQuickAdd();
  const { cart } = useCart();
  const { state: kept } = useMyState();
  const mine = mySizeOf(kept, p);
  const text = productText(p, locale);
  const lang = nameLang(p, locale);

  const buy = buyState(catalog, p, now);
  const selling = buy.kind === "open";
  // Its issue is not selling (closed, or not open yet), sold out or not: no sizes, no counts, a tag.
  const standing = overIssue(catalog, p, now);
  const over = standing !== null;
  const sold = buy.kind === "sold";
  const fixed = isFixed(p);
  const line = styleLine(catalog, p, now, locale);

  const [color, setColor] = useState<ColorKey>(() => pageColor(p, asked));
  // Size của tôi from the first render when the colour has it (`product.js`: `myPick(color0)`). The basket is not
  // known until it has loaded; a size it holds every piece of lets go below (`chosen`).
  const [size, setSize] = useState<Size | null>(() => (selling ? startSize(p, pageColor(p, asked), mine) : null));
  const [frame, setFrame] = useState(0);
  const [need, setNeed] = useState(false);
  const [solid, setSolid] = useState(false);

  const gal = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const sizeBlock = useRef<HTMLDivElement>(null);
  const sizesRow = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  frameRef.current = frame;

  const kinds = galleryKinds(p, color);
  const many = kinds.length > 1;
  const last = kinds.length - 1;

  /** How many of each size of a colour the basket holds already (slice 2). */
  const held = (c: ColorKey) => (z: Size) => qtyInCart(cart, { productId: p.id, color: c, size: z });

  /** The remembered size, where this colour still has a piece of it to add and the style sells (`myPick`). */
  const myPick = (c: ColorKey): Size | null => (selling ? startSize(p, c, mine, held(c)) : null);

  // The size in play: the one chosen, while one more piece of it can still go in. Once the basket holds every piece
  // left (slice 2), the size can no longer be added and the page asks for a size again.
  const chosen = size !== null && addableOf(p, cart, color, size) > 0 ? size : null;

  // A new colour's frames start at its first photo, at once — the swipe would glide past the old colour.
  useLayoutEffect(() => {
    setFrame(0);
    if (track.current) track.current.scrollLeft = 0;
  }, [color]);

  // The frame changes width with the window, and between the phone and desktop layouts: stay on the same photo.
  useEffect(() => {
    const t = track.current;
    if (!t || !many || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      t.scrollLeft = frameRef.current * t.clientWidth;
    });
    ro.observe(t);
    return () => ro.disconnect();
  }, [many]);

  // The phone's controls over the photo turn into a solid bar once the frame has scrolled away.
  useEffect(() => {
    const g = gal.current;
    if (!g || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([en]) => setSolid(!en!.isIntersecting), { rootMargin: "-60px 0px 0px 0px" });
    io.observe(g);
    return () => io.disconnect();
  }, []);

  function chooseColor(c: ColorKey) {
    if (!p.colors.includes(c)) return;
    setColor(c);
    setSize((s) => (s && addableOf(p, cart, c, s) > 0 ? s : myPick(c)));
  }

  function chooseSize(z: Size) {
    setSize(addableOf(p, cart, color, z) > 0 ? z : null);
    setNeed(false);
  }

  function go(i: number, from?: HTMLElement) {
    const t = track.current;
    if (!t) return;
    const j = Math.max(0, Math.min(last, i));
    t.scrollTo({ left: j * t.clientWidth, behavior: reduced() ? "auto" : "smooth" });
    setFrame(j);
    // A button that goes away under the keyboard hands its focus to the frame, which takes the arrow keys.
    if (from && (j === 0 || j === last) && document.activeElement === from) t.focus({ preventScroll: true });
  }

  function onTrackScroll() {
    const t = track.current;
    if (!t) return;
    const i = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
    if (i !== frameRef.current) setFrame(Math.max(0, Math.min(last, i)));
  }

  function onTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    go(e.clientX - r.left < r.width / 2 ? frameRef.current - 1 : frameRef.current + 1);
  }

  function onTrackKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const to = { ArrowRight: frame + 1, ArrowLeft: frame - 1, Home: 0, End: last }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  }

  const ready = selling && chosen !== null;

  function onCta(e: React.MouseEvent<HTMLButtonElement>) {
    if (!selling) return;
    const btn = e.currentTarget;
    if (ready && chosen) {
      quick.add(p, color, chosen, btn);
      return;
    }
    if (desktop()) {
      // The sizes sit right above the button on a desktop: take the shopper there and nudge them.
      sizesRow.current?.querySelector<HTMLInputElement>('input[name="p-size"]:not(:disabled)')?.focus({ preventScroll: true });
      sizeBlock.current?.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
      setNeed(true);
      if (!reduced()) {
        sizesRow.current?.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-6px)" },
            { transform: "translateX(5px)" },
            { transform: "translateX(-3px)" },
            { transform: "translateX(0)" },
          ],
          { duration: 360, easing: "ease-out" },
        );
      }
      return;
    }
    quick.open(p, btn, {
      color,
      size: chosen,
      onPick: (pick) => {
        setColor(pick.color);
        setSize(pick.size);
        setNeed(false);
      },
    });
  }

  const label = buyLabel(buy, locale);
  const cta = (
    <button className="btn btn-blue" type="button" disabled={label !== null} onClick={onCta}>
      {label ??
        (ready ? (
          <>
            <FeedIcon name="bag" />
            {t({ vi: "Thêm vào giỏ ", en: "Add to bag " })}
            <span className="price">· {vnd(p.priceVnd, locale)}</span>
          </>
        ) : (
          t({ vi: "Chọn size", en: "Select size" })
        ))}
    </button>
  );

  const colorName = colorLabel(color, locale);

  return (
    <>
      <PhoneBar product={p} color={color} solid={solid} />

      <div className="pdp">
        <nav className="crumbs" aria-label={t({ vi: "Đường dẫn", en: "Breadcrumb" })}>
          <Link href="/products">{t({ vi: "Cửa hàng", en: "Shop" })}</Link>
          <span aria-hidden="true">/</span>
          <Link href={line.href}>{line.label}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" lang={lang}>
            {text.name}
          </span>
        </nav>

        <section
          ref={gal}
          className={cx("gal", sold && "is-sold", !many && "one")}
          aria-label={t({ vi: `Ảnh ${text.name}`, en: `Photos of ${text.name}` })}
        >
          <div
            ref={track}
            className="gal-track"
            {...(many
              ? { tabIndex: 0, "aria-describedby": "gal-count", onScroll: onTrackScroll, onClick: onTrackClick, onKeyDown: onTrackKey }
              : {})}
          >
            {kinds.map((k, i) => {
              const pic = pictureOf(p, color, k);
              return (
                <figure className={cx("frame", fixed && "flat")} key={`${color}-${k}`}>
                  <Image
                    className="shot"
                    src={pic.src}
                    width={PICTURE.width}
                    height={PICTURE.height}
                    sizes={FRAME_SIZES}
                    loading={i > 1 ? "lazy" : "eager"}
                    {...(i === 0 ? { fetchPriority: "high" as const } : {})}
                    alt={pictureAlt(p, color, pic.look, locale)}
                  />
                </figure>
              );
            })}
          </div>
          {many && (
            <>
              <div className="prog" aria-hidden="true">
                {kinds.map((k, i) => (
                  <i key={k} className={i <= frame ? "on" : undefined} />
                ))}
              </div>
              <button
                className="gal-btn gal-prev"
                type="button"
                aria-label={t({ vi: "Ảnh trước", en: "Previous photo" })}
                disabled={frame === 0}
                onClick={(e) => go(frame - 1, e.currentTarget)}
              >
                <FeedIcon name="caret-left" />
              </button>
              <button
                className="gal-btn gal-next"
                type="button"
                aria-label={t({ vi: "Ảnh sau", en: "Next photo" })}
                disabled={frame === last}
                onClick={(e) => go(frame + 1, e.currentTarget)}
              >
                <FeedIcon name="caret-right" />
              </button>
            </>
          )}
          {sold && <span className="plate">{t({ vi: "ĐÃ HẾT", en: "SOLD OUT" })}</span>}
          {many && (
            <p className="sr-only" id="gal-count" aria-live="polite">
              {t({
                vi: `Ảnh ${frame + 1} trên ${kinds.length}, màu ${colorName.toLocaleLowerCase("vi")}`,
                en: `Photo ${frame + 1} of ${kinds.length}, ${colorName.toLocaleLowerCase("en")}`,
              })}
            </p>
          )}
        </section>

        <div className="pinfo-col">
          <div className="pinfo">
            <div className="pinfo-tags">
              <span className="chip-tag">{line.label}</span>
              {standing && (
                <span className="chip-line">
                  {standing.closed ? t({ vi: "ĐÃ ĐÓNG", en: "CLOSED" }) : t({ vi: "SẮP MỞ", en: "COMING SOON" })}
                </span>
              )}
            </div>
            <h1 className="pname disp" lang={lang}>
              {text.name}
            </h1>
            <p className="pkind">{text.kind}</p>
            <p className="pprice">{vnd(p.priceVnd, locale)}</p>
            <StockMain facts={mainStock(catalog, p, now)} />

            <div className="pblock">
              {/* "Màu " with its space, one text node as it always was (`FeedCards.tsx` says why). */}
              <p className="sh-label">
                {t({ vi: "Màu ", en: "Colour " })}
                <span>{colorName}</span>
              </p>
              <div className="swatches" role="radiogroup" aria-label={t({ vi: "Màu", en: "Colour" })}>
                {p.colors.map((c) => {
                  const note = over ? null : swatchNote(p, c, locale);
                  return (
                    <label className="swatch" key={c}>
                      <input type="radio" name="p-color" value={c} checked={c === color} onChange={() => chooseColor(c)} />
                      <span className={fixed ? "swatch-img flat" : "swatch-img"}>
                        <Image src={pictureOf(p, c, "pack").src} width={64} height={80} alt="" />
                      </span>
                      <span className="swatch-name">{colorLabel(c, locale)}</span>
                      {note && <span className="swatch-left">{note}</span>}
                    </label>
                  );
                })}
              </div>
            </div>

            {!over && (
              <div ref={sizeBlock} className={cx("pblock", need && "need")}>
                <div className="sh-label">
                  <span className="sh-label-t">{sizeRowLabel(chosen, mine, locale)}</span>{" "}
                  <button className="link" type="button" onClick={(e) => quick.guide(p, chosen, e.currentTarget)}>
                    <FeedIcon name="ruler" />
                    {t({ vi: "Bảng size", en: "Size guide" })}
                  </button>
                </div>
                <div ref={sizesRow} className="sizes" role="radiogroup" aria-label="Size">
                  {sizesIn(p, color).map(({ size: z, n }) => {
                    const opt = sizeOption(n, held(color)(z), locale);
                    return (
                      <label className="size" key={z}>
                        <input
                          type="radio"
                          name="p-size"
                          value={z}
                          disabled={!opt.open}
                          checked={z === chosen}
                          onChange={() => chooseSize(z)}
                        />
                        <span className="sz">{z}</span>
                        {opt.note && <small>{opt.note}</small>}
                      </label>
                    );
                  })}
                </div>
                <p className="size-hint" aria-live="polite">
                  {need ? t({ vi: "Chọn size để thêm vào giỏ", en: "Select a size to add to bag" }) : ""}
                </p>
              </div>
            )}

            <div className="padd">{cta}</div>
          </div>
        </div>

        <div className="psects">
          {text.details.length > 0 && (
            <section className="sect" aria-labelledby="h-detail">
              <h2 className="sect-title" id="h-detail">
                {t({ vi: "Chi tiết", en: "Details" })}
              </h2>
              <ul className="details">
                {/* Keyed by place: a line's words change with the language. */}
                {text.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="sect" aria-labelledby="h-spec">
            <h2 className="sect-title" id="h-spec">
              {t({ vi: "Thông số", en: "Specs" })}
            </h2>
            <Facts rows={specRows(p, locale)} />
          </section>
          <section className="sect" aria-labelledby="h-ship">
            <h2 className="sect-title" id="h-ship">
              {t({ vi: "Giao hàng và đổi trả", en: "Delivery and returns" })}
            </h2>
            <Facts rows={shipRows(locale)} />
          </section>
        </div>

        {line.others.length > 0 && (
          <div className="sect rail-sect">
            <Rail
              id="rail-more"
              title={line.railTitle}
              more={{ href: line.href, label: t({ vi: "Xem tất cả", en: "View all" }) }}
              items={line.others}
            />
          </div>
        )}
      </div>

      <div className="buybar">{cta}</div>
    </>
  );
}

/**
 * The phone's controls over the photo (`.pbar`): back, the name — shown once
 * the photo has scrolled away and the bar has turned solid — the heart and
 * the bag with its count. Gone from 900px, where the top bar is.
 */
/** "Giỏ, 2 món" / "Giỏ, đang trống" — the bag's name with its count, as the top bar names it (`FeedChrome`). */
const bagLabel = (n: number): Pair =>
  n ? { vi: `Giỏ, ${n} món`, en: `Bag, ${plural(n, "item", "items")}` } : { vi: "Giỏ, đang trống", en: "Bag, empty" };

function PhoneBar({ product: p, color, solid }: { product: Product; color: ColorKey; solid: boolean }) {
  const { units, ready } = useCart();
  const locale = useLocale();
  const t = picker(locale);
  const n = ready ? units : 0;
  return (
    <div className={cx("pbar", solid && "solid")}>
      <Link className="ib" href="/" aria-label={t({ vi: "Quay lại", en: "Back" })} onClick={backOrFollow}>
        <FeedIcon name="caret-left" />
      </Link>
      <p className="pbar-title disp" aria-hidden="true" lang={nameLang(p, locale)}>
        {productText(p, locale).name}
      </p>
      <FavButton product={p} color={color} bar />
      <Link className="ib" href="/cart" data-cart-link="" aria-label={t(bagLabel(n))}>
        <FeedIcon name="bag" />
        {n > 0 && <span className="badge">{n > 99 ? "99+" : n}</span>}
      </Link>
    </div>
  );
}

/**
 * The line under the price (`stockMain`): what is left of the cut, what sold, or the sizes a fixed style is out of.
 * In English "17 left / 35 pieces cut", "18/35 sold", "Out of S, M", "All sizes".
 */
function StockMain({ facts }: { facts: MainStock }) {
  const t = picker(useLocale());
  switch (facts.kind) {
    case "fixed":
      return (
        <p className="stock pstock">
          <span>
            {facts.gone.length
              ? t({ vi: `Hết ${facts.gone.join(" ")}`, en: `Out of ${facts.gone.join(", ")}` })
              : t({ vi: "Đủ size", en: "All sizes" })}
          </span>
        </p>
      );
    // The Vietnamese as the JSX it always was, words and figures apart (`FeedCards.tsx` says why).
    case "sold":
      return (
        <p className="stock pstock">
          <b>
            {t<React.ReactNode>({
              vi: (
                <>
                  {facts.sold}/{facts.cut} đã bán
                </>
              ),
              en: `${facts.sold}/${facts.cut} sold`,
            })}
          </b>
        </p>
      );
    case "left":
      return (
        <p className={cx("stock pstock", facts.low && "is-low")}>
          <b>
            {facts.low && <FeedIcon name="fire-fill" />}
            {t<React.ReactNode>({ vi: <>Còn {facts.n}</>, en: `${facts.n} left` })}
          </b>
          <span>{t<React.ReactNode>({ vi: <>/ {facts.cut} chiếc đã cắt</>, en: `/ ${plural(facts.cut, "piece", "pieces")} cut` })}</span>
        </p>
      );
  }
}

/**
 * A list of facts; a row with a link is a link across the whole row, its value ending in a quiet arrow. Rows are
 * keyed by place, since their labels change with the language; a value that is a Vietnamese name (a print's) carries
 * `lang="vi"` on an English page.
 */
function Facts({ rows }: { rows: FactRow[] }) {
  return (
    <dl className="facts">
      {rows.map((r, i) =>
        r.href ? (
          <div className="facts-go" key={i}>
            <dt>{r.label}</dt>
            <dd>
              <Link href={r.href} aria-label={`${r.label} ${r.value}`}>
                {r.value}
                <FeedIcon name="caret-right" />
              </Link>
            </dd>
          </div>
        ) : (
          <div key={i}>
            <dt>{r.label}</dt>
            <dd lang={r.lang}>{r.value}</dd>
          </div>
        ),
      )}
    </dl>
  );
}
