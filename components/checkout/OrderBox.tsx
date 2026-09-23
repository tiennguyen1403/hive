"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/icon/Icon";
import { COLORS } from "@/data/catalog";
import type { ResolvedLine } from "@/lib/cart";
import { vnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";
import type { CheckoutTotals } from "@/lib/shipping";

interface OrderBoxProps {
  lines: ResolvedLine[];
  units: number;
  totals: CheckoutTotals;
  /** The code on the basket, for the row that names what it took off. */
  promoCode?: string | undefined;
}

/**
 * "Đơn gồm 2 món" — what is being paid for, on the page that takes the
 * money.
 *
 * A `<details>`, and the browser's own one: it is a disclosure, it has to
 * work before hydration, and the element that exists for this does it
 * without a line of state. On the phone it starts closed, because the list
 * would push the form under the fold; from 900px it starts open, where the
 * column beside the form is empty anyway.
 *
 * The open-by-default is done here rather than in CSS on purpose. `details`
 * hides its own content through the UA stylesheet — in current Chrome with
 * `content-visibility`, not `display` — so no rule in `checkout.css` can
 * force it open without fighting the browser for the right reason.
 */
export function OrderBox({ lines, units, totals, promoCode }: OrderBoxProps) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const wide = window.matchMedia("(min-width:900px)");
    const apply = () => {
      if (ref.current) ref.current.open = wide.matches;
    };
    apply();
    wide.addEventListener("change", apply);
    return () => wide.removeEventListener("change", apply);
  }, []);

  return (
    <details className="orderbox3" ref={ref}>
      <summary>
        <span>Đơn gồm {units} món</span>
        <span className="amt">
          {vnd(totals.totalVnd)}
          <Icon name="down" className="ic sm" />
        </span>
      </summary>

      <div className="lines">
        {lines.map((l, i) => (
          <div className={i === 0 ? "ol first" : "ol"} key={l.key}>
            <span className="thumb">
              <Image
                src={photoUrl(
                  l.product.photoKeys[l.product.colors.indexOf(l.line.color)] ??
                    l.product.photoKeys[0]!,
                  120,
                  60,
                )}
                alt=""
                width={120}
                height={150}
              />
            </span>
            <span className="g">
              <b>{l.product.name}</b>
              <span>
                {COLORS[l.line.color].label} · {l.line.size} · ×{l.line.qty}
              </span>
            </span>
            <span className="p">{vnd(l.lineTotalVnd)}</span>
          </div>
        ))}
      </div>

      <div className="sum3">
        <div className="r">
          <span>Tạm tính</span>
          <span>{vnd(totals.subtotalVnd)}</span>
        </div>
        {totals.discountVnd > 0 && (
          <div className="r">
            <span>Giảm giá{promoCode ? ` · ${promoCode}` : ""}</span>
            <span>−{vnd(totals.discountVnd)}</span>
          </div>
        )}
        <div className="r">
          <span>Phí giao</span>
          <span>
            {totals.shippingFeeVnd === 0 ? "Miễn phí" : vnd(totals.shippingFeeVnd)}
          </span>
        </div>
        {totals.codFeeVnd > 0 && (
          <div className="r">
            <span>Phí thu hộ</span>
            <span>{vnd(totals.codFeeVnd)}</span>
          </div>
        )}
        <div className="r total">
          <span>Tổng</span>
          <b>{vnd(totals.totalVnd)}</b>
        </div>
      </div>
    </details>
  );
}
