# Brief: v6 lát E0, nền song ngữ Việt và Anh

*01/10/2026. Agent `ui-implementer`. Không commit.*

Đợt v6 đưa demo tới khách nước ngoài. Người dùng đã chốt: tiếng Anh cho cả cửa hàng lẫn quản trị (QĐ-40), và một bảng thuật
ngữ. Cả hai nằm ở cuối `tasks/plan.md`, mục "Đợt v6", gồm "QĐ-40" và "Thuật ngữ tiếng Anh".

Lát này dựng **nền** và chứng minh nó trên **khung** của hai vùng: thanh trên, tab, tabbar và chân trang của cửa hàng; thanh
bên của quản trị. Phần thân các màn vẫn là tiếng Việt ở chế độ EN; các lát E1 trở đi làm tiếp theo đúng mẫu lát này đặt ra.
Vì vậy mẫu phải dễ chép lại, và phải được ghi rõ trong báo cáo.

**Luật chung:**
- Đọc trước: `AGENTS.md`; trong `node_modules/next/dist/docs/` đọc `01-app/02-guides/internationalization.md`, rồi phần
  `cookies`, Server Actions và `proxy`; `lib/lexicon.ts`; `registry/PATCHES.md` §2 "Việt hoá"; mục "Đợt v6" của `tasks/plan.md`.
- **Trước khi dựng nút đổi ngôn ngữ**, đọc skill `.agents/skills/design-taste-frontend/SKILL.md` và áp phần hợp với một nút nhỏ
  trong hệ đã có. Không thiết kế lại thanh trên.
- Được ghi trong `app/`, `components/`, `lib/`, `data/` và test bên cạnh, cộng thêm **`proxy.ts`** ở gốc repo,
  **`registry/components/**`** và **`registry/PATCHES.md`**. Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `tasks/`,
  `tools/`, `supabase/`, `.impeccable/`, `.claude/`.
- **Không thêm thư viện.** Không dùng tệp JSON cho chữ.
- **Server:** giải phóng cổng 3200 bằng `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`, chạy thành
  một lệnh riêng. Mã 1 thì dừng lại và báo.
- Không ghi DB. Không commit, không đụng git ngoài `git status` và `git diff`.

## 1. Ảnh "trước", chụp trước mọi thay đổi
- Mọi route của cửa hàng ở 390 và 1280, mọi route quản trị ở 1280. Danh sách route lấy từ `tools/layout-sweep.js`.
- Dùng khung nhìn cao bằng trang, không dùng `fullPage`. Đồng hồ và giờ "đặt lại lần cuối" đổi thì ghi chú, không tính là lệch.
- Đo JS nén của `/`, `/products`, `/admin/orders`.

## 2. Hành vi

### 2.1 Chọn ngôn ngữ
- `type Locale = "vi" | "en"`, mặc định `"vi"`. Cookie `hive-lang`: một năm, `SameSite=Lax`, `path=/`.
- **Thứ tự quyết**, viết thành một hàm thuần có test, ví dụ `chooseLocale({ param, cookie, acceptLanguage })`:
  1. `?lang=vi` hoặc `?lang=en` hợp lệ;
  2. cookie hợp lệ;
  3. `Accept-Language`: lấy ngôn ngữ có trọng số `q` cao nhất. Nếu đó là `vi` hay `vi-*` thì VI, còn lại EN. Ví dụ
     `fr-FR,fr;q=0.9` ra EN;
  4. **không có header thì VI, và không đặt cookie.** Bot tạo ảnh xem trước link thường không gửi header này.
- **`proxy.ts`:**
  - Có `?lang=` trên một yêu cầu GET: đặt cookie, rồi chuyển hướng 307 về đúng URL đó, bỏ riêng `lang`. **Mọi tham số khác giữ
    nguyên**, vì bộ lọc và trang nằm trong URL (QĐ-8). Ví dụ `/products?line=fixed&lang=en` về `/products?line=fixed`.
  - Chưa có cookie mà quyết được từ header: đặt cookie lên response, **và lên request** để ngay lượt vẽ đầu đã đúng ngôn ngữ.
    `setAll` của Supabase trong cùng tệp đã làm đúng việc này cho cookie phiên; làm cùng cách.
  - Không làm hỏng phần làm mới phiên Supabase và header `PATH_HEADER`.
- `<html lang>` theo ngôn ngữ, ở `app/layout.tsx`.
- **Server:** `getLocale()` đọc cookie qua `next/headers`, rơi về `"vi"`. **Client:** `LocaleProvider` ở root layout, và
  `useLocale()`.
- **Đổi ngôn ngữ** là một Server Action đặt cookie. Trang vẽ lại tại chỗ, **không mất state phía trình duyệt**: giỏ hàng, ô đang
  gõ, menu đang mở. Kiểm hành vi làm mới sau khi action đặt cookie trong tài liệu Next 16, đừng đoán. Không có JS thì form vẫn
  phải đổi được ngôn ngữ.

### 2.2 Chữ song ngữ, mẫu bắt buộc
- Chữ nằm **tại chỗ**, thành cặp `{ vi, en }` có kiểu chặt: thiếu một bên là lỗi `tsc`. Đặt các helper nhỏ trong `lib/i18n.ts`:
  - `Locale`, `Pair<T>`, `pick(pair, locale)`;
  - số nhiều tiếng Anh qua `Intl.PluralRules("en-GB")`. Ví dụ "1 item" / "2 items". Tiếng Việt không có số nhiều.
- **Hàm trong `lib/` nhận `locale: Locale = "vi"`** ở tham số cuối. Toàn bộ test hiện có (1.763) phải xanh **mà không sửa**. Chỉ
  được sửa test của chính chỗ buộc phải đổi (ví dụ `arc-english-strings`), và nói rõ từng test đã sửa. Test mới thì viết cho
  `en`.
- **Từ chung ở một chỗ.** Thêm bản tiếng Anh, theo đúng bảng thuật ngữ, cho:
  - `lib/lexicon.ts` (Drop, Next drop, Drop calendar, In this drop, Basics…; câu đề "Cut once." / "No restocks.");
  - `lib/order-labels.ts` (trạng thái đơn, phương thức thanh toán);
  - `DROP_STATE_LABEL` và `ISSUE_STATE`. Trạng thái `OPEN` là "Live", không dùng "On sale".

  Màn nào dùng các từ này thì đổi sang tiếng Anh ở lát của màn đó, không phải lát này.
- **Chữ tiếng Anh:**
  - mục nào có trong bảng thuật ngữ thì bắt buộc theo bảng;
  - chữ ngoài bảng do agent viết, kiểu Anh, ngắn như bản Việt;
  - không thêm câu giải thích khái niệm (luật "không mô tả khái niệm trên UI").

  Liệt kê mọi chữ tiếng Anh tự viết trong báo cáo. Phiên chính sẽ đọc lại từng chữ.

### 2.3 Số, tiền và ngày
- `vnd(amount, locale)` và `plainVnd`: VI `390.000₫`, EN `390,000₫`.
- `lib/datetime.ts` vẫn tách giờ Việt Nam từ chuỗi ISO như hiện nay, không chuyển sang `Intl` cho ngày.
  - `clockLabel`: `18:50` ở cả hai.
  - `dayMonth`: VI `01/10`, EN `1 Oct`.
  - `dayMonthYear`: VI `01/10/2026`, EN `1 Oct 2026`.
  - `dateTimeLabel`: VI `18:50 ngày 01/10`, EN `18:50, 1 Oct`.
  - `weekdayLabel`: VI như cũ, EN `Monday`…
  - Tên tháng tiếng Anh lấy từ một bảng cố định ba chữ (`Jan` … `Sep` … `Dec`), để không phụ thuộc phiên bản ICU.
- Các chỗ khác đang tự nhóm hàng nghìn thì nhóm theo ngôn ngữ.

### 2.4 Arc theo ngôn ngữ
- Các chỗ đã vá sang tiếng Việt trong `registry/components/**` (`PATCHES.md` §2) đọc ngôn ngữ từ một context do `ArcAdminFrame`
  cấp.
- Bản EN dùng lại đúng chữ gốc của Arc. Lịch vẫn bắt đầu thứ Hai ở cả hai, vì đó là kiểu Anh. Số viết theo ngôn ngữ.
- Ghi từng chỗ sửa vào `PATCHES.md`.
- Sửa `arc-english-strings.ts` và test của nó. Mục đích giữ nguyên: cài lại bản Arc mới thì chuỗi gốc không được lọt vào bản VI.

### 2.5 Nút đổi ngôn ngữ (người dùng đã duyệt chỗ đặt)
- **Cửa hàng:** ở thanh trên, đứng trước các icon, trên **mọi** thanh trên, kể cả thanh riêng của trang thanh toán. Có trên cả
  máy tính lẫn điện thoại.

  ```
  Máy tính
  ┌───────────────────────────────────────────────┐
  │ HIVE  Bảng tin  Cửa hàng  Sắp mở   EN ○ ○ ○ ○ ○ │
  └───────────────────────────────────────────────┘
  Điện thoại
  ┌──────────────────────────┐
  │ HIVE                EN  ○  │
  └──────────────────────────┘
  ○ = icon có sẵn của FeedTop
  ```

  - Nút hiện mã của ngôn ngữ **sẽ chuyển sang**: đang VI thì hiện `EN`, đang EN thì hiện `VI`.
  - Tên cho trình đọc màn hình là tên ngôn ngữ đích viết bằng chính ngôn ngữ đó: "English" hoặc "Tiếng Việt", kèm thuộc tính
    `lang`.
  - Vùng chạm như các `.ib` bên cạnh. Chữ và màu dùng token Feed. Vòng focus theo luật `data-pointer`.
- **Quản trị:** ở chân thanh bên, ngay trên dòng tên người đăng nhập. Dùng `SegmentedControl` của Arc, cỡ `sm`, hai mục
  "Tiếng Việt" và "English". Mỗi mục có `lang` riêng.

### 2.6 Chữ của lát này
- **Cửa hàng:**
  - `FeedChrome`: thanh trên, tab, tabbar, chân trang, nhãn cho trình đọc màn hình (giỏ, thông báo…);
  - `FOOT_HELP`, `footDelivery()`, `footPayments()` trong `lib/feed-home.ts`;
  - nhãn "Quay lại" của `FeedMbar`.
- **Quản trị:**
  - `ArcAdminFrame`, `ArcSidebar` (điều hướng, số đơn cần xử lý, khối "Dữ liệu mẫu");
  - `ArcResetDialog` và toast của việc đặt lại.
- `<title>` và metadata chưa đổi ở lát này.

## 3. Kiểm
- `npm run typecheck`, `npm test`, `npm run build` sạch. Báo số test trước và sau.
- **Bản VI không đổi một pixel**, trừ nút đổi ngôn ngữ và chỗ nó chiếm. Chụp lại đủ bộ ở §1 rồi so pixel. Chỗ nào lệch thì giải
  thích, kèm ảnh.
- **Bản EN:** chụp cùng bộ route với cookie `hive-lang=en`. Khung hai vùng phải là tiếng Anh. Phần thân còn tiếng Việt là đúng
  ở lát này. Soát chữ tràn hay xuống dòng ở tab, tabbar và badge, vì chữ Anh có chỗ dài hơn ("Notifications", "Coming soon").
- **Hành vi:**
  - Chrome của playwright gửi `vi-VN`, nên ra VI.
  - `?lang=en` ra EN, URL sạch, giữ các tham số khác (thử `/products?line=fixed&lang=en`).
  - Đổi lại bằng nút. Giỏ còn nguyên. Trên trang thanh toán, gõ tên rồi đổi ngôn ngữ, chữ đã gõ còn nguyên.
  - Bằng `curl`:
    - không có `Accept-Language`: `<html lang="vi">` và không có `Set-Cookie: hive-lang`;
    - `en-US`: `lang="en"` và có cookie;
    - `fr-FR`: ra EN.
  - Bàn phím: Tab tới nút, Enter đổi ngôn ngữ, vòng focus đúng.
  - Quản trị: `SegmentedControl` đổi ngôn ngữ. Chữ Arc đã vá đổi theo, ví dụ nút đóng hộp và lịch. Focus đúng.
- **Sweep:** chạy bản sao `tools/layout-sweep.js` ở scratchpad, ở cả hai ngôn ngữ (đặt cookie). Báo phát hiện mới. Chỗ bản gốc
  cần sửa để chạy được hai ngôn ngữ thì ghi lại, phiên chính sẽ sửa.
- `impeccable detect` cho `app components registry`: số phát hiện trước và sau.
- JS nén của `/`, `/products`, `/admin/orders` sau thay đổi, so với §1.

## 4. Ảnh
`.playwright-cli/shots/v6/e0/`: `before-*`, `after-vi-*`, `after-en-*`, cộng ảnh cho từng hành vi ở §3.

## 5. Báo cáo
Theo hợp đồng trong định nghĩa agent. Thêm các mục:
- **mẫu đã chọn**, viết sao cho lát sau chép lại được: helper, provider, cách một component client và một hàm `lib/` lấy chữ, cách
  làm mới sau khi đổi ngôn ngữ, và lý do của từng lựa chọn;
- tệp đã tạo và đã sửa; chỗ vá Arc mới;
- test trước và sau, kèm danh sách test cũ đã phải sửa;
- mọi chữ tiếng Anh tự viết;
- số đo JS trước và sau;
- "Xung đột luật" và "Chưa làm".

Gửi trọn trong **tin cuối**, và ghi thêm `REPORT.md` cạnh ảnh. Để server 3200 chạy cho phiên chính duyệt.
