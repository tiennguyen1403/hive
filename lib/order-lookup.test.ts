import { describe, expect, it } from "vitest";
import { lookupCheck } from "./feed-account";
import {
  LOOKED_UP_KEYS,
  LOOKUP_WORDS,
  lookupResultOf,
  readLookup,
  type LookedUpOrder,
} from "./order-lookup";

/**
 * The Feed lookup's rules and words (slice B11), without a database: how a
 * code and a number are read, what is refused before any lookup happens, and
 * how the server's answer lands under the two fields. What `lookup_order()`
 * does is Postgres' and is checked against Postgres in
 * `lib/db/order-lookup.dbtest.ts`.
 */

describe("readLookup — what the form sent", () => {
  it("reads a code and a number the way the app always has", () => {
    for (const [code, phone] of [
      ["DH-2425", "0908221447"],
      [" dh-2425 ", "0908 221 447"],
      ["dh2425", "0908.221.447"],
      ["DH 2425", "0908-221-447"],
      ["2425", "+84 908 221 447"],
    ]) {
      expect(readLookup(code, phone), `${code} / ${phone}`).toEqual({
        ok: true,
        input: { code: "DH-2425", phone: "0908221447" },
      });
    }
  });

  it("asks for what was left empty, in the mock's words — both fields at once", () => {
    expect(readLookup("", "")).toEqual({
      ok: false,
      errors: { code: "Nhập mã đơn", phone: "Nhập số điện thoại" },
    });
    expect(readLookup("   ", "\t")).toEqual({
      ok: false,
      errors: { code: "Nhập mã đơn", phone: "Nhập số điện thoại" },
    });
  });

  it("refuses what is not a code or not a number, in the mock's words", () => {
    expect(readLookup("DH-12", "0908221447")).toEqual({
      ok: false,
      errors: { code: "Mã đơn có dạng DH-1499" },
    });
    expect(readLookup("DH-1234567", "0908221447")).toEqual({
      ok: false,
      errors: { code: "Mã đơn có dạng DH-1499" },
    });
    expect(readLookup("HD-2425", "12345")).toEqual({
      ok: false,
      errors: { code: "Mã đơn có dạng DH-1499", phone: "Số điện thoại gồm 10 số, bắt đầu bằng 0" },
    });
    expect(readLookup("DH-2425", "0908/221/447")).toEqual({
      ok: false,
      errors: { phone: "Số điện thoại gồm 10 số, bắt đầu bằng 0" },
    });
  });

  it("takes the mock's three to six digits, so a code the database never issued still reaches it", () => {
    // `DH-123` has the mock's shape and no order: the lookup answers NO_ORDER.
    expect(readLookup("DH-123", "0908221447")).toEqual({
      ok: true,
      input: { code: "DH-123", phone: "0908221447" },
    });
    expect(readLookup("DH-123456", "0908221447")).toMatchObject({ ok: true });
  });

  it("reads anything that is not a string as nothing typed — the arguments come from the browser", () => {
    for (const junk of [undefined, null, 2425, {}, ["DH-2425"]]) {
      expect(readLookup(junk, junk)).toEqual({
        ok: false,
        errors: { code: "Nhập mã đơn", phone: "Nhập số điện thoại" },
      });
    }
  });

  it("says what the mock's own check says wherever that check refuses", () => {
    // `lookupCheck` is the Feed form's check (`lib/feed-account.ts`). Where it
    // refuses, the server refuses with the same sentence; where it lets a pair
    // through, so does the server (and a little more besides — see above).
    const cases: Array<[string, string]> = [
      ["", ""],
      ["DH-12", "0908221447"],
      ["DH-1234567", ""],
      ["HD-2425", "12345"],
      ["", "090822144"],
      ["DH-2425", "1908221447"],
    ];
    for (const [code, phone] of cases) {
      const mock = lookupCheck(code, phone);
      const server = readLookup(code, phone);
      expect(mock.ok, `${code} / ${phone}`).toBe(false);
      expect(server, `${code} / ${phone}`).toEqual({ ok: false, errors: mock.ok ? {} : mock.errors });
    }
    for (const [code, phone] of [
      ["DH-2425", "0908221447"],
      [" dh2430 ", "0912 345 678"],
      ["DH-2430", "0912.345.678"],
    ] as const) {
      expect(lookupCheck(code, phone).ok).toBe(true);
      expect(readLookup(code, phone).ok).toBe(true);
    }
  });
});

describe("LOOKED_UP_KEYS — what an order found this way carries", () => {
  it("is the code, the steps, the payment, the pieces and the money — nothing of where it goes", () => {
    expect([...LOOKED_UP_KEYS].sort()).toEqual(
      [
        "code",
        "codFeeVnd",
        "discountVnd",
        "lines",
        "moments",
        "payment",
        "placedAt",
        "promo",
        "shippingFeeVnd",
        "status",
      ].sort(),
    );
    for (const hidden of ["shipTo", "email", "note", "customerId", "delivery"]) {
      expect(LOOKED_UP_KEYS as readonly string[], hidden).not.toContain(hidden);
    }
  });
});

describe("lookupResultOf — the server's answer, in the screen's words", () => {
  const order: LookedUpOrder = {
    code: "DH-2425" as LookedUpOrder["code"],
    placedAt: "2026-09-15T14:50:00+07:00",
    status: { state: "SHIPPING", shippedAt: "2026-09-17T09:15:00+07:00", trackingCode: "VNP-8842204" },
    payment: "CARD",
    lines: [{ productId: "p-khoi" as never, size: "XL", color: "cream", qty: 1, unitPriceVnd: 390_000 }],
    shippingFeeVnd: 30_000,
    codFeeVnd: 0,
    discountVnd: 50_000,
  };

  it("hands the order on as it came", () => {
    expect(lookupResultOf({ ok: true, order })).toEqual({ ok: true, order });
  });

  it("puts a code that finds nothing under the code, and a wrong number under the number", () => {
    expect(lookupResultOf({ ok: false, reason: "NO_ORDER" })).toEqual({
      ok: false,
      reason: "NO_ORDER",
      errors: { code: "Không có đơn nào mang mã này" },
    });
    expect(lookupResultOf({ ok: false, reason: "PHONE_MISMATCH" })).toEqual({
      ok: false,
      reason: "PHONE_MISMATCH",
      errors: { phone: "Số điện thoại không khớp với đơn" },
    });
  });

  it("passes the app's rate-limit sentence on as the whole form's", () => {
    expect(
      lookupResultOf({
        ok: false,
        reason: "RATE_LIMITED",
        message: "Quá nhiều lượt liên tiếp. Thử lại sau 4 phút.",
        retryAfterSeconds: 200,
      }),
    ).toEqual({ ok: false, reason: "RATE_LIMITED", message: "Quá nhiều lượt liên tiếp. Thử lại sau 4 phút." });
  });

  it("keeps the mock's words for the two misses, and the app's for a read that did not happen", () => {
    expect(LOOKUP_WORDS.noOrder).toBe("Không có đơn nào mang mã này");
    expect(LOOKUP_WORDS.phoneMismatch).toBe("Số điện thoại không khớp với đơn");
    expect(LOOKUP_WORDS.unavailable).toBe("Chưa tra được đơn. Thử lại sau ít phút.");
  });
});
