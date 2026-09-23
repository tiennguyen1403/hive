"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon/Icon";
import { useCart } from "@/components/cart/CartContext";
import { Toast } from "@/components/shop/Toast";
import { COLORS } from "@/data/colors";
import { SIZES, type ColorKey, type Product, type Size } from "@/data/types";
import { isSoldOut, onHand, onHandBySize, soldOutSizes, soldUnits } from "@/lib/inventory";
import { LOW_STOCK_AT } from "@/lib/inventory";
import { dayMonth } from "@/lib/datetime";
import { kindInSentence } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";
import { SizeSheet } from "./SizeSheet";

interface ProductCardProps {
  product: Product;
  /**
   * Print the KIND where the size run would go — "còn 17 · áo thun oversize".
   *
   * Only where the row is a mixture. In a listing every card sits under a
   * family tab and the kind would be noise, while which sizes are left is the
   * fact that decides a tap. On the search results and in the related row the
   * opposite holds: the cards have nothing in common but the word that found
   * them, so what each one IS comes first.
   */
  kindCount?: boolean;
  /**
   * The issue this card belongs to has closed. Not the same as sold out: the
   * shelf may still hold units. What ended was the window, so the card says
   * that instead of claiming the style ran out — and offers no button,
   * because there is nothing to press.
   */
  closed?: boolean;
  /** Extra notification after the line has gone into the cart. */
  onAdd?: (choice: { product: Product; size: Size; color: ColorKey }) => void;
  /**
   * Take this style off the saved list. Passed only where the card is
   * standing IN that list, which puts the control on the plate instead of
   * under the card — see `UnsaveButton`.
   */
  onUnsave?: () => void;
  /**
   * When this style was saved — "lưu 15/09" at the end of the count line.
   *
   * Only the saved list passes it, and only for a record that carries the
   * stamp: a list written before v3 slice 4 is a list of bare ids, and a
   * date nobody recorded is not printed (`lib/wishlist.ts`).
   */
  savedAt?: string;
  /**
   * Open the size sheet with this size already chosen — the device's "Size
   * ghi nhớ". The sheet says so in as many words; a size that appears
   * selected without explanation is a size somebody adds by accident.
   */
  preselectSize?: Size;
}

/**
 * The product card, v3: a photo, a line of contents, a count, one button.
 *
 * The CONTENTS LINE is the card's whole idea — the style name, a dotted
 * leader, the price, exactly as a table of contents sets an entry against a
 * page number. It is why the grid reads as an index of this issue rather
 * than as a shelf of tiles.
 *
 * Under it, the one fact PRODUCT.md counts as content rather than warning:
 * how many are left, and which sizes have gone. It is never silent — a
 * count that only appears when stock is low teaches a shopper to read its
 * absence as "plenty", which is not something this shop can promise.
 *
 * Size and colour are not on the card. They live in the sheet the button
 * opens.
 */
export function ProductCard({
  product,
  kindCount = false,
  closed = false,
  onAdd,
  onUnsave,
  savedAt,
  preselectSize,
}: ProductCardProps) {
  const { add } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sold = isSoldOut(product);
  const quiet = sold || closed;
  const left = onHand(product);
  const gone = soldOutSizes(product);
  const here = SIZES.filter((z) => onHandBySize(product, z) > 0);
  const href = `/products/${product.slug}`;

  return (
    <>
      <div className={`card3${sold ? " sold" : ""}`}>
        <div className="imgbox">
          <Link className="img" href={href}>
            <Image
              src={photoUrl(product.photoKeys[0]!, 520)}
              alt={`${product.name} — màu ${COLORS[product.colors[0]!].label}`}
              width={520}
              height={650}
            />
          </Link>
          {/* The one English phrase on a shopper-facing screen, and only as
              a stamp on a photo: streetwear's own convention, settled
              22/09/2026. In a sentence the shop still says "đã hết". */}
          {sold && <span className="stamp">SOLD OUT</span>}
          {onUnsave && <UnsaveButton product={product} onPress={onUnsave} />}
        </div>

        <Link className="meta" href={href}>
          <span className="toc">
            <span className="n">{product.name}</span>
            <span className="ld" aria-hidden="true" />
            <span className="p">{vnd(product.priceVnd)}</span>
          </span>
          <span className="ct">
            {quiet ? (
              /* Once a style is over, how much of the cut went is the only
                 stock fact left worth printing — and it is the one that
                 makes an issue legible: 14 cut, 14 gone, nothing coming. */
              <span>
                {soldUnits(product)} / {product.cutUnits} đã bán
                {savedAt && ` · lưu ${dayMonth(savedAt)}`}
              </span>
            ) : (
              <>
                <span className={left <= LOW_STOCK_AT ? "low" : undefined}>còn {left}</span>
                <span>
                  {kindCount ? (
                    `· ${kindInSentence(product.kind)}`
                  ) : gone.length > 0 ? (
                    <>
                      · hết{" "}
                      {gone.map((z, i) => (
                        <span key={z}>
                          {i > 0 && " "}
                          <s>{z}</s>
                        </span>
                      ))}
                    </>
                  ) : (
                    `· ${here.join(" ")}`
                  )}
                  {savedAt && ` · lưu ${dayMonth(savedAt)}`}
                </span>
              </>
            )}
          </span>
        </Link>

        {/* Three cards, one row height. A style with nothing to add to a
            cart — sold out, or standing in an issue that has closed — keeps
            a control in the same 40px box, quieter, pointing at the page
            that still has something to say. Without it the row had a hole
            in it where one card's button should be (L11). */}
        {!quiet && (
          <div className="act">
            <button type="button" className="addbtn3" onClick={() => setSheetOpen(true)}>
              <Icon name="bag" className="ic sm" />
              Thêm vào giỏ
            </button>
          </div>
        )}

        {quiet && (
          <div className="act">
            <Link className="addbtn3 view" href={href}>
              <Icon name="eye" className="ic sm" />
              Xem chi tiết
            </Link>
          </div>
        )}
      </div>

      {sheetOpen && (
        <SizeSheet
          product={product}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          initialColor={product.colors[0]!}
          {...(preselectSize ? { initialSize: preselectSize } : {})}
          onAdd={({ size, color }) => {
            setSheetOpen(false);
            // The button says "Thêm vào giỏ", so the line goes in the cart
            // here — every grid in the app renders this card, and only two
            // of them used to pass a handler that did the adding.
            add({ productId: product.id, size, color, qty: 1 });
            // The sheet closes on the way out, so the confirmation cannot
            // live on the control that started it. It says what went in,
            // because by now the shopper is looking at the grid again.
            setToast(`Đã thêm ${product.name} size ${size} vào giỏ`);
            onAdd?.({ product, size, color });
          }}
        />
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

/**
 * Take this style off the saved list.
 *
 * It sits ON the plate, not under the card, because that leaves the card
 * exactly the card the rest of the site ships — one button in its action
 * row — and because the plate is where the style was saved in the first
 * place. A slashed heart rather than a solid one: on this screen everything
 * is already saved, so state is not news; what the button needs to say is
 * what pressing it DOES.
 *
 * No `aria-pressed`. On the product page the heart really is a toggle and
 * carries it, but here the card leaves the page when this is pressed —
 * there is no "off" state to report, so it is an action, and the label
 * names the action.
 */
function UnsaveButton({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <button
      type="button"
      className="unsave"
      aria-label={`Bỏ ${product.name} khỏi danh sách đã lưu`}
      onClick={onPress}
    >
      <Icon name="heart-slash" bulk className="ic sm" />
    </button>
  );
}
