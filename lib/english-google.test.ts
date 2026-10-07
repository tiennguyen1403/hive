import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG as C } from "@/data/fixture-catalog";
import { answerText, helpGroups, helpNext } from "./feed-help";
import { PASSWORD_NONE_TEXT } from "./feed-me";
import { GOOGLE_FAILED_TEXT, SIGN_SENTENCES } from "./feed-sign-in";
import { reword } from "./i18n";

/**
 * Every sentence slice B16 adds, in both languages: the line "Đăng nhập" opens
 * with when Google did not sign anybody in, the answer an account made with
 * Google gets from "Đổi mật khẩu", and Hỏi đáp's "Đăng nhập bằng gì?". The two
 * button labels the form draws inline ("Tiếp tục với Google", "Đang mở
 * Google…") are checked on the page in both languages.
 */

const VI_LETTER = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

describe("Google did not sign anybody in", () => {
  it("is said in the brief's words, a full stop at the end in both", () => {
    expect(GOOGLE_FAILED_TEXT).toEqual({ vi: "Chưa đăng nhập được bằng Google.", en: "Couldn't sign in with Google." });
    expect(GOOGLE_FAILED_TEXT.en).not.toMatch(VI_LETTER);
  });

  it("is one of the sentences the form words again when the language changes", () => {
    expect(SIGN_SENTENCES).toContain(GOOGLE_FAILED_TEXT);
    expect(reword(GOOGLE_FAILED_TEXT.vi, "en", SIGN_SENTENCES)).toBe("Couldn't sign in with Google.");
    expect(reword(GOOGLE_FAILED_TEXT.en, "vi", SIGN_SENTENCES)).toBe("Chưa đăng nhập được bằng Google.");
  });
});

describe("an account made with Google asks to change its password", () => {
  it("is told it has none, in either language", () => {
    expect(PASSWORD_NONE_TEXT).toEqual({
      vi: "Tài khoản này đăng nhập bằng Google nên không có mật khẩu để đổi.",
      en: "This account signs in with Google, so it has no password to change.",
    });
    expect(PASSWORD_NONE_TEXT.en).not.toMatch(VI_LETTER);
  });
});

describe("Hỏi đáp: Đăng nhập bằng gì?", () => {
  const OPEN = new Date("2026-09-20T18:50:00+07:00");
  const account = (locale: "vi" | "en") => helpGroups(helpNext(C, OPEN), locale).find((g) => g.id === "tai-khoan")!;

  it("answers email and password, or Google — no longer 'coming soon'", () => {
    expect(answerText(account("vi").items[0]!.a)).toBe("Email và mật khẩu, hoặc tài khoản Google.");
    expect(answerText(account("en").items[0]!.a)).toBe("Email and password, or your Google account.");
    expect(account("en").items[0]!.q).toBe("What do I sign in with?");
  });
});
