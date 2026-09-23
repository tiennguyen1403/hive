import { describe, it, expect } from "vitest";
import {
  addressBookFor,
  defaultAddress,
  parseAddressBook,
  removeAddress,
  saveAddress,
  serializeAddressBook,
  type SavedAddress,
} from "./address-book";
import { CUSTOMERS } from "@/data/customers";

const ME = CUSTOMERS[0]!;

const DRAFT = {
  recipient: "Trần Minh Anh",
  phone: "0912345678",
  provinceCode: "29",
  wardCode: "70101063",
  line: "24 Nguyễn Thị Minh Khai",
  label: "Nhà" as const,
  isDefault: false,
};

describe("addressBookFor", () => {
  it("starts from the addresses the account already has", () => {
    const book = addressBookFor(ME, []);
    expect(book).toHaveLength(ME.addresses.length);
    expect(book[0]!.line).toBe(ME.addresses[0]!.line);
  });

  it("marks the seeded ones as coming from the account, not the device", () => {
    expect(addressBookFor(ME, []).every((a) => a.source === "account")).toBe(true);
  });

  it("carries each address's OWN label rather than calling them all Nhà", () => {
    // Trần Minh Anh keeps two: home, and the office. Before v3 slice 3 both
    // rendered as "Nhà · Trần Minh Anh · 0912 345 678" and the picker gave
    // no way to tell one from the other.
    expect(addressBookFor(ME, []).map((a) => a.label)).toEqual(["Nhà", "Công ty"]);
  });

  it("appends the ones saved on this device", () => {
    const mine: SavedAddress[] = [{ ...DRAFT, id: "local-1", source: "device" }];
    const book = addressBookFor(ME, mine);
    expect(book).toHaveLength(ME.addresses.length + 1);
    expect(book.at(-1)!.source).toBe("device");
  });

  it("lets a device address replace a seeded one with the same id", () => {
    // Editing a seeded address writes a device copy under its id. Showing
    // both would leave the shopper looking at two versions of one place.
    const seeded = ME.addresses[0]!;
    const edited: SavedAddress[] = [
      { ...DRAFT, id: seeded.id, source: "device", line: "Số mới" },
    ];
    const book = addressBookFor(ME, edited);
    expect(book).toHaveLength(ME.addresses.length);
    expect(book.find((a) => a.id === seeded.id)!.line).toBe("Số mới");
  });
});

describe("addressBookFor · exactly one default", () => {
  it("lets a device default override the one the account came with", () => {
    // The seeded address carries `isDefault: true` from the fixture and is
    // not in the device list, so clearing the flag inside `saveAddress` does
    // not reach it. Merged, both claimed to be the address checkout
    // prefills — and `defaultAddress` picked the seeded one, so saving a
    // new default appeared to do nothing.
    const mine: SavedAddress[] = [
      { ...DRAFT, id: "local-1", source: "device", isDefault: true, line: "Chỗ mới" },
    ];
    const book = addressBookFor(ME, mine);
    expect(book.filter((a) => a.isDefault)).toHaveLength(1);
    expect(defaultAddress(book)!.line).toBe("Chỗ mới");
  });

  it("leaves the account's default alone when no device entry claims it", () => {
    const mine: SavedAddress[] = [{ ...DRAFT, id: "local-1", source: "device" }];
    const book = addressBookFor(ME, mine);
    expect(book.filter((a) => a.isDefault)).toHaveLength(1);
    expect(defaultAddress(book)!.source).toBe("account");
  });

  it("never returns two defaults, whatever the seeded data says", () => {
    const book = addressBookFor(ME, []);
    expect(book.filter((a) => a.isDefault).length).toBeLessThanOrEqual(1);
  });
});

describe("defaultAddress", () => {
  it("returns the one marked default", () => {
    expect(defaultAddress(addressBookFor(ME, []))?.isDefault).toBe(true);
  });

  it("falls back to the first when none is marked", () => {
    const book = addressBookFor(ME, []).map((a) => ({ ...a, isDefault: false }));
    expect(defaultAddress(book)?.id).toBe(book[0]!.id);
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
