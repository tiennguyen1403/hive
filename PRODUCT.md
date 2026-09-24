# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS — chosen by the user in the init interview over static HTML/CSS and Vite+React, on the grounds that ~20 mock pages need reusable components and real routing, and that the mock should be upgradable into a production build without a rewrite.

Deliverable **từ 23/09/2026 (QĐ-25, `tasks/backend.md`)**: một cửa hàng **demo / portfolio chạy thật** trên backend **Supabase** (Postgres + Auth + Storage cho ảnh tải lên, gói Free, vùng Singapore), host **Vercel Hobby**, chạy công khai ở https://hive-neon-three.vercel.app từ 24/09, ngân sách 0đ — không khách thật, không tiền thật. Đã quyết: không chuyển sang Shopify/Haravan; không cổng thanh toán, không webhook ngân hàng, không API vận chuyển, không máy chủ email. Từ 19/09 tới 23/09 deliverable là mock UI trên fixture cục bộ; `data/*.ts` nay vẫn là fixture cho test và là nguồn sinh seed.

## Users

Primary: người mua thời trang streetwear ở Việt Nam, khoảng 18–28 tuổi, mua bằng điện thoại, thường ngoài giờ hành chính và trong lúc "drop" đang mở. Họ đã quen văn hoá drop: biết hàng có số lượng giới hạn, biết phải quyết nhanh, và so sánh giá/size/tình trạng còn hàng trước khi chốt.

Họ mua **unisex** — không tự phân loại theo nhánh "nam/nữ", mà theo form dáng (oversize/regular) và size số/chữ.

Secondary: chủ shop (chính là người dùng đang xây trang này) — vận hành một mình hoặc với nhóm nhỏ, cần xem doanh thu, xử lý đơn, cập nhật tồn kho và mở/đóng drop từ khu quản trị.

## Product Purpose

Bán một dòng sản phẩm thời trang & phụ kiện streetwear unisex trực tiếp tới người mua cuối, theo mô hình **drop** (bộ sưu tập ra theo đợt, số lượng có hạn).

Success = người mua đi từ trang chủ tới trang xác nhận đơn mà không rời trang, trên điện thoại, trong lúc drop đang mở; và chủ shop xử lý được toàn bộ vòng đời đơn hàng từ khu quản trị.

## Positioning

Xác nhận trong interview: phân khúc **streetwear / giới trẻ**, giá 400.000–1.500.000₫ mỗi món, bán theo drop với số lượng có hạn và đếm ngược thời gian.

Chưa quyết định (không được bịa): điểm khác biệt cụ thể của thương hiệu — câu chuyện nguồn gốc, xưởng may, chất liệu độc quyền, hay cộng đồng. Mock UI phải chừa chỗ cho tuyên bố định vị này mà không tự viết ra nó.

## Operating Context

- Thiết bị chính là **điện thoại**. Desktop là màn hình phụ. Mọi quyết định bố cục phải đúng ở mobile trước.
- Mua hàng diễn ra trong áp lực thời gian: drop có thời điểm mở, có đếm ngược, có trạng thái "sắp mở / đang mở / đã hết".
- Tồn kho theo size là thật và hay hết: giao diện phải xử lý được size hết hàng, sản phẩm hết hàng, và drop đã đóng — đây là trạng thái thường ngày, không phải ngoại lệ.
- Nội dung, giá, địa chỉ, vận chuyển theo chuẩn Việt Nam: tiền tệ VND định dạng `1.290.000₫`, địa chỉ theo Tỉnh/Thành → Quận/Huyện → Phường/Xã.

## Capabilities and Constraints

**Nhóm trang được chốt trong interview (phạm vi của bản mock):**

1. **Luồng mua hàng (khách)** — trang chủ, danh mục/listing, chi tiết sản phẩm, giỏ hàng, checkout, xác nhận đơn.
2. **Tài khoản khách hàng** — đăng nhập/đăng ký, hồ sơ, lịch sử & chi tiết đơn, sổ địa chỉ, wishlist, theo dõi vận chuyển.
3. **Trang quản trị (admin)** — dashboard doanh thu, quản lý sản phẩm, đơn hàng, khách hàng, khuyến mãi.

**Ngoài phạm vi (người dùng chủ động không chọn):** blog/journal. Trạng thái rỗng và kết quả tìm kiếm vẫn nằm trong phạm vi vì chúng là một phần của ba nhóm trên.

**Đưa lại vào phạm vi 2026-09-20:** trang giới thiệu, FAQ, chính sách đổi trả, liên hệ và trang 404 — người dùng chốt dựng luôn (xem `tasks/plan.md`, mục "Câu hỏi mở — ĐÃ CHỐT", ý 4). Ràng buộc đi kèm: **không bịa** câu chuyện thương hiệu, xưởng, đối tác, giải thưởng hay testimonial; chỗ nào chưa có sự thật thì để trống chờ người dùng viết (component `NeedWrite`).

**Ràng buộc kỹ thuật:**
- Backend (từ 23/09/2026, QĐ-25): Supabase Postgres + Auth + Storage (ảnh tải lên, QĐ-27), đọc qua Server Components và ghi qua Server Actions; **trình duyệt không gọi Supabase**. `data/types.ts` vẫn là hợp đồng dữ liệu; `data/*.ts` là fixture cho test và nguồn sinh seed. Thanh toán: chuyển khoản đối chiếu tay + COD; không cổng thanh toán.
- Ngôn ngữ giao diện: **tiếng Việt**. Tiền tệ: **VND**. Không xây i18n đa ngôn ngữ trong bản mock này.
- Không có thư viện ảnh sản phẩm thật (xem `## Evidence on Hand`).

**Từ vựng chốt trong sản phẩm** (đợt v3, hằng số ở `lib/lexicon.ts`): **Số** là một lần mở bán, thay cho *drop / đợt / lô* ("Số 05"); *size* (S/M/L/XL và số); *form* (oversize / regular); dấu **SOLD OUT** trên ảnh mẫu đã hết, còn trong câu vẫn nói "đã hết".

## Brand Commitments

**Tên: HIVE** — chốt 24/09/2026 (QĐ-28 trong `tasks/plan.md`); repo `tiennguyen1403/hive`. Wordmark HIVE
theo `prototype/name/index.html`; lockup dự kiến **[mark] HIVE.05**, số là ô dữ liệu. **Mark (logo) chưa
có**: người dùng tự tạo bằng công cụ ngoài (QĐ-26); favicon và ảnh xem trước khi chia sẻ link chờ vòng mock.

Hệ thiết kế (màu, chữ, giọng) đã chốt qua các đợt v2–v3; nguồn sự thật là `DESIGN.md`, không lặp lại ở đây.

**Quy trình đã được người dùng nêu rõ:** hướng thiết kế phải được họ duyệt
**trước khi** viết code. Một câu mô tả thẩm mỹ là ràng buộc, không phải lời duyệt.

## Evidence on Hand

**Không có gì.** Đây là dự án trống hoàn toàn — không ảnh sản phẩm, không tên sản phẩm thật, không giá thật, không đánh giá của khách, không số liệu bán hàng, không đối tác vận chuyển đã ký, không cổng thanh toán đã tích hợp.

Hệ quả bắt buộc cho mọi công việc sau này:
- Không được bịa testimonial, số lượt khách, doanh thu, giải thưởng, hay hợp tác.
- Mọi con số trong khu quản trị là dữ liệu mô phỏng và phải hiển thị như vậy.
- Ảnh trên mọi màn là **ảnh thay thế** từ Unsplash (19 ảnh, ID ghi trong `lib/photos.ts` và DESIGN.md §1) tới khi có ảnh
  thật của thương hiệu; không phải ảnh sản phẩm thật và không được trình bày như thật (ghi 23/09/2026).
- Trang phải được thiết kế để **sống được mà không có ảnh chụp chuyên nghiệp**, đồng thời nhận được ảnh thật ngay khi có mà không phải dựng lại bố cục.

## Product Principles

1. **Mobile là bản gốc, desktop là bản mở rộng.** Nếu một bố cục chỉ đẹp ở 1440px thì nó sai.
2. **Trạng thái khan hiếm là nội dung, không phải cảnh báo.** Hết size, sắp hết, drop đóng — đây là thông tin người mua cần trước khi chạm vào nút, không phải thông báo lỗi sau khi chạm.
3. **Tốc độ tới quyết định.** Mỗi màn hình phải rút ngắn khoảng cách tới "chọn size → thêm vào giỏ → thanh toán". Bất kỳ thứ gì kéo dài khoảng cách đó phải tự chứng minh giá trị.
4. **Sự thật về hàng hoá không được tô hồng.** Giá, phí ship, thời gian giao, tồn kho hiển thị đúng và sớm — không giấu tới bước cuối của checkout.
5. **Khu quản trị phục vụ người vận hành một mình.** Ưu tiên quét nhanh và thao tác hàng loạt hơn là biểu đồ đẹp.

## Accessibility & Inclusion

Chưa có yêu cầu tuân thủ chuẩn cụ thể nào được nêu. Mặc định áp dụng: tương phản văn bản đạt WCAG AA, điều hướng được bằng bàn phím, vùng chạm ≥ 44px trên mobile, và không dùng màu làm kênh truyền đạt duy nhất cho trạng thái tồn kho.
