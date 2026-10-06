import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { productId, type Product } from "@/data/types";
import { cutRefusal, stepCell, typeCell } from "./adjust-cell";
import { dropOptions, kindOptions } from "./admin-options";
import { lowNote, stylesLine } from "./admin-products";
import { promoKindLabel, promoValueLabel } from "./admin-rows";
import { isVietnamese } from "./admin-text";
import {
  RESTOCK_STALE_TEXT,
  STALE_STOCK_TEXT,
  calendarRefusal,
  catalogFailureMessage,
  checkAdjustment,
  colorLabelOf,
  dropSubject,
  orderMessage,
  overlapMessage,
  productPatch,
  readColorOrder,
  readNewProduct,
  readPromoDraft,
  readTeaser,
  readWindow,
} from "./catalog-admin";
import { styleNameHas } from "./catalog-query";
import { deltaLabel, draftOf, saveBlocker, withCell } from "./inventory-adjust";
import { issueCsvName, issueCsvRows } from "./issue-csv";
import { moneyInput } from "./money";
import { styleName } from "./lexicon";
import { dims } from "./photo-crop";
import { PhotoEncodeError } from "./photo-encode";
import {
  droppedColorMessage,
  fileSizeLabel,
  loanPhotos,
  newStyleBlocker,
  panelMeta,
  photoTally,
  pickProblem,
  savedPhotoCaption,
  staleUploads,
  type NewStyleState,
} from "./product-form";
import { PRODUCTS_CSV_HEADER, productsCsvName, productsCsvRows } from "./products-csv";
import { restockButton } from "./restock";
import { kindOptions as teaserKindOptions, teaserBlocker } from "./teaser-form";

/**
 * Round v6 slice E5: the catalogue's side of the back office in English — the
 * styles table and its two stock drawers, the style form, the issues and their
 * three dialogs, the codes and their drawer, the refusals of their Server
 * Actions and the two CSV files. Every function keeps its Vietnamese as the
 * default (the old tests beside each file pin it, unchanged); these pin the
 * English, and that the words stored stay Vietnamese.
 */

const hoodie = FIXTURE_CATALOG.byId.get(productId("p-hoodie-tron"))!;
const khoi = FIXTURE_CATALOG.products.find((p) => p.dropNo === 5 && p.name === "KHÓI")!;
const at20 = (day: string) => `2026-${day}T20:00:00+07:00`;

describe("the schedule refusals, in English (B14, B14b)", () => {
  it("names the issue in the way, and the one on the wrong side", () => {
    expect(overlapMessage(6, "en")).toBe("Overlaps Drop 06");
    expect(orderMessage(7, "PREVIOUS", 6, "en")).toBe("Drop 07 must open after Drop 06 closes");
    expect(orderMessage(6, "NEXT", 7, "en")).toBe("Drop 06 must close before Drop 07 opens");
  });

  it("reads the database's refusal the same way, and the Vietnamese is unchanged", () => {
    expect(calendarRefusal(7, "NOT_ALLOWED", "6", "PREVIOUS", "en")).toBe("Drop 07 must open after Drop 06 closes");
    expect(calendarRefusal(6, "NOT_ALLOWED", "7", "NEXT", "en")).toBe("Drop 06 must close before Drop 07 opens");
    expect(calendarRefusal(6, "NOT_ALLOWED", "5", "OVERLAP", "en")).toBe("Overlaps Drop 05");
    expect(calendarRefusal(6, "NOT_ALLOWED", "5", "", "en")).toBe("Overlaps Drop 05");
    expect(calendarRefusal(6, "NOT_ALLOWED", "", "", "en")).toBeNull();
    expect(overlapMessage(6)).toBe("Lịch chồng lên Số 06");
    expect(orderMessage(7, "PREVIOUS", 6)).toBe("Số 07 phải mở sau khi Số 06 đóng");
  });

  it("checks a window in English", () => {
    expect(readWindow("x", at20("10-02"), "en")).toEqual({
      ok: false,
      error: "Enter the opening and closing days as dd/mm/yyyy.",
    });
    expect(readWindow(at20("10-16"), at20("10-02"), "en")).toEqual({
      ok: false,
      error: "The closing day must be after the opening day.",
    });
  });
});

describe("a refusal of the catalogue, in English", () => {
  it("says every failure in English, with an English subject", () => {
    const en = (move: Parameters<typeof catalogFailureMessage>[0], failure: Parameters<typeof catalogFailureMessage>[1], subject = "") =>
      catalogFailureMessage(move, failure, subject, "en");
    expect(en("ADJUST_STOCK", "NOT_ADMIN")).toBe("Your admin session has ended. Sign in again with an admin account.");
    expect(en("ADD_DROP", "UNAVAILABLE")).toBe("Couldn't save. Try again in a few minutes.");
    expect(en("UPLOAD_PHOTO", "UNAVAILABLE", "Black")).toBe(
      "Couldn't upload the photo for Black. Try again in a few minutes.",
    );
    expect(en("ADJUST_STOCK", "STALE")).toBe(STALE_STOCK_TEXT.en);
    expect(en("RESTOCK", "STALE")).toBe(RESTOCK_STALE_TEXT.en);
    expect(en("ADD_PRODUCT", "DROP_CLOSED", dropSubject(4, "en"))).toBe(
      "Drop 04 has closed, so no styles can be added to it",
    );
    expect(en("ADD_PRODUCT", "COLOR_EMPTY", "Black")).toBe("Enter the cut for Black");
    expect(en("ADD_PRODUCT", "PHOTO_UNKNOWN", "Black")).toBe("The photo for Black is no longer stored, choose it again");
    expect(en("SCHEDULE_DROP", "NOT_FOUND", dropSubject(9, "en"))).toBe("Drop 09 not found.");
    expect(en("PAUSE_PROMO", "NOT_ALLOWED", "DOT05")).toBe("DOT05 changed status elsewhere. Reload the page to check.");
    expect(en("UPDATE_PRODUCT", "NOT_ALLOWED", "khoi")).toBe('The URL slug "khoi" is already used by another style.');
    expect(en("ADD_PRODUCT", "NOT_ALLOWED")).toBe("Another style already uses this URL slug");
    expect(en("SET_PHOTO", "BAD_INPUT")).toBe("No changes to save.");
    expect(en("RESTOCK", "BAD_INPUT")).toBe("Restocking is for Basics only, adding 1 to 999 pieces per cell.");
    expect(colorLabelOf("black", "en")).toBe("Black");
    expect(colorLabelOf("black")).toBe("Đen");
  });

  it("leaves no Vietnamese in any English failure", () => {
    const moves = [
      "ADJUST_STOCK", "RESTOCK", "ADD_DROP", "SCHEDULE_DROP", "CLOSE_DROP", "ADD_TEASER", "ADD_PROMO", "EDIT_PROMO",
      "PAUSE_PROMO", "RAISE_LIMIT", "END_PROMO", "UPDATE_PRODUCT", "ADD_PRODUCT", "SET_PHOTO", "REORDER_COLORS",
      "UPLOAD_PHOTO",
    ] as const;
    const failures = [
      "NOT_ADMIN", "NOT_FOUND", "NOT_ALLOWED", "BAD_INPUT", "STALE", "DROP_CLOSED", "NO_COLORS", "COLOR_EMPTY",
      "PHOTO_MISSING", "PHOTO_UNKNOWN", "UPLOAD_BAD", "UNAVAILABLE",
    ] as const;
    for (const move of moves) {
      for (const failure of failures) {
        for (const subject of ["", "Drop 05"]) {
          const said = catalogFailureMessage(move, failure, subject, "en");
          expect(isVietnamese(said), `${move} ${failure}: ${said}`).toBe(false);
          expect(said).not.toMatch(/—/);
        }
      }
    }
  });
});

describe("the stock drawers, in English", () => {
  const color = hoodie.colors[0]!;
  const before = draftOf(hoodie);

  it("asks for what is missing, and keeps the reason the database stores", () => {
    expect(saveBlocker(hoodie, before, null, "en")).toBe("No changes yet");
    const moved = withCell(before, color, "S", (before[color]?.S ?? 0) + 1);
    expect(saveBlocker(hoodie, moved, null, "en")).toBe("Choose a reason");
    expect(saveBlocker(hoodie, moved, "Hàng trả về", "en")).toBeNull();
    // The stored reason in Vietnamese, printed in English under the cell.
    expect(deltaLabel({ color, size: "S", before: 5, after: 6 }, "Hàng trả về", "DH-2419", "en")).toBe(
      "+1 · returned DH-2419",
    );
    expect(deltaLabel({ color, size: "S", before: 5, after: 6 }, "Hàng trả về", "DH-2419")).toBe(
      "+1 · hàng trả về DH-2419",
    );
  });

  it("refuses a raise past the cut in English", () => {
    const full = draftOf(khoi);
    expect(cutRefusal(35, "en")).toBe("Can't go past the cut: 35");
    const stepped = stepCell(khoi, withCell(full, khoi.colors[0]!, "S", 999), khoi.colors[0]!, "M", 1, "en");
    expect(stepped.refused).toBe(`Can't go past the cut: ${khoi.cutUnits}`);
    const typed = typeCell(khoi, full, khoi.colors[0]!, "S", "9999", "en");
    expect(typed.refused).toBe(`Can't go past the cut: ${khoi.cutUnits}`);
    expect(saveBlocker(khoi, withCell(full, khoi.colors[0]!, "S", 999), "Khác", "en")).toBe(
      `Keep within the ${khoi.cutUnits} cut`,
    );
  });

  it("checks an adjustment in English, the reason still in Vietnamese", () => {
    const cell = { color, size: "S" as const, before: 5, after: 6 };
    expect(checkAdjustment(hoodie, [cell], "", "", "", "en")).toBe("Choose a reason.");
    expect(checkAdjustment(hoodie, [cell], "Hàng trả về", "x".repeat(5000), "", "en")).toMatch(/^Reference: \d+ characters at most\.$/);
    expect(checkAdjustment(hoodie, [cell], "Hàng trả về", "", "", "en")).toBeNull();
    expect(checkAdjustment(hoodie, [{ ...cell, color: "olive" as never }], "Khác", "", "", "en")).toBe(
      "PLAIN HOODIE doesn't come in this colour.",
    );
    expect(checkAdjustment(khoi, [{ ...cell, color: khoi.colors[0]!, after: 999 }], "Khác", "", "", "en")).toBe(
      `Keep within the ${khoi.cutUnits} cut`,
    );
  });

  it("counts a restock in English", () => {
    expect(restockButton(0, "en")).toEqual({ ready: false, label: "Enter how many to add" });
    expect(restockButton(1, "en")).toEqual({ ready: true, label: "Restock 1 piece" });
    expect(restockButton(14, "en")).toEqual({ ready: true, label: "Restock 14 pieces" });
    expect(restockButton(14)).toEqual({ ready: true, label: "Nhập thêm 14 chiếc" });
  });
});

describe("the styles table, in English", () => {
  it("says the low sizes and the line under the heading in English", () => {
    const low: Product = {
      ...hoodie,
      stock: { grey: { S: 5, M: 0, L: 1, XL: 2 }, black: { S: 4, M: 0, L: 6, XL: 3 }, cream: { S: 3, M: 0, L: 2, XL: 2 } },
    } as Product;
    expect(lowNote(low, "en")).toBe("M out · L 1 left · XL 2 left");
    expect(lowNote(low)).toBe("M hết · L còn 1 · XL còn 2");
    expect(stylesLine(FIXTURE_CATALOG, new Date(at20("09-21")), "en")).toMatch(/^\d+ styles · \d+ live$/);
  });

  it("finds a style by the name an English page prints, and by its stored one", () => {
    expect(styleNameHas(hoodie, "plain", "en")).toBe(true);
    expect(styleNameHas(hoodie, "plain")).toBe(false);
    expect(styleNameHas(hoodie, "tron", "en")).toBe(true);
    expect(styleNameHas(khoi, "d05 khoi", "en")).toBe(true);
    expect(styleNameHas(khoi, "s05 khoi", "en")).toBe(true);
  });

  it("writes the CSV in English: the header, the words through productText, the stored kind kept for none", () => {
    const rows = productsCsvRows(FIXTURE_CATALOG, [hoodie, khoi], "en");
    expect(rows[0]).toEqual([
      "Style", "Type", "Fit", "Drop", "Price (VND)", "Colours", "Cut", "Sold", "Left", "Sizes sold out",
    ]);
    expect(rows[1]!.slice(0, 6)).toEqual(["PLAIN HOODIE", "Hoodie", "oversized", "", 750000, "Grey · Black · Cream"]);
    // A drop style keeps its name, behind the English code of its drop.
    expect(rows[2]![0]).toBe(styleName("KHÓI", 5, "en"));
    expect(String(rows[2]![0]).startsWith("D05")).toBe(true);
    expect(productsCsvName("en")).toBe("styles.csv");
    expect(productsCsvName()).toBe("mau.csv");
    expect(productsCsvRows(FIXTURE_CATALOG, [hoodie])[0]).toEqual([...PRODUCTS_CSV_HEADER]);
    for (const row of productsCsvRows(FIXTURE_CATALOG, FIXTURE_CATALOG.products, "en").slice(1)) {
      // Only a drop style's name stays Vietnamese (QĐ-40).
      expect(row.slice(1).some((cell) => isVietnamese(String(cell))), String(row)).toBe(false);
    }
  });

  it("writes an issue's CSV in English", () => {
    const rows = issueCsvRows(FIXTURE_CATALOG, 5, FIXTURE_CATALOG.products, "en");
    expect(rows[0]).toEqual([
      "Style", "Type", "Colour", "Size", "Left (size × colour)", "Cut (style)", "Sold (style)", "Style revenue (VND)",
    ]);
    for (const row of rows.slice(1)) expect(row.slice(1).some((cell) => isVietnamese(String(cell)))).toBe(false);
    expect(issueCsvName(5, "en")).toBe("drop-05.csv");
    expect(issueCsvName(5)).toBe("so-05.csv");
  });
});

describe("the style form, in English", () => {
  const empty: NewStyleState = {
    name: "",
    kind: "",
    fit: null,
    dropNo: "",
    priceVnd: 0,
    material: "",
    colors: [],
    cells: {},
    photos: {},
  };

  it("names what is missing, step by step", () => {
    const steps: Array<[Partial<NewStyleState>, string]> = [
      [{}, "Enter the style name"],
      [{ name: "TEST" }, "Choose a type"],
      [{ name: "TEST", kind: "Áo hoodie" }, "Choose a fit"],
      [{ name: "TEST", kind: "Áo hoodie", fit: "REGULAR" }, "Choose a drop"],
      [{ name: "TEST", kind: "Áo hoodie", fit: "REGULAR", dropNo: "6" }, "Enter the price"],
      [{ name: "TEST", kind: "Áo hoodie", fit: "REGULAR", dropNo: "6", priceVnd: 10 }, "Minimum price 1,000₫"],
      [{ name: "TEST", kind: "Áo hoodie", fit: "REGULAR", dropNo: "6", priceVnd: 1e9 }, "Maximum price 99,999,999₫"],
      [{ name: "TEST", kind: "Áo hoodie", fit: "REGULAR", dropNo: "6", priceVnd: 390000 }, "Enter the material"],
      [{ name: "TEST", kind: "Áo hoodie", fit: "REGULAR", dropNo: "6", priceVnd: 390000, material: "x" }, "Choose the colours"],
      [
        { name: "TEST", kind: "Áo hoodie", fit: "REGULAR", dropNo: "6", priceVnd: 390000, material: "x", colors: ["black"] },
        "Enter the cut for Black",
      ],
      [
        { name: "TEST", kind: "Áo hoodie", fit: "REGULAR", dropNo: "fixed", priceVnd: 390000, material: "x", colors: ["black"] },
        "Enter the stock for Black",
      ],
      [
        {
          name: "TEST", kind: "Áo hoodie", fit: "REGULAR", dropNo: "6", priceVnd: 390000, material: "x", colors: ["black"],
          cells: { black: { M: 5 } },
        },
        "Choose a photo for Black",
      ],
    ];
    for (const [patch, said] of steps) expect(newStyleBlocker({ ...empty, ...patch }, "en")).toBe(said);
    expect(newStyleBlocker(empty)).toBe("Nhập tên mẫu");
  });

  it("says the photos and the files in English", () => {
    expect(pickProblem({ type: "text/plain", size: 1 }, "en")).toBe("JPG, PNG or WebP only");
    expect(pickProblem({ type: "image/png", size: 11 * 1_048_576 }, "en")).toBe("File over 10 MB · choose a smaller one");
    expect(fileSizeLabel(1_258_291, "en")).toBe("1.2 MB");
    expect(fileSizeLabel(1_258_291)).toBe("1,2 MB");
    expect(droppedColorMessage("black", 5, "en")).toBe("Black removed · the 5 pieces entered went with it");
    expect(droppedColorMessage("black", 0, "en")).toBeNull();
    expect(panelMeta([], photoTally([], {}), "en")).toBe("no colours yet");
    expect(panelMeta(["black", "white"], photoTally(["black", "white"], { black: "none", white: "loan" }), "en")).toBe(
      "2 colours · 1 photo missing",
    );
    expect(panelMeta(["black"], photoTally(["black"], { black: "loan" }), "en")).toBe("1 colour · 1 borrowed");
    expect(panelMeta(["black"], photoTally(["black"], { black: "saved" }), "en")).toBe("1 colour · every photo in");
    expect(savedPhotoCaption("shot-khoi-black", "en")).toBe("Real photo");
    expect(dims(1860.4, 2325, "en")).toBe("1,860×2,325");
    expect(dims(1860.4, 2325)).toBe("1.860×2.325");
    expect(moneyInput("390000", "en")).toBe("390,000");
    expect(moneyInput("390000")).toBe("390.000");
    expect(new PhotoEncodeError("Không đọc được ảnh này", "Couldn't read this photo").english).toBe(
      "Couldn't read this photo",
    );
  });

  it("names the borrowed photos as the English shop does, and finds a stale upload in English", () => {
    const loans = loanPhotos(FIXTURE_CATALOG, "en");
    expect(loans.length).toBeGreaterThan(0);
    for (const loan of loans) expect(loan.name).not.toMatch(/^S\d\d/);
    expect(loans.some((l) => l.name.startsWith("D0"))).toBe(true);
    const said = catalogFailureMessage("ADD_PRODUCT", "PHOTO_UNKNOWN", "Black", "en");
    expect(staleUploads(said, ["black", "white"], "en")).toEqual(["black"]);
  });

  it("offers the kinds as stored, marked Vietnamese, counted in English", () => {
    const options = kindOptions(FIXTURE_CATALOG, "en");
    const hoodies = options.find((o) => o.value === "Áo hoodie")!;
    expect(hoodies.label).toBe("Áo hoodie");
    expect(hoodies.lang).toBe("vi");
    expect(hoodies.note).toMatch(/^\d+ styles?$/);
    expect(kindOptions(FIXTURE_CATALOG).every((o) => o.lang === undefined)).toBe(true);
    const now = new Date(at20("09-21"));
    expect(dropOptions(FIXTURE_CATALOG, now, {}, "en").map((o) => o.label)).toContain("Drop 05 · live");
    expect(dropOptions(FIXTURE_CATALOG, now, {}, "en").map((o) => o.label)).toContain("Drop 06 · coming soon");
    expect(dropOptions(FIXTURE_CATALOG, now, { withFixed: true }, "en").at(-1)!.label).toBe("Basics");
    expect(dropOptions(FIXTURE_CATALOG, now, { withFixed: true }).at(-1)!.label).toBe("Cố định");
  });

  it("checks an edit in English", () => {
    const form = {
      name: "",
      kind: hoodie.kind,
      dropNo: null,
      slug: hoodie.slug,
      priceVnd: hoodie.priceVnd,
      material: hoodie.material,
      fit: hoodie.fit,
    };
    expect(productPatch(hoodie, form, FIXTURE_CATALOG, "en")).toEqual({ ok: false, error: "Enter the style name." });
    expect(productPatch(hoodie, { ...form, name: "X", slug: "Bad Slug" }, FIXTURE_CATALOG, "en")).toEqual({
      ok: false,
      error: "The URL slug takes only plain lower-case letters, digits and hyphens.",
    });
    expect(readColorOrder(["black"], hoodie.colors, "en")).toEqual({
      ok: false,
      error: "The colour order must hold exactly the style's colours, fixed when it was cut.",
    });
    expect(readNewProduct({ name: "" }, FIXTURE_CATALOG, "en")).toEqual({ ok: false, error: "Enter the style name." });
  });
});

describe("the teasers and the codes, in English", () => {
  it("says the teaser's checks in English, its kinds as stored", () => {
    expect(teaserBlocker("", null, null, "en")).toBe("Enter the style name");
    expect(teaserBlocker("MÂY", null, null, "en")).toBe("Choose a type");
    expect(teaserBlocker("MÂY", "Áo hoodie", null, "en")).toBe("Choose a photo");
    const kinds = teaserKindOptions(FIXTURE_CATALOG, "en");
    expect(kinds.find((k) => k.value === "Áo hoodie")).toEqual({
      value: "Áo hoodie",
      label: "Áo hoodie",
      note: "Hoodies",
      lang: "vi",
    });
    expect(readTeaser({ dropNo: 6, name: "", garment: "", photoKey: "" }, FIXTURE_CATALOG, "en")).toEqual({
      ok: false,
      error: "Enter the style name.",
    });
  });

  it("says a code's kind, value and checks in English", () => {
    const [dot05, chaoban, freeship] = FIXTURE_CATALOG.promotions;
    expect(promoKindLabel("FREE_SHIPPING", "en")).toBe("Free delivery");
    expect(promoValueLabel(dot05!, "en")).toBe("10% · up to 150,000₫");
    expect(promoValueLabel(chaoban!, "en")).toBe("50,000₫");
    expect(promoValueLabel(freeship!, "en")).toBe("Standard delivery fee · 30,000₫");
    expect(promoValueLabel(dot05!)).toBe("10% · tối đa 150.000₫");
    expect(readPromoDraft({ code: "" }, "en")).toEqual({
      ok: false,
      error: "Enter the code. It's what shoppers type in the discount box.",
    });
  });
});
