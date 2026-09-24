import { ImageResponse } from "next/og";
import { SHARE_IMAGE_ALT, SHARE_IMAGE_SIZE, shareImageSvg } from "@/lib/brand/share-image";
import { loadCatalog } from "@/lib/db/catalog";
import { featuredDrop } from "@/lib/drop";
import { issueNo } from "@/lib/lexicon";

export const alt = SHARE_IMAGE_ALT;
export const size = SHARE_IMAGE_SIZE;
export const contentType = "image/png";

/**
 * Share image O2 (v3 slice 10, QĐ-31) for every page of the shop:
 * `HIVE.NN` on the black cloth, the seam, the cover line. What it draws
 * lives in `lib/brand/share-image.ts`; this file only picks the number.
 *
 * The number is the issue on the home page's cover (`featuredDrop`), read
 * per request: `loadCatalog()` calls `connection()`, so the picture follows
 * the shop to the next issue without a new deploy. The apps that already
 * scraped it keep their copy, which is why it prints nothing that expires.
 *
 * The whole picture reaches Satori as one SVG of outlines, so nothing is set
 * in a font here and nothing is fetched.
 */
export default async function Image() {
  const { drop } = featuredDrop(await loadCatalog(), undefined);
  const svg = shareImageSvg(issueNo(drop.no));
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <img
          src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`}
          width={size.width}
          height={size.height}
          alt=""
        />
      </div>
    ),
    size,
  );
}
