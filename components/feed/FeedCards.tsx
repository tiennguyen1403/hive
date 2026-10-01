"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { colorLabel } from "@/data/colors";
import type { ColorKey, Product } from "@/data/types";
import {
  PICTURE,
  canBuy,
  firstColor,
  isGone,
  isOver,
  lineOfStyle,
  pictureAlt,
  pictureOf,
  stockFacts,
  type PictureKind,
  type StockFacts,
} from "@/lib/feed";
import { picker, pluralNoun, type Pair } from "@/lib/i18n";
import { isFixed } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { nameLang, productText } from "@/lib/product-text";
import { FeedIcon } from "./icon/FeedIcon";
import { useNow } from "./now";
import { useQuickAdd } from "./QuickAdd";
import { useKeep } from "./useKeep";
import { cx, useReveal } from "./useReveal";

/*
 * The Feed's three cards (`feed.js`: `card`, `gcard`, `mini`) and the pieces
 * they share: the stock line, the heart, the ĐÃ HẾT stamp. Each links to the
 * style's page; the heart and the quick add sit above that link.
 *
 * The names are printed bare — "KHÓI", not "S05 – KHÓI" — as the mock prints
 * them (round v4, the user's answer on 27/09: the issue prefix goes).
 *
 * In both languages since round v6 slice E1: a style's words come through
 * `productText`, an element holding only its name carries `lang="vi"` when
 * the name is a Vietnamese one (`nameLang`), and the stamp on the photo reads
 * SOLD OUT in English (the glossary keeps streetwear's own words there).
 */

/*
 * A Vietnamese side that sets a figure inside its words is written as the JSX
 * it always was (`<>Còn {n}</>`), not as one string: the browser places the
 * glyphs of separate text nodes a sub-pixel apart from one run, so a merged
 * string moved Vietnamese pixels (measured, round v6 slice E1).
 */

/** "Còn 17"; in English "17 left" (the glossary). */
const leftText = (n: number): Pair<React.ReactNode> => ({ vi: <>Còn {n}</>, en: `${n} left` });

/** "18/35 đã bán"; in English "18/35 sold". */
const soldText = (sold: number, cut: number): Pair<React.ReactNode> => ({
  vi: (
    <>
      {sold}/{cut} đã bán
    </>
  ),
  en: `${sold}/${cut} sold`,
});

/** The width a picture takes: full-bleed on the phone, the 600px column on a tablet, a third of the desktop's rows. */
const CARD_SIZES = "(min-width: 900px) 400px, (min-width: 600px) 600px, 100vw";
const GRID_SIZES = "(min-width: 900px) 320px, (min-width: 600px) 200px, 50vw";
const MINI_SIZES = "(min-width: 900px) 240px, 45vw";

/** The link to a style's page. */
export function styleHref(p: Product): string {
  return `/products/${p.slug}`;
}

/**
 * "Còn 2 · Hết S M", with the fire when few are left; "Đã đóng 25/09"; "Đủ size" (`feed.js`: `stockLine`).
 * In English "2 left · Out of S, M", "Closed 25 Sep", "All sizes": the sizes listed with commas.
 */
export function StockLine({ facts, className }: { facts: StockFacts | null; className?: string }) {
  const t = picker(useLocale());
  if (!facts) return null;
  const cls = cx("stock", facts.kind === "left" && facts.low && "is-low", className);
  const gone = (sizes: readonly string[]) =>
    sizes.length ? <span className="gone">{t<React.ReactNode>({ vi: <>Hết {sizes.join(" ")}</>, en: `Out of ${sizes.join(", ")}` })}</span> : null;
  switch (facts.kind) {
    case "sold":
      return (
        <p className={cls}>
          <span>{t(soldText(facts.sold, facts.cut))}</span>
        </p>
      );
    case "fixed":
      return <p className={cls}>{gone(facts.gone) ?? <span>{t({ vi: "Đủ size", en: "All sizes" })}</span>}</p>;
    case "closed":
      return (
        <p className={cls}>
          <span>{t<React.ReactNode>({ vi: <>Đã đóng {facts.day}</>, en: `Closed ${facts.day}` })}</span>
        </p>
      );
    case "left":
      return (
        <p className={cls}>
          {facts.low ? (
            <b>
              <FeedIcon name="fire-fill" />
              {t(leftText(facts.n))}
            </b>
          ) : (
            <span>{t(leftText(facts.n))}</span>
          )}
          {gone(facts.gone)}
        </p>
      );
  }
}

/**
 * The heart (round v4 slice 3b): saves the style on the account, in the
 * colour on screen — the card's, or the one chosen on the product page —
 * through the optimistic write of `useKeep` (the Server Action answers with
 * the account's list). A filled heart while it is saved, in any colour; it
 * pops when a style goes in. Signed out it saves nothing and says so, with a
 * way in (`feed.js`: `askSignIn`). On a card it sits on the picture
 * (`.fav`); on the product page's phone bar it is one of the bar's round
 * buttons (`bar`).
 */
export function FavButton({ product, color, bar = false }: { product: Product; color?: ColorKey; bar?: boolean }) {
  const keep = useKeep();
  const locale = useLocale();
  const [pops, setPops] = useState(0);
  const saved = keep.isSaved(product.id);
  const name = productText(product, locale).name;
  return (
    <button
      className={cx(bar ? "ib pbar-fav" : "fav", pops > 0 && "pop")}
      type="button"
      aria-pressed={saved}
      aria-label={picker(locale)({ vi: `Yêu thích ${name}`, en: `Save ${name}` })}
      onClick={(e) => {
        e.preventDefault();
        if (keep.toggleFavorite(product, color ?? firstColor(product)) === "saved") setPops((n) => n + 1);
      }}
    >
      <FeedIcon key={pops} name={saved ? "heart-fill" : "heart"} />
    </button>
  );
}

/** ĐÃ HẾT on the photo (QĐ-36 #13); SOLD OUT in English, as the glossary keeps it (round v6 slice E1). */
const Stamp = () => <span className="plate">{picker(useLocale())({ vi: "ĐÃ HẾT", en: "SOLD OUT" })}</span>;

interface FeedCardProps {
  product: Product;
  /** The lookbook frame or the packshot (the feed alternates them). */
  kind?: PictureKind;
  /** From 900px, across two columns with the picture beside the words. */
  wide?: boolean;
  /** A wide card with its picture on the right. */
  flip?: boolean;
  /** The name's heading level. */
  h?: "h2" | "h3";
}

/** A style in the feed: the picture edge to edge, the name big, the facts small, "Chọn size". */
export function FeedCard({ product: s, kind = "look", wide = false, flip = false, h = "h2" }: FeedCardProps) {
  const catalog = useCatalog();
  const now = useNow();
  const locale = useLocale();
  const t = picker(locale);
  const { open } = useQuickAdd();
  const { ref, shown } = useReveal<HTMLElement>();
  const color = firstColor(s);
  const pic = pictureOf(s, color, kind);
  const sold = isGone(s);
  const text = productText(s, locale);
  const Name = h;
  return (
    <article
      ref={ref}
      className={cx("card rv", shown && "in", wide && "wide", flip && "flip", isFixed(s) && "card-flat", sold && "is-sold")}
    >
      <div className="card-media">
        <Image
          className="shot"
          src={pic.src}
          width={PICTURE.width}
          height={PICTURE.height}
          sizes={CARD_SIZES}
          alt={pictureAlt(s, color, pic.look, locale)}
        />
        {sold && <Stamp />}
        <FavButton product={s} color={color} />
      </div>
      <div className="card-body">
        <Name className="card-name disp" lang={nameLang(s, locale)}>
          <Link href={styleHref(s)}>{text.name}</Link>
        </Name>
        <p className="card-meta">
          {text.kind} · {text.material}
        </p>
        <p className="card-price">{vnd(s.priceVnd, locale)}</p>
        <StockLine facts={stockFacts(catalog, s, now, {}, locale)} className="card-stock" />
        {canBuy(catalog, s, now) && (
          <button
            className="pill card-act"
            type="button"
            aria-label={t({ vi: `Chọn size ${text.name}`, en: `Select a size for ${text.name}` })}
            onClick={(e) => open(s, e.currentTarget)}
          >
            {t({ vi: "Chọn size", en: "Select size" })}
          </button>
        )}
        {wide && (
          <div className="card-extra">
            {/* How the garment is made (`Product.details`, slice B6), as the mock's wide card lists it. Keyed by
                place: a line's words change with the language. */}
            {text.details.length > 0 && (
              <ul className="details">
                {text.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
            <p className="card-colors">
              {t({ vi: "Màu ", en: `${pluralNoun(s.colors.length, "Colour", "Colours")} ` })}
              <b>{s.colors.map((c) => colorLabel(c, locale)).join(", ")}</b>
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

interface GridCardProps {
  product: Product;
  /** "Số 05 · Áo thun" — the line in front of the kind, where the grid mixes lines. */
  showLine?: boolean;
  /** "18/35 đã bán" instead of "Đã đóng 25/09", on the closed issue's own line. */
  soldCount?: boolean;
  h?: "h2" | "h3";
}

/** A compact card for the shop grid (`feed.js`: `gcard`): the packshot, the name, the facts, a heart and a "+". */
export function GridCard({ product: s, showLine = false, soldCount = false, h = "h3" }: GridCardProps) {
  const catalog = useCatalog();
  const now = useNow();
  const locale = useLocale();
  const { open } = useQuickAdd();
  const { ref, shown } = useReveal<HTMLElement>();
  const color = firstColor(s);
  const pic = pictureOf(s, color, "pack");
  const fixed = isFixed(s);
  const sold = isGone(s);
  const text = productText(s, locale);
  const Name = h;
  const meta = (showLine ? `${lineOfStyle(s, locale)} · ` : "") + (fixed ? text.material : text.kind);
  return (
    <article
      ref={ref}
      className={cx("gcard rv", shown && "in", fixed && "gcard-flat", sold && "is-sold", isOver(catalog, s, now) && "is-closed")}
    >
      <Link className="gcard-link" href={styleHref(s)}>
        <div className="gcard-media">
          <Image
            className="shot"
            src={pic.src}
            width={PICTURE.width}
            height={PICTURE.height}
            sizes={GRID_SIZES}
            alt={pictureAlt(s, color, false, locale)}
          />
          {sold && <Stamp />}
        </div>
        <div className="gcard-body">
          <Name className="gcard-name disp" lang={nameLang(s, locale)}>
            {text.name}
          </Name>
          <p className="gcard-meta">{meta}</p>
          <p className="gcard-price">{vnd(s.priceVnd, locale)}</p>
          <StockLine facts={stockFacts(catalog, s, now, { soldCount }, locale)} className="gcard-stock" />
        </div>
      </Link>
      <FavButton product={s} color={color} />
      {canBuy(catalog, s, now) && (
        <button
          className="gcard-add"
          type="button"
          aria-label={picker(locale)({ vi: `Chọn size ${text.name}`, en: `Select a size for ${text.name}` })}
          onClick={(e) => open(s, e.currentTarget)}
        >
          <FeedIcon name="plus" />
        </button>
      )}
    </article>
  );
}

/** A small card inside a rail (`feed.js`: `mini`): the packshot, the name, the price, the fire while few are left. */
export function MiniCard({ product: s }: { product: Product }) {
  const catalog = useCatalog();
  const now = useNow();
  const locale = useLocale();
  const color = firstColor(s);
  const pic = pictureOf(s, color, "pack");
  const sold = isGone(s);
  const facts = stockFacts(catalog, s, now, {}, locale);
  const low = facts?.kind === "left" && facts.low ? facts.n : null;
  return (
    <Link className={cx("mini", isFixed(s) && "mini-flat", sold && "is-sold")} href={styleHref(s)}>
      <div className="mini-media">
        <Image
          className="shot"
          src={pic.src}
          width={PICTURE.width}
          height={PICTURE.height}
          sizes={MINI_SIZES}
          alt={pictureAlt(s, color, false, locale)}
        />
        {sold && <Stamp />}
      </div>
      <p className="mini-name disp" lang={nameLang(s, locale)}>
        {productText(s, locale).name}
      </p>
      <p className="mini-price">{vnd(s.priceVnd, locale)}</p>
      {low !== null && (
        <p className="stock is-low">
          <b>
            <FeedIcon name="fire-fill" />
            {picker(locale)(leftText(low))}
          </b>
        </p>
      )}
    </Link>
  );
}
