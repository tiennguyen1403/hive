# -*- coding: utf-8 -*-
"""Dựng bản chạy thử bấm được (HTML + CSS + JS thuần) từ 43 màn mock.

Không vẽ lại gì cả. Nó lấy đúng các hàm dựng màn của bản mock rồi:
  1. đổi <div class="btn"> thành <button>, <div class="inp"> thành ô nhập thật
     (input / select / textarea) — để gõ được, Tab được, bấm được;
  2. gắn móc (class, data-*) cho những chỗ app.js cần cầm vào;
  3. bọc mỗi màn trong một vỏ xem: khung điện thoại trên máy tính, tràn màn
     hình trên điện thoại, kèm thanh công cụ tối ở đáy để nhảy giữa các màn.

Hệ thiết kế vẫn chỉ có MỘT nguồn là mocklib.py. Sửa màu ở đó thì cả bản mock
lẫn bản chạy thử cùng đổi.
"""
import io
import os
import re
import json
import time
from urllib.parse import quote

import gen_mock as G          # nạp vào là dựng lại bản mock — vô hại
import screens2 as X
import screens3 as Y
import screens4 as Z
import screens5 as W
import screens6 as V
import mocklib as M
from icons_iconsax import PATHS

# Dựng ra thư mục CHA của file này: đặt bộ sinh ở prototype/src/ thì trang
# chạy thử rơi đúng vào prototype/. Đặt MOCK_OUT để bắt nó ghi chỗ khác.
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("MOCK_OUT") or os.path.abspath(os.path.join(HERE, os.pardir))
os.makedirs(OUT, exist_ok=True)

# ═══════════════════════════════════════════════════════ danh sách màn
# slug, số thứ tự, tên, nhóm, kiểu khung, hàm dựng, một câu mô tả
# kiểu: m = điện thoại · pc = máy tính (khách) · adm = máy tính (quản trị)
SCREENS = [
    # ── A · mua hàng
    ("trang-chu", "1", "Trang chủ", "mua", "m", G.sc_home,
     "Đợt đang mở, đếm ngược, mười mẫu của đợt."),
    ("danh-muc", "2", "Danh mục", "mua", "m", G.sc_listing,
     "Chip lọc, mẫu hết hàng vẫn hiện và phủ mờ."),
    ("bo-loc", "3", "Bộ lọc", "mua", "sheet", X.sc_filter,
     "Tấm trượt lên từ đáy trang danh mục."),
    ("chon-size", "", "Chọn size", "mua", "sheet", X.sc_chonsize,
     "Nút trên thẻ sản phẩm mở tấm này: màu đang xem, và số còn lại từng size."),
    ("tim-kiem", "4", "Tìm kiếm", "mua", "m", G.sc_search,
     "Kết quả hiện ngay dưới ô tìm."),
    ("tim-kiem-rong", "5", "Tìm không ra", "mua", "m", G.sc_search_empty,
     "Nói rõ đợt này có gì thay vì chỉ báo lỗi."),
    ("san-pham", "6", "Trang sản phẩm", "mua", "m", G.sc_pdp,
     "Chọn size, thêm vào giỏ, mở bảng size."),
    ("bang-size", "7", "Bảng size", "mua", "sheet", X.sc_sizeguide,
     "Tấm trượt lên từ trang sản phẩm."),
    ("san-pham-het", "8", "Sản phẩm đã hết", "mua", "m", X.sc_pdp_sold,
     "Nút chính đổi vai: báo khi có lại."),
    ("gio-hang", "9", "Giỏ hàng", "mua", "m", G.sc_cart,
     "Tăng giảm số lượng, tiền tự tính lại."),
    ("gio-hang-loi", "10", "Giỏ có món vừa hết", "mua", "m", X.sc_cart_snag,
     "Không cho đi tiếp tới khi xử lý xong."),
    ("gio-hang-rong", "11", "Giỏ rỗng", "mua", "m", G.sc_cart_empty,
     "Gợi lại mẫu đã xem thay vì để trống."),
    ("thanh-toan", "12", "Thanh toán", "mua", "m", G.sc_checkout,
     "Một trang. Địa chỉ Tỉnh → Quận → Phường."),
    ("dat-hang-xong", "13", "Xác nhận đơn", "mua", "m", G.sc_done,
     "Số tiền và nội dung chuyển khoản."),
    ("dot-sap-mo", "", "Trang chủ · đợt chưa mở", "mua", "m", X.sc_home_soon,
     "Việc duy nhất làm được là đặt nhắc."),
    ("dot-da-dong", "", "Trang chủ · đợt đã đóng", "mua", "m", X.sc_home_closed,
     "Trạng thái sống lâu nhất của trang chủ."),
    ("trang-chu-pc", "", "Trang chủ · máy tính", "mua", "pc", G.sc_home_w,
     "Cùng hệ, lưới ba cột."),
    ("san-pham-pc", "", "Trang sản phẩm · máy tính", "mua", "pc", G.sc_pdp_w,
     "Ảnh bên trái, quyết định bên phải."),
    ("the-san-pham", "", "Thẻ sản phẩm", "mua", "adm", V.sc_the,
     "Bốn cách dựng lại thẻ — bản so sánh, chưa áp dụng."),

    # ── B · tài khoản
    ("dang-nhap", "14", "Đăng nhập", "tk", "m", G.sc_login,
     "Có lối mua không cần tài khoản."),
    ("dang-ky", "15", "Đăng ký", "tk", "m", G.sc_signup,
     "Đang hiện trạng thái lỗi."),
    ("quen-mat-khau", "16", "Quên mật khẩu", "tk", "m", X.sc_forgot,
     "Một ô, một nút."),
    ("quen-mat-khau-da-gui", "17", "Đã gửi liên kết", "tk", "m", X.sc_forgot_sent,
     "Nói rõ gửi đi đâu, bao giờ gửi lại được."),
    ("tai-khoan", "18", "Trang tài khoản", "tk", "m", G.sc_account,
     "Cửa vào của mọi mục."),
    ("thong-tin", "19", "Thông tin cá nhân", "tk", "m", X.sc_profile,
     "Xoá tài khoản nói rõ cái gì mất."),
    ("doi-mat-khau", "20", "Đổi mật khẩu", "tk", "m", Y.sc_password,
     "Điều kiện chạy theo từng ký tự bạn gõ."),
    ("don-hang", "21", "Lịch sử đơn", "tk", "m", G.sc_orders,
     "Trạng thái là nhãn có chữ, không chỉ màu."),
    ("don-chi-tiet", "22", "Chi tiết đơn", "tk", "m", G.sc_order_detail,
     "Dòng thời gian trả lời tới đâu rồi."),
    ("don-da-huy", "23", "Đơn đã huỷ", "tk", "m", Y.sc_order_cancelled,
     "Nói thẳng vì sao huỷ."),
    ("theo-doi", "24", "Theo dõi vận chuyển", "tk", "m", G.sc_track,
     "Đối tác chưa chốt nên ghi rõ là chưa có."),
    ("dia-chi", "25", "Sổ địa chỉ", "tk", "m", G.sc_address,
     "Địa chỉ mặc định điền sẵn ở thanh toán."),
    ("dia-chi-them", "26", "Thêm địa chỉ", "tk", "m", X.sc_address_form,
     "Ba cấp hành chính là ô chọn thật."),
    ("yeu-thich", "27", "Yêu thích", "tk", "m", G.sc_wishlist,
     "Báo ngay mẫu nào sắp hết."),
    ("yeu-thich-rong", "28", "Yêu thích rỗng", "tk", "m", G.sc_wishlist_empty,
     "Nói rõ cách lưu và lợi ích của việc lưu."),

    # ── C · quản trị
    ("qt-tong-quan", "29", "Tổng quan", "qt", "adm", G.sc_dash,
     "Biểu đồ kèm bảng số, đọc không cần màu."),
    ("qt-dot-ban", "30", "Đợt bán", "qt", "adm", X.sc_drops,
     "Mở và đóng đợt. Đóng là đóng hẳn."),
    ("qt-san-pham", "31", "Sản phẩm", "qt", "adm", G.sc_products,
     "Tồn kho theo size hiện ngay ở bảng."),
    ("qt-san-pham-them", "32", "Thêm sản phẩm", "qt", "adm", Y.sc_product_new,
     "Số lượng cắt khoá lại khi đợt đã mở."),
    ("qt-san-pham-sua", "33", "Sửa sản phẩm", "qt", "adm", G.sc_product_edit,
     "Tồn kho tách theo size: cắt / bán / còn."),
    ("qt-don-hang", "34", "Đơn hàng", "qt", "adm", G.sc_orders_adm,
     "Chọn nhiều đơn để xử lý hàng loạt."),
    ("qt-don-chi-tiet", "35", "Chi tiết đơn", "qt", "adm", G.sc_order_adm,
     "Đủ thứ cần để đóng gói và đối soát."),
    ("qt-khach-hang", "36", "Khách hàng", "qt", "adm", G.sc_customers,
     "Nhóm khách để biết ai nên báo trước."),
    ("qt-khach-chi-tiet", "37", "Chi tiết khách hàng", "qt", "adm", X.sc_customer,
     "Mở từ bảng khách hàng."),
    ("qt-khuyen-mai", "38", "Khuyến mãi", "qt", "adm", G.sc_promo,
     "Tạo mã ngay dưới bảng."),
    ("qt-bang", "", "Hệ bảng dữ liệu", "qt", "adm", Z.sc_bang,
     "Đặc tả component bảng — mảnh nào ứng với API nào của TanStack."),
    ("qt-nut-loc", "", "Kiểu nút lọc", "qt", "adm", W.sc_nutloc,
     "Bốn cách làm nút thả xuống nền vàng — bản so sánh, chưa áp dụng."),

    # ── D · nội dung & hỗ trợ
    ("gioi-thieu", "39", "Giới thiệu", "nd", "m", Y.sc_about,
     "Chỗ chưa chốt để trống có nhãn, không bịa."),
    ("cau-hoi", "40", "Câu hỏi thường gặp", "nd", "m", Y.sc_faq,
     "Sáu câu, gập mở được."),
    ("doi-tra", "41", "Chính sách đổi trả", "nd", "m", Y.sc_policy,
     "Nói cả cái không đổi trả được."),
    ("lien-he", "42", "Liên hệ", "nd", "m", Y.sc_contact,
     "Ba kênh đang trống thật, chờ bạn điền."),
    ("khong-tim-thay", "43", "Không tìm thấy trang", "nd", "m", Y.sc_404,
     "Lý do gắn với mô hình bán đợt."),
]

# Tấm trượt không có trang riêng: nó nằm sẵn trong trang chủ quản của nó.
SHEET_HOST = {"bo-loc": "danh-muc", "bang-size": "san-pham",
              "chon-size": "danh-muc"}
# màn nào mang theo tấm nào. `chon-size` không nằm ở đây: nó tự đi theo mọi
# màn có thẻ sản phẩm, xem `build_screen` — danh sách chép tay kiểu gì cũng
# lệch khi thêm màn mới.
HOST_SHEETS = {"danh-muc": ["bo-loc"], "san-pham": ["bang-size"],
               "san-pham-het": ["bang-size"]}

GROUPS = [("mua", "Mua hàng"), ("tk", "Tài khoản"),
          ("qt", "Quản trị"), ("nd", "Nội dung & hỗ trợ")]

BY_SLUG = {s[0]: s for s in SCREENS}


def href(slug):
    """Địa chỉ thật của một màn — tấm trượt trỏ vào trang chủ quản của nó."""
    host = SHEET_HOST.get(slug)
    return "%s.html#%s" % (host, slug) if host else "%s.html" % slug


# ═══════════════════════════════════════════════════ đổi thẻ tĩnh thành thẻ thật
SEL_OPTIONS = {
    "TP. Hồ Chí Minh": ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ"],
    "Quận 1": ["Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 7",
               "Bình Thạnh", "Phú Nhuận", "Gò Vấp"],
    "Phường Đa Kao": ["Phường Đa Kao", "Phường Bến Nghé", "Phường Bến Thành",
                      "Phường Cầu Kho", "Phường Nguyễn Thái Bình"],
    "Chọn phường / xã": ["Phường Đa Kao", "Phường Bến Nghé", "Phường Bến Thành",
                         "Phường Cầu Kho", "Phường Nguyễn Thái Bình"],
    "Đơn hàng của tôi": ["Đơn hàng của tôi", "Đổi trả", "Size và chất liệu",
                         "Đợt bán sắp tới", "Hợp tác", "Việc khác"],
    "Áo hoodie": ["Áo thun", "Áo thun oversize", "Áo hoodie", "Áo hoodie in",
                  "Áo khoác dù", "Quần jogger"],
    "Chọn loại": ["Áo thun", "Áo thun oversize", "Áo hoodie", "Áo hoodie in",
                  "Áo khoác dù", "Quần jogger"],
    "Đợt 05": ["Đợt 05", "Đợt 06 · nháp"],
    "Đợt 06 · nháp": ["Đợt 06 · nháp", "Đợt 05"],
    "Phần trăm": ["Phần trăm", "Số tiền cố định"],
}

TAG = re.compile(r"<[^>]+>")
UNSEEN_SELECTS = set()


def esc(t):
    return (t.replace("&", "&amp;").replace('"', "&quot;")
             .replace("<", "&lt;").replace(">", "&gt;"))


BTN_RE = re.compile(r'<div class="(btn(?: [^"]*)?)"([^>]*)>((?:(?!</?div\b).)*?)</div>', re.S)
INP_RE = re.compile(r'<div class="(inp(?: [^"]*)?)"([^>]*)>((?:(?!</?div\b).)*?)</div>', re.S)
SZ_RE = re.compile(r'<div class="(sz(?: [^"]*)?)"([^>]*)>((?:(?!</?div\b).)*?)</div>', re.S)


def to_buttons(h):
    """Nút phải là <button>: Tab tới được, Enter bấm được, trình đọc màn hình gọi đúng tên."""
    return BTN_RE.sub(
        lambda m: '<button type="button" class="%s"%s>%s</button>'
                  % (m.group(1).strip(), m.group(2), m.group(3)), h)


def to_sizes(h):
    """Ô size là nút chọn. Size đã hết thì khoá lại chứ không chỉ gạch ngang."""
    def one(m):
        cls, attrs, inner = m.group(1).strip(), m.group(2), m.group(3)
        gone = "gone" in cls.split()
        label = TAG.sub(" ", inner)
        label = " ".join(label.split())
        return ('<button type="button" class="%s"%s%s aria-label="%s">%s</button>'
                % (cls, attrs, ' disabled aria-disabled="true"' if gone else "",
                   esc("Size " + label), inner))
    return SZ_RE.sub(one, h)


def to_inputs(h, adm=False):
    """Ô nhập giả thành ô nhập thật — gõ được thì mới gọi là chạy thử.

    `adm=True`: ô CHỌN dựng thành nút thả xuống của hệ (cùng tấm thực đơn với
    bảng dữ liệu) thay vì `<select>` của trình duyệt. Chỉ làm ở khu quản trị:
    trên điện thoại, `<select>` thật mở bảng chọn của hệ điều hành — với danh
    sách 60 phường thì đó là thứ tốt hơn hẳn một thực đơn tự vẽ."""
    def one(m):
        cls, attrs, inner = m.group(1).strip(), m.group(2), m.group(3)
        klass = cls.split()
        ph = "ph2" in klass
        text = " ".join(TAG.sub(" ", inner).split())
        keep = " ".join(c for c in klass if c != "ph2")

        if "area" in klass:
            if ph:
                return ('<textarea class="%s"%s placeholder="%s" rows="3"></textarea>'
                        % (keep, attrs, esc(text)))
            return '<textarea class="%s"%s rows="3">%s</textarea>' % (keep, attrs, esc(text))

        if "sel" in klass:
            opts = SEL_OPTIONS.get(text)
            if opts is None:
                UNSEEN_SELECTS.add(text)
                opts = [text]
            if adm:
                muc = "".join(
                    '<button type="button" role="menuitemradio" aria-checked="%s">'
                    '%s<span>%s</span></button>'
                    % ("true" if (not ph and o == text) else "false", M.tick(), esc(o))
                    for o in opts)
                return ('<span class="selwrap"><button type="button" class="%s selbtn"%s '
                        'aria-haspopup="menu" aria-expanded="false">'
                        '<span class="t">%s</span>%s</button>'
                        '<div class="selm" hidden role="menu">%s</div></span>'
                        % (cls, attrs, esc(text), M.icon("down", ""), muc))
            body = ""
            if ph:
                body += '<option value="" disabled selected>%s</option>' % esc(text)
            for o in opts:
                sel = " selected" if (not ph and o == text) else ""
                body += '<option%s>%s</option>' % (sel, esc(o))
            return '<select class="%s"%s>%s</select>' % (keep, attrs, body)

        if ph:
            return '<input class="%s"%s type="text" placeholder="%s" />' % (keep, attrs, esc(text))
        return '<input class="%s"%s type="text" value="%s" />' % (keep, attrs, esc(text))
    return INP_RE.sub(one, h)


CART_RE = re.compile(r'<span class="cartdot">(.*?)</span>', re.S)
NUM_RE = re.compile(r"<b>(\d+)</b>")
BAG_LINE = M.icon("bag", "ic bag0")
BAG_FULL = M.icon("bag", "ic bag1", duo=True)


def wire_cart(h):
    """Túi giỏ hàng mang sẵn cả hai biến thể: nét khi giỏ rỗng, đặc khi có món.

    Bản mock nung cứng một biến thể vì nó là ảnh tĩnh. Ở đây số món đổi được
    trong lúc dùng, nên cả hai phải có mặt và CSS chọn cái nào hiện."""
    def one(m):
        inner = m.group(1)
        n = NUM_RE.search(inner)
        n = n.group(1) if n else "0"
        dot = '<b>%s</b>' % n if n != "0" else ""
        return ('<span class="cartdot" data-n="%s" role="link" tabindex="0" '
                'aria-label="Giỏ hàng, %s món">%s%s%s</span>'
                % (n, n, BAG_LINE, BAG_FULL, dot))
    return CART_RE.sub(one, h)


PWD_RE = re.compile(r'<input class="([^"]*)"([^>]*) type="text" value="(•+)" />')


def wire_pwd(h):
    """Ô mật khẩu phải là type=password — gõ vào thì trình duyệt tự che."""
    return PWD_RE.sub(
        lambda m: '<input class="%s"%s type="password" value="%s" />'
                  % (m.group(1), m.group(2), "a" * len(m.group(3))), h)


SW_RE = re.compile(r'<span style="width:38px;height:22px;border-radius:99px;'
                   r'background:var\(--(fill|hair)\);position:relative;flex:none">')


def wire_sw(h):
    """Công tắc bật/tắt ở trang tài khoản chỉ là hai <span> lồng nhau, không có
    tên gọi nào để cầm. Đặt tên cho nó thì app.js mới gạt được."""
    return SW_RE.sub(
        lambda m: '<span class="sw%s" style="width:38px;height:22px;'
                  'border-radius:99px;background:var(--%s);position:relative;'
                  'flex:none">' % (" on" if m.group(1) == "fill" else "", m.group(1)), h)


def prep(fn, adm=False):
    h = fn()
    h = wire_sw(h)
    h = to_buttons(h)
    h = to_sizes(h)
    h = to_inputs(h, adm)
    h = wire_cart(h)
    h = wire_pwd(h)
    return h


# ═══════════════════════════════════════════════════════════════ vỏ trang
# Mũi chevron của Iconsax, quay xuống — mũi tên cho ô chọn thật.
CHEV = PATHS["chev"].replace("currentColor", "#6E4A12")
CHEV_URI = "data:image/svg+xml," + quote(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">'
    '<g transform="rotate(90 12 12)">%s</g></svg>' % CHEV, safe="")

HEAD = """<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#12161A" />
<title>%(title)s · BRAND</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400..700&amp;family=Be+Vietnam+Pro:wght@400;500;600&amp;display=swap&amp;subset=vietnamese,latin" rel="stylesheet" />
<link rel="stylesheet" href="app.css?v=%(ver)s" />
<link rel="stylesheet" href="shell.css?v=%(ver)s" />
</head>
<body class="%(bodycls)s" data-screen="%(slug)s" data-num="%(num)s" data-title="%(title)s">
"""

VER = str(int(time.time()))

TAIL = """<script src="screens.js?v=%(ver)s"></script>
<script src="app.js?v=%(ver)s"></script>
</body>
</html>
"""


def write(name, text):
    with io.open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(text)
    return len(text)


def build_screen(slug, num, title, group, kind, fn, note):
    inner = prep(fn, adm=(kind == "adm"))
    mang = list(HOST_SHEETS.get(slug, []))
    # Màn nào có thẻ sản phẩm thì có nút "Thêm vào giỏ", mà nút đó mở tấm chọn
    # size — nên tấm ấy phải nằm sẵn trong màn. Dò theo nội dung đã dựng chứ
    # đừng chép tay danh sách.
    if 'card vuot' in inner and slug != 'chon-size':
        mang.append('chon-size')
    sheets = ""
    for sid in mang:
        sfn = BY_SLUG[sid][5]
        sheets += ('<div class="sheetwrap" id="%s" hidden>'
                   '<div class="scrim" data-close="1"></div>'
                   '<div class="s sheetbody" role="dialog" aria-modal="true" '
                   'aria-label="%s">%s</div></div>'
                   % (sid, esc(BY_SLUG[sid][2]), prep(sfn)))

    if kind == "adm":
        stage = '<div class="stage"><div class="device"><div class="s adm">%s</div></div></div>'
        bodycls = "pc"
    elif kind == "pc":
        stage = '<div class="stage"><div class="device"><div class="s">%s</div></div></div>'
        bodycls = "pc"
    else:
        stage = '<div class="stage"><div class="device"><div class="s">%s</div></div></div>'
        bodycls = "ph"

    html = (HEAD % {"title": title, "slug": slug, "num": num, "bodycls": bodycls, "ver": VER}
            + (stage % inner) + sheets + (TAIL % {"ver": VER}))
    return write("%s.html" % slug, html)


# ═════════════════════════════════════════════════════════════ trang mở đầu
def build_index():
    def block(gid, gname):
        rows = ""
        for slug, num, title, g, kind, fn, note in SCREENS:
            if g != gid:
                continue
            tag = ("điện thoại" if kind == "m" else
                   "tấm trượt" if kind == "sheet" else "máy tính")
            rows += ('<a class="ix" href="%s"><span class="n">%s</span>'
                     '<span class="b"><span class="t">%s</span>'
                     '<span class="d">%s</span></span>'
                     '<span class="k">%s</span></a>'
                     % (href(slug), num or "·", esc(title), esc(note), tag))
        n = sum(1 for s in SCREENS if s[3] == gid)
        return ('<section class="ixg"><h2>%s<span class="c">%d màn</span></h2>'
                '<div class="ixl">%s</div></section>' % (gname, n, rows))

    starts = (
        ("trang-chu.html", "Mua hàng", "Trang chủ → danh mục → sản phẩm → giỏ → "
         "thanh toán → xác nhận. Mười ba màn nối liền."),
        ("dang-nhap.html", "Tài khoản", "Đăng nhập → trang tài khoản → đơn hàng → "
         "chi tiết → theo dõi. Mười lăm màn."),
        ("qt-tong-quan.html", "Quản trị", "Tổng quan → đợt bán → sản phẩm → đơn → "
         "khách. Mười màn, dựng cho máy tính."),
    )
    cards = "".join(
        '<a class="go" href="%s"><span class="t">%s</span><span class="d">%s</span>'
        '<span class="cta">Bắt đầu</span></a>' % c for c in starts)

    body = ("""<div class="wrap">
<header>
  <h1>BRAND — bấm thử toàn bộ luồng</h1>
  <p>Bốn mươi ba màn hình của bản mock, nối lại thành một bản chạy được bằng
  HTML, CSS và JavaScript thuần — không khung, không cài đặt. Mở bằng trình
  duyệt là dùng được.</p>
  <p class="warn">Đây <b>chưa phải sản phẩm</b>. Ảnh là ảnh mượn tạm, mọi con số
  đều là <b>dữ liệu mô phỏng</b>, và những chỗ bạn chưa chốt nội dung thì để
  trống có nhãn chứ không bịa.</p>
</header>
<div class="gos">%s</div>
<section class="how">
  <h2>Làm được gì</h2>
  <ul>
    <li>Đi hết luồng mua: chọn size, thêm vào giỏ, tăng giảm số lượng — tiền tự tính lại.</li>
    <li>Gõ thật vào ô nhập, chọn thật ở ô Tỉnh / Quận / Phường.</li>
    <li>Mở tấm trượt bộ lọc và bảng size ngay trên màn đang xem.</li>
    <li>Đồng hồ đếm ngược của đợt chạy thật và giống nhau ở mọi màn.</li>
    <li>Thanh đen ở đáy: quay lại, xem tên màn, hoặc nhảy thẳng tới màn bất kỳ.</li>
  </ul>
</section>
%s
<footer>Dựng lại bằng <code>python gen_app.py</code>. Hệ thiết kế nằm ở
<code>mocklib.py</code> — sửa một chỗ, cả bản mock lẫn bản này cùng đổi.</footer>
</div>""" % (cards, "".join(block(g, n) for g, n in GROUPS)))

    html = (HEAD % {"title": "Bản chạy thử", "slug": "index", "num": "",
                    "bodycls": "home", "ver": VER}) + body + (TAIL % {"ver": VER})
    return write("index.html", html)


# ═════════════════════════════════════════════════════════════════ chạy
def main():
    css = M.CSS + X.CSS + Y.CSS + Z.CSS + W.CSS + V.CSS
    css += '\n:root{ --chev:url("%s"); }\n' % CHEV_URI
    write("app.css", css)

    meta = [{"slug": s[0], "num": s[1], "title": s[2], "group": s[3],
             "kind": s[4], "note": s[6], "href": href(s[0])} for s in SCREENS]
    want = ("back", "grid", "x", "chev", "confirm", "bag", "search")
    icons = {k: PATHS[k] for k in want if k in PATHS}
    missing = [k for k in want if k not in PATHS]

    # Kho hàng của đợt đang mở, để tấm chọn size đổ được nội dung theo đúng
    # mẫu vừa bấm. Cùng một nguồn với thẻ: `mocklib.CATALOG`, không gõ lại.
    kho = {p["key"]: {
        "ten": p["ten"], "loai": p["loai"], "form": p["form"],
        "gia": M.tien(p["gia"]), "con": p["con"],
        "mau": [{"ten": M.MAU[m][0], "hex": M.MAU[m][1], "anh": M.im(k, 260)}
                for k, m in M.anh_mau(p)],
    } for p in M.PRODUCTS}

    write("screens.js",
          "/* Sinh ra từ gen_app.py — đừng sửa tay. */\n"
          "window.SCREENS = %s;\nwindow.GROUPS = %s;\nwindow.ICONS = %s;\n"
          "window.KHO = %s;\nwindow.SIZES = %s;\n"
          % (json.dumps(meta, ensure_ascii=False, indent=0),
             json.dumps([{"id": g, "name": n} for g, n in GROUPS], ensure_ascii=False),
             json.dumps(icons, ensure_ascii=False),
             json.dumps(kho, ensure_ascii=False),
             json.dumps(list(M.SIZES), ensure_ascii=False)))
    if missing:
        print("!! icon missing:", missing)

    n = 0
    for s in SCREENS:
        if s[4] == "sheet":
            continue          # tấm trượt sống trong trang chủ quản của nó
        build_screen(*s)
        n += 1
    build_index()

    print("built %d screen pages + index -> %s" % (n, OUT))
    if UNSEEN_SELECTS:
        print("!! select with no option list:",
              " | ".join(sorted(UNSEEN_SELECTS)).encode("ascii", "replace").decode())


main()
