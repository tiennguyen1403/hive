import { describe, it, expect } from "vitest";
import {
  RECENT_SEARCH_CAP,
  parseSearches,
  rememberSearch,
  serializeSearches,
} from "./recent-searches";

describe("the recent-search list", () => {
  it("puts the newest term at the front", () => {
    expect(rememberSearch(["hoodie"], "khoi", 3)).toEqual(["khoi", "hoodie"]);
  });

  it("moves a repeat to the front instead of storing it twice", () => {
    expect(rememberSearch(["hoodie", "khoi"], "khoi", 3)).toEqual(["khoi", "hoodie"]);
  });

  it("treats the same word with and without tone marks as one entry", () => {
    // Someone retyping "khói" after "khoi" has not searched for something
    // new; the newest spelling is the one that survives, because it is the
    // one they just chose to type.
    expect(rememberSearch(["khoi"], "Khói", 1)).toEqual(["Khói"]);
  });

  it("trims what it stores and ignores an empty term", () => {
    expect(rememberSearch([], "  hoodie  ", 2)).toEqual(["hoodie"]);
    expect(rememberSearch(["hoodie"], "   ", 2)).toEqual(["hoodie"]);
  });

  it("does not remember a term that found nothing", () => {
    // Caught in review: "zzzz" was saved, so the row offered a chip that
    // replayed the empty state. A shortcut has to lead somewhere.
    expect(rememberSearch(["hoodie"], "zzzz", 0)).toEqual(["hoodie"]);
    expect(rememberSearch([], "zzzz", 0)).toEqual([]);
  });

  it("caps the list, dropping the oldest", () => {
    let list: string[] = [];
    for (let i = 1; i <= RECENT_SEARCH_CAP + 3; i++) list = rememberSearch(list, `t${i}`, 1);
    expect(list).toHaveLength(RECENT_SEARCH_CAP);
    expect(list[0]).toBe(`t${RECENT_SEARCH_CAP + 3}`);
    expect(list).not.toContain("t1");
  });
});

describe("reading the list back off the device", () => {
  it("round-trips", () => {
    const list = ["khói", "nỉ bông"];
    expect(parseSearches(serializeSearches(list))).toEqual(list);
  });

  it("returns nothing for an empty, broken or foreign payload", () => {
    expect(parseSearches(null)).toEqual([]);
    expect(parseSearches("{")).toEqual([]);
    expect(parseSearches("[1,2]")).toEqual([]);
    expect(parseSearches(JSON.stringify({ v: 99, terms: ["khoi"] }))).toEqual([]);
    expect(parseSearches(JSON.stringify({ v: 1, terms: "khoi" }))).toEqual([]);
  });

  it("drops entries that are not usable terms", () => {
    const raw = JSON.stringify({ v: 1, terms: ["khoi", 7, "", "  ", null, "bụi"] });
    expect(parseSearches(raw)).toEqual(["khoi", "bụi"]);
  });

  it("de-duplicates and re-caps a list that arrived damaged", () => {
    const terms = ["khoi", "KHOI", ...Array.from({ length: 20 }, (_, i) => `t${i}`)];
    const out = parseSearches(JSON.stringify({ v: 1, terms }));
    expect(out).toHaveLength(RECENT_SEARCH_CAP);
    expect(out.filter((t) => t.toLowerCase() === "khoi")).toHaveLength(1);
  });
});
