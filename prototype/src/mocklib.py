# -*- coding: utf-8 -*-
"""Hệ thiết kế đã chốt + các mảnh dựng dùng chung cho toàn bộ mock."""
from icons_iconsax import (PATHS as ICONSAX, DUO as ICONSAX_DUO,
                           INK, INK_DUO, INK_MAC)

# ---------------------------------------------------------------- tokens / css
CSS = """
/* =========================================================================
   HỆ THIẾT KẾ — nền trắng, element màu da trời, bo góc 6px
   Mọi cặp chữ/nền trong file này đã được tính tay và đạt WCAG AA.
   ========================================================================= */
:root{
  /* thang màu chủ đạo — MẬT ONG (primary ramp) */
  --gold-50:#FDF9F2;  --gold-100:#FBF1DA; --gold-200:#FBE8BC; --gold-300:#F7D98E;
  --gold-400:#F1C04A; --gold-500:#EBA400; --gold-600:#C28800; --gold-700:#9E6817;
  --gold-800:#6E4A12; --gold-900:#211D12;

  /* màu chủ đạo tách theo vai trò */
  --fill:#EBA400;      /* MẢNG: nút, chip đang chọn, chấm giỏ — mật ong */
  --fill-bd:#C28800;   /* dự phòng — không còn dùng làm viền nút nữa */
  --fill-ink:#211D12;  /* chữ đặt trên mảng, 7,88:1 — vàng không mang nổi chữ trắng */
  --band:#FBE8BC;      /* dải thông tin đợt */
  --band-ink:#211D12;  /* 13,9:1 trên dải */
  --mark:#C28800;      /* cột biểu đồ, chấm mốc, vòng chọn — chỉ cần 3:1 */
  --link:#9E6817;      /* chữ & liên kết: nâu mật, 4,72:1 — bậc sáng nhất còn đọc được */

  --ink:#211D12;      /* chữ chính     16,8:1 trên trắng */
  --ink2:#71674E;     /* chữ phụ        5,6:1 */
  --hair:#F4EBD7;     /* đường kẻ mảnh */
  --line:#968B73;     /* viền ô nhập    3,4:1 — đạt chuẩn viền điều khiển */
  --bg:#FFFFFF;
  --plate:#FBF1DA;    /* nền chỗ đặt ảnh */

  --hot:#B61E32;    --hot-bg:#FBEAEC;   /* sắp hết / huỷ — đỏ, tách hẳn khỏi họ vàng */
  --ok:#1B6B3A;     --ok-bg:#E6F4EA;    /* xong */
  --warn:#44505E;   --warn-bg:#EAEDF1;  /* chờ — xám, vì vàng nay là màu thương hiệu */
  --info:#0C6289;   --info-bg:#DCEFFA;  /* đang chạy */

  --r:6px;          /* bo góc chuẩn */
  --r-sm:4px;
}

*,*::before,*::after{ box-sizing:border-box; }

.s{
  background:var(--bg); color:var(--ink);
  font-family:"Be Vietnam Pro",system-ui,sans-serif;
  font-size:13px; line-height:1.55; -webkit-font-smoothing:antialiased;
}
.s .nm{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; letter-spacing:-.015em; }
.s a{ color:inherit; text-decoration:none; }
/* Vòng focus là `outline` DUY NHẤT còn lại. Nó chỉ hiện khi đi bằng bàn phím,
   không bao giờ hiện với chuột — bỏ nó là không dùng được trang bằng Tab.

   ĐỪNG tin `:focus-visible` một mình để giữ lời hứa đó. Đã đo trên bản chạy
   thử: với phần tử được cấp `tabindex`, và với cả `<button>` thật khi bị
   focus bằng script, Chrome vẫn bật `:focus-visible` sau một cú chuột. Nên
   trang phải tự đánh dấu đang dùng chuột hay bàn phím, và luật ngay dưới
   tắt sạch vòng focus trong lúc dùng chuột:

       var de = document.documentElement;
       de.setAttribute('data-chuot','');                       // mặc định
       addEventListener('pointerdown', () => de.setAttribute('data-chuot',''), true);
       addEventListener('keydown', e => { if (e.key === 'Tab')
                                            de.removeAttribute('data-chuot'); }, true);

   `!important` là cố ý: đây là công tắc tắt, phải thắng mọi luật khác. */
html[data-chuot] :focus,
html[data-chuot] :focus-visible{ outline:none !important; }

.s :focus-visible{ outline:2px solid var(--mark); outline-offset:2px;
  border-radius:var(--r-sm); }

/* ── Những bề mặt trình duyệt tự vẽ. Không nhận lấy thì chúng mang mặc định
      của hệ điều hành, tức là không thuộc hệ thiết kế nào. ── */
.s ::selection{ background:var(--gold-300); color:var(--ink); }
.s{ caret-color:var(--fill); }
.s ::-webkit-scrollbar{ width:10px; height:10px; }
.s ::-webkit-scrollbar-track{ background:var(--gold-50); }
.s ::-webkit-scrollbar-thumb{ background:var(--gold-300); border-radius:99px;
  border:3px solid var(--gold-50); }
.s ::-webkit-scrollbar-thumb:hover{ background:var(--fill); }

/* Chữ số phải thẳng cột thì con số mới so sánh được bằng mắt. */
.s .p, .s .amt, .s .sum, .s .band .cd, .s .card .st, .s .sz i,
.s .steps .n, .s.adm .kpi .vl, .s.adm td.num, .s.adm th.num,
.s .chart .heroN, .s .xax span, .s .tl .d, .s .row .d{
  font-variant-numeric:tabular-nums; }

/* Tiêu đề không nên rơi một chữ xuống dòng cuối. */
.s h1, .s .h2, .s .empty h3, .s.adm h1{ text-wrap:balance; }
.s p, .s .lead, .s .note, .s .empty p{ text-wrap:pretty; }

/* ----------------------------------------------------------------- thanh nav */
.s .nav{ display:flex; align-items:center; gap:15px; padding:14px 18px;
  border-bottom:1px solid var(--hair); background:#fff; }
.s .wm{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; font-size:14px;
  letter-spacing:.2em; margin-right:auto; }
.s .nav a{ font-size:11.5px; color:var(--ink2); }
.s .nav a.on{ color:var(--link); font-weight:500; }
/* Icon: Iconsax Linear. Path mang sẵn stroke=currentColor và stroke-width=1.5,
   nên ở đây chỉ đặt kích thước — không ghi đè nét.
   Màu thì THỪA HƯỞNG: icon luôn cùng màu với chữ đứng cạnh nó. Muốn khác thì
   đặt `color` ở chính chỗ chứa nó, đừng đặt vào icon. */
.s .ic{ width:18px; height:18px; font-size:18px;
  color:inherit; fill:none; flex:none; }
/* Duotone (Iconsax Bulk) — chỉ dùng cho trạng thái ĐANG BẬT. Nó tô mảng chứ
   không kẻ nét, nên phải mở fill lại. Màu vẫn thừa hưởng như icon nét: đặc hay
   rỗng là kênh phân biệt, không cần thêm kênh màu riêng. */
.s .ic.duo{ fill:currentColor; }

/* ── Icon đứng cạnh chữ: cắt phần trống trong suốt hai bên khỏi hộp bố trí ──
   Iconsax vẽ mỗi hình trong ô 24×24 nhưng mỗi hình chiếm một phần khác nhau
   của ô (`chev` rộng 7,1 đơn vị, `truck` rộng 21,75). Xếp bằng `gap` là xếp
   hai cái HỘP, nên khoảng cách thấy được phình theo phần trống: đo được từ
   6,9px tới 12px cho cùng `gap:7px`, và cả cụm icon+chữ lệch phải tới 5,6px.

   Lề âm ở đây kéo hộp về đúng mép mực. Hình vẫn vẽ y nguyên — chỉ cái hộp
   co lại. KHÔNG áp cho icon đứng một mình (thanh điều hướng, nút quay lại,
   ô chọn): ở đó hộp vuông chính là vùng chạm 44px.

   `--il` / `--ir` do `mocklib.icon()` gắn vào từng SVG; `1em` = bề ngang
   icon vì `.ic` có font-size bằng width. Thiếu biến thì mặc định 0. */
.s .btn > .ic,
.s .card.vuot .qbtn > .ic,
.s .chip > .ic,
.s .badge > .ic,
.s .side a > .ic,
.s .sim > .ic,
.dt .facet > svg{
  margin-left:calc(var(--il, 0) * -1em);
  margin-right:calc(var(--ir, 0) * -1em);
}
/* Thực đơn KHÔNG nằm trong luật trên: ở đó icon xếp thành một CỘT, mà cắt
   mỗi hình một kiểu thì nhãn bên cạnh so le nhau. Cột icon phải rộng bằng
   nhau, kể cả khi hình bên trong to nhỏ khác nhau. */
.s .ic.sm{ width:15px; height:15px; font-size:15px; }
.s .cartdot{ position:relative; display:flex; }
/* Túi ở thanh nav không có nhãn đi kèm, nên trạng thái "giỏ có món" phải tự
   mang màu: đặc + màu thương hiệu. */
.s .cartdot svg.duo{ color:var(--link); }
.s .cartdot b{ position:absolute; top:-7px; right:-9px; background:var(--fill);
  color:var(--fill-ink);
  font-size:9px; line-height:1; padding:2.5px 4px; border-radius:99px; font-weight:600; }

/* thanh phụ: quay lại + tiêu đề màn */
.s .sub{ display:flex; align-items:center; gap:10px; padding:13px 18px;
  border-bottom:1px solid var(--hair); }
.s .sub h1{ margin:0; font-size:15px; font-weight:600; }
.s .sub .rt{ margin-left:auto; font-size:11.5px; color:var(--link); font-weight:500; }
.s .sub .rt.plain{ color:var(--ink2); font-weight:400; }

/* --------------------------------------------------------------------- dải */
.s .band{ margin:14px 18px 0; background:var(--band); border-radius:var(--r);
  padding:10px 13px; display:flex; align-items:baseline; gap:9px; font-size:11.5px;
  color:var(--band-ink); }
.s .band b{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; color:var(--ink);
  font-size:12.5px; letter-spacing:.02em; }
.s .band .sep{ color:#D4B268; }
.s .band .cd{ color:var(--ink); font-weight:500; margin-left:auto; }

/* ------------------------------------------------------------------- chữ/lề */
.s .pad{ padding-left:18px; padding-right:18px; }
.s .lead{ padding:11px 18px 0; font-size:12.5px; line-height:1.55; color:var(--ink2); max-width:46ch; }
.s .h2{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; font-size:16px;
  margin:22px 18px 0; letter-spacing:-.01em; }
.s .note{ font-size:11px; color:var(--ink2); }
.s .hr{ height:1px; background:var(--hair); margin:18px 0 0; }

/* ------------------------------------------------------------------- nút */
.s .btn{ display:flex; align-items:center; justify-content:center; gap:7px;
  background:var(--fill); color:var(--fill-ink); border:1px solid var(--fill);
  border-radius:var(--r); height:40px; font-size:13px; font-weight:500;
  letter-spacing:.01em; cursor:pointer; position:relative; }
/* Nút cao 40px cho nhẹ mắt, nhưng ngón tay vẫn được 44px: lớp phủ vô hình
   nới vùng chạm ra 2px mỗi bên. Không ảnh hưởng bố cục. */
.s .btn::after{ content:""; position:absolute; inset:-2px 0; }
.s .btn.sm::after{ content:none; }
.s .btn.ghost{ background:#fff; color:var(--link); border-color:var(--fill); }
.s .btn.quiet{ background:var(--gold-50); color:var(--ink2);
  border-color:var(--gold-50); }
.s .btn.sm{ height:34px; font-size:12px; padding:0 14px; display:inline-flex; }
.s .btn.off{ background:var(--gold-50); color:var(--ink2); border-color:var(--line);
  border-style:dashed; }
.s .btn.wide{ margin:0 18px; }
.s .lnk{ color:var(--link); font-weight:500; text-decoration:underline;
  text-decoration-thickness:1px; text-underline-offset:3px;
  text-decoration-color:color-mix(in srgb, var(--link) 45%, transparent); }

/* ------------------------------------------------------------------- ảnh */
.s .ph{ width:100%; aspect-ratio:4/5; background:var(--plate); border-radius:var(--r);
  overflow:hidden; }
.s .ph img{ width:100%; height:100%; object-fit:cover; display:block; }
.s .hero{ width:100%; background:var(--plate); overflow:hidden; }
.s .hero img{ width:100%; height:100%; object-fit:cover; display:block; object-position:50% 18%; }

/* ------------------------------------------------------------------ lưới */
.s .grid{ display:grid; grid-template-columns:1fr 1fr; gap:16px 12px; padding:16px 18px 0; }
.s .grid.three{ grid-template-columns:repeat(3,1fr); gap:22px 20px; }
.s .grid.four{ grid-template-columns:repeat(4,1fr); gap:22px 18px; }
.s .card h3{ margin:8px 0 0; font-size:13.5px; }
.s .card .k{ font-size:11px; color:var(--ink2); margin-top:1px; }
.s .card .p{ font-size:12.5px; margin-top:3px; font-weight:500; }
.s .card .st{ font-size:10.5px; color:var(--ink2); margin-top:4px; }
.s .card .st .gone{ text-decoration:line-through; }
.s .card .st .low{ color:var(--hot); font-weight:500; }
.s .card .wrap{ position:relative; }
.s .card .flag{ position:absolute; left:7px; top:7px; background:#fff; color:var(--ink);
  font-size:9.5px; font-weight:600; padding:3px 6px; border-radius:var(--r-sm);
  letter-spacing:.02em; }
.s .card .sold{ position:absolute; inset:0; background:rgba(255,255,255,.72);
  display:flex; align-items:center; justify-content:center; border-radius:var(--r);
  font-size:11px; font-weight:600; letter-spacing:.06em; color:var(--ink); }

/* ══ THẺ SẢN PHẨM — băng ảnh vuốt theo màu ═══════════════════════════════
   Ô ảnh không còn là một tấm: nó là băng ngang, mỗi màu một tấm. Băng này là
   VÙNG CUỘN THẬT (`overflow-x:auto` + `scroll-snap`) chứ không phải hiệu ứng
   JS — nên ngón tay, bàn di, con lăn và phím mũi tên đều đi được, và nó không
   nuốt cú vuốt dọc của trang. JS chỉ tô chấm và phân biệt chạm với vuốt.

   Thẻ để trống chỗ của size và màu, đổi lại giữ đúng hai thứ PRODUCT.md dòng
   86 gọi là nội dung: dòng "hết XL" khi có size đã hết, và số còn lại khi đã
   xuống ≤3 chiếc. Cả hai im lặng ở phần lớn thẻ.

   Thẻ là cột dọc và nút bị đẩy xuống đáy: lưới đã kéo mọi thẻ cùng hàng cao
   bằng nhau, nên không đẩy thì thẻ có dòng "hết XL" sẽ có nút thấp hơn thẻ
   không có — bốn nút lệch nhau trên cùng một hàng. */
.s .card.vuot{ display:flex; flex-direction:column; }
.s .card.vuot .wrap{ border-radius:var(--r); overflow:hidden; }
.s .card.vuot .slide{ display:flex; overflow-x:auto; overflow-y:hidden;
  scroll-snap-type:x mandatory; scrollbar-width:none; -ms-overflow-style:none; }
.s .card.vuot .slide::-webkit-scrollbar{ width:0; height:0; display:none; }
.s .card.vuot .sl{ flex:0 0 100%; scroll-snap-align:center; scroll-snap-stop:always;
  background:var(--plate); cursor:pointer; }
.s .card.vuot .sl img{ width:100%; aspect-ratio:4/5; object-fit:cover; display:block;
  pointer-events:none; }
/* Chấm chỉ vị trí phân biệt bằng VÒNG + CỠ, không chỉ bằng màu — màu chấm chỉ
   để đoán trước trong thẻ có màu gì. */
.s .card.vuot .cham{ position:absolute; left:0; right:0; bottom:8px;
  display:flex; justify-content:center; gap:6px; pointer-events:none; }
.s .card.vuot .cham i{ width:8px; height:8px; border-radius:99px; display:block;
  box-shadow:inset 0 0 0 1px var(--line), 0 0 0 2px rgba(255,255,255,.92);
  transition:box-shadow .16s ease, transform .16s ease; }
.s .card.vuot .cham i.on{ transform:scale(1.3);
  box-shadow:inset 0 0 0 1px var(--line), 0 0 0 2px #fff,
             0 0 0 3.5px var(--ink); }
@media (prefers-reduced-motion:reduce){
  .s .card.vuot .cham i{ transition:none; }
  .s .card.vuot .slide{ scroll-behavior:auto; }
}
/* hàng giá; số còn lại chỉ nói khi đã xuống ≤3 */
.s .card .gia2{ display:flex; align-items:baseline; gap:8px; margin-top:4px; }
.s .card .gia2 .p{ margin:0; }
.s .card .gia2 .con{ margin-left:auto; font-size:10.5px; color:var(--ink2); }
.s .card .gia2 .con.it{ color:var(--hot); font-weight:500; }
/* dòng size đã hết — chỉ hiện khi thật sự có size đã hết */
.s .card.vuot .thieu{ font-size:10.5px; color:var(--hot); margin-top:3px; }
.s .card.vuot .thieu s{ text-decoration:line-through; }
.s .card.vuot .act{ position:relative; margin-top:auto; padding-top:8px; }
.s .card.vuot .qbtn{ display:flex; align-items:center; justify-content:center; gap:6px;
  width:100%; height:36px; font:inherit; font-size:12px; font-weight:500;
  letter-spacing:.01em; color:var(--fill-ink); background:var(--fill);
  border:1px solid var(--fill); border-radius:var(--r); cursor:pointer;
  position:relative; }
/* Nút cao 36px cho thẻ nhẹ, ngón tay vẫn được 44px — cùng mẹo lớp phủ vô hình
   như `.btn`, không đụng gì tới bố cục. */
.s .card.vuot .qbtn::after{ content:""; position:absolute; inset:-4px 0; }
.s .card.vuot .qbtn:hover{ background:var(--gold-400); border-color:var(--gold-400); }
.s .card.vuot .qbtn.xong{ background:var(--ok-bg); border-color:var(--ok-bg);
  color:var(--ok); }

/* ── tấm trượt chọn size ─────────────────────────────────────────────────
   Nút trên thẻ không tự đoán size. Nó mở tấm này — chỗ duy nhất đủ rộng để
   nói số còn lại của TỪNG size, và cũng là chỗ duy nhất nhắc lại màu người
   mua vừa vuốt tới. */
.s .chonsize .dau{ display:flex; gap:12px; align-items:flex-start;
  padding:2px 18px 0; }
.s .chonsize .dau img{ width:64px; height:80px; object-fit:cover;
  border-radius:var(--r); background:var(--plate); flex:none; }
.s .chonsize .dau .nm{ margin:0; font-size:16px; }
.s .chonsize .dau .k{ font-size:11px; color:var(--ink2); margin-top:2px; }
.s .chonsize .dau .p{ font-size:14px; font-weight:500; margin-top:5px; }
.s .chonsize .nhan{ font-size:11px; color:var(--ink2); padding:16px 18px 7px; }
.s .chonsize .nhan b{ color:var(--ink); font-weight:600; }
.s .chonsize .swa{ display:flex; gap:10px; padding:0 18px; }
.s .chonsize .swa button{ width:34px; height:34px; border-radius:99px; padding:0;
  border:0; background:none; position:relative; cursor:pointer; flex:none; }
/* vòng chạm 44px, không đổi bố cục */
.s .chonsize .swa button::after{ content:""; position:absolute; inset:-5px; }
/* Ô màu Trắng/Kem trên nền trắng chỉ còn cái viền để nhận ra, nên viền phải
   đạt 3:1 của WCAG 1.4.11. `--line` là token dành đúng cho việc đó (3,37:1);
   viền 18% alpha trước đây chỉ được 1,49:1. */
.s .chonsize .swa i{ display:block; width:100%; height:100%; border-radius:99px;
  box-shadow:inset 0 0 0 1px var(--line); }
.s .chonsize .swa button[aria-pressed="true"] i{
  box-shadow:inset 0 0 0 1px var(--line), 0 0 0 2px #fff,
             0 0 0 3.5px var(--ink); }
/* Hàng size ở đây là hàng thường (ô `flex:1`, trải hết bề ngang), KHÔNG
   phải biến thể `.szrow.w` của bố cục máy tính — `.w` khoá ô ở 68px và xoá
   lề, nên trên tấm rộng 390px nó dồn hết sang trái.
   Luật này (0,3,0) thắng `.s .szrow` (0,2,0); nếu có ngày phải đè cả
   `.s .szrow.w` (0,3,0) thì phải viết `.s .chonsize .szrow.w`, viết sau
   không đủ. */
.s .chonsize .szrow{ padding:0 18px; }
.s .chonsize .thieu{ font-size:11px; color:var(--hot); padding:9px 18px 0; }
.s .chonsize .thieu s{ text-decoration:line-through; }
.s .chonsize .nut{ padding:18px; }

/* ------------------------------------------------------------------ nhãn */
.s .badge{ display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:500;
  white-space:nowrap;
  padding:3px 8px; border-radius:var(--r-sm); background:var(--info-bg); color:var(--info); }
.s .badge.ok{ background:var(--ok-bg); color:var(--ok); }
.s .badge.warn{ background:var(--warn-bg); color:var(--warn); }
.s .badge.hot{ background:var(--hot-bg); color:var(--hot); }
.s .badge.flat{ background:var(--gold-50); color:var(--ink2); }
.s .badge i{ width:5px; height:5px; border-radius:99px; background:currentColor; flex:none;
  font-style:normal; }

/* -------------------------------------------------------------- bộ lọc/chip */
.s .chips{ display:flex; gap:7px; padding:12px 18px 0; overflow:hidden; }
.s .chip{ border:1px solid var(--fill); background:#fff; border-radius:var(--r);
  padding:6px 11px; font-size:11.5px; color:var(--ink2); white-space:nowrap; }
.s .chip.on{ background:var(--fill); border-color:var(--fill); color:var(--fill-ink);
  font-weight:500; }
.s .chip.icon{ display:inline-flex; align-items:center; gap:5px; }

/* --------------------------------------------------------------- ô nhập */
.s .field{ padding:13px 18px 0; }
.s .field label{ display:block; font-size:11px; color:var(--ink2); margin-bottom:5px; }
.s .inp{ width:100%; height:44px; border:1px solid var(--line); border-radius:var(--r);
  background:#fff; padding:0 12px; font-size:13px; color:var(--ink);
  display:flex; align-items:center; }
.s .inp.ph2{ color:#7A6F5A; }   /* 4,94:1 — chữ gợi ý vẫn phải đọc được */
.s .inp.area{ height:78px; align-items:flex-start; padding-top:11px; }
.s .inp.sel{ justify-content:space-between; }
/* ── ô chọn của biểu mẫu ───────────────────────────────────────────────
   Cùng một tấm thực đơn với nút thả xuống của bảng — cùng dấu tích, cùng
   bóng, cùng cách mở. Nhưng CÁI NÚT thì phải trông như một ô nhập, vì nó
   đứng cạnh các ô Tên, Giá, SKU chứ không đứng cạnh chip lọc. */
.s .selwrap{ display:block; }
.s button.selbtn{ width:100%; justify-content:space-between; gap:8px;
  font:inherit; text-align:left; cursor:pointer; }
.s .selbtn .t{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.s .selbtn > svg{ width:14px; height:14px; flex:none; color:var(--ink2);
  transition:transform .16s cubic-bezier(.16,1,.3,1); }
.s .selbtn[aria-expanded="true"] > svg{ transform:rotate(180deg); }
.s .selbtn:hover{ background:var(--gold-50); }
.s .selbtn[aria-expanded="true"]{ border-color:var(--fill-bd); }
@media (prefers-reduced-motion:reduce){ .s .selbtn > svg{ transition:none; } }
.s .two{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.s .err{ font-size:10.5px; color:var(--hot); margin-top:5px; display:flex; gap:5px; align-items:center; }
.s .inp.bad{ border-color:var(--hot); border-width:1.5px; }
.s .check{ display:flex; gap:9px; align-items:flex-start; padding:13px 18px 0; font-size:12px; }
.s .box{ width:17px; height:17px; border:1px solid var(--line); border-radius:var(--r-sm);
  flex:none; margin-top:1px; }
.s .box.on{ background:var(--fill); border-color:var(--fill); position:relative; }
.s .box.on::after{ content:""; position:absolute; left:5px; top:2px; width:4px; height:8px;
  border:solid var(--fill-ink); border-width:0 2px 2px 0; transform:rotate(43deg); }
.s .radio{ width:17px; height:17px; border:1px solid var(--line); border-radius:99px; flex:none;
  margin-top:1px; }
.s .radio.on{ border:5px solid var(--fill); }

/* --------------------------------------------------------------- chọn size */
.s .szrow{ display:flex; gap:7px; padding:9px 18px 0; }
.s .szrow.w{ padding:0; gap:8px; }
.s .sz{ flex:1; border:1px solid var(--fill); background:#fff; border-radius:var(--r);
  text-align:center; padding:9px 2px; }
.s .szrow.w .sz{ flex:0 0 68px; }
.s .sz b{ display:block; font-size:13px; font-weight:600; }
.s .sz i{ font-style:normal; font-size:10px; color:var(--ink2); }
.s .sz.low i{ color:var(--hot); }
.s .sz.gone{ background:var(--gold-50); border-color:var(--line); border-style:dashed; }
.s .sz.gone b{ color:var(--ink2); text-decoration:line-through; }
.s .sz.gone i{ color:var(--ink2); }
.s .sz.on{ background:var(--fill); border-color:var(--fill); }
.s .sz.on b, .s .sz.on i{ color:var(--fill-ink); }

/* ------------------------------------------------------------------- hàng */
.s .rows{ margin:12px 18px 0; border:1px solid var(--hair); border-radius:var(--r);
  overflow:hidden; }
.s .row{ display:flex; gap:12px; align-items:center; padding:13px 14px;
  border-top:1px solid var(--hair); }
.s .rows .row:first-child{ border-top:0; }
.s .row .grow{ flex:1; min-width:0; }
.s .row .t{ font-size:12.5px; font-weight:500; display:block; }
.s .row .d, .s .tl .t, .s .tl .d{ display:block; }
.s .row .d{ font-size:11px; color:var(--ink2); margin-top:2px; }
.s .row .amt{ font-size:12.5px; font-weight:500; white-space:nowrap; }
.s .row .thumb{ width:52px; height:65px; border-radius:var(--r-sm); background:var(--plate);
  overflow:hidden; flex:none; }
.s .row .thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
.s .chev{ width:15px; height:15px; color:var(--ink2); fill:none; flex:none; }

/* ------------------------------------------------------- một dòng trong giỏ
   Ba cột: ảnh · tên và số lượng · tiền. Cột phải giãn hết chiều cao dòng nên
   giá bám mép trên, nút Xoá bám mép dưới. Mắt đi thẳng một đường từ tên sang
   giá rồi xuống hành động, thay vì zig-zag qua giữa dòng. */
.s .row.cartline{ align-items:stretch; }
.s .cartline .thumb{ align-self:flex-start; }
.s .cartline .grow{ display:flex; flex-direction:column; }
.s .cartline .side{ display:flex; flex-direction:column; align-items:flex-end;
  justify-content:space-between; gap:8px; flex:none; }
.s .cartline .amt{ font-variant-numeric:tabular-nums; }
.s .cartline .rm{ background:none; border:0; padding:0; font:inherit; font-size:11.5px;
  color:var(--link); font-weight:500; text-decoration:underline; text-underline-offset:2px;
  cursor:pointer; }
/* Nhắn khi số vừa gõ vượt quá số đã cắt cho đợt. Đợt đã cắt là cắt một lần —
   gõ 99 vào ô không sinh thêm áo, nên nói thẳng thay vì im lặng sửa số. */
.s .cartline .cap{ display:block; font-size:10.5px; color:var(--hot); margin-top:6px;
  max-width:19ch; line-height:1.4; }
.s .cartline .cap[hidden]{ display:none; }

/* ô số lượng: gõ được, không chỉ bấm tăng giảm từng nấc */
.s .qty{ display:inline-flex; align-items:center; align-self:flex-start; margin-top:9px;
  height:36px; background:#fff; border:1px solid var(--fill); border-radius:var(--r);
  overflow:hidden; }
.s .qb{ position:relative; width:32px; height:100%; flex:none; display:flex;
  align-items:center; justify-content:center; padding:0; background:none; border:0;
  color:var(--ink); cursor:pointer; }
/* Nút trông 32×34 nhưng vùng chạm đủ 44×44 — đã đo, không ước lượng. */
.s .qb::after{ content:""; position:absolute; inset:-5px -6px; }
.s .qb:hover:not(:disabled){ background:var(--gold-50); }
.s .qb:disabled{ color:var(--line); cursor:not-allowed; }
.s .qn{ width:40px; height:100%; padding:0; text-align:center; background:#fff;
  border:0; border-left:1px solid var(--hair); border-right:1px solid var(--hair);
  font-family:inherit; font-size:12.5px; font-weight:500; color:var(--ink);
  font-variant-numeric:tabular-nums; -webkit-appearance:none; appearance:none; }
.s .qn:focus{ background:var(--gold-50); }

/* ---------------------------------------------------------------- tổng tiền */
.s .sum{ margin:14px 18px 0; background:var(--gold-50); border-radius:var(--r); padding:13px 14px; }
.s .sum div{ display:flex; justify-content:space-between; font-size:12px; padding:4px 0;
  color:var(--ink2); }
.s .sum div.tot{ border-top:1px solid var(--gold-200); margin-top:6px; padding-top:9px;
  color:var(--ink); font-size:14px; font-weight:600; }

/* ------------------------------------------------------------------- bước */
.s .steps{ display:flex; align-items:flex-start; padding:15px 18px 0; }
.s .steps .st{ display:flex; flex-direction:column; align-items:center; gap:7px; flex:none; }
.s .steps .n{ width:28px; height:28px; border-radius:var(--r); display:flex;
  align-items:center; justify-content:center; font-size:12px; font-weight:600;
  background:var(--gold-100); color:var(--ink2); }
.s .steps .st.done .n, .s .steps .st.now .n{ background:var(--fill); color:var(--fill-ink); }
.s .steps .n svg{ width:13px; height:8.7px; color:var(--fill-ink); fill:none; }
.s .steps .t{ font-size:10px; color:var(--ink2); white-space:nowrap; }
.s .steps .st.now .t{ color:var(--ink); font-weight:600; }
.s .steps .ln{ flex:1; height:2px; background:var(--hair); margin:13px 3px 0;
  border-radius:99px; min-width:14px; }
.s .steps .ln.on{ background:var(--mark); }

/* ------------------------------------------------------------- dòng thời gian */
.s .tl{ margin:14px 18px 0; }
.s .tl .it{ display:flex; gap:12px; }
.s .tl .gut{ display:flex; flex-direction:column; align-items:center; flex:none; width:16px; }
.s .tl .dot{ width:10px; height:10px; border-radius:99px; background:var(--hair); margin-top:4px; }
.s .tl .it.done .dot{ background:var(--mark); }
.s .tl .it.now .dot{ background:var(--mark); box-shadow:0 0 0 4px var(--gold-100); }
.s .tl .stem{ width:2px; flex:1; background:var(--hair); margin:3px 0; }
.s .tl .it.done .stem{ background:var(--mark); }
.s .tl .bd{ padding-bottom:16px; }
.s .tl .t{ font-size:12.5px; font-weight:500; }
.s .tl .d{ font-size:11px; color:var(--ink2); margin-top:1px; }
.s .tl .it.todo .t{ color:var(--ink2); font-weight:400; }

/* ------------------------------------------------------------- trạng thái rỗng */
.s .empty{ padding:46px 30px; text-align:center; }
.s .empty .ring{ width:56px; height:56px; border-radius:99px; background:var(--gold-50);
  display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
.s .empty .ring svg{ width:24px; height:24px; color:var(--link); fill:none; }
.s .empty h3{ font-size:14.5px; margin:0 0 5px; font-family:"Familjen Grotesk",sans-serif;
  font-weight:700; }
.s .empty p{ font-size:12px; color:var(--ink2); margin:0 0 16px; line-height:1.55; }

/* ------------------------------------------------------------------- tab bar */
.s .tabs{ display:flex; border-bottom:1px solid var(--hair); padding:0 18px; gap:18px; }
.s .tabs span{ font-size:12px; color:var(--ink2); padding:11px 0; border-bottom:2px solid transparent;
  margin-bottom:-1px; }
.s .tabs span.on{ color:var(--ink); font-weight:500; border-bottom-color:var(--fill); }

/* ====================================================== khu quản trị (desktop) */
.s.adm{ display:flex; min-height:100%; background:var(--gold-50); }
.s.adm .side{ width:208px; flex:none; background:#fff; border-right:1px solid var(--hair);
  padding:18px 0; }
.s.adm .side .wm{ padding:0 18px 16px; display:block; }
.s.adm .side a{ display:flex; align-items:center; gap:9px; padding:9px 18px; font-size:12.5px;
  color:var(--ink2); }
.s.adm .side a.on{ color:var(--gold-800); font-weight:600; background:var(--gold-50);
  box-shadow:inset 2px 0 0 var(--mark); }
.s.adm .main{ flex:1; min-width:0; padding:20px 24px 26px; }
.s.adm .top{ display:flex; align-items:center; gap:12px; margin-bottom:4px; }
.s.adm h1{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; font-size:21px; margin:0;
  letter-spacing:-.01em; }
.s.adm .top .rt{ margin-left:auto; display:flex; gap:9px; align-items:center; }
.s.adm .sim{ display:inline-flex; align-items:center; gap:6px; font-size:10.5px; color:var(--warn);
  background:var(--warn-bg); padding:4px 9px; border-radius:var(--r); font-weight:500; }
.s.adm .panel{ background:#fff; border:1px solid var(--hair); border-radius:var(--r);
  margin-top:16px; }
.s.adm .panel > .hd{ display:flex; align-items:center; gap:10px; padding:13px 16px;
  border-bottom:1px solid var(--hair); }
.s.adm .panel > .hd h2{ font-size:13.5px; margin:0; font-weight:600; }
.s.adm .panel > .hd .rt{ margin-left:auto; display:flex; gap:8px; align-items:center; }
.s.adm .kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:16px; }
.s.adm .kpi{ background:#fff; border:1px solid var(--hair); border-radius:var(--r); padding:14px 15px; }
.s.adm .kpi .lb{ font-size:11px; color:var(--ink2); }
.s.adm .kpi .vl{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; font-size:23px;
  margin-top:5px; letter-spacing:-.02em; }
.s.adm .kpi .ghi{ font-size:10.5px; color:var(--ink2); margin-top:4px; }
/* Bảng thường của khu quản trị (bảng số trong biểu đồ, tồn kho theo size,
   món trong đơn…). `:not(.dtt)` là bắt buộc: bảng của component `.dt` cũng nằm
   trong `.s.adm`, mà `.s.adm th` (0,2,1) thắng `.dt th` (0,1,1) nên nếu không
   loại ra thì nhãn tiêu đề bị cộng dồn hai lớp padding và lệch 14px so với ô
   bên dưới — đã đo, đã dính. */
.s.adm table:not(.dtt){ width:100%; border-collapse:collapse; }
.s.adm table:not(.dtt) th{ text-align:left; font-size:10.5px; font-weight:500;
  color:var(--ink2); padding:9px 16px; border-bottom:1px solid var(--hair);
  white-space:nowrap; }
.s.adm table:not(.dtt) td{ font-size:12px; padding:11px 16px;
  border-bottom:1px solid var(--hair); vertical-align:middle; }
.s.adm table:not(.dtt) td b{ white-space:nowrap; }
.s.adm table:not(.dtt) tr:last-child td{ border-bottom:0; }
.s.adm table:not(.dtt) td.num, .s.adm table:not(.dtt) th.num{ text-align:right;
  font-variant-numeric:tabular-nums; }
.s.adm .pill, .dt .pill{ width:34px; height:42px; border-radius:var(--r-sm); background:var(--plate);
  overflow:hidden; }
.s.adm .pill img, .dt .pill img{ width:100%; height:100%; object-fit:cover; display:block; }
.s.adm .cellrow, .dt .cellrow{ display:flex; align-items:center; gap:10px; }
.s.adm .inp{ height:34px; font-size:12px; }
.s.adm .field{ padding:0; }
.s.adm .fgrid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:16px; }
.s.adm .fgrid .full{ grid-column:1 / -1; }
.s.adm .fgrid label{ display:block; font-size:11px; color:var(--ink2); margin-bottom:5px; }

/* ═════════════════════════════════════════════════════ BẢNG DỮ LIỆU (.dt)

   Bộ mặt cho TanStack Table. TanStack không vẽ gì cả — nó chỉ trả về model
   đã lọc / sắp xếp / phân trang / chọn. Vẽ ra sao là việc của chỗ này.
   Mỗi mảnh dưới đây là phần nhìn thấy được của đúng một model, và mang tên
   theo API sinh ra nó, để lúc dựng thật chỉ việc tra:

     .bar .find        globalFilter
     .bar .facet       columnFilters  +  getFacetedUniqueValues
     .bar .colsbtn     columnVisibility
     .bar.bulk         getSelectedRowModel()
     th .sortb         sorting  +  getSortedRowModel
     .ck               rowSelection  (getToggleAllRowsSelectedHandler)
     .expb             expanded  +  getExpandedRowModel
     th .grip          columnSizing
     .pin              columnPinning
     .foot .pager      pagination  +  getPaginationRowModel

   Thứ TanStack KHÔNG lo, phải tự làm: ba trạng thái rỗng (chưa có gì · lọc
   không ra · lỗi) — ba câu khác nhau, đừng gộp làm một.

   Mọi thứ nằm gọn trong .dt, không dính vào .s.adm, nên đặt ở trang nào
   cũng chạy. */
.dt{ background:#fff; border:1px solid var(--hair); border-radius:var(--r);
  margin-top:16px; }

/* ── thanh công cụ ─────────────────────────────────────────────────────── */
.dt .bar{ display:flex; align-items:center; gap:8px; padding:11px 12px;
  border-bottom:1px solid var(--hair); min-height:58px; flex-wrap:wrap; }
.dt .bar[hidden]{ display:none; }
.dt .find{ position:relative; display:flex; align-items:center; }
.dt .find > svg{ position:absolute; left:10px; width:15px; height:15px;
  color:var(--ink2); pointer-events:none; }
.dt .find input{ height:34px; width:232px; padding:0 12px 0 32px; font:inherit;
  font-size:12px; color:var(--ink); background:#fff; border:1px solid var(--line);
  border-radius:var(--r); -webkit-appearance:none; appearance:none; }
.dt .find input::placeholder{ color:#7A6F5A; }
.dt .find input:focus{ border-color:var(--fill); }

/* ── Căn chữ theo NÉT, không theo hộp font ──────────────────────────────────
   Hộp dòng của font này có phần trên cao hơn phần dưới (nó chừa chỗ cho dấu
   tiếng Việt xếp tầng). Nên căn giữa hộp dòng KHÔNG phải là căn giữa chữ: đo
   được nhãn trong nút thả xuống nằm 10,8px dưới mép trên nhưng 12,3px trên mép
   dưới — cao hơn tâm 0,75px, đủ để mắt thấy gợn.

   `text-box` cắt hộp dòng về đúng dải chữ hoa → chân chữ, nên `align-items:
   center` căn đúng cái mắt nhìn. Đo lại sau khi áp: 11,54 / 11,56.

   Cố ý cắt tới `alphabetic` chứ không tới đáy nét: nếu tính cả phần đuôi chữ
   (dấu nặng, chữ g) thì nhãn có đuôi sẽ nhảy so với nhãn không có đuôi.
   Chrome 133+; trình duyệt chưa hỗ trợ thì bỏ qua luật này và giữ như cũ. */
.dt .facet .t, .dt .find input,
.dt th .sortb > span, .dt th .lb{ text-box: trim-both cap alphabetic; }

/* Nút thả xuống — kiểu C, chốt 20/09/2026.

   Mảng vàng nhạt, viền cùng họ vàng nhưng ở bậc `gold-600`: 3,08:1 trên nền
   trắng, tức vẫn là một ranh giới nhìn thấy được chứ không chỉ là mảng màu.
   Bốn trạng thái đi lên dần theo độ đậm của mảng — rảnh, di chuột, đang mở,
   đang lọc — nên không trạng thái nào phải dựa vào riêng màu để phân biệt. */
.dt .facet{ display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 11px;
  font:inherit; font-size:12px; color:var(--ink2); background:var(--gold-100);
  border:1px solid var(--gold-600); border-radius:var(--r); cursor:pointer;
  white-space:nowrap; }
.dt .facet svg{ width:14px; height:14px; font-size:14px; flex:none;
  transition:transform .16s cubic-bezier(.16,1,.3,1); }
/* Mũi tên quay xuống khi thực đơn đang mở. Icon của nút "Cột" nằm TRƯỚC nhãn và
   không phải mũi tên, nên nó đứng yên. */
.dt .facet:not(.colsbtn)[aria-expanded="true"] svg{ transform:rotate(180deg); }
@media (prefers-reduced-motion:reduce){ .dt .facet svg{ transition:none; } }
/* Đang mở thực đơn phải trông ít nhất bằng lúc di chuột — nếu không, rời
   chuột ra là chip trông như đang rảnh dù thực đơn vẫn bày ra. */
.dt .facet:hover, .dt .facet[aria-expanded="true"]{ background:var(--gold-200); }
/* Lọc đang bật đổi bốn thứ cùng lúc: nền đậm thêm, viền đậm thêm, chữ đậm
   thêm, và mọc ra con số đếm. Không dựa vào riêng màu để nói "đang bật". */
.dt .facet.on{ background:var(--gold-200); border-color:var(--gold-700);
  color:var(--ink); font-weight:600; }
.dt .facet.on:hover, .dt .facet.on[aria-expanded="true"]{ background:var(--gold-300); }
.dt .facet .n[hidden]{ display:none; }
/* Huy hiệu số đếm dùng MỰC chứ không dùng mật ong: đặt mật ong lên chính nền
   vàng của nút thì nó tan vào nền. */
.dt .facet .n{ display:inline-flex; align-items:center; justify-content:center;
  min-width:18px; height:18px; padding:0 5px; border-radius:var(--r-sm);
  background:var(--ink); color:var(--gold-100); font-size:10.5px; font-weight:600;
  font-variant-numeric:tabular-nums; }
.dt .clearf{ font:inherit; font-size:11.5px; color:var(--link); background:none;
  border:0; padding:6px 4px; cursor:pointer; text-decoration:underline;
  text-underline-offset:2px; white-space:nowrap; }
/* Đẩy phần còn lại sang phải. KHÔNG dùng lại tên này cho việc khác:
   `querySelector('.bar .spacer')` phải chỉ trúng đúng một thứ. */
.dt .spacer{ margin-left:auto; }
.dt .fwrap{ position:relative; display:inline-flex; }
.dt .menu .dem{ margin-left:auto; color:var(--ink2); font-size:11px;
  font-variant-numeric:tabular-nums; }
.dt .foot .rt{ margin-left:auto; display:flex; align-items:center; gap:14px; }


/* ── thanh thao tác hàng loạt ──────────────────────────────────────────────
   Chọn dòng thì thanh công cụ ĐỔI VAI ngay tại chỗ chứ không mọc thêm một
   thanh nổi: bảng không nhảy, và mắt không phải đi tìm chỗ mới. Đây là
   khoảnh khắc chuyển động duy nhất của bảng. */
.dt .bar.bulk{ background:var(--gold-100); border-bottom-color:var(--gold-200);
  animation:dtbulk .24s cubic-bezier(.16,1,.3,1); }
@keyframes dtbulk{ from{ opacity:0; transform:translateY(-4px) }
                   to{ opacity:1; transform:none } }
.dt .bar.bulk .cnt{ font-size:12.5px; font-weight:600; color:var(--ink);
  font-variant-numeric:tabular-nums; }

/* ── bảng ──────────────────────────────────────────────────────────────── */
.dt .scroll{ overflow-x:auto; }
.dt table{ width:100%; border-collapse:separate; border-spacing:0; }
.dt th{ position:sticky; top:0; z-index:2; background:#fff; text-align:left;
  padding:0; height:38px; white-space:nowrap; border-bottom:1px solid var(--hair); }
.dt td{ padding:11px 14px; font-size:12px; color:var(--ink); background:#fff;
  vertical-align:middle; border-bottom:1px solid var(--hair); }
.dt tbody tr:last-child td{ border-bottom:0; }
.dt th.num, .dt td.num{ text-align:right; }
.dt td.num, .dt .tnum{ font-variant-numeric:tabular-nums; }
.dt td .note{ font-size:10.5px; color:var(--ink2); }
.dt tbody tr:hover td{ background:var(--gold-50); }
.dt tbody tr.on td{ background:var(--gold-100); }
.dt tbody tr.on:hover td{ background:var(--gold-200); }
.dt tbody tr[hidden]{ display:none; }
.dt tbody tr.norow td{ padding:0; border-bottom:0; }
.dt tbody tr.norow:hover td{ background:#fff; }

.dt th .lb{ display:flex; align-items:center; height:100%; padding:0 14px;
  font-size:10.5px; font-weight:500; color:var(--ink2); }
.dt th.num .lb{ justify-content:flex-end; }
.dt th .sortb{ display:flex; align-items:center; gap:5px; width:100%; height:100%;
  padding:0 14px; font:inherit; font-size:10.5px; font-weight:500; color:var(--ink2);
  background:none; border:0; cursor:pointer; }
.dt th.num .sortb{ justify-content:flex-end; }
.dt th .sortb:hover{ color:var(--ink); background:var(--gold-50); }
/* Chỗ của mũi tên luôn được giữ sẵn, nên bấm sắp xếp không làm cột nhảy sang
   trái phải một nhịp. */
.dt th .ar{ width:12px; height:12px; flex:none; color:var(--line); opacity:0;
  transition:opacity .12s ease, transform .18s cubic-bezier(.16,1,.3,1); }
.dt th .sortb:hover .ar{ opacity:.85; }
.dt th.srt .sortb{ color:var(--ink); font-weight:600; }
.dt th.srt .ar{ opacity:1; color:var(--mark); }
.dt th.srt.asc .ar{ transform:rotate(180deg); }
.dt th .grip{ position:absolute; right:0; top:9px; bottom:9px; width:5px;
  border-radius:3px; cursor:col-resize; }
.dt th .grip:hover{ background:var(--fill); }

/* ô đánh dấu — cả hàng đầu (chọn tất cả, có trạng thái nửa vời) lẫn từng dòng */
.dt .selc{ width:42px; padding-right:0; }
.dt th.selc .lb{ padding-right:0; }
.dt .ck{ position:relative; width:16px; height:16px; flex:none; padding:0;
  display:inline-flex; align-items:center; justify-content:center; cursor:pointer;
  background:#fff; border:1px solid var(--line); border-radius:var(--r-sm); }
.dt .ck::after{ content:""; position:absolute; inset:-14px; }
/* Ô vẽ đã cắt sát nét (xem `tick()`), nên đây là cỡ THẬT của dấu tích:
   11 × 7,3px trong ô 16px — lấp 69% thay vì 24% như trước. */
.dt .ck svg{ width:11px; height:7.3px; color:var(--fill-ink); opacity:0; }
.dt .ck[aria-checked="true"], .dt .ck[aria-checked="mixed"]{
  background:var(--fill); border-color:var(--fill); }
.dt .ck[aria-checked="true"] svg{ opacity:1; }
.dt .ck[aria-checked="mixed"]::before{ content:""; position:absolute; left:3px; right:3px;
  height:2px; border-radius:1px; background:var(--fill-ink); }

/* mở rộng dòng — dùng đúng một chỗ, ở bảng đơn, để xem món trong đơn mà
   không phải rời danh sách */
.dt .expc{ width:34px; padding-left:10px; padding-right:0; }
.dt .expb{ position:relative; width:24px; height:24px; padding:0; display:flex;
  align-items:center; justify-content:center; background:none; border:0;
  border-radius:var(--r-sm); color:var(--ink2); cursor:pointer; }
.dt .expb::after{ content:""; position:absolute; inset:-10px; }
.dt .expb:hover{ background:var(--gold-100); color:var(--ink); }
.dt .expb svg{ width:14px; height:14px;
  transition:transform .18s cubic-bezier(.16,1,.3,1); }
.dt tr.open .expb svg{ transform:rotate(90deg); }
.dt tr.dtsub td{ background:var(--gold-50); padding:0 14px 14px 48px; }
.dt tr.dtsub .inner{ background:#fff; border:1px solid var(--hair); border-radius:var(--r);
  padding:11px 13px; }
.dt tr.dtsub .il{ display:flex; align-items:center; gap:10px; font-size:11.5px;
  padding:5px 0; }
.dt tr.dtsub .il + .il{ border-top:1px solid var(--hair); }
.dt tr.dtsub .il .g{ flex:1; }
.dt tr.dtsub .il .a{ font-variant-numeric:tabular-nums; font-weight:500; }

/* thao tác trên từng dòng */
.dt .actc{ width:1%; white-space:nowrap; text-align:right; }
.dt .actc .wrap{ display:inline-flex; align-items:center; gap:2px;
  justify-content:flex-end; }
.dt .more{ position:relative; width:26px; height:26px; padding:0; display:inline-flex;
  align-items:center; justify-content:center; background:none; border:0;
  border-radius:var(--r-sm); color:var(--ink2); cursor:pointer; }
.dt .more::after{ content:""; position:absolute; inset:-9px; }
.dt .more:hover{ background:var(--gold-100); color:var(--ink); }
.dt .more svg{ width:16px; height:16px; }

/* cột ghim: bảng đơn rộng hơn cửa sổ hẹp, ghim cột đầu để cuộn ngang vẫn
   biết đang đọc dòng nào. Bóng chỉ hiện khi đã cuộn, không vẽ sẵn. */
.dt .pin{ position:sticky; left:0; z-index:1; }
.dt th.pin{ z-index:3; }
.dt.slid .pin::after{ content:""; position:absolute; top:0; bottom:-1px; right:-15px;
  width:15px; pointer-events:none;
  background:linear-gradient(90deg, rgba(33,29,18,.10), rgba(33,29,18,0)); }

/* thực đơn thả xuống — dùng cho chọn cột và cho thao tác dòng */
/* `fixed`, không phải `absolute`.

   Thực đơn của một dòng nằm trong `.scroll`, mà `.scroll` có `overflow-x:auto`
   — theo chuẩn CSS, một trục khác `visible` thì trục kia tự thành `auto`. Nên
   nó cắt cả CHIỀU DỌC dù mình không hề đặt, và thực đơn của dòng cuối bảng bị
   nuốt sạch. `fixed` thoát khỏi mọi vùng cắt của tổ tiên.

   Toạ độ do app.js tính lúc mở, kèm lật trái/lên khi chạm mép khung. Đổi lại:
   cuộn thì thực đơn không đi theo nút, nên cuộn là đóng. */
.dt .menu, .s .selm{ position:fixed; z-index:65; min-width:196px; padding:5px; background:#fff;
  border:1px solid var(--hair); border-radius:var(--r);
  box-shadow:0 12px 28px rgba(33,29,18,.15), 0 2px 6px rgba(33,29,18,.07); }
.dt .menu[hidden], .s .selm[hidden]{ display:none; }
.dt .menu h5, .s .selm h5{ margin:0; padding:7px 9px 5px; font-size:10px; font-weight:600;
  letter-spacing:.06em; text-transform:uppercase; color:var(--ink2); }
.dt .menu button, .s .selm button{ display:flex; align-items:center; gap:9px; width:100%; padding:7px 9px;
  font:inherit; font-size:12px; color:var(--ink); background:none; border:0;
  border-radius:var(--r-sm); cursor:pointer; text-align:left; }
.dt .menu button:hover, .s .selm button:hover{ background:var(--gold-50); }
.dt .menu button > svg, .s .selm button > svg{ width:14px; height:14px; flex:none; color:var(--mark); }
/* Thực đơn có mục đánh dấu (lọc theo mặt, chọn cột, số dòng mỗi trang) dùng
   cột icon 20px: dấu tích của Iconsax chỉ chiếm 8,5/24 bề ngang ô vẽ, nên ở
   14px nó bé như hạt gạo. Cả cột cùng 20px để nhãn vẫn thẳng hàng. */
/* Cột dấu tích rộng 20px để nhãn thẳng hàng, nhưng NÉT tích chỉ vẽ
   10 × 6,7px bên trong (ô vẽ đã cắt sát nét — xem `tick()`, và SVG tự canh
   giữa phần thừa). Hai con số này là cỡ THẬT, nét dày 1,76px: đọc rõ cạnh
   chữ 12px mà không đè lên nó. Đặt 20×20 thì nét thành 3,5px — đậm hơn cả
   chữ bên cạnh. */
.dt .menu.dau button > svg, .s .selm button > svg{ width:20px; height:6.7px; }
.dt .menu button[aria-checked="false"] > svg, .s .selm button[aria-checked="false"] > svg{ visibility:hidden; }
.dt .menu button.bad{ color:var(--hot); }
.dt .menu button.bad > svg{ color:var(--hot); visibility:visible; }
.dt .menu hr, .s .selm hr{ margin:5px 0; border:0; border-top:1px solid var(--hair); }

/* ── chân bảng ─────────────────────────────────────────────────────────── */
.dt .foot{ display:flex; align-items:center; gap:14px; flex-wrap:wrap;
  min-height:50px; padding:10px 14px; border-top:1px solid var(--hair);
  font-size:11.5px; color:var(--ink2); }
.dt .foot .tnum{ color:var(--ink); font-weight:500; }
/* Số dòng mỗi trang trước đây là `<select>` của trình duyệt — lạc lõng giữa
   các nút thả xuống khác. Nay là ĐÚNG component `.facet` + `.menu`, chỉ hạ
   xuống 30px cho khớp thang của chân bảng. */
.dt .foot .perlb{ display:inline-flex; align-items:center; gap:7px; }
.dt .foot .facet{ height:30px; font-size:11.5px; padding:0 9px; }
.dt .foot .facet .t{ font-variant-numeric:tabular-nums; }
.dt .foot .menu{ min-width:132px; }
.dt .pager{ display:flex; gap:3px; }
/* `gold-600` là màu ranh giới duy nhất của component này — nút thả xuống và
   nút chuyển trang cùng dùng một mã. */
.dt .pager button{ width:30px; height:30px; padding:0; display:flex; align-items:center;
  justify-content:center; background:#fff; border:1px solid var(--gold-600);
  border-radius:var(--r-sm); color:var(--ink); cursor:pointer; }
.dt .pager button:hover:not(:disabled){ background:var(--gold-50); }
.dt .pager button:disabled{ color:var(--line); border-color:var(--hair);
  cursor:not-allowed; }
.dt .pager svg{ width:14px; height:14px; }
.dt .pager .prev svg{ transform:rotate(180deg); }

/* ── ba trạng thái rỗng và một trạng thái đang tải ─────────────────────── */
.dt .blank{ padding:48px 24px; text-align:center; }
.dt .blank .ring{ width:46px; height:46px; margin:0 auto 13px; border-radius:99px;
  background:var(--gold-100); display:flex; align-items:center; justify-content:center; }
.dt .blank .ring svg{ width:22px; height:22px; color:var(--link); fill:currentColor; }
.dt .blank.bad .ring{ background:var(--hot-bg); }
.dt .blank.bad .ring svg{ color:var(--hot); }
.dt .blank h4{ margin:0 0 6px; font-size:13.5px; font-weight:600; color:var(--ink); }
.dt .blank p{ margin:0 auto 15px; max-width:44ch; font-size:12px; color:var(--ink2);
  line-height:1.62; text-wrap:pretty; }
.dt .blank .go{ display:inline-flex; gap:8px; justify-content:center; }
.dt .skel td{ padding-top:14px; padding-bottom:14px; }
.dt .skel i{ display:block; height:10px; border-radius:3px; background:var(--hair);
  animation:dtpulse 1.6s ease-in-out infinite; }
.dt .skel tr:nth-child(2) i{ animation-delay:.12s; }
.dt .skel tr:nth-child(3) i{ animation-delay:.24s; }
.dt .skel tr:nth-child(4) i{ animation-delay:.36s; }
@keyframes dtpulse{ 0%,100%{ opacity:1 } 50%{ opacity:.4 } }
@media (prefers-reduced-motion:reduce){
  .dt .bar.bulk, .dt .skel i{ animation:none; }
  .dt th .ar, .dt .expb svg{ transition:none; }
}

/* thanh cuộn ngang của bảng — không nhận thì nó mang mặc định của hệ điều hành */
.dt .scroll::-webkit-scrollbar{ height:9px; }
.dt .scroll::-webkit-scrollbar-track{ background:var(--gold-50); }
.dt .scroll::-webkit-scrollbar-thumb{ background:var(--gold-300); border-radius:99px;
  border:2px solid var(--gold-50); }
.dt .scroll::-webkit-scrollbar-thumb:hover{ background:var(--fill); }

/* ------------------------------------------------------------------ biểu đồ */
.s .chart{ padding:16px; }
.s .chart .heroN{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; font-size:28px;
  letter-spacing:-.02em; }
.s .chart .heroL{ font-size:11px; color:var(--ink2); margin-top:2px; }
.s .plot{ display:flex; align-items:flex-end; gap:6px; height:132px; margin-top:16px;
  border-bottom:1px solid var(--hair); }
.s .plot .b{ flex:1; background:var(--mark); border-radius:4px 4px 0 0; position:relative; }
.s .plot .b.peak{ background:var(--link); }
.s .plot .b .lbl{ position:absolute; top:-17px; left:50%; transform:translateX(-50%);
  font-size:10px; color:var(--ink); font-weight:600; white-space:nowrap; }
.s .xax{ display:flex; gap:6px; margin-top:6px; }
.s .xax span{ flex:1; font-size:9.5px; color:var(--ink2); text-align:center; }
.s details{ margin-top:14px; font-size:11.5px; }
.s details summary{ color:var(--link); cursor:pointer; font-weight:500; }
"""


# --------------------------------------------------------------- dữ liệu chung
U = "https://images.unsplash.com/photo-{}?auto=format&fit=crop&w={}&q={}"
IMG = {
    "hero":  "1593278641722-49b1047ede21",
    # ── ảnh mượn tạm từ Unsplash, PRODUCT.md ghi rõ chưa có thư viện ảnh thật ──
    "khoi":  "1503341338985-c0477be52513",
    "bui":   "1620799140188-3b2a02fd9a77",
    "nguoi": "1680292783974-a9a336c10366",
    "nang":  "1503341504253-dff4815485f1",
    "suong": "1564557287817-3785e38ec1f5",
    "muoi":  "1601063476271-a159c71ab0b3",
    "than":  "1508216310976-c518daae0cdc",
    "cat":   "1578768079052-aa76e52ff62e",
    "gio":   "1615397587950-3cbb55f95b77",
    "da":    "1542406775-ade58c52d2e4",
    "reu":   "1611817757591-c3f345024273",
    "tro":   "1614214191247-5b2d3a734f1b",
    "song":  "1688111421205-a0a85415b224",
    "vo":    "1565978771542-0db9ab9ad3de",
    "mua":   "1633292750937-120a94f5c2bb",
    "kho":   "1542327534-59a1fe8daf73",
    "dat":   "1632682582909-2b3a2581eef7",
    "lua":   "1561151593-7059b6b4ff57",
}

def im(key, w, q=70):
    return U.format(IMG[key], w, q)


# ─────────────────────────────────────────────────────────── vốn màu của vải
MAU = {
    "den":   ("Đen", "#1C1C1C"),   "kem":  ("Kem", "#E6DFD1"),
    "xam":   ("Xám", "#8C8C8C"),   "reu":  ("Rêu", "#4A5240"),
    "nau":   ("Nâu", "#5C4536"),   "trang": ("Trắng", "#F2F1ED"),
    "than":  ("Xanh than", "#2B3A52"),
}


def sp(key, ten, loai, chat, form, gia, mau, con, cat, dot):
    """Một mẫu. `con` là số còn theo từng size — tồn kho theo size là thật và
    hay hết, PRODUCT.md xếp đó vào nhóm trạng thái thường ngày."""
    return dict(key=key, ten=ten, loai=loai, chat=chat, form=form, gia=gia,
                mau=mau, con=con, cat=cat, dot=dot,
                conTong=sum(con.values()), ban=cat - sum(con.values()))


# Đợt 05 — đang mở. Mười mẫu.
CATALOG = [
    sp("khoi", "KHÓI", "Áo thun oversize", "Cotton 250gsm", "Oversize", 390000,
       ["den", "kem"], {"S": 5, "M": 6, "L": 4, "XL": 2}, 35, 5),
    sp("bui", "BỤI", "Áo hoodie", "Nỉ bông 380gsm", "Oversize", 890000,
       ["den", "xam"], {"S": 0, "M": 0, "L": 1, "XL": 1}, 18, 5),
    sp("nguoi", "NGUỘI", "Áo hoodie in", "Nỉ bông 380gsm", "Oversize", 1290000,
       ["den"], {"S": 1, "M": 2, "L": 1, "XL": 1}, 12, 5),
    sp("nang", "NẮNG", "Áo thun", "Cotton 220gsm", "Regular", 450000,
       ["trang", "kem", "reu"], {"S": 3, "M": 4, "L": 3, "XL": 2}, 26, 5),
    sp("suong", "SƯƠNG", "Áo khoác dù", "Dù chống nước 2 lớp", "Oversize", 1450000,
       ["den", "reu"], {"S": 0, "M": 1, "L": 1, "XL": 1}, 8, 5),
    sp("muoi", "MUỐI", "Quần jogger", "Nỉ da cá 320gsm", "Regular", 690000,
       ["den", "xam"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 14, 5),
    sp("than", "THAN", "Áo khoác bomber", "Dù chần bông", "Oversize", 1350000,
       ["den", "than"], {"S": 1, "M": 2, "L": 2, "XL": 1}, 10, 5),
    sp("cat", "CÁT", "Áo thun tay lỡ", "Cotton 240gsm", "Oversize", 420000,
       ["kem", "trang", "nau"], {"S": 4, "M": 5, "L": 4, "XL": 2}, 31, 5),
    sp("gio", "GIÓ", "Áo sơ mi dệt", "Kate lụa", "Regular", 750000,
       ["trang", "than"], {"S": 2, "M": 3, "L": 2, "XL": 0}, 15, 5),
    sp("da", "ĐÁ", "Quần cargo", "Kaki 320gsm", "Regular", 980000,
       ["reu", "den"], {"S": 1, "M": 2, "L": 2, "XL": 1}, 12, 5),

    # Đợt 04 — đã đóng, bán hết
    sp("reu", "RÊU", "Áo khoác phao", "Dù chần lông vũ", "Oversize", 1500000,
       ["reu"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 30, 4),
    sp("tro", "TRO", "Áo hoodie zip", "Nỉ bông 400gsm", "Oversize", 950000,
       ["xam", "den"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 40, 4),
    sp("song", "SÓNG", "Áo thun in lưng", "Cotton 250gsm", "Oversize", 430000,
       ["trang"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 50, 4),
    sp("vo", "VỎ", "Áo gile", "Dù 2 lớp", "Regular", 820000,
       ["den", "kem"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 25, 4),
    sp("mua", "MƯA", "Áo khoác dù dài", "Dù chống nước", "Oversize", 1420000,
       ["den"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 20, 4),
    sp("kho", "KHÔ", "Quần short", "Kaki 280gsm", "Regular", 520000,
       ["kem", "reu"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 35, 4),

    # Đợt 03 — đã đóng
    sp("dat", "ĐẤT", "Quần jogger nỉ", "Nỉ da cá 320gsm", "Regular", 680000,
       ["nau", "den"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 45, 3),
    sp("lua", "LỬA", "Áo thun tay dài", "Cotton 240gsm", "Regular", 480000,
       ["den", "trang"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 55, 3),
    sp("bui", "BÃO", "Áo hoodie cổ lọ", "Nỉ bông 380gsm", "Oversize", 910000,
       ["xam"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 38, 3),
    sp("nang", "MEN", "Áo thun nhuộm", "Cotton 250gsm", "Oversize", 460000,
       ["kem"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 42, 3),
    sp("suong", "VÔI", "Áo khoác gió", "Dù 1 lớp", "Regular", 790000,
       ["trang", "xam"], {"S": 0, "M": 0, "L": 0, "XL": 0}, 28, 3),
]

SIZES = ("S", "M", "L", "XL")


def doanh_thu(n=5):
    """Doanh thu một đợt — cộng từ giá nhân số đã bán, không gõ tay chỗ nào."""
    return sum(x["gia"] * x["ban"] for x in CATALOG if x["dot"] == n)
DOT_NAY = 5


def dot(n=DOT_NAY):
    """Số liệu của một đợt, TÍNH TỪ danh mục — đừng gõ tay chỗ nào nữa."""
    ds = [x for x in CATALOG if x["dot"] == n]
    return dict(mau=len(ds), cat=sum(x["cat"] for x in ds),
                ban=sum(x["ban"] for x in ds), con=sum(x["conTong"] for x in ds))


SO_CHU = {1: "một", 2: "hai", 3: "ba", 4: "bốn", 5: "năm", 6: "sáu",
          7: "bảy", 8: "tám", 9: "chín", 10: "mười", 11: "mười một", 12: "mười hai"}


def so_mau(n=None):
    """"mười mẫu" — viết chữ vì nó nằm trong câu văn, không phải trong bảng."""
    n = dot()["mau"] if n is None else n
    return "%s mẫu" % SO_CHU.get(n, str(n))


def tien(n):
    return "{:,}".format(n).replace(",", ".") + "₫"


def dong_ton(x):
    """Dòng tồn kho dạng chữ của thẻ hiện tại: còn bao nhiêu, size nào hết."""
    if not x["conTong"]:
        return "hết hàng"
    sz = " ".join(('<span class="gone">%s</span>' % z) if not x["con"][z] else z
                  for z in SIZES)
    so = ('<span class="low">còn %d</span>' if x["conTong"] <= 3 else "còn %d") % x["conTong"]
    return "%s · %s" % (so, sz)


PRODUCTS = [x for x in CATALOG if x["dot"] == DOT_NAY]
SO_BO_ANH = sum(len(x["mau"]) for x in PRODUCTS)   # số bộ ảnh phải chụp thật


def anh_mau(x):
    """Trả về [(khoá ảnh, khoá màu)] — mỗi màu một tấm trong băng ảnh.

    Ảnh thật chưa có: mỗi màu đáng lẽ phải có bộ ảnh riêng, nhưng kho ảnh mượn
    chỉ có 18 tấm cho 21 lượt của đợt này. Nên tấm đầu luôn là ảnh của chính
    mẫu đó, các màu sau mượn từ những tấm chưa ai dùng, hết thì quay vòng.
    Ba tấm vì thế xuất hiện hai lần trong lưới mười mẫu — đó là dấu vết của
    ảnh tạm, không phải của thiết kế. Có ảnh thật thì bảng này biến mất.
    """
    return _ANHMAU[x["key"]]


def _chia_anh():
    rieng = [p["key"] for p in PRODUCTS]
    ranh = [k for k in IMG if k != "hero" and k not in rieng]
    out, i = {}, 0
    for p in PRODUCTS:
        cap = [(p["key"], p["mau"][0])]
        for m in p["mau"][1:]:
            cap.append((ranh[i % len(ranh)], m))
            i += 1
        out[p["key"]] = cap
    return out


_ANHMAU = _chia_anh()

CUST = dict(
    ten="Trần Minh Anh", mail="minhanh@email.com", sdt="0912 345 678",
    dc="24 Nguyễn Thị Minh Khai", pxq="Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
)


# ------------------------------------------------------------------ mảnh dựng
def icon(name, cls="ic", duo=False):
    """Bọc path Iconsax trong vỏ SVG của hệ.

    duo=True lấy biến thể Bulk (duotone) — dành riêng cho trạng thái đang bật,
    đang chọn, hoặc một khoảnh khắc đáng dừng lại (trạng thái rỗng, đơn đã nhận).

    Mỗi SVG mang theo hai biến `--il` / `--ir`: phần trống trong suốt bên trái
    và bên phải hình, tính theo tỉ lệ của ô 24×24. Chỗ nào icon đứng cạnh chữ
    thì CSS lấy hai biến đó cắt phần trống khỏi hộp bố trí, để `gap` là khoảng
    cách THẤY ĐƯỢC. Chỗ icon đứng một mình thì lờ chúng đi — ở đó hộp vuông
    chính là vùng chạm. Xem `INK` trong icons_iconsax.py.
    """
    table = ICONSAX_DUO if duo else ICONSAX
    klass = (cls + " duo").strip() if duo else cls
    x, w = (INK_DUO if duo else INK).get(name, INK_MAC)
    return ('<svg class="%s" viewBox="0 0 24 24" fill="none" aria-hidden="true"'
            ' style="--il:%.4f;--ir:%.4f">%s</svg>'
            % (klass, x / 24.0, (24.0 - x - w) / 24.0, table[name]))


def nav(active="", cart=2):
    links = "".join(
        '<a href="#" class="%s">%s</a>' % ("on" if t == active else "", t)
        for t in ("Áo", "Khoác", "Quần")
    )
    # giỏ có món thì túi đặc lại — trạng thái, không phải trang trí
    bag = icon("bag", duo=bool(cart))
    dot = '<b>%d</b>' % cart if cart else ""
    return (
        '<div class="nav"><span class="wm">BRAND</span>%s%s'
        '<span class="cartdot">%s%s</span></div>'
        % (links, icon("search"), bag, dot)
    )


def navw(active="Đợt 05", cart=2):
    links = "".join(
        '<a href="#" class="%s">%s</a>' % ("on" if t == active else "", t)
        for t in ("Đợt 05", "Áo", "Khoác", "Quần", "Phụ kiện")
    )
    return (
        '<div class="nav"><span class="wm">BRAND</span>%s'
        '<span style="margin-left:auto"></span>%s%s'
        '<span class="cartdot">%s%s</span></div>'
        % (links, icon("search"), icon("user"), icon("bag", duo=bool(cart)),
           '<b>%d</b>' % cart if cart else "")
    )


def sub(title, right="", plain=False):
    cls = "rt plain" if plain else "rt"
    r = '<span class="%s">%s</span>' % (cls, right) if right else ""
    return '<div class="sub">%s<h1>%s</h1>%s</div>' % (icon("back"), title, r)


def band(cd="đóng sau 5 giờ 42 phút"):
    return ('<div class="band"><b>Đợt 05</b><span class="sep">/</span>'
            '<span>%s</span><span class="cd">%s</span></div>' % (so_mau(), cd))


def _mot(x):
    """Bản ghi của một mẫu, nhận cả khoá lẫn chính bản ghi."""
    if isinstance(x, dict):
        return x
    return next(p for p in CATALOG if p["key"] == x)


def bang_anh(x, w=520, sold=False):
    """Băng ảnh ngang, một tấm mỗi màu.

    Hết sạch thì không còn màu nào để chọn — rút về một tấm tĩnh, phủ mờ."""
    o = '<span class="sold">HẾT HÀNG</span>' if sold else ""
    cap = anh_mau(x)
    if sold or len(cap) == 1:
        return ('<div class="wrap"><div class="ph"><img src="%s" alt="%s — màu %s" />'
                '</div>%s</div>' % (im(x["key"], w), x["ten"], MAU[x["mau"][0]][0], o))
    sl = "".join('<div class="sl"><img src="%s" alt="%s — màu %s" /></div>'
                 % (im(k, w), x["ten"], MAU[m][0]) for k, m in cap)
    cham = "".join('<i class="%s" style="background:%s"></i>'
                   % ("on" if i == 0 else "", MAU[m][1])
                   for i, (k, m) in enumerate(cap))
    return ('<div class="wrap"><div class="slide" tabindex="0" role="group" '
            'aria-label="%s — %d màu, vuốt ngang để xem">%s</div>'
            '<div class="cham" aria-hidden="true">%s</div></div>'
            % (x["ten"], len(cap), sl, cham))


def het_size(x):
    """Những size đã hết của một mẫu."""
    return [z for z in SIZES if not x["con"][z]]


def card(x, w=520, sold=None, flag=""):
    """Thẻ sản phẩm: băng ảnh vuốt theo màu, tên, giá, một nút.

    Size và màu không nằm trên thẻ — chúng nằm trong tấm trượt mà nút mở ra.
    Hai ngoại lệ, vì PRODUCT.md dòng 86 xếp khan hiếm vào nhóm NỘI DUNG:
    số còn lại khi đã ≤3 chiếc, và một dòng liệt kê size đã hết.
    """
    x = _mot(x)
    het = sold if sold is not None else not x["conTong"]
    f = '<span class="flag">%s</span>' % flag if flag else ""

    con = ('<span class="con it">còn %d</span>' % x["conTong"]
           if not het and 0 < x["conTong"] <= 3 else "")
    thieu = ""
    if not het and het_size(x):
        thieu = ('<div class="thieu">hết %s</div>'
                 % " ".join("<s>%s</s>" % z for z in het_size(x)))
    act = ("" if het else
           '<div class="act"><button type="button" class="qbtn" data-key="%s">'
           '%sThêm vào giỏ</button></div>' % (x["key"], icon("bag", "ic sm")))

    return ('<div class="card vuot" data-key="%s">%s%s<h3 class="nm">%s</h3>'
            '<div class="gia2"><div class="p">%s</div>%s</div>%s%s</div>'
            % (x["key"], bang_anh(x, w, het), f, x["ten"], tien(x["gia"]),
               con, thieu, act))


def sheet_size(x, mau=0, size=None):
    """Tấm trượt chọn size — cái mà nút trên thẻ mở ra.

    Đây là chỗ duy nhất đủ rộng để nói số còn lại của TỪNG size, và cũng là
    chỗ duy nhất nhắc lại màu người mua vừa vuốt tới trên thẻ.
    """
    x = _mot(x)
    swa = "".join(
        '<button type="button" aria-pressed="%s" aria-label="Màu %s">'
        '<i style="background:%s"></i></button>'
        % ("true" if i == mau else "false", MAU[m][0], MAU[m][1])
        for i, (k, m) in enumerate(anh_mau(x)))
    sz = "".join(
        '<div class="sz%s"><b>%s</b><i>%s</i></div>'
        % ((" gone" if not x["con"][z] else
            (" low" if x["con"][z] <= 2 else "")) + (" on" if z == size else ""),
           z, ("còn %d" % x["con"][z]) if x["con"][z] else "hết")
        for z in SIZES)
    thieu = ('<div class="thieu">Đã hết %s trong đợt này. Không may thêm.</div>'
             % " ".join("<s>%s</s>" % z for z in het_size(x))) if het_size(x) else ""
    return ('<div class="sheet chonsize"><div class="grab"></div>'
            '<div class="dau"><img src="%s" alt="" />'
            '<div><h2 class="nm">%s</h2><div class="k">%s · %s</div>'
            '<div class="p">%s</div></div></div>'
            '<div class="nhan">Màu <b>%s</b></div><div class="swa">%s</div>'
            '<div class="nhan">Size</div><div class="szrow">%s</div>%s'
            '<div class="nut">%s</div></div>'
            % (im(anh_mau(x)[mau][0], 260), x["ten"], x["loai"], x["form"],
               tien(x["gia"]), MAU[x["mau"][mau]][0], swa, sz, thieu,
               btn("Thêm vào giỏ", "them", "bag")))


def cartline(key, name, desc, price, qty=1, maxq=None, snag=""):
    """Một dòng trong giỏ hàng.

    Giá nằm góc trên bên phải, nút Xoá nằm góc dưới bên phải — cùng một cột,
    hai đầu. Số lượng gõ thẳng được chứ không chỉ bấm tăng giảm từng nấc.

    `snag` thay chỗ ô số lượng bằng lối xử lý khác, dùng cho món vừa hết size:
    món đó chưa mua được nên chỉnh số lượng là vô nghĩa.
    """
    if snag:
        mid, rm = snag, ""
    else:
        mid = ('<span class="qty">'
               '<button type="button" class="qb" data-d="-1" aria-label="Bớt một chiếc"%s>'
               '%s</button>'
               '<input class="qn" type="text" inputmode="numeric" value="%d" '
               'aria-label="Số lượng %s" />'
               '<button type="button" class="qb" data-d="1" aria-label="Thêm một chiếc">'
               '%s</button></span>'
               '<span class="cap" hidden></span>'
               % (" disabled" if qty <= 1 else "", icon("minus", "ic sm"),
                  qty, name, icon("plus", "ic sm")))
        rm = '<button type="button" class="lnk rm">Xoá</button>'
    return ('<div class="row cartline%s"%s>'
            '<span class="thumb"><img src="%s" alt="" /></span>'
            '<span class="grow"><span class="t nm">%s</span><span class="d">%s</span>%s</span>'
            '<span class="side"><span class="amt">%s</span>%s</span></div>'
            % (" snag" if snag else "",
               ' data-max="%d"' % maxq if maxq else "",
               im(key, 150, 60), name, desc, mid, price, rm))


def szrow(wide=False):
    """Hàng chọn size: S đã hết, M đang chọn, L còn nhiều, XL sắp hết."""
    cells = (("S", "gone", "hết"), ("M", "on", "còn 6"),
             ("L", "", "còn 9"), ("XL", "low", "còn 2"))
    inner = "".join('<div class="sz %s"><b>%s</b><i>%s</i></div>' % (c, sz, note)
                    for sz, c, note in cells)
    return '<div class="szrow%s">%s</div>' % (" w" if wide else "", inner)


def btn(label, kind="", ic=None):
    g = icon(ic, "ic sm") if ic else ""
    return '<div class="btn %s">%s%s</div>' % (kind, g, label)


def field(label, value, placeholder=False, kind="", err=""):
    cls = "inp " + ("ph2 " if placeholder else "") + kind
    e = '<div class="err">%s %s</div>' % (icon("x", "ic sm"), err) if err else ""
    return ('<div class="field"><label>%s</label><div class="%s">%s</div>%s</div>'
            % (label, cls.strip(), value, e))


def sumbox(lines, total):
    body = "".join('<div><span>%s</span><span>%s</span></div>' % (a, b) for a, b in lines)
    return ('<div class="sum">%s<div class="tot"><span>Tổng cộng</span><span>%s</span></div></div>'
            % (body, total))


STEP_LABELS = ["Giỏ hàng", "Địa chỉ", "Thanh toán", "Xong"]
def tick(cls=""):
    """Dấu tích CẮT SÁT NÉT — dùng khi nó là một dấu nằm trong một ô.

    Nét tích của Iconsax chỉ chiếm 8,5 × 5,66 trong ô vẽ 24×24 (35% × 24%).
    Để nguyên ô vẽ thì cỡ mình đặt ra không phải cỡ mình nhìn thấy: đo được
    nét 3,9px trong ô tích 16px (lấp 24%), và nét mảnh 0,69px — một sợi tóc.
    Cắt ô vẽ sát nét thì cỡ đặt ra chính là cỡ thấy được, và nét dày lên
    theo đúng tỉ lệ.

    Cả sản phẩm nay chỉ có MỘT kiểu tích này; cỡ đặt theo từng chỗ chứa nó:
    ô tích của bảng 11 × 7,3px, bước đã xong 13 × 8,7px, thực đơn 10 × 6,7px.
    Riêng dấu tích to dùng làm hình minh hoạ (màn "đã gửi liên kết") vẫn là
    `icon("check", duo=True)` — đó là một bức hình, không phải một cái dấu.
    """
    return ('<svg class="%s" viewBox="7.75 9.17 8.5 5.66" fill="none" '
            'aria-hidden="true">%s</svg>' % (cls, ICONSAX["check"]))


TICK = tick()   # nét tích lấy từ TickCircle của Iconsax


def steps(n):
    """Bước đã qua hiện dấu tích, bước đang làm hiện số, bước chưa tới là ô nhạt.
    Bước cuối khi đã tới cũng hiện dấu tích — đứng ở "Xong" nghĩa là xong rồi."""
    out = []
    for i, l in enumerate(STEP_LABELS):
        cls = "done" if i < n else ("now" if i == n else "todo")
        done = i < n or (i == n == len(STEP_LABELS) - 1)
        out.append('<span class="st %s"><span class="n">%s</span><span class="t">%s</span></span>'
                   % (cls, TICK if done else str(i + 1), l))
        if i < len(STEP_LABELS) - 1:
            out.append('<span class="ln%s"></span>' % (" on" if i < n else ""))
    return '<div class="steps">%s</div>' % "".join(out)


def empty(ic, title, text, action):
    return ('<div class="empty"><div class="ring">%s</div><h3>%s</h3><p>%s</p>%s</div>'
            % (icon(ic, "", duo=True), title, text, action))


def badge(text, tone="", dot=True):
    d = "<i></i>" if dot else ""
    return '<span class="badge %s">%s%s</span>' % (tone, d, text)


# ═══════════════════════════════════ khung khu quản trị
SIDE = [("chart", "Tổng quan"), ("calendar", "Đợt bán"), ("box", "Sản phẩm"),
        ("bag", "Đơn hàng"), ("people", "Khách hàng"), ("tag", "Khuyến mãi")]


def side(active):
    # mục đang mở dùng icon duotone; các mục còn lại là nét
    links = "".join('<a href="#" class="%s">%s%s</a>'
                    % ("on" if t == active else "",
                       icon(i, "ic sm", duo=(t == active)), t) for i, t in SIDE)
    return '<div class="side"><span class="wm">BRAND</span>%s</div>' % links


def admtop(title, right=""):
    return ('<div class="top"><h1>%s</h1><div class="rt">'
            '<span class="sim">%s dữ liệu mô phỏng</span>%s</div></div>'
            % (title, icon("eye", "ic sm"), right))


# ═══════════════════════════════ BẢNG DỮ LIỆU — bộ mặt cho TanStack Table
# Xem khối CSS cùng tên ở trên để biết mảnh nào ứng với API nào của TanStack.

def dcol(lb="", kind="", num=False, sort=None, pin=None, w=None):
    """Một cột.

    kind: "" thường · "sel" ô đánh dấu · "act" thao tác
    sort: None không sắp xếp được · "" sắp được nhưng chưa sắp ·
          "asc"/"desc" đang sắp theo chiều đó
    pin: khoảng cách từ mép trái khi ghim cột, ví dụ "0" hoặc "42px".
         Ghim thì phải ghim cả dải cột đầu, và mỗi cột biết chỗ của mình.
    """
    return dict(lb=lb, kind=kind, num=num, sort=sort, pin=pin, w=w)


def _ccls(c):
    k = []
    if c["kind"]:
        k.append(c["kind"] + "c")
    if c["num"]:
        k.append("num")
    if c["pin"] is not None:
        k.append("pin")
    return k


def _csty(c, head=False):
    st = []
    if c["pin"] is not None:
        st.append("left:%s" % c["pin"])
    if head and c["w"]:
        st.append("width:%s" % c["w"])
    return ' style="%s"' % ";".join(st) if st else ""


def dck(state="false", label="Chọn dòng"):
    return ('<button type="button" class="ck" role="checkbox" aria-checked="%s" '
            'aria-label="%s">%s</button>' % (state, label, tick()))


def dexp():
    return '<button type="button" class="expb" aria-expanded="false" ' \
           'aria-label="Xem món trong đơn">%s</button>' % icon("chev", "")


def dhead(cols):
    th = []
    for i, c in enumerate(cols):
        cls = _ccls(c)
        if c["sort"]:
            cls += ["srt", c["sort"]]
        w = _csty(c, True)
        if c["kind"] == "sel":
            inner = '<span class="lb">%s</span>' % dck("false", "Chọn tất cả dòng đang hiện")
        elif c["sort"] is not None:
            inner = ('<button type="button" class="sortb">'
                     '<span>%s</span>%s</button>' % (c["lb"], icon("down", "ar")))
        else:
            inner = '<span class="lb">%s</span>' % c["lb"]
        grip = '<span class="grip" title="Kéo để đổi bề rộng cột"></span>' if c["lb"] else ""
        th.append('<th class="%s" data-c="%d"%s>%s%s</th>'
                  % (" ".join(cls), i, w, inner, grip))
    return "<thead><tr>%s</tr></thead>" % "".join(th)


def drow(cols, cells, sel=False, sub=None, cls=""):
    """Một dòng. `cells` phải đủ và đúng thứ tự của `cols`.

    `sub` là phần mở rộng — nằm ở một <tr> riêng ngay dưới, ẩn sẵn.
    """
    tds = "".join(
        '<td%s%s data-c="%d">%s</td>'
        % (' class="%s"' % " ".join(_ccls(c)) if _ccls(c) else "", _csty(c), i, v)
        for i, (c, v) in enumerate(zip(cols, cells)))
    out = '<tr class="%s">%s</tr>' % (("on " if sel else "") + cls, tds)
    if sub is not None:
        out += ('<tr class="dtsub" hidden><td colspan="%d"><div class="inner">%s</div>'
                '</td></tr>' % (len(cols), sub))
    return out


def dfacet(lb, col, values):
    """Lọc theo mặt. `values` là [(giá trị, số dòng)] — số lấy từ
    getFacetedUniqueValues(), nên người dùng biết bấm vào sẽ còn lại bao nhiêu."""
    items = "".join(
        '<button type="button" role="menuitemcheckbox" aria-checked="false" data-v="%s">'
        '%s<span>%s</span><span class="dem">%d</span></button>' % (v, tick(), v, n)
        for v, n in values)
    return ('<span class="fwrap"><button type="button" class="facet" data-col="%d" '
            'aria-haspopup="menu" aria-expanded="false">'
            '<span class="t">%s</span>%s</button>'
            '<div class="menu dau" hidden role="menu"><h5>%s</h5>%s<hr />'
            '<button type="button" class="clr">%sXoá lọc này</button></div></span>'
            % (col, lb, icon("down", ""), lb, items, icon("x", "")))


def dcolsmenu(cols):
    items = "".join(
        '<button type="button" role="menuitemcheckbox" aria-checked="true" data-c="%d">'
        '%s<span>%s</span></button>' % (i, tick(), c["lb"])
        for i, c in enumerate(cols) if c["lb"] and not c["kind"])
    return ('<span class="fwrap"><button type="button" class="facet colsbtn" '
            'aria-haspopup="menu" aria-expanded="false">'
            '%s<span class="t">Cột</span></button>'
            '<div class="menu dau" hidden role="menu"><h5>Hiện cột</h5>%s</div></span>'
            % (icon("columns", ""), items))



def dtools(find, facets="", right=""):
    return ('<div class="bar tools"><span class="find">%s'
            '<input type="search" placeholder="%s" aria-label="%s" /></span>%s'
            '<span class="spacer"></span>%s</div>'
            % (icon("search", ""), find, find, facets, right))


def dbulk(actions, unit="dòng"):
    """Thanh thao tác hàng loạt — thay chỗ thanh công cụ, cùng chiều cao."""
    return ('<div class="bar bulk" hidden data-unit="%s"><span class="cnt"></span>%s'
            '<button type="button" class="clearf spacer">Bỏ chọn</button></div>'
            % (unit, "".join(btn(lb, "ghost sm", ic) for lb, ic in actions)))


def dfoot(total, per=10, page=1):
    pages = max(1, (total + per - 1) // per)
    lo, hi = (page - 1) * per + 1, min(total, page * per)
    opts = "".join(
        '<button type="button" role="menuitemradio" aria-checked="%s" data-p="%d">'
        '%s<span>%d</span></button>'
        % ("true" if o == per else "false", o, tick(), o)
        for o in (10, 20, 50))
    return ('<div class="foot" data-total="%d" data-per="%d" data-page="%d">'
            '<span class="shown">Hiện <b class="tnum">%d–%d</b> trên '
            '<b class="tnum">%d</b> dòng</span>'
            '<span class="selnote" hidden></span>'
            '<span class="rt">'
            '<span class="perlb">Dòng mỗi trang'
            '<span class="fwrap perwrap">'
            '<button type="button" class="facet per" aria-haspopup="menu" '
            'aria-expanded="false" aria-label="Dòng mỗi trang, đang chọn %d">'
            '<span class="t">%d</span>%s</button>'
            '<div class="menu dau" hidden role="menu"><h5>Dòng mỗi trang</h5>%s</div>'
            '</span></span>'
            '<span class="pg">Trang <b class="tnum">%d</b> / <b class="tnum">%d</b></span>'
            '<span class="pager">'
            '<button type="button" class="prev" aria-label="Trang trước"%s>%s</button>'
            '<button type="button" class="next" aria-label="Trang sau"%s>%s</button>'
            '</span></span></div>'
            % (total, per, page, lo, hi, total, per, per, icon("down", ""), opts,
               page, pages,
               " disabled" if page <= 1 else "", icon("chev", ""),
               " disabled" if page >= pages else "", icon("chev", "")))


def dblank(ic, title, text, action="", bad=False):
    """Ba trạng thái rỗng phải nói ba câu khác nhau: chưa có gì · lọc không ra ·
    hỏng. Gộp làm một là bỏ mất chỉ dẫn cho hai trong ba trường hợp."""
    return ('<div class="blank%s"><div class="ring">%s</div><h4>%s</h4><p>%s</p>'
            '<div class="go">%s</div></div>'
            % (" bad" if bad else "", icon(ic, "", duo=True), title, text, action))


def dskel(cols, n=4):
    w = ["72%", "44%", "58%", "36%", "64%", "40%", "52%", "48%"]
    body = "".join(
        '<tr>%s</tr>' % "".join('<td><i style="width:%s"></i></td>' % w[(i + r) % len(w)]
                                for i in range(len(cols)))
        for r in range(n))
    return ('<div class="scroll"><table class="dtt skel">%s<tbody>%s</tbody></table></div>'
            % (dhead(cols), body))


def dtable(cols, rows="", tools="", bulk="", foot="", cls="", body=None):
    inner = body if body is not None else (
        '<div class="scroll"><table class="dtt">%s<tbody>%s</tbody></table></div>'
        % (dhead(cols), rows))
    return '<div class="dt %s">%s%s%s%s</div>' % (cls, tools, bulk, inner, foot)
