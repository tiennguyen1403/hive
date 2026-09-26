/**
 * The photographs of Số 05, from what the image tool made to what the shop
 * serves (v3 slice 14).
 *
 * WHAT IT WRITES
 *   public/shots/<style>-<colour>.webp        the packshot, 1200 × 1500
 *   public/shots/<style>-<colour>-look.webp   the lookbook frame, 1200 × 1500
 *   — one pair per entry of `SHOTS` in `lib/shots.ts`.
 *
 * WHERE FROM
 *   photos-raw/<style>-<colour>.png           the packshot as ChatGPT made it
 *   photos-raw/<style>-<colour>-street.png    the lookbook frame
 *   (git ignores the folder; the files are only ever read.)
 *   tasks/anh-san-pham-prompt.md, tasks/lookbook-register.md — the prompts
 *   each file carries as its provenance, read as they are on disk.
 *
 * HOW — a packshot (the lessons of `tools/photo-frame-trial.py` built in)
 *   1. The paper: a smooth surface (a cubic in x and y) fitted to the paper
 *      the border reaches, then a flood from the border over every pixel near
 *      that surface or of the paper's own tint lit a little more or less —
 *      never across a hard step between neighbours. The surface is global on
 *      purpose: a model rebuilt from the pixels beside the garment followed
 *      CÁT cream's sleeve into its shade and swallowed it.
 *   2. The garment is what the flood left, less what still looks like paper
 *      (a shadow too deep for the flood, paper behind a crease between two
 *      trouser legs). A shadow keeps the paper's tint, a little warmer; a
 *      grey, black or navy garment on this warm paper leans cool even in deep
 *      shade — which is how the trial's MUỐI stops growing by its shadow. The
 *      shadow itself is that deep part plus the paper evenly darker under the
 *      garment's lower half.
 *   3. Framed: the garment fills a box 84% of the width by 82% of the height,
 *      whichever it meets first; its top edge (collar, hood, waistband) at
 *      12%; centred on its own axis, read off the middle of its top rows. The
 *      box is measured symmetric about that axis, so a sleeve in shade that
 *      matches the paper is never cut short (the trial's CÁT cream, 42px).
 *      Scaled with Mitchell, which keeps a hard silhouette from ringing.
 *   4. One paper for the whole set: each backdrop is divided by its own paper
 *      model and multiplied by `PAPER`, the median paper of the nineteen
 *      photos that are not KHÓI. The garment's pixels are left exactly as
 *      they were from its third pixel in; the shadow keeps its relative
 *      darkness and the paper its grain, because both are what a pixel holds
 *      beyond the model. KHÓI keeps its own backdrop (`KEEP_PAPER`).
 *   5. Where the frame reaches past the photo, the photo's own paper goes on
 *      (`compose`): its smooth part carried on from the edge, its grain
 *      lifted in random overlapping tiles from clean paper. No sleeve is
 *      reflected into the margin, no seam and no repeat to find.
 *
 * HOW — a lookbook frame
 *   Resized to 1200 × 1500 with Lanczos, nothing else: no tone, no crop. The
 *   photos are 1122 × 1402, a hair taller than 4:5, so the fit stretches by
 *   0.04% rather than cutting half a pixel.
 *
 *   `--debug <dir>` writes each packshot's mask over the photo (garment red,
 *   shadow blue, box and axis green): check a mask before trusting a file.
 *
 * PROVENANCE
 *   A C2PA manifest cannot survive re-encoding (its signature covers the old
 *   bytes), so each WebP carries XMP instead: IPTC's digital source type
 *   "trainedAlgorithmicMedia", the tool, the source file's name, and the
 *   prompt as the project's prompt files record it — saying so in as many
 *   words, since it is not a transcript of the ChatGPT session.
 *
 * WHEN TO RUN IT
 *   When a photo in photos-raw/ is made again, run it for that one pair; the
 *   paper is a constant (`PAPER`), so one file can be redone without moving
 *   the other twenty. `lib/shots.test.ts` fails while a file is missing.
 *
 *     npx tsx scripts/shots.ts                 every pair
 *     npx tsx scripts/shots.ts khoi-black      one pair (packshot and lookbook)
 *     npx tsx scripts/shots.ts --packs khoi-black  --looks …  only one kind
 *     npx tsx scripts/shots.ts --measure       print the median paper again
 *     npx tsx scripts/shots.ts --out <dir>     write elsewhere (a trial run)
 *     npx tsx scripts/shots.ts --debug <dir>   and the masks, to look at
 */

import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { CATALOG } from "@/data/catalog";
import type { ColorKey } from "@/data/types";
import { SHOTS, shotName, type Shot } from "@/lib/shots";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RAW_DIR = join(ROOT, "photos-raw");
export const OUT_DIR = join(ROOT, "public/shots");
const PROMPTS = join(ROOT, "tasks/anh-san-pham-prompt.md");
const REGISTER = join(ROOT, "tasks/lookbook-register.md");

/** The shop's 4:5 at the size the product page's largest frame can use twice over. */
export const FRAME = { width: 1200, height: 1500 } as const;
/** The box the garment is fitted inside, as fractions of the frame. */
export const BOX = { width: 0.84, height: 0.82 } as const;
/** Where the garment's top edge sits, as a fraction of the frame's height. */
export const TOP = 0.12;
/** The least room between the garment and any edge of the frame. */
export const MIN_MARGIN = 0.03;

/**
 * The paper every packshot is brought to: the median, channel by channel, of
 * the paper of the nineteen packshots that are not KHÓI, each read as the
 * mean of the four bands along the upper half of its edges (the bands the
 * check below reads too). Measured 26/09/2026 with `--measure`; a constant so
 * that a photo made again later lands on the same paper as the rest.
 */
export const PAPER = [195.0, 186.9, 178.1] as const; // #C3BBB2

/**
 * The packshots that keep the paper they were made on: framed like the rest,
 * but their backdrop left as it is. KHÓI (26/09/2026): its backdrop is a
 * mottled grey cloth with a heavy vignette, not the paper the other nineteen
 * stand on. Brought to `PAPER`, it kept the cloth's texture, its floor
 * shadow faded, and the smoke print where it meets the hem — the backdrop's
 * own greys — could not be told from the backdrop and was lightened with it.
 * The photos are to be made again; until then they are framed only.
 */
export const KEEP_PAPER: ReadonlySet<string> = new Set(["khoi-black", "khoi-cream"]);

/** WebP quality: a packshot about 300 KB at most, a lookbook frame about 400 KB. */
export const QUALITY = { pack: 90, look: 86 } as const;

// ═══════════════════════════════════════════════════════════════ framing
/** The garment's box in the photo, in pixels (`x1`, `y1` exclusive), and its axis. */
export interface Garment {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** The x of the garment's centre line, read off its top rows. */
  axis: number;
}

export interface Placement {
  /** Photo pixels to frame pixels. */
  scale: number;
  /** Where the photo's top-left corner lands in the frame. */
  left: number;
  top: number;
  /** Which side of the box the garment met first. */
  bound: "width" | "height";
  /** The garment's box in the frame, after placing. */
  box: { x0: number; x1: number; y0: number; y1: number };
}

/**
 * Where the photo goes in the frame (A1): the garment's width measured
 * symmetric about its axis, fitted inside `BOX`, top edge at `TOP`, axis on
 * the frame's centre line — then held `MIN_MARGIN` clear of every edge.
 */
export function place(g: Garment): Placement {
  const half = Math.max(g.axis - g.x0, g.x1 - g.axis);
  const width = 2 * half;
  const height = g.y1 - g.y0;
  const byWidth = (FRAME.width * BOX.width) / width;
  const byHeight = (FRAME.height * BOX.height) / height;
  const scale = Math.min(byWidth, byHeight);
  let left = FRAME.width / 2 - g.axis * scale;
  const top = FRAME.height * TOP - g.y0 * scale;
  // The axis is on the centre line; a garment wider on one side than the
  // other is nudged back inside the margin rather than cut.
  const margin = FRAME.width * MIN_MARGIN;
  const x0 = left + g.x0 * scale;
  const x1 = left + g.x1 * scale;
  if (x0 < margin) left += margin - x0;
  else if (x1 > FRAME.width - margin) left -= x1 - (FRAME.width - margin);
  return {
    scale,
    left,
    top,
    bound: byWidth <= byHeight ? "width" : "height",
    box: {
      x0: left + g.x0 * scale,
      x1: left + g.x1 * scale,
      y0: top + g.y0 * scale,
      y1: top + g.y1 * scale,
    },
  };
}

// ════════════════════════════════════════════════════════════ provenance
/** The fenced ```text block after the first `marker` at or past `from`. */
function fencedAfter(doc: string, marker: string, from = 0): string {
  const at = doc.indexOf(marker, from);
  if (at < 0) throw new Error(`the prompt file has no "${marker}"`);
  const open = doc.indexOf("```text\n", at);
  const close = doc.indexOf("\n```", open + 8);
  if (open < 0 || close < 0) throw new Error(`no text block after "${marker}"`);
  return doc.slice(open + 8, close).trim();
}

/** The style's display name, as the catalogue writes it (`KHÓI`). */
function styleTitle(style: string): string {
  const p = CATALOG.find((x) => x.id === `p-${style}`);
  if (!p) throw new Error(`no style ${style} in data/catalog.ts`);
  return p.name;
}

/** Whether the colour is the style's first — the one its prompt block is written in. */
function isFirstColour(shot: Shot): boolean {
  const p = CATALOG.find((x) => x.id === `p-${shot.style}`);
  return p?.colors[0] === shot.color;
}

/**
 * A packshot's prompt, as `tasks/anh-san-pham-prompt.md` records it: the
 * common block (§4), the style's block under Số 05 (§6), and — for any colour
 * but the first — the colour sentence (§5) with that colour's phrase.
 */
export function packPrompt(doc: string, style: string, color: ColorKey, first: boolean): string {
  const common = fencedAfter(doc, "## 4. KHỐI CHUNG");
  const issue = doc.indexOf("### Số 05");
  if (issue < 0) throw new Error("the prompt file has no Số 05 section");
  const block = fencedAfter(doc, `**${styleTitle(style)}**`, issue);
  const parts = [common, block];
  if (!first) {
    const sentence = fencedAfter(doc, "## 5. Câu đổi màu");
    const row = doc.split("\n").find((l) => l.startsWith("| ") && l.includes(`| \`${color}\` |`));
    const phrase = row?.split("|")[3]?.trim().replace(/^`|`$/g, "");
    if (!phrase) throw new Error(`the colour table has no phrase for ${color}`);
    parts.push(sentence.replace("{MÀU}", phrase));
  }
  return parts.join("\n\n");
}

/**
 * A lookbook frame's prompt, as the project records it: the rule for model
 * photos at the head of `tasks/anh-san-pham-prompt.md`, then the frame's own
 * row in `tasks/lookbook-register.md`, each cell under its column's name.
 */
export function lookPrompt(doc: string, register: string, rawFile: string): string {
  const rule = doc.split("\n").find((l) => l.startsWith("- **Ảnh người mẫu bổ sung:**"));
  if (!rule) throw new Error("the prompt file has no rule for model photos");
  const lines = register.split("\n");
  const header = lines.find((l) => l.startsWith("| Sản phẩm"));
  const row = lines.find((l) => l.startsWith("| ") && l.includes(`\`photos-raw/${rawFile}\``));
  if (!header || !row) throw new Error(`the lookbook register has no row for ${rawFile}`);
  const cells = (l: string) => l.split("|").slice(1, -1).map((c) => c.trim().replace(/`/g, ""));
  const names = cells(header);
  const row2 = cells(row)
    .map((value, i) => `${names[i]}: ${value}`)
    .join("\n");
  return `${rule.replace(/^- /, "").replace(/\*\*/g, "")}\n\n${row2}`;
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const DIGITAL_SOURCE_TYPE = "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";
export const CREATOR_TOOL = "ChatGPT (GPT Image)";

/**
 * The XMP packet a file carries: IPTC's digital source type, the tool, the
 * source file, the prompt, and the sentence saying what that prompt is.
 */
export function xmpPacket(p: { source: string; prompt: string; note: string }): string {
  const alt = (text: string) => `<rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(text)}</rdf:li></rdf:Alt>`;
  return (
    `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">\n` +
    ` <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
    `  <rdf:Description rdf:about=""\n` +
    `    xmlns:xmp="http://ns.adobe.com/xap/1.0/"\n` +
    `    xmlns:dc="http://purl.org/dc/elements/1.1/"\n` +
    `    xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/">\n` +
    `   <Iptc4xmpExt:DigitalSourceType>${DIGITAL_SOURCE_TYPE}</Iptc4xmpExt:DigitalSourceType>\n` +
    `   <Iptc4xmpExt:AISystemUsed>${escapeXml(CREATOR_TOOL)}</Iptc4xmpExt:AISystemUsed>\n` +
    `   <xmp:CreatorTool>${escapeXml(CREATOR_TOOL)}</xmp:CreatorTool>\n` +
    `   <dc:source>${escapeXml(p.source)}</dc:source>\n` +
    `   <dc:description>${alt(p.note)}</dc:description>\n` +
    `   <Iptc4xmpExt:AIPromptInformation>${escapeXml(p.prompt)}</Iptc4xmpExt:AIPromptInformation>\n` +
    `  </rdf:Description>\n` +
    ` </rdf:RDF>\n` +
    `</x:xmpmeta>\n` +
    `<?xpacket end="w"?>`
  );
}

/** What a packshot says of itself; `kept` for one whose backdrop stayed as made (`KEEP_PAPER`). */
function packNote(kept: boolean): string {
  return (
    "Ảnh do AI tạo (ChatGPT, GPT Image). Prompt dưới đây là prompt như ghi trong tệp prompt của dự án " +
    "(tasks/anh-san-pham-prompt.md: khối chung §4, khối của mẫu §6, câu đổi màu §5), không phải bản chép phiên ChatGPT. " +
    (kept
      ? "scripts/shots.ts đặt ảnh vào khung 1200×1500; nền giữ như ảnh gốc."
      : "scripts/shots.ts đặt ảnh vào khung 1200×1500 và đưa nền về tông giấy chung của bộ ảnh; điểm ảnh của món đồ giữ nguyên.")
  );
}
const LOOK_NOTE =
  "Ảnh do AI tạo (ChatGPT, GPT Image). Prompt dưới đây là prompt như ghi trong tệp prompt của dự án " +
  "(luật ảnh người mẫu ở đầu tasks/anh-san-pham-prompt.md, rồi dòng của ảnh trong tasks/lookbook-register.md), " +
  "không phải bản chép phiên ChatGPT. scripts/shots.ts chỉ đưa ảnh về 1200×1500 (Lanczos), không chỉnh tông, không cắt.";

// ════════════════════════════════════════════════════════════════ pixels
/** An RGB image, three interleaved channels as floats 0–255. */
export interface Rgb {
  w: number;
  h: number;
  d: Float32Array;
}

export async function readRgb(file: string): Promise<Rgb> {
  const { data, info } = await sharp(file)
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, d: Float32Array.from(data) };
}

/** Mean of each `k` × `k` block — the working copy the paper is modelled on. */
function shrink(img: Rgb, k: number): Rgb {
  const w = Math.floor(img.w / k);
  const h = Math.floor(img.h / k);
  const d = new Float32Array(w * h * 3);
  for (let y = 0; y < h * k; y++) {
    const row = ((y / k) | 0) * w;
    for (let x = 0; x < w * k; x++) {
      const j = (row + ((x / k) | 0)) * 3;
      const i = (y * img.w + x) * 3;
      d[j] += img.d[i]!;
      d[j + 1] += img.d[i + 1]!;
      d[j + 2] += img.d[i + 2]!;
    }
  }
  const n = k * k;
  for (let i = 0; i < d.length; i++) d[i]! /= n;
  return { w, h, d };
}

/**
 * Push-pull: fill every pixel of weight 0 from the weighted pixels around it,
 * coarse to fine — the paper continued smoothly under the garment.
 */
function pushPull(img: Rgb, weight: Float32Array): Float32Array {
  interface Level {
    w: number;
    h: number;
    v: Float32Array;
    a: Float32Array;
  }
  const first: Level = { w: img.w, h: img.h, v: new Float32Array(img.d.length), a: Float32Array.from(weight) };
  for (let i = 0; i < img.w * img.h; i++) {
    for (let c = 0; c < 3; c++) first.v[i * 3 + c] = img.d[i * 3 + c]! * weight[i]!;
  }
  const levels: Level[] = [first];
  for (let L = first; L.w > 1 || L.h > 1; L = levels[levels.length - 1]!) {
    const w = Math.max(1, Math.ceil(L.w / 2));
    const h = Math.max(1, Math.ceil(L.h / 2));
    const v = new Float32Array(w * h * 3);
    const a = new Float32Array(w * h);
    for (let y = 0; y < L.h; y++) {
      for (let x = 0; x < L.w; x++) {
        const i = y * L.w + x;
        const j = (y >> 1) * w + (x >> 1);
        a[j] += L.a[i]!;
        for (let c = 0; c < 3; c++) v[j * 3 + c] += L.v[i * 3 + c]!;
      }
    }
    for (let j = 0; j < w * h; j++) {
      if (a[j]! > 1) {
        for (let c = 0; c < 3; c++) v[j * 3 + c]! /= a[j]!;
        a[j] = 1;
      }
    }
    levels.push({ w, h, v, a });
  }
  const top = levels[levels.length - 1]!;
  let F = new Float32Array(3);
  for (let c = 0; c < 3; c++) F[c] = top.a[0]! > 0 ? top.v[c]! / top.a[0]! : 128;
  let fw = 1;
  let fh = 1;
  for (let l = levels.length - 2; l >= 0; l--) {
    const L = levels[l]!;
    const G = new Float32Array(L.w * L.h * 3);
    for (let y = 0; y < L.h; y++) {
      const fy = Math.min(fh - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const y0 = Math.floor(fy);
      const y1 = Math.min(fh - 1, y0 + 1);
      const ty = fy - y0;
      for (let x = 0; x < L.w; x++) {
        const fx = Math.min(fw - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
        const x0 = Math.floor(fx);
        const x1 = Math.min(fw - 1, x0 + 1);
        const tx = fx - x0;
        const i = y * L.w + x;
        const a = Math.min(1, L.a[i]!);
        for (let c = 0; c < 3; c++) {
          const up =
            (F[(y0 * fw + x0) * 3 + c]! * (1 - tx) + F[(y0 * fw + x1) * 3 + c]! * tx) * (1 - ty) +
            (F[(y1 * fw + x0) * 3 + c]! * (1 - tx) + F[(y1 * fw + x1) * 3 + c]! * tx) * ty;
          G[i * 3 + c] = L.v[i * 3 + c]! + (1 - a) * up;
        }
      }
    }
    F = G;
    fw = L.w;
    fh = L.h;
  }
  return F;
}

/** One pass of a box blur of radius `r` along rows or columns, edges clamped to what exists. */
function boxPass(src: Float32Array, w: number, h: number, ch: number, r: number, rows: boolean): Float32Array {
  const out = new Float32Array(src.length);
  const n = rows ? w : h;
  const m = rows ? h : w;
  const stride = (rows ? 1 : w) * ch;
  for (let j = 0; j < m; j++) {
    for (let c = 0; c < ch; c++) {
      const base = (rows ? j * w : j) * ch + c;
      let acc = 0;
      let cnt = 0;
      for (let i = 0; i <= Math.min(r, n - 1); i++) {
        acc += src[base + i * stride]!;
        cnt++;
      }
      for (let i = 0; i < n; i++) {
        out[base + i * stride] = acc / cnt;
        const add = i + r + 1;
        const rem = i - r;
        if (add < n) {
          acc += src[base + add * stride]!;
          cnt++;
        }
        if (rem >= 0) {
          acc -= src[base + rem * stride]!;
          cnt--;
        }
      }
    }
  }
  return out;
}

/** Three box passes each way — close to a Gaussian of σ ≈ r. */
function blur(src: Float32Array, w: number, h: number, ch: number, r: number): Float32Array {
  let o = src;
  for (let p = 0; p < 3; p++) {
    o = boxPass(o, w, h, ch, r, true);
    o = boxPass(o, w, h, ch, r, false);
  }
  return o;
}

/** Bilinear, pixel centres aligned: a model made on the working copy, at the photo's size. */
function enlarge(src: Float32Array, sw: number, sh: number, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h * 3);
  const kx = sw / w;
  const ky = sh / h;
  for (let y = 0; y < h; y++) {
    const fy = Math.min(sh - 1, Math.max(0, (y + 0.5) * ky - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(sh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(sw - 1, Math.max(0, (x + 0.5) * kx - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const tx = fx - x0;
      for (let c = 0; c < 3; c++) {
        out[(y * w + x) * 3 + c] =
          (src[(y0 * sw + x0) * 3 + c]! * (1 - tx) + src[(y0 * sw + x1) * 3 + c]! * tx) * (1 - ty) +
          (src[(y1 * sw + x0) * 3 + c]! * (1 - tx) + src[(y1 * sw + x1) * 3 + c]! * tx) * ty;
      }
    }
  }
  return out;
}

/** Square dilation (`grow`) or erosion of a 0/1 mask by radius `r`, separable. */
function morph(mask: Uint8Array, w: number, h: number, r: number, grow: boolean): Uint8Array {
  const pass = (src: Uint8Array, rows: boolean) => {
    const out = new Uint8Array(src.length);
    const n = rows ? w : h;
    const m = rows ? h : w;
    for (let j = 0; j < m; j++) {
      const at = (i: number) => (rows ? j * w + i : i * w + j);
      // Running count of set pixels in the window.
      let cnt = 0;
      for (let i = 0; i <= Math.min(r, n - 1); i++) cnt += src[at(i)]!;
      for (let i = 0; i < n; i++) {
        const lo = Math.max(0, i - r);
        const hi = Math.min(n - 1, i + r);
        const size = hi - lo + 1;
        out[at(i)] = grow ? (cnt > 0 ? 1 : 0) : cnt === size ? 1 : 0;
        if (i + r + 1 < n) cnt += src[at(i + r + 1)]!;
        if (i - r >= 0) cnt -= src[at(i - r)]!;
      }
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

/** 1 where a pixel is within the border ring `r` wide. */
function ring(w: number, h: number, r: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (x < r || y < r || x >= w - r || y >= h - r) out[y * w + x] = 1;
  }
  return out;
}

// ═════════════════════════════════════════════════════ the paper and the garment
/** The working copy the paper is modelled on is a quarter of the photo each way. */
const WORK = 4;
/**
 * Levels a step between two neighbours may take and still be the same
 * surface: on the working copy, at the photo's size, and — looser — for what
 * joins the paper once it is found (a crease in the paper sweep between two
 * trouser legs is a step, a garment's edge is a far larger one).
 */
const STEP = { work: 4, full: 3, join: 8 } as const;

/**
 * A smooth surface through the paper, channel by channel: a cubic in x and y,
 * fitted by least squares. Global on purpose — a model rebuilt from the
 * pixels next to the garment follows a sleeve fading into shade and walks
 * into it (it did, on CÁT cream); a cubic cannot follow a sleeve.
 */
interface Surface {
  coef: number[][];
  w: number;
  h: number;
}

const TERMS = 10;
function terms(x: number, y: number, w: number, h: number, out: Float64Array): void {
  const u = (2 * x) / w - 1;
  const v = (2 * y) / h - 1;
  out[0] = 1;
  out[1] = u;
  out[2] = v;
  out[3] = u * u;
  out[4] = u * v;
  out[5] = v * v;
  out[6] = u * u * u;
  out[7] = u * u * v;
  out[8] = u * v * v;
  out[9] = v * v * v;
}

function fitSurface(img: Rgb, use: Uint8Array): Surface {
  const { w, h } = img;
  const ata = Array.from({ length: TERMS }, () => new Float64Array(TERMS));
  const atb = [0, 1, 2].map(() => new Float64Array(TERMS));
  const t = new Float64Array(TERMS);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!use[i]) continue;
      terms(x + 0.5, y + 0.5, w, h, t);
      for (let a = 0; a < TERMS; a++) {
        for (let b = 0; b < TERMS; b++) ata[a]![b]! += t[a]! * t[b]!;
        for (let c = 0; c < 3; c++) atb[c]![a]! += t[a]! * img.d[i * 3 + c]!;
      }
    }
  }
  return { coef: atb.map((rhs) => solve(ata, rhs)), w, h };
}

/** Gaussian elimination with partial pivoting, on copies. */
function solve(m: Float64Array[], rhs: Float64Array): number[] {
  const n = rhs.length;
  const a = m.map((row) => Array.from(row));
  const b = Array.from(rhs);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let r = k + 1; r < n; r++) if (Math.abs(a[r]![k]!) > Math.abs(a[p]![k]!)) p = r;
    [a[k], a[p]] = [a[p]!, a[k]!];
    [b[k], b[p]] = [b[p]!, b[k]!];
    for (let r = k + 1; r < n; r++) {
      const f = a[r]![k]! / a[k]![k]!;
      for (let c = k; c < n; c++) a[r]![c]! -= f * a[k]![c]!;
      b[r]! -= f * b[k]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let k = n - 1; k >= 0; k--) {
    let s = b[k]!;
    for (let c = k + 1; c < n; c++) s -= a[k]![c]! * x[c]!;
    x[k] = s / a[k]![k]!;
  }
  return x;
}

/** The surface at every pixel of a `w` × `h` image (the photo or its working copy). */
function surfaceAt(s: Surface, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h * 3);
  const t = new Float64Array(TERMS);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      terms(((x + 0.5) * s.w) / w, ((y + 0.5) * s.h) / h, s.w, s.h, t);
      for (let c = 0; c < 3; c++) {
        let v = 0;
        for (let k = 0; k < TERMS; k++) v += s.coef[c]![k]! * t[k]!;
        out[(y * w + x) * 3 + c] = v;
      }
    }
  }
  return out;
}

/**
 * The pixels connected to `seed` through `ok` pixels, never across a step
 * larger than `step` levels between neighbours (in `soft`, the photo lightly
 * blurred): a flood that crosses a shadow's soft edge and stops at a
 * garment's hard one.
 */
function floodSteps(soft: Float32Array, ok: Uint8Array, seed: Uint8Array, w: number, h: number, step: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < w * h; i++) {
    if (seed[i] && ok[i]) {
      out[i] = 1;
      queue[tail++] = i;
    }
  }
  const near = (i: number, j: number) =>
    Math.abs(soft[i * 3]! - soft[j * 3]!) < step &&
    Math.abs(soft[i * 3 + 1]! - soft[j * 3 + 1]!) < step &&
    Math.abs(soft[i * 3 + 2]! - soft[j * 3 + 2]!) < step;
  const visit = (i: number, j: number) => {
    if (!out[j] && ok[j] && near(i, j)) {
      out[j] = 1;
      queue[tail++] = j;
    }
  };
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % w;
    if (x > 0) visit(i, i - 1);
    if (x < w - 1) visit(i, i + 1);
    if (i >= w) visit(i, i - w);
    if (i < w * (h - 1)) visit(i, i + w);
  }
  return out;
}

/**
 * A pixel against the paper model, channel by channel: how much lighter or
 * darker (`mean` of the three ratios), how much warmer (`warm`: red's ratio
 * less blue's) and how far green strays from the line between them (`bend`),
 * both relative to `mean`. The paper lit more or less keeps its tint; its
 * shadows here lean a little warm (NGUỘI's: +0.06). A grey, black or navy
 * garment on this warm paper leans cool (−0.07 and below) even in deep
 * shade, a moss one bends toward green, a brown one is far warmer.
 */
function against(v: ArrayLike<number>, p: ArrayLike<number>, i: number): { mean: number; warm: number; bend: number } {
  const r = v[i * 3]! / Math.max(1, p[i * 3]!);
  const g = v[i * 3 + 1]! / Math.max(1, p[i * 3 + 1]!);
  const b = v[i * 3 + 2]! / Math.max(1, p[i * 3 + 2]!);
  const mean = Math.max(0.01, (r + g + b) / 3);
  return { mean, warm: (r - b) / mean, bend: (g - (r + b) / 2) / mean };
}

/**
 * The paper, lit a little more or less — what the flood may cross. Its own
 * tint, strictly: allowing a shadow's warmth here let the flood into CÁT
 * cream, whose shaded side is the paper's tint turned a little warm.
 */
function paperLit(v: ArrayLike<number>, p: ArrayLike<number>, i: number): boolean {
  const a = against(v, p, i);
  return a.warm > -0.03 && a.warm < 0.035 && Math.abs(a.bend) < 0.025 && a.mean > 0.7 && a.mean < 1.12;
}

/**
 * The paper in shadow — what, of all the flood left, is not cloth: its own
 * tint, darker, give or take the warmth a deep shadow takes on.
 */
function paperShaded(v: ArrayLike<number>, p: ArrayLike<number>, i: number): boolean {
  const a = against(v, p, i);
  return a.warm > -0.03 && a.warm < 0.1 && Math.abs(a.bend) < 0.03 && a.mean > 0.42 && a.mean < 0.985;
}

/** The largest per-channel distance of a pixel from a model. */
function distance(v: ArrayLike<number>, p: ArrayLike<number>, i: number): number {
  return Math.max(
    Math.abs(v[i * 3]! - p[i * 3]!),
    Math.abs(v[i * 3 + 1]! - p[i * 3 + 1]!),
    Math.abs(v[i * 3 + 2]! - p[i * 3 + 2]!),
  );
}

export interface Separation {
  /** The paper under everything, at the photo's size, three channels. */
  paper: Float32Array;
  /** How much of each pixel stays as it was: 1 on the garment from its third pixel in, 0 on the paper. */
  alpha: Float32Array;
  /** The garment itself, hard: 1 on it. */
  garment: Uint8Array;
  /** The paper in the garment's shadow, 1 on it. */
  shadow: Uint8Array;
  box: Garment;
}

/** Steps 1 and 2: the paper, then the garment as everything the paper does not reach. */
export function separate(img: Rgb): Separation {
  const { w, h } = img;

  // The smooth surface, fitted on the working copy: from a thin ring at the
  // border, then from every pixel near it that the ring reaches.
  const small = shrink(img, WORK);
  const sw = small.w;
  const sh = small.h;
  const smallSeed = ring(sw, sh, Math.max(3, Math.round(sw * 0.015)));
  let use = smallSeed;
  let surface = fitSurface(small, use);
  let spread = 0;
  for (let round = 0; round < 5; round++) {
    const model = surfaceAt(surface, sw, sh);
    const residual: number[] = [];
    for (let i = 0; i < sw * sh; i++) if (use[i]) residual.push(distance(small.d, model, i));
    residual.sort((a, b) => a - b);
    spread = residual[Math.floor(residual.length * 0.5)]! * 1.4826;
    const near = Math.max(8, 3.5 * spread);
    const ok = new Uint8Array(sw * sh);
    for (let i = 0; i < sw * sh; i++) ok[i] = distance(small.d, model, i) < near ? 1 : 0;
    use = floodSteps(small.d, ok, smallSeed, sw, sh, STEP.work);
    surface = fitSurface(small, use);
  }

  // The paper at the photo's size, and the flood that finds it: near the
  // surface, or the paper's own tint lit a little more or less (a brighter
  // floor, a vignette, a light shadow) — never across a hard step.
  const smooth = surfaceAt(surface, w, h);
  const soft = blur(img.d, w, h, 3, 1);
  const near = Math.max(10, 3.5 * spread);
  const ok = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    ok[i] = distance(soft, smooth, i) < near || paperLit(soft, smooth, i) ? 1 : 0;
  }
  const reached = floodSteps(soft, ok, ring(w, h, 2), w, h, STEP.full);
  // What the flood did not reach is the garment — less what still looks like
  // paper: a shadow too deep for the flood (the core right under a hem, with
  // the warmth a deep shadow takes on), paper behind a crease the flood would
  // not cross (between two trouser legs). Closed, filled and kept whole:
  // cloth that shares the paper's tint inside the garment is still the garment.
  const cloth = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    cloth[i] = !reached[i] && !paperShaded(soft, smooth, i) && !paperLit(soft, smooth, i) ? 1 : 0;
  }
  const closed = morph(morph(cloth, w, h, 3, true), w, h, 3, false);
  // The outside is the paper and whatever joins it without a hard edge (the
  // shadow). A region of the paper's tint walled off from it by one — a
  // patch of print at a hem — is cloth.
  const outside = floodSteps(
    soft,
    closed.map((v) => 1 - v),
    reached,
    w,
    h,
    STEP.join,
  );
  const garment = largestPieces(
    outside.map((v) => 1 - v),
    w,
    h,
    0.05,
  );

  // The shadow: what the flood did not reach and is not the garment (a deep
  // shadow core, a shadow floating clear of the garment), and the reached
  // paper of the paper's own tint but darker, where a garment casts one —
  // under its lower half, leaning right as the key light is front-left.
  // Paper darker than the surface anywhere else is the backdrop's own
  // unevenness, and that is exactly what the tone evens out.
  const box = garmentBox(garment, w, h);
  const zone = {
    x0: box.x0 - 0.05 * w,
    x1: box.x1 + 0.15 * w,
    y0: box.y0 + 0.6 * (box.y1 - box.y0),
  };
  const shadow = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const inRows = y >= zone.y0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (garment[i]) continue;
      if (!reached[i]) shadow[i] = 1;
      else if (inRows && x >= zone.x0 && x < zone.x1 && paperShaded(soft, smooth, i) && distance(soft, smooth, i) > 4) {
        shadow[i] = 1;
      }
    }
  }

  // The paper model the tone is taken from: the paper itself (not the shadow,
  // not the garment), filled in under them and softened, so it follows the
  // backdrop's own unevenness — a vignette, a lighter floor — and not only
  // its slope.
  const bare = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      let all = 1;
      for (let dy = 0; dy < WORK && all; dy++) {
        for (let dx = 0; dx < WORK; dx++) {
          const i = (y * WORK + dy) * w + x * WORK + dx;
          if (!reached[i] || shadow[i]) {
            all = 0;
            break;
          }
        }
      }
      bare[y * sw + x] = all;
    }
  }
  const paper = enlarge(blur(pushPull(small, bare), sw, sh, 3, 2), sw, sh, w, h);

  // The garment's own pixels, from the third one in: its outermost pixel
  // goes with the paper, the second halfway. That edge is part paper — and
  // on THAN the image tool left a rim a step lighter than the paper along it,
  // which kept as it was stood out as a light outline once the paper around
  // it was brought down; toned with the paper it keeps its own measure.
  const in1 = morph(garment, w, h, 1, false);
  const in2 = morph(garment, w, h, 2, false);
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = 0.5 * in1[i]! + 0.5 * in2[i]!;

  return { paper, alpha, garment, shadow, box };
}

/** The connected pieces of a mask at least `share` of the largest one. */
function largestPieces(mask: Uint8Array, w: number, h: number, share: number): Uint8Array {
  const label = new Int32Array(w * h);
  const sizes: number[] = [0];
  const queue = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s]) continue;
    const id = sizes.length;
    let head = 0;
    let tail = 0;
    label[s] = id;
    queue[tail++] = s;
    while (head < tail) {
      const i = queue[head++]!;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < w * h && mask[j] && !label[j]) {
          label[j] = id;
          queue[tail++] = j;
        }
      }
    }
    sizes.push(tail);
  }
  const biggest = Math.max(...sizes);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (label[i] && sizes[label[i]!]! >= biggest * share) out[i] = 1;
  return out;
}

/** The garment's box and its axis: the median centre of its top twelfth. */
function garmentBox(m: Uint8Array, w: number, h: number): Garment {
  let x0 = w;
  let x1 = 0;
  let y0 = h;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      if (x < x0) x0 = x;
      if (x >= x1) x1 = x + 1;
      if (y < y0) y0 = y;
      if (y >= y1) y1 = y + 1;
    }
  }
  const band = Math.max(8, Math.round((y1 - y0) / 12));
  const mids: number[] = [];
  for (let y = y0; y < Math.min(y1, y0 + band); y++) {
    let a = -1;
    let b = -1;
    for (let x = 0; x < w; x++) {
      if (m[y * w + x]) {
        if (a < 0) a = x;
        b = x;
      }
    }
    if (a >= 0) mids.push((a + b + 1) / 2);
  }
  mids.sort((p, q) => p - q);
  return { x0, x1, y0, y1, axis: mids[mids.length >> 1]! };
}

// ═══════════════════════════════════════════════════════════════ the paper tone
/**
 * Step 4: the paper to `PAPER`, the garment untouched. Each pixel is scaled,
 * channel by channel, by `PAPER / model` on the paper and the garment's
 * outermost pixel, by 1 from the garment's third pixel in, and halfway on
 * its second (`Separation.alpha`).
 */
export function tone(img: Rgb, sep: Separation, paper: readonly number[]): Uint8Array {
  const out = new Uint8Array(img.d.length);
  for (let i = 0; i < img.w * img.h; i++) {
    const keep = sep.alpha[i]!;
    for (let c = 0; c < 3; c++) {
      const gain = paper[c]! / Math.max(1, sep.paper[i * 3 + c]!);
      const v = img.d[i * 3 + c]! * (1 + (1 - keep) * (gain - 1));
      out[i * 3 + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  return out;
}

// ════════════════════════════════════════════════════════════════ the frame
/** The margin's grain is laid in tiles this wide, each overlapping the next by `GRAIN.overlap`. */
const GRAIN = { tile: 48, overlap: 16 } as const;

/** A small seeded generator (mulberry32): the same photo makes the same file every run. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number from a name, to seed `random` with. */
function seedOf(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Step 5: the toned photo, scaled and placed. Where the frame reaches past
 * it, the photo's own paper goes on in two parts. The smooth part — the tone,
 * a shadow's gradient — is carried straight on from the edge, out of a copy
 * in which the garment is filled in with paper, so a sleeve near the edge is
 * never carried into the margin and a shadow is not reflected back on
 * itself. The grain is the photo's own, lifted in overlapping tiles from
 * clean paper chosen at random (seeded by the file's name) and blended so
 * that its strength holds across each overlap: no tile repeats in a pattern
 * the eye can find, which a mirror-tiled square did on KHÓI's cloth. Across
 * the edge the smooth part is continuous and the grain is grain.
 */
async function compose(
  toned: Uint8Array,
  w: number,
  h: number,
  keepOut: Uint8Array,
  noGrain: Uint8Array,
  at: Placement,
  seed: number,
): Promise<Uint8Array> {
  const sw = Math.round(w * at.scale);
  const sh = Math.round(h * at.scale);
  const scaled = await sharp(Buffer.from(toned.buffer, toned.byteOffset, toned.byteLength), {
    raw: { width: w, height: h, channels: 3 },
  })
    .resize(sw, sh, { kernel: "mitchell", fit: "fill" })
    .raw()
    .toBuffer();
  const sized = (mask: Uint8Array) =>
    sharp(Buffer.from(mask.map((v) => v * 255)), { raw: { width: w, height: h, channels: 1 } })
      .resize(sw, sh, { kernel: "nearest", fit: "fill" })
      // One channel in, one out: sharp would hand back three.
      .extractChannel(0)
      .raw()
      .toBuffer();
  const block = await sized(keepOut);
  const dirty = await sized(noGrain);

  const left = Math.round(at.left);
  const top = Math.round(at.top);
  const frame = new Uint8Array(FRAME.width * FRAME.height * 3);
  const margin = new Uint8Array(FRAME.width * FRAME.height);
  for (let Y = 0; Y < FRAME.height; Y++) {
    for (let X = 0; X < FRAME.width; X++) {
      const u = X - left;
      const v = Y - top;
      const j = Y * FRAME.width + X;
      if (u >= 0 && u < sw && v >= 0 && v < sh) {
        const i = (v * sw + u) * 3;
        frame[j * 3] = scaled[i]!;
        frame[j * 3 + 1] = scaled[i + 1]!;
        frame[j * 3 + 2] = scaled[i + 2]!;
      } else {
        margin[j] = 1;
      }
    }
  }
  if (!margin.includes(1)) return frame;

  const photo: Rgb = { w: sw, h: sh, d: Float32Array.from(scaled) };
  const smooth = blur(pushPull(photo, Float32Array.from(block, (v) => (v ? 0 : 1))), sw, sh, 3, 6);

  // Where grain may be lifted from: tile-sized squares of paper, nothing in them to keep out.
  const T = GRAIN.tile;
  const sources: number[] = [];
  const clear = (u0: number, v0: number) => {
    for (let v = v0; v < v0 + T; v += 2) for (let u = u0; u < u0 + T; u += 2) if (dirty[v * sw + u]) return false;
    return true;
  };
  for (let v0 = 0; v0 + T <= sh; v0 += 8) for (let u0 = 0; u0 + T <= sw; u0 += 8) if (clear(u0, v0)) sources.push(u0, v0);
  if (sources.length === 0) throw new Error("no clean paper to take the grain from");

  // Lay the tiles over the margin: a raised-cosine window each, weights whose
  // squares sum to one, so overlapping grain keeps its strength.
  const next = random(seed);
  const acc = new Float32Array(FRAME.width * FRAME.height * 3);
  const wsum = new Float32Array(FRAME.width * FRAME.height);
  const step = T - GRAIN.overlap;
  const win = new Float32Array(T);
  for (let k = 0; k < T; k++) win[k] = Math.sin((Math.PI * (k + 0.5)) / T) ** 2;
  for (let Y0 = -GRAIN.overlap; Y0 < FRAME.height; Y0 += step) {
    for (let X0 = -GRAIN.overlap; X0 < FRAME.width; X0 += step) {
      let touches = false;
      for (let Y = Math.max(0, Y0); Y < Math.min(FRAME.height, Y0 + T) && !touches; Y += 4) {
        for (let X = Math.max(0, X0); X < Math.min(FRAME.width, X0 + T); X += 4) {
          if (margin[Y * FRAME.width + X]) {
            touches = true;
            break;
          }
        }
      }
      if (!touches) continue;
      const pick = Math.floor(next() * (sources.length / 2)) * 2;
      const u0 = sources[pick]!;
      const v0 = sources[pick + 1]!;
      for (let y = 0; y < T; y++) {
        const Y = Y0 + y;
        if (Y < 0 || Y >= FRAME.height) continue;
        for (let x = 0; x < T; x++) {
          const X = X0 + x;
          if (X < 0 || X >= FRAME.width || !margin[Y * FRAME.width + X]) continue;
          const wgt = win[x]! * win[y]!;
          const i = ((v0 + y) * sw + u0 + x) * 3;
          const j = Y * FRAME.width + X;
          for (let c = 0; c < 3; c++) acc[j * 3 + c] += wgt * (photo.d[i + c]! - smooth[i + c]!);
          wsum[j] += wgt * wgt;
        }
      }
    }
  }

  /** A coordinate past an edge, held at the edge. */
  const clamp = (n: number, size: number) => Math.min(size - 1, Math.max(0, n));
  for (let Y = 0; Y < FRAME.height; Y++) {
    for (let X = 0; X < FRAME.width; X++) {
      const j = Y * FRAME.width + X;
      if (!margin[j]) continue;
      const i = (clamp(Y - top, sh) * sw + clamp(X - left, sw)) * 3;
      const norm = wsum[j]! > 0 ? 1 / Math.sqrt(wsum[j]!) : 0;
      for (let c = 0; c < 3; c++) {
        frame[j * 3 + c] = Math.max(0, Math.min(255, Math.round(smooth[i + c]! + acc[j * 3 + c]! * norm)));
      }
    }
  }
  return frame;
}

// ═════════════════════════════════════════════════════════════════ the checks
/** Mean of the four bands along the upper half of the edges, 40px deep, where `use` is set. */
function edgeBands(img: Uint8Array | Float32Array, w: number, h: number, use: (i: number) => boolean): number[][] {
  const depth = Math.round((40 * w) / FRAME.width);
  const bands = [
    (x: number, y: number) => y < depth && x < w / 2,
    (x: number, y: number) => y < depth && x >= w / 2,
    (x: number, y: number) => x < depth && y >= depth && y < h / 2,
    (x: number, y: number) => x >= w - depth && y >= depth && y < h / 2,
  ];
  return bands.map((inBand) => {
    const sum = [0, 0, 0];
    let n = 0;
    for (let y = 0; y < h / 2; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!inBand(x, y) || !use(i)) continue;
        for (let c = 0; c < 3; c++) sum[c]! += img[i * 3 + c]!;
        n++;
      }
    }
    return sum.map((s) => s / Math.max(1, n));
  });
}

/** CIE L*a*b* of an sRGB pixel. */
function lab(r: number, g: number, b: number): [number, number, number] {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

function deltaE(a: ArrayLike<number>, b: ArrayLike<number>, i: number): number {
  const p = lab(a[i]!, a[i + 1]!, a[i + 2]!);
  const q = lab(b[i]!, b[i + 1]!, b[i + 2]!);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

export interface PackReport {
  name: string;
  bytes: number;
  /** Framed only, its own paper kept (`KEEP_PAPER`). */
  kept: boolean;
  bound: Placement["bound"];
  scale: number;
  box: Placement["box"];
  /** The largest distance, in levels, of an edge band's mean from the paper. */
  bandOff: number;
  /** The widest spread of 64px blocks of paper (no garment, no shadow), in levels. */
  blockSpread: number;
  /** ΔE of the garment's core against the photo: before encoding, then after. */
  coreDeltaE: { toned: number; encoded: number };
}

// ═════════════════════════════════════════════════════════════════════ files
function note(file: string): string {
  const path = file.replace(/\\/g, "/");
  const root = `${ROOT.replace(/\\/g, "/")}/`;
  return path.startsWith(root) ? path.slice(root.length) : path;
}

async function writeWebp(rgb: Uint8Array, w: number, h: number, quality: number, xmp: string, file: string) {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(Buffer.from(rgb.buffer, rgb.byteOffset, rgb.byteLength), { raw: { width: w, height: h, channels: 3 } })
    .webp({ quality, effort: 6, smartSubsample: true })
    .withXmp(xmp)
    .toFile(file);
  return statSync(file).size;
}

export async function makePack(
  shot: Shot,
  out: string,
  paper: readonly number[],
  debug?: string,
): Promise<PackReport> {
  const name = shotName(shot);
  const raw = `${name}.png`;
  const img = await readRgb(join(RAW_DIR, raw));
  const sep = separate(img);
  const at = place(sep.box);
  const kept = KEEP_PAPER.has(name);
  const toned = kept ? Uint8Array.from(img.d, (v) => Math.round(v)) : tone(img, sep, paper);
  if (debug) await writeMaskSheet(img, sep, join(debug, `${name}-mask.png`));

  // What the margin must never take from: the garment, grown past its soft
  // edge, and everything inside its box — a print at a hem that passes for
  // paper is still not paper to continue.
  const keepOut = morph(sep.garment, img.w, img.h, 4, true);
  const b = sep.box;
  for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) keepOut[y * img.w + x] = 1;
  // …and the grain is never lifted from a shadow either.
  const noGrain = Uint8Array.from(keepOut);
  const shade = morph(sep.shadow, img.w, img.h, 6, true);
  for (let i = 0; i < noGrain.length; i++) if (shade[i]) noGrain[i] = 1;
  const frame = await compose(toned, img.w, img.h, keepOut, noGrain, at, seedOf(name));

  const doc = readFileSync(PROMPTS, "utf8");
  const xmp = xmpPacket({ source: raw, note: packNote(kept), prompt: packPrompt(doc, shot.style, shot.color, isFirstColour(shot)) });
  const file = join(out, `${name}.webp`);
  const bytes = await writeWebp(frame, FRAME.width, FRAME.height, QUALITY.pack, xmp, file);

  // ── the checks (A2) ──
  const plain = await compose(Uint8Array.from(img.d, (v) => Math.round(v)), img.w, img.h, keepOut, noGrain, at, 1);
  const alphaIn = await placeMask(sep.garment, img.w, img.h, at);
  const shadowIn = await placeMask(morph(sep.shadow, img.w, img.h, 8, true), img.w, img.h, at);
  const decoded = await sharp(file).removeAlpha().raw().toBuffer();
  const paperOnly = (i: number) => !alphaIn.near[i] && !shadowIn.mask[i];
  const bands = edgeBands(decoded, FRAME.width, FRAME.height, paperOnly);
  const bandOff = Math.max(...bands.flatMap((m) => m.map((v, c) => Math.abs(v - paper[c]!))));
  const blockSpread = blocks(decoded, paperOnly);

  // The core: the garment eroded by four pixels, in the photo and in the frame.
  const core = morph(sep.garment, img.w, img.h, 4, false);
  let tonedMax = 0;
  for (let i = 0; i < core.length; i++) if (core[i]) tonedMax = Math.max(tonedMax, deltaE(toned, img.d, i * 3));
  const coreIn = await placeMask(core, img.w, img.h, at);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < coreIn.mask.length; i++) {
    if (!coreIn.inner[i]) continue;
    sum += deltaE(decoded, plain, i * 3);
    n++;
  }
  return {
    name,
    bytes,
    kept,
    bound: at.bound,
    scale: at.scale,
    box: at.box,
    bandOff,
    blockSpread,
    coreDeltaE: { toned: tonedMax, encoded: sum / Math.max(1, n) },
  };
}

/**
 * `--debug <dir>`: the photo with what the script decided painted on it — the
 * garment red, the shadow blue, the box and the axis in green — to check a
 * mask by eye before trusting a file made from it.
 */
async function writeMaskSheet(img: Rgb, sep: Separation, file: string): Promise<void> {
  const { w, h } = img;
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const a = sep.alpha[i]!;
    const s = sep.shadow[i] && a === 0 ? 1 : 0;
    const tint = [255 * a * 0.45, 0, 255 * s * 0.45];
    for (let c = 0; c < 3; c++) {
      const k = a * 0.45 + s * 0.45;
      px[i * 3 + c] = Math.round(img.d[i * 3 + c]! * (1 - k) + tint[c]!);
    }
  }
  const b = sep.box;
  const mark = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 3;
    px[i] = 0;
    px[i + 1] = 200;
    px[i + 2] = 0;
  };
  for (let x = b.x0; x < b.x1; x++) for (const y of [b.y0, b.y1 - 1]) for (let t = 0; t < 2; t++) mark(x, y + t);
  for (let y = b.y0; y < b.y1; y++) {
    for (const x of [b.x0, b.x1 - 1, Math.round(b.axis)]) for (let t = 0; t < 2; t++) mark(x + t, y);
  }
  mkdirSync(dirname(file), { recursive: true });
  await sharp(Buffer.from(px.buffer), { raw: { width: w, height: h, channels: 3 } }).png().toFile(file);
}

/** A photo-sized mask, placed in the frame like the photo: set, near (grown 6px) and inner (shrunk 3px). */
async function placeMask(mask: Uint8Array, w: number, h: number, at: Placement) {
  const sw = Math.round(w * at.scale);
  const sh = Math.round(h * at.scale);
  const scaled = await sharp(Buffer.from(mask.map((v) => v * 255)), { raw: { width: w, height: h, channels: 1 } })
    .resize(sw, sh, { kernel: "nearest", fit: "fill" })
    // One channel in, one out: sharp would hand back three.
    .extractChannel(0)
    .raw()
    .toBuffer();
  const out = new Uint8Array(FRAME.width * FRAME.height);
  const left = Math.round(at.left);
  const top = Math.round(at.top);
  for (let Y = 0; Y < FRAME.height; Y++) {
    for (let X = 0; X < FRAME.width; X++) {
      const u = X - left;
      const v = Y - top;
      if (u >= 0 && u < sw && v >= 0 && v < sh && scaled[v * sw + u]) out[Y * FRAME.width + X] = 1;
    }
  }
  return {
    mask: out,
    near: morph(out, FRAME.width, FRAME.height, 6, true),
    inner: morph(out, FRAME.width, FRAME.height, 3, false),
  };
}

/** The widest spread, in levels, between the means of 64px blocks made only of paper. */
function blocks(img: Uint8Array, use: (i: number) => boolean): number {
  const lo = [255, 255, 255];
  const hi = [0, 0, 0];
  for (let by = 0; by + 64 <= FRAME.height; by += 64) {
    for (let bx = 0; bx + 64 <= FRAME.width; bx += 64) {
      const sum = [0, 0, 0];
      let clean = true;
      for (let y = by; y < by + 64 && clean; y++) {
        for (let x = bx; x < bx + 64; x++) {
          const i = y * FRAME.width + x;
          if (!use(i)) {
            clean = false;
            break;
          }
          for (let c = 0; c < 3; c++) sum[c]! += img[i * 3 + c]!;
        }
      }
      if (!clean) continue;
      for (let c = 0; c < 3; c++) {
        const m = sum[c]! / 4096;
        lo[c] = Math.min(lo[c]!, m);
        hi[c] = Math.max(hi[c]!, m);
      }
    }
  }
  return Math.max(...hi.map((v, c) => v - lo[c]!));
}

export async function makeLook(shot: Shot, out: string): Promise<{ name: string; bytes: number }> {
  const name = shotName(shot);
  const raw = `${name}-street.png`;
  const doc = readFileSync(PROMPTS, "utf8");
  const register = readFileSync(REGISTER, "utf8");
  const xmp = xmpPacket({ source: raw, note: LOOK_NOTE, prompt: lookPrompt(doc, register, raw) });
  const file = join(out, `${name}-look.webp`);
  mkdirSync(dirname(file), { recursive: true });
  await sharp(join(RAW_DIR, raw))
    .removeAlpha()
    .resize(FRAME.width, FRAME.height, { kernel: "lanczos3", fit: "fill" })
    .webp({ quality: QUALITY.look, effort: 6, smartSubsample: true })
    .withXmp(xmp)
    .toFile(file);
  return { name: `${name}-look`, bytes: statSync(file).size };
}

/** `--measure`: the median paper of the packshots that are not KHÓI. */
export async function measurePaper(): Promise<number[]> {
  const levels: number[][] = [];
  for (const shot of SHOTS.filter((s) => s.style !== "khoi")) {
    const img = await readRgb(join(RAW_DIR, `${shotName(shot)}.png`));
    const sep = separate(img);
    const bands = edgeBands(img.d, img.w, img.h, (i) => sep.alpha[i] === 0 && !sep.shadow[i]);
    const mean = [0, 1, 2].map((c) => bands.reduce((s, b) => s + b[c]!, 0) / bands.length);
    console.log(`  ${shotName(shot).padEnd(12)} ${hex(mean)}  ${mean.map((v) => v.toFixed(1)).join(" ")}`);
    levels.push(mean);
  }
  return [0, 1, 2].map((c) => {
    const s = levels.map((l) => l[c]!).sort((p, q) => p - q);
    const k = s.length;
    return k % 2 ? s[(k - 1) / 2]! : (s[k / 2 - 1]! + s[k / 2]!) / 2;
  });
}

const hex = (rgb: readonly number[]) =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flag = (f: string) => args.includes(f);
  const valueOf = (f: string) => {
    const at = args.indexOf(f);
    return at >= 0 ? resolve(args[at + 1]!) : undefined;
  };
  const out = valueOf("--out") ?? OUT_DIR;
  const debug = valueOf("--debug");
  const names = args.filter((a, i) => !a.startsWith("--") && !["--out", "--debug"].includes(args[i - 1]!));

  if (flag("--measure")) {
    const paper = await measurePaper();
    console.log(`median paper ${hex(paper)}  [${paper.map((v) => v.toFixed(1)).join(", ")}]`);
    return;
  }
  const unknown = names.filter((n) => !SHOTS.some((s) => shotName(s) === n));
  if (unknown.length > 0) throw new Error(`not in SHOTS (lib/shots.ts): ${unknown.join(", ")}`);
  const chosen = names.length > 0 ? SHOTS.filter((s) => names.includes(shotName(s))) : [...SHOTS];
  const packs = !flag("--looks");
  const looks = !flag("--packs");

  for (const shot of chosen) {
    for (const raw of [`${shotName(shot)}.png`, ...(shot.look ? [`${shotName(shot)}-street.png`] : [])]) {
      if (!existsSync(join(RAW_DIR, raw))) throw new Error(`photos-raw/${raw} is missing`);
    }
  }
  for (const shot of chosen) {
    if (packs) {
      const r = await makePack(shot, out, PAPER, debug);
      console.log(
        `${note(join(out, r.name))}.webp  ${(r.bytes / 1024).toFixed(0)} KB  ${r.bound}-bound ×${r.scale.toFixed(3)}  ` +
          `box x ${r.box.x0.toFixed(0)}–${r.box.x1.toFixed(0)} y ${r.box.y0.toFixed(0)}–${r.box.y1.toFixed(0)}  ` +
          (r.kept ? "paper kept  " : `edge bands ≤ ${r.bandOff.toFixed(1)}  blocks ${r.blockSpread.toFixed(1)}  `) +
          `core ΔE ${r.coreDeltaE.toned.toFixed(2)} / ${r.coreDeltaE.encoded.toFixed(2)}`,
      );
    }
    if (looks && shot.look) {
      const r = await makeLook(shot, out);
      console.log(`${note(join(out, r.name))}.webp  ${(r.bytes / 1024).toFixed(0)} KB`);
    }
  }
}

if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
