import { describe, it, expect } from "vitest";
import {
  PROVINCES,
  allWards,
  findWard,
  compareByName,
  formatAddressLine,
  provinceLabel,
  wardLabel,
  wardsIn,
  provincesByName,
} from "./regions";

/**
 * The counts asserted here are the official post-reform figures, confirmed
 * against government listings before the dataset was trusted. They are the
 * tripwire: if the fixture is ever swapped for a stale one, these fail.
 */
describe("the provincial tier", () => {
  it("has the 34 units the country was reorganised into", () => {
    expect(PROVINCES).toHaveLength(34);
  });

  it("splits into 6 centrally-governed cities and 28 provinces", () => {
    expect(PROVINCES.filter((p) => p.kind === "CITY")).toHaveLength(6);
    expect(PROVINCES.filter((p) => p.kind === "PROVINCE")).toHaveLength(28);
  });

  it("names the six cities", () => {
    const cities = PROVINCES.filter((p) => p.kind === "CITY").map((p) => p.name);
    expect(new Set(cities)).toEqual(
      new Set([
        "Hà Nội",
        "Huế",
        "TP. Cần Thơ",
        "TP. Hải Phòng",
        "TP. Hồ Chí Minh",
        "TP. Đà Nẵng",
      ]),
    );
  });

  it("holds none of the units dissolved in the 2025 merger", () => {
    // Bình Dương and Bà Rịa – Vũng Tàu folded into TP. Hồ Chí Minh, Quảng Nam
    // into Đà Nẵng, Hà Nam into Ninh Bình. A stale fixture still offers them.
    const names = PROVINCES.map((p) => p.name);
    for (const gone of ["Bình Dương", "Bà Rịa - Vũng Tàu", "Quảng Nam", "Hà Nam"]) {
      expect(names, `${gone} no longer exists`).not.toContain(gone);
    }
  });

  it("keeps every code distinct", () => {
    expect(new Set(PROVINCES.map((p) => p.code)).size).toBe(PROVINCES.length);
  });
});

describe("the commune tier", () => {
  it("has all 3,321 units", () => {
    expect(allWards()).toHaveLength(3321);
  });

  it("breaks down into 687 phường, 2.621 xã and 13 đặc khu", () => {
    const all = allWards();
    expect(all.filter((w) => w.kind === "WARD")).toHaveLength(687);
    expect(all.filter((w) => w.kind === "COMMUNE")).toHaveLength(2621);
    expect(all.filter((w) => w.kind === "SPECIAL_ZONE")).toHaveLength(13);
  });

  it("keeps every code distinct nationwide", () => {
    const codes = allWards().map((w) => w.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("leaves no province with an empty dropdown", () => {
    for (const p of PROVINCES) {
      expect(wardsIn(p.code).length, `${p.name} has no communes`).toBeGreaterThan(0);
    }
  });

  it("carries 168 units for TP. Hồ Chí Minh and 126 for Hà Nội", () => {
    // Both figures were read off the government listings independently of
    // the dataset, which is what makes them worth asserting.
    const hcm = PROVINCES.find((p) => p.name === "TP. Hồ Chí Minh")!;
    const hn = PROVINCES.find((p) => p.name === "Hà Nội")!;
    expect(wardsIn(hcm.code)).toHaveLength(168);
    expect(wardsIn(hn.code)).toHaveLength(126);
  });

  it("holds none of the abolished districts as if they were communes", () => {
    const names = allWards().map((w) => w.name);
    for (const gone of ["Quận 1", "Quận 3", "Quận Gò Vấp", "Quận Ba Đình"]) {
      expect(names, `${gone} was a district, not a commune`).not.toContain(gone);
    }
  });

  it("strips the type off the name so the UI decides how to say it", () => {
    for (const w of allWards().slice(0, 200)) {
      expect(w.name.startsWith("Phường ")).toBe(false);
      expect(w.name.startsWith("Xã ")).toBe(false);
    }
  });
});

describe("looking things up", () => {
  it("finds a commune inside its own province", () => {
    expect(findWard("29", "70101063")?.name).toBe("Sài Gòn");
  });

  it("does not find it under a different province", () => {
    expect(findWard("01", "70101063")).toBeUndefined();
  });

  it("returns nothing for a code that is not there, rather than throwing", () => {
    expect(wardsIn("nope")).toEqual([]);
    expect(findWard("nope", "nope")).toBeUndefined();
  });
});

describe("labels", () => {
  it("says the unit type out loud, since the name alone is ambiguous", () => {
    const hcm = wardsIn("29");
    const saigon = hcm.find((w) => w.name === "Sài Gòn")!;
    const cuchi = hcm.find((w) => w.name === "Củ Chi")!;
    const condao = hcm.find((w) => w.kind === "SPECIAL_ZONE")!;
    expect(wardLabel(saigon)).toBe("Phường Sài Gòn");
    expect(wardLabel(cuchi)).toBe("Xã Củ Chi");
    expect(wardLabel(condao)).toBe("Đặc khu Côn Đảo");
  });

  it("prefixes a province but not a city that already reads as one", () => {
    expect(provinceLabel(PROVINCES.find((p) => p.name === "Khánh Hòa")!))
      .toBe("Tỉnh Khánh Hòa");
    expect(provinceLabel(PROVINCES.find((p) => p.name === "TP. Hồ Chí Minh")!))
      .toBe("TP. Hồ Chí Minh");
  });
});

describe("formatAddressLine", () => {
  it("reads smallest to largest, with no district in between any more", () => {
    expect(
      formatAddressLine({
        line: "24 Nguyễn Thị Minh Khai",
        wardCode: "70101063",
        provinceCode: "29",
      }),
    ).toBe("24 Nguyễn Thị Minh Khai, Phường Sài Gòn, TP. Hồ Chí Minh");
  });

  it("shortens rather than leaking an id when part is unknown", () => {
    expect(
      formatAddressLine({
        line: "24 Nguyễn Thị Minh Khai",
        wardCode: "nope",
        provinceCode: "29",
      }),
    ).toBe("24 Nguyễn Thị Minh Khai, TP. Hồ Chí Minh");
  });
});

describe("sorting for a dropdown", () => {
  it("orders Vietnamese names the way a reader expects, not by code unit", () => {
    // The default sort puts "Huế" before "Hà Nội" because "u" < "à" as code
    // units. A shopper hunting for their province in a list of thirty-four
    // reads that as broken.
    const names = provincesByName().map((p) => p.name);
    expect(names.indexOf("Hà Nội")).toBeLessThan(names.indexOf("Huế"));
    expect(names.indexOf("Cà Mau")).toBeLessThan(names.indexOf("Cao Bằng"));
  });

  it("keeps PROVINCES itself in official order, which is also information", () => {
    expect(PROVINCES[0]!.name).toBe("Hà Nội");
    expect(provincesByName()).not.toBe(PROVINCES);
    expect(provincesByName()).toHaveLength(PROVINCES.length);
  });

  it("treats đ as its own letter, after d and before e", () => {
    // Not a diacritic on d — đ is a separate letter of the Vietnamese
    // alphabet, and a collator that folded it into d would file Đồng Nai
    // among the D names where nobody looks for it.
    expect(compareByName({ name: "Đà Nẵng" }, { name: "Da Nang" })).toBeGreaterThan(0);
    expect(compareByName({ name: "Đà Nẵng" }, { name: "Gia Lai" })).toBeLessThan(0);
  });

  it("folds tone marks together, so Hòa and Hoa sit next to each other", () => {
    expect(compareByName({ name: "Hòa Bình" }, { name: "Hoa Binh" })).toBe(0);
  });
});
