"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Select, type SelectOption } from "@/components/ui/Select";
import { DELIVERY_OPTIONS } from "@/lib/shipping";

/**
 * Who carries the parcel, as far as this build can honestly say.
 *
 * PRODUCT.md records that NO SHIPPING PARTNER HAS BEEN SIGNED, so a list of
 * courier names would be invented (DESIGN.md §9 rule 1). What does exist is
 * the delivery service the shop sells and charges for — the same two options
 * the shopper picked at checkout, from `lib/shipping.ts` — so that is what
 * the handover records. The field says as much underneath, and the tracking
 * number is typed by hand because there is no courier API to ask.
 */
export const CARRIER_OPTIONS: SelectOption[] = DELIVERY_OPTIONS.map((o) => ({
  value: o.label,
  label: o.label,
  note: o.note,
}));

/** What the shopper paid for, read back off the fee on the order. */
export function carrierFromFee(shippingFeeVnd: number): string {
  const option =
    DELIVERY_OPTIONS.find((o) => o.feeVnd === shippingFeeVnd) ?? DELIVERY_OPTIONS[0]!;
  return option.label;
}

interface HandoverFormProps {
  /** Which delivery the order was charged for — the default in the field. */
  shippingFeeVnd: number;
  /** Suggested tracking number, so the box is not a blank the shop invents. */
  placeholder: string;
  onConfirm: (carrier: string, trackingCode: string, note: string) => void;
  onCancel: () => void;
}

/**
 * "Bàn giao", as a panel on the order rather than a dialog over it.
 *
 * This is the one thing the screen is for at this moment, and a dialog would
 * hide the order it is about — the items, the address and the total all have
 * to stay readable while somebody copies a tracking number onto them.
 *
 * The tracking code is REQUIRED and the button says so while it is empty: a
 * handover with no number is not a handover, the shopper's tracking screen
 * shows this exact string, and `lib/admin-sim.ts` would happily record an
 * empty one.
 */
export function HandoverForm({
  shippingFeeVnd,
  placeholder,
  onConfirm,
  onCancel,
}: HandoverFormProps) {
  const [carrier, setCarrier] = useState(carrierFromFee(shippingFeeVnd));
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const ready = code.trim().length > 0;

  return (
    <section className="panel3" id="handover" style={{ marginBottom: 16 }}>
      <h2>
        Bàn giao<span className="meta">mã vận đơn bắt buộc</span>
      </h2>
      <div className="bd">
        <div className="fgrid">
          <Field3
            label="Hình thức giao"
            help="Chưa ký đơn vị vận chuyển nào: ô này là hình thức giao khách đã chọn, mã vận đơn nhập tay."
          >
            {({ id, describedBy }) => (
              <span aria-describedby={describedBy}>
                <Select
                  id={id}
                  options={CARRIER_OPTIONS}
                  value={carrier}
                  onChange={setCarrier}
                  ariaLabel="Hình thức giao"
                />
              </span>
            )}
          </Field3>
          <Field3
            label="Mã vận đơn"
            error={error ? "Nhập mã vận đơn để khách tra được đơn." : undefined}
          >
            {({ id, describedBy }) => (
              <input
                id={id}
                className={error ? "inp bad" : "inp"}
                aria-describedby={describedBy}
                aria-invalid={error || undefined}
                placeholder={placeholder}
                style={{ textTransform: "uppercase" }}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(false);
                }}
              />
            )}
          </Field3>
        </div>
        <Field3 label={<>Ghi chú cho khách <span className="opt">· không bắt buộc</span></>}>
          {({ id }) => (
            <input
              id={id}
              className="inp"
              placeholder="VD: gửi 2 kiện"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field3>
        <div className="ft">
          <Button tone="ink sm" icon="back" onClick={onCancel}>
            Để sau
          </Button>
          {/* Disabled, and it says the job that is left rather than the job
              it would do (DESIGN.md §9 rule 3): a handover with no number is
              not a handover, and the shopper's tracking screen prints this
              exact string. */}
          <Button
            tone="sm"
            {...(ready ? { icon: "check" as const } : {})}
            disabled={!ready}
            onClick={() => {
              if (!ready) return setError(true);
              onConfirm(carrier, code.trim(), note.trim());
            }}
          >
            {ready ? "Xác nhận bàn giao" : "Nhập mã vận đơn"}
          </Button>
        </div>
      </div>
    </section>
  );
}
