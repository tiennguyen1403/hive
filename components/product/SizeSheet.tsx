"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { COLORS } from "@/data/catalog";
import type { ColorKey, Product, Size } from "@/data/types";
import { onHandByColor, onHandOf } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";
import { SizeTable } from "./SizeTable";

interface SizeSheetProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  /** Which colourway the card was showing. */
  initialColor?: ColorKey;
  /**
   * The device's remembered size, chosen already — "Size ghi nhớ".
   *
   * Only where the screen that opened the sheet says so underneath (the
   * saved list does). A size that arrives selected with no explanation is a
   * size somebody adds to a basket by accident, and it is ignored outright
   * when that size has gone in this colourway.
   */
  initialSize?: Size;
  onAdd: (choice: { size: Size; color: ColorKey }) => void;
}

/**
 * The sheet the card's button opens.
 *
 * The button never guesses a size. This is the only surface wide enough to
 * say how many are left in EACH size, and it repeats back the colourway the
 * card was showing — which is why colour is allowed to leave the card at all.
 *
 * Counts are per size AND per colour, which is the whole reason the catalog
 * was reshaped at seed time: the head says "· Đen" and every number under it
 * is the black one, so "hết XL" here means "hết XL màu đen" and is true.
 *
 * There is no colour picker in v3 (`prototype/v3/products.html`, `#sizesheet`).
 * The card shows one photo and this sheet sells that photo; choosing a
 * different colourway is a decision with its own screen, and the "Bảng số đo"
 * link and the style name both lead to it.
 */
export function SizeSheet({
  product,
  open,
  onClose,
  initialColor,
  initialSize,
  onAdd,
}: SizeSheetProps) {
  const color = initialColor ?? product.colors[0]!;
  const remembered =
    initialSize && onHandOf(product, color, initialSize) > 0 ? initialSize : null;
  const [size, setSize] = useState<Size | null>(remembered);

  const left = onHandByColor(product, color);
  const photoIndex = Math.max(0, product.colors.indexOf(color));

  return (
    <Sheet open={open} onClose={onClose} label={`Chọn size — ${product.name}`}>
      <div className="grab" />

      <div className="shead">
        <Image
          src={photoUrl(product.photoKeys[photoIndex] ?? product.photoKeys[0]!, 260)}
          alt=""
          width={56}
          height={70}
        />
        <div>
          <h2>{product.name}</h2>
          <div className="muted">
            {product.kind} · {COLORS[color].label}
          </div>
          <div className="p">{vnd(product.priceVnd)}</div>
        </div>
        <button type="button" className="x" aria-label="Đóng" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>

      <div className="fld">
        <div className="lbl">
          <b>Size</b>
          <span>còn {left}</span>
          {/* The guide lives on the product page, which is also where the
              colourways are. A link, so it opens the sheet that page opens
              on `#size` rather than promising a layer this one cannot draw. */}
          <Link className="lnk" href={`/products/${product.slug}#size`}>
            Bảng số đo
          </Link>
        </div>
        <SizeTable
          product={product}
          color={color}
          value={size}
          onPick={setSize}
          label={`Chọn size ${product.name}`}
        />
        {remembered && (
          <p className="fine3">
            Size {remembered} chọn sẵn theo “Size ghi nhớ” của thiết bị này.
          </p>
        )}
      </div>

      <div className="sact">
        {/* No icon until there is an action to name. An icon on a button
            nobody can press is decoration, and the button already reads as
            unavailable. */}
        <button
          type="button"
          className="btn"
          disabled={!size}
          onClick={() => size && onAdd({ size, color })}
        >
          {size && <Icon name="bag" className="ic sm" />}
          {size ? `Thêm size ${size} vào giỏ` : "Chọn size"}
        </button>
      </div>
    </Sheet>
  );
}
