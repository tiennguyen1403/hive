import "server-only";

import { CUSTOMERS } from "@/data/customers";
import { DEMO_ADMIN } from "./demo-admin";

/** What "Tài khoản thử" prints above a sign-in form: the demo's shopper and back office, and their password. */
export interface DemoAccounts {
  email: string;
  adminEmail: string;
  password: string;
}

/**
 * The published demo accounts, or nothing — for every sign-in form that
 * shows them: `/sign-in`, and since round v4 slice 3b Tôi's own form from
 * 900px (`/account`, signed out).
 *
 * `DEMO_PASSWORD` lives in the environment, and only the server may touch
 * `process.env` (QĐ-25). It is a PUBLIC password — the page prints it,
 * because a demo whose account nobody can open is a demo nobody can look at —
 * but a password written into a committed file is a habit, so it comes from
 * the environment even here. Unset means no box: a shortcut that cannot do
 * what it says is not drawn. Slice B3a added the back office's account beside
 * the shopper's, on the same password (`lib/demo-admin.ts`).
 */
export function demoAccounts(): DemoAccounts | null {
  const password = process.env.DEMO_PASSWORD;
  return password ? { email: CUSTOMERS[0]!.email, adminEmail: DEMO_ADMIN.email, password } : null;
}
