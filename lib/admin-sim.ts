import type {
  ColorKey,
  Drop,
  Family,
  Order,
  OrderStatus,
  Product,
  Promotion,
  PromoCode,
  Size,
  Stock,
  Teaser,
} from "@/data/types";
import { promoCode } from "@/data/types";
import { CUSTOMER_CANCEL_REASON } from "./customer-orders";

/** The three shapes a code can take, named once so the log can store it. */
export type PromoKind = Promotion["kind"];

/**
 * What the back office did on THIS BROWSER, and nothing else.
 *
 * There is no server. The user's decision (question 3 of the v2 round) was
 * that a simulated action must nevertheless be REAL STATE: marking an order
 * paid has to move it out of the queue, change its badge on the orders table,
 * recount the tabs and the KPIs, survive a reload — and still never pretend
 * that anything left this machine. So every admin action is recorded here as
 * an event, the events live in one versioned `localStorage` key, and every
 * admin screen renders `fixtures + overlay` through the pure functions below.
 *
 * An EVENT LOG rather than a patched copy of the fixtures, for three reasons
 * that all showed up while building it:
 *
 *   · the `.simbar` has to say how many changes live in this browser, and
 *     that is `actions.length` — a patched copy cannot tell you how it got
 *     there;
 *   · the order's internal notes and its timeline are the same actions read
 *     a second way, so they cannot drift from the status;
 *   · "Đặt lại dữ liệu mẫu" is `delete the key`, with nothing to undo.
 *
 * Nothing in here touches `window`. The React shell is
 * `components/admin/SimContext.tsx`; the rules are testable without a DOM
 * (QĐ-9, the same split the cart uses).
 */

export const SIM_STORAGE_KEY = "brand.adminSim";
const SCHEMA_VERSION = 1;

/** Who a note came from. The shop's own hand, or a recorded action. */
export const NOTE_AUTHOR = "Cửa hàng";

/**
 * The other hand that can now write in here — added at v3 slice 4, when the
 * user decided a shopper may cancel their own unpaid order.
 *
 * The store is shared on purpose. A cancellation the shop cannot see is a
 * cancellation that did not happen: the back office reads `fixtures +
 * overlay`, so writing the shopper's action into the same log is what makes
 * `/admin/orders` show "Đã huỷ · khách huỷ" a reload later. It is still
 * simulation, it still lives in one browser, and `SimBar` still counts it.
 */
export const CUSTOMER_AUTHOR = "Khách";

/**
 * The reason recorded on an order the shopper called off themselves. Defined
 * beside `OVERDUE_REASON` since slice B2, where `cancel_order()` in the
 * database writes the same words; re-exported so this log keeps its name.
 */
export { CUSTOMER_CANCEL_REASON };

export type SimAction =
  | { kind: "ORDER_PAID"; at: string; code: string }
  | {
      kind: "ORDER_SHIPPED";
      at: string;
      code: string;
      /** Shown as-is: no courier has been signed, so it is typed in. */
      carrier: string;
      trackingCode: string;
    }
  | { kind: "ORDER_CANCELLED"; at: string; code: string; reason: string; note: string }
  /** The shopper's own hand, from their order screen. It carries no note. */
  | { kind: "ORDER_CANCELLED_BY_CUSTOMER"; at: string; code: string }
  | { kind: "ORDER_NOTE"; at: string; code: string; text: string }
  | { kind: "DROP_ADDED"; at: string; no: number; opensAt: string; closesAt: string }
  | { kind: "DROP_SCHEDULED"; at: string; no: number; opensAt: string; closesAt: string }
  | {
      kind: "PROMO_ADDED";
      at: string;
      code: string;
      promoKind: PromoKind;
      percent: number;
      amountVnd: number;
      maxDiscountVnd: number;
      minOrderVnd: number;
      usageLimit: number | null;
      startsAt: string;
      endsAt: string;
    }
  | { kind: "PROMO_PAUSED"; at: string; code: string; paused: boolean }
  /**
   * v3 slice 5. Seven more hands the back office has, every one of them the
   * same shape as the six above: an EVENT, with what it was and what it
   * became, so the activity log can read the store a second way instead of
   * keeping a second copy (`lib/activity-log.ts`).
   */
  | {
      kind: "ORDER_ADDRESS_EDITED";
      at: string;
      code: string;
      before: ShipTo;
      after: ShipTo;
      /** Required by the form: it goes in the log and on the slip. */
      reason: string;
    }
  /** No server sends anything. The action IS the record that it was asked for. */
  | { kind: "ORDER_CONFIRMATION_RESENT"; at: string; code: string; email: string }
  | {
      kind: "INVENTORY_ADJUSTED";
      at: string;
      productId: string;
      /** One entry per cell that moved. An adjustment is one decision. */
      cells: InventoryCell[];
      reason: string;
      /** An order code, a stocktake sheet — free text, may be empty. */
      ref: string;
      note: string;
    }
  | {
      kind: "PROMO_EDITED";
      at: string;
      /** The code as it stood before the edit — what this row is keyed on. */
      code: string;
      nextCode: string;
      promoKind: PromoKind;
      percent: number;
      amountVnd: number;
      maxDiscountVnd: number;
      minOrderVnd: number;
      usageLimit: number | null;
      startsAt: string;
      endsAt: string;
    }
  | { kind: "PROMO_LIMIT_RAISED"; at: string; code: string; before: number; after: number }
  /** Ending a run is its closing hour moved to now — never a fourth state. */
  | { kind: "PROMO_ENDED"; at: string; code: string; endsAt: string }
  | {
      kind: "TEASER_ADDED";
      at: string;
      no: number;
      name: string;
      /** Shown as-is, e.g. "Áo khoác dù". `kind` is taken by the tag. */
      garment: string;
      family: Family;
      photoKey: string;
    };

export type SimActionKind = SimAction["kind"];

/** The frozen delivery address an order carries. */
export type ShipTo = Order["shipTo"];

export interface InventoryCell {
  color: ColorKey;
  size: Size;
  before: number;
  after: number;
}

/** How many units this adjustment added (or removed) across every cell. */
export function cellDelta(cells: InventoryCell[]): number {
  return cells.reduce((n, c) => n + (c.after - c.before), 0);
}

export interface SimOverlay {
  /** Oldest first: replaying them in order is what produces the state. */
  actions: SimAction[];
}

export const EMPTY_SIM: SimOverlay = { actions: [] };

export function simCount(overlay: SimOverlay): number {
  return overlay.actions.length;
}

export function pushSim(overlay: SimOverlay, action: SimAction): SimOverlay {
  return { actions: [...overlay.actions, action] };
}

// ────────────────────────────────────────────────────────────────── storage
export function serializeSim(overlay: SimOverlay): string {
  return JSON.stringify({ v: SCHEMA_VERSION, actions: overlay.actions });
}

/**
 * Read the log back.
 *
 * Never throws and never half-trusts a record: what is in storage came from
 * another tab, an older build or devtools, and a malformed action would show
 * up on screen as an order in a state nothing can render. A record of the
 * wrong version is dropped whole; inside a valid record, only the actions
 * that type-check survive, because losing one simulated click is better than
 * losing the other nineteen.
 */
export function parseSim(raw: string | null): SimOverlay {
  if (!raw) return EMPTY_SIM;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_SIM;
  }

  if (!isRecord(parsed) || parsed.v !== SCHEMA_VERSION) return EMPTY_SIM;
  if (!Array.isArray(parsed.actions)) return EMPTY_SIM;

  return { actions: parsed.actions.filter(isAction) };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const str = (v: unknown) => typeof v === "string";
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

/** Which fields each kind must carry, and of what type. */
function isAction(v: unknown): v is SimAction {
  if (!isRecord(v) || !str(v.kind) || !str(v.at)) return false;
  switch (v.kind) {
    case "ORDER_PAID":
      return str(v.code);
    case "ORDER_SHIPPED":
      return str(v.code) && str(v.carrier) && str(v.trackingCode);
    case "ORDER_CANCELLED":
      return str(v.code) && str(v.reason) && str(v.note);
    case "ORDER_CANCELLED_BY_CUSTOMER":
      return str(v.code);
    case "ORDER_NOTE":
      return str(v.code) && str(v.text);
    case "DROP_ADDED":
    case "DROP_SCHEDULED":
      return num(v.no) && str(v.opensAt) && str(v.closesAt);
    case "PROMO_ADDED":
      return (
        str(v.code) &&
        (v.promoKind === "PERCENT" ||
          v.promoKind === "AMOUNT" ||
          v.promoKind === "FREE_SHIPPING") &&
        num(v.percent) &&
        num(v.amountVnd) &&
        num(v.maxDiscountVnd) &&
        num(v.minOrderVnd) &&
        (v.usageLimit === null || num(v.usageLimit)) &&
        str(v.startsAt) &&
        str(v.endsAt)
      );
    case "PROMO_PAUSED":
      return str(v.code) && typeof v.paused === "boolean";
    case "ORDER_ADDRESS_EDITED":
      return str(v.code) && isShipTo(v.before) && isShipTo(v.after) && str(v.reason);
    case "ORDER_CONFIRMATION_RESENT":
      return str(v.code) && str(v.email);
    case "INVENTORY_ADJUSTED":
      return (
        str(v.productId) &&
        Array.isArray(v.cells) &&
        v.cells.every(isCell) &&
        str(v.reason) &&
        str(v.ref) &&
        str(v.note)
      );
    case "PROMO_EDITED":
      return (
        str(v.code) &&
        str(v.nextCode) &&
        (v.promoKind === "PERCENT" ||
          v.promoKind === "AMOUNT" ||
          v.promoKind === "FREE_SHIPPING") &&
        num(v.percent) &&
        num(v.amountVnd) &&
        num(v.maxDiscountVnd) &&
        num(v.minOrderVnd) &&
        (v.usageLimit === null || num(v.usageLimit)) &&
        str(v.startsAt) &&
        str(v.endsAt)
      );
    case "PROMO_LIMIT_RAISED":
      return str(v.code) && num(v.before) && num(v.after);
    case "PROMO_ENDED":
      return str(v.code) && str(v.endsAt);
    case "TEASER_ADDED":
      return num(v.no) && str(v.name) && str(v.garment) && str(v.family) && str(v.photoKey);
    default:
      return false;
  }
}

function isShipTo(v: unknown): v is ShipTo {
  return (
    isRecord(v) &&
    str(v.recipient) &&
    str(v.phone) &&
    str(v.line) &&
    str(v.provinceCode) &&
    str(v.wardCode)
  );
}

function isCell(v: unknown): v is InventoryCell {
  return isRecord(v) && str(v.color) && str(v.size) && num(v.before) && num(v.after);
}

// ─────────────────────────────────────────────────────────────────── orders
/**
 * The status an order ends up in, and the courier that carried it.
 *
 * `carrier` cannot live in `OrderStatus`: that type is the wire format
 * (`data/types.ts`) and the fixtures have no courier field, because no
 * shipping partner has been signed. It travels beside the status instead of
 * being smuggled into it.
 */
export interface OrderPatch {
  status: OrderStatus;
  carrier?: string;
}

export function orderPatches(overlay: SimOverlay): Map<string, OrderPatch> {
  const patches = new Map<string, OrderPatch>();
  for (const a of overlay.actions) {
    switch (a.kind) {
      case "ORDER_PAID":
        patches.set(a.code, { status: { state: "PAID", paidAt: a.at } });
        break;
      case "ORDER_SHIPPED":
        patches.set(a.code, {
          status: { state: "SHIPPING", shippedAt: a.at, trackingCode: a.trackingCode },
          carrier: a.carrier,
        });
        break;
      case "ORDER_CANCELLED":
        patches.set(a.code, {
          status: { state: "CANCELLED", cancelledAt: a.at, reason: a.reason },
        });
        break;
      case "ORDER_CANCELLED_BY_CUSTOMER":
        patches.set(a.code, {
          status: {
            state: "CANCELLED",
            cancelledAt: a.at,
            reason: CUSTOMER_CANCEL_REASON,
          },
        });
        break;
      default:
        break;
    }
  }
  return patches;
}

/**
 * The order book as this browser has it.
 *
 * The array keeps its order and its length: an overlay can move an order
 * between states, never add or remove one. Everything downstream — the
 * queue, the tabs, the KPIs, the chart — is the existing derivation run over
 * this list instead of over `ORDERS`.
 */
export function simOrders(base: Order[], overlay: SimOverlay): Order[] {
  const patches = orderPatches(overlay);
  const addresses = addressPatches(overlay);
  if (patches.size === 0 && addresses.size === 0) return base;
  return base.map((o) => {
    const patch = patches.get(o.code);
    const shipTo = addresses.get(o.code);
    if (!patch && !shipTo) return o;
    return {
      ...o,
      ...(patch ? { status: patch.status } : {}),
      ...(shipTo ? { shipTo } : {}),
    };
  });
}

/**
 * Where each edited order is going now.
 *
 * The LAST edit wins, and it replaces the frozen copy on the order rather
 * than sitting beside it: the table, the slip and the courier all have to
 * read one address, and two of them reading the old one is the failure this
 * whole feature exists to prevent.
 */
export function addressPatches(overlay: SimOverlay): Map<string, ShipTo> {
  const at = new Map<string, ShipTo>();
  for (const a of overlay.actions) {
    if (a.kind === "ORDER_ADDRESS_EDITED") at.set(a.code, a.after);
  }
  return at;
}

/** Why this order's address was last changed, for the slip and the log. */
export function addressEditReason(code: string, overlay: SimOverlay): string | undefined {
  let reason: string | undefined;
  for (const a of overlay.actions) {
    if (a.kind === "ORDER_ADDRESS_EDITED" && a.code === code) reason = a.reason;
  }
  return reason;
}

/**
 * The same log read from the SHOP side — NARROWER than the back office's.
 *
 * DESIGN.md §8 records that the overlay lives in the back office and that
 * the shop reads the fixtures as they are. The reason behind that rule is
 * one specific lie, and it is worth stating precisely rather than applying
 * the rule by its shape: **the mock must never tell a shopper that money
 * arrived**. `ORDER_PAID` is a claim about a bank this build has no
 * connection to, so it stops at the back office.
 *
 * Three actions do cross, because each is a real thing that happened to the
 * ORDER rather than a claim about a payment:
 *
 *   · `ORDER_CANCELLED_BY_CUSTOMER` — they pressed the button, on this
 *     device, a moment ago (v3 slice 4, the user's decision).
 *   · `ORDER_SHIPPED` — a parcel was handed over and given a number, and
 *     that number is the shopper's to read. The handover form promises them
 *     exactly that ("khách thấy mã này ở tra cứu đơn"), so `/track` and
 *     "Đơn của tôi" have to show it or the promise is false.
 *   · `ORDER_CANCELLED` — the shop called it off, and the cancel sheet says
 *     in as many words that the shopper will see the reason.
 *
 * An address edit rides along with the order it belongs to, for the same
 * reason: the shopper asked for it.
 */
const SHOP_VISIBLE = new Set<SimActionKind>([
  "ORDER_CANCELLED_BY_CUSTOMER",
  "ORDER_SHIPPED",
  "ORDER_CANCELLED",
]);

export function shopOrders(base: Order[], overlay: SimOverlay): Order[] {
  const patches = new Map<string, OrderPatch>();
  for (const a of overlay.actions) {
    if (!SHOP_VISIBLE.has(a.kind)) continue;
    switch (a.kind) {
      case "ORDER_CANCELLED_BY_CUSTOMER":
        patches.set(a.code, {
          status: { state: "CANCELLED", cancelledAt: a.at, reason: CUSTOMER_CANCEL_REASON },
        });
        break;
      case "ORDER_CANCELLED":
        patches.set(a.code, {
          status: { state: "CANCELLED", cancelledAt: a.at, reason: a.reason },
        });
        break;
      case "ORDER_SHIPPED":
        patches.set(a.code, {
          status: { state: "SHIPPING", shippedAt: a.at, trackingCode: a.trackingCode },
          carrier: a.carrier,
        });
        break;
      default:
        break;
    }
  }
  const addresses = addressPatches(overlay);
  if (patches.size === 0 && addresses.size === 0) return base;
  return base.map((o) => {
    const patch = patches.get(o.code);
    const shipTo = addresses.get(o.code);
    if (!patch && !shipTo) return o;
    return {
      ...o,
      ...(patch ? { status: patch.status } : {}),
      ...(shipTo ? { shipTo } : {}),
    };
  });
}

export function carrierOf(code: string, overlay: SimOverlay): string | undefined {
  return orderPatches(overlay).get(code)?.carrier;
}

// ──────────────────────────────────────────────────────────────────── notes
export interface SimNote {
  /** Shown as-is. */
  text: string;
  /** "Cửa hàng", or empty for a note the system wrote. */
  author: string;
  at: string;
  /** A note nobody typed — rendered quieter, `.ni.sys`. */
  system: boolean;
}

/**
 * The internal notes an order has picked up in this browser.
 *
 * An action writes its own note, which is why the timeline and the notes can
 * never disagree: they are the same log read twice. A cancellation with an
 * internal comment produces two notes — what happened, and what the shop
 * wrote about it — because they have different authors.
 */
export function simNotes(code: string, overlay: SimOverlay): SimNote[] {
  const notes: SimNote[] = [];
  for (const a of overlay.actions) {
    if (!("code" in a) || a.code !== code) continue;
    switch (a.kind) {
      case "ORDER_PAID":
        notes.push({
          text: "Đã ghi nhận tiền về · đơn chuyển sang Đã thanh toán.",
          author: "",
          at: a.at,
          system: true,
        });
        break;
      case "ORDER_SHIPPED":
        notes.push({
          text: `Bàn giao · ${a.carrier} · mã vận đơn ${a.trackingCode}.`,
          author: "",
          at: a.at,
          system: true,
        });
        break;
      case "ORDER_CANCELLED":
        notes.push({
          text: `Huỷ đơn · lý do: ${a.reason}.`,
          author: "",
          at: a.at,
          system: true,
        });
        if (a.note.trim()) {
          notes.push({ text: a.note.trim(), author: NOTE_AUTHOR, at: a.at, system: false });
        }
        break;
      case "ORDER_CANCELLED_BY_CUSTOMER":
        // Two notes would be one too many: nobody typed anything, and the
        // line has to say WHO, because "Huỷ đơn" with no hand named reads
        // as the shop's own doing.
        notes.push({
          text: "Khách huỷ đơn · đơn chưa thanh toán, hàng về kệ.",
          author: CUSTOMER_AUTHOR,
          at: a.at,
          system: false,
        });
        break;
      case "ORDER_NOTE":
        notes.push({ text: a.text, author: NOTE_AUTHOR, at: a.at, system: false });
        break;
      case "ORDER_ADDRESS_EDITED":
        notes.push({
          text: `Sửa địa chỉ giao · lý do: ${a.reason}`,
          author: "",
          at: a.at,
          system: true,
        });
        break;
      case "ORDER_CONFIRMATION_RESENT":
        // "Đã ghi", not "đã gửi". Nothing left the building, and a note
        // claiming otherwise is the one thing this store must never write.
        notes.push({
          text: `Đã ghi nhật ký: gửi lại xác nhận tới ${a.email} · chưa có máy chủ gửi.`,
          author: "",
          at: a.at,
          system: true,
        });
        break;
      default:
        break;
    }
  }
  return notes;
}

// ──────────────────────────────────────────────────────────────────── drops
export interface SimDrop extends Drop {
  /** Created in this browser: it exists in no fixture. */
  simulated: boolean;
  /** Its opening or closing hour was moved here. */
  rescheduled: boolean;
}

/**
 * The drops as this browser has them, newest number first.
 *
 * "Đóng số sớm" is NOT a fourth state. A drop's state is derived from its
 * two instants and nothing else (`lib/drop.ts`), so closing one early is the
 * closing hour moved to now — which is exactly what the mock's own note says,
 * and what keeps `dropState` the single answer to "is it open".
 */
export function simDrops(base: readonly Drop[], overlay: SimOverlay): SimDrop[] {
  const rows = new Map<number, SimDrop>(
    base.map((d) => [d.no, { ...d, simulated: false, rescheduled: false }]),
  );

  for (const a of overlay.actions) {
    if (a.kind === "DROP_ADDED") {
      rows.set(a.no, {
        no: a.no,
        opensAt: a.opensAt,
        closesAt: a.closesAt,
        simulated: true,
        rescheduled: false,
      });
    } else if (a.kind === "DROP_SCHEDULED") {
      const row = rows.get(a.no);
      if (row) {
        rows.set(a.no, { ...row, opensAt: a.opensAt, closesAt: a.closesAt, rescheduled: true });
      }
    }
  }

  return [...rows.values()].sort((a, b) => b.no - a.no);
}

/** The next drop number nobody has used — what the "tạo số" form offers. */
export function nextDropNo(drops: SimDrop[] | Drop[]): number {
  return drops.reduce((n, d) => Math.max(n, d.no), 0) + 1;
}

// ─────────────────────────────────────────────────────────────── promotions
export interface SimPromotion {
  promo: Promotion;
  /** Created in this browser. */
  simulated: boolean;
  /** Paused here: checkout would refuse it from now on. */
  paused: boolean;
  /** Its terms, its cap or its closing hour were changed here. */
  edited: boolean;
}

/**
 * The codes as this browser has them.
 *
 * Pausing is a flag on the ROW and not a rewritten `endsAt`: ending a code
 * early and pausing it are different promises — one is over, the other can be
 * resumed — and burying the difference in a date would make "Tiếp tục"
 * impossible to express.
 */
export function simPromotions(
  base: readonly Promotion[],
  overlay: SimOverlay,
): SimPromotion[] {
  const rows: SimPromotion[] = base.map((promo) => ({
    promo,
    simulated: false,
    paused: false,
    edited: false,
  }));
  const at = new Map(rows.map((r) => [String(r.promo.code), r]));

  for (const a of overlay.actions) {
    if (a.kind === "PROMO_ADDED") {
      const row: SimPromotion = {
        promo: buildPromo(a),
        simulated: true,
        paused: false,
        edited: false,
      };
      const existing = at.get(a.code);
      if (existing) {
        Object.assign(existing, row);
      } else {
        at.set(a.code, row);
        rows.unshift(row);
      }
    } else if (a.kind === "PROMO_PAUSED") {
      const row = at.get(a.code);
      if (row) row.paused = a.paused;
    } else if (a.kind === "PROMO_EDITED") {
      const row = at.get(a.code);
      if (!row) continue;
      // `usedCount` SURVIVES the edit. It is what the code has already done,
      // and rewriting the terms does not un-redeem anything; the sheet says
      // so ("đổi điều kiện chỉ áp cho đơn đặt từ lúc lưu").
      row.promo = buildPromo({ ...a, code: a.nextCode }, row.promo.usedCount);
      row.edited = true;
      if (a.nextCode !== a.code) {
        at.delete(a.code);
        at.set(a.nextCode, row);
      }
    } else if (a.kind === "PROMO_LIMIT_RAISED") {
      const row = at.get(a.code);
      if (row) {
        row.promo = { ...row.promo, usageLimit: a.after };
        row.edited = true;
      }
    } else if (a.kind === "PROMO_ENDED") {
      const row = at.get(a.code);
      if (row) {
        // Ending early is the closing hour moved, the same mechanism the
        // issues use — never a state flag nobody can derive.
        row.promo = { ...row.promo, endsAt: a.endsAt };
        row.edited = true;
      }
    }
  }

  return rows;
}

/** The terms a created or edited code carries, minus the code itself. */
type PromoTerms = Omit<Extract<SimAction, { kind: "PROMO_ADDED" }>, "kind" | "at">;

function buildPromo(a: PromoTerms, usedCount = 0): Promotion {
  const window = {
    code: promoCode(a.code) as PromoCode,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    usageLimit: a.usageLimit,
    // A created code has redeemed nothing: it was made a moment ago and this
    // build records no redemptions at all. An EDITED one keeps what it had.
    usedCount,
    ...(a.minOrderVnd > 0 ? { minOrderVnd: a.minOrderVnd } : {}),
  };

  if (a.promoKind === "PERCENT") {
    return {
      ...window,
      kind: "PERCENT",
      percent: a.percent,
      ...(a.maxDiscountVnd > 0 ? { maxDiscountVnd: a.maxDiscountVnd } : {}),
    };
  }
  if (a.promoKind === "AMOUNT") {
    return { ...window, kind: "AMOUNT", amountVnd: a.amountVnd };
  }
  return { ...window, kind: "FREE_SHIPPING" };
}

// ───────────────────────────────────────────────────────────────── the shelf
/**
 * The catalogue as this browser has it.
 *
 * An adjustment moves UNITS ON HAND, never `cutUnits`: the cut is a fact
 * about a bolt of cloth that was already scissored, and a back office that
 * could raise it would be a back office that can sew. `soldUnits` is
 * `cut − onHand` everywhere (`lib/inventory.ts`), so putting a returned
 * piece back on the shelf correctly un-sells it, and the drop's revenue
 * follows without anybody writing a second rule.
 *
 * The array keeps its order and its length. Nothing here adds or removes a
 * style; `/admin/products/new` still says out loud that it cannot save.
 */
export function simProducts(
  base: readonly Product[],
  overlay: SimOverlay,
): readonly Product[] {
  const byProduct = new Map<string, InventoryCell[]>();
  for (const a of overlay.actions) {
    if (a.kind !== "INVENTORY_ADJUSTED") continue;
    byProduct.set(a.productId, [...(byProduct.get(a.productId) ?? []), ...a.cells]);
  }
  if (byProduct.size === 0) return base;

  return base.map((p) => {
    const cells = byProduct.get(String(p.id));
    if (!cells || cells.length === 0) return p;
    const stock: Stock = {};
    for (const c of p.colors) stock[c] = { ...(p.stock[c] ?? { S: 0, M: 0, L: 0, XL: 0 }) };
    for (const cell of cells) {
      const row = stock[cell.color];
      if (row) row[cell.size] = cell.after;
    }
    return { ...p, stock };
  });
}

/**
 * The teasers as this browser has them — the fixtures, plus any announced
 * here, newest last.
 *
 * A teaser carries a name, a kind and a borrowed photo and NOTHING ELSE: no
 * price, no cut. Those two are published at the hour the issue opens, and a
 * form that asked for them would be collecting numbers the shop has not
 * decided (`Teaser` in data/types.ts says the same).
 */
export function simTeasers(
  base: readonly Teaser[],
  overlay: SimOverlay,
): readonly Teaser[] {
  const added: Teaser[] = [];
  for (const a of overlay.actions) {
    if (a.kind !== "TEASER_ADDED") continue;
    added.push({
      slug: teaserSlug(a.name, a.no),
      name: a.name,
      kind: a.garment,
      family: a.family,
      dropNo: a.no,
      photoKey: a.photoKey,
    });
  }
  return added.length === 0 ? base : [...base, ...added];
}

/** Whether this teaser was announced in this browser rather than in a fixture. */
export function isSimTeaser(slug: string, overlay: SimOverlay): boolean {
  return overlay.actions.some(
    (a) => a.kind === "TEASER_ADDED" && teaserSlug(a.name, a.no) === slug,
  );
}

/**
 * A URL segment for a style announced here.
 *
 * Derived from the name and the issue rather than random, so the same teaser
 * added twice is the same row instead of two. Diacritics are stripped the
 * way the catalogue's own slugs are written (`khoi`, `suong`, `nguoi`) — a
 * slug is an address, and an address is English letters.
 */
export function teaserSlug(name: string, no: number): string {
  const ascii = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${ascii || "mau"}-${no}`;
}
