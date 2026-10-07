import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { DEMO_EMAILS } from "@/lib/demo-accounts";
import type { Database, Json } from "./database.types";

/**
 * Slice B17 (QĐ-45): the daily reset deletes every account that is not part
 * of the sample, with all of its data — checked against the local stack, on
 * the path `/api/reset` takes: `reset_demo()`, then `deleteRealAccounts()`.
 *
 *   (a) two real accounts, each with addresses (one of them removed, so
 *       `removed_addresses` holds a row), a saved style, a reminder, a size
 *       and an order, are gone afterwards — the auth user and every row of
 *       `profiles`, `addresses`, `removed_addresses`, `favorites`,
 *       `reminders`, `account_settings` and `orders` that was theirs — and,
 *       measured once more without the reset, each foreign key on its own;
 *   (b) the nine shared demo accounts are all still there, keep their
 *       handles, and still open with `DEMO_PASSWORD`;
 *   (c) nobody but the service role may ask `real_accounts()` who is real.
 *
 * `deleteRealAccounts` runs as it does in the cron: through
 * `getServiceSupabase()` and the secret key of `.env.local`. Only the
 * build-time `server-only` marker and `next/headers` are stood in for. It
 * deletes EVERY account without a handle on this database, not only the two
 * made here — on the local stack, exactly what the brief asks the slice to
 * leave behind.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`).
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

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const { deleteRealAccounts } = await import("./demo-accounts");

type Client = SupabaseClient<Database>;
const noSession = { auth: { autoRefreshToken: false, persistSession: false } };

/** The service role — scripts and tests only. */
const service: Client = createClient<Database>(url, secretKey, noSession);
const anon: Client = createClient<Database>(url, publishableKey, noSession);

async function signedIn(email: string, password = demoPassword!): Promise<Client> {
  const client = createClient<Database>(url!, publishableKey!, noSession);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`could not sign in as ${email}: ${error.message}`);
  return client;
}

const now = () => toVnIso(demoNow());

async function resetToRealAnchor() {
  const anchor = await service.rpc("demo_anchor");
  if (anchor.error) throw new Error(`demo_anchor failed: ${anchor.error.message}`);
  const { error } = await service.rpc("reset_demo", { p_anchor: anchor.data });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

/** Every row of one account's own data, table by table, read with the service key. */
async function rowsOf(id: string): Promise<Record<string, number>> {
  const count = async (table: "profiles" | "addresses" | "removed_addresses" | "favorites" | "reminders" | "account_settings" | "orders", column: string) => {
    const { count: n, error } = await service.from(table).select("*", { count: "exact", head: true }).eq(column, id);
    if (error) throw new Error(`${table}: ${error.message}`);
    return n ?? 0;
  };
  return {
    profiles: await count("profiles", "id"),
    addresses: await count("addresses", "profile_id"),
    removed_addresses: await count("removed_addresses", "profile_id"),
    favorites: await count("favorites", "profile_id"),
    reminders: await count("reminders", "profile_id"),
    account_settings: await count("account_settings", "profile_id"),
    orders: await count("orders", "profile_id"),
  };
}

interface Made {
  id: string;
  email: string;
  order: string;
}
const made: Made[] = [];

/** A real account with a bit of everything an account can keep. */
async function realAccount(name: string): Promise<Made> {
  const email = `b17-gone-${randomBytes(4).toString("hex")}@example.test`;
  const password = `b17-${randomBytes(6).toString("hex")}`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone: "" },
  });
  if (created.error) throw new Error(created.error.message);
  const id = created.data.user.id;
  const entry: Made = { id, email, order: "" };
  made.push(entry);

  const me = await signedIn(email, password);
  const address = (position: number, isDefault: boolean) => ({
    profile_id: id,
    position,
    recipient: name,
    phone: "0987654678",
    line: `${position + 12} Hẻm Mười Bảy`,
    province_code: "29",
    ward_code: "70101063",
    label: "Nhà",
    is_default: isDefault,
  });
  const book = await me.from("addresses").insert([address(0, true), address(1, false)]).select("id, position");
  if (book.error) throw new Error(`addresses: ${book.error.message}`);
  const second = book.data.find((a) => a.position === 1)!;
  const steps = [
    await me.rpc("remove_address", { p_id: second.id }),
    await me.rpc("save_favorite", { p_product_id: "p-khoi", p_color: "black" }),
    await me.rpc("set_reminder", { p_drop_no: 6, p_on: true }),
    await me.rpc("set_my_size", { p_slot: "top", p_size: "M" }),
  ];
  for (const s of steps) if (s.error) throw new Error(s.error.message);

  const order = await me.rpc("place_order", {
    p_input: {
      lines: [{ productId: "p-ao-thun-tron", color: "white", size: "M", qty: 1 }],
      recipient: name,
      phone: "0987654678",
      email: null,
      provinceCode: "29",
      wardCode: "70101063",
      line: "12 Hẻm Mười Bảy",
      note: "",
      delivery: "STANDARD",
      payment: "COD",
      promoCode: null,
    } as unknown as Json,
    p_now: now(),
  });
  if (order.error) throw new Error(`place_order refused: ${order.error.message}`);
  entry.order = (order.data as { code: string }).code;
  await me.auth.signOut({ scope: "local" });
  return entry;
}

beforeAll(async () => {
  await resetToRealAnchor();
  await realAccount("Peter Smith");
  await realAccount("Mai Thị Hồng");
});

afterAll(async () => {
  // Whatever the tests left behind, so a failure cannot leave an account.
  for (const m of made) await service.auth.admin.deleteUser(m.id);
  await resetToRealAnchor();
});

describe("(a) the cron's path deletes the real accounts with all their data", () => {
  it("has something to delete to begin with", async () => {
    for (const m of made) {
      expect(await rowsOf(m.id)).toEqual({
        profiles: 1,
        addresses: 1,
        removed_addresses: 1,
        favorites: 1,
        reminders: 1,
        account_settings: 1,
        orders: 1,
      });
    }
    const listed = await service.rpc("real_accounts");
    expect(listed.error).toBeNull();
    const ids = (listed.data ?? []).map((r) => r.id);
    for (const m of made) expect(ids).toContain(m.id);
    // The sample's nine are never listed: each has its handle.
    const emails = (listed.data ?? []).map((r) => r.email.toLowerCase());
    for (const e of DEMO_EMAILS) expect(emails).not.toContain(e.toLowerCase());
  });

  it("leaves no account, profile, address, saved style, reminder, setting or order of theirs", async () => {
    await resetToRealAnchor();
    const sweep = await deleteRealAccounts();
    expect(sweep).not.toBeNull();
    expect(sweep!.failed).toBe(0);
    expect(sweep!.deleted).toBeGreaterThanOrEqual(made.length);

    for (const m of made) {
      const user = await service.auth.admin.getUserById(m.id);
      expect(user.data.user, m.email).toBeNull();
      expect(await rowsOf(m.id)).toEqual({
        profiles: 0,
        addresses: 0,
        removed_addresses: 0,
        favorites: 0,
        reminders: 0,
        account_settings: 0,
        orders: 0,
      });
      const order = await service.from("orders").select("code", { count: "exact", head: true }).eq("code", m.order);
      // The reset took the order; a code can come back with the next one placed, never theirs.
      expect(order.count).toBe(0);
    }
    const left = await service.rpc("real_accounts");
    expect(left.data).toEqual([]);
  });

  it("measured without the reset, every table cascades and the order is let go of", async () => {
    // Each foreign key on its own, as the brief asks: `removed_addresses` is
    // emptied by every reset anyway, and an order goes with the reset, so the
    // cron's path above cannot show what deleting the user alone does.
    const m = await realAccount("Lâm Quốc Bảo");
    expect((await rowsOf(m.id)).removed_addresses).toBe(1);

    const sweep = await deleteRealAccounts();
    expect(sweep).toEqual({ deleted: 1, failed: 0 });
    expect(await rowsOf(m.id)).toEqual({
      profiles: 0,
      addresses: 0,
      removed_addresses: 0,
      favorites: 0,
      reminders: 0,
      account_settings: 0,
      orders: 0,
    });
    // `orders.profile_id` is `on delete set null`: the order stays, nobody's,
    // until the reset takes it — which is why the cron resets first.
    const order = await service.from("orders").select("code, profile_id, customer_handle").eq("code", m.order).single();
    expect(order.data).toEqual({ code: m.order, profile_id: null, customer_handle: null });
  });
});

describe("(b) the nine shared demo accounts", () => {
  it("are all still there, each with its handle", async () => {
    const { data, error } = await service.from("profiles").select("email, handle").not("handle", "is", null);
    expect(error).toBeNull();
    const kept = (data ?? []).map((p) => p.email.toLowerCase()).sort();
    expect(kept).toEqual(DEMO_EMAILS.map((e) => e.toLowerCase()).sort());
  });

  it("still open with DEMO_PASSWORD", async () => {
    for (const email of DEMO_EMAILS) {
      const client = createClient<Database>(url!, publishableKey!, noSession);
      const { error } = await client.auth.signInWithPassword({ email, password: demoPassword! });
      expect(error, email).toBeNull();
      await client.auth.signOut({ scope: "local" });
    }
  });
});

describe("(c) who may ask who is real", () => {
  it("is the service role alone", async () => {
    const visitor = await anon.rpc("real_accounts");
    expect(visitor.error, "a visitor was answered").not.toBeNull();
    expect(visitor.data).toBeNull();
    const shopper = await signedIn(CUSTOMERS[0]!.email);
    const asked = await shopper.rpc("real_accounts");
    expect(asked.error, "a signed-in shopper was answered").not.toBeNull();
    expect(asked.data).toBeNull();
    await shopper.auth.signOut({ scope: "local" });
    const own = await service.rpc("real_accounts");
    expect(own.error).toBeNull();
  });
});
