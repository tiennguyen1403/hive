import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { normalisePhone } from "@/lib/checkout-form";
import type { Database } from "./database.types";

/**
 * What slice B1 actually claims, checked against Postgres.
 *
 * Four things, in the order they would break something:
 *
 *   · creating a user creates a profile, from the metadata the script sends;
 *   · row level security is real — `anon` sees nothing, and one signed-in
 *     account cannot see another's addresses (QĐ-16 in the database, not just
 *     in a component);
 *   · `reset_demo()` puts the eight demo accounts and their nine addresses
 *     back, and running it twice changes nothing — not even an address id;
 *   · `npm run seed:users` is idempotent.
 *
 * Needs a running stack (`npx supabase start`) and a `.env.local` pointing at
 * it, which is why this is a `.dbtest.ts` behind `npm run test:db` rather than
 * part of `npm test`.
 */

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const demoPassword = process.env.DEMO_PASSWORD;
if (!url || !publishableKey || !secretKey || !demoPassword) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY and DEMO_PASSWORD must be " +
      "in .env.local — see .env.example.",
  );
}

/** What a visitor gets: the publishable key, and whatever RLS allows. */
const anon = createClient<Database>(url, publishableKey);

/** The service role. Only a script or a test ever holds this. */
const admin = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** A client that is nobody until it signs in, and keeps its session to itself. */
function fresh(): SupabaseClient<Database> {
  return createClient<Database>(url!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signedIn(email: string, password = demoPassword!) {
  const client = fresh();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`could not sign in as a demo account: ${error.message}`);
  return client;
}

/** `npm run seed:users`, run the way a developer runs it. */
function seedUsers(): string {
  return execFileSync("npm", ["run", "seed:users"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
  });
}

describe("the trigger on auth.users", () => {
  const email = "trigger-probe@example.test";
  let userId = "";

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "probe-2026",
      email_confirm: true,
      user_metadata: { name: "Người Thử", phone: "0900000001" },
    });
    if (error) throw new Error(error.message);
    userId = data.user.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("writes a profile from the metadata the admin API was given", async () => {
    const { data, error } = await admin
      .from("profiles")
      .select("id, handle, name, email, phone")
      .eq("id", userId)
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      id: userId,
      handle: null,
      name: "Người Thử",
      email,
      phone: "0900000001",
    });
  });

  it("takes the profile with the user when the user goes", async () => {
    const { data } = await admin.auth.admin.createUser({
      email: "cascade-probe@example.test",
      password: "probe-2026",
      email_confirm: true,
      user_metadata: { name: "Xoá Thử" },
    });
    const id = data!.user!.id;
    await admin.auth.admin.deleteUser(id);

    const { data: left } = await admin.from("profiles").select("id").eq("id", id);
    expect(left).toEqual([]);
  });

  it("does not fail the sign-up over a name or a phone it cannot use", async () => {
    // A trigger that raises makes the INSERT into auth.users fail, which a
    // visitor reads as "sign-up is broken". The name falls back to the local
    // part of the email; a phone that is not ten digits is stored empty.
    const { data, error } = await admin.auth.admin.createUser({
      email: "no-meta@example.test",
      password: "probe-2026",
      email_confirm: true,
      user_metadata: { phone: "12" },
    });
    expect(error).toBeNull();

    const id = data!.user!.id;
    const { data: row } = await admin
      .from("profiles")
      .select("name, phone")
      .eq("id", id)
      .single();
    expect(row).toEqual({ name: "no-meta", phone: "" });

    await admin.auth.admin.deleteUser(id);
  });
});

describe("row level security", () => {
  it("shows a visitor no profile and no address at all", async () => {
    const profiles = await anon.from("profiles").select("id");
    const addresses = await anon.from("addresses").select("id");

    // Either no rows or a refusal — never somebody's name and home address.
    expect(profiles.data ?? []).toEqual([]);
    expect(addresses.data ?? []).toEqual([]);
  });

  it("keeps the seed mirrors out of the API entirely", async () => {
    const customers = await anon.from("seed_customers").select("handle");
    expect(customers.data ?? []).toEqual([]);
  });

  it("shows a signed-in account its own profile and nobody else's", async () => {
    const client = await signedIn(CUSTOMERS[0]!.email);
    const { data } = await client.from("profiles").select("id, handle, email");

    expect(data).toHaveLength(1);
    expect(data![0]!.handle).toBe(CUSTOMERS[0]!.id);
  });

  it("shows account A its own addresses and none of account B's", async () => {
    const a = await signedIn(CUSTOMERS[0]!.email);
    const b = await signedIn(CUSTOMERS[1]!.email);

    const mine = await a.from("addresses").select("id, line");
    const theirs = await b.from("addresses").select("id, line");

    expect(mine.data).toHaveLength(CUSTOMERS[0]!.addresses.length);
    expect(theirs.data).toHaveLength(CUSTOMERS[1]!.addresses.length);

    const overlap = new Set(mine.data!.map((r) => r.id));
    for (const row of theirs.data!) expect(overlap.has(row.id)).toBe(false);
  });

  it("refuses to hand account A a row of account B's, even by id", async () => {
    const a = await signedIn(CUSTOMERS[0]!.email);
    const b = await signedIn(CUSTOMERS[1]!.email);

    const theirs = await b.from("addresses").select("id").limit(1);
    const id = theirs.data![0]!.id;

    const peek = await a.from("addresses").select("id").eq("id", id);
    expect(peek.data).toEqual([]);

    // And the SQL functions say the same thing: not yours, not found.
    const stolen = await a.rpc("set_default_address", { p_id: id });
    expect(stolen.data).toBe(false);
    const wiped = await a.rpc("remove_address", { p_id: id });
    expect(wiped.data).toBe(false);

    // B still has it.
    const still = await b.from("addresses").select("id").eq("id", id);
    expect(still.data).toHaveLength(1);
  });

  it("will not let an account write a row into somebody else's book", async () => {
    const a = await signedIn(CUSTOMERS[0]!.email);
    const b = await signedIn(CUSTOMERS[1]!.email);
    const victim = (await b.from("profiles").select("id")).data![0]!.id;

    const { error } = await a.from("addresses").insert({
      profile_id: victim,
      recipient: "Kẻ lạ",
      phone: "0900000009",
      line: "1 Đường Nào Đó",
      province_code: "29",
      ward_code: "70101063",
      label: "Khác",
      position: 99,
    });
    expect(error).not.toBeNull();
  });
});

describe("the address book's own writes", () => {
  it("adds, promotes and removes — and keeps exactly one default", async () => {
    const client = await signedIn(CUSTOMERS[2]!.email);

    const added = await client.rpc("add_address", {
      p_recipient: "Phạm Thu Hà",
      p_phone: "0931776205",
      p_line: "99 Thử Nghiệm",
      p_province_code: "29",
      p_ward_code: "70101063",
      p_label: "Khác",
      p_default: true,
    });
    expect(added.error).toBeNull();
    const id = added.data as string;

    const after = await client.from("addresses").select("id, is_default");
    expect(after.data!.filter((r) => r.is_default)).toHaveLength(1);
    expect(after.data!.find((r) => r.id === id)!.is_default).toBe(true);

    // Removing the default promotes the next one rather than leaving none.
    expect((await client.rpc("remove_address", { p_id: id })).data).toBe(true);
    const back = await client.from("addresses").select("id, is_default");
    expect(back.data!.filter((r) => r.is_default)).toHaveLength(1);
    expect(back.data!.map((r) => r.id)).not.toContain(id);
  });
});

describe("reset_demo, with the demo accounts in place", () => {
  it("is idempotent — same rows, same ids, twice over", async () => {
    const before = await admin
      .from("addresses")
      .select("id, profile_id, position, line, is_default")
      .order("id");

    const first = await admin.rpc("reset_demo");
    expect(first.error).toBeNull();
    const second = await admin.rpc("reset_demo");
    expect(second.error).toBeNull();

    const after = await admin
      .from("addresses")
      .select("id, profile_id, position, line, is_default")
      .order("id");

    expect(after.data).toEqual(before.data);
  });

  it("puts the eight demo accounts and their nine addresses back", async () => {
    await admin.rpc("reset_demo");

    const profiles = await admin
      .from("profiles")
      .select("handle, name, email, phone, joined_at")
      .not("handle", "is", null)
      .order("handle");

    expect(profiles.data).toHaveLength(CUSTOMERS.length);
    for (const customer of CUSTOMERS) {
      const row = profiles.data!.find((p) => p.handle === customer.id);
      expect(row, `no profile for ${customer.id}`).toBeDefined();
      expect(row!.name).toBe(customer.name);
      expect(row!.email).toBe(customer.email);
      expect(row!.phone).toBe(normalisePhone(customer.phone));
      // The fixture anchor is kept (QĐ-24), so the date is the fixture's.
      expect(row!.joined_at.slice(0, 10)).toBe(customer.joinedAt.slice(0, 10));
    }

    const addresses = await admin.from("addresses").select("id", { count: "exact", head: true });
    expect(addresses.count).toBe(CUSTOMERS.reduce((n, c) => n + c.addresses.length, 0));
  });

  it("undoes whatever a demo account added to its own book", async () => {
    const client = await signedIn(CUSTOMERS[3]!.email);
    await client.rpc("add_address", {
      p_recipient: "Võ Đức Duy",
      p_phone: "0977310892",
      p_line: "Chỗ thêm tay",
      p_province_code: "29",
      p_ward_code: "70101063",
      p_label: "Khác",
      p_default: false,
    });

    await admin.rpc("reset_demo");

    const left = await client.from("addresses").select("line");
    expect(left.data!.map((r) => r.line)).not.toContain("Chỗ thêm tay");
    expect(left.data).toHaveLength(CUSTOMERS[3]!.addresses.length);
  });
});

describe("npm run seed:users", () => {
  it("skips all eight on a second run rather than failing", () => {
    // The first run already happened — either by hand after `db reset` or in
    // the suite above — so this is the second, whatever the order.
    const out = seedUsers();
    expect(out).toMatch(/demo accounts: 0 created, 8 already there \(of 8\)/);
  });
});
