/**
 * What a Server Action hands back to `useActionState`.
 *
 * A plain module, NOT a `"use server"` one: a file carrying that directive may
 * only export async functions, so the initial value and the shape have to live
 * beside it rather than in it
 * (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`).
 *
 * Expected failures are values, never exceptions. A password that is too short
 * is not an error the framework should turn into an error page; it is the form
 * telling somebody which line to fix — so every action below returns one of
 * these and only genuinely broken plumbing is allowed to throw.
 */
export interface ActionState {
  /**
   * Field name → the sentence shown under that field. The key `form` is the
   * message that belongs to the whole form rather than to one line — a failed
   * sign-in, for instance, which QĐ-15 says must not point at a field.
   */
  errors: Record<string, string>;
  /** Set once the action has done what the button says. */
  ok?: boolean;
  /**
   * The sentence a toast shows once it has — "DH-2430 → đã thanh toán · đã
   * lưu". The back office's actions (slice B3a) say what they did in their
   * own words, because only the server knows what actually went through.
   */
  message?: string;
}

/** The state before the first submit. */
export const IDLE: ActionState = { errors: {} };

/** A placeholder origin to resolve a path against; `.invalid` is reserved and never resolves (RFC 6761 §6.4). */
const PROBE_ORIGIN = "http://next.invalid";

/** A backslash, or any C0 control character or DEL — tab, newline and carriage return among them. */
const NOT_IN_A_PATH = /[\\\u0000-\u001f\u007f]/;

/**
 * Where to go after signing in, when the URL asked for somewhere — the ONE
 * rule for every `next` this app turns into a redirect: the sign-in, sign-up,
 * demo and sign-out actions, Google's round trip and its `/auth/callback`
 * (slice B16), the sign-in detour of `requireSession` and `requireAdmin`, and
 * the `?next=` the sign-in pages carry (`nextParam`).
 *
 * Only a path of this app's own: a full URL in `?next=` would turn the
 * sign-in form into an open redirect pointing anywhere, and `//evil.example`
 * is a full URL that looks like a path.
 *
 * STRICTER SINCE SLICE B16, after a measured open redirect on the public demo:
 * `/sign-in?next=%2F%5Cevil.example`, then "Đăng nhập thử", landed the browser
 * on `http://evil.example/`. A browser reads a `Location` with the WHATWG URL
 * parser (https://url.spec.whatwg.org/), which takes a backslash for a slash
 * in an http URL and removes tabs and newlines before it starts — so
 * `/\evil.example` and `/<tab>/evil.example` are protocol-relative to it.
 * Refused now, before anything is parsed: a backslash, a control character.
 *
 * Then the path is resolved the way a browser resolves it, against a
 * placeholder origin, and refused unless it stays there. What comes back is
 * the PARSED path, query and fragment — percent-encoded and with its dot
 * segments resolved — so what the redirect is handed is exactly what was
 * checked; and that is checked once more, because resolving can MAKE a
 * protocol-relative reference: `/..//evil.example` and `/%2e%2e//evil.example`
 * stay on the site as written but resolve to the path `//evil.example`, which
 * a browser handed on its own reads as a host. (All measured with Node's
 * `URL`, the same parser, 07/10/2026.)
 *
 * `fallback` is the caller's own constant and is returned as given.
 */
export function safeNext(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || NOT_IN_A_PATH.test(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  const path = url.pathname + url.search + url.hash;
  if (url.origin !== PROBE_ORIGIN || path.startsWith("//")) return fallback;
  return path;
}
