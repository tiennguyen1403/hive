"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { familyShortLabel, type Family } from "@/data/types";
import { dropState } from "@/lib/drop";
import {
  SHOP_FAMILIES,
  SHOP_SORTS,
  lineLabel,
  otherLineWith,
  shopList,
  sortLabel,
  type ShopLine,
  type ShopState,
} from "@/lib/feed";
import { issueFacts } from "@/lib/feed-home";
import { picker, plural } from "@/lib/i18n";
import { GridCard } from "./FeedCards";
import { FeedIcon } from "./icon/FeedIcon";
import { FeedSheet } from "./FeedSheet";
import { useNow } from "./now";

interface FeedShopProps {
  /** The lines on the switch, in order (`shopLines` in `lib/feed.ts`). */
  lines: readonly ShopLine[];
  /** The grid's state. The page owns it — and keeps it in the URL (QĐ-8). */
  state: ShopState;
  onChange: (next: ShopState) => void;
  /** The page's title ("Cửa hàng" on `/products`); the home tab has none. */
  title?: string;
  /** The count and the "Sắp xếp" chip above the grid (`/products`); the home tab has neither. */
  sort?: boolean;
  /** The heading level of each card's name. */
  h?: "h2" | "h3";
}

/**
 * The shop grid (`feed.js`: `shop`): the line switch, the family chips, the
 * closed issue's status line, the count and the sort, and a grid of compact
 * cards — on the home page's Cửa hàng tab, and from slice 1b on `/products`.
 *
 * It holds no state of its own: the page hands it the state and takes back
 * every change, because the state belongs in the URL, where a reload and a
 * shared link find it again.
 *
 * In both languages since round v6 slice E1: the lines, the families (the
 * glossary's Tees, Hoodies…; a chip still filters by `family`), the counts and
 * the orders.
 */
export function FeedShop({ lines, state, onChange, title, sort = false, h = "h3" }: FeedShopProps) {
  const catalog = useCatalog();
  const now = useNow();
  const locale = useLocale();
  const t = picker(locale);
  const list = shopList(catalog, lines, state);
  const drop = typeof state.line === "number" ? catalog.dropByNo.get(state.line) : undefined;
  const closed = drop !== undefined && dropState(drop, now) === "CLOSED";
  const facts = drop && closed ? issueFacts(catalog, drop, locale) : undefined;
  const other = list.length === 0 ? otherLineWith(catalog, lines, state) : undefined;
  const families: (Family | "ALL")[] = ["ALL", ...SHOP_FAMILIES];

  return (
    <div className="shop">
      <div className="shop-top">
        {title && <h1 className="page-title disp">{title}</h1>}
        <div className="seg" role="group" aria-label={t({ vi: "Dòng hàng", en: "Line" })}>
          {lines.map((l) => (
            <button
              key={String(l)}
              className="seg-btn"
              type="button"
              aria-pressed={l === state.line}
              onClick={() => onChange({ ...state, line: l })}
            >
              {lineLabel(l, locale)}
            </button>
          ))}
        </div>
      </div>
      <div className="chips" role="group" aria-label={t({ vi: "Loại", en: "Type" })}>
        {families.map((f) => (
          <button
            key={f}
            className="chip"
            type="button"
            aria-pressed={f === state.family}
            onClick={() => onChange({ ...state, family: f })}
          >
            {f === "ALL" ? t({ vi: "Mọi loại", en: "All types" }) : familyShortLabel(f, locale)}
          </button>
        ))}
      </div>
      <div>
        {facts && drop && (
          <p className="line-status">
            <span className="chip-tag">{t({ vi: "Đã đóng", en: "Closed" })}</span>
            <span>{facts.run}</span>
            <b>
              {t<React.ReactNode>({
                vi: (
                  <>
                    {facts.sold}/{facts.cut} đã bán
                  </>
                ),
                en: `${facts.sold}/${facts.cut} sold`,
              })}
            </b>
          </p>
        )}
      </div>
      {sort && (
        <div className="shop-bar">
          <p className="count" aria-live="polite">
            {t<React.ReactNode>({ vi: <>{list.length} mẫu</>, en: plural(list.length, "style", "styles") })}
          </p>
          <SortChip value={state.sort} onPick={(s) => onChange({ ...state, sort: s })} />
        </div>
      )}
      <div className="shop-grid">
        {list.length > 0 ? (
          list.map((s) => (
            <GridCard key={s.id} product={s} showLine={state.line === "all"} soldCount={closed} h={h} />
          ))
        ) : (
          <div className="empty">
            {/* The Vietnamese as the JSX it always was, its parts apart (`FeedCards.tsx` says why). */}
            <p>
              {t<React.ReactNode>({
                vi: (
                  <>
                    {lineLabel(state.line)} không có {state.family === "ALL" ? "mẫu nào" : familyShortLabel(state.family)}
                  </>
                ),
                en:
                  state.family === "ALL"
                    ? `${lineLabel(state.line, "en")} has no styles`
                    : `${lineLabel(state.line, "en")} has no ${familyShortLabel(state.family, "en")}`,
              })}
            </p>
            {other !== undefined && state.family !== "ALL" && (
              <button className="btn btn-line" type="button" onClick={() => onChange({ ...state, line: other })}>
                {t<React.ReactNode>({
                  vi: (
                    <>
                      Xem {familyShortLabel(state.family)} ở {lineLabel(other)}
                    </>
                  ),
                  en: `View ${familyShortLabel(state.family, "en")} in ${lineLabel(other, "en")}`,
                })}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "Sắp xếp": a chip that opens the three orders — a sheet on the phone, a
 * menu dropped from the chip from 900px (`feed.js`: `openSort`).
 */
function SortChip({ value, onPick }: { value: ShopState["sort"]; onPick: (s: ShopState["sort"]) => void }) {
  const locale = useLocale();
  const t = picker(locale);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ top: number; left: number } | undefined>(undefined);
  const chip = useRef<HTMLButtonElement>(null);

  function show() {
    const el = chip.current;
    if (el && window.matchMedia("(min-width: 900px)").matches) {
      const r = el.getBoundingClientRect();
      setPlace({ top: Math.round(r.bottom + 8), left: Math.round(Math.max(16, r.right - 280)) });
    } else {
      setPlace(undefined);
    }
    setOpen(true);
  }

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const opts = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-sort]")];
    const i = opts.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    opts[(i + (e.key === "ArrowDown" ? 1 : opts.length - 1)) % opts.length]?.focus();
  }

  return (
    <>
      <button
        ref={chip}
        className="chip sort-btn"
        type="button"
        aria-haspopup="dialog"
        aria-label={t({ vi: `Sắp xếp: ${sortLabel(value)}`, en: `Sort: ${sortLabel(value, "en")}` })}
        onClick={show}
      >
        <FeedIcon name="sliders-horizontal" />
        <span>{sortLabel(value, locale)}</span>
        <FeedIcon name="caret-down" />
      </button>
      <FeedSheet
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="sort-title"
        variant={place ? "drop" : undefined}
        place={place}
        back={chip.current}
      >
        <div className="sheet-panel">
          <div className="grab" aria-hidden="true" />
          <div className="sh-head plain">
            <h2 className="sh-title" id="sort-title">
              {t({ vi: "Sắp xếp", en: "Sort" })}
            </h2>
            <button className="sh-x" type="button" data-close aria-label={t({ vi: "Đóng", en: "Close" })}>
              <FeedIcon name="x" />
            </button>
          </div>
          <div className="sort-list" role="radiogroup" aria-labelledby="sort-title" onKeyDown={onKey}>
            {SHOP_SORTS.map((k) => (
              <button
                key={k}
                className="sort-opt"
                type="button"
                role="radio"
                aria-checked={k === value}
                data-sort={k}
                data-autofocus={k === value ? "" : undefined}
                onClick={() => {
                  onPick(k);
                  setOpen(false);
                }}
              >
                {sortLabel(k, locale)}
                <FeedIcon name="check" />
              </button>
            ))}
          </div>
        </div>
      </FeedSheet>
    </>
  );
}
