import { describe, expect, it } from "vitest";
import {
  chooseLocale,
  groupDigits,
  isLocale,
  localeFromAcceptLanguage,
  LOCALE_COOKIE,
  LOCALE_COOKIE_OPTIONS,
  parseLocale,
  pick,
  pickAll,
  picker,
  plural,
  withoutParam,
  type Pair,
} from "./i18n";

describe("the two languages", () => {
  it("knows exactly vi and en", () => {
    expect(isLocale("vi")).toBe(true);
    expect(isLocale("en")).toBe(true);
    for (const other of ["fr", "VI", "EN", "", "vi-VN", null, undefined, 1]) expect(isLocale(other)).toBe(false);
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("de")).toBeNull();
  });

  it("remembers the choice in hive-lang for a year, SameSite=Lax, on the whole site", () => {
    expect(LOCALE_COOKIE).toBe("hive-lang");
    expect(LOCALE_COOKIE_OPTIONS).toEqual({ maxAge: 31_536_000, sameSite: "lax", path: "/" });
  });
});

describe("text in pairs", () => {
  const BAG: Pair = { vi: "Giỏ", en: "Bag" };

  it("picks one side", () => {
    expect(pick(BAG, "vi")).toBe("Giỏ");
    expect(pick(BAG, "en")).toBe("Bag");
    const t = picker("en");
    expect(t(BAG)).toBe("Bag");
    expect(t({ vi: 1, en: 2 })).toBe(2);
  });

  it("turns a table of pairs into one language, keys and all", () => {
    const table = { bag: BAG, home: { vi: "Trang chủ", en: "Home" } };
    expect(pickAll(table, "vi")).toEqual({ bag: "Giỏ", home: "Trang chủ" });
    expect(pickAll(table, "en")).toEqual({ bag: "Bag", home: "Home" });
  });

  it("makes a missing side a type error", () => {
    // @ts-expect-error — a pair without its English side does not compile.
    const half: Pair = { vi: "Giỏ" };
    expect(half.vi).toBe("Giỏ");
  });
});

describe("numbers", () => {
  it("groups thousands with a dot in Vietnamese and a comma in English", () => {
    expect(groupDigits(390000)).toBe("390.000");
    expect(groupDigits(390000, "en")).toBe("390,000");
    expect(groupDigits(1290000, "en")).toBe("1,290,000");
    expect(groupDigits(999, "en")).toBe("999");
    expect(groupDigits(-15000, "en")).toBe("-15,000");
  });

  it("counts in English with Intl.PluralRules(en-GB)", () => {
    expect(plural(1, "item", "items")).toBe("1 item");
    expect(plural(2, "item", "items")).toBe("2 items");
    expect(plural(0, "item", "items")).toBe("0 items");
    expect(plural(1200, "order", "orders")).toBe("1,200 orders");
  });
});

describe("which language a request is in", () => {
  it("reads Accept-Language by its highest weight: vi or vi-* is Vietnamese, anything else English", () => {
    expect(localeFromAcceptLanguage("vi-VN")).toBe("vi");
    expect(localeFromAcceptLanguage("vi")).toBe("vi");
    expect(localeFromAcceptLanguage("vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("vi");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("fr-FR,fr;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("en-US;q=0.5,vi;q=0.8")).toBe("vi");
    expect(localeFromAcceptLanguage("de;q=0.9, vi-VN;q=0.4")).toBe("en");
    expect(localeFromAcceptLanguage("VI-vn")).toBe("vi");
    // "vi" must be the whole primary tag, not its start.
    expect(localeFromAcceptLanguage("vind")).toBe("en");
  });

  it("takes the first of equal weights", () => {
    expect(localeFromAcceptLanguage("en, vi")).toBe("en");
    expect(localeFromAcceptLanguage("vi;q=0.8, en;q=0.8")).toBe("vi");
  });

  it("has no answer without a header, or when nothing in it is acceptable", () => {
    expect(localeFromAcceptLanguage(null)).toBeNull();
    expect(localeFromAcceptLanguage(undefined)).toBeNull();
    expect(localeFromAcceptLanguage("")).toBeNull();
    expect(localeFromAcceptLanguage("vi;q=0")).toBeNull();
  });

  it("decides by ?lang=, then the cookie, then Accept-Language, then Vietnamese", () => {
    expect(chooseLocale({ param: "en", cookie: "vi", acceptLanguage: "vi-VN" })).toEqual({ locale: "en", from: "param" });
    expect(chooseLocale({ param: "fr", cookie: "en", acceptLanguage: "vi-VN" })).toEqual({ locale: "en", from: "cookie" });
    expect(chooseLocale({ cookie: "en", acceptLanguage: "vi-VN" })).toEqual({ locale: "en", from: "cookie" });
    expect(chooseLocale({ cookie: "xx", acceptLanguage: "en-US" })).toEqual({ locale: "en", from: "header" });
    expect(chooseLocale({ acceptLanguage: "fr-FR,fr;q=0.9" })).toEqual({ locale: "en", from: "header" });
    expect(chooseLocale({ acceptLanguage: "vi-VN" })).toEqual({ locale: "vi", from: "header" });
  });

  it("answers Vietnamese, from nothing, when the request says nothing (a link preview's bot)", () => {
    expect(chooseLocale({})).toEqual({ locale: "vi", from: "default" });
    expect(chooseLocale({ param: null, cookie: null, acceptLanguage: null })).toEqual({ locale: "vi", from: "default" });
  });
});

describe("dropping ?lang= from an address", () => {
  it("keeps every other parameter as it was written", () => {
    expect(withoutParam("?line=fixed&lang=en", "lang")).toBe("?line=fixed");
    expect(withoutParam("?lang=en&line=fixed&sort=new", "lang")).toBe("?line=fixed&sort=new");
    expect(withoutParam("?q=%C3%A1o%20thun&lang=vi&page=2", "lang")).toBe("?q=%C3%A1o%20thun&page=2");
    expect(withoutParam("?code=DH-2425&phone=0908221447", "lang")).toBe("?code=DH-2425&phone=0908221447");
  });

  it("drops every lang, with or without a value, and the ? when nothing is left", () => {
    expect(withoutParam("?lang=en", "lang")).toBe("");
    expect(withoutParam("?lang", "lang")).toBe("");
    expect(withoutParam("?lang=en&lang=vi", "lang")).toBe("");
    expect(withoutParam("", "lang")).toBe("");
  });

  it("does not drop a parameter that only starts with the name", () => {
    expect(withoutParam("?language=en&lang=en", "lang")).toBe("?language=en");
  });
});
