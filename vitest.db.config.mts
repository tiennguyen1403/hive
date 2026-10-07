import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * The tests that need a database.
 *
 * Kept out of `npm test` on purpose: the ordinary suite is pure logic over
 * fixtures and must stay runnable on a machine with no Docker, in a few
 * seconds, with nothing to start first. These need `npx supabase start` and a
 * `.env.local` pointing at it, so they get their own runner
 * (`npm run test:db`) and their own extension, `*.dbtest.ts`.
 *
 * Read here by hand rather than with Next's `loadEnvConfig`, for two reasons:
 * `@next/env` is only ever present as a transitive dependency of `next`, and it
 * deliberately skips `.env.local` when `NODE_ENV` is `test` — which is exactly
 * what vitest sets. Twelve lines of parser cost less than an undeclared package
 * plus a borrowed `NODE_ENV`.
 *
 * `scripts/env-local.ts` is the same parser for `tsx` scripts, and this file
 * deliberately does NOT import it: Vite warns that a config importing a `.ts`
 * module without an extension will stop loading under the native config loader
 * it plans to default to. A future Vite that broke `npm run test:db` would cost
 * more than fifteen duplicated lines.
 *
 * Only the four names the tests need cross into the worker; the rest of
 * `.env.local` is none of a test runner's business. A missing file leaves them
 * unset and each suite says which one by name, except `SUPABASE_URL`: without
 * one the runner does not start at all (`refuseUnlessLocal` below).
 */
function readEnvLocal(): Record<string, string> {
  const wanted = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    // The service role, for the half of `accounts.dbtest.ts` that has to
    // create and delete users — and, right beside it, for proving that the
    // publishable key cannot.
    "SUPABASE_SECRET_KEY",
    "DEMO_PASSWORD",
  ];
  const env: Record<string, string> = {};
  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return env; // no file: the test reports which variables are missing
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!wanted.includes(key)) continue;
    env[key] = trimmed.slice(eq + 1).trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
  }
  return env;
}

/**
 * THE LOCAL STACK ONLY (slice B17 review). These tests write to the database
 * they are pointed at: every file puts the sample back with `reset_demo()`, and
 * `lib/db/real-accounts.dbtest.ts` deletes every account without a handle, the
 * way the daily reset does (QĐ-45). Pointed at the hosted project, one run
 * would empty the public demo's orders and delete its visitors' accounts. So
 * the runner refuses to start (the config throws before a single file loads)
 * unless every SUPABASE_URL it can see is on 127.0.0.1 or localhost:
 *
 *   · the one in `.env.local`, which is the one the tests use: `test.env`
 *     below is written into each worker's `process.env` over whatever the
 *     worker inherited (vitest's `setupEnv`);
 *   · one set in the shell, which the tests fall back to when `.env.local` has
 *     none, and which says where the developer is pointed right now.
 *
 * A URL missing from both, or one that does not parse, is refused as well.
 * The message names the host and where it came from, never a key.
 */
const LOCAL_HOSTS: readonly string[] = ["127.0.0.1", "localhost"];

function refuseUnlessLocal(sources: ReadonlyArray<readonly [where: string, url: string | undefined]>): void {
  const stop = (why: string): never => {
    throw new Error(
      `npm run test:db refuses to run: ${why}. These tests reset the sample data and delete every ` +
        "account without a handle, so they only run against the local stack (127.0.0.1 or localhost).",
    );
  };
  const given = sources.filter(([, url]) => url !== undefined && url.trim() !== "");
  if (given.length === 0) stop("SUPABASE_URL is set neither in .env.local nor in the shell");
  for (const [where, url] of given) {
    let host = "";
    try {
      host = new URL(url!).hostname;
    } catch {
      stop(`SUPABASE_URL from ${where} is not a URL`);
    }
    if (!LOCAL_HOSTS.includes(host)) stop(`SUPABASE_URL from ${where} points at the host "${host}"`);
  }
}

const env = readEnvLocal();
refuseUnlessLocal([
  [".env.local", env.SUPABASE_URL],
  ["the shell environment", process.env.SUPABASE_URL],
]);

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    env,
    include: ["lib/db/**/*.dbtest.ts"],
    // Every db test file rebuilds the same local database through reset_demo(); run them one after another.
    fileParallelism: false,
  },
});
