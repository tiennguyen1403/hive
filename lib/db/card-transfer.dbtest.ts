import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import type { PaymentMethod } from "@/data/types";
import { demoNow } from "@/lib/clock";
import { CARD_OVERDUE_REASON, CUSTOMER_CANCEL_REASON, effectiveStatus } from "@/lib/customer-orders";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import { TRANSFER_HOLD_HOURS, orderTotalVnd, paysByTransfer } from "@/lib/orders";
import { COD_SURCHARGE_VND } from "@/lib/shipping";
import type { Database, Json } from "./database.types";
import { toOrder } from "./order-dto";

/**
 * What slice B7 claims, checked against Postgres
 * (`20260927120000_card_pays_by_transfer.sql`). No card gateway is connected,
 * so an order placed with card pays by bank transfer (user, 27/09):
 *
 *   · `place_order()` puts a CARD order in AWAITING_TRANSFER with the same
 *     twelve-hour hold as a transfer — every method lands where
 *     `paysByTransfer()` (`lib/orders.ts`) says, and COD is untouched:
 *     RECEIVED, no deadline, its handling fee;
 *   · the sweep (`expire_transfers()`, and the one at the top of every
 *     `place_order()`) lets a card order's hold go exactly as a transfer's —
 *     cancelled at its deadline, `ORDER_EXPIRED`, the pieces back on the shelf
 *     — and `effectiveStatus()` reads it cancelled before any sweep has run.
 *     Since slice B18 the reason is "quá hạn thanh toán": a card order pays on
 *     Stripe's page, so what never came is a card payment;
 *   · since slice B18 `admin_mark_paid()` refuses a card order, inside its
 *     hold or past it — Stripe confirms card money (`card_mark_paid()`, see
 *     `card-checkout.dbtest.ts`); `admin_hand_over()` still refuses a card
 *     order nobody has paid for; the shopper may still call one off inside its
 *     hold;
 *   · a card order taken before slice B7 — RECEIVED, no deadline, on a
 *     database that had one when the migration ran — still cannot leave
 *     unpaid, is no longer confirmed by hand (B18), and may be cancelled.
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
/** NOW plus the twelve-hour hold. */
const DUE = "2026-09-21T07:00:00+07:00";

/** The app's clock, exactly as a Server Action sends it. */
const now = () => toVnIso(demoNow());
/** `hours` from the real now, for the moments only the service role may name. */
const shifted = (hours: number) => toVnIso(new Date(Date.now() + hours * 3_600_000));

const HOUR_MS = 3_600_000;

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

type Line = { productId: string; color: string; size: string; qty: number };
const bui = (qty = 1): Line => ({ productId: "p-bui", color: "black", size: "L", qty });
const khoi = (qty = 1): Line => ({ productId: "p-khoi", color: "black", size: "M", qty });

/** `p_input` as checkout sends it. */
function basket(payment: PaymentMethod, lines: Line[] = [khoi()]) {
  return {
    lines,
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

/** Place as a guest through the service role, which may name any moment. */
async function placeAsGuest(
  payment: PaymentMethod,
  at: string,
  lines: Line[] = [khoi()],
): Promise<{ code: string; accessKey: string }> {
  const { data, error } = await service.rpc("place_order", {
    p_input: basket(payment, lines) as unknown as Json,
    p_now: at,
  });
  if (error) throw new Error(`place_order refused: ${error.message}`);
  return data as { code: string; accessKey: string };
}

/** The order as the guest's own receipt reads it back. */
async function receipt(placed: { code: string; accessKey: string }) {
  const { data, error } = await service.rpc("receipt_order", {
    p_code: placed.code,
    p_key: placed.accessKey,
  });
  if (error || data === null) throw new Error(`receipt_order: ${error?.message}`);
  return toOrder(data);
}

async function rowOf(code: string) {
  const { data, error } = await service
    .from("orders")
    .select("state, payment, placed_at, due_at, paid_at, cancelled_at, cancel_reason, cod_fee_vnd")
    .eq("code", code)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function eventsOf(code: string) {
  const { data, error } = await service
    .from("events")
    .select("kind, actor_role, actor, at, payload")
    .eq("order_code", code)
    .order("id");
  if (error) throw new Error(error.message);
  return data;
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
describe("place_order(): a card order waits for a transfer", () => {
  beforeEach(async () => {
    await resetOnto(FIXTURE_ANCHOR);
    await setOnHand("p-khoi", "black", "M", 50);
  });

  it("puts a card order in AWAITING_TRANSFER, due twelve hours after it was placed", async () => {
    const placed = await placeAsGuest("CARD", NOW);
    const order = await receipt(placed);
    expect(order.payment).toBe("CARD");
    expect(order.placedAt).toBe(NOW);
    expect(order.status).toEqual({ state: "AWAITING_TRANSFER", dueAt: DUE });
    expect(order.codFeeVnd).toBe(0);

    const row = await rowOf(placed.code);
    expect(Date.parse(row.due_at!) - Date.parse(row.placed_at)).toBe(TRANSFER_HOLD_HOURS * HOUR_MS);
    expect(await eventsOf(placed.code)).toMatchObject([
      { kind: "ORDER_PLACED", actor_role: "customer", actor: "khach@example.test" },
    ]);
  });

  it("lands every method where paysByTransfer() says — COD unchanged: RECEIVED, no deadline, its fee", async () => {
    for (const method of ["BANK_TRANSFER", "CARD", "COD"] as const) {
      const order = await receipt(await placeAsGuest(method, NOW));
      expect(order.status, method).toEqual(
        paysByTransfer(method) ? { state: "AWAITING_TRANSFER", dueAt: DUE } : { state: "RECEIVED" },
      );
      expect(order.codFeeVnd, method).toBe(method === "COD" ? COD_SURCHARGE_VND : 0);
    }
  });
});

// ─────────────────────────────────────────────────────────── the sweep
describe("the twelve-hour sweep lets a card order's hold go like a transfer's", () => {
  beforeEach(async () => {
    await resetOnto(FIXTURE_ANCHOR);
  });

  it("cancels it at its deadline, says why, logs it and puts the pieces back — once", async () => {
    await setOnHand("p-bui", "black", "L", 3);
    const { code } = await placeAsGuest("CARD", NOW, [bui(2)]);
    expect(await onHand("p-bui", "black", "L")).toBe(1);

    // A minute early: nothing — not even the two sample transfers.
    const early = await service.rpc("expire_transfers", { p_now: "2026-09-21T06:59:00+07:00" });
    expect(early.data).toBe(0);
    expect((await rowOf(code)).state).toBe("AWAITING_TRANSFER");

    const due = await service.rpc("expire_transfers", { p_now: DUE });
    expect(due.error).toBeNull();
    expect(due.data).toBe(1);
    expect(await onHand("p-bui", "black", "L")).toBe(3);

    const row = await rowOf(code);
    expect(row.state).toBe("CANCELLED");
    // Since slice B18 a card order waits for a card payment: its hold runs out as "quá hạn thanh toán".
    expect(row.cancel_reason).toBe(CARD_OVERDUE_REASON);
    expect(Date.parse(row.cancelled_at!)).toBe(Date.parse(row.due_at!));
    const expired = (await eventsOf(code)).at(-1)!;
    expect(expired).toMatchObject({ kind: "ORDER_EXPIRED", actor_role: "system", actor: "" });
    expect(Date.parse(expired.at)).toBe(Date.parse(DUE));

    const again = await service.rpc("expire_transfers", { p_now: DUE });
    expect(again.data).toBe(0);
    expect(await onHand("p-bui", "black", "L")).toBe(3);
  });

  it("is read as cancelled on every screen the moment the hold runs out, swept or not", async () => {
    const placed = await placeAsGuest("CARD", NOW);
    const order = await receipt(placed);
    expect(effectiveStatus(order, new Date("2026-09-21T06:59:00+07:00"))).toBe(order.status);
    expect(effectiveStatus(order, new Date(DUE))).toEqual({
      state: "CANCELLED",
      cancelledAt: DUE,
      reason: CARD_OVERDUE_REASON, // slice B18: what never came is a card payment
    });
    // Nobody has swept: the row still says it is waiting.
    expect((await rowOf(placed.code)).state).toBe("AWAITING_TRANSFER");
  });

  it("frees the last piece for the next shopper, inside the next place_order()", async () => {
    await setOnHand("p-bui", "black", "L", 1);
    const held = await placeAsGuest("CARD", NOW, [bui()]);

    const blocked = await service.rpc("place_order", {
      p_input: basket("COD", [bui()]) as unknown as Json,
      p_now: NOW,
    });
    expect(blocked.error?.message).toBe("OUT_OF_STOCK");

    // Twelve hours on, issue 05 is still open and the card order's hold is over.
    const after = await service.rpc("place_order", {
      p_input: basket("COD", [bui()]) as unknown as Json,
      p_now: DUE,
    });
    expect(after.error).toBeNull();
    expect((await rowOf(held.code)).state).toBe("CANCELLED");
    expect(await onHand("p-bui", "black", "L")).toBe(0);
  });

  it("never touches a COD order, however long it waits", async () => {
    const { code } = await placeAsGuest("COD", NOW);
    const swept = await service.rpc("expire_transfers", { p_now: "2026-09-23T19:00:00+07:00" });
    expect(swept.error).toBeNull();
    const row = await rowOf(code);
    expect(row.state).toBe("RECEIVED");
    expect(row.due_at).toBeNull();
  });
});

// ─────────────────────────────────────────────── the shop and the shopper
describe("the shop confirms a card order's transfer, on the real clock", () => {
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

  it("admin_mark_paid() refuses a card order inside its hold; Stripe's payment makes it PAID, and then it can be handed over", async () => {
    const placed = await placeAsGuest("CARD", now());
    const { code } = placed;
    expect((await rowOf(code)).state).toBe("AWAITING_TRANSFER");

    // Since slice B18 a card payment is Stripe's to confirm, never the shop's by hand.
    const byHand = await manager.rpc("admin_mark_paid", { p_code: code, p_now: now() });
    expect(byHand.error?.message).toBe("NOT_ALLOWED");
    expect((await rowOf(code)).state).toBe("AWAITING_TRANSFER");

    const at = now();
    const paid = await service.rpc("card_mark_paid", {
      p_code: code,
      p_session_id: "cs_test_b7card0001",
      p_payment_intent: "pi_b7card0001",
      p_amount_vnd: orderTotalVnd(await receipt(placed)),
      p_now: at,
    });
    expect(paid.error).toBeNull();
    expect(paid.data).toBe("PAID");
    const row = await rowOf(code);
    expect(row.state).toBe("PAID");
    expect(Date.parse(row.paid_at!)).toBe(Date.parse(at));
    expect((await eventsOf(code)).at(-1)).toMatchObject({
      kind: "ORDER_PAID",
      actor_role: "system",
      actor: "",
      payload: { from: "AWAITING_TRANSFER", via: "STRIPE", paymentIntent: "pi_b7card0001" },
    });

    const shipped = await manager.rpc("admin_hand_over", {
      p_code: code,
      p_carrier: "Giao tiêu chuẩn",
      p_tracking_code: "VNP-B7-01",
      p_note: "",
      p_now: now(),
    });
    expect(shipped.error).toBeNull();
    expect((await rowOf(code)).state).toBe("SHIPPING");
  });

  it("refuses to confirm or cancel a card order whose hold ran out, swept or not", async () => {
    const { code } = await placeAsGuest("CARD", shifted(-13));
    expect((await rowOf(code)).state).toBe("AWAITING_TRANSFER");

    const paid = await manager.rpc("admin_mark_paid", { p_code: code, p_now: now() });
    expect(paid.error?.message).toBe("NOT_ALLOWED");
    const cancelled = await manager.rpc("admin_cancel_order", {
      p_code: code,
      p_reason: "Khác",
      p_note: "",
      p_now: now(),
    });
    expect(cancelled.error?.message).toBe("NOT_ALLOWED");
  });

  it("will not hand over a card order nobody has paid for", async () => {
    const { code } = await placeAsGuest("CARD", now());
    const refused = await manager.rpc("admin_hand_over", {
      p_code: code,
      p_carrier: "Giao tiêu chuẩn",
      p_tracking_code: "VNP-B7-02",
      p_note: "",
      p_now: now(),
    });
    expect(refused.error?.message).toBe("NOT_ALLOWED");
    expect((await rowOf(code)).state).toBe("AWAITING_TRANSFER");
  });

  it("lets the shopper call off their own card order inside its hold, the piece back on the shelf", async () => {
    const before = await onHand("p-khoi", "black", "M");
    const placed = await minhanh.rpc("place_order", {
      p_input: basket("CARD") as unknown as Json,
      p_now: now(),
    });
    expect(placed.error).toBeNull();
    const { code } = placed.data as { code: string };
    expect((await rowOf(code)).state).toBe("AWAITING_TRANSFER");
    expect(await onHand("p-khoi", "black", "M")).toBe(before - 1);

    const called = await minhanh.rpc("cancel_order", { p_code: code, p_now: now() });
    expect(called.error).toBeNull();
    const row = await rowOf(code);
    expect(row.state).toBe("CANCELLED");
    expect(row.cancel_reason).toBe(CUSTOMER_CANCEL_REASON);
    expect(await onHand("p-khoi", "black", "M")).toBe(before);
    expect((await eventsOf(code)).at(-1)).toMatchObject({
      kind: "ORDER_CANCELLED_BY_CUSTOMER",
      payload: { from: "AWAITING_TRANSFER" },
    });
  });

  it("still holds a card order from before this slice: RECEIVED, never shipped unpaid, never confirmed by hand (B18)", async () => {
    // What a database that had card orders when the migration ran still
    // holds: RECEIVED, no deadline. Made here by hand, through the service role.
    const { code } = await placeAsGuest("CARD", now());
    const legacy = await service
      .from("orders")
      .update({ state: "RECEIVED", due_at: null })
      .eq("code", code);
    expect(legacy.error).toBeNull();

    const refused = await manager.rpc("admin_hand_over", {
      p_code: code,
      p_carrier: "Giao tiêu chuẩn",
      p_tracking_code: "VNP-B7-03",
      p_note: "",
      p_now: now(),
    });
    expect(refused.error?.message).toBe("NOT_ALLOWED");

    // Since slice B18 no card payment is confirmed by hand; the shop may still cancel it.
    const paid = await manager.rpc("admin_mark_paid", { p_code: code, p_now: now() });
    expect(paid.error?.message).toBe("NOT_ALLOWED");
    expect((await rowOf(code)).state).toBe("RECEIVED");
    const cancelled = await manager.rpc("admin_cancel_order", {
      p_code: code,
      p_reason: "Khác",
      p_note: "",
      p_now: now(),
    });
    expect(cancelled.error).toBeNull();
    expect((await rowOf(code)).state).toBe("CANCELLED");
  });
});
