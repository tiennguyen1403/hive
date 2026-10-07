import { findWard } from "@/data/regions";
import type { PaymentMethod } from "@/data/types";
import { picker, type Locale } from "./i18n";
import { isDeliveryAvailable, type DeliveryMethod } from "./shipping";

/**
 * What the checkout form holds, and what makes it wrong.
 *
 * Kept out of the component so the rules can be read and tested in one
 * place. A validator living inside a form is a validator nobody can check
 * without clicking through the form.
 */
export interface CheckoutDraft {
  recipient: string;
  phone: string;
  /** Optional since slice B8, as the Feed checkout has it: "" is none. */
  email: string;
  provinceCode: string;
  wardCode: string;
  /** House number and street. */
  line: string;
  note: string;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  /**
   * The v3 checkout's terms box. Read by nothing since slice B8: the Feed
   * checkout has no box, and a check that asked for it would record an
   * agreement nobody gave.
   */
  agreed?: boolean;
}

export type FieldName = keyof CheckoutDraft;
export type CheckoutErrors = Partial<Record<FieldName, string>>;

/**
 * A Vietnamese mobile number, in the one form the rest of the app stores.
 *
 * People type their number with spaces, dots or dashes, and sometimes with
 * +84 in front. All of those are the same number. Rejecting them would be
 * the form being fussy about punctuation at the last step of a purchase.
 * Returns "" for anything that is not a number at all.
 */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/[\s.\-()]/g, "");
  const local = digits
    .replace(/^\+84/, "0")
    .replace(/^84(?=\d{9}$)/, "0");
  return /^0\d{9}$/.test(local) ? local : "";
}

/**
 * Light on purpose: the job is to catch a typo before the confirmation is
 * sent into a void, not to decide which addresses the internet allows.
 * Anything stricter starts rejecting real people's real mailboxes.
 */
function looksLikeEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

/**
 * In both languages since round v6 slice E2: the Server Action that re-reads
 * the order (`readPlaceOrderPayload`) answers in the request's language. The
 * city keeps its Vietnamese name (QĐ-40).
 */
export function validateCheckout(d: CheckoutDraft, locale: Locale = "vi"): CheckoutErrors {
  const e: CheckoutErrors = {};
  const t = picker(locale);

  if (!d.recipient.trim()) e.recipient = t({ vi: "Cần tên người nhận.", en: "A recipient's name is needed." });
  if (!d.phone.trim()) {
    e.phone = t({ vi: "Cần số điện thoại để người giao gọi.", en: "A phone number is needed for the courier to call." });
  } else if (!normalisePhone(d.phone)) {
    e.phone = t({
      vi: "Số điện thoại chưa đúng: 10 số, bắt đầu bằng 0.",
      en: "The phone number isn't right. It has 10 digits, starting with 0.",
    });
  }
  // Optional (slice B8): none is fine, one that is typed has to look like one.
  if (d.email.trim() && !looksLikeEmail(d.email)) {
    e.email = t({ vi: "Email chưa đúng định dạng.", en: "The email isn't in a valid format." });
  }

  if (!d.provinceCode) e.provinceCode = t({ vi: "Chọn tỉnh / thành phố.", en: "Choose a province or city." });
  if (!d.wardCode) e.wardCode = t({ vi: "Chọn phường / xã.", en: "Choose a ward or commune." });
  else if (d.provinceCode && !findWard(d.provinceCode, d.wardCode)) {
    // Changing province and leaving the old ward behind is the usual way
    // this goes wrong, and a parcel addressed to a commune in another
    // province is a parcel that does not arrive.
    e.wardCode = t({
      vi: "Phường / xã này không thuộc tỉnh đã chọn.",
      en: "This ward or commune isn't in the chosen province.",
    });
  }
  if (!d.line.trim()) e.line = t({ vi: "Cần số nhà và tên đường.", en: "A house number and street are needed." });

  if (!isDeliveryAvailable(d.delivery, d.provinceCode || undefined)) {
    e.delivery = t({
      vi: "Giao nhanh chỉ có ở nội thành TP. Hồ Chí Minh.",
      en: "Express delivery only runs in central HCMC.",
    });
  }

  return e;
}
