import { describe, expect, it } from "vitest";
import {
  EMAIL_TAKEN,
  FORGOT_NOT_SENT,
  SIGN_FIELDS,
  SIGN_IN_WRONG,
  SIGN_TITLES,
  firstWrongSign,
  nextParam,
  signErrors,
  signHref,
} from "./feed-sign-in";

describe("the three modes (sign-in.js MODES)", () => {
  it("are titled as the mock titles them", () => {
    expect(SIGN_TITLES).toEqual({ in: "Đăng nhập", up: "Tạo tài khoản", forgot: "Quên mật khẩu" });
  });

  it("show their fields in the mock's order", () => {
    expect(SIGN_FIELDS.in).toEqual(["email", "password"]);
    expect(SIGN_FIELDS.up).toEqual(["name", "email", "password"]);
    expect(SIGN_FIELDS.forgot).toEqual(["email"]);
  });
});

describe("signErrors: the mock's rules and words (account.js SI_RULES)", () => {
  it("asks for each empty field of a new account", () => {
    expect(signErrors("up", {})).toEqual({
      name: "Nhập họ và tên",
      email: "Nhập email",
      password: "Mật khẩu từ 8 ký tự",
    });
  });

  it("wants two characters of a name, trimmed", () => {
    expect(signErrors("up", { name: " A ", email: "a@b.vn", password: "12345678" }).name).toBe("Nhập họ và tên");
    expect(signErrors("up", { name: "An", email: "a@b.vn", password: "12345678" })).toEqual({});
  });

  it("reads the mock's malformed address as wrong", () => {
    for (const email of ["minhkhoa@email", "khong-hop-le", "a@", "@vidu.vn"]) {
      expect(signErrors("in", { email, password: "x" }).email, email).toBe("Email chưa đúng");
    }
    expect(signErrors("in", { email: "  minhanh@email.com ", password: "x" })).toEqual({});
  });

  it("asks only for eight characters of a new password, letters or digits alike", () => {
    expect(signErrors("up", { name: "Minh Anh", email: "a@b.vn", password: "1234567" }).password).toBe("Mật khẩu từ 8 ký tự");
    // The v3 rule "có cả chữ và số" is gone: the mock asks for the length and nothing else.
    expect(signErrors("up", { name: "Minh Anh", email: "a@b.vn", password: "khongcoso" })).toEqual({});
    expect(signErrors("up", { name: "Minh Anh", email: "a@b.vn", password: "12345678" })).toEqual({});
    // Judged trimmed, as the mock trims every value.
    expect(signErrors("up", { name: "Minh Anh", email: "a@b.vn", password: "  abcdefg " }).password).toBe("Mật khẩu từ 8 ký tự");
  });

  it("asks for a password when signing in, of any length", () => {
    expect(signErrors("in", { email: "a@b.vn", password: "" }).password).toBe("Nhập mật khẩu");
    expect(signErrors("in", { email: "a@b.vn", password: "1" })).toEqual({});
  });

  it("checks only the email when asking for a reset", () => {
    expect(signErrors("forgot", { email: "" })).toEqual({ email: "Nhập email" });
    expect(signErrors("forgot", { email: "minhanh@email.com" })).toEqual({});
  });

  it("points at the first wrong field in the page's order", () => {
    expect(firstWrongSign("up", { password: "x", email: "y" })).toBe("email");
    expect(firstWrongSign("in", {})).toBeUndefined();
  });
});

describe("the words the mock writes (no full stop, as on the screen)", () => {
  it("says a refused sign-in in one line, and a taken address under its field", () => {
    expect(SIGN_IN_WRONG).toBe("Email hoặc mật khẩu chưa đúng");
    expect(EMAIL_TAKEN).toBe("Email này đã có tài khoản");
  });

  it("ends the reset honestly: nothing was sent, the feature is being prepared (QĐ-35)", () => {
    expect(`${FORGOT_NOT_SENT.before}minhanh@email.com${FORGOT_NOT_SENT.after}`).toBe(
      "Chưa gửi được liên kết đặt lại mật khẩu tới minhanh@email.com. Tính năng này đang chuẩn bị.",
    );
  });
});

describe("nextParam: where the shopper was headed, when it is a path of this app", () => {
  it("keeps a path and drops a full URL or a protocol-relative one", () => {
    expect(nextParam("/account/orders/DH-2430")).toBe("/account/orders/DH-2430");
    expect(nextParam(["/checkout", "/cart"])).toBe("/checkout");
    expect(nextParam("https://evil.example")).toBeUndefined();
    expect(nextParam("//evil.example")).toBeUndefined();
    expect(nextParam(undefined)).toBeUndefined();
    expect(nextParam("")).toBeUndefined();
  });
});

describe("signHref: a link to another mode keeps next", () => {
  it("carries the way back, or nothing", () => {
    expect(signHref("up", "/account/orders?phase=active")).toBe("/sign-up?next=%2Faccount%2Forders%3Fphase%3Dactive");
    expect(signHref("forgot", undefined)).toBe("/forgot-password");
    expect(signHref("in", "/checkout")).toBe("/sign-in?next=%2Fcheckout");
  });
});
