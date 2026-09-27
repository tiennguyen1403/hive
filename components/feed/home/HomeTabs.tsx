"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { parseShopState, shopQuery, type ShopLine, type ShopState } from "@/lib/feed";
import { cx } from "../useReveal";

/*
 * The home page's three tabs — Bảng tin, Cửa hàng, Sắp mở — switched in place
 * with the hash kept in step (`home.js`: `show`, the tablist's keys, the
 * `hashchange` listener). The first two were once Khám phá and Đang bán, so
 * `#kham-pha` and `#dang-ban` still open them; `#next`, the v3 home's
 * next-issue block, which the inbox, the closed issue page and `/so/N` still
 * link to, opens Sắp mở, where the next issue comes first.
 *
 * The Cửa hàng tab's grid state lives here too, because links elsewhere on
 * the page open that tab on a given line (the open issue's story, "Xem 8
 * mẫu", "Xem Cố định"; since slice 1b the rails' "Xem tất cả" and "Xem lại"
 * lead to `/products` instead, as the mock's lead to `products.html`), and
 * because it belongs in the URL (QĐ-8, rule 17 the user
 * kept): `?line=`, `?family=`, written with `history.replaceState`, which
 * Next's router follows without a round trip.
 */

export const HOME_TABS = ["bang-tin", "cua-hang", "sap-mo"] as const;
export type HomeTab = (typeof HOME_TABS)[number];

const LABELS: Record<HomeTab, string> = { "bang-tin": "Bảng tin", "cua-hang": "Cửa hàng", "sap-mo": "Sắp mở" };
const ALIAS: Record<string, HomeTab> = { "kham-pha": "bang-tin", "dang-ban": "cua-hang", next: "sap-mo" };

function tabOf(hash: string): string {
  const h = hash.replace(/^#/, "");
  return ALIAS[h] ?? h;
}
const isTab = (id: string): id is HomeTab => (HOME_TABS as readonly string[]).includes(id);

/**
 * Before the first paint, the zone shows the tab the address names: a reload
 * on `#cua-hang` must not show Bảng tin first. It writes `data-tab` on the
 * zone root, which the stylesheet reads; the tabs write the same attribute
 * from then on.
 */
export const HOME_TAB_SCRIPT =
  "(function(){var s=document.currentScript,z=s&&s.closest('[data-ui=\"feed\"]');if(!z)return;" +
  `var h=location.hash.slice(1),a=${JSON.stringify(ALIAS)};h=a[h]||h;` +
  "if(h==='bang-tin'||h==='cua-hang'||h==='sap-mo')z.setAttribute('data-tab',h);})();";

interface HomeTabsApi {
  current: HomeTab;
  /** The panel that has just come in, for its fade. */
  entering: HomeTab | null;
  show: (id: HomeTab, opts?: { focus?: boolean; write?: boolean }) => void;
  lines: readonly ShopLine[];
  shop: ShopState;
  setShop: (next: ShopState) => void;
}

const Ctx = createContext<HomeTabsApi | null>(null);

function useHomeTabs(): HomeTabsApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("the home tabs need <HomeTabs> above them");
  return api;
}

export function useHomeShop(): Pick<HomeTabsApi, "lines" | "shop" | "setShop"> {
  const { lines, shop, setShop } = useHomeTabs();
  return { lines, shop, setShop };
}

function zone(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-ui="feed"].feed-frame');
}

/** The address with this grid state and this tab. */
function address(state: ShopState, lines: readonly ShopLine[], tab: string): string {
  const q = shopQuery(state, lines);
  return `${window.location.pathname}${q ? `?${q}` : ""}${tab ? `#${tab}` : ""}`;
}

export function HomeTabs({
  lines,
  initialShop,
  children,
}: {
  lines: readonly ShopLine[];
  initialShop: ShopState;
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState<HomeTab>("bang-tin");
  const [entering, setEntering] = useState<HomeTab | null>(null);
  const [shop, setShopState] = useState<ShopState>(initialShop);
  const on = useRef<HomeTab | null>(null);
  const scrolls = useRef<Partial<Record<HomeTab, number>>>({});

  const focusTab = (id: HomeTab) => document.getElementById(`tab-${id}`)?.focus();

  const show = useCallback((id: HomeTab, opts: { focus?: boolean; write?: boolean } = {}) => {
    const { focus = false, write = true } = opts;
    const was = on.current;
    if (id === was) {
      if (focus) focusTab(id);
      return;
    }
    const first = was === null;
    if (was) scrolls.current[was] = window.scrollY;
    on.current = id;
    zone()?.setAttribute("data-tab", id);
    setCurrent(id);
    setEntering(first ? null : id);
    if (write && window.location.hash !== `#${id}`) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
    }
    if (!first) window.scrollTo(0, scrolls.current[id] ?? 0);
    if (focus) focusTab(id);
  }, []);

  const setShop = useCallback(
    (next: ShopState) => {
      setShopState(next);
      window.history.replaceState(null, "", address(next, lines, window.location.hash.slice(1)));
    },
    [lines],
  );

  // The tab the address names, before the browser paints what React hydrated.
  useLayoutEffect(() => {
    const start = tabOf(window.location.hash);
    show(isTab(start) ? start : "bang-tin", { write: isTab(start) });
  }, [show]);

  useEffect(() => {
    // An old hash is rewritten to its new name; a hash that names no tab leaves the page as it is.
    const onHash = () => {
      const id = tabOf(window.location.hash) || "bang-tin";
      if (!isTab(id)) return;
      if (window.location.hash && window.location.hash.slice(1) !== id) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
      }
      show(id, { write: false });
    };
    // A link on this page to a tab with a grid state ("?line=fixed#cua-hang"): set the grid, open the tab,
    // keep the address — no navigation. A link that changes only the hash is the browser's own, and comes
    // back through `hashchange`.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      const href = a?.getAttribute("href");
      if (!a || href == null) return;
      const target = a.getAttribute("target");
      if (target && target !== "_self") return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
      if (url.search === window.location.search) return;
      const id = tabOf(url.hash);
      if (!isTab(id)) return;
      e.preventDefault();
      const next = parseShopState(Object.fromEntries(url.searchParams), lines);
      setShopState(next);
      window.history.replaceState(null, "", address(next, lines, id));
      show(id, { write: false });
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick);
    };
  }, [lines, show]);

  const api = useMemo(
    () => ({ current, entering, show, lines, shop, setShop }),
    [current, entering, show, lines, shop, setShop],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** The three tabs in the top bar, with the sliding blue rule under the one on show. */
export function HomeTabList() {
  const { current, show } = useHomeTabs();
  const list = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLSpanElement>(null);
  const moved = useRef(false);

  const moveInk = useCallback((animate: boolean) => {
    const box = list.current;
    const bar = ink.current;
    const label = box?.querySelector<HTMLElement>('[aria-selected="true"] span');
    if (!box || !bar || !label) return;
    const lr = label.getBoundingClientRect();
    const tr = box.getBoundingClientRect();
    if (!animate) bar.style.transition = "none";
    const w = lr.width + 12;
    bar.style.transform = `translateX(${Math.round(lr.left - tr.left - 6)}px) scaleX(${(w / 100).toFixed(4)})`;
    if (!animate) {
      void bar.offsetWidth;
      bar.style.transition = "";
    }
  }, []);

  useLayoutEffect(() => {
    moveInk(moved.current);
    moved.current = true;
  }, [current, moveInk]);

  useEffect(() => {
    const onResize = () => moveInk(false);
    window.addEventListener("resize", onResize);
    void document.fonts?.ready.then(() => moveInk(false));
    return () => window.removeEventListener("resize", onResize);
  }, [moveInk]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const i = HOME_TABS.indexOf(current);
    let j: number | null = null;
    if (e.key === "ArrowRight") j = (i + 1) % HOME_TABS.length;
    if (e.key === "ArrowLeft") j = (i - 1 + HOME_TABS.length) % HOME_TABS.length;
    if (e.key === "Home") j = 0;
    if (e.key === "End") j = HOME_TABS.length - 1;
    if (j === null) return;
    e.preventDefault();
    show(HOME_TABS[j]!, { focus: true });
  }

  return (
    <div className="tabs" role="tablist" aria-label="Trang chủ" ref={list} onKeyDown={onKeyDown}>
      {HOME_TABS.map((id) => (
        <button
          key={id}
          className="tab"
          type="button"
          role="tab"
          id={`tab-${id}`}
          data-tab={id}
          aria-controls={`panel-${id}`}
          aria-selected={current === id}
          tabIndex={current === id ? 0 : -1}
          onClick={() => show(id)}
        >
          <span>{LABELS[id]}</span>
        </button>
      ))}
      <span className="tabs-ink" aria-hidden="true" ref={ink} />
    </div>
  );
}

/** One tab's panel. Which one shows is the zone's `data-tab` (see `HOME_TAB_SCRIPT`). */
export function HomePanel({ id, className, children }: { id: HomeTab; className?: string; children: React.ReactNode }) {
  const { entering } = useHomeTabs();
  return (
    <section
      className={cx("panel", className, entering === id && "enter")}
      id={`panel-${id}`}
      data-panel={id}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      tabIndex={-1}
    >
      {children}
    </section>
  );
}
