import "server-only";

import { headers } from "next/headers";
import {
  EVERYONE,
  RATE_RULES,
  clientIpOf,
  rateKeyOf,
  rateLimitMessage,
  subjectOf,
  type RateBucket,
} from "@/lib/rate-limit";
import { getServiceSupabase } from "./service";

/**
 * The rate limits of the public demo, from the server's side (slice B4b).
 *
 * The rules and the words are `lib/rate-limit.ts`; the count is
 * `public.take_rate()` in Postgres, which only the service role may call, so
 * this goes through `getServiceSupabase()`. Every Server Action that spends a
 * token calls `takeRate` BEFORE the work it guards — "trừ trước, không hoàn":
 * an order that then fails for stock, a password that turns out wrong, still
 * spent its token, while a refused call spends nothing.
 *
 * FAIL OPEN (brief B4b §2.3). A limit is a guard for the demo, not a part of
 * buying: when it cannot be asked — no service key in this environment, the
 * migration not yet on the hosted project, the network — the request goes
 * through and the reason goes to the server log. Without the key it logs
 * once per process rather than once per request.
 */

export type RateVerdict =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; message: string };

const THROUGH: RateVerdict = { ok: true };

/** Logged once per process: every request would say the same thing. */
let missingKeyLogged = false;

/**
 * Spend `cost` tokens of `bucket` for whoever is asking, or say how long to
 * wait. The visitor is `subjectOf(rateKeyOf(clientIpOf(x-forwarded-for)))` —
 * an HMAC, keyed with the service key, of the IPv4 address or the IPv6 /64,
 * never the address itself — or `everyone` for a bucket counted for all
 * visitors together.
 *
 * `p_now` is left to the database: the counter lives by Postgres' clock, and
 * nothing a request carries should choose which window it lands in.
 */
export async function takeRate(bucket: RateBucket, cost = 1): Promise<RateVerdict> {
  const key = process.env.SUPABASE_SECRET_KEY;
  const service = getServiceSupabase();
  if (!service || !key) {
    if (!missingKeyLogged) {
      missingKeyLogged = true;
      console.error("rate limit: SUPABASE_SECRET_KEY is not set — requests are not limited");
    }
    return THROUGH;
  }

  const rule = RATE_RULES[bucket];
  try {
    let subject = EVERYONE;
    if (rule.per === "visitor") {
      // `headers()` is async and read-only (`03-api-reference/04-functions/headers.md`);
      // `get` is called on it, not detached from it.
      const request = await headers();
      subject = subjectOf(rateKeyOf(clientIpOf((name) => request.get(name))), key);
    }

    const { data, error } = await service.rpc("take_rate", {
      p_bucket: bucket,
      p_subject: subject,
      p_cost: cost,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error(`take_rate(${bucket}):`, error.message);
      return THROUGH;
    }
    if (typeof data !== "number" || data <= 0) return THROUGH;
    return { ok: false, retryAfterSeconds: data, message: rateLimitMessage(bucket, data) };
  } catch (e) {
    console.error(`take_rate(${bucket}):`, e instanceof Error ? e.message : e);
    return THROUGH;
  }
}

/**
 * `takeRate` for several buckets, one token each, in order — the back office
 * spends `admin`, and then `admin_create` for a creation, `upload` and
 * `upload_global` for a photo, `reset` for the reset. The first refusal is the
 * answer; a token already spent on an earlier bucket stays spent.
 */
export async function takeRates(...buckets: RateBucket[]): Promise<RateVerdict> {
  for (const bucket of buckets) {
    const verdict = await takeRate(bucket);
    if (!verdict.ok) return verdict;
  }
  return THROUGH;
}

/**
 * Forget the windows that are long over, and every row of the buckets in
 * `clear` — `["upload_global"]` once the photo bucket has been emptied, since
 * that count describes photos that no longer exist. Answers how many rows
 * went, or null when it could not be asked (logged, never thrown: the reset
 * that calls it has already happened).
 */
export async function tidyRateHits(clear: RateBucket[] = []): Promise<number | null> {
  const service = getServiceSupabase();
  if (!service) {
    console.error("tidy_rate_hits: SUPABASE_SECRET_KEY is not set");
    return null;
  }
  try {
    const { data, error } = await service.rpc("tidy_rate_hits", { p_clear: clear });
    if (error) {
      console.error("tidy_rate_hits:", error.message);
      return null;
    }
    return typeof data === "number" ? data : null;
  } catch (e) {
    console.error("tidy_rate_hits:", e instanceof Error ? e.message : e);
    return null;
  }
}
