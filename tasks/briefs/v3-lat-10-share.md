# Brief lát 10 · v3 — favicon, icon điện thoại, ảnh chia sẻ; biển Số chỉ khi đang bán

Phiên chính viết ngày 24/09/2026. Agent `ui-implementer` thực thi. Phiên chính duyệt lại độc lập bằng ảnh chụp thật và bằng so từng điểm
ảnh với bảng mock. Người dùng **đã duyệt**. Các câu gốc:
- "thiết kế lại phần share.html vì chúng ta đã chốt logo". Trả lời hỏi lại: ảnh chia sẻ **không dùng ảnh sản phẩm**; làm **chung cho cả
  site** (ảnh riêng từng mẫu để sau).
- "tôi đồng ý với 3 đề xuất của bạn cho phần share F2, P2, O2, mô tả A." (QĐ-31)
- "Thanh điều hướng chỉ hiện bảng khi đang có số đang active thôi" (trả lời finish review lát 8).

**Mock (chuẩn đối chiếu):**
- Bảng `prototype/name/share.html`. Mở bằng `cd prototype && python serve.py 3100`, vào `/name/share.html`.
- **Chế độ xuất** của bảng vẽ từng tài sản đúng cỡ tệp. Đây là chuẩn điểm ảnh cho phần A:
  - `?icon=f2&size=16` — favicon 16 px F2;
  - `?icon=f1&size=32` và `?icon=f1&size=48` — M2 ở 32 và 48 px;
  - `?touch=p2&size=180` — icon điện thoại P2;
  - `?og=o2&no=05` — ảnh chia sẻ O2, 1200×630.
- Đường nét gốc ở `prototype/name/logo/`:
  - `hive-mark.svg` = M2;
  - `hive-lockup.svg` chứa path chữ W3;
  - `hive-number.json` = bộ số `.0–9` kèm luật ghép.

  Bảng dùng bản sao `prototype/name/share/logo-data.js`, do `share/build.cjs` sinh ra từ các tệp gốc trên.
- Bản 16 px F2 là lưới `MASTER16.f2` trong script của bảng, cộng đĩa mật ong vẽ tròn có khử răng cưa.
- Nền P2 là `touchSVG("p2")`: ô mật ong, hình con ong mực ở `scale(.9)`.
- O2 là `#tpl-o2` + `lockupSVG(no)`.

Ảnh nộp vào `.playwright-cli/shots/v3/lat10/`.

## Phần A — favicon, icon điện thoại, ảnh chia sẻ

| Tệp | Việc |
|---|---|
| `app/favicon.ico` | ICO gồm ba ảnh PNG: **16 px = F2**, 32 và 48 px = M2 vẽ từ vector |
| `app/apple-icon.png` | 180×180, **P2**, không trong suốt |
| `app/manifest.ts` + icon trong `public/` | icon 192 và 512 px (xem §A.3) |
| `app/opengraph-image.tsx` (+ ảnh Twitter) | **O2**, 1200×630, theo Số nổi bật |
| `app/layout.tsx` (`metadata`) | Open Graph, Twitter, `metadataBase` |
| một script tạo tài sản (gợi ý `scripts/brand-assets.*`) | sinh ICO, PNG 180/192/512 từ tệp logo và lưới F2; chạy lại được khi logo đổi |

1. **Không thêm favicon SVG** và không thêm `app/icon.svg`/`icon.png`. Nếu có, trình duyệt sẽ dùng chúng thay cho bản 16 px vẽ tay.
2. **Bản 16 px trong ICO** phải **trùng từng điểm ảnh** với `?icon=f2&size=16` của bảng. Bản 32 và 48 px cũng trùng như vậy, hoặc lệch
   không đáng kể (khử răng cưa). Bản 180 px trùng với `?touch=p2&size=180`.
3. **Manifest:**
   - `name` và `short_name` là "HIVE", `start_url` là "/", `display: "browser"` (không bật chế độ cài như app).
   - `theme_color` và `background_color` theo `viewport.themeColor` hiện có (`#ffffff`).
   - Icon 192 và 512 px, `purpose: "maskable"`. Hình con ong phải nằm trong **vòng an toàn 80%**, tức điểm xa tâm nhất ≤ 40% cạnh ảnh.
     Ở `scale(.9)` các góc chân chữ H rơi ra ngoài vòng này, nên bản maskable thu nhỏ vừa đủ. Tính tỉ lệ rồi ghi vào chú thích.
     Có thể thêm bản `purpose: "any"` ở `scale(.9)`.
   - Đọc `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/` (manifest, app-icons,
     opengraph-image) trước khi viết.
4. **Ảnh chia sẻ O2:**
   - Nền vải đen.
   - Lockup `HIVE.NN`: mark, chữ W3 màu trắng, và `.NN` màu mật ong ghép từ `hive-number.json` đúng luật `compose`. `NN` là số của Số
     nổi bật (`featuredDrop` trong `lib/drop.ts`, `issueNo` trong `lib/lexicon.ts`).
   - Đường may đứt nét mật ong, rồi câu đề bìa lấy từ **`HOME_COVER.headline`** (không chép lại chuỗi), ngắt thành hai dòng như bảng,
     Unbounded 800 màu trắng.
   - Hình học lấy từ `.o2` trong bảng (đơn vị `--u` = 1/1200).
   - `alt` bằng tiếng Việt.
   - **Không gọi mạng lúc chạy:**
     - font nếu cần thì là tệp commit trong repo (Satori không đọc woff2), ghi giấy phép OFL cạnh tệp;
     - hoặc chuyển dòng chữ cố định thành đường nét lúc build, nhưng vẫn đọc từ `HOME_COVER`.

     Chọn một cách và nói vì sao.
   - Twitter dùng cùng ảnh, `summary_large_image`.
5. **Metadata:**
   - `openGraph`: `siteName` "HIVE", `title` "HIVE", `description` = **mô tả A**, là câu `metadata.description` đang có ("Streetwear
     unisex bán theo số. Mỗi số cắt một lần."), `locale` "vi_VN", `type` "website".
   - `metadataBase`: theo tài liệu Next 16, sao cho `og:image` là URL tuyệt đối trên Vercel. Không cứng hoá domain nếu tài liệu cho lấy
     từ môi trường.
6. **Nguồn gốc raster** (FINISH):
   - Mọi PNG hay ICO đi vào `app/` và `public/` mang nguồn gốc bằng lệnh
     `.claude/skills/impeccable/scripts/impeccable embed-prompt <tệp> --prompt "<nguồn: tệp logo + lưới F2 + script>"`.
   - Kiểm lại bằng `impeccable embed-prompt --scan app public`.
   - ICO không nhúng được thì ghi nguồn trong chú thích của script và báo lại.
7. **Không thêm thư viện:** tự viết bộ ghi ICO; raster hoá bằng Chrome của Playwright đã có trong devDependencies.

## Phần B — biển Số chỉ hiện khi có Số đang bán

1. `components/shop/SiteNav.tsx`:
   - chỉ render biển khi Số nổi bật `OPEN`;
   - bỏ nhánh `soon`/`shut` cùng href `/#next` và `/so/N`;
   - `on` và `aria-current` vẫn theo `activeDrop`;
   - sửa các chú thích (tài liệu đầu component, prop `activeDrop`, và ghi chú trong `ShopFrame.tsx` nếu còn nhắc trạng thái khác).
   - `plateLabel()` giữ nguyên cùng test.
2. CSS:
   - bỏ `.itag.soon`, `.itag.shut`, `.itag.soon:hover` ở `nav.css`, và ở `desktop.css` nếu có;
   - **từ 900 px, khi không có biển, năm họ vẫn phải canh giữa thanh.** Lưới bốn cột có một cột rỗng sẽ đẩy cụm lệch về một bên
     (khoảng 12 px). Dùng template riêng khi thiếu biển, ví dụ `:has()`, hoặc đặt cột tường minh. Đo độ lệch tâm; lệch 6 px chủ ý do
     lề 40/28 thì giữ.
3. **Chứng minh trạng thái không có biển:**
   - Dữ liệu thật luôn có Số đang bán. Cách được phép: sửa tạm giờ mở/đóng của Số trong **DB cục bộ** (`supabase` local, không bao giờ
     đụng hosted) rồi trả lại; hoặc test render.
   - Chụp thanh ở 1280 và 390 khi không có biển, đo lệch tâm.
   - Trạng thái thường phải **trùng từng điểm ảnh** với `prototype/name/nav/bar-1280.png`, `bar-900.png`, `bar-390.png`, `bar-360.png`.

## Phần C — nhân tiện, từ lát 9

Lớp chờ (`components/shop/WaitVeil.tsx`) hiện vẫn chặn con trỏ khoảng 330 ms lúc đóng trên trang mới. Phiên chính quyết: **nhả con
trỏ ngay khi trang về**, vì phần đóng không được làm chậm trang mới. Cụ thể:
- ở pha `end`, lớp không còn nhận con trỏ, trong khi vẫn vẽ phần đóng;
- `cursor: progress` cũng thôi ngay lúc đó.

Sửa chú thích tương ứng. Kiểm bằng `elementFromPoint` ngay sau khi trang về: điểm giữa trang phải trúng trang, không trúng `.veil`.

## Không đụng

`DESIGN.md` (phiên chính cho documenter viết một lượt sau lát 9 và 10), mock, Supabase hosted, lớp chờ của lát 9 (trừ khi test cần).

## Kiểm (agent tự chứng minh)

1. `npm run typecheck`, `npm test`, `npm run build`.
2. Dừng 3200, build, chạy `npm run preview:serve` nền và **để nó chạy**.
3. Trên 3200:
   - `<head>` có favicon ICO, `apple-touch-icon`, manifest, `og:image` tuyệt đối, `og:title`, `og:description` (mô tả A),
     `twitter:card`;
   - không có favicon SVG;
   - `/favicon.ico`, `/apple-icon.png`, `/opengraph-image` và manifest trả 200 đúng kiểu nội dung.
4. **So từng điểm ảnh** với chế độ xuất của bảng (PSNR hoặc số điểm lệch):
   - ba ảnh trong ICO;
   - ảnh 180 px;
   - 192 và 512 px, với bản maskable thì chỉ nêu tỉ lệ đã chọn;
   - ảnh chia sẻ ở Số 05.

   Lệch vì cách raster font thì nói rõ ở đâu.
5. Phần B: ảnh và số đo ở §B.3; `tools/layout-sweep.js` một lượt; 0 lỗi console.

## Báo cáo

Báo lại những mục sau:
- danh sách tệp;
- kết quả typecheck, test và build;
- cách làm ảnh chia sẻ (font hay đường nét) và lý do;
- bảng so điểm ảnh;
- các thẻ `<head>`;
- kết quả kiểm nguồn gốc raster;
- ảnh và số đo phần B;
- mọi chỗ lệch hoặc quyết định agent phải tự đưa ra;
- trạng thái 3200.

**Không commit.**
