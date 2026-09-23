"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/icon/Icon";
import { Button } from "@/components/ui/Button";
import { useCart } from "./CartContext";
import type { Promotion } from "@/data/types";
import { vnd } from "@/lib/money";
import { useCatalog } from "@/components/shop/CatalogContext";
import { checkPromoCode, promoAppliedMessage, promoOfferLabel } from "@/lib/promotions";

interface PromoBoxProps {
  /** The code currently on the basket, already revalidated by the caller. */
  promo: Promotion | undefined;
  /** What that code is worth HERE — the rule's own arithmetic, not a guess. */
  discountVnd: number;
  subtotalVnd: number;
  shippingFeeVnd: number;
  /** The screen owns one toast. */
  onToast: (message: string) => void;
}

/**
 * The discount code field — the same one on the cart and on checkout.
 *
 * One component, because the two screens apply the same codes to the same
 * basket and keep the result in the same place. Two copies of this would be
 * two chances for "Áp dụng" to mean something slightly different.
 *
 * A refusal names the problem: which code, and what about it
 * (`lib/promotions.ts`). "Mã không hợp lệ" leaves the shopper retyping a
 * code that was never going to work — and half of these fail for a reason
 * they can act on, like a minimum they are 90.000₫ short of.
 *
 * An applied code becomes a dashed chip carrying what it is worth and the
 * way to take it back off. The field STAYS above it, as the mock draws it:
 * only one code applies at a time, and typing another replaces this one
 * rather than being refused for a reason nobody would guess.
 */
export function PromoBox({
  promo,
  discountVnd,
  subtotalVnd,
  shippingFeeVnd,
  onToast,
}: PromoBoxProps) {
  const catalog = useCatalog();
  const { promoCode, setPromoCode } = useCart();
  const id = useId();
  const [typed, setTyped] = useState("");
  const [refused, setRefused] = useState<string | null>(null);

  function apply() {
    const check = checkPromoCode(catalog, typed, subtotalVnd);
    if (!check.ok) {
      setRefused(check.message);
      return;
    }
    setRefused(null);
    setTyped("");
    setPromoCode(check.promo.code);
    onToast(promoAppliedMessage(check.promo, subtotalVnd, shippingFeeVnd));
  }

  function drop() {
    setPromoCode(null);
    setRefused(null);
    onToast("Đã bỏ mã giảm giá");
  }

  // A code applied to a bigger basket and then left behind when a line came
  // out still belongs to the cart — but it is worth nothing, and the screen
  // has to say which of those two things is true rather than silently
  // dropping it or silently keeping it.
  const stale = promoCode && !promo ? checkPromoCode(catalog, promoCode, subtotalVnd) : null;

  return (
    <div className="field3">
      <label className="lbl" htmlFor={id}>
        Mã giảm giá
      </label>
      <div className="promo3">
        <input
          id={id}
          className="inp"
          type="text"
          placeholder="Nhập mã"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            if (refused) setRefused(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
        />
        <Button tone="ink" icon="tag" onClick={apply}>
          Áp dụng
        </Button>
      </div>

      {promoCode && (
        <div className="promoon3">
          <Icon name="tag" className="ic sm" />
          <b>{promoCode}</b>
          <span>
            {promo
              ? `${promoOfferLabel(promo)}${
                  promo.minOrderVnd !== undefined
                    ? ` · đơn từ ${vnd(promo.minOrderVnd)}`
                    : ""
                }${discountVnd === 0 ? " · đơn này không giảm thêm" : ""}`
              : "chưa áp dụng cho giỏ này"}
          </span>
          <button type="button" className="lnk" onClick={drop}>
            Bỏ mã
          </button>
        </div>
      )}

      {(refused || (stale && !stale.ok)) && (
        <p className="note3 hot" role="alert">
          <Icon name="danger" className="ic sm" />
          <span>{refused ?? (stale && !stale.ok ? stale.message : "")}</span>
        </p>
      )}
    </div>
  );
}
