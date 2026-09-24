import { describe, expect, it } from "vitest";
import { CATALOG, TEASERS } from "@/data/catalog";
import {
  MAX_UPLOAD_BYTES,
  PHOTO_KEYS,
  UPLOAD_KEY_RE,
  isUploadedKey,
  photoUrl,
  sniffImageType,
  uploadKey,
  uploadProblem,
  uploadTypeOf,
} from "./photos";

const HEX = "0123456789abcdef0123456789abcdef";

/** A 1×1 lossy WebP: `RIFF`, the size, `WEBP`, then a `VP8 ` chunk. */
const WEBP = Uint8Array.from(
  Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64"),
);
/** The first bytes of any JPEG: start of image, then a marker. */
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
/** The first bytes of a PNG, which the bucket does not take. */
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe("photoUrl", () => {
  it("serves an uploaded photo from the app's own origin, whatever width is asked", () => {
    expect(photoUrl(`up/${HEX}.webp`, 520)).toBe(`/photos/up/${HEX}.webp`);
    expect(photoUrl(`up/${HEX}.jpg`, 120, 60)).toBe(`/photos/up/${HEX}.jpg`);
  });

  it("leaves a borrowed key on Unsplash, with the width and quality asked for", () => {
    const url = photoUrl("khoi", 520, 72);
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
    expect(url).toContain("w=520");
    expect(url).toContain("q=72");
    expect(photoUrl("khong-co", 120)).toBe(photoUrl("hero", 120));
  });

  it("never turns a key of another shape into a path of this app", () => {
    for (const key of ["up/zz.webp", `up/${HEX}.png`, `up/../${HEX}.webp`, `x/up/${HEX}.webp`]) {
      expect(photoUrl(key, 120)).toMatch(/^https:\/\/images\.unsplash\.com\//);
    }
  });
});

describe("photoUrl · the fixed styles' flats (v3 slice 11)", () => {
  it("serves a flat from the app's own folder, whatever width is asked", () => {
    expect(photoUrl("flat-tee-white", 520)).toBe("/flats/tee-white.png");
    expect(photoUrl("flat-trousers-cream", 120, 60)).toBe("/flats/trousers-cream.png");
    expect(photoUrl("flat-longsleeve-black", 760, 72)).toBe("/flats/longsleeve-black.png");
  });

  it("has a file for every flat the catalogue names", () => {
    const flats = CATALOG.flatMap((p) => p.photoKeys).filter((k) => k.startsWith("flat-"));
    expect(flats).toHaveLength(17);
    for (const k of flats) expect(photoUrl(k, 520)).toBe(`/flats/${k.slice("flat-".length)}.png`);
  });

  it("lets a flat that was never drawn fall back like any unknown key", () => {
    for (const key of ["flat-tee-moss", "flat-cape-black", "flat-tee", "flat-", "tee-white"]) {
      expect(photoUrl(key, 120), key).toBe(photoUrl("hero", 120));
    }
  });

  it("keeps the flats out of the borrowed frames the back office picks from", () => {
    expect(PHOTO_KEYS.some((k) => k.startsWith("flat-"))).toBe(false);
  });
});

describe("isUploadedKey", () => {
  it("knows an upload by its shape: up/, 32 hex digits, .webp or .jpg", () => {
    expect(isUploadedKey(`up/${HEX}.webp`)).toBe(true);
    expect(isUploadedKey(`up/${HEX}.jpg`)).toBe(true);
  });

  it("refuses every other shape, and anything that is not a string", () => {
    for (const key of [
      "khoi",
      "up/zz.webp",
      `up/${HEX.toUpperCase()}.webp`,
      `up/${HEX}.jpeg`,
      `up/${HEX}.png`,
      `up/${HEX}.webp/x`,
      `/up/${HEX}.webp`,
      `up/../${HEX}.webp`,
      `up/${HEX.slice(1)}.webp`,
      "",
      42,
      null,
    ]) {
      expect(isUploadedKey(key), String(key)).toBe(false);
    }
  });

  it("is the same pattern the database and the route use", () => {
    expect(UPLOAD_KEY_RE.source).toBe("^up\\/[0-9a-f]{32}\\.(webp|jpg)$");
  });

  it("never mistakes a borrowed frame of the catalogue for an upload", () => {
    for (const p of CATALOG) for (const k of p.photoKeys) expect(isUploadedKey(k)).toBe(false);
    for (const t of TEASERS) expect(isUploadedKey(t.photoKey)).toBe(false);
    for (const k of PHOTO_KEYS) expect(isUploadedKey(k)).toBe(false);
  });
});

describe("an upload's key", () => {
  it("is up/, the UUID without its dashes, and the stored format's extension", () => {
    const uuid = "01234567-89ab-cdef-0123-456789abcdef";
    expect(uploadKey(uuid, "image/webp")).toBe(`up/${HEX}.webp`);
    expect(uploadKey(uuid, "image/jpeg")).toBe(`up/${HEX}.jpg`);
    expect(isUploadedKey(uploadKey(uuid, "image/webp"))).toBe(true);
  });

  it("tells the route which type to answer with", () => {
    expect(uploadTypeOf(`up/${HEX}.webp`)).toBe("image/webp");
    expect(uploadTypeOf(`up/${HEX}.jpg`)).toBe("image/jpeg");
  });
});

describe("what a file's first bytes say", () => {
  it("reads WebP from RIFF…WEBP and JPEG from FF D8 FF", () => {
    expect(sniffImageType(WEBP)).toBe("image/webp");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
  });

  it("reads nothing into a PNG, a RIFF that is not WebP, or too few bytes", () => {
    expect(sniffImageType(PNG)).toBeNull();
    const wav = Uint8Array.from([...WEBP.slice(0, 8), 0x57, 0x41, 0x56, 0x45]);
    expect(sniffImageType(wav)).toBeNull();
    expect(sniffImageType(WEBP.slice(0, 11))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("uploadProblem — what the Server Action refuses", () => {
  it("takes a WebP or a JPEG up to 1,5 MB that is what it says it is", () => {
    expect(MAX_UPLOAD_BYTES).toBe(1_572_864);
    expect(uploadProblem("image/webp", WEBP.length, WEBP)).toBeNull();
    expect(uploadProblem("image/jpeg", MAX_UPLOAD_BYTES, JPEG)).toBeNull();
  });

  it("refuses an empty file and one over the limit", () => {
    expect(uploadProblem("image/webp", 0, WEBP)).toBe("EMPTY");
    expect(uploadProblem("image/webp", MAX_UPLOAD_BYTES + 1, WEBP)).toBe("TOO_BIG");
  });

  it("refuses another format, and a file whose bytes disagree with its declared type", () => {
    expect(uploadProblem("image/png", PNG.length, PNG)).toBe("NOT_AN_IMAGE");
    expect(uploadProblem("image/webp", PNG.length, PNG)).toBe("NOT_AN_IMAGE");
    expect(uploadProblem("image/jpeg", WEBP.length, WEBP)).toBe("NOT_AN_IMAGE");
    expect(uploadProblem("image/webp", JPEG.length, JPEG)).toBe("NOT_AN_IMAGE");
    expect(uploadProblem("", WEBP.length, WEBP)).toBe("NOT_AN_IMAGE");
  });
});
