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
 * Only the two names the tests need cross into the worker; the rest of
 * `.env.local` is none of a test runner's business. A missing file leaves them
 * unset and `catalog.dbtest.ts` says so by name.
 */
function readEnvLocal(): Record<string, string> {
  const wanted = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];
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

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    env: readEnvLocal(),
    include: ["lib/db/**/*.dbtest.ts"],
  },
});
