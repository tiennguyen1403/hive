# -*- coding: utf-8 -*-
"""Các màn hình bù thêm: những trạng thái PRODUCT.md có nêu nhưng chưa dựng,
và những liên kết trong bản mock đang bấm vào không ra gì."""
from mocklib import (im, CUST, icon, nav, sub, band, card, sheet_size, btn,
                     field, sumbox,
                     dot, so_mau,
                     steps, badge, cartline, side, admtop)
from screens4 import sc_drops    # bảng đợt bán nay dùng chung component .dt

CSS = """
/* dải cảnh báo — dùng cho món vừa hết trong giỏ */
.s .alert{ margin:14px 18px 0; background:var(--hot-bg); border-radius:var(--r);
  padding:11px 13px; display:flex; gap:10px; align-items:flex-start; }
.s .alert svg{ width:17px; height:17px; color:var(--hot); flex:none; margin-top:1px; }
.s .alert .t{ font-size:12.5px; font-weight:600; color:var(--hot); display:block; }
.s .alert .d{ font-size:11.5px; color:var(--ink2); display:block; margin-top:2px;
  line-height:1.5; }

/* hàng trong giỏ đang vướng */
.s .row.snag{ background:var(--hot-bg); }
.s .row.snag .amt{ text-decoration:line-through; color:var(--ink2); }
.s .fixes{ display:flex; gap:14px; margin-top:8px; }

/* bảng size */
.s .gtable{ margin:14px 18px 0; border:1px solid var(--hair); border-radius:var(--r);
  overflow:hidden; }
.s .gtable table{ width:100%; border-collapse:collapse; }
.s .gtable th{ text-align:left; font-size:10.5px; font-weight:500; color:var(--ink2);
  padding:9px 13px; border-bottom:1px solid var(--hair); background:var(--gold-50); }
.s .gtable td{ font-size:12.5px; padding:10px 13px; border-bottom:1px solid var(--hair);
  font-variant-numeric:tabular-nums; }
.s .gtable tr:last-child td{ border-bottom:0; }
.s .gtable tr.gone td{ color:var(--ink2); }
.s .gtable td:first-child{ font-weight:600; }

/* tấm trượt từ dưới lên */
.s .sheet{ border-top:1px solid var(--hair); }
.s .sheet .grab{ width:34px; height:4px; border-radius:99px; background:var(--hair);
  margin:9px auto 0; }
.s .fgroup{ padding:16px 18px 0; }
.s .fgroup h4{ margin:0 0 9px; font-size:12px; font-weight:600; }
.s .fgroup .chips{ padding:0; flex-wrap:wrap; gap:7px; }
.s .bar-bottom{ position:sticky; bottom:0; background:#fff; border-top:1px solid var(--hair);
  padding:12px 18px; margin-top:18px; display:flex; gap:10px; }
.s .bar-bottom .btn{ flex:1; }

/* danh sách cài đặt có giá trị bên phải */
.s .setrow{ display:flex; align-items:center; gap:12px; padding:13px 14px;
  border-top:1px solid var(--hair); }
.s .rows .setrow:first-child{ border-top:0; }
.s .setrow .grow{ flex:1; min-width:0; }
.s .setrow .lb{ font-size:11px; color:var(--ink2); display:block; }
.s .setrow .vl{ font-size:12.5px; display:block; margin-top:2px; }
"""


# ═══════════════════════════════════════════ A · LUỒNG MUA HÀNG
def sc_home_soon():
    """Đợt chưa mở. PRODUCT.md nêu ba trạng thái đợt; đây là trạng thái đầu."""
    teaser = "".join(
        '<div class="card"><div class="wrap"><div class="ph">'
        '<img src="%s" alt="" /></div>'
        '<span class="sold" style="background:rgba(255,255,255,.55)">CHƯA MỞ</span></div>'
        '<h3 class="nm">%s</h3><div class="k">%s</div>'
        '<div class="st">giá công bố khi mở</div></div>'
        % (im(k, 520), n, t)
        for k, n, t in (("suong", "SƯƠNG", "Áo khoác dù"), ("nguoi", "NGUỘI", "Áo hoodie in")))
    return (nav("", 0) +
            '<div class="hero" style="height:376px"><img src="%s" alt="" /></div>' % im("hero", 820, 72) +
            '<div class="band"><b>Đợt 06</b><span class="sep">/</span><span>chưa mở</span>'
            '<span class="cd">mở sau 2 ngày 14 giờ</span></div>'
            '<div class="lead">Mở lúc <b>20:00 ngày 22/09</b>. Sáu mẫu, mỗi mẫu cắt một lần. '
            'Giá và số lượng công bố đúng lúc mở.</div>'
            '<div style="padding:14px 18px 0">%s</div>' % btn("Nhắc tôi khi mở", "", "bell") +
            '<div class="note" style="padding:9px 18px 0">Người đã đặt nhắc được vào trước '
            '2 giờ.</div>'
            '<div class="h2">Sẽ có gì trong đợt 06</div>'
            '<div class="grid">%s</div>' % teaser +
            '<div class="hr"></div>'
            '<div style="padding:16px 18px 24px" class="note">Đợt 05 đã đóng · '
            '<a href="#" class="lnk">xem lại %s</a></div>' % so_mau())


def sc_home_closed():
    """Đợt đã đóng — trạng thái thứ ba, và là trạng thái sống lâu nhất."""
    cards = "".join(card(k, sold=True) for k in ("khoi", "bui"))
    return (nav("", 0) +
            '<div class="hero" style="height:330px"><img src="%s" alt="" /></div>' % im("hero", 820, 72) +
            '<div class="band" style="background:var(--gold-100)"><b>Đợt 05</b>'
            '<span class="sep">/</span><span>đã đóng</span>'
            '<span class="cd">23:00 · 19/09</span></div>'
            '<div class="lead">%s, %d món, bán hết trong 5 giờ 42 phút. '
            'Không may thêm — đợt đã đóng là đóng hẳn.</div>'
            % (so_mau().capitalize(), dot()["cat"]) +
            '<div style="padding:14px 18px 0">%s</div>' % btn("Nhắc tôi khi đợt 06 mở", "", "bell") +
            '<div class="h2">Đợt 05 đã có gì</div>'
            '<div class="grid">%s</div>' % cards +
            '<div style="padding:18px 18px 24px">%s</div>' % btn("Xem cả %s" % so_mau(), "quiet", "grid"))


def sc_pdp_sold():
    """Một mẫu hết sạch size. Nút chính đổi vai: không mua được thì báo khi có lại."""
    sizes = "".join('<div class="sz gone"><b>%s</b><i>hết</i></div>' % z
                    for z in ("S", "M", "L", "XL"))
    return (nav() +
            '<div class="hero" style="height:430px"><img src="%s" alt="" /></div>' % im("muoi", 760, 72) +
            '<div style="padding:16px 18px 0">'
            '<h1 class="nm" style="margin:0;font-size:25px;line-height:1.14">MUỐI</h1>'
            '<div class="note" style="margin-top:3px">Quần jogger · nỉ da cá</div>'
            '<div style="font-size:17px;font-weight:500;margin-top:8px">690.000₫</div>'
            '<div style="margin-top:9px">%s</div></div>' % badge("Đã hết toàn bộ size", "hot") +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;'
            'padding:18px 18px 0"><span style="font-size:12px;font-weight:500">Chọn size</span>'
            '<span class="lnk" style="font-size:11.5px">Bảng size</span></div>'
            '<div class="szrow">%s</div>' % sizes +
            '<div style="padding:18px 18px 0">%s</div>' % btn("Báo tôi khi có lại", "", "bell") +
            '<div style="padding:10px 18px 0">%s</div>' % btn("Thêm vào giỏ", "off") +
            '<div class="note" style="padding:9px 18px 0">Đợt 05 cắt 60 chiếc, bán hết lúc '
            '21:14 ngày 19/09. Chúng tôi không may thêm trong cùng một đợt.</div>'
            '<div class="h2">Còn hàng trong đợt này</div>'
            '<div class="grid" style="padding-bottom:24px">%s</div>'
            % "".join(card(k) for k in ("nang", "nguoi")))


def sc_sizeguide():
    """Liên kết 'Bảng size' ở trang sản phẩm trước đây bấm vào không ra gì."""
    rows = "".join(
        '<tr class="%s"><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>'
        % (c, z, nguc, dai, vai, con)
        for z, nguc, dai, vai, con, c in (
            ("S", "108", "68", "48", "hết", "gone"),
            ("M", "112", "70", "50", "còn 6", ""),
            ("L", "116", "72", "52", "còn 9", ""),
            ("XL", "120", "74", "54", "còn 2", "")))
    return ('<div class="sheet">'
            '<div class="grab"></div>'
            + sub("Bảng size · BỤI", "Đóng") +
            '<div class="lead" style="padding-top:14px">Số đo của <b>áo</b>, không phải số đo '
            'người. Áo form oversize nên rộng hơn khoảng một size so với áo thường.</div>'
            '<div class="gtable"><table><thead><tr><th>Size</th><th>Ngực</th><th>Dài</th>'
            '<th>Vai</th><th>Còn</th></tr></thead><tbody>%s</tbody></table></div>' % rows +
            '<div class="note" style="padding:9px 18px 0">Đơn vị: cm. Sai số may đo ±1cm.</div>'
            '<div class="h2">Cách đo</div>'
            '<div class="rows">'
            '<div class="row">%s<span class="grow"><span class="t">Ngực</span>'
            '<span class="d">Đo ngang, cách nách 2cm, đo áo trải phẳng rồi nhân đôi.</span>'
            '</span></div>'
            '<div class="row">%s<span class="grow"><span class="t">Dài</span>'
            '<span class="d">Từ điểm cao nhất của vai xuống gấu áo.</span></span></div>'
            '</div>' % (icon("ruler"), icon("ruler")) +
            '<div style="padding:16px 18px 24px">%s</div>' % btn("Tôi mặc size M", "", "confirm") +
            '</div>')


def sc_filter():
    """Chip 'Lọc' ở trang danh mục trước đây không mở ra gì."""
    def chips(items):
        return '<div class="chips">%s</div>' % "".join(
            '<span class="chip%s">%s</span>' % (" on" if on else "", t) for t, on in items)

    return ('<div class="sheet"><div class="grab"></div>'
            + sub("Lọc", "Xoá tất cả") +
            '<div class="fgroup"><h4>Form dáng</h4>%s</div>'
            % chips([("Oversize", True), ("Regular", False), ("Rộng", False)]) +
            '<div class="fgroup"><h4>Còn size</h4>%s</div>'
            % chips([("S", False), ("M", True), ("L", True), ("XL", False)]) +
            '<div class="fgroup"><h4>Khoảng giá</h4>'
            '<div class="two" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
            '<div class="inp">300.000₫</div><div class="inp">900.000₫</div></div></div>'
            '<div class="fgroup"><h4>Sắp xếp</h4>'
            '<div class="rows" style="margin:0">'
            + "".join('<div class="row"><span class="radio%s"></span>'
                      '<span class="grow"><span class="t">%s</span></span></div>'
                      % (" on" if on else "", t)
                      for t, on in (("Mới nhất", True), ("Giá thấp đến cao", False),
                                    ("Giá cao đến thấp", False), ("Sắp hết trước", False)))
            + '</div></div>'
            '<div class="bar-bottom">%s%s</div>' % (btn("Bỏ lọc", "quiet", "x"),
                                                    btn("Xem 4 mẫu", "", "grid")) +
            '</div>')


def sc_chonsize():
    """Tấm trượt mà nút "Thêm vào giỏ" trên thẻ sản phẩm mở ra.

    Thẻ cố tình không mang size và màu. Chúng sống ở đây, nơi có đủ chỗ để
    nói số còn lại của TỪNG size thay vì nén thành một dòng chữ — và nơi màu
    người mua vừa vuốt tới trên thẻ được nhắc lại thành chữ, không chỉ là
    một chấm.

    Bản chạy thử đổ lại nội dung tấm này theo đúng thẻ vừa bấm; bản mock để
    nguyên mẫu CÁT cho dễ đọc.
    """
    return sheet_size("cat")


def sc_cart_snag():
    """Hệ quả thật của câu 'giỏ hàng không giữ chỗ tồn kho' đang in trên màn giỏ."""
    FIXES = ('<span class="fixes"><span class="lnk" style="font-size:11.5px">Đổi sang size L'
             '</span><span class="lnk" style="font-size:11.5px">Bỏ khỏi giỏ</span></span>')

    return (nav() + sub("Giỏ hàng", "2 món", plain=True) + steps(0) +
            '<div class="alert">%s<span><span class="t">Size M của BỤI vừa hết</span>'
            '<span class="d">Có người chốt trước lúc bạn đang xem. Giỏ hàng không giữ chỗ '
            'tồn kho — đổi size khác hoặc bỏ món này ra để thanh toán tiếp.</span></span></div>'
            % icon("danger", "") +
            '<div class="rows">%s%s</div>'
            % (cartline("bui", "BỤI", "Áo hoodie · M", "890.000₫", snag=FIXES),
               cartline("nang", "NẮNG", "Áo thun · L", "450.000₫", 1, 34)) +
            sumbox([("Tạm tính · 1 món", "450.000₫"), ("Phí giao hàng", "30.000₫"),
                    ("Món đang vướng", "chưa tính")], "480.000₫") +
            '<div style="padding:14px 18px 0">%s</div>' % btn("Tiến hành thanh toán", "off") +
            '<div class="note" style="padding:9px 18px 24px;text-align:center">'
            'Xử lý món đang vướng để tiếp tục.</div>')


# ═══════════════════════════════════════════ B · TÀI KHOẢN
def sc_forgot():
    return (nav("", 0) + sub("Quên mật khẩu") +
            '<div class="lead" style="padding-top:16px">Nhập email đã đăng ký. Chúng tôi gửi '
            'một liên kết đặt lại, dùng được trong 30 phút.</div>' +
            field("Email", "minhanh@email.com") +
            '<div style="padding:18px 18px 0">%s</div>' % btn("Gửi liên kết đặt lại", "", "export") +
            '<div class="note" style="padding:20px 18px 24px;text-align:center">'
            'Nhớ ra rồi? <span class="lnk">Đăng nhập</span></div>')


def sc_forgot_sent():
    return (nav("", 0) + sub("Quên mật khẩu") +
            '<div style="padding:40px 30px 0;text-align:center">'
            '<span style="display:flex;width:52px;height:52px;color:var(--link);'
            'margin:0 auto 14px">%s</span>' % icon("bell", "", duo=True) +
            '<h3 class="nm" style="font-size:15px;margin:0 0 6px">Đã gửi tới '
            'minhanh@email.com</h3>'
            '<p class="note" style="margin:0;line-height:1.55">Mở thư và bấm vào liên kết. '
            'Nếu không thấy, kiểm tra mục spam.</p></div>'
            '<div style="padding:20px 18px 0">%s</div>' % btn("Mở ứng dụng email", "ghost", "chev") +
            '<div class="note" style="padding:14px 18px 24px;text-align:center">'
            'Gửi lại được sau 45 giây.</div>')


def sc_profile():
    def row(lb, vl, act="Sửa"):
        return ('<div class="setrow"><span class="grow"><span class="lb">%s</span>'
                '<span class="vl">%s</span></span>'
                '<span class="lnk" style="font-size:11.5px">%s</span></div>' % (lb, vl, act))
    return (nav() + sub("Thông tin cá nhân") +
            '<div class="rows" style="margin-top:14px">'
            + row("Họ và tên", CUST["ten"]) + row("Email", CUST["mail"])
            + row("Số điện thoại", CUST["sdt"]) + row("Mật khẩu", "Đổi lần cuối 02/09/2026", "Đổi")
            + '</div>'
            '<div class="h2">Đăng nhập</div>'
            '<div class="rows" style="margin-top:10px">'
            '<div class="setrow">%s<span class="grow"><span class="vl">Tiếp tục với Google</span>'
            '<span class="lb" style="margin-top:2px">Đã liên kết · minhanh@email.com</span></span>'
            '<span class="lnk" style="font-size:11.5px">Bỏ liên kết</span></div>'
            '</div>' % icon("google") +
            '<div class="h2">Tài khoản</div>'
            '<div class="rows" style="margin-top:10px">'
            '<div class="setrow">%s<span class="grow">'
            '<span class="vl" style="color:var(--hot)">Xoá tài khoản</span>'
            '<span class="lb" style="margin-top:2px">Xoá hồ sơ và sổ địa chỉ. Đơn đã đặt vẫn '
            'được giữ để đối soát.</span></span></div></div>' % icon("trash").replace(
                'class="ic"', 'class="ic" style="color:var(--hot)"') +
            '<div style="height:24px"></div>')


def sc_address_form():
    return (nav() + sub("Thêm địa chỉ") +
            field("Tên người nhận", CUST["ten"]) +
            field("Số điện thoại", CUST["sdt"]) +
            '<div class="field"><div class="two">'
            '<div><label>Tỉnh / Thành phố</label><div class="inp sel">TP. Hồ Chí Minh %s</div></div>'
            '<div><label>Quận / Huyện</label><div class="inp sel">Quận 1 %s</div></div>'
            '</div></div>' % (icon("down", "ic sm"), icon("down", "ic sm")) +
            field("Phường / Xã", "Chọn phường / xã " + icon("down", "ic sm"),
                  placeholder=True, kind="sel") +
            field("Địa chỉ cụ thể", "Số nhà, tên đường", placeholder=True) +
            '<div class="fgroup"><h4>Đặt tên cho địa chỉ này</h4>'
            '<div class="chips"><span class="chip on">Nhà</span>'
            '<span class="chip">Công ty</span><span class="chip">Khác</span></div></div>'
            '<div class="check"><span class="box on"></span>'
            '<span>Dùng làm địa chỉ mặc định khi thanh toán.</span></div>'
            '<div style="padding:18px 18px 0">%s</div>' % btn("Lưu địa chỉ", "", "confirm") +
            '<div style="padding:10px 18px 24px">%s</div>' % btn("Huỷ", "quiet", "x"))
def sc_customer():
    orders = "".join(
        '<tr><td><b>%s</b></td><td>%s</td><td class="num">%s</td><td>%s</td></tr>'
        % (mid, d, amt, badge(st, tone))
        for mid, d, amt, st, tone in (
            ("#DH-2431", "19/09/2026", "1.340.000₫", "Chờ chuyển khoản", "warn"),
            ("#DH-2419", "14/09/2026", "1.280.000₫", "Đang giao", ""),
            ("#DH-2387", "02/09/2026", "890.000₫", "Đã giao", "ok")))
    stat = "".join('<div style="padding:13px 16px;border-top:1px solid var(--hair)">'
                   '<div class="note">%s</div>'
                   '<div style="font-size:15px;font-weight:600;margin-top:2px;'
                   'font-variant-numeric:tabular-nums">%s</div></div>' % (l, v)
                   for l, v in (("Số đơn", "3"), ("Đã chi", "3.510.000₫"),
                                ("Giá trị trung bình", "1.170.000₫"),
                                ("Mua gần nhất", "19/09/2026")))
    return (side("Khách hàng") +
            '<div class="main">' +
            admtop("Trần Minh Anh", btn("Gửi email", "ghost sm", "export")) +
            '<div style="display:flex;gap:9px;align-items:center;margin-top:2px">%s%s</div>'
            % (badge("Khách quay lại", ""), badge("Đã đặt nhắc đợt 06", "flat", False)) +
            '<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:16px;align-items:start">'
            '<div class="panel"><div class="hd"><h2>Đơn đã đặt</h2>'
            '<div class="rt"><span class="note">3 đơn</span></div></div>'
            '<table><thead><tr><th>Mã đơn</th><th>Ngày</th><th class="num">Giá trị</th>'
            '<th>Trạng thái</th></tr></thead><tbody>%s</tbody></table></div>' % orders +
            '<div><div class="panel" style="margin-top:16px"><div class="hd">'
            '<h2>Liên hệ</h2></div>'
            '<div style="padding:14px 16px;font-size:12.5px;line-height:1.7">'
            '%s<br/><span class="note">%s</span></div>'
            '<div style="padding:0 16px 14px;font-size:12.5px;line-height:1.6">'
            '<span class="note">Địa chỉ mặc định</span><br/>%s<br/>%s</div></div>'
            % (CUST["mail"], CUST["sdt"], CUST["dc"], CUST["pxq"]) +
            '<div class="panel"><div class="hd"><h2>Số liệu</h2></div>%s</div>' % stat +
            '</div></div></div>')
