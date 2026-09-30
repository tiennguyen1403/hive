# Brief: DESIGN.md cho đợt v4, phần khách chạy Feed, quản trị còn v3

*30/09/2026. Agent `impeccable-documenter`. Không commit.*

- Chỉ ghi `DESIGN.md` và `.impeccable/design.json`.
- Không đụng mã, `prototype/`, `PRODUCT.md`, `README.md`, `tasks/`, `.claude/`, `.impeccable/config*.json`. Không thêm ignore
  cho máy dò: phiên chính quyết phần đó.
- Không git commit, stash, reset hay checkout.

## 1. Vì sao viết lại

DESIGN.md hiện tả hệ v3 "NHÃN": vải đen, chỉ mật ong, sàn trắng, Be Vietnam Pro + Unbounded, Iconsax, bo 4px. Từ đợt v4
(27–30/09, QĐ-32 đến QĐ-36), **toàn bộ phần khách chạy hệ Feed** và đã lên demo (`c018134`):
- một màu nhấn xanh `#1846F0`;
- Mona Sans;
- icon Phosphor;
- nút, chip và ô nhập bo tròn hẳn;
- logo đen trắng.

**Khu quản trị vẫn là v3** tới vòng mock riêng của nó. Lát 5 đã dọn mọi mã và CSS v3 mà phần khách không còn dùng.

Máy dò thiết kế (`impeccable detect`, cũng chạy trong hook sau mỗi lần sửa UI) đọc DESIGN.md và `.impeccable/design.json`.
Hôm nay nó chấm mã Feed theo bảng v3: 176 phát hiện, 163 ở mã Feed, trong đó 142 là "cỡ chữ lệch thang". Đo ngày 30/09:

```
impeccable detect --json app components
```

Tài liệu phải tả **cái đang chạy**, đọc ra từ code. Chỗ tài liệu và code lệch nhau thì code đúng.

## 2. Nguồn đọc

- **Hợp đồng định dạng:** `.claude/skills/impeccable/reference/document.md`. Theo nó cho **khối token frontmatter** và **sidecar
  `.impeccable/design.json`**.
- **Hệ Feed trong app:**
  - token `--f-*`: khối token Feed trong `app/globals.css`;
  - CSS: `app/styles/feed/feed.css`, `flow.css`, `account.css`, `more.css` (2.575 dòng). Mỗi tệp chép rule của tệp cùng tên
    trong mock, cùng thứ tự; mọi selector dưới `[data-ui="feed"]`;
  - luật vùng: `app/styles/feed/scope.test.ts`;
  - vùng và font: `components/feed/FeedScope.tsx` (`FEED_ZONE`, `feedFontClass`), `components/feed/font.ts`;
  - khung: `components/feed/FeedFrame.tsx`, `FeedChrome.tsx`, `FeedMbar.tsx`;
  - thành phần: `components/feed/**`;
  - logic màn: `lib/feed-*.ts`.
- **Mock, thước đo của bản dựng:**
  - `prototype/explore/feed/*.html` cùng tệp `.js` của từng trang;
  - `feed.css`, `flow.css`, `account.css`, `more.css`, `feed.js` (đầu tệp có hợp đồng khung trang);
  - `BRIEF.md`: mọi quyết định vòng 1–4 và các lượt sửa bố cục;
  - `direction.json`: tên, ý, bảng màu, chữ, hình khối, chuyển động.
- **Hợp đồng hướng (THESIS, OWN-WORLD…):** chưa có văn bản riêng. Đọc từ `BRIEF.md` (mục *Principles*, *Palette*, *Type*,
  *Shape rule*, *Motion*, *Not in this direction*) và `direction.json` (`idea`, `palette`, `type`, `shape`, `motion`, `words`).
- **Quyết định của người dùng trong đợt v4:** `tasks/plan.md`, mục "Đợt v4 Feed" (từ dòng ~2202 tới cuối), gồm QĐ-32 đến QĐ-36,
  các xung đột người dùng đã nhận, và ghi chú từng lát kèm phép đo. Mục 4 dưới đây tóm tắt những gì bắt buộc phải có.
- **Quản trị v3:**
  - token trong `app/globals.css` (`@theme` và bí danh ngắn);
  - 12 tệp `app/styles/*.css` không nằm trong `feed/` (1.791 dòng);
  - `components/admin/**`, `components/ui/**`, `components/icon/**`;
  - bản DESIGN.md v3 đầy đủ: `git show c018134:DESIGN.md`.
- **`DESIGN.md` hiện tại:** giữ mọi điều còn đúng, như nguồn ảnh, luật dữ liệu, đồng hồ, cách đo. Bỏ điều đã sai.

## 3. Hình dạng tài liệu

- **Khung 10 mục của dự án giữ nguyên số mục.** Định nghĩa agent và `tasks/plan.md` trích theo số: §3 thang chữ, §6 thứ tự chồng
  lớp, §8 bảng thành phần, §9 "Ba quy tắc không thương lượng" (quy tắc 1, 2, 3), §10 phép đo. Chỗ này brief thắng thứ tự 8 mục của
  `document.md`. Mục nào của `document.md` (Overview, Elevation, Do's and Don'ts…) thì đặt vào mục tương ứng của khung này.
- **Frontmatter là hệ Feed**, tức hệ của cửa hàng, theo đúng schema của `document.md`:
  - `colors`: các giá trị `--f-*`;
  - `typography`: Mona Sans, mọi cỡ chữ Feed thật sự dùng, gom theo vai;
  - `rounded`, `spacing`: thang của Feed;
  - `components`: nút, chip, ô nhập, thẻ, sheet, thanh.

  **Không** trộn token v3 vào frontmatter. Hệ quản trị tả ở §7 bằng văn xuôi và bảng gọn.
- Văn xuôi tiếng Việt, câu ngắn, danh sách khi liệt kê. Tên class, tệp, hàm, token viết nguyên văn tiếng Anh.
- Mỗi luật kèm chỗ nó sống (tệp và selector, hoặc tệp và hàm). Mỗi con số lấy từ code hoặc từ phép đo có ghi ngày.
- Đầu tài liệu:
  - một đoạn ngắn: đợt v4, ngày, commit `c018134`;
  - phần khách chạy Feed, quản trị chạy v3;
  - bản v3 đầy đủ xem bằng `git show c018134:DESIGN.md`.

  Bỏ chuỗi "Cập nhật …" của các đợt trước; lịch sử đã có trong git và `tasks/plan.md`.

## 4. Nội dung bắt buộc

**§1 Nguồn của sự thật**
- Bảng nơi sống của từng thứ, cho hệ Feed: token, CSS, vùng, font, icon, logo, từ vựng, tên site, ảnh, đồng hồ, lớp chờ.
- Luật vùng Feed:
  - mọi selector dưới `[data-ui="feed"]`, token `--f-*`;
  - Feed không dùng tên `.sheetwrap`, `.menu3`, `.toast`, `.veil`; `.sr-only` dùng chung;
  - `scope.test.ts` giữ các luật này.
- Tailwind chỉ là theme + preflight (QĐ-23).
- Ảnh: nguồn `public/shots`, hình phẳng, cách sinh. Tệp thương hiệu sinh bằng máy, bản đen trắng (QĐ-33, `scripts/brand-assets.ts`).
- Kho trên thiết bị:
  - khoá còn dùng: `brand.cart`, `brand.promo`, `brand.searches`, `brand.height`, `brand.adminCols`;
  - cookie `inbox_read`;
  - `lib/device-storage.ts` xoá 10 khoá đã nghỉ;
  - yêu thích, nhắc, size và công tắc thông báo lưu theo tài khoản (`MyStateProvider`, cập nhật lạc quan).

**§2 Màu**
- Bảng Feed đọc từ token.
- Luật một màu nhấn: xanh; đỏ chỉ cho lỗi.
- Khối nền tối chữ trắng ở đâu (QĐ-36 #2).
- Trạng thái.
- Công tắc lúc tắt nền `#D5D7DC`: người dùng nhận tương phản ~1,4:1 (lát 3a).
- `::selection` và `caret-color` theo màu Feed (luật giữ #18).

**§3 Chữ**
- Mona Sans qua `next/font/google`: trục `wdth`, 75% cho chữ hiển thị, 100% cho chữ giao diện.
- Font dự phòng cho ₫ (`adjustFontFallback: false`, Segoe UI).
- Thang chữ thật: mọi cỡ đang dùng, gom theo vai.
- Được phép: chữ hiển thị trên 6rem (#15); không `tabular-nums` ở giá thẻ lựa chọn và cột giờ hộp thư.
- Chữ trên màn:
  - xưng "tôi/bạn" (#9); "ĐÃ HẾT" (#13); tên mẫu không kèm "S05 –" (#3);
  - nhãn ngắn, không giải thích khái niệm;
  - khoảng ngày không ngắt dòng (luật giữ);
  - câu bìa "Cắt 1 lần. Không tái bản.".
- Font v3 chỉ còn cho quản trị, `preload: false`.

**§4 Hình khối & khoảng cách**
- Bo góc: nút, chip, ô nhập tròn hẳn; thẻ lựa chọn 16px; sheet 20px hai góc trên; ảnh nhỏ 10px; các giá trị khác nếu code có.
- Tỉ lệ ảnh: story 8:11, thẻ rộng, 4:3 (#5).
- Ô lồng trong khối (#10).
- Cột trang `--f-max`, lề `--f-g`.
- Breakpoint của Feed: tablet cột 600px; dải 900–1199; máy tính (#14).

**§5 Vùng chạm**
- Vùng chạm vô hình 46 qua `::after`, đo ra ≥ 44 (luật giữ #16).
- Chip `inset:-5px 0`.
- Các phép đo của lát 3a–4b.

**§6 Con trỏ, focus, nhấn, chuyển động, lớp nổi, thứ tự chồng lớp**
- Vòng focus xanh không bo; dòng công tắc bo 12px (lát 4). Cơ chế `data-pointer`.
- Nhấn `scale(.97)`.
- Nút vô hiệu: nền `--f-bg2`, ghi sự thật (#6); nút không icon (#1).
- Chuyển động 0,6–0,7 giây, hiện dần, lò xo (#8). Khối giảm chuyển động có `!important`.
- Khối xám nhấp nháy 1,1 giây lặp (lát 4).
- Sheet là `<dialog>`, toast Feed, lớp chờ `WaitVeil` bản đen trắng ở route Feed.
- Bảng `z-index` mới: Feed và quản trị.

**§7 Hai bề mặt**
- Cửa hàng (Feed): thanh trên; tab đáy điện thoại 5 mục; thanh của màn đẩy vào (`.mbar`); đầu trang máy tính; chân trang 5
  link.
- Quản trị (v3):
  - vùng `.s.adm3`, chỉ bản máy tính (≥ 1180px);
  - bảng token v3 gọn, gồm những token quản trị còn đọc;
  - font v3, icon Iconsax (Linear/Bulk), bo 4/3px;
  - lớp portal `.sheetwrap`, `.menu3`, `.toast`;
  - 12 tệp CSS.
  Chỉ tới `git show c018134:DESIGN.md` cho chi tiết. Ghi rõ: vòng mock quản trị Feed sẽ thay phần này.

**§8 Thành phần, bảng tra**
- Thành phần Feed: tên component, class chính, trạng thái. Gồm:
  - khung, thẻ, khối, cửa hàng, thêm nhanh, sheet, bộ chọn, toast, đồng hồ, chép, hộp thư;
  - thành phần của trang chủ, sản phẩm, giỏ, thanh toán, đơn, tài khoản, Hỏi đáp, Số;
  - trạng thái đang tải, rỗng, lỗi dưới ô, Hoàn tác, ô `.b-slot` "Đang chuẩn bị".
- Thành phần v3 còn sống: `components/ui/*`, `components/admin/*`. Tóm tắt thôi.

**§9 Ba quy tắc không thương lượng**, giữ số thứ tự:
1. Không bịa. Dữ kiện chưa có vào ô `.b-slot` "Đang chuẩn bị", chỉ có nhãn (lát 4b).
2. Mọi con số suy từ dữ liệu qua `lib/`.
3. Không nút chết.

Thêm các luật vô hình người dùng giữ (vùng chạm 46, bộ lọc trên URL, selection/caret, khoảng ngày), và phần Nên / Không nên của
`document.md`.

**§10 Đã đo**
- Các phép đo có ngày của đợt v4:
  - lát 5:
    - CSS chính 183.358 B thô, 30.924 B gzip;
    - font tải trước 3;
    - 12 tệp CSS v3, 1.791 dòng; 4 tệp CSS Feed, 2.575 dòng;
    - 1.643 test, 296 test DB;
    - so 120 cặp ảnh không đổi hình;
  - so hình học với mock lệch ≤ 1px (lát 3a/3b/4b); vùng chạm; sweep.
- Số phát hiện của máy dò trước và sau lần viết lại này.

**Luật cũ đã nhường cho Feed (QĐ-36):** ghi một bảng gọn, mỗi dòng gồm luật cũ, Feed làm gì, ai quyết và ngày.
- 15 mục của lát 0.
- Các mục nhỏ lát 0 báo thêm.
- 4 mục lát 1b, 5 mục lát 3a, 1 mục lát 3b.
- 4 mục lát 4.
- Lát 2: bỏ ô đồng ý, email tuỳ chọn.

**Đây là luật của hệ, người dùng đã chốt theo tên, không phải khiếm khuyết.** Có mục trùng với thứ craft floor cấm, ví dụ "nhãn
trên tiêu đề" (#4) hay "nút không icon" (#1). QĐ-36 cho mock Feed thắng craft floor. Ghi chúng là luật, kèm số QĐ. **Đừng** đưa
chúng vào dòng "không canonize".

**Dòng "không canonize"** (theo hợp đồng output của bạn) dành cho khiếm khuyết thật mà bản dựng mang, ví dụ:
- `<next-route-announcer>` nằm ngoài vùng Feed nên tải font v3 sau lần điều hướng đầu;
- vài rule v3 chỉ sống nhờ kiểu dữ liệu;
- 12 token màu `@theme` không bí danh nào đọc.
Tự dò thêm nếu thấy.

## 5. Kiểm trước khi nộp

- Chạy lại:

  ```
  .claude/skills/impeccable/scripts/impeccable.cmd detect --json app components
  ```

  Đếm phát hiện `design-system-*` theo vùng: `components/feed`, `app/styles/feed`, quản trị/v3.
  - Mục tiêu: mã Feed không còn phát hiện `design-system-*`, trừ những chỗ bạn chỉ ra là lệch thật.
  - Mỗi phát hiện còn lại ở Feed phải có lời giải thích: hoặc code lệch khỏi hệ (ghi vào dòng "không canonize"), hoặc giá trị
    thật mà tài liệu còn thiếu (thêm vào).
  - Quản trị v3 sẽ nhiều phát hiện hơn. Đếm và báo; phiên chính quyết ignore có hạn chót.
- Kiểm: frontmatter parse được, `design.json` đúng schema của `document.md`.
- Mọi đường dẫn tệp nhắc trong tài liệu phải có thật.

## 6. Nộp

Theo hợp đồng output của agent, gửi trọn trong **tin cuối**:
- đường dẫn đã ghi;
- tóm tắt hệ 5 dòng;
- dòng "không canonize".

Kèm thêm:
- số phát hiện của máy dò trước và sau, theo vùng;
- danh sách chỗ trong `tasks/plan.md`, định nghĩa agent hay `PRODUCT.md` còn trích số mục hay nội dung DESIGN.md đã đổi, để phiên
  chính sửa.
