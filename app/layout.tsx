import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Unbounded } from "next/font/google";
import { CartProvider } from "@/components/cart/CartContext";
import { AddressBookProvider } from "@/components/account/AddressBookContext";
import { MeProvider } from "@/components/account/MeContext";
import { WishlistProvider } from "@/components/account/WishlistContext";
import { CatalogProvider } from "@/components/shop/CatalogContext";
import { catalogInput, loadCatalog } from "@/lib/db/catalog";
import { loadMe } from "@/lib/db/profiles";
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
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

// One weight, not the variable axis: nothing in the system sets a display
// weight other than 800, and the static instance is the smaller download.
const unbounded = Unbounded({
  subsets: ["vietnamese", "latin"],
  weight: ["800"],
  variable: "--font-unbounded",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "BRAND", template: "%s · BRAND" },
  description: "Streetwear unisex bán theo số. Mỗi số cắt một lần.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
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
const POINTER_PROBE = `
var de = document.documentElement;
de.setAttribute('data-pointer','');
addEventListener('pointerdown', function(){ de.setAttribute('data-pointer',''); }, true);
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
  const [catalog, me] = await Promise.all([loadCatalog(), loadMe()]);

  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${unbounded.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: POINTER_PROBE }} />
        {/* One of each, above the router, so a line added on the product
            page is already there when the cart route renders — no round
            trip. Catalog is outermost because it is the only one that is not
            the device's: the other three read storage, this one reads the
            shop. The account then wraps the last two, which are readable
            signed out: a shortlist and a basket are not an account. */}
        <CatalogProvider input={catalogInput(catalog)}>
          <MeProvider me={me}>
            <AddressBookProvider>
              <WishlistProvider>
                <CartProvider>{children}</CartProvider>
              </WishlistProvider>
            </AddressBookProvider>
          </MeProvider>
        </CatalogProvider>
      </body>
    </html>
  );
}
