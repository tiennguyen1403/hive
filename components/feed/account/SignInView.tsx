"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { demoAdminSignIn, demoSignIn, signIn, signUp } from "@/lib/actions/auth";
import { IDLE, type ActionState } from "@/lib/actions/state";
import { PICTURE, pictureAlt, pictureOf } from "@/lib/feed";
import {
  FORGOT_NOT_SENT_TEXT,
  SIGN_SENTENCES,
  firstWrongSign,
  signErrors,
  signHref,
  signTitle,
  type SignField,
  type SignMode,
} from "@/lib/feed-sign-in";
import type { DemoAccounts } from "@/lib/demo-sign-in";
import { picker, reword } from "@/lib/i18n";
import { FeedIcon } from "../icon/FeedIcon";
import { cx } from "../useReveal";

/** The published demo accounts, read from the environment by the page (`lib/demo-sign-in.ts`); none means no box. */
export type { DemoAccounts };

interface SignInViewProps {
  mode: SignMode;
  /** Where the shopper was headed: a path of this app's own, already checked by the page. */
  next?: string | undefined;
  demo?: DemoAccounts | null;
}

/** The photo beside the form from 900px: SƯƠNG in black, worn (`sign-in.js`: `si-art`). */
const ART_KEY = "shot-suong-black";

/**
 * "Đăng nhập", "Tạo tài khoản", "Quên mật khẩu" (round v4 slice 3a): the
 * approved mock's `sign-in.html` and `sign-in.js`, its three modes one route
 * each. The form checks itself on "Đăng nhập" by the mock's rules
 * (`signErrors`): every wrong field says so under itself, the first takes
 * the focus, and once a field shows an error each keystroke checks again. A
 * valid form goes to the Server Action, which checks again.
 *
 * · Đăng nhập: a refusal is one line above the form, "Email hoặc mật khẩu
 *   chưa đúng"; the password empties and the email stays. Above the form, the
 *   demo's published accounts, "Tài khoản thử" (the user's choice, 29/09).
 * · Tạo tài khoản: an address that already has an account says so under its
 *   field (the mock's words).
 * · Quên mật khẩu: nothing can be sent yet (QĐ-35), so after a valid address
 *   the page says exactly that, with the way back to signing in.
 *
 * Rate limits and server failures keep the app's words, on the line where a
 * refused sign-in goes. Every link to another mode carries `next`.
 *
 * In the page's language since round v6 slice E3a, by the glossary: "Sign
 * in", "Sign up", "Try a demo account", "Try the admin". The demo password is
 * printed as it is. A line the form keeps — its own check's, or the Server
 * Action's — is worded again at each render (`reword`), so switching language
 * rewords it in place; the rate limit's carries a wait and stays as sent.
 */
export function SignInView({ mode, next, demo }: SignInViewProps) {
  const catalog = useCatalog();
  const locale = useLocale();
  const art = catalog.products.find((p) => p.photoKeys.includes(ART_KEY));
  const artColor = art ? art.colors[art.photoKeys.indexOf(ART_KEY)] : undefined;
  const pic = art && artColor ? pictureOf(art, artColor, "look") : null;

  return (
    <>
      <div className="si">
        {mode === "forgot" ? (
          <ForgotMode next={next} />
        ) : (
          <>
            <h1 className="si-title disp">{signTitle(mode, locale)}</h1>
            <AccountForm mode={mode} next={next} demo={mode === "in" ? (demo ?? null) : null} />
          </>
        )}
      </div>
      <figure className="si-art">
        {art && artColor && pic && (
          <Image
            src={pic.src}
            width={PICTURE.width}
            height={PICTURE.height}
            sizes="(min-width: 1280px) 520px, 40vw"
            alt={pictureAlt(art, artColor, pic.look, locale)}
          />
        )}
      </figure>
    </>
  );
}

/**
 * Tôi's own way in from 900px, signed out (round v4 slice 3b): the very form
 * of "Đăng nhập" (`account.js`: `signInForm`, shared with `sign-in.html` so
 * the two never drift apart) — "Tài khoản thử" above it, as on the sign-in
 * page (the user's choice, 29/09) — with the button and "Quên mật khẩu?" on
 * one line (`row`) and nothing under it: "Tạo tài khoản" stands in the dark
 * card beside. Signing in here comes back to Tôi.
 */
export function InlineSignIn({ next, demo }: { next: string; demo: DemoAccounts | null }) {
  return <AccountForm mode="in" next={next} demo={demo} row extras={false} />;
}

type Values = Record<SignField, string>;

interface AccountFormProps {
  mode: "in" | "up";
  next: string | undefined;
  demo: DemoAccounts | null;
  /** The button and "Quên mật khẩu?" on one line (Tôi from 900px) instead of the link above the button. */
  row?: boolean;
  /** "hoặc", Google and the way to the other mode, under the form (the sign-in page's; not Tôi's). */
  extras?: boolean;
}

/** Đăng nhập and Tạo tài khoản: the fields, the refusal line, "hoặc", Google, and the way to the other mode. */
function AccountForm({ mode, next, demo, row = false, extras = true }: AccountFormProps) {
  const locale = useLocale();
  const t = picker(locale);
  const [state, dispatch, pending] = useActionState(mode === "up" ? signUp : signIn, IDLE);
  const [demoState, dispatchDemo, demoPending] = useActionState(demoSignIn, IDLE);
  const [adminState, dispatchAdmin, adminPending] = useActionState(demoAdminSignIn, IDLE);
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "" });
  const [shown, setShown] = useState(false);
  const [server, setServer] = useState<Partial<Record<SignField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [seen, setSeen] = useState<ActionState[]>([state, demoState, adminState]);
  const form = useRef<HTMLFormElement>(null);

  // An answer from the server (the adjust-state-while-rendering pattern: each answer is read once). The last one
  // pressed is the one with something to say.
  const answers = [state, demoState, adminState];
  if (answers.some((a, i) => a !== seen[i])) {
    const fresh = answers.find((a, i) => a !== seen[i])!;
    setSeen(answers);
    setFormError(fresh.errors.form ?? null);
    // A line above the form speaks for the whole of it: the fields, which passed before sending, show nothing until
    // the next press (the mock's `?errors=1`: the line, the email kept, the password empty and unmarked).
    if (fresh.errors.form) setShown(false);
    if (fresh === state) {
      const { form: _form, ...fields } = state.errors;
      setServer(fields as Partial<Record<SignField, string>>);
      // A refused sign-in empties the password and keeps the email (`signInForm` after an error).
      if (mode === "in" && state.errors.form) setValues((v) => ({ ...v, password: "" }));
    }
  }

  const busy = pending || demoPending || adminPending;
  const local = shown ? signErrors(mode, values, locale) : {};
  const errors: Partial<Record<SignField, string>> = { ...server, ...local };
  // What the form was told stays as it came; it is printed in the page's language.
  const say = (sentence: string | undefined) => (sentence ? reword(sentence, locale, SIGN_SENTENCES) : sentence);

  function set(field: SignField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    // What the server said of a field stands until that field changes.
    if (server[field]) setServer((s) => ({ ...s, [field]: undefined }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    setServer({});
    setShown(true);
    const wrong = firstWrongSign(mode, signErrors(mode, values));
    if (wrong) {
      form.current?.querySelector<HTMLInputElement>(`[name="${wrong}"]`)?.focus();
      return;
    }
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  }

  const submitLabel =
    mode === "up"
      ? pending
        ? t({ vi: "Đang tạo tài khoản…", en: "Signing up…" })
        : t({ vi: "Tạo tài khoản", en: "Sign up" })
      : pending
        ? t({ vi: "Đang đăng nhập…", en: "Signing in…" })
        : t({ vi: "Đăng nhập", en: "Sign in" });
  const forgot =
    mode === "in" ? (
      <Link className="link si-forgot" href={signHref("forgot", next)}>
        {t({ vi: "Quên mật khẩu?", en: "Forgot password?" })}
      </Link>
    ) : null;
  const submit = (
    <button className="btn btn-blue" type="submit" disabled={busy}>
      {submitLabel}
    </button>
  );

  return (
    <>
      {demo && (
        <DemoBox
          demo={demo}
          next={next}
          busy={busy}
          demoPending={demoPending}
          adminPending={adminPending}
          onDemo={(data) => {
            setFormError(null);
            startTransition(() => dispatchDemo(data));
          }}
          onAdmin={(data) => {
            setFormError(null);
            startTransition(() => dispatchAdmin(data));
          }}
        />
      )}
      <form className="si-form" noValidate onSubmit={onSubmit} ref={form}>
        {formError && (
          <p className="si-formerr" role="alert">
            <FeedIcon name="warning-circle" />
            <span>{say(formError)}</span>
          </p>
        )}
        <input type="hidden" name="next" value={next ?? ""} />
        {mode === "up" && (
          <TextField
            name="name"
            label={t({ vi: "Họ và tên", en: "Full name" })}
            autoComplete="name"
            value={values.name}
            error={say(errors.name)}
            onChange={(v) => set("name", v)}
          />
        )}
        <TextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          error={say(errors.email)}
          onChange={(v) => set("email", v)}
        />
        <PasswordField
          label={t({ vi: "Mật khẩu", en: "Password" })}
          autoComplete={mode === "up" ? "new-password" : "current-password"}
          value={values.password}
          error={say(errors.password)}
          onChange={(v) => set("password", v)}
        />
        {row ? (
          <div className="si-row">
            {submit}
            {forgot}
          </div>
        ) : (
          <>
            {forgot}
            {submit}
          </>
        )}
      </form>
      {extras && (
        <>
          <p className="si-or">{t({ vi: "hoặc", en: "or" })}</p>
          <button className="btn btn-line si-google" type="button" disabled aria-describedby="g-soon">
            <FeedIcon name="google-logo" />
            {t({ vi: "Tiếp tục với Google", en: "Continue with Google" })}
            <span className="tag-soon" id="g-soon">
              {t({ vi: "Đang chuẩn bị", en: "Coming soon" })}
            </span>
          </button>
          {mode === "up" ? (
            <Link className="link si-switch" href={signHref("in", next)}>
              {t({ vi: "Đã có tài khoản? Đăng nhập", en: "Have an account? Sign in" })}
            </Link>
          ) : (
            <Link className="link si-switch" href={signHref("up", next)}>
              {t({ vi: "Chưa có tài khoản? Tạo tài khoản", en: "No account yet? Sign up" })}
            </Link>
          )}
        </>
      )}
    </>
  );
}

/**
 * "Tài khoản thử" (the user's choice, 29/09/2026; not in the mock): the
 * demo's published shopper and back-office accounts and their password, on
 * Feed's grey and rounded as a selection card, above the form, with the two
 * shortcuts that sign in with exactly what is printed.
 */
function DemoBox({
  demo,
  next,
  busy,
  demoPending,
  adminPending,
  onDemo,
  onAdmin,
}: {
  demo: DemoAccounts;
  next: string | undefined;
  busy: boolean;
  demoPending: boolean;
  adminPending: boolean;
  onDemo: (data: FormData) => void;
  onAdmin: (data: FormData) => void;
}) {
  const t = picker(useLocale());
  const send = (run: (data: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!busy) run(new FormData(e.currentTarget));
  };
  return (
    <section className="si-demo" aria-labelledby="si-demo-title">
      <h2 className="si-demo-title" id="si-demo-title">
        {t({ vi: "Tài khoản thử", en: "Demo accounts" })}
      </h2>
      <div className="si-demo-lines">
        <p>
          <b>{demo.email}</b>
        </p>
        <p>
          {t<React.ReactNode>({
            vi: (
              <>
                Quản trị: <b>{demo.adminEmail}</b>
              </>
            ),
            en: (
              <>
                Admin: <b>{demo.adminEmail}</b>
              </>
            ),
          })}
        </p>
        <p>
          {t<React.ReactNode>({
            vi: (
              <>
                Mật khẩu: <b>{demo.password}</b>
              </>
            ),
            en: (
              <>
                Password: <b>{demo.password}</b>
              </>
            ),
          })}
        </p>
      </div>
      <div className="si-demo-acts">
        <form onSubmit={send(onDemo)}>
          <input type="hidden" name="next" value={next ?? ""} />
          <button className="btn btn-line" type="submit" disabled={busy}>
            {demoPending
              ? t({ vi: "Đang mở tài khoản thử…", en: "Opening the demo account…" })
              : t({ vi: "Đăng nhập thử", en: "Try a demo account" })}
          </button>
        </form>
        <form onSubmit={send(onAdmin)}>
          <input type="hidden" name="next" value={next ?? ""} />
          <button className="btn btn-line" type="submit" disabled={busy}>
            {adminPending
              ? t({ vi: "Đang mở khu quản trị…", en: "Opening the admin…" })
              : t({ vi: "Vào quản trị thử", en: "Try the admin" })}
          </button>
        </form>
      </div>
    </section>
  );
}

/** Quên mật khẩu: the address, then the honest line (QĐ-35) and the way back. */
function ForgotMode({ next }: { next: string | undefined }) {
  const locale = useLocale();
  const t = picker(locale);
  const [email, setEmail] = useState("");
  const [shown, setShown] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const back = useRef<HTMLAnchorElement>(null);
  const error = shown ? signErrors("forgot", { email }, locale).email : undefined;
  const notSent = t(FORGOT_NOT_SENT_TEXT);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShown(true);
    if (signErrors("forgot", { email }).email) {
      field.current?.focus();
      return;
    }
    setAsked(email.trim());
    // The page's new content takes the focus, as the mock moves it into the sent block.
    window.requestAnimationFrame(() => back.current?.focus());
  }

  return (
    <>
      <h1 className="si-title disp">{signTitle("forgot", locale)}</h1>
      {asked !== null ? (
        <div className="si-sent" role="status">
          <p className="si-sent-line">
            {notSent.before}
            <b>{asked}</b>
            {notSent.after}
          </p>
          <Link className="btn btn-line" href={signHref("in", next)} ref={back}>
            {t({ vi: "Về đăng nhập", en: "Back to sign in" })}
          </Link>
        </div>
      ) : (
        <>
          <form className="si-form" noValidate onSubmit={onSubmit}>
            <TextField
              name="email"
              label={t({ vi: "Email đã đăng ký", en: "Registered email" })}
              type="email"
              autoComplete="email"
              value={email}
              error={error}
              onChange={setEmail}
              inputRef={field}
            />
            <button className="btn btn-blue" type="submit">
              {t({ vi: "Gửi liên kết", en: "Send link" })}
            </button>
          </form>
          <Link className="link si-switch" href={signHref("in", next)}>
            {t({ vi: "Về đăng nhập", en: "Back to sign in" })}
          </Link>
        </>
      )}
    </>
  );
}

interface TextFieldProps {
  name: SignField;
  label: string;
  type?: string;
  autoComplete: string;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

/** A labelled field with its error under it (`account.js`: `siField`). */
function TextField({ name, label, type, autoComplete, value, error, onChange, inputRef }: TextFieldProps) {
  return (
    <label className={cx("field", error && "is-error")} data-f={name}>
      <span className="lbl">{label}</span>
      <input
        ref={inputRef}
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
}

/**
 * The password, with its show and hide (`account.js`: `siPass`). The button
 * may not sit inside a <label>, so the field is a group and its words name the
 * input through `aria-labelledby`.
 */
function PasswordField({
  label,
  autoComplete,
  value,
  error,
  onChange,
}: {
  label: string;
  autoComplete: string;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
}) {
  const t = picker(useLocale());
  const [visible, setVisible] = useState(false);
  return (
    <div className={cx("field", error && "is-error")} data-f="password">
      <span className="lbl" id="l-password">
        {label}
      </span>
      <span className="si-pass">
        <input
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-labelledby="l-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...(error ? { "aria-invalid": true as const, "aria-describedby": "e-password" } : {})}
        />
        <button
          className="si-eye"
          type="button"
          aria-label={visible ? t({ vi: "Ẩn mật khẩu", en: "Hide password" }) : t({ vi: "Hiện mật khẩu", en: "Show password" })}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <FeedIcon name={visible ? "eye-slash" : "eye"} />
        </button>
      </span>
      {error && (
        <span className="err" id="e-password">
          <FeedIcon name="warning-circle" />
          <span>{error}</span>
        </span>
      )}
    </div>
  );
}
