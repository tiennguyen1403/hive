"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field3 } from "@/components/ui/Field3";
import { Icon } from "@/components/icon/Icon";
import { ShopFrame } from "@/components/shop/ShopFrame";

/**
 * Asking for a reset link.
 *
 * NOTHING IS SENT, and the screen never says otherwise. There is no mail
 * server in this build, so "Đã gửi tới …" would be the one sentence on the
 * site nobody could check — and it is the sentence somebody would then wait
 * for. What it says instead is what really happened: the request was
 * recorded in this browser, and sending needs a server that does not exist
 * yet.
 *
 * It does not say whether the email is registered either. On a reset form
 * that sentence is a way to find out which addresses have accounts, and a
 * real one would answer the same way whichever it was.
 */
export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError("Nhập email đã đăng ký.");
      return;
    }
    setError(null);
    setAsked(value);
  }

  return (
    <ShopFrame>
      <div className="wrap3">
        <section className="authcard3" aria-labelledby="h-fg">
          <h1 id="h-fg">Quên mật khẩu</h1>
          <p className="lead">
            Nhập email đã đăng ký. Liên kết đặt lại có hiệu lực 30 phút.
          </p>

          <form onSubmit={submit}>
            <Field3 label="Email" {...(error ? { error } : {})}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  className={error ? "inp bad" : "inp"}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  aria-describedby={describedBy}
                  aria-invalid={error !== null || undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field3>

            <Button tone="wide" icon="send" type="submit">
              Gửi liên kết đặt lại
            </Button>
          </form>

          {asked && (
            <p className="note3" role="status" style={{ marginTop: 14 }}>
              <Icon name="info" className="ic sm" />
              <span>
                Đã ghi nhận yêu cầu cho <b>{asked}</b>. Chưa có máy chủ gửi thư trong bản
                dựng này, nên không có email nào rời đi — màn hình này dựng đúng để xem
                bố cục.
              </span>
            </p>
          )}

          <p className="alt">
            <Link className="lnk" href="/sign-in">
              Về đăng nhập
            </Link>
          </p>
        </section>
      </div>
    </ShopFrame>
  );
}
