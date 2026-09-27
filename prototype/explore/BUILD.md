# Style exploration: rules for whoever builds a direction

The user (shop owner, Vietnamese) asked on 26/09/2026 for a second, completely different look for the whole HIVE app, next to
the running v3. It is **not** v4 and nothing here goes into the app. Round 1 shows **five directions × three screens** so the
user can pick one; round 2 will mock the whole app in the chosen direction.

Each direction lives in its own folder and is built by one person. Read this file, then your direction brief, then build.

## What the shop is (the concept you design for)

HIVE sells unisex streetwear to Vietnamese buyers aged 18 to 28 who shop on their phones, often while a sale window is open.

- It sells in numbered **issues** ("Số" in the running app). An issue opens at 20:00 on a set day and closes two weeks later
  or when it sells out. Every style in an issue is **cut once** from fabric ordered in advance; when a size is gone it is gone.
- **Issue 05** is open now: ten styles named after natural matter and weather (KHÓI smoke, BỤI dust, NGUỘI cooling heat,
  NẮNG sunlight, SƯƠNG mist, MUỐI salt, THAN coal, CÁT sand, GIÓ wind, ĐÁ stone). Each has its own print.
- **Issue 06** opens 20:00 Friday 02/10 with two announced styles (SỎI, NGÓI); price and quantity are published at opening.
- **Issues 03 and 04** are closed and sold out.
- A **fixed line** ("Cố định", eight basics) is sold at any time and restocked size by size.
- Payment is bank transfer checked by hand, card, or cash on delivery. Delivery and returns are in `shared/data.js`.

Everything factual comes from `shared/data.js` (`window.HIVE`). Never type a price, a count or a date by hand; read it.
The styles' garment details (`details`) and print names (`print`) are real design facts; nothing else about the brand exists
yet. **Do not invent** a brand story, founders, workshop, materials sourcing, customer reviews, sales figures, awards,
partners, social handles or press. If a layout seems to need one, cut the block.

## Your folder and what to deliver

```
prototype/explore/<your-direction>/
  home.html          home page, phone first, must also be designed for desktop (1280)
  products.html      listing: Issue 05 and the fixed line, filter by type, sort, sold-out and low-stock states
  product.html       product page; ?m=<slug> picks the style (default "suong"); every Issue 05 slug must work
  <dir>.css, <dir>.js  (split further if you like)
  fonts/             every font file the pages use, fetched with tools/fetch-font.cjs
  icons/             any icon SVG you use, copied from an icon library (see Icons)
  direction.json     the facts the comparison board prints (schema below)
```

- Link data with `<script src="../shared/data.js"></script>`; photos are `../shared/shots/...`, flats `../shared/flats/...`
  (`HIVE.photos(style, colour)` and `HIVE.flat(style, colour)` build the paths).
- **Touch nothing outside your folder.** `shared/`, `tools/`, the other directions, `app/`, `components/`, `lib/`, `data/`,
  `public/`, `tasks/`, `DESIGN.md`, `PRODUCT.md`, `.impeccable/`, `.claude/`: read if useful, never write.
- Static HTML, CSS and plain JavaScript. No build step, no npm packages at runtime, no framework, no CDN at runtime:
  pages must work with the network off. (Motion is CSS transitions/animations, Web Animations API, IntersectionObserver,
  and `animation-timeline: view()` where supported.)
- Serve and view with the mock server: `cd prototype && python serve.py 3100`, then
  `http://127.0.0.1:3100/explore/<dir>/home.html`. It is usually already running.

## The three screens

**Home.** Must carry, in your own order and form: the shop's name; Issue 05 open, its closing time and a live countdown
(seconds tick); the ten styles with photo, name, price and a stock signal; the two low-stock styles (BỤI 2 left, SƯƠNG 3
left, per `HIVE.isLow`) and the sold-out one (MUỐI) visibly different; Issue 06 coming with its opening time and the two
announced styles (no price, no photo of another style: use the flat silhouettes or type only); a way into the fixed line;
the closed issues; a footer with help links, delivery and payment facts. The issue's cover line may be reworded in your
direction's voice; its facts (ten styles, cut once, no restock) stay.

**Listing (`products.html`).** Issue 05 and the fixed line (a switch between them and "all"), filter by type
(`HIVE.FAMILIES`), sort (newest, price up, price down), counts that match the data, cards that show which sizes are gone,
low stock, sold out. The fixed line's pictures are flat drawings on a light plate; present them honestly as drawings.

**Product (`product.html?m=suong` by default).** Gallery of the chosen colour (packshot, then the on-model look), name,
type, price, colour choice that swaps photos and stock, size choice with sizes at 0 unavailable and low counts shown,
size guide (`HIVE.sizeChart(fit)`, simulated measurements: label them "mô phỏng"), add to cart (needs a size; updates the
cart count in the header via `HIVE.cart('<dir>')`; confirms), garment details, material, fit, how many were cut and how
many are left, delivery and returns, other styles in the issue. `?m=muoi` must show the sold-out state with buying disabled.
Fixed-line slugs are optional here.

Nav links between your three pages must work; card taps open `product.html?m=<slug>`. Links to screens that do not exist yet
(account, search, cart page, help) use `href="#"`, and nothing may break when tapped.

## Language and words

- Every visible string is **Vietnamese with full diacritics**, except words streetwear already uses in English
  (SOLD OUT, drop, size, form, oversize, regular). Code, class names and comments are English.
- **No em dash (—) and no en dash (–) anywhere visible.** Ranges use a hyphen: "2-4 ngày", "11/09 - 25/09".
- **No sentences that explain a concept** (what an issue is, why things are cut once, what the fixed line is). Labels,
  data and actions only. A short line of data ("Còn 2, hết S M") is good; a caption explaining the rules is not.
- You may rename things for your direction's voice (e.g. what the issue or the fixed line is called). List every rename in
  `direction.json` → `words`; the board shows them as provisional names for the user to accept or reject.
- No filler marketing verbs, no fake urgency beyond the real countdown and stock, no exclamation marks.
- Money: `HIVE.vnd()` gives "1.450.000₫". Dates: `HIVE.when()` / `HIVE.day()`; times are Vietnam time.

## Accessibility floor (measured by tools/shoot.cjs, fix everything it reports)

- Text contrast WCAG AA (4.5:1, large text 3:1). Text over photos needs a scrim or a solid plate under it.
- Text a shopper reads is 11px or larger.
- At 390 wide every control is at least 44×44 px (a transparent `::after` with `position:absolute` may enlarge the hit area).
- Stock state is never shown by colour alone: a word or number goes with it.
- **No outline or ring at rest and none after a mouse click.** A focus ring appears only for keyboard use. Implement it the
  project's way: `pointerdown` sets `data-mouse` on `<html>`, `keydown` of Tab removes it, and
  `html[data-mouse] :focus { outline: none }`; style `:focus-visible` for keyboard users.
- `prefers-reduced-motion: reduce` turns every animation and smooth scroll off and shows all content at once
  (reveal-on-scroll must not leave content hidden).
- Real `<button>` for actions, `<a>` for navigation; overlays trap nothing and close with Escape; `lang="vi"`.

## Fonts

Self-host, Vietnamese subset required:

```
node prototype/explore/tools/fetch-font.cjs <package> <css> prototype/explore/<dir>/fonts
```

Static: `@fontsource/<id>` with `400.css`, `700-italic.css`, ... Variable: `@fontsource-variable/<id>` with `index.css`
(weight), `wdth.css` / `wdth-italic.css` (width + weight), `opsz.css`, `full.css`. It writes one CSS file per call; link them.
Check the printed line says "incl. vietnamese". Test a string with stacked marks, e.g. "Mười mẫu. Cắt một lần. Hết là hết."
and "SƯƠNG ĐÃ HẾT NGƯỜI", at your display size: accents must not collide or clip (line-height and padding).

## Icons

Never draw icon paths by hand. Copy SVGs from one library and keep one family and one weight:
Phosphor `https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2/assets/<weight>/<name>[-<weight>].svg`
(weights: thin, light, regular, bold, fill, duotone; e.g. `assets/bold/bag-bold.svg`, `assets/regular/bag.svg`), or Tabler
`https://cdn.jsdelivr.net/npm/@tabler/icons@3/icons/outline/<name>.svg`. Do not use Iconsax (the running app's set).
A text-only interface is also fine if your direction calls for it. Logos are yours to draw (type, simple geometry).

## Photos

Issue 05 photos are 1200×1500 (4:5). Packshots sit on warm grey paper; looks are full-body Saigon street frames.
Keep 4:5 unless your layout crops on purpose (`object-fit: cover` with a sensible `object-position`; never crop a head or
the print). Always `width`/`height` attributes or `aspect-ratio` to avoid layout shift, `loading="lazy"` below the fold,
meaningful Vietnamese `alt` ("KHÓI, áo thun oversize màu đen" / "Người mặc KHÓI màu đen").
Do not recolour a photo to fake another colourway; only the colours in `stock` exist.

## Check your work

```
node prototype/explore/tools/shoot.cjs <dir>
```

Captures the three pages at 390 (2x) and 1280, full page, motion reduced, and reports overflow, tiny text, small targets,
dashes, contrast, outlines at rest, broken images and console errors. Iterate until it prints `clean` for every line, or
until each remaining item is a deliberate, explained exception. **Then look at every PNG yourself** (Read the files) at both
widths: a clean report does not mean the page looks right. Also open the interactive states once in a real browser session
of your own (size sheet, menu, cart confirmation, filters) with a small Playwright script: overlays must be positioned,
styled and inside the viewport. Save such scripts and their screenshots under `prototype/explore/_shots/<dir>/`.

**The machine is short of memory and five directions are built at the same time.** Every script that opens Chrome goes
through `tools/browser.cjs` (`withBrowser`), which lets one browser run at a time across all builders and always closes it.
Never launch Chrome any other way, never leave one running, never run captures in the background.

Give every page a favicon (for example your logo as an inline `data:image/svg+xml` URL): without one the browser's
`/favicon.ico` request is a 404 that the checker reports as a console error.

The project's design hook (impeccable) may comment after your writes. Fix what it finds that is real. Do not add ignores or
edit `.impeccable/`; if a rule is wrong for your direction, say so in your report.

## direction.json

```json
{
  "id": "gallery",
  "name": "Gallery",
  "family": "Tối giản kiểu gallery",
  "refs": ["Our Legacy", "Lemaire", "COS"],
  "idea": "One Vietnamese sentence on the idea, no dashes.",
  "palette": [{ "hex": "#F6F6F4", "role": "Nền" }],
  "type": [{ "family": "Hanken Grotesk", "use": "Mọi chữ", "weights": "400, 500" }],
  "logo": "Vietnamese, one line: how the HIVE mark is drawn here.",
  "words": [{ "was": "Giỏ hàng", "now": "Túi" }],
  "shape": "Vietnamese, one line: radii, borders, shadows.",
  "motion": "Vietnamese, one line: what moves and why.",
  "dials": { "variance": 6, "motion": 3, "density": 2 },
  "open": ["Vietnamese: questions the user must settle for this direction, each naming exactly what it asks."]
}
```

## Report back

Paths of the pages, the `shoot.cjs` summary, anything you could not do, and any exception you left on purpose with its reason.

---

# Round 2 (27/09/2026): the whole buying flow for Feed and Mẫu vật, and a first Feed × Mẫu vật

The user looked at round 1 and asked for **Feed** and **Mẫu vật** in more detail, as the complete buying flow (account and
back office come after the final choice), and for a first mock of **Feed × Mẫu vật**: Feed's app structure wearing Mẫu vật's
skin. Everything above still applies, including the round-1 fixes (no repeated delivery facts in a product page's footer,
no visible "hình vẽ" labels, no lines that explain a symbol or a concept).

## New shared data (`shared/data.js`, `shared/regions.js`)

- **The shop's moment**, on any page, with `?state=`: `open` (default: Số 05 selling, closes in 4 days), `upcoming`
  (Số 05 closed on 25/09, Số 06 announced, opens in 2 days), `closed` (between two issues: Số 05 closed and nothing
  announced; `ISSUE_06` is empty). `HIVE.MODE`, `HIVE.ISSUES[i].state` and `HIVE.featured()` (the issue the home page
  leads with, as the running app picks it) follow it. `HIVE.keep(href)` adds the current `?state=` to an internal link so
  the shopper stays in the same moment; use it for every internal link.
- **Demo baskets** with `?cart=full|small|soldout|empty` (see `HIVE.DEMO_CARTS`); `HIVE.cart(dir)` loads the preset.
  Cart API: `items()`, `count()`, `add()`, `setQty()`, `remove()`, `clear()`. `HIVE.line(item)` gives price, totals,
  stock left, `gone` (the size has run out since it was added) and `short`, and the image to show.
- **Checkout rules**: `HIVE.DELIVERY` (standard 30.000₫, 2-4 ngày, free from 1.000.000₫; express 45.000₫, 24 giờ, only
  TP. Hồ Chí Minh, `HIVE.deliveryAvailable(method, provinceCode)`), `HIVE.PAYMENTS` (Chuyển khoản with a 12-hour hold;
  COD +15.000₫; Thẻ, whose gateway is not connected yet: the order is recorded unpaid), `HIVE.PROMOS` and
  `HIVE.promo(code, subtotal)` (DOT05, CHAOBAN, FREESHIP work in the open state; VIP20 is used up; DOT04 expired),
  `HIVE.checkout(items, { delivery, payment, promo })` → subtotal, shipping, cod, discount, total, `toFree` (what is
  missing for free delivery). `HIVE.deliveryWindow(method)` → "23/09 - 25/09". `HIVE.ORDER` = DH-1507 (bank memo DH1507),
  `HIVE.holdUntil(12)`.
- **Search**: `HIVE.search(q)` (accent-insensitive: "ao khoac" finds SƯƠNG, THAN, ÁO KHOÁC DÙ), `HIVE.SUGGEST`.
- **Addresses** (`<script src="../shared/regions.js">`, `window.HIVE_REGIONS`): Vietnam has **two tiers** since 1 July 2025:
  tỉnh/thành (34), then phường/xã/đặc khu (3,321). **There is no quận/huyện level any more**; never draw one.

## Facts the flow must keep (from the running app; do not invent around them)

- There is **no bank account yet**. The confirmation of a transfer order shows the amount and the memo (order code), each
  copyable, and says the account number and bank are being prepared; the transfer QR is a labelled empty slot that says it
  appears once the real account exists. Never draw a fake QR, bank name or account number.
- A transfer order holds the pieces for **12 hours**; past that the order cancels itself and the pieces go back on the shelf.
- COD adds **15.000₫**; the shop calls to confirm before delivery.
- Card: the gateway is **not connected**; the order is recorded as unpaid until it is.
- Guest checkout: no account needed (a sign-in link may exist, `href="#"`).
- Phone: Vietnamese mobile, 10 digits starting 0. Email optional.
- A basket line whose size has gone must be resolved (remove it or pick another size) before checkout can proceed; say so
  in one short line where the action is.
- Only Số 05 styles (while it is open) and the fixed line can be bought. In `upcoming` and `closed`, Số 05 styles show as
  closed and cannot be added (product page: buying disabled with the reason; listing: under the closed issue).
- Policy lines that tell the shopper a consequence of their choice (the 12-hour hold, the COD fee, 7-day returns) are
  fine; explanations of how the shop works are not.

## Round-2 pages for Feed and Mẫu vật (phone first, every page also designed at 1280)

| page | states to support (all reachable by URL) |
|---|---|
| `home.html` | `?state=open` (as now), `?state=upcoming`, `?state=closed` |
| `products.html`, `product.html` | follow `?state=` (closed issue: nothing to buy from it) |
| `search.html` | no query (recent searches + suggestions), `?q=hoodie` (results), `?q=xyz` (no results) |
| `cart.html` | `?cart=full`, `?cart=small`, `?cart=soldout`, `?cart=empty` |
| `checkout.html` | `?cart=full` (default blank form), `?cart=full&fill=1` (filled, valid, TP.HCM so express is offered), `?cart=full&errors=1` (submitted with errors shown inline), province outside TP.HCM (express unavailable, shown as such) |
| `order-confirmed.html` | `?pay=transfer` (default), `?pay=cod`, `?pay=card` |

The header's cart opens `cart.html`; its search opens `search.html`; checkout's place-order button goes to
`order-confirmed.html` with the chosen payment. Keep `?state=` with `HIVE.keep()`.

`tools/shoot.cjs <dir> --pages home,search,cart,checkout,order-confirmed` checks the new pages at their default URL; check
the other states with your own `withBrowser` scripts (query strings), and look at every capture.

# Round 3 (27/09/2026): the rest of Feed's customer flows

Only **Feed** goes on (the user's pick after round 2; the other directions were deleted). This round builds every
customer-facing flow still missing, **not the back office**. Everything above still applies unless this section says
otherwise.

**The user's rules for this round:**
- **Invoke the `design-taste-frontend` skill before you write any code**, and follow its anti-slop rules. These screens are
  product UI, so its landing-page rules (hero stack, eyebrow counts) apply only to `help.html`, `archive.html` and
  `issue.html`. Its other rules apply to every page: zero em/en dashes, copy self-audit, one accent, one radius system,
  button and form contrast, empty/loading/error states, no fake-precise numbers, no decorative dots, no generic step
  labels, no hand-drawn SVG illustrations.
- **Be more creative than a template.** Account pages default to a list of rows with chevrons; do better inside Feed's
  system. The user asked for creativity, and they read every screen.
- **Concept, names and selling model stay as they are** (Số, 20:00, cut once, the fixed line, the style names). The user
  rejected every new concept offered. Do not introduce a new theme, mechanic or joke voice.

## New shared data (round 3, `shared/data.js`)

- **Signed in by default**, as the demo shopper `HIVE.ACCOUNT`: Trần Minh Khoa, 0938 571 204, minhkhoa@email.com, joined
  08/03/2026, "Size của tôi" áo L, quần M. This is the same person Feed's checkout fills in. `?auth=out` on any page shows
  it signed out (`HIVE.AUTH`).
- `HIVE.ADDRESSES`: two-tier addresses (Nhà, the default; Công ty). Codes are from `regions.js`.
- **Orders** `HIVE.orders()`: six orders, newest first. `?orders=none` gives none.
  - Each order is a timeline, and `HIVE.orderStatus(o)` returns its state at the mock's clock, so the same order moves on
    with `?state=`.
  - States follow the app: `AWAITING_TRANSFER` (with `dueAt`), `RECEIVED` (COD, before the call), `PAID`, `SHIPPING` (with
    `tracking`), `DELIVERED`, `CANCELLED` (with `reason`). Labels are in `HIVE.ORDER_STATES`. A transfer unpaid after 12
    hours cancels itself.
  - Open moment:
    - DH-1507 chờ chuyển khoản (the order round 2's checkout places);
    - DH-1502 đã thanh toán;
    - DH-1499 đang giao (COD, VD-8842-1907);
    - DH-1496 đã giao 16/09, returnable until 23/09;
    - DH-1310 đã huỷ (Số 04, quá hạn chuyển khoản);
    - DH-1210 đã giao (Số 03).
  - Helpers: `orderTimeline(o)`, `orderTotals(o)` (the prices paid then), `orderLine(l)` (closed-issue styles have no
    photo: `image` is ""), `findOrder(code)`, `findAny(slug)`.
- **Returns**: `HIVE.canReturn(o)` and `HIVE.returnUntil(o)` give 7 days from delivery. `HIVE.RETURN_REASONS`.
- **Inbox** `HIVE.notifications()`: kinds order, drop, reminder and wishlist; items appear once the clock passes them and are
  unread while under two days old. `?inbox=empty`.
- **Saved styles** `HIVE.FAVORITES`: BỤI đen (1 left), THAN xanh than, MUỐI xám (sold out), HOODIE TRƠN xám. `?favs=none`.
- `HIVE.REMINDERS`: Số 06, by app and email.
- `HIVE.lookup(code, phone)`: the guest order lookup.

## Facts to keep

- The same facts as round 2: no bank account yet, 12-hour hold, COD +15.000₫, card unpaid until the gateway exists,
  two-tier addresses, 7-day returns. Sign-in in the running app is email + password; Google is "đang chuẩn bị".
- Never invent a phone number, social handle, bank account, address of the shop, courier name, or brand story. Where
  the shop has none yet, design the slot, not a fake.
- A return's details the shop has not decided go in `direction.json → open`, not on screen as fact. That covers who pays
  the return shipping, and refund to bank account or store credit.

## No repeated data (the user's standing rule; every round so far had these slips)

- Show a number once per screen. Do not repeat a count in the title, a segment chip and a result line.
- Do not repeat a state in a stamp and a text line.
- A spec table does not repeat the line under the price or the pickers above it.
- A date block does not have a text line repeating its date.
- A panel does not repeat the summary below it.
- A fee printed on the right is not repeated in a note.
- A sentence does not repeat what a label or a disabled button already says.
- Do not show the bag twice (header icon and tab) on one screen.
- No two controls may share a label with different meanings.

## Checks

- Run `tools/shoot.cjs feed --pages <your pages>` at both widths.
- Write your own `withBrowser` scripts for every URL state and every overlay (open the sheets; a closed menu hides
  everything).
- Look at every capture yourself.
