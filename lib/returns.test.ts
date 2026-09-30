import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PHOTO_REASONS, RETURN_REASONS, RETURNS, SHOP_FAULT } from "./returns";

/** The approved mock's data layer, read as text: the lists there are the ones the user settled on 27/09. */
const MOCK = readFileSync(join("prototype", "explore", "shared", "data.js"), "utf8");
const RETURN_JS = readFileSync(join("prototype", "explore", "feed", "return.js"), "utf8");
const listIn = (src: string, name: string): string[] => {
  const m = src.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  if (!m) throw new Error(`no ${name} in the mock`);
  return [...m[1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]!);
};

describe("the return rules", () => {
  it("are the mock's lists, in its order", () => {
    expect([...RETURN_REASONS]).toEqual(listIn(MOCK, "RETURN_REASONS"));
    expect([...SHOP_FAULT]).toEqual(listIn(MOCK, "SHOP_FAULT"));
    expect([...PHOTO_REASONS]).toEqual(listIn(RETURN_JS, "PHOTO_REASONS"));
  });

  it("name only reasons a shopper can pick", () => {
    for (const r of [...SHOP_FAULT, ...PHOTO_REASONS]) expect(RETURN_REASONS as readonly string[], r).toContain(r);
  });

  it("have the shop pay the way back and refund to a bank account, answering in one to three days", () => {
    expect(RETURNS.shipBackBy).toBe("shop");
    expect(RETURNS.refundTo).toBe("bank");
    expect(RETURNS.answerDays).toEqual([1, 3]);
  });

  it("answer in Thông báo alone: the app sends no email (QĐ-35)", () => {
    expect(RETURNS.answerBy).toEqual(["inbox"]);
  });
});
