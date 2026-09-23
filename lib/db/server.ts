import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * The Supabase client, built fresh for every server render.
 *
 * QĐ-25: the browser never talks to Supabase. No browser client is created
 * anywhere in this project and neither variable carries the `NEXT_PUBLIC_…`
 * prefix, because such a name is by definition inlined into the client bundle
 * — reads happen in Server Components, writes in Server Actions, and the
 * storefront keeps its "no request leaves loopback" property. The Supabase
 * guides do prefix these two, because they assume a browser client exists;
 * ours deliberately does not, so the prefix is dropped.
 *
 * `import "server-only"` makes that enforceable rather than merely intended: a
 * Client Component importing this module fails the build instead of shipping a
 * connection to the browser.
 *
 * A client is never shared between requests. The session lives in cookies, so
 * a cached client would serve one visitor's session to the next
 * (`@supabase/ssr` says as much in `createServerClient`'s own doc comment).
 *
 * Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 * and the `createServerClient` reference in `@supabase/ssr@0.12.7`.
 */

/**
 * Read a required variable, or say which one is missing.
 *
 * The name goes into the message, the value never does — an error page and a
 * log line are both places a key must not appear.
 */
function required(name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY"): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it ` +
        "from `npx supabase status`.",
    );
  }
  return value;
}

export async function getSupabase(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    required("SUPABASE_URL"),
    required("SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // A Server Component renders after the headers are settled, so it
          // cannot write cookies; Next throws and the docs say to swallow it.
          // Nothing is lost while there is no session to refresh — and once
          // there is (slice B1), `proxy.ts` does the refreshing.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Intentionally ignored — see above.
          }
        },
      },
    },
  );
}
