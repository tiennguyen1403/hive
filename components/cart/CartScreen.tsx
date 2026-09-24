"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon/Icon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Empty } from "@/components/shop/Empty";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { Steps } from "@/components/shop/Steps";
import { Toast } from "@/components/shop/Toast";
import { useCart } from "./CartContext";
import { CartLineRow } from "./CartLineRow";
import { LaterList } from "./LaterList";
import { useLater } from "./later";
import { PromoBox } from "./PromoBox";
import { ShipBar } from "./ShipBar";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS } from "@/data/colors";
import type { Size } from "@/data/types";
import {
  buyableUnits,
  cartSubtotalVnd,
  cartUnits,
  hasBlockingIssue,
  resolveCart,
  type ResolvedLine,
} from "@/lib/cart";
import { clockDayLabel, toVnIso } from "@/lib/datetime";
import { closesInLabel, dropState, getDrop, wayToShop } from "@/lib/drop";
import { resolveLater, type ResolvedLaterLine } from "@/lib/later";
import { LEX, issueLabel, issueNo, styleName } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { TRANSFER_HOLD_HOURS } from "@/lib/orders";
import { appliedPromo } from "@/lib/promotions";
import {
  RETURN_WINDOW_DAYS,
  checkoutTotals,
  deliveryOption,
  deliveryWindowLabel,
} from "@/lib/shipping";
import { demoNow } from "@/lib/clock";

interface CartScreenProps {
  /**
   * The issue the empty cart's sentence names: the one selling, else the
   * last one that closed (see `app/cart/page.tsx`).
   */
  dropNo: number;
  dropClosesAt: string;
  dropIsOpen: boolean;
}

/**
 * The cart.
 *
 * Its one hard rule: a line that cannot be bought does not silently
 * disappear and does not silently ride along in the total. It stays, it says
 * why, it offers the way out, and it holds the checkout button shut until it
 * is dealt with. "Giỏ không giữ hàng" is printed on this screen — this is
 * what that sentence costs on the day it comes true.
 *
 * From 900px the same blocks become two columns (`.two3`): the goods on the
 * left, the money sticky on the right. The order of the markup is the phone
 * order, so nothing moves in the reading order to get there.
 */
export function CartScreen({ dropNo, dropClosesAt, dropIsOpen }: CartScreenProps) {
  const catalog = useCatalog();
  const { cart, ready, add, setQty, remove, promoCode } = useCart();
  const { list, ready: laterReady, keep, drop: dropLater } = useLater();
  const [toast, setToast] = useState<string | null>(null);

  // One instant for the whole render, so every line is judged against the
  // same clock rather than each against its own. Safe from the hydration
  // problem a clock usually brings: nothing below `ready` is server-rendered.
  const now = useMemo(() => demoNow(), [cart]);
  const { lines } = resolveCart(catalog, now, cart);

  const subtotalVnd = cartSubtotalVnd(lines);
  const blocked = hasBlockingIssue(lines);
  const buyable = buyableUnits(lines);
  const promo = appliedPromo(catalog, promoCode, subtotalVnd, now);
  const totals = checkoutTotals({
    subtotalVnd,
    delivery: "STANDARD",
    payment: "BANK_TRANSFER",
    ...(promo ? { promo } : {}),
  });
  const [leadFrom, leadTo] = deliveryOption("STANDARD").leadDays;
  const later = resolveLater(catalog, list);

  // The way back into the shop (v3 slice 11): the issue selling now, on its
  // own page — "Về số 05" — or every style on sale when none is.
  const way = wayToShop(catalog, now);
  const wayLabel = (verb: string) =>
    way.issueNo !== null ? `${verb} ${LEX.tl} ${issueNo(way.issueNo)}` : "Xem tất cả mẫu";

  // Which issue the lines in the bag belong to, for the line under "Giỏ": a
  // bag of fixed styles only is sold at any hour and names no issue.
  const bagIssue = lines.find((l) => l.product.dropNo !== null)?.product.dropNo ?? null;
  const bagDrop = bagIssue === null ? undefined : getDrop(catalog, bagIssue);

  /** Swap a blocked line to a size the same colourway still has. */
  function swap(line: ResolvedLine, size: Size) {
    remove(line.key);
    add({ ...line.line, size, qty: line.line.qty });
  }

  /**
   * Out of the basket, into "Giữ lại sau" — with the size and colour, which
   * is the whole reason this is not the wishlist. The quantity goes back to
   * one: the list holds a choice, not a count.
   */
  function keepForLater(line: ResolvedLine) {
    keep({
      productId: line.line.productId,
      size: line.line.size,
      color: line.line.color,
    });
    remove(line.key);
    setToast(
      `Đã chuyển ${styleName(line.product.name, line.product.dropNo)} sang Giữ lại sau · giữ size ${line.line.size}`,
    );
  }

  /** Back into the basket, one piece. `addToCart` clamps to what is left. */
  function bringBack(item: ResolvedLaterLine) {
    add({ ...item.line, qty: 1 });
    dropLater(item.key);
    setToast(
      `Đã đưa ${styleName(item.product.name, item.product.dropNo)} size ${item.line.size} màu ${
        COLORS[item.line.color].label
      } vào giỏ`,
    );
  }

  // Before storage has been read an empty cart is only a guess. Telling
  // someone their cart is empty when it is not is a lie they might act on,
  // even if it lasts one paint.
  if (!ready || !laterReady) {
    return (
      <ShopFrame>
        <div className="wrap3">
          <div className="pghead">
            <h1>Giỏ</h1>
            <span className="meta">đang mở giỏ…</span>
          </div>
        </div>
      </ShopFrame>
    );
  }

  const laterBlock = (
    <LaterList
      items={later.items}
      onAdd={bringBack}
      onRemove={(key) => {
        dropLater(key);
        setToast("Đã bỏ khỏi Giữ lại sau");
      }}
    />
  );

  if (cart.length === 0) {
    return (
      <ShopFrame>
        <div className="wrap3">
          <Steps at={0} />
          <Empty
            icon="bag"
            title="Giỏ trống"
            text={
              dropIsOpen
                ? `Chưa có món nào. ${issueLabel(dropNo)} đang bán tới ${clockDayLabel(
                    dropClosesAt,
                  )}.`
                : `Chưa có món nào. ${issueLabel(dropNo)} đã đóng.`
            }
            action={
              <ButtonLink icon="grid" href={way.href}>
                {wayLabel("Xem")}
              </ButtonLink>
            }
          />
          {laterBlock}
        </div>
        <Toast message={toast} onDone={() => setToast(null)} />
      </ShopFrame>
    );
  }

  return (
    <ShopFrame>
      <div className="wrap3">
        <Steps at={0} />

        <div className="pghead">
          <h1>Giỏ</h1>
          <span className="meta">
            {cartUnits(cart)} món
            {bagIssue !== null &&
              ` · ${issueLabel(bagIssue)} · ${
                bagDrop && dropState(bagDrop, now) === "OPEN"
                  ? closesInLabel(bagDrop.closesAt, now)
                  : "đã đóng"
              }`}
          </span>
        </div>

        <div className="two3">
          <div>
            <ShipBar subtotalVnd={subtotalVnd} />

            <div className="cartlist">
              {lines.map((l) => (
                <CartLineRow
                  key={l.key}
                  line={l}
                  onQty={(q) => setQty(l.key, q)}
                  onRemove={() => {
                    remove(l.key);
                    setToast(`Đã bỏ ${styleName(l.product.name, l.product.dropNo)} khỏi giỏ`);
                  }}
                  onSwap={(size) => swap(l, size)}
                  onKeep={() => keepForLater(l)}
                  onToast={setToast}
                />
              ))}
            </div>

            <p className="fine3">
              <Link className="lnk tap" href={way.href}>
                {wayLabel("Về")}
              </Link>
            </p>

            {laterBlock}
          </div>

          <aside className="aside3">
            <PromoBox
              promo={promo}
              discountVnd={totals.discountVnd}
              subtotalVnd={subtotalVnd}
              shippingFeeVnd={totals.shippingFeeVnd}
              onToast={setToast}
            />

            <div className="sum3">
              <div className="r">
                <span>Tạm tính · {buyable} món</span>
                <span>{vnd(subtotalVnd)}</span>
              </div>
              {totals.discountVnd > 0 && (
                <div className="r">
                  <span>Giảm giá{promo ? ` · ${promo.code}` : ""}</span>
                  <span>−{vnd(totals.discountVnd)}</span>
                </div>
              )}
              <div className="r">
                <span>Phí giao</span>
                <span>
                  {totals.shippingFeeVnd === 0 ? "Miễn phí" : vnd(totals.shippingFeeVnd)}
                </span>
              </div>
              <div className="r">
                <span>Dự kiến nhận</span>
                <span>{deliveryWindowLabel("STANDARD", toVnIso(now))}</span>
              </div>
              {blocked && (
                <div className="r">
                  <span>Món đang vướng</span>
                  <span>chưa tính</span>
                </div>
              )}
              <div className="r total">
                <span>Tổng</span>
                <b>{vnd(totals.totalVnd)}</b>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {blocked || buyable === 0 ? (
                /* A button that cannot be pressed says what has to happen
                   instead, and drops the icon: the icon names an action, and
                   there is none to name yet. */
                <Button tone="wide" disabled>
                  Sửa giỏ trước
                </Button>
              ) : (
                <ButtonLink tone="wide" icon="card" href="/checkout">
                  Thanh toán · {vnd(totals.totalVnd)}
                </ButtonLink>
              )}
            </div>

            {/* Everything this order carries with it, from the modules that
                enforce it: the courier's window, the returns window, and the
                three ways to pay checkout actually offers. */}
            <div className="promises3">
              <span>
                <Icon name="truck" className="ic sm" />
                {leadFrom}–{leadTo} ngày
              </span>
              <span>
                <Icon name="refund" className="ic sm" />
                {`Đổi trả ${RETURN_WINDOW_DAYS} ngày`}
              </span>
              <span>
                <Icon name="card" className="ic sm" />
                Chuyển khoản · COD · Thẻ
              </span>
            </div>

            <p className="fine3">
              Giỏ không giữ hàng. Đơn đặt trước nhận trước. Chuyển khoản giữ hàng{" "}
              {TRANSFER_HOLD_HOURS} giờ.
            </p>
          </aside>
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </ShopFrame>
  );
}
