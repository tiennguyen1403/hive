# Brief: v4 lát 4a, Thông báo, Tra cứu đơn, trang 404

Đợt v4 đưa Feed vào app. Kế hoạch và quyết định ở cuối `tasks/plan.md`, mục "Đợt v4 Feed". Lát 0 đến 3 cùng B6 đến B10 đã lên
demo (`465b5a6`). Lát 4 là lát cuối của phần khách:
- **4a (brief này):** Thông báo, chuông, Tra cứu đơn, 404;
- **4b:** Hỏi đáp, Bảng size, đổi trả, Giới thiệu, Liên hệ.

Trước lát này có hai lát backend. Hợp đồng của chúng ở mục 3:
- **B11:** tra đơn nói rõ chỗ sai, giới hạn số lần tra;
- **B12:** mốc "bán gần nhất" của từng màu, mốc công bố Số.

Dùng lại khung tài khoản, `MyStateProvider`, `useKeep`, `OrderSteps`, `StatusChip`, `Tile`, dòng chép và các thành phần Feed
đã có. **Đừng dựng lại.**

**Luật số một (QĐ-36):** giống mock Feed hoàn toàn. Luật cũ chặn thì làm theo mock và ghi "Xung đột luật". Lệch nhỏ: "phải
hoàn toàn giống với mock". Mock không vẽ trạng thái nào thì giữ chữ ngắn nhất. Bốn luật vô hình giữ nguyên:
- vùng chạm 46;
- bộ lọc trên URL;
- `::selection` và `caret-color`;
- khoảng ngày không ngắt dòng.

## 1. Màn và route

| Mock `prototype/explore/feed/` | Route app | Trạng thái mock cần xem |
|---|---|---|
| `notifications.html` + `notifications.js` | `/account/notifications` (ra khỏi route group `(v3)`) | có thư; `?inbox=empty`; `?auth=out`; Số sắp mở chưa bật nhắc / đã bật |
| chuông trên thanh (`feed.js`: `inbox`, `paintBell`) | mọi trang Feed | có số chưa đọc, không có số, chưa đăng nhập |
| `track.html` + `track.js` | `/track` | trống; tìm thấy (`?code=DH-1499&phone=0938571204`); mã không có; số không khớp; lỗi nhập |
| `404.html` | `app/not-found.tsx` (cả app) | một trạng thái |

Hết lát này route group `(v3)` rỗng: xoá nó.

## 2. Việc cần làm

### 2.1 Thông báo `/account/notifications`

**Hộp thư.** Mock soạn tay danh sách (`NOTIFICATIONS` trong `shared/data.js`); app dựng từ dữ liệu thật. Mỗi dòng có loại,
mốc, tiêu đề, dòng phụ và link, đúng chữ của mock:

| Loại | Tiêu đề | Dòng phụ | Mốc | Link | Khi nào có |
|---|---|---|---|---|---|
| đơn | "DH-… chờ chuyển khoản" | "Hạn HH:MM thứ … dd/mm" | lúc đặt | trang đơn | đơn chờ chuyển khoản (cả đơn thẻ) |
| đơn | "Đã nhận tiền DH-…" | — | `paidAt` | trang đơn | đơn đã trả |
| đơn | "DH-… đang giao" | "Mã vận đơn …" | `shippedAt` | trang đơn | đơn đã gửi |
| đơn | "DH-… đã giao" | "Đổi trả tới dd/mm" | `deliveredAt` | trang đơn | đơn đã giao |
| mẫu đã lưu | "{TÊN} {màu} còn N chiếc" | "Size …", các size còn | bán gần nhất của màu đó (B12), chưa bán thì lúc Số mở | trang sản phẩm `?color=` | mẫu đã lưu, màu đã lưu còn 1 đến 3, Số đang mở |
| Số | "Số 05 đã mở" | "N mẫu, N chiếc" | `opensAt` | Cửa hàng của Số đó | Số đã mở |
| Số | "Số 05 còn 2 ngày" | "Đóng HH:MM thứ … dd/mm" | 2 ngày trước `closesAt` | Cửa hàng của Số đó | tới mốc đó |
| Số | "Số 05 đã đóng" | "N/N chiếc đã bán" | `closesAt` | trang Số đó | Số đã đóng |
| Số | "Số 06 công bố: SỎI và NGÓI" | "Mở HH:MM thứ … dd/mm" | mốc công bố (B12) | `/#sap-mo` | có phần hé lộ |
| mã | "Mã DOT05 sắp hết hạn" | giờ hết hạn | theo đúng độ lệch của mock | Cửa hàng | mã đang dùng được |
| nhắc | "Số 06 mở sau 2 ngày" | giờ mở | theo đúng độ lệch của mock | `/#sap-mo` | Số khách đã bật nhắc |

- **Mốc giờ:** mốc của mã và mốc của nhắc lấy từ chính số của mock (mã hết 25/09 20:00 báo 24/09 09:00; Số mở 02/10 20:00
  nhắc 30/09 19:00). Rút thành luật, ghi cạnh mã.
- **Những gì không hiện:** chỉ hiện dòng có mốc ≤ bây giờ. Mock không có dòng cho đơn huỷ hay COD chờ gọi, nên app cũng
  không có; ghi vào báo cáo.
- **Công tắc lọc:** bốn công tắc của tài khoản (`notify` trong `MyState`) lọc thật: tắt "Đơn hàng" thì mất dòng đơn, tương tự
  với "Số mới", "Mẫu đã lưu sắp hết", "Mã sắp hết hạn". Dòng nhắc theo chính cái nhắc.
- **Đã đọc:** như mock, lưu **trên thiết bị**. Dòng mới hơn 2 ngày là chưa đọc cho tới khi mở, hoặc bấm "Đánh dấu đã đọc".
  Khoá của một dòng phải **ổn định** qua mỗi lần vẽ.
- **Nhóm:** "Hôm nay", "Tuần này", "Trước đó". Giờ ghi "HH:MM" nếu trong hôm nay, "dd/mm" nếu cũ hơn.
- **Trạng thái rỗng:** "Chưa có thông báo".

**Bên cạnh** (dưới hộp thư trên điện thoại):
- **"Nhắc mở bán":** Số sắp mở, đồng hồ "Mở sau".
  - Chưa bật thì hiện nút "Nhắc tôi" của Feed.
  - Đã bật thì là dòng công tắc kênh. **Chỉ có "Trong app"** (QĐ-35, chưa có email; bỏ dòng Email của mock). Tắt dòng này là
    tắt nhắc, toast "Đã tắt nhắc Số 06" kèm Hoàn tác, như mock tắt kênh cuối.
  - Không có Số sắp mở: "Chưa có Số mới".
- **"Nhận thông báo về"** (`#cai-dat`): bốn dòng công tắc, cả dòng là nút `role="switch"`, dùng `setNotifyAction` của B9.
- Thanh điện thoại có "Đánh dấu đã đọc" khi còn thư chưa đọc; máy tính đặt nút này cạnh tiêu đề.
- Chưa đăng nhập: "Đăng nhập để xem thông báo".

**Chuông:** số chưa đọc trên thanh Feed (và thanh v3 còn lại, nếu có) đếm **cùng danh sách** đó, theo tài khoản; chưa đăng
nhập thì không có số. Chuông thôi đọc `brand.reminder` / `brand.prefs` (việc 3b để lại). Trên 99 ghi "99+".

### 2.2 Tra cứu đơn `/track`
- Một cột giữa trang, như mock. Form: "Mã đơn" (VD: DH-1499), "Số điện thoại đặt hàng", nút "Tra cứu".
  - Lỗi nhập bằng chữ mock: "Nhập mã đơn", "Mã đơn có dạng DH-1499", "Nhập số điện thoại", "Số điện thoại gồm 10 số, bắt đầu
    bằng 0".
  - Lỗi của server (B11, người dùng chốt 30/09): "Không có đơn nào mang mã này" dưới ô mã, "Số điện thoại không khớp với đơn"
    dưới ô số.
  - Hết lượt tra: câu giới hạn của app, ở chỗ ngắn nhất.
  - Sửa một ô thì lỗi của ô đó mất.
- **Đang tra:** nút ghi "Đang tra cứu". Điện thoại có khối xám giữ chỗ; máy tính cho kết quả thế chỗ form.
- **Kết quả** (`track.js` `result`):
  - mã đơn làm tiêu đề, kèm "Tra đơn khác";
  - chip dòng hàng, bốn bước kèm giờ;
  - khối việc: chuyển khoản (số tiền và nội dung để chép, "Tài khoản … đang chuẩn bị"), COD ("Cửa hàng gọi **{số vừa gõ}**
    …"), mã vận đơn, "Đổi trả tới dd/mm", lý do huỷ;
  - "N món", "Tóm tắt" (không có khi chờ chuyển khoản);
  - "Xem trang đơn" nếu đã đăng nhập, "Đăng nhập để xem trang đơn" nếu chưa, dẫn qua đăng nhập với `next`.
  - **Không có địa chỉ.**
- Tra xong thì URL mang `code` và `phone`. Mở link có sẵn hai tham số là tra ngay. Dưới form: "Đơn hàng của bạn" nếu đã đăng
  nhập, "Có tài khoản? Đăng nhập" nếu chưa.
- Chân trang bỏ link "Tra cứu đơn". Câu cũ nhắc email ở `lib/lookup.ts` không còn màn nào dùng.

### 2.3 Trang 404
- `app/not-found.tsx` theo `404.html`:
  - tiêu đề "Không tìm thấy";
  - ba link lớn: Bảng tin (`/`), Cửa hàng (`/products`), Tra cứu đơn (`/track`), mỗi link có icon trước và mũi tên sau;
  - chân trang rút gọn, tab bar, thanh điện thoại chỉ có logo.
- Trang "Không tìm thấy đơn" của 3b giữ hình riêng của nó.

### 2.4 Còn lại
- Thêm các route vào `FEED_PATHS`. Mã v3 mồ côi để nguyên, liệt kê ở báo cáo.

## 3. Hợp đồng B11, B12

**B11** (`82857b7`), đọc mã ở `lib/order-lookup.ts`, `lib/actions/order-lookup.ts`, `lib/db/order-lookup.ts`:
- `lookupOrderAction(code: string, phone: string): Promise<LookupResult>`:
  - `{ ok: true; order: LookedUpOrder }`;
  - `{ ok: false; reason: "INVALID" | "NO_ORDER" | "PHONE_MISMATCH"; errors: { code?, phone? } }`, chữ lỗi của mock đã có
    sẵn trong `errors`;
  - `{ ok: false; reason: "RATE_LIMITED" | "UNAVAILABLE"; message }`.
- `LookedUpOrder = Pick<Order, "code" | "placedAt" | "status" | "moments" | "payment" | "lines" | "shippingFeeVnd" |
  "codFeeVnd" | "discountVnd" | "promo">`. Không có địa chỉ, số điện thoại, hãng vận chuyển. Dòng COD in số khách vừa gõ.
- **Tra từ link (phiên chính đã chốt):**
  - trang `/track` **không tra lúc render**, vì mỗi lần tra ghi một lượt vào DB, mà docs Next cấm ghi DB khi render và
    prefetch có thể render trang;
  - trang chỉ đọc `code` / `phone` trên URL rồi đưa xuống màn. Màn gọi `lookupOrderAction` **một lần khi mount**, chặn lần gọi
    đôi của StrictMode, không gọi lại khi URL đổi;
  - bấm form thì gọi action trong transition. Tra xong ghi URL bằng `window.history.replaceState`, không dùng `router.replace`.
- **Nới kiểu tham số:** mấy hàm đang nhận `Order` nhưng chỉ đọc trường có trong DTO phải nhận `Pick<Order, …>`, để dùng lại cho
  đơn tra được:
  - `orderSteps`, `returnUntil`, `canReturn` (`lib/feed-account.ts`);
  - `confirmTransfer`, `confirmRows` (`lib/feed-order.ts`);
  - `orderSubtotalVnd`, `orderUnits`, `orderTotalVnd` (`lib/orders.ts`);
  - `OrderSteps` (`components/feed/account/OrderBits.tsx`).
  - `effectiveOrder` đã nhận DTO.
- Dọn lượt tra sau khi kiểm: `npx supabase db query --local "delete from public.rate_hits where bucket = 'lookup';"`
  (`reset_demo` không xoá).

**B12** (`e64da12`):
- `Product.lastSoldAt?: Partial<Record<ColorKey, string | null>>`. Đọc bằng `lastSoldAtOf(product, color): string | null`
  (`lib/inventory.ts`). Đây là mốc đặt của đơn gần nhất còn hiệu lực có màu đó. Dòng "{TÊN} {màu} còn N chiếc" lấy
  `lastSoldAtOf(p, color) ?? opensAt của Số`.
- `Teaser.announcedAt: string | null`. **Mỗi Số một dòng "công bố"**, mốc là `announcedAt` sớm nhất trong các hé lộ của Số
  đó; tiêu đề liệt kê tên mọi hé lộ ("Số 06 công bố: SỎI và NGÓI"). Không có mốc thì không có dòng.
- Mọi mốc là chuỗi ISO `+07:00`.

## 4. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch; xem thử trên 3200.
- **390 và 1280**, khách mẫu và lúc chưa đăng nhập. Trạng thái dữ liệu mẫu không có thì dựng bằng SQL trên Supabase cục bộ,
  rồi `reset_demo`.
  - Thông báo: có thư đủ các loại; tắt từng công tắc thì dòng loại đó mất; "Đánh dấu đã đọc"; mở một dòng; nhắc chưa bật, đã
    bật, tắt kèm Hoàn tác; hộp thư rỗng; chưa đăng nhập.
  - Chuông khớp số chưa đọc trên mọi trang.
  - Tra cứu: trống; tìm thấy ở từng trạng thái đơn; mã không có; số sai; lỗi nhập; hết lượt; mở từ link; "Tra đơn khác".
  - 404: một route không có.
- **Mở lớp nổi:** toast Hoàn tác nhắc.
- 0 lỗi console (trừ dòng 404 cố ý), không tràn ngang, vùng chạm đo bằng `elementFromPoint`.
- **So với mock** cùng cỡ, cùng trạng thái. Ghi mọi chỗ lệch.
- Xong thì `select public.reset_demo(public.demo_anchor());`, và xoá lượt tra đã dùng khi kiểm.

## 5. Ảnh cần nộp
`.playwright-cli/shots/v4/lat-4a/`: `<route>-<state>-<w>.png`, `mock-<page>-<state>-<w>.png`, và ảnh lớp nổi.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, có mục **"Xung đột luật"** và danh sách mã v3 mồ côi, gửi trọn trong **tin cuối**.
Không commit.
