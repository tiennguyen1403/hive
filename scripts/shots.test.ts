import { describe, expect, it } from "vitest";
import {
  BOX,
  CREATOR_TOOL,
  DIGITAL_SOURCE_TYPE,
  FRAME,
  KEEP_PAPER,
  MIN_MARGIN,
  PAPER,
  TOP,
  lookPrompt,
  packPrompt,
  place,
  xmpPacket,
} from "./shots";

/**
 * The script's decisions that are arithmetic or text, tested without a photo:
 * where a garment lands in the frame, and what each file says of itself. The
 * files it wrote are checked in `lib/shots.test.ts`; the pixels were checked
 * by eye and by the numbers the script prints (brief v3 slice 14, A1–A6).
 */

describe("place — the frame (A1)", () => {
  it("fits a top by its width: 84% of the frame, symmetric about its axis, the top edge at 12%", () => {
    // A tee 1000px wide in a 1122px photo, axis at 561, collar at 150.
    const at = place({ x0: 61, x1: 1061, y0: 150, y1: 950, axis: 561 });
    expect(at.bound).toBe("width");
    expect(at.scale).toBeCloseTo((FRAME.width * BOX.width) / 1000, 6);
    expect(at.box.y0).toBeCloseTo(FRAME.height * TOP, 6);
    expect((at.box.x0 + at.box.x1) / 2).toBeCloseTo(FRAME.width / 2, 6);
    expect(at.box.x1 - at.box.x0).toBeCloseTo(FRAME.width * BOX.width, 6);
  });

  it("fits trousers by their height: 82% of the frame, never taller", () => {
    const at = place({ x0: 380, x1: 740, y0: 60, y1: 1340, axis: 560 });
    expect(at.bound).toBe("height");
    expect(at.box.y1 - at.box.y0).toBeCloseTo(FRAME.height * BOX.height, 6);
    expect(at.box.y0).toBeCloseTo(FRAME.height * TOP, 6);
  });

  it("measures the width symmetric about the axis, so a side in shade is never cut short", () => {
    // The right side read short (a sleeve the colour of the paper): the left
    // half decides, mirrored.
    const at = place({ x0: 100, x1: 900, y0: 150, y1: 950, axis: 560 });
    expect(at.scale).toBeCloseTo((FRAME.width * BOX.width) / (2 * 460), 6);
    expect(at.left + 560 * at.scale).toBeCloseTo(FRAME.width / 2, 6);
  });

  it("holds a lopsided garment 3% clear of the edge rather than cut it", () => {
    // A leg stepping far to the right of the waistband's axis.
    const at = place({ x0: 500, x1: 1100, y0: 60, y1: 1340, axis: 560 });
    expect(at.box.x1).toBeLessThanOrEqual(FRAME.width * (1 - MIN_MARGIN) + 1e-6);
    expect(at.box.x0).toBeGreaterThanOrEqual(FRAME.width * MIN_MARGIN - 1e-6);
  });
});

describe("the paper (A2)", () => {
  it("is one warm grey for the set, and KHÓI keeps its own until it is made again", () => {
    expect(PAPER.map((v) => Math.round(v))).toEqual([195, 187, 178]);
    expect([...KEEP_PAPER]).toEqual(["khoi-black", "khoi-cream"]);
  });
});

/** The prompt file in miniature: the headings and blocks the script reads. */
const DOC = [
  "# Prompt",
  "",
  "- **Ảnh thẻ sản phẩm:** chỉ có món đồ.",
  "- **Ảnh người mẫu bổ sung:** mỗi **sản phẩm × màu** dùng một người mẫu khác.",
  "",
  "## 4. KHỐI CHUNG — dán đầu mọi tin nhắn",
  "",
  "```text",
  "COMMON BLOCK",
  "```",
  "",
  "## 5. Câu đổi màu",
  "",
  "```text",
  "Change only the fabric colour to {MÀU}.",
  "```",
  "",
  "| Màu | Khoá | Cụm |",
  "|---|---|---|",
  "| Đen | `black` | `black (#1C1C1C), a soft true black` |",
  "| Kem | `cream` | `cream (#E6DFD1), a warm sand off-white, not yellow` |",
  "",
  "### Số 04 — đã đóng",
  "",
  "**KHÓI** · the wrong issue",
  "",
  "```text",
  "NOT THIS ONE",
  "```",
  "",
  "### Số 05 — đang bán",
  "",
  "**KHÓI** · Áo thun oversize",
  "",
  "```text",
  "KHÓI BLOCK",
  "```",
  "",
].join("\n");

const REGISTER = [
  "| Sản phẩm × màu | Ảnh lookbook | Người mẫu | Bối cảnh | Góc / khung |",
  "|---|---|---|---|---|",
  "| KHÓI đen | `photos-raw/khoi-black-street.png` | Nam ~23 | Hẻm | Trực diện |",
  "| KHÓI kem | `photos-raw/khoi-cream-street.png` | Nam ~27 | Cầu thang | Ba phần tư |",
].join("\n");

describe("the provenance each file carries (A5)", () => {
  it("gives a packshot the common block, then its style's block under Số 05", () => {
    expect(packPrompt(DOC, "khoi", "black", true)).toBe("COMMON BLOCK\n\nKHÓI BLOCK");
  });

  it("adds the colour sentence, with that colour's phrase, for any colour but the first", () => {
    expect(packPrompt(DOC, "khoi", "cream", false)).toBe(
      "COMMON BLOCK\n\nKHÓI BLOCK\n\nChange only the fabric colour to cream (#E6DFD1), a warm sand off-white, not yellow.",
    );
  });

  it("gives a lookbook frame the rule for model photos, then its own row, cell by cell", () => {
    expect(lookPrompt(DOC, REGISTER, "khoi-cream-street.png")).toBe(
      "Ảnh người mẫu bổ sung: mỗi sản phẩm × màu dùng một người mẫu khác.\n\n" +
        "Sản phẩm × màu: KHÓI kem\nẢnh lookbook: photos-raw/khoi-cream-street.png\nNgười mẫu: Nam ~27\n" +
        "Bối cảnh: Cầu thang\nGóc / khung: Ba phần tư",
    );
  });

  it("refuses to guess when the prompt file lacks what it needs", () => {
    expect(() => lookPrompt(DOC, REGISTER, "khoi-moss-street.png")).toThrow(/no row/);
    expect(() => packPrompt("# nothing", "khoi", "black", true)).toThrow();
  });

  it("writes IPTC's source type, the tool, the source file and the prompt, escaped, into one XMP packet", () => {
    const xmp = xmpPacket({ source: "khoi-black.png", prompt: "a < b & c > d", note: "prompt như ghi trong tệp" });
    expect(xmp.startsWith("<?xpacket begin=")).toBe(true);
    expect(xmp.trimEnd().endsWith('<?xpacket end="w"?>')).toBe(true);
    expect(xmp).toContain(`<Iptc4xmpExt:DigitalSourceType>${DIGITAL_SOURCE_TYPE}</Iptc4xmpExt:DigitalSourceType>`);
    expect(DIGITAL_SOURCE_TYPE).toBe("http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia");
    expect(xmp).toContain(`<xmp:CreatorTool>${CREATOR_TOOL}</xmp:CreatorTool>`);
    expect(CREATOR_TOOL).toBe("ChatGPT (GPT Image)");
    expect(xmp).toContain("<dc:source>khoi-black.png</dc:source>");
    expect(xmp).toContain("a &lt; b &amp; c &gt; d");
    expect(xmp).toContain('<rdf:li xml:lang="x-default">prompt như ghi trong tệp</rdf:li>');
  });
});
