/**
 * Turns the fixture in `data/` into `supabase/seed.sql`.
 *
 * DESIGN.md §9 rule 1: seed data is never invented and never typed by hand.
 * `data/catalog.ts`, `data/promotions.ts`, `data/customers.ts` and
 * `data/orders.ts` stay the single source of truth for the sample shop, and
 * this script is the only thing allowed to restate them in SQL — which is why
 * `supabase/seed.sql` carries a "generated" banner and why
 * `scripts/gen-seed.test.ts` fails the moment the file on disk and the
 * fixture disagree.
 *
 * The output is deterministic: fixed statement order, fixed row order, fixed
 * column order, no timestamp of its own. Running the script twice on an
 * unchanged fixture produces the same bytes, so a regeneration never shows up
 * as a diff unless the data really moved.
 *
 * Run it with `npm run seed:gen`.
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CUSTOMERS, CUSTOMER_STATES } from "@/data/customers";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { ORDERS } from "@/data/orders";
import {
  NOTIFY_KEYS,
  SIZES,
  type Customer,
  type CustomerId,
  type MyState,
  type Order,
  type OrderMoments,
  type OrderStatus,
} from "@/data/types";
import type { CatalogInput } from "@/lib/catalog";
import { normalisePhone } from "@/lib/checkout-form";

// ───────────────────────────────────────────────────────────────── literals
/** A SQL string literal. Single quotes double, the way Postgres wants them. */
const str = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/** A SQL timestamptz literal. The `+07:00` in the text is the whole point. */
const ts = (iso: string): string => `'${iso}'::timestamptz`;

/** A number, or SQL `null` — `undefined` and `null` mean the same here. */
const num = (value: number | null | undefined): string =>
  value === null || value === undefined ? "null" : String(value);

/** A timestamptz that may be absent (`Product.soldOutAt`). */
const tsOrNull = (iso: string | null | undefined): string =>
  iso === null || iso === undefined ? "null" : ts(iso);

/** SQL `true` / `false` — Postgres accepts the bare words. */
const bool = (value: boolean): string => (value ? "true" : "false");

/** A string that may be absent (`Order.promo`, `Order.email` since slice B8). */
const strOrNull = (value: string | null | undefined): string =>
  value === null || value === undefined ? "null" : str(value);

/**
 * A SQL `text[]` (`Product.details`, slice B6), through the ARRAY constructor
 * so every element is an ordinary string literal, escaped like any other. The
 * cast is what lets an empty list be written at all: "since it's impossible
 * to have an array with no type, you must explicitly cast your empty array to
 * the desired type"
 * (https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-ARRAY-CONSTRUCTORS).
 */
const textArray = (values: readonly string[]): string =>
  `array[${values.map(str).join(", ")}]::text[]`;

/**
 * One English field of a style or a teaser (slice B15, round v6): the text,
 * or `null` where there is none — which the shop reads as "print the
 * Vietnamese". The database refuses a blank one
 * (`20261001150000_catalog_english.sql`); it is refused here first, so the
 * error names the entry rather than a constraint.
 */
function enText(where: string, key: string, value: string | undefined): string {
  if (value === undefined) return "null";
  if (value.trim() === "") throw new Error(`${where}: en.${key} is blank`);
  return str(value);
}

/**
 * A style's English lines, or `null`. Never an empty list: the column holds
 * null or at least one line, none blank — a style with no lines simply has no
 * English ones.
 */
function enLines(where: string, lines: readonly string[] | undefined): string {
  if (lines === undefined) return "null";
  if (lines.length === 0) throw new Error(`${where}: en.details is an empty list; leave it out instead`);
  lines.forEach((line, index) => {
    if (line.trim() === "") throw new Error(`${where}: en.details[${index}] is blank`);
  });
  return textArray(lines);
}

/**
 * Ten digits starting with zero, which is the one form the database accepts
 * (`phone ~ '^0[0-9]{9}$'`) and the one `lib/checkout-form.ts` stores.
 *
 * The fixture writes numbers the way a person types them — "0912 345 678" —
 * so the spaces come out here rather than being edited into `data/`.
 */
function phone10(raw: string, who: string): string {
  const digits = normalisePhone(raw);
  if (!digits) throw new Error(`${who}: "${raw}" is not a ten-digit number starting with 0`);
  return digits;
}

/**
 * `OrderStatus` and the steps the order passed (`moments`, slice B10)
 * flattened into the columns of `orders`, in their table order: state,
 * due_at, paid_at, shipped_at, tracking_code, delivered_at, cancelled_at,
 * cancel_reason.
 *
 * The union says which fields a state carries and the table's check
 * constraint says the same thing in SQL. `moments` adds the steps before the
 * current one — a delivered order's payment and hand-over — and a moment the
 * status carries too must be the same instant, or the fixture contradicts
 * itself and the seed stops here. Everything neither carries is written as
 * `null`, never as a guess.
 */
function orderCells(code: string, status: OrderStatus, moments: OrderMoments | undefined): string[] {
  const none = "null";
  const step = (key: keyof OrderMoments, own: string | undefined): string => {
    const said = moments?.[key];
    if (own !== undefined && said !== undefined && said !== own) {
      throw new Error(`${code}: moments.${key} ${said} is not its status's ${own}`);
    }
    return tsOrNull(own ?? said);
  };
  return [
    str(status.state),
    status.state === "AWAITING_TRANSFER" ? ts(status.dueAt) : none,
    step("paidAt", status.state === "PAID" ? status.paidAt : undefined),
    step("shippedAt", status.state === "SHIPPING" ? status.shippedAt : undefined),
    status.state === "SHIPPING" ? str(status.trackingCode) : none,
    step("deliveredAt", status.state === "DELIVERED" ? status.deliveredAt : undefined),
    status.state === "CANCELLED" ? ts(status.cancelledAt) : none,
    status.state === "CANCELLED" ? str(status.reason) : none,
  ];
}

/**
 * One `insert` statement, or nothing at all when the list is empty.
 *
 * Empty is not expected for any of the ten, but `values ()` with no rows is a
 * syntax error rather than a no-op, so it is worth not emitting.
 */
function insert(table: string, columns: string[], rows: string[][]): string {
  if (rows.length === 0) return "";
  const body = rows.map((cells) => `  (${cells.join(", ")})`).join(",\n");
  return `insert into public.${table} (${columns.join(", ")}) values\n${body};\n`;
}

/**
 * The three mirrors of what the demo accounts keep (slice B9), as rows: in the
 * fixture's customer order, and each account's saved styles in its own order
 * — `position` 0 is the newest, which `reset_demo()` draws last so it ends up
 * on top.
 *
 * Checked before anything is written, each failure naming its entry:
 *
 *   · the handle is one of the demo accounts;
 *   · a saved style is in the catalogue, in one of its own colours, once, and
 *     without a moment — the mirror has no column for one, because the mock
 *     never recorded one and the seed does not invent it;
 *   · a reminder names an issue the fixture has, once.
 *
 * An account with an entry gets its settings row with the sizes and all four
 * switches written out rather than left to the column defaults: it is what
 * `reset_demo()` copies back, so the seed says what a reset restores.
 */
function stateRows(
  input: CatalogInput,
  customers: Customer[],
  states: ReadonlyMap<CustomerId, MyState>,
): { favorites: string[][]; reminders: string[][]; settings: string[][] } {
  const known = new Set<string>(customers.map((c) => c.id));
  for (const handle of states.keys()) {
    if (!known.has(handle)) throw new Error(`${handle}: keeps a state but is not a demo account`);
  }

  const favorites: string[][] = [];
  const reminders: string[][] = [];
  const settings: string[][] = [];

  for (const customer of customers) {
    const state = states.get(customer.id);
    if (!state) continue;

    const saved = new Set<string>();
    state.favorites.forEach((f, index) => {
      const where = `${customer.id}: saved style ${index} (${f.productId})`;
      const product = input.products.find((p) => p.id === f.productId);
      if (!product) throw new Error(`${where} is not in the catalogue`);
      if (!product.colors.includes(f.color)) throw new Error(`${where} has no colour ${f.color}`);
      if (saved.has(f.productId)) throw new Error(`${where} is saved twice`);
      if (f.savedAt !== null) throw new Error(`${where} carries a moment the seed cannot hold`);
      saved.add(f.productId);
      favorites.push([str(customer.id), num(index), str(f.productId), str(f.color)]);
    });

    const asked = new Set<number>();
    for (const no of state.reminders) {
      if (!input.drops.some((d) => d.no === no)) {
        throw new Error(`${customer.id}: a reminder for issue ${no}, which the fixture does not have`);
      }
      if (asked.has(no)) throw new Error(`${customer.id}: a reminder for issue ${no} twice`);
      asked.add(no);
      reminders.push([str(customer.id), num(no)]);
    }

    settings.push([
      str(customer.id),
      strOrNull(state.sizes.top),
      strOrNull(state.sizes.bottom),
      // notify_order, notify_drop, notify_wishlist, notify_promo — the order
      // of NOTIFY_KEYS, which is the order of the columns.
      ...NOTIFY_KEYS.map((key) => bool(state.notify[key])),
    ]);
  }

  return { favorites, reminders, settings };
}

// ────────────────────────────────────────────────────────────────── the SQL
/**
 * The seed script for one catalogue.
 *
 * Only the `seed_*` mirrors are filled. The live tables are built from them by
 * `reset_demo()`, called on the last line — so the same statement that seeds a
 * fresh database is also what the demo's reset button will run later.
 */
export function renderSeedSql(
  input: CatalogInput,
  customers: Customer[],
  orders: Order[],
  states: ReadonlyMap<CustomerId, MyState>,
): string {
  const parts: string[] = [];

  parts.push(
    [
      "-- Generated by scripts/gen-seed.ts. Do not edit by hand.",
      "--",
      "-- Source of truth: data/catalog.ts, data/promotions.ts, data/customers.ts and",
      "-- data/orders.ts.",
      "-- Regenerate with `npm run seed:gen`; scripts/gen-seed.test.ts fails if the",
      "-- file and the fixture have drifted.",
      "--",
      "-- Loaded by `supabase db reset` after every migration ([db.seed] in",
      "-- supabase/config.toml). It fills the seed_* mirrors, then reset_demo()",
      "-- rebuilds the live tables from them. The eight demo accounts only reach",
      "-- `profiles` once `npm run seed:users` has created them in auth.users, and",
      "-- the sample orders, the saved styles, the reminders and the sizes only",
      "-- reach an account after that.",
      "",
      "truncate table",
      "  public.seed_order_lines,",
      "  public.seed_orders,",
      "  public.seed_stock_cells,",
      "  public.seed_product_colors,",
      "  public.seed_products,",
      "  public.seed_teasers,",
      "  public.seed_promotions,",
      "  public.seed_drops,",
      "  public.seed_favorites,",
      "  public.seed_reminders,",
      "  public.seed_account_settings,",
      "  public.seed_addresses,",
      "  public.seed_customers;",
      "",
    ].join("\n"),
  );

  parts.push(
    insert(
      "seed_drops",
      ["no", "opens_at", "closes_at"],
      input.drops.map((d) => [num(d.no), ts(d.opensAt), ts(d.closesAt)]),
    ),
  );

  parts.push(
    insert(
      "seed_products",
      [
        "id",
        "slug",
        "name",
        "kind",
        "family",
        "material",
        "fit",
        "price_vnd",
        "cut_units",
        "drop_no",
        "sold_out_at",
        "position",
        "details",
        "name_en",
        "kind_en",
        "material_en",
        "details_en",
      ],
      // `details` (slice B6) is written out for every style, an empty list
      // included, rather than left to the column default: it is what
      // `reset_demo()` copies back, so the seed says what a reset restores.
      // The English follows (slice B15), null wherever the fixture has none.
      input.products.map((p, index) => [
        str(p.id),
        str(p.slug),
        str(p.name),
        str(p.kind),
        str(p.family),
        str(p.material),
        str(p.fit),
        num(p.priceVnd),
        num(p.cutUnits),
        num(p.dropNo),
        tsOrNull(p.soldOutAt),
        num(index),
        textArray(p.details),
        enText(p.id, "name", p.en?.name),
        enText(p.id, "kind", p.en?.kind),
        enText(p.id, "material", p.en?.material),
        enLines(p.id, p.en?.details),
      ]),
    ),
  );

  // Colour order is band order, so the index inside `Product.colors` is the
  // position, and `photoKeys[i]` is the photo standing in for that colour.
  const colorRows: string[][] = [];
  const stockRows: string[][] = [];
  for (const product of input.products) {
    product.colors.forEach((color, index) => {
      const photoKey = product.photoKeys[index];
      if (photoKey === undefined) {
        throw new Error(`${product.slug}: no photo key for colour ${color}`);
      }
      colorRows.push([str(product.id), str(color), num(index), str(photoKey)]);

      const perSize = product.stock[color];
      if (perSize === undefined) {
        throw new Error(`${product.slug}: no stock for colour ${color}`);
      }
      for (const size of SIZES) {
        stockRows.push([str(product.id), str(color), str(size), num(perSize[size])]);
      }
    });
  }

  parts.push(
    insert("seed_product_colors", ["product_id", "color", "position", "photo_key"], colorRows),
  );
  parts.push(insert("seed_stock_cells", ["product_id", "color", "size", "on_hand"], stockRows));

  // `announced_at` (slice B12): when the teaser was announced, as the fixture
  // authors it (`TEASER_LEAD_HOURS` in `data/catalog.ts`); `reset_demo()`
  // moves it with every other instant. Then its English (slice B15).
  parts.push(
    insert(
      "seed_teasers",
      ["slug", "name", "kind", "family", "drop_no", "photo_key", "position", "announced_at", "name_en", "kind_en"],
      input.teasers.map((t, index) => [
        str(t.slug),
        str(t.name),
        str(t.kind),
        str(t.family),
        num(t.dropNo),
        str(t.photoKey),
        num(index),
        tsOrNull(t.announcedAt),
        enText(t.slug, "name", t.en?.name),
        enText(t.slug, "kind", t.en?.kind),
      ]),
    ),
  );

  parts.push(
    insert(
      "seed_promotions",
      [
        "code",
        "kind",
        "percent",
        "max_discount_vnd",
        "amount_vnd",
        "starts_at",
        "ends_at",
        "usage_limit",
        "used_count",
        "min_order_vnd",
        "position",
        "paused",
      ],
      // The three shapes are a discriminated union in `data/types.ts` and a
      // check constraint in SQL: a PERCENT row carries no amount, an AMOUNT
      // row carries no cap. Narrowing here keeps both honest.
      //
      // `paused` (slice B3b) is written out rather than left to the column
      // default: the fixture pauses nothing, and saying so in the seed is
      // what a reset puts back.
      input.promotions.map((promo, index) => [
        str(promo.code),
        str(promo.kind),
        num(promo.kind === "PERCENT" ? promo.percent : null),
        num(promo.kind === "PERCENT" ? promo.maxDiscountVnd : null),
        num(promo.kind === "AMOUNT" ? promo.amountVnd : null),
        ts(promo.startsAt),
        ts(promo.endsAt),
        num(promo.usageLimit),
        num(promo.usedCount),
        num(promo.minOrderVnd),
        num(index),
        bool(promo.paused ?? false),
      ]),
    ),
  );

  // ── the eight demo accounts (data/customers.ts)
  // Keyed by handle rather than by uuid: the auth user does not exist yet at
  // seed time, and `reset_demo()` matches the two up by email afterwards.
  parts.push(
    insert(
      "seed_customers",
      ["handle", "name", "email", "phone", "joined_at"],
      customers.map((c) => [
        str(c.id),
        str(c.name),
        str(c.email),
        str(phone10(c.phone, c.id)),
        ts(c.joinedAt),
      ]),
    ),
  );

  const addressRows: string[][] = [];
  for (const customer of customers) {
    customer.addresses.forEach((a, index) => {
      addressRows.push([
        str(customer.id),
        num(index),
        str(a.recipient),
        str(phone10(a.phone, a.id)),
        str(a.line),
        str(a.provinceCode),
        str(a.wardCode),
        str(a.label),
        bool(a.isDefault),
      ]);
    });
  }

  parts.push(
    insert(
      "seed_addresses",
      [
        "handle",
        "position",
        "recipient",
        "phone",
        "line",
        "province_code",
        "ward_code",
        "label",
        "is_default",
      ],
      addressRows,
    ),
  );

  // ── what the demo accounts keep (slice B9, data/customers.ts#CUSTOMER_STATES)
  // Keyed by handle like the addresses. A mistake here would not be a wrong
  // row but a failed reset — `favorites` references `product_colors` and
  // `reminders` references `drops` — so the fixture is checked against the
  // catalogue it is seeded beside, and the error names the entry.
  const keeps = stateRows(input, customers, states);
  parts.push(
    insert("seed_favorites", ["handle", "position", "product_id", "color"], keeps.favorites),
  );
  parts.push(insert("seed_reminders", ["handle", "drop_no"], keeps.reminders));
  parts.push(
    insert(
      "seed_account_settings",
      [
        "handle",
        "size_top",
        "size_bottom",
        "notify_order",
        "notify_drop",
        "notify_wishlist",
        "notify_promo",
      ],
      keeps.settings,
    ),
  );

  // ── the twenty-four sample orders (data/orders.ts)
  // Owned by a handle, like the addresses: `reset_demo()` hands each one to
  // the demo account carrying that handle once the account exists. The
  // receipt key is left to the column default — a fresh one on every reset.
  parts.push(
    insert(
      "seed_orders",
      [
        "code",
        "customer_handle",
        "email",
        "recipient",
        "phone",
        "line",
        "province_code",
        "ward_code",
        "note",
        "delivery",
        "payment",
        "shipping_fee_vnd",
        "cod_fee_vnd",
        "discount_vnd",
        "promo_code",
        "placed_at",
        "state",
        "due_at",
        "paid_at",
        "shipped_at",
        "tracking_code",
        "delivered_at",
        "cancelled_at",
        "cancel_reason",
      ],
      orders.map((o) => [
        str(o.code),
        str(o.customerId),
        // Every sample order has one; `seed_orders.email` stays `not null`, so
        // a fixture that ever dropped one would stop `db reset` rather than
        // slip through (`20260927140000_optional_email.sql`).
        strOrNull(o.email),
        str(o.shipTo.recipient),
        str(phone10(o.shipTo.phone, o.code)),
        str(o.shipTo.line),
        str(o.shipTo.provinceCode),
        str(o.shipTo.wardCode),
        str(o.note),
        str(o.delivery),
        str(o.payment),
        num(o.shippingFeeVnd),
        num(o.codFeeVnd),
        num(o.discountVnd),
        strOrNull(o.promo),
        ts(o.placedAt),
        ...orderCells(o.code, o.status, o.moments),
      ]),
    ),
  );

  // Line order is the order's own, so `position` is the index in `lines`.
  const lineRows: string[][] = [];
  for (const o of orders) {
    o.lines.forEach((l, index) => {
      lineRows.push([
        str(o.code),
        num(index),
        str(l.productId),
        str(l.color),
        str(l.size),
        num(l.qty),
        num(l.unitPriceVnd),
      ]);
    });
  }

  parts.push(
    insert(
      "seed_order_lines",
      ["order_code", "position", "product_id", "color", "size", "qty", "unit_price_vnd"],
      lineRows,
    ),
  );

  // Anchored on the real clock since slice B3a: `demo_anchor()` is the most
  // recent 18:50 in Vietnam, so the sample shop is shifted by whole days and
  // every hour in `data/` survives while its past stays in the past.
  parts.push(
    "-- Build the live tables from the mirrors just filled, anchored on the most\n" +
      "-- recent 18:50 Vietnamese time (the fixture's own minute, shifted by whole days).\n" +
      "select public.reset_demo(public.demo_anchor());\n",
  );

  return parts.filter((part) => part !== "").join("\n");
}

/**
 * The fixture as a `CatalogInput`.
 *
 * The same four arrays `lib/db/catalog.ts#catalogInput` hands to the browser,
 * rebuilt here rather than imported from it: that module is `server-only` and
 * pulls in the Supabase client, neither of which belongs in a build script or
 * in a Node test runner.
 */
export function fixtureInput(): CatalogInput {
  return {
    products: [...FIXTURE_CATALOG.products],
    drops: [...FIXTURE_CATALOG.drops],
    teasers: [...FIXTURE_CATALOG.teasers],
    promotions: [...FIXTURE_CATALOG.promotions],
  };
}

/**
 * The eight demo customers, exactly as `data/customers.ts` has them.
 *
 * A function rather than the array itself, for the same reason as above: every
 * caller gets its own copy and nothing can quietly sort the fixture.
 */
export function fixtureCustomers(): Customer[] {
  return CUSTOMERS.map((c) => ({ ...c, addresses: [...c.addresses] }));
}

/**
 * The twenty-four sample orders, exactly as `data/orders.ts` has them, in
 * their fixture order — a copy, for the same reason as the two above.
 */
export function fixtureOrders(): Order[] {
  return ORDERS.map((o) => ({ ...o, lines: [...o.lines] }));
}

/**
 * What the demo accounts keep (slice B9), exactly as `data/customers.ts` has
 * it — a copy, for the same reason as the three above.
 */
export function fixtureStates(): ReadonlyMap<CustomerId, MyState> {
  return new Map(
    [...CUSTOMER_STATES].map(([handle, state]) => [
      handle,
      {
        favorites: state.favorites.map((f) => ({ ...f })),
        reminders: [...state.reminders],
        sizes: { ...state.sizes },
        notify: { ...state.notify },
      },
    ]),
  );
}

/** Where the generated file goes, relative to this script. */
export const SEED_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../supabase/seed.sql");

// Only when run as a command, never when the test imports the renderer.
if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  writeFileSync(
    SEED_PATH,
    renderSeedSql(fixtureInput(), fixtureCustomers(), fixtureOrders(), fixtureStates()),
    "utf8",
  );
  process.stdout.write(`wrote ${SEED_PATH}\n`);
}
