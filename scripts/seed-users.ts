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
 * and this script is idempotent: an email that already has an account is
 * skipped, not re-created, so running it twice is safe and prints "0 created,
 * 9 already there" the second time.
 *
 * THE MANAGER (slice B3a) is `lib/demo-admin.ts`: an ordinary user whose
 * `app_metadata.role` is "admin". `app_metadata` is writable only with the
 * service role and travels in every access token, which is what
 * `public.is_admin()` reads — "raw_app_meta_data … cannot be updated by the
 * user, so it's a good place to store authorization data"
 * (https://supabase.com/docs/guides/database/postgres/row-level-security).
 * When the account already exists its role is written again
 * (`auth.admin.updateUserById`), so a run always leaves the manager a
 * manager, whatever happened to the account in between.
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
 * The account behind an email, walking the admin API's pages — a public demo
 * collects sign-ups, and the manager is not guaranteed to be on page one.
 */
async function userIdOf(email: string): Promise<string> {
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < perPage) break;
  }
  throw new Error("the demo manager's account exists but could not be found");
}

async function main(): Promise<void> {
  let created = 0;
  let skipped = 0;

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
    // Already there: make sure it is still a manager.
    const { error } = await admin.auth.admin.updateUserById(await userIdOf(DEMO_ADMIN.email), {
      app_metadata: { role: "admin" },
    });
    if (error) throw new Error(`updateUserById failed for the demo manager: ${error.message}`);
  } else {
    created += 1;
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
      `${DEMO_ADMIN.email} carries app_metadata.role = admin\n` +
      "profiles, addresses, sample orders and their log reset to the latest 18:50 anchor\n",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
