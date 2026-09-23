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
}

/** The state before the first submit. */
export const IDLE: ActionState = { errors: {} };

/**
 * Where to go after signing in, when the URL asked for somewhere.
 *
 * Only a path of this app's own: a full URL in `?next=` would turn the
 * sign-in form into an open redirect pointing anywhere, and `//evil.example`
 * is a full URL that looks like a path.
 */
export function safeNext(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw) return fallback;
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}
