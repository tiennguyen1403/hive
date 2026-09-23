import {
  COLOR_KEYS,
  FAMILIES,
  SIZES,
  type ColorKey,
  type Family,
  type Fit,
  type OrderState,
  type Size,
} from "@/data/types";
import type { ShipTo } from "@/lib/admin-orders";
import type { PromoKind, PromoTerms } from "@/lib/catalog-admin";
import type { InventoryCell } from "@/lib/inventory-adjust";

/**
 * The border between `public.events` and the back office's screens.
 *
 * The log is read straight off the table (row level security lets the
 * manager, and only the manager, see it — `lib/db/admin.ts`), and a row
 * arrives as columns plus a `payload` that is `jsonb`: whatever the writing
 * function put there, typed `unknown` on the way in. This module checks every
 * field it uses and flattens each row into one member of `AdminEvent`, whose
 * fields are the ones the `SimAction` of the same name carried before slices
 * B3a and B3b — so the activity log and the order's notes changed where they
 * read from, not what they say.
 *
 * Since slice B3b the catalogue writes here too: the shelf, the styles, the
 * issues, the teasers and the codes. Those rows name what they are about in a
 * column of their own (`product_id`, `promo_code`, `drop_no`), which the
 * table's check constraints require, and that column — not the payload — is
 * where this module reads it from. Slice B3c added three about one style: it
 * was created, one colour's photo was swapped, its band order changed.
 *
 * Pure and free of `server-only`, for the reason `order-dto.ts` gives: the
 * marker does not resolve under vitest, and a mapper nobody can test is a
 * mapper nobody trusts. `event-dto.test.ts` sits beside it.
 */

export const EVENT_KINDS = [
  "ORDER_PLACED",
  "ORDER_PAID",
  "ORDER_SHIPPED",
  "ORDER_DELIVERED",
  "ORDER_CANCELLED",
  "ORDER_CANCELLED_BY_CUSTOMER",
  "ORDER_EXPIRED",
  "ORDER_NOTE",
  "ORDER_ADDRESS_EDITED",
  "DEMO_RESET",
  "INVENTORY_ADJUSTED",
  "PRODUCT_EDITED",
  "PRODUCT_ADDED",
  "PRODUCT_PHOTO_SET",
  "PRODUCT_COLORS_REORDERED",
  "DROP_ADDED",
  "DROP_SCHEDULED",
  "TEASER_ADDED",
  "PROMO_ADDED",
  "PROMO_EDITED",
  "PROMO_PAUSED",
  "PROMO_LIMIT_RAISED",
  "PROMO_ENDED",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

/** Who acted: the shop's manager, the shopper, or nobody (the clock, a script). */
export type ActorRole = "admin" | "customer" | "system";

interface EventBase {
  id: number;
  /** ISO with `+07:00`, to the second — `lib/datetime.ts` reads the text. */
  at: string;
  actorRole: ActorRole;
  /** The email of whoever acted; "" for the system. */
  actor: string;
}

interface OrderEventBase extends EventBase {
  /** The order it happened to. */
  code: string;
}

/** A style's own fields as `PRODUCT_EDITED` keeps them — only the changed ones. */
export interface ProductFields {
  name?: string;
  kind?: string;
  family?: Family;
  slug?: string;
  priceVnd?: number;
  material?: string;
  fit?: Fit;
  dropNo?: number;
}

/** An issue's two instants, as `DROP_SCHEDULED` keeps them. */
export interface DropWindow {
  opensAt: string;
  closesAt: string;
}

/** The events about an order — the kinds whose `code` is an order code. */
export type OrderEvent =
  | (OrderEventBase & { kind: "ORDER_PLACED" })
  /** `from`: the state it left — a transfer being waited on, or a card / COD order taken. */
  | (OrderEventBase & { kind: "ORDER_PAID"; from?: OrderState })
  | (OrderEventBase & {
      kind: "ORDER_SHIPPED";
      from?: OrderState;
      /** Absent on the sample's handovers, which recorded no courier. */
      carrier?: string;
      trackingCode: string;
    })
  | (OrderEventBase & { kind: "ORDER_DELIVERED" })
  | (OrderEventBase & { kind: "ORDER_CANCELLED"; from?: OrderState; reason: string; note: string })
  | (OrderEventBase & { kind: "ORDER_CANCELLED_BY_CUSTOMER"; from?: OrderState })
  | (OrderEventBase & { kind: "ORDER_EXPIRED" })
  | (OrderEventBase & { kind: "ORDER_NOTE"; text: string })
  | (OrderEventBase & { kind: "ORDER_ADDRESS_EDITED"; before: ShipTo; after: ShipTo; reason: string });

/** The events about the catalogue (slice B3b), each naming what it is about. */
export type CatalogEvent =
  | (EventBase & {
      kind: "INVENTORY_ADJUSTED";
      productId: string;
      /** One entry per cell that moved. An adjustment is one decision. */
      cells: InventoryCell[];
      reason: string;
      /** An order code, a stocktake sheet — free text, may be empty. */
      ref: string;
      note: string;
      /** Units added (negative: removed) across every cell. */
      delta: number;
    })
  | (EventBase & { kind: "PRODUCT_EDITED"; productId: string; before: ProductFields; after: ProductFields })
  | (EventBase & {
      kind: "PRODUCT_ADDED";
      productId: string;
      /** As it was created — the style may have been renamed since. */
      name: string;
      slug: string;
      dropNo: number;
      /** Band order. */
      colors: ColorKey[];
      cutUnits: number;
      /** How many of its photos were uploads, and how many borrowed frames. */
      uploaded: number;
      borrowed: number;
    })
  | (EventBase & {
      kind: "PRODUCT_PHOTO_SET";
      productId: string;
      color: ColorKey;
      /** Photo keys: a borrowed frame's (`khoi`) or an upload's (`up/…`). */
      before: string;
      after: string;
    })
  | (EventBase & { kind: "PRODUCT_COLORS_REORDERED"; productId: string; before: ColorKey[]; after: ColorKey[] })
  | (EventBase & { kind: "DROP_ADDED"; no: number; opensAt: string; closesAt: string })
  | (EventBase & { kind: "DROP_SCHEDULED"; no: number; before: DropWindow; after: DropWindow })
  | (EventBase & {
      kind: "TEASER_ADDED";
      no: number;
      slug: string;
      name: string;
      /** Shown as-is, e.g. "Áo khoác dù" — `Teaser.kind`. */
      garment: string;
      family: Family;
      photoKey: string;
    })
  | (EventBase & { kind: "PROMO_ADDED"; promoCode: string; terms: PromoTerms })
  | (EventBase & { kind: "PROMO_EDITED"; promoCode: string; before: PromoTerms; after: PromoTerms })
  | (EventBase & { kind: "PROMO_PAUSED"; promoCode: string; paused: boolean })
  | (EventBase & {
      kind: "PROMO_LIMIT_RAISED";
      promoCode: string;
      /** Null when the code had no limit before. */
      before: number | null;
      after: number;
    })
  | (EventBase & {
      kind: "PROMO_ENDED";
      promoCode: string;
      /** The closing instant it had, and the one it got — now. */
      before: string;
      after: string;
    });

export type AdminEvent =
  | OrderEvent
  | CatalogEvent
  | (EventBase & {
      kind: "DEMO_RESET";
      /** The 18:50 the sample was shifted onto. */
      anchor: string;
    });

/** Whether an event is about an order — the only kinds that carry an order code. */
export function isOrderEvent(e: AdminEvent): e is OrderEvent {
  return e.kind.startsWith("ORDER_");
}

/** Exactly the columns `lib/db/admin.ts` selects. */
export interface EventRow {
  id: number;
  at: string;
  actor_role: string;
  actor: string;
  kind: string;
  order_code: string | null;
  product_id: string | null;
  promo_code: string | null;
  drop_no: number | null;
  payload: unknown;
}

// ─────────────────────────────────────────────────────────────── checking
const fail = (path: string, expected: string): never => {
  throw new Error(`${path} ${expected}`);
};

const VN_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;

const STATES: readonly OrderState[] = [
  "AWAITING_TRANSFER",
  "RECEIVED",
  "PAID",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];

const ROLES: readonly ActorRole[] = ["admin", "customer", "system"];

/**
 * A `timestamptz` as PostgREST sends it — normalised to the connection's zone,
 * usually `+00:00`, often with microseconds — rewritten as the Vietnamese
 * wall clock with the offset spelled out, to the second. Every formatter in
 * `lib/datetime.ts` reads the text, so a UTC string would print a moment
 * seven hours early. Throws on anything that is not a moment.
 */
export function vnIso(raw: string, path = "timestamp"): string {
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return fail(path, "must be a timestamp");
  return `${new Date(t + 7 * 3_600_000).toISOString().slice(0, 19)}+07:00`;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "must be an object");
  }
  return value as Record<string, unknown>;
}

function text(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key];
  if (typeof value !== "string" || value === "") {
    return fail(`${path}.${key}`, "must be a non-empty string");
  }
  return value;
}

function textOrEmpty(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return fail(`${path}.${key}`, "must be a string");
  return value;
}

/** `from`, when the writer recorded one. */
function fromState(source: Record<string, unknown>, path: string): { from?: OrderState } {
  const value = source.from;
  if (value === undefined || value === null) return {};
  if (typeof value !== "string" || !(STATES as readonly string[]).includes(value)) {
    return fail(`${path}.from`, `must be one of ${STATES.join(", ")}`);
  }
  return { from: value as OrderState };
}

function shipTo(value: unknown, path: string): ShipTo {
  const source = record(value, path);
  return {
    recipient: text(source, "recipient", path),
    phone: text(source, "phone", path),
    line: text(source, "line", path),
    provinceCode: text(source, "provinceCode", path),
    wardCode: text(source, "wardCode", path),
  };
}

// ───────────────────────────────────────────── the catalogue's payloads
function whole(source: Record<string, unknown>, key: string, path: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fail(`${path}.${key}`, "must be a whole number");
  }
  return value;
}

function wholeOrNull(source: Record<string, unknown>, key: string, path: string): number | null {
  const value = source[key];
  if (value === undefined || value === null) return null;
  return whole(source, key, path);
}

function instantOf(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key];
  if (typeof value !== "string" || !VN_ISO.test(value)) {
    return fail(`${path}.${key}`, "must be an ISO instant ending in +07:00");
  }
  return value;
}

function member<T extends string>(
  allowed: readonly T[],
  source: Record<string, unknown>,
  key: string,
  path: string,
): T {
  const value = source[key];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    return fail(`${path}.${key}`, `must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

const PROMO_KINDS: readonly PromoKind[] = ["PERCENT", "AMOUNT", "FREE_SHIPPING"];
const FITS: readonly Fit[] = ["OVERSIZE", "REGULAR"];

/** A code's terms as `public.read_promo_terms()` wrote them. */
function promoTerms(value: unknown, path: string): PromoTerms {
  const source = record(value, path);
  return {
    kind: member(PROMO_KINDS, source, "kind", path),
    percent: wholeOrNull(source, "percent", path),
    maxDiscountVnd: wholeOrNull(source, "maxDiscountVnd", path),
    amountVnd: wholeOrNull(source, "amountVnd", path),
    minOrderVnd: wholeOrNull(source, "minOrderVnd", path),
    usageLimit: wholeOrNull(source, "usageLimit", path),
    startsAt: instantOf(source, "startsAt", path),
    endsAt: instantOf(source, "endsAt", path),
  };
}

function inventoryCells(value: unknown, path: string): InventoryCell[] {
  if (!Array.isArray(value)) return fail(path, "must be an array");
  return value.map((item, i) => {
    const at = `${path}[${i}]`;
    const source = record(item, at);
    return {
      color: member<ColorKey>(COLOR_KEYS, source, "color", at),
      size: member<Size>(SIZES, source, "size", at),
      before: whole(source, "before", at),
      after: whole(source, "after", at),
    };
  });
}

/** Only the fields a style edit changed — each one checked for its own type. */
function productFields(value: unknown, path: string): ProductFields {
  const source = record(value, path);
  const out: ProductFields = {};
  if ("name" in source) out.name = text(source, "name", path);
  if ("kind" in source) out.kind = text(source, "kind", path);
  if ("family" in source) out.family = member<Family>(FAMILIES, source, "family", path);
  if ("slug" in source) out.slug = text(source, "slug", path);
  if ("priceVnd" in source) out.priceVnd = whole(source, "priceVnd", path);
  if ("material" in source) out.material = text(source, "material", path);
  if ("fit" in source) out.fit = member(FITS, source, "fit", path);
  if ("dropNo" in source) out.dropNo = whole(source, "dropNo", path);
  return out;
}

/** A band order: a list of colour keys. */
function colorList(value: unknown, path: string): ColorKey[] {
  if (!Array.isArray(value)) return fail(path, "must be an array");
  return value.map((c, i) => {
    if (typeof c !== "string" || !(COLOR_KEYS as readonly string[]).includes(c)) {
      return fail(`${path}[${i}]`, `must be one of ${COLOR_KEYS.join(", ")}`);
    }
    return c as ColorKey;
  });
}

function dropWindow(value: unknown, path: string): DropWindow {
  const source = record(value, path);
  return { opensAt: instantOf(source, "opensAt", path), closesAt: instantOf(source, "closesAt", path) };
}

/** The column naming what a catalogue event is about, which the table requires. */
function column<T>(value: T | null, path: string, expected: string): T {
  if (value === null || value === undefined || value === "") return fail(path, expected);
  return value;
}

export function isEventKind(kind: string): kind is EventKind {
  return (EVENT_KINDS as readonly string[]).includes(kind);
}

// ─────────────────────────────────────────────────────────────── reading
/** One row of `public.events`. Throws, naming the field, on anything else. */
export function toEvent(row: EventRow): AdminEvent {
  const path = `event ${row.id}`;
  if (!Number.isInteger(row.id)) fail("event.id", "must be a whole number");
  if (!isEventKind(row.kind)) return fail(`${path}.kind`, `must be one of ${EVENT_KINDS.join(", ")}`);
  if (!(ROLES as readonly string[]).includes(row.actor_role)) {
    fail(`${path}.actor_role`, `must be one of ${ROLES.join(", ")}`);
  }

  const base: EventBase = {
    id: row.id,
    at: vnIso(row.at, `${path}.at`),
    actorRole: row.actor_role as ActorRole,
    actor: typeof row.actor === "string" ? row.actor : "",
  };
  const payload = record(row.payload ?? {}, `${path}.payload`);
  const at = `${path}.payload`;

  if (row.kind === "DEMO_RESET") {
    const anchor = text(payload, "anchor", at);
    if (!VN_ISO.test(anchor)) fail(`${at}.anchor`, "must be an ISO instant ending in +07:00");
    return { ...base, kind: "DEMO_RESET", anchor };
  }

  switch (row.kind) {
    case "INVENTORY_ADJUSTED":
      return {
        ...base,
        kind: row.kind,
        productId: column(row.product_id, `${path}.product_id`, "must name the style"),
        cells: inventoryCells(payload.cells, `${at}.cells`),
        reason: text(payload, "reason", at),
        ref: textOrEmpty(payload, "ref", at),
        note: textOrEmpty(payload, "note", at),
        delta: whole(payload, "delta", at),
      };
    case "PRODUCT_EDITED":
      return {
        ...base,
        kind: row.kind,
        productId: column(row.product_id, `${path}.product_id`, "must name the style"),
        before: productFields(payload.before, `${at}.before`),
        after: productFields(payload.after, `${at}.after`),
      };
    case "PRODUCT_ADDED":
      return {
        ...base,
        kind: row.kind,
        productId: column(row.product_id, `${path}.product_id`, "must name the style"),
        name: text(payload, "name", at),
        slug: text(payload, "slug", at),
        dropNo: whole(payload, "dropNo", at),
        colors: colorList(payload.colors, `${at}.colors`),
        cutUnits: whole(payload, "cutUnits", at),
        uploaded: whole(payload, "uploaded", at),
        borrowed: whole(payload, "borrowed", at),
      };
    case "PRODUCT_PHOTO_SET":
      return {
        ...base,
        kind: row.kind,
        productId: column(row.product_id, `${path}.product_id`, "must name the style"),
        color: member<ColorKey>(COLOR_KEYS, payload, "color", at),
        before: text(payload, "before", at),
        after: text(payload, "after", at),
      };
    case "PRODUCT_COLORS_REORDERED":
      return {
        ...base,
        kind: row.kind,
        productId: column(row.product_id, `${path}.product_id`, "must name the style"),
        before: colorList(payload.before, `${at}.before`),
        after: colorList(payload.after, `${at}.after`),
      };
    case "DROP_ADDED":
      return {
        ...base,
        kind: row.kind,
        no: column(row.drop_no, `${path}.drop_no`, "must name the issue"),
        opensAt: instantOf(payload, "opensAt", at),
        closesAt: instantOf(payload, "closesAt", at),
      };
    case "DROP_SCHEDULED":
      return {
        ...base,
        kind: row.kind,
        no: column(row.drop_no, `${path}.drop_no`, "must name the issue"),
        before: dropWindow(payload.before, `${at}.before`),
        after: dropWindow(payload.after, `${at}.after`),
      };
    case "TEASER_ADDED":
      return {
        ...base,
        kind: row.kind,
        no: column(row.drop_no, `${path}.drop_no`, "must name the issue"),
        slug: text(payload, "slug", at),
        name: text(payload, "name", at),
        garment: text(payload, "garment", at),
        family: member<Family>(FAMILIES, payload, "family", at),
        photoKey: text(payload, "photoKey", at),
      };
    case "PROMO_ADDED":
      return {
        ...base,
        kind: row.kind,
        promoCode: column(row.promo_code, `${path}.promo_code`, "must name the code"),
        terms: promoTerms(payload, at),
      };
    case "PROMO_EDITED":
      return {
        ...base,
        kind: row.kind,
        promoCode: column(row.promo_code, `${path}.promo_code`, "must name the code"),
        before: promoTerms(payload.before, `${at}.before`),
        after: promoTerms(payload.after, `${at}.after`),
      };
    case "PROMO_PAUSED": {
      const paused = payload.paused;
      if (typeof paused !== "boolean") return fail(`${at}.paused`, "must be a boolean");
      return {
        ...base,
        kind: row.kind,
        promoCode: column(row.promo_code, `${path}.promo_code`, "must name the code"),
        paused,
      };
    }
    case "PROMO_LIMIT_RAISED":
      return {
        ...base,
        kind: row.kind,
        promoCode: column(row.promo_code, `${path}.promo_code`, "must name the code"),
        before: wholeOrNull(payload, "before", at),
        after: whole(payload, "after", at),
      };
    case "PROMO_ENDED":
      return {
        ...base,
        kind: row.kind,
        promoCode: column(row.promo_code, `${path}.promo_code`, "must name the code"),
        before: instantOf(payload, "before", at),
        after: instantOf(payload, "after", at),
      };
    default:
      break;
  }

  if (typeof row.order_code !== "string" || !/^DH-\d{4,}$/.test(row.order_code)) {
    return fail(`${path}.order_code`, "must look like DH-2432");
  }
  const order: OrderEventBase = { ...base, code: row.order_code };

  switch (row.kind) {
    case "ORDER_PLACED":
      return { ...order, kind: row.kind };
    case "ORDER_PAID":
      return { ...order, kind: row.kind, ...fromState(payload, at) };
    case "ORDER_SHIPPED": {
      const carrier = textOrEmpty(payload, "carrier", at);
      return {
        ...order,
        kind: row.kind,
        ...fromState(payload, at),
        ...(carrier ? { carrier } : {}),
        trackingCode: text(payload, "trackingCode", at),
      };
    }
    case "ORDER_DELIVERED":
      return { ...order, kind: row.kind };
    case "ORDER_CANCELLED":
      return {
        ...order,
        kind: row.kind,
        ...fromState(payload, at),
        reason: text(payload, "reason", at),
        note: textOrEmpty(payload, "note", at),
      };
    case "ORDER_CANCELLED_BY_CUSTOMER":
      return { ...order, kind: row.kind, ...fromState(payload, at) };
    case "ORDER_EXPIRED":
      return { ...order, kind: row.kind };
    case "ORDER_NOTE":
      return { ...order, kind: row.kind, text: text(payload, "text", at) };
    case "ORDER_ADDRESS_EDITED":
      return {
        ...order,
        kind: row.kind,
        before: shipTo(payload.before, `${at}.before`),
        after: shipTo(payload.after, `${at}.after`),
        reason: text(payload, "reason", at),
      };
  }
}

/**
 * A page of them, in the order they came. A kind this build does not know —
 * one a later migration added before the app learned to read it — is left
 * out rather than guessed at: a log line nobody can word is not a log line.
 */
export function toEvents(rows: EventRow[]): AdminEvent[] {
  return rows.filter((row) => isEventKind(row.kind)).map(toEvent);
}
