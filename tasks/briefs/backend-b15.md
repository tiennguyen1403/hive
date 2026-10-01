# Brief B15: nội dung mẫu bằng tiếng Anh trong DB

*01/10/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `supabase/README.md`, `tasks/`, `.impeccable/`, `.claude/`,
  `tools/`, `registry/`, `components/`, `app/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`; không `supabase link/push`; không `vercel` CLI. Không bật lại
  Studio hay pg_meta.
- Máy xem thử 3200 đang chạy. Muốn dừng thì chạy `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`
  thành một lệnh riêng. Mã 1 thì dừng lại và báo. Khởi lại theo định nghĩa agent.
- Không git commit, stash, reset hay checkout.
- Harness không cho subagent ghi tệp báo cáo: báo cáo chỉ nằm trong tin cuối.

## 1. Vì sao

Đợt v6 làm app song ngữ Việt và Anh (QĐ-40, cuối `tasks/plan.md`, mục "Đợt v6"). Lát E0 (`e363ab3`) đã dựng nền: `lib/i18n.ts`
(`Locale`, `Pair`, `pick`, `picker`), `getLocale()`, `useLocale()`. Chữ trong code được dịch tại chỗ thành cặp `{ vi, en }`.

Chữ **tự do trong DB** thì không dịch tại chỗ được:
- `products`: `name`, `kind`, `material`, `details`;
- `teasers`: `name`, `kind`.

Các lát E1 tới E3 sẽ in những chữ này ở bản tiếng Anh, nên lát này phải có trước.

Không thuộc lát này:
- màu (`data/colors.ts`), nhãn địa chỉ, trạng thái đơn: là nhãn cố định, sẽ dịch trong code;
- `order_lines`: chỉ giữ `product_id`, nên tên trên đơn đi theo mẫu.

## 2. Luật

- **Cột tiếng Anh cho phép null.** Null nghĩa là "dùng bản tiếng Việt". Khi có giá trị thì không được rỗng.
- **Tên mẫu của các drop giữ tiếng Việt** (người dùng chốt: KHÓI, BỤI, SÓNG…). Vì vậy `name_en` của các mẫu đó, và của hai teaser
  SỎI, NGÓI, là null.
- **Tám mẫu Basics** có `name_en` theo bảng thuật ngữ:

  | Tiếng Việt | Tiếng Anh |
  |---|---|
  | ÁO THUN TRƠN | PLAIN TEE |
  | ÁO THUN TAY DÀI | LONG-SLEEVE TEE |
  | HOODIE TRƠN | PLAIN HOODIE |
  | ÁO KHOÁC DÙ | NYLON JACKET |
  | GILE PHAO | PUFFER GILET |
  | SƠ MI OXFORD | OXFORD SHIRT |
  | QUẦN KAKI | CHINOS |
  | QUẦN SHORT NỈ | FLEECE SHORTS |

- **Mọi mẫu** có bản tiếng Anh của `kind`, `material`, `details`. Hai teaser có bản tiếng Anh của `kind`.
- **Cách viết tiếng Anh:**
  - kiểu Anh, theo bảng thuật ngữ ở `tasks/plan.md`, mục "Thuật ngữ tiếng Anh". Ví dụ "Form" là fit, "oversize" là oversized;
  - dịch đúng nghĩa từng dòng `details`, không thêm, không bớt, giữ thứ tự dòng;
  - số thập phân dùng dấu chấm: "2,5 cm" thành "2.5 cm". "250gsm" giữ nguyên;
  - `kind` giữ danh từ chỉ loại khi tự nhiên: tee, hoodie, jacket, gilet, shirt; quần dài là trousers, quần ngắn là shorts. Ví
    dụ "Áo thun oversize" thành "Oversized tee", "Áo hoodie in" thành "Printed hoodie". Tên họ hàng (`FAMILY_LABELS`) bản tiếng
    Anh đã chốt là Tees, Hoodies, Jackets, Gilets, Shirts, Bottoms; lát này không dịch nhãn đó, chỉ cần `kind` khớp nghĩa;
  - chữ hoa giống bản Việt: `kind` viết hoa chữ đầu như bản Việt.
- **Quản trị sửa thì bỏ bản tiếng Anh của đúng trường đó.**
  - `admin_update_product` đổi một trong `name`, `kind`, `material`, `details` sang giá trị khác thì đặt cột `_en` của trường đó
    về null. Bản tiếng Anh khi đó rơi về chữ vừa sửa, không giữ một bản dịch cũ đã lệch nghĩa.
  - Trường không đổi thì giữ nguyên cột `_en`. So từng trường bằng `is distinct from`, không so cả hàng.
  - Lý do: một khách nước ngoài thử quản trị, sửa "ÁO THUN TRƠN" thành "PLAIN TEE V2". Có luật này thì cửa hàng bản tiếng Anh hiện
    đúng chữ họ vừa sửa. Không có luật này thì nó vẫn hiện "PLAIN TEE" cũ, và demo trông hỏng đúng trước người cần thấy nó chạy.
  - `admin_add_product` và `admin_add_teaser`: mọi cột `_en` là null.
- **Form quản trị không có ô tiếng Anh**, và lát này không đổi UI nào. Một người thử tạo mẫu sẽ gõ chữ của họ vào ô sẵn có, và
  chữ đó hiện ở cả hai thứ tiếng.

## 3. Việc

| Việc | Có | Không |
|---|---|---|
| **Migration** | Tệp mới sau `20261001120000`. Thêm `name_en text`, `kind_en text`, `material_en text`, `details_en text[]` (đều null được) vào `products` và `seed_products`; `name_en`, `kind_en` vào `teasers` và `seed_teasers`. Ràng buộc: null hoặc `btrim(...) <> ''`; với `details_en`: null hoặc có ít nhất một dòng, không dòng nào rỗng. Thay bản **mới nhất** của `reset_demo(timestamptz)` (`20260930170000_last_sold_announced.sql`) để chép các cột mới từ `seed_*`; thay bản mới nhất của `catalog_snapshot()` (cùng tệp) để trả các trường mới; thay `admin_update_product(text, jsonb, timestamptz)` (`20260925090000_fixed_styles.sql`) theo luật §2. Kiểm `admin_add_product` và `admin_add_teaser` để các cột mới là null; chỉ thay khi buộc phải thay. Giữ nguyên chữ ký, quyền, sự kiện và mọi kiểm khác. Chú giải lý do như §1. | Không sửa migration cũ. Không đổi payload của `events`. |
| **Dữ liệu** | `data/types.ts`: `Product` có `en?: { name?: string; kind?: string; material?: string; details?: readonly string[] }`, `Teaser` có `en?: { name?: string; kind?: string }`. **Mọi trường bên trong `en` đều tuỳ chọn**, vì luật sửa ở §2 xoá từng trường riêng. DTO chỉ bỏ hẳn `en` khi mọi cột `_en` của hàng đều null. Chú giải ngắn. `data/catalog.ts`: thêm `en` cho cả 29 mẫu và 2 teaser theo §2. Brief này cho phép **thêm** trường mới vào fixture; mọi giá trị cũ giữ nguyên từng chữ. `scripts/gen-seed.ts` sinh các cột mới; chạy `npm run seed:gen` để sinh lại `supabase/seed.sql`. | Không gõ tay vào `seed.sql`. |
| **DAL** | `lib/db/catalog-snapshot.ts` đưa các trường mới vào `en`, với cùng cách kiểm như các trường cũ. **`en` phải tới được `useCatalog()` ở client**, qua `catalogInput()` (`lib/db/catalog.ts`) và `CatalogProvider` ở root layout. Chứng minh bằng test hoặc bằng phép đo trên trang. | |
| **Helper** | Một tệp mới trong `lib/` (ví dụ `lib/product-text.ts`): `productText(product, locale)` trả `{ name, kind, material, details }`, mỗi trường rơi về bản Việt khi thiếu bản Anh; `teaserText(teaser, locale)` tương tự. Có test. Lát E1 sẽ dùng nó. | Không đụng màn nào. |
| **Test** | Đơn vị: helper (rơi về từng trường, bản `vi` không đổi), `gen-seed`. DB: snapshot trả bản Anh; `reset_demo` khôi phục bản Anh; `admin_update_product` chỉ xoá bản Anh của trường đã đổi; `admin_add_product` để null; ràng buộc chặn chuỗi rỗng. | Test cũ phải xanh. Test nào đang so đúng hình dạng snapshot mà buộc phải sửa thì liệt kê trong báo cáo. |

## 4. Kiểm

- `npx supabase db reset` sạch; `npm run test:db` và `npm test` xanh; `npm run typecheck`, `npm run build` sạch.
- `select public.catalog_snapshot()`: trích mục KHÓI và ÁO THUN TRƠN, cho thấy trường `en`.
- HTML nén của `/` và `/products` trước và sau. Catalog đi theo mọi trang, nên chữ tiếng Anh làm trang nặng thêm; báo bao nhiêu.
- **Màn không đổi:** chụp `/`, `/products`, `/products/s05-khoi`, `/products/ao-thun-tron` (390 và 1280) và `/admin/products`
  (1280) trước và sau, so pixel. Đồng hồ đổi thì ghi chú.
- Chụp ảnh vào `.playwright-cli/shots/v6/b15/`.
- Nếu có ghi DB khi kiểm: xong thì `npx supabase db query "select public.reset_demo(public.demo_anchor());"`.

## 5. Nộp

Báo cáo theo hợp đồng của agent, gửi trọn trong **tin cuối**. Kèm:
- tên migration và các hàm đã thay;
- **toàn bộ chữ tiếng Anh đã viết**, thành bảng: mỗi mẫu một khối gồm `name_en` (nếu có), `kind`, `material`, và từng dòng
  `details` đặt cạnh dòng tiếng Việt. Phiên chính sẽ đọc lại từng dòng;
- test trước và sau, kể cả `test:db`;
- các lệnh người dùng sẽ chạy khi đưa lên hosted. **Chỉ liệt kê, không chạy.** Gồm:
  - đẩy migration;
  - nạp lại seed theo cách ghi trong `supabase/README.md` hay `tasks/plan.md`;
  - rồi `select public.reset_demo(public.demo_anchor());` trên hosted. Nạp seed chỉ ghi bảng `seed_*`; bảng thật chỉ đổi ở lần
    đặt lại kế tiếp, nên nếu không chạy lệnh này thì phải chờ cron đặt lại hằng ngày;
- chỗ nào trong app vẫn sẽ in chữ Việt của DB ở bản tiếng Anh sau lát này (ví dụ payload của `events` ở Nhật ký);
- "Chưa làm".
