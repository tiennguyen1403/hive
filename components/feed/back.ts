"use client";

/**
 * A back link that returns to where the shopper came from when that was a
 * page of this shop, and otherwise follows its own `href` (the mock's back
 * arrows and "Huỷ": `product.js`, `search.js`, `renderMbar` in `feed.js`).
 *
 * The mock asks `document.referrer`, which is right for a site of separate
 * pages and wrong for this one: after a client-side navigation the referrer
 * is still whatever brought the tab to its first page. The Navigation API
 * answers the real question — its entries are this origin's own, so an entry
 * before the current one is a page of the shop — and the referrer is the
 * fallback where that API is missing.
 *
 * A click with a modifier, or any button but the first, is left to the
 * browser (a new tab should open the link, not go back).
 */
export function backOrFollow(e: React.MouseEvent<HTMLAnchorElement>): void {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!cameFromHere()) return;
  e.preventDefault();
  window.history.back();
}

interface NavigationEntryLike {
  index: number;
}
interface NavigationLike {
  currentEntry: NavigationEntryLike | null;
}

function cameFromHere(): boolean {
  const nav = (window as unknown as { navigation?: NavigationLike }).navigation;
  if (nav && nav.currentEntry && typeof nav.currentEntry.index === "number") return nav.currentEntry.index > 0;
  try {
    return (
      document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin &&
      window.history.length > 1
    );
  } catch {
    return false;
  }
}
