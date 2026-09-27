import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OUT, SOURCE_DIR, parseIcon, readIcons, renderIconModule } from "./feed-icons";

/**
 * The anti-drift catch, as `scripts/brand-assets.test.ts` does for the logo
 * data: a generated file nobody checks quietly stops matching its source.
 */
describe("what the script generated", () => {
  it("components/feed/icon/paths.ts is exactly what the mock's icon folder gives", () => {
    expect(readFileSync(OUT, "utf8"), "run `npx tsx scripts/feed-icons.ts`").toBe(renderIconModule(readIcons()));
  });

  it("carries every file of the folder, the -fill weights included", () => {
    const files = readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".svg"));
    const names = readIcons().map((i) => i.name);
    expect(files).toHaveLength(69);
    expect(names).toHaveLength(files.length);
    expect(names.filter((n) => n.endsWith("-fill"))).toEqual([
      "bag-fill",
      "bell-fill",
      "check-circle-fill",
      "fire-fill",
      "heart-fill",
      "house-fill",
      "magnifying-glass-fill",
      "package-fill",
      "user-fill",
    ]);
  });
});

describe("parseIcon", () => {
  const phosphor = (d: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="${d}"/></svg>`;

  it("takes the one path of a file shaped as Phosphor ships it", () => {
    expect(parseIcon("minus", phosphor("M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z"))).toEqual({
      name: "minus",
      d: "M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z",
    });
  });

  it("refuses a second path, another grid or a fixed colour, naming the file", () => {
    const two = phosphor("M0,0H8Z").replace("</svg>", '<path d="M8,8H16Z"/></svg>');
    expect(() => parseIcon("two", two)).toThrow(/two\.svg/);
    expect(() => parseIcon("grid", phosphor("M0,0H8Z").replace("0 0 256 256", "0 0 24 24"))).toThrow(/grid\.svg/);
    expect(() => parseIcon("ink", phosphor("M0,0H8Z").replace("currentColor", "#111214"))).toThrow(/ink\.svg/);
  });
});
