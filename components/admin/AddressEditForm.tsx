"use client";

import { useState } from "react";
import { WardSelect } from "@/components/checkout/WardSelect";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Select } from "@/components/ui/Select";
import { provincesByName } from "@/data/regions";
import type { ShipTo } from "@/lib/admin-orders";

/**
 * "Sửa địa chỉ giao" — the one field on an order the shop is allowed to
 * rewrite, and only before the parcel leaves.
 *
 * The frozen `shipTo` on an order exists so a later change to the shopper's
 * address book cannot rewrite where a parcel already went (`data/types.ts`).
 * That is right, and it is also why a shopper who messages "wrong house
 * number" half an hour after ordering has nowhere to go. This form is that
 * door, with two locks on it:
 *
 *   · A REASON IS REQUIRED. It goes into the activity log and onto the
 *     delivery slip, so the next person can see why the address on the
 *     parcel is not the address on the order confirmation.
 *   · IT CLOSES AT HANDOVER. Once a tracking number exists the courier has
 *     the old label; editing here would only make the screen disagree with
 *     the box. The caller hides the opener and prints a line saying so.
 *
 * Two tiers, not three: since 1 July 2025 Vietnam has cấp tỉnh and cấp xã
 * only (`data/regions.ts`), so there is no district select to draw.
 */
export function AddressEditForm({
  value,
  pending = false,
  onCancel,
  onSave,
}: {
  value: ShipTo;
  /** The new address is on its way to the server (slice B3a). */
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

  const provinces = provincesByName().map((p) => ({ value: p.code, label: p.name }));
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
    <div id="addredit">
      <div className="fgrid">
        <Field3 label="Người nhận">
          {({ id }) => (
            <input
              id={id}
              className="inp"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          )}
        </Field3>
        <Field3 label="Số điện thoại">
          {({ id }) => (
            <input
              id={id}
              className="inp"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
        </Field3>
      </div>
      <Field3 label="Số nhà, đường">
        {({ id }) => (
          <input
            id={id}
            className="inp"
            value={line}
            onChange={(e) => setLine(e.target.value)}
          />
        )}
      </Field3>
      <div className="fgrid">
        <Field3 label="Tỉnh / thành">
          {({ id }) => (
            <Select
              id={id}
              options={provinces}
              value={provinceCode}
              ariaLabel="Tỉnh / thành"
              onChange={(v) => {
                setProvinceCode(v);
                // The old commune belongs to the old province; keeping it
                // would ship the parcel to a code that does not exist there.
                setWardCode("");
              }}
            />
          )}
        </Field3>
        <Field3 label="Phường / xã">
          {({ id }) => (
            <WardSelect
              id={id}
              provinceCode={provinceCode}
              value={wardCode}
              ariaLabel="Phường / xã"
              onChange={(code) => setWardCode(code)}
            />
          )}
        </Field3>
      </div>
      <Field3
        label="Lý do sửa"
        error={error ?? undefined}
        help="Ghi vào nhật ký và phiếu giao. Chỉ sửa được trước khi bàn giao."
      >
        {({ id, describedBy }) => (
          <input
            id={id}
            className={error ? "inp bad" : "inp"}
            aria-describedby={describedBy}
            placeholder="VD: khách nhắn đổi số nhà"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
          />
        )}
      </Field3>
      <div className="ft">
        <Button tone="ink sm" icon="back" disabled={pending} onClick={onCancel}>
          Huỷ
        </Button>
        <Button
          tone="sm"
          {...(ready && !pending ? { icon: "check" as const } : {})}
          disabled={!ready || pending}
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
          {pending ? "Đang lưu…" : (blocker ?? "Lưu địa chỉ")}
        </Button>
      </div>
    </div>
  );
}
