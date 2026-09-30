import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { ordersOf } from "@/data/orders";
import type { PaymentMethod } from "@/data/types";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import type { Database, Json } from "./database.types";
import { toLookupAnswer, toOrder, toOrders } from "./order-dto";

/**
 * What slice B10 claims about orders, checked against Postgres
 * (`20260930090000_step_moments_address_undo.sql`): `order_json()` hands out
 * every step's moment the `orders` row holds — paid, handed over, delivered —
 * under a new key, `moments`, and leaves `status` exactly as it was.
 *
 *   · an order walked through the back office to DELIVERED has all three,
 *     each the instant its move was made;
 *   · one on its way keeps when it was paid;
 *   · a transfer still awaited has none — its placing is `placedAt`;
 *   · a COD order handed over from RECEIVED has no payment to show;
 *   · the three doors — the account, the lookup (`lookup_order()`, since
 *     slice B13 dropped `track_order()`), the receipt — hand out the same
 *     `moments`;
 *   · the sample orders come back with every step `data/orders.ts` gives
 *     them (seeded into `paid_at` and `shipped_at`), DH-2416 with the mock's
 *     own DH-1496 times.
 *
 * The moves are made by the demo manager on the real clock, a minute apart
 * and inside the five minutes `assert_now()` allows (at most three back, and
 * `toVnIso` writes to the minute), so a moment written to the wrong key would
 * show. Needs a running stack, `.env.local` and the demo
 * accounts (`npm run seed:users`); every test starts from
 * `reset_demo(demo_anchor())` and the file ends on one.
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

/** What a visitor gets: the publishable key, no session. */
const anon = fresh();

/** The service role — scripts and tests only. */
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

/** The instant `data/` was frozen at, for the test that compares with the fixture. */
const FIXTURE_ANCHOR = "2026-09-20T18:50:00+07:00";

/** `n` minutes before the real now, as a Server Action writes an instant (to the minute). */
const minutesAgo = (n: number) => toVnIso(new Date(Date.now() - n * 60_000));

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

async function setOnHand(productId: string, color: string, size: string, n: number) {
  const { error } = await service
    .from("stock_cells")
    .update({ on_hand: n })
    .eq("product_id", productId)
    .eq("color", color as never)
    .eq("size", size as never);
  if (error) throw new Error(error.message);
}

/** `p_input` as the Feed checkout sends it, for one KHÓI đen M. */
function basket(payment: PaymentMethod) {
  return {
    lines: [{ productId: "p-khoi", color: "black", size: "M", qty: 1 }],
    recipient: "Trần Minh Anh",
    phone: "0912345678",
    email: null,
    provinceCode: "29",
    wardCode: "70101063",
    line: "24 Nguyễn Thị Minh Khai",
    note: "",
    delivery: "STANDARD",
    payment,
    promoCode: null,
  };
}

let minhanh: Client;
let manager: Client;

beforeAll(async () => {
  minhanh = await signedIn(MINHANH.email);
  manager = await signedIn(DEMO_ADMIN.email);
});

afterAll(async () => {
  await resetToRealAnchor();
});

/** Place one as the demo shopper, `placedMinutesAgo` minutes back: its code and the instant it was placed at. */
async function place(payment: PaymentMethod, placedMinutesAgo: number): Promise<{ code: string; at: string }> {
  const at = minutesAgo(placedMinutesAgo);
  const { data, error } = await minhanh.rpc("place_order", {
    p_input: basket(payment) as unknown as Json,
    p_now: at,
  });
  if (error) throw new Error(`place_order refused: ${error.message}`);
  return { code: (data as { code: string }).code, at };
}

async function markPaid(code: string, at: string) {
  const { error } = await manager.rpc("admin_mark_paid", { p_code: code, p_now: at });
  if (error) throw new Error(`admin_mark_paid refused: ${error.message}`);
}

async function handOver(code: string, at: string) {
  const { error } = await manager.rpc("admin_hand_over", {
    p_code: code,
    p_carrier: "Giao tiêu chuẩn",
    p_tracking_code: "VNP-B10-01",
    p_note: "",
    p_now: at,
  });
  if (error) throw new Error(`admin_hand_over refused: ${error.message}`);
}

async function markDelivered(code: string, at: string) {
  const { error } = await manager.rpc("admin_mark_delivered", { p_code: code, p_now: at });
  if (error) throw new Error(`admin_mark_delivered refused: ${error.message}`);
}

/** The order through the account's own door, exactly as `order_json()` wrote it. */
async function wireOf(code: string): Promise<Record<string, unknown>> {
  const { data, error } = await minhanh.rpc("order_json", { p_code: code });
  if (error || data === null) throw new Error(`order_json: ${error?.message ?? "null"}`);
  return data as Record<string, unknown>;
}

const same = (a: string | undefined, b: string) => a !== undefined && Date.parse(a) === Date.parse(b);

describe("order_json(): every step's moment, under `moments`", () => {
  beforeEach(async () => {
    await resetToRealAnchor();
    await setOnHand("p-khoi", "black", "M", 20);
  });

  it("gives a delivered order its payment, its handover and its delivery — status unchanged", async () => {
    const { code } = await place("BANK_TRANSFER", 3);
    const paid = minutesAgo(2);
    const shipped = minutesAgo(1);
    const delivered = minutesAgo(0);
    await markPaid(code, paid);
    await handOver(code, shipped);
    await markDelivered(code, delivered);

    const wire = await wireOf(code);
    // `status` is the shape it always was: the state and its own moment.
    expect(Object.keys(wire.status as object).sort()).toEqual(["deliveredAt", "state"]);
    expect(Object.keys(wire.moments as object).sort()).toEqual(["deliveredAt", "paidAt", "shippedAt"]);

    const order = toOrder(wire);
    expect(order.status.state).toBe("DELIVERED");
    expect(same(order.moments?.paidAt, paid)).toBe(true);
    expect(same(order.moments?.shippedAt, shipped)).toBe(true);
    expect(same(order.moments?.deliveredAt, delivered)).toBe(true);
    expect(order.status).toEqual({ state: "DELIVERED", deliveredAt: order.moments!.deliveredAt });
  });

  it("keeps the payment's moment on an order on its way", async () => {
    const { code } = await place("CARD", 2);
    const paid = minutesAgo(1);
    const shipped = minutesAgo(0);
    await markPaid(code, paid);
    await handOver(code, shipped);

    const order = toOrder(await wireOf(code));
    expect(order.status).toMatchObject({ state: "SHIPPING", trackingCode: "VNP-B10-01" });
    expect(Object.keys(order.moments!).sort()).toEqual(["paidAt", "shippedAt"]);
    expect(same(order.moments!.paidAt, paid)).toBe(true);
    expect(same(order.moments!.shippedAt, shipped)).toBe(true);
  });

  it("gives a transfer still awaited no moment beyond its placing", async () => {
    const { code, at } = await place("BANK_TRANSFER", 1);
    const wire = await wireOf(code);
    expect(wire.moments).toEqual({});

    const order = toOrder(wire);
    expect(order.status.state).toBe("AWAITING_TRANSFER");
    expect("moments" in order).toBe(false);
    expect(same(order.placedAt, at)).toBe(true);
  });

  it("gives a COD order handed over from RECEIVED no payment: it pays at the door", async () => {
    const { code } = await place("COD", 2);
    await handOver(code, minutesAgo(1));
    await markDelivered(code, minutesAgo(0));

    const order = toOrder(await wireOf(code));
    expect(order.status.state).toBe("DELIVERED");
    expect(Object.keys(order.moments!).sort()).toEqual(["deliveredAt", "shippedAt"]);
  });

  it("hands out the same moments through the lookup and the receipt as through the account", async () => {
    const placed = await minhanh.rpc("place_order", {
      p_input: basket("BANK_TRANSFER") as unknown as Json,
      p_now: minutesAgo(2),
    });
    expect(placed.error).toBeNull();
    const { code, accessKey } = placed.data as { code: string; accessKey: string };
    await markPaid(code, minutesAgo(1));
    await handOver(code, minutesAgo(0));

    const mine = toOrder(await wireOf(code)).moments;
    const looked = await anon.rpc("lookup_order", { p_code: code, p_phone: "0912345678" });
    const receipt = await anon.rpc("receipt_order", { p_code: code, p_key: accessKey });
    const answer = toLookupAnswer(looked.data);
    expect(answer.ok).toBe(true);
    expect(answer.ok ? answer.order.moments : "no order").toEqual(mine);
    expect(toOrder(receipt.data).moments).toEqual(mine);
    expect(Object.keys(mine!).sort()).toEqual(["paidAt", "shippedAt"]);
  });
});

describe("the sample orders", () => {
  it("come back with every step the fixture gives them, their status untouched", async () => {
    await resetOnto(FIXTURE_ANCHOR);
    const mine = toOrders((await minhanh.rpc("my_orders")).data);
    const want = ordersOf(MINHANH.id);
    expect(mine.map((o) => o.code)).toEqual(want.map((o) => o.code));

    for (const o of want) {
      const got = mine.find((m) => m.code === o.code)!;
      expect(got.moments, o.code).toEqual(o.moments);
      expect(got.status, o.code).toEqual(o.status);
    }
    // The mock's DH-1496 under this sample's number: every step stamped as the mock stamps it.
    expect(mine.find((o) => o.code === "DH-2416")!.moments).toEqual({
      paidAt: "2026-09-11T21:52:00+07:00",
      shippedAt: "2026-09-13T08:20:00+07:00",
      deliveredAt: "2026-09-16T10:02:00+07:00",
    });
  });

  it("keep their hours and minutes through a reset onto the real clock's anchor", async () => {
    await resetToRealAnchor();
    const mine = toOrders((await minhanh.rpc("my_orders")).data);
    for (const o of ordersOf(MINHANH.id)) {
      const got = mine.find((m) => m.code === o.code)!;
      const clock = (m: typeof o.moments) =>
        m && Object.fromEntries(Object.entries(m).map(([k, v]) => [k, (v as string).slice(11, 16)]));
      expect(clock(got.moments), o.code).toEqual(clock(o.moments));
    }
  });
});
