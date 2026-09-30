import type { ColorKey, Drop, Product } from "@/data/types";
import type { Catalog } from "./catalog";
import { dropState } from "./drop";
import { firstColor, photoKeyOf } from "./feed";
import { productsInDrop } from "./inventory";
import { lookbookUrl } from "./photos";

/**
 * The closed issues' pages (round v4, slice 1b): `/so`, every closed issue
 * newest first, and `/so/N`, one of them — by the approved mock's rules
 * (`prototype/explore/feed/archive.js`, `issue.js`). Pure; the time is
 * handed in.
 */

/** Every issue that has closed, the newest first. */
export function closedIssues(catalog: Catalog, now: Date): Drop[] {
  return catalog.drops.filter((d) => dropState(d, now) === "CLOSED").sort((a, b) => b.no - a.no);
}

/**
 * Whether an issue has photographs of its own to show: a style worn in one of
 * its colours (Số 05's lookbook). An issue without — Số 03 and Số 04, whose
 * frames are borrowed — is set in type, its names as the picture, and never
 * borrows another issue's photos.
 */
export function issueHasPhotos(catalog: Catalog, no: number): boolean {
  return productsInDrop(catalog, no).some((p) => p.photoKeys.some((k) => lookbookUrl(k) !== null));
}

/**
 * The photo an issue wears in the archive, chosen as the mock chose it:
 * KHÓI in black, worn (`archive.js`). An editorial choice, not a fact, so it
 * is written down here by the colour's photo key; an issue without one — or
 * whose chosen style has gone — wears its first style with a lookbook frame.
 */
export const ARCHIVE_COVER: Readonly<Record<number, string>> = { 5: "shot-khoi-black" };

export function archivePicture(catalog: Catalog, no: number): { product: Product; color: ColorKey } | undefined {
  const styles = productsInDrop(catalog, no);
  const chosen = ARCHIVE_COVER[no];
  if (chosen) {
    for (const p of styles) {
      const i = p.photoKeys.indexOf(chosen);
      if (i >= 0 && p.colors[i] && lookbookUrl(chosen)) return { product: p, color: p.colors[i]! };
    }
  }
  for (const p of styles) {
    const color = p.colors.find((c) => lookbookUrl(photoKeyOf(p, c)) !== null);
    if (color) return { product: p, color };
  }
  const first = styles[0];
  return first ? { product: first, color: firstColor(first) } : undefined;
}

/** The closed issues either side of one: "Số trước" (older) and "Số sau" (newer). */
export function closedNeighbours(closed: readonly Drop[], no: number): { older?: Drop; newer?: Drop } {
  const at = closed.findIndex((d) => d.no === no);
  if (at < 0) return {};
  const older = closed[at + 1];
  const newer = at > 0 ? closed[at - 1] : undefined;
  return { ...(older ? { older } : {}), ...(newer ? { newer } : {}) };
}

/**
 * What is live beside the closed issues — the strip at the top of the archive
 * and the block after an issue's styles: the issue selling now, else the next
 * one announced, else nothing (between two issues the fixed line sells).
 */
export type IssueNow = { kind: "live"; drop: Drop } | { kind: "next"; drop: Drop } | { kind: "none" };

export function issueNow(catalog: Catalog, now: Date): IssueNow {
  const byNo = [...catalog.drops].sort((a, b) => a.no - b.no);
  const live = byNo.find((d) => dropState(d, now) === "OPEN");
  if (live) return { kind: "live", drop: live };
  const next = byNo.find((d) => dropState(d, now) === "UPCOMING");
  return next ? { kind: "next", drop: next } : { kind: "none" };
}
