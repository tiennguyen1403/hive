"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCatalog } from "@/components/shop/CatalogContext";
import { clearSearches, forgetRecent, recordSearch, useRecentSearches } from "@/components/shop/recent-searches";
import { searchPool, searchRail, searchStyles, suggestTerms } from "@/lib/feed-search";
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
 */
export function SearchScreen({ initial }: { initial: string }) {
  const catalog = useCatalog();
  const now = useNow();
  const pool = useMemo(() => searchPool(catalog, now), [catalog, now]);
  const rail = useMemo(() => searchRail(catalog, now), [catalog, now]);
  const terms = useMemo(() => suggestTerms(pool), [pool]);
  const { list: recents, ready } = useRecentSearches();

  const [value, setValue] = useState(initial);
  const [query, setQuery] = useState(initial.trim());
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef(0);
  const refocus = useRef(false);

  const hits = useMemo(() => searchStyles(pool, query), [pool, query]);

  // The query in the address and the tab's title, as the results show it.
  function show(next: string) {
    const q = next.trim();
    setQuery(q);
    const url = q ? `${window.location.pathname}?q=${encodeURIComponent(q)}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  useEffect(() => {
    document.title = query ? `${query} · Tìm · HIVE` : "Tìm · HIVE";
  }, [query]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // After a chip goes, the next one takes the focus — or the field, once the list is empty.
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    const next = document.querySelector<HTMLElement>("[data-ui='feed'] .rchip-go") ?? input.current;
    next?.focus({ preventScroll: true });
  }, [recents]);

  function remember(term: string) {
    const t = term.trim();
    if (t) recordSearch(t, searchStyles(pool, t).length);
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
        {terms.map((t) => (
          <button key={t} className="schip" type="button" onClick={() => pick(t)}>
            {t}
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
                Tìm gần đây
              </h2>
              <button className="link" type="button" onClick={forgetAll}>
                Xoá hết
              </button>
            </div>
            <div className="schips">
              {recents.map((t) => (
                <span className="rchip" key={t}>
                  <button className="rchip-go" type="button" onClick={() => pick(t)}>
                    <FeedIcon name="clock-counter-clockwise" />
                    <span>{t}</span>
                  </button>
                  <button
                    className="rchip-x"
                    type="button"
                    aria-label={`Xoá “${t}” khỏi tìm gần đây`}
                    onClick={() => forget(t)}
                  >
                    <FeedIcon name="x" />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}
        {suggestions("Gợi ý")}
        {rail.items.length > 0 && (
          <Rail id="s-rail" title="Cửa hàng" sub={rail.sub} more={{ href: rail.href, label: "Xem tất cả" }} items={rail.items} />
        )}
      </>
    );
  } else if (hits.length > 0) {
    body = (
      <>
        <div className="sres-head">
          <p className="count" aria-live="polite">
            <b>{hits.length} mẫu</b> cho “{query}”
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
            Không có mẫu nào cho “{query}”
          </p>
        </div>
        {suggestions("Thử tìm")}
        <div className="snone-act">
          <Link className="btn btn-line" href="/products">
            Xem Cửa hàng
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="srch">
      <h1 className="sr-only">Tìm</h1>
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
            placeholder="Tìm mẫu, loại, chất liệu"
            aria-label="Tìm mẫu, loại, chất liệu"
            value={value}
            onChange={(e) => onInput(e.target.value)}
          />
          {value !== "" && (
            <button className="sclear" type="button" aria-label="Xoá chữ" onClick={clear}>
              <FeedIcon name="x" />
            </button>
          )}
        </form>
        <Link className="scancel" href="/" onClick={backOrFollow}>
          Huỷ
        </Link>
      </div>
      <div className="sbody">{body}</div>
    </div>
  );
}
