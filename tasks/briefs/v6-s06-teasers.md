# Số 06 thành "Independent Editions": bốn mẫu hé lộ mới, kèm ảnh

*Phiên chính viết 08/10/2026. Agent: `ui-implementer`. Người dùng chốt 08/10: Số 06 dùng bốn mẫu concept tạo bằng Qwen-Image-2.1, thay
SỎI và NGÓI; sửa dữ liệu Số 06 cho khớp. Ảnh đã có và phiên chính đã duyệt.*

## 0. Đọc trước

- `.agents/skills/design-taste-frontend/SKILL.md`, `.claude/skills/playwright-cli/SKILL.md`, `DESIGN.md` (khối "Sắp mở", lịch,
  quản trị Các số), `tools/sweep/README.md`.
- `data/catalog.ts` (mảng teaser, khoảng dòng 90), `data/types.ts` (`Teaser`), `lib/shots.ts`, `scripts/shots.ts`.
- Lát ảnh trước: `tasks/briefs/v3-lat-14-photos.md`.
- Luật ảnh trong `AGENTS.md`: ảnh sản phẩm tách riêng khỏi lookbook. Lát này chỉ có ảnh sản phẩm.

## 1. Ảnh

**Bốn ảnh gốc:** `photos-raw/_s06-packshots-20261008/{out-of-character,still-in-motion,midnight-unedited,for-reference-only}.png`.
- Khổ 1024×1280, nền giấy, ma-nơ-canh vô hình, không nhãn.
- Prompt nằm trong `*-prompt.txt` và `*-metadata.json` cùng thư mục.

**Xử lý:** đưa qua đúng đường ống của Số 05.
- `scripts/shots.ts` đặt khung 1.200×1.500 WebP và kéo nền về `PAPER` chỉ trên vùng nền. Nền gốc đo được `#AA`–`#C6`, tối hơn đích.
- Mỗi tệp mang XMP IPTC `trainedAlgorithmicMedia` cùng prompt của nó.
- Chọn tên khoá và tên tệp theo quy ước sẵn có trong `lib/shots.ts`. Teaser không có màu, nên đề xuất một dạng gọn, rồi ghi lý do.

## 2. Dữ liệu Số 06

Thay hai teaser SỎI và NGÓI bằng bốn teaser, theo thứ tự này:

| slug | name | kind (vi) | kind (en) |
|---|---|---|---|
| `s06-out-of-character` | OUT OF CHARACTER | Áo thun in | Printed tee |
| `s06-still-in-motion` | STILL IN MOTION | Áo thun in | Printed tee |
| `s06-midnight-unedited` | MIDNIGHT, UNEDITED | Áo thun in | Printed tee |
| `s06-for-reference-only` | FOR REFERENCE ONLY | Áo thun in | Printed tee |

- **Tên giữ nguyên ở cả hai thứ tiếng**, vì chữ in trên áo là chính tên đó (QĐ-40: tên mẫu không dịch).
- `family`: lấy họ đúng của áo thun trong `types.ts`. `announcedAt` và các trường khác dùng helper sẵn có.
- `photoKey` trỏ tới ảnh mới.
- Nếu `Drop` có trường tiêu đề hoặc câu đề của Số, **không** thêm "Independent Editions" khi trường đó chưa có. Chỉ báo lại để phiên
  chính hỏi người dùng.
- **Seed:** sinh lại theo cách dự án đang làm, để DB khớp `data/`. Sau đó `npx supabase db reset` hoặc nạp lại seed, rồi
  `reset_demo(demo_anchor())`.
- **Test ghim theo mock hoặc theo hai teaser cũ:** sửa test theo dữ liệu mới, và liệt kê. Mock (`prototype/`) KHÔNG sửa; nếu có test
  đọc mock để ghim teaser thì báo lại, phiên chính sẽ sửa mock.

## 3. Giao diện: kiểm bố cục với 4 mẫu và tên dài

Không thiết kế lại. Chỉ kiểm, và chỉ sửa khi vỡ bố cục rõ ràng (tràn, chồng, cắt chữ), trong hệ đã có. Mọi sửa CSS phải liệt kê để
phiên chính duyệt.

Các chỗ phải kiểm:
- khối "Sắp mở" ở trang chủ, ở 390, 900 và 1280, vi và en;
- lịch `/#sap-mo`;
- `/so/6` (hoặc nơi nó chuyển tới);
- quản trị `/admin/drops` và `/admin/drops/06`: dòng "Số 06 · mẫu hé lộ", số đếm "4 hé lộ", hộp sửa hoặc thêm mẫu hé lộ.

Tên dài nhất là "FOR REFERENCE ONLY" và "MIDNIGHT, UNEDITED", trong chữ hiển thị.

## 4. Kiểm theo tầng, bằng công cụ T1

- `npm run typecheck` và `npm test` trọn bộ. `npm run test:db` chạy vì seed đổi.
- `npm run build` một lần.
- `npm run impact -- HEAD --out=.playwright-cli/impact-s06.json`, rồi `sweep:gen --impact` cho vi và en, rồi `sweep:diff`. Giải thích
  mọi route khác mốc.
- `pixdiff` cho các trang đối chứng.
- KHÔNG `sweep:promote`. Sau khi promote, phiên chính tự chạy lại `npm test`.
- Ảnh ở `.playwright-cli/shots/ui/v6-s06/`: các chỗ ở mục 3; thêm một ảnh lớn của từng ảnh sản phẩm trên thẻ.

## 5. Luật

- Chỉ Edit/Write. Không commit. Không sửa mock, không sửa `tools/`.
- Lệnh nào bị hệ thống quyền chặn: đừng tìm đường vòng, ghi vào báo cáo.
- Không bấm "Đặt lại dữ liệu mẫu" trên UI. Không đọc `supabase/.env`.
- Để 3200 chạy bản build cuối và để stack Supabase chạy, đã `reset_demo`.

## 6. Báo cáo

- **Đã đổi:** ảnh, dữ liệu, seed, CSS nếu có.
- **Test đã sửa,** và lý do.
- **Tóm tắt `impact`;** kết quả `sweep:diff` vi và en; đường dẫn hai JSON chạy.
- **Ảnh:** đường dẫn ảnh khối "Sắp mở" ở ba bề ngang.
- **Các bước lên hosted:** seed đổi, nên phải nạp lại seed bằng `db query --linked -f supabase/seed.sql`, rồi `git push`.
- **Chỗ lệch so với brief,** và các câu cần phiên chính hỏi người dùng.
