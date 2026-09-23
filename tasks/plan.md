# Kế hoạch dựng frontend — khoi-store

Ngày lập: 2026-09-20. Trạng thái: **XONG — 6/6 phase, chốt kiểm 6 ĐẠT 2026-09-20**.

## Bối cảnh

Bản mock HTML trong `prototype/` đã xong và được duyệt: 48 màn, ~830 dòng CSS đã
đo tương phản bằng tay, 1.674 dòng `app.js` nối DOM. Việc bây giờ là chuyển nó
thành ứng dụng Next.js thật, chạy bằng dữ liệu fixture gõ kiểu. Backend để sau.

Repo gốc đã có `package.json` (Next 16.3.5, React 19.3, Tailwind 4.3, TS 7.0.2),
`next.config.mjs`, `postcss.config.mjs`, `tsconfig.json` — nhưng **chưa có một
dòng `app/` nào**. Đây là lượt đầu tiên viết code triển khai.

## Ba điều khảo sát làm thay đổi kế hoạch

**1. 48 màn KHÔNG phải 48 route — chỉ khoảng 33.**
Rất nhiều "màn" là *trạng thái* của cùng một route, không phải route riêng:

| Một route | Các màn trong prototype |
|---|---|
| `/` | `trang-chu` · `dot-sap-mo` · `dot-da-dong` · `trang-chu-pc` |
| `/gio-hang` | `gio-hang` · `gio-hang-loi` · `gio-hang-rong` |
| `/san-pham/[slug]` | `san-pham` · `san-pham-het` · `san-pham-pc` |
| `/tim-kiem` | `tim-kiem` · `tim-kiem-rong` |
| `/tai-khoan/yeu-thich` | `yeu-thich` · `yeu-thich-rong` |

Và 3 màn **không bao giờ thành route**: `the-san-pham`, `qt-bang`, `qt-nut-loc`
— đó là trang đặc tả hệ thiết kế, thuộc về một khu nội bộ, không thuộc sản phẩm.
3 sheet (`bo-loc`, `chon-size`, `bang-size`) là *component*, không phải trang.

**2. Dữ liệu đơn hàng / khách hàng / khuyến mãi CHƯA TỒN TẠI dưới dạng dữ liệu.**
Chỉ có `CATALOG` (21 mẫu) là dữ liệu thật sự. Đơn, khách, mã giảm giá hiện nằm
rải rác dưới dạng markup sinh tại chỗ trong `screens4.py` (`KHACH` là 8 cặp tên,
`TRANGTHAI` là 5 nhãn, mã đơn `DH-2419` gõ tay từng chỗ). Seed data vì thế là
**việc dựng mới**, không phải việc chép sang.

**3. Hai lỗi dữ liệu phải sửa ngay ở bước seed, không để muộn hơn.**
- `CATALOG` có **khoá trùng**: `bui`, `nang`, `suong` dùng lại cho đợt 3 (BÃO, MEN,
  VÔI). Hiện vô hại vì khoá chỉ dùng để chọn ảnh, nhưng làm `id` thì vỡ.
- Tồn kho đang là **size-only** (`{S:5, M:6, L:4, XL:2}`), trong khi sheet cho phép
  đổi màu. Tách thành **size × màu** phải làm trước khi 33 route đọc nó — sau đó
  thì đắt gấp nhiều lần.

## Next.js 16 khác với những gì tôi biết

`AGENTS.md` cảnh báo đúng. Đã đọc `node_modules/next/dist/docs/`; những điểm
chạm vào build này:

| Thay đổi | Ảnh hưởng |
|---|---|
| `params` / `searchParams` **là Promise** — truy cập đồng bộ đã bị bỏ hẳn | mọi page động: `const { slug } = await props.params` |
| `next typegen` sinh `PageProps<'/san-pham/[slug]'>` toàn cục | dùng thay vì tự gõ type props |
| `images.domains` **deprecated** → phải dùng `images.remotePatterns` | ảnh Unsplash không load nếu thiếu |
| Turbopack là mặc định | không cần cấu hình; webpack config sẽ bị bỏ qua |
| `next lint` **đã bị gỡ** | lint phải qua ESLint flat config, chạy trực tiếp |
| `middleware` đổi tên thành `proxy` | chưa dùng, nhưng đừng tạo `middleware.ts` |

Quy tắc suốt build: **đọc trang docs tương ứng trước mỗi quyết định API**, không
viết theo trí nhớ.

## Quyết định kiến trúc

**QĐ-1 — Giữ nguyên CSS đã đo, không viết lại thành Tailwind utility.**
830 dòng CSS kia mang theo những con số đã *tính bằng tay*: tương phản WCAG từ
`contrast.py`, bảng ink `--il`/`--ir` đo bằng `getBBox()`, viewBox cắt sát của
dấu tích. Gõ lại thành `class="flex items-center gap-2 ..."` sẽ vứt bỏ phần chú
giải giải thích vì sao mỗi con số là con số đó, và mời gọi trôi dạt. Thay vào đó:
tầng token (`--fill`, `--line`, `--bd`...) lên `@theme` của Tailwind 4 để utility
tồn tại; CSS component giữ nguyên trong `app/he/*.css`. Tailwind dùng cho bố cục,
không dùng để tái tạo thứ đã đúng.

**QĐ-2 — Không thêm shadcn/ui.**
Kế hoạch ban đầu có shadcn, nhưng prototype đã tự dựng dropdown, data table,
sheet, size picker — và chúng đã được duyệt. Thêm shadcn bây giờ là hai hệ song
song. Port chính các component của prototype.

**QĐ-3 — Icon: port Iconsax, không dùng `lucide-react`.**
`package.json` có `lucide-react` nhưng prototype chạy bằng path Iconsax kèm bảng
ink đã đo (`INK`, `INK_DUO`, 64 mục). Bộ icon khác nhau thì hình khác nhau. Port
sang một component `<Icon>` gõ kiểu, mang theo `--il`/`--ir`. Gỡ `lucide-react`.

**QĐ-4 — `app.js` được VIẾT LẠI, không port.**
1.674 dòng đó là thao tác DOM mệnh lệnh (`querySelector`, `classList.add`). Trong
React nó trở thành state và props. Đây là chi phí ẩn lớn nhất của cả dự án — kế
hoạch dành hẳn Phase 2 cho nó thay vì giả vờ nó là việc chép.

**QĐ-5 — Trạng thái client: React Context + `localStorage`.**
Giỏ hàng, yêu thích, "đã đăng nhập" cần sống qua điều hướng mà không có backend.
Ba context nhỏ, không thêm thư viện state.

## Danh sách việc

### Phase 0 — Nền · XONG 2026-09-20
- [x] T1 — Khung app: `app/layout.tsx`, `globals.css`, font, `remotePatterns`, `next typegen`
- [x] T2 — Tầng token: CSS variable của prototype lên `@theme` Tailwind 4
- [x] T3 — Port CSS hệ thiết kế sang **`app/styles/`** (chia theo nhóm, giữ nguyên chú
      giải). Thư mục đổi tên từ `app/he/` ở T3b theo QĐ-6; `interaction.css` là mảnh
      port muộn — nửa dưới `shell.css` (QĐ-13).

**Chốt kiểm 0 — ĐẠT.** `npm run build` sạch; font + màu nền đúng.

### Phase 1 — Dữ liệu · XONG 2026-09-20
Tên gõ bằng tiếng Anh theo QĐ-6 — bảng dưới ghi cả tên đã chốt.
- [x] T4 — `data/types.ts`: `Product`, `Color`, `Size`, `Drop`, `Order`, `Customer`,
      `Promotion` (+ id có nhãn: `ProductId`, `OrderCode`, `PromoCode`…)
- [x] T5 — `data/catalog.ts`: 21 mẫu, **id duy nhất**, tồn kho **size × màu** (`Stock`)
- [x] T6 — `data/orders.ts` + `data/customers.ts` + `data/promotions.ts`: dựng mới, gõ kiểu
- [x] T7 — `data/regions.ts` + `data/wards.json`: Tỉnh/Phường (đủ cho form địa chỉ)
- [x] T8 — `lib/`: `money.ts`, `inventory.ts`, `drop.ts`, số liệu đợt suy ra từ catalog

**Chốt kiểm 1 — ĐẠT.** `tsc --noEmit` sạch; doanh thu đợt 5 khớp prototype.

### Phase 2 — Primitive · XONG 2026-09-20
- [x] T9 — `<Icon>` + bảng ink Iconsax + `<Tick>` viewBox cắt sát
- [x] T10 — `<Button>` `<Chip>` `<Badge>` `<Field>` `<Select>` (dropdown của hệ)
- [x] T11 — `<Sheet>` (lớp nền, thứ tự Esc, khoá cuộn) + `SizeSheet` / `FilterSheet` / `SizeChartSheet`
- [x] T12 — `<ProductCard>` + băng ảnh vuốt theo màu (dot, "còn N", "hết XL")
- [x] T13 — `<DataTable>` (TanStack Table **v9** — QĐ-7: lọc, sắp, chọn dòng, cột, phân trang)

**Chốt kiểm 2 — ĐẠT.** Khu `/system` (tên tiếng Anh theo QĐ-6) dựng lại 3 màn đặc tả
`qt-bang` · `qt-nut-loc` · `the-san-pham`; đã so ảnh với prototype.

### Phase 3 — Luồng mua (đường tiền) — XONG 2026-09-20
- [x] T14 — `/` ba trạng thái đợt + biến thể desktop
- [x] T15 — `/products` + sheet lọc · `/search` + rỗng
- [x] T16 — `/products/[slug]` (`await params`) + hết hàng + desktop
- [x] T17 — `/cart` ba trạng thái + context giỏ
- [x] T18 — `/checkout` → `/order-confirmed`

**Chốt kiểm 3 — ĐẠT.** Đi trọn `/` → xác nhận đơn trong viewport 390px thật,
tràn ngang 0 ở mọi chặng. Số đo đầy đủ trong `tasks/todo.md`.

### Phase 4 — Tài khoản — XONG 2026-09-20
- [x] T19 — `/sign-in` `/sign-up` `/forgot-password` (+ đã gửi)
- [x] T20 — `/account` · `/account/profile` · `/account/password`
- [x] T21 — `/account/orders` + `[code]` + đã huỷ + `/tracking`
- [x] T22 — `/account/addresses` + `/new` · `/account/wishlist` + rỗng

**Chốt kiểm 4 — ĐẠT.** 277 điều khiển trên 19 route đều ≥ 44px (đo hit area ở
390px thật); bàn phím đi hết 9 route, không bẫy tiêu điểm. Số đo trong
`tasks/todo.md`.

### Phase 5 — Quản trị · XONG 2026-09-20
URL tiếng Anh theo QĐ-6: `/admin/**`, không phải `/qt/**`.
- [x] T23 — Khung `/admin` (sidebar, topbar) + `/admin` tổng quan
- [x] T24 — `/admin/drops` · `/admin/promotions`
- [x] T25 — `/admin/products` + `/new` + `/[id]`
- [x] T26 — `/admin/orders` + `/[code]` · `/admin/customers` + `/[id]`

**Chốt kiểm 5 — ĐẠT.** Nhãn "dữ liệu mô phỏng" nằm trong `AdminTop` như một phần
cấu trúc, không phải prop, nên không màn nào tắt được nó. Mọi con số **suy ra** từ
fixture qua `lib/admin-metrics.ts` + `lib/admin-rows.ts` (47 test), không gõ tay.

### Phase 6 — Còn lại & soát · XONG 2026-09-20
- [x] T27 — `not-found.tsx` + 4 trang nội dung (xem Câu hỏi mở #4) + `SiteFooter` mới
      để chúng **đến được** — bản mock không có chân trang cho khách
- [x] T28 — Soát a11y + so ảnh toàn bộ với prototype, sửa một lượt
- [x] T29 — Viết `DESIGN.md` từ code đã dựng

**Chốt kiểm 6 — ĐẠT 2026-09-20.** `npm run build` sạch · `tsc --noEmit` sạch ·
**526 test** xanh · **35 route** render (33 của sản phẩm + `/system` + `/hyd`) ·
máy dò layout trả `[]` · 0 phần tử dưới AA và 0 điều khiển dưới 44px trên toàn bộ
route cửa hàng.

**Soát bổ sung sau chốt kiểm** — người dùng chỉ ra rằng mọi đợt soát trước chỉ
chụp trang lúc **đóng**. Mở từng lớp nổi ra thì thấy: dropdown của mọi bảng quản
trị chưa từng được tạo kiểu, hai lỗi nữa bên cửa hàng. Xem `tasks/todo.md`, mục
"Sửa sau khi người dùng chỉ ra".

## QĐ-8 — Bộ lọc sống trong URL, không sống trong state *(Phase 3)*

`/products` và `/search` đọc mọi điều kiện lọc từ `searchParams` trên **server**.
Cái giá phải trả là hai route này thành dynamic; cái nhận lại là một trang đã lọc
trở thành một **liên kết gửi được**, Back quay về đúng bộ lọc cũ, và tải lại
trang không mất gì. Bộ lọc giữ trong state component là bộ lọc biến mất khi F5.

Sheet lọc thì ngược lại: nó sửa một **bản nháp** và chỉ ghi vào URL khi bấm Áp
dụng. Đẩy URL theo từng chip sẽ nhét cả chục mục vào lịch sử cho một quyết định.

Mọi giá trị đọc từ URL đều **đối chiếu với danh sách hợp lệ** rồi mới dùng —
`?fit=SLIM` bị bỏ, không lọt xuống dưới.

## QĐ-9 — Giỏ hàng: quy tắc là hàm thuần, React chỉ là lớp vỏ

`lib/cart.ts` không chạm `window`, `localStorage` hay React. `CartProvider` chỉ
đọc một lần lúc mount, ghi mỗi lần đổi, và nghe sự kiện `storage` cho tab khác.
Tách vậy mới test được quy tắc, và mới ngăn hai component mỗi bên hiểu "thêm vào
giỏ" một kiểu.

Dòng giỏ chỉ lưu **cái gì**, không lưu **lúc đó trông ra sao**. Giá, ảnh, số còn
lại tra lại từ catalog mỗi lần render — đợt bán hết trong khi giỏ còn mở, nên một
giỏ nhớ "890.000₫, còn 2" là một giỏ nói dối trong vòng một tiếng.

`resolveCart(now, cart)` nhận mốc thời gian làm tham số chứ không tự gọi
`new Date()`: mua được hay không phụ thuộc đồng hồ (đợt đã đóng), và truyền vào
mới test được thay vì "đúng cho tới thứ Ba tuần sau".

Kho lưu có **số phiên bản**. Đây không phải nghi thức: tồn kho đã đổi sang
colour-major ở Phase 1, nên giỏ do bản cũ ghi ra không có màu trên từng dòng.
Hồi sinh nó nghĩa là code tự chọn màu hộ người mua. Payload không phải `v: 1`
thì bỏ cả cụm.

## QĐ-10 — `family` là một trường, không phải thứ suy ra từ `kind`

`kind` là mô tả đầy đủ in trên thẻ ("Áo hoodie in", "Áo thun tay lỡ"). Đợt đang
mở có **10 kind khác nhau**, bốn cái chỉ khác nhau ở kiểu cắt — nên `kind` là thứ
sai để nhóm hay để lọc.

Đã thử suy ra bằng cách lấy hai từ đầu của `kind`. Sai: "Áo sơ mi dệt" thành
"áo sơ". Một cách **phân loại** thì phải được lưu, không thể đoán từ một câu mô tả.

Sáu họ: TEE · HOODIE · JACKET · VEST · SHIRT · PANTS. Ràng buộc mà test giữ: nhãn
của mỗi họ phải là **tiền tố** của mọi `kind` trong họ đó — đó chính là lý do chip
gợi ý tìm theo nhãn thì ra kết quả. Ràng buộc ấy đã lập tức bắt được "Áo gile" bị
xếp nhầm vào "Áo khoác".

## QĐ-11 — Bản desktop là một breakpoint, dựng lại từ hai comp đã duyệt

Prototype không có breakpoint nào — một bản mock tĩnh thì không thể có. Nó vẽ
`trang-chu-pc` và `san-pham-pc` thành hai màn riêng. `app/styles/desktop.css` là
hai màn ấy gộp thành **một** `@media (min-width: 900px)`.

Mọi con số đều lấy từ prototype, không tự nghĩ ra: **1280px** (`body.pc .device`
trong `shell.css` — chiều rộng cả hai comp được vẽ), **900px** (ngưỡng `shell.css`
vốn đã coi là màn rộng), **40px** gutter, lưới **3 cột** gap 22/20 (`.grid.three`),
hero **440px**, PDP chia cột **1.05fr / 0.95fr** gap 34px.

Hệ quả: chiều cao hero phải chuyển từ inline style sang biến `--hero-h`, vì media
query không thể thắng inline style nếu không dùng `!important`. Và 18 chỗ tôi
viết `padding: "… 18px …"` inline đã đổi sang class `.pad` — một quy tắc nới
gutter thì sửa được cả 18 chỗ, inline style thì không sửa được chỗ nào.

## QĐ-12 — `/api/wards` là đường ống dữ liệu, không phải backend đã hoãn

`data/wards.json` nặng **218KB** cho 3.321 phường/xã. Import thẳng vào form
thanh toán là bắt mọi người mua tải cả nước về để một dropdown hiển thị nhiều
nhất 168 mục. Nên nó ở lại server sau `/api/wards?province=`, và form hỏi đúng
tỉnh nó cần, nhớ lại theo phiên.

Đây **không phải** backend mà kế hoạch hoãn: không đơn hàng, không tài khoản,
không thanh toán. Nó phục vụ dữ liệu ứng dụng vốn đã mang theo, đúng hình dạng mà
dịch vụ địa giới thật sau này phải phục vụ.

## Lệch có chủ ý so với bản mock — Phase 3

Ba chỗ không chép nguyên, mỗi chỗ vì một câu trong `PRODUCT.md`:

1. **Màn đợt đã đóng** — mock viết "bán hết trong 5 giờ 42 phút". Đó là một
   tuyên bố về tốc độ bán mà dữ liệu không đỡ được. Thay bằng đúng thứ sổ đợt
   biết: bao nhiêu mẫu, bao nhiêu món đã cắt, đóng lúc nào. Chỉ nói "không còn
   size nào" khi kệ thật sự rỗng.
2. **Giỏ rỗng** — mock gợi "Bạn từng xem". Không có gì trong bản dựng này theo
   dõi điều đó, nên đổi thành "Đang mở trong đợt 05" — thứ có thật.
3. **PDP hết hàng** — mock để nút "Báo tôi khi có lại", ngay trên dòng chữ nói
   mẫu này không may thêm. Nút không được hứa ngược với câu nằm dưới nó. Đổi
   thành "Xem mẫu còn hàng" / "Về đợt đang mở".

Thêm hai bổ sung vào CSS đã port (đánh dấu `ADDED` ngay tại chỗ, không đổi pixel
nào đang hiển thị): vùng chạm 44px cho thanh nav, và biến thể cỡ `.ic.xl` cho
icon dùng làm **hình minh hoạ** thay vì làm glyph cạnh nhãn.

## QĐ-13 — `shell.css` không phải vỏ xem: nửa dưới của nó là CSS ứng dụng

Phase 0 port `prototype/app.css` và bỏ qua `prototype/shell.css` vì tên tệp
nghe như khung xem thử. Sai. Từ dòng 178 trở xuống, dưới một banner ghi thẳng
"TỪ ĐÂY TRỞ XUỐNG LÀ BÊN TRONG `.s`", là ~80 dòng quy tắc gắn vào gốc ứng dụng:
chiều rộng nút, mọi trạng thái di chuột và nhấn, con trỏ, ô nhập thật, và hộp
chạm 44px cho chữ nhỏ trên điện thoại.

Thiếu chúng thì bản dựng vẫn *chạy* đúng — mọi test xanh, mọi số đúng — nhưng
không nút nào phản hồi khi di chuột, `<button class="btn">` co lại còn 153px
trong khi `<a class="btn">` giãn hết hàng, và "Bảng size" cao 15px.

Nay nằm ở `app/styles/interaction.css`, có ghi rõ phần nào cố ý không port.

**Bài học tổng quát:** ranh giới tệp trong prototype là ranh giới của **người
viết nó**, không phải ranh giới của hệ. Trước khi tuyên bố đã port xong một
tầng, phải grep cả thư mục xem còn selector nào thuộc tầng đó nằm chỗ khác.

## QĐ-14 — Kiểm hình thức là một bước riêng, không phải hệ quả của kiểm hành vi

Chốt kiểm 3 đo hành vi rất kỹ — đi trọn luồng mua, không tràn ngang, mọi con số
đúng — rồi **tuyên bố xong mà chưa từng nhìn cái lưới**. Người dùng mở lên thấy
ngay thẻ sản phẩm cao thấp khác nhau.

Nguyên nhân sâu: "tràn ngang = 0" và "test xanh" *không* bao hàm "trông ra
lưới". Một tấm ảnh cao 689px cạnh tấm 483px không tràn ra đâu cả và không làm
hỏng một test nào.

Từ Phase 4 trở đi, mỗi chốt kiểm chạy thêm một máy dò hình thức trên mọi route,
ở cả hai bề ngang, kiểm tối thiểu: phần tử `display:inline` mà đòi hộp block ·
tỉ lệ ảnh lệch nhau trong cùng một lưới · nút đơn độc không giãn hết ô bọc ·
điều khiển mang con trỏ mũi tên · phần tử bị cắt trong khung `overflow:hidden`.
Và **nhìn** ảnh chụp từng màn, không chỉ đọc số.

## QĐ-15 — Xác thực mô phỏng phải tự nói ra là mô phỏng

Không có máy chủ xác thực, không kho mật khẩu, không token. `lib/session.ts`
chỉ làm một việc trung thực: khớp thứ người ta gõ với danh sách khách mẫu rồi
nhớ trình duyệt đang đóng vai ai.

Ràng buộc đi kèm, và chúng không phải trang trí:

· `Session` **không có trường nào chứa mật khẩu**. Mật khẩu được đọc, kiểm khác
  rỗng, rồi bỏ. Test đóng đinh: chuỗi mật khẩu không được xuất hiện trong phiên
  trả về.
· Ba màn — đăng nhập, đăng ký, đổi mật khẩu — **in ngay trên màn** rằng chưa có
  máy chủ và **đừng nhập mật khẩu thật**. Một form đăng nhập trông như thật mà
  không kiểm gì là lời mời gõ vào đó mật khẩu dùng ở chỗ khác.
· Màn quên mật khẩu **không** báo "không có tài khoản này". Trên một form đặt
  lại mật khẩu, câu đó là công cụ dò email đã đăng ký; người dùng thật không
  được lợi gì từ nó.

Nhánh "không có tài khoản nào khớp" ở màn đăng nhập thì được, **chỉ vì** mọi tài
khoản ở đây đều là fixture công khai — không có gì để lộ. Backend thật không
được sao chép hình dạng ấy.

## QĐ-16 — Đọc đơn phải kiểm người hỏi, không chỉ kiểm mã tồn tại

`visibleOrder(customer, code)` trả `undefined` cho đơn của người khác, và route
biến điều đó thành 404.

Mã đơn chạy `DH-2419`, `DH-2422` — đếm lên là ra cái kế tiếp. Sau mỗi mã là tên,
số điện thoại và địa chỉ nhà. Trả "bạn không có quyền xem" thì lịch sự hơn nhưng
đã xác nhận đơn có tồn tại và thuộc về ai đó; 404 chỉ nói đúng điều người hỏi
được biết.

Cùng lý do: lịch sử đơn lọc theo `customerId` chứ không lọc ở tầng hiển thị.

## QĐ-17 — Ghi vào kho cục bộ phải canh bằng STATE, không canh bằng ref

Cả ba kho — giỏ hàng, yêu thích, sổ địa chỉ — dùng một khuôn: hiệu ứng đọc lúc
mount, hiệu ứng ghi mỗi khi dữ liệu đổi, cộng một cái chốt để lần ghi đầu không
đè lên thứ vừa đọc.

Chốt bằng `ref` **sai**, và sai âm thầm. Ref bật đồng bộ ngay trong hiệu ứng
đọc, nên hiệu ứng ghi — chạy **cùng nhịp commit** đó — thấy "đã nạp" trong khi
state vẫn là giá trị rỗng ban đầu, và ghi rỗng đè lên `localStorage`. Lần render
kế tiếp nó tự lành, nên hầu hết lúc không ai thấy. Điều hướng trong khoảng đó
thì bản ghi rỗng là bản sống sót.

Bắt được ở Phase 4: lưu một mẫu vào yêu thích, sang trang sản phẩm khác, mở
danh sách — trống. Giỏ hàng Phase 3 mang đúng lỗi ấy suốt và chỉ ăn may.

Chốt bằng `ready`, một **state**, vào cùng lô cập nhật với dữ liệu. Hiệu ứng ghi
lần đầu chạy trên một commit đã có đủ cả hai.

## QĐ-18 — Vùng chạm phải ĐO, và đo cả cái đè lên nó

Chốt kiểm 4 đo **hit area** bằng `elementFromPoint` dò ra từ tâm, không đo
`getBoundingClientRect`. Bảy chỗ dưới sàn 44px, và không chỗ nào lộ ra nếu chỉ
đọc chiều cao hộp:

· lớp phủ có đó nhưng bị **`overflow:hidden` của cha cắt mất** (`.qb` trong
  `.qty`) — CSS đúng, kết quả sai;
· lớp phủ có đó nhưng bị **lớp phủ của phần tử bên cạnh đè lên** (nút thêm vào
  giỏ trong ô yêu thích, qua khe 6px) — hai vùng 44px không thể chia nhau một
  khe 6px, phải nới khe ra 18px;
· chú giải trong `nav.css` **khẳng định** mũi tên quay lại đã đủ 44px vì "hộp
  vuông của icon chính là vùng chạm". Đo ra 19px. Một câu chú giải mô tả ý định
  chưa bao giờ được viết thành code.

Từ nay mỗi chốt kiểm chạy lượt đo này trên mọi route ở 390px, và phép đo phải là
hit area.

## QĐ-19 — Hành động nằm trên tấm ảnh, và icon gọi tên hành động

Trang yêu thích từng treo "Bỏ khỏi yêu thích" dưới thẻ, trong một ô bọc
`.cardcell`. Đo ra: dòng ấy cách nút của chính nó **20px** và cách thẻ hàng
dưới **16,3px** — gần thẻ nó KHÔNG điều khiển hơn. 18px kia không phải lựa
chọn thẩm mỹ, nó là hệ quả của QĐ-18 (hai vùng 44px không chia nhau một khe
nhỏ). Một vết sẹo kỹ thuật đang được đọc như một quyết định bố cục.

Chuyển điều khiển lên tấm ảnh (`.unsave`, 32px, góc trên phải). Hệ quả:

· thẻ trong lưới yêu thích trở lại **đúng thẻ sản phẩm chuẩn** — một hàng hành
  động, một nút. `.cardcell` / `.cardcellfoot` bị xoá, lưới không còn cần ô bọc;
· hai hàng thẻ ở 390px ngắn đi **76px** (807 → 731, đo trên cùng một markup);
· nó chạy giống hệt nhau trên cả ba trạng thái thẻ — mua được, hết hàng, đợt
  đã đóng — trong khi mọi phương án đặt nút dưới thẻ đều phải có bộ da thứ hai
  cho thẻ không có nút "Thêm vào giỏ".

Giá phải trả, đã đo: nút nằm trên dải vuốt nên **ăn 44px góc trên phải** của
tấm ảnh nhiều màu. Dò `elementFromPoint` dọc mép trên: trái = dải, giữa = dải,
góc phải = nút. Pips và phím mũi tên vẫn đổi màu được.

**Icon là `heart-slash`, không phải `heart` đặc.** Trên trang sản phẩm trái tim
là một công tắc thật nên nó mang *trạng thái* (đặc = đã lưu). Ở đây mọi thứ đều
đã lưu — trạng thái không phải tin tức — và bấm xong thì thẻ rời khỏi trang, nên
không có trạng thái "tắt" để báo. Nó là **hành động**, và icon phải gọi tên hành
động. Cùng lý do: không `aria-pressed`, chỉ `aria-label` nói rõ việc.

Chọn **Bulk** chứ không Linear: ở 16px nét rỗng bị gạch chéo cắt đường viền trái
tim thành các cung rời, đọc ra thành dấu cấm "∅". Mảng đặc bị cắt vẫn giữ được
hình. Đây là quyết định đã nhìn ảnh chụp ở đúng cỡ ship, không suy từ tên icon.

## Rủi ro

| Rủi ro | Mức | Cách chặn |
|---|---|---|
| Port CSS làm trôi dạt hình ảnh | Cao | So ảnh từng màn với prototype ở cùng bề rộng; prototype giữ nguyên làm chuẩn |
| Viết lại `app.js` bị coi nhẹ (tưởng là chép) | Cao | Tách hẳn Phase 2, có chốt kiểm riêng bằng khu đặc tả |
| Next 16 khác trí nhớ của tôi, code sai âm thầm | Cao | Đọc docs trong `node_modules` trước mỗi quyết định API |
| Tách tồn kho size × màu làm muộn | Trung bình | Làm ở T5, trước khi bất kỳ route nào đọc |
| Ảnh Unsplash là tạm, sẽ thay | Thấp | Mọi ảnh đi qua một hàm; thay nguồn ở một chỗ |

## Câu hỏi mở — ĐÃ CHỐT 2026-09-20

1. **CSS** → **giữ nguyên CSS đã đo.** Token lên `@theme`, component CSS ở `app/he/`
   kèm nguyên chú giải. Tailwind chỉ cho bố cục. (QĐ-1 giữ nguyên.)
2. **Tồn kho** → **tách size × màu ở T5.** Lý do người dùng chốt trùng với Nguyên tắc
   #4 của PRODUCT.md: sự thật về hàng hoá không được tô hồng. Sheet phải nói được
   "hết XL màu đen", không chỉ "hết XL".
3. **Khu `/_he`** → tôi quyết: **dựng**, nhưng loại khỏi sitemap và khỏi mọi điều hướng.
   Chốt kiểm 2 cần nó để đối chiếu; không có thì không kiểm được primitive.
4. **4 trang nội dung** → **dựng luôn**, và sửa mục "Ngoài phạm vi" của `PRODUCT.md`
   cho khớp thực tế. Ràng buộc giữ nguyên: không bịa câu chuyện thương hiệu, xưởng,
   đối tác, giải thưởng. Chỗ nào chưa có sự thật thì để trống chờ người dùng viết.

## QĐ-6 — Mọi code viết bằng tiếng Anh *(chốt 2026-09-20)*

Định danh, tên hàm, tên biến, tên tệp, tên class CSS và **chú giải** đều tiếng
Anh. Tiếng Việt chỉ còn ở **chữ hiển thị cho người dùng**: nhãn UI, tên sản
phẩm, nhãn màu, tên đơn vị hành chính, và những trường dữ liệu được in ra
nguyên văn (`name`, `kind`, `material`, `Color.label`).

**URL cũng tiếng Anh** — người dùng chốt ngày 20/09/2026, bác ngoại lệ tôi đề
xuất. Bảng route:

| Trước | Sau |
|---|---|
| `/` | `/` |
| `/danh-muc` · `/tim-kiem` | `/products` · `/search` |
| `/san-pham/[slug]` | `/products/[slug]` |
| `/gio-hang` · `/thanh-toan` · `/dat-hang-xong` | `/cart` · `/checkout` · `/order-confirmed` |
| `/dang-nhap` · `/dang-ky` · `/quen-mat-khau` | `/sign-in` · `/sign-up` · `/forgot-password` |
| `/tai-khoan/**` | `/account/**` (`profile` `password` `orders` `addresses` `wishlist`) |
| `/qt/**` | `/admin/**` (`drops` `products` `orders` `customers` `promotions`) |
| `/gioi-thieu` · `/cau-hoi` · `/doi-tra` · `/lien-he` | `/about` · `/faq` · `/returns` · `/contact` |
| — | `/_system` (trang đặc tả, ngoài sitemap) |

Chốt sớm nên rẻ: chưa route nào tồn tại.

## Cấu trúc hành chính — sửa 2026-09-20

Kế hoạch ban đầu (và `PRODUCT.md`) ghi ba cấp Tỉnh → Quận/Huyện → Phường/Xã.
**Sai với hiện tại.** Từ 01/7/2025 Việt Nam còn **hai cấp**: cấp tỉnh (34 đơn
vị — 6 thành phố trực thuộc trung ương + 28 tỉnh) và cấp xã (3.321 đơn vị —
687 phường, 2.621 xã, 13 đặc khu). 696 đơn vị cấp huyện đã chấm dứt hoạt động.

`data/regions.ts` nay mang **đủ 34/3.321**, lấy từ bộ dữ liệu công khai và đối
chiếu độc lập với nguồn chính phủ trước khi dùng (Hà Nội 126, TP.HCM 168, danh
sách 6 thành phố — đều khớp). `Address` không còn `districtCode`.

## ⚠ `next dev` KHÔNG hydrate trên máy này — dùng `npm run preview` để kiểm

Phát hiện 2026-09-20 khi kiểm T10. Trang render đúng HTML nhưng **React không
bao giờ gắn vào DOM**: `useEffect` không chạy, mọi `onClick` chết, `.chip` bấm
không đổi, dropdown không mở.

Đã khoanh vùng bằng một trang thăm dò tối giản (`app/hyd/page.tsx`, 15 dòng,
chỉ một bộ đếm `useState`):

| Chạy bằng | Hydrate |
|---|---|
| `next dev` (Turbopack) | **không** |
| `next dev --webpack` | **không** |
| `next dev` sau khi xoá sạch `.next` | **không** |
| `next build` + `next start` | **có** |

Không một lỗi nào trong console. Chunk JS tải đủ (105KB, HTTP 200). React
có nạp — overlay devtools của Next tự mount được một React root. Chỉ cây ứng
dụng là không. Nên **không phải lỗi code**: cùng bộ code ấy chạy đúng ở
production.

**Cách làm việc tạm thời:** `npm run preview` (build + serve ở cổng 3200).
Chậm hơn dev nhưng là bản duy nhất kiểm được tương tác.

**Chưa truy xong, để lại đầu mối:** lúc đầu có **hai** `next dev` chạy song
song — một tiến trình mồ côi sống sót sau `TaskStop` vì lệnh gốc bọc trong
`| head -40`. Next 16 chỉ cho một dev server mỗi thư mục. Đã giết hết và thử
lại vẫn hỏng, nên đó có lẽ không phải nguyên nhân, nhưng đáng loại trừ lại.
Bước tiếp theo nên là: mở `http://127.0.0.1:3100/hyd` trong Chrome **thường**
(không qua công cụ tự động) và xem tab Console/Network — rất có thể thứ chặn
hydration chỉ lộ ra ở đó.

## QĐ-7 — TanStack Table v9, không phải v8 *(2026-09-20)*

`npm install @tanstack/react-table` cài về **v9.2.4**, và v9 đổi API gần như
toàn bộ: `useReactTable` → `useTable`, `getCoreRowModel()` biến mất, mọi row
model thành **slot bên trong `tableFeatures()`**, `flexRender()` thành
`<table.FlexRender>`. Viết theo kiểu v8 thì không biên dịch được.

Package có sẵn thư mục `skills/` — tài liệu chính chủ cho đúng phiên bản đang
cài. Đó là nguồn đã dùng, thay vì trí nhớ.

Một bẫy im lặng: `filterFn: "arrIncludesSome"` **không** dùng được cho bộ lọc
theo mặt. Nó soi mảng ở phía DÒNG; ở đây dòng là chuỗi còn bộ lọc mới là mảng.
Không lỗi, không cảnh báo — chỉ là cái chip bấm vào chẳng làm gì. Đã thay bằng
hàm `inList` tự viết trong `components/table/features.ts`.

## Cổng đã mở

Trước lượt này, ràng buộc đứng là: *không viết code triển khai vào `app/` cho tới khi
người dùng cho phép, và thiết kế phải được duyệt trước.* Ngày 2026-09-20 người dùng
nói **"UI có vẻ tạm ổn rồi. bây giờ giúp tôi build phần frontend trước và seed mock
data"** — đó là lời duyệt thiết kế và lời mở cổng. Backend vẫn đóng cho tới khi
frontend xong.

## QĐ-20 — Kiểm trình duyệt chuyển sang `playwright cli` *(2026-09-20)*

Từ lượt này, việc lái trình duyệt dùng **`npx playwright cli`** (Playwright
1.63.0, `@playwright/test` là devDependency) thay cho tiện ích claude-in-chrome.

**Vì sao đổi.** Ba thứ bản extension không cho, mà QĐ-14 lại đòi:

| Cần | `playwright cli` cho |
|---|---|
| Người dùng **nhìn thấy** máy đang làm gì | cửa sổ Chrome thật + `slowMo` + `video-show-actions` vẽ chú thích ngay trên trang, gọi tên hành động và tô viền phần tử bị chạm |
| Máy **đọc lại được** kết quả | mỗi lệnh in ra stdout: URL, tiêu đề, số lỗi console, đường dẫn tệp snapshot. `--raw` cắt sạch phần trang trí để nối ống sang lệnh khác |
| Bao vây được phạm vi | hồ sơ tạm (không đụng hồ sơ Chrome cá nhân) + danh sách origin cho phép |

Bản 1.63 còn ship sẵn agent skill cho chính nó:
`.claude/skills/playwright-cli/` (cài bằng `npx playwright init-skills --loop
claude`, kèm `playwright-trace` và `playwright-component-testing`). **Đó là tài
liệu đúng phiên bản đang cài** — dùng nó, đừng viết theo trí nhớ.

**Cấu hình** nằm ở `.playwright/cli.config.json`, áp cho mọi phiên nên không
lệnh nào phải mang cờ:

- `channel: "chrome"` — Chrome hệ thống, không tải thêm bản trình duyệt nào.
- `headless: false`, `slowMo: 300` — luôn có cửa sổ, luôn theo kịp bằng mắt.
- `viewport 390×844` mặc định — mobile là bản gốc (nguyên tắc 1 của PRODUCT.md).
  Muốn desktop thì `resize 1280 800`, và đó là một bước cố ý, không phải mặc định.
- `locale: "vi-VN"`, `timezoneId: "Asia/Ho_Chi_Minh"` — giá VND và mốc thời gian
  đếm ngược là nội dung thật, không được phụ thuộc máy chạy.
- `network.allowedOrigins` chỉ có 3100/3200 trên loopback. **Mọi origin khác bị
  chặn ở tầng route**, đã đo: `https://example.com` trả `ERR_BLOCKED_BY_CLIENT`.

Không cần mở `images.unsplash.com`: ảnh sản phẩm đi qua `/_next/image`, tức là
**máy chủ Next tải hộ**, trình duyệt không bao giờ gọi thẳng Unsplash. Đã đo
`naturalWidth > 0` trên 6 ảnh đầu với danh sách chặn đang bật.

**Hai cái bẫy đã dẫm phải, ghi để khỏi dẫm lại:**

1. **Git Bash nuốt regex bắt đầu bằng `/`.** `find --regex "/giá|size/i"` bị
   MSYS đổi thành `/C:/Program Files/Git/giá|size/i` — không báo lỗi, chỉ ra kết
   quả sai. Dùng `MSYS_NO_PATHCONV=1`, hoặc PowerShell, hoặc bỏ dấu `/` bao ngoài.
2. **Đừng đoán accessible name.** Cùng một nút chọn size mang tên
   `"M còn 4"` trong sheet của thẻ sản phẩm nhưng `"Size M, còn 4"` ở trang chi
   tiết. Luôn `snapshot` / `find` lấy `ref` rồi mới `click <ref>`.

**claude-in-chrome không bị gỡ** — nó vẫn dùng được khi cần chính hồ sơ Chrome
đã đăng nhập của người dùng. Nhưng mặc định cho mọi việc kiểm của dự án này là
`playwright cli`.

**Máy dò hình thức của QĐ-14 đã dựng trên nền này:** `tools/layout-sweep.js`,
chạy bằng một lệnh cho cả 19 route × 2 bề ngang:

```bash
npx playwright cli --raw run-code --filename=tools/layout-sweep.js \
  > .playwright-cli/sweep.json
```

Script tự gieo `brand.session` + `brand.cart` nên route tài khoản và thanh toán
render đúng màn của chúng thay vì bị đá về đăng nhập. Ảnh chụp toàn trang vào
`.playwright-cli/shots/`. Sáu máy dò: hộp inline · tỉ lệ ảnh trong cùng lưới ·
nút đơn độc · con trỏ · phần tử bị cắt · vùng chạm 44px. Cộng thêm tràn ngang
và lỗi console.

**Ba lần hiệu chỉnh máy dò trước khi tin được nó** — lượt đầu báo 136 phát hiện,
phần lớn là máy dò sai, và đó chính là thứ phải loại trước khi báo cho người dùng:

| Máy dò | Báo sai vì | Đã sửa thành |
|---|---|---|
| phần tử bị cắt | `/hidden\|clip/` khớp cả `overflow-y:hidden` của dải vuốt `.slide`, mà dải vuốt thì **cuộn tới được** | chỉ tính trục vừa bị cắt vừa **không cuộn được** (`scrollWidth <= clientWidth`), và chỉ báo khi tâm phần tử **không** chạm tới được |
| nút đơn độc | `div > .btn:only-child{ width:100% }` là luật của **vỏ điện thoại**; ở 1280 một nút rộng 1200px mới là lỗi | chỉ chạy ở ≤460px |
| vùng chạm | dò bốn góc của ô 44×44 đòi mục tiêu phải **vuông** — hai mục cạnh nhau trong một hàng không bao giờ cho nhau được thế | đo **tầm với theo từng trục** từ tâm ra; và `elementFromPoint` ngừng trả lời sớm 1px ở mép nên phải **cộng lại 1px**, nếu không mọi thứ vừa đúng 44 đều bị báo hụt |

Sau hiệu chỉnh: **43 phát hiện, tất cả cùng một máy dò**, gom lại thành ba chỗ
thật (xem `tasks/todo.md`). Năm máy dò kia sạch cả 38 lượt — trong đó máy dò hộp
inline trả 0, tức lỗi `<a class="ph">` của đợt rà trước vẫn đang đứng yên.


## Sau Phase 6 — bốn cổng đang đóng, cả bốn cần lời người dùng *(2026-09-20)*

Frontend đã xong: 6/6 phase, chốt kiểm 6 ĐẠT, 526 test xanh, build sạch. Mục này
ghi lại **những gì còn lại**, để không ai phải đoán — và để không có mục nào ở đây
bị tự ý làm thay.

| Còn lại | Ai quyết | Vì sao chưa làm |
|---|---|---|
| **Ảnh sản phẩm thật** | người dùng | Unsplash là tạm, đã ghi ở mục Rủi ro và ở `PRODUCT.md` mục *Evidence on Hand*. Mọi ảnh đi qua một hàm nên thay ở một chỗ. |
| **Ba chỗ `NeedWrite`** | người dùng | Câu chuyện thương hiệu (`/about`), thời hạn đổi trả (`/returns`), kênh liên hệ (`/contact`). Ràng buộc đứng: **không bịa**. Để trống là đúng, không phải thiếu sót. |
| **Backend** | người dùng | Cổng do chính kế hoạch này đặt: *"Backend vẫn đóng cho tới khi frontend xong."* Frontend nay đã xong, nên cổng chuyển thành một quyết định — `PRODUCT.md` hiện ghi phạm vi là **mock UI, không backend**. |
| **`/hyd`** | người dùng | Trang thăm dò dựng để soi lỗi `next dev` không hydrate, nay vẫn nằm trong bản build (`○ /hyd`). Không có gì trỏ tới nó. Repo **không phải git** nên tôi không tự xoá; nó cũng là vật chứng duy nhất cho lỗi hydrate còn treo. |

**Một chỗ biết mà cố ý không đổi:** textarea "Ghi chú cho người giao" ở `/checkout`
dùng `.inp.area` — cao cố định 78px (≈2,7 dòng), không đọc `rows`. Đây là **số đo
của bản mock đã duyệt** và nó không hỏng; khác với textarea quản trị (đã sửa vì
`rows={4}` bị `height` của `.inp` nuốt mất, thành một dòng).


## Đợt nâng cấp UI v2 — mock CHỜ DUYỆT *(2026-09-20, sau Phase 6)*

Người dùng yêu cầu một đợt nâng cấp: nhiều thông tin và chức năng hơn, polish,
sửa lỗi UX/UI — **dưới dạng mock để duyệt trước, chưa viết gì vào `app/`**.

**Ba điều người dùng đã chốt trước khi dựng mock:** (1) khung desktop cho *mọi*
màn; (2) dồn công vào cả bốn nhóm (trang chủ · danh mục/PDP · giỏ/thanh toán ·
tài khoản/quản trị); (3) khu quản trị **được thao tác mô phỏng**, lưu trên trình
duyệt, gắn nhãn rõ, có nút đặt lại — cùng cơ chế giỏ/yêu thích.

**Mock ở `prototype/v2/`** — `index.html` là bảng duyệt (khung 390 + 1280 song
song, nút Duyệt/Sửa/Bỏ từng màn, "Sao chép kết quả duyệt"). Mở bằng
`cd prototype && python serve.py 4320` → `/v2/`. Đồng hồ trong mock **đóng băng
ở 18:50 20/09/2026**; mọi con số suy từ fixture qua vitest (`v2data.json` tạm);
CSS hệ là snapshot của `app/styles/` (`sys/`), phần đề xuất nằm ở `v2.css`.

**Lỗi bắt được trong bản đang chạy (đã xác minh, sẽ sửa khi implement):**
L1 chân trang chỉ có ở 6/27 route · L2 trang ngắn trống nửa màn · L3 nền admin
dừng ở đáy nội dung (`min-height:100%` trên `html` không có chiều cao) ·
L4 `app/page.tsx:64` in "đã đóng" cho đợt trước dù đợt đó đang mở · L5 hai nút
cùng tới `/products` · L6 hàng chip cắt ở mép · L7 tìm 1 kết quả ra thẻ nửa
màn · L8 ô giá admin hiện `390000` thô · L9 menu số dòng/trang tiêu đề là "10"
(`FacetButton` truyền `label` làm `heading`) · L10 chữ cái đại diện 1 vs 2 chữ ·
L11 thẻ hết hàng không nút, lủng hàng · **L12 mâu thuẫn nội dung**: PDP/checkout
khẳng định "đổi trả 7 ngày" trong khi `/returns` nói chưa chốt — cần người dùng.

**Năm câu đang chờ người dùng chốt** (ghi ở cuối `prototype/v2/index.html`):
công khai mã đợt trong tài khoản? · đổi trả 7 ngày đã chốt? · thao tác mô phỏng
sống qua reload? · "tìm gần đây" trên thiết bị + ngưỡng sắp hết ≤3? · hai màn
admin (Sản phẩm, Khách hàng) chỉ nhận L8/L10.

**Cổng vẫn đóng:** không implement cho tới khi người dùng duyệt từng màn.

## QĐ-21 — Thực thi bằng agent Opus 5, phiên chính chỉ thiết kế và duyệt *(2026-09-20)*

Người dùng chốt: từ đợt v2 trở đi, **phiên chính (model Fable) không tự viết code
implement**. Nó thiết kế, dựng mock, lấy lời duyệt, rồi viết một brief đầy đủ
cho agent **`ui-implementer`** (`.claude/agents/ui-implementer.md`, model
`claude-opus-5`) thực thi vào `app/ components/ lib/ data/`. Xong, phiên chính
**duyệt lại** kết quả bằng ảnh chụp thật (playwright cli, 390 + 1280, mở lớp
nổi) và máy dò, so với mock — đạt mới báo người dùng, chưa đạt thì gửi danh sách
sửa cho đúng agent đó (giữ nguyên ngữ cảnh) chứ không tự sửa.

**Brief phải có đủ năm mục** (agent được dặn dừng lại nếu thiếu): màn + route +
tệp mock · quyết định đã chốt áp cho màn ấy · lỗi L1–L12 thuộc màn ấy · tiêu chí
nghiệm thu ở 390 và 1280 kèm lớp nổi phải mở · danh sách ảnh chụp cần nộp
(`.playwright-cli/shots/v2/`). Agent **không được** sửa `prototype/`, `DESIGN.md`,
`PRODUCT.md`, `tasks/`, `.impeccable/`, `.claude/`; không thêm ignore cho hook;
báo cáo theo sáu mục cố định, có bằng chứng mới được nói "xong".

**Vì sao:** người dùng muốn tách vai — model mạnh hơn dành cho phán đoán thiết kế
và nghiệm thu, model rẻ hơn cho phần thực thi theo đặc tả — và muốn một cổng
duyệt thứ hai nằm giữa code và họ.

## QĐ-22 — Sàn chữ chức năng 11px *(chốt 2026-09-20, phương án A)*

Máy dò `undersized-ui-text` bắt 36 quy tắc trong `app/styles/` (và 15 trong lớp
đề xuất v2) đặt chữ chức năng ở 9–10,5px: "còn 3" dưới nút size, thông báo lỗi,
nhãn bước thanh toán, tiêu đề cột bảng, số trên icon túi, nhãn trục biểu đồ…
DESIGN.md §3 ghi thang ấy là "đo từ code", nhưng máy dò không coi "có trong
thang" là lý do. Người dùng xem bản so sánh trước/sau trên mock (5 màn, 390 và
1440) và **chốt A: nâng tất cả lên ≥ 11px**, thông báo lỗi và cảnh báo giỏ lên
11,5px. Đã đo trên mock: không tràn ngang; hàng ô màu cao thêm 3px, thanh bước
thêm 1px, ghi chú KPI ở tổng quan quản trị xuống hai dòng.

**Khi thực thi (agent `ui-implementer`):** áp đúng 36 quy tắc theo file:dòng ghi
ở cuối `prototype/v2/v2.css`; chỉnh padding ô KPI để ghi chú gọn; cập nhật thang
chữ ở DESIGN.md §3 (bỏ 9 · 9,5 · 10 · 10,5). Các ignore `tiny-text` theo tệp
mock trong `.impeccable/config.json` vẫn đúng (quy tắc đó đo chữ thân < 12px).

## Cổng v2 đã mở *(tối 2026-09-20)* — thực thi theo sáu lát, qua agent

Người dùng duyệt toàn bộ mock v2 (17 màn, kể cả hai màn từng "Sửa" và sáu ghi
chú) và chốt A cho sàn chữ. Năm câu 1–5 chưa trả lời riêng → **lấy đúng như mock
đã duyệt** (mã đợt hiện trong tài khoản · đổi trả 7 ngày, chi tiết vẫn NeedWrite ·
thao tác mô phỏng sống qua reload, có nút đặt lại · tìm gần đây trên thiết bị,
sắp hết ≤ 3 · Sản phẩm/Khách hàng admin chỉ nhận L8/L10); người dùng có thể đổi
bất cứ lúc nào, đều là việc nhỏ.

Thứ tự lát (mỗi lát = một brief đủ năm mục → `ui-implementer` → phiên chính duyệt
lại bằng ảnh thật rồi mới sang lát sau):

| Lát | Phạm vi | Lỗi kèm |
|---|---|---|
| 0 | khung trang + chân trang mọi route, nav v2, `.inp` 40px, sàn chữ 11px, `.narrow`, khung admin | L1 L2 L3 L4 L9 L10 |
| 1 | trang chủ + ba trạng thái đợt, thẻ sản phẩm v2 (dải sắp hết, ô nhóm hàng, cách đợt hoạt động, teaser đợt sau, dải cam kết) | L5 L11 |
| 2 | danh mục (tab, chip, rail, sắp xếp, sheet lọc/size), chi tiết (gallery, tồn kho, swatch, buybar, liên quan, bảng size), tìm kiếm | L6 L7 |
| 3 | giỏ, thanh toán (sổ địa chỉ, hộp đơn), xác nhận đơn | L12 (theo mock) |
| 4 | tài khoản, đơn của tôi, đăng nhập/đăng ký | — |
| 5 | admin: tổng quan, đơn hàng + chi tiết (bàn giao, mô phỏng, đặt lại), đợt bán + chi tiết, khuyến mãi; Sản phẩm/Khách hàng | L8 |

**Lát 0 — ĐẠT (tối 2026-09-20).** Agent giao: `ShopFrame`/`SiteNav`/`SiteFooter`
mới, `.inp` 40 + `.inptap`, sàn 11px đúng 36 quy tắc, L1 L2 L3 L4 L9 L10, thêm
`families` vào listing query (cần cho 5 liên kết họ trên nav), 543 test. Phiên
chính đo lại độc lập 22 route × 2 bề ngang + 3 lớp nổi + so nav/chân trang với
mock: khớp. Lệch có lý do, chấp nhận: hàng liên kết chân trang 44px trên điện
thoại (mock 32; lớp phủ đè nhau); ô KPI thêm `text-wrap:balance`; ô nhập trần
bọc `.inptap`; "Bảng size" ở chân trang trỏ tới bảng size của mẫu đầu đợt (tạm,
chưa có trang bảng size chung). Việc phiên chính đã làm sau lát: cập nhật
DESIGN.md §3 §4 §5 §8 §10; vá `tools/layout-sweep.js` (máy dò tỉ lệ chỉ gom theo
hàng/grid, không gom theo khung flex cột). CSS chết `.nav .cartdot .sitefoot`
giao lát 1 xoá.

**Lát 1 — ĐẠT (tối 2026-09-20).** Trang chủ ba trạng thái + thẻ v2 + L5 L11 +
xoá 14 quy tắc CSS chết; 566 test. Phiên chính đo lại: hero, ảnh, đồng hồ (cách
hai mép 84px), hai nút 339px, thứ tự mục — trùng mock từng hộp ở 390 và 1280;
cuộn `#how` dừng dưới nav dính; nút nhắc giữ qua reload; hàng thẻ hết hàng phẳng
321/321; sheet size mở từ thẻ đúng. Lệch có lý do, chấp nhận: trạng thái sắp mở
có thêm mục "Cách chúng tôi bán" (để nút không chết); câu lead và toast nhắc
viết lại cho đúng sự thật ("lưu trên thiết bị này — trang chủ hiện lại khi còn
2 giờ"); ảnh ô nhóm hàng lấy mẫu đầu mỗi loại; ảnh hero theo tỉ lệ của mock (mock
không phải 4:5 — dòng nghiệm thu của brief sai, agent chọn đúng). Lỗi có sẵn được
vá luôn: nút "Thêm vào giỏ" trong sheet của thẻ trước đây **không ghi vào giỏ**
(`onAdd` không route nào truyền). Bài học cho khâu duyệt: ảnh toàn trang phải
cuộn hết trang trước khi chụp, không thì ảnh tải lười (`loading="lazy"`) trống.

**Lát 2 — ĐẠT (tối 2026-09-20).** Danh mục (tab họ, chip có đếm + dải mờ L6,
rail desktop, menu sắp xếp fixed portal, sheet lọc 6 nhóm với "Xem N mẫu"), PDP
(`.pdp2`, meter, swatch có số theo màu, buy bar rAF, bảng size, trạng thái hết
hàng), tìm kiếm (`.hit` L7, chip gợi ý có đếm, "Tìm gần đây" trên thiết bị);
592 test. Phiên chính đo lại 6 route × 2 bề ngang + 4 lớp nổi: trùng mock từng
hộp; menu sắp xếp điện thoại mở/đóng đúng (script duyệt bấm trong lúc hàng chip
còn trượt nên bắt hụt — không phải lỗi app). Lệch có lý do, chấp nhận: không
chọn sẵn size (quy tắc "nút không đoán size" có từ Phase 3), rail có "Áp dụng"
dưới hai ô giá và "Xoá tất cả bộ lọc"/"Bỏ" theo nhóm (mock vẽ nút chết), chip
sắp xếp mở menu thay vì sheet, nhóm Màu lọc thật, tab họ là `<nav>` + link.
Thay đổi toàn app cần biết: **nút vô hiệu nay có trạng thái nghỉ** (`.btn:disabled`
= kiểu `.btn.off`). Để lát 3: xoá CSS chết `.pdp .pdpshot .pdpbuy`, bỏ
`familiesIn()` không còn ai gọi, và **không lưu từ khoá không có kết quả** vào
"Tìm gần đây" (phiên chính bắt được: "zzzz" bị lưu).

**Lát 3 — ĐẠT (rạng sáng 2026-09-21).** Giỏ (`.cart2`, shipbar, dòng tồn một
dòng, `PromoBox` dùng chung với mã thật từ `data/promotions.ts` — CHAOBAN
−50.000₫ đo được, mã sai ra `.err`), thanh toán (`.checkout2`, sổ địa chỉ thiết
bị, "Giao tới địa chỉ khác" full width mở form và tự ẩn, ngày giao từ
`lib/shipping.ts`, COD +15.000₫, hộp đơn mở sẵn từ 900px, cổng đồng ý), xác
nhận đơn (hạn chuyển khoản = giờ đặt + 12h, nội dung CK + Sao chép, `NeedWrite`
QR); 612 test. Phiên chính tự đi trọn luồng mua ở 390/1280 và so mock: khớp.
Ba việc tồn của lát 2 xong (xoá `.pdp*`, bỏ `familiesIn()`, không lưu từ khoá
0 kết quả). Lệch có lý do, chấp nhận: nhánh thẻ nay **nói thật "Chưa thu tiền"**
+ `NeedWrite` cổng thẻ (trước đó âm thầm "thành công"); ô "Nhãn" địa chỉ là
`<Select>` 3 giá trị (enum); sổ địa chỉ rỗng thì mở thẳng form; "Xem đơn trong
tài khoản" chỉ dựng khi đã đăng nhập kèm ghi chú đơn vừa đặt chưa nằm trong
danh sách đơn của tài khoản (không có máy chủ).
**Chờ người dùng chốt (không chặn lát 4–5):** (a) đơn vừa đặt có nên xuất hiện
trong `/account/orders` không — phải nối `lib/placed-order.ts` vào danh sách đơn
của tài khoản; (b) giữ hay gỡ lựa chọn "Thẻ nội địa / Visa" khi chưa có cổng.
Giao lát 4: format số điện thoại `0912 345 678` ở trang xác nhận và mọi chỗ in
số (hiện in chuẩn hoá `0912345678`, hàng chọn địa chỉ in đúng chuỗi fixture).

**Chốt 2026-09-21:** giữ lựa chọn "Thẻ nội địa / Visa" ở thanh toán, kèm ghi chú
"chưa nối cổng" và dải "Chưa thu tiền" trên trang xác nhận (đúng như lát 3 đã
dựng). Câu (a) — đơn vừa đặt có vào "Đơn của tôi" không — đang chờ; phiên chính
đề xuất B (gộp đơn trên thiết bị vào danh sách, gắn nhãn "lưu trên thiết bị này").

**Chốt 2026-09-21 (câu a): B.** Đơn đặt trên thiết bị (`lib/placed-order.ts`)
được gộp vào "Đơn của tôi" của tài khoản đang đăng nhập, gắn nhãn "lưu trên
thiết bị này", mới nhất trước; chi tiết đơn `/account/orders/[code]` mở được cho
đơn ấy; ghi chú "chưa nằm trong danh sách" ở trang xác nhận bỏ đi. Giao agent
lát 4 làm nối tiếp brief.

**Lát 4 — ĐẠT (sáng 2026-09-21), gồm cả B.** Tài khoản (`.acct` rail, tổng quan
theo mock, mã đang chạy + sao chép, công tắc thật `brand.prefs`), đơn của tôi
(tab đếm, `.thumbs`, **đơn đặt trên thiết bị gộp vào, gắn nhãn, chỉ chủ đơn
thấy** — đo với hai khách), chi tiết/theo dõi đơn thiết bị nói thật, ba màn
auth trong `.authcard`, `formatPhone` ở mọi chỗ in số; 656 test. Phiên chính đo
lại 14 route × 2 bề ngang + luồng sao chép/công tắc/đặt đơn/đổi khách: khớp.
Lệch có lý do, chấp nhận: "gửi đi dd/mm" thay cho "dự kiến nhận" (Order không
lưu cách giao, không bịa); badge có chấm; "Chờ chuyển khoản" theo `STATE_LABEL`;
"Mua không cần tài khoản" → `/cart` khi giỏ có hàng. Việc tồn giao lát 5:
(a) đơn đặt trên thiết bị phải **lưu bền trên thiết bị** (localStorage, nhiều
đơn, theo khách) chứ không theo phiên tab như `brand.lastOrder` hiện nay —
đúng nghĩa "lưu trên thiết bị này" của quyết định B; (b) biến thể `.alert.note`
cho thông báo thuần thông tin (đăng nhập mô phỏng, đơn thiết bị) thay vì màu
đỏ của lỗi; (c) nút `.btn.off` ở chi tiết đơn còn icon; (d) bỏ dòng "Dự kiến
nhận = +3 ngày" không có căn cứ ở màn theo dõi (Phase 4), giữ "gửi đi dd/mm".

**Lát 5 — ĐẠT (sáng 2026-09-21).** Khu quản trị v2 trọn bộ: tổng quan (`.seg`
là link `?days=`, hàng đợi có hành động, xếp hạng, khách mới/quay lại), đơn hàng
(tab đếm, chọn dòng + hàng loạt, `RowMenu` portal), chi tiết đơn (bàn giao với
mã vận đơn bắt buộc, huỷ có lý do, ghi chú), đợt bán + `/admin/drops/[no]` mới
(năm KPI, bảng theo mẫu 77.500.000₫), khuyến mãi (tạm dừng / tạo mã / sao chép),
phiếu giao `/admin/slips` in được; kho mô phỏng `brand.adminSim` sống qua
reload, đặt lại có xác nhận; L8; bốn việc tồn của lát 4 (đơn thiết bị sang
`brand.orders` bền, `.alert.note`, bỏ icon nút vô hiệu, bỏ "+3 ngày"); 719 test.
Phiên chính tự chạy typecheck + 719 test, đo lại 6 màn × 1440 so mock (trùng
từng số), đi luồng nhận tiền / bàn giao / huỷ / tạm dừng mã / tạo đợt / đặt lại.
Chấp nhận các lệch có lý do (đơn vị vận chuyển = hai hình thức giao có thật vì
chưa ký đối tác; menu bỏ mục không có việc thật; ngày gõ tay dd/mm/yyyy thay
`<input type=date>`; overlay chỉ sống trong khu quản trị). Việc nhỏ còn lại →
lượt dọn cuối: xoá 4 component quản trị không còn ai gọi (`OrdersTable`,
`DropsTable`, `PromotionsTable`, `PrintButton`), ô giá sản phẩm mới để trống
kèm placeholder thay vì `0`; phiên chính thêm 12 route quản trị (1280) vào
`tools/layout-sweep.js` rồi quét toàn app lần cuối.

## Đợt nâng cấp UI v2 — XONG *(sáng 2026-09-21)*

Sáu lát qua agent `ui-implementer` (Opus 5), mỗi lát phiên chính đo lại độc lập
rồi mới sang lát sau; lát 6 dọn dẹp (xoá 4 component quản trị chết, ô giá sản
phẩm mới để trống, con trỏ bàn tay cho nút ⋯). Lượt quét cuối của phiên chính
bằng `tools/layout-sweep.js` (nay phủ 19 route cửa hàng × 390/1280 **+ 12 route
quản trị × 1280**, thêm máy dò chữ dưới 11px): **50 lượt, 0 lỗi console, 0 tràn
ngang, 0 chữ < 11px, 0 hộp inline sai, 0 ảnh lệch tỉ lệ, 0 phần tử bị cắt, 0 con
trỏ mũi tên**; 40 phát hiện vùng chạm đều là hai miễn trừ của DESIGN.md §5 (38
nút icon nav rộng 40px, 2 tên mẫu trên thẻ). `tsc` sạch · **720 test** · `next
build` sạch, 54 trang · CSS 16 tệp / 3.568 dòng. L1–L12 đã đóng hết.

**Quyết định trong đợt:** QĐ-21 (agent thực thi, phiên chính duyệt), QĐ-22 (sàn
chữ 11px), giữ lựa chọn thẻ kèm ghi chú, B (đơn thiết bị vào "Đơn của tôi", lưu
bền `brand.orders`), overlay mô phỏng chỉ sống trong khu quản trị.

**Cố ý chưa dựng (nút mock có mà chưa có việc thật):** form sửa mã khuyến mãi
(kéo theo "Nâng giới hạn", "Nhân bản", "Kết thúc sớm"), form sửa địa chỉ giao
trong đơn quản trị, trình thêm mẫu hé lộ, "Gửi lại xác nhận cho khách". Bốn cổng
cũ vẫn đứng: ảnh sản phẩm thật, ba `NeedWrite` (giới thiệu, đổi trả chi tiết,
liên hệ) + hai ô mới (mã QR nhận tiền, cổng thẻ), backend, `/hyd`.

## Đợt nâng cấp UI v3 — bước 1: mock CHỜ DUYỆT *(21/09/2026)*

Yêu cầu: "build v3 với nhiều chức năng và nâng cấp UI mạnh mẽ hơn nữa … cải
thiện layout, UX/UI, màu sắc chủ đạo cho brand và wording tinh tế, chuyên
nghiệp hơn; vẫn phải có mock UI để review trước." Hỏi bốn câu bằng công cụ hỏi
có cấu trúc, người dùng chốt: **so ba hướng màu trên cùng bộ thành phần**;
**bố cục biên tập cho cửa hàng, kỷ luật cho quản trị**; **giọng trung tính
không xưng hô** và tìm **từ thay "đợt"** ("đợt nghe hơi đơn giản và không có
màu sắc riêng cho brand"); **cả bốn nhóm chức năng** (size & vừa vặn, báo hàng
về + thông báo, tra cứu đơn sâu hơn, quản trị đủ việc) và đề xuất thêm.

**Chẩn đoán v2** (đo trên build 3200, 390/1280): vàng phủ 6–10 mảng mỗi trang
(9/10 là nút thẻ) nên không chỉ được hành động chính; bố cục là khuôn "tiêu đề
+ hàng thẻ", số đợt chỉ là kicker 11px; 17 cỡ chữ, 17–28 giá trị lề mỗi trang;
kiểm kê 1.410 chuỗi (agent): 12 khái niệm có 2–4 tên, "bạn/tôi/chúng tôi" trộn
(18/11/8), 0 dấu chấm than, 9 câu "chờ chốt" trên trang công khai. Bản kiểm kê
đầy đủ ở scratchpad của phiên (`copy-inventory.md`, 1.616 dòng, có file:dòng);
chép vào `tasks/` khi người dùng chốt giọng.

**Quy trình thế giới hình ảnh (skill impeccable, new-work §3):** bảy thế giới
từ đời sống khách 18–28 xếp theo cộng hưởng — phiếu cắt xưởng · lịch bloc ·
tạp chí số · nhãn dệt · biển hiệu vẽ tay · tem phiếu/vé số · bảng giờ tàu.
Bộ gieo (`concept-seed --scope direction --mode persuade`, khoá **224e45fb**)
chỉ định **ứng viên 3 = Tạp chí số**. Sáu thách thức từ catalog cân trên hai
trục (khách nhận ra mình / sản phẩm rõ ràng): Raygun **cạnh tranh** (thắng trục
khách, thua trục rõ ràng — giữ làm phương án bạo hơn); desktop một-bit, bàn cắt
phim, terminal, cyclorama, rừng dạ quang **loại** — mỗi cái tặng một kỷ luật,
ghi thành dòng "nâng" trên thẻ SỐ. Sau khi người dùng chọn: ping
`concept-seed --kind <assigned|pick|challenger|canon> --from 224e45fb --scope direction --mode persuade`,
rồi viết hợp đồng hướng vào surface brief (`impeccable surface-brief write`)
trước khi agent viết code.

**Đã dựng ở `prototype/v3/`:** ba màn (trang chủ, danh mục, PDP) + bộ thành
phần + trang giọng chữ + bảng duyệt; một bố cục biên tập, ba "da" đổi bằng
token trên `html[data-dir]`: **SỐ** (mực tím `#4b34a3`, giấy trắng, số bìa in
đè ảnh, mục lục có dấu dẫn; tuỳ chọn màu theo số), **PHIẾU** (mực than xanh
`#2743b8`, liên hồng/vàng, gạch đếm, dấu), **NHÃN** (vải đen `#171410`, chỉ mật
ong `#eba400` — hướng người dùng ghim). Từ vựng đổi trực tiếp: Số · Phiên · Tập ·
Drop · Đợt. Chín vai chữ, chín bậc khoảng cách nền 4px, hai họ chữ giữ nguyên.
Chức năng có mặt ở bước 1: bảng số đo (số đo mô phỏng có nhãn), size ghi nhớ,
báo khi có lại (chỉ đúng khi một đơn bị huỷ/trả — nói thẳng trong sheet), nút
túi ở góc ảnh thay thanh nút vàng, thanh mua dính đồng bộ size.

**Đo lượt cuối (playwright, 3 hướng × 3 màn × 390/1280 + bộ thành phần + bảng
duyệt):** 0 lỗi console, 0 tràn ngang ở màn cửa hàng (bảng duyệt là công cụ
desktop, cuộn ngang trong khung ở 390), 0 chữ < 11px, mọi cặp chữ/nền của ba
hướng đạt AA (tính ngay trên trình duyệt ở `brand.html`), vùng chạm 44px sau
ba lần vá (lớp phủ ±5, khe chip 10px, nút túi 44, liên kết cuối danh mục; phiếu
PDP dính cuộn được bên trong khi cao hơn khung — cần agent làm sticky theo chiều
cuộn khi thực thi); chân trang desktop 32px và nút icon nav 40px giữ hai miễn
trừ cũ. Lệch mock so fixture đã soát: mô tả theo loại và alt ảnh đọc từ `kind`
thật; bốn số còn (NGUỘI 6 · THAN 5 · GIÓ 4 · ĐÁ 9) là số chọn, ghi rõ.

**Cần người dùng chốt (8 câu trên bảng):** hướng · từ thay đợt · màu theo số ·
nút túi trên thẻ · "báo khi có lại" có đúng mô hình · số đo mô phỏng hay chờ
· "chờ chốt" trên trang công khai · phạm vi bố cục bước 2. Bước 2: mock đủ 17
màn trong hướng đã chốt (tài khoản thêm Thông báo, Tra cứu đơn; quản trị đủ
việc còn thiếu, giữ khung). Bước 3: agent `ui-implementer` từng lát, phiên chính
duyệt lại như v2 (QĐ-21).

**Bước 1 ĐÃ CHỐT 22:38 · 21/09/2026** (người dùng dán kết quả từ bảng duyệt):
hướng **NHÃN** ("mệnh kim, thích màu đen; vàng/đen gợi con ong và phong cách
phố — có thể định hình phong cách và tên app sau này"); bộ thành phần, giọng
chữ, ba màn: Duyệt; từ thay "đợt": **Số**; toàn bộ màu thương hiệu là mật ong
(không màu theo số); **giữ thanh nút dưới thẻ** (mock đổi thành viền mực, vàng
chỉ cho hành động chính — nếu muốn thanh vàng như v2 thì đổi một dòng CSS);
**bỏ "Báo khi có lại"**, giữ mục Thông báo; số đo mô phỏng có nhãn; "đang chuẩn
bị" cho trang công khai; bước 2 không đổi bố cục thêm; 12 chức năng giữ.
Câu 1 ghi 'Chốt "SỐ"' được hiểu là từ "Số" (bố cục bìa-số dùng chung cho cả
ba hướng, không mâu thuẫn) — đã nêu để người dùng sửa nếu hiểu sai.
Hợp đồng hướng đã ghi vào surface brief `.impeccable/surfaces/app-page-tsx.md`
(6 khối, seed 224e45fb). Không ping telemetry vì hướng người dùng ghim không
thuộc bốn loại assigned/pick/challenger/canon của bộ gieo.

**Bước 1b — bộ chữ, CHỜ DUYỆT:** người dùng muốn "một bộ font ấn tượng và phù
hợp", cặp hiện tại "rất ổn và an toàn". `prototype/v3/type.html`: A Familjen
Grotesk + Be Vietnam Pro (hiện tại) · B Big Shoulders Display · C Bricolage
Grotesque (cả thân) · D Unbounded · E Alfa Slab One — mỗi cặp áp được lên ba
màn qua `html[data-type]` (`v3.type`). Tiếng Việt kiểm bằng API Google Fonts
(Gloock, Schibsted Grotesk, Bodoni Moda, Archivo Black, Sora, Teko, Passion One,
Instrument Serif không có subset tiếng Việt → loại). Font tải về
`prototype/v3/fonts/` (21 woff2, OFL, chỉ latin/latin-ext/vietnamese) qua
`fonts-trial.css`; khi thực thi tự chứa qua next/font. Đề xuất của phiên chính:
B nếu muốn "phố", C nếu muốn "ấn tượng mà đọc tốt".

**Bước 1b ĐÃ CHỐT 22/09/2026:** bộ chữ **D · Unbounded + Be Vietnam Pro**
(Unbounded 800 cho số, tiêu đề, tên mẫu, wordmark; Be Vietnam Pro cho mọi chữ
khác; font tự chứa `prototype/v3/fonts/`, khi thực thi qua next/font subset
vietnamese). Hai chỉnh nhỏ theo yêu cầu: viền ô nhập hạ từ `#948b78` (3,37:1)
xuống `#9c937f` (3,05:1 — mức nhạt nhất còn đạt ngưỡng 3:1 của viền điều khiển;
nhạt hơn nữa phải đổi cách nhận diện ô), header thêm bóng mềm
`0 10px 24px -14px rgba(23,20,16,.28)`.

## Đợt v3 — bước 2: mock 17 màn còn lại CHỜ DUYỆT *(22/09/2026)*

Cùng hướng NHÃN · chữ D · từ "Số" · giọng đã duyệt. Tệp mới ở `prototype/v3/`:
`v3-pages.css` (thành phần bước 2 + khung quản trị), `search` `cart` `checkout`
`order-confirmed` `track` `auth` `account` `account-orders`
`account-notifications` `account-saved` `pages` (about/faq/returns/contact/404)
`so` (sổ Số 04), và 9 màn quản trị `admin-dashboard` `admin-orders` `admin-order`
`admin-so` `admin-promotions` `admin-products` `admin-customers` `admin-log`
`admin-slips`. Runtime `v3.js` thêm: thanh bên quản trị, bộ đếm số lượng chặn
ở số còn, hàng chọn radio, ô đánh dấu + thanh hàng loạt, menu ⋯ fixed, đếm
thao tác mô phỏng. Chức năng có mặt: giữ lại sau, ghi chú cho người giao, QR
của đơn (ô chờ), tra cứu không cần đăng nhập + hoá đơn in, mục Thông báo, sổ
các số, gợi ý khi gõ, sửa địa chỉ giao, gửi lại xác nhận (ghi nhật ký), form
sửa mã (+ nâng giới hạn, nhân bản, kết thúc sớm), điều chỉnh tồn kho size×màu
có lý do, nhãn khách suy từ đơn, nhật ký thao tác, CSV theo Số. Bảng duyệt có
mục "Bước 2" với 21 khung + 6 câu chốt bước 2.

**Đo:** 38 lượt chụp (12 màn cửa hàng × 390/1280, 9 màn quản trị × 1280, 5
lớp nổi): 0 lỗi console (một lượt lỗi mạng tạm `ERR_NO_BUFFER_SPACE`), 0 tràn
ngang, 0 chữ < 11px; vùng chạm vá năm vòng (bộ đếm 46/44, liên kết đứng riêng
`.lnk.tap`, ô đánh dấu ±13, mã đơn trong bảng có lớp phủ, ô tìm 44). Lỗi thật
bắt được nhờ ảnh và máy dò: **va chạm class** `.sec` (mục trang) với
`.btn3.sec` (nút phụ) đẩy mọi nút phụ xuống 48–64px và `.num` (số lớn) với
`td.num` (căn phải) — bài học cũ của dự án lặp lại, đã đổi thành
`.sec:not(.btn3)` và `td.right`; `.s.v3` đặt cột làm khung quản trị xếp dọc
(`.s.adm3{flex-direction:row}`); quy tắc `span{display:block}` chung làm từ
"Số" rơi dòng (đổi sang con trực tiếp); `[data-show]` không có `data-sim` không
chạy; menu đóng khi cuộn nên script duyệt phải bấm bằng DOM; hover trắng trên
nhạt ở thanh hàng loạt; viền mảnh + bóng rộng ở menu (bỏ bóng). Chi tiết dữ
liệu mô phỏng thêm cho bước 2 (đơn DH-2423…2432, khách, Số 03/04, mã BANTHAN,
MO05, DOT04) đều ghi "mô phỏng" trên màn; hết-lúc-nào của Số 04 suy từ đơn khi
thực thi.

**Chờ người dùng:** duyệt 21 khung bước 2 và 6 câu (thanh bên đen, tài khoản
ngân hàng/QR, hai danh sách giữ-lại-sau vs đã-lưu, khách tự huỷ đơn chưa thanh
toán, ngưỡng nhãn khách, thứ tự sáu lát thực thi). Sau đó: brief agent lát 0.

## Đợt v3 — rà 22/09: khoảng cách, canh hàng, cỡ icon; badge CHỜ CHỐT *(22/09/2026)*

Người dùng báo "khá nhiều lỗi về spacing và alignment", "một số icon quá nhỏ",
và muốn vài phương án badge. Cách làm: hai máy dò mới trên cả 27 trang
(`scratchpad/v3/probe-icons.js` đo hộp, mực và nét của từng icon theo ngữ cảnh;
`probe-align.js` đo lệch tâm trong hàng flex, icon lệch dòng chữ, mép trái
không khớp, và biểu đồ mọi giá trị margin/padding/gap) cộng 130 lát ảnh 390/1280
(`cap-slices.js`) xem bằng mắt. Sửa gom trong `scratchpad/v3/fix6.py` và
`fix7.py`, mỗi thay thế có assert số lần khớp.

**Icon.** Bộ Iconsax vẽ đều: ở hộp 15px mực dài ~13,4px cho hầu hết glyph;
ba glyph có mực nhỏ hơn hẳn là `plus`/`minus` (8,4px) và `check` (6,3px) —
đúng những cái người dùng thấy "quá nhỏ". Sửa theo đúng tiền lệ `<Tick>` trong
`components/icon`: `v3.js` có bảng `OPTICAL` cắt viewBox vuông cho ba glyph này
(plus/minus `4 4 16 16`, check `6.5 6.5 11 11`), sau sửa mực 12,7–13,6px, nét
1,4–2,0px (check cùng nét với tick ở ô đánh dấu). Chevron `down`/`chev`/`back`
giữ 10,8px vì mũi tên nhỏ hơn là chuẩn. Thang cỡ chốt: **12 dấu (tick), 15 nhỏ
(cạnh chữ 12–13px), 18 thường (nav, nút icon), 28 trạng thái trống** — menu ⋯
16→15, toast 16→15, cam kết giỏ 14→15. `.ic` giờ `inline-block; vertical-align:
-.18em` nên icon trong đoạn chữ nằm đúng dòng (chú thích tổng quan quản trị
từng rơi icon xuống dòng riêng). Khi thực thi: agent chuyển `OPTICAL` vào
`Icon.tsx` (cùng chỗ `INK`), không đổi paths.

**Khoảng cách, canh hàng (sửa trong `v3.css`, `v3-pages.css`, HTML):**
- Thẻ mẫu ở 390: cột lưới `1fr` bị dòng tên…giá đẩy thành 166/160px (ảnh hai
  cột lệch nhau) → `minmax(0,1fr)`, dòng mục lục cho phép xuống dòng, giá
  `margin-left:auto`.
- Số điện thoại và khoảng ngày gãy giữa chừng ("0912 345 / 678", "23/09 – /
  25/09") → `&nbsp;` trong 38 chỗ hiển thị (không đụng `value=` của ô nhập);
  swatch màu + tên trong giỏ bọc `.nw`; ô ảnh+tên trong bảng quản trị `td.nw`.
- Từ vựng `<span class="tm">` giờ `display:contents` toàn cục (trước chỉ ở nút
  và tiêu đề panel) → hết lệch trong hàng flex.
- Tra cứu đơn: dòng trợ giúp nằm dưới một ô làm hai ô lệch đáy → đưa ra ngoài
  `.row2`, dưới cả hai; bỏ "của bạn" (giọng không xưng hô), cả "Đơn của bạn"
  ở thanh toán → "Đơn gồm 2 món".
- Điện thoại hẹp ≤480: `.row2` xếp một cột (nhãn dài từng đẩy hai ô lệch).
- Sổ Số 04: bảng "hết lúc nào" đổi sang subgrid, ba cột thẳng hàng qua các
  dòng, số căn phải; hàng 9→10px.
- Panel: `h2 .meta` đồng bộ với `h3 .meta` (chữ thân, không display); mục con
  trong cột tài khoản 48→32px; `.picks3` trong panel bỏ viền trên trùng.
- Nhãn "nhãn dệt" `.tag3` 22→24px, chấm thông báo 7→6px, gap tem nav 7→8,
  gap liên kết nav 22→24, gap swatch 5→6, dòng mục lục bìa 11→12px, "quên mật
  khẩu" 11→12px, thẻ KPI 13→12px, thẻ đăng nhập 30→28px, lỗi ô nhập 11,5→12px
  và icon lỗi ghim dòng đầu khi thông báo dài, thanh công cụ quản trị 44 đều
  (chip 36→44 cạnh ô tìm 44).
- Ticket PDP chỉ dính khi màn ≥860px cao (trước cuộn trong hộp riêng, cắt
  nút Lưu ở 800px).
- Chân trang 390: hai cột dài (giao & thanh toán, về BRAND) chiếm cả hàng, hết
  cột lệch nhau.
- Máy dò sau sửa: 0 lệch tâm hàng flex; hai icon lệch còn lại là do chữ xuống
  dòng nhiều hàng (FAQ, lỗi email) và đã ghim `align-items:flex-start`.

**Badge (bước 2b, chờ chốt).** `badges.html` đặt **ba họ** lên cùng tám chỗ
dùng (thẻ trạng thái, dấu HẾT, nhãn CHƯA MỞ, tem Số trên nav, bong bóng đếm,
nhãn khách, tem mô phỏng, vòng bước): **A Chỉ viền** (hiện tại, đã chỉnh 24px),
**B Vải đen** (nhãn đặc: sống = đen chỉ vàng, chờ/đóng = vải mộc, HẾT có đường
may), **C Con dấu** (Unbounded 11px cách rộng, viền 1,5px, góc vuông, dấu HẾT
nghiêng). Chọn trên `html[data-badge]` (`localStorage` `v3.badge`, nút A/B/C
trên thanh dính của bảng duyệt), quy tắc ở cuối `v3.css`. Đề xuất: B cho cửa
hàng, có thể ghép A cho bảng quản trị. Câu kèm: có đặt "còn 2" lên ảnh thẻ không.

**Chờ người dùng:** kết quả duyệt 21 khung bước 2 + 6 câu, và chốt họ badge
(khung "Chốt họ badge" trên bảng, id `badge`). Sau đó brief agent lát 0 (thêm
`OPTICAL` cho Icon.tsx, thang cỡ icon, họ badge đã chốt).

**Vòng chốt (00:45 22/09):** sau ảnh lát 2 còn sửa: ô giá bên rail 36→44
(quy tắc phải nằm ở `v3.css` vì bốn trang bước 1 không tải `v3-pages.css`),
liên kết trong chữ KPI có lớp phủ ±14, chip "10 dòng mỗi trang" bỏ inline
32px, "Bỏ" ở Giữ lại sau thành hàng 44, họ C xếp thẻ xuống dòng riêng trên
điện thoại (tràn 431/375 ở đơn hàng tài khoản), trang badge thu gọn tem nav
và cột khách ở 390. Quét cuối 71 lượt (27 trang + badge, ba họ A/B/C, 390 và
1280): **0 tràn ngang, 0 chữ dưới 11px, 0 lỗi console** (một `ERR_NO_BUFFER_SPACE`
tạm ở lượt trước). Vài số dưới 44 còn lại là phần tử nằm dưới nav dính hoặc
gần mép dưới khung nhìn ở mốc cuộn cố định của máy dò, hoặc tab đã cuộn khuất
trong dải cuộn ngang; đo lại khi đưa vào giữa màn đều ≥ 44 (`probe-diag*.js`).
Máy dò trình duyệt phải tắt cache (`Network.setCacheDisabled`) khi đo ngay sau
khi sửa CSS: `serve.py` gửi Last-Modified nên Chromium có lúc dùng bản cũ.

## Đợt v3 — bước 2 ĐÃ CHỐT 01:02 22/09/2026 → thực thi lát 0 *(22/09/2026)*

Người dùng dán kết quả duyệt: 21 / 21 khung bước 2 **Duyệt**, badge **B · Vải
đen**, 12 chức năng giữ. Sáu câu: (1) thanh bên quản trị đen giữ, nhưng **số
đếm trên mục thanh bên là badge** như bong bóng giỏ: vàng chữ đen khi thường,
đen chữ vàng trên mục đang mở; (2) chưa có tài khoản ngân hàng, giữ mock "đang
chuẩn bị"; (3) giữ cả hai danh sách Giữ lại sau và Đã lưu; (4) **khách được huỷ
đơn chưa thanh toán** (mock đã có "Huỷ đơn này"); (5) ngưỡng nhãn khách đúng ý;
(6) đồng ý sáu lát theo thứ tự. Thêm: dấu trên ảnh mẫu đã hết đổi thành
**SOLD OUT** (tiếng Anh, hai chữ; từ duy nhất không phải tiếng Việt trên màn
khách, quy ước streetwear; trong câu chữ vẫn "đã hết", "hết size").

**Còn mở: câu đề bìa.** Người dùng thấy "Mười mẫu. Cắt một lần. Hết là hết."
tự cao với brand mới mở. Bảng duyệt có mục "Cần bạn chốt · câu đề bìa" với
bốn phương án đổi trực tiếp trên bìa (`v3.hero`, bảng `HERO` trong `v3.js`):
A giữ nguyên · B "Mười mẫu, mỗi mẫu cắt đúng một lần." · C "Mười mẫu. Cắt một
lần. Không may thêm." · D "Mười mẫu, cắt một lần. Số còn là số thật." (đề
xuất). Chốt xong thì đổi cùng giọng ở câu giới thiệu trang Giới thiệu. Lát 1
(trang chủ) chờ câu này; lát 0 không phụ thuộc.

**Đã cập nhật:** mock (`data-badge="b"` mặc định, SOLD OUT, badge số đếm thanh
bên, banner + mục câu đề trên bảng, dòng thuật ngữ SOLD OUT ở voice.html),
hợp đồng hướng `.impeccable/surfaces/app-page-tsx.md` (badge B, SOLD OUT, thang
icon, câu đề đang chốt), định nghĩa agent `.claude/agents/ui-implementer.md`
(mock v3, token NHÃN, vải đen chỉ ở khối Số, OPTICAL, DESIGN.md còn là v2 tới
lát cuối). Brief lát 0 ở `tasks/briefs/v3-lat-0.md`.

**Lát 0 — ĐẠT (22/09/2026, sau lần chạy lại vì giới hạn phiên).** Agent giao đủ bảy mục
(báo cáo: typecheck sạch, 726 test, build 54 trang, sweep 50 lượt 0 lỗi, 11 ảnh). Phiên
chính đo lại độc lập trên 3200 bằng `scratchpad/v3/review-lat0.js` (gieo phiên
`brand.session`, giỏ `brand.cart`): 13 lượt chụp 390/1280, **0 lỗi console, 0 tràn, 0 chữ
< 11px, 0 chuỗi "đợt", 0 yêu cầu mạng ngoài 3200**; wordmark Unbounded 800 cách .14em;
nav viền `#ece7dd` + bóng mềm; bong bóng đếm đen chữ vàng; thẻ 4:5, nút 40px viền mực,
dấu SOLD OUT đen/vàng có may đứt nét; bộ đếm `−/+` mực 12,7px hộp 15 (viewBox `4 4 16 16`);
thẻ B trên đơn của khách (`#ece7dd`/mực 24px 11px 700, đang giao `#dceffa`/`#0c6289`);
thanh bên quản trị: "Đơn hàng 5" viên đen chữ vàng khi đang mở, vàng chữ đen khi nghỉ;
số điện thoại với U+00A0. So ảnh với mock: nav, chân trang, thẻ, badge khớp.
Lệch chấp nhận: vòng focus giữ `#c28800` (mật ong 1,9:1 không đạt 3:1 cho chỉ báo tiêu
điểm) — đã ghi vào hợp đồng hướng và token `--focus` của mock; tên thứ trong ngày ("thứ
Sáu") chưa có → giao lát 1; `.needwrite` khu quản trị và thanh bên đen → lát 5; dòng Số
04 in "200 / 200" từ dữ liệu; thẻ bỏ băng ảnh vuốt theo màu (mock chỉ một ảnh); giữ tên
lớp `.badge`. CSS chết trong `admin.css` (`.card .corner`, `.card .form`, `.card.swipe
.sizepop`) dọn ở lát dọn dẹp cuối. DESIGN.md vẫn là v2 tới lát cuối (documenter).

**Lát 1 — brief `tasks/briefs/v3-lat-1.md`, giao agent 22/09.** Trang chủ ba trạng thái
theo `home.html`/`so.html`; câu đề và câu dẫn bìa nằm trong một hằng `HOME_COVER`
(`lib/lexicon.ts`), mặc định phương án A tới khi người dùng chốt; thêm tên thứ vào
`lib/datetime.ts`; số mẫu bằng chữ; mô tả họ suy từ `kind`.

**Lát 1 — ĐẠT (22/09/2026).** Agent giao trang chủ ba trạng thái; phiên chính đo lại độc
lập bằng `scratchpad/v3/review-lat1.js` (8 lượt 390/1280 ba trạng thái + nhắc + sheet):
0 lỗi console, 0 tràn, 0 chữ < 11px, 0 "đợt", 0 yêu cầu mạng ngoài; bìa 390 ảnh 1:1 + nhãn
đen, số 96px mật ong, "Đóng 20:00 thứ Sáu 25/09", đồng hồ ba cặp; 1280 lưới 5/7, số
168px, **bìa cao 776px, "Còn ít" nằm trọn trong khung nhìn 1280×800** (sau sửa); "Theo
loại" mô tả suy từ `kind`; "Bốn quy tắc" không icon; teaser Số 06 hai ô + "Chưa mở";
dòng past "Số 04 · đã đóng 19/06 · 200 / 200 đã bán". Ba lỗi phiên chính bắt được và
agent đã sửa: ảnh bìa desktop kéo cả bìa lên 1107px (ảnh giờ `fill` + `object-fit:cover`,
nhãn đen quyết định chiều cao), bìa Số đã đóng mượn ảnh hero Số 05 (giờ ảnh mẫu đầu của
Số đó), trạng thái sắp mở không có `h1`; hai quyết định: padding trên nhãn đen desktop
16px như mock render (brief ghi 48 là sai), **`.s .btn::after` 3px toàn hệ** (máy dò
nghiêm mất 1px mỗi mép; DESIGN.md §5 phải sửa "2px" → 3px khi documenter chạy); dải nhắc
dùng tên thứ. Chấp nhận: `countWord` tới 12; hai nút bìa không icon (theo mock); CSS v2
của trang chủ chết (~150 dòng) dọn ở lát cuối; `/products` bỏ qua `?drop=`; sheet size
vẫn bản lát 0 (đổi ở lát 2). Hằng `HOME_COVER` giữ câu A tới khi người dùng chốt.

**Lát 2 — brief `tasks/briefs/v3-lat-2.md`, giao agent 22/09.** Danh mục, trang sản
phẩm, tìm kiếm (kể cả gợi ý khi gõ), sheet size v3 dùng chung, sheet bảng số đo, menu sắp
xếp `.menu3`, trạng thái trống `.empty3`.

**Lát 2 — ĐẠT (22/09/2026, sau lần chạy lại vì giới hạn tuần).** Agent giao danh mục, PDP,
tìm kiếm + gợi ý khi gõ (761 test, build 54 trang, sweep sạch). Phiên chính đo lại độc lập
bằng `scratchpad/v3/review-lat2.js` (19 lượt 390/1280 kể cả sheet lọc, sheet size, menu sắp
xếp, sheet bảng số đo, buybar, gợi ý đang mở): 0 lỗi console, 0 tràn, 0 chữ < 11px, 0
"đợt", 0 yêu cầu mạng; chip → URL `?fit=OVERSIZE` (đen chữ vàng), rail 232 dính, ô giá 44,
menu `.menu3` fixed viền mực không bóng mục 40px, sheet size CTA đổi nhãn, ticket dính ở
1280×900 và không dính ở 1280×800, meter 49%, mẫu hết đủ trạng thái, gợi ý "kh" ba nhóm +
`<mark>` + ↑↓. Ba việc sửa sau duyệt (đã đo lại): hàng size đang chọn dùng cặp `--sel/--sel-ink`
(đen chữ mật ong, brief ghi trắng là sai); một kết quả tìm → `.grid3.single` một cột trần
340px (thay L7, xoá `SearchHit.tsx`); tiêu đề trang theo mock ("Số 05 · mười mẫu", "KHÓI · Số
05", "Tìm “áo” · Số 05"). Lệch chấp nhận: số "05" đầu danh mục `--brand-text` (mật ong 1,9:1
trên trắng; đã sửa mock theo), vòng viền chấm màu `--line`, tên lớp đổi vì va chạm (`.sz`→`b`,
`.grp`→`.lb`, `.wrap3`→`.inpwrap`, `.btn3.sec`→`.btn.outline`), sheet size không có ô màu (mock),
"Bỏ lọc" chỉ hiện khi có bộ lọc, số đo mô phỏng trong `data/size-chart.ts`, ẩn nút xoá gốc
của Chrome, ô tìm lấy tiêu điểm bằng effect (lỗi `autoFocus` thật), `useAnchoredPanel` đo
khung nhìn bố cục. Còn cho lát cuối: CSS v2 chết (`.hit .sz .szrow .swa2 .pdp2 .buybar
.stockline .chipwrap .tabs.scroll .sortsel .swl .swc .empty .sizesheet .gtable .grid.rel`),
DESIGN.md (`.btn.outline`, `.menu3` lớp portal thứ tư, `.empty3`, `.switch3`, size ghi nhớ
trong `brand.prefs`, bẫy `.kick`: đặt phạm vi sâu hơn không cứu thuộc tính mình không khai
lại). `/products` vẫn bỏ qua `?drop=` (lát 4).

**Lát 3 — brief `tasks/briefs/v3-lat-3.md`, giao agent 22/09.** Giỏ (+ Giữ lại sau), thanh
toán (+ ghi chú cho người giao), xác nhận (đồng hồ 12 giờ, bank "đang chuẩn bị", QR chờ + liên
kết tra cứu thật, ghi chú email "đang chuẩn bị" — đã sửa câu "đã gửi" sai sự thật trong
mock), tra cứu `/track` không cần đăng nhập (mã + số điện thoại, hành trình, hoá đơn in).

**Brief lát 4 và 5 đã soạn sẵn** (`tasks/briefs/v3-lat-4.md`: tài khoản, đơn + khách tự huỷ đơn
chưa thanh toán, thông báo, đã lưu, đăng nhập, trang nội dung, sổ Số `/so/[no]` với `/?drop=N`
đã đóng chuyển hướng; `tasks/briefs/v3-lat-5.md`: chín màn quản trị + `/admin/log`). Giao lần
lượt sau khi lát trước ĐẠT. Sửa mock kèm: `order-confirmed.html` bỏ câu "Xác nhận đã gửi tới…"
(không có máy chủ gửi thư) → "đang chuẩn bị"; `v3.css` số "05" đầu danh mục `--brand-text`.

**Lát 3 — ĐẠT (22/09/2026).** Agent giao giỏ (+ Giữ lại sau `lib/later.ts`), thanh toán (+ ghi
chú giao), xác nhận, `/track` (+ `lib/lookup.ts`, `lib/invoice.ts`, `InvoiceSheet`, `CopyButton`,
`Field3`); 832 test, build 55 trang. Phiên chính đo lại độc lập bằng `scratchpad/v3/review-lat3.js`
(đi trọn luồng thật: gieo giỏ → chặn tồn + toast → Giữ lại sau → Đưa vào giỏ → mã DOT05 →
thanh toán có/không sổ địa chỉ, COD/chuyển khoản, ghi chú → đặt → xác nhận với đồng hồ chạy
từng giây, Chép, hai ô QR → tra cứu đơn fixture DH-2425/0908 221 447 và đơn vừa đặt → bản in):
0 lỗi console, 0 tràn, 0 chữ < 11px, 0 "đợt"/"của bạn"/"đã gửi", 0 yêu cầu mạng, mọi điều
khiển ≥ 44 kể cả trong form địa chỉ và details mở. Hai việc sửa sau duyệt (đã đo lại): menu của
`Select` bỏ da `.selm` v2 → dùng `Menu3` (viền mực, không bóng, hàng 44/40, lật ở mép); sổ địa
chỉ fixture mang nhãn (`Address.label`, Trần Minh Anh "Nhà" + "Công ty", bản ghi cũ điền
"Nhà"). Lệch chấp nhận: số ví dụ khác mock (DH-2425 là 0908 221 447, VNP-8842204, 820.000₫ —
từ fixture); icon trên nút Áp dụng/Chép/Tải hoá đơn/Tra cứu; "Đưa vào giỏ" không icon (icon
làm nút cao 145px ở 390); hàng giao nhanh "Nhận 23/09 · trong giờ hành chính" (dữ liệu không
có giờ); nội dung chuyển khoản in "DH-1494" có gạch (mock; `transferReference` giữ cho khớp sao
kê lát 5); thanh bước sáng bước 3 khi địa chỉ đủ (`checkoutStep` v2); một ô số điện thoại cho
cả liên hệ và người nhận (mock); QR là ô chờ + liên kết thật; nút "Tra cứu" đầy cột ≤ 460.
Ghi cho documenter: bẫy tên lớp thứ sáu `.ph` (khung ảnh 4:5 của `cards.css` đè placeholder
`Select` → dùng `data-ph`); `scroll-margin-top:72px` cho điều khiển trong `.s.v3` vì nav dính
che phần tử được trình duyệt cuộn tới; `.btn.wide` = `width:100%`; `.note3` atom; `Countdown`
có `mode="hms"`; `.menu3 .tally`. Phiên chính thêm `/track?code=DH-2425&phone=0908221447` vào
`tools/layout-sweep.js` (52 lượt). CSS/hàm chết chờ lát dọn: khối v2 đầu `checkout.css`,
`.s .steps`, `.qty/.qn/.qntap`, `.sum`, `.empty`, `.selm`.

**Lát 4 — brief `tasks/briefs/v3-lat-4.md`, giao agent 22/09.**

**Câu đề bìa — người dùng chưa muốn chốt (22/09/2026), giữ câu A hiện tại.** Không còn là
việc chờ; bốn phương án vẫn ở mục "Câu đề bìa" trên bảng duyệt để xem lại khi muốn. App giữ
`HOME_COVER` = câu A; khi đổi chỉ sửa hai chuỗi đó và câu dẫn trang Giới thiệu (`ABOUT_LEAD`).

## QĐ-23 — Bỏ lớp tiện ích Tailwind; tên lớp không được trùng tiện ích *(22/09/2026)*

Người dùng thấy nút "Áp dụng" ở `/cart` có viền như 2px; DevTools hiện `outline` lúc nghỉ;
nhắc lần thứ ba "không muốn bất kì outline nào". Đo được: `.btn.outline` (tên đặt ở lát 2 để
tránh va chạm `.sec`) nhận `.outline{outline-style:solid;outline-width:1px}` do **Tailwind v4
sinh tiện ích cho mọi từ giống tên tiện ích trong toàn thư mục** (cả `prototype/` và CSS); CSS
build còn `.ring{box-shadow}`, `.grid`, `.grow`, `.container{max-width}`, `.table`, `.resize`.
Quét 368 token className: app **không dùng tiện ích Tailwind nào** ngoài `sr-only`.
Quyết định: (1) `globals.css` chỉ import `tailwindcss/theme.css` + `preflight.css` (token và
reset), không import `utilities.css`; `.sr-only` tự định nghĩa; (2) `.btn.outline` → `.btn.ink`;
(3) đường may SOLD OUT đổi sang `::after` viền đứt nét, để thuộc tính `outline` **chỉ còn ở
vòng focus bàn phím**; (4) test `lib/classnames.test.ts` chặn tên lớp trùng tiện ích; `grid`,
`grow` đổi tên hoặc miễn trừ có lý do. Giao agent lát 4 làm trước khi tiếp tục. Máy dò sau sửa:
`scratchpad/v3/probe-no-outline.js` (mọi phần tử trên 23 route, chế độ chuột, không focus:
`outline-style` phải `none`; và liệt kê tiện ích Tailwind còn trong CSS build).

**Lát 4 — duyệt vòng 1 (23/09/2026).** Agent giao đủ (tài khoản, đơn + huỷ phía khách, thông
báo, đã lưu, địa chỉ/hồ sơ/mật khẩu, ba màn đăng nhập, bốn trang nội dung + 404, `/so/[no]`;
907 test, 44 route) và QĐ-23 (bỏ tiện ích Tailwind, `.btn.ink`, `.grid`→`.cardgrid`,
`.grow`→`.fill`, `.sr-only` tự định nghĩa, `lib/classnames.test.ts`, đường may SOLD OUT bằng
`::after`). Phiên chính đo lại: `probe-no-outline.js` **0 phần tử có outline lúc nghỉ trên 23
route, 0 tiện ích Tailwind trong CSS build**; `review-lat4.js` (đặt đơn qua giao diện → thấy ở
Đơn hàng → huỷ → Đã huỷ; nhắc → thông báo; đánh dấu đã đọc; lưu mẫu; đăng nhập sai/đúng;
chuyển hướng `/?drop=4`→`/so/4`, `/so/5`→`/products`, tracking cũ → chi tiết): 0 lỗi console,
0 tràn, 0 chữ < 11px, 0 từ cấm, 0 yêu cầu mạng. Quyết định sau duyệt: **trạng thái đơn quá
hạn chuyển khoản suy từ đồng hồ** (hàm dùng chung `effectiveStatus`, khách và quản trị cùng
đọc; badge Đã huỷ, không nút huỷ); **`soldOutAt` là trường fixture** của mẫu thuộc Số đã đóng
(sổ cửa hàng), `lib/sold-out-times.ts` ưu tiên nó, rồi suy từ đơn, rồi "—"; tab "Đang xử lý"
giữ (gồm đơn đang giao); sửa chữ hoa đầu câu ở sheet huỷ; liên kết chữ desktop trong khung
tài khoản có lớp phủ 44. Chấp nhận: đăng ký không ô số điện thoại; "TA" từ `initials`; câu
lỗi email của `account-form`; `/so/N` đang bán → `/products`, sắp mở → `/#next`. Bẫy mới ghi
cho documenter: lớp phủ chỉ khai `inset` bị luật ≤460px ghi đè `height/transform` (phải viết
đủ longhand); chữ không phải điều khiển vẫn chặn `elementFromPoint`; `.s details summary{color:
var(--link)}` của `admin.css` rò sang FAQ và orderbox (đã tự khai lại); `brand.adminSim` nay
hai chiều (khách ghi `ORDER_CANCELLED_BY_CUSTOMER`, cửa hàng đọc). Mã chết chờ lát dọn:
`SubBar.tsx`, `.s .sub`, khối v2 `account.css`, `.ring`, `transferReference` chờ lát 5.

**Lát 4 — ĐẠT (23/09/2026, hai vòng).** Vòng sửa đã đo lại độc lập (`scratchpad/v3/verify-lat4b.js`
+ ảnh): `effectiveStatus(order, now)` trong `lib/customer-orders.ts` (đơn chờ chuyển khoản quá
`dueAt` ⇒ Đã huỷ · quá hạn chuyển khoản, `cancelledAt = dueAt`), đọc ở hàng đơn, chi tiết,
`/track`, hoá đơn, thông báo, đếm tab; DH-2430 trên màn khách: badge Đã huỷ, không `.deadline`,
không nút huỷ, mốc "Đã huỷ — quá hạn chuyển khoản · 19:50 · 21/09". `Product.soldOutAt` (11 mốc
cho Số 04 và 03 trong `data/catalog.ts`, mẫu cuối đúng giờ đóng), `lib/sold-out-times.ts` thứ tự
đơn → sổ → "—"; `/so/4` đủ sáu mốc, VỎ "· giờ đóng". Sheet huỷ "Hai chiếc về kệ ngay. Không hoàn
tác." Liên kết chữ trong khung tài khoản: lớp phủ viết đủ longhand (bẫy luật ≤460px), "Sửa"/"Xoá"
nằm ngang gap 22, hàng `.kvs` "Đổi" cao 44; đo nghiêm ≥ 43–47. Đơn đã thanh toán: "Đơn đã thanh
toán: liên hệ cửa hàng để huỷ." + `/contact`. 922 test, sweep 58 lượt sạch. Tổng CSS 17 tệp /
5.745 dòng. Lát 5 dùng chung `effectiveStatus`, `sold-out-times`, `ORDER_CANCELLED_BY_CUSTOMER`.

**Lát 5 — brief `tasks/briefs/v3-lat-5.md`, giao agent 23/09.** Chín màn quản trị + `/admin/log`.
Sau lát 5: lát dọn (mã/CSS v2 chết đã liệt kê ở từng lát; bốn chỗ "7 ngày" gõ tay →
`RETURN_WINDOW_DAYS`; `SubBar`, `.s .sub`, `.selm`, `.ring`, khối v2 trong `home/listing/product/
checkout/account.css`, `transferReference` nếu lát 5 không dùng), rồi documenter (DESIGN.md) và
finish review theo hợp đồng hướng.

**Kết thúc đợt v3 — thứ tự đã chốt (23/09/2026):** lát 5 (đang chạy) → **lát 6 dọn** (brief
`tasks/briefs/v3-lat-6-don.md`: xoá mã/CSS v2 chết theo danh sách từng lát, gom hằng, so ảnh
trước/sau 36 lượt không khác pixel ngoài đồng hồ) → phiên chính chụp `.impeccable/review/desktop.png`
+ `mobile.png` (full-page từ đầu trang, tắt motion), chạy `impeccable detect --json` trên `app/`
một lần → `impeccable-documenter` viết DESIGN.md (đầu vào: hợp đồng hướng, `reference/document.md`,
PRODUCT.md, gốc dự án) → `impeccable-finish-reviewer` (gói: yêu cầu gốc, câu trả lời đã chốt,
artifact `app/`, ảnh review, hợp đồng hướng, phát hiện hook/detector, thẻ hướng NHÃN từ bảng duyệt
làm QUALITY BAR vì là thế giới tự dựng không có card catalog, mock v3 là "approved comp" vì
người dùng duyệt từng khung, `craft-floor.md`) → áp fix theo disposition → verdict pass.
Gói reviewer soạn ở `.impeccable/review/packet.md`. `/admin/log` đã vào `tools/layout-sweep.js`.

## QĐ-24 — Đồng hồ mẫu: app sống trong 24 giờ sau mốc neo 18:50 20/09/2026 *(23/09/2026)*

Phát hiện khi duyệt lát 5: app dùng đồng hồ thật, dữ liệu mẫu neo tuần 20/09 → hôm nay mọi đơn chờ
chuyển khoản đã quá hạn (tab đếm 0, hàng đợi không còn "Đã nhận tiền"), tối 25/09 cả cửa hàng lật
sang "đã đóng", 02/10 Số 06 "mở" với hai mẫu chưa có giá. Dời ngày fixture chỉ mua thêm vài ngày.
Quyết định: `lib/clock.ts` `demoNow()` = neo + ((now − neo) mod 24h): thuần theo `Date.now()` nên
server/client khớp, giữ giờ trong ngày thật, ngày luôn là 20–21/09; mọi `now` mặc định trong lib và
components đọc `demoNow()`; `new Date()` chỉ còn trong `lib/clock.ts` và test; `.simbar` ghi rõ.
Hệ quả chấp nhận: 18:50 thật mỗi ngày đồng hồ quay về; đơn đặt trên thiết bị mang giờ mẫu. Đổi về
đồng hồ thật = một hàm. Giao agent lát 5 làm trước lát dọn, kèm: lớp phủ danh nghĩa ≥ 46 cho
`.btn.sm`/`.seg3`/`.crumb`/liên kết đứng dòng trong quản trị; nút lưu tồn kho `disabled` khi có chặn.

**Lát 5 — duyệt vòng 1 (23/09):** kịch bản `scratchpad/v3/review-lat5.js` (26 trạng thái, mở menu,
thanh hàng loạt, sheet, panel bàn giao, form sửa địa chỉ, print) + `probe-no-outline.js`: 0 outline, 0
tiện ích Tailwind, 0 tràn, 0 chữ < 11px, 0 lỗi console; luồng bàn giao → `/track` thấy mã vận đơn;
sửa mã, tồn kho (+1, chặn vượt số đã cắt), nhật ký hệ thống + cửa hàng, phiếu in ẩn khung, đặt lại
xoá overlay. Chấp nhận (agent nêu): `shopOrders` cho ba loại hành động sang phía khách (khách huỷ,
bàn giao, huỷ có lý do; `ORDER_PAID` dừng ở quản trị); bỏ "về kệ" vì tồn kho là fixture; không bịa
giờ "hết hàng"/"hết lượt"; COD ghi "thu khi giao" không cộng phụ thu vào cột giá trị; `.simbar` ẩn
"Đặt lại" khi 0 thay đổi; `.menu3` 40px desktop; gộp `DropDetailScreen` vào `AdminDropsScreen`;
`promoState` biên `>=`. Bẫy mới: `.s .sub` của `nav.css` là thanh nav phụ (reset trong `.s.adm3`),
`.s .lbl` in hoa (nhãn biểu đồ đổi `.peak`), preflight `img{display:block}` (ô bảng `img.th`
inline-block). Mã chết cho lát dọn (từ agent): `components/ui/Modal.tsx`, `components/account/
Timeline.tsx`, `components/table/*` (chỉ `/system` dùng), `admin.css` dòng 1–736, `table.css`, khối
`.modalwrap` trong `sheet.css`, `lib/admin-rows.ts` (`dropRows promoRows productRows customerRows
simPromoRows promoRowOf PROMO_PAUSED_LABEL PROMO_STATE_LABEL`, type `ProductRow CustomerRow PromoRow`,
`catalogByDropDesc`), `lib/admin-sim.ts` (`isSimulatedOrder isCustomerCancelled`), `HandoverForm`
`EXPRESS_LABEL`; CSS nay 16 tệp / 6.261 dòng.

**Lát 5 — ĐẠT (23/09/2026, hai vòng).** Vòng 2 (QĐ-24 + vùng chạm + nút vô hiệu) đo lại độc lập
(`scratchpad/v3/verify-lat5b.js`): `new Date()` chỉ còn trong `lib/clock.ts` và test; 33 lượt tải
(21 route × 1–2 bề ngang) **0 lỗi/cảnh báo console** (không React #418/#425); `/` và `/admin` cùng
in "đóng sau 4 ngày 12 giờ" (giờ mẫu 21/09, giờ thật trong ngày); tab "Chờ chuyển khoản 2"; DH-2431
`.nextstep` "xác nhận đã nhận tiền"; sheet huỷ: nút xác nhận `disabled` "Chọn lý do" tới khi chọn;
"Đã nhận tiền" → toast + nhật ký "đánh dấu tay · Cửa hàng", khách **không** thấy (`ORDER_PAID` dừng
ở quản trị, test canh); vùng chạm nghiêm: nút hàng đợi 44, `.seg3` 46, "Xem dạng bảng" 46; 0 outline;
1.048 test (45 tệp), 57 trang, sweep 59 lượt sạch. Thêm từ agent: `lib/clock.test.ts` canh dữ liệu
(mọi mốc fixture ≤ neo; mọi hạn/giờ đóng > neo + 24h; `effectiveStatus` bất biến trong ngày mẫu);
`.seg3` bỏ `overflow:hidden` (cắt lớp phủ, §5 bẫy 1); chân sheet portal cần lớp phủ riêng; ô lưới tồn
kho 46 vì `<input>` không mang `::after` (§5 bẫy 5); `.simbar` in ghi chú đồng hồ mẫu.

**Lát 6 — dọn dẹp, brief `tasks/briefs/v3-lat-6-don.md`, giao agent 23/09.**

**Lát 6 — ĐẠT (23/09/2026).** Agent xoá 19 tệp (route `/system` + `components/table/*`, `table.css`,
`Modal` `Field` `Chip` `Timeline` `SubBar` `DropBand` `Faq`), CSS 6.623 → 4.077 dòng (17 tệp), hàm chết
trong `admin-rows` `admin-metrics` `admin-sim` `HandoverForm`; gom `RETURN_WINDOW_DAYS`/`TRANSFER_HOLD_HOURS`
(bài học: gộp chuỗi thành **một** template literal, vì tách nút văn bản JSX dịch chữ dưới 1px); giữ
`transferReference` (AdminOrderScreen dùng), giữ các khối `.s …` cửa hàng nằm nhờ trong `admin.css`
(`.s details .row.snag .fixes .needwrite .rules`) — brief ghi "xoá dòng 1–736" là sai, agent xoá theo
luật đã chứng minh chết; bỏ `.s .sub` (thanh nav phụ v2 rò lên `span.sub`, đo không đổi hình). So ảnh
67 lượt có che đồng hồ: 22 khớp byte, 45 khác đều quy về đồng hồ mẫu (65 cụm) hoặc ảnh Unsplash tự
khác giữa hai lần tải (24 cụm, có đối chứng cùng build); `crops.png` và `look/` đã xem. Phiên chính
kiểm lại: typecheck sạch, 44 tệp / 1.025 test, build 56 trang, gỡ `@tanstack/react-table` +
`lucide-react` (0 import), sửa `tools/layout-sweep.js` máy dò `inlineBox` (CSS nesting làm mọi
`CSSStyleRule` có `cssRules` rỗng nên nhánh đệ quy nuốt hết luật — nay đọc luật rồi mới đệ quy; kiểm:
1.142 luật, 155 luật cần hộp khối, 0 vi phạm thật), sweep 59 lượt sạch, 0 outline, ảnh review chụp vào
`.impeccable/review/` (5 tệp, full-page, reduced-motion, không dữ liệu thiết bị) và đã xem hợp lệ;
`impeccable detect --json app components` = `[]`; gói reviewer `.impeccable/review/packet.md` đã điền.
Còn cho vòng sau: `.s .note3` khai trùng ở `base.css` và `product.css` (gộp = dời thứ tự nguồn, phải
đo lại). `impeccable-documenter` đang cập nhật DESIGN.md; sau đó `impeccable-finish-reviewer`.

**DESIGN.md — cập nhật từ bản build v3 (23/09/2026, `impeccable-documenter`).** Giữ khung 10 mục; §5 §6 §9
và QĐ-8/9/10/16 giữ từ v2 (ghi rõ); §1–4 §7 §8 §10 viết lại; sidecar mới `.impeccable/design.json`
(15 màu, 9 vai chữ, 9 snippet `ds-*`). Quy tắc đặt tên: "Vải đen không phải theme", "Một sợi chỉ", "Mật ong
không mang nổi chữ trắng", "Màu không bao giờ là kênh duy nhất", "Vòng focus là outline duy nhất", "Đo,
không ước" (hộp danh nghĩa 46). **Drift ghi nhận, chưa sửa** (không canonize): cỡ chữ lẻ 11,5/12,5px còn
ở `.lead .err .stockline .row .t/.amt details .band .rules div`; `.btn.ghost` và `.box/.radio` 17px là tàn
dư v2; số dòng CSS đo thực 3.740 (16 tệp) — dùng số này; `--fill-bd` chỉ còn một chỗ dùng. Đưa các drift
này vào lát tỉa nhỏ sau finish review (cùng với `.note3` khai trùng).

**Finish review vòng 1 (23/09/2026, `impeccable-finish-reviewer`): `disposition: fix`.** Persistence đạt
(seed 224e45fb chứng thực; không comp round PNG nhưng điểm duyệt của người dùng ở bảng mock). Fidelity: nav,
bìa desktop/mobile, lockup, đồng hồ, Còn ít, lưới, SOLD OUT, Theo loại, Bốn quy tắc, teaser, chân trang,
danh mục, PDP, quản trị đều **match**; TYPE/MATERIAL/GROUND match (lấy mẫu pixel #171410/#eba400/#f4efe6 hai
bên). Ba material fix: (1) ảnh 48×60 của "Theo loại" trống trong ảnh review (lazy từ Unsplash chưa tải lúc
chụp) → agent đặt `loading="eager"` cho năm ảnh `FamilyIndex`, kịch bản chụp đi qua trang và chờ mọi ảnh
có pixel; (2) nguồn gốc raster → phiên chính ghi bảng 19 ảnh Unsplash (khoá → ID) vào DESIGN.md §1 "Ảnh —
nguồn gốc từng raster" và dòng "ảnh thay thế" vào PRODUCT.md Evidence on Hand; (3) hàng đợi `/admin` ba nút
vàng → chỉ hàng đầu mật ong, hàng sau `.btn.ink.sm`. Ceiling ghi nhận: quản trị dễ "băng cảnh báo" đen/vàng;
KPI đúng khuôn số to · nhãn nhỏ (đã duyệt, không tính lỗi). Keep: bìa desktop/mobile không chạm. Packet
sửa cách kể: vòng gieo đã chạy, vòng comp PNG thì không.

**Finish review — verdict pass (23/09/2026 ~09:05, cùng reviewer): `disposition: ship`.** Kiểm 0 hợp lệ trên 5 ảnh
chụp lại (`scratchpad/v3/cap-review.js`, cùng đường dẫn, kích thước không đổi, đầu tài liệu hiện, không vùng
trống). Ba material fix đều **resolved**: (1) `desktop.png`/`mobile.png` đủ 5 ảnh 48×60 "Theo loại" với pixel
thật — `app/page.tsx:277` `loading="eager"` + kịch bản chụp chờ mọi ảnh; (2) nguồn gốc raster — `DESIGN.md:258`
khối "Ảnh — nguồn gốc từng raster" (19 ID Unsplash ↔ khoá `lib/photos.ts`) + `PRODUCT.md:83`; (3) hàng đợi
`/admin` — `admin-1280.png` duy nhất "Đã nhận tiền" DH-2431 mật ong, bốn nút còn lại viền mực
(`DashboardScreen.tsx:215,232` `tone={i === 0 ? "sm" : "ink sm"}`). Hồi quy do đợt sửa: không (bìa, lưới,
teaser Số 06, chân trang, danh mục, PDP không đổi ngoài đồng hồ). Remaining: clear. Phạm vi "ship" là ba điểm đã
chấm, không phải chứng thực toàn bộ bề mặt; ceiling đợt 1 (KPI quản trị khuôn số to · nhãn nhỏ, mật ong còn ở
cột/tem quản trị) là gợi ý, không phải material fix. Phiên chính đo lại cùng lúc: 1.025 test xanh, preview 3200
trả 200, 0 `new Date()` ngoài `lib/clock.ts` + test.

**ĐỢT V3 KẾT THÚC (23/09/2026).** Việc mở sau đợt, chưa giao: lát tỉa nhỏ (`.note3` khai trùng `base.css`/
`product.css`; cỡ 11,5/12,5px lẻ; `.btn.ghost` và `.box/.radio` 17px; `--fill-bd` một chỗ dùng); ảnh thật thay
19 ảnh Unsplash; tài khoản ngân hàng + QR thật; máy chủ email; câu chuyện thương hiệu (NeedWrite); câu đề bìa
(người dùng chưa chốt, giữ A); tắt đồng hồ mẫu QĐ-24 khi có dữ liệu thật (một hàm trong `lib/clock.ts`).

## QĐ-25 — Backend: Supabase Free + Vercel Hobby, đường dữ liệu chỉ qua server *(23/09/2026)*

Người dùng mở cổng backend (mục "Sau Phase 6 — bốn cổng đang đóng"). Bốn ràng buộc họ chốt qua bốn câu hỏi của skill
`idea-refine`: **demo / portfolio chạy thật** (không khách thật, không tiền thật, gắn vào CV); thanh toán = **chuyển khoản
admin đối chiếu tay + COD**, tránh mọi cổng có yếu tố pháp lý, "càng đơn giản càng tốt"; ngân sách **0đ**; hạ tầng
**không ràng buộc**. Research bám nguồn chính thức (skill `source-driven-development`), hồ sơ đầy đủ ở
`tasks/backend.md`: so sánh Supabase / Neon / Convex / Firebase / Appwrite / Cloudflare D1 trên gói miễn phí; rủi ro số
một với demo là *gói miễn phí tạm dừng đúng lúc có người xem* (Supabase Free ngủ sau 7 ngày không truy vấn DB).
Quyết định: **Supabase Free** (Postgres + Auth, vùng `ap-southeast-1`) + **Vercel Hobby** (vùng Singapore). Đọc bằng
Server Components, ghi bằng Server Actions qua server client `@supabase/ssr`; **trình duyệt không gọi Supabase** (giữ luật
0 request ngoài loopback của bộ kiểm); DAL `lib/db/*` với `server-only`, mỗi action tự kiểm quyền; đặt hàng nguyên tử
bằng hàm SQL `place_order()`; quá hạn chuyển khoản vẫn suy khi đọc (không cron nghiệp vụ); RLS + claim `user_role` cho
admin; seed sinh từ `data/*.ts` qua hàm `reset_demo(anchor)`; cron Vercel hằng ngày gọi `/api/health` để dự án không
tạm dừng. Năm câu chốt cùng ngày: (1) bỏ đồng hồ mẫu QĐ-24 khi toàn bộ dữ liệu đã lên DB, seed ngày **tương đối** với
mốc reset; (2) demo công khai — ai cũng đăng ký được, nút đăng nhập thử, admin demo công khai, reset hằng ngày;
(3) `git init` 23/09 + GitHub qua `gh`; (4) agent **`backend-implementer`** (`.claude/agents/`, Opus 5, effort max) thực
thi theo brief, phiên chính viết brief và duyệt output — `ui-implementer` giữ cho UI thuần; (5) hồ sơ `tasks/backend.md`,
brief `tasks/briefs/backend-b*.md`. Lát: B0 nền (schema catalog, seed, DAL, trang catalog đọc DB) → B1 tài khoản → B2 đặt
hàng → B3 quản trị (kèm đồng hồ thật) → B4 triển khai → B5 tuỳ chọn. Không làm: cổng thanh toán, webhook ngân hàng, API
vận chuyển, email/SMS, Realtime, Storage, Cache Components, tự host. `PRODUCT.md` sửa hai dòng phạm vi cùng ngày.

**Lát B0a ĐẠT (23/09/2026, `backend-implementer`, phiên chính duyệt độc lập; commit "B0a: catalog becomes a value").**
Catalog thành giá trị: `lib/catalog.ts` (`Catalog`, `CatalogInput`, `buildCatalog`, `teasersIn`; `currentDropNo` suy = dropNo
lớn nhất có mẫu), `data/colors.ts` (`COLORS` dời sang), `data/fixture-catalog.ts` (`FIXTURE_CATALOG`), `lib/db/catalog.ts`
(`loadCatalog`, `catalogInput`, `server-only`; B0a trả fixture), `components/shop/CatalogContext.tsx` (`CatalogProvider` ở
root layout dựng lại chỉ mục bằng `useMemo`, `useCatalog()`); 15 module `lib/` nhận `catalog` làm tham số đầu (kể cả
`admin-metrics.ts` theo dây chuyền), 17 tệp `app/`, 38 component, 17 tệp test chuyển sang `FIXTURE_CATALOG`. Kiểm: grep gate
đúng một dòng `lib/db/catalog.ts`; tsc sạch; **1.038 test / 45 tệp** (+13); build 56 trang; sweep 59 lượt 0 console / 0 tràn /
0 chữ < 11px / 0 request ngoài 3200, 48 phát hiện `a.ib` có sẵn từ 20/09; 16 cặp ảnh trước sau
(`.playwright-cli/shots/backend/b0a/`) chỉ lệch ở đồng hồ mẫu và `Countdown`, đo từng dải pixel, `admin-products-1280`
trùng md5 khi đặt lại con trỏ. Payload HTML `/` 54.925 → 63.248 B (+15%) vì catalog qua ranh giới RSC ở root — **giữ**,
xem lại khi có dữ liệu thật. Lệch ghi nhận: `data/catalog.ts` không import `COLORS` (import chết); `getDrop` dùng
`dropByNo`; `generateStaticParams` thành async (B0b bỏ). Mở: `photoSetsNeeded` là hàm chết (lát tỉa); `React.cache` cho
`loadCatalog` vào B0b; hook cảnh báo `DESIGN.md` mới hơn `.impeccable/design.json` (drift từ v3, chưa sửa).

**Lát B0b ĐẠT (23/09/2026, `backend-implementer`, phiên chính duyệt độc lập).** Catalog đọc từ Postgres trong Supabase
cục bộ: `supabase/migrations/20260923083130_catalog.sql` (5 enum, 6 bảng sống + 6 bảng `seed_*`, RLS trên cả 12 bảng,
`select` công khai cho 6 bảng sống, `reset_demo(p_anchor)` chỉ `service_role`, `catalog_snapshot()` trả JSON camelCase
với timestamp `+07:00`); `supabase/seed.sql` sinh bởi `scripts/gen-seed.ts` (test chống lệch trong `npm test`);
`lib/db/server.ts` (`createServerClient`, env `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` chỉ server), `lib/db/catalog-snapshot.ts`
(guard tay, 18 test), `lib/db/catalog.ts` (`React.cache` + `connection()` + `rpc`), `lib/db/database.types.ts` sinh máy,
`app/api/health/route.ts` (401 khi có `CRON_SECRET`, 503 không lộ lỗi), `vitest.db.config.mts` (`test:db`, đọc `.env.local`
bằng `node:fs`, không `@next/env`), `.env.example`; bỏ `generateStaticParams` ở PDP. Dependency đúng bốn: `supabase`,
`tsx` (dev), `@supabase/supabase-js`, `@supabase/ssr`. Kiểm: `db reset` 31 s; `supabase start` lần đầu 9'29" (tải image),
lần sau 30 s; md5 seed/types trùng khi sinh lại; **1.061 test / 47 tệp** xanh với stack tắt; **10 test DB** xanh (snapshot
`toEqual` `FIXTURE_CATALOG`, 21/38/152/4/2/6, anon không đọc `seed_*`, không gọi `reset_demo`, idempotent); build sạch với
stack tắt; sweep 59 lượt 0 console / 0 tràn / 0 chữ nhỏ / 0 request ngoài 3200; 16 ảnh `…/b0b/after/` — 10 trùng byte
với B0a, 6 lệch chỉ ở đồng hồ đếm ngược và nhiễu JPEG (đo pixel). `/` 0,016 s, `/api/health` 0,012 s, `{"ok":true,"drops":4}`.
**Hệ quả:** mọi trang là `ƒ` (root layout gọi `loadCatalog()` → `connection()`), kể cả `/about`, `/faq`; giữ tới B3 rồi
xét cache theo tag. Quyết định kèm: `.gitignore` thêm `!.env.example`; kịch bản 16 ảnh chép sang `tools/backend-shots.js`;
A5/A6 trong `tasks/backend.md` đã tick. Khoá service không nằm trong tệp nào; B3 quyết chỗ cất cho nút "Đặt lại".

**QĐ-26 (23/09/2026) — Logo do người dùng tự tạo bằng công cụ ngoài.** Sáu bảng ở `prototype/name/` (`hive.html`, `hive-2.html`,
`hive-g.html`, `hive-bee.html`, `hive-one.html`, `hive-mark.html`) đều bị loại. Đề bài cuối người dùng chốt: một mark **hình tròn**, trong đó
chữ H và con ong là **một hình**; wordmark HIVE giữ như `prototype/name/index.html` (Unbounded 800, cách chữ −0,02em); lockup
**[mark] HIVE.05**, số là ô dữ liệu. Phiên chính đã đưa mô tả phong cách (con dấu tròn, monogram, flat vector một màu, cấm lục giác /
vương miện / vệt bay / gradient) và một prompt tiếng Anh; người dùng tự tạo. **Logo tạm gác**, không dựng thêm bảng. Khi có tệp logo: vòng
mock app (nav, favicon, bìa, tem in) → agent → finish review → DESIGN.md, thay chỗ giữ "BRAND". Backend tiếp tục B1 ngay.

**Lát B1 ĐẠT (23/09/2026, `backend-implementer` trên Opus 5, phiên chính duyệt độc lập).** Tài khoản thật: Supabase Auth email + mật
khẩu qua Server Actions (`lib/actions/auth.ts`: `signIn`, `demoSignIn`, `signUp`, `signOut`, `changePassword`; `lib/actions/addresses.ts`;
`lib/actions/state.ts` với `safeNext` chặn open-redirect), `proxy.ts` chỉ làm mới token bằng `getClaims()` (không redirect), DAL
`lib/db/session.ts` / `profiles.ts` / `addresses.ts` / `account-dto.ts`, `lib/me.ts` (DTO `Me`, `fixtureOrdersOf`), migration
`supabase/migrations/20260923124500_accounts.sql` (`profiles` 1–1 `auth.users` có `handle`, `addresses` với chỉ mục một-mặc-định, RLS 10 policy
`to authenticated` dùng `(select auth.uid())`, 0 policy `anon`, trigger `handle_new_user` + đồng bộ email, 4 hàm ghi sổ địa chỉ `security invoker`,
`reset_demo` bản 2 upsert hồ sơ/địa chỉ theo fixture), `scripts/seed-users.ts` (8 tài khoản thử qua admin API, mật khẩu công khai
`DEMO_PASSWORD=xemthu-2026`, idempotent: 8 tạo / 0 rồi 0 / 8), `supabase/README.md`, `config.toml` (`site_url` 3200, mật khẩu ≥ 8, xác nhận
email tắt có chú giải). Màn: `MeProvider`/`useMe()` thay `SessionContext`, xoá `AccountGuard` + `lib/session.ts`, `app/account/layout.tsx`, mọi
trang `/account/*` gọi `requireMe()`, nút "Đăng nhập thử" + dòng tài khoản thử do server render, sổ địa chỉ và checkout đọc DB khi đã đăng
nhập, mọi câu "chưa có máy chủ / đừng nhập mật khẩu thật" bỏ trừ Quên mật khẩu (vẫn đúng). **Quyết định kèm:** đổi mật khẩu bằng xác thực
lại (`signInWithPassword` trên client vứt đi, khoá publishable) rồi `updateUser` — agent đo được `current_password` bị GoTrue bỏ qua ở cấu
hình mặc định; `updateMe` không dựng vì hồ sơ chỉ-đọc (form sửa là đổi thiết kế, để mở); 404 phía server cho đơn mẫu của người khác (QĐ-16),
mã không tồn tại vẫn 200-rồi-404 sau hydrate tới B2. **Phiên chính sửa thêm:** `vitest.db.config.mts` `fileParallelism: false` (hai tệp dbtest
cùng gọi `reset_demo` → chạy song song làm test idempotent của catalog đọc bảng rỗng, tái hiện 1/2 lần); `tools/layout-sweep.js` và
`tools/backend-shots.js` lấy bản vá của agent (mở phiên bằng nút "Đăng nhập thử" thay khoá `brand.session` đã chết; sweep thêm hai lượt lớp
nổi menu tỉnh); xoá export chết `SIGNED_IN_CUSTOMER`. **Kiểm:** typecheck sạch; `npm test` **49 tệp / 1.058 test**; `npm run test:db` **24 test**;
build sạch 43 route `ƒ` + `ƒ Proxy`; preview 3200; script riêng của phiên chính: `/account` khách → `/sign-in?next=%2Faccount`, sai mật khẩu →
một câu chung, "Đăng nhập thử" → `/account` Trần Minh Anh, 2 địa chỉ / 1 mặc định, 5 đơn mẫu, đơn của mình 200, đăng xuất về `/`, **0 request
ngoài 3200**, 0 lỗi console; sweep **61 lượt** 0 console / 0 tràn / 0 chữ nhỏ / 0 cắt, còn `smallTarget 48` + `loneButton 2` tồn dư từ 20/09;
44 ảnh kịch bản `.playwright-cli/shots/backend/b1/` + 16 ảnh `b1/after/` so `b0b/after/` chỉ lệch ở đồng hồ mẫu (agent đo pixel). Không gói mới.
**Mở:** form sửa hồ sơ; `joined_at` người mới là `now()`; mỗi lần đổi mật khẩu để lại một phiên ngắn hạn 1 giờ không thu hồi (cố ý); chưa đo hai
tab cùng làm mới token.

**Lát B2 ĐẠT (23/09/2026, `backend-implementer` trên Opus 5.5, phiên chính duyệt độc lập).** Đơn hàng trong Postgres:
`supabase/migrations/20260923170000_orders.sql` (3 enum, `order_seq` từ 2432, `orders` + `order_lines` với check theo trạng thái, bảng seed,
RLS 2 policy select own, mọi quyền ghi thu khỏi `anon`/`authenticated`; hàm `place_order(p_input, p_now)`, `cancel_order`, `expire_transfers`,
`expire_and_lock` (khoá đơn quá hạn + mọi ô tồn kho trong một lượt đã sắp xếp, chống deadlock), `track_order`, `receipt_order`, `order_json`,
`my_orders`, `reset_demo` bản 3 đặt sequence theo mã lớn nhất trong seed). **Thời gian nghiệp vụ là `p_now` do app truyền** (đồng hồ mẫu
QĐ-24 còn sống), DB không đọc `now()`. Một `Order` cho fixture, DB và màn hình: `OrderStatus` thêm `RECEIVED`; `Order` thêm `email`, `note`,
`delivery`, `codFeeVnd` (đơn mẫu `codFeeVnd = 0`, có chú giải). DAL `lib/db/orders.ts` (+ `order-dto.ts`, `guest-orders.ts`, `order-payload.ts`),
actions `placeOrderAction`/`cancelOrderAction` (cả hai `revalidatePath("/", "layout")` vì tồn kho đổi; `CheckoutScreen` giữ ảnh chụp giỏ
tới khi sang biên nhận nên không chớp), cookie httpOnly `guest_orders` (10 mã, 30 ngày, lax), `/order-confirmed/[code]`, `/track` qua
`track_order`, `/account/orders*` qua RLS → mọi 404 ở server; `/api/health` gọi `expire_transfers`. Xoá `brand.orders`, `lib/placed-order.ts`,
`components/shop/{placed-order,sim-store}.ts`, `fixtureOrdersOf`; lớp phủ `brand.adminSim` rút khỏi màn khách. **Kiểm:** typecheck sạch;
`npm test` **50 tệp / 1.072 test**; `npm run test:db` **3 tệp / 66 test** (đối chiếu tổng tiền TS ↔ SQL 16 ca trùng khớp; 5 vòng hai client
tranh chiếc cuối → đúng 1 thắng; 10 vòng hai ô ngược thứ tự không deadlock; probe khoá dòng chờ 2,08 s rồi `OUT_OF_STOCK`); build 44 route `ƒ`;
phiên chính tự đi: biên nhận đơn mẫu khi vãng lai 404, tra cứu đúng/sai SĐT, 5 đơn mẫu của tài khoản thử, đơn người khác 404, mã không tồn tại
404 (khép việc mở B1), `/api/health` `{ok,drops,expired}`, **0 request ngoài 3200**; chạy lại kịch bản 20 bước của agent: `DH-2432` vãng lai
có đếm ngược 12 giờ, mua chiếc XL cuối → "XL hết" → huỷ → "XL còn 1", hai tab tranh chiếc cuối → 1 thắng + toast "Một món vừa hết"; sweep
61 lượt 0 console / 0 tràn / 0 chữ nhỏ / 0 cắt (tồn dư 48 + 2). **Phiên chính sửa thêm:** ba câu quản trị nay sai ("khách thấy mã này…",
"khách thấy lý do…") đổi thành "mô phỏng, khách chưa thấy…" tới B3; DESIGN.md §8 cập nhật `brand.session`/`brand.orders` đã bỏ và
`brand.adminSim` một chiều; chú giải `vitest.db.config.mts`. **Mở (B3):** `p_now` là tham số hàm `anon` gọi được — khi sang giờ thật phải bỏ
khỏi chữ ký công khai hoặc kẹp theo `now()`; `track_order` chưa giới hạn tần suất; admin vẫn fixture nên đơn từ `DH-2432` chưa hiện ở admin;
tab thua cuộc đua đứng cuối trang (chỉ thấy toast); đơn chuyển khoản đặt ngày mẫu 21/09 có hạn rơi vào 22/09 mà đồng hồ mẫu không tới.

**Stack cục bộ tỉa (23/09/2026, người dùng yêu cầu vì Docker ngốn RAM).** `supabase/config.toml` tắt `analytics`, `realtime`, `storage`,
`edge_runtime` (dự án không dùng, QĐ-25 §10); giữ `studio`, `inbucket`. 12 → **7 container**, RAM container ~1,5 GB → **~0,55 GB** (analytics 511 MB
và vector crash-loop biến mất). Sau tỉa: `db reset`, `seed:users`, `test:db` 66/66, `db:types` không đổi, `/api/health` ok. Máy ảo WSL
(`.wslconfig` `memory=4GB`) chưa hạ; người dùng có thể đặt 3GB rồi `wsl --shutdown`.

**Lát B3a ĐẠT (24/09/2026, `backend-implementer` trên Opus 5.5, phiên chính duyệt độc lập).** Quản trị thật, phần 1. Vai admin =
`app_metadata.role` (không hook), `is_admin()` trong RLS và trong mọi hàm `admin_*`; tài khoản `quanly@email.com`/`a-quanly` (9 tài khoản
thử), nút "Vào quản trị thử"; `requireAdmin` ở layout + 14/14 trang admin + mọi action (khách → sign-in, không phải admin → 404). Migration
`supabase/migrations/20260924001000_admin.sql`: `demo_anchor()` (18:50 VN gần nhất ≤ now), `assert_now()` kẹp `p_now` ±300 s trừ
service_role (khép việc mở B2), cột `orders.carrier`, bảng `events` append-only (trigger chặn update/delete, check kind), policy select admin
trên orders/order_lines/profiles/addresses/events, `admin_orders()`, 6 hàm `admin_mark_paid/hand_over/mark_delivered/cancel_order/
note_order/edit_address` với bảng guard (mục 4 báo cáo agent), `place_order`/`cancel_order`/`expire_transfers` ghi sự kiện, `reset_demo` bản 4
(neo, sinh 21 sự kiện mẫu theo luật `fromFixtures` + `DEMO_RESET`, admin gọi được). **QĐ-24 hết hiệu lực:** `demoNow()` trả giờ thật;
`seed.sql` và `seed:users` neo `reset_demo(demo_anchor())`; test DB so fixture gọi `reset_demo(mốc fixture)` tường minh và trả DB về mốc thật
khi xong. Khu quản trị đọc DB: tổng quan, hàng đợi (RECEIVED là việc cần xử lý: COD → bàn giao, thẻ → xác nhận tiền), đơn, khách (`profiles`,
loại `a-quanly`), phiếu giao (ghi chú của khách, địa chỉ đã sửa), nhật ký từ `events` (+ `simLogRows` cho phần B3b còn mô phỏng). Xoá
kind đơn khỏi `admin-sim.ts`; "Gửi lại xác nhận" thành `disabled` đang chuẩn bị; huỷ bởi cửa hàng trả hàng về kệ. **Kiểm:** typecheck sạch;
`npm test` **54 tệp / 1.114 test**; `npm run test:db` **4 tệp / 109 test**; build 44 route; phiên chính tự đi hai context: khách → `/admin`
404, quản lý ghi nhận tiền DH-2430 → khách thấy "Đã thanh toán" ngay, nhật ký có dòng, đặt lại → về chờ chuyển khoản, `DH-9999` 404,
0 request ngoài 3200; chạy lại kịch bản 16 bước của agent (bàn giao có carrier hiện ở `/track`, đã giao, huỷ COD trả XL về kệ, sửa địa chỉ
lên phiếu, CSV, đặt lại); sweep **67 lượt** (46 shop + 2 lớp nổi + 13 admin + 6 lớp nổi admin) 0/0/0/0, tồn dư 48 + 2. **Phiên chính sửa
thêm:** nhãn "Ghi chú cho khách" (hứa quá, khách không thấy) → "Ghi chú nội bộ khi bàn giao", prefix sự kiện "Ghi chú khi bàn giao:";
`tools/layout-sweep.js` và `tools/backend-shots.js` lấy bản B3a (đăng nhập quản lý cho nửa admin, 6 lớp nổi admin); DESIGN.md §8 và
`tasks/backend.md` §6.5 cập nhật. **Mở (B3b/B4):** xoá `simLogRows`/`scheduleRows` khi kho/Số/mã lên DB; chuyển hướng sau đăng nhập chưa giữ
link sâu `/admin/...`; vai trong JWT đổi chậm tới 1 giờ; đơn khách vãng lai hiện "—" ở cột Khách; chưa phân trang (`listEvents` 500);
chưa có cron nên DH-2430/2431 hết hạn ~25/37 giờ sau neo.
