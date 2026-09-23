/**
 * Creates the eight demo accounts in Supabase Auth, then puts their profiles
 * and address books back to the fixture.
 *
 * `supabase db reset` cannot do this itself: `auth.users` is Supabase's own
 * table and a row in it needs a hashed password and an identity, which is what
 * the admin API is for. So the order on a developer machine is
 *
 *     npx supabase db reset      # schema + seed_* mirrors + reset_demo()
 *     npm run seed:users         # the eight accounts, then reset_demo() again
 *
 * and this script is idempotent: an email that already has an account is
 * skipped, not re-created, so running it twice is safe and prints eight
 * "skipped" the second time.
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

  // The trigger fills a profile from the metadata; this puts the rest of the
  // fixture on top of it — the real `joined_at`, the nine addresses, and
  // (slice B2) the twenty-four sample orders, given back to their owners.
  const { error } = await admin.rpc("reset_demo");
  if (error) throw new Error(`reset_demo failed: ${error.message}`);

  process.stdout.write(
    `demo accounts: ${created} created, ${skipped} already there (of ${CUSTOMERS.length})\n` +
      "profiles, addresses and sample orders reset from the fixture\n",
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
