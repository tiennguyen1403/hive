import { describe, it, expect } from "vitest";
import {
  addToCart,
  cartUnits,
  cartSubtotalVnd,
  hasBlockingIssue,
  lineKey,
  parseCart,
  removeLine,
  resolveCart,
  serializeCart,
  setLineQty,
  type Cart,
} from "./cart";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { productId, type ColorKey, type Size } from "@/data/types";

/** The fixtures this file leans on, spelled out so a failure reads plainly.
 *
 *   KHÓI   390.000₫  đen  S3 M4 L2 XL1   ·  kem S2 M2 L2 XL1
 *   BỤI    890.000₫  đen  L1 only        ·  xám XL1 only
 *   NGUỘI  1.290.000₫ đen S1 M2 L1 XL1
 */
// Pinned inside drop 05's window. Without a fixed clock every case below
// would start failing on 25/09/2026, when the drop these fixtures belong to
// shuts and every line in them becomes unbuyable.
const DURING_5 = new Date("2026-09-20T10:00:00+07:00");
const AFTER_5 = new Date("2026-09-30T10:00:00+07:00");

const KHOI = productId("p-khoi");
const BUI = productId("p-bui");
const NGUOI = productId("p-nguoi");

function line(id: string, color: ColorKey, size: Size, qty: number) {
  return { productId: productId(id), color, size, qty };
}

describe("lineKey", () => {
  it("tells two sizes of the same colourway apart", () => {
    expect(lineKey(line("p-khoi", "black", "M", 1))).not.toBe(
      lineKey(line("p-khoi", "black", "L", 1)),
    );
  });

  it("tells two colourways of the same size apart", () => {
    expect(lineKey(line("p-khoi", "black", "M", 1))).not.toBe(
      lineKey(line("p-khoi", "cream", "M", 1)),
    );
  });

  it("ignores quantity, so the same choice keeps one identity as it changes", () => {
    expect(lineKey(line("p-khoi", "black", "M", 1))).toBe(
      lineKey(line("p-khoi", "black", "M", 4)),
    );
  });
});

describe("addToCart", () => {
  it("adds a first line", () => {
    const cart = addToCart(FIXTURE_CATALOG, [], line("p-khoi", "black", "M", 1));
    expect(cart).toHaveLength(1);
    expect(cart[0]!.qty).toBe(1);
  });

  it("merges into the existing line when size and colour both match", () => {
    let cart: Cart = addToCart(FIXTURE_CATALOG, [], line("p-khoi", "black", "M", 1));
    cart = addToCart(FIXTURE_CATALOG, cart, line("p-khoi", "black", "M", 2));
    expect(cart).toHaveLength(1);
    expect(cart[0]!.qty).toBe(3);
  });

  it("keeps a separate line for the same style in another colour", () => {
    let cart: Cart = addToCart(FIXTURE_CATALOG, [], line("p-khoi", "black", "M", 1));
    cart = addToCart(FIXTURE_CATALOG, cart, line("p-khoi", "cream", "M", 1));
    expect(cart).toHaveLength(2);
  });

  it("clamps the merged quantity to what that colour and size actually has", () => {
    // KHÓI đen M has 4 on hand. Asking for 6 gets 4, not 6.
    const cart = addToCart(FIXTURE_CATALOG, [], line("p-khoi", "black", "M", 6));
    expect(cart[0]!.qty).toBe(4);
  });

  it("refuses a line for a colour and size with nothing left", () => {
    // BỤI đen S is 0. A cart line for it would be a promise the drop cannot keep.
    const cart = addToCart(FIXTURE_CATALOG, [], line("p-bui", "black", "S", 1));
    expect(cart).toEqual([]);
  });

  it("does not mutate the cart it was given", () => {
    const before: Cart = [line("p-khoi", "black", "M", 1)];
    const after = addToCart(FIXTURE_CATALOG, before, line("p-khoi", "black", "M", 1));
    expect(before[0]!.qty).toBe(1);
    expect(after[0]!.qty).toBe(2);
  });

  it("puts the newest line last, so the cart reads in the order things were chosen", () => {
    let cart: Cart = addToCart(FIXTURE_CATALOG, [], line("p-khoi", "black", "M", 1));
    cart = addToCart(FIXTURE_CATALOG, cart, line("p-nguoi", "black", "L", 1));
    expect(cart.map((l) => l.productId)).toEqual([KHOI, NGUOI]);
  });
});

describe("setLineQty", () => {
  const cart: Cart = [line("p-khoi", "black", "M", 2)];
  const key = lineKey(cart[0]!);

  it("changes the quantity of the addressed line", () => {
    expect(setLineQty(FIXTURE_CATALOG, cart, key, 3)[0]!.qty).toBe(3);
  });

  it("clamps upward requests to the units on hand", () => {
    expect(setLineQty(FIXTURE_CATALOG, cart, key, 99)[0]!.qty).toBe(4);
  });

  it("removes the line at zero rather than keeping an empty one", () => {
    expect(setLineQty(FIXTURE_CATALOG, cart, key, 0)).toEqual([]);
  });

  it("treats a negative as zero", () => {
    expect(setLineQty(FIXTURE_CATALOG, cart, key, -3)).toEqual([]);
  });

  it("leaves other lines alone", () => {
    const two: Cart = [...cart, line("p-nguoi", "black", "L", 1)];
    expect(setLineQty(FIXTURE_CATALOG, two, key, 1)[1]!.qty).toBe(1);
  });
});

describe("removeLine", () => {
  it("drops exactly the addressed line", () => {
    const cart: Cart = [
      line("p-khoi", "black", "M", 1),
      line("p-khoi", "cream", "M", 1),
    ];
    const left = removeLine(cart, lineKey(cart[0]!));
    expect(left).toHaveLength(1);
    expect(left[0]!.color).toBe("cream");
  });
});

describe("cartUnits", () => {
  it("counts units, not lines — the nav badge says how many pieces", () => {
    const cart: Cart = [
      line("p-khoi", "black", "M", 2),
      line("p-nguoi", "black", "L", 1),
    ];
    expect(cartUnits(cart)).toBe(3);
  });
});

describe("resolveCart", () => {
  it("joins each line to its product and prices it", () => {
    const { lines } = resolveCart(FIXTURE_CATALOG, DURING_5, [line("p-khoi", "black", "M", 2)]);
    expect(lines[0]!.product.name).toBe("KHÓI");
    expect(lines[0]!.lineTotalVnd).toBe(780_000);
    expect(lines[0]!.issue).toBeNull();
  });

  it("reports the units left for that colour and size, not the whole style", () => {
    const { lines } = resolveCart(FIXTURE_CATALOG, DURING_5, [line("p-bui", "black", "L", 1)]);
    expect(lines[0]!.available).toBe(1);
  });

  it("flags a line whose colour and size sold out while it sat in the cart", () => {
    // Someone else took the last BỤI đen L. The cart still holds the line.
    const { lines } = resolveCart(FIXTURE_CATALOG, DURING_5, [line("p-bui", "black", "S", 1)]);
    expect(lines[0]!.issue).toEqual({ kind: "SOLD_OUT" });
  });

  it("flags a line that wants more than is left, and says how many that is", () => {
    const { lines } = resolveCart(FIXTURE_CATALOG, DURING_5, [line("p-nguoi", "black", "M", 5)]);
    expect(lines[0]!.issue).toEqual({ kind: "SHORT", available: 2 });
  });

  it("separates a line pointing at a product that no longer exists", () => {
    const { lines, unknown } = resolveCart(FIXTURE_CATALOG, DURING_5, [line("p-khong-co", "black", "M", 1)]);
    expect(lines).toEqual([]);
    expect(unknown).toHaveLength(1);
  });
});

describe("resolveCart · the drop window", () => {
  it("blocks a line once the drop it came from has closed", () => {
    // Stock is not the only thing that can run out. A drop is a window, and
    // a cart left open across the closing bell is holding something that is
    // no longer for sale — even though the shelf still shows units.
    const { lines } = resolveCart(FIXTURE_CATALOG, AFTER_5, [line("p-khoi", "black", "M", 1)]);
    expect(lines[0]!.available).toBeGreaterThan(0);
    expect(lines[0]!.issue).toEqual({ kind: "DROP_CLOSED", dropNo: 5 });
  });

  it("leaves the same line alone while the drop is still open", () => {
    const { lines } = resolveCart(FIXTURE_CATALOG, DURING_5, [line("p-khoi", "black", "M", 1)]);
    expect(lines[0]!.issue).toBeNull();
  });

  it("reports the emptier shelf first when a line is both closed and sold out", () => {
    // Sold out is the more useful thing to say: it points at another size.
    // "Số đã đóng" points at nothing the shopper can do on this screen.
    const { lines } = resolveCart(FIXTURE_CATALOG, AFTER_5, [line("p-bui", "black", "S", 1)]);
    expect(lines[0]!.issue).toEqual({ kind: "SOLD_OUT" });
  });

  it("keeps a closed line out of the money", () => {
    const { lines } = resolveCart(FIXTURE_CATALOG, AFTER_5, [line("p-khoi", "black", "M", 1)]);
    expect(cartSubtotalVnd(lines)).toBe(0);
    expect(hasBlockingIssue(lines)).toBe(true);
  });
});

describe("cartSubtotalVnd", () => {
  it("adds up the lines that can actually be bought", () => {
    const { lines } = resolveCart(FIXTURE_CATALOG, DURING_5, [
      line("p-khoi", "black", "M", 2), // 780.000
      line("p-nguoi", "black", "L", 1), // 1.290.000
    ]);
    expect(cartSubtotalVnd(lines)).toBe(2_070_000);
  });

  it("leaves a blocked line out of the money, the way the screen shows it", () => {
    // "Tạm tính · 1 món" beside "Món đang vướng — chưa tính": a line the
    // shopper cannot buy must not be in a total they are asked to pay.
    const { lines } = resolveCart(FIXTURE_CATALOG, DURING_5, [
      line("p-bui", "black", "S", 1), // sold out
      line("p-nguoi", "black", "L", 1), // 1.290.000
    ]);
    expect(cartSubtotalVnd(lines)).toBe(1_290_000);
  });
});

describe("hasBlockingIssue", () => {
  it("is false for a clean cart", () => {
    const { lines } = resolveCart(FIXTURE_CATALOG, DURING_5, [line("p-khoi", "black", "M", 1)]);
    expect(hasBlockingIssue(lines)).toBe(false);
  });

  it("is true once any line is short or sold out — checkout stays shut", () => {
    const { lines } = resolveCart(FIXTURE_CATALOG, DURING_5, [
      line("p-khoi", "black", "M", 1),
      line("p-bui", "black", "S", 1),
    ]);
    expect(hasBlockingIssue(lines)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────── persistence
describe("parseCart", () => {
  it("round-trips a cart through storage", () => {
    const cart: Cart = [line("p-khoi", "black", "M", 2)];
    expect(parseCart(serializeCart(cart))).toEqual(cart);
  });

  it("returns an empty cart when nothing was stored", () => {
    expect(parseCart(null)).toEqual([]);
  });

  it("survives a corrupt value instead of throwing on load", () => {
    expect(parseCart("{not json")).toEqual([]);
    expect(parseCart('"a string"')).toEqual([]);
  });

  it("ignores a stored entry with a size that is not one of ours", () => {
    const raw = JSON.stringify({
      v: 1,
      lines: [{ productId: "p-khoi", color: "black", size: "XXL", qty: 1 }],
    });
    expect(parseCart(raw)).toEqual([]);
  });

  it("ignores a stored entry with a colour that is not one of ours", () => {
    const raw = JSON.stringify({
      v: 1,
      lines: [{ productId: "p-khoi", color: "chartreuse", size: "M", qty: 1 }],
    });
    expect(parseCart(raw)).toEqual([]);
  });

  it("ignores a quantity that is not a positive whole number", () => {
    const raw = JSON.stringify({
      v: 1,
      lines: [
        { productId: "p-khoi", color: "black", size: "M", qty: 0 },
        { productId: "p-khoi", color: "black", size: "L", qty: 1.5 },
        { productId: "p-khoi", color: "black", size: "S", qty: "2" },
      ],
    });
    expect(parseCart(raw)).toEqual([]);
  });

  it("keeps the good lines and drops only the bad ones", () => {
    const raw = JSON.stringify({
      v: 1,
      lines: [
        { productId: "p-khoi", color: "black", size: "M", qty: 2 },
        { productId: "p-khoi", color: "black", size: "XXL", qty: 1 },
      ],
    });
    expect(parseCart(raw)).toEqual([line("p-khoi", "black", "M", 2)]);
  });

  it("discards a payload written by an older schema", () => {
    // A cart saved before size × colour existed has no colour on its lines.
    // Reviving it would silently pick a colour for the shopper.
    const raw = JSON.stringify([{ productId: "p-khoi", size: "M", qty: 1 }]);
    expect(parseCart(raw)).toEqual([]);
  });
});

describe("catalog assumptions these tests rest on", () => {
  it("still has the stock the cases above are written against", () => {
    expect(FIXTURE_CATALOG.bySlug.get("khoi")?.stock.black?.M).toBe(4);
    expect(FIXTURE_CATALOG.bySlug.get("bui")?.stock.black?.S).toBe(0);
    expect(FIXTURE_CATALOG.bySlug.get("bui")?.stock.black?.L).toBe(1);
    expect(FIXTURE_CATALOG.bySlug.get("nguoi")?.stock.black?.M).toBe(2);
    expect(FIXTURE_CATALOG.bySlug.get("khoi")?.id).toBe(KHOI);
    expect(FIXTURE_CATALOG.bySlug.get("bui")?.id).toBe(BUI);
  });
});
