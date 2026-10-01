# Brief B14: "Sửa giờ" không được làm hai số chồng lịch

*01/10/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`,
  `registry/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`; không `supabase link/push`; không `vercel` CLI. Không bật lại
  Studio hay pg_meta.
- Máy xem thử 3200 đang chạy bản lát 4 của đợt v5 (`8a9f595`). Muốn dừng thì chạy
  `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1` thành một lệnh riêng. Mã 1 thì dừng lại và báo.
  Khởi lại theo định nghĩa agent.
- Không git commit, stash, reset hay checkout. Để nguyên `tasks/anh-san-pham-prompt.md`, `tasks/lookbook-register.md` và các
  brief trong `tasks/briefs/`.

## 1. Vì sao

Shop bán một số một lúc. Lời hứa này viết ở nhiều chỗ: `lib/drop.ts` ("drops never overlap"), lịch ra số ở chân trang, và
"số đang bán" ở trang chủ. B3c (`20260924040000_photos.sql`) đã cho `admin_add_drop()` từ chối lịch trùng bằng `NOT_ALLOWED`,
với số bị trùng trong DETAIL. `addDrop` (`lib/actions/catalog-admin.ts`) cũng kiểm trước bằng `overlappingDrop`, rồi báo
"Lịch chồng lên Số NN" (`overlapMessage`).

`admin_schedule_drop()` (`20260924020000_catalog_admin.sql`) và `scheduleDrop` thì không kiểm gì. Vì vậy "Sửa giờ" làm được
điều "Tạo số" bị cấm. Đã tái hiện ở lát 4 đợt v5: Số 06 chạy 12/10 → 26/10, sửa Số 07 thành 20/10 → 30/10, server nhận, và từ
20/10 có hai số cùng bán. Lỗi có từ B3c, nằm cả trên bản demo. Người dùng đã duyệt sửa ngay (01/10).

## 2. Luật

- **Trùng** dùng đúng định nghĩa của `admin_add_drop()` v2: hai khoảng trùng khi mỗi khoảng mở trước khi khoảng kia đóng (mở
  thì tính, đóng thì không tính, như `dropState`). Một số mở đúng lúc số trước đóng thì không trùng.
- **Chỉ so với các số khác**, không so với chính nó.
- **Thu hẹp thì không bị từ chối vì trùng.** Khoảng mới nằm trong khoảng cũ (mở không sớm hơn, đóng không muộn hơn) thì không
  tạo ra trùng mới nào. "Đóng sớm" (`closeDropNow`) cũng đi qua `admin_schedule_drop()`, và luôn phải đóng được, kể cả khi DB
  đã lỡ có hai số trùng từ trước.
- Bị từ chối thì báo như "Tạo số": `NOT_ALLOWED` với DETAIL là số bị trùng (số nhỏ nhất nếu trùng nhiều số), và màn hiện
  "Lịch chồng lên Số NN".

## 3. Việc

| Việc | Có | Không |
|---|---|---|
| **Migration** | Tệp mới sau `20260930190000`, ví dụ `20261001100000_schedule_drop_overlap.sql`. Thay `admin_schedule_drop()` bằng bản kiểm trùng theo §2, giữ nguyên chữ ký, quyền, sự kiện `DROP_SCHEDULED` và mọi kiểm khác. Khoá `public.drops` như `admin_add_drop()` v2, để hai lần sửa giờ chạy cùng lúc không lọt. Chú giải lý do như §1. | Không sửa migration cũ. Không đổi `admin_add_drop()`. |
| **Code** | `scheduleDrop`: đọc catalogue, kiểm trùng trước bằng `overlappingDrop` với các số khác, theo luật thu hẹp ở §2, rồi trả `refused(overlapMessage(n))`. Khi DB từ chối với DETAIL là một số thì báo `overlapMessage` như `addDrop`, nên phải dùng `call` thay `run` nếu cần DETAIL. Nếu `database.types.ts` đổi thì sinh lại bằng `npm run db:types`. | Không đụng màn (`components/`), kể cả màn v3. Không đổi `closeDropNow`, trừ khi luật thu hẹp đòi. |
| **Test** | `lib/db/catalog-admin.dbtest.ts`: (1) dời một số trùng sang số khác thì `NOT_ALLOWED` kèm DETAIL đúng số; (2) mở đúng lúc số kia đóng thì được; (3) dời không trùng thì được; (4) thu hẹp, kể cả khi DB đã có hai số trùng (tạo bằng `update` trực tiếp trong test), thì được; (5) "Đóng sớm" một số đang bán vẫn được. Test của `scheduleDrop` ở lớp action nếu đã có chỗ test action. | Test cũ nào đang dời số sang lịch trùng thì sửa để giữ ý định của test bằng một lịch không trùng, không xoá. Liệt kê từng test đã sửa, kèm lý do, trong báo cáo. |

**Chỉ tìm, không sửa:** có chỗ nào giả định số chạy theo đúng thứ tự số không? Ví dụ dời Số 07 sang trước Số 06 mà không
trùng. Báo lại chỗ đó và hậu quả trên màn. Không tự thêm luật thứ hai.

## 4. Kiểm

- `npx supabase db reset` sạch; `npm run test:db` xanh; `npm test` xanh; `npm run typecheck`, `npm run build` sạch.
- Trên 3200, đăng nhập quản trị thử, vào `/admin/drops`:
  - "Sửa giờ" Số 06 thành 01/10 → 10/10 (trùng Số 05): toast "Lịch chồng lên Số 05", hộp vẫn mở, bảng không đổi;
  - "Sửa giờ" Số 06 thành 05/10 → 19/10 (mở đúng lúc Số 05 đóng): được;
  - "Đóng sớm" Số 05: được;
  - chụp ảnh vào `.playwright-cli/shots/b14/`.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 5. Nộp

- Migration, code và test.
- Báo cáo theo hợp đồng của agent, gửi trọn trong **tin cuối**. Kèm:
  - lệnh người dùng chạy trên hosted: `db push --linked --dry-run` phải thấy đúng một migration, rồi `--yes`. Nói rõ có cần
    nạp lại seed không;
  - thứ tự an toàn giữa `db push` và push code: bản đang chạy trên demo gọi `scheduleDrop` từ màn v3;
  - một câu kiểm chỉ đọc sau khi push, chứng minh hàm mới đã lên;
  - việc còn mở.
