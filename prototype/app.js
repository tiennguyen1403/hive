/* ══════════════════════════════════════════════════════════════════════════
   BẢN CHẠY THỬ — phần nối các màn lại với nhau

   Bản mock là ảnh tĩnh: mỗi màn đứng một mình. File này làm ba việc:

     1. NỐI     — bảng ROUTE bên dưới nói nhãn nào dẫn đi đâu. Mọi thứ bấm
                  được đều phải có mặt trong bảng; thứ không có mặt sẽ bị
                  đánh dấu và __audit() liệt kê ra, nên không có nút chết.
     2. DIỄN    — chọn size, tăng giảm số lượng, gập mở câu hỏi, trượt tấm
                  bộ lọc… những gì tay người làm được thì ở đây làm được.
     3. NHỚ     — số món trong giỏ và giờ đóng đợt sống trong localStorage,
                  nên đi từ màn này sang màn khác vẫn đúng một câu chuyện.

   Không đụng vào hình thức. Màu, khoảng cách, kiểu chữ nằm ở app.css.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var HERE = document.body.dataset.screen || '';
  var IS_HOME = HERE === 'index';

  /* ── Chuột hay bàn phím ──────────────────────────────────────────────────
     Vòng focus chỉ được hiện khi đi bằng Tab. `:focus-visible` không đủ để
     bảo đảm điều đó: đã đo, nó vẫn bật sau một cú chuột trên phần tử có
     tabindex và trên cả <button> thật khi bị focus bằng script. Nên đánh dấu
     thẳng ở <html>, shell.css đọc dấu này mà tắt vòng focus.
     Mặc định coi như đang dùng chuột — chỉ phím Tab mới mở nó ra. */
  var DE = document.documentElement;
  DE.setAttribute('data-chuot', '');
  addEventListener('pointerdown', function () {
    DE.setAttribute('data-chuot', '');
  }, true);
  addEventListener('keydown', function (e) {
    if (e.key === 'Tab') DE.removeAttribute('data-chuot');
  }, true);

  /* ═══════════════════════════════════════════════ 1 · BẢNG ĐƯỜNG ĐI
     go:<màn>   đi tới màn khác
     act:<tên>  làm gì đó ngay tại chỗ
     say:<lời>  việc này có thật nhưng không dẫn sang màn nào — nói rõ ra
                thay vì giả vờ, và thay vì để nút chết.                     */

  var ANY = {
    'BRAND': 'go:trang-chu',
    'Áo': 'go:danh-muc', 'Khoác': 'go:danh-muc', 'Quần': 'go:danh-muc',
    'Phụ kiện': 'go:danh-muc', 'Đợt 05': 'go:danh-muc',
    'Xem sáu mẫu': 'go:danh-muc', 'Xem tất cả': 'go:danh-muc',
    'Xem cả đợt 05': 'go:danh-muc', 'Xem đợt 05': 'go:danh-muc',
    'Xem sản phẩm': 'go:san-pham',

    'Thêm vào giỏ': 'act:addcart',
    'Tiến hành thanh toán': 'go:thanh-toan',
    'Lưu vào yêu thích': 'act:wish',
    'Bảng size': 'act:sheet:bang-size',
    'Lọc': 'act:sheet:bo-loc',

    'Đăng nhập': 'go:tai-khoan',
    'Quên mật khẩu?': 'go:quen-mat-khau',
    'Tạo tài khoản': 'go:dang-ky',
    'Mua không cần tài khoản': 'go:danh-muc',
    'Đăng xuất': 'go:dang-nhap',
    'Về trang chủ': 'go:trang-chu',
    'Câu hỏi thường gặp': 'go:cau-hoi',
    'Chính sách đổi trả': 'go:doi-tra',
    'Liên hệ': 'go:lien-he',
    'Giới thiệu': 'go:gioi-thieu',
    'Xem chi tiết': 'go:don-chi-tiet',
    'Theo dõi đơn': 'go:theo-doi',
    'Huỷ': 'act:back',
    'Đóng': 'act:closesheet',
    'Xoá tất cả': 'act:clearfilter',
    'Bỏ lọc': 'act:closesheet',
    'Xem 4 mẫu': 'act:applyfilter',
    'Tôi mặc size M': 'act:picksize',

    'Sao chép': 'act:copy',
    'Xem đợt đang mở': 'go:danh-muc',
    'Xem cả sáu mẫu': 'go:danh-muc', 'xem lại sáu mẫu': 'go:danh-muc',
    'Tiếp tục xem đợt 05': 'go:danh-muc',
    'Theo dõi đơn hàng': 'go:theo-doi', 'Theo dõi chi tiết': 'go:theo-doi',
    'Yêu cầu đổi trả': 'go:lien-he',

    'Mới nhất': 'act:chip', 'Oversize': 'act:chip', 'Regular': 'act:chip',
    'Rộng': 'act:chip', 'Còn size S': 'act:chip', 'S': 'act:chip',
    'M': 'act:chip', 'L': 'act:chip', 'XL': 'act:chip',
    'Tất cả trạng thái': 'act:chip', 'Giá thấp đến cao': 'act:radio',
    'Giá cao đến thấp': 'act:radio', 'Sắp hết trước': 'act:radio'
  };

  /* Thanh bên khu quản trị — theo vị trí chứ không theo nhãn, vì những chữ
     như “Sản phẩm” hay “Đơn hàng” còn xuất hiện ở chỗ khác. */
  var SIDE = {
    'Tổng quan': 'qt-tong-quan', 'Đợt bán': 'qt-dot-ban',
    'Sản phẩm': 'qt-san-pham', 'Đơn hàng': 'qt-don-hang',
    'Khách hàng': 'qt-khach-hang', 'Khuyến mãi': 'qt-khuyen-mai'
  };

  var ON = {
    'trang-chu': { 'xem lại': 'say:Đợt 04 đã đóng. Bản chạy thử chỉ dựng đợt 05.' },
    'dot-sap-mo': { 'Nhắc tôi khi mở': 'say:Đã ghi nhận. Người đặt nhắc được vào trước 2 giờ.' },
    'dot-da-dong': { 'Nhắc tôi khi đợt 06 mở': 'say:Đã ghi nhận. Người đặt nhắc được vào trước 2 giờ.' },
    'tim-kiem': { 'hoodie': 'act:chip', 'áo khoác': 'act:chip', 'nỉ bông': 'act:chip',
                  'oversize': 'act:chip' },
    'tim-kiem-rong': { 'hoodie': 'act:chip', 'jogger': 'act:chip', 'oversize': 'act:chip' },
    'san-pham-het': {
      'Báo tôi khi có lại': 'say:Đã ghi nhận. Mẫu này có lại là bạn được báo trước.'
    },
    'gio-hang': { 'Xoá': 'act:delline', 'Áp dụng': 'act:promo' },
    'gio-hang-loi': {
      'Xoá': 'act:delline', 'Bỏ khỏi giỏ': 'act:delline', 'Áp dụng': 'act:promo',
      'Đổi sang size L': 'act:swapsize'
    },
    'thanh-toan': { 'Đặt hàng': 'act:order' },
    'dat-hang-xong': { 'Sao chép': 'act:copy' },
    'dang-nhap': { 'Đăng ký': 'go:dang-ky',
                   'Tiếp tục với Google': 'say:Bản chạy thử không gọi ra Google thật.' },
    'dang-ky': { 'Đăng ký': 'go:tai-khoan', 'Đăng nhập': 'go:dang-nhap' },
    'quen-mat-khau': { 'Gửi liên kết đặt lại': 'go:quen-mat-khau-da-gui' },
    'quen-mat-khau-da-gui': {
      'Gửi lại': 'say:Đã gửi lại. Kiểm tra cả hộp thư rác.',
      'Mở ứng dụng email': 'say:Ở bản thật, nút này mở ứng dụng thư của máy.'
    },
    'tai-khoan': {
      'Đơn hàng của tôi': 'go:don-hang', 'Sổ địa chỉ': 'go:dia-chi',
      'Yêu thích': 'go:yeu-thich', 'Thông tin cá nhân': 'go:thong-tin',
      'Đổi mật khẩu': 'go:doi-mat-khau'
    },
    'thong-tin': {
      'Lưu thay đổi': 'say:Đã lưu. Ở bản thật, đổi email cần xác nhận lại.',
      'Sửa': 'act:inline', 'Đổi': 'go:doi-mat-khau',
      'Đổi mật khẩu': 'go:doi-mat-khau',
      'Bỏ liên kết': 'say:Bỏ liên kết Google. Bạn vẫn đăng nhập được bằng mật khẩu.',
      'Xoá tài khoản': 'say:Ở bản thật, bước này hỏi lại một lần nữa trước khi xoá.'
    },
    'doi-mat-khau': { 'Đổi mật khẩu': 'act:pwd', 'Huỷ': 'act:back' },
    'don-chi-tiet': { 'Mua lại đơn này': 'act:reorder' },
    'don-da-huy': { 'Đặt lại đơn này': 'act:reorder' },
    'dia-chi': { 'Thêm địa chỉ': 'go:dia-chi-them', 'Sửa': 'go:dia-chi-them' },
    'dia-chi-them': {
      'Lưu địa chỉ': 'go:dia-chi',
      'Nhà': 'act:chipone', 'Công ty': 'act:chipone', 'Khác': 'act:chipone'
    },
    'yeu-thich': { 'Thêm cả 2 mẫu còn hàng vào giỏ': 'act:addall' },
    'lien-he': { 'Gửi': 'say:Đã gửi. Ba kênh liên hệ còn chờ bạn điền thật.' },
    'cau-hoi': { 'Gửi câu hỏi': 'go:lien-he' },
    'khong-tim-thay': { 'Xem đợt đang mở': 'go:danh-muc' },

    'qt-bang': { 'Mở': 'go:qt-don-chi-tiet' },
    'qt-tong-quan': { 'Xuất báo cáo': 'say:Ở bản thật, nút này tải về một file CSV.' },
    'qt-dot-ban': {
      'Tạo đợt mới': 'act:form', 'Xem': 'go:qt-san-pham',
      'Mở bán': 'say:Mở đợt là công bố giá và số lượng. Bản thật sẽ hỏi lại.',
      'Đóng đợt': 'say:Đóng là đóng hẳn, không mở lại. Bản thật sẽ hỏi lại.',
      'Mở bán ngay': 'say:Mở đợt là công bố giá và số lượng. Bản thật sẽ hỏi lại.',
      'Lưu nháp': 'say:Đã lưu nháp. Nháp chưa hiện ra ngoài cửa hàng.'
    },
    'qt-san-pham': { 'Sửa': 'go:qt-san-pham-sua', 'Thêm sản phẩm': 'go:qt-san-pham-them' },
    'qt-san-pham-them': {
      'Huỷ': 'go:qt-san-pham', 'Lưu sản phẩm': 'go:qt-san-pham',
      'Lưu nháp': 'say:Đã lưu nháp. Nháp chưa hiện ra ngoài cửa hàng.'
    },
    'qt-san-pham-sua': {
      'Huỷ': 'go:qt-san-pham', 'Lưu thay đổi': 'go:qt-san-pham',
      'Tải lên': 'say:Bản chạy thử không nhận ảnh. Ảnh đang dùng là ảnh mượn tạm.'
    },
    'qt-don-hang': {
      'Xem': 'go:qt-don-chi-tiet', 'Mở': 'go:qt-don-chi-tiet',
      'Huỷ đơn': 'say:Huỷ đơn thì hoàn tồn kho lại cho đợt. Bản thật sẽ hỏi lại.',
      'Xuất CSV': 'say:Ở bản thật, nút này tải về một file CSV.',
      'Đánh dấu đã thanh toán': 'say:Đã đánh dấu. Bản thật sẽ gửi email cho khách.',
      'In phiếu giao': 'say:Ở bản thật, nút này mở hộp thoại in của trình duyệt.'
    },
    'qt-don-chi-tiet': {
      'Quay lại': 'go:qt-don-hang',
      'Đánh dấu đã thanh toán': 'say:Đã đánh dấu. Bản thật sẽ gửi email cho khách.',
      'In phiếu giao': 'say:Ở bản thật, nút này mở hộp thoại in của trình duyệt.'
    },
    'qt-khach-hang': {
      'Xem': 'go:qt-khach-chi-tiet',
      'Xuất danh sách': 'say:Ở bản thật, nút này tải về một file CSV.'
    },
    'qt-khach-chi-tiet': {
      'Quay lại': 'go:qt-khach-hang',
      'Gửi email': 'say:Ở bản thật, nút này mở trình soạn thư.'
    },
    'qt-khuyen-mai': {
      'Tạo mã mới': 'act:form', 'Sửa': 'act:form',
      'Tạo mã': 'say:Đã tạo mã. Mã dùng được ngay ở bước thanh toán.'
    }
  };

  /* Hàng nào trong danh sách dẫn sang màn nào — khớp theo đầu chuỗi, vì mã đơn
     thì mỗi hàng một khác. */
  var ROWGO = {
    'don-hang': function (t) {
      if (t.indexOf('#DH-2310') === 0) return 'go:don-da-huy';   /* đơn đã huỷ */
      return t.indexOf('#DH-') === 0 ? 'go:don-chi-tiet' : null;
    }
  };

  /* Thẻ sản phẩm dẫn đi đâu — MUỐI đã hết nên rẽ sang màn hết hàng. */
  function cardTarget(el) {
    var sold = $('.sold', el);
    var nm = $('.nm', el);
    if (sold || (nm && nm.textContent.trim() === 'MUỐI')) return 'san-pham-het';
    return 'san-pham';
  }

  /* Nhãn đếm theo dữ liệu ("Xem mười mẫu") đổi mỗi khi danh mục đổi, nên
     khớp theo dạng chữ chứ đừng khớp cứng từng chuỗi. */
  var DANG = [[/^(xem|xem lại|xem cả) .*mẫu$/i, 'go:danh-muc']];

  function look(t) {
    var per = ON[HERE] || {};
    var cut = t.split(' · ')[0].trim();
    var v = per[t] || per[cut] || ANY[t] || ANY[cut];
    if (v) return v;
    for (var i = 0; i < DANG.length; i++) if (DANG[i][0].test(t)) return DANG[i][1];
    return null;
  }

  /* ════════════════════════════════════════════════════ 2 · TRẠNG THÁI */
  var LS = {
    get: function (k, d) {
      try { var v = localStorage.getItem('brand.' + k); return v === null ? d : v; }
      catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem('brand.' + k, v); } catch (e) {} }
  };

  function cartCount() { return parseInt(LS.get('cart', '2'), 10) || 0; }
  function setCart(n) {
    n = Math.max(0, n);
    LS.set('cart', n);
    $$('.cartdot').forEach(function (c) {
      c.dataset.n = n;
      c.setAttribute('aria-label', 'Giỏ hàng, ' + n + ' món');
      var b = $('b', c);
      if (n === 0) { if (b) b.remove(); }
      else if (b) { b.textContent = n; }
      else { b = document.createElement('b'); b.textContent = n; c.appendChild(b); }
    });
  }

  /* ════════════════════════════════════════════════════ 3 · THÔNG BÁO */
  var toastEl = null, toastT = null;
  function toast(msg, action, fn) {
    if (toastEl) toastEl.remove();
    clearTimeout(toastT);
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    var span = document.createElement('span');
    span.innerHTML = msg;
    toastEl.appendChild(span);
    if (action) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = action;
      b.addEventListener('click', function () { toastEl.remove(); toastEl = null; fn(); });
      toastEl.appendChild(b);
    }
    document.body.appendChild(toastEl);
    var el = toastEl;
    toastT = setTimeout(function () { if (el === toastEl) { el.remove(); toastEl = null; } }, 4200);
  }

  /* ════════════════════════════════════════════════════ 4 · TIỀN NONG */
  function money(t) { return parseInt(String(t).replace(/[^\d]/g, ''), 10) || 0; }
  function vnd(n) { return n.toLocaleString('vi-VN') + '₫'; }

  function qtyOf(r) {
    var i = $('.qn', r);
    return i ? (parseInt(i.value, 10) || 1) : 1;
  }

  function recalc() {
    var lines = $$('.row.cartline');
    if (!lines.length) return;
    var tinh = lines.filter(function (r) { return $('.qn', r); });
    var sub = 0;
    tinh.forEach(function (r) {
      var thanh = (parseInt(r.dataset.unit, 10) || 0) * qtyOf(r);
      var amt = $('.amt', r);
      if (amt) amt.textContent = vnd(thanh);
      sub += thanh;
    });
    var srow = $$('.sum > div');
    if (srow.length) {
      srow[0].lastElementChild.textContent = vnd(sub);
      /* Nhãn kiểu “Tạm tính · 1 món” phải chạy theo số món đang tính, không
         đứng yên khi người dùng đổi số lượng. */
      var lb = srow[0].firstElementChild;
      lb.textContent = lb.textContent.replace(/· \d+ món/, '· ' +
        tinh.reduce(function (a, r) { return a + qtyOf(r); }, 0) + ' món');
      var ship = srow[1] ? money(srow[1].lastElementChild.textContent) : 0;
      var tot = $('.sum .tot');
      if (tot) tot.lastElementChild.textContent = vnd(sub + ship);
    }
    /* Đầu trang đếm cả món đang vướng — nó vẫn đang nằm trong giỏ. */
    var n = lines.reduce(function (a, r) { return a + qtyOf(r); }, 0);
    var head = $('.sub .rt.plain');
    if (head && /món/.test(head.textContent)) head.textContent = n + ' món';
    setCart(n);
  }

  /* Đặt số lượng cho một dòng giỏ.

     Trần là số đã cắt cho đợt này. Gõ 99 vào ô không sinh thêm áo, nên chặn
     lại VÀ nói ra — sửa số trong im lặng thì người dùng tưởng mình gõ hụt. */
  function syncQty(row, v) {
    var max = parseInt(row.dataset.max, 10) || 99;
    var cham = v > max;
    v = Math.min(max, Math.max(1, v || 1));
    var inp = $('.qn', row);
    if (inp && inp.value !== String(v)) inp.value = v;
    $$('.qb', row).forEach(function (b) {
      b.disabled = b.dataset.d === '-1' ? v <= 1 : v >= max;
    });
    var cap = $('.cap', row);
    if (cap) {
      cap.textContent = cham ? 'Đợt này chỉ còn ' + max + ' chiếc.' : '';
      cap.hidden = !cham;
    }
  }

  function setQty(row, v) { syncQty(row, v); recalc(); }

  /* ═══════════════════════════════════════════ 5 · ĐỒNG HỒ ĐẾM NGƯỢC
     Đợt đóng lúc nào là một sự thật duy nhất, nên mọi màn phải nói cùng
     một con số. Giữ trong localStorage để đi qua lại vẫn liền mạch.      */
  var CD = [];
  function deadline() {
    var d = parseInt(LS.get('deadline', '0'), 10);
    if (!d || d - Date.now() < 60000) {
      d = Date.now() + (5 * 60 + 42) * 60000;
      LS.set('deadline', d);
    }
    return d;
  }
  function left() {
    var ms = Math.max(0, deadline() - Date.now());
    var m = Math.floor(ms / 60000);
    return { h: Math.floor(m / 60), m: m % 60 };
  }
  function scanClock() {
    if (HERE === 'dot-sap-mo' || HERE === 'dot-da-dong') return;
    var re = /\d+ giờ \d+ phút/;
    var w = document.createTreeWalker($('.s'), NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = w.nextNode())) if (re.test(n.nodeValue)) CD.push([n, n.nodeValue]);
    tickClock();
    setInterval(tickClock, 20000);
  }
  function tickClock() {
    var t = left();
    var s = t.h + ' giờ ' + t.m + ' phút';
    CD.forEach(function (p) { p[0].nodeValue = p[1].replace(/\d+ giờ \d+ phút/, s); });
  }

  /* ════════════════════════════════════════════════════ 6 · VIỆC TẠI CHỖ */
  function sheetFor(id) { return document.getElementById(id); }

  function openSheet(id) {
    var w = sheetFor(id);
    if (!w) return toast('Tấm này chưa gắn vào màn đang xem.');
    w.hidden = false;
    document.body.style.overflow = 'hidden';
    var f = w.querySelector('button, [tabindex]');
    if (f) f.focus();
  }
  function closeSheet() {
    var mo = $('.sheetwrap:not([hidden])');
    $$('.sheetwrap').forEach(function (w) { w.hidden = true; });
    document.body.style.overflow = '';
    /* Đóng tấm thì tiêu điểm phải quay về đúng nút đã mở nó, không rơi về
       đầu trang — người đi bằng bàn phím sẽ mất chỗ. */
    if (mo && QUAY && document.contains(QUAY)) { QUAY.focus(); QUAY = null; }
  }

  function pickedSize() {
    var on = $('.szrow .sz.on');
    return on ? $('b', on).textContent.trim() : null;
  }
  function productName() {
    var h = $('.s h1.nm') || $('.s .nm');
    return h ? h.textContent.trim() : 'sản phẩm';
  }

  var ACT = {
    back: function () {
      if (history.length > 1) history.back(); else location.href = 'index.html';
    },
    closesheet: closeSheet,

    addcart: function () {
      var sz = pickedSize();
      if (!sz) return toast('Chọn size trước đã.');
      setCart(cartCount() + 1);
      toast('Đã thêm <b>' + productName() + '</b> size ' + sz + ' vào giỏ.',
            'Xem giỏ', function () { location.href = 'gio-hang.html'; });
    },

    wish: function (el) {
      var on = el.classList.toggle('wished');
      var lb = el.lastChild;
      if (lb && lb.nodeType === 3) lb.nodeValue = on ? 'Bỏ khỏi yêu thích' : 'Lưu vào yêu thích';
      toast(on ? 'Đã lưu vào yêu thích.' : 'Đã bỏ khỏi yêu thích.',
            on ? 'Xem danh sách' : null,
            function () { location.href = 'yeu-thich.html'; });
    },

    chip: function (el) { el.classList.toggle('on'); },

    /* nhóm chip chỉ chọn được một — loại địa chỉ, chẳng hạn */
    chipone: function (el) {
      $$('.chip', el.parentElement).forEach(function (c) { c.classList.remove('on'); });
      el.classList.add('on');
    },

    /* công tắc: màu đổi VÀ nút tròn chạy sang bên kia — hai kênh, không chỉ màu */
    sw: function (el) {
      var on = el.classList.toggle('on');
      var knob = el.firstElementChild;
      el.style.background = on ? 'var(--fill)' : 'var(--hair)';
      if (knob) {
        knob.style.left = on ? 'auto' : '2px';
        knob.style.right = on ? '2px' : 'auto';
      }
      el.setAttribute('aria-checked', on ? 'true' : 'false');
    },

    /* sửa tại chỗ: giá trị trên dòng biến thành ô nhập, Enter là xong */
    inline: function (el) {
      var row = el.closest('.setrow');
      var vl = $('.vl', row);
      if (!vl || $('input', row)) return;
      var old = vl.textContent.trim();
      var inp = document.createElement('input');
      inp.type = 'text'; inp.value = old; inp.className = 'inp';
      inp.style.cssText = 'height:34px;font-size:13px;margin-top:2px';
      vl.replaceWith(inp);
      inp.focus(); inp.select();
      function done(save) {
        var s = document.createElement('span');
        s.className = 'vl';
        s.textContent = save && inp.value.trim() ? inp.value.trim() : old;
        inp.replaceWith(s);
        if (save && s.textContent !== old) toast('Đã sửa thành <b>' + s.textContent + '</b>.');
      }
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') done(true);
        if (e.key === 'Escape') done(false);
      });
      inp.addEventListener('blur', function () { done(true); });
    },

    /* nút mở ra biểu mẫu đã nằm sẵn cuối trang quản trị */
    form: function () {
      var panels = $$('.s.adm .panel');
      var last = panels[panels.length - 1];
      if (!last) return;
      last.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var f = $('input.inp, select.inp', last);
      if (f) setTimeout(function () { f.focus(); }, 320);
    },

    /* Đổi sang size còn hàng: dòng đang vướng biến thành một dòng giỏ bình
       thường — có ô số lượng và nút Xoá như mọi dòng khác. Nhân bản từ dòng
       bên cạnh để khỏi dựng lại markup ở đây. */
    swapsize: function (el) {
      var row = el.closest('.row');
      var mau = $$('.row.cartline').filter(function (r) {
        return r !== row && $('.qn', r);
      })[0];
      var d = $('.d', row);
      if (d) d.textContent = d.textContent.replace(/· [SMLX]+$/, '· L');
      row.classList.remove('snag');
      row.dataset.max = 9;                         /* size L còn 9 chiếc */

      var fixes = $('.fixes', row);
      if (fixes && mau) {
        var qty = $('.qty', mau).cloneNode(true);
        var cap = document.createElement('span');
        cap.className = 'cap'; cap.hidden = true;
        var num = $('.qn', qty);
        num.value = 1;
        num.setAttribute('aria-label', 'Số lượng ' + ($('.nm', row) || {}).textContent);
        fixes.replaceWith(qty, cap);
        var rm = $('.rm', mau);
        if (rm) $('.side', row).appendChild(rm.cloneNode(true));
        /* bản sao mang theo dấu “đã nối” của bản gốc — gỡ ra rồi nối lại */
        $$('[data-wired]', row).forEach(function (n) {
          n.removeAttribute('data-wired'); n.removeAttribute('data-act');
        });
        wireCartLine(row);
        var nrm = $('.rm', row);
        if (nrm) arm(nrm, 'act:delline');
        recalc();
      } else {
        el.remove();
      }
      toast('Đã đổi sang size L. Giỏ đi tiếp được rồi.');
    },

    qty: function (el) {
      var r = el.closest('.row');
      setQty(r, qtyOf(r) + parseInt(el.dataset.d, 10));
    },

    reorder: function () {
      setCart(cartCount() + 1);
      toast('Đã thêm lại các món còn hàng vào giỏ.', 'Xem giỏ',
            function () { location.href = 'gio-hang.html'; });
    },

    addall: function () {
      setCart(cartCount() + 2);
      toast('Đã thêm 2 mẫu vào giỏ.', 'Xem giỏ',
            function () { location.href = 'gio-hang.html'; });
    },

    radio: function (el) {
      var row = el.closest('.row') || el;
      var grp = row.parentElement;
      $$('.radio', grp).forEach(function (r) {
        r.classList.remove('on'); r.setAttribute('aria-checked', 'false');
      });
      var dot = $('.radio', row) || el;
      dot.classList.add('on'); dot.setAttribute('aria-checked', 'true');
    },

    box: function (el) {
      var on = el.classList.toggle('on');
      el.setAttribute('aria-checked', on ? 'true' : 'false');
    },

    tab: function (el) {
      $$('span', el.parentElement).forEach(function (s) {
        s.classList.remove('on'); s.setAttribute('aria-selected', 'false');
      });
      el.classList.add('on'); el.setAttribute('aria-selected', 'true');
    },

    faq: function (el) {
      var q = el.closest('.q');
      var open = q.classList.toggle('open');
      el.setAttribute('aria-expanded', open ? 'true' : 'false');
    },

    size: function (el) {
      $$('.sz', el.parentElement).forEach(function (s) {
        s.classList.remove('on'); s.setAttribute('aria-pressed', 'false');
      });
      el.classList.add('on'); el.setAttribute('aria-pressed', 'true');
    },

    picksize: function () {
      closeSheet();
      var m = $$('.stage .szrow .sz').filter(function (s) {
        return $('b', s).textContent.trim() === 'M';
      })[0];
      if (m) ACT.size(m);
      toast('Đã chọn size M.');
    },

    clearfilter: function () {
      var w = $('.sheetwrap:not([hidden])') || document;
      $$('.chip', w).forEach(function (c) { c.classList.remove('on'); });
      $$('.radio', w).forEach(function (r) { r.classList.remove('on'); });
      toast('Đã xoá hết bộ lọc.');
    },

    applyfilter: function () { closeSheet(); toast('Đã áp bộ lọc. Còn 4 mẫu khớp.'); },

    promo: function () {
      var f = $('input.inp[placeholder*="giảm giá"]');
      if (!f || !f.value.trim()) return toast('Nhập mã giảm giá đã.');
      toast('Mã <b>' + f.value.trim().toUpperCase() + '</b> không dùng được cho đợt 05.');
    },

    delline: function (el) {
      var row = el.closest('.row');
      var nm = $('.nm', row);
      var name = nm ? nm.textContent.trim() : 'món này';
      var next = row.nextSibling, par = row.parentElement;
      row.remove(); recalc();
      toast('Đã xoá <b>' + name + '</b> khỏi giỏ.', 'Hoàn tác', function () {
        par.insertBefore(row, next); recalc();
      });
    },

    order: function () {
      var box = $('.check .box');
      if (box && !box.classList.contains('on')) {
        return toast('Đánh dấu đồng ý điều khoản trước đã.');
      }
      location.href = 'dat-hang-xong.html';
    },

    copy: function () {
      var v = $('.s .mono') || $('.s .amt');
      var t = v ? v.textContent.trim() : '';
      if (navigator.clipboard && t) navigator.clipboard.writeText(t).catch(function () {});
      toast('Đã chép <b>' + t + '</b>.');
    },

    pwd: function (el) {
      if (el.getAttribute('aria-disabled') === 'true') {
        return toast('Còn điều kiện chưa đạt — xem danh sách ngay trên nút.');
      }
      toast('Đã đổi mật khẩu. Các thiết bị khác bị đăng xuất.', 'Về tài khoản',
            function () { location.href = 'tai-khoan.html'; });
    }
  };

  /* ═════════════════════════════════════ 6b · BẢNG DỮ LIỆU (.dt)
     Mỗi thứ TanStack lo bằng một row model thì ở đây làm bằng tay một lần,
     để bản chạy thử cho thấy đúng cái sẽ dựng: lọc → sắp → phân trang, theo
     đúng thứ tự đó. Dựng thật thì bỏ hết phần này và gọi useReactTable.     */

  function closeMenus(except) {
    $$('.dt .menu, .selm').forEach(function (m) {
      if (m === except) return;
      m.hidden = true;
      var t = m.previousElementSibling;      /* nút mở luôn đứng ngay trước */
      if (t && t.hasAttribute('aria-expanded')) t.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest
        || !e.target.closest('.dt .menu, .dt .facet, .dt .more, .selm, .selbtn')) closeMenus();
  }, true);
  /* Thực đơn neo theo màn hình nên cuộn là nó rời khỏi nút — đóng luôn, đừng
     để nó lửng lơ giữa trang. */
  addEventListener('scroll', function () {
    if ($('.dt .menu:not([hidden]), .selm:not([hidden])')) closeMenus();
  }, true);

  /* Đặt thực đơn theo toạ độ MÀN HÌNH (`position:fixed`), không theo cha.

     Lý do: thực đơn của một dòng nằm trong `.scroll`, mà `.scroll` có
     `overflow-x:auto` — chuẩn CSS bắt trục còn lại thành `auto` theo, nên nó
     cắt cả chiều dọc dù mình không hề đặt. Thực đơn của dòng cuối bảng bị nuốt
     sạch: bấm ⋯ không thấy gì hiện ra. Đo bằng getBoundingClientRect không bắt
     được lỗi này, vì nó trả về ô bố trí chứ không nói ô đó có bị cắt hay không.

     Mặc định mở xuống dưới, canh mép trái nút. Chạm mép nào thì lật mép ấy. */
  function placeMenu(btn, menu) {
    var host = btn.closest('.device') || document.documentElement;
    var hb = host.getBoundingClientRect();
    menu.style.top = '0px'; menu.style.left = '0px';
    var mb = menu.getBoundingClientRect();
    var bb = btn.getBoundingClientRect();

    var x = bb.left;
    if (x + mb.width > hb.right - 8) x = bb.right - mb.width;   /* lật sang trái */
    x = Math.max(hb.left + 8, Math.min(x, hb.right - mb.width - 8));

    var y = bb.bottom + 5;
    if (y + mb.height > hb.bottom - 8) y = bb.top - mb.height - 5;   /* lật lên trên */
    y = Math.max(hb.top + 8, y);

    menu.style.left = Math.round(x) + 'px';
    menu.style.top = Math.round(y) + 'px';
  }

  function toggleMenu(btn, menu) {
    var open = menu.hidden;
    closeMenus(open ? menu : null);
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) placeMenu(btn, menu);
  }

  /* Trang đặc tả có những mẫu trưng bày trông y như thật. Chúng phải nói ra
     mình là mẫu, chứ không được im lặng khi bấm. */
  function wireDemo(dt) {
    /* Mẫu vẫn phải cuộn được và vẫn phải đổ bóng đúng lúc — đó chính là thứ
       nó đang trưng bày. */
    var sc = $('.scroll', dt);
    if (sc) sc.addEventListener('scroll', function () {
      dt.classList.toggle('slid', sc.scrollLeft > 2);
    });
    $$('button, input, select, .lnk', dt).forEach(function (el) {
      el.dataset.wired = '1';
      if (el.tagName === 'BUTTON' || el.classList.contains('lnk')) {
        el.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          var noi = dt.dataset.demoSay;
          if (noi) return toast(noi);
          toast('Đây là mẫu trưng bày. Bảng chạy thật ở màn <b>Đơn hàng</b>.',
                'Mở', function () { location.href = 'qt-don-hang.html'; });
        });
      }
    });
  }

  function cellText(tr, c) {
    var td = tr.querySelector('td[data-c="' + c + '"]');
    return td ? td.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function wireTable(dt) {
    if (dt.classList.contains('demo')) return wireDemo(dt);
    var table = $('table', dt);
    if (!table) return;
    var tb = $('tbody', table);
    var heads = $$('thead th', table);
    var foot = $('.foot', dt);

    var pairs = [];
    $$('tbody > tr', table).forEach(function (tr) {
      if (tr.classList.contains('dtsub')) {
        if (pairs.length) pairs[pairs.length - 1].sub = tr;
      } else pairs.push({ tr: tr, sub: null });
    });
    if (!pairs.length) return;

    var st = { col: -1, dir: '', q: '', f: {}, page: 1, per: 10 };
    if (foot) { st.per = +foot.dataset.per || 10; st.page = +foot.dataset.page || 1; }
    heads.forEach(function (th, i) {
      if (th.classList.contains('srt')) {
        st.col = i; st.dir = th.classList.contains('asc') ? 'asc' : 'desc';
      }
    });

    /* dòng “lọc không ra” — dựng sẵn một lần, dùng lại */
    var none = document.createElement('tr');
    none.className = 'norow';
    none.hidden = true;
    none.innerHTML = '<td colspan="' + heads.length + '" style="padding:0">'
      + '<div class="blank"><div class="ring">' + svg('search') + '</div>'
      + '<h4>Không dòng nào khớp</h4><p class="why"></p>'
      + '<div class="go"><button type="button" class="btn ghost sm">'
      + svg('x', 'ic sm') + 'Xoá tất cả bộ lọc</button></div></div></td>';
    $('.ring svg', none).setAttribute('fill', 'currentColor');
    tb.appendChild(none);
    $('button', none).dataset.wired = '1';
    $('button', none).addEventListener('click', function () { resetAll(); });

    function resetAll() {
      st.q = ''; st.f = {}; st.page = 1;
      var fi = $('.find input', dt);
      if (fi) fi.value = '';
      $$('.fwrap .menu button[role="menuitemcheckbox"]', dt).forEach(function (b) {
        b.setAttribute('aria-checked', 'false');
      });
      syncFacets(); render();
    }

    function syncFacets() {
      $$('.facet[data-col]', dt).forEach(function (fb) {
        var c = fb.dataset.col;
        var n = st.f[c] ? st.f[c].size : 0;
        fb.classList.toggle('on', n > 0);
        var tag = $('.n', fb);
        if (n && !tag) {
          tag = document.createElement('span');
          tag.className = 'n';
          fb.insertBefore(tag, $('.t', fb).nextSibling);
        }
        if (tag) { tag.textContent = n; tag.hidden = !n; }
      });
      var any = st.q || Object.keys(st.f).some(function (c) { return st.f[c].size; });
      var cl = $('.bar.tools .clearf', dt);
      if (any && !cl) {
        cl = document.createElement('button');
        cl.type = 'button'; cl.className = 'clearf';
        cl.dataset.wired = '1';
        cl.textContent = 'Xoá tất cả bộ lọc';
        cl.addEventListener('click', resetAll);
        /* Con trực tiếp: `.bar.tools .spacer` không đủ, vì thực đơn của bộ
           lọc cũng nằm trong thanh này. Chính chỗ đó từng làm nút "Xoá tất cả
           bộ lọc" chui vào giữa thực đơn. */
        var cho = $('.bar.tools > .spacer', dt);
        if (cho) cho.parentNode.insertBefore(cl, cho);
      } else if (cl) cl.hidden = !any;
    }

    function visible() {
      return pairs.filter(function (p) {
        if (st.q && p.tr.textContent.toLowerCase().indexOf(st.q) < 0) return false;
        for (var c in st.f) {
          if (!st.f[c].size) continue;
          var txt = cellText(p.tr, c), hit = false;
          st.f[c].forEach(function (v) { if (txt.indexOf(v) > -1) hit = true; });
          if (!hit) return false;
        }
        return true;
      });
    }

    function render() {
      var vis = visible();
      if (st.col >= 0 && st.dir) {
        var num = heads[st.col] && heads[st.col].classList.contains('num');
        var d = st.dir === 'asc' ? 1 : -1;
        vis.sort(function (a, b) {
          var x = cellText(a.tr, st.col), y = cellText(b.tr, st.col);
          return d * (num ? money(x) - money(y) : x.localeCompare(y, 'vi'));
        });
      }
      var pages = Math.max(1, Math.ceil(vis.length / st.per));
      if (st.page > pages) st.page = pages;
      var lo = (st.page - 1) * st.per;
      var page = vis.slice(lo, lo + st.per);

      /* Xếp lại CẢ danh sách theo đúng thứ tự logic, không chỉ trang đang xem.
         Nếu chỉ đẩy trang hiện tại xuống cuối thì các dòng bị ẩn nằm trước
         trong DOM, và một dòng mở rộng có thể trôi lên đầu bảng. */
      var ngoai = pairs.filter(function (p) { return vis.indexOf(p) < 0; });
      vis.concat(ngoai).forEach(function (p) {
        var onPage = page.indexOf(p) > -1;
        p.tr.hidden = !onPage;
        tb.appendChild(p.tr);
        if (p.sub) {
          tb.appendChild(p.sub);
          p.sub.hidden = !onPage || !p.tr.classList.contains('open');
        }
      });
      tb.appendChild(none);
      none.hidden = vis.length > 0;
      if (!vis.length) {
        var bits = [];
        if (st.q) bits.push('“' + st.q + '”');
        Object.keys(st.f).forEach(function (c) {
          st.f[c].forEach(function (v) { bits.push(v); });
        });
        $('.why', none).textContent = 'Đang lọc theo ' + bits.join(' · ')
          + '. Bỏ bớt một điều kiện là ra.';
      }

      heads.forEach(function (th, i) {
        th.classList.remove('srt', 'asc', 'desc');
        if (i === st.col && st.dir) th.classList.add('srt', st.dir);
      });

      if (foot) {
        $('.shown', foot).innerHTML = vis.length
          ? 'Hiện <b class="tnum">' + (lo + 1) + '–' + (lo + page.length)
            + '</b> trên <b class="tnum">' + vis.length + '</b> dòng'
            + (vis.length < pairs.length ? ' (lọc từ ' + pairs.length + ')' : '')
          : 'Không có dòng nào';
        $('.pg', foot).innerHTML = 'Trang <b class="tnum">' + st.page
          + '</b> / <b class="tnum">' + pages + '</b>';
        $('.prev', foot).disabled = st.page <= 1;
        $('.next', foot).disabled = st.page >= pages;
      }
      syncSel();
    }

    function syncSel() {
      var shown = pairs.filter(function (p) { return !p.tr.hidden; });
      var on = pairs.filter(function (p) { return p.tr.classList.contains('on'); });
      var head = $('thead .ck', dt);
      if (head) {
        var k = shown.filter(function (p) { return p.tr.classList.contains('on'); }).length;
        head.setAttribute('aria-checked',
          k === 0 ? 'false' : (k === shown.length ? 'true' : 'mixed'));
      }
      var bulk = $('.bar.bulk', dt), tools = $('.bar.tools', dt);
      if (bulk) {
        bulk.hidden = !on.length;
        if (tools) tools.hidden = !!on.length;
        if (on.length) {
          $('.cnt', bulk).textContent = 'Đã chọn ' + on.length + ' '
            + (bulk.dataset.unit || 'dòng');
        }
      }
      if (foot) {
        var note = $('.selnote', foot);
        note.hidden = !on.length;
        note.innerHTML = on.length
          ? '· <b class="tnum">' + on.length + '</b> dòng đang chọn' : '';
      }
    }

    /* ── sắp xếp: ba nấc, chưa sắp → tăng → giảm ── */
    $$('thead .sortb', dt).forEach(function (b) {
      var i = +b.closest('th').dataset.c;
      b.addEventListener('click', function () {
        if (st.col !== i) { st.col = i; st.dir = 'asc'; }
        else st.dir = st.dir === 'asc' ? 'desc' : (st.dir === 'desc' ? '' : 'asc');
        if (!st.dir) st.col = -1;
        render();
      });
    });

    /* ── chọn dòng ── */
    $$('.ck', dt).forEach(function (ck) {
      var inHead = !!ck.closest('thead');
      ck.addEventListener('click', function (e) {
        e.stopPropagation();
        if (inHead) {
          var shown = pairs.filter(function (p) { return !p.tr.hidden; });
          var all = ck.getAttribute('aria-checked') === 'true';
          shown.forEach(function (p) {
            p.tr.classList.toggle('on', !all);
            var c = $('.ck', p.tr);
            if (c) c.setAttribute('aria-checked', all ? 'false' : 'true');
          });
        } else {
          var tr = ck.closest('tr');
          var now = !tr.classList.contains('on');
          tr.classList.toggle('on', now);
          ck.setAttribute('aria-checked', now ? 'true' : 'false');
        }
        syncSel();
      });
    });
    var clearSel = $('.bar.bulk .clearf', dt);
    if (clearSel) clearSel.addEventListener('click', function () {
      pairs.forEach(function (p) {
        p.tr.classList.remove('on');
        var c = $('.ck', p.tr);
        if (c) c.setAttribute('aria-checked', 'false');
      });
      syncSel();
    });
    $$('.bar.bulk .btn', dt).forEach(function (b) {
      b.dataset.wired = '1';
      b.addEventListener('click', function () {
        var n = pairs.filter(function (p) { return p.tr.classList.contains('on'); }).length;
        toast('<b>' + label(b) + '</b> cho ' + n + ' '
              + ($('.bar.bulk', dt).dataset.unit || 'dòng') + '. Bản thật sẽ hỏi lại.');
      });
    });

    /* ── mở rộng dòng ── */
    $$('.expb', dt).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var tr = b.closest('tr');
        if (tr.hidden) return;
        var open = tr.classList.toggle('open');
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        var sub = tr.nextElementSibling;
        if (sub && sub.classList.contains('dtsub')) sub.hidden = !open;
      });
    });

    /* ── tìm chung một ô cho cả bảng ── */
    var find = $('.find input', dt);
    if (find) find.addEventListener('input', function () {
      st.q = find.value.trim().toLowerCase(); st.page = 1; syncFacets(); render();
    });

    /* ── lọc theo mặt ── */
    $$('.fwrap', dt).forEach(function (w) {
      /* Ô chọn số dòng mỗi trang dùng chung vỏ `.fwrap`, nhưng nó không lọc
         gì cả — nó được nối riêng ở khối phân trang bên dưới. */
      if (w.classList.contains('perwrap')) return;
      var b = $('.facet', w), m = $('.menu', w);
      if (!b || !m) return;
      b.addEventListener('click', function () { toggleMenu(b, m); });
      var col = b.dataset.col;
      $$('button[role="menuitemcheckbox"]', m).forEach(function (mi) {
        mi.addEventListener('click', function () {
          if (col === undefined) {                       /* thực đơn chọn cột */
            var c = mi.dataset.c;
            var showing = mi.getAttribute('aria-checked') === 'true';
            mi.setAttribute('aria-checked', showing ? 'false' : 'true');
            $$('[data-c="' + c + '"]', table).forEach(function (cell) {
              cell.style.display = showing ? 'none' : '';
            });
            return;
          }
          var on = mi.getAttribute('aria-checked') === 'true';
          mi.setAttribute('aria-checked', on ? 'false' : 'true');
          st.f[col] = st.f[col] || new Set();
          if (on) st.f[col].delete(mi.dataset.v); else st.f[col].add(mi.dataset.v);
          st.page = 1; syncFacets(); render();
        });
      });
      var clr = $('.clr', m);
      if (clr) clr.addEventListener('click', function () {
        if (st.f[col]) st.f[col].clear();
        $$('button[role="menuitemcheckbox"]', m).forEach(function (mi) {
          mi.setAttribute('aria-checked', 'false');
        });
        st.page = 1; syncFacets(); render(); closeMenus();
      });
    });

    /* ── phân trang ── */
    if (foot) {
      $('.prev', foot).addEventListener('click', function () {
        if (st.page > 1) { st.page--; render(); }
      });
      $('.next', foot).addEventListener('click', function () { st.page++; render(); });
      /* Số dòng mỗi trang: cùng một nút thả xuống như bộ lọc, nhưng chọn
         MỘT giá trị nên là `menuitemradio` — chọn cái mới là bỏ cái cũ. */
      var pw = $('.perwrap', foot);
      if (pw) {
        var pb = $('.facet', pw), pm = $('.menu', pw);
        pb.addEventListener('click', function () { toggleMenu(pb, pm); });
        var muc = $$('button[role="menuitemradio"]', pm);
        muc.forEach(function (mi) {
          mi.addEventListener('click', function () {
            muc.forEach(function (o) {
              o.setAttribute('aria-checked', o === mi ? 'true' : 'false');
            });
            $('.t', pb).textContent = mi.dataset.p;
            pb.setAttribute('aria-label', 'Dòng mỗi trang, đang chọn ' + mi.dataset.p);
            st.per = +mi.dataset.p; st.page = 1;
            closeMenus(); render();
          });
        });
      }
    }

    /* ── thực đơn thao tác của từng dòng ── */
    $$('.more', dt).forEach(function (b) {
      var m = b.nextElementSibling;
      if (!m || !m.classList.contains('menu')) return;
      b.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(b, m); });
      $$('button', m).forEach(function (mi) {
        mi.addEventListener('click', function () {
          closeMenus();
          toast('<b>' + label(mi) + '</b> — bản thật sẽ hỏi lại trước khi làm.');
        });
      });
    });

    /* ── bóng của cột ghim chỉ hiện khi đã cuộn ngang ── */
    var sc = $('.scroll', dt);
    if (sc) sc.addEventListener('scroll', function () {
      dt.classList.toggle('slid', sc.scrollLeft > 2);
    });

    render();
  }

  /* ════════════════════════════════════════════════════ 7 · GẮN DÂY */
  var GAPS = [];

  /* Nối một dòng giỏ. Tách riêng vì dòng “vừa hết size” sau khi đổi size sẽ
     mọc ra ô số lượng, và lúc đó phải nối lại đúng như dòng bình thường. */
  function wireCartLine(r) {
    /* tên và ảnh dẫn về trang sản phẩm — cả dòng thì không, vì dòng còn chứa
       ô số lượng và nút Xoá */
    [$('.nm', r), $('.thumb', r)].forEach(function (x) {
      if (x) arm(x, 'go:san-pham', 'link');
    });
    var inp = $('.qn', r), amt = $('.amt', r);
    if (!inp || !amt) return;
    r.dataset.unit = Math.round(money(amt.textContent) / qtyOf(r));
    $$('.qb', r).forEach(function (b) { arm(b, 'act:qty'); });

    inp.addEventListener('input', function () {
      var so = inp.value.replace(/\D/g, '');
      if (inp.value !== so) inp.value = so;      /* chặn chữ ngay lúc gõ */
      if (so === '') return;                     /* đang gõ dở, đừng nhảy số */
      setQty(r, parseInt(so, 10));
    });
    inp.addEventListener('blur', function () { setQty(r, qtyOf(r)); });
    inp.addEventListener('focus', function () { inp.select(); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); setQty(r, qtyOf(r) + 1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setQty(r, qtyOf(r) - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    });
    syncQty(r, qtyOf(r));      /* recalc chạy một lần sau vòng lặp */
  }

  function run(what, el, ev) {
    if (!what) return;
    if (what.indexOf('go:') === 0) { location.href = what.slice(3) + '.html'; return; }
    if (what.indexOf('say:') === 0) { toast(what.slice(4)); return; }
    if (what.indexOf('act:sheet:') === 0) { openSheet(what.slice(10)); return; }
    var fn = ACT[what.slice(4)];
    if (fn) fn(el, ev);
  }

  function arm(el, what, role) {
    if (!what || el.dataset.wired) return;
    el.dataset.wired = '1';
    if (what.indexOf('go:') === 0) el.dataset.go = what.slice(3);
    else el.dataset.act = what.slice(4);

    var native = el.tagName === 'BUTTON' || el.tagName === 'A';
    if (!native) {
      el.setAttribute('role', role || 'button');
      if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    }
    el.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation(); run(what, el, ev);
    });
    if (!native) {
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault(); ev.stopPropagation(); run(what, el, ev);
        }
      });
    }
  }

  function label(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /* ── Thẻ vuốt màu (bản nháp ở màn "Thẻ sản phẩm") ─────────────────────
     Băng ảnh là VÙNG CUỘN THẬT, không phải hiệu ứng JS: `scroll-snap` lo
     việc dừng đúng tấm, còn JS chỉ làm ba việc mà CSS không làm được —
     tô chấm đang xem, phân biệt cú chạm với cú vuốt, và mở hộp chọn size.

     Vì thế thẻ này KHÔNG được `arm` cả khối như thẻ thường: một khối
     `role="link"` bọc lấy nút và ô size là lồng nút trong liên kết. Tên sản
     phẩm mang liên kết, ảnh đi theo, nút đứng riêng. */
  function wireVuot(c) {
    var dich = cardTarget(c) + '.html';
    var nm = $('.nm', c);
    if (nm) arm(nm, 'go:' + cardTarget(c), 'link');

    var bang = $('.slide', c);
    if (bang) {
      /* Ba cái chấm thì không cần hãm bằng requestAnimationFrame — Chrome đã
         gộp sự kiện `scroll` theo khung hình rồi, còn rAF thì ngừng chạy khi
         thẻ trình duyệt bị ẩn, nghĩa là chấm sẽ đứng sai chỗ khi quay lại. */
      var cham = $$('.cham i', c);
      var sync = function () {
        var i = Math.round(bang.scrollLeft / bang.clientWidth);
        cham.forEach(function (d, j) { d.classList.toggle('on', j === i); });
      };
      bang.addEventListener('scroll', sync);
      bang.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : (e.key === 'ArrowLeft' ? -1 : 0);
        if (d) {
          e.preventDefault();
          bang.scrollBy({ left: d * bang.clientWidth, behavior: 'smooth' });
        } else if (e.key === 'Enter') { e.preventDefault(); location.href = dich; }
      });
      /* Chạm vào ảnh mở trang sản phẩm — nhưng chỉ khi đó thật là một cú
         chạm. Quá 6px là người ta đang vuốt, không phải đang bấm. */
      var x0 = 0, y0 = 0, xuong = false, keo = false;
      bang.addEventListener('pointerdown', function (e) {
        x0 = e.clientX; y0 = e.clientY; xuong = true; keo = false;
      });
      bang.addEventListener('pointermove', function (e) {
        if (!xuong) return;
        if (Math.abs(e.clientX - x0) > 6 || Math.abs(e.clientY - y0) > 6) keo = true;
      });
      addEventListener('pointerup', function () { xuong = false; });
      bang.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!keo) location.href = dich;
      });
    } else {
      var ph = $('.ph', c);
      if (ph) arm(ph, 'go:' + cardTarget(c), 'link');
    }

    /* Nút không tự đoán size. Nó mở tấm trượt, và tấm đó mở ra ĐÚNG màu mà
       băng ảnh đang dừng — đó là lý do màu được phép rời khỏi thẻ. */
    var nut = $('.qbtn', c), hop = $('.sizepop', c);
    if (!nut) return;
    /* Hộp size nổi ngay trên thẻ (kiểu F) chỉ còn sống ở màn biên bản
       "Thẻ sản phẩm", để so với tấm trượt đã chọn. Thẻ nào có nó thì nút
       thuộc về nó, không mở tấm trượt nữa. */
    if (hop) return wireSizePop(c, nut, hop, nm);

    nut.addEventListener('click', function (e) {
      e.stopPropagation();
      moChonSize(c.dataset.key, bang ? Math.round(bang.scrollLeft / bang.clientWidth) : 0, nut);
    });
  }

  /* ── tấm trượt chọn size ───────────────────────────────────────────── */
  var QUAY = null;          /* nút đã mở tấm — đóng xong trả tiêu điểm về đó */

  function moChonSize(key, mau, nut) {
    var w = sheetFor('chon-size'), kho = (window.KHO || {})[key];
    if (!w || !kho) return toast('Tấm chọn size chưa gắn vào màn đang xem.');
    QUAY = nut || null;
    veChonSize(w, key, kho, Math.max(0, Math.min(mau, kho.mau.length - 1)), null);
    openSheet('chon-size');
  }

  function veChonSize(w, key, kho, mau, size) {
    var b = $('.chonsize', w);
    b.dataset.key = key; b.dataset.mau = mau;
    $('.dau img', b).src = kho.mau[mau].anh;
    $('.dau .nm', b).textContent = kho.ten;
    $('.dau .k', b).textContent = kho.loai + ' · ' + kho.form;
    $('.dau .p', b).textContent = kho.gia;
    $$('.nhan', b)[0].innerHTML = 'Màu <b>' + kho.mau[mau].ten + '</b>';

    $('.swa', b).innerHTML = kho.mau.map(function (m, i) {
      return '<button type="button" aria-pressed="' + (i === mau) + '" aria-label="Màu '
           + m.ten + '"><i style="background:' + m.hex + '"></i></button>';
    }).join('');
    $$('.swa button', b).forEach(function (s, i) {
      s.addEventListener('click', function () { veChonSize(w, key, kho, i, size); });
    });

    var het = (window.SIZES || []).filter(function (z) { return !kho.con[z]; });
    $('.szrow', b).innerHTML = (window.SIZES || []).map(function (z) {
      var n = kho.con[z];
      return '<button type="button" class="sz' + (n ? (n <= 2 ? ' low' : '') : ' gone')
           + (z === size ? ' on' : '') + '"' + (n ? '' : ' disabled aria-disabled="true"')
           + ' aria-pressed="' + (z === size) + '"><b>' + z + '</b><i>'
           + (n ? 'còn ' + n : 'hết') + '</i></button>';
    }).join('');
    $$('.szrow .sz', b).forEach(function (s) {
      if (s.disabled) return;
      s.addEventListener('click', function () { veChonSize(w, key, kho, mau, $('b', s).textContent); });
    });

    var t = $('.thieu', b);
    if (het.length) {
      if (!t) { t = document.createElement('div'); t.className = 'thieu';
                $('.szrow', b).after(t); }
      t.innerHTML = 'Đã hết ' + het.map(function (z) { return '<s>' + z + '</s>'; }).join(' ')
                  + ' trong đợt này. Không may thêm.';
    } else if (t) { t.remove(); }

    var them = $('.btn.them', b);
    them.dataset.wired = '1';
    them.onclick = function () {
      if (!size) return toast('Chọn size trước đã.');
      var goc = QUAY;                 /* closeSheet trả tiêu điểm rồi xoá QUAY */
      closeSheet();
      setCart(cartCount() + 1);
      if (goc) khoeXong(goc, size);
      toast('Đã thêm <b>' + kho.ten + '</b> · ' + kho.mau[mau].ten + ' · size ' + size
            + ' vào giỏ.', 'Xem giỏ', function () { location.href = 'gio-hang.html'; });
    };
  }

  /* Nút trên thẻ tự xác nhận trong chốc lát, để mắt khỏi phải đi tìm thông báo. */
  function khoeXong(nut, size) {
    var chu = nut.lastChild;
    if (!chu || nut.dataset.dang) return;
    nut.dataset.dang = chu.nodeValue;
    nut.classList.add('xong');
    chu.nodeValue = 'Đã thêm size ' + size;
    setTimeout(function () {
      nut.classList.remove('xong');
      chu.nodeValue = nut.dataset.dang;
      delete nut.dataset.dang;
    }, 1800);
  }

  /* ── kiểu F, chỉ còn ở màn bản nháp ─────────────────────────────────── */
  function wireSizePop(c, nut, hop, nm) {
    var chu = nut.lastChild, cu = chu ? chu.nodeValue : '', hen = 0;
    function dongHop(b, h) { h.hidden = true; b.setAttribute('aria-expanded', 'false'); }
    nut.addEventListener('click', function (e) {
      e.stopPropagation();
      var mo = hop.hidden;
      $$('.card.vuot .sizepop').forEach(function (h) {
        if (h === hop) return;
        var b = h.parentNode.querySelector('.qbtn');
        if (b) dongHop(b, h);
      });
      hop.hidden = !mo;
      nut.setAttribute('aria-expanded', mo ? 'true' : 'false');
      if (mo) { var z = $('.z:not([disabled])', hop); if (z) z.focus(); }
    }, true);
    hop.addEventListener('click', function (e) { e.stopPropagation(); });
    $$('.z', hop).forEach(function (z) {
      if (z.disabled) return;
      z.addEventListener('click', function (e) {
        e.stopPropagation();
        dongHop(nut, hop);
        nut.focus();
        setCart(cartCount() + 1);
        var sz = z.firstChild.nodeValue.trim();
        khoeXong(nut, sz);
        toast('Đã thêm <b>' + (nm ? nm.textContent.trim() : '') + '</b> size ' + sz
              + ' vào giỏ.', 'Xem giỏ', function () { location.href = 'gio-hang.html'; });
      });
    });
  }

  /* Bấm ra ngoài hay bấm Esc thì đóng mọi hộp chọn size. */
  function dongSize() {
    $$('.card.vuot .sizepop:not([hidden])').forEach(function (h) {
      h.hidden = true;
      var b = h.parentNode.querySelector('.qbtn');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest || !e.target.closest('.card.vuot .act')) dongSize();
  }, true);

  function wire() {
    /* Bảng dữ liệu đi trước: nó tự nhận những nút của riêng nó, để vòng tra
       nhãn bên dưới không nhận nhầm. */
    $$('.dt').forEach(wireTable);
    wireSelects();

    /* — khung điều hướng: theo vị trí, không theo chữ — */
    $$('.nav').forEach(function (n) {
      var svgs = Array.prototype.filter.call(n.children, function (c) {
        return c.tagName.toLowerCase() === 'svg';
      });
      if (svgs[0]) arm(svgs[0], 'go:tim-kiem', 'link');
      if (svgs[1]) arm(svgs[1], 'go:tai-khoan', 'link');
      $$('a', n).forEach(function (a) { arm(a, look(label(a))); });
      var wm = $('.wm', n);
      if (wm) arm(wm, 'go:trang-chu', 'link');
    });
    $$('.cartdot').forEach(function (c) { arm(c, 'go:gio-hang', 'link'); });
    $$('.sub').forEach(function (s) {
      var back = s.firstElementChild;
      if (back && back.tagName.toLowerCase() === 'svg') {
        var inSheet = !!s.closest('.sheetwrap');
        back.setAttribute('aria-label', inSheet ? 'Đóng' : 'Quay lại');
        arm(back, inSheet ? 'act:closesheet' : 'act:back');
      }
    });
    $$('.side').forEach(function (sd) {
      var wm = $('.wm', sd);
      if (wm) arm(wm, 'go:qt-tong-quan', 'link');
      $$('a', sd).forEach(function (a) {
        var t = SIDE[label(a)];
        if (t) arm(a, 'go:' + t, 'link');
      });
    });

    /* Tấm chọn size tự dựng lại ruột mỗi lần mở, theo mẫu vừa bấm. Đánh dấu
       trước để vòng tra nhãn bên dưới đừng gắn `act:addcart` vào nút của nó —
       gắn vào là mỗi cú bấm cộng giỏ hai lần. */
    $$('.chonsize .btn, .chonsize .sz, .chonsize .swa button').forEach(function (el) {
      el.dataset.wired = '1';
    });

    /* — ô size, hộp đánh dấu, thẻ, tab, hỏi–đáp — */
    $$('.szrow .sz').forEach(function (s) {
      if (s.disabled) return;
      s.setAttribute('aria-pressed', s.classList.contains('on') ? 'true' : 'false');
      arm(s, 'act:size');
    });
    $$('.check .box, .box').forEach(function (b) {
      b.setAttribute('aria-checked', b.classList.contains('on') ? 'true' : 'false');
      arm(b, 'act:box', 'checkbox');
    });
    $$('.rows .row').forEach(function (r) {
      var rd = $('.radio', r);
      if (rd) {
        rd.setAttribute('aria-checked', rd.classList.contains('on') ? 'true' : 'false');
        arm(r, 'act:radio', 'radio');
      }
    });
    $$('.tabs span').forEach(function (t) {
      t.setAttribute('aria-selected', t.classList.contains('on') ? 'true' : 'false');
      arm(t, 'act:tab', 'tab');
    });
    $$('.qa .hd').forEach(function (h) {
      h.setAttribute('aria-expanded', h.closest('.q').classList.contains('open') ? 'true' : 'false');
      arm(h, 'act:faq');
    });
    $$('.card').forEach(function (c) {
      if (c.classList.contains('vuot')) return wireVuot(c);
      arm(c, 'go:' + cardTarget(c), 'link');
    });
    $$('.sw').forEach(function (s) {
      s.setAttribute('aria-checked', s.classList.contains('on') ? 'true' : 'false');
      arm(s, 'act:sw', 'switch');
    });

    /* — dòng giỏ hàng — */
    $$('.row.cartline').forEach(wireCartLine);

    /* — mọi thứ còn lại: tra bảng theo nhãn — */
    $$('.btn, .chip, .lnk, .rt:not(.plain), .o-d').forEach(function (el) {
      if (el.dataset.wired) return;
      var w = look(label(el));
      if (w) { arm(el, w); return; }
      if (el.classList.contains('btn') || el.classList.contains('lnk')) {
        GAPS.push({ where: HERE, kind: el.className, text: label(el) });
      }
    });

    /* — dòng cài đặt: nhãn nằm ở .vl, không phải cả dòng — */
    $$('.setrow').forEach(function (r) {
      if (r.dataset.wired || $('[data-wired]', r)) return;
      var vl = $('.vl', r);
      var w = vl ? look(vl.textContent.replace(/\s+/g, ' ').trim()) : null;
      if (w) arm(r, w, 'button');
    });

    /* Hàng trong bảng quản trị KHÔNG tự dẫn đi đâu. Hàng vừa chứa ô đánh dấu
       vừa chứa mũi tên mở rộng, nên cho cả hàng bấm được là mỗi lần chọn một
       dòng lại nhảy sang màn khác. Mỗi bảng có sẵn một nút rõ ràng ở cột cuối:
       Sửa · Mở · Xem. */

    /* — hàng danh sách còn lại: tra bảng theo tiêu đề của hàng — */
    var byRow = ROWGO[HERE];
    $$('.rows .row').forEach(function (r) {
      if (r.dataset.wired) return;
      var t = $('.t', r);
      if (!t) return;
      var txt = t.textContent.replace(/\s+/g, ' ').trim();
      var w = look(txt) || (byRow ? byRow(txt) : null);
      if (w) arm(r, w, 'link');
    });

    /* — tấm trượt: nền mờ và phím Esc đều đóng được — */
    $$('.sheetwrap .scrim').forEach(function (s) {
      s.addEventListener('click', closeSheet);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      /* Đóng lớp trên cùng trước. Thứ tự này theo z-index thật: thực đơn bảng
         (65) → danh sách màn → tấm trượt (50) → hộp size nổi trên thẻ (3). */
      if ($('.dt .menu:not([hidden]), .selm:not([hidden])')) return closeMenus();
      if ($('.pick:not([hidden])')) return closePick();
      if ($('.sheetwrap:not([hidden])')) return closeSheet();
      if ($('.card.vuot .sizepop:not([hidden])')) return dongSize();
      closeSheet();
    });
    if (location.hash) {
      var id = location.hash.slice(1);
      if (sheetFor(id)) openSheet(id);
    }
  }

  /* ═════════════════════════════════════ 8 · MÀN ĐỔI MẬT KHẨU CHẠY THẬT */
  function wirePassword() {
    if (HERE !== 'doi-mat-khau') return;
    var f = $$('input[type=password]');
    if (f.length < 3) return;
    var cur = f[0], nw = f[1], re = f[2];
    cur.value = 'matkhaucu2025'; nw.value = 'matkhau'; re.value = 'matkhau';
    var rules = $$('.rules > div');
    var btn = $$('.btn').filter(function (b) { return /Đổi mật khẩu/.test(b.textContent); })[0];

    function check() {
      var v = nw.value;
      var ok = [v.length >= 8, /[A-Za-zÀ-ỹ]/.test(v) && /\d/.test(v), !!v && v !== cur.value];
      rules.forEach(function (row, i) {
        var mark = row.firstElementChild;
        mark.className = ok[i] ? 'ok' : 'no';
        mark.innerHTML = (window.ICONS && (ok[i] ? window.ICONS.confirm : window.ICONS.x))
          ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
            + (ok[i] ? window.ICONS.confirm : window.ICONS.x) + '</svg>'
          : mark.innerHTML;
      });
      var all = ok.every(Boolean) && nw.value === re.value;
      btn.classList.toggle('off', !all);
      btn.setAttribute('aria-disabled', all ? 'false' : 'true');
    }
    [cur, nw, re].forEach(function (i) { i.addEventListener('input', check); });
    check();
  }

  /* ══════════════════════════════════════════ 9 · THANH CÔNG CỤ + DANH SÁCH */
  function svg(name, cls) {
    var p = (window.ICONS || {})[name];
    if (!p) return '';
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" '
         + 'aria-hidden="true">' + p + '</svg>';
  }

  var pickEl = null;
  function closePick() { if (pickEl) { pickEl.hidden = true; document.body.style.overflow = ''; } }

  function buildPick() {
    var groups = window.GROUPS || [], list = window.SCREENS || [];
    var body = groups.map(function (g) {
      var rows = list.filter(function (s) { return s.group === g.id; }).map(function (s) {
        var kind = s.kind === 'm' ? 'điện thoại' : s.kind === 'sheet' ? 'tấm trượt' : 'máy tính';
        return '<a href="' + s.href + '" class="' + (s.slug === HERE ? 'on' : '')
             + '" data-find="' + (s.num + ' ' + s.title + ' ' + s.note).toLowerCase() + '">'
             + '<span class="n">' + (s.num || '·') + '</span>'
             + '<span class="t">' + s.title + '</span>'
             + '<span class="k">' + kind + '</span></a>';
      }).join('');
      return '<h3>' + g.name + '</h3>' + rows;
    }).join('');

    var w = document.createElement('div');
    w.className = 'pick';
    w.hidden = true;
    w.innerHTML = '<div class="scrim"></div><div class="panel" role="dialog" '
      + 'aria-modal="true" aria-label="Chọn màn hình">'
      + '<div class="hd"><h2>Tất cả màn hình</h2>'
      + '<span class="c">' + list.filter(function (s) { return s.num; }).length
      + ' màn · ' + list.filter(function (s) { return !s.num; }).length
      + ' biến thể</span>'
      + '<input type="search" placeholder="Lọc theo tên…" aria-label="Lọc theo tên" />'
      + '<button type="button" class="x" aria-label="Đóng">' + svg('x') + '</button></div>'
      + '<div class="body">' + body + '<p class="none" hidden>Không có màn nào khớp.</p></div>'
      + '</div>';
    document.body.appendChild(w);

    $('.scrim', w).addEventListener('click', closePick);
    $('.x', w).addEventListener('click', closePick);
    var inp = $('input', w), none = $('.none', w);
    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase();
      var hit = 0;
      $$('a', w).forEach(function (a) {
        var ok = !q || a.dataset.find.indexOf(q) > -1;
        a.hidden = !ok; if (ok) hit++;
      });
      $$('h3', w).forEach(function (h) {
        var any = false, n = h.nextElementSibling;
        while (n && n.tagName === 'A') { if (!n.hidden) any = true; n = n.nextElementSibling; }
        h.hidden = !any;
      });
      none.hidden = hit > 0;
    });
    return w;
  }

  function openPick() {
    if (!pickEl) pickEl = buildPick();
    pickEl.hidden = false;
    document.body.style.overflow = 'hidden';
    $('input', pickEl).focus();
  }

  /* ═════════════════════════════════════ 10 · LẬT TRANG ĐỂ XEM CHO NHANH
     Hai mũi tên ở thanh đen đi tới lui theo ĐÚNG thứ tự trong danh sách màn
     (`window.SCREENS`) — cùng thứ tự với bảng chọn màn, nên lật hết một lượt
     là xem hết, không sót và không trùng.

     Ba chỗ phải cẩn thận:
     · Tấm trượt (bộ lọc, bảng size, chọn size) không có trang riêng — địa chỉ
       của chúng là `trang-chủ-quản.html#id`. Lật tới một tấm khi đang đứng
       sẵn ở trang chủ quản thì chỉ đổi mỗi dấu thăng, trình duyệt KHÔNG tải
       lại, nên phải tự mở tấm và tự cập nhật thanh.
     · Vì thế "đang ở đâu" không chỉ là trang: tấm nào đang mở cũng tính.
     · Trang mở đầu (`index`) không nằm trong danh sách — đứng đó thì mũi tên
       lùi tắt, mũi tên tới đi vào màn số 1. */
  function dsMan() { return window.SCREENS || []; }

  function viTri(slug) {
    var l = dsMan();
    for (var i = 0; i < l.length; i++) if (l[i].slug === slug) return i;
    return -1;
  }

  /* Đang đứng ở mục nào: tấm trượt đang mở tính trước, rồi mới tới trang. */
  function dangO() {
    var mo = $('.sheetwrap:not([hidden])');
    if (mo && viTri(mo.id) > -1) return viTri(mo.id);
    return viTri(HERE);
  }

  var barEl = null;

  function veBar() {
    if (!barEl) return;
    var l = dsMan(), i = dangO();
    var cur = i > -1 ? l[i] : null;
    var truoc = i > 0 ? l[i - 1] : null;
    var sau = i > -1 ? l[i + 1] : (l.length ? l[0] : null);   /* ở index thì tới màn 1 */

    var num = cur ? cur.num : (document.body.dataset.num || '');
    var ten = cur ? cur.title : (document.body.dataset.title || '');
    $('.b-pick', barEl).innerHTML =
      (num ? '<span class="num">' + num + '</span>' : '') + '<span class="now">' + ten + '</span>';

    [['.b-prev', truoc, 'Màn trước'], ['.b-next', sau, 'Màn sau']].forEach(function (x) {
      var el = $(x[0], barEl);
      el.disabled = !x[1];
      var t = x[1] ? x[2] + ': ' + x[1].title : x[2] + ' — hết danh sách';
      el.setAttribute('aria-label', t);
      el.title = t;
    });
  }

  function lat(d) {
    var l = dsMan(), i = dangO();
    var t = (i < 0 && d > 0) ? l[0] : l[i + d];
    if (!t) return;
    var trang = t.href.split('#')[0], neo = t.href.split('#')[1] || '';
    var dangTrang = location.pathname.split('/').pop() || 'index.html';

    if (trang !== dangTrang) { location.href = t.href; return; }

    /* Cùng một trang: chỉ là đóng/mở tấm trượt. Tự làm, đừng để trình duyệt
       nuốt mất vì chỉ có dấu thăng đổi. */
    closeSheet();
    if (neo) openSheet(neo);
    try { history.replaceState(null, '', neo ? '#' + neo : location.pathname); } catch (e) {}
    veBar();
  }

  /* Ô chọn của biểu mẫu quản trị. Không phải `<select>` của trình duyệt nữa,
     nên phải tự lo: mở/đóng, đánh dấu mục đang chọn, và ghi lại nhãn lên nút.
     Thực đơn rộng bằng đúng ô nhập — thả xuống thì phải khớp mép với thứ nó
     thả ra từ đó. */
  function wireSelects() {
    $$('.selwrap').forEach(function (w) {
      var b = $('.selbtn', w), m = $('.selm', w);
      if (!b || !m) return;
      b.dataset.wired = '1';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        m.style.minWidth = Math.round(b.getBoundingClientRect().width) + 'px';
        toggleMenu(b, m);
      });
      var muc = $$('button[role="menuitemradio"]', m);
      muc.forEach(function (mi) {
        mi.dataset.wired = '1';
        mi.addEventListener('click', function (e) {
          e.stopPropagation();
          muc.forEach(function (o) {
            o.setAttribute('aria-checked', o === mi ? 'true' : 'false');
          });
          $('.t', b).textContent = $('span', mi).textContent;
          b.classList.remove('ph2');      /* đã chọn thì hết là chữ gợi ý */
          closeMenus();
          b.focus();
        });
      });
    });
  }

  function buildBar() {
    var b = document.createElement('div');
    barEl = b;
    b.className = 'tbar';
    b.innerHTML =
      '<button type="button" class="b-prev">' + svg('back') + '</button>'
      + '<button type="button" class="b-pick"></button>'
      + '<button type="button" class="b-next">' + svg('back', 'quay') + '</button>'
      + '<span class="sep"></span>'
      + '<button type="button" class="b-home" aria-label="Danh sách màn hình">'
      + svg('grid') + '</button>';
    document.body.appendChild(b);
    $('.b-prev', b).addEventListener('click', function () { lat(-1); });
    $('.b-next', b).addEventListener('click', function () { lat(1); });
    $('.b-pick', b).addEventListener('click', openPick);
    $('.b-home', b).addEventListener('click', openPick);
    veBar();
    addEventListener('hashchange', veBar);

    /* Phím ← → lật màn — cách nhanh nhất để soát hết một lượt.
       Nhường lại cho: ô nhập, băng ảnh đang được focus (nó tự xử lý và đã
       gọi preventDefault), bảng chọn màn, và thực đơn của bảng dữ liệu. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      var a = document.activeElement;
      if (a && (a.matches('input, textarea, select') || a.isContentEditable)) return;
      if ($('.pick:not([hidden])') || $('.dt .menu:not([hidden])')) return;
      e.preventDefault();
      lat(e.key === 'ArrowRight' ? 1 : -1);
    });
  }

  /* ══════════════════════════════════════════════════════════ 10 · CHẠY */
  function init() {
    if (IS_HOME) return;
    wire();
    wirePassword();
    /* Hai màn này vẽ đúng lúc giỏ đã rỗng — đặt hàng xong thì giỏ sạch. Để số
       cũ ở đó là tự mâu thuẫn với chính màn đang xem. */
    if (HERE === 'gio-hang-rong' || HERE === 'dat-hang-xong') setCart(0);
    else setCart(cartCount());
    recalc();
    scanClock();
    buildBar();

    window.__audit = function () {
      return { man: HERE, thieu: GAPS };
    };
    if (GAPS.length) console.warn('[chay-thu] ' + HERE + ' — chưa nối:', GAPS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
