import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n";
import { DELIVERY_OPTIONS } from "@/lib/shipping";

/**
 * Round v6 slice E4: the Server Actions of the order screens answer in the
 * request's language — `markPaid`, `handOver`, `markDelivered`,
 * `cancelOrderAdmin`, `noteOrder`, `editAddress`, and the reset — and hand it
 * to every rate limit they spend, so a refusal is in that language too. Here
 * the request is English (`getActionLocale`). What they WRITE never changes
 * with it: a cancel reason is one of the four Vietnamese ones, a carrier the
 * service's Vietnamese label.
 *
 * Replaced: the language of the request, the rate limit, the session, the
 * database client, the photo bucket and `revalidatePath`.
 */

vi.mock("@/lib/locale", () => ({ getActionLocale: async (): Promise<Locale> => "en" }));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRate = vi.fn(async (_bucket: string, _cost?: number, _locale?: Locale): Promise<Pace> => pace);
vi.mock("@/lib/db/rate-limit", () => ({
  takeRate: (bucket: string, cost?: number, locale?: Locale) => takeRate(bucket, cost, locale),
  tidyRateHits: async () => 0,
}));

vi.mock("@/lib/db/session", () => ({
  requireAdmin: async () => ({ userId: "00000000-0000-0000-0000-000000000099", email: "quanly@email.com", role: "admin" }),
}));

type Answer = { data: unknown; error: { code: string; message: string } | null };
const rpc = vi.fn(async (_fn: string, _args?: Record<string, unknown>): Promise<Answer> => ({ data: null, error: null }));
vi.mock("@/lib/db/server", () => ({
  getSupabase: async () => ({ rpc: (fn: string, args?: Record<string, unknown>) => rpc(fn, args) }),
}));

vi.mock("@/lib/db/photos", () => ({ purgeUploadedPhotos: async () => 2 }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { cancelOrderAdmin, editAddress, handOver, markDelivered, markPaid, noteOrder, resetDemo } = await import("./admin");

const refusal = (message: string): Answer => ({ data: null, error: { code: "P0001", message } });

beforeEach(() => {
  pace = { ok: true };
  takeRate.mockClear();
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("the order moves, asked in English", () => {
  it("marks one order paid, and says so in English", async () => {
    expect(await markPaid(["DH-2431"])).toEqual({ errors: {}, ok: true, message: "DH-2431 → paid · saved" });
    expect(takeRate.mock.calls).toEqual([["admin", 1, "en"]]);
    expect(rpc).toHaveBeenCalledWith("admin_mark_paid", expect.objectContaining({ p_code: "DH-2431" }));
  });

  it("counts a bulk confirmation in English, the ones that moved and the ones that did not", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce(refusal("NOT_ALLOWED"));
    expect(await markPaid(["DH-2431", "DH-2430"])).toEqual({
      errors: {},
      ok: true,
      message: "1 order → paid · saved · 1 order couldn't change, reload to check",
    });
  });

  it("words a refusal in English, and the rate limit's own sentence passes through", async () => {
    rpc.mockResolvedValueOnce(refusal("NOT_ALLOWED"));
    expect(await markPaid(["DH-2431"])).toEqual({
      errors: { form: "DH-2431 is no longer awaiting payment. Reload the page to see its status." },
    });
    expect(await markPaid("nonsense")).toEqual({
      errors: { form: "The submitted data isn't valid." },
    });
    pace = { ok: false, retryAfterSeconds: 200, message: "Too many tries in a row. Try again in 4 minutes." };
    expect(await markPaid(["DH-2431"])).toEqual({ errors: { form: "Too many tries in a row. Try again in 4 minutes." } });
  });

  it("hands over with the carrier stored in Vietnamese, the toast in English", async () => {
    const carrier = DELIVERY_OPTIONS[0]!.label;
    expect(await handOver("DH-2429", { carrier, trackingCode: "vnp-2429-01", note: "" })).toEqual({
      errors: {},
      ok: true,
      message: "DH-2429 → shipping · VNP-2429-01 · the customer sees this number in Track an order and Orders",
    });
    expect(rpc).toHaveBeenCalledWith(
      "admin_hand_over",
      expect.objectContaining({ p_code: "DH-2429", p_carrier: carrier, p_tracking_code: "VNP-2429-01" }),
    );
    // The English label is not a value the database knows.
    expect(await handOver("DH-2429", { carrier: "Standard delivery · 2–4 days", trackingCode: "VNP-1", note: "" })).toEqual({
      errors: { form: "A tracking number can only contain letters, digits, dots and hyphens, up to 40 characters." },
    });
    expect(takeRate.mock.calls.every((call) => call[2] === "en")).toBe(true);
  });

  it("records a delivery in English", async () => {
    expect(await markDelivered("DH-2426")).toEqual({ errors: {}, ok: true, message: "DH-2426 → delivered · saved" });
    expect(await markDelivered("nope")).toEqual({ errors: { form: "Order not found." } });
  });

  it("cancels with the Vietnamese reason in the database and the English one in the toast", async () => {
    expect(await cancelOrderAdmin("DH-2428", "Khách đổi ý", "")).toEqual({
      errors: {},
      ok: true,
      message: "DH-2428 cancelled · reason: change of mind · items back in stock",
    });
    expect(rpc).toHaveBeenCalledWith("admin_cancel_order", expect.objectContaining({ p_code: "DH-2428", p_reason: "Khách đổi ý" }));
    // The reason's English label is not one of the four values.
    expect(await cancelOrderAdmin("DH-2428", "Change of mind", "")).toEqual({
      errors: { form: "Choose a reason before cancelling." },
    });
    rpc.mockResolvedValueOnce(refusal("NOT_ALLOWED"));
    expect(await cancelOrderAdmin("DH-2428", "Khác", "")).toEqual({
      errors: { form: "DH-2428 has been handed over or closed and can no longer be cancelled." },
    });
  });

  it("adds a note and changes an address in English", async () => {
    expect(await noteOrder("DH-2429", "gọi khách")).toEqual({ errors: {}, ok: true, message: "Note added · saved" });
    expect(rpc).toHaveBeenCalledWith("admin_note_order", expect.objectContaining({ p_text: "gọi khách" }));
    expect(await noteOrder("DH-2429", "  ")).toEqual({ errors: { form: "The note is empty or longer than 500 characters." } });
    expect(
      await editAddress("DH-2431", {
        recipient: "Nguyễn Khả Vy",
        phone: "0356 448 130",
        line: "47 Trần Hưng Đạo",
        provinceCode: "29",
        wardCode: "70101063",
        reason: "khách nhắn đổi số nhà",
      }),
    ).toEqual({ errors: {}, ok: true, message: "Delivery address of DH-2431 changed · saved" });
    expect(await editAddress("DH-2431", { recipient: "" })).toEqual({
      errors: { form: "The address is incomplete or the phone number is wrong. Check the fields." },
    });
  });

  it("resets the demo data in English, its own limit spent in English too", async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === "demo_anchor" ? { data: "2026-10-01T18:50:00+07:00", error: null } : { data: null, error: null },
    );
    expect(await resetDemo()).toEqual({
      errors: {},
      ok: true,
      message: "Demo data reset · orders, stock and activity are back to the start · 2 uploaded photos deleted",
    });
    expect(takeRate.mock.calls).toEqual([
      ["admin", 1, "en"],
      ["reset", 1, "en"],
    ]);
  });
});
