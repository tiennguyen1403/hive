# Brief: v4 lát 1b, Cửa hàng, trang sản phẩm, tìm kiếm, các Số

Đợt v4 đưa Feed vào app. Kế hoạch và quyết định ở cuối `tasks/plan.md`, mục "Đợt v4 Feed": QĐ-32 đến QĐ-36, 18 xung đột
người dùng đã xác nhận, lát 0 và lát 1a ĐẠT, cùng các quyết định phiên chính ghi sau lát 1a.
- Khung Feed đã có ở `components/feed/`: `FeedFrame`, `FeedChrome`, `FeedCards`, `FeedBlocks`, `FeedShop`, `QuickAdd`,
  `FeedSheet`, `FeedClock`.
- Luật cấp mẫu ở `lib/feed.ts`, dữ liệu trang chủ ở `lib/feed-home.ts`.
- Lát B6 (backend) thêm `Product.details: string[]` (chi tiết may của 10 mẫu Số 05) vào catalog. Dùng trường đó.

**Luật số một (QĐ-36):** màn phải giống mock Feed hoàn toàn. Luật cũ chặn thì làm theo mock và ghi vào "Xung đột luật".
Người dùng giữ bốn luật vô hình:
- vùng chạm đạt 46;
- bộ lọc nằm trên URL;
- `::selection` và `caret-color`;
- khoảng ngày giữ `DASH` không ngắt dòng của `lib/datetime.ts`, cả ở chỗ lát 1a đang viết " - " thường, ví dụ
  `issueFacts().run`.

## 1. Màn và route

| Mock `prototype/explore/feed/` | Route app | Ghi chú |
|---|---|---|
| `products.html` + `products.js` | `/products` | Tiêu đề "Cửa hàng". Dòng hàng theo thời điểm, "Mọi loại", sắp xếp (sheet trên điện thoại, menu trên máy tính), lưới, trạng thái trống. Dùng lại `FeedShop`. Tham số URL `line` / `family` / `sort` như tab Cửa hàng ở trang chủ. |
| `product.html` + `product.js` | `/products/[slug]` | Xem mục 2. |
| `search.html` + `search.js` | `/search` | Ô tìm; "Tìm gần đây" (`components/shop/recent-searches.ts`), "Gợi ý", "Thử tìm"; kết quả kèm số mẫu; không có kết quả thì một dòng, gợi ý và "Xem Cửa hàng"; các rail khi chưa gõ. Tìm không phân biệt dấu như mock. |
| `issue.html` + `issue.js` | `/so/[no]` | Trang một Số đã đóng: số lớn, chip trạng thái, khoảng ngày, số đã bán, các mẫu. Số 05 có ảnh; Số 03 và 04 là ô chữ kèm chấm màu (`colors` của mẫu cũ); khối "Cố định" với "Xem 8 mẫu". Số **đang mở** chuyển tới `/?line=N#cua-hang`, Số **sắp mở** tới `/#sap-mo`. Số không có thì 404. |
| `archive.html` + `archive.js` | `/so` (route mới) | "Các Số đã đóng", mới nhất trước. Khi Số 05 đã đóng thì có ảnh; Số 04 và 03 là chữ. |

Mọi route trên bật vùng Feed, dùng `FeedFrame`, và thêm vào `FEED_PATHS` (`lib/wait.ts`).

Nối lại link:
- mục "Đã đóng" ở trang chủ có "Xem tất cả" → `/so`, mỗi Số → `/so/N`;
- rail "Xem tất cả" / "Xem lại" ở trang chủ trỏ `/products?line=…`, đúng như mock trỏ `products.html?dong=…`;
- tab "Cửa hàng" ở thanh trên máy tính, khi không ở trang chủ, trỏ `/products`;
- chân trang v3 (`components/shop/SiteFooter.tsx`): "Bốn quy tắc" `/#rules` → `/faq`;
- `/?drop=N` với Số đang mở → `/?line=N#cua-hang`, với Số sắp mở → `/#sap-mo`. Có ở `SiteFooter.tsx:85` và
  `lib/reminder.ts:146`; grep thêm.

## 2. Trang sản phẩm `/products/[slug]`

Làm đúng `product.html` / `product.js` / `feed.css` của mock, ở 390 và 1280.
- **Khung story ảnh** của màu đang chọn:
  - ảnh thẻ và ảnh mặc; thanh tiến trình chia đoạn;
  - chạm nửa trái hoặc phải, vuốt, phím ←/→/Home/End; trên máy tính thêm nút "Ảnh trước" / "Ảnh sau";
  - không tự chạy.
- **Máy tính:** khung story bên trái, cột mua dính bên phải, cả khối rộng bằng rail "Cùng Số" phía dưới. Khi rộng hơn thì khối
  ra giữa, đường dẫn trang đi theo. Luật này sửa ở vòng 4, xem `feed/BRIEF.md` "Round 4".
- **Cột mua:**
  - chip Số;
  - tên (không tiền tố "S05 –", xung đột #3);
  - loại, giá;
  - "Còn N / N chiếc đã cắt";
  - ô màu kèm "Còn N";
  - hàng size kèm ghi chú, nhãn **"Size của tôi"** khi đang chọn size nhớ;
  - link "Bảng size";
  - nút mua. Trên điện thoại là thanh dính "Thêm vào giỏ · giá". Hết hàng thì ghi "Đã hết"; Số đã đóng thì ghi
    "Số 05 đã đóng" (xung đột #6).
- **Chọn sẵn size nhớ** (`prefs.size`) khi còn hàng ở màu đó, như lát 1a. Đổi màu mà hết size đó thì bỏ chọn.
- **Sheet Bảng size:**
  - áo dùng bảng số đo áo mô phỏng đang có;
  - **quần** dùng bảng số đo quần mô phỏng, **thêm vào `lib`** với đúng số của `pantsChart` trong
    `prototype/explore/shared/data.js`: quần dài và quần short, kèm vòng eo, vòng mông, dài quần, ngang đùi, hợp chiều cao.
    Người dùng đã nhận các số tham khảo này.
  - Nhãn "số đo mô phỏng" như bảng áo.
  - Link "Bảng size" hiện cho cả quần.
- **Các mục dưới:**
  - "Chi tiết" lấy từ `details`; không có dòng nào thì không hiện;
  - "Thông số": Chất liệu, Form, Hình in;
  - "Giao hàng và đổi trả": dòng "Đổi trả · 7 ngày" chính là link tới `/returns`. Chân trang của trang này bỏ link "Đổi trả
    7 ngày" để khỏi lặp; mock làm vậy bằng `data-foot-skip` theo hash;
  - rail "Cùng Số N" hoặc "Cùng dòng Cố định".
- **Đường dẫn trang:** Cửa hàng / Số 05 / TÊN.
- **Màu mở từ URL:** `?color=<key>`, cho link từ Yêu thích và thông báo. Tham số tiếng Anh.
- **Thẻ rộng ở Bảng tin** (lát 1a) nay in danh sách "Chi tiết" từ `details` như mock.

## 3. Hành vi tạm, như lát 1a

Tim dùng wishlist trên thiết bị, Nhắc tôi dùng `lib/reminder.ts`, size nhớ dùng `prefs.size`. Lát 3 chuyển sang tài khoản.

## 4. Kiểm

- `npm run typecheck`, `npm test`, `npm run build` sạch. Xem thử trên 3200 theo luật agent.
- **390 và 1280**, 0 lỗi console, không tràn ngang, vùng chạm đo bằng `elementFromPoint`.
- **Mở lớp nổi:** sheet sắp xếp, menu sắp xếp, sheet chọn size, Bảng size áo, Bảng size quần, sheet "đã thêm".
- **Trạng thái cần chụp:**
  - `/products`: lúc đang mở, và lúc Số 05 đã đóng (dựng bằng SQL trên Supabase cục bộ như lát 1a, xong thì
    `reset_demo`);
  - trang sản phẩm: KHÓI (có size nhớ), MUỐI (hết), một mẫu Cố định, ĐÁ (quần, mở Bảng size), một mẫu của Số đã đóng;
  - story đổi khung bằng phím và bằng nút;
  - `/search`: rỗng, "hoodie", không có kết quả;
  - `/so`, `/so/4`, `/so/5` lúc đã đóng, `/so/5` lúc đang mở (chuyển hướng), `/so/99` (404).
- **So với mock** cùng cỡ và cùng trạng thái. Ghi mọi chỗ lệch.
- Route v3 còn lại (`/cart`, `/checkout`, `/account`, `/admin`) không đổi, trừ link đã nối lại ở mục 1.

## 5. Ảnh cần nộp

`.playwright-cli/shots/v4/lat-1b/`:
- `<route>-<state>-<w>.png`;
- `mock-<page>-<state>-<w>.png`;
- ảnh các lớp nổi.

## 6. Báo cáo

Theo hợp đồng trong định nghĩa agent, có mục **"Xung đột luật"**. Không commit.
