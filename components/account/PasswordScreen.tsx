"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon } from "@/components/icon/Icon";
import { changePassword } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/state";
import {
  passwordChecks,
  validateChangePassword,
  type ChangePasswordDraft,
} from "@/lib/account-form";

const EMPTY: ChangePasswordDraft = { current: "", next: "", confirm: "" };

/**
 * Changing the password. It changes the password.
 *
 * The three rules still update as the shopper types, each passing or failing
 * on its own — "Mật khẩu không hợp lệ" after a submit makes somebody guess
 * which rule they broke, and a live list means they never have to. What is
 * new in slice B1 is that the button at the bottom does the thing it names:
 * the form posts to a Server Action, the action re-runs the same rules from
 * `lib/account-form.ts` (a validator that only ran in the browser is a
 * validator anyone can skip), checks the CURRENT password by signing in with
 * it, and then asks Supabase to set the new one.
 *
 * The warning that used to sit above these fields — the one telling people
 * not to type a password they actually use — is gone with the reason for it.
 */
export function PasswordScreen() {
  const [state, submit, pending] = useActionState(changePassword, IDLE);
  const [draft, setDraft] = useState<ChangePasswordDraft>(EMPTY);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const checks = passwordChecks(draft.next, draft.current);
  const local = validateChangePassword(draft);
  const ready = Object.keys(local).length === 0;

  // A password that has been changed is not a password to leave on screen.
  useEffect(() => {
    if (state.ok) {
      setDraft(EMPTY);
      setTouched(new Set());
    }
  }, [state.ok]);

  /** Shown once, and only until the next keystroke starts a new attempt. */
  const done = state.ok === true && draft.next === "" && draft.current === "";

  function set<K extends keyof ChangePasswordDraft>(k: K, v: string) {
    setDraft((d) => ({ ...d, [k]: v }));
  }
  function mark(k: keyof ChangePasswordDraft) {
    setTouched((t) => (t.has(k) ? t : new Set(t).add(k)));
  }
  /** The server's answer wins; the local rule fills in until there is one. */
  function errorFor(k: keyof ChangePasswordDraft): string | undefined {
    return state.errors[k] ?? (touched.has(k) ? local[k] : undefined);
  }

  return (
    <>
      <div className="pghead">
        <h1>Đổi mật khẩu</h1>
      </div>

      <form className="panel3" action={submit} style={{ marginTop: 16, maxWidth: 460 }}>
        <h3>Mật khẩu</h3>

        <Field3
          label="Mật khẩu hiện tại"
          {...(errorFor("current") ? { error: errorFor("current")! } : {})}
        >
          {({ id, describedBy }) => (
            <input
              id={id}
              name="current"
              className={errorFor("current") ? "inp bad" : "inp"}
              type="password"
              autoComplete="current-password"
              aria-describedby={describedBy}
              aria-invalid={errorFor("current") !== undefined || undefined}
              value={draft.current}
              onChange={(e) => set("current", e.target.value)}
              onBlur={() => mark("current")}
            />
          )}
        </Field3>

        <Field3 label="Mật khẩu mới" {...(state.errors.next ? { error: state.errors.next } : {})}>
          {({ id }) => (
            <input
              id={id}
              name="next"
              className={state.errors.next ? "inp bad" : "inp"}
              type="password"
              autoComplete="new-password"
              aria-describedby="pw-rules"
              value={draft.next}
              onChange={(e) => set("next", e.target.value)}
            />
          )}
        </Field3>

        {/* Each rule carries an icon as well as a colour, and its own
            word. A row of green and red dots alone is a puzzle. */}
        <ul className="checks3" id="pw-rules">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "ok" : undefined}>
              <Icon name={c.ok ? "confirm" : "x"} className="ic sm" />
              {c.label}
            </li>
          ))}
        </ul>

        <Field3
          label="Nhập lại mật khẩu mới"
          {...(errorFor("confirm") ? { error: errorFor("confirm")! } : {})}
        >
          {({ id, describedBy }) => (
            <input
              id={id}
              name="confirm"
              className={errorFor("confirm") ? "inp bad" : "inp"}
              type="password"
              autoComplete="new-password"
              aria-describedby={describedBy}
              aria-invalid={errorFor("confirm") !== undefined || undefined}
              value={draft.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              onBlur={() => mark("confirm")}
            />
          )}
        </Field3>

        <div className="acts3">
          {/* Live only when all three rules pass: a control that scolds
              after the press is a control that wasted one. And a disabled
              button carries no icon — the icon names an action, and there is
              no action to name yet. */}
          <Button
            tone="wide"
            type="submit"
            disabled={!ready || pending}
            {...(!ready || pending ? {} : { icon: "confirm" as const })}
          >
            {pending ? "Đang đổi…" : "Đổi mật khẩu"}
          </Button>
          <ButtonLink tone="quiet" icon="back" href="/account/profile">
            Về hồ sơ
          </ButtonLink>
        </div>
      </form>

      {done && (
        <p className="note3" role="status" style={{ marginTop: 14 }}>
          <Icon name="confirm" className="ic sm" />
          <span>Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.</span>
        </p>
      )}
    </>
  );
}
