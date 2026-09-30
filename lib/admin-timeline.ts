import type { Order } from "@/data/types";
import { HANDOVER_LATE_DAYS } from "./admin-rows";
import { clockLabel, dateTimeLabel, dayMonth, sinceLabel } from "./datetime";

/**
 * "Hành trình", the back office's reading of one order, and the shape Arc's
 * `Stepper` draws it in (round v5 slice 1).
 *
 * `timelineOf` is the v3 order screen's own function
 * (`components/admin/AdminOrderScreen.tsx`), word for word: the v3 screen is
 * no longer routed, and the clean-up slice deletes it with its private copy.
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
 */
export function timelineOf(order: Order, now: Date, carrier?: string): Milestone[] {
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
    // A COD or card order the shop has taken, with nothing paid — every one
    // checkout places since slice B2, and the back office reads them since
    // B3a. The order, then the steps still ahead of it.
    case "RECEIVED":
      return [
        { ...placed, state: "now" },
        { title: "Chờ bàn giao", detail: "", state: "todo" },
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
        // A COD parcel on the road has collected nothing yet: no "paid" step.
        ...(order.payment === "COD"
          ? []
          : [{ title: "Đã thanh toán", detail: "", state: "done" as const }]),
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
