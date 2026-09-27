# Brief: v4 lát 0, nền của Feed (token, chữ, icon, logo đen trắng)

Đợt v4 đưa giao diện **Feed** (`prototype/explore/feed/`) vào app, thay v3 cho phần khách. Kế hoạch và các quyết định
QĐ-32 đến QĐ-35 nằm ở cuối `tasks/plan.md`, mục "Đợt v4 Feed". Lát 0 chỉ dựng **nền**; chưa màn nào của khách đổi giao
diện. Màn khách chuyển sang Feed từ lát 1.

Mock: `prototype/explore/feed/`. Máy chủ xem mock: `cd prototype && python serve.py 3100`; bảng ở
`http://127.0.0.1:3100/explore/`. Luật của Feed nằm trong `feed/BRIEF.md` (đọc phần đầu, "Principles", "Palette",
"Type", "Icons", "Shape rule", "Motion") và `feed/direction.json` (`palette`, `type`, `shape`, `motion`).

---

## 1. Việc của lát 0

1. **Token Feed, khoanh vùng.**
   - Đặt các token của `feed.css` `:root` vào `app/globals.css` theo cách của app:
     - màu: nền, nền nhóm, mực, chữ phụ, xanh, đỏ lỗi, hai đường kẻ;
     - scrim, bóng `--lift`;
     - hai đường cong chuyển động;
     - lề, chiều cao thanh trên, thanh tab, thanh tab đáy;
     - `--max` 1280, lề máy tính.
   - Đặt thêm các bán kính trong luật hình khối:
     - nút, chip, ô nhập bo tròn hẳn;
     - thẻ lựa chọn 16px;
     - sheet 20px ở hai góc trên;
     - ảnh nhỏ 10px.
   - Token Feed chỉ có hiệu lực trong một **vùng Feed** do bạn chọn, ví dụ một thuộc tính trên phần tử gốc của trang
     Feed. Chọn sao cho:
     - màn v3 chưa tới lượt và **khu quản trị** không đổi một điểm ảnh nào;
     - lát 1 đến 4 chỉ cần bật vùng này cho route của mình.
   - Tên token Feed không được đè tên token v3 đang có (`--color-ink`, `--color-line`, `--color-bg`…). Tên lớp không được trùng
     tiện ích Tailwind (`lib/classnames.test.ts`).
   - Ghi cách bật vùng Feed vào chú thích đầu khối token, vì các lát sau cần nó.
2. **Chữ Mona Sans.**
   - Nạp bằng `next/font/google` (`Mona_Sans`). Font có trong dữ liệu font của Next với trục `wdth` 75 đến 125 và `wght`
     200 đến 900, subset `latin`, `latin-ext`, `vietnamese`.
   - Chỉ kiểu thường; không cần nghiêng, vì chữ HIVE nghiêng của mock không dùng (QĐ-33).
   - Kiểm cách khai báo trục trong `node_modules/next/dist/docs/` trước khi viết.
   - Biến CSS mới, không thay `--font-sans` / `--font-display` của v3.
   - Mock dùng `font-stretch` 75% cho chữ hiển thị và 100% cho chữ giao diện, với các độ đậm ghi trong
     `direction.json` → `type`.
3. **Icon Phosphor.**
   - Lấy từ 69 tệp `prototype/explore/feed/icons/*.svg`, kể cả các bản `-fill`.
   - Đưa vào app theo kiến trúc của `components/icon/`: dữ liệu path sinh bằng một script trong `scripts/` (được phép cho
     lát này), cộng một component riêng cho Feed. Iconsax của v3 giữ nguyên cho màn v3 và quản trị.
   - Phosphor là MIT: kèm tệp ghi giấy phép cạnh dữ liệu.
   - Xem `feed.js` để biết mock vẽ icon ra sao (cỡ, `currentColor`, nét) và làm cho giống.
4. **Logo đen trắng (QĐ-33).**
   - Giữ hình mark M2 và chữ W3 Stencil, bỏ màu mật ong. Luật đổi màu:
     - vòng tròn mật ong → mực `#171410`;
     - con ong mực trên vòng tròn → trắng;
     - chữ W3 → mực trên nền sáng, trắng trên nền tối.
   - Hình học giữ nguyên. Các bản đã vẽ sẵn ở `prototype/name/logo/`: `hive-mark-black.svg` (vòng mực, ong trắng),
     `hive-mark-negative.svg` (vòng trắng, ong mực), `hive-*-white.svg`.
   - Thêm một biến thể của `NavLogo` cho khung Feed, bản sáng và bản trên nền tối. `NavLogo` của v3 giữ nguyên cho tới
     lát 1.
   - Vẽ lại bằng `scripts/brand-assets.ts` theo cùng luật đổi màu:
     - favicon;
     - `app/apple-icon.png`;
     - `public/icons/hive-{192,512,maskable-192,maskable-512}.png`.
   - Lưới 16px F2 vẽ tay đổi màu theo đúng luật trên.
   - Cập nhật `lib/brand/*.test.ts` theo màu mới.
   - **Ảnh chia sẻ (OG) để sang lát 1**, cùng câu bìa mới. Lát này không đụng `opengraph-image.tsx`, `share-*`.
5. **Trang bộ kit `/system`.**
   - Không liên kết từ đâu, `robots: noindex`, trong vùng Feed. Trang này để phiên chính duyệt nền, và sẽ xoá khi xong đợt.
   - Trang gồm:
     - ô màu kèm mã;
     - thang chữ (hiển thị 75% ở 800/850/900; giao diện 100% ở các độ đậm của `direction.json`);
     - nút chính xanh, nút viền, nút vô hiệu;
     - chip thường và đang bật;
     - ô nhập thường và báo lỗi;
     - một thẻ lựa chọn 16px;
     - một sheet mẫu (bo 20px hai góc trên, bóng `--lift`);
     - lưới đủ 69 icon Phosphor ở 20 và 24px, kèm tên;
     - logo đen trắng trên nền sáng và trên khối tối.
   - Lấy kích thước và màu của nút, chip, ô nhập, sheet đúng như `feed.css` / `flow.css`.

## 2. Quyết định đã chốt (không hỏi lại)

- QĐ-32: xanh `#1846F0` là màu nhấn duy nhất. Đỏ `#C62A1D` chỉ cho lỗi. Quản trị giữ v3.
- QĐ-33: logo đã chốt, bản đen trắng. Không dùng chữ HIVE nghiêng hay ô chữ H của mock.
- QĐ-35: không email.
- Luật cũ còn nguyên:
  - code, chú thích, tên lớp bằng tiếng Anh;
  - không `!important` để thắng nhau;
  - không thêm phụ thuộc mới. `next/font/google` đã có; script sinh icon đọc SVG của mock, không cài gói.
  - thêm `scripts/` là ngoại lệ lát này cho phép.

## 3. Kiểm

- `npm run typecheck`, `npm test` (mọi test cũ vẫn xanh, test logo cập nhật), `npm run build` sạch.
- **Màn v3 không đổi.**
  - Chụp trước và sau ở 390 và 1280 cho `/`, `/products`, một trang sản phẩm, `/cart`, `/account` (đăng nhập tài khoản
    mẫu), `/admin`.
  - Hai bản phải giống từng điểm ảnh, trừ chỗ đồng hồ đếm. Nếu có khác, ghi ra và giải thích.
- **`/system`** ở 390 và 1280: không tràn ngang, 0 lỗi console, chữ Mona Sans thật sự được dùng (đọc `document.fonts`
  hoặc computed style), icon đủ 69.
- Favicon, apple-icon, icon cài đặt mới: mở từng tệp PNG ra xem, đính đường dẫn.
- Máy chủ xem thử 3200 như luật trong định nghĩa agent; `next dev` không hydrate trên máy này.

## 4. Ảnh cần nộp

`.playwright-cli/shots/v4/lat-0/`:
- `system-390.png`, `system-1280.png` (toàn trang);
- `before-<route>-<w>.png` và `after-<route>-<w>.png` cho sáu route ở mục 3;
- `icons.png`: ghép favicon 16/32/48, apple-icon, icon 192/512/maskable.

## 5. Báo cáo

Theo hợp đồng báo cáo trong định nghĩa agent. Thêm hai mục:
- cách bật vùng Feed cho một route, để phiên chính dán vào brief lát 1;
- danh sách token Feed đã đặt tên thế nào.

Không commit.
