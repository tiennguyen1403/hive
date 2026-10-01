"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { wardOptionLabel } from "@/components/checkout/wards";
import { provincesByName, type Ward } from "@/data/regions";
import type { ShipTo } from "@/lib/admin-orders";
import { fold } from "@/lib/catalog-query";
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
  const [error, setError] = useState<string | null>(null);
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
    ? "Nhập người nhận"
    : !phone.trim()
      ? "Nhập số điện thoại"
      : !line.trim()
        ? "Nhập số nhà, đường"
        : !wardCode
          ? "Chọn phường / xã"
          : !reason.trim()
            ? "Ghi lý do sửa"
            : null;

  return (
    <div className={styles.form}>
      <Input label="Người nhận" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
      <Input
        label="Số điện thoại"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <Input label="Số nhà, đường" value={line} onChange={(e) => setLine(e.target.value)} />
      <Combobox
        label="Tỉnh / thành"
        options={PROVINCE_OPTIONS}
        value={provinceCode}
        placeholder="Chọn"
        onValueChange={(next) => {
          setProvinceCode(next);
          // The old commune belongs to the old province; keeping it would
          // ship the parcel to a code that does not exist there.
          setWardCode("");
        }}
      />
      <div className={styles.field}>
        <Combobox
          label="Phường / xã"
          options={wardOptions}
          value={wardCode}
          onValueChange={setWardCode}
          disabled={!provinceCode || state === "loading"}
          placeholder={
            !provinceCode
              ? "Chọn tỉnh trước"
              : state === "loading"
                ? "Đang tải…"
                : state === "error"
                  ? "Không tải được"
                  : "Chọn phường / xã"
          }
        />
        {state === "error" && (
          <p className={styles.fieldError} role="alert">
            Không tải được danh sách phường / xã. Thử chọn lại tỉnh.
          </p>
        )}
      </div>
      <Input
        label="Lý do sửa"
        placeholder="VD: khách nhắn đổi số nhà"
        description="Chỉ sửa được trước khi bàn giao."
        error={error ?? undefined}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setError(null);
        }}
      />
      <div className={styles.formActions}>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onCancel}>
          {pending ? null : <ArrowLeft {...ICON} />}
          Huỷ
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!ready}
          loading={pending}
          onClick={() => {
            if (!ready) return setError("Điền đủ các ô trước khi lưu.");
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
          {pending ? "Đang lưu…" : (blocker ?? "Lưu địa chỉ")}
        </Button>
      </div>
    </div>
  );
}
