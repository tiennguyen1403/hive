"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useMyState } from "@/components/account/MyStateContext";
import { useCart } from "@/components/cart/CartContext";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { colorLabel } from "@/data/colors";
import { sizeChart } from "@/data/size-chart";
import type { ColorKey, Product, Size } from "@/data/types";
import { addableOf, qtyInCart, type Cart } from "@/lib/cart";
import { fitLabel } from "@/lib/catalog-query";
import { demoNow } from "@/lib/clock";
import {
  canBuy,
  firstColor,
  pictureAlt,
  pictureOf,
  sizeOption,
  sizeRowLabel,
  sizesIn,
  startSize,
  swatchNote,
} from "@/lib/feed";
import { mySizeOf } from "@/lib/feed-me";
import { picker, type Locale } from "@/lib/i18n";
import { isFixed, onHandByColor } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { chartNumber, heightRange, isShorts, pantsChart } from "@/lib/pants-chart";
import { nameLang, productText } from "@/lib/product-text";
import { FeedIcon } from "./icon/FeedIcon";
import { FeedSheet } from "./FeedSheet";

/** A colour and a size the size sheet opens on, and who hears about every change made in it. */
export interface QuickAddPreset {
  color?: ColorKey;
  size?: Size | null;
  /** Each choice made in the sheet, as it is made: the product page keeps its own colour and size in step. */
  onPick?: (pick: { color: ColorKey; size: Size | null }) => void;
  /**
   * The basket's "Chọn size khác" (slice 2): the sheet swaps a line whose size
   * has gone instead of adding one. It does not start on the remembered size,
   * its button reads "Đổi sang …", and `done` gets the colour and size chosen
   * once the sheet has closed.
   */
  swap?: { done: (color: ColorKey, size: Size) => void };
}

/** How many of each size of one colour the basket holds already. */
const heldIn = (cart: Cart, p: Product, color: ColorKey) => (size: Size) => qtyInCart(cart, { productId: p.id, color, size });

interface QuickAddApi {
  /**
   * Open the size sheet for a style, from the control that asked. Nothing
   * happens for a style that cannot be bought. A preset is the product page's
   * own choice so far (its buy bar opens this sheet on the phone).
   */
  open: (product: Product, opener: HTMLElement | null, preset?: QuickAddPreset) => void;
  /** Put one piece in the basket and say so with the "Đã thêm vào giỏ" sheet (the product page, once a size is chosen). */
  add: (product: Product, color: ColorKey, size: Size, opener: HTMLElement | null) => void;
  /** The size guide for a style: the tops' chart for a top, the trousers' for a pair of trousers. */
  guide: (product: Product, size: Size | null, opener: HTMLElement | null) => void;
}

const Ctx = createContext<QuickAddApi | null>(null);

export function useQuickAdd(): QuickAddApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useQuickAdd needs a <QuickAddProvider> above it (FeedFrame renders one)");
  return api;
}

interface Choice {
  product: Product;
  color: ColorKey;
  size: Size | null;
  opener: HTMLElement | null;
  onPick: QuickAddPreset["onPick"] | null;
  /** The remembered size this sheet may start on and calls "Size của tôi"; none while swapping. */
  mine: Size | null;
  swap: QuickAddPreset["swap"] | null;
}

/**
 * The quick add, once per Feed screen (`feed.js`: `openBuy`, `addToCart`,
 * `openGuide`): the size sheet any card's "Chọn size" or "+" opens — and the
 * product page's buy bar, on the phone, and the basket's "Chọn size khác" —
 * the "Đã thêm vào giỏ" sheet after it, and the size guide above it.
 *
 * It starts on the colour the card shows and on "Size của tôi" when that
 * colour still has it: since slice 3b the account's size (`MyStateContext`),
 * quần for trousers and áo for everything else, and none while signed out
 * (the mock's `mySize`). The line goes into the basket through the one cart
 * there is (`CartContext`, `lib/cart.ts`).
 *
 * Slice 2: the basket is counted. A size whose every piece left is in the
 * basket already cannot be added again — `addToCart` would clamp the extra
 * away — so it is drawn as a size that cannot be bought, noted "Đã có trong
 * giỏ", and "Đã thêm vào giỏ" never follows a press that added nothing.
 */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const catalog = useCatalog();
  const { add: addLine, cart } = useCart();
  const { state: kept } = useMyState();
  // The sheets' words in the page's language (round v6 slice E1); a switch while a sheet is open redraws it in place.
  const locale = useLocale();
  const t = picker(locale);

  const [buy, setBuy] = useState<Choice | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [added, setAdded] = useState<{ product: Product; color: ColorKey; size: Size; opener: HTMLElement | null } | null>(
    null,
  );
  const [addedOpen, setAddedOpen] = useState(false);
  const [atBag, setAtBag] = useState(false);
  const [guideFor, setGuideFor] = useState<{ product: Product; size: Size | null } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const guideBack = useRef<HTMLElement | null>(null);
  // What to do once the size sheet has played out: open the added sheet, or swap the basket's line.
  const next = useRef<(() => void) | null>(null);

  const open = useCallback(
    (product: Product, opener: HTMLElement | null, preset: QuickAddPreset = {}) => {
      if (!canBuy(catalog, product, demoNow())) return;
      // The colour asked for when it has anything left, otherwise the first that has (`openBuy`).
      const color =
        preset.color && product.colors.includes(preset.color) && onHandByColor(product, preset.color) > 0
          ? preset.color
          : firstColor(product);
      // A swap keeps the line's own choice to make: no remembered size (`openBuy`: `p.swap ? null : mySize(s)`).
      const own = preset.swap ? null : mySizeOf(kept, product);
      const size =
        preset.size && addableOf(product, cart, color, preset.size) > 0
          ? preset.size
          : startSize(product, color, own, heldIn(cart, product, color));
      setBuy({ product, color, size, opener, onPick: preset.onPick ?? null, mine: own, swap: preset.swap ?? null });
      setBuyOpen(true);
    },
    [catalog, kept, cart],
  );

  const add = useCallback(
    (product: Product, color: ColorKey, size: Size, opener: HTMLElement | null) => {
      // Nothing would go in: the basket holds every piece of it already. No "Đã thêm".
      if (addableOf(product, cart, color, size) <= 0) return;
      addLine({ productId: product.id, size, color, qty: 1 });
      bumpBag();
      setAdded({ product, color, size, opener });
      setAtBag(window.matchMedia("(min-width: 900px)").matches);
      setAddedOpen(true);
    },
    [addLine, cart],
  );

  const guide = useCallback((product: Product, size: Size | null, opener: HTMLElement | null) => {
    guideBack.current = opener;
    setGuideFor({ product, size });
    setGuideOpen(true);
  }, []);

  const api = useMemo(() => ({ open, add, guide }), [open, add, guide]);

  function pick(color: ColorKey, size: Size | null) {
    if (!buy) return;
    setBuy({ ...buy, color, size });
    buy.onPick?.({ color, size });
  }

  function pickColor(color: ColorKey) {
    if (!buy) return;
    const keep =
      buy.size && addableOf(buy.product, cart, color, buy.size) > 0
        ? buy.size
        : startSize(buy.product, color, buy.mine, heldIn(cart, buy.product, color));
    pick(color, keep);
  }

  function addNow() {
    if (!buy?.size || addableOf(buy.product, cart, buy.color, buy.size) <= 0) return;
    const { product, color, size, opener, swap } = buy;
    next.current = swap ? () => swap.done(color, size) : () => add(product, color, size, opener);
    setBuyOpen(false);
  }

  const afterBuy = useCallback(() => {
    const f = next.current;
    next.current = null;
    f?.();
  }, []);

  const p = buy?.product;
  const text = p ? productText(p, locale) : null;
  const ready = !!buy && !!buy.size && addableOf(buy.product, cart, buy.color, buy.size) > 0;
  const held = buy ? heldIn(cart, buy.product, buy.color) : () => 0;

  return (
    <Ctx.Provider value={api}>
      {children}

      <FeedSheet open={buyOpen} onClose={() => setBuyOpen(false)} onClosed={afterBuy} labelledBy="buy-title" back={buy?.opener}>
        {buy && p && text && (
          <div className="sheet-panel">
            <div className="grab" aria-hidden="true" />
            <div className="sh-head">
              <Image className="sh-thumb" src={pictureOf(p, buy.color, "pack").src} width={56} height={70} alt="" />
              <div>
                <h2 className="sh-name disp" id="buy-title" lang={nameLang(p, locale)}>
                  {text.name}
                </h2>
                <p className="sh-sub">
                  {text.kind} · <b>{vnd(p.priceVnd, locale)}</b>
                </p>
              </div>
              <button className="sh-x" type="button" data-close aria-label={t({ vi: "Đóng", en: "Close" })}>
                <FeedIcon name="x" />
              </button>
            </div>
            <div className="sh-block">
              {/* "Màu " with its space, one text node as it always was (`FeedCards.tsx` says why). */}
              <p className="sh-label">
                {t({ vi: "Màu ", en: "Colour " })}
                <span>{colorLabel(buy.color, locale)}</span>
              </p>
              <div className="swatches" role="radiogroup" aria-label={t({ vi: "Màu", en: "Colour" })}>
                {p.colors.map((c) => {
                  const note = swatchNote(p, c, locale);
                  return (
                    <label className="swatch" key={c}>
                      <input type="radio" name="buy-color" value={c} checked={c === buy.color} onChange={() => pickColor(c)} />
                      <span className={isFixed(p) ? "swatch-img flat" : "swatch-img"}>
                        <Image src={pictureOf(p, c, "pack").src} width={64} height={80} alt="" />
                      </span>
                      <span className="swatch-name">{colorLabel(c, locale)}</span>
                      {note && <span className="swatch-left">{note}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="sh-block">
              <div className="sh-label">
                <span className="sh-label-t">{sizeRowLabel(buy.size, buy.mine, locale)}</span>{" "}
                <button className="link" type="button" onClick={(e) => guide(p, buy.size, e.currentTarget)}>
                  <FeedIcon name="ruler" />
                  {t({ vi: "Bảng size", en: "Size guide" })}
                </button>
              </div>
              <div className="sizes" role="radiogroup" aria-label="Size">
                {sizesIn(p, buy.color).map(({ size, n }) => {
                  const opt = sizeOption(n, held(size), locale);
                  return (
                    <label className="size" key={size}>
                      <input
                        type="radio"
                        name="buy-size"
                        value={size}
                        disabled={!opt.open}
                        checked={size === buy.size && opt.open}
                        onChange={() => pick(buy.color, size)}
                      />
                      <span className="sz">{size}</span>
                      {opt.note && <small>{opt.note}</small>}
                    </label>
                  );
                })}
              </div>
            </div>
            <button className="btn btn-blue sh-cta" type="button" disabled={!ready} onClick={addNow}>
              {!ready || !buy.size ? (
                t({ vi: "Chọn size", en: "Select size" })
              ) : buy.swap ? (
                t({
                  vi: `Đổi sang ${colorLabel(buy.color).toLocaleLowerCase("vi")}, size ${buy.size}`,
                  en: `Switch to ${colorLabel(buy.color, "en").toLocaleLowerCase("en")}, size ${buy.size}`,
                })
              ) : (
                <>
                  <FeedIcon name="bag" />
                  {t({ vi: "Thêm vào giỏ ", en: "Add to bag " })}
                  <span className="price">· {vnd(p.priceVnd, locale)}</span>
                </>
              )}
            </button>
          </div>
        )}
      </FeedSheet>

      <FeedSheet open={guideOpen} onClose={() => setGuideOpen(false)} labelledBy="guide-title" back={guideBack.current}>
        {guideFor && <GuidePanel product={guideFor.product} size={guideFor.size} locale={locale} />}
      </FeedSheet>

      <FeedSheet
        open={addedOpen}
        onClose={() => setAddedOpen(false)}
        labelledBy="added-title"
        variant={atBag ? "at-bag" : undefined}
        back={added?.opener}
      >
        {added && (
          <div className="sheet-panel">
            <div className="grab" aria-hidden="true" />
            <div className="sh-head plain">
              <div className="ok-head">
                <FeedIcon name="check-circle-fill" />
                <h2 className="sh-title" id="added-title">
                  {t({ vi: "Đã thêm vào giỏ", en: "Added to bag" })}
                </h2>
              </div>
              <button className="sh-x" type="button" data-close aria-label={t({ vi: "Đóng", en: "Close" })}>
                <FeedIcon name="x" />
              </button>
            </div>
            <div className="added">
              <Image
                src={pictureOf(added.product, added.color, "pack").src}
                width={72}
                height={90}
                alt={pictureAlt(added.product, added.color, false, locale)}
              />
              <div>
                <p className="added-name disp" lang={nameLang(added.product, locale)}>
                  {productText(added.product, locale).name}
                </p>
                <p className="added-meta">
                  {colorLabel(added.color, locale)} · Size {added.size}
                </p>
                <p className="added-price">{vnd(added.product.priceVnd, locale)}</p>
              </div>
            </div>
            <div className="stack">
              <Link className="btn btn-blue" href="/cart" data-autofocus>
                {t({ vi: "Xem giỏ", en: "View bag" })}
              </Link>
              <button className="btn btn-line" type="button" data-close>
                {t({ vi: "Tiếp tục xem", en: "Keep browsing" })}
              </button>
            </div>
          </div>
        )}
      </FeedSheet>
    </Ctx.Provider>
  );
}

/**
 * "Bảng size" (`feed.js`: `openGuide`): tops by their fit (`data/size-chart.ts`),
 * trousers by their length (`lib/pants-chart.ts`: long, or shorts with their own
 * lengths). Both simulated, and the sheet says so. The chosen size's row is lit.
 *
 * In English (round v6 slice E1) "Size guide", the columns by their English
 * names, the figures with a decimal point and the heights in centimetres like
 * the rest of the chart (`chartNumber`, `heightRange`).
 */
function GuidePanel({ product: p, size, locale }: { product: Product; size: Size | null; locale: Locale }) {
  const t = picker(locale);
  const pants = p.family === "PANTS";
  const kind = pants
    ? isShorts(p)
      ? t({ vi: "Quần short", en: "Shorts" })
      : t({ vi: "Quần dài", en: "Trousers" })
    : t({ vi: `Form ${fitLabel(p.fit)}`, en: `${fitLabel(p.fit, "en")} fit` });
  const head = pants
    ? t({
        vi: ["Vòng eo", "Vòng mông", "Dài quần", "Ngang đùi", "Hợp chiều cao"],
        en: ["Waist", "Hip", "Length", "Thigh", "Height"],
      })
    : t({ vi: ["Ngang ngực", "Dài áo", "Ngang vai", "Hợp chiều cao"], en: ["Chest", "Length", "Shoulder", "Height"] });
  const num = (n: number) => chartNumber(n, locale);
  const rows: { size: Size; cells: string[] }[] = pants
    ? pantsChart(p).map((r) => ({
        size: r.size,
        cells: [r.waist, r.hip, r.length, r.thigh].map(num).concat(heightRange(r.heightFrom, r.heightTo, locale)),
      }))
    : sizeChart(p.fit).map((r) => ({
        size: r.size,
        cells: [r.chestFlat, r.length, r.shoulder].map(num).concat(heightRange(r.heightFrom, r.heightTo, locale)),
      }));
  return (
    <div className="sheet-panel">
      <div className="grab" aria-hidden="true" />
      <div className="sh-head plain">
        <div>
          <h2 className="sh-title" id="guide-title">
            {t({ vi: "Bảng size", en: "Size guide" })}
          </h2>
          <p className="sh-sub">
            {kind}
            {t({ vi: " · Số đo mô phỏng, cm", en: " · Simulated measurements, cm" })}
          </p>
        </div>
        <button className="sh-x" type="button" data-close aria-label={t({ vi: "Đóng", en: "Close" })}>
          <FeedIcon name="x" />
        </button>
      </div>
      <table className={pants ? "fit-table is-pants" : "fit-table"}>
        <thead>
          <tr>
            <th scope="col">Size</th>
            {/* Keyed by place: a column's name changes with the language. */}
            {head.map((h, i) => (
              <th scope="col" key={i}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.size} className={r.size === size ? "on" : undefined}>
              <td>{r.size}</td>
              {r.cells.map((c, i) => (
                <td key={i}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fit-note">
        {pants
          ? t({ vi: "Sai số ±1 cm.", en: "Allow ±1 cm." })
          : t({ vi: "Đo phẳng, sai số ±1 cm.", en: "Measured flat. Allow ±1 cm." })}
      </p>
    </div>
  );
}

/** The bag in the bar and the tab bar gives a small jump when a line goes in (`feed.js`: `bumpBag`). */
function bumpBag() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll("[data-cart-link] .i").forEach((icon) => {
    icon.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }], {
      duration: 420,
      easing: "cubic-bezier(.2,.9,.2,1.05)",
    });
  });
}
