import Link from "next/link";
import type { DemoAccounts } from "@/lib/demo-sign-in";
import { signHref } from "@/lib/feed-sign-in";
import { picker, type Locale } from "@/lib/i18n";
import { LookupForm } from "./LookupForm";
import { OutCard } from "./OutCard";
import { InlineSignIn } from "./SignInView";

/** Tôi's address: signing in or up from here comes back to it. */
const HERE = "/account";

/**
 * Tôi, signed out (round v4 slice 3b): the mock's `account.html?auth=out`
 * (`me.js`, `account.js`: `signedOut`, `signedOutHome`).
 *
 * · The phone: the dark card "Tôi" with what an account holds (Đơn hàng, Yêu
 *   thích, Nhắc giờ mở) and "Đăng nhập", "Tạo tài khoản"; under it the guest
 *   lookup.
 * · From 900px, two columns: "Đã có tài khoản" with the sign-in form right
 *   here — the very form of `/sign-in`, "Tài khoản thử" above it as there
 *   (the main session's decision) — and signing in stays on Tôi; beside it
 *   the dark card "Chưa có tài khoản" with "Tạo tài khoản", then the lookup.
 *   No perks: the menu beside lists them.
 *
 * The mock builds one or the other by the window's width; this draws both
 * once, and `account.css` shows the one for the width (the lookup is shared),
 * so there is no flash and nothing to rebuild when the window turns.
 *
 * In the page's language since round v6 slice E3a ("Account", "Have an
 * account", "No account yet", "Sign up"); the page hands it down.
 */
export function MeOut({ demo, locale }: { demo: DemoAccounts | null; locale: Locale }) {
  const t = picker(locale);
  const title = t({ vi: "Tôi", en: "Account" });
  return (
    <>
      <h1 className="sr-only">{title}</h1>
      <div className="out-home">
        <section className="out-in" aria-labelledby="out-in-title">
          <h2 className="out-head disp" id="out-in-title">
            {t({ vi: "Đã có tài khoản", en: "Have an account" })}
          </h2>
          <InlineSignIn next={HERE} demo={demo} />
        </section>
        <div className="out-side">
          <OutCard title={title} id="out-title" here={HERE} perks locale={locale} />
          <section className="out-up on-dark" aria-labelledby="out-up-title">
            <h2 className="out-head disp" id="out-up-title">
              {t({ vi: "Chưa có tài khoản", en: "No account yet" })}
            </h2>
            <Link className="btn btn-light out-up-go" href={signHref("up", HERE)}>
              {t({ vi: "Tạo tài khoản", en: "Sign up" })}
            </Link>
          </section>
          <LookupForm id="me" />
        </div>
      </div>
    </>
  );
}
