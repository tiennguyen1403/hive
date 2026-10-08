import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/lib/i18n";

/**
 * Slice B17 (QĐ-44): "Sửa địa chỉ" does not exist for a real customer's
 * order. The order screen does not draw it; `editAddress` — a public endpoint
 * like every Server Action — refuses the same order when it is called
 * directly, before `admin_edit_address()` is ever asked. It reads the order
 * through the manager's own session (`order_json`) and looks only at whose it
 * is: an empty `customerId` is a guest's or a real account's order.
 *
 * Replaced: the language of the request, the rate limit, the session, the
 * database client and `revalidatePath`.
 */

let locale: Locale = "vi";
vi.mock("@/lib/locale", () => ({ getActionLocale: async (): Promise<Locale> => locale }));
vi.mock("@/lib/db/rate-limit", () => ({ takeRate: async () => ({ ok: true }), tidyRateHits: async () => 0 }));
vi.mock("@/lib/db/session", () => ({
  requireAdmin: async () => ({ userId: "00000000-0000-0000-0000-000000000099", email: "quanly@email.com", role: "admin" }),
}));

type Answer = { data: unknown; error: { code: string; message: string } | null };
let found: Answer = { data: null, error: null };
const answer = async (fn: string, _args?: Record<string, unknown>): Promise<Answer> =>
  fn === "order_json" ? found : { data: null, error: null };
const rpc = vi.fn(answer);
vi.mock("@/lib/db/server", () => ({
  getSupabase: async () => ({ rpc: (fn: string, args?: Record<string, unknown>) => rpc(fn, args) }),
}));
vi.mock("@/lib/db/photos", () => ({ purgeUploadedPhotos: async () => 0 }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { editAddress } = await import("./admin");

const FORM = {
  recipient: "Nguyễn Khả Vy",
  phone: "0356 448 130",
  line: "47 Trần Hưng Đạo",
  provinceCode: "29",
  wardCode: "70101063",
  reason: "khách nhắn đổi số nhà",
};

const edited = () => rpc.mock.calls.filter(([fn]) => fn === "admin_edit_address");

beforeEach(() => {
  locale = "vi";
  found = { data: null, error: null };
  rpc.mockReset();
  rpc.mockImplementation(answer);
});

describe("editAddress and a real customer's order", () => {
  it("refuses a guest's or a real account's order, and writes nothing", async () => {
    found = { data: { code: "DH-2433", customerId: "" }, error: null };
    expect(await editAddress("DH-2433", FORM)).toEqual({
      errors: { form: "DH-2433 là đơn của khách thật, không sửa địa chỉ được." },
    });
    locale = "en";
    expect(await editAddress("DH-2433", FORM)).toEqual({
      errors: { form: "DH-2433 is a real customer's order. Its address can't be changed." },
    });
    expect(rpc).toHaveBeenCalledWith("order_json", { p_code: "DH-2433" });
    expect(edited()).toEqual([]);
  });

  it("refuses a document it cannot read as an order, rather than guessing", async () => {
    found = { data: { code: "DH-2433" }, error: null };
    expect((await editAddress("DH-2433", FORM)).ok).toBeUndefined();
    expect(edited()).toEqual([]);
  });

  it("goes on for a sample order: copied from the seed, or placed by a demo account", async () => {
    found = { data: { code: "DH-2431", customerId: "c-vynguyen" }, error: null };
    expect(await editAddress("DH-2431", FORM)).toEqual({
      errors: {},
      ok: true,
      message: "Đã sửa địa chỉ giao DH-2431 · đã lưu",
    });
    expect(edited()).toHaveLength(1);
  });

  it("leaves an order that is not in the book to admin_edit_address(), which answers NOT_FOUND", async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === "order_json"
        ? { data: null, error: null }
        : { data: null, error: { code: "P0001", message: "NOT_FOUND" } },
    );
    expect(await editAddress("DH-9999", FORM)).toEqual({ errors: { form: "Không tìm thấy đơn DH-9999." } });
    expect(edited()).toHaveLength(1);
  });

  it("says it could not save when the order cannot be read, and writes nothing", async () => {
    found = { data: null, error: { code: "08006", message: "connection failure" } };
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await editAddress("DH-2431", FORM)).toEqual({
      errors: { form: "Chưa lưu được. Thử lại sau ít phút." },
    });
    quiet.mockRestore();
    expect(edited()).toEqual([]);
  });

  it("checks the form before it reads anything", async () => {
    expect(await editAddress("DH-2433", { ...FORM, recipient: "" })).toEqual({
      errors: { form: "Địa chỉ chưa đủ hoặc số điện thoại chưa đúng. Kiểm lại các ô." },
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
