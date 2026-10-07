"use client";

import { useActionState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { payByCard } from "@/lib/actions/orders";
import { PAY_BY_CARD_IDLE } from "@/lib/card-checkout";
import { picker } from "@/lib/i18n";
import { FeedIcon } from "../icon/FeedIcon";

interface PayByCardProps {
  /** The order to pay for. The action looks it up the way the page did, and trusts nothing else. */
  code: string;
  /** The wrapper's class where the page spaces it (`.pay-card` on the receipt); none inside `.od-act`, which spaces its buttons. */
  className?: string;
}

/**
 * "Trả bằng thẻ" (slice B18, QĐ-46): a card order still waiting for its money
 * opens a new Stripe page — on its receipt and on its page in the account,
 * until its hold runs out.
 *
 * A form with the order's code and one button, sent to `payByCard` through
 * `useActionState` (react.dev/reference/react/useActionState): the action
 * answers with a redirect to Stripe — a full-page navigation, the only way the
 * browser ever reaches Stripe; no Stripe script is loaded — or with a sentence
 * under the button when no page opened (the rate limit, an order that can no
 * longer be paid, Stripe not answering). A form post, so it works before the
 * page's JavaScript has loaded too. While the press is on its way the button
 * says so and does nothing more.
 */
export function PayByCard({ code, className }: PayByCardProps) {
  const t = picker(useLocale());
  const [state, dispatch, pending] = useActionState(payByCard, PAY_BY_CARD_IDLE);
  return (
    <form action={dispatch} className={className}>
      <input type="hidden" name="code" value={code} />
      <button className="btn btn-blue" type="submit" disabled={pending}>
        {pending ? t({ vi: "Đang mở Stripe…", en: "Opening Stripe…" }) : t({ vi: "Trả bằng thẻ", en: "Pay by card" })}
      </button>
      {state.message && (
        <span className="err" role="alert">
          <FeedIcon name="warning-circle" />
          <span>{state.message}</span>
        </span>
      )}
    </form>
  );
}
