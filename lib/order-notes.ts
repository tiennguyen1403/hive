import type { Order } from "@/data/types";
import { phrase, stored, type Phrase, type Stored } from "./admin-text";
import { carrierPiece } from "./carrier";
import { isOrderEvent, type AdminEvent } from "./db/event-dto";
import { cancelReasonLabel } from "./feed-account";
import { picker, type Locale, type Pair } from "./i18n";
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

/**
 * The two hands in English (round v6 slice E4), as the log names them:
 * "Shop", "Customer". What the system recorded has no author; the screen says
 * "Hệ thống" / "System" for it.
 */
const AUTHOR_TEXT: Readonly<Record<"shop" | "customer", Pair>> = {
  shop: { vi: NOTE_AUTHOR, en: "Shop" },
  customer: { vi: CUSTOMER_AUTHOR, en: "Customer" },
};

export interface InternalNote {
  /**
   * Shown as-is. A `Phrase` (`lib/admin-text.ts`): one string on a Vietnamese
   * page, as it always was; on an English page the pieces, a note somebody
   * typed among them, marked so the screen can give it `lang="vi"`.
   */
  text: Phrase;
  /** "Cửa hàng", "Khách", or "" for what the system recorded; in English "Shop", "Customer". */
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
 *
 * In both languages since round v6 slice E4: the sentences the system writes
 * are translated; what somebody typed (a note, why an address changed) is
 * printed as stored; a cancel reason of the shop's own four, the hold that ran
 * out, and a carrier go through their tables (`cancelReasonLabel`,
 * `carrierLabel`). The Vietnamese sentences are unchanged.
 */
export function internalNotes(events: AdminEvent[], order: Order, locale: Locale = "vi"): InternalNote[] {
  const t = picker(locale);
  const sys = (text: Phrase, at: string): InternalNote => ({ text, author: "", at, system: true });
  const typed = (text: string, author: keyof typeof AUTHOR_TEXT, at: string): InternalNote => ({
    text: phrase(stored(text, locale)),
    author: t(AUTHOR_TEXT[author]),
    at,
    system: false,
  });
  const notes: InternalNote[] = [];

  for (const e of events) {
    // Only an order's own events: a reset, a shelf or a code is not a note.
    if (!isOrderEvent(e) || e.code !== String(order.code)) continue;
    switch (e.kind) {
      case "ORDER_PAID": {
        const ref = transferReference(order.code);
        const total = vnd(orderTotalVnd(order), locale);
        notes.push(
          e.actorRole === "system"
            ? sys(t({ vi: `Chuyển khoản khớp nội dung ${ref} · ${total}`, en: `Transfer matched reference ${ref} · ${total}` }), e.at)
            : sys(
                t({
                  vi: "Đã ghi nhận tiền về · đơn chuyển sang Đã thanh toán.",
                  en: "Payment recorded · the order is now Paid.",
                }),
                e.at,
              ),
        );
        break;
      }
      case "ORDER_SHIPPED":
        notes.push(
          sys(
            locale === "vi"
              ? e.carrier
                ? `Bàn giao · ${e.carrier} · mã vận đơn ${e.trackingCode}.`
                : `Bàn giao · mã vận đơn ${e.trackingCode}.`
              : e.carrier
                ? phrase("Handed over · ", carrierPiece(e.carrier, locale), ` · tracking no. ${e.trackingCode}.`)
                : `Handed over · tracking no. ${e.trackingCode}.`,
            e.at,
          ),
        );
        break;
      case "ORDER_DELIVERED":
        notes.push(
          sys(
            e.actorRole === "system"
              ? t({ vi: "Khách đã nhận hàng.", en: "The customer received the order." })
              : t({
                  vi: "Khách đã nhận hàng · cửa hàng đánh dấu tay.",
                  en: "The customer received the order · marked by hand.",
                }),
            e.at,
          ),
        );
        break;
      case "ORDER_CANCELLED":
        notes.push(
          sys(
            locale === "vi"
              ? `Huỷ đơn · lý do: ${e.reason}.`
              : phrase("Order cancelled · reason: ", cancelReasonPiece(e.reason, locale), "."),
            e.at,
          ),
        );
        if (e.note.trim()) notes.push(typed(e.note.trim(), "shop", e.at));
        break;
      case "ORDER_CANCELLED_BY_CUSTOMER":
        // One note, naming the hand: "Huỷ đơn" with nobody named reads as the
        // shop's own doing.
        notes.push({
          text: t({
            vi: "Khách huỷ đơn · đơn chưa thanh toán, hàng về kệ.",
            en: "The customer cancelled · unpaid, items back in stock.",
          }),
          author: t(AUTHOR_TEXT.customer),
          at: e.at,
          system: false,
        });
        break;
      case "ORDER_EXPIRED":
        notes.push(
          sys(
            t({ vi: "Huỷ đơn · lý do: quá hạn chuyển khoản.", en: "Order cancelled · reason: transfer overdue." }),
            e.at,
          ),
        );
        break;
      case "ORDER_NOTE":
        notes.push(typed(e.text, "shop", e.at));
        break;
      case "ORDER_ADDRESS_EDITED":
        notes.push(
          sys(
            locale === "vi"
              ? `Sửa địa chỉ giao · lý do: ${e.reason}`
              : phrase("Delivery address changed · reason: ", stored(e.reason, locale)),
            e.at,
          ),
        );
        break;
      default:
        break;
    }
  }

  return notes.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/**
 * A stored cancel reason inside an English sentence: one of the shop's own, in
 * the table's words, in lower case ("change of mind"); any other, as stored.
 */
function cancelReasonPiece(reason: string, locale: Locale): string | Stored {
  const english = cancelReasonLabel(reason, "en");
  if (english === reason) return stored(reason, locale);
  return english.charAt(0).toLocaleLowerCase("en") + english.slice(1);
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
