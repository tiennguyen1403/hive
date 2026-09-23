import type { Order } from "@/data/types";
import { isOrderEvent, type AdminEvent } from "./db/event-dto";
import { vnd } from "./money";
import { orderTotalVnd, transferReference } from "./orders";

/**
 * "Ghi chú nội bộ" on the back office's order screen — the order's own
 * events, read a second way.
 *
 * Until slice B3a the panel stitched two sources together: notes derived
 * from the FIXTURE status (a paid sample order "matched its transfer"), and
 * notes the browser's simulation wrote for what was pressed in it. Both are
 * the `events` table now — `reset_demo()` writes the sample's history into it
 * and every admin function writes its own line — so the panel, the activity
 * log and the order's status are three readings of one record and cannot
 * disagree.
 */

/** Who a note came from: the shop's own hand. */
export const NOTE_AUTHOR = "Cửa hàng";

/** The shopper's own hand — their cancellation from "Đơn hàng". */
export const CUSTOMER_AUTHOR = "Khách";

export interface InternalNote {
  /** Shown as-is. */
  text: string;
  /** "Cửa hàng", "Khách", or "" for what the system recorded. */
  author: string;
  at: string;
  /** A note nobody typed — rendered quieter, `.ni.sys`. */
  system: boolean;
}

/**
 * Every note an order carries, oldest first.
 *
 * A cancellation with an internal comment is two notes — what happened, and
 * what the shop wrote about it — because they have different authors. The
 * moment an order was placed is not a note: the timeline beside the panel
 * already opens with it.
 */
export function internalNotes(events: AdminEvent[], order: Order): InternalNote[] {
  const sys = (text: string, at: string): InternalNote => ({ text, author: "", at, system: true });
  const notes: InternalNote[] = [];

  for (const e of events) {
    // Only an order's own events: a reset, a shelf or a code is not a note.
    if (!isOrderEvent(e) || e.code !== String(order.code)) continue;
    switch (e.kind) {
      case "ORDER_PAID":
        notes.push(
          e.actorRole === "system"
            ? sys(
                `Chuyển khoản khớp nội dung ${transferReference(order.code)} · ${vnd(orderTotalVnd(order))}`,
                e.at,
              )
            : sys("Đã ghi nhận tiền về · đơn chuyển sang Đã thanh toán.", e.at),
        );
        break;
      case "ORDER_SHIPPED":
        notes.push(
          sys(
            e.carrier
              ? `Bàn giao · ${e.carrier} · mã vận đơn ${e.trackingCode}.`
              : `Bàn giao · mã vận đơn ${e.trackingCode}.`,
            e.at,
          ),
        );
        break;
      case "ORDER_DELIVERED":
        notes.push(
          sys(
            e.actorRole === "system"
              ? "Khách đã nhận hàng."
              : "Khách đã nhận hàng · cửa hàng đánh dấu tay.",
            e.at,
          ),
        );
        break;
      case "ORDER_CANCELLED":
        notes.push(sys(`Huỷ đơn · lý do: ${e.reason}.`, e.at));
        if (e.note.trim()) {
          notes.push({ text: e.note.trim(), author: NOTE_AUTHOR, at: e.at, system: false });
        }
        break;
      case "ORDER_CANCELLED_BY_CUSTOMER":
        // One note, naming the hand: "Huỷ đơn" with nobody named reads as the
        // shop's own doing.
        notes.push({
          text: "Khách huỷ đơn · đơn chưa thanh toán, hàng về kệ.",
          author: CUSTOMER_AUTHOR,
          at: e.at,
          system: false,
        });
        break;
      case "ORDER_EXPIRED":
        notes.push(sys("Huỷ đơn · lý do: quá hạn chuyển khoản.", e.at));
        break;
      case "ORDER_NOTE":
        notes.push({ text: e.text, author: NOTE_AUTHOR, at: e.at, system: false });
        break;
      case "ORDER_ADDRESS_EDITED":
        notes.push(sys(`Sửa địa chỉ giao · lý do: ${e.reason}`, e.at));
        break;
      default:
        break;
    }
  }

  return notes.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/**
 * Why this order's address was last changed, for the order screen and the
 * slip — the LAST edit wins, because it is the address the parcel carries.
 */
export function addressEditReason(events: AdminEvent[], code: string): string | undefined {
  let reason: string | undefined;
  for (const e of events) {
    if (e.kind === "ORDER_ADDRESS_EDITED" && e.code === code) reason = e.reason;
  }
  return reason;
}
