"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS } from "@/data/colors";
import { lineKey, resolveCart, type ResolvedLine } from "@/lib/cart";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { pictureOf } from "@/lib/feed";
import { canSwap, cartProblem, cartSummary, lowLeft, problemText } from "@/lib/feed-cart";
import { isFixed } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { FeedIcon } from "../icon/FeedIcon";
import { useFeedToast } from "../FeedToast";
import { useQuickAdd } from "../QuickAdd";
import { cx } from "../useReveal";

/**
 * The basket, round v4 "Feed" (slice 2): the approved mock's `cart.html` and
 * `cart.js`, over the one cart there is (`CartContext`, `lib/cart.ts`).
 *
 * · Each line: its picture, its name, colour and size, a stepper that stops
 *   at what is left of that choice, and "Xoá" — with "Hoàn tác" on the toast
 *   that follows, which puts the line back where it was.
 * · A line that cannot be bought says why in the error red, with its fix
 *   (`lib/feed-cart.ts`): the issue closed, the size gone — "Chọn size khác"
 *   opens the size sheet to swap it while the style still sells — or fewer
 *   left than asked for. Such a line is not in the money, and "Thanh toán"
 *   stays inactive while one is there.
 * · "Tóm tắt": what can be bought, delivered the standard way, and how far
 *   the basket is from free delivery. On the phone the pay bar sits above the
 *   tab bar; from 900px the summary is a sticky column with its own button.
 *
 * The cart lives in this browser: until it has been read, the page shows its
 * title and nothing it would have to take back — "Giỏ trống" included.
 */
export function CartView() {
  const catalog = useCatalog();
  const { cart, ready, setQty, remove, restore, swap } = useCart();
  const quick = useQuickAdd();
  const toast = useFeedToast();
  const root = useRef<HTMLDivElement>(null);
  // Where the focus goes once the next render is on screen (`cart.js`: `render(focusSel)`).
  const after = useRef<(() => void) | null>(null);

  // One instant for the whole basket, read again whenever it changes: a line can close under an open page.
  // Nothing here is server-rendered (the cart is read after mount), so the clock cannot upset a hydration.
  const now = useMemo(() => demoNow(), [cart]);
  const lines = resolveCart(catalog, now, cart).lines;

  useEffect(() => {
    const run = after.current;
    after.current = null;
    run?.();
  });

  /** Focus a control of the basket, or the first "Xoá", or the page's title. */
  function focusIn(selector: string | null) {
    const el = root.current;
    if (!el) return;
    const to =
      (selector ? el.querySelector<HTMLElement>(selector) : null) ??
      el.querySelector<HTMLElement>(".cline-rm") ??
      el.querySelector<HTMLElement>("h1");
    to?.focus({ preventScroll: true });
  }

  if (!ready) {
    return (
      <div className="cartp" ref={root}>
        <div className="cart-head">
          <h1 className="page-title disp">Giỏ</h1>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="cartp" ref={root}>
        <div className="cart-head">
          <h1 className="page-title disp" tabIndex={-1}>
            Giỏ
          </h1>
        </div>
        <div className="empty-state">
          <span className="empty-ic">
            <FeedIcon name="bag" />
          </span>
          <p className="empty-title">Giỏ trống</p>
          <Link className="btn btn-blue" href="/products">
            Xem Cửa hàng
          </Link>
        </div>
      </div>
    );
  }

  const s = cartSummary(catalog, lines, now, toVnIso(now));

  function step(l: ResolvedLine, by: 1 | -1, e: React.MouseEvent<HTMLButtonElement>) {
    const btn = e.currentTarget;
    const group = btn.parentElement;
    setQty(l.key, Math.max(1, Math.min(l.available, l.line.qty + by)));
    // The button that just reached the end goes inactive; the other one of the pair takes the focus.
    after.current = () => {
      if (btn.disabled) group?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    };
  }

  function drop(l: ResolvedLine) {
    const at = cart.findIndex((c) => lineKey(c) === l.key);
    const line = l.line;
    remove(l.key);
    after.current = () => focusIn(null);
    toast(`Đã xoá ${l.product.name}`, {
      label: "Hoàn tác",
      run: () => {
        restore(line, at);
        after.current = () => focusIn(`[data-rm="${l.key}"]`);
      },
    });
  }

  function trySwap(l: ResolvedLine, e: React.MouseEvent<HTMLButtonElement>) {
    quick.open(l.product, e.currentTarget, {
      color: l.line.color,
      swap: {
        done: (color, size) => {
          swap(l.key, color, size);
          const next = lineKey({ productId: l.line.productId, color, size });
          after.current = () => focusIn(`[data-rm="${next}"]`);
          toast(`Đã đổi ${l.product.name} sang size ${size}`);
        },
      },
    });
  }

  const payLabel = (withTotal: boolean) =>
    withTotal ? (
      <>
        Thanh toán <span className="price">· {vnd(s.totalVnd)}</span>
      </>
    ) : (
      "Thanh toán"
    );
  const pay = (cls: string | false, withTotal: boolean) =>
    s.blocked || !s.buyable ? (
      <button className={cx("btn btn-blue", cls)} type="button" disabled aria-describedby="cart-block">
        {payLabel(withTotal)}
      </button>
    ) : (
      <Link className={cx("btn btn-blue", cls)} href="/checkout">
        {payLabel(withTotal)}
      </Link>
    );

  return (
    <div className="cartp" ref={root}>
      <div className="cart-head">
        <h1 className="page-title disp" tabIndex={-1}>
          Giỏ
        </h1>
        <p className="cart-count">{s.count} món</p>
      </div>
      <div className="cart-grid">
        <section className="cart-lines" aria-label="Các món trong giỏ">
          {lines.map((l) => (
            <CartLine key={l.key} l={l} now={now} onStep={step} onDrop={drop} onSwap={trySwap} />
          ))}
        </section>
        <aside className="csum" aria-labelledby="sum-title">
          <h2 className="csum-title" id="sum-title">
            Tóm tắt
          </h2>
          <dl className="facts">
            <div>
              <dt>Tạm tính</dt>
              <dd>{vnd(s.subtotalVnd)}</dd>
            </div>
            <div>
              <dt>Giao hàng</dt>
              <dd>{s.shippingFeeVnd ? vnd(s.shippingFeeVnd) : "Miễn phí"}</dd>
            </div>
            <div>
              <dt>Dự kiến nhận</dt>
              <dd>{s.window}</dd>
            </div>
          </dl>
          {s.toFreeVnd > 0 && s.subtotalVnd > 0 && (
            <div className="free">
              <p>
                Thêm <b>{vnd(s.toFreeVnd)}</b> để được miễn phí giao
              </p>
              <div className="free-bar" aria-hidden="true">
                {/* How far along, as the mock draws it: a computed length has no class to live in. */}
                <i style={{ transform: `scaleX(${s.freeShare.toFixed(3)})` }} />
              </div>
            </div>
          )}
          <div className="csum-total">
            <span>Tổng</span>
            <b>{vnd(s.totalVnd)}</b>
          </div>
          {pay("only-desk csum-pay", false)}
          <p className="sr-only" id="cart-block">
            {s.blocked ? "Còn món cần xử lý trong giỏ" : ""}
          </p>
        </aside>
      </div>
      <div className="paybar">{pay(false, true)}</div>
    </div>
  );
}

interface CartLineProps {
  l: ResolvedLine;
  now: Date;
  onStep: (l: ResolvedLine, by: 1 | -1, e: React.MouseEvent<HTMLButtonElement>) => void;
  onDrop: (l: ResolvedLine) => void;
  onSwap: (l: ResolvedLine, e: React.MouseEvent<HTMLButtonElement>) => void;
}

/** One line of the basket (`cart.js`: `row`). */
function CartLine({ l, now, onStep, onDrop, onSwap }: CartLineProps) {
  const catalog = useCatalog();
  const p = l.product;
  const { color, size, qty } = l.line;
  const problem = cartProblem(catalog, l, now);
  const message = problemText(catalog, l, now);
  const swappable = canSwap(catalog, l, now);
  const low = lowLeft(catalog, l, now);
  const fixed = isFixed(p);
  const colour = COLORS[color].label;
  const href = `/products/${p.slug}`;

  return (
    <article className={cx("cline", problem && "has-problem", problem && `is-${problem}`)}>
      <Link className={cx("cline-img", fixed && "flat")} href={href} tabIndex={-1} aria-hidden="true">
        <Image src={pictureOf(p, color, "pack").src} width={120} height={150} alt="" />
      </Link>
      <div className="cline-body">
        <div className="cline-top">
          <h2 className="cline-name disp">
            <Link href={href}>{p.name}</Link>
          </h2>
          <p className="cline-price">{vnd(l.lineTotalVnd)}</p>
        </div>
        <p className="cline-meta">
          {colour} · Size {size}
          {qty > 1 && ` · ${vnd(p.priceVnd)} một chiếc`}
        </p>
        {message && (
          <p className="cline-err">
            <FeedIcon name="warning-circle" />
            <span>{message}</span>
          </p>
        )}
        <div className="cline-acts">
          {problem !== "closed" && problem !== "gone" && (
            <>
              <div className="step" role="group" aria-label={`Số lượng ${p.name}`}>
                <button type="button" aria-label="Bớt một" disabled={qty <= 1} onClick={(e) => onStep(l, -1, e)}>
                  <FeedIcon name="minus" />
                </button>
                <output aria-live="polite">{qty}</output>
                <button type="button" aria-label="Thêm một" disabled={qty >= l.available} onClick={(e) => onStep(l, 1, e)}>
                  <FeedIcon name="plus" />
                </button>
              </div>
              {low !== null && <span className="cline-left">Còn {low}</span>}
            </>
          )}
          {swappable && (
            <button className="pill pill-err" type="button" onClick={(e) => onSwap(l, e)}>
              Chọn size khác
            </button>
          )}
          <button
            className="cline-rm"
            type="button"
            data-rm={l.key}
            aria-label={`Xoá ${p.name}, ${colour.toLocaleLowerCase("vi")}, size ${size}`}
            onClick={() => onDrop(l)}
          >
            <FeedIcon name="trash" />
            <span>Xoá</span>
          </button>
        </div>
      </div>
    </article>
  );
}
