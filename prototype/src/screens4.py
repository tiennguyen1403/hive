# -*- coding: utf-8 -*-
"""Năm bảng của khu quản trị, dựng lại trên component `.dt` — bộ mặt cho
TanStack Table — cộng một trang đặc tả cho chính component đó.

TanStack không vẽ gì: nó trả về row model đã lọc / sắp xếp / phân trang / chọn.
Nên việc của mock là trả lời đúng một câu hỏi: *mỗi model đó trông thế nào?*
Mỗi mảnh ở đây mang tên theo API sinh ra nó, để lúc dựng thật chỉ việc tra.

Không bảng nào nhận đủ mọi tính năng. Bảng đơn hàng là bảng duy nhất được mở
rộng dòng và ghim cột, vì nó là bảng duy nhất vừa dài vừa rộng. Thêm tính năng
vào chỗ không cần là làm chậm người đang làm việc.
"""
from mocklib import (im, icon, btn, badge, side, admtop,
                     CATALOG, SIZES, DOT_NAY, dot, so_mau, doanh_thu, tien,
                     dcol, dck, dexp, dhead, drow, dfacet, dcolsmenu,
                     dtools, dbulk, dfoot, dblank, dskel, dtable)

CSS = """
/* Trang đặc tả bảng — chỉ dùng ở màn "Hệ bảng dữ liệu", không phải màn sản phẩm. */
.s.adm .spec > p{ font-size:12.5px; color:var(--ink2); line-height:1.65; max-width:70ch;
  margin:6px 0 0; }
.s.adm .spec > p b{ color:var(--ink); font-weight:600; }
.s.adm .grid2{ display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start; }
.s.adm .cap2{ font-size:11px; color:var(--ink2); margin:7px 2px 0; line-height:1.5; }
.s.adm .cap2 code, .s.adm .ref code{ font-family:ui-monospace,Consolas,monospace;
  font-size:10.5px; color:var(--gold-800); background:var(--gold-50);
  padding:1.5px 5px; border-radius:var(--r-sm); }
.s.adm .ref table{ width:100%; border-collapse:separate; border-spacing:0; }
.s.adm .ref th{ text-align:left; font-size:10.5px; font-weight:500; color:var(--ink2);
  padding:9px 16px; border-bottom:1px solid var(--hair); }
.s.adm .ref td{ font-size:12px; padding:9px 16px; border-bottom:1px solid var(--hair);
  vertical-align:top; }
.s.adm .ref tr:last-child td{ border-bottom:0; }
.s.adm .ref td:first-child{ white-space:nowrap; }
.s.adm .ref td .n{ color:var(--ink2); font-size:11px; line-height:1.55; }
.s.adm .swatchrow{ display:flex; flex-wrap:wrap; gap:10px; padding:16px; }
.s.adm .swatchrow > span{ display:inline-flex; }
.dt .ava{ width:30px; height:30px; flex:none; border-radius:99px;
  background:var(--gold-100); color:var(--gold-800); display:flex;
  align-items:center; justify-content:center; font-size:11px; font-weight:600; }
/* Mẫu trưng bày ở trang đặc tả: nhìn thì thật, bấm thì chỉ nói ra nó là mẫu. */
.dt.demo{ }
"""

SZ = ("S", "M", "L", "XL")
MAU = [("bui", "BỤI", "Áo hoodie", 890000), ("khoi", "KHÓI", "Áo thun oversize", 390000),
       ("nang", "NẮNG", "Áo thun", 450000), ("suong", "SƯƠNG", "Áo khoác dù", 1450000),
       ("nguoi", "NGUỘI", "Áo hoodie in", 1290000)]
KHACH = [("Trần Minh Anh", "minhanh"), ("Lê Hoàng Nam", "nam.le"),
         ("Phạm Thu Hà", "ha.pham"), ("Võ Đức Duy", "duy.vo"),
         ("Nguyễn Khả Vy", "vy.nguyen"), ("Đặng Quốc Bảo", "bao.dang"),
         ("Bùi Thanh Tú", "tu.bui"), ("Hoàng Mỹ Linh", "linh.hoang")]
TRANGTHAI = [("Chờ chuyển khoản", "warn"), ("Đã thanh toán", ""), ("Đang giao", ""),
             ("Đã giao", "ok"), ("Đã huỷ", "hot")]
TRA = ("Chuyển khoản", "Thẻ", "COD")


def vnd(n):
    return "{:,}".format(n).replace(",", ".") + "₫"


def act(main, extra=()):
    """Thao tác trên một dòng: việc hay làm nhất hiện thành chữ, phần còn lại
    nằm sau nút ba chấm. Giấu hết vào thực đơn là bắt người ta mở ra mỗi lần."""
    menu = ""
    if extra:
        menu = ('<div class="menu" hidden role="menu">%s</div>'
                % "".join('<button type="button" class="%s">%s<span>%s</span></button>'
                          % ("bad" if bad else "", icon(ic, ""), lb)
                          for lb, ic, bad in extra))
    more = ('<button type="button" class="more" aria-label="Thao tác khác" '
            'aria-expanded="false">%s</button>%s' % (icon("more", ""), menu)) if extra else ""
    return ('<span class="wrap"><span class="lnk" style="font-size:11.5px">%s</span>%s</span>'
            % (main, more))


# ════════════════════════════════════════════════════════════ 31 · sản phẩm
def sc_products():
    """Cả danh mục, không riêng đợt đang mở — chủ shop cần tra lại mẫu cũ."""
    cols = [dcol(kind="sel"), dcol("Sản phẩm", sort=""), dcol("Mã", sort=""),
            dcol("Giá", num=True, sort=""), dcol("Size còn"),
            dcol("Tồn", num=True, sort="desc"), dcol("Đợt"), dcol("Trạng thái"),
            dcol(kind="act")]

    def trang_thai(x):
        if x["dot"] != DOT_NAY:
            return ("Đợt đã đóng", "flat")
        if not x["conTong"]:
            return ("Hết hàng", "hot")
        if x["conTong"] <= 3:
            return ("Sắp hết", "hot")
        if x["conTong"] <= 8:
            return ("Sắp hết", "warn")
        return ("Đang bán", "")

    rows = ""
    for x in CATALOG:
        st, tone = trang_thai(x)
        con = " ".join(z for z in SIZES if x["con"][z]) or "—"
        rows += drow(cols, [
            dck(),
            '<span class="cellrow"><span class="pill"><img src="%s" alt="" /></span>'
            '<span><b class="nm">%s</b><br /><span class="note">%s · %s</span></span></span>'
            % (im(x["key"], 120, 60), x["ten"], x["loai"], x["chat"]),
            '<span class="tnum">D%d-%s</span>' % (x["dot"], x["key"].upper()),
            tien(x["gia"]), con, str(x["conTong"]), "Đợt %02d" % x["dot"],
            badge(st, tone), act("Sửa", (("Nhân bản", "doc", False),
                                         ("Ẩn khỏi cửa hàng", "eye", False),
                                         ("Xoá sản phẩm", "trash", True)))])

    dem_st, dem_dot = {}, {}
    for x in CATALOG:
        k = trang_thai(x)[0]
        dem_st[k] = dem_st.get(k, 0) + 1
        d = "Đợt %02d" % x["dot"]
        dem_dot[d] = dem_dot.get(d, 0) + 1
    tools = dtools("Tìm theo tên, mã hoặc chất liệu",
                   dfacet("Trạng thái", 7, sorted(dem_st.items(), key=lambda t: -t[1]))
                   + dfacet("Đợt", 6, sorted(dem_dot.items(), reverse=True)),
                   dcolsmenu(cols))
    bulk = dbulk((("Chuyển sang đợt 06", "swap"), ("Ẩn khỏi cửa hàng", "eye"),
                  ("Xuất CSV", "export")), "sản phẩm")
    return (side("Sản phẩm") + '<div class="main">'
            + admtop("Sản phẩm", btn("Thêm sản phẩm", "sm", "plus"))
            + dtable(cols, rows, tools, bulk, dfoot(len(CATALOG), 10, 1))
            + '<div class="note" style="margin-top:12px">Tồn kho là số lượng đã cắt cho '
              'đợt đó, không tự sinh thêm. Đợt đã mở thì con số này khoá lại.</div></div>')

# ═══════════════════════════════════════════════════════════ 34 · đơn hàng
def _don(i):
    ten, mail = KHACH[i % len(KHACH)]
    st, tone = TRANGTHAI[(i * 3) % len(TRANGTHAI)]
    tra = TRA[(i * 2) % len(TRA)]
    n_line = (i % 2) + 1
    lines = []
    for j in range(n_line):
        k, nm, ki, gia = MAU[(i + j) % len(MAU)]
        lines.append((k, nm, ki, SZ[(i + j) % 4], 1 + (i + j) % 2, gia))
    tong = sum(q * g for _, _, _, _, q, g in lines)
    ngay = 19 - i // 5
    gio = "%02d:%02d" % (21 - (i % 12), (i * 7) % 60)
    return ("#DH-%d" % (2431 - i), ten, mail + "@email.com",
            "%02d/09 · %s" % (ngay, gio), tong, st, tone, tra, lines)


def sc_orders_adm():
    cols = [dcol(kind="sel", pin="0"),
            dcol("Mã đơn", sort="desc", pin="42px", w="158px"),
            dcol("Khách", sort=""), dcol("Thời gian", sort=""),
            dcol("Giá trị", num=True, sort=""), dcol("Trạng thái"),
            dcol("Thanh toán"), dcol(kind="act")]

    def sub(lines):
        return "".join(
            '<span class="il"><span class="pill" style="width:26px;height:32px">'
            '<img src="%s" alt="" /></span><span class="g"><b>%s</b> · %s · size %s</span>'
            '<span class="note">%d ×</span><span class="a">%s</span></span>'
            % (im(k, 90, 55), nm, ki, sz, q, vnd(q * g)) for k, nm, ki, sz, q, g in lines)

    rows = ""
    for i in range(24):
        mid, ten, mail, khi, tong, st, tone, tra, lines = _don(i)
        rows += drow(cols, [
            dck(),
            '<span class="cellrow">%s<b class="tnum">%s</b></span>' % (dexp(), mid),
            '<span><b>%s</b><br /><span class="note">%s</span></span>' % (ten, mail),
            '<span class="tnum">%s</span>' % khi, vnd(tong), badge(st, tone), tra,
            act("Mở", (("In phiếu giao", "printer", False),
                       ("Đánh dấu đã thanh toán", "confirm", False),
                       ("Gửi email cho khách", "sms", False),
                       ("Huỷ đơn", "x", True)))],
            sub=sub(lines))

    # Đếm từ chính dữ liệu, không gõ tay — đây đúng là việc
    # getFacetedUniqueValues() làm, và gõ tay thì sai lúc nào không biết.
    dem_st, dem_tra = {}, {}
    for i in range(24):
        d = _don(i)
        dem_st[d[5]] = dem_st.get(d[5], 0) + 1
        dem_tra[d[7]] = dem_tra.get(d[7], 0) + 1
    tools = dtools("Tìm mã đơn, tên hoặc email",
                   dfacet("Trạng thái", 5, [(v, dem_st[v]) for v, _ in TRANGTHAI])
                   + dfacet("Thanh toán", 6, [(v, dem_tra[v]) for v in TRA]),
                   dcolsmenu(cols))
    bulk = dbulk((("Đánh dấu đã thanh toán", "confirm"), ("In phiếu giao", "printer"),
                  ("Xuất CSV", "export")), "đơn")
    return (side("Đơn hàng") + '<div class="main">'
            + admtop("Đơn hàng", btn("Xuất CSV", "ghost sm", "export"))
            + dtable(cols, rows, tools, bulk, dfoot(24, 10, 1))
            + '<div class="note" style="margin-top:12px">Mũi tên đầu dòng mở ra các món '
              'trong đơn — xem đủ để đóng gói mà không phải rời danh sách.</div></div>')


# ════════════════════════════════════════════════════════════ 36 · khách hàng
def sc_customers():
    cols = [dcol(kind="sel"), dcol("Khách hàng", sort=""), dcol("Số điện thoại"),
            dcol("Đơn", num=True, sort=""), dcol("Đã chi", num=True, sort="desc"),
            dcol("Mua gần nhất", sort=""), dcol("Nhóm"), dcol(kind="act")]
    data = (("TA", "Trần Minh Anh", "minhanh@email.com", "0912 345 678", 3, 3120000,
             "19/09/2026", "Quay lại", ""),
            ("LN", "Lê Hoàng Nam", "nam.le@email.com", "0903 221 774", 1, 690000,
             "19/09/2026", "Mới", "flat"),
            ("PH", "Phạm Thu Hà", "ha.pham@email.com", "0977 810 233", 5, 6480000,
             "19/09/2026", "Thân thiết", "ok"),
            ("VD", "Võ Đức Duy", "duy.vo@email.com", "0935 664 190", 2, 840000,
             "19/09/2026", "Quay lại", ""),
            ("NV", "Nguyễn Khả Vy", "vy.nguyen@email.com", "0918 447 025", 4, 5230000,
             "18/09/2026", "Thân thiết", "ok"))
    rows = "".join(drow(cols, [
        dck(),
        '<span class="cellrow"><span class="ava">%s</span><span><b>%s</b><br />'
        '<span class="note">%s</span></span></span>' % (ini, n, mail),
        '<span class="tnum">%s</span>' % sdt, str(dh), vnd(ct),
        '<span class="tnum">%s</span>' % lan, badge(t, tone, False),
        act("Xem", (("Gửi email", "sms", False), ("Xem đơn của khách", "bag", False)))])
        for ini, n, mail, sdt, dh, ct, lan, t, tone in data)

    kpis = "".join('<div class="kpi"><div class="lb">%s</div><div class="vl">%s</div>'
                   '<div class="ghi">%s</div></div>' % (l, v, d)
                   for l, v, d in (("Khách đã mua", "148", "từ đợt 01 tới nay"),
                                   ("Mua lại từ hai đợt", "37", "25% tổng số khách"),
                                   ("Đã đặt nhắc đợt 06", "412", "được vào trước 2 giờ")))
    tools = dtools("Tìm tên, email hoặc số điện thoại",
                   dfacet("Nhóm", 6, (("Mới", 1), ("Quay lại", 2), ("Thân thiết", 2))),
                   dcolsmenu(cols))
    bulk = dbulk((("Báo trước khi mở đợt", "bell"), ("Xuất danh sách", "export")), "khách")
    return (side("Khách hàng") + '<div class="main">'
            + admtop("Khách hàng", btn("Xuất danh sách", "ghost sm", "export"))
            + '<div class="kpis" style="grid-template-columns:repeat(3,1fr)">%s</div>' % kpis
            + dtable(cols, rows, tools, bulk, dfoot(5, 10, 1))
            + '<div class="note" style="margin-top:12px">Chọn vài khách rồi báo trước khi mở '
              'đợt — người đã đặt nhắc được vào trước hai giờ.</div></div>')


# ═══════════════════════════════════════════════════════════ 38 · khuyến mãi
def sc_promo():
    cols = [dcol("Mã", sort=""), dcol("Giảm"), dcol("Điều kiện"),
            dcol("Đã dùng", num=True, sort=""), dcol("Hiệu lực"),
            dcol("Trạng thái"), dcol(kind="act")]
    data = (("DOT05", "Mở đợt 05", "-10%", "Đơn từ 500.000₫", "42 / 200", "còn 5 giờ",
             "Đang chạy", ""),
            ("FREESHIP", "Miễn phí giao", "-30.000₫", "Đơn từ 700.000₫", "118 / ∞",
             "còn 9 ngày", "Đang chạy", ""),
            ("CHAOBAN", "Khách mới", "-50.000₫", "Đơn đầu tiên", "26 / 500",
             "không giới hạn", "Đang chạy", ""),
            ("DOT04", "Mở đợt 04", "-10%", "Đơn từ 500.000₫", "183 / 200", "đã hết hạn",
             "Đã dừng", "flat"))
    rows = "".join(drow(cols, [
        '<b style="font-family:ui-monospace,Consolas,monospace">%s</b><br />'
        '<span class="note">%s</span>' % (code, mo),
        giam, dk, '<span class="tnum">%s</span>' % dung, han, badge(st, t),
        act("Sửa", (("Nhân bản", "doc", False), ("Dừng mã", "x", True)))])
        for code, mo, giam, dk, dung, han, st, t in data)

    tools = dtools("Tìm mã",
                   dfacet("Trạng thái", 5, (("Đang chạy", 3), ("Đã dừng", 1))),
                   dcolsmenu(cols))
    return (side("Khuyến mãi") + '<div class="main">'
            + admtop("Khuyến mãi", btn("Tạo mã mới", "sm", "plus"))
            + dtable(cols, rows, tools, "", dfoot(4, 10, 1))
            + '<div class="panel"><div class="hd"><h2>Tạo mã mới</h2></div>'
              '<div class="fgrid" style="grid-template-columns:repeat(4,1fr)">'
              '<div><label>Mã</label><div class="inp ph2">VIDU10</div></div>'
              '<div><label>Kiểu giảm</label><div class="inp sel">Phần trăm %s</div></div>'
              '<div><label>Giá trị</label><div class="inp ph2">10</div></div>'
              '<div><label>Đơn tối thiểu</label><div class="inp ph2">500.000</div></div>'
              '<div><label>Số lượt tối đa</label><div class="inp ph2">200</div></div>'
              '<div><label>Bắt đầu</label><div class="inp">19/09/2026</div></div>'
              '<div><label>Kết thúc</label><div class="inp ph2">dd/mm/yyyy</div></div>'
              '<div style="display:flex;align-items:flex-end">%s</div>'
              '</div></div></div>' % (icon("chev", "ic sm"), btn("Tạo mã", "sm", "plus")))


# ════════════════════════════════════════════════════════════ 30 · đợt bán
def sc_drops():
    """PRODUCT.md: chủ shop phải mở/đóng được đợt từ khu quản trị."""
    cols = [dcol("Đợt", sort=""), dcol("Mở bán"), dcol("Đóng"),
            dcol("Mẫu", num=True), dcol("Đã cắt", num=True),
            dcol("Đã bán", num=True, sort=""), dcol("Trạng thái"), dcol(kind="act")]
    data = (("Đợt 06", "nháp", "22/09 · 20:00", "chưa đặt", 6, 240, 0, "Nháp", "flat",
             "Mở bán"),
            ("Đợt 05", "streetwear cơ bản", "19/09 · 18:00", "19/09 · 23:00",
             dot(5)["mau"], dot(5)["cat"], dot(5)["ban"], "Đang mở", "", "Đóng đợt"),
            ("Đợt 04", "áo khoác", "05/09 · 20:00", "06/09 · 01:20",
             dot(4)["mau"], dot(4)["cat"], dot(4)["cat"],
             "Đã đóng", "ok", "Xem"),
            ("Đợt 03", "quần", "18/08 · 20:00", "19/08 · 02:40",
             dot(3)["mau"], dot(3)["cat"], dot(3)["cat"],
             "Đã đóng", "ok", "Xem"))
    rows = "".join(drow(cols, [
        '<b>%s</b><br /><span class="note">%s</span>' % (ten, mo_ta),
        '<span class="tnum">%s</span>' % mo, '<span class="tnum">%s</span>' % dong,
        str(mau), str(cat), str(ban), badge(st, tone),
        act(a, (("Nhân bản đợt", "doc", False), ("Xoá nháp", "trash", True)))])
        for ten, mo_ta, mo, dong, mau, cat, ban, st, tone, a in data)

    kpis = "".join('<div class="kpi"><div class="lb">%s</div><div class="vl">%s</div>'
                   '<div class="ghi">%s</div></div>' % (l, v, d)
                   for l, v, d in (("Đợt đang mở", "Đợt 05", "đóng sau 5 giờ 42 phút"),
                                   ("Còn lại trong đợt", "%d món" % dot()["con"], "trên %d món đã cắt" % dot()["cat"]),
                                   ("Doanh thu đợt 05", ("%.1f" % (doanh_thu()/1e6)).replace(".", ",") + "tr₫", "%d món đã bán" % dot()["ban"]),
                                   ("Đã đặt nhắc đợt 06", "412", "sẽ được vào trước 2 giờ")))
    tools = dtools("Tìm đợt",
                   dfacet("Trạng thái", 6, (("Nháp", 1), ("Đang mở", 1), ("Đã đóng", 2))),
                   dcolsmenu(cols))
    return (side("Đợt bán") + '<div class="main">'
            + admtop("Đợt bán", btn("Tạo đợt mới", "sm", "plus"))
            + '<div class="kpis">%s</div>' % kpis
            + dtable(cols, rows, tools, "", dfoot(4, 10, 1))
            + '<div class="note" style="margin-top:12px">Đóng đợt là đóng hẳn: mẫu trong đợt '
              'ngừng bán và không mở lại. Muốn bán tiếp thì tạo đợt mới.</div></div>')


# ══════════════════════════════════════════════ trang đặc tả component bảng
REF = (
    (".bar .find", "globalFilter", "Một ô tìm cho cả bảng. Gõ tới đâu lọc tới đó, "
     "không cần nút."),
    (".bar .facet", "columnFilters + getFacetedUniqueValues()", "Con số bên cạnh mỗi giá "
     "trị lấy từ faceted count — người dùng biết trước bấm vào còn lại bao nhiêu dòng."),
    (".bar .colsbtn", "columnVisibility", "Ẩn cột nào là việc của người đang làm, không "
     "phải của người dựng."),
    (".bar.bulk", "getSelectedRowModel()", "Chọn dòng thì thanh công cụ đổi vai tại chỗ, "
     "cùng chiều cao, nên bảng không nhảy."),
    ("th .sortb", "sorting + getSortedRowModel()", "Ba nấc: chưa sắp → tăng → giảm. Chỗ "
     "của mũi tên luôn giữ sẵn nên cột không xê dịch."),
    (".ck", "rowSelection", "Ô đầu bảng có trạng thái nửa vời khi mới chọn một phần."),
    (".expb", "expanded + getExpandedRowModel()", "Chỉ bảng đơn dùng. Mở ra các món "
     "trong đơn, đủ để đóng gói mà không rời danh sách."),
    ("th .grip", "columnSizing", "Tay kéo 5px ở mép phải tiêu đề, chỉ hiện khi rê tới."),
    (".pin", "columnPinning", "Ghim mã đơn ở mép trái. Bóng đổ chỉ hiện khi đã cuộn "
     "ngang, không vẽ sẵn."),
    (".foot .pager", "pagination + getPaginationRowModel()", "Bảng đủ ngắn thì hai nút "
     "tự khoá — đó là trạng thái đúng, không phải thiếu sót."),
    (".blank", "— không phải của TanStack", "Ba câu khác nhau cho ba cảnh: chưa có gì · "
     "lọc không ra · hỏng. Gộp làm một là bỏ mất chỉ dẫn."),
)


def _ghim():
    """Mẫu hẹp để thấy cột ghim làm việc — bảng thật ở 1280px thì chưa tràn."""
    c = [dcol(kind="sel", pin="0"), dcol("Mã đơn", sort="desc", pin="42px", w="150px"),
         dcol("Khách", sort=""), dcol("Thời gian"), dcol("Giá trị", num=True),
         dcol("Trạng thái"), dcol("Thanh toán"), dcol(kind="act")]
    rows = ""
    for i in range(4):
        mid, ten, mail, khi, tong, st, tone, tra, _ = _don(i)
        rows += drow(c, [dck(), '<b class="tnum">%s</b>' % mid, ten,
                         '<span class="tnum">%s</span>' % khi, vnd(tong),
                         badge(st, tone), tra, act("Mở")])
    return ('<div class="dt demo" style="margin:0"><div class="scroll">'
            '<table class="dtt" style="min-width:860px">%s<tbody>%s</tbody></table>'
            '</div></div>'
            % (dhead(c), rows))


def sc_bang():
    c4 = [dcol(kind="sel"), dcol("Mã đơn", sort=""), dcol("Khách", sort=""),
          dcol("Giá trị", num=True, sort=""), dcol("Trạng thái"), dcol(kind="act")]

    def mini(rows, tools="", foot="", body=None, cls=""):
        return dtable(c4, rows, tools, "", foot, cls, body)

    r = lambda mid, ten, tien, st, t, **k: drow(
        c4, [dck("true" if k.get("sel") else "false"), '<b class="tnum">%s</b>' % mid,
             ten, vnd(tien), badge(st, t), act("Mở")], **k)

    ba_dong = (r("#DH-2431", "Trần Minh Anh", 1340000, "Chờ chuyển khoản", "warn")
               + r("#DH-2430", "Lê Hoàng Nam", 690000, "Đã thanh toán", "", sel=True)
               + r("#DH-2429", "Phạm Thu Hà", 1450000, "Đang giao", ""))

    ref = "".join('<tr><td><code>%s</code></td><td><code>%s</code></td>'
                  '<td><span class="n">%s</span></td></tr>' % x for x in REF)

    return (side("") + '<div class="main spec">'
            + admtop("Hệ bảng dữ liệu")
            + '<p>Đây <b>không phải màn sản phẩm</b>. Nó là bản vẽ chi tiết của một '
              'component — cái bảng đang dùng ở năm màn quản trị — để lúc dựng bằng '
              '<b>TanStack Table</b> thì chỉ việc tra chứ không phải nghĩ lại.</p>'
              '<p>TanStack là thư viện <b>không giao diện</b>: nó trả về row model đã lọc, '
              'đã sắp, đã phân trang, đã chọn. Mọi thứ nhìn thấy dưới đây là phần vẽ, và '
              'phần vẽ là việc chúng ta phải tự quyết.</p>'

            + '<div class="panel" style="margin-top:22px"><div class="hd">'
              '<h2>Thanh công cụ · ba trạng thái</h2>'
              '<div class="rt"><span class="note">globalFilter · columnFilters · '
              'rowSelection</span></div></div>'
              '<div class="swatchrow" style="flex-direction:column;align-items:stretch">'
              '%s%s%s</div></div>'
              % (('<div class="dt demo" style="margin:0">%s</div>'
                  '<p class="cap2">Mặc định. Ô tìm, hai bộ lọc theo mặt và nút chọn '
                  'cột. Bộ lọc chưa bật thì không mang con số nào.</p>')
                 % dtools("Tìm mã đơn, tên hoặc email",
                          dfacet("Trạng thái", 0, (("Chờ chuyển khoản", 5),
                                                   ("Đã thanh toán", 5), ("Đang giao", 5)))
                          + dfacet("Thanh toán", 1, (("Chuyển khoản", 8), ("Thẻ", 8))),
                          dcolsmenu(c4)),
                 ('<div class="dt demo" style="margin:14px 0 0">%s</div>'
                  '<p class="cap2">Đang lọc: chip đổi nền, chữ đậm lên, và mang con số đếm. '
                  'Ba kênh cùng nói một điều — không dựa riêng vào màu.</p>')
                 % ('<div class="bar tools"><span class="find">%s'
                    '<input type="search" value="hoodie" aria-label="Tìm" /></span>'
                    '<span class="fwrap"><button type="button" class="facet on">'
                    '<span class="t">Trạng thái</span><span class="n">2</span>%s</button></span>'
                    '<button type="button" class="clearf">Xoá tất cả bộ lọc</button>'
                    '<span class="spacer"></span></div>'
                    % (icon("search", ""), icon("down", ""))),
                 ('<div class="dt demo" style="margin:14px 0 0">'
                  '<div class="bar bulk"><span class="cnt">Đã chọn 2 đơn</span>%s%s%s'
                  '<button type="button" class="clearf push">Bỏ chọn</button></div></div>'
                  '<p class="cap2">Có dòng được chọn thì thanh công cụ <b>đổi vai ngay tại '
                  'chỗ</b>, cùng chiều cao, nên bảng không nhảy và mắt không phải đi tìm '
                  'thanh mới. Đây là khoảnh khắc chuyển động duy nhất của bảng.</p>')
                 % (btn("Đánh dấu đã thanh toán", "ghost sm", "confirm"),
                    btn("In phiếu giao", "ghost sm", "printer"),
                    btn("Xuất CSV", "ghost sm", "export")))

            + '<div class="panel"><div class="hd"><h2>Tiêu đề, dòng, chân bảng</h2>'
              '<div class="rt"><span class="note">sorting · rowSelection · pagination</span>'
              '</div></div><div style="padding:16px">%s'
              '<p class="cap2">Cột <code>Mã đơn</code> chưa sắp, <code>Giá trị</code> đang '
              'sắp giảm dần. Dòng giữa đang được chọn: nền đậm hơn một bậc <i>và</i> ô đánh '
              'dấu đã tích — hai kênh. Chân bảng ở đây có 3 dòng trên 1 trang nên hai nút '
              'chuyển trang <b>khoá lại</b>: đó là trạng thái đúng chứ không phải thiếu.</p>'
              '</div></div>'
              % mini(ba_dong, "", dfoot(3, 10, 1))

            + '<div class="grid2" style="margin-top:16px">'
              '<div class="panel" style="margin:0"><div class="hd"><h2>Đang tải</h2></div>'
              '<div style="padding:16px">%s<p class="cap2">Giữ nguyên tiêu đề cột để bố cục '
              'không nhảy khi dữ liệu về.</p></div></div>'
              '<div class="panel" style="margin:0"><div class="hd"><h2>Chưa có gì</h2></div>'
              '<div style="padding:16px"><div class="dt demo" style="margin:0">%s</div>'
              '<p class="cap2">Bảng rỗng vì thật sự chưa có dữ liệu. Câu trả lời là một '
              'nút tạo mới.</p></div></div>'
              '<div class="panel" style="margin:0"><div class="hd"><h2>Lọc không ra</h2></div>'
              '<div style="padding:16px"><div class="dt demo" style="margin:0">%s%s</div>'
              '<p class="cap2">Có dữ liệu, chỉ là bộ lọc đang quá hẹp. Câu trả lời là xoá '
              'lọc — khác hẳn cảnh trên.</p></div></div>'
              '<div class="panel" style="margin:0"><div class="hd"><h2>Hỏng</h2></div>'
              '<div style="padding:16px"><div class="dt demo" style="margin:0">%s</div>'
              '<p class="cap2">Nói ra việc gì hỏng và làm gì tiếp, không phải "đã có lỗi '
              'xảy ra".</p></div></div></div>'
              % ('<div class="dt demo" style="margin:0">%s</div>' % dskel(c4, 4),
                 dblank("box", "Chưa có đơn nào",
                        "Đợt 05 mở lúc 18:00. Đơn đầu tiên sẽ hiện ở đây ngay khi có.",
                        btn("Xem đợt đang mở", "sm", "calendar")),
                 ('<div class="bar tools"><span class="find">%s<input type="search" '
                  'value="hoodie xanh" aria-label="Tìm" /></span>'
                  '<span class="fwrap"><button type="button" class="facet on">'
                  '<span class="t">Trạng thái</span><span class="n">1</span>%s</button></span>'
                  '</div>' % (icon("search", ""), icon("down", ""))),
                 dblank("search", "Không đơn nào khớp",
                        "Đang tìm “hoodie xanh” và lọc theo trạng thái Đã huỷ. "
                        "Bỏ bớt một điều kiện là ra.",
                        btn("Xoá tất cả bộ lọc", "ghost sm", "x")),
                 dblank("danger", "Không tải được danh sách đơn",
                        "Máy chủ không trả lời sau 10 giây. Đơn vẫn an toàn — đây chỉ là "
                        "lỗi hiển thị.",
                        btn("Thử lại", "sm", "refresh"), bad=True))

            + '<div class="panel"><div class="hd"><h2>Cột ghim · cuộn ngang</h2>'
              '<div class="rt"><span class="note">columnPinning</span></div></div>'
              '<div style="padding:16px"><div style="max-width:560px">%s</div>'
              '<p class="cap2">Cửa sổ hẹp lại thì bảng cuộn ngang, nhưng <b>ô đánh dấu và '
              'mã đơn ở lại</b> — cuộn tới cột nào cũng biết đang đọc dòng nào. Bóng đổ ở '
              'mép cột ghim <b>chỉ hiện khi đã cuộn</b>; vẽ sẵn thì nó là trang trí.</p>'
              '</div></div>'
              % _ghim()

            + '<div class="panel ref"><div class="hd"><h2>Mảnh nào ứng với API nào</h2>'
              '<div class="rt"><span class="note">%d mảnh</span></div></div>'
              '<table><thead><tr><th>Trong mock</th><th>Trong TanStack</th>'
              '<th>Vì sao làm vậy</th></tr></thead><tbody>%s</tbody></table></div>'
              % (len(REF), ref)

            + '<p style="margin-top:18px">Hai điều cần nhớ khi dựng thật: '
              '<b>shadcn gắn sẵn <code>focus-visible:ring-*</code></b> lên mọi component — '
              'phải gỡ, vì hệ này không cho vòng focus hiện ra khi bấm chuột. Và '
              '<b>shadcn mặc định dùng lucide-react</b> — phải đổi sang Iconsax, nếu không '
              'trang sẽ trộn hai bộ icon khác nét nhau.</p>'
            + '</div>')
