"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon/Icon";
import { startWait } from "@/components/shop/WaitVeil";
import type { Product } from "@/data/types";
import { isFixed, onHand } from "@/lib/inventory";
import { vnd } from "@/lib/money";
import { photoUrl } from "@/lib/photos";
import { SUGGEST_MIN, suggestFor, type MatchRange } from "@/lib/suggest";

interface SearchBoxProps {
  /** What the URL carried in, shown back in the box. */
  initial?: string;
  /**
   * What is searched: every style on sale, both kinds (v3 slice 11). Passed
   * as data rather than fetched — eighteen styles fit in the payload the
   * page already sends, and the browser never asks a server as it types.
   */
  pool: Product[];
}

/**
 * The search bar, and the list it opens while a term is being typed.
 *
 * A real `<form>`, so Enter submits and the phone keyboard shows a search
 * key. Submitting navigates, which puts the term in the URL — that is what
 * makes a result page something you can send to someone, and what makes Back
 * return to the previous search rather than to a blank box.
 *
 * It still does not search as you type: the RESULTS come from the URL. What
 * opens under the box from two characters on is a list of places to go —
 * four styles, three filters, and the way to the full result page — every
 * one of them read out of the styles on sale in the browser, with no request
 * made.
 *
 * Keyboard: ↑ ↓ walk the rows, Enter opens the active one or submits the
 * term, Escape closes the list and leaves the term alone. The input is a
 * `combobox` and points at the active row with `aria-activedescendant`,
 * because the focus never leaves the box.
 */
export function SearchBox({ initial = "", pool }: SearchBoxProps) {
  const router = useRouter();
  const [term, setTerm] = useState(initial);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLInputElement>(null);

  // Arriving with an empty box means the shopper came here to type. Focused
  // from an effect and NOT with `autoFocus`: the attribute focuses the input
  // while the HTML is still parsing, before React has a listener on it, so
  // `onFocus` never fires and the box would sit focused with its own
  // suggestions switched off until it was clicked away from and back.
  useEffect(() => {
    if (!initial) ref.current?.focus();
  }, [initial]);

  const suggestions = useMemo(() => suggestFor(pool, term), [pool, term]);
  const trimmed = term.trim();

  /** Every row the arrow keys can reach, in the order they are drawn. */
  const rows = [
    ...suggestions.styles.map((s) => ({
      id: `sg-${s.product.slug}`,
      href: `/products/${s.product.slug}`,
    })),
    ...suggestions.groups.map((g) => ({ id: `sg-${g.id}`, href: g.href })),
    { id: "sg-all", href: searchHref(trimmed) },
  ];

  const open =
    focused && !dismissed && trimmed.length >= SUGGEST_MIN && rows.length > 0;

  // Every navigation below goes through `push`, which tells the wait veil
  // first (`startWait`). Only a move to another page covers it — a style or
  // a family from the list, "Huỷ" to the home page; a new search stays on
  // `/search` and leaves it alone.
  function push(href: string) {
    startWait(href);
    router.push(href);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setDismissed(true);
    push(searchHref(trimmed));
  }

  function go(href: string) {
    setDismissed(true);
    push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setDismissed(true);
      setActive(-1);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? rows.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(rows[active]!.href);
    }
  }

  return (
    <form
      className="searchbar"
      role="search"
      onSubmit={submit}
      // One handler for the whole bar: a click on a suggestion moves focus
      // inside it, and closing on the input's own blur would take the row
      // away before the click landed on it.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="inpwrap">
        <Icon name="search" className="ic sm ico" />
        <input
          ref={ref}
          className="inp"
          type="search"
          name="q"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="suggest"
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? rows[active]!.id : undefined}
          aria-label="Tìm mẫu, loại hoặc màu"
          placeholder="Tìm mẫu, loại hoặc màu"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setDismissed(false);
            setActive(-1);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
        />
        {term && (
          <button
            type="button"
            className="clear"
            aria-label="Xoá từ khoá"
            onClick={() => {
              setTerm("");
              setActive(-1);
              ref.current?.focus();
              // The results on the page came from the URL, so clearing the
              // box has to clear them too or the button only half works.
              if (initial) push("/search");
            }}
          >
            <Icon name="x" className="ic sm" />
          </button>
        )}

        {open && (
          <div className="suggest" id="suggest" role="listbox" aria-label="Gợi ý">
            {suggestions.styles.length > 0 && <div className="lb">Mẫu</div>}
            {suggestions.styles.map((s, i) => (
              <Link
                key={s.product.slug}
                id={`sg-${s.product.slug}`}
                role="option"
                aria-selected={active === i}
                data-active={active === i || undefined}
                href={`/products/${s.product.slug}`}
                onPointerEnter={() => setActive(i)}
                onClick={() => setDismissed(true)}
              >
                <Image
                  src={photoUrl(s.product.photoKeys[0]!, 160)}
                  alt=""
                  width={36}
                  height={45}
                />
                <span>
                  <b>
                    {/* The name as shown — "S05 – KHÓI" — and the match found
                        in it, so "s05" marks the code (`suggestFor`). */}
                    <Marked text={s.name} range={s.range} />
                  </b>
                  {/* No figure for a fixed style, as on its card (v3 slice 11). */}
                  <span className="d">
                    {isFixed(s.product)
                      ? s.product.kind
                      : `${s.product.kind} · còn ${onHand(s.product)}`}
                  </span>
                </span>
                <span className="p">{vnd(s.product.priceVnd)}</span>
              </Link>
            ))}

            {suggestions.groups.length > 0 && (
              <div className="lb">{suggestions.fallback ? "Đang bán" : "Loại"}</div>
            )}
            {suggestions.groups.map((g, i) => {
              const at = suggestions.styles.length + i;
              return (
                <Link
                  key={g.id}
                  id={`sg-${g.id}`}
                  className="plain"
                  role="option"
                  aria-selected={active === at}
                  data-active={active === at || undefined}
                  href={g.href}
                  onPointerEnter={() => setActive(at)}
                  onClick={() => setDismissed(true)}
                >
                  <span>
                    <b>
                      <Marked text={g.label} range={g.range} />
                    </b>
                    <span className="d">{g.styles} mẫu</span>
                  </span>
                  <span className="p">từ {vnd(g.fromVnd)}</span>
                </Link>
              );
            })}

            <div className="lb">Tìm tất cả</div>
            <Link
              id="sg-all"
              className="plain"
              role="option"
              aria-selected={active === rows.length - 1}
              data-active={active === rows.length - 1 || undefined}
              href={searchHref(trimmed)}
              onPointerEnter={() => setActive(rows.length - 1)}
              onClick={() => setDismissed(true)}
            >
              <span>
                Tìm “{trimmed}” trong {pool.length} mẫu
              </span>
              <Icon name="chev" className="ic sm" />
            </Link>
          </div>
        )}
      </div>

      {/* Back where they came from, which is not always the listing — the bar
          is reachable from the nav on every screen. */}
      <button
        type="button"
        className="cancel"
        onClick={() => {
          // Back is a `popstate`, which the veil hears for itself.
          if (window.history.length > 1) router.back();
          else push("/");
        }}
      >
        Huỷ
      </button>
    </form>
  );
}

function searchHref(term: string): string {
  return term ? `/search?q=${encodeURIComponent(term)}` : "/search";
}

/**
 * The matched run, marked.
 *
 * `<mark>` arrives wearing the browser's own yellow, which is a second brand
 * colour nobody chose; `listing.css` repaints it in weight and honey ink.
 */
function Marked({ text, range }: { text: string; range: MatchRange | null }) {
  if (!range) return <>{text}</>;
  const [a, b] = range;
  return (
    <>
      {text.slice(0, a)}
      <mark>{text.slice(a, b)}</mark>
      {text.slice(b)}
    </>
  );
}
