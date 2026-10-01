import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import { FAMILY_LABELS } from "@/data/types";
import { buildCatalog } from "./catalog";
import { PHOTO_KEYS, isUploadedKey } from "./photos";
import { kindOptions, photoKeys, teaserBlocker, teaserName } from "./teaser-form";

/**
 * "Thêm mẫu hé lộ"'s pure parts (round v5 slice 4), moved from v3's
 * `TeaserFormSheet`: the kinds the catalogue uses, each with its family as the
 * note, the borrowed photos, and what the button says is still missing.
 */

describe("kindOptions", () => {
  const options = kindOptions(FIXTURE_CATALOG);

  it("offers every kind the catalogue uses, once, and nothing else", () => {
    const kinds = new Set(FIXTURE_CATALOG.products.map((p) => p.kind));
    expect(options.map((o) => o.value).sort()).toEqual([...kinds].sort());
    expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
  });

  it("names each kind by itself and notes its family, as the catalogue files it", () => {
    for (const o of options) {
      expect(o.label).toBe(o.value);
      const family = FIXTURE_CATALOG.products.find((p) => p.kind === o.value)!.family;
      expect(o.note).toBe(FAMILY_LABELS[family]);
    }
    expect(options).toContainEqual({ value: "Áo khoác dù", label: "Áo khoác dù", note: "Áo khoác" });
  });

  it("is in Vietnamese alphabetical order", () => {
    const sorted = [...options].sort((a, b) => a.value.localeCompare(b.value, "vi"));
    expect(options).toEqual(sorted);
    expect(options[0]!.value.startsWith("Áo")).toBe(true);
    expect(options.at(-1)!.value.startsWith("Quần")).toBe(true);
  });
});

describe("photoKeys", () => {
  it("offers only the borrowed frames the catalogue already uses, once each", () => {
    const keys = photoKeys(FIXTURE_CATALOG);
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) {
      expect(PHOTO_KEYS).toContain(k);
      expect(FIXTURE_CATALOG.products.some((p) => p.photoKeys.includes(k))).toBe(true);
    }
  });

  it("leaves out an uploaded photo, a shot and a flat drawing", () => {
    const [first, ...rest] = FIXTURE_CATALOG.products;
    const upload = "up/0123456789abcdef0123456789abcdef.webp";
    expect(isUploadedKey(upload)).toBe(true);
    const catalog = buildCatalog({
      products: [{ ...first!, photoKeys: [upload, "shot-khoi-black", "flat-tee-white", ...first!.photoKeys] }, ...rest],
      drops: [...FIXTURE_CATALOG.drops],
      teasers: [...FIXTURE_CATALOG.teasers],
      promotions: [...FIXTURE_CATALOG.promotions],
    });
    const keys = photoKeys(catalog);
    expect(keys).not.toContain(upload);
    expect(keys).not.toContain("shot-khoi-black");
    expect(keys).not.toContain("flat-tee-white");
    expect(keys).toEqual(photoKeys(FIXTURE_CATALOG));
  });
});

describe("teaserName", () => {
  it("trims the name and writes it in capitals, Vietnamese marks and all", () => {
    expect(teaserName("  sỏi ")).toBe("SỎI");
    expect(teaserName("ngói")).toBe("NGÓI");
    expect(teaserName("đá")).toBe("ĐÁ");
    expect(teaserName("   ")).toBe("");
  });
});

describe("teaserBlocker", () => {
  it("names the first thing still missing, in the form's order", () => {
    expect(teaserBlocker("", null, null)).toBe("Nhập tên mẫu");
    expect(teaserBlocker("", "Áo khoác dù", "reu")).toBe("Nhập tên mẫu");
    expect(teaserBlocker("SỎI", null, "reu")).toBe("Chọn loại");
    expect(teaserBlocker("SỎI", "Áo khoác dù", null)).toBe("Chọn ảnh");
  });

  it("is null once the name, the kind and the photo are all there", () => {
    expect(teaserBlocker("SỎI", "Áo khoác dù", "reu")).toBeNull();
  });
});
