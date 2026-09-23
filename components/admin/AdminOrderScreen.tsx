"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AddressEditForm } from "@/components/admin/AddressEditForm";
import { AdminTop } from "@/components/admin/AdminTop";
import { CancelOrderModal } from "@/components/admin/CancelOrderModal";
import { HandoverForm } from "@/components/admin/HandoverForm";
import { useSim } from "@/components/admin/SimContext";
import { ActionMenu } from "@/components/admin/Table3";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { byId, COLORS } from "@/data/catalog";
import { customerById } from "@/data/customers";
import { ORDERS, ordersOf } from "@/data/orders";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import type { Order } from "@/data/types";
import { HANDOVER_LATE_DAYS, orderItemsLabel } from "@/lib/admin-rows";
import {
  addressEditReason,
  carrierOf,
  simNotes,
  simOrders,
  type SimNote,
} from "@/lib/admin-sim";
import { customerFacts, issueOf } from "@/lib/customer-tags";
import { effectiveOrder } from "@/lib/customer-orders";
import { clockLabel, dateTimeLabel, dayMonth, sinceLabel } from "@/lib/datetime";
import { LEX, issueNo } from "@/lib/lexicon";
import { CURRENT_DROP_NO } from "@/data/catalog";
import { plainVnd, vnd } from "@/lib/money";
import { PAYMENT_LABEL, STATE_LABEL } from "@/lib/order-labels";
import { transferReference } from "@/lib/placed-order";
import { orderSubtotalVnd, orderTotalVnd, orderUnits } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { photoUrl } from "@/lib/photos";
import { initialsOf } from "@/lib/initials";
import { deliveryOption, EXPRESS_FEE_VND } from "@/lib/shipping";

/**
 * One order, and everything the shop can do to it.
 *
 * The mock put "Đánh dấu đã thanh toán" up here with nothing behind it.
 * There is still no server — but there is now a record of what this browser
 * did (`lib/admin-sim.ts`), so the button marks the order paid FOR REAL as
 * far as this machine is concerned: the state changes, the queue loses a
 * row, the KPI moves, a note is written, the activity log gains a line, and
 * a reload finds it all still true. What it never does is pretend something
 * left the building; the sidebar's counter says where it lives.
 *
 * The strip of black cloth at the top is `.nextstep` — the one dark area on
 * this screen, and it earns it: the next move is the reason the screen was
 * opened. A settled order (delivered, cancelled) has no next step here, and
 * inventing one would put a job on the screen that nobody can do.
 */
export function AdminOrderScreen({
  code,
  nowIso,
  openHandover,
}: {
  code: string;
  nowIso: string;
  /** Arrived from the queue's "Đóng gói và bàn giao" — open the panel at once. */
  openHandover: boolean;
}) {
  const { sim, run, runMany, say } = useSim();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [handing, setHanding] = useState(openHandover);
  const [editingAddress, setEditingAddress] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [note, setNote] = useState("");

  const base = ORDERS.find((o) => String(o.code) === code)!;
  const order = effectiveOrder(simOrders([base], sim)[0]!, now);
  const customer = customerById.get(order.customerId);
  const state = STATE_LABEL[order.status.state];
  const subtotal = orderSubtotalVnd(order);
  const total = orderTotalVnd(order);
  const province = findProvince(order.shipTo.provinceCode);
  const ward = findWard(order.shipTo.provinceCode, order.shipTo.wardCode);
  const carrier = carrierOf(code, sim);
  const delivery = deliveryOption(
    order.shippingFeeVnd === EXPRESS_FEE_VND ? "EXPRESS" : "STANDARD",
  );
  const editReason = addressEditReason(code, sim);
  const facts = customer
    ? customerFacts(ordersOf(customer.id), CURRENT_DROP_NO, now)
    : null;

  const notes = [...baseNotes(base), ...simNotes(code, sim)].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  );

  /** Before handover, the address can still be changed. After, it cannot. */
  const beforeHandover =
    order.status.state === "AWAITING_TRANSFER" || order.status.state === "PAID";

  function addNote() {
    const text = note.trim();
    if (!text) return say("Ghi chú trống thì chưa có gì để lưu");
    run({ kind: "ORDER_NOTE", code, text }, "Đã thêm ghi chú · lưu trên trình duyệt này");
    setNote("");
  }

  function resend() {
    const email = customer?.email ?? "—";
    run(
      { kind: "ORDER_CONFIRMATION_RESENT", code, email },
      `Đã ghi nhật ký: gửi lại xác nhận ${code} tới ${email} (chưa có máy chủ gửi)`,
    );
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
            {customer ? ` · ${customer.name} · ${formatPhone(order.shipTo.phone)}` : ""} ·{" "}
            {PAYMENT_LABEL[order.payment]} · {LEX.t} {issueNo(issueOf(order) ?? 0)}
          </span>
        }
      >
        <Button tone="ink sm" icon="send" onClick={resend}>
          Gửi lại xác nhận
        </Button>
        <ButtonLink tone="ink sm" icon="printer" href={`/admin/slips?codes=${code}`}>
          In phiếu giao
        </ButtonLink>
        {order.status.state !== "CANCELLED" && order.status.state !== "DELIVERED" && (
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

      {!handing && <NextStep order={order} now={now} onHandover={() => setHanding(true)} onPaid={() =>
        run({ kind: "ORDER_PAID", code }, `${code} → đã thanh toán · ghi nhật ký`)
      } />}

      {handing && (
        <HandoverForm
          shippingFeeVnd={order.shippingFeeVnd}
          placeholder={`VNP-${code.replace(/\D/g, "")}-01`}
          onCancel={() => setHanding(false)}
          onConfirm={(who, trackingCode, courierNote) => {
            // One press, so one write: `run` twice in a handler would close
            // over the same overlay and the note would overwrite the
            // handover (`SimContext.runMany`).
            runMany(
              [
                { kind: "ORDER_SHIPPED", code, carrier: who, trackingCode },
                ...(courierNote
                  ? [
                      {
                        kind: "ORDER_NOTE" as const,
                        code,
                        text: `Ghi chú cho khách: ${courierNote}`,
                      },
                    ]
                  : []),
              ],
              `${code} → đang giao · ${trackingCode} · khách thấy mã này ở tra cứu đơn`,
            );
            setHanding(false);
          }}
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
                  const p = byId.get(l.productId);
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
                  that was cancelled before anybody paid is the screen
                  inventing a payment. */}
              <span>
                {order.status.state === "AWAITING_TRANSFER"
                  ? "Tổng cần thu"
                  : order.status.state === "CANCELLED"
                    ? "Tổng đơn đã huỷ"
                    : "Tổng đã thanh toán"}
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
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addNote();
                  }}
                />
                <Button tone="ink sm" icon="send" onClick={addNote}>
                  Thêm
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
                  onCancel={() => setEditingAddress(false)}
                  onSave={(next, reason) => {
                    run(
                      {
                        kind: "ORDER_ADDRESS_EDITED",
                        code,
                        before: order.shipTo,
                        after: next,
                        reason,
                      },
                      `Đã sửa địa chỉ giao ${code} · ghi nhật ký`,
                    );
                    setEditingAddress(false);
                  }}
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

          {customer && facts && (
            <section className="panel3" style={{ marginTop: 16 }}>
              <h2>
                Khách
                <Link className="more" href={`/admin/customers/${customer.id}`}>
                  Hồ sơ
                </Link>
              </h2>
              <div className="bd ctagrow">
                <span className="avatar" aria-hidden="true">
                  {initialsOf(customer.name)}
                </span>
                <b>{customer.name}</b>
                {facts.tag && (
                  <span className={`ctag ${facts.tag.tone}`.trim()}>{facts.tag.label}</span>
                )}
                <span className="sub">
                  {facts.orders.length} đơn · {vnd(facts.spentVnd)} ·{" "}
                  {facts.issues.length > 0
                    ? `mua ${LEX.tl} ${facts.issues.map((n) => issueNo(n)).join(", ")}`
                    : "chưa có đơn đã thanh toán"}{" "}
                  · {customer.email}
                </span>
              </div>
            </section>
          )}
        </div>
      </div>

      <CancelOrderModal
        order={cancelling ? order : null}
        onClose={() => setCancelling(false)}
        onConfirm={(reason, why) => {
          run(
            { kind: "ORDER_CANCELLED", code, reason, note: why },
            `${code} đã huỷ · lý do: ${reason.toLocaleLowerCase("vi")}`,
          );
          setCancelling(false);
        }}
      />
    </>
  );
}

/**
 * The next move, stated before anybody has to work it out.
 *
 * Only the three states where the ball is with the shop get one. A delivered
 * order and a cancelled one have no next step HERE, and the strip is simply
 * not drawn — an empty banner saying "nothing to do" is furniture.
 */
function NextStep({
  order,
  now,
  onHandover,
  onPaid,
}: {
  order: Order;
  now: Date;
  onHandover: () => void;
  onPaid: () => void;
}) {
  if (order.status.state === "AWAITING_TRANSFER") {
    return (
      <div className="nextstep">
        <b>Bước tiếp theo: xác nhận đã nhận tiền</b>
        <span>
          Hạn {dateTimeLabel(order.status.dueAt)} · {vnd(orderTotalVnd(order))} · nội dung{" "}
          {transferReference(order.code)}
        </span>
        <Button tone="sm" icon="check" onClick={onPaid}>
          Đã nhận tiền
        </Button>
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
          {orderItemsLabel(order)}
          {days >= HANDOVER_LATE_DAYS ? ` · trễ ${days} ngày` : ""}
        </span>
        <Button tone="sm" icon="box" onClick={onHandover}>
          Bàn giao
        </Button>
      </div>
    );
  }
  if (order.status.state === "SHIPPING") {
    return (
      <div className="nextstep">
        <b>Bước tiếp theo: chờ khách nhận</b>
        <span>
          Bàn giao {clockLabel(order.status.shippedAt)} · {dayMonth(order.status.shippedAt)} ·{" "}
          {order.status.trackingCode} · khách tra được mã này ở màn đơn của họ
        </span>
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
        { title: "Đã thanh toán", detail: "", state: "done" },
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

/**
 * The notes the order carries before anybody typed one.
 *
 * Derived from the FIXTURE status, never from the merged one: an action taken
 * in this browser already writes its own note (`simNotes`), and deriving a
 * second one from the state it produced would print everything twice.
 */
function baseNotes(o: Order): SimNote[] {
  const sys = (text: string, at: string): SimNote => ({ text, author: "", at, system: true });
  switch (o.status.state) {
    case "PAID":
      return [
        sys(
          `Chuyển khoản khớp nội dung ${transferReference(o.code)} · ${vnd(orderTotalVnd(o))}`,
          o.status.paidAt,
        ),
      ];
    case "SHIPPING":
      return [sys(`Bàn giao · mã vận đơn ${o.status.trackingCode}.`, o.status.shippedAt)];
    case "DELIVERED":
      return [sys("Khách đã nhận hàng.", o.status.deliveredAt)];
    case "CANCELLED":
      return [sys(`Huỷ đơn · lý do: ${o.status.reason}.`, o.status.cancelledAt)];
    default:
      return [];
  }
}
