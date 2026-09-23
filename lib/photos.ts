/**
 * Borrowed photography, and the one place it is borrowed from.
 *
 * PRODUCT.md is explicit: this project has no product photography. Every
 * image on every screen is an Unsplash stand-in. Two consequences are built
 * into this file rather than left to remember:
 *
 * · Every URL is built here, so the day real photos arrive the swap is one
 *   function, not thirty screens.
 * · The open drop needs 21 photo sets (one per colourway) and the borrowed
 *   library has 18 usable frames, so three appear twice across the grid.
 *   That repetition is a mark of the placeholder, not of the design.
 */

const UNSPLASH = "https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w={w}&q={q}";

/** Photo id per key. Keys are the catalog's `photoKeys`. */
const PHOTO_IDS: Record<string, string> = {
  hero: "1593278641722-49b1047ede21",
  khoi: "1503341338985-c0477be52513",
  bui: "1620799140188-3b2a02fd9a77",
  nguoi: "1680292783974-a9a336c10366",
  nang: "1503341504253-dff4815485f1",
  suong: "1564557287817-3785e38ec1f5",
  muoi: "1601063476271-a159c71ab0b3",
  than: "1508216310976-c518daae0cdc",
  cat: "1578768079052-aa76e52ff62e",
  gio: "1615397587950-3cbb55f95b77",
  da: "1542406775-ade58c52d2e4",
  reu: "1611817757591-c3f345024273",
  tro: "1614214191247-5b2d3a734f1b",
  song: "1688111421205-a0a85415b224",
  vo: "1565978771542-0db9ab9ad3de",
  mua: "1633292750937-120a94f5c2bb",
  kho: "1542327534-59a1fe8daf73",
  dat: "1632682582909-2b3a2581eef7",
  lua: "1561151593-7059b6b4ff57",
};

export function photoUrl(key: string, width: number, quality = 70): string {
  const id = PHOTO_IDS[key] ?? PHOTO_IDS.hero!;
  return UNSPLASH.replace("{id}", id)
    .replace("{w}", String(width))
    .replace("{q}", String(quality));
}

export const PHOTO_KEYS = Object.keys(PHOTO_IDS);
