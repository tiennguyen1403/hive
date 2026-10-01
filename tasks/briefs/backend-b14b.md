# Brief B14b: các số chạy theo đúng thứ tự số

*01/10/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `supabase/README.md`, `tasks/`, `.impeccable/`, `.claude/`,
  `tools/`, `registry/`, `components/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`; không `supabase link/push`; không `vercel` CLI. Không bật lại
  Studio hay pg_meta.
- Máy xem thử 3200 đang chạy. Muốn dừng thì chạy `powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-preview.ps1`
  thành một lệnh riêng. Mã 1 thì dừng lại và báo. Khởi lại theo định nghĩa agent.
- Không git commit, stash, reset hay checkout. Để nguyên các tệp chưa theo dõi trong `tasks/briefs/`.

## 1. Vì sao

B14 (`ce56bb7`, brief `tasks/briefs/backend-b14.md`) cho "Sửa giờ" từ chối lịch trùng, như "Tạo số". Nhưng vẫn **đảo thứ tự**
được. Ví dụ: Số 06 chạy 12/10 → 26/10, dời Số 07 về 06/10 → 11/10 không trùng số nào, nên vẫn lưu được.

Agent B14 đã tìm ra 8 chỗ giả định các số chạy theo thứ tự số, nên khi đảo thứ tự thì cả 8 báo sai. Danh sách ở cuối
`tasks/plan.md`: lịch ra số, Bảng tin, ảnh chia sẻ, `/so`, nhắc mở bán, mẫu hé lộ ở Các số, "Nhân bản" mã giảm giá, Tổng quan.

Người dùng đã duyệt (01/10): thêm luật "số sau phải mở sau khi số trước đóng" cho cả "Tạo số" lẫn "Sửa giờ".

## 2. Luật

Gọi số đang tạo hay đang dời là N. Số **trước** là số nhỏ hơn N gần nhất đang có; số **sau** là số lớn hơn N gần nhất đang có.
- N phải mở **không sớm hơn** lúc số trước đóng. Mở đúng lúc số trước đóng thì được, như luật trùng.
- N phải đóng **không muộn hơn** lúc số sau mở.
- "Tạo số" chỉ có số trước, vì N luôn là số lớn nhất cộng một.
- **Thu hẹp thì không bao giờ bị chặn**, như B14: khoảng mới nằm trong khoảng cũ. "Đóng sớm" luôn chạy được, kể cả khi lịch đã lỡ
  sai thứ tự từ trước.
- **Trùng lịch báo trước:** khoảng mới vừa trùng số khác vừa sai thứ tự thì báo câu của B14, "Lịch chồng lên Số NN". Câu thứ tự
  chỉ dùng khi không trùng.
- **Câu báo** (người dùng đã duyệt):
  - sai với số trước: "Số 07 phải mở sau khi Số 06 đóng";
  - sai với số sau: "Số 06 phải đóng trước khi Số 07 mở".
  - Dùng `issueLabel`.

## 3. Việc

| Việc | Có | Không |
|---|---|---|
| **Migration** | Tệp mới sau `20261001100000`. Thay `admin_add_drop()` và `admin_schedule_drop()` bằng bản kiểm thêm thứ tự theo §2, dưới cùng khoá bảng `drops` như B14. Giữ nguyên chữ ký, quyền, sự kiện và mọi kiểm khác. Lời từ chối phải cho TypeScript biết đủ ba điều: trùng, sai với số trước, hay sai với số sau, và số nào. Ví dụ `NOT_ALLOWED` với DETAIL là số, HINT là loại; tự chọn cách, rồi giải thích trong chú giải. Chú giải lý do như §1. | Không sửa migration cũ. |
| **Code** | Hàm thuần trong `lib/catalog-admin.ts` (ví dụ `orderClash`), có test. `addDrop` và `scheduleDrop` hỏi trước bằng hàm đó, sau phần kiểm trùng, rồi trả `refused(...)` với câu ở §2. Lời từ chối của DB cũng đổi thành đúng câu đó. | Không đụng màn. Hộp ở Các số đã hiện toast của server và giữ hộp mở. |
| **Test** | Đơn vị: các trường hợp của §2, kể cả mở đúng lúc số trước đóng, thu hẹp trên lịch đã sai thứ tự, trùng và sai thứ tự cùng lúc. DB (`lib/db/catalog-admin.dbtest.ts`): ít nhất một test cho mỗi câu báo, một test "Đóng sớm" trên lịch đã sai thứ tự, và một test "Tạo số" mở trước khi số trước đóng. | Test cũ nào đang tạo lịch sai thứ tự thì sửa để giữ ý định bằng lịch đúng thứ tự, không xoá. Liệt kê trong báo cáo. |

## 4. Kiểm

- `npx supabase db reset` sạch; `npm run test:db` xanh; `npm test` xanh; `npm run typecheck`, `npm run build` sạch.
- Trên 3200, đăng nhập quản trị thử, vào `/admin/drops`, với dữ liệu mẫu (Số 05 21/09 → 05/10, Số 06 12/10 → 26/10):
  1. "Tạo số" 07 với ngày đề xuất: được;
  2. "Sửa giờ" Số 07 thành 06/10 → 11/10: toast "Số 07 phải mở sau khi Số 06 đóng", hộp vẫn mở;
  3. "Sửa giờ" Số 06 thành 11/11 → 20/11: toast "Số 06 phải đóng trước khi Số 07 mở";
  4. "Đóng sớm" Số 05: được.
- Chụp ảnh vào `.playwright-cli/shots/b14b/`.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 5. Nộp

- Migration, code và test.
- Báo cáo theo hợp đồng của agent, gửi trọn trong **tin cuối**. Kèm:
  - lệnh người dùng chạy trên hosted: `db push --linked --dry-run` phải thấy **hai** migration (B14 và B14b) nếu B14 chưa lên,
    rồi `--yes`. Nói rõ có cần nạp lại seed không;
  - thứ tự an toàn giữa `db push` và push code, và bản code đang chạy trên demo hiện câu gì khi bị từ chối theo luật mới;
  - một câu kiểm chỉ đọc sau khi push;
  - việc còn mở.
