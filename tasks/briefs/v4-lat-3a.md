# Brief: v4 lát 3a, đăng nhập, đơn hàng, chi tiết đơn, địa chỉ

Đợt v4 đưa Feed vào app. Kế hoạch và quyết định ở cuối `tasks/plan.md`, mục "Đợt v4 Feed". Lát 0, 1a, 1b, 2 và B6, B7, B8
đã lên demo ngày 29/09 (`e6b128c`). Lát 3 chia hai:
- **3a (brief này):** các màn chỉ dùng backend đã có;
- **3b:** Tôi, Hồ sơ, Yêu thích, cùng tim, Nhắc tôi và size nhớ lưu theo tài khoản, dùng lát backend B9 (xong trước lát
  này). **Lát 3a không đụng** `lib/wishlist.ts`, `lib/reminder.ts`, `lib/prefs.ts`, `supabase/`, `lib/db/`, và các action
  B9 thêm.

**Luật số một (QĐ-36):** giống mock Feed hoàn toàn. Luật cũ chặn thì làm theo mock và ghi "Xung đột luật". Với lệch nhỏ
người dùng đã nói: **"phải hoàn toàn giống với mock"**. Chỉ khi mock không vẽ một trạng thái thì mới giữ chữ ngắn nhất của
app. Bốn luật vô hình người dùng giữ:
- vùng chạm 46;
- bộ lọc trên URL;
- `::selection` và `caret-color`;
- khoảng ngày không ngắt dòng (`lib/feed-range.ts`).

## 1. Màn và route

| Mock `prototype/explore/feed/` | Route app | Trạng thái mock cần xem |
|---|---|---|
| `sign-in.html` + `sign-in.js` (chế độ `in`) | `/sign-in` | thường; `?errors=1` |
| `sign-in.html?mode=up` | `/sign-up` | thường; `?mode=up&errors=1` |
| `sign-in.html?mode=forgot` | `/forgot-password` | thường; `?mode=forgot&errors=1`; đã gửi (bấm nút) |
| `orders.html` + `orders.js` | `/account/orders` | tất cả; `?phase=active`; `?group=so-05`; tổ hợp không có đơn; `?orders=none`; `?auth=out` |
| `order.html` + `order.js` | `/account/orders/[code]` | chờ chuyển khoản, COD chờ gọi, đang giao, đã giao, đã huỷ; mã không có; `?auth=out` |
| `addresses.html` + `addresses.js` | `/account/addresses` | danh sách; `?add=1`; `?add=1&errors=1`; `?edit=a2`; `?auth=out` |

Dùng chung: `account.js` (`ACC.*`: `ticket`, `steps`, `tile`, `statusChip`, `signedOut`, `lookupForm`, `signInForm`,
`si*`), `account.css`, `flow.css`, `feed.css`, và phần khung trong `feed.js` (`ACC_NAV`, `ACC_OF`, `accMenu`, `askSignIn`,
thanh điện thoại `data-title`, `data-back`, `data-close`). Dữ liệu là của app: `listMyOrders`, `cancelOrderAction`, sổ địa
chỉ (`lib/actions/addresses.ts`), `signIn`, `signUp`, `demoSignIn`, `demoAdminSignIn`, `effectiveStatus`, `lib/cart.ts`.

## 2. Việc cần làm

### 2.1 Khung tài khoản
- `acc-layout` như mock: trên máy tính có menu `acc-nav` (Tôi, Đơn hàng, Yêu thích, Thông báo, Địa chỉ, Hồ sơ, rồi Đăng xuất
  khi đã đăng nhập), trỏ route app. Chân trang rút gọn. Tab "Tôi" sáng.
- Thanh điện thoại: nút lùi (Đơn hàng, Địa chỉ về `/account`; chi tiết đơn về `/account/orders`), tiêu đề hiện khi tiêu đề
  trang cuộn khuất (`revealTitleOn`).
- Hôm nay `app/account/layout.tsx` bọc mọi trang `/account/*` trong khung v3. Tách sao cho route Feed dùng khung Feed, còn
  `/account`, `/account/profile`, `/account/wishlist`, `/account/password`, `/account/notifications` **giữ nguyên v3** tới
  lát của chúng, ví dụ bằng route group; URL không đổi.
- **Chưa đăng nhập: vẽ tại chỗ, không chuyển sang `/sign-in`**, như mock. Đơn hàng: "Đăng nhập để xem đơn" kèm form tra cứu.
  Chi tiết đơn: "Đăng nhập để xem đơn DH-…" kèm tra cứu điền sẵn mã. Địa chỉ: "Đăng nhập để lưu địa chỉ". Dùng thẻ tối
  không kèm quyền lợi, trên máy tính thành băng ngang (`account.css`). Nút đăng nhập mang `next` về đúng trang. Trang nào có
  form tra cứu thì chân trang bỏ link "Tra cứu đơn".
- Form tra cứu gửi tới `/track?code=…&phone=…` (trang v3 tới lát 4), kiểm bằng chữ của mock.

### 2.2 Đăng nhập, Tạo tài khoản, Quên mật khẩu
- Ba route giữ nguyên, mỗi route là một chế độ của `sign-in.html`. Link chuyển chế độ giữ `next`. Đăng nhập xong về `next`
  (`safeNext`), mặc định `/account`.
- Điện thoại: thanh có nút đóng X (`data-close="x"`), không chân trang, không tab bar. Máy tính: form bên trái, ảnh SƯƠNG đen
  mặc bên phải (`si-art`; app có `public/shots/suong-black-look.webp`).
- Ô mật khẩu có nút hiện/ẩn. Nút "Tiếp tục với Google" vô hiệu, kèm nhãn "Đang chuẩn bị".
- **Luật và chữ lỗi của mock** (`SI_RULES`):
  - "Nhập họ và tên";
  - "Nhập email", "Email chưa đúng";
  - "Nhập mật khẩu" khi đăng nhập, "Mật khẩu từ 8 ký tự" khi tạo tài khoản.
  - Đăng nhập sai: dòng "Email hoặc mật khẩu chưa đúng" trên form, xoá ô mật khẩu, giữ email.
  - Tạo tài khoản với email đã có: "Email này đã có tài khoản" dưới ô email, như mock. Việc này trái QĐ-15 (không tiết lộ
    email nào đã đăng ký); làm theo mock và ghi ở "Xung đột luật".
  - Server bỏ luật "có cả chữ và số" cho khớp mock (Supabase vẫn đòi 8 ký tự); ghi "Xung đột luật".
  - Bỏ ô "báo khi mở Số mới" của form v3, vì mock không có. Tiền lệ: người dùng đã bỏ các tính năng v3 mà Feed không có (lát 2).
  - Giới hạn tần suất và lỗi máy chủ giữ chữ của app, hiện ở cùng chỗ với dòng lỗi đăng nhập sai.
- **Ô tài khoản thử (người dùng chọn 29/09).** Chỉ ở chế độ Đăng nhập, nằm **trên form**:
  - nền xám Feed (`--f-bg2`), bo như thẻ lựa chọn;
  - tiêu đề "Tài khoản thử";
  - dòng email khách mẫu, dòng "Quản trị: " kèm email quản trị, dòng "Mật khẩu: " kèm mật khẩu, lấy từ môi trường như
    `app/sign-in/page.tsx` đang làm;
  - hai nút viền tròn "Đăng nhập thử" và "Vào quản trị thử", dùng action `demoSignIn` / `demoAdminSignIn`;
  - không có tài khoản thử trong môi trường thì không có ô.
- **Quên mật khẩu (QĐ-35, chưa có email; giữ cách app đang chạy: không gọi server).**
  - Form như mock: "Email đã đăng ký", nút "Gửi liên kết".
  - Bấm hợp lệ thì hiện khối `si-sent`, **không** có dấu tích và **không** có "Gửi lại". Một dòng: "Chưa gửi được liên kết
    đặt lại mật khẩu tới **{email}**. Tính năng này đang chuẩn bị." Dưới là nút "Về đăng nhập".
  - Ghi ở "Xung đột luật" là lệch mock có chủ ý.

### 2.3 Đơn hàng `/account/orders`
- Một danh sách, mới nhất trước. Mỗi đơn là một vé (`ACC.ticket`):
  - trên cùng: dòng hàng (các Số, rồi Cố định);
  - mã đơn chữ hiển thị, tổng tiền;
  - chip trạng thái kèm ghi chú: giữ hàng đếm ngược, mã vận đơn, lý do huỷ, "Đổi trả tới **dd/mm**";
  - ô ảnh các món, ngày đặt.
- Hai bộ lọc trên URL:
  - `?phase=active|delivered|cancelled`: "Tất cả", "Đang xử lý", "Đã giao", "Đã huỷ";
  - `?group=so-05|…|co-dinh`: "Mọi dòng hàng" cùng các dòng mà đơn của khách có.
  - Vé bỏ dòng hàng đang lọc.
  - Tổ hợp không có đơn: "Không có đơn đang xử lý ở Số 05" kèm nút "Bỏ lọc".
  - Đọc kết quả cho trình đọc màn hình.
  - Chip đang chọn nằm ngoài mép thì cuộn vào.
- Chưa có đơn: "Chưa có đơn nào" kèm "Xem Cửa hàng". Link `?tab=` cũ của v3 thì đọc sang `phase` nếu khớp.
- Trạng thái lấy từ `effectiveStatus`: đơn quá hạn chuyển khoản đọc thành huỷ. Lý do mock có tên thì dùng chữ mock: "Bạn đã
  huỷ", "Quá hạn chuyển khoản". Lý do khác, ví dụ cửa hàng huỷ, giữ chữ app.

### 2.4 Chi tiết đơn `/account/orders/[code]`
- Đầu trang: mã đơn và chip dòng hàng. Hành trình bốn bước dạng thanh story: Đặt hàng, Thanh toán (COD: Xác nhận), Gửi hàng,
  Đã giao. Đơn huỷ: Đặt hàng, Đã huỷ, rồi hai bước tắt. COD đang chờ gọi thì bước "Xác nhận" là bước hiện tại.
- Dưới hành trình **chỉ** là việc khách làm được lúc đó:
  - **chờ chuyển khoản (cả đơn thẻ):**
    - đồng hồ giữ hàng lớn;
    - "Giữ hàng tới **…**. Quá giờ, đơn tự huỷ và N chiếc về kệ.";
    - dòng chép "Số tiền" và "Nội dung" (`DH2432`, không gạch);
    - "Tài khoản": "Số tài khoản và tên ngân hàng đang chuẩn bị";
    - ô QR "Hiện khi có tài khoản ngân hàng thật";
    - nút "Huỷ đơn".
  - **COD chờ gọi:** "Cửa hàng gọi **{số của đơn}** để xác nhận trước khi giao." và "Huỷ đơn".
  - **đang giao:** dòng chép "Mã vận đơn".
  - **đã giao:**
    - "Đổi trả tới dd/mm" khi còn hạn. Luồng yêu cầu đổi trả làm sau vòng mock quản trị (QĐ-34), nên nút này tạm trỏ
      `/returns`; ghi ở báo cáo;
    - "Mua lại" cho các món còn bán.
  - **đã huỷ:** "{lý do}. Hàng đã về kệ." và "Mua lại".
  - Đơn đã trả, chờ gửi: không có khối việc nào.
- Rồi đến "N món", "Tóm tắt" (các dòng tiền như lúc trả, "Mã …"), "Giao tới" (Người nhận, Địa chỉ, Cách giao, Thanh toán).
  Máy tính hai cột như mock.
- **Huỷ đơn:**
  - sheet "Huỷ đơn DH-…?" với dòng "N chiếc về kệ ngay, không hoàn tác.";
  - hai nút: "Giữ đơn" (xanh, nhận focus) và "Huỷ đơn" (viền);
  - dùng `cancelOrderAction`;
  - xong thì toast "Đã huỷ DH-…" và focus về mã đơn.
- **Mua lại:** thêm vào giỏ các món còn bán, đúng màu, size và số lượng, kẹp theo tồn; rồi sang `/cart`.
- Mã không có hoặc không phải của mình: "Không tìm thấy đơn DH-…" kèm "Xem đơn hàng" và "Tra cứu đơn".
- `/account/orders/[code]/tracking` (v3) chuyển về `/account/orders/[code]`.

### 2.5 Địa chỉ `/account/addresses`
- Thẻ địa chỉ, mặc định lên đầu và có viền: tên (Nhà, Công ty, Khác), chip "Mặc định", người nhận và số, dòng địa chỉ. Ba nút
  viên thuốc: "Sửa", "Đặt mặc định", "Xoá".
- **Thêm và sửa bằng sheet:**
  - chip tên địa chỉ;
  - Người nhận, Số điện thoại; địa chỉ mới điền sẵn tên và số của tài khoản;
  - bộ chọn Tỉnh / thành và Phường / xã có ô tìm (dùng lại bộ chọn của thanh toán);
  - Số nhà, đường;
  - công tắc "Đặt làm mặc định" (tắt được trừ khi đang là mặc định);
  - nút "Lưu địa chỉ";
  - lỗi theo từng ô bằng chữ mock.
- **Toast:** "Đã thêm địa chỉ", "Đã lưu địa chỉ", "{Tên} là địa chỉ mặc định".
- **Xoá:** toast "Đã xoá {Tên}" có "Hoàn tác". Hoàn tác trả địa chỉ đó, kể cả vai mặc định.
- **Trống:** "Chưa có địa chỉ" và nút "Thêm địa chỉ".
- **Tham số:** `?add=1` mở sheet thêm, `?edit=<id>` mở sheet sửa. `/account/addresses/new` chuyển tới `?add=1`.
- **Lỗi:** thao tác địa chỉ hỏng thì phải báo bằng toast, chữ ngắn nhất. Tồn từ trước là "vài thao tác địa chỉ lỗi im lặng".

### 2.6 Còn lại
- Thêm các route Feed vào `FEED_PATHS` (`lib/wait.ts`). Tiêu đề tab theo cách các trang Feed đang đặt.
- Mã v3 mồ côi của các màn này **để nguyên**, liệt kê ở báo cáo; lát dọn cuối đợt xoá.
- Link nội bộ đang trỏ các route này vẫn đúng. Grep link `/account/orders?tab=` và `/account/addresses/new`.

## 3. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch; xem thử trên 3200.
- **390 và 1280**, dùng khách mẫu (có đơn ở nhiều trạng thái) và lúc chưa đăng nhập. Trạng thái nào dữ liệu mẫu không có thì
  dựng bằng SQL trên Supabase cục bộ rồi `reset_demo`.
  - `/sign-in` thường, sai mật khẩu, bấm "Đăng nhập thử"; `/sign-up` thường và lỗi; `/forgot-password` thường, lỗi, đã bấm.
  - `/account/orders`: tất cả, một bộ lọc trạng thái, một bộ lọc dòng hàng, tổ hợp rỗng, chưa đăng nhập.
  - `/account/orders/[code]`: mỗi trạng thái ở mục 2.4, mã không có, chưa đăng nhập.
  - `/account/addresses`: danh sách, trống, chưa đăng nhập.
- **Mở lớp nổi:** sheet huỷ đơn (rồi huỷ thật một đơn), sheet thêm địa chỉ (cả khi lỗi), sheet sửa, hai bộ chọn, toast Hoàn
  tác sau Xoá, nút hiện mật khẩu.
- 0 lỗi console, không tràn ngang, vùng chạm đo bằng `elementFromPoint`.
- **So với mock** cùng cỡ, cùng trạng thái. Ghi mọi chỗ lệch.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 4. Ảnh cần nộp
`.playwright-cli/shots/v4/lat-3a/`: `<route>-<state>-<w>.png`, `mock-<page>-<state>-<w>.png`, và ảnh các lớp nổi.

## 5. Báo cáo
Theo hợp đồng trong định nghĩa agent, có mục **"Xung đột luật"**, gửi trọn trong **tin cuối** (agent không ghi được tệp báo
cáo). Không commit.
