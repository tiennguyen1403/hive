import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { FIXED_CHOICE } from "./admin-options";
import { catalogFailureMessage } from "./catalog-admin";
import { styleName } from "./lexicon";
import { PHOTO_KEYS } from "./photos";
import {
  MAX_PICK_BYTES,
  droppedColorMessage,
  fileSizeLabel,
  gridTotal,
  loanPhotos,
  newStyleBlocker,
  panelMeta,
  photoTally,
  pickProblem,
  rowTotal,
  savedPhotoCaption,
  staleUploads,
  storedPhotoKind,
  type NewStyleState,
} from "./product-form";

const HEX = "0123456789abcdef0123456789abcdef";

/** SỎI as the acceptance run fills it in: three colours, 36 pieces, every photo chosen. */
const READY: NewStyleState = {
  name: "sỏi",
  kind: "Áo thun",
  fit: "OVERSIZE",
  dropNo: "6",
  priceVnd: 420_000,
  material: "Cotton 250gsm",
  colors: ["black", "cream", "moss"],
  cells: {
    black: { S: 4, M: 5, L: 3, XL: 1 },
    cream: { S: 3, M: 4, L: 3, XL: 1 },
    moss: { S: 3, M: 4, L: 3, XL: 2 },
  },
  photos: { black: "file", cream: "loan", moss: "loan" },
};

describe("rowTotal and gridTotal", () => {
  it("add up a colour's row and the grid over the colours chosen", () => {
    expect(rowTotal(READY.cells, "black")).toBe(13);
    expect(gridTotal(READY.cells, READY.colors)).toBe(36);
    expect(gridTotal(READY.cells, ["black"])).toBe(13);
    expect(rowTotal({}, "navy")).toBe(0);
  });
});

describe("newStyleBlocker", () => {
  it("lets a complete style through", () => {
    expect(newStyleBlocker(READY)).toBeNull();
  });

  it("names the first gap in the form's reading order", () => {
    expect(newStyleBlocker({ ...READY, name: " " })).toBe("Nhập tên mẫu");
    expect(newStyleBlocker({ ...READY, name: "", priceVnd: 0 })).toBe("Nhập tên mẫu");
    expect(newStyleBlocker({ ...READY, kind: "" })).toBe("Chọn loại");
    expect(newStyleBlocker({ ...READY, fit: null })).toBe("Chọn form");
    expect(newStyleBlocker({ ...READY, dropNo: "" })).toBe("Chọn số");
    expect(newStyleBlocker({ ...READY, priceVnd: 0 })).toBe("Nhập giá bán");
    expect(newStyleBlocker({ ...READY, material: "" })).toBe("Nhập chất liệu");
    expect(newStyleBlocker({ ...READY, colors: [] })).toBe("Chọn màu");
  });

  it("keeps the brief's order after the colours: the cut, then the photos", () => {
    expect(newStyleBlocker({ ...READY, cells: {}, photos: {} })).toBe("Điền số cắt cho Đen");
    expect(
      newStyleBlocker({ ...READY, cells: { ...READY.cells, cream: { S: 0 } }, photos: {} }),
    ).toBe("Điền số cắt cho Kem");
    expect(newStyleBlocker({ ...READY, photos: { black: "file", cream: "loan" } })).toBe(
      "Chọn ảnh cho Rêu",
    );
  });

  it("takes 'Cố định' for the issue, and asks for stock rather than a cut (v3 slice 12)", () => {
    const fixed = { ...READY, dropNo: FIXED_CHOICE };
    expect(newStyleBlocker(fixed)).toBeNull();
    // A fixed style is never cut: its grid is "Tồn kho", so is the ask.
    expect(newStyleBlocker({ ...fixed, cells: {}, photos: {} })).toBe("Điền tồn kho cho Đen");
    expect(newStyleBlocker({ ...fixed, photos: { black: "file", cream: "loan" } })).toBe("Chọn ảnh cho Rêu");
  });

  it("holds the price to what the action takes", () => {
    expect(newStyleBlocker({ ...READY, priceVnd: 999 })).toBe("Giá tối thiểu 1.000₫");
    expect(newStyleBlocker({ ...READY, priceVnd: 100_000_000 })).toBe("Giá tối đa 99.999.999₫");
    expect(newStyleBlocker({ ...READY, priceVnd: 1_000 })).toBeNull();
  });
});

describe("a photo already on the style (v3 slice 14)", () => {
  it("is a real photo when it was uploaded or ships with the app, a stand-in otherwise", () => {
    expect(storedPhotoKind(`up/${HEX}.webp`)).toBe("saved");
    expect(storedPhotoKind("shot-khoi-black")).toBe("saved");
    expect(storedPhotoKind("reu")).toBe("loan");
    // A flat is a drawing, not a photograph of the style: it stays where it was.
    expect(storedPhotoKind("flat-tee-white")).toBe("loan");
    // A shot key with no file is not a photograph either.
    expect(storedPhotoKind("shot-khoi-moss")).toBe("loan");
  });

  it("is captioned as a real photo when it ships with the app, since nobody uploaded it", () => {
    expect(savedPhotoCaption("shot-khoi-cream")).toBe("Ảnh thật");
    expect(savedPhotoCaption(`up/${HEX}.jpg`)).toBe("Ảnh đã tải lên");
  });

  it("leaves KHÓI's two colours with nothing to ask for: 2 màu · đủ ảnh", () => {
    const khoi = FIXTURE_CATALOG.products.find((p) => p.slug === "s05-khoi")!;
    const kinds = Object.fromEntries(khoi.colors.map((c, i) => [c, storedPhotoKind(khoi.photoKeys[i]!)]));
    expect(panelMeta(khoi.colors, photoTally(khoi.colors, kinds))).toBe("2 màu · đủ ảnh");
  });
});

describe("photoTally and panelMeta", () => {
  it("says what the photos lack, most urgent first", () => {
    const three = ["black", "cream", "moss"] as const;
    const two = ["black", "cream"] as const;
    expect(panelMeta([], photoTally([], {}))).toBe("chưa chọn màu");
    expect(panelMeta(three, photoTally(three, { black: "file", cream: "loan" }))).toBe(
      "3 màu · thiếu 1 ảnh",
    );
    expect(panelMeta(two, photoTally(two, { black: "loan", cream: "loan" }))).toBe(
      "2 màu · 2 ảnh mượn tạm",
    );
    expect(panelMeta(three, photoTally(three, { black: "file", cream: "saved", moss: "file" }))).toBe(
      "3 màu · đủ ảnh",
    );
  });

  it("counts files, loans and gaps separately", () => {
    const t = photoTally(["black", "cream", "moss", "navy"], {
      black: "file",
      cream: "loan",
      moss: "saved",
    });
    expect(t).toEqual({ missing: ["navy"], loans: ["cream"], files: ["black"] });
  });
});

describe("pickProblem", () => {
  it("takes JPG, PNG and WebP up to 10 MB", () => {
    expect(pickProblem({ type: "image/png", size: 3_000_000 })).toBeNull();
    expect(pickProblem({ type: "image/jpeg", size: MAX_PICK_BYTES })).toBeNull();
    expect(pickProblem({ type: "image/webp", size: 1 })).toBeNull();
  });

  it("refuses anything else in the mock's words", () => {
    expect(pickProblem({ type: "image/gif", size: 10 })).toBe("Chỉ nhận JPG, PNG hoặc WebP");
    expect(pickProblem({ type: "application/pdf", size: 10 })).toBe("Chỉ nhận JPG, PNG hoặc WebP");
    expect(pickProblem({ type: "image/png", size: MAX_PICK_BYTES + 1 })).toBe(
      "Tệp quá 10 MB · chọn ảnh nhỏ hơn",
    );
  });
});

describe("fileSizeLabel", () => {
  it("prints megabytes with a decimal comma and small files in kilobytes", () => {
    expect(fileSizeLabel(2_516_582)).toBe("2,4 MB");
    expect(fileSizeLabel(1_048_576)).toBe("1,0 MB");
    expect(fileSizeLabel(48_000)).toBe("47 KB");
  });
});

describe("droppedColorMessage", () => {
  it("says how many typed pieces went with the colour, and nothing for an empty row", () => {
    expect(droppedColorMessage("moss", 12)).toBe("Đã bỏ Rêu · 12 chiếc đã điền xoá theo");
    expect(droppedColorMessage("moss", 0)).toBeNull();
  });
});

describe("loanPhotos", () => {
  const loans = loanPhotos(FIXTURE_CATALOG);

  it("offers the borrowed frames the catalogue still wears, in the order lib/photos.ts lists them", () => {
    // Thirteen since v3 slice 14: the five frames only Số 05 wore (`khoi`,
    // `muoi`, `cat`, `gio`, `da`) went with Số 05's own photographs, and a
    // frame nothing wears is one the database no longer takes either.
    expect(loans.map((l) => l.key)).toEqual(
      PHOTO_KEYS.filter((k) => !["hero", "khoi", "muoi", "cat", "gio", "da"].includes(k)),
    );
    expect(loans).toHaveLength(13);
  });

  it("never offers a photograph that ships with the app, or a flat", () => {
    expect(loans.some((l) => l.key.startsWith("shot-") || l.key.startsWith("flat-"))).toBe(false);
  });

  it("names each after the style it is the photo of, as the back office names it (v3 slice 12)", () => {
    const name = (key: string) => loans.find((l) => l.key === key)?.name;
    const shown = (slug: string) => {
      const p = FIXTURE_CATALOG.products.find((x) => x.slug === slug)!;
      return styleName(p.name, p.dropNo);
    };
    expect(name("reu")).toBe(shown("s04-reu"));
    expect(name("reu")).toBe(styleName("RÊU", 4));
    expect(name("tro")).toBe(shown("s04-tro"));
    expect(name("bui")).toBe(shown("s03-bao"));
    // Worn by no style first: the first style wearing it at all, with the
    // colour that wears it (v3 slice 14), then a teaser as it is.
    expect(name("than")).toBe(`${shown("s04-tro")}, màu Đen`);
    expect(name("nguoi")).toBe(styleName("NGÓI", 6));
    expect(loans.every((l) => l.name !== "")).toBe(true);
  });

  it("gives no two frames one name, so no two radios in the grid read alike", () => {
    const names = loans.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("never offers another style's uploaded photo", () => {
    const i = FIXTURE_CATALOG.products.findIndex((p) => p.slug === "s04-mua");
    const products = [...FIXTURE_CATALOG.products];
    products[i] = { ...products[i]!, photoKeys: [`up/${HEX}.webp`] };
    const keys = loanPhotos({ ...FIXTURE_CATALOG, products }).map((l) => l.key);
    expect(keys.some((k) => k.startsWith("up/"))).toBe(false);
    // MƯA wore the `mua` frame and nothing else does, so it is no longer offered.
    expect(keys).not.toContain("mua");
  });
});

describe("staleUploads", () => {
  const colors = ["black", "cream", "moss"] as const;

  it("reads the colour a PHOTO_UNKNOWN refusal names", () => {
    const m = catalogFailureMessage("ADD_PRODUCT", "PHOTO_UNKNOWN", "Kem");
    expect(m).toBe("Ảnh Kem không còn trên kho, chọn lại");
    expect(staleUploads(m, colors)).toEqual(["cream"]);
  });

  it("finds it inside a partial-save answer as well", () => {
    const m = "Đã lưu thông tin KHÓI; ảnh Đen CHƯA lưu: Ảnh Đen không còn trên kho, chọn lại";
    expect(staleUploads(m, colors)).toEqual(["black"]);
  });

  it("reads a refusal naming no colour as all of them, and anything else as none", () => {
    expect(staleUploads(catalogFailureMessage("ADD_PRODUCT", "PHOTO_UNKNOWN"), colors)).toEqual([
      ...colors,
    ]);
    expect(staleUploads("Mã địa chỉ đã có mẫu khác dùng", colors)).toEqual([]);
    expect(staleUploads(undefined, colors)).toEqual([]);
  });
});
