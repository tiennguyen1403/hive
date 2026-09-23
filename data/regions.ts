import wardsByProvince from "./wards.json";

/**
 * Vietnam's administrative units, TWO TIERS.
 *
 * Since 1 July 2025 the country has two levels: cấp tỉnh (34 units — 6 cities
 * under central authority and 28 provinces) and cấp xã (3,321 units — 687
 * phường, 2,621 xã, 13 đặc khu). The district level in between was abolished,
 * so the Tỉnh → Quận/Huyện → Phường/Xã cascade this project started with no
 * longer describes a real address, and `Address` has no `districtCode`.
 *
 * Data comes from a public post-reform dataset, cross-checked before use
 * against the government listings: Hà Nội's 126 units and the six
 * centrally-governed cities both match. The per-unit ids are that dataset's
 * own and are stable and unique, but they have not been verified against the
 * official statistical register — a courier integration should confirm them.
 *
 * The 3,321 communes live in `wards.json`, keyed by province, NOT inlined
 * here. Keyed so one province's list is a single lookup, and separate so a
 * client bundle can avoid pulling in all thirty-four provinces to render one
 * dropdown.
 */

export type ProvinceKind = "CITY" | "PROVINCE";
export type WardKind = "WARD" | "COMMUNE" | "SPECIAL_ZONE";

export interface Province {
  code: string;
  name: string;
  kind: ProvinceKind;
}

export interface Ward {
  code: string;
  name: string;
  kind: WardKind;
}

/** How each unit type is spoken in an address. */
const WARD_PREFIX: Record<WardKind, string> = {
  WARD: "Phường",
  COMMUNE: "Xã",
  SPECIAL_ZONE: "Đặc khu",
};

export const PROVINCES: Province[] = [
  { code: "01", name: "Hà Nội", kind: "CITY" },
  { code: "02", name: "Bắc Ninh", kind: "PROVINCE" },
  { code: "03", name: "Quảng Ninh", kind: "PROVINCE" },
  { code: "04", name: "TP. Hải Phòng", kind: "CITY" },
  { code: "05", name: "Hưng Yên", kind: "PROVINCE" },
  { code: "06", name: "Ninh Bình", kind: "PROVINCE" },
  { code: "07", name: "Cao Bằng", kind: "PROVINCE" },
  { code: "08", name: "Tuyên Quang", kind: "PROVINCE" },
  { code: "09", name: "Lào Cai", kind: "PROVINCE" },
  { code: "10", name: "Thái Nguyên", kind: "PROVINCE" },
  { code: "11", name: "Lạng Sơn", kind: "PROVINCE" },
  { code: "12", name: "Phú Thọ", kind: "PROVINCE" },
  { code: "13", name: "Điện Biên", kind: "PROVINCE" },
  { code: "14", name: "Lai Châu", kind: "PROVINCE" },
  { code: "15", name: "Sơn La", kind: "PROVINCE" },
  { code: "16", name: "Thanh Hóa", kind: "PROVINCE" },
  { code: "17", name: "Nghệ An", kind: "PROVINCE" },
  { code: "18", name: "Hà Tĩnh", kind: "PROVINCE" },
  { code: "19", name: "Quảng Trị", kind: "PROVINCE" },
  { code: "20", name: "Huế", kind: "CITY" },
  { code: "21", name: "TP. Đà Nẵng", kind: "CITY" },
  { code: "22", name: "Quảng Ngãi", kind: "PROVINCE" },
  { code: "23", name: "Khánh Hòa", kind: "PROVINCE" },
  { code: "24", name: "Gia Lai", kind: "PROVINCE" },
  { code: "25", name: "Đắk Lắk", kind: "PROVINCE" },
  { code: "26", name: "Lâm Đồng", kind: "PROVINCE" },
  { code: "27", name: "Tây Ninh", kind: "PROVINCE" },
  { code: "28", name: "Đồng Nai", kind: "PROVINCE" },
  { code: "29", name: "TP. Hồ Chí Minh", kind: "CITY" },
  { code: "30", name: "Vĩnh Long", kind: "PROVINCE" },
  { code: "31", name: "Đồng Tháp", kind: "PROVINCE" },
  { code: "32", name: "An Giang", kind: "PROVINCE" },
  { code: "33", name: "TP. Cần Thơ", kind: "CITY" },
  { code: "34", name: "Cà Mau", kind: "PROVINCE" },
];

const WARDS_BY_PROVINCE = wardsByProvince as Record<string, Ward[]>;

const provinceByCode = new Map(PROVINCES.map((p) => [p.code, p]));

export const findProvince = (code: string) => provinceByCode.get(code);

/**
 * Vietnamese collation for the dropdowns.
 *
 * The default sort compares UTF-16 code units, which puts "Hue" before
 * "Ha Noi" because u < a-with-grave by code point. A shopper scanning
 * thirty-four provinces for theirs reads that as a broken list.
 *
 * PROVINCES and each province ward list stay in official order, which is
 * meaningful; these return a copy sorted for someone hunting by name.
 */
const collator = new Intl.Collator("vi", { sensitivity: "base", numeric: true });

export function compareByName(a: { name: string }, b: { name: string }): number {
  return collator.compare(a.name, b.name);
}

export function provincesByName(): Province[] {
  return [...PROVINCES].sort(compareByName);
}

export function wardsInByName(provinceCode: string): Ward[] {
  return [...wardsIn(provinceCode)].sort(compareByName);
}

export function wardsIn(provinceCode: string): Ward[] {
  return WARDS_BY_PROVINCE[provinceCode] ?? [];
}

export function findWard(provinceCode: string, wardCode: string): Ward | undefined {
  return wardsIn(provinceCode).find((w) => w.code === wardCode);
}

/** Every commune-level unit in the country. Server side only — 3,321 rows. */
export function allWards(): Array<Ward & { provinceCode: string }> {
  return PROVINCES.flatMap((p) =>
    wardsIn(p.code).map((w) => ({ ...w, provinceCode: p.code })),
  );
}

/** "Phường Sài Gòn", "Xã Củ Chi", "Đặc khu Côn Đảo". */
export function wardLabel(w: Ward): string {
  return `${WARD_PREFIX[w.kind]} ${w.name}`;
}

/** "TP. Hồ Chí Minh" as-is; a province gets its "Tỉnh". */
export function provinceLabel(p: Province): string {
  return p.kind === "CITY" ? p.name : `Tỉnh ${p.name}`;
}

/**
 * One line, smallest unit first — how a Vietnamese address is written and how
 * a courier reads it. Unknown codes are dropped rather than rendered raw, so
 * a half-filled address degrades into a shorter line instead of leaking an id
 * onto a shipping label.
 */
export function formatAddressLine(a: {
  line: string;
  wardCode: string;
  provinceCode: string;
}): string {
  const p = findProvince(a.provinceCode);
  const w = findWard(a.provinceCode, a.wardCode);
  return [a.line, w && wardLabel(w), p && provinceLabel(p)]
    .filter(Boolean)
    .join(", ");
}
