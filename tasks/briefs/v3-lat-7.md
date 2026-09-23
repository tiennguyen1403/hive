# Brief lát 7 · v3 — form Thêm/Sửa mẫu: ô chọn màu, ô ảnh từng màu, sheet chọn vùng cắt

Phiên chính viết 24/09/2026, giao **sau khi B3c ĐẠT** (`tasks/briefs/backend-b3c.md` — bucket ảnh, `createProduct`, `uploadProductPhoto`,
`updateProduct` mở rộng). Agent `ui-implementer` thực thi; phiên chính duyệt lại độc lập. Người dùng **Duyệt** cả hai màn 24/09 (bảng
duyệt `prototype/v3/index.html#step3`, `product-new: Duyệt`, `product-edit: Duyệt`) và chốt bốn câu (QĐ-27 trong `tasks/plan.md`).

Mock: `prototype/v3/admin-product-new.html` (SỎI, mẫu ví dụ), `admin-product-edit.html` (KHÓI), runtime `product-form.js` (chip, ô ảnh,
lưới cắt, nút nói việc còn thiếu, tải giả) và `product-crop.js` (sheet cắt: toán khung, kéo, phím, xem trước), CSS ở **cuối
`v3-pages.css`** hai khối "round 7" và "round 7b" (`.colorpick .cslots .cslot .shot(.blank .over .prog) .hd .ord .file .acts .photopick
.cutgrid`, `.top .crumb`, `.formbar3`, `.sheetwrap .panel.wide.crop`, `.cropwrap .cropper .frame .cropside`). Quản trị **chỉ desktop**
(1180 tối thiểu). Ảnh nộp vào `.playwright-cli/shots/v3/lat7/` ở 1280×900 (toàn trang khi cần).

## 1. Màn / phạm vi

| Route | Việc | Mock |
|---|---|---|
| `/admin/products/new` (`ProductForm` mode `new`) | Thông tin cơ bản (+ ô **Form** mới), lưới "Số lượng sẽ cắt" theo màu đã chọn, panel **Màu và ảnh**: 7 chip màu, một hàng/màu với ô ảnh 4:5, thanh dưới với nút nói việc còn thiếu → `createProduct` | `admin-product-new.html` |
| `/admin/products/[id]` (`ProductForm` mode `edit`) | như trên nhưng **không có chip** (màu chốt lúc cắt), hàng màu chỉ ↑ ↓ và ảnh; lưới "Tồn kho" + ghi chú điều chỉnh (B3b); `updateProduct` với `colors` + `photos` | `admin-product-edit.html` |
| Sheet **Chọn vùng cắt** (`components/admin/CropSheet.tsx`, trên `AdminSheet` `wide`) | khung 4:5 khoá tỉ lệ trên ảnh vừa chọn: kéo dời, kéo góc đổi cỡ, phím mũi tên dời, `+`/`−` đổi cỡ; xem trước 96×120, số đo, cảnh báo < 800px, "Toàn ảnh"; Huỷ giữ ảnh cũ | `product-crop.js`, khối CSS 7b |
| `lib/photo-crop.ts` (thuần, test) | `defaultCrop`, `clampCrop`, `resizeFromHandle`, `moveCrop`, `outputSize` (≤ 1.200×1.500), `dims` định dạng `1.860×2.325` | `product-crop.js` |
| `lib/photo-encode.ts` (trình duyệt) | giải mã tệp (`createImageBitmap(file, { imageOrientation: "from-image" })`, dự phòng `<img>`), vẽ vùng cắt lên canvas cỡ `outputSize`, `toBlob("image/webp", 0.82)`; không có WebP → `image/jpeg` 0.85; > 1,5 MB → thử lại 0.7; vẫn quá → lỗi "Ảnh quá nặng sau khi thu" | — |

**Không dựng:** cắt ảnh cho ảnh mượn (đã 4:5), thêm/bớt màu ở màn sửa, loại mới, ảnh cho teaser (sheet teaser giữ `photopick` như B3b).

## 2. Quyết định đã chốt (áp cho màn này)

1. **QĐ-27**: ảnh lưu Supabase Storage qua máy chủ (đã có ở B3c); **khung kéo chọn vùng cắt** thay cho cắt giữa tự động; **màu chốt lúc
   cắt**; **ảnh mượn tạm vẫn chọn được**, luôn mang nhãn "mượn tạm" (PRODUCT.md: không trình bày ảnh mượn như ảnh thật).
2. **Chip màu** = bảy màu `COLORS` (`data/colors.ts`), `aria-pressed`; **thứ tự chọn là thứ tự dải màu**, chip đã chọn mang số thứ tự
   (`.pos`); màu đầu là ảnh đại diện (dòng tệp mở đầu bằng "Ảnh đại diện · "). Chọn màu → lưới có hàng, panel có ô ảnh. Bỏ màu (chip
   hoặc ✕ trên hàng) → số đã điền của màu đó xoá theo, toast "Đã bỏ Rêu · 12 chiếc đã điền xoá theo" (chỉ khi có số).
3. **Ba trạng thái ô ảnh** đúng mock: (a) *tệp đã chọn* — ảnh thu nhỏ đúng vùng cắt (background-position như `cropStyle`), dòng
   "`tên.jpg` · 2,4 MB · vùng cắt 1.400×1.750 · lưu 1.200×1.500", nút `Khung cắt` (btn sm), liên kết `Đổi ảnh` (label bọc input file),
   `Mượn tạm`; (b) *mượn tạm* — ảnh mượn, nhãn `tag3` "mượn tạm" + "ảnh của mẫu CÁT · thay bằng ảnh thật khi có", nút `Tải ảnh thật`,
   liên kết `Đổi ảnh mượn` (mở `photopick` 18 ảnh ngay dưới hàng, `role="radiogroup"`); (c) *chưa có* — ô nét đứt với icon `gallery`,
   "Chưa có ảnh · JPG, PNG hoặc WebP, tối đa 10 MB · kéo thả vào ô hoặc chọn tệp", nút `Chọn tệp`, liên kết `Mượn tạm`. Kéo thả vào ô:
   `.over` khi kéo qua. Không có "Bỏ ảnh" (đã bỏ khỏi mock).
4. **Sheet cắt** mở **ngay sau khi chọn tệp** (kể cả kéo thả) với khung 4:5 lớn nhất đặt giữa; mở lại bằng `Khung cắt`. Tiêu đề "Chọn
   vùng cắt · Đen", sub "Ảnh trên trang luôn là 4:5. Kéo khung để dời, kéo góc để đổi cỡ; phần ngoài khung không được lưu." Chân: `Huỷ`
   (giữ ảnh cũ; tệp vừa chọn thì bỏ) · `Dùng vùng này` (icon check). Phần ngoài khung tối 55% (`box-shadow` 9999px, stage `overflow:hidden`),
   viền khung mật ong 1px, bốn tay nắm 14px tròn. Khung `tabindex=0`, `aria-roledescription="khung cắt"`, mũi tên 8px (Shift 40),
   `+`/`−` ±5%. Cỡ tối thiểu 200px ngang (hoặc cả ảnh nếu nhỏ hơn). Bên phải: xem trước 96×120, "Vùng chọn **1.400×1.750**" / "lưu
   1.200×1.500", cảnh báo `.err` icon `danger` "Hẹp hơn 800px, ảnh trên trang sẽ mờ", liên kết "Toàn ảnh". Toán khung **chép từ
   `product-crop.js`** (tay nắm: góc đối diện đứng yên, kéo theo trục lớn hơn).
5. **Nút lưu nói việc còn thiếu**, thứ tự kiểm: tên → giá → ≥ 1 màu → "Điền số cắt cho {màu}" → "Chọn ảnh cho {màu}"; đủ thì "Tạo mẫu ·
   36 chiếc" (icon check). Màn sửa: "Lưu thay đổi" luôn bật, `NO_CHANGE` của action hiện toast. Thanh dưới (`.formbar3`): "Giá đang
   nhập: **420.000₫** · **3** màu · lưới **36** chiếc · **1** ảnh chưa có" (hoặc "· **2** ảnh mượn tạm"); màn sửa: "Giá: **390.000₫** ·
   còn **17** / 35 chiếc · **2** ảnh mượn tạm". Panel meta: "3 màu · thiếu 1 ảnh" / "3 màu · đủ ảnh" / "2 màu · 2 ảnh mượn tạm" /
   "chưa chọn màu"; lưới meta "tổng 36 chiếc" (mới) / "đã cắt 35 · còn 17" (sửa).
6. **Lưu** (mới): tải từng ảnh tệp lên trước — `photo-encode` → `uploadProductPhoto` — thanh dưới "Đang tải ảnh lên… **1** / 2", vạch
   tiến trình 3px mật ong dưới ảnh thu nhỏ của màu đang tải; khoá trả về **giữ trong state** (thử lại không tải lại); lỗi một ảnh →
   dừng, toast "Không tải được ảnh Đen: …", nút bật lại. Rồi `createProduct` → toast "Đã tạo SỎI · 3 màu · 36 chiếc · 1 ảnh tải lên ·
   ghi nhật ký" và `router.push("/admin/products")` (hàng SỎI hiện; mẫu của Số chưa mở không có trên cửa hàng — B3c). Màn sửa: chỉ ảnh
   tệp mới tải lên; `updateProduct(id, { …patch, cells, colors, photos })`; toast "Đã lưu KHÓI · thứ tự dải màu, 1 ảnh thật thay ảnh mượn
   · ghi nhật ký"; trang tự dựng lại (B3b đã `key` theo giá trị).
7. **Ô Form** (fit): `Select` Oversize / Regular, cạnh Loại (`fgrid` 2 cột: Loại | Form, Số | Giá bán); "Mã trên địa chỉ" xuống hàng
   riêng với help "Tự sinh từ tên nếu để trống: /products/soi" (placeholder = `productSlug(name)` sống, từ B3c); help dưới Số: "Tạo cho
   Số chưa mở thì lên kệ đúng giờ mở; Số đang mở thì lên kệ ngay." (mới) / màn sửa help mã: "Đổi mã thì đường dẫn cũ /products/khoi không
   còn mở được." Loại = `kindOptions(catalog)` hiện có (không gõ tự do); họ suy trong action.
8. **Màn sửa**: dòng `fine3` "Đen · Kem, chốt lúc cắt Số 05. Không thêm màu sau khi cắt; thứ tự dải màu và ảnh thì đổi được." thay chip;
   ↑ ↓ trên hàng (36px + phủ ±4, gap 8; `disabled` mờ 35%); không ✕. Ghi chú dưới lưới: "Đổi số còn ở đây được ghi thành một lần điều
   chỉnh tồn kho: có lý do, vào nhật ký, và không vượt số đã cắt. Không phải cách để may thêm."
9. **Tiêu đề trang**: `AdminTop` crumb "Mẫu › Thêm mẫu" / "Mẫu › KHÓI"; sub giữ; màn sửa có nút "Xem trên cửa hàng" (`eye`) như mock.
10. Vùng chạm: `.ord button` 36 + phủ `inset:-4px`, gap 8 (không chồng); liên kết trong `.acts` `min-width:44px; min-height:36px` + phủ
    ±5; `photopick` nút 48×59; `label.btn3/.lnk` bọc `input[type=file].sr-only` có `:focus-within` viền `--focus`. Tay nắm 14px là
    affordance kéo, không phải nút (không đưa vào máy dò).
11. Tên class mới không trùng utility Tailwind (`lib/classnames.test.ts`): dùng đúng tên mock (`colorpick cslots cslot shot blank over prog
    hd ord flip file acts photopick cutgrid cropwrap cropper frame cropside pos`). CSS vào `app/styles/admin.css` (form) và `sheet.css`
    hoặc `admin.css` (sheet cắt) theo thứ tự nạp `globals.css`; đo lại nếu chạm bảy cặp đã ghi ở DESIGN.md §1.
12. Ảnh mẫu trong app **không** dùng `../v2/img`: ảnh mượn qua `photoUrl(key, 120)` như `TeaserFormSheet`; ảnh tệp qua `URL.createObjectURL`
    (revoke khi bỏ); sau lưu, ảnh thật qua `photoUrl("up/…")` = `/photos/…` (B3c).

## 3. Lỗi phải sửa kèm

Không có lỗi cũ trên hai màn này. Giữ tồn dư sweep (48 `smallTarget`, 2 `loneButton` từ 20/09) không tăng.

## 4. Nghiệm thu (1280; quản trị không có bề ngang 390)

- **Mới**: `/admin/products/new` đăng nhập quản lý: trạng thái rỗng ("chưa chọn màu", lưới ẩn với dòng "Chọn màu trước…", nút "Nhập tên
  mẫu"); bật Đen, Kem, Rêu theo thứ tự → chip 1 2 3, lưới 3 hàng, 3 ô ảnh trống, nút "Điền số cắt cho Đen"; điền lưới; chọn tệp cho Đen
  (`setInputFiles` một PNG 3:2 tự sinh ở `tools/fixtures/`) → sheet cắt mở với khung lớn nhất giữa; kéo khung, kéo góc, `ArrowRight`;
  "Dùng vùng này" → hàng Đen hiện ảnh đúng vùng và số đo; "Khung cắt" mở lại đúng khung; "Huỷ" giữ; Kem "Mượn tạm" → chọn CÁT → nhãn
  "mượn tạm"; Rêu để trống → nút "Chọn ảnh cho Rêu"; Rêu mượn TRO → nút "Tạo mẫu · 36 chiếc"; bấm → thấy "Đang tải ảnh lên… 1 / 1" →
  toast → `/admin/products` có SỎI (Số 06 · 3 màu · 36 / 36); `/admin/products/p-soi` mở đúng; `/admin/log` có "Thêm mẫu SỎI…";
  khách mở `/products` **không** thấy SỎI (Số 06 chưa mở). Tạo thêm một mẫu cho Số 05 (đang mở) → khách thấy trên `/products` với ảnh
  tải lên qua `/_next/image?url=%2Fphotos%2Fup%2F…`, **0 request ngoài 3200** (giữ máy đo của `tools/backend-shots.js`).
- **Sửa**: `/admin/products/p-khoi`: ↑ ở Kem → Kem trước; "Tải ảnh thật" cho Kem → sheet → dùng → nhãn mượn tạm biến mất; "Lưu thay
  đổi" → toast; PDP `/products/khoi` hiện Kem trước với ảnh mới; `/admin/log` hai dòng (đổi thứ tự, thay ảnh); "Đặt lại dữ liệu mẫu"
  đưa KHÓI về Đen · Kem ảnh mượn.
- Lỗi: tải lên khi mất `SUPABASE_SECRET_KEY` (tắt tạm trong `.env.local` cho một lần chạy) → toast rõ, không kẹt; tên rỗng, giá 0 chặn ở
  nút; slug trùng `khoi` → message `SLUG_TAKEN`.
- Sweep `tools/layout-sweep.js` (thêm hai lớp nổi admin: sheet cắt trên `/admin/products/new` sau `setInputFiles`, `photopick` mở) →
  0 console / 0 overflow / 0 tiny / 0 clipped, tồn dư không tăng. `npm run typecheck`, `npm test` (test mới: `photo-crop`,
  `ProductForm` nếu có), `npm run build`.

## 5. Ảnh cần nộp (`.playwright-cli/shots/v3/lat7/`)

`new-0-empty.png`, `new-1-three-colours.png`, `new-2-crop-open.png`, `new-3-crop-dragged.png`, `new-4-after-crop.png`,
`new-5-loan-open.png`, `new-6-ready.png` (nút "Tạo mẫu · 36 chiếc"), `new-7-uploading.png`, `new-8-products-table.png`,
`new-9-shop-hidden.png` (khách, Số 06), `new-10-shop-visible.png` (mẫu Số 05 với ảnh tải lên), `edit-1-initial.png`,
`edit-2-reordered.png`, `edit-3-photo-replaced.png`, `edit-4-pdp.png`, `edit-5-log.png`, `mock-vs-app-new.png`, `mock-vs-app-crop.png`
(ghép mock bên trái, app bên phải, cùng 1280).

## Đọc trước khi sửa

`AGENTS.md` → tài liệu Next 16 (`next/image` src tương đối, Server Actions với `FormData`, `useTransition`) → `DESIGN.md` (§4, §5, §8
`admin.css`, `sheet.css`) → mock hai trang + `product-form.js` + `product-crop.js` + hai khối CSS cuối `v3-pages.css` → `ProductForm.tsx`,
`TeaserFormSheet.tsx` (photopick), `AdminSheet.tsx`, `InventoryAdjustSheet.tsx` (B3b) → `lib/actions/catalog-admin.ts` (§3.5 của
`backend-b3c.md`) và báo cáo B3c → `lib/photos.ts`, `lib/catalog-admin.ts` + test → `tools/layout-sweep.js` (danh sách lớp nổi admin) →
`.claude/skills/impeccable/reference/craft-floor.md`.
