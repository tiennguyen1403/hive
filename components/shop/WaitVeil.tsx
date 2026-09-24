"use client";

import { usePathname } from "next/navigation";
import { startTransition, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  WAIT,
  closingFrame,
  isAdminPath,
  shouldVeil,
  showingFrame,
  type VeilFrame,
  type WaitClick,
} from "@/lib/wait";

/** Set while the veil is live on a shop page; `startWait` goes through it. */
let beginFromCode: ((href: string) => void) | null = null;

/**
 * Cover the page for a navigation made by code. Call it in the same handler,
 * right before `router.push(href)` / `router.replace(href)`: the wait then
 * rides in the same transition as the navigation and ends with it.
 *
 * The rule is the click's (`shouldVeil`), so calling it for a navigation that
 * stays on the page — a filter, a sort, a search from `/search` — does
 * nothing. Back and Forward need no call; the veil hears `popstate` itself.
 */
export function startWait(href: string): void {
  beginFromCode?.(href);
}

/**
 * The wait veil: while the next page is on its way, white over the page below
 * the bar, the HIVE mark in the middle and an arc of honey stitches going
 * round it. Approved on `prototype/v3/loading.html`, style "Logo giữa màn
 * hình" (24/09/2026); the timing and the drawing follow that board's `veil`
 * object, the rule for WHEN is `shouldVeil` and the frames are
 * `showingFrame`/`closingFrame` (`lib/wait.ts`).
 *
 * Rendered ONCE, in the root layout, above the page boundary: `ShopFrame`
 * belongs to each page and remounts with it, and the veil has to outlive the
 * change to play its closing over the NEW page. On `/admin` it renders
 * nothing and listens to nothing.
 *
 * HOW A WAIT STARTS — three ways, none of them an edit to a `<Link>`:
 *   · a plain left click on any `<a href>` (one capture listener on the
 *     document, run before the Link's own handler);
 *   · Back and Forward (`popstate`);
 *   · `startWait(href)`, for the places that navigate by code.
 *
 * HOW IT ENDS. The documented signal that a navigation committed is
 * `usePathname`/`useSearchParams` changing, and the veil does end when the
 * pathname changes. But that signal never comes in two cases, and a veil
 * waiting for it would sit on the page:
 *   1. the navigation commits back to the URL already in the bar (a server
 *      redirect to the page the click came from);
 *   2. the click never becomes a navigation (a handler called
 *      `preventDefault`, or the Link's `onNavigate` did).
 * So a click or a code start also sends a state update of the veil's own
 * INSIDE A TRANSITION (`02-guides/interactive-apps.md` builds its pending
 * feedback the same way). React holds that update and commits it together
 * with the router's navigation, whatever URL the navigation lands on (case
 * 1); with no navigation beside it, it commits within a few milliseconds and
 * the wait ends before anything has shown (case 2).
 *
 * Measured on this build (Next 16.3.5, React 19.3) with a temporary probe
 * route before this was written: with the server held 1.5 s, the veil's
 * update committed 2 ms after the new page mounted; after a click cancelled
 * by `onClick` or by `onNavigate`, 6–9 ms after the click; the same for
 * `router.push`. Should a later React stop committing the two together, the
 * update commits at once and the veil simply never shows. It cannot stick.
 *
 * Back and Forward are the exception: React renders a transition started
 * during `popstate` synchronously (measured: nothing was ever pending), so a
 * wait started there ends on the pathname change alone. The rule only lets
 * it start when the pathname changes. A traversal that leads back to the
 * page on screen instead — Forward straight after a slow Back, when that
 * change never comes — ends the wait on the spot (`onPopState` below).
 *
 * Behind all of it, a guard: ten seconds after the last start the veil lifts
 * whatever happened. Only a fault reaches it.
 *
 * Painting happens outside React. The server renders the veil at rest
 * (transparent, hidden, letting the pointer through), and every frame after
 * that writes the element's style and the arc's attributes directly, from a
 * `requestAnimationFrame` loop that runs only while the veil is showing. All
 * of it is timed against `performance.now()`, the clock the click was
 * stamped with — a frame's own timestamp can fall before the click that
 * scheduled it (the board met that bug).
 *
 * The veil holds the pointer, with the progress cursor, only while the page
 * is on its way (`.hold`). The moment the page arrives it lets go, and the
 * closing — the arc going round to a ring, the white fading — plays over a
 * page that already answers every click and shows its own cursor (v3 slice
 * 10: the closing must not slow the new page down).
 *
 * `aria-hidden` always: the veil draws a mark, not a message. While it shows,
 * the page's `<main>` carries `aria-busy="true"`; the new page's title is
 * announced by Next when it lands. Focus is neither moved nor trapped.
 */
export function WaitVeil() {
  const pathname = usePathname();
  const off = isAdminPath(pathname);

  const veilRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<SVGSVGElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const [veil] = useState(() => createVeil(veilRef, markRef, arcRef));

  // Every start that goes out in a transition carries the next number; the
  // wait is over when the LATEST one has committed.
  const [settled, setSettled] = useState(0);
  const asked = useRef(0);

  // The pathname on screen. Read at `popstate`, when the address bar has
  // already moved on and the page has not.
  const shown = useRef(pathname);

  // The two signals that the page has arrived. Layout effects, not passive
  // ones (v3 slice 10): they run inside the commit that puts the new page in
  // the DOM, so the veil lets go of the pointer before that page's first
  // frame is painted. As passive effects they ran after it: measured on 3200
  // with the page held 1.5 s, the new page's first frame still sent a click
  // at its centre to the veil, under the progress cursor.
  useLayoutEffect(() => {
    if (settled !== 0 && settled === asked.current) veil.done(performance.now());
  }, [settled, veil]);

  useLayoutEffect(() => {
    if (shown.current === pathname) return;
    shown.current = pathname;
    veil.done(performance.now());
  }, [pathname, veil]);

  useEffect(() => {
    if (off) return;

    const begin = () => {
      veil.begin(performance.now());
      const n = ++asked.current;
      startTransition(() => setSettled(n));
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || !(e.target instanceof Element)) return;
      const a = e.target.closest("a[href]");
      const href = a?.getAttribute("href");
      if (!a || href == null) return;
      const to = parse(href, document.baseURI);
      if (!to) return;
      const click: WaitClick = {
        button: e.button,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        target: a.getAttribute("target"),
        download: a.hasAttribute("download"),
      };
      if (shouldVeil(window.location, to, click)) begin();
    };

    // Back and Forward always win: Next's router drops a navigation still on
    // its way for the traversal (`dispatchAction`,
    // `next/dist/client/components/app-router-instance.js`). So a traversal
    // to another page starts the wait, or carries it on, and one that leads
    // back to the page on screen ends whatever wait was running: the page
    // that wait was for is not coming. Measured with Forward straight after a
    // slow Back: without this, the veil sat on /account until the guard.
    const onPopState = () => {
      const to = window.location;
      const now = performance.now();
      if (shouldVeil({ origin: to.origin, pathname: shown.current }, to)) veil.begin(now);
      else veil.done(now);
    };

    // A page restored from the back-forward cache comes back exactly as it
    // was left, veil and all.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) veil.reset();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);
    beginFromCode = (href) => {
      const to = parse(href, window.location.href);
      if (to && shouldVeil(window.location, to)) begin();
    };
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
      beginFromCode = null;
      veil.reset();
    };
  }, [off, veil]);

  if (off) return null;

  return (
    <div ref={veilRef} className="veil" aria-hidden="true">
      <svg ref={markRef} viewBox="-50 -50 100 100">
        {/* The window the stitches show through: an arc of 28% that turns.
            The stitches themselves never move. */}
        <mask id="veil-arc" maskUnits="userSpaceOnUse" x="-50" y="-50" width="100" height="100">
          <circle
            ref={arcRef}
            r="42"
            fill="none"
            stroke="white"
            strokeWidth="8"
            pathLength="100"
            strokeDasharray="28 72"
            transform="rotate(-90)"
          />
        </mask>
        {/* Thirty stitches, 6 on and 4 off, from twelve o'clock: the running
            stitch of the issue cover's edge, closed into a ring. */}
        <g mask="url(#veil-arc)">
          <circle
            className="stitches"
            r="42"
            strokeWidth="2"
            pathLength="300"
            strokeDasharray="6 4"
            transform="rotate(-90)"
          />
        </g>
        {/* Mark M2, copied byte for byte from `prototype/name/logo/hive-mark.svg`
            as `NavLogo` copies it. The logo's own colours, not tokens: a logo
            does not follow a theme. */}
        <g transform="scale(.064)">
          <circle r="500" fill="#eba400" />
          <path
            fill="#171410"
            d="M-169,381.17l-145.42,-52.65l0,-266.87c15.71,10.41 33.29,19.48 51.75,21.81c21.04,2.66 42.61,-1.95 62.92,-7.17c25.77,-6.63 51.06,-15.12 76.21,-23.84c-22.5,35.38 -45.46,77.68 -45.46,99.85l0,15l0,0zM-314.42,-328.52l145.42,-52.65l0,238.97c-33.74,-12.22 -67.47,-24.43 -101.21,-36.65c-12.68,-4.59 -25.35,-9.18 -38.03,-13.77c-2.07,-0.75 -4.12,-1.49 -6.18,-2.2zM169,-381.17l145.42,52.65l0,133.68c-2.06,0.73 -4.11,1.48 -6.18,2.23c-13.15,4.76 -26.29,9.52 -39.44,14.28c-33.27,12.05 -66.53,24.09 -99.8,36.14zM314.42,328.52l-145.42,52.65v-213.86l0,0v-15c0,-22.18 -22.98,-64.5 -45.48,-99.88c4.39,1.51 8.78,3 13.18,4.49c25.06,8.47 50.32,16.87 76.19,22.52c17.17,3.75 35.22,6.46 52.73,3.61c17.38,-2.83 33.92,-11.51 48.79,-21.38zM-264.74,40.11c-60.28,-21.83 -138.41,-120.12 -131.88,-164.06c7.88,-29.45 33.57,-43.84 61.39,-33.77l265.01,95.95c1.39,-18.59 5.79,-29.61 16.58,-35.96c-17.98,-11.93 -29.4,-29.75 -29.4,-49.67c0,-21.25 13,-40.11 33.1,-51.98c-0.82,-1.57 -1.59,-3.17 -2.45,-4.64c-3.94,-6.82 -8.46,-13.3 -13.62,-19.2c-5.86,-6.69 -12.54,-12.6 -19.93,-17.41c-4.24,-2.76 -10.01,-4.58 -13.53,-8.25c-4.31,-4.49 -4.9,-11.75 -1.37,-16.93c7.6,-11.14 20.31,-2.53 28.51,2.81c14.84,9.66 27.32,22.75 37.14,37.72c2.12,3.23 5.45,10.3 7.65,16.49c8.62,-2.37 17.88,-3.66 27.53,-3.66c8.99,0 17.66,1.12 25.77,3.19c1.88,-5.03 5.58,-10.02 8.2,-14.14c10.01,-15.76 22.89,-29.54 38.36,-39.6c7.17,-4.67 17.03,-12.04 25.36,-6.04c5.71,4.11 7.17,12.48 3.2,18.39c-2.58,3.84 -7.02,5.28 -10.81,7.47c-5.17,2.98 -10.05,6.48 -14.57,10.43c-7.85,6.85 -14.57,15 -20.2,23.87c-1.23,1.94 -3.56,5.55 -6.11,9.07c20.52,11.84 33.83,30.91 33.83,52.41c0,19.91 -11.42,37.73 -29.4,49.67c10.79,6.35 15.19,17.37 16.58,35.96l265.01,-95.95c27.82,-10.07 53.51,4.32 61.39,33.77c6.54,43.94 -71.6,142.23 -131.88,164.06c-26.15,9.47 -91.24,-14.55 -197.02,-51.73c-6.2,22.98 -23.68,27.88 -67.71,27.88c-44.03,0 -61.51,-4.9 -67.71,-27.88c-105.78,37.18 -170.87,61.2 -197.02,51.73zM-109.5,121.28c3.54,-23.98 13.05,-45.66 26.73,-63.02l165.53,0c13.68,17.36 23.19,39.04 26.73,63.02zM109.5,163.28c-3.54,23.98 -13.05,45.66 -26.73,63.02l-165.53,0c-13.68,-17.36 -23.19,-39.04 -26.73,-63.02zM-52.08,268.3h104.15l-52.08,87.42z"
          />
        </g>
      </svg>
    </div>
  );
}

function parse(href: string, base: string): URL | null {
  try {
    return new URL(href, base);
  } catch {
    return null;
  }
}

/**
 * The veil's clock and brush. One per mounted `WaitVeil`; it touches the DOM
 * through the three refs and nothing else.
 *
 * idle → wait (the first 120 ms: nothing shows) → on (the white and the
 * turning arc) → end (the arc closes, the white fades) → idle. A page that
 * arrives during `wait` goes straight back to idle, unseen. Only `on` holds
 * the pointer: `.hold` goes on with it and comes off the instant `done`
 * turns it into `end`, before the next frame is painted.
 */
function createVeil(
  veilRef: RefObject<HTMLDivElement | null>,
  markRef: RefObject<SVGSVGElement | null>,
  arcRef: RefObject<SVGCircleElement | null>,
) {
  let phase: "idle" | "wait" | "on" | "end" = "idle";
  let still = false;
  let shownAt = 0;
  let arrivedAt = 0;
  let from = 0;
  let opacity = 0;
  let raf = 0;
  let delay = 0;
  let guard = 0;
  let busy: HTMLElement | null = null;

  function paint(f: VeilFrame) {
    opacity = f.opacity;
    const el = veilRef.current;
    const mark = markRef.current;
    const arc = arcRef.current;
    if (!el || !mark || !arc) return;
    el.style.opacity = f.opacity.toFixed(3);
    el.classList.toggle("on", f.opacity > 0);
    mark.style.transform = `scale(${f.scale.toFixed(4)})`;
    arc.setAttribute("transform", `rotate(${(f.angle - 90).toFixed(2)})`);
    arc.setAttribute("stroke-dasharray", `${f.arc.toFixed(2)} ${(100 - f.arc).toFixed(2)}`);
  }

  /** Takes the pointer (and shows the progress cursor), or lets it go. */
  function hold(on: boolean) {
    veilRef.current?.classList.toggle("hold", on);
  }

  /** Back to exactly what the server rendered. */
  function clear() {
    opacity = 0;
    const el = veilRef.current;
    el?.style.removeProperty("opacity");
    el?.classList.remove("on", "hold");
    markRef.current?.style.removeProperty("transform");
    arcRef.current?.setAttribute("transform", "rotate(-90)");
    arcRef.current?.setAttribute("stroke-dasharray", `${WAIT.arc} ${100 - WAIT.arc}`);
  }

  function markBusy(on: boolean) {
    busy?.removeAttribute("aria-busy");
    busy = on ? document.querySelector("main") : null;
    busy?.setAttribute("aria-busy", "true");
  }

  function frame() {
    raf = 0;
    const now = performance.now();
    if (phase === "on") {
      paint(showingFrame(now - shownAt, still));
      raf = requestAnimationFrame(frame);
    } else if (phase === "end") {
      const f = closingFrame(now - arrivedAt, from, arrivedAt - shownAt, still);
      if (f) {
        paint(f);
        raf = requestAnimationFrame(frame);
      } else {
        reset();
      }
    }
  }

  function show() {
    delay = 0;
    if (phase !== "wait") return;
    phase = "on";
    shownAt = performance.now();
    markBusy(true);
    hold(true);
    raf = requestAnimationFrame(frame);
  }

  function begin(now: number) {
    // A second press while waiting: the veil stays where it is and the wait
    // now leads to the new page. A press while it closes over the page that
    // just arrived starts over from nothing.
    if (phase === "end") reset();
    if (phase === "idle") {
      phase = "wait";
      still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      delay = window.setTimeout(show, Math.max(0, WAIT.delay - (performance.now() - now)));
    }
    window.clearTimeout(guard);
    guard = window.setTimeout(() => done(performance.now()), WAIT.guard);
  }

  function done(now: number) {
    window.clearTimeout(guard);
    guard = 0;
    if (phase === "wait") {
      window.clearTimeout(delay);
      delay = 0;
      phase = "idle";
      return;
    }
    if (phase !== "on") return;
    phase = "end";
    arrivedAt = now;
    from = opacity;
    markBusy(false);
    // The page is here: the pointer and the cursor are its own again, while
    // the closing below still paints.
    hold(false);
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function reset() {
    window.clearTimeout(delay);
    window.clearTimeout(guard);
    cancelAnimationFrame(raf);
    delay = guard = raf = 0;
    phase = "idle";
    markBusy(false);
    clear();
  }

  return { begin, done, reset };
}
