/**
 * The wait veil's rules: WHEN the page is covered while the next one is on its
 * way, and what the cover looks like at each moment. Pure, so both can be
 * tested; `components/shop/WaitVeil.tsx` is the shell that listens for clicks
 * and paints the frames.
 *
 * Approved on the board `prototype/v3/loading.html` (style "Logo giữa màn
 * hình", 24/09/2026); the numbers are that board's `veil` object.
 */

/** Every duration in milliseconds, measured against `performance.now()`. */
export const WAIT = {
  /** Nothing shows for a page that arrives sooner than this. */
  delay: 120,
  /** The white comes in… */
  fadeIn: 160,
  /** …while the mark grows from .92 to 1. */
  grow: 240,
  /** One turn of the arc, linear, clockwise from twelve o'clock. */
  turn: 1100,
  /** The page arrived: the arc closes into the whole ring… */
  close: 150,
  /** …then the white fades out. */
  fadeOut: 180,
  /** The arc, in percent of the ring. */
  arc: 28,
  /** Longer than any real wait: only a fault reaches it. */
  guard: 10_000,
} as const;

/** How a link was pressed. The shape of a `MouseEvent`, plus the anchor's two attributes. */
export interface WaitClick {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  /** The anchor's `target` attribute, or null. */
  target: string | null;
  /** Whether the anchor carries `download`. */
  download: boolean;
}

/** The two parts of a URL the rule reads; `URL` and `Location` both have them. */
export interface WaitPlace {
  origin: string;
  pathname: string;
}

/** The back office, and nothing that merely starts with the word. */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function samePage(a: string, b: string): boolean {
  const trim = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);
  return trim(a) === trim(b);
}

/**
 * Whether a navigation from `from` to `to` covers the page.
 *
 * Only a change of PATHNAME does (§2.2 of the slice 9 brief): a filter, a
 * sort, a family tab, the plate from `/products?family=…`, a search from
 * `/search`, the order lookup, a hash — all stay on the page they started
 * on and leave it alone, as they always have. So does anything the browser
 * opens elsewhere or not at all (a modifier key, the middle button,
 * `target="_blank"`, `download`, another origin), which is also the list
 * Next's `<Link>` hands back to the browser. The back office has no veil, in
 * either direction.
 *
 * `click` is absent for a navigation made by code (`router.push`) or by the
 * browser's Back and Forward.
 */
export function shouldVeil(from: WaitPlace, to: WaitPlace, click?: WaitClick): boolean {
  if (click) {
    if (click.button !== 0) return false;
    if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return false;
    if (click.target && click.target !== "_self") return false;
    if (click.download) return false;
  }
  if (to.origin !== from.origin) return false;
  if (isAdminPath(from.pathname) || isAdminPath(to.pathname)) return false;
  return !samePage(from.pathname, to.pathname);
}

/** Cubic ease-out, clamped to [0, 1] — the board's `ease`. */
export function easeOut(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return 1 - Math.pow(1 - t, 3);
}

/** One painted frame of the veil. */
export interface VeilFrame {
  /** Of the white layer, 0–1. */
  opacity: number;
  /** Of the mark and the ring together. */
  scale: number;
  /** Of the arc, in degrees clockwise from twelve o'clock. */
  angle: number;
  /** Length of the arc, in percent of the ring: 28 turning, 100 whole. */
  arc: number;
}

/**
 * The veil while the page is on its way. `t` is the time since it began to
 * show (the delay already over). `still` is reduced motion, read when the
 * wait began: the white still comes in, but the mark does not grow, the arc
 * does not turn, and the ring stands whole.
 */
export function showingFrame(t: number, still: boolean): VeilFrame {
  if (still) return { opacity: easeOut(t / WAIT.fadeIn), scale: 1, angle: 0, arc: 100 };
  return {
    opacity: easeOut(t / WAIT.fadeIn),
    scale: 0.92 + 0.08 * easeOut(t / WAIT.grow),
    angle: (t / WAIT.turn) * 360,
    arc: WAIT.arc,
  };
}

/**
 * The veil after the page has arrived, or null once it is gone. `t` is the
 * time since the arrival, `from` the opacity the white had reached by then,
 * `spun` how long the arc had been turning, so it goes on from where it was.
 *
 * The new page is already rendered underneath; all of this plays over it and
 * never holds it back.
 */
export function closingFrame(
  t: number,
  from: number,
  spun: number,
  still: boolean,
): VeilFrame | null {
  if (still) {
    if (t >= WAIT.fadeOut) return null;
    return { opacity: from * (1 - easeOut(t / WAIT.fadeOut)), scale: 1, angle: 0, arc: 100 };
  }
  const angle = ((spun + t) / WAIT.turn) * 360;
  if (t < WAIT.close) {
    return { opacity: from, scale: 1, angle, arc: WAIT.arc + (100 - WAIT.arc) * easeOut(t / WAIT.close) };
  }
  if (t < WAIT.close + WAIT.fadeOut) {
    return { opacity: from * (1 - easeOut((t - WAIT.close) / WAIT.fadeOut)), scale: 1, angle, arc: 100 };
  }
  return null;
}
