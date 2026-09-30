import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { readPlaceOrderPayload } from "@/lib/order-payload";
import type { Database, Json } from "./database.types";
import { toAdminOrders, toLookupAnswer, toOrder, toOrders } from "./order-dto";

/**
 * What slice B8 claims, checked against Postgres
 * (`20260927140000_optional_email.sql`). The e-mail is optional at checkout,
 * as the Feed mock has it, and the server asks for no agreement (user, 27/09):
 *
 *   · `place_order()` (v6) takes an order with no e-mail — the key absent,
 *     null, empty or blank — and stores `email` as null; a guest who gave
 *     none is logged by role alone (`actor` '', the log's word for an actor
 *     it cannot name);
 *   · an e-mail that IS typed must still look like one, by the same pattern
 *     as before: refused as BAD_INPUT, and nothing is written;
 *   · a good one is stored trimmed, and names the guest in the log, as before;
 *   · nothing asks for `agreed`: the request the Server Action builds from a
 *     Feed checkout — no box, no e-mail — goes through both of its layers,
 *     `readPlaceOrderPayload()` and `place_order()`;
 *   · every door an order is read through takes the null: the guest's
 *     receipt, the account's own list, the back office's book — each through
 *     the one mapper, `toOrder()` — and the public lookup, `lookup_order()`,
 *     finds such an order all the same, carrying no e-mail of any kind (it
 *     took over from `track_order()`, which slice B13 dropped).
 *
 * Instants the real clock cannot reach are named through the service role,
 * which `assert_now()` exempts on purpose; a signed-in caller acts on the
 * real clock, from `reset_demo(demo_anchor())`, as the app does.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`). Every test starts from a reset, and the file resets
 * onto the real clock's anchor once more when it ends.
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

/** A client that is nobody until it signs in, and keeps its session to itself. */
function fresh(): Client {
  return createClient<Database>(url!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** What a visitor gets: the publishable key, no session — the lookup's caller. */
const anon = fresh();

/** The service role — scripts and tests only. It may name any instant. */
const service = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signedIn(email: string): Promise<Client> {
  const client = fresh();
  const { error } = await client.auth.signInWithPassword({ email, password: demoPassword! });
  if (error) throw new Error(`could not sign in as a demo account: ${error.message}`);
  return client;
}

const MINHANH = CUSTOMERS[0]!;

/** The instant `data/` was frozen at, for the tests that name their own moments. */
const FIXTURE_ANCHOR = "2026-09-20T18:50:00+07:00";
/** Inside issue 05's window on the fixture's own day. */
const NOW = "2026-09-20T19:00:00+07:00";

/** The app's clock, exactly as a Server Action sends it. */
const now = () => toVnIso(demoNow());

async function resetOnto(anchor: string) {
  const { error } = await service.rpc("reset_demo", { p_anchor: anchor });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

/** `reset_demo(demo_anchor())`, the reset the app, the seed and the cron run. */
async function resetToRealAnchor() {
  const anchor = await service.rpc("demo_anchor");
  if (anchor.error) throw new Error(`demo_anchor failed: ${anchor.error.message}`);
  await resetOnto(anchor.data as string);
}

const PHONE = "0901234567";
const khoi = () => ({ productId: "p-khoi", color: "black", size: "M", qty: 1 });

/**
 * `p_input` as checkout sends it, with the e-mail left out entirely. `over`
 * adds one back — `{ email: null }`, `{ email: "" }` — or changes anything else.
 */
function basket(over: Record<string, unknown> = {}) {
  return {
    lines: [khoi()],
    recipient: "Khách Thử",
    phone: PHONE,
    provinceCode: "29",
    wardCode: "70101063",
    line: "1 Thử Nghiệm",
    note: "",
    delivery: "STANDARD",
    payment: "BANK_TRANSFER",
    promoCode: null,
    ...over,
  };
}

/** Place as a guest through the service role, which may name any moment. */
async function placeAsGuest(input: unknown, at: string): Promise<{ code: string; accessKey: string }> {
  const { data, error } = await service.rpc("place_order", { p_input: input as Json, p_now: at });
  if (error) throw new Error(`place_order refused: ${error.message}`);
  return data as { code: string; accessKey: string };
}

/** The order as the guest's own receipt reads it back — through the app's mapper. */
async function receipt(placed: { code: string; accessKey: string }) {
  const { data, error } = await service.rpc("receipt_order", {
    p_code: placed.code,
    p_key: placed.accessKey,
  });
  if (error || data === null) throw new Error(`receipt_order: ${error?.message}`);
  return toOrder(data);
}

/** What the row itself holds: null is null here, not "" read as nothing. */
async function emailOf(code: string): Promise<string | null> {
  const { data, error } = await service.from("orders").select("email").eq("code", code).single();
  if (error) throw new Error(error.message);
  return data.email;
}

async function placedEvent(code: string) {
  const { data, error } = await service
    .from("events")
    .select("kind, actor_role, actor")
    .eq("order_code", code)
    .eq("kind", "ORDER_PLACED")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function orderCount(): Promise<number> {
  const { count, error } = await service.from("orders").select("code", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function onHand(productId: string, color: string, size: string): Promise<number> {
  const { data, error } = await service
    .from("stock_cells")
    .select("on_hand")
    .eq("product_id", productId)
    .eq("color", color as never)
    .eq("size", size as never)
    .single();
  if (error) throw new Error(error.message);
  return data.on_hand;
}

async function setOnHand(productId: string, color: string, size: string, n: number) {
  const { error } = await service
    .from("stock_cells")
    .update({ on_hand: n })
    .eq("product_id", productId)
    .eq("color", color as never)
    .eq("size", size as never);
  if (error) throw new Error(error.message);
}

afterAll(async () => {
  await resetToRealAnchor();
});

// ─────────────────────────────────────────────────────── placing one
describe("place_order() v6: the e-mail is optional", () => {
  beforeEach(async () => {
    await resetOnto(FIXTURE_ANCHOR);
    await setOnHand("p-khoi", "black", "M", 50);
  });

  it("takes a guest's order with no e-mail and stores null — absent, null, empty or blank alike", async () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["absent", {}],
      ["null", { email: null }],
      ["empty", { email: "" }],
      ["blank", { email: "   " }],
    ];
    for (const [label, over] of cases) {
      const placed = await placeAsGuest(basket(over), NOW);
      expect(await emailOf(placed.code), label).toBeNull();
      const order = await receipt(placed);
      expect(order.email, label).toBeNull();
      expect(order.status, label).toEqual({ state: "AWAITING_TRANSFER", dueAt: "2026-09-21T07:00:00+07:00" });
      // Nobody to name: the log says "Khách" by role, as for every shopper.
      expect(await placedEvent(placed.code), label).toEqual({
        kind: "ORDER_PLACED",
        actor_role: "customer",
        actor: "",
      });
    }
  });

  it("refuses an e-mail that is typed but is not one — BAD_INPUT, and nothing is written", async () => {
    const before = { orders: await orderCount(), onHand: await onHand("p-khoi", "black", "M") };
    for (const email of ["khong-phai-email", "a@b", "a b@example.test", "@example.test", "khach@example.t"]) {
      const { error } = await service.rpc("place_order", { p_input: basket({ email }) as Json, p_now: NOW });
      expect(error?.message, email).toBe("BAD_INPUT");
    }
    expect(await orderCount()).toBe(before.orders);
    expect(await onHand("p-khoi", "black", "M")).toBe(before.onHand);
  });

  it("stores a good e-mail, trimmed, and logs the guest under it as before", async () => {
    const placed = await placeAsGuest(basket({ email: "  khach@example.test " }), NOW);
    expect(await emailOf(placed.code)).toBe("khach@example.test");
    expect((await receipt(placed)).email).toBe("khach@example.test");
    expect(await placedEvent(placed.code)).toEqual({
      kind: "ORDER_PLACED",
      actor_role: "customer",
      actor: "khach@example.test",
    });
  });
});

// ─────────────────────────────────── the Server Action's two layers, end to end
describe("no box, no e-mail: what the Feed checkout sends goes through both layers", () => {
  beforeEach(async () => {
    await resetOnto(FIXTURE_ANCHOR);
    await setOnHand("p-khoi", "black", "M", 50);
  });

  it("readPlaceOrderPayload() then place_order() take a request with no `agreed` and no e-mail", async () => {
    const draft = {
      recipient: "Khách Thử",
      phone: "090 123 4567",
      email: "",
      provinceCode: "29",
      wardCode: "70101063",
      line: "1 Thử Nghiệm",
      note: "",
      delivery: "STANDARD",
      payment: "COD",
    };
    for (const extra of [{}, { agreed: false }]) {
      const read = readPlaceOrderPayload({ lines: [khoi()], draft: { ...draft, ...extra }, promoCode: null });
      expect(read.ok, JSON.stringify(extra)).toBe(true);
      if (!read.ok) continue;
      expect(read.input.email).toBeNull();
      expect(Object.keys(read.input)).not.toContain("agreed");

      const placed = await placeAsGuest(read.input, NOW);
      expect(await emailOf(placed.code)).toBeNull();
      const order = await receipt(placed);
      expect(order.status).toEqual({ state: "RECEIVED" });
      expect(order.shipTo.phone).toBe(PHONE);
    }
  });
});

// ─────────────────────────────────────────── every door an order is read through
describe("every reader takes an order with no e-mail, on the real clock", () => {
  let manager: Client;
  let minhanh: Client;

  beforeAll(async () => {
    manager = await signedIn(DEMO_ADMIN.email);
    minhanh = await signedIn(MINHANH.email);
  });

  beforeEach(async () => {
    await resetToRealAnchor();
    await setOnHand("p-khoi", "black", "M", 50);
  });

  it("the receipt and the back office's book read it, email null, and the public lookup finds it", async () => {
    const placed = await placeAsGuest(basket(), now());
    expect((await receipt(placed)).email).toBeNull();

    // An order with no e-mail is still looked up by its code and number; the
    // lookup hands out no e-mail key at all, null or otherwise (slice B11).
    const looked = await anon.rpc("lookup_order", { p_code: placed.code, p_phone: PHONE });
    expect(looked.error).toBeNull();
    const answer = toLookupAnswer(looked.data);
    expect(answer.ok && answer.order.code).toBe(placed.code);
    expect(Object.keys((looked.data as { order: object }).order)).not.toContain("email");

    const book = await manager.rpc("admin_orders");
    expect(book.error).toBeNull();
    const orders = toAdminOrders(book.data);
    const mine = orders.find((o) => o.code === placed.code);
    expect(mine).toBeDefined();
    expect(mine!.email).toBeNull();
    expect(mine!.owner).toBeNull();
    // The sample orders beside it keep theirs.
    expect(orders.filter((o) => o.code !== placed.code).every((o) => typeof o.email === "string")).toBe(true);
  });

  it("a signed-in shopper may leave it empty too: the order keeps null, the log keeps the account", async () => {
    const placed = await minhanh.rpc("place_order", { p_input: basket({ email: "" }) as Json, p_now: now() });
    expect(placed.error).toBeNull();
    const { code } = placed.data as { code: string };
    expect(await emailOf(code)).toBeNull();
    expect(await placedEvent(code)).toEqual({
      kind: "ORDER_PLACED",
      actor_role: "customer",
      actor: MINHANH.email,
    });

    const list = await minhanh.rpc("my_orders");
    expect(list.error).toBeNull();
    const own = toOrders(list.data).find((o) => o.code === code);
    expect(own?.email).toBeNull();
  });
});
