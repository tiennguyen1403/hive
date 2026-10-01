"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useMe } from "@/components/account/MeContext";
import { useCart } from "@/components/cart/CartContext";
import { wardOptionLabel } from "@/components/checkout/wards";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { startWait } from "@/components/shop/WaitVeil";
import { colorLabel } from "@/data/colors";
import type { Ward } from "@/data/regions";
import type { DeliveryMethod, PaymentMethod, Promotion } from "@/data/types";
import { placeOrderAction } from "@/lib/actions/orders";
import { cartSubtotalVnd, hasBlockingIssue, resolveCart, type ResolvedLine } from "@/lib/cart";
import type { CheckoutDraft } from "@/lib/checkout-form";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { pictureOf } from "@/lib/feed";
import {
  checkoutRows,
  deliverySub,
  expressOffNote,
  expressSwitchNote,
  feedDeliveries,
  feedFormErrors,
  feedPayments,
  feedPromoCheck,
  feedSentence,
  firstWrong,
  type FeedContact,
  type FeedField,
} from "@/lib/feed-checkout";
import { picker, plural, type Locale } from "@/lib/i18n";
import { isFixed } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { MAX_NOTE_LENGTH, failureMovesCatalog } from "@/lib/order-rules";
import { nameLang, productText } from "@/lib/product-text";
import { appliedPromo } from "@/lib/promotions";
import { EXPRESS_PROVINCE_CODE, checkoutTotals, isDeliveryAvailable, shippingFeeVnd, type CheckoutTotals } from "@/lib/shipping";
import { FeedIcon, type FeedIconName } from "../icon/FeedIcon";
import { FeedPicker, type PickItem } from "../FeedPicker";
import { useFeedToast } from "../FeedToast";
import { cx } from "../useReveal";

/** A province as the picker lists it: the official order, the name alone ("Bắc Ninh", "TP. Hồ Chí Minh"). */
export interface ProvinceName {
  code: string;
  name: string;
}

/**
 * What a signed-in shopper's form starts with (the mock's `?fill=1`): the
 * account's default address — its recipient, phone, province, commune and
 * street — and the account's e-mail. The commune's name comes along, read on
 * the server, where the commune list is.
 */
export interface CheckoutPrefill {
  name: string;
  phone: string;
  email: string;
  provinceCode: string;
  wardCode: string;
  wardLabel: string;
  street: string;
}

interface CheckoutViewProps {
  provinces: readonly ProvinceName[];
  prefill: CheckoutPrefill | null;
}

/**
 * What the basket and the money looked like when "Đặt hàng" was pressed, held
 * from the press until the receipt takes over. The order is priced and written
 * by the server, and meanwhile the page re-renders against a catalogue that
 * already counts the pieces this very order took, and against a basket being
 * emptied on the way out; drawn from the live values it would flash "Giỏ còn
 * món đang vướng" over an order that went through. Let go if the order is
 * refused, so the page then shows what is true now.
 */
interface Held {
  lines: ResolvedLine[];
  subtotalVnd: number;
  blocked: boolean;
  promo: Promotion | undefined;
  totals: CheckoutTotals;
}

const PAY_IC: Record<PaymentMethod, FeedIconName> = { BANK_TRANSFER: "bank", COD: "money", CARD: "credit-card" };

/** The control each field's error points at, for the focus after a press. */
const CONTROL: Record<FeedField, string> = {
  name: "f-name",
  phone: "f-phone",
  email: "f-email",
  province: "f-province",
  ward: "f-ward",
  street: "f-street",
};

const NO_ITEMS: readonly PickItem[] = [];

type WardStatus = "loading" | "error";

/**
 * `text` with the place `name` in it marked as Vietnamese on an English page —
 * a province keeps its Vietnamese name (QĐ-40), and a screen reader should
 * say it so; the text as it is otherwise, one node, as it always was.
 */
function withPlace(text: string, name: string, locale: Locale): React.ReactNode {
  const at = locale === "en" && name ? text.indexOf(name) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span lang="vi">{name}</span>
      {text.slice(at + name.length)}
    </>
  );
}

/**
 * Checkout, round v4 "Feed" (slice 2): the approved mock's `checkout.html` and
 * `checkout.js` — one scrolling screen of grouped sections, and on the phone
 * the "Đặt hàng" bar at the bottom.
 *
 * · Liên hệ: name, phone, e-mail. Signed out, "Đăng nhập" leads to the
 *   sign-in and back here; signed in, the form starts filled from the account
 *   and its default address (the mock's `?fill=1`).
 * · Địa chỉ in the two tiers since July 2025: the province, then the commune,
 *   each picked in a searchable sheet (`FeedPicker`); the communes come from
 *   `/api/wards` one province at a time, in the official order the mock lists.
 * · Giao hàng: express only in TP. Hồ Chí Minh (`lib/shipping.ts`); choosing
 *   another province while on express moves the order to the standard service
 *   and says so.
 * · Thanh toán: transfer (the 12-hour hold), COD (its surcharge), card —
 *   which pays by transfer while no gateway is connected (slice B7).
 * · Mã giảm giá and Tóm tắt; on a desktop both in a sticky column.
 *
 * Nothing is checked until the first press; from then on each field says
 * what is wrong under itself, as it is corrected. "Đặt hàng" sends the basket,
 * the form and the code to `placeOrderAction`, which prices the order and
 * takes the pieces off the shelf; the receipt follows.
 *
 * As in the mock, the e-mail is "tuỳ chọn" — checked for its shape only when
 * one is typed, stored as none when not — and there is no box to tick, nor
 * any agreement sent for one (slice B8).
 *
 * In the page's language since round v6 slice E2. Provinces, communes and the
 * shopper's own words stay as they are, the places marked `lang="vi"` on an
 * English page. A refused code is kept as what was typed, and its sentence is
 * written at render, so a switch of language rewords it along with the form's
 * errors, and leaves everything typed where it was.
 */
export function CheckoutView({ provinces, prefill }: CheckoutViewProps) {
  const router = useRouter();
  const catalog = useCatalog();
  const me = useMe();
  const toast = useFeedToast();
  const locale = useLocale();
  const t = picker(locale);
  const { cart, ready, clear, promoCode, setPromoCode } = useCart();

  const [contact, setContact] = useState({
    name: prefill?.name ?? "",
    phone: prefill?.phone ?? "",
    email: prefill?.email ?? "",
    street: prefill?.street ?? "",
  });
  const [province, setProvince] = useState(prefill?.provinceCode ?? "");
  const [ward, setWard] = useState<PickItem | null>(
    prefill?.wardCode ? { value: prefill.wardCode, label: prefill.wardLabel } : null,
  );
  const [note, setNote] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMethod>("STANDARD");
  const [payment, setPayment] = useState<PaymentMethod>("BANK_TRANSFER");
  const [submitted, setSubmitted] = useState(false);
  const [promoText, setPromoText] = useState("");
  // The code that was refused, as typed ("" for none typed); its sentence is written at render.
  const [promoRefused, setPromoRefused] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<"province" | "ward">("province");
  const pickerBack = useRef<HTMLElement | null>(null);
  const [wards, setWards] = useState<Record<string, PickItem[]>>({});
  const [wardStatus, setWardStatus] = useState<Record<string, WardStatus>>({});
  const asked = useRef(new Set<string>());
  const [placing, startPlacing] = useTransition();
  const [held, setHeld] = useState<Held | null>(null);
  const after = useRef<(() => void) | null>(null);

  useEffect(() => {
    const run = after.current;
    after.current = null;
    run?.();
  });

  // One instant for the whole page, read again when the basket changes. Nothing below `ready` is server-rendered.
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
    totals: checkoutTotals({ subtotalVnd: liveSubtotal, delivery, payment, ...(livePromo ? { promo: livePromo } : {}) }),
  };
  // While an order is on its way, the page keeps showing what was pressed.
  const { lines, subtotalVnd, blocked, promo, totals } = held ?? live;

  // A code the basket carries that no longer applies (it was applied to another basket, or ran out): it stands in
  // the field with the reason, as the mock shows a refused code.
  const staleChecked = useRef(false);
  useEffect(() => {
    if (!ready || staleChecked.current) return;
    staleChecked.current = true;
    if (promoCode && !livePromo) {
      const check = feedPromoCheck(catalog, promoCode, liveSubtotal, now);
      if (!check.ok) {
        setPromoText(promoCode);
        setPromoRefused(promoCode);
      }
    }
  }, [ready, promoCode, livePromo, catalog, liveSubtotal, now]);

  // The refused code's sentence, in the page's language.
  const refusal = promoRefused === null ? null : feedPromoCheck(catalog, promoRefused, subtotalVnd, now, locale);
  const promoError = refusal && !refusal.ok ? refusal.message : "";

  const provinceItems = useMemo<PickItem[]>(() => provinces.map((p) => ({ value: p.code, label: p.name })), [provinces]);
  const provinceName = provinces.find((p) => p.code === province)?.name ?? "";
  const expressCity = provinces.find((p) => p.code === EXPRESS_PROVINCE_CODE)?.name ?? "";
  // The places' own names, on an English page (QĐ-40).
  const placeLang = locale === "en" ? ("vi" as const) : undefined;

  /** The communes of a province, asked for once (`/api/wards`, the official order). */
  const fetchWards = useCallback((code: string) => {
    if (!code || asked.current.has(code)) return;
    asked.current.add(code);
    setWardStatus((s) => ({ ...s, [code]: "loading" }));
    fetch(`/api/wards?province=${encodeURIComponent(code)}&order=official`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { wards: Ward[] }) => {
        setWards((w) => ({ ...w, [code]: data.wards.map((x) => ({ value: x.code, label: wardOptionLabel(x) })) }));
        setWardStatus((s) => {
          const next = { ...s };
          delete next[code];
          return next;
        });
      })
      .catch(() => {
        // Asked again the next time the picker opens, rather than remembered as failed.
        asked.current.delete(code);
        setWardStatus((s) => ({ ...s, [code]: "error" }));
      });
  }, []);

  // The chosen province's communes, fetched as soon as there is one, so its picker opens on the list.
  useEffect(() => {
    if (province) fetchWards(province);
  }, [province, fetchWards]);

  const wardItems = wards[province] ?? NO_ITEMS;
  const wardWaiting =
    wardStatus[province] === "error"
      ? t({ vi: "Không tải được", en: "Couldn't load" })
      : t({ vi: "Đang tải…", en: "Loading…" });

  const fields: FeedContact = {
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    provinceCode: province,
    wardCode: ward?.value ?? "",
    street: contact.street,
  };
  const errors = submitted ? feedFormErrors(fields, locale) : {};

  function openPicker(kind: "province" | "ward", opener: HTMLElement) {
    if (kind === "ward") {
      if (!province) return;
      fetchWards(province);
    }
    pickerBack.current = opener;
    setPickerKind(kind);
    setPickerOpen(true);
  }

  function chooseProvince(code: string) {
    if (code === province) {
      after.current = () => document.getElementById("f-ward")?.focus();
      return;
    }
    setProvince(code);
    setWard(null);
    if (delivery === "EXPRESS" && !isDeliveryAvailable("EXPRESS", code)) {
      setDelivery("STANDARD");
      toast(expressSwitchNote(expressCity, locale));
    }
    after.current = () => document.getElementById("f-ward")?.focus();
  }

  function chooseWard(item: PickItem) {
    setWard(item);
    after.current = () => document.getElementById("f-street")?.focus();
  }

  function applyPromo() {
    const typed = promoText.trim();
    if (!typed) {
      setPromoRefused("");
      return;
    }
    const check = feedPromoCheck(catalog, typed, subtotalVnd, now, locale);
    if (check.ok) {
      setPromoCode(check.promo.code);
      setPromoRefused(null);
      setPromoText("");
      after.current = () => document.getElementById("promo-drop")?.focus();
    } else {
      setPromoCode(null);
      setPromoRefused(typed);
    }
  }

  function dropPromo() {
    setPromoCode(null);
    after.current = () => document.getElementById("f-promo")?.focus();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    const wrong = firstWrong(feedFormErrors(fields, locale));
    if (wrong) {
      const el = document.getElementById(CONTROL[wrong]);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      return;
    }
    if (placing || blocked || lines.length === 0) return;

    // Only the basket, the form and the code go up; the server prices the order and trusts nothing else.
    const draft: CheckoutDraft = {
      recipient: contact.name.trim(),
      phone: contact.phone,
      email: contact.email.trim(),
      provinceCode: province,
      wardCode: ward?.value ?? "",
      line: contact.street.trim(),
      note: note.trim(),
      delivery,
      payment,
    };
    const payload = {
      lines: lines.map((l) => ({ productId: l.line.productId, color: l.line.color, size: l.line.size, qty: l.line.qty })),
      draft,
      promoCode: promo ? promo.code : null,
    };

    setHeld({ lines, subtotalVnd, blocked, promo, totals });
    startPlacing(async () => {
      // The refusal comes back in the request's language (`placeOrderAction`, `getActionLocale`).
      const result = await placeOrderAction(payload);
      if (!result.ok) {
        setHeld(null);
        toast(feedSentence(result.message));
        if (result.failure !== "INVALID" && failureMovesCatalog(result.failure)) router.refresh();
        return;
      }
      // The emptied basket and the receipt land together, in one transition (restated after the await).
      startPlacing(() => {
        const receipt = `/order-confirmed/${result.code}`;
        clear();
        startWait(receipt);
        router.push(receipt);
      });
    });
  }

  const pageTitle = t({ vi: "Thanh toán", en: "Checkout" });

  if (!ready) return <h1 className="sr-only">{pageTitle}</h1>;

  if (lines.length === 0 || blocked) {
    return (
      <div className="cop">
        <h1 className="sr-only">{pageTitle}</h1>
        <div className="empty-state">
          <span className="empty-ic">
            <FeedIcon name={blocked ? "warning-circle" : "bag"} />
          </span>
          <p className="empty-title">
            {blocked
              ? t({ vi: "Giỏ còn món đang vướng", en: "Your bag has items to fix" })
              : t({ vi: "Chưa có gì để thanh toán", en: "Nothing to check out yet" })}
          </p>
          <Link className="btn btn-blue" href={blocked ? "/cart" : "/products"}>
            {blocked ? t({ vi: "Về giỏ", en: "Back to bag" }) : t({ vi: "Xem Cửa hàng", en: "Go to Shop" })}
          </Link>
        </div>
      </div>
    );
  }

  const rows = checkoutRows(totals, promo ? promo.code : null, locale);
  const count = lines.reduce((n, l) => n + l.line.qty, 0);
  const placeLabel = placing ? t({ vi: "Đang đặt hàng…", en: "Placing order…" }) : null;
  const optional = t({ vi: "tuỳ chọn", en: "optional" });
  const set = (key: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContact((c) => ({ ...c, [key]: value }));
  };
  const inputAria = (f: FeedField) =>
    errors[f] ? { "aria-invalid": true as const, "aria-describedby": `e-${f}` } : {};

  return (
    <div className="cop">
      <h1 className="sr-only">{pageTitle}</h1>
      <form className="co" id="co-form" noValidate onSubmit={onSubmit}>
        <section className="co-sec" data-area="contact" aria-labelledby="h-contact">
          <div className="co-sec-head">
            <h2 className="sect-title" id="h-contact">
              {t({ vi: "Liên hệ", en: "Contact" })}
            </h2>
            {!me && (
              <Link className="link" href="/sign-in?next=%2Fcheckout">
                {t({ vi: "Đăng nhập", en: "Sign in" })}
              </Link>
            )}
          </div>
          <Field id="name" label={t({ vi: "Họ và tên", en: "Full name" })} error={errors.name}>
            <input id="f-name" name="name" autoComplete="name" value={contact.name} onChange={set("name")} {...inputAria("name")} />
          </Field>
          <Field id="phone" label={t({ vi: "Số điện thoại", en: "Phone number" })} error={errors.phone}>
            <input
              id="f-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t({ vi: "10 số, bắt đầu bằng 0", en: "10 digits, starting with 0" })}
              value={contact.phone}
              onChange={set("phone")}
              {...inputAria("phone")}
            />
          </Field>
          <Field id="email" label="Email" opt={optional} error={errors.email}>
            <input
              id="f-email"
              name="email"
              type="email"
              autoComplete="email"
              value={contact.email}
              onChange={set("email")}
              {...inputAria("email")}
            />
          </Field>
        </section>

        <section className="co-sec" data-area="address" aria-labelledby="h-address">
          <div className="co-sec-head">
            <h2 className="sect-title" id="h-address">
              {t({ vi: "Địa chỉ", en: "Address" })}
            </h2>
          </div>
          <div className="co-pair">
            <PickField
              id="province"
              label={t({ vi: "Tỉnh / thành", en: "Province / city" })}
              value={provinceName}
              valueLang={placeLang}
              empty={t({ vi: "Chọn tỉnh / thành", en: "Choose province / city" })}
              error={errors.province}
              onOpen={(el) => openPicker("province", el)}
            />
            <PickField
              id="ward"
              label={t({ vi: "Phường / xã", en: "Ward / commune" })}
              value={ward?.label ?? ""}
              valueLang={placeLang}
              empty={
                province
                  ? t({ vi: "Chọn phường / xã", en: "Choose ward / commune" })
                  : t({ vi: "Chọn tỉnh trước", en: "Choose a province first" })
              }
              disabled={!province}
              error={errors.ward}
              onOpen={(el) => openPicker("ward", el)}
            />
          </div>
          <Field id="street" label={t({ vi: "Số nhà, đường", en: "House number, street" })} error={errors.street}>
            <input
              id="f-street"
              name="street"
              autoComplete="address-line1"
              placeholder={t({ vi: "VD: 12 Nguyễn Huệ", en: "e.g. 12 Nguyễn Huệ" })}
              value={contact.street}
              onChange={set("street")}
              {...inputAria("street")}
            />
          </Field>
        </section>

        <section className="co-sec" data-area="delivery" aria-labelledby="h-delivery">
          <div className="co-sec-head">
            <h2 className="sect-title" id="h-delivery">
              {t({ vi: "Giao hàng", en: "Delivery" })}
            </h2>
          </div>
          <div className="rcards" role="radiogroup" aria-labelledby="h-delivery">
            {feedDeliveries(locale).map((d) => {
              // Express is out of reach once a province it does not serve is chosen (before that, it can be picked).
              const off = province !== "" && !isDeliveryAvailable(d.method, province);
              const fee = shippingFeeVnd(d.method, subtotalVnd);
              return (
                <label className={cx("rcard", off && "is-off")} key={d.method}>
                  <input
                    type="radio"
                    name="delivery"
                    value={d.method}
                    checked={delivery === d.method}
                    disabled={off}
                    onChange={() => setDelivery(d.method)}
                  />
                  <span className="rcard-ic">
                    <FeedIcon name={d.method === "EXPRESS" ? "lightning" : "truck"} />
                  </span>
                  <span className="rcard-main">
                    <span className="rcard-title">{d.title}</span>
                    <span className="rcard-sub">{deliverySub(d.method, nowIso, locale)}</span>
                    {d.note && (
                      <span className="rcard-note">
                        {off ? withPlace(expressOffNote(provinceName, locale), provinceName, locale) : d.note}
                      </span>
                    )}
                  </span>
                  <span className="rcard-price">{off ? "" : fee ? vnd(fee, locale) : t({ vi: "Miễn phí", en: "Free" })}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section className="co-sec" data-area="payment" aria-labelledby="h-payment">
          <div className="co-sec-head">
            <h2 className="sect-title" id="h-payment">
              {t({ vi: "Thanh toán", en: "Payment" })}
            </h2>
          </div>
          <div className="rcards" role="radiogroup" aria-labelledby="h-payment">
            {feedPayments(locale).map((p) => (
              <label className="rcard" key={p.method}>
                <input
                  type="radio"
                  name="payment"
                  value={p.method}
                  checked={payment === p.method}
                  onChange={() => setPayment(p.method)}
                />
                <span className="rcard-ic">
                  <FeedIcon name={PAY_IC[p.method]} />
                </span>
                <span className="rcard-main">
                  <span className="rcard-title">{p.title}</span>
                  <span className="rcard-note">{p.note}</span>
                </span>
                {p.price && <span className="rcard-price">{p.price}</span>}
              </label>
            ))}
          </div>
        </section>

        <aside
          className="co-side"
          data-area="side"
          aria-label={t({ vi: "Mã giảm giá và tóm tắt đơn", en: "Discount code and order summary" })}
        >
          <section className={cx("co-sec co-promo", promoError && "is-error")} aria-labelledby="h-promo">
            <h2 className="sect-title" id="h-promo">
              {t({ vi: "Mã giảm giá", en: "Discount code" })}
            </h2>
            {promo ? (
              <div className="promo-ok">
                <FeedIcon name="check-circle-fill" />
                <span className="promo-code">{promo.code}</span>
                <button className="link" type="button" id="promo-drop" onClick={dropPromo}>
                  {t({ vi: "Bỏ mã", en: "Remove code" })}
                </button>
              </div>
            ) : (
              <div className="promo">
                <label className="promo-field">
                  <span className="sr-only">{t({ vi: "Mã giảm giá", en: "Discount code" })}</span>
                  <input
                    id="f-promo"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder={t({ vi: "Nhập mã", en: "Enter code" })}
                    value={promoText}
                    onChange={(e) => {
                      setPromoText(e.target.value);
                      if (promoRefused !== null) setPromoRefused(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyPromo();
                      }
                    }}
                    {...(promoError ? { "aria-invalid": true as const, "aria-describedby": "e-promo" } : {})}
                  />
                </label>
                <button className="pill promo-go" type="button" onClick={applyPromo}>
                  {t({ vi: "Áp dụng", en: "Apply" })}
                </button>
              </div>
            )}
            {promoError && (
              <span className="err" id="e-promo">
                <FeedIcon name="warning-circle" />
                <span>{promoError}</span>
              </span>
            )}
          </section>

          <section className="co-sec co-sum" aria-labelledby="h-sum">
            <div className="co-sec-head">
              <h2 className="sect-title" id="h-sum">
                {t({ vi: "Tóm tắt", en: "Summary" })}
              </h2>
              <span className="co-count">{t<React.ReactNode>({ vi: <>{count} món</>, en: plural(count, "item", "items") })}</span>
            </div>
            <ul className="co-items">
              {lines.map((l) => (
                <SummaryItem key={l.key} l={l} />
              ))}
            </ul>
            <dl className="facts co-lines">
              {rows.map((r, i) => (
                <div key={i}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
            <div className="csum-total">
              <span>{t({ vi: "Tổng", en: "Total" })}</span>
              <b>{vnd(totals.totalVnd, locale)}</b>
            </div>
            <button className="btn btn-blue only-desk co-place" type="submit" disabled={placing}>
              {placeLabel ?? t({ vi: "Đặt hàng", en: "Place order" })}
            </button>
          </section>
        </aside>

        <section className="co-sec" data-area="note" aria-labelledby="h-note">
          <label className="field field-note">
            <span className="lbl" id="h-note">
              {t<React.ReactNode>({
                vi: (
                  <>
                    Ghi chú <span className="opt">tuỳ chọn</span>
                  </>
                ),
                en: (
                  <>
                    Note <span className="opt">optional</span>
                  </>
                ),
              })}
            </span>
            <textarea
              id="f-note"
              name="note"
              rows={3}
              maxLength={MAX_NOTE_LENGTH}
              placeholder={t({ vi: "Giờ nhận, chỉ đường", en: "Delivery time, directions" })}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </section>

        <div className="orderbar">
          <button className="btn btn-blue" type="submit" disabled={placing}>
            {placeLabel ??
              t<React.ReactNode>({
                vi: (
                  <>
                    Đặt hàng <span className="price">· {vnd(totals.totalVnd)}</span>
                  </>
                ),
                en: (
                  <>
                    Place order <span className="price">· {vnd(totals.totalVnd, "en")}</span>
                  </>
                ),
              })}
          </button>
        </div>
      </form>

      <FeedPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={pickerKind === "ward" ? t({ vi: "Phường / xã", en: "Ward / commune" }) : t({ vi: "Tỉnh / thành", en: "Province / city" })}
        sub={pickerKind === "ward" ? provinceName : undefined}
        placeholder={
          pickerKind === "ward"
            ? t({ vi: "Tìm phường / xã", en: "Search ward / commune" })
            : t({ vi: "Tìm tỉnh / thành", en: "Search province / city" })
        }
        items={pickerKind === "ward" ? wardItems : provinceItems}
        value={pickerKind === "ward" ? (ward?.value ?? null) : province || null}
        waiting={pickerKind === "ward" ? wardWaiting : null}
        lang={placeLang}
        onPick={(it) => (pickerKind === "ward" ? chooseWard(it) : chooseProvince(it.value))}
        back={pickerBack.current}
      />
    </div>
  );
}

interface FieldProps {
  id: FeedField;
  label: string;
  /** Beside the label, as the mock marks a field it does not require: "tuỳ chọn". */
  opt?: string;
  error: string | undefined;
  children: React.ReactNode;
}

/** A labelled field with its error under it (`checkout.js`: `field`). */
function Field({ id, label, opt, error, children }: FieldProps) {
  return (
    <label className={cx("field", error && "is-error")} data-f={id}>
      <span className="lbl">
        {label}
        {opt && (
          <>
            {" "}
            <span className="opt">{opt}</span>
          </>
        )}
      </span>
      {children}
      {error && (
        <span className="err" id={`e-${id}`}>
          <FeedIcon name="warning-circle" />
          <span>{error}</span>
        </span>
      )}
    </label>
  );
}

interface PickFieldProps {
  id: "province" | "ward";
  label: string;
  /** The choice's name, or "" before there is one. */
  value: string;
  /** The choice's language when it is not the page's: a place's Vietnamese name on an English page. */
  valueLang?: "vi" | undefined;
  /** What the button says before a choice: "Chọn tỉnh / thành", "Chọn tỉnh trước". */
  empty: string;
  disabled?: boolean;
  error: string | undefined;
  onOpen: (opener: HTMLElement) => void;
}

/** A field whose value is picked in a sheet (`checkout.js`: `pickField`). */
function PickField({ id, label, value, valueLang, empty, disabled = false, error, onOpen }: PickFieldProps) {
  return (
    <div className={cx("field", error && "is-error")} data-f={id}>
      <span className="lbl" id={`l-${id}`}>
        {label}
      </span>
      <button
        className="pick"
        type="button"
        id={`f-${id}`}
        aria-haspopup="dialog"
        aria-labelledby={`l-${id} v-${id}`}
        disabled={disabled}
        onClick={(e) => onOpen(e.currentTarget)}
        {...(error ? { "aria-invalid": true as const, "aria-describedby": `e-${id}` } : {})}
      >
        <span className={cx("pick-v", !value && "is-empty")} id={`v-${id}`} lang={value ? valueLang : undefined}>
          {value || empty}
        </span>
        <FeedIcon name="caret-down" />
      </button>
      {error && (
        <span className="err" id={`e-${id}`}>
          <FeedIcon name="warning-circle" />
          <span>{error}</span>
        </span>
      )}
    </div>
  );
}

/** One piece of the summary: the packshot, the bare name, colour, size and count, the line's money. */
function SummaryItem({ l }: { l: ResolvedLine }) {
  const locale = useLocale();
  const p = l.product;
  return (
    <li className="co-item">
      <span className={cx("co-thumb", isFixed(p) && "flat")}>
        <Image src={pictureOf(p, l.line.color, "pack").src} width={48} height={60} alt="" />
      </span>
      <span className="co-item-main">
        <span className="co-item-name disp" lang={nameLang(p, locale)}>
          {productText(p, locale).name}
        </span>
        <span className="co-item-meta">
          {colorLabel(l.line.color, locale)} · Size {l.line.size}
          {l.line.qty > 1 && ` · ×${l.line.qty}`}
        </span>
      </span>
      <span className="co-item-price">{vnd(l.lineTotalVnd, locale)}</span>
    </li>
  );
}
