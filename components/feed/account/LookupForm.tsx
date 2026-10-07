"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { startWait } from "@/components/shop/WaitVeil";
import { lookupFormAction } from "@/lib/actions/order-lookup";
import { lookupCheck, type LookupField } from "@/lib/feed-account";
import { picker } from "@/lib/i18n";
import { TRACK_PATH } from "@/lib/lookup";
import { NO_LOOKUP, lookupWordIn } from "@/lib/order-lookup";
import { FeedIcon } from "../icon/FeedIcon";
import { cx } from "../useReveal";
import { handOver } from "./lookup-handoff";

interface LookupFormProps {
  /** Prefixes the ids, so two forms never share one: "orders", "od". */
  id: string;
  /** The code the page already knows, typed in for the shopper (an order's page, signed out). */
  code?: string;
}

/**
 * "Tra cứu đơn" without an account (`account.js`: `lookupForm`): the order's
 * code and the phone it was placed with, checked in the mock's words when the
 * button is pressed, the first wrong field taking the focus; a valid pair
 * opens the lookup page (`/track`, v3 until slice 4), where the lookup runs
 * and its answer is shown.
 *
 * THE NUMBER NEVER GOES IN AN ADDRESS (slice B19). Of the brief's two ways —
 * look up right here, or open `/track?code=…` without losing the number — it
 * takes the second: the answer keeps its one screen (Tôi and an order's page
 * gain no result block of their own), and the flow is the one shoppers had.
 *
 *   · With script: the address is `/track?code=…` and the number is handed
 *     over in this tab's memory (`lookup-handoff.ts`), which the lookup page
 *     takes once when it mounts — nothing new kept on the device.
 *   · Without script: the form posts the pair to `/track` through the
 *     lookup's Server Action (`useActionState` with the same action and
 *     permalink as the lookup page's own form), and `/track` comes back drawn
 *     with the answer. With script the form never posts.
 *
 * In the page's language since round v6 slice E3a, in the words of the
 * lookup page ("Track an order", "Order code", "Phone number on the order",
 * "Track"); a sentence under a field is kept as it came and read through
 * `lookupWordIn`, so a switch of language rewords it in place.
 */
export function LookupForm({ id, code = "" }: LookupFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = picker(locale);
  const [values, setValues] = useState({ code, phone: "" });
  const [errors, setErrors] = useState<Partial<Record<LookupField, string>>>({});
  // The page without script: the form's action. Its answer is drawn by `/track` (`TrackView`), not here.
  const [, send] = useActionState(lookupFormAction, NO_LOOKUP, TRACK_PATH);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const check = lookupCheck(values.code, values.phone, locale);
    if (!check.ok) {
      setErrors(check.errors);
      const first: LookupField = check.errors.code ? "code" : "phone";
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    setErrors({});
    handOver(check.href, values.phone);
    startWait(check.href);
    router.push(check.href);
  }

  const field = (name: LookupField, label: string, input: React.ReactNode) => {
    const error = errors[name];
    return (
      <label className={cx("field", error && "is-error")} data-f={`${id}-${name}`}>
        <span className="lbl">{label}</span>
        {input}
        {error && (
          <span className="err" id={`e-${id}-${name}`}>
            <FeedIcon name="warning-circle" />
            <span>{lookupWordIn(error, locale)}</span>
          </span>
        )}
      </label>
    );
  };
  const aria = (name: LookupField) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `e-${id}-${name}` } : {};

  return (
    <section className="lookup" aria-labelledby={`${id}-title`}>
      <h2 className="acc-sec-title" id={`${id}-title`}>
        {t({ vi: "Tra cứu đơn", en: "Track an order" })}
      </h2>
      <form className="lookup-form" action={send} noValidate onSubmit={onSubmit}>
        {field(
          "code",
          t({ vi: "Mã đơn", en: "Order code" }),
          <input
            name="code"
            id={`${id}-code`}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={t({ vi: "VD: DH-1499", en: "e.g. DH-1499" })}
            value={values.code}
            onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
            {...aria("code")}
          />,
        )}
        {field(
          "phone",
          t({ vi: "Số điện thoại đặt hàng", en: "Phone number on the order" }),
          <input
            name="phone"
            id={`${id}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            {...aria("phone")}
          />,
        )}
        <button className="btn btn-line" type="submit">
          {t({ vi: "Tra cứu", en: "Track" })}
        </button>
      </form>
    </section>
  );
}
