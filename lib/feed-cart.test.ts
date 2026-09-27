import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import { productId, type ColorKey, type Size } from "@/data/types";
import { resolveCart, type Cart } from "./cart";
import { canSwap, cartProblem, cartSummary, lowLeft, problemText } from "./feed-cart";

/** Số 05 sells 11/09 20:00 → 25/09 20:00 in the fixture. */
const DURING = new Date("2026-09-21T19:02:00+07:00");
const DURING_ISO = "2026-09-21T19:02:00+07:00";
const AFTER = new Date("2026-09-28T19:02:00+07:00");
const R = (a: string, b: string) => `${a} -⁠ ${b}`;

const line = (stem: string, color: ColorKey, size: Size, qty: number) => ({ productId: productId(`p-${stem}`), color, size, qty });
const one = (cart: Cart, now = DURING) => resolveCart(C, now, cart).lines[0]!;

describe("a line's problem (cart.js problem), in the mock's order", () => {
  it("is nothing for a line that can be bought", () => {
    expect(cartProblem(C, one([line("khoi", "black", "M", 2)]), DURING)).toBeNull();
    expect(problemText(C, one([line("khoi", "black", "M", 2)]), DURING)).toBeNull();
  });

  it("offers another size when the size has gone and the style still sells", () => {
    // BỤI đen M: 0 left; BỤI still has đen L and xám XL.
    const l = one([line("bui", "black", "M", 1)]);
    expect(cartProblem(C, l, DURING)).toBe("gone");
    expect(canSwap(C, l, DURING)).toBe(true);
    expect(problemText(C, l, DURING)).toBe("Hết size M. Đổi size để thanh toán.");
  });

  it("asks for the line to go when nothing of the style is left", () => {
    const l = one([line("muoi", "black", "M", 1)]);
    expect(canSwap(C, l, DURING)).toBe(false);
    expect(problemText(C, l, DURING)).toBe("Hết size M. Xoá để thanh toán.");
  });

  it("offers another size of a fixed style too", () => {
    const l = one([line("hoodie-tron", "grey", "M", 1)], AFTER);
    expect(cartProblem(C, l, AFTER)).toBe("gone");
    expect(problemText(C, l, AFTER)).toBe("Hết size M. Đổi size để thanh toán.");
  });

  it("names the closed issue first, even where the size has gone as well", () => {
    expect(problemText(C, one([line("khoi", "black", "M", 1)], AFTER), AFTER)).toBe("Số 05 đã đóng. Xoá để thanh toán.");
    const both = one([line("bui", "black", "M", 1)], AFTER);
    expect(cartProblem(C, both, AFTER)).toBe("closed");
    expect(canSwap(C, both, AFTER)).toBe(false);
  });

  it("asks for fewer when fewer are left than the line wants", () => {
    const l = one([line("nguoi", "black", "M", 5)]);
    expect(cartProblem(C, l, DURING)).toBe("short");
    expect(problemText(C, l, DURING)).toBe("Chỉ còn 2. Giảm số lượng để thanh toán.");
  });
});

describe("lowLeft: “Còn N” beside the stepper", () => {
  it("shows three or fewer of an issue's size, never on a fixed style or a blocked line", () => {
    expect(lowLeft(C, one([line("suong", "moss", "L", 1)]), DURING)).toBe(1);
    expect(lowLeft(C, one([line("khoi", "black", "M", 1)]), DURING)).toBeNull();
    expect(lowLeft(C, one([line("ao-thun-tron", "white", "XL", 1)]), DURING)).toBeNull();
    expect(lowLeft(C, one([line("nguoi", "black", "M", 5)]), DURING)).toBeNull();
  });
});

describe("cartSummary (cart.js Tóm tắt)", () => {
  it("prices what can be bought, free delivery from 1.000.000₫, and counts every piece", () => {
    const { lines } = resolveCart(C, DURING, [line("suong", "moss", "L", 1), line("khoi", "black", "M", 2), line("ao-thun-tron", "white", "L", 1)]);
    const s = cartSummary(C, lines, DURING, DURING_ISO);
    expect(s).toEqual({
      count: 4,
      subtotalVnd: 2_630_000,
      shippingFeeVnd: 0,
      totalVnd: 2_630_000,
      toFreeVnd: 0,
      freeShare: 1,
      window: R("23/09", "25/09"),
      blocked: false,
      buyable: true,
    });
  });

  it("says how far a small basket is from free delivery", () => {
    const { lines } = resolveCart(C, DURING, [line("cat", "cream", "M", 1)]);
    const s = cartSummary(C, lines, DURING, DURING_ISO);
    expect([s.subtotalVnd, s.shippingFeeVnd, s.totalVnd, s.toFreeVnd, s.freeShare]).toEqual([420_000, 30_000, 450_000, 580_000, 0.42]);
  });

  it("leaves a blocked line out of the money but in the count, and holds the checkout", () => {
    const { lines } = resolveCart(C, DURING, [line("bui", "black", "M", 1), line("nguoi", "black", "M", 1)]);
    const s = cartSummary(C, lines, DURING, DURING_ISO);
    expect([s.count, s.subtotalVnd, s.shippingFeeVnd, s.totalVnd, s.blocked, s.buyable]).toEqual([2, 1_290_000, 0, 1_290_000, true, true]);
    const only = cartSummary(C, resolveCart(C, DURING, [line("bui", "black", "M", 1)]).lines, DURING, DURING_ISO);
    expect([only.subtotalVnd, only.buyable, only.blocked]).toEqual([0, false, true]);
  });
});
