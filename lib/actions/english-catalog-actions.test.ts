import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { productId, type Drop } from "@/data/types";
import { buildCatalog } from "@/lib/catalog";
import { dateTimeLabel, dayMonthYear } from "@/lib/datetime";
import type { Locale } from "@/lib/i18n";
import { onHandOf } from "@/lib/inventory";

/**
 * Round v6 slice E5: the Server Actions of the catalogue screens — the stock
 * drawers, the style form, the issues and their dialogs, the teasers and the
 * codes — answer in the request's language, refusals included (the schedule's
 * "Overlaps Drop 05", "Drop 06 must open after Drop 05 closes"), and spend
 * every rate limit through `takeRate(…, "en")` so that refusal is English too.
 * What they WRITE never changes with it: a stock reason is one of the
 * Vietnamese ones, a renamed style keeps the words typed.
 *
 * Replaced: the language of the request, the rate limit, the session, the
 * catalogue, the database client, the photo bucket and `revalidatePath`.
 */

vi.mock("@/lib/locale", () => ({ getActionLocale: async (): Promise<Locale> => "en" }));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRate = vi.fn(async (_bucket: string, _cost?: number, _locale?: Locale): Promise<Pace> => pace);
const takeRates = vi.fn(async (..._buckets: string[]): Promise<Pace> => pace);
vi.mock("@/lib/db/rate-limit", () => ({
  takeRate: (bucket: string, cost?: number, locale?: Locale) => takeRate(bucket, cost, locale),
  takeRates: (...buckets: string[]) => takeRates(...buckets),
}));

vi.mock("@/lib/db/session", () => ({
  requireAdmin: async () => ({ userId: "00000000-0000-0000-0000-000000000099", email: "quanly@email.com", role: "admin" }),
}));

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

type Answer = {
  data: unknown;
  error: { code: string; message: string; details: string | null; hint?: string | null } | null;
};
const rpc = vi.fn(async (_fn: string, _args: Record<string, unknown>): Promise<Answer> => ({ data: null, error: null }));
vi.mock("@/lib/db/server", () => ({
  getSupabase: async () => ({ rpc: (fn: string, args: Record<string, unknown>) => rpc(fn, args) }),
}));

vi.mock("@/lib/db/photos", () => ({
  photoKeyInUse: async () => true,
  removeLoosePhotos: async () => undefined,
  removeUploadedPhotos: async () => ({ removed: 0, failed: false }),
  storeUploadedPhoto: async () => false,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const actions = await import("./catalog-admin");

// The fixture: 04 runs 05/06 → 19/06, 05 runs 11/09 → 25/09, 06 runs 02/10 → 16/10, each at 20:00.
const at20 = (day: string) => `2026-${day}T20:00:00+07:00`;
const seven: Drop = { no: 7, opensAt: at20("10-17"), closesAt: at20("10-31") };
const refusal = (message: string, details: string | null = null, hint: string | null = null): Answer => ({
  data: null,
  error: { code: "P0001", message, details, hint },
});
const NOW = "2026-09-21T10:00:00+07:00";
const hoodie = FIXTURE_CATALOG.byId.get(productId("p-hoodie-tron"))!;
const grey = hoodie.colors[0]!;

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
  takeRate.mockClear();
  takeRates.mockClear();
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("the shelf, asked in English", () => {
  it("adjusts the stock and says so in English, the reason stored in Vietnamese", async () => {
    const before = onHandOf(hoodie, grey, "S");
    const answer = await actions.adjustStock(
      String(hoodie.id),
      [{ color: grey, size: "S", before, after: before + 1 }],
      "Hàng trả về",
      "DH-2419",
      "",
    );
    expect(answer).toEqual({ errors: {}, ok: true, message: "Stock adjusted for PLAIN HOODIE · +1 piece · saved" });
    expect(rpc).toHaveBeenCalledWith("admin_adjust_stock", expect.objectContaining({ p_reason: "Hàng trả về" }));
    expect(takeRate.mock.calls).toEqual([["admin", 1, "en"]]);
    expect(takeRates).not.toHaveBeenCalled();
  });

  it("refuses in English: no reason, a shelf that moved, a rate limit", async () => {
    const before = onHandOf(hoodie, grey, "S");
    const cells = [{ color: grey, size: "S", before, after: before + 1 }];
    expect((await actions.adjustStock(String(hoodie.id), cells, "", "", "")).errors.form).toBe("Choose a reason.");
    rpc.mockResolvedValueOnce(refusal("STALE"));
    expect((await actions.adjustStock(String(hoodie.id), cells, "Khác", "", "")).errors.form).toBe(
      "Stock changed elsewhere. Reload, then edit again.",
    );
    pace = { ok: false, retryAfterSeconds: 120, message: "Too many tries in a row. Try again in 2 minutes." };
    expect((await actions.adjustStock(String(hoodie.id), cells, "Khác", "", "")).errors.form).toBe(
      "Too many tries in a row. Try again in 2 minutes.",
    );
  });

  it("restocks in English, under the stored reason", async () => {
    const before = onHandOf(hoodie, grey, "M");
    const answer = await actions.restockProduct(String(hoodie.id), [{ color: grey, size: "M", before, add: 3 }]);
    expect(answer.message).toBe("Restocked PLAIN HOODIE · +3 pieces · saved");
    expect(rpc).toHaveBeenCalledWith("admin_adjust_stock", expect.objectContaining({ p_reason: "Nhập thêm" }));
  });
});

describe("the issues, asked in English", () => {
  it("refuses a schedule that overlaps, or sits on the wrong side, in English", async () => {
    drops = [...FIXTURE_CATALOG.drops, seven];
    expect((await actions.scheduleDrop(6, at20("09-20"), at20("10-05"))).errors.form).toBe("Overlaps Drop 05");
    expect((await actions.scheduleDrop(6, at20("07-01"), at20("07-10"))).errors.form).toBe(
      "Drop 06 must open after Drop 05 closes",
    );
    expect((await actions.scheduleDrop(6, at20("11-11"), at20("11-20"))).errors.form).toBe(
      "Drop 06 must close before Drop 07 opens",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reads the database's own calendar refusal in English", async () => {
    rpc.mockResolvedValueOnce(refusal("NOT_ALLOWED", "6", "PREVIOUS"));
    expect((await actions.addDrop(7, seven.opensAt, seven.closesAt)).errors.form).toBe(
      "Drop 07 must open after Drop 06 closes",
    );
    expect(takeRate.mock.calls).toEqual([
      ["admin", 1, "en"],
      ["admin_create", 1, "en"],
    ]);
  });

  it("creates, moves and closes an issue, saying so in English", async () => {
    expect((await actions.addDrop(7, seven.opensAt, seven.closesAt)).message).toBe("Drop 07 created (coming soon) · saved");
    const moved = await actions.scheduleDrop(6, at20("10-03"), at20("10-17"));
    expect(moved.message).toBe(
      `Drop 06: dates changed to ${dayMonthYear(at20("10-03"), "en")} → ${dayMonthYear(at20("10-17"), "en")} · saved`,
    );
    const closed = await actions.closeDropNow(5);
    expect(closed.message).toBe(`Drop 05 closed at ${dateTimeLabel("2026-09-21T10:00:00+07:00", "en")} · saved`);
    expect((await actions.closeDropNow(4)).errors.form).toBe("Drop 04 is no longer live. Reload the page to check.");
    expect((await actions.scheduleDrop(9, at20("12-01"), at20("12-10"))).errors.form).toBe("Drop 09 not found.");
  });

  it("checks a teaser in English", async () => {
    expect((await actions.addTeaser({ dropNo: 6, name: "", garment: "", photoKey: "" })).errors.form).toBe(
      "Enter the style name.",
    );
  });
});

describe("the codes, asked in English", () => {
  it("pauses, resumes, raises, ends and copies a code, in English", async () => {
    expect((await actions.pausePromo("DOT05", true)).message).toBe("DOT05 paused · checkout turns it down from now on");
    expect((await actions.pausePromo("DOT05", false)).message).toBe("DOT05 running again · checkout takes it from now on");
    expect((await actions.raisePromoLimit("DOT05", 250)).message).toBe("DOT05: limit 200 → 250 uses · saved");
    expect((await actions.endPromo("DOT05")).message).toBe("DOT05 ended early · end time = now · saved");
    const dot05 = FIXTURE_CATALOG.promotions[0]!;
    const draft = {
      code: "SO07",
      promoKind: dot05.kind,
      percent: dot05.kind === "PERCENT" ? dot05.percent : 0,
      amountVnd: 0,
      maxDiscountVnd: dot05.kind === "PERCENT" ? (dot05.maxDiscountVnd ?? 0) : 0,
      minOrderVnd: dot05.minOrderVnd ?? 0,
      usageLimit: dot05.usageLimit,
      startsAt: seven.opensAt,
      endsAt: seven.closesAt,
    };
    expect((await actions.addPromo(draft, "DOT05")).message).toBe("Duplicated as SO07 · saved");
    expect((await actions.addPromo({ ...draft, code: "DOT05" })).errors.form).toBe("Code DOT05 already exists.");
    expect((await actions.editPromo("DOT05", { ...draft, code: "OTHER" })).errors.form).toBe(
      "The code itself can't change. Use “Duplicate” to make a new one.",
    );
  });
});

describe("the style form, asked in English", () => {
  const form = {
    name: hoodie.name,
    kind: hoodie.kind,
    dropNo: null,
    slug: hoodie.slug,
    priceVnd: hoodie.priceVnd,
    material: hoodie.material,
    fit: hoodie.fit,
  };

  it("saves a new name as typed and says so in English", async () => {
    const answer = await actions.updateProduct(String(hoodie.id), { ...form, name: "PLAIN HOODIE V2" });
    expect(answer.message).toBe("PLAIN HOODIE V2 edited · saved");
    expect(rpc).toHaveBeenCalledWith(
      "admin_update_product",
      expect.objectContaining({ p_patch: expect.objectContaining({ name: "PLAIN HOODIE V2" }) }),
    );
  });

  it("refuses in English: nothing changed, a name left empty", async () => {
    expect((await actions.updateProduct(String(hoodie.id), form)).errors.form).toBe("No changes to save.");
    expect((await actions.updateProduct(String(hoodie.id), { ...form, name: "" })).errors.form).toBe(
      "Enter the style name.",
    );
    expect((await actions.createProduct({ name: "" })).errors.form).toBe("Enter the style name.");
  });

  it("refuses a photo in English, and keeps one in use", async () => {
    expect((await actions.uploadProductPhoto("x" as never)).errors.form).toBe(
      "The file isn't WebP/JPEG, or is over 1.5 MB",
    );
    expect((await actions.removeUploadedPhoto("up/0123456789abcdef0123456789abcdef.webp")).errors.form).toBe(
      "This photo is in use on a style, so it stays.",
    );
    expect((await actions.removeUploadedPhoto("not-an-upload")).errors.form).toBe("The submitted data isn't valid.");
    expect(takeRate.mock.calls.every((call) => call[2] === "en")).toBe(true);
  });
});
