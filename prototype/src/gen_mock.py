# -*- coding: utf-8 -*-
"""Mock UI toàn bộ 22 màn hình, dựng trong hệ thiết kế đã chốt."""
import io, os, time
from mocklib import (CSS, IMG, im, PRODUCTS, CATALOG, SIZES, DOT_NAY, dot, so_mau,
                     doanh_thu, tien, CUST, icon, nav, navw, sub, band,
                     card, sheet_size, btn, field, sumbox, steps, empty, badge, szrow,
                     cartline, SIDE, side, admtop)
from icons_iconsax import ICONSAX_IMPORT
import screens2 as X
import screens3 as Y
import screens4 as Z
from screens4 import sc_products, sc_orders_adm, sc_customers, sc_promo

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "preview", "mock")
os.makedirs(OUT, exist_ok=True)

SHEET = """
body{ margin:0; padding:26px 22px 80px; background:#12161A; color:#CBD2D9;
  font-family:"Be Vietnam Pro",system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
a{ color:#F1C04A; }
header{ max-width:78ch; margin:0 auto 26px; }
header h1{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; font-size:30px;
  color:#fff; margin:0 0 10px; letter-spacing:-.02em; line-height:1.18; }
header p{ margin:0 0 8px; font-size:14px; line-height:1.62; color:#9AA5AF; }
header b{ color:#fff; font-weight:600; }
nav.crumbs{ max-width:78ch; margin:0 auto 26px; display:flex; flex-wrap:wrap; gap:8px; }
nav.crumbs a{ font-size:12px; padding:6px 11px; border:1px solid #2A3138; border-radius:6px;
  color:#9AA5AF; text-decoration:none; }
nav.crumbs a.on{ background:#EBA400; border-color:#EBA400; color:#211D12; font-weight:600; }
.grp{ max-width:1500px; margin:0 auto; padding-top:26px; border-top:1px solid #222830; }
.grp > h2{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; font-size:20px;
  color:#fff; margin:0 auto 4px; max-width:78ch; }
.grp > p.lede{ font-size:13px; color:#8F9AA4; margin:0 auto 20px; max-width:78ch; line-height:1.6; }
.row{ display:flex; flex-wrap:wrap; gap:22px; justify-content:center; align-items:flex-start; }
figure{ margin:0 0 28px; }
figcaption{ margin-bottom:8px; max-width:390px; }
figcaption .n{ font-size:12.5px; color:#fff; font-weight:600; }
figcaption .d{ font-size:11px; color:#7E8994; line-height:1.45; margin-top:2px; }
figure.wide figcaption{ max-width:1280px; }
.frame{ position:relative; border-radius:10px; overflow:hidden;
  box-shadow:0 10px 30px rgba(0,0,0,.5); background:#fff; }
.frame.m{ width:390px; }
.frame.w{ width:1280px; }
.fold{ position:absolute; left:0; right:0; top:760px; border-top:1px dashed rgba(16,50,62,.4);
  pointer-events:none; }
.fold span{ position:absolute; right:7px; top:3px; font-size:8.5px; color:#54707F;
  background:#fff; padding:1px 5px; border-radius:3px; letter-spacing:.02em; }
.navcards{ display:grid; grid-template-columns:repeat(4,1fr); gap:18px; max-width:1180px;
  margin:0 auto; }
.navcards a{ display:block; background:#fff; border-radius:10px; padding:20px 18px;
  text-decoration:none; box-shadow:0 10px 30px rgba(0,0,0,.42); }
.navcards .t{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; font-size:17px;
  color:#211D12; letter-spacing:-.01em; }
.navcards .c{ font-size:11px; color:#9E6817; margin-top:3px; font-weight:500; }
.navcards .d{ font-size:12px; color:#71674E; margin-top:10px; line-height:1.55; }
.navcards .go{ margin-top:15px; display:inline-block; font-size:12px; font-weight:500;
  color:#9E6817; border:1px solid #C28800; border-radius:6px; padding:7px 14px; }
.sw{ display:inline-flex; align-items:center; gap:7px; font-size:11px; color:#8D96A0;
  font-family:ui-monospace,Consolas,monospace; }
.sw i{ width:26px; height:26px; border-radius:5px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.14); }
"""

HEAD = """<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>%(title)s</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400..700&family=Be+Vietnam+Pro:wght@400;500;600&display=swap&subset=vietnamese,latin" rel="stylesheet" />
<link rel="stylesheet" href="sys.css?v=%(ver)s" />
<link rel="stylesheet" href="sheet.css?v=%(ver)s" />
</head>
<body>
"""

CRUMBS = [("index.html", "Tổng quan"), ("he-thong.html", "Hệ thiết kế"),
          ("khach.html", "Mua hàng"), ("taikhoan.html", "Tài khoản"),
          ("admin.html", "Quản trị"), ("noidung.html", "Nội dung")]


VER = str(int(time.time()))


def page(fname, title, header, body):
    cr = "".join('<a href="%s" class="%s">%s</a>' % (h, "on" if h == fname else "", t)
                 for h, t in CRUMBS)
    html = (HEAD % {"ver": VER, "title": title}) + header + ('<nav class="crumbs">%s</nav>' % cr) + body + "\n</body>\n</html>\n"
    with io.open(os.path.join(OUT, fname), "w", encoding="utf-8") as f:
        f.write(html)
    return len(html)


def frame(body, kind="m", fold=True):
    f = ('<div class="fold"><span>hết màn hình đầu</span></div>'
         if (kind == "m" and fold) else "")
    return '<div class="frame %s"><div class="s">%s</div>%s</div>' % (kind, body, f)


def fadm(body):
    return '<div class="frame w"><div class="s adm">%s</div></div>' % body


def fig(name, desc, inner, wide=False):
    return ('<figure class="%s"><figcaption><div class="n">%s</div><div class="d">%s</div>'
            '</figcaption>%s</figure>' % ("wide" if wide else "", name, desc, inner))


def grp(title, lede, figs):
    return ('<section class="grp"><h2>%s</h2><p class="lede">%s</p><div class="row">%s</div></section>'
            % (title, lede, "".join(figs)))


# ═══════════════════════════════════════════════════════ A · LUỒNG MUA HÀNG
def sc_home():
    cards = "".join(card(x) for x in PRODUCTS[:4])
    return (nav() +
            '<div class="hero" style="height:392px"><img src="%s" alt="" /></div>' % im("hero", 820, 72) +
            band() +
            '<div class="lead">Mỗi mẫu cắt đúng một lần từ khổ vải đã đặt sẵn. '
            'Hết size là hết thật, không may thêm.</div>'
            '<div style="padding:14px 18px 0">%s</div>' % btn("Xem %s" % so_mau(), "ghost", "chev") +
            '<div class="h2">Đợt 05 · %s</div>' % so_mau() +
            '<div class="grid">%s</div>' % cards +
            '<div style="padding:18px 18px 0">%s</div>' % btn("Xem tất cả", "quiet", "grid") +
            '<div class="hr"></div>'
            '<div style="padding:16px 18px 24px" class="note">Đợt 04 đã đóng · '
            '<a href="#" class="lnk">xem lại</a></div>')


def sc_listing():
    cards = "".join(card(x) for x in PRODUCTS)
    return (nav("Áo") + sub("Áo", "%d mẫu" % dot()["mau"], plain=True) +
            '<div class="chips">'
            '<span class="chip icon on">%s Lọc</span>'
            '<span class="chip">Oversize</span><span class="chip">Còn size S</span>'
            '<span class="chip icon">%s Mới nhất</span>'
            '</div>' % (icon("filter", "ic sm"), icon("sort", "ic sm")) +
            band() +
            '<div class="grid">%s</div>' % cards +
            '<div style="padding:20px 18px 24px;text-align:center" class="note">'
            'Đã hiển thị cả %d mẫu của đợt này.</div>' % dot()["mau"])


def sc_search():
    cards = "".join(card(x) for x in PRODUCTS[:2])
    return (nav() +
            '<div class="sub">%s<div class="inp" style="flex:1;height:38px">hoodie</div>'
            '<span class="rt">Huỷ</span></div>' % icon("back") +
            '<div class="lead">2 kết quả cho <b>“hoodie”</b></div>'
            '<div class="grid">%s</div>' % cards +
            '<div class="h2">Có thể bạn tìm</div>'
            '<div class="chips" style="flex-wrap:wrap">'
            '<span class="chip">áo khoác</span><span class="chip">oversize</span>'
            '<span class="chip">nỉ bông</span></div>'
            '<div style="height:24px"></div>')


def sc_search_empty():
    return (nav() +
            '<div class="sub">%s<div class="inp" style="flex:1;height:38px">áo len</div>'
            '<span class="rt">Huỷ</span></div>' % icon("back") +
            empty("search", "Không có mẫu nào tên “áo len”",
                  "Đợt 05 chỉ có áo thun, hoodie, khoác dù và quần jogger. "
                  "Thử bỏ bớt từ khoá hoặc xem cả đợt.",
                  '<div style="max-width:220px;margin:0 auto">%s</div>' % btn("Xem cả đợt 05", "ghost", "grid")) +
            '<div class="h2">Từ khoá hay tìm</div>'
            '<div class="chips" style="flex-wrap:wrap;padding-bottom:24px">'
            '<span class="chip">hoodie</span><span class="chip">oversize</span>'
            '<span class="chip">jogger</span></div>')


def sc_pdp():
    return (nav() +
            '<div class="hero" style="height:470px"><img src="%s" alt="" /></div>' % im("bui", 760, 72) +
            '<div style="display:flex;gap:7px;padding:9px 18px 0">'
            + "".join(
                '<span style="width:46px;height:57px;border-radius:4px;overflow:hidden;'
                'background:var(--plate);box-shadow:%s">'
                '<img src="%s" style="width:100%%;height:100%%;object-fit:cover;display:block" alt="" />'
                '</span>'
                % ("inset 0 0 0 2px var(--fill)" if i == 0 else "none", im(k, 170, 60))
                for i, k in enumerate(("bui", "suong", "muoi")))
            + '</div>'
            '<div style="padding:16px 18px 0">'
            '<h1 class="nm" style="margin:0;font-size:25px;line-height:1.14">BỤI</h1>'
            '<div class="note" style="margin-top:3px">Áo hoodie · nỉ bông 380gsm</div>'
            '<div style="font-size:17px;font-weight:500;margin-top:8px">890.000₫</div>'
            '<div style="margin-top:9px">%s</div></div>' % badge("Còn 2 chiếc cuối", "hot") +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;'
            'padding:18px 18px 0"><span style="font-size:12px;font-weight:500">Chọn size</span>'
            '<span class="lnk" style="font-size:11.5px">Bảng size</span></div>'
            + szrow() +
            '<div style="padding:18px 18px 0">%s</div>' % btn("Thêm vào giỏ · 890.000₫", "", "bag") +
            '<div style="padding:10px 18px 0">%s</div>' % btn("Lưu vào yêu thích", "quiet", "heart") +
            '<div class="rows">'
            '<div class="row"><span class="grow"><span class="d">Chất liệu</span>'
            '<span class="t">Nỉ bông 380gsm, không xù</span></span></div>'
            '<div class="row"><span class="grow"><span class="d">Form</span>'
            '<span class="t">Oversize, rộng hơn 1 size so với thường</span></span></div>'
            '<div class="row"><span class="grow"><span class="d">Giao hàng</span>'
            '<span class="t">2–4 ngày · 30.000₫ · miễn phí từ 1.000.000₫</span></span></div>'
            '<div class="row"><span class="grow"><span class="d">Đổi trả</span>'
            '<span class="t">7 ngày nếu chưa qua sử dụng</span></span></div>'
            '</div>'
            '<div class="h2">Cùng đợt</div>'
            '<div class="grid" style="padding-bottom:24px">%s</div>'
            % "".join(card(x) for x in PRODUCTS[2:4]))


def sc_cart():
    # số cuối là số còn cắt được cho đợt này — gõ quá là bị chặn lại
    items = [("bui", "BỤI", "Áo hoodie · M", "890.000₫", 1, 2),
             ("nang", "NẮNG", "Áo thun · L", "450.000₫", 1, 34)]
    rows = "".join(cartline(k, n, d, p, q, mx) for k, n, d, p, q, mx in items)
    return (nav() + sub("Giỏ hàng", "2 món", plain=True) + steps(0) +
            '<div class="rows">%s</div>' % rows +
            '<div style="margin:14px 18px 0;display:flex;gap:8px">'
            '<div class="inp ph2" style="flex:1">Mã giảm giá</div>'
            '<div class="btn ghost" style="height:40px;width:96px">%s Áp dụng</div></div>'
            % icon("tag", "ic sm") +
            sumbox([("Tạm tính", "1.340.000₫"), ("Phí giao hàng", "Miễn phí"),
                    ("Giảm giá", "—")], "1.340.000₫") +
            '<div class="note" style="padding:10px 18px 0">Đợt 05 đóng sau 5 giờ 42 phút. '
            'Giỏ hàng không giữ chỗ tồn kho.</div>'
            '<div style="padding:14px 18px 24px">%s</div>' % btn("Tiến hành thanh toán", "", "card"))


def sc_cart_empty():
    return (nav("", 0) + sub("Giỏ hàng") +
            empty("bag", "Giỏ hàng đang trống",
                  "Đợt 05 còn 5 mẫu chưa hết size. Đợt đóng sau 5 giờ 42 phút.",
                  '<div style="max-width:220px;margin:0 auto">%s</div>' % btn("Xem đợt 05", "", "grid")) +
            '<div class="h2">Bạn từng xem</div>'
            '<div class="grid" style="padding-bottom:24px">%s</div>'
            % "".join(card(x) for x in PRODUCTS[:2]))


def sc_checkout():
    return (nav() + sub("Thanh toán") + steps(1) +
            '<div class="h2" style="margin-top:18px">Người nhận</div>' +
            field("Họ và tên", CUST["ten"]) +
            '<div class="field"><div class="two">'
            '<div><label>Số điện thoại</label><div class="inp">%s</div></div>'
            '<div><label>Email</label><div class="inp">%s</div></div>'
            '</div></div>' % (CUST["sdt"], CUST["mail"]) +
            '<div class="h2">Địa chỉ giao</div>' +
            '<div class="field"><div class="two">'
            '<div><label>Tỉnh / Thành phố</label><div class="inp sel">TP. Hồ Chí Minh %s</div></div>'
            '<div><label>Quận / Huyện</label><div class="inp sel">Quận 1 %s</div></div>'
            '</div></div>' % (icon("chev", "ic sm"), icon("chev", "ic sm")) +
            field("Phường / Xã", "Phường Đa Kao " + icon("chev", "ic sm"), kind="sel") +
            field("Địa chỉ cụ thể", CUST["dc"]) +
            field("Ghi chú cho người giao", "Gọi trước khi tới", placeholder=True, kind="area") +
            '<div class="h2">Cách giao</div>'
            '<div class="rows">'
            '<div class="row"><span class="radio on"></span><span class="grow">'
            '<span class="t">Giao tiêu chuẩn · 2–4 ngày</span>'
            '<span class="d">Giao bởi đối tác vận chuyển</span></span>'
            '<span class="amt">Miễn phí</span></div>'
            '<div class="row"><span class="radio"></span><span class="grow">'
            '<span class="t">Giao nhanh · trong 24 giờ</span>'
            '<span class="d">Chỉ nội thành TP. Hồ Chí Minh</span></span>'
            '<span class="amt">45.000₫</span></div></div>'
            '<div class="h2">Cách thanh toán</div>'
            '<div class="rows">'
            '<div class="row"><span class="radio on"></span><span class="grow">'
            '<span class="t">Chuyển khoản ngân hàng</span>'
            '<span class="d">Hiện mã QR ở bước cuối</span></span></div>'
            '<div class="row"><span class="radio"></span><span class="grow">'
            '<span class="t">Thanh toán khi nhận hàng (COD)</span>'
            '<span class="d">Thu thêm 15.000₫ phí thu hộ</span></span></div>'
            '<div class="row"><span class="radio"></span><span class="grow">'
            '<span class="t">Thẻ nội địa / Visa</span>'
            '<span class="d">Qua cổng thanh toán</span></span></div></div>' +
            sumbox([("Tạm tính", "1.340.000₫"), ("Phí giao hàng", "Miễn phí"),
                    ("Giảm giá", "—")], "1.340.000₫") +
            '<div class="check"><span class="box on"></span>'
            '<span>Tôi đồng ý với điều khoản mua hàng và chính sách đổi trả 7 ngày.</span></div>' +
            '<div style="padding:16px 18px 24px">%s</div>' % btn("Đặt hàng · 1.340.000₫", "", "confirm"))


def sc_done():
    # Không có thanh bước ở đây: đơn xong rồi, thanh tiến độ chỉ còn là
    # tiếng vọng — và nó lặp lại đúng dấu tích lớn ngay bên dưới.
    return (nav("", 0) +
            '<div style="padding:26px 18px 0;text-align:center">'
            '<span style="display:flex;width:54px;height:54px;color:var(--fill);'
            'margin:0 auto 14px">%s</span>'
            '<h1 class="nm" style="margin:0;font-size:21px">Đã nhận đơn của bạn</h1>'
            '<p class="note" style="margin:7px 0 0;line-height:1.55">Mã đơn '
            '<b style="color:var(--ink)">#DH-2431</b>. Chúng tôi đã gửi xác nhận tới '
            '%s.</p></div>' % (icon("check", "", duo=True), CUST["mail"]) +
            '<div class="band" style="margin-top:18px"><b>Cần chuyển khoản</b>'
            '<span class="cd">1.340.000₫</span></div>'
            '<div class="rows">'
            '<div class="row"><span class="grow"><span class="d">Ngân hàng</span>'
            '<span class="t">Nội dung chuyển khoản: <b>DH2431</b></span></span></div>'
            '<div class="row"><span class="grow"><span class="d">Giao tới</span>'
            '<span class="t">%s</span><span class="d">%s · %s</span></span></div>'
            '<div class="row"><span class="grow"><span class="d">Dự kiến nhận</span>'
            '<span class="t">21 – 23 / 09 / 2026</span></span></div>'
            '</div>' % (CUST["ten"], CUST["dc"], CUST["pxq"]) +
            '<div class="h2">Đơn gồm</div>'
            '<div class="rows" style="margin-top:10px">'
            + "".join(
                '<div class="row"><span class="thumb"><img src="%s" alt="" /></span>'
                '<span class="grow"><span class="t nm">%s</span><span class="d">%s</span></span>'
                '<span class="amt">%s</span></div>'
                % (im(k, 150, 60), n, d, p)
                for k, n, d, p in (("bui", "BỤI", "Áo hoodie · M · x1", "890.000₫"),
                                   ("nang", "NẮNG", "Áo thun · L · x1", "450.000₫")))
            + '</div>'
            '<div style="padding:16px 18px 0">%s</div>' % btn("Theo dõi đơn hàng", "", "truck") +
            '<div style="padding:10px 18px 24px">%s</div>' % btn("Tiếp tục xem đợt 05", "quiet", "chev"))


def sc_home_w():
    cards = "".join(card(x, 620) for x in PRODUCTS)
    return (navw() +
            '<div class="hero" style="height:440px"><img src="%s" alt="" /></div>' % im("hero", 1800, 74) +
            '<div style="padding:0 40px"><div class="band" style="margin:16px 0 0">'
            '<b>Đợt 05</b><span class="sep">/</span><span>' + so_mau() + '</span>'
            '<span class="cd">đóng sau 5 giờ 42 phút</span></div></div>'
            '<div style="padding:14px 40px 0;font-size:13px;color:var(--ink2);max-width:60ch">'
            'Mỗi mẫu cắt đúng một lần từ khổ vải đã đặt sẵn. Hết size là hết thật, không may thêm.</div>'
            '<div style="padding:22px 40px 0"><div class="grid three" style="padding:0">%s</div></div>'
            % cards +
            '<div style="height:34px"></div>')


def sc_pdp_w():
    return (navw("Áo") +
            '<div style="display:grid;grid-template-columns:1.05fr .95fr;gap:34px;padding:24px 40px 0">'
            '<div><div class="ph" style="aspect-ratio:4/5"><img src="%s" alt="" /></div>'
            '<div style="display:flex;gap:9px;margin-top:9px">%s</div></div>'
            '<div><h1 class="nm" style="margin:0;font-size:32px;line-height:1.1">BỤI</h1>'
            '<div class="note" style="margin-top:5px">Áo hoodie · nỉ bông 380gsm</div>'
            '<div style="font-size:20px;font-weight:500;margin-top:12px">890.000₫</div>'
            '<div style="margin-top:11px">%s</div>'
            '<div style="display:flex;justify-content:space-between;align-items:baseline;'
            'margin-top:24px"><span style="font-size:12.5px;font-weight:500">Chọn size</span>'
            '<span class="lnk" style="font-size:11.5px">Bảng size</span></div>'
            '<div style="margin-top:9px">%s</div>'
            '<div style="margin-top:20px;max-width:330px">%s</div>'
            '<div style="margin-top:10px;max-width:330px">%s</div>'
            '<div class="rows" style="margin:22px 0 0">%s</div>'
            '</div></div><div style="height:34px"></div>'
            % (im("bui", 900, 74),
               "".join('<span style="width:60px;height:74px;border-radius:4px;overflow:hidden;'
                       'background:var(--plate);box-shadow:%s"><img src="%s" '
                       'style="width:100%%;height:100%%;object-fit:cover;display:block" alt="" /></span>'
                       % ("inset 0 0 0 2px var(--fill)" if i == 0 else "none", im(k, 200, 60))
                       for i, k in enumerate(("bui", "suong", "muoi", "nguoi"))),
               badge("Còn 2 chiếc cuối", "hot"),
               szrow(wide=True),
               btn("Thêm vào giỏ · 890.000₫", "", "bag"), btn("Lưu vào yêu thích", "quiet", "heart"),
               '<div class="row"><span class="grow"><span class="d">Chất liệu</span>'
               '<span class="t">Nỉ bông 380gsm, không xù</span></span></div>'
               '<div class="row"><span class="grow"><span class="d">Giao hàng</span>'
               '<span class="t">2–4 ngày · miễn phí từ 1.000.000₫</span></span></div>'))


# ═══════════════════════════════════════════════════════ B · TÀI KHOẢN
def sc_login():
    return (nav("", 0) + sub("Đăng nhập") +
            '<div class="lead" style="padding-top:16px">Đăng nhập để xem đơn hàng, địa chỉ '
            'đã lưu và danh sách yêu thích.</div>' +
            field("Email hoặc số điện thoại", CUST["mail"]) +
            field("Mật khẩu", "••••••••") +
            '<div style="display:flex;justify-content:flex-end;padding:9px 18px 0">'
            '<span class="lnk" style="font-size:11.5px">Quên mật khẩu?</span></div>'
            '<div style="padding:16px 18px 0">%s</div>' % btn("Đăng nhập", "", "login") +
            '<div style="display:flex;align-items:center;gap:12px;padding:20px 18px 0">'
            '<span style="flex:1;height:1px;background:var(--hair)"></span>'
            '<span class="note">hoặc</span>'
            '<span style="flex:1;height:1px;background:var(--hair)"></span></div>'
            '<div style="padding:16px 18px 0">%s</div>' % btn("Tiếp tục với Google", "quiet", "google") +
            '<div style="padding:10px 18px 0">%s</div>' % btn("Mua không cần tài khoản", "quiet", "bag") +
            '<div class="note" style="padding:22px 18px 24px;text-align:center">'
            'Chưa có tài khoản? <span class="lnk">Đăng ký</span></div>')


def sc_signup():
    return (nav("", 0) + sub("Đăng ký") +
            '<div class="lead" style="padding-top:16px">Tạo tài khoản để được báo trước '
            'khi đợt mới mở, trước khi mở công khai 2 giờ.</div>' +
            field("Họ và tên", CUST["ten"]) +
            field("Email", "minhanh@email", err="Email này thiếu phần sau dấu chấm.",
                  kind="bad") +
            field("Số điện thoại", CUST["sdt"]) +
            field("Mật khẩu", "••••••••") +
            '<div class="note" style="padding:6px 18px 0">Ít nhất 8 ký tự, có cả chữ và số.</div>'
            '<div class="check"><span class="box on"></span>'
            '<span>Báo cho tôi khi đợt mới mở bán.</span></div>'
            '<div class="check"><span class="box"></span>'
            '<span>Tôi đồng ý với điều khoản sử dụng.</span></div>'
            '<div style="padding:18px 18px 0">%s</div>' % btn("Tạo tài khoản", "off") +
            '<div class="note" style="padding:22px 18px 24px;text-align:center">'
            'Đã có tài khoản? <span class="lnk">Đăng nhập</span></div>')


def sc_account():
    def line(ic, t, d, right=""):
        return ('<div class="row">%s<span class="grow"><span class="t">%s</span>'
                '<span class="d">%s</span></span>%s%s</div>'
                % (icon(ic), t, d, right, icon("chev", "chev")))
    return (nav() + sub("Tài khoản") +
            '<div style="display:flex;gap:13px;align-items:center;padding:18px 18px 0">'
            '<span style="width:52px;height:52px;border-radius:99px;background:var(--gold-100);'
            'display:flex;align-items:center;justify-content:center;'
            'font-family:Familjen Grotesk,sans-serif;font-weight:700;font-size:19px;'
            'color:var(--gold-800)">TA</span>'
            '<span><span class="nm" style="font-size:16px;display:block">%s</span>'
            '<span class="note">%s · %s</span></span></div>' % (CUST["ten"], CUST["mail"], CUST["sdt"]) +
            '<div class="band" style="margin-top:16px"><b>Đợt 05</b>'
            '<span class="sep">/</span><span>đang mở</span>'
            '<span class="cd">còn 5 giờ 42 phút</span></div>'
            '<div class="rows">' +
            line("box", "Đơn hàng của tôi", "1 đơn đang giao",
                 '<span style="margin-right:4px">%s</span>' % badge("1 đang giao", "", False)) +
            line("heart", "Yêu thích", "3 mẫu đã lưu") +
            line("pin", "Sổ địa chỉ", "2 địa chỉ") +
            line("user", "Thông tin cá nhân", "Tên, email, mật khẩu") +
            '</div>'
            '<div class="h2">Cài đặt</div>'
            '<div class="rows">'
            '<div class="row"><span class="grow"><span class="t">Báo khi đợt mới mở</span>'
            '<span class="d">Qua email, trước 2 giờ</span></span>'
            '<span style="width:38px;height:22px;border-radius:99px;background:var(--fill);'
            'position:relative;flex:none"><span style="position:absolute;right:2px;top:2px;'
            'width:18px;height:18px;border-radius:99px;background:#fff"></span></span></div>'
            '<div class="row"><span class="grow"><span class="t">Báo khi hàng sắp hết size</span>'
            '<span class="d">Chỉ mẫu bạn đã lưu</span></span>'
            '<span style="width:38px;height:22px;border-radius:99px;background:var(--hair);'
            'position:relative;flex:none"><span style="position:absolute;left:2px;top:2px;'
            'width:18px;height:18px;border-radius:99px;background:#fff"></span></span></div>'
            '</div>'
            '<div style="padding:18px 18px 24px">%s</div>' % btn("Đăng xuất", "quiet", "logout"))


def sc_orders():
    rows = [("#DH-2431", "19/09/2026", "1.340.000₫", "Chờ chuyển khoản", "warn", "2 món"),
            ("#DH-2419", "14/09/2026", "1.280.000₫", "Đang giao", "", "2 món"),
            ("#DH-2387", "02/09/2026", "890.000₫", "Đã giao", "ok", "1 món"),
            ("#DH-2310", "18/08/2026", "450.000₫", "Đã huỷ", "hot", "1 món")]
    body = "".join(
        '<div class="row"><span class="grow"><span class="t">%s</span>'
        '<span class="d">%s · %s</span><span style="display:block;margin-top:6px">%s</span></span>'
        '<span style="text-align:right"><span class="amt">%s</span></span>%s</div>'
        % (mid, d, n, badge(st, tone), amt, icon("chev", "chev"))
        for mid, d, amt, st, tone, n in rows)
    return (nav() + sub("Đơn hàng của tôi", "4 đơn", plain=True) +
            '<div class="tabs"><span class="on">Tất cả</span><span>Đang xử lý</span>'
            '<span>Đã giao</span><span>Đã huỷ</span></div>'
            '<div class="rows">%s</div>' % body +
            '<div class="note" style="padding:18px 18px 24px;text-align:center">'
            'Đã hiển thị tất cả 4 đơn.</div>')


def sc_order_detail():
    return (nav() + sub("#DH-2419", "Cần hỗ trợ?") +
            '<div class="band" style="margin-top:14px"><b>Đang giao</b>'
            '<span class="sep">/</span><span>dự kiến 21/09</span>'
            '<span class="cd">%s</span></div>' % badge("Đúng hạn", "ok") +
            '<div class="tl">'
            '<div class="it done"><span class="gut"><span class="dot"></span>'
            '<span class="stem"></span></span><span class="bd">'
            '<span class="t">Đã nhận đơn</span><span class="d">14/09 · 21:04</span></span></div>'
            '<div class="it done"><span class="gut"><span class="dot"></span>'
            '<span class="stem"></span></span><span class="bd">'
            '<span class="t">Đã thanh toán</span><span class="d">14/09 · 21:11 · chuyển khoản</span></span></div>'
            '<div class="it done"><span class="gut"><span class="dot"></span>'
            '<span class="stem"></span></span><span class="bd">'
            '<span class="t">Đã đóng gói</span><span class="d">15/09 · 09:30</span></span></div>'
            '<div class="it now"><span class="gut"><span class="dot"></span>'
            '<span class="stem"></span></span><span class="bd">'
            '<span class="t">Đang trên đường giao</span>'
            '<span class="d">18/09 · 07:15 · đang ở kho Tân Bình</span></span></div>'
            '<div class="it todo"><span class="gut"><span class="dot"></span></span>'
            '<span class="bd"><span class="t">Giao thành công</span>'
            '<span class="d">dự kiến 21/09</span></span></div>'
            '</div>'
            '<div style="padding:0 18px">%s</div>' % btn("Theo dõi chi tiết", "ghost", "truck") +
            '<div class="h2">Món trong đơn</div>'
            '<div class="rows" style="margin-top:10px">'
            + "".join(
                '<div class="row"><span class="thumb"><img src="%s" alt="" /></span>'
                '<span class="grow"><span class="t nm">%s</span><span class="d">%s</span></span>'
                '<span class="amt">%s</span></div>'
                % (im(k, 150, 60), n, d, p)
                for k, n, d, p in (("khoi", "KHÓI", "Áo thun oversize · L · x1", "390.000₫"),
                                   ("bui", "BỤI", "Áo hoodie · M · x1", "890.000₫")))
            + '</div>' +
            sumbox([("Tạm tính", "1.280.000₫"), ("Phí giao hàng", "Miễn phí"),
                    ("Đã thanh toán", "Chuyển khoản")], "1.280.000₫") +
            '<div class="h2">Giao tới</div>'
            '<div class="rows" style="margin-top:10px"><div class="row"><span class="grow">'
            '<span class="t">%s · %s</span><span class="d">%s<br/>%s</span></span></div></div>'
            % (CUST["ten"], CUST["sdt"], CUST["dc"], CUST["pxq"]) +
            '<div style="padding:16px 18px 24px">%s</div>' % btn("Mua lại đơn này", "quiet", "refresh"))


def sc_track():
    return (nav() + sub("Theo dõi đơn #DH-2419") +
            '<div style="padding:16px 18px 0">'
            '<div style="border-radius:6px;overflow:hidden;border:1px solid var(--hair);'
            'background:var(--gold-50);height:172px;position:relative;'
            'display:flex;align-items:center;justify-content:center">'
            '<svg viewBox="0 0 354 172" style="position:absolute;inset:0;width:100%;height:100%">'
            '<path d="M18 140 C90 120 110 60 180 62 S300 92 336 44" fill="none" '
            'stroke="#F1C04A" stroke-width="3" stroke-dasharray="7 6"/>'
            '<circle cx="18" cy="140" r="6" fill="#C28800"/>'
            '<circle cx="180" cy="62" r="7" fill="#C28800" stroke="#fff" stroke-width="3"/>'
            '<circle cx="336" cy="44" r="6" fill="#fff" stroke="#968B73" stroke-width="2"/>'
            '</svg>'
            '<span style="position:absolute;left:10px;bottom:8px;font-size:9.5px;'
            'background:#fff;padding:2px 6px;border-radius:4px;color:var(--ink2)">'
            'bản đồ minh hoạ</span></div></div>'
            '<div class="rows">'
            '<div class="row"><span class="grow"><span class="d">Đơn vị vận chuyển</span>'
            '<span class="t">Chưa chốt đối tác — hiển thị khi có</span></span></div>'
            '<div class="row"><span class="grow"><span class="d">Mã vận đơn</span>'
            '<span class="t">VD-8842-1907</span></span>'
            '<span class="lnk" style="font-size:11.5px">Sao chép</span></div>'
            '<div class="row"><span class="grow"><span class="d">Dự kiến nhận</span>'
            '<span class="t">21/09/2026, trong giờ hành chính</span></span></div>'
            '</div>'
            '<div class="h2">Nhật ký hành trình</div>'
            '<div class="tl">'
            + "".join(
                '<div class="it %s"><span class="gut"><span class="dot"></span>%s</span>'
                '<span class="bd"><span class="t">%s</span><span class="d">%s</span></span></div>'
                % (c, '<span class="stem"></span>' if i < 4 else "", t, d)
                for i, (c, t, d) in enumerate((
                    ("now", "Đang ở kho Tân Bình", "18/09 · 07:15"),
                    ("done", "Rời kho Thủ Đức", "17/09 · 22:40"),
                    ("done", "Đã lấy hàng", "16/09 · 14:02"),
                    ("done", "Đã đóng gói", "15/09 · 09:30"),
                    ("done", "Đã nhận đơn", "14/09 · 21:04"))))
            + '</div><div style="height:24px"></div>')


def sc_address():
    def addr(name, tag, line1, line2, default=False):
        d = badge("Mặc định", "flat", False) if default else ""
        return ('<div class="row"><span class="grow">'
                '<span style="display:flex;gap:8px;align-items:center">'
                '<span class="t">%s</span><span class="badge flat" style="padding:2px 7px">%s</span>%s</span>'
                '<span class="d" style="margin-top:4px">%s<br/>%s</span>'
                '<span style="display:flex;gap:14px;margin-top:9px">'
                '<span class="lnk" style="font-size:11.5px">Sửa</span>'
                '<span class="note" style="border-bottom:1px solid var(--hair)">Xoá</span></span>'
                '</span></div>' % (name, tag, d, line1, line2))
    return (nav() + sub("Sổ địa chỉ", "Thêm mới") +
            '<div class="rows" style="margin-top:14px">'
            + addr(CUST["ten"], "Nhà", CUST["dc"], CUST["pxq"] + " · " + CUST["sdt"], True)
            + addr(CUST["ten"], "Công ty", "Tầng 8, 195 Điện Biên Phủ",
                   "Phường 15, Quận Bình Thạnh, TP. Hồ Chí Minh · " + CUST["sdt"])
            + '</div>'
            '<div style="padding:16px 18px 0">%s</div>' % btn("Thêm địa chỉ", "ghost", "plus") +
            '<div class="note" style="padding:14px 18px 24px">Địa chỉ mặc định được điền sẵn '
            'ở bước thanh toán.</div>')


def sc_wishlist():
    cards = "".join(card(x) for x in (PRODUCTS[1], PRODUCTS[4], PRODUCTS[5]))
    return (nav() + sub("Yêu thích", "3 mẫu", plain=True) +
            '<div class="band" style="margin-top:14px"><b>1 mẫu sắp hết</b>'
            '<span class="sep">/</span><span>BỤI còn 2 chiếc</span></div>'
            '<div class="grid">%s</div>' % cards +
            '<div style="padding:18px 18px 0">%s</div>' % btn("Thêm cả 2 mẫu còn hàng vào giỏ", "ghost", "bag") +
            '<div class="note" style="padding:14px 18px 24px">Mẫu đã hết hàng vẫn được giữ '
            'trong danh sách để bạn theo dõi đợt sau.</div>')


def sc_wishlist_empty():
    return (nav() + sub("Yêu thích") +
            empty("heart", "Chưa lưu mẫu nào",
                  "Chạm hình trái tim ở trang sản phẩm để lưu. Chúng tôi sẽ báo khi "
                  "mẫu đã lưu sắp hết size.",
                  '<div style="max-width:220px;margin:0 auto">%s</div>' % btn("Xem đợt 05", "ghost", "grid")) +
            '<div style="height:10px"></div>')
def sc_dash():
    vals = [38, 52, 44, 61, 47, 72, 88, 56, 49, 67, 81, 58, 74, 96]
    peak = max(vals)
    bars = "".join(
        '<span class="b%s" style="height:%d%%">%s</span>'
        % (" peak" if v == peak else "", int(v / peak * 100),
           '<span class="lbl">9,6tr</span>' if v == peak else "")
        for v in vals)
    xax = "".join('<span>%s</span>' % (d if i % 3 == 0 else "&nbsp;")
                  for i, d in enumerate(["06/09", "", "", "09/09", "", "", "12/09", "", "",
                                         "15/09", "", "", "18/09", ""]))
    tbl = "".join('<tr><td>%s</td><td class="num">%s</td></tr>'
                  % (d, "{:,}".format(v * 100000).replace(",", ".") + "₫")
                  for d, v in zip(["06/09", "07/09", "08/09", "09/09", "10/09", "11/09", "12/09",
                                   "13/09", "14/09", "15/09", "16/09", "17/09", "18/09", "19/09"],
                                  vals))
    kpis = "".join(
        '<div class="kpi"><div class="lb">%s</div><div class="vl">%s</div>'
        '<div class="ghi">%s</div></div>' % (l, v, d)
        for l, v, d in (("Doanh thu 14 ngày", "88,3tr₫", "so với kỳ trước: +12%"),
                        ("Đơn hàng", "97", "trung bình 910k₫/đơn"),
                        ("Tỷ lệ chốt", "3,4%", "trên 2.850 lượt xem"),
                        ("Còn trong đợt 05", "%d món" % dot()["con"], "trên tổng %d món đã cắt" % dot()["cat"])))
    orders = "".join(
        '<tr><td><b>%s</b></td><td>%s</td><td>%s</td><td class="num">%s</td><td>%s</td></tr>'
        % (mid, kh, d, amt, badge(st, tone))
        for mid, kh, d, amt, st, tone in (
            ("#DH-2431", "Trần Minh Anh", "19/09 · 21:04", "1.340.000₫", "Chờ chuyển khoản", "warn"),
            ("#DH-2430", "Lê Hoàng Nam", "19/09 · 20:12", "690.000₫", "Chờ chuyển khoản", "warn"),
            ("#DH-2429", "Phạm Thu Hà", "19/09 · 18:47", "1.450.000₫", "Đã thanh toán", ""),
            ("#DH-2428", "Võ Đức Duy", "19/09 · 16:03", "390.000₫", "Đang giao", ""),
            ("#DH-2427", "Nguyễn Khả Vy", "18/09 · 22:31", "2.180.000₫", "Đã giao", "ok")))
    low = "".join(
        '<div class="row" style="padding:10px 16px"><span class="pill">'
        '<img src="%s" alt="" /></span><span class="grow"><span class="t nm">%s</span>'
        '<span class="d">%s</span></span>%s</div>' % (im(k, 120, 60), n, d, badge(b, t))
        for k, n, d, b, t in [
            (x["key"], x["ten"],
             ("hết toàn bộ size" if not x["conTong"]
              else (" · ".join("%s hết" % z for z in SIZES if not x["con"][z])
                    or "còn đủ bốn size")),
             ("hết" if not x["conTong"] else "còn %d" % x["conTong"]),
             ("hot" if x["conTong"] <= 2 else "warn"))
            for x in sorted((y for y in CATALOG if y["dot"] == DOT_NAY),
                            key=lambda y: y["conTong"])[:3]])
    return (side("Tổng quan") +
            '<div class="main">' + admtop("Tổng quan", btn("Xuất báo cáo", "ghost sm", "export")) +
            '<div class="note" style="color:var(--ink2);font-size:12px">Đợt 05 đang mở · '
            'đóng sau 5 giờ 42 phút</div>'
            '<div class="kpis">%s</div>' % kpis +
            '<div class="panel"><div class="hd"><h2>Doanh thu 14 ngày gần nhất</h2>'
            '<div class="rt"><span class="badge flat" style="padding:3px 9px">14 ngày</span>'
            '<span class="badge flat" style="padding:3px 9px">30 ngày</span></div></div>'
            '<div class="chart"><div class="heroN">88.300.000₫</div>'
            '<div class="heroL">tổng 14 ngày · ngày cao nhất 19/09 đạt 9.600.000₫</div>'
            '<div class="plot">%s</div><div class="xax">%s</div>'
            '<details><summary>Xem dạng bảng</summary>'
            '<table style="margin-top:10px"><thead><tr><th>Ngày</th>'
            '<th class="num">Doanh thu</th></tr></thead><tbody>%s</tbody></table></details>'
            '</div></div>' % (bars, xax, tbl) +
            '<div style="display:grid;grid-template-columns:1.55fr 1fr;gap:16px">'
            '<div class="panel" style="margin-top:16px"><div class="hd"><h2>Đơn mới nhất</h2>'
            '<div class="rt"><span class="lnk" style="font-size:11.5px">Xem tất cả</span></div></div>'
            '<table><thead><tr><th>Mã đơn</th><th>Khách</th><th>Thời gian</th>'
            '<th class="num">Giá trị</th><th>Trạng thái</th></tr></thead>'
            '<tbody>%s</tbody></table></div>'
            '<div class="panel" style="margin-top:16px"><div class="hd">'
            '<h2>Sắp hết hàng</h2></div>%s</div>'
            '</div></div>' % (orders, low))


def sc_product_edit():
    BUI = next(x for x in CATALOG if x["ten"] == "BỤI")
    sizes = "".join(
        '<tr><td><b>%s</b></td><td><div class="inp" style="width:78px">%s</div></td>'
        '<td><div class="inp" style="width:78px">%s</div></td><td>%s</td></tr>'
        % (s, cut, sold, badge(st, t))
        for s, cut, sold, st, t in (("S", "40", "40", "Hết", "hot"),
                                    ("M", "60", "54", "Còn 6", ""),
                                    ("L", "60", "51", "Còn 9", ""),
                                    ("XL", "40", "38", "Còn 2", "hot")))
    return (side("Sản phẩm") +
            '<div class="main">' +
            admtop("Sửa: BỤI",
                   btn("Huỷ", "ghost sm", "x") + btn("Lưu thay đổi", "sm", "confirm")) +
            '<div style="display:grid;grid-template-columns:1.5fr 1fr;gap:16px">'
            '<div><div class="panel"><div class="hd"><h2>Thông tin cơ bản</h2></div>'
            '<div class="fgrid">'
            '<div class="full"><label>Tên sản phẩm</label><div class="inp">BỤI</div></div>'
            '<div><label>Loại</label><div class="inp sel">Áo hoodie %s</div></div>'
            '<div><label>Mã sản phẩm</label><div class="inp">D5-BUI</div></div>'
            '<div><label>Giá bán</label><div class="inp">890.000₫</div></div>'
            '<div><label>Đợt</label><div class="inp sel">Đợt 05 %s</div></div>'
            '<div class="full"><label>Mô tả</label>'
            '<div class="inp area">Nỉ bông 380gsm, không xù. Form oversize, rộng hơn một size '
            'so với thường.</div></div>'
            '</div></div>'
            '<div class="panel"><div class="hd"><h2>Tồn kho theo size</h2>'
            '<div class="rt"><span class="note">đã cắt %d · còn %d</span></div></div>'
            '<table><thead><tr><th>Size</th><th>Đã cắt</th><th>Đã bán</th>'
            '<th>Trạng thái</th></tr></thead><tbody>%s</tbody></table></div></div>'
            '<div><div class="panel" style="margin-top:0"><div class="hd"><h2>Ảnh</h2>'
            '<div class="rt"><span class="lnk" style="font-size:11.5px">Tải lên</span></div></div>'
            '<div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px">%s'
            '<div style="aspect-ratio:4/5;border:1px dashed var(--line);border-radius:6px;'
            'display:flex;align-items:center;justify-content:center;color:var(--ink2);'
            'font-size:11px;flex-direction:column;gap:6px">%s Thêm ảnh</div></div></div>'
            '<div class="panel"><div class="hd"><h2>Hiển thị</h2></div>'
            '<div style="padding:16px">'
            '<div style="display:flex;gap:10px;align-items:center;font-size:12px">'
            '<span style="width:38px;height:22px;border-radius:99px;background:var(--fill);'
            'position:relative;flex:none"><span style="position:absolute;right:2px;top:2px;'
            'width:18px;height:18px;border-radius:99px;background:#fff"></span></span>'
            'Đang bán trên cửa hàng</div>'
            '<div class="note" style="margin-top:10px">Khi tắt, sản phẩm vẫn còn trong đợt '
            'nhưng không hiện ở lưới.</div></div></div></div>'
            '</div></div>'
            % (icon("chev", "ic sm"), icon("chev", "ic sm"),
               BUI["cat"], BUI["conTong"], sizes,
               "".join('<div class="ph" style="aspect-ratio:4/5"><img src="%s" alt="" /></div>'
                       % im(k, 300, 62) for k in ("bui", "suong", "muoi")),
               icon("plus", "ic sm")))


def sc_order_adm():
    return (side("Đơn hàng") +
            '<div class="main">' +
            admtop("#DH-2431",
                   btn("In phiếu giao", "ghost sm", "printer") + btn("Đánh dấu đã thanh toán", "sm", "confirm")) +
            '<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:16px">'
            '<div><div class="panel" style="margin-top:0"><div class="hd"><h2>Món trong đơn</h2>'
            '<div class="rt">%s</div></div>'
            '<table><thead><tr><th>Sản phẩm</th><th>Size</th><th class="num">SL</th>'
            '<th class="num">Đơn giá</th><th class="num">Thành tiền</th></tr></thead><tbody>%s'
            '</tbody></table>'
            '<div style="padding:13px 16px;border-top:1px solid var(--hair);'
            'display:flex;justify-content:flex-end;gap:34px;font-size:12.5px">'
            '<span style="color:var(--ink2)">Tạm tính 1.340.000₫ · Ship 0₫</span>'
            '<b style="font-size:14px">Tổng 1.340.000₫</b></div></div>'
            '<div class="panel"><div class="hd"><h2>Lịch sử đơn</h2></div>'
            '<div style="padding:16px"><div class="tl" style="margin:0">'
            '<div class="it now"><span class="gut"><span class="dot"></span>'
            '<span class="stem"></span></span><span class="bd"><span class="t">Chờ chuyển khoản</span>'
            '<span class="d">19/09 · 21:04 · nội dung cần có “DH2431”</span></span></div>'
            '<div class="it done"><span class="gut"><span class="dot"></span></span>'
            '<span class="bd"><span class="t">Khách đặt đơn</span>'
            '<span class="d">19/09 · 21:04 · từ điện thoại</span></span></div>'
            '</div></div></div></div>'
            '<div><div class="panel" style="margin-top:0"><div class="hd"><h2>Khách hàng</h2></div>'
            '<div style="padding:16px;font-size:12.5px;line-height:1.7">'
            '<b>%s</b><br/><span class="note">%s<br/>%s</span>'
            '<div style="margin-top:10px">%s</div></div></div>'
            '<div class="panel"><div class="hd"><h2>Giao tới</h2></div>'
            '<div style="padding:16px;font-size:12.5px;line-height:1.7">%s<br/>%s'
            '<div class="note" style="margin-top:10px">Giao tiêu chuẩn · 2–4 ngày · miễn phí</div>'
            '</div></div>'
            '<div class="panel"><div class="hd"><h2>Thanh toán</h2></div>'
            '<div style="padding:16px;font-size:12.5px">Chuyển khoản ngân hàng'
            '<div style="margin-top:9px">%s</div></div></div></div>'
            '</div></div>'
            % (badge("Chờ chuyển khoản", "warn"),
               "".join('<tr><td><span class="cellrow"><span class="pill">'
                       '<img src="%s" alt="" /></span><b class="nm">%s</b></span></td>'
                       '<td>%s</td><td class="num">%s</td><td class="num">%s</td>'
                       '<td class="num">%s</td></tr>'
                       % (im(k, 120, 60), n, sz, q, p, tt)
                       for k, n, sz, q, p, tt in (
                           ("bui", "BỤI", "M", "1", "890.000₫", "890.000₫"),
                           ("nang", "NẮNG", "L", "1", "450.000₫", "450.000₫"))),
               CUST["ten"], CUST["mail"], CUST["sdt"],
               badge("Khách quay lại · 3 đơn", "flat", False),
               CUST["dc"], CUST["pxq"],
               badge("Chưa nhận được tiền", "warn")))


def page_system():
    ramp = [("50", "#FDF9F2"), ("100", "#FBF1DA"), ("200", "#FBE8BC"), ("300", "#F7D98E"),
            ("400", "#F1C04A"), ("500", "#EBA400"), ("600", "#C28800"), ("700", "#9E6817"),
            ("800", "#6E4A12"), ("900", "#211D12")]
    sw = "".join('<span class="sw"><i style="background:%s"></i>%s<br/>gold-%s</span>' % (h, h, k)
                 for k, h in ramp)
    roles = [
        ("Màu chủ đạo · dạng mảng", "primary fill", "#EBA400", "gold-500",
         "Nền nút chính, chip đang chọn, size đang chọn, chấm giỏ hàng. Chữ đặt lên là mực sẫm."),
        ("Vòng focus bàn phím", "ring", "#C28800", "gold-600",
         "Chỉ hiện khi đi bằng phím Tab. Đây là outline duy nhất còn lại trong hệ."),
        ("Dấu mốc", "mark", "#C28800", "gold-600",
         "Cột biểu đồ, chấm mốc thời gian, vòng chọn. Chỉ là hình khối nên cần 3:1."),
        ("Dải thông tin đợt", "surface", "#FBE8BC", "gold-200",
         "Mật ong pha loãng. Nhạt hơn nút nhiều bậc để nút vẫn là thứ nổi nhất màn hình."),
        ("Màu chủ đạo · dạng chữ", "primary text", "#9E6817", "gold-700",
         "Liên kết và chữ nhấn. Vàng thuần không làm chữ được — phải xuống tới nâu mật "
         "mới đạt 4,72:1. Đây là bậc sáng nhất còn đọc được."),
        ("Nền chỗ đặt ảnh", "surface", "#FBF1DA", "gold-100",
         "Ô ảnh khi ảnh chưa tải xong, ảnh nhỏ, avatar."),
        ("Chữ chính", "neutral ink", "#211D12", "gold-900",
         "Toàn bộ chữ chính, và chữ đặt trên mảng vàng. Đen ngả nâu, không phải đen ngả xanh."),
        ("Chữ phụ", "neutral muted", "#71674E", "—", "Mô tả, nhãn, chú thích."),
        ("Sắp hết / lỗi", "semantic", "#B61E32", "—",
         "Đỏ thẫm. Trước đây là sắc gỉ, nhưng gỉ nằm cùng họ cam-vàng nên sẽ chìm vào "
         "màu thương hiệu — phải đẩy hẳn sang đỏ mới bắt mắt trở lại."),
        ("Xong", "semantic", "#1B6B3A", "—", "Đã giao, đã thanh toán."),
        ("Chờ", "semantic", "#44505E", "—",
         "Xám. Trạng thái chờ vốn hay dùng vàng, nhưng vàng nay là màu thương hiệu."),
        ("Đang chạy", "semantic", "#0C6289", "—",
         "Xanh. Là nhãn trạng thái, không phải màu thương hiệu, nên vẫn giữ."),
    ]
    rtbl = "".join(
        '<tr><td><span style="display:inline-block;width:22px;height:22px;border-radius:5px;'
        'background:%s;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);vertical-align:-6px"></span></td>'
        '<td><b>%s</b><br/><span class="note">%s</span></td>'
        '<td style="font-family:ui-monospace,Consolas,monospace;font-size:11.5px">%s<br/>'
        '<span class="note">%s</span></td><td>%s</td></tr>'
        % (hx, vn, en, hx, tok, use) for vn, en, hx, tok, use in roles)

    btns = ('<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
            '<div style="width:150px">%s</div><div style="width:150px">%s</div>'
            '<div style="width:150px">%s</div><div style="width:150px">%s</div></div>'
            % (btn("Thêm vào giỏ", "", "bag"), btn("Xem %s" % so_mau(), "ghost", "chev"),
               btn("Đăng xuất", "quiet", "logout"), btn("Chưa dùng được", "off")))
    bdgs = " ".join((badge("Đang giao"), badge("Đã giao", "ok"), badge("Chờ xử lý", "warn"),
                     badge("Đã huỷ", "hot"), badge("Đợt 05", "flat", False)))
    flds = ('<div style="max-width:330px">%s%s</div>'
            % (field("Ô nhập bình thường", "Trần Minh Anh"),
               field("Ô nhập có lỗi", "minhanh@email", err="Email này thiếu phần sau dấu chấm.",
                     kind="bad")))
    chps = ('<div class="chips" style="padding:0;flex-wrap:wrap">'
            '<span class="chip on">Đang chọn</span><span class="chip">Chưa chọn</span>'
            '<span class="chip">Oversize</span><span class="chip">Dưới 500k</span></div>')

    def demo(title, note, inner):
        return ('<figure><figcaption><div class="n">%s</div><div class="d">%s</div></figcaption>'
                '<div class="frame m" style="width:390px"><div class="s" '
                'style="padding:18px">%s</div></div></figure>' % (title, note, inner))

    ROLE_VN = {
        "search": "Tìm kiếm", "bag": "Giỏ hàng", "back": "Quay lại", "chev": "Đi tiếp",
        "user": "Tài khoản", "heart": "Yêu thích", "pin": "Địa chỉ", "truck": "Vận chuyển",
        "check": "Đã xong", "plus": "Thêm", "minus": "Bớt", "x": "Lỗi nhập liệu",
        "info": "Ghi chú", "grid": "Tổng quan", "chart": "Doanh thu", "box": "Sản phẩm",
        "tag": "Khuyến mãi", "people": "Khách hàng", "filter": "Lọc", "sort": "Sắp xếp",
        "edit": "Sửa", "eye": "Xem",
    }
    # Duotone chỉ có nghĩa với icon CÓ RUỘT. Mũi tên, cộng, trừ, sắp xếp khi Bulk hoá
    # chỉ còn là một khối đặc — không nhận ra được, nên không có bản duotone.
    DUO_OK = {"bag", "box", "heart", "search", "user", "pin", "truck", "tag", "people",
              "chart", "grid", "eye", "check", "info", "x", "edit", "filter"}
    cell = lambda k, d: (
        '<span style="color:var(--ink2);font-size:11px">—</span>' if (d and k not in DUO_OK)
        else '<span style="display:flex;width:22px;height:22px;color:%s">%s</span>'
             % ("var(--link)" if d else "var(--ink)", icon(k, "duo" if d else "", d)))
    icon_rows = "".join(
        '<tr><td style="width:44px">%s</td><td style="width:44px">%s</td><td>%s</td>'
        '<td style="font-family:ui-monospace,Consolas,monospace;font-size:11.5px">%s</td></tr>'
        % (cell(k, False), cell(k, True), ROLE_VN[k], ICONSAX_IMPORT[k])
        for k in sorted(ROLE_VN))

    header = (
        '<header><h1>Hệ thiết kế</h1>'
        '<p>Nền <b>trắng tinh</b>. Màu chủ đạo là <b>mật ong <code>#EBA400</code></b>, nằm ở <b>element</b>: nút, dải, nhãn, ô đang chọn.</p>'
        '<p><b>Quy tắc viền:</b> nút có nền thì viền trùng màu nền nên không nhìn thấy viền; nút không nền thì viền màu chủ đạo; trạng thái không dùng được giữ viền đứt. Ngoài vòng focus bàn phím, trong hệ không còn outline nào.'
        'Bo góc <b>6px</b> cho mọi element; riêng ảnh bìa và ảnh lớn tràn hết bề ngang thì '
        'không bo, vì góc nằm ngoài màn hình.</p>'
        '<p><b>Trả lời câu bạn hỏi:</b> màu chủ đạo của một web, tiếng Anh trong ngành gọi là '
        '<b>primary color</b> (hoặc <i>brand color</i>). Màu dùng ít để làm nổi một thứ gọi là '
        '<b>accent color</b>. Nhóm trắng/xám/đen làm nền và chữ gọi là <b>neutral</b>. '
        'Màu mang nghĩa cố định — xong, chờ, lỗi — gọi là <b>semantic color</b>. '
        'Cả bộ gọi là <b>color palette</b> (bảng màu); khi viết vào code thì mỗi giá trị là một '
        '<b>design token</b>.</p>'
        '<p>Một primary color thật sự không phải một mã màu đơn lẻ mà là một <b>thang</b> '
        '(<i>ramp</i>/<i>scale</i>) từ 50 đến 900, để có sẵn màu cho trạng thái di chuột, '
        'nhấn giữ, và nền nhạt. Thang của bạn ở ngay dưới.</p></header>')

    body = (
        grp("Thang màu chủ đạo", "Đánh số theo thông lệ 50 → 900. Số càng lớn càng thẫm. "
            "Vàng sáng nên phải xuống tận gold-700 mới đủ tương phản làm chữ trên nền trắng; "
            "từ gold-600 trở xuống chỉ làm nền và viền.",
            ['<div style="display:flex;flex-wrap:wrap;gap:18px;justify-content:center;'
             'max-width:1100px;margin:0 auto">%s</div>' % sw]) +
        '<section class="grp"><h2>Vai trò từng màu</h2>'
        '<p class="lede">Mỗi màu có đúng một việc. Không dùng chéo.</p>'
        '<div class="row"><div class="frame w" style="width:980px"><div class="s adm">'
        '<div class="main" style="padding:0"><div class="panel" style="margin:0;border:0">'
        '<table><thead><tr><th style="width:44px"></th><th>Vai trò</th><th>Giá trị</th>'
        '<th>Dùng ở đâu</th></tr></thead><tbody>%s</tbody></table></div></div></div></div></div>'
        '</section>' % rtbl +
        '<section class="grp"><h2>Bộ icon</h2>'
        '<p class="lede">Iconsax, biến thể <b>Linear</b> — một bộ duy nhất, một độ dày nét duy '
        'nhất (1,5 trên lưới 24px). Bản dựng thật import thẳng component React từ '
        '<code>iconsax-react</code>; bản mock này nhúng đúng path của chúng.</p>'
        '<p class="lede">Cột <b>Duotone</b> là biến thể <code>Bulk</code>, chỉ dùng cho <b>trạng thái đang bật</b>: mục đang mở ở thanh bên quản trị, túi khi giỏ có món, icon trong trạng thái rỗng, và dấu tích ở trang xác nhận đơn. Không rải nó ra chỗ khác — hết đối lập là hết tác dụng.</p>'
        '<p class="lede"><b>Màu icon luôn thừa hưởng màu chữ</b> của chỗ nó đứng: nút viền, nút nền nhạt, mục thanh bên, nhãn trạng thái. Chỉ icon đứng một mình, không có nhãn đi kèm — như túi giỏ hàng ở thanh nav — mới tự mang màu riêng.</p>'
        '<div class="row"><div class="frame w" style="width:980px"><div class="s adm">'
        '<div class="main" style="padding:0"><div class="panel" style="margin:0;border:0">'
        '<table><thead><tr><th>Nét</th><th>Duotone</th><th>Dùng cho</th>'
        '<th>Import từ iconsax-react</th></tr></thead><tbody>%s</tbody></table>'
        '</div></div></div></div></section>' % icon_rows +
        grp("Nếu vẫn chưa đúng độ sáng",
            "Cùng một nút, ba độ sáng liền kề. Nói số bậc bạn muốn — tôi đổi một dòng "
            "là cả 22 màn đổi theo.",
            ['<div class="row">%s</div>' % "".join(
                '<figure><figcaption><div class="n">%s</div><div class="d">%s</div></figcaption>'
                '<div class="frame m" style="width:250px"><div class="s" style="padding:20px">'
                '<div class="btn" style="background:%s;border-color:%s">Thêm vào giỏ</div>'
                '</div></div></figure>' % (nm, note, bg, bd)
                for nm, note, bg, bd in (
                    ("gold-400 · #F1C04A", "nhạt hơn một bậc · chữ đạt 11,3:1",
                     "#F1C04A", "#F1C04A"),
                    ("gold-500 · #EBA400", "đang dùng · chữ đạt 7,88:1", "#EBA400", "#EBA400"),
                    ("gold-600 · #C28800", "đậm hơn một bậc · chữ đạt 5,0:1",
                     "#C28800", "#C28800")))]) +
        grp("Các mảnh dựng", "Đây là toàn bộ vốn từ của giao diện. 43 màn hình sau chỉ "
            "ghép lại từ những mảnh này.",
            [demo("Nút", "Nút đặc thì viền trùng màu nền nên không thấy viền. Nút rỗng thì viền màu chủ đạo. Không dùng được thì viền đứt.", btns),
             demo("Nhãn trạng thái", "Luôn có chữ, không bao giờ chỉ có màu.", bdgs),
             demo("Ô nhập", "Viền đạt 3:1 để nhìn thấy rõ viền ô.", flds),
             demo("Chip lọc", "Cùng quy tắc đó: chọn rồi thì đặc, chưa chọn thì rỗng và viền màu chủ đạo.", chps),
             demo("Hàng chọn size", "Size hết bị gạch ngang — không chỉ nhạt đi, vì nhạt là "
                  "dấu hiệu chỉ dựa vào màu.", '<div style="margin:0 -18px">%s</div>' % szrow()),
             demo("Các bước thanh toán", "Bước đã qua hiện dấu tích, bước đang làm hiện số, "
                  "bước chưa tới là ô mật ong nhạt.",
                  '<div style="margin:0 -18px">%s</div>' % steps(1)),
             demo("Dải thông tin đợt", "Mật ong pha loãng, chữ sẫm đè lên.",
                  '<div style="margin:0 -18px">%s</div>' % band()),
             demo("Thẻ sản phẩm",
                  "Băng ảnh vuốt theo màu. Chỉ hai thứ được phép lên tiếng: "
                  "số còn lại khi đã ≤3, và dòng liệt kê size đã hết.",
                  '<div style="width:170px">%s</div>' % card("bui", 400)),
             demo("Tấm trượt chọn size",
                  "Nút trên thẻ mở tấm này. Chỗ duy nhất đủ rộng để nói số còn "
                  "lại của từng size, và nhắc lại màu vừa vuốt tới.",
                  '<div style="margin:0 -18px">%s</div>' % sheet_size("cat"))]))
    return page("he-thong.html", "Hệ thiết kế", header, body)


# ═══════════════════════════════════════════════════════════════ dựng các trang
def build():
    with io.open(os.path.join(OUT, "sys.css"), "w", encoding="utf-8") as f:
        f.write(CSS + X.CSS + Y.CSS + Z.CSS)
    with io.open(os.path.join(OUT, "sheet.css"), "w", encoding="utf-8") as f:
        f.write(SHEET)

    # ---------- A. mua hàng ----------
    hdr = ('<header><h1>Luồng mua hàng</h1>'
           '<p>Mười ba màn hình, từ lúc mở web tới lúc đơn được ghi nhận. '
           'Điện thoại là bản gốc; hai màn hình máy tính ở cuối trang.</p>'
           '<p>Đường đứt nét trong khung là <b>đáy màn hình điện thoại</b> — phía trên nó là '
           'thứ khách thấy ngay khi mở, chưa cần cuộn.</p></header>')
    figs_m = [
        fig("1 · Trang chủ", "Ảnh chiếm trọn màn hình đầu. Dải đợt và đếm ngược nằm dưới ảnh.",
            frame(sc_home())),
        fig("2 · Danh mục", "Bộ lọc là chip, không phải ngăn kéo. Mẫu hết hàng vẫn hiện, phủ mờ.",
            frame(sc_listing())),
        fig("3 · Bộ lọc", "Chip “Lọc” mở ra tấm này. Nút dưới đáy nói luôn còn bao nhiêu mẫu.",
            frame(X.sc_filter(), fold=False)),
        fig("4 · Tìm kiếm", "Kết quả hiện ngay dưới ô tìm.", frame(sc_search())),
        fig("5 · Tìm không ra", "Trạng thái rỗng nói rõ đợt này có gì, thay vì chỉ báo lỗi.",
            frame(sc_search_empty())),
        fig("6 · Trang sản phẩm", "Bảng size đầy đủ chỉ xuất hiện ở đây. Size hết bị gạch ngang.",
            frame(sc_pdp())),
        fig("7 · Bảng size", "Số đo của áo, không phải của người — và nói rõ cách đo.",
            frame(X.sc_sizeguide(), fold=False)),
        fig("8 · Sản phẩm đã hết", "Nút chính đổi vai: không mua được thì báo khi có lại.",
            frame(X.sc_pdp_sold())),
        fig("9 · Giỏ hàng", "Nói thẳng: giỏ hàng không giữ chỗ tồn kho.", frame(sc_cart())),
        fig("10 · Giỏ có món vừa hết", "Hệ quả thật của câu trên. Không cho đi tiếp cho tới "
            "khi xử lý xong.", frame(X.sc_cart_snag())),
        fig("11 · Giỏ rỗng", "Gợi lại mẫu đã xem thay vì để trống.", frame(sc_cart_empty())),
        fig("12 · Thanh toán", "Một trang duy nhất. Địa chỉ theo Tỉnh → Quận → Phường.",
            frame(sc_checkout())),
        fig("13 · Xác nhận đơn", "Hiện ngay số tiền cần chuyển và nội dung chuyển khoản.",
            frame(sc_done())),
    ]
    figs_drop = [
        fig("1a · Đợt chưa mở", "Giá và số lượng chưa công bố. Việc duy nhất làm được là đặt nhắc.",
            frame(X.sc_home_soon())),
        fig("1b · Đợt đang mở", "Trạng thái ở màn 1 — đặt cạnh đây để so ba trạng thái.",
            frame(sc_home())),
        fig("1c · Đợt đã đóng", "Đóng là đóng hẳn. Đây là trạng thái sống lâu nhất của trang chủ.",
            frame(X.sc_home_closed())),
    ]
    figs_w = [
        fig("Trang chủ · máy tính", "Cùng hệ, lưới ba cột.", frame(sc_home_w(), "w"), True),
        fig("Trang sản phẩm · máy tính", "Ảnh bên trái, quyết định bên phải.",
            frame(sc_pdp_w(), "w"), True),
    ]
    body = (grp("Trên điện thoại", "Thiết bị chính. Mọi quyết định bố cục đúng ở đây trước.",
                figs_m)
            + grp("Ba trạng thái của một đợt",
                  "PRODUCT.md nêu ba trạng thái: sắp mở, đang mở, đã đóng. Cùng một trang chủ, "
                  "ba việc khác nhau mà khách làm được.", figs_drop)
            + grp("Trên máy tính", "Màn hình phụ, mở rộng từ cùng một hệ.", figs_w))
    page("khach.html", "Mock · Luồng mua hàng", hdr, body)

    # ---------- B. tài khoản ----------
    hdr = ('<header><h1>Tài khoản khách hàng</h1>'
           '<p>Mười lăm màn hình. Đây là nơi khách quay lại sau khi mua — nên ưu tiên '
           '<b>trả lời nhanh một câu hỏi</b>: đơn của tôi tới đâu rồi?</p></header>')
    figs = [
        fig("14 · Đăng nhập", "Có lối “mua không cần tài khoản” để không chặn người mua lần đầu.",
            frame(sc_login())),
        fig("15 · Đăng ký", "Đang hiện trạng thái lỗi để bạn xem cách báo lỗi.",
            frame(sc_signup())),
        fig("16 · Quên mật khẩu", "Liên kết này trước đây bấm vào không ra gì.",
            frame(X.sc_forgot())),
        fig("17 · Đã gửi liên kết", "Nói rõ gửi đi đâu, và bao giờ gửi lại được.",
            frame(X.sc_forgot_sent())),
        fig("18 · Trang tài khoản", "Cửa vào của mọi mục. Đợt đang mở hiện ngay trên cùng.",
            frame(sc_account())),
        fig("19 · Thông tin cá nhân", "Xoá tài khoản nói rõ cái gì mất, cái gì được giữ.",
            frame(X.sc_profile())),
        fig("20 · Đổi mật khẩu", "Điều kiện hiện ngay khi gõ, không đợi bấm mới báo lỗi.",
            frame(Y.sc_password())),
        fig("21 · Lịch sử đơn", "Trạng thái là nhãn có chữ, không chỉ có màu.", frame(sc_orders())),
        fig("22 · Chi tiết đơn", "Dòng thời gian trả lời “tới đâu rồi” trong một cái liếc.",
            frame(sc_order_detail())),
        fig("23 · Đơn đã huỷ", "Nói thẳng vì sao huỷ, và rằng không có gì để hoàn.",
            frame(Y.sc_order_cancelled())),
        fig("24 · Theo dõi vận chuyển", "Đối tác vận chuyển chưa chốt nên ghi rõ là chưa có.",
            frame(sc_track())),
        fig("25 · Sổ địa chỉ", "Địa chỉ mặc định được điền sẵn ở bước thanh toán.",
            frame(sc_address())),
        fig("26 · Thêm địa chỉ", "Nút “Thêm mới” và “Sửa” trước đây chưa dẫn tới đâu.",
            frame(X.sc_address_form())),
        fig("27 · Yêu thích", "Báo ngay mẫu nào trong danh sách sắp hết.", frame(sc_wishlist())),
        fig("28 · Yêu thích rỗng", "Nói rõ cách lưu và lợi ích của việc lưu.",
            frame(sc_wishlist_empty())),
    ]
    page("taikhoan.html", "Mock · Tài khoản", hdr,
         grp("Trên điện thoại", "Khách xem đơn chủ yếu bằng điện thoại.", figs))

    # ---------- C. quản trị ----------
    hdr = ('<header><h1>Khu quản trị</h1>'
           '<p>Mười màn hình, dựng cho <b>máy tính</b> vì đây là chỗ làm việc, không phải chỗ mua. '
           'Ưu tiên quét nhanh và thao tác hàng loạt hơn là biểu đồ đẹp.</p>'
           '<p><b>Mọi con số đều là dữ liệu mô phỏng</b> và được đánh dấu như vậy ngay trên '
           'màn hình — dự án chưa có số liệu bán hàng thật nào.</p></header>')
    figs = [
        fig("29 · Tổng quan", "Một biểu đồ một chuỗi nên không cần chú giải; "
            "có kèm bảng số để đọc không phụ thuộc màu.", fadm(sc_dash()), True),
        fig("30 · Đợt bán", "PRODUCT.md yêu cầu mở và đóng đợt từ đây. Đóng là đóng hẳn.",
            fadm(X.sc_drops()), True),
        fig("31 · Sản phẩm", "Tồn kho theo size hiện ngay ở bảng.", fadm(sc_products()), True),
        fig("32 · Thêm sản phẩm", "Số lượng cắt khoá lại khi đợt mở — nói rõ ngay ở form.",
            fadm(Y.sc_product_new()), True),
        fig("33 · Sửa sản phẩm", "Tồn kho tách theo size: đã cắt / đã bán / còn.",
            fadm(sc_product_edit()), True),
        fig("34 · Đơn hàng", "Chọn nhiều đơn để xử lý hàng loạt.", fadm(sc_orders_adm()), True),
        fig("35 · Chi tiết đơn", "Mọi thứ cần để đóng gói và đối soát nằm trên một màn.",
            fadm(sc_order_adm()), True),
        fig("36 · Khách hàng", "Nhóm khách để biết ai nên được báo trước khi mở đợt.",
            fadm(sc_customers()), True),
        fig("37 · Chi tiết khách hàng", "Mở từ bảng trên. Trước đây hàng khách bấm vào "
            "không ra gì.", fadm(X.sc_customer()), True),
        fig("38 · Khuyến mãi", "Tạo mã ngay dưới bảng, không cần mở trang khác.",
            fadm(sc_promo()), True),
    ]
    page("admin.html", "Mock · Quản trị", hdr,
         grp("Trên máy tính", "Chiều rộng dựng ở 1280px.", figs))

    # ---------- D. nội dung & hỗ trợ ----------
    hdr = ('<header><h1>Nội dung &amp; hỗ trợ</h1>'
           '<p>Năm màn hình. Nhóm này <b>nằm ngoài phạm vi bạn chốt lúc phỏng vấn</b> — '
           'lúc đó bạn chủ động không chọn. Tôi dựng vì bạn bảo làm nốt phần còn thiếu.</p>'
           '<p><b>Chỗ nào chưa chốt thì để trống có nhãn, không bịa.</b> PRODUCT.md ghi rõ '
           'câu chuyện thương hiệu, xưởng may và kênh liên hệ đều chưa quyết. Những chỗ đó '
           'hiện thành ô viền đứt nói rõ cần viết gì — vừa trung thực, vừa thành danh sách '
           'việc cho bạn.</p></header>')
    figs = [
        fig("39 · Giới thiệu", "Phần nói được thì viết thật; phần chưa chốt để thành ô trống "
            "có nhãn.", frame(Y.sc_about())),
        fig("40 · Câu hỏi thường gặp", "Sáu câu trả lời đúng theo mô hình bán đợt.",
            frame(Y.sc_faq())),
        fig("41 · Chính sách đổi trả", "Nói cả cái không đổi trả được, không chỉ cái được.",
            frame(Y.sc_policy())),
        fig("42 · Liên hệ", "Ba kênh liên hệ đang trống thật, chờ bạn điền.",
            frame(Y.sc_contact())),
        fig("43 · Không tìm thấy trang", "Lý do gắn với mô hình đợt, không phải câu lỗi chung "
            "chung.", frame(Y.sc_404())),
    ]
    page("noidung.html", "Mock · Nội dung & hỗ trợ", hdr,
         grp("Trên điện thoại", "Cùng một hệ với phần còn lại.", figs))

    # ---------- hệ thiết kế + mục lục ----------
    page_system()

    idx_hdr = (
        '<header><h1>Mock UI — 43 màn hình</h1>'
        '<p>Toàn bộ giao diện dựng trong hệ đã chốt: <b>nền trắng, element màu mật ong, '
        'bo góc 6px</b>. Đây là bản mock để bạn duyệt — <b>chưa có dòng code nào được viết '
        'vào dự án</b>.</p>'
        '<p>Ảnh là ảnh tạm từ Unsplash, chỉ để nhìn được bố cục. Mỗi khe ảnh thay bằng ảnh '
        'của bạn chỉ tốn một dòng.</p>'
        '<p>Mọi cặp chữ/nền đã được tính tay và đạt <b>WCAG AA</b> (≥ 4,5:1). '
        'Số liệu trong khu quản trị là <b>mô phỏng</b> và được đánh dấu rõ trên màn hình.</p>'
        '</header>')
    cards_idx = "".join(
        '<a href="%s"><div class="t">%s</div><div class="c">%s</div>'
        '<div class="d">%s</div><span class="go">Mở</span></a>'
        % (h, t, c, d)
        for h, t, c, d in (
            ("he-thong.html", "Hệ thiết kế", "bảng màu + mảnh dựng",
             "Thang màu chủ đạo, vai trò từng màu, bộ icon, và toàn bộ mảnh dựng."),
            ("khach.html", "Luồng mua hàng", "13 màn + 2 bản máy tính",
             "Trang chủ (ba trạng thái đợt), danh mục, bộ lọc, tìm kiếm, trang sản phẩm, bảng size, giỏ hàng, thanh toán, xác nhận đơn."),
            ("taikhoan.html", "Tài khoản", "15 màn",
             "Đăng nhập, đăng ký, quên mật khẩu, hồ sơ, thông tin cá nhân, lịch sử đơn, "
             "chi tiết đơn, theo dõi giao hàng, sổ địa chỉ, yêu thích."),
            ("admin.html", "Khu quản trị", "10 màn · máy tính",
             "Tổng quan doanh thu, quản lý đợt bán, sản phẩm, đơn hàng, chi tiết đơn, "
             "khách hàng và hồ sơ khách, khuyến mãi."),
            ("noidung.html", "Nội dung & hỗ trợ", "5 màn · ngoài phạm vi ban đầu",
             "Giới thiệu, câu hỏi thường gặp, chính sách đổi trả, liên hệ, và trang "
             "không tìm thấy.")))
    page("index.html", "Mock UI — 43 màn hình", idx_hdr,
         '<section class="grp"><h2>Năm nhóm</h2>'
         '<p class="lede">Bấm vào từng nhóm để xem đầy đủ. Bản mock chạy trong trình duyệt, '
         'không phải ảnh chụp — bạn phóng to thu nhỏ được.</p>'
         '<div class="navcards">%s</div><div style="height:30px"></div></section>' % cards_idx)

    print("built:", ", ".join(sorted(os.listdir(OUT))))


build()
