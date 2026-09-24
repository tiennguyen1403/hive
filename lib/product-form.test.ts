import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { catalogFailureMessage } from "./catalog-admin";
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
  staleUploads,
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

  it("holds the price to what the action takes", () => {
    expect(newStyleBlocker({ ...READY, priceVnd: 999 })).toBe("Giá tối thiểu 1.000₫");
    expect(newStyleBlocker({ ...READY, priceVnd: 100_000_000 })).toBe("Giá tối đa 99.999.999₫");
    expect(newStyleBlocker({ ...READY, priceVnd: 1_000 })).toBeNull();
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

  it("offers the eighteen borrowed frames, in the order lib/photos.ts lists them", () => {
    expect(loans).toHaveLength(18);
    expect(loans.map((l) => l.key)).toEqual(PHOTO_KEYS.filter((k) => k !== "hero"));
  });

  it("names each after the style it is the photo of", () => {
    const name = (key: string) => loans.find((l) => l.key === key)?.name;
    expect(name("khoi")).toBe("KHÓI");
    expect(name("cat")).toBe("CÁT");
    expect(name("reu")).toBe("RÊU");
    expect(name("tro")).toBe("TRO");
    expect(loans.every((l) => l.name !== "")).toBe(true);
  });

  it("never offers another style's uploaded photo", () => {
    const [first, ...rest] = FIXTURE_CATALOG.products;
    const catalog = {
      ...FIXTURE_CATALOG,
      products: [{ ...first!, photoKeys: [`up/${HEX}.webp`, ...first!.photoKeys.slice(1)] }, ...rest],
    };
    const keys = loanPhotos(catalog).map((l) => l.key);
    expect(keys.some((k) => k.startsWith("up/"))).toBe(false);
    // KHÓI's black wore the `khoi` frame and nothing else does, so it is no longer offered.
    expect(keys).not.toContain("khoi");
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
