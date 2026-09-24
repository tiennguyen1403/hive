import { createHmac } from "node:crypto";

/**
 * How often one visitor may do something to the public demo (slice B4b).
 *
 * WHY. The demo at https://hive-neon-three.vercel.app is open to anybody —
 * the sign-in screen prints the demo password, the back office is one press
 * away (QĐ-25, answer 2) — and the sweep of 24/09 found that one stranger
 * could spoil it for everybody else: buy every piece on the shelf twenty at a
 * time, fill the 1 GB photo bucket, or hammer sign-in until Supabase Auth's
 * own limit shuts the door for all. These rules bound what one visitor can do
 * in a window, and the photo bucket for everybody together.
 *
 * WHERE THE COUNT LIVES. In Postgres, `public.rate_hits`, through
 * `public.take_rate()` (`supabase/migrations/20260924150000_rate_limits.sql`):
 * a Vercel function has no memory that outlives the request, so a counter in
 * the process would start from zero on every cold start. The server side of
 * it is `lib/db/rate-limit.ts`; this module is the part with no I/O — the
 * table of rules, the visitor's name in that table, and the sentence the
 * screen shows — so it can be tested without a database or a request.
 *
 * FIXED WINDOWS. A bucket counts from the start of its window (a multiple of
 * the window's length since the epoch) to its end, then starts again at zero.
 * A visitor can therefore spend a window's allowance at its very end and the
 * next one's at the start of the next — twice the limit in a short burst. For
 * a demo that is fine: the point is a ceiling on sustained abuse, not a smooth
 * rate.
 *
 * The numbers are the brief's (B4b §2.5) and are deliberately NOT environment
 * variables: a limit that a deploy can switch off is a limit nobody can rely
 * on. `lib/rate-limit.test.ts` restates the table by hand.
 */

/**
 * The eleven buckets. `public.rate_hits.bucket` checks the same eleven, and
 * `take_rate()` refuses any other name as `BAD_INPUT` — three lists that must
 * agree, which `lib/db/rate-limit.dbtest.ts` proves by calling `take_rate()`
 * with every name here.
 */
export const RATE_BUCKETS = [
  "order_place",
  "order_units",
  "sign_in",
  "sign_up",
  "password",
  "account",
  "admin",
  "admin_create",
  "upload",
  "upload_global",
  "reset",
] as const;

export type RateBucket = (typeof RATE_BUCKETS)[number];

/**
 * One bucket's rule: at most `limit` tokens per `windowSeconds`, counted per
 * visitor or — `everyone` — for all visitors together.
 */
export interface RateRule {
  limit: number;
  windowSeconds: number;
  per: "visitor" | "everyone";
}

const MINUTE = 60;
const HOUR = 3_600;
const DAY = 86_400;

/**
 * B4b §2.5, row for row. Where each one is taken:
 *
 *   order_place   `placeOrderAction`, one per order
 *   order_units   `placeOrderAction`, one per PIECE — the cost is the order's
 *                 total quantity, so a visitor cannot buy the shelf empty
 *   sign_in       `signIn`, `demoSignIn`, `demoAdminSignIn`
 *   sign_up       `signUp`
 *   password      `changePassword`
 *   account       the four address-book writes and `cancelOrderAction`
 *   admin         every action of `lib/actions/admin.ts` and `catalog-admin.ts`
 *   admin_create  `createProduct`, `addDrop`, `addTeaser`, `addPromo`
 *   upload        `uploadProductPhoto`, per visitor…
 *   upload_global …and for everybody: 300 × 1,5 MB ≤ 450 MB a day into a 1 GB
 *                 bucket, which "Đặt lại dữ liệu mẫu" and the daily reset empty
 *   reset         `resetDemo`
 */
export const RATE_RULES: Readonly<Record<RateBucket, RateRule>> = {
  order_place: { limit: 5, windowSeconds: 10 * MINUTE, per: "visitor" },
  order_units: { limit: 60, windowSeconds: DAY, per: "visitor" },
  sign_in: { limit: 10, windowSeconds: 5 * MINUTE, per: "visitor" },
  sign_up: { limit: 3, windowSeconds: HOUR, per: "visitor" },
  password: { limit: 5, windowSeconds: 10 * MINUTE, per: "visitor" },
  account: { limit: 30, windowSeconds: 10 * MINUTE, per: "visitor" },
  admin: { limit: 120, windowSeconds: 10 * MINUTE, per: "visitor" },
  admin_create: { limit: 20, windowSeconds: HOUR, per: "visitor" },
  upload: { limit: 40, windowSeconds: HOUR, per: "visitor" },
  upload_global: { limit: 300, windowSeconds: DAY, per: "everyone" },
  reset: { limit: 3, windowSeconds: 10 * MINUTE, per: "visitor" },
};

// ─────────────────────────────────────────────────────────── the visitor
/**
 * The one header the visitor's address is read from.
 *
 * Vercel documents that it OVERWRITES this one: "we currently overwrite the
 * X-Forwarded-For header and do not forward external IPs. This restriction is
 * in place to prevent IP spoofing"
 * (https://vercel.com/docs/headers/request-headers#x-forwarded-for). A value
 * the visitor typed into their own request never reaches the function, so it
 * cannot be used to pick a fresh counter per request. `x-real-ip` and
 * `x-vercel-forwarded-for` are described there as "identical to the
 * x-forwarded-for header", without that promise spelled out, so neither is
 * read.
 *
 * Off Vercel — `next start` on a developer machine — nobody overwrites it: the
 * value a client sends passes through, which is what lets the acceptance walk
 * play two visitors with two headers. When the client sends none, Next's own
 * server fills it with the socket's address
 * (`node_modules/next/dist/server/base-server.js`, `x-forwarded-for ??=
 * remoteAddress`), so every local request without one is the same visitor.
 */
export const CLIENT_IP_HEADER = "x-forwarded-for";

/** The visitor when there is no address at all. */
export const LOCAL_CLIENT = "local";

/** The subject of a bucket counted for everybody together (`per: "everyone"`). */
export const EVERYONE = "everyone";

/**
 * The visitor's address: the header's first value, trimmed — a proxy chain
 * appends, so the first entry is the client's — or `local` when there is
 * nothing to read. `get` is `(await headers()).get` on the server
 * (`03-api-reference/04-functions/headers.md`), anything in a test.
 */
export function clientIpOf(get: (name: string) => string | null): string {
  const first = (get(CLIENT_IP_HEADER) ?? "").split(",")[0]!.trim();
  return first === "" ? LOCAL_CLIENT : first;
}

const DOTTED_QUAD = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** `a.b.c.d` with four octets of 0–255, or null. */
function ipv4Of(text: string): string | null {
  const m = DOTTED_QUAD.exec(text);
  return m && m.slice(1).every((octet) => Number(octet) <= 255) ? text : null;
}

/**
 * The eight 16-bit groups of an IPv6 address written in hex — `::` expanded,
 * where it may stand for one group or more and appear once ("The '::' can
 * only appear once in an address", RFC 4291 §2.2) — or null for anything
 * else. Expects the text lower-cased and without its zone.
 */
function ipv6GroupsOf(text: string): number[] | null {
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const groupsIn = (half: string) => (half === "" ? [] : half.split(":"));
  const head = groupsIn(halves[0]!);
  const tail = halves.length === 2 ? groupsIn(halves[1]!) : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...Array<string>(Math.max(missing, 0)).fill("0"), ...tail];
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

/**
 * What a visitor is COUNTED as: an IPv4 address as it is; an IPv6 address by
 * its /64, written `2001:db8:0:1::/64` whichever address of that network the
 * request came from.
 *
 * WHY THE /64. An IPv6 subscriber is handed a network, not an address: "For
 * all unicast addresses, except those that start with the binary value 000,
 * Interface IDs are required to be 64 bits long" (RFC 4291 §2.5.1), and hosts
 * pick new ones inside it on their own — "temporary addresses with randomized
 * interface identifiers for each prefix", "generated over time" (RFC 8981).
 * Counted per address, one phone could walk through fresh counters at will;
 * counted per /64 it is one visitor, as one IPv4 address is.
 *
 * An IPv4-mapped address (`::ffff:a.b.c.d`, RFC 4291 §2.5.5.2, in either
 * spelling — `::ffff:7f00:1` is the same one) is the IPv4 visitor it carries:
 * Node reports an IPv4 client on a dual-stack socket that way, and counting
 * it by /64 would put every such visitor in one counter.
 *
 * The zone (`%eth0`) goes, case does not matter, and a leading zero is not
 * written. Anything that is not an address — `local`, a garbled header, the
 * dotted tail of any other IPv6 form — is left exactly as it came: still one
 * fixed subject, and never one that lumps strangers together.
 */
export function rateKeyOf(ip: string): string {
  if (!ip.includes(":")) return ip; // IPv4, `local`, or not an address
  const text = ip.split("%")[0]!.toLowerCase();

  const mapped = /^::ffff:(.+)$/.exec(text);
  if (mapped && mapped[1]!.includes(".")) return ipv4Of(mapped[1]!) ?? ip;

  const groups = ipv6GroupsOf(text);
  if (!groups) return ip;
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    return [groups[6]! >> 8, groups[6]! & 0xff, groups[7]! >> 8, groups[7]! & 0xff].join(".");
  }
  return `${groups
    .slice(0, 4)
    .map((g) => g.toString(16))
    .join(":")}::/64`;
}

/**
 * What the counter table calls this visitor: HMAC-SHA256 of the visitor's
 * rate key (`rateKeyOf` — the IPv4 address, or the IPv6 /64), keyed with
 * `SUPABASE_SECRET_KEY`, the first 32 hex characters.
 *
 * Keyed and not a bare hash because an IPv4 address is one of four billion:
 * a plain SHA-256 of every one of them is an afternoon's work, so a bare hash
 * would be the address written down with extra steps. Without the key a row
 * of `rate_hits` names nobody. 128 bits are far more than enough to keep two
 * visitors from sharing a row, and fit the column's 64-character check.
 */
export function subjectOf(ip: string, key: string): string {
  return createHmac("sha256", key).update(ip, "utf8").digest("hex").slice(0, 32);
}

// ─────────────────────────────────────────────────────────── the sentence
/**
 * "3 phút", or from an hour on "2 giờ" — always rounded UP, and never zero:
 * "thử lại sau 0 phút" is a promise the next press breaks.
 */
function waitLabel(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  if (s >= HOUR) return `${Math.ceil(s / HOUR)} giờ`;
  return `${Math.max(1, Math.ceil(s / MINUTE))} phút`;
}

/**
 * What a refused visitor reads (B4b §2.7), in the neutral voice of the rest
 * of the shop: no "bạn", no apology, the wait and nothing else — except for
 * the two buckets whose refusal is about something other than speed.
 */
export function rateLimitMessage(bucket: RateBucket, retryAfterSeconds: number): string {
  const wait = waitLabel(retryAfterSeconds);
  switch (bucket) {
    case "order_units":
      return `Mỗi người mua đặt tối đa ${RATE_RULES.order_units.limit} chiếc mỗi ngày. Thử lại sau ${wait}.`;
    case "upload_global":
      return `Kho ảnh hôm nay đã nhận đủ ảnh. Thử lại sau ${wait}.`;
    default:
      return `Quá nhiều lượt liên tiếp. Thử lại sau ${wait}.`;
  }
}
