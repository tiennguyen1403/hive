# -*- coding: utf-8 -*-
"""Bản so sánh thẻ sản phẩm — CHƯA áp dụng vào màn nào.

PRODUCT.md nói hai điều quyết định thiết kế này:

  · dòng 57 — từ vựng chốt của sản phẩm gồm **size (S/M/L/XL)** và
    **form (oversize / regular)**. Hai thứ đó là ngôn ngữ của người mua,
    không phải chi tiết kỹ thuật.
  · dòng 86 — *"Trạng thái khan hiếm là NỘI DUNG, không phải cảnh báo. Hết
    size, sắp hết, drop đóng — đây là thông tin người mua cần TRƯỚC KHI chạm
    vào nút."*

Thẻ hiện tại nén tất cả vào một dòng chữ ("còn 17 · S M L · X̶L̶"), tức là biến
nội dung thành chú thích. Bốn kiểu đầu là bốn cách trả lời khác nhau cho cùng
câu hỏi: người mua cần biết gì trước khi chạm vào thẻ?

Khối thứ hai là hướng người dùng đề xuất sau đó — **giấu size và màu, để lại
một nút, biến ô ảnh thành băng vuốt ngang theo màu** — dựng thành bốn bước.
**Đã chốt E+ (thẻ) với G (tấm trượt),** và cả hai nay là component thật trong
`mocklib`. Trang này ở lại làm biên bản: còn tra được vì sao bỏ E trần và bỏ F.
"""
from mocklib import (CATALOG, MAU, SIZES, im, icon, btn, side, admtop, tien)
import mocklib as M

CSS = """
/* ── Trang so sánh thẻ sản phẩm. Mọi luật nằm dưới `.tlab`, không rơi sang
      màn thật — đây là bản nháp để chọn. ── */
.s.adm .tlab > p{ font-size:12.5px; color:var(--ink2); line-height:1.65;
  max-width:72ch; margin:6px 0 0; }
.s.adm .tlab > p b{ color:var(--ink); font-weight:600; }
.s.adm .tlab .doi{ display:grid; grid-template-columns:390px 1fr; gap:26px;
  padding:18px 16px; align-items:start; }
.s.adm .tlab .doi + .doi{ border-top:1px solid var(--hair); }
.s.adm .tlab .khung{ width:390px; background:#fff; border:1px solid var(--hair);
  border-radius:var(--r); overflow:hidden; }
.s.adm .tlab .ghichu h4{ margin:0 0 6px; font-size:13.5px; font-weight:600; }
.s.adm .tlab .ghichu p{ margin:0 0 10px; font-size:12px; color:var(--ink2);
  line-height:1.62; max-width:52ch; }
.s.adm .tlab .ghichu p b{ color:var(--ink); font-weight:600; }
.s.adm .tlab .pov{ display:inline-block; font-size:11px; color:var(--gold-800);
  background:var(--gold-50); border:1px solid var(--gold-200); border-radius:var(--r);
  padding:6px 10px; line-height:1.5; max-width:52ch; }
.s.adm .tlab .canh{ display:block; font-size:11px; color:#8C1726;
  background:var(--hot-bg); border:1px solid #EFC6CC; border-radius:var(--r);
  padding:7px 10px; line-height:1.55; max-width:52ch; margin-top:8px; }
.s.adm .tlab .canh b{ font-weight:600; }
.s.adm .tlab .can{ margin-top:11px; font-size:11px; color:var(--ink2); }
.s.adm .tlab .can b{ color:var(--ink); font-weight:600; }
.s.adm .tlab .can code{ font-family:ui-monospace,Consolas,monospace; font-size:10.5px;
  background:var(--gold-50); padding:1.5px 5px; border-radius:var(--r-sm);
  color:var(--gold-800); }

/* ── mảnh dựng riêng của các kiểu thẻ ─────────────────────────────────── */
/* hàng size nhỏ đặt ngay trên thẻ */
.s .card .szmini{ display:flex; gap:4px; margin-top:7px; }
.s .card .szmini span{ flex:1; text-align:center; font-size:10.5px; font-weight:500;
  line-height:20px; height:20px; border:1px solid var(--fill); border-radius:var(--r-sm);
  color:var(--ink); }
.s .card .szmini span.het{ border-style:dashed; border-color:var(--line);
  color:var(--ink2); text-decoration:line-through; }
/* dòng thông số vải */
.s .card .thongso{ font-size:10.5px; color:var(--ink2); margin-top:3px; line-height:1.5; }
/* chấm màu */
.s .card .mau{ display:flex; gap:5px; margin-top:7px; align-items:center; }
.s .card .mau i{ width:13px; height:13px; border-radius:99px; display:block;
  box-shadow:inset 0 0 0 1px rgba(33,29,18,.18); }
.s .card .mau b{ font-size:10px; color:var(--ink2); font-weight:400; margin-left:2px; }
/* thanh đã bán của đợt */
.s .card .vach{ height:3px; border-radius:99px; background:var(--gold-200);
  margin-top:8px; overflow:hidden; }
.s .card .vach i{ display:block; height:100%; background:var(--mark); }
.s .card .nhip{ font-size:10.5px; color:var(--ink2); margin-top:5px; }
.s .card .nhip b{ color:var(--ink); font-weight:600; font-variant-numeric:tabular-nums; }
/* nút thêm nhanh */
.s .card .nhanh{ margin-top:8px; }
.s .card .nhanh .btn{ height:32px; font-size:12px; }
/* nhãn góc ảnh */
.s .card .goc{ position:absolute; left:7px; top:7px; background:var(--hot);
  color:#fff; font-size:9.5px; font-weight:600; padding:3px 7px;
  border-radius:var(--r-sm); letter-spacing:.02em; }
.s .card .form{ position:absolute; right:7px; top:7px; background:rgba(255,255,255,.93);
  color:var(--ink); font-size:9.5px; font-weight:600; padding:3px 7px;
  border-radius:var(--r-sm); }

/* ── kiểu F · hộp size nổi ngay trên thẻ (KHÔNG chọn — giữ để so) ────── */
.s .card.vuot .sizepop{ position:absolute; left:-4px; right:-4px; bottom:calc(100% + 6px);
  z-index:3; background:#fff; border:1px solid var(--hair); border-radius:var(--r);
  box-shadow:0 10px 26px -8px rgba(33,29,18,.26), 0 2px 6px -2px rgba(33,29,18,.12);
  padding:8px; }
.s .card.vuot .sizepop[hidden]{ display:none; }
.s .card.vuot .sizepop .nhac{ font-size:10.5px; color:var(--ink2); margin:0 0 6px 2px; }
.s .card.vuot .zs{ display:grid; grid-template-columns:1fr 1fr; gap:5px; }
/* Viền ô size dùng --fill-bd (3,08:1 trên trắng) chứ không phải --fill
   (2,13:1): viền là thứ duy nhất chỉ ra đây là ô bấm được. */
.s .card.vuot .z{ height:44px; font:inherit; font-size:12.5px; font-weight:600;
  color:var(--ink); background:#fff; border:1px solid var(--fill-bd);
  border-radius:var(--r); cursor:pointer; }
.s .card.vuot .z:hover{ background:var(--gold-100); }
.s .card.vuot .z .r{ display:block; font-size:9.5px; font-weight:400; color:var(--ink2); }
.s .card.vuot .z.het{ border-style:dashed; border-color:var(--line); color:var(--ink2);
  text-decoration:line-through; cursor:not-allowed; background:var(--gold-50); }
.s .card.vuot .z.het .r{ text-decoration:none; }

/* ── khung vẽ tĩnh cho kiểu G: dựng lại vỏ `.sheetbody` của bản chạy thử để
      xem tấm trượt thật nằm trên lưới trông ra sao ─────────────────────── */
.s .khungtam{ position:relative; height:660px; overflow:hidden; }
.s .tscrim{ position:absolute; inset:0; background:rgba(12,10,6,.5); }
.s .tamvo{ position:absolute; left:0; right:0; bottom:0; background:#fff;
  border-radius:14px 14px 0 0; box-shadow:0 -12px 32px -10px rgba(12,10,6,.34); }
"""

CAO = {0: ('302px', '—'), 1: ('310px', '+8px'), 2: ('324px', '+22px'),
       3: ('324px', '+22px'), 4: ('332px', '+30px')}
# đo lại bằng do_the.py sau mỗi lần dựng — đừng gõ tay
CAOV = {'tran': '309px', 'thieu': '328px'}

BAY = ["cat", "bui", "gio", "muoi"]          # đủ hàng · sắp hết · hết một size · hết sạch


def lay(k):
    return next(x for x in CATALOG if x["key"] == k and x["dot"] == 5)


def _anh(x, goc="", form=""):
    o = '<span class="sold">HẾT HÀNG</span>' if not x["conTong"] else ""
    g = '<span class="goc">%s</span>' % goc if goc else ""
    f = '<span class="form">%s</span>' % form if form else ""
    return ('<div class="wrap"><div class="ph"><img src="%s" alt="" /></div>%s%s%s</div>'
            % (im(x["key"], 520), g, f, o))


def _sz(x, bam=False):
    return '<div class="szmini">%s</div>' % "".join(
        '<span class="%s">%s</span>' % ("" if x["con"][z] else "het", z) for z in SIZES)


def _mau(x):
    cham = "".join('<i style="background:%s"></i>' % MAU[m][1] for m in x["mau"])
    return '<div class="mau">%s<b>%d màu</b></div>' % (cham, len(x["mau"]))


def _con(x):
    if not x["conTong"]:
        return '<span class="con it">hết hàng</span>'
    c = "con it" if x["conTong"] <= 3 else "con"
    return '<span class="%s">còn %d</span>' % (c, x["conTong"])


def the(x, kieu):
    """Một thẻ theo kiểu đã chọn."""
    if kieu == 0:                                     # hiện tại
        sz = " ".join(('<span class="gone">%s</span>' % z) if not x["con"][z] else z
                      for z in SIZES)
        dong = ("hết hàng" if not x["conTong"]
                else "%s · %s" % (('<span class="low">còn %d</span>' if x["conTong"] <= 3
                                   else "còn %d") % x["conTong"], sz))
        return ('<div class="card">%s<h3 class="nm">%s</h3><div class="k">%s</div>'
                '<div class="p">%s</div><div class="st">%s</div></div>'
                % (_anh(x), x["ten"], x["loai"], tien(x["gia"]), dong))

    if kieu == 1:                                     # A · size ngay trên thẻ
        return ('<div class="card">%s<h3 class="nm">%s</h3>'
                '<div class="k">%s · %s</div>'
                '<div class="gia2"><div class="p">%s</div>%s</div>%s</div>'
                % (_anh(x), x["ten"], x["loai"], x["form"], tien(x["gia"]),
                   _con(x), _sz(x)))

    if kieu == 2:                                     # B · thông số vải
        return ('<div class="card">%s<h3 class="nm">%s</h3><div class="k">%s</div>'
                '<div class="thongso">%s · %s</div>%s'
                '<div class="gia2"><div class="p">%s</div>%s</div></div>'
                % (_anh(x), x["ten"], x["loai"], x["chat"], x["form"], _mau(x),
                   tien(x["gia"]), _con(x)))

    if kieu == 3:                                     # C · đồng hồ đợt
        pc = int(round(x["ban"] / x["cat"] * 100)) if x["cat"] else 100
        goc = "còn %d" % x["conTong"] if 0 < x["conTong"] <= 3 else ""
        return ('<div class="card">%s<h3 class="nm">%s</h3>'
                '<div class="gia2"><div class="p">%s</div></div>'
                '<div class="vach"><i style="width:%d%%"></i></div>'
                '<div class="nhip">đã bán <b>%d</b> trên <b>%d</b> đã cắt</div>%s</div>'
                % (_anh(x, goc=goc), x["ten"], tien(x["gia"]), pc, x["ban"], x["cat"], _sz(x)))

    # D · chạm ít nhất
    nut = ("" if not x["conTong"] else
           '<div class="nhanh">%s</div>' % btn("Thêm vào giỏ", "sm", "bag"))
    return ('<div class="card">%s<h3 class="nm">%s</h3>'
            '<div class="gia2"><div class="p">%s</div>%s</div>%s%s</div>'
            % (_anh(x, form=x["form"]), x["ten"], tien(x["gia"]), _con(x), _sz(x), nut))


# ══════════════════════════════════ hướng đã chốt: thẻ vuốt màu + tấm trượt
# Thẻ E+ và tấm trượt G nay là component thật trong `mocklib` (`card`,
# `bang_anh`, `sheet_size`) và đã chạy trên mọi màn có lưới sản phẩm. Phần
# dưới chỉ dựng lại các bước đã loại, để còn tra được vì sao chốt như vậy.
SO_BO_ANH = M.SO_BO_ANH


def _tran(x):
    """E — bản đúng như lời đề xuất: không dòng size đã hết, không số còn lại."""
    if not x["conTong"]:
        return ('<div class="card vuot" data-key="%s">%s<h3 class="nm">%s</h3>'
                '<div class="gia2"><div class="p">%s</div></div></div>'
                % (x["key"], M.bang_anh(x, 520, True), x["ten"], tien(x["gia"])))
    return ('<div class="card vuot" data-key="%s">%s<h3 class="nm">%s</h3>'
            '<div class="gia2"><div class="p">%s</div></div>'
            '<div class="act"><button type="button" class="qbtn">%sThêm vào giỏ'
            '</button></div></div>'
            % (x["key"], M.bang_anh(x), x["ten"], tien(x["gia"]),
               icon("bag", "ic sm")))


def _sizepop(x, mo=False):
    o = "".join(
        '<button type="button" class="z%s"%s>%s<span class="r">%s</span></button>'
        % ("" if x["con"][z] else " het",
           "" if x["con"][z] else ' disabled aria-label="Size %s đã hết"' % z,
           z, ("còn %d" % x["con"][z]) if x["con"][z] else "hết")
        for z in SIZES)
    return ('<div class="sizepop"%s><p class="nhac">Chọn size</p>'
            '<div class="zs">%s</div></div>' % ("" if mo else " hidden", o))


def _pop(x, mo=False):
    """F — thẻ đã chốt, nhưng nút mở hộp size ngay trên thẻ thay vì tấm trượt."""
    if not x["conTong"]:
        return M.card(x)
    het = M.het_size(x)
    thieu = ('<div class="thieu">hết %s</div>'
             % " ".join("<s>%s</s>" % z for z in het)) if het else ""
    con = ('<span class="con it">còn %d</span>' % x["conTong"]
           if x["conTong"] <= 3 else "")
    return ('<div class="card vuot">%s<h3 class="nm">%s</h3>'
            '<div class="gia2"><div class="p">%s</div>%s</div>%s'
            '<div class="act"><button type="button" class="qbtn" '
            'aria-expanded="%s" aria-haspopup="true">%sThêm vào giỏ</button>%s</div>'
            '</div>'
            % (M.bang_anh(x), x["ten"], tien(x["gia"]), con, thieu,
               "true" if mo else "false", icon("bag", "ic sm"), _sizepop(x, mo)))


KIEU = [
    (0, "Hiện tại", "Ảnh, tên, loại, giá, và một dòng chữ gộp tất cả tình trạng "
        "tồn kho.",
     "Gọn nhất, nhưng nó biến thứ PRODUCT.md gọi là <b>nội dung</b> thành một "
     "dòng chú thích 10,5px. Muốn biết còn size nào phải đọc, không liếc được.",
     "—"),
    (1, "A · Size ngay trên thẻ",
     "Bỏ dòng chữ tồn kho, thay bằng bốn ô size. Size đã hết thì gạch ngang và "
     "đổi sang viền đứt. Thêm <b>form</b> vào dòng loại.",
     "Quyết định về size xảy ra ngay ở lưới. Liếc một cái là biết mẫu này còn "
     "vừa mình hay không, khỏi vào trang sản phẩm rồi quay ra.",
     "<code>form</code>"),
    (2, "B · Thông số vải",
     "Thêm một dòng chất liệu · form, và dãy chấm màu. Giá và số còn nằm cùng "
     "một hàng.",
     "Người mua streetwear loại trừ bằng chất liệu và form trước khi nhìn giá. "
     "Đưa đủ thông số để họ khỏi mở từng mẫu.",
     "<code>chat</code> · <code>form</code> · <code>mau[]</code>"),
    (3, "C · Đồng hồ đợt",
     "Một vạch mỏng cho thấy đã bán bao nhiêu phần của số đã cắt, kèm con số "
     "thật. Mẫu còn ≤3 mang nhãn đỏ ngay trên ảnh.",
     "Mô hình đợt <i>chính là</i> sản phẩm. Vạch này cho thấy tốc độ bán — thứ "
     "mà con số tĩnh không nói được.",
     "<code>cat</code> · <code>ban</code>"),
    (4, "D · Chạm ít nhất",
     "Ô size bấm được ngay trên thẻ, chọn xong hiện nút thêm vào giỏ. Form nằm "
     "ở góc ảnh.",
     "Đợt bán hết trong vài giờ. Rút đường từ lưới tới giỏ còn một chạm thay "
     "vì bốn.",
     "<code>form</code> · tồn kho theo size"),
]


def _hang(luoi, ten, mo, pov, can, canh=""):
    return ('<div class="doi"><div class="khung"><div class="s">%s</div></div>'
            '<div class="ghichu"><h4>%s</h4><p>%s</p>'
            '<div class="pov">%s</div>%s'
            '<div class="can">%s</div></div></div>'
            % (luoi, ten, mo, pov,
               ('<div class="canh">%s</div>' % canh) if canh else "", can))


def sc_the():
    khoi = ""
    for i, ten, mo, pov, can in KIEU:
        luoi = '<div class="grid" style="padding-bottom:16px">%s</div>' % "".join(
            the(lay(k), i) for k in BAY)
        khoi += _hang(luoi, ten, mo, pov,
                      'Cần thêm dữ liệu: <b>%s</b><br />Thẻ cao <b>%s</b> (%s so với '
                      'hiện tại) · vẫn <b>4 thẻ</b> mỗi màn điện thoại'
                      % (can, CAO[i][0], CAO[i][1]))

    # ── khối hướng đã chốt ──────────────────────────────────────────────
    v1 = '<div class="grid" style="padding-bottom:16px">%s</div>' % "".join(
        _tran(lay(k)) for k in BAY)
    v2 = '<div class="grid" style="padding-bottom:16px">%s</div>' % "".join(
        M.card(lay(k)) for k in BAY)
    v3 = '<div class="grid" style="padding-bottom:16px">%s</div>' % "".join(
        _pop(lay(k), mo=(j == 0)) for j, k in enumerate(BAY))
    v4 = ('<div class="khungtam"><div class="grid">%s</div>'
          '<div class="tscrim"></div><div class="tamvo">%s</div></div>'
          % ("".join(M.card(lay(k)) for k in BAY), M.sheet_size("cat", size="M")))

    moi = ""
    moi += _hang(
        v1, "E · Thẻ vuốt màu — đúng như lời đề xuất",
        "Ô ảnh thành băng ngang, <b>một tấm mỗi màu</b>, vuốt để xem. Dòng size "
        "và dãy chấm màu biến mất. Còn lại: ảnh, tên, giá, một nút.",
        "Thẻ yên hẳn: ảnh được nói, chữ thôi tranh chỗ. Và màu — thứ người mua "
        "quyết định bằng mắt — được xem bằng mắt, ở kích thước thật, chứ không "
        "phải qua một chấm 13px.",
        'Thẻ cao <b>309px</b>. Băng ảnh là vùng cuộn thật: ngón tay, bàn di, con '
        'lăn và phím mũi tên đều đi được.',
        canh='<b>Vì sao không dừng ở đây:</b> GIÓ còn 7 chiếc <b>nhưng đã hết XL</b> '
             '— thẻ này không nói. PRODUCT.md dòng 86: người mua cần biết size nào '
             'đã hết <i>trước khi</i> chạm vào thẻ.')
    moi += _hang(
        v2, "E+ · Giữ lại đúng một dòng — ĐÃ CHỐT",
        "Y hệt trên, cộng <b>một dòng đỏ chỉ hiện khi có size đã hết</b> (“hết "
        "X̶L̶”), và <b>số còn lại khi đã ≤3 chiếc</b>. Mẫu nào còn đủ size thì không "
        "có dòng nào.",
        "Chỗ thoả hiệp rẻ nhất giữa “thẻ phải yên” và “khan hiếm là nội dung”: im "
        "lặng khi không có gì để báo, chỉ lên tiếng đúng lúc.",
        'Thẻ cao <b>328px</b> khi có dòng, <b>309px</b> khi không. Lưới kéo hai thẻ '
        'cùng hàng bằng nhau và nút bị đẩy xuống đáy, nên <b>bốn nút vẫn thẳng một '
        'hàng</b>.<br />Đây là <code>mocklib.card()</code> — thứ đang chạy trên mọi '
        'màn có lưới sản phẩm.')
    moi += _hang(
        v3, "F · Hộp size nổi trên thẻ — không chọn",
        "Chạm “Thêm vào giỏ” thì một hộp nhỏ nổi lên trên nút: bốn ô size kèm số "
        "còn lại. Nhanh hơn một tầng.",
        "Bỏ vì hai lẽ. Hộp phải nén bốn ô 44px vào lưới 2×2 (bốn ô một hàng cần "
        "176px, thẻ chỉ rộng 170px). Và nó không có chỗ nào nhắc <i>màu</i>: người "
        "mua vuốt sang màu Nâu rồi bấm thêm, thẻ phải tự nhớ mà không nói ra.",
        'Vẫn bấm thử được ngay trên trang này để so.')
    moi += _hang(
        v4, "G · Nút mở tấm trượt — ĐÃ CHỐT",
        "Nút mở tấm trượt từ đáy màn: ảnh theo <b>màu đang vuốt tới</b>, dãy màu "
        "đổi được, bốn ô size <b>kèm số còn lại từng size</b>, rồi mới tới nút thật.",
        "Chỗ duy nhất đủ rộng để nói hết sự thật về tồn kho mà không phải nén — và "
        "chỗ duy nhất giữ được màu người mua vừa chọn bằng mắt.",
        'Đây là <code>mocklib.sheet_size()</code>, nằm sẵn trong mọi màn có thẻ. '
        'Thẻ vẫn cao <b>328px</b> — tấm trượt không tốn chiều cao nào của lưới.')

    return (side("") + '<div class="main tlab">'
            + admtop("Thẻ sản phẩm")
            + '<p><b>Đã chốt: E+ với G.</b> Cả hai đã là component thật '
              '(<code>card()</code> và <code>sheet_size()</code>) và đang chạy trên '
              'mọi màn có lưới sản phẩm. Trang này ở lại làm biên bản — bốn bước của '
              'hướng vuốt màu ở khối đầu, bốn kiểu của vòng trước ở khối sau. '
              'Mỗi lưới là khổ điện thoại '
              'thật (390px, hai cột) với bốn trạng thái xếp sẵn: <b>đủ size · sắp '
              'hết · hết một size · hết sạch</b>.</p>'
              '<p>PRODUCT.md chốt hai điều dẫn đường ở đây: từ vựng của người mua '
              'gồm <b>size</b> và <b>form</b>; và <b>khan hiếm là nội dung, không '
              'phải cảnh báo</b> — người mua cần biết còn size nào <i>trước khi</i> '
              'chạm vào thẻ.</p>'
            + '<div class="panel" style="margin-top:20px"><div class="hd">'
              '<h2>Hướng vuốt màu — bốn bước, chốt ở E+ và G</h2>'
              '<div class="rt"><span class="note">vuốt thật được · mỗi tấm là một '
              'ảnh mượn khác nhau, chưa phải cùng một áo khác màu</span></div>'
              '</div>%s</div>' % moi
            + '<div class="panel"><div class="hd">'
              '<h2>Vòng trước — năm kiểu, cùng bốn trạng thái</h2>'
              '<div class="rt"><span class="note">khổ điện thoại thật · '
              'ảnh vẫn là ảnh mượn tạm</span></div></div>%s</div>' % khoi
            + '<div class="panel"><div class="hd"><h2>Đã chốt gì, và còn nợ gì</h2>'
              '</div><div style="padding:16px">'
              '<p style="font-size:12px;color:var(--ink2);line-height:1.65;'
              'max-width:70ch;margin:0 0 10px"><b>E+ với tấm trượt G — đã áp.</b> '
              'Thẻ mới chạy trên trang chủ, danh mục, tìm kiếm, yêu thích, giỏ trống, '
              'trang sản phẩm, bản máy tính và cả màn 404. Tấm trượt tự đi theo mọi '
              'màn có thẻ, không phải khai từng màn.</p>'
              '<p style="font-size:12px;color:var(--ink2);line-height:1.65;'
              'max-width:70ch;margin:0 0 10px"><b>Dòng “hết X̶L̶” không làm lưới so '
              'le.</b> Đã đo: lưới kéo hai thẻ cùng hàng cao bằng nhau (309px thành '
              '328px), và nút được đẩy xuống đáy thẻ, nên bốn nút vẫn nằm trên một '
              'đường. Cái giá chỉ là vài pixel trống dưới giá ở thẻ không có dòng — '
              'rẻ hơn hẳn việc giấu mất chuyện hết size.</p>'
              '<p style="font-size:12px;color:var(--ink2);line-height:1.65;'
              'max-width:70ch;margin:0 0 10px"><b>Cái giá thật của băng ảnh không nằm '
              'ở code.</b> Nó là <b>%d bộ ảnh</b> phải chụp cho riêng đợt này — mỗi '
              'màu một bộ. Thiếu ảnh màu nào thì thẻ đó tự rút về một tấm, không vỡ; '
              'nhưng lưới sẽ có mẫu vuốt được và mẫu không.</p>'
              '<p style="font-size:12px;color:var(--ink2);line-height:1.65;'
              'max-width:70ch;margin:0 0 10px"><b>Còn nợ hai chuyện.</b> Thẻ mới bỏ '
              'dòng loại sản phẩm (“Áo hoodie”, “Quần jogger”) — ảnh đang gánh việc '
              'đó. Thêm lại tốn một dòng 11px nếu bạn thấy lưới khó phân biệt. Và '
              'tồn kho hiện chỉ có theo <b>size</b>; tấm trượt cho đổi màu nhưng số '
              'còn lại không đổi theo màu, vì dữ liệu chưa tách tới mức '
              '<b>size × màu</b>.</p>'
              '<p style="font-size:12px;color:var(--ink2);line-height:1.65;'
              'max-width:70ch;margin:0"><b>Về vòng trước:</b> hướng vuốt màu và A là '
              'hai triết lý ngược nhau — A đưa quyết định về size lên lưới, hướng này '
              'đẩy nó xuống sau cú chạm. Không trộn được.</p>'
              '</div></div>' % SO_BO_ANH
            + '</div>')
