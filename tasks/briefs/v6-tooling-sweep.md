# Lượt rà v6, lát công cụ T1: kiểm theo tầng

*Phiên chính viết 07/10/2026. Agent: `ui-implementer`. Người dùng chốt 07/10: mỗi lát chỉ kiểm chỗ đổi và chỗ bị ảnh hưởng; làm công cụ
sau R1. Thiết kế theo lời khuyên của Fable, ghi ở `tasks/plan.md`, mục "cách kiểm theo tầng".*

## 0. Đọc trước

- `.claude/skills/playwright-cli/SKILL.md`. Lưu ý `run-code` bọc đúng một function expression: không `require`, không argv. Vì vậy
  muốn lọc route thì phải **sinh script**, không dùng cờ dòng lệnh.
- `tools/layout-sweep.js`: ba mảng `ROUTES`, `ADMIN_ROUTES`, `ADMIN_OVERLAYS`; khối đăng nhập và seed; 7 máy dò; hằng `LANG`.
- `tools/sweep/reference/`, mẫu đã chạy được của bước soát:
  - `audit-v6/cap.template.js` (khe `/*CONFIG*/`), `gen.py`, `build_*.py`, `run-batch.sh`, `sweep_summary.py`;
  - `b17-pixdiff.mjs`;
  - `baseline/`.
- `app/styles/feed/scope.test.ts`: parser `rules()` dùng lại được để đọc `@media`; đây cũng là bằng chứng CSS Feed không chạm quản trị.
- `package.json`, `vitest.config.*`.

## 1. Việc

Mọi công cụ viết bằng Node ESM (`.mjs`), không thêm dependency; `sharp` đã có sẵn. Mã và chú giải bằng tiếng Anh.

1. **Manifest route, nguồn duy nhất.**
   - Tạo `tools/sweep/manifest.mjs` (hoặc `.json`) từ ba mảng của `layout-sweep.js`.
   - Mỗi route có: `name`, `path`, `zone` (`shop` hoặc `admin`), `widths`, `tags`, `components` (tệp vẽ ra nó), `overlays`.
   - **Chọn một route là kéo theo mọi lớp nổi của nó.** Lớp nổi luôn được mở khi chụp (luật dự án).
2. **Generator** `tools/sweep/gen.mjs`:
   - nhận bộ lọc (zone, route, tag, ngôn ngữ, bề ngang);
   - sinh `.playwright-cli/sweep-<nhãn>-<lang>.js`, giữ nguyên khối đăng nhập, seed và 7 máy dò;
   - `zone=all` phải ra đúng sweep trọn như hôm nay, để mốc cuối đợt vẫn chạy được bằng một lệnh;
   - `layout-sweep.js` hoặc được sinh ra từ manifest, hoặc nghỉ hưu. Không để hai danh sách route song song.
3. **Diff theo route** `tools/sweep/diff.mjs`: so `results`, `consoleErrors`, `redirected` của một lần chạy với mốc
   `tools/sweep/baseline-{vi,en}.json`, theo từng route. In ra route mới, route mất, và route có phát hiện thêm hoặc bớt.
4. **So ảnh** `tools/pixdiff.mjs`, port từ `b17-pixdiff.mjs`:
   - nhận hai thư mục và một danh sách tên;
   - báo phần trăm lệch và các dải 20px;
   - cho khai vùng bỏ qua (đồng hồ đếm ngược, giờ tương đối).
5. **Bản đồ ảnh hưởng** `tools/impact.mjs`: đọc `git diff --name-only <base>` cùng các tệp untracked, rồi in JSON
   `{routes, overlays, widths, langs, db, build, reasons}`. Luật:
   - **Biên vùng:** `app/styles/feed/**` chỉ ảnh hưởng cửa hàng; `registry/**` chỉ ảnh hưởng quản trị.
   - **Tệp toàn cục, đổi là cả vùng:**
     - cả hai vùng: `lib/lexicon.ts`, `lib/i18n.ts`, `lib/locale.ts`, `components/i18n/*`, `app/globals.css`, `app/layout.tsx`;
     - cửa hàng: `FeedChrome`, `FeedFrame`;
     - quản trị: `ArcAdminFrame`, `ArcSidebar`, `ArcPage.module.css`.

     Danh sách này đặt trong một hằng có chú giải.
   - **`lib/*.ts`, component và `.module.css`:** tìm nơi import bằng đồ thị import ngược (regex), rồi đối chiếu `components` trong
     manifest để ra route.
   - **Selector CSS đổi:** lấy tên class, grep trong `components/` và `app/`, ra component rồi ra route. Selector không có class
     (`[data-ui=feed] a`, `html:has(…)`, `:lang(en)`) thì tính là cả vùng.
   - **Bề ngang:** đọc `@media` bao quanh đoạn đổi, lấy hai mép dải và một điểm ngay ngoài dải. Không có `@media` thì 390 và 1280.
     Quản trị chỉ 1280 và 1440.
   - **Ngôn ngữ:** đổi CSS hoặc bố cục thì cả vi lẫn en; đổi câu chữ một phía thì chỉ phía đó.
   - **`db`:** bật khi diff chạm `supabase/`, `lib/db/`, `lib/actions/`, `data/`, `scripts/gen-seed*`.
   - **`build`:** bật khi diff chạm `app/`, `components/`, `lib/`, `registry/` hoặc CSS.
   - Luôn kèm danh sách route đối chứng cố định: `/`, `/products/s05-khoi`, `/cart`, `/checkout`, `/account/orders/DH-2430` ở 390 và
     1280; `/admin` và `/admin/orders` ở 1280.
6. **Sửa báo nhầm của máy dò** (chuyển từ R2 §1.9):
   - `inlineBox` bỏ qua phần tử có tổ tiên bị ẩn. Cả 72 phát hiện hiện nay là `.acc-item` trong `.acc-nav`, mà `.acc-nav` có
     `display:none` dưới 900;
   - `smallTarget` đổi selector `.sz` thành `.size`, vì `.sz` bắt trúng chữ bên trong `label.size` 84×48.
7. **Mốc mới:**
   - chạy **một lần** sweep trọn, vi và en, trên bản build hiện tại (đã có R1), theo hai lượt riêng;
   - ghi `tools/sweep/baseline-{vi,en}.json`;
   - giải thích từng nhóm phát hiện còn lại.
8. **Test** (vitest, chạy trong `npm test`):
   - `impact.mjs`, với diff giả lập. Có ít nhất các ca: một tệp CSS Feed; một `lib/*.ts` có nhiều nơi import; một tệp toàn cục; một
     migration; một chuỗi câu chữ;
   - `diff.mjs`.
9. **Script npm:** `impact`, `sweep:gen`, `sweep:diff`, `pixdiff`.
10. **`tools/sweep/README.md`:** cách dùng cho một lát và cho mốc cuối đợt, kèm **luật thăng mốc**. Lát được duyệt xong thì ảnh "sau"
    và JSON sweep của nó thay mốc, cho đúng các route nó đụng. Thiếu luật này, lát sau sẽ báo nhầm thay đổi có chủ ý của lát trước là
    lỗi rò.
11. Giữ `tools/sweep/reference/` tới cuối đợt v6. Phiên chính xoá sau.

## 2. Kiểm

- `npm run typecheck`, `npm test` sạch.
- **Thử `impact` trên diff thật:**
  - commit R1, tức HEAD so với cha của nó. Kết quả phải ra các route cửa hàng của R1, lớp nổi sửa địa chỉ của quản trị (vì C7), và cả
    vùng cửa hàng (vì R1 sửa `FeedChrome`);
  - commit `f9ff40d` (B19). Kết quả phải có `db: true` và các route tra đơn.

  Dán cả hai JSON vào báo cáo.
- **Thử `gen`:** sinh sweep cho riêng vùng quản trị bản en, chạy thử trên 3200, rồi so bằng `diff.mjs` với mốc mới. Kết quả phải là
  không khác.
- **Thử `pixdiff`:** so hai thư mục ảnh của chính lần chạy mốc. Kết quả phải ra 0%.
- Không cần build lại app, trừ khi sweep cần.

## 3. Luật

- Chỉ Edit/Write. Không commit. Không sửa `app/`, `components/`, `lib/` (trừ test mới), `supabase/`, `prototype/`.
- Lệnh nào bị hệ thống quyền chặn: đừng tìm đường vòng, ghi vào báo cáo.
- Ghi DB thì chạy `reset_demo(demo_anchor())` sau đó. Không bấm "Đặt lại dữ liệu mẫu" trên UI. Không đọc `supabase/.env`.
- Để 3200 và stack Supabase chạy khi xong.

## 4. Báo cáo

- **Đã làm:** tệp tạo hoặc sửa, cùng cách dùng ngắn gọn.
- **Hai JSON `impact`** (R1, B19).
- **Kết quả `gen`, `diff`, `pixdiff`.**
- **Mốc mới:** số phát hiện vi và en, cùng phân loại.
- **Giới hạn của `impact`:** những gì nó chưa bắt được, để phiên chính bù bằng mắt.
