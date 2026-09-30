import Link from "next/link";
import type { BadgeTone as V3BadgeTone } from "@/components/ui/Badge";
import { findProvince, findWard, provinceLabel, wardLabel } from "@/data/regions";
import type { Order } from "@/data/types";
import type { AdminOrder } from "@/lib/admin-orders";
import { orderCustomer, orderNote } from "@/lib/admin-rows";
import { clockLabel, dayMonth } from "@/lib/datetime";
import { PAYMENT_LABEL, STATE_LABEL } from "@/lib/order-labels";
import { formatPhone } from "@/lib/phone";
import { Avatar } from "@/registry/components/avatar/avatar";
import { Badge, type BadgeTone } from "@/registry/components/badge/badge";
import styles from "./ArcOrdersScreen.module.css";

/**
 * The cells of the Arc order book: what each v3 cell printed
 * (`components/admin/AdminOrdersScreen.tsx`), with the same lines under the
 * values, drawn with Arc's badge and avatar.
 */

/** v3's badge tones, by the job they did, to Arc's (brief, §3.6). */
const TONE: Record<V3BadgeTone, BadgeTone> = {
  warn: "warning",
  ok: "success",
  info: "info",
  shut: "neutral",
  hot: "danger",
  // Not used by `STATE_LABEL`; the plain tones.
  "": "neutral",
  flat: "neutral",
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
 * word and the last (`lib/initials.ts`). "Trần Minh Anh" is "TA", as on every
 * v3 screen, not "TM". The avatar is hidden from assistive tech: the name is
 * printed beside it.
 */
function monogramName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length > 2 ? `${words[0]} ${words.at(-1)}` : words.join(" ");
}

/** The name on one line and the phone under it, as v3 held the whole cell (`td.nw`). */
export function CustomerCell({ order }: { order: AdminOrder }) {
  return (
    <span className={styles.who}>
      <Avatar
        name={monogramName(order.owner?.name ?? order.shipTo.recipient)}
        size="sm"
        aria-hidden="true"
      />
      <span className={styles.stack}>
        <span className={styles.nowrap}>{orderCustomer(order)}</span>
        <span className={`${styles.line} ${styles.nowrap}`}>{formatPhone(order.shipTo.phone)}</span>
      </span>
    </span>
  );
}

/** What is in the box: each style entry is held together, so the list breaks at its commas (`orderItemsLabel`). */
export function ItemsCell({ label }: { label: string }) {
  return <span className={styles.text}>{label}</span>;
}

/** An amount is one value: it never breaks. The column is right-aligned with tabular figures (Arc's `numeric`). */
export function AmountCell({ text }: { text: string }) {
  return <span className={styles.nowrap}>{text}</span>;
}

export function PlacedCell({ order }: { order: Order }) {
  return (
    <span className={`${styles.nowrap} ${styles.num}`}>
      {dayMonth(order.placedAt)} · {clockLabel(order.placedAt)}
    </span>
  );
}

/**
 * How it is being paid, and where that stands: v3's `paymentCell`. COD says
 * "thu khi giao" and not the surcharge, which the stored total does not
 * contain. A card order pays by transfer since slice B7, so while its money
 * is owed it says "chờ chuyển khoản" under "Thẻ". Every line holds on one
 * line, as in v3: "nhận 07:52 · 28/09" is one moment.
 */
export function PaymentCell({ order }: { order: Order }) {
  const label = PAYMENT_LABEL[order.payment];
  const state = order.status;
  if (order.payment === "COD") {
    return (
      <span className={`${styles.stack} ${styles.nowrap}`}>
        <span>{label}</span>
        <span className={styles.line}>thu khi giao</span>
      </span>
    );
  }
  const owed = state.state === "AWAITING_TRANSFER" || state.state === "RECEIVED";
  return (
    <span className={`${styles.stack} ${styles.nowrap}`}>
      <span>{label}</span>
      {order.payment === "CARD" && owed && <span className={styles.line}>chờ chuyển khoản</span>}
      {state.state === "AWAITING_TRANSFER" && (
        <span className={`${styles.line} ${styles.num}`}>
          hạn {clockLabel(state.dueAt)} · {dayMonth(state.dueAt)}
        </span>
      )}
      {state.state === "PAID" && (
        <span className={`${styles.line} ${styles.num}`}>
          nhận {clockLabel(state.paidAt)} · {dayMonth(state.paidAt)}
        </span>
      )}
    </span>
  );
}

/** The street, then the ward and the province: wide enough to read (about 220px with the cell), breaking only between words. */
export function AddressCell({ order }: { order: Order }) {
  const ward = findWard(order.shipTo.provinceCode, order.shipTo.wardCode);
  const province = findProvince(order.shipTo.provinceCode);
  return (
    <span className={`${styles.stack} ${styles.address}`}>
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
  const s = STATE_LABEL[order.status.state];
  const note = orderNote(order, now);
  // The small pill: a table row is dense, and "Chờ chuyển khoản" in the
  // default size alone makes the column wider than the card at 1280.
  return (
    <span className={`${styles.stack} ${styles.nowrap}`}>
      <Badge tone={TONE[s.tone]} size="sm">
        {s.text}
      </Badge>
      {order.status.state === "CANCELLED" && <span className={styles.line}>{order.status.reason}</span>}
      {note && <span className={note.late ? styles.late : styles.line}>{note.text}</span>}
    </span>
  );
}
