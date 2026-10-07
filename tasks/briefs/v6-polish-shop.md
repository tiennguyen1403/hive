# Lượt rà v6, lát R1: cửa hàng

*Phiên chính viết 07/10/2026. Agent: `ui-implementer`. Nguồn: bước soát lượt rà v6 (ảnh và số đo ở `.playwright-cli/audit-v6/`).
Người dùng chốt 07/10: bốn câu hỏi thiết kế, và nhận cả 52 câu chữ đề xuất.*

## 0. Đọc trước

- `.agents/skills/design-taste-frontend/SKILL.md`, `.claude/skills/playwright-cli/SKILL.md`.
- `DESIGN.md`: phần Feed; mục Ngôn ngữ; §3 (luật `:lang(en)`); dải 900–1199.
- `tasks/plan.md`, mục "Lượt rà toàn app, đợt v6".
- Mock Feed ở `prototype/explore/feed/`, chỉ đọc.
- **Lượt này được đổi pixel bản VI.** Luật "VI không đổi pixel" chỉ áp dụng trong đợt tiếng Anh. Ngoài những chỗ brief này nêu, các
  trang khác giữ nguyên.
- **B19 vừa sửa phần tra đơn** (`TrackView`, `LookupForm`, `lib/lookup.ts`, `lib/feed-order.ts`, `lib/feed-account.ts`). Đừng đụng
  vào phần đó.

## 1. Việc

### 1.1 Dải 900–1199: các trang tài khoản xếp một cột (F2, F3, F4; người dùng chốt)

Ở 900–1199, bốn trang dưới đây đang chia ba cột (thanh điều hướng bên trái, cột chính, cột phụ) nên quá chật. Mock lỗi y hệt.
- **`/account/orders/[code]` và `/order-confirmed/[code]`:**
  - cột giá trị của `.copyrow` (nhãn 110px, giá trị, nút Chép) chỉ còn 25px ở trang đơn và 14–15px ở hoá đơn;
  - số tiền "2.680.000₫" vỡ 8–10 dòng, nội dung "DH2430" vỡ 4–6 dòng (đo trên DH-2430, đơn chuyển khoản đang chờ).
- **`/account/notifications`:** lưới `.b-notif` là `minmax(0,1fr) 300px` (`more.css:561`), nên cột tiêu đề thư còn 66px và tiêu đề dài
  3–4 dòng.
- **`/account`:** `.me-now` là `7fr 5fr` (`account.css:415`). Trong thẻ nhỏ của đơn đang đi, bốn `.ostep-label` mỗi nhãn rộng 40px;
  bản EN chồng lên nhau tới 9px ở 900–975.

**Sửa:** chỉ trong 900–1199px.
- **Trang đơn và hoá đơn:** cột phụ (Tóm tắt, Giao tới, …) xuống dưới cột chính.
- **Hộp thư:** khối nhắc mở bán và các công tắc xuống dưới danh sách.
- **Trang Tôi:** hai thẻ đơn xếp chồng.
- Từ 1200 trở lên giữ nguyên; dưới 900 giữ nguyên.

**Đạt khi**, ở 900, 1000, 1100 và 1199, cả VI lẫn EN:
- số tiền và nội dung chuyển khoản mỗi thứ một dòng;
- tiêu đề thư tối đa 2 dòng;
- nhãn bước không chồng nhau (đo bằng range rect);
- trang không cuộn ngang.

Không sửa mock; phiên chính tự áp cùng luật vào mock sau.

### 1.2 Sheet "Add address" tràn ngang (F1)

- **Ở đâu:** `/account/addresses?add=1`, từ 900 trở lên, bản EN; cả khi báo lỗi và khi mở picker tỉnh.
- **Sai gì:** `.sheet-panel` có scrollWidth 517 trong clientWidth 460; ô "Ward / commune" bị cắt chữ và có thanh cuộn ngang.
- **Nguyên nhân:** `.co-pair` là `1fr 1fr` (`app/styles/feed/flow.css:419`), tức `minmax(auto,1fr)`. Min-content của hai nút chọn bản
  EN là 236 + 241, cộng khe 16, thành 493px, rộng hơn 412px của hàng.
- **Sửa:** `[data-ui="feed"] .co-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }`; khi đó `.pick-v` tự cắt bằng "…"
  (`flow.css:198`). Kèm câu chữ C7 ở mục 1.7.
- **Đạt khi:** scrollWidth bằng clientWidth ở 900 và 1280, VI lẫn EN, ở cả ba trạng thái. Trang thanh toán và sheet sửa địa chỉ vẫn
  đúng.

### 1.3 Không có JavaScript thì thẻ vô hình (F5)

- **Nguyên nhân (đã đo):** `[data-ui="feed"] .rv:not(.in){opacity:0}` có độ đặc hiệu (0,3,0) (`feed.css:791`). Nó thắng luật dự phòng
  `[data-ui=feed] .rv{opacity:1}` (0,2,0) trong `<noscript>` (`components/feed/FeedChrome.tsx:189-191`).
- **Sửa:** đổi selector trong `<noscript>` thành `[data-ui=feed] .rv:not(.in){opacity:1;transform:none}`.
- **Đạt khi:** tắt script (`Emulation.setScriptExecutionDisabled`), `/`, `/products` và `/so/4` hiện đủ mọi thẻ.

### 1.4 `/faq#…` dừng quá thấp (F10)

- **Nguyên nhân:** hai khoảng đệm cộng dồn. `scroll-padding-top` của `html:has([data-ui="feed"])` là 108px (80px từ 900); `.b-qgroup`
  có `scroll-margin-top` 64px (88px từ 900).
- **Sửa:** thêm vào `more.css`: `html:has([data-ui="feed"] .b-qgroup) { scroll-padding-top: 0; }`.
- **Đạt khi:** đỉnh nhóm nằm ở 64px khi ở 390 và 88px từ 900, cả khi tải thẳng `/faq#doi-tra` lẫn khi bấm link "Đổi trả" ở chân trang
  (điều hướng phía client).

### 1.5 Chân trang gọn ở 900 (F11)

- **Sai gì:** bản VI chỉ còn 8px trước khi link cuối rớt dòng.
- **Sửa:** trong dải 900–999, `.foot-lite .foot-links { column-gap: 28px }`; hoặc nới tỉ lệ cột `.foot-lite .foot-in` (`feed.css:920`).
- **Đạt khi:** ở 900 bản VI còn ít nhất 40px, và bản EN vẫn đúng.

### 1.6 Tiêu đề Số bản EN dưới 600 (F15)

- **Sửa:** thêm luật `[data-ui="feed"]:lang(en) .b-hero-no` dưới 600px, giống luật `.b-issue-no` (DESIGN §3), để "Drop 05" của `/so/5`
  đã đóng nằm một dòng ở 360.
- Mấy chỗ bản EN xuống dòng thêm vì dữ liệu dài hơn (ô `/so/3`, `/so/4`, dòng chi tiết trang chủ ở 900) thì **chấp nhận, không sửa**.

### 1.7 Câu chữ (người dùng đã duyệt 07/10; dùng đúng nguyên văn)

- **C1** `lib/feed-help.ts`, câu hỏi Hỏi đáp:
  - vi "Trả bằng thẻ được chưa?" thành "Trả bằng thẻ được không?";
  - en "Can I pay by card yet?" thành "Can I pay by card?".
- **C2** `lib/feed-help.ts` `anyOf`: dạng "a, b hay c" thành "a, b, hoặc c". Câu "Hoàn tiền thế nào?" khi đó đọc "…vì khác với ảnh, lỗi
  may hoặc in, hoặc giao nhầm món thì hoàn cả phí giao hàng và phụ phí COD." Kiểm lại `anyOf` không còn chỗ dùng nào khác.
- **C7** chỗ gợi ý ô Phường/xã trước khi chọn tỉnh, bản EN "Choose a province first" thành "Province first", ở `AddressesView.tsx`,
  `CheckoutView.tsx`, `ArcAddressForm.tsx`. VI giữ "Chọn tỉnh trước".
- **C8** `lib/feed-home.ts` (`.soon-note`), en "Price and quantity announced at opening." thành "Price and quantity at opening.".
- **C9** `app/privacy/page.tsx`, en "The demo's back office is open for anyone to try." thành "The demo's admin is open for anyone to
  try."; phần sau của câu giữ nguyên.
- **C10** `lib/feed-checkout.ts` (dòng phụ giao nhanh), en "Central HCMC only, during office hours" thành "Central HCMC only, office
  hours".
- **D1** `lib/checkout-form.ts`: "Số điện thoại chưa đúng — 10 số, bắt đầu bằng 0." thành "Số điện thoại chưa đúng: 10 số, bắt đầu
  bằng 0.".
- **D2–D6** `lib/order-payload.ts`. Gạch ngang dài thành dấu chấm, chữ sau viết hoa; bản EN giữ nguyên.
  - "Một món vừa hết — mở giỏ để đổi size hoặc bỏ món." thành "Một món vừa hết. Mở giỏ để đổi size hoặc bỏ món."
  - "${LEX.t} đã đóng — món trong giỏ không còn bán." thành "${LEX.t} đã đóng. Món trong giỏ không còn bán."
  - "Mã giảm giá không còn dùng được cho đơn này — bỏ mã hoặc thử mã khác." thành "Mã giảm giá không còn dùng được cho đơn này. Bỏ mã
    hoặc thử mã khác."
  - "Thông tin đơn chưa đúng — kiểm lại địa chỉ và giỏ rồi đặt lại." thành "Thông tin đơn chưa đúng. Kiểm lại địa chỉ và giỏ rồi đặt
    lại."
  - "Đơn này không huỷ được nữa — liên hệ cửa hàng." thành "Đơn này không huỷ được nữa. Liên hệ cửa hàng."

Test đang khẳng định câu cũ thì sửa theo câu mới, và liệt kê trong báo cáo.

## 2. Kiểm, theo tầng (người dùng chốt 07/10)

**Chỉ kiểm chỗ đổi và chỗ bị ảnh hưởng.** Sweep trọn cả app, so pixel mọi trang và `test:db` trọn bộ để dành cho mốc cuối đợt, không
làm ở lát này.

**Lệnh**
- `npm run typecheck` và `npm test` **trọn bộ**: chỉ 8 giây. Đừng dùng `vitest related`, vì có test đọc tệp bằng `fs` mà lệnh đó không
  nhìn thấy.
- `npm run build` **một lần**, ở cuối. Không build lại bản cũ để chụp ảnh "trước".
- **Không** chạy `npm run test:db`: lát này không đụng `supabase/`, `lib/db/`, `lib/actions/` hay `data/`. Nếu buộc phải đụng thì chạy,
  và ghi lý do.
- `npx impeccable detect --json app components` (mốc 2).

**Ảnh "trước"**
- Ở 390, 900 và 1280: dùng lại ảnh của bước soát, `.playwright-cli/audit-v6/shots/{vi,en}/` và `audit-v6/sweep/{vi,en}/`. Mốc này có
  từ trước B19, nên vẫn đúng, trừ các trang tra đơn và đăng nhập.
- Ở 1199 và 1200: chụp trên 3200 **trước khi sửa**.

**Ảnh "sau"**, cả vi lẫn en, vì đổi CSS có thể chỉ lộ lỗi ở một thứ tiếng (lỗi F1 chỉ hiện ở bản EN):
- **mục 1.1:** bốn trang ở 900, 1199 và 1200 (mép dải và một điểm ngay ngoài dải), cộng 390 để đối chứng; mở lớp nổi liên quan;
- **mục 1.2:** sheet "Add address" ở 900 và 1280, ba trạng thái;
- **mục 1.4:** `/faq#doi-tra` ở 390 và 1280; thêm **`/privacy`** ở 390 và 1280, vì trang này cũng dùng `.b-qgroup`, nên luật
  `html:has(… .b-qgroup)` cũng áp vào nó;
- **mục 1.5:** chân trang ở 900;
- **mục 1.6:** `/so/5` đã đóng ở 360, bản en (đóng tạm Số 05 trên DB cục bộ, rồi `reset_demo`);
- **mục 1.7, câu chữ:** đo số dòng của từng khối chữ đã đổi, ở bề ngang hẹp nhất bị ảnh hưởng.
  - C10 sửa `lib/feed-checkout.ts`, mà `feed-home`, `feed-help`, `feed-cart`, `feed-order` đều import nó. Vì vậy kiểm cả `/`, `/faq`,
    `/cart` và `/account/orders/DH-2430`.
  - C7 sửa cả `ArcAddressForm.tsx` của quản trị. Vì vậy chụp lớp nổi sửa địa chỉ trong trang một đơn quản trị ở 1280, bản en.

**Sweep rút gọn**, chỉ vùng cửa hàng
- Chép `tools/layout-sweep.js` thành `.playwright-cli/sweep-r1-vi.js` và `sweep-r1-en.js`.
- Chỉ cắt mảng route quản trị; giữ nguyên vòng lặp lớp nổi của các route cửa hàng.
- Giữ khối đăng nhập quản trị, chỉ để chạy lớp nổi `admin-order-address-form-1280` (vì C7).
- Hai lượt chạy riêng, đóng trình duyệt giữa hai lượt.
- So **theo từng route** với `tools/sweep/reference/baseline/sweep-b18r2-{vi,en}.json`, không so tổng. Giải thích mọi route khác mốc.
  Lát này sửa `FeedChrome` (mục 1.3) và chân trang (mục 1.5), nên phải giữ cả vùng cửa hàng, không lọc tiếp.

**Trang đối chứng**, chỉ để bắt lỗi rò sang chỗ khác
- `/`, `/products/s05-khoi`, `/cart`, `/checkout`, `/account/orders/DH-2430` ở 390 và 1280, bản vi; `/admin` và `/admin/orders` ở 1280.
- So pixel với ảnh cùng tên của bước soát. Bỏ qua vùng đồng hồ đếm ngược và giờ tương đối.
- Lệch ở chỗ ngoài ý muốn thì dừng lại và báo.

Ảnh ở `.playwright-cli/shots/ui/v6-polish-shop/`. Xem tận mắt; test xanh không có nghĩa là trông đúng.

## 3. Luật

- Chỉ Edit/Write. Không commit. Không sửa mock. Không sửa `tools/` (phiên chính lo).
- Lệnh nào bị hệ thống quyền chặn: đừng tìm đường vòng, ghi vào báo cáo.
- Ghi DB thì chạy `reset_demo(demo_anchor())` sau đó. Không bấm "Đặt lại dữ liệu mẫu" trên UI. Không đọc `supabase/.env`.
- Để 3200 chạy bản build cuối và để stack Supabase chạy khi xong.

## 4. Báo cáo

- **Đã đổi:** tệp và luật CSS, kèm số đo trước và sau cho từng mục.
- **Ảnh hưởng:** tệp đã đổi, và route suy ra bị ảnh hưởng (qua import, tên class và `@media` bao quanh), để phiên chính kiểm lại cơ
  học.
- **Test đã sửa,** và lý do.
- **Chỗ lệch so với brief.**
- **Chỗ nào cần áp vào mock:** selector và giá trị, để phiên chính chép sang.
