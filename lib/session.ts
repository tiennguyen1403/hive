import { CUSTOMERS, customerById } from "@/data/customers";
import { customerId, type Customer, type CustomerId } from "@/data/types";
import { normalisePhone } from "./checkout-form";
import { demoNow } from "./clock";

/**
 * Who is signed in — simulated, and saying so.
 *
 * There is no auth server, no password store and no token. This module does
 * one honest thing: it matches what someone types against the seeded
 * customers and remembers which of them the browser is acting as. The
 * sign-in screen prints that in as many words, because a login that looks
 * real while checking nothing is the kind of thing PRODUCT.md rules out.
 *
 * The password is read, checked for being non-empty, and dropped. `Session`
 * has nowhere to put one, which is the point: there is nothing here that
 * could accidentally persist a credential.
 */

export interface Session {
  customerId: CustomerId;
  since: string;
}

export const SESSION_STORAGE_KEY = "brand.session";
const SCHEMA_VERSION = 1;

/** Fold a typed identifier so it matches however it was punctuated. */
function foldEmail(v: string): string {
  return v.trim().toLowerCase();
}

/**
 * Find the seeded customer an identifier names — email or phone, either way
 * people actually type them.
 */
export function findAccount(identifier: string): Customer | undefined {
  const raw = identifier.trim();
  if (!raw) return undefined;

  const email = foldEmail(raw);
  const byEmail = CUSTOMERS.find((c) => foldEmail(c.email) === email);
  if (byEmail) return byEmail;

  const phone = normalisePhone(raw);
  if (!phone) return undefined;
  return CUSTOMERS.find((c) => normalisePhone(c.phone) === phone);
}

export type SignInResult =
  | { ok: true; session: Session }
  | { ok: false; field: "identifier" | "password"; message: string };

/**
 * The whole of sign-in.
 *
 * Errors name the field that is wrong. "Có lỗi xảy ra" is a sentence that
 * leaves the shopper with nothing to do next, and on the last screen before
 * someone's order history that is not good enough.
 *
 * A real backend must NOT copy the shape of the first branch: saying "no
 * such account" tells an attacker which emails are registered. It is right
 * here only because every account is a published fixture — there is nothing
 * to leak.
 */
export function signInResult(
  identifier: string,
  password: string,
  now: Date = demoNow(),
): SignInResult {
  if (!identifier.trim()) {
    return { ok: false, field: "identifier", message: "Nhập email hoặc số điện thoại." };
  }
  if (!password) {
    return { ok: false, field: "password", message: "Nhập mật khẩu." };
  }

  const account = findAccount(identifier);
  if (!account) {
    return {
      ok: false,
      field: "identifier",
      message: "Không có tài khoản nào trong dữ liệu mẫu khớp thông tin này.",
    };
  }

  return { ok: true, session: { customerId: account.id, since: now.toISOString() } };
}

interface Stored {
  v: number;
  session: unknown;
}

export function serializeSession(session: Session): string {
  return JSON.stringify({ v: SCHEMA_VERSION, session } satisfies Stored);
}

/**
 * Read the session back. Never throws — this runs on the first paint of
 * every account page — and never returns a customer who has left the data,
 * because every screen behind it would then render someone who is not there.
 */
export function parseSession(raw: string | null): Session | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed.v !== SCHEMA_VERSION) return null;
  const s = parsed.session;
  if (!isRecord(s)) return null;
  if (typeof s.customerId !== "string" || typeof s.since !== "string") return null;
  if (!customerById.has(customerId(s.customerId))) return null;

  return { customerId: customerId(s.customerId), since: s.since };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
