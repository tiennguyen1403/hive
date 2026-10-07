import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import type { PaymentMethod } from "@/data/types";
import { demoNow } from "@/lib/clock";
import { CARD_OVERDUE_REASON, CUSTOMER_CANCEL_REASON, OVERDUE_REASON } from "@/lib/customer-orders";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { orderTotalVnd } from "@/lib/orders";
import type { Database, Json } from "./database.types";
import { toAdminOrders, toOrder } from "./order-dto";

/**
 * What slice B18 claims, checked against Postgres
 * (`20261007180000_card_checkout.sql`):
 *
 *   · the three moves of the server — `card_session()`, `card_checkout_opened()`,
 *     `card_mark_paid()` — are the service role's alone: neither a visitor, a
 *     shopper nor the manager can call them, and no API role can write the
 *     two Stripe columns of `orders` directly;
 *   · `card_checkout_opened()` keeps a session only on a card order still
 *     inside its hold;
 *   · `card_mark_paid()` makes a waiting card order PAID with its session and
 *     payment intent and an `ORDER_PAID` by the system marked `via: "STRIPE"`;
 *     says ALREADY_PAID however often it is asked again; checks the amount
 *     against the order's own lines; never revives a cancelled order — one
 *     system note per payment asks the shop to refund it by hand — and lets a
 *     hold that ran out go first, as "quá hạn thanh toán";
 *   · `admin_mark_paid()` refuses a card order; `admin_orders()` carries the
 *     card's Stripe side for the back office, and `order_json()` — the shape
 *     the public lookup hands out — carries none of it.
 *
 * Needs a running stack, `.env.local` and the demo accounts
 * (`npm run seed:users`). Every test starts from a reset onto the real
 * clock's anchor, and the file resets once more when it ends.
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

function fresh(): Client {
  return createClient<Database>(url!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** The service role — what the app's server calls the three functions with. */
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
const now = () => toVnIso(demoNow());
const shifted = (hours: number) => toVnIso(new Date(Date.now() + hours * 3_600_000));

async function resetToRealAnchor() {
  const anchor = await service.rpc("demo_anchor");
  if (anchor.error) throw new Error(`demo_anchor failed: ${anchor.error.message}`);
  const { error } = await service.rpc("reset_demo", { p_anchor: anchor.data as string });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

function basket(payment: PaymentMethod) {
  return {
    lines: [{ productId: "p-khoi", color: "black", size: "M", qty: 2 }],
    recipient: "Khách Thử",
    phone: "0901234567",
    email: "khach@example.test",
    provinceCode: "29",
    wardCode: "70101063",
    line: "1 Thử Nghiệm",
    note: "",
    delivery: "STANDARD",
    payment,
    promoCode: null,
  };
}

/** Placed as a guest through the service role, which may name any moment; with what the receipt reads back. */
async function placeAsGuest(payment: PaymentMethod, at: string = now()) {
  const { data, error } = await service.rpc("place_order", { p_input: basket(payment) as unknown as Json, p_now: at });
  if (error) throw new Error(`place_order refused: ${error.message}`);
  const placed = data as { code: string; accessKey: string };
  const back = await service.rpc("receipt_order", { p_code: placed.code, p_key: placed.accessKey });
  if (back.error || back.data === null) throw new Error(`receipt_order: ${back.error?.message}`);
  const order = toOrder(back.data);
  return { code: placed.code, accessKey: placed.accessKey, order, totalVnd: orderTotalVnd(order) };
}

async function rowOf(code: string) {
  const { data, error } = await service
    .from("orders")
    .select("state, paid_at, cancel_reason, stripe_session_id, stripe_payment_intent")
    .eq("code", code)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function eventsOf(code: string) {
  const { data, error } = await service.from("events").select("kind, actor_role, actor, payload").eq("order_code", code).order("id");
  if (error) throw new Error(error.message);
  return data;
}

const SESSION = "cs_test_b18dbtest0001";
const INTENT = "pi_b18dbtest0001";

function markPaid(code: string, amount: number, over: Partial<Record<"p_session_id" | "p_payment_intent" | "p_now", string>> = {}) {
  return service.rpc("card_mark_paid", {
    p_code: code,
    p_session_id: SESSION,
    p_payment_intent: INTENT,
    p_amount_vnd: amount,
    p_now: now(),
    ...over,
  });
}

let manager: Client;
let minhanh: Client;

beforeAll(async () => {
  manager = await signedIn(DEMO_ADMIN.email);
  minhanh = await signedIn(MINHANH.email);
});

beforeEach(async () => {
  await resetToRealAnchor();
  const { error } = await service.from("stock_cells").update({ on_hand: 50 }).eq("product_id", "p-khoi").eq("color", "black").eq("size", "M");
  if (error) throw new Error(error.message);
});

afterAll(async () => {
  await resetToRealAnchor();
});

// ─────────────────────────────────────────────────────────── who may call
describe("the server's three moves are the service role's alone", () => {
  it("refuses a visitor, a shopper and the manager", async () => {
    const { code, totalVnd } = await placeAsGuest("CARD");
    for (const [who, client] of [
      ["visitor", fresh()],
      ["shopper", minhanh],
      ["manager", manager],
    ] as const) {
      const session = await client.rpc("card_session", { p_code: code });
      expect(session.error, `${who} card_session`).not.toBeNull();
      const opened = await client.rpc("card_checkout_opened", { p_code: code, p_session_id: SESSION, p_now: now() });
      expect(opened.error, `${who} card_checkout_opened`).not.toBeNull();
      const paid = await client.rpc("card_mark_paid", {
        p_code: code,
        p_session_id: SESSION,
        p_payment_intent: INTENT,
        p_amount_vnd: totalVnd,
        p_now: now(),
      });
      expect(paid.error, `${who} card_mark_paid`).not.toBeNull();
    }
    const row = await rowOf(code);
    expect(row).toMatchObject({ state: "AWAITING_TRANSFER", stripe_session_id: null, stripe_payment_intent: null });
  });

  it("lets no API role write the two Stripe columns directly", async () => {
    const { code } = await placeAsGuest("CARD");
    const byManager = await manager.from("orders").update({ stripe_payment_intent: INTENT, state: "PAID" }).eq("code", code);
    expect(byManager.error).not.toBeNull();
    const byShopper = await minhanh.from("orders").update({ stripe_session_id: SESSION }).eq("code", code);
    expect(byShopper.error).not.toBeNull();
    expect(await rowOf(code)).toMatchObject({ state: "AWAITING_TRANSFER", stripe_session_id: null, stripe_payment_intent: null });
  });

  it("keeps Stripe's ids off every order that is not a card order", async () => {
    const { code } = await placeAsGuest("BANK_TRANSFER");
    const forced = await service.from("orders").update({ stripe_session_id: SESSION }).eq("code", code);
    expect(forced.error?.message).toMatch(/orders_stripe_only_card/);
  });
});

// ───────────────────────────────────────────────────────── opening a page
describe("card_checkout_opened(): a page for a card order inside its hold", () => {
  it("keeps the session on the order, and card_session() reads it back", async () => {
    const { code } = await placeAsGuest("CARD");
    const opened = await service.rpc("card_checkout_opened", { p_code: code, p_session_id: SESSION, p_now: now() });
    expect(opened.error).toBeNull();
    expect((await service.rpc("card_session", { p_code: code })).data).toBe(SESSION);
    expect((await rowOf(code)).stripe_session_id).toBe(SESSION);
  });

  it("refuses an order that is not a card order, one past its hold, and an id that is not a test session's", async () => {
    const transfer = await placeAsGuest("BANK_TRANSFER");
    expect((await service.rpc("card_checkout_opened", { p_code: transfer.code, p_session_id: SESSION, p_now: now() })).error?.message).toBe(
      "NOT_ALLOWED",
    );
    expect((await service.rpc("card_session", { p_code: transfer.code })).data).toBeNull();
    const late = await placeAsGuest("CARD", shifted(-13));
    expect((await service.rpc("card_checkout_opened", { p_code: late.code, p_session_id: SESSION, p_now: now() })).error?.message).toBe(
      "NOT_ALLOWED",
    );
    const card = await placeAsGuest("CARD");
    for (const bad of ["cs_live_abc123", "cs_test_", "cs_test_a b", "anything"]) {
      expect((await service.rpc("card_checkout_opened", { p_code: card.code, p_session_id: bad, p_now: now() })).error?.message, bad).toBe(
        "BAD_INPUT",
      );
    }
    expect((await service.rpc("card_checkout_opened", { p_code: "DH-9999", p_session_id: SESSION, p_now: now() })).error?.message).toBe(
      "NOT_FOUND",
    );
  });
});

// ─────────────────────────────────────────────────────────── marking paid
describe("card_mark_paid(): what Stripe says, recorded", () => {
  it("makes a waiting card order PAID, keeps Stripe's ids, and logs it as the system, via Stripe", async () => {
    const { code, totalVnd } = await placeAsGuest("CARD");
    const at = now();
    const paid = await markPaid(code, totalVnd, { p_now: at });
    expect(paid.error).toBeNull();
    expect(paid.data).toBe("PAID");
    const row = await rowOf(code);
    expect(row).toMatchObject({ state: "PAID", stripe_session_id: SESSION, stripe_payment_intent: INTENT });
    expect(Date.parse(row.paid_at!)).toBe(Date.parse(at));
    expect((await eventsOf(code)).at(-1)).toEqual({
      kind: "ORDER_PAID",
      actor_role: "system",
      actor: "",
      payload: { from: "AWAITING_TRANSFER", via: "STRIPE", paymentIntent: INTENT },
    });
  });

  it("is idempotent: asked again, it says ALREADY_PAID and writes nothing more", async () => {
    const { code, totalVnd } = await placeAsGuest("CARD");
    expect((await markPaid(code, totalVnd)).data).toBe("PAID");
    const again = await markPaid(code, totalVnd);
    expect(again.error).toBeNull();
    expect(again.data).toBe("ALREADY_PAID");
    expect((await eventsOf(code)).filter((e) => e.kind === "ORDER_PAID")).toHaveLength(1);
  });

  it("checks the amount against the order's own lines, and refuses ids that are not Stripe's", async () => {
    const { code, totalVnd } = await placeAsGuest("CARD");
    expect((await markPaid(code, totalVnd * 100)).error?.message).toBe("BAD_INPUT");
    expect((await markPaid(code, totalVnd - 1)).error?.message).toBe("BAD_INPUT");
    expect((await markPaid(code, totalVnd, { p_session_id: "cs_live_abc" })).error?.message).toBe("BAD_INPUT");
    expect((await markPaid(code, totalVnd, { p_payment_intent: "ch_abc" })).error?.message).toBe("BAD_INPUT");
    expect((await rowOf(code)).state).toBe("AWAITING_TRANSFER");
  });

  it("refuses an order that is not a card order, and one that does not exist", async () => {
    const { code, totalVnd } = await placeAsGuest("BANK_TRANSFER");
    expect((await markPaid(code, totalVnd)).error?.message).toBe("NOT_ALLOWED");
    expect((await markPaid("DH-9999", totalVnd)).error?.message).toBe("NOT_FOUND");
  });

  it("never revives an order called off before the money came; one note per payment asks for a refund by hand", async () => {
    const placed = await minhanh.rpc("place_order", { p_input: basket("CARD") as unknown as Json, p_now: now() });
    expect(placed.error).toBeNull();
    const { code } = placed.data as { code: string };
    // The total as the shopper's own read of the order prices it.
    const { data: json } = await minhanh.rpc("order_json", { p_code: code });
    const totalVnd = orderTotalVnd(toOrder(json));
    expect((await minhanh.rpc("cancel_order", { p_code: code, p_now: now() })).error).toBeNull();

    const late = await markPaid(code, totalVnd);
    expect(late.error).toBeNull();
    expect(late.data).toBe("CANCELLED");
    const row = await rowOf(code);
    expect(row).toMatchObject({ state: "CANCELLED", cancel_reason: CUSTOMER_CANCEL_REASON, stripe_payment_intent: null });
    const notes = (await eventsOf(code)).filter((e) => e.kind === "ORDER_NOTE");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ actor_role: "system", payload: { via: "STRIPE", paymentIntent: INTENT } });

    expect((await markPaid(code, totalVnd)).data).toBe("CANCELLED");
    expect((await eventsOf(code)).filter((e) => e.kind === "ORDER_NOTE")).toHaveLength(1);
  });

  it("lets a hold that ran out go first: paid too late, the order is cancelled for want of a card payment", async () => {
    const { code, totalVnd } = await placeAsGuest("CARD", shifted(-13));
    expect((await rowOf(code)).state).toBe("AWAITING_TRANSFER");
    expect((await markPaid(code, totalVnd)).data).toBe("CANCELLED");
    expect((await rowOf(code)).cancel_reason).toBe(CARD_OVERDUE_REASON);
    expect((await eventsOf(code)).map((e) => e.kind)).toEqual(["ORDER_PLACED", "ORDER_EXPIRED", "ORDER_NOTE"]);
  });
});

// ─────────────────────────────────────────────────────────── the sweep
describe("expire_and_lock() v4: the reason names what never came", () => {
  it("cancels a card order's hold as 'quá hạn thanh toán', a transfer's as 'quá hạn chuyển khoản'", async () => {
    const card = await placeAsGuest("CARD", shifted(-13));
    const transfer = await placeAsGuest("BANK_TRANSFER", shifted(-13));
    const swept = await service.rpc("expire_transfers", { p_now: now() });
    expect(swept.error).toBeNull();
    expect((await rowOf(card.code)).cancel_reason).toBe(CARD_OVERDUE_REASON);
    expect((await rowOf(transfer.code)).cancel_reason).toBe(OVERDUE_REASON);
  });
});

// ─────────────────────────────────────────────────────────── the readers
describe("who reads the Stripe side", () => {
  it("admin_mark_paid() refuses a card order: its money is Stripe's to confirm", async () => {
    const { code } = await placeAsGuest("CARD");
    expect((await manager.rpc("admin_mark_paid", { p_code: code, p_now: now() })).error?.message).toBe("NOT_ALLOWED");
  });

  it("admin_orders() tells the back office what Stripe saw, and only for card orders", async () => {
    const card = await placeAsGuest("CARD");
    const transfer = await placeAsGuest("BANK_TRANSFER");
    const read = async () => toAdminOrders((await manager.rpc("admin_orders")).data);
    const find = (book: Awaited<ReturnType<typeof read>>, code: string) => book.find((o) => String(o.code) === code)!;

    expect(find(await read(), card.code).card).toEqual({ checkout: false, paymentIntent: null });
    expect(find(await read(), transfer.code).card).toBeUndefined();
    await service.rpc("card_checkout_opened", { p_code: card.code, p_session_id: SESSION, p_now: now() });
    expect(find(await read(), card.code).card).toEqual({ checkout: true, paymentIntent: null });
    await markPaid(card.code, card.totalVnd);
    expect(find(await read(), card.code).card).toEqual({ checkout: true, paymentIntent: INTENT });
  });

  it("order_json() — the shape the receipt and the lookup hand out — carries none of it", async () => {
    const { code, accessKey, totalVnd } = await placeAsGuest("CARD");
    await service.rpc("card_checkout_opened", { p_code: code, p_session_id: SESSION, p_now: now() });
    await markPaid(code, totalVnd);
    const back = await service.rpc("receipt_order", { p_code: code, p_key: accessKey });
    const text = JSON.stringify(back.data);
    expect(text).not.toContain(SESSION);
    expect(text).not.toContain(INTENT);
    expect(toOrder(back.data).status.state).toBe("PAID");
  });
});
