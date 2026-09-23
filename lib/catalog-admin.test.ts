import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { productId, type Product, type Promotion } from "@/data/types";
import {
  MAX_PROMO_CODE,
  STALE_STOCK_MESSAGE,
  borrowedPhotoKeys,
  catalogFailureMessage,
  catalogFailureOf,
  checkAdjustment,
  familyOfKind,
  gridCells,
  isEmptyPatch,
  isSlug,
  isVnInstant,
  nextDropNo,
  productPatch,
  readCells,
  readDropNo,
  readPromoDraft,
  readTeaser,
  readWindow,
  sameTerms,
  termsOf,
} from "./catalog-admin";

const catalog = FIXTURE_CATALOG;
const khoi = catalog.byId.get(productId("p-khoi"))!;
const dot05 = catalog.promoByCode.get("DOT05" as never)!;

/** The product form, as it posts a style it has not touched. */
const formOf = (p: Product) => ({
  name: p.name,
  kind: p.kind,
  slug: p.slug,
  priceVnd: p.priceVnd,
  material: p.material,
  dropNo: p.dropNo,
});

/** The code sheet's draft, as `PromoFormSheet` builds it. */
const draft = (over: Record<string, unknown> = {}) => ({
  code: "TEST10",
  promoKind: "PERCENT",
  percent: 10,
  amountVnd: 50_000,
  maxDiscountVnd: 150_000,
  minOrderVnd: 500_000,
  usageLimit: 100,
  startsAt: "2026-09-23T20:00:00+07:00",
  endsAt: "2026-10-23T20:00:00+07:00",
  ...over,
});

describe("what the database answered", () => {
  it("reads the five codes the functions raise, and nothing else", () => {
    for (const code of ["NOT_ADMIN", "NOT_FOUND", "NOT_ALLOWED", "BAD_INPUT", "STALE"]) {
      expect(catalogFailureOf({ code: "P0001", message: code })).toBe(code);
    }
    expect(catalogFailureOf({ code: "P0001", message: "PROMO_INVALID" })).toBe("UNAVAILABLE");
    expect(catalogFailureOf({ code: "23505", message: "STALE" })).toBe("UNAVAILABLE");
    expect(catalogFailureOf(null)).toBe("UNAVAILABLE");
  });

  it("says the brief's own sentence for a shelf that moved under the form", () => {
    expect(catalogFailureMessage("ADJUST_STOCK", "STALE")).toBe(STALE_STOCK_MESSAGE);
    expect(STALE_STOCK_MESSAGE).toBe("Tồn kho đã đổi ở nơi khác — tải lại rồi sửa tiếp");
  });

  it("names what to do next, with the subject", () => {
    expect(catalogFailureMessage("ADD_DROP", "NOT_ALLOWED", "Số 07")).toBe(
      "Số 07 đã có — tải lại trang để lấy số kế tiếp.",
    );
    expect(catalogFailureMessage("ADD_PROMO", "NOT_ALLOWED", "DOT05")).toBe("Mã DOT05 đã có rồi.");
    expect(catalogFailureMessage("END_PROMO", "NOT_ALLOWED", "DOT05")).toMatch(/không còn đang chạy/);
    expect(catalogFailureMessage("UPDATE_PRODUCT", "NOT_ALLOWED", "bui")).toBe(
      'Mã trên địa chỉ "bui" đã dùng cho mẫu khác.',
    );
    expect(catalogFailureMessage("ADD_TEASER", "NOT_FOUND", "Số 09")).toBe("Chưa có Số 09 để hé lộ mẫu.");
    expect(catalogFailureMessage("PAUSE_PROMO", "NOT_ADMIN")).toMatch(/đăng nhập lại/);
    expect(catalogFailureMessage("RAISE_LIMIT", "UNAVAILABLE")).toBe("Chưa lưu được. Thử lại sau ít phút.");
  });
});

describe("readCells — what an adjustment may send", () => {
  const cell = { color: "black", size: "XL", before: 1, after: 0 };

  it("reads a cell that moved", () => {
    expect(readCells([cell])).toEqual([cell]);
  });

  it("refuses nothing, junk, a cell twice, and a cell that did not move", () => {
    expect(readCells([])).toBeNull();
    expect(readCells("black")).toBeNull();
    expect(readCells([cell, { ...cell, after: 2 }])).toBeNull();
    expect(readCells([{ ...cell, after: 1 }])).toBeNull();
  });

  it("refuses an unknown colour or size, and a count that is not a whole number of pieces", () => {
    expect(readCells([{ ...cell, color: "pink" }])).toBeNull();
    expect(readCells([{ ...cell, size: "XXL" }])).toBeNull();
    expect(readCells([{ ...cell, after: -1 }])).toBeNull();
    expect(readCells([{ ...cell, after: 0.5 }])).toBeNull();
    expect(readCells([{ ...cell, before: "1" }])).toBeNull();
  });

  it("takes at most one decision per cell of a grid: seven colours by four sizes", () => {
    const many = Array.from({ length: 29 }, (_, i) => ({ ...cell, before: i + 1, after: 0 }));
    expect(readCells(many)).toBeNull();
  });
});

describe("checkAdjustment — the sheet's rules, restated for the server", () => {
  const drop = [{ color: "black" as const, size: "XL" as const, before: 1, after: 0 }];

  it("lets a correction through", () => {
    expect(checkAdjustment(khoi, drop, "Kiểm kê lệch", "", "")).toBeNull();
    expect(checkAdjustment(khoi, drop, "Sửa mẫu", "", "")).toBeNull();
  });

  it("wants a reason from the list", () => {
    expect(checkAdjustment(khoi, drop, "", "", "")).toBe("Chọn lý do.");
    expect(checkAdjustment(khoi, drop, "May thêm", "", "")).toBe("Chọn lý do.");
  });

  it("refuses a colour the style does not come in", () => {
    const moss = [{ color: "moss" as const, size: "M" as const, before: 0, after: 1 }];
    expect(checkAdjustment(khoi, moss, "Khác", "", "")).toBe("KHÓI không có màu này.");
  });

  it("holds the shelf under the cut: a shelf cannot hold more than was cut", () => {
    const over = [{ color: "black" as const, size: "S" as const, before: 3, after: 3 + khoi.cutUnits }];
    expect(checkAdjustment(khoi, over, "Hàng trả về", "", "")).toBe(`Không vượt ${khoi.cutUnits} đã cắt`);
  });

  it("keeps the reference and the note to the database's lengths", () => {
    expect(checkAdjustment(khoi, drop, "Khác", "x".repeat(201), "")).toMatch(/Tham chiếu tối đa 200/);
    expect(checkAdjustment(khoi, drop, "Khác", "", "x".repeat(501))).toMatch(/Ghi chú tối đa 500/);
  });
});

describe("gridCells — the product form's grid as cells", () => {
  it("lists only the cells that moved, with the number the page showed", () => {
    const initial = { black: { S: 3, M: 4, L: 2, XL: 1 }, cream: { S: 2, M: 2, L: 2, XL: 1 } };
    const current = { black: { S: 3, M: 4, L: 2, XL: 0 }, cream: { S: 2, M: 3, L: 2, XL: 1 } };
    expect(gridCells(["black", "cream"], initial, current)).toEqual([
      { color: "black", size: "XL", before: 1, after: 0 },
      { color: "cream", size: "M", before: 2, after: 3 },
    ]);
    expect(gridCells(["black"], initial, initial)).toEqual([]);
  });
});

describe("the issues", () => {
  it("offers the next number nobody has used", () => {
    expect(nextDropNo(catalog.drops)).toBe(7);
    expect(nextDropNo([])).toBe(1);
  });

  it("reads two instants in the app's shape, the closing one after the opening one", () => {
    const opens = "2026-10-01T20:00:00+07:00";
    const closes = "2026-10-15T20:00:00+07:00";
    expect(readWindow(opens, closes)).toEqual({ ok: true, value: { opensAt: opens, closesAt: closes } });
    expect(readWindow(closes, opens)).toEqual({ ok: false, error: "Ngày đóng phải sau ngày mở." });
    expect(readWindow(opens, opens).ok).toBe(false);
    expect(readWindow("01/10/2026", closes).ok).toBe(false);
    expect(readWindow(opens, "2026-10-15T13:00:00Z").ok).toBe(false);
  });

  it("reads an issue number as a whole number above zero", () => {
    expect(readDropNo(7)).toBe(7);
    expect(readDropNo(0)).toBeNull();
    expect(readDropNo(7.5)).toBeNull();
    expect(readDropNo("7")).toBeNull();
  });

  it("accepts only the +07:00 shape as an instant", () => {
    expect(isVnInstant("2026-10-01T20:00:00+07:00")).toBe(true);
    expect(isVnInstant("2026-10-01T20:00:00Z")).toBe(false);
    expect(isVnInstant(20)).toBe(false);
  });
});

describe("readTeaser — a name, a kind and a borrowed photo", () => {
  const sheet = { dropNo: 6, name: " thử ", garment: "Áo khoác dù", photoKey: "suong" };

  it("builds the row: capitals, the kind's family, the slug from the name and the issue", () => {
    expect(readTeaser(sheet, catalog)).toEqual({
      ok: true,
      value: {
        slug: "thu-6",
        name: "THỬ",
        garment: "Áo khoác dù",
        family: "JACKET",
        dropNo: 6,
        photoKey: "suong",
      },
    });
  });

  it("refuses a kind the catalogue does not use, since its family would be a guess", () => {
    expect(readTeaser({ ...sheet, garment: "Áo len" }, catalog)).toEqual({ ok: false, error: "Chọn loại." });
  });

  it("refuses a photo nobody borrows, and an empty name", () => {
    expect(readTeaser({ ...sheet, photoKey: "khong-co" }, catalog)).toEqual({ ok: false, error: "Chọn một ảnh." });
    expect(readTeaser({ ...sheet, name: "  " }, catalog)).toEqual({ ok: false, error: "Nhập tên mẫu." });
    expect(readTeaser({ ...sheet, dropNo: 0 }, catalog).ok).toBe(false);
  });

  it("offers every photo a style or a teaser already uses, once", () => {
    const keys = borrowedPhotoKeys(catalog);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of catalog.products) for (const k of p.photoKeys) expect(keys).toContain(k);
    for (const t of catalog.teasers) expect(keys).toContain(t.photoKey);
  });

  it("files a kind where the catalogue files it", () => {
    expect(familyOfKind(catalog, "Áo thun oversize")).toBe("TEE");
    expect(familyOfKind(catalog, "Áo len")).toBeUndefined();
  });
});

describe("readPromoDraft — the code sheet's draft, as the database takes it", () => {
  it("keeps only what a percentage code carries", () => {
    const read = readPromoDraft(draft({ code: " test 10 " }));
    expect(read).toEqual({
      ok: true,
      value: {
        code: "TEST10",
        terms: {
          kind: "PERCENT",
          percent: 10,
          maxDiscountVnd: 150_000,
          amountVnd: null,
          minOrderVnd: 500_000,
          usageLimit: 100,
          startsAt: "2026-09-23T20:00:00+07:00",
          endsAt: "2026-10-23T20:00:00+07:00",
        },
      },
    });
  });

  it("reads 0 as 'none' for the cap and the minimum, and a blank limit as unlimited", () => {
    const read = readPromoDraft(draft({ maxDiscountVnd: 0, minOrderVnd: 0, usageLimit: null }));
    expect(read.ok && read.value.terms).toMatchObject({ maxDiscountVnd: null, minOrderVnd: null, usageLimit: null });
  });

  it("drops the percentage and the cap from an amount code, and all three from free shipping", () => {
    const amount = readPromoDraft(draft({ promoKind: "AMOUNT" }));
    expect(amount.ok && amount.value.terms).toMatchObject({ kind: "AMOUNT", percent: null, maxDiscountVnd: null, amountVnd: 50_000 });
    const free = readPromoDraft(draft({ promoKind: "FREE_SHIPPING" }));
    expect(free.ok && free.value.terms).toMatchObject({ percent: null, maxDiscountVnd: null, amountVnd: null });
  });

  it("refuses what the table's check would", () => {
    expect(readPromoDraft(draft({ percent: 0 })).ok).toBe(false);
    expect(readPromoDraft(draft({ percent: 101 })).ok).toBe(false);
    expect(readPromoDraft(draft({ promoKind: "AMOUNT", amountVnd: 0 })).ok).toBe(false);
    expect(readPromoDraft(draft({ usageLimit: 0 })).ok).toBe(false);
    expect(readPromoDraft(draft({ endsAt: "2026-09-23T20:00:00+07:00" })).ok).toBe(false);
    expect(readPromoDraft(draft({ promoKind: "GIFT" })).ok).toBe(false);
    expect(readPromoDraft(draft({ code: "" })).ok).toBe(false);
    expect(readPromoDraft(draft({ code: "X".repeat(MAX_PROMO_CODE + 1) })).ok).toBe(false);
  });

  it("tells an unchanged code from a changed one", () => {
    const same = termsOf(dot05);
    expect(sameTerms(same, { ...same })).toBe(true);
    expect(sameTerms(same, { ...same, percent: 12 })).toBe(false);
  });

  it("reads a code's terms back from the catalogue the same way", () => {
    expect(termsOf(dot05)).toEqual({
      kind: "PERCENT",
      percent: 10,
      maxDiscountVnd: 150_000,
      amountVnd: null,
      minOrderVnd: 500_000,
      usageLimit: 200,
      startsAt: dot05.startsAt,
      endsAt: dot05.endsAt,
    });
    const chao = catalog.promoByCode.get("CHAOBAN" as never) as Promotion;
    expect(termsOf(chao)).toMatchObject({ kind: "AMOUNT", amountVnd: 50_000, percent: null, usageLimit: null });
  });
});

describe("productPatch — only what changed", () => {
  it("is empty for a form nobody touched", () => {
    const read = productPatch(khoi, formOf(khoi), catalog);
    expect(read).toEqual({ ok: true, value: {} });
    expect(read.ok && isEmptyPatch(read.value)).toBe(true);
  });

  it("carries a new price and nothing else", () => {
    expect(productPatch(khoi, { ...formOf(khoi), priceVnd: 420_000 }, catalog)).toEqual({
      ok: true,
      value: { priceVnd: 420_000 },
    });
  });

  it("writes the name in capitals, as every style's is written", () => {
    expect(productPatch(khoi, { ...formOf(khoi), name: "khói mới" }, catalog)).toEqual({
      ok: true,
      value: { name: "KHÓI MỚI" },
    });
  });

  it("makes the address segment from the name when it is left empty", () => {
    expect(productPatch(khoi, { ...formOf(khoi), name: "KHÓI ĐEN", slug: "" }, catalog)).toEqual({
      ok: true,
      value: { name: "KHÓI ĐEN", slug: "khoi-den" },
    });
  });

  it("refuses a segment another style has, or one with anything but a-z, 0-9 and dashes", () => {
    expect(productPatch(khoi, { ...formOf(khoi), slug: "bui" }, catalog)).toEqual({
      ok: false,
      error: 'Mã trên địa chỉ "bui" đã dùng cho mẫu khác.',
    });
    expect(productPatch(khoi, { ...formOf(khoi), slug: "Khói" }, catalog).ok).toBe(false);
    expect(isSlug("khoi-2")).toBe(true);
    expect(isSlug("khoi_2")).toBe(false);
  });

  it("refuses a price of nothing and an issue that does not exist", () => {
    expect(productPatch(khoi, { ...formOf(khoi), priceVnd: 0 }, catalog).ok).toBe(false);
    expect(productPatch(khoi, { ...formOf(khoi), dropNo: 9 }, catalog).ok).toBe(false);
  });

  it("never carries the cut, whatever the form sends", () => {
    const read = productPatch(khoi, { ...formOf(khoi), cutUnits: 99 }, catalog);
    expect(read.ok && "cutUnits" in read.value).toBe(false);
  });
});
