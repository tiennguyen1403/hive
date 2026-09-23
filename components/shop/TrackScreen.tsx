"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon/Icon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field3 } from "@/components/ui/Field3";
import { CopyButton } from "@/components/shop/CopyButton";
import { InvoiceSheet } from "@/components/shop/InvoiceSheet";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { usePlacedOrders } from "@/components/shop/placed-order";
import { useSimOverlay } from "@/components/shop/sim-store";
import type { Order } from "@/data/types";
import { shopOrders } from "@/lib/admin-sim";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { invoiceOf } from "@/lib/invoice";
import {
  findDeviceOrder,
  lastUpdateLabel,
  normaliseOrderCode,
  notFoundMessage,
  phoneDigits,
  totalRowLabel,
  trackedOfOrder,
  trackedOfPlaced,
  type TrackedOrder,
} from "@/lib/lookup";
import { vnd } from "@/lib/money";
import { ROW_STATE_LABEL } from "@/lib/order-labels";
import { formatPhone } from "@/lib/phone";
import { photoUrl } from "@/lib/photos";
import { demoNow } from "@/lib/clock";

interface TrackScreenProps {
  /** Whatever came in on `?code=`, shown back in the box. */
  code: string;
  phone: string;
  /**
   * The fixture order this pair unlocks, resolved on the SERVER — building
   * its address line needs `data/regions.ts` and the 3.321 communes behind
   * it, which never cross into the browser.
   */
  found: TrackedOrder | null;
  /** The same order, raw, so a handover recorded here can be folded in. */
  base: Order | null;
  /** What the server made of its address; the browser cannot rebuild it. */
  addressLine: string;
}

/**
 * Looking an order up without signing in: a code and the phone number it was
 * placed with.
 *
 * The lookup happens in the URL. Submitting writes `?code=&phone=` and the
 * page renders what that pair unlocks — so a result can be shared, reloaded,
 * bookmarked and reached with Back, and so the confirmation screen can print
 * the same link beside its QR slot (QĐ-8, the same rule the listing filters
 * follow).
 *
 * Two places are searched, because an order lives in one of two. The
 * fixtures are server-side and arrive as `found`; an order placed in THIS
 * browser is in `localStorage` and is matched here. Neither can see the
 * other, and the shopper should not have to know which they have.
 *
 * The phone number is not decoration. Order codes are short and sequential,
 * so a code alone would hand a stranger somebody's name, address and phone
 * number. And the answer is the same whichever half is wrong: the screen
 * never confirms that a code exists.
 */
export function TrackScreen({ code, phone, found, base, addressLine }: TrackScreenProps) {
  const router = useRouter();
  const { orders, ready } = usePlacedOrders();
  const { sim } = useSimOverlay();
  const [typedCode, setTypedCode] = useState(code);
  const [typedPhone, setTypedPhone] = useState(phone);
  const trackingRef = useRef<HTMLElement>(null);

  // The URL is the query. When it changes — a submit, a Back, a shared link
  // — the boxes follow it rather than holding what was typed before.
  // Adjusting state during render: React re-runs this component immediately
  // and never commits the stale value.
  const [seen, setSeen] = useState({ code, phone });
  if (seen.code !== code || seen.phone !== phone) {
    setSeen({ code, phone });
    setTypedCode(code);
    setTypedPhone(phone);
  }

  // One instant for the whole render, so the timeline and the state of a
  // device order are judged against the same clock.
  const now = useMemo(() => demoNow(), [orders]);
  const device = findDeviceOrder(code, phone, orders);
  /**
   * The fixture order, plus what the back office did to it in THIS browser.
   *
   * Only the actions a shopper is entitled to see (`shopOrders`): a handover
   * and its tracking number, and a cancellation with its reason. The
   * handover form promises the shopper this number — "khách thấy mã này ở
   * tra cứu đơn" — so the promise is kept here or it is not a promise.
   *
   * The address line stays the server's. Rebuilding it from an edited
   * `shipTo` would mean shipping `data/wards.json` — 218KB of communes — to
   * every shopper who looks an order up.
   */
  const patched = useMemo(() => {
    if (!base) return found;
    const next = shopOrders([base], sim)[0]!;
    return next === base ? found : trackedOfOrder(next, addressLine);
  }, [base, sim, found, addressLine]);

  const order: TrackedOrder | null =
    patched ?? (device ? trackedOfPlaced(device, now) : null);

  const asked = code.trim() !== "" && phone.trim() !== "";
  // "Not found" only once the device list has been read: saying it while
  // storage is still answering would be a wrong answer that arrives first.
  const missing = asked && ready && !order;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({
      code: normaliseOrderCode(typedCode),
      // A number that is not a number still goes into the URL: the lookup
      // then fails visibly instead of the form silently dropping half of
      // what was typed.
      phone: phoneDigits(typedPhone) || typedPhone.trim(),
    });
    router.push(`/track?${q.toString()}`);
  }

  return (
    <ShopFrame>
      <div className="wrap3 noprint">
        <div className="pghead">
          <h1>Tra cứu đơn</h1>
          <span className="meta">không cần đăng nhập</span>
        </div>

        {/* A real GET form pointed at this route: Enter submits, and it
            still works if the script has not arrived yet. The handler above
            only tidies what goes into the URL. */}
        <form className="lookup" action="/track" method="get" onSubmit={submit}>
          <div className="row2">
            <Field3 label="Mã đơn">
              {({ id }) => (
                <input
                  id={id}
                  name="code"
                  className="inp"
                  placeholder="DH-0000"
                  autoComplete="off"
                  style={{ textTransform: "uppercase" }}
                  value={typedCode}
                  onChange={(e) => setTypedCode(e.target.value)}
                />
              )}
            </Field3>
            <Field3 label="Số điện thoại đặt hàng">
              {({ id }) => (
                <input
                  id={id}
                  name="phone"
                  className="inp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={typedPhone}
                  onChange={(e) => setTypedPhone(e.target.value)}
                />
              )}
            </Field3>
          </div>
          <p className="help" style={{ marginTop: 8 }}>
            Đúng số đã dùng khi đặt, để người khác không tra được đơn chỉ bằng mã.
          </p>
          <p className="act">
            <Button type="submit" icon="search">
              Tra cứu
            </Button>
          </p>
          {missing && (
            <p className="note3 hot" role="alert" style={{ marginTop: 14 }}>
              <Icon name="danger" className="ic sm" />
              <span>{notFoundMessage(code)}</span>
            </p>
          )}
        </form>

        {order && <Result order={order} trackingRef={trackingRef} />}
      </div>

      {/* The sheet that goes to paper, and nothing else on it. */}
      {order && <InvoiceSheet invoice={invoiceOf(order)} />}
    </ShopFrame>
  );
}

function Result({
  order,
  trackingRef,
}: {
  order: TrackedOrder;
  trackingRef: React.RefObject<HTMLElement | null>;
}) {
  const state = ROW_STATE_LABEL[order.state];
  const updated = lastUpdateLabel(order.steps);

  return (
    <section className="result3" aria-label={`Đơn ${order.code}`}>
      <div className="two3">
        <div>
          <div className="pghead">
            <h2>{order.code}</h2>
            <Badge tone={state.tone}>{state.text}</Badge>
            <span className="meta">
              đặt {clockLabel(order.placedAt)} · {dayMonth(order.placedAt)} ·{" "}
              {order.units} món · {vnd(order.totalVnd)}
            </span>
          </div>

          <div className="panel3">
            <h3>
              Hành trình
              {updated && <span className="meta">cập nhật {updated}</span>}
            </h3>
            <div className="tl3">
              {order.steps.map((s) => (
                <div className={`m ${s.state}`} key={s.title}>
                  <b>{s.title}</b>
                  {/* A step that is still ahead says so; one that happened
                      without a recorded minute says nothing rather than
                      "Chưa tới", which would contradict its own tick. */}
                  {(s.detail || s.state === "todo") && (
                    <span>{s.detail ?? "Chưa tới"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {order.onDevice && (
            <p className="note3" style={{ marginTop: 16 }}>
              <Icon name="info" className="ic sm" />
              <span>
                Đơn này đặt trên thiết bị này và lưu ở đây. Chưa có máy chủ nhận đơn,
                nên cửa hàng chưa thấy nó và hành trình chỉ có những mốc trình duyệt
                biết.
              </span>
            </p>
          )}
        </div>

        <aside>
          <div className="panel3">
            <h3>Đơn gồm {order.units} món</h3>
            {order.lines.map((l, i) => (
              <div className={i === 0 ? "ol first" : "ol"} key={`${l.name}-${l.size}-${i}`}>
                <span className="thumb">
                  <Image src={photoUrl(l.photoKey, 120, 60)} alt="" width={120} height={150} />
                </span>
                <span className="g">
                  <b>{l.name}</b>
                  <span>
                    {l.colorLabel} · {l.size} · ×{l.qty}
                  </span>
                </span>
                <span className="p">{vnd(l.unitPriceVnd * l.qty)}</span>
              </div>
            ))}
            <div className="sum3">
              {order.discountVnd > 0 && (
                <div className="r">
                  <span>Giảm giá{order.promo ? ` · ${order.promo}` : ""}</span>
                  <span>−{vnd(order.discountVnd)}</span>
                </div>
              )}
              <div className="r">
                <span>Phí giao</span>
                <span>
                  {order.shippingFeeVnd === 0 ? "Miễn phí" : vnd(order.shippingFeeVnd)}
                </span>
              </div>
              {order.codFeeVnd > 0 && (
                <div className="r">
                  <span>Phí thu hộ</span>
                  <span>{vnd(order.codFeeVnd)}</span>
                </div>
              )}
              <div className="r total">
                <span>{totalRowLabel(order.state)}</span>
                <b>{vnd(order.totalVnd)}</b>
              </div>
            </div>
          </div>

          <div className="panel3" style={{ marginTop: 16 }}>
            <h3>Giao tới</h3>
            <dl className="kvs">
              <dt>Người nhận</dt>
              <dd>
                {order.recipient} · <span className="nw">{formatPhone(order.phone)}</span>
              </dd>
              <dt>Địa chỉ</dt>
              <dd>{order.addressLine}</dd>
              {order.trackingCode && (
                <>
                  <dt>Mã vận đơn</dt>
                  <dd>
                    <b ref={trackingRef}>{order.trackingCode}</b>
                    <CopyButton value={order.trackingCode} selectRef={trackingRef} />
                  </dd>
                </>
              )}
              {order.note && (
                <>
                  <dt>Ghi chú</dt>
                  <dd className="muted">{order.note}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="acts3">
            {/* A real action: the browser's own print dialog, where "Save as
                PDF" lives. `@media print` leaves only `.invoice` on the
                page. */}
            <Button
              tone="ink wide"
              icon="printer"
              onClick={() => window.print()}
            >
              Tải hoá đơn
            </Button>
            <ButtonLink tone="quiet" icon="sms" href="/contact">
              Cần hỗ trợ về đơn này
            </ButtonLink>
          </div>
        </aside>
      </div>
    </section>
  );
}
