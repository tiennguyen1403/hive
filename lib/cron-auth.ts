import { timingSafeEqual } from "node:crypto";

/**
 * Is this request the cron job?
 *
 * When Vercel invokes a cron job it sends the project's `CRON_SECRET` as
 * `Authorization: Bearer <CRON_SECRET>`, and "your endpoint can then compare
 * both values" (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 * Two routes ask — `/api/health` and `/api/reset` (slice B4) — and they treat
 * an unconfigured secret differently, so this names which of three cases it
 * is and leaves the answer to each route:
 *
 *   · `"no-secret"` — the variable is unset or empty: no cron is configured
 *     in this environment. Health stays callable; reset answers 404.
 *   · `"ok"` — the header is exactly `Bearer <secret>`.
 *   · `"unauthorized"` — anything else: no header, another scheme, `bearer`
 *     in lower case, the secret on its own, a prefix of it, more than it.
 *
 * The whole header is compared, scheme included, as bytes and in constant
 * time (`crypto.timingSafeEqual`), so how long a wrong guess takes to refuse
 * does not say how much of it was right. That function THROWS when the two
 * lengths differ, hence the length check before it: a guess of another length
 * is refused outright, which tells a caller only the secret's length — and
 * Vercel's advice of at least sixteen random characters makes that worth
 * nothing. Node's own caveat applies ("does not guarantee that the
 * surrounding code is timing-safe"), and the surrounding code here is two
 * `Buffer.from` calls and a length comparison.
 *
 * Pure: no Next, no environment read. The route passes `process.env.CRON_SECRET`
 * in, so the test can pass anything.
 */
export type CronAuth = "no-secret" | "ok" | "unauthorized";

export function cronAuthorized(header: string | null, secret: string | undefined): CronAuth {
  if (!secret) return "no-secret";
  if (header === null) return "unauthorized";

  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const given = Buffer.from(header, "utf8");
  if (given.length !== expected.length) return "unauthorized";
  return timingSafeEqual(given, expected) ? "ok" : "unauthorized";
}
