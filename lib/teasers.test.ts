import { describe, expect, it } from "vitest";
import { TEASERS } from "@/data/catalog";
import { asciiSlug, teaserSlug } from "./teasers";

describe("asciiSlug", () => {
  it("writes a name the way the catalogue writes its own slugs", () => {
    expect(asciiSlug("KHÓI")).toBe("khoi");
    expect(asciiSlug("SƯƠNG")).toBe("suong");
    expect(asciiSlug("NGUỘI")).toBe("nguoi");
  });

  it("maps Đ by hand, since it has no mark to strip", () => {
    expect(asciiSlug("ĐÁ CUỘI")).toBe("da-cuoi");
    expect(asciiSlug("đất")).toBe("dat");
  });

  it("joins words with one dash and trims the ends", () => {
    expect(asciiSlug("  áo   khoác  dù  ")).toBe("ao-khoac-du");
    expect(asciiSlug("--KHÓI--")).toBe("khoi");
  });

  it("is empty when nothing survives", () => {
    expect(asciiSlug("!!!")).toBe("");
  });

  it("always yields what the database accepts, or nothing", () => {
    for (const t of TEASERS) expect(asciiSlug(t.name)).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("teaserSlug", () => {
  it("gets English letters derived from the name, and the issue", () => {
    expect(teaserSlug("SỎI", 6)).toBe("soi-6");
    expect(teaserSlug("ĐÁ CUỘI", 7)).toBe("da-cuoi-7");
  });

  it("is the same slug for the same teaser added twice", () => {
    expect(teaserSlug("THỬ", 6)).toBe(teaserSlug("thử", 6));
  });

  it("falls back to a word when the name has no letters", () => {
    expect(teaserSlug("!!!", 6)).toBe("mau-6");
  });

  it("never collides with a fixture teaser's own slug", () => {
    // The fixture's two were written by hand without the issue number, so a
    // teaser announced here under the same name is a new row, not a clash.
    for (const t of TEASERS) expect(teaserSlug(t.name, t.dropNo)).not.toBe(t.slug);
  });
});
