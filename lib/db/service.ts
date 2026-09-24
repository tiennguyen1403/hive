import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * The service role, for the product-photo bucket, the daily reset, the rate
 * limits and the demo accounts' password, and NOTHING ELSE.
 *
 * Slice B3c needs one thing the publishable key cannot do: write objects into
 * the `product-photos` bucket. That bucket has row level security on
 * `storage.objects` with no policy at all, so the Storage API refuses every
 * upload, delete and listing except with a service key, which "entirely
 * bypass[es] RLS policies" (https://supabase.com/docs/guides/storage/security/access-control).
 *
 * So this client is used for `storage.from("product-photos")` `.upload`,
 * `.remove` and `.list` (`lib/db/photos.ts`), and never for a table: every
 * read and write of data still goes through `getSupabase()` with the
 * visitor's own session, where row level security and the `admin_*`
 * functions decide. A service client that also read tables would be a way
 * around both.
 *
 * One caller has no session to use: the daily cron of slice B4. `/api/reset`
 * — behind `CRON_SECRET`, answering 404 when it is unset — calls
 * `demo_anchor()` and `reset_demo()` with this client — both are granted to
 * `service_role` — and `reset_demo()` then logs the reset as the system
 * rather than as a manager. Still no table is read or written with it
 * directly.
 *
 * Slice B4b adds two more uses, both still through functions and APIs rather
 * than tables:
 *
 *   · the rate limits (`lib/db/rate-limit.ts`): `take_rate()` and
 *     `tidy_rate_hits()`, which only `service_role` may call — the counter
 *     table has row level security with no policy at all, so a visitor's own
 *     session cannot count, read or reset it. The key is also the HMAC key
 *     that turns a visitor's address into the counter's subject;
 *   · the nine shared demo accounts (`lib/db/demo-accounts.ts`): in the daily
 *     reset, the Auth admin API (`auth.admin.listUsers`,
 *     `auth.admin.updateUserById`) sets back to `DEMO_PASSWORD` any of them
 *     the demo password no longer opens.
 *
 * `import "server-only"` makes the key's reach enforceable: a Client
 * Component importing this module fails the build. The key is read from the
 * environment at call time and never logged; without it (or without the URL)
 * this returns null and the upload says "chưa lưu được" instead of throwing —
 * a deploy that forgot the variable keeps working for everything else.
 *
 * No session storage and no refresh loop, as in `scripts/seed-users.ts`: a
 * service client has no user, and one that tried to persist a session would
 * be writing a key somewhere.
 */
export function getServiceSupabase(): SupabaseClient<Database> | null {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;
  return createClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
