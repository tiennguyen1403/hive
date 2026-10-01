# Brief: v6 lát E1, cửa hàng bằng tiếng Anh: trang chủ, Cửa hàng, trang mẫu, tìm

*01/10/2026. Agent `ui-implementer`. Không commit.*

Đợt v6 làm app song ngữ (QĐ-40). Đã có:
- **E0** (`e363ab3`): nền ngôn ngữ, nút đổi, khung hai vùng bằng tiếng Anh;
- **B15** (`a00c5ea`): bản tiếng Anh của tên, loại, chất liệu, chi tiết mẫu trong DB, đọc qua `productText(product, locale)` và
  `teaserText(teaser, locale)` (`lib/product-text.ts`).

Lát này dịch **thân** các màn mua sắm đầu tiên: trang chủ, Cửa hàng, trang mẫu và tìm, cùng các lớp nổi của chúng. Bản tiếng Việt
không được đổi một pixel nào.

**Luật chung:**
- Đọc trước, trong `tasks/plan.md`, mục "Đợt v6":
  - QĐ-40;
  - "Thuật ngữ tiếng Anh": bắt buộc, gồm cả họ hàng và tám mẫu Basics;
  - **"Mẫu cho các lát sau"** (biên bản lát E0): làm đúng mẫu đó;
  - biên bản B15.
- Đọc `node_modules/next/dist/docs/` cho `generateMetadata` trước khi viết metadata.
- Được ghi trong `app/`, `components/`, `lib/`, `data/` và test bên cạnh. Không đụng `proxy.ts`, `registry/`, `tools/` (dùng bản
  sao sweep ở scratchpad), `supabase/`, `prototype/`, `tasks/`, `DESIGN.md`, `PRODUCT.md`, `.impeccable/`, `.claude/`.
- Không thêm thư viện. Không ghi DB. Không commit.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.
- Harness không cho subagent ghi tệp báo cáo: báo cáo chỉ nằm trong tin cuối.

## 1. Ảnh "trước", chụp trước mọi thay đổi
Mọi route ở §2, ở 390 và 1280, ở **cả hai ngôn ngữ**. Đặt cookie `hive-lang` để chọn ngôn ngữ. Dùng khung nhìn cao bằng trang,
không dùng `fullPage`. Đo thêm JS nén của `/`, `/products`, `/products/s05-khoi`.

## 2. Phạm vi
- **Route:**
  - `/`;
  - `/products`, với các bộ lọc (dòng drop, Basics, họ hàng, size);
  - `/products/[slug]`: một mẫu drop đang bán (`s05-khoi`), một mẫu Basics (`ao-thun-tron`), một mẫu hết hàng;
  - `/search`: rỗng, có kết quả, không kết quả;
  - `/so/[no]`.
- **Lớp nổi:** sheet thêm nhanh (`QuickAdd`), chọn màu và size (`FeedPicker`, `FeedSheet`), bảng size trên trang mẫu, mọi toast
  của các màn này (thêm vào giỏ, lưu, nhắc mở bán…).
- **Mã:**
  - `components/feed/home/`, `issue/`, `product/`, `search/`;
  - `FeedShop`, `ProductsShop`, `FeedCards`, `FeedBlocks`, `FeedCopy`, `QuickAdd`, `FeedPicker`, `FeedSheet`;
  - các hàm `lib/` chúng dùng mà còn chữ Việt: `feed.ts`, phần còn lại của `feed-home.ts`, `feed-product.ts`, `feed-search.ts`,
    `feed-issue.ts`, `feed-me.ts` (phần màn này dùng), `inventory.ts`, `drop.ts`, `catalog-query.ts`, `pants-chart.ts`;
  - nhãn trong `data/`: `data/colors.ts`, `FAMILY_LABELS`, `FAMILY_SHORT_LABELS`, nhãn form, `data/size-chart.ts`.

    Dùng mẫu bảng `*_TEXT` của E0: tên bảng cũ giữ nguyên, suy ra từ bản `vi`.
- **`<title>` và mô tả** của các route này theo ngôn ngữ, qua `generateMetadata`. Ảnh chia sẻ (OG) giữ tiếng Việt (QĐ-40).
- Chỉ dịch chuỗi mà màn này in. Một hàm `lib/` dùng chung với màn ngoài phạm vi thì vẫn thêm bản `en` cho cả hàm. Màn kia đổi
  sang tiếng Anh ở lát của nó.

## 3. Luật dịch
- **Thuật ngữ** theo bảng, không tự chọn từ khác:
  - Drop 05, Basics;
  - họ hàng: Tees, Hoodies, Jackets, Gilets, Shirts, Bottoms;
  - màu: Đen Black, Kem Cream, Xám Grey, Rêu Moss, Nâu Brown, Trắng White, Xanh than Navy;
  - form: Oversized, Regular;
  - "Mới trong Số 05" là "New in Drop 05"; "còn N" là "N left";
  - SOLD OUT trên ảnh giữ nguyên.
- **Chữ của mẫu** (tên, loại, chất liệu, chi tiết) chỉ lấy qua `productText`/`teaserText`, ở mọi chỗ in ra, kể cả `alt` của ảnh.
- **Tên riêng tiếng Việt trong trang tiếng Anh**: phần tử chỉ chứa tên một mẫu drop hay teaser (tiêu đề thẻ, `h1` trang mẫu…)
  mang `lang="vi"`, để trình đọc màn hình đọc đúng. Tên hình in nằm giữa câu của `details` thì không cần.
- **Tìm kiếm ở bản tiếng Anh:**
  - khớp chữ tiếng Anh của mẫu (`productText`) cộng tên tiếng Việt;
  - chip họ hàng lọc theo trường `family`, không so chữ. Chú giải của `FAMILY_LABELS` nói nhãn là chuỗi con của `kind`; điều đó
    không đúng với tiếng Anh ("Bottoms" không nằm trong "Chinos").

  Bản tiếng Việt tìm như cũ.
- **Ngày, giờ, tiền, số:** qua các helper đã có `locale` (`vnd`, `dayMonth`…). Helper nào ở đây chưa có thì thêm theo mẫu E0,
  ví dụ `compactVnd`, `sinceLabel`, `rangeLabel`, `clockDayLabel`.
- Viết kiểu Anh, ngắn như bản Việt, cùng giọng. Không thêm câu giải thích khái niệm.

## 4. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch. Test cũ xanh mà không sửa; test `en` mới cho các hàm `lib/` đã đổi.
- **Bản VI không đổi một pixel** ở mọi route và lớp nổi của §2. So với ảnh "trước"; chỗ nào lệch thì giải thích kèm ảnh.
- **Không còn chữ Việt ở bản EN:** viết một script cho mỗi route và lớp nổi của §2 ở chế độ EN:
  1. gom mọi nút chữ đang hiện;
  2. bỏ nút nằm trong phần tử có `lang="vi"`;
  3. báo nút nào còn chữ có dấu tiếng Việt.

  Kết quả phải là 0, trừ chỗ ghi rõ lý do, ví dụ tên hình in giữa câu. Nộp danh sách.
- **Chữ tràn:** ở bản EN, ở 390, 600, 900 và 1280, soát thẻ, chip, tab, nút, badge và tiêu đề có xuống dòng hay tràn không.
- **Hành vi bản EN:**
  - tìm "hoodie" ra các hoodie;
  - chip Hoodies ra đúng các mẫu họ HOODIE;
  - "Bottoms" ra cả CHINOS lẫn FLEECE SHORTS;
  - thêm nhanh vào giỏ có toast tiếng Anh;
  - đổi ngôn ngữ trên trang mẫu khi sheet đang mở: sheet vẫn mở, chữ đổi.
- **Sweep:** chạy bản sao `tools/layout-sweep.js` (hằng `LANG` ở đầu tệp) ở cả `vi` lẫn `en`. Báo phát hiện mới.
- JS nén của ba route ở §1, trước và sau.
- `impeccable detect` cho `app components`: số phát hiện trước và sau.

## 5. Ảnh
`.playwright-cli/shots/v6/e1/`: `before-{vi,en}-*`, `after-{vi,en}-*`, và ảnh cho từng hành vi ở §4.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, gửi trọn trong **tin cuối**. Thêm các mục:
- **mọi chữ tiếng Anh tự viết**, đặt cạnh bản Việt. Phiên chính sẽ đọc lại từng dòng;
- kết quả script chữ Việt, theo route;
- test trước và sau;
- tệp đã sửa;
- "Xung đột luật" và "Chưa làm".

Để server 3200 chạy cho phiên chính duyệt.
