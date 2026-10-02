import Image from "next/image";
import { useLocale } from "@/components/i18n/LocaleContext";
import { COLORS } from "@/data/colors";
import type { Order, OrderLine, OrderState, Product } from "@/data/types";
import { feedStateLabel, linePicture, orderSteps, stepStamp, tileLabel } from "@/lib/feed-account";
import { picker } from "@/lib/i18n";
import { isFixed } from "@/lib/inventory";
import { nameLang, productText } from "@/lib/product-text";
import { FeedIcon, type FeedIconName } from "../icon/FeedIcon";
import { cx } from "../useReveal";

/*
 * What the orders list, one order and Tôi share (`account.js`): the state as a
 * chip, the journey as story bars, and a piece as a tile.
 */

/**
 * The order's four steps as Feed's story bars (`steps`): done, now (half), to
 * come, or off; each passed step with the time the order recorded for it.
 * On one order's page, on Tôi's card for the parcel on its way, and on the
 * guest lookup's result (slice 4a), whose order has only these fields of
 * its own to read (`LookedUpOrder`). In the page's language since round v6
 * slice E2, for the lookup ("Ordered", "Payment", "Dispatch", "Delivered").
 * Every screen that draws it is a client component.
 */
export function OrderSteps({ order }: { order: Pick<Order, "status" | "placedAt" | "payment" | "moments"> }) {
  const locale = useLocale();
  return (
    <ol className="osteps" aria-label={picker(locale)({ vi: "Hành trình", en: "Order progress" })}>
      {orderSteps(order, locale).map((step, i) => (
        <li
          key={i}
          className={cx(
            "ostep",
            step.state === "done" && "is-done",
            step.state === "now" && "is-now",
            step.state === "off" && "is-off",
          )}
          aria-current={step.state === "now" ? "step" : undefined}
        >
          <div className="ostep-bar" aria-hidden="true">
            <i />
          </div>
          <p className="ostep-label">{step.label}</p>
          {step.at && <p className="ostep-at">{stepStamp(step.at, locale)}</p>}
        </li>
      ))}
    </ol>
  );
}

/** Each state's glyph (`ST_ICON`). */
const STATE_ICON: Readonly<Record<OrderState, FeedIconName>> = {
  AWAITING_TRANSFER: "hourglass-medium",
  RECEIVED: "hourglass-medium",
  PAID: "check-circle",
  SHIPPING: "truck",
  DELIVERED: "package",
  CANCELLED: "x",
};

/**
 * The state in words with its glyph (`statusChip`); blue while a transfer is
 * awaited, the one state that asks for the shopper. In the page's language
 * since round v6 slice E3a (`feedStateLabel`).
 */
export function StatusChip({ state }: { state: OrderState }) {
  const locale = useLocale();
  return (
    <span className={cx("st-chip", state === "AWAITING_TRANSFER" && "is-act")}>
      <FeedIcon name={STATE_ICON[state]} />
      {feedStateLabel(state, locale)}
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
 * a swatch. In the page's language since round v6 slice E3a: the name through
 * `productText` (a drop style's Vietnamese one marked `lang="vi"` where it is
 * set in type), the screen reader's name through `tileLabel`.
 */
export function Tile({ line, product, size, alt = false, qty = true, named = true }: TileProps) {
  const locale = useLocale();
  const name = product ? productText(product, locale).name : "—";
  const src = linePicture(product, line.color);
  const label = tileLabel(name, line.color, line.size, line.qty, locale);
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
      <span className="tile-name" lang={product ? nameLang(product, locale) : undefined}>
        {name}
      </span>
      {count}
    </span>
  );
}
