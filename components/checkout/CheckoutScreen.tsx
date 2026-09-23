"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Tick } from "@/components/icon/Icon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Select } from "@/components/ui/Select";
import { Empty } from "@/components/shop/Empty";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { Steps } from "@/components/shop/Steps";
import { Toast } from "@/components/shop/Toast";
import { useCart } from "@/components/cart/CartContext";
import { PromoBox } from "@/components/cart/PromoBox";
import { useAddressBook } from "@/components/account/AddressBookContext";
import { useSession } from "@/components/account/SessionContext";
import { AddressPicker } from "./AddressPicker";
import { OrderBox } from "./OrderBox";
import { WardSelect } from "./WardSelect";
import { useWardLabels } from "./wards";
import { useCatalog } from "@/components/shop/CatalogContext";
import { COLORS } from "@/data/colors";
import { ADDRESS_LABELS, type AddressLabel } from "@/lib/account-form";
import { addressBookFor, defaultAddress, type SavedAddress } from "@/lib/address-book";
import { cartSubtotalVnd, cartUnits, hasBlockingIssue, resolveCart } from "@/lib/cart";
import {
  EMPTY_DRAFT,
  checkoutStep,
  isAddressComplete,
  normalisePhone,
  validateCheckout,
  type CheckoutDraft,
  type FieldName,
} from "@/lib/checkout-form";
import { writePlacedOrder } from "@/components/shop/placed-order";
import { toVnIso } from "@/lib/datetime";
import { vnd } from "@/lib/money";
import {
  TRANSFER_HOLD_HOURS,
  nextOrderCode,
  type PlacedOrder,
} from "@/lib/placed-order";
import { appliedPromo } from "@/lib/promotions";
import {
  COD_SURCHARGE_VND,
  DELIVERY_OPTIONS,
  EXPRESS_FEE_VND,
  FREE_SHIPPING_FROM_VND,
  RETURN_WINDOW_DAYS,
  checkoutTotals,
  deliveryWindowLabel,
  isDeliveryAvailable,
} from "@/lib/shipping";
import { demoNow } from "@/lib/clock";

/** `{ code, label }` only — the full region module never reaches the client. */
export interface ProvinceOption {
  code: string;
  label: string;
}

interface CheckoutScreenProps {
  provinces: ProvinceOption[];
}

/** Everything the courier needs. Used to decide whether to open the form. */
const ADDRESS_FIELDS: FieldName[] = [
  "recipient",
  "phone",
  "provinceCode",
  "wardCode",
  "line",
];

/**
 * Checkout, on one page, in four panels: who, where, how it travels, how it
 * is paid.
 *
 * Two rules from PRODUCT.md drive the layout. The money is shown EARLY —
 * delivery, the cash-handling fee and the delivery date are beside the
 * choices that cause them, not revealed on the last tap. And an error
 * appears at the field that caused it, with an icon beside it, never as
 * colour alone.
 *
 * The address is PICKED before it is typed: whatever this device has saved
 * comes up as radios and the blank form is behind the last one. Nothing is
 * validated until the shopper has left a field they already touched —
 * shouting "cần tên người nhận" at a form they have not started is noise.
 *
 * The order button stays shut until the order can actually be placed, and it
 * says WHICH of the two things is missing rather than sitting there greyed
 * out with the same word on it.
 *
 * From 900px the panels and the money become two columns (`.two3`), with the
 * money sticky on the right.
 */
export function CheckoutScreen({ provinces }: CheckoutScreenProps) {
  const router = useRouter();
  const catalog = useCatalog();
  const { cart, ready, clear, promoCode } = useCart();
  const { me, ready: sessionReady } = useSession();
  const { device, ready: bookReady, save } = useAddressBook();

  const [draft, setDraft] = useState<CheckoutDraft>(EMPTY_DRAFT);
  const [addressLabel, setAddressLabel] = useState<AddressLabel>("Nhà");
  const [saveToBook, setSaveToBook] = useState(true);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Held beside the code because the receipt prints "Phường Sài Gòn" and the
  // region module that knows the prefix is server-side only.
  const [typedWardLabel, setTypedWardLabel] = useState("");
  /** The saved address being shipped to. `null` while a new one is typed. */
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const book = useMemo<SavedAddress[]>(
    () => (me ? addressBookFor(me, device) : device),
    [me, device],
  );
  const provinceName = useMemo(() => {
    const m = new Map(provinces.map((p) => [p.code, p.label]));
    return (code: string) => m.get(code) ?? "";
  }, [provinces]);
  // The saved entries hold a ward CODE; the names come from `/api/wards`.
  const wardLabelFor = useWardLabels(book.map((a) => a.provinceCode));

  function lineOf(a: SavedAddress): string {
    return [a.line, wardLabelFor(a.provinceCode, a.wardCode), provinceName(a.provinceCode)]
      .filter(Boolean)
      .join(", ");
  }

  /**
   * Fill in the saved default, once, and only into a form nobody has
   * touched.
   *
   * This is the promise the address screen makes — "Địa chỉ mặc định được
   * điền sẵn ở bước thanh toán" — and the reason the address book persists
   * for real rather than being another screen that cannot save. With an
   * empty book there is nothing to pick, so the blank form IS the step and
   * opens straight away.
   */
  useEffect(() => {
    if (prefilled || !bookReady || !sessionReady) return;
    setPrefilled(true);

    const home = defaultAddress(book);
    if (!home) {
      setAdding(true);
      if (me) setDraft((d) => ({ ...d, email: me.email, phone: me.phone }));
      return;
    }
    setPickedId(home.id);
    setDraft((d) => ({
      ...d,
      recipient: home.recipient,
      phone: home.phone,
      email: me ? me.email : d.email,
      provinceCode: home.provinceCode,
      wardCode: home.wardCode,
      line: home.line,
    }));
  }, [prefilled, bookReady, sessionReady, book, me]);

  // One instant for the whole render. Nothing below `ready` is server-
  // rendered, so reading the clock here cannot desync a hydration.
  const now = useMemo(() => demoNow(), [cart]);
  const nowIso = toVnIso(now);
  const { lines } = resolveCart(catalog, now, cart);
  const subtotalVnd = cartSubtotalVnd(lines);
  const blocked = hasBlockingIssue(lines);

  const errors = validateCheckout(draft);
  const promo = appliedPromo(catalog, promoCode, subtotalVnd, now);
  const totals = checkoutTotals({
    subtotalVnd,
    delivery: draft.delivery,
    payment: draft.payment,
    ...(promo ? { promo } : {}),
  });

  function set<K extends keyof CheckoutDraft>(key: K, value: CheckoutDraft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // A ward belongs to one province. Changing province has to drop it, or
      // the form silently holds a commune in the wrong city.
      if (key === "provinceCode") next.wardCode = "";
      // Express only runs in one city, so leaving a province that has it
      // must not leave the shopper paying for a service they cannot get.
      if (key === "provinceCode" && !isDeliveryAvailable(next.delivery, next.provinceCode)) {
        next.delivery = "STANDARD";
      }
      return next;
    });
  }

  /** Ship to one of the saved addresses, and close the blank form. */
  function pick(a: SavedAddress) {
    setPickedId(a.id);
    setAdding(false);
    setTypedWardLabel("");
    setDraft((d) => ({
      ...d,
      recipient: a.recipient,
      phone: a.phone,
      provinceCode: a.provinceCode,
      wardCode: a.wardCode,
      line: a.line,
      delivery: isDeliveryAvailable(d.delivery, a.provinceCode) ? d.delivery : "STANDARD",
    }));
  }

  /** "Giao tới địa chỉ khác" — an empty form, and no saved row ticked. */
  function startNewAddress() {
    setAdding(true);
    setPickedId(null);
    setTypedWardLabel("");
    setDraft((d) => ({
      ...d,
      recipient: "",
      phone: "",
      provinceCode: "",
      wardCode: "",
      line: "",
      delivery: "STANDARD",
    }));
    setTouched((t) => {
      const next = new Set(t);
      for (const f of ADDRESS_FIELDS) next.delete(f);
      return next;
    });
  }

  /** Show an error only once the shopper has had a fair chance at the field. */
  function errorFor(key: keyof CheckoutDraft): string | undefined {
    return submitted || touched.has(key) ? errors[key] : undefined;
  }

  function markTouched(key: keyof CheckoutDraft) {
    setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
  }

  function placeOrder() {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || blocked || lines.length === 0) {
      // The button is shut while anything is missing, so this only runs if
      // something got past it. Open the form and take them to the first
      // thing that is wrong rather than leaving them to hunt for it.
      if (!adding && ADDRESS_FIELDS.some((f) => errors[f])) setAdding(true);
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>("[aria-invalid='true'], .err")
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }

    const wardName = pickedId
      ? wardLabelFor(draft.provinceCode, draft.wardCode)
      : typedWardLabel;

    const order: PlacedOrder = {
      code: nextOrderCode(now),
      // Bound HERE, because this is the last moment the session and the
      // order are in the same place. Reading an order later asks who is
      // asking (QĐ-16), and without an owner written down the answer would
      // have to be "whoever is holding the browser". A guest order gets no
      // owner and therefore appears in no account list — it is still
      // readable at /track, with the phone number it was placed with.
      ...(me ? { customerId: me.id } : {}),
      placedAt: nowIso,
      lines: lines.map((l) => ({
        slug: l.product.slug,
        name: l.product.name,
        kind: l.product.kind,
        colorLabel: COLORS[l.line.color].label,
        size: l.line.size,
        qty: l.line.qty,
        unitPriceVnd: l.product.priceVnd,
        photoKey:
          l.product.photoKeys[l.product.colors.indexOf(l.line.color)] ??
          l.product.photoKeys[0]!,
      })),
      recipient: draft.recipient.trim(),
      phone: normalisePhone(draft.phone),
      email: draft.email.trim(),
      addressLine: [draft.line.trim(), wardName, provinceName(draft.provinceCode)]
        .filter(Boolean)
        .join(", "),
      note: draft.note.trim(),
      delivery: draft.delivery,
      payment: draft.payment,
      subtotalVnd: totals.subtotalVnd,
      shippingFeeVnd: totals.shippingFeeVnd,
      codFeeVnd: totals.codFeeVnd,
      discountVnd: totals.discountVnd,
      totalVnd: totals.totalVnd,
      ...(promo ? { promo: promo.code } : {}),
    };

    // The checkbox in the form promises this, so it happens before the
    // navigation rather than being a sentence nothing backs up — and it
    // only happens when the box is ticked.
    if (!pickedId && saveToBook) {
      save({
        recipient: order.recipient,
        phone: order.phone,
        provinceCode: draft.provinceCode,
        wardCode: draft.wardCode,
        line: draft.line.trim(),
        label: addressLabel,
        isDefault: book.length === 0,
      });
    }

    // On the DEVICE, not in the tab: the account lists this order as one of
    // the shopper's, and an order that vanished with the tab made that list
    // a lie. `writePlacedOrder` swallows a storage refusal — the
    // confirmation screen then says there is no order rather than
    // pretending one was kept.
    writePlacedOrder(order);
    clear();
    router.push("/order-confirmed");
  }

  if (!ready) {
    return (
      <ShopFrame>
        <div className="wrap3">
          <div className="pghead">
            <h1>Thanh toán</h1>
            <span className="meta">đang mở giỏ…</span>
          </div>
        </div>
      </ShopFrame>
    );
  }

  if (lines.length === 0 || blocked) {
    return (
      <ShopFrame>
        <div className="wrap3">
          <Steps at={1} />
          <Empty
            icon="bag"
            title={blocked ? "Giỏ còn món đang vướng" : "Chưa có gì để thanh toán"}
            text={
              blocked
                ? "Một món trong giỏ vừa hết hoặc thuộc số đã đóng. Xử lý ở giỏ rồi quay lại."
                : "Giỏ đang trống, nên chưa có đơn nào để đặt."
            }
            action={
              <ButtonLink icon="bag" href={blocked ? "/cart" : "/products"}>
                {blocked ? "Về giỏ" : "Xem số đang mở"}
              </ButtonLink>
            }
          />
        </div>
      </ShopFrame>
    );
  }

  const addressDone = isAddressComplete(draft);
  const units = cartUnits(cart);

  return (
    <ShopFrame>
      <div className="wrap3">
        <Steps at={checkoutStep(draft)} />

        <div className="pghead">
          <Link className="back" href="/cart">
            <Icon name="back" className="ic sm" />
            Giỏ
          </Link>
          <h1>Thanh toán</h1>
          <span className="meta">
            {units} món · {vnd(totals.totalVnd)}
          </span>
        </div>

        <div className="two3">
          <div className="panels3">
            {/* ── 1 · who ───────────────────────────────────────────────── */}
            <section className="panel3">
              <h3>
                Liên hệ
                {me && <span className="meta">đã đăng nhập · {me.name}</span>}
              </h3>
              <div className="row2">
                <Field3 label="Email nhận xác nhận đơn" error={errorFor("email")}>
                  {({ id, describedBy }) => (
                    <input
                      id={id}
                      className={errorFor("email") ? "inp bad" : "inp"}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      aria-describedby={describedBy}
                      aria-invalid={errorFor("email") !== undefined || undefined}
                      value={draft.email}
                      onChange={(e) => set("email", e.target.value)}
                      onBlur={() => markTouched("email")}
                    />
                  )}
                </Field3>
                <Field3 label="Số điện thoại" error={errorFor("phone")}>
                  {({ id, describedBy }) => (
                    <input
                      id={id}
                      className={errorFor("phone") ? "inp bad" : "inp"}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      aria-describedby={describedBy}
                      aria-invalid={errorFor("phone") !== undefined || undefined}
                      value={draft.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      onBlur={() => markTouched("phone")}
                    />
                  )}
                </Field3>
              </div>
            </section>

            {/* ── 2 · where ─────────────────────────────────────────────── */}
            <section className="panel3">
              <h3>
                Giao tới
                <span className="meta">
                  {book.length > 0
                    ? `${book.length} địa chỉ đã lưu trên thiết bị`
                    : "chưa có địa chỉ lưu"}
                </span>
              </h3>

              {book.length > 0 && (
                <AddressPicker
                  book={book}
                  pickedId={pickedId}
                  onPick={pick}
                  lineOf={lineOf}
                  adding={adding}
                  onAddNew={startNewAddress}
                />
              )}

              {adding && (
                <div className="addrform">
                  <div className="row2">
                    <Field3 label="Người nhận" error={errorFor("recipient")}>
                      {({ id, describedBy }) => (
                        <input
                          id={id}
                          className={errorFor("recipient") ? "inp bad" : "inp"}
                          autoComplete="name"
                          placeholder="Họ và tên"
                          aria-describedby={describedBy}
                          aria-invalid={errorFor("recipient") !== undefined || undefined}
                          value={draft.recipient}
                          onChange={(e) => set("recipient", e.target.value)}
                          onBlur={() => markTouched("recipient")}
                        />
                      )}
                    </Field3>
                    <Field3 label="Số điện thoại" error={errorFor("phone")}>
                      {({ id, describedBy }) => (
                        <input
                          id={id}
                          className={errorFor("phone") ? "inp bad" : "inp"}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="0912 345 678"
                          aria-describedby={describedBy}
                          aria-invalid={errorFor("phone") !== undefined || undefined}
                          value={draft.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          onBlur={() => markTouched("phone")}
                        />
                      )}
                    </Field3>
                  </div>

                  {/* Two tiers, not three. The district level was abolished
                      on 1/7/2025 — see data/regions.ts. */}
                  <div className="row2">
                    <Field3 label="Tỉnh / thành" error={errorFor("provinceCode")}>
                      {({ id }) => (
                        <Select
                          id={id}
                          options={provinces.map((p) => ({ value: p.code, label: p.label }))}
                          value={draft.provinceCode || null}
                          onChange={(code) => {
                            set("provinceCode", code);
                            setTypedWardLabel("");
                            markTouched("provinceCode");
                          }}
                          placeholder="Chọn tỉnh / thành"
                        />
                      )}
                    </Field3>
                    <Field3 label="Phường / xã" error={errorFor("wardCode")}>
                      {({ id }) => (
                        <WardSelect
                          id={id}
                          provinceCode={draft.provinceCode}
                          value={draft.wardCode}
                          ariaLabel="Phường / xã"
                          onChange={(code, label) => {
                            set("wardCode", code);
                            setTypedWardLabel(label);
                            markTouched("wardCode");
                          }}
                        />
                      )}
                    </Field3>
                  </div>

                  <Field3 label="Số nhà, đường" error={errorFor("line")}>
                    {({ id, describedBy }) => (
                      <input
                        id={id}
                        className={errorFor("line") ? "inp bad" : "inp"}
                        autoComplete="street-address"
                        placeholder="VD: 12 Nguyễn Huệ"
                        aria-describedby={describedBy}
                        aria-invalid={errorFor("line") !== undefined || undefined}
                        value={draft.line}
                        onChange={(e) => set("line", e.target.value)}
                        onBlur={() => markTouched("line")}
                      />
                    )}
                  </Field3>

                  {/* Three labels, not free text: the address book stores one
                      of them, and a typed "nhà riêng" would be a value
                      nothing else in the app can read back. */}
                  <div className="field3">
                    <span className="lbl" id="addr-label">
                      Nhãn
                    </span>
                    <div className="chips3" role="group" aria-labelledby="addr-label">
                      {ADDRESS_LABELS.map((l) => (
                        <button
                          key={l}
                          type="button"
                          className={l === addressLabel ? "chip3 on" : "chip3"}
                          aria-pressed={l === addressLabel}
                          onClick={() => setAddressLabel(l)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* The whole row is the control, rather than a button
                      wrapped in `display:contents` — that value drops a
                      focusable element out of the accessibility tree in more
                      than one browser. */}
                  <button
                    type="button"
                    className="consent"
                    role="checkbox"
                    aria-checked={saveToBook}
                    onClick={() => setSaveToBook((v) => !v)}
                  >
                    <span className="box">
                      <Tick />
                    </span>
                    <span>Lưu địa chỉ này vào sổ trên thiết bị</span>
                  </button>
                </div>
              )}
            </section>

            {/* ── 3 · how it travels ────────────────────────────────────── */}
            <section className="panel3">
              <h3>Giao hàng</h3>
              <div className="picks3" role="radiogroup" aria-label="Cách giao">
                {DELIVERY_OPTIONS.map((o) => {
                  const available = isDeliveryAvailable(
                    o.method,
                    draft.provinceCode || undefined,
                  );
                  const free = o.method === "STANDARD" && totals.shippingFeeVnd === 0;
                  const when = deliveryWindowLabel(o.method, nowIso);
                  return (
                    <button
                      key={o.method}
                      type="button"
                      className="pick"
                      role="radio"
                      aria-checked={draft.delivery === o.method}
                      disabled={!available}
                      onClick={() => set("delivery", o.method)}
                    >
                      <span className="radio" />
                      <span className="t">
                        <b>{o.label}</b>
                        <span>
                          Nhận {when} ·{" "}
                          {o.method === "STANDARD"
                            ? `miễn phí cho đơn từ ${vnd(FREE_SHIPPING_FROM_VND)}`
                            : available
                              ? `${o.when ? `${o.when} · ` : ""}${o.note}`
                              : `${o.note} — chưa áp dụng cho tỉnh đã chọn`}
                        </span>
                      </span>
                      <span className="p">
                        {free ? "Miễn phí" : vnd(o.method === "EXPRESS" ? EXPRESS_FEE_VND : o.feeVnd)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Field3
                label={
                  <>
                    Ghi chú cho người giao <span className="opt">· không bắt buộc</span>
                  </>
                }
                help="In lên phiếu giao và lưu cùng đơn."
              >
                {({ id, describedBy }) => (
                  <textarea
                    id={id}
                    className="inp area"
                    aria-describedby={describedBy}
                    placeholder="VD: gọi trước 10 phút, gửi bảo vệ toà nhà nếu không có người nhận"
                    value={draft.note}
                    onChange={(e) => set("note", e.target.value)}
                  />
                )}
              </Field3>
            </section>

            {/* ── 4 · how it is paid ────────────────────────────────────── */}
            <section className="panel3">
              <h3>Thanh toán</h3>
              <div className="picks3" role="radiogroup" aria-label="Hình thức thanh toán">
                {payments().map((p) => (
                  <button
                    key={p.method}
                    type="button"
                    className="pick"
                    role="radio"
                    aria-checked={draft.payment === p.method}
                    onClick={() => set("payment", p.method)}
                  >
                    <span className="radio" />
                    <span className="t">
                      <b>{p.label}</b>
                      <span>{p.note}</span>
                    </span>
                    {p.price && <span className="p">{p.price}</span>}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* ── the money ───────────────────────────────────────────────── */}
          <aside className="aside3">
            <OrderBox
              lines={lines}
              units={units}
              totals={totals}
              promoCode={promo ? promo.code : undefined}
            />

            <p className="fine3">
              <Link className="lnk tap" href="/cart">
                Sửa giỏ
              </Link>
            </p>

            <PromoBox
              promo={promo}
              discountVnd={totals.discountVnd}
              subtotalVnd={subtotalVnd}
              shippingFeeVnd={totals.shippingFeeVnd}
              onToast={setToast}
            />

            <button
              type="button"
              className="consent"
              role="checkbox"
              aria-checked={draft.agreed}
              onClick={() => {
                set("agreed", !draft.agreed);
                markTouched("agreed");
              }}
            >
              <span className="box">
                <Tick />
              </span>
              <span>
                {`Đồng ý điều kiện đổi trả trong ${RETURN_WINDOW_DAYS} ngày nếu chưa ` +
                  `qua sử dụng. Giỏ không giữ hàng, đơn đặt trước nhận trước.`}
              </span>
            </button>

            {addressDone && draft.agreed ? (
              <Button tone="wide" icon="check" onClick={placeOrder}>
                Đặt hàng · {vnd(totals.totalVnd)}
              </Button>
            ) : (
              /* Shut, and saying which of the two things is missing. A
                 disabled button carries no icon: the icon names an action,
                 and there is none to name yet. */
              <Button tone="wide" disabled>
                {addressDone ? "Đồng ý điều kiện" : "Điền đủ địa chỉ"}
              </Button>
            )}

            <p className="fine3">{afterOrder(draft.payment)}</p>
          </aside>
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </ShopFrame>
  );
}

/**
 * The three ways to pay, each with what it costs and what it commits to.
 *
 * Built rather than declared at module level so every figure comes from the
 * module that charges it, in the words the shopper reads on the next screen.
 */
function payments() {
  return [
    {
      method: "BANK_TRANSFER" as const,
      label: "Chuyển khoản",
      note: `Giữ hàng ${TRANSFER_HOLD_HOURS} giờ kể từ khi đặt · nội dung chuyển khoản hiện ở màn xác nhận`,
      price: "",
    },
    {
      method: "COD" as const,
      label: "Thanh toán khi nhận (COD)",
      note: `Thu hộ ${vnd(COD_SURCHARGE_VND)} · kiểm hàng trước khi trả`,
      price: `+${vnd(COD_SURCHARGE_VND)}`,
    },
    {
      method: "CARD" as const,
      label: "Thẻ (nội địa, Visa)",
      note: 'Cổng thẻ chưa nối · đơn ghi "chưa thu tiền" cho tới khi có cổng',
      price: "",
    },
  ];
}

/** What happens after the button is pressed, per method. All three are true. */
function afterOrder(payment: CheckoutDraft["payment"]): string {
  if (payment === "COD") return "Đặt xong, cửa hàng gọi xác nhận trước khi giao.";
  if (payment === "CARD") {
    return "Đặt xong, đơn ghi chưa thu tiền cho tới khi có cổng thẻ.";
  }
  return `Đặt xong, chuyển khoản trong ${TRANSFER_HOLD_HOURS} giờ để giữ hàng. Quá giờ, đơn tự huỷ và chiếc đó về kệ.`;
}
