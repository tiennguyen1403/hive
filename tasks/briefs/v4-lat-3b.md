# Brief: v4 lát 3b, Tôi, Hồ sơ, Yêu thích, và những gì khách giữ theo tài khoản

Đợt v4 đưa Feed vào app. Kế hoạch và quyết định ở cuối `tasks/plan.md`, mục "Đợt v4 Feed", phần "Lát 3: kế hoạch". Đã có
trước lát này:
- **B9** (`f889ede`): yêu thích, nhắc mở bán, Size của tôi, công tắc thông báo lưu theo tài khoản; sửa hồ sơ. Hợp đồng ở mục 3.
- **Lát 3a** (`7530bdd`):
  - khung tài khoản Feed có menu máy tính (`components/feed/account/`, `app/styles/feed/account.css`);
  - Đăng nhập (kèm ô "Tài khoản thử"), Tạo tài khoản, Quên mật khẩu;
  - Đơn hàng, chi tiết đơn, Địa chỉ.
  - Trang v3 còn lại nằm trong route group `app/account/(v3)/`.
  - Dùng lại khung, form đăng nhập, thẻ mời đăng nhập, form tra cứu và các vé đơn của 3a, **đừng dựng lại**.
- **B10:** `Order` có đủ mốc giờ từng bước; mô hình bước ở `lib/feed-account.ts` đã đọc chúng. Hoàn tác xoá địa chỉ về đúng
  chỗ cũ.
- **Người dùng đã nhận (29/09):**
  - báo "Email này đã có tài khoản";
  - **mật khẩu chỉ cần 8 ký tự**;
  - nút tắt vẫn có icon;
  - "VD: DH-1499";
  - công tắc lúc tắt nền nhạt.
  - Không cần báo lại các mục này.

**Luật số một (QĐ-36):** giống mock Feed hoàn toàn. Luật cũ chặn thì làm theo mock và ghi "Xung đột luật". Lệch nhỏ: "phải
hoàn toàn giống với mock". Mock không vẽ trạng thái nào thì giữ chữ ngắn nhất. Bốn luật vô hình người dùng giữ: vùng chạm
46; bộ lọc trên URL; `::selection` và `caret-color`; khoảng ngày không ngắt dòng.

## 1. Màn và route

| Mock `prototype/explore/feed/` | Route app | Trạng thái mock cần xem |
|---|---|---|
| `account.html` + `me.js` | `/account` | đã đăng nhập; `?auth=out` ở 390 và 1280; `?auth=out&errors=1` ở 1280 |
| `profile.html` + `profile.js` | `/account/profile` | thường; `?errors=1`; `#size`; sheet Đổi mật khẩu (cả khi lỗi); `?auth=out` |
| `favorites.html` + `favorites.js` | `/account/wishlist` | danh sách; `?favs=none`; `?auth=out` |
| tim, "Nhắc tôi", `mySize` trong `feed.js` | mọi trang Feed | đã và chưa đăng nhập |

`/account`, `/account/profile`, `/account/wishlist` ra khỏi route group `(v3)`. `/account/password` (v3) chuyển về
`/account/profile`. `/account/notifications` giữ v3 trong `(v3)` tới lát 4. Thêm ba route trên vào `FEED_PATHS`.

Ba việc dọn từ lát 3a:
- **Không tìm thấy đơn giữ HTTP 404 thật.** `/account/orders/[code]` với mã không có, hoặc đơn của người khác, hôm nay vẽ "Không
  tìm thấy đơn DH-…" nhưng trả 200. Giữ nguyên hình và chữ đó (mock `order.js`), cùng một câu cho cả hai trường hợp (QĐ-16),
  nhưng trả mã 404, ví dụ bằng `notFound()` và `not-found.tsx` của segment. Đây là luật vô hình phiên chính giữ, không phải
  xung đột.
- **Nút X** ở ba trang đăng nhập khi không có lịch sử, và **"Đăng xuất"**, về `/account` như mock (`account.html`). Lát 3a tạm
  cho về `/` vì Tôi còn là v3.
- `/account/password` còn đòi "chữ và số". Chuyển nó về Hồ sơ như trên để một luật mật khẩu duy nhất còn chạy.

## 2. Việc cần làm

### 2.1 Trạng thái theo tài khoản, trên mọi trang Feed
- `app/layout.tsx` đọc `getMyState()` cạnh `loadMe()` và đưa xuống bằng một provider. Mỗi lần bấm cập nhật lạc quan: đổi ngay,
  gọi action của B9, nhận `state` mới; action trả lỗi thì hoàn lại và hiện toast bằng `message` của action.
- **Tim**, ở thẻ, trang sản phẩm và rail, lưu theo tài khoản, kèm màu đang xem.
  - Chưa đăng nhập: toast "Đăng nhập để lưu mẫu" có nút "Đăng nhập", đưa tới `/sign-in?next=<trang hiện tại>` (mock
    `askSignIn`).
  - Bấm lưu thì tim nảy, như mock.
- **Nhắc tôi** lưu theo tài khoản. Chưa đăng nhập: toast "Đăng nhập để bật nhắc" có "Đăng nhập". Nhãn "Nhắc tôi" và "Đã bật
  nhắc".
- **Size của tôi** thay `prefs.size`:
  - quần (`PANTS`) lấy size quần, mẫu khác lấy size áo;
  - chưa đăng nhập thì không có size nhớ (mock `mySize`);
  - trang sản phẩm và sheet chọn size mở sẵn size đó nếu còn hàng ở màu đó;
  - hàng size ghi "Size của tôi" khi size đang chọn đúng là size nhớ;
  - sheet đổi size ở giỏ vẫn không chọn sẵn.
- Danh sách trên trình duyệt (`brand.wishlist`, `brand.reminder`, `brand.prefs`) **không** nhập vào tài khoản. Màn Feed thôi
  đọc chúng. Mã v3 còn dùng thì để nguyên cho lát dọn.
- Thanh điều hướng v3 (`components/shop/SiteNav.tsx`) còn ở vài trang tới lát 4. Số đếm Yêu thích của nó phải đọc từ tài
  khoản, chưa đăng nhập thì không hiện số.

### 2.2 Tôi `/account`
- **Đã đăng nhập** (`me.js`):
  - **Đầu trang:** tên, dòng "{email} · Thành viên từ mm/yyyy", viên "Sửa hồ sơ".
  - **"Đơn hàng":** tiêu đề kèm "Xem tất cả", hoặc "Xem Cửa hàng" khi chưa có đơn. Dưới đó:
    - đơn cần khách lúc này: chờ chuyển khoản (kể cả đơn thẻ) thì thẻ tối có đồng hồ giữ hàng, "Giữ hàng tới …", các món, nút
      "Chuyển khoản" tới `#pay` của đơn; COD chờ gọi thì thẻ có chip trạng thái, "Cửa hàng gọi xác nhận trước khi giao";
    - cạnh đó là đơn đang đi (đang giao hoặc đã trả), có hành trình và mã vận đơn;
    - không có đơn đang chạy thì là đơn đã giao có hạn đổi trả gần nhất, kèm viên "Đổi trả tới dd/mm". Viên này tạm trỏ
      `/returns` như 3a;
    - còn không thì "Không có đơn đang xử lý"; chưa có đơn nào thì "Chưa có đơn nào".
  - **Bốn ô:**
    - **Yêu thích:** tối đa 4 ảnh của màu đã lưu, ảnh mẫu hết hàng có dấu "ĐÃ HẾT". Mẫu còn ≤ 3 trong lúc Số đang mở thì thêm
      dòng lửa "{TÊN} {màu} còn N". Trống: "Chưa lưu mẫu nào".
    - **Nhắc:** ô tối "Nhắc Số 06", khối ngày (ngày, "Thg mm"), dòng "{giờ} {thứ}, qua app". Chỉ "qua app" vì chưa có email
      (QĐ-35). Chưa bật: "Chưa bật nhắc". Không có Số sắp mở: "Chưa có Số mới". Ô trỏ `/account/notifications`.
    - **Size của tôi:** áo và quần, "-" khi trống, trỏ `/account/profile#size`.
    - **Giao tới:** tên và dòng địa chỉ mặc định; trống thì "Chưa có địa chỉ".
  - Cuối trang: nút "Đăng xuất".
- **Chưa đăng nhập:**
  - **Điện thoại:** thẻ tối "Tôi" có ba quyền lợi (Đơn hàng, Yêu thích, Nhắc giờ mở) và hai nút "Đăng nhập", "Tạo tài khoản";
    dưới là form tra cứu.
  - **Máy tính:** hai cột. Bên trái "Đã có tài khoản" với form đăng nhập ngay tại chỗ (nút và "Quên mật khẩu?" cùng hàng), đăng
    nhập xong ở lại Tôi. Bên phải thẻ tối "Chưa có tài khoản" kèm "Tạo tài khoản", rồi form tra cứu. Không có quyền lợi. Sai
    mật khẩu thì hiện như `?errors=1`.
  - **Phiên chính quyết:** form tại chỗ dùng đúng form của `/sign-in`, nên **có ô "Tài khoản thử"** trên form như ở 3a. Ghi
    vào báo cáo nếu bố cục hai cột vì thế lệch mock.
  - Chân trang bỏ link "Tra cứu đơn".

### 2.3 Hồ sơ `/account/profile`
- **"Thông tin":**
  - Họ và tên, Số điện thoại, Email, nút "Lưu";
  - dùng `updateProfileAction`; chữ lỗi của mock; lưu xong toast "Đã lưu hồ sơ";
  - **Email chỉ đọc** (QĐ-35): vẫn là ô trong form nhưng `readonly`, không kiểm, không có dòng "Liên kết xác nhận…";
  - tên mới hiện ngay ở chỗ khác đọc `me`.
- **"Size của tôi"** (`#size`):
  - hai hàng nút size, Áo và Quần, mỗi hàng có "Bỏ chọn";
  - chọn là lưu ngay (`setMySizeAction`), toast "Size áo: L" hoặc "Đã bỏ size áo";
  - mở bằng `#size` thì cuộn tới mục này.
- **Hàng lệnh:**
  - "Đổi mật khẩu" mở sheet: Mật khẩu hiện tại, Mật khẩu mới, Nhập lại mật khẩu mới, mỗi ô có nút hiện mật khẩu. Chữ lỗi của
    mock: "Nhập mật khẩu hiện tại", "Mật khẩu mới từ 8 ký tự", "Hai mật khẩu mới chưa khớp". Dùng action `changePassword` có
    sẵn, nới luật server cho khớp mock: bỏ "có cả chữ và số" (người dùng đã nhận); bỏ "khác mật khẩu cũ" theo mock và ghi
    "Xung đột luật". Tài khoản mẫu bị
    khoá mật khẩu (B4b) thì hiện câu của server trong sheet. Xong thì toast "Đã đổi mật khẩu".
  - "Cài đặt thông báo" trỏ `/account/notifications`.
  - "Đăng xuất".
  - "Xoá tài khoản", vô hiệu, kèm "Đang chuẩn bị".
- Chưa đăng nhập: "Đăng nhập để sửa hồ sơ".

### 2.4 Yêu thích `/account/wishlist`
- Tiêu đề "Yêu thích" kèm "N mẫu". Mỗi mẫu một thẻ (`b-fc`):
  - ảnh thẻ của màu đã lưu, hoặc hình phẳng nếu là Cố định; dấu "ĐÃ HẾT" khi hết hàng;
  - tên dẫn tới `/products/<slug>?color=<màu>`;
  - "{Màu} · {loại}", giá;
  - dòng tồn: "Còn N", lửa khi ≤ 3, "Hết màu {màu}", hoặc "Đã đóng dd/mm" khi Số đã đóng;
  - bốn nút size: size còn thì mở sheet chọn size **đúng màu và đúng size đó**; size hết thì gạch.
  - Mẫu của Số cũ không có ảnh: thẻ chỉ có chữ như mock (`b-type`).
- Tim đặc để bỏ lưu: thẻ trượt ra, toast "Đã bỏ lưu {TÊN}" có "Hoàn tác" (`unsaveFavoriteAction` rồi
  `restoreFavoriteAction`). Focus sang mẫu kế bên, như mock.
- Trống: "Chưa lưu mẫu nào" kèm "Xem Cửa hàng". Chưa đăng nhập: "Đăng nhập để xem mẫu đã lưu".
- Tab "Yêu thích" sáng; tim trên thanh máy tính trỏ trang này.

## 3. Hợp đồng B9 (đọc mã ở `lib/my-state.ts`, `lib/actions/my-state.ts`, `lib/actions/profile.ts`, `lib/db/my-state.ts`)
- `getMyState(): Promise<MyState | null>`, `React.cache`. Trả `null` khi chưa đăng nhập.
  `MyState = { favorites: Favorite[]; reminders: number[]; sizes: { top, bottom }; notify: { order, drop, wishlist, promo } }`.
  `Favorite = { productId, color, savedAt | null }`, mới nhất trước.
- Các action, mỗi cái trả `KeepResult = { ok: true, state } | { ok: false, reason, message }`:
  - `saveFavoriteAction(productId, color?)`;
  - `unsaveFavoriteAction(productId)`, trả thêm `removed`;
  - `restoreFavoriteAction(productId)`;
  - `setReminderAction(dropNo, on)`;
  - `setMySizeAction(slot, size | null)`;
  - `setNotifyAction(key, on)` (lát 4 dùng).
- `reason = "SIGNED_OUT"` mang sẵn chữ mời đăng nhập của mock.
- `updateProfileAction(prev, formData)` đọc `name`, `phone`. Chữ lỗi của mock; gọi `revalidatePath("/", "layout")`.
- **Không sửa B9.** Cần thêm gì ở server thì ghi vào báo cáo.

## 4. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch; xem thử trên 3200.
- **390 và 1280.** Dùng khách mẫu (có 4 mẫu, nhắc Số 06, L/M) và một tài khoản mới tạo (trống). Trạng thái dữ liệu mẫu không
  có thì dựng bằng SQL trên Supabase cục bộ hoặc đặt thật một đơn, rồi `reset_demo`. Cần chụp:
  - Tôi: có đơn giữ hàng; không có đơn đang chạy; tài khoản mới; chưa đăng nhập ở cả hai cỡ; sai mật khẩu ở máy tính.
  - Hồ sơ: thường; lỗi; `#size`; sheet mật khẩu, cả khi lỗi.
  - Yêu thích: có mẫu, trống, chưa đăng nhập.
  - Tim và Nhắc tôi ở trang chủ và trang sản phẩm, đã và chưa đăng nhập.
  - Trang sản phẩm mở sẵn L cho áo, M cho quần.
- **Mở lớp nổi:**
  - sheet mật khẩu;
  - sheet chọn size mở từ Yêu thích;
  - toast Hoàn tác và toast mời đăng nhập;
  - sheet "đã thêm" sau khi thêm từ Yêu thích.
- **Mới tải lại trang vẫn đúng:** lưu một mẫu, tải lại, tim vẫn đặc; đổi size, tải lại, vẫn còn.
- 0 lỗi console, không tràn ngang, vùng chạm đo bằng `elementFromPoint`.
- **So với mock** cùng cỡ, cùng trạng thái. Ghi mọi chỗ lệch.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 5. Ảnh cần nộp
`.playwright-cli/shots/v4/lat-3b/`: `<route>-<state>-<w>.png`, `mock-<page>-<state>-<w>.png`, và ảnh các lớp nổi.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, có mục **"Xung đột luật"** và danh sách mã v3 mồ côi, gửi trọn trong **tin cuối**
(agent không ghi được tệp báo cáo). Không commit.
