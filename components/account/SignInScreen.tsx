"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon } from "@/components/icon/Icon";
import { ShopFrame } from "@/components/shop/ShopFrame";
import { CUSTOMERS } from "@/data/customers";
import { useSession } from "./SessionContext";

/**
 * The sign-in screen.
 *
 * `next` arrives as a prop rather than through `useSearchParams`, which
 * would pull this whole tree out of the static shell and demand a Suspense
 * boundary around it. The server page already has the search params.
 *
 * It says on its face that the check is simulated. There is no auth server
 * behind this build, and a login form that looks real while verifying
 * nothing invites somebody to type a password they use elsewhere. Naming a
 * demo account is what makes the screen usable AND honest at once.
 *
 * "Tiếp tục với Google" is DISABLED and says why. The approved design offers
 * it and there is no provider behind it; a greyed control that states the
 * missing piece is more honest than a button that opens nothing, and a
 * disabled button carries no icon (DESIGN.md §9 rule 3).
 */
export function SignInScreen({ next }: { next?: string }) {
  const { signIn } = useSession();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ field: string; message: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = signIn(identifier, password);
    if (!result.ok) {
      setError({ field: result.field, message: result.message });
      return;
    }
    setError(null);
    // `replace`, not `push`: Back from the account page should go where they
    // came from, not to a sign-in form they have already been through.
    // Only a path of our own — a full URL in `?next=` would turn sign-in
    // into an open redirect pointing anywhere.
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
    router.replace(dest);
  }

  return (
    <ShopFrame>
      <div className="wrap3">
        <section className="authcard3" aria-labelledby="h-in">
          <h1 id="h-in">Đăng nhập</h1>
          <p className="lead">
            Để xem đơn, địa chỉ đã lưu và mã đang chạy. Mua không cần tài khoản vẫn được.
          </p>

          {/* Not decoration. This build has no authentication — saying so is
              the difference between a demo and a form that fishes for
              passwords. */}
          <p className="note3">
            <Icon name="info" className="ic sm" />
            <span>
              Chưa có máy chủ xác thực. Dùng email của một khách trong dữ liệu mẫu — ví
              dụ <b>{CUSTOMERS[0]!.email}</b> — với mật khẩu bất kỳ. Không nhập mật khẩu
              thật.
            </span>
          </p>

          <form onSubmit={submit}>
            <Field3
              label="Email"
              {...(error?.field === "identifier" ? { error: error.message } : {})}
            >
              {({ id, describedBy }) => (
                <input
                  id={id}
                  className={error?.field === "identifier" ? "inp bad" : "inp"}
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  aria-describedby={describedBy}
                  aria-invalid={error?.field === "identifier" || undefined}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              )}
            </Field3>

            <Field3
              label="Mật khẩu"
              {...(error?.field === "password" ? { error: error.message } : {})}
            >
              {({ id, describedBy }) => (
                <input
                  id={id}
                  className={error?.field === "password" ? "inp bad" : "inp"}
                  type="password"
                  autoComplete="current-password"
                  aria-describedby={describedBy}
                  aria-invalid={error?.field === "password" || undefined}
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

            <Button tone="wide" icon="login" type="submit">
              Đăng nhập
            </Button>
          </form>

          <div className="divider3">hoặc</div>

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
