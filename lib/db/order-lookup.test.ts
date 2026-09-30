import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `lookupOrder` without a database (slice B11): one token of the visitor's
 * `lookup` limit per lookup, spent BEFORE the database is asked, and nothing
 * asked when the limit says no; the code and the number handed to
 * `lookup_order()` exactly as the app read them; the answer mapped, with the
 * status the clock says. What the function itself does is Postgres' and is
 * checked against Postgres in `order-lookup.dbtest.ts`.
 *
 * Replaced: `server-only` (a build-time marker Next resolves itself), the rate
 * limit (`./rate-limit`), the visitor's Supabase client (`./server`) and the
 * clock.
 */

vi.mock("server-only", () => ({}));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const calls: string[] = [];
const takeRate = vi.fn(async (bucket: string) => {
  calls.push(`takeRate:${bucket}`);
  return pace;
});
vi.mock("./rate-limit", () => ({ takeRate: (bucket: string) => takeRate(bucket) }));

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
let answer: { data: unknown; error: { message: string } | null } = { data: null, error: null };
const rpc = vi.fn<Rpc>(async (fn) => {
  calls.push(`rpc:${fn}`);
  return answer;
});
vi.mock("./server", () => ({ getSupabase: async () => ({ rpc }) }));

/** 20:00 on 21/09/2026 in Vietnam: DH-2430's hold (19:50) has run out, DH-2431's (22/09 08:05) has not. */
const NOW = new Date("2026-09-21T20:00:00+07:00");
vi.mock("@/lib/clock", () => ({ demoNow: () => NOW, demoNowMs: () => NOW.getTime() }));

const { lookupOrder } = await import("./order-lookup");

/** `lookup_order()`'s document for a found order. */
function found(status: Record<string, unknown>, code = "DH-2430") {
  return {
    outcome: "FOUND",
    order: {
      code,
      placedAt: "2026-09-19T19:50:00+07:00",
      status,
      moments: {},
      payment: "BANK_TRANSFER",
      lines: [{ productId: "p-suong", size: "M", color: "moss", qty: 1, unitPriceVnd: 1_450_000 }],
      shippingFeeVnd: 0,
      codFeeVnd: 0,
      discountVnd: 150_000,
      promo: "DOT05",
    },
  };
}

const INPUT = { code: "DH-2430", phone: "0912345678" };

beforeEach(() => {
  pace = { ok: true };
  answer = { data: { outcome: "NO_ORDER" }, error: null };
  calls.length = 0;
  takeRate.mockClear();
  rpc.mockClear();
});

describe("lookupOrder — one lookup, one token", () => {
  it("spends one token of `lookup`, then asks lookup_order() with the code and the number as read", async () => {
    await lookupOrder(INPUT);
    expect(calls).toEqual(["takeRate:lookup", "rpc:lookup_order"]);
    expect(rpc).toHaveBeenCalledWith("lookup_order", { p_code: "DH-2430", p_phone: "0912345678" });
  });

  it("spends one token per call — ten calls, ten tokens, never another bucket", async () => {
    for (let i = 0; i < 10; i += 1) await lookupOrder(INPUT);
    expect(takeRate).toHaveBeenCalledTimes(10);
    expect(takeRate.mock.calls.every(([bucket]) => bucket === "lookup")).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(10);
  });

  it("asks the database nothing when the limit says no, and says how long to wait", async () => {
    pace = { ok: false, retryAfterSeconds: 200, message: "Quá nhiều lượt liên tiếp. Thử lại sau 4 phút." };
    expect(await lookupOrder(INPUT)).toEqual({
      ok: false,
      reason: "RATE_LIMITED",
      message: "Quá nhiều lượt liên tiếp. Thử lại sau 4 phút.",
      retryAfterSeconds: 200,
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("lookupOrder — the answer", () => {
  it("passes the two misses on as they came", async () => {
    answer = { data: { outcome: "NO_ORDER" }, error: null };
    expect(await lookupOrder(INPUT)).toEqual({ ok: false, reason: "NO_ORDER" });
    answer = { data: { outcome: "PHONE_MISMATCH" }, error: null };
    expect(await lookupOrder(INPUT)).toEqual({ ok: false, reason: "PHONE_MISMATCH" });
  });

  it("reads a transfer past its hold as cancelled, as every screen does (effectiveStatus)", async () => {
    answer = { data: found({ state: "AWAITING_TRANSFER", dueAt: "2026-09-21T19:50:00+07:00" }), error: null };
    const got = await lookupOrder(INPUT);
    expect(got.ok && got.order.status).toEqual({
      state: "CANCELLED",
      cancelledAt: "2026-09-21T19:50:00+07:00",
      reason: "quá hạn chuyển khoản",
    });
  });

  it("keeps a transfer still inside its hold waiting", async () => {
    answer = { data: found({ state: "AWAITING_TRANSFER", dueAt: "2026-09-22T08:05:00+07:00" }, "DH-2431"), error: null };
    const got = await lookupOrder({ code: "DH-2431", phone: "0934567890" });
    expect(got.ok && got.order.status).toEqual({ state: "AWAITING_TRANSFER", dueAt: "2026-09-22T08:05:00+07:00" });
  });

  it("throws on a database error — the action turns it into a sentence — after the token was spent", async () => {
    answer = { data: null, error: { message: "connection refused" } };
    await expect(lookupOrder(INPUT)).rejects.toThrow("lookup_order failed: connection refused");
    expect(takeRate).toHaveBeenCalledTimes(1);
  });

  it("throws on a document it cannot read, naming the field", async () => {
    answer = { data: { outcome: "FOUND", order: { code: "DH-2430" } }, error: null };
    await expect(lookupOrder(INPUT)).rejects.toThrow("lookup DH-2430.lines must be an array");
  });
});
