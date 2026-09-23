"use client";

import { useActionState, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon, Tick } from "@/components/icon/Icon";
import { Select } from "@/components/ui/Select";
import { WardSelect } from "@/components/checkout/WardSelect";
import type { ProvinceOption } from "@/components/checkout/CheckoutScreen";
import { saveAddress } from "@/lib/actions/addresses";
import { IDLE } from "@/lib/actions/state";
import {
  ADDRESS_LABELS,
  EMPTY_ADDRESS,
  validateAddressForm,
  type AddressDraft,
} from "@/lib/account-form";

interface AddressFormScreenProps {
  provinces: ProvinceOption[];
  /** The entry being edited, already checked to belong to this account. */
  editing?: AddressDraft & { id: string };
  /** What a blank form starts from: the account's own name and number. */
  seed?: { recipient: string; phone: string };
}

/**
 * Adding or editing an address.
 *
 * It saves for real — into the account, in Postgres, since slice B1. That is
 * why the province and the ward are the same two controls checkout uses,
 * fetched the same way: an address stored here has to be good enough to ship
 * to, and the one marked default is what checkout fills in.
 *
 * Neither `Select` nor `WardSelect` is a native `<select>` (DESIGN.md forbids
 * one), so neither posts anything on its own. The three values they own ride
 * along in hidden fields, and the Server Action re-validates every one of
 * them with `validateAddressForm` — the same function this screen runs while
 * the shopper types. A rule that only ran in the browser is a rule anyone can
 * skip past with a POST.
 */
export function AddressFormScreen({ provinces, editing, seed }: AddressFormScreenProps) {
  const [state, submit, pending] = useActionState(saveAddress, IDLE);
  const [draft, setDraft] = useState<AddressDraft>(
    editing ?? {
      ...EMPTY_ADDRESS,
      recipient: seed?.recipient ?? "",
      phone: seed?.phone ?? "",
    },
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const local = validateAddressForm(draft);

  function set<K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // A ward belongs to one province; changing province drops it.
      if (key === "provinceCode") next.wardCode = "";
      return next;
    });
  }
  function mark(key: keyof AddressDraft) {
    setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
  }
  /** The server's answer wins; the live rule fills in until there is one. */
  function errorFor(key: keyof AddressDraft) {
    return state.errors[key] ?? (touched.has(key) ? local[key] : undefined);
  }

  const title = editing ? "Sửa địa chỉ" : "Thêm địa chỉ";

  return (
    <>
      <div className="pghead">
        <h1>{title}</h1>
        <span className="meta">lưu vào tài khoản</span>
      </div>

      {state.errors.form && (
        <p className="note3 hot" role="alert">
          <Icon name="danger" className="ic sm" />
          <span>{state.errors.form}</span>
        </p>
      )}

      <form className="panel3" style={{ maxWidth: 560 }} action={submit}>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <input type="hidden" name="provinceCode" value={draft.provinceCode} />
        <input type="hidden" name="wardCode" value={draft.wardCode} />
        <input type="hidden" name="label" value={draft.label} />
        <input type="hidden" name="isDefault" value={draft.isDefault ? "on" : ""} />

        <h3>Người nhận</h3>

        <div className="row2">
          <Field3
            label="Tên người nhận"
            {...(errorFor("recipient") ? { error: errorFor("recipient")! } : {})}
          >
            {({ id, describedBy }) => (
              <input
                id={id}
                name="recipient"
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
                name="phone"
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
              name="line"
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
          {/* A disabled button carries no icon: the icon names an action,
              and while the save is in flight there is none to name. */}
          <Button
            tone="wide"
            type="submit"
            disabled={pending}
            {...(pending ? {} : { icon: "confirm" as const })}
          >
            {pending ? "Đang lưu…" : "Lưu địa chỉ"}
          </Button>
          <ButtonLink tone="quiet" icon="back" href="/account/addresses">
            Về sổ địa chỉ
          </ButtonLink>
        </div>
      </form>

      <p className="note3" style={{ marginTop: 16 }}>
        <Icon name="info" className="ic sm" />
        <span>
          Lưu vào sổ địa chỉ của tài khoản. Địa chỉ mặc định được điền sẵn ở bước thanh
          toán.
        </span>
      </p>
    </>
  );
}
