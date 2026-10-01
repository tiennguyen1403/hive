"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { fold } from "@/lib/catalog-query";
import { picker } from "@/lib/i18n";
import { FeedIcon } from "./icon/FeedIcon";
import { FeedSheet } from "./FeedSheet";

export interface PickItem {
  value: string;
  label: string;
}

interface FeedPickerProps {
  open: boolean;
  onClose: () => void;
  /** "Tỉnh / thành", "Phường / xã". */
  title: string;
  /** The line under the title: the province a commune is picked in. */
  sub?: string | undefined;
  /** "Tìm tỉnh / thành": the field's placeholder and its name. */
  placeholder: string;
  items: readonly PickItem[];
  /** The value chosen now, ticked and scrolled to. */
  value: string | null;
  /** The line the list shows while it has nothing to list yet: still arriving, or it could not be fetched. */
  waiting?: string | null | undefined;
  onPick: (item: PickItem) => void;
  /** The control that opened it, where the focus goes back. */
  back: HTMLElement | null;
}

const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * A searchable list in a sheet, for the checkout's two address pickers
 * (`feed.js`: `openPicker`): the title, the search field — accent-insensitive,
 * "ho chi minh" finds "TP. Hồ Chí Minh" — and the list with the current choice
 * ticked. ↓ and ↑ move through the list and back to the field, Enter or Space
 * picks, and Enter in the field picks the one row it narrowed to.
 *
 * On a mouse the field takes the focus; on a touch screen the keyboard would
 * cover half the list, so the focus rests on the current choice, or the first
 * row, scrolled into the middle.
 *
 * Its own words in the page's language since round v6 slice E1 ("Close", "No
 * results"); the title, the field's name and the waiting line are the caller's.
 */
export function FeedPicker({ open, onClose, title, sub, placeholder, items, value, waiting, onPick, back }: FeedPickerProps) {
  const t = picker(useLocale());
  const [query, setQuery] = useState("");
  const list = useRef<HTMLUListElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const picked = useRef<PickItem | null>(null);

  const hits = useMemo(() => {
    const q = fold(query);
    return q ? items.filter((it) => fold(it.label).includes(q)) : items;
  }, [items, query]);

  // Each opening starts on the whole list, as the mock rebuilds the sheet each time.
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  // Once open — and again when a list that was still arriving comes in — the current choice in the middle of the
  // list, and the focus where the pointer allows (the caller keeps `items` the same array between renders).
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const ul = list.current;
      if (!ul) return;
      const current = ul.querySelector<HTMLElement>('[aria-selected="true"]');
      current?.scrollIntoView({ block: "center" });
      if (finePointer()) field.current?.focus({ preventScroll: true });
      else (current ?? ul.querySelector<HTMLElement>('[role="option"]') ?? field.current)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, items]);

  function pick(item: PickItem) {
    picked.current = item;
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const ul = list.current;
    if (!ul) return;
    const opts = [...ul.querySelectorAll<HTMLElement>('[role="option"]')];
    const i = opts.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      (opts[i + 1] ?? opts[0] ?? field.current)?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (i <= 0 ? field.current : opts[i - 1])?.focus();
    } else if ((e.key === "Enter" || e.key === " ") && i >= 0) {
      e.preventDefault();
      const it = hits[i];
      if (it) pick(it);
    } else if (e.key === "Enter" && document.activeElement === field.current && hits.length === 1) {
      e.preventDefault();
      pick(hits[0]!);
    }
  }

  // The pick lands once the sheet has closed, as the mock's `closeSheet(d, () => o.onPick(it))`.
  function onClosed() {
    const it = picked.current;
    picked.current = null;
    if (it) onPick(it);
  }

  return (
    <FeedSheet open={open} onClose={onClose} onClosed={onClosed} labelledBy="pick-title" variant="picker" back={back}>
      <div className="sheet-panel" onKeyDown={onKeyDown}>
        <div className="grab" aria-hidden="true" />
        <div className="sh-head plain">
          <div>
            <h2 className="sh-title" id="pick-title">
              {title}
            </h2>
            {sub && <p className="sh-sub">{sub}</p>}
          </div>
          <button className="sh-x" type="button" data-close aria-label={t({ vi: "Đóng", en: "Close" })}>
            <FeedIcon name="x" />
          </button>
        </div>
        <div className="pick-search">
          <FeedIcon name="magnifying-glass" />
          <input
            ref={field}
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder={placeholder}
            aria-label={placeholder}
            aria-controls="pick-list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="pick-list" id="pick-list" role="listbox" aria-labelledby="pick-title" ref={list}>
          {hits.map((it) => (
            <li
              key={it.value}
              className="pick-opt"
              role="option"
              tabIndex={-1}
              aria-selected={it.value === value}
              onClick={() => pick(it)}
            >
              <span>{it.label}</span>
              <FeedIcon name="check" />
            </li>
          ))}
        </ul>
        {hits.length === 0 && (
          <p className="pick-empty">{items.length === 0 && waiting ? waiting : t({ vi: "Không có kết quả", en: "No results" })}</p>
        )}
      </div>
    </FeedSheet>
  );
}
