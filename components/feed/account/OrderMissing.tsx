"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleContext";
import { picker } from "@/lib/i18n";

/**
 * "Không tìm thấy đơn DH-…" (`order.js`, an unknown id): the code the
 * address asked for, with the two ways on — the account's orders and the
 * guest lookup. One sentence for an order that does not exist and for
 * somebody else's (QĐ-16).
 *
 * Drawn by the order segment's `not-found.tsx` (round v4 slice 3b), which
 * Next hands no props: the code comes from the route's own params, read here
 * (`useParams`), and upper-cased as the page reads it. In English (round v6
 * slice E3a) "Order DH-… not found", "View orders", "Track an order".
 */
export function OrderMissing() {
  const params = useParams<{ code: string }>();
  const t = picker(useLocale());
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = (raw ?? "").trim().toUpperCase();
  return (
    <div className="nf">
      <h1 className="nf-title disp">
        {t<React.ReactNode>({
          vi: <>Không tìm thấy đơn{code ? ` ${code}` : ""}</>,
          en: code ? `Order ${code} not found` : "Order not found",
        })}
      </h1>
      <div className="nf-acts">
        <Link className="btn btn-blue" href="/account/orders">
          {t({ vi: "Xem đơn hàng", en: "View orders" })}
        </Link>
        <Link className="btn btn-line" href="/track">
          {t({ vi: "Tra cứu đơn", en: "Track an order" })}
        </Link>
      </div>
    </div>
  );
}
