import { describe, expect, it } from "vitest";
import {
  WAIT,
  closingFrame,
  easeOut,
  isAdminPath,
  shouldVeil,
  showingFrame,
  type WaitClick,
} from "./wait";

const here = new URL("http://127.0.0.1:3200/products?family=TEE");
const to = (href: string) => new URL(href, here);

/** A plain left click: no modifier, no `target`, no `download`. */
const plain: WaitClick = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  target: null,
  download: false,
};

/**
 * §2.2 of the slice 9 brief: the page is covered only when the navigation
 * leads to a DIFFERENT pathname. Everything that stays on the page — a
 * filter, a sort, a family tab, a hash — leaves it alone, as it does today.
 */
describe("shouldVeil — where the navigation leads", () => {
  it("covers the page for another pathname", () => {
    expect(shouldVeil(here, to("/products/khoi"), plain)).toBe(true);
    expect(shouldVeil(here, to("/cart"), plain)).toBe(true);
    expect(shouldVeil(here, to("/"), plain)).toBe(true);
    expect(shouldVeil(here, to("/account/orders"), plain)).toBe(true);
  });

  it("leaves it alone for the same pathname with another query", () => {
    expect(shouldVeil(here, to("/products?family=HOODIE"), plain)).toBe(false);
    expect(shouldVeil(here, to("/products?sort=price-asc"), plain)).toBe(false);
    expect(shouldVeil(here, to("/products"), plain)).toBe(false);
    expect(shouldVeil(here, to("?size=M"), plain)).toBe(false);
  });

  it("leaves it alone when only the hash changes", () => {
    expect(shouldVeil(here, to("#filter"), plain)).toBe(false);
    expect(shouldVeil(here, to("/products?family=TEE#filter"), plain)).toBe(false);
  });

  it("does not care about the hash when the pathname changes", () => {
    expect(shouldVeil(here, to("/#rules"), plain)).toBe(true);
  });

  it("reads a trailing slash as the same page", () => {
    expect(shouldVeil(here, to("/products/"), plain)).toBe(false);
    expect(shouldVeil(to("/"), to("/"), plain)).toBe(false);
  });

  it("leaves it alone for another origin", () => {
    expect(shouldVeil(here, new URL("https://images.unsplash.com/photo-1"), plain)).toBe(false);
    expect(shouldVeil(here, new URL("http://localhost:3200/cart"), plain)).toBe(false);
    expect(shouldVeil(here, new URL("mailto:shop@example.com"), plain)).toBe(false);
  });

  it("never covers anything on the way into, or out of, the back office", () => {
    expect(shouldVeil(here, to("/admin"), plain)).toBe(false);
    expect(shouldVeil(here, to("/admin/orders"), plain)).toBe(false);
    expect(shouldVeil(to("/admin/orders"), to("/products"), plain)).toBe(false);
  });

  it("applies the same rule to a navigation made by code (no click)", () => {
    expect(shouldVeil(here, to("/order-confirmed/DH-2431"))).toBe(true);
    expect(shouldVeil(here, to("/products?sort=new"))).toBe(false);
    expect(shouldVeil(here, to("/admin/products"))).toBe(false);
  });
});

/**
 * The browser opens these somewhere else, or not at all; Next's Link does not
 * navigate for them either, so there is no page to wait for here.
 */
describe("shouldVeil — how the link was pressed", () => {
  const khoi = to("/products/khoi");

  it("covers the page for a plain left click", () => {
    expect(shouldVeil(here, khoi, plain)).toBe(true);
  });

  it("leaves it alone for a click with a modifier key", () => {
    expect(shouldVeil(here, khoi, { ...plain, metaKey: true })).toBe(false);
    expect(shouldVeil(here, khoi, { ...plain, ctrlKey: true })).toBe(false);
    expect(shouldVeil(here, khoi, { ...plain, shiftKey: true })).toBe(false);
    expect(shouldVeil(here, khoi, { ...plain, altKey: true })).toBe(false);
  });

  it("leaves it alone for a middle or right click", () => {
    expect(shouldVeil(here, khoi, { ...plain, button: 1 })).toBe(false);
    expect(shouldVeil(here, khoi, { ...plain, button: 2 })).toBe(false);
  });

  it("leaves it alone for a link that opens another window", () => {
    expect(shouldVeil(here, khoi, { ...plain, target: "_blank" })).toBe(false);
    expect(shouldVeil(here, khoi, { ...plain, target: "preview" })).toBe(false);
  });

  it("treats target=_self as the same window", () => {
    expect(shouldVeil(here, khoi, { ...plain, target: "_self" })).toBe(true);
  });

  it("leaves it alone for a download", () => {
    expect(shouldVeil(here, khoi, { ...plain, download: true })).toBe(false);
  });
});

describe("isAdminPath", () => {
  it("matches the back office and nothing that merely starts with the word", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/orders/DH-2429")).toBe(true);
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/products/admin")).toBe(false);
  });
});

describe("easeOut", () => {
  it("is cubic, and clamped to the unit interval", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeCloseTo(0.875, 6);
    expect(easeOut(-1)).toBe(0);
    expect(easeOut(2)).toBe(1);
  });
});

/**
 * The timing is the approved board's (`prototype/v3/loading.html`, the
 * `veil` object): 120 ms before anything shows, the white in over 160 ms, the
 * mark growing from .92 over 240 ms, a 28% arc once round every 1.1 s.
 */
describe("showingFrame — while the page is on its way", () => {
  it("pins the board's numbers", () => {
    expect(WAIT).toEqual({
      delay: 120,
      fadeIn: 160,
      grow: 240,
      turn: 1100,
      close: 150,
      fadeOut: 180,
      arc: 28,
      guard: 10_000,
    });
  });

  it("starts clear, small and at twelve o'clock", () => {
    expect(showingFrame(0, false)).toEqual({ opacity: 0, scale: 0.92, angle: 0, arc: 28 });
  });

  it("is fully in after 160 ms and full size after 240 ms", () => {
    expect(showingFrame(160, false).opacity).toBe(1);
    expect(showingFrame(160, false).scale).toBeLessThan(1);
    expect(showingFrame(240, false).scale).toBe(1);
  });

  it("turns the arc clockwise, once every 1.1 s, at a constant rate", () => {
    expect(showingFrame(275, false).angle).toBeCloseTo(90, 6);
    expect(showingFrame(1100, false).angle).toBeCloseTo(360, 6);
    expect(showingFrame(2200, false).angle).toBeCloseTo(720, 6);
    expect(showingFrame(2200, false).arc).toBe(28);
  });

  it("stands still for reduced motion: no growth, no turn, the whole ring", () => {
    expect(showingFrame(0, true)).toEqual({ opacity: 0, scale: 1, angle: 0, arc: 100 });
    expect(showingFrame(80, true).opacity).toBeGreaterThan(0);
    expect(showingFrame(1234, true)).toEqual({ opacity: 1, scale: 1, angle: 0, arc: 100 });
  });
});

describe("closingFrame — the page has arrived", () => {
  it("closes the arc into the ring over 150 ms, holding the white", () => {
    const first = closingFrame(0, 1, 500, false);
    expect(first).toMatchObject({ opacity: 1, scale: 1, arc: 28 });
    expect(closingFrame(150, 1, 500, false)).toMatchObject({ opacity: 1, arc: 100 });
  });

  it("keeps turning from where the arc was", () => {
    expect(closingFrame(0, 1, 550, false)!.angle).toBeCloseTo(180, 6);
    expect(closingFrame(275, 1, 550, false)!.angle).toBeCloseTo(270, 6);
  });

  it("then fades the white out over 180 ms and is done", () => {
    const mid = closingFrame(150 + 90, 1, 0, false)!;
    expect(mid.arc).toBe(100);
    expect(mid.opacity).toBeGreaterThan(0);
    expect(mid.opacity).toBeLessThan(1);
    expect(closingFrame(330, 1, 0, false)).toBeNull();
  });

  it("fades from whatever opacity the page arrived at", () => {
    expect(closingFrame(0, 0.4, 0, false)!.opacity).toBe(0.4);
    expect(closingFrame(200, 0.4, 0, false)!.opacity).toBeLessThan(0.4);
  });

  it("only fades for reduced motion, over 180 ms", () => {
    expect(closingFrame(0, 1, 500, true)).toEqual({ opacity: 1, scale: 1, angle: 0, arc: 100 });
    expect(closingFrame(90, 1, 500, true)!.opacity).toBeLessThan(1);
    expect(closingFrame(180, 1, 500, true)).toBeNull();
  });
});
