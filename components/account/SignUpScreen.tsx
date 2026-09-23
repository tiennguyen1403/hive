"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon, Tick } from "@/components/icon/Icon";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { LEX } from "@/lib/lexicon";
import { PASSWORD_MIN, validateSignUp, type SignUpDraft } from "@/lib/account-form";

const EMPTY: SignUpDraft = {
  name: "",
  email: "",
  phone: "",
  password: "",
  wantsDropAlerts: true,
  // Nothing to agree to yet — there is no terms page in this build, and the
  // v3 form does not show a checkbox for one. The draft keeps the field so
  // `validateSignUp` stays the same function the tests pin.
  agreed: true,
};

/**
 * Creating an account.
 *
 * Nothing is created. There is no server to create it on, and writing a new
 * customer into `localStorage` so the next screen could pretend would be a
 * promise the build cannot keep past a cleared cache. The form validates
 * fully — including against the emails and phones already in the data — and
 * then says plainly what it cannot do.
 *
 * The phone number is NOT asked for. The v3 form takes an email and a
 * password, and says where the number comes from instead: the first order.
 * `validateSignUp` still checks one, so the draft carries the value the
 * shopper never sees — empty, which is the honest state until an order
 * exists.
 */
export function SignUpScreen() {
  const [draft, setDraft] = useState<SignUpDraft>(EMPTY);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const errors = validateSignUp(draft);
  // The phone is not on this form, so its rule cannot block the button.
  const blocking = { ...errors };
  delete blocking.phone;
  const complete = Object.keys(blocking).length === 0;

  function set<K extends keyof SignUpDraft>(key: K, value: SignUpDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function mark(key: keyof SignUpDraft) {
    setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
  }
  function errorFor(key: keyof SignUpDraft) {
    return submitted || touched.has(key) ? blocking[key] : undefined;
  }

  return (
    <ShopFrame>
      <div className="wrap3">
        <section className="authcard3" aria-labelledby="h-up">
          <h1 id="h-up">Đăng ký</h1>
          <p className="lead">
            Một email, một mật khẩu. Số điện thoại lấy từ đơn đầu tiên.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <Field3 label="Tên" {...(errorFor("name") ? { error: errorFor("name")! } : {})}>
              {({ id, describedBy }) => (
                <input
                  id={id}
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
              onClick={() => set("wantsDropAlerts", !draft.wantsDropAlerts)}
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
            <Button tone="wide" type="submit" disabled={!complete}>
              Tạo tài khoản
            </Button>
          </form>

          {submitted && complete && (
            <p className="note3" role="status" style={{ marginTop: 14 }}>
              <Icon name="info" className="ic sm" />
              <span>
                Chưa tạo được tài khoản: bản dựng này chưa có máy chủ, nên không có nơi
                nào để lưu. Form đã kiểm đủ điều kiện. Để xem các màn trong tài khoản,{" "}
                <Link className="lnk" href="/sign-in">
                  đăng nhập bằng một tài khoản mẫu
                </Link>
                .
              </span>
            </p>
          )}

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
