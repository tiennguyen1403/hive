# Brief: DESIGN.md cho đợt v6, app song ngữ Việt và Anh

*07/10/2026. Agent `impeccable-documenter`. Không commit.*

- Chỉ ghi `DESIGN.md` và `.impeccable/design.json`.
- Không đụng mã, `registry/`, `prototype/`, `PRODUCT.md`, `README.md`, `tasks/`, `.claude/`, `.impeccable/config*.json`.
  Không thêm ignore cho máy dò: phiên chính quyết phần đó, sau khi hỏi người dùng.
- Không git commit, stash, reset hay checkout.
- **Giữ ngữ cảnh gọn:** đọc tệp lớn theo đoạn; kết quả script ghi ra tệp, chỉ in tóm tắt.

## 1. Vì sao cập nhật

`DESIGN.md` hiện là bản đợt v5 (cửa hàng chạy Feed, quản trị chạy Arc), viết khi app chỉ có tiếng Việt. Đợt v6 làm app **song ngữ
Việt và Anh, cả cửa hàng lẫn quản trị** (QĐ-40), để demo cho khách nước ngoài. Các lát đã xong:

| Lát | Nội dung | Commit |
|---|---|---|
| E0 | nền: cookie, `proxy.ts`, `lib/i18n.ts`, nút đổi, vá Arc theo ngôn ngữ | `e363ab3` |
| B15 | cột tiếng Anh của mẫu và mẫu hé lộ trong DB | `a00c5ea` |
| E1 | trang chủ, Cửa hàng, trang mẫu, tìm, `/so` | `da8114e` |
| E2 | giỏ, thanh toán, đặt hàng xong, tra đơn | `2cff7ca` |
| E3a | tài khoản; sửa Yêu thích ở 900–1250px | `8822bc0` |
| E3b | trang trợ giúp, 404 | `c578545` |
| E4 | quản trị: Tổng quan, Nhật ký, Đơn, phiếu giao, Khách | `b3e8cff` |
| E5 | quản trị: Mẫu, Các số, Mã giảm giá | `bea062e` |

Tài liệu phải tả **cái đang chạy**, đọc ra từ code. Chỗ tài liệu và code lệch nhau thì code đúng.

**Không ghi những gì chưa dựng:**
- QĐ-41 (Google), QĐ-42 (Stripe), QĐ-44 (che dữ liệu người thật), QĐ-45 (xoá tài khoản thật mỗi ngày);
- trang `/privacy`.

Các lát đó sẽ cập nhật tài liệu khi xong.

## 2. Nguồn đọc

- **Hợp đồng định dạng:** `.claude/skills/impeccable/reference/document.md`, và `tasks/briefs/v5-design-md.md` (brief lần trước,
  cùng khung).
- **Quyết định và số đo của đợt v6:** `tasks/plan.md`, mục "Đợt v6" tới cuối tệp:
  - QĐ-40 và QĐ-43;
  - "Thuật ngữ tiếng Anh";
  - nhật ký từng lát, kèm các mục "Mẫu…" và "Mẫu thêm…";
  - "Chữ Việt còn ở bản EN sau cả đợt tiếng Anh".

  Đọc thêm các brief `tasks/briefs/v6-lat-e*.md` và `backend-b15.md`.
- **Mã:**
  - `lib/i18n.ts`, `lib/locale.ts`, `lib/actions/locale.ts`, `components/i18n/LocaleContext.tsx`, `proxy.ts`, `app/layout.tsx`;
  - `lib/product-text.ts`, `lib/admin-text.ts`, `components/admin-arc/ArcPhrase.tsx`, `lib/lexicon.ts` (`issueCode`);
  - CSS `:lang(en)` trong `app/styles/feed/`;
  - nút đổi ngôn ngữ của cửa hàng và của thanh bên quản trị.
- **Arc:** `registry/PATCHES.md`, đặc biệt mục E0, E4, E5 và mục 2 "Việt hoá, rồi song ngữ".

## 3. Hình dạng tài liệu

- **Giữ khung 10 mục và số mục** như bản v5, vì nhiều chỗ trích theo số.
- **Frontmatter vẫn là hệ Feed.**
- **Đầu tài liệu:** thêm một đoạn ngắn về đợt v6, ngày, commit `bea062e`. Thêm cách xem bản trước:
  `git show b3e8cff:DESIGN.md` là bản v5 cuối.
- **Văn phong:** văn xuôi tiếng Việt, câu ngắn, danh sách khi liệt kê. Tên class, tệp, hàm, token viết nguyên văn tiếng Anh.
- Mỗi luật kèm chỗ nó sống. Mỗi con số lấy từ code hoặc từ phép đo có ghi ngày.
- Sửa mọi câu đã sai vì đợt v6. Ví dụ các câu kiểu "quản trị Việt hoá toàn bộ" ở §3 và §7, hay "chuỗi gốc ở
  `arc-english-strings.ts`" nếu test đó đã đổi vai.

## 4. Nội dung bắt buộc

**§1 Nguồn của sự thật.** Thêm phần ngôn ngữ:
- **Chọn ngôn ngữ:**
  - cookie `hive-lang`, một năm;
  - thứ tự chọn ở `proxy.ts`: tham số `?lang=`, rồi cookie, rồi `Accept-Language`; không có header thì VI;
  - `?lang=` chuyển hướng về URL sạch;
  - không có `/en/` trong đường dẫn;
  - ảnh chia sẻ giữ tiếng Việt.
- **Chữ đặt tại chỗ:**
  - `picker(locale)` với cặp `{ vi, en }`;
  - server dùng `getLocale()`, client dùng `useLocale()`;
  - action dùng `getActionLocale()` và `takeRate(…, locale)`;
  - hàm `lib/` nhận `locale` mặc định `"vi"`.
- **Chữ của DB:**
  - cột `*_en` của mẫu và mẫu hé lộ, đọc qua `productText` và `teaserText`;
  - sửa ở quản trị thì xoá bản Anh của trường đó;
  - giá trị lưu bằng chữ Việt (lý do huỷ, đơn vị vận chuyển, lý do chỉnh tồn, nhãn địa chỉ) in qua bảng khoá bằng chữ Việt đã
    chuẩn hoá.
- **Luật `lang`:**
  - `<html lang>` theo ngôn ngữ;
  - ở bản EN, phần tử chứa chữ Việt đã lưu mang `lang="vi"`; chỉ gắn khi trang là EN;
  - `Phrase`, `Stored`, `phraseNode` cho chữ đã lưu nằm giữa câu;
  - `storedLang` cho ô nhập.
- **Luật hai ngôn ngữ:** thêm bản EN không được đổi một pixel nào của bản VI. Mỗi lát đo bằng so ảnh trước và sau.

**§3 Chữ.** Thêm phần tiếng Anh:
- tiếng Anh kiểu Anh: colour, ngày "1 Oct" và "6 Oct 2026", giờ 18:50;
- giá `390,000₫`, tiền gọn `1.2M₫`;
- mã Số trước tên mẫu: "S05" ở bản VI, "D05" ở bản EN;
- luật CSS chỉ cho EN: `[data-ui="feed"]:lang(en) …`, vì `scope.test.ts` chặn `html[lang]`. Liệt kê các luật đang có;
- bảng thuật ngữ nằm ở `tasks/plan.md`. Tài liệu chỉ trỏ tới đó, và ghi vài từ khoá: Drop, Basics, Styles, Discount codes, Bag,
  Saved, Account.

**§6 hoặc §7: nút đổi ngôn ngữ.**
- Cửa hàng: ở thanh trên. Trên điện thoại chỉ ở 5 trang chính.
- Quản trị: ở chân thanh bên, `SegmentedControl` có `lang` cho từng mục.
- Đổi ngôn ngữ thì trang dựng lại tại chỗ: hộp đang mở vẫn mở, chữ đã gõ còn nguyên.

**§7 Hai bề mặt.** Cả hai bề mặt nay song ngữ. Sửa các câu tả quản trị như chỉ có tiếng Việt.

**§8 Thành phần.** Các chỗ vá Arc theo ngôn ngữ:
- E0: chữ của Arc theo `useLocale()`, `Segment.lang`;
- E4: `optionsLang` của `combobox`, `BreadcrumbItem.lang`;
- E5: `options[].lang` của `select`.

**§10 Đã đo.** Các phép đo có ngày của đợt v6, lấy từ nhật ký trong `plan.md`:
- số cặp ảnh VI không lệch của mỗi lát;
- JS nén thêm của mỗi lát;
- số test (2.045 sau E3b, 2.107 sau E4, 2.139 sau E5);
- số phát hiện của máy dò trước và sau lần viết lại này.

**Dòng "không canonize"** (khiếm khuyết thật đang mang theo): danh sách chữ Việt còn ở bản EN, và các chỗ bản EN xuống dòng
nhiều hơn bản VI đang để lượt rà cuối. Cả hai đều ở `tasks/plan.md`.

## 5. Kiểm trước khi nộp

- Chạy lại `.claude/skills/impeccable/scripts/impeccable.cmd detect --json app components registry`, ghi số trước và sau.
- Mọi đường dẫn tệp và tên hàm, token trong tài liệu phải tồn tại. Kiểm bằng script, ghi kết quả.
- Báo cáo theo hợp đồng output của agent, gửi trọn trong tin cuối.
