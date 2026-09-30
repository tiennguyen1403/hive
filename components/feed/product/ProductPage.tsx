"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMyState } from "@/components/account/MyStateContext";
import { useCart } from "@/components/cart/CartContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS } from "@/data/colors";
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
import { isFixed } from "@/lib/inventory";
import { vnd } from "@/lib/money";
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
  const quick = useQuickAdd();
  const { cart } = useCart();
  const { state: kept } = useMyState();
  const mine = mySizeOf(kept, p);

  const buy = buyState(catalog, p, now);
  const selling = buy.kind === "open";
  // Its issue is not selling (closed, or not open yet), sold out or not: no sizes, no counts, a tag.
  const standing = overIssue(catalog, p, now);
  const over = standing !== null;
  const sold = buy.kind === "sold";
  const fixed = isFixed(p);
  const line = styleLine(catalog, p, now);

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

  const label = buyLabel(buy);
  const cta = (
    <button className="btn btn-blue" type="button" disabled={label !== null} onClick={onCta}>
      {label ??
        (ready ? (
          <>
            <FeedIcon name="bag" />
            Thêm vào giỏ <span className="price">· {vnd(p.priceVnd)}</span>
          </>
        ) : (
          "Chọn size"
        ))}
    </button>
  );

  const colorName = COLORS[color].label;

  return (
    <>
      <PhoneBar product={p} color={color} solid={solid} />

      <div className="pdp">
        <nav className="crumbs" aria-label="Đường dẫn">
          <Link href="/products">Cửa hàng</Link>
          <span aria-hidden="true">/</span>
          <Link href={line.href}>{line.label}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{p.name}</span>
        </nav>

        <section ref={gal} className={cx("gal", sold && "is-sold", !many && "one")} aria-label={`Ảnh ${p.name}`}>
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
                    alt={pictureAlt(p, color, pic.look)}
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
                aria-label="Ảnh trước"
                disabled={frame === 0}
                onClick={(e) => go(frame - 1, e.currentTarget)}
              >
                <FeedIcon name="caret-left" />
              </button>
              <button
                className="gal-btn gal-next"
                type="button"
                aria-label="Ảnh sau"
                disabled={frame === last}
                onClick={(e) => go(frame + 1, e.currentTarget)}
              >
                <FeedIcon name="caret-right" />
              </button>
            </>
          )}
          {sold && <span className="plate">ĐÃ HẾT</span>}
          {many && (
            <p className="sr-only" id="gal-count" aria-live="polite">
              Ảnh {frame + 1} trên {kinds.length}, màu {colorName.toLocaleLowerCase("vi")}
            </p>
          )}
        </section>

        <div className="pinfo-col">
          <div className="pinfo">
            <div className="pinfo-tags">
              <span className="chip-tag">{line.label}</span>
              {standing && <span className="chip-line">{standing.closed ? "ĐÃ ĐÓNG" : "SẮP MỞ"}</span>}
            </div>
            <h1 className="pname disp">{p.name}</h1>
            <p className="pkind">{p.kind}</p>
            <p className="pprice">{vnd(p.priceVnd)}</p>
            <StockMain facts={mainStock(catalog, p, now)} />

            <div className="pblock">
              <p className="sh-label">
                Màu <span>{colorName}</span>
              </p>
              <div className="swatches" role="radiogroup" aria-label="Màu">
                {p.colors.map((c) => {
                  const note = over ? null : swatchNote(p, c);
                  return (
                    <label className="swatch" key={c}>
                      <input type="radio" name="p-color" value={c} checked={c === color} onChange={() => chooseColor(c)} />
                      <span className={fixed ? "swatch-img flat" : "swatch-img"}>
                        <Image src={pictureOf(p, c, "pack").src} width={64} height={80} alt="" />
                      </span>
                      <span className="swatch-name">{COLORS[c].label}</span>
                      {note && <span className="swatch-left">{note}</span>}
                    </label>
                  );
                })}
              </div>
            </div>

            {!over && (
              <div ref={sizeBlock} className={cx("pblock", need && "need")}>
                <div className="sh-label">
                  <span className="sh-label-t">{sizeRowLabel(chosen, mine)}</span>{" "}
                  <button className="link" type="button" onClick={(e) => quick.guide(p, chosen, e.currentTarget)}>
                    <FeedIcon name="ruler" />
                    Bảng size
                  </button>
                </div>
                <div ref={sizesRow} className="sizes" role="radiogroup" aria-label="Size">
                  {sizesIn(p, color).map(({ size: z, n }) => {
                    const opt = sizeOption(n, held(color)(z));
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
                  {need ? "Chọn size để thêm vào giỏ" : ""}
                </p>
              </div>
            )}

            <div className="padd">{cta}</div>
          </div>
        </div>

        <div className="psects">
          {p.details.length > 0 && (
            <section className="sect" aria-labelledby="h-detail">
              <h2 className="sect-title" id="h-detail">
                Chi tiết
              </h2>
              <ul className="details">
                {p.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="sect" aria-labelledby="h-spec">
            <h2 className="sect-title" id="h-spec">
              Thông số
            </h2>
            <Facts rows={specRows(p)} />
          </section>
          <section className="sect" aria-labelledby="h-ship">
            <h2 className="sect-title" id="h-ship">
              Giao hàng và đổi trả
            </h2>
            <Facts rows={shipRows()} />
          </section>
        </div>

        {line.others.length > 0 && (
          <div className="sect rail-sect">
            <Rail id="rail-more" title={line.railTitle} more={{ href: line.href, label: "Xem tất cả" }} items={line.others} />
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
function PhoneBar({ product: p, color, solid }: { product: Product; color: ColorKey; solid: boolean }) {
  const { units, ready } = useCart();
  const n = ready ? units : 0;
  return (
    <div className={cx("pbar", solid && "solid")}>
      <Link className="ib" href="/" aria-label="Quay lại" onClick={backOrFollow}>
        <FeedIcon name="caret-left" />
      </Link>
      <p className="pbar-title disp" aria-hidden="true">
        {p.name}
      </p>
      <FavButton product={p} color={color} bar />
      <Link className="ib" href="/cart" data-cart-link="" aria-label={n ? `Giỏ, ${n} món` : "Giỏ, đang trống"}>
        <FeedIcon name="bag" />
        {n > 0 && <span className="badge">{n > 99 ? "99+" : n}</span>}
      </Link>
    </div>
  );
}

/** The line under the price (`stockMain`): what is left of the cut, what sold, or the sizes a fixed style is out of. */
function StockMain({ facts }: { facts: MainStock }) {
  switch (facts.kind) {
    case "fixed":
      return (
        <p className="stock pstock">
          <span>{facts.gone.length ? `Hết ${facts.gone.join(" ")}` : "Đủ size"}</span>
        </p>
      );
    case "sold":
      return (
        <p className="stock pstock">
          <b>
            {facts.sold}/{facts.cut} đã bán
          </b>
        </p>
      );
    case "left":
      return (
        <p className={cx("stock pstock", facts.low && "is-low")}>
          <b>
            {facts.low && <FeedIcon name="fire-fill" />}
            Còn {facts.n}
          </b>
          <span>/ {facts.cut} chiếc đã cắt</span>
        </p>
      );
  }
}

/** A list of facts; a row with a link is a link across the whole row, its value ending in a quiet arrow. */
function Facts({ rows }: { rows: FactRow[] }) {
  return (
    <dl className="facts">
      {rows.map((r) =>
        r.href ? (
          <div className="facts-go" key={r.label}>
            <dt>{r.label}</dt>
            <dd>
              <Link href={r.href} aria-label={`${r.label} ${r.value}`}>
                {r.value}
                <FeedIcon name="caret-right" />
              </Link>
            </dd>
          </div>
        ) : (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ),
      )}
    </dl>
  );
}
