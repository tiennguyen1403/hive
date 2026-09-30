# Brief: v4 lát 5, dọn mã v3 (không đổi hình, không đổi hành vi)

*30/09/2026. Agent `ui-implementer`. Chạy **sau B13** (gỡ `track_order()`), không song song: chung `.next`, DB cục bộ và cổng
3200. Đọc hết brief rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`, `scripts/`,
  `supabase/`. Tài liệu nào cần sửa thì ghi vào báo cáo; phiên chính sửa.
- Không git commit, stash, reset hay checkout. Để nguyên `tasks/anh-san-pham-prompt.md`, `tasks/lookbook-register.md` (phiên
  khác).
- **Không có mock cho lát này.** Bỏ các bước đọc mock, `craft-floor.md` và `impeccable context` trong định nghĩa agent. Vẫn
  đọc `AGENTS.md` và docs Next cần cho việc (`01-app/03-api-reference/02-components/font.md`, mục `preload` và *Preloading*).
- Định nghĩa agent dặn "không xoá tệp brief không nêu". Brief này **nêu theo luật**: được xoá mọi tệp ở mục 2 và mọi tệp mà sau
  các lượt xoá không route nào còn chạm tới (chạy lại `reach.mjs`, mục 5, tới khi không còn gì mới), cùng test của chúng.

## 1. Vì sao, và luật của lát

Toàn bộ phần khách đã theo Feed và đã lên demo (`71d1662`). Quản trị vẫn dùng v3 tới vòng mock riêng. Mã v3 của phần khách còn
nằm lại khắp nơi:
- 66 tệp component không route nào import (~10.300 dòng) và 9 tệp `lib` chỉ còn test giữ (~3.100 dòng kể cả test);
- hai provider v3 bọc mọi trang ở layout gốc, đọc và ghi các kho `brand.*` không màn nào dùng;
- khoảng 550–700 trên 1.211 rule CSS v3 không còn phần tử nào khớp, mà vẫn nằm trong gói CSS chặn hiển thị của mọi trang. Gói
  đó 252 KB thô, 41,7 KB gzip, gồm 1.734 selector Feed và 1.231 selector `.s` của v3;
- 10 tệp font v3 (Be Vietnam Pro, Unbounded; ~101 KB) được **tải trước ở mọi trang**, qua header `Link` của layout gốc. Các
  trang Feed không dùng chúng;
- trang kit `/system` (lát 0 hẹn "xoá khi xong đợt") và trang thăm dò `/hyd`: người dùng chốt 30/09 là **xoá**.

**Luật của lát:**
- **Không đổi hình, không đổi hành vi** ở mọi route còn lại: Feed ở 390 và 1280, quản trị ở 1280, cùng mọi lớp nổi. Chỉ được
  khác đúng ba điều:
  - `/system` và `/hyd` thành 404 (trang 404 Feed);
  - trang Feed không còn tải trước font v3;
  - các kho `brand.*` đã nghỉ bị xoá khỏi trình duyệt khách (mục 3.5).
- Thấy gì đổi hình mà không giải thích được: **dừng và báo**. Không "sửa cho giống", không tự quyết.
- Không xung đột luật nào được dự kiến. Nếu gặp thì ghi mục "Xung đột luật" như mọi lát v4.

## 2. Tệp xoá (đã dò bằng `reach.mjs` lúc 30/09, trên cây `71d1662`)

- **Route:** `app/system/` (`page.tsx`, `KitChips.tsx`, `KitSort.tsx`, `KitTokens.tsx`), `app/hyd/page.tsx`.
- **`components/account/`:**
  - màn: `AccountHome`, `AccountLayout`, `AccountRail`, `AddressFormScreen`, `AddressesScreen`, `CancelOrderSheet`,
    `ForgotPasswordScreen`, `NotificationsScreen`, `OrderDetailScreen`, `OrderRow3`, `OrdersScreen`, `PasswordScreen`,
    `ProfileScreen`, `SignInScreen`, `SignUpScreen`, `WishlistScreen`;
  - `notif-center.ts`;
  - hai provider, **sau khi gỡ khỏi layout** (mục 3.2): `AddressBookContext`, `WishlistContext`.
- **`components/cart/`:** `CartLineRow`, `CartScreen`, `LaterList`, `PromoBox`, `ShipBar`, `later.ts`. Giữ `CartContext`.
- **`components/checkout/`:** `AddressPicker`, `CheckoutScreen`, `OrderBox`, `OrderConfirmed`. Giữ `wards.ts`, `WardSelect.tsx`
  (quản trị dùng).
- **`components/product/`:** cả 15 tệp: `BuyBar`, `FamilyTabs`, `FilterRail`, `FilterSheet`, `Listing`, `ListingControls`,
  `PriceFilterForm`, `ProductCard`, `ProductView`, `RecentSearches`, `SearchBox`, `SizeGuideSheet`, `SizeSheet`, `SizeTable`,
  `SortControl`.
- **`components/shop/`:** `ClosedIssue`, `CopyButton`, `Countdown`, `DropClock`, `InvoiceSheet`, `NavLogo`, `NeedWrite`,
  `RemindButton`, `ReminderBand`, `ShopFrame`, `SiteFooter`, `SiteNav`, `Steps`, `TrackScreen`, `prefs.ts`, `reminders.ts`,
  `useDropLabel.ts`. Giữ `CatalogContext`, `Empty`, `Toast`, `WaitVeil`, `recent-searches.ts`.
- **`lib/`, chỉ test còn giữ; xoá cùng test:** `address-book`, `invoice`, `later`, `notifications`, `order-rows`, `prefs`,
  `reminder`, `suggest`, `wishlist`.
- **CSS:** `app/styles/feed/system.css`, cùng dòng `@import` và chú giải của nó trong `app/globals.css`.
  `app/styles/feed/scope.test.ts` bỏ `system.css` và ngoại lệ `--kit-`.
- **Giữ, dù trông như v3:**
  - `components/icon/` (quản trị dùng; `ink.fixture.json` là dữ liệu test);
  - `components/ui/*` (quản trị dùng; `Menu3` sống qua `Select`);
  - `data/*` (fixture của seed và test);
  - `components/shop/WaitVeil`: chạy ở mọi trang.

## 3. Việc

### 3.1 Route và trang kit
- Xoá như mục 2.
- `components/feed/FeedScope.tsx`: nếu component `FeedScope` chỉ `/system` dùng thì bỏ nó. Giữ `FEED_ZONE`, `feedFontClass`.

### 3.2 Layout gốc (`app/layout.tsx`)
- Gỡ `AddressBookProvider` và `WishlistProvider`. Viết lại chú giải cây provider cho đúng những gì còn lại.
- `Be_Vietnam_Pro` và `Unbounded`: thêm `preload: false`, kèm chú giải một câu: chỉ quản trị dùng; trang Feed chạy Mona Sans;
  quản trị tải hai font khi cần với `display: swap`. Biến CSS vẫn gắn ở `<html>`, vì lớp nổi quản trị portal ra `<body>`
  cũng cần chúng.
- Kiểm trên trang Feed: không phần tử nào vẽ chữ bằng hai font này. Dò `document.fonts` sau khi trang yên: không mặt chữ Be
  Vietnam Pro hay Unbounded nào ở trạng thái `loaded`. Nếu có thì báo phần tử nào; không tự sửa.

### 3.3 Tệp chết (mục 2)
- Xoá lần lượt. Sau mỗi nhóm chạy `npm run typecheck` và `npm test`.
- Chạy lại `reach.mjs` tới khi nó không báo gì mới trong `app/`, `components/`, `lib/`, trừ những tệp đã liệt kê giữ.

### 3.4 Export chết trong tệp còn sống
`exports.mjs` liệt kê những export không module sống nào (ngoài test) import. Luật:
- **Xoá** (cùng test chỉ để kiểm nó) mọi export chết thuộc tính năng v3 đã bỏ. Danh sách lúc dò:
  - `lib/account-form.ts`: `validateSignUp`, `validateChangePassword`, `EMPTY_ADDRESS`; cùng `passwordChecks` nếu chỉ chúng dùng;
  - `lib/actions/addresses.ts`: `saveAddress`, `rememberAddress`, `makeDefault`;
  - `lib/admin-customers.ts`: `isCustomerKey`;
  - `lib/cart.ts`: `buyableUnits`, `swapSizesFor`;
  - `lib/catalog-query.ts`: `SORT_LABELS`, `isNameSeparator`, `listingHref`, `filterLabels`, `isFiltered`, `clearFilters`,
    `parseListingQuery`, `runListingQuery`, `familyCounts`, `fitCounts`, `sizeCounts`, `colorCounts`, `priceBandCounts`,
    `priceRangeOf`;
  - `lib/checkout-form.ts`: `EMPTY_DRAFT`, `checkoutStep`;
  - `lib/customer-orders.ts`: `ORDER_TABS`, `ordersForTab`, `refundNote`;
  - `lib/datetime.ts`: `openingLabel`;
  - `lib/db/profiles.ts`: `requireMe`;
  - `lib/drop.ts`: `currentDrop`, `previousDropNote`, `wayToShop`, `dropBandLabel`;
  - `lib/feed-account.ts`: `ordersQuery`, `canCancelOrder`;
  - `lib/feed-issue.ts`: `issueRun`;
  - `lib/inventory-adjust.ts`: `AdjustReason`;
  - `lib/inventory.ts`: `photoSetsNeeded`, `showcaseOnSale`, `sameFamilyOnSale`, `lowStockIn`, `familyGroupsIn`;
  - `lib/lexicon.ts`: `plateLabel`;
  - `lib/lookup.ts`: `samePhone`, `notFoundMessage`, `totalRowLabel`, `trackedOfOrder`, `lastUpdateLabel`;
  - `lib/money.ts`: `styleCountLabel`;
  - `lib/orders.ts`: `isPromoLive`, `transferDeadlineIso`;
  - `lib/promotions.ts`: `promoOfferLabel`, `promoTermsLabel`, `promoWindowLabel`, `promoAppliedMessage`;
  - `lib/shipping.ts`: `deliveryTitle`, `deliveryWindowLabel`, `deliveryShortLabel`;
  - `lib/sold-out-times.ts`: `anySoldOutTime`;
  - `components/checkout/wards.ts`: `useWardLabels`.
- **Giữ:**
  - mọi export trong `data/`;
  - `lib/clock.ts` `DEMO_ANCHOR`;
  - `lib/flats.ts` (`isFlatKey`, `PLATE`, `flatSvg`; `scripts/flats.ts` dùng);
  - `lib/shots.ts` (`SHOT_KEYS`, `shotOf`);
  - `components/icon/Icon.tsx` `GLYPH_NAMES`.
- Export mà chính tệp của nó còn dùng (`internal:yes`) thì **để nguyên**, kể cả chữ `export`. Không đổi mã chỉ để gọn.
- Xoá một export làm hàm hay hằng khác trong tệp thành chết thì xoá tiếp. Lặp tới khi `exports.mjs` không còn mục chết mới
  ngoài danh sách giữ.
- Nếu xoá một hàm `lib/feed-*` đã có test để lại logic y hệt viết thẳng trong component mà không test nào kiểm: **ghi vào báo
  cáo**, không tự chuyển component sang gọi hàm.

### 3.5 Kho trên thiết bị
- Tệp mới, ví dụ `lib/device-storage.ts`:
  - một danh sách khoá đã nghỉ: `brand.wishlist`, `brand.reminder`, `brand.prefs`, `brand.later`, `brand.addresses`,
    `brand.session`, `brand.orders`, `brand.lastOrder`, `brand.adminSim`;
  - một hàm thuần xoá chúng khỏi một `Storage`, bọc try/catch, vì trình duyệt chặn lưu trữ thì truy cập cũng ném lỗi.
- Gọi hàm đó một lần khi mount, cho cả `localStorage` và `sessionStorage`, ở một provider client **sẵn có** của layout gốc.
  Không thêm component mới vào cây.
- Test:
  - khoá đã nghỉ bị xoá;
  - năm khoá còn sống **không** bị đụng: `brand.cart`, `brand.promo`, `brand.searches`, `brand.height`, `brand.adminCols`;
  - `Storage` ném lỗi thì không vỡ.
- Chú giải nói lý do: `brand.addresses` giữ tên, số điện thoại và địa chỉ của khách vãng lai mà app không còn hiện, cũng không
  còn cho xoá.

### 3.6 CSS v3 (`app/styles/*.css`, trừ `feed/`) và token
**Một rule v3 là chết khi:**
- nó nằm dưới `.s`, và:
  - hoặc đòi `.v3` (gốc cửa hàng v3 là `ShopFrame`, đã xoá; quản trị là `.s.adm3`),
  - hoặc đòi một class mà không mã v3 sống nào sinh ra được. Mã v3 sống gồm: `app/admin/**`, `components/admin/**`,
    `components/ui/**`, `components/icon/**`, `components/shop/{Empty,Toast,WaitVeil}.tsx`,
    `components/checkout/WardSelect.tsx`, `app/layout.tsx`, và các hàm `lib/` trả tên class cho chúng (ví dụ tone của `Badge`
    trong `lib/order-labels.ts`). Liệt kê rõ mọi class ghép động mà bạn giữ;
- hoặc nó **không** nằm dưới `.s` (`.sheetwrap`, `.menu3`, `.toast`, `.veil`, `.sr-only`, `html`, `body`, `:root`,
  `[data-pointer]`, …) và đòi một class mà không mã sống nào, kể cả Feed, sinh ra được.

**Cách làm:**
- Selector list có phần chết phần sống: chỉ bỏ phần chết.
- Tệp rỗng thì xoá, cùng `@import` của nó.
- Không đổi thứ tự `@import`. Không chuyển rule giữa các tệp.
- Chú giải đầu `app/globals.css` và đầu mỗi tệp CSS còn lại sửa cho đúng:
  - bỏ tên tệp, class đã xoá;
  - bỏ cặp tie specificity mà một vế đã mất;
  - không thêm cặp mới, vì lát này không thêm rule.
- Token v3 trong khối token của `globals.css` (không phải `@theme`) mà sau khi tỉa không còn `var(--…)` nào trong CSS, TSX hay
  TS nhắc tới: xoá. **Không đụng `@theme`**: preflight và theme của Tailwind đọc nó (`--font-sans`, …).

**Chốt an toàn, bắt buộc:** trước khi sửa, trên bản dựng cũ, thu **tập rule đã khớp**.
- Duyệt mọi trạng thái ở mục 4. Với mỗi `CSSStyleRule` trong mọi stylesheet, kể cả rule trong `@media`, bỏ pseudo-class động
  (`:hover`, `:focus`, `:focus-visible`, `:focus-within`, `:active`, `:visited`) và pseudo-element, rồi
  `document.querySelector(selector)`. Khớp ít nhất một lần thì rule đó sống.
- **Không được xoá rule nào có trong tập này.** Rule có mặt ở đây mà luật trên bảo là chết thì báo; đó là lỗi của luật.
- Rule không nằm trong tập mà class vẫn còn trong mã sống thì giữ, vì có thể là trạng thái chưa duyệt tới.

### 3.7 Chú giải và tên còn trỏ tới thứ đã xoá
- Grep trong `app/`, `components/`, `lib/` và các test, tìm từng tên tệp, component, hàm, class và khoá đã xoá.
- Chú giải còn nhắc chúng như thứ đang có thì sửa hoặc bỏ. Ví dụ:
  - `WaitVeil` nói `ShopFrame` remount;
  - layout nói "the v3 screens' device lists".
- Không viết lại chú giải không liên quan.

### 3.8 Test
- Test của mã bị xoá thì xoá theo.
- Test đo toàn app thì sửa cho đúng cây mới, không nới luật: `lib/classnames.test.ts` (số tệp đọc được), `lib/clock.test.ts`,
  `app/styles/feed/scope.test.ts`.
- Báo cáo ghi số test trước → sau và liệt kê test đã bỏ.

## 4. Kiểm

**Trước khi sửa gì**, trên cây hiện tại (đã có B13):
1. Dựng, chạy 3200.
2. Đặt lại dữ liệu mẫu cục bộ: nút "Đặt lại dữ liệu mẫu" của quản trị, hoặc `select public.reset_demo(public.demo_anchor());`
   trên DB cục bộ.
3. Chụp **before**:
   - mọi route trong `tools/layout-sweep.js`, ở các cỡ sweep dùng;
   - các bước mở lớp nổi của quản trị trong sweep đó;
   - thêm lớp nổi Feed: sheet size trang sản phẩm, sheet bộ lọc Cửa hàng, sheet huỷ đơn, sheet địa chỉ;
   - dùng ngữ cảnh trình duyệt sạch, tài khoản mẫu qua nút "Đăng nhập thử" như sweep làm.
4. Cùng lượt đó thu tập rule đã khớp (mục 3.6).
5. Ghi:
   - header `Link` của `/` và `/admin`;
   - kích thước CSS trong `.next/static` (thô và gzip);
   - tổng dòng `app/styles/*.css`;
   - số tệp và số dòng TS/TSX trong `app/`, `components/`, `lib/`.

**Sau khi xong:**
- `npm run typecheck`, `npm test`, `npm run test:db`, `npm run build`: tất cả sạch. Nêu số test.
- Đặt lại dữ liệu mẫu, chụp **after** cùng script, cùng trạng thái. So từng cặp bằng pixelmatch hoặc so hash vùng:
  - chỗ khác chỉ được là đồng hồ đếm và giờ tương đối; liệt kê từng vùng;
  - khác chỗ nào khác là lỗi: tìm rule hay provider đã gỡ nhầm và trả lại.
- Chạy `tools/layout-sweep.js`: không phát hiện nào mới so với bản before.
- Không lỗi console, ngoài các dòng 404 cố ý.
- `/system` và `/hyd` trả 404.
- Header `Link` của trang Feed không còn tệp font v3; của `/admin` thì tuỳ Next, ghi lại.
- Trong trình duyệt:
  - đặt vài khoá đã nghỉ cùng `brand.cart`, rồi tải một trang;
  - khoá đã nghỉ mất; giỏ còn nguyên.
- Ghi lại các số của bước 5, trước → sau.

## 5. Công cụ của phiên chính (chỉ đọc, dò bằng regex nên chỉ là gần đúng)

Ở `C:\Users\PC\AppData\Local\Temp\claude\D--Code-e-commerce\9d804efe-5c03-4e50-b904-a331be567cbe\scratchpad\`. Chạy từ gốc repo:
- **`reach.mjs`**: tệp không route nào chạm tới, kèm tệp chỉ tool hay test giữ.

  ```
  node <dir>/reach.mjs . --drop app/system,app/hyd
  ```

  Thêm `--cut "app/layout.tsx>components/account/WishlistContext.tsx"` để giả lập gỡ một import.
- **`exports.mjs`**: export không module sống nào import. `dead.txt` là danh sách tệp chết lúc dò.

  ```
  node <dir>/exports.mjs . --dead <dir>/dead.txt
  ```

- **`v3css.mjs`**: ước lượng rule v3 chết theo tệp.

  ```
  node <dir>/v3css.mjs <dir>/dead.txt
  ```

  Kho class ở đây còn tính cả chữ của trang Feed, nên số chết bị đếm thiếu.

`tsc` là trọng tài cuối cho TS. Với CSS, trọng tài là tập rule đã khớp cùng phép so ảnh. Được chép các script này vào
scratchpad của bạn và sửa. Không đưa vào repo.

## 6. Nộp

- Ảnh ở `.playwright-cli/shots/v4/lat-5/before/` và `after/`, cùng tên tệp, kèm `diff-report.txt` (tệp, số pixel khác, vùng
  khác, lý do).
- `REPORT.md` đặt cạnh ảnh, chép nguyên báo cáo, vì báo cáo agent từng hai lần không về.
- Báo cáo theo hợp đồng của agent, gửi trọn trong **tin cuối**. Kèm:
  - bảng **đã xoá / giữ vì còn dùng / chưa chắc**;
  - rule CSS còn lại mà không trạng thái nào khớp, kèm lý do giữ;
  - các số trước → sau;
  - việc tài liệu cần sửa cho phiên chính: `DESIGN.md`, `.claude/agents/ui-implementer.md` (nhắc `app/hyd`, `NeedWrite`),
    `tasks/plan.md`.
