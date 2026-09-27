"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useWishlist } from "@/components/account/WishlistContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS } from "@/data/colors";
import type { Product } from "@/data/types";
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
import { isFixed } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { FeedIcon } from "./icon/FeedIcon";
import { useNow } from "./now";
import { useQuickAdd } from "./QuickAdd";
import { cx, useReveal } from "./useReveal";

/*
 * The Feed's three cards (`feed.js`: `card`, `gcard`, `mini`) and the pieces
 * they share: the stock line, the heart, the ĐÃ HẾT stamp. Each links to the
 * style's page; the heart and the quick add sit above that link.
 *
 * The names are printed bare — "KHÓI", not "S05 – KHÓI" — as the mock prints
 * them (round v4, the user's answer on 27/09: the issue prefix goes).
 */

/** The width a picture takes: full-bleed on the phone, the 600px column on a tablet, a third of the desktop's rows. */
const CARD_SIZES = "(min-width: 900px) 400px, (min-width: 600px) 600px, 100vw";
const GRID_SIZES = "(min-width: 900px) 320px, (min-width: 600px) 200px, 50vw";
const MINI_SIZES = "(min-width: 900px) 240px, 45vw";

/** The link to a style's page. */
export function styleHref(p: Product): string {
  return `/products/${p.slug}`;
}

/** "Còn 2 · Hết S M", with the fire when few are left; "Đã đóng 25/09"; "Đủ size" (`feed.js`: `stockLine`). */
export function StockLine({ facts, className }: { facts: StockFacts | null; className?: string }) {
  if (!facts) return null;
  const cls = cx("stock", facts.kind === "left" && facts.low && "is-low", className);
  const gone = (sizes: readonly string[]) => (sizes.length ? <span className="gone">Hết {sizes.join(" ")}</span> : null);
  switch (facts.kind) {
    case "sold":
      return (
        <p className={cls}>
          <span>
            {facts.sold}/{facts.cut} đã bán
          </span>
        </p>
      );
    case "fixed":
      return <p className={cls}>{gone(facts.gone) ?? <span>Đủ size</span>}</p>;
    case "closed":
      return (
        <p className={cls}>
          <span>Đã đóng {facts.day}</span>
        </p>
      );
    case "left":
      return (
        <p className={cls}>
          {facts.low ? (
            <b>
              <FeedIcon name="fire-fill" />
              Còn {facts.n}
            </b>
          ) : (
            <span>Còn {facts.n}</span>
          )}
          {gone(facts.gone)}
        </p>
      );
  }
}

/**
 * The heart: saves the style on this device (`lib/wishlist.ts`, as every
 * screen does until slice 3 moves it into the account). A filled heart while
 * it is saved; it pops when a style goes in. On a card it sits on the
 * picture (`.fav`); on the product page's phone bar it is one of the bar's
 * round buttons (`bar`).
 */
export function FavButton({ product, bar = false }: { product: Product; bar?: boolean }) {
  const wish = useWishlist();
  const [pops, setPops] = useState(0);
  const saved = wish.ready && wish.has(product.id);
  return (
    <button
      className={cx(bar ? "ib pbar-fav" : "fav", pops > 0 && "pop")}
      type="button"
      aria-pressed={saved}
      aria-label={`Yêu thích ${product.name}`}
      onClick={(e) => {
        e.preventDefault();
        if (!saved) setPops((n) => n + 1);
        wish.toggle(product.id);
      }}
    >
      <FeedIcon key={pops} name={saved ? "heart-fill" : "heart"} />
    </button>
  );
}

const Stamp = () => <span className="plate">ĐÃ HẾT</span>;

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
  const { open } = useQuickAdd();
  const { ref, shown } = useReveal<HTMLElement>();
  const color = firstColor(s);
  const pic = pictureOf(s, color, kind);
  const sold = isGone(s);
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
          alt={pictureAlt(s, color, pic.look)}
        />
        {sold && <Stamp />}
        <FavButton product={s} />
      </div>
      <div className="card-body">
        <Name className="card-name disp">
          <Link href={styleHref(s)}>{s.name}</Link>
        </Name>
        <p className="card-meta">
          {s.kind} · {s.material}
        </p>
        <p className="card-price">{vnd(s.priceVnd)}</p>
        <StockLine facts={stockFacts(catalog, s, now)} className="card-stock" />
        {canBuy(catalog, s, now) && (
          <button
            className="pill card-act"
            type="button"
            aria-label={`Chọn size ${s.name}`}
            onClick={(e) => open(s, e.currentTarget)}
          >
            Chọn size
          </button>
        )}
        {wide && (
          <div className="card-extra">
            {/* How the garment is made (`Product.details`, slice B6), as the mock's wide card lists it. */}
            {s.details.length > 0 && (
              <ul className="details">
                {s.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
            <p className="card-colors">
              Màu <b>{s.colors.map((c) => COLORS[c].label).join(", ")}</b>
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
  const { open } = useQuickAdd();
  const { ref, shown } = useReveal<HTMLElement>();
  const color = firstColor(s);
  const pic = pictureOf(s, color, "pack");
  const fixed = isFixed(s);
  const sold = isGone(s);
  const Name = h;
  const meta = (showLine ? `${lineOfStyle(s)} · ` : "") + (fixed ? s.material : s.kind);
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
            alt={pictureAlt(s, color, false)}
          />
          {sold && <Stamp />}
        </div>
        <div className="gcard-body">
          <Name className="gcard-name disp">{s.name}</Name>
          <p className="gcard-meta">{meta}</p>
          <p className="gcard-price">{vnd(s.priceVnd)}</p>
          <StockLine facts={stockFacts(catalog, s, now, { soldCount })} className="gcard-stock" />
        </div>
      </Link>
      <FavButton product={s} />
      {canBuy(catalog, s, now) && (
        <button className="gcard-add" type="button" aria-label={`Chọn size ${s.name}`} onClick={(e) => open(s, e.currentTarget)}>
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
  const color = firstColor(s);
  const pic = pictureOf(s, color, "pack");
  const sold = isGone(s);
  const facts = stockFacts(catalog, s, now);
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
          alt={pictureAlt(s, color, false)}
        />
        {sold && <Stamp />}
      </div>
      <p className="mini-name disp">{s.name}</p>
      <p className="mini-price">{vnd(s.priceVnd)}</p>
      {low !== null && (
        <p className="stock is-low">
          <b>
            <FeedIcon name="fire-fill" />
            Còn {low}
          </b>
        </p>
      )}
    </Link>
  );
}
