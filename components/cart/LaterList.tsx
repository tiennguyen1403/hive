"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { COLORS } from "@/data/colors";
import { isFixed } from "@/lib/inventory";
import { styleName } from "@/lib/lexicon";
import { vnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";
import type { ResolvedLaterLine } from "@/lib/later";

interface LaterListProps {
  items: ResolvedLaterLine[];
  /** Back into the basket, one piece, same size and colour. */
  onAdd: (item: ResolvedLaterLine) => void;
  onRemove: (key: string) => void;
}

/**
 * "Giữ lại sau" — the lines taken out of the basket without letting go of
 * the choice behind them.
 *
 * It is not the wishlist and does not pretend to be: a saved style is a
 * STYLE somebody is watching, this is a size and a colour somebody already
 * picked. The heading says where it lives and what it keeps, because both
 * are true and neither is obvious.
 *
 * A row whose size has gone stays, with the shelf's answer on it and its
 * button turned off. Deleting it quietly would be the screen editing the
 * shopper's list behind their back.
 */
export function LaterList({ items, onAdd, onRemove }: LaterListProps) {
  if (items.length === 0) return null;

  return (
    <section className="later" aria-labelledby="later-h">
      <div className="hd">
        <h2 id="later-h">Giữ lại sau</h2>
        <span className="meta">
          {items.length} món · lưu trên thiết bị, giữ size đã chọn
        </span>
      </div>

      {items.map((item) => {
        const { product, available } = item;
        const { size, color } = item.line;
        const colour = COLORS[color];
        const gone = available === 0;

        return (
          <div className="item" key={item.key}>
            <span className="thumb">
              <Image
                src={photoUrl(
                  product.photoKeys[product.colors.indexOf(color)] ??
                    product.photoKeys[0]!,
                  120,
                  60,
                )}
                alt=""
                width={120}
                height={150}
              />
            </span>

            <div>
              <b>{styleName(product.name, product.dropNo)}</b>
              {/* A fixed style (v3 slice 11) gives no count, as nowhere else
                  in the shop does: only a size that has gone is said. */}
              <span className="sub">
                {product.kind} · {colour.label} · size {size} · {vnd(product.priceVnd)}
                {gone ? (
                  <>
                    {" · "}
                    <span className="gone">hết size {size}</span>
                  </>
                ) : isFixed(product) ? null : (
                  ` · còn ${available}`
                )}
              </span>
            </div>

            <div className="acts">
              {/* A button that cannot be pressed says what is true rather
                  than sitting there greyed out with the old label; it also
                  drops its icon, which named an action it no longer has. */}
              {/* No icon, which is the one place in this slice the system's
                  "every button names its action with a glyph" gives way to
                  the mock: measured at 390px, the bag took the button to
                  145px and squeezed the line beside it from two lines to
                  four. The label already names the action. */}
              {gone ? (
                <Button tone="ink sm" disabled>
                  Hết size {size}
                </Button>
              ) : (
                <Button tone="ink sm" onClick={() => onAdd(item)}>
                  Đưa vào giỏ
                </Button>
              )}
              <button type="button" className="lnk" onClick={() => onRemove(item.key)}>
                Bỏ
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
