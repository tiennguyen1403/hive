import {
  COLOR_KEYS,
  FAMILIES,
  SIZES,
  productId,
  promoCode,
  type ColorKey,
  type Drop,
  type Family,
  type Fit,
  type Product,
  type Promotion,
  type Size,
  type Stock,
  type Teaser,
} from "@/data/types";
import type { CatalogInput } from "@/lib/catalog";

/**
 * The border between Postgres and `data/types.ts`.
 *
 * `catalog_snapshot()` returns one `jsonb` document, which arrives here as
 * `unknown` — PostgREST will hand over whatever the function produced, and a
 * migration that renames a column produces a *different* document rather than
 * an error. So every field is checked on the way in and the failure names the
 * field: `products[3].stock.black.XL` is a bug report, `undefined is not an
 * object` is a puzzle.
 *
 * Checked by hand rather than by a schema library: the shape is fixed, it is
 * described once in `data/types.ts`, and the brief allows exactly four new
 * dependencies — none of them a validator.
 *
 * This module is deliberately pure and free of `server-only`: it is the half
 * of the DAL that a test can exercise without a database.
 */

const fail = (path: string, expected: string): never => {
  throw new Error(`catalog snapshot: ${path} ${expected}`);
};

/** Every instant in this codebase carries `+07:00` — `lib/datetime.ts` reads
 *  the offset out of the text rather than going through `Date`, so a UTC
 *  string here would move every clock on the storefront by seven hours. */
const VN_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "must be an object");
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) return fail(path, "must be an array");
  return value;
}

function text(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key];
  if (typeof value !== "string" || value === "") {
    return fail(`${path}.${key}`, "must be a non-empty string");
  }
  return value;
}

function integer(source: Record<string, unknown>, key: string, path: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fail(`${path}.${key}`, "must be an integer");
  }
  return value;
}

/** `null` and a missing key mean the same thing: the shop has no number here. */
function optionalInteger(
  source: Record<string, unknown>,
  key: string,
  path: string,
): number | undefined {
  const value = source[key];
  if (value === undefined || value === null) return undefined;
  return integer(source, key, path);
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

function instant(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key];
  if (typeof value !== "string" || !VN_ISO.test(value)) {
    return fail(`${path}.${key}`, "must be an ISO instant ending in +07:00");
  }
  return value;
}

function optionalInstant(
  source: Record<string, unknown>,
  key: string,
  path: string,
): string | undefined {
  const value = source[key];
  if (value === undefined || value === null) return undefined;
  return instant(source, key, path);
}

// ───────────────────────────────────────────────────────────────── products
/**
 * Colour-major stock, with all four sizes spelled out for every colour the
 * style comes in — zeros included. A missing key and a zero look the same at
 * the call site and mean very different things, which is why `data/types.ts`
 * insists on it and why the check is repeated here.
 */
function readStock(value: unknown, colors: readonly ColorKey[], path: string): Stock {
  const source = record(value, path);
  const stock: Stock = {};

  for (const color of colors) {
    const perSize = record(source[color] ?? fail(`${path}.${color}`, "is missing"), `${path}.${color}`);
    const sizes = {} as Record<Size, number>;
    for (const size of SIZES) {
      sizes[size] = integer(perSize, size, `${path}.${color}`);
      if (sizes[size] < 0) fail(`${path}.${color}.${size}`, "must not be negative");
    }
    stock[color] = sizes;
  }

  for (const key of Object.keys(source)) {
    if (!(colors as readonly string[]).includes(key)) {
      fail(`${path}.${key}`, "is a colour the style does not come in");
    }
  }

  return stock;
}

function readProduct(value: unknown, path: string): Product {
  const source = record(value, path);

  const colors = list(source.colors, `${path}.colors`).map((color, index) => {
    if (typeof color !== "string" || !(COLOR_KEYS as readonly string[]).includes(color)) {
      return fail(`${path}.colors[${index}]`, `must be one of ${COLOR_KEYS.join(", ")}`);
    }
    return color as ColorKey;
  });
  if (colors.length === 0) fail(`${path}.colors`, "must list at least one colour");

  const photoKeys = list(source.photoKeys, `${path}.photoKeys`).map((key, index) => {
    if (typeof key !== "string" || key === "") {
      return fail(`${path}.photoKeys[${index}]`, "must be a non-empty string");
    }
    return key;
  });
  if (photoKeys.length !== colors.length) {
    fail(`${path}.photoKeys`, `must hold one key per colour (${colors.length})`);
  }

  const product: Product = {
    id: productId(text(source, "id", path)),
    slug: text(source, "slug", path),
    name: text(source, "name", path),
    kind: text(source, "kind", path),
    family: member<Family>(FAMILIES, source, "family", path),
    material: text(source, "material", path),
    fit: member<Fit>(["OVERSIZE", "REGULAR"], source, "fit", path),
    priceVnd: integer(source, "priceVnd", path),
    colors,
    cutUnits: integer(source, "cutUnits", path),
    dropNo: integer(source, "dropNo", path),
    stock: readStock(source.stock ?? fail(`${path}.stock`, "is missing"), colors, `${path}.stock`),
    photoKeys,
  };

  // Absent rather than `undefined`: `soldOutAt` is only ever set on a style
  // with nothing left, and the fixture omits the key everywhere else.
  const soldOutAt = optionalInstant(source, "soldOutAt", path);
  if (soldOutAt !== undefined) product.soldOutAt = soldOutAt;

  return product;
}

// ──────────────────────────────────────────────────────────── drops, teasers
function readDrop(value: unknown, path: string): Drop {
  const source = record(value, path);
  return {
    no: integer(source, "no", path),
    opensAt: instant(source, "opensAt", path),
    closesAt: instant(source, "closesAt", path),
  };
}

function readTeaser(value: unknown, path: string): Teaser {
  const source = record(value, path);
  return {
    slug: text(source, "slug", path),
    name: text(source, "name", path),
    kind: text(source, "kind", path),
    family: member<Family>(FAMILIES, source, "family", path),
    dropNo: integer(source, "dropNo", path),
    photoKey: text(source, "photoKey", path),
  };
}

// ─────────────────────────────────────────────────────────────── promotions
/**
 * Three shapes behind one `kind`, exactly as `data/types.ts` declares them and
 * as the check constraint on `public.promotions` enforces them. Reading a
 * PERCENT row's `amountVnd` is a mistake the union makes impossible, so the
 * parser has to earn that guarantee here.
 */
function readPromotion(value: unknown, path: string): Promotion {
  const source = record(value, path);

  const usageLimitRaw = source.usageLimit;
  if (usageLimitRaw !== null && typeof usageLimitRaw !== "number") {
    fail(`${path}.usageLimit`, "must be an integer or null (null means unlimited)");
  }

  const minOrderVnd = optionalInteger(source, "minOrderVnd", path);
  const window = {
    startsAt: instant(source, "startsAt", path),
    endsAt: instant(source, "endsAt", path),
    usageLimit: usageLimitRaw === null ? null : integer(source, "usageLimit", path),
    usedCount: integer(source, "usedCount", path),
    ...(minOrderVnd !== undefined ? { minOrderVnd } : {}),
  };

  const code = promoCode(text(source, "code", path));
  const kind = member(["PERCENT", "AMOUNT", "FREE_SHIPPING"] as const, source, "kind", path);

  if (kind === "PERCENT") {
    const maxDiscountVnd = optionalInteger(source, "maxDiscountVnd", path);
    return {
      code,
      kind,
      percent: integer(source, "percent", path),
      ...(maxDiscountVnd !== undefined ? { maxDiscountVnd } : {}),
      ...window,
    };
  }

  if (kind === "AMOUNT") {
    return { code, kind, amountVnd: integer(source, "amountVnd", path), ...window };
  }

  return { code, kind, ...window };
}

// ───────────────────────────────────────────────────────────────── the door
/**
 * `catalog_snapshot()`'s document, turned into the four arrays `buildCatalog`
 * wants. Order is carried from SQL and kept as-is: `products` arrives sorted by
 * `position`, which is the "Mới nhất" sort key.
 */
export function parseCatalogSnapshot(json: unknown): CatalogInput {
  const source = record(json, "snapshot");

  return {
    products: list(source.products, "products").map((p, i) => readProduct(p, `products[${i}]`)),
    drops: list(source.drops, "drops").map((d, i) => readDrop(d, `drops[${i}]`)),
    teasers: list(source.teasers, "teasers").map((t, i) => readTeaser(t, `teasers[${i}]`)),
    promotions: list(source.promotions, "promotions").map((p, i) =>
      readPromotion(p, `promotions[${i}]`),
    ),
  };
}
