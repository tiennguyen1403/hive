"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

/**
 * "Không tìm thấy đơn DH-…" (`order.js`, an unknown id): the code the
 * address asked for, with the two ways on — the account's orders and the
 * guest lookup. One sentence for an order that does not exist and for
 * somebody else's (QĐ-16).
 *
 * Drawn by the order segment's `not-found.tsx` (round v4 slice 3b), which
 * Next hands no props: the code comes from the route's own params, read here
 * (`useParams`), and upper-cased as the page reads it.
 */
export function OrderMissing() {
  const params = useParams<{ code: string }>();
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = (raw ?? "").trim().toUpperCase();
  return (
    <div className="nf">
      <h1 className="nf-title disp">Không tìm thấy đơn{code ? ` ${code}` : ""}</h1>
      <div className="nf-acts">
        <Link className="btn btn-blue" href="/account/orders">
          Xem đơn hàng
        </Link>
        <Link className="btn btn-line" href="/track">
          Tra cứu đơn
        </Link>
      </div>
    </div>
  );
}
