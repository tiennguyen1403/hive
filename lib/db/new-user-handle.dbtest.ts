import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { NAME_MAX } from "@/lib/my-state";
import type { Database } from "./database.types";

/**
 * Slice B19 against the local stack: what a new account's profile is given
 * (`20261007200000_new_user_handle.sql`).
 *
 *   · F9, the handle that makes a profile the sample's. It is read from
 *     `app_metadata`, which only the service role writes, and only when it is
 *     a handle of the sample that no profile holds yet. The `data` of a
 *     sign-up — `user_metadata`, anybody's to write — gives none.
 *   · F17, the name: cut to 60 characters after trimming, then trimmed again.
 *
 * "A handle of the sample" is `seed_customers.handle` or the manager's
 * `a-quanly`. The eight shoppers' and the manager's are held by the demo
 * accounts, so the file adds two handles of its own to `seed_customers` for
 * as long as it runs, and takes them out again with the accounts it made.
 *
 * Needs a running stack, `.env.local`, and `npm run seed:users` after the
 * last `db reset` (the first block reads the nine demo profiles it makes).
 */

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishableKey || !secretKey) {
  throw new Error("SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY must be in .env.local — see .env.example.");
}

const noSession = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient<Database>(url, secretKey, noSession);

/** Two handles of the sample nobody holds: rows this file adds to `seed_customers`. */
const FREE = ["c-b19-one", "c-b19-two"] as const;

/** Every account this file makes, deleted at the end whatever happened. */
const made: string[] = [];

/** An address nobody else uses, so a rerun after a crash does not collide. */
const email = (what: string) => `b19-${what}-${randomBytes(4).toString("hex")}@example.test`;

async function accountWith(
  address: string,
  metadata: { user?: Record<string, unknown>; app?: Record<string, unknown> },
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: address,
    email_confirm: true,
    ...(metadata.user ? { user_metadata: metadata.user } : {}),
    ...(metadata.app ? { app_metadata: metadata.app } : {}),
  });
  if (error) throw new Error(`createUser refused: ${error.message}`);
  made.push(data.user.id);
  return data.user.id;
}

async function profileOf(id: string): Promise<{ handle: string | null; name: string }> {
  const { data, error } = await admin.from("profiles").select("handle, name").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

beforeAll(async () => {
  const { error } = await admin.from("seed_customers").insert(
    FREE.map((handle, i) => ({
      handle,
      name: `Tài khoản thử B19 ${i + 1}`,
      email: `${handle}@example.test`,
      phone: "",
      joined_at: "2026-10-07T12:00:00+07:00",
    })),
  );
  if (error) throw new Error(`could not add the test handles to seed_customers: ${error.message}`);
});

afterAll(async () => {
  for (const id of made) await admin.auth.admin.deleteUser(id);
  await admin.from("seed_customers").delete().in("handle", [...FREE]);
});

describe("F9: the demo accounts carry their handles, through app_metadata", () => {
  it("gives each of the nine its fixture id, the manager the one lib/demo-admin.ts names", async () => {
    const wanted = new Map<string, string>([
      ...CUSTOMERS.map((c) => [c.email, c.id as string] as const),
      [DEMO_ADMIN.email, DEMO_ADMIN.handle],
    ]);
    const { data, error } = await admin.from("profiles").select("email, handle").in("email", [...wanted.keys()]);
    expect(error).toBeNull();
    expect(data).toHaveLength(9);
    for (const row of data ?? []) expect(row.handle, row.email).toBe(wanted.get(row.email));
  });
});

describe("F9: a handle only from app_metadata, and only the sample's", () => {
  it("gives no handle for a sign-up's own data, even one naming a free handle of the sample", async () => {
    const visitor = createClient<Database>(url!, publishableKey!, noSession);
    for (const handle of ["x", FREE[0]]) {
      const { data, error } = await visitor.auth.signUp({
        email: email("signup"),
        password: randomBytes(12).toString("hex"),
        options: { data: { handle, name: "Khách tự đặt handle" } },
      });
      expect(error, handle).toBeNull();
      const id = data.user!.id;
      made.push(id);
      expect((await profileOf(id)).handle, handle).toBeNull();
    }
  });

  it("gives a free handle of the sample written into app_metadata", async () => {
    const id = await accountWith(email("app"), { app: { handle: FREE[0] }, user: { name: "Tài khoản mẫu B19" } });
    expect((await profileOf(id)).handle).toBe(FREE[0]);
  });

  it("drops a handle that is not the sample's", async () => {
    const id = await accountWith(email("odd"), { app: { handle: "c-nobody" } });
    expect((await profileOf(id)).handle).toBeNull();
  });

  it("drops a handle another profile holds, and still makes the account", async () => {
    const id = await accountWith(email("taken"), { app: { handle: CUSTOMERS[0]!.id } });
    expect((await profileOf(id)).handle).toBeNull();
    const { data } = await admin.from("profiles").select("email").eq("handle", CUSTOMERS[0]!.id);
    expect(data?.map((p) => p.email)).toEqual([CUSTOMERS[0]!.email]);
  });

  it("gives a handle written later to a profile without one, and never moves one", async () => {
    const id = await accountWith(email("later"), { user: { name: "Chưa có handle" } });
    expect((await profileOf(id)).handle).toBeNull();

    const first = await admin.auth.admin.updateUserById(id, { app_metadata: { handle: FREE[1] } });
    expect(first.error).toBeNull();
    expect((await profileOf(id)).handle).toBe(FREE[1]);

    // FREE[0] went to the account of the test above, so it is not free; and this profile has one now anyway.
    const second = await admin.auth.admin.updateUserById(id, { app_metadata: { handle: "a-quanly" } });
    expect(second.error).toBeNull();
    expect((await profileOf(id)).handle).toBe(FREE[1]);
  });
});

describe("F17: a name longer than 60 characters is cut, and ends on no space", () => {
  /** 84 characters of a Vietnamese name, every one of them a single code point. */
  const long = "Nguyễn Hoàng Bảo Anh ".repeat(4);

  it("cuts a name of 80 to exactly 60, the way Hồ sơ counts them", async () => {
    const name = [...long].slice(0, 80).join("");
    expect([...name]).toHaveLength(80);
    const id = await accountWith(email("long"), { user: { name } });
    const stored = (await profileOf(id)).name;
    expect([...stored]).toHaveLength(NAME_MAX);
    expect(stored).toBe([...name].slice(0, 60).join(""));
    expect(stored).toBe(stored.trimEnd());
  });

  it("trims again when the cut lands right after a space", async () => {
    const name = `${"x".repeat(59)} ${"y".repeat(20)}`;
    const id = await accountWith(email("space"), { user: { full_name: `  ${name}  ` } });
    expect((await profileOf(id)).name).toBe("x".repeat(59));
  });

  it("leaves a name of 60 or fewer as it was", async () => {
    const name = [...long].slice(0, 60).join("").trim();
    const id = await accountWith(email("fits"), { user: { name } });
    expect((await profileOf(id)).name).toBe(name);
  });
});
