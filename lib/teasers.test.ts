import { describe, expect, it } from "vitest";
import { TEASERS } from "@/data/catalog";
import { asciiSlug } from "./teasers";

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
