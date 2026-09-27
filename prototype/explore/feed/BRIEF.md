# Direction 3: Feed

User's pick: **"App drop dạng feed"**. References: Nike SNKRS, adidas CONFIRMED (also StockX and GOAT apps).
Read `../BUILD.md` first; everything there applies.

**Design read:** the shop as a phone app for drop buyers: a full-bleed image feed, the launch calendar and the countdown
always in reach, app chrome (top bar, segmented tabs, bottom tab bar, bottom sheets), one variable grotesk with a width axis.

**Ý tưởng (for direction.json):** "Cửa hàng như một ứng dụng lướt: mỗi mẫu là một khung ảnh tràn màn hình, lịch mở bán và
đếm ngược luôn trong tầm mắt."

Dials: variance 6, motion 6, density 4.

## Principles

1. **It feels like a native app on the phone**: top app bar, segmented tabs, a bottom tab bar with five destinations, bottom
   sheets for choices. On desktop it becomes a clean web app (top nav carries the tabs, no bottom bar).
2. **Photos edge to edge.** Type big and condensed in the feed, compact and clear in the controls.
3. **Time organises the shop**: open now, opening soon, closed.

## Palette (light app)

| role | hex | note |
|---|---|---|
| Surface | `#FCFCFD` | background |
| Surface 2 | `#F1F2F4` | grouped rows, chips at rest, silhouette plates |
| Ink | `#111214` | text |
| Ink 2 | `#5B5F66` | secondary text; verify 4.5:1 on both surfaces |
| Blue | `#1846F0` | the one accent: primary buttons (white text), the live chip, the active tab indicator, progress |
| Scrim | `linear-gradient(to top, rgba(0,0,0,.66), rgba(0,0,0,0) 58%)` | under any text set on a photo |

Low stock is ink with a fire icon and a number, never a second colour.

## Type

Mona Sans variable with the width axis (`@fontsource-variable/mona-sans`, `wdth.css`; add `wdth-italic.css` only if used).

- Feed display: `font-stretch: 75%`, weight 850-900, uppercase, line-height 0.9. Card names 44-56px on phone, the story
  headline 60-72px.
- App UI: width 100%, weight 450-600, 13-16px. Tab bar labels 11px.
- Countdown: condensed, weight 800, tabular numbers.

## Logo

"HIVE" in Mona Sans condensed 900 italic, tight tracking. An app-icon mark: an ink rounded square (radius 22%) holding a
white condensed "H", used in the desktop nav, the footer and as the favicon.

## Icons

Phosphor, one family: regular at rest, fill when active (house, magnifying-glass, heart, bag, user, bell, fire, x,
caret-left, caret-right, sliders-horizontal). Copy the SVGs into `icons/` (see BUILD.md).

## Words (provisional, list them in direction.json)

- Tabs: **Khám phá**, **Đang bán**, **Sắp mở**
- Notify: **Nhắc tôi** / **Đã bật nhắc**
- Keep **Số 05**, **Cố định**, **Giỏ**.

## Global chrome

- **Phone top app bar** 52px: wordmark left; right two 44px icon buttons: bell (thông báo), bag with a count badge (ink
  circle, white number).
- **Segmented tabs** (home only), sticky under the bar: "Khám phá | Đang bán | Sắp mở" with a sliding blue indicator.
  Switching swaps the content below without a reload and updates the hash (`#kham-pha`, `#dang-ban`, `#sap-mo`).
- **Phone bottom tab bar** 64px plus safe area: Trang chủ (house), Tìm (magnifying-glass), Yêu thích (heart), Giỏ (bag with
  count), Tôi (user). Labels 11px. Active: fill icon and ink label; others regular and ink 2. Hidden on the product page,
  where the sticky buy bar takes its place.
- **Desktop nav** 64px: mark and wordmark left, the three tabs centre (links on other pages), icons right; content up to
  1280 wide.

## Home, phone (390), tab Khám phá

1. **Story card**: full-bleed 4:5 photo, the NGUỘI black look (`nguoi-black-look.webp`), scrim, and on it: the live chip
   (blue pill "ĐANG MỞ" with a small pulsing ring, the only looping animation on the page, because it is a real live state),
   "SỐ 05", the cover line big and condensed in white, "Đóng sau 4 ngày 00:57:59" ticking. Tapping it opens Đang bán.
2. **Style cards**, all ten in data order: full-bleed image (alternate: odd cards the look photo, even cards the packshot on
   its paper), then a text block with 16px side padding: NAME (condensed 44px), type and material (13px, ink 2), price, and a
   stock line with an icon (fire and "Còn 2" when low; "Hết S M" when sizes are gone). MUỐI: photo desaturated, a centred
   dark plate with "SOLD OUT" in condensed white, and the line "Đã hết". A heart toggle on the image's top right (pop on
   tap). A small pill "Chọn size" opens the size bottom sheet (quick add).
3. After the third card: a horizontal carousel "Trong Số 05" of packshots (snap, cards about 44% wide, name and price).
4. After the sixth card: the **upcoming card**: an outlined chip "SẮP MỞ", a huge date block ("02", "THG 10", "THỨ SÁU
   20:00"), the countdown to opening, the two flat drawings as dark silhouettes on Surface 2, their names and types, the line
   "Giá và số lượng công bố lúc mở.", and "Nhắc tôi" (bell) toggling to "Đã bật nhắc" (bell fill).
5. After the ninth card: a "Cố định" carousel of the eight flats on their plate, with "Xem tất cả".
6. At the end: "Đã đóng" as compact rows (Số 04: 05/06 - 19/06, 200/200 đã bán; Số 03), then a minimal footer (help links,
   delivery and payment facts) above the bottom bar.

Tab **Đang bán**: horizontal filter chips (Tất cả, Áo thun, Hoodie, Khoác, Sơ mi, Quần, Gile), a segmented "Số 05 | Cố
định", and a 2-column grid of packshots with name, price and stock line.
Tab **Sắp mở**: a launch calendar: Số 06 as a big date row with the countdown, the two teasers and Nhắc tôi; under it rows
for Số 05 (đang mở), Số 04 and Số 03.

## Home, desktop (1280)

Nav with the tabs. Khám phá: the story card becomes a wide split (the NGUỘI look in 5 columns, a text panel in 7 with huge
condensed type and the countdown). Style cards in a 3-column grid where every fourth card spans two columns (image and text
side by side) for rhythm; the carousels become rows. No bottom bar.

## Listing (products.html)

The app screen "Đang bán": chips, the segmented control, a "Sắp xếp" chip that opens a sort sheet (Mới nhất, Giá tăng dần,
Giá giảm dần), a count "10 mẫu", a 2-column grid on phone and 4 on desktop, compact cards, the quick-add sheet.

## Product (product.html)

- Phone: full-bleed 4:5 gallery of the chosen colour's frames with story-style segmented progress bars at the top (one
  segment per frame; tap the left or right half, or swipe). Back (caret-left) and heart over the image's top with a light
  scrim. Then: "Số 05" chip, NAME condensed 48px, type, price. Colours as rounded thumbnails (packshot crops) with the colour
  name under. Sizes as a 4-column grid of pill buttons (at least 48px tall): gone sizes disabled and struck, "Còn 1" tiny
  under sizes at 1-2. "Bảng size" opens a bottom sheet with the table ("Số đo mô phỏng", cm). The bottom tab bar is replaced
  by a sticky buy bar: a blue pill "Thêm vào giỏ" with the price; before a size is chosen it reads "Chọn size" and opens the
  size sheet. After adding: a bottom sheet "Đã thêm vào giỏ" with the thumbnail, name, colour, size and price, and buttons
  "Xem giỏ" (blue) and "Tiếp tục xem" (outlined).
- Then grouped app sections: "Chi tiết" (details), "Thông số" (material, fit, print, đã cắt, còn), "Giao hàng và đổi trả",
  "Cùng Số 05" (carousel).
- `?m=muoi`: a SOLD OUT plate on the gallery, sizes disabled, the buy bar shows a disabled "Đã hết".
- Desktop: the gallery on the left (large), information on the right, sticky; no bottom bars.

## Motion

The tab indicator slides and tab content crossfades; cards rise 16px and fade in on entering the viewport; bottom sheets
spring up (`cubic-bezier(.2,.9,.2,1.05)`); the heart pops (scale 1.3 to 1); the live chip's ring pulses; story progress
bars fill when the frame changes; the countdown ticks. Reduced motion: no transforms and no loops, instant changes.

## Shape rule

Photos edge to edge with square corners; controls are pills (999px); sheets have 20px top corners; thumbnails 10px. Soft
shadows only on sheets and the sticky buy bar (ink at about 12%).

## Not in this direction

Marketing sections, a centred headline over a gradient, three equal feature cards, long text blocks. It must feel like an
app, not a website.

---

# Round 2 (27/09/2026): the whole buying flow

Read "Round 2" at the end of `../BUILD.md` first. Keep everything round 1 settled (palette, Mona Sans, the app chrome, the
sheets, the round-1 fixes). One addition to the palette: a **semantic red `#C62A1D`** for errors only (a basket line whose
size has gone, form errors); it is never decoration and never a second accent.

**Home, three moments.** The app keeps its tabs; what leads Khám phá changes.
- `upcoming`: the lead story is Số 06: the launch card (date block "02 THG 10, THỨ SÁU 20:00", countdown to opening,
  the two silhouettes, "Giá và số lượng công bố lúc mở.", Nhắc tôi). Then the fixed line as what is on sale now, then Số 05
  as a closed card (dates, "108/181 đã bán"; its styles no longer buyable). Sắp mở tab: the calendar with Số 06 first.
- `closed`: nothing announced. The lead is a Số 05 recap card (its look photo, "Đã đóng 25/09", sold count) that opens the
  closed issue; "Đang bán" is the fixed line; Sắp mở tab shows a calm empty state ("Chưa có Số mới") with a way to the
  fixed line. No invented subscription feature.
- In both, the bottom bar, header and tabs stay; the live chip only exists while something is live.

**Search** (`search.html`): the app's search screen: a field at the top with a cancel action, recent searches as removable
chips (localStorage), suggestion chips from `HIVE.SUGGEST`, results as the listing's 2-column grid with the count; no
results: one line and the suggestions, and a way to "Đang bán".

**Cart** (`cart.html`): the app's cart: rows with thumbnail, name, colour and size, a quantity stepper capped at the stock
left, price, remove; a gone line in the error red with its fix ("Chọn size khác" opens the size sheet, or remove); the
summary (tạm tính, giao hàng with free or fee and what is missing for free delivery, tổng); a sticky blue "Thanh toán"
bar with the total, inactive while a gone line remains. Empty: a Phosphor bag icon, "Giỏ trống", one way back to what
sells.

**Checkout** (`checkout.html`): one scrolling screen of grouped sections, app style: Liên hệ (họ tên, số điện thoại, email
tuỳ chọn), Địa chỉ (tỉnh/thành then phường/xã, both as **searchable bottom-sheet pickers**, then số nhà và tên đường),
Giao hàng (radio cards; express shown unavailable outside TP.HCM), Thanh toán (radio cards with their consequence line),
Mã giảm giá (field + apply, with the error or the discount), Tóm tắt (items, lines, total), ghi chú. Sticky "Đặt hàng"
bar with the total. Errors inline under each field after a submit. Desktop: form in the left column, summary card on the
right, sticky.

**Order confirmed** (`order-confirmed.html`): a success header (Phosphor check-circle fill), order DH-1507; transfer:
the payment card (số tiền and nội dung, each with a copy button that confirms "Đã chép"; tài khoản: đang chuẩn bị; the QR
slot), the 12-hour hold with its countdown and deadline, what happens after; delivery window; the items; "Tiếp tục mua".
COD and card variants say their own next step. Desktop: two columns.

# Round 3 (27/09/2026): the rest of the customer flows

Read "Round 3" at the end of `../BUILD.md` first; invoke the `design-taste-frontend` skill before writing code. Everything
Feed settled stays: palette (blue `#1846F0` as the one accent, error red `#C62A1D` only for errors), Mona Sans, Phosphor,
the chrome, the sheets, and the round-2 review fixes:
- no bag icon in the phone header where the tab bar shows;
- "Mọi loại";
- the ĐÃ HẾT stamp without a repeated line;
- the calendar dates printed once.

Design read: the account, order and help flows of a drop-store app for young Vietnamese streetwear buyers, in Feed's
SNKRS-like language. Dials: variance 5, motion 5, density 5. Every page at 390 and 1280; phone first. On desktop, account
pages use a left menu plus content, inside Feed's top nav.

Two builders work at the same time. **Builder A owns the chrome** (`feed.js`, `feed.css`); **builder B never edits those
two files**. B puts its styles in `more.css` and its scripts in one file per page.

## Builder A: account core (and the chrome)

Wire the chrome first, so B's pages are reachable:
- the header bell goes to `notifications.html`;
- the Yêu thích tab goes to `favorites.html`;
- the Tôi tab goes to `account.html`;
- the footer help links go to `help.html`, `help.html#doi-tra`, `track.html`, `size-guide.html` and `contact.html`;
- the tab bar marks the current page (the Tôi tab stays active on the account pages).

| page | what it is | states by URL |
|---|---|---|
| `sign-in.html` | Đăng nhập (email + mật khẩu; Google as in the app), Tạo tài khoản, Quên mật khẩu (sends a link; show the sent state). After sign-in, return to where the shopper came from. | `?mode=up`, `?mode=forgot`, `?errors=1` |
| `account.html` (Tôi) | The shopper's home: who they are, the order that needs them now (DH-1507's hold with its countdown, or the parcel on its way), then orders, saved styles, reminders, addresses, profile, help, sign out. Not a plain menu list. | `?auth=out` (sign-in and create-account invitation, guest order lookup), `?state=` |
| `orders.html` | Every order, newest first: status, date, items as thumbnails (closed-issue styles without photos get a typographic tile), total. Filters by state if they earn their place. | `?orders=none`, `?auth=out` |
| `order.html?id=` | One order for each state. The status as a timeline (Feed's segmented progress is a fair idea); what the shopper can do now:<br>• chuyển khoản with the hold, the amount and the memo, as on the confirmation;<br>• huỷ while unpaid, with a confirm sheet;<br>• the tracking code while shipping;<br>• đổi trả while `canReturn`;<br>• mua lại for what is still sold.<br>Also the items, the totals as paid, the address and the payment. | every code, unknown id (not found), `?auth=out` |
| `return.html?id=` | Đổi trả. The steps are named by what they do, not "Bước 1/2/3":<br>• pick the pieces;<br>• pick a reason (a photo upload for "Lỗi may hoặc in" and "Giao nhầm món");<br>• pick đổi size (only sizes in stock) or hoàn tiền;<br>• review;<br>• sent (a request code, what happens next).<br>The sent request then shows on `order.html` (localStorage). | `?id=DH-1496` (open moment), `?id=DH-1210` (window passed: why not, and help), `&step=` for every step |
| `addresses.html` | Saved addresses. Add or edit in a sheet with the same two-tier searchable pickers as checkout; set default; delete with undo. | `&add=1`, `&edit=a2` |
| `profile.html` | Name, phone, email (a change that needs confirming says so), "Size của tôi" (áo, quần; product pages may start on these), change password, sign out. Notification settings live on `notifications.html`; link there. | `&errors=1` |

## Builder B: everything around the account

| page | what it is | states by URL |
|---|---|---|
| `favorites.html` (Yêu thích) | Saved styles as Feed cards with live stock: BỤI's "Còn 1", MUỐI's ĐÃ HẾT stamp, a closed-issue style once Số 05 closes (not buyable, stays saved). Quick add through the size sheet; remove with undo. | `?favs=none`, `?auth=out`, `?state=` |
| `notifications.html` | The inbox from `HIVE.notifications()`, grouped Hôm nay / Tuần này / Trước đó. Unread items marked (not by colour alone). Each item has its Phosphor icon by kind and opens its target. "Đánh dấu đã đọc". Then the reminders you set (Số 06, with channels app and email as toggles) and the notification settings (orders, new issue, saved styles low in stock). | `?inbox=empty`, `?auth=out`, `?state=` |
| `track.html` | Tra cứu đơn without an account: mã đơn + số điện thoại. The result: status, timeline and items in the order-detail language, plus a link to sign in for the full page. | `?code=DH-1499&phone=0938571204` (found), wrong code, wrong phone |
| `archive.html` | The closed issues, newest first: Số 05 (once closed, per `?state=`), Số 04, Số 03. Each with dates, sold counts and its styles. Số 03 and 04 have no photos: design them typographically with their colour chips, never borrowing Số 05's photos. | `?state=open` (Số 05 not here yet), `?state=closed` |
| `issue.html?no=` | One closed issue: its styles, sold out, with what each sold; Số 05's has its photos. | `?no=4`, `?no=3`, `?no=5&state=closed` |
| `help.html` | Trợ giúp: a search field over the questions, grouped answers (đặt hàng, thanh toán, giao hàng, đổi trả at `#doi-tra`, size, tài khoản). Answers are short and factual, from the facts; unknown policy goes to open questions. Then a way to contact. | `#doi-tra`, `?q=cod` |
| `size-guide.html` | Bảng size: both fits from `HIVE.sizeChart`, labelled as simulated measurements, and how to pick between two sizes, briefly. | none |
| `contact.html` | Liên hệ: a message form (name, email or phone, order code optional, message), its errors and its sent state. No invented phone number, social handle or address. | `?sent=1`, `?errors=1` |
| `404.html` | Không tìm thấy: short, with the ways back (Khám phá, Đang bán, Tra cứu đơn). | none |

## Both builders

- Every internal link goes through `HIVE.keep()`. Every page supports the three moments.
- New renames and open questions: builder A adds its own to `direction.json`. Builder B writes its own to
  `feed/direction-b.json` as `{ "words": [], "open": [] }`, never touching `direction.json` (two writers would overwrite
  each other). The main session merges the two.
- Report back: the pages, their URL states, the shoot summary, and what you left open.

# Round 4 (27/09/2026): the user's answers to "Cần chốt"

Invoke the `design-taste-frontend` skill before writing code, as in every round. Feed's system, the round-2 and round-3
review fixes and the no-repeat list (`../BUILD.md`) all stay. Do not commit. Do not edit `direction.json`; report new
words and open questions in your final message and the main session merges them.

## Settled by the user (do not ask again)

- Home tabs: **Bảng tin, Cửa hàng, Sắp mở** (was Khám phá, Đang bán, Sắp mở). Hashes `#bang-tin`, `#cua-hang`,
  `#sap-mo`; the old `#kham-pha` and `#dang-ban` keep working. The bottom tab bar keeps all five items.
- Product page on desktop: the story frame the phone has (one photo at a time, segmented progress), because a style
  with many photos would otherwise be a long scroll.
- The product page starts on "Size của tôi" (`ACCOUNT.sizes`: top for tops, bottom for trousers) when that size is in
  stock in the chosen colour. Signed out: nothing preselected.
- The confirmation title stays "Đã đặt hàng". The cover line stays "10 mẫu. Cắt 1 lần. Hết là hết." for now.
- Orders: one flat list, newest first, with a phase filter (Đang xử lý, Đã giao, Đã huỷ: `HIVE.ORDER_PHASES`,
  `HIVE.orderPhase`) and a group filter (Số 05, Số 04, Số 03, Cố định: `HIVE.orderGroups`), because fixed-line pieces
  belong to no issue. DH-1507 is both Số 05 and Cố định; the new DH-1402 is fixed-line only (`issue: null`).
- Returns: the shop pays the delivery back; the refund goes by transfer to the shopper's bank account; the refund is
  exactly what the shopper paid for those pieces (`HIVE.refundOf`: price minus the code's share); the shop answers in
  1 to 3 days by notification and email (`HIVE.RETURNS`); an exchange takes a size still in stock within the 7 days,
  closed issue or not, and otherwise there is none; the condition "chưa mặc, còn nhãn" stays.
- Card: the gateway is not connected, so a card order pays by transfer with the 12-hour hold
  (`HIVE.paysByTransfer`, the CARD entry of `HIVE.PAYMENTS`).
- COD: cancellable until the confirmation call (as the order page already does).
- Delivery reaches every province.
- Trousers get their own chart (`HIVE.pantsChart`, simulated like the tops; shorts have their own lengths).
- Notification settings: the three switches stay and "Mã sắp hết hạn" is added (a `promo` item now exists in the
  inbox). "Trong app" means a line in the Thông báo inbox, never a browser push permission.
- Saved styles need an account: nothing is saved on the device while signed out.

## Still open (do not change these until the main session sends the answer)

The COD confirmation block, the Bảng tin lead between two issues, the "Trong Số 05" rail, the contact form, the help
page's name against the footer's "Câu hỏi thường gặp", and how much the guest order lookup shows.

## Builder A (chrome, home, buying flow, account core)

1. The tab rename everywhere in A's files (`feed.js` tabs and desktop nav, `home.*`, `products.*` title, `product.js`
   crumbs, `search.js`, the "Xem Đang bán" buttons in cart, checkout, orders, me). Old hashes stay as aliases.
2. The desktop product page as a story frame beside a sticky buy column; it must hold 2 photos or 8. Same controls as
   the phone (tap halves, arrows, keys), no autoplay unless the phone has it.
3. "Size của tôi" preselected; the product page's size sheet uses `pantsChart` for trousers (it shows chest widths for
   MUỐI today).
4. `orders.html` rebuilt flat with the two filters, both in the URL (`?phase=`, `?group=`), an empty result for a
   combination with nothing, and no count printed twice. Every page that reads `o.issue` handles `null`.
5. `return.html`: the refund amount once, the bank account (bank, account number, holder) when the shopper picks a
   refund, "the shop pays the delivery back" once in the review, the 1-to-3-day answer by notification and email on the
   sent screen, and the exchange rule above. Check DH-1502 and DH-1499 at `?state=closed` (two lines, a code).
6. Card orders: the checkout note says it pays by transfer; `order-confirmed.html?pay=card` is the transfer screen.

## Builder B (around the account)

1. The rename in B's files (`404.html`, `favorites.js`, `issue.js`, `help.js`).
2. `notifications.html`: the fourth switch, an icon for the `promo` kind, no browser-permission prompt.
3. `help.html`: delivery to every province; the return answers above (who pays the way back, where and how much the
   refund goes, 1 to 3 days by notification and email, exchange within 7 days while a size is left); card pays by
   transfer; COD cancellable until the call.
4. `size-guide.html`: the trousers chart beside the tops', the height picker marking both, how to measure a pair.
5. `track.html`: DH-1402 has no issue.

## Settled after the first pass (same day)

The six items left open above are now settled:
- the COD confirmation keeps its single line;
- between two issues, Số 05 leads Bảng tin for `LEAD_DAYS` (7), then Cố định leads (`?state=quiet`);
- the "Trong Số 05" rail is removed;
- contact messages land in the back office and are answered within 24 hours (`HIVE.CONTACT`);
- the help page is "Hỏi đáp";
- the guest lookup keeps its level.

Also settled:
- the cover line is "Cắt 1 lần. Không tái bản.";
- fees are refunded only when the whole order goes back for a shop-fault reason (`HIVE.SHOP_FAULT`).

Review fixes:
- the desktop product block spans the rail's width;
- Bảng tin never repeats the Cửa hàng grid (closed: a rail; quiet: a Cố định lead frame and feed cards; upcoming: rails);
- every quick add starts on Size của tôi;
- the footer's "Đổi trả" row is gone, and so is the product page's second "Đổi trả 7 ngày";
- the closed lead reads "Mở 11/09" instead of repeating the close date.

## Layout fixes asked by the user (27/09, after round 4)

- **Signed-out desktop** (the user's choice):
  - Tôi has two columns: "Đã có tài khoản" with the sign-in form in place (shared code with sign-in.html), and a dark "Chưa có tài khoản" card with Tạo tài khoản, then Tra cứu đơn in one row. The perks show on the phone only, because the menu lists them on desktop.
  - The other account pages get a banner whose buttons keep their natural width.
  - The left menu drops "Đăng nhập" while signed out.
  - Mobile is unchanged.
- **Tra cứu đơn on desktop**: one centred column in both states, 480px for the form and 720px for the result. The form folds into "Tra đơn khác" as on the phone, and nothing jumps when a lookup completes.
- **Success headers**: the check sits inline with the title, sized to the capitals, on phone and desktop. This covers order-confirmed, the return's sent step, contact's sent state and forgot-password's sent line.
- **The footer** reaches the bottom of the window on short pages (body at least 100dvh, main grows).
