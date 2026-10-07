import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { ORDERS } from "@/data/orders";
import { maskAdminOrder } from "@/lib/admin-mask";
import { isSampleOrder, type AdminOrder } from "@/lib/admin-orders";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import type { Database, Json } from "./database.types";
import { toAdminOrders } from "./order-dto";

/**
 * Slice B17 (QĐ-44): which orders of the book are the sample's, checked
 * against Postgres through a reset.
 *
 * The rule (`isSampleOrder`, `lib/admin-orders.ts`): an order is the sample's
 * when `reset_demo()` copied it from `seed_orders`, or when a sample account —
 * a visitor on "Đăng nhập thử" — placed it; anything else is a real person's,
 * and the back office masks it. Read off `customerId` (`orders.customer_handle`
 * through `order_json()`), which the two writers fill: the reset from the
 * seed, `place_order()` from the placing profile's handle.
 *
 *   (a) right after a reset, every order the manager reads is the sample's,
 *       and masking hands each back untouched;
 *   (b) a guest's order and a real account's order are real, and come back
 *       masked; a demo account's order is the sample's;
 *   (c) the next reset takes the three away, and the first guest order after
 *       it — numbered again from the sample's last — is real again.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`). The shop is put back on the real clock's anchor
 * before and after, and the real account made here is deleted.
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

type Client = SupabaseClient<Database>;
const noSession = { auth: { autoRefreshToken: false, persistSession: false } };

/** The service role — scripts and tests only. With no session, `place_order()` files a guest's order. */
const service: Client = createClient<Database>(url, secretKey, noSession);

async function signedIn(email: string, password = demoPassword!): Promise<Client> {
  const client = createClient<Database>(url!, publishableKey!, noSession);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`could not sign in as ${email}: ${error.message}`);
  return client;
}

/** The app's clock, exactly as a Server Action sends it. */
const now = () => toVnIso(demoNow());

async function resetToRealAnchor() {
  const anchor = await service.rpc("demo_anchor");
  if (anchor.error) throw new Error(`demo_anchor failed: ${anchor.error.message}`);
  const { error } = await service.rpc("reset_demo", { p_anchor: anchor.data });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

/** One plain tee, the fixed style that sells at any hour, to whoever `who` is. */
function basket(who: { recipient: string; phone: string; email: string | null }) {
  return {
    lines: [{ productId: "p-ao-thun-tron", color: "white", size: "M", qty: 1 }],
    ...who,
    provinceCode: "29",
    wardCode: "70101063",
    line: "47 Hẻm Mười Bảy",
    note: "Gọi trước khi giao",
    delivery: "STANDARD",
    payment: "COD",
    promoCode: null,
  };
}

async function place(client: Client, who: Parameters<typeof basket>[0]): Promise<string> {
  const { data, error } = await client.rpc("place_order", { p_input: basket(who) as unknown as Json, p_now: now() });
  if (error) throw new Error(`place_order refused: ${error.message}`);
  return (data as { code: string }).code;
}

let manager: Client;
let minhanh: Client;
let realUser = "";
let real: Client;
const realEmail = `b17-real-${randomBytes(4).toString("hex")}@example.test`;
const realPassword = `b17-${randomBytes(6).toString("hex")}`;

/** The book as the back office reads it, before any masking. */
async function book(): Promise<AdminOrder[]> {
  const { data, error } = await manager.rpc("admin_orders");
  if (error) throw new Error(`admin_orders failed: ${error.message}`);
  return toAdminOrders(data);
}

beforeAll(async () => {
  manager = await signedIn(DEMO_ADMIN.email);
  minhanh = await signedIn(CUSTOMERS[0]!.email);
  const made = await service.auth.admin.createUser({
    email: realEmail,
    password: realPassword,
    email_confirm: true,
    user_metadata: { name: "Peter Smith", phone: "" },
  });
  if (made.error) throw new Error(made.error.message);
  realUser = made.data.user.id;
  real = await signedIn(realEmail, realPassword);
  await resetToRealAnchor();
});

afterAll(async () => {
  await resetToRealAnchor();
  if (realUser) await service.auth.admin.deleteUser(realUser);
});

describe("(a) right after a reset", () => {
  it("every order the manager reads is the sample's, and masking leaves each as it is", async () => {
    const orders = await book();
    expect(orders.map((o) => String(o.code)).sort()).toEqual(ORDERS.map((o) => String(o.code)).sort());
    for (const o of orders) {
      expect(isSampleOrder(o), String(o.code)).toBe(true);
      expect(maskAdminOrder(o)).toBe(o);
    }
  });
});

describe("(b) orders placed after it", () => {
  const codes = { guest: "", real: "", demo: "" };

  beforeAll(async () => {
    codes.guest = await place(service, { recipient: "Mai Thị Hồng", phone: "0933444555", email: "hong.mai@example.test" });
    codes.real = await place(real, { recipient: "Peter Smith", phone: "0987654678", email: null });
    codes.demo = await place(minhanh, { recipient: CUSTOMERS[0]!.name, phone: "0912345678", email: null });
  });

  it("reads a guest's and a real account's order as real, a demo account's as the sample's", async () => {
    const orders = await book();
    const byCode = new Map(orders.map((o) => [String(o.code), o]));
    expect(isSampleOrder(byCode.get(codes.guest)!)).toBe(false);
    expect(isSampleOrder(byCode.get(codes.real)!)).toBe(false);
    expect(isSampleOrder(byCode.get(codes.demo)!)).toBe(true);
    expect(byCode.get(codes.demo)!.customerId).toBe(CUSTOMERS[0]!.id);
    expect(byCode.get(codes.real)!.owner?.id).toBe(realUser);
    expect(byCode.get(codes.real)!.owner?.handle).toBeNull();
    expect(orders.filter((o) => !isSampleOrder(o)).map((o) => String(o.code)).sort()).toEqual(
      [codes.guest, codes.real].sort(),
    );
  });

  it("masks the two real ones, and shows the demo account's in full", async () => {
    const orders = (await book()).map(maskAdminOrder);
    const byCode = new Map(orders.map((o) => [String(o.code), o]));
    const guest = byCode.get(codes.guest)!;
    const mine = byCode.get(codes.real)!;
    const demo = byCode.get(codes.demo)!;
    expect([guest.shipTo.recipient, guest.shipTo.line, guest.email, guest.note]).toEqual([
      "Mai H.",
      "•••",
      "ho•••@example.test",
      "•••",
    ]);
    expect([mine.shipTo.recipient, mine.owner?.name, mine.owner?.email]).toEqual([
      "Peter S.",
      "Peter S.",
      `${realEmail.slice(0, 2)}•••@example.test`,
    ]);
    expect(JSON.stringify([guest, mine])).not.toMatch(/Mai Thị Hồng|0933444555|hong\.mai@|Peter Smith|0987654678|Hẻm Mười Bảy|Gọi trước/);
    expect(demo.shipTo.recipient).toBe(CUSTOMERS[0]!.name);
    expect(demo.shipTo.line).toBe("47 Hẻm Mười Bảy");
  });
});

describe("(c) the next reset", () => {
  it("takes the three away, and the next guest order is real again", async () => {
    const before = (await book()).filter((o) => !isSampleOrder(o)).map((o) => String(o.code));
    expect(before.length).toBeGreaterThan(0);

    await resetToRealAnchor();
    const after = await book();
    expect(after).toHaveLength(ORDERS.length);
    expect(after.every(isSampleOrder)).toBe(true);

    // Numbered again from the sample's last, so a code alone could not tell
    // this order from the one the reset took away; its handle can.
    const again = await place(service, { recipient: "Mai Thị Hồng", phone: "0933444555", email: null });
    const read = (await book()).find((o) => String(o.code) === again)!;
    expect(isSampleOrder(read)).toBe(false);
    expect(before).toContain(again);
  });
});
