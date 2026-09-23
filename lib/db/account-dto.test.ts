import { describe, expect, it } from "vitest";
import { toAddress, toMe, type AddressRow, type ProfileRow } from "./account-dto";

/**
 * The mappers, on their own. They are the seam between a Postgres row and
 * `data/types.ts`, and the two things that can go wrong there — a timestamp
 * that loses its offset and a label the build does not know — are both silent
 * at runtime.
 *
 * No database: this file is in `npm test` on purpose, and the module it tests
 * deliberately carries no `server-only` marker for exactly that reason.
 */

const PROFILE: ProfileRow = {
  id: "7a40b83b-aeb3-465f-b632-d28a1e2943af",
  handle: "c-minhanh",
  name: "Trần Minh Anh",
  email: "minhanh@email.com",
  phone: "0912345678",
  joined_at: "2026-03-08T14:14:00+00:00",
};

const ADDRESS: AddressRow = {
  id: "2b8a0e64-7c1f-4a7f-9b6d-8a3c2d1e0f55",
  recipient: "Trần Minh Anh",
  phone: "0912345678",
  line: "24 Nguyễn Thị Minh Khai",
  province_code: "29",
  ward_code: "70101063",
  label: "Công ty",
  is_default: true,
};

describe("toMe", () => {
  it("keeps the uuid and the fixture handle apart", () => {
    const me = toMe(PROFILE);
    expect(String(me.id)).toBe(PROFILE.id);
    expect(String(me.handle)).toBe("c-minhanh");
  });

  it("has no handle for an account somebody made themselves", () => {
    expect(toMe({ ...PROFILE, handle: null }).handle).toBeNull();
  });

  it("puts the Vietnamese offset back on the timestamp", () => {
    // PostgREST normalises `timestamptz` to the connection's offset, usually
    // UTC. Every formatter in `lib/datetime.ts` reads the offset out of the
    // text, so a `+00:00` string would print 08/03 as 07/03 at 21:14.
    expect(toMe(PROFILE).joinedAt).toBe("2026-03-08T21:14:00+07:00");
  });

  it("leaves a timestamp it cannot read alone rather than inventing one", () => {
    expect(toMe({ ...PROFILE, joined_at: "not a date" }).joinedAt).toBe("not a date");
  });

  it("carries an empty phone through — a new account has not given one", () => {
    expect(toMe({ ...PROFILE, phone: "" }).phone).toBe("");
  });
});

describe("toAddress", () => {
  it("renames the columns and keeps every value", () => {
    expect(toAddress(ADDRESS)).toEqual({
      id: ADDRESS.id,
      recipient: "Trần Minh Anh",
      phone: "0912345678",
      line: "24 Nguyễn Thị Minh Khai",
      provinceCode: "29",
      wardCode: "70101063",
      label: "Công ty",
      isDefault: true,
    });
  });

  it("falls back to the label the form starts on rather than dropping a row", () => {
    // A street address is worth more than a nickname. Same rule
    // `parseAddressBook` applies to a stored entry written by an older build.
    expect(toAddress({ ...ADDRESS, label: "nhà riêng" }).label).toBe("Nhà");
  });

  it("accepts all three labels the app knows", () => {
    for (const label of ["Nhà", "Công ty", "Khác"]) {
      expect(toAddress({ ...ADDRESS, label }).label).toBe(label);
    }
  });
});
