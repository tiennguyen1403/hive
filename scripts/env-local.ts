import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * `.env.local`, read by hand.
 *
 * Next loads this file for `next dev`, `next build` and `next start`, but the
 * two other things in this repo that need it — the seeding script under `tsx`
 * and the database tests under vitest — run outside Next. Neither can borrow
 * Next's loader: `@next/env` is only ever present as a transitive dependency
 * of `next`, and it deliberately SKIPS `.env.local` when `NODE_ENV` is `test`,
 * which is exactly what vitest sets. Twelve lines of parser cost less than an
 * undeclared package plus a borrowed `NODE_ENV`.
 *
 * Only the names the caller asks for are returned. A key is a thing to hand
 * over deliberately, never something a process picks up by being in the room.
 *
 * The file is git-ignored and its values never leave the machine: they are not
 * printed, not logged, and not written into anything committed.
 */
export function readEnvLocal(wanted: readonly string[]): Record<string, string> {
  const env: Record<string, string> = {};

  let text: string;
  try {
    text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return env; // no file: the caller reports which variables are missing
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!wanted.includes(key)) continue;
    env[key] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^(['"])([\s\S]*)\1$/, "$2");
  }

  return env;
}

/**
 * The same read, but refusing to continue when something is missing.
 *
 * The message names the variable and never its value — an error page and a
 * terminal are both places a key must not appear.
 */
export function requireEnvLocal<K extends string>(wanted: readonly K[]): Record<K, string> {
  const found = readEnvLocal(wanted);
  const missing = wanted.filter((name) => !found[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(", ")} in .env.local. Copy .env.example and fill it from ` +
        "`npx supabase status -o env`.",
    );
  }
  return found as Record<K, string>;
}
