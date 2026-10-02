"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { startWait } from "@/components/shop/WaitVeil";
import { lookupCheck, type LookupField } from "@/lib/feed-account";
import { picker } from "@/lib/i18n";
import { lookupWordIn } from "@/lib/order-lookup";
import { FeedIcon } from "../icon/FeedIcon";
import { cx } from "../useReveal";

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
 * opens the lookup page (`/track`, v3 until slice 4). The form's own action
 * is that page, so without script it still gets there.
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
      <form className="lookup-form" action="/track" noValidate onSubmit={onSubmit}>
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
