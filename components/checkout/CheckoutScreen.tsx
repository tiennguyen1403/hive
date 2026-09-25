"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon, Tick } from "@/components/icon/Icon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Select } from "@/components/ui/Select";
import { Empty } from "@/components/shop/Empty";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { Steps } from "@/components/shop/Steps";
import { Toast } from "@/components/shop/Toast";
import { startWait } from "@/components/shop/WaitVeil";
import { useCart } from "@/components/cart/CartContext";
import { PromoBox } from "@/components/cart/PromoBox";
import { useAddressBook } from "@/components/account/AddressBookContext";
import { useMe } from "@/components/account/MeContext";
import { AddressPicker } from "./AddressPicker";
import { OrderBox } from "./OrderBox";
import { WardSelect } from "./WardSelect";
import { useWardLabels } from "./wards";
import { useCatalog } from "@/components/shop/CatalogContext";
import { ADDRESS_LABELS, type AddressLabel } from "@/lib/account-form";
import { defaultAddress, type SavedAddress } from "@/lib/address-book";
import { rememberAddress } from "@/lib/actions/addresses";
import { placeOrderAction } from "@/lib/actions/orders";
import type { Address, Promotion } from "@/data/types";
import {
  cartSubtotalVnd,
  cartUnits,
  hasBlockingIssue,
  resolveCart,
  type ResolvedLine,
} from "@/lib/cart";
import {
  EMPTY_DRAFT,
  checkoutStep,
  isAddressComplete,
  normalisePhone,
  validateCheckout,
  type CheckoutDraft,
  type FieldName,
} from "@/lib/checkout-form";
import { toVnIso } from "@/lib/datetime";
import { vnd } from "@/lib/money";
import { MAX_NOTE_LENGTH, failureMovesCatalog } from "@/lib/order-payload";
import { TRANSFER_HOLD_HOURS } from "@/lib/orders";
import { appliedPromo } from "@/lib/promotions";
import {
  COD_SURCHARGE_VND,
  DELIVERY_OPTIONS,
  deliveryTitle,
  EXPRESS_FEE_VND,
  FREE_SHIPPING_FROM_VND,
  RETURN_WINDOW_DAYS,
  checkoutTotals,
  deliveryWindowLabel,
  isDeliveryAvailable,
  type CheckoutTotals,
} from "@/lib/shipping";
import { demoNow } from "@/lib/clock";
import { wayToShop } from "@/lib/drop";

/** `{ code, label }` only — the full region module never reaches the client. */
export interface ProvinceOption {
  code: string;
  label: string;
}

interface CheckoutScreenProps {
  provinces: ProvinceOption[];
  /**
   * The signed-in shopper's address book, read from Postgres by the page.
   * Empty for a guest, who has the one in this browser instead.
   */
  accountAddresses?: Address[];
}

/**
 * An account address in the shape the picker renders.
 *
 * `source` is what the row used to be labelled with — "từ tài khoản mẫu" or
 * "lưu trên thiết bị này". Only the second label survives slice B1, on the
 * guest book, which really is this browser's; an account's addresses are the
 * account's wherever it is opened.
 */
function asSaved(a: Address): SavedAddress {
  return {
    id: String(a.id),
    recipient: a.recipient,
    phone: a.phone,
    provinceCode: a.provinceCode,
    wardCode: a.wardCode,
    line: a.line,
    label: a.label,
    isDefault: a.isDefault,
    source: "account",
  };
}

/**
 * What the basket and the money looked like when "Đặt hàng" was pressed.
 *
 * Held from the press until the receipt page takes over. The order is
 * priced and written by the server, and while it travels anything can
 * re-render this screen — a refreshed catalogue that already counts the
 * pieces this very order took, the cart being emptied on the way out. Drawn
 * from the live values, the screen would flash "Giỏ còn món đang vướng" over
 * an order that went through. Released again if the order is refused, so the
 * screen then shows what is true now.
 */
interface Held {
  lines: ResolvedLine[];
  subtotalVnd: number;
  blocked: boolean;
  promo: Promotion | undefined;
  totals: CheckoutTotals;
  units: number;
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
 * out with the same word on it. Since slice B2 pressing it sends the order to
 * the server, which prices it and takes the pieces off the shelf; while that
 * is on its way the button says so and waits.
 *
 * From 900px the panels and the money become two columns (`.two3`), with the
 * money sticky on the right.
 */
export function CheckoutScreen({ provinces, accountAddresses = [] }: CheckoutScreenProps) {
  const router = useRouter();
  const catalog = useCatalog();
  const { cart, ready, clear, promoCode } = useCart();
  const me = useMe();
  const { device, ready: bookReady, save } = useAddressBook();

  const [draft, setDraft] = useState<CheckoutDraft>(EMPTY_DRAFT);
  const [addressLabel, setAddressLabel] = useState<AddressLabel>("Nhà");
  const [saveToBook, setSaveToBook] = useState(true);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** Why the last press did not become an order, in the shopper's words. */
  const [failure, setFailure] = useState<string | null>(null);
  const dismissFailure = useCallback(() => setFailure(null), []);
  const [placing, startPlacing] = useTransition();
  const [held, setHeld] = useState<Held | null>(null);
  /** The saved address being shipped to. `null` while a new one is typed. */
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Signed in, the book is the account's, read from Postgres by the page
  // above and handed down; signed out, it is whatever this device saved.
  // Two sources, never merged: slice B1 moved the account's addresses into
  // their own table, and an entry that lived in both would be one place
  // shown twice.
  const book = useMemo<SavedAddress[]>(
    () => (me ? accountAddresses.map(asSaved) : device),
    [me, accountAddresses, device],
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
    if (prefilled || !bookReady) return;
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
  }, [prefilled, bookReady, book, me]);

  // One instant for the whole render. Nothing below `ready` is server-
  // rendered, so reading the clock here cannot desync a hydration.
  const now = useMemo(() => demoNow(), [cart]);
  const nowIso = toVnIso(now);
  const liveLines = resolveCart(catalog, now, cart).lines;
  const liveSubtotal = cartSubtotalVnd(liveLines);
  const livePromo = appliedPromo(catalog, promoCode, liveSubtotal, now);
  const live: Held = {
    lines: liveLines,
    subtotalVnd: liveSubtotal,
    blocked: hasBlockingIssue(liveLines),
    promo: livePromo,
    totals: checkoutTotals({
      subtotalVnd: liveSubtotal,
      delivery: draft.delivery,
      payment: draft.payment,
      ...(livePromo ? { promo: livePromo } : {}),
    }),
    units: cartUnits(cart),
  };
  // While an order is on its way, the screen keeps showing what was pressed.
  const { lines, subtotalVnd, blocked, promo, totals, units } = held ?? live;

  const errors = validateCheckout(draft);

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

  /**
   * "Đặt hàng" — the order goes to the server, which prices it, takes the
   * pieces off the shelf and issues the number (`placeOrderAction`,
   * `place_order()`).
   *
   * Called as a function inside a transition rather than as a form action:
   * checkout is not a form posting to one endpoint, it validates, places the
   * order, saves the address and navigates
   * (`02-guides/server-actions.md`; `01-getting-started/07-mutating-data.md`,
   * "Event Handlers"). Only the basket, the form and the applied code go up;
   * no price does, and nothing the page computed is trusted.
   *
   * A refusal is a sentence in a toast. When the refusal is about stock, the
   * issue's window or the code, the page reads the catalogue again so the
   * cart and the summary show what is true now.
   */
  function placeOrder() {
    setSubmitted(true);
    if (placing) return;
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

    const payload = {
      lines: lines.map((l) => ({
        productId: l.line.productId,
        color: l.line.color,
        size: l.line.size,
        qty: l.line.qty,
      })),
      draft,
      promoCode: promo ? promo.code : null,
    };

    setFailure(null);
    setHeld({ lines, subtotalVnd, blocked, promo, totals, units });

    startPlacing(async () => {
      const result = await placeOrderAction(payload);

      if (!result.ok) {
        setHeld(null);
        setFailure(result.message);
        if (result.failure !== "INVALID" && failureMovesCatalog(result.failure)) {
          router.refresh();
        }
        return;
      }

      // The checkbox in the form promises this, so it happens before the
      // navigation rather than being a sentence nothing backs up — and it
      // only happens when the box is ticked and the order went through.
      if (!pickedId && saveToBook) {
        const entry = {
          recipient: draft.recipient.trim(),
          phone: normalisePhone(draft.phone),
          provinceCode: draft.provinceCode,
          wardCode: draft.wardCode,
          line: draft.line.trim(),
          label: addressLabel,
          isDefault: book.length === 0,
        };
        // Where it goes depends on who is here, and the checkbox says which
        // of the two it will be. A signed-in shopper's book is in Postgres;
        // a guest's is this browser.
        if (me) void rememberAddress(entry);
        else save(entry);
      }

      // The emptied cart and the receipt land together: both updates go in
      // one transition, so the screen never draws an empty basket in
      // between. After an `await` the transition has to be restated
      // (react.dev/reference/react/useTransition, "React doesn't treat my
      // state update after await as a Transition").
      //
      // Until here the button says the order is on its way; from here on it
      // is the receipt that is, and the wait veil covers that part.
      startPlacing(() => {
        const receipt = `/order-confirmed/${result.code}`;
        clear();
        startWait(receipt);
        router.push(receipt);
      });
    });
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
    // The issue selling now, on its own page; every style on sale when none
    // is — "Xem số đang mở" would name nothing (v3 slice 11).
    const way = wayToShop(catalog, now);
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
              <ButtonLink icon="bag" href={blocked ? "/cart" : way.href}>
                {blocked ? "Về giỏ" : way.issueNo !== null ? "Xem số đang mở" : "Xem tất cả mẫu"}
              </ButtonLink>
            }
          />
        </div>
        {/* A refusal can arrive after the basket it was about has emptied —
            another tab placed the same pieces — so it is said here too. */}
        <Toast message={failure} ms={6000} tone="error" onDone={dismissFailure} />
      </ShopFrame>
    );
  }

  const addressDone = isAddressComplete(draft);

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
                {/* Where the book lives depends on who is here, and the line
                    says which: an account's is in the shop's database, a
                    guest's is this browser and nowhere else. */}
                <span className="meta">
                  {book.length === 0
                    ? "chưa có địa chỉ lưu"
                    : me
                      ? `${book.length} địa chỉ trong tài khoản`
                      : `${book.length} địa chỉ đã lưu trên thiết bị`}
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
                          onChange={(code) => {
                            set("wardCode", code);
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
                    {/* `wrapped`: three choices shown whole, not a row that scrolls — and
                        `.chips3:not(.wrapped)` is hidden from 900px (listing.css), which
                        left the label unchoosable on a desktop (v3 slice 13). */}
                    <div className="chips3 wrapped" role="group" aria-labelledby="addr-label">
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
                    <span>
                      {me
                        ? "Lưu địa chỉ này vào sổ địa chỉ của tài khoản"
                        : "Lưu địa chỉ này vào sổ trên thiết bị"}
                    </span>
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
                        <b>{deliveryTitle(o)}</b>
                        <span>
                          {/* The same block as the receipt's "nhận 20/09 – 22/09". */}
                          Nhận{"\u00a0"}{when} ·{" "}
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
              >
                {({ id, describedBy }) => (
                  <textarea
                    id={id}
                    className="inp area"
                    maxLength={MAX_NOTE_LENGTH}
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

            {placing ? (
              /* On its way to the server. Shut, and without the icon — the
                 same rule as every other button that cannot be pressed. */
              <Button tone="wide" disabled>
                Đang đặt hàng…
              </Button>
            ) : addressDone && draft.agreed ? (
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
      <Toast message={failure} ms={6000} tone="error" onDone={dismissFailure} />
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
      // "nhận (COD)" holds together: at 360 "(COD)" stood alone (v3 slice 13).
      label: "Thanh toán khi nhận\u00a0(COD)",
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
