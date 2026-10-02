"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { SIZES, type Size, type SizeSlot } from "@/data/types";
import { changePassword } from "@/lib/actions/auth";
import { updateProfileAction } from "@/lib/actions/profile";
import { IDLE } from "@/lib/actions/state";
import {
  EMPTY_MY_STATE,
  PASSWORD_CHANGED_TEXT,
  SIZE_SLOT_TEXT,
  firstWrongPassword,
  passwordSheetErrors,
  sizeToast,
  type PasswordField,
  type PasswordSheet,
} from "@/lib/feed-me";
import { picker, reword, type Pair } from "@/lib/i18n";
import type { Me } from "@/lib/me";
import { PROFILE_SAVED_TEXT, PROFILE_SENTENCES, validateProfile, type ProfileDraft } from "@/lib/my-state";
import { formatPhone } from "@/lib/phone";
import { FeedSheet } from "../FeedSheet";
import { useFeedToast } from "../FeedToast";
import { FeedIcon, type FeedIconName } from "../icon/FeedIcon";
import { useKeep } from "../useKeep";
import { cx } from "../useReveal";
import { SignOutForm } from "./SignOut";

/** "0912 345 678": the phone as the field shows it (`formatPhone` groups with no-break spaces; plain ones for typing). */
const spaced = (digits: string) => (digits ? formatPhone(digits).replace(/ /g, " ") : "");

/**
 * Hồ sơ, signed in (round v4 slice 3b): the approved mock's `profile.html`
 * and `profile.js`.
 *
 * · "Thông tin": the name and the phone, saved by "Lưu" (`updateProfileAction`,
 *   the mock's rules and words, checked here first and again there), then
 *   "Đã lưu hồ sơ"; the new name shows at once wherever the account's name is
 *   read. The e-mail is in the form but read-only (QĐ-35: nothing can confirm
 *   a new one yet), so it is neither checked nor followed by a line about a
 *   link.
 * · "Size của tôi": áo and quần, each saved the moment it is picked
 *   (`setMySizeAction`, drawn at once), "Bỏ chọn" to forget one; `#size`
 *   brings the section into view.
 * · "Đổi mật khẩu" in a sheet, "Cài đặt thông báo", "Đăng xuất" (the phone;
 *   from 900px the menu carries it), and "Xoá tài khoản", being prepared.
 *
 * In the page's language since round v6 slice E3a ("Profile", "Details", "My
 * sizes", "Change password", "Notification settings", "Sign out", "Delete
 * account" · "Coming soon"). Switching language while editing keeps what was
 * typed: the form's values are its own state, and the page redraws in place.
 */
export function ProfileView({ me }: { me: Me }) {
  const t = picker(useLocale());
  const [pwOpen, setPwOpen] = useState(false);
  const pwOpener = useRef<HTMLButtonElement | null>(null);

  // `profile.html#size`: the sizes in view (the mock scrolls them to the top once the page is drawn).
  useEffect(() => {
    if (window.location.hash !== "#size") return;
    const s = document.getElementById("size");
    if (s) window.requestAnimationFrame(() => s.scrollIntoView({ block: "start" }));
  }, []);

  return (
    <>
      <h1 className="acc-h1 disp" data-hero>
        {t({ vi: "Hồ sơ", en: "Profile" })}
      </h1>
      <div className="pf">
        <section className="pf-sec" aria-labelledby="pf-info">
          <h2 className="acc-sec-title" id="pf-info">
            {t({ vi: "Thông tin", en: "Details" })}
          </h2>
          <DetailsForm me={me} />
        </section>
        <section className="pf-sec" id="size" aria-labelledby="pf-size">
          <h2 className="acc-sec-title" id="pf-size">
            {t({ vi: "Size của tôi", en: "My sizes" })}
          </h2>
          <SizeRows />
        </section>
        <section className="pf-sec" aria-labelledby="pf-more">
          <h2 className="sr-only" id="pf-more">
            {t({ vi: "Khác", en: "More" })}
          </h2>
          <div className="me-rows">
            <button
              className="me-row"
              type="button"
              onClick={(e) => {
                pwOpener.current = e.currentTarget;
                setPwOpen(true);
              }}
            >
              <FeedIcon name="lock-simple" />
              <span>{t({ vi: "Đổi mật khẩu", en: "Change password" })}</span>
              <FeedIcon name="caret-right" className="i-caret-right" />
            </button>
            <Link className="me-row" href="/account/notifications">
              <FeedIcon name="bell" />
              <span>{t({ vi: "Cài đặt thông báo", en: "Notification settings" })}</span>
              <FeedIcon name="caret-right" className="i-caret-right" />
            </Link>
            <button className="me-row pf-out" type="submit" form="pf-signout">
              <FeedIcon name="sign-out" />
              <span>{t({ vi: "Đăng xuất", en: "Sign out" })}</span>
            </button>
          </div>
          <div className="me-rows pf-danger">
            <div className="me-row" aria-disabled="true">
              <FeedIcon name="trash" />
              <span>{t({ vi: "Xoá tài khoản", en: "Delete account" })}</span>
              <span className="me-row-sub">{t({ vi: "Đang chuẩn bị", en: "Coming soon" })}</span>
            </div>
          </div>
        </section>
      </div>
      <SignOutForm id="pf-signout" />
      <PasswordSheetView open={pwOpen} onClose={() => setPwOpen(false)} back={pwOpener.current} />
    </>
  );
}

// ─────────────────────────────────────────────────────────── Thông tin

type DetailField = keyof ProfileDraft;

/**
 * The name and the phone, and the e-mail read-only. Like the mock, nothing is
 * marked until "Lưu" is pressed once; from then each keystroke checks again.
 * What the server says of a field stands until that field changes; what it
 * says of the whole form (signed out, the rate limit, the database) is a toast.
 */
function DetailsForm({ me }: { me: Me }) {
  const toast = useFeedToast();
  const locale = useLocale();
  const t = picker(locale);
  const [values, setValues] = useState<ProfileDraft>({ name: me.name, phone: spaced(me.phone) });
  const [submitted, setSubmitted] = useState(false);
  const [server, setServer] = useState<Partial<Record<DetailField, string>>>({});
  const [saving, startSaving] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  const local = submitted ? validateProfile(values, locale) : {};
  const errors: Partial<Record<DetailField, string>> = { ...server, ...local };

  function set(field: DetailField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (server[field]) setServer((s) => ({ ...s, [field]: undefined }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSubmitted(true);
    setServer({});
    const wrong = (["name", "phone"] as const).find((f) => validateProfile(values)[f]);
    if (wrong) {
      form.current?.querySelector<HTMLInputElement>(`[name="${wrong}"]`)?.focus();
      return;
    }
    const data = new FormData(e.currentTarget);
    startSaving(async () => {
      const r = await updateProfileAction({ errors: {} }, data);
      if (r.ok) {
        toast(r.message ?? t(PROFILE_SAVED_TEXT));
        return;
      }
      const { form: whole, ...fields } = r.errors;
      setServer(fields as Partial<Record<DetailField, string>>);
      if (whole) toast(whole);
      const first = (["name", "phone"] as const).find((f) => fields[f]);
      if (first) form.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
    });
  }

  const field = (name: DetailField, label: string, attrs: React.InputHTMLAttributes<HTMLInputElement>) => {
    // What the server said of a field stays as it came; it is printed in the page's language.
    const said = errors[name];
    const error = said ? reword(said, locale, PROFILE_SENTENCES) : undefined;
    return (
      <label className={cx("field", error && "is-error")} data-f={name}>
        <span className="lbl">{label}</span>
        <input
          name={name}
          value={values[name]}
          onChange={(e) => set(name, e.target.value)}
          {...attrs}
          {...(error ? { "aria-invalid": true as const, "aria-describedby": `e-${name}` } : {})}
        />
        {error && (
          <span className="err" id={`e-${name}`}>
            <FeedIcon name="warning-circle" />
            <span>{error}</span>
          </span>
        )}
      </label>
    );
  };

  return (
    <form className="pf-form" noValidate onSubmit={onSubmit} ref={form}>
      {field("name", t({ vi: "Họ và tên", en: "Full name" }), { autoComplete: "name" })}
      {field("phone", t({ vi: "Số điện thoại", en: "Phone number" }), { type: "tel", inputMode: "tel", autoComplete: "tel" })}
      <label className="field" data-f="email">
        <span className="lbl">Email</span>
        <input name="email" type="email" autoComplete="email" value={me.email} readOnly />
      </label>
      <button className="btn btn-blue pf-save" type="submit" disabled={saving}>
        {saving ? t({ vi: "Đang lưu…", en: "Saving…" }) : t({ vi: "Lưu", en: "Save" })}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────── Size của tôi

const ROWS: readonly [SizeSlot, FeedIconName][] = [
  ["top", "t-shirt"],
  ["bottom", "pants"],
];

/**
 * Two rows of sizes, each a native radio group; picking one keeps it on the
 * account at once, and says so. "Tops" and "Bottoms" in English
 * (`SIZE_SLOT_TEXT`), the toast by `sizeToast`.
 */
function SizeRows() {
  const keep = useKeep();
  const toast = useFeedToast();
  const locale = useLocale();
  const t = picker(locale);
  const sizes = (keep.state ?? EMPTY_MY_STATE).sizes;

  function pick(slot: SizeSlot, size: Size | null) {
    toast(sizeToast(slot, size, locale));
    void keep.setSize(slot, size);
  }

  return (
    <div className="pf-size">
      {ROWS.map(([slot, icon]) => (
        <div className="pf-size-row" key={slot}>
          <div className="pf-size-head">
            <p className="pf-size-label" id={`sz-${slot}`}>
              <FeedIcon name={icon} />
              {t(SIZE_SLOT_TEXT[slot])}
            </p>
            {sizes[slot] && (
              <button
                className="link pf-clear"
                type="button"
                onClick={() => {
                  // The row's first size takes the focus, as the mock hands it on once "Bỏ chọn" is gone.
                  document.querySelector<HTMLInputElement>(`input[name="size-${slot}"]`)?.focus();
                  pick(slot, null);
                }}
              >
                {t({ vi: "Bỏ chọn", en: "Clear" })}
              </button>
            )}
          </div>
          <div className="sizes" role="radiogroup" aria-labelledby={`sz-${slot}`}>
            {SIZES.map((z) => (
              <label className="size" key={z}>
                <input
                  type="radio"
                  name={`size-${slot}`}
                  value={z}
                  checked={sizes[slot] === z}
                  onChange={() => pick(slot, z)}
                />
                <span className="sz">{z}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────── Đổi mật khẩu

/** Each field's name, in both languages, and its `autocomplete`. */
const PW_LABELS: Readonly<Record<PasswordField, [Pair, string]>> = {
  current: [{ vi: "Mật khẩu hiện tại", en: "Current password" }, "current-password"],
  next: [{ vi: "Mật khẩu mới", en: "New password" }, "new-password"],
  again: [{ vi: "Nhập lại mật khẩu mới", en: "Repeat new password" }, "new-password"],
};

const EMPTY_PW: PasswordSheet = { current: "", next: "", again: "" };

/**
 * "Đổi mật khẩu" in a sheet (`profile.js`: `openPassword`): the three fields,
 * each with its show and hide, checked on "Đổi mật khẩu" in the mock's words,
 * every wrong one marked and the first taking the focus; then `changePassword`,
 * which checks again and asks the auth server. A shared demo account's lock
 * (B4b), the rate limit or a refusal of the whole thing is said above the
 * fields; a wrong current password under its own. Done, the sheet closes and
 * the toast says so. Each opening starts empty.
 *
 * In the page's language since round v6 slice E3a; the Server Action answers
 * in it too. The sheet is modal — the language cannot change while it is
 * open — and each opening starts empty, so what it was told needs no
 * rewording.
 */
function PasswordSheetView({ open, onClose, back }: { open: boolean; onClose: () => void; back: HTMLElement | null }) {
  const toast = useFeedToast();
  const locale = useLocale();
  const t = picker(locale);
  const [values, setValues] = useState<PasswordSheet>(EMPTY_PW);
  const [errors, setErrors] = useState<Partial<Record<PasswordField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [shown, setShown] = useState<Partial<Record<PasswordField, boolean>>>({});
  const [changing, startChanging] = useTransition();
  const done = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const [wasOpen, setWasOpen] = useState(open);

  // Each opening starts empty (the mock writes the sheet afresh every time).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(EMPTY_PW);
      setErrors({});
      setFormError(null);
      setShown({});
    }
  }

  function focusField(f: PasswordField) {
    form.current?.querySelector<HTMLInputElement>(`[name="${f}"]`)?.focus();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (changing) return;
    setFormError(null);
    const found = passwordSheetErrors(values, locale);
    setErrors(found);
    const wrong = firstWrongPassword(found);
    if (wrong) {
      focusField(wrong);
      return;
    }
    const data = new FormData(e.currentTarget);
    startChanging(async () => {
      const r = await changePassword(IDLE, data);
      if (r.ok) {
        done.current = true;
        onClose();
        return;
      }
      const { form: whole, ...fields } = r.errors;
      setErrors(fields as Partial<Record<PasswordField, string>>);
      setFormError(whole ?? null);
      const first = firstWrongPassword(fields as Partial<Record<PasswordField, string>>);
      if (first) focusField(first);
    });
  }

  return (
    <FeedSheet
      open={open}
      onClose={() => {
        if (!changing) onClose();
      }}
      onClosed={() => {
        if (!done.current) return;
        done.current = false;
        toast(t(PASSWORD_CHANGED_TEXT));
      }}
      labelledBy="pw-title"
      back={back}
    >
      <div className="sheet-panel">
        <div className="grab" aria-hidden="true" />
        <div className="sh-head plain">
          <h2 className="sh-title" id="pw-title">
            {t({ vi: "Đổi mật khẩu", en: "Change password" })}
          </h2>
          <button className="sh-x" type="button" data-close aria-label={t({ vi: "Đóng", en: "Close" })}>
            <FeedIcon name="x" />
          </button>
        </div>
        <form className="sheet-form" noValidate onSubmit={onSubmit} ref={form}>
          {formError && (
            <p className="si-formerr" role="alert">
              <FeedIcon name="warning-circle" />
              <span>{formError}</span>
            </p>
          )}
          {(Object.keys(PW_LABELS) as PasswordField[]).map((name) => {
            const [label, ac] = PW_LABELS[name];
            const err = errors[name];
            const visible = shown[name] === true;
            return (
              <div className={cx("field", err && "is-error")} data-f={name} key={name}>
                <span className="lbl" id={`l-pw-${name}`}>
                  {t(label)}
                </span>
                <span className="si-pass">
                  <input
                    name={name}
                    type={visible ? "text" : "password"}
                    autoComplete={ac}
                    aria-labelledby={`l-pw-${name}`}
                    value={values[name]}
                    onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                    {...(name === "current" ? { "data-autofocus": "" } : {})}
                    {...(err ? { "aria-invalid": true as const, "aria-describedby": `e-${name}` } : {})}
                  />
                  <button
                    className="si-eye"
                    type="button"
                    aria-label={
                      visible ? t({ vi: "Ẩn mật khẩu", en: "Hide password" }) : t({ vi: "Hiện mật khẩu", en: "Show password" })
                    }
                    aria-pressed={visible}
                    onClick={() => setShown((s) => ({ ...s, [name]: !visible }))}
                  >
                    <FeedIcon name={visible ? "eye-slash" : "eye"} />
                  </button>
                </span>
                {err && (
                  <span className="err" id={`e-${name}`}>
                    <FeedIcon name="warning-circle" />
                    <span>{err}</span>
                  </span>
                )}
              </div>
            );
          })}
          <button className="btn btn-blue" type="submit" disabled={changing}>
            {changing
              ? t({ vi: "Đang đổi mật khẩu…", en: "Changing password…" })
              : t({ vi: "Đổi mật khẩu", en: "Change password" })}
          </button>
        </form>
      </div>
    </FeedSheet>
  );
}
