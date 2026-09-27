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
import { isFixed, onHandOf } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { FeedIcon } from "./icon/FeedIcon";
import { FeedSheet } from "./FeedSheet";

interface QuickAddApi {
  /** Open the size sheet for a style, from the control that asked. Nothing happens for a style that cannot be bought. */
  open: (product: Product, opener: HTMLElement | null) => void;
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
}

/**
 * The quick add, once per Feed screen (`feed.js`: `openBuy`, `addToCart`,
 * `openGuide`): the size sheet any card's "Chọn size" or "+" opens, the
 * "Đã thêm vào giỏ" sheet after it, and the size guide above it.
 *
 * It starts on the colour the card shows and on the device's remembered size
 * (`prefs.size`, "Size của tôi") when that colour still has it — until slice
 * 3 moves the size into the account. The line goes into the basket through
 * the one cart there is (`CartContext`, `lib/cart.ts`), as the product page's
 * does.
 */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const catalog = useCatalog();
  const { add } = useCart();
  const { prefs, ready: prefsReady } = usePrefs();
  const mine = prefsReady ? prefs.size : null;

  const [buy, setBuy] = useState<Choice | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [added, setAdded] = useState<(Choice & { size: Size }) | null>(null);
  const [addedOpen, setAddedOpen] = useState(false);
  const [atBag, setAtBag] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const guideBack = useRef<HTMLElement | null>(null);
  // What to do once the size sheet has played out: open the added sheet.
  const next = useRef<(() => void) | null>(null);

  const open = useCallback(
    (product: Product, opener: HTMLElement | null) => {
      if (!canBuy(catalog, product, demoNow())) return;
      const color = firstColor(product);
      setBuy({ product, color, size: startSize(product, color, mine), opener });
      setBuyOpen(true);
    },
    [catalog, mine],
  );

  const api = useMemo(() => ({ open }), [open]);

  function pickColor(color: ColorKey) {
    setBuy((b) => {
      if (!b) return b;
      const keep = b.size && onHandOf(b.product, color, b.size) > 0 ? b.size : startSize(b.product, color, mine);
      return { ...b, color, size: keep };
    });
  }

  function addNow() {
    if (!buy?.size || onHandOf(buy.product, buy.color, buy.size) === 0) return;
    const choice = { ...buy, size: buy.size };
    next.current = () => {
      add({ productId: choice.product.id, size: choice.size, color: choice.color, qty: 1 });
      bumpBag();
      setAdded(choice);
      setAtBag(window.matchMedia("(min-width: 900px)").matches);
      setAddedOpen(true);
    };
    setBuyOpen(false);
  }

  const afterBuy = useCallback(() => {
    const f = next.current;
    next.current = null;
    f?.();
  }, []);

  const p = buy?.product;
  const ready = !!buy && !!buy.size && onHandOf(buy.product, buy.color, buy.size) > 0;
  // Trousers have their own chart in the mock; the app has only the tops' until slice 4, so the
  // guide is offered where its figures are the right ones.
  const guide = p ? p.family !== "PANTS" : false;

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
                {guide && (
                  <button
                    className="link"
                    type="button"
                    onClick={(e) => {
                      guideBack.current = e.currentTarget;
                      setGuideOpen(true);
                    }}
                  >
                    <FeedIcon name="ruler" />
                    Bảng size
                  </button>
                )}
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
                        onChange={() => setBuy((b) => (b ? { ...b, size } : b))}
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

      <FeedSheet
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        labelledBy="guide-title"
        back={guideBack.current}
      >
        {p && guide && (
          <div className="sheet-panel">
            <div className="grab" aria-hidden="true" />
            <div className="sh-head plain">
              <div>
                <h2 className="sh-title" id="guide-title">
                  Bảng size
                </h2>
                <p className="sh-sub">Form {FIT_LABELS[p.fit]} · Số đo mô phỏng, cm</p>
              </div>
              <button className="sh-x" type="button" data-close aria-label="Đóng">
                <FeedIcon name="x" />
              </button>
            </div>
            <table className="fit-table">
              <thead>
                <tr>
                  <th scope="col">Size</th>
                  <th scope="col">Ngang ngực</th>
                  <th scope="col">Dài áo</th>
                  <th scope="col">Ngang vai</th>
                  <th scope="col">Hợp chiều cao</th>
                </tr>
              </thead>
              <tbody>
                {sizeChart(p.fit).map((r) => (
                  <tr key={r.size} className={r.size === buy?.size ? "on" : undefined}>
                    <td>{r.size}</td>
                    <td>{r.chestFlat}</td>
                    <td>{r.length}</td>
                    <td>{r.shoulder}</td>
                    <td>
                      {height(r.heightFrom)}-{height(r.heightTo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="fit-note">Đo phẳng, sai số ±1 cm.</p>
          </div>
        )}
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

/** 155 → "1m55", the way the mock's chart writes a height. */
function height(cm: number): string {
  return `${Math.floor(cm / 100)}m${String(cm % 100).padStart(2, "0")}`;
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
