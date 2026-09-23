import { describe, it, expect } from "vitest";
import {
  parseWishlist,
  resolveWishlist,
  savedAt,
  serializeWishlist,
  toggleWish,
  wishlistNotice,
} from "./wishlist";
import { productId } from "@/data/types";

const DURING_5 = new Date("2026-09-20T10:00:00+07:00");
const KHOI = productId("p-khoi");
const BUI = productId("p-bui"); // 2 left — the "sắp hết" case
const MUOI = productId("p-muoi"); // sold out

const SAVED_AT = "2026-09-15T10:00:00+07:00";

describe("toggleWish", () => {
  it("adds a style that is not saved yet", () => {
    expect(toggleWish([], KHOI)).toEqual([{ id: KHOI }]);
  });

  it("stamps the moment it was saved when it is given one", () => {
    expect(toggleWish([], KHOI, SAVED_AT)).toEqual([{ id: KHOI, at: SAVED_AT }]);
  });

  it("removes one that already is", () => {
    expect(toggleWish([{ id: KHOI }, { id: BUI }], KHOI)).toEqual([{ id: BUI }]);
  });

  it("removes it whatever stamp it carries", () => {
    expect(toggleWish([{ id: KHOI, at: SAVED_AT }], KHOI)).toEqual([]);
  });

  it("puts the newest first — the list reads as a history", () => {
    expect(toggleWish([{ id: KHOI }], BUI)).toEqual([{ id: BUI }, { id: KHOI }]);
  });

  it("does not mutate the list it was given", () => {
    const before = [{ id: KHOI }];
    toggleWish(before, BUI);
    expect(before).toEqual([{ id: KHOI }]);
  });
});

describe("savedAt", () => {
  it("returns the stamp of a saved style", () => {
    expect(savedAt([{ id: KHOI, at: SAVED_AT }], KHOI)).toBe(SAVED_AT);
  });

  it("returns nothing for a record written before the stamp existed", () => {
    expect(savedAt([{ id: KHOI }], KHOI)).toBeUndefined();
  });
});

describe("resolveWishlist", () => {
  it("joins each id to its product", () => {
    const r = resolveWishlist(DURING_5, [{ id: BUI }, { id: KHOI }]);
    expect(r.items.map((i) => i.product.name)).toEqual(["BỤI", "KHÓI"]);
  });

  it("drops an id whose product has left the catalog", () => {
    const r = resolveWishlist(DURING_5, [{ id: productId("p-khong-co") }, { id: KHOI }]);
    expect(r.items).toHaveLength(1);
    expect(r.unknown).toHaveLength(1);
  });

  it("keeps a sold-out style in the list rather than quietly dropping it", () => {
    // The screen says so: "Mẫu đã hết hàng vẫn được giữ trong danh sách để
    // bạn theo dõi số sau." A wishlist that deletes things is a wishlist
    // nobody trusts.
    const r = resolveWishlist(DURING_5, [{ id: MUOI }]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.soldOut).toBe(true);
  });

  it("counts what can still be bought, separately from what is saved", () => {
    const r = resolveWishlist(DURING_5, [{ id: BUI }, { id: MUOI }, { id: KHOI }]);
    expect(r.items).toHaveLength(3);
    expect(r.buyable).toHaveLength(2);
  });

  it("marks a style that is down to its last few", () => {
    const r = resolveWishlist(DURING_5, [{ id: BUI }]);
    expect(r.items[0]!.low).toBe(true);
    expect(r.items[0]!.onHand).toBe(2);
  });

  it("treats everything as unbuyable once the drop has closed", () => {
    const after = new Date("2026-09-30T10:00:00+07:00");
    const r = resolveWishlist(after, [{ id: KHOI }]);
    expect(r.buyable).toHaveLength(0);
  });
});

describe("wishlistNotice", () => {
  it("names the one style that is running out", () => {
    const r = resolveWishlist(DURING_5, [{ id: BUI }, { id: KHOI }]);
    expect(wishlistNotice(r)).toBe("BỤI còn 2 chiếc");
  });

  it("counts them when more than one is running out", () => {
    const r = resolveWishlist(DURING_5, [{ id: BUI }, { id: productId("p-suong") }]);
    expect(wishlistNotice(r)).toMatch(/2 mẫu/);
  });

  it("says nothing when nothing is running out", () => {
    expect(wishlistNotice(resolveWishlist(DURING_5, [{ id: KHOI }]))).toBeNull();
  });

  it("says nothing for an empty list", () => {
    expect(wishlistNotice(resolveWishlist(DURING_5, []))).toBeNull();
  });
});

describe("parseWishlist", () => {
  it("round-trips through storage", () => {
    const list = [{ id: KHOI, at: SAVED_AT }, { id: BUI }];
    expect(parseWishlist(serializeWishlist(list))).toEqual(list);
  });

  it("reads a list written before the stamp existed", () => {
    const raw = JSON.stringify({ v: 1, ids: ["p-khoi", "p-bui"] });
    expect(parseWishlist(raw)).toEqual([{ id: KHOI }, { id: BUI }]);
  });

  it("drops a stamp that is not a string rather than the style it belongs to", () => {
    const raw = JSON.stringify({ v: 1, ids: [{ id: "p-khoi", at: 7 }] });
    expect(parseWishlist(raw)).toEqual([{ id: KHOI }]);
  });

  it("returns an empty list when nothing is stored", () => {
    expect(parseWishlist(null)).toEqual([]);
  });

  it("survives a corrupt value", () => {
    expect(parseWishlist("{nope")).toEqual([]);
    expect(parseWishlist('"a string"')).toEqual([]);
  });

  it("drops an entry that is neither an id nor a record", () => {
    const raw = JSON.stringify({ v: 1, ids: ["p-khoi", 7, null, "p-bui"] });
    expect(parseWishlist(raw)).toEqual([{ id: KHOI }, { id: BUI }]);
  });

  it("drops a duplicate rather than showing the same card twice", () => {
    const raw = JSON.stringify({ v: 1, ids: ["p-khoi", { id: "p-khoi", at: SAVED_AT }] });
    expect(parseWishlist(raw)).toEqual([{ id: KHOI }]);
  });

  it("discards a payload written by an older schema", () => {
    expect(parseWishlist(JSON.stringify(["p-khoi"]))).toEqual([]);
  });
});
