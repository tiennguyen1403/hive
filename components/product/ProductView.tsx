"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon/Icon";
import { Badge } from "@/components/ui/Badge";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/account/WishlistContext";
import { DropClock } from "@/components/shop/DropClock";
import { Toast } from "@/components/shop/Toast";
import { usePrefs, writePrefs } from "@/components/shop/prefs";
import { COLORS } from "@/data/catalog";
import {
  FAMILY_SHORT_LABELS,
  type ColorKey,
  type Drop,
  type DropState,
  type Product,
  type Size,
} from "@/data/types";
import { dayMonth } from "@/lib/datetime";
import { isLowStock, isSoldOut, onHand, onHandByColor, onHandOf } from "@/lib/inventory";
import { LEX, issueLabel, issueNo } from "@/lib/lexicon";
import { setSizePref } from "@/lib/prefs";
import { vnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";
import { PAYMENT_LABEL } from "@/lib/order-labels";
import {
  COD_SURCHARGE_VND,
  EXPRESS_FEE_VND,
  FREE_SHIPPING_FROM_VND,
  RETURN_WINDOW_DAYS,
  STANDARD_FEE_VND,
} from "@/lib/shipping";
import { TRANSFER_HOLD_HOURS } from "@/lib/placed-order";
import { BuyBar } from "./BuyBar";
import { SizeGuideSheet } from "./SizeGuideSheet";
import { SizeTable } from "./SizeTable";

interface ProductViewProps {
  product: Product;
  /** The issue this style belongs to, for the clock in the kick line. */
  drop: Drop;
  state: DropState;
  /** The clock as the server rendered it — the first client render matches. */
  initialLabel: string;
}

/**
 * The product page: the photographs on one side, THE TICKET on the other.
 *
 * The ticket is the page's whole idea — one column carrying which issue this
 * is and how long it has, the name, what it is made of, the price, how much
 * of the cut is left, the colourway, the sizes, and ONE action. Everything on
 * it is a fact from `data/` through `lib/`: the meter's width, the number
 * beside each colour, the number on each size row.
 *
 * One component and not two, because the colourway is the hinge: choosing it
 * moves the gallery AND rewrites every size count, since stock is held per
 * colour. Split in two, that state would have to be lifted into a parent with
 * no other reason to exist.
 *
 * The rule the page is built around: a size that has run out is visible
 * BEFORE the button is pressed — a struck row saying "hết", not an error
 * after a tap (PRODUCT.md, "scarcity is content").
 */
export function ProductView({ product, drop, state, initialLabel }: ProductViewProps) {
  const { add } = useCart();
  const wish = useWishlist();
  const { prefs, ready: prefsReady } = usePrefs();

  const [color, setColor] = useState<ColorKey>(product.colors[0]!);
  const [size, setSize] = useState<Size | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [shot, setShot] = useState(0);
  const galRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  const preselected = useRef(false);

  const saved = wish.has(product.id);
  const closed = state !== "OPEN";
  const sold = isSoldOut(product);
  const canBuy = !sold && !closed;
  const left = onHand(product);
  const leftInColor = onHandByColor(product, color);
  const no = issueNo(product.dropNo);
  const remembered = prefsReady && size !== null && prefs.size === size;

  // The footer links here as "Bảng số đo", and so does the size sheet on
  // every other screen. Landing at the top of a product page instead of on
  // the table the link names would make it a dead control.
  useEffect(() => {
    if (window.location.hash === "#size") setGuideOpen(true);
  }, []);

  // The remembered size, once storage has answered. It only ever preselects
  // — never adds, never changes a choice already made — and it stays quiet
  // when that size has gone in the colourway on screen.
  useEffect(() => {
    if (!prefsReady || preselected.current) return;
    preselected.current = true;
    const want = prefs.size;
    if (want && canBuy && onHandOf(product, color, want) > 0) setSize(want);
  }, [prefsReady, prefs.size, product, color, canBuy]);

  /** How much of the cut is still on the shelf, as a bar. */
  const filled = Math.max(0, Math.min(100, Math.round((left / product.cutUnits) * 100)));
  const meter = ["meter", sold ? "gone" : isLowStock(product) ? "hot" : ""]
    .filter(Boolean)
    .join(" ");

  function pickColor(next: ColorKey, index: number) {
    setColor(next);
    // A size chosen in one colour may not exist in the next. Losing the
    // selection is kinder than letting Add be pressed on something gone.
    if (size && onHandOf(product, next, size) === 0) setSize(null);
    // Move the gallery to that colourway — but only where the gallery is a
    // swipe. From 900px every frame is already on screen in a column, and
    // scrolling the page under the shopper would be an answer to a question
    // nobody asked.
    const gal = galRef.current;
    if (gal && gal.scrollWidth > gal.clientWidth) {
      gal.scrollTo({ left: index * gal.clientWidth, behavior: "smooth" });
    }
  }

  function addNow() {
    if (!size) return;
    add({ productId: product.id, size, color, qty: 1 });
    setToast(`Đã thêm ${product.name} size ${size} vào giỏ`);
  }

  function toggleRemember() {
    if (!size) return;
    const on = !remembered;
    writePrefs(setSizePref(prefs, on ? size : null));
    setToast(
      on
        ? "Sẽ chọn sẵn size này ở các mẫu sau · lưu trên thiết bị"
        : "Đã bỏ ghi nhớ size",
    );
  }

  function toggleSave() {
    wish.toggle(product.id);
    setToast(
      saved
        ? `Đã bỏ ${product.name} khỏi danh sách đã lưu`
        : `Đã lưu ${product.name} · lưu trên thiết bị này`,
    );
  }

  /** The buy bar's answer when no size has been chosen yet. */
  function goToSizes() {
    const row = sizeRef.current;
    if (!row) return;
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    row.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
  }

  return (
    <>
      <nav className="crumbs" aria-label="Đường dẫn">
        {/* U+00A0 so "Số 05" is never broken across two lines. */}
        <Link href="/products">{`${LEX.t} ${no}`}</Link>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <Link href={`/products?family=${product.family}`}>
          {FAMILY_SHORT_LABELS[product.family]}
        </Link>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <b>{product.name}</b>
      </nav>

      <div className="pdp3">
        <div>
          <div
            className="gal"
            ref={galRef}
            aria-label={`Ảnh ${product.name}, ${product.photoKeys.length} tấm`}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.clientWidth > 0) setShot(Math.round(el.scrollLeft / el.clientWidth));
            }}
          >
            {product.photoKeys.map((key, i) => (
              <figure key={key + i}>
                <Image
                  src={photoUrl(key, 760, 72)}
                  alt={`${product.name} — màu ${COLORS[product.colors[i] ?? color].label}`}
                  width={760}
                  height={950}
                  priority={i === 0}
                />
              </figure>
            ))}
          </div>
          {product.photoKeys.length > 1 && (
            <div className="galbar">
              <span>
                <span className="cur">{shot + 1}</span> / {product.photoKeys.length}
              </span>
              <span className="dots" aria-hidden="true">
                {product.photoKeys.map((key, i) => (
                  <i key={key + i} className={i === shot ? "on" : undefined} />
                ))}
              </span>
            </div>
          )}
        </div>

        <div className="ticket">
          <p className="kick">
            {state === "OPEN" && <Badge tone="ok">Đang bán</Badge>}
            {state === "UPCOMING" && <Badge tone="info">Sắp mở</Badge>}
            {state === "CLOSED" && <Badge tone="shut">Đã đóng</Badge>}
            <span>
              {issueLabel(product.dropNo)} ·{" "}
              {state === "CLOSED" ? (
                `đã đóng ${dayMonth(drop.closesAt)}`
              ) : (
                <DropClock drop={drop} state={state} initialLabel={initialLabel} />
              )}
            </span>
          </p>

          <h1>{product.name}</h1>
          <p className="kind">
            {product.kind} · {product.material}
          </p>
          <p className="price">{vnd(product.priceVnd)}</p>

          {/* What was cut and what is left. The bar reads the same fact a
              second way and carries the percentage as its label, so it is
              not a graphic that says nothing to a reader who cannot see it. */}
          <div className="stock">
            {sold ? (
              <>
                <b>0</b> / {product.cutUnits} chiếc đã cắt{" "}
                <span className="cd">· đã bán hết</span>
              </>
            ) : (
              <>
                <b>Còn {left}</b> / {product.cutUnits} chiếc đã cắt{" "}
                <span className="cd">· không may thêm</span>
              </>
            )}
            <div
              className={meter}
              role="img"
              aria-label={sold ? "Đã bán hết" : `Còn ${filled}%`}
            >
              <i style={{ width: sold ? "100%" : `${filled}%` }} />
            </div>
          </div>

          {product.colors.length > 1 && (
            <div className="fld">
              <div className="lbl">
                <b>Màu</b>
                <span>
                  {COLORS[color].label} ·{" "}
                  {leftInColor === 0 ? "đã hết" : `còn ${leftInColor}`}
                </span>
              </div>
              <div className="sw" role="group" aria-label="Màu">
                {product.colors.map((c, i) => {
                  const n = onHandByColor(product, c);
                  return (
                    <button
                      key={c}
                      type="button"
                      className={n === 0 ? "gone" : undefined}
                      aria-pressed={c === color}
                      aria-label={`Màu ${COLORS[c].label}, ${n === 0 ? "đã hết" : `còn ${n}`}`}
                      onClick={() => pickColor(c, i)}
                    >
                      <i style={{ background: COLORS[c].hex }} aria-hidden="true" />
                      <span>
                        {COLORS[c].label} {n}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="fld" ref={sizeRef}>
            <div className="lbl">
              <b>Size</b>
              <span>
                {size ? `${size} · còn ${onHandOf(product, color, size)}` : "chưa chọn"}
              </span>
              <button type="button" className="lnk" onClick={() => setGuideOpen(true)}>
                Bảng số đo
              </button>
            </div>
            <SizeTable
              product={product}
              color={color}
              value={size}
              onPick={setSize}
              frozen={!canBuy}
              label={`Chọn size ${product.name}`}
            />
          </div>

          {/* Only once a size is on the table: a switch offering to remember
              nothing is a control with no subject. */}
          {size && (
            <div className="mysize">
              <div>
                <b>Size ghi nhớ</b>
                Chọn sẵn size này ở các mẫu sau. Lưu trên thiết bị này.
              </div>
              <button
                type="button"
                className="switch3"
                role="switch"
                aria-checked={remembered}
                aria-label="Ghi nhớ size trên thiết bị này"
                onClick={toggleRemember}
              />
            </div>
          )}

          <div className="cta" id="buy-cta">
            {/* No icon while it is disabled: an icon names an action, and
                there is nothing to name until a size is chosen. */}
            <button
              type="button"
              className="btn"
              disabled={!canBuy || !size}
              onClick={addNow}
            >
              {canBuy && size && <Icon name="bag" className="ic sm" />}
              {!canBuy
                ? sold
                  ? "Đã bán hết"
                  : `${issueLabel(product.dropNo)} đã đóng`
                : size
                  ? `Thêm size ${size} vào giỏ`
                  : "Chọn size"}
            </button>
            {/* Saving works whether or not the style can be bought — that is
                the point of saving a sold-out one. `aria-pressed` carries the
                state for anyone not reading the label. */}
            <button
              type="button"
              className="btn ink"
              aria-pressed={saved}
              onClick={toggleSave}
            >
              <Icon name="heart" bulk={saved} className="ic sm" />
              {saved ? "Đã lưu" : "Lưu"}
            </button>
          </div>

          <p className="fine">
            {`Giỏ không giữ hàng. Đơn đặt trước nhận trước. ` +
              `Chuyển khoản giữ hàng ${TRANSFER_HOLD_HOURS} giờ.`}
          </p>

          {/* The five questions a shopper asks before buying clothes they
              cannot touch. Every figure is the constant the checkout charges
              (`lib/shipping.ts`), not a number typed here. */}
          <dl className="info3">
            <Row label="Chất liệu">{product.material}</Row>
            <Row
              label="Form"
              note={
                product.fit === "OVERSIZE"
                  ? "rộng hơn một size so với form thường"
                  : "đúng size thường ngày"
              }
            >
              {product.fit === "OVERSIZE" ? "Oversize" : "Regular"}
            </Row>
            <Row
              label="Giao hàng"
              note={`miễn phí từ ${vnd(FREE_SHIPPING_FROM_VND)} · nội thành TP.HCM 24 giờ · ${vnd(EXPRESS_FEE_VND)}`}
            >
              2–4 ngày · {vnd(STANDARD_FEE_VND)}
            </Row>
            <Row label="Thanh toán">
              {PAYMENT_LABEL.BANK_TRANSFER} · {PAYMENT_LABEL.COD} +{vnd(COD_SURCHARGE_VND)} ·{" "}
              {PAYMENT_LABEL.CARD}
            </Row>
            <Row label="Đổi trả" note="điều kiện chi tiết chờ chốt">
              {`${RETURN_WINDOW_DAYS} ngày nếu chưa qua sử dụng`}
            </Row>
          </dl>
        </div>
      </div>

      {canBuy && (
        <BuyBar
          watchId="buy-cta"
          title={product.name}
          detail={`${vnd(product.priceVnd)} · ${size ? `size ${size}` : "chưa chọn size"}`}
          icon={size ? "bag" : undefined}
          label={size ? `Thêm size ${size}` : "Chọn size"}
          onPress={size ? addNow : goToSizes}
        />
      )}

      <SizeGuideSheet
        product={product}
        size={size}
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

/** One row of the spec list, with an optional second line under it. */
function Row({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="r">
      <dt>{label}</dt>
      <dd>
        {children}
        {note && <span>{note}</span>}
      </dd>
    </div>
  );
}
