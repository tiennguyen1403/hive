"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { wardOptionLabel } from "@/components/checkout/wards";
import { useLocale } from "@/components/i18n/LocaleContext";
import { provincesByName, type Ward } from "@/data/regions";
import type { ShipTo } from "@/lib/admin-orders";
import { storedLang } from "@/lib/admin-text";
import { fold } from "@/lib/catalog-query";
import { picker } from "@/lib/i18n";
import { Button } from "@/registry/components/button/button";
import { Combobox, type ComboboxOption } from "@/registry/components/combobox/combobox";
import { Input } from "@/registry/components/input/input";
import styles from "./ArcOrderScreen.module.css";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * An option of the two lists, found by its name typed with or without its
 * marks: "ho chi minh" finds "TP. Hồ Chí Minh", as the shop's own address
 * picker does (`fold`, `components/feed/FeedPicker.tsx`). Arc's Combobox
 * matches `keywords` beside the label.
 */
function option(value: string, label: string): ComboboxOption {
  return { value, label, keywords: [fold(label)] };
}

/** The thirty-four provinces by name, as v3's dropdown listed them. */
const PROVINCE_OPTIONS = provincesByName().map((p) => option(p.code, p.name));

/**
 * The communes of one province, asked of `/api/wards` as v3's `WardSelect`
 * asked: one province at a time, kept for the visit, and a slow answer for a
 * province already left behind never overwrites the list on screen.
 */
function useWards(provinceCode: string) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const cache = useRef(new Map<string, Ward[]>());

  useEffect(() => {
    if (!provinceCode) {
      setWards([]);
      setState("idle");
      return;
    }
    const cached = cache.current.get(provinceCode);
    if (cached) {
      setWards(cached);
      setState("idle");
      return;
    }
    const ac = new AbortController();
    setState("loading");
    fetch(`/api/wards?province=${encodeURIComponent(provinceCode)}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { wards: Ward[] }) => {
        cache.current.set(provinceCode, data.wards);
        setWards(data.wards);
        setState("idle");
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setState("error");
      });
    return () => ac.abort();
  }, [provinceCode]);

  return { wards, state };
}

/**
 * "Sửa địa chỉ giao", in the "Giao tới" panel: v3's `AddressEditForm`
 * (`components/admin/AddressEditForm.tsx`) rule for rule and word for word,
 * in Arc's fields, one to a row in the narrow column.
 *
 *   · A REASON IS REQUIRED: it goes into the activity log and onto the
 *     delivery slip.
 *   · IT CLOSES AT HANDOVER: the caller only offers "Sửa" before then.
 *   · Two tiers, province and commune (`data/regions.ts`); a new province
 *     clears the commune, which belongs to the old one.
 *
 * The save button names the first thing still missing, disabled and with no
 * icon, until the form is whole; then "Lưu địa chỉ". It is the panel's own
 * primary button (brief, §2), and shows Arc's spinner with "Đang lưu…" while
 * the address is on its way.
 *
 * In the page's language since round v6 slice E4, in the shop's address words
 * (slice E3a: "Province / city", "Ward / commune"). Every sentence is written at
 * render — the form keeps whether a save was refused, not the sentence — so a
 * switch of language rewords it in place. The places keep their Vietnamese
 * names (QĐ-40), and the fields and the lists holding them say `lang="vi"` on
 * an English page (the lists through Arc's `optionsLang`, `registry/PATCHES.md`).
 */
export function ArcAddressForm({
  value,
  pending = false,
  onCancel,
  onSave,
}: {
  value: ShipTo;
  /** The new address is on its way to the server. */
  pending?: boolean;
  onCancel: () => void;
  onSave: (next: ShipTo, reason: string) => void;
}) {
  const [recipient, setRecipient] = useState(value.recipient);
  const [phone, setPhone] = useState(value.phone);
  const [line, setLine] = useState(value.line);
  const [provinceCode, setProvinceCode] = useState(value.provinceCode);
  const [wardCode, setWardCode] = useState(value.wardCode);
  const [reason, setReason] = useState("");
  /** A save was pressed with a field still empty: the reason field says so. */
  const [error, setError] = useState(false);
  const locale = useLocale();
  const t = picker(locale);
  /** A Vietnamese place or name typed in a field, on an English page. */
  const place = locale === "en" ? ("vi" as const) : undefined;
  const { wards, state } = useWards(provinceCode);
  const wardOptions = useMemo(() => wards.map((w) => option(w.code, wardOptionLabel(w))), [wards]);

  const ready =
    recipient.trim() !== "" &&
    phone.trim() !== "" &&
    line.trim() !== "" &&
    wardCode !== "" &&
    reason.trim() !== "";
  /** The first thing still missing, so the button can name it. */
  const blocker = !recipient.trim()
    ? t({ vi: "Nhập người nhận", en: "Enter the recipient" })
    : !phone.trim()
      ? t({ vi: "Nhập số điện thoại", en: "Enter the phone number" })
      : !line.trim()
        ? t({ vi: "Nhập số nhà, đường", en: "Enter the house number, street" })
        : !wardCode
          ? t({ vi: "Chọn phường / xã", en: "Choose the ward / commune" })
          : !reason.trim()
            ? t({ vi: "Ghi lý do sửa", en: "Give a reason" })
            : null;

  return (
    <div className={styles.form}>
      <Input
        label={t({ vi: "Người nhận", en: "Recipient" })}
        value={recipient}
        lang={place}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <Input
        label={t({ vi: "Số điện thoại", en: "Phone number" })}
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <Input
        label={t({ vi: "Số nhà, đường", en: "House number, street" })}
        value={line}
        lang={place}
        onChange={(e) => setLine(e.target.value)}
      />
      <Combobox
        label={t({ vi: "Tỉnh / thành", en: "Province / city" })}
        options={PROVINCE_OPTIONS}
        optionsLang={place}
        value={provinceCode}
        lang={provinceCode ? place : undefined}
        placeholder={t({ vi: "Chọn", en: "Choose" })}
        onValueChange={(next) => {
          setProvinceCode(next);
          // The old commune belongs to the old province; keeping it would
          // ship the parcel to a code that does not exist there.
          setWardCode("");
        }}
      />
      <div className={styles.field}>
        <Combobox
          label={t({ vi: "Phường / xã", en: "Ward / commune" })}
          options={wardOptions}
          optionsLang={place}
          value={wardCode}
          lang={wardCode ? place : undefined}
          onValueChange={setWardCode}
          disabled={!provinceCode || state === "loading"}
          placeholder={
            !provinceCode
              ? t({ vi: "Chọn tỉnh trước", en: "Province first" })
              : state === "loading"
                ? t({ vi: "Đang tải…", en: "Loading…" })
                : state === "error"
                  ? t({ vi: "Không tải được", en: "Couldn't load" })
                  : t({ vi: "Chọn phường / xã", en: "Choose a ward / commune" })
          }
        />
        {state === "error" && (
          <p className={styles.fieldError} role="alert">
            {t({
              vi: "Không tải được danh sách phường / xã. Thử chọn lại tỉnh.",
              en: "Couldn't load the wards and communes. Try choosing the province again.",
            })}
          </p>
        )}
      </div>
      <Input
        label={t({ vi: "Lý do sửa", en: "Reason for the change" })}
        placeholder={t({ vi: "VD: khách nhắn đổi số nhà", en: "e.g. the customer asked to change the house number" })}
        description={t({ vi: "Chỉ sửa được trước khi bàn giao.", en: "Can only be changed before handover." })}
        error={error ? t({ vi: "Điền đủ các ô trước khi lưu.", en: "Fill in every field before saving." }) : undefined}
        value={reason}
        lang={storedLang(reason, locale)}
        onChange={(e) => {
          setReason(e.target.value);
          setError(false);
        }}
      />
      <div className={styles.formActions}>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
          {pending ? null : <ArrowLeft {...ICON} />}
          {t({ vi: "Huỷ", en: "Cancel" })}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!ready}
          loading={pending}
          onClick={() => {
            if (!ready) return setError(true);
            onSave(
              {
                recipient: recipient.trim(),
                phone: phone.trim(),
                line: line.trim(),
                provinceCode,
                wardCode,
              },
              reason.trim(),
            );
          }}
        >
          {ready && !pending ? <Check {...ICON} /> : null}
          {pending ? t({ vi: "Đang lưu…", en: "Saving…" }) : (blocker ?? t({ vi: "Lưu địa chỉ", en: "Save address" }))}
        </Button>
      </div>
    </div>
  );
}
