import type {
  ColorKey,
  Drop,
  Family,
  Product,
  Promotion,
  PromoCode,
  Size,
  Stock,
  Teaser,
} from "@/data/types";
import { promoCode } from "@/data/types";

/** The three shapes a code can take, named once so the log can store it. */
export type PromoKind = Promotion["kind"];

/**
 * What the back office did on THIS BROWSER to what is still simulated —
 * stock, issues, teasers and discount codes — and nothing else.
 *
 * SINCE SLICE B3A AN ORDER IS NOT IN HERE. Every move the shop makes on an
 * order — confirming the money, the handover, the delivery, a cancellation,
 * a note, a new address — is a Postgres function with a guard and an entry
 * in the `events` table (`supabase/migrations/…_admin.sql`), and the order
 * screens read the database. What is left in this file is the part slice
 * B3b moves next, and until then it keeps working the way it always has.
 *
 * The user's decision (question 3 of the v2 round) still holds for what is
 * left: a simulated action must nevertheless be REAL STATE — adjusting a
 * shelf has to change the numbers, survive a reload, and never pretend that
 * anything left this machine. So each action is recorded here as an event,
 * the events live in one versioned `localStorage` key, and the screens render
 * `catalogue + overlay` through the pure functions below.
 *
 * An EVENT LOG rather than a patched copy, for the reasons that held when it
 * was built: the sidebar has to say how many changes live in this browser,
 * and that is `actions.length`; the activity log reads the same actions a
 * second way (`lib/activity-log.ts#simLogRows`); and wiping the key is all a
 * reset of this browser's half needs.
 *
 * Nothing in here touches `window`. The React shell is
 * `components/admin/SimContext.tsx`; the rules are testable without a DOM
 * (QĐ-9, the same split the cart uses).
 */

export const SIM_STORAGE_KEY = "brand.adminSim";
/**
 * Still 1: a record written before slice B3a stays readable. The order
 * actions it may hold are simply not kinds this file knows any more, so
 * `parseSim` drops them and keeps the rest.
 */
const SCHEMA_VERSION = 1;

export type SimAction =
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
   * v3 slice 5. The same shape as the rest: an EVENT, with what it was and
   * what it became, so the activity log can read the store a second way
   * instead of keeping a second copy (`lib/activity-log.ts`).
   */
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
 * up on screen as a shelf or a code in a state nothing can render. A record
 * of the wrong version is dropped whole; inside a valid record, only the
 * actions that type-check survive, because losing one simulated click is
 * better than losing the other nineteen — and an action of a kind this build
 * no longer keeps here (an order's, from before slice B3a) is one of those.
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

function isCell(v: unknown): v is InventoryCell {
  return isRecord(v) && str(v.color) && str(v.size) && num(v.before) && num(v.after);
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
