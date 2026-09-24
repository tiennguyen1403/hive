import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `takeRate` and `tidyRateHits` without a database (slice B4b): what they send
 * to `take_rate()`, what they make of its answer, and above all that they FAIL
 * OPEN — no service key, an RPC error, a thrown fetch all let the request
 * through and say why in the server log (brief B4b §2.3). The counting itself
 * is Postgres' and is checked against Postgres in `rate-limit.dbtest.ts`.
 *
 * The three things the module reaches for are replaced: `server-only` (a
 * build-time marker Next resolves itself), `next/headers` (the request's
 * headers) and `./service` (the service-role client).
 */

vi.mock("server-only", () => ({}));

let requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
let rpc: ReturnType<typeof vi.fn<Rpc>> | null = null;
vi.mock("./service", () => ({ getServiceSupabase: () => (rpc ? { rpc } : null) }));

const KEY = "a-test-key-not-a-real-one";

/** A fresh copy of the module: its "logged once" flag starts over. */
async function load() {
  vi.resetModules();
  return import("./rate-limit");
}

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.SUPABASE_SECRET_KEY = KEY;
  requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
  rpc = vi.fn<Rpc>(async () => ({ data: 0, error: null }));
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
  delete process.env.SUPABASE_SECRET_KEY;
});

describe("takeRate", () => {
  it("asks take_rate() with the bucket's rule and the visitor's HMAC, and lets 0 through", async () => {
    const { takeRate } = await load();
    expect(await takeRate("order_units", 7)).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("take_rate", {
      p_bucket: "order_units",
      p_subject: createHmac("sha256", KEY).update("203.0.113.7").digest("hex").slice(0, 32),
      p_cost: 7,
      p_limit: 60,
      p_window_seconds: 86_400,
    });
    expect(logged).not.toHaveBeenCalled();
  });

  it("counts a bucket for everybody under `everyone`, whoever asks", async () => {
    const { takeRate } = await load();
    await takeRate("upload_global");
    expect(rpc!.mock.calls[0]![1]).toMatchObject({ p_bucket: "upload_global", p_subject: "everyone", p_cost: 1 });
  });

  it("turns a wait into a refusal with the sentence", async () => {
    rpc = vi.fn<Rpc>(async () => ({ data: 125, error: null }));
    const { takeRate } = await load();
    expect(await takeRate("sign_in")).toEqual({
      ok: false,
      retryAfterSeconds: 125,
      message: "Quá nhiều lượt liên tiếp. Thử lại sau 3 phút.",
    });
  });

  it("fails open without a service key, and says so once per process", async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    rpc = null;
    const { takeRate } = await load();
    expect(await takeRate("sign_in")).toEqual({ ok: true });
    expect(await takeRate("order_place")).toEqual({ ok: true });
    expect(logged).toHaveBeenCalledTimes(1);
    expect(String(logged.mock.calls[0]![0])).toContain("SUPABASE_SECRET_KEY");
  });

  it("fails open when the function answers an error — the migration not yet on the project", async () => {
    rpc = vi.fn<Rpc>(async () => ({
      data: null,
      error: { message: "Could not find the function public.take_rate" },
    }));
    const { takeRate } = await load();
    expect(await takeRate("sign_in")).toEqual({ ok: true });
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it("fails open when the call throws", async () => {
    rpc = vi.fn<Rpc>(async () => {
      throw new Error("fetch failed");
    });
    const { takeRate } = await load();
    expect(await takeRate("sign_in")).toEqual({ ok: true });
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it("counts two IPv6 addresses of one /64 as one visitor", async () => {
    const { takeRate } = await load();
    requestHeaders = new Headers({ "x-forwarded-for": "2001:db8:0:1::5" });
    await takeRate("sign_in");
    requestHeaders = new Headers({ "x-forwarded-for": "2001:DB8:0:1:abcd::9" });
    await takeRate("sign_in");
    const [first, second] = rpc!.mock.calls.map((c) => c[1]!.p_subject);
    expect(first).toBe(createHmac("sha256", KEY).update("2001:db8:0:1::/64").digest("hex").slice(0, 32));
    expect(second).toBe(first);
  });

  it("names a visitor with no header `local`", async () => {
    requestHeaders = new Headers();
    const { takeRate } = await load();
    await takeRate("sign_in");
    expect(rpc!.mock.calls[0]![1]).toMatchObject({
      p_subject: createHmac("sha256", KEY).update("local").digest("hex").slice(0, 32),
    });
  });
});

describe("takeRates", () => {
  it("spends the buckets in order and stops at the first refusal", async () => {
    rpc = vi.fn<Rpc>(async (_fn, args) => ({ data: args?.p_bucket === "reset" ? 300 : 0, error: null }));
    const { takeRates } = await load();
    const verdict = await takeRates("admin", "reset", "upload");
    expect(verdict).toMatchObject({ ok: false, retryAfterSeconds: 300 });
    expect(rpc!.mock.calls.map((c) => c[1]!.p_bucket)).toEqual(["admin", "reset"]);
  });
});

describe("tidyRateHits", () => {
  it("passes the buckets to clear and answers the count", async () => {
    rpc = vi.fn<Rpc>(async () => ({ data: 4, error: null }));
    const { tidyRateHits } = await load();
    expect(await tidyRateHits(["upload_global"])).toBe(4);
    expect(rpc).toHaveBeenCalledWith("tidy_rate_hits", { p_clear: ["upload_global"] });
  });

  it("answers null, never throws, when it cannot be asked", async () => {
    rpc = vi.fn<Rpc>(async () => ({ data: null, error: { message: "permission denied" } }));
    const { tidyRateHits } = await load();
    expect(await tidyRateHits()).toBeNull();
    rpc = null;
    expect(await (await load()).tidyRateHits()).toBeNull();
  });
});
