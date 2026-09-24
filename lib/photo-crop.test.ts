import { describe, expect, it } from "vitest";
import {
  CROP_RATIO,
  MIN_CROP_WIDTH,
  clampCrop,
  defaultCrop,
  dims,
  isHandle,
  isSoft,
  keyCrop,
  moveCrop,
  outputSize,
  previewBox,
  resizeFromHandle,
  sameCrop,
  type Crop,
} from "./photo-crop";

/** A 3:2 photo, the shape the acceptance run feeds the form. */
const W = 2400;
const H = 1600;

const is45 = (c: Crop) => expect(c.h).toBeCloseTo(c.w * CROP_RATIO, 9);
const inside = (c: Crop, nw = W, nh = H) => {
  expect(c.x).toBeGreaterThanOrEqual(0);
  expect(c.y).toBeGreaterThanOrEqual(0);
  expect(c.x + c.w).toBeLessThanOrEqual(nw + 1e-9);
  expect(c.y + c.h).toBeLessThanOrEqual(nh + 1e-9);
};

describe("defaultCrop", () => {
  it("opens on the largest 4:5 frame, centred — full height on a landscape photo", () => {
    expect(defaultCrop(W, H)).toEqual({ x: 560, y: 0, w: 1280, h: 1600 });
  });

  it("full width on a portrait photo taller than 4:5", () => {
    // The mock's sample: 1 400 × 2 100 opens at "vùng cắt 1.400×1.750".
    expect(defaultCrop(1400, 2100)).toEqual({ x: 0, y: 175, w: 1400, h: 1750 });
  });

  it("is the whole photo when the photo is already 4:5", () => {
    expect(defaultCrop(800, 1000)).toEqual({ x: 0, y: 0, w: 800, h: 1000 });
  });
});

describe("clampCrop", () => {
  it("keeps 4:5 and keeps the frame on the photo", () => {
    const c = clampCrop({ x: 2300, y: 900, w: 500, h: 10 }, W, H);
    is45(c);
    inside(c);
    expect(c).toEqual({ x: 1900, y: 900, w: 500, h: 625 });
  });

  it("never goes below 200 pixels wide", () => {
    const c = clampCrop({ x: 10, y: 10, w: 50, h: 62.5 }, W, H);
    expect(c.w).toBe(MIN_CROP_WIDTH);
    is45(c);
  });

  it("never grows past the largest frame the photo holds", () => {
    const c = clampCrop({ x: 0, y: 0, w: 9999, h: 1 }, W, H);
    expect(c.w).toBe(1280);
    expect(c.h).toBe(1600);
  });

  it("takes the whole photo as the floor when the photo is narrower than 200", () => {
    const c = clampCrop({ x: 0, y: 0, w: 10, h: 12.5 }, 120, 150);
    expect(c).toEqual({ x: 0, y: 0, w: 120, h: 150 });
  });
});

describe("moveCrop", () => {
  const start = { x: 560, y: 0, w: 1280, h: 1600 };

  it("moves the frame by the drag, in the photo's own pixels", () => {
    expect(moveCrop(start, -200, 0, W, H)).toEqual({ x: 360, y: 0, w: 1280, h: 1600 });
  });

  it("stops at the edges instead of leaving the photo", () => {
    expect(moveCrop(start, 5000, 300, W, H)).toEqual({ x: 1120, y: 0, w: 1280, h: 1600 });
    expect(moveCrop(start, -5000, -300, W, H)).toEqual({ x: 0, y: 0, w: 1280, h: 1600 });
  });
});

describe("resizeFromHandle", () => {
  const start = { x: 800, y: 400, w: 400, h: 500 };

  it("the bottom-right handle grows the frame and keeps the top-left corner", () => {
    const c = resizeFromHandle(start, "se", 100, 0, W, H);
    expect(c).toEqual({ x: 800, y: 400, w: 500, h: 625 });
  });

  it("the top-left handle keeps the bottom-right corner where it was", () => {
    const c = resizeFromHandle(start, "nw", -100, 0, W, H);
    expect(c.x + c.w).toBe(1200);
    expect(c.y + c.h).toBe(900);
    expect(c.w).toBe(500);
  });

  it("the larger of the two pulls decides the size", () => {
    // 40 across, 100 down: the vertical pull, as a width, is 80.
    const c = resizeFromHandle(start, "se", 40, 100, W, H);
    expect(c.w).toBe(480);
    is45(c);
  });

  it("dragging a corner inwards shrinks the frame, but not below 200", () => {
    expect(resizeFromHandle(start, "ne", -150, 0, W, H).w).toBe(250);
    expect(resizeFromHandle(start, "ne", -1000, 0, W, H).w).toBe(MIN_CROP_WIDTH);
  });

  it("grows only as far as the photo goes on the handle's side", () => {
    const c = resizeFromHandle(start, "se", 5000, 0, W, H);
    // Room below the top edge: 1 200 pixels of height, so 960 of width.
    expect(c.w).toBe(960);
    inside(c);
    is45(c);
  });

  it("recognises the four handle names and nothing else", () => {
    expect(["nw", "ne", "sw", "se"].every(isHandle)).toBe(true);
    expect(isHandle("move")).toBe(false);
    expect(isHandle(null)).toBe(false);
  });
});

describe("keyCrop", () => {
  const start = { x: 560, y: 100, w: 800, h: 1000 };

  it("moves 8 pixels per arrow, 40 with Shift", () => {
    expect(keyCrop(start, "ArrowRight", false, W, H)).toEqual({ ...start, x: 568 });
    expect(keyCrop(start, "ArrowLeft", true, W, H)).toEqual({ ...start, x: 520 });
    expect(keyCrop(start, "ArrowDown", false, W, H)).toEqual({ ...start, y: 108 });
    expect(keyCrop(start, "ArrowUp", true, W, H)).toEqual({ ...start, y: 60 });
  });

  it("grows by 5 % on + (and =), shrinks by the same factor on -", () => {
    const grown = keyCrop(start, "+", false, W, H)!;
    expect(grown.w).toBeCloseTo(840, 9);
    is45(grown);
    expect(keyCrop(start, "=", false, W, H)).toEqual(grown);
    expect(keyCrop(start, "-", false, W, H)!.w).toBeCloseTo(800 / 1.05, 9);
  });

  it("stays on the photo", () => {
    const edge = { x: 1596, y: 0, w: 800, h: 1000 };
    expect(keyCrop(edge, "ArrowRight", true, W, H)!.x).toBe(1600);
  });

  it("leaves every other key alone", () => {
    expect(keyCrop(start, "Enter", false, W, H)).toBeNull();
    expect(keyCrop(start, "a", false, W, H)).toBeNull();
  });
});

describe("outputSize and dims", () => {
  it("saves at most 1 200 × 1 500", () => {
    expect(outputSize({ w: 1400 })).toEqual({ w: 1200, h: 1500 });
    expect(outputSize({ w: 1280 })).toEqual({ w: 1200, h: 1500 });
  });

  it("keeps a smaller region at its own size, in whole pixels", () => {
    expect(outputSize({ w: 900 })).toEqual({ w: 900, h: 1125 });
    expect(outputSize({ w: 800.6 })).toEqual({ w: 801, h: 1001 });
  });

  it("prints sizes grouped the Vietnamese way", () => {
    expect(dims(1860, 2325)).toBe("1.860×2.325");
    expect(dims(1400, 1750)).toBe("1.400×1.750");
    expect(dims(801, 1001.25)).toBe("801×1.001");
  });

  it("calls a region narrower than 800 soft", () => {
    expect(isSoft({ w: 799.9 })).toBe(true);
    expect(isSoft({ w: 800 })).toBe(false);
  });
});

describe("previewBox", () => {
  it("draws only the region inside a 4:5 box", () => {
    // 120px tall box over a 1 600px region: everything at 7,5 %.
    const box = previewBox({ x: 560, y: 0, w: 1280, h: 1600 }, W, 120);
    expect(box.size).toBeCloseTo(180, 9);
    expect(box.x).toBeCloseTo(-42, 9);
    expect(box.y).toBeCloseTo(0, 9);
  });
});

describe("sameCrop", () => {
  it("compares the region, not the object", () => {
    expect(sameCrop({ x: 1, y: 2, w: 3, h: 4 }, { x: 1, y: 2, w: 3, h: 4 })).toBe(true);
    expect(sameCrop({ x: 1, y: 2, w: 3, h: 4 }, { x: 1, y: 2, w: 3, h: 5 })).toBe(false);
  });
});
