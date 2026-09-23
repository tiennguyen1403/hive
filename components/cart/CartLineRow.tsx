"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon/Icon";
import { COLORS } from "@/data/catalog";
import type { Size } from "@/data/types";
import { swapSizesFor, type ResolvedLine } from "@/lib/cart";
import { issueLabel } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";

interface CartLineRowProps {
  line: ResolvedLine;
  onQty: (qty: number) => void;
  onRemove: () => void;
  onSwap: (size: Size) => void;
  /** Move the whole line to "Giữ lại sau", size and colour intact. */
  onKeep: () => void;
  /** The screen owns one toast; every row speaks through it. */
  onToast: (message: string) => void;
}

/**
 * One line of the cart.
 *
 * A grid of three columns — photo, what it is, money — with the controls and
 * the stock line running under the middle two. The eye reads name → price,
 * then colour and size, then how many, and the shelf's answer last.
 *
 * Two rules it has to keep:
 *
 * 1. **The stepper stops at what the issue cut.** Pressing + past the last
 *    piece does not raise the number and does not quietly correct it either:
 *    it says how many are left. A cut is made once — typing 99 does not sew
 *    more shirts.
 * 2. **A line that cannot be bought does not disappear and does not ride
 *    along in the total.** It stays, says why, and offers the way out. The
 *    stepper goes with it: stepping the count of something unbuyable is a
 *    control that does nothing.
 */
export function CartLineRow({
  line,
  onQty,
  onRemove,
  onSwap,
  onKeep,
  onToast,
}: CartLineRowProps) {
  const { product, issue, available } = line;
  const { size, color, qty } = line.line;
  const [typed, setTyped] = useState(String(qty));

  // The field is typed into as well as stepped, so it holds its own string
  // and only resyncs when the quantity changes from OUTSIDE — a stepper
  // tap, a clamp, another tab. Mirroring `qty` on every render would snap a
  // half-typed number back under the shopper's hands.
  //
  // Adjusting state during render rather than in an effect: React re-runs
  // this component immediately with the new value and never commits the
  // stale one, so the box is never painted wrong.
  const [syncedQty, setSyncedQty] = useState(qty);
  if (syncedQty !== qty) {
    setSyncedQty(qty);
    setTyped(String(qty));
  }

  const colour = COLORS[color];
  const where = `size ${size} màu ${colour.label}`;
  /** What the shelf says when somebody asks for one more than there is. */
  const capMessage =
    available === 1 ? `Chiếc cuối ${where}` : `Chỉ còn ${available} chiếc ${where}`;

  function commit(raw: string) {
    const n = Number(raw.replace(/\D/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setTyped(String(qty));
      return;
    }
    if (n > available) onToast(capMessage);
    onQty(n);
    setTyped(String(Math.min(n, available)));
  }

  function step(to: number) {
    if (to > available) {
      onToast(capMessage);
      return;
    }
    onQty(to);
  }

  return (
    <div className={issue ? "cartline3 snag" : "cartline3"}>
      <span className="thumb">
        <Image
          src={photoUrl(
            product.photoKeys[product.colors.indexOf(color)] ?? product.photoKeys[0]!,
            150,
            60,
          )}
          alt=""
          width={150}
          height={188}
        />
      </span>

      <div className="n">
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
      </div>
      <div className="p">{vnd(line.lineTotalVnd)}</div>

      {/* The colourway is named in words AND shown as a swatch. On a line
          about to be paid for, "Đen · size M" is the thing being checked,
          and a swatch is read faster than a word. */}
      <div className="kind">
        {product.kind} ·{" "}
        <span className="nw">
          <i style={{ background: colour.hex }} aria-hidden="true" />
          {colour.label}
        </span>{" "}
        · size {size}
      </div>

      {issue ? (
        <div className="fixes">
          {issue.kind === "SHORT" && (
            <button type="button" className="lnk" onClick={() => onQty(issue.available)}>
              Lấy {issue.available} chiếc
            </button>
          )}
          {issue.kind === "SOLD_OUT" &&
            swapSizesFor(line.line)
              .slice(0, 2)
              .map((s) => (
                <button key={s} type="button" className="lnk" onClick={() => onSwap(s)}>
                  Đổi sang size {s}
                </button>
              ))}
          <button type="button" className="lnk" onClick={onRemove}>
            Bỏ khỏi giỏ
          </button>
        </div>
      ) : (
        <div className="ctl">
          <div className="qty3" aria-label={`Số lượng ${product.name}`}>
            <button
              type="button"
              aria-label="Bớt một"
              disabled={qty <= 1}
              onClick={() => onQty(qty - 1)}
            >
              <Icon name="minus" className="ic sm" />
            </button>
            {/* The 44px target around the box — an `<input>` is a replaced
                element and carries no `::after` of its own. */}
            <label className="qntap">
              <input
                type="text"
                inputMode="numeric"
                data-qty={line.key}
                aria-label={`Số lượng ${product.name} size ${size}`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onBlur={(e) => commit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
                }}
              />
            </label>
            {/* Not disabled at the last piece: the shopper pressing it is
                asking a question, and the answer is how many are left. */}
            <button type="button" aria-label="Thêm một" onClick={() => step(qty + 1)}>
              <Icon name="plus" className="ic sm" />
            </button>
          </div>

          <div className="acts">
            <button type="button" className="lnk" onClick={onKeep}>
              Giữ lại sau
            </button>
            <button type="button" className="lnk" onClick={onRemove}>
              Bỏ
            </button>
          </div>
        </div>
      )}

      {/* One line, always: what is left in this exact size and colour, or
          what went wrong with it. */}
      <div className={stockTone(line)}>{stockLine(line)}</div>
    </div>
  );
}

/** The last line of the row is quiet information or a red fact, never both. */
function stockTone(line: ResolvedLine): string {
  return line.issue || line.available <= 1 ? "stockline hot" : "stockline";
}

function stockLine(line: ResolvedLine): string {
  const { size, color, qty } = line.line;
  const where = `size ${size} màu ${COLORS[color].label}`;

  if (line.issue) {
    switch (line.issue.kind) {
      case "SOLD_OUT":
        return `hết ${where} — có người chốt trước`;
      case "SHORT":
        return `chỉ còn ${line.issue.available} chiếc ${where}, đang đặt ${qty}`;
      case "DROP_CLOSED":
        return `${issueLabel(line.issue.dropNo)} đã đóng`;
    }
  }
  return line.available === 1
    ? `chiếc cuối ${where} · giỏ không giữ hàng`
    : `còn ${line.available} chiếc ${where}`;
}
