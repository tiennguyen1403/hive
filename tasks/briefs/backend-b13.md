# Brief B13: gỡ `track_order()`, đường tra đơn cũ còn mở cho `anon`

*30/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`; không `supabase link/push`; không `vercel` CLI. Không bật lại
  Studio hay pg_meta.
- Máy xem thử 3200 có thể đang chạy bản dựng lát 4b (`71d1662`); được dừng và khởi lại theo định nghĩa agent.
- Không git commit, stash, reset hay checkout. Để nguyên `tasks/anh-san-pham-prompt.md`, `tasks/lookbook-register.md` (phiên
  khác) và các brief trong `tasks/briefs/`.

## 1. Vì sao

B11 dựng `lookup_order(code, phone)` cho màn Tra cứu đơn. Hàm này chỉ trả 10 khoá màn đó hiện, **không có địa chỉ, tên, số
điện thoại, email, ghi chú hay hãng vận chuyển**, và mỗi lần tra tốn một lượt của bucket `lookup` (10 lượt / 10 phút / người
xem). Lát 4a đưa `/track` sang `lookupOrderAction`. Từ đó không trang nào còn gọi `track_order()`.

Nhưng hàm cũ vẫn nằm trên DB, vẫn `grant execute … to anon, authenticated` (`20260923170000_orders.sql`). Khoá `anon` là khoá
công khai, nằm ngay trong trình duyệt. Vì vậy ai cũng gọi thẳng được `POST /rest/v1/rpc/track_order` bằng mã đơn và số
điện thoại, rồi nhận **nguyên `order_json`**, tức cả địa chỉ giao và người nhận. Không có giới hạn số lần tra. Hai lớp chặn
của B11 bị vòng qua bằng đúng cửa cũ.

Trong code, `track_order()` chỉ còn một chỗ gọi là `trackOrder` trong `lib/db/orders.ts`. Không module nào import hàm đó.
Bản đang chạy trên demo (`71d1662`) cũng không gọi nó nữa.

## 2. Việc

| Việc | Có | Không |
|---|---|---|
| **Migration** | Tệp mới sau `20260930170000`, ví dụ `20260930190000_drop_track_order.sql`: `drop function public.track_order(text, text);`, kèm chú giải lý do như mục 1. Trước khi viết, grep `supabase/` để chắc không hàm, trigger hay seed nào gọi nó; `pg_depend` không thấy lời gọi trong thân plpgsql/sql. | Không sửa migration cũ; chúng là lịch sử. Không đụng `lookup_order`, `receipt_order`, `order_json` hay quyền của chúng. |
| **Code** | Xoá `trackOrder` khỏi `lib/db/orders.ts`. Sinh lại `lib/db/database.types.ts` bằng `npm run db:types`. Chú giải còn nói `track_order()` như hàm đang chạy (`lib/db/orders.ts`, `lib/db/order-dto.ts`, `lib/db/order-lookup.ts`, `lib/order-lookup.ts`, `lib/lookup.ts`) sửa lại: đã gỡ ở B13, lý do một dòng. | Không dọn mã v3 khác. Lát dọn 5 chạy ngay sau lát này và lo phần đó, kể cả các hàm chết trong `lib/lookup.ts`. |
| **Test DB** | Các dbtest còn gọi `track_order` / `trackOrder`: `lib/db/admin.dbtest.ts`, `optional-email.dbtest.ts`, `order-lookup.dbtest.ts`, `order-moments.dbtest.ts`, `orders.dbtest.ts`. Ý nào còn đúng với hệ đang chạy thì chuyển sang đường còn sống: `lookup_order`, `receipt_order`, `my_orders` hoặc `admin_orders`. Ví dụ: đơn không email vẫn tra được; mốc giờ từng bước có trong kết quả. Ý nào chỉ nói về hàm cũ thì xoá. Thêm test: `anon` gọi `rpc("track_order")` thì bị lỗi hàm không tồn tại; `anon` gọi `lookup_order` vẫn được. | Không làm mất ý của test nào còn đúng. Liệt kê trong báo cáo: test nào chuyển sang đâu, test nào xoá, vì sao. |

## 3. Kiểm

- `npx supabase db reset` sạch; `npm run test:db` xanh; `npm test` xanh; `npm run typecheck`, `npm run build` sạch.
- Trên 3200:
  - `/track` tra bằng form và bằng link có `code` + `phone`: ra đơn như trước;
  - `/order-confirmed/<mã>` và `/admin/orders/<mã>` mở bình thường.
- Gọi REST thẳng bằng khoá anon cục bộ:
  - `rpc/track_order` trả lỗi hàm không tồn tại (PGRST202 / 404);
  - `rpc/lookup_order` vẫn 200.
- Xong thì `select public.reset_demo(public.demo_anchor());` và xoá lượt tra đã dùng khi kiểm, nếu `reset_demo` không xoá.

## 4. Nộp

- Migration, `database.types.ts` sinh lại, code và test.
- Báo cáo theo hợp đồng của agent, gửi trọn trong **tin cuối**. Kèm:
  - lệnh người dùng chạy trên hosted: `db push --linked --dry-run` phải thấy đúng một migration, rồi `--yes`. Nói rõ có cần
    nạp lại seed không;
  - thứ tự an toàn giữa `db push` và push code (bản trên demo không gọi `track_order`);
  - một câu kiểm chỉ đọc sau khi push. Ví dụ `select to_regprocedure('public.track_order(text,text)') is null;` phải ra
    `true`;
  - việc còn mở.
