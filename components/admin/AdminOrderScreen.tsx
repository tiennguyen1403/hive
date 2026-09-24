"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { AddressEditForm } from "@/components/admin/AddressEditForm";
import { AdminTop } from "@/components/admin/AdminTop";
import { CancelOrderModal } from "@/components/admin/CancelOrderModal";
import { HandoverForm } from "@/components/admin/HandoverForm";
import { useAdminToast } from "@/components/admin/AdminToast";
import { ActionMenu } from "@/components/admin/Table3";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { COLORS } from "@/data/colors";
import { useCatalog } from "@/components/shop/CatalogContext";
import type { Catalog } from "@/lib/catalog";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import type { Order } from "@/data/types";
import {
  cancelOrderAdmin,
  editAddress,
  handOver,
  markDelivered,
  markPaid,
  noteOrder,
} from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/state";
import { customerKey, isShopper } from "@/lib/admin-customers";
import { canCancel, canEditAddress, isPaidFor, nextMove, type AdminOrder } from "@/lib/admin-orders";
import { HANDOVER_LATE_DAYS, orderItemsLabel } from "@/lib/admin-rows";
import { customerFacts, issueOf } from "@/lib/customer-tags";
import { effectiveOrder } from "@/lib/customer-orders";
import { clockLabel, dateTimeLabel, dayMonth, sinceLabel } from "@/lib/datetime";
import type { AdminEvent } from "@/lib/db/event-dto";
import { LEX, issueNo } from "@/lib/lexicon";
import { plainVnd, vnd } from "@/lib/money";
import { addressEditReason, internalNotes } from "@/lib/order-notes";
import { PAYMENT_LABEL, STATE_LABEL } from "@/lib/order-labels";
import { orderSubtotalVnd, orderTotalVnd, orderUnits, transferReference } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { photoUrl } from "@/lib/photos";
import { initialsOf } from "@/lib/initials";
import { deliveryOption, EXPRESS_FEE_VND } from "@/lib/shipping";

/** Which move is on its way to the server, so only its own button says so. */
type Busy = "PAY" | "HANDOVER" | "DELIVER" | "CANCEL" | "NOTE" | "ADDRESS" | null;

/**
 * One order, and everything the shop can do to it.
 *
 * SINCE SLICE B3A EVERY BUTTON HERE WRITES TO THE DATABASE. Confirming the
 * money, handing over, recording the delivery, cancelling, a note, a new
 * address: each is a Server Action (`lib/actions/admin.ts`) calling an
 * `admin_*` function with a state guard, and each writes its line in the
 * `events` table in the same transaction. The shopper's own "Đơn hàng",
 * receipt and `/track` read the same rows, so what is pressed here is what
 * they see. The internal notes are this order's events read a second way
 * (`lib/order-notes.ts`), so they cannot disagree with the status.
 *
 * Only the move the guard allows next is drawn (`lib/admin-orders.ts`): a
 * button the database would refuse is a button that lies (DESIGN.md §9
 * rule 3). "Gửi lại xác nhận" is drawn disabled and says why — no mail server
 * is connected, so it has nothing to send with.
 *
 * The strip of black cloth at the top is `.nextstep` — the one dark area on
 * this screen, and it earns it: the next move is the reason the screen was
 * opened. A settled order (delivered, cancelled) has no next step here, and
 * inventing one would put a job on the screen that nobody can do.
 */
export function AdminOrderScreen({
  order: base,
  events,
  customerOrders,
  nowIso,
  openHandover,
}: {
  /** The order as the database has it (`admin_orders()`). */
  order: AdminOrder;
  /** Its own events, oldest first — the notes and the address history. */
  events: AdminEvent[];
  /** Every order of the account it belongs to, for the customer panel. */
  customerOrders: AdminOrder[];
  nowIso: string;
  /** Arrived from the queue's "Đóng gói và bàn giao" — open the panel at once. */
  openHandover: boolean;
}) {
  const catalog = useCatalog();
  const say = useAdminToast();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const order = effectiveOrder(base, now);
  const code = String(order.code);
  const [handing, setHanding] = useState(openHandover && nextMove(order, now) === "HAND_OVER");
  const [editingAddress, setEditingAddress] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [, startAction] = useTransition();

  /**
   * Run one Server Action and say what the server answered. The action
   * revalidates the area, so this screen re-renders with the new state in
   * the same response. After an `await` the transition has to be restated
   * (react.dev/reference/react/useTransition).
   */
  function act(kind: Exclude<Busy, null>, call: () => Promise<ActionState>, after?: () => void) {
    if (busy) return;
    setBusy(kind);
    startAction(async () => {
      const result = await call();
      startAction(() => {
        setBusy(null);
        if (result.ok) after?.();
        say(result.message ?? result.errors.form ?? "", result.ok ? "ok" : "error");
      });
    });
  }

  const owner = order.owner && isShopper(order.owner) ? order.owner : null;
  const state = STATE_LABEL[order.status.state];
  const subtotal = orderSubtotalVnd(order);
  const total = orderTotalVnd(order);
  const province = findProvince(order.shipTo.provinceCode);
  const ward = findWard(order.shipTo.provinceCode, order.shipTo.wardCode);
  const carrier = order.status.state === "SHIPPING" ? order.status.carrier : undefined;
  const delivery = deliveryOption(
    order.shippingFeeVnd === EXPRESS_FEE_VND ? "EXPRESS" : "STANDARD",
  );
  const editReason = addressEditReason(events, code);
  const facts = owner ? customerFacts(catalog, customerOrders, catalog.currentDropNo, now) : null;
  const notes = internalNotes(events, order);

  /** Before handover, the address can still be changed. After, it cannot. */
  const beforeHandover = canEditAddress(order, now);

  function addNote() {
    const text = note.trim();
    if (!text) return say("Ghi chú trống thì chưa có gì để lưu", "error");
    act("NOTE", () => noteOrder(code, text), () => setNote(""));
  }

  return (
    <>
      <AdminTop
        crumb={{ label: "Đơn hàng", href: "/admin/orders", here: code }}
        title={code}
        badge={<Badge tone={state.tone}>{state.text}</Badge>}
        sub={
          <span>
            Đặt {clockLabel(order.placedAt)} · {dayMonth(order.placedAt)}
            {owner ? ` · ${owner.name} · ${formatPhone(order.shipTo.phone)}` : ""} ·{" "}
            {PAYMENT_LABEL[order.payment]} · {LEX.t} {issueNo(issueOf(catalog, order) ?? 0)}
          </span>
        }
      >
        {/* No mail server is connected, so nothing can be sent: the button
            says so rather than pretending (DESIGN.md §9 rule 3), the way the
            sign-in screen's Google button does. Disabled, so no icon. */}
        <Button tone="ink sm" disabled>
          Gửi lại xác nhận · đang chuẩn bị
        </Button>
        <ButtonLink tone="ink sm" icon="printer" href={`/admin/slips?codes=${code}`}>
          In phiếu giao
        </ButtonLink>
        {canCancel(order, now) && (
          <ActionMenu
            variant="btn"
            label="Thao tác khác"
            items={[
              {
                label: "Huỷ đơn",
                icon: "x",
                danger: true,
                onRun: () => setCancelling(true),
              },
            ]}
          />
        )}
      </AdminTop>

      {!handing && (
        <NextStep
          catalog={catalog}
          order={order}
          now={now}
          busy={busy}
          onPaid={() => act("PAY", () => markPaid([code]))}
          onHandover={() => setHanding(true)}
          onDelivered={() => act("DELIVER", () => markDelivered(code))}
        />
      )}

      {handing && (
        <HandoverForm
          shippingFeeVnd={order.shippingFeeVnd}
          placeholder={`VNP-${code.replace(/\D/g, "")}-01`}
          pending={busy === "HANDOVER"}
          onCancel={() => setHanding(false)}
          onConfirm={(who, trackingCode, courierNote) =>
            act(
              "HANDOVER",
              () => handOver(code, { carrier: who, trackingCode, note: courierNote }),
              () => setHanding(false),
            )
          }
        />
      )}

      <div className="split3" style={{ marginTop: 0 }}>
        <div>
          <section className="panel3">
            <h2>
              Món trong đơn<span className="meta">{orderUnits(order)} chiếc</span>
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Mẫu</th>
                  <th>Màu · size</th>
                  <th className="right">
                    <abbr title="Số lượng">SL</abbr>
                  </th>
                  <th className="right">Đơn giá</th>
                  <th className="right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l, i) => {
                  const p = catalog.byId.get(l.productId);
                  return (
                    <tr key={`${l.productId}-${l.size}-${l.color}-${i}`}>
                      <td className="nw">
                        <Image
                          className="th"
                          src={photoUrl(p?.photoKeys[0] ?? "hero", 120)}
                          alt=""
                          width={36}
                          height={45}
                        />
                        <b className="nm">{p?.name ?? "—"}</b>{" "}
                        <span className="sub" style={{ display: "inline" }}>
                          · {p?.kind ?? ""}
                        </span>
                      </td>
                      <td>
                        {COLORS[l.color].label} · {l.size}
                      </td>
                      <td className="right">{l.qty}</td>
                      <td className="right">{plainVnd(l.unitPriceVnd)}</td>
                      <td className="right">{plainVnd(l.unitPriceVnd * l.qty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="bd" style={{ paddingTop: 4, paddingBottom: 0 }}>
              <div className="sum3">
                <div className="r">
                  <span>Tạm tính</span>
                  <span>{vnd(subtotal)}</span>
                </div>
                {order.discountVnd > 0 && (
                  <div className="r">
                    <span>Giảm giá{order.promo ? ` · ${order.promo}` : ""}</span>
                    <span>−{vnd(order.discountVnd)}</span>
                  </div>
                )}
                <div className="r">
                  <span>Phí giao</span>
                  <span>{vnd(order.shippingFeeVnd)}</span>
                </div>
              </div>
            </div>
            <div className="totalbar">
              {/* Three readings, not two. "Tổng đã thanh toán" on an order
                  nobody has paid for yet — a transfer being waited on, a COD
                  or card order only taken, a COD parcel still on the road —
                  or on one cancelled before any money came is the screen
                  inventing a payment. */}
              <span>
                {order.status.state === "CANCELLED"
                  ? "Tổng đơn đã huỷ"
                  : isPaidFor(order)
                    ? "Tổng đã thanh toán"
                    : "Tổng cần thu"}
              </span>
              <b>{vnd(total)}</b>
            </div>
          </section>

          <section className="panel3" style={{ marginTop: 16 }}>
            <h2>
              Ghi chú nội bộ<span className="meta">khách không thấy</span>
            </h2>
            <div className="bd notes3">
              {notes.map((n, i) => (
                <div className={n.system ? "ni sys" : "ni"} key={`${n.at}-${i}`}>
                  <div className="meta">
                    {n.author || "Hệ thống"} · {clockLabel(n.at)} · {dayMonth(n.at)}
                  </div>
                  {n.text}
                </div>
              ))}
              <div className="add">
                <input
                  className="inp"
                  placeholder="Thêm ghi chú…"
                  aria-label="Ghi chú nội bộ"
                  value={note}
                  disabled={busy === "NOTE"}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addNote();
                  }}
                />
                <Button
                  tone="ink sm"
                  {...(busy === "NOTE" ? {} : { icon: "send" as const })}
                  disabled={busy === "NOTE"}
                  onClick={addNote}
                >
                  {busy === "NOTE" ? "Đang lưu…" : "Thêm"}
                </Button>
              </div>
            </div>
          </section>
        </div>

        <div>
          <section className="panel3">
            <h2>
              Giao tới
              {beforeHandover && !editingAddress && (
                <button type="button" className="more" onClick={() => setEditingAddress(true)}>
                  Sửa
                </button>
              )}
            </h2>
            <div className="bd">
              {editingAddress ? (
                <AddressEditForm
                  value={order.shipTo}
                  pending={busy === "ADDRESS"}
                  onCancel={() => setEditingAddress(false)}
                  onSave={(next, reason) =>
                    act(
                      "ADDRESS",
                      () => editAddress(code, { ...next, reason }),
                      () => setEditingAddress(false),
                    )
                  }
                />
              ) : (
                <>
                  <div className="addrblock" id="addrview">
                    <b>{order.shipTo.recipient}</b> · {formatPhone(order.shipTo.phone)}
                    <br />
                    {order.shipTo.line}
                    {ward ? `, ${wardLabel(ward)}` : ""}
                    {province ? `, ${provinceLabel(province)}` : ""}
                    <br />
                    <span className="muted">
                      {delivery.label} · {delivery.note}
                    </span>
                  </div>
                  {editReason && (
                    <p className="fine3">Đã sửa địa chỉ · lý do: {editReason}</p>
                  )}
                  {!beforeHandover && (
                    <p className="fine3">
                      {order.status.state === "CANCELLED"
                        ? "Đơn đã huỷ, không sửa được."
                        : "Đã bàn giao, không sửa được."}
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="panel3" style={{ marginTop: 16 }}>
            <h2>Hành trình</h2>
            <div className="bd">
              <div className="tl3" style={{ marginTop: 0 }}>
                {timelineOf(order, now, carrier).map((m, i) => (
                  <div className={`m ${m.state}`} key={`${m.title}-${i}`}>
                    <b>{m.title}</b>
                    <span>{m.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {owner && facts && (
            <section className="panel3" style={{ marginTop: 16 }}>
              <h2>
                Khách
                <Link className="more" href={`/admin/customers/${customerKey(owner)}`}>
                  Hồ sơ
                </Link>
              </h2>
              <div className="bd ctagrow">
                <span className="avatar" aria-hidden="true">
                  {initialsOf(owner.name)}
                </span>
                <b>{owner.name}</b>
                {facts.tag && (
                  <span className={`ctag ${facts.tag.tone}`.trim()}>{facts.tag.label}</span>
                )}
                <span className="sub">
                  {facts.orders.length} đơn · {vnd(facts.spentVnd)} ·{" "}
                  {facts.issues.length > 0
                    ? `mua ${LEX.tl} ${facts.issues.map((n) => issueNo(n)).join(", ")}`
                    : "chưa có đơn đã thanh toán"}{" "}
                  · {owner.email}
                </span>
              </div>
            </section>
          )}
        </div>
      </div>

      <CancelOrderModal
        order={cancelling ? order : null}
        pending={busy === "CANCEL"}
        onClose={() => setCancelling(false)}
        onConfirm={(reason, why) =>
          act("CANCEL", () => cancelOrderAdmin(code, reason, why), () => setCancelling(false))
        }
      />
    </>
  );
}

/**
 * The next move, stated before anybody has to work it out — the SQL guard's
 * own next edge (`nextMove`), so the one button drawn is one that works.
 *
 * A delivered order and a cancelled one have no next step HERE, and the strip
 * is simply not drawn — an empty banner saying "nothing to do" is furniture.
 * The button that is waiting on the server is disabled and says so, with no
 * icon.
 */
function NextStep({
  catalog,
  order,
  now,
  busy,
  onPaid,
  onHandover,
  onDelivered,
}: {
  catalog: Catalog;
  order: Order;
  now: Date;
  busy: Busy;
  onPaid: () => void;
  onHandover: () => void;
  onDelivered: () => void;
}) {
  const move = nextMove(order, now);
  const payButton = (
    <Button
      tone="sm"
      {...(busy === "PAY" ? {} : { icon: "check" as const })}
      disabled={busy !== null}
      onClick={onPaid}
    >
      {busy === "PAY" ? "Đang lưu…" : "Đã nhận tiền"}
    </Button>
  );
  const handoverButton = (
    <Button tone="sm" icon="box" disabled={busy !== null} onClick={onHandover}>
      Bàn giao
    </Button>
  );

  if (order.status.state === "AWAITING_TRANSFER" && move === "MARK_PAID") {
    return (
      <div className="nextstep">
        <b>Bước tiếp theo: xác nhận đã nhận tiền</b>
        <span>
          Hạn {dateTimeLabel(order.status.dueAt)} · {vnd(orderTotalVnd(order))} · nội dung{" "}
          {transferReference(order.code)}
        </span>
        {payButton}
      </div>
    );
  }
  // Taken, nobody paid yet (slice B3a). A COD order leaves now and is paid at
  // the door; a card order waits for the shop to confirm the money by hand,
  // because no payment gateway is connected to confirm it.
  if (order.status.state === "RECEIVED") {
    const days = Math.floor((now.getTime() - Date.parse(order.placedAt)) / 86_400_000);
    return move === "HAND_OVER" ? (
      <div className="nextstep">
        <b>Bước tiếp theo: đóng gói và bàn giao</b>
        <span>
          Đã nhận đơn {sinceLabel(order.placedAt, now)} · COD, thu {vnd(orderTotalVnd(order))} khi
          giao · {orderUnits(order)} chiếc {orderItemsLabel(catalog, order)}
          {days >= HANDOVER_LATE_DAYS ? ` · trễ ${days} ngày` : ""}
        </span>
        {handoverButton}
      </div>
    ) : (
      <div className="nextstep">
        <b>Bước tiếp theo: xác nhận đã nhận tiền</b>
        <span>
          {PAYMENT_LABEL[order.payment]} · chưa nối cổng thanh toán, đối chiếu tay ·{" "}
          {vnd(orderTotalVnd(order))}
        </span>
        {payButton}
      </div>
    );
  }
  if (order.status.state === "PAID") {
    const days = Math.floor((now.getTime() - Date.parse(order.status.paidAt)) / 86_400_000);
    return (
      <div className="nextstep">
        <b>Bước tiếp theo: đóng gói và bàn giao</b>
        <span>
          Đã thanh toán {sinceLabel(order.status.paidAt, now)} · {orderUnits(order)} chiếc{" "}
          {orderItemsLabel(catalog, order)}
          {days >= HANDOVER_LATE_DAYS ? ` · trễ ${days} ngày` : ""}
        </span>
        {handoverButton}
      </div>
    );
  }
  // The step the approved mock had no button for: no courier reports a
  // delivery, so the shop records it by hand (`admin_mark_delivered()`).
  if (order.status.state === "SHIPPING") {
    return (
      <div className="nextstep">
        <b>Bước tiếp theo: chờ khách nhận</b>
        <span>
          Bàn giao {clockLabel(order.status.shippedAt)} · {dayMonth(order.status.shippedAt)} ·{" "}
          {order.status.carrier ? `${order.status.carrier} · ` : ""}
          {order.status.trackingCode} · khách thấy mã này ở tra cứu đơn và Đơn hàng
        </span>
        <Button
          tone="sm"
          {...(busy === "DELIVER" ? {} : { icon: "check" as const })}
          disabled={busy !== null}
          onClick={onDelivered}
        >
          {busy === "DELIVER" ? "Đang lưu…" : "Đã giao"}
        </Button>
      </div>
    );
  }
  return null;
}

interface Milestone {
  title: string;
  detail: string;
  state: "done" | "now" | "todo" | "late";
}

/**
 * The order as five milestones — the back office's own reading of it.
 *
 * Not the shopper's timeline (`orderTimeline`): that one answers "where is
 * my parcel", this one answers "what is the shop late on". So the middle
 * step is "Chờ bàn giao" with the age on it, and it turns red at the shop's
 * own promise of one day (`HANDOVER_LATE_DAYS` counts the row's red in the
 * queue for the same reason).
 */
function timelineOf(order: Order, now: Date, carrier?: string): Milestone[] {
  const placed: Milestone = {
    title: "Đã nhận đơn",
    detail: `${clockLabel(order.placedAt)} · ${dayMonth(order.placedAt)}`,
    state: "done",
  };

  switch (order.status.state) {
    case "AWAITING_TRANSFER":
      return [
        { ...placed, state: "now" },
        {
          title: "Chờ chuyển khoản",
          detail: `hạn ${dateTimeLabel(order.status.dueAt)}`,
          state: "todo",
        },
        { title: "Chờ bàn giao", detail: "sau khi tiền về", state: "todo" },
        { title: "Đang giao", detail: "sau khi bàn giao", state: "todo" },
        { title: "Đã giao", detail: "2–4 ngày", state: "todo" },
      ];
    // A COD or card order the shop has taken, with nothing paid — every one
    // checkout places since slice B2, and the back office reads them since
    // B3a. The order, then the steps still ahead of it.
    case "RECEIVED":
      return [
        { ...placed, state: "now" },
        { title: "Chờ bàn giao", detail: "", state: "todo" },
        { title: "Đang giao", detail: "sau khi bàn giao", state: "todo" },
        { title: "Đã giao", detail: "2–4 ngày", state: "todo" },
      ];
    case "PAID": {
      const days = Math.floor((now.getTime() - Date.parse(order.status.paidAt)) / 86_400_000);
      return [
        placed,
        {
          title: "Đã thanh toán",
          detail: `${clockLabel(order.status.paidAt)} · ${dayMonth(order.status.paidAt)}`,
          state: "done",
        },
        {
          title: "Chờ bàn giao",
          detail: `${sinceLabel(order.status.paidAt, now)} · mục tiêu bàn giao trong 1 ngày sau thanh toán`,
          state: days >= HANDOVER_LATE_DAYS ? "late" : "now",
        },
        { title: "Đang giao", detail: "sau khi bàn giao", state: "todo" },
        { title: "Đã giao", detail: "2–4 ngày", state: "todo" },
      ];
    }
    case "SHIPPING":
      return [
        placed,
        // A COD parcel on the road has collected nothing yet: no "paid" step.
        ...(order.payment === "COD"
          ? []
          : [{ title: "Đã thanh toán", detail: "", state: "done" as const }]),
        { title: "Đã bàn giao", detail: "", state: "done" },
        {
          title: "Đang giao",
          detail: `${clockLabel(order.status.shippedAt)} · ${dayMonth(order.status.shippedAt)} · ${carrier ? `${carrier} · ` : ""}${order.status.trackingCode}`,
          state: "now",
        },
        { title: "Đã giao", detail: "2–4 ngày", state: "todo" },
      ];
    case "DELIVERED":
      return [
        placed,
        { title: "Đã thanh toán", detail: "", state: "done" },
        { title: "Đã bàn giao", detail: "", state: "done" },
        { title: "Đang giao", detail: "", state: "done" },
        {
          title: "Đã giao",
          detail: `${clockLabel(order.status.deliveredAt)} · ${dayMonth(order.status.deliveredAt)}`,
          state: "now",
        },
      ];
    case "CANCELLED":
      // A cancelled order does not show the steps it never reached: drawing
      // "Đang giao" greyed out under a cancellation suggests it is coming.
      return [
        placed,
        {
          title: `Đã huỷ · ${order.status.reason}`,
          detail: `${clockLabel(order.status.cancelledAt)} · ${dayMonth(order.status.cancelledAt)}`,
          state: "late",
        },
      ];
  }
}
