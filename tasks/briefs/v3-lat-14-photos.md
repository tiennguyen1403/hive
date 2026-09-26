# Brief — v3 lát 14: ảnh thật cho Số 05

Yêu cầu của người dùng (26/09/2026): *"hiện tại đã có hình ảnh cho tất cả sản phẩm của số 05. giúp tôi thêm ảnh thật vào
sản phẩm sau đó deploy"*. Lát này đưa 42 ảnh thật của Số 05 vào app. **Deploy không thuộc lát này:** phiên chính push, chờ
Vercel và nạp seed lên hosted sau khi duyệt. Agent không push, không commit, không đụng Supabase hosted.

Ảnh đối chiếu của phiên chính (chỉ đọc):
`C:\Users\PC\AppData\Local\Temp\claude\D--Code-e-commerce\76f6b540-d502-4d00-87d4-f759ede57308\scratchpad\photos\`
- `packs.png`: 21 ảnh thẻ gốc;
- `streets.png`: 21 ảnh lookbook gốc;
- `khoi-vs.png`: nền KHÓI so với nền BỤI.

Máy chủ 3200 đang chạy bản dựng của `main` (lát 13).

**Máy thiếu RAM.** Lượt chụp nền của lát trước bị hệ thống dừng. Cách làm:
- chạy từng việc một;
- một trình duyệt mỗi lần, đóng khi xong;
- không chạy nền lượt chụp toàn app;
- mọi lệnh nặng (`next build`, `test:db`, `db reset`) chạy tiền cảnh, lần lượt.

---

## 1. Màn và route

- **Trang mẫu** `/products/[slug]`, phần gallery. Mock `prototype/v3/product.html` dòng 21–26:
  - `.gal` có **2 khung**: "KHÓI màu đen, mặt trước" và "KHÓI, ảnh mặc trên người";
  - `aria-label="Ảnh KHÓI, 2 tấm"`, galbar "1 / 2".

  Đây là thiết kế đã duyệt. App hiện làm "mỗi màu một khung, bấm màu thì cuộn tới khung đó". Đó là đường ống của ảnh mượn,
  lúc chưa có ảnh người mặc; không phải thiết kế.
- **Mọi màn hiện ảnh của mẫu Số 05** (đọc `photoKeys`): `/`, `/products`, `/so/5`, `/search` và ô gợi ý tìm kiếm, `/cart`
  (cả danh sách để sau), `/checkout`, `/order-confirmed/[code]`, `/track`, `/account`, `/account/orders/[code]`, bảng size.
  Quản trị: `/admin`, `/admin/products`, `/admin/products/[id]`, `/admin/orders/[code]`.
  Các màn này chỉ đổi nguồn ảnh, không đổi bố cục.
- **Form mẫu của quản trị** `/admin/products/[id]`, ô ảnh từng màu (`components/admin/ProductPhotoSlot.tsx`).

## 2. Quyết định đã chốt (không hỏi lại)

### Nguồn ảnh (chỉ đọc, git bỏ qua)

- `photos-raw/<style>-<colour>.png` — **21 ảnh thẻ** (packshot): áo trên ma-nơ-canh vô hình, nền giấy, không người.
- `photos-raw/<style>-<colour>-street.png` — **21 ảnh lookbook**: người mẫu nam Việt mặc đúng màu đó.
- `style` ∈ `khoi bui nguoi nang suong muoi than cat gio da`, khớp `slug` trong `data/catalog.ts`; `colour` khớp `ColorKey`.
  Đủ đúng 21 cặp màu của Số 05.
- Mọi tệp 1122×1402 (4:5), riêng `nguoi-black.png` 1107×1421.
- Cả 42 tệp mang chunk C2PA `caBX`, tức ảnh AI (ChatGPT, GPT Image).
- **Không** dùng các thư mục con `_thu-*`, `_kiem-tra`: đó là bản thử và bản cũ.

### Ảnh nào nằm ở đâu

- Ảnh thẻ là **ảnh của màu đó**. Nó thay ảnh Unsplash mượn tạm ở mọi màn.
- Ảnh lookbook **chỉ** là khung thứ hai trong gallery trang mẫu, đúng mock. Không đưa lên thẻ, giỏ, quản trị hay bìa.

### Luật gallery (`components/product/ProductView.tsx`)

- Gallery hiện các khung **của màu đang chọn**: ảnh thẻ, rồi ảnh lookbook nếu màu đó có.
- Đổi màu: khung đổi theo màu mới, gallery về khung 1 (`scrollLeft` 0, số đếm "1 / 2").
- Dưới 900px: vuốt, galbar "n / 2" và chấm như hiện nay (chỉ hiện khi có hơn một khung).
- Từ 900px: các khung xếp dọc như CSS hiện có (hai ảnh chồng nhau).
- Mẫu không có lookbook chỉ có **một khung** của màu đang chọn, không có galbar. Gồm: mẫu cố định (hình phẳng), Số 03/04
  (Unsplash), mẫu dùng ảnh tải lên.
- `aria-label`: `Ảnh ${name}, ${n} tấm`, với `n` là số khung của màu đang chọn.
- `alt`:
  - khung 1 giữ như cũ: `${name} — màu ${label}`;
  - khung lookbook: `${name} — màu ${label}, ảnh mặc trên người` (lấy chữ của mock).
- `priority` chỉ cho khung đầu.

### Tablet 600–899px

- Quyết định "ảnh sản phẩm ≤ 70svh" của người dùng giữ nguyên. Chỉ bỏ phần **cắt ảnh**.
- Hiện `.s .gal figure{max-height:70svh}` (`app/styles/product.css` khoảng dòng 262) bóp khung, `object-fit:cover` cắt đi 22%
  ở 768×1024. Ảnh lookbook toàn thân sẽ mất đầu và chân; quần ở ảnh thẻ mất gấu.
- Việc cần làm: khung giữ đúng 4:5, không cắt, cao tối đa 70svh, canh giữa. Galbar rộng bằng khung. Cách làm tuỳ agent, ví
  dụ giới hạn bề rộng cột gallery ở `70svh × 4/5`.
- Dưới 600 và từ 900 không đổi gì. Sửa lại chú thích CSS đang ghi "The photo is cropped to it".

### Tệp và khoá ảnh

- Tên đề xuất (đổi được nếu đụng tên có sẵn; nói lại trong báo cáo):
  - khoá `shot-<style>-<colour>`;
  - ảnh thẻ `public/shots/<style>-<colour>.webp`;
  - ảnh lookbook `public/shots/<style>-<colour>-look.webp`.
- **Không** đặt dưới `/photos/`: đó là route ảnh tải lên, `app/photos/[...key]/route.ts`. Cũng không đặt dưới một route
  trang như `/products/`.
- Một danh sách thuần, không `server-only`, dùng được ở client, nằm trong `lib/`, theo mẫu `lib/flats.ts`. Nó cho biết:
  - khoá nào có tệp;
  - khoá nào có ảnh lookbook.
- `photoUrl()` trả về đường dẫn tệp. Một hàm cho ảnh lookbook của một khoá, trả `null` nếu không có. Khoá `shot-…` lạ rơi về
  ảnh `hero` như khoá phẳng lạ.
- Ảnh lookbook **suy từ khoá ảnh thẻ**, không có cột DB mới. Quản trị thay ảnh của một màu bằng ảnh tải lên thì màu đó mất
  lookbook, và như vậy là đúng: lookbook cũ là của chiếc áo cũ.

### DB và seed

- **Không có migration.** `photo_key_ok()` nhận mọi khoá có trong `seed_product_colors`
  (`supabase/migrations/20260924040000_photos.sql:119`); cột `photo_key` không có ràng buộc dạng.
- Đổi `photoKeys` của 10 mẫu Số 05 trong `data/catalog.ts`: mỗi màu một khoá `shot-…`, đúng thứ tự `colors`.
- `npm run seed:gen` để sinh lại `supabase/seed.sql`. **Không sửa tay** tệp này.
- Cục bộ: `npx supabase db reset`, rồi `npm run seed:users` (reset xoá tài khoản mẫu).
- Hosted: **không** làm. Phiên chính làm sau khi push.

### Quản trị: ảnh đi kèm app là ảnh thật

Trong form mẫu, ảnh đi kèm app hiện như ảnh đã lưu:
- chú thích **"Ảnh thật"**, không phải "mượn tạm" và không phải "Ảnh đã tải lên", vì không ai tải nó lên;
- nút như ảnh đã lưu: "Đổi ảnh" và "Mượn tạm";
- dòng meta `N màu · đủ ảnh`.

Nhật ký hoạt động (`lib/activity-log.ts`) và câu tóm tắt khi lưu (`lib/actions/catalog-admin.ts` quanh dòng 649) tính nó là
"ảnh thật".

Chỗ nào code hỏi "tệp này có nằm trong bucket không" thì vẫn dùng `isUploadedKey`: route ảnh, dọn ảnh khi reset, kiểm khoá
khi tải lên.

`loanPhotos()` (danh sách "Mượn tạm") không đổi, vẫn chỉ các khung Unsplash.

### Không đổi

- Ảnh bìa trang chủ `hero` (Unsplash, chờ ảnh bìa Số 05 riêng; không thuộc lát này).
- Số 03/04 và hai mẫu hé lộ Số 06 (Unsplash).
- Mẫu cố định (hình phẳng).
- `PHOTO_IDS` và `remotePatterns` trong `next.config.mjs`, vì vẫn còn dùng.
- Thẻ sản phẩm vẫn lấy `photoKeys[0]`, tức ảnh thẻ của màu đầu.

### Được ghi ngoài vùng thường lệ

- `public/shots/` (mới).
- `scripts/`: script xử lý ảnh và test của nó.
- `supabase/seed.sql`: chỉ sinh bằng `seed:gen`.
- `package.json` và `package-lock.json`: chỉ khi import thẳng `sharp`. `sharp` 0.35.4 đã có trong `node_modules` qua `next`;
  khai vào `devDependencies` đúng bản đó.
- Có thể thay bằng Python và Pillow 12.2. Máy **không có numpy**; **đừng cài gói Python** vào máy.

### Không được đụng

- `photos-raw/` (chỉ đọc).
- `tasks/`, gồm hai tệp đang sửa dở của phiên khác: `tasks/anh-san-pham-prompt.md`, `tasks/lookbook-register.md`. Đọc được,
  không sửa.
- `next.config.mjs`, `supabase/migrations/`, `DESIGN.md`, `PRODUCT.md`.
- `tools/photo-frame-trial.py`: để nguyên làm tư liệu.

## 3. Việc phải làm

### A. Script xử lý ảnh (`scripts/…`, chạy lại được)

Một lệnh chạy cả bộ, hoặc chạy riêng một cặp `<style>-<colour>`. Khi người dùng tạo lại một ảnh, chỉ chạy lại ảnh đó.
Đầu vào là `photos-raw/`, đầu ra là `public/shots/`.

**A1 · Khung ảnh thẻ, 1200×1500.**
- Món đồ nằm trong hộp **84% bề rộng × 82% chiều cao**, cạnh nào chạm trước thì dừng:
  - áo thun, hoodie, áo khoác theo bề rộng;
  - quần MUỐI, ĐÁ theo chiều cao.
- Mép trên món đồ (cổ, đỉnh mũ, lưng quần) ở **12%**. Canh ngang theo trục món đồ. Không chạm mép khung (còn ≥ 3%).
- Chỗ thiếu nền thì nối bằng **nền của chính ảnh, lấy từ mép ảnh**. Không lộ vết nối.
- Bài học từ `tools/photo-frame-trial.py` (đọc chú thích trong tệp):
  - kéo nền bằng mặt phẳng ước từ nửa trên thì lộ vệt tối ở đáy (NẮNG);
  - vải sáng ở bên khuất sáng trùng màu giấy (CÁT kem hụt 42px);
  - hạ ngưỡng lại ăn luôn bóng đổ của đồ tối (MUỐI nở 72px);
  - cách chữa đã thử: lấy đối xứng mép sáng qua trục phần đỉnh món đồ, rồi giữ mép rộng hơn.

**A2 · Tông nền ảnh thẻ: một đích chung cho cả bộ.**

Số đo của phiên chính (trung bình ô 40px ở góc và giữa mép):
- 19 ảnh nằm từ khoảng `#BAB2AA` (CÁT) tới `#E1D9CF` (THAN).
- Hai ảnh KHÓI lệch hẳn: nền xám có vân loang, vignette mạnh; góc phải trên khoảng `#6C645C`, góc trái trên khoảng `#C2B9AF`.

Việc cần làm:
- Chọn đích là trung vị nền của 19 ảnh không phải KHÓI; ghi giá trị vào báo cáo.
- Chỉ nền được đổi, theo mặt nạ có mép mềm. **Điểm ảnh của món đồ giữ nguyên**: báo ΔE của vùng lõi món đồ trước và sau,
  phải khoảng 0.
- Giữ bóng đổ dưới món đồ (độ tối tương đối) và giữ vân giấy (không thành mặt phẳng nhựa).

Đạt khi:
- nền trung bình ở bốn dải mép nửa trên của mọi ảnh thẻ cách đích ≤ 4 mức mỗi kênh;
- trong một ảnh, độ chênh các khối 64px của nền (ngoài vùng bóng) ≤ 16 mức;
- xem ở 200% không có quầng hay viền dọc mép món đồ.

**KHÓI** cần làm phẳng hoặc thay hẳn nền. Nếu không ra sạch thì dừng việc nền của KHÓI, giữ nền gốc của nó (vẫn làm khung
A1), rồi báo kèm ảnh trước và sau. Coi là không sạch khi có một trong các lỗi:
- quầng quanh áo đen;
- lộ mép mặt nạ;
- áo kem mất mép trên giấy mới;
- mất bóng.

Phiên chính sẽ hỏi người dùng tạo lại ảnh.

**A3 · Ảnh lookbook.** Đưa về 1200×1500 (Lanczos). Không chỉnh tông, không cắt thêm.

**A4 · WebP.**
- Chọn chất lượng sao cho ảnh thẻ khoảng ≤ 300 KB, lookbook khoảng ≤ 400 KB.
- Báo tổng dung lượng.

**A5 · Nguồn gốc nhúng trong tệp.** Chunk C2PA mất khi mã hoá lại (chữ ký gắn với nội dung cũ); đừng cố chép nó.

Mỗi WebP mang **XMP** gồm:
- `Iptc4xmpExt:DigitalSourceType` = `http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia`;
- `xmp:CreatorTool` = `ChatGPT (GPT Image)`;
- `dc:source` = tên tệp gốc;
- prompt:
  - ảnh thẻ: khối chung §4, khối của mẫu trong §6 (Số 05), rồi câu đổi màu của màu đó, lấy từ
    `tasks/anh-san-pham-prompt.md` (bản đang có trên đĩa);
  - lookbook: đoạn luật ảnh người mẫu ở đầu tệp đó, rồi dòng của ảnh trong `tasks/lookbook-register.md`;
- câu ghi rõ đây là *prompt như ghi trong tệp prompt của dự án*.

Đọc ngược lại để kiểm, bằng Pillow `info["xmp"]` hoặc `sharp().metadata()`.

**A6 · Ảnh để phiên chính duyệt**, trong `.playwright-cli/shots/v3/photos/`:
- `contact-packs.png`: 21 ảnh thẻ đã xử lý, có nhãn tên, mỗi ảnh khoảng 240px;
- `contact-looks.png`: 21 ảnh lookbook;
- `khoi-before-after.png`: ảnh gốc và ảnh ra của KHÓI đen và kem, kèm các ô cắt 200% ở vai trái và mép gấu phải.

### B. Khoá ảnh (`lib/`)

- Danh sách, `photoUrl`, hàm lookbook, test đi kèm:
  - mỗi khoá trong danh sách có đủ hai tệp trên đĩa, cỡ 1200×1500;
  - mỗi cặp màu Số 05 trong `data/catalog.ts` có khoá `shot-…` trong danh sách;
  - khoá lạ rơi về `hero`.
- Sửa các chú thích đang ghi "chưa có ảnh thật": đầu `lib/photos.ts`, chú thích `photoKeys` trong `data/types.ts` (câu "When
  real photos land this field goes away" giờ sai).

### C. Dữ liệu và seed

- Sửa `data/catalog.ts` theo §2 và làm `npm run seed:gen`.
- Sửa các test đang nhắc khoá cũ của Số 05: `data/catalog.test.ts`, `lib/db/catalog-snapshot.test.ts`,
  `scripts/gen-seed.test.ts`, test DB nếu có.
- Làm `npx supabase db reset`, rồi `npm run seed:users`, rồi `npm run test:db`.

### D. Gallery

Theo §2.

### E. Tablet

Theo §2.

### F. Quản trị

Theo §2. `storedPhotos()` trong `components/admin/ProductForm.tsx` khoảng dòng 846, `ProductPhotoSlot.tsx`,
`lib/product-form.ts`, `lib/activity-log.ts`, `lib/actions/catalog-admin.ts`. Test cho phần ảnh thật mới.

## 4. Kiểm nghiệm thu

1. `npm run typecheck`, `npm test`, `npm run test:db`, `npm run build`: sạch. Chạy `tools/layout-sweep.js`: không có lỗi
   mới so với các miễn trừ đã ghi.
2. Mỗi `<img>` của mẫu Số 05 trên các màn ở §1 có:
   - `naturalWidth > 0`;
   - `currentSrc` chứa `%2Fshots%2F`.

   Trang `/products` và trang mẫu Số 05 không gọi `images.unsplash.com` cho ảnh mẫu Số 05. Bìa `hero` và Số 03/04 vẫn gọi, và
   như vậy là đúng.
3. Gallery ở 390:
   - vuốt sang khung 2 thì hiện "2 / 2";
   - bấm màu Kem thì cả hai khung thành ảnh kem, số đếm "1 / 2", `scrollLeft` 0.
4. Gallery ở 1280: hai khung xếp dọc; đổi màu thì cả hai đổi.
5. Mẫu cố định (ÁO THUN TRƠN) và một mẫu Số 04: một khung, không galbar, bấm màu thì đổi ảnh.
6. Ở 768×1024:
   - khung gallery KHÓI giữ 4:5: tỉ lệ hộp hiển thị bằng tỉ lệ ảnh, không bị cắt;
   - cao ≤ 70svh, canh giữa;
   - galbar cùng bề rộng.

   Ở 600×960 cũng vậy.
7. Quản trị `/admin/products/[id]` của KHÓI:
   - hai dòng màu ghi "Ảnh thật", không có "mượn tạm";
   - meta "2 màu · đủ ảnh".

   `/admin/products`: ảnh nhỏ của Số 05 là ảnh thẻ mới.
8. Mở lớp nổi: bảng size trên KHÓI, ô gợi ý tìm kiếm có một mẫu Số 05.
9. Trạng thái Số 05 đã đóng, chỉ trên DB cục bộ:
   - ghi lại `closes_at` của Số 05, đóng tạm, chụp `/so/5`, rồi khôi phục đúng giá trị cũ;
   - `db reset` cũng được, nhưng sau đó phải `seed:users`;
   - bìa ô vuông lấy ảnh thẻ KHÓI đen; báo cổ áo có bị cắt không.

   **Không sửa** `ClosedIssue`; chỉ báo lại.
10. Tràn ngang ở 390: `scrollWidth ≤ 390` trên mọi màn chụp. Console không có lỗi.

## 5. Ảnh nộp (`.playwright-cli/shots/v3/photos/`)

Ảnh duyệt ở A6:
- `contact-packs.png`;
- `contact-looks.png`;
- `khoi-before-after.png`.

Cửa hàng:
- `products-390.png` (hai hàng đầu), `products-1280.png`;
- `so5-390.png`, `so5-1280.png`;
- `home-390.png`, `home-1280.png` (hàng "Đang bán");
- `pdp-khoi-390-f1.png`, `pdp-khoi-390-f2.png`, `pdp-khoi-390-cream.png`;
- `pdp-khoi-1280.png`, `pdp-khoi-1280-cream.png`;
- `pdp-nang-1280.png` (ba màu), `pdp-da-390.png` (quần);
- `pdp-khoi-768.png`, `pdp-khoi-600.png`;
- `pdp-fixed-1280.png` (ÁO THUN TRƠN), `pdp-s04-390.png`;
- `cart-390.png` (hai dòng Số 05), `checkout-1280.png`, `order-confirmed-390.png`.

Lớp nổi và quản trị:
- `sizesheet-390.png`, `search-390.png`;
- `admin-products-1280.png`, `admin-product-khoi-1280.png`.

Trạng thái đã đóng:
- `so5-closed-390.png`, `so5-closed-1280.png`.

Báo cáo theo sáu mục của hợp đồng. Để máy chủ 3200 chạy bản dựng mới.
