# -*- coding: utf-8 -*-
"""Nhóm nội dung & hỗ trợ, cộng ba lỗ hổng còn lại trong phạm vi cũ.

Quy tắc nội dung ở đây: chỉ viết thành lời những gì PRODUCT.md đã xác lập
(bán theo đợt, cắt một lần, không may thêm, unisex, đổi trả 7 ngày, giao 2–4 ngày).
Mọi thứ chưa chốt — câu chuyện thương hiệu, xưởng may, địa chỉ, kênh liên hệ,
đơn vị vận chuyển — để nguyên thành ô `.todo` ghi rõ cần viết gì, chứ không bịa.
"""
from mocklib import (im, CUST, icon, nav, sub, card, btn, field, steps, badge,
                     side, admtop)

CSS = """
/* ô nội dung chưa chốt (tên riêng: `.todo` đụng với trạng thái .st.todo của thanh bước) — không bịa, mà nói rõ chỗ này cần gì */
.s .needwrite{ margin:14px 18px 0; border:1px dashed var(--line); border-radius:var(--r);
  background:var(--gold-50); padding:12px 14px; }
.s .needwrite .lb{ display:flex; align-items:center; gap:6px; font-size:10px; font-weight:700;
  color:var(--warn); letter-spacing:.06em; }
.s .needwrite .lb svg{ width:13px; height:13px; color:var(--warn); }
.s .needwrite p{ margin:7px 0 0; font-size:12px; color:var(--ink2); line-height:1.55; }

/* hỏi đáp */
.s .qa{ margin:14px 18px 0; border:1px solid var(--hair); border-radius:var(--r);
  overflow:hidden; }
.s .qa .q{ padding:13px 14px; border-top:1px solid var(--hair); }
.s .qa .q:first-child{ border-top:0; }
.s .qa .q.open{ background:var(--gold-50); }
.s .qa .hd{ display:flex; gap:12px; align-items:flex-start; }
.s .qa .t{ flex:1; font-size:12.5px; font-weight:600; }
.s .qa .hd svg{ width:15px; height:15px; color:var(--ink2); flex:none; margin-top:1px; }
.s .qa .q.open .hd svg{ transform:rotate(90deg); color:var(--link); }
.s .qa .a{ font-size:12px; color:var(--ink2); line-height:1.62; margin-top:8px; }
.s .qa .q:not(.open) .a{ display:none; }
.s .qa .hd svg{ transition:transform .16s ease; }
@media (prefers-reduced-motion:reduce){ .s .qa .hd svg{ transition:none; } }
.s .qa .a b{ color:var(--ink); font-weight:600; }

/* danh sách có đánh số */
.s .steps-num{ margin:12px 18px 0; }
.s .steps-num .it{ display:flex; gap:11px; padding:9px 0; }
.s .steps-num .n{ width:20px; height:20px; border-radius:99px; background:var(--gold-100);
  color:var(--ink2); font-size:11px; font-weight:600; display:flex; align-items:center;
  justify-content:center; flex:none; margin-top:1px; }
.s .steps-num .bd{ flex:1; font-size:12.5px; line-height:1.55; }
.s .steps-num .bd b{ display:block; font-weight:600; }
.s .steps-num .bd span{ color:var(--ink2); font-size:12px; }

/* điều kiện mật khẩu */
.s .rules{ padding:10px 18px 0; }
.s .rules div{ display:flex; gap:8px; align-items:center; font-size:11.5px;
  color:var(--ink2); padding:3px 0; }
.s .rules svg{ width:14px; height:14px; flex:none; }
.s .rules .ok{ color:var(--ok); }
.s .rules .no{ color:var(--hot); }

/* khối 404 */
.s .void{ margin:26px 18px 0; border:1px dashed var(--line); border-radius:var(--r);
  background:var(--gold-50); aspect-ratio:4/3; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:10px; text-align:center; padding:20px; }
.s .void svg{ width:34px; height:34px; color:var(--link); }
.s .void .t{ font-family:"Familjen Grotesk",sans-serif; font-weight:700; font-size:16px; }
.s .void .d{ font-size:12px; color:var(--ink2); line-height:1.55; max-width:30ch; }

/* ô thả ảnh lớn cho sản phẩm chưa có ảnh nào */
.s .drop{ border:1px dashed var(--line); border-radius:var(--r); background:var(--gold-50);
  padding:30px 20px; display:flex; flex-direction:column; align-items:center; gap:8px;
  text-align:center; }
.s .drop svg{ width:26px; height:26px; color:var(--link); }
.s .drop .t{ font-size:12.5px; font-weight:600; }
.s .drop .d{ font-size:11px; color:var(--ink2); line-height:1.5; }
"""


def todo(label, text):
    return ('<div class="needwrite"><span class="lb">%s %s</span><p>%s</p></div>'
            % (icon("edit", ""), label, text))


# ═════════════════════════════════════ NỘI DUNG & HỖ TRỢ
def sc_about():
    def how(ic, t, d):
        return ('<div class="row">%s<span class="grow"><span class="t">%s</span>'
                '<span class="d">%s</span></span></div>' % (icon(ic), t, d))
    return (nav() + sub("Giới thiệu") +
            '<div class="hero" style="height:250px"><img src="%s" alt="" /></div>'
            % im("hero", 820, 72) +
            '<div class="lead" style="padding-top:16px;font-size:14.5px;color:var(--ink);'
            'line-height:1.5">Bán theo đợt. Cắt một lần. Hết là hết.</div>'
            '<div class="lead">Không có hàng tồn quanh năm, không có size nào lúc nào cũng '
            'sẵn. Mỗi đợt là một lần cắt vải, bán hết thì đóng.</div>'
            '<div class="h2">Cách chúng tôi bán</div>'
            '<div class="rows">'
            + how("scissor", "Cắt đúng một lần",
                  "Mỗi mẫu cắt từ khổ vải đã đặt sẵn. Không may thêm giữa đợt.")
            + how("clock", "Đợt có giờ mở và giờ đóng",
                  "Mở theo lịch công bố trước. Đóng khi hết hàng hoặc hết giờ.")
            + how("box", "Số lượng nói thật từ đầu",
                  "Còn bao nhiêu chiếc hiện ngay ở lưới, không đợi bấm vào mới biết.")
            + how("people", "Một dải size cho tất cả",
                  "Không chia nhánh nam nữ. Chọn theo form dáng và số đo.")
            + '</div>'
            + todo("BẠN CẦN VIẾT · CÂU CHUYỆN",
                   "Vì sao bạn mở shop, ai đang làm, làm ở đâu. Khoảng 2–3 đoạn, "
                   "đặt ngay dưới phần trên. Đây là chỗ khách quyết định có tin bạn không.")
            + todo("BẠN CẦN VIẾT · CHẤT LIỆU & XƯỞNG",
                   "Vải lấy ở đâu, may ở đâu, vì sao chọn chỗ đó. Nếu chưa muốn công khai "
                   "xưởng thì nói rõ là chưa công khai — vẫn hơn để trống.")
            + '<div style="padding:18px 18px 0">%s</div>' % btn("Xem đợt đang mở", "", "grid") +
            '<div style="height:24px"></div>')


def sc_faq():
    QA = [
        ("“Đợt” là gì?",
         "Một lần mở bán có thời hạn. Mỗi đợt gồm vài mẫu, mỗi mẫu cắt một lần với số "
         "lượng cố định. Đợt đóng khi hết hàng hoặc tới giờ đóng.", True),
        ("Hết size rồi có may thêm không?",
         "<b>Không.</b> Trong cùng một đợt thì không may thêm. Mẫu đó có thể quay lại ở "
         "đợt sau, cũng có thể không — chúng tôi sẽ nói rõ khi mở đợt.", True),
        ("Bao lâu thì nhận được hàng?", "2–4 ngày làm việc. Miễn phí giao cho đơn từ "
         "1.000.000₫, dưới mức đó phí 30.000₫. Nội thành có tuỳ chọn giao trong 24 giờ.", False),
        ("Đổi trả thế nào?", "7 ngày kể từ khi nhận, với điều kiện chưa qua sử dụng và "
         "còn tag. Xem chi tiết ở trang Chính sách đổi trả.", False),
        ("Thanh toán bằng gì?", "Chuyển khoản ngân hàng, thẻ nội địa và Visa, hoặc thu hộ "
         "khi nhận hàng (thu thêm 15.000₫).", False),
        ("Làm sao biết đợt mới mở?", "Đặt nhắc ở trang chủ hoặc bật thông báo trong tài "
         "khoản. Người đã đặt nhắc được vào trước 2 giờ.", False),
    ]
    items = "".join(
        '<div class="q%s"><span class="hd">%s<span class="t">%s</span></span>'
        '<div class="a">%s</div></div>'
        % (" open" if op else "", icon("chev", "ic sm"), q, a)
        for q, a, op in QA)
    return (nav() + sub("Câu hỏi thường gặp") +
            '<div class="qa">%s</div>' % items +
            todo("BẠN CẦN CHỐT · ĐƠN VỊ VẬN CHUYỂN",
                 "Câu trả lời về thời gian giao đang dựa trên con số dự kiến. Chốt đối tác "
                 "xong thì sửa lại cho đúng, và nói tên đối tác ở đây.") +
            '<div class="h2">Chưa thấy câu của bạn?</div>'
            '<div style="padding:12px 18px 24px">%s</div>' % btn("Gửi câu hỏi", "ghost", "sms"))


def sc_policy():
    def step(n, t, d):
        return ('<div class="it"><span class="n">%s</span><span class="bd"><b>%s</b>'
                '<span>%s</span></span></div>' % (n, t, d))
    def rule(ic, cls, t):
        return ('<div class="row">%s<span class="grow"><span class="t">%s</span></span></div>'
                % (icon(ic, "ic").replace('class="ic"',
                                          'class="ic" style="color:var(--%s)"' % cls), t))
    return (nav() + sub("Chính sách đổi trả") +
            '<div class="band"><b>7 ngày</b><span class="sep">/</span>'
            '<span>chưa qua sử dụng</span><span class="cd">còn tag</span></div>'
            '<div class="lead">Tính từ ngày bạn nhận hàng, không phải ngày đặt.</div>'
            '<div class="h2">Đổi trả được khi</div>'
            '<div class="rows">'
            + rule("confirm", "ok", "Còn nguyên tag và bao bì")
            + rule("confirm", "ok", "Chưa giặt, chưa sửa, không mùi lạ")
            + rule("confirm", "ok", "Sai size so với đơn đã đặt")
            + rule("confirm", "ok", "Lỗi từ phía chúng tôi: sai mẫu, lỗi may, rách")
            + '</div>'
            '<div class="h2">Không đổi trả được khi</div>'
            '<div class="rows">'
            + rule("x", "hot", "Đã qua sử dụng hoặc đã giặt")
            + rule("x", "hot", "Mất tag hoặc hư bao bì")
            + rule("x", "hot", "Quá 7 ngày kể từ khi nhận")
            + '</div>'
            '<div class="h2">Đổi size thì sao</div>'
            '<div class="lead">Đổi size chỉ được khi size đó <b>còn hàng trong cùng đợt</b>. '
            'Đợt đã đóng thì không còn gì để đổi — lúc đó chỉ hoàn tiền.</div>'
            '<div class="h2">Các bước</div>'
            '<div class="steps-num">'
            + step("1", "Nhắn cho chúng tôi trong 7 ngày",
                   "Kèm mã đơn và ảnh món hàng.")
            + step("2", "Chúng tôi xác nhận trong 24 giờ",
                   "Nếu hợp lệ, bạn nhận hướng dẫn gửi trả.")
            + step("3", "Gửi hàng về", "Giữ biên lai gửi cho tới khi xong.")
            + step("4", "Hoàn tiền hoặc gửi hàng đổi",
                   "Hoàn tiền trong 3–5 ngày làm việc kể từ khi nhận được hàng trả.")
            + '</div>'
            + todo("BẠN CẦN CHỐT · AI CHỊU PHÍ GỬI TRẢ",
                   "Lỗi từ shop thì shop chịu — chỗ này rõ rồi. Còn khách đổi ý hoặc chọn "
                   "nhầm size thì ai trả phí gửi? Chưa chốt nên chưa viết vào.") +
            '<div style="padding:18px 18px 24px">%s</div>' % btn("Yêu cầu đổi trả", "", "swap"))


def sc_contact():
    def ch(ic, t, d):
        return ('<div class="row">%s<span class="grow"><span class="t">%s</span>'
                '<span class="d">%s</span></span></div>' % (icon(ic), t, d))
    return (nav() + sub("Liên hệ") +
            '<div class="lead" style="padding-top:16px">Hỏi về đơn hàng thì kèm mã đơn, '
            'chúng tôi tra nhanh hơn nhiều.</div>'
            '<div class="rows">'
            + ch("sms", "Email", "chưa công bố")
            + ch("instagram", "Instagram", "chưa công bố")
            + ch("clock", "Giờ trả lời", "chưa chốt")
            + '</div>'
            + todo("BẠN CẦN ĐIỀN · KÊNH LIÊN HỆ",
                   "Email, Instagram và khung giờ trả lời. Ba dòng trên đang để trống thật "
                   "chứ không phải ví dụ — điền xong là xong trang này.")
            + '<div class="h2">Hoặc gửi ngay tại đây</div>'
            + field("Bạn muốn hỏi về", "Đơn hàng của tôi " + icon("down", "ic sm"), kind="sel")
            + field("Mã đơn", "VD: DH-2431", placeholder=True)
            + field("Email để nhận trả lời", CUST["mail"])
            + field("Nội dung", "Viết ngắn gọn giúp chúng tôi", placeholder=True, kind="area")
            + '<div style="padding:18px 18px 0">%s</div>' % btn("Gửi", "", "send") +
            '<div class="note" style="padding:9px 18px 24px">Chúng tôi trả lời theo thứ tự '
            'nhận được.</div>')


def sc_404():
    return (nav() +
            '<div class="void">%s<span class="t">Không có trang này</span>'
            '<span class="d">Có thể nó thuộc một đợt đã đóng, hoặc đường dẫn bị gõ sai.</span>'
            '</div>' % icon("search", "") +
            '<div style="padding:18px 18px 0">%s</div>' % btn("Về trang chủ", "", "home") +
            '<div style="padding:10px 18px 0">%s</div>' % btn("Xem đợt đang mở", "ghost", "grid") +
            '<div class="h2">Có thể bạn đang tìm</div>'
            '<div class="grid" style="padding-bottom:24px">%s</div>'
            % "".join(card(k) for k in ("khoi", "bui")))


# ═════════════════════════════════════ BÙ NỐT TRONG PHẠM VI CŨ
def sc_password():
    def r(ok, t):
        return ('<div><span class="%s">%s</span>%s</div>'
                % ("ok" if ok else "no", icon("confirm" if ok else "x", ""), t))
    return (nav() + sub("Đổi mật khẩu") +
            field("Mật khẩu hiện tại", "••••••••") +
            field("Mật khẩu mới", "••••••") +
            '<div class="rules">%s%s%s</div>'
            % (r(True, "Ít nhất 8 ký tự"), r(True, "Có cả chữ và số"),
               r(False, "Khác mật khẩu cũ")) +
            field("Nhập lại mật khẩu mới", "••••••") +
            '<div style="padding:18px 18px 0">%s</div>' % btn("Đổi mật khẩu", "off") +
            '<div class="note" style="padding:9px 18px 0">Đổi xong, bạn sẽ bị đăng xuất khỏi '
            'các thiết bị khác. Thiết bị này vẫn giữ đăng nhập.</div>'
            '<div style="padding:16px 18px 24px">%s</div>' % btn("Huỷ", "quiet", "x"))


def sc_order_cancelled():
    return (nav() + sub("#DH-2310", "Cần hỗ trợ?") +
            '<div class="band" style="background:var(--gold-100)"><b>Đã huỷ</b>'
            '<span class="sep">/</span><span>18/08/2026</span>'
            '<span class="cd">%s</span></div>' % badge("Đã huỷ", "hot") +
            '<div class="alert">%s<span><span class="t">Đơn huỷ do quá hạn chuyển khoản</span>'
            '<span class="d">Đơn giữ chỗ 12 giờ chờ chuyển khoản. Quá hạn thì tự huỷ để trả '
            'hàng về cho người khác mua.</span></span></div>' % icon("danger", "") +
            '<div class="tl">'
            '<div class="it done"><span class="gut"><span class="dot"></span>'
            '<span class="stem"></span></span><span class="bd">'
            '<span class="t">Đã nhận đơn</span><span class="d">18/08 · 09:12</span></span></div>'
            '<div class="it now"><span class="gut"><span class="dot"></span></span>'
            '<span class="bd"><span class="t">Tự huỷ vì quá hạn chuyển khoản</span>'
            '<span class="d">18/08 · 21:12</span></span></div>'
            '</div>'
            '<div class="h2">Món trong đơn</div>'
            '<div class="rows" style="margin-top:10px">'
            '<div class="row"><span class="thumb"><img src="%s" alt="" /></span>'
            '<span class="grow"><span class="t nm">NẮNG</span>'
            '<span class="d">Áo thun · L · x1</span></span>'
            '<span class="amt" style="text-decoration:line-through;color:var(--ink2)">'
            '450.000₫</span></div></div>' % im("nang", 150, 60) +
            '<div class="rows">'
            '<div class="row">%s<span class="grow"><span class="t">Không có gì để hoàn</span>'
            '<span class="d">Đơn chưa từng được thanh toán nên không phát sinh hoàn tiền.'
            '</span></span></div></div>' % icon("refund") +
            '<div style="padding:16px 18px 0">%s</div>' % btn("Đặt lại đơn này", "", "refresh") +
            '<div class="note" style="padding:9px 18px 24px">NẮNG hiện còn 34 chiếc trong '
            'đợt 05.</div>')


def sc_product_new():
    sizes = "".join(
        '<tr><td><b>%s</b></td><td><div class="inp ph2" style="width:78px">0</div></td>'
        '<td class="note">chưa mở bán</td></tr>' % z for z in ("S", "M", "L", "XL"))
    return (side("Sản phẩm") +
            '<div class="main">' +
            admtop("Thêm sản phẩm", btn("Huỷ", "ghost sm", "x") + btn("Lưu nháp", "sm", "confirm")) +
            '<div style="display:grid;grid-template-columns:1.5fr 1fr;gap:16px;'
            'align-items:start">'
            '<div><div class="panel" style="margin-top:16px"><div class="hd">'
            '<h2>Thông tin cơ bản</h2></div>'
            '<div class="fgrid">'
            '<div class="full"><label>Tên sản phẩm</label>'
            '<div class="inp ph2">VD: KHÓI</div></div>'
            '<div><label>Loại</label><div class="inp sel ph2">Chọn loại %s</div></div>'
            '<div><label>Mã sản phẩm</label><div class="inp ph2">tự sinh từ tên</div></div>'
            '<div><label>Giá bán</label><div class="inp ph2">0₫</div></div>'
            '<div><label>Đợt</label><div class="inp sel">Đợt 06 · nháp %s</div></div>'
            '<div class="full"><label>Mô tả</label>'
            '<div class="inp area ph2">Chất liệu, form dáng, cách bảo quản</div></div>'
            '</div></div>'
            '<div class="panel"><div class="hd"><h2>Số lượng cắt theo size</h2>'
            '<div class="rt"><span class="note">tổng 0 chiếc</span></div></div>'
            '<table><thead><tr><th>Size</th><th>Sẽ cắt</th><th>Trạng thái</th></tr></thead>'
            '<tbody>%s</tbody></table>'
            '<div style="padding:12px 16px;border-top:1px solid var(--hair)" class="note">'
            'Nhập đúng số đã đặt xưởng. Con số này khoá lại khi đợt mở — không sửa được '
            'giữa đợt.</div></div></div>'
            '<div><div class="panel" style="margin-top:16px"><div class="hd"><h2>Ảnh</h2>'
            '</div><div style="padding:16px"><div class="drop">%s'
            '<span class="t">Kéo ảnh vào đây</span>'
            '<span class="d">Tỉ lệ 4:5, tối thiểu 1200px.<br/>Ảnh đầu tiên là ảnh ở lưới.</span>'
            '</div></div></div>'
            '<div class="panel"><div class="hd"><h2>Trạng thái</h2></div>'
            '<div style="padding:16px">%s'
            '<div class="note" style="margin-top:10px">Sản phẩm nháp không hiện ở cửa hàng. '
            'Nó lên sóng khi bạn mở đợt 06.</div></div></div></div>'
            '</div></div>'
            % (icon("down", "ic sm"), icon("down", "ic sm"), sizes,
               icon("gallery", ""), badge("Nháp · chưa công bố", "flat", False)))
