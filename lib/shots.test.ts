import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATALOG } from "@/data/catalog";
import { isFlatKey } from "./flats";
import { isRealPhotoKey, isUploadedKey, lookbookUrl, photoUrl } from "./photos";
import { SHOTS, SHOT_DIR, SHOT_KEYS, isShotKey, lookPath, shotKey, shotName, shotOf, shotPath } from "./shots";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A WebP file's canvas and its XMP packet, read from its RIFF chunks. */
function webp(bytes: Buffer): { width: number; height: number; xmp: string | null } {
  expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
  expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  let width = 0;
  let height = 0;
  let xmp: string | null = null;
  for (let p = 12; p + 8 <= bytes.length; ) {
    const type = bytes.toString("ascii", p, p + 4);
    const size = bytes.readUInt32LE(p + 4);
    const data = bytes.subarray(p + 8, p + 8 + size);
    if (type === "VP8X") {
      width = data.readUIntLE(4, 3) + 1;
      height = data.readUIntLE(7, 3) + 1;
    }
    if (type === "XMP ") xmp = data.toString("utf8");
    p += 8 + size + (size % 2);
  }
  return { width, height, xmp };
}

/** The text of one XMP element, or null. */
const field = (xmp: string, name: string) => new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xmp)?.[1] ?? null;

describe("the shots", () => {
  it("are Số 05's twenty-one colourways, each with its lookbook frame", () => {
    expect(SHOTS).toHaveLength(21);
    expect(SHOTS.every((s) => s.look)).toBe(true);
    expect(new Set(SHOT_KEYS).size).toBe(21);
  });

  it("name every colourway of Số 05 in the catalogue, in band order, and nothing else", () => {
    const issue = CATALOG.filter((p) => p.dropNo === 5);
    expect(issue).toHaveLength(10);
    const named: string[] = [];
    for (const p of issue) {
      const stem = p.id.slice("p-".length);
      p.colors.forEach((c, i) => {
        expect(p.photoKeys[i], `${p.slug} ${c}`).toBe(shotKey(stem, c));
        expect(isShotKey(p.photoKeys[i]!), `${p.slug} ${c}`).toBe(true);
        named.push(p.photoKeys[i]!);
      });
    }
    expect(named).toEqual(SHOT_KEYS);
  });

  it("are the only shots in the catalogue: no other issue and no fixed style wears one", () => {
    for (const p of CATALOG.filter((x) => x.dropNo !== 5)) {
      for (const k of p.photoKeys) expect(isShotKey(k), `${p.slug} ${k}`).toBe(false);
    }
  });

  it("read back to their style and colour, and to the two files of the app", () => {
    expect(shotKey("khoi", "black")).toBe("shot-khoi-black");
    expect(shotOf("shot-cat-brown")).toEqual({ style: "cat", color: "brown", look: true });
    expect(shotPath("shot-khoi-black")).toBe("/shots/khoi-black.webp");
    expect(lookPath("shot-khoi-black")).toBe("/shots/khoi-black-look.webp");
    expect(SHOT_DIR).toBe("/shots");
  });

  it("know nothing else — no path for a colour never photographed, a flat, a borrowed frame or an upload", () => {
    for (const key of ["shot-khoi-moss", "shot-reu-moss", "shot-khoi", "shot-", "khoi", "flat-tee-white", `up/${"a".repeat(32)}.webp`, ""]) {
      expect(isShotKey(key), key).toBe(false);
      expect(shotOf(key), key).toBeNull();
      expect(shotPath(key), key).toBeNull();
      expect(lookPath(key), key).toBeNull();
    }
  });

  it("are never mistaken for an upload or a flat", () => {
    for (const k of SHOT_KEYS) {
      expect(isUploadedKey(k), k).toBe(false);
      expect(isFlatKey(k), k).toBe(false);
    }
  });
});

describe("photoUrl and lookbookUrl · the shots (v3 slice 14)", () => {
  it("serve a colour's packshot from the app's own folder, whatever width is asked", () => {
    expect(photoUrl("shot-khoi-black", 760, 72)).toBe("/shots/khoi-black.webp");
    expect(photoUrl("shot-da-moss", 120)).toBe("/shots/da-moss.webp");
    for (const k of SHOT_KEYS) expect(photoUrl(k, 520)).toBe(shotPath(k));
  });

  it("give the lookbook frame of a shot, and nothing for any other kind of key", () => {
    expect(lookbookUrl("shot-nang-moss")).toBe("/shots/nang-moss-look.webp");
    for (const key of ["reu", "hero", "flat-tee-white", `up/${"b".repeat(32)}.webp`, "shot-khoi-moss"]) {
      expect(lookbookUrl(key), key).toBeNull();
    }
  });

  it("let a shot that was never made fall back to the hero frame, like any unknown key", () => {
    for (const key of ["shot-khoi-moss", "shot-soi-black", "shot-"]) {
      expect(photoUrl(key, 120), key).toBe(photoUrl("hero", 120));
    }
  });

  it("count a shot as a real photo, as the back office labels it — and a borrowed frame or a flat not", () => {
    expect(isRealPhotoKey("shot-khoi-black")).toBe(true);
    expect(isRealPhotoKey(`up/${"c".repeat(32)}.jpg`)).toBe(true);
    for (const key of ["khoi", "reu", "hero", "flat-tee-white", "shot-khoi-moss"]) {
      expect(isRealPhotoKey(key), key).toBe(false);
    }
  });
});

describe("the files scripts/shots.ts wrote", () => {
  const dir = join(ROOT, "public", SHOT_DIR);

  it("hold a 1200 × 1500 WebP per packshot and per lookbook frame, each carrying its provenance", () => {
    for (const shot of SHOTS) {
      const name = shotName(shot);
      const files = [
        { file: `${name}.webp`, source: `${name}.png` },
        ...(shot.look ? [{ file: `${name}-look.webp`, source: `${name}-street.png` }] : []),
      ];
      for (const { file, source } of files) {
        const path = join(dir, file);
        expect(existsSync(path), `${path} — run \`npx tsx scripts/shots.ts ${name}\``).toBe(true);
        const img = webp(readFileSync(path));
        expect([img.width, img.height], file).toEqual([1200, 1500]);
        expect(img.xmp, `${file} carries no XMP`).not.toBeNull();
        const xmp = img.xmp!;
        expect(field(xmp, "Iptc4xmpExt:DigitalSourceType"), file).toBe(
          "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
        );
        expect(field(xmp, "xmp:CreatorTool"), file).toBe("ChatGPT (GPT Image)");
        expect(field(xmp, "dc:source"), file).toBe(source);
        expect(field(xmp, "dc:description"), file).toContain("prompt như ghi trong tệp prompt của dự án");
        expect(field(xmp, "Iptc4xmpExt:AIPromptInformation")?.length ?? 0, file).toBeGreaterThan(200);
      }
    }
  });

  it("hold nothing the list does not name", () => {
    const named = new Set(SHOTS.flatMap((s) => [`${shotName(s)}.webp`, ...(s.look ? [`${shotName(s)}-look.webp`] : [])]));
    for (const file of readdirSync(dir)) expect(named.has(file), file).toBe(true);
  });
});
