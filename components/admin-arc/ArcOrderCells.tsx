import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleContext";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import type { Order } from "@/data/types";
import type { AdminOrder } from "@/lib/admin-orders";
import { guestSuffix, orderCustomerName, orderNote } from "@/lib/admin-rows";
import { storedLang } from "@/lib/admin-text";
import type { CustomerTag } from "@/lib/customer-tags";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { cancelReasonLabel } from "@/lib/feed-account";
import { picker } from "@/lib/i18n";
import { adminPaymentLabel, orderStateLabel, type StatusTone } from "@/lib/order-labels";
import { formatPhone } from "@/lib/phone";
import { Avatar } from "@/registry/components/avatar/avatar";
import { Badge, type BadgeTone } from "@/registry/components/badge/badge";
import styles from "./ArcOrdersScreen.module.css";

/**
 * The cells of the Arc order book: what each v3 cell printed
 * (`components/admin/AdminOrdersScreen.tsx`), with the same lines under the
 * values, drawn with Arc's badge and avatar.
 *
 * In the page's language since round v6 slice E4 (`useLocale()`): the
 * glossary's states and ways of paying, the dates the English way, a cancel
 * reason by the shop's table. A name and an address are printed as stored, and
 * on an English page their element says `lang="vi"`; the Vietnamese markup is
 * unchanged.
 */

/**
 * A status label's tone (`StatusTone`, the job v3's badge tones did) to Arc's
 * (brief v5 slice 0, §3.6). The order's own page reads it too, for the badge
 * beside its code (slice 1).
 */
export const TONE: Record<StatusTone, BadgeTone> = {
  warn: "warning",
  ok: "success",
  info: "info",
  shut: "neutral",
  hot: "danger",
  // Not used by `STATE_LABEL`; the plain tones.
  "": "neutral",
  flat: "neutral",
};

/**
 * The customer label's tone, the badge table's way (brief v5 slice 1, §3.2):
 * v3 drew "quay lại" in the `ok` green and "mới" in the `info` blue; the
 * streak label wore the pale honey, v3's `flat`, which slice 0 reads as
 * neutral. The order's customer panel, the customer table and the customer's
 * own page read it (slices 1 and 3).
 */
export const TAG_TONE: Record<CustomerTag["tone"], BadgeTone> = {
  back: "success",
  new: "info",
  "": "neutral",
};

export function CodeCell({ code }: { code: string }) {
  return (
    <Link href={`/admin/orders/${code}`} className={styles.code}>
      {code}
    </Link>
  );
}

/**
 * The name Arc's `Avatar` takes its two letters from. Arc reads the first two
 * words; a Vietnamese name runs họ · đệm · tên, and the letters the back
 * office has always shown are the family name and the given name, the first
 * word and the last (v3's `initialsOf`, gone with the v3 screens at round v5
 * slice 6). "Trần Minh Anh" is "TA", as on every v3 screen, not "TM". The avatar is hidden from assistive tech: the name is
 * printed beside it.
 */
export function monogramName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length > 2 ? `${words[0]} ${words.at(-1)}` : words.join(" ");
}

/** The name on one line and the phone under it, as v3 held the whole cell (`td.nw`). */
export function CustomerCell({ order }: { order: AdminOrder }) {
  const locale = useLocale();
  const { name, guest } = orderCustomerName(order);
  // A Vietnamese name on an English page; a sign-up may be called anything.
  const own = storedLang(name, locale);
  return (
    <span className={styles.who}>
      <Avatar
        name={monogramName(order.owner?.name ?? order.shipTo.recipient)}
        size="sm"
        aria-hidden="true"
        lang={own}
      />
      <span className={styles.stack}>
        {own ? (
          <span className={styles.nowrap}>
            <span lang="vi">{name}</span>
            {guest ? ` · ${guestSuffix(locale)}` : ""}
          </span>
        ) : (
          <span className={styles.nowrap}>{guest ? `${name} · ${guestSuffix(locale)}` : name}</span>
        )}
        <span className={`${styles.line} ${styles.nowrap}`}>{formatPhone(order.shipTo.phone)}</span>
      </span>
    </span>
  );
}

/**
 * What is in the box: each style entry is held together, so the list breaks at
 * its commas (`orderItemsLabel`). `lang` is the list's (`orderItemsLang`):
 * `"vi"` on an English page when every name in it is Vietnamese.
 */
export function ItemsCell({ label, lang }: { label: string; lang?: "vi" }) {
  return (
    <span className={styles.text} lang={lang}>
      {label}
    </span>
  );
}

/** An amount is one value: it never breaks. The column is right-aligned with tabular figures (Arc's `numeric`). */
export function AmountCell({ text }: { text: string }) {
  return <span className={styles.nowrap}>{text}</span>;
}

/** When it was placed, "07:52 · 05/10": the clock first, as the back office writes every moment (round v6 slice R2). */
export function PlacedCell({ order }: { order: Order }) {
  const locale = useLocale();
  return (
    <span className={`${styles.nowrap} ${styles.num}`}>
      {clockLabel(order.placedAt)} · {dayMonth(order.placedAt, locale)}
    </span>
  );
}

/**
 * How it is being paid, and where that stands: v3's `paymentCell`. COD says
 * "thu khi giao" and not the surcharge, which the stored total does not
 * contain. A paid order says when the money came, "nhận 07:52 · 28/09", one
 * moment held on one line, as in v3. An order waiting for its money, by
 * transfer or by card, says its way of paying alone: its deadline is under
 * its state on the same row (`StatusCell`, "hạn 08:05 · 08/10"), so the line
 * "hạn …" this cell carried until round v6 slice R2 (G4) is gone, as the line
 * "chờ chuyển khoản" under "Thẻ" went at slice B18.
 */
export function PaymentCell({ order }: { order: Order }) {
  const locale = useLocale();
  const t = picker(locale);
  const label = adminPaymentLabel(order.payment, locale);
  const state = order.status;
  if (order.payment === "COD") {
    return (
      <span className={`${styles.stack} ${styles.nowrap}`}>
        <span>{label}</span>
        <span className={styles.line}>{t({ vi: "thu khi giao", en: "collect on delivery" })}</span>
      </span>
    );
  }
  return (
    <span className={`${styles.stack} ${styles.nowrap}`}>
      <span>{label}</span>
      {/* The Vietnamese keeps its own markup, word and values in the text nodes
          they always were: split differently, the last glyph lands a fraction
          of a pixel elsewhere (round v6 slice E1's lesson). */}
      {state.state === "PAID" &&
        (locale === "vi" ? (
          <span className={`${styles.line} ${styles.num}`}>
            nhận {clockLabel(state.paidAt)} · {dayMonth(state.paidAt)}
          </span>
        ) : (
          // "paid", not "received": at 1280, beside a page scrollbar, the longer word made the order book
          // 13px wider than its card (round v6 slice E4); "paid 07:52 · 30 Sep" is as wide as "nhận 07:52 · 30/09".
          <span className={`${styles.line} ${styles.num}`}>
            paid {clockLabel(state.paidAt)} · {dayMonth(state.paidAt, locale)}
          </span>
        ))}
    </span>
  );
}

/** The street, then the ward and the province: wide enough to read (about 220px with the cell), breaking only between words. */
export function AddressCell({ order }: { order: Order }) {
  const locale = useLocale();
  const ward = findWard(order.shipTo.provinceCode, order.shipTo.wardCode);
  const province = findProvince(order.shipTo.provinceCode);
  // A Vietnamese address on an English page (QĐ-40): printed as stored, said in Vietnamese.
  const place = locale === "en" ? ("vi" as const) : undefined;
  return (
    <span className={`${styles.stack} ${styles.address}`} lang={place}>
      <span>{order.shipTo.line}</span>
      <span className={styles.line}>
        {[ward && wardLabel(ward), province && provinceLabel(province)].filter(Boolean).join(", ")}
      </span>
    </span>
  );
}

/**
 * The state, and the line under it: the reason a cancelled order gives, or
 * what the order is waiting for (`orderNote`), in the danger colour once it
 * is past the shop's own promise. The colour always comes with the words.
 * Every line holds on one line, as in v3: "chưa bàn giao · 2 ngày", "quá hạn
 * chuyển khoản", a tracking code.
 */
export function StatusCell({ order, now }: { order: Order; now: Date }) {
  const locale = useLocale();
  // A card order waiting for its money is "Chờ trả thẻ" (slice B18).
  const s = orderStateLabel(order, locale);
  const note = orderNote(order, now, locale);
  // The small pill: a table row is dense, and "Chờ chuyển khoản" in the
  // default size alone makes the column wider than the card at 1280.
  return (
    <span className={`${styles.stack} ${styles.nowrap}`}>
      <Badge tone={TONE[s.tone]} size="sm">
        {s.text}
      </Badge>
      {order.status.state === "CANCELLED" && <CancelReason reason={order.status.reason} locale={locale} />}
      {note && <span className={note.late ? styles.late : styles.line}>{note.text}</span>}
    </span>
  );
}

/**
 * Why a cancelled order was cancelled, under its state: as stored in
 * Vietnamese; in English one of the app's own reasons in the shop's table's
 * words (`cancelReasonLabel`, slice E2), any other as stored, said in
 * Vietnamese.
 */
function CancelReason({ reason, locale }: { reason: string; locale: "vi" | "en" }) {
  const shown = cancelReasonLabel(reason, locale);
  const kept = locale === "en" && shown === reason ? ("vi" as const) : undefined;
  return (
    <span className={styles.line} lang={kept}>
      {shown}
    </span>
  );
}
