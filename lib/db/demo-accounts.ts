import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  DEMO_EMAILS,
  accountsToDelete,
  demoPasswordState,
  type DemoPasswordState,
} from "@/lib/demo-accounts";
import { supabaseEnv } from "./server";
import { getServiceSupabase } from "./service";

/**
 * Set back any of the nine shared demo accounts whose password no longer
 * opens it with `DEMO_PASSWORD` (slice B4b).
 *
 * Called by the daily reset (`/api/reset`) after `reset_demo()`. The app
 * already refuses to change these passwords (`changePassword`); this is the
 * second lock, for whatever got past the first.
 *
 * ONLY WHAT MOVED. Measured on the local stack (GoTrue v2.196.0 and v2.197.0,
 * 24/09/2026): an `auth.admin.updateUserById` with a password deletes every
 * session and refresh token of the account — the same password included. So
 * the nine are not simply set every evening, which would sign out everybody
 * using a demo account when the cron fires. Each one is first TRIED:
 *
 *   1. a throwaway client — the publishable key, no session storage, no
 *      refresh loop, like `passwordIsCurrent` in `lib/actions/auth.ts` —
 *      signs in with the email and `DEMO_PASSWORD`;
 *   2. it opened: the probe's own session is closed with
 *      `signOut({ scope: "local" })` — "Sign out only the current session",
 *      where the default `global` would sign the account out "of every device
 *      they are currently signed in on"
 *      (https://supabase.com/docs/reference/javascript/auth-signout). Measured
 *      locally: the account's `auth.sessions` rows go 3 → 4 → 3, and a visitor
 *      signed in beforehand stays signed in;
 *   3. Auth answered `invalid_credentials`: the password moved (or the account
 *      is gone), and only then is it set back with `updateUserById`;
 *   4. any other answer — too many requests, a timeout, the network — says
 *      nothing about the password: nothing is touched, it is logged, and the
 *      account does not count as checked (`demoPasswordState`).
 *
 * The probes go from this server, like every Auth call of the app, so they
 * spend nine of Supabase Auth's shared per-IP sign-in budget each day
 * (https://supabase.com/docs/guides/auth/rate-limits).
 *
 * WHY `auth.admin.listUsers` FOR THE IDS, and only when one is needed.
 * `profiles.email` would find them in one query, but it is a copy kept by a
 * trigger, and reading a table with the service key goes around row level
 * security — the one thing `lib/db/service.ts` says its client never does.
 * `listUsers` asks Auth itself, the API the password is then set through, and
 * is what `scripts/seed-users.ts` already walks.
 *
 * Answers `{ checked, restored }` — how many of the nine gave a clear answer
 * (normally 9) and how many were set back (normally 0) — or null when it
 * could not start: no service key, no publishable key or no demo password in
 * this environment. Never throws; the caller reports the numbers and never
 * fails the reset for them.
 */
export interface DemoPasswordCheck {
  checked: number;
  restored: number;
}

export async function restoreDemoPasswords(): Promise<DemoPasswordCheck | null> {
  const service = getServiceSupabase();
  const password = process.env.DEMO_PASSWORD;
  let env: { url: string; publishableKey: string } | null = null;
  try {
    env = supabaseEnv();
  } catch {
    env = null;
  }
  if (!service || !password || !env) {
    console.error(
      "restoreDemoPasswords: SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY or DEMO_PASSWORD is not set",
    );
    return null;
  }

  // ── 1–4: try each account with the demo password
  let checked = 0;
  const moved: string[] = [];
  for (const email of DEMO_EMAILS) {
    const probe = createClient(env.url, env.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let state: DemoPasswordState = "unknown";
    try {
      const { error } = await probe.auth.signInWithPassword({ email, password });
      state = demoPasswordState(error);
      if (state === "ok") {
        const closed = await probe.auth.signOut({ scope: "local" });
        if (closed.error) {
          console.error(`restoreDemoPasswords: ${email}: probe session left open:`, closed.error.message);
        }
      } else if (state === "unknown") {
        console.error(`restoreDemoPasswords: ${email}: not checked:`, error?.code ?? error?.message);
      }
    } catch (e) {
      console.error(`restoreDemoPasswords: ${email}: not checked:`, e instanceof Error ? e.message : e);
    }
    if (state === "unknown") continue;
    checked += 1;
    if (state === "restore") moved.push(email);
  }
  if (moved.length === 0) return { checked, restored: 0 };

  // ── the ids of the accounts to set back, walking the admin API's pages
  const wanted = new Set(moved.map((e) => e.toLowerCase()));
  const ids = new Map<string, string>();
  const perPage = 1000;
  try {
    for (let page = 1; ids.size < wanted.size; page += 1) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("restoreDemoPasswords: listUsers failed:", error.message);
        return { checked, restored: 0 };
      }
      for (const user of data.users) {
        const email = user.email?.toLowerCase();
        if (email && wanted.has(email)) ids.set(email, user.id);
      }
      if (data.users.length < perPage) break;
    }
  } catch (e) {
    console.error("restoreDemoPasswords: listUsers failed:", e instanceof Error ? e.message : e);
    return { checked, restored: 0 };
  }

  // ── set them back
  let restored = 0;
  for (const email of moved) {
    const id = ids.get(email.toLowerCase());
    if (!id) {
      console.error(`restoreDemoPasswords: ${email} has no account — run npm run seed:users`);
      continue;
    }
    try {
      const { error } = await service.auth.admin.updateUserById(id, { password });
      if (error) {
        console.error(`restoreDemoPasswords: ${email}:`, error.message);
        continue;
      }
      restored += 1;
    } catch (e) {
      console.error(`restoreDemoPasswords: ${email}:`, e instanceof Error ? e.message : e);
    }
  }
  return { checked, restored };
}

/**
 * Delete every account that is not part of the sample (slice B17, QĐ-45).
 *
 * Called by the daily reset (`/api/reset`) after `reset_demo()`, never by the
 * back office's "Đặt lại dữ liệu mẫu": that button is open to every visitor of
 * the public demo, and one visitor must not be able to delete another's
 * account in the middle of their visit.
 *
 *   1. `public.real_accounts()` — granted to the service role only — names
 *      every auth user whose profile has no handle
 *      (`supabase/migrations/20261007010000_real_accounts.sql`);
 *   2. `accountsToDelete` drops any whose e-mail is one of the nine shared demo
 *      accounts (`lib/demo-accounts.ts`), so those are never deleted whatever
 *      became of their handle;
 *   3. each is deleted with `auth.admin.deleteUser(id)` — a hard delete, the
 *      default: it "removes the row from `auth.users`, which cascades to
 *      `auth.sessions` and invalidates the user's refresh tokens"
 *      (https://supabase.com/docs/guides/auth/managing-user-data, "Deleting
 *      users"; https://supabase.com/docs/reference/javascript/auth-admin-deleteuser),
 *      and the profile with everything hanging off it goes by `on delete
 *      cascade`. An access token already handed out stays valid until it
 *      expires — the same page says so — but nothing is left for it to read.
 *
 * One that fails is logged — by its id, never its e-mail — and the rest are
 * still deleted. Supabase refuses to delete "an Auth user that owns any
 * Storage objects"; none does here, every upload goes through the service
 * client, but that refusal would be logged and skipped like any other.
 *
 * Answers `{ deleted, failed }`, or null when it could not start: no service
 * key, or the list could not be read. Never throws; the caller reports the
 * count and never fails the reset for it.
 */
export interface RealAccountSweep {
  deleted: number;
  failed: number;
}

export async function deleteRealAccounts(): Promise<RealAccountSweep | null> {
  const service = getServiceSupabase();
  if (!service) {
    console.error("deleteRealAccounts: SUPABASE_URL or SUPABASE_SECRET_KEY is not set");
    return null;
  }

  let rows: { id: string; email: string }[];
  try {
    const { data, error } = await service.rpc("real_accounts");
    if (error) {
      console.error("real_accounts:", error.message);
      return null;
    }
    rows = data ?? [];
  } catch (e) {
    console.error("real_accounts:", e instanceof Error ? e.message : e);
    return null;
  }

  let deleted = 0;
  let failed = 0;
  for (const account of accountsToDelete(rows)) {
    try {
      const { error } = await service.auth.admin.deleteUser(account.id);
      if (error) {
        console.error(`deleteRealAccounts: ${account.id}:`, error.message);
        failed += 1;
        continue;
      }
      deleted += 1;
    } catch (e) {
      console.error(`deleteRealAccounts: ${account.id}:`, e instanceof Error ? e.message : e);
      failed += 1;
    }
  }
  return { deleted, failed };
}
