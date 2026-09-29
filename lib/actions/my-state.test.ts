import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MyState } from "@/data/types";

/**
 * The keep actions' own order of things (slice B9), without a database: who
 * is asking, then what was sent, then the visitor's rate limit, then the
 * write — and above all that a signed-out call writes NOTHING and spends no
 * token. What the writes do is Postgres' and is checked against Postgres in
 * `lib/db/my-state.dbtest.ts`.
 *
 * Replaced: the session (`getSession`), the rate limit (`takeRate`) and the
 * Data Access Layer the actions call (`lib/db/my-state.ts`).
 */

let session: { userId: string } | null = null;
vi.mock("@/lib/db/session", () => ({ getSession: async () => session }));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRate = vi.fn(async (_bucket: string) => pace);
vi.mock("@/lib/db/rate-limit", () => ({ takeRate: (bucket: string) => takeRate(bucket) }));

const STATE: MyState = {
  favorites: [{ productId: "p-bui" as never, color: "black", savedAt: null }],
  reminders: [6],
  sizes: { top: "L", bottom: "M" },
  notify: { order: true, drop: true, wishlist: true, promo: true },
};

const dal = {
  saveFavorite: vi.fn(),
  unsaveFavorite: vi.fn(),
  restoreFavorite: vi.fn(),
  setReminder: vi.fn(),
  setMySize: vi.fn(),
  setNotify: vi.fn(),
};
vi.mock("@/lib/db/my-state", () => dal);

const actions = await import("./my-state");

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  session = { userId: "00000000-0000-0000-0000-000000000001" };
  pace = { ok: true };
  takeRate.mockClear();
  for (const fn of Object.values(dal)) {
    fn.mockReset();
    fn.mockResolvedValue({ ok: true, value: STATE });
  }
  dal.unsaveFavorite.mockResolvedValue({
    ok: true,
    value: { removed: { productId: "p-than", color: "navy", savedAt: null }, state: STATE },
  });
  logged?.mockRestore();
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

/** Every action once, with input it accepts. */
const calls = () => [
  ["favorites", () => actions.saveFavoriteAction("p-khoi" as never)],
  ["favorites", () => actions.unsaveFavoriteAction("p-khoi" as never)],
  ["favorites", () => actions.restoreFavoriteAction("p-khoi" as never)],
  ["reminders", () => actions.setReminderAction(6, true)],
  ["sizes", () => actions.setMySizeAction("top", "L")],
  ["notify", () => actions.setNotifyAction("promo", false)],
] as const;

const SIGN_IN = {
  favorites: "Đăng nhập để lưu mẫu",
  reminders: "Đăng nhập để bật nhắc",
  sizes: "Đăng nhập để sửa hồ sơ",
  notify: "Đăng nhập để xem thông báo",
};

describe("signed out", () => {
  it("answers SIGNED_OUT with the mock's invitation, writes nothing and spends no token", async () => {
    session = null;
    for (const [topic, call] of calls()) {
      expect(await call()).toEqual({ ok: false, reason: "SIGNED_OUT", message: SIGN_IN[topic] });
    }
    for (const fn of Object.values(dal)) expect(fn).not.toHaveBeenCalled();
    expect(takeRate).not.toHaveBeenCalled();
  });
});

describe("what the browser sent", () => {
  it("refuses input the account cannot keep before any token is spent or row written", async () => {
    const refused = [
      await actions.saveFavoriteAction("khoi" as never),
      await actions.saveFavoriteAction("p-khoi" as never, "red" as never),
      await actions.unsaveFavoriteAction({} as never),
      await actions.restoreFavoriteAction(null as never),
      await actions.setReminderAction(0, true),
      await actions.setReminderAction(6, "yes" as never),
      await actions.setMySizeAction("shoes" as never, "L"),
      await actions.setMySizeAction("top", "XXL" as never),
      await actions.setNotifyAction("sms" as never, true),
      await actions.setNotifyAction("promo", 1 as never),
    ];
    for (const r of refused) expect(r).toMatchObject({ ok: false, reason: "INVALID" });
    for (const fn of Object.values(dal)) expect(fn).not.toHaveBeenCalled();
    expect(takeRate).not.toHaveBeenCalled();
  });

  it("hands the DAL what it read: no colour and no size are null", async () => {
    await actions.saveFavoriteAction("p-khoi" as never);
    expect(dal.saveFavorite).toHaveBeenCalledWith("p-khoi", null);
    await actions.saveFavoriteAction("p-khoi" as never, "cream");
    expect(dal.saveFavorite).toHaveBeenLastCalledWith("p-khoi", "cream");
    await actions.setMySizeAction("bottom", null);
    expect(dal.setMySize).toHaveBeenCalledWith("bottom", null);
    await actions.setReminderAction(6, false);
    expect(dal.setReminder).toHaveBeenCalledWith(6, false);
    await actions.setNotifyAction("wishlist", false);
    expect(dal.setNotify).toHaveBeenCalledWith("wishlist", false);
  });
});

describe("the rate limit", () => {
  it("spends one token of the `keep` bucket per write — every one of the six, never `account`", async () => {
    for (const [, call] of calls()) await call();
    expect(takeRate).toHaveBeenCalledTimes(6);
    expect(takeRate.mock.calls.map(([bucket]) => bucket)).toEqual(Array(6).fill("keep"));
  });

  it("writes nothing when the bucket refuses, and says how long to wait", async () => {
    await actions.saveFavoriteAction("p-khoi" as never);
    expect(takeRate).toHaveBeenCalledWith("keep");

    takeRate.mockClear();
    dal.saveFavorite.mockClear();
    pace = { ok: false, retryAfterSeconds: 120, message: "Quá nhiều lượt liên tiếp. Thử lại sau 2 phút." };
    expect(await actions.saveFavoriteAction("p-khoi" as never)).toEqual({
      ok: false,
      reason: "RATE_LIMITED",
      message: "Quá nhiều lượt liên tiếp. Thử lại sau 2 phút.",
    });
    expect(dal.saveFavorite).not.toHaveBeenCalled();
  });
});

describe("the answer", () => {
  it("is the whole state the database now holds — and for Bỏ lưu the row it took off", async () => {
    expect(await actions.saveFavoriteAction("p-khoi" as never)).toEqual({ ok: true, state: STATE });
    expect(await actions.unsaveFavoriteAction("p-than" as never)).toEqual({
      ok: true,
      state: STATE,
      removed: { productId: "p-than", color: "navy", savedAt: null },
    });
    expect(await actions.setNotifyAction("drop", true)).toEqual({ ok: true, state: STATE });
  });

  it("names a refusal the database meant, in a sentence", async () => {
    dal.setReminder.mockResolvedValue({ ok: false, failure: "NOT_UPCOMING" });
    expect(await actions.setReminderAction(5, true)).toEqual({
      ok: false,
      reason: "NOT_UPCOMING",
      message: "Chỉ bật nhắc được cho Số chưa mở.",
    });
    dal.restoreFavorite.mockResolvedValue({ ok: false, failure: "NOT_FOUND" });
    expect(await actions.restoreFavoriteAction("p-khoi" as never)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
      message: "Không còn gì để hoàn tác.",
    });
  });

  it("turns broken plumbing into UNAVAILABLE and a log line, never a thrown error", async () => {
    dal.setMySize.mockRejectedValue(new Error("fetch failed"));
    expect(await actions.setMySizeAction("top", "S")).toEqual({
      ok: false,
      reason: "UNAVAILABLE",
      message: "Chưa lưu được. Thử lại sau ít phút.",
    });
    expect(logged).toHaveBeenCalled();
  });
});
