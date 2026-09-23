import type { OrderState } from "@/data/types";
import type { ShipTo } from "@/lib/admin-orders";

/**
 * The border between `public.events` and the back office's screens.
 *
 * The log is read straight off the table (row level security lets the
 * manager, and only the manager, see it — `lib/db/admin.ts`), and a row
 * arrives as columns plus a `payload` that is `jsonb`: whatever the writing
 * function put there, typed `unknown` on the way in. This module checks every
 * field it uses and flattens each row into one member of `AdminEvent`, whose
 * fields are the ones the `SimAction` of the same name carried before slice
 * B3a — so the activity log and the order's notes changed where they read
 * from, not what they say.
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

export type AdminEvent =
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
  | (OrderEventBase & { kind: "ORDER_ADDRESS_EDITED"; before: ShipTo; after: ShipTo; reason: string })
  | (EventBase & {
      kind: "DEMO_RESET";
      /** The 18:50 the sample was shifted onto. */
      anchor: string;
    });

/** Exactly the columns `lib/db/admin.ts` selects. */
export interface EventRow {
  id: number;
  at: string;
  actor_role: string;
  actor: string;
  kind: string;
  order_code: string | null;
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
