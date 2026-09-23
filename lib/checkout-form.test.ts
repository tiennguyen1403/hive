import { describe, it, expect } from "vitest";
import {
  EMPTY_DRAFT,
  checkoutStep,
  isAddressComplete,
  normalisePhone,
  validateCheckout,
  type CheckoutDraft,
} from "./checkout-form";

/** A draft that passes, so each test can spoil exactly one thing. */
const GOOD: CheckoutDraft = {
  recipient: "Nguyễn Văn A",
  phone: "0912345678",
  email: "a@example.com",
  provinceCode: "29", // TP. Hồ Chí Minh
  wardCode: "70101063", // Phường Sài Gòn
  line: "12 Nguyễn Huệ",
  note: "",
  delivery: "STANDARD",
  payment: "BANK_TRANSFER",
  agreed: true,
};

describe("normalisePhone", () => {
  it("strips the spaces and dots people type", () => {
    expect(normalisePhone("091 234 56 78")).toBe("0912345678");
    expect(normalisePhone("091.234.5678")).toBe("0912345678");
    expect(normalisePhone("091-234-5678")).toBe("0912345678");
  });

  it("turns the international form into the local one", () => {
    expect(normalisePhone("+84912345678")).toBe("0912345678");
    expect(normalisePhone("84912345678")).toBe("0912345678");
  });

  it("leaves something it does not recognise alone, rather than mangling it", () => {
    expect(normalisePhone("gọi cho tôi")).toBe("");
  });
});

describe("validateCheckout · who is receiving", () => {
  it("passes a complete draft", () => {
    expect(validateCheckout(GOOD)).toEqual({});
  });

  it("needs a name", () => {
    expect(validateCheckout({ ...GOOD, recipient: "  " }).recipient).toBeTruthy();
  });

  it("needs a phone number the courier can dial", () => {
    expect(validateCheckout({ ...GOOD, phone: "" }).phone).toBeTruthy();
    expect(validateCheckout({ ...GOOD, phone: "0912" }).phone).toBeTruthy();
    expect(validateCheckout({ ...GOOD, phone: "1912345678" }).phone).toBeTruthy();
  });

  it("accepts a number typed with spaces or a country code", () => {
    expect(validateCheckout({ ...GOOD, phone: "091 234 5678" }).phone).toBeUndefined();
    expect(validateCheckout({ ...GOOD, phone: "+84912345678" }).phone).toBeUndefined();
  });

  it("needs an email that could receive the confirmation", () => {
    expect(validateCheckout({ ...GOOD, email: "" }).email).toBeTruthy();
    expect(validateCheckout({ ...GOOD, email: "a@b" }).email).toBeTruthy();
    expect(validateCheckout({ ...GOOD, email: "không phải mail" }).email).toBeTruthy();
  });
});

describe("validateCheckout · where it is going", () => {
  it("needs a province", () => {
    expect(validateCheckout({ ...GOOD, provinceCode: "" }).provinceCode).toBeTruthy();
  });

  it("needs a ward", () => {
    expect(validateCheckout({ ...GOOD, wardCode: "" }).wardCode).toBeTruthy();
  });

  it("rejects a ward that does not belong to the chosen province", () => {
    // Changing province without changing ward is the common way this goes
    // wrong, and a parcel addressed to a commune in another city is a
    // parcel that does not arrive.
    expect(
      validateCheckout({ ...GOOD, provinceCode: "01", wardCode: "10101003" }).wardCode,
    ).toBeUndefined(); // Phường Ba Đình really is in Hà Nội
    expect(
      validateCheckout({ ...GOOD, wardCode: "10101003" }).wardCode,
    ).toBeTruthy(); // ...and not in TP. Hồ Chí Minh
  });

  it("needs a street line, not only an administrative unit", () => {
    expect(validateCheckout({ ...GOOD, line: " " }).line).toBeTruthy();
  });
});

describe("validateCheckout · how it is sent and paid", () => {
  it("refuses express outside the city it runs in", () => {
    expect(
      validateCheckout({
        ...GOOD,
        provinceCode: "01",
        wardCode: "10101003",
        delivery: "EXPRESS",
      }).delivery,
    ).toBeTruthy();
  });

  it("allows express in the city it runs in", () => {
    expect(validateCheckout({ ...GOOD, delivery: "EXPRESS" }).delivery).toBeUndefined();
  });

  it("will not place an order without the terms ticked", () => {
    expect(validateCheckout({ ...GOOD, agreed: false }).agreed).toBeTruthy();
  });
});

describe("isAddressComplete", () => {
  it("is false on an empty draft", () => {
    expect(isAddressComplete(EMPTY_DRAFT)).toBe(false);
  });

  it("is true once the recipient and the address are filled in", () => {
    expect(isAddressComplete(GOOD)).toBe(true);
  });

  it("does not wait on the terms tickbox, which belongs to the next step", () => {
    expect(isAddressComplete({ ...GOOD, agreed: false })).toBe(true);
  });
});

describe("checkoutStep", () => {
  it("starts on the address step", () => {
    // Step 0 is the cart, and they have left it to get here.
    expect(checkoutStep(EMPTY_DRAFT)).toBe(1);
  });

  it("moves to payment once the address is complete", () => {
    expect(checkoutStep(GOOD)).toBe(2);
  });

  it("falls back when the address is emptied again", () => {
    expect(checkoutStep({ ...GOOD, line: "" })).toBe(1);
  });
});
