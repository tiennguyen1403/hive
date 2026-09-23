import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { productId, type Product, type Promotion } from "@/data/types";
import { buildCatalog } from "./catalog";
import {
  CATALOG_ERROR_CODES,
  DROP_LENGTH_DAYS,
  MAX_PROMO_CODE,
  NO_CHANGE_MESSAGE,
  SLUG_TAKEN_MESSAGE,
  STALE_STOCK_MESSAGE,
  borrowedPhotoKeys,
  catalogFailureMessage,
  catalogFailureOf,
  checkAdjustment,
  colorLabelOf,
  cutTotal,
  failureDetail,
  familyOfKind,
  gridCells,
  isEmptyPatch,
  isNewSlug,
  isSlug,
  isVnInstant,
  nextDropNo,
  overlapMessage,
  overlappingDrop,
  productPatch,
  productSlug,
  proposedWindow,
  readCells,
  readColorOrder,
  readDropNo,
  readNewProduct,
  readPhotoMap,
  readPromoDraft,
  readTeaser,
  readWindow,
  sameOrder,
  sameTerms,
  slugTaken,
  termsOf,
  uniqueSlug,
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

// ─────────────────────────────────────────────────────── slice B3c
const UP = `up/${"0123456789abcdef".repeat(2)}.webp`;

describe("what the database answers about a new style and its photos", () => {
  it("reads the five codes slice B3c added, beside the five of B3b", () => {
    expect(CATALOG_ERROR_CODES).toHaveLength(10);
    for (const code of ["DROP_CLOSED", "NO_COLORS", "COLOR_EMPTY", "PHOTO_MISSING", "PHOTO_UNKNOWN"]) {
      expect(catalogFailureOf({ code: "P0001", message: code })).toBe(code);
    }
    // Never raised by SQL: a file the server would not store is the action's word.
    expect(catalogFailureOf({ code: "P0001", message: "UPLOAD_BAD" })).toBe("UNAVAILABLE");
  });

  it("keeps what a refusal was about — the colour, or the issue in the way", () => {
    expect(failureDetail({ details: "black" })).toBe("black");
    expect(failureDetail({ details: null })).toBe("");
    expect(failureDetail(null)).toBe("");
    expect(colorLabelOf("moss")).toBe("Rêu");
    expect(colorLabelOf("pink")).toBe("");
  });

  it("says the brief's sentences, and names the colour or the issue when it knows it", () => {
    expect(catalogFailureMessage("ADD_PRODUCT", "NOT_ALLOWED")).toBe("Mã địa chỉ đã có mẫu khác dùng");
    expect(SLUG_TAKEN_MESSAGE).toBe("Mã địa chỉ đã có mẫu khác dùng");
    expect(catalogFailureMessage("ADD_PRODUCT", "DROP_CLOSED")).toBe("Số đã đóng, không thêm mẫu vào đó");
    expect(catalogFailureMessage("ADD_PRODUCT", "DROP_CLOSED", "Số 04")).toBe("Số 04 đã đóng, không thêm mẫu vào đó");
    expect(catalogFailureMessage("ADD_PRODUCT", "NO_COLORS")).toBe("Chọn ít nhất một màu");
    expect(catalogFailureMessage("ADD_PRODUCT", "COLOR_EMPTY", "Đen")).toBe("Điền số cắt cho Đen");
    expect(catalogFailureMessage("ADD_PRODUCT", "PHOTO_MISSING", "Rêu")).toBe("Chọn ảnh cho Rêu");
    expect(catalogFailureMessage("ADD_PRODUCT", "PHOTO_UNKNOWN")).toBe("Ảnh không còn trên kho, chọn lại");
    expect(catalogFailureMessage("SET_PHOTO", "PHOTO_UNKNOWN", "Kem")).toBe("Ảnh Kem không còn trên kho, chọn lại");
    expect(catalogFailureMessage("ADD_PRODUCT", "NOT_FOUND", "Số 09")).toBe("Chưa có Số 09 — chọn số khác.");
    expect(catalogFailureMessage("SET_PHOTO", "BAD_INPUT")).toBe(NO_CHANGE_MESSAGE);
    expect(NO_CHANGE_MESSAGE).toBe("Chưa có thay đổi nào để lưu.");
    expect(catalogFailureMessage("UPLOAD_PHOTO", "UPLOAD_BAD")).toBe("Tệp không phải WebP/JPEG hoặc nặng hơn 1,5 MB");
    expect(catalogFailureMessage("UPLOAD_PHOTO", "UPLOAD_BAD", "Đen")).toBe(
      "Không tải được ảnh Đen: tệp không phải WebP/JPEG hoặc nặng hơn 1,5 MB",
    );
    expect(catalogFailureMessage("UPLOAD_PHOTO", "UNAVAILABLE", "Đen")).toBe(
      "Không tải được ảnh Đen. Thử lại sau ít phút.",
    );
    expect(catalogFailureMessage("ADD_PRODUCT", "UNAVAILABLE")).toBe("Chưa lưu được. Thử lại sau ít phút.");
    expect(overlapMessage(6)).toBe("Lịch chồng lên Số 06");
  });
});

describe("the window a new issue is offered", () => {
  // The fixture's last issue, 06, closes at 20:00 on 16/10.
  it("opens at the shop's hour the day after the last issue closes, and runs fourteen days", () => {
    const at = new Date("2026-09-20T18:50:00+07:00");
    expect(DROP_LENGTH_DAYS).toBe(14);
    expect(proposedWindow(catalog.drops, at)).toEqual({
      opensAt: "2026-10-17T20:00:00+07:00",
      closesAt: "2026-10-31T20:00:00+07:00",
    });
    expect(overlappingDrop(catalog.drops, proposedWindow(catalog.drops, at))).toBeUndefined();
  });

  it("never proposes a day before tomorrow", () => {
    const late = new Date("2026-12-01T09:00:00+07:00");
    expect(proposedWindow(catalog.drops, late)).toEqual({
      opensAt: "2026-12-02T20:00:00+07:00",
      closesAt: "2026-12-16T20:00:00+07:00",
    });
    expect(proposedWindow([], late).opensAt).toBe("2026-12-02T20:00:00+07:00");
  });

  it("finds the issue a window runs into, and lets one open the instant another closes", () => {
    const six = catalog.dropByNo.get(6)!;
    expect(overlappingDrop(catalog.drops, { opensAt: "2026-10-01T20:00:00+07:00", closesAt: "2026-10-15T20:00:00+07:00" })?.no).toBe(6);
    expect(overlappingDrop(catalog.drops, { opensAt: six.closesAt, closesAt: "2026-10-30T20:00:00+07:00" })).toBeUndefined();
    expect(overlappingDrop(catalog.drops, { opensAt: "2026-09-12T20:00:00+07:00", closesAt: "2026-10-30T20:00:00+07:00" })?.no).toBe(5);
  });
});

describe("a new style's address segment", () => {
  it("is the name in English letters", () => {
    expect(productSlug("SỎI")).toBe("soi");
    expect(productSlug("ĐÁ CUỘI")).toBe("da-cuoi");
    expect(productSlug("  ")).toBe("");
  });

  it("is always a segment the database takes", () => {
    expect(productSlug("Ô")).toBe("mau-o");
    expect(productSlug("!!!")).toBe("mau");
    const long = productSlug("MỘT CÁI TÊN RẤT DÀI ĐỂ THỬ XEM ĐỊA CHỈ CÓ BỊ CẮT KHÔNG");
    expect(long.length).toBeLessThanOrEqual(40);
    expect(isNewSlug(long)).toBe(true);
    for (const name of ["SỎI", "Ô", "!!!", "KHÓI 2", "ÁO-KHOÁC"]) expect(isNewSlug(productSlug(name))).toBe(true);
  });

  it("knows a segment taken by another style's address or by the id it would make", () => {
    expect(slugTaken("khoi", catalog)).toBe(true);
    expect(slugTaken("soi", catalog)).toBe(false);
    // KHÓI's address edited to `khoi-den`: `khoi` would still make its id.
    const moved = buildCatalog({
      ...catalog,
      products: catalog.products.map((p) => (p.id === "p-khoi" ? { ...p, slug: "khoi-den" } : p)),
      drops: [...catalog.drops],
      teasers: [...catalog.teasers],
      promotions: [...catalog.promotions],
    });
    expect(slugTaken("khoi", moved)).toBe(true);
  });

  it("adds -2, -3 until nobody has it", () => {
    expect(uniqueSlug("soi", catalog)).toBe("soi");
    expect(uniqueSlug("khoi", catalog)).toBe("khoi-2");
    const two = buildCatalog({
      products: [...catalog.products, { ...khoi, id: productId("p-khoi-2"), slug: "khoi-2" }],
      drops: [...catalog.drops],
      teasers: [...catalog.teasers],
      promotions: [...catalog.promotions],
    });
    expect(uniqueSlug("khoi", two)).toBe("khoi-3");
    const full = "a".repeat(40);
    const taken = buildCatalog({
      products: [...catalog.products, { ...khoi, id: productId(`p-${full}`), slug: full }],
      drops: [...catalog.drops],
      teasers: [...catalog.teasers],
      promotions: [...catalog.promotions],
    });
    expect(uniqueSlug(full, taken)).toBe(`${"a".repeat(38)}-2`);
  });
});

describe("readPhotoMap and readColorOrder", () => {
  const colors = ["black", "cream"] as const;

  it("reads a borrowed frame or an upload's key per colour, leaving out an empty one", () => {
    expect(readPhotoMap({ black: "khoi", cream: UP }, colors, catalog)).toEqual({
      ok: true,
      value: { black: "khoi", cream: UP },
    });
    expect(readPhotoMap({ black: " ", cream: "reu" }, colors, catalog)).toEqual({ ok: true, value: { cream: "reu" } });
    expect(readPhotoMap(undefined, colors, catalog)).toEqual({ ok: true, value: {} });
  });

  it("refuses a key that is not a photo, naming the colour, and a colour the style does not have", () => {
    expect(readPhotoMap({ cream: "khong-co" }, colors, catalog)).toEqual({
      ok: false,
      error: "Ảnh Kem không còn trên kho, chọn lại",
    });
    expect(readPhotoMap({ cream: "up/zz.webp" }, colors, catalog).ok).toBe(false);
    expect(readPhotoMap({ moss: "khoi" }, colors, catalog).ok).toBe(false);
    expect(readPhotoMap({ black: 7 }, colors, catalog).ok).toBe(false);
    expect(readPhotoMap("khoi", colors, catalog).ok).toBe(false);
  });

  it("takes a new band order of exactly the colours the style has", () => {
    expect(readColorOrder(["cream", "black"], colors)).toEqual({ ok: true, value: ["cream", "black"] });
    expect(readColorOrder(["black", "cream"], colors).ok).toBe(true);
    for (const bad of [["black"], ["black", "black"], ["black", "cream", "moss"], ["black", "moss"], "black", null]) {
      expect(readColorOrder(bad, colors).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(sameOrder(["black", "cream"], colors)).toBe(true);
    expect(sameOrder(["cream", "black"], colors)).toBe(false);
  });
});

describe("readNewProduct — the new-style form, as the database takes it", () => {
  /** SỎI for issue 06: three colours in band order, two borrowed photos and an upload. */
  const draft = (over: Record<string, unknown> = {}) => ({
    name: "sỏi",
    kind: "Áo khoác dù",
    fit: "OVERSIZE",
    slug: "",
    priceVnd: 420_000,
    material: "Dù hai lớp",
    dropNo: 6,
    colors: ["black", "cream", "moss"],
    photos: { black: UP, cream: "cat", moss: "tro" },
    cells: {
      black: { S: 3, M: 4, L: 4, XL: 1 },
      cream: { S: 2, M: 4, L: 4, XL: 2 },
      moss: { S: 3, M: 4, L: 4, XL: 1 },
    },
    ...over,
  });

  it("builds the document: capitals, the kind's family, the name's segment, the cut in band order", () => {
    const read = readNewProduct(draft(), catalog);
    expect(read).toEqual({
      ok: true,
      value: {
        name: "SỎI",
        kind: "Áo khoác dù",
        family: "JACKET",
        fit: "OVERSIZE",
        slug: "soi",
        priceVnd: 420_000,
        material: "Dù hai lớp",
        dropNo: 6,
        colors: [
          { color: "black", photoKey: UP },
          { color: "cream", photoKey: "cat" },
          { color: "moss", photoKey: "tro" },
        ],
        cells: {
          black: { S: 3, M: 4, L: 4, XL: 1 },
          cream: { S: 2, M: 4, L: 4, XL: 2 },
          moss: { S: 3, M: 4, L: 4, XL: 1 },
        },
      },
    });
    expect(read.ok && cutTotal(read.value.cells)).toBe(36);
  });

  it("makes the segment unique when the name's is taken, and keeps a typed one that is free", () => {
    const khoi2 = readNewProduct(draft({ name: "KHÓI" }), catalog);
    expect(khoi2.ok && khoi2.value.slug).toBe("khoi-2");
    const typed = readNewProduct(draft({ slug: "soi-du" }), catalog);
    expect(typed.ok && typed.value.slug).toBe("soi-du");
  });

  it("refuses a typed segment another style has, or one that is not a segment", () => {
    expect(readNewProduct(draft({ slug: "khoi" }), catalog)).toEqual({ ok: false, error: SLUG_TAKEN_MESSAGE });
    expect(readNewProduct(draft({ slug: "Sỏi" }), catalog).ok).toBe(false);
    expect(readNewProduct(draft({ slug: "-soi" }), catalog).ok).toBe(false);
    expect(readNewProduct(draft({ slug: "s" }), catalog).ok).toBe(false);
    expect(readNewProduct(draft({ slug: "s".repeat(41) }), catalog).ok).toBe(false);
  });

  it("wants a name, a kind the catalogue files, a fit, an issue, a price and a material", () => {
    const error = (over: Record<string, unknown>) => {
      const read = readNewProduct(draft(over), catalog);
      return read.ok ? null : read.error;
    };
    expect(error({ name: " " })).toBe("Nhập tên mẫu.");
    expect(error({ name: "X".repeat(41) })).toBe("Nhập tên mẫu.");
    expect(error({ kind: "" })).toBe("Chọn loại.");
    expect(error({ kind: "Áo len" })).toBe("Loại chưa có trong mục lục");
    expect(error({ fit: "SKINNY" })).toBe("Chọn form.");
    expect(error({ fit: undefined })).toBe("Chọn form.");
    expect(error({ dropNo: 9 })).toBe("Chọn một số.");
    expect(error({ dropNo: "6" })).toBe("Chọn một số.");
    for (const priceVnd of [0, 999, 100_000_000, 420_000.5, "420000"]) {
      expect(error({ priceVnd }), String(priceVnd)).toBe("Nhập giá bán từ 1.000₫ đến 99.999.999₫.");
    }
    expect(error({ priceVnd: 1_000 })).toBeNull();
    expect(error({ priceVnd: 99_999_999 })).toBeNull();
    expect(error({ material: "" })).toBe("Nhập chất liệu.");
    expect(readNewProduct("SỎI", catalog).ok).toBe(false);
  });

  it("wants at least one colour, each once, each a colour of the palette", () => {
    const error = (over: Record<string, unknown>) => {
      const read = readNewProduct(draft(over), catalog);
      return read.ok ? null : read.error;
    };
    expect(error({ colors: [] })).toBe("Chọn ít nhất một màu");
    expect(error({ colors: undefined })).toBe("Chọn ít nhất một màu");
    expect(error({ colors: ["black", "black"] })).toBe("Thông tin mẫu chưa hợp lệ — kiểm lại các ô.");
    expect(error({ colors: ["black", "pink"] })).toBe("Thông tin mẫu chưa hợp lệ — kiểm lại các ô.");
    expect(error({ colors: "black" })).toBe("Thông tin mẫu chưa hợp lệ — kiểm lại các ô.");
  });

  it("wants a cut of 0–999 a cell and at least one piece in every colour", () => {
    const error = (cells: unknown) => {
      const read = readNewProduct(draft({ cells }), catalog);
      return read.ok ? null : read.error;
    };
    const full = draft().cells;
    expect(error({ ...full, cream: { S: 0, M: 0, L: 0, XL: 0 } })).toBe("Điền số cắt cho Kem");
    expect(error({ black: full.black, cream: full.cream })).toBe("Điền số cắt cho Rêu");
    expect(error({ ...full, black: { ...full.black, M: 1000 } })).toBe("Số cắt mỗi ô từ 0 đến 999.");
    expect(error({ ...full, black: { ...full.black, M: -1 } })).toBe("Số cắt mỗi ô từ 0 đến 999.");
    expect(error({ ...full, black: { ...full.black, M: 1.5 } })).toBe("Số cắt mỗi ô từ 0 đến 999.");
    expect(error({ ...full, black: "12" })).toBe("Thông tin mẫu chưa hợp lệ — kiểm lại các ô.");
    expect(error("36")).toBe("Thông tin mẫu chưa hợp lệ — kiểm lại các ô.");
  });

  it("spells out all four sizes and leaves out a colour the form dropped", () => {
    const read = readNewProduct(
      draft({
        colors: ["black"],
        photos: { black: "khoi" },
        cells: { black: { M: 2 }, cream: { S: 9, M: 9, L: 9, XL: 9 } },
      }),
      catalog,
    );
    expect(read.ok && read.value.cells).toEqual({ black: { S: 0, M: 2, L: 0, XL: 0 } });
  });

  it("wants a photo for every colour — a borrowed frame or an upload", () => {
    const error = (photos: unknown) => {
      const read = readNewProduct(draft({ photos }), catalog);
      return read.ok ? null : read.error;
    };
    expect(error({ black: UP, cream: "cat" })).toBe("Chọn ảnh cho Rêu");
    expect(error({ black: UP, cream: "cat", moss: "" })).toBe("Chọn ảnh cho Rêu");
    expect(error(undefined)).toBe("Chọn ảnh cho Đen");
    expect(error({ black: UP, cream: "cat", moss: "khong-co" })).toBe("Ảnh Rêu không còn trên kho, chọn lại");
    expect(error({ black: UP, cream: "cat", moss: "tro", navy: "khoi" })).toBe(
      "Thông tin mẫu chưa hợp lệ — kiểm lại các ô.",
    );
  });

  it("files a kind where the catalogue files it, and nowhere for a kind nobody wears", () => {
    expect(familyOfKind(catalog, "Áo khoác dù")).toBe("JACKET");
    expect(familyOfKind(catalog, "Áo len")).toBeUndefined();
  });
});
