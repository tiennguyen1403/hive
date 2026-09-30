import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Unbounded } from "next/font/google";
import { CartProvider } from "@/components/cart/CartContext";
import { MeProvider } from "@/components/account/MeContext";
import { MyStateProvider } from "@/components/account/MyStateContext";
import { monaSans } from "@/components/feed/font";
import { CatalogProvider } from "@/components/shop/CatalogContext";
import { WaitVeil } from "@/components/shop/WaitVeil";
import { catalogInput, loadCatalog } from "@/lib/db/catalog";
import { getMyState } from "@/lib/db/my-state";
import { loadMe } from "@/lib/db/profiles";
import { SITE_DESCRIPTION, SITE_NAME, THEME_COLOR, siteOrigin } from "@/lib/site";
import "./globals.css";

// Self-hosted by next/font — no runtime call to fonts.googleapis.com.
// The `vietnamese` subset is required for BOTH: the style names (KHÓI, BỤI,
// SƯƠNG, NGUỘI) and the word "Số" itself are set in Unbounded and carry
// Vietnamese diacritics; a latin-only subset would drop them to a fallback
// face mid-word.
//
// Pair D, chosen 22/09/2026: Unbounded 800 for the display roles (the issue
// number, headings, style names, the wordmark, order codes), Be Vietnam Pro
// for everything a sentence is made of. 700 joins the sans because a v3
// badge is 700 — v2 stopped at 600 and the weight would have been faked.
//
// `preload: false` on both (round v4 slice 5): only the back office still
// sets text in them — every Feed screen runs on Mona Sans — so the back office
// fetches the two when it needs them, with `display: swap`, and the Feed pages
// stop preloading ten files they never draw. The variables stay on <html>, as
// the back office's layers portalled to <body> need them too.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
  preload: false,
});

// One weight, not the variable axis: nothing in the system sets a display
// weight other than 800, and the static instance is the smaller download.
const unbounded = Unbounded({
  subsets: ["vietnamese", "latin"],
  weight: ["800"],
  variable: "--font-unbounded",
  display: "swap",
  preload: false,
});

// The head every page inherits (v3 slice 10, QĐ-31). The pictures are files
// beside this one, and Next writes their tags itself: `favicon.ico`,
// `apple-icon.png`, `manifest.ts`, and the share image `opengraph-image.tsx`
// with its twin `twitter-image.tsx`. There is deliberately no SVG favicon or
// `icon.*`: a browser would prefer it to the 16 px frame drawn by hand.
//
// The link card says the same on every page: the shop's name and description
// A. No page sets `openGraph` of its own, so this one reaches them all.
export const metadata: Metadata = {
  metadataBase: siteOrigin(process.env),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "vi_VN",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
};

// Record pointer-vs-keyboard BEFORE the first paint, otherwise the focus ring
// flashes for a frame. The default is "pointer", because every session opens
// with a tap or a click; the Tab key is what flips it. Full reasoning lives in
// `app/globals.css`, next to the rule this drives.
//
// It goes first inside <body>, NOT inside a hand-written <head>. The App
// Router docs are explicit that a root layout must not render <head> itself,
// and doing it anyway costs more than a warning: Next never injects its
// bootstrap scripts, `window.__next_f` stays empty, and the whole app ships
// as dead HTML that never hydrates. First-in-body still runs before any
// content below it is parsed, which is all this needs.
//
// Only a TRUSTED pointerdown marks the pointer (round v5 slice 3). Motion,
// under Arc's buttons, answers Enter on a focused button by dispatching a
// synthetic `pointerdown` on it (`motion-dom`, press gesture, keyboard.mjs),
// so a keyboard user who opened the code drawer with Enter lost the ring on
// its first stop, and on the button focus came back to. Measured 01/10:
// `isTrusted: false`. A real press by mouse, pen or finger is always trusted.
const POINTER_PROBE = `
var de = document.documentElement;
de.setAttribute('data-pointer','');
addEventListener('pointerdown', function(e){ if (e.isTrusted) de.setAttribute('data-pointer',''); }, true);
addEventListener('keydown', function(e){ if (e.key === 'Tab') de.removeAttribute('data-pointer'); }, true);
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // One read of the catalogue per render, at the top of the tree. Server
  // Components below get theirs from `loadCatalog()` too; Client Components
  // get this one through the provider, because they cannot read a database.
  //
  // The signed-in account arrives the same way, and in the same round: both
  // are wrapped in `React.cache`, so a page below that asks again is asking
  // for the answer already in hand. Null means nobody is signed in — which
  // the bar and the account screens are entitled to know before the first
  // paint rather than one commit later.
  //
  // What the account keeps (slice B9: saved styles, reminders, Size của tôi,
  // the notification switches) comes in the same round since round v4 slice
  // 3b, for the same reason: the heart on a card is filled in the first HTML,
  // not one commit later. Null signed out.
  const [catalog, me, myState] = await Promise.all([loadCatalog(), loadMe(), getMyState()]);

  // `--font-mona` on <html> as well as on the Feed zone's root (round v5
  // slice 0): the Arc back office sets both of its type roles in Mona Sans
  // (QĐ-38), and its Dialog, Select, menus and toasts render straight into
  // <body>, outside any zone root, so the variable has to exist at the top.
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${unbounded.variable} ${monaSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: POINTER_PROBE }} />
        {/* One of each, above the router, so a line added on the product
            page is already there when the cart route renders — no round
            trip. Catalog is outermost: the basket reads the shop through it.
            The account then wraps the rest: who is signed in, what the
            account keeps (the optimistic writes of the Feed screens,
            `MyStateProvider`), then the basket, which the device keeps and
            which is readable signed out. */}
        <CatalogProvider input={catalogInput(catalog)}>
          <MeProvider me={me}>
            <MyStateProvider initial={myState}>
              <CartProvider>{children}</CartProvider>
            </MyStateProvider>
          </MeProvider>
        </CatalogProvider>
        {/* The wait veil (v3 slice 9): once, here, above the page boundary,
            because it has to outlive the page it covers — each page's frame
            remounts with it, and the veil plays its closing over the NEW
            one. It needs none of the providers. On `/admin` it renders
            nothing. */}
        <WaitVeil />
      </body>
    </html>
  );
}
