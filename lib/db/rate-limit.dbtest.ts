import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { RATE_BUCKETS, RATE_RULES, type RateBucket } from "@/lib/rate-limit";
import type { Database } from "./database.types";

/**
 * What slice B4b claims about the rate-limit counter, checked against
 * Postgres (`supabase/migrations/20260924150000_rate_limits.sql`):
 *
 *   (a) tokens go through up to the limit, then the answer is "wait";
 *   (b) a refusal spends nothing — and a cost above the whole limit is
 *       refused without a row;
 *   (c) the next window starts from zero, and the wait is the seconds left
 *       of the current one, rounded up;
 *   (d) two callers racing for the last token: exactly one gets it;
 *   (e) `tidy_rate_hits()` forgets exactly the windows over two days old and
 *       the buckets it is told to;
 *   (f) the eleven buckets of `lib/rate-limit.ts` are the eleven the table
 *       and the function accept, and bad arguments are `BAD_INPUT`;
 *   (g) nobody holding the publishable key — signed in or not — calls either
 *       function or reads, writes the table.
 *
 * Every instant is passed in (`p_now`), so a window can be crossed without
 * waiting and a race cannot straddle a window boundary. Every visitor here
 * is a fresh random subject (`t-…`), so no test sees another's rows — or the
 * app's, if a preview is running on the same database — and the file removes
 * its own rows when it ends.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`) for the signed-in half of (g).
 */

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const demoPassword = process.env.DEMO_PASSWORD;
if (!url || !publishableKey || !secretKey || !demoPassword) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY and DEMO_PASSWORD must be " +
      "in .env.local — see .env.example.",
  );
}

type Client = SupabaseClient<Database>;

/** A service-role client with its own connection — one per racer in (d). */
function serviceClient(): Client {
  return createClient<Database>(url!, secretKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const service = serviceClient();

/** What a visitor gets: the publishable key, no session. */
const anon = createClient<Database>(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Every subject this file made, for the clean-up. */
const made: string[] = [];

/** A visitor nobody else has used: `t-` and 16 hex characters. */
function subject(): string {
  const s = `t-${randomBytes(8).toString("hex")}`;
  made.push(s);
  return s;
}

/**
 * 10:04:10 in Vietnam on 24/09/2026 is 03:04:10 UTC. Ten-minute windows are
 * aligned on the epoch, and 600 divides a day, so this falls in the window
 * 03:00:00–03:10:00 UTC with 350 seconds of it left.
 */
const T = "2026-09-24T10:04:10+07:00";

interface Take {
  bucket?: RateBucket;
  cost?: number;
  limit?: number;
  windowSeconds?: number;
  now?: string;
  client?: Client;
}

/** One call of `take_rate()`: the number it answered, or the error. */
async function take(subj: string, o: Take = {}) {
  return (o.client ?? service).rpc("take_rate", {
    p_bucket: o.bucket ?? "sign_in",
    p_subject: subj,
    p_cost: o.cost ?? 1,
    p_limit: o.limit ?? 3,
    p_window_seconds: o.windowSeconds ?? 600,
    p_now: o.now ?? T,
  });
}

/** The answer, when there must be one. */
async function answer(subj: string, o: Take = {}): Promise<number> {
  const { data, error } = await take(subj, o);
  if (error) throw new Error(`take_rate refused the call: ${error.message}`);
  return data;
}

/** Every row of one visitor, oldest window first. */
async function rowsOf(subj: string) {
  const { data, error } = await service
    .from("rate_hits")
    .select("bucket, window_start, hits")
    .eq("subject", subj)
    .order("window_start");
  if (error) throw new Error(error.message);
  return data;
}

/** A row written directly, for (e). */
async function put(bucket: RateBucket, subj: string, windowStart: string, hits: number) {
  const { error } = await service
    .from("rate_hits")
    .insert({ bucket, subject: subj, window_start: windowStart, hits });
  if (error) throw new Error(error.message);
}

afterAll(async () => {
  if (made.length > 0) await service.from("rate_hits").delete().in("subject", made);
});

// ─────────────────────────────────────────────── (a) up to the limit
describe("(a) take_rate() lets tokens through up to the limit, then refuses", () => {
  it("answers 0 three times for a limit of 3, then the wait — and counts 3", async () => {
    const s = subject();
    expect(await answer(s)).toBe(0);
    expect(await answer(s)).toBe(0);
    expect(await answer(s)).toBe(0);
    expect(await answer(s)).toBeGreaterThan(0);

    const rows = await rowsOf(s);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.hits).toBe(3);
    expect(Date.parse(rows[0]!.window_start)).toBe(Date.parse("2026-09-24T03:00:00Z"));
  });

  it("spends a cost in one go: 2 + 1 fit in 3, and 2 more do not", async () => {
    const s = subject();
    expect(await answer(s, { cost: 2 })).toBe(0);
    expect(await answer(s, { cost: 1 })).toBe(0);
    expect(await answer(s, { cost: 2 })).toBeGreaterThan(0);
    expect((await rowsOf(s))[0]!.hits).toBe(3);
  });

  it("keeps buckets and visitors apart", async () => {
    const a = subject();
    const b = subject();
    for (let i = 0; i < 3; i += 1) expect(await answer(a)).toBe(0);
    expect(await answer(a)).toBeGreaterThan(0);
    // Another visitor, same bucket: untouched.
    expect(await answer(b)).toBe(0);
    // The same visitor, another bucket: untouched.
    expect(await answer(a, { bucket: "sign_up" })).toBe(0);
  });
});

// ────────────────────────────────────────────── (b) refusals are free
describe("(b) a refusal spends nothing", () => {
  it("leaves the count where it was, however often it is refused", async () => {
    const s = subject();
    expect(await answer(s, { cost: 2 })).toBe(0);
    for (let i = 0; i < 5; i += 1) expect(await answer(s, { cost: 2 })).toBeGreaterThan(0);
    expect((await rowsOf(s))[0]!.hits).toBe(2);
    // …so the one token that is left is still there.
    expect(await answer(s, { cost: 1 })).toBe(0);
    expect((await rowsOf(s))[0]!.hits).toBe(3);
  });

  it("refuses a cost above the whole limit, and writes no row at all", async () => {
    const s = subject();
    expect(await answer(s, { cost: 4, limit: 3 })).toBe(350);
    expect(await rowsOf(s)).toEqual([]);
    // A cost of exactly the limit fits an empty window.
    expect(await answer(s, { cost: 3, limit: 3 })).toBe(0);
  });
});

// ─────────────────────────────────────── (c) windows and the wait
describe("(c) the window: when the count starts again, and how long until then", () => {
  it("starts again from zero in the next window, in a row of its own", async () => {
    const s = subject();
    for (let i = 0; i < 3; i += 1) expect(await answer(s)).toBe(0);
    expect(await answer(s)).toBeGreaterThan(0);
    // 03:10:00 UTC is the first instant of the next window.
    expect(await answer(s, { now: "2026-09-24T03:10:00Z" })).toBe(0);
    // One second earlier is still the old one.
    expect(await answer(s, { now: "2026-09-24T03:09:59Z" })).toBeGreaterThan(0);

    const rows = await rowsOf(s);
    expect(rows.map((r) => r.hits)).toEqual([3, 1]);
    expect(rows.map((r) => Date.parse(r.window_start))).toEqual([
      Date.parse("2026-09-24T03:00:00Z"),
      Date.parse("2026-09-24T03:10:00Z"),
    ]);
  });

  it("answers the seconds left of the window, rounded up, never 0", async () => {
    const s = subject();
    for (let i = 0; i < 3; i += 1) await answer(s);
    expect(await answer(s)).toBe(350); // 03:04:10 → 03:10:00
    expect(await answer(s, { now: "2026-09-24T03:04:10.5Z" })).toBe(350); // 349.5 s, up
    expect(await answer(s, { now: "2026-09-24T03:09:59.9Z" })).toBe(1); // 0.1 s, up
    expect(await answer(s, { now: "2026-09-24T03:00:00Z" })).toBe(600); // the very start
  });

  it("aligns a day's window on midnight UTC — 07:00 in Vietnam", async () => {
    const s = subject();
    const day = { bucket: "order_units" as const, limit: 60, windowSeconds: 86_400 };
    expect(await answer(s, { ...day, cost: 60, now: "2026-09-24T06:00:00Z" })).toBe(0);
    // 18 hours to 2026-09-25T00:00:00Z.
    expect(await answer(s, { ...day, cost: 1, now: "2026-09-24T06:00:00Z" })).toBe(18 * 3600);
    expect(await answer(s, { ...day, cost: 1, now: "2026-09-25T00:00:00Z" })).toBe(0);
  });
});

// ─────────────────────────────────────────────── (d) the last token
describe("(d) callers racing for the last token", () => {
  it("lets exactly one of two through, five times over", async () => {
    for (let round = 0; round < 5; round += 1) {
      const s = subject();
      expect(await answer(s, { cost: 2 })).toBe(0); // one token left of three

      // Two clients, two connections, two transactions at once.
      const [a, b] = await Promise.all([
        take(s, { client: serviceClient() }),
        take(s, { client: serviceClient() }),
      ]);
      expect(a.error, `round ${round}`).toBeNull();
      expect(b.error, `round ${round}`).toBeNull();
      const answers = [a.data, b.data];
      expect(answers.filter((n) => n === 0), `round ${round}`).toHaveLength(1);
      expect(answers.filter((n) => (n ?? 0) > 0), `round ${round}`).toHaveLength(1);
      expect((await rowsOf(s))[0]!.hits, `round ${round}`).toBe(3);
    }
  });

  it("lets exactly five of twelve through a limit of five, into an empty window", async () => {
    const s = subject();
    const results = await Promise.all(
      Array.from({ length: 12 }, () => take(s, { limit: 5, client: serviceClient() })),
    );
    expect(results.every((r) => r.error === null)).toBe(true);
    expect(results.filter((r) => r.data === 0)).toHaveLength(5);
    expect(results.filter((r) => (r.data ?? 0) > 0)).toHaveLength(7);
    expect((await rowsOf(s))[0]!.hits).toBe(5);
  });
});

// ──────────────────────────────────────────────────────── (e) tidying up
describe("(e) tidy_rate_hits()", () => {
  // Far in the past, so that no row the app itself wrote is old enough to be
  // swept by the two-day rule: only the rows planted here are.
  const NOW = "2020-01-10T00:00:00Z";

  it("forgets the windows that started more than two days ago, and no others", async () => {
    const s = subject();
    await put("sign_in", s, "2020-01-01T00:00:00Z", 3); // nine days old: goes
    await put("sign_in", s, "2020-01-07T23:59:59Z", 3); // two days and a second: goes
    await put("sign_in", s, "2020-01-08T00:00:00Z", 3); // exactly two days: stays
    await put("upload_global", s, "2020-01-09T12:00:00Z", 2); // hours old: stays

    const { data, error } = await service.rpc("tidy_rate_hits", { p_now: NOW });
    expect(error).toBeNull();
    expect(data).toBe(2);

    const left = await rowsOf(s);
    expect(left.map((r) => [r.bucket, Date.parse(r.window_start)])).toEqual([
      ["sign_in", Date.parse("2020-01-08T00:00:00Z")],
      ["upload_global", Date.parse("2020-01-09T12:00:00Z")],
    ]);
  });

  it("forgets every row of a bucket it is told to clear, whatever the window", async () => {
    const s = subject();
    await put("upload_global", s, "2020-01-09T12:00:00Z", 2);
    await put("upload_global", s, "2020-01-08T00:00:00Z", 1);
    await put("upload", s, "2020-01-09T12:00:00Z", 4);

    // The rows the call is about to remove, counted first, so the answer can
    // be checked exactly even if a running app has photo rows of its own.
    const before = await service
      .from("rate_hits")
      .select("subject", { count: "exact", head: true })
      .eq("bucket", "upload_global");
    expect(before.error).toBeNull();

    const { data, error } = await service.rpc("tidy_rate_hits", {
      p_now: NOW,
      p_clear: ["upload_global"],
    });
    expect(error).toBeNull();
    expect(data).toBe(before.count);

    const left = await rowsOf(s);
    expect(left.map((r) => r.bucket)).toEqual(["upload"]);
  });

  it("takes an unknown name in the list as a bucket with no rows", async () => {
    const s = subject();
    await put("sign_in", s, "2020-01-09T12:00:00Z", 1);
    const { data, error } = await service.rpc("tidy_rate_hits", { p_now: NOW, p_clear: ["nope"] });
    expect(error).toBeNull();
    expect(data).toBe(0);
    expect(await rowsOf(s)).toHaveLength(1);
  });
});

// ───────────────────────────────────────── (f) the buckets, the arguments
describe("(f) the eleven buckets, and arguments that are not", () => {
  it("accepts every bucket of lib/rate-limit.ts with its own rule", async () => {
    const s = subject();
    for (const bucket of RATE_BUCKETS) {
      const rule = RATE_RULES[bucket];
      const { data, error } = await take(s, {
        bucket,
        limit: rule.limit,
        windowSeconds: rule.windowSeconds,
      });
      expect(error, bucket).toBeNull();
      expect(data, bucket).toBe(0);
    }
    expect((await rowsOf(s)).map((r) => r.bucket).sort()).toEqual([...RATE_BUCKETS].sort());
  });

  it("refuses what the app could never have sent: BAD_INPUT, and no row", async () => {
    const s = subject();
    const cases: Array<[string, Record<string, unknown>]> = [
      ["unknown bucket", { p_bucket: "nope" }],
      ["cost 0", { p_cost: 0 }],
      ["negative cost", { p_cost: -1 }],
      ["limit 0", { p_limit: 0 }],
      ["window 0", { p_window_seconds: 0 }],
      ["window over a day", { p_window_seconds: 86_401 }],
      ["empty subject", { p_subject: "" }],
      ["subject over 64", { p_subject: "x".repeat(65) }],
      ["no instant", { p_now: null }],
    ];
    for (const [name, over] of cases) {
      const { error } = await service.rpc("take_rate", {
        p_bucket: "sign_in",
        p_subject: s,
        p_cost: 1,
        p_limit: 3,
        p_window_seconds: 600,
        p_now: T,
        ...over,
      } as never);
      expect(error?.message, name).toBe("BAD_INPUT");
      expect(error?.code, name).toBe("P0001");
    }
    expect(await rowsOf(s)).toEqual([]);

    const tidy = await service.rpc("tidy_rate_hits", { p_now: null } as never);
    expect(tidy.error?.message).toBe("BAD_INPUT");
  });
});

// ───────────────────────────────────────────────────── (g) who may
describe("(g) only the service role", () => {
  let shopper: Client;

  beforeAll(async () => {
    shopper = createClient<Database>(url!, publishableKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await shopper.auth.signInWithPassword({
      email: CUSTOMERS[0]!.email,
      password: demoPassword!,
    });
    if (error) throw new Error(`could not sign in as a demo account: ${error.message}`);
  });

  for (const [who, client] of [
    ["a visitor with no session", () => anon],
    ["a signed-in shopper", () => shopper],
  ] as const) {
    it(`${who} cannot call take_rate() or tidy_rate_hits()`, async () => {
      const s = subject();
      const took = await take(s, { client: client() });
      expect(took.error, "take_rate answered").not.toBeNull();
      expect(took.data).toBeNull();
      const tidy = await client().rpc("tidy_rate_hits", { p_now: T, p_clear: ["upload_global"] });
      expect(tidy.error, "tidy_rate_hits answered").not.toBeNull();
      expect(await rowsOf(s)).toEqual([]);
    });

    it(`${who} can neither read nor write the table`, async () => {
      const s = subject();
      await put("sign_in", s, "2026-09-24T03:00:00Z", 1);

      const read = await client().from("rate_hits").select("subject");
      expect(read.error, "rate_hits was readable").not.toBeNull();

      const insert = await client()
        .from("rate_hits")
        .insert({ bucket: "sign_in", subject: s, window_start: "2026-09-24T04:00:00Z", hits: 0 });
      expect(insert.error, "rate_hits took an insert").not.toBeNull();

      await client().from("rate_hits").update({ hits: 0 }).eq("subject", s);
      await client().from("rate_hits").delete().eq("subject", s);
      // Whatever those two answered, the row is as it was.
      const rows = await rowsOf(s);
      expect(rows.map((r) => r.hits)).toEqual([1]);
    });
  }
});
