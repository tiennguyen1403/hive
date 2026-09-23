import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CUSTOMERS } from "@/data/customers";
import { ORDERS } from "@/data/orders";
import type { Order } from "@/data/types";
import { demoNow } from "@/lib/clock";
import { toVnIso } from "@/lib/datetime";
import { DEMO_ADMIN } from "@/lib/demo-admin";
import type { Database, Json } from "./database.types";
import { toOrder } from "./order-dto";

/**
 * What slice B3a claims, checked against Postgres.
 *
 *   (a) row level security: the manager reads every order, profile and log
 *       line; a shopper only their own; a visitor nothing;
 *   (b) every `admin_*` function moves an order along exactly the edges its
 *       guard names — one test per allowed edge, one per refused one — and
 *       writes the matching event; a shopper calling one gets `NOT_ADMIN`;
 *   (c) the shop's cancellation puts the pieces back on the shelf;
 *   (d) `p_now` is clamped to the real clock for everybody but the service
 *       role;
 *   (e) `demo_anchor()` is the latest 18:50 in Vietnam, and a reset onto it
 *       keeps every hour and minute of the sample, puts every deadline ahead
 *       of `now()` and writes one event per recorded moment, plus its own;
 *   (f) the shopper's writes and the twelve-hour sweep log themselves too;
 *   (g) `reset_demo()` is the manager's and the service role's, nobody else's;
 *       and the log is append-only for everyone.
 *
 * THE CLOCK IS REAL HERE. The app's `p_now` is `toVnIso(demoNow())`, and the
 * database refuses anything more than five minutes off it from a signed-in
 * caller — so every test starts from `reset_demo(demo_anchor())`, the anchor
 * the app itself resets onto, where the sample transfers are still inside
 * their hold and issue 05 is open. Moments the real clock cannot reach (a
 * hold that ran out, a later sweep) are set up through the service role,
 * which the clamp exempts on purpose.
 *
 * Needs a running stack, `.env.local` and the nine demo accounts
 * (`npm run seed:users`). The file resets once more when it ends.
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

const anon = fresh();

/** The service role — scripts and tests only. Not an admin: it has no role claim. */
const service = createClient<Database>(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signedIn(email: string): Promise<Client> {
  const client = fresh();
  const { error } = await client.auth.signInWithPassword({ email, password: demoPassword! });
  if (error) throw new Error(`could not sign in as a demo account: ${error.message}`);
  return client;
}

const MINHANH = CUSTOMERS[0]!; // c-minhanh: DH-2430 (transfer, waiting), DH-2422 (shipping)
const NAMLE = CUSTOMERS[1]!;

/** The app's clock, exactly as a Server Action sends it. */
const now = () => toVnIso(demoNow());
/** `hours` from now, for the moments only the service role may name. */
const shifted = (hours: number) => toVnIso(new Date(Date.now() + hours * 3_600_000));

async function resetToRealAnchor() {
  const anchor = await service.rpc("demo_anchor");
  if (anchor.error) throw new Error(`demo_anchor failed: ${anchor.error.message}`);
  const { error } = await service.rpc("reset_demo", { p_anchor: anchor.data });
  if (error) throw new Error(`reset_demo failed: ${error.message}`);
}

async function stateOf(code: string) {
  const { data, error } = await service
    .from("orders")
    .select("state, paid_at, shipped_at, tracking_code, carrier, delivered_at, cancelled_at, cancel_reason, recipient, phone, line, province_code, ward_code")
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

/** `p_input` as checkout sends it, for one KHÓI black M unless told otherwise. */
function basket(over: Record<string, unknown> = {}) {
  return {
    lines: [{ productId: "p-khoi", color: "black", size: "M", qty: 1 }],
    recipient: "Khách Thử",
    phone: "0901234567",
    email: "khach@example.test",
    provinceCode: "29",
    wardCode: "70101063",
    line: "1 Thử Nghiệm",
    note: "",
    delivery: "STANDARD",
    payment: "COD",
    promoCode: null,
    ...over,
  };
}

/** Place an order as a guest, through the service role (which may name any moment). */
async function placeAsGuest(over: Record<string, unknown> = {}, at = now()): Promise<string> {
  const { data, error } = await service.rpc("place_order", {
    p_input: basket(over) as unknown as Json,
    p_now: at,
  });
  if (error) throw new Error(`place_order refused: ${error.message}`);
  return (data as { code: string }).code;
}

let manager: Client;
let minhanh: Client;
let namle: Client;

beforeAll(async () => {
  manager = await signedIn(DEMO_ADMIN.email);
  minhanh = await signedIn(MINHANH.email);
  namle = await signedIn(NAMLE.email);
});

beforeEach(async () => {
  await resetToRealAnchor();
});

afterAll(async () => {
  await resetToRealAnchor();
});

// ─────────────────────────────────────────────────── (a) who reads what
describe("(a) row level security", () => {
  it("shows the manager every order, every line, every profile and the whole log", async () => {
    const orders = await manager.from("orders").select("code", { count: "exact", head: true });
    expect(orders.count).toBe(24);
    const lines = await manager.from("order_lines").select("order_code", { count: "exact", head: true });
    expect(lines.count).toBe(33);

    const all = await service.from("profiles").select("id", { count: "exact", head: true });
    const seen = await manager.from("profiles").select("id", { count: "exact", head: true });
    expect(seen.count).toBe(all.count);
    expect(seen.count).toBeGreaterThanOrEqual(CUSTOMERS.length + 1);

    const addresses = await manager.from("addresses").select("id", { count: "exact", head: true });
    expect(addresses.count).toBeGreaterThanOrEqual(CUSTOMERS.reduce((n, c) => n + c.addresses.length, 0));

    const log = await manager.from("events").select("id", { count: "exact", head: true });
    expect(log.error).toBeNull();
    expect(log.count).toBeGreaterThan(0);
  });

  it("reads every order through admin_orders(), each with the account it belongs to", async () => {
    const { data, error } = await manager.rpc("admin_orders");
    expect(error).toBeNull();
    const rows = data as Array<{ order: unknown; owner: { handle: string | null; name: string } | null }>;
    expect(rows).toHaveLength(24);
    const byCode = new Map(rows.map((r) => [toOrder(r.order).code, r]));
    const minhanhOrder = byCode.get("DH-2430" as Order["code"])!;
    expect(minhanhOrder.owner?.handle).toBe(MINHANH.id);
    expect(minhanhOrder.owner?.name).toBe(MINHANH.name);
  });

  it("shows a shopper only their own, and none of the log", async () => {
    const orders = await minhanh.from("orders").select("code");
    expect(orders.data!.map((o) => o.code).sort()).toEqual(
      ORDERS.filter((o) => o.customerId === MINHANH.id).map((o) => String(o.code)).sort(),
    );
    const profiles = await minhanh.from("profiles").select("handle");
    expect(profiles.data).toEqual([{ handle: MINHANH.id }]);
    const log = await minhanh.from("events").select("id");
    expect(log.data ?? []).toEqual([]);

    const denied = await minhanh.rpc("admin_orders");
    expect(denied.error?.message).toBe("NOT_ADMIN");
  });

  it("shows a visitor with no session nothing at all", async () => {
    for (const table of ["orders", "profiles", "addresses", "events"] as const) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect(error !== null || (data ?? []).length === 0, table).toBe(true);
    }
  });
});

// ───────────────────────────────────────────────── (b) the guard, edge by edge
describe("(b) admin_mark_paid", () => {
  it("AWAITING_TRANSFER → PAID, inside the hold, and says so in the log", async () => {
    const at = now();
    const { error } = await manager.rpc("admin_mark_paid", { p_code: "DH-2430", p_now: at });
    expect(error).toBeNull();
    const row = await stateOf("DH-2430");
    expect(row.state).toBe("PAID");
    expect(Date.parse(row.paid_at!)).toBe(Date.parse(at));

    const last = (await eventsOf("DH-2430")).at(-1)!;
    expect(last).toMatchObject({
      kind: "ORDER_PAID",
      actor_role: "admin",
      actor: DEMO_ADMIN.email,
      payload: { from: "AWAITING_TRANSFER" },
    });
  });

  it("RECEIVED → PAID (a card or COD order the shop has taken)", async () => {
    const code = await placeAsGuest({ payment: "CARD" });
    const { error } = await manager.rpc("admin_mark_paid", { p_code: code, p_now: now() });
    expect(error).toBeNull();
    expect((await stateOf(code)).state).toBe("PAID");
    expect((await eventsOf(code)).at(-1)!.payload).toEqual({ from: "RECEIVED" });
  });

  it("refuses PAID, SHIPPING, DELIVERED and CANCELLED", async () => {
    for (const code of ["DH-2427", "DH-2422", "DH-2416", "DH-2418"]) {
      const { error } = await manager.rpc("admin_mark_paid", { p_code: code, p_now: now() });
      expect(error?.message, code).toBe("NOT_ALLOWED");
    }
  });

  it("refuses a transfer whose twelve hours have run out, swept or not", async () => {
    const code = await placeAsGuest({ payment: "BANK_TRANSFER" }, shifted(-13));
    expect((await stateOf(code)).state).toBe("AWAITING_TRANSFER");
    const { error } = await manager.rpc("admin_mark_paid", { p_code: code, p_now: now() });
    expect(error?.message).toBe("NOT_ALLOWED");
  });

  it("says NOT_FOUND for an order that does not exist", async () => {
    const { error } = await manager.rpc("admin_mark_paid", { p_code: "DH-9999", p_now: now() });
    expect(error?.message).toBe("NOT_FOUND");
  });
});

describe("(b) admin_hand_over", () => {
  it("PAID → SHIPPING with the courier and the number, and a note for the shopper", async () => {
    const { error } = await manager.rpc("admin_hand_over", {
      p_code: "DH-2427",
      p_carrier: "Giao tiêu chuẩn",
      p_tracking_code: "vnp-2427-01",
      p_note: "gửi 2 kiện",
      p_now: now(),
    });
    expect(error).toBeNull();
    const row = await stateOf("DH-2427");
    expect(row.state).toBe("SHIPPING");
    expect(row.tracking_code).toBe("VNP-2427-01");
    expect(row.carrier).toBe("Giao tiêu chuẩn");

    const [shipped, note] = (await eventsOf("DH-2427")).slice(-2);
    expect(shipped).toMatchObject({
      kind: "ORDER_SHIPPED",
      payload: { from: "PAID", carrier: "Giao tiêu chuẩn", trackingCode: "VNP-2427-01" },
    });
    expect(note).toMatchObject({ kind: "ORDER_NOTE", payload: { text: "Ghi chú khi bàn giao: gửi 2 kiện" } });

    // The shopper's lookup reads the same courier back.
    const tracked = await anon.rpc("track_order", { p_code: "DH-2427", p_phone: row.phone });
    expect(toOrder(tracked.data).status).toMatchObject({
      state: "SHIPPING",
      trackingCode: "VNP-2427-01",
      carrier: "Giao tiêu chuẩn",
    });
  });

  it("RECEIVED → SHIPPING only for COD, which is paid at the door", async () => {
    const cod = await placeAsGuest({ payment: "COD" });
    const ok = await manager.rpc("admin_hand_over", {
      p_code: cod,
      p_carrier: "Giao tiêu chuẩn",
      p_tracking_code: "VNP-1",
      p_note: "",
      p_now: now(),
    });
    expect(ok.error).toBeNull();
    expect((await stateOf(cod)).state).toBe("SHIPPING");
    expect((await eventsOf(cod)).map((e) => e.kind)).toEqual(["ORDER_PLACED", "ORDER_SHIPPED"]);

    const card = await placeAsGuest({ payment: "CARD" });
    const refused = await manager.rpc("admin_hand_over", {
      p_code: card,
      p_carrier: "Giao tiêu chuẩn",
      p_tracking_code: "VNP-2",
      p_note: "",
      p_now: now(),
    });
    expect(refused.error?.message).toBe("NOT_ALLOWED");
  });

  it("refuses AWAITING_TRANSFER, SHIPPING, DELIVERED and CANCELLED", async () => {
    for (const code of ["DH-2430", "DH-2422", "DH-2416", "DH-2418"]) {
      const { error } = await manager.rpc("admin_hand_over", {
        p_code: code,
        p_carrier: "Giao tiêu chuẩn",
        p_tracking_code: "VNP-3",
        p_note: "",
        p_now: now(),
      });
      expect(error?.message, code).toBe("NOT_ALLOWED");
    }
  });

  it("refuses a handover with no number, or a number no label carries", async () => {
    for (const tracking of ["", "   ", "VNP 2427", "#2427"]) {
      const { error } = await manager.rpc("admin_hand_over", {
        p_code: "DH-2427",
        p_carrier: "Giao tiêu chuẩn",
        p_tracking_code: tracking,
        p_note: "",
        p_now: now(),
      });
      expect(error?.message, JSON.stringify(tracking)).toBe("BAD_INPUT");
    }
    expect((await stateOf("DH-2427")).state).toBe("PAID");
  });
});

describe("(b) admin_mark_delivered", () => {
  it("SHIPPING → DELIVERED, logged", async () => {
    const { error } = await manager.rpc("admin_mark_delivered", { p_code: "DH-2422", p_now: now() });
    expect(error).toBeNull();
    expect((await stateOf("DH-2422")).state).toBe("DELIVERED");
    expect((await eventsOf("DH-2422")).at(-1)).toMatchObject({
      kind: "ORDER_DELIVERED",
      actor_role: "admin",
    });
  });

  it("refuses every other state", async () => {
    for (const code of ["DH-2430", "DH-2427", "DH-2416", "DH-2418"]) {
      const { error } = await manager.rpc("admin_mark_delivered", { p_code: code, p_now: now() });
      expect(error?.message, code).toBe("NOT_ALLOWED");
    }
    const received = await placeAsGuest({ payment: "COD" });
    const { error } = await manager.rpc("admin_mark_delivered", { p_code: received, p_now: now() });
    expect(error?.message).toBe("NOT_ALLOWED");
  });
});

describe("(b, c) admin_cancel_order", () => {
  it("AWAITING_TRANSFER → CANCELLED, the pieces back on the shelf", async () => {
    // DH-2430: SƯƠNG moss M ×1 and THAN black L ×1.
    const suong = await onHand("p-suong", "moss", "M");
    const than = await onHand("p-than", "black", "L");

    const { error } = await manager.rpc("admin_cancel_order", {
      p_code: "DH-2430",
      p_reason: "Khách đổi ý",
      p_note: "khách nhắn qua Zalo",
      p_now: now(),
    });
    expect(error).toBeNull();

    expect(await onHand("p-suong", "moss", "M")).toBe(suong + 1);
    expect(await onHand("p-than", "black", "L")).toBe(than + 1);
    const row = await stateOf("DH-2430");
    expect(row.state).toBe("CANCELLED");
    expect(row.cancel_reason).toBe("Khách đổi ý");
    expect((await eventsOf("DH-2430")).at(-1)).toMatchObject({
      kind: "ORDER_CANCELLED",
      actor_role: "admin",
      payload: { from: "AWAITING_TRANSFER", reason: "Khách đổi ý", note: "khách nhắn qua Zalo" },
    });
  });

  it("RECEIVED → CANCELLED: a COD order's last piece goes back where it was", async () => {
    await setOnHand("p-khoi", "black", "M", 1);
    const code = await placeAsGuest({ payment: "COD" });
    expect(await onHand("p-khoi", "black", "M")).toBe(0);

    const { error } = await manager.rpc("admin_cancel_order", {
      p_code: code,
      p_reason: "Hết hàng thật",
      p_note: "",
      p_now: now(),
    });
    expect(error).toBeNull();
    expect(await onHand("p-khoi", "black", "M")).toBe(1);
    expect((await eventsOf(code)).at(-1)!.payload).toMatchObject({ from: "RECEIVED" });
  });

  it("PAID → CANCELLED, and the code's use stays spent", async () => {
    const used = await service.from("promotions").select("used_count").eq("code", "DOT05").single();
    const { error } = await manager.rpc("admin_cancel_order", {
      p_code: "DH-2427",
      p_reason: "Khác",
      p_note: "",
      p_now: now(),
    });
    expect(error).toBeNull();
    expect((await stateOf("DH-2427")).state).toBe("CANCELLED");
    const after = await service.from("promotions").select("used_count").eq("code", "DOT05").single();
    expect(after.data!.used_count).toBe(used.data!.used_count);
  });

  it("refuses SHIPPING, DELIVERED and CANCELLED — and an order with no reason", async () => {
    for (const code of ["DH-2422", "DH-2416", "DH-2418"]) {
      const { error } = await manager.rpc("admin_cancel_order", {
        p_code: code,
        p_reason: "Khác",
        p_note: "",
        p_now: now(),
      });
      expect(error?.message, code).toBe("NOT_ALLOWED");
    }
    const { error } = await manager.rpc("admin_cancel_order", {
      p_code: "DH-2430",
      p_reason: "  ",
      p_note: "",
      p_now: now(),
    });
    expect(error?.message).toBe("BAD_INPUT");
    expect((await stateOf("DH-2430")).state).toBe("AWAITING_TRANSFER");
  });

  it("refuses a transfer whose hold ran out: the sweep puts those pieces back, not the shop", async () => {
    const code = await placeAsGuest({ payment: "BANK_TRANSFER" }, shifted(-13));
    const { error } = await manager.rpc("admin_cancel_order", {
      p_code: code,
      p_reason: "Khác",
      p_note: "",
      p_now: now(),
    });
    expect(error?.message).toBe("NOT_ALLOWED");
  });
});

describe("(b) admin_note_order", () => {
  it("writes a note on any order, in any state, and changes nothing else", async () => {
    for (const code of ["DH-2430", "DH-2416", "DH-2418"]) {
      const before = await stateOf(code);
      const { error } = await manager.rpc("admin_note_order", {
        p_code: code,
        p_text: " gọi khách trước 10 giờ ",
        p_now: now(),
      });
      expect(error, code).toBeNull();
      expect(await stateOf(code)).toEqual(before);
      expect((await eventsOf(code)).at(-1)).toMatchObject({
        kind: "ORDER_NOTE",
        payload: { text: "gọi khách trước 10 giờ" },
      });
    }
  });

  it("refuses an empty note and an order that does not exist", async () => {
    const empty = await manager.rpc("admin_note_order", { p_code: "DH-2430", p_text: " ", p_now: now() });
    expect(empty.error?.message).toBe("BAD_INPUT");
    const none = await manager.rpc("admin_note_order", { p_code: "DH-9999", p_text: "x", p_now: now() });
    expect(none.error?.message).toBe("NOT_FOUND");
  });
});

describe("(b) admin_edit_address", () => {
  const next = {
    recipient: "Trần Minh Anh",
    phone: "0912345678",
    line: "47 Trần Hưng Đạo",
    provinceCode: "29",
    wardCode: "70101063",
  };

  it("rewrites the address of an order not yet handed over, keeping before and after", async () => {
    for (const code of ["DH-2430", "DH-2427"]) {
      const before = await stateOf(code);
      const { error } = await manager.rpc("admin_edit_address", {
        p_code: code,
        p_ship_to: next as unknown as Json,
        p_reason: "khách nhắn đổi số nhà",
        p_now: now(),
      });
      expect(error, code).toBeNull();
      const after = await stateOf(code);
      expect(after.line).toBe("47 Trần Hưng Đạo");
      expect(after.state).toBe(before.state);
      expect((await eventsOf(code)).at(-1)).toMatchObject({
        kind: "ORDER_ADDRESS_EDITED",
        payload: {
          before: { line: before.line, recipient: before.recipient },
          after: { line: "47 Trần Hưng Đạo" },
          reason: "khách nhắn đổi số nhà",
        },
      });
    }
  });

  it("does the same for a RECEIVED order", async () => {
    const code = await placeAsGuest({ payment: "COD" });
    const { error } = await manager.rpc("admin_edit_address", {
      p_code: code,
      p_ship_to: next as unknown as Json,
      p_reason: "đổi nơi nhận",
      p_now: now(),
    });
    expect(error).toBeNull();
    expect((await stateOf(code)).line).toBe("47 Trần Hưng Đạo");
  });

  it("refuses once the parcel has left, or the order is over", async () => {
    for (const code of ["DH-2422", "DH-2416", "DH-2418"]) {
      const { error } = await manager.rpc("admin_edit_address", {
        p_code: code,
        p_ship_to: next as unknown as Json,
        p_reason: "x",
        p_now: now(),
      });
      expect(error?.message, code).toBe("NOT_ALLOWED");
    }
  });

  it("checks the address the way place_order() does, and wants a reason", async () => {
    for (const [shipTo, reason] of [
      [{ ...next, phone: "12345" }, "x"],
      [{ ...next, recipient: " " }, "x"],
      [{ ...next, line: "" }, "x"],
      [{ ...next, wardCode: "" }, "x"],
      [next, " "],
    ] as const) {
      const { error } = await manager.rpc("admin_edit_address", {
        p_code: "DH-2430",
        p_ship_to: shipTo as unknown as Json,
        p_reason: reason,
        p_now: now(),
      });
      expect(error?.message, JSON.stringify(shipTo)).toBe("BAD_INPUT");
    }
  });
});

describe("(b) a shopper, or a visitor, calling the manager's functions", () => {
  const calls = (at: string) =>
    [
      ["admin_mark_paid", { p_code: "DH-2430", p_now: at }],
      [
        "admin_hand_over",
        { p_code: "DH-2427", p_carrier: "x", p_tracking_code: "X1", p_note: "", p_now: at },
      ],
      ["admin_mark_delivered", { p_code: "DH-2422", p_now: at }],
      ["admin_cancel_order", { p_code: "DH-2430", p_reason: "x", p_note: "", p_now: at }],
      ["admin_note_order", { p_code: "DH-2430", p_text: "x", p_now: at }],
      [
        "admin_edit_address",
        {
          p_code: "DH-2430",
          p_ship_to: { recipient: "x", phone: "0912345678", line: "x", provinceCode: "29", wardCode: "1" },
          p_reason: "x",
          p_now: at,
        },
      ],
    ] as const;

  it("answers a signed-in shopper NOT_ADMIN, whatever the order", async () => {
    for (const [fn, args] of calls(now())) {
      const { error } = await minhanh.rpc(fn as never, args as never);
      expect(error?.message, fn).toBe("NOT_ADMIN");
    }
    expect((await stateOf("DH-2430")).state).toBe("AWAITING_TRANSFER");
  });

  it("answers the service role NOT_ADMIN too: it carries no role claim", async () => {
    const { error } = await service.rpc("admin_mark_paid", { p_code: "DH-2430", p_now: now() });
    expect(error?.message).toBe("NOT_ADMIN");
  });

  it("is not open to a visitor at all", async () => {
    for (const [fn, args] of calls(now())) {
      const { error } = await anon.rpc(fn as never, args as never);
      expect(error, fn).not.toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────── (d) the clamp
describe("(d) p_now is the real clock, give or take five minutes", () => {
  it("refuses a signed-in caller ten minutes off, either way", async () => {
    for (const at of [shifted(-1 / 6), shifted(1 / 6)]) {
      const note = await manager.rpc("admin_note_order", { p_code: "DH-2430", p_text: "x", p_now: at });
      expect(note.error?.message).toBe("BAD_INPUT");
      const placed = await minhanh.rpc("place_order", { p_input: basket() as unknown as Json, p_now: at });
      expect(placed.error?.message).toBe("BAD_INPUT");
      const swept = await anon.rpc("expire_transfers", { p_now: at });
      expect(swept.error?.message).toBe("BAD_INPUT");
    }
  });

  it("takes one inside the window", async () => {
    const note = await manager.rpc("admin_note_order", {
      p_code: "DH-2430",
      p_text: "x",
      p_now: shifted(-3 / 60),
    });
    expect(note.error).toBeNull();
  });

  it("lets the service role name any moment — the tests' way to reach 'twelve hours later'", async () => {
    const placed = await service.rpc("place_order", {
      p_input: basket() as unknown as Json,
      p_now: shifted(-6),
    });
    expect(placed.error).toBeNull();
    const swept = await service.rpc("expire_transfers", { p_now: shifted(48) });
    expect(swept.error).toBeNull();
  });
});

// ─────────────────────────────────────────────────── (e) the anchor
/** "19:50" — the wall-clock time of a stored instant, read in Vietnam. */
const vnClock = (iso: string | null) =>
  iso === null ? null : toVnIso(new Date(Date.parse(iso))).slice(11, 16);

/** What `reset_demo()` logs for the sample: `fromFixtures`' rules, restated. */
function milestonesInFixture(): number {
  return ORDERS.filter(
    (o) =>
      (o.status.state === "PAID" && o.payment === "BANK_TRANSFER") ||
      o.status.state === "SHIPPING" ||
      o.status.state === "DELIVERED" ||
      o.status.state === "CANCELLED",
  ).length;
}

describe("(e) demo_anchor() and a reset onto it", () => {
  it("is the latest 18:50 in Vietnam", async () => {
    const cases = [
      ["2026-09-23T09:00:00+07:00", "2026-09-22T18:50:00+07:00"],
      ["2026-09-23T19:00:00+07:00", "2026-09-23T18:50:00+07:00"],
      ["2026-09-23T18:50:00+07:00", "2026-09-23T18:50:00+07:00"],
      ["2026-09-23T18:49:00+07:00", "2026-09-22T18:50:00+07:00"],
      ["2027-01-01T00:10:00+07:00", "2026-12-31T18:50:00+07:00"],
    ];
    for (const [at, expected] of cases) {
      const { data, error } = await service.rpc("demo_anchor", { p_at: at });
      expect(error).toBeNull();
      expect(Date.parse(data as string), at).toBe(Date.parse(expected!));
    }
  });

  it("keeps every hour and minute of the sample, and puts every deadline ahead of now", async () => {
    const { data, error } = await service
      .from("orders")
      .select("code, state, placed_at, due_at, paid_at, shipped_at, delivered_at, cancelled_at");
    expect(error).toBeNull();

    const nowMs = Date.now();
    for (const row of data!) {
      const fixture = ORDERS.find((o) => o.code === row.code)!;
      expect(vnClock(row.placed_at), row.code).toBe(fixture.placedAt.slice(11, 16));
      const s = fixture.status;
      const stamp =
        s.state === "PAID" ? [row.paid_at, s.paidAt]
        : s.state === "SHIPPING" ? [row.shipped_at, s.shippedAt]
        : s.state === "DELIVERED" ? [row.delivered_at, s.deliveredAt]
        : s.state === "CANCELLED" ? [row.cancelled_at, s.cancelledAt]
        : s.state === "AWAITING_TRANSFER" ? [row.due_at, s.dueAt]
        : null;
      if (stamp) expect(vnClock(stamp[0]!), `${row.code} ${s.state}`).toBe(stamp[1]!.slice(11, 16));

      // Everything recorded is in the past; every deadline is ahead.
      expect(Date.parse(row.placed_at)).toBeLessThanOrEqual(nowMs);
      if (row.state === "AWAITING_TRANSFER") expect(Date.parse(row.due_at!)).toBeGreaterThan(nowMs);
    }
  });

  it("writes one event per moment the sample records, then its own", async () => {
    const { data, error } = await service.from("events").select("kind, actor_role, order_code").order("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(milestonesInFixture() + 1);
    expect(data!.at(-1)).toMatchObject({ kind: "DEMO_RESET", actor_role: "system", order_code: null });
    // The rules by which the sample's history is told.
    const kinds = new Map(data!.map((e) => [e.order_code, e]));
    expect(kinds.get("DH-2427")).toMatchObject({ kind: "ORDER_PAID", actor_role: "system" });
    expect(kinds.get("DH-2428")).toBeUndefined(); // a card order: it matched no transfer
    expect(kinds.get("DH-2422")).toMatchObject({ kind: "ORDER_SHIPPED", actor_role: "admin" });
    expect(kinds.get("DH-2416")).toMatchObject({ kind: "ORDER_DELIVERED", actor_role: "system" });
    expect(kinds.get("DH-2310")).toMatchObject({ kind: "ORDER_EXPIRED", actor_role: "system" });
    expect(kinds.get("DH-2313")).toMatchObject({ kind: "ORDER_EXPIRED", actor_role: "system" });
    expect(kinds.get("DH-2418")).toMatchObject({ kind: "ORDER_CANCELLED", actor_role: "admin" });
  });

  it("is idempotent: the same rows and the same ids, bar the reset's own instant", async () => {
    const read = async () =>
      (await service.from("events").select("id, at, kind, order_code, payload").order("id")).data!;
    const first = await read();
    await resetToRealAnchor();
    const second = await read();
    expect(second.slice(0, -1)).toEqual(first.slice(0, -1));
    expect(second.at(-1)!.id).toBe(first.at(-1)!.id);
  });
});

// ─────────────────────────────────────────────── (f) the other writers
describe("(f) the shopper's writes and the sweep log themselves", () => {
  it("place_order() → ORDER_PLACED, by the account that placed it", async () => {
    const { data, error } = await minhanh.rpc("place_order", {
      p_input: basket() as unknown as Json,
      p_now: now(),
    });
    expect(error).toBeNull();
    const code = (data as { code: string }).code;
    expect(await eventsOf(code)).toMatchObject([
      { kind: "ORDER_PLACED", actor_role: "customer", actor: MINHANH.email },
    ]);
  });

  it("place_order() by a guest → ORDER_PLACED under the email typed at checkout", async () => {
    const code = await placeAsGuest({ email: "khach.b3a@example.test" });
    expect(await eventsOf(code)).toMatchObject([
      { kind: "ORDER_PLACED", actor_role: "customer", actor: "khach.b3a@example.test" },
    ]);
  });

  it("cancel_order() → ORDER_CANCELLED_BY_CUSTOMER, with the state it left", async () => {
    const placed = await minhanh.rpc("place_order", {
      p_input: basket() as unknown as Json,
      p_now: now(),
    });
    const code = (placed.data as { code: string }).code;
    const { error } = await minhanh.rpc("cancel_order", { p_code: code, p_now: now() });
    expect(error).toBeNull();
    expect((await eventsOf(code)).at(-1)).toMatchObject({
      kind: "ORDER_CANCELLED_BY_CUSTOMER",
      actor_role: "customer",
      actor: MINHANH.email,
      payload: { from: "RECEIVED" },
    });
    // …and somebody else's hand is still refused, as in B2.
    const theirs = await namle.rpc("cancel_order", { p_code: code, p_now: now() });
    expect(theirs.error?.message).toBe("NOT_OWNER");
  });

  it("expire_transfers() → one ORDER_EXPIRED per released hold, stamped at its deadline", async () => {
    const dueOf = async (code: string) =>
      (await service.from("orders").select("due_at").eq("code", code).single()).data!.due_at!;
    const due2430 = await dueOf("DH-2430");
    const due2431 = await dueOf("DH-2431");

    const swept = await service.rpc("expire_transfers", { p_now: shifted(48) });
    expect(swept.data).toBe(2);

    const expired = (await eventsOf("DH-2430")).at(-1)!;
    expect(expired).toMatchObject({ kind: "ORDER_EXPIRED", actor_role: "system", actor: "" });
    expect(Date.parse(expired.at)).toBe(Date.parse(due2430));
    expect(Date.parse((await eventsOf("DH-2431")).at(-1)!.at)).toBe(Date.parse(due2431));

    // Once is once.
    const again = await service.rpc("expire_transfers", { p_now: shifted(48) });
    expect(again.data).toBe(0);
    expect((await eventsOf("DH-2430")).filter((e) => e.kind === "ORDER_EXPIRED")).toHaveLength(1);
  });
});

// ─────────────────────────────────────────── (g) the reset, and the log itself
describe("(g) who may reset, and what nobody may do to the log", () => {
  it("refuses a shopper NOT_ADMIN and a visitor outright", async () => {
    const shopper = await minhanh.rpc("reset_demo", {});
    expect(shopper.error?.message).toBe("NOT_ADMIN");
    const visitor = await anon.rpc("reset_demo", {});
    expect(visitor.error).not.toBeNull();
  });

  it("lets the manager reset, and names them in the log", async () => {
    const anchor = await manager.rpc("demo_anchor");
    expect(anchor.error).toBeNull();
    await manager.rpc("admin_mark_paid", { p_code: "DH-2430", p_now: now() });

    const { error } = await manager.rpc("reset_demo", { p_anchor: anchor.data! });
    expect(error).toBeNull();
    expect((await stateOf("DH-2430")).state).toBe("AWAITING_TRANSFER");

    const { data } = await service
      .from("events")
      .select("kind, actor_role, actor, payload")
      .eq("kind", "DEMO_RESET");
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ actor_role: "admin", actor: DEMO_ADMIN.email });
    expect(Date.parse((data![0]!.payload as { anchor: string }).anchor)).toBe(
      Date.parse(anchor.data as string),
    );
  });

  it("will not let anybody — the service role included — change or remove a line", async () => {
    const { data } = await service.from("events").select("id").limit(1).single();
    const update = await service.from("events").update({ actor: "x" }).eq("id", data!.id);
    expect(update.error?.message).toBe("APPEND_ONLY");
    const remove = await service.from("events").delete().eq("id", data!.id);
    expect(remove.error?.message).toBe("APPEND_ONLY");

    const byManager = await manager.from("events").delete().eq("id", data!.id);
    expect(byManager.error).not.toBeNull();
    const inserted = await manager
      .from("events")
      .insert({ at: now(), actor_role: "admin", kind: "ORDER_NOTE", order_code: "DH-2430" });
    expect(inserted.error).not.toBeNull();
  });
});
