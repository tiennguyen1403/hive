"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { ADDRESS_LABELS, type AddressLabel } from "@/data/types";
import { makeFeedDefault, removeFeedAddress, restoreFeedAddress, saveFeedAddress } from "@/lib/actions/addresses";
import {
  ADDRESS_ANSWER_TEXT,
  addressLabelText,
  defaultFirst,
  feedAddressErrors,
  firstWrongAddress,
  nextAddressLabel,
  type AddressField,
  type AddressInput,
} from "@/lib/feed-account";
import { picker } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import type { ProvinceName } from "../checkout/CheckoutView";
import { FeedPicker, type PickItem } from "../FeedPicker";
import { FeedSheet } from "../FeedSheet";
import { useFeedToast } from "../FeedToast";
import { FeedIcon } from "../icon/FeedIcon";
import { cx } from "../useReveal";
import { useWardItems } from "./useWardItems";

/** One address of the book, as the server hands it over: the line a courier reads is built there. */
export interface BookEntry {
  id: string;
  label: AddressLabel;
  recipient: string;
  /** Ten digits. */
  phone: string;
  provinceCode: string;
  wardCode: string;
  /** "Phường Sài Gòn". */
  wardLabel: string;
  street: string;
  /** "12 Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh". */
  line: string;
  isDefault: boolean;
}

interface AddressesViewProps {
  book: BookEntry[];
  /** The 34 provinces in the official order, for the picker. */
  provinces: readonly ProvinceName[];
  /** What a new address starts with: the account's name and phone. */
  seed: { recipient: string; phone: string };
  /** `?add=1` opens the add sheet, `?edit=<id>` that address's sheet. */
  open: { kind: "add" } | { kind: "edit"; id: string } | null;
}

interface Draft {
  id: string | null;
  label: AddressLabel;
  recipient: string;
  phone: string;
  provinceCode: string;
  ward: PickItem | null;
  street: string;
  /** The switch. */
  isDefault: boolean;
  /** Default already: the current default (its switch is locked on), or a book's first address. */
  stayDefault: boolean;
}

/** "0912 345 678": a phone as the field shows it (`formatPhone`, its gaps as plain spaces for typing). */
const spaced = (digits: string) => (digits ? formatPhone(digits).replace(/ /g, " ") : "");

/**
 * "Địa chỉ" (round v4 slice 3a): the approved mock's `addresses.html` and
 * `addresses.js`, over the account's book in Postgres. The default first and
 * ringed; each card with "Sửa", "Đặt mặc định", "Xoá". Adding and editing
 * happen in a sheet with the checkout's two pickers (province, then commune,
 * both searchable), each field saying what is wrong under itself in the
 * mock's words. Every write answers with a toast — "Đã thêm địa chỉ", "Đã lưu
 * địa chỉ", "Nhà là địa chỉ mặc định", "Đã xoá Nhà" with "Hoàn tác", which
 * puts that very address back where it was in the book, with the role it had
 * (slice B10: the database kept it aside, so only its id is sent) — or, when
 * the server refuses, one short sentence saying so. The page re-reads the
 * book in the same response as each write (`revalidatePath`).
 *
 * In the page's language since round v6 slice E3a, the checkout's English for
 * the fields and pickers. An address's name is printed "Home", "Work",
 * "Other" (`addressLabelText`) but stored, and sent, as the book has it
 * ("Nhà"…); the recipient, the street, the commune and the province keep
 * their Vietnamese, marked `lang="vi"` on an English page.
 */
export function AddressesView({ book, provinces, seed, open }: AddressesViewProps) {
  const locale = useLocale();
  const t = picker(locale);
  const notSaved = t(ADDRESS_ANSWER_TEXT.notSaved);
  // A person's and a place's own words: Vietnamese on an English page (QĐ-40).
  const placeLang = locale === "en" ? ("vi" as const) : undefined;
  const toast = useFeedToast();
  const [writing, startWrite] = useTransition();
  const [saving, startSaving] = useTransition();
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Partial<Record<AddressField, string>>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<"province" | "ward">("province");
  const [, bump] = useState(0);
  const opener = useRef<HTMLElement | null>(null);
  const pickerBack = useRef<HTMLElement | null>(null);
  const saved = useRef<{ id: string; text: string } | null>(null);
  const after = useRef<(() => void) | null>(null);
  const { wards, fetchWards, waiting } = useWardItems();

  // Whatever should happen once the page has drawn the change: a focus that needs the new list.
  useEffect(() => {
    const run = after.current;
    after.current = null;
    run?.();
  });

  const list = defaultFirst(book);
  const provinceItems = useMemo<PickItem[]>(() => provinces.map((p) => ({ value: p.code, label: p.name })), [provinces]);
  const provinceName = (code: string) => provinces.find((p) => p.code === code)?.name ?? "";

  /** After the page redraws: the focus on this element, found then. */
  function focusAfter(selector: string, fallback?: string) {
    after.current = () => {
      const el = document.querySelector<HTMLElement>(selector) ?? (fallback ? document.querySelector<HTMLElement>(fallback) : null);
      el?.focus({ preventScroll: true });
    };
    bump((n) => n + 1);
  }

  function openForm(a: BookEntry | null, from: HTMLElement | null) {
    opener.current = from;
    setErrors({});
    if (a) {
      setDraft({
        id: a.id,
        label: a.label,
        recipient: a.recipient,
        phone: spaced(a.phone),
        provinceCode: a.provinceCode,
        ward: a.wardCode ? { value: a.wardCode, label: a.wardLabel } : null,
        street: a.street,
        isDefault: a.isDefault,
        stayDefault: a.isDefault,
      });
      fetchWards(a.provinceCode);
    } else {
      const first = book.length === 0;
      setDraft({
        id: null,
        label: nextAddressLabel(book.map((x) => x.label)),
        recipient: seed.recipient,
        phone: seed.phone,
        provinceCode: "",
        ward: null,
        street: "",
        isDefault: first,
        stayDefault: first,
      });
    }
    setSheet(true);
  }

  // `?add=1` and `?edit=<id>` open their sheet once the page is there (`addresses.js`).
  useEffect(() => {
    if (!open) return;
    if (open.kind === "add") {
      openForm(null, document.querySelector<HTMLElement>("[data-add]"));
      return;
    }
    const a = book.find((x) => x.id === open.id);
    if (a) openForm(a, document.querySelector<HTMLElement>(`[data-edit="${a.id}"]`));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function focusField(f: AddressField) {
    document.getElementById(`f-${f}`)?.focus();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft || saving) return;
    const found = feedAddressErrors(
      {
        recipient: draft.recipient,
        phone: draft.phone,
        provinceCode: draft.provinceCode,
        wardCode: draft.ward?.value ?? "",
        street: draft.street,
      },
      locale,
    );
    setErrors(found);
    const wrong = firstWrongAddress(found);
    if (wrong) {
      focusField(wrong);
      return;
    }
    const input: AddressInput = {
      id: draft.id,
      label: draft.label,
      recipient: draft.recipient,
      phone: draft.phone,
      provinceCode: draft.provinceCode,
      wardCode: draft.ward?.value ?? "",
      street: draft.street,
      isDefault: draft.isDefault || draft.stayDefault,
    };
    const added = draft.id === null;
    startSaving(async () => {
      const r = await saveFeedAddress(input);
      startSaving(() => {
        if (r.ok) {
          saved.current = {
            id: r.id,
            text: added ? t({ vi: "Đã thêm địa chỉ", en: "Address added" }) : t({ vi: "Đã lưu địa chỉ", en: "Address saved" }),
          };
          setSheet(false);
        } else if (r.errors) {
          setErrors(r.errors);
          const f = firstWrongAddress(r.errors);
          if (f) focusField(f);
        } else {
          toast(r.message);
        }
      });
    });
  }

  // Once the sheet has closed after a save: the focus on that address's "Sửa", and the toast.
  function afterSheet() {
    const s = saved.current;
    saved.current = null;
    if (!s) return;
    document.querySelector<HTMLElement>(`[data-edit="${s.id}"]`)?.focus({ preventScroll: true });
    toast(s.text);
  }

  function setDefault(a: BookEntry) {
    if (writing) return;
    startWrite(async () => {
      const r = await makeFeedDefault(a.id);
      startWrite(() => {
        if (!r.ok) {
          toast(r.message ?? notSaved);
          return;
        }
        focusAfter(`[data-edit="${a.id}"]`);
        toast(
          t({
            vi: `${a.label} là địa chỉ mặc định`,
            en: `${addressLabelText(a.label, "en")} is now the default address`,
          }),
        );
      });
    });
  }

  /** "Hoàn tác": the address just removed, back in its place and its role (`addresses.js`: `saveAddresses(before)`). */
  function restore(a: BookEntry) {
    startWrite(async () => {
      const r = await restoreFeedAddress(a.id);
      startWrite(() => {
        if (!r.ok) {
          toast(r.message ?? notSaved);
          return;
        }
        focusAfter(`[data-edit="${r.id}"]`);
      });
    });
  }

  function remove(a: BookEntry) {
    if (writing) return;
    startWrite(async () => {
      const r = await removeFeedAddress(a.id);
      startWrite(() => {
        if (!r.ok) {
          toast(r.message ?? notSaved);
          return;
        }
        focusAfter("[data-edit]", "[data-add]");
        toast(t({ vi: `Đã xoá ${a.label}`, en: `${addressLabelText(a.label, "en")} address deleted` }), {
          label: t({ vi: "Hoàn tác", en: "Undo" }),
          run: () => restore(a),
        });
      });
    });
  }

  function openPicker(kind: "province" | "ward", from: HTMLElement) {
    if (!draft) return;
    if (kind === "ward") {
      if (!draft.provinceCode) return;
      fetchWards(draft.provinceCode);
    }
    pickerBack.current = from;
    setPickerKind(kind);
    setPickerOpen(true);
  }

  function chooseProvince(code: string) {
    setDraft((d) => (d && d.provinceCode !== code ? { ...d, provinceCode: code, ward: null } : d));
    if (errors.province) setErrors((e) => ({ ...e, province: undefined }));
    fetchWards(code);
    focusAfter("#f-ward");
  }

  function chooseWard(item: PickItem) {
    setDraft((d) => (d ? { ...d, ward: item } : d));
    if (errors.ward) setErrors((e) => ({ ...e, ward: undefined }));
    focusAfter("#f-street");
  }

  const set = (key: "recipient" | "phone" | "street") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };
  const aria = (f: AddressField) => (errors[f] ? { "aria-invalid": true as const, "aria-describedby": `e-${f}` } : {});

  const addLabel = t({ vi: "Thêm địa chỉ", en: "Add address" });

  return (
    <>
      <h1 className="acc-h1 disp" data-hero>
        {t({ vi: "Địa chỉ", en: "Addresses" })}
      </h1>
      {list.length > 0 ? (
        <>
          <div className="ad-list">
            {list.map((a) => {
              const name = addressLabelText(a.label, locale);
              return (
                <article className={cx("ad", a.isDefault && "is-default")} key={a.id} aria-labelledby={`ad-${a.id}`}>
                  <div className="ad-top">
                    <h2 className="ad-label disp" id={`ad-${a.id}`}>
                      {name}
                    </h2>
                    {a.isDefault && (
                      <span className="chip-ink">
                        <FeedIcon name="check" />
                        {t({ vi: "Mặc định", en: "Default" })}
                      </span>
                    )}
                  </div>
                  <p className="ad-who" lang={placeLang}>
                    {a.recipient}, {formatPhone(a.phone)}
                  </p>
                  <p className="ad-where" lang={placeLang}>
                    {a.line}
                  </p>
                  <div className="ad-acts">
                    <button
                      className="pill"
                      type="button"
                      data-edit={a.id}
                      aria-label={t({ vi: `Sửa địa chỉ ${a.label}`, en: `Edit ${name} address` })}
                      onClick={(e) => openForm(a, e.currentTarget)}
                    >
                      <FeedIcon name="pencil-simple" />
                      {t({ vi: "Sửa", en: "Edit" })}
                    </button>
                    {!a.isDefault && (
                      <button className="pill" type="button" onClick={() => setDefault(a)}>
                        {/* "Set default": measured, the card's three pills stay on one row at 390, as in Vietnamese. */}
                        {t({ vi: "Đặt mặc định", en: "Set default" })}
                      </button>
                    )}
                    <button
                      className="pill"
                      type="button"
                      aria-label={t({ vi: `Xoá địa chỉ ${a.label}`, en: `Delete ${name} address` })}
                      onClick={() => remove(a)}
                    >
                      <FeedIcon name="trash" />
                      {t({ vi: "Xoá", en: "Delete" })}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <button className="btn btn-line ad-add" type="button" data-add onClick={(e) => openForm(null, e.currentTarget)}>
            <FeedIcon name="plus" />
            {addLabel}
          </button>
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-ic">
            <FeedIcon name="map-pin" />
          </span>
          <p className="empty-title">{t({ vi: "Chưa có địa chỉ", en: "No addresses yet" })}</p>
          <button className="btn btn-blue" type="button" data-add onClick={(e) => openForm(null, e.currentTarget)}>
            {addLabel}
          </button>
        </div>
      )}

      <FeedSheet
        open={sheet}
        onClose={() => {
          if (!saving) setSheet(false);
        }}
        onClosed={afterSheet}
        labelledBy="ad-title"
        back={opener.current}
      >
        {draft && (
          <div className="sheet-panel">
            <div className="grab" aria-hidden="true" />
            <div className="sh-head plain">
              <h2 className="sh-title" id="ad-title">
                {draft.id ? t({ vi: "Sửa địa chỉ", en: "Edit address" }) : addLabel}
              </h2>
              <button className="sh-x" type="button" data-close aria-label={t({ vi: "Đóng", en: "Close" })}>
                <FeedIcon name="x" />
              </button>
            </div>
            <form className="sheet-form" noValidate onSubmit={onSubmit}>
              <div className="field">
                <span className="lbl" id="l-label">
                  {t({ vi: "Tên địa chỉ", en: "Address name" })}
                </span>
                <div className="lbl-chips" role="radiogroup" aria-labelledby="l-label">
                  {ADDRESS_LABELS.map((l) => (
                    <label className="lbl-chip" key={l}>
                      <input
                        type="radio"
                        name="label"
                        value={l}
                        checked={draft.label === l}
                        onChange={() => setDraft((d) => (d ? { ...d, label: l } : d))}
                      />
                      {addressLabelText(l, locale)}
                    </label>
                  ))}
                </div>
              </div>
              <Field id="recipient" label={t({ vi: "Người nhận", en: "Recipient" })} error={errors.recipient}>
                <input
                  id="f-recipient"
                  name="recipient"
                  autoComplete="name"
                  value={draft.recipient}
                  onChange={set("recipient")}
                  {...aria("recipient")}
                />
              </Field>
              <Field id="phone" label={t({ vi: "Số điện thoại", en: "Phone number" })} error={errors.phone}>
                <input
                  id="f-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={draft.phone}
                  onChange={set("phone")}
                  {...aria("phone")}
                />
              </Field>
              <div className="co-pair">
                <PickField
                  id="province"
                  label={t({ vi: "Tỉnh / thành", en: "Province / city" })}
                  value={provinceName(draft.provinceCode)}
                  valueLang={placeLang}
                  empty={t({ vi: "Chọn tỉnh / thành", en: "Choose province / city" })}
                  error={errors.province}
                  onOpen={(el) => openPicker("province", el)}
                />
                <PickField
                  id="ward"
                  label={t({ vi: "Phường / xã", en: "Ward / commune" })}
                  value={draft.ward?.label ?? ""}
                  valueLang={placeLang}
                  empty={
                    draft.provinceCode
                      ? t({ vi: "Chọn phường / xã", en: "Choose ward / commune" })
                      : t({ vi: "Chọn tỉnh trước", en: "Province first" })
                  }
                  disabled={!draft.provinceCode}
                  error={errors.ward}
                  onOpen={(el) => openPicker("ward", el)}
                />
              </div>
              <Field id="street" label={t({ vi: "Số nhà, đường", en: "House number, street" })} error={errors.street}>
                <input
                  id="f-street"
                  name="street"
                  autoComplete="address-line1"
                  placeholder={t({ vi: "VD: 12 Nguyễn Huệ", en: "e.g. 12 Nguyễn Huệ" })}
                  value={draft.street}
                  onChange={set("street")}
                  {...aria("street")}
                />
              </Field>
              <label className="toggle-row">
                <span>{t({ vi: "Đặt làm mặc định", en: "Set as default" })}</span>
                <span className="switch">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={draft.isDefault}
                    disabled={draft.id !== null && draft.stayDefault}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setDraft((d) => (d ? { ...d, isDefault: on } : d));
                    }}
                  />
                </span>
              </label>
              <button className="btn btn-blue" type="submit" disabled={saving}>
                {saving ? t({ vi: "Đang lưu…", en: "Saving…" }) : t({ vi: "Lưu địa chỉ", en: "Save address" })}
              </button>
            </form>
          </div>
        )}
      </FeedSheet>

      <FeedPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={pickerKind === "ward" ? t({ vi: "Phường / xã", en: "Ward / commune" }) : t({ vi: "Tỉnh / thành", en: "Province / city" })}
        sub={pickerKind === "ward" && draft ? provinceName(draft.provinceCode) : undefined}
        placeholder={
          pickerKind === "ward"
            ? t({ vi: "Tìm phường / xã", en: "Search ward / commune" })
            : t({ vi: "Tìm tỉnh / thành", en: "Search province / city" })
        }
        items={pickerKind === "ward" && draft ? (wards[draft.provinceCode] ?? NO_ITEMS) : provinceItems}
        value={pickerKind === "ward" ? (draft?.ward?.value ?? null) : draft?.provinceCode || null}
        waiting={pickerKind === "ward" && draft ? waiting(draft.provinceCode) : null}
        lang={placeLang}
        onPick={(it) => (pickerKind === "ward" ? chooseWard(it) : chooseProvince(it.value))}
        back={pickerBack.current}
      />
    </>
  );
}

const NO_ITEMS: readonly PickItem[] = [];

/** A labelled field with its error under it (`addresses.js`: `field`). */
function Field({ id, label, error, children }: { id: AddressField; label: string; error: string | undefined; children: React.ReactNode }) {
  return (
    <label className={cx("field", error && "is-error")} data-f={id}>
      <span className="lbl">{label}</span>
      {children}
      {error && (
        <span className="err" id={`e-${id}`}>
          <FeedIcon name="warning-circle" />
          <span>{error}</span>
        </span>
      )}
    </label>
  );
}

interface PickFieldProps {
  id: "province" | "ward";
  label: string;
  value: string;
  /** The choice's language when it is not the page's: a place's Vietnamese name on an English page. */
  valueLang?: "vi" | undefined;
  empty: string;
  disabled?: boolean;
  error: string | undefined;
  onOpen: (opener: HTMLElement) => void;
}

/** A field whose value is picked in a sheet (`addresses.js`: `pick`, the checkout's `pickField`). */
function PickField({ id, label, value, valueLang, empty, disabled = false, error, onOpen }: PickFieldProps) {
  return (
    <div className={cx("field", error && "is-error")} data-f={id}>
      <span className="lbl" id={`l-${id}`}>
        {label}
      </span>
      <button
        className="pick"
        type="button"
        id={`f-${id}`}
        aria-haspopup="dialog"
        aria-labelledby={`l-${id} v-${id}`}
        disabled={disabled}
        onClick={(e) => onOpen(e.currentTarget)}
        {...(error ? { "aria-invalid": true as const, "aria-describedby": `e-${id}` } : {})}
      >
        <span className={cx("pick-v", !value && "is-empty")} id={`v-${id}`} lang={value ? valueLang : undefined}>
          {value || empty}
        </span>
        <FeedIcon name="caret-down" />
      </button>
      {error && (
        <span className="err" id={`e-${id}`}>
          <FeedIcon name="warning-circle" />
          <span>{error}</span>
        </span>
      )}
    </div>
  );
}
