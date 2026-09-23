import { describe, it, expect } from "vitest";
import {
  defaultAddress,
  parseAddressBook,
  removeAddress,
  saveAddress,
  serializeAddressBook,
  type SavedAddress,
} from "./address-book";

/**
 * The GUEST book only, since slice B1: a signed-in shopper's addresses live
 * in Postgres behind row level security and are covered by
 * `lib/db/addresses.dbtest.ts`. The tests that merged a fixture customer's
 * addresses with this list went with `addressBookFor`, the function that did
 * the merging.
 */
const DRAFT = {
  recipient: "Trần Minh Anh",
  phone: "0912345678",
  provinceCode: "29",
  wardCode: "70101063",
  line: "24 Nguyễn Thị Minh Khai",
  label: "Nhà" as const,
  isDefault: false,
};

describe("defaultAddress", () => {
  it("returns the one marked default", () => {
    const book = saveAddress([], { ...DRAFT, isDefault: true }, "addr-1");
    expect(defaultAddress(book)?.isDefault).toBe(true);
  });

  it("falls back to the first when none is marked", () => {
    const book = saveAddress(saveAddress([], DRAFT, "addr-1"), DRAFT, "addr-2");
    expect(defaultAddress(book)?.id).toBe("addr-1");
  });

  it("returns nothing for an empty book", () => {
    expect(defaultAddress([])).toBeUndefined();
  });
});
describe("saveAddress", () => {
  it("adds a new address with an id of its own", () => {
    const saved = saveAddress([], DRAFT, "addr-1");
    expect(saved).toHaveLength(1);
    expect(saved[0]!.id).toBe("addr-1");
    expect(saved[0]!.source).toBe("device");
  });

  it("does not mutate the list it was given", () => {
    const before: SavedAddress[] = [];
    saveAddress(before, DRAFT, "addr-1");
    expect(before).toEqual([]);
  });

  it("replaces an entry when the id already exists", () => {
    let list = saveAddress([], DRAFT, "addr-1");
    list = saveAddress(list, { ...DRAFT, line: "Đổi rồi" }, "addr-1");
    expect(list).toHaveLength(1);
    expect(list[0]!.line).toBe("Đổi rồi");
  });

  it("makes a new default the only default", () => {
    // Two addresses both claiming to be the one checkout prefills is a
    // question with two answers.
    let list = saveAddress([], { ...DRAFT, isDefault: true }, "a");
    list = saveAddress(list, { ...DRAFT, isDefault: true, line: "Chỗ khác" }, "b");
    expect(list.filter((a) => a.isDefault).map((a) => a.id)).toEqual(["b"]);
  });

  it("leaves the existing default alone when the new one does not claim it", () => {
    let list = saveAddress([], { ...DRAFT, isDefault: true }, "a");
    list = saveAddress(list, { ...DRAFT, line: "Chỗ khác" }, "b");
    expect(list.find((a) => a.isDefault)!.id).toBe("a");
  });
});

describe("removeAddress", () => {
  it("drops exactly the one addressed", () => {
    let list = saveAddress([], DRAFT, "a");
    list = saveAddress(list, { ...DRAFT, line: "Hai" }, "b");
    expect(removeAddress(list, "a").map((x) => x.id)).toEqual(["b"]);
  });
});

describe("parseAddressBook", () => {
  it("round-trips through storage", () => {
    const list = saveAddress([], DRAFT, "a");
    expect(parseAddressBook(serializeAddressBook(list))).toEqual(list);
  });

  it("returns an empty book when nothing is stored", () => {
    expect(parseAddressBook(null)).toEqual([]);
  });

  it("survives a corrupt value", () => {
    expect(parseAddressBook("{nope")).toEqual([]);
  });

  it("drops an entry missing a field the shipping label needs", () => {
    const raw = JSON.stringify({
      v: 1,
      list: [{ id: "a", recipient: "X", phone: "0912345678", line: "Y" }],
    });
    expect(parseAddressBook(raw)).toEqual([]);
  });

  it("keeps an entry written before labels existed, and calls it Nhà", () => {
    // Everything a parcel needs is in the record; only the nickname is
    // missing, and that is the one field a screen can supply a default for.
    const raw = JSON.stringify({
      v: 1,
      list: [
        {
          id: "old-1",
          recipient: "Trần Minh Anh",
          phone: "0912345678",
          provinceCode: "29",
          wardCode: "70101063",
          line: "24 Nguyễn Thị Minh Khai",
          isDefault: false,
          source: "device",
        },
      ],
    });
    expect(parseAddressBook(raw)).toHaveLength(1);
    expect(parseAddressBook(raw)[0]!.label).toBe("Nhà");
  });

  it("replaces a label this build does not know", () => {
    const raw = JSON.stringify({
      v: 1,
      list: [{ ...DRAFT, id: "a", source: "device", label: "Nhà riêng" }],
    });
    expect(parseAddressBook(raw)[0]!.label).toBe("Nhà");
  });

  it("discards a payload written by an older schema", () => {
    expect(parseAddressBook(JSON.stringify([{ id: "a" }]))).toEqual([]);
  });
});
