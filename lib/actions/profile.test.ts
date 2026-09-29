import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Hồ sơ's "Lưu" without a database (slice B9): the session first, then the
 * mock's rules, then the rate limit, then the write — the name trimmed and the
 * phone as ten digits — and the layout refreshed only after a save went
 * through. `update_my_profile()` itself is checked against Postgres in
 * `lib/db/my-state.dbtest.ts`.
 */

let session: { userId: string } | null = null;
vi.mock("@/lib/db/session", () => ({ getSession: async () => session }));

type Pace = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };
let pace: Pace = { ok: true };
const takeRate = vi.fn(async (_bucket: string) => pace);
vi.mock("@/lib/db/rate-limit", () => ({ takeRate: (bucket: string) => takeRate(bucket) }));

const updateMyProfile = vi.fn();
vi.mock("@/lib/db/profiles", () => ({
  updateMyProfile: (name: string, phone: string) => updateMyProfile(name, phone),
}));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => revalidatePath(path, type),
}));

const { updateProfileAction } = await import("./profile");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const submit = (fields: Record<string, string>) => updateProfileAction({ errors: {} }, form(fields));

beforeEach(() => {
  session = { userId: "00000000-0000-0000-0000-000000000001" };
  pace = { ok: true };
  takeRate.mockClear();
  updateMyProfile.mockReset();
  updateMyProfile.mockImplementation(async (name: string, phone: string) => ({
    ok: true,
    value: { name, phone },
  }));
  revalidatePath.mockClear();
});

describe("updateProfileAction", () => {
  it("saves the name trimmed and the phone as ten digits, and refreshes the layout", async () => {
    const state = await submit({ name: "  Trần Minh Anh  ", phone: "0912 345.678", email: "khac@email.com" });
    expect(updateMyProfile).toHaveBeenCalledWith("Trần Minh Anh", "0912345678");
    expect(takeRate).toHaveBeenCalledWith("account");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(state).toEqual({
      errors: {},
      ok: true,
      message: "Đã lưu hồ sơ",
      profile: { name: "Trần Minh Anh", phone: "0912345678" },
    });
  });

  it("answers the mock's sentences under the fields, and spends and writes nothing", async () => {
    const state = await submit({ name: "A", phone: "0912-345-678" });
    expect(state).toEqual({
      errors: { name: "Nhập họ và tên", phone: "Số điện thoại gồm 10 số, bắt đầu bằng 0" },
    });
    expect(await submit({ name: "Trần Minh Anh", phone: "" })).toEqual({
      errors: { phone: "Nhập số điện thoại" },
    });
    expect(takeRate).not.toHaveBeenCalled();
    expect(updateMyProfile).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers SIGNED_OUT and writes nothing when nobody is signed in", async () => {
    session = null;
    expect(await submit({ name: "Trần Minh Anh", phone: "0912345678" })).toEqual({
      errors: { form: "Đăng nhập để sửa hồ sơ" },
      reason: "SIGNED_OUT",
    });
    expect(updateMyProfile).not.toHaveBeenCalled();
    expect(takeRate).not.toHaveBeenCalled();
  });

  it("says when the visitor has to wait, and writes nothing", async () => {
    pace = { ok: false, retryAfterSeconds: 60, message: "Quá nhiều lượt liên tiếp. Thử lại sau 1 phút." };
    expect(await submit({ name: "Trần Minh Anh", phone: "0912345678" })).toEqual({
      errors: { form: "Quá nhiều lượt liên tiếp. Thử lại sau 1 phút." },
      reason: "RATE_LIMITED",
    });
    expect(updateMyProfile).not.toHaveBeenCalled();
  });

  it("does not refresh anything when the database refused", async () => {
    updateMyProfile.mockResolvedValue({ ok: false, failure: "UNAVAILABLE" });
    expect(await submit({ name: "Trần Minh Anh", phone: "0912345678" })).toEqual({
      errors: { form: "Chưa lưu được hồ sơ. Thử lại sau ít phút." },
      reason: "UNAVAILABLE",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
