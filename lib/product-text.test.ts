import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG } from "@/data/fixture-catalog";
import type { Product, Teaser } from "@/data/types";
import { productText, teaserText } from "./product-text";

const style = (id: string): Product => FIXTURE_CATALOG.byId.get(id as never)!;
const KHOI = style("p-khoi");
const TEE = style("p-ao-thun-tron");
const SOI = FIXTURE_CATALOG.teasers.find((t) => t.slug === "s06-soi")!;

describe("productText", () => {
  it("prints the Vietnamese in Vietnamese, whatever English the style has", () => {
    for (const p of FIXTURE_CATALOG.products) {
      const vi = productText(p, "vi");
      expect(vi, p.slug).toEqual({ name: p.name, kind: p.kind, material: p.material, details: p.details });
      expect(vi.details, p.slug).toBe(p.details);
    }
  });

  it("prints the English field by field, the Vietnamese name where an issue's style has no English one", () => {
    expect(productText(KHOI, "en")).toEqual({
      name: "KHÓI",
      kind: "Oversized tee",
      material: "Cotton 250gsm",
      details: KHOI.en!.details,
    });
    expect(productText(TEE, "en")).toEqual({ name: "PLAIN TEE", kind: "Tee", material: "Cotton 220gsm", details: [] });
  });

  it("falls back to the Vietnamese of exactly the field without English", () => {
    // What the back office leaves after renaming a fixed style: its name's English goes, the rest stays.
    const renamed: Product = { ...TEE, name: "PLAIN TEE V2", en: { kind: "Tee", material: "Cotton 220gsm" } };
    expect(productText(renamed, "en")).toEqual({ name: "PLAIN TEE V2", kind: "Tee", material: "Cotton 220gsm", details: [] });

    const kindChanged: Product = { ...KHOI, kind: "Áo thun cổ tròn", en: { material: "Cotton 250gsm", details: KHOI.en!.details } };
    expect(productText(kindChanged, "en")).toMatchObject({ name: "KHÓI", kind: "Áo thun cổ tròn", material: "Cotton 250gsm" });
    expect(productText(kindChanged, "en").details).toBe(KHOI.en!.details);
  });

  it("prints a style the back office just created, with no English at all, in Vietnamese in both languages", () => {
    const { en: _none, ...created } = TEE;
    expect(productText(created, "en")).toEqual(productText(created, "vi"));
  });

  it("takes the lines as a set: no English list, or an empty one, prints the Vietnamese lines", () => {
    const noLines: Product = { ...KHOI, en: { kind: "Oversized tee" } };
    expect(productText(noLines, "en").details).toBe(KHOI.details);
    const emptyLines: Product = { ...KHOI, en: { kind: "Oversized tee", details: [] } };
    expect(productText(emptyLines, "en").details).toBe(KHOI.details);
  });

  it("counts a blank English field as none", () => {
    const blank: Product = { ...TEE, en: { name: "  ", kind: "", material: "Cotton 220gsm" } };
    expect(productText(blank, "en")).toMatchObject({ name: "ÁO THUN TRƠN", kind: "Áo thun", material: "Cotton 220gsm" });
  });
});

describe("teaserText", () => {
  it("prints the Vietnamese in Vietnamese", () => {
    for (const t of FIXTURE_CATALOG.teasers) expect(teaserText(t, "vi")).toEqual({ name: t.name, kind: t.kind });
  });

  it("keeps the teaser's Vietnamese name in English and prints its English kind", () => {
    expect(teaserText(SOI, "en")).toEqual({ name: "SỎI", kind: "Nylon jacket" });
  });

  it("falls back field by field, and entirely for a teaser the back office added", () => {
    const named: Teaser = { ...SOI, en: { name: "TEST NAME" } };
    expect(teaserText(named, "en")).toEqual({ name: "TEST NAME", kind: "Áo khoác dù" });
    const { en: _none, ...added } = SOI;
    expect(teaserText(added, "en")).toEqual({ name: "SỎI", kind: "Áo khoác dù" });
  });
});
