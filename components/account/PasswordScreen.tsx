"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon } from "@/components/icon/Icon";
import {
  passwordChecks,
  validateChangePassword,
  type ChangePasswordDraft,
} from "@/lib/account-form";
import { AccountGuard } from "./AccountGuard";

const EMPTY: ChangePasswordDraft = { current: "", next: "", confirm: "" };

/**
 * Changing the password, in the v3 frame.
 *
 * The three rules update as the shopper types, each passing or failing on
 * its own. "Mật khẩu không hợp lệ" after a submit makes somebody guess which
 * rule they broke; a live list means they never have to.
 *
 * Nothing is saved — there is no password store to save into, and this
 * screen never writes what is typed anywhere. It says so where the shopper
 * will read it BEFORE typing, and the button stays disabled and says why,
 * rather than accepting a password it would drop.
 */
export function PasswordScreen() {
  const [draft, setDraft] = useState<ChangePasswordDraft>(EMPTY);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const checks = passwordChecks(draft.next, draft.current);
  const errors = validateChangePassword(draft);
  const ready = Object.keys(errors).length === 0;

  function set<K extends keyof ChangePasswordDraft>(k: K, v: string) {
    setDraft((d) => ({ ...d, [k]: v }));
  }
  function mark(k: keyof ChangePasswordDraft) {
    setTouched((t) => (t.has(k) ? t : new Set(t).add(k)));
  }

  return (
    <AccountGuard title="Đổi mật khẩu" active="profile">
      {() => (
        <>
          <div className="pghead">
            <h1>Đổi mật khẩu</h1>
            <span className="meta">chưa nối máy chủ</span>
          </div>

          <p className="note3">
            <Icon name="info" className="ic sm" />
            <span>
              Bản dựng này chưa có máy chủ xác thực. Màn hình kiểm đủ điều kiện nhưng
              không ghi mật khẩu đi đâu — đừng nhập mật khẩu thật.
            </span>
          </p>

          <section className="panel3" style={{ marginTop: 16, maxWidth: 460 }}>
            <h3>Mật khẩu</h3>

            <Field3
              label="Mật khẩu hiện tại"
              {...(touched.has("current") && errors.current
                ? { error: errors.current }
                : {})}
            >
              {({ id, describedBy }) => (
                <input
                  id={id}
                  className={
                    touched.has("current") && errors.current ? "inp bad" : "inp"
                  }
                  type="password"
                  autoComplete="current-password"
                  aria-describedby={describedBy}
                  value={draft.current}
                  onChange={(e) => set("current", e.target.value)}
                  onBlur={() => mark("current")}
                />
              )}
            </Field3>

            <Field3 label="Mật khẩu mới">
              {({ id }) => (
                <input
                  id={id}
                  className="inp"
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
              {...(touched.has("confirm") && errors.confirm
                ? { error: errors.confirm }
                : {})}
            >
              {({ id, describedBy }) => (
                <input
                  id={id}
                  className={
                    touched.has("confirm") && errors.confirm ? "inp bad" : "inp"
                  }
                  type="password"
                  autoComplete="new-password"
                  aria-describedby={describedBy}
                  value={draft.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  onBlur={() => mark("confirm")}
                />
              )}
            </Field3>

            <div className="acts3">
              {/* A disabled button carries no icon: the icon names an action,
                  and there is no action to name. */}
              <Button tone="wide" disabled>
                {ready ? "Đổi mật khẩu — chưa nối máy chủ" : "Đổi mật khẩu"}
              </Button>
              <ButtonLink tone="quiet" icon="back" href="/account/profile">
                Về hồ sơ
              </ButtonLink>
            </div>
          </section>

          <p className="fine3">
            Khi có máy chủ: đổi xong sẽ bị đăng xuất khỏi các thiết bị khác. Thiết bị này
            vẫn giữ đăng nhập.
          </p>
        </>
      )}
    </AccountGuard>
  );
}
