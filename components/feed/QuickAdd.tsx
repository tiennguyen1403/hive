"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { usePrefs } from "@/components/shop/prefs";
import { COLORS } from "@/data/colors";
import { sizeChart } from "@/data/size-chart";
import type { ColorKey, Product, Size } from "@/data/types";
import { FIT_LABELS } from "@/lib/catalog-query";
import { demoNow } from "@/lib/clock";
import {
  canBuy,
  firstColor,
  pictureAlt,
  pictureOf,
  sizeNote,
  sizeRowLabel,
  sizesIn,
  startSize,
  swatchNote,
} from "@/lib/feed";
import { isFixed, onHandByColor, onHandOf } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { chartNumber, heightRange, isShorts, pantsChart } from "@/lib/pants-chart";
import { FeedIcon } from "./icon/FeedIcon";
import { FeedSheet } from "./FeedSheet";

/** A colour and a size the size sheet opens on, and who hears about every change made in it. */
export interface QuickAddPreset {
  color?: ColorKey;
  size?: Size | null;
  /** Each choice made in the sheet, as it is made: the product page keeps its own colour and size in step. */
  onPick?: (pick: { color: ColorKey; size: Size | null }) => void;
}

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
}

/**
 * The quick add, once per Feed screen (`feed.js`: `openBuy`, `addToCart`,
 * `openGuide`): the size sheet any card's "Chọn size" or "+" opens — and the
 * product page's buy bar, on the phone — the "Đã thêm vào giỏ" sheet after
 * it, and the size guide above it.
 *
 * It starts on the colour the card shows and on the device's remembered size
 * (`prefs.size`, "Size của tôi") when that colour still has it — until slice
 * 3 moves the size into the account. The line goes into the basket through
 * the one cart there is (`CartContext`, `lib/cart.ts`).
 */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const catalog = useCatalog();
  const { add: addLine } = useCart();
  const { prefs, ready: prefsReady } = usePrefs();
  const mine = prefsReady ? prefs.size : null;

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
  // What to do once the size sheet has played out: open the added sheet.
  const next = useRef<(() => void) | null>(null);

  const open = useCallback(
    (product: Product, opener: HTMLElement | null, preset: QuickAddPreset = {}) => {
      if (!canBuy(catalog, product, demoNow())) return;
      // The colour asked for when it has anything left, otherwise the first that has (`openBuy`).
      const color =
        preset.color && product.colors.includes(preset.color) && onHandByColor(product, preset.color) > 0
          ? preset.color
          : firstColor(product);
      const size =
        preset.size && onHandOf(product, color, preset.size) > 0 ? preset.size : startSize(product, color, mine);
      setBuy({ product, color, size, opener, onPick: preset.onPick ?? null });
      setBuyOpen(true);
    },
    [catalog, mine],
  );

  const add = useCallback(
    (product: Product, color: ColorKey, size: Size, opener: HTMLElement | null) => {
      if (onHandOf(product, color, size) === 0) return;
      addLine({ productId: product.id, size, color, qty: 1 });
      bumpBag();
      setAdded({ product, color, size, opener });
      setAtBag(window.matchMedia("(min-width: 900px)").matches);
      setAddedOpen(true);
    },
    [addLine],
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
    const keep = buy.size && onHandOf(buy.product, color, buy.size) > 0 ? buy.size : startSize(buy.product, color, mine);
    pick(color, keep);
  }

  function addNow() {
    if (!buy?.size || onHandOf(buy.product, buy.color, buy.size) === 0) return;
    const { product, color, size, opener } = buy;
    next.current = () => add(product, color, size, opener);
    setBuyOpen(false);
  }

  const afterBuy = useCallback(() => {
    const f = next.current;
    next.current = null;
    f?.();
  }, []);

  const p = buy?.product;
  const ready = !!buy && !!buy.size && onHandOf(buy.product, buy.color, buy.size) > 0;

  return (
    <Ctx.Provider value={api}>
      {children}

      <FeedSheet open={buyOpen} onClose={() => setBuyOpen(false)} onClosed={afterBuy} labelledBy="buy-title" back={buy?.opener}>
        {buy && p && (
          <div className="sheet-panel">
            <div className="grab" aria-hidden="true" />
            <div className="sh-head">
              <Image className="sh-thumb" src={pictureOf(p, buy.color, "pack").src} width={56} height={70} alt="" />
              <div>
                <h2 className="sh-name disp" id="buy-title">
                  {p.name}
                </h2>
                <p className="sh-sub">
                  {p.kind} · <b>{vnd(p.priceVnd)}</b>
                </p>
              </div>
              <button className="sh-x" type="button" data-close aria-label="Đóng">
                <FeedIcon name="x" />
              </button>
            </div>
            <div className="sh-block">
              <p className="sh-label">
                Màu <span>{COLORS[buy.color].label}</span>
              </p>
              <div className="swatches" role="radiogroup" aria-label="Màu">
                {p.colors.map((c) => {
                  const note = swatchNote(p, c);
                  return (
                    <label className="swatch" key={c}>
                      <input type="radio" name="buy-color" value={c} checked={c === buy.color} onChange={() => pickColor(c)} />
                      <span className={isFixed(p) ? "swatch-img flat" : "swatch-img"}>
                        <Image src={pictureOf(p, c, "pack").src} width={64} height={80} alt="" />
                      </span>
                      <span className="swatch-name">{COLORS[c].label}</span>
                      {note && <span className="swatch-left">{note}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="sh-block">
              <div className="sh-label">
                <span className="sh-label-t">{sizeRowLabel(buy.size, mine)}</span>{" "}
                <button className="link" type="button" onClick={(e) => guide(p, buy.size, e.currentTarget)}>
                  <FeedIcon name="ruler" />
                  Bảng size
                </button>
              </div>
              <div className="sizes" role="radiogroup" aria-label="Size">
                {sizesIn(p, buy.color).map(({ size, n }) => {
                  const note = sizeNote(n);
                  return (
                    <label className="size" key={size}>
                      <input
                        type="radio"
                        name="buy-size"
                        value={size}
                        disabled={n === 0}
                        checked={size === buy.size && n > 0}
                        onChange={() => pick(buy.color, size)}
                      />
                      <span className="sz">{size}</span>
                      {note && <small>{note}</small>}
                    </label>
                  );
                })}
              </div>
            </div>
            <button className="btn btn-blue sh-cta" type="button" disabled={!ready} onClick={addNow}>
              {ready ? (
                <>
                  <FeedIcon name="bag" />
                  Thêm vào giỏ <span className="price">· {vnd(p.priceVnd)}</span>
                </>
              ) : (
                "Chọn size"
              )}
            </button>
          </div>
        )}
      </FeedSheet>

      <FeedSheet open={guideOpen} onClose={() => setGuideOpen(false)} labelledBy="guide-title" back={guideBack.current}>
        {guideFor && <GuidePanel product={guideFor.product} size={guideFor.size} />}
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
                  Đã thêm vào giỏ
                </h2>
              </div>
              <button className="sh-x" type="button" data-close aria-label="Đóng">
                <FeedIcon name="x" />
              </button>
            </div>
            <div className="added">
              <Image
                src={pictureOf(added.product, added.color, "pack").src}
                width={72}
                height={90}
                alt={pictureAlt(added.product, added.color, false)}
              />
              <div>
                <p className="added-name disp">{added.product.name}</p>
                <p className="added-meta">
                  {COLORS[added.color].label} · Size {added.size}
                </p>
                <p className="added-price">{vnd(added.product.priceVnd)}</p>
              </div>
            </div>
            <div className="stack">
              <Link className="btn btn-blue" href="/cart" data-autofocus>
                Xem giỏ
              </Link>
              <button className="btn btn-line" type="button" data-close>
                Tiếp tục xem
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
 */
function GuidePanel({ product: p, size }: { product: Product; size: Size | null }) {
  const pants = p.family === "PANTS";
  const kind = pants ? (isShorts(p) ? "Quần short" : "Quần dài") : `Form ${FIT_LABELS[p.fit]}`;
  const head = pants
    ? ["Vòng eo", "Vòng mông", "Dài quần", "Ngang đùi", "Hợp chiều cao"]
    : ["Ngang ngực", "Dài áo", "Ngang vai", "Hợp chiều cao"];
  const rows: { size: Size; cells: string[] }[] = pants
    ? pantsChart(p).map((r) => ({
        size: r.size,
        cells: [r.waist, r.hip, r.length, r.thigh].map(chartNumber).concat(heightRange(r.heightFrom, r.heightTo)),
      }))
    : sizeChart(p.fit).map((r) => ({
        size: r.size,
        cells: [r.chestFlat, r.length, r.shoulder].map(chartNumber).concat(heightRange(r.heightFrom, r.heightTo)),
      }));
  return (
    <div className="sheet-panel">
      <div className="grab" aria-hidden="true" />
      <div className="sh-head plain">
        <div>
          <h2 className="sh-title" id="guide-title">
            Bảng size
          </h2>
          <p className="sh-sub">{kind} · Số đo mô phỏng, cm</p>
        </div>
        <button className="sh-x" type="button" data-close aria-label="Đóng">
          <FeedIcon name="x" />
        </button>
      </div>
      <table className={pants ? "fit-table is-pants" : "fit-table"}>
        <thead>
          <tr>
            <th scope="col">Size</th>
            {head.map((h) => (
              <th scope="col" key={h}>
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
      <p className="fit-note">{pants ? "Sai số ±1 cm." : "Đo phẳng, sai số ±1 cm."}</p>
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
