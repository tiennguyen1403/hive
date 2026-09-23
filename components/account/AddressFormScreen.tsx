"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon, Tick } from "@/components/icon/Icon";
import { Select } from "@/components/ui/Select";
import { WardSelect } from "@/components/checkout/WardSelect";
import type { ProvinceOption } from "@/components/checkout/CheckoutScreen";
import {
  ADDRESS_LABELS,
  EMPTY_ADDRESS,
  validateAddressForm,
  type AddressDraft,
} from "@/lib/account-form";
import { addressBookFor } from "@/lib/address-book";
import { AccountGuard } from "./AccountGuard";
import { useAddressBook } from "./AddressBookContext";

interface AddressFormScreenProps {
  provinces: ProvinceOption[];
  /** Id of an existing entry to edit, from `?edit=`. */
  editId?: string;
}

/**
 * Adding or editing an address, in the v3 frame.
 *
 * It saves for real, into this browser. That is why the province and the
 * ward are the same two controls checkout uses, fetched the same way — an
 * address stored here has to be good enough to ship to, and the one the
 * shopper marks default is what checkout fills in.
 */
export function AddressFormScreen({ provinces, editId }: AddressFormScreenProps) {
  const { device, save } = useAddressBook();
  const router = useRouter();

  const [draft, setDraft] = useState<AddressDraft | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  return (
    <AccountGuard title={editId ? "Sửa địa chỉ" : "Thêm địa chỉ"} active="addresses">
      {(me) => {
        // Seeded once from whatever is being edited, then owned by the form.
        // Deriving it every render would fight the shopper's typing.
        if (draft === null) {
          const existing = editId
            ? addressBookFor(me, device).find((a) => a.id === editId)
            : undefined;
          const seed: AddressDraft = existing
            ? {
                recipient: existing.recipient,
                phone: existing.phone,
                provinceCode: existing.provinceCode,
                wardCode: existing.wardCode,
                line: existing.line,
                label: existing.label,
                isDefault: existing.isDefault,
              }
            : { ...EMPTY_ADDRESS, recipient: me.name, phone: me.phone };
          setDraft(seed);
          return (
            <div className="pghead">
              <h1>{editId ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h1>
              <span className="meta">đang mở biểu mẫu…</span>
            </div>
          );
        }

        const errors = validateAddressForm(draft);

        function set<K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) {
          setDraft((d) => {
            if (!d) return d;
            const next = { ...d, [key]: value };
            // A ward belongs to one province; changing province drops it.
            if (key === "provinceCode") next.wardCode = "";
            return next;
          });
        }
        function mark(key: keyof AddressDraft) {
          setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
        }
        function errorFor(key: keyof AddressDraft) {
          return submitted || touched.has(key) ? errors[key] : undefined;
        }

        function submit(e: React.FormEvent) {
          e.preventDefault();
          setSubmitted(true);
          if (Object.keys(errors).length > 0) {
            document
              .querySelector<HTMLElement>("[aria-invalid='true'], .err")
              ?.scrollIntoView({ block: "center", behavior: "smooth" });
            return;
          }
          save(draft!, editId);
          router.push("/account/addresses");
        }

        return (
          <>
            <div className="pghead">
              <h1>{editId ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h1>
              <span className="meta">lưu trên thiết bị này</span>
            </div>

            <form className="panel3" style={{ maxWidth: 560 }} onSubmit={submit}>
              <h3>Người nhận</h3>

              <div className="row2">
                <Field3
                  label="Tên người nhận"
                  {...(errorFor("recipient") ? { error: errorFor("recipient")! } : {})}
                >
                  {({ id, describedBy }) => (
                    <input
                      id={id}
                      className={errorFor("recipient") ? "inp bad" : "inp"}
                      autoComplete="name"
                      placeholder="Họ và tên"
                      aria-describedby={describedBy}
                      aria-invalid={errorFor("recipient") !== undefined || undefined}
                      value={draft.recipient}
                      onChange={(e) => set("recipient", e.target.value)}
                      onBlur={() => mark("recipient")}
                    />
                  )}
                </Field3>
                <Field3
                  label="Số điện thoại"
                  {...(errorFor("phone") ? { error: errorFor("phone")! } : {})}
                >
                  {({ id, describedBy }) => (
                    <input
                      id={id}
                      className={errorFor("phone") ? "inp bad" : "inp"}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0912 345 678"
                      aria-describedby={describedBy}
                      aria-invalid={errorFor("phone") !== undefined || undefined}
                      value={draft.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      onBlur={() => mark("phone")}
                    />
                  )}
                </Field3>
              </div>

              {/* Two tiers, not three. The district level was abolished on
                  1/7/2025 — see data/regions.ts. */}
              <div className="row2">
                <Field3
                  label="Tỉnh / thành"
                  {...(errorFor("provinceCode") ? { error: errorFor("provinceCode")! } : {})}
                >
                  {({ id }) => (
                    <Select
                      id={id}
                      options={provinces.map((p) => ({ value: p.code, label: p.label }))}
                      value={draft.provinceCode || null}
                      onChange={(code) => {
                        set("provinceCode", code);
                        mark("provinceCode");
                      }}
                      placeholder="Chọn tỉnh / thành"
                    />
                  )}
                </Field3>
                <Field3
                  label="Phường / xã"
                  {...(errorFor("wardCode") ? { error: errorFor("wardCode")! } : {})}
                >
                  {({ id }) => (
                    <WardSelect
                      id={id}
                      provinceCode={draft.provinceCode}
                      value={draft.wardCode}
                      ariaLabel="Phường / xã"
                      onChange={(code) => {
                        set("wardCode", code);
                        mark("wardCode");
                      }}
                    />
                  )}
                </Field3>
              </div>

              <Field3
                label="Số nhà, đường"
                {...(errorFor("line") ? { error: errorFor("line")! } : {})}
              >
                {({ id, describedBy }) => (
                  <input
                    id={id}
                    className={errorFor("line") ? "inp bad" : "inp"}
                    autoComplete="street-address"
                    placeholder="VD: 12 Nguyễn Huệ"
                    aria-describedby={describedBy}
                    aria-invalid={errorFor("line") !== undefined || undefined}
                    value={draft.line}
                    onChange={(e) => set("line", e.target.value)}
                    onBlur={() => mark("line")}
                  />
                )}
              </Field3>

              {/* Three labels, not free text: the address book stores one of
                  them, and a typed "nhà riêng" would be a value nothing else
                  in the app can read back. */}
              <div className="field3">
                <span className="lbl" id="addr-label">
                  Nhãn
                </span>
                <div className="chips3" role="group" aria-labelledby="addr-label">
                  {ADDRESS_LABELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={l === draft.label ? "chip3 on" : "chip3"}
                      aria-pressed={l === draft.label}
                      onClick={() => set("label", l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* The whole row is the control, rather than a button wrapped
                  in `display:contents` — that value drops a focusable element
                  out of the accessibility tree in more than one browser. */}
              <button
                type="button"
                className="consent"
                role="checkbox"
                aria-checked={draft.isDefault}
                onClick={() => set("isDefault", !draft.isDefault)}
              >
                <span className="box">
                  <Tick />
                </span>
                <span>Dùng làm địa chỉ mặc định khi thanh toán.</span>
              </button>

              <div className="acts3">
                <Button tone="wide" icon="confirm" type="submit">
                  Lưu địa chỉ
                </Button>
                <ButtonLink tone="quiet" icon="back" href="/account/addresses">
                  Về sổ địa chỉ
                </ButtonLink>
              </div>
            </form>

            <p className="note3" style={{ marginTop: 16 }}>
              <Icon name="info" className="ic sm" />
              <span>
                Lưu trong trình duyệt này. Chưa có máy chủ nên địa chỉ không đồng bộ sang
                thiết bị khác.
              </span>
            </p>
          </>
        );
      }}
    </AccountGuard>
  );
}
