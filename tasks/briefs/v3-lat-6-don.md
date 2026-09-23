# Brief lát 6 · v3 — dọn dẹp: xoá mã và CSS v2 chết, gom hằng, đồng bộ tài liệu máy

Phiên chính viết 23/09/2026, giao sau khi lát 5 ĐẠT. Agent `ui-implementer` thực thi; phiên chính
duyệt lại bằng test, build, sweep, máy dò outline và so ảnh trước/sau. **Lát này không đổi hình,
không đổi hành vi**: mọi ảnh chụp lại phải khớp pixel với bản trước ở 390 và 1280 (sai khác chỉ
được là đồng hồ đếm ngược và dữ liệu trên thiết bị). Ảnh nộp vào `.playwright-cli/shots/v3/lat6/`.

## 1. Phạm vi

| Việc | Ở đâu |
|---|---|
| Xoá CSS v2 chết trong 17 tệp `app/styles/*.css` (danh sách ở mục 2), giữ đúng thứ tự `@import` và đo lại các cặp specificity theo chú giải đầu `globals.css` | `app/styles/`, `app/globals.css` |
| Xoá component/hàm không còn nơi gọi (mục 2), kể cả test của chúng | `components/`, `lib/` |
| Gom chuỗi gõ tay thành hằng (`RETURN_WINDOW_DAYS`, `TRANSFER_HOLD_HOURS`, phí giao) ở mọi chỗ còn in "7 ngày", "12 giờ", "30.000₫" bằng tay | `components/`, `app/` |
| Kiểm kê class: mọi lớp khai trong CSS phải có nơi dùng trong TSX và ngược lại (trừ lớp do `lib`/runtime sinh — liệt kê rõ) | script kiểm kê + báo cáo |
| `README`/chú giải đầu mỗi tệp CSS cập nhật số dòng, bỏ lời nhắc tới lớp đã xoá | `app/styles/*.css` |

Không đụng: `prototype/`, `tasks/`, `DESIGN.md` (documenter viết sau lát này), `.impeccable/`, `.claude/`,
fixture `data/` (trừ khi một hằng được gom từ đó), hành vi bất kỳ.

## 2. Danh sách đã ghi qua từng lát (xoá nếu grep xác nhận không còn nơi dùng; giữ và ghi lý do nếu còn)

- **Lát 0:** `app/styles/admin.css`: `.s .card .corner`, `.s .card .form`, khối `.s .card.swipe .sizepop / .szgrid / .z`.
- **Lát 1:** `app/styles/home.css` khối v2 (~150 dòng): `.hero2 .panel2 .kick .display .count .lowcard .famtile .how .teaser2 .policy .strip` + khối 900px của chúng (`.sechead` và `.pastdrops` kiểm còn ai dùng trước khi xoá).
- **Lát 2:** `.hit .sz .szrow .swa2 .pdp2 .buybar .stockline .chipwrap .tabs.scroll .sortsel .swl .swc .empty .sizesheet .gtable .grid.rel` (listing/product/forms/sheet); `.selm` trong `table.css` (Select nay dùng `Menu3`).
- **Lát 3:** khối v2 đầu `app/styles/checkout.css` (`.shipbar .backlink .cartline .promorow .promoon .promises .rows button.row.pick .orderbox .cart2 .checkout2`), `.s .steps` trong `buttons.css`, `.s .qty/.qn/.qntap`, `.sum`, `.empty` cũ; `transferReference()` trong `lib/placed-order.ts` **chỉ xoá nếu lát 5 không dùng cho khớp chuyển khoản** (kiểm `grep`).
- **Lát 4:** `components/shop/SubBar.tsx` + khối `.s .sub` trong `nav.css`; khối v2 trong `app/styles/account.css`; `.s .empty .ring` / `.dt .blank .ring`; bốn chỗ "7 ngày" gõ tay (`CartScreen`, `CheckoutScreen`, `ProductView`, `SiteFooter`) → `RETURN_WINDOW_DAYS`; `components/account/Timeline.tsx` giữ nếu quản trị còn dùng.
- **Lát 5:** `components/ui/Modal.tsx`, `components/account/Timeline.tsx` (không nơi import); `components/table/`
  (`DataTable.tsx`, `FacetButton.tsx`, `RowMenu.tsx`, `TableMenu.tsx`, `features.ts`, `menu-scope.test.ts`) chỉ còn
  `app/system/SpecTable.tsx` dùng → quyết ở lát dọn: chuyển `/system` sang `Table3` hoặc xoá `/system` cùng chúng
  (xem mục 2b); `app/styles/admin.css` dòng 1–736 (khối v2 `.s.adm …`) và `app/styles/table.css` (364 dòng) chỉ
  `/system` chạm; khối `.modalwrap .modal…` trong `sheet.css`; `lib/admin-rows.ts`: `dropRows promoRows productRows
  customerRows simPromoRows promoRowOf PROMO_PAUSED_LABEL PROMO_STATE_LABEL`, type `ProductRow CustomerRow PromoRow`,
  `catalogByDropDesc` (chỉ `productRows` gọi); `lib/admin-sim.ts`: `isSimulatedOrder isCustomerCancelled`;
  `components/admin/HandoverForm.tsx`: `EXPRESS_LABEL`.
- **Sau QĐ-24:** `new Date()` không được còn ở đâu ngoài `lib/clock.ts` và test (grep xác nhận).
- **Chung:** mọi chú giải trong CSS/TSX còn nhắc `.nav2 .foot2 .card.swipe .btn.outline .grid .grow` → sửa hoặc bỏ; `app/globals.css` chú giải khối `@import` cập nhật danh sách tệp và cặp specificity đã đo lại.

### 2b. Trang `/system` (spec nội bộ)

`/system` là bảng tra thành phần của v2 (`app/system/SpecTable.tsx` + `SpecCards.tsx`), nay mô tả hệ đã bị thay:
xoá route `/system` (cả `app/system/spec.css`, `SpecCards.tsx`, `SpecControls.tsx`, `SpecTable.tsx`) cùng
`components/table/*`, `table.css`, khối v2 `admin.css` — DESIGN.md (documenter viết sau) là bảng tra chính thức.
Đã kiểm 23/09: không route nào liên kết tới `/system`, không test nào nhắc tới nó hay `components/table` ngoài
`menu-scope.test.ts` (đi cùng). `tools/layout-sweep.js` vốn loại `/system` khỏi danh sách.

## 3. Cách làm bắt buộc

1. Với mỗi lớp/hàm định xoá: `grep -rn` trên `app/ components/ lib/ data/ tools/` (không tính `prototype/`) — 0 nơi dùng mới được xoá. Lớp do runtime sinh (ví dụ tên trạng thái từ `Badge` tone, `data-*`) liệt kê rõ và giữ.
2. Xoá theo từng tệp, chạy `npm run typecheck` + `npm test` sau mỗi tệp; `npm run build` sau mỗi nhóm.
3. Chụp **trước** (bản hiện tại) và **sau** cho 12 route cửa hàng ở 390 + 1280 và 12 route quản trị ở 1280 bằng cùng một script; so bằng `pixelmatch` hoặc so hash vùng (bỏ vùng đồng hồ): khác pixel ngoài vùng đồng hồ = lỗi, phải tìm lớp bị xoá nhầm và trả lại.
4. Cuối lát: `tools/layout-sweep.js` (59 lượt) sạch như trước; máy dò outline (không phần tử nào có `outline` lúc nghỉ); `lib/classnames.test.ts` xanh; tổng số dòng CSS ghi vào báo cáo (trước/sau).

## 4. Nghiệm thu

typecheck, test (số test không giảm trừ test của mã bị xoá — liệt kê), build sạch, sweep sạch, 0 outline,
so ảnh trước/sau 36 lượt không khác ngoài đồng hồ, báo cáo có bảng "đã xoá / giữ lại vì còn dùng / gom
hằng", tổng dòng CSS trước → sau, và danh sách lớp còn khai mà không có nơi dùng (phải rỗng hoặc có lý do).

## 5. Ảnh nộp

`before/` và `after/` cùng tên tệp cho 36 lượt (tên `<route>-<w>.png`), kèm `diff-report.txt` (tên tệp,
số pixel khác, vùng khác).
