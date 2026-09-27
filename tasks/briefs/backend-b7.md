# Brief B7: đơn thẻ trả bằng chuyển khoản, giữ hàng 12 giờ

*27/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`; không `supabase link/push`; không `vercel` CLI. Không bật lại
  Studio hay pg_meta.
- Máy xem thử 3200 đang chạy bản dựng của lát v4. Được dừng và khởi lại theo định nghĩa agent.

## 1. Lát

Người dùng chốt ngày 27/09 (vòng 4 của mock Feed; ghi ở `prototype/explore/feed/BRIEF.md` "Round 4" và cuối `tasks/plan.md`):
> "Thanh toán bằng thẻ fallback sang chuyển khoản."

Cổng thẻ chưa nối, nên khách chọn thẻ thì trả bằng **chuyển khoản**, giữ hàng **12 giờ** như đơn chuyển khoản.

**Hôm nay** (agent Explore đọc mã ngày 27/09):
- `place_order()` chỉ đặt `AWAITING_TRANSFER` và `due_at = now + 12h` cho `BANK_TRANSFER`. Thẻ và COD thành `RECEIVED`,
  không có hạn (`20260925090000_fixed_styles.sql` quanh dòng 475).
- Quản trị đánh dấu đã trả bằng `admin_mark_paid`; bàn giao bị chặn khi đơn thẻ chưa trả (`20260924001000_admin.sql` quanh
  dòng 808 và 846).
- Danh sách đơn quản trị ghi "chưa thu tiền · chưa nối cổng" (`AdminOrdersScreen.tsx` quanh dòng 478).
- `effectiveStatus()` (`lib/customer-orders.ts` quanh dòng 94) đọc đơn quá hạn chuyển khoản thành huỷ.
- `expire_and_lock()` và cron `/api/health` gọi `expire_transfers`.

| Việc | Có | Không |
|---|---|---|
| Đặt hàng | Migration mới: `place_order` cho **CARD** vào `AWAITING_TRANSFER` với `due_at = now + 12h`, như `BANK_TRANSFER`. COD giữ `RECEIVED`. | Không đổi enum; không thêm cổng thẻ; không đổi luật COD. |
| Hết hạn | `expire_and_lock`, `expire_transfers` và mọi chỗ đọc "đơn chuyển khoản quá hạn" áp cả cho CARD; kiểm từng hàm, chỗ nào lọc theo `payment = 'BANK_TRANSFER'` thì mở cho CARD. `effectiveStatus` như vậy. | — |
| Quản trị | `admin_mark_paid` nhận đơn CARD đang `AWAITING_TRANSFER` như đơn chuyển khoản. Luật chặn bàn giao khi chưa trả vẫn đúng. Nhãn "chưa thu tiền · chưa nối cổng" đổi để đơn thẻ đọc như đơn chờ chuyển khoản, ví dụ "Chờ chuyển khoản · thẻ". | Không làm lại giao diện quản trị (vẫn v3). |
| Cửa hàng (v3, tạm) | Dòng ghi chú của lựa chọn Thẻ ở `CheckoutScreen.tsx` (quanh 858–872) bỏ câu "chưa thu tiền", thay bằng "Tạm thời trả bằng chuyển khoản." như mock Feed. Nơi nào ở cửa hàng ghi đơn thẻ "chưa thu tiền" thì đổi cho khớp. | Không làm lại màn thanh toán hay màn đặt hàng xong; lát UI 2 dựng bản Feed. |
| Dữ liệu mẫu | Kiểm `data/orders.ts`: 5 đơn CARD đều đã trả, đang giao hoặc đã giao, nên vẫn đúng. Đơn CARD nào đang `RECEIVED` (chưa thu) thì đổi theo luật mới và ghi lý do. | Không đổi đơn khác. |

## 2. Quyết định đã chốt

- Thẻ trả bằng chuyển khoản, giữ hàng 12 giờ, quá hạn thì tự huỷ và trả hàng về kho, như chuyển khoản.
- Chưa có số tài khoản ngân hàng. Khối chuyển khoản vẫn ghi "đang chuẩn bị", không bịa số hay QR.
- Mọi luật cũ về an toàn dữ liệu và RLS giữ nguyên.

## 3. Kiểm

- `npx supabase db reset` sạch; `npm run test:db` xanh. Thêm test:
  - đặt đơn CARD thì ra `AWAITING_TRANSFER` và `due_at` sau 12 giờ;
  - quá hạn thì huỷ và trả tồn;
  - `admin_mark_paid` chuyển đơn CARD sang `PAID`;
  - COD không đổi.
- `npm run typecheck`, `npm test`, `npm run build` sạch.
- Trên 3200 bằng playwright cli, đăng nhập khách mẫu:
  - đặt một đơn chọn Thẻ: màn đặt hàng xong (v3) và trang đơn ghi chờ chuyển khoản, có hạn;
  - quản trị thấy nhãn mới và đánh dấu đã trả được;
  - chụp ảnh vào `.playwright-cli/shots/backend/b7/`.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 4. Nộp

- Migration mới, `lib/db/database.types.ts` nếu đổi, test.
- Báo cáo theo hợp đồng của agent, kèm:
  - lệnh người dùng chạy trên hosted khi deploy;
  - những chỗ ở cửa hàng v3 còn ghi sai mà lát UI 2 sẽ thay.
