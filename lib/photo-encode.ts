import { outputSize, type Crop } from "./photo-crop";
import { MAX_UPLOAD_BYTES, type UploadType } from "./photos";

/**
 * Turning a picked photo into what the server stores (v3 slice 7, QĐ-27):
 * the chosen 4:5 region, at most 1 200 × 1 500, as a WebP — a JPEG where the
 * browser cannot write WebP — under the 1,5 MB `uploadProductPhoto` takes.
 *
 * BROWSER ONLY. It needs a canvas and the image decoders, so it is called from
 * the form's save handler and never imported by a Server Component. There is
 * no image library on the server on purpose (brief B3c §1): the server checks
 * the size and the first bytes and nothing else, so what the page shows is
 * decided here.
 *
 * The steps, as the slice brief fixes them:
 *   1. decode the file — `createImageBitmap(file, { imageOrientation:
 *      "from-image" })`, so a phone photo stored sideways with an EXIF
 *      rotation comes out the way the crop sheet showed it; an `<img>` when
 *      that fails (the sheet measured the photo with one, so the two agree);
 *   2. draw the region onto a canvas of `outputSize(crop)`;
 *   3. `toBlob("image/webp", 0.82)`; a browser without a WebP encoder hands
 *      back a PNG instead, so then `image/jpeg` at 0.85;
 *   4. over 1,5 MB, once more at 0.7; still over, it gives up and says so.
 */

/** A refusal this module words itself — shown after "Không tải được ảnh {màu}: ". */
export class PhotoEncodeError extends Error {}

/** The photo the form uploads, and the type the server is told it is. */
export interface EncodedPhoto {
  blob: Blob;
  type: UploadType;
}

export async function encodeCrop(file: Blob, crop: Crop): Promise<EncodedPhoto> {
  const source = await decode(file);
  try {
    const size = outputSize(crop);
    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PhotoEncodeError("Trình duyệt không vẽ được ảnh này");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source.image, crop.x, crop.y, crop.w, crop.h, 0, 0, size.w, size.h);

    let type: UploadType = "image/webp";
    let blob = await toBlob(canvas, type, 0.82);
    if (!blob || blob.type !== type) {
      type = "image/jpeg";
      blob = await toBlob(canvas, type, 0.85);
    }
    if (blob && blob.size > MAX_UPLOAD_BYTES) blob = await toBlob(canvas, type, 0.7);
    if (!blob || blob.type !== type) throw new PhotoEncodeError("Trình duyệt không thu được ảnh này");
    if (blob.size > MAX_UPLOAD_BYTES) throw new PhotoEncodeError("Ảnh quá nặng sau khi thu");
    return { blob, type };
  } finally {
    source.release();
  }
}

/** The photo's pixels, and how to let go of them once drawn. */
interface Decoded {
  image: CanvasImageSource;
  release: () => void;
}

async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, release: () => bitmap.close() };
    } catch {
      // Fall through to an <img>, which decodes what the crop sheet showed.
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new PhotoEncodeError("Không đọc được ảnh này");
  }
  return { image: img, release: () => URL.revokeObjectURL(url) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
