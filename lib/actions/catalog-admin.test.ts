import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import type { Drop } from "@/data/types";
import { buildCatalog } from "@/lib/catalog";

/**
 * "Sửa giờ" and "Đóng sớm" without a database (slice B14): the issue is read
 * from the catalogue, a window that runs into ANOTHER issue is refused in the
 * toast's words before the database is asked — the way "Tạo số" refuses one —
 * a window that only narrows never is, and the database's own refusal
 * (`NOT_ALLOWED`, the issue in the way in DETAIL) reads the same. What
 * `admin_schedule_drop()` does is Postgres' and is checked against Postgres in
 * `lib/db/catalog-admin.dbtest.ts`.
 *
 * Replaced: the session (`requireAdmin`), the rate limits (`takeRates`), the
 * catalogue (`loadCatalog`), the database client (`getSupabase`), the photo
 * bucket the module also imports, and `revalidatePath`.
 */

const requireAdmin = vi.fn(async (_next?: string) => ({
  userId: "00000000-0000-0000-0000-000000000099",
  email: "quanly@email.com",
  role: "admin" as const,
}));
vi.mock("@/lib/db/session", () => ({ requireAdmin: (next?: string) => requireAdmin(next) }));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRates = vi.fn(async (..._buckets: string[]) => pace);
vi.mock("@/lib/db/rate-limit", () => ({ takeRates: (...buckets: string[]) => takeRates(...buckets) }));

/** The calendar the catalogue answers with; the fixture's unless a test says otherwise. */
let drops: Drop[] = [];
vi.mock("@/lib/db/catalog", () => ({
  loadCatalog: async () =>
    buildCatalog({
      products: [...FIXTURE_CATALOG.products],
      drops,
      teasers: [...FIXTURE_CATALOG.teasers],
      promotions: [...FIXTURE_CATALOG.promotions],
    }),
}));

type Answer = { data: unknown; error: { code: string; message: string; details: string | null } | null };
const rpc = vi.fn(async (_fn: string, _args: Record<string, unknown>): Promise<Answer> => ({ data: null, error: null }));
vi.mock("@/lib/db/server", () => ({
  getSupabase: async () => ({ rpc: (fn: string, args: Record<string, unknown>) => rpc(fn, args) }),
}));

vi.mock("@/lib/db/photos", () => ({
  photoKeyInUse: async () => false,
  removeLoosePhotos: async () => undefined,
  removeUploadedPhotos: async () => ({ removed: 0, failed: false }),
  storeUploadedPhoto: async () => false,
}));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => revalidatePath(path, type),
}));

const { closeDropNow, scheduleDrop } = await import("./catalog-admin");

// The fixture: 04 runs 05/06 → 19/06, 05 runs 11/09 → 25/09, 06 runs 02/10 → 16/10, each at 20:00.
const five = FIXTURE_CATALOG.dropByNo.get(5)!;
const at20 = (day: string) => `2026-${day}T20:00:00+07:00`;

/** While Số 05 sells: the clock every call here reads. */
const NOW = "2026-09-21T10:00:00+07:00";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse(NOW));
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  drops = [...FIXTURE_CATALOG.drops];
  pace = { ok: true };
  requireAdmin.mockClear();
  takeRates.mockClear();
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
  revalidatePath.mockClear();
});

describe("scheduleDrop · 'Sửa giờ'", () => {
  it("refuses a window that runs into another issue, in the toast's words, before asking the database", async () => {
    const answer = await scheduleDrop(6, at20("09-20"), at20("09-30"));
    expect(answer).toEqual({ errors: { form: "Lịch chồng lên Số 05" } });
    expect(requireAdmin).toHaveBeenCalledWith("/admin/drops");
    expect(takeRates).toHaveBeenCalledWith("admin");
    expect(rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("names the lowest-numbered issue when the window runs into several", async () => {
    const answer = await scheduleDrop(6, at20("06-10"), at20("09-20"));
    expect(answer.errors.form).toBe("Lịch chồng lên Số 04");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("never compares an issue with itself: a move across its own old days goes to the database", async () => {
    const answer = await scheduleDrop(6, at20("10-03"), at20("10-17"));
    expect(rpc).toHaveBeenCalledWith("admin_schedule_drop", {
      p_no: 6,
      p_opens_at: at20("10-03"),
      p_closes_at: at20("10-17"),
      p_now: NOW,
    });
    expect(answer).toEqual({
      errors: {},
      ok: true,
      message: "Số 06: lịch đổi thành 03/10/2026 → 17/10/2026 · đã lưu",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("lets an issue open the instant the one before it closes", async () => {
    const answer = await scheduleDrop(6, five.closesAt, at20("10-09"));
    expect(answer.ok).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("lets a window that only narrows through, even over an overlap already in the calendar", async () => {
    drops = drops.map((d) => (d.no === 6 ? { ...d, opensAt: at20("09-20") } : d));
    const answer = await scheduleDrop(6, at20("09-22"), at20("10-15"));
    expect(answer.ok).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("says the database's own refusal the same way: NOT_ALLOWED, the issue in the way in DETAIL", async () => {
    // Another tab moved Số 05 between the catalogue read and the write.
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "NOT_ALLOWED", details: "5" } });
    const answer = await scheduleDrop(6, at20("10-03"), at20("10-17"));
    expect(answer).toEqual({ errors: { form: "Lịch chồng lên Số 05" } });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers NOT_FOUND for an issue the catalogue does not have, without asking the database", async () => {
    const answer = await scheduleDrop(9, at20("11-01"), at20("11-15"));
    expect(answer).toEqual({ errors: { form: "Không tìm thấy Số 09." } });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("closeDropNow · 'Đóng sớm'", () => {
  it("closes the selling issue even while another one wrongly sells beside it", async () => {
    drops = drops.map((d) => (d.no === 6 ? { ...d, opensAt: at20("09-20") } : d));
    const answer = await closeDropNow(5);
    expect(rpc).toHaveBeenCalledWith("admin_schedule_drop", {
      p_no: 5,
      p_opens_at: five.opensAt,
      p_closes_at: NOW,
      p_now: NOW,
    });
    expect(answer.ok).toBe(true);
    // Số 06, still selling beside it, is not touched.
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
