"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS } from "@/data/colors";
import type { ColorKey, Product, ProductId, Size } from "@/data/types";
import { PICTURE, pictureAlt, pictureOf } from "@/lib/feed";
import { savedStyles, wishCard, wishSizeLabel, type SavedStyle, type WishCard, type WishStock } from "@/lib/feed-me";
import { vnd } from "@/lib/money";
import { useFeedToast } from "../FeedToast";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow } from "../now";
import { useQuickAdd } from "../QuickAdd";
import { useKeep } from "../useKeep";
import { cx, useReveal } from "../useReveal";

/** The picture's width: the phone's 136px column, the desktop's 200px (`more.css`: `.b-fc`). */
const CARD_SIZES = "(min-width: 900px) 200px, 136px";

/** How long a card takes to slide out before the list closes over it (`favorites.js`: `remove`). */
const OUT_MS = 200;

/**
 * Yêu thích, signed in (round v4 slice 3b): the approved mock's
 * `favorites.html` and `favorites.js` — a watch list of the account's saved
 * styles (`MyStateContext`, so a heart pressed anywhere is already here).
 *
 * Each style in the colour it was saved in: its packshot (a fixed style's
 * flat drawing; a style of an older issue with no photo of its own is set in
 * type), ĐÃ HẾT on one sold out, the colour and kind, the price, what is left
 * of that colour, and its four sizes — a size still there opens the size
 * sheet on this colour and this size, so adding takes one more tap; a size
 * that has gone is struck through. Once its issue has closed a style stays
 * saved but cannot be bought.
 *
 * The filled heart takes a style off: the card slides out, the list closes
 * over it, the focus moves to the next style's heart (or the previous one's,
 * or the title), and "Đã bỏ lưu BỤI" offers "Hoàn tác", which puts it back
 * where it stood (`unsaveFavoriteAction`, then `restoreFavoriteAction`).
 */
export function WishlistView() {
  const catalog = useCatalog();
  const now = useNow();
  const keep = useKeep();
  const toast = useFeedToast();
  const { open } = useQuickAdd();
  const [leaving, setLeaving] = useState<ProductId[]>([]);
  const focusNext = useRef<string | null>(null);

  const favorites = keep.state?.favorites ?? [];
  const saved = savedStyles(catalog, favorites);

  // Once the list has redrawn: the focus where the removal or the undo sent it.
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    const el =
      document.querySelector<HTMLElement>(target) ?? document.querySelector<HTMLElement>("[data-ui='feed'] .b-title");
    el?.focus({ preventScroll: true });
  });

  function remove(s: SavedStyle) {
    const at = favorites.findIndex((f) => f.productId === s.product.id);
    const next = favorites[at + 1] ?? favorites[at - 1];
    const done = () => {
      setLeaving((l) => l.filter((id) => id !== s.product.id));
      focusNext.current = next ? `[data-unsave="${next.productId}"]` : "[data-ui='feed'] .b-title";
      void keep.unsave(s.product.id);
      toast(`Đã bỏ lưu ${s.product.name}`, {
        label: "Hoàn tác",
        run: () => {
          focusNext.current = `[data-unsave="${s.product.id}"]`;
          void keep.restore(s.fav, at);
        },
      });
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      done();
      return;
    }
    setLeaving((l) => [...l, s.product.id]);
    window.setTimeout(done, OUT_MS);
  }

  function addSize(p: Product, color: ColorKey, size: Size, from: HTMLElement) {
    open(p, from, { color, size });
  }

  const head = (
    <div className="b-head">
      <h1 className="b-title disp" tabIndex={-1}>
        Yêu thích
      </h1>
      {saved.length > 0 && <p className="b-count">{saved.length} mẫu</p>}
    </div>
  );

  if (saved.length === 0) {
    return (
      <>
        {head}
        <div className="empty-state b-empty">
          <span className="empty-ic">
            <FeedIcon name="heart" />
          </span>
          <p className="empty-title">Chưa lưu mẫu nào</p>
          <Link className="btn btn-blue" href="/products">
            Xem Cửa hàng
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <section className="b-fcs" aria-label="Mẫu đã lưu">
        {saved.map((s, i) => (
          <WishCardView
            key={s.product.id}
            card={wishCard(catalog, s, now)}
            index={i}
            leaving={leaving.includes(s.product.id)}
            onRemove={() => remove(s)}
            onSize={addSize}
          />
        ))}
      </section>
    </>
  );
}

interface WishCardViewProps {
  card: WishCard;
  index: number;
  leaving: boolean;
  onRemove: () => void;
  onSize: (p: Product, color: ColorKey, size: Size, from: HTMLElement) => void;
}

/** One saved style (`favorites.js`: `card`). */
function WishCardView({ card, index, leaving, onRemove, onSize }: WishCardViewProps) {
  const { ref, shown } = useReveal<HTMLElement>();
  const p = card.product;
  const unsave = (
    <button className="fav b-fc-fav" type="button" data-unsave={p.id} aria-label={`Bỏ lưu ${p.name}`} onClick={onRemove}>
      <FeedIcon name="heart-fill" />
    </button>
  );

  // A style of an older issue: no photo, no stock, nothing to buy — its name set in type.
  if (card.kind === "type") {
    return (
      <article ref={ref} className={cx("b-fc is-closed rv", shown && "in", leaving && "b-out")}>
        <div className="b-fc-media">
          <p className="b-type" aria-hidden="true">
            {p.name}
          </p>
        </div>
        <div className="b-fc-body">
          <h2 className="b-fc-name disp">{p.name}</h2>
          <p className="b-fc-meta">{p.kind}</p>
          <p className="b-fc-price">{vnd(p.priceVnd)}</p>
        </div>
        {unsave}
      </article>
    );
  }

  const pic = pictureOf(p, card.color, "pack");
  const colorName = COLORS[card.color].label;
  return (
    <article
      ref={ref}
      className={cx(
        "b-fc rv",
        shown && "in",
        card.fixed && "is-flat",
        card.sold && "is-sold",
        card.closed && "is-closed",
        leaving && "b-out",
      )}
    >
      <Link className="b-fc-media" href={card.href} tabIndex={-1} aria-hidden="true">
        <Image
          className="shot"
          src={pic.src}
          width={PICTURE.width}
          height={PICTURE.height}
          sizes={CARD_SIZES}
          loading={index > 2 ? "lazy" : "eager"}
          alt={pictureAlt(p, card.color, false)}
        />
        {card.sold && <span className="plate">ĐÃ HẾT</span>}
      </Link>
      <div className="b-fc-body">
        <h2 className="b-fc-name disp">
          <Link href={card.href}>{p.name}</Link>
        </h2>
        <p className="b-fc-meta">
          {colorName} · {p.kind}
        </p>
        <p className="b-fc-price">{vnd(p.priceVnd)}</p>
        <WishStockLine stock={card.stock} />
        {card.sizes && (
          <div
            className="b-fc-sizes"
            role="group"
            aria-label={`Thêm ${p.name} màu ${colorName.toLocaleLowerCase("vi")}, chọn size`}
          >
            {card.sizes.map(({ size, n }) =>
              n > 0 ? (
                <button
                  className="b-sz"
                  type="button"
                  key={size}
                  aria-label={wishSizeLabel(size, n)}
                  onClick={(e) => onSize(p, card.color, size, e.currentTarget)}
                >
                  {size}
                </button>
              ) : (
                <button className="b-sz" type="button" key={size} disabled aria-label={wishSizeLabel(size, 0)}>
                  {size}
                </button>
              ),
            )}
          </div>
        )}
      </div>
      {unsave}
    </article>
  );
}

/** "Còn 1" with the fire, "Còn 5", "Hết màu xám", "Đã đóng 25/09" (`favorites.js`: `stock`). */
function WishStockLine({ stock }: { stock: WishStock | null }) {
  if (!stock) return null;
  switch (stock.kind) {
    case "gone":
      return (
        <p className="stock b-fc-stock">
          <span>Hết màu {stock.color}</span>
        </p>
      );
    case "closed":
      return (
        <p className="stock b-fc-stock">
          <span>Đã đóng {stock.day}</span>
        </p>
      );
    case "left":
      return stock.low ? (
        <p className="stock b-fc-stock is-low">
          <b>
            <FeedIcon name="fire-fill" />
            Còn {stock.n}
          </b>
        </p>
      ) : (
        <p className="stock b-fc-stock">
          <span>Còn {stock.n}</span>
        </p>
      );
  }
}
