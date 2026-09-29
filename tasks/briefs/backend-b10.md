# Brief B10: mốc giờ từng bước của đơn; Hoàn tác xoá địa chỉ về đúng chỗ

*29/09/2026. Agent `backend-implementer`. Đọc hết rồi mới sửa. Không commit.*

- Không đụng `prototype/`, `DESIGN.md`, `PRODUCT.md`, `README.md`, `tasks/`, `.impeccable/`, `.claude/`, `tools/`.
- **Chỉ stack Docker cục bộ.** Không đọc `.env.hosted.local`; không `supabase link/push`; không `vercel` CLI. Không bật lại
  Studio hay pg_meta.
- Máy xem thử 3200 đang chạy bản dựng lát 3a (`7530bdd`); được dừng và khởi lại theo định nghĩa agent.
- Không git commit, stash, reset hay checkout. Để nguyên `tasks/anh-san-pham-prompt.md` và `tasks/lookbook-register.md`
  (phiên khác), cùng `tasks/briefs/v4-lat-3b.md`.

## 1. Lát

Lát UI 3a (`7530bdd`) dựng chi tiết đơn và sổ địa chỉ theo mock Feed (`prototype/explore/feed/order.js`, `account.js`
`stepModel`, `addresses.js`). Phiên chính so ảnh với mock và thấy hai chỗ lệch mà UI không tự sửa được. Cả hai phải giống
mock hoàn toàn (QĐ-36).

| Việc | Có | Không |
|---|---|---|
| **Mốc giờ từng bước** | Mock ghi giờ dưới mỗi bước đã qua của hành trình: Đặt hàng, Thanh toán, Gửi hàng, Đã giao (`stepModel`: `placedAt`, `paid`, `shipped`, `delivered`). `order_json()` hôm nay chỉ đưa mốc của **trạng thái hiện tại** (`status.paidAt`, `status.shippedAt`, …), nên đơn đang giao hay đã giao thiếu giờ thanh toán và giờ gửi. Bảng `orders` đã có `paid_at`, `shipped_at`, `delivered_at`. Đưa đủ các mốc đã có ra `order_json()` theo một khoá mới, giữ nguyên hình `status`. `Order` và DTO đọc khoá này; **thiếu khoá thì đọc thành không có**, để code mới chạy được trên DB cũ. Nối vào mô hình bước của Feed (`lib/feed-account.ts`), để trang đơn và vé đơn hiện giờ như mock. | COD không có mốc "xác nhận" riêng (đơn COD là `RECEIVED` ngay khi đặt), nên bước "Xác nhận" không ghi giờ; ghi vào báo cáo. Không đổi trạng thái, không đổi luật đơn. |
| **Hoàn tác xoá địa chỉ** | Mock: Hoàn tác trả sổ về **đúng như trước** (`saveAddresses(before)`), gồm vị trí trong danh sách và vai mặc định. Lát 3a đang thêm lại địa chỉ như một địa chỉ mới, ở cuối sổ. Làm cho Hoàn tác trả đúng địa chỉ đó về đúng chỗ cũ, cùng id nếu được. Nếu nó từng là mặc định thì trả lại vai mặc định, và địa chỉ đã nhận vai thay lúc xoá thì thôi. Nối vào nút Hoàn tác của `components/feed/account/AddressesView.tsx`. | Không tin dữ liệu trình duyệt gửi lên ngoài những gì chủ sổ vốn tự sửa được. Không mở cho `anon`. |

Giữ luật an toàn đang có: RLS, `security definer` với `search_path = ''`, kiểm đầu vào ở cả TS và SQL, giới hạn tần suất
(bucket `account` như các thao tác sổ địa chỉ khác).

## 2. Kiểm

- `npx supabase db reset` sạch; `npm run test:db` xanh. Thêm test:
  - đơn đã giao có đủ mốc thanh toán, gửi, giao; đơn chờ chuyển khoản không có mốc nào ngoài lúc đặt;
  - xoá rồi hoàn tác một địa chỉ ở giữa sổ ba địa chỉ: về đúng vị trí; xoá rồi hoàn tác địa chỉ mặc định: nó lại là mặc
    định và địa chỉ kia thôi; tài khoản khác không hoàn tác được địa chỉ của người này.
- `npm test` xanh; `npm run typecheck`, `npm run build` sạch.
- Trên 3200, đăng nhập khách mẫu, ở 390 và 1280:
  - trang đơn đã giao và đơn đang giao hiện giờ dưới từng bước đã qua, so với mock `order.html?id=DH-1496`;
  - sổ ba địa chỉ: xoá cái giữa, bấm Hoàn tác, thứ tự như cũ;
  - chụp vào `.playwright-cli/shots/backend/b10/`.
- Xong thì `select public.reset_demo(public.demo_anchor());`.

## 3. Nộp

- Migration, `lib/db/database.types.ts` sinh lại nếu đổi, DTO, action, sửa UI nhỏ, test.
- Báo cáo theo hợp đồng của agent, gửi trọn trong **tin cuối**. Kèm lệnh người dùng chạy trên hosted khi deploy, thứ tự an
  toàn giữa code và `db push`, và việc còn mở.
