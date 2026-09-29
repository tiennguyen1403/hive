import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFY,
  NAME_MAX,
  keepFailureMessage,
  keepFailureOf,
  profilePhone,
  readColorChoice,
  readDropNo,
  readNotifyKey,
  readProductId,
  readSizeChoice,
  readSizeSlot,
  readSwitch,
  validateProfile,
} from "./my-state";

/**
 * The rules a B9 Server Action applies before the database sees anything
 * (`lib/actions/my-state.ts`, `lib/actions/profile.ts`). The database applies
 * the same ones again (`20260929120000_account_state.sql`); these tests pin
 * the TypeScript half, `lib/db/my-state.dbtest.ts` the SQL half.
 */

describe("the profile form, by the Feed mock's rules (profile.js)", () => {
  const ok = { name: "Trần Minh Anh", phone: "0912 345 678" };

  it("passes a name and a number as a person types them", () => {
    expect(validateProfile(ok)).toEqual({});
  });

  it("asks for a name of two characters or more, after trimming", () => {
    expect(validateProfile({ ...ok, name: "" }).name).toBe("Nhập họ và tên");
    expect(validateProfile({ ...ok, name: "   " }).name).toBe("Nhập họ và tên");
    expect(validateProfile({ ...ok, name: " A " }).name).toBe("Nhập họ và tên");
    expect(validateProfile({ ...ok, name: " An " }).name).toBeUndefined();
  });

  it(`stops a name at ${NAME_MAX} characters, counting a Vietnamese letter as one`, () => {
    expect(validateProfile({ ...ok, name: "a".repeat(NAME_MAX) }).name).toBeUndefined();
    expect(validateProfile({ ...ok, name: "a".repeat(NAME_MAX + 1) }).name).toBe(
      `Họ và tên tối đa ${NAME_MAX} ký tự`,
    );
    // "ễ" is one character, as Postgres' char_length counts it.
    expect(validateProfile({ ...ok, name: "ễ".repeat(NAME_MAX) }).name).toBeUndefined();
  });

  it("asks for a number when there is none", () => {
    expect(validateProfile({ ...ok, phone: "" }).phone).toBe("Nhập số điện thoại");
    expect(validateProfile({ ...ok, phone: "  " }).phone).toBe("Nhập số điện thoại");
  });

  it("wants ten digits starting with 0, with spaces and dots allowed between them", () => {
    const wrong = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
    for (const phone of ["0912 345 678", "0912.345.678", " 0912345678 ", "0912 345 678"]) {
      expect(validateProfile({ ...ok, phone }).phone, phone).toBeUndefined();
    }
    // The mock accepts digits, spaces and dots and nothing else — not a dash,
    // not a country code — and exactly ten digits starting with 0.
    for (const phone of ["0912-345-678", "+84912345678", "912345678", "09123456789", "1912345678", "0912 345 67a"]) {
      expect(validateProfile({ ...ok, phone }).phone, phone).toBe(wrong);
    }
  });

  it("stores the number as its ten digits", () => {
    expect(profilePhone("0912 345.678")).toBe("0912345678");
    expect(profilePhone("0912 345 678")).toBe("0912345678");
    expect(profilePhone("0912-345-678")).toBe("");
    expect(profilePhone("")).toBe("");
  });
});

describe("what an action accepts from the browser", () => {
  it("takes a style id of the catalogue's shape and nothing else", () => {
    expect(readProductId("p-bui")).toBe("p-bui");
    expect(readProductId("p-hoodie-tron")).toBe("p-hoodie-tron");
    for (const bad of ["bui", "p-", "p-BUI", "p-bụi", " p-bui", 7, null, undefined, {}, `p-${"a".repeat(100)}`]) {
      expect(readProductId(bad), String(bad)).toBeNull();
    }
  });

  it("takes a colour, or none so the database picks the first one left", () => {
    expect(readColorChoice("navy")).toEqual({ color: "navy" });
    expect(readColorChoice(null)).toEqual({ color: null });
    expect(readColorChoice(undefined)).toEqual({ color: null });
    expect(readColorChoice("red")).toBeNull();
    expect(readColorChoice(3)).toBeNull();
  });

  it("takes an issue number as a positive integer", () => {
    expect(readDropNo(6)).toBe(6);
    for (const bad of [0, -1, 1.5, Number.NaN, 2 ** 31, "6", null, undefined]) {
      expect(readDropNo(bad), String(bad)).toBeNull();
    }
  });

  it("takes áo or quần, and a size or none", () => {
    expect(readSizeSlot("top")).toBe("top");
    expect(readSizeSlot("bottom")).toBe("bottom");
    expect(readSizeSlot("shoes")).toBeNull();
    expect(readSizeChoice("L")).toEqual({ size: "L" });
    expect(readSizeChoice(null)).toEqual({ size: null });
    expect(readSizeChoice(undefined)).toEqual({ size: null });
    expect(readSizeChoice("XXL")).toBeNull();
    expect(readSizeChoice("l")).toBeNull();
  });

  it("takes the four switches by the mock's keys, and a real boolean", () => {
    for (const key of ["order", "drop", "wishlist", "promo"]) expect(readNotifyKey(key)).toBe(key);
    expect(readNotifyKey("orders")).toBeNull();
    expect(readSwitch(true)).toBe(true);
    expect(readSwitch(false)).toBe(false);
    expect(readSwitch("true")).toBeNull();
    expect(readSwitch(1)).toBeNull();
  });

  it("starts every switch on, as the mock's prefs() does", () => {
    expect(DEFAULT_NOTIFY).toEqual({ order: true, drop: true, wishlist: true, promo: true });
  });
});

describe("a refusal from the database", () => {
  const raised = (message: string) => ({ code: "P0001", message });

  it("is named by the code the function raised", () => {
    expect(keepFailureOf(raised("SIGNED_OUT"))).toBe("SIGNED_OUT");
    expect(keepFailureOf(raised("BAD_INPUT"))).toBe("INVALID");
    expect(keepFailureOf(raised("NOT_UPCOMING"))).toBe("NOT_UPCOMING");
    expect(keepFailureOf(raised("NOT_FOUND"))).toBe("NOT_FOUND");
  });

  it("is UNAVAILABLE for anything else — another code, another message, nothing", () => {
    expect(keepFailureOf(raised("SOMETHING_ELSE"))).toBe("UNAVAILABLE");
    expect(keepFailureOf({ code: "42501", message: "permission denied" })).toBe("UNAVAILABLE");
    expect(keepFailureOf(null)).toBe("UNAVAILABLE");
  });

  it("invites a signed-out visitor to sign in, in the mock's own words", () => {
    expect(keepFailureMessage("SIGNED_OUT", "favorites")).toBe("Đăng nhập để lưu mẫu");
    expect(keepFailureMessage("SIGNED_OUT", "reminders")).toBe("Đăng nhập để bật nhắc");
    expect(keepFailureMessage("SIGNED_OUT", "sizes")).toBe("Đăng nhập để sửa hồ sơ");
    expect(keepFailureMessage("SIGNED_OUT", "notify")).toBe("Đăng nhập để xem thông báo");
  });

  it("says why a reminder was refused, and what cannot be undone", () => {
    expect(keepFailureMessage("NOT_UPCOMING", "reminders")).toBe("Chỉ bật nhắc được cho Số chưa mở.");
    expect(keepFailureMessage("NOT_FOUND", "favorites")).toBe("Không còn gì để hoàn tác.");
  });
});
