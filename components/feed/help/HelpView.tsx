"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { useCatalog } from "@/components/shop/CatalogContext";
import {
  helpGroups,
  helpNext,
  helpQuery,
  helpSearch,
  helpWords,
  isHelpGroupId,
  markPieces,
  type HelpBit,
  type HelpGroup,
  type HelpGroupId,
  type HelpItem,
} from "@/lib/feed-help";
import { picker } from "@/lib/i18n";
import { FeedIcon } from "../icon/FeedIcon";
import { useNow } from "../now";
import { cx } from "../useReveal";

/** How long typing rests before the list follows it (the mock's 120ms). */
const SETTLE_MS = 120;

/** What the list shows: the query it was last drawn for, and whether the field held anything then. */
interface Shown {
  q: string;
  filled: boolean;
}

/** The answers open after a render: every one a search finds, or every one of the group the address names. */
function openFor(groups: readonly HelpGroup[], words: readonly string[], group: HelpGroupId | null): Set<string> {
  if (words.length > 0) return new Set(helpSearch(groups, words).flatMap((g) => g.items.map((it) => it.id)));
  const g = group ? groups.find((x) => x.id === group) : undefined;
  return new Set(g ? g.items.map((it) => it.id) : []);
}

/**
 * Hỏi đáp (round v4 slice 4b): the approved mock's `help.html` and `help.js`.
 * The title; the field "Tìm câu hỏi"; the groups as chips that jump to them
 * (on a phone a row that scrolls, from 900px a column that stays beside the
 * answers); each group its questions as `<details>`, opened by the plus; then
 * "Không thấy câu cần tìm?" and the way to write to the shop, which is
 * `/contact` as it stands (the user, 30/09).
 *
 * The search is the mock's: every word, accents and case aside, in the
 * question, the answer or its link (`helpSearch`); the list follows the typing
 * after a short rest, the answers it finds open, the words marked where they
 * stand. The query lives in the address (`?q=`, replaced, not pushed), so a
 * reload or a shared link finds it again and the server draws it first.
 * Nothing found: one line and "Xoá tìm".
 *
 * A group named in the address (`#doi-tra`: every "Đổi trả" link of the app,
 * and `/returns`) opens with all its answers, the search cleared, and comes
 * into view — on arrival and whenever the hash changes (the chips are plain
 * anchors, so the browser's own jump comes back through `hashchange`).
 *
 * In the page's language since round v6 slice E3b ("FAQ", "Search
 * questions", the answers of `helpGroups(next, locale)`). The answers' ids
 * are the same in both languages, so an answer open before a switch of
 * language is still open after it; a search runs over the words on screen.
 */
export function HelpView({ initial }: { initial: string }) {
  const catalog = useCatalog();
  const now = useNow();
  const locale = useLocale();
  const t = picker(locale);
  const groups = useMemo(() => helpGroups(helpNext(catalog, now), locale), [catalog, now, locale]);

  const [value, setValue] = useState(initial);
  const [shown, setShown] = useState<Shown>({ q: initial.trim(), filled: initial !== "" });
  const [open, setOpen] = useState<ReadonlySet<string>>(() => openFor(groups, helpWords(initial), null));
  const [jump, setJump] = useState<{ id: HelpGroupId } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef(0);
  const current = useRef({ value, groups });
  current.current = { value, groups };

  const words = useMemo(() => helpWords(shown.q), [shown.q]);
  const list = useMemo(() => helpSearch(groups, words), [groups, words]);

  /** The mock's `render`: draw the list for a query, open what it finds, and — asked to — keep it in the address. */
  function render(v: string, opts: { write?: boolean; group?: HelpGroupId | null } = {}) {
    const q = v.trim();
    setShown({ q, filled: v !== "" });
    setOpen(openFor(current.current.groups, helpWords(q), opts.group ?? null));
    if (opts.write) {
      const { pathname, hash } = window.location;
      window.history.replaceState(null, "", `${pathname}${helpQuery(q)}${q ? "" : hash}`);
    }
  }

  function onInput(next: string) {
    setValue(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => render(next, { write: true }), SETTLE_MS);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    window.clearTimeout(timer.current);
    render(value, { write: true });
    input.current?.blur();
  }

  function clear() {
    window.clearTimeout(timer.current);
    setValue("");
    render("", { write: true });
    input.current?.focus();
  }

  function toggled(id: string, isOpen: boolean) {
    setOpen((was) => {
      if (was.has(id) === isOpen) return was;
      const next = new Set(was);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // A group named in the address opens with every answer, the search cleared (the mock's `openHash`): on arrival
  // unless the address also carries a search, and whenever the hash changes — a chip, Back and Forward.
  useEffect(() => {
    const openHash = () => {
      const id = window.location.hash.slice(1);
      if (!isHelpGroupId(id)) return;
      window.clearTimeout(timer.current);
      if (current.current.value) setValue("");
      render("", { group: id });
      // A search the address still carried is over; the filter in the address says so too.
      if (new URLSearchParams(window.location.search).has("q")) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
      }
      setJump({ id });
    };
    if (window.location.hash && !current.current.value) openHash();
    window.addEventListener("hashchange", openHash);
    return () => {
      window.removeEventListener("hashchange", openHash);
      window.clearTimeout(timer.current);
    };
    // Set once: `render` reads the latest groups and field through `current`.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The group opened from the address comes to the top, once its answers are drawn.
  useEffect(() => {
    if (jump) document.getElementById(jump.id)?.scrollIntoView({ block: "start" });
  }, [jump]);

  const fieldName = t({ vi: "Tìm câu hỏi", en: "Search questions" });

  return (
    <>
      <div className="b-head">
        <h1 className="b-title disp">{t({ vi: "Hỏi đáp", en: "FAQ" })}</h1>
      </div>
      <div className="b-help-top">
        {/* Without script the form still searches: a GET to this page with `q`, which the server draws. */}
        <form className="sform" role="search" action="/faq" onSubmit={onSubmit}>
          <FeedIcon name="magnifying-glass" />
          <input
            ref={input}
            id="hq"
            name="q"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            spellCheck={false}
            placeholder={fieldName}
            aria-label={fieldName}
            aria-controls="help-body"
            value={value}
            onChange={(e) => onInput(e.target.value)}
          />
          {shown.filled && (
            <button className="sclear" type="button" aria-label={t({ vi: "Xoá chữ", en: "Clear" })} onClick={clear}>
              <FeedIcon name="x" />
            </button>
          )}
        </form>
      </div>
      <div className={cx("b-help", words.length > 0 && "is-search")}>
        <nav className="chips b-cats" aria-label={t({ vi: "Nhóm câu hỏi", en: "Question groups" })}>
          {groups.map((g) => (
            <a key={g.id} className="chip" href={`#${g.id}`}>
              {g.title}
            </a>
          ))}
        </nav>
        <div className="b-help-body" id="help-body">
          {list.length > 0 ? (
            list.map((g) => (
              <section key={g.id} className="b-qgroup" id={g.id} aria-labelledby={`h-${g.id}`}>
                <h2 className="b-qgroup-title disp" id={`h-${g.id}`}>
                  {g.title}
                </h2>
                {g.items.map((it) => (
                  <Qa key={it.id} item={it} words={words} open={open.has(it.id)} onToggle={toggled} />
                ))}
              </section>
            ))
          ) : (
            <div className="b-help-none">
              <p className="snone-line" aria-live="polite">
                {t<React.ReactNode>({ vi: <>Không có câu nào khớp “{shown.q}”</>, en: `No questions match “${shown.q}”` })}
              </p>
              <button className="btn btn-line" type="button" onClick={clear}>
                {t({ vi: "Xoá tìm", en: "Clear search" })}
              </button>
            </div>
          )}
        </div>
        <section className="b-help-more" aria-labelledby="h-more">
          <h2 className="sect-title" id="h-more">
            {t({ vi: "Không thấy câu cần tìm?", en: "Can't find your question?" })}
          </h2>
          <Link className="btn btn-blue" href="/contact">
            <FeedIcon name="chat-circle-text" />
            {t({ vi: "Gửi tin nhắn", en: "Send a message" })}
          </Link>
        </section>
      </div>
    </>
  );
}

/** One question and its answer (the mock's `qa`): the plus turns into a cross while it is open. */
function Qa({
  item,
  words,
  open,
  onToggle,
}: {
  item: HelpItem;
  words: readonly string[];
  open: boolean;
  onToggle: (id: string, open: boolean) => void;
}) {
  return (
    <details className="b-qa" id={item.id} open={open} onToggle={(e) => onToggle(item.id, e.currentTarget.open)}>
      <summary>
        <span className="b-qa-q">
          <Marked text={item.q} words={words} />
        </span>
        <FeedIcon name="plus" />
      </summary>
      <div className="b-qa-a">
        <p>
          {item.a.map((bit, i) => (
            <Bit key={i} bit={bit} words={words} />
          ))}
        </p>
        {item.go && (
          <Link className="link" href={item.go.href}>
            <Marked text={item.go.label} words={words} />
            <FeedIcon name="arrow-right" />
          </Link>
        )}
      </div>
    </details>
  );
}

function Bit({ bit, words }: { bit: HelpBit; words: readonly string[] }) {
  if (typeof bit === "string") return <Marked text={bit} words={words} />;
  return (
    <b>
      <Marked text={bit.b} words={words} />
    </b>
  );
}

/** A text with the search's words marked where they stand (`mark.b-hit`). */
function Marked({ text, words }: { text: string; words: readonly string[] }) {
  if (words.length === 0) return <>{text}</>;
  return (
    <>
      {markPieces(text, words).map((p, i) =>
        p.hit ? (
          <mark key={i} className="b-hit">
            {p.text}
          </mark>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}
