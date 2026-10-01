import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Round v6 slice E2: `takeRate` writes its refusal in the language the action
 * hands it (`getActionLocale`), Vietnamese when it is handed none. The rest of
 * what it does is `rate-limit.test.ts`'s, with the same three replacements:
 * `server-only`, `next/headers` and `./service`.
 */

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }));

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
let rpc = vi.fn<Rpc>(async () => ({ data: 0, error: null }));
vi.mock("./service", () => ({ getServiceSupabase: () => ({ rpc }) }));

const { takeRate } = await import("./rate-limit");

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.SUPABASE_SECRET_KEY = "a-test-key-not-a-real-one";
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
  delete process.env.SUPABASE_SECRET_KEY;
});

describe("takeRate, asked in English", () => {
  it("refuses with the English sentence, the wait in English", async () => {
    rpc = vi.fn<Rpc>(async () => ({ data: 125, error: null }));
    expect(await takeRate("lookup", 1, "en")).toEqual({
      ok: false,
      retryAfterSeconds: 125,
      message: "Too many tries in a row. Try again in 3 minutes.",
    });
    rpc = vi.fn<Rpc>(async () => ({ data: 7_200, error: null }));
    expect(await takeRate("order_units", 2, "en")).toEqual({
      ok: false,
      retryAfterSeconds: 7_200,
      message: "Each shopper can order up to 60 items a day. Try again in 2 hours.",
    });
  });

  it("stays Vietnamese when it is handed no language, as every action that passes none still has it", async () => {
    rpc = vi.fn<Rpc>(async () => ({ data: 125, error: null }));
    expect(await takeRate("lookup")).toEqual(await takeRate("lookup", 1, "vi"));
    expect((await takeRate("lookup")) as { message: string }).toMatchObject({
      message: "Quá nhiều lượt liên tiếp. Thử lại sau 3 phút.",
    });
  });

  it("asks take_rate() the same whatever the language", async () => {
    rpc = vi.fn<Rpc>(async () => ({ data: 0, error: null }));
    await takeRate("order_place", 1, "en");
    await takeRate("order_place", 1, "vi");
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
  });
});
