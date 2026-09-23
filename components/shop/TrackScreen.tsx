"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon/Icon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field3 } from "@/components/ui/Field3";
import { CopyButton } from "@/components/shop/CopyButton";
import { InvoiceSheet } from "@/components/shop/InvoiceSheet";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { invoiceOf } from "@/lib/invoice";
import {
  lastUpdateLabel,
  normaliseOrderCode,
  notFoundMessage,
  phoneDigits,
  totalRowLabel,
  type TrackedOrder,
} from "@/lib/lookup";
import { vnd } from "@/lib/money";
import { STATE_LABEL } from "@/lib/order-labels";
import { formatPhone } from "@/lib/phone";
import { photoUrl } from "@/lib/photos";

interface TrackScreenProps {
  /** Whatever came in on `?code=`, shown back in the box. */
  code: string;
  phone: string;
  /**
   * The order this pair unlocks, resolved on the SERVER by `track_order()` —
   * and its address line built there too, because that needs
   * `data/regions.ts` and the 3.321 communes behind it, which never cross
   * into the browser. Null for any miss.
   */
  found: TrackedOrder | null;
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
 * One place is searched since slice B2 — the shop's database, where every
 * order is a row whoever placed it — and the search runs on the server, so
 * the answer is already in `found` on first paint.
 *
 * The phone number is not decoration. Order codes are short and sequential,
 * so a code alone would hand a stranger somebody's name, address and phone
 * number. And the answer is the same whichever half is wrong: the screen
 * never confirms that a code exists.
 */
export function TrackScreen({ code, phone, found }: TrackScreenProps) {
  const router = useRouter();
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

  const order = found;
  const asked = code.trim() !== "" && phone.trim() !== "";
  const missing = asked && !order;

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
  const state = STATE_LABEL[order.state];
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
                    {/* The service the shop handed it to, when the handover
                        recorded one (slice B3a). */}
                    {order.carrier && <span className="muted">{order.carrier} · </span>}
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
