"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { lookupOrderAction } from "@/lib/actions/order-lookup";
import { dayMonth } from "@/lib/datetime";
import {
  canReturn,
  cancelReasonText,
  groupLabelIn,
  lookupCheck,
  orderGroups,
  returnUntil,
  type LookupField,
} from "@/lib/feed-account";
import { BACK_IN_STOCK_EN, confirmTransfer } from "@/lib/feed-order";
import { signHref } from "@/lib/feed-sign-in";
import { picker, plural } from "@/lib/i18n";
import { vnd } from "@/lib/money";
import { lookupWordIn, type LookedUpOrder, type LookupErrors } from "@/lib/order-lookup";
import { orderUnits } from "@/lib/orders";
import { FeedClock } from "../FeedClock";
import { useMbarTitle } from "../FeedMbar";
import { useFeedToast } from "../FeedToast";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow, useNowMs } from "../now";
import { cx } from "../useReveal";
import { OrderSteps } from "./OrderBits";
import { CopyRow, OrderItems, OrderSums } from "./OrderView";

interface TrackViewProps {
  /** `?code=` as the page read it: looked up once, when the screen mounts (with `phone`). */
  code: string;
  /** `?phone=` as the page read it. */
  phone: string;
  /** Whether somebody is signed in: "Đơn hàng của bạn" and "Xem trang đơn", or the way in. */
  signedIn: boolean;
}

type Focus = "result" | "error" | "code" | null;

/**
 * Tra cứu đơn (round v4 slice 4a): the approved mock's `track.html` and
 * `track.js` — an order looked up without an account, by its code and the
 * phone number it was placed with.
 *
 * One column holds the page: the title, the form and, under it, the way to
 * the account's own orders or to signing in. The form is checked in the
 * mock's words before anything is asked (`lookupCheck`); a pair that passes
 * goes to `lookupOrderAction` (slice B11) inside a transition, the button
 * saying "Đang tra cứu" meanwhile — on the phone grey blocks hold the result's
 * place, from 900px the order simply takes the form's place. The server
 * answers the order, or which of the two did not match, under that field
 * ("Không có đơn nào mang mã này", "Số điện thoại không khớp với đơn"); a
 * visitor out of lookups, or a lookup that could not be made, gets the app's
 * own sentence in the toast. Editing a field clears its error.
 *
 * The result speaks the order page's language: the code as the heading on
 * screen with "Tra đơn khác", what it was bought from, the four steps with
 * their times, what can be done from here (the hold and what to transfer, the
 * call before a COD delivery — to the number just typed —, the waybill, the
 * return window, why it was cancelled), the pieces and, unless a transfer is
 * awaited, the totals. No address: it stays on the order's page, which one
 * link opens, or signs in first.
 *
 * The page never looks anything up while it renders — each lookup spends one
 * of the visitor's ten per ten minutes (`lib/db/order-lookup.ts`). A link that
 * carries `code` and `phone` is looked up once, when the screen mounts, and
 * never again as the address changes; after a lookup the address is written
 * with `history.replaceState`, as the mock writes it.
 *
 * In the page's language since round v6 slice E2 ("Track an order"). The
 * sentence under a field is kept as it came — from the check here or from the
 * server — and read through `lookupWordIn`, so a switch of language rewords it
 * in place.
 */
export function TrackView({ code: fromCode, phone: fromPhone, signedIn }: TrackViewProps) {
  const toast = useFeedToast();
  const locale = useLocale();
  const t = picker(locale);
  const [values, setValues] = useState({ code: fromCode, phone: fromPhone });
  const [errors, setErrors] = useState<LookupErrors>({});
  const [found, setFound] = useState<{ order: LookedUpOrder; phone: string; fresh: boolean } | null>(null);
  const [busy, startLookup] = useTransition();
  const [query, setQuery] = useState(() => queryOf(fromCode, fromPhone));
  const focus = useRef<Focus>(null);
  const opened = useRef(false);
  const has = found !== null;

  useMbarTitle(has);

  // The focus where the last answer sent it (`render(focus)`).
  useEffect(() => {
    const f = focus.current;
    if (!f) return;
    focus.current = null;
    const target =
      f === "result"
        ? document.querySelector<HTMLElement>("[data-ui='feed'] .b-res .od-code")
        : f === "error"
          ? document.querySelector<HTMLElement>("[data-ui='feed'] .b-trk-form [aria-invalid='true']")
          : document.getElementById("f-code");
    target?.focus();
  });

  /** The address after a lookup: the order's code and the ten digits while it stands, nothing otherwise (`writeUrl`). */
  function writeUrl(code: string, phone: string) {
    const q = queryOf(code, phone);
    setQuery(q);
    window.history.replaceState(null, "", q ? `/track?${q}` : "/track");
  }

  function lookUp(code: string, phone: string, fromForm: boolean) {
    startLookup(async () => {
      const answer = await lookupOrderAction(code, phone);
      startLookup(() => {
        if (answer.ok) {
          setErrors({});
          setFound({ order: answer.order, phone: phone.trim(), fresh: fromForm });
          writeUrl(answer.order.code, phone);
          if (fromForm) focus.current = "result";
          return;
        }
        if (answer.errors) {
          setErrors(answer.errors);
          setFound(null);
          writeUrl("", "");
          if (fromForm) focus.current = "error";
          return;
        }
        // Out of lookups for now, or the shop could not be reached: the app's sentence, the form as it was.
        toast(answer.message);
      });
    });
  }

  // A link that carries the code or the phone is looked up at once (`if (st.code || st.phone) run()`) — once,
  // however often the effect runs (a development build runs it twice), and never again as the address changes.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (!fromCode && !fromPhone) return;
    const check = lookupCheck(fromCode, fromPhone, locale);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    lookUp(fromCode, fromPhone, false);
    // Mount only, by design: the address is written by this screen afterwards.
  }, []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const check = lookupCheck(values.code, values.phone, locale);
    if (!check.ok) {
      setErrors(check.errors);
      setFound(null);
      focus.current = "error";
      return;
    }
    setErrors({});
    lookUp(values.code, values.phone, true);
  }

  // An error clears as soon as its field is edited.
  function edit(field: LookupField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (!errors[field]) return;
    setErrors((e) => {
      const rest = { ...e };
      delete rest[field];
      return rest;
    });
  }

  function again() {
    setFound(null);
    setValues({ code: "", phone: "" });
    writeUrl("", "");
    focus.current = "code";
  }

  const field = (name: LookupField, label: string, input: React.ReactNode) => {
    const error = errors[name];
    return (
      <label className={cx("field", error && "is-error")} data-f={name}>
        <span className="lbl">{label}</span>
        {input}
        <span className="err" id={`e-${name}`} hidden={!error}>
          {error && (
            <>
              <FeedIcon name="warning-circle" />
              <span>{lookupWordIn(error, locale)}</span>
            </>
          )}
        </span>
      </label>
    );
  };

  return (
    <>
      <div className={cx("b-head", has && "b-head-quiet")}>
        <h1 className="b-title disp">{t({ vi: "Tra cứu đơn", en: "Track an order" })}</h1>
      </div>
      <div className={cx("b-trk", has && "has-result", busy && "is-busy")}>
        <div className="b-trk-side">
          <form className="b-trk-form" action="/track" noValidate onSubmit={submit}>
            {field(
              "code",
              t({ vi: "Mã đơn", en: "Order code" }),
              <input
                id="f-code"
                name="code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                enterKeyHint="next"
                placeholder={t({ vi: "VD: DH-1499", en: "e.g. DH-1499" })}
                aria-describedby="e-code"
                aria-invalid={errors.code ? true : undefined}
                value={values.code}
                onChange={(e) => edit("code", e.target.value)}
              />,
            )}
            {field(
              "phone",
              t({ vi: "Số điện thoại đặt hàng", en: "Phone number on the order" }),
              <input
                id="f-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="search"
                aria-describedby="e-phone"
                aria-invalid={errors.phone ? true : undefined}
                value={values.phone}
                onChange={(e) => edit("phone", e.target.value)}
              />,
            )}
            <button className="btn btn-blue" type="submit" aria-busy={busy || undefined}>
              {busy ? t({ vi: "Đang tra cứu", en: "Tracking" }) : t({ vi: "Tra cứu", en: "Track" })}
            </button>
          </form>
          {!has &&
            (signedIn ? (
              <p className="b-trk-alt">
                <Link className="link" href="/account/orders">
                  <FeedIcon name="package" />
                  {t({ vi: "Đơn hàng của bạn", en: "Your orders" })}
                </Link>
              </p>
            ) : (
              <p className="b-trk-alt">
                {t({ vi: "Có tài khoản?", en: "Have an account?" })}{" "}
                <Link className="link" href={signHref("in", query ? `/track?${query}` : "/track")}>
                  {t({ vi: "Đăng nhập", en: "Sign in" })}
                </Link>
              </p>
            ))}
        </div>
        <div className="b-trk-main" aria-live="polite">
          {busy ? (
            <div className="b-skel" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          ) : found ? (
            <TrackResult order={found.order} phone={found.phone} fresh={found.fresh} signedIn={signedIn} onAgain={again} />
          ) : null}
        </div>
      </div>
    </>
  );
}

/** `code=DH-1499&phone=0938571204`, or "" when there is no order to point at. */
function queryOf(code: string, phone: string): string {
  if (!code || !phone) return "";
  return new URLSearchParams({ code, phone: phone.replace(/\D/g, "") }).toString();
}

interface TrackResultProps {
  order: LookedUpOrder;
  /** The number as the shopper typed it: what COD's line says the shop will call. */
  phone: string;
  /** Just looked up from the form: it fades in (desktop, motion on). One opened from a link is simply there. */
  fresh: boolean;
  signedIn: boolean;
  onAgain: () => void;
}

/** The order found (`track.js`: `result`). */
function TrackResult({ order, phone, fresh, signedIn, onAgain }: TrackResultProps) {
  const catalog = useCatalog();
  const locale = useLocale();
  const t = picker(locale);
  const now = useNow();
  const nowMs = useNowMs();
  const s = order.status;
  const units = orderUnits(order);
  const page = `/account/orders/${order.code}`;

  let act: React.ReactNode = null;
  const transfer = confirmTransfer(order, locale);
  if (s.state === "AWAITING_TRANSFER" && transfer) {
    act = (
      <section className="od-act" aria-label={t({ vi: "Chuyển khoản", en: "Bank transfer" })}>
        <p className="od-hold">
          <FeedClock
            until={transfer.dueAt}
            now={nowMs}
            tag="span"
            label={t({ vi: "Thời gian giữ hàng còn lại", en: "Reservation time left" })}
          />
        </p>
        <p className="od-act-line">
          {t<React.ReactNode>({
            vi: (
              <>
                Giữ hàng tới <b>{transfer.until}</b>. {transfer.note}
              </>
            ),
            en: (
              <>
                Reserved until <b>{transfer.until}</b>. {transfer.note}
              </>
            ),
          })}
        </p>
        <div className="od-pay">
          <CopyRow k={t({ vi: "Số tiền", en: "Amount" })} shown={vnd(transfer.amountVnd, locale)} value={String(transfer.amountVnd)} />
          <CopyRow k={t({ vi: "Nội dung", en: "Reference" })} shown={transfer.memo} value={transfer.memo} />
          <div className="copyrow is-pending">
            <span className="copy-k">{t({ vi: "Tài khoản", en: "Account" })}</span>
            <span className="copy-v">
              {t({ vi: "Số tài khoản và tên ngân hàng đang chuẩn bị", en: "Account number and bank name coming soon" })}
            </span>
          </div>
        </div>
      </section>
    );
  } else if (s.state === "RECEIVED") {
    act = (
      <section className="od-act" aria-label={t({ vi: "Xác nhận đơn", en: "Order confirmation" })}>
        <p className="od-act-line">
          {t<React.ReactNode>({
            vi: (
              <>
                Cửa hàng gọi <b>{phone}</b> để xác nhận trước khi giao.
              </>
            ),
            en: (
              <>
                The shop will call <b>{phone}</b> to confirm before delivery.
              </>
            ),
          })}
        </p>
      </section>
    );
  } else if (s.state === "SHIPPING" && s.trackingCode) {
    act = (
      <section className="od-act" aria-label={t({ vi: "Vận đơn", en: "Shipment" })}>
        <CopyRow k={t({ vi: "Mã vận đơn", en: "Tracking no." })} shown={s.trackingCode} value={s.trackingCode} />
      </section>
    );
  } else if (s.state === "DELIVERED" && canReturn(order, now)) {
    act = (
      <section className="od-act" aria-label={t({ vi: "Đổi trả", en: "Returns" })}>
        <p className="od-act-line">
          {t<React.ReactNode>({
            vi: (
              <>
                Đổi trả tới <b>{dayMonth(returnUntil(order)!)}</b>
              </>
            ),
            en: (
              <>
                Returns until <b>{dayMonth(returnUntil(order)!, "en")}</b>
              </>
            ),
          })}
        </p>
      </section>
    );
  } else if (s.state === "CANCELLED") {
    act = (
      <p className="od-why">
        <FeedIcon name="x" />
        <span>
          {t<React.ReactNode>({
            vi: <>{cancelReasonText(s.reason)}. Hàng đã về kệ.</>,
            en: (
              <>
                {cancelReasonText(s.reason, "en")}. {BACK_IN_STOCK_EN}
              </>
            ),
          })}
        </span>
      </p>
    );
  }

  return (
    <div className={cx("b-res", fresh && "is-fresh")}>
      <div className="b-res-head">
        <h2 className="od-code disp" tabIndex={-1}>
          {order.code}
        </h2>
        <button className="link" type="button" onClick={onAgain}>
          {t({ vi: "Tra đơn khác", en: "Track another order" })}
        </button>
      </div>
      <div className="od-meta">
        {orderGroups(catalog, order).map((g) => (
          <span className="chip-tag" key={String(g)}>
            {groupLabelIn(g, locale)}
          </span>
        ))}
      </div>
      <div className="od-steps">
        <OrderSteps order={order} />
      </div>
      {act}
      <section className="acc-sec" aria-labelledby="h-items">
        <div className="acc-sec-head">
          <h3 className="acc-sec-title" id="h-items">
            {t<React.ReactNode>({ vi: <>{units} món</>, en: plural(units, "item", "items") })}
          </h3>
        </div>
        <OrderItems lines={order.lines} />
      </section>
      {/* Unpaid by transfer, the amount is already in the block above with its copy button. */}
      {s.state !== "AWAITING_TRANSFER" && (
        <section className="acc-sec" aria-labelledby="h-sum">
          <div className="acc-sec-head">
            <h3 className="acc-sec-title" id="h-sum">
              {t({ vi: "Tóm tắt", en: "Summary" })}
            </h3>
          </div>
          <OrderSums order={order} />
        </section>
      )}
      <div className="b-res-go">
        {signedIn ? (
          <Link className="btn btn-line" href={page}>
            {t({ vi: "Xem trang đơn", en: "View order page" })}
          </Link>
        ) : (
          <Link className="btn btn-line" href={signHref("in", page)}>
            {t({ vi: "Đăng nhập để xem trang đơn", en: "Sign in to view the order page" })}
          </Link>
        )}
      </div>
    </div>
  );
}
