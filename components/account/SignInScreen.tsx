"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon } from "@/components/icon/Icon";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { demoSignIn, signIn } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/state";

interface SignInScreenProps {
  /** Where to land afterwards. Only ever a path of this app's own. */
  next?: string;
  /** The published demo account, read from the environment by the page. */
  demoEmail?: string;
  demoPassword?: string;
}

/**
 * The sign-in screen.
 *
 * `next` arrives as a prop rather than through `useSearchParams`, which
 * would pull this whole tree out of the static shell and demand a Suspense
 * boundary around it. The server page already has the search params, and it
 * rides along in a hidden field so the Server Action gets it too — the
 * action re-checks that it is a path and not a URL, because a hidden field
 * is a thing anyone can edit.
 *
 * Since slice B1 the check is REAL: Supabase Auth, email and password, over
 * a Server Action. The note that used to warn there was no auth server behind
 * this form, and that nobody should type a password they actually use, is gone
 * with the reason for it. What stands in its place is the thing that is still
 * true — this is a public demo, and here is the account to try it with.
 *
 * One sentence for every failure (QĐ-15). Naming the field would answer a
 * question nobody asked: which addresses have accounts here.
 *
 * "Tiếp tục với Google" is DISABLED and says why. The approved design offers
 * it and there is no provider behind it; a greyed control that states the
 * missing piece is more honest than a button that opens nothing, and a
 * disabled button carries no icon (DESIGN.md §9 rule 3).
 */
export function SignInScreen({ next, demoEmail, demoPassword }: SignInScreenProps) {
  const [state, submit, pending] = useActionState(signIn, IDLE);
  const [demoState, submitDemo, demoPending] = useActionState(demoSignIn, IDLE);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Whichever of the two forms was last pressed is the one with something to
  // say; neither can be pending while the other is.
  const failed = state.errors.form ?? demoState.errors.form;
  // No account to offer means no button offering it (DESIGN.md §9 rule 3).
  const demo = demoEmail && demoPassword ? { email: demoEmail, password: demoPassword } : null;

  return (
    <ShopFrame>
      <div className="wrap3">
        <section className="authcard3" aria-labelledby="h-in">
          <h1 id="h-in">Đăng nhập</h1>
          <p className="lead">
            Để xem đơn, địa chỉ đã lưu và mã đang chạy. Mua không cần tài khoản vẫn được.
          </p>

          {demo && (
            <p className="note3">
              <Icon name="info" className="ic sm" />
              <span>
                Bản demo công khai: ai cũng đăng ký được. Tài khoản thử sẵn{" "}
                <b>{demo.email}</b> · mật khẩu <b>{demo.password}</b>.
              </span>
            </p>
          )}

          {failed && (
            <p className="note3 hot" role="alert">
              <Icon name="danger" className="ic sm" />
              <span>{failed}</span>
            </p>
          )}

          <form action={submit}>
            <input type="hidden" name="next" value={next ?? ""} />

            <Field3 label="Email">
              {({ id, describedBy }) => (
                <input
                  id={id}
                  name="email"
                  className="inp"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  aria-describedby={describedBy}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              )}
            </Field3>

            <Field3 label="Mật khẩu">
              {({ id, describedBy }) => (
                <input
                  id={id}
                  name="password"
                  className="inp"
                  type="password"
                  autoComplete="current-password"
                  aria-describedby={describedBy}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field3>

            <p className="forgot">
              <Link className="lnk" href="/forgot-password">
                Quên mật khẩu
              </Link>
            </p>

            <Button
              tone="wide"
              type="submit"
              disabled={pending || demoPending}
              {...(pending || demoPending ? {} : { icon: "login" as const })}
            >
              {pending ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </form>

          <div className="divider3">hoặc</div>

          {demo && (
            <form action={submitDemo} style={{ marginTop: 14 }}>
              <input type="hidden" name="next" value={next ?? ""} />
              <Button
                tone="ink wide"
                type="submit"
                disabled={pending || demoPending}
                {...(pending || demoPending ? {} : { icon: "user" as const })}
              >
                {demoPending ? "Đang mở tài khoản thử…" : "Đăng nhập thử"}
              </Button>
            </form>
          )}

          <p style={{ marginTop: 14 }}>
            <Button tone="ink wide" disabled>
              Tiếp tục với Google · đang chuẩn bị
            </Button>
          </p>

          <p className="alt">
            Chưa có tài khoản?{" "}
            <Link className="lnk" href="/sign-up">
              Đăng ký
            </Link>{" "}
            ·{" "}
            <Link className="lnk" href="/cart">
              Mua không cần tài khoản
            </Link>
          </p>
        </section>
      </div>
    </ShopFrame>
  );
}
