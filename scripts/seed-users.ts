/**
 * Creates the eight demo shoppers and the one demo manager in Supabase Auth,
 * then puts the sample shop back — anchored on the real clock.
 *
 * `supabase db reset` cannot do this itself: `auth.users` is Supabase's own
 * table and a row in it needs a hashed password and an identity, which is what
 * the admin API is for. So the order on a developer machine is
 *
 *     npx supabase db reset      # schema + seed_* mirrors + reset_demo()
 *     npm run seed:users         # the nine accounts, then reset_demo() again
 *
 * and this script is idempotent: an email that already has an account is not
 * re-created, so running it twice is safe and prints "0 created, 9 already
 * there" the second time.
 *
 * AN ACCOUNT THAT IS ALREADY THERE GETS ITS PASSWORD BACK (slice B4b). The
 * nine share `DEMO_PASSWORD`, which the sign-in screen prints; the app refuses
 * to change it (`changePassword`, `lib/demo-accounts.ts`) and the daily reset
 * sets back any the demo password no longer opens (`/api/reset`). This is the
 * owner's own repair for the same thing, and it does not ask first: run it
 * against a project whose demo login broke, and all nine are set and open
 * again — signing out whoever was using them. It prints how many it set.
 *
 * THE MANAGER (slice B3a) is `lib/demo-admin.ts`: an ordinary user whose
 * `app_metadata.role` is "admin". `app_metadata` is writable only with the
 * service role and travels in every access token, which is what
 * `public.is_admin()` reads — "raw_app_meta_data … cannot be updated by the
 * user, so it's a good place to store authorization data"
 * (https://supabase.com/docs/guides/database/postgres/row-level-security).
 * When the account already exists its role is written again, in the same
 * `auth.admin.updateUserById` as its password, so a run always leaves the
 * manager a manager, whatever happened to the account in between.
 *
 * It holds the SERVICE ROLE key, which bypasses row level security — so it
 * runs under `tsx` on a developer machine or in CI, never inside the app.
 * Nothing here prints a key. The demo password IS printed on the sign-in
 * screen, on purpose (this is a public portfolio demo), but the value still
 * comes from the environment rather than from a committed file.
 */

import { createClient } from "@supabase/supabase-js";
import { CUSTOMERS } from "@/data/customers";
import type { Database } from "@/lib/db/database.types";
import { normalisePhone } from "@/lib/checkout-form";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { requireEnvLocal } from "./env-local";

const env = requireEnvLocal(["SUPABASE_URL", "SUPABASE_SECRET_KEY", "DEMO_PASSWORD"] as const);

/**
 * No session storage and no refresh loop: this process makes a handful of
 * admin calls and exits, and a service-role client that tried to persist a
 * session would be writing a key to disk.
 */
const admin = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * "This email already has an account" is the expected answer on a second run,
 * not a failure. GoTrue answers it with `email_exists`; the message is checked
 * as well because the code has been added to the API more recently than some
 * of the versions this may run against.
 */
function isAlreadyThere(error: { code?: string; message: string }): boolean {
  return (
    error.code === "email_exists" ||
    /already (been )?registered|already exists/i.test(error.message)
  );
}

/**
 * The accounts behind these emails, walking the admin API's pages once — a
 * public demo collects sign-ups, and a demo account is not guaranteed to be
 * on page one. Keyed by the lower-cased email, which is how Auth stores it.
 */
async function idsByEmail(emails: readonly string[]): Promise<Map<string, string>> {
  const wanted = new Set(emails.map((e) => e.toLowerCase()));
  const found = new Map<string, string>();
  const perPage = 1000;
  for (let page = 1; found.size < wanted.size; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    for (const u of data.users) {
      const email = u.email?.toLowerCase();
      if (email && wanted.has(email)) found.set(email, u.id);
    }
    if (data.users.length < perPage) break;
  }
  return found;
}

async function main(): Promise<void> {
  let created = 0;
  let skipped = 0;
  /** Accounts that were already there: their password goes back to the demo one. */
  const existing: string[] = [];

  for (const customer of CUSTOMERS) {
    const { error } = await admin.auth.admin.createUser({
      email: customer.email,
      password: env.DEMO_PASSWORD,
      // No confirmation mail can be delivered from this project (the default
      // SMTP sends two an hour, to the team only), so the demo accounts are
      // confirmed as they are made. `[auth.email] enable_confirmations` is
      // false for the same reason.
      email_confirm: true,
      // Read by the `handle_new_user()` trigger, which is what actually
      // writes `public.profiles`. `handle` is the fixture id that ties this
      // account to its sample orders: `reset_demo()` matches them up by it.
      user_metadata: {
        handle: customer.id,
        name: customer.name,
        phone: normalisePhone(customer.phone),
      },
    });

    if (error) {
      if (!isAlreadyThere(error)) {
        throw new Error(`createUser failed for a demo account: ${error.message}`);
      }
      skipped += 1;
      existing.push(customer.email);
      continue;
    }
    created += 1;
  }

  // ── the manager
  const manager = await admin.auth.admin.createUser({
    email: DEMO_ADMIN.email,
    password: env.DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { handle: DEMO_ADMIN.handle, name: DEMO_ADMIN.name, phone: "" },
  });
  if (manager.error) {
    if (!isAlreadyThere(manager.error)) {
      throw new Error(`createUser failed for the demo manager: ${manager.error.message}`);
    }
    skipped += 1;
    existing.push(DEMO_ADMIN.email);
  } else {
    created += 1;
  }

  // ── the accounts that were already there: the demo password again, and
  // for the manager its role again, in one call each. Whatever somebody set
  // since, the sign-in screen's password opens all nine after this.
  let restored = 0;
  if (existing.length > 0) {
    const ids = await idsByEmail(existing);
    for (const email of existing) {
      const id = ids.get(email.toLowerCase());
      if (!id) throw new Error(`${email} already has an account, but it could not be found`);
      const isManager = email === DEMO_ADMIN.email;
      const { error } = await admin.auth.admin.updateUserById(
        id,
        isManager
          ? { password: env.DEMO_PASSWORD, app_metadata: { role: "admin" } }
          : { password: env.DEMO_PASSWORD },
      );
      if (error) throw new Error(`updateUserById failed for ${email}: ${error.message}`);
      restored += 1;
    }
  }

  // The trigger fills a profile from the metadata; this puts the rest of the
  // fixture on top of it — the real `joined_at`, the nine addresses, the
  // twenty-four sample orders given back to their owners and the log they
  // record — anchored on the most recent 18:50 in Vietnam (`demo_anchor()`),
  // the same anchor `supabase/seed.sql` uses.
  const anchor = await admin.rpc("demo_anchor");
  if (anchor.error) throw new Error(`demo_anchor failed: ${anchor.error.message}`);
  const { error } = await admin.rpc("reset_demo", { p_anchor: anchor.data });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);

  const total = CUSTOMERS.length + 1;
  process.stdout.write(
    `demo accounts: ${created} created, ${skipped} already there (of ${total})\n` +
      `passwords set back to DEMO_PASSWORD: ${restored}\n` +
      `${DEMO_ADMIN.email} carries app_metadata.role = admin\n` +
      "profiles, addresses, sample orders and their log reset to the latest 18:50 anchor\n",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
