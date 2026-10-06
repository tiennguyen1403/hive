"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useId, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { storedLang } from "@/lib/admin-text";
import { carrierLabel } from "@/lib/carrier";
import { picker, type Locale } from "@/lib/i18n";
import { DELIVERY_OPTIONS } from "@/lib/shipping";
import { Button } from "@/registry/components/button/button";
import { Input } from "@/registry/components/input/input";
import { Select } from "@/registry/components/select/select";
import styles from "./ArcOrderScreen.module.css";

/** Lucide at 16, Arc's stroke (skill-design.md). Decorative: every icon sits beside its label. */
const ICON = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * Who carries the parcel, as far as this build can honestly say: the two
 * delivery services the shop sells (`lib/shipping.ts`), since no courier has
 * been signed (PRODUCT.md). The value is the label, which is what
 * `admin_hand_over()` records and `isCarrier` checks. v3's
 * `CARRIER_OPTIONS` (`components/admin/HandoverForm.tsx`) also carried each
 * service's note for the right of its menu row; Arc's `Select` has no place
 * for one.
 *
 * The value stays the Vietnamese label in both languages — it is what the
 * database stores and checks — and the label shown is the page's language
 * (`carrierLabel`, round v6 slice E4): "Standard delivery · 2–4 days".
 */
function carrierOptions(locale: Locale) {
  return DELIVERY_OPTIONS.map((o) => ({ value: o.label, label: carrierLabel(o.label, locale) }));
}

/** What the shopper paid for, read back off the fee on the order: the field's default. */
function carrierFromFee(shippingFeeVnd: number): string {
  return (DELIVERY_OPTIONS.find((o) => o.feeVnd === shippingFeeVnd) ?? DELIVERY_OPTIONS[0]!).label;
}

/**
 * "Bàn giao", in the place of the next-step block rather than a dialog over
 * the order: the items, the address and the total stay readable while
 * somebody copies a tracking number onto them. v3's `HandoverForm`, rule for
 * rule and word for word, in Arc's fields.
 *
 * The tracking code is REQUIRED, and the confirm button says so while it is
 * empty ("Nhập mã vận đơn", disabled, no icon): the shopper's "Đơn hàng" and
 * `/track` print this exact string, and `admin_hand_over()` refuses an empty
 * one as well. It is typed in capitals, as couriers print it. While the
 * handover is on its way the button shows Arc's spinner with "Đang lưu…".
 *
 * In the page's language since round v6 slice E4, every word written at render.
 */
export function ArcHandoverForm({
  shippingFeeVnd,
  placeholder,
  pending = false,
  onConfirm,
  onCancel,
}: {
  /** Which delivery the order was charged for — the default in the field. */
  shippingFeeVnd: number;
  /** Suggested tracking number, so the box is not a blank the shop invents. */
  placeholder: string;
  /** The handover is on its way to the server. */
  pending?: boolean;
  onConfirm: (carrier: string, trackingCode: string, note: string) => void;
  onCancel: () => void;
}) {
  const locale = useLocale();
  const t = picker(locale);
  const titleId = useId();
  const [carrier, setCarrier] = useState(() => carrierFromFee(shippingFeeVnd));
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const ready = code.trim().length > 0;

  // `id="handover"`, as v3's form had: the overview's "Đóng gói và bàn giao"
  // opens `…?handover=1#handover`, and Next scrolls to that id. Without it the
  // order opened at the overview's scroll offset, past the form (slice 2).
  return (
    <section id="handover" className={styles.handover} aria-labelledby={titleId}>
      <div className={styles.panelHeading}>
        <h2 id={titleId} className={styles.panelTitle}>
          {t({ vi: "Bàn giao", en: "Hand over" })}
        </h2>
        <p className={styles.panelSub}>{t({ vi: "mã vận đơn bắt buộc", en: "tracking number required" })}</p>
      </div>
      <div className={styles.pair}>
        <Select
          label={t({ vi: "Hình thức giao", en: "Delivery service" })}
          options={carrierOptions(locale)}
          value={carrier}
          onValueChange={setCarrier}
        />
        <Input
          label={t({ vi: "Mã vận đơn", en: "Tracking number" })}
          placeholder={placeholder}
          description={t({
            vi: "Khách thấy mã này ở tra cứu đơn và Đơn hàng.",
            en: "The customer sees this number in Track an order and Orders.",
          })}
          error={
            error
              ? t({
                  vi: "Nhập mã vận đơn để khách tra được đơn.",
                  en: "Enter a tracking number so the customer can track the order.",
                })
              : undefined
          }
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(false);
          }}
        />
      </div>
      <Input
        label={t({ vi: "Ghi chú nội bộ khi bàn giao · không bắt buộc", en: "Internal note on handover · optional" })}
        placeholder={t({ vi: "VD: gửi 2 kiện", en: "E.g. sent as 2 parcels" })}
        value={note}
        // What is being typed, said in Vietnamese on an English page when it is (as the order's note).
        lang={storedLang(note, locale)}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className={styles.formActions}>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
          {pending ? null : <ArrowLeft {...ICON} />}
          {t({ vi: "Để sau", en: "Later" })}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!ready}
          loading={pending}
          onClick={() => {
            if (!ready) return setError(true);
            onConfirm(carrier, code.trim(), note.trim());
          }}
        >
          {ready && !pending ? <Check {...ICON} /> : null}
          {pending
            ? t({ vi: "Đang lưu…", en: "Saving…" })
            : ready
              ? t({ vi: "Xác nhận bàn giao", en: "Confirm handover" })
              : t({ vi: "Nhập mã vận đơn", en: "Enter tracking number" })}
        </Button>
      </div>
    </section>
  );
}
