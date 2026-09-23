"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon, Tick } from "@/components/icon/Icon";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { usePrefs, writePrefs } from "@/components/shop/prefs";
import { signUp } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/state";
import { LEX } from "@/lib/lexicon";
import { PASSWORD_MIN, validateSignUp, type SignUpDraft } from "@/lib/account-form";
import { setPref } from "@/lib/prefs";

const EMPTY: SignUpDraft = {
  name: "",
  email: "",
  // Not asked for on this form — "Số điện thoại lấy từ đơn đầu tiên" — so the
  // draft carries the honest value, and the rule that wants one is dropped
  // from the blocking set here and in the Server Action alike.
  phone: "",
  password: "",
  wantsDropAlerts: true,
  // Nothing to agree to yet: there is no terms page in this build, and the
  // v3 form does not show a checkbox for one. The draft keeps the field so
  // `validateSignUp` stays the function the tests pin.
  agreed: true,
};

/**
 * Creating an account. It creates an account.
 *
 * Until slice B1 this form validated fully and then said, honestly, that
 * there was nowhere to save anything. There is now: the submit is a Server
 * Action, Supabase Auth makes the user, a trigger writes `public.profiles`,
 * email confirmation is off (nothing in this project can deliver a mail), so
 * the visitor arrives at their account signed in.
 *
 * The form still validates as it is typed, because a button that scolds
 * after the press is a button that wasted one — but the browser's verdict is
 * only a courtesy: the action runs the same rules again from the same
 * module, because a Server Action is a public endpoint.
 *
 * What it will NOT say is whether an address already has an account. That
 * sentence used to come from the fixture; against a real user table it is
 * how somebody enumerates the customers (QĐ-15).
 */
export function SignUpScreen() {
  const [state, submit, pending] = useActionState(signUp, IDLE);
  const [draft, setDraft] = useState<SignUpDraft>(EMPTY);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const { prefs } = usePrefs();

  const local = validateSignUp(draft);
  // The phone is not on this form, so its rule cannot block the button.
  const blocking = { ...local };
  delete blocking.phone;
  const complete = Object.keys(blocking).length === 0;

  function set<K extends keyof SignUpDraft>(key: K, value: SignUpDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function mark(key: keyof SignUpDraft) {
    setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
  }
  /** The server's answer wins; the live rule fills in until there is one. */
  function errorFor(key: keyof SignUpDraft) {
    return state.errors[key] ?? (touched.has(key) ? blocking[key] : undefined);
  }

  /**
   * The alert row is a real switch, not a promise.
   *
   * It writes the same two keys the account's own switches write
   * (`lib/prefs.ts` says as much: "the consent box on the sign-up form is the
   * same answer"), so ticking it here and untickng it there are one setting
   * rather than two that drift. It takes effect on this device immediately,
   * which is why it does not travel in the form.
   */
  function toggleAlerts() {
    const wants = !draft.wantsDropAlerts;
    set("wantsDropAlerts", wants);
    writePrefs(setPref(setPref(prefs, "dropOpen", wants), "emailOnStatus", wants));
  }

  return (
    <ShopFrame>
      <div className="wrap3">
        <section className="authcard3" aria-labelledby="h-up">
          <h1 id="h-up">Đăng ký</h1>
          <p className="lead">
            Một email, một mật khẩu. Số điện thoại lấy từ đơn đầu tiên.
          </p>

          {state.errors.form && (
            <p className="note3 hot" role="alert">
              <Icon name="danger" className="ic sm" />
              <span>{state.errors.form}</span>
            </p>
          )}

          <form action={submit}>
            <Field3 label="Tên" {...(errorFor("name") ? { error: errorFor("name")! } : {})}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  name="name"
                  className={errorFor("name") ? "inp bad" : "inp"}
                  autoComplete="name"
                  placeholder="Tên hiện trên đơn"
                  aria-describedby={describedBy}
                  aria-invalid={errorFor("name") !== undefined || undefined}
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  onBlur={() => mark("name")}
                />
              )}
            </Field3>

            <Field3 label="Email" {...(errorFor("email") ? { error: errorFor("email")! } : {})}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  name="email"
                  className={errorFor("email") ? "inp bad" : "inp"}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  aria-describedby={describedBy}
                  aria-invalid={errorFor("email") !== undefined || undefined}
                  value={draft.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={() => mark("email")}
                />
              )}
            </Field3>

            <Field3
              label={
                <>
                  Mật khẩu <span className="opt">· từ {PASSWORD_MIN} ký tự</span>
                </>
              }
              {...(errorFor("password") ? { error: errorFor("password")! } : {})}
            >
              {({ id, describedBy }) => (
                <input
                  id={id}
                  name="password"
                  className={errorFor("password") ? "inp bad" : "inp"}
                  type="password"
                  autoComplete="new-password"
                  aria-describedby={describedBy}
                  aria-invalid={errorFor("password") !== undefined || undefined}
                  value={draft.password}
                  onChange={(e) => set("password", e.target.value)}
                  onBlur={() => mark("password")}
                />
              )}
            </Field3>

            {/* The whole row is the control. What it records is a preference
                on this device — the same one "Email khi đơn đổi trạng thái"
                carries in the account — and the row says it can be turned
                off there. */}
            <button
              type="button"
              className="consent"
              role="checkbox"
              aria-checked={draft.wantsDropAlerts}
              onClick={toggleAlerts}
            >
              <span className="box">
                <Tick />
              </span>
              <span>
                Nhận email khi {LEX.tl} mới mở và khi đơn đổi trạng thái. Tắt được trong
                tài khoản.
              </span>
            </button>

            {/* The button is live only when the form is complete: a control
                that scolds after the press is a control that wasted one. */}
            <Button tone="wide" type="submit" disabled={!complete || pending}>
              {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
            </Button>
          </form>

          <p className="alt">
            Đã có tài khoản?{" "}
            <Link className="lnk" href="/sign-in">
              Đăng nhập
            </Link>
          </p>
        </section>
      </div>
    </ShopFrame>
  );
}
