import type { Order } from "@/data/types";
import { HANDOVER_LATE_DAYS } from "./admin-rows";
import { carrierLabel } from "./carrier";
import { clockLabel, dateTimeLabel, dayMonth, sinceLabel } from "./datetime";
import { cancelReasonLabel } from "./feed-account";
import { picker, type Locale, type Pair } from "./i18n";

/**
 * "Hành trình", the back office's reading of one order, and the shape Arc's
 * `Stepper` draws it in (round v5 slice 1).
 *
 * `timelineOf` is the v3 order screen's own function
 * (`components/admin/AdminOrderScreen.tsx`), word for word; that screen and
 * its private copy went at round v5 slice 6, so this is the only one.
 */

export interface Milestone {
  title: string;
  detail: string;
  state: "done" | "now" | "todo" | "late";
}

/**
 * The order as five milestones — the back office's own reading of it.
 *
 * Not the shopper's steps (`orderSteps`, `lib/feed-account.ts`): those
 * answer "where is my parcel", this one answers "what is the shop late on".
 * So the middle step is "Chờ bàn giao" with the age on it, and it turns red
 * at the shop's own promise (`HANDOVER_LATE_DAYS` counts the row's red in the
 * queue for the same reason).
 *
 * In both languages since round v6 slice E4: the words below, the dates the
 * English way, the carrier by `carrierLabel` and a cancel reason by the shop's
 * table (`cancelReasonLabel`). The Vietnamese is the v3 screen's, unchanged.
 */
export function timelineOf(order: Order, now: Date, carrier?: string, locale: Locale = "vi"): Milestone[] {
  const t = picker(locale);
  const at = (iso: string) => `${clockLabel(iso)} · ${dayMonth(iso, locale)}`;
  const W = TIMELINE_WORDS;
  const placed: Milestone = {
    title: t(W.placed),
    detail: at(order.placedAt),
    state: "done",
  };
  const shipping = (detail: string, state: Milestone["state"]): Milestone => ({ title: t(W.shipping), detail, state });
  const delivered = (detail: string, state: Milestone["state"]): Milestone => ({ title: t(W.delivered), detail, state });

  switch (order.status.state) {
    case "AWAITING_TRANSFER":
      return [
        { ...placed, state: "now" },
        {
          title: t(W.awaitingTransfer),
          detail: t({ vi: `hạn ${dateTimeLabel(order.status.dueAt)}`, en: `due ${dateTimeLabel(order.status.dueAt, "en")}` }),
          state: "todo",
        },
        { title: t(W.awaitingHandover), detail: t(W.afterPayment), state: "todo" },
        shipping(t(W.afterHandover), "todo"),
        delivered(t(W.leadDays), "todo"),
      ];
    // A COD or card order the shop has taken, with nothing paid — every one
    // checkout places since slice B2, and the back office reads them since
    // B3a. The order, then the steps still ahead of it.
    case "RECEIVED":
      return [
        { ...placed, state: "now" },
        { title: t(W.awaitingHandover), detail: "", state: "todo" },
        shipping(t(W.afterHandover), "todo"),
        delivered(t(W.leadDays), "todo"),
      ];
    case "PAID": {
      const days = Math.floor((now.getTime() - Date.parse(order.status.paidAt)) / 86_400_000);
      const since = sinceLabel(order.status.paidAt, now, locale);
      return [
        placed,
        {
          title: t(W.paid),
          detail: at(order.status.paidAt),
          state: "done",
        },
        {
          title: t(W.awaitingHandover),
          detail: t({
            vi: `${since} · mục tiêu bàn giao trong 1 ngày sau thanh toán`,
            en: `${since} · target: hand over within 1 day of payment`,
          }),
          state: days >= HANDOVER_LATE_DAYS ? "late" : "now",
        },
        shipping(t(W.afterHandover), "todo"),
        delivered(t(W.leadDays), "todo"),
      ];
    }
    case "SHIPPING":
      return [
        placed,
        // A COD parcel on the road has collected nothing yet: no "paid" step.
        ...(order.payment === "COD"
          ? []
          : [{ title: t(W.paid), detail: "", state: "done" as const }]),
        { title: t(W.handedOver), detail: "", state: "done" },
        shipping(
          `${at(order.status.shippedAt)} · ${carrier ? `${carrierLabel(carrier, locale)} · ` : ""}${order.status.trackingCode}`,
          "now",
        ),
        delivered(t(W.leadDays), "todo"),
      ];
    case "DELIVERED":
      return [
        placed,
        { title: t(W.paid), detail: "", state: "done" },
        { title: t(W.handedOver), detail: "", state: "done" },
        shipping("", "done"),
        delivered(at(order.status.deliveredAt), "now"),
      ];
    case "CANCELLED":
      // A cancelled order does not show the steps it never reached: drawing
      // "Đang giao" greyed out under a cancellation suggests it is coming.
      return [
        placed,
        {
          title: t({
            vi: `Đã huỷ · ${order.status.reason}`,
            en: `Cancelled · ${cancelReasonLabel(order.status.reason, "en")}`,
          }),
          detail: at(order.status.cancelledAt),
          state: "late",
        },
      ];
  }
}

/**
 * The milestones' words, in both languages (round v6 slice E4). The states are
 * the glossary's ("Order received", "Awaiting transfer", "Paid", "Shipping",
 * "Delivered"); the steps between them name the shop's own move, "Awaiting
 * handover", "Handed over". "2–4 ngày" is the standard service's promise.
 */
const TIMELINE_WORDS = {
  placed: { vi: "Đã nhận đơn", en: "Order received" },
  awaitingTransfer: { vi: "Chờ chuyển khoản", en: "Awaiting transfer" },
  awaitingHandover: { vi: "Chờ bàn giao", en: "Awaiting handover" },
  paid: { vi: "Đã thanh toán", en: "Paid" },
  handedOver: { vi: "Đã bàn giao", en: "Handed over" },
  shipping: { vi: "Đang giao", en: "Shipping" },
  delivered: { vi: "Đã giao", en: "Delivered" },
  afterPayment: { vi: "sau khi tiền về", en: "after payment arrives" },
  afterHandover: { vi: "sau khi bàn giao", en: "after handover" },
  leadDays: { vi: "2–4 ngày", en: "2–4 days" },
} as const satisfies Record<string, Pair>;

/** One step as Arc's `Stepper` takes it (`registry/components/stepper/stepper.tsx`). */
export interface TimelineStep {
  /** The milestone's title: unique within one order's timeline, and stable while its state moves on. */
  id: string;
  label: string;
  description?: string;
  error?: string;
}

/**
 * The milestones as the `Stepper`'s `steps` and `current` (brief v5 slice 1,
 * §3.2): the title is the label and the detail its description; a late
 * milestone carries its detail as the error instead, which is how the Stepper
 * draws a step in the danger colour with an alert in its marker. `current` is
 * the first milestone that is "now" or "late"; with none, every step is done
 * and it is `steps.length`, the Stepper's "complete".
 *
 * An empty detail is no description at all, not an empty line.
 */
export function timelineSteps(milestones: Milestone[]): { steps: TimelineStep[]; current: number } {
  const steps = milestones.map<TimelineStep>((m) => ({
    id: m.title,
    label: m.title,
    ...(m.detail ? (m.state === "late" ? { error: m.detail } : { description: m.detail }) : {}),
  }));
  const at = milestones.findIndex((m) => m.state === "now" || m.state === "late");
  return { steps, current: at === -1 ? milestones.length : at };
}
