# Brief: v6 lát E5, quản trị bằng tiếng Anh (2): Mẫu, Các số, Mã giảm giá

*02/10/2026. Agent `ui-implementer`. Không commit.*

Đợt v6 làm app song ngữ (QĐ-40). Phần cửa hàng xong ở E1 tới E3b. E4 (commit `b3e8cff`) dịch Tổng quan, Nhật ký, Đơn hàng, phiếu
giao, Khách hàng.
Lát này dịch **phần catalogue** của quản trị:
- bảng Mẫu và tấm tồn kho;
- form tạo và sửa mẫu, hộp cắt ảnh;
- Các số và các hộp của nó;
- Mã giảm giá và tấm sửa mã.

Đây là lát cuối của phần tiếng Anh. Bản tiếng Việt không được đổi một pixel nào.

**Luật chung:**
- Đọc trước, trong `tasks/plan.md`:
  - mục "Đợt v6": QĐ-40; "Thuật ngữ tiếng Anh" (bắt buộc); mọi mục "Mẫu…" của E0 tới E4;
  - mục "Đợt v5: quản trị theo Arc": luật tích hợp Arc.
- Đọc thêm `registry/PATCHES.md`.
- **Phạm vi ghi:**
  - được ghi trong `app/`, `components/`, `lib/`, `data/` và test bên cạnh;
  - được ghi `registry/components/**` và `registry/PATCHES.md` nếu một chữ của Arc chưa theo ngôn ngữ, hoặc nếu Arc vẽ chữ Việt
    đã lưu từ một chuỗi nên không gói được `<span lang>` (như `optionsLang` của `combobox` và `BreadcrumbItem.lang` ở E4: thêm
    prop `lang`, mặc định giữ hành vi gốc, ghi `PATCHES.md`, có test trong `arc-registry.test.ts`);
  - không đụng `proxy.ts`, `tools/` (dùng bản sao sweep ở scratchpad), `supabase/`, `prototype/`, `tasks/`, `DESIGN.md`,
    `PRODUCT.md`, `.impeccable/`, `.claude/`.
- Không thêm thư viện. Không commit.
- **DB:** được ghi DB cục bộ để dựng trạng thái: chỉnh tồn, sửa mẫu, tạo mẫu kèm ảnh, sửa giờ và tạo Số, thêm teaser, các thao tác
  với mã. Xong thì `npx supabase db query "select public.reset_demo(public.demo_anchor());"`. Không bấm "Đặt lại dữ liệu mẫu"
  trên giao diện.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.
- Harness không cho subagent ghi tệp báo cáo: báo cáo chỉ nằm trong tin cuối.
- **Giữ ngữ cảnh gọn (bắt buộc).** Agent của lát E4 dừng giữa chừng vì đầy ngữ cảnh.
  - Không in diff lớn, không cat tệp dài. Đọc tệp theo đoạn.
  - Kết quả script (so pixel, soát chữ, đo tràn, sweep) ghi ra tệp JSON, chỉ in tóm tắt vài dòng.
  - Chỉ xem tận mắt số ảnh ít nhất cần thiết, tối đa khoảng 8 ảnh. Phần còn lại kiểm bằng so pixel và đo DOM.

## 1. Ảnh "trước", chụp trước mọi thay đổi
Lần đặt lại dữ liệu mẫu gần nhất là 02/10. Trước khi chụp, chạy `select public.reset_demo(public.demo_anchor());` một lần, dựng
lại (`npm run build`) và khởi động server 3200.

Mọi route và trạng thái ở §2, ở 1280, ở **cả hai ngôn ngữ** (cookie `hive-lang`). Vào quản trị bằng "Vào quản trị thử". Đo JS nén
của `/admin/products`, `/admin/drops`.

## 2. Phạm vi
- **Route và trạng thái:**
  - `/admin/products`:
    - tab Cố định và từng Số;
    - tìm, lọc, chọn cột;
    - tấm tồn kho (`ArcStockDrawer`);
    - tải CSV;
  - `/admin/products/new` và `/admin/products/[id]`:
    - form đủ trạng thái lỗi;
    - chọn màu, ảnh mỗi màu, mượn ảnh (`ArcPhotoPicker`), hộp cắt ảnh (`ArcCropDialog`);
  - `/admin/drops`:
    - bảng Số;
    - hộp tạo Số và sửa giờ (`ArcDropFormDialog`), kể cả các câu từ chối của B14/B14b;
    - hộp đóng sớm (`ArcCloseDropDialog`);
    - hộp teaser (`ArcTeaserDialog`);
    - tải CSV;
  - `/admin/promotions`: bảng mã, tấm thêm và sửa mã (`ArcPromoDrawer`), tạm dừng, nâng giới hạn, kết thúc, nhân bản.
- **Lớp nổi:** mọi menu dòng, menu lọc, hộp, drawer, toast của các màn này.
- **Mã:**
  - `components/admin-arc/`: `ArcProductsScreen`, `ArcStockDrawer`, `ArcCountField`, `ArcProductScreen`, `ArcProductForm`,
    `ArcPhotoRow`, `ArcPhotoPicker`, `ArcCropDialog`, `ArcDropsScreen`, `ArcDropFormDialog`, `ArcCloseDropDialog`,
    `ArcTeaserDialog`, `ArcPromotionsScreen`, `ArcPromoDrawer`, `arc-issue-state.ts`, và mọi tệp chúng dùng;
  - `lib/`: `catalog-admin.ts` (gồm các câu từ chối lịch như "Lịch chồng lên Số 06", "Số 07 phải mở sau khi Số 06 đóng"),
    `product-form.ts`, `admin-options.ts` (menu loại và menu Số của form mẫu, chữ phụ "12 mẫu"), `promo-form.ts`, `drop-form.ts`,
    `teaser-form.ts`, `inventory-adjust.ts` (E4 đã có `STOCK_REASON_EN`), `products-csv.ts`,
    `issue-csv.ts`, `admin-products.ts`, `restock.ts`, và các hàm còn tiếng Việt mà các màn này dùng;
  - câu báo của các action các màn này gọi (`lib/actions/catalog-admin.ts`): `getActionLocale()` và `takeRate(…, locale)`.
- **`<title>`** của các route này theo ngôn ngữ.

## 3. Luật dịch
- **Thuật ngữ** theo bảng, không tự chọn từ khác:
  - Styles, Drops, Discount codes, Basics, Drop 05;
  - trạng thái drop: Live, Coming soon, Closed;
  - Stock, Low stock, "N left";
  - họ hàng: Tees, Hoodies, Jackets, Gilets, Shirts, Bottoms;
  - form: Oversized, Regular;
  - màu như E1;
  - Demo data.
- **Mã viết tắt của Số trước tên mẫu:** bản EN là "D05" (bản VI giữ "S05"), như E4 đã làm. Ví dụ tiền tố "S06 –" trước ô tên mẫu
  của một Số ở form thành "D06 –" ở bản EN.
- **Giá trị lưu DB là chữ Việt, in ra là chữ Anh** (mẫu E3a, E4):
  - lý do chỉnh tồn ở tấm tồn kho, kể cả "Sửa mẫu": nhãn hiện tiếng Anh, giá trị gửi đi giữ chữ Việt;
  - khi in lại ở Nhật ký, dùng cùng bảng.
- **Chữ người quản trị gõ** (tên mẫu, loại, chất liệu, mã giảm giá) in nguyên.
  - Ở bản EN, phần tử chứa chữ Việt của DB mang `lang="vi"`. Chữ của mẫu chỉ lấy qua `productText`.
  - Form sửa mẫu hiện **giá trị đang lưu** (chữ Việt), không hiện bản Anh. Form không có ô tiếng Anh (quyết định B15).
- **Câu từ chối lịch** (B14/B14b) ở bản EN, ví dụ:
  - "Overlaps Drop 06";
  - "Drop 07 must open after Drop 06 closes";
  - "Drop 06 must close before Drop 07 opens".

  Giữ đúng ý và đúng số.
- **CSV** ở bản EN có tiêu đề cột và nhãn tiếng Anh.
- **Tiền và ngày** qua các helper đã có `locale`.
- Viết kiểu Anh, ngắn như bản Việt. Không thêm câu giải thích khái niệm.

## 4. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch. Test cũ xanh mà không sửa; test `en` mới cho các hàm `lib/` và action đã
  đổi, gồm các câu từ chối lịch.
- **Bản VI không đổi một pixel** ở mọi route, trạng thái và lớp nổi của §2.
- **Không còn chữ Việt ở bản EN:**
  - chạy script soát của E4 trên mọi route, trạng thái và lớp nổi của §2, kể cả CSV đã tải. Các script của E4 nằm ở
    `.playwright-cli/shots/v6/e4/scripts/`: `capture.template.js` (chế độ measure), `csvscan.py`, `pixclass.py`. Chép sang thư
    mục của lát này rồi dùng;
  - kết quả phải là 0, trừ chỗ ghi rõ lý do. Giá trị đang lưu trong ô form là chữ người dùng gõ, ghi riêng.
- **Chữ tràn:** ở bản EN, ở 1280 và 1440. Soát tiêu đề cột, ô bảng, badge, nút, nhãn form, luật một dòng của bảng.
  - Bài học E4: khung chụp cao bằng trang làm mất thanh cuộn dọc 15px của trang. Muốn biết bảng có vừa thẻ không thì đo trong cửa
    sổ thật 1280×800 và 1440×900, ở cả hai ngôn ngữ: không route nào được có thanh cuộn ngang mà bản VI không có.
- **Hành vi bản EN:**
  - chỉnh tồn một mẫu với một lý do (DB nhận chữ Việt);
  - sửa tên một mẫu Basics: bản Anh của tên bị xoá, cửa hàng bản EN hiện đúng chữ vừa gõ (luật B15);
  - tạo một mẫu mới có ảnh;
  - tạo Số 07 rồi thử sửa giờ cho trùng và cho sai thứ tự: câu từ chối tiếng Anh;
  - thêm một teaser;
  - tạm dừng và nhân bản một mã;
  - đổi ngôn ngữ khi đang mở hộp sửa giờ: hộp vẫn mở, chữ đã nhập còn nguyên;
  - focus và bàn phím đúng luật v5.
- **Sweep:** bản sao `tools/layout-sweep.js` ở cả `vi` lẫn `en`.
- JS nén của hai route ở §1, trước và sau. `impeccable detect` cho `app components registry`: trước và sau.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 5. Ảnh
`.playwright-cli/shots/v6/e5/`: `before-{vi,en}-*`, `after-{vi,en}-*`, và ảnh cho từng hành vi ở §4.

## 6. Báo cáo
Theo hợp đồng trong định nghĩa agent, gửi trọn trong **tin cuối**. Thêm các mục:
- **mọi chữ tiếng Anh tự viết**, đặt cạnh bản Việt;
- kết quả script chữ Việt, theo route;
- test trước và sau;
- tệp đã sửa;
- chỗ vá Arc mới nếu có;
- danh sách mọi chỗ trong app **còn** chữ Việt ở bản EN, sau cả đợt, kèm lý do. Lát này là lát cuối, nên danh sách này là bảng kiểm
  của phiên chính;
- "Xung đột luật" và "Chưa làm".

Để server 3200 chạy cho phiên chính duyệt.
