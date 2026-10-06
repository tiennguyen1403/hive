import { stored, type Stored } from "./admin-text";
import { feedDelivery } from "./feed-checkout";
import { daysEn } from "./feed-home";
import type { Locale } from "./i18n";
import { DELIVERY_OPTIONS } from "./shipping";

/**
 * Who carries a parcel, in the page's language (round v6 slice E4).
 *
 * A handover stores the delivery service's Vietnamese label as the order's
 * carrier (`orders.carrier`, `isCarrier` in `lib/admin-orders.ts`): "Giao tiêu
 * chuẩn · 2–4 ngày", "Giao nhanh nội thành · 24 giờ". The column keeps the
 * Vietnamese; it is translated where it is printed, through a table keyed by
 * that label as stored, composed, trimmed and in lower case, as the cancel
 * reasons are (`cancelReasonLabel`, slice E2).
 *
 * The English is the checkout's (slice E2): the service's English title
 * (`feedDelivery(…, "en").title`, "Standard delivery", "Express city delivery")
 * and the label's own figures with their unit in English (`daysEn`), "Standard
 * delivery · 2–4 days". A carrier the app does not know — none today, but the
 * column is text — is printed as stored.
 */

const keyOf = (label: string) => label.normalize("NFC").trim().toLocaleLowerCase("vi");

const CARRIER_EN: ReadonlyMap<string, string> = new Map(
  DELIVERY_OPTIONS.map((o) => {
    const [, days = ""] = o.label.split(" · ");
    const title = feedDelivery(o.method, "en").title;
    return [keyOf(o.label), days ? `${title} · ${daysEn(days)}` : title] as const;
  }),
);

/** A stored carrier in one language: as stored in Vietnamese; in English the table's words, or as stored. */
export function carrierLabel(carrier: string, locale: Locale = "vi"): string {
  if (locale === "vi") return carrier;
  return CARRIER_EN.get(keyOf(carrier)) ?? carrier;
}

/**
 * The same, as a piece of a back-office phrase (`lib/admin-text.ts`): a carrier
 * the table does not know is a stored value, marked `lang="vi"` on an English
 * page when it is Vietnamese.
 */
export function carrierPiece(carrier: string, locale: Locale = "vi"): string | Stored {
  if (locale === "vi") return carrier;
  return CARRIER_EN.get(keyOf(carrier)) ?? stored(carrier, locale);
}
