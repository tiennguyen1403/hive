"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import { clearSearches, forgetRecent, recordSearch, useRecentSearches } from "@/components/shop/recent-searches";
import { searchPool, searchRail, searchStyles, suggestTerms } from "@/lib/feed-search";
import { picker, plural } from "@/lib/i18n";
import { backOrFollow } from "../back";
import { Rail } from "../FeedBlocks";
import { GridCard } from "../FeedCards";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow } from "../now";

/** How long typing rests before the results follow it (the mock's 140ms). */
const SETTLE_MS = 140;

/**
 * Search, round v4 "Feed" (slice 1b): the approved mock's `search.html` and
 * `search.js`. The field at the top — with "Huỷ" on the phone — and under it:
 *
 * · nothing typed: "Tìm gần đây" (this device's, each chip removable, "Xoá
 *   hết"), "Gợi ý", and the rail of what sells;
 * · a query: its count and the shop's grid of what it found;
 * · nothing found: one line, "Thử tìm", and the way to Cửa hàng.
 *
 * Matching is the mock's: every word of the query, accents and case aside,
 * in a style's name, kind, material, family, fit or print (`searchStyles`),
 * over the shop's two lines (`searchPool`). Results follow the typing after a
 * short rest; the query is kept in the address (`?q=`, replaced, not pushed)
 * so a reload or a shared link finds it again, and the server renders it
 * first. A search is remembered when it is sent or a chip is chosen — one
 * that found nothing is not (`rememberSearch`).
 *
 * In both languages since round v6 slice E1: an English page searches the
 * styles' English words and Vietnamese names, finds a family by its English
 * name ("Bottoms" is CHINOS and FLEECE SHORTS), and suggests in English
 * (`lib/feed-search.ts`).
 */
export function SearchScreen({ initial }: { initial: string }) {
  const catalog = useCatalog();
  const now = useNow();
  const locale = useLocale();
  const t = picker(locale);
  const pool = useMemo(() => searchPool(catalog, now), [catalog, now]);
  const rail = useMemo(() => searchRail(catalog, now, locale), [catalog, now, locale]);
  const terms = useMemo(() => suggestTerms(pool, locale), [pool, locale]);
  const { list: recents, ready } = useRecentSearches();

  const [value, setValue] = useState(initial);
  const [query, setQuery] = useState(initial.trim());
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef(0);
  const refocus = useRef(false);

  const hits = useMemo(() => searchStyles(pool, query, locale), [pool, query, locale]);

  // The query in the address and the tab's title, as the results show it.
  function show(next: string) {
    const q = next.trim();
    setQuery(q);
    const url = q ? `${window.location.pathname}?q=${encodeURIComponent(q)}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  // The tab's title, as `generateMetadata` (`app/search/page.tsx`) writes it: "hoodie · Tìm", in English "hoodie · Search".
  useEffect(() => {
    const word = picker(locale)({ vi: "Tìm", en: "Search" });
    document.title = query ? `${query} · ${word} · HIVE` : `${word} · HIVE`;
  }, [query, locale]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // After a chip goes, the next one takes the focus — or the field, once the list is empty.
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    const next = document.querySelector<HTMLElement>("[data-ui='feed'] .rchip-go") ?? input.current;
    next?.focus({ preventScroll: true });
  }, [recents]);

  function remember(term: string) {
    const typed = term.trim();
    if (typed) recordSearch(typed, searchStyles(pool, typed, locale).length);
  }

  function onInput(next: string) {
    setValue(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => show(next), SETTLE_MS);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    window.clearTimeout(timer.current);
    remember(value);
    show(value);
    input.current?.blur();
  }

  function clear() {
    window.clearTimeout(timer.current);
    setValue("");
    show("");
    input.current?.focus();
  }

  function pick(term: string) {
    window.clearTimeout(timer.current);
    setValue(term);
    remember(term);
    show(term);
    window.scrollTo(0, 0);
  }

  function forget(term: string) {
    refocus.current = true;
    forgetRecent(term);
  }

  function forgetAll() {
    clearSearches();
    input.current?.focus({ preventScroll: true });
  }

  const suggestions = (title: string) => (
    <section className="ssec" aria-labelledby="s-sug">
      <h2 className="ssec-title" id="s-sug">
        {title}
      </h2>
      <div className="schips">
        {/* Keyed by place: the suggestions change with the language. */}
        {terms.map((term, i) => (
          <button key={i} className="schip" type="button" onClick={() => pick(term)}>
            {term}
          </button>
        ))}
      </div>
    </section>
  );

  let body: React.ReactNode;
  if (!query) {
    body = (
      <>
        {ready && recents.length > 0 && (
          <section className="ssec" aria-labelledby="s-recent">
            <div className="ssec-head">
              <h2 className="ssec-title" id="s-recent">
                {t({ vi: "Tìm gần đây", en: "Recent searches" })}
              </h2>
              <button className="link" type="button" onClick={forgetAll}>
                {t({ vi: "Xoá hết", en: "Clear all" })}
              </button>
            </div>
            <div className="schips">
              {recents.map((term) => (
                <span className="rchip" key={term}>
                  <button className="rchip-go" type="button" onClick={() => pick(term)}>
                    <FeedIcon name="clock-counter-clockwise" />
                    <span>{term}</span>
                  </button>
                  <button
                    className="rchip-x"
                    type="button"
                    aria-label={t({ vi: `Xoá “${term}” khỏi tìm gần đây`, en: `Remove “${term}” from recent searches` })}
                    onClick={() => forget(term)}
                  >
                    <FeedIcon name="x" />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}
        {suggestions(t({ vi: "Gợi ý", en: "Suggestions" }))}
        {rail.items.length > 0 && (
          <Rail
            id="s-rail"
            title={t({ vi: "Cửa hàng", en: "Shop" })}
            sub={rail.sub}
            more={{ href: rail.href, label: t({ vi: "Xem tất cả", en: "View all" }) }}
            items={rail.items}
          />
        )}
      </>
    );
  } else if (hits.length > 0) {
    body = (
      <>
        <div className="sres-head">
          {/* The Vietnamese as the JSX it always was, words and figures apart (`FeedCards.tsx` says why). */}
          <p className="count" aria-live="polite">
            {t({
              vi: (
                <>
                  <b>{hits.length} mẫu</b> cho “{query}”
                </>
              ),
              en: (
                <>
                  <b>{plural(hits.length, "style", "styles")}</b> for “{query}”
                </>
              ),
            })}
          </p>
        </div>
        <div className="shop-grid">
          {hits.map((s) => (
            <GridCard key={s.id} product={s} showLine h="h2" />
          ))}
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div className="snone">
          <p className="snone-line" aria-live="polite">
            {t<React.ReactNode>({ vi: <>Không có mẫu nào cho “{query}”</>, en: `No styles for “${query}”` })}
          </p>
        </div>
        {suggestions(t({ vi: "Thử tìm", en: "Try searching" }))}
        <div className="snone-act">
          <Link className="btn btn-line" href="/products">
            {t({ vi: "Xem Cửa hàng", en: "Go to Shop" })}
          </Link>
        </div>
      </>
    );
  }

  const fieldName = t({ vi: "Tìm mẫu, loại, chất liệu", en: "Search styles, types, fabrics" });

  return (
    <div className="srch">
      <h1 className="sr-only">{t({ vi: "Tìm", en: "Search" })}</h1>
      <div className="sbar">
        {/* Without script the form still searches: a GET to this page with `q`, which the server renders. */}
        <form className="sform" role="search" action="/search" onSubmit={onSubmit}>
          <FeedIcon name="magnifying-glass" />
          <input
            ref={input}
            id="q"
            name="q"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            spellCheck={false}
            placeholder={fieldName}
            aria-label={fieldName}
            value={value}
            onChange={(e) => onInput(e.target.value)}
          />
          {value !== "" && (
            <button className="sclear" type="button" aria-label={t({ vi: "Xoá chữ", en: "Clear" })} onClick={clear}>
              <FeedIcon name="x" />
            </button>
          )}
        </form>
        <Link className="scancel" href="/" onClick={backOrFollow}>
          {t({ vi: "Huỷ", en: "Cancel" })}
        </Link>
      </div>
      <div className="sbody">{body}</div>
    </div>
  );
}
