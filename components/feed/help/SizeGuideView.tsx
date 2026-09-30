"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import {
  GUIDE_HEIGHTS,
  GUIDE_HEIGHT_STORAGE_KEY,
  heightName,
  parseGuideHeight,
  sizeGuide,
  sizesForHeight,
  type GuideChart,
  type GuideHeight,
} from "@/lib/feed-size-guide";
import type { Size } from "@/data/types";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow } from "../now";
import { cx } from "../useReveal";

/** This device's height, if it kept one (storage can be off, full or refused: then there is none). */
function readHeight(): GuideHeight | null {
  try {
    return parseGuideHeight(window.localStorage.getItem(GUIDE_HEIGHT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function keepHeight(cm: GuideHeight | null): void {
  try {
    if (cm === null) window.localStorage.removeItem(GUIDE_HEIGHT_STORAGE_KEY);
    else window.localStorage.setItem(GUIDE_HEIGHT_STORAGE_KEY, String(cm));
  } catch {
    // Storage is off: the choice lives for this view only.
  }
}

/**
 * Bảng size (round v4 slice 4b): the approved mock's `size-guide.html` and
 * `size-guide.js`. "Số đo mô phỏng, cm"; "Chiều cao của bạn", 1m55 to 1m85 —
 * a height marks the sizes that suit it in all four charts and says so ("Hợp
 * size L hoặc XL"), pressed again it lets go, and this device keeps it for the
 * next visit, as the mock keeps it; the tops by fit and the trousers by
 * length (`sizeGuide`), each chart with the styles on sale in it; under each
 * pair, how to measure a piece already worn; last, "Giữa hai size".
 *
 * The kept height comes back once the page is on screen: the server has no
 * storage to read it from, so it draws the charts unmarked first.
 */
export function SizeGuideView() {
  const catalog = useCatalog();
  const now = useNow();
  const guide = useMemo(() => sizeGuide(catalog, now), [catalog, now]);
  const [height, setHeight] = useState<GuideHeight | null>(null);

  useEffect(() => {
    const kept = readHeight();
    if (kept !== null) setHeight(kept);
  }, []);

  function pick(cm: GuideHeight | null) {
    setHeight(cm);
    keepHeight(cm);
  }

  const sizes = height === null ? [] : sizesForHeight(height);

  return (
    <>
      <div className="b-head">
        <h1 className="b-title disp">Bảng size</h1>
      </div>
      <p className="b-sg-cap">Số đo mô phỏng, cm</p>
      <section className="b-hpick" aria-labelledby="h-height">
        <p className="sh-label" id="h-height">
          Chiều cao của bạn
        </p>
        <div className="chips" role="group" aria-labelledby="h-height">
          {GUIDE_HEIGHTS.map((h) => (
            <button
              key={h}
              className="chip"
              type="button"
              aria-pressed={height === h}
              onClick={() => pick(height === h ? null : h)}
            >
              {heightName(h)}
            </button>
          ))}
        </div>
        <p className="b-hres" aria-live="polite">
          {sizes.length > 0 && (
            <>
              Hợp size{" "}
              {sizes.map((z, i) => (
                <Fragment key={z}>
                  {i > 0 && " hoặc "}
                  <b>{z}</b>
                </Fragment>
              ))}
            </>
          )}
        </p>
      </section>
      <div className="b-fits">
        {guide.tops.map((c) => (
          <Chart key={c.id} chart={c} sizes={sizes} />
        ))}
        <Measure text="Trải phẳng một chiếc áo đang mặc vừa, đo ngang ngực rồi so với cột Ngang ngực." />
      </div>
      <div className="b-fits">
        {guide.pants.map((c) => (
          <Chart key={c.id} chart={c} sizes={sizes} />
        ))}
        <Measure text="Trải phẳng một chiếc quần đang mặc vừa: đo ngang cạp rồi nhân đôi để so với cột Vòng eo, đo từ cạp tới gấu để so với cột Dài quần." />
      </div>
      <section className="b-tips" aria-labelledby="h-tips">
        <h2 className="sect-title" id="h-tips">
          Giữa hai size
        </h2>
        <p>Muốn vừa người, lấy size nhỏ. Muốn rộng, lấy size lớn.</p>
      </section>
    </>
  );
}

/** One chart: its title, the styles on sale in it, the table — the rows that suit the height lit. */
function Chart({ chart: c, sizes }: { chart: GuideChart; sizes: readonly Size[] }) {
  return (
    <section className="b-fit" aria-labelledby={`fit-${c.id}`}>
      <h2 className="b-fit-title disp" id={`fit-${c.id}`}>
        {c.title}
      </h2>
      {c.names.length > 0 && <p className="b-fit-names">{c.names.join(", ")}</p>}
      <table className={cx("fit-table", c.pants && "b-pants")}>
        <caption className="sr-only">{c.caption}</caption>
        <thead>
          <tr>
            <th scope="col">Size</th>
            {c.head.map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {c.rows.map((r) => (
            <tr key={r.size} className={sizes.includes(r.size) ? "on" : undefined}>
              <td>{r.size}</td>
              {r.cells.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** How to measure a piece already worn, under each pair of charts. */
function Measure({ text }: { text: string }) {
  return (
    <p className="b-measure">
      <FeedIcon name="ruler" />
      <span>{text}</span>
    </p>
  );
}
