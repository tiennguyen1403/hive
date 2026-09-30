"use client";

import { Check, MoreHorizontal, Package, Pencil, Printer, Send, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState, useTransition } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS } from "@/data/colors";
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
import { timelineOf, timelineSteps } from "@/lib/admin-timeline";
import type { Catalog } from "@/lib/catalog";
import { effectiveOrder } from "@/lib/customer-orders";
import { customerFacts, issueOf } from "@/lib/customer-tags";
import { clockLabel, dateTimeLabel, dayMonth, sinceLabel } from "@/lib/datetime";
import type { AdminEvent } from "@/lib/db/event-dto";
import { codFeeRow } from "@/lib/feed-order";
import { LEX, issueNo, styleName } from "@/lib/lexicon";
import { plainVnd, vnd } from "@/lib/money";
import { PAYMENT_LABEL, STATE_LABEL } from "@/lib/order-labels";
import { addressEditReason, internalNotes } from "@/lib/order-notes";
import { orderSubtotalVnd, orderTotalVnd, orderUnits, transferReference } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { photoUrl } from "@/lib/photos";
import { deliveryOption, EXPRESS_FEE_VND } from "@/lib/shipping";
import { Avatar } from "@/registry/components/avatar/avatar";
import { Badge } from "@/registry/components/badge/badge";
import { Breadcrumb } from "@/registry/components/breadcrumb/breadcrumb";
import { Button } from "@/registry/components/button/button";
import { DropdownMenu } from "@/registry/components/dropdown-menu/dropdown-menu";
import { Input } from "@/registry/components/input/input";
import { Stepper } from "@/registry/components/stepper/stepper";
import { ArcAddressForm } from "./ArcAddressForm";
import { ArcButtonLink } from "./ArcButtonLink";
import { ArcCancelOrderDialog } from "./ArcCancelOrderDialog";
import { ArcHandoverForm } from "./ArcHandoverForm";
import { monogramName, TAG_TONE, TONE } from "./ArcOrderCells";
import styles from "./ArcOrderScreen.module.css";
import page from "./ArcPage.module.css";
import { useArcToast } from "./useArcToast";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/** Which move is on its way to the server, so only its own button says so. */
type Busy = "PAY" | "HANDOVER" | "DELIVER" | "CANCEL" | "NOTE" | "ADDRESS" | null;

/**
 * One order, and everything the shop can do to it, in the Arc frame (round
 * v5 slice 1): v3's `AdminOrderScreen` (`components/admin/AdminOrderScreen.tsx`)
 * rule for rule and word for word, drawn with Arc's parts.
 *
 * EVERY BUTTON HERE WRITES TO THE DATABASE (slice B3a). Confirming the money,
 * handing over, recording the delivery, cancelling, a note, a new address:
 * each is a Server Action (`lib/actions/admin.ts`) with a state guard, and
 * each writes its line in the events in the same transaction. The notes are
 * this order's events read a second way (`lib/order-notes.ts`), so they
 * cannot disagree with the status.
 *
 * Only the move the guard allows next is drawn (`nextMove`): a button the
 * database would refuse is a button that lies (DESIGN.md §9 rule 3). "Gửi lại
 * xác nhận" is drawn disabled and says why: no mail server is connected.
 *
 * The next move sits in the one muted block, with the page's one primary
 * button; "Bàn giao" opens its form in the same place. A delivered or a
 * cancelled order has no next step, and no block.
 */
export function ArcOrderScreen({
  order: base,
  events,
  customerOrders,
  nowIso,
  openHandover,
}: {
  /** The order as the database has it (`admin_orders()`). */
  order: AdminOrder;
  /** Its own events, oldest first: the notes and the address history. */
  events: AdminEvent[];
  /** Every order of the account it belongs to, for the customer panel. */
  customerOrders: AdminOrder[];
  nowIso: string;
  /** Arrived from the queue's "Đóng gói và bàn giao": the form opens at once. */
  openHandover: boolean;
}) {
  const catalog = useCatalog();
  const say = useArcToast();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const order = effectiveOrder(base, now);
  const code = String(order.code);
  const [handing, setHanding] = useState(openHandover && nextMove(order, now) === "HAND_OVER");
  const [editingAddress, setEditingAddress] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [, startAction] = useTransition();
  const ids = { lines: useId(), notes: useId(), address: useId(), journey: useId(), customer: useId() };

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
  const issue = issueOf(catalog, order);
  const subtotal = orderSubtotalVnd(order);
  const codFee = codFeeRow(order);
  const total = orderTotalVnd(order);
  const province = findProvince(order.shipTo.provinceCode);
  const ward = findWard(order.shipTo.provinceCode, order.shipTo.wardCode);
  const carrier = order.status.state === "SHIPPING" ? order.status.carrier : undefined;
  const delivery = deliveryOption(order.shippingFeeVnd === EXPRESS_FEE_VND ? "EXPRESS" : "STANDARD");
  const editReason = addressEditReason(events, code);
  const facts = owner ? customerFacts(catalog, customerOrders, catalog.currentDropNo, now) : null;
  const notes = internalNotes(events, order);
  const journey = timelineSteps(timelineOf(order, now, carrier));

  /** Before handover, the address can still be changed. After, it cannot. */
  const beforeHandover = canEditAddress(order, now);

  function addNote() {
    const text = note.trim();
    if (!text) return say("Ghi chú trống thì chưa có gì để lưu", "error");
    act("NOTE", () => noteOrder(code, text), () => setNote(""));
  }

  return (
    <div className={page.page}>
      <div className={page.masthead}>
        <Breadcrumb
          ariaLabel="Đường dẫn"
          items={[{ label: "Đơn hàng", href: "/admin/orders" }, { label: code }]}
        />
        <header className={page.header}>
          <div className={page.headRow}>
            <div className={page.titleRow}>
              <h1 className={page.title}>{code}</h1>
              <Badge tone={TONE[state.tone]} size="sm">
                {state.text}
              </Badge>
            </div>
            <div className={page.actions}>
              <Badge size="sm">Dữ liệu mẫu</Badge>
              {/* No mail server is connected, so nothing can be sent: the
                  button says so rather than pretending (DESIGN.md §9 rule 3).
                  Disabled, so no icon. */}
              <Button variant="secondary" size="sm" disabled>
                Gửi lại xác nhận · đang chuẩn bị
              </Button>
              <ArcButtonLink variant="secondary" size="sm" href={`/admin/slips?codes=${code}`}>
                <Printer {...ICON} />
                In phiếu giao
              </ArcButtonLink>
              {canCancel(order, now) && (
                <DropdownMenu
                  iconOnly
                  label="Thao tác khác"
                  icon={<MoreHorizontal {...ICON} />}
                  items={[
                    {
                      label: "Huỷ đơn",
                      icon: <X {...ICON} />,
                      destructive: true,
                      onSelect: () => setCancelling(true),
                    },
                  ]}
                />
              )}
            </div>
          </div>
          <p className={page.sub}>
            Đặt {clockLabel(order.placedAt)} · {dayMonth(order.placedAt)}
            {owner ? ` · ${owner.name} · ${formatPhone(order.shipTo.phone)}` : ""} ·{" "}
            {PAYMENT_LABEL[order.payment]}
            {/* An order of fixed styles only (slice B5) belongs to no issue. */}
            {issue !== undefined ? ` · ${LEX.t} ${issueNo(issue)}` : ""}
          </p>
        </header>
      </div>

      {handing ? (
        <ArcHandoverForm
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
      ) : (
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

      <div className={styles.split}>
        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby={ids.lines}>
            <div className={styles.panelHead}>
              <div className={styles.panelHeading}>
                <h2 id={ids.lines} className={styles.panelTitle}>
                  Món trong đơn
                </h2>
                <p className={styles.panelSub}>{orderUnits(order)} chiếc</p>
              </div>
            </div>
            <table className={styles.lines}>
              <thead>
                <tr>
                  <th scope="col">Mẫu</th>
                  <th scope="col">Màu · size</th>
                  <th scope="col" className={styles.num}>
                    <abbr title="Số lượng">SL</abbr>
                  </th>
                  <th scope="col" className={styles.num}>
                    Đơn giá
                  </th>
                  <th scope="col" className={styles.num}>
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l, i) => {
                  const p = catalog.byId.get(l.productId);
                  return (
                    <tr key={`${l.productId}-${l.size}-${l.color}-${i}`}>
                      <td>
                        <span className={styles.item}>
                          <Image
                            className={styles.thumb}
                            src={photoUrl(p?.photoKeys[0] ?? "hero", 120)}
                            alt=""
                            width={36}
                            height={45}
                          />
                          <span>
                            <span className={styles.itemName}>{p ? styleName(p.name, p.dropNo) : "—"}</span>{" "}
                            <span className={styles.itemKind}>· {p?.kind ?? ""}</span>
                          </span>
                        </span>
                      </td>
                      <td className={styles.nowrap}>
                        {COLORS[l.color].label} · {l.size}
                      </td>
                      <td className={styles.num}>{l.qty}</td>
                      <td className={styles.num}>{plainVnd(l.unitPriceVnd)}</td>
                      <td className={styles.num}>{plainVnd(l.unitPriceVnd * l.qty)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <dl className={styles.sums}>
              <div className={styles.sumRow}>
                <dt>Tạm tính</dt>
                <dd>{vnd(subtotal)}</dd>
              </div>
              {order.discountVnd > 0 && (
                <div className={styles.sumRow}>
                  <dt>Giảm giá{order.promo ? ` · ${order.promo}` : ""}</dt>
                  <dd>−{vnd(order.discountVnd)}</dd>
                </div>
              )}
              <div className={styles.sumRow}>
                <dt>Phí giao</dt>
                <dd>{vnd(order.shippingFeeVnd)}</dd>
              </div>
              {/* An order placed COD since slice B2 carries the surcharge in
                  its total; without its line the sums would not add up.
                  The shopper's receipt prints the same line (`codFeeRow`). */}
              {codFee && (
                <div className={styles.sumRow}>
                  <dt>{codFee.label}</dt>
                  <dd>{codFee.value}</dd>
                </div>
              )}
              <div className={`${styles.sumRow} ${styles.total}`}>
                {/* Three readings, not two. "Tổng đã thanh toán" on an order
                    nobody has paid for yet, or on one cancelled before any
                    money came, is the screen inventing a payment. */}
                <dt>
                  {order.status.state === "CANCELLED"
                    ? "Tổng đơn đã huỷ"
                    : isPaidFor(order)
                      ? "Tổng đã thanh toán"
                      : "Tổng cần thu"}
                </dt>
                <dd>{vnd(total)}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.panel} aria-labelledby={ids.notes}>
            <div className={styles.panelHead}>
              <div className={styles.panelHeading}>
                <h2 id={ids.notes} className={styles.panelTitle}>
                  Ghi chú nội bộ
                </h2>
                <p className={styles.panelSub}>khách không thấy</p>
              </div>
            </div>
            {notes.length > 0 && (
              <ul className={styles.notes}>
                {notes.map((n, i) => (
                  <li className={n.system ? `${styles.note} ${styles.noteSystem}` : styles.note} key={`${n.at}-${i}`}>
                    <span className={styles.noteMeta}>
                      {n.author || "Hệ thống"} · {clockLabel(n.at)} · {dayMonth(n.at)}
                    </span>
                    {n.text}
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.addNote}>
              <Input
                label="Ghi chú nội bộ"
                hideLabel
                placeholder="Thêm ghi chú…"
                value={note}
                disabled={busy === "NOTE"}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addNote();
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                loading={busy === "NOTE"}
                disabled={busy !== null && busy !== "NOTE"}
                onClick={addNote}
              >
                {busy === null ? <Send {...ICON} /> : null}
                {busy === "NOTE" ? "Đang lưu…" : "Thêm"}
              </Button>
            </div>
          </section>
        </div>

        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby={ids.address}>
            <div className={styles.panelHead}>
              <h2 id={ids.address} className={styles.panelTitle}>
                Giao tới
              </h2>
              {beforeHandover && !editingAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={styles.edgeEnd}
                  onClick={() => setEditingAddress(true)}
                >
                  <Pencil {...ICON} />
                  Sửa
                </Button>
              )}
            </div>
            {editingAddress ? (
              <ArcAddressForm
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
                <div className={styles.address}>
                  <p>
                    <strong>{order.shipTo.recipient}</strong> · {formatPhone(order.shipTo.phone)}
                  </p>
                  <p>
                    {order.shipTo.line}
                    {ward ? `, ${wardLabel(ward)}` : ""}
                    {province ? `, ${provinceLabel(province)}` : ""}
                  </p>
                  <p className={styles.muted}>{delivery.label}</p>
                </div>
                {editReason && <p className={styles.fine}>Đã sửa địa chỉ · lý do: {editReason}</p>}
                {!beforeHandover && (
                  <p className={styles.fine}>
                    {order.status.state === "CANCELLED"
                      ? "Đơn đã huỷ, không sửa được."
                      : "Đã bàn giao, không sửa được."}
                  </p>
                )}
              </>
            )}
          </section>

          <section className={styles.panel} aria-labelledby={ids.journey}>
            <div className={styles.panelHead}>
              <h2 id={ids.journey} className={styles.panelTitle}>
                Hành trình
              </h2>
            </div>
            <Stepper
              orientation="vertical"
              steps={journey.steps}
              current={journey.current}
              label="Hành trình"
              completeLabel="Đã xong mọi mốc"
            />
          </section>

          {owner && facts && (
            <section className={styles.panel} aria-labelledby={ids.customer}>
              <div className={styles.panelHead}>
                <h2 id={ids.customer} className={styles.panelTitle}>
                  Khách
                </h2>
                <Link className={styles.textLink} href={`/admin/customers/${customerKey(owner)}`}>
                  Hồ sơ
                </Link>
              </div>
              <div className={styles.who}>
                <Avatar name={monogramName(owner.name)} size="md" aria-hidden="true" />
                <p className={styles.whoName}>
                  {owner.name}
                  {facts.tag && (
                    <Badge tone={TAG_TONE[facts.tag.tone]} size="sm">
                      {facts.tag.label}
                    </Badge>
                  )}
                </p>
                <p className={styles.whoFacts}>
                  {facts.orders.length} đơn · {vnd(facts.spentVnd)} ·{" "}
                  {facts.issues.length > 0
                    ? `mua ${LEX.tl} ${facts.issues.map((n) => issueNo(n)).join(", ")}`
                    : "chưa có đơn đã thanh toán"}{" "}
                  · {owner.email}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      <ArcCancelOrderDialog
        order={cancelling ? order : null}
        pending={busy === "CANCEL"}
        onClose={() => setCancelling(false)}
        onConfirm={(reason, why) =>
          act("CANCEL", () => cancelOrderAdmin(code, reason, why), () => setCancelling(false))
        }
      />
    </div>
  );
}

/**
 * The next move, stated before anybody has to work it out: the SQL guard's
 * own next edge (`nextMove`), so the one button drawn is one that works. v3's
 * `NextStep`, sentence for sentence, in the muted block with the page's one
 * primary button.
 *
 * A delivered order and a cancelled one have no next step here, and the
 * block is simply not drawn. While its move is on its way the button shows
 * Arc's spinner with "Đang lưu…"; while another move is, it is disabled, and
 * a disabled button carries no icon.
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
      variant="primary"
      size="sm"
      loading={busy === "PAY"}
      disabled={busy !== null && busy !== "PAY"}
      onClick={onPaid}
    >
      {busy === null ? <Check {...ICON} /> : null}
      {busy === "PAY" ? "Đang lưu…" : "Đã nhận tiền"}
    </Button>
  );
  const handoverButton = (
    <Button variant="primary" size="sm" disabled={busy !== null} onClick={onHandover}>
      {busy === null ? <Package {...ICON} /> : null}
      Bàn giao
    </Button>
  );

  if (order.status.state === "AWAITING_TRANSFER" && move === "MARK_PAID") {
    return (
      <Block title="Bước tiếp theo: xác nhận đã nhận tiền" button={payButton}>
        Hạn {dateTimeLabel(order.status.dueAt)} · {vnd(orderTotalVnd(order))} · nội dung{" "}
        {transferReference(order.code)}
      </Block>
    );
  }
  // Taken, nobody paid yet (slice B3a). A COD order leaves now and is paid at
  // the door; a card order waits for the shop to confirm the money by hand,
  // because no payment gateway is connected to confirm it.
  if (order.status.state === "RECEIVED") {
    const days = Math.floor((now.getTime() - Date.parse(order.placedAt)) / 86_400_000);
    return move === "HAND_OVER" ? (
      <Block title="Bước tiếp theo: đóng gói và bàn giao" button={handoverButton}>
        Đã nhận đơn {sinceLabel(order.placedAt, now)} · COD, thu {vnd(orderTotalVnd(order))} khi giao ·{" "}
        {orderUnits(order)} chiếc {orderItemsLabel(catalog, order)}
        {days >= HANDOVER_LATE_DAYS ? ` · trễ ${days} ngày` : ""}
      </Block>
    ) : (
      <Block title="Bước tiếp theo: xác nhận đã nhận tiền" button={payButton}>
        {PAYMENT_LABEL[order.payment]} · đối chiếu tay · {vnd(orderTotalVnd(order))}
      </Block>
    );
  }
  if (order.status.state === "PAID") {
    const days = Math.floor((now.getTime() - Date.parse(order.status.paidAt)) / 86_400_000);
    return (
      <Block title="Bước tiếp theo: đóng gói và bàn giao" button={handoverButton}>
        Đã thanh toán {sinceLabel(order.status.paidAt, now)} · {orderUnits(order)} chiếc{" "}
        {orderItemsLabel(catalog, order)}
        {days >= HANDOVER_LATE_DAYS ? ` · trễ ${days} ngày` : ""}
      </Block>
    );
  }
  // No courier reports a delivery, so the shop records it by hand
  // (`admin_mark_delivered()`).
  if (order.status.state === "SHIPPING") {
    return (
      <Block
        title="Bước tiếp theo: chờ khách nhận"
        button={
          <Button
            variant="primary"
            size="sm"
            loading={busy === "DELIVER"}
            disabled={busy !== null && busy !== "DELIVER"}
            onClick={onDelivered}
          >
            {busy === null ? <Check {...ICON} /> : null}
            {busy === "DELIVER" ? "Đang lưu…" : "Đã giao"}
          </Button>
        }
      >
        Bàn giao {clockLabel(order.status.shippedAt)} · {dayMonth(order.status.shippedAt)} ·{" "}
        {order.status.carrier ? `${order.status.carrier} · ` : ""}
        {order.status.trackingCode} · khách thấy mã này ở tra cứu đơn và Đơn hàng
      </Block>
    );
  }
  return null;
}

/** The muted block: what to do next and its details, and the one button that does it. */
function Block({
  title,
  button,
  children,
}: {
  title: string;
  button: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.next}>
      <div className={styles.nextText}>
        <p className={styles.nextTitle}>{title}</p>
        <p className={styles.nextDetail}>{children}</p>
      </div>
      {button}
    </div>
  );
}
