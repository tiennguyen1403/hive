import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n";

/**
 * Round v6 slice E2: `lookupOrder` hands the action's language to the rate
 * limit, so a refused lookup is worded in it; Vietnamese when it is handed
 * none. The rest is `order-lookup.test.ts`'s, with the same replacements.
 */

vi.mock("server-only", () => ({}));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRate = vi.fn(async (_bucket: string, _cost?: number, _locale?: Locale): Promise<Pace> => pace);
vi.mock("./rate-limit", () => ({
  takeRate: (bucket: string, cost?: number, locale?: Locale) => takeRate(bucket, cost, locale),
}));

const rpc = vi.fn(async () => ({ data: { outcome: "NO_ORDER" }, error: null }));
vi.mock("./server", () => ({ getSupabase: async () => ({ rpc }) }));

const { lookupOrder } = await import("./order-lookup");

const INPUT = { code: "DH-2430", phone: "0912345678" };

beforeEach(() => {
  pace = { ok: true };
  takeRate.mockClear();
  rpc.mockClear();
});

describe("lookupOrder, asked in English", () => {
  it("spends its one token with the language it was handed", async () => {
    await lookupOrder(INPUT, "en");
    expect(takeRate).toHaveBeenCalledWith("lookup", 1, "en");
    await lookupOrder(INPUT);
    expect(takeRate).toHaveBeenLastCalledWith("lookup", 1, "vi");
  });

  it("passes the rate limit's English sentence on, and asks the database nothing", async () => {
    pace = { ok: false, retryAfterSeconds: 200, message: "Too many tries in a row. Try again in 4 minutes." };
    expect(await lookupOrder(INPUT, "en")).toEqual({
      ok: false,
      reason: "RATE_LIMITED",
      message: "Too many tries in a row. Try again in 4 minutes.",
      retryAfterSeconds: 200,
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
