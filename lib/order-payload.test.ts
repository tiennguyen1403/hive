import { describe, expect, it } from "vitest";
import {
  MAX_NOTE_LENGTH,
  MAX_UNITS_PER_ORDER,
  cancelFailureMessage,
  failureMovesCatalog,
  orderFailureOf,
  placeFailureMessage,
  readPlaceOrderPayload,
} from "./order-payload";

/** What checkout sends for one KHÓI in black, to a real ward in TP. HCM. */
function payload(over: Record<string, unknown> = {}, draft: Record<string, unknown> = {}) {
  return {
    lines: [{ productId: "p-khoi", color: "black", size: "M", qty: 1 }],
    draft: {
      recipient: "  Trần Minh Anh ",
      phone: "0912 345 678",
      email: " minhanh@email.com ",
      provinceCode: "29",
      wardCode: "70101063",
      line: " 24 Nguyễn Thị Minh Khai ",
      note: " gọi trước 10 phút ",
      delivery: "STANDARD",
      payment: "BANK_TRANSFER",
      agreed: true,
      ...draft,
    },
    promoCode: " dot05 ",
    ...over,
  };
}

const refuse = (raw: unknown) => {
  const got = readPlaceOrderPayload(raw);
  if (got.ok) throw new Error("expected a refusal");
  return got.message;
};

describe("readPlaceOrderPayload — a good request", () => {
  it("hands place_order() the basket and the form, tidied the way the columns want", () => {
    const got = readPlaceOrderPayload(payload());
    expect(got).toEqual({
      ok: true,
      input: {
        lines: [{ productId: "p-khoi", color: "black", size: "M", qty: 1 }],
        recipient: "Trần Minh Anh",
        phone: "0912345678",
        email: "minhanh@email.com",
        provinceCode: "29",
        wardCode: "70101063",
        line: "24 Nguyễn Thị Minh Khai",
        note: "gọi trước 10 phút",
        delivery: "STANDARD",
        payment: "BANK_TRANSFER",
        promoCode: "DOT05",
      },
    });
  });

  it("sends no code at all when none was applied", () => {
    for (const promoCode of [null, undefined, "", "   ", 42]) {
      const got = readPlaceOrderPayload(payload({ promoCode }));
      expect(got.ok && got.input.promoCode).toBeNull();
    }
  });

  it("carries no money: the database prices the order itself", () => {
    const got = readPlaceOrderPayload(payload({ totalVnd: 1, discountVnd: 999_999 }));
    expect(got.ok && Object.keys(got.input)).not.toContain("totalVnd");
    expect(got.ok && Object.keys(got.input)).not.toContain("discountVnd");
  });
});

describe("readPlaceOrderPayload — the basket", () => {
  const BAD = placeFailureMessage("BAD_INPUT");

  it("refuses a request that is not the shape checkout sends", () => {
    expect(refuse(null)).toBe(BAD);
    expect(refuse("DH-2432")).toBe(BAD);
    expect(refuse({ lines: [] })).toBe(BAD);
    expect(refuse(payload({ lines: "p-khoi" }))).toBe(BAD);
  });

  it("says the basket is empty when it is", () => {
    expect(refuse(payload({ lines: [] }))).toBe(placeFailureMessage("EMPTY_ORDER"));
  });

  it("refuses a line the cart could not have written", () => {
    const line = { productId: "p-khoi", color: "black", size: "M", qty: 1 };
    for (const bad of [
      { ...line, qty: 0 },
      { ...line, qty: 1.5 },
      { ...line, qty: "1" },
      { ...line, color: "pink" },
      { ...line, size: "XXL" },
      { ...line, productId: "" },
      "p-khoi",
    ]) {
      expect(refuse(payload({ lines: [bad] }))).toBe(BAD);
    }
  });

  it("refuses the same choice twice — the cart merges it into one line", () => {
    const line = { productId: "p-khoi", color: "black", size: "M", qty: 1 };
    expect(refuse(payload({ lines: [line, { ...line, qty: 2 }] }))).toBe(BAD);
  });

  it(`stops at ${MAX_UNITS_PER_ORDER} pieces an order`, () => {
    const at = readPlaceOrderPayload(
      payload({ lines: [{ productId: "p-khoi", color: "black", size: "M", qty: MAX_UNITS_PER_ORDER }] }),
    );
    expect(at.ok).toBe(true);
    expect(
      refuse(
        payload({
          lines: [{ productId: "p-khoi", color: "black", size: "M", qty: MAX_UNITS_PER_ORDER + 1 }],
        }),
      ),
    ).toBe(`Mỗi đơn tối đa ${MAX_UNITS_PER_ORDER} chiếc.`);
  });
});

describe("readPlaceOrderPayload — the form, re-checked with the form's own rules", () => {
  it("names the first thing wrong, in the words the field would use", () => {
    expect(refuse(payload({}, { recipient: "  " }))).toBe("Cần tên người nhận.");
    expect(refuse(payload({}, { phone: "12345" }))).toBe(
      "Số điện thoại chưa đúng — 10 số, bắt đầu bằng 0.",
    );
  });

  it("refuses a ward that is not in the province — the check the database cannot make", () => {
    expect(refuse(payload({}, { provinceCode: "01" }))).toBe(
      "Phường / xã này không thuộc tỉnh đã chọn.",
    );
  });

  it("refuses express outside TP. Hồ Chí Minh", () => {
    expect(
      refuse(payload({}, { provinceCode: "01", wardCode: "10113025", delivery: "EXPRESS" })),
    ).toBe("Giao nhanh chỉ có ở nội thành TP. Hồ Chí Minh.");
  });

  it("refuses an order whose terms were not agreed to", () => {
    expect(refuse(payload({}, { agreed: false }))).toBe(
      "Cần đồng ý điều khoản mua hàng trước khi đặt.",
    );
    // `true`, not truthy: a string "false" is not agreement.
    expect(refuse(payload({}, { agreed: "false" }))).toBe(
      "Cần đồng ý điều khoản mua hàng trước khi đặt.",
    );
  });

  it("refuses a delivery or payment method that does not exist", () => {
    expect(refuse(payload({}, { delivery: "DRONE" }))).toBe(placeFailureMessage("BAD_INPUT"));
    expect(refuse(payload({}, { payment: "CRYPTO" }))).toBe(placeFailureMessage("BAD_INPUT"));
  });

  it(`keeps the note inside the column's ${MAX_NOTE_LENGTH} characters`, () => {
    expect(readPlaceOrderPayload(payload({}, { note: "a".repeat(MAX_NOTE_LENGTH) })).ok).toBe(true);
    expect(refuse(payload({}, { note: "a".repeat(MAX_NOTE_LENGTH + 1) }))).toBe(
      `Ghi chú tối đa ${MAX_NOTE_LENGTH} ký tự.`,
    );
  });
});

describe("what the database's refusals become", () => {
  it("reads the seven codes off SQLSTATE P0001, and nothing else", () => {
    expect(orderFailureOf({ code: "P0001", message: "OUT_OF_STOCK" })).toBe("OUT_OF_STOCK");
    expect(orderFailureOf({ code: "P0001", message: "NOT_OWNER" })).toBe("NOT_OWNER");
    // A constraint, a dropped connection, a message that merely looks right.
    expect(orderFailureOf({ code: "23514", message: "OUT_OF_STOCK" })).toBe("UNAVAILABLE");
    expect(orderFailureOf({ code: "P0001", message: "something else" })).toBe("UNAVAILABLE");
    expect(orderFailureOf(null)).toBe("UNAVAILABLE");
  });

  it("says plainly that a piece just sold, and where to fix it", () => {
    expect(placeFailureMessage("OUT_OF_STOCK")).toBe(
      "Một món vừa hết — mở giỏ để đổi size hoặc bỏ món.",
    );
  });

  it("never shows a raw database message", () => {
    expect(placeFailureMessage("UNAVAILABLE")).toBe("Chưa đặt được đơn. Thử lại sau ít phút.");
    expect(cancelFailureMessage("UNAVAILABLE")).toBe("Chưa huỷ được đơn. Thử lại sau ít phút.");
  });

  it("does not tell somebody else's order apart from no order (QĐ-16)", () => {
    expect(cancelFailureMessage("NOT_OWNER")).toBe("Không tìm thấy đơn này trong tài khoản.");
  });

  it("re-reads the catalogue only when the catalogue is what moved", () => {
    expect(failureMovesCatalog("OUT_OF_STOCK")).toBe(true);
    expect(failureMovesCatalog("DROP_CLOSED")).toBe(true);
    expect(failureMovesCatalog("PROMO_INVALID")).toBe(true);
    expect(failureMovesCatalog("BAD_INPUT")).toBe(false);
    expect(failureMovesCatalog("UNAVAILABLE")).toBe(false);
    // Slice B4b: a refusal for going too fast moved nothing on the shelf.
    expect(failureMovesCatalog("RATE_LIMITED")).toBe(false);
  });
});
