import { describe, it, expect } from "vitest";
import { CATALOG, bySlug } from "@/data/catalog";
import { SIZES, type Product } from "@/data/types";
import { EMPTY_SIM, pushSim, simProducts, type SimAction } from "./admin-sim";
import { onHand, onHandOf } from "./inventory";
import {
  ADJUST_REASONS,
  canRaise,
  changedCells,
  colorTotal,
  deltaLabel,
  draftOf,
  draftTotal,
  overCutBy,
  saveBlocker,
  withCell,
} from "./inventory-adjust";

const bui = bySlug.get("bui")!;

/** A style with room left on the shelf, whatever the fixtures do later. */
function withRoom(): Product {
  const p = CATALOG.find((x) => onHand(x) > 0 && onHand(x) < x.cutUnits);
  if (!p) throw new Error("no style with room on the shelf");
  return p;
}

describe("draftOf", () => {
  it("starts as exactly what the catalogue holds", () => {
    const draft = draftOf(bui);
    for (const c of bui.colors) {
      for (const s of SIZES) {
        expect(draft[c]![s]).toBe(onHandOf(bui, c, s));
      }
    }
  });

  it("adds up to the style's on-hand count", () => {
    expect(draftTotal(bui, draftOf(bui))).toBe(onHand(bui));
  });

  it("carries every colour the style comes in", () => {
    expect(Object.keys(draftOf(bui)).sort()).toEqual([...bui.colors].sort());
  });
});

describe("changedCells", () => {
  it("is empty until something moves", () => {
    expect(changedCells(bui, draftOf(bui))).toEqual([]);
  });

  it("reports before and after for the one cell that moved", () => {
    const color = bui.colors[0]!;
    const before = onHandOf(bui, color, "L");
    const draft = withCell(draftOf(bui), color, "L", before + 1);
    expect(changedCells(bui, draft)).toEqual([
      { color, size: "L", before, after: before + 1 },
    ]);
  });

  it("does not report a cell typed back to where it started", () => {
    const color = bui.colors[0]!;
    const before = onHandOf(bui, color, "L");
    let draft = withCell(draftOf(bui), color, "L", before + 2);
    draft = withCell(draft, color, "L", before);
    expect(changedCells(bui, draft)).toEqual([]);
  });

  it("never lets a cell go below zero", () => {
    const color = bui.colors[0]!;
    const draft = withCell(draftOf(bui), color, "S", -5);
    expect(draft[color]!.S).toBe(0);
  });
});

describe("the cut is the ceiling", () => {
  it("allows a raise while the shelf holds less than was cut", () => {
    const p = withRoom();
    expect(canRaise(p, draftOf(p))).toBe(true);
  });

  it("refuses a raise once the grid reaches the cut", () => {
    const p = withRoom();
    let draft = draftOf(p);
    const color = p.colors[0]!;
    // Fill one cell until the style's total is exactly what was cut.
    const gap = p.cutUnits - draftTotal(p, draft);
    draft = withCell(draft, color, "S", (draft[color]!.S ?? 0) + gap);
    expect(draftTotal(p, draft)).toBe(p.cutUnits);
    expect(canRaise(p, draft)).toBe(false);
  });

  it("measures how far past the cut a grid stands", () => {
    const p = withRoom();
    const color = p.colors[0]!;
    const draft = withCell(draftOf(p), color, "S", (draftOf(p)[color]!.S ?? 0) + p.cutUnits);
    expect(overCutBy(p, draft)).toBe(draftTotal(p, draft) - p.cutUnits);
    expect(overCutBy(p, draftOf(p))).toBe(0);
  });

  it("refuses to save a grid that is over the cut, and says the number", () => {
    const p = withRoom();
    const color = p.colors[0]!;
    const draft = withCell(draftOf(p), color, "S", (draftOf(p)[color]!.S ?? 0) + p.cutUnits);
    expect(saveBlocker(p, draft, "Hàng trả về")).toBe(`Không vượt ${p.cutUnits} đã cắt`);
  });
});

describe("saveBlocker names the job that is left", () => {
  it("asks for a change first", () => {
    expect(saveBlocker(bui, draftOf(bui), "Hàng trả về")).toBe("Chưa có thay đổi");
  });

  it("then asks for a reason", () => {
    const p = withRoom();
    const color = p.colors[0]!;
    const draft = withCell(draftOf(p), color, "L", (draftOf(p)[color]!.L ?? 0) + 1);
    expect(saveBlocker(p, draft, null)).toBe("Chọn lý do");
  });

  it("clears once both are there", () => {
    const p = withRoom();
    const color = p.colors[0]!;
    const draft = withCell(draftOf(p), color, "L", (draftOf(p)[color]!.L ?? 0) + 1);
    expect(saveBlocker(p, draft, "Hàng trả về")).toBeNull();
  });

  it("offers four reasons, all of them things that happen to cut cloth", () => {
    expect(ADJUST_REASONS).toEqual(["Hàng trả về", "Kiểm kê lệch", "Hư hỏng", "Khác"]);
  });
});

describe("deltaLabel", () => {
  const cell = { color: "black", size: "L", before: 1, after: 2 } as const;

  it("signs a raise and names the reason and the reference", () => {
    expect(deltaLabel(cell, "Hàng trả về", "DH-2419")).toBe("+1 · hàng trả về DH-2419");
  });

  it("signs a drop", () => {
    expect(deltaLabel({ ...cell, before: 3, after: 1 }, "Hư hỏng", "")).toBe("-2 · hư hỏng");
  });

  it("says only the number when nothing else is known yet", () => {
    expect(deltaLabel(cell, null, "")).toBe("+1");
  });
});

describe("an adjustment reaches the shelf through the store", () => {
  it("moves on-hand and therefore un-sells the piece", () => {
    const color = bui.colors[0]!;
    const before = onHandOf(bui, color, "L");
    const action: SimAction = {
      kind: "INVENTORY_ADJUSTED",
      at: "2026-09-20T18:40:00+07:00",
      productId: String(bui.id),
      cells: [{ color, size: "L", before, after: before + 1 }],
      reason: "Hàng trả về",
      ref: "DH-2419",
      note: "",
    };
    const after = simProducts(CATALOG, pushSim(EMPTY_SIM, action)).find(
      (p) => p.id === bui.id,
    )!;

    expect(onHandOf(after, color, "L")).toBe(before + 1);
    expect(onHand(after)).toBe(onHand(bui) + 1);
    // The cut never moves: only what is left on the shelf does.
    expect(after.cutUnits).toBe(bui.cutUnits);
  });

  it("leaves every other style exactly as it was", () => {
    const color = bui.colors[0]!;
    const action: SimAction = {
      kind: "INVENTORY_ADJUSTED",
      at: "2026-09-20T18:40:00+07:00",
      productId: String(bui.id),
      cells: [{ color, size: "L", before: onHandOf(bui, color, "L"), after: 0 }],
      reason: "Hư hỏng",
      ref: "",
      note: "",
    };
    const after = simProducts(CATALOG, pushSim(EMPTY_SIM, action));
    for (const p of after) {
      if (p.id === bui.id) continue;
      expect(onHand(p)).toBe(onHand(CATALOG.find((x) => x.id === p.id)!));
    }
  });

  it("keeps the colour totals the grid was showing", () => {
    const color = bui.colors[0]!;
    const draft = withCell(draftOf(bui), color, "L", onHandOf(bui, color, "L") + 1);
    expect(colorTotal(bui, draft, color)).toBe(
      SIZES.reduce((n, s) => n + onHandOf(bui, color, s), 0) + 1,
    );
  });
});
