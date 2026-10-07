import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Slice B17 (QĐ-45): `deleteRealAccounts`, which the daily reset calls after
 * `reset_demo()`, with the service client stood in for — the database half is
 * `real-accounts.dbtest.ts`. What it promises here:
 *
 *   · it deletes exactly the accounts `real_accounts()` names, minus the nine
 *     shared demo accounts, through `auth.admin.deleteUser`;
 *   · one deletion that fails is logged — by id, never by e-mail — and the rest
 *     still go, and the answer counts both;
 *   · it never throws: no key, or a list it cannot read, is null.
 *
 * Replaced: `server-only` (a build-time marker Next resolves itself), the
 * service client, and the publishable side `./server`, which this function
 * does not use.
 */

vi.mock("server-only", () => ({}));
vi.mock("./server", () => ({ supabaseEnv: () => ({ url: "http://db.test", publishableKey: "pk" }) }));

type Listed = { data: { id: string; email: string }[] | null; error: { message: string } | null };
let listed: Listed = { data: [], error: null };
const failing = new Set<string>();
const deleteUser = vi.fn(async (id: string) => {
  if (id === "throws") throw new Error("network down");
  return { data: { user: null }, error: failing.has(id) ? { message: "Database error deleting user" } : null };
});
const rpc = vi.fn(async (_fn: string) => listed);
let service: unknown = null;

vi.mock("./service", () => ({ getServiceSupabase: () => service }));

const { deleteRealAccounts } = await import("./demo-accounts");

const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

beforeEach(() => {
  listed = { data: [], error: null };
  failing.clear();
  deleteUser.mockClear();
  rpc.mockClear();
  errors.mockClear();
  service = { rpc: (fn: string) => rpc(fn), auth: { admin: { deleteUser: (id: string) => deleteUser(id) } } };
});

describe("deleteRealAccounts", () => {
  it("deletes every account the database names, except the shared demo ones", async () => {
    listed = {
      data: [
        { id: "a", email: "peter.smith@gmail.com" },
        { id: "b", email: "minhanh@email.com" },
        { id: "c", email: "quanly@email.com" },
        { id: "d", email: "" },
      ],
      error: null,
    };
    expect(await deleteRealAccounts()).toEqual({ deleted: 2, failed: 0 });
    expect(rpc).toHaveBeenCalledWith("real_accounts");
    expect(deleteUser.mock.calls.map(([id]) => id)).toEqual(["a", "d"]);
  });

  it("logs one that fails, by its id, and goes on with the rest", async () => {
    listed = {
      data: [
        { id: "a", email: "peter.smith@gmail.com" },
        { id: "throws", email: "x@example.test" },
        { id: "b", email: "hong.mai@example.test" },
        { id: "c", email: "third@example.test" },
      ],
      error: null,
    };
    failing.add("b");
    expect(await deleteRealAccounts()).toEqual({ deleted: 2, failed: 2 });
    expect(deleteUser.mock.calls.map(([id]) => id)).toEqual(["a", "throws", "b", "c"]);
    const logged = errors.mock.calls.map((args) => args.join(" "));
    expect(logged.some((l) => l.includes("throws"))).toBe(true);
    expect(logged.some((l) => l.includes(" b:") || l.includes(": b"))).toBe(true);
    expect(logged.join("\n")).not.toContain("@example.test");
  });

  it("answers null, deleting nothing, without a key or without the list", async () => {
    service = null;
    expect(await deleteRealAccounts()).toBeNull();
    service = { rpc: (fn: string) => rpc(fn), auth: { admin: { deleteUser: (id: string) => deleteUser(id) } } };
    listed = { data: null, error: { message: "permission denied for function real_accounts" } };
    expect(await deleteRealAccounts()).toBeNull();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("answers zero when nobody real is left", async () => {
    expect(await deleteRealAccounts()).toEqual({ deleted: 0, failed: 0 });
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
