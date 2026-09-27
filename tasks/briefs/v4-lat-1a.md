# Brief: v4 lát 1a, khung Feed và trang chủ

Đợt v4 đưa Feed vào app. Kế hoạch ở cuối `tasks/plan.md`, mục "Đợt v4 Feed": các quyết định QĐ-32 đến QĐ-36, người dùng
đã xác nhận 18 xung đột, và lát 0 đã ĐẠT. Nền của lát 0 đã có:
- vùng Feed `FeedScope`, `FEED_ZONE`, `feedFontClass` ở `components/feed/FeedScope.tsx`;
- token `--f-*`;
- CSS ở `app/styles/feed/`;
- `FeedIcon` (Phosphor), `FeedLogo` (tông sáng và tối).

Lát 1a chuyển **trang chủ `/`** sang Feed và dựng **khung Feed** mà mọi lát sau dùng lại. Các route khác giữ khung v3 cho
tới lát của chúng.

**Luật số một (QĐ-36):** màn phải giống mock Feed hoàn toàn. Luật cũ nào chặn thì làm theo mock và ghi vào mục "Xung đột
luật". Riêng ba luật người dùng giữ thì vẫn giữ:
- vùng chạm vô hình đạt 46;
- bộ lọc nằm trên URL;
- `::selection` và `caret-color` theo màu Feed. Hai thứ này đã có trong vùng.

## 1. Nguồn chuẩn

Mock: `prototype/explore/feed/`. Chạy `cd prototype && python serve.py 3100` nếu cổng 3100 chưa chạy.
- `home.html` + `home.js`: ba tab Bảng tin, Cửa hàng, Sắp mở; bốn thời điểm.
- `feed.js`: khung, card, rail, sheet chọn size, sheet "đã thêm", nhắc mở bán, đếm ngược, `F.shop()` cho lưới Cửa hàng.
  Phần đầu tệp là hợp đồng khung.
- `feed.css`: khung, card, rail, story, thẻ Số 06, lưới, desktop, dải 900 đến 1199.
- `feed/BRIEF.md`: đọc "Global chrome", "Home, phone", "Home, desktop", rồi "Round 2", "Round 4" và "Layout fixes".

Xem mock ở đủ bốn thời điểm, ở 390 và 1280:
- `home.html?state=open`, `?state=upcoming`, `?state=closed` (3 ngày sau khi Số 05 đóng), `?state=quiet` (10 ngày sau);
- mỗi thời điểm với cả ba tab.

**Dữ liệu là của app**, không phải `shared/data.js`: `loadCatalog`, `featuredDrop`, `dropState`, `dropCalendar`, `lib/inventory`,
`lib/lexicon`, `lib/money`, `lib/photos`. Con số nào app không có thì không bịa; hỏi phiên chính.

## 2. Việc cần làm

1. **Khung Feed**, thành component dùng chung (vd `FeedFrame`), bật vùng Feed. Làm đúng `feed.js` và `feed.css`:
   - **Thanh trên, điện thoại:** logo và chuông, không có túi vì tab đáy đã có Giỏ.
   - **Thanh trên, máy tính:**
     - logo;
     - ba tab Bảng tin, Cửa hàng, Sắp mở;
     - các icon Tìm (`/search`), chuông (`/account/notifications`), tim (`/account/wishlist`), túi kèm số món (`/cart`),
       người (`/account`).
   - **Tab đáy trên điện thoại:** Trang chủ, Tìm, Yêu thích, Giỏ, Tôi.
   - **Chân trang đầy đủ:**
     - cột "Trợ giúp": Hỏi đáp → `/faq`, Đổi trả 7 ngày → `/returns`, Tra cứu đơn → `/track`, Liên hệ → `/contact`. "Bảng size"
       chưa có route nên **không** hiện, cho tới lát 4.
     - khối Giao hàng và Thanh toán lấy từ `lib/shipping`. Không có dòng "Đổi trả" (sửa ngày 27/09).
   - **Chân trang rút gọn** cho màn cần.
   - Chân trang nằm sát đáy ở trang ngắn (sửa ngày 27/09).
   - Route v3 vẫn dùng `ShopFrame`.
2. **Trang chủ `/`**, ba tab đổi tại chỗ, hash `#bang-tin` / `#cua-hang` / `#sap-mo`.
   - **Bảng tin theo thời điểm.** Thời điểm tính từ đồng hồ thật và dữ liệu, như `featuredDrop`, với `LEAD_DAYS` = 7.
     - **Đang mở:**
       - story NGUỘI với câu bìa **"Cắt 1 lần. Không tái bản."**;
       - các khung mẫu xen ảnh thẻ và ảnh mặc;
       - thẻ Số sắp mở và rail Cố định chen giữa như mock;
       - **không có rail "Trong Số 05"**;
       - cuối cùng là Đã đóng.
     - **Sắp mở:** thẻ Số sắp mở, rail Cố định, rail Số vừa đóng, Đã đóng.
     - **Giữa hai Số, dưới 7 ngày:** bản tóm tắt Số vừa đóng ("Đã đóng 25/09." và "Mở 11/09", không lặp ngày đóng), rail Cố
       định, Đã đóng.
     - **Giữa hai Số, từ 7 ngày:**
       - khung dẫn "CỐ ĐỊNH" với chip Đang bán, món đầu dòng Cố định ở bản đen (`storyFixed`) và nút "Xem 8 mẫu";
       - các món Cố định còn lại dạng thẻ feed;
       - cuối là Đã đóng, Số vừa đóng đứng đầu.
     - Không món nào xuất hiện hai lần. Bảng tin không lặp lưới của tab Cửa hàng.
   - **Cửa hàng:**
     - lưới của `F.shop()`, gồm dòng hàng, loại, sắp xếp;
     - thành component dùng chung, vì lát 1b dùng lại cho `/products`;
     - **bộ lọc nằm trên URL** (luật 17 người dùng giữ), tải lại không mất.
   - **Sắp mở:** lịch mở bán; thẻ Số sắp mở có đếm ngược và nút Nhắc tôi; khi chưa công bố thì hiện "Chưa có Số mới".
3. **Thẻ, rail, sheet** theo mock:
   - tim yêu thích, nút + thêm nhanh mở sheet chọn size, sheet "đã thêm";
   - chip "Còn N" có lửa, dấu ĐÃ HẾT trên ảnh, đếm ngược theo giây;
   - hiện dần khi cuộn tới, và tắt khi máy bật giảm chuyển động.
4. **Hành vi tạm thời,** chuyển sang tài khoản ở lát 3:
   - tim dùng wishlist đang có (`lib/wishlist.ts`), giữ nguyên hành vi;
   - Nhắc tôi dùng `lib/reminder.ts`;
   - thêm nhanh chọn sẵn size ghi nhớ đang có (`prefs.size`) khi còn hàng ở màu đó, áo và quần theo nhóm như mock.
5. **Thương hiệu:**
   - **Ảnh chia sẻ** (`opengraph-image.tsx`, `twitter-image.tsx`, `lib/brand/share-*`): bản đen trắng theo QĐ-33, câu bìa mới
     đặt bằng Mona Sans hẹp 75% đậm 900, thành nét qua `scripts/brand-assets.ts`. `HOME_COVER.headline` đổi theo câu mới;
     kiểm mọi chỗ dùng nó.
   - **`WaitVeil`:** trên route Feed, mark đen trắng, không còn mật ong.
   - **`THEME_COLOR`:** `#FCFCFD` như mock.
   - Được sửa `scripts/` cho việc này.
6. **Tên lớp:** `.grid` của mock trùng tiện ích Tailwind (`lib/classnames.test.ts`); `.toast` trùng `.toast` v3 không khoanh
   vùng. Đổi tên khi chép, và grep mọi tên lớp trước khi đặt.

## 3. Xem đủ bốn thời điểm trên app

App đọc đồng hồ thật (`lib/clock.ts`). Dữ liệu mẫu neo lại mỗi ngày bằng `reset_demo(demo_anchor())`.
- Muốn chụp ba thời điểm còn lại: dùng quản trị trên Supabase cục bộ (đổi lịch, đóng ngay, thêm teaser) hoặc SQL, như v3 đã
  làm để chụp ba trạng thái trang chủ.
- Chụp xong thì chạy `reset_demo` trả dữ liệu về.
- Không thêm đường tắt nào để URL đổi được thời điểm.

## 4. Kiểm

- `npm run typecheck`, `npm test`, `npm run build` sạch.
- Xem thử trên 3200 như luật agent.
- Ở 390 và 1280, bốn thời điểm × ba tab. Mở lớp nổi:
  - sheet chọn size khi thêm nhanh;
  - sheet "đã thêm";
  - nhắc mở bán bật và tắt;
  - đổi tab, và lọc hoặc sắp xếp ở tab Cửa hàng, rồi tải lại vẫn giữ.
- Không tràn ngang, 0 lỗi console. Vùng chạm đo bằng `elementFromPoint`.
- Bật giảm chuyển động thì không còn hiệu ứng.
- **So với mock** ở cùng cỡ và cùng thời điểm. Ghi mọi chỗ lệch.
- Route v3 khác (`/products`, `/cart`, `/account`, `/admin`) không đổi, trừ `theme-color` và `WaitVeil` khi chuyển sang
  route Feed.

## 5. Ảnh cần nộp

`.playwright-cli/shots/v4/lat-1a/`:
- `home-<moment>-<tab>-<w>.png` toàn trang;
- `sheet-size-<w>.png`, `sheet-added-<w>.png`, `remind-<w>.png`;
- `og.png`: ảnh chia sẻ mới;
- `mock-<moment>-<w>.png`: ảnh mock để đối chiếu.

## 6. Báo cáo

Theo hợp đồng trong định nghĩa agent, có mục **"Xung đột luật"**. Không commit.
