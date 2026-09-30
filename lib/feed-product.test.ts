import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { productId, type Product } from "@/data/types";
import {
  buyLabel,
  buyState,
  galleryKinds,
  mainStock,
  overIssue,
  pageColor,
  printOf,
  shipRows,
  specRows,
  styleLine,
} from "./feed-product";
import { FEED_TIGHT_DASH } from "./feed-range";

const C = FIXTURE_CATALOG;
const style = (stem: string): Product => {
  const p = C.byId.get(productId(`p-${stem}`));
  if (!p) throw new Error(`no fixture style ${stem}`);
  return p;
};
/** The fixture's calendar: Số 05 sells 11/09 20:00 → 25/09 20:00, Số 06 opens 02/10. */
const OPEN = new Date("2026-09-21T19:02:00+07:00");
const AFTER = new Date("2026-09-28T19:02:00+07:00");

describe("the colour the page opens on", () => {
  it("is the one the address asks for, when the style comes in it", () => {
    expect(pageColor(style("khoi"), "cream")).toBe("cream");
    expect(pageColor(style("khoi"), " cream ")).toBe("cream");
  });

  it("is otherwise the first colour with anything left", () => {
    expect(pageColor(style("khoi"), undefined)).toBe("black");
    expect(pageColor(style("khoi"), "navy")).toBe("black");
    expect(pageColor(style("khoi"), "")).toBe("black");
  });
});

describe("the story frame", () => {
  it("shows an issue style's packshot, then the colour worn", () => {
    expect(galleryKinds(style("khoi"), "black")).toEqual(["pack", "look"]);
    expect(galleryKinds(style("nang"), "moss")).toEqual(["pack", "look"]);
  });

  it("has one frame for a colour with no lookbook: a fixed style's drawing, a borrowed frame", () => {
    expect(galleryKinds(style("ao-thun-tron"), "white")).toEqual(["pack"]);
    expect(galleryKinds(style("reu"), "moss")).toEqual(["pack"]);
  });
});

describe("the buy button", () => {
  it("sells an issue style while its issue is open and it lasts", () => {
    expect(buyState(C, style("khoi"), OPEN)).toEqual({ kind: "open" });
    expect(buyLabel(buyState(C, style("khoi"), OPEN))).toBeNull();
  });

  it("says Đã hết for a sold-out issue style, before saying the issue closed", () => {
    expect(buyLabel(buyState(C, style("muoi"), OPEN))).toBe("Đã hết");
    expect(buyLabel(buyState(C, style("muoi"), AFTER))).toBe("Đã hết");
  });

  it("says the issue has closed once it has", () => {
    expect(buyState(C, style("khoi"), AFTER)).toEqual({ kind: "over", no: 5, closed: true });
    expect(buyLabel(buyState(C, style("khoi"), AFTER))).toBe("Số 05 đã đóng");
  });

  it("sells a fixed style at any hour, and calls an empty shelf tạm hết", () => {
    expect(buyState(C, style("ao-thun-tron"), AFTER)).toEqual({ kind: "open" });
    const empty: Product = {
      ...style("gile-phao"),
      stock: { black: { S: 0, M: 0, L: 0, XL: 0 } },
    };
    expect(buyLabel(buyState(C, empty, OPEN))).toBe("Tạm hết");
  });

  it("says an issue has not opened for a style of one still to come", () => {
    const early: Product = { ...style("khoi"), dropNo: 6 };
    expect(buyLabel(buyState(C, early, OPEN))).toBe("Số 06 chưa mở");
  });
});

describe("a style whose issue is not selling", () => {
  it("is one of a closed issue, sold out or not, and never a live or fixed one", () => {
    expect(overIssue(C, style("khoi"), AFTER)).toEqual({ no: 5, closed: true });
    expect(overIssue(C, style("muoi"), AFTER)).toEqual({ no: 5, closed: true });
    expect(overIssue(C, style("reu"), OPEN)).toEqual({ no: 4, closed: true });
    expect(overIssue(C, style("khoi"), OPEN)).toBeNull();
    expect(overIssue(C, style("muoi"), OPEN)).toBeNull();
    expect(overIssue(C, style("ao-thun-tron"), AFTER)).toBeNull();
  });

  it("says when the issue has not opened yet", () => {
    const early: Product = { ...style("khoi"), dropNo: 6 };
    expect(overIssue(C, early, OPEN)).toEqual({ no: 6, closed: false });
  });
});

describe("the line under the price", () => {
  it("counts what is left against the cut while the issue sells, with the fire at three or fewer", () => {
    expect(mainStock(C, style("khoi"), OPEN)).toEqual({ kind: "left", n: 17, cut: 35, low: false });
    expect(mainStock(C, style("bui"), OPEN)).toEqual({ kind: "left", n: 2, cut: 18, low: true });
  });

  it("counts what sold once the style is gone or its issue has closed", () => {
    expect(mainStock(C, style("muoi"), OPEN)).toEqual({ kind: "sold", sold: 14, cut: 14 });
    expect(mainStock(C, style("khoi"), AFTER)).toEqual({ kind: "sold", sold: 18, cut: 35 });
  });

  it("names the sizes gone in every colour for a fixed style", () => {
    expect(mainStock(C, style("hoodie-tron"), OPEN)).toEqual({ kind: "fixed", gone: ["M"] });
    expect(mainStock(C, style("ao-thun-tron"), OPEN)).toEqual({ kind: "fixed", gone: [] });
  });
});

describe("Thông số", () => {
  it("reads the print's name from the construction lines, as the mock's data names it", () => {
    const want: Record<string, string | null> = {
      khoi: null,
      bui: "Bản đồ mòn",
      nguoi: "Dư nhiệt",
      nang: "Mảng nắng",
      suong: "Lớp sương",
      muoi: "Kết tinh",
      than: "Mạch than",
      cat: "Vân xói",
      gio: "Luồng cắt",
      da: "Mặt cắt",
    };
    for (const [stem, print] of Object.entries(want)) expect(printOf(style(stem)), stem).toBe(print);
    expect(printOf(style("ao-thun-tron"))).toBeNull();
    expect(printOf({ details: ["In “Dấu” ở lưng"] })).toBe("Dấu");
  });

  it("lists the material, the fit, and the print when there is one", () => {
    expect(specRows(style("bui"))).toEqual([
      { label: "Chất liệu", value: "Nỉ bông 380gsm" },
      { label: "Form", value: "Oversize" },
      { label: "Hình in", value: "Bản đồ mòn" },
    ]);
    expect(specRows(style("khoi")).map((r) => r.label)).toEqual(["Chất liệu", "Form"]);
  });
});

describe("Giao hàng và đổi trả", () => {
  it("prints the shop's figures, the return window as the link to Hỏi đáp's return group", () => {
    const rows = shipRows();
    expect(rows.map((r) => r.label)).toEqual([
      `Giao tiêu chuẩn, 2${FEED_TIGHT_DASH}4 ngày`,
      "Giao nhanh nội thành TP.HCM, 24 giờ",
      "Miễn phí giao từ",
      "Phụ phí COD",
      "Đổi trả",
      "Thanh toán",
    ]);
    expect(rows.map((r) => r.value)).toEqual([
      "30.000₫",
      "45.000₫",
      "1.000.000₫",
      "15.000₫",
      "7 ngày",
      "Chuyển khoản, Thẻ, COD",
    ]);
    expect(rows.filter((r) => r.href).map((r) => r.href)).toEqual(["/faq#doi-tra"]);
  });
});

describe("the style's line", () => {
  it("is the issue the shop shows, linked to the shop's grid on it, and its other styles", () => {
    const line = styleLine(C, style("khoi"), OPEN);
    expect(line.label).toBe("Số 05");
    expect(line.href).toBe("/products?line=5");
    expect(line.railTitle).toBe("Cùng Số 05");
    expect(line.others).toHaveLength(9);
    expect(line.others.some((p) => p.id === style("khoi").id)).toBe(false);
    // Still the shop's issue line once Số 05 has closed.
    expect(styleLine(C, style("khoi"), AFTER).href).toBe("/products?line=5");
  });

  it("leads an older issue's style to that issue's own record", () => {
    const line = styleLine(C, style("reu"), OPEN);
    expect(line.label).toBe("Số 04");
    expect(line.href).toBe("/so/4");
    expect(line.others).toHaveLength(5);
  });

  it("is the fixed line for a fixed style", () => {
    const line = styleLine(C, style("ao-thun-tron"), OPEN);
    expect(line).toMatchObject({ label: "Cố định", href: "/products?line=fixed", railTitle: "Cùng Cố định" });
    expect(line.others).toHaveLength(7);
  });
});
