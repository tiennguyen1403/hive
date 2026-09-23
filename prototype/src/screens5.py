# -*- coding: utf-8 -*-
"""Bản so sánh kiểu nút lọc — CHƯA áp dụng vào bảng nào.

Người dùng muốn nút thả xuống có nền vàng nhạt và viền cùng màu. Số đo nói
ý đó chạy được, nhưng kéo theo một hệ quả phải giải: nền vàng nhạt chỉ nổi
1,12:1 trên thanh công cụ trắng, tức nó là **một mảng màu chứ không phải một
đường ranh giới**. Và trạng thái "đang lọc" hiện đang dùng đúng màu vàng nhạt
đó, nên nếu lúc rảnh đã vàng rồi thì lúc lọc phải đi đâu?

Trang này bày bốn cách trả lời, mỗi cách đủ bốn trạng thái, cộng bản hiện tại
để so. Mọi thứ ở đây là mẫu trưng bày.
"""
from mocklib import icon, btn, side, admtop

CSS = """
/* ── Trang so sánh kiểu nút lọc. Mọi luật đều nằm dưới `.vlab` nên không rơi
      sang bảng thật; đây là bản nháp để chọn, chưa áp dụng. ── */
.s.adm .vlab .dt.bare{ background:none; border:0; margin:0; border-radius:0; }
.s.adm .vlab .grid5{ display:grid; grid-template-columns:230px repeat(4, 1fr);
  align-items:center; gap:0; }
.s.adm .vlab .grid5 > div{ padding:13px 14px; border-top:1px solid var(--hair); }
.s.adm .vlab .grid5 > div:nth-child(-n+5){ border-top:0; }
.s.adm .vlab .hd5{ font-size:10px; font-weight:600; letter-spacing:.06em;
  text-transform:uppercase; color:var(--ink2); padding-bottom:4px !important; }
.s.adm .vlab .nm5{ font-size:12.5px; font-weight:600; color:var(--ink); }
.s.adm .vlab .nm5 span{ display:block; font-size:11px; font-weight:400;
  color:var(--ink2); margin-top:3px; line-height:1.5; }
.s.adm .vlab .ctx{ padding:16px; }
.s.adm .vlab .ctx + .ctx{ border-top:1px solid var(--hair); }
.s.adm .vlab .ctx h4{ margin:0 0 9px; font-size:12px; font-weight:600; }
.s.adm .vlab .ctx h4 em{ font-style:normal; font-weight:400; color:var(--ink2);
  font-size:11px; margin-left:7px; }
.s.adm .vlab .so{ width:100%; border-collapse:separate; border-spacing:0; }
.s.adm .vlab .so th{ text-align:left; font-size:10.5px; font-weight:500;
  color:var(--ink2); padding:9px 16px; border-bottom:1px solid var(--hair); }
.s.adm .vlab .so td{ font-size:12px; padding:9px 16px;
  border-bottom:1px solid var(--hair); font-variant-numeric:tabular-nums; }
.s.adm .vlab .so tr:last-child td{ border-bottom:0; }
.s.adm .vlab .so .dat{ color:var(--ok); font-weight:500; }
.s.adm .vlab .so .kh{ color:var(--ink2); }
.s.adm .vlab p.note2{ font-size:12px; color:var(--ink2); line-height:1.65;
  max-width:72ch; margin:6px 0 0; }
.s.adm .vlab p.note2 b{ color:var(--ink); font-weight:600; }

/* Bản hiện tại chưa có gì cho trạng thái "đang mở" — rời chuột ra là chip
   trông như đang rảnh dù thực đơn vẫn bày ra. Bốn mẫu dưới đây vá luôn: đang
   mở thì giữ đúng sắc của lúc di chuột. */
.s.adm .vlab .facet.hv, .s.adm .vlab .facet.op{ background:var(--gold-50); }

/* Huy hiệu số đếm: trên nút nền trắng thì mật ong đọc được, nhưng đặt lên
   chính nền vàng thì nó tan vào nền. Trong bốn kiểu dưới đây nó đổi sang mực. */
.s.adm .vlab .vA .facet .n, .s.adm .vlab .vB .facet .n,
.s.adm .vlab .vC .facet .n, .s.adm .vlab .vD .facet .n{
  background:var(--ink); color:var(--gold-100); }

/* Bản cũ — giữ lại để so. Bản đang chạy nay chính là kiểu C nên hàng đối
   chiếu phải tự dựng lại kiểu cũ, không thể để nó thừa hưởng. */
.s.adm .vlab .vOld .facet{ background:#fff; border-color:currentColor;
  color:var(--ink2); }
.s.adm .vlab .vOld .facet.hv, .s.adm .vlab .vOld .facet.op{ background:var(--gold-50); }
.s.adm .vlab .vOld .facet.on{ background:var(--gold-50); color:var(--ink);
  font-weight:500; }
.s.adm .vlab .vOld .facet .n{ background:var(--fill); color:var(--fill-ink); }

/* Kiểu đã chốt — đánh dấu để sau này mở lại còn biết vì sao */
.s.adm .vlab .nm5 .chot{ display:inline-flex; align-items:center; gap:5px;
  margin-top:7px; font-size:10.5px; font-weight:600; color:var(--ok);
  background:var(--ok-bg); padding:3px 8px; border-radius:var(--r-sm); }

/* A · mảng vàng nhạt, viền cùng màu — đúng nguyên văn ý bạn */
.s.adm .vlab .vA .facet{ background:var(--gold-100); border-color:var(--gold-100);
  color:var(--ink2); }
.s.adm .vlab .vA .facet.hv, .s.adm .vlab .vA .facet.op{ background:var(--gold-200); border-color:var(--gold-200); }
.s.adm .vlab .vA .facet.on{ background:var(--gold-300); border-color:var(--gold-300);
  color:var(--ink); font-weight:600; }

/* B · mảng vàng nhạt, viền cùng họ nhưng đậm hơn hai bậc */
.s.adm .vlab .vB .facet{ background:var(--gold-100); border-color:var(--gold-400);
  color:var(--ink2); }
.s.adm .vlab .vB .facet.hv, .s.adm .vlab .vB .facet.op{ background:var(--gold-200); border-color:var(--gold-500); }
.s.adm .vlab .vB .facet.on{ background:var(--gold-200); border-color:var(--gold-600);
  color:var(--ink); font-weight:600; }

/* C · mảng vàng nhạt, viền đủ 3:1 — kiểu duy nhất có ranh giới đạt chuẩn */
.s.adm .vlab .vC .facet{ background:var(--gold-100); border-color:var(--gold-600);
  color:var(--ink2); }
.s.adm .vlab .vC .facet.hv, .s.adm .vlab .vC .facet.op{ background:var(--gold-200); border-color:var(--gold-600); }
.s.adm .vlab .vC .facet.on{ background:var(--gold-200); border-color:var(--gold-700);
  color:var(--ink); font-weight:600; }

/* D · mảng đậm hơn một bậc, vẫn không thấy viền */
.s.adm .vlab .vD .facet{ background:var(--gold-200); border-color:var(--gold-200);
  color:var(--ink2); }
.s.adm .vlab .vD .facet.hv, .s.adm .vlab .vD .facet.op{ background:var(--gold-300); border-color:var(--gold-300); }
.s.adm .vlab .vD .facet.on{ background:var(--gold-400); border-color:var(--gold-400);
  color:var(--ink); font-weight:600; }
"""

KIEU = [
    ("vOld", "Bản cũ",
     "Nền trắng, viền đi theo màu chữ. Ranh giới rõ nhất, nhưng nét viền sẫm "
     "làm hai nút nặng hơn mọi thứ quanh nó. <b>Đã thay.</b>"),
    ("vA", "A · Mảng vàng, không thấy viền",
     "Đúng nguyên văn ý bạn: nền và viền cùng <code>gold-100</code>. Nút thành "
     "một mảng màu, nhẹ nhất trong năm kiểu."),
    ("vB", "B · Mảng vàng, viền đậm hơn hai bậc",
     "Nền <code>gold-100</code>, viền <code>gold-400</code>. Vẫn cùng họ vàng "
     "nhưng còn nhìn thấy mép."),
    ("vC", "C · Mảng vàng, viền đạt chuẩn",
     "Nền <code>gold-100</code>, viền <code>gold-600</code> — 3,08:1 trên "
     "trắng. Kiểu duy nhất có ranh giới đạt chuẩn WCAG."
     "<span class='chot'>ĐÃ CHỐT · đang chạy ở cả năm bảng</span>"),
    ("vD", "D · Mảng đậm hơn, không viền",
     "Như A nhưng đậm thêm một bậc: nền <code>gold-200</code>. Cho trường hợp "
     "A nhìn quá mờ."),
]

TT = [("", "Mặc định"), ("hv", "Di chuột"), ("op", "Đang mở"), ("on", "Đang lọc")]

SO = [
    ("Bản cũ", "trắng", "#71674E theo màu chữ", "5,60:1", "16,8:1", True),
    ("A", "gold-100 · 1,12:1", "cùng màu nền", "1,00:1", "4,98:1", False),
    ("B", "gold-100 · 1,12:1", "gold-400", "1,51:1", "4,98:1", False),
    ("C", "gold-100 · 1,12:1", "gold-600", "3,08:1", "4,98:1", True),
    ("D", "gold-200 · 1,21:1", "cùng màu nền", "1,00:1", "4,63:1", False),
]


def chip(v, st="", lb="Trạng thái", n=None):
    dem = '<span class="n">%d</span>' % n if n else ""
    return ('<span class="dt bare %s"><span class="fwrap">'
            '<button type="button" class="facet%s" aria-expanded="%s">'
            '<span class="t">%s</span>%s%s</button></span></span>'
            % (v, (" " + st) if st else "", "true" if st == "op" else "false",
               lb, dem, icon("down", "")))


def thanh(v):
    """Một thanh công cụ thật, đủ hàng xóm — chip đứng một mình thì nói dối."""
    return ('<div class="dt demo %s" style="margin:0" '
            'data-demo-say="Đây là mẫu để chọn kiểu, chưa áp vào bảng nào.">'
            '<div class="bar tools">'
            '<span class="find">%s<input type="search" placeholder="Tìm đợt" '
            'aria-label="Tìm đợt" /></span>'
            '<span class="fwrap"><button type="button" class="facet" '
            'aria-expanded="false"><span class="t">Trạng thái</span>%s</button></span>'
            '<span class="fwrap"><button type="button" class="facet on" '
            'aria-expanded="false"><span class="t">Thanh toán</span>'
            '<span class="n">2</span>%s</button></span>'
            '<span class="spacer"></span>'
            '<span class="fwrap"><button type="button" class="facet colsbtn" '
            'aria-expanded="false">%s<span class="t">Cột</span></button></span>'
            '</div></div>'
            % (v, icon("search", ""), icon("down", ""), icon("down", ""),
               icon("columns", "")))


def sc_nutloc():
    o = ["<div>%s</div>" % '<span class="hd5">Kiểu</span>']
    o += ['<div><span class="hd5">%s</span></div>' % t for _, t in TT]
    for v, ten, mo in KIEU:
        o.append('<div class="nm5">%s<span>%s</span></div>' % (ten, mo))
        for st, _ in TT:
            o.append('<div>%s</div>' % chip(v, st,
                                            n=2 if st == "on" else None))

    so = "".join(
        '<tr><td><b>%s</b></td><td>%s</td><td>%s</td><td class="%s">%s</td>'
        '<td class="dat">%s</td></tr>'
        % (k, nen, vien, "dat" if ok else "kh", vt, chu)
        for k, nen, vien, vt, chu, ok in SO)

    return (side("") + '<div class="main vlab">'
            + admtop("Kiểu nút lọc")

            + '<p class="note2">Bạn muốn nút thả xuống có <b>nền vàng nhạt, viền '
              'cùng màu</b>. Ý đó chạy được — nhưng kèm một hệ quả phải giải, và '
              'đây là chỗ để bạn nhìn tận mắt rồi chọn. <b>Chưa có gì được áp vào '
              'bảng thật.</b></p>'
              '<p class="note2">Hệ quả: vàng nhạt chỉ nổi <b>1,12:1</b> trên thanh '
              'công cụ trắng. Nó là <b>một mảng màu, không phải một đường ranh '
              'giới</b>. Muốn ranh giới đạt chuẩn 3:1 thì phải xuống tới '
              '<code>gold-600</code> — lúc đó không còn gọi là nhạt nữa. Và vì '
              'trạng thái <b>đang lọc</b> hiện đang dùng đúng màu vàng nhạt ấy, '
              'nếu lúc rảnh đã vàng rồi thì lúc lọc phải đậm thêm một bậc.</p>'

            + '<div class="panel"><div class="hd"><h2>Bốn kiểu, bốn trạng thái</h2>'
              '<div class="rt"><span class="note">bản cũ ở hàng đầu để so</span>'
              '</div></div><div style="padding:4px 2px 10px">'
              '<div class="grid5">%s</div></div></div>' % "".join(o)

            + '<div class="panel"><div class="hd"><h2>Trong thanh công cụ thật</h2>'
              '<div class="rt"><span class="note">có đủ hàng xóm: ô tìm và nút Cột'
              '</span></div></div>'
              + "".join('<div class="ctx"><h4>%s<em>%s</em></h4>%s</div>'
                        % (ten.split(" · ")[0], ten.split(" · ")[-1] if " · " in ten else "",
                           thanh(v))
                        for v, ten, _ in KIEU)
            + '</div>'

            + '<div class="panel"><div class="hd"><h2>Số đo</h2>'
              '<div class="rt"><span class="note">tính tay, không ước lượng</span>'
              '</div></div><table class="so"><thead><tr><th>Kiểu</th>'
              '<th>Nền trên thanh trắng</th><th>Viền</th>'
              '<th>Viền trên nền trắng</th><th>Chữ trên nền nút</th></tr></thead>'
              '<tbody>%s</tbody></table></div>' % so
            + '<p class="note2">Cột <b>viền trên nền trắng</b> là thứ quyết định: '
              'chuẩn WCAG đòi <b>3:1</b> cho ranh giới của một điều khiển. Chỉ kiểu '
              '<b>C</b> đạt. Bốn kiểu còn lại dựa vào nhãn chữ để nhận ra nút — '
              'cách này phổ biến và chấp nhận được, nhưng nên biết là mình đang '
              'chọn gì.</p>'

            + '<div class="panel"><div class="hd"><h2>Đã chốt kiểu C</h2></div>'
              '<div style="padding:16px">'
              '<p class="note2"><b>Ngày 20/09/2026 bạn chọn kiểu C</b>, và nó đã '
              'chạy ở cả năm bảng quản trị. Trang này giữ lại để sau có mở ra còn '
              'biết đã cân nhắc những gì.</p>'
              '<p class="note2">Vì sao C: nó giữ đúng cái bạn muốn — mảng vàng '
              'nhạt, viền cùng họ vàng, hết nét sẫm — mà vẫn là kiểu duy nhất có '
              'mép đạt <b>3:1</b>, mức chuẩn WCAG đòi cho ranh giới của một điều '
              'khiển. A và D nhẹ hơn nhưng mất mép; B chỉ kém C ở đúng chỗ đó.</p>'
              '<p class="note2">Hai thứ đi kèm đã áp luôn: <b>huy hiệu số đếm đổi '
              'sang mực</b> (mật ong đặt lên nền vàng thì tan vào nền), và <b>trạng '
              'thái đang mở</b> nay giữ đúng sắc của lúc di chuột — trước đây rời '
              'chuột ra là chip trông như đang rảnh dù thực đơn vẫn bày.</p>'
              '</div></div>'
            + '</div>')
