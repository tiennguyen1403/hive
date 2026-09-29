import Image from "next/image";
import { COLORS } from "@/data/colors";
import type { OrderLine, OrderState, Product } from "@/data/types";
import { FEED_STATE_LABEL, linePicture, tileLabel } from "@/lib/feed-account";
import { isFixed } from "@/lib/inventory";
import { FeedIcon, type FeedIconName } from "../icon/FeedIcon";
import { cx } from "../useReveal";

/*
 * What the orders list and one order share (`account.js`): the state as a
 * chip, and a piece as a tile.
 */

/** Each state's glyph (`ST_ICON`). */
const STATE_ICON: Readonly<Record<OrderState, FeedIconName>> = {
  AWAITING_TRANSFER: "hourglass-medium",
  RECEIVED: "hourglass-medium",
  PAID: "check-circle",
  SHIPPING: "truck",
  DELIVERED: "package",
  CANCELLED: "x",
};

/** The state in words with its glyph (`statusChip`); blue while a transfer is awaited, the one state that asks for the shopper. */
export function StatusChip({ state }: { state: OrderState }) {
  return (
    <span className={cx("st-chip", state === "AWAITING_TRANSFER" && "is-act")}>
      <FeedIcon name={STATE_ICON[state]} />
      {FEED_STATE_LABEL[state]}
    </span>
  );
}

interface TileProps {
  line: OrderLine;
  /** The style, from the catalogue; missing for a style the catalogue no longer has. */
  product: Product | undefined;
  /** "lg": the order page's size. */
  size?: "lg";
  /** Named for a screen reader (the ticket's tiles); decoration where the name is printed beside it. */
  alt?: boolean;
  /** "×2" on the tile (the ticket's); the order page prints the count beside the name. */
  qty?: boolean;
  /** A style without a picture sets its name in type; beside its own name it is its colour alone (`named: false`). */
  named?: boolean;
}

/**
 * A piece as a tile (`tile`): its photo, a fixed style's flat drawing, or —
 * for a style whose frame is only borrowed (Số 03, Số 04) — its name in the
 * display face with its colour as a dot; beside its own name, that colour as
 * a swatch.
 */
export function Tile({ line, product, size, alt = false, qty = true, named = true }: TileProps) {
  const name = product?.name ?? "—";
  const src = linePicture(product, line.color);
  const label = tileLabel(name, line.color, line.size, line.qty);
  const count = qty && line.qty > 1 ? <span className="tile-qty">×{line.qty}</span> : null;
  const box = cx("tile", size);
  const a11y = alt ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };

  if (src) {
    return (
      <span className={cx(box, product && isFixed(product) && "flat")}>
        <Image src={src} width={120} height={150} sizes={size === "lg" ? "76px" : "44px"} alt={alt ? label : ""} />
        {count}
      </span>
    );
  }
  const hex = COLORS[line.color]?.hex;
  if (!named) {
    return (
      <span className={cx(box, "swatch-tile")} style={{ background: hex }} {...a11y}>
        {count}
      </span>
    );
  }
  return (
    <span className={cx(box, "type")} {...a11y}>
      <span className="tile-dot" style={{ background: hex }} />
      <span className="tile-name">{name}</span>
      {count}
    </span>
  );
}
