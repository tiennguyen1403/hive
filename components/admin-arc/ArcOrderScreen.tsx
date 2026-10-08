"use client";

import { Check, MoreHorizontal, Package, Pencil, Printer, Send, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS, colorLabel } from "@/data/colors";
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
import { canCancel, canEditAddress, isPaidFor, isSampleOrder, nextMove, type AdminOrder } from "@/lib/admin-orders";
import { HANDOVER_LATE_DAYS, orderItemsLabel, orderItemsLang } from "@/lib/admin-rows";
import { timelineOf, timelineSteps } from "@/lib/admin-timeline";
import { carrierLabel } from "@/lib/carrier";
import type { Catalog } from "@/lib/catalog";
import { currentIssueNo } from "@/lib/current-issue";
import { effectiveOrder } from "@/lib/customer-orders";
import { customerFacts, issueOf } from "@/lib/customer-tags";
import { clockLabel, dayMonth, momentLabel, sinceLabel } from "@/lib/datetime";
import type { AdminEvent } from "@/lib/db/event-dto";
import { codFeeRow } from "@/lib/feed-order";
import { picker, plural, type Locale } from "@/lib/i18n";
import { LEX, issueLabel, issueNo, lexicon, styleName } from "@/lib/lexicon";
import { plainVnd, vnd } from "@/lib/money";
import { adminPaymentDetail, adminPaymentLabel, orderStateLabel } from "@/lib/order-labels";
import { addressEditReason, internalNotes } from "@/lib/order-notes";
import { orderSubtotalVnd, orderTotalVnd, orderUnits, transferReference } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { storedLang } from "@/lib/admin-text";
import { photoUrl } from "@/lib/photos";
import { nameLang, productText } from "@/lib/product-text";
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
import book from "./ArcOrdersScreen.module.css";
import page from "./ArcPage.module.css";
import { phraseNode } from "./ArcPhrase";
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
 *
 * In the page's language since round v6 slice E4 (`useLocale()`): the
 * glossary's states and ways of paying, a style by `productText` with the
 * English code ("D05 – MUỐI"), the carrier by `carrierLabel`, the amounts the
 * English way. What somebody typed or the customer is called is printed as
 * stored, and on an English page its element says `lang="vi"`. The Vietnamese
 * markup is unchanged.
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
  const locale = useLocale();
  const t = picker(locale);
  /**
   * The delivery address on an English page: printed as stored, said in
   * Vietnamese (QĐ-40), as the shop's own pages mark it. A name or a typed
   * reason is marked only when it is Vietnamese (`storedLang`).
   */
  const own = locale === "en" ? ("vi" as const) : undefined;
  const say = useArcToast();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const order = effectiveOrder(base, now);
  const code = String(order.code);
  const [handing, setHanding] = useState(openHandover && nextMove(order, now) === "HAND_OVER");
  const [editingAddress, setEditingAddress] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  /** The heading's actions: "Thao tác khác", which opens the cancel dialog, and "In phiếu giao". */
  const actions = useRef<HTMLDivElement>(null);
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
  // A card order waiting for its money is "Chờ trả thẻ" (slice B18).
  const state = orderStateLabel(order, locale);
  const issue = issueOf(catalog, order);
  const subtotal = orderSubtotalVnd(order);
  const codFee = codFeeRow(order, locale);
  const total = orderTotalVnd(order);
  const province = findProvince(order.shipTo.provinceCode);
  const ward = findWard(order.shipTo.provinceCode, order.shipTo.wardCode);
  const carrier = order.status.state === "SHIPPING" ? order.status.carrier : undefined;
  const delivery = deliveryOption(order.shippingFeeVnd === EXPRESS_FEE_VND ? "EXPRESS" : "STANDARD");
  const editReason = addressEditReason(events, code);
  // "mới" is read against the current issue, as on the customer table and
  // the customer's own page (slice 5a): the one selling, else the one that
  // closed last; 0, a catalogue without issues, is none.
  const facts = owner
    ? customerFacts(catalog, customerOrders, currentIssueNo(catalog, now) || null, now, locale)
    : null;
  const notes = internalNotes(events, order, locale);
  const journey = timelineSteps(timelineOf(order, now, carrier, locale));

  /** Before handover, the address can still be changed. After, it cannot. */
  const beforeHandover = canEditAddress(order, now);
  /**
   * A real customer's address arrives masked (QĐ-44, `lib/admin-mask.ts`), and
   * the public back office does not rewrite it: no "Sửa" on their order, and
   * `editAddress` refuses it all the same.
   */
  const editable = beforeHandover && isSampleOrder(order);

  function addNote() {
    const text = note.trim();
    if (!text) {
      return say(
        t({ vi: "Ghi chú trống thì chưa có gì để lưu", en: "The note is empty, nothing to save" }),
        "error",
      );
    }
    act("NOTE", () => noteOrder(code, text), () => setNote(""));
  }

  return (
    <div className={page.page}>
      <div className={page.masthead}>
        <Breadcrumb
          ariaLabel={t({ vi: "Đường dẫn", en: "Breadcrumb" })}
          items={[{ label: t({ vi: "Đơn hàng", en: "Orders" }), href: "/admin/orders" }, { label: code }]}
        />
        <header className={page.header}>
          <div className={page.headRow}>
            <div className={page.titleRow}>
              <h1 className={page.title}>{code}</h1>
              <Badge tone={TONE[state.tone]} size="sm">
                {state.text}
              </Badge>
            </div>
            <div className={page.actions} ref={actions}>
              <Badge size="sm">{t({ vi: "Dữ liệu mẫu", en: "Demo data" })}</Badge>
              {/* No mail server is connected, so nothing can be sent: the
                  button says so rather than pretending (DESIGN.md §9 rule 3).
                  Disabled, so no icon. */}
              <Button variant="secondary" size="sm" disabled>
                {t({ vi: "Gửi lại xác nhận · đang chuẩn bị", en: "Resend confirmation · coming soon" })}
              </Button>
              <ArcButtonLink variant="secondary" size="sm" href={`/admin/slips?codes=${code}`}>
                <Printer {...ICON} />
                {t({ vi: "In phiếu giao", en: "Print delivery slip" })}
              </ArcButtonLink>
              {canCancel(order, now) && (
                <DropdownMenu
                  iconOnly
                  label={t({ vi: "Thao tác khác", en: "More actions" })}
                  icon={<MoreHorizontal {...ICON} />}
                  items={[
                    {
                      label: t({ vi: "Huỷ đơn", en: "Cancel order" }),
                      icon: <X {...ICON} />,
                      destructive: true,
                      onSelect: () => setCancelling(true),
                    },
                  ]}
                />
              )}
            </div>
          </div>
          {locale === "vi" ? (
            <p className={page.sub}>
              Đặt {clockLabel(order.placedAt)} · {dayMonth(order.placedAt)}
              {owner ? ` · ${owner.name} · ${formatPhone(order.shipTo.phone)}` : ""} ·{" "}
              {adminPaymentDetail(order)}
              {/* An order of fixed styles only (slice B5) belongs to no issue. */}
              {issue !== undefined ? ` · ${LEX.t} ${issueNo(issue)}` : ""}
            </p>
          ) : (
            <p className={page.sub}>
              Placed {clockLabel(order.placedAt)} · {dayMonth(order.placedAt, locale)}
              {owner ? (
                <>
                  {" · "}
                  <span lang={storedLang(owner.name, locale)}>{owner.name}</span>
                  {` · ${formatPhone(order.shipTo.phone)}`}
                </>
              ) : (
                ""
              )}{" "}
              · {adminPaymentDetail(order, locale)}
              {issue !== undefined ? ` · ${issueLabel(issue, locale)}` : ""}
            </p>
          )}
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
          locale={locale}
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
                  {t({ vi: "Món trong đơn", en: "Items in this order" })}
                </h2>
                <p className={styles.panelSub}>
                  {t<React.ReactNode>({
                    vi: <>{orderUnits(order)} chiếc</>,
                    en: plural(orderUnits(order), "unit", "units"),
                  })}
                </p>
              </div>
            </div>
            <table className={styles.lines}>
              <thead>
                <tr>
                  <th scope="col">{t({ vi: "Mẫu", en: "Style" })}</th>
                  <th scope="col">{t({ vi: "Màu · size", en: "Colour · size" })}</th>
                  <th scope="col" className={styles.num}>
                    <abbr title={t({ vi: "Số lượng", en: "Quantity" })}>{t({ vi: "SL", en: "Qty" })}</abbr>
                  </th>
                  <th scope="col" className={styles.num}>
                    {t({ vi: "Đơn giá", en: "Price" })}
                  </th>
                  <th scope="col" className={styles.num}>
                    {t({ vi: "Thành tiền", en: "Amount" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l, i) => {
                  const p = catalog.byId.get(l.productId);
                  const words = p ? productText(p, locale) : null;
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
                          {/* The name, and the kind under it on every row: the
                              order book's two-line cell (`stack`, `line`), so
                              no row breaks where another does not (round v6
                              slice R2, F12). */}
                          <span className={`${book.stack} ${book.nowrap}`}>
                            <span className={styles.itemName} lang={p ? nameLang(p, locale) : undefined}>
                              {p && words ? styleName(words.name, p.dropNo, locale) : "—"}
                            </span>
                            <span className={book.line}>{words?.kind ?? ""}</span>
                          </span>
                        </span>
                      </td>
                      <td className={styles.nowrap}>
                        {locale === "vi" ? COLORS[l.color].label : colorLabel(l.color, locale)} · {l.size}
                      </td>
                      <td className={styles.num}>{l.qty}</td>
                      <td className={styles.num}>{plainVnd(l.unitPriceVnd, locale)}</td>
                      <td className={styles.num}>{plainVnd(l.unitPriceVnd * l.qty, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <dl className={styles.sums}>
              <div className={styles.sumRow}>
                <dt>{t({ vi: "Tạm tính", en: "Subtotal" })}</dt>
                <dd>{vnd(subtotal, locale)}</dd>
              </div>
              {order.discountVnd > 0 && (
                <div className={styles.sumRow}>
                  <dt>
                    {t({ vi: "Giảm giá", en: "Discount" })}
                    {order.promo ? ` · ${order.promo}` : ""}
                  </dt>
                  <dd>−{vnd(order.discountVnd, locale)}</dd>
                </div>
              )}
              <div className={styles.sumRow}>
                <dt>{t({ vi: "Phí giao", en: "Delivery" })}</dt>
                <dd>{vnd(order.shippingFeeVnd, locale)}</dd>
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
                    ? t({ vi: "Tổng đơn đã huỷ", en: "Cancelled order total" })
                    : isPaidFor(order)
                      ? t({ vi: "Tổng đã thanh toán", en: "Total paid" })
                      : t({ vi: "Tổng cần thu", en: "Total to collect" })}
                </dt>
                <dd>{vnd(total, locale)}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.panel} aria-labelledby={ids.notes}>
            <div className={styles.panelHead}>
              <div className={styles.panelHeading}>
                <h2 id={ids.notes} className={styles.panelTitle}>
                  {t({ vi: "Ghi chú nội bộ", en: "Internal notes" })}
                </h2>
                <p className={styles.panelSub}>{t({ vi: "khách không thấy", en: "hidden from the customer" })}</p>
              </div>
            </div>
            {notes.length > 0 && (
              <ul className={styles.notes}>
                {notes.map((n, i) => (
                  <li className={n.system ? `${styles.note} ${styles.noteSystem}` : styles.note} key={`${n.at}-${i}`}>
                    <span className={styles.noteMeta}>
                      {n.author || t({ vi: "Hệ thống", en: "System" })} · {clockLabel(n.at)} · {dayMonth(n.at, locale)}
                    </span>
                    {phraseNode(n.text)}
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.addNote}>
              <Input
                label={t({ vi: "Ghi chú nội bộ", en: "Internal note" })}
                hideLabel
                placeholder={t({ vi: "Thêm ghi chú…", en: "Add a note…" })}
                value={note}
                // What is being typed, said in Vietnamese on an English page when it is (as the address form's reason).
                lang={storedLang(note, locale)}
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
                {busy === "NOTE" ? t({ vi: "Đang lưu…", en: "Saving…" }) : t({ vi: "Thêm", en: "Add" })}
              </Button>
            </div>
          </section>
        </div>

        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby={ids.address}>
            <div className={styles.panelHead}>
              <h2 id={ids.address} className={styles.panelTitle}>
                {t({ vi: "Giao tới", en: "Deliver to" })}
              </h2>
              {editable && !editingAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={styles.edgeEnd}
                  onClick={() => setEditingAddress(true)}
                >
                  <Pencil {...ICON} />
                  {t({ vi: "Sửa", en: "Edit" })}
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
                    <strong lang={storedLang(order.shipTo.recipient, locale)}>{order.shipTo.recipient}</strong> · {formatPhone(order.shipTo.phone)}
                  </p>
                  <p lang={own}>
                    {order.shipTo.line}
                    {ward ? `, ${wardLabel(ward)}` : ""}
                    {province ? `, ${provinceLabel(province)}` : ""}
                  </p>
                  <p className={styles.muted}>{carrierLabel(delivery.label, locale)}</p>
                </div>
                {editReason &&
                  (locale === "vi" ? (
                    <p className={styles.fine}>Đã sửa địa chỉ · lý do: {editReason}</p>
                  ) : (
                    <p className={styles.fine}>
                      Address changed · reason: <span lang={storedLang(editReason, locale)}>{editReason}</span>
                    </p>
                  ))}
                {!beforeHandover && (
                  <p className={styles.fine}>
                    {order.status.state === "CANCELLED"
                      ? t({ vi: "Đơn đã huỷ, không sửa được.", en: "The order is cancelled and can't be changed." })
                      : t({ vi: "Đã bàn giao, không sửa được.", en: "Handed over, so it can't be changed." })}
                  </p>
                )}
              </>
            )}
          </section>

          <section className={styles.panel} aria-labelledby={ids.journey}>
            <div className={styles.panelHead}>
              <h2 id={ids.journey} className={styles.panelTitle}>
                {t({ vi: "Hành trình", en: "Timeline" })}
              </h2>
            </div>
            <Stepper
              orientation="vertical"
              steps={journey.steps}
              current={journey.current}
              label={t({ vi: "Hành trình", en: "Timeline" })}
              completeLabel={t({ vi: "Đã xong mọi mốc", en: "All steps complete" })}
            />
          </section>

          {owner && facts && (
            <section className={styles.panel} aria-labelledby={ids.customer}>
              <div className={styles.panelHead}>
                <h2 id={ids.customer} className={styles.panelTitle}>
                  {t({ vi: "Khách", en: "Customer" })}
                </h2>
                <Link className={styles.textLink} href={`/admin/customers/${customerKey(owner)}`}>
                  {t({ vi: "Hồ sơ", en: "Profile" })}
                </Link>
              </div>
              <div className={styles.who}>
                <Avatar
                  name={monogramName(owner.name)}
                  size="md"
                  aria-hidden="true"
                  lang={storedLang(owner.name, locale)}
                />
                <p className={styles.whoName}>
                  {storedLang(owner.name, locale) ? <span lang="vi">{owner.name}</span> : owner.name}
                  {facts.tag && (
                    <Badge tone={TAG_TONE[facts.tag.tone]} size="sm">
                      {facts.tag.label}
                    </Badge>
                  )}
                </p>
                <p className={styles.whoFacts}>
                  {locale === "vi" ? (
                    <>
                      {facts.orders.length} đơn · {vnd(facts.spentVnd)} ·{" "}
                      {facts.issues.length > 0
                        ? `mua ${LEX.tl} ${facts.issues.map((n) => issueNo(n)).join(", ")}`
                        : "chưa có đơn đã thanh toán"}{" "}
                      · {owner.email}
                    </>
                  ) : (
                    <>
                      {plural(facts.orders.length, "order", "orders")} · {vnd(facts.spentVnd, locale)} ·{" "}
                      {facts.issues.length > 0
                        ? `bought in ${lexicon(locale).t} ${facts.issues.map((n) => issueNo(n)).join(", ")}`
                        : "no paid orders yet"}{" "}
                      · {owner.email}
                    </>
                  )}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      <ArcCancelOrderDialog
        order={cancelling ? order : null}
        // Radix hands focus back only to a `DialogTrigger` (slice 5b): back to
        // "Thao tác khác", which opened it, or, once the order is cancelled
        // and the menu has gone with the move it offered, to "In phiếu giao".
        onCloseAutoFocus={(event) => {
          const box = actions.current;
          const back =
            box?.querySelector<HTMLElement>('button[aria-haspopup="menu"]') ??
            box?.querySelector<HTMLElement>("a[href]");
          if (!back) return;
          event.preventDefault();
          back.focus();
        }}
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
  locale,
  busy,
  onPaid,
  onHandover,
  onDelivered,
}: {
  catalog: Catalog;
  order: Order;
  now: Date;
  locale: Locale;
  busy: Busy;
  onPaid: () => void;
  onHandover: () => void;
  onDelivered: () => void;
}) {
  const move = nextMove(order, now);
  const t = picker(locale);
  const total = vnd(orderTotalVnd(order), locale);
  const items = orderItemsLabel(catalog, order, locale);
  /** The items, said in Vietnamese on an English page when every name in them is (`orderItemsLang`). */
  const itemsNode = (
    <span lang={orderItemsLang(catalog, order, locale)}>{items}</span>
  );
  const late = (days: number) =>
    days >= HANDOVER_LATE_DAYS
      ? t({ vi: ` · trễ ${days} ngày`, en: ` · ${plural(days, "day", "days")} late` })
      : "";
  const payButton = (
    <Button
      variant="primary"
      size="sm"
      loading={busy === "PAY"}
      disabled={busy !== null && busy !== "PAY"}
      onClick={onPaid}
    >
      {busy === null ? <Check {...ICON} /> : null}
      {busy === "PAY" ? t({ vi: "Đang lưu…", en: "Saving…" }) : t({ vi: "Đã nhận tiền", en: "Mark as paid" })}
    </Button>
  );
  const handoverButton = (
    <Button variant="primary" size="sm" disabled={busy !== null} onClick={onHandover}>
      {busy === null ? <Package {...ICON} /> : null}
      {t({ vi: "Bàn giao", en: "Hand over" })}
    </Button>
  );
  const confirmPaid = t({ vi: "Bước tiếp theo: xác nhận đã nhận tiền", en: "Next step: confirm the payment" });
  const packAndHand = t({ vi: "Bước tiếp theo: đóng gói và bàn giao", en: "Next step: pack and hand over" });

  // A card order waiting for its money (slice B18): Stripe confirms it, so the
  // block says what the shop is waiting for and draws no button — no "Đã nhận
  // tiền" for a card (`nextMove`, `admin_mark_paid()`). The shop may still
  // cancel it from "Thao tác khác".
  if (order.status.state === "AWAITING_TRANSFER" && order.payment === "CARD") {
    return (
      <Block
        title={t({ vi: "Bước tiếp theo: chờ khách trả thẻ", en: "Next step: wait for the card payment" })}
        button={null}
      >
        {locale === "vi" ? (
          <>
            Hạn {momentLabel(order.status.dueAt)} · {vnd(orderTotalVnd(order))} · qua Stripe
          </>
        ) : (
          <>
            Due {momentLabel(order.status.dueAt, locale)} · {total} · via Stripe
          </>
        )}
      </Block>
    );
  }
  if (order.status.state === "AWAITING_TRANSFER" && move === "MARK_PAID") {
    return (
      <Block title={confirmPaid} button={payButton}>
        {locale === "vi" ? (
          <>
            Hạn {momentLabel(order.status.dueAt)} · {vnd(orderTotalVnd(order))} · nội dung{" "}
            {transferReference(order.code)}
          </>
        ) : (
          <>
            Due {momentLabel(order.status.dueAt, locale)} · {total} · reference {transferReference(order.code)}
          </>
        )}
      </Block>
    );
  }
  // Taken, nobody paid yet (slice B3a). A COD order leaves now and is paid at
  // the door. A card order taken before slice B7 has no move left for the
  // shop since slice B18 (its money is never confirmed by hand): no block.
  if (order.status.state === "RECEIVED") {
    if (move === null) return null;
    const days = Math.floor((now.getTime() - Date.parse(order.placedAt)) / 86_400_000);
    if (locale === "vi") {
      return move === "HAND_OVER" ? (
        <Block title={packAndHand} button={handoverButton}>
          Đã nhận đơn {sinceLabel(order.placedAt, now)} · COD, thu {vnd(orderTotalVnd(order))} khi giao ·{" "}
          {orderUnits(order)} chiếc {orderItemsLabel(catalog, order)}
          {days >= HANDOVER_LATE_DAYS ? ` · trễ ${days} ngày` : ""}
        </Block>
      ) : (
        <Block title={confirmPaid} button={payButton}>
          {adminPaymentLabel(order.payment)} · đối chiếu tay · {vnd(orderTotalVnd(order))}
        </Block>
      );
    }
    return move === "HAND_OVER" ? (
      <Block title={packAndHand} button={handoverButton}>
        Order received {sinceLabel(order.placedAt, now, locale)} · COD, collect {total} on delivery ·{" "}
        {plural(orderUnits(order), "unit", "units")}: {itemsNode}
        {late(days)}
      </Block>
    ) : (
      <Block title={confirmPaid} button={payButton}>
        {adminPaymentLabel(order.payment, locale)} · checked by hand · {total}
      </Block>
    );
  }
  if (order.status.state === "PAID") {
    const days = Math.floor((now.getTime() - Date.parse(order.status.paidAt)) / 86_400_000);
    return (
      <Block title={packAndHand} button={handoverButton}>
        {locale === "vi" ? (
          <>
            Đã thanh toán {sinceLabel(order.status.paidAt, now)} · {orderUnits(order)} chiếc{" "}
            {orderItemsLabel(catalog, order)}
            {days >= HANDOVER_LATE_DAYS ? ` · trễ ${days} ngày` : ""}
          </>
        ) : (
          <>
            Paid {sinceLabel(order.status.paidAt, now, locale)} · {plural(orderUnits(order), "unit", "units")}:{" "}
            {itemsNode}
            {late(days)}
          </>
        )}
      </Block>
    );
  }
  // No courier reports a delivery, so the shop records it by hand
  // (`admin_mark_delivered()`).
  if (order.status.state === "SHIPPING") {
    return (
      <Block
        title={t({ vi: "Bước tiếp theo: chờ khách nhận", en: "Next step: wait for delivery" })}
        button={
          <Button
            variant="primary"
            size="sm"
            loading={busy === "DELIVER"}
            disabled={busy !== null && busy !== "DELIVER"}
            onClick={onDelivered}
          >
            {busy === null ? <Check {...ICON} /> : null}
            {busy === "DELIVER"
              ? t({ vi: "Đang lưu…", en: "Saving…" })
              : t({ vi: "Đã giao", en: "Mark as delivered" })}
          </Button>
        }
      >
        {locale === "vi" ? (
          <>
            Bàn giao {clockLabel(order.status.shippedAt)} · {dayMonth(order.status.shippedAt)} ·{" "}
            {order.status.carrier ? `${order.status.carrier} · ` : ""}
            {order.status.trackingCode} · khách thấy mã này ở tra cứu đơn và Đơn hàng
          </>
        ) : (
          <>
            Handed over {clockLabel(order.status.shippedAt)} · {dayMonth(order.status.shippedAt, locale)} ·{" "}
            {order.status.carrier ? `${carrierLabel(order.status.carrier, locale)} · ` : ""}
            {order.status.trackingCode} · the customer sees this number in Track an order and Orders
          </>
        )}
      </Block>
    );
  }
  return null;
}

/**
 * The muted block: what to do next and its details, and the one button that
 * does it — or none, when the next move is somebody else's (a card payment,
 * slice B18).
 */
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
